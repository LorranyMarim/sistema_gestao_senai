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
    /* Estilos do Botão Switch */
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    input:checked + .slider { background-color: #3b82f6; } /* Azul Primary Tailwind */
    input:checked + .slider:before { transform: translateX(20px); }
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
                            <span><i class="fas fa-file-alt"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="ocupacao_instrutores.php">Ocupação de Intrutores</a></li>
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

            <div class="stepper-wrapper">
                <div class="step-item active" data-step="1">
                    <div class="step-circle">1</div><small>Geral</small>
                </div>
                <div class="step-item" data-step="2">
                    <div class="step-circle">2</div><small>Presencial</small>
                </div>
                <div class="step-item" data-step="3">
                    <div class="step-circle">3</div><small>EAD</small>
                </div>
                <div class="step-item" data-step="4">
                    <div class="step-circle">4</div><small>Feriados</small>
                </div>
                <div class="step-item" data-step="5">
                    <div class="step-circle">5</div><small>Configurações</small>
                </div>
            </div>

            <form id="calForm" autocomplete="off" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
                <input type="hidden" id="calId">
                <div class="modal-body">
                    
                    <div class="form-step active" id="step-cal-1">
                        <h5 class="mb-3 border-bottom pb-2"><b>Informações Gerais</b></h5>
                        <div class="form-group">
                            <label for="tituloCal">Título:</label>
                            <input type="text" id="tituloCal" class="form-control" required minlength="3" placeholder="Ex: Calendário 2026 - Técnico">
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-3">
                            <div class="form-group">
                                <label for="inicioCal">Início:</label>
                                <input type="date" id="inicioCal" class="form-control" required min="1990-01-01">
                            </div>
                            <div class="form-group">
                                <label for="finalCal">Fim:</label>
                                <input type="date" id="finalCal" class="form-control" required disabled>
                            </div>
                        </div>
                        <div class="form-group mt-3">
                            <label for="statusCal">Status:</label>
                            <select id="statusCal" class="form-control bg-light" disabled readonly>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-step" id="step-cal-2">
                        <h5 class="mb-3 border-bottom pb-2"><b>Aulas Presenciais</b></h5>
                        <p class="mb-3 text-sm text-gray-700">Selecione os dias em que haverá aula presencial na unidade SENAI Betim ou em empresas/escolas externas.</p>
                        <div class="mb-4">
                            <label class="inline-flex items-center cursor-pointer">
                              <span class="switch mr-2">
                                <input type="checkbox" id="switchPresencial">
                                <span class="slider"></span>
                              </span>
                              <span class="text-sm font-medium text-gray-700">Não há aulas presenciais neste calendário</span>
                            </label>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3" id="gridPresencial">
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Segunda"><span>Segunda</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Terça"><span>Terça</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Quarta"><span>Quarta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Quinta"><span>Quinta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Sexta"><span>Sexta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Sábado"><span>Sábado</span></label>
                        </div>
                    </div>

                    <div class="form-step" id="step-cal-3">
                        <h5 class="mb-3 border-bottom pb-2"><b>Aulas EAD</b></h5>
                        <p class="mb-3 text-sm text-gray-700">Em quais dias da semana ocorrerão aulas EAD?</p>
                        <div class="mb-4">
                            <label class="inline-flex items-center cursor-pointer">
                              <span class="switch mr-2">
                                <input type="checkbox" id="switchEad">
                                <span class="slider"></span>
                              </span>
                              <span class="text-sm font-medium text-gray-700">Não há aulas EAD neste calendário</span>
                            </label>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3" id="gridEad">
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Segunda"><span>Segunda</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Terça"><span>Terça</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Quarta"><span>Quarta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Quinta"><span>Quinta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Sexta"><span>Sexta</span></label>
                            <label class="flex items-center space-x-2 text-sm"><input type="checkbox" class="form-checkbox h-4 w-4" value="Sábado"><span>Sábado</span></label>
                        </div>
                    </div>

                    <div class="form-step" id="step-cal-4">
                        <h5 class="mb-3 border-bottom pb-2"><b>Feriados</b></h5>
                        <p class="mb-2 text-sm text-gray-700 font-bold">Deseja considerar os feriados nacionais como dias/período letivo?</p>
                        <div class="mb-4">
                            <label class="flex items-center space-x-2 text-sm mb-1">
                                <input type="radio" name="considerarFeriados" value="sim">
                                <span>Sim, considerar automaticamente.</span>
                            </label>
                            <label class="flex items-center space-x-2 text-sm">
                                <input type="radio" name="considerarFeriados" value="nao" checked>
                                <span>Não, marcar automaticamente como não letivo.</span>
                            </label>
                        </div>
                        <hr class="my-3">
                        <p class="mb-2 text-sm text-gray-700">Selecione os feriados municipais que devem ser considerados como dias não letivos:</p>
                        <div id="containerFeriadosMunicipais" class="space-y-2">
                            <div class="flex items-center gap-2 feriado-row">
                                <input type="date" class="form-control w-1/3">
                                <input type="text" class="form-control w-full" placeholder="Descrição do feriado municipal">
                                <button type="button" class="btn btn-primary btn-add-feriado"><i class="fas fa-plus"></i></button>
                                <button type="button" class="btn btn-danger btn-remove-feriado hidden"><i class="fas fa-minus"></i></button>
                            </div>
                        </div>
                    </div>

                    <div class="form-step" id="step-cal-5">
                        <h5 class="mb-3 border-bottom pb-2"><b>Configurações Adicionais</b></h5>
                        <div class="mb-4">
                            <p class="mb-2 text-sm text-gray-700 font-bold">1. Reposição - Deseja adicionar datas específicas para reposição?</p>
                            <div class="flex gap-4 mb-2">
                                <label class="flex items-center space-x-2 text-sm"><input type="radio" name="hasReposicao" value="nao" checked><span>Não</span></label>
                                <label class="flex items-center space-x-2 text-sm"><input type="radio" name="hasReposicao" value="sim"><span>Sim</span></label>
                            </div>
                            <div id="containerReposicao" class="space-y-2 hidden pl-4 border-l-2 border-gray-200">
                                <div class="flex items-center gap-2 reposicao-row">
                                    <input type="date" class="form-control w-1/3">
                                    <input type="text" class="form-control w-full" placeholder="Descrição da reposição">
                                    <button type="button" class="btn btn-primary btn-add-reposicao"><i class="fas fa-plus"></i></button>
                                    <button type="button" class="btn btn-danger btn-remove-reposicao hidden"><i class="fas fa-minus"></i></button>
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <p class="mb-2 text-sm text-gray-700 font-bold">2. Aula Prática na Unidade Betim - Deseja incluir dias de Aula Prática na Unidade Betim?</p>
                            <div class="flex gap-4 mb-2">
                                <label class="flex items-center space-x-2 text-sm"><input type="radio" name="hasPratica" value="nao" checked><span>Não</span></label>
                                <label class="flex items-center space-x-2 text-sm"><input type="radio" name="hasPratica" value="sim"><span>Sim</span></label>
                            </div>
                            <div id="containerPratica" class="space-y-2 hidden pl-4 border-l-2 border-gray-200">
                                <div class="flex items-center gap-2 pratica-row">
                                    <input type="date" class="form-control w-1/3">
                                    <input type="text" class="form-control w-full" placeholder="Descrição da aula prática">
                                    <button type="button" class="btn btn-primary btn-add-pratica"><i class="fas fa-plus"></i></button>
                                    <button type="button" class="btn btn-danger btn-remove-pratica hidden"><i class="fas fa-minus"></i></button>
                                </div>
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 italic mt-4 border-t pt-2">Utilizado para turmas de empresas ou trilhas nas escolas.</p>
                    </div>

                </div>
                
                <div class="modal-footer" style="background-color: #fff; z-index: 10; display: flex; justify-content: space-between; border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
                    <div class="step-actions" style="display: flex; justify-content: space-between; width: 100%;">
                    <button type="button" class="btn btn-secondary" id="btnCancelCal" disabled>Cancelar
                        </button>    
                    <button type="button" class="btn btn-secondary" id="btnPrevCal" disabled>
                            <i class="fas fa-arrow-left"></i> Anterior
                        </button>
                        <div>
                            <button type="button" class="btn btn-secondary" id="btnNextCal">
                                Próximo <i class="fas fa-arrow-right"></i>
                            </button>
                            <button type="submit" class="btn btn-primary" id="btnSubmit" style="display: none;">
                                <i class="fas fa-save"></i> Gerar Calendário
                            </button>
                        </div>
                    </div>
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