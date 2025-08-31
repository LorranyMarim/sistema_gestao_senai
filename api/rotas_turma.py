from fastapi import APIRouter, HTTPException, Response, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from bson import ObjectId
from db import get_mongo_db

router = APIRouter(prefix="/api/turmas", tags=["Turmas"])

# ===================== MODELOS =====================

class UnidadeCurricularTurma(BaseModel):
    id_uc: str
    id_instrutor: str
    data_inicio: str
    data_fim: str

class TurmaCreate(BaseModel):
    codigo: str
    id_curso: str
    data_inicio: str
    data_fim: str
    turno: str
    num_alunos: int
    id_instituicao: str
    id_calendario: str
    id_empresa: str
    status: Optional[bool] = True  # <<< NOVO: nasce ativa por padrão
    unidades_curriculares: List[UnidadeCurricularTurma]

def _to_oid(value: str, field: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Campo '{field}' inválido")

def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialização enxuta para listagem"""
    out = {
        "_id": str(doc.get("_id")),  # Adicionar _id para compatibilidade
        "id": str(doc.get("_id")),
        "codigo": doc.get("codigo", ""),
        "data_inicio": doc.get("data_inicio", ""),
        "data_fim": doc.get("data_fim", ""),
        "turno": doc.get("turno", ""),
        "status": doc.get("status", True),
        "id_empresa": str(doc["id_empresa"]) if isinstance(doc.get("id_empresa"), ObjectId) else doc.get("id_empresa"),
        "id_curso": str(doc["id_curso"]) if isinstance(doc.get("id_curso"), ObjectId) else doc.get("id_curso"),
    }
    return out

def _serialize_full(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialização completa para /{id}"""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for f in ["id_curso", "id_instituicao", "id_calendario", "id_empresa"]:
        if f in doc and isinstance(doc[f], ObjectId):
            doc[f] = str(doc[f])
    if "unidades_curriculares" in doc:
        for uc in doc["unidades_curriculares"]:
            for f in ["id_uc", "id_instrutor"]:
                if isinstance(uc.get(f), ObjectId):
                    uc[f] = str(uc[f])
    return doc

# ===================== ROTAS =====================

@router.post("/", status_code=201)
def criar_turma(turma: TurmaCreate):
    db = get_mongo_db()
    doc = turma.dict()

    # Garantir status default true
    if doc.get("status") is None:
        doc["status"] = True

    # IDs
    doc["id_curso"]       = _to_oid(doc["id_curso"], "id_curso")
    doc["id_instituicao"] = _to_oid(doc["id_instituicao"], "id_instituicao")
    doc["id_calendario"]  = _to_oid(doc["id_calendario"], "id_calendario")
    doc["id_empresa"]     = _to_oid(doc["id_empresa"], "id_empresa")

    for uc in doc["unidades_curriculares"]:
        uc["id_uc"]        = _to_oid(uc["id_uc"], "unidades_curriculares[].id_uc")
        uc["id_instrutor"] = _to_oid(uc["id_instrutor"], "unidades_curriculares[].id_instrutor")

    res = db["turma"].insert_one(doc)
    return {"msg": "Turma cadastrada com sucesso", "id": str(res.inserted_id)}

@router.get("/")
def listar_turmas(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort_by: str = Query("data_inicio"),
    sort_dir: str = Query("asc"),
    q: Optional[str] = None,
    id_curso: Optional[str] = None,
    turno: Optional[str] = None,
    inicio: Optional[str] = None,  # YYYY-MM-DD
    fim: Optional[str] = None,     # YYYY-MM-DD
):
    """
    Retorna {items, page, page_size, total}
    Projeta campos necessários para a listagem:
    codigo, data_inicio, data_fim, turno, status, id_empresa, id_curso
    """
    db = get_mongo_db()
    coll = db["turma"]

    # --- Filtros ---
    filtros: Dict[str, Any] = {}
    if q:
        filtros["codigo"] = {"$regex": q, "$options": "i"}
    if id_curso:
        filtros["id_curso"] = _to_oid(id_curso, "id_curso")
    if turno:
        filtros["turno"] = turno
    if inicio or fim:
        rng: Dict[str, Any] = {}
        if inicio:
            rng["$gte"] = inicio
        if fim:
            rng["$lte"] = fim
        filtros["data_inicio"] = rng

    # --- Ordenação (whitelist) ---
    allow = {
        "codigo": "codigo",
        "data_inicio": "data_inicio",
        "data_fim": "data_fim",
        "turno": "turno",
        "status": "status",
    }
    sort_key = allow.get(sort_by, "data_inicio")
    sort_val = 1 if sort_dir.lower() == "asc" else -1

    total = coll.count_documents(filtros)
    cur = (
        coll.find(
            filtros,
            {
                "codigo": 1,
                "data_inicio": 1,
                "data_fim": 1,
                "turno": 1,      # <<< necessário para coluna TURNO
                "status": 1,     # <<< necessário para coluna STATUS
                "id_empresa": 1, # <<< necessário para mapear EMPRESA no front
                "id_curso": 1,   # <<< necessário para mapear CURSO no front
            },
        )
        .sort(sort_key, sort_val)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    items = [_serialize(d) for d in cur]
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
    }

@router.get("/{turma_id}")
def obter_turma(turma_id: str):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    doc = db["turma"].find_one({"_id": _id})
    if not doc:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return _serialize_full(doc)

@router.put("/{turma_id}")
def atualizar_turma(turma_id: str, turma: TurmaCreate):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    doc = turma.dict()

    if doc.get("status") is None:
        doc["status"] = True

    doc["id_curso"]       = _to_oid(doc["id_curso"], "id_curso")
    doc["id_instituicao"] = _to_oid(doc["id_instituicao"], "id_instituicao")
    doc["id_calendario"]  = _to_oid(doc["id_calendario"], "id_calendario")
    doc["id_empresa"]     = _to_oid(doc["id_empresa"], "id_empresa")

    for uc in doc["unidades_curriculares"]:
        uc["id_uc"]        = _to_oid(uc["id_uc"], "unidades_curriculares[].id_uc")
        uc["id_instrutor"] = _to_oid(uc["id_instrutor"], "unidades_curriculares[].id_instrutor")

    res = db["turma"].update_one({"_id": _id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {"msg": "Turma atualizada com sucesso", "id": turma_id}

@router.delete("/{turma_id}", status_code=204)
def excluir_turma(turma_id: str):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    res = db["turma"].delete_one({"_id": _id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return Response(status_code=204)
