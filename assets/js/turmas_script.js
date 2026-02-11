(() => {
    'use strict';

    if (!window.App) throw new Error('Carregue geral_script.js antes de turmas_script.js.');
    const { $, $$ } = App.dom;
    const { safeFetch } = App.net;
    const { paginateData, bindControls, updateUI } = App.pagination;

    // 1. Mantenha fmtDateBR vindo de App.format
    const { fmtDateBR } = App.format;

    // 2. ADICIONE/MANTENHA esta linha importando de App.utils
    const { toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;


    const LS_KEY = 'turmas_gestao_state_v1';

    // Endpoints da API
    const API = Object.freeze({
        bootstrap: '../backend/processa_turma.php?action=bootstrap',
        turma: '../backend/processa_turma.php',
        // Usamos o processa_calendarios para buscar dias letivos se necessário, 
        // mas aqui focaremos nas datas limites vindas do bootstrap para validação rápida.
    });

    // Estado Global
    const DEFAULT_STATE = {
        turmas: [],
        // Dados auxiliares carregados do bootstrap
        aux: {
            cursos: [],
            calendarios: [],
            empresas: [],
            instrutores: []
        },
        // Controle de Edição
        turmaEditId: null,
        // Paginação e Filtros
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        filters: { q: '', status: ['Todos'], situacao: 'Todos' },
        // Controle do Wizard
        currentStep: 0
    };

    let savedState = {};
    try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

    const STATE = {
        ...DEFAULT_STATE,
        pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
        filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
    };

    // Referências do DOM
    const refs = {
        // Listagem
        filterArea: $('#filter_area'),
        cardsContainer: $('#turmasCardsContainer'),
        pagElements: {
            prev: $('#prevPage'),
            next: $('#nextPage'),
            info: $('#pageInfo'),
        },
        addBtn: $('#addTurmaBtn'),

        // Modal
        modal: $('#turmaModal'),
        form: $('#turmaForm'),
        modalTitle: $('#modalTitleTurma'),
        closeModalBtn: $('#closeModalBtn'),

        // Inputs Ocultos
        turmaId: $('#turmaId'),
        instituicaoId: $('#instituicaoId'),

        // Wizard Controls
        steps: $$('.form-step'),
        stepIndicators: $$('.step-item'),
        btnPrev: $('#btnPrev'),
        btnNext: $('#btnNext'),
        btnSubmit: $('#btnSubmit'),

        // Step 1 - Identificação
        codTurma: $('#codTurma'),
        cursoVinculado: $('#cursoVinculado'),
        calendarioAcademico: $('#calendarioAcademico'),
        // Readonly fields
        viewModalidade: $('#carregaModalidade'),
        viewAreaTec: $('#carregaAreaTec'),
        viewTipoCurso: $('#carregaTipoCurso'),
        viewCargaHora: $('#carregaCargaHora'),

        // Step 2 - Operação
        turnoTurma: $('#turnoTurma'),
        empresaVinculada: $('#empresaVinculada'),
        dataInicio: $('#dataInicio'),
        dataFim: $('#dataFim'),
        msgDataFim: $('#msgDataFim'),
        qtdAlunos: $('#qtdAlunos'),
        situacaoTurma: $('#situacaoTurma'),
        statusTurma: $('#statusTurma'),
        obsTurma: $('#obsTurma'),

        // Step 3 - Grade
        spanPeriodoTurma: $('#spanPeriodoTurma'),
        listaUcsContainer: $('#listaUcsContainer'),

        // Step 4 - Resumo
        resumoContainer: $('#resumoContainer'),
        alertTurma: $('#alertTurma')
    };

    // --- PERSISTÊNCIA DE ESTADO ---
    function saveState() {
        localStorage.setItem(LS_KEY, JSON.stringify({
            pagination: { pageSize: STATE.pagination.pageSize },
            filters: STATE.filters
        }));
    }

    // --- INICIALIZAÇÃO E CARREGAMENTO ---
    async function init() {
        App.loader.show();
        try {
            // 1. Carrega dados auxiliares (Cursos, Calendários, etc.)
            const auxData = await safeFetch(API.bootstrap);
            STATE.aux = auxData;

            // 2. Popula os Selects do Modal (uma única vez)
            popularSelectsIniciais();

            // 3. Configura Filtros na Interface
            setupFilters();

            // 4. Carrega Lista de Turmas
            await carregarTurmas();

            // 5. Configura Eventos
            setupEvents();

        } catch (err) {
            console.error(err);
            alert('Erro ao inicializar o módulo de Turmas: ' + err.message);
        } finally {
            App.loader.hide();
        }
    }

    function popularSelectsIniciais() {
        // Cursos
        STATE.aux.cursos.sort((a, b) => a.nome_curso.localeCompare(b.nome_curso));
        STATE.aux.calendarios.sort((a, b) => a.titulo.localeCompare(b.titulo));

        // Para empresas, verificamos se existe nome_fantasia, senão usa razao_social
        STATE.aux.empresas.sort((a, b) => {
            const nomeA = a.nome_fantasia || a.razao_social || '';
            const nomeB = b.nome_fantasia || b.razao_social || '';
            return nomeA.localeCompare(nomeB);
        });
        const htmlCursos = ['<option value="">Selecione...</option>']
            .concat(STATE.aux.cursos.map(c => `<option value="${c._id}">${c.nome_curso}</option>`))
            .join('');
        refs.cursoVinculado.innerHTML = htmlCursos;

        // Calendários
        const htmlCal = ['<option value="">Selecione...</option>']
            .concat(STATE.aux.calendarios.map(c => `<option value="${c._id}">${c.titulo}</option>`))
            .join('');
        refs.calendarioAcademico.innerHTML = htmlCal;

        // Empresas
        const htmlEmp = ['<option value="">Selecione...</option>']
            .concat(STATE.aux.empresas.map(e => `<option value="${e._id}">${e.nome_fantasia || e.razao_social}</option>`))
            .join('');
        refs.empresaVinculada.innerHTML = htmlEmp;

        // Recupera ID da instituição do localStorage (geralmente salvo no login)
        // Se não tiver no localStorage, o backend pega do token, mas enviamos aqui se necessário para lógica local
        const storedUser = JSON.parse(localStorage.getItem('senai_user') || '{}');
        if (storedUser.instituicao_id) {
            refs.instituicaoId.value = storedUser.instituicao_id;
        }
    }

    async function carregarTurmas() {
        const params = new URLSearchParams({
            page: STATE.pagination.page,
            page_size: STATE.pagination.pageSize,
            busca: STATE.filters.q
        });

        if (STATE.filters.status && STATE.filters.status[0] !== 'Todos') {
            STATE.filters.status.forEach(s => params.append('status', s));
        }

        // Filtro customizado de situação
        const elSit = document.getElementById('gen_situacao');
        if (elSit && elSit.value !== 'Todos') {
            params.append('situacao', elSit.value);
        }

        try {
            const resp = await safeFetch(`${API.turma}?${params.toString()}`);
            STATE.turmas = resp.items || [];
            STATE.pagination.total = resp.total || 0;
            STATE.pagination.totalPages = Math.ceil(resp.total / STATE.pagination.pageSize) || 1;

            renderCards(STATE.turmas);
            updateUI(refs.pagElements, STATE.pagination);
        } catch (err) {
            console.error(err);
            refs.cardsContainer.innerHTML = '<p class="text-red-600 p-4">Erro ao carregar turmas.</p>';
        }
    }

    // --- RENDERIZAÇÃO DA UI ---

    function renderCards(lista) {
        if (!lista.length) {
            refs.cardsContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 py-8">Nenhuma turma encontrada.</div>`;
            return;
        }

        refs.cardsContainer.innerHTML = lista.map(t => {
            const statusClass = t.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            // Formata datas para exibição
            const periodo = `${fmtDateBR(t.data_inicio)} até ${fmtDateBR(t.data_fim)}`;

            return `
        <div class="card-turma">
            <div class="card-turma-header">
                <span class="card-turma-code">${t.codigo}</span>
                <span class="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700 uppercase">${t.turno}</span>
            </div>
            <div class="card-turma-body">
                <div class="card-info-row">
                    <i class="fas fa-book"></i>
                    <strong>${t.nome_curso || 'Curso desconhecido'}</strong>
                </div>
                <div class="card-info-row text-sm">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${t.nome_calendario || '-'}</span>
                </div>
                <div class="card-info-row">
                    <i class="fas fa-info-circle"></i>
                    <span class="text-sm">
                        ${t.situacao} <span class="mx-1">•</span> 
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusClass}">${t.status}</span>
                    </span>
                </div>
                <div class="card-info-row text-xs text-gray-500 mt-1">
                    <i class="far fa-clock"></i>
                    <span>${periodo}</span>
                </div>
            </div>
            <div class="card-turma-footer">
                <button type="button" class="btn-card btn-card-view" data-id="${t._id}" title="Ver Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn-card btn-card-edit" data-id="${t._id}" title="Editar">
                    <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="btn-card btn-card-deactivate" data-id="${t._id}" title="Excluir/Desativar">
                    <i class="fas fa-trash-alt"></i>
                </button>
                 <button type="button" class="btn-card btn-card-calendar" data-id="${t._id}" title="Ver Cronograma">
                    <i class="fas fa-calendar-day"></i>
                </button>
            </div>
        </div>
      `;
        }).join('');
    }

    function setupFilters() {
        if (!App.filters || !App.filters.render) {
            console.error('App.filters.render não encontrado em geral_script.js');
            return;
        }

        // 2. Renderiza os filtros na div 'filter_area'
        App.filters.render(
            'filter_area',
            {
                search: true,
                status: true,
                situacao: true,  // <--- Agora ativado nativamente no geral_script
                pageSize: true
            },
            null, // Nenhum HTML extra manual

            // Callback: Ao Pesquisar
            () => {
                applyFiltersFromDOM();
                STATE.pagination.page = 1;
                carregarTurmas();
            },

            // Callback: Ao Limpar
            () => {
                STATE.filters = { ...DEFAULT_STATE.filters };
                // O geral_script já limpa os inputs visualmente
                STATE.pagination.page = 1;
                carregarTurmas();
            }
        );

        // 3. Restaura valores do State na UI (persistência após refresh)
        const elSearch = document.getElementById('gen_search');
        if (elSearch && STATE.filters.q) elSearch.value = STATE.filters.q;

        const elStatus = document.getElementById('gen_status');
        if (elStatus && STATE.filters.status && STATE.filters.status[0]) elStatus.value = STATE.filters.status[0];

        const elSituacao = document.getElementById('gen_situacao');
        if (elSituacao && STATE.filters.situacao) elSituacao.value = STATE.filters.situacao;
    }

    function applyFiltersFromDOM() {
        // Busca
        const elSearch = document.getElementById('gen_search');
        STATE.filters.q = (elSearch?.value || '').trim();

        // Status
        const elStatus = document.getElementById('gen_status');
        STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

        // Situação (Agora padronizado como gen_situacao)
        const elSituacao = document.getElementById('gen_situacao');
        STATE.filters.situacao = elSituacao ? elSituacao.value : 'Todos';

        // PageSize
        const elSize = document.getElementById('gen_pagesize');
        if (elSize) STATE.pagination.pageSize = parseInt(elSize.value, 10);

        saveState();
    }

    // --- LÓGICA DO MODAL WIZARD ---

    function openModal(turma = null) {
        STATE.turmaEditId = turma ? turma._id : null;
        resetWizard();

        if (turma) {
            // MODO EDIÇÃO
            refs.modalTitle.textContent = `Editar Turma: ${turma.codigo}`;
            preencherFormulario(turma);
        } else {
            // MODO CRIAÇÃO
            refs.modalTitle.textContent = 'Adicionar Nova Turma';
            refs.statusTurma.value = 'Ativo';
        }

        App.ui.showModal(refs.modal);
    }

    function resetWizard() {
        STATE.currentStep = 0;
        refs.form.reset();
        refs.turmaId.value = '';
        refs.alertTurma.style.display = 'none';
        refs.alertTurma.textContent = '';

        // Reset visual
        updateWizardUI();

        // Limpa grade e resumo
        refs.listaUcsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Selecione um curso no Passo 1 para carregar a grade.</p>';
        refs.resumoContainer.innerHTML = '';

        // Desabilita campos dependentes
        refs.dataFim.disabled = true;
        refs.msgDataFim.style.display = 'block';
    }

    function updateWizardUI() {
        // Atualiza Steps (círculos)
        refs.stepIndicators.forEach((el, idx) => {
            el.classList.toggle('active', idx <= STATE.currentStep);
        });

        // Mostra form step correto
        refs.steps.forEach((el, idx) => {
            el.classList.toggle('active', idx === STATE.currentStep);
        });

        // Botões
        refs.btnPrev.disabled = STATE.currentStep === 0;

        const isLast = STATE.currentStep === refs.steps.length - 1;
        refs.btnNext.style.display = isLast ? 'none' : 'inline-flex';
        refs.btnSubmit.style.display = isLast ? 'inline-flex' : 'none';

        // Se estiver no step de resumo, gera o resumo
        if (isLast) renderResumo();
    }

    function nextStep() {
        if (validateCurrentStep()) {
            STATE.currentStep++;
            updateWizardUI();
        }
    }

    function prevStep() {
        if (STATE.currentStep > 0) {
            STATE.currentStep--;
            updateWizardUI();
        }
    }

    function validateCurrentStep() {
        const currentStepEl = refs.steps[STATE.currentStep];
        const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
        let valid = true;

        inputs.forEach(inp => {
            if (!inp.checkValidity()) {
                inp.classList.add('border-red-500');
                inp.reportValidity();
                valid = false;
            } else {
                inp.classList.remove('border-red-500');
            }
        });

        // Validações específicas do Step 2
        if (STATE.currentStep === 1) { // Step 2 (índice 1)
            if (refs.dataFim.value && refs.dataInicio.value) {
                if (refs.dataFim.value < refs.dataInicio.value) {
                    alert('A Data Fim não pode ser menor que a Data Início.');
                    return false;
                }
            }

            // Validação contra o Calendário Acadêmico
            const calId = refs.calendarioAcademico.value;
            const cal = STATE.aux.calendarios.find(c => c._id === calId);
            if (cal) {
                const tInicio = refs.dataInicio.value;
                const tFim = refs.dataFim.value;

                // Verifica limites do calendário (assumindo formato YYYY-MM-DD)
                // cal.inicio_calendario vem ISO completo, pegamos só a data
                const calInicio = cal.inicio_calendario.split('T')[0];
                const calFim = cal.final_calendario.split('T')[0];

                if (tInicio < calInicio || (tFim && tFim > calFim)) {
                    alert(`As datas da turma devem estar dentro do período do Calendário Acadêmico:\nDe ${fmtDateBR(calInicio)} a ${fmtDateBR(calFim)}`);
                    return false;
                }
            }
        }

        // Validações específicas do Step 3 (Grade)
        if (STATE.currentStep === 2) {
            // Verifica se todas as UCs tem datas preenchidas
            const rows = refs.listaUcsContainer.querySelectorAll('.ucs-row');
            for (let row of rows) {
                const ini = row.querySelector('.inp-uc-ini').value;
                const fim = row.querySelector('.inp-uc-fim').value;
                const inst = row.querySelector('.inp-uc-instrutor').value;
                const nomeUc = row.querySelector('.ucs-title').textContent;

                if (!ini || !fim || !inst) {
                    alert(`Preencha todos os campos obrigatórios (Datas e Instrutor) da UC: ${nomeUc}`);
                    return false;
                }

                if (ini > fim) {
                    alert(`Data final menor que inicial na UC: ${nomeUc}`);
                    return false;
                }

                // Valida se UC está dentro da turma
                if (ini < refs.dataInicio.value || fim > refs.dataFim.value) {
                    alert(`As datas da UC "${nomeUc}" devem estar dentro do período da turma (${fmtDateBR(refs.dataInicio.value)} - ${fmtDateBR(refs.dataFim.value)}).`);
                    return false;
                }
            }
        }

        return valid;
    }

    // --- LÓGICA DE NEGÓCIO: STEP 1 (CURSO/CALENDÁRIO) ---

    // Listener para mudança de Curso
    refs.cursoVinculado.addEventListener('change', (e) => {
        const cursoId = e.target.value;
        const curso = STATE.aux.cursos.find(c => c._id === cursoId);

        if (curso) {
            refs.viewModalidade.value = curso.modalidade_curso || '';
            refs.viewAreaTec.value = (Array.isArray(curso.area_tecnologica) ? curso.area_tecnologica.join(', ') : curso.area_tecnologica) || '';
            refs.viewTipoCurso.value = curso.tipo_curso || '';
            refs.viewCargaHora.value = curso.carga_total_curso || '';

            // Gera a grade de UCs automaticamente
            renderGradeUcs(curso);
        } else {
            // Limpa
            [refs.viewModalidade, refs.viewAreaTec, refs.viewTipoCurso, refs.viewCargaHora].forEach(el => el.value = '');
            refs.listaUcsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Selecione um curso para carregar.</p>';
        }
    });

    // Listener para Calendário (Aplica min/max nos inputs de data)
    refs.calendarioAcademico.addEventListener('change', (e) => {
        const calId = e.target.value;
        const cal = STATE.aux.calendarios.find(c => c._id === calId);

        if (cal) {
            const min = cal.inicio_calendario.split('T')[0];
            const max = cal.final_calendario.split('T')[0];

            // Aplica na turma
            refs.dataInicio.min = min;
            refs.dataInicio.max = max;
            refs.dataFim.min = min;
            refs.dataFim.max = max;

            // Se datas já preenchidas estiverem fora, avisa ou limpa? Por enquanto deixamos o validador do Step pegar.
        }
    });

    // --- LÓGICA DE NEGÓCIO: STEP 2 (DATAS) ---

    refs.dataInicio.addEventListener('change', (e) => {
        if (e.target.value) {
            refs.dataFim.disabled = false;
            refs.dataFim.min = e.target.value; // Data fim >= Data inicio
            refs.msgDataFim.style.display = 'none';
        } else {
            refs.dataFim.disabled = true;
            refs.msgDataFim.style.display = 'block';
        }
    });

    // --- LÓGICA DE NEGÓCIO: STEP 3 (GRADE UCS) ---

    function renderGradeUcs(curso, ucsExistentes = []) {
        refs.listaUcsContainer.innerHTML = '';

        // O objeto curso.unidade_curricular é um Dict { "id_uc": { ...dados... }, ... }
        if (!curso.unidade_curricular || Object.keys(curso.unidade_curricular).length === 0) {
            refs.listaUcsContainer.innerHTML = '<div class="alert alert-warning">Este curso não possui UCs cadastradas na parametrização.</div>';
            return;
        }

        // Cria as opções de instrutores para usar nos selects
        const optionsInstrutores = ['<option value="">Selecione...</option>']
            .concat(STATE.aux.instrutores.map(i => `<option value="${i._id}">${i.nome_completo}</option>`))
            .join('');

        // Itera sobre as UCs do curso
        Object.entries(curso.unidade_curricular).forEach(([ucId, dadosUc], index) => {
            // Tenta achar dados preexistentes (modo edição)
            const saved = ucsExistentes.find(u => u.uc_id === ucId);

            const div = document.createElement('div');
            div.className = 'ucs-row';
            div.dataset.ucId = ucId; // Guarda ID original da UC

            // Calcula carga horária total da UC
            const ch = (parseFloat(dadosUc.carga_presencial) || 0) + (parseFloat(dadosUc.carga_ead) || 0);

            // HTML da Linha da UC
            div.innerHTML = `
            <div class="ucs-title text-blue-600 font-bold mb-2 text-lg">${dadosUc.nome_uc || 'UC Sem Nome'}</div>
            <div class="text-xs text-gray-500 mb-3">
                CH Estimada: <span class="font-bold text-gray-700">${ch}h</span> 
                (Presencial: ${dadosUc.carga_presencial || 0}h / EAD: ${dadosUc.carga_ead || 0}h)
            </div>

            <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 md:col-span-3">
                    <label class="block text-xs font-medium text-gray-700">Início UC *</label>
                    <input type="date" class="form-control form-control-sm w-full inp-uc-ini" required value="${saved ? saved.data_inicio.split('T')[0] : ''}">
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label class="block text-xs font-medium text-gray-700">Fim UC *</label>
                    <input type="date" class="form-control form-control-sm w-full inp-uc-fim" required value="${saved ? saved.data_fim.split('T')[0] : ''}">
                </div>
                <div class="col-span-12 md:col-span-6">
                    <label class="block text-xs font-medium text-gray-700">Instrutor Titular *</label>
                    <select class="form-control form-control-sm w-full inp-uc-instrutor" required>
                        ${optionsInstrutores}
                    </select>
                </div>
            </div>

            <div class="mt-3">
                <label class="inline-flex items-center text-sm text-blue-600" style="cursor: pointer;">
                    <input type="checkbox" class="form-checkbox h-4 w-4 check-subs" ${saved && saved.possui_substituto ? 'checked' : ''} style="cursor: pointer;">
                    <span class="ml-2">Possui Substituto Temporário?</span>
                </label>
            </div>

            <div class="substituto-box mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded" style="display: none;">
                 <div class="grid grid-cols-12 gap-3">
                    <div class="col-span-12 md:col-span-6">
                        <label class="block text-xs font-medium text-gray-700">Instrutor Substituto</label>
                        <select class="form-control form-control-sm w-full inp-sub-inst">
                             ${optionsInstrutores}
                        </select>
                    </div>
                    <div class="col-span-6 md:col-span-3">
                        <label class="block text-xs font-medium text-gray-700">Início Subst.</label>
                        <input type="date" class="form-control form-control-sm w-full inp-sub-ini" value="${saved && saved.data_inicio_sub ? saved.data_inicio_sub.split('T')[0] : ''}">
                    </div>
                    <div class="col-span-6 md:col-span-3">
                        <label class="block text-xs font-medium text-gray-700">Fim Subst.</label>
                        <input type="date" class="form-control form-control-sm w-full inp-sub-fim" value="${saved && saved.data_fim_sub ? saved.data_fim_sub.split('T')[0] : ''}">
                    </div>
                 </div>
            </div>
        `;

            // Seleciona instrutor salvo
            if (saved) {
                div.querySelector('.inp-uc-instrutor').value = saved.instrutor_id || '';
                if (saved.possui_substituto) {
                    div.querySelector('.inp-sub-inst').value = saved.substituto_id || '';
                }
            }

            // LÓGICA DO CHECKBOX
            const chk = div.querySelector('.check-subs');
            const box = div.querySelector('.substituto-box');

            const toggleSubs = () => {
                if (chk.checked) {
                    box.style.display = 'block';
                } else {
                    box.style.display = 'none';
                    // Limpa campos ao esconder
                    box.querySelectorAll('input, select').forEach(el => el.value = '');
                }
            };

            chk.addEventListener('change', toggleSubs);

            // Executa na inicialização
            toggleSubs();

            refs.listaUcsContainer.appendChild(div);
        });
    }
    // --- STEP 4: RESUMO ---
    function renderResumo() {
        const getText = (el) => el.options[el.selectedIndex]?.text || '-';
        const getVal = (el) => el.value || '-';

        // Coleta dados das UCs
        let ucsHtml = '<ul class="divide-y divide-gray-200">';
        const rows = refs.listaUcsContainer.querySelectorAll('.ucs-row');
        rows.forEach(row => {
            const titulo = row.querySelector('.ucs-title').textContent;
            const ini = fmtDateBR(row.querySelector('.inp-uc-ini').value);
            const fim = fmtDateBR(row.querySelector('.inp-uc-fim').value);
            const inst = row.querySelector('.inp-uc-instrutor').selectedOptions[0]?.text || 'N/D';

            ucsHtml += `
            <li class="py-2 flex justify-between items-center">
                <div class="text-sm font-medium text-gray-800 w-1/3">${titulo}</div>
                <div class="text-sm text-gray-600 w-1/3 text-center">${ini} a ${fim}</div>
                <div class="text-sm text-gray-600 w-1/3 text-right truncate">${inst}</div>
            </li>
        `;
        });
        ucsHtml += '</ul>';

        refs.resumoContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span class="font-bold block text-gray-500">Código:</span> ${getVal(refs.codTurma)}</div>
            <div><span class="font-bold block text-gray-500">Curso:</span> ${getText(refs.cursoVinculado)}</div>
            <div><span class="font-bold block text-gray-500">Calendário:</span> ${getText(refs.calendarioAcademico)}</div>
            <div><span class="font-bold block text-gray-500">Empresa:</span> ${getText(refs.empresaVinculada)}</div>
            <div><span class="font-bold block text-gray-500">Período:</span> ${fmtDateBR(getVal(refs.dataInicio))} a ${fmtDateBR(getVal(refs.dataFim))}</div>
            <div><span class="font-bold block text-gray-500">Turno:</span> ${getVal(refs.turnoTurma)}</div>
            <div><span class="font-bold block text-gray-500">Qtd Alunos:</span> ${getVal(refs.qtdAlunos)}</div>
            <div><span class="font-bold block text-gray-500">Situação:</span> ${getVal(refs.situacaoTurma)}</div>
        </div>
        <div class="border-t pt-2">
            <h6 class="font-bold text-gray-700 mb-2">Grade Curricular Planejada</h6>
            ${rows.length ? ucsHtml : '<p class="text-gray-500 italic">Nenhuma UC configurada.</p>'}
        </div>
    `;
    }

    // --- SUBMISSÃO E EDIÇÃO ---

    refs.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Coleta dados das UCs
        const ucsData = [];
        const rows = refs.listaUcsContainer.querySelectorAll('.ucs-row');

        rows.forEach(row => {
            const possuiSub = row.querySelector('.check-subs').checked;
            ucsData.push({
                uc_id: row.dataset.ucId,
                nome_uc: row.querySelector('.ucs-title').textContent, // Envia nome para persistência
                data_inicio: toIsoStartOfDayLocal(row.querySelector('.inp-uc-ini').value),
                data_fim: toIsoEndOfDayLocal(row.querySelector('.inp-uc-fim').value),
                instrutor_id: row.querySelector('.inp-uc-instrutor').value,
                possui_substituto: possuiSub,
                substituto_id: possuiSub ? (row.querySelector('.inp-sub-inst').value || null) : null,
                data_inicio_sub: possuiSub ? toIsoStartOfDayLocal(row.querySelector('.inp-sub-ini').value) : null,
                data_fim_sub: possuiSub ? toIsoEndOfDayLocal(row.querySelector('.inp-sub-fim').value) : null
            });
        });

        const payload = {
            codigo: refs.codTurma.value.trim(),
            curso_id: refs.cursoVinculado.value,
            calendario_id: refs.calendarioAcademico.value,
            empresa_id: refs.empresaVinculada.value,
            turno: refs.turnoTurma.value,
            qtd_alunos: parseInt(refs.qtdAlunos.value, 10),
            data_inicio: toIsoStartOfDayLocal(refs.dataInicio.value),
            data_fim: toIsoEndOfDayLocal(refs.dataFim.value),
            situacao: refs.situacaoTurma.value,
            status: refs.statusTurma.value,
            observacao: refs.obsTurma.value,
            ucs: ucsData
        };

        const isEdit = !!STATE.turmaEditId;
        const url = isEdit ? `${API.turma}?id=${STATE.turmaEditId}` : API.turma;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            App.loader.show();
            await safeFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            App.ui.hideModal(refs.modal);
            await carregarTurmas();
            alert('Turma salva com sucesso!');
        } catch (err) {
            console.error(err);
            refs.alertTurma.textContent = 'Erro ao salvar: ' + (err.message || 'Desconhecido');
            refs.alertTurma.style.display = 'block';
            // Volta para o topo do modal
            refs.modal.querySelector('.modal-content').scrollTop = 0;
        } finally {
            App.loader.hide();
        }
    });

    async function preencherFormulario(turma) {
        try {
            // Busca dados detalhados da turma (com UCs)
            const detalhe = await safeFetch(`${API.turma}?id=${turma._id}`);

            refs.turmaId.value = detalhe._id;
            refs.codTurma.value = detalhe.codigo;
            refs.cursoVinculado.value = detalhe.curso_id;
            refs.calendarioAcademico.value = detalhe.calendario_id;
            refs.empresaVinculada.value = detalhe.empresa_id;
            refs.turnoTurma.value = detalhe.turno;
            refs.qtdAlunos.value = detalhe.qtd_alunos;
            refs.situacaoTurma.value = detalhe.situacao;
            refs.statusTurma.value = detalhe.status;
            refs.statusTurma.disabled = false; // Habilita edição de status
            refs.obsTurma.value = detalhe.observacao || '';

            refs.dataInicio.value = detalhe.data_inicio.split('T')[0];
            refs.dataFim.value = detalhe.data_fim.split('T')[0];
            refs.dataFim.disabled = false;

            // Dispara evento change do curso para carregar readonlys e estrutura básica
            refs.cursoVinculado.dispatchEvent(new Event('change'));

            // Aguarda renderização e preenche UCs com dados salvos
            // Nota: O listener 'change' acima é síncrono no DOM, mas a renderização é imediata.
            // Porém, precisamos passar os dados salvos para o renderizador.
            const curso = STATE.aux.cursos.find(c => c._id === detalhe.curso_id);
            if (curso) {
                renderGradeUcs(curso, detalhe.ucs || []);
            }

        } catch (err) {
            console.error(err);
            alert('Erro ao carregar detalhes da turma.');
            App.ui.hideModal(refs.modal);
        }
    }

    function setupEvents() {
        // Bind botões wizard
        refs.btnNext.addEventListener('click', nextStep);
        refs.btnPrev.addEventListener('click', prevStep);
        refs.codTurma.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Bind paginação
        bindControls(refs.pagElements, (action) => {
            if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
            if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
            carregarTurmas();
        });

        // Event Delegation para botões nos cards
        refs.cardsContainer.addEventListener('click', async (e) => {
            const btnEdit = e.target.closest('.btn-card-edit');
            const btnDel = e.target.closest('.btn-card-deactivate');

            if (btnEdit) {
                const id = btnEdit.dataset.id;
                const turma = STATE.turmas.find(t => t._id === id);
                if (turma) openModal(turma);
            }

            if (btnDel) {
                if (!confirm('Deseja realmente excluir/desativar esta turma?')) return;
                const id = btnDel.dataset.id;
                try {
                    App.loader.show();
                    await safeFetch(`${API.turma}?id=${id}`, { method: 'DELETE' });
                    await carregarTurmas();
                } catch (err) {
                    alert('Erro ao excluir: ' + err.message);
                } finally {
                    App.loader.hide();
                }
            }
        });

        // Abrir Modal
        refs.addBtn.addEventListener('click', () => openModal());
        refs.closeModalBtn.addEventListener('click', () => App.ui.hideModal(refs.modal));
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);

})();