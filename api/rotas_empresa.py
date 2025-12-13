from fastapi import APIRouter, HTTPException, Depends
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timezone
from auth_dep import get_ctx, RequestCtx

router = APIRouter()

def _normalize_empresa(doc):
    """Converte ObjectId para str e normaliza data_criacao para ISO-8601 (UTC)."""
    if not doc:
        return doc
    oid = doc.get("_id")
    if isinstance(oid, ObjectId):
        doc["_id"] = str(oid)

    # Normaliza instituicao_id caso tenha sido salvo como ObjectId
    inst = doc.get("instituicao_id")
    if isinstance(inst, ObjectId):
        doc["instituicao_id"] = str(inst)

    # Garante data_criacao serializada
    dt = doc.get("data_criacao")
    if isinstance(dt, datetime):
        doc["data_criacao"] = dt.astimezone(timezone.utc).isoformat()
    elif dt is None and isinstance(oid, ObjectId):
        # Fallback: usa a geração do ObjectId
        doc["data_criacao"] = oid.generation_time.astimezone(timezone.utc).isoformat()

    return doc

@router.get("/api/empresas")
def listar_empresas(ctx: RequestCtx = Depends(get_ctx)): # <--- Adicionado ctx
    """
    Lista apenas empresas da instituição logada.
    """
    db = get_mongo_db()
    col = db["empresa"]

    pipeline = [
        {"$match": {"instituicao_id": str(ctx.inst_oid)}}, # <--- FILTRO DE SEGURANÇA
        {
            "$addFields": {
                "sortKey": {
                    "$ifNull": ["$data_criacao", {"$toDate": "$_id"}]
                }
            }
        },
        {"$sort": {"sortKey": -1}},
        {"$project": {"sortKey": 0}}
    ]

    empresas = list(col.aggregate(pipeline))
    return [_normalize_empresa(e) for e in empresas]

@router.post("/api/empresas")
def adicionar_empresa(empresa: dict, ctx: RequestCtx = Depends(get_ctx)): # <--- Adicionado ctx
    """
    Cria empresa vinculada à instituição do usuário logado.
    """
    db = get_mongo_db()
    
    # Removemos a obrigatoriedade de 'instituicao_id' vir do cliente, pois nós vamos injetar
    if "razao_social" not in empresa or "cnpj" not in empresa:
        raise HTTPException(status_code=400, detail="Campos obrigatórios: razao_social, cnpj")

    # SEGURANÇA: Força a instituição do token
    empresa["instituicao_id"] = str(ctx.inst_oid)

    # ignora qualquer data_criacao enviada pelo cliente
    empresa.pop("data_criacao", None)
    empresa["data_criacao"] = datetime.now(timezone.utc)

    result = db["empresa"].insert_one(empresa)
    saved = db["empresa"].find_one({"_id": result.inserted_id})
    return _normalize_empresa(saved)

@router.put("/api/empresas/{empresa_id}")
def editar_empresa(empresa_id: str, empresa: dict, ctx: RequestCtx = Depends(get_ctx)): # <--- Adicionado ctx
    db = get_mongo_db()
    empresa = dict(empresa or {})
    
    # Impede alterar metadados e mover de instituição
    empresa.pop("data_criacao", None)
    empresa.pop("_id", None)
    empresa.pop("instituicao_id", None) # Não permite mudar a empresa de unidade

    # SEGURANÇA: Só atualiza se o ID existir E pertencer à instituição logada
    result = db["empresa"].update_one(
        {"_id": ObjectId(empresa_id), "instituicao_id": str(ctx.inst_oid)},
        {"$set": empresa}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado")

    updated = db["empresa"].find_one({"_id": ObjectId(empresa_id)})
    return _normalize_empresa(updated)

@router.delete("/api/empresas/{empresa_id}")
def excluir_empresa(empresa_id: str, ctx: RequestCtx = Depends(get_ctx)): # <--- Adicionado ctx
    db = get_mongo_db()
    
    # SEGURANÇA: Só deleta se pertencer à instituição
    result = db["empresa"].delete_one(
        {"_id": ObjectId(empresa_id), "instituicao_id": str(ctx.inst_oid)}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado")
    return {"msg": "Empresa excluída"}