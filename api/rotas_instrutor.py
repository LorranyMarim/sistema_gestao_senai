from fastapi import APIRouter, HTTPException
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timezone

router = APIRouter()

# -------------------------- Helpers --------------------------

def _normalize_status(value):
    """
    Normaliza o campo status para string 'Ativo' ou 'Inativo'.
    Aceita booleanos (True/False) e strings em qualquer caixa.
    Padrão: 'Ativo'.
    """
    if value is None or value == "":
        return "Ativo"
    if isinstance(value, bool):
        return "Ativo" if value else "Inativo"
    s = str(value).strip().lower()
    if s in ("ativo", "at", "a", "1", "true", "verdadeiro", "yes", "sim"):
        return "Ativo"
    if s in ("inativo", "in", "i", "0", "false", "falso", "no", "nao", "não"):
        return "Inativo"
    # Qualquer outro valor: força para 'Ativo' para manter consistência
    return "Ativo"


def _normalize_instrutor(doc):
    if not doc:
        return doc

    # _id e fallback para data_criacao
    oid = doc.get("_id")
    if isinstance(oid, ObjectId):
        gen_time = oid.generation_time.astimezone(timezone.utc)
        doc["_id"] = str(oid)
    else:
        gen_time = None

    # instituicao_id -> string
    inst = doc.get("instituicao_id")
    if isinstance(inst, ObjectId):
        doc["instituicao_id"] = str(inst)

    # coleções e campos numéricos
    doc["mapa_competencia"] = [str(x) for x in doc.get("mapa_competencia", [])]
    doc["turnos"] = doc.get("turnos", [])
    doc["carga_horaria"] = doc.get("carga_horaria", 0)

    # status normalizado
    doc["status"] = _normalize_status(doc.get("status"))

    # data_criacao em ISO-8601 (UTC), com fallback para _id
    dt = doc.get("data_criacao")
    if isinstance(dt, datetime):
        doc["data_criacao"] = dt.astimezone(timezone.utc).isoformat()
    elif dt is None and gen_time is not None:
        doc["data_criacao"] = gen_time.isoformat()

    return doc


# -------------------------- Rotas --------------------------

@router.get("/api/instrutores")
def listar_instrutores():
    db = get_mongo_db()
    col = db["instrutor"]

    # Ordena por data_criacao (ou _id como fallback) do mais recente ao mais antigo
    pipeline = [
        {"$addFields": {"sortKey": {"$ifNull": ["$data_criacao", {"$toDate": "$_id"}]}}},
        {"$sort": {"sortKey": -1}},
        {"$project": {"sortKey": 0}},
    ]
    itens = list(col.aggregate(pipeline))
    return [_normalize_instrutor(x) for x in itens]


@router.post("/api/instrutores")
def criar_instrutor(instrutor: dict):
    db = get_mongo_db()
    instrutor = dict(instrutor or {})

    # _id sempre gerado pelo Mongo
    if "_id" in instrutor:
        instrutor.pop("_id", None)

    # Força/garante tipos básicos
    instrutor["mapa_competencia"] = instrutor.get("mapa_competencia", [])
    instrutor["turnos"] = instrutor.get("turnos", [])
    instrutor["carga_horaria"] = instrutor.get("carga_horaria", 0)

    # Normaliza status (default 'Ativo')
    instrutor["status"] = _normalize_status(instrutor.get("status"))

    # Não aceitar data_criacao do cliente
    instrutor.pop("data_criacao", None)
    instrutor["data_criacao"] = datetime.now(timezone.utc)

    result = db["instrutor"].insert_one(instrutor)
    saved = db["instrutor"].find_one({"_id": result.inserted_id})
    return _normalize_instrutor(saved)


@router.put("/api/instrutores/{id}")
def atualizar_instrutor(id: str, instrutor: dict):
    db = get_mongo_db()
    instrutor = dict(instrutor or {})

    # Nunca permitir alteração de data_criacao e _id
    instrutor.pop("data_criacao", None)
    instrutor.pop("_id", None)

    # Força/garante tipos básicos
    instrutor["mapa_competencia"] = instrutor.get("mapa_competencia", [])
    instrutor["turnos"] = instrutor.get("turnos", [])
    instrutor["carga_horaria"] = instrutor.get("carga_horaria", 0)

    # Normaliza status (se vier no payload; se não vier, não altera)
    if "status" in instrutor:
      instrutor["status"] = _normalize_status(instrutor.get("status"))

    result = db["instrutor"].update_one({"_id": ObjectId(id)}, {"$set": instrutor})
    if result.matched_count:
        updated = db["instrutor"].find_one({"_id": ObjectId(id)})
        return _normalize_instrutor(updated)
    raise HTTPException(status_code=404, detail="Instrutor não encontrado")


@router.delete("/api/instrutores/{id}")
def remover_instrutor(id: str):
    db = get_mongo_db()
    result = db["instrutor"].delete_one({"_id": ObjectId(id)})
    if result.deleted_count:
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Instrutor não encontrado")
