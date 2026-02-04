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
<style>
    /* Garante que o calendário tenha altura dentro do modal */
    #calendarEl {
        min-height: 500px;
    }
    /* Ajuste de z-index para tooltips ou popups do calendário se sobreporem ao modal */
    .fc {
        z-index: 1080;
    }
</style>

<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.14/index.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core/locales/pt-br.global.js"></script>
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

    <div id="diaModal" class="modal modal-dialog-centered" style="z-index: 1100;">
        <div class="modal-content">
            <span class="close-button" id="cancelDiaBtnX" onclick="App.ui.hideModal(document.getElementById('diaModal'))">&times;</span>
            <h2 id="modalTitleDia">Gerenciar Dia Letivo</h2>
            
            <form id="diaForm">
                <input type="hidden" id="diaId" value="">

                <div class="form-group">
                    <label>Calendário:</label>
                    <select id="selectCalDia" class="form-control" required disabled>
                        </select>
                </div>

                <div class="form-group">
                    <label>Tipo de Evento:</label>
                    <select id="tipoDia" class="form-control" required disabled>
                        <option value="">Selecione...</option>
                        <option value="Presencial">Presencial</option>
                        <option value="EAD">EAD</option>
                        <option value="Prática na Unidade">Prática na Unidade</option>
                        <option value="Reposição">Reposição</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label>Data Início:</label>
                        <input type="date" id="inicioDia" class="form-control" required disabled>
                    </div>
                    
                    <div class="form-group" id="divFinalDia">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                            <label for="finalDia" style="margin:0;">Data Final:</label>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="checkbox" id="checkRange" disabled style="width:auto; margin:0;">
                                <label for="checkRange" style="font-size:0.8em; margin:0; cursor:pointer;">Período?</label>
                            </div>
                        </div>
                        <input type="date" id="finalDia" class="form-control" disabled>
                    </div>
                </div>

                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #dee2e6; padding-top: 15px;">
                    
                    <button type="button" class="btn text-white bg-red-600 hover:bg-red-700 hidden" id="btnDeleteDia">
                        <i class="fas fa-trash"></i> Excluir
                    </button>

                    <div style="display: flex; gap: 10px; margin-left: auto;">
                        <button type="button" class="btn btn-secondary" id="cancelDiaBtn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
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
                    <input type="text" id="viewStatus" readonly disabled class="form-control">
                </div>
            </div>
            <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelCalBtn">Fechar
                    </button>
                    
                    <button type="button" class="btn btn-warning" style="background-color: #f39c12;" id="openFullCalendarBtn">
                    <i class="fas fa-calendar-month"></i> Visualizar Dias Letivos
                    </button>
                </div>
                </form>
        </div>
    </div>

    <div id="fullCalendarModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            
            <span class="close-button" id="closeFullCalendarBtn">&times;</span>
            
            <h2>Visualização de Dias Letivos</h2>
            
            
                <div id="calendarEl"></div>
                
                <div class="mt-3 flex gap-3 justify-center flex-wrap" style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-200 block border border-blue-300"></span> <span class="text-sm text-gray-700">Presencial</span></div>
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-200 block border border-purple-300"></span> <span class="text-sm text-gray-700">EAD</span></div>
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-200 block border border-green-300"></span> <span class="text-sm text-gray-700">Prática</span></div>
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-200 block border border-yellow-300"></span> <span class="text-sm text-gray-700">Reposição</span></div>
                </div>
            
            <div class="modal-footer"
                    style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="btnCloseFullCal">Fechar
                    </button>
                </div>
            

        </div>
    </div>
    <div id="decisionModal" class="modal modal-dialog-centered">
    <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px 30px 50px 30px; margin: 20px auto;">
        
        <span class="close-button" onclick="App.ui.hideModal(document.getElementById('decisionModal'))">&times;</span>
        
        <h2 style="margin-bottom: 30px;">O que deseja editar?</h2>
        
        <div class="flex flex-col">
            
            <button type="button" class="btn btn-secondary w-full" id="btnDecisaoDados" 
                    style="padding: 15px 25px; margin-bottom: 20px; font-size: 1.1em;">
                <i class="fas fa-edit"></i> Editar Dados do Calendário
            </button>
            
            <button type="button" class="btn btn-secondary w-full" id="btnDecisaoDias" 
                    style="padding: 15px 25px; font-size: 1.1em;">
                <i class="fas fa-calendar-alt"></i> Gerenciar Dias Letivos
            </button>
            
        </div>
    </div>
</div>


   
<script src="../assets/js/geral_script.js"></script>
<script src="../assets/js/calendario_script.js"></script>
   </body>
</html>