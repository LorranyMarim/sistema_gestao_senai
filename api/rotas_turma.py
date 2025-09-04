from fastapi import APIRouter, HTTPException, Response, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from bson import ObjectId
from db import get_mongo_db
from datetime import datetime, timezone  

router = APIRouter(prefix="/api/turmas", tags=["Turmas"])

# --- helper novo ---
def _norm_status(val) -> bool:
    if val is None:
        return True
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ("ativo", "true", "1", "on", "yes", "sim"):
        return True
    if s in ("inativo", "false", "0", "off", "no", "nao", "não"):
        return False
    raise HTTPException(status_code=400, detail="Campo 'status' inválido")
# ===================== MODELOS =====================

class UnidadeCurricularTurma(BaseModel):
    id_uc: str
    id_instrutor: str
    data_inicio: str
    data_fim: str

class TurmaCreate(BaseModel):
    codigo: str
    id_curso: str
    data_inicio: str
    data_fim: str
    turno: str
    num_alunos: int
    id_instituicao: str
    id_calendario: str
    id_empresa: str
    status: Optional[str] = "Ativo"   # <- string
    eixo_tecnologico: Optional[str] = None
    nivel_curso: Optional[str] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    observacoes: Optional[str] = None
    unidades_curriculares: List[UnidadeCurricularTurma]

def _to_oid(value: str, field: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Campo '{field}' inválido")

def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialização enxuta para listagem (usada no /api/turmas)."""
    out = {
        "id": str(doc.get("_id")),
        "codigo": doc.get("codigo", ""),
        "data_inicio": doc.get("data_inicio", ""),
        "data_fim": doc.get("data_fim", ""),
        "turno": doc.get("turno", ""),
        "status": doc.get("status", True),
        "id_empresa": str(doc["id_empresa"]) if isinstance(doc.get("id_empresa"), ObjectId) else doc.get("id_empresa"),
        "id_curso": str(doc["id_curso"]) if isinstance(doc.get("id_curso"), ObjectId) else doc.get("id_curso"),
    }
    return out

def _serialize_full(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialização completa para /api/turmas/{id} (detalhe)."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for f in ["id_curso", "id_instituicao", "id_calendario", "id_empresa"]:
        if f in doc and isinstance(doc[f], ObjectId):
            doc[f] = str(doc[f])
    if "unidades_curriculares" in doc:
        for uc in doc["unidades_curriculares"]:
            for f in ["id_uc", "id_instrutor"]:
                if isinstance(uc.get(f), ObjectId):
                    uc[f] = str(uc[f])
    return doc

# ===================== ROTAS =====================
@router.post("/", status_code=201)
@router.post("", status_code=201, include_in_schema=False)   # aceita sem "/"
def criar_turma(turma: TurmaCreate):
    db = get_mongo_db()
    doc = turma.dict()



    # IDs para ObjectId
    doc["id_curso"]       = _to_oid(doc["id_curso"], "id_curso")
    doc["id_instituicao"] = _to_oid(doc["id_instituicao"], "id_instituicao")
    doc["id_calendario"]  = _to_oid(doc["id_calendario"], "id_calendario")
    doc["id_empresa"]     = _to_oid(doc["id_empresa"], "id_empresa")

    # UCs
    if not doc.get("unidades_curriculares"):
        raise HTTPException(status_code=400, detail="'unidades_curriculares' não pode ser vazio")
    for uc in doc["unidades_curriculares"]:
        uc["id_uc"] = _to_oid(uc["id_uc"], "unidades_curriculares[].id_uc")
        id_instr = uc.get("id_instrutor")
        if id_instr is None or str(id_instr).strip() == "":
            uc["id_instrutor"] = None
        else:
            uc["id_instrutor"] = _to_oid(id_instr, "unidades_curriculares[].id_instrutor")

    doc["data_hora_criacao"] = datetime.utcnow()
    res = db["turma"].insert_one(doc)
    return {"msg": "Turma cadastrada com sucesso", "id": str(res.inserted_id)}

@router.put("/{turma_id}")
@router.put("/{turma_id}/", include_in_schema=False)         # aceita "/"
def atualizar_turma(turma_id: str, turma: TurmaCreate):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    doc = turma.dict()

   

    doc["id_curso"]       = _to_oid(doc["id_curso"], "id_curso")
    doc["id_instituicao"] = _to_oid(doc["id_instituicao"], "id_instituicao")
    doc["id_calendario"]  = _to_oid(doc["id_calendario"], "id_calendario")
    doc["id_empresa"]     = _to_oid(doc["id_empresa"], "id_empresa")

    if not doc.get("unidades_curriculares"):
        raise HTTPException(status_code=400, detail="'unidades_curriculares' não pode ser vazio")
    for uc in doc["unidades_curriculares"]:
        uc["id_uc"] = _to_oid(uc["id_uc"], "unidades_curriculares[].id_uc")
        id_instr = uc.get("id_instrutor")
        if id_instr is None or str(id_instr).strip() == "":
            uc["id_instrutor"] = None
        else:
            uc["id_instrutor"] = _to_oid(id_instr, "unidades_curriculares[].id_instrutor")

    res = db["turma"].update_one({"_id": _id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {"msg": "Turma atualizada com sucesso", "id": turma_id}