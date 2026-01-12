from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware # Importação única

# Importação das rotas
from rotas_usuario import router as usuario_router
from rotas_curso import router as curso_router
from rotas_instituicao import router as instituicao_router
from rotas_uc import router as uc_router
from rotas_empresa import router as empresa_router
from rotas_calendario_geral import router as calendario_geral_router
from rotas_instrutor import router as instrutor_router
from rotas_turma import router as turma_router
from rotas_dashboard import router as dashboard_router
from rotas_calendario import router as calendario_router
from bootstrap import router as bootstrap_router

app = FastAPI(
    title="API SENAI Betim",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de Compressão (Apenas uma vez)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Inclusão das Rotas
app.include_router(usuario_router)
app.include_router(curso_router)
app.include_router(instituicao_router)
app.include_router(uc_router)   
app.include_router(empresa_router)
app.include_router(calendario_geral_router)
app.include_router(instrutor_router)
app.include_router(turma_router)     
app.include_router(dashboard_router)
app.include_router(calendario_router)

# Correção: Removido prefix="/api" pois bootstrap.py já define a rota como /api/bootstrap
app.include_router(bootstrap_router) 

@app.get("/")
def status():
    return {"ok": True, "msg": "API online"}