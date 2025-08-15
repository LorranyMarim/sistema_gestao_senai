# rotas_curso.py (corrigido)
from fastapi import APIRouter, HTTPException, Body
from db import get_mongo_db
from bson import ObjectId

router = APIRouter()

@router.get("/api/cursos")
def listar_cursos():
    db = get_mongo_db()
    cursos = list(db["curso"].find())
    for c in cursos:
        # _id -> string
        c["_id"] = str(c["_id"])
        # normalizações comuns (se existirem)
        if isinstance(c.get("instituicao_id"), ObjectId):
            c["instituicao_id"] = str(c["instituicao_id"])
        if "empresa" in c:
            if isinstance(c["empresa"], list):
                c["empresa"] = [str(x) for x in c["empresa"]]
            elif isinstance(c["empresa"], ObjectId):
                c["empresa"] = str(c["empresa"])
    return cursos

@router.post("/api/cursos")
def criar_curso(curso: dict = Body(...)):
    db = get_mongo_db()
    data = dict(curso or {})
    data.pop("_id", None)
    inserted = db["curso"].insert_one(data)
    return {"_id": str(inserted.inserted_id)}

@router.put("/api/cursos/{id}")
def atualizar_curso(id: str, curso: dict = Body(...)):
    db = get_mongo_db()
    data = dict(curso or {})
    data.pop("_id", None)
    res = db["curso"].update_one({"_id": ObjectId(id)}, {"$set": data})
    if res.matched_count:
        return {"msg": "Atualizado com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado")

@router.delete("/api/cursos/{id}")
def deletar_curso(id: str):
    db = get_mongo_db()
    res = db["curso"].delete_one({"_id": ObjectId(id)})
    if res.deleted_count:
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado")
