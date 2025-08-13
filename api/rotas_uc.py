from fastapi import APIRouter, HTTPException, Query
from db import get_mongo_db
from bson import ObjectId
from pydantic import BaseModel, Field, validator
from typing import Literal
from datetime import datetime, timezone
import re
from typing import Optional, List
from pymongo.collation import Collation


router = APIRouter()

FORBIDDEN_CHARS = re.compile(r'[<>"\';{}]')

class UnidadeCurricularModel(BaseModel):
    descricao: str = Field(..., min_length=2, max_length=100)
    sala_ideal: str = Field(..., min_length=2, max_length=100)
    instituicao_id: str = Field(..., min_length=2, max_length=100)
    status: Literal['Ativa', 'Inativa']

    @validator('descricao', 'sala_ideal', 'instituicao_id', pre=True)
    def sanitize_and_check_chars(cls, v):
        if not isinstance(v, str):
            raise ValueError("Valor inválido.")
        val = v.strip()
        if FORBIDDEN_CHARS.search(val):
            raise ValueError("O campo contém caracteres não permitidos.")
        return val

@router.get("/api/unidades_curriculares")
@router.get("/api/unidades_curriculares")
def listar_ucs(
    q: Optional[str] = None,
    instituicao: Optional[List[str]] = Query(None),   # ?instituicao=...&instituicao=...
    status: Optional[List[str]] = Query(None),        # ?status=Ativa&status=Inativa
    created_from: Optional[datetime] = None,          # ISO-8601
    created_to: Optional[datetime] = None,            # ISO-8601
    page: int = 1,
    page_size: int = 10,
):
    """
    Filtros:
      - q: regex em descricao/sala_ideal (case-insensitive; acento-insensível via collation 'pt')
      - instituicao: lista de instituicao_id
      - status: lista ["Ativa","Inativa"]
      - data_criacao: intervalo [created_from, created_to]
    Paginação:
      - page (>=1), page_size (1..100)
    Retorno:
      { items: [...], total: N, page: X, page_size: Y }
    """
    db = get_mongo_db()
    filtro = {}

    if q:
        filtro["$or"] = [
            {"descricao":   {"$regex": q, "$options": "i"}},
            {"sala_ideal":  {"$regex": q, "$options": "i"}},
        ]
    if instituicao:
        filtro["instituicao_id"] = {"$in": instituicao}
    if status:
        filtro["status"] = {"$in": [s.capitalize() for s in status]}

    if created_from or created_to:
        rng = {}
        if created_from:
            if created_from.tzinfo is None:
                created_from = created_from.replace(tzinfo=timezone.utc)
            rng["$gte"] = created_from.astimezone(timezone.utc)
        if created_to:
            if created_to.tzinfo is None:
                created_to = created_to.replace(tzinfo=timezone.utc)
            rng["$lte"] = created_to.astimezone(timezone.utc)
        filtro["data_criacao"] = rng

    page = max(1, int(page))
    page_size = min(max(1, int(page_size)), 100)

    col = db["unidade_curricular"]
    coll = Collation('pt', strength=1)  # case/acento-insensível

    total = col.count_documents(filtro, collation=coll)
    cursor = (col.find(filtro, collation=coll)
                .sort("data_criacao", -1)
                .skip((page - 1) * page_size)
                .limit(page_size))

    items = []
    for uc in cursor:
        oid = uc.get("_id")
        # Normaliza instituicao_id
        if isinstance(uc.get("instituicao_id"), ObjectId):
            uc["instituicao_id"] = str(uc["instituicao_id"])
        # data_criacao: se ausente, derive do ObjectId para exibir
        if uc.get("data_criacao") is None and isinstance(oid, ObjectId):
            uc["data_criacao"] = oid.generation_time
        if isinstance(uc.get("data_criacao"), datetime):
            uc["data_criacao"] = uc["data_criacao"].astimezone(timezone.utc).isoformat()
        uc["_id"] = str(oid)
        items.append(uc)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/api/unidades_curriculares")
def criar_uc(uc: UnidadeCurricularModel):
    """
    Cria UC e grava data_criacao no servidor (UTC). Campo não vem do cliente.
    """
    db = get_mongo_db()
    data = uc.dict()
    data['status'] = data['status'].capitalize()
    data['data_criacao'] = datetime.now(timezone.utc)  # <--- AQUI grava a data/hora
    data.pop('_id', None)

    inserted = db["unidade_curricular"].insert_one(data)
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/unidades_curriculares/{id}")
def atualizar_uc(id: str, uc: UnidadeCurricularModel):
    """
    Atualiza UC SEM permitir alterar 'data_criacao'.
    """
    db = get_mongo_db()
    data = uc.dict()
    data['status'] = data['status'].capitalize()
    data.pop('_id', None)
    data.pop('data_criacao', None)  # <--- não deixa o cliente mudar

    res = db["unidade_curricular"].update_one({"_id": ObjectId(id)}, {"$set": data})
    if res.matched_count:
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="UC não encontrada")

@router.delete("/api/unidades_curriculares/{id}")
def deletar_uc(id: str):
    db = get_mongo_db()
    res = db["unidade_curricular"].delete_one({"_id": ObjectId(id)})
    if res.deleted_count:
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="UC não encontrada")
