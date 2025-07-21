# rotas_usuario.py
from fastapi import APIRouter, HTTPException, Response
from db import get_mongo_db  # Import absoluto!
from auth import verificar_senha
from auth_utils import criar_token
from pydantic import BaseModel

router = APIRouter()

class UsuarioLogin(BaseModel):
    user_name: str
    senha: str

@router.post("/api/login")
def login(dados: UsuarioLogin, response: Response):
    db = get_mongo_db()
    usuario = db["usuario"].find_one({"user_name": dados.user_name})
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if not verificar_senha(dados.senha, usuario['senha']):
        raise HTTPException(status_code=401, detail="Senha incorreta")

    token = criar_token({"sub": usuario["user_name"]})
    response.set_cookie(key="session_token", value=token, httponly=True)
    return {
        "id": str(usuario["_id"]),
        "nome": usuario.get("nome"),
        "tipo_acesso": usuario.get("tipo_acesso"),
        "user_name": usuario.get("user_name"),
        "instituicao_id": usuario.get("instituicao_id")
    }
