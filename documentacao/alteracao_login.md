### 1. Auditoria Detalhada do Módulo de Autenticação

**A. UX/UI e Validação de Dados (Frontend - `index.php` / `usuarios_script.js`)**
* **Feedback de Senha:** A regra de "mínimo de 8 dígitos" precisa ser validada no *input* de senha antes do envio do formulário. Atualmente, se isso for delegado apenas ao backend, gera tráfego de rede desnecessário e uma experiência de usuário mais lenta.
* **Tratamento Offline:** A verificação de ausência de internet via JavaScript (`navigator.onLine`) é útil, mas insuficiente por si só. Um usuário pode estar conectado à rede local do SENAI (onde o sistema pode estar hospedado), mas sem saída para a internet externa. A verdadeira prova de fogo é testar se a API está alcançável.
* **Isolamento Visual de Instituições:** A regra exige carregar os nomes das instituições da coleção `instituicao`. É vital que esse endpoint (ex: `/api/instituicoes/publicas`) seja aberto, mas não exponha dados sensíveis das filiais, retornando apenas `_id` e `nome`.

**B. Segurança Client-Server (Middleware PHP - `processa_login.php` / `verifica_login.php`)**
* **Sessão e Cookies:** Para garantir o deslogamento após 1 hora de inatividade e proteger o acesso, o cookie gerado pelo `processa_login.php` precisa ter a expiração exata de 3600 segundos. Ele também carece das flags de segurança máximas (`HttpOnly`, `Secure` e `SameSite=Strict`), essenciais para blindar contra roubo de sessão via XSS e CSRF.
* **Tratamento de Queda da API:** Se a API Python estiver offline (Erro 502/503 ou Timeout de cURL), o middleware PHP atualmente pode falhar silenciosamente ou exibir um erro bruto. A regra exige informar o usuário claramente que o sistema (API) está inoperante.

**C. Regras de Negócio e Arquitetura (API Python - `auth.py`, `rotas_usuario.py`, `auth_dep.py`)**
* **Validação de Tenant (Multi-instituição):** A regra mais crítica do escopo: "o login deve existir com o mesmo id da instituição que ele selecionou". O fluxo atual precisa garantir que a API, após validar a senha, cruze o `instituicao_id` que veio do formulário com a lista de instituições autorizadas no documento do usuário no MongoDB.
* **Hashing Seguro:** A garantia de uso do Bcrypt. O arquivo `auth_utils.py` deve utilizar a biblioteca `passlib` configurada exclusivamente para `bcrypt`, rejeitando hashes obsoletos como MD5 ou SHA256 puro.
* **Prevenção contra Enumeração:** O retorno de erro de credenciais deve ser sempre "E-mail ou senha inválidos", independentemente de qual dos dois falhou, protegendo a base de dados contra descobertas de e-mails válidos por invasores.

---

### 2. Descrição Técnica para Desenvolvedores (Plano de Ação)

**Frontend (`index.php` e scripts JS)**
1.  **Bloqueio de Envio por Regra de Senha:** No listener de submit do formulário, implemente uma verificação `if (senha.length < 8)`. Caso seja menor, aborte o evento (`e.preventDefault()`) e exiba um alerta visual ou *toast* informativo exigindo os 8 caracteres, sem acionar o PHP.
2.  **Validação de Conectividade Híbrida:** Utilize `navigator.onLine` para um bloqueio rápido de interface (exibindo: "Você está offline"). Adicionalmente, implemente um bloco `try/catch` no disparo do AJAX/Fetch. Se a requisição falhar por *Network Error*, exiba a mensagem: "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente."
3.  **Memória de Instituição:** Ao obter sucesso no login, salve o `instituicao_id` no `localStorage`. No próximo carregamento da página de login, pré-selecione essa instituição no `<select>`.

**Middleware PHP (`processa_login.php`, `processa_logout.php`, `verifica_login.php`)**
1.  **Blindagem do Cookie de Sessão:** Ao receber o token da API no `processa_login.php`, configure o cookie utilizando a assinatura completa: `setcookie('session_token', $token, time() + 3600, '/', '', true, true);` (Onde os últimos booleanos forçam `Secure` e `HttpOnly`).
2.  **Interceptação de Falha da API:** No bloco do cURL que contata a API Python, adicione a verificação `if(curl_errno($ch))`. Se houver erro de rede interna (API caiu), intercepte e redirecione o usuário para a página de login com o parâmetro `?erro=api_offline`.
3.  **Destruição Passiva de Sessão:** No `verifica_login.php`, se o cookie `session_token` não existir (o usuário apagou manualmente ou a 1 hora passou), execute `header('Location: index.php'); exit;`. No `processa_logout.php`, zere o cookie retroativamente `setcookie('session_token', '', time() - 3600, '/');` e destrua a sessão PHP se houver.

**Backend Python (`auth.py`, `rotas_usuario.py`, `auth_utils.py`)**
1.  **Regra de Isolamento no Login:** No endpoint de autenticação (`/login`), faça a busca no MongoDB pelo `email`. Se encontrado, verifique a senha usando `pwd_context.verify()`. Se a senha estiver correta, verifique se o `instituicao_id` recebido no body da requisição existe dentro do array/campo de instituições do usuário. Se não existir, retorne `HTTP 403 - Forbidden`. Se tudo estiver correto, gere o JWT.
2.  **Geração e Carga do JWT:** O token gerado deve expirar estritamente em 60 minutos (usando `datetime.utcnow() + timedelta(minutes=60)`). O payload (corpo do token) deve embutir o ID do usuário (`sub`) e a instituição logada (`inst`).
3.  **Tratamento de Inexistência:** Retorne `HTTP 401 - Unauthorized` para qualquer falha de e-mail não encontrado ou hash de senha incompatível.

---

### 3. Simulador de Fluxo de Autenticação e Segurança (Descritivo)

Abaixo, apresento como o sistema se comportará na prática diante das novas travas de segurança e regras de negócio:

**Cenário A: O Caminho Feliz (Login com Sucesso)**
1. **Ação:** O usuário acessa `index.php`, seleciona a instituição "SENAI - Contagem", digita um e-mail válido e uma senha com 10 caracteres.
2. **Frontend:** O JS valida o tamanho da senha e a conexão. Tudo OK. Envia para o PHP.
3. **PHP:** Recebe os dados e faz o repasse via cURL para a API Python.
4. **Python:** Busca o e-mail no MongoDB. Confirma que o usuário existe, que a senha bate com o hash Bcrypt e que "SENAI - Contagem" está liberada para este perfil. Gera um JWT de 60 minutos.
5. **PHP:** Recebe o JWT (HTTP 200), cria o cookie `HttpOnly` com validade de 1 hora.
6. **Resultado:** Usuário redirecionado para `dashboard.php`. Acesso concedido.

**Cenário B: Falha Básica de UX (Senha Curta)**
1. **Ação:** Usuário seleciona instituição e tenta logar com a senha "12345".
2. **Frontend:** O JS detecta imediatamente que a string tem menos de 8 caracteres.
3. **Resultado:** O evento de envio é cancelado. O alerta visual aparece na tela: "A senha deve conter no mínimo 8 caracteres". O sistema não gera tráfego de rede nem aciona o backend.

**Cenário C: Tentativa de Intrusão em Outra Instituição (Erro Multi-tenant)**
1. **Ação:** Um instrutor do "SENAI - Betim" (que sabe seu login e senha) tenta acessar selecionando "SENAI - BH" no menu de instituições.
2. **Frontend & PHP:** Tudo parece OK, os dados são encaminhados.
3. **Python:** Valida e-mail e senha com sucesso. No entanto, ao cruzar o ID selecionado (SENAI - BH) com o perfil do banco, nota-se que o usuário não pertence àquela unidade.
4. **Resultado:** A API retorna erro HTTP 403. O PHP capta o erro e redireciona. A interface exibe: "Você não possui permissão para acessar a instituição selecionada."

**Cenário D: API Indisponível (Queda do Servidor)**
1. **Ação:** O usuário clica em Entrar. A internet do usuário está funcionando.
2. **PHP:** Tenta comunicar com a API Python, mas o container/servidor do Python desligou ou travou.
3. **Resultado:** O cURL do PHP falha após tentar conectar. O `processa_login.php` intercepta a falha e redireciona para a tela inicial informando: "Serviço de autenticação temporariamente indisponível. Tente novamente em instantes."

**Cenário E: Deleção Passiva de Sessão (Exclusão do Cache/Cookie)**
1. **Ação:** O usuário está navegando no `dashboard.php` tranquilamente. Ele abre as ferramentas de desenvolvedor (F12), vai em Application e apaga o cookie `session_token` manualmente. Em seguida, clica no menu "Alunos".
2. **Resultado:** A página de "Alunos" tenta carregar (ou via AJAX ou via navegação). O arquivo `verifica_login.php` ou `auth_dep.py` nota a ausência do cookie. O acesso é negado (HTTP 401) e o usuário é abruptamente jogado de volta para o `index.php` (tela de login).

---

