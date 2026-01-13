import pandas as pd
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone
import os

# Configuração da conexão com o MongoDB
# Altere a string de conexão se o seu banco não estiver rodando localmente
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "senai_betim"
COLLECTION_NAME = "instrutor"

# Nome do arquivo CSV (deve estar no mesmo diretório do script)
CSV_FILE = "Planilha sem título - Página1.csv"

def connect_db():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    return db[COLLECTION_NAME]

def process_and_insert():
    # Verifica se o arquivo existe
    if not os.path.exists(CSV_FILE):
        print(f"Erro: Arquivo '{CSV_FILE}' não encontrado.")
        return

    # Lê o CSV
    try:
        df = pd.read_csv(CSV_FILE)
    except Exception as e:
        print(f"Erro ao ler o CSV: {e}")
        return

    collection = connect_db()
    
    # Data fixa conforme solicitado: 2026-01-12T22:20:52.118Z
    data_criacao = datetime(2026, 1, 12, 22, 20, 52, 118000, tzinfo=timezone.utc)
    
    # ID fixo da instituição
    instituicao_id = ObjectId("6872ebc05f2c070a0234219f")

    documentos_para_inserir = []

    for index, row in df.iterrows():
        # 3. Processamento da Matrícula (String, tratando NaN e removendo decimais)
        raw_matricula = row['Matricula']
        if pd.isna(raw_matricula):
            matricula = ""
        else:
            # Converte float para int para remover .0 e depois para string
            matricula = str(int(raw_matricula))

        # 5. Processamento da Área (Array de strings, separando por " AND ")
        area_raw = row['Área de Atuação']
        if isinstance(area_raw, str) and " AND " in area_raw:
            area = area_raw.split(" AND ")
        else:
            area = [str(area_raw)] if pd.notna(area_raw) else []

        # 8. Processamento do Turno (Array de strings, separando por " AND ")
        turno_raw = row['Turno']
        if isinstance(turno_raw, str) and " AND " in turno_raw:
            turno = turno_raw.split(" AND ")
        else:
            turno = [str(turno_raw)] if pd.notna(turno_raw) else []

        # 10. Processamento do Mapa de Competências (Array de ObjectIds)
        competencia_raw = row['Competencia']
        mapa_competencias = []
        if isinstance(competencia_raw, str):
            # Remove espaços em branco extras caso existam e converte para ObjectId
            try:
                mapa_competencias.append(ObjectId(competencia_raw.strip()))
            except Exception as e:
                print(f"Aviso: ID de competência inválido na linha {index}: {competencia_raw}")

        # Construção do documento
        doc = {
            # _id será gerado automaticamente pelo Mongo
            "nome": str(row['Nome']),
            "matricula": matricula,
            "categoria": str(row['Categoria']),
            "area": area,
            "tipo_contrato": str(row['Contrato']),
            "carga_horaria": int(row['Carga']),
            "turno": turno,
            "status": "Ativo",
            "mapa_competencias": mapa_competencias,
            "instituicao_id": instituicao_id,
            "data_criacao": data_criacao
        }
        
        documentos_para_inserir.append(doc)

    # Inserção no banco de dados
    if documentos_para_inserir:
        try:
            result = collection.insert_many(documentos_para_inserir)
            print(f"Sucesso! {len(result.inserted_ids)} documentos inseridos na coleção '{COLLECTION_NAME}'.")
        except Exception as e:
            print(f"Erro ao inserir documentos: {e}")
    else:
        print("Nenhum documento processado para inserção.")

if __name__ == "__main__":
    process_and_insert()