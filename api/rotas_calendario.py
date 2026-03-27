from fastapi import APIRouter, HTTPException, Query, Depends, Body
from db import get_mongo_db
from bson.objectid import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Literal, Optional, List
from datetime import datetime, timezone, timedelta
import re
from pymongo.collation import Collation
from auth_dep import get_ctx, RequestCtx
from cache_utils import invalidate_cache
import requests
import os

router = APIRouter()

def get_feriados_api(ano: int, uf: str, ibge_cidade: str) -> dict:
    token = os.getenv("AUTHORIZATION_API_FERIADOS", "")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    feriados_map = {}
    try:
        if ibge_cidade:
            url = f"https://feriadosapi.com/api/v1/feriados/cidade/{ibge_cidade}?ano={ano}"
        elif uf:
            url = f"https://feriadosapi.com/api/v1/feriados/estado/{uf}?ano={ano}"
        else:
            url = f"https://feriadosapi.com/api/v1/feriados/nacionais?ano={ano}"
            
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for f in data.get("feriados", []):
                dia, mes, ano_f = f["data"].split("/")
                iso_date = f"{ano_f}-{mes}-{dia}"
                feriados_map[iso_date] = f["nome"]
    except Exception as e:
        print("Erro ao integrar com api de feriados:", e)
        
    return feriados_map


class RecessoModel(BaseModel):
    data: str
    descricao: str

class PraticaModel(BaseModel):
    data: str
    descricao: str

class CalendarioModel(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=150)
    inicio_calendario: datetime
    final_calendario: datetime
    status: Literal['Ativo', 'Inativo']
    is_presencial_off: bool = False
    dias_presenciais: List[str] = []
    is_ead_off: bool = False
    dias_ead: List[str] = []
    considerar_feriados_letivos: bool = False
    recessos: List[RecessoModel] = []
    praticas: List[PraticaModel] = []

    @model_validator(mode='after')
    def check_dates(self):
        if self.final_calendario < self.inicio_calendario:
            raise ValueError('A data final não pode ser anterior à data de início.')
        return self

class CalendarioLetivoModel(BaseModel):
    calendario_id: str
    tipo: Literal['Presencial', 'EAD', 'Prática na Unidade', 'Reposição']
    data_inicio: datetime
    data_final_check: bool = False 
    data_fim: Optional[datetime] = None 
    
    @field_validator('calendario_id')
    @classmethod
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('ID de calendário inválido')
        return v

    @model_validator(mode='after')
    def check_dates_letivo(self):
        if self.data_final_check and self.data_fim:
            if self.data_fim < self.data_inicio:
                raise ValueError('A data final do período não pode ser anterior à data de início.')
        return self

def _try_objectid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return None


def normalize_dates(start: datetime, end: Optional[datetime]):
    s = start.replace(tzinfo=timezone.utc) if start.tzinfo is None else start.astimezone(timezone.utc)
    e = end.replace(tzinfo=timezone.utc) if end and end.tzinfo is None else (end.astimezone(timezone.utc) if end else s)
    return s, e


@router.get("/api/calendarios")
def listar_calendarios(
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    page: int = 1,
    page_size: int = 10,
    ctx: RequestCtx = Depends(get_ctx)
):
    db = get_mongo_db()
    filtro = {"instituicao_id": ctx.inst_oid}

    if q:
        filtro["titulo"] = {"$regex": q, "$options": "i"}

    if status:
        norm = [s.capitalize() for s in status if s in ('Ativo', 'Inativo', 'ativo', 'inativo')]
        if norm:
            filtro["status"] = {"$in": norm}

    col = db["calendario"]
    total = col.count_documents(filtro)
    cursor = col.find(filtro).sort("data_criacao", -1).skip((page - 1) * page_size).limit(page_size)

    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["instituicao_id"] = str(doc["instituicao_id"])
        if isinstance(doc.get("inicio_calendario"), datetime):
            doc["inicio_calendario"] = doc["inicio_calendario"].isoformat()
        if isinstance(doc.get("final_calendario"), datetime):
            doc["final_calendario"] = doc["final_calendario"].isoformat()
        if isinstance(doc.get("data_criacao"), datetime):
            doc["data_criacao"] = doc["data_criacao"].isoformat()
        items.append(doc)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/calendarios")
def criar_calendario(cal: CalendarioModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = cal.model_dump() 
    
    is_presencial_off = data.pop('is_presencial_off', False)
    dias_presenciais = data.pop('dias_presenciais', [])
    is_ead_off = data.pop('is_ead_off', False)
    dias_ead = data.pop('dias_ead', [])
    considerar_feriados_letivos = data.pop('considerar_feriados_letivos', False)
    recessos_front = data.pop('recessos', [])
    praticas_front = data.pop('praticas', [])
    
    agora = datetime.now(timezone.utc)
    data['data_criacao'] = agora
    data['alterado_em'] = agora
    data['alterado_por'] = ctx.user_id 
    
    if data['inicio_calendario'].tzinfo is None: data['inicio_calendario'] = data['inicio_calendario'].replace(tzinfo=timezone.utc)
    if data['final_calendario'].tzinfo is None: data['final_calendario'] = data['final_calendario'].replace(tzinfo=timezone.utc)
    
    inst = db["instituicao"].find_one({"_id": ctx.inst_oid})
    uf, ibge_cidade = None, None
    if inst and "endereco" in inst and isinstance(inst["endereco"], list) and len(inst["endereco"]) > 0:
        uf = inst["endereco"][0].get("uf")
        ibge_cidade = inst["endereco"][0].get("cidade") 
        
    feriados_api = {}
    if not considerar_feriados_letivos:
        ano_inicio = data['inicio_calendario'].year
        ano_fim = data['final_calendario'].year
        for ano in range(ano_inicio, ano_fim + 1):
            feriados_api.update(get_feriados_api(ano, uf, ibge_cidade))

    mapa_recessos = {r["data"]: r["descricao"] for r in recessos_front}
    for rec_data in mapa_recessos.keys():
        if rec_data in feriados_api:
            raise HTTPException(status_code=400, detail=f"A data {rec_data} já é um feriado ({feriados_api[rec_data]}) e não pode ser cadastrada como recesso manual.")
    mapa_praticas = {p["data"]: p["descricao"] for p in praticas_front}
    mapa_dias = {
        "Segunda": 0, "Terça": 1, "Quarta": 2, "Quinta": 3, "Sexta": 4, "Sábado": 5
    }
    dias_presenciais_idx = [mapa_dias[d] for d in dias_presenciais if d in mapa_dias]
    dias_ead_idx = [mapa_dias[d] for d in dias_ead if d in mapa_dias]
    
    estrutura_dias = []
    data_atual = data['inicio_calendario']
    
    while data_atual <= data['final_calendario']:
        status_dia = "NÃO LETIVO"
        modalidade = None
        descricao_evento = None 
        dia_semana = data_atual.weekday()
        
        if not is_presencial_off and dia_semana in dias_presenciais_idx:
            status_dia = "LETIVO"
            modalidade = "Presencial"
            descricao_evento = "Presencial"

        elif not is_ead_off and dia_semana in dias_ead_idx:
            status_dia = "LETIVO"
            modalidade = "EAD"
            descricao_evento = "EAD"
            
        # --- REGRA DE SOBRESCRITA (Feriados, Recessos e Práticas) ---
            iso_str = data_atual.strftime("%Y-%m-%d")
            
            # Prática tem prioridade máxima, sobrescreve tudo e vira letivo
            if iso_str in mapa_praticas:
                status_dia = "LETIVO"
                modalidade = "Prática (Senai/Empresa)"
                descricao_evento = mapa_praticas[iso_str]
                
            # Regra 1 (Cenários 1, 2 e 3): Feriados
            elif iso_str in feriados_api:
                # IMPORTANTE: O código só entra neste 'elif' se o usuário marcou "NÃO terão aulas"
                # Se o usuário marcou "TERÃO aulas" (Regra 2), o 'feriados_api' estará vazio e este bloco é ignorado, não alterando nenhuma data.
                
                status_dia = "NÃO LETIVO" # Cenário 1: Converte LETIVO para NÃO LETIVO. Cenários 2 e 3: Mantém/Cria como NÃO LETIVO.
                modalidade = "FERIADO"    # Define a modalidade exata solicitada.
                descricao_evento = feriados_api[iso_str] # Salva o nome do feriado (Ex: "Independência do Brasil").
                
            # Regra 3: Status NÃO LETIVO, Modalidade RECESSO ESCOLAR e descrição via input
            elif iso_str in mapa_recessos:
                status_dia = "NÃO LETIVO"
                modalidade = "RECESSO ESCOLAR" 
                descricao_evento = mapa_recessos[iso_str]
            
        estrutura_dias.append({
            "data": data_atual,
            "status": status_dia,
            "modalidade": modalidade,
            "descricao": descricao_evento
        })
        
        data_atual += timedelta(days=1)     
    data['estrutura_dias'] = estrutura_dias

    inserted = db["calendario"].insert_one(data)
    invalidate_cache(str(ctx.inst_oid))
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/calendarios/{id}")
def atualizar_calendario(id: str, cal: CalendarioModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    
    db = get_mongo_db()
    
    existing = db["calendario"].find_one({"_id": oid, "instituicao_id": ctx.inst_oid})
    if not existing:
        raise HTTPException(404, "Calendário não encontrado")

    new_start, new_end = normalize_dates(cal.inicio_calendario, cal.final_calendario)
    
    orphans = db["calendario_letivo"].count_documents({
        "calendario_id": oid,
        "$or": [
            {"data_inicio": {"$lt": new_start}},
            {"$expr": {
                "$gt": [{"$ifNull": ["$data_fim", "$data_inicio"]}, new_end]
            }}
        ]
    })

    if orphans > 0:
        raise HTTPException(400, "Não é possível alterar as datas. Existem dias letivos cadastrados fora do novo período. Remova-os primeiro.")

    data = cal.model_dump()
    data['instituicao_id'] = ctx.inst_oid
    data.pop('data_criacao', None) 
    
    data['alterado_em'] = datetime.now(timezone.utc)
    data['alterado_por'] = ctx.user_id
    
    res = db["calendario"].update_one({"_id": oid}, {"$set": data})

    if res.matched_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Atualizado com sucesso"}
    
    raise HTTPException(500, "Erro ao atualizar")

@router.delete("/api/calendarios/{id}")
def deletar_calendario(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    db = get_mongo_db()

    children_count = db["calendario_letivo"].count_documents({"calendario_id": oid})
    if children_count > 0:
        raise HTTPException(400, "Não é possível excluir. Existem dias letivos vinculados a este calendário.")

    res = db["calendario"].delete_one({"_id": oid, "instituicao_id": ctx.inst_oid})
    if res.deleted_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Removido com sucesso"}
    raise HTTPException(404, "Calendário não encontrado")


@router.get("/api/calendario_letivo")
def listar_dias_letivos(calendario_id: str, ctx: RequestCtx = Depends(get_ctx)):
    cal_oid = _try_objectid(calendario_id)
    if not cal_oid: raise HTTPException(400, "ID de calendário inválido")
    
    db = get_mongo_db()
    if not db["calendario"].find_one({"_id": cal_oid, "instituicao_id": ctx.inst_oid}):
        raise HTTPException(403, "Acesso negado ao calendário")

    cursor = db["calendario_letivo"].find({"calendario_id": cal_oid}).sort("data_inicio", 1)
    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["calendario_id"] = str(doc["calendario_id"])
        if isinstance(doc.get("data_inicio"), datetime):
            doc["data_inicio"] = doc["data_inicio"].isoformat()
        if isinstance(doc.get("data_fim"), datetime):
            doc["data_fim"] = doc["data_fim"].isoformat()
        items.append(doc)
    return items

@router.post("/api/calendario_letivo")
def criar_dia_letivo(dia: CalendarioLetivoModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    cal_oid = ObjectId(dia.calendario_id)

    pai = db["calendario"].find_one({"_id": cal_oid, "instituicao_id": ctx.inst_oid})
    if not pai: raise HTTPException(404, "Calendário pai não encontrado")

    d_inicio, d_fim = normalize_dates(dia.data_inicio, dia.data_fim)
    p_inicio, p_fim = normalize_dates(pai['inicio_calendario'], pai['final_calendario'])

    if d_inicio < p_inicio:
        raise HTTPException(400, "Data de início fora do período do calendário acadêmico.")
    
    if dia.data_final_check and d_fim and d_fim > p_fim:
         raise HTTPException(400, "Data final fora do período do calendário acadêmico.")

    collision = db["calendario_letivo"].find_one({
        "calendario_id": cal_oid,
        "$or": [
            {
                "data_inicio": {"$lte": d_fim},
                "$expr": {"$gte": [{"$ifNull": ["$data_fim", "$data_inicio"]}, d_inicio]}
            }
        ]
    })
    
    if collision:
        raise HTTPException(400, "Conflito de datas! Já existe um evento letivo neste período.")

    data = dia.model_dump()
    data['calendario_id'] = cal_oid
    
    data['data_criacao'] = datetime.now(timezone.utc) 
    
    if not data['data_final_check']:
        data['data_fim'] = None 

    inserted = db["calendario_letivo"].insert_one(data)
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/calendario_letivo/{id_dia}")
def atualizar_dia_letivo(id_dia: str, dados: CalendarioLetivoModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    
    try:
        oid = ObjectId(id_dia)
        cal_oid = ObjectId(dados.calendario_id)
    except:
        raise HTTPException(status_code=400, detail="ID inválido.")
    
    dia_atual = db["calendario_letivo"].find_one({"_id": oid})
    if not dia_atual:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    
    cal_pai = db["calendario"].find_one({"_id": cal_oid, "instituicao_id": ctx.inst_oid})
    if not cal_pai:
        raise HTTPException(status_code=403, detail="Acesso negado ao calendário.")

    conflito = db["calendario_letivo"].find_one({
        "calendario_id": dados.calendario_id,
        "data_inicio": dados.data_inicio,
        "_id": {"$ne": oid} 
    })
    
    if conflito:
        raise HTTPException(status_code=409, detail="Já existe um dia letivo cadastrado nesta data.")

    update_data = dados.model_dump()
    db["calendario_letivo"].update_one({"_id": oid}, {"$set": update_data})
    
    return {"msg": "Dia letivo atualizado com sucesso!"}

@router.delete("/api/calendario_letivo/{id}")
def deletar_dia_letivo(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    db = get_mongo_db()
    
    doc = db["calendario_letivo"].find_one({"_id": oid})
    if not doc: raise HTTPException(404, "Não encontrado")
    
    pai = db["calendario"].find_one({"_id": doc["calendario_id"], "instituicao_id": ctx.inst_oid})
    if not pai: raise HTTPException(403, "Acesso negado")

    db["calendario_letivo"].delete_one({"_id": oid})
    return {"msg": "Removido com sucesso"}

@router.get("/api/gestao_calendarios/bootstrap")
def bootstrap_calendarios(ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    
    cursor = db["calendario"].find({"instituicao_id": ctx.inst_oid}).sort("data_criacao", -1)
    
    todos_calendarios = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("instituicao_id"), ObjectId):
             doc["instituicao_id"] = str(doc["instituicao_id"])
             
        if isinstance(doc.get("inicio_calendario"), datetime):
            doc["inicio_calendario"] = doc["inicio_calendario"].isoformat()
        if isinstance(doc.get("final_calendario"), datetime):
            doc["final_calendario"] = doc["final_calendario"].isoformat()
        if isinstance(doc.get("data_criacao"), datetime):
            doc["data_criacao"] = doc["data_criacao"].isoformat()
        elif isinstance(doc.get("data_criacao"), ObjectId): # Fallback se não tiver data
             doc["data_criacao"] = doc["data_criacao"].generation_time.isoformat()
             
        todos_calendarios.append(doc)

    cals_ativos = []
    cursor_ativos = db["calendario"].find(
        {"instituicao_id": ctx.inst_oid, "status": "Ativo"}, 
        {"titulo": 1, "inicio_calendario": 1, "final_calendario": 1}
    ).sort("titulo", 1)

    for c in cursor_ativos:
        c["_id"] = str(c["_id"])
        if isinstance(c.get("inicio_calendario"), datetime):
            c["inicio_calendario"] = c["inicio_calendario"].isoformat()
        if isinstance(c.get("final_calendario"), datetime):
            c["final_calendario"] = c["final_calendario"].isoformat()
        cals_ativos.append(c)

    return {
        "calendarios": todos_calendarios,
        "calendarios_ativos": cals_ativos
    }
   