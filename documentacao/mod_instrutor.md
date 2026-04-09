# Módulo de Gestão de Instrutores

## 1. Contexto Geral

O módulo de **Gestão de Instrutores** é o núcleo de administração do corpo docente. Ele controla não apenas os dados cadastrais e contratuais dos professores, mas também a sua carga horária, disponibilidade de turnos e, crucialmente, o seu **Mapa de Competências** (quais Unidades Curriculares o instrutor está habilitado a lecionar).

A arquitetura opera em três camadas: o Frontend (`instrutores_script.js`) captura e pré-valida as regras visuais; o Middleware PHP (`processa_instrutor.php`) atua como proxy e filtro de segurança histórica; e a API Python (`rotas_instrutor.py`) atua como a fonte da verdade, blindando o banco de dados.

---

## 2. Regras de Isolamento Multi-tenant

A regra base do sistema garante que uma Instituição jamais tenha acesso ao corpo docente de outra.

- **Filtro de Leitura (`GET`):** A listagem de instrutores é inerentemente vinculada ao Token do usuário ativo. A API Python impõe `ctx.inst_oid` em todas as buscas.
- **Filtro de Escrita (`POST`/`PUT`/`DELETE`):** Qualquer tentativa do Frontend de declarar a qual instituição o instrutor pertence é sumariamente descartada. A API injeta o ID da instituição baseada no usuário logado.
- **Invalidação de Cache:** Alterações bem-sucedidas no cadastro de qualquer instrutor disparam o gatilho `invalidate_cache`, forçando todos os usuários daquela instituição a receberem os dados mais recentes na próxima consulta.

---

## 3. Dicionário de Dados e Validações (Campos de Negócio)

O cadastro do Instrutor obedece a regras estritas de preenchimento, atuando tanto no Frontend quanto na API para garantir a consistência das informações contratuais.

| **Campo** | **Regras e Validações** |
| --- | --- |
| `nome` | **Obrigatório.** Mínimo de 2 e máximo de 100 caracteres. |
| `matricula` | **Opcional.** Máximo de 50 caracteres. |
| `categoria` | **Obrigatório.** Classificação do profissional. O Frontend restringe a **"A"** ou **"C"**. |
| `tipo_contrato` | **Obrigatório.** Define o vínculo legal. Restrito a: **Efetivo**, **Empréstimo** ou **RPA**. |
| `carga_horaria` | **Obrigatório.** Aceita exclusivamente cargas predefinidas: **20**, **30** ou **40** horas. |
| `area` | **Opcional.** Matriz de atuação. Múltipla seleção (Ex: Automação, Gestão, Tecnologia da Informação). Salvo como lista de textos. |
| `status` | **Obrigatório.** Restrito a **Ativo** ou **Inativo**. A API padroniza a capitalização automaticamente. |

### 3.1. Regra Especial de Turno

- **Restrição de Disponibilidade:** O campo `turno` (Manhã, Tarde, Noite) possui uma regra de negócio cruzada. O sistema **exige no mínimo 1 turno selecionado e permite no máximo 2 turnos**.
- Se o usuário tentar enviar 0 ou 3 turnos, o JS bloqueia o envio exibindo um alerta ("Selecione no mínimo 1 e no máximo 2 turnos"). A API Python possui a mesma trava de segurança (`min_items=1, max_items=2`).

### 3.2. Regra do Mapa de Competências (Vínculo com UCs)

- **Busca Dinâmica:** O `mapa_competencias` é alimentado assincronamente pelo módulo de UCs (`processa_ucs.php`).
- **Regra de Atividade:** O sistema só permite que um instrutor seja vinculado a Unidades Curriculares que estejam com o status **Ativo**.
- O Banco de Dados não armazena os nomes das UCs no cadastro do instrutor, mas sim uma lista de referências (`ObjectId`), garantindo a integridade relacional.

### 3.3. Regra Global Anti-XSS

- Todos os dados de texto trafegados passam pelo filtro `FORBIDDEN_CHARS`. Caracteres como `< > " ' ; { }` resultam em bloqueio imediato (422 Unprocessable Entity) na API.

---

## 4. Fluxos Principais de Ação

### 4.1. Fluxo de Criação

1. Ao abrir a interface de cadastro, o Frontend **fixa o `status` como Ativo e desabilita a alteração**. Novos instrutores não podem nascer Inativos.
2. Após validar as regras de Turno (1 a 2 seleções) e Carga Horária, os IDs das UCs selecionadas são empacotados.
3. A API salva o registro atrelando a `data_criacao` via fuso horário UTC e vincula à Instituição de origem.

### 4.2. Fluxo de Edição e Proteção Histórica

1. Na edição, o campo `status` é **liberado**, permitindo a inativação do profissional.
2. O arquivo PHP (`processa_instrutor.php`) funciona como um escudo: ele ativamente retira a variável `data_criacao` (`unset`) do pacote JSON antes de enviá-lo ao Python. Isso inviabiliza que usuários mal-intencionados adulterem a data original de entrada do instrutor na instituição.

### 4.3. Regra de Retenção de Cadastro (Exclusão Bloqueada)

Diferente das UCs ou Empresas, a exclusão de Instrutores obedece a uma regra de negócio focada em **Retenção de Histórico**:

- Embora a API Python possua a capacidade técnica de deletar o registro (`router.delete`), o Frontend intercepta o clique no botão "Excluir" e aciona um bloqueio definitivo.
- O sistema exibe o alerta: *"O instrutor não pode ser removido. Apenas mude o status do instrutor para Inativo para que ele não apareça mais como uma opção"*. A ação de deleção física é **estritamente proibida pela interface**.

---

## 5. Diagrama de Fluxo (Criação de Instrutor e Validação de Turnos)

```markdown
sequenceDiagram
    autonumber
    actor Pedagogo as Usuário
    participant UI as Frontend (JS)
    participant PHP as Middleware (PHP)
    participant API as API Python
    participant DB as MongoDB

    Pedagogo->>UI: Preenche dados (Nome, Carga Horária) e clica em Salvar
    UI->>UI: Seleciona Turnos (Ex: Manhã, Tarde, Noite)
    UI->>UI: Verifica Regra de Turnos (1 a 2 seleções)
    alt Regra de Turno Violada (ex: 3 turnos)
        UI-->>Pedagogo: Alerta: "Selecione no mínimo 1 e no máximo 2 turnos"
    else Regra Validada
        UI->>PHP: Envia POST do Instrutor com IDs das UCs (Competências)
        PHP->>API: Repassa requisição com Token JWT
        API->>API: Roda Sanitização (Filtra < > " ' ; { })
        API->>API: Valida formato da lista de Competências e converte para ObjectId
        API->>DB: Injeta 'instituicao_id' e salva novo Instrutor
        DB-->>API: Retorna Sucesso da Inserção
        API->>API: Aciona Invalidação de Cache da Instituição
        API-->>PHP: HTTP 200/201 (Sucesso)
        PHP-->>UI: Retorno Limpo
        UI->>UI: Fecha Modal, exibe Loader e busca tabela atualizada
        UI-->>Pedagogo: Instrutor cadastrado com sucesso
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

### 4. Módulo de Instrutores

- **Fechamento da Rota de Delete:** A exclusão está proibida pelo Frontend, mas a API Python continua com a rota `.delete()` aberta. Isso é um risco grave. A rota de exclusão física deve ser removida do código Python; a única forma de remover um instrutor deve ser via rota de `PUT/PATCH` alterando o status para Inativo.
- **Consistência de Mapa de Competências:** Garantir que, ao inativar uma UC no módulo de UCs, os instrutores que tinham aquela competência vinculada não causem quebra de integridade (ex: tentar exibir o nome de uma UC que não existe mais no cache).