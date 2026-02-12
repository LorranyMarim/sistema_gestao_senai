<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuração de Usuários - SENAI</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <style>
        .hidden-col { display: none; }
        #changePasswordModal {
            background-color: rgba(0, 0, 0, 0.7); /
            z-index: 1060; 
        }
    </style>
</head>

<body>
    <div class="dashboard-container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <img src="../assets/logo.png" alt="Logo SENAI" class="sidebar-logo">
                <h3>Menu Principal</h3>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="calendario_geral.php"><i class="fas fa-calendar-alt"></i>Calendário Geral</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i> Gestão de Calendários</a></li>

                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle">
                            <span><i class="fas fa-file-alt"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-right caret"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="ocupacao_instrutores.php">Ocupação de Intrutores</a></li>
                        </ul>
                    </li>
                    
                    <li id="nav-config" class="has-submenu active open">
                        <a href="#" class="submenu-toggle" aria-expanded="true" aria-controls="submenu-config" class="active">
                            <span><i class="fas fa-tools"></i> Configuração</span>
                            <i class="fas fa-chevron-down caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu show" id="submenu-config">
                            <li><a href="configuracao_usuarios.php" class="active"> Usuários</a></li>
                        </ul>
                    </li>
                    <li><a href="../backend/processa_logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Configuração de Usuários</h1>
                <button class="btn btn-primary" id="addUserBtn"><i class="fas fa-user-plus"></i> Cadastrar Usuário</button>
            </header>

            <section class="table-section">
                <h2>Usuários Cadastrados</h2>

                <div id="filter_area" class="mb-3"></div>

                <div class="table-responsive">
                    <table id="userTable" class="data-table">
                        <thead>
                            <tr>
                                <th class="hidden-col">ID</th>
                                <th class="hidden-col">Instituição</th>
                                <th>Nome</th>
                                <th>E-mail (Login)</th>
                                <th>Tipo de Usuário</th>
                                <th>Status</th>
                                <th>Criado Em</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                            </tbody>
                    </table>
                    <div class="pagination-bar" style="display:flex;align-items:center;gap:10px;margin-top:10px;">
                        <button class="btn btn-secondary" id="prevPage" type="button">Anterior</button>
                        <span id="pageInfo">Página 1 de 1 • 0 registros</span>
                        <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <div id="userModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeModalBtn">&times;</span>
            <h2 id="modalTitleUser">Cadastrar Novo Usuário</h2>

            <form id="userForm" autocomplete="off">
                <input type="hidden" id="userId">
                
                <div class="form-group" style="display:none;">
                    <label for="instituicaoUser">Instituição:</label>
                    <select id="instituicaoUser" class="form-control"></select>
                </div>

                <div class="form-group">
                    <label for="nomeUser">Nome Completo:</label>
                    <input type="text" id="nomeUser" class="form-control" required minlength="3" maxlength="100">
                </div>

                <div class="form-group">
                    <label for="emailUser">E-mail FIEMG (Login):</label>
                    <input type="email" id="emailUser" class="form-control" required placeholder="Ex: usuario@fiemg.com.br">
                </div>

                <div class="form-group">
                    <label for="tipoUser">Tipo de Usuário:</label>
                    <select id="tipoUser" class="form-control" required>
                        <option value="">Selecione</option>
                        <option value="Coordenador">Coordenador</option>
                        <option value="Pedagogo">Pedagogo</option>
                        <option value="Instrutor">Instrutor</option>
                        <option value="Administrador">Administrador</option>
                    </select>
                </div>

                <div id="divSenhaCadastro">
                    <div class="form-group">
                        <label for="senhaUser">Senha:</label>
                        <input type="password" id="senhaUser" class="form-control" autocomplete="new-password" minlength="6">
                    </div>

                    <div class="form-group">
                        <label for="confirmaSenhaUser">Confirme a Senha:</label>
                        <input type="password" id="confirmaSenhaUser" class="form-control" autocomplete="new-password" minlength="6">
                    </div>
                </div>

                <div id="divBtnAlterarSenha" class="form-group" style="display:none; margin-top: 15px;">
                    <label>Segurança:</label><br>
                    <button type="button" class="btn btn-warning" id="btnOpenChangePassword">
                        <i class="fas fa-key"></i> Alterar Senha
                    </button>
                </div>

                <div class="form-group">
                    <label for="statusUser">Status:</label>
                    <select id="statusUser" class="form-control">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>

                <div class="modal-footer" style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">
                        <i class="fas fa-times-circle"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div id="changePasswordModal" class="modal modal-dialog-centered">
        <div class="modal-content" style="max-width: 400px;">
            <h2 style="font-size: 1.2rem; margin-bottom: 15px;">Alterar Senha do Usuário</h2>
            <form id="changePasswordForm" autocomplete="off">
                <div class="form-group">
                    <label for="novaSenha">Nova Senha:</label>
                    <input type="password" id="novaSenha" class="form-control" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirmaNovaSenha">Confirmar Nova Senha:</label>
                    <input type="password" id="confirmaNovaSenha" class="form-control" required minlength="6">
                </div>
                
                <div class="modal-footer" style="display: flex; justify-content: space-between; margin-top: 15px;">
                    <button type="button" class="btn btn-secondary" id="cancelChangePasswordBtn">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Senha</button>
                </div>
            </form>
        </div>
    </div>

    <div id="visualizarUserModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeVisualizarUserBtn">&times;</span>
            <h2>Detalhes do Usuário</h2>

            <form>
                <div class="form-group">
                    <label>Nome Completo:</label>
                    <input type="text" id="viewNomeUser" readonly disabled class="form-control">
                </div>
                <div class="form-group">
                    <label>E-mail FIEMG:</label>
                    <input type="text" id="viewEmailUser" readonly disabled class="form-control">
                </div>
                <div class="form-group">
                    <label>Tipo de Usuário:</label>
                    <input type="text" id="viewTipoUser" readonly disabled class="form-control">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <input type="text" id="viewStatusUser" readonly disabled class="form-control">
                </div>
                <div class="modal-footer" style="margin-top: 10px; text-align: right;">
                    <button type="button" class="btn btn-secondary" id="fecharVisualizarUserBtn">Fechar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="systemMessageModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header" style="background-color: var(--cor-primaria); color: white; padding: 10px;">
                <h3 style="font-size: 1.1rem; margin: 0;">Aviso do Sistema</h3>
            </div>
            <div class="modal-body" style="padding: 20px; text-align: center; font-size: 1rem;">
                <p id="systemMessageText"></p>
            </div>
            <div class="modal-footer" style="justify-content: center; padding-bottom: 15px;">
                <button type="button" class="btn btn-primary" id="closeSystemMessageBtn">OK</button>
            </div>
        </div>
    </div>

    <script src="../assets/js/geral_script.js"></script>
    <script src="../assets/js/usuarios_script.js" defer></script>
</body>
</html>