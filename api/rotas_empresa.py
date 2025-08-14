from fastapi import APIRouter, HTTPException
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timezone

router = APIRouter()

def _normalize_empresa(doc):
    """Converte ObjectId para str e normaliza data_criacao para ISO-8601 (UTC).
       Faz fallback do _id -> data quando data_criacao não existir."""
    if not doc:
        return doc
    oid = doc.get("_id")
    if isinstance(oid, ObjectId):
        doc["_id"] = str(oid)

    # Normaliza instituicao_id caso tenha sido salvo como ObjectId
    inst = doc.get("instituicao_id")
    if isinstance(inst, ObjectId):
        doc["instituicao_id"] = str(inst)

    # Garante data_criacao serializada
    dt = doc.get("data_criacao")
    if isinstance(dt, datetime):
        doc["data_criacao"] = dt.astimezone(timezone.utc).isoformat()
    elif dt is None and isinstance(oid, ObjectId):
        # Fallback: usa a geração do ObjectId
        doc["data_criacao"] = oid.generation_time.astimezone(timezone.utc).isoformat()

    return doc

@router.get("/api/empresas")
def listar_empresas():
    """
    Lista empresas já ordenadas do mais recente para o mais antigo.
    Se algum documento não tiver data_criacao, usamos o _id (ObjectId) como fallback.
    """
    db = get_mongo_db()
    col = db["empresa"]

    # Usa aggregation para coalescer data_criacao com a data do _id
    pipeline = [
        {
            "$addFields": {
                "sortKey": {
                    "$ifNull": ["$data_criacao", {"$toDate": "$_id"}]
                }
            }
        },
        {"$sort": {"sortKey": -1}},
        {"$project": {"sortKey": 0}}
    ]

    empresas = list(col.aggregate(pipeline))
    return [_normalize_empresa(e) for e in empresas]

@router.post("/api/empresas")
def adicionar_empresa(empresa: dict):
    """
    Cria empresa e grava data_criacao no servidor (UTC).
    Campo não é aceito do cliente.
    """
    db = get_mongo_db()
    if "razao_social" not in empresa or "cnpj" not in empresa or "instituicao_id" not in empresa:
        raise HTTPException(status_code=400, detail="Campos obrigatórios: razao_social, cnpj, instituicao_id")

    # ignora qualquer data_criacao enviada pelo cliente
    empresa.pop("data_criacao", None)
    empresa["data_criacao"] = datetime.now(timezone.utc)

    result = db["empresa"].insert_one(empresa)
    saved = db["empresa"].find_one({"_id": result.inserted_id})
    return _normalize_empresa(saved)

@router.put("/api/empresas/{empresa_id}")
def editar_empresa(empresa_id: str, empresa: dict):
    """
    Atualiza empresa SEM permitir alterar data_criacao.
    """
    db = get_mongo_db()
    empresa = dict(empresa or {})
    empresa.pop("data_criacao", None)  # impede alteração

    result = db["empresa"].update_one(
        {"_id": ObjectId(empresa_id)},
        {"$set": empresa}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    updated = db["empresa"].find_one({"_id": ObjectId(empresa_id)})
    return _normalize_empresa(updated)

@router.delete("/api/empresas/{empresa_id}")
def excluir_empresa(empresa_id: str):
    db = get_mongo_db()
    result = db["empresa"].delete_one({"_id": ObjectId(empresa_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return {"msg": "Empresa excluída"}
