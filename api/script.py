# Script Python para criar indexes (se preferir via código)
from db import get_mongo_db
import pymongo

def create_extra_indexes():
    db = get_mongo_db()
    
    # 1. Index para listar cursos ativos rapidamente (usado no bootstrap)
    print("Criando index em curso...")
    db["curso"].create_index([
        ("instituicao_id", pymongo.ASCENDING),
        ("status", pymongo.ASCENDING),
        ("nome_curso", pymongo.ASCENDING)
    ])

    # 2. O index em 'unidade_curricular._id' já existe por padrão no Mongo, 
    # mas garantir que a busca por lista de IDs seja rápida é sempre bom.
    # Não é necessário criar index explícito para _id.

if __name__ == "__main__":
    create_extra_indexes()