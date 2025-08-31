from auth_utils import get_password_hash
from db import get_mongo_db
from datetime import datetime

def criar_usuario_admin():
    db = get_mongo_db()
    
    # Verifica se já existe um admin
    admin_existente = db["usuario"].find_one({"user_name": "admin"})
    if admin_existente:
        print("Usuário admin já existe!")
        return
    
    # Cria senha hash
    senha_hash = get_password_hash("admin123")
    
    # Dados do usuário admin
    admin_user = {
        "user_name": "admin",
        "senha": senha_hash,
        "nome": "Administrador",
        "email": "admin@senai.br",
        "tipo": "admin",
        "ativo": True,
        "data_criacao": datetime.now(),
        "ultimo_login": None
    }
    
    # Insere o usuário
    result = db["usuario"].insert_one(admin_user)
    print(f"Usuário admin criado com ID: {result.inserted_id}")
    print("Credenciais:")
    print("Usuário: admin")
    print("Senha: admin123")

if __name__ == "__main__":
    criar_usuario_admin()