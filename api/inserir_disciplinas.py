#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from datetime import datetime
from bson import ObjectId

# Adicionar o diretório da API ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import get_mongo_db

def inserir_disciplinas():
    """Insere diversas disciplinas no banco de dados"""
    
    try:
        db = get_mongo_db()
        print("Conectado ao banco de dados MongoDB")
        
        # Verificar se existe alguma instituição para usar como referência
        instituicao = db.instituicao.find_one()
        if not instituicao:
            print("❌ Nenhuma instituição encontrada. Execute primeiro o script de inserção da instituição SENAI.")
            return False
        
        instituicao_id = str(instituicao["_id"])
        print(f"Usando instituição: {instituicao.get('razao_social', 'N/A')} (ID: {instituicao_id})")
        
        # Lista de disciplinas para inserir
        disciplinas = [
            {
                "_id": ObjectId(),
                "descricao": "Banco de Dados",
                "sala_ideal": "201B",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Programação Web",
                "sala_ideal": "202A",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Algoritmos e Estruturas de Dados",
                "sala_ideal": "203C",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Redes de Computadores",
                "sala_ideal": "204B",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Segurança da Informação",
                "sala_ideal": "205A",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Engenharia de Software",
                "sala_ideal": "206C",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Sistemas Operacionais",
                "sala_ideal": "207B",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Inteligência Artificial",
                "sala_ideal": "208A",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Desenvolvimento Mobile",
                "sala_ideal": "209C",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Análise de Sistemas",
                "sala_ideal": "210B",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Gestão de Projetos",
                "sala_ideal": "211A",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Matemática Aplicada",
                "sala_ideal": "212C",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Estatística e Probabilidade",
                "sala_ideal": "213B",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Interface Humano-Computador",
                "sala_ideal": "214A",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "descricao": "Computação em Nuvem",
                "sala_ideal": "215C",
                "instituicao_id": instituicao_id,
                "status": "Ativa",
                "data_criacao": datetime.now()
            }
        ]
        
        # Verificar se já existem disciplinas
        disciplinas_existentes = db.disciplinas.count_documents({})
        if disciplinas_existentes > 0:
            print(f"⚠️  Já existem {disciplinas_existentes} disciplinas no banco. Continuando com a inserção...")
        
        # Inserir disciplinas
        result = db.disciplinas.insert_many(disciplinas)
        
        if result.inserted_ids:
            print(f"✅ {len(disciplinas)} disciplinas inseridas com sucesso!")
            print("\nDisciplinas inseridas:")
            for i, disciplina in enumerate(disciplinas):
                print(f"{i+1:2d}. {disciplina['descricao']} - Sala: {disciplina['sala_ideal']} - ID: {disciplina['_id']}")
            return True
        else:
            print("❌ Erro ao inserir as disciplinas")
            return False
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False

if __name__ == "__main__":
    print("Inserindo disciplinas no banco de dados...")
    sucesso = inserir_disciplinas()
    
    if sucesso:
        print("\n🎉 Processo concluído com sucesso!")
        print("As disciplinas estão agora disponíveis no sistema.")
    else:
        print("\n❌ Erro durante o processo.")