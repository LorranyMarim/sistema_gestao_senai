<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Calendários - SENAI</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css' rel='stylesheet' />
</head>
<style>
    /* Estilo para dias fora do range (apagados) */
    .fc-day-disabled {
        background-color: #f3f4f6 !important; /* Cinza claro */
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    /* Remove a opacidade dos eventos para que fiquem legíveis mesmo se caírem num dia de borda */
    .fc-event {
        opacity: 1 !important;
    }
</style>

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
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"  class="active"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a>
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
                <h1>Gestão de Calendários Acadêmicos</h1>
                <div class="flex gap-2">
                    <button class="btn btn-primary" id="addCalBtn"><i class="fas fa-plus-circle"></i> Adicionar Calendário</button>
                    <button class="btn btn-info" id="addDiaBtn" style="background-color: #17a2b8; color: white;"><i class="fas fa-calendar-plus"></i> Criar Dia/Período Letivo</button>
                </div>
            </header>

            <section class="table-section">
                <h2>Calendários Cadastrados</h2>
                <div id="filter_area" class="mb-3"></div>
                <div class="table-responsive">
                    <table id="calTable" class="data-table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Início</th>
                                <th>Fim</th>
                                <th>Status</th>
                                <th>Criado em</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="calTableBody"></tbody>
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

    <div id="calModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeCalModalBtn">&times;</span>
            <h2 id="modalTitleCal">Adicionar Novo Calendário</h2>
            <form id="calForm" autocomplete="off">
                <input type="hidden" id="calId">
                <div class="form-group">
                    <label for="tituloCal">Título:</label>
                    <input type="text" id="tituloCal" class="form-control" required minlength="3" placeholder="Ex: Calendário 2026 - Técnico">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label for="inicioCal">Início:</label>
                        <input type="date" id="inicioCal" class="form-control" required min="1990-01-01">
                    </div>
                    <div class="form-group">
                        <label for="finalCal">Fim:</label>
                        <input type="date" id="finalCal" class="form-control" required disabled>
                    </div>
                </div>
                <div class="form-group">
                    <label for="statusCal">Status:</label>
                    <select id="statusCal" class="form-control">
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
                <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelCalBtn">
                        <i class="fas fa-times-circle"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" id="salvarCalBtn">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
                
            </form>
        </div>
    </div>

    <div id="diaModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeDiaModalBtn">&times;</span>
            <h2 id="modalTitleDia">Criar Dia/Período Letivo</h2>
            <form id="diaForm">
                <input type="hidden" id="diaId">
                <div class="form-group">
                    <label for="selectCalDia">Calendário:</label>
                    <select id="selectCalDia" class="form-control" required></select>
                </div>
                <div class="form-group">
                    <label for="tipoDia">Tipo:</label>
                    <select id="tipoDia" class="form-control" required disabled>
                        <option value="">Selecione o Calendário primeiro...</option>
                        <option value="Presencial">Presencial</option>
                        <option value="EAD">EAD</option>
                        <option value="Prática na Unidade">Prática na Unidade</option>
                        <option value="Reposição">Reposição</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label for="inicioDia">Data Início:</label>
                        <input type="date" id="inicioDia" class="form-control" required disabled>
                    </div>
                    <div class="form-group flex items-end pb-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="checkRange" disabled>
                            <span>É um período? (Data final)</span>
                        </label>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group" id="divFinalDia">
                        <label for="finalDia">Data Fim:</label>
                        <input type="date" id="finalDia" class="form-control" disabled>
                    </div>
                    <div class="form-group flex items-end pb-2">
                        
                    </div>
                </div>
            
                <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelDiaBtn">
                        <i class="fas fa-times-circle"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" id="salvarDiaBtn">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div id="manageDaysModal" class="modal modal-dialog-centered" style="z-index: 1060;">
        <div class="modal-content" style="max-width: 700px;">
            <span class="close-button" id="closeManageDaysBtn">&times;</span>
            <h2>Gerenciar Dias - <span id="manageDaysTitle"></span></h2>
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data/Período</th>
                            <th>Tipo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="manageDaysBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="viewModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeViewBtn">&times;</span>
            <h2>Detalhes do Calendário Acadêmico</h2>
            <form id="viewCalForm">
            <div class="form-group">
                <label>Título:</label>
                <input type="text" id="viewTitulo" readonly disabled class="form-control">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                    <label>Início:</label>
                    <input type="text" id="viewInicio" readonly disabled class="form-control">
                </div>
                <div class="form-group">
                    <label>Fim:</label>
                    <input type="text" id="viewFim" readonly disabled class="form-control">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <input type="text" id="viewStatus" readonly disabled>
                </div>
            </div>
            <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelCalBtn">Fechar
                    </button>
                    <button type="submit" class="btn btn-primary" id="salvarCalBtn">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                    <button type="button" class="btn btn-warning" style="background-color: #f39c12;" id="openFullCalendarBtn">
                    <i class="fas fa-calendar-month"></i> Visualizar Dias Letivos
                    </button>
                </div>
                </form>
        </div>
    </div>

    <div id="fullCalendarModal" class="modal modal-dialog-centered" style="z-index: 1070;">
        <div class="modal-content" style="width: 440px; max-width: 95%;">
            <span class="close-button" id="closeFullCalendarBtn">&times;</span>
            <div id="calendarEl" style="height: 500px;"></div>
            <div class="mt-2 text-xs flex gap-2 justify-center flex-wrap">
                <span class="px-2 py-1 rounded bg-blue-200">Presencial</span>
                <span class="px-2 py-1 rounded bg-purple-200">EAD</span>
                <span class="px-2 py-1 rounded bg-green-200">Prática</span>
                <span class="px-2 py-1 rounded bg-yellow-200">Reposição</span>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.14/index.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core/locales/pt-br.global.js"></script>

<script src="../assets/js/geral_script.js"></script>
<script src="../assets/js/calendario_script.js"></script>
   </body>
</html>