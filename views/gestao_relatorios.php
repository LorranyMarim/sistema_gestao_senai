<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatórios - SENAI</title>
    <link rel="stylesheet" href="../assets/css/style_turmas.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
                    <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                    <li><a href="gestao_relatorios.php" class="active"><i class="fas fa-file-alt"></i> Relatórios</a></li>
                    <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>
            <header class="main-header">
                <h1>Relatórios</h1>
                <div class="user-info">
                    <span>Bem-vindo, <?php echo $_SESSION['username'] ?? 'Usuário'; ?></span>
                </div>
            </header>

            <div class="content-area">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Relatório de Cursos -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold">Relatório de Cursos</h3>
                            <i class="fas fa-book text-blue-500 text-2xl"></i>
                        </div>
                        <p class="text-gray-600 mb-4">Visualize estatísticas e dados dos cursos cadastrados</p>
                        <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onclick="gerarRelatorioCursos()">
                            <i class="fas fa-download mr-2"></i>Gerar Relatório
                        </button>
                    </div>

                    <!-- Relatório de Instrutores -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold">Relatório de Instrutores</h3>
                            <i class="fas fa-chalkboard-teacher text-green-500 text-2xl"></i>
                        </div>
                        <p class="text-gray-600 mb-4">Acompanhe a carga horária e alocação dos instrutores</p>
                        <button class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onclick="gerarRelatorioInstrutores()">
                            <i class="fas fa-download mr-2"></i>Gerar Relatório
                        </button>
                    </div>

                    <!-- Relatório de Turmas -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold">Relatório de Turmas</h3>
                            <i class="fas fa-users text-purple-500 text-2xl"></i>
                        </div>
                        <p class="text-gray-600 mb-4">Dados sobre ocupação e status das turmas</p>
                        <button class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600" onclick="gerarRelatorioTurmas()">
                            <i class="fas fa-download mr-2"></i>Gerar Relatório
                        </button>
                    </div>
                </div>

                <!-- Área de visualização de relatórios -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-semibold mb-4">Visualização de Dados</h3>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <canvas id="chartCursos" width="400" height="200"></canvas>
                        </div>
                        <div>
                            <canvas id="chartInstrutores" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script src="../assets/js/geral.js"></script>
    <script>
        function gerarRelatorioCursos() {
            // Implementar geração de relatório de cursos
            alert('Funcionalidade em desenvolvimento');
        }

        function gerarRelatorioInstrutores() {
            // Implementar geração de relatório de instrutores
            alert('Funcionalidade em desenvolvimento');
        }

        function gerarRelatorioTurmas() {
            // Implementar geração de relatório de turmas
            alert('Funcionalidade em desenvolvimento');
        }

        // Gráficos de exemplo
        const ctxCursos = document.getElementById('chartCursos').getContext('2d');
        new Chart(ctxCursos, {
            type: 'doughnut',
            data: {
                labels: ['Ativos', 'Inativos', 'Planejamento'],
                datasets: [{
                    data: [12, 3, 5],
                    backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Status dos Cursos'
                    }
                }
            }
        });

        const ctxInstrutores = document.getElementById('chartInstrutores').getContext('2d');
        new Chart(ctxInstrutores, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
                datasets: [{
                    label: 'Carga Horária',
                    data: [120, 150, 180, 140, 160],
                    backgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Carga Horária Mensal'
                    }
                }
            }
        });
    </script>
</body>
</html>