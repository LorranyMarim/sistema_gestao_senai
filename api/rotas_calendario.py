# api/rotas_calendario.py

from fastapi import APIRouter, HTTPException, Query
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, date

router = APIRouter()

def _as_str_id(doc):
    doc["_id"] = str(doc["_id"])
    if "id_empresa" in doc:
        doc["id_empresa"] = str(doc.get("id_empresa") or "")
    if "id_instituicao" in doc:
        doc["id_instituicao"] = str(doc.get("id_instituicao") or "")
    if "dias_nao_letivos" not in doc:
        doc["dias_nao_letivos"] = []
    return doc

# === NOVO: listar com paginação/filtros ===
@router.get("/api/calendarios")
def listar_calendarios(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    q: str | None = None,
    year: int | None = None,
    empresa_id: str | None = None,
    instituicao_id: str | None = None,
):
    db = get_mongo_db()
    filtro = {}

    # filtros por empresa / instituição
    if empresa_id:
      try:
        filtro["id_empresa"] = ObjectId(empresa_id)
      except:
        filtro["id_empresa"] = empresa_id  # caso esteja salvo como string
    if instituicao_id:
      try:
        filtro["id_instituicao"] = ObjectId(instituicao_id)
      except:
        filtro["id_instituicao"] = instituicao_id

    # filtro por ano (interseção de períodos)
    if year:
        inicio_ano = date(year, 1, 1).isoformat()
        fim_ano = date(year, 12, 31).isoformat()
        filtro["$and"] = [
            {"data_inicial": {"$lte": fim_ano}},
            {"data_final": {"$gte": inicio_ano}},
        ]

    # busca textual simples (nome/descricao/empresa_nome se salvo)
    if q:
        filtro["$or"] = [
            {"nome_calendario": {"$regex": q, "$options": "i"}},
            {"descricao": {"$regex": q, "$options": "i"}},
            {"empresa_nome": {"$regex": q, "$options": "i"}},  # opcional
        ]

    skip = (page - 1) * limit
    total = db["calendario"].count_documents(filtro)
    cursor = db["calendario"].find(filtro).skip(skip).limit(limit).sort("data_inicial", 1)

    items = [_as_str_id(x) for x in cursor]
    return {"items": items, "total": total, "page": page, "limit": limit}

# Adicionar novo calendário (igual ao seu)
@router.post("/api/calendarios")
def adicionar_calendario(calendario: dict):
    db = get_mongo_db()
    obrig = ["nome_calendario", "id_empresa", "data_inicial", "data_final"]
    if any(k not in calendario for k in obrig):
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(obrig)}")
    calendario["dias_nao_letivos"] = []
    result = db["calendario"].insert_one(calendario)
    calendario["_id"] = str(result.inserted_id)
    return calendario

# Editar (igual)
@router.put("/api/calendarios/{calendario_id}")
def editar_calendario(calendario_id: str, calendario: dict):
    db = get_mongo_db()
    result = db["calendario"].update_one(
        {"_id": ObjectId(calendario_id)},
        {"$set": calendario}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Calendário não encontrado")
    calendario["_id"] = calendario_id
    return calendario

# Excluir (igual)
@router.delete("/api/calendarios/{calendario_id}")
def excluir_calendario(calendario_id: str):
    db = get_mongo_db()
    result = db["calendario"].delete_one({"_id": ObjectId(calendario_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Calendário não encontrado")
    return {"msg": "Calendário excluído"}

# Adicionar evento (igual ao seu)
@router.post("/api/calendarios/adicionar_evento")
def adicionar_evento(evento: dict):
    db = get_mongo_db()
    obrig = ["calendarios_ids", "descricao", "data_inicial", "data_final"]
    if any(k not in evento for k in obrig):
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(obrig)}")

    data_ini = datetime.strptime(evento["data_inicial"], "%Y-%m-%d")
    data_fim = datetime.strptime(evento["data_final"], "%Y-%m-%d")
    dias = []
    dt = data_ini
    while dt <= data_fim:
        dias.append({"descricao": evento["descricao"], "data": dt.strftime("%Y-%m-%d")})
        dt += timedelta(days=1)

    for cal_id in evento["calendarios_ids"]:
        db["calendario"].update_one(
            {"_id": ObjectId(cal_id)},
            {"$push": {"dias_nao_letivos": {"$each": dias}}}
        )
    return {"msg": "Evento(s) adicionado(s) aos calendários selecionados."}

# Editar dia NL (mantido)
@router.put("/api/calendarios/{calendario_id}/editar_dia_nao_letivo")
def editar_dia_nao_letivo(calendario_id: str, payload: dict):
    db = get_mongo_db()
    db["calendario"].update_one(
        {"_id": ObjectId(calendario_id), "dias_nao_letivos.data": payload["data_original"]},
        {"$set": {"dias_nao_letivos.$.data": payload["data_nova"], "dias_nao_letivos.$.descricao": payload["descricao"]}}
    )
    return {"msg": "Dia não letivo editado."}

# Remover dia NL (mantido)
@router.delete("/api/calendarios/{calendario_id}/remover_dia_nao_letivo")
def remover_dia_nao_letivo(calendario_id: str, data: str):
    db = get_mongo_db()
    db["calendario"].update_one(
        {"_id": ObjectId(calendario_id)},
        {"$pull": {"dias_nao_letivos": {"data": data}}}
    )
    return {"msg": "Dia não letivo removido."}

# === NOVO: eventos por faixa de datas (para o FullCalendar) ===
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
    # Pega todos os calendários que intersectam o intervalo
    filtro = {
        "$and": [
            {"data_inicial": {"$lte": end}},
            {"data_final": {"$gte": start}},
        ]
    }
    calendarios = list(db["calendario"].find(filtro))
    out = []
    for cal in calendarios:
        cal_id = str(cal["_id"])
        nome = cal.get("nome_calendario", "")
        for d in cal.get("dias_nao_letivos", []) or []:
            data_d = d.get("data")
            if data_d and (start <= data_d <= end):
                out.append({
                    "calendario_id": cal_id,
                    "nome_calendario": nome,
                    "data": data_d,
                    "descricao": d.get("descricao", "")
                })
    return out
