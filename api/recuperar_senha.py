from bson.objectid import ObjectId
from db import get_mongo_db
from auth import get_password_hash

def alterar_senha_emergencia():
    user_id = "69a81f2b03a921a0eafd1a4c"
    nova_senha_plana = "12345678"

    try:
        # 1. Gera o hash da nova senha usando a mesma regra do sistema
        senha_hasheada = get_password_hash(nova_senha_plana)
        print(f"[*] Hash gerado com sucesso.")

        # 2. Pega a conexão com o banco usando as configurações do seu arquivo db.py
        db = get_mongo_db()
        colecao = db["usuario"]
        print("[*] Conectado ao banco de dados.")

        # 3. Atualiza a senha no MongoDB
        resultado = colecao.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"senha": senha_hasheada}}
        )

        # 4. Verifica se a alteração funcionou
        if resultado.matched_count > 0:
            print(f"[✓] Sucesso! A senha do usuário ID '{user_id}' foi alterada para '{nova_senha_plana}'.")
        else:
            print(f"[!] Erro: Nenhum usuário encontrado com o ID '{user_id}'.")

    except Exception as e:
        print(f"[X] Ocorreu um erro: {e}")

if __name__ == "__main__":
    alterar_senha_emergencia()