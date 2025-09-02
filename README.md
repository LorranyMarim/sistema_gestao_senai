
# Sistema de Gestão SENAI

## Descrição

Este projeto é um **sistema de gestão acadêmica** que integra **FastAPI** (Python) e **PHP** para o gerenciamento da coordenação de cursos do Senai em Betim.
Ele utiliza **MongoDB Atlas** como banco de dados na nuvem, garantindo escalabilidade e segurança.

---

## Requisitos

- **XAMPP**
- **Python 3.10+**
- **PHP 8.0+**
- **MongoDB Atlas** 
- **Bibliotecas Python**:
  - fastapi
  - uvicorn
  - pymongo
  - python-jose
  - bcrypt
  - python-dotenv

---

## Instalação

### 1. Clonar o repositório
```bash
git clone https://github.com/LorranyMarim/sistema_gestao_senai.git
cd seu-repositorio
```
### 2. Instalar dependências
```bash
pip install -r requirements.txt
```
---

## Arquivo `requirements.txt`
```
fastapi
uvicorn
pymongo
python-jose
bcrypt
python-dotenv
```
---

# Execução do Projeto:

#### Banco de Dados: O sistema usa MongoDB Atlas. No arquivo `api/db.py` a URL padrão já está configurada. A base de dados se chama "senai_betim_bd". Para acessar a base de dados é necessário:
#### 1. fazer download do mongo 
#### 2. criar um cluster com o nome "senai_betim_bd" 
#### 3. Crie as coleções com os nomes: calendario, curso, empresa, instituicao, instrutor, turma, unidade_curricular, usuario.
#### 4. Popule cada coleção clicando em 'Add Data'>'Import JSON or CSV file' e selecione o arquivo referente a coleção localizado na pasta 'base_dados_json'

## 1º Passo: Executando o Painel XAMPP
1. Faça o clone do projeto ou baixe o arquivo .zip
2. Coloque os arquivos do projeto dentro de `htdocs`
3. Acesse no navegador:
```
http://localhost/seu-projeto/views/index.php
```


## 2º Passo: Executando o Backend (API)
Dentro da pasta do projeto, dentro da pasta 'api', abra o terminal e rode o código abaixo:
```bash
uvicorn api.main:app --reload
```
A API estará disponível em:
```
http://127.0.0.1:8000
```



## Login: admin
## Senha: 1234
