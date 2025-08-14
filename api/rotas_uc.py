from fastapi import APIRouter, HTTPException, Query
from db import get_mongo_db
from bson import ObjectId
from pydantic import BaseModel, Field, validator
from typing import Literal, Optional, List
from datetime import datetime, timezone
import re
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


def _try_objectid(s: str):
    """Retorna ObjectId(s) se válido; caso contrário, None."""
    try:
        return ObjectId(s)
    except Exception:
        return None


@router.get("/api/unidades_curriculares")
def listar_ucs(
    q: Optional[str] = None,
    instituicao: Optional[List[str]] = Query(None),   # ?instituicao=...&instituicao=...
    status: Optional[List[str]] = Query(None),        # ?status=Ativa&status=Inativa (ou Ativo/Inativo)
    created_from: Optional[datetime] = None,          # ISO-8601
    created_to: Optional[datetime] = None,            # ISO-8601
    page: int = 1,
    page_size: int = 10,
):
    """
    Filtros:
      - q: regex em descricao/sala_ideal (case/acento-insensível via collation 'pt')
      - instituicao: lista de instituicao_id (aceita string e ObjectId)
      - status: lista ["Ativa","Inativa"] (aceita "Ativo"/"Inativo" e normaliza)
      - data_criacao: intervalo [created_from, created_to] (UTC)
    Paginação:
      - page (>=1), page_size (1..100)
    Retorno:
      { items: [...], total: N, page: X, page_size: Y }
    """
    db = get_mongo_db()
    filtro: dict = {}

    # Busca textual
    if q:
        filtro["$or"] = [
            {"descricao":  {"$regex": q, "$options": "i"}},
            {"sala_ideal": {"$regex": q, "$options": "i"}},
        ]

    # Instituições (compatível com string e ObjectId no banco)
    if instituicao:
        inst_in: List[object] = []
        for sid in instituicao:
            sid = (sid or "").strip()
            if not sid:
                continue
            inst_in.append(sid)  # string
            oid = _try_objectid(sid)
            if oid:
                inst_in.append(oid)  # ObjectId
        if inst_in:
            filtro["instituicao_id"] = {"$in": inst_in}

    # Status (normaliza e aceita "Ativo/Inativo")
    if status:
        norm = []
        for s in status:
            if not s:
                continue
            v = s.strip().capitalize()
            if v == "Ativo":
                v = "Ativa"
            elif v == "Inativo":
                v = "Inativa"
            if v in ("Ativa", "Inativa"):
                norm.append(v)
        if norm:
            filtro["status"] = {"$in": norm}

    # Intervalo de criação
    if created_from or created_to:
        # Se vierem sem tzinfo, presume UTC
        if created_from and created_from.tzinfo is None:
            created_from = created_from.replace(tzinfo=timezone.utc)
        if created_to and created_to.tzinfo is None:
            created_to = created_to.replace(tzinfo=timezone.utc)
        # Garante from <= to (se invertido, troca)
        if created_from and created_to and created_from > created_to:
            created_from, created_to = created_to, created_from

        rng = {}
        if created_from:
            rng["$gte"] = created_from.astimezone(timezone.utc)
        if created_to:
            rng["$lte"] = created_to.astimezone(timezone.utc)
        if rng:
            filtro["data_criacao"] = rng

    # Paginação
    page = max(1, int(page))
    page_size = min(max(1, int(page_size)), 100)

    col = db["unidade_curricular"]
    coll = Collation('pt', strength=1)  # case/acento-insensível

    total = col.count_documents(filtro, collation=coll)
    cursor = (
        col.find(filtro, collation=coll)
           .sort("data_criacao", -1)  # mais recente -> mais antiga
           .skip((page - 1) * page_size)
           .limit(page_size)
    )

    items = []
    for uc in cursor:
        oid = uc.get("_id")

        # Normaliza instituicao_id para string
        if isinstance(uc.get("instituicao_id"), ObjectId):
            uc["instituicao_id"] = str(uc["instituicao_id"])

        # data_criacao: se ausente, derive do ObjectId para exibir
        if uc.get("data_criacao") is None and isinstance(oid, ObjectId):
            uc["data_criacao"] = oid.generation_time

        # Converte data_criacao para ISO 8601 (UTC)
        if isinstance(uc.get("data_criacao"), datetime):
            uc["data_criacao"] = uc["data_criacao"].astimezone(timezone.utc).isoformat()

        # _id -> string
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
    data['data_criacao'] = datetime.now(timezone.utc)  # servidor define a data/hora
    data.pop('_id', None)

    inserted = db["unidade_curricular"].insert_one(data)
    return {"_id": str(inserted.inserted_id)}


@router.put("/api/unidades_curriculares/{id}")
def atualizar_uc(id: str, uc: UnidadeCurricularModel):
    """
    Atualiza UC SEM permitir alterar 'data_criacao'.
    """
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    data = uc.dict()
    data['status'] = data['status'].capitalize()
    data.pop('_id', None)
    data.pop('data_criacao', None)  # não permite mudar a criação

    res = db["unidade_curricular"].update_one({"_id": oid}, {"$set": data})
    if res.matched_count:
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="UC não encontrada")


@router.delete("/api/unidades_curriculares/{id}")
def deletar_uc(id: str):
    oid = _try_objectid(id)
    if not oid:
        raise HTTPException(status_code=400, detail="ID inválido")

    db = get_mongo_db()
    res = db["unidade_curricular"].delete_one({"_id": oid})
    if res.deleted_count:
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="UC não encontrada")
