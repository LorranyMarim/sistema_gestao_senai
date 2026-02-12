<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Empresas - SENAI</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
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
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building" class="active"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a>
                    </li>

                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-file-alt"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="ocupacao_instrutores.php"> Ocupação de Intrutores</a></li>
                        </ul>
                    </li>
                    <li id="nav-config" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-config">
                            <span><i class="fas fa-tools"></i> Configuração</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-config">
                            <li><a href="configuracao_usuarios.php"> Usuários</a></li>
                        </ul>
                    </li>
                    <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Gestão de Empresas</h1>
                <button class="btn btn-primary" id="addEmpresaBtn"><i class="fas fa-plus-circle"></i> Adicionar Nova
                    Empresa</button>
            </header>

            <section class="table-section">
                <h2>Empresas Cadastradas</h2>

                <div id="filter_area" class="mb-3">
                    </div>

                <div class="table-responsive">
                    <table id="empresaTable" class="data-table">
                        <thead>
                            <tr>
                                <th>Razão Social</th>
                                <th>CNPJ</th>
                                <th>Status</th>
                                <th>Criado em</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="empresaTableBody"></tbody>
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

    <div id="empresaModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeModalBtn">&times;</span>
            <h2 id="modalTitleEmpresa">Adicionar Nova Empresa</h2>

            <form id="empresaForm" autocomplete="off">
                <input type="hidden" id="empresaId">
                
                <div class="form-group" style="display:none;">
                    <label for="instituicaoEmpresa">Instituição:</label>
                    <select id="instituicaoEmpresa" class="form-control" required>
                    </select>
                </div>

                <div id="alertEmpresa" style="display:none"></div>

                <div class="form-group">
                    <label for="razaoSocial">Razão Social:</label>
                    <input type="text" id="razaoSocial" class="form-control" required minlength="3" maxlength="150"
                        placeholder="Ex: Indústria XYZ Ltda">
                </div>

                <div class="form-group">
                    <label for="cnpjEmpresa">CNPJ:</label>
                    <input type="text" id="cnpjEmpresa" class="form-control" maxlength="20"
                        placeholder="00.000.000/0001-00">
                </div>

                <div class="form-group">
                    <label for="statusEmpresa">Status:</label>
                    <select id="statusEmpresa" class="form-control">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>

                <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
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

    <div id="visualizarEmpresaModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeVisualizarEmpresaBtn">&times;</span>
            <h2>Detalhes da Empresa</h2>

            <form>
                <div class="form-group">
                    <label>Razão Social:</label>
                    <input type="text" id="viewRazaoSocial" readonly disabled>
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" id="viewCnpj" readonly disabled>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <input type="text" id="viewStatusEmpresa" readonly disabled>
                </div>
                <button type="button" class="btn btn-secondary" id="fecharVisualizarEmpresaBtn">Fechar</button>
            </form>
        </div>
    </div>
    
    <script src="../assets/js/geral_script.js"></script>
    <script src="../assets/js/empresas_script.js" defer></script>
</body>
</html>