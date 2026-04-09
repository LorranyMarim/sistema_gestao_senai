# Módulo de Gestão de Cursos

## 1. Contexto Geral

O módulo de **Gestão de Cursos** é o componente central para a estruturação acadêmica da instituição. Ele permite não apenas o cadastro básico de um curso (nome, tipo, carga horária), mas também gerencia a sua grade curricular através de uma regra complexa de **Parametrização de Unidades Curriculares (UCs)**.

A arquitetura do módulo garante que os dados informados no Frontend (`curso_script.js`) passem pelo intermediário (`processa_curso.php`) e sejam rigorosamente validados e associados no Backend (`rotas_curso.py`), garantindo a integridade relacional entre Cursos e UCs no Banco de Dados.

---

## 2. Regras de Isolamento e Segurança (Multi-tenant)

Assim como nos módulos estruturais anteriores, o isolamento dos dados é estritamente garantido por instituição:

- **Isolamento de Escopo:** Todas as requisições de listagem (`GET`), criação (`POST`), edição (`PUT`) e exclusão (`DELETE`) injetam o `instituicao_id` extraído automaticamente do Token JWT do usuário. Um usuário só interage com os cursos da sua própria unidade.
- **Invalidação de Cache Sistêmico:** Qualquer alteração na base de cursos (Inserção, Atualização ou Exclusão) aciona o gatilho `invalidate_cache`, forçando a atualização imediata dos dados para todos os usuários daquela instituição.
- **Tratamento Global de Falhas:** O sistema possui barreiras de proteção de rede. Se o usuário estiver offline, a ação é bloqueada. Se a API retornar um Erro 400 (Bad Request) ou 500+ (Internal Error), o usuário é imediatamente redirecionado para telas de erro amigáveis (`erro_400.php` ou `erro_500.php`), prevenindo a quebra silenciosa da interface.

---

## 3. Dicionário de Dados e Validações Restritas

As regras de integridade do formulário combinam limitações do Frontend com validações do modelo `Pydantic` no Backend Python.

| **Campo** | **Regras de Negócio e Validações** |
| --- | --- |
| `nome_curso` | **Obrigatório.** Deve conter entre **2 e 200 caracteres**. |
| `modalidade_curso` | **Obrigatório.** Restrito às opções: *Aperfeiçoamento, Aprendizagem Industrial, Qualificação Profissional, Técnico, Iniciação Profissional, Extensão*. |
| `tipo_curso` | **Obrigatório.** Restrito às opções: *EAD, Presencial, Semipresencial, Trilhas nas Escolas*. |
| `area_tecnologica` | **Obrigatório.** Requer no mínimo **1 área selecionada**.
*Regra de Interface:* Embora o componente visual seja um "multiselect", existe uma trava no Frontend que **força a seleção única**, desmarcando a opção anterior se uma nova for clicada. |
| `carga_total_curso` | **Obrigatório.** Deve ser um número decimal maior ou igual a zero (ex: `1200.00`). O Frontend impede a digitação de letras, aceitando apenas números e ponto. |
| `status` | **Obrigatório.** Restrito a **Ativo** ou **Inativo**. Internamente capitalizado pela API. |
| `observacao_curso` | **Opcional.** Campo de texto livre para anotações pedagógicas. |
- **Regra Anti-Injeção (Global):** Todos os campos de texto descritos acima passam pelo filtro `FORBIDDEN_CHARS`. Se qualquer campo contiver `< > " ' ; { }`, a requisição é sumariamente recusada (HTTP 422).

---

## 4. Regra Central: Parametrização da Grade Curricular

O coração do módulo é a forma como o curso se relaciona com as Unidades Curriculares (UCs). Diferente de um simples vínculo, o sistema exige uma **Parametrização Bilateral**.

- **Vínculo Obrigatório:** Um curso não pode ser salvo sem conter pelo menos **1 Unidade Curricular selecionada**. O Frontend barra o envio se a lista estiver vazia.
- **Mapa de Distribuição de Carga:** Ao selecionar as UCs, o sistema obriga o preenchimento de um detalhamento de horas para *cada* disciplina vinculada. O banco de dados salva um objeto (Dicionário) onde a chave é o ID da UC e o valor é a carga distribuída:
    - **Presencial:** `carga_presencial` (Decimal), `aulas_presencial` (Inteiro), `dias_presencial` (Inteiro).
    - **EAD:** `carga_ead` (Decimal), `aulas_ead` (Inteiro), `dias_ead` (Inteiro).
- **Consolidação de Nomes (Backend):** O banco de dados salva apenas os IDs e os números de horas no documento do Curso. Na hora de listar os cursos, a API Python faz uma varredura nas UCs referenciadas e injeta dinamicamente o nome correto de cada disciplina para o Frontend exibir.

---

## 5. Fluxos de Ação Principais

### 5.1. Fluxo de Criação (Salvar & Parametrizar)

O processo de criação ocorre em **duas etapas visuais**:

1. O usuário preenche os dados básicos do curso e seleciona as UCs no formato lista. **O status é travado como "Ativo"**.
2. Ao clicar em "Salvar & Parametrizar", o sistema valida os dados obrigatórios e abre um **Segundo Modal Sobreposto (Acordeão)**.
3. O usuário preenche o detalhamento de horas/dias para cada UC selecionada.
4. Ao confirmar a parametrização, o JSON consolidado (Dados do Curso + Dicionário de UCs) é disparado para a API Python, que o insere atrelando a data de criação no formato UTC.

### 5.2. Fluxo de Edição e Proteção Histórica

1. Durante a edição, o campo **Status é destravado**, permitindo inativar o curso.
2. O usuário pode adicionar novas UCs (que iniciarão com carga zerada para serem preenchidas) ou remover UCs existentes (que serão excluídas do dicionário de parametrização).
3. **Escudo Histórico:** O middleware PHP (`processa_curso.php`) atua interceptando o JSON do Frontend e executa um `unset($data['data_criacao'])`. Na camada Python, o comando `data.pop('data_criacao', None)` reforça a regra. Isso garante que é impossível alterar a data de criação original do curso via requisição PUT.

### 5.3. Fluxo de Exclusão (Hard Delete)

1. O sistema permite a exclusão física do registro do banco de dados (`delete_one`).
2. É exigida a confirmação do usuário ("Deseja realmente excluir o curso X?").
3. A operação é validada via escopo de instituição na API.

---

## 6. Diagrama do Fluxo de Parametrização e Gravação

```markdown
sequenceDiagram
    autonumber
    actor Coordenador as Usuário
    participant UI as Frontend (curso_script.js)
    participant ModalParam as Modal Parametrização
    participant API as API Python
    participant DB as MongoDB

    Coordenador->>UI: Preenche dados do Curso e seleciona 2 UCs
    Coordenador->>UI: Clica em "Salvar & Parametrizar"
    UI->>UI: Valida campos obrigatórios (Mínimo 1 Área e 1 UC)
    alt Falha na Validação Básica
        UI-->>Coordenador: Exibe Alerta ("Selecione ao menos...")
    else Dados Básicos OK
        UI->>ModalParam: Abre Acordeão de Parametrização
        Coordenador->>ModalParam: Digita Carga Horária, Aulas e Dias para cada UC
        Coordenador->>ModalParam: Clica em "Confirmar Parametrização"
        ModalParam->>UI: Consolida Payload (Curso + Dicionário de UCs)
        UI->>API: POST / PUT via Middleware PHP
        API->>API: Valida Payload Pydantic e Anti-XSS (< > " ' ; { })
        alt Caracteres Inválidos (Erro 422)
            API-->>UI: Exibe Alerta de Erro de Validação
        else Sucesso
            API->>DB: Injeta 'instituicao_id' e Salva Registro
            DB-->>API: Confirma Gravação
            API->>API: Invalida Cache da Instituição
            API-->>UI: Sucesso (HTTP 200)
            UI-->>Coordenador: Fecha os Modais e Atualiza Tabela de Cursos
        end
    end
```

---

### Análise Comparativa de Padrões Arquiteturais

**1. A Inconsistência do Padrão de Exclusão (Soft Delete vs. Hard Delete)**

- **Usuários e Instrutores:** Utilizam a inativação (*Soft Delete*). No caso de Instrutores, a rota de `DELETE` até existe no Python, mas o Frontend bloqueia o clique. Isso é uma falha de design: a segurança está baseada na interface (JS) e não na API.
- **UCs, Empresas e Cursos:** Utilizam *Hard Delete* (`delete_one` no MongoDB). Em um sistema acadêmico altamente relacional, apagar um Curso ou uma UC fisicamente destruirá o histórico de turmas passadas, certificados emitidos e alunos formados. O padrão deveria ser *Soft Delete* universal.

**2. A Armadilha do Filtro Anti-XSS Global (`FORBIDDEN_CHARS`)**

- **Todos os novos módulos:** Bloqueiam os caracteres `< > " ' ; { }` na API Python retornando HTTP 422.
- **O Problema:** Essa abordagem (*Input Blocking* por lista restritiva) é frágil e hostil ao usuário. Uma empresa com aspas na razão social (ex: `Livraria d'Ávila`), ou um professor tentando colocar um exemplo de código (JSON/HTML) na "observação do curso" serão bloqueados. A proteção contra injeção não se faz proibindo caracteres na entrada, mas sim usando parametrização no MongoDB e *Output Encoding* no Frontend no momento da exibição.

**3. Proteção de Payload (*Mass Assignment*) Delegada ao PHP**

- **O Problema:** Para proteger o campo `data_criacao` de ser alterado via requisição `PUT`, os módulos de Empresas, Instrutores e Cursos usam o PHP para dar `unset($data['data_criacao'])`. O módulo de Cursos faz isso no PHP e também no Python (`data.pop`).
- **O Padrão Correto:** O PHP não deveria inspecionar ou alterar o *payload* de negócio. Quem dita a estrutura do dado é o Python. O uso do **Pydantic** no Python deve garantir que campos *ReadOnly* sejam ignorados no *update*, centralizando a regra de negócio na API.

---

### Plano de Ação por Módulo

### 5. Módulo de Gestão de Cursos

- **Proteção Transacional na Parametrização:** A inserção do Curso e do Dicionário de UCs (com suas cargas horárias) ocorre no mesmo *payload*. Garantir que a API Python grave isso dentro de uma **Transaction do MongoDB** (caso use Replica Set). Se ocorrer erro ao gravar a distribuição de carga presencial/EAD, o curso inteiro deve sofrer *rollback* para evitar dados órfãos.
- **Centralização da Regra de Instância:** O PHP também está fazendo `unset` aqui. Remover essa responsabilidade do PHP.
- **Migrar Exclusão para Soft Delete:** Da mesma forma que as UCs, Cursos nunca devem sofrer Hard Delete devido ao impacto direto no histórico acadêmico dos alunos formados.