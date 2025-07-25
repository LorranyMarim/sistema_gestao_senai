# rotas_convenio.py

from fastapi import APIRouter, HTTPException
from db import get_mongo_db
from bson.objectid import ObjectId

router = APIRouter()

# Listar empresas (convênios)
@router.get("/api/convenios")
def listar_convenios():
    db = get_mongo_db()
    convenios = list(db["convenio"].find())
    for conv in convenios:
        conv["_id"] = str(conv["_id"])
    return convenios

# Adicionar nova empresa (convênio)
@router.post("/api/convenios")
def adicionar_convenio(convenio: dict):
    db = get_mongo_db()
    if "razao_social" not in convenio or "cnpj" not in convenio or "instituicao_id" not in convenio:
        raise HTTPException(status_code=400, detail="Campos obrigatórios: razao_social, cnpj, instituicao_id")
    result = db["convenio"].insert_one(convenio)
    convenio["_id"] = str(result.inserted_id)
    return convenio

# Editar empresa (convênio)
@router.put("/api/convenios/{convenio_id}")
def editar_convenio(convenio_id: str, convenio: dict):
    db = get_mongo_db()
    result = db["convenio"].update_one(
        {"_id": ObjectId(convenio_id)},
        {"$set": convenio}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Convênio não encontrado")
    convenio["_id"] = convenio_id
    return convenio

# Excluir empresa (convênio)
@router.delete("/api/convenios/{convenio_id}")
def excluir_convenio(convenio_id: str):
    db = get_mongo_db()
    result = db["convenio"].delete_one({"_id": ObjectId(convenio_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Convênio não encontrado")
    return {"msg": "Convênio excluído"}
