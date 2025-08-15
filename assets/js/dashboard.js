
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