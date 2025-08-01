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
    <link rel="stylesheet" href="../css/style_turmas.css">
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
                    <!--<li><a href="gestao_alocacao.php"><i class="fas fa-random"></i> Gestão de Alocações</a></li>-->
                    <li><a href="gestao_cursos.php" ><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <!--<li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>-->
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de
                            UCs</a></li>
                    <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i>Calendário</a></li>
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
                <i class="fas fa-users-class text-4xl opacity-75"></i>
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
            <!-- Turmas com Dados Incompletos -->
            <div class="bg-red-500 text-white p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                    <div class="text-2xl font-bold" id="turmasIncompletas">0</div>
                    <div class="text-sm">Dados Incompletos</div>
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
                    <!-- Conteúdo gerado via JS -->
                </div>
            </div>
            <!-- Distribuição por Área -->
            <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Distribuição por Área</h2>
                <div id="distribuicaoArea" class="space-y-2">
                    <!-- Conteúdo gerado via JS -->
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
                <p id="noProximasTurmas" class="text-gray-500 italic hidden">Nenhuma turma iniciando nos próximos 30 dias.</p>
            </div>
            <!-- Turmas com Datas de Término ou Alunos Vazios -->
            <div class="bg-gray-50 p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Turmas com Dados Incompletos</h2>
                <ul id="turmasComDadosVazios" class="list-disc list-inside space-y-1 text-gray-600">
                    <!-- Conteúdo gerado via JS -->
                </ul>
                <p id="noTurmasComDadosVazios" class="text-gray-500 italic hidden">Nenhuma turma com dados incompletos.</p>
            </div>
        </div>
    </div>

    <script>
        let turmasData = []; // Inicializa turmasData como um array vazio

        // Mapeamento de cursos para área (simplificado para o dashboard)
        const courseAreaMapping = {
            'Aperfeiçoamento em Operação Segura de Empilhadeira': 'Mecânica',
            'Aperfeiçoamento em Lubrificação Industrial': 'Mecânica',
            'Empilhadeira': 'Mecânica',
            'Aprendizagem Industrial em Gestão Industrial': 'Gestão',
            'Aprendizagem Industrial Eletricista Industrial': 'Eletroeletrônica',
            'APRENDIZAGEM INDUSTRIAL EM MANUTENÇÃO MECÂNICA DE AUTOMÓVEIS': 'Mecânica',
            'APRENDIZAGEM INDUSTRIAL EM PROCESSOS ADMINISTRATIVOS': 'Gestão',
            'APRENDIZAGEM INDUSTRIAL EM CONTROLE DE QUALIDADE': 'Gestão',
            'TÉCNICO EM DESENVOLVIMENTO DE SISTEMAS': 'Tecnologia da Informação',
            'TÉCNICO EM INFORMÁTICA PARA INTERNET': 'Tecnologia da Informação',
            'APRENDIZAGEM MANUTENÇÃO MECÂNICA DE MÁQUINAS INDUSTRIAIS': 'Mecânica',
            'APRENDIZAGEM INDUSTRIAL EM ELETRICIDADE DE AUTOMÓVEIS': 'Eletroeletrônica',
            'APRENDIZAGEM INDUSTRIAL EM MANUTENÇÃO ELETROMECÂNICA': 'Eletroeletrônica',
            'TÉCNICO EM MECÂNICA': 'Mecânica',
            'TÉCNICO EM ELETROMECÂNICA': 'Eletroeletrônica',
            'TÉCNICO EM SEGURANÇA DO TRABALHO': 'Gestão',
            'TÉCNICO EM ELETROTÉCNICA': 'Eletroeletrônica',
            'TÉCNICO EM AUTOMAÇÃO INDUSTRIAL': 'Eletroeletrônica',
        };

        // Função para normalizar o turno
        function normalizeTurno(turno) {
            switch (turno.toUpperCase()) {
                case 'MANHA': return 'Manhã';
                case 'TARDE': return 'Tarde';
                case 'NOITE': return 'Noite';
                case 'INTEGRAL':
                case 'TARDE/NOITE': return 'Integral';
                default: return 'Indefinido';
            }
        }

        // Função para obter a área do curso
        function getAreaFromCourse(curso) {
            const normalizedCourse = curso.toUpperCase();
            for (const key in courseAreaMapping) {
                if (normalizedCourse.includes(key.toUpperCase())) {
                    return courseAreaMapping[key];
                }
            }
            return 'Outros'; // Área padrão se não encontrar correspondência
        }

        async function fetchTurmasData() {
            try {
                // Faz a requisição para o arquivo PHP que retorna os dados das turmas
                // Certifique-se de que 'dados_dash.php' está no mesmo diretório do seu HTML
                // e que o servidor web está configurado para processar PHP.
                const response = await fetch('dados_dash.php'); 
                if (!response.ok) {
                    throw new Error(`Erro HTTP! status: ${response.status}`);
                }
                turmasData = await response.json();
                renderDashboard(); // Renderiza o dashboard após carregar os dados
            } catch (error) {
                console.error("Erro ao buscar dados das turmas:", error);
                // Exibir uma mensagem de erro no dashboard, se necessário
                document.getElementById('totalTurmas').textContent = 'Erro';
                document.getElementById('totalAlunos').textContent = 'Erro';
                document.getElementById('turmasAtivas').textContent = 'Erro';
                document.getElementById('turmasIncompletas').textContent = 'Erro';
            }
        }

        function renderDashboard() {
            let totalTurmas = turmasData.length;
            let totalAlunos = 0;
            let turmasAtivasCount = 0;
            let turmasIncompletasCount = 0;
            let distribuicaoTurno = {};
            let distribuicaoArea = {};
            let proximasTurmas = [];
            let turmasComDadosVazios = [];

            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            turmasData.forEach(turma => {
                // Total de alunos
                const numAlunos = parseInt(turma.num_alunos);
                if (!isNaN(numAlunos)) {
                    totalAlunos += numAlunos;
                }

                // Distribuição por Turno
                const turnoNormalizado = normalizeTurno(turma.turno);
                distribuicaoTurno[turnoNormalizado] = (distribuicaoTurno[turnoNormalizado] || 0) + 1;

                // Distribuição por Área
                const area = getAreaFromCourse(turma.curso);
                distribuicaoArea[area] = (distribuicaoArea[area] || 0) + 1;

                // Turmas com dados incompletos
                if (turma.data_inicio === '' || turma.data_termino === '' || turma.num_alunos === '') {
                    turmasIncompletasCount++;
                    turmasComDadosVazios.push(turma);
                }

                // Turmas Ativas e Próximas Turmas
                if (turma.data_inicio) {
                    const startDate = new Date(turma.data_inicio);
                    const endDate = turma.data_termino ? new Date(turma.data_termino) : null;

                    // Turmas Ativas (simplificado: iniciaram e ainda não terminaram, ou sem data de término)
                    if (startDate <= today && (!endDate || endDate >= today)) {
                        turmasAtivasCount++;
                    }

                    // Próximas Turmas (iniciando nos próximos 30 dias)
                    if (startDate > today && startDate <= thirtyDaysFromNow) {
                        proximasTurmas.push(turma);
                    }
                }
            });

            // Atualizar os cartões de resumo
            document.getElementById('totalTurmas').textContent = totalTurmas;
            document.getElementById('totalAlunos').textContent = totalAlunos;
            document.getElementById('turmasAtivas').textContent = turmasAtivasCount;
            document.getElementById('turmasIncompletas').textContent = turmasIncompletasCount;

            // Atualizar Distribuição por Turno
            const distribuicaoTurnoEl = document.getElementById('distribuicaoTurno');
            distribuicaoTurnoEl.innerHTML = '';
            for (const turno in distribuicaoTurno) {
                distribuicaoTurnoEl.innerHTML += `<p class="text-gray-700">${turno}: <span class="font-bold">${distribuicaoTurno[turno]}</span></p>`;
            }

            // Atualizar Distribuição por Área
            const distribuicaoAreaEl = document.getElementById('distribuicaoArea');
            distribuicaoAreaEl.innerHTML = '';
            for (const area in distribuicaoArea) {
                distribuicaoAreaEl.innerHTML += `<p class="text-gray-700">${area}: <span class="font-bold">${distribuicaoArea[area]}</span></p>`;
            }

            // Atualizar Próximas Turmas
            const proximasTurmasEl = document.getElementById('proximasTurmas');
            proximasTurmasEl.innerHTML = '';
            if (proximasTurmas.length > 0) {
                document.getElementById('noProximasTurmas').classList.add('hidden');
                proximasTurmas.forEach(turma => {
                    proximasTurmasEl.innerHTML += `<li>${turma.codigo_turma} - ${turma.curso} (Início: ${turma.data_inicio})</li>`;
                });
            } else {
                document.getElementById('noProximasTurmas').classList.remove('hidden');
            }

            // Atualizar Turmas com Dados Vazios
            const turmasComDadosVaziosEl = document.getElementById('turmasComDadosVazios');
            turmasComDadosVaziosEl.innerHTML = '';
            if (turmasComDadosVazios.length > 0) {
                document.getElementById('noTurmasComDadosVazios').classList.add('hidden');
                turmasComDadosVazios.forEach(turma => {
                    let missingFields = [];
                    if (turma.data_inicio === '') missingFields.push('Data de Início');
                    if (turma.data_termino === '') missingFields.push('Data de Término');
                    if (turma.num_alunos === '') missingFields.push('Número de Alunos');
                    turmasComDadosVaziosEl.innerHTML += `<li>${turma.codigo_turma} - ${turma.curso} (Faltando: ${missingFields.join(', ')})</li>`;
                });
            } else {
                document.getElementById('noTurmasComDadosVazios').classList.remove('hidden');
            }
        }

        // Renderiza o dashboard quando o DOM estiver completamente carregado
        document.addEventListener('DOMContentLoaded', fetchTurmasData); // Chama a função para buscar os dados
    </script>
    <script>
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const dashboardContainer = document.querySelector('.dashboard-container');

        // Função para abrir/fechar o menu
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            dashboardContainer.classList.toggle('sidebar-active');
        });

        // Função para fechar o menu ao clicar fora dele
        dashboardContainer.addEventListener('click', (event) => {
            if (dashboardContainer.classList.contains('sidebar-active') && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                sidebar.classList.remove('active');
                dashboardContainer.classList.remove('sidebar-active');
            }
        });
    </script>
</body>
</html>
