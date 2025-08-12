# api/rotas_calendario.py

from fastapi import APIRouter, HTTPException, Query
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List

router = APIRouter()

# -------------------- Helpers --------------------
def _try_objectid(v: Optional[str]):
    """Tenta converter para ObjectId; se falhar, retorna o valor original."""
    if not isinstance(v, str) or not v:
        return v
    try:
        return ObjectId(v)
    except Exception:
        return v

def _id_both_types(v: Optional[str]):
    """Para consultas: faz $in com string (se existir) e ObjectId (se válido)."""
    if not v:
        return None
    vals = [v]
    try:
        vals.append(ObjectId(v))
    except Exception:
        pass
    return {"$in": vals}

def _id_filter(_id: str) -> Dict[str, Any]:
    """Monta filtro por _id compatível com str e ObjectId (para path param)."""
    try:
        return {"_id": ObjectId(_id)}
    except Exception:
        return {"_id": _id}

def _as_str_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normaliza documento para saída JSON (ids como string, arrays padrão, etc.)."""
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if "id_empresa" in doc:
        doc["id_empresa"] = str(doc.get("id_empresa") or "")
    if "id_instituicao" in doc:
        doc["id_instituicao"] = str(doc.get("id_instituicao") or "")
    if "dias_nao_letivos" not in doc or not isinstance(doc.get("dias_nao_letivos"), list):
        doc["dias_nao_letivos"] = []
    # FastAPI serializa datetime; ainda assim, se vier como datetime, garante isoformat.
    if isinstance(doc.get("data_criacao"), datetime):
        # ISO 8601 sem timezone (UTC); o front parseia normalmente.
        doc["data_criacao"] = doc["data_criacao"].isoformat()
    return doc

# -------------------- Listar com paginação/filtros --------------------
@router.get("/api/calendarios")
def listar_calendarios(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    q: Optional[str] = None,
    year: Optional[int] = None,
    # Aceita ambos os nomes para compat com o front/proxy:
    empresa_id: Optional[str] = None,
    id_empresa: Optional[str] = Query(None, alias="id_empresa"),
    instituicao_id: Optional[str] = None,
    id_instituicao: Optional[str] = Query(None, alias="id_instituicao"),
):
    db = get_mongo_db()
    filtro: Dict[str, Any] = {}

    emp = id_empresa or empresa_id
    inst = id_instituicao or instituicao_id

    # Filtro por empresa/instituição (compatível string/ObjectId)
    if emp:
        bf = _id_both_types(emp)
        if bf:
            filtro["id_empresa"] = bf
    if inst:
        bf = _id_both_types(inst)
        if bf:
            filtro["id_instituicao"] = bf

    # Filtro por ano (interseção de períodos)
    if year:
        inicio_ano = date(year, 1, 1).isoformat()
        fim_ano = date(year, 12, 31).isoformat()
        filtro.setdefault("$and", [])
        filtro["$and"].extend([
            {"data_inicial": {"$lte": fim_ano}},
            {"data_final": {"$gte": inicio_ano}},
        ])

    # Busca textual simples
    if q:
        filtro.setdefault("$or", []).extend([
            {"nome_calendario": {"$regex": q, "$options": "i"}},
            {"descricao": {"$regex": q, "$options": "i"}},
            {"empresa_nome": {"$regex": q, "$options": "i"}},  # se existir este campo
        ])

    skip = (page - 1) * limit
    total = db["calendario"].count_documents(filtro)
    cursor = (
        db["calendario"]
        .find(filtro)
        .skip(skip)
        .limit(limit)
        .sort("data_inicial", 1)
    )

    items = [_as_str_id(x) for x in cursor]
    return {"items": items, "total": total, "page": page, "limit": limit}

# -------------------- Adicionar novo calendário --------------------
@router.post("/api/calendarios")
def adicionar_calendario(calendario: Dict[str, Any]):
    db = get_mongo_db()
    obrig = ["nome_calendario", "id_empresa", "data_inicial", "data_final"]
    if any(k not in calendario for k in obrig):
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(obrig)}")

    # Converte referências para ObjectId quando possível (consistência)
    for k in ("id_empresa", "id_instituicao"):
        if k in calendario:
            calendario[k] = _try_objectid(calendario[k])

    # Proteções e defaults
    calendario["dias_nao_letivos"] = []
    calendario["data_criacao"] = datetime.utcnow()  # imutável

    result = db["calendario"].insert_one(calendario)
    calendario["_id"] = str(result.inserted_id)
    return _as_str_id(calendario)

# -------------------- Editar calendário --------------------
@router.put("/api/calendarios/{calendario_id}")
def editar_calendario(calendario_id: str, calendario: Dict[str, Any]):
    db = get_mongo_db()

    # Evita alteração do campo imutável
    calendario.pop("data_criacao", None)

    # Converte refs se vierem
    for k in ("id_empresa", "id_instituicao"):
        if k in calendario:
            calendario[k] = _try_objectid(calendario[k])

    result = db["calendario"].update_one(
        _id_filter(calendario_id),
        {"$set": calendario}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Calendário não encontrado")

    # Retorna payload normalizado
    atualizado = db["calendario"].find_one(_id_filter(calendario_id))
    if not atualizado:
        # fallback mínimo
        calendario["_id"] = calendario_id
        return calendario
    return _as_str_id(atualizado)

# -------------------- Excluir calendário --------------------
@router.delete("/api/calendarios/{calendario_id}")
def excluir_calendario(calendario_id: str):
    db = get_mongo_db()
    result = db["calendario"].delete_one(_id_filter(calendario_id))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Calendário não encontrado")
    return {"msg": "Calendário excluído"}

# -------------------- Adicionar evento (gera dias não letivos) --------------------
@router.post("/api/calendarios/adicionar_evento")
def adicionar_evento(evento: Dict[str, Any]):
    db = get_mongo_db()
    obrig = ["calendarios_ids", "descricao", "data_inicial", "data_final"]
    if any(k not in evento for k in obrig):
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(obrig)}")

    try:
        data_ini = datetime.strptime(evento["data_inicial"], "%Y-%m-%d")
        data_fim = datetime.strptime(evento["data_final"], "%Y-%m-%d")
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    if data_fim < data_ini:
        raise HTTPException(status_code=400, detail="Data final não pode ser anterior à data inicial.")

    dias: List[Dict[str, str]] = []
    dt = data_ini
    while dt <= data_fim:
        dias.append({"descricao": evento["descricao"], "data": dt.strftime("%Y-%m-%d")})
        dt += timedelta(days=1)

    for cal_id in evento["calendarios_ids"]:
        db["calendario"].update_one(
            _id_filter(str(cal_id)),
            {"$push": {"dias_nao_letivos": {"$each": dias}}}
        )

    return {"msg": "Evento(s) adicionado(s) aos calendários selecionados."}

# -------------------- Editar dia não letivo --------------------
@router.put("/api/calendarios/{calendario_id}/editar_dia_nao_letivo")
def editar_dia_nao_letivo(calendario_id: str, payload: Dict[str, Any]):
    db = get_mongo_db()
    req = ["data_original", "data_nova", "descricao"]
    if any(k not in payload for k in req):
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(req)}")

    result = db["calendario"].update_one(
        {**_id_filter(calendario_id), "dias_nao_letivos.data": payload["data_original"]},
        {"$set": {
            "dias_nao_letivos.$.data": payload["data_nova"],
            "dias_nao_letivos.$.descricao": payload["descricao"]
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dia não letivo não encontrado")
    return {"msg": "Dia não letivo editado."}

# -------------------- Remover dia não letivo --------------------
@router.delete("/api/calendarios/{calendario_id}/remover_dia_nao_letivo")
def remover_dia_nao_letivo(calendario_id: str, data: str):
    db = get_mongo_db()
    result = db["calendario"].update_one(
        _id_filter(calendario_id),
        {"$pull": {"dias_nao_letivos": {"data": data}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Calendário não encontrado")
    return {"msg": "Dia não letivo removido."}

# -------------------- Eventos por faixa (FullCalendar) --------------------
@router.get("/api/calendarios/eventos_range")
def eventos_range(start: str, end: str):
    """
    Retorna uma lista flat de eventos (dias não letivos) dentro do intervalo [start, end].
    Formato:
      [
        {"calendario_id": "...", "nome_calendario": "...", "data": "YYYY-MM-DD", "descricao": "..."},
        ...
      ]
    """
    db = get_mongo_db()

    # Calendários que intersectam a janela
    filtro = {
        "$and": [
            {"data_inicial": {"$lte": end}},
            {"data_final": {"$gte": start}},
        ]
    }
    calendarios = list(db["calendario"].find(filtro))

    out: List[Dict[str, Any]] = []
    for cal in calendarios:
        cal_id = str(cal["_id"])
        nome = cal.get("nome_calendario", "")
        for d in (cal.get("dias_nao_letivos") or []):
            data_d = d.get("data")
            if data_d and (start <= data_d <= end):
                out.append({
                    "calendario_id": cal_id,
                    "nome_calendario": nome,
                    "data": data_d,
                    "descricao": d.get("descricao", "")
                })
    return out
