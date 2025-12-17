<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Unidades Curriculares - SENAI</title>

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
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php" class="active"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                    <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i>Gestão de Calendários</a>
                    </li>

                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-file-alt"></i> Relatórios</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="relatorio_disponibilidade_instrutor.php">Disponibilidade de Instrutor</a></li>
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
                <h1>Gestão de Unidades Curriculares</h1>
                <button class="btn btn-primary" id="addUcBtn"><i class="fas fa-plus-circle"></i> Adicionar Nova
                    UC</button>
            </header>

            <section class="table-section">
                <h2>Unidades Curriculares Cadastradas</h2>

                <div id="filter_area" class="mb-3">
                 
                </div>

                <div class="table-responsive">
                    <table id="ucTable" class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Instituição</th>
                                <th>Descrição da Unidade Curricular</th>
                                <th>Sala Ideal</th>
                                <th>Status</th>
                                <th>Criado em</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="ucTableBody"></tbody>
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

    <div id="ucModal" class="modal">
        <div class="modal-content">
            <span class="close-button" id="closeModalBtn">&times;</span>
           <h3 id="modalTitleUc" class="text-2xl mb-4 p-4 rounded-t-lg">Adicionar Nova Unidade Curricular</h3>
            <form id="ucForm" autocomplete="off">
                <input type="hidden" id="ucId">
                <div id="alertUc" style="display:none"></div>



                <div class="form-group">
                    <label for="descricaoUc">Descrição da UC:</label>
                    <input type="text" id="descricaoUc" required minlength="2" maxlength="100">
                </div>

                <div class="form-group">
                    <label for="salaIdeal">Sala Ideal:</label>
                    <input type="text" id="salaIdeal" required minlength="2" maxlength="100">
                </div>

                <div class="form-group">
                    <label for="statusUc">Status:</label>
                    <select id="statusUc" required>
                        <option value="Ativa" selected>Ativa</option>
                        <option value="Inativa">Inativa</option>
                    </select>
                </div>
                <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="fas fa-times-circle"></i>
                    Cancelar</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar UC</button>

            </form>
        </div>
    </div>

    <div id="visualizarUcModal" class="modal">
        <div class="modal-content">
            <span class="close-button" id="closeVisualizarUcBtn">&times;</span>
            <h2>Detalhes da Unidade Curricular</h2>

            <form>

                <div class="form-group">
                    <label>Descrição da UC:</label>
                    <input type="text" id="viewDescricaoUc" readonly disabled>
                </div>
                <div class="form-group">
                    <label>Sala Ideal:</label>
                    <input type="text" id="viewSalaIdealUc" readonly disabled>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <input type="text" id="viewStatusUc" readonly disabled>
                </div>
                <button type="button" class="btn btn-secondary" id="fecharVisualizarUcBtn">Fechar</button>
            </form>
        </div>
    </div>
    <script src="../assets/js/geral_script.js"></script>
    <script src="../assets/js/ucs_script.js" defer></script>
</body>

</html>