# Sistema de Gestão SENAI

## Objetivo da Entrega

Nesta primeira entrega, as seguintes funcionalidades devem estar operando:

- CRUD completo de **Cursos**
- CRUD completo de **Unidades Curriculares (UCs)**
- CRUD completo de **Turmas**
- CRUD completo de **Instrutores**

**Fluxo esperado:**

- O cadastro de cursos é realizado na tela “Gestão de Cursos” com todos os detalhes necessários (incluindo UCs, dias letivos, carga horária, etc).
- UCs devem ser cadastradas primeiro em “Gestão de UCs” (são genéricas e independem do curso).
- Depois, na tela de cursos, cada curso pode vincular e configurar as UCs com dados específicos (dias, cargas horárias), pois uma mesma UC pode ser lecionada em diferentes cursos com cargas diferentes.

---

## Estrutura do Projeto

```
api/       # Endpoints e lógica backend em Python (FastAPI)
backend/   # Arquivos PHP que se comunicam com a API
assets/    # Imagens e arquivos estáticos
views/     # Telas (frontend) do sistema

```

---

## Como rodar o projeto

### **Pré-requisitos**

- [XAMPP (Apache + PHP)](https://www.apachefriends.org/index.html) instalado e rodando
- [Python 3.10+](https://www.python.org/downloads/) instalado e disponível no PATH
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) rodando localmente
- As bibliotecas Python abaixo instaladas (via `pip`):
    
    ```
    pip install fastapi uvicorn pymongo bcrypt python-dotenv "fastapi[all]"
    
    ```
    

---

### **1. Importando o banco de dados MongoDB**

1. **Baixe os arquivos `.json`** de todas as coleções (`usuario`, `unidade_curricular`, `turma`, `instrutor`, `instituicao`, `curso`, `convenio`, `calendario_academico`). 
    
    [Compact Files](https://drive.google.com/file/d/1RQeTc_9Ux6W5YoK9ws-AdZ2rU3zGVSzb/view?usp=sharing)
    
2. **Coloque este script e os arquivos `.json` na mesma pasta**:
    
    ```python
    import json
    from pymongo import MongoClient
    
    client = MongoClient("mongodb://localhost:27017/")
    db = client['alocacao_senai']
    
    colecoes = {
        "usuario": "alocacao_senai.usuario.json",
        "unidade_curricular": "alocacao_senai.unidade_curricular.json",
        "turma": "alocacao_senai.turma.json",
        "instrutor": "alocacao_senai.instrutor.json",
        "instituicao": "alocacao_senai.instituicao.json",
        "curso": "alocacao_senai.curso.json",
        "convenio": "alocacao_senai.convenio.json",
        "calendario_academico": "alocacao_senai.calendario_academico.json",
    }
    
    def converter_oid(obj):
        if isinstance(obj, dict):
            if '_id' in obj and isinstance(obj['_id'], dict) and '$oid' in obj['_id']:
                obj['_id'] = obj['_id']['$oid']
            for k, v in obj.items():
                obj[k] = converter_oid(v)
        elif isinstance(obj, list):
            obj = [converter_oid(i) for i in obj]
        return obj
    
    for nome_colecao, arquivo_json in colecoes.items():
        print(f'Importando {arquivo_json}...')
        with open(arquivo_json, encoding='utf-8') as f:
            dados = json.load(f)
            dados_convertidos = [converter_oid(item) for item in dados]
            db[nome_colecao].delete_many({})
            if dados_convertidos:
                db[nome_colecao].insert_many(dados_convertidos)
            print(f'Coleção {nome_colecao}: {len(dados_convertidos)} documentos inseridos.')
    
    print('Importação concluída!')
    
    ```
    
3. **Rode o script:**
    
    ```
    python nome_do_script.py
    
    ```
    

---

### **2. Rodando a API FastAPI**

1. **Navegue até a pasta do projeto e ative (opcional) o ambiente virtual:**
    
    ```
    python -m venv venv
    venv\Scripts\activate  # (Windows)
    # ou
    source venv/bin/activate  # (Linux/Mac)
    
    ```
    
2. **Inicie o servidor da API:**
    
    ```
    uvicorn main:app --reload
    
    ```
    
    - Por padrão estará acessível em [http://localhost:8000](http://localhost:8000/)
    - Documentação automática em http://localhost:8000/docs

---

### **3. Rodando o Frontend/PHP**

1. **Inicie o XAMPP** (Apache).
2. Coloque as pastas do projeto na raiz do `htdocs` (ou equivalente).
3. Acesse pelo navegador:
    
    ```
    http://localhost/<nome_da_pasta>/views/gestao_cursos.php
    
    ```
    
    *(ou outra tela desejada)*
    

---

### **4. Fluxo de Teste**

- Cadastrar uma **UC** em “Gestão de UCs”
- Cadastrar um **Curso** e atrelar UCs
- Cadastrar **Turmas** e **Instrutores**
- Testar todas as operações CRUD de cada módulo

---

### **Dicas**

- Qualquer problema de conexão com o MongoDB, **verifique se o serviço está rodando**.
- Use o `/docs` da FastAPI para explorar e testar endpoints da API.
- O projeto está preparado para rodar localmente, mas pode ser adaptado para servidores em produção facilmente.

---

### **Contato**

Lorrany Marim

**E-mail:** [lorranybatistaamorim@gmail.com](mailto:lorranybatistaamorim@gmail.com)

---

Se precisar de um modelo de `.env`, ou scripts de exemplo para teste da API, só pedir!
