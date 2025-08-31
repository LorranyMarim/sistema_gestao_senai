# rotas_usuario.py
from fastapi import APIRouter, HTTPException, Response, Request, status
from db import get_mongo_db
from auth_utils import create_access_token
from pydantic import BaseModel, validator
import re
import time

router = APIRouter()

# Simulação de tentativas por IP na memória (reset ao reiniciar API)
login_attempts = {}

LOCK_MINUTES = 5
MAX_ATTEMPTS = 5

class UsuarioLogin(BaseModel):
    user_name: str
    senha: str

    @validator('user_name')
    def validar_user(cls, v):
        if not (4 <= len(v.strip()) <= 50):
            raise ValueError("Usuário deve ter entre 4 e 50 caracteres.")
        if re.search(r"[<>'\"]", v):
            raise ValueError("Usuário contém caracteres inválidos.")
        return v.strip()

    @validator('senha')
    def validar_senha(cls, v):
        if not (4 <= len(v) <= 50):
            raise ValueError("Senha deve ter entre 4 e 50 caracteres.")
        if re.search(r"[<>'\"]", v):
            raise ValueError("Senha contém caracteres inválidos.")
        return v

@router.post("/api/login")
def login(dados: UsuarioLogin, response: Response, request: Request):
    ip = request.client.host
    now = time.time()

    # Controle de tentativas
    if ip not in login_attempts:
        login_attempts[ip] = {'count': 0, 'last_time': now}
    else:
        if login_attempts[ip]['count'] >= MAX_ATTEMPTS:
            if now - login_attempts[ip]['last_time'] < LOCK_MINUTES * 60:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Muitas tentativas. Tente novamente em alguns minutos."
                )
            else:
                # Libera login após lock
                login_attempts[ip] = {'count': 0, 'last_time': now}

    # Verificação simplificada: apenas aceita admin/admin
    if dados.user_name != "admin" or dados.senha != "admin":
        login_attempts[ip]['count'] += 1
        login_attempts[ip]['last_time'] = now
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

    # Reset tentativas ao sucesso
    login_attempts[ip] = {'count': 0, 'last_time': now}

    # Gera token (sessão curta de 30 minutos)
    from datetime import timedelta
    token = create_access_token({"sub": "admin"}, expires_delta=timedelta(minutes=30))
    response.set_cookie(key="session_token", value=token, httponly=True, max_age=30*60)

    # Retorna dados fixos do usuário admin
    return {
        "id": "admin_id",
        "nome": "Administrador",
        "tipo_acesso": "admin",
        "user_name": "admin",
        "instituicao_id": "senai_betim"
    }
