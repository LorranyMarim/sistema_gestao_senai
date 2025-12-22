import bcrypt

def get_password_hash(senha: str) -> str:
    """Gera o hash da senha usando bcrypt."""
    hashed = bcrypt.hashpw(senha.encode(), bcrypt.gensalt())
    return hashed.decode()

def verificar_senha(senha: str, senha_hashed: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    return bcrypt.checkpw(senha.encode(), senha_hashed.encode())