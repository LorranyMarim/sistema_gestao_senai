from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rotas_usuario import router as usuario_router
from rotas_curso import router as curso_router
from rotas_instituicao import router as instituicao_router
from rotas_uc import router as uc_router
from rotas_alocacao import router as alocacao_router

app = FastAPI()

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

@app.get("/")
def status():
    return {"ok": True, "msg": "API online"}
