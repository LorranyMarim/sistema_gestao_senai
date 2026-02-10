from fastapi import APIRouter, HTTPException, Query, Depends
from db import get_mongo_db
from bson.objectid import ObjectId
from pydantic import BaseModel, Field, validator
from typing import Literal, Optional, List
from datetime import datetime, timezone
import re
from pymongo.collation import Collation
from auth_dep import get_ctx, RequestCtx
from cache_utils import invalidate_cache

router = APIRouter()

FORBIDDEN_CHARS = re.compile(r'[<>"\';{}]')

# --- Sub-modelos para a Grade de UCs ---
class TurmaUcModel(BaseModel):
    # O nome da UC é persistido para facilitar a leitura sem joins complexos
    nome_uc: str = Field(..., min_length=2)
    # IDs de referência
    uc_id: str = Field(...) # ID original da UC (na collection unidade_curricular) ou chave do dict no curso
    
    # Datas específicas desta UC na turma
    data_inicio: datetime
    data_fim: datetime
    
    # Instrutor Titular
    instrutor_id: str = Field(...)
    
    # Substituição (Opcional)
    possui_substituto: bool = False
    substituto_id: Optional[str] = None
    data_inicio_sub: Optional[datetime] = None
    data_fim_sub: Optional[datetime] = None

    @validator('nome_uc', pre=True)
    def sanitize_text(cls, v):
        if not isinstance(v, str): return str(v)
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("Caracteres inválidos detectados.")
        return val

# --- Modelo Principal da Turma ---
class TurmaModel(BaseModel):
    codigo: str = Field(..., min_length=3, max_length=50)
    
    # Vínculos
    curso_id: str = Field(...)
    calendario_id: str = Field(...)
    empresa_id: str = Field(...) # Empresa parceira ou "Venda Direta" (que seria uma empresa genérica no banco)
    
    # Operação
    turno: Literal['Manhã', 'Tarde', 'Noite', 'Integral']
    qtd_alunos: int = Field(..., ge=1)
    
    # Cronograma Global da Turma
    data_inicio: datetime
    data_fim: datetime
    
    # Estado
    situacao: Literal['Não iniciada', 'Em andamento', 'Concluída', 'Cancelada']
    status: Literal['Ativo', 'Inativo']
    
    observacao: Optional[str] = ""
    
    # Grade Curricular (Lista de UCs configuradas para esta turma)
    ucs: List[TurmaUcModel] = []

    @validator('codigo', 'observacao', pre=True)
    def sanitize_general(cls, v):
        if v is None: return ""
        if not isinstance(v, str): return str(v)
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("Caracteres não permitidos.")
        return val

def _try_objectid(s: str):
    try:
        return ObjectId(s)
    except:
        return None

@router.get("/api/turmas")
def listar_turmas(
    busca: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    situacao: Optional[str] = None,
    curso_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    ctx: RequestCtx = Depends(get_ctx)
):
    db = get_mongo_db()
    filtro = {"instituicao_id": ctx.inst_oid}

    if busca:
        filtro["$or"] = [
            {"codigo": {"$regex": busca, "$options": "i"}},
            # Pode-se adicionar busca por nome do curso se fizer lookup ou denormalização,
            # mas por padrão busca-se pelo código da turma.
        ]

    if status:
        norm = [s.strip().capitalize() for s in status if s.strip()]
        if norm:
            filtro["status"] = {"$in": norm}
            
    if situacao and situacao != "Todos":
        filtro["situacao"] = situacao
        
    if curso_id and ObjectId.is_valid(curso_id):
        filtro["curso_id"] = ObjectId(curso_id)

    page = max(1, int(page))
    page_size = min(max(1, int(page_size)), 100)
    
    col = db["turma"]
    total = col.count_documents(filtro)
    
    # Ordenação: Turmas mais recentes primeiro
    cursor = col.find(filtro).sort("data_inicio", -1).skip((page - 1) * page_size).limit(page_size)
    
    items = []
    
    # Coletar IDs para lookup manual (otimização de leitura)
    curso_ids = set()
    calendario_ids = set()
    
    # Primeira passada: converter dados básicos e coletar IDs
    raw_items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["instituicao_id"] = str(doc["instituicao_id"])
        
        # Datas para ISO
        if isinstance(doc.get("data_inicio"), datetime):
            doc["data_inicio"] = doc["data_inicio"].isoformat()
        if isinstance(doc.get("data_fim"), datetime):
            doc["data_fim"] = doc["data_fim"].isoformat()
            
        # Coleta IDs
        if "curso_id" in doc and doc["curso_id"]:
            curso_ids.add(doc["curso_id"])
            doc["curso_id"] = str(doc["curso_id"])
            
        if "calendario_id" in doc and doc["calendario_id"]:
            calendario_ids.add(doc["calendario_id"])
            doc["calendario_id"] = str(doc["calendario_id"])
            
        if "empresa_id" in doc and doc["empresa_id"]:
            doc["empresa_id"] = str(doc["empresa_id"])
            
        # Limpar a lista de UCs do objeto de listagem leve (opcional, mas bom para performance)
        # Se o frontend precisar das UCs na listagem, mantenha. Caso contrário, remova.
        # doc.pop("ucs", None) 
            
        raw_items.append(doc)
        
    # Lookups
    map_cursos = {}
    if curso_ids:
        for c in db["curso"].find({"_id": {"$in": list(curso_ids)}}, {"nome_curso": 1, "modalidade_curso": 1}):
            map_cursos[str(c["_id"])] = c
            
    map_calendarios = {}
    if calendario_ids:
        for cal in db["calendario"].find({"_id": {"$in": list(calendario_ids)}}, {"titulo": 1}):
            map_calendarios[str(cal["_id"])] = cal.get("titulo", "N/A")

    # Segunda passada: enriquecer itens
    for item in raw_items:
        cid = item.get("curso_id")
        cal_id = item.get("calendario_id")
        
        curso_info = map_cursos.get(cid, {})
        item["nome_curso"] = curso_info.get("nome_curso", "Curso não encontrado")
        item["modalidade"] = curso_info.get("modalidade_curso", "-")
        
        item["nome_calendario"] = map_calendarios.get(cal_id, "-")
        
        items.append(item)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/api/turmas/{id}")
def obter_turma(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    
    db = get_mongo_db()
    turma = db["turma"].find_one({"_id": oid, "instituicao_id": ctx.inst_oid})
    if not turma:
        raise HTTPException(404, "Turma não encontrada")
        
    # Serialização
    turma["_id"] = str(turma["_id"])
    turma["instituicao_id"] = str(turma["instituicao_id"])
    turma["curso_id"] = str(turma["curso_id"])
    turma["calendario_id"] = str(turma["calendario_id"])
    turma["empresa_id"] = str(turma["empresa_id"])
    
    if isinstance(turma.get("data_inicio"), datetime):
        turma["data_inicio"] = turma["data_inicio"].isoformat()
    if isinstance(turma.get("data_fim"), datetime):
        turma["data_fim"] = turma["data_fim"].isoformat()
        
    # Serializar UCs
    if "ucs" in turma and isinstance(turma["ucs"], list):
        for uc in turma["ucs"]:
            if isinstance(uc.get("data_inicio"), datetime): uc["data_inicio"] = uc["data_inicio"].isoformat()
            if isinstance(uc.get("data_fim"), datetime): uc["data_fim"] = uc["data_fim"].isoformat()
            if isinstance(uc.get("data_inicio_sub"), datetime): uc["data_inicio_sub"] = uc["data_inicio_sub"].isoformat()
            if isinstance(uc.get("data_fim_sub"), datetime): uc["data_fim_sub"] = uc["data_fim_sub"].isoformat()

    return turma

@router.post("/api/turmas")
def criar_turma(turma: TurmaModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = turma.dict()
    
    data["instituicao_id"] = ctx.inst_oid
    data["criado_em"] = datetime.now(timezone.utc)
    
    # Converter IDs
    if ObjectId.is_valid(data["curso_id"]): data["curso_id"] = ObjectId(data["curso_id"])
    if ObjectId.is_valid(data["calendario_id"]): data["calendario_id"] = ObjectId(data["calendario_id"])
    if ObjectId.is_valid(data["empresa_id"]): data["empresa_id"] = ObjectId(data["empresa_id"])
    
    # Garantir datas UTC
    if data["data_inicio"].tzinfo is None: data["data_inicio"] = data["data_inicio"].replace(tzinfo=timezone.utc)
    if data["data_fim"].tzinfo is None: data["data_fim"] = data["data_fim"].replace(tzinfo=timezone.utc)
    
    # Processar UCs (converter datas para UTC)
    for uc in data.get("ucs", []):
        if uc["data_inicio"].tzinfo is None: uc["data_inicio"] = uc["data_inicio"].replace(tzinfo=timezone.utc)
        if uc["data_fim"].tzinfo is None: uc["data_fim"] = uc["data_fim"].replace(tzinfo=timezone.utc)
        if uc.get("data_inicio_sub") and uc["data_inicio_sub"].tzinfo is None:
             uc["data_inicio_sub"] = uc["data_inicio_sub"].replace(tzinfo=timezone.utc)
        if uc.get("data_fim_sub") and uc["data_fim_sub"].tzinfo is None:
             uc["data_fim_sub"] = uc["data_fim_sub"].replace(tzinfo=timezone.utc)

    res = db["turma"].insert_one(data)
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(res.inserted_id)}

@router.put("/api/turmas/{id}")
def atualizar_turma(id: str, turma: TurmaModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    
    db = get_mongo_db()
    data = turma.dict()
    
    # Proteção de campos
    data.pop("_id", None)
    data.pop("instituicao_id", None)
    data.pop("criado_em", None)
    
    # Conversões
    if ObjectId.is_valid(data["curso_id"]): data["curso_id"] = ObjectId(data["curso_id"])
    if ObjectId.is_valid(data["calendario_id"]): data["calendario_id"] = ObjectId(data["calendario_id"])
    if ObjectId.is_valid(data["empresa_id"]): data["empresa_id"] = ObjectId(data["empresa_id"])
    
    # Datas UTC (mesma lógica do POST)
    if data["data_inicio"].tzinfo is None: data["data_inicio"] = data["data_inicio"].replace(tzinfo=timezone.utc)
    if data["data_fim"].tzinfo is None: data["data_fim"] = data["data_fim"].replace(tzinfo=timezone.utc)
    
    for uc in data.get("ucs", []):
        if uc["data_inicio"].tzinfo is None: uc["data_inicio"] = uc["data_inicio"].replace(tzinfo=timezone.utc)
        if uc["data_fim"].tzinfo is None: uc["data_fim"] = uc["data_fim"].replace(tzinfo=timezone.utc)
        if uc.get("data_inicio_sub") and uc["data_inicio_sub"].tzinfo is None:
             uc["data_inicio_sub"] = uc["data_inicio_sub"].replace(tzinfo=timezone.utc)
        if uc.get("data_fim_sub") and uc["data_fim_sub"].tzinfo is None:
             uc["data_fim_sub"] = uc["data_fim_sub"].replace(tzinfo=timezone.utc)

    res = db["turma"].update_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid},
        {"$set": data}
    )
    
    if res.matched_count == 0:
        raise HTTPException(404, "Turma não encontrada ou acesso negado")
        
    invalidate_cache(str(ctx.inst_oid))
    return {"msg": "Atualizado com sucesso"}

@router.delete("/api/turmas/{id}")
def deletar_turma(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid: raise HTTPException(400, "ID inválido")
    
    db = get_mongo_db()
    res = db["turma"].delete_one({"_id": oid, "instituicao_id": ctx.inst_oid})
    
    if res.deleted_count == 0:
        raise HTTPException(404, "Turma não encontrada")
        
    invalidate_cache(str(ctx.inst_oid))
    return {"msg": "Turma removida com sucesso"}

@router.get("/api/gestao_turmas/bootstrap")
def bootstrap_gestao_turmas(ctx: RequestCtx = Depends(get_ctx)):
    """
    Carrega todos os dados auxiliares necessários para popular os selects do Modal de Turmas.
    Agora popula também os nomes das UCs dentro dos cursos.
    """
    db = get_mongo_db()
    inst_oid = ctx.inst_oid
    
    # 1. Cursos Ativos
    cursos = list(db["curso"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome_curso": 1, "modalidade_curso": 1, "tipo_curso": 1, "area_tecnologica": 1, "carga_total_curso": 1, "unidade_curricular": 1}
    ).sort("nome_curso", 1))
    
    # --- LÓGICA DE POPULAÇÃO DE NOMES DE UCS (Igual ao rotas_curso.py) ---
    ucs_ids_to_fetch = set()

    # Coleta todos os IDs de UCs presentes nos cursos listados
    for c in cursos:
        c["_id"] = str(c["_id"]) # Serializa ID do curso
        if "unidade_curricular" in c and isinstance(c["unidade_curricular"], dict):
            ucs_ids_to_fetch.update(c["unidade_curricular"].keys())
    
    # Busca os nomes no banco se houver IDs para buscar
    ucs_map = {}
    if ucs_ids_to_fetch:
        ids_validos = [ObjectId(uid) for uid in ucs_ids_to_fetch if ObjectId.is_valid(uid)]
        
        ucs_found = db["unidade_curricular"].find(
            {"_id": {"$in": ids_validos}},
            {"descricao": 1} # Traz apenas o nome/descrição
        )
        
        # Cria mapa: ID -> Nome
        for u in ucs_found:
            ucs_map[str(u["_id"])] = u.get("descricao", "Sem descrição")

    # Injeta o nome 'nome_uc' dentro da estrutura do curso
    for c in cursos:
        if "unidade_curricular" in c and isinstance(c["unidade_curricular"], dict):
            for uc_id, uc_data in c["unidade_curricular"].items():
                uc_data["nome_uc"] = ucs_map.get(uc_id, "UC Não Encontrada")
    # ---------------------------------------------------------------------

    # 2. Calendários Ativos
    calendarios = list(db["calendario"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"titulo": 1, "inicio_calendario": 1, "final_calendario": 1}
    ).sort("titulo", -1))
    
    for cal in calendarios:
        cal["_id"] = str(cal["_id"])
        if isinstance(cal.get("inicio_calendario"), datetime):
            cal["inicio_calendario"] = cal["inicio_calendario"].isoformat()
        if isinstance(cal.get("final_calendario"), datetime):
            cal["final_calendario"] = cal["final_calendario"].isoformat()

    # 3. Empresas Parceiras
    empresas = list(db["empresa"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome_fantasia": 1, "razao_social": 1}
    ).sort("nome_fantasia", 1))
    
    for emp in empresas:
        emp["_id"] = str(emp["_id"])
        
    # 4. Instrutores Ativos
    instrutores = list(db["instrutor"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome": 1, "sobrenome": 1} 
    ).sort("nome", 1))
    
    for instr in instrutores:
        instr["_id"] = str(instr["_id"])
        instr["nome_completo"] = f"{instr.get('nome', '')} {instr.get('sobrenome', '')}".strip()

    return {
        "cursos": cursos,
        "calendarios": calendarios,
        "empresas": empresas,
        "instrutores": instrutores
    }
    """
    Carrega todos os dados auxiliares necessários para popular os selects do Modal de Turmas.
    Evita múltiplas chamadas de rede ao abrir o formulário.
    """
    db = get_mongo_db()
    inst_oid = ctx.inst_oid
    
    # 1. Cursos Ativos (com UCs e cargas horárias)
    # Trazemos 'unidade_curricular' para o frontend calcular a grade
    cursos = list(db["curso"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome_curso": 1, "modalidade_curso": 1, "tipo_curso": 1, "area_tecnologica": 1, "carga_total_curso": 1, "unidade_curricular": 1}
    ).sort("nome_curso", 1))
    
    # Serializa IDs e dados do curso
    for c in cursos:
        c["_id"] = str(c["_id"])
        # Se precisar de mais limpeza no dict de UCs, pode ser feito aqui
        
    # 2. Calendários Ativos (Datas limites)
    calendarios = list(db["calendario"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"titulo": 1, "inicio_calendario": 1, "final_calendario": 1}
    ).sort("titulo", -1))
    
    for cal in calendarios:
        cal["_id"] = str(cal["_id"])
        if isinstance(cal.get("inicio_calendario"), datetime):
            cal["inicio_calendario"] = cal["inicio_calendario"].isoformat()
        if isinstance(cal.get("final_calendario"), datetime):
            cal["final_calendario"] = cal["final_calendario"].isoformat()

    # 3. Empresas Parceiras
    empresas = list(db["empresa"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome_fantasia": 1, "razao_social": 1}
    ).sort("nome_fantasia", 1))
    
    for emp in empresas:
        emp["_id"] = str(emp["_id"])
        
    # 4. Instrutores Ativos
    # Assumindo coleção 'instrutor'. Se for 'usuario', ajustar query para {"tipo": "Instrutor"}
    instrutores = list(db["instrutor"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"nome": 1, "sobrenome": 1} # Ajustar campos conforme modelagem real de instrutor
    ).sort("nome", 1))
    
    for instr in instrutores:
        instr["_id"] = str(instr["_id"])
        instr["nome_completo"] = f"{instr.get('nome', '')} {instr.get('sobrenome', '')}".strip()

    return {
        "cursos": cursos,
        "calendarios": calendarios,
        "empresas": empresas,
        "instrutores": instrutores
    }