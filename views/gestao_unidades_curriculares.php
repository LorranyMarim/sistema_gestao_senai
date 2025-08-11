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
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            align-items: center;
            justify-content: center;
            z-index: 999;
        }
        .modal.show { display: flex !important; }
        .modal-content {
            background: #fff; border-radius: 10px; padding: 30px;
            min-width: 320px; max-width: 90vw; position: relative;
        }
        .close-button { position: absolute; top: 15px; right: 30px; font-size: 2em; cursor: pointer; }
        .alert-error, .alert-success { margin: 10px 0 0 0; padding: 8px 12px; border-radius: 8px; font-size: 1em; }
        .alert-error { background: #fde2e1; color: #b20000; }
        .alert-success { background: #e7f8e2; color: #227b2f; }
        .form-group label { font-weight: bold; }
        .action-buttons { display: flex; gap: 6px; align-items: center; justify-content: center; }
    </style>

    <!-- Script da página (externo e com defer para carregar após o DOM) -->
    <script src="../assets/js/gestao_unidades_curriculares.js" defer></script>
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
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php" class="active"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                    <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>

            <header class="main-header">
                <h1>Gestão de Unidades Curriculares</h1>
                <button class="btn btn-primary" id="addUcBtn"><i class="fas fa-plus-circle"></i> Adicionar Nova UC</button>
            </header>

            <section class="table-section">
                <h2>Unidades Curriculares Cadastradas</h2>

                <div class="filter-section">
                    <div class="filter-group">
                        <label for="searchUc">Buscar UC:</label>
                        <input type="text" id="searchUc" placeholder="Digite para filtrar..." class="search-input">
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Instituição</th>
                                <th>Descrição da Unidade Curricular</th>
                                <th>Sala Ideal</th>
                                <th>Status</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="ucTableBody"></tbody>
                    </table>
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
                    <label for="instituicaoUc">Instituição:</label>
                    <select id="instituicaoUc" required>
                        <option value="">Selecione a instituição</option>
                    </select>
                </div>

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

                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar UC</button>
                <button type="button" class="btn btn-secondary" id="cancelBtn"><i class="fas fa-times-circle"></i> Cancelar</button>
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
                    <label>Instituição:</label>
                    <input type="text" id="viewInstituicaoUc" readonly>
                </div>
                <div class="form-group">
                    <label>Descrição da UC:</label>
                    <input type="text" id="viewDescricaoUc" readonly>
                </div>
                <div class="form-group">
                    <label>Sala Ideal:</label>
                    <input type="text" id="viewSalaIdealUc" readonly>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <input type="text" id="viewStatusUc" readonly>
                </div>
                <button type="button" class="btn btn-secondary" id="fecharVisualizarUcBtn">Fechar</button>
            </form>
        </div>
    </div>
</body>
</html>
