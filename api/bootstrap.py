import json, hashlib, time
from fastapi import APIRouter, Depends, Request, Response
from auth_dep import get_ctx, RequestCtx
from db import get_mongo_db
import redis

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

@router.get("/api/bootstrap")
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
        r.setex(bkey, 120, json.dumps(bundle, ensure_ascii=False))  # TTL 120s

    etag = _etag_for(bundle, version)
    inm = request.headers.get("if-none-match")
    if inm == etag:
        response.status_code = 304
        return

    response.headers["ETag"] = etag
    return bundle
