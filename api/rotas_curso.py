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

# --- MODELO ATUALIZADO PARA COMPATIBILIDADE COM O FRONTEND ---
class CursoModel(BaseModel):
    # Campos exatos enviados pelo curso_script.js
    nome_curso: str = Field(..., min_length=2, max_length=200)
    modalidade_curso: str = Field(..., min_length=2, max_length=100)
    tipo_curso: str = Field(..., min_length=2, max_length=100)
    
    # Frontend envia array JSON ["TI"], backend recebe List[str]
    area_tecnologica: List[str] = Field(default_factory=list)
    
    carga_total_curso: float = Field(..., ge=0)
    
    # Recebe o objeto de parametrização: { "id_uc": { "carga_presencial": 10, ... } }
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
        # Garante que se vier string JSON, converte para lista
        if isinstance(v, str):
            import json
            try:
                v = json.loads(v)
            except:
                v = [v]
        if not isinstance(v, list):
            raise ValueError("Formato inválido para lista de áreas.")
        
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

    # --- Filtros (Mantidos iguais ao original) ---
    if busca:
        filtro["$or"] = [
            {"nome_curso": {"$regex": busca, "$options": "i"}},
            {"modalidade_curso": {"$regex": busca, "$options": "i"}},
            {"area_tecnologica": {"$regex": busca, "$options": "i"}}
        ]

    if status:
        norm = [s.strip().capitalize() for s in status if s.strip()]
        if norm: filtro["status"] = {"$in": norm}

    if modalidade and modalidade != "Todos": filtro["modalidade_curso"] = modalidade
    if tipo and tipo != "Todos": filtro["tipo_curso"] = tipo
    if area: filtro["area_tecnologica"] = {"$in": area}

    if created_from or created_to:
        # (Lógica de data mantida igual ao original...)
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

    # --- Paginação ---
    page = max(1, int(page))
    page_size = min(max(1, int(page_size)), 1000)

    col = db["curso"]
    coll = Collation('pt', strength=1)

    total = col.count_documents(filtro, collation=coll)
    cursor = col.find(filtro, collation=coll).sort("data_criacao", -1).skip((page - 1) * page_size).limit(page_size)

    items = []
    
    # Conjunto para coletar IDs de UCs que precisamos buscar o nome
    ucs_ids_to_fetch = set()

    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "instituicao_id" in doc: doc["instituicao_id"] = str(doc["instituicao_id"])
        if isinstance(doc.get("data_criacao"), datetime):
            doc["data_criacao"] = doc["data_criacao"].isoformat()
        
        # Coleta os IDs das UCs deste curso
        if "unidade_curricular" in doc and isinstance(doc["unidade_curricular"], dict):
            ucs_ids_to_fetch.update(doc["unidade_curricular"].keys())
            
        items.append(doc)

    # --- POPULAÇÃO DOS NOMES DAS UCS (NOVA LÓGICA) ---
    if ucs_ids_to_fetch:
        # Converte strings para ObjectIds válidos
        ids_validos = [ObjectId(uid) for uid in ucs_ids_to_fetch if ObjectId.is_valid(uid)]
        
        # Busca apenas o campo 'descricao' das UCs encontradas
        ucs_found = db["unidade_curricular"].find(
            {"_id": {"$in": ids_validos}},
            {"descricao": 1}
        )
        
        # Cria um mapa: ID -> Nome da UC
        ucs_map = {str(u["_id"]): u.get("descricao", "Sem descrição") for u in ucs_found}

        # Injeta o nome dentro de cada item da lista
        for item in items:
            if "unidade_curricular" in item and isinstance(item["unidade_curricular"], dict):
                for uc_id, uc_data in item["unidade_curricular"].items():
                    # Adiciona o campo 'nome_uc' dentro dos dados da UC
                    uc_data["nome_uc"] = ucs_map.get(uc_id, "UC não identificada")

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/api/cursos")
def criar_curso(curso: CursoModel, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    data = curso.dict()

    data['instituicao_id'] = ctx.inst_oid
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)
    
    # Remove _id se existir para deixar o Mongo criar
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
    
    # Remove campos imutáveis ou gerados
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
    res = db["curso"].delete_one({"_id": oid, "instituicao_id": ctx.inst_oid})
    
    if res.deleted_count:
        invalidate_cache(str(ctx.inst_oid))
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado")