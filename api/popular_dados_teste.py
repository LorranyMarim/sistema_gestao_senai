#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import random

# Adicionar o diretório da API ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import get_mongo_db

def popular_dados_teste():
    """Popula o banco de dados com dados de teste"""
    
    try:
        db = get_mongo_db()
        print("Conectado ao banco de dados MongoDB")
        
        # Limpar dados existentes (exceto usuários)
        print("Limpando dados existentes...")
        db.empresas.delete_many({})
        db.instrutores.delete_many({})
        db.unidades_curriculares.delete_many({})
        db.cursos.delete_many({})
        db.turmas.delete_many({})
        db.alocacoes.delete_many({})
        db.eventos_calendario.delete_many({})
        
        # 1. EMPRESAS
        print("Inserindo empresas...")
        empresas = [
            {
                "_id": ObjectId(),
                "nome": "Petrobras S.A.",
                "cnpj": "33000167000101",
                "endereco": "Av. República do Chile, 65 - Centro, Rio de Janeiro - RJ",
                "telefone": "(21) 3224-1510",
                "email": "contato@petrobras.com.br",
                "contato_responsavel": "Maria Silva Santos",
                "tipo_parceria": "convenio",
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Vale S.A.",
                "cnpj": "33592510000154",
                "endereco": "Praia de Botafogo, 186 - Botafogo, Rio de Janeiro - RJ",
                "telefone": "(21) 3485-3333",
                "email": "parceria@vale.com",
                "contato_responsavel": "João Carlos Oliveira",
                "tipo_parceria": "contrato",
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Usiminas S.A.",
                "cnpj": "60894730000105",
                "endereco": "Rua Prof. José Vieira de Mendonça, 3011 - Engenho Nogueira, Belo Horizonte - MG",
                "telefone": "(31) 3499-8000",
                "email": "rh@usiminas.com",
                "contato_responsavel": "Ana Paula Costa",
                "tipo_parceria": "parceria",
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Cemig Distribuição S.A.",
                "cnpj": "06981180000116",
                "endereco": "Av. Barbacena, 1200 - Santo Agostinho, Belo Horizonte - MG",
                "telefone": "(31) 3506-5024",
                "email": "capacitacao@cemig.com.br",
                "contato_responsavel": "Carlos Eduardo Mendes",
                "tipo_parceria": "convenio",
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Fiat Chrysler Automóveis Brasil Ltda.",
                "cnpj": "16701716000124",
                "endereco": "Av. Contorno, 3731 - Santa Efigênia, Belo Horizonte - MG",
                "telefone": "(31) 3429-3000",
                "email": "treinamento@stellantis.com",
                "contato_responsavel": "Roberto Fernandes",
                "tipo_parceria": "contrato",
                "ativo": True,
                "data_criacao": datetime.now()
            }
        ]
        
        result_empresas = db.empresas.insert_many(empresas)
        empresa_ids = result_empresas.inserted_ids
        print(f"Inseridas {len(empresas)} empresas")
        
        # 2. INSTRUTORES
        print("Inserindo instrutores...")
        instrutores = [
            {
                "_id": ObjectId(),
                "nome": "Prof. Dr. Carlos Alberto Silva",
                "cpf": "12345678901",
                "email": "carlos.silva@senai.br",
                "telefone": "(31) 99876-5432",
                "especializacoes": ["Automação Industrial", "Eletrônica", "Programação CLP"],
                "carga_horaria_maxima": 40,
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Profa. Msc. Ana Maria Santos",
                "cpf": "23456789012",
                "email": "ana.santos@senai.br",
                "telefone": "(31) 99765-4321",
                "especializacoes": ["Mecânica Industrial", "Soldagem", "Metrologia"],
                "carga_horaria_maxima": 36,
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Eng. João Pedro Oliveira",
                "cpf": "34567890123",
                "email": "joao.oliveira@senai.br",
                "telefone": "(31) 99654-3210",
                "especializacoes": ["Segurança do Trabalho", "Gestão da Qualidade", "Lean Manufacturing"],
                "carga_horaria_maxima": 32,
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Profa. Dra. Mariana Costa",
                "cpf": "45678901234",
                "email": "mariana.costa@senai.br",
                "telefone": "(31) 99543-2109",
                "especializacoes": ["Tecnologia da Informação", "Programação", "Banco de Dados"],
                "carga_horaria_maxima": 40,
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Téc. Roberto Fernandes",
                "cpf": "56789012345",
                "email": "roberto.fernandes@senai.br",
                "telefone": "(31) 99432-1098",
                "especializacoes": ["Eletricidade Industrial", "Manutenção Predial", "Instalações Elétricas"],
                "carga_horaria_maxima": 38,
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Profa. Esp. Luciana Almeida",
                "cpf": "67890123456",
                "email": "luciana.almeida@senai.br",
                "telefone": "(31) 99321-0987",
                "especializacoes": ["Gestão Empresarial", "Recursos Humanos", "Empreendedorismo"],
                "carga_horaria_maxima": 35,
                "ativo": True,
                "data_criacao": datetime.now()
            }
        ]
        
        result_instrutores = db.instrutores.insert_many(instrutores)
        instrutor_ids = result_instrutores.inserted_ids
        print(f"Inseridos {len(instrutores)} instrutores")
        
        # 3. UNIDADES CURRICULARES
        print("Inserindo unidades curriculares...")
        ucs = [
            {
                "_id": ObjectId(),
                "nome": "Fundamentos de Automação Industrial",
                "codigo": "AUT001",
                "carga_horaria": 80,
                "descricao": "Introdução aos conceitos básicos de automação industrial, sensores e atuadores.",
                "competencias": ["Identificar componentes de automação", "Configurar sensores básicos", "Programar controladores simples"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Programação de CLPs",
                "codigo": "AUT002",
                "carga_horaria": 120,
                "descricao": "Programação avançada de Controladores Lógicos Programáveis.",
                "competencias": ["Programar CLPs", "Desenvolver lógicas de controle", "Implementar sistemas automatizados"],
                "pre_requisitos": ["AUT001"],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Soldagem MIG/MAG",
                "codigo": "SOL001",
                "carga_horaria": 160,
                "descricao": "Técnicas de soldagem MIG/MAG para aplicações industriais.",
                "competencias": ["Executar soldas MIG/MAG", "Preparar materiais para soldagem", "Controlar qualidade da solda"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Metrologia Industrial",
                "codigo": "MET001",
                "carga_horaria": 60,
                "descricao": "Instrumentos de medição e controle dimensional na indústria.",
                "competencias": ["Utilizar instrumentos de medição", "Interpretar tolerâncias", "Elaborar relatórios metrológicos"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Segurança do Trabalho",
                "codigo": "SEG001",
                "carga_horaria": 40,
                "descricao": "Normas e práticas de segurança no ambiente industrial.",
                "competencias": ["Aplicar normas de segurança", "Identificar riscos", "Usar EPIs corretamente"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Programação Python",
                "codigo": "TI001",
                "carga_horaria": 100,
                "descricao": "Fundamentos de programação em Python para aplicações industriais.",
                "competencias": ["Programar em Python", "Desenvolver scripts de automação", "Integrar sistemas"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Banco de Dados",
                "codigo": "TI002",
                "carga_horaria": 80,
                "descricao": "Modelagem e administração de bancos de dados relacionais.",
                "competencias": ["Modelar bancos de dados", "Escrever consultas SQL", "Administrar SGBDs"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Gestão da Qualidade",
                "codigo": "GES001",
                "carga_horaria": 60,
                "descricao": "Sistemas de gestão da qualidade ISO 9001.",
                "competencias": ["Implementar SGQ", "Auditar processos", "Melhorar continuamente"],
                "pre_requisitos": [],
                "ativo": True,
                "data_criacao": datetime.now()
            }
        ]
        
        result_ucs = db.unidades_curriculares.insert_many(ucs)
        uc_ids = result_ucs.inserted_ids
        print(f"Inseridas {len(ucs)} unidades curriculares")
        
        # 4. CURSOS
        print("Inserindo cursos...")
        cursos = [
            {
                "_id": ObjectId(),
                "nome": "Técnico em Automação Industrial",
                "nivel": "tecnico",
                "tipo": "presencial",
                "status": "ativo",
                "categoria": "Técnico",
                "eixo_tecnologico": "Controle e Processos Industriais",
                "carga_horaria": 1200,
                "instituicao_id": "SENAI Betim",
                "empresa_id": str(empresa_ids[0]),
                "ucs": [str(uc_ids[0]), str(uc_ids[1]), str(uc_ids[4])],
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Técnico em Mecânica Industrial",
                "nivel": "tecnico",
                "tipo": "presencial",
                "status": "ativo",
                "categoria": "Técnico",
                "eixo_tecnologico": "Controle e Processos Industriais",
                "carga_horaria": 1000,
                "instituicao_id": "SENAI Betim",
                "empresa_id": str(empresa_ids[1]),
                "ucs": [str(uc_ids[2]), str(uc_ids[3]), str(uc_ids[4])],
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Tecnólogo em Análise e Desenvolvimento de Sistemas",
                "nivel": "superior",
                "tipo": "hibrido",
                "status": "ativo",
                "categoria": "Tecnólogo",
                "eixo_tecnologico": "Informação e Comunicação",
                "carga_horaria": 2400,
                "instituicao_id": "SENAI Betim",
                "empresa_id": str(empresa_ids[3]),
                "ucs": [str(uc_ids[5]), str(uc_ids[6])],
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Qualificação em Soldagem",
                "nivel": "qualificacao",
                "tipo": "presencial",
                "status": "ativo",
                "categoria": "Qualificação Profissional",
                "eixo_tecnologico": "Controle e Processos Industriais",
                "carga_horaria": 200,
                "instituicao_id": "SENAI Betim",
                "empresa_id": str(empresa_ids[2]),
                "ucs": [str(uc_ids[2]), str(uc_ids[4])],
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Pós-Graduação em Gestão da Qualidade",
                "nivel": "pos_graduacao",
                "tipo": "ead",
                "status": "planejamento",
                "categoria": "Pós-Graduação",
                "eixo_tecnologico": "Gestão e Negócios",
                "carga_horaria": 360,
                "instituicao_id": "SENAI Betim",
                "empresa_id": str(empresa_ids[4]),
                "ucs": [str(uc_ids[7])],
                "data_criacao": datetime.now()
            }
        ]
        
        result_cursos = db.cursos.insert_many(cursos)
        curso_ids = result_cursos.inserted_ids
        print(f"Inseridos {len(cursos)} cursos")
        
        # 5. TURMAS
        print("Inserindo turmas...")
        data_base = datetime.now()
        turmas = [
            {
                "_id": ObjectId(),
                "nome": "Automação Industrial - Turma 2024.1",
                "curso_id": str(curso_ids[0]),
                "instrutor_id": str(instrutor_ids[0]),
                "data_inicio": data_base + timedelta(days=30),
                "data_fim": data_base + timedelta(days=180),
                "horario_inicio": "08:00",
                "horario_fim": "12:00",
                "dias_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
                "sala": "Lab. Automação 01",
                "vagas_total": 25,
                "vagas_ocupadas": 22,
                "status": "em_andamento",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Mecânica Industrial - Turma 2024.1",
                "curso_id": str(curso_ids[1]),
                "instrutor_id": str(instrutor_ids[1]),
                "data_inicio": data_base + timedelta(days=15),
                "data_fim": data_base + timedelta(days=150),
                "horario_inicio": "14:00",
                "horario_fim": "18:00",
                "dias_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
                "sala": "Oficina Mecânica 02",
                "vagas_total": 20,
                "vagas_ocupadas": 18,
                "status": "em_andamento",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "ADS - Turma 2024.1",
                "curso_id": str(curso_ids[2]),
                "instrutor_id": str(instrutor_ids[3]),
                "data_inicio": data_base + timedelta(days=60),
                "data_fim": data_base + timedelta(days=730),
                "horario_inicio": "19:00",
                "horario_fim": "22:00",
                "dias_semana": ["Segunda", "Terça", "Quarta", "Quinta"],
                "sala": "Lab. Informática 03",
                "vagas_total": 30,
                "vagas_ocupadas": 28,
                "status": "planejada",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "nome": "Soldagem - Turma 2024.2",
                "curso_id": str(curso_ids[3]),
                "instrutor_id": str(instrutor_ids[1]),
                "data_inicio": data_base + timedelta(days=45),
                "data_fim": data_base + timedelta(days=90),
                "horario_inicio": "08:00",
                "horario_fim": "17:00",
                "dias_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
                "sala": "Oficina Soldagem 01",
                "vagas_total": 15,
                "vagas_ocupadas": 12,
                "status": "planejada",
                "data_criacao": datetime.now()
            }
        ]
        
        result_turmas = db.turmas.insert_many(turmas)
        turma_ids = result_turmas.inserted_ids
        print(f"Inseridas {len(turmas)} turmas")
        
        # 6. ALOCAÇÕES
        print("Inserindo alocações...")
        alocacoes = [
            {
                "_id": ObjectId(),
                "instrutor_id": str(instrutor_ids[0]),
                "turma_id": str(turma_ids[0]),
                "uc_id": str(uc_ids[0]),
                "data_inicio": data_base + timedelta(days=30),
                "data_fim": data_base + timedelta(days=60),
                "carga_horaria_semanal": 20,
                "status": "em_andamento",
                "observacoes": "Primeira UC do curso - Fundamentos",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "instrutor_id": str(instrutor_ids[1]),
                "turma_id": str(turma_ids[1]),
                "uc_id": str(uc_ids[2]),
                "data_inicio": data_base + timedelta(days=15),
                "data_fim": data_base + timedelta(days=75),
                "carga_horaria_semanal": 20,
                "status": "em_andamento",
                "observacoes": "Prática intensiva de soldagem",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "instrutor_id": str(instrutor_ids[3]),
                "turma_id": str(turma_ids[2]),
                "uc_id": str(uc_ids[5]),
                "data_inicio": data_base + timedelta(days=60),
                "data_fim": data_base + timedelta(days=120),
                "carga_horaria_semanal": 12,
                "status": "planejada",
                "observacoes": "Módulo inicial de programação",
                "data_criacao": datetime.now()
            }
        ]
        
        result_alocacoes = db.alocacoes.insert_many(alocacoes)
        print(f"Inseridas {len(alocacoes)} alocações")
        
        # 7. EVENTOS DO CALENDÁRIO
        print("Inserindo eventos do calendário...")
        eventos = [
            {
                "_id": ObjectId(),
                "titulo": "Aula Prática - Automação",
                "descricao": "Aula prática de programação de CLPs",
                "data_inicio": data_base + timedelta(days=35, hours=8),
                "data_fim": data_base + timedelta(days=35, hours=12),
                "tipo": "aula",
                "turma_id": str(turma_ids[0]),
                "instrutor_id": str(instrutor_ids[0]),
                "sala": "Lab. Automação 01",
                "cor": "#3788d8",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "titulo": "Reunião Pedagógica",
                "descricao": "Reunião mensal da equipe pedagógica",
                "data_inicio": data_base + timedelta(days=20, hours=14),
                "data_fim": data_base + timedelta(days=20, hours=16),
                "tipo": "reuniao",
                "turma_id": None,
                "instrutor_id": None,
                "sala": "Sala de Reuniões",
                "cor": "#ff6b6b",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "titulo": "Feriado Nacional",
                "descricao": "Independência do Brasil",
                "data_inicio": datetime(2024, 9, 7),
                "data_fim": datetime(2024, 9, 7, 23, 59),
                "tipo": "feriado",
                "turma_id": None,
                "instrutor_id": None,
                "sala": None,
                "cor": "#feca57",
                "data_criacao": datetime.now()
            },
            {
                "_id": ObjectId(),
                "titulo": "Feira de Profissões",
                "descricao": "Evento de divulgação dos cursos técnicos",
                "data_inicio": data_base + timedelta(days=90, hours=9),
                "data_fim": data_base + timedelta(days=90, hours=17),
                "tipo": "evento",
                "turma_id": None,
                "instrutor_id": None,
                "sala": "Pátio Central",
                "cor": "#48dbfb",
                "data_criacao": datetime.now()
            }
        ]
        
        result_eventos = db.eventos_calendario.insert_many(eventos)
        print(f"Inseridos {len(eventos)} eventos do calendário")
        
        print("\n=== DADOS DE TESTE INSERIDOS COM SUCESSO ===")
        print(f"✅ {len(empresas)} empresas")
        print(f"✅ {len(instrutores)} instrutores")
        print(f"✅ {len(ucs)} unidades curriculares")
        print(f"✅ {len(cursos)} cursos")
        print(f"✅ {len(turmas)} turmas")
        print(f"✅ {len(alocacoes)} alocações")
        print(f"✅ {len(eventos)} eventos do calendário")
        print("\nO banco de dados está pronto para testes!")
        
    except Exception as e:
        print(f"Erro ao popular dados de teste: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Iniciando população do banco de dados com dados de teste...")
    sucesso = popular_dados_teste()
    
    if sucesso:
        print("\n🎉 Processo concluído com sucesso!")
    else:
        print("\n❌ Erro durante o processo.")