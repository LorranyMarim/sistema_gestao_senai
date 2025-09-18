# rotas_dashboard.py
import asyncio
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
def _svc_dashboard_metrics(db):
    coll = db["turma"]

    total_turmas = coll.count_documents({})

    ag_total_alunos = list(
        coll.aggregate([
            {"$group": {"_id": None, "soma": {"$sum": {"$ifNull": ["$num_alunos", 0]}}}}
        ])
    )
    total_alunos = int(ag_total_alunos[0]["soma"]) if ag_total_alunos else 0

    turmas_ativas = coll.count_documents({
        "$or": [
            {"status": True},
            {"status": {"$regex": r"^(ativo|ativa|true|1)$", "$options": "i"}}
        ]
    })

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

def _svc_alunos_por_turno(db):
    coll = db["turma"]

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

        if _normalize_status(status_raw) != "Ativo":
            continue

        turno_norm = _strip_accents_lower(turno_raw)
        total = int(row.get("total_alunos", 0) or 0)

        if "manh" in turno_norm:
            result["Manhã"] += total
        elif "tarde" in turno_norm:
            result["Tarde"] += total
        elif "noite" in turno_norm or "noturn" in turno_norm:
            result["Noite"] += total

    return result

def _svc_areas_tecnologicas(db):
    turma = db["turma"]
    pipeline = [
        {"$addFields": {
            "status_norm": {
                "$toLower": {"$trim": { "input": { "$toString": "$status" } }}
            }
        }},
        {"$match": {
            "$or": [
                {"status": True},
                {"status_norm": {"$in": ["ativo", "ativa", "true", "1"]}}
            ]
        }},
        {"$lookup": {
            "from": "curso",
            "localField": "id_curso",
            "foreignField": "_id",
            "as": "curso"
        }},
        {"$unwind": {"path": "$curso", "preserveNullAndEmptyArrays": False}},
        {"$group": {
            "_id": {"$ifNull": ["$curso.area_tecnologica", "(Sem área)"]},
            "qtd_turmas": {"$sum": 1}
        }},
        {"$sort": {"qtd_turmas": -1, "_id": 1}}
    ]
    ag = list(turma.aggregate(pipeline))
    return {"labels": [r["_id"] for r in ag], "data": [int(r["qtd_turmas"]) for r in ag]}

# =======================================
# Endpoints existentes — agora reusam svc
# =======================================
@router.get("/metrics")
def dashboard_metrics():
    db = get_mongo_db()
    return _svc_dashboard_metrics(db)

@router.get("/alunos_por_turno")
def alunos_por_turno():
    db = get_mongo_db()
    return _svc_alunos_por_turno(db)

@router.get("/areas_tecnologicas_pie")
def areas_tecnologicas_pie():
    db = get_mongo_db()
    return _svc_areas_tecnologicas(db)

@router.get("/areas_tecnologicas")
def areas_tecnologicas():
    db = get_mongo_db()
    return _svc_areas_tecnologicas(db)

# =======================================
# Funções usadas pelo /dashboard/bootstrap
# =======================================
async def _obter_metricas(user_id: str):
    """
    Agrega tudo que o front precisa para os cards e gráficos do dashboard
    em UMA chamada: cards + alunos_por_turno + areas_tecnologicas.
    """
    db = get_mongo_db()
    cards, por_turno, por_area = await asyncio.gather(
        asyncio.to_thread(_svc_dashboard_metrics, db),
        asyncio.to_thread(_svc_alunos_por_turno, db),
        asyncio.to_thread(_svc_areas_tecnologicas, db),
    )
    return {
        "cards": cards,
        "alunos_por_turno": por_turno,
        "areas_tecnologicas": por_area
    }

async def _listar_alertas(user_id: str):
    # placeholder simples; quando quiser pode montar regras reais
    return []

async def _buscar_notificacoes(user_id: str):
    return []