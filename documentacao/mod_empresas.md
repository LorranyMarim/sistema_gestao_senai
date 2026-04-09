# Módulo de Gestão de Empresas
## 1. Contexto Geral

O módulo de **Gestão de Empresas** é responsável pelo cadastro e manutenção de organizações parceiras, fornecedoras ou clientes vinculadas ao SENAI. O ecossistema segue a mesma arquitetura dos demais módulos: o Frontend captura os dados e exibe as listagens, o `processa_empresa.php` atua como um *proxy* (middleware) filtrando as requisições, e a API Python (`rotas_empresa.py`) detém o controle absoluto sobre as validações de segurança e persistência no banco de dados.

---

## 2. Regras de Isolamento e Segurança (Multi-tenant)

Assim como nas Unidades Curriculares, os dados das Empresas são estritamente particionados por Instituição.

- **Listagem Isolada:** O endpoint de listagem (`GET`) injeta silenciosamente o `instituicao_id` do usuário logado (via token JWT) nos filtros do banco de dados. É impossível visualizar empresas cadastradas por outras unidades.
- **Escrita Blindada:** Durante a criação (`POST`), edição (`PUT`) ou exclusão (`DELETE`), qualquer tentativa do Frontend de ditar a qual instituição a empresa pertence é ignorada. O Backend Python **força a vinculação** da Empresa exclusivamente à instituição atrelada ao Token de quem disparou a requisição.
- **Invalidação de Cache:** Qualquer operação de alteração bem-sucedida (Criação, Edição ou Exclusão) aciona a função `invalidate_cache`, garantindo que os usuários daquela instituição recebam a listagem atualizada nas próximas requisições.

---

## 3. Regras de Dados e Validações Restritas

A integridade dos cadastros é mantida através de validações encadeadas entre Frontend e API.

| **Campo** | **Regras e Validações de Negócio** |
| --- | --- |
| `razao_social` | **Obrigatório.** Deve conter entre **3 e 150 caracteres**. Passa por limpeza de espaços nas extremidades (Trim). |
| `cnpj` | **Opcional.** Possui limite máximo de **20 caracteres**. *Nota de Negócio:* Atualmente o sistema aceita a digitação com ou sem máscara de pontuação e não exige cálculo matemático de dígito verificador na API, priorizando a flexibilidade do cadastro. |
| `status` | **Obrigatório.** Aceita apenas os valores **Ativo** ou **Inativo**. A API padroniza a primeira letra em maiúscula internamente. |
| `data_criacao` | **Sistema.** Data/Hora gerada pelo backend (UTC). É convertida para o fuso horário local no Frontend para exibição. |
- **Regra Anti-Injeção (Global):** A API Python submete todos os campos de texto a uma verificação de segurança (`FORBIDDEN_CHARS`). Se a Razão Social ou o CNPJ contiverem qualquer um dos caracteres `< > " ' ; { }`, a transação é **sumariamente bloqueada** e o salvamento é impedido.

---

## 4. Fluxos de Ação Principais

### 4.1. Fluxo de Criação de Empresa

1. O Frontend inicializa o formulário com o campo `status` **bloqueado e fixado como "Ativo"**. Não existe conceito de "cadastrar rascunho inativo"; toda nova empresa nasce ativa.
2. O formulário não é enviado se os requisitos mínimos de caracteres não forem cumpridos.
3. Se o Frontend não encontrar nenhuma Instituição associada ao usuário, o salvamento é bloqueado antes de chamar a API.

### 4.2. Fluxo de Edição

1. Ao editar, o sistema **habilita a edição do Status**, permitindo a inativação da Empresa.
2. **Proteção Histórica:** O arquivo `processa_empresa.php` intercepta o pacote de dados vindo do Frontend e aplica um comando `unset($data['data_criacao'])`. Isso garante que a data de criação original nunca seja sobrescrita durante uma edição, protegendo a trilha do registro.

### 4.3. Fluxo de Exclusão

1. A exclusão é do tipo **Hard Delete** (remoção definitiva do banco de dados).
2. O sistema exige uma dupla confirmação do usuário (via *confirm* no Frontend).
3. A API Python certifica que a empresa a ser excluída pertence *exatamente* à instituição do usuário antes de processar o comando.

---

## 5. Filtros e Listagem (Business Explorer)

O motor de busca permite a localização rápida e filtragem em múltiplos eixos:

- **Busca Livre (`q`):** Uma única barra de pesquisa no Frontend verifica simultaneamente correspondências na **Razão Social** OU no **CNPJ** utilizando *Regex* de forma *case-insensitive* (ignora maiúsculas/minúsculas).
- **Filtro Temporal:** Permite buscar empresas cadastradas num intervalo ("Data De" até "Data Até"). O Frontend se certifica de fechar as pontas do dia (`00:00:00` até `23:59:59`) para buscar o dia completo.
- **Paginação Backend:** Independente do tamanho da base, o sistema limita o tráfego de dados. Por regra de negócio na API, nenhuma requisição devolve mais de **100 registros por página**, protegendo a estabilidade do sistema contra requisições maliciosas.

---

## 6. Diagrama de Fluxo (Trilha de Salvamento)

```markdown
sequenceDiagram
    autonumber
    actor Admin as Usuário
    participant UI as Frontend (JS)
    participant PHP as Middleware (PHP)
    participant API as API Python
    participant DB as MongoDB

    Admin->>UI: Insere Razão Social, CNPJ e clica em Salvar
    UI->>UI: Verifica campos obrigatórios e seleciona a Instituição vinculada
    alt Validação UI Falhou
        UI-->>Admin: Exibe alertas de formulário inválido
    else Dados OK
        UI->>PHP: Dispara POST/PUT com o payload
        PHP->>PHP: Se for Edição, remove 'data_criacao' do pacote
        PHP->>API: Repassa Requisição com Token JWT
        API->>API: Roda Anti-XSS (Rejeita < > " ' ; { })
        alt Caracteres Proibidos Detectados
            API-->>PHP: Erro de Validação (HTTP 422)
            PHP-->>UI: Exibe Alerta
        else Dados Seguros
            API->>API: Injeta e Trava 'instituicao_id' extraído do Token
            API->>DB: Executa Insert ou Update no Banco
            DB-->>API: Confirmação da Transação
            API->>API: Destrói o Cache atual da Instituição (Invalidação)
            API-->>PHP: Sucesso (HTTP 200/201)
            PHP-->>UI: Resposta limpa
            UI->>API: Dispara novo carregamento da lista
            UI-->>Admin: Fecha Modal e Exibe Nova Linha na Tabela
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

### 3. Módulo de Gestão de Empresas

- **Padronização do Payload:** Remover o `unset($data['data_criacao'])` do arquivo `processa_empresa.php`. Criar um `EmpresaUpdateSchema` no Python/Pydantic que simplesmente não contenha o campo `data_criacao`, ignorando qualquer tentativa de injeção externa.
- **Validação de CNPJ:** Atualmente o CNPJ é opcional e aceita qualquer coisa até 20 caracteres. Implementar no Python um validador matemático real do dígito verificador do CNPJ para garantir a consistência dos dados de parceiros.