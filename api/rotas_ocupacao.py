from fastapi import APIRouter, Depends, Query
from db import get_mongo_db
from auth_dep import get_ctx, RequestCtx
from typing import Optional, List

router = APIRouter()

@router.get("/api/ocupacao/instrutores")
def listar_ocupacao_instrutores(
    turno: Optional[str] = None,
    ctx: RequestCtx = Depends(get_ctx)
):
    db = get_mongo_db()
    
    # Filtro base: Status "Ativo" e Instituição do contexto
    filtro = {
        "status": "Ativo",
        "instituicao_id": ctx.inst_oid
    }
    
    # Filtro de Turno (se fornecido)
    # O campo 'turno' no banco é um array. O MongoDB busca automaticamente se a string está no array.
    if turno:
        filtro["turno"] = turno.capitalize()

    # Busca apenas os campos necessários
    cursor = db["instrutor"].find(filtro, {"nome": 1, "area": 1, "turno": 1}).sort("nome", 1)
    
    instrutores = []
    for ins in cursor:
        ins["_id"] = str(ins["_id"])
        # Garante que area seja uma lista para o frontend
        if "area" not in ins or not isinstance(ins["area"], list):
            ins["area"] = []
        instrutores.append(ins)
        
    return instrutores