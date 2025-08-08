from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from db import get_mongo_db

router = APIRouter(prefix="/api/turmas", tags=["Turmas"])

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
    unidades_curriculares: List[UnidadeCurricularTurma]

class TurmaOut(BaseModel):
    id: str
    codigo: str
    data_inicio: str
    data_fim: str
    id_empresa: Optional[str] = None

def _to_oid(value: str, field: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Campo '{field}' inválido")

def _serialize_full(doc):
    # Converte ObjectIds para string
    doc['id'] = str(doc.pop('_id'))
    for f in ['id_curso','id_instituicao','id_calendario','id_empresa']:
        if f in doc and isinstance(doc[f], ObjectId):
            doc[f] = str(doc[f])
    if 'unidades_curriculares' in doc:
        for uc in doc['unidades_curriculares']:
            for f in ['id_uc','id_instrutor']:
                if isinstance(uc.get(f), ObjectId):
                    uc[f] = str(uc[f])
    return doc

@router.post("/", status_code=201)
def criar_turma(turma: TurmaCreate):
    db = get_mongo_db()
    doc = turma.dict()

    doc['id_curso']       = _to_oid(doc['id_curso'], 'id_curso')
    doc['id_instituicao'] = _to_oid(doc['id_instituicao'], 'id_instituicao')
    doc['id_calendario']  = _to_oid(doc['id_calendario'], 'id_calendario')
    doc['id_empresa']     = _to_oid(doc['id_empresa'], 'id_empresa')

    for uc in doc['unidades_curriculares']:
        uc['id_uc']        = _to_oid(uc['id_uc'], 'unidades_curriculares[].id_uc')
        uc['id_instrutor'] = _to_oid(uc['id_instrutor'], 'unidades_curriculares[].id_instrutor')

    res = db['turma'].insert_one(doc)
    return {"msg": "Turma cadastrada com sucesso", "id": str(res.inserted_id)}

@router.get("/", response_model=List[TurmaOut])
def listar_turmas():
    db = get_mongo_db()
    cur = db['turma'].find({}, {"codigo":1, "data_inicio":1, "data_fim":1, "id_empresa":1})
    out = []
    for d in cur:
        out.append({
            "id": str(d["_id"]),
            "codigo": d.get("codigo",""),
            "data_inicio": d.get("data_inicio",""),
            "data_fim": d.get("data_fim",""),
            "id_empresa": str(d["id_empresa"]) if isinstance(d.get("id_empresa"), ObjectId) else d.get("id_empresa")
        })
    return out

@router.get("/{turma_id}")
def obter_turma(turma_id: str):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    doc = db['turma'].find_one({"_id": _id})
    if not doc:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return _serialize_full(doc)

@router.put("/{turma_id}")
def atualizar_turma(turma_id: str, turma: TurmaCreate):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    doc = turma.dict()

    doc['id_curso']       = _to_oid(doc['id_curso'], 'id_curso')
    doc['id_instituicao'] = _to_oid(doc['id_instituicao'], 'id_instituicao')
    doc['id_calendario']  = _to_oid(doc['id_calendario'], 'id_calendario')
    doc['id_empresa']     = _to_oid(doc['id_empresa'], 'id_empresa')
    for uc in doc['unidades_curriculares']:
        uc['id_uc']        = _to_oid(uc['id_uc'], 'unidades_curriculares[].id_uc')
        uc['id_instrutor'] = _to_oid(uc['id_instrutor'], 'unidades_curriculares[].id_instrutor')

    res = db['turma'].update_one({"_id": _id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {"msg": "Turma atualizada com sucesso", "id": turma_id}

@router.delete("/{turma_id}", status_code=204)
def excluir_turma(turma_id: str):
    db = get_mongo_db()
    _id = _to_oid(turma_id, "turma_id")
    res = db['turma'].delete_one({"_id": _id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return Response(status_code=204)
