from fastapi import APIRouter, Depends, Response
from db import get_mongo_db
from auth_dep import get_ctx, RequestCtx
from cache_utils import get_version_hash

router = APIRouter()

@router.get("/api/bootstrap")
def get_bootstrap_data(response: Response, ctx: RequestCtx = Depends(get_ctx)):
    db = get_mongo_db()
    inst_str = str(ctx.inst_oid) # ID como string para buscas que usam string
    inst_oid = ctx.inst_oid      # ID como ObjectId para buscas que usam ObjectId

    # 1. Controle de Cache (ETag e Headers)
    version = get_version_hash(inst_str)
    
    # Diz ao navegador: "Pode fazer cache, mas valide comigo antes de usar (no-cache)"
    # Se o dado não mudou, o navegador nem precisaria baixar o JSON de novo, 
    # mas aqui estamos forçando atualização controlada pelo ETag.
    response.headers["Cache-Control"] = "no-cache, must-revalidate"
    response.headers["ETag"] = version

    # 2. Buscas Otimizadas (Projeção: Apenas ID e Nome)
    # Payload reduzido drasticamente (de KBs para Bytes)
    
    # Cursos (Usa String no ID)
    cursos = list(db["curso"].find(
        {"instituicao_id": inst_str, "status": "Ativo"}, 
        {"_id": 1, "nome": 1} # <--- PROJEÇÃO: Só traz o necessário
    ).sort("nome", 1))

    # Instrutores (Usa String no ID)
    instrutores = list(db["instrutor"].find(
        {"instituicao_id": inst_str, "status": "Ativo"}, 
        {"_id": 1, "nome": 1}
    ).sort("nome", 1))

    # UCs (Usa String no ID)
    ucs = list(db["unidade_curricular"].find(
        {"instituicao_id": inst_str, "status": "Ativa"}, 
        {"_id": 1, "descricao": 1} # Front costuma usar 'descricao' ou 'nome'
    ).sort("descricao", 1))

    # Calendários (Usa ObjectId no ID)
    calendarios = list(db["calendario"].find(
        {"id_instituicao": inst_oid}, # status pode não existir em cal antigos
        {"_id": 1, "nome_calendario": 1}
    ).sort("nome_calendario", 1))

    # 3. Formatação Leve
    return {
        "version": version,
        "cursos": [{"id": str(c["_id"]), "nome": c.get("nome")} for c in cursos],
        "instrutores": [{"id": str(c["_id"]), "nome": c.get("nome")} for c in instrutores],
        "unidades_curriculares": [{"id": str(c["_id"]), "nome": c.get("descricao")} for c in ucs],
        "calendarios": [{"id": str(c["_id"]), "nome": c.get("nome_calendario")} for c in calendarios],
        "user": {
            "id": ctx.user_id,
            "inst_id": inst_str
        }
    }