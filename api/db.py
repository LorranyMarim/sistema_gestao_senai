from pymongo import MongoClient
import os

def get_mongo_db():
    # Usa variável de ambiente ou padrão local
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_url)
    return client["senai_betim_bd"]



