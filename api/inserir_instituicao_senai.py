#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from datetime import datetime
from bson import ObjectId

# Adicionar o diretório da API ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import get_mongo_db

def inserir_senai_betim():
    """Insere a instituição SENAI Betim no banco de dados"""
    
    try:
        db = get_mongo_db()
        print("Conectado ao banco de dados MongoDB")
        
        # Verificar se a instituição já existe
        instituicao_existente = db.instituicao.find_one({"razao_social": "SENAI - Serviço Nacional de Aprendizagem Industrial - Betim"})
        
        if instituicao_existente:
            print("⚠️  Instituição SENAI Betim já existe no banco de dados!")
            print(f"ID: {instituicao_existente['_id']}")
            return True
        
        # Dados da instituição SENAI Betim
        senai_betim = {
            "_id": ObjectId(),
            "razao_social": "SENAI - Serviço Nacional de Aprendizagem Industrial - Betim",
            "nome_fantasia": "SENAI Betim",
            "cnpj": "03777569000176",
            "endereco": {
                "logradouro": "Rua Irmão Pedro, 60",
                "bairro": "Distrito Industrial Paulo Camilo Sul",
                "cidade": "Betim",
                "estado": "MG",
                "cep": "32669-900"
            },
            "telefone": "(31) 3597-4600",
            "email": "senai.betim@fiemg.com.br",
            "site": "https://www.fiemg.com.br/senai/",
            "diretor": "A definir",
            "tipo": "instituicao_ensino",
            "ativo": True,
            "data_criacao": datetime.now(),
            "observacoes": "Unidade SENAI responsável pela formação profissional em Betim e região metropolitana"
        }
        
        # Inserir no banco
        result = db.instituicao.insert_one(senai_betim)
        
        if result.inserted_id:
            print("✅ Instituição SENAI Betim inserida com sucesso!")
            print(f"ID gerado: {result.inserted_id}")
            print(f"Razão Social: {senai_betim['razao_social']}")
            print(f"CNPJ: {senai_betim['cnpj']}")
            print(f"Endereço: {senai_betim['endereco']['logradouro']}, {senai_betim['endereco']['bairro']}, {senai_betim['endereco']['cidade']}/{senai_betim['endereco']['estado']}")
            return True
        else:
            print("❌ Erro ao inserir a instituição")
            return False
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False

if __name__ == "__main__":
    print("Inserindo instituição SENAI Betim no banco de dados...")
    sucesso = inserir_senai_betim()
    
    if sucesso:
        print("\n🎉 Processo concluído com sucesso!")
        print("A instituição SENAI Betim está agora disponível no sistema.")
    else:
        print("\n❌ Erro durante o processo.")