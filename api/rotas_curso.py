from fastapi import APIRouter, HTTPException, Query, Depends
from db import get_mongo_db
from bson.objectid import ObjectId
from pydantic import BaseModel, Field, validator
from typing import Literal, Optional, List, Dict, Any
from datetime import datetime, timezone
import re
from pymongo.collation import Collation
from auth_dep import get_ctx, RequestCtx
from cache_utils import invalidate_cache

router = APIRouter()

FORBIDDEN_CHARS = re.compile(r'[<>"\';{}]')

class CursoModel(BaseModel):
    nome_curso: str = Field(..., min_length=2, max_length=200)
    modalidade_curso: str = Field(..., min_length=2, max_length=100)
    tipo_curso: str = Field(..., min_length=2, max_length=100)
    area_tecnologica: List[str] = Field(default_factory=list)
    carga_total_curso: float = Field(..., ge=0)
    unidade_curricular: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    observacao_curso: Optional[str] = Field(default="")
    status: Literal['Ativo', 'Inativo']

    @validator('nome_curso', 'modalidade_curso', 'tipo_curso', 'observacao_curso', pre=True)
    def sanitize_and_check_chars(cls, v):
        if not isinstance(v, str):
            return str(v).strip() if v is not None else ""
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("O campo contém caracteres não permitidos.")
        return val

    @validator('area_tecnologica', pre=True)
    def check_list_chars(cls, v):
        if isinstance(v, str):
            import json
            try:
                v = json.loads(v)
            except:
                v = [v]
        if not isinstance(v, list):
            raise ValueError("Formato inválido para lista.")
        
        clean_list = []
        for item in v:
            if not isinstance(item, str):
                continue
            val = item.strip()
            if FORBIDDEN_CHARS.search(val):
                raise ValueError("O campo contém caracteres não permitidos.")
            clean_list.append(val)
        return clean_list

def _try_objectid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return None

@router.get("/api/cursos")
def listar_cursos(
    busca: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    modalidade: Optional[str] = None,
    tipo: Optional[str] = None,
    area: Optional[List[str]] = Query(None),
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 10,
    ctx: RequestCtx = Depends(get_ctx)
):
    db = get_mongo_db()
    filtro: dict = {}

    filtro["instituicao_id"] = ctx.inst_oid

    if busca:
        filtro["$or"] = [
            {"nome_curso": {"$regex": busca, "$options": "i"}},
            {"modalidade_curso": {"$regex": busca, "$options": "i"}},
            {"area_tecnologica": {"$regex": busca, "$options": "i"}}
        ]

    if status:
        norm = []
        for s in status:
            if not s: continue
            v = s.strip().capitalize()
            if v in ("Ativo", "Inativo"):
                norm.append(v)
        if norm:
            filtro["status"] = {"$in": norm}

    if modalidade and modalidade != "Todos":
        filtro["modalidade_curso"] = modalidade

    if tipo and tipo != "Todos":
        filtro["tipo_curso"] = tipo

    if area:
        filtro["area_tecnologica"] = {"$in": area}

    if created_from or created_to:
        if created_from and created_from.tzinfo is None:
            created_from = created_from.replace(tzinfo=timezone.utc)
        if created_to and created_to.tzinfo is None:
            created_to = created_to.replace(tzinfo=timezone.utc)
        
        if created_from and created_to and created_from > created_to:
            created_from, created_to = created_to, created_from

        rng = {}
        if created_from: rng["$gte"] = created_from.astimezone(timezone.utc)
        if created_to: rng["$lte"] = created_to.astimezone(timezone.utc)
        if rng: filtro["data_criacao"] = rng

    page = max(1, int(page))
    page_size = min(max(1, int(page_size)), 1000)

    col = db["curso"]
    coll = Collation('pt', strength=1)

    total = col.count_documents(filtro, collation=coll)
    cursor = (
        col.find(filtro, collation=coll)
            .sort("data_criacao", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
    )

    items = []
    for doc in cursor:
        oid = doc.get("_id")
        if isinstance(doc.get("instituicao_id"), ObjectId):
            doc["instituicao_id"] = str(doc["instituicao_id"])

        if doc.get("data_criacao") is None and isinstance(oid, ObjectId):
            doc["data_criacao"] = oid.generation_time

        if isinstance(doc.get("data_criacao"), datetime):
            doc["data_criacao"] = doc["data_criacao"].astimezone(timezone.utc).isoformat()
        
        if "unidade_curricular" in doc and isinstance(doc["unidade_curricular"], dict):
             pass

        doc["_id"] = str(oid)
        items.append(doc)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/cursos")
def criar_curso(curso: CursoModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = curso.dict()

    data['instituicao_id'] = ctx.inst_oid
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)
    
    if 'unidade_curricular' in data and data['unidade_curricular']:
        pass

    data.pop('_id', None)
    
    inserted = db["curso"].insert_one(data)
    
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/cursos/{id}")
def atualizar_curso(id: str, curso: CursoModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    data = curso.dict()
    data['status'] = data['status'].capitalize()
    data.pop('_id', None)
    data.pop('data_criacao', None)
    
    data['instituicao_id'] = ctx.inst_oid

    res = db["curso"].update_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}, 
        {"$set": data}
    )
    
    if res.matched_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado ou acesso negado")

@router.delete("/api/cursos/{id}")
def deletar_curso(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    
    res = db["curso"].delete_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}
    )
    
    if res.deleted_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado ou acesso negado")

@router.get("/api/gestao_cursos/bootstrap")
def bootstrap_cursos(ctx: RequestCtx = Depends(get_ctx)):
    """
    Retorna dados auxiliares para o cadastro de cursos,
    principalmente a lista de Unidades Curriculares ativas para o multiselect.
    """
    db = get_mongo_db()
    inst_oid = ctx.inst_oid
    
    cursor_ucs = db["unidade_curricular"].find(
        {"instituicao_id": inst_oid, "status": "Ativo"},
        {"_id": 1, "descricao": 1, "tipo_uc": 1}
    ).sort("descricao", 1)
    
    lista_ucs = []
    for uc in cursor_ucs:
        uc["_id"] = str(uc["_id"])
        lista_ucs.append(uc)

    return {
        "ucs": lista_ucs
    }