from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rotas_usuario import router as usuario_router
from rotas_curso import router as curso_router
from rotas_instituicao import router as instituicao_router
from rotas_uc import router as uc_router
from rotas_alocacao import router as alocacao_router
from rotas_empresa import router as empresa_router
from rotas_calendario import router as calendario_router
from rotas_instrutor import router as instrutor_router
from rotas_turma import router as turma_router
from rotas_convenio import router as convenio_router

app = FastAPI(
    title="Sistema de Gestão SENAI",
    description="API para gerenciamento acadêmico do SENAI Betim",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuario_router)
app.include_router(curso_router)
app.include_router(instituicao_router)
app.include_router(uc_router)
app.include_router(alocacao_router)
app.include_router(empresa_router)
app.include_router(calendario_router)
app.include_router(instrutor_router)
app.include_router(turma_router)
app.include_router(convenio_router)

@app.get("/")
def status():
    return {"status": "Sistema de Gestão SENAI API funcionando", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}
