from pymongo import MongoClient
import sys

try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    # Força uma operação para testar a conexão
    client.admin.command('ping')
    print("✅ MongoDB está rodando!")
    print(f"Versão: {client.server_info()['version']}")
    print(f"Bancos disponíveis: {client.list_database_names()}")
except Exception as e:
    print(f"❌ MongoDB não está rodando: {e}")
    print("\n🔧 Soluções:")
    print("1. Instale o MongoDB: https://www.mongodb.com/try/download/community")
    print("2. Ou use Docker: docker run -d --name mongodb -p 27017:27017 mongo:latest")
    print("3. Ou inicie o serviço: net start MongoDB")
    sys.exit(1)