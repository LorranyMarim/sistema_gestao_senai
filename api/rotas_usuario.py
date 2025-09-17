# rotas_usuario.py
from fastapi import APIRouter, HTTPException, Response, Request, status
from db import get_mongo_db
from auth import verificar_senha
from auth_utils import criar_token
from pydantic import BaseModel, validator
from datetime import timedelta
from bson.objectid import ObjectId
from bson.errors import InvalidId
import re
import time

router = APIRouter()

login_attempts = {}
LOCK_MINUTES = 5
MAX_ATTEMPTS = 5


class UsuarioLogin(BaseModel):
    user_name: str
    senha: str
    instituicao_id: str | None = None

    @validator('user_name')
    def validar_user(cls, v):
        v = v.strip()
        if not (4 <= len(v) <= 50):
            raise ValueError("Usuário deve ter entre 4 e 50 caracteres.")
        if re.search(r"[<>'\"]", v):
            raise ValueError("Usuário contém caracteres inválidos.")
        return v

    @validator('senha')
    def validar_senha(cls, v):
        if not (4 <= len(v) <= 50):
            raise ValueError("Senha deve ter entre 4 e 50 caracteres.")
        return v


def _oid_or_400(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Instituição inválida")


@router.post("/api/login")
def login(dados: UsuarioLogin, response: Response, request: Request):
    ip = request.client.host
    now = time.time()

    la = login_attempts.get(ip, {'count': 0, 'last_time': now})
    if la['count'] >= MAX_ATTEMPTS and (now - la['last_time'] < LOCK_MINUTES * 60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente em alguns minutos."
        )
    if now - la['last_time'] >= LOCK_MINUTES * 60:
        la = {'count': 0, 'last_time': now}
    login_attempts[ip] = la

    db = get_mongo_db()
    usuario = db["usuario"].find_one({"user_name_lc": dados.user_name.lower()})

    erro_login = HTTPException(status_code=401, detail="Usuário ou senha incorretos.")
    hash_salvo = (usuario or {}).get("senha")
    if not usuario or not hash_salvo or not verificar_senha(dados.senha, hash_salvo):
        login_attempts[ip] = {'count': la['count'] + 1, 'last_time': now}
        raise erro_login

    # sucesso de senha
    login_attempts[ip] = {'count': 0, 'last_time': now}

    # ---- Regra da instituição (bloqueia mismatch) ----
    inst_id_user = usuario.get("instituicao_id")
    inst_id_user = str(inst_id_user) if inst_id_user is not None else None

    insts_user = usuario.get("instituicoes_ids") or []
    insts_user = [str(x) for x in insts_user if x is not None]

    chosen = (dados.instituicao_id or "").strip()

    if insts_user:
        # usuário multi-instituição: precisa escolher uma permitida
        if not chosen or chosen not in insts_user:
            raise HTTPException(status_code=403, detail="Instituição não permitida para este usuário.")
        inst_final = chosen

    elif inst_id_user:
        # usuário de 1 instituição: se escolheu outra, bloqueia
        if chosen and chosen != inst_id_user:
            raise HTTPException(status_code=403, detail="Instituição não permitida para este usuário.")
        inst_final = inst_id_user

    else:
        # usuário sem instituição configurada: precisa escolher e ela deve existir
        if not chosen:
            raise HTTPException(status_code=403, detail="Selecione uma instituição válida.")
        inst_exists = db["instituicao"].find_one({"_id": _oid_or_400(chosen)})
        if not inst_exists:
            raise HTTPException(status_code=400, detail="Instituição inválida.")
        inst_final = chosen

    # Cookie só após tudo validado
    token = criar_token({"sub": usuario.get("user_name")}, expires_delta=timedelta(minutes=30))
    response.set_cookie(key="session_token", value=token, httponly=True, max_age=30*60)

    return {
        "id": str(usuario.get("_id")),
        "nome": usuario.get("nome"),
        "tipo_acesso": usuario.get("tipo_acesso"),
        "user_name": usuario.get("user_name"),
        "instituicao_id": inst_final
    }
