# rotas_convenio.py
from fastapi import APIRouter, HTTPException
from models import Empresa
from db import get_mongo_db
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api/convenios", tags=["convenios"])

@router.get("/", response_model=List[Empresa])
async def listar_convenios():
    """Lista todos os convênios/empresas parceiras"""
    try:
        db = get_mongo_db()
        convenios = list(db["empresas"].find({"tipo_parceria": "convenio", "ativo": True}))
        for convenio in convenios:
            convenio["id"] = str(convenio["_id"])
            del convenio["_id"]
        return convenios
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
async def criar_convenio(convenio: Empresa):
    """Cria um novo convênio"""
    try:
        db = get_mongo_db()
        convenio_dict = convenio.dict(exclude={"id"})
        convenio_dict["tipo_parceria"] = "convenio"
        result = db["empresas"].insert_one(convenio_dict)
        return {"id": str(result.inserted_id), "message": "Convênio criado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{convenio_id}", response_model=Empresa)
async def obter_convenio(convenio_id: str):
    """Obtém um convênio específico"""
    try:
        db = get_mongo_db()
        convenio = db["empresas"].find_one({"_id": ObjectId(convenio_id)})
        if not convenio:
            raise HTTPException(status_code=404, detail="Convênio não encontrado")
        convenio["id"] = str(convenio["_id"])
        del convenio["_id"]
        return convenio
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{convenio_id}", response_model=dict)
async def atualizar_convenio(convenio_id: str, convenio: Empresa):
    """Atualiza um convênio"""
    try:
        db = get_mongo_db()
        convenio_dict = convenio.dict(exclude={"id"})
        result = db["empresas"].update_one(
            {"_id": ObjectId(convenio_id)},
            {"$set": convenio_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Convênio não encontrado")
        return {"message": "Convênio atualizado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{convenio_id}", response_model=dict)
async def deletar_convenio(convenio_id: str):
    """Deleta um convênio (soft delete)"""
    try:
        db = get_mongo_db()
        result = db["empresas"].update_one(
            {"_id": ObjectId(convenio_id)},
            {"$set": {"ativo": False}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Convênio não encontrado")
        return {"message": "Convênio removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))