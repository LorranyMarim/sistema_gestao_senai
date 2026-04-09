# Módulo de Configuração de Usuários

## 1. Contexto Geral

O módulo de **Configuração de Usuários** é responsável pela gestão de acessos e perfis das pessoas que utilizam o sistema do SENAI. Ele abrange a listagem, criação, edição, inativação e troca de senhas dos usuários.

O fluxo técnico opera com o Frontend (HTML/JS) capturando as interações, repassando para um intermediário em PHP (`processa_usuarios.php`), que atua apenas como um *proxy*, enviando a requisição final para a API em Python (`rotas_usuario.py`), responsável por validar as regras e persistir os dados no Banco de Dados (MongoDB).

---

## 2. Atores e Matriz de Permissões

O sistema possui três níveis de acesso baseados na variável `tipo_acesso`: **Administrador**, **Instrutor** e **Pedagogo**. As regras de visibilidade e ação são estritamente controladas pelo Backend e refletidas no Frontend.

| **Ação / Funcionalidade** | **Administrador** | **Instrutor / Pedagogo** |
| --- | --- | --- |
| **Visualizar Lista de Usuários** | Vê todos os usuários da sua Instituição | Vê **apenas** o seu próprio perfil |
| **Criar Novo Usuário** | Permitido | **Bloqueado** (Botão oculto / API recusa) |
| **Editar Outros Usuários** | Permitido | **Bloqueado** |
| **Editar Próprio Perfil** | Permitido | Permitido (Com restrições) |
| **Alterar `tipo_acesso`** | Permitido | **Bloqueado** (Campo desabilitado) |
| **Alterar `status` (Inativar)** | Permitido | **Bloqueado** (Campo desabilitado) |
| **Alterar Senha** | De qualquer usuário | Apenas a própria senha |
| **Excluir Usuário** | **Não existe exclusão sistêmica** | **Não existe exclusão sistêmica** |

> **Regra de Exclusão:** Nenhum ator tem permissão para apagar um registro do Banco de Dados. A exclusão definitiva é bloqueada. Se o usuário clicar no botão de excluir, o sistema exibe um alerta informando que o cadastro deve ser alterado para o status **Inativo** via tela de edição.
> 

---

## 3. Regras de Dados e Validações (Campos)

Tanto o Frontend quanto a API garantem a integridade dos dados através das seguintes regras:

- `nome`: Deve ter no mínimo 3 e no máximo 100 caracteres. É convertido automaticamente para letras **MAIÚSCULAS** no Frontend durante a digitação.
- `user_name` (E-mail / Login):
    - Deve respeitar o formato de e-mail padrão.
    - **Unicidade:** É validado no Banco de Dados através do campo `user_name_lc`. O sistema não permite o cadastro de dois usuários com o mesmo e-mail.
    - O Backend salva o e-mail sempre em letras minúsculas.
- `senha`:
    - Deve ter no mínimo 6 e no máximo 50 caracteres.
    - Frontend obriga a digitação dupla (Confirmação de Senha) para garantir igualdade antes do envio.
    - A senha trafega e é salva no Banco de Dados em formato de **Hash Criptografado**, nunca em texto plano.
- `instituicao_id`: Campo sistêmico. Todo usuário é obrigatoriamente vinculado à instituição do usuário que o cadastrou.
- `status`: Possui apenas dois estados aceitos: **Ativo** ou **Inativo**.
- **Trilha de Auditoria:** O sistema gera e atualiza automaticamente os campos sistêmicos `data_criacao`, `alterado_em` e `alterado_por` (ID de quem realizou a ação) a cada inserção ou atualização.

---

## 4. Fluxos de Negócio Principais

### 4.1. Fluxo de Criação de Usuário

1. O ator **Administrador** preenche os dados obrigatórios e a senha inicial do novo usuário.
2. O Frontend força o status inicial como **Ativo** (desabilitado para mudança na criação).
3. Ao salvar, a API verifica o nível de acesso do autor da requisição. Se não for **Administrador**, recusa a ação.
4. A API valida a unicidade do e-mail. Se já existir no Banco de Dados, retorna erro: *"E-mail já está sendo utilizado."*
5. Se válido, o sistema atrela o `instituicao_id` do criador ao novo usuário, aplica o Hash na senha e salva o registro gerando a Trilha de Auditoria.

### 4.2. Fluxo de Login e Segurança Anti-Força Bruta

Quando um usuário tenta acessar a plataforma, a API (`rotas_usuario.py`) impõe regras rígidas antes de liberar a autenticação:

1. **Regra de Bloqueio (Força Bruta):** O sistema monitora o IP do usuário (via Redis). Se ocorrerem **5 tentativas falhas** (`MAX_ATTEMPTS`) consecutivas de login, o IP é **bloqueado por 5 minutos** (`LOCK_MINUTES`).
2. **Regra de Status:** Após validar a senha, o sistema verifica o `status`. Se o status for **Inativo**, o acesso é negado (HTTP 403) com a mensagem: *"Usuário inativado na plataforma..."*.
3. **Regra de Múltiplas Instituições:** Se o usuário pertencer a mais de uma instituição (`instituicoes_ids`), ele deve explicitamente informar qual deseja acessar durante o login, caso contrário a API exige a seleção de uma instituição válida.

---

## 5. Diagrama de Fluxo (Criação e Edição de Usuário)

Snippet de código

```markdown
sequenceDiagram
    autonumber
    actor Admin as Usuário (Admin)
    participant UI as Frontend (JS)
    participant API as API Python
    participant DB as Banco de Dados

    Admin->>UI: Preenche formulário e clica em Salvar
    UI->>UI: Valida formato de E-mail, Min. Caracteres e Igualdade de Senhas
    alt Validação Frontend Falhou
        UI-->>Admin: Exibe Alerta de Erro
    else Validação Frontend OK
        UI->>API: POST/PUT Dados do Usuário
        API->>API: Valida Permissão (É Administrador? Ou é edição do próprio perfil?)
        alt Permissão Negada ou Tentativa Ilegal
            API-->>UI: Erro 403 (Acesso Negado)
        else Permissão OK
            API->>DB: Busca por 'user_name_lc' (E-mail já existe?)
            alt E-mail Duplicado
                DB-->>API: Retorna Conflito
                API-->>UI: Erro 400 (E-mail já utilizado)
            else Dados Válidos
                API->>API: Aplica Hash na Senha (se houver) e Injeta Auditoria
                API->>DB: Persiste Registro vinculado à Instituição
                DB-->>API: Confirma Gravação
                API-->>UI: Sucesso (200/201)
                UI-->>Admin: Fecha Modal e Atualiza Tabela
            end
        end
    end
```

---

---

### I. Falhas Críticas de Segurança (Client-Server)

- **Vulnerabilidade de *Mass Assignment* / Elevamento de Privilégio (Regra 2):**
    - **Problema:** A regra diz que a alteração do `tipo_acesso` é "Bloqueada (Campo desabilitado)" no Frontend para Instrutores/Pedagogos. Novamente, o Frontend não é confiável. Se a API Python receber um *payload* de um Instrutor editando o próprio perfil com `{"nome": "João", "tipo_acesso": "Administrador"}`, ela está programada para rejeitar esse campo específico?
    - **Solução:** A API Python deve ignorar ativamente (fazer *strip*) de campos sensíveis como `tipo_acesso` e `status` quando a requisição não vier de um Administrador.
- **Bloqueio de IP em Redes NAT (Regra 4.2):**
    - **Problema:** Bloquear o IP após 5 tentativas falhas é extremamente perigoso no contexto educacional. Pense na realidade de um laboratório de informática do SENAI: dezenas de máquinas geralmente saem para a internet através do mesmo IP público (via NAT). Se um aluno rodar um script ou errar a senha 5 vezes, o IP inteiro é bloqueado, impedindo que professores, administradores e outros alunos daquela unidade façam login.
    - **Solução:** O *Rate Limit* não pode ser puramente por IP. O bloqueio deve ser aplicado à combinação `IP + Username` ou apenas ao `Username`. Para mitigar ataques distribuídos, introduza um atraso exponencial (*exponential backoff*) ou exija um CAPTCHA após a 3ª tentativa, ao invés de um bloqueio absoluto no IP.
- **Validação Exclusiva de Frontend (Regra 3):**
    - **Problema:** O texto afirma que o `nome` "É convertido automaticamente para letras MAIÚSCULAS no Frontend". Se a requisição for feita via cURL/Postman, o nome entrará minúsculo no banco.
    - **Solução:** A API Python deve aplicar o `toUpperCase()` ou garantir essa formatação no momento de salvar, tratando a ação do Frontend apenas como conveniência visual.
- **Troca de Senha Insegura (Regra 2 e 4):**
    - **Problema:** Não há menção da exigência da "Senha Atual" para a edição do próprio perfil. Se um usuário deixar a máquina desbloqueada e for tomar um café, qualquer pessoa que sentar no computador pode ir na tela de edição e alterar a senha dele.
    - **Solução:** Para qualquer mudança de senha (exceto reset feito por um Admin), a API deve exigir o envio e a validação da `senha_atual` junto com a `nova_senha`.

### II. Inconsistências Lógicas e de Banco de Dados

- **A Contradição da Multi-instituição (Regras 3 vs 4.2):**
    - **Problema:** A Regra 3 afirma que `instituicao_id` é um "Campo sistêmico. Todo usuário é obrigatoriamente vinculado à instituição...". Isso implica um relacionamento 1:N (um usuário pertence a uma instituição). No entanto, a Regra 4.2 diz: "Se o usuário pertencer a mais de uma instituição (`instituicoes_ids`)".
    - **Solução:** A modelagem de dados precisa ser definida. É um *array* de IDs no MongoDB (`instituicoes_ids`) ou um ID único? Se for um array, a criação de usuário (Regra 4.1) precisa permitir que um Admin atribua múltiplas instituições, e não apenas vincular "à instituição do usuário que o cadastrou".
- **Concorrência na Validação de E-mail Único (Regra 4.1 e 5):**
    - **Problema:** O fluxo diz: "Busca por `user_name_lc` (E-mail já existe?). Se não, persiste". Isso cria uma *Race Condition* (Condição de Corrida). Se duas requisições de criação chegarem no exato mesmo milissegundo, ambas "buscam", não encontram nada, e ambas "salvam", gerando duplicidade.
    - **Solução:** A garantia de unicidade não deve ser feita apenas por um `find()` prévio no código Python. O MongoDB deve obrigatoriamente ter um **Unique Index** no campo `user_name_lc`. Se houver duplicidade concorrente, o próprio banco rejeitará a gravação, e o Python faz o *catch* da exceção para retornar o Erro 400.

### III. Questões de Conformidade (LGPD)

- **Retenção Perpétua de Dados (Regra 2):**
    - **Problema:** "A exclusão definitiva é bloqueada. Nenhum ator tem permissão para apagar um registro". Arquiteturalmente, o *Soft Delete* é uma ótima prática para manter integridade referencial. Contudo, do ponto de vista legal (LGPD no Brasil), o usuário tem o "Direito ao Esquecimento". Manter dados pessoais (nome, e-mail) de alguém que já saiu da instituição para sempre é um risco jurídico.
    - **Solução:** Manter a inativação, mas criar uma rotina (um *cron job* ou ação de Super Admin) para **anonimização** dos dados após *X* anos. Em vez de apagar a linha, o nome vira "Usuario_Anonimizado_123" e o e-mail vira um UUID, mantendo o ID intacto para não quebrar os históricos de auditoria.

### IV. Resumo do Plano de Ação para a Equipe:

1. **Resolver a modelagem:** Definir claramente se o sistema é de instituição única por usuário (`instituicao_id`) ou multi-instituição (`instituicoes_ids`).
2. **Segurança de API:** Mover as transformações de dados (Maiúsculas/Minúsculas) para o Python e implementar bloqueio estrito contra *Mass Assignment* em atualizações de perfil.
3. **Refatorar o Bloqueio de Login:** Alterar de bloqueio por IP para bloqueio por `Username` ou `Username + IP` para evitar travamento de redes NAT.
4. **Banco de Dados:** Criar um *Unique Index* no MongoDB para o e-mail em minúsculo (`user_name_lc`).
5. **Requisito de Produto:** Adicionar a obrigatoriedade da digitação da senha atual ao alterar a senha do próprio perfil.

### 1. Módulo de Configurações de Usuário

- **Correção do Rate Limit:** Substituir o bloqueio de Força Bruta exclusivo por IP por uma chave composta (`IP + Username` no Redis). Em redes NAT institucionais, um IP bloqueado paralisa um laboratório inteiro.
- **Definição de Multi-tenant:** Corrigir a contradição entre vincular a uma única instituição (`instituicao_id`) ou múltiplas (`instituicoes_ids`). Se for múltipla, o MongoDB deve tratar como *Array* de ObjectIds e a regra de criação deve refletir isso.
- **Segurança de Perfil:** Exigir o envio da "senha atual" para qualquer alteração de dados sensíveis ou troca de senha pelo próprio usuário, prevenindo sequestro de sessão em terminais desbloqueados.