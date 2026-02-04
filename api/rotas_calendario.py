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

router = APIRouter()

# --- Models (Atualizados para Pydantic V2) ---

class CalendarioModel(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=100)
    inicio_calendario: datetime
    final_calendario: datetime
    status: Literal['Ativo', 'Inativo']

    @model_validator(mode='after')
    def check_dates(self):
        if self.final_calendario < self.inicio_calendario:
            raise ValueError('A data final não pode ser anterior à data de início.')
        return self

class CalendarioLetivoModel(BaseModel):
    calendario_id: str
    tipo: Literal['Presencial', 'EAD', 'Prática na Unidade', 'Reposição']
    data_inicio: datetime
    data_final_check: bool = False # Cenário 6 e 7: Novo campo booleano
    data_fim: Optional[datetime] = None # Cenário 6: Pode ser null
    
    @field_validator('calendario_id')
    @classmethod
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('ID de calendário inválido')
        return v

    @model_validator(mode='after')
    def check_dates_letivo(self):
        # Validação apenas se o check estiver true (Cenário 7)
        if self.data_final_check and self.data_fim:
            if self.data_fim < self.data_inicio:
                raise ValueError('A data final do período não pode ser anterior à data de início.')
        return self

def _try_objectid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return None

# --- Helpers ---

def normalize_dates(start: datetime, end: Optional[datetime]):
    # Garante UTC e define range efetivo para cálculos
    s = start.replace(tzinfo=timezone.utc) if start.tzinfo is None else start.astimezone(timezone.utc)
    e = end.replace(tzinfo=timezone.utc) if end and end.tzinfo is None else (end.astimezone(timezone.utc) if end else s)
    return s, e

# --- Rotas Calendário (Pai) ---

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
    cursor = col.find(filtro).sort("criado_em", -1).skip((page - 1) * page_size).limit(page_size)

    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["instituicao_id"] = str(doc["instituicao_id"])
        if isinstance(doc.get("inicio_calendario"), datetime):
            doc["inicio_calendario"] = doc["inicio_calendario"].isoformat()
        if isinstance(doc.get("final_calendario"), datetime):
            doc["final_calendario"] = doc["final_calendario"].isoformat()
        if isinstance(doc.get("criado_em"), datetime):
            doc["criado_em"] = doc["criado_em"].isoformat()
        items.append(doc)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/calendarios")
def criar_calendario(cal: CalendarioModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = cal.model_dump() # Pydantic v2 usa model_dump() ao invés de dict()
    
    data['instituicao_id'] = ctx.inst_oid
    data['criado_em'] = datetime.now(timezone.utc)
    
    if data['inicio_calendario'].tzinfo is None: data['inicio_calendario'] = data['inicio_calendario'].replace(tzinfo=timezone.utc)
    if data['final_calendario'].tzinfo is None: data['final_calendario'] = data['final_calendario'].replace(tzinfo=timezone.utc)

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
    data.pop('criado_em', None) 

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

# --- Rotas Dias Letivos (Filho) ---

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

    # Validação de range (Cenário 5 - Backend safety)
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
    
    # Cenário 6 e 7: Forçar persistência correta
    data['criado_em'] = datetime.now(timezone.utc) # Data de criação Timestamp
    
    if not data['data_final_check']:
        data['data_fim'] = None # Garante nulo se check for false

    inserted = db["calendario_letivo"].insert_one(data)
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/calendario_letivo/{id}")
def atualizar_dia_letivo(id: str, dia: CalendarioLetivoModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    db = get_mongo_db()
    cal_oid = ObjectId(dia.calendario_id)

    existing = db["calendario_letivo"].find_one({"_id": oid})
    if not existing: raise HTTPException(404, "Evento não encontrado")
    
    pai = db["calendario"].find_one({"_id": cal_oid, "instituicao_id": ctx.inst_oid})
    if not pai: raise HTTPException(403, "Acesso negado ao calendário pai")

    d_inicio, d_fim = normalize_dates(dia.data_inicio, dia.data_fim)

    collision = db["calendario_letivo"].find_one({
        "calendario_id": cal_oid,
        "_id": {"$ne": oid},
        "$or": [
            {
                "data_inicio": {"$lte": d_fim},
                "$expr": {"$gte": [{"$ifNull": ["$data_fim", "$data_inicio"]}, d_inicio]}
            }
        ]
    })

    if collision:
        raise HTTPException(400, "Conflito de datas ao atualizar!")

    data = dia.model_dump()
    data['calendario_id'] = cal_oid
    
    db["calendario_letivo"].update_one({"_id": oid}, {"$set": data})
    return {"msg": "Atualizado com sucesso"}

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
    
    # 1. Busca TODOS os calendários para a tabela (replicando padrão ucs)
    cursor = db["calendario"].find({"instituicao_id": ctx.inst_oid}).sort("criado_em", -1)
    
    todos_calendarios = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("instituicao_id"), ObjectId):
             doc["instituicao_id"] = str(doc["instituicao_id"])
             
        if isinstance(doc.get("inicio_calendario"), datetime):
            doc["inicio_calendario"] = doc["inicio_calendario"].isoformat()
        if isinstance(doc.get("final_calendario"), datetime):
            doc["final_calendario"] = doc["final_calendario"].isoformat()
        if isinstance(doc.get("criado_em"), datetime):
            doc["criado_em"] = doc["criado_em"].isoformat()
        elif isinstance(doc.get("criado_em"), ObjectId): # Fallback se não tiver data
             doc["criado_em"] = doc["criado_em"].generation_time.isoformat()
             
        todos_calendarios.append(doc)

    # 2. Busca apenas ATIVOS para o select do modal (replicando padrão ucs/instituicao)
    cals_ativos = []
    # Filtramos na memória ou fazemos nova query. Como é bootstrap, nova query é leve.
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
    db = get_mongo_db()
    cals = list(db["calendario"].find(
        {"instituicao_id": ctx.inst_oid, "status": "Ativo"}, 
        {"titulo": 1, "inicio_calendario": 1, "final_calendario": 1}
    ).sort("titulo", 1))
    
    for c in cals:
        c["_id"] = str(c["_id"])
        if isinstance(c.get("inicio_calendario"), datetime):
            c["inicio_calendario"] = c["inicio_calendario"].isoformat()
        if isinstance(c.get("final_calendario"), datetime):
            c["final_calendario"] = c["final_calendario"].isoformat()

    return {"calendarios_ativos": cals}