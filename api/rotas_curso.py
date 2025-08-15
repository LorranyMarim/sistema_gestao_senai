from fastapi import APIRouter, HTTPException, Body, status
from pydantic import BaseModel, Field, conint, constr, validator
from enum import Enum
from typing import List, Optional, Union, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import re

from db import get_mongo_db

router = APIRouter()

# ========================= Enums (domínio) =========================
class TipoEnum(str, Enum):
    Presencial = "Presencial"
    EAD = "EAD"
    Semipresencial = "Semipresencial"

class NivelEnum(str, Enum):
    Tecnico = "Técnico"
    Aperfeicoamento = "Aperfeiçoamento"
    Qualificacao = "Qualificação"
    Especializacao = "Especialização"

class StatusEnum(str, Enum):
    Ativo = "Ativo"
    Inativo = "Inativo"

class CategoriaEnum(str, Enum):
    C = "C"
    A = "A"

class EixoEnum(str, Enum):
    TI = "TI"
    MetalMecanica = "Metal Mecânica"


# ========================= Submodelos UC =========================
class ModalidadeCarga(BaseModel):
    carga_horaria: conint(ge=0) = 0
    quantidade_aulas_45min: conint(ge=0) = 0
    dias_letivos: conint(ge=0) = 0

class OrdemUC(BaseModel):
    id: constr(min_length=1)
    unidade_curricular: constr(min_length=1)
    presencial: ModalidadeCarga = ModalidadeCarga()
    ead: ModalidadeCarga = ModalidadeCarga()


# ========================= Modelos Curso =========================
class CursoIn(BaseModel):
    instituicao_id: constr(min_length=1)
    # empresa pode ser 1 id (string) ou lista de ids
    empresa: Union[constr(min_length=1), List[constr(min_length=1)]]
    nome: constr(min_length=3, max_length=100)
    nivel_curso: NivelEnum
    tipo: TipoEnum
    status: StatusEnum = StatusEnum.Ativo
    categoria: CategoriaEnum
    eixo_tecnologico: EixoEnum
    carga_horaria: conint(ge=1)
    ordem_ucs: List[OrdemUC]
    observacao: Optional[constr(max_length=1000)] = None

    @validator("ordem_ucs")
    def _validar_ucs(cls, v: List[OrdemUC]):
        if not v or len(v) == 0:
            raise ValueError("Selecione ao menos 1 UC.")
        ids = [u.id for u in v]
        if len(set(ids)) != len(ids):
            raise ValueError("Existem UCs duplicadas na lista.")
        return v

# PUT recebe a mesma estrutura (frontend envia tudo),
# mas poderíamos aceitar parciais. Mantemos CursoIn para validação forte.
CursoUpdate = CursoIn


# ========================= Utils =========================
HEX24 = re.compile(r"^[0-9a-fA-F]{24}$")

def _to_obj_id(v: Any):
    """Converte string 24-hex para ObjectId; caso contrário, retorna o valor original."""
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and HEX24.match(v):
        return ObjectId(v)
    return v

def _strip_tags(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    # remove HTML simples e normaliza espaços
    s = re.sub(r"<[^>]*>", "", s or "")
    return re.sub(r"\s+", " ", s).strip()

def _normalize(doc: dict) -> dict:
    if not doc:
        return doc
    # _id -> str
    if isinstance(doc.get("_id"), ObjectId):
        doc["_id"] = str(doc["_id"])
    # instituicao_id -> str
    if isinstance(doc.get("instituicao_id"), ObjectId):
        doc["instituicao_id"] = str(doc["instituicao_id"])
    # empresa pode ser lista ou único
    if "empresa" in doc:
        if isinstance(doc["empresa"], list):
            doc["empresa"] = [str(x) for x in doc["empresa"]]
        elif isinstance(doc["empresa"], ObjectId):
            doc["empresa"] = str(doc["empresa"])
    # data_criacao -> ISO UTC string
    dt = doc.get("data_criacao")
    if isinstance(dt, datetime):
        doc["data_criacao"] = dt.astimezone(timezone.utc).isoformat()
    return doc


def _check_refs(db, curso: CursoIn) -> Dict[str, str]:
    """
    Verifica se instituicao_id, empresa(s) e cada UC existem.
    Retorna dict {campo: "mensagem"} com erros; vazio se ok.
    """
    errors: Dict[str, str] = {}

    # Instituição
    inst_id = _to_obj_id(curso.instituicao_id)
    if not db["instituicao"].find_one({"_id": inst_id}):
        errors["instituicao_id"] = "Instituição não encontrada."

    # Empresa(s) – aceitar único ou lista
    emp_val = curso.empresa
    emp_ids = emp_val if isinstance(emp_val, list) else [emp_val]
    for idx, e in enumerate(emp_ids):
        oid = _to_obj_id(e)
        if not db["empresa"].find_one({"_id": oid}):
            errors[f"empresa[{idx}]"] = "Empresa/Parceiro não encontrado."

    # UCs
    for idx, uc in enumerate(curso.ordem_ucs):
        oid = _to_obj_id(uc.id)
        if not db["unidade_curricular"].find_one({"_id": oid}):
            errors[f"ordem_ucs[{idx}].id"] = "UC não encontrada."

    return errors


def _conflict_exists(db, curso: CursoIn, exclude_id: Optional[str] = None) -> bool:
    """
    Conflito: mesmo nome + instituicao_id + categoria.
    Busca case-insensitive pelo nome.
    """
    filtro: Dict[str, Any] = {
        "instituicao_id": curso.instituicao_id,
        "categoria": curso.categoria.value,
    }
    nome_regex = {"$regex": f"^{re.escape(curso.nome)}$", "$options": "i"}
    filtro["nome"] = nome_regex

    if exclude_id and HEX24.match(exclude_id):
        filtro["_id"] = {"$ne": ObjectId(exclude_id)}

    return db["curso"].find_one(filtro) is not None


# ========================= Rotas =========================
@router.get("/api/cursos")
def listar_cursos():
    db = get_mongo_db()
    itens = list(db["curso"].find({}).sort([("data_criacao", -1), ("_id", -1)]))
    return [_normalize(x) for x in itens]


@router.post("/api/cursos", status_code=status.HTTP_201_CREATED)
def criar_curso(payload: dict = Body(...)):
    db = get_mongo_db()

    # Sanitização suave (strings)
    if "nome" in payload:
        payload["nome"] = _strip_tags(payload.get("nome"))
    if "observacao" in payload:
        payload["observacao"] = _strip_tags(payload.get("observacao"))
    if "categoria" in payload:
        payload["categoria"] = _strip_tags(payload.get("categoria"))
    if "eixo_tecnologico" in payload:
        payload["eixo_tecnologico"] = _strip_tags(payload.get("eixo_tecnologico"))
    if "tipo" in payload:
        payload["tipo"] = _strip_tags(payload.get("tipo"))
    if "nivel_curso" in payload:
        payload["nivel_curso"] = _strip_tags(payload.get("nivel_curso"))
    if "status" in payload:
        payload["status"] = _strip_tags(payload.get("status"))

    try:
        curso = CursoIn(**payload)
    except Exception as e:
        # pydantic já informa o campo
        raise HTTPException(status_code=422, detail=str(e))

    # Refs
    ref_errors = _check_refs(db, curso)
    if ref_errors:
        raise HTTPException(status_code=422, detail=ref_errors)

    # Duplicidade
    if _conflict_exists(db, curso):
        raise HTTPException(status_code=409, detail="Esta combinação de nome + instituição + categoria já existe.")

    data = curso.dict()

    # Garante que data_criacao seja definida pelo servidor (ignora a do cliente)
    data["data_criacao"] = datetime.now(timezone.utc)

    # Insere
    inserted = db["curso"].insert_one(data)
    saved = db["curso"].find_one({"_id": inserted.inserted_id})
    return _normalize(saved)


@router.put("/api/cursos/{id}")
def atualizar_curso(id: str, payload: dict = Body(...)):
    db = get_mongo_db()
    if not HEX24.match(id):
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    # Sanitização suave
    if "nome" in payload:
        payload["nome"] = _strip_tags(payload.get("nome"))
    if "observacao" in payload:
        payload["observacao"] = _strip_tags(payload.get("observacao"))

    # Nunca permitir alteração de data_criacao
    payload.pop("data_criacao", None)
    payload.pop("_id", None)

    try:
        curso = CursoUpdate(**payload)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Verifica existência do curso
    if not db["curso"].find_one({"_id": ObjectId(id)}):
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    # Refs
    ref_errors = _check_refs(db, curso)
    if ref_errors:
        raise HTTPException(status_code=422, detail=ref_errors)

    # Duplicidade (exclui o próprio id)
    if _conflict_exists(db, curso, exclude_id=id):
        raise HTTPException(status_code=409, detail="Esta combinação de nome + instituição + categoria já existe.")

    res = db["curso"].update_one({"_id": ObjectId(id)}, {"$set": curso.dict()})
    if res.matched_count:
        updated = db["curso"].find_one({"_id": ObjectId(id)})
        return _normalize(updated)
    raise HTTPException(status_code=404, detail="Curso não encontrado")


@router.delete("/api/cursos/{id}")
def deletar_curso(id: str):
    db = get_mongo_db()
    if not HEX24.match(id):
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    res = db["curso"].delete_one({"_id": ObjectId(id)})
    if res.deleted_count:
        return {"msg": "Removido com sucesso"}
    raise HTTPException(status_code=404, detail="Curso não encontrado")
