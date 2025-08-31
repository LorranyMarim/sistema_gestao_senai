import requests
import json
from pymongo import MongoClient
from auth_utils import get_password_hash, verify_password
from auth import hash_senha, verificar_senha
import os

def testar_conexao_mongo():
    """Testa conexão com MongoDB"""
    try:
        from db import get_mongo_db
        db = get_mongo_db()
        # Tenta fazer uma operação simples
        collections = db.list_collection_names()
        print("✅ Conexão MongoDB: OK")
        print(f"   Collections encontradas: {collections}")
        return True
    except Exception as e:
        print(f"❌ Erro na conexão MongoDB: {e}")
        return False

def verificar_usuario_admin():
    """Verifica se usuário admin existe"""
    try:
        from db import get_mongo_db
        db = get_mongo_db()
        usuario = db["usuario"].find_one({"user_name": "admin"})
        
        if usuario:
            print("✅ Usuário admin encontrado")
            print(f"   ID: {usuario['_id']}")
            print(f"   Nome: {usuario.get('nome', 'N/A')}")
            print(f"   Senha hash: {usuario['senha'][:20]}...")
            
            # Testa verificação de senha
            senha_correta = verificar_senha("admin123", usuario['senha'])
            print(f"   Teste senha 'admin123': {'✅ OK' if senha_correta else '❌ FALHA'}")
            
            return True
        else:
            print("❌ Usuário admin NÃO encontrado")
            return False
    except Exception as e:
        print(f"❌ Erro ao verificar usuário: {e}")
        return False

def testar_api_status():
    """Testa se a API está rodando"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ API FastAPI: Rodando")
            print(f"   Resposta: {response.json()}")
            return True
        else:
            print(f"❌ API retornou status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ API FastAPI: NÃO está rodando")
        return False
    except Exception as e:
        print(f"❌ Erro ao testar API: {e}")
        return False

def testar_login_api():
    """Testa endpoint de login diretamente"""
    try:
        url = "http://localhost:8000/api/login"
        dados = {
            "user_name": "admin",
            "senha": "admin123"
        }
        
        response = requests.post(url, json=dados, timeout=10)
        
        print(f"\n🔍 Teste de Login API:")
        print(f"   URL: {url}")
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Login API: SUCESSO")
            print(f"   Resposta: {response.json()}")
            return True
        else:
            print(f"❌ Login API: FALHA")
            try:
                erro = response.json()
                print(f"   Erro: {erro}")
            except:
                print(f"   Resposta raw: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste de login: {e}")
        return False

def criar_usuario_admin():
    """Cria usuário admin se não existir"""
    try:
        from db import get_mongo_db
        db = get_mongo_db()
        
        # Verifica se já existe
        if db["usuario"].find_one({"user_name": "admin"}):
            print("ℹ️  Usuário admin já existe")
            return True
            
        # Cria novo usuário
        senha_hash = hash_senha("admin123")
        usuario = {
            "user_name": "admin",
            "senha": senha_hash,
            "nome": "Administrador",
            "tipo_acesso": "admin",
            "instituicao_id": None
        }
        
        result = db["usuario"].insert_one(usuario)
        print(f"✅ Usuário admin criado com ID: {result.inserted_id}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")
        return False

def main():
    print("🔍 DIAGNÓSTICO DO SISTEMA SENAI")
    print("=" * 40)
    
    # Testes em sequência
    mongo_ok = testar_conexao_mongo()
    
    if mongo_ok:
        admin_existe = verificar_usuario_admin()
        if not admin_existe:
            print("\n🔧 Tentando criar usuário admin...")
            criar_usuario_admin()
            verificar_usuario_admin()
    
    api_ok = testar_api_status()
    
    if api_ok:
        testar_login_api()
    
    print("\n" + "=" * 40)
    print("📋 RESUMO:")
    print(f"   MongoDB: {'✅' if mongo_ok else '❌'}")
    print(f"   API FastAPI: {'✅' if api_ok else '❌'}")
    
    if not api_ok:
        print("\n💡 SOLUÇÃO: Inicie a API com:")
        print("   cd c:\\xampp\\htdocs\\sge\\sistema_gestao_senai\\api")
        print("   uvicorn main:app --reload")

if __name__ == "__main__":
    main()