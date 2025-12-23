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
from fastapi.encoders import jsonable_encoder

router = APIRouter()

FORBIDDEN_CHARS = re.compile(r'[<>"\';{}]')

class EmpresaModel(BaseModel):
    razao_social: str = Field(..., min_length=2, max_length=100)
    cnpj: Optional[str] = Field(None, max_length=20)
    instituicao_id: Optional[str] = Field(None) 
    status: Literal['Ativo', 'Inativo']

    @validator('razao_social', 'instituicao_id', pre=True)
    def sanitize_required(cls, v):
        if not isinstance(v, str):
            raise ValueError("Valor inválido.")
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("O campo contém caracteres não permitidos.")
        return val

    @validator('cnpj', pre=True)
    def sanitize_optional(cls, v):
        if v is None:
            return None
        if not isinstance(v, str):
            v = str(v)
        val = v.strip()
        if not val:
            return None
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("CNPJ contém caracteres não permitidos.")
        return val

def _try_objectid(s: str):
    try:
        return ObjectId(s)
    except Exception:
        return None

@router.get("/api/empresas")
def listar_empresas(
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 10,
    ctx: RequestCtx = Depends(get_ctx)
):
    db = get_mongo_db()
    filtro: dict = {}
    filtro["instituicao_id"] = ctx.inst_oid 

    if q:
        filtro["$or"] = [
            {"razao_social":  {"$regex": q, "$options": "i"}},
            {"cnpj": {"$regex": q, "$options": "i"}},
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
    page_size = min(max(1, int(page_size)), 100)

    col = db["empresas"]
    coll = Collation('pt', strength=1)

    total = col.count_documents(filtro, collation=coll)
    cursor = (
        col.find(filtro, collation=coll)
            .sort("data_criacao", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
    )

    items = []
    for emp in cursor:
        oid = emp.get("_id")
        if isinstance(emp.get("instituicao_id"), ObjectId):
            emp["instituicao_id"] = str(emp["instituicao_id"])

        if emp.get("data_criacao") is None and isinstance(oid, ObjectId):
            emp["data_criacao"] = oid.generation_time

        if isinstance(emp.get("data_criacao"), datetime):
            emp["data_criacao"] = emp["data_criacao"].astimezone(timezone.utc).isoformat()

        emp["_id"] = str(oid)
        items.append(emp)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/empresas")
def criar_empresa(emp: EmpresaModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = emp.dict()
    data['instituicao_id'] = ctx.inst_oid 
    
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)
    data.pop('_id', None)

    inserted = db["empresas"].insert_one(data)
    
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/empresas/{id}")
def atualizar_empresa(id: str, emp: EmpresaModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    data = emp.dict()
    data['status'] = data['status'].capitalize()
    data.pop('_id', None)
    data.pop('data_criacao', None)
    
    data['instituicao_id'] = ctx.inst_oid

    res = db["empresas"].update_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}, 
        {"$set": data}
    )
    
    if res.matched_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado")

@router.delete("/api/empresas/{id}")
def deletar_empresa(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    
    res = db["empresas"].delete_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}
    )
    
    if res.deleted_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado")

@router.get("/api/gestao_empresas/bootstrap")
def bootstrap_empresas(ctx: RequestCtx = Depends(get_ctx)):
    """
    Retorna dados iniciais para a tela de gestão:
    - Dados da instituição atual
    - Lista inicial de empresas (opcionalmente paginada, aqui trazemos todas ou as recentes para consistência com UCs)
    """
    db = get_mongo_db()
    
    inst_oid = ctx.inst_oid
    instituicao = db["instituicao"].find_one({"_id": inst_oid})
    
    lista_inst = []
    if instituicao:
        inst_data = jsonable_encoder(instituicao, custom_encoder={
            ObjectId: str,
            datetime: lambda d: d.isoformat()
        })
        lista_inst.append(inst_data)

    cursor = db["empresas"].find({"instituicao_id": inst_oid}).sort("data_criacao", -1)
    
    lista_empresas = []
    for emp in cursor:
        emp_data = jsonable_encoder(emp, custom_encoder={
            ObjectId: str,
            datetime: lambda d: d.isoformat()
        })
        emp["_id"] = str(emp["_id"])
        if "instituicao_id" in emp:
            emp["instituicao_id"] = str(emp["instituicao_id"])
        if isinstance(emp.get("data_criacao"), datetime):
            emp["data_criacao"] = emp["data_criacao"].astimezone(timezone.utc).isoformat()
        elif isinstance(emp.get("data_criacao"), ObjectId):
             emp["data_criacao"] = emp.get("data_criacao").generation_time.isoformat()
             
        lista_empresas.append(emp)

    return {
        "instituicoes": lista_inst,
        "empresas": lista_empresas
    }