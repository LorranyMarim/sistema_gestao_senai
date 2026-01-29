(() => {
    'use strict';

    const API_URL = '../backend/processa_curso.php';
    const API_BOOTSTRAP = '../backend/processa_curso.php?action=bootstrap';
    
    // Estado da aplicação
    let currentState = {
        page: 1,
        pageSize: 10,
        filters: {},
        total: 0
    };

    // Cache de UCs para descrição e referência (ID -> Nome)
    let ucsGlobalMap = {};
    
    // Objeto principal que armazena a parametrização das UCs
    // Estrutura: { "id_uc": { dias_letivos: 10, aulas: 4, carga: 40.00 }, ... }
    let ucsParametrizadas = {};

    // Referências do DOM
    const tableBody = document.getElementById('cursoTableBody');
    const pagElements = {
        prev: document.getElementById('prevPage'),
        next: document.getElementById('nextPage'),
        info: document.getElementById('pageInfo'),
        sizeSel: document.getElementById('gen_pagesize')
    };

    // Modal Principal (Cadastro/Edição de Curso)
    const modal = document.getElementById('cursoModal');
    const form = document.getElementById('cursoForm');
    const modalTitle = document.getElementById('modalTitleCurso');
    const alertBox = document.getElementById('alertCurso');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Modal de Visualização
    const viewModal = document.getElementById('visualizarcursoModal');
    const closeViewBtn = document.getElementById('closeVisualizarBtn');
    const closeViewBtnFooter = document.getElementById('fecharVisualizarBtn');

    // --- INICIALIZAÇÃO ---
    function init() {
        // Injeta o HTML do Modal de Parametrização se não existir
        ensureParamModalExists();
        
        setupFilters();
        setupModals();
        loadBootstrapData(); // Carrega UCs para o cache inicial

        // Bind Paginação
        App.pagination.bindControls(pagElements, (action) => {
            if (action === 'prev' && currentState.page > 1) {
                currentState.page--;
                fetchData();
            }
            if (action === 'next') {
                const totalPages = Math.ceil(currentState.total / currentState.pageSize) || 1;
                if (currentState.page < totalPages) {
                    currentState.page++;
                    fetchData();
                }
            }
            if (action === 'size' && arguments[1]) {
                currentState.pageSize = arguments[1];
                currentState.page = 1;
                fetchData();
            }
        });

        fetchData();
    }

    // --- CARREGAMENTO DE DADOS ---
    async function loadBootstrapData() {
        try {
            const res = await App.net.fetchJSON(API_BOOTSTRAP);
            if (res.ucs) {
                res.ucs.forEach(uc => {
                    ucsGlobalMap[uc._id] = uc.descricao;
                });
                // Configura o multiselect do modal com as UCs carregadas
                setupMultiselectUcs(res.ucs);
            }
        } catch (err) {
            console.error("Erro ao carregar dados iniciais:", err);
        }
    }

    function setupMultiselectUcs(ucsList) {
        const ms = document.getElementById('ms-ucs-modal');
        if (ms && ms._msInstance) {
            // Função de busca local para o multiselect
            ms._msInstance.setupAsync(async (p, s, term) => {
                const regex = new RegExp(term, 'i');
                return ucsList
                    .filter(uc => !term || regex.test(uc.descricao))
                    .map(uc => ({ value: uc._id, label: uc.descricao }));
            });
        }
    }

    async function fetchData() {
        App.loader.show();
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando...</td></tr>';

        try {
            const query = new URLSearchParams();
            query.set('page', currentState.page);
            query.set('page_size', currentState.pageSize);

            // Aplica filtros ao request
            Object.keys(currentState.filters).forEach(key => {
                const val = currentState.filters[key];
                if (val !== null && val !== undefined && val !== '') {
                    if (Array.isArray(val)) {
                        val.forEach(v => query.append(key, v));
                    } else {
                        query.set(key, val);
                    }
                }
            });

            const res = await App.net.fetchJSON(`${API_URL}?${query.toString()}`);

            renderTable(res.items || []);

            currentState.total = res.total || 0;
            const totalPages = Math.ceil(currentState.total / currentState.pageSize) || 1;
            
            App.pagination.updateUI(pagElements, {
                page: currentState.page,
                pageSize: currentState.pageSize,
                total: currentState.total,
                totalPages: totalPages
            });

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        } finally {
            App.loader.hide();
        }
    }

    // --- RENDERIZAÇÃO ---
    function renderTable(items) {
        tableBody.innerHTML = '';
        if (!items.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum curso encontrado.</td></tr>';
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            const statusClass = item.status === 'Ativo' ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
            
            // Renderiza badges para áreas tecnológicas
            const areas = Array.isArray(item.area_tecnologica) ? item.area_tecnologica : [];
            const areaHtml = areas.slice(0, 2).map(a => 
                `<span class="badge bg-light text-dark border me-1" style="font-size:0.8em;">${a}</span>`
            ).join('') + (areas.length > 2 ? ` <span style="font-size:0.8em" title="${areas.join(', ')}">...+${areas.length-2}</span>` : '');

            tr.innerHTML = `
                <td>${item.nome_curso || '-'}</td>
                <td>${item.modalidade_curso || '-'}</td>
                <td>${areaHtml || '-'}</td>
                <td>${item.carga_total_curso ? parseFloat(item.carga_total_curso).toFixed(2) + 'h' : '-'}</td>
                <td class="${statusClass}">${item.status}</td>
                <td>${App.format.fmtDateBR(item.data_criacao)}</td>
                <td class="actions">
                    <button class="btn btn-icon btn-view" title="Visualizar" data-id="${item._id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-icon btn-edit" title="Editar" data-id="${item._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-delete" title="Excluir" data-id="${item._id}"><i class="fas fa-trash"></i></button>
                </td>
            `;

            tr.querySelector('.btn-view').addEventListener('click', () => openViewModal(item));
            tr.querySelector('.btn-edit').addEventListener('click', () => openModal(item));
            tr.querySelector('.btn-delete').addEventListener('click', () => deleteCurso(item));

            tableBody.appendChild(tr);
        });
    }

// --- FILTROS ---
    function setupFilters() {
        // A ordem de renderização é controlada pelo geral_script.js:
        // 1. search, 2. modalidade, 3. tipoCurso, 4. area (Linha 1)
        // 5. status, 6. pageSize, 7. Clear (Linha 2)
        App.filters.render('filter_area', {
            search: true,       // Linha 1
            modalidade: true,   // Linha 1
            tipoCurso: true,    // Linha 1
            area: true,         // Linha 1 (Multiselect)
            status: true,       // Linha 2
            pageSize: true      // Linha 2
        }, null, onFilterChange, onFilterClear);
    }

    function onFilterChange() {
        const getVal = (id) => document.getElementById(id)?.value;
        
        // Helper para pegar valor de multiselects (que armazenam JSON no input hidden)
        const getJsonVal = (id) => {
            const val = document.getElementById(id)?.value;
            try { return val ? JSON.parse(val) : []; } catch { return []; }
        };

        currentState.filters = {
            busca: getVal('gen_search'),
            status: getVal('gen_status') !== 'Todos' ? [getVal('gen_status')] : null,
            modalidade: getVal('gen_modalidade'),
            tipo: getVal('gen_tipo_curso'),
            area: getJsonVal('gen_area-hidden') // Captura do input hidden gerado pelo multiselect
        };

        // Limpeza de valores "Todos" e arrays vazios para não sujar a query string
        ['modalidade', 'tipo'].forEach(k => {
            if (currentState.filters[k] === 'Todos') delete currentState.filters[k];
        });

        if (Array.isArray(currentState.filters.area) && currentState.filters.area.length === 0) {
            delete currentState.filters.area;
        }

        currentState.pageSize = parseInt(getVal('gen_pagesize') || 10);
        currentState.page = 1;
        fetchData();
    }

    function onFilterClear() {
        currentState.filters = {};
        currentState.page = 1;
        fetchData();
    }

    function onFilterClear() {
        currentState.filters = {};
        currentState.page = 1;
        fetchData();
    }

    // --- MODAL DE CADASTRO / EDIÇÃO ---
    function setupModals() {
        document.getElementById('addCursoBtn').addEventListener('click', () => openModal());

        [closeModalBtn, cancelBtn].forEach(el => el.addEventListener('click', () => {
            App.ui.hideModal(modal);
        }));

        [closeViewBtn, closeViewBtnFooter].forEach(el => el.addEventListener('click', () => {
            App.ui.hideModal(viewModal);
        }));

        // Intercepta o Submit para abrir a Parametrização
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
        // --- NOVO CÓDIGO: Transforma o multiselect de Área em seleção única ---
        const areaContainer = document.getElementById('ms-area-modal');
        if (areaContainer) {
            const checkboxes = areaContainer.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach(cb => {
                cb.addEventListener('change', function() {
                    // Se o usuário acabou de marcar esta caixa
                    if (this.checked) {
                        // Percorre todas as outras caixas
                        checkboxes.forEach(other => {
                            // Se encontrar outra marcada que não seja a atual
                            if (other !== this && other.checked) {
                                other.checked = false; // Desmarca
                                // Dispara o evento 'change' manualmente para que o visual 
                                // (texto "Selecione...") e o input hidden se atualizem
                                other.dispatchEvent(new Event('change')); 
                            }
                        });
                    }
                });
            });
        }
        // ---------------------------------------------------------------------
    }

    function openModal(item = null) {
        form.reset();
        alertBox.style.display = 'none';
        
        // Limpa estado de parametrização
        ucsParametrizadas = {};
        resetMultiselect('ms-area-modal');
        resetMultiselect('ms-ucs-modal');

        if (item) {
            modalTitle.textContent = 'Editar/Alterar Dados do Curso';
            document.getElementById('cursoId').value = item._id;
            document.getElementById('nomeCurso').value = item.nome_curso;
            document.getElementById('modalidadeCurso').value = item.modalidade_curso;
            document.getElementById('tipoCurso').value = item.tipo_curso;
            document.getElementById('cargaTotalCurso').value = item.carga_total_curso;
            document.getElementById('observacaoCurso').value = item.observacao_curso || '';
            document.getElementById('statusCurso').value = item.status;
            document.getElementById('statusCurso').disabled = false;

            // Popula Area Tecnológica
            setMultiselectValue('ms-area-modal', item.area_tecnologica);

            // Popula UCs e Parametrização
            if (item.unidade_curricular) {
                // Se vier do backend como objeto {id: {dados}}
                ucsParametrizadas = JSON.parse(JSON.stringify(item.unidade_curricular));
                setMultiselectValue('ms-ucs-modal', Object.keys(ucsParametrizadas));
            }

        } else {
            modalTitle.textContent = 'Adicionar Novo Curso';
            document.getElementById('cursoId').value = '';
            document.getElementById('statusCurso').value = 'Ativo';
            document.getElementById('statusCurso').disabled = true;
        }

        App.ui.showModal(modal);
    }

    // --- LÓGICA DE PARAMETRIZAÇÃO (Modal Sobreposto) ---
    
    function handleFormSubmit() {
        // 1. Coleta dados básicos
        const ucsInput = document.getElementById('competenciasCurso'); // Input hidden do multiselect
        let selectedUcsIds = [];
        try { selectedUcsIds = JSON.parse(ucsInput.value || '[]'); } catch { }

        // Validação básica
        const cargaTotal = document.getElementById('cargaTotalCurso').value;
        if (!/^\d+(\.\d{1,2})?$/.test(cargaTotal)) {
            showAlert('Carga horária inválida. Use apenas números e ponto (ex: 100.50).');
            return;
        }

        // Se não houver UCs selecionadas, salva direto
        if (selectedUcsIds.length === 0) {
            submitFinalData({}); 
            return;
        }

        // 2. Abre Modal de Parametrização
        openParametrizationModal(selectedUcsIds);
    }

    function openParametrizationModal(ucsIds) {
        const paramModal = document.getElementById('paramUcModal');
        const container = document.getElementById('accordionContainer');
        container.innerHTML = ''; // Limpa anterior

        // Sincroniza ucsParametrizadas com a seleção atual
        // Remove IDs que foram desmarcados
        Object.keys(ucsParametrizadas).forEach(id => {
            if (!ucsIds.includes(id)) delete ucsParametrizadas[id];
        });
        // Adiciona IDs novos com valores default
        ucsIds.forEach(id => {
            if (!ucsParametrizadas[id]) {
                ucsParametrizadas[id] = {
                    dias_letivos: 0,
                    aulas: 0,
                    carga_horaria: 0
                };
            }
        });

        // Gera o HTML do Acordeão
        ucsIds.forEach((id, index) => {
            const ucNome = ucsGlobalMap[id] || 'UC não identificada';
            const dados = ucsParametrizadas[id];
            const isOpen = index === 0 ? '' : 'collapsed'; // Primeiro item aberto
            const showClass = index === 0 ? 'show' : '';

            const itemHtml = `
                <div class="accordion-item border rounded mb-2">
                    <h2 class="accordion-header" id="heading-${id}">
                        <button class="accordion-button ${isOpen} w-full text-left p-3 bg-gray-100 hover:bg-gray-200 font-bold flex justify-between items-center" 
                                type="button" onclick="toggleAccordion('${id}')">
                            <span>${ucNome}</span>
                            <i class="fas fa-chevron-down text-sm transition-transform"></i>
                        </button>
                    </h2>
                    <div id="collapse-${id}" class="accordion-collapse collapse ${showClass} hidden" aria-labelledby="heading-${id}">
                        <div class="accordion-body p-3 bg-white border-t">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div class="form-group">
                                    <label class="block text-sm font-medium">Dias Letivos</label>
                                    <input type="number" class="form-control p-2 border rounded w-full inp-dias" 
                                           data-id="${id}" value="${dados.dias_letivos}" min="0">
                                </div>
                                <div class="form-group">
                                    <label class="block text-sm font-medium">Aulas Diárias</label>
                                    <input type="number" class="form-control p-2 border rounded w-full inp-aulas" 
                                           data-id="${id}" value="${dados.aulas}" min="0">
                                </div>
                                <div class="form-group">
                                    <label class="block text-sm font-medium">Carga Horária (h)</label>
                                    <input type="number" step="0.01" class="form-control p-2 border rounded w-full inp-carga" 
                                           data-id="${id}" value="${dados.carga_horaria}" min="0">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHtml);
        });

        // Mostra o modal sobreposto (z-index alto)
        paramModal.style.display = 'flex';
    }

    // Função global para toggle do acordeão (necessária pois o HTML é injetado)
    window.toggleAccordion = function(id) {
        const el = document.getElementById(`collapse-${id}`);
        // Fecha todos os outros
        document.querySelectorAll('.accordion-collapse').forEach(div => {
            if (div.id !== `collapse-${id}`) div.classList.add('hidden');
        });
        el.classList.toggle('hidden');
    };

    function saveParametrization() {
        // Coleta dados dos inputs do modal de parametrização
        const container = document.getElementById('accordionContainer');
        const inputsDias = container.querySelectorAll('.inp-dias');
        const inputsAulas = container.querySelectorAll('.inp-aulas');
        const inputsCarga = container.querySelectorAll('.inp-carga');

        let valid = true;

        inputsDias.forEach(inp => {
            const id = inp.dataset.id;
            ucsParametrizadas[id].dias_letivos = parseInt(inp.value) || 0;
        });
        inputsAulas.forEach(inp => {
            const id = inp.dataset.id;
            ucsParametrizadas[id].aulas = parseInt(inp.value) || 0;
        });
        inputsCarga.forEach(inp => {
            const id = inp.dataset.id;
            ucsParametrizadas[id].carga_horaria = parseFloat(inp.value) || 0;
        });

        // Aqui poderia ter validação se a soma das Cargas bate com a Total, etc.
        
        // Fecha modal param e envia tudo
        document.getElementById('paramUcModal').style.display = 'none';
        submitFinalData(ucsParametrizadas);
    }

    async function submitFinalData(ucsData) {
        const id = document.getElementById('cursoId').value;
        const payload = {
            nome_curso: document.getElementById('nomeCurso').value,
            modalidade_curso: document.getElementById('modalidadeCurso').value,
            tipo_curso: document.getElementById('tipoCurso').value,
            area_tecnologica: JSON.parse(document.getElementById('areaCurso').value || '[]'),
            carga_total_curso: parseFloat(document.getElementById('cargaTotalCurso').value),
            observacao_curso: document.getElementById('observacaoCurso').value,
            status: document.getElementById('statusCurso').value,
            unidade_curricular: ucsData // O Objeto parametrizado vai aqui
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}?id=${id}` : API_URL;

        try {
            App.loader.show();
            await App.net.fetchJSON(url, {
                method,
                body: JSON.stringify(payload)
            });
            App.ui.hideModal(modal);
            fetchData();
        } catch (err) {
            showAlert(err.message || 'Erro ao salvar curso.');
            // Se der erro, reabre o modal principal se estiver fechado? 
            // Neste caso o modal principal nem chegou a fechar visualmente se estivermos sobrepondo,
            // mas se fechamos antes, precisaríamos reabrir.
            // Pela lógica atual, o modal principal fica aberto "atrás" do modal de parametrização.
        } finally {
            App.loader.hide();
        }
    }

    // --- MANIPULAÇÃO DE DOM AUXILIAR ---
    
    function ensureParamModalExists() {
        if (document.getElementById('paramUcModal')) return;

        const html = `
        <div id="paramUcModal" class="modal" style="background: rgba(0,0,0,0.7); z-index: 1060;">
            <div class="modal-content" style="max-width: 800px; margin: 5% auto; max-height: 90vh; display:flex; flex-direction:column;">
                <div class="modal-header border-b pb-3 flex justify-between items-center">
                    <h3 class="text-xl font-bold">Parametrizar Unidades Curriculares</h3>
                    <span class="cursor-pointer text-2xl" id="closeParamModal">&times;</span>
                </div>
                <div class="modal-body overflow-y-auto p-4 flex-1" id="accordionContainer">
                    </div>
                <div class="modal-footer border-t pt-3 flex justify-end gap-2">
                     <button type="button" class="btn btn-secondary" id="cancelParamBtn">Voltar</button>
                     <button type="button" class="btn btn-primary" id="saveParamBtn"><i class="fas fa-check"></i> Confirmar Parametrização</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        // Events do modal injetado
        document.getElementById('closeParamModal').addEventListener('click', () => {
            if(confirm('Deseja cancelar a parametrização? Os dados não salvos serão perdidos.')) {
                document.getElementById('paramUcModal').style.display = 'none';
            }
        });
        document.getElementById('cancelParamBtn').addEventListener('click', () => {
            document.getElementById('paramUcModal').style.display = 'none';
        });
        document.getElementById('saveParamBtn').addEventListener('click', saveParametrization);
    }

    function showAlert(msg) {
        alertBox.style.display = 'block';
        alertBox.textContent = msg;
    }

    // --- VISUALIZAÇÃO ---
    function openViewModal(item) {
        document.getElementById('viewnomeCurso').value = item.nome_curso;
        document.getElementById('viewmodalidadeCurso').value = item.modalidade_curso;
        document.getElementById('viewtipoCurso').value = item.tipo_curso;
        document.getElementById('viewareaCurso').value = (item.area_tecnologica || []).join(', ');
        document.getElementById('cargaHorariaTotalCurso').value = item.carga_total_curso;
        document.getElementById('viewstatusCurso').value = item.status;
        document.getElementById('observacaoCurso').value = item.observacao_curso || '';

        // Lista UCs Detalhadas
        const container = document.getElementById('unidadeCurricularCursoContainer');
        const list = container.querySelector('ul'); // Reutilizando a estrutura do HTML se existir
        // Se o HTML fornecido tiver ID duplicado ou erro, ajustamos:
        const listReal = document.getElementById('viewUnidadeCurricularList') || list; 
        
        listReal.innerHTML = '';
        container.style.display = 'none';

        if (item.unidade_curricular && Object.keys(item.unidade_curricular).length > 0) {
            container.style.display = 'block';
            for (const [id, dados] of Object.entries(item.unidade_curricular)) {
                const nome = ucsGlobalMap[id] || 'UC ' + id;
                const li = document.createElement('li');
                li.innerHTML = `<strong>${nome}</strong>: ${dados.carga_horaria}h | ${dados.dias_letivos} dias | ${dados.aulas} aulas`;
                listReal.appendChild(li);
            }
        }

        App.ui.showModal(viewModal);
    }

    function deleteCurso(item) {
        if (confirm(`Deseja realmente excluir o curso "${item.nome_curso}"?`)) {
            App.net.fetchJSON(`${API_URL}?id=${item._id}`, { method: 'DELETE' })
                .then(() => fetchData())
                .catch(err => alert('Erro ao excluir: ' + err.message));
        }
    }

    // Helpers de Multiselect (simulação se não houver biblioteca externa, 
    // ou integração com a lib existente do geral_script)
    function resetMultiselect(id) {
        const wrapper = document.getElementById(id);
        if(!wrapper) return;
        wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
        // Se usar uma lib específica, chamar o método de clear dela
        const msInst = wrapper._msInstance; 
        if(msInst && msInst.clear) msInst.clear();
    }

    function setMultiselectValue(id, values) {
        if (!Array.isArray(values)) return;
        const wrapper = document.getElementById(id);
        if(!wrapper) return;
        
        // Se for a lib customizada do SENAI (geral_script)
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = values.includes(cb.value);
            cb.dispatchEvent(new Event('change'));
        });
    }

    init();
})();