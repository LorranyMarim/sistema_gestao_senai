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

class CursoModel(BaseModel):
    nom_curso: str = Field(..., min_length=2, max_length=100)
    matricula: str = Field(default="", max_length=50)
    categoria: str = Field(..., min_length=1, max_length=50)
    area: List[str] = Field(default_factory=list)
    tipo_contrato: str = Field(..., min_length=2, max_length=50)
    carga_horaria: int
    turno: List[str] = Field(..., min_items=1, max_items=2)
    status: Literal['Ativo', 'Inativo']
    mapa_competencias: List[str] = Field(default_factory=list)


    @validator('nom_curso', 'matricula', 'categoria', 'tipo_contrato', pre=True)
    def sanitize_and_check_chars(cls, v):
        if not isinstance(v, str):
            return str(v).strip()
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("O campo contém caracteres não permitidos.")
        return val

    @validator('area', 'turno', 'mapa_competencias', pre=True)
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

@router.get("/api/instrutores")
def listar_instrutores(
    busca: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    carga_horaria: Optional[str] = None,
    categoria: Optional[str] = None,
    tipo_contrato: Optional[str] = None,
    area: Optional[List[str]] = Query(None),
    turno: Optional[List[str]] = Query(None),
    competencia: Optional[List[str]] = Query(None),
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
            {"nom_curso": {"$regex": busca, "$options": "i"}},
            {"matricula": {"$regex": busca, "$options": "i"}},
            {"area": {"$regex": busca, "$options": "i"}}
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

    if carga_horaria and carga_horaria != "Todos":
        try:
            filtro["carga_horaria"] = int(carga_horaria) 
        except ValueError:
            pass 

    if categoria and categoria != "Todos":
        filtro["categoria"] = categoria

    if tipo_contrato and tipo_contrato != "Todos":
        filtro["tipo_contrato"] = tipo_contrato

    if area:
        filtro["area"] = {"$in": area}

    if turno:
        filtro["turno"] = {"$in": turno}

    if competencia:
      
        lista_oids = []
        for c in competencia:
            try:
                lista_oids.append(ObjectId(c))
            except:
                pass 
        
        if lista_oids:
            filtro["mapa_competencias"] = {"$in": lista_oids}


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

    col = db["instrutor"]
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
        if "mapa_competencias" in doc and isinstance(doc["mapa_competencias"], list):
            doc["mapa_competencias"] = [str(uc_id) for uc_id in doc["mapa_competencias"]]
            

        doc["_id"] = str(oid)
        items.append(doc)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/instrutores")
def criar_instrutor(instrutor: CursoModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = instrutor.dict()

    data['instituicao_id'] = ctx.inst_oid
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)
    
    if 'mapa_competencias' in data and data['mapa_competencias']:
        try:
            data['mapa_competencias'] = [ObjectId(uc_id) for uc_id in data['mapa_competencias']]
        except Exception:
            pass 

    data.pop('_id', None)
    
    inserted = db["instrutor"].insert_one(data)
    
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/instrutores/{id}")
def atualizar_instrutor(id: str, instrutor: CursoModel, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    data = instrutor.dict()
    data['status'] = data['status'].capitalize()
    data.pop('_id', None)
    data.pop('data_criacao', None)
    
    data['instituicao_id'] = ctx.inst_oid
    if 'mapa_competencias' in data and data['mapa_competencias']:
        try:
            data['mapa_competencias'] = [ObjectId(uc_id) for uc_id in data['mapa_competencias']]
        except Exception:
            pass
    res = db["instrutor"].update_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}, 
        {"$set": data}
    )
    
    if res.matched_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="Instrutor não encontrado ou acesso negado")

@router.delete("/api/instrutores/{id}")
def deletar_instrutor(id: str, ctx: RequestCtx = Depends(get_ctx)):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    
    res = db["instrutor"].delete_one(
        {"_id": oid, "instituicao_id": ctx.inst_oid}
    )
    
    if res.deleted_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Instrutor não encontrado ou acesso negado")

@router.get("/api/gestao_instrutores/bootstrap")
def bootstrap_instrutores(ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    inst_oid = ctx.inst_oid
    return {
        "msg": "Bootstrap OK"
    }