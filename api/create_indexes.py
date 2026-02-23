from db import get_mongo_db
from pymongo import ASCENDING, DESCENDING
from db import get_mongo_db
from pymongo import ASCENDING, DESCENDING
from datetime import datetime, timezone

def seed_primeiro_acesso(db):
    """
    RN05: Garante a criação da Instituição Principal e do usuário Administrador
    caso o banco esteja sendo inicializado (vazio).
    """
    from auth import get_password_hash # Import necessário para gerar o hash
    
    if db.instituicao.count_documents({}) == 0 and db.usuario.count_documents({}) == 0:
        print("--- Realizando Setup de Primeiro Acesso (RN05) ---")
        inst_id = db.instituicao.insert_one({"razao_social": "Instituição Principal (Matriz)"}).inserted_id
        
        admin_user = {
            "nome": "Administrador do Sistema",
            "user_name": "admin@fiemg.com.br", # Padrão para RN06
            "user_name_lc": "admin@fiemg.com.br",
            "senha": get_password_hash("admin123"),
            "tipo_acesso": "Administrador",
            "status": "Ativo",
            "instituicao_id": inst_id,
            "instituicoes_ids": [str(inst_id)],
            "data_criacao": datetime.now(timezone.utc)
        }
        db.usuario.insert_one(admin_user)
        print("✅ Setup concluído: Instituição Matriz e Usuário Administrador criados.")

def criar_indices():
    db = get_mongo_db()
    seed_primeiro_acesso(db)
    print("--- Iniciando Otimização de Índices ---")

    print("Indexando Turma...")
    db.turma.create_index([("id_instituicao", ASCENDING), ("data_hora_criacao", DESCENDING)])
    db.turma.create_index([("id_instituicao", ASCENDING), ("status", ASCENDING)])

    print("Indexando Curso...")
    db.curso.create_index([("instituicao_id", ASCENDING), ("nome", ASCENDING)])

    print("Indexando Instrutor...")
    db.instrutor.create_index([("instituicao_id", ASCENDING), ("nome", ASCENDING)])

    print("Indexando Unidade Curricular...")
    db.unidade_curricular.create_index([("instituicao_id", ASCENDING), ("descricao", ASCENDING)])

    print("Indexando Calendário...")
    db.calendario.create_index([("id_instituicao", ASCENDING), ("data_inicial", DESCENDING)])

    print("Indexando Empresa...")
    db.empresa.create_index([("instituicao_id", ASCENDING), ("razao_social", ASCENDING)])

    print("Indexando Usuário...")
    db.usuario.create_index([("instituicao_id", ASCENDING), ("user_name", ASCENDING)])
    db.usuario.create_index([("user_name_lc", ASCENDING)], unique=True)

    print("\n✅ Sucesso! Todos os índices foram criados e o banco está otimizado.")

if __name__ == "__main__":
    criar_indices()