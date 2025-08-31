# models.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UsuarioLogin(BaseModel):
    user_name: str = Field(..., min_length=4, max_length=50, example="admin")
    senha: str = Field(..., min_length=4, max_length=50, example="1234")

class Usuario(BaseModel):
    id: Optional[str] = None
    user_name: str = Field(..., min_length=4, max_length=50)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    senha: str = Field(..., min_length=4)
    tipo: str = Field(..., regex=r'^(admin|instrutor|coordenador)$')
    ativo: bool = True
    data_criacao: Optional[datetime] = None

class Curso(BaseModel):
    id: Optional[str] = None
    nome: str = Field(..., min_length=2, max_length=200)
    nivel: str = Field(..., regex=r'^(tecnico|superior|pos_graduacao|qualificacao)$')
    tipo: str = Field(..., regex=r'^(presencial|ead|hibrido)$')
    status: str = Field(..., regex=r'^(ativo|inativo|planejamento)$')
    categoria: str
    eixo_tecnologico: str
    carga_horaria: int = Field(..., gt=0)
    instituicao_id: str
    empresa_id: Optional[str] = None
    ucs: List[str] = []
    data_criacao: Optional[datetime] = None

class Empresa(BaseModel):
    id: Optional[str] = None
    nome: str = Field(..., min_length=2, max_length=200)
    cnpj: str = Field(..., regex=r'^\d{14}$')
    endereco: str
    telefone: str
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    contato_responsavel: str
    tipo_parceria: str = Field(..., regex=r'^(convenio|contrato|parceria)$')
    ativo: bool = True
    data_criacao: Optional[datetime] = None

class Instrutor(BaseModel):
    id: Optional[str] = None
    nome: str = Field(..., min_length=2, max_length=200)
    cpf: str = Field(..., regex=r'^\d{11}$')
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    telefone: str
    especializacoes: List[str] = []
    carga_horaria_maxima: int = Field(..., gt=0, le=40)
    ativo: bool = True
    data_criacao: Optional[datetime] = None

class UnidadeCurricular(BaseModel):
    id: Optional[str] = None
    nome: str = Field(..., min_length=2, max_length=200)
    codigo: str = Field(..., min_length=2, max_length=20)
    carga_horaria: int = Field(..., gt=0)
    descricao: str
    competencias: List[str] = []
    pre_requisitos: List[str] = []
    ativo: bool = True
    data_criacao: Optional[datetime] = None

class Turma(BaseModel):
    id: Optional[str] = None
    nome: str = Field(..., min_length=2, max_length=200)
    curso_id: str
    instrutor_id: str
    data_inicio: datetime
    data_fim: datetime
    horario_inicio: str
    horario_fim: str
    dias_semana: List[str]
    sala: str
    vagas_total: int = Field(..., gt=0)
    vagas_ocupadas: int = Field(default=0, ge=0)
    status: str = Field(..., regex=r'^(planejada|em_andamento|concluida|cancelada)$')
    data_criacao: Optional[datetime] = None

class Alocacao(BaseModel):
    id: Optional[str] = None
    instrutor_id: str
    turma_id: str
    uc_id: str
    data_inicio: datetime
    data_fim: datetime
    carga_horaria_semanal: int = Field(..., gt=0, le=40)
    status: str = Field(..., regex=r'^(planejada|em_andamento|concluida|cancelada)$')
    observacoes: Optional[str] = None
    data_criacao: Optional[datetime] = None

class EventoCalendario(BaseModel):
    id: Optional[str] = None
    titulo: str = Field(..., min_length=2, max_length=200)
    descricao: Optional[str] = None
    data_inicio: datetime
    data_fim: datetime
    tipo: str = Field(..., regex=r'^(aula|evento|feriado|reuniao)$')
    turma_id: Optional[str] = None
    instrutor_id: Optional[str] = None
    sala: Optional[str] = None
    cor: str = Field(default="#3788d8")
    data_criacao: Optional[datetime] = None
