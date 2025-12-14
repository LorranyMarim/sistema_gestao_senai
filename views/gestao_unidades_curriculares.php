<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Unidades Curriculares - SENAI</title>

    <!-- Tailwind (mantido) -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- CSS do projeto (ajustado para a estrutura /css) -->
    <link rel="stylesheet" href="../assets/css/style_turmas.css">

    <!-- Font Awesome (mantido) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

    <!-- Estilo inline do modal (mantido para não alterar aparência) -->
    <style>
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            align-items: center;
            justify-content: center;
            z-index: 999;
        }

        .modal.show {
            display: flex !important;
        }

        .modal-content {
            background: #fff;
            border-radius: 10px;
            padding: 30px;
            min-width: 320px;
            max-width: 90vw;
            position: relative;
        }

        .close-button {
            position: absolute;
            top: 15px;
            right: 30px;
            font-size: 2em;
            cursor: pointer;
        }

        .alert-error,
        .alert-success {
            margin: 10px 0 0 0;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 1em;
        }

        .alert-error {
            background: #fde2e1;
            color: #b20000;
        }

        .alert-success {
            background: #e7f8e2;
            color: #227b2f;
        }

        .form-group label {
            font-weight: bold;
        }

        .action-buttons {
            display: flex;
            gap: 6px;
            align-items: center;
            justify-content: center;
        }

        #ucTable th:nth-child(1),
        #ucTable td:nth-child(1),
        #ucTable th:nth-child(2),
        #ucTable td:nth-child(2) {
            display: none;
        }

        /* Garante que os dois modais fiquem sempre acima da sidebar/menu */
        #ucModal,
        #visualizarUcModal {
            position: fixed !important;
            inset: 0 !important;
            /* top/right/bottom/left: 0 */
            z-index: 9999 !important;
            /* maior que qualquer sidebar */
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, .3);
        }

        #ucModal.show,
        #visualizarUcModal.show {
            display: flex !important;
        }

        /* Unifica o tamanho visual dos conteúdos dos modais */
        #ucModal .modal-content,
        #visualizarUcModal .modal-content {
            width: min(680px, 90vw);
            /* fica elegante no desktop e mobile */
            max-height: 90vh;
            /* evita “extrapolar” a altura */
            overflow: auto;
            /* scroll interno se precisar */
            border-radius: 10px;
            padding: 30px;
            background: #fff;
            position: relative;
        }

        /* (opcional) inputs de visualização não forçam largura gigantesca */
        #visualizarUcModal .modal-content input[readonly],
        #visualizarUcModal .modal-content input[disabled] {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }
    </style>

    <!-- Script da página (externo e com defer para carregar após o DOM) -->

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

                <div class="filter-section">
                    <div class="filter-row" style="display:flex; gap:12px; flex-wrap:wrap;">
                        <div class="filter-group">
                            <label for="searchUc">Buscar UC:</label>
                            <input type="text" id="searchUc" placeholder="Descrição ou sala..." class="search-input">
                        </div>

                        <div class="filter-group">
                            <label for="filterCriadoDe">Criado de:</label>
                            <input type="date" id="filterCriadoDe">
                        </div>
                        <div class="filter-group">
                            <label for="filterCriadoAte">Criado até:</label>
                            <input type="date" id="filterCriadoAte">
                        </div>

                    </div>

                    <div class="filter-row" style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                        <div class="filter-group">
                            <label for="filterStatus">Status:</label>
                            <select id="filterStatus">
                                <option value="">Todos</option>
                                <option value="Ativa">Ativa</option>
                                <option value="Inativa">Inativa</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="pageSize">Itens por página:</label>
                            <select id="pageSize">
                                <option value="10" selected>10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <button id="btnClearFilters" class="btn btn-light" type="button" title="Limpar filtros">
                            <i class="fas fa-broom"></i> Limpar filtros
                        </button>
                    </div>
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
                    <div class="pagination-bar" ...>
                        <button class="btn btn-secondary" id="prevPage">Anterior</button>
                        <span id="pageInfo">Página 1 de 1 • 0 registros</span>
                        <button class="btn btn-secondary" id="nextPage">Próximo</button>
                    </div>

                </div>
            </section>
        </main>
    </div>

    <!-- Modal UC -->
    <div id="ucModal" class="modal">
        <div class="modal-content">
            <span class="close-button" id="closeModalBtn">&times;</span>
            <h2 id="modalTitleUc">Adicionar Nova Unidade Curricular</h2>

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

    <!-- Modal Visualizar UC -->
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
    <script src="../assets/js/geral.js"></script>
    <script src="../assets/js/prefetch.js"></script>
    <script src="../assets/js/gestao_unidades_curriculares.js" defer></script>
</body>

</html>