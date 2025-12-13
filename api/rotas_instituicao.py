from fastapi import APIRouter
from db import get_mongo_db

# NOTA: Esta rota é pública pois alimenta o combobox da tela de Login.
# Não adicione Depends(get_ctx) aqui, senão ninguém consegue logar.

router = APIRouter()

@router.get("/api/instituicoes")
def listar_instituicoes_login():
    db = get_mongo_db()
    # Opcional: Você pode filtrar apenas instituições ativas se tiver esse campo
    filtro = {} 
    proj = {"_id": 1, "razao_social": 1}
    
    # Busca todas as instituições para o usuário escolher
    cur = db["instituicao"].find(filtro, proj).sort("razao_social", 1)

    itens = [
        {"_id": str(x["_id"]), "nome": (x.get("razao_social") or "(sem razão social)")}
        for x in cur
    ]
    
    # Ordenação extra via Python para garantir
    itens.sort(key=lambda i: (i["nome"] or "").lower())
    return itens