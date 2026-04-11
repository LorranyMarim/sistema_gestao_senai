from passlib.context import CryptContext

# Configurado exclusivamente para bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(senha: str) -> str:
    """Gera o hash da senha usando passlib."""
    return pwd_context.hash(senha)

def verificar_senha(senha: str, senha_hashed: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    return pwd_context.verify(senha, senha_hashed)