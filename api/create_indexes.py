# Arquivo: api/create_indexes.py
from db import get_mongo_db
from pymongo import ASCENDING, DESCENDING

def criar_indices():
    db = get_mongo_db()
    print("--- Iniciando Otimização de Índices ---")

    # 1. Turma (Usa 'id_instituicao' como ObjectId)
    # Índice para filtrar por instituição e ordenar por data de criação (padrão da lista)
    print("Indexando Turma...")
    db.turma.create_index([("id_instituicao", ASCENDING), ("data_hora_criacao", DESCENDING)])
    # Índice para filtros de status dentro da instituição
    db.turma.create_index([("id_instituicao", ASCENDING), ("status", ASCENDING)])

    # 2. Curso (Usa 'instituicao_id' como String)
    print("Indexando Curso...")
    db.curso.create_index([("instituicao_id", ASCENDING), ("nome", ASCENDING)])

    # 3. Instrutor (Usa 'instituicao_id' como String)
    print("Indexando Instrutor...")
    db.instrutor.create_index([("instituicao_id", ASCENDING), ("nome", ASCENDING)])

    # 4. Unidade Curricular (Usa 'instituicao_id' como String)
    print("Indexando Unidade Curricular...")
    db.unidade_curricular.create_index([("instituicao_id", ASCENDING), ("descricao", ASCENDING)])

    # 5. Calendário (Usa 'id_instituicao' como ObjectId)
    print("Indexando Calendário...")
    db.calendario.create_index([("id_instituicao", ASCENDING), ("data_inicial", DESCENDING)])

    # 6. Empresa (Usa 'instituicao_id' como String)
    print("Indexando Empresa...")
    db.empresa.create_index([("instituicao_id", ASCENDING), ("razao_social", ASCENDING)])

    # 7. Usuário (Usa 'instituicao_id' como String)
    print("Indexando Usuário...")
    # Para listar usuários da instituição
    db.usuario.create_index([("instituicao_id", ASCENDING), ("user_name", ASCENDING)])
    # Para o login rápido e verificação de duplicidade (já deve existir, mas reforçamos)
    db.usuario.create_index([("user_name_lc", ASCENDING)], unique=True)

    print("\n✅ Sucesso! Todos os índices foram criados e o banco está otimizado.")

if __name__ == "__main__":
    criar_indices()