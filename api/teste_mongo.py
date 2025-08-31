from pymongo import MongoClient
import os

# Teste conexão local
try:
    client = MongoClient("mongodb://localhost:27017/")
    db = client["senai_betim_bd"]
    print("✅ MongoDB local conectado")
    print(f"Collections: {db.list_collection_names()}")
except Exception as e:
    print(f"❌ Erro MongoDB local: {e}")

# Teste conexão Atlas (se configurado)
try:
    mongo_url = os.getenv("MONGO_URL")
    if mongo_url:
        client = MongoClient(mongo_url)
        db = client["senai_betim_bd"]
        print("✅ MongoDB Atlas conectado")
        print(f"Collections: {db.list_collection_names()}")
    else:
        print("ℹ️  MONGO_URL não configurado")
except Exception as e:
    print(f"❌ Erro MongoDB Atlas: {e}")