from pymongo import MongoClient
from auth_utils import get_password_hash
from datetime import datetime
import sys

def setup_database():
    try:
        # Conecta ao MongoDB local
        client = MongoClient('mongodb://localhost:27017/')
        db = client['senai_betim_bd']
        
        print("🔗 Conectado ao MongoDB local")
        
        # Cria as coleções necessárias
        collections = [
            'usuario', 'curso', 'empresa', 'instrutor', 
            'turma', 'unidade_curricular', 'alocacao', 
            'calendario', 'instituicao'
        ]
        
        for collection_name in collections:
            if collection_name not in db.list_collection_names():
                db.create_collection(collection_name)
                print(f"✅ Coleção '{collection_name}' criada")
            else:
                print(f"ℹ️ Coleção '{collection_name}' já existe")
        
        # Verifica se já existe um admin
        admin_existente = db['usuario'].find_one({"user_name": "admin"})
        if admin_existente:
            print("ℹ️ Usuário admin já existe")
            return
        
        # Cria o usuário admin
        senha_hash = get_password_hash("admin123")
        
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
        
        result = db['usuario'].insert_one(admin_user)
        print(f"✅ Usuário admin criado com ID: {result.inserted_id}")
        
        # Cria índices para performance
        db['usuario'].create_index("user_name", unique=True)
        db['curso'].create_index("nome")
        db['empresa'].create_index("nome")
        db['instrutor'].create_index("nome")
        print("✅ Índices criados")
        
        print("\n🎉 Configuração concluída!")
        print("\n📋 Credenciais do Admin:")
        print("   Usuário: admin")
        print("   Senha: admin123")
        print("\n⚠️ Lembre-se de alterar a senha após o primeiro login!")
        
    except Exception as e:
        print(f"❌ Erro na configuração: {e}")
        sys.exit(1)

if __name__ == "__main__":
    setup_database()