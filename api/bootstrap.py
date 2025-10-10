import json, hashlib, time, asyncio
from fastapi import APIRouter, Depends, Request, Response
from auth_dep import get_ctx, RequestCtx, get_current_user
from db import get_mongo_db
import redis
from cache_utils import cached  # agora existe
from rotas_dashboard import _obter_metricas, _listar_alertas, _buscar_notificacoes
from datetime import datetime, timezone

router = APIRouter()
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def _etag_for(data: dict, version: str) -> str:
    h = hashlib.md5()
    h.update(version.encode())
    h.update(json.dumps(data, separators=(',',':'), ensure_ascii=False).encode('utf-8'))
    return f'W/"{h.hexdigest()}"'

def _build_bundle(db, inst_oid):
    proj_min = {"_id": 1, "nome": 1}  # ajuste por coleção
    cursos = [
        {"_id": str(x["_id"]), "nome": x.get("nome")}
        for x in db["curso"].find({"instituicao_id": inst_oid}, proj_min)
    ]
    ucs = [
        {"_id": str(x["_id"]), "descricao": x.get("descricao")}
        for x in db["unidade_curricular"].find({"instituicao_id": inst_oid}, {"_id":1,"descricao":1})
    ]
    instrutores = [
        {"_id": str(x["_id"]), "nome": x.get("nome"), "status": x.get("status")}
        for x in db["instrutor"].find({"instituicao_id": inst_oid}, {"_id":1,"nome":1,"status":1})
    ]
    # adicione empresas/calendários/turmas metadados conforme necessidade
    return {"cursos": cursos, "ucs": ucs, "instrutores": instrutores}

def _key_dashboard(user_id: int) -> str:
    return f"view:dashboard:{user_id}"

@router.get("/dashboard/bootstrap")
@cached(key_builder=lambda user: _key_dashboard(user.id), ttl=60)
async def dashboard_bootstrap(user=Depends(get_current_user)):
    m, a, n = await asyncio.gather(
        _obter_metricas(user.id),
        _listar_alertas(user.id),
        _buscar_notificacoes(user.id),
    )
    return {"metricas": m, "alertas": a, "notificacoes": n}

@router.get("/bootstrap")
def bootstrap(request: Request, response: Response, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    vkey = f"inst:{ctx.inst}:version"
    bkey = f"inst:{ctx.inst}:bootstrap"
    version = r.get(vkey) or "0"

    cached = r.get(bkey)
    if cached:
        bundle = json.loads(cached)
    else:
        bundle = _build_bundle(db, ctx.inst_oid)
        r.setex(bkey, 120, json.dumps(bundle, ensure_ascii=False))

    etag = _etag_for(bundle, version)
    inm = request.headers.get("if-none-match")
    if inm == etag:
        response.status_code = 304
        return

    response.headers["ETag"] = etag
    return bundle


# Em api/bootstrap.py

# ... (importações e código existentes) ...

def _build_uc_bundle(db):
    """
    Agrega todos os dados necessários para a tela de Gestão de Unidades Curriculares.
    """
    # 1. Busca todas as instituições, retornando apenas os campos necessários.
    instituicoes_cursor = db["instituicao"].find({}, {"_id": 1, "razao_social": 1, "nome": 1})
    instituicoes = [
        {
            "_id": str(inst["_id"]),
            "razao_social": inst.get("razao_social") or inst.get("nome") or "(Sem nome)"
        }
        for inst in instituicoes_cursor
    ]

    # 2. Busca todas as unidades curriculares, ordenando pelas mais recentes.
    #    A função _normalize_uc (helper) garante que os dados estejam limpos.
    ucs_cursor = db["unidade_curricular"].find({}).sort([("data_criacao", -1)])
    
    # Helper para normalizar cada documento de UC
    def _normalize_uc(doc):
        if not doc:
            return None
        if doc.get("_id"):
            doc["_id"] = str(doc["_id"])
        if doc.get("instituicao_id"):
            doc["instituicao_id"] = str(doc["instituicao_id"])
        if isinstance(doc.get("data_criacao"), datetime):
            doc["data_criacao"] = doc["data_criacao"].astimezone(timezone.utc).isoformat()
        return doc

    ucs = [_normalize_uc(uc) for uc in ucs_cursor]

    return {
        "instituicoes": instituicoes,
        "ucs": ucs
    }

@router.get("/gestao_ucs/bootstrap")
def gestao_ucs_bootstrap(db = Depends(get_mongo_db)):
    """
    Endpoint de bootstrap para a tela de Gestão de Unidades Curriculares.
    """
    # Importações necessárias para a função _build_uc_bundle
    bundle = _build_uc_bundle(db)
    return bundle