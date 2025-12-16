<?php
require_once("../config/verifica_login.php");
?>

<!DOCTYPE html>
<html lang="pt-BR" id="page-dashboard-html">

<head id="page-head">
    <meta charset="UTF-8" id="meta-charset">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" id="meta-viewport">
    <title id="page-title">Dashboard de Turmas SENAI</title>
    <script src="https://cdn.tailwindcss.com" id="script-tailwind"></script>
    <link rel="stylesheet" href="../assets/css/style.css" id="link-css-custom">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" id="link-css-fontawesome">
</head>
<style>
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

        #ucModal,
        #visualizarUcModal {
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, .3);
        }

        #ucModal.show,
        #visualizarUcModal.show {
            display: flex !important;
        }

        #ucModal .modal-content,
        #visualizarUcModal .modal-content {
            width: min(680px, 90vw);
            max-height: 90vh;
            overflow: auto;
            border-radius: 10px;
            padding: 30px;
            background: #fff;
            position: relative;
        }

        #visualizarUcModal .modal-content input[readonly],
        #visualizarUcModal .modal-content input[disabled] {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }
</style>

<body id="body-dashboard-main">
    <div class="dashboard-container" id="wrapper-dashboard-layout">
        
        <aside class="sidebar" id="sidebar-navigation-area">
            <div class="sidebar-header" id="sidebar-header-box">
                <img src="../assets/logo.png" alt="Logo SENAI" class="sidebar-logo" id="sidebar-img-logo">
                <h3 id="sidebar-text-title">Menu Principal</h3>
            </div>
            
            <nav class="sidebar-nav" id="sidebar-nav-wrapper">
                <ul id="sidebar-ul-list">
                    <li id="nav-item-dashboard">
                        <a href="dashboard.php" class="active" id="nav-link-dashboard">
                            <i class="fas fa-chart-line" id="nav-icon-dashboard"></i> <span id="nav-text-dashboard">Dashboard</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-cursos">
                        <a href="gestao_cursos.php" id="nav-link-cursos">
                            <i class="fas fa-book" id="nav-icon-cursos"></i> <span id="nav-text-cursos">Gestão de Cursos</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-turmas">
                        <a href="gestao_turmas.php" id="nav-link-turmas">
                            <i class="fas fa-users" id="nav-icon-turmas"></i> <span id="nav-text-turmas">Gestão de Turmas</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-instrutores">
                        <a href="gestao_instrutores.php" id="nav-link-instrutores">
                            <i class="fas fa-chalkboard-teacher" id="nav-icon-instrutores"></i> <span id="nav-text-instrutores">Gestão de Instrutores</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-empresas">
                        <a href="gestao_empresas.php" id="nav-link-empresas">
                            <i class="fas fa-building" id="nav-icon-empresas"></i> <span id="nav-text-empresas">Gestão de Empresas</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-ucs">
                        <a href="gestao_ucs.php" id="nav-link-ucs">
                            <i class="fas fa-graduation-cap" id="nav-icon-ucs"></i> <span id="nav-text-ucs">Gestão de UCs</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-calendario">
                        <a href="gestao_calendario.php" id="nav-link-calendario">
                            <i class="fas fa-calendar-alt" id="nav-icon-calendario"></i> <span id="nav-text-calendario">Gestão de Calendários</span>
                        </a>
                    </li>
                    
                    <li id="nav-item-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios-list" id="nav-toggle-relatorios">
                            <span id="nav-span-relatorios-group">
                                <i class="fas fa-file-alt" id="nav-icon-relatorios"></i> Relatórios
                            </span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true" id="nav-caret-relatorios"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios-list">
                            <li id="nav-subitem-disp-instrutor">
                                <a href="relatorio_disponibilidade_instrutor.php" id="nav-link-disp-instrutor">Disponibilidade de Instrutor</a>
                            </li>
                        </ul>
                    </li>

                    <li id="nav-item-config" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-config-list" id="nav-toggle-config">
                            <span id="nav-span-config-group">
                                <i class="fas fa-tools" id="nav-icon-config"></i> Configuração
                            </span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true" id="nav-caret-config"></i>
                        </a>
                        <ul class="submenu" id="submenu-config-list">
                            <li id="nav-subitem-usuarios">
                                <a href="configuracao_usuarios.php" id="nav-link-usuarios">Usuários</a>
                            </li>
                        </ul>
                    </li>

                    <li id="nav-item-logout">
                        <a href="../backend/logout.php" id="nav-link-logout">
                            <i class="fas fa-sign-out-alt" id="nav-icon-logout"></i> <span id="nav-text-logout">Sair</span>
                        </a>
                    </li>
                </ul>
            </nav>
        </aside>

        <main class="main-content" id="main-content-section">
            
            <button class="menu-toggle" id="btn-menu-toggle-mobile">
                <i class="fas fa-bars" id="icon-menu-hamburger"></i>
            </button>
            
            <header class="main-header" id="header-dashboard-top">
                <h1 id="title-dashboard-h1">Dashboard</h1>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="grid-container-metrics">
                
                <div class="bg-blue-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between" id="card-metric-total-turmas">
                    <div id="wrapper-info-total-turmas">
                        <div class="text-2xl font-bold" id="totalTurmas">0</div>
                        <div class="text-sm" id="label-total-turmas">Total de Turmas</div>
                    </div>
                    <i class="fas fa-users text-4xl opacity-75" id="icon-metric-total-turmas"></i>
                </div>

                <div class="bg-green-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between" id="card-metric-total-alunos">
                    <div id="wrapper-info-total-alunos">
                        <div class="text-2xl font-bold" id="totalAlunos">0</div>
                        <div class="text-sm" id="label-total-alunos">Total de Alunos</div>
                    </div>
                    <i class="fas fa-user-graduate text-4xl opacity-75" id="icon-metric-total-alunos"></i>
                </div>

                <div class="bg-yellow-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between" id="card-metric-turmas-ativas">
                    <div id="wrapper-info-turmas-ativas">
                        <div class="text-2xl font-bold" id="turmasAtivas">0</div>
                        <div class="text-sm" id="label-turmas-ativas">Turmas Ativas</div>
                    </div>
                    <i class="fas fa-play-circle text-4xl opacity-75" id="icon-metric-turmas-ativas"></i>
                </div>

                <div class="bg-red-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between" id="card-metric-turmas-incompletas">
                    <div id="wrapper-info-turmas-incompletas">
                        <div class="text-2xl font-bold" id="turmasIncompletas">0</div>
                        <div class="text-sm" id="label-turmas-incompletas">UCs sem Instrutor</div>
                    </div>
                    <i class="fas fa-exclamation-triangle text-4xl opacity-75" id="icon-metric-turmas-incompletas"></i>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="grid-container-charts">
                
                <div class="bg-gray-50 p-6 rounded-lg shadow-md" id="card-chart-turnos-wrapper">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4" id="title-chart-turnos">Distribuição por Turno</h2>
                    <div id="distribuicaoTurno" class="space-y-2">
                        <canvas id="chartjs-bar" height="120"></canvas>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-6 rounded-lg shadow-md" id="card-chart-areas-wrapper">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4" id="title-chart-areas">Distribuição por Área</h2>
                    <div id="distribuicaoArea" class="space-y-2">
                        <canvas id="chartjs-pie" height="180"></canvas>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="grid-container-lists">
                
                <div class="bg-gray-50 p-6 rounded-lg shadow-md" id="card-list-proximas-wrapper">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4" id="title-list-proximas">Próximas Turmas (Início em 30 dias)</h2>
                    <ul id="proximasTurmas" class="list-disc list-inside space-y-1 text-gray-600"></ul>
                    <p id="noProximasTurmas" class="text-gray-500 italic hidden">Nenhuma turma iniciando nos próximos 30 dias.</p>
                </div>

                <div class="bg-gray-50 p-6 rounded-lg shadow-md" id="card-list-incompletas-wrapper">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4" id="title-list-incompletas">Turmas com Dados Incompletos</h2>
                    <ul id="turmasComDadosVazios" class="list-disc list-inside space-y-1 text-gray-600"></ul>
                    <p id="noTurmasComDadosVazios" class="text-gray-500 italic hidden">Nenhuma turma com dados incompletos.</p>
                </div>
            </div>

        </main>
    </div>

    <script src="../assets/js/geral_script.js" id="script-custom-geral"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js" id="script-lib-chartjs"></script>
    <script src="../assets/js/dashboard_script.js" id="script-custom-dashboard"></script>
</body>
</html>