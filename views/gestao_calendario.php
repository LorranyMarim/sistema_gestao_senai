<?php
// (opcional) verificação de sessão aqui, se você já usa em outras views.
// Nenhuma lógica JS no PHP — apenas a view.
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendário - SENAI</title>

    <!-- CSS existente (não alterado) -->
    <link rel="stylesheet" href="../assets/css/style_turmas.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

    <!-- Libs JS de terceiros (CDNs) -->
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.14/index.global.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core/locales/pt-br.global.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Select2 -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
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
                    <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendario.php" class="active"><i class="fas fa-calendar-alt"></i>Calendário</a></li>
                    <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Gestão de Calendário Acadêmico</h1>
            </header>

            <div class="calendar-page-layout">
                <div class="calendar-container-main">
                    <h2>Calendário Geral</h2>
                    <div class="action-buttons-group">
                        <button type="button" class="btn btn-primary" id="btnAbrirModalCadastrarCalendario">
                            <i class="fas fa-plus-circle"></i>Cadastrar Calendário
                        </button>
                        <button type="button" class="btn btn-warning" id="btnAbrirModalAdicionarEvento">
                            <i class="fas fa-calendar-plus"></i>Adicionar Evento
                        </button>
                    </div>
                    <p>Visualize os eventos e datas importantes de todos os calendários cadastrados.</p>
                    <div id="calendario"></div>
                </div>
            </div>

            <section class="table-section">
                <h2>Calendários Cadastrados</h2>
                <div class="form-group">
                    <input id="filtroCalendarios" type="text" placeholder="Buscar por descrição ou empresa..." class="form-control">
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Empresa/Parceiro</th>
                                <th>Data Inicial</th>
                                <th>Data Final</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyCalendarios"><!-- preenchido via JS --></tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <!-- MODAL ADICIONAR EVENTO -->
    <div id="modalAdicionarEvento" class="modal">
        <div class="modal-content">
            <span class="close-button" onclick="closeModal('modalAdicionarEvento')">&times;</span>
            <h2>Adicionar Evento</h2>
            <form id="formAdicionarEvento">
                <div class="form-group">
                    <label for="eventoCalendario">Calendário(s):</label>
                    <select id="eventoCalendario" name="calendarios[]" multiple="multiple" class="form-control" style="width:100%">
                        <!-- options via JS -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventoDescricao">Descrição:</label>
                    <textarea id="eventoDescricao" name="descricao" rows="2" class="form-control" required></textarea>
                </div>
                <div class="form-group">
                    <label for="eventoInicio">Início:</label>
                    <input type="date" id="eventoInicio" name="inicio" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="eventoFim">Fim:</label>
                    <input type="date" id="eventoFim" name="fim" class="form-control" required>
                </div>
                <button type="button" class="btn btn-warning" onclick="closeModal('modalAdicionarEvento')">Cancelar</button>
                <button id="btnSalvarEvento" type="submit" class="btn btn-primary">Salvar Evento</button>
            </form>
        </div>
    </div>

    <!-- MODAL CADASTRAR CALENDÁRIO -->
    <div id="modalCadastrarCalendario" class="modal">
        <div class="modal-content">
            <span class="close-button" onclick="closeModal('modalCadastrarCalendario')">&times;</span>
            <h2>Cadastrar Calendário</h2>
            <form id="formCadastrarCalendario">
                <div class="form-group">
                    <label for="calInstituicao">Instituição:</label>
                    <select id="calInstituicao" name="instituicao" class="form-control" required>
                        <option value="">Selecione</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calNome">Nome do Calendário:</label>
                    <input type="text" id="calNome" name="nome" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="calEmpresa">Empresa/Parceiro:</label>
                    <select id="calEmpresa" name="empresa" class="form-control" required>
                        <option value="">Selecione</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calInicio">Início do Calendário:</label>
                    <input type="date" id="calInicio" name="inicio_cal" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="calFim">Fim do Calendário:</label>
                    <input type="date" id="calFim" name="fim_cal" class="form-control" required>
                </div>
                <button type="button" class="btn btn-warning" onclick="closeModal('modalCadastrarCalendario')">Cancelar</button>
                <button id="btnCadastrarCalendario" type="submit" class="btn btn-primary">Cadastrar</button>
            </form>
        </div>
    </div>

    <!-- MODAL DETALHES -->
    <div id="modalVisualizarCalendario" class="modal">
        <div class="modal-content" style="max-width:500px">
            <span class="close-button" onclick="closeModal('modalVisualizarCalendario')">&times;</span>
            <h2>Detalhes do Calendário</h2>
            <div id="detalhesCalendario"></div>
        </div>
    </div>

    <!-- Seu JS agora fica separado em assets/js -->
    <script src="../assets/js/gestao_calendario.js"></script>
</body>
</html>
