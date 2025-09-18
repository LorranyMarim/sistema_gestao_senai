import json, hashlib, time, asyncio
from fastapi import APIRouter, Depends, Request, Response
from auth_dep import get_ctx, RequestCtx, get_current_user
from db import get_mongo_db
import redis
from cache_utils import cached  # agora existe
from rotas_dashboard import _obter_metricas, _listar_alertas, _buscar_notificacoes


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
