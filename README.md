# Sistema de Gestão e Alocação de Professores Senai Betim/MG

## 📌 Sobre o Projeto
Este projeto foi desenvolvido com o objetivo de gerenciar e otimizar a alocação de professores em turmas e unidades disciplinares (unidades curriculares). A aplicação permite o controle de instituições, cursos, instrutores, turmas, ocupações e calendários, oferecendo uma visão gerencial ampla do cenário educacional.

**⚠️ Status do Projeto:** Descontinuado (Aproximadamente 70% concluído).
*Nota:* O desenvolvimento deste sistema foi interrompido antes de sua finalização devido ao meu desligamento da empresa. Faltaram cerca de 30% das implementações para a conclusão total. O repositório foi disponibilizado para fins de consulta, estudo e portfólio.

## 🛠 Tecnologias Utilizadas
O projeto possui uma arquitetura dividida entre backend (API) e frontend, utilizando as seguintes tecnologias:
* **API / Backend:** Python (FastAPI/Flask)
* **Frontend / Views:** PHP, JavaScript, CSS, HTML
* **Banco de Dados:** MongoDB (NoSQL)
* **Cache:** Redis (Gerenciamento de sessões/cache da API)

---

## 🚀 Como Baixar e Configurar o Ambiente

### 1. Pré-requisitos
Antes de começar, certifique-se de ter os seguintes componentes instalados na sua máquina:
* **Python 3.10+**
* **Servidor PHP** (XAMPP, WAMP, ou PHP embutido)
* **MongoDB** (Rodando localmente ou via MongoDB Atlas)
* **Redis** (Rodando localmente para o cache da API)
* **Git**

### 2. Clonando o Repositório
Abra o seu terminal e execute:
```bash
git clone [https://github.com/seu-usuario/sistema_gestao.git](https://github.com/seu-usuario/sistema_gestao.git)
cd sistema_gestao
```
### 3. Configurando a API (Python)
A API gerencia todas as regras de negócio e a comunicação com o MongoDB e Redis.

# Navegue até a pasta da API
```bash
cd api
```

# Crie um ambiente virtual (recomendado)
```bash
python -m venv venv
```

# Ative o ambiente virtual
# No Windows:
```bash
venv\Scripts\activate
```

# No Linux/Mac:
```bash
source venv/bin/activate
```

# Instale as dependências
```bash
pip install -r requirements.txt
```

# Execute a API (exemplo, caso use uvicorn/fastapi)
```bash
python main.py
```

### 4. Configurando o Frontend (PHP)
Para rodar a interface, você pode usar um servidor como o Apache (via XAMPP) colocando a pasta do projeto em htdocs, ou usar o servidor embutido do PHP:

# Na raiz do projeto, inicie o servidor PHP
```bash
php -S localhost:8000
```
Acesse http://localhost:8000/views/index.php no seu navegador.

## 🗄️ Configuração Inicial do Banco de Dados (MongoDB)
Para que o sistema funcione e você consiga fazer o login, é necessário ter uma Instituição Default e um Usuário Administrador previamente cadastrados no banco de dados.

Crie um arquivo chamado setup_database.py na raiz do seu projeto e cole o script abaixo. Certifique-se de que o seu MongoDB esteja rodando localmente (porta 27017).
Script setup_database.py
```bash
import pymongo
from bson import ObjectId
import datetime

# Configuração da conexão com o MongoDB
# Substitua pela sua URI caso não esteja rodando localmente
MONGO_URI = "mongodb://localhost:27017/"
NOME_BANCO = "sistema_gestao" # Substitua pelo nome correto do seu banco de dados

def setup_db():
    client = pymongo.MongoClient(MONGO_URI)
    db = client[NOME_BANCO]
    
    print("Iniciando configuração do banco de dados...")

    # 1. Dados da Instituição Default
    instituicao_data = {
        "razao_social": "Insituição Default",
        "cnpj": "01111100000100",
        "endereco": {
            "logradouro": "Rua Um",
            "numero": "1",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "00000011",
            "ibge_cod": "00000011"
        },
        "telefone": "0119999999",
        "email": "instituicao@default.com.br",
        "nome": "Insituição Default"
    }

    # Insere a instituição e recupera o ID gerado ($oid)
    resultado_inst = db.instituicoes.insert_one(instituicao_data)
    inst_id = resultado_inst.inserted_id
    print(f"✅ Instituição criada com sucesso! ID: {inst_id}")

    # 2. Dados do Usuário Administrador
    # A senha abaixo corresponde ao hash bcrypt para a string padrão
    agora = datetime.datetime.now(datetime.timezone.utc)
    
    usuario_data = {
        "nome": "ADMINISTRADOR",
        "user_name": "admin@admin.com",
        "tipo_acesso": "Administrador",
        "status": "Ativo",
        "senha": "$2b$12$JZJhFdJXM2eHWN2Dm4RajuDzfdRnboVHKgWu.ham3Jke06X.yb6nm",
        "user_name_lc": "admin@admin.com",
        "instituicao_id": inst_id,
        "instituicoes_ids": [inst_id],
        "data_criacao": agora,
        "alterado_em": agora,
        "alterado_por": None  # Será atualizado logo após a criação
    }

    # Insere o usuário e recupera o ID
    resultado_user = db.usuarios.insert_one(usuario_data)
    user_id = resultado_user.inserted_id
    print(f"✅ Usuário criado com sucesso! ID: {user_id}")

    # 3. Atualiza o campo 'alterado_por' do próprio usuário para referenciar seu próprio ID
    db.usuarios.update_one(
        {"_id": user_id},
        {"$set": {"alterado_por": user_id}}
    )
    print("✅ Vínculos de auditoria atualizados.")
    print("\n🚀 Configuração concluída! Você já pode logar no sistema utilizando:")
    print("Email: admin@admin.com")
    # Nota: Quem clonar deve saber qual é a senha "limpa" (ex: "admin" ou "123456") 
    # que gerou este hash bcrypt.

if __name__ == "__main__":
    setup_db()
```

Executando o Setup
Após criar o arquivo, basta rodá-lo no terminal com o ambiente virtual ativo:
```bash
python setup_database.py
```

Se tudo der certo, a instituição e o usuário administrador estarão no banco. Você poderá abrir a tela de login em PHP e acessar a plataforma usando o e-mail admin@admin.com e a senha original referente à criptografia salva.

