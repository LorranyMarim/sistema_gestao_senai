from fastapi import APIRouter, HTTPException, Response, Request, status, Depends
from db import get_mongo_db
from auth import verificar_senha, get_password_hash
from auth_utils import criar_token
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from bson.errors import InvalidId
from auth_dep import get_ctx, RequestCtx
from cache_utils import invalidate_cache
from redis_client import get_redis

router = APIRouter()

LOCK_MINUTES = 5
MAX_ATTEMPTS = 5

# --- Modelos Pydantic ---

class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=3, description="Nome Completo")
    user_name: EmailStr = Field(..., description="Email FIEMG (Login)")
    tipo_acesso: Literal['Coordenador', 'Pedagogo', 'Administrador', 'Instrutor']
    status: Literal['Ativo', 'Inativo'] = 'Ativo'

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3)
    user_name: Optional[EmailStr] = None
    tipo_acesso: Optional[Literal['Coordenador', 'Pedagogo', 'Administrador', 'Instrutor']] = None
    status: Optional[Literal['Ativo', 'Inativo']] = None

class UsuarioSenhaUpdate(BaseModel):
    nova_senha: str = Field(..., min_length=6)

class UsuarioLogin(BaseModel):
    user_name: EmailStr
    senha: str
    instituicao_id: Optional[str] = None

# --- Funções Auxiliares ---

def _oid_or_400(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="ID inválido")

# --- Rotas de Autenticação ---

@router.post("/api/logout")
def api_logout(response: Response):
    """
    Remove o cookie de sessão para efetuar logout.
    """
    response.delete_cookie("session_token", path="/") 
    return {"ok": True}

@router.post("/api/login")
def login(dados: UsuarioLogin, response: Response, request: Request):
    """
    Autentica o usuário, verifica bloqueios e status 'Ativo'.
    """
    ip = request.client.host
    r = get_redis()
    
    # Chaves para controle de Brute Force no Redis
    key_attempts = f"login_attempts:{ip}"
    key_blocked = f"login_blocked:{ip}"

    # 1. Verifica se o IP está bloqueado temporariamente
    if r.exists(key_blocked):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas. Tente novamente em {LOCK_MINUTES} minutos."
        )

    db = get_mongo_db()
    usuario = db["usuario"].find_one({"user_name_lc": dados.user_name.lower()})

    # Função local para registrar falhas
    def registrar_falha():
        attempts = r.incr(key_attempts)
        if attempts == 1:
            r.expire(key_attempts, 3600) # Expira contagem em 1h
            
        if attempts >= MAX_ATTEMPTS:
            r.setex(key_blocked, LOCK_MINUTES * 60, "blocked")
            r.delete(key_attempts)
    
    erro_credenciais = HTTPException(status_code=401, detail="Usuário ou senha incorretos.")
    
    # 2. Validação de Credenciais (Senha)
    hash_salvo = (usuario or {}).get("senha")
    if not usuario or not hash_salvo or not verificar_senha(dados.senha, hash_salvo):
        registrar_falha() 
        raise erro_credenciais
    
    # 3. Limpa tentativas se login for bem-sucedido
    r.delete(key_attempts)
    r.delete(key_blocked)

    # 4. Verifica se o usuário está Ativo
    status_user = usuario.get("status", "Ativo")
    if status_user != "Ativo":
        raise HTTPException(
            status_code=403, 
            detail="Usuário inativado na plataforma. Entre em contato com o administrador."
        )

    # 5. Lógica de Seleção de Instituição (Multi-tenancy)
    inst_id_user = str(usuario.get("instituicao_id")) if usuario.get("instituicao_id") else None
    insts_user = [str(x) for x in (usuario.get("instituicoes_ids") or []) if x]

    chosen = (dados.instituicao_id or "").strip()
    inst_final = None

    if insts_user:
        if chosen:
            if chosen not in insts_user:
                raise HTTPException(status_code=403, detail="Instituição não permitida para este usuário.")
            inst_final = chosen
        else:
            if len(insts_user) == 1:
                inst_final = insts_user[0]
            else:
                 raise HTTPException(status_code=403, detail="Selecione uma instituição válida.")
                 
    elif inst_id_user:
        if chosen and chosen != inst_id_user:
             raise HTTPException(status_code=403, detail="Instituição não permitida.")
        inst_final = inst_id_user
    else:
        if not chosen:
            raise HTTPException(status_code=403, detail="Selecione uma instituição válida.")
        if not db["instituicao"].find_one({"_id": _oid_or_400(chosen)}):
             raise HTTPException(status_code=400, detail="Instituição inválida.")
        inst_final = chosen

    # 6. Criação do Token de Sessão
    token = criar_token(
        {
            "sub": usuario.get("user_name"),
            "inst": inst_final
        }, 
        expires_delta=timedelta(minutes=30)
    )
    
    response.set_cookie(
        key="session_token", 
        value=token, 
        httponly=True, 
        max_age=30*60, 
        samesite="lax",
    )

    return {
        "id": str(usuario.get("_id")),
        "nome": usuario.get("nome"),
        "tipo_acesso": usuario.get("tipo_acesso"),
        "user_name": usuario.get("user_name"),
        "instituicao_id": inst_final,
        "token": token 
    }

# --- Rotas de Usuários (CRUD) ---

@router.get("/api/usuarios")
def listar_usuarios(ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    filtro = {
        "$or": [
            {"instituicao_id": ctx.inst_oid}, 
            {"instituicoes_ids": str(ctx.inst_oid)}
        ]
    }
    cursor = db["usuario"].find(filtro, {"senha": 0}).sort("nome", 1)
    usuarios = []
    for u in cursor:
        u["_id"] = str(u["_id"])
        if "instituicao_id" in u:
            u["instituicao_id"] = str(u["instituicao_id"])
        if u.get("data_criacao"):
            if isinstance(u["data_criacao"], datetime):
                u["data_criacao"] = u["data_criacao"].isoformat()
        usuarios.append(u)
    return usuarios

@router.post("/api/usuarios", status_code=201)
def criar_usuario(usuario: UsuarioCreate, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    if db["usuario"].find_one({"user_name_lc": usuario.user_name.lower()}):
        raise HTTPException(status_code=400, detail="E-mail já está sendo utilizado.")

    novo_usuario = usuario.dict()
    novo_usuario["user_name_lc"] = usuario.user_name.lower()
    novo_usuario["senha"] = get_password_hash(usuario.senha)
    novo_usuario["instituicao_id"] = ctx.inst_oid
    novo_usuario["instituicoes_ids"] = [str(ctx.inst_oid)]
    novo_usuario["data_criacao"] = datetime.now(timezone.utc)
    
    result = db["usuario"].insert_one(novo_usuario)
    invalidate_cache(str(ctx.inst_oid))
    
    return {"_id": str(result.inserted_id), "msg": "Usuário salvo com sucesso"}

@router.put("/api/usuarios/{user_id}")
def atualizar_usuario(user_id: str, dados: UsuarioUpdate, ctx: RequestCtx = Depends(get_ctx)):
    oid = _oid_or_400(user_id)
    db = get_mongo_db()
    filtro_seguranca = {
        "_id": oid,
        "$or": [
            {"instituicao_id": ctx.inst_oid},
            {"instituicoes_ids": str(ctx.inst_oid)}
        ]
    }

    if not db["usuario"].find_one(filtro_seguranca):
        raise HTTPException(status_code=404, detail="Usuário não encontrado ou acesso negado.")

    campos_update = {k: v for k, v in dados.dict().items() if v is not None}
    
    if "user_name" in campos_update:
        novo_email = campos_update["user_name"]
        existente = db["usuario"].find_one({
            "user_name_lc": novo_email.lower(), 
            "_id": {"$ne": oid}
        })
        if existente:
             raise HTTPException(status_code=400, detail="E-mail já está sendo utilizado.")
        campos_update["user_name_lc"] = novo_email.lower()

    if campos_update:
        db["usuario"].update_one({"_id": oid}, {"$set": campos_update})
        invalidate_cache(str(ctx.inst_oid))

    return {"msg": "Usuário atualizado com sucesso"}

@router.patch("/api/usuarios/{user_id}/senha")
def alterar_senha(user_id: str, dados: UsuarioSenhaUpdate, ctx: RequestCtx = Depends(get_ctx)):
    oid = _oid_or_400(user_id)
    db = get_mongo_db()
    filtro_seguranca = {
        "_id": oid,
        "$or": [
            {"instituicao_id": ctx.inst_oid},
            {"instituicoes_ids": str(ctx.inst_oid)}
        ]
    }
    
    if not db["usuario"].find_one(filtro_seguranca):
        raise HTTPException(status_code=404, detail="Usuário não encontrado ou acesso negado.")

    nova_senha_hash = get_password_hash(dados.nova_senha)
    db["usuario"].update_one({"_id": oid}, {"$set": {"senha": nova_senha_hash}})
    
    return {"msg": "Senha alterada com sucesso"}