# rotas_usuario.py
from fastapi import APIRouter, HTTPException, Response, Request, status
from db import get_mongo_db
from auth import verificar_senha
from auth_utils import criar_token
from pydantic import BaseModel, validator
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
        # manter blacklist no USUÁRIO, se quiser
        if re.search(r"[<>'\"]", v):
            raise ValueError("Usuário contém caracteres inválidos.")
        return v

    @validator('senha')
    def validar_senha(cls, v):
        # Aceite qualquer caractere; só valide tamanho
        if not (4 <= len(v) <= 50):
            raise ValueError("Senha deve ter entre 4 e 50 caracteres.")
        return v

@router.post("/api/login")
def login(dados: UsuarioLogin, response: Response, request: Request):
    ip = request.client.host
    now = time.time()

    la = login_attempts.get(ip, {'count': 0, 'last_time': now})
    if la['count'] >= MAX_ATTEMPTS and (now - la['last_time'] < LOCK_MINUTES * 60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_ATTEMPTS,
                            detail="Muitas tentativas. Tente novamente em alguns minutos.")
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

    # sucesso
    login_attempts[ip] = {'count': 0, 'last_time': now}

    from datetime import timedelta
    token = criar_token({"sub": usuario.get("user_name")}, expires_delta=timedelta(minutes=30))
    response.set_cookie(key="session_token", value=token, httponly=True, max_age=30*60)

    # ⚠️ Converta ObjectId -> str
    # Determina a instituição válida:
    # - se o usuário tiver lista de instituições (multi), exija que a escolhida esteja na lista
    # - se o usuário tiver uma única (campo instituicao_id), aceite a escolhida se coincidir; senão force a dele
    inst_id_user = usuario.get("instituicao_id")
    if inst_id_user is not None:
        try:
            inst_id_user = str(inst_id_user)
        except Exception:
            inst_id_user = None

    insts_user = usuario.get("instituicoes_ids") or []
    insts_user = [str(x) for x in insts_user if x is not None]

    chosen = (dados.instituicao_id or "").strip()
    if insts_user:
        if not chosen or chosen not in insts_user:
            raise HTTPException(status_code=403, detail="Instituição não permitida para este usuário.")
        inst_final = chosen
    elif inst_id_user:
        # usuário de 1 instituição só: se o cliente mandou outra, ignore/force a dele
        inst_final = inst_id_user if not chosen or chosen == inst_id_user else inst_id_user
    else:
         # usuário sem instituição configurada (caso raro): aceite a escolhida se existir
        inst_exists = db["instituicao"].find_one({"_id": {"$in": [inst_id_user]}}) if chosen else None
        inst_final = chosen if inst_exists else None

    return {
        "id": str(usuario.get("_id")),
        "nome": usuario.get("nome"),
        "tipo_acesso": usuario.get("tipo_acesso"),
        "user_name": usuario.get("user_name"),
        "instituicao_id": inst_final
    }