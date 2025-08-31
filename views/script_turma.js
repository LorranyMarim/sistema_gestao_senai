// ======================= Configurações e Endpoints =======================
const API_TURMA = '../backend/processa_turma.php';
const API_CURSO = '../backend/processa_curso.php';
const API_INSTITUICAO = '../backend/processa_instituicao.php';
const API_CALENDARIO = '../backend/processa_calendario.php';
const API_EMPRESA = '../backend/processa_empresa.php';
const API_UC = '../backend/processa_unidade_curricular.php';
const API_INSTRUTOR = '../backend/processa_instrutor.php';

// ======================= Cache de dados =======================
let cursosCache = [];
let instituicoesCache = [];
let calendarioCache = [];
let empresasCache = [];
let ucsCache = [];
let instrutoresCache = [];
let turmasCache = [];

// ======================= Estado do formulário =======================
let currentStep = 1;
let isEditMode = false;
let editingTurmaId = null;

// ======================= Utilitários =======================
function showToast(message, type = 'info') {
    // Implementação simples de toast
    alert(message);
}

function setLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchJson(url, fallback = []) {
    try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : (data?.items ?? data ?? fallback);
    } catch (error) {
        console.error('Erro ao buscar dados:', url, error);
        return fallback;
    }
}

// ======================= Inicialização =======================
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

function initializeEventListeners() {
    // Botão adicionar turma
    const addTurmaBtn = document.getElementById('addTurmaBtn');
    if (addTurmaBtn) {
        addTurmaBtn.addEventListener('click', openAddTurmaModal);
    }

    // Botões do modal
    const closeFormModalBtn = document.getElementById('closeFormModalBtn');
    if (closeFormModalBtn) {
        closeFormModalBtn.addEventListener('click', closeModal);
    }

    const cancelFormBtn = document.getElementById('cancelFormBtn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', closeModal);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', nextStep);
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', prevStep);
    }

    // Event listeners para filtros
    const searchInput = document.getElementById('q');
    if (searchInput) {
        searchInput.addEventListener('input', filterTurmas);
    }

    const filterCurso = document.getElementById('fCurso');
    if (filterCurso) {
        filterCurso.addEventListener('change', filterTurmas);
    }

    const filterTurno = document.getElementById('fTurno');
    if (filterTurno) {
        filterTurno.addEventListener('change', filterTurmas);
    }

    // Botão limpar filtros
    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', clearFilters);
    }

    // Event listeners para campos do formulário
    const cursoSelect = document.getElementById('curso');
    if (cursoSelect) {
        cursoSelect.addEventListener('change', onCursoChange);
    }

    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('turmaFormModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// ======================= Carregamento de dados =======================
async function loadInitialData() {
    setLoading(true);
    
    try {
        const [cursos, instituicoes, calendarios, empresas, ucs, instrutores, turmas] = await Promise.all([
            fetchJson(API_CURSO, []),
            fetchJson(API_INSTITUICAO, []),
            fetchJson(API_CALENDARIO, []),
            fetchJson(API_EMPRESA, []),
            fetchJson(API_UC, []),
            fetchJson(API_INSTRUTOR, []),
            fetchJson(API_TURMA, [])
        ]);

        cursosCache = cursos;
        instituicoesCache = instituicoes;
        calendarioCache = calendarios;
        empresasCache = empresas;
        ucsCache = ucs;
        instrutoresCache = instrutores;
        turmasCache = turmas;

        populateSelects();
        renderTurmasTable(turmasCache);
        
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showToast('Erro ao carregar dados. Tente recarregar a página.', 'error');
    } finally {
        setLoading(false);
    }
}

function populateSelects() {
    // Popular select de cursos no formulário
    const cursoSelect = document.getElementById('curso');
    if (cursoSelect) {
        cursoSelect.innerHTML = '<option value="">Selecione um curso</option>';
        cursosCache.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso._id || curso.id;
            option.textContent = curso.nome || 'Curso sem nome';
            cursoSelect.appendChild(option);
        });
    }

    // Popular select de instituições
    const instituicaoSelect = document.getElementById('instituicao');
    if (instituicaoSelect) {
        instituicaoSelect.innerHTML = '<option value="">Selecione uma instituição</option>';
        instituicoesCache.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst._id || inst.id;
            option.textContent = inst.razao_social || inst.nome || 'Instituição sem nome';
            instituicaoSelect.appendChild(option);
        });
    }

    // Popular select de calendários
    const calendarioSelect = document.getElementById('calendario');
    if (calendarioSelect) {
        calendarioSelect.innerHTML = '<option value="">Selecione um calendário</option>';
        calendarioCache.forEach(cal => {
            const option = document.createElement('option');
            option.value = cal._id || cal.id;
            option.textContent = cal.nome || cal.descricao || 'Calendário sem nome';
            calendarioSelect.appendChild(option);
        });
    }

    // Popular select de empresas
    const empresaSelect = document.getElementById('empresa');
    if (empresaSelect) {
        empresaSelect.innerHTML = '<option value="">Selecione uma empresa</option>';
        empresasCache.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp._id || emp.id;
            option.textContent = emp.razao_social || emp.nome_fantasia || 'Empresa sem nome';
            empresaSelect.appendChild(option);
        });
    }

    // Popular filtro de cursos
    const filterCurso = document.getElementById('fCurso');
    if (filterCurso) {
        filterCurso.innerHTML = '<option value="">Todos</option>';
        cursosCache.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso._id || curso.id;
            option.textContent = curso.nome || 'Curso sem nome';
            filterCurso.appendChild(option);
        });
    }
}

// ======================= Modal de turma =======================
function openAddTurmaModal() {
    isEditMode = false;
    editingTurmaId = null;
    currentStep = 1;
    
    // Limpar formulário
    const form = document.getElementById('multiStepForm');
    if (form) {
        form.reset();
    }
    
    // Resetar steps
    updateStepDisplay();
    
    // Mostrar modal
    const modal = document.getElementById('turmaFormModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Cadastrar Turma';
    }
}

function closeModal() {
    const modal = document.getElementById('turmaFormModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset form state
    currentStep = 1;
    isEditMode = false;
    editingTurmaId = null;
}

// ======================= Navegação entre steps =======================
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 3) {
            currentStep++;
            updateStepDisplay();
            
            if (currentStep === 3) {
                populateConfirmationStep();
            }
        } else {
            // Último step - salvar turma
            saveTurma();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function updateStepDisplay() {
    // Atualizar indicadores de step
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((item, index) => {
        const stepNumber = index + 1;
        item.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            item.classList.add('completed');
        } else if (stepNumber === currentStep) {
            item.classList.add('active');
        }
    });
    
    // Mostrar/ocultar steps do formulário
    const formSteps = document.querySelectorAll('.form-step');
    formSteps.forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Atualizar botões
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    }
    
    if (nextBtn) {
        if (currentStep === 3) {
            nextBtn.textContent = 'Cadastrar Turma';
        } else {
            nextBtn.textContent = 'Próximo';
        }
    }
}

// ======================= Validação =======================
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    if (!currentStepElement) return false;
    
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    if (!isValid) {
        showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
    }
    
    return isValid;
}

// ======================= Eventos de formulário =======================
function onCursoChange() {
    const cursoId = document.getElementById('curso').value;
    const curso = cursosCache.find(c => (c._id || c.id) === cursoId);
    
    if (curso) {
        // Preencher campos automáticos baseados no curso selecionado
        // Aqui você pode adicionar lógica para preencher outros campos
        console.log('Curso selecionado:', curso);
    }
}

// ======================= Step de confirmação =======================
function populateConfirmationStep() {
    // Preencher campos de confirmação com os dados do formulário
    const fields = {
        'codigoTurmaConf': 'codigoTurma',
        'dataInicioConf': 'dataInicio',
        'dataFimConf': 'dataFim',
        'turnoConf': 'turno',
        'numAlunosConf': 'numAlunos'
    };
    
    Object.entries(fields).forEach(([confField, sourceField]) => {
        const sourceElement = document.getElementById(sourceField);
        const confElement = document.getElementById(confField);
        
        if (sourceElement && confElement) {
            confElement.value = sourceElement.value;
        }
    });
    
    // Preencher selects com texto
    const selectFields = {
        'cursoConf': 'curso',
        'instituicaoConf': 'instituicao',
        'calendarioConf': 'calendario',
        'empresaConf': 'empresa'
    };
    
    Object.entries(selectFields).forEach(([confField, sourceField]) => {
        const sourceElement = document.getElementById(sourceField);
        const confElement = document.getElementById(confField);
        
        if (sourceElement && confElement) {
            const selectedOption = sourceElement.options[sourceElement.selectedIndex];
            confElement.value = selectedOption ? selectedOption.textContent : '';
        }
    });
    
    // Buscar dados do curso para preencher campos adicionais
    const cursoId = document.getElementById('curso').value;
    const curso = cursosCache.find(c => (c._id || c.id) === cursoId);
    
    if (curso) {
        const categoriaConf = document.getElementById('categoriaConf');
        const modalidadeConf = document.getElementById('modalidadeConf');
        const tipoConf = document.getElementById('tipoConf');
        const cargaHorariaConf = document.getElementById('cargaHorariaConf');
        const eixoTecConf = document.getElementById('eixoTecConf');
        
        if (categoriaConf) categoriaConf.value = curso.categoria || '';
        if (modalidadeConf) modalidadeConf.value = curso.nivel_curso || '';
        if (tipoConf) tipoConf.value = curso.tipo || '';
        if (cargaHorariaConf) cargaHorariaConf.value = curso.carga_horaria || '';
        if (eixoTecConf) eixoTecConf.value = curso.eixo_tecnologico || '';
    }
}

// ======================= Salvar turma =======================
async function saveTurma() {
    try {
        setLoading(true);
        
        const formData = {
            codigo: document.getElementById('codigoTurma').value,
            id_curso: document.getElementById('curso').value,
            data_inicio: document.getElementById('dataInicio').value,
            data_fim: document.getElementById('dataFim').value,
            turno: document.getElementById('turno').value,
            num_alunos: parseInt(document.getElementById('numAlunos').value), // Corrigido: numero_alunos -> num_alunos
            id_instituicao: document.getElementById('instituicao').value,
            id_calendario: document.getElementById('calendario').value,
            id_empresa: document.getElementById('empresa').value,
            status: true,
            unidades_curriculares: [{
                id_uc: "000000000000000000000000", // ID temporário
                id_instrutor: "000000000000000000000000", // ID temporário
                data_inicio: document.getElementById('dataInicio').value,
                data_fim: document.getElementById('dataFim').value
            }] // Adicionado: pelo menos uma UC para satisfazer a validação
        };
        
        const url = isEditMode ? `${API_TURMA}?id=${editingTurmaId}` : API_TURMA;
        const method = isEditMode ? 'PUT' : 'POST';
        
        const response = await fetchWithTimeout(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        showToast(isEditMode ? 'Turma atualizada com sucesso!' : 'Turma cadastrada com sucesso!', 'success');
        closeModal();
        
        // Recarregar dados
        await loadInitialData();
        
    } catch (error) {
        console.error('Erro ao salvar turma:', error);
        showToast('Erro ao salvar turma. Tente novamente.', 'error');
    } finally {
        setLoading(false);
    }
}

// ======================= Renderização da tabela =======================
function renderTurmasTable(turmas) {
    const tbody = document.getElementById('tblTurmas');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!turmas || turmas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">Nenhuma turma encontrada.</td></tr>';
        return;
    }
    
    turmas.forEach(turma => {
        const curso = cursosCache.find(c => (c._id || c.id) === turma.id_curso);
        const empresa = empresasCache.find(e => (e._id || e.id) === turma.id_empresa);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><i class="fas fa-users"></i></td>
            <td>${turma.codigo || ''}</td>
            <td>${turma.turno || ''}</td>
            <td>${formatDate(turma.data_inicio)}</td>
            <td>${formatDate(turma.data_fim)}</td>
            <td>${curso ? curso.nome : 'N/A'}</td>
            <td>${empresa ? (empresa.razao_social || empresa.nome_fantasia) : 'N/A'}</td>
            <td><span class="status ${turma.status ? 'ativo' : 'inativo'}">${turma.status ? 'Ativo' : 'Inativo'}</span></td>
            <td class="actions">
                <button class="btn btn-icon btn-view" onclick="viewTurma('${turma._id || turma.id}')" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-icon btn-edit" onclick="editTurma('${turma._id || turma.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-delete" onclick="deleteTurma('${turma._id || turma.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ======================= Utilitários de formatação =======================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return 'N/A';
    }
}

// ======================= Filtros =======================
function filterTurmas() {
    const searchTerm = document.getElementById('q').value.toLowerCase();
    const cursoFilter = document.getElementById('fCurso').value;
    const turnoFilter = document.getElementById('fTurno').value;
    
    let filteredTurmas = turmasCache.filter(turma => {
        const matchesSearch = !searchTerm || 
            (turma.codigo && turma.codigo.toLowerCase().includes(searchTerm)) ||
            (turma.turno && turma.turno.toLowerCase().includes(searchTerm));
            
        const matchesCurso = !cursoFilter || turma.id_curso === cursoFilter;
        const matchesTurno = !turnoFilter || turma.turno === turnoFilter;
        
        return matchesSearch && matchesCurso && matchesTurno;
    });
    
    renderTurmasTable(filteredTurmas);
}

function clearFilters() {
    document.getElementById('q').value = '';
    document.getElementById('fCurso').value = '';
    document.getElementById('fTurno').value = '';
    document.getElementById('fInicio').value = '';
    document.getElementById('fFim').value = '';
    
    renderTurmasTable(turmasCache);
}

// ======================= Ações da tabela =======================
function viewTurma(turmaId) {
    const turma = turmasCache.find(t => (t._id || t.id) === turmaId);
    if (!turma) {
        showToast('Turma não encontrada.', 'error');
        return;
    }
    
    // Implementar modal de visualização
    console.log('Visualizar turma:', turma);
    showToast('Funcionalidade de visualização será implementada em breve.', 'info');
}

function editTurma(turmaId) {
    const turma = turmasCache.find(t => (t._id || t.id) === turmaId);
    if (!turma) {
        showToast('Turma não encontrada.', 'error');
        return;
    }
    
    isEditMode = true;
    editingTurmaId = turmaId;
    currentStep = 1;
    
    // Preencher formulário com dados da turma
    document.getElementById('codigoTurma').value = turma.codigo || '';
    document.getElementById('curso').value = turma.id_curso || '';
    document.getElementById('dataInicio').value = turma.data_inicio || '';
    document.getElementById('dataFim').value = turma.data_fim || '';
    document.getElementById('turno').value = turma.turno || '';
    document.getElementById('numAlunos').value = turma.numero_alunos || '';
    document.getElementById('instituicao').value = turma.id_instituicao || '';
    document.getElementById('calendario').value = turma.id_calendario || '';
    document.getElementById('empresa').value = turma.id_empresa || '';
    
    updateStepDisplay();
    
    const modal = document.getElementById('turmaFormModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Editar Turma';
    }
}

async function deleteTurma(turmaId) {
    const turma = turmasCache.find(t => (t._id || t.id) === turmaId);
    if (!turma) {
        showToast('Turma não encontrada.', 'error');
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir a turma "${turma.codigo}"?`)) {
        return;
    }
    
    try {
        setLoading(true);
        
        const response = await fetchWithTimeout(`${API_TURMA}?id=${turmaId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        showToast('Turma excluída com sucesso!', 'success');
        
        // Recarregar dados
        await loadInitialData();
        
    } catch (error) {
        console.error('Erro ao excluir turma:', error);
        showToast('Erro ao excluir turma. Tente novamente.', 'error');
    } finally {
        setLoading(false);
    }
}

// ======================= Menu toggle =======================
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const dashboardContainer = document.querySelector('.dashboard-container');

if (menuToggle && sidebar && dashboardContainer) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        dashboardContainer.classList.toggle('sidebar-active');
    });

    dashboardContainer.addEventListener('click', (event) => {
        if (dashboardContainer.classList.contains('sidebar-active') && 
            !sidebar.contains(event.target) && 
            !menuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
            dashboardContainer.classList.remove('sidebar-active');
        }
    });
}