<?php
require_once("../config/verifica_login.php"); // Caminho relativo à página!
?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Turmas SENAI</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style_turmas.css">
    <!-- Font Awesome CDN for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

</head>
<style>
    .modal {
        display: none;
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
        justify-content: center;
        align-items: center;
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
                    <li><a href="dashboard.php" class="active"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de
                            UCs</a></li>
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
            <button class="menu-toggle" id="menu-toggle">
                <i class="fas fa-bars"></i>
            </button>
            <header class="main-header">
                <h1>Dashboard</h1>

            </header>
            <!-- Seção de Cartões de Resumo -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Total de Turmas -->
                <div class="bg-blue-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold" id="totalTurmas">0</div>
                        <div class="text-sm">Total de Turmas</div>
                    </div>
                    <i class="fas fa-users text-4xl opacity-75"></i>
                </div>
                <!-- Total de Alunos -->
                <div class="bg-green-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold" id="totalAlunos">0</div>
                        <div class="text-sm">Total de Alunos</div>
                    </div>
                    <i class="fas fa-user-graduate text-4xl opacity-75"></i>
                </div>
                <!-- Turmas Ativas (placeholder) -->
                <div class="bg-yellow-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold" id="turmasAtivas">0</div>
                        <div class="text-sm">Turmas Ativas</div>
                    </div>
                    <i class="fas fa-play-circle text-4xl opacity-75"></i>
                </div>
                <div class="bg-red-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div>
                        <div class="text-2xl font-bold" id="turmasIncompletas">0</div>
                        <div class="text-sm">UCs sem Instrutor</div>
                    </div>
                    <i class="fas fa-exclamation-triangle text-4xl opacity-75"></i>
                </div>
            </div>

            <!-- Seção de Distribuição por Turno e Área -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Distribuição por Turno -->
                <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">Distribuição por Turno</h2>
                    <div id="distribuicaoTurno" class="space-y-2">
                        <canvas id="chartjs-bar" height="120"></canvas>
                    </div>
                </div>
                <!-- Distribuição por Área -->
                <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">Distribuição por Área</h2>
                    <div id="distribuicaoArea" class="space-y-2">
                        <canvas id="chartjs-pie" height="180"></canvas>
                    </div>
                </div>
            </div>

            <!-- Seção de Próximas Turmas e Turmas com Datas Vazias -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Próximas Turmas (iniciando em breve) -->
                <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">Próximas Turmas (Início em 30 dias)</h2>
                    <ul id="proximasTurmas" class="list-disc list-inside space-y-1 text-gray-600">
                        <!-- Conteúdo gerado via JS -->
                    </ul>
                    <p id="noProximasTurmas" class="text-gray-500 italic hidden">Nenhuma turma iniciando nos próximos 30
                        dias.</p>
                </div>
                <!-- Turmas com Datas de Término ou Alunos Vazios -->
                <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">Turmas com Dados Incompletos</h2>
                    <ul id="turmasComDadosVazios" class="list-disc list-inside space-y-1 text-gray-600">
                        <!-- Conteúdo gerado via JS -->
                    </ul>
                    <p id="noTurmasComDadosVazios" class="text-gray-500 italic hidden">Nenhuma turma com dados
                        incompletos.</p>
                </div>
            </div>
    </div>
    <script src="../assets/js/geral.js"></script>
    <script src="../assets/js/prefetch.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="../assets/js/dashboard.js"></script>
</body>

</html>