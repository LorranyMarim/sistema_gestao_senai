(() => {
    'use strict';

    const API_URL = '../backend/processa_curso.php';
    const API_BOOTSTRAP = '../backend/processa_curso.php?action=bootstrap';
    const API_UCS = '../backend/processa_ucs.php';
    
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

    function init() {
        ensureParamModalExists();
        setupFilters();
        setupModals();
        
        // Substituimos o loadBootstrapData pela configuração assíncrona igual a de Instrutores
        setupAsyncUcs(); 

        App.pagination.bindControls(pagElements, (action) => {
            // ... (Mantenha o código de paginação existente) ...
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
    function setupAsyncUcs() {
        const fetchUcs = async (page, pageSize, term) => {
            const params = new URLSearchParams({
                page: page,
                page_size: pageSize,
                status: 'Ativo', // Traz apenas UCs ativas
                busca: term || ''
            });

            // Busca direto da API de UCs
            const res = await App.net.fetchJSON(`${API_UCS}?${params.toString()}`);

            // Atualiza o mapa global para podermos usar os nomes na Parametrização e Visualização
            (res.items || []).forEach(uc => {
                ucsGlobalMap[uc._id] = uc.descricao;
            });

            // Retorna no formato que o multiselect espera
            return (res.items || []).map(uc => ({
                value: uc._id,
                label: uc.descricao
            }));
        };

        const msModalEl = document.getElementById('ms-ucs-modal');
        if (msModalEl && msModalEl._msInstance) {
            msModalEl._msInstance.setupAsync(fetchUcs);
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
        // 1. Coleta dados básicos dos inputs hidden
        const ucsInput = document.getElementById('competenciasCurso'); 
        const areaInput = document.getElementById('areaCurso');

        let selectedUcsIds = [];
        let selectedAreas = [];

        try { selectedUcsIds = JSON.parse(ucsInput.value || '[]'); } catch { }
        try { selectedAreas = JSON.parse(areaInput.value || '[]'); } catch { }

        // --- VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ---
        if (selectedAreas.length === 0) {
            showAlert('Por favor, selecione ao menos uma Área Tecnológica.');
            return;
        }

        if (selectedUcsIds.length === 0) {
            showAlert('Por favor, selecione ao menos uma Unidade Curricular.');
            return;
        }
        // ----------------------------------------

        // Validação básica da carga horária total
        const cargaTotal = document.getElementById('cargaTotalCurso').value;
        if (!/^\d+(\.\d{1,2})?$/.test(cargaTotal)) {
            showAlert('Carga horária total inválida. Use apenas números e ponto (ex: 100.50).');
            return;
        }

        // 2. Abre Modal de Parametrização
        openParametrizationModal(selectedUcsIds);
    }

    function openParametrizationModal(ucsIds) {
        const paramModal = document.getElementById('paramUcModal');
        const container = document.getElementById('accordionContainer');
        container.innerHTML = ''; // Limpa conteúdo anterior

        // Sincroniza o objeto de memória
        Object.keys(ucsParametrizadas).forEach(id => {
            if (!ucsIds.includes(id)) delete ucsParametrizadas[id];
        });

        ucsIds.forEach(id => {
            if (!ucsParametrizadas[id]) {
                ucsParametrizadas[id] = {
                    carga_presencial: 0, aulas_presencial: 0, dias_presencial: 0,
                    carga_ead: 0, aulas_ead: 0, dias_ead: 0
                };
            }
        });

        // Gera o HTML
        ucsIds.forEach((id) => {
            const ucNome = ucsGlobalMap[id] || 'UC não identificada';
            const dados = ucsParametrizadas[id];
            
            // Layout: 2 linhas x 3 colunas
            const itemHtml = `
                <div class="accordion-item border rounded mb-2 shadow-sm">
                    <h2 class="accordion-header">
                        <button class="accordion-button w-full text-left p-3 bg-gray-100 hover:bg-gray-200 font-bold flex justify-between items-center" 
                                type="button" 
                                onclick="toggleAccordion('${id}', this)">
                            <span>${ucNome}</span>
                            <i class="fas fa-chevron-right transition-transform"></i>
                        </button>
                    </h2>
                    <div id="collapse-${id}" class="accordion-collapse p-3 bg-white border-t hidden">
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div class="form-group">
                                <label class="block text-xs font-medium text-blue-800 mb-1">Carga Horária Presencial (h)</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-decimal" 
                                       data-id="${id}" data-field="carga_presencial" value="${dados.carga_presencial || 0}">
                            </div>
                            <div class="form-group">
                                <label class="block text-xs font-medium text-blue-800 mb-1">Qtd Aulas Presencial</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-integer" 
                                       data-id="${id}" data-field="aulas_presencial" value="${dados.aulas_presencial || 0}">
                            </div>
                            <div class="form-group">
                                <label class="block text-xs font-medium text-blue-800 mb-1">Dias Letivos Presencial</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-integer" 
                                       data-id="${id}" data-field="dias_presencial" value="${dados.dias_presencial || 0}">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="form-group">
                                <label class="block text-xs font-medium text-green-800 mb-1">Carga Horária EAD (h)</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-decimal" 
                                       data-id="${id}" data-field="carga_ead" value="${dados.carga_ead || 0}">
                            </div>
                            <div class="form-group">
                                <label class="block text-xs font-medium text-green-800 mb-1">Qtd Aulas EAD</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-integer" 
                                       data-id="${id}" data-field="aulas_ead" value="${dados.aulas_ead || 0}">
                            </div>
                            <div class="form-group">
                                <label class="block text-xs font-medium text-green-800 mb-1">Dias Letivos EAD</label>
                                <input type="text" class="form-control p-2 border rounded w-full inp-integer" 
                                       data-id="${id}" data-field="dias_ead" value="${dados.dias_ead || 0}">
                            </div>
                        </div>

                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHtml);
        });

        applyInputMasks(container);
        paramModal.style.display = 'flex';
    }
    // Função auxiliar para aplicar restrições de entrada (Inteiro vs Decimal)
    function applyInputMasks(container) {
        // Apenas números inteiros
        container.querySelectorAll('.inp-integer').forEach(input => {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        });

        // Números decimais (ponto) com duas casas
        container.querySelectorAll('.inp-decimal').forEach(input => {
            input.addEventListener('input', function() {
                // Remove tudo que não for número ou ponto
                let val = this.value.replace(/[^0-9.]/g, '');
                
                // Garante apenas um ponto
                const parts = val.split('.');
                if (parts.length > 2) {
                    val = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Limita casas decimais (opcional, mas recomendado)
                if (parts.length === 2 && parts[1].length > 2) {
                    val = parts[0] + '.' + parts[1].substring(0, 2);
                }
                
                this.value = val;
            });
        });
    }

   window.toggleAccordion = function(id, btnElement) {
        const contentDiv = document.getElementById(`collapse-${id}`);
        const icon = btnElement.querySelector('i');
        
        // Verifica se está oculto (checa a classe 'hidden' OU se o display está 'none')
        const isHidden = contentDiv.classList.contains('hidden') || getComputedStyle(contentDiv).display === 'none';

        if (isHidden) {
            // --- ABRIR ---
            contentDiv.classList.remove('hidden'); // Remove classe Tailwind
            contentDiv.classList.add('show');      // Adiciona classe Bootstrap (se houver CSS do Bootstrap)
            contentDiv.style.display = 'block';    // Força a exibição via estilo inline (garantia final)
            
            // Ajusta ícone
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        } else {
            // --- FECHAR ---
            contentDiv.classList.add('hidden');
            contentDiv.classList.remove('show');
            contentDiv.style.display = 'none';
            
            // Ajusta ícone
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        }
    };

    function saveParametrization() {
        const container = document.getElementById('accordionContainer');
        
        // Seleciona todos os inputs dentro do modal
        const inputs = container.querySelectorAll('input');

        inputs.forEach(inp => {
            const id = inp.dataset.id;
            const field = inp.dataset.field; // ex: 'carga_presencial', 'dias_ead'
            
            if (ucsParametrizadas[id] && field) {
                // Converte para número (float para garantir decimais)
                let val = parseFloat(inp.value);
                if (isNaN(val)) val = 0;
                
                ucsParametrizadas[id][field] = val;
            }
        });

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

        // Estrutura idêntica ao cursoModal do HTML fornecido
        const html = `
        <div id="paramUcModal" class="modal modal-dialog-centered" style="background: rgba(0,0,0,0.5); z-index: 1060;">
            <div class="modal-content" style="max-width: 900px; width: 90%; max-height: 90vh; display:flex; flex-direction:column;">
                <span class="close-button" id="closeParamModal">&times;</span>
                
                <h2 id="modalTitleParam">Parametrizar Unidades Curriculares</h2>

                <div class="modal-body overflow-y-auto p-4 flex-1" id="accordionContainer">
                    </div>

                <div class="modal-footer" style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" id="cancelParamBtn">
                        <i class="fas fa-times-circle"></i> Voltar
                    </button>
                    <button type="button" class="btn btn-primary" id="saveParamBtn">
                        <i class="fas fa-save"></i> Confirmar Parametrização
                    </button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);

        // Bind dos eventos do modal recém-criado
        document.getElementById('closeParamModal').addEventListener('click', () => {
             document.getElementById('paramUcModal').style.display = 'none';
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