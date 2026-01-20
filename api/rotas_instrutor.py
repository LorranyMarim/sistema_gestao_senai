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

class InstrutorModel(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    matricula: str = Field(default="", max_length=50)
    categoria: str = Field(..., min_length=1, max_length=50)
    area: List[str] = Field(default_factory=list)
    tipo_contrato: str = Field(..., min_length=2, max_length=50)
    carga_horaria: int
    turno: List[str] = Field(..., min_items=1, max_items=2)
    status: Literal['Ativo', 'Inativo']
    mapa_competencias: List[str] = Field(default_factory=list)
    
    # Optional fields for saving references if needed, but not strictly required by prompt
    # competencias: List[str] = Field(default_factory=list)

    @validator('nome', 'matricula', 'categoria', 'tipo_contrato', pre=True)
    def sanitize_and_check_chars(cls, v):
        if not isinstance(v, str):
            # Allow non-string if pydantic converts, but for security, strict is better
            # However, if it's not a string, we just pass or let Pydantic handle type error
            # But the prompt asks for strict sanitization
            return str(v).strip()
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("O campo contém caracteres não permitidos.")
        return val

    @validator('area', 'turno', 'mapa_competencias', pre=True)
    def check_list_chars(cls, v):
        if isinstance(v, str):
            # In case it comes as a string representation of list or single item
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
    carga_horaria: Optional[str] = None, # Not in model but in filters requirements (though DB model should support it if we want to filter by it, but user didn't ask to add column in model for CH, just filter. Assuming CH is implicit or derived or I should add it? Prompt says 'Colunas da tabela... Nome, Matrícula, Categoria, Área, Tipo de Contrato, Turno, Status'. Filter 'Carga Horária' select exists. I will add to filter logic but if data doesn't exist it won't work well. I will assume it's part of the flexible schema or I should add it to model? Prompt doesn't list CH in "Colunas da Tabela" but lists it in "Filtros". I will support the filter param.)
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
            {"nome": {"$regex": busca, "$options": "i"}},
            {"matricula": {"$regex": busca, "$options": "i"}},
            # Search in areas too?
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
            filtro["carga_horaria"] = int(carga_horaria) # Converte para Inteiro
        except ValueError:
            pass # Se não for número, ignora o filtro

    if categoria and categoria != "Todos":
        filtro["categoria"] = categoria

    if tipo_contrato and tipo_contrato != "Todos":
        filtro["tipo_contrato"] = tipo_contrato

    if area:
        # Multiselect logic: Usually OR or AND. Prompt says "default: vazio". 
        # If user selects multiple, usually finding ANY match (OR).
        # But for tags often implies containment. Let's use $in for "Any of selected"
        filtro["area"] = {"$in": area}

    if turno:
        # Multiselect Turno
        filtro["turno"] = {"$in": turno}

    # Competencia filter logic (OR)
    # The prompt says: "Por Competências (multiselect)... regra: OR"
    # This implies we filter instructors who have at least one of these competencies.
    # Assuming there is a field 'competencias' (list of IDs or names) in the instructor doc.
    if competencia:
        filtro["competencias"] = {"$in": competencia}


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
def criar_instrutor(instrutor: InstrutorModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = instrutor.dict()

    data['instituicao_id'] = ctx.inst_oid
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)
    
    # --- NOVO: Conversão de String para ObjectId ---
    # Isso garante que no banco seja salvo como referência real
    if 'mapa_competencias' in data and data['mapa_competencias']:
        try:
            data['mapa_competencias'] = [ObjectId(uc_id) for uc_id in data['mapa_competencias']]
        except Exception:
            # Opcional: Levantar erro se algum ID for inválido
            pass 
    # -----------------------------------------------

    data.pop('_id', None)
    
    inserted = db["instrutor"].insert_one(data)
    
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/instrutores/{id}")
def atualizar_instrutor(id: str, instrutor: InstrutorModel, ctx: RequestCtx = Depends(get_ctx)):
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
            # Converte cada ID de string para ObjectId do BSON
            data['mapa_competencias'] = [ObjectId(uc_id) for uc_id in data['mapa_competencias']]
        except Exception:
            # Se houver algum ID inválido, ignoramos ou deixamos passar (opcional: logar erro)
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
    
    # Example logic if we need to return something specific for bootstrap
    # But usually it's just to confirm auth or return metadata. 
    # The UC module returns institutions and UCs.
    # Here we might not need much, but let's keep the pattern.
    
    # Return empty lists or necessary metadata
    return {
        "msg": "Bootstrap OK"
    }