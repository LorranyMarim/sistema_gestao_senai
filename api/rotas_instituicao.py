from fastapi import APIRouter
from db import get_mongo_db

router = APIRouter()
@router.get("/api/instituicoes")
def listar_instituicoes_login():
    db = get_mongo_db()
    # opcional: filtre só ativas, se existir esse campo
    filtro = {}  # ex.: {"status": {"$ne": "Inativa"}}
    proj = {"_id": 1, "razao_social": 1}
    cur = db["instituicao"].find({}, proj).sort("razao_social", 1)

    itens = [
        {"_id": str(x["_id"]), "nome": (x.get("razao_social") or "(sem razão social)")}
        for x in cur
    ]
    # ordena alfabeticamente ignorando caixa/acentos simples
    itens.sort(key=lambda i: (i["nome"] or "").lower())
    return itens

