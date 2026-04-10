### 1. Auditoria Detalhada: Configuração de Usuários
**A. Segurança e Controle de Acesso (RBAC & Multi-tenant)**
* **Isolamento de Papéis:** A regra de que Instrutores e Pedagogos vejam apenas a si mesmos é a mais sensível. A auditoria foca em garantir que a API Python não aceite apenas um "ID" vindo do frontend, mas valide se o ID solicitado é o do próprio usuário logado (caso ele não seja admin).
* **Blindagem de Status na Criação:** O requisito exige que novos usuários nasçam como "Ativo" e o campo seja bloqueado. É crucial que a API Python ignore qualquer valor de `status` enviado no payload de criação para evitar que atacantes criem usuários inativos ou com status malformados via interceptação de requisição.
* **Soft-Delete:** O sistema utiliza exclusão lógica. A auditoria valida se a rota de deleção realmente apenas altera o campo `status` para "Inativo" e se o frontend impede a deleção física.

**B. Integridade de Dados e Auditoria**
* **Trilha de Auditoria (`alterado_por`, `alterado_em`):** A lógica de manter `data_criacao` imutável e atualizar apenas os campos de alteração é um padrão de conformidade. O PHP deve ser impedido de manipular essas datas; elas devem ser geradas exclusivamente pelo servidor de aplicação (Python) em UTC.
* **Normalização de Input:** A conversão para Uppercase (Nome) e Lowercase (E-mail) deve ser garantida no Backend. Confiar apenas no JavaScript do frontend é um risco de inconsistência no banco de dados.

**C. UX e Comportamento de Interface (Modais e Filtros)**
* **Hierarquia de Modais:** O requisito de manter o modal de "Edição" aberto enquanto o de "Alterar Senha" é sobreposto exige uma gestão de *z-index* e instâncias de modal cuidadosa no `usuarios_script.js`.
* **Persistência de Filtros:** O comportamento do botão "Limpar" e a sincronização do select "Itens/Página" com a paginação devem ser atômicos para evitar que a tabela exiba dados incoerentes com os filtros visuais.

---

### 2. Descrição Técnica para Desenvolvedores (Plano de Ação)
#### **Módulo: Camada de Apresentação (PHP/JS)**
1.  **Enforcement de UI para Papéis:** No arquivo `configuracao_usuarios.php`, condicione a renderização do botão "Cadastrar Usuário" e da coluna de exclusão a uma verificação de sessão (`$_SESSION['perfil'] == 'Administrador'`). No `usuarios_script.js`, implemente a lógica de bloqueio de campos no Modal de Visualização usando a propriedade `disabled` em todos os inputs.
2.  **Sincronização de Paginação e Estilização:** Ajuste a lógica dos botões "Anterior" e "Próximo" para validar o estado da variável de paginação retornada pela API. O botão deve receber uma classe de estado ativo (Azul) apenas quando houver registros remanescentes no sentido da navegação.
3.  **Gestão de Modais Sobrepostos:** Implementar no `usuarios_script.js` uma função de controle que gerencie o fechamento isolado do modal de senha. Certifique-se de que o evento de clique fora do modal (*backdrop*) do modal de senha não feche o modal de edição que está ao fundo.

#### **Módulo: Middleware de Comunicação (processa_usuarios.php)**
1.  **Limpeza de Payload de Proxy:** Antes de enviar o JSON para a API Python via cURL, o PHP deve sanitizar o payload. Em requisições de criação, o campo `status` deve ser removido ou forçado para "Ativo". Em edições, o campo `data_criacao` deve ser removido para evitar tentativas de sobrescrita.
2.  **Tratamento de ID de Auditoria:** O middleware deve injetar o ID do usuário logado (extraído da sessão PHP) no campo `alterado_por` antes de repassar a chamada para a API, garantindo que a origem da ação seja confiável.

#### **Módulo: API e Regras de Negócio (rotas_usuario.py)**
1.  **Implementação de Soft-Delete:** Refatorar o método de deleção para que ele não execute um `delete_one`, mas sim um `update_one` setando `status: "Inativo"`, `alterado_em: datetime.now()` e `alterado_por: current_user_id`.
2.  **Lógica de Unicidade e Normalização:** No endpoint de criação, aplique `.upper()` no nome e `.lower()` no e-mail. Antes da inserção, valide se o e-mail já existe na coleção. Retorne `409 Conflict` caso positivo.
3.  **Segurança de Senha:** Implementar a validação de igualdade entre "Senha" e "Confirma Senha" no backend, mesmo que já exista no frontend. Utilize o contexto de criptografia para gerar o hash apenas se as strings coincidirem perfeitamente.
4.  **Associação de Instituição:** O backend deve extrair o `instituicao_id` ativo do token do administrador que está realizando o cadastro e injetá-lo no array de instituições do novo usuário, garantindo o vínculo multi-tenant.

---

### 3. Simulador de Fluxo de Configuração (Descritivo)

Abaixo, descrevo os cenários operacionais baseados nas regras de auditoria:

**Cenário 1: Cadastro de Novo Usuário (Admin)**
* **Operação:** O Administrador abre o modal, digita o nome em minúsculo, e-mail válido e senhas iguais.
* **Fluxo:** O Frontend converte o nome para Maiúsculo visualmente. Ao salvar, o PHP remove qualquer campo de data e injeta o ID do Admin. A API Python recebe os dados, valida que as senhas são iguais, gera o hash Bcrypt, busca o `instituicao_id` do Admin e salva o novo documento com `data_criacao` e `alterado_em` idênticos.
* **Resultado:** Usuário criado com sucesso e aparece na tabela com status "Ativo" (bloqueado para alteração na criação).

**Cenário 2: Edição de Perfil Próprio (Instrutor/Pedagogo)**
* **Operação:** Um Instrutor loga no sistema e acessa a tela de usuários.
* **Fluxo:** A tabela carrega apenas uma linha (a dele). O botão "Cadastrar" não existe. Ele clica em "Editar".
* **Segurança:** Ele tenta alterar seu `tipo_acesso` para "Administrador" via console do navegador e clica em salvar.
* **Resultado:** A API Python detecta que o usuário não é Admin, ignora o campo `tipo_acesso` no payload e atualiza apenas os campos permitidos (nome, email). O campo `alterado_em` é atualizado, mas `data_criacao` permanece intacto.

**Cenário 3: Alteração de Senha com Divergência**
* **Operação:** Admin edita um usuário e clica em "Alterar Senha". Digita "Senha123" e no campo confirmar digita "Senha124".
* **Fluxo:** Ao clicar em "Salvar Senha", o script JS compara as strings.
* **Resultado:** Um alerta de erro é exibido: "As senhas não coincidem". O modal de senha permanece aberto para correção e nenhuma requisição é enviada ao servidor.

**Cenário 4: Soft-Delete (Exclusão)**
* **Operação:** Admin clica no ícone de lixeira de um usuário.
* **Fluxo:** O navegador exibe um `confirm()` perguntando se deseja excluir. O Admin confirma.
* **Resultado:** A API Python recebe a requisição, não deleta o registro do MongoDB, apenas altera seu status para "Inativo" e atualiza a trilha de auditoria. O usuário para de aparecer nas listagens filtradas por "Ativo".
