# Módulo de Login, Logout e Autenticação

## 1. Contexto Geral

O módulo de **Login e Logout** atua como a porta de entrada e saída segura do sistema. Ele gerencia a identificação do usuário, a validação de credenciais contra uma Instituição de Ensino específica e a emissão de *tokens* de sessão. Além disso, através da inicialização de contexto (`bootstrap`), o sistema garante que o usuário veja apenas os dados pertinentes à sua instituição logo após o acesso.

O fluxo distribui responsabilidades: o Frontend captura e faz a pré-validação, o intermediário PHP (`processa_login.php`) gerencia os cookies de sessão, e a API Python realiza a criptografia, validação rigorosa e assinatura de tokens JWT.

---

## 2. Regras de Validação de Campos (Frontend e PHP)

Antes que os dados cheguem ao motor de autenticação, existem regras rígidas de barreira:

- `instituicao_id`: Campo obrigatório. A lista de instituições é carregada via API.
    - **Regra de Usabilidade:** O sistema utiliza `localStorage` para memorizar a última instituição que o usuário selecionou, facilitando o próximo acesso.
- `username` (Usuário):
    - Deve ter entre 4 e 50 caracteres.
    - **Filtro de Segurança:** A presença dos caracteres `< > ' "` é estritamente bloqueada no Frontend via Regex para mitigar injeções.
- `password` (Senha):
    - Deve ter entre 4 e 50 caracteres.
- **Offline:** Se o navegador não tiver conexão de internet (`navigator.onLine`), o botão de login é desabilitado e a tentativa é bloqueada preventivamente.

---

## 3. Gestão de Sessão e Segurança de Tokens

A arquitetura de segurança é baseada em **JSON Web Tokens (JWT)** combinados com **Cookies HttpOnly**.

### Regras de Token e Criptografia

- As senhas são protegidas no Banco de Dados utilizando algoritmos de Hash unidirecional (**Bcrypt** com *salt* dinâmico). Nunca trafegam ou são comparadas em texto plano no Backend.
- O Token JWT é gerado contendo duas informações vitais no *Payload*:
    - `sub`: Identificação do usuário.
    - `inst`: O ID da Instituição escolhida no momento do login.
- **Política de Expiração (Dupla Validação):**
    1. A API Python gera o JWT com uma vida útil estrita de **60 minutos** (`SESSION_EXP_MINUTES`).
    2. O PHP configura o Cookie no navegador do usuário com um limite de **2 horas** e restrições de segurança (`HttpOnly=true`, `SameSite=Lax`). Se o token interno expirar antes do cookie, a API recusará o acesso.

### Regra de Dependência de Autenticação (`auth_dep`)

Para qualquer ação logada, o Backend Python extrai o cookie de sessão e valida o JWT. É **obrigatório** que o *Payload* do token contenha uma instituição válida (`inst`). Se esse ID for malformado ou ausente, a requisição é bloqueada (HTTP 400 ou 403), garantindo o isolamento multilocatário (Multi-tenant).

---

## 4. Regras de Resposta e Tratamento de Erros

A API Python responde com códigos HTTP específicos durante a tentativa de login, que o PHP traduz em mensagens de negócio para o usuário na tela de login:

| **Código HTTP** | **Motivo / Regra Disparada** | **Mensagem no Frontend** |
| --- | --- | --- |
| **401** | Senha inválida ou Token expirado/inválido. | "Usuário ou senha incorretos." |
| **403** | Usuário possui `status` **Inativo** ou tentou logar em uma Instituição à qual não pertence. | "Você não tem acesso à instituição selecionada ou seu usuário foi desativado." |
| **429** | O usuário excedeu o limite de tentativas de login (Força Bruta). | "Muitas tentativas. Tente novamente em alguns minutos." |
| **400** | A instituição fornecida não existe no banco de dados. | "Instituição inválida." |
| **422** | O formato do payload de login enviado para a API é inválido. | "Dados inválidos." |

---

## 5. Carga de Contexto Inicial (Bootstrap e Cache)

Após um login bem-sucedido, o sistema executa o `bootstrap.py` para carregar as dependências globais em tela (Dashboards e Menus).

- **Regra de Isolamento Institucional:** Todas as consultas (`cursos`, `instrutores`, `ucs`, `calendarios`) são filtradas estritamente pela `instituicao_id` injetada no token JWT do usuário durante o login.
- **Filtro de Entidades Ativas:** O sistema ignora cadastros históricos inativos logo na carga inicial:
    - Cursos e Instrutores retornam apenas se `status` igual a **Ativo**.
    - Unidades Curriculares (UCs) retornam apenas se `status` igual a **Ativa**.
- **Gestão de Cache:** O Backend gera um *ETag* (Hash de versão baseado no horário - *Timestamp*) exclusivo por instituição. Se dados estruturais da instituição mudarem, o cache é invalidado e o Frontend é forçado a baixar os novos dados.

---

## 6. Fluxo de Logout

1. O usuário solicita o encerramento da sessão acionando a rota `processa_logout.php`.
2. O servidor destrói a validade do cookie `session_token` configurando seu prazo de expiração retroativamente para o passado (`time() - 3600`).
3. O usuário é redirecionado para a tela de login (`index.php`), exigindo nova autenticação completa para qualquer acesso.

---

## 7. Diagrama de Fluxo (Login End-to-End)

```markdown
sequenceDiagram
    autonumber
    actor User as Usuário
    participant UI as Frontend (index.php)
    participant PHP as Middleware (processa_login)
    participant API as API (Login/Auth)
    participant DB as Banco de Dados

    User->>UI: Seleciona Instituição, digita Usuário e Senha
    UI->>UI: Valida formato, bloqueia caracteres ilegais e checa conexão
    alt Falha na Validação UI
        UI-->>User: Exibe erro de preenchimento
    else Dados Válidos
        UI->>PHP: Dispara POST com credenciais
        PHP->>API: Repassa credenciais em JSON via cURL
        API->>DB: Busca Hash da senha e regras (Instituição, Status)
        alt Força Bruta ou Bloqueio
            API-->>PHP: HTTP 429 ou 403
            PHP-->>UI: Redireciona com ?erro correspondente
            UI-->>User: Mensagem amigável de erro
        else Credenciais Inválidas
            API->>API: Bcrypt falha
            API-->>PHP: HTTP 401
            PHP-->>UI: Redireciona com ?erro=auth
            UI-->>User: "Usuário ou senha incorretos"
        else Sucesso
            API->>API: Bcrypt OK, Gera JWT Token com 'sub' e 'inst'
            API-->>PHP: HTTP 200 + {token}
            PHP->>PHP: Cria Cookie HTTPOnly (2h de vida)
            PHP-->>UI: Redireciona para dashboard.php
            UI->>API: Solicita contexto via /api/bootstrap
            API-->>UI: Retorna dados ativos em cache (ETag)
            UI-->>User: Tela Inicial Liberada
        end
    end
```

---

### I. Melhorias na Arquitetura e Comunicação

- **Gestão do Rate Limit - HTTP 429 (Regra 4):**
    - A proteção de força bruta precisa ser bem parametrizada. Se o bloqueio for por IP (ex: escola inteira saindo pelo mesmo IP via NAT), um aluno errando a senha bloqueia a escola toda. Se for por `username`, um atacante pode bloquear intencionalmente a conta dos professores errando a senha de propósito (*Denial of Service*).
    - **Recomendação:** Utilize uma estratégia híbrida ou introduza atrasos exponenciais (*exponential backoff*) em vez de bloqueios absolutos, ou exija um desafio interativo (CAPTCHA) após 3 tentativas falhas.
- **Comunicação PHP -> Python (Diagrama de Fluxo):**
    - No fluxo, o PHP usa cURL para enviar as credenciais para o Python. Como essa comunicação trafega credenciais puras, é imperativo que a comunicação entre o contêiner/servidor PHP e a API Python ocorra em uma rede interna privada (VPC) ou utilizando mTLS (Mutual TLS). Se essa requisição passar pela internet pública sem encriptação pesada, o sistema estará vulnerável.

### II. Boas Práticas Confirmadas (O que manter)

Para não focar apenas nas correções, vale destacar os acertos de design que devem ser mantidos:

- **Isolamento Multilocatário (Multi-tenant):** Usar o `instituicao_id` injetado no payload do JWT (`inst`) como fonte da verdade para filtrar dados no Python previne ataques de *Insecure Direct Object Reference (IDOR)*. É uma excelente decisão de design.
- **Cache por ETag:** O mecanismo de invalidação de dados do *bootstrap* baseado em hash de timestamp é uma abordagem moderna e altamente performática.
- **Mensagem Genérica de Erro (401):** Retornar "Usuário ou senha incorretos" sem especificar qual dos dois está errado evita a enumeração de usuários por parte de atacantes.

### III. Resumo do Plano de Ação para a Equipe:

1. Atualizar limite mínimo de senha para 8 caracteres.
2. Adicionar flag `Secure=true` no cookie PHP.
3. Sincronizar tempo de vida do Cookie com o JWT (ou implementar Refresh Token).
4. Implementar *Denylist* de JWT no Redis via Python para um logout verdadeiro.
5. Garantir que as prevenções de injeção sejam resolvidas via *Prepared Statements* no Backend, tratando a validação de Regex do Frontend apenas como feedback visual.