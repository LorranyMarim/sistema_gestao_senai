# main.py
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
from rotas_dashboard import router as dashboard_router



# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(
    title="API SENAI Betim",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# -----------------------------------------------------------------------------
# CORS (apenas uma vez, com regex cobrindo localhost/127.0.0.1 em qualquer porta)
# Observação: allow_credentials=True exige origem explícita; por isso usamos regex.
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Rotas
# -----------------------------------------------------------------------------
app.include_router(usuario_router)
app.include_router(curso_router)
app.include_router(instituicao_router)
app.include_router(uc_router)
app.include_router(alocacao_router)   # incluído uma única vez
app.include_router(empresa_router)
app.include_router(calendario_router)
app.include_router(instrutor_router)
app.include_router(turma_router)      # /api/turmas -> rotas_turma.py
app.include_router(dashboard_router)


# -----------------------------------------------------------------------------
# Healthcheck
# -----------------------------------------------------------------------------
@app.get("/")
def status():
    return {"ok": True, "msg": "API online"}
