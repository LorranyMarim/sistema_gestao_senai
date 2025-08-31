from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import random

# Conectar ao MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['senai_betim_bd']

print("🚀 Inserindo turmas diversas no banco de dados...")

# Buscar cursos, instituições, calendários e empresas existentes
cursos = list(db.curso.find({"status": True}))
instituicoes = list(db.instituicao.find({"status": True}))
calendarios = list(db.calendario.find({"status": True}))
empresas = list(db.empresa.find({"status": True}))
unidades_curriculares = list(db.unidade_curricular.find({"status": True}))

if not cursos:
    print("❌ Nenhum curso encontrado. Execute primeiro o script de cursos.")
    exit()

if not instituicoes:
    print("❌ Nenhuma instituição encontrada. Criando SENAI...")
    instituicao_senai = {
        "nome": "SENAI - Serviço Nacional de Aprendizagem Industrial",
        "sigla": "SENAI",
        "cnpj": "03.774.819/0001-02",
        "endereco": "Av. Paulista, 1313 - São Paulo/SP",
        "status": True
    }
    result = db.instituicao.insert_one(instituicao_senai)
    instituicoes = [{**instituicao_senai, "_id": result.inserted_id}]

if not empresas:
    print("❌ Nenhuma empresa encontrada. Criando empresas de exemplo...")
    empresas_exemplo = [
        {"razao_social": "Tech Solutions Ltda", "nome_fantasia": "TechSol", "cnpj": "12.345.678/0001-90", "status": True},
        {"razao_social": "Indústria Mecânica Brasil S.A.", "nome_fantasia": "MecBrasil", "cnpj": "98.765.432/0001-10", "status": True},
        {"razao_social": "Eletrônica Avançada Ltda", "nome_fantasia": "EletroTech", "cnpj": "11.222.333/0001-44", "status": True},
        {"razao_social": "Consultoria Empresarial ABC", "nome_fantasia": "ABC Consultoria", "cnpj": "55.666.777/0001-88", "status": True},
        {"razao_social": "Automação Industrial XYZ", "nome_fantasia": "AutoXYZ", "cnpj": "77.888.999/0001-22", "status": True}
    ]
    for emp in empresas_exemplo:
        result = db.empresa.insert_one(emp)
        empresas.append({**emp, "_id": result.inserted_id})

if not calendarios:
    print("❌ Nenhum calendário encontrado. Criando calendários...")
    calendarios_exemplo = [
        {
            "nome": "Calendário Acadêmico 2024 - 1º Semestre",
            "descricao": "Calendário para cursos do primeiro semestre de 2024",
            "data_inicio": "2024-02-01",
            "data_fim": "2024-07-31",
            "status": True
        },
        {
            "nome": "Calendário Acadêmico 2024 - 2º Semestre",
            "descricao": "Calendário para cursos do segundo semestre de 2024",
            "data_inicio": "2024-08-01",
            "data_fim": "2025-01-31",
            "status": True
        }
    ]
    for cal in calendarios_exemplo:
        result = db.calendario.insert_one(cal)
        calendarios.append({**cal, "_id": result.inserted_id})

# Definir turnos e códigos
turnos = ["MANHÃ", "TARDE", "NOITE"]
codigos_base = ["SIS", "ELE", "MEC", "ADM", "RED", "AUT", "QUA", "SEG", "LOG", "GES"]

# Criar turmas diversas
turmas_para_inserir = []

for i in range(50):  # Criar 50 turmas
    curso = random.choice(cursos)
    instituicao = random.choice(instituicoes)
    calendario = random.choice(calendarios)
    empresa = random.choice(empresas)
    turno = random.choice(turnos)
    codigo_base = random.choice(codigos_base)
    
    # Gerar datas baseadas no turno
    if turno == "MANHÃ":
        data_inicio = f"2024-{random.randint(2, 4):02d}-{random.randint(1, 28):02d}"
        data_fim = f"2024-{random.randint(8, 12):02d}-{random.randint(1, 28):02d}"
    elif turno == "TARDE":
        data_inicio = f"2024-{random.randint(3, 5):02d}-{random.randint(1, 28):02d}"
        data_fim = f"2024-{random.randint(9, 12):02d}-{random.randint(1, 28):02d}"
    else:  # NOITE
        data_inicio = f"2024-{random.randint(2, 6):02d}-{random.randint(1, 28):02d}"
        data_fim = f"2025-{random.randint(1, 7):02d}-{random.randint(1, 28):02d}"
    
    # Gerar código único
    codigo = f"HT-{codigo_base}-{i+1:02d}-{turno[0]}-{random.randint(24, 25)}-{random.randint(10000, 99999)}"
    
    # Selecionar unidades curriculares aleatórias
    ucs_selecionadas = random.sample(unidades_curriculares, min(3, len(unidades_curriculares)))
    
    turma = {
        "codigo": codigo,
        "id_curso": curso["_id"],
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "turno": turno,
        "num_alunos": random.randint(15, 35),
        "id_instituicao": instituicao["_id"],
        "id_calendario": calendario["_id"],
        "id_empresa": empresa["_id"],
        "status": True,
        "unidades_curriculares": [
            {
                "id_uc": uc["_id"],
                "id_instrutor": ObjectId(),  # ID temporário
                "data_inicio": data_inicio,
                "data_fim": data_fim
            }
            for uc in ucs_selecionadas
        ]
    }
    
    turmas_para_inserir.append(turma)

# Inserir todas as turmas
print(f"📚 Inserindo {len(turmas_para_inserir)} turmas...")
result = db.turma.insert_many(turmas_para_inserir)
print(f"✅ {len(result.inserted_ids)} turmas inseridas com sucesso!")

# Mostrar algumas turmas criadas
print("\n📋 Algumas turmas criadas:")
for i, turma in enumerate(turmas_para_inserir[:10]):
    curso_nome = next((c["nome"] for c in cursos if c["_id"] == turma["id_curso"]), "Curso não encontrado")
    print(f"   {i+1}. {turma['codigo']} - {curso_nome} ({turma['turno']}) - {turma['num_alunos']} alunos")

if len(turmas_para_inserir) > 10:
    print(f"   ... e mais {len(turmas_para_inserir) - 10} turmas")

print(f"\n📊 Total de turmas no banco: {db.turma.count_documents({})}")
print("\n✅ Processo concluído!")

client.close()