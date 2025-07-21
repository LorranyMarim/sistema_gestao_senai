from fastapi import APIRouter, HTTPException, Body
from db import get_mongo_db
from bson import ObjectId

router = APIRouter()

@router.get("/api/unidades_curriculares")
def listar_ucs():
    db = get_mongo_db()
    ucs = list(db["unidade_curricular"].find())
    for uc in ucs:
        uc["_id"] = str(uc["_id"])
    return ucs

@router.post("/api/unidades_curriculares")
def criar_uc(uc: dict = Body(...)):
    db = get_mongo_db()
    uc.pop('_id', None)
    inserted = db["unidade_curricular"].insert_one(uc)
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/unidades_curriculares/{id}")
def atualizar_uc(id: str, uc: dict = Body(...)):
    db = get_mongo_db()
    uc.pop('_id', None)
    res = db["unidade_curricular"].update_one({"_id": ObjectId(id)}, {"$set": uc})
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
