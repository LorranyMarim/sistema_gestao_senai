from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import random

# Conectar ao MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['senai_betim_bd']

print("🚀 Iniciando população completa do banco de dados...")

# ======================= CALENDÁRIOS =======================
calendarios_data = [
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
    },
    {
        "nome": "Calendário Intensivo 2024",
        "descricao": "Calendário para cursos intensivos e de verão",
        "data_inicio": "2024-01-15",
        "data_fim": "2024-12-15",
        "status": True
    },
    {
        "nome": "Calendário Noturno 2024",
        "descricao": "Calendário específico para turmas noturnas",
        "data_inicio": "2024-03-01",
        "data_fim": "2024-11-30",
        "status": True
    }
]

print("📅 Inserindo calendários...")
calendarios_ids = []
for cal in calendarios_data:
    result = db.calendario.insert_one(cal)
    calendarios_ids.append(result.inserted_id)
    print(f"   ✓ {cal['nome']}")

# ======================= UNIDADES CURRICULARES =======================
unidades_curriculares = [
    # Área de Tecnologia da Informação
    {"nome": "Fundamentos de Programação", "carga_horaria": 120, "area": "TI", "descricao": "Lógica de programação e algoritmos"},
    {"nome": "Banco de Dados", "carga_horaria": 100, "area": "TI", "descricao": "Modelagem e administração de bancos de dados"},
    {"nome": "Desenvolvimento Web", "carga_horaria": 140, "area": "TI", "descricao": "HTML, CSS, JavaScript e frameworks"},
    {"nome": "Redes de Computadores", "carga_horaria": 80, "area": "TI", "descricao": "Configuração e administração de redes"},
    {"nome": "Segurança da Informação", "carga_horaria": 60, "area": "TI", "descricao": "Princípios de segurança e proteção de dados"},
    {"nome": "Sistemas Operacionais", "carga_horaria": 80, "area": "TI", "descricao": "Administração de sistemas Linux e Windows"},
    {"nome": "Análise de Sistemas", "carga_horaria": 100, "area": "TI", "descricao": "Levantamento de requisitos e modelagem"},
    {"nome": "Mobile Development", "carga_horaria": 120, "area": "TI", "descricao": "Desenvolvimento para dispositivos móveis"},
    
    # Área de Eletrônica
    {"nome": "Circuitos Elétricos", "carga_horaria": 100, "area": "Eletrônica", "descricao": "Análise de circuitos CC e CA"},
    {"nome": "Eletrônica Digital", "carga_horaria": 120, "area": "Eletrônica", "descricao": "Sistemas digitais e microcontroladores"},
    {"nome": "Eletrônica Analógica", "carga_horaria": 100, "area": "Eletrônica", "descricao": "Amplificadores e circuitos analógicos"},
    {"nome": "Instrumentação Industrial", "carga_horaria": 80, "area": "Eletrônica", "descricao": "Sensores e sistemas de medição"},
    {"nome": "Automação Industrial", "carga_horaria": 140, "area": "Eletrônica", "descricao": "CLPs e sistemas automatizados"},
    {"nome": "Telecomunicações", "carga_horaria": 100, "area": "Eletrônica", "descricao": "Sistemas de comunicação"},
    
    # Área de Mecânica
    {"nome": "Desenho Técnico Mecânico", "carga_horaria": 80, "area": "Mecânica", "descricao": "Representação gráfica de peças"},
    {"nome": "Metrologia", "carga_horaria": 60, "area": "Mecânica", "descricao": "Sistemas de medição e controle de qualidade"},
    {"nome": "Processos de Fabricação", "carga_horaria": 120, "area": "Mecânica", "descricao": "Usinagem e conformação mecânica"},
    {"nome": "Resistência dos Materiais", "carga_horaria": 100, "area": "Mecânica", "descricao": "Propriedades mecânicas dos materiais"},
    {"nome": "Manutenção Industrial", "carga_horaria": 100, "area": "Mecânica", "descricao": "Técnicas de manutenção preventiva e corretiva"},
    {"nome": "Soldagem", "carga_horaria": 120, "area": "Mecânica", "descricao": "Processos de soldagem e metalurgia"},
    
    # Área de Administração
    {"nome": "Gestão de Pessoas", "carga_horaria": 80, "area": "Administração", "descricao": "Recursos humanos e liderança"},
    {"nome": "Contabilidade Básica", "carga_horaria": 100, "area": "Administração", "descricao": "Princípios contábeis e demonstrações financeiras"},
    {"nome": "Marketing Digital", "carga_horaria": 80, "area": "Administração", "descricao": "Estratégias de marketing online"},
    {"nome": "Logística", "carga_horaria": 100, "area": "Administração", "descricao": "Gestão da cadeia de suprimentos"},
    {"nome": "Empreendedorismo", "carga_horaria": 60, "area": "Administração", "descricao": "Desenvolvimento de negócios"},
    
    # Disciplinas Transversais
    {"nome": "Português Técnico", "carga_horaria": 40, "area": "Transversal", "descricao": "Comunicação técnica e redação"},
    {"nome": "Matemática Aplicada", "carga_horaria": 60, "area": "Transversal", "descricao": "Matemática para áreas técnicas"},
    {"nome": "Inglês Técnico", "carga_horaria": 40, "area": "Transversal", "descricao": "Inglês para áreas técnicas"},
    {"nome": "Ética Profissional", "carga_horaria": 20, "area": "Transversal", "descricao": "Ética e responsabilidade profissional"},
    {"nome": "Saúde e Segurança no Trabalho", "carga_horaria": 40, "area": "Transversal", "descricao": "Normas de segurança e prevenção"},
    {"nome": "Meio Ambiente", "carga_horaria": 40, "area": "Transversal", "descricao": "Sustentabilidade e gestão ambiental"},
    {"nome": "Qualidade", "carga_horaria": 40, "area": "Transversal", "descricao": "Sistemas de gestão da qualidade"}
]

print("📚 Inserindo unidades curriculares...")
ucs_ids = []
for uc in unidades_curriculares:
    uc['status'] = True
    result = db.unidade_curricular.insert_one(uc)
    ucs_ids.append(result.inserted_id)
    print(f"   ✓ {uc['nome']} ({uc['carga_horaria']}h)")

# ======================= CURSOS TÉCNICOS =======================
cursos_tecnicos = [
    {
        "nome": "Técnico em Desenvolvimento de Sistemas",
        "codigo": "TDS-001",
        "descricao": "Curso técnico para formação de desenvolvedores de software",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Tecnologia da Informação",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[0], "carga_horaria": 120},  # Fundamentos de Programação
            {"id_uc": ucs_ids[1], "carga_horaria": 100},  # Banco de Dados
            {"id_uc": ucs_ids[2], "carga_horaria": 140},  # Desenvolvimento Web
            {"id_uc": ucs_ids[7], "carga_horaria": 120},  # Mobile Development
            {"id_uc": ucs_ids[6], "carga_horaria": 100},  # Análise de Sistemas
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[24], "carga_horaria": 100}, # Empreendedorismo + extras
            {"id_uc": ucs_ids[4], "carga_horaria": 60},   # Segurança da Informação
            {"id_uc": ucs_ids[5], "carga_horaria": 80},   # Sistemas Operacionais
            {"id_uc": ucs_ids[3], "carga_horaria": 80},   # Redes de Computadores
            {"id_uc": ucs_ids[30], "carga_horaria": 40}   # Meio Ambiente
        ]
    },
    {
        "nome": "Técnico em Eletrônica",
        "codigo": "TEL-001",
        "descricao": "Curso técnico para formação em eletrônica e automação",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Eletrônica",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[8], "carga_horaria": 100},  # Circuitos Elétricos
            {"id_uc": ucs_ids[9], "carga_horaria": 120},  # Eletrônica Digital
            {"id_uc": ucs_ids[10], "carga_horaria": 100}, # Eletrônica Analógica
            {"id_uc": ucs_ids[11], "carga_horaria": 80},  # Instrumentação Industrial
            {"id_uc": ucs_ids[12], "carga_horaria": 140}, # Automação Industrial
            {"id_uc": ucs_ids[13], "carga_horaria": 100}, # Telecomunicações
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[30], "carga_horaria": 40},  # Meio Ambiente
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[14], "carga_horaria": 80},  # Desenho Técnico
            {"id_uc": ucs_ids[15], "carga_horaria": 60},  # Metrologia
            {"id_uc": ucs_ids[24], "carga_horaria": 60},  # Empreendedorismo
            {"id_uc": ucs_ids[8], "carga_horaria": 80}    # Fundamentos de Programação
        ]
    },
    {
        "nome": "Técnico em Mecânica",
        "codigo": "TME-001",
        "descricao": "Curso técnico para formação em mecânica industrial",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Mecânica",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[14], "carga_horaria": 80},  # Desenho Técnico Mecânico
            {"id_uc": ucs_ids[15], "carga_horaria": 60},  # Metrologia
            {"id_uc": ucs_ids[16], "carga_horaria": 120}, # Processos de Fabricação
            {"id_uc": ucs_ids[17], "carga_horaria": 100}, # Resistência dos Materiais
            {"id_uc": ucs_ids[18], "carga_horaria": 100}, # Manutenção Industrial
            {"id_uc": ucs_ids[19], "carga_horaria": 120}, # Soldagem
            {"id_uc": ucs_ids[12], "carga_horaria": 100}, # Automação Industrial
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[30], "carga_horaria": 40},  # Meio Ambiente
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[24], "carga_horaria": 60},  # Empreendedorismo
            {"id_uc": ucs_ids[8], "carga_horaria": 80},   # Circuitos Elétricos
            {"id_uc": ucs_ids[11], "carga_horaria": 80},  # Instrumentação
            {"id_uc": ucs_ids[22], "carga_horaria": 40}   # Contabilidade (gestão)
        ]
    },
    {
        "nome": "Técnico em Administração",
        "codigo": "TAD-001",
        "descricao": "Curso técnico para formação em gestão administrativa",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Gestão",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[20], "carga_horaria": 80},  # Gestão de Pessoas
            {"id_uc": ucs_ids[21], "carga_horaria": 100}, # Contabilidade Básica
            {"id_uc": ucs_ids[22], "carga_horaria": 80},  # Marketing Digital
            {"id_uc": ucs_ids[23], "carga_horaria": 100}, # Logística
            {"id_uc": ucs_ids[24], "carga_horaria": 60},  # Empreendedorismo
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[30], "carga_horaria": 40},  # Meio Ambiente
            {"id_uc": ucs_ids[0], "carga_horaria": 80},   # Fundamentos de Programação
            {"id_uc": ucs_ids[2], "carga_horaria": 100},  # Desenvolvimento Web
            {"id_uc": ucs_ids[1], "carga_horaria": 80},   # Banco de Dados
            {"id_uc": ucs_ids[14], "carga_horaria": 60},  # Desenho Técnico
            {"id_uc": ucs_ids[4], "carga_horaria": 60},   # Segurança da Informação
            {"id_uc": ucs_ids[15], "carga_horaria": 40},  # Metrologia (controle)
            {"id_uc": ucs_ids[16], "carga_horaria": 80},  # Processos (gestão de processos)
            {"id_uc": ucs_ids[11], "carga_horaria": 60}   # Instrumentação (indicadores)
        ]
    },
    {
        "nome": "Técnico em Redes de Computadores",
        "codigo": "TRC-001",
        "descricao": "Curso técnico para formação em infraestrutura de TI",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Tecnologia da Informação",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[3], "carga_horaria": 80},   # Redes de Computadores
            {"id_uc": ucs_ids[5], "carga_horaria": 80},   # Sistemas Operacionais
            {"id_uc": ucs_ids[4], "carga_horaria": 60},   # Segurança da Informação
            {"id_uc": ucs_ids[13], "carga_horaria": 100}, # Telecomunicações
            {"id_uc": ucs_ids[0], "carga_horaria": 120},  # Fundamentos de Programação
            {"id_uc": ucs_ids[1], "carga_horaria": 100},  # Banco de Dados
            {"id_uc": ucs_ids[2], "carga_horaria": 140},  # Desenvolvimento Web
            {"id_uc": ucs_ids[8], "carga_horaria": 100},  # Circuitos Elétricos
            {"id_uc": ucs_ids[9], "carga_horaria": 80},   # Eletrônica Digital
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[30], "carga_horaria": 40},  # Meio Ambiente
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[24], "carga_horaria": 60},  # Empreendedorismo
            {"id_uc": ucs_ids[11], "carga_horaria": 80},  # Instrumentação
            {"id_uc": ucs_ids[20], "carga_horaria": 60}   # Gestão de Pessoas
        ]
    },
    {
        "nome": "Técnico em Automação Industrial",
        "codigo": "TAI-001",
        "descricao": "Curso técnico para formação em automação e controle",
        "carga_horaria_total": 1200,
        "duracao_meses": 18,
        "area": "Automação",
        "modalidade": "Presencial",
        "unidades_curriculares": [
            {"id_uc": ucs_ids[12], "carga_horaria": 140}, # Automação Industrial
            {"id_uc": ucs_ids[8], "carga_horaria": 100},  # Circuitos Elétricos
            {"id_uc": ucs_ids[9], "carga_horaria": 120},  # Eletrônica Digital
            {"id_uc": ucs_ids[10], "carga_horaria": 100}, # Eletrônica Analógica
            {"id_uc": ucs_ids[11], "carga_horaria": 80},  # Instrumentação Industrial
            {"id_uc": ucs_ids[0], "carga_horaria": 120},  # Fundamentos de Programação
            {"id_uc": ucs_ids[3], "carga_horaria": 80},   # Redes de Computadores
            {"id_uc": ucs_ids[14], "carga_horaria": 80},  # Desenho Técnico
            {"id_uc": ucs_ids[15], "carga_horaria": 60},  # Metrologia
            {"id_uc": ucs_ids[18], "carga_horaria": 100}, # Manutenção Industrial
            {"id_uc": ucs_ids[25], "carga_horaria": 40},  # Português Técnico
            {"id_uc": ucs_ids[26], "carga_horaria": 60},  # Matemática Aplicada
            {"id_uc": ucs_ids[27], "carga_horaria": 40},  # Inglês Técnico
            {"id_uc": ucs_ids[28], "carga_horaria": 20},  # Ética Profissional
            {"id_uc": ucs_ids[29], "carga_horaria": 40},  # Saúde e Segurança
            {"id_uc": ucs_ids[30], "carga_horaria": 40},  # Meio Ambiente
            {"id_uc": ucs_ids[31], "carga_horaria": 40},  # Qualidade
            {"id_uc": ucs_ids[24], "carga_horaria": 60}   # Empreendedorismo
        ]
    }
]

print("🎓 Inserindo cursos técnicos...")
cursos_ids = []
for curso in cursos_tecnicos:
    curso['status'] = True
    result = db.curso.insert_one(curso)
    cursos_ids.append(result.inserted_id)
    print(f"   ✓ {curso['nome']} - {curso['carga_horaria_total']}h")

# ======================= BUSCAR EMPRESAS E INSTITUIÇÕES =======================
print("🏢 Buscando empresas e instituições existentes...")
empresas = list(db.empresa.find({"status": True}).limit(10))
instituicoes = list(db.instituicao.find({"status": True}).limit(5))

if not empresas:
    print("   ⚠️  Nenhuma empresa encontrada. Criando empresas de exemplo...")
    empresas_exemplo = [
        {"razao_social": "Tech Solutions Ltda", "nome_fantasia": "TechSol", "cnpj": "12.345.678/0001-90", "status": True},
        {"razao_social": "Indústria Mecânica Brasil S.A.", "nome_fantasia": "MecBrasil", "cnpj": "98.765.432/0001-10", "status": True},
        {"razao_social": "Eletrônica Avançada Ltda", "nome_fantasia": "EletroTech", "cnpj": "11.222.333/0001-44", "status": True},
        {"razao_social": "Consultoria Empresarial ABC", "nome_fantasia": "ABC Consultoria", "cnpj": "55.666.777/0001-88", "status": True}
    ]
    for emp in empresas_exemplo:
        result = db.empresa.insert_one(emp)
        empresas.append({**emp, "_id": result.inserted_id})

if not instituicoes:
    print("   ⚠️  Nenhuma instituição encontrada. Usando SENAI como padrão...")
    instituicao_senai = {
        "nome": "SENAI - Serviço Nacional de Aprendizagem Industrial",
        "sigla": "SENAI",
        "cnpj": "03.774.819/0001-02",
        "endereco": "Av. Paulista, 1313 - São Paulo/SP",
        "status": True
    }
    result = db.instituicao.insert_one(instituicao_senai)
    instituicoes.append({**instituicao_senai, "_id": result.inserted_id})

# ======================= TURMAS =======================
print("👥 Criando turmas para cada curso...")
turnos = ["Matutino", "Vespertino", "Noturno"]
turmas_criadas = []

for i, curso_id in enumerate(cursos_ids):
    curso = cursos_tecnicos[i]
    
    # Criar 3 turmas por curso (uma para cada turno)
    for j, turno in enumerate(turnos):
        # Calcular datas baseadas no calendário
        calendario_id = calendarios_ids[j % len(calendarios_ids)]
        
        if turno == "Matutino":
            data_inicio = "2024-02-15"
            data_fim = "2024-08-15"
        elif turno == "Vespertino":
            data_inicio = "2024-03-01"
            data_fim = "2024-09-01"
        else:  # Noturno
            data_inicio = "2024-02-01"
            data_fim = "2024-08-01"
        
        # Selecionar empresa e instituição aleatoriamente
        empresa_selecionada = random.choice(empresas)
        instituicao_selecionada = random.choice(instituicoes)
        
        turma = {
            "codigo": f"{curso['codigo']}-{turno[:3].upper()}-{2024}",
            "id_curso": curso_id,
            "data_inicio": data_inicio,
            "data_fim": data_fim,
            "turno": turno,
            "num_alunos": random.randint(15, 30),
            "id_instituicao": instituicao_selecionada["_id"],
            "id_calendario": calendario_id,
            "id_empresa": empresa_selecionada["_id"],
            "status": True,
            "unidades_curriculares": [
                {
                    "id_uc": uc["id_uc"],
                    "id_instrutor": ObjectId(),  # ID temporário
                    "data_inicio": data_inicio,
                    "data_fim": data_fim
                }
                for uc in curso["unidades_curriculares"][:3]  # Primeiras 3 UCs
            ]
        }
        
        result = db.turma.insert_one(turma)
        turmas_criadas.append(result.inserted_id)
        print(f"   ✓ {turma['codigo']} - {turno} ({turma['num_alunos']} alunos)")

# ======================= RELATÓRIO FINAL =======================
print("\n" + "="*60)
print("📊 RELATÓRIO DE POPULAÇÃO DO BANCO DE DADOS")
print("="*60)
print(f"📅 Calendários criados: {len(calendarios_ids)}")
print(f"📚 Unidades Curriculares: {len(ucs_ids)}")
print(f"🎓 Cursos Técnicos: {len(cursos_ids)}")
print(f"🏢 Empresas disponíveis: {len(empresas)}")
print(f"🏛️  Instituições disponíveis: {len(instituicoes)}")
print(f"👥 Turmas criadas: {len(turmas_criadas)}")
print("\n📋 CURSOS CRIADOS:")
for curso in cursos_tecnicos:
    print(f"   • {curso['nome']} ({curso['codigo']}) - {curso['carga_horaria_total']}h")

print("\n✅ População do banco de dados concluída com sucesso!")
print("\n💡 Próximos passos:")
print("   1. Acesse a página de gestão de cursos para visualizar os dados")
print("   2. Acesse a página de gestão de turmas para ver as turmas criadas")
print("   3. Configure instrutores para as unidades curriculares")
print("   4. Ajuste calendários conforme necessário")

client.close()