# api/rotas_calendario.py

from fastapi import APIRouter, HTTPException, Query
from db import get_mongo_db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, date, timezone
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

def _norm_status(v: Optional[str]) -> str:
    """Normaliza o status para 'Ativo' ou 'Inativo' (default: 'Ativo')."""
    if not v:
        return "Ativo"
    s = str(v).strip().lower()
    if s in ("inativo", "inactive", "inact"):
        return "Inativo"
    return "Ativo"

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
    # status padrão para documentos antigos
    if not doc.get("status"):
        doc["status"] = "Ativo"
    # FastAPI serializa datetime; ainda assim, se vier como datetime, garante isoformat.
    if isinstance(doc.get("data_criacao"), datetime):
        # ISO 8601 UTC; o front parseia normalmente.
        doc["data_criacao"] = doc["data_criacao"].astimezone(timezone.utc).isoformat()
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
    status: Optional[str] = None,  # NOVO: filtro por status
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

    # Filtro por status
    if status is not None and status != "":
        filtro["status"] = _norm_status(status)

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

    # Normaliza/define status (padrão: Ativo)
    calendario["status"] = _norm_status(calendario.get("status"))

    # --- Gera sábados e domingos como dias não letivos ---
    try:
        ini = datetime.strptime(calendario["data_inicial"], "%Y-%m-%d").date()
        fim = datetime.strptime(calendario["data_final"], "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    if fim < ini:
        raise HTTPException(status_code=400, detail="Data final não pode ser anterior à data inicial.")

    dnl = []
    dt = ini
    while dt <= fim:
        wd = dt.weekday()           # Monday=0 ... Sunday=6
        if wd == 5:                 # sábado
            dnl.append({"data": dt.isoformat(), "descricao": "Sábado"})
        elif wd == 6:               # domingo
            dnl.append({"data": dt.isoformat(), "descricao": "Domingo"})
        dt += timedelta(days=1)

    calendario["dias_nao_letivos"] = dnl
    calendario["data_criacao"] = datetime.now(timezone.utc)  # imutável

    result = db["calendario"].insert_one(calendario)
    calendario["_id"] = str(result.inserted_id)
    return _as_str_id(calendario)

# -------------------- Editar calendário --------------------
@router.put("/api/calendarios/{calendario_id}")
def editar_calendario(calendario_id: str, calendario: Dict[str, Any]):
    db = get_mongo_db()

    # Evita alteração do campo imutável
    calendario.pop("data_criacao", None)

    # Normaliza status se vier no payload
    if "status" in calendario:
        calendario["status"] = _norm_status(calendario["status"])

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

    # validação do intervalo informado
    try:
        data_ini = datetime.strptime(evento["data_inicial"], "%Y-%m-%d")
        data_fim = datetime.strptime(evento["data_final"], "%Y-%m-%d")
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")
    if data_fim < data_ini:
        raise HTTPException(status_code=400, detail="Data final não pode ser anterior à data inicial.")

    # gera as datas do intervalo
    dias: List[Dict[str, str]] = []
    dt = data_ini
    while dt <= data_fim:
        dias.append({"descricao": evento["descricao"], "data": dt.strftime("%Y-%m-%d")})
        dt += timedelta(days=1)

    resumo = {"por_calendario": {}, "adicionados": [], "duplicados": [], "fora_periodo": []}

    for cal_id in evento["calendarios_ids"]:
        # lê período do calendário + datas já existentes
        doc = db["calendario"].find_one(
            _id_filter(str(cal_id)),
            {"data_inicial": 1, "data_final": 1, "dias_nao_letivos.data": 1}
        )
        if not doc:
            resumo["por_calendario"][str(cal_id)] = {"erro": "Calendário não encontrado"}
            continue

        di_cal = (doc.get("data_inicial") or "").strip()
        df_cal = (doc.get("data_final") or "").strip()
        if not di_cal or not df_cal:
            resumo["por_calendario"][str(cal_id)] = {"erro": "Calendário sem período definido"}
            continue

        # separa candidatos dentro do período e fora do período do calendário
        dentro = [d for d in dias if di_cal <= d["data"] <= df_cal]
        fora   = [d for d in dias if not (di_cal <= d["data"] <= df_cal)]

        existentes = {d.get("data") for d in (doc.get("dias_nao_letivos") or [])}
        novos = [d for d in dentro if d["data"] not in existentes]
        dups  = [d for d in dentro if d["data"] in existentes]

        if novos:
            db["calendario"].update_one(
                _id_filter(str(cal_id)),
                {"$push": {"dias_nao_letivos": {"$each": novos}}}
            )

        resumo["por_calendario"][str(cal_id)] = {
            "adicionados": [d["data"] for d in novos],
            "duplicados":  [d["data"] for d in dups],
            "fora_periodo":[d["data"] for d in fora],
        }
        resumo["adicionados"].extend([d["data"] for d in novos])
        resumo["duplicados"].extend([d["data"] for d in dups])
        resumo["fora_periodo"].extend([d["data"] for d in fora])

    resumo["adicionados"] = sorted(set(resumo["adicionados"]))
    resumo["duplicados"] = sorted(set(resumo["duplicados"]))
    resumo["fora_periodo"] = sorted(set(resumo["fora_periodo"]))
    resumo["msg"] = (
        "Algumas datas já existiam e foram ignoradas."
        if resumo["duplicados"] and not resumo["fora_periodo"]
        else ("Algumas datas estavam fora do período do calendário e foram ignoradas."
              if resumo["fora_periodo"] and not resumo["duplicados"]
              else ("Algumas datas já existiam e outras estavam fora do período; apenas as válidas foram adicionadas."
                    if (resumo["duplicados"] and resumo["fora_periodo"])
                    else "Evento(s) adicionado(s) aos calendários selecionados."))
    )
    return resumo

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
