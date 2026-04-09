# Módulo de Gestão de Unidades Curriculares (UCs)
## 1. Contexto Geral

O módulo de **Gestão de Unidades Curriculares** permite gerenciar o catálogo de disciplinas (UCs) ofertadas pelo SENAI. Ele engloba a listagem, criação, edição e exclusão de UCs, além de contar com um sistema de filtros avançados. O tráfego de informações passa pelo Frontend, é intermediado pelo `processa_ucs.php` e processado de forma definitiva pela API Python (`rotas_uc.py`).

---

## 2. Regras de Acesso e Isolamento Institucional (Multi-tenant)

A principal regra de segurança do módulo garante que os dados de diferentes unidades/instituições do SENAI não se misturem:

- **Isolamento de Visibilidade:** A listagem de UCs (`GET`) filtra obrigatoriamente os registros utilizando o `instituicao_id` extraído do Token de Sessão do usuário logado. Um usuário jamais verá UCs de outra instituição.
- **Isolamento de Escrita:** Em qualquer operação de **Criação**, **Edição** ou **Exclusão**, a API ignora qualquer tentativa do Frontend de informar a qual instituição a UC pertence. O sistema injeta ou valida a requisição com base **estritamente no ID da Instituição vinculado ao usuário no backend**.
- **Imutabilidade de Origem:** Não é possível transferir uma UC de uma instituição para outra. Ao editar um registro, o backend sobrescreve o campo `instituicao_id` para garantir que ele permaneça na instituição atual.

---

## 3. Dicionário de Dados e Validações Restritas

As regras de validação aplicadas aos campos formam a principal barreira de integridade do módulo. Elas ocorrem em duas camadas (Frontend e Backend):

| **Campo** | **Validações e Regras de Negócio** |
| --- | --- |
| `descricao` (Descrição) | Obrigatório. O Frontend exige mínimo de **4 caracteres** (a API aceita a partir de 2) e o limite máximo é de **100 caracteres**. Os espaços nas extremidades são removidos (Trim). |
| `tipo_uc` (Tipo) | Obrigatório. Aceita exclusivamente os valores: **EAD**, **Teórica**, **Prática** ou **Teórica 70% - Prática 30%**. |
| `status` | Obrigatório. Aceita apenas **Ativo** ou **Inativo**. O sistema capitaliza a primeira letra automaticamente no backend. |
| `data_criacao` | Campo Sistêmico. Gerado automaticamente pelo servidor em formato UTC. Não pode ser enviado, editado ou manipulado pelo usuário. |
- **Regra Global Anti-Injeção:** Antes de salvar qualquer UC, a API Python varre os campos de texto aplicando um filtro rigoroso (`FORBIDDEN_CHARS`). Se qualquer campo contiver os caracteres `< > " ' ; { }`, o salvamento é **bloqueado** (retornando erro de validação).

---

## 4. Fluxos de Ação Principais

### 4.1. Regras de Criação de UC

1. Ao abrir o modal de cadastro, o Frontend **trava o status como Ativo**. Não é permitido criar uma Unidade Curricular que já nasça Inativa.
2. O sistema verifica se há instituições disponíveis no contexto (`bootstrap`). Se o usuário não tiver nenhuma instituição atrelada (uma falha grave de integridade), o Frontend bloqueia o salvamento e exibe um erro sistêmico.
3. Ao salvar no banco, o sistema dispara a regra de **Invalidação de Cache** (`invalidate_cache`), forçando que as próximas consultas desta instituição busquem os dados frescos e atualizados.

### 4.2. Regras de Edição de UC

1. Na edição, o campo `status` é **desbloqueado**, permitindo a inativação da UC.
2. O middleware PHP remove ativamente o campo `data_criacao` do payload enviado ao Python, atuando como uma camada extra de proteção contra adulteração do histórico.
3. Se a edição ocorrer com sucesso, o Cache da instituição é invalidado.

### 4.3. Regras de Exclusão de UC

1. **Exclusão Física (Hard Delete):** Diferente do módulo de usuários (onde a exclusão não existe e usa-se inativação), para as UCs o sistema realiza a **exclusão definitiva** no banco de dados (`delete_one`).
2. O botão de exclusão exige dupla confirmação no Frontend.
3. A exclusão só se concretiza na API se o ID da UC pertencer à instituição do usuário logado.

---

## 5. Regras Globais e Comportamentos de Tela

- **Tratamento de Resiliência (Fallback):** Todo o tráfego de rede gerido pelo `geral_script.js` possui tratamento centralizado. Se a API Python cair ou retornar **Erro 500**, o usuário é redirecionado automaticamente para uma tela de `erro_500.php`. Se a API barrar algo por regra não atendida estruturalmente (Erro 400), ocorre redirecionamento para `erro_400.php`. Sessões expiradas (401) derrubam o usuário de volta para o login.
- **Filtros Acumulativos:** A listagem permite buscar UCs combinando:
    - Termo livre (que busca via *Regex* tanto na `descricao` quanto no `tipo_uc`).
    - Data de Criação (filtrando obrigatoriamente por um intervalo "De / Até").
    - Status e Tipo exato.
- **Paginação Limitada:** Para evitar sobrecarga no banco, a API limita a quantidade de itens por página a um **máximo de 100**, independente de qualquer manipulação de URL feita por usuários mal-intencionados.

---

## 6. Diagrama de Fluxo de Salvamento (Criar/Editar UC)

```markdown
sequenceDiagram
    autonumber
    actor User as Usuário (Pedagogo/Admin)
    participant UI as Frontend (JS)
    participant PHP as Middleware (PHP)
    participant API as API Python
    participant DB as MongoDB

    User->>UI: Preenche os dados da UC e Clica em Salvar
    UI->>UI: Valida campos obrigatórios, tamanho mínimo e seleciona Instituição
    alt Falha no Frontend
        UI-->>User: Bloqueia envio (Alerta visual em tela)
    else Sucesso Frontend
        UI->>PHP: Envia POST / PUT do payload (JSON)
        PHP->>PHP: Poda campo 'data_criacao' em caso de Edição (PUT)
        PHP->>API: Repassa chamada (cURL)
        API->>API: Bloqueia caracteres proibidos (< > " ' ; { })
        alt Caracteres Inválidos (XSS Risk)
            API-->>PHP: HTTP 422 - Unprocessable Entity
            PHP-->>UI: Erro traduzido (Alerta)
        else Dados Válidos
            API->>API: Sobrescreve 'instituicao_id' com ID extraído do Token
            API->>DB: Salva ou Atualiza Registro (Atrelando o Data/Hora UTC)
            DB-->>API: Confirmação de Gravação
            API->>API: Invalida o Cache da Instituição no Servidor
            API-->>PHP: HTTP 200/201 (Sucesso)
            PHP-->>UI: Resposta limpa
            UI->>UI: Fecha o modal, Busca dados frescos e atualiza Tabela
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

### 2. Módulo de Gestão de Unidades Curriculares (UCs)

- **Refatorar Exclusão:** Mudar de `delete_one` (Hard Delete) para inativação de status (*Soft Delete*). Se uma UC já foi lecionada, ela jamais deve sumir do banco de dados.
- **Remover Bloqueio de Caracteres (`FORBIDDEN_CHARS`):** Retirar a trava de HTTP 422 para caracteres especiais. Garantir que o JS/React utilize métodos seguros de renderização (como `textContent` ao invés de `innerHTML`) para evitar XSS.
- **Delegar Validação ao Pydantic:** Remover as regras de "mínimo 4 caracteres" espalhadas entre JS e a API. O modelo Pydantic deve ser a fonte única da verdade para validações de *schema*.

###