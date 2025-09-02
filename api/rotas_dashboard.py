# rotas_dashboard.py
from fastapi import APIRouter
from db import get_mongo_db
import unicodedata

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ==============================
# Helpers (mantidos para uso local)
# ==============================
def _normalize_status(v) -> str:
    """Normaliza status para 'Ativo' | 'Inativo' | '—' (espelha lógica do frontend)."""
    if v is None or v == "":
        return "—"
    if isinstance(v, bool):
        return "Ativo" if v else "Inativo"
    t = str(v).strip().lower()
    if t in ["ativo", "ativa", "true", "1"]:
        return "Ativo"
    if t in ["inativo", "inativa", "false", "0"]:
        return "Inativo"
    return t.capitalize()

def _strip_accents_lower(s: str) -> str:
    s = s or ""
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return s.lower().strip()

# ==============================
# Endpoints existentes — inalterados
# ==============================
@router.get("/metrics")
def dashboard_metrics():
    """
    Retorna métricas agregadas para o dashboard:
    - total_turmas
    - total_alunos (soma num_alunos)
    - turmas_ativas (status=True OU 'ativo/ativa/true/1' - case-insensitive)
    - turmas_incompletas (qtd total de UCs, em todas as turmas, que estão sem id_instrutor)
    """
    db = get_mongo_db()
    coll = db["turma"]

    # --- total de turmas ---
    total_turmas = coll.count_documents({})

    # --- soma de alunos ---
    ag_total_alunos = list(
        coll.aggregate([
            {"$group": {"_id": None, "soma": {"$sum": {"$ifNull": ["$num_alunos", 0]}}}}
        ])
    )
    total_alunos = int(ag_total_alunos[0]["soma"]) if ag_total_alunos else 0

    # --- turmas ativas ---
    turmas_ativas = coll.count_documents({
        "$or": [
            {"status": True},
            {"status": {"$regex": r"^(ativo|ativa|true|1)$", "$options": "i"}}
        ]
    })

    # --- UCs sem instrutor (turmas_incompletas) ---
    ag_incompletas = list(
        coll.aggregate([
            {"$unwind": {"path": "$unidades_curriculares", "preserveNullAndEmptyArrays": False}},
            {"$match": {
                "$or": [
                    {"unidades_curriculares.id_instrutor": {"$exists": False}},
                    {"unidades_curriculares.id_instrutor": None},
                    {"unidades_curriculares.id_instrutor": ""},
                ]
            }},
            {"$count": "qtd"}
        ])
    )
    turmas_incompletas = int(ag_incompletas[0]["qtd"]) if ag_incompletas else 0

    return {
        "total_turmas": total_turmas,
        "total_alunos": total_alunos,
        "turmas_ativas": turmas_ativas,
        "turmas_incompletas": turmas_incompletas,
    }

@router.get("/alunos_por_turno")
def alunos_por_turno():
    """
    Soma de alunos (num_alunos) por turno (Manhã, Tarde, Noite),
    considerando apenas turmas ativas (status=Ativo/Ativa, case-insensitive).
    Aceita variações de turno como 'manhã'/'manha', 'tarde', 'noite'/'noturno'.
    """
    db = get_mongo_db()
    coll = db["turma"]

    # Agrupa por (turno, status) e soma num_alunos com conversão segura
    ag = list(
        coll.aggregate([
            {
                "$group": {
                    "_id": {"turno": "$turno", "status": "$status"},
                    "total_alunos": {
                        "$sum": {
                            "$convert": {
                                "input": "$num_alunos",
                                "to": "int",
                                "onError": 0,
                                "onNull": 0
                            }
                        }
                    }
                }
            }
        ])
    )

    result = {"Manhã": 0, "Tarde": 0, "Noite": 0}

    for row in ag:
        _id = row.get("_id") or {}
        turno_raw = _id.get("turno") or ""
        status_raw = _id.get("status") or ""

        # Considera apenas turmas ativas
        if _normalize_status(status_raw) != "Ativo":
            continue

        turno_norm = _strip_accents_lower(turno_raw)
        total = int(row.get("total_alunos", 0) or 0)

        if "manh" in turno_norm:              # 'manhã' e 'manha'
            result["Manhã"] += total
        elif "tarde" in turno_norm:
            result["Tarde"] += total
        elif "noite" in turno_norm or "noturn" in turno_norm:  # 'noite'/'noturno'
            result["Noite"] += total

    return result

# ==============================
# Pie chart por eixo_tecnologico (lookup em _id e filtro de status normalizado)
# ==============================
@router.get("/eixos_tecnologicos_pie")
def eixos_tecnologicos_pie():
    """
    Pie: quantidade de TURMAS por eixo_tecnologico, considerando apenas turmas ATIVAS.
    - turma.id_curso: ObjectId
    - curso._id: ObjectId
    - curso.eixo_tecnologico: string (rótulo da área)
    """
    db = get_mongo_db()
    turma = db["turma"]

    pipeline = [
        # 0) Normaliza status (trim + lower)
        {"$addFields": {
            "status_norm": {
                "$toLower": {
                    "$trim": { "input": { "$toString": "$status" } }
                }
            }
        }},
        # 1) Só turmas ativas (True OU ativo/ativa/true/1 — em minúsculas)
        {"$match": {
            "$or": [
                {"status": True},
                {"status_norm": {"$in": ["ativo", "ativa", "true", "1"]}}
            ]
        }},
        # 2) Lookup direto por ObjectId (id_curso ↔ _id)
        {"$lookup": {
            "from": "curso",
            "localField": "id_curso",
            "foreignField": "_id",
            "as": "curso"
        }},
        # 3) Exige curso resolvido
        {"$unwind": {"path": "$curso", "preserveNullAndEmptyArrays": False}},
        # 4) Agrupa por eixo_tecnologico contando TURMAS
        {"$group": {
            "_id": {"$ifNull": ["$curso.eixo_tecnologico", "(Sem eixo)"]},
            "qtd_turmas": {"$sum": 1}
        }},
        {"$sort": {"qtd_turmas": -1, "_id": 1}}
    ]

    ag = list(turma.aggregate(pipeline))
    labels = [row["_id"] for row in ag]
    data = [int(row["qtd_turmas"]) for row in ag]
    return {"labels": labels, "data": data}

@router.get("/eixos_tecnologicos")
def eixos_tecnologicos():
    """
    Retorna {labels: [...], data: [...]} para o gráfico de pizza por eixo_tecnologico,
    considerando apenas turmas ATIVAS (True | 'ativo' | 'ativa' | 'true' | '1').
    Métrica: quantidade de TURMAS por eixo.
    """
    db = get_mongo_db()
    turma = db["turma"]

    pipeline = [
        # Normaliza status (trim + lower) e filtra ATIVAS
        {"$addFields": {
            "status_norm": {
                "$toLower": {
                    "$trim": { "input": { "$toString": "$status" } }
                }
            }
        }},
        {"$match": {
            "$or": [
                {"status": True},
                {"status_norm": {"$in": ["ativo", "ativa", "true", "1"]}}
            ]
        }},
        # Lookup correto: id_curso (ObjectId) -> curso._id (ObjectId)
        {"$lookup": {
            "from": "curso",
            "localField": "id_curso",
            "foreignField": "_id",
            "as": "curso"
        }},
        {"$unwind": {"path": "$curso", "preserveNullAndEmptyArrays": False}},
        {"$group": {
            "_id": {"$ifNull": ["$curso.eixo_tecnologico", "(Sem eixo)"]},
            "qtd_turmas": {"$sum": 1}
        }},
        {"$sort": {"qtd_turmas": -1, "_id": 1}}
    ]

    ag = list(turma.aggregate(pipeline))
    return {"labels": [r["_id"] for r in ag], "data": [int(r["qtd_turmas"]) for r in ag]}
