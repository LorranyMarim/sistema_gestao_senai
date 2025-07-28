# rotas_empresa.py

from fastapi import APIRouter, HTTPException
from db import get_mongo_db
from bson.objectid import ObjectId

router = APIRouter()

# Listar empresas (Empresas)
@router.get("/api/empresas")
def listar_convenios():
    db = get_mongo_db()
    empresas = list(db["empresa"].find())
    for conv in empresas:
        conv["_id"] = str(conv["_id"])
    return empresas

# Adicionar nova empresa (Empresa)
@router.post("/api/empresas")
def adicionar_convenio(empresa: dict):
    db = get_mongo_db()
    if "razao_social" not in empresa or "cnpj" not in empresa or "instituicao_id" not in empresa:
        raise HTTPException(status_code=400, detail="Campos obrigatórios: razao_social, cnpj, instituicao_id")
    result = db["empresa"].insert_one(empresa)
    empresa["_id"] = str(result.inserted_id)
    return empresa

# Editar empresa (Empresa)
@router.put("/api/empresas/{convenio_id}")
def editar_convenio(convenio_id: str, empresa: dict):
    db = get_mongo_db()
    result = db["empresa"].update_one(
        {"_id": ObjectId(convenio_id)},
        {"$set": empresa}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrado")
    empresa["_id"] = convenio_id
    return empresa

# Excluir empresa (Empresa)
@router.delete("/api/empresas/{convenio_id}")
def excluir_convenio(convenio_id: str):
    db = get_mongo_db()
    result = db["empresa"].delete_one({"_id": ObjectId(convenio_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrado")
    return {"msg": "Empresa excluído"}
