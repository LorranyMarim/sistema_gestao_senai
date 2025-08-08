from fastapi import APIRouter
from db import get_mongo_db
from bson import ObjectId

router = APIRouter()

@router.get("/api/alocacoes")
def listar_alocacoes():
    db = get_mongo_db()
    alocacoes = list(db["alocacoes_instrutores"].find())
    for a in alocacoes:
        a["_id"] = str(a["_id"])
        a["id_instrutor"] = str(a["id_instrutor"])
        a["id_uc"] = str(a["id_uc"])
        a["id_turma"] = str(a["id_turma"])
        a["id_curso"] = str(a["id_curso"])
    return alocacoes

@router.post("/api/alocacoes")
def criar_alocacao(alocacao: dict):
    db = get_mongo_db()
    alocacao["id_instrutor"] = ObjectId(alocacao["id_instrutor"])
    alocacao["id_uc"] = ObjectId(alocacao["id_uc"])
    alocacao["id_turma"] = ObjectId(alocacao["id_turma"])
    alocacao["id_curso"] = ObjectId(alocacao["id_curso"])
    result = db["alocacoes_instrutores"].insert_one(alocacao)
    alocacao["_id"] = str(result.inserted_id)
    return alocacao
