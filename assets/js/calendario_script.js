(() => {
    'use strict';

    if (!window.App) throw new Error('Carregue geral_script.js antes.');

    const { $, $$ } = App.dom;
    const { safeFetch } = App.net;
    const { paginateData, bindControls, updateUI } = App.pagination;
    const fmtData = App.format.fmtDateBR;

    const API = {
        base: '../backend/processa_calendarios.php',
        bootstrap: '../backend/processa_calendarios.php?action=bootstrap'
    };

    const STATE = {
        calendarios: [],
        activeCalendars: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        filters: { q: '', status: ['Todos'], created_from: '', created_to: '' },
        editingCal: null,
        daysCache: [],
        busyRanges: [] // NOVA PROPRIEDADE: Armazena as datas ocupadas do calendário selecionado
    };

    const refs = {
        tableBody: $('#calTableBody'),
        calModal: $('#calModal'),
        diaModal: $('#diaModal'),
        viewModal: $('#viewModal'),
        manageDaysModal: $('#manageDaysModal'),
        fullCalendarModal: $('#fullCalendarModal'),
        
        calForm: $('#calForm'),
        diaForm: $('#diaForm'),
        
        tituloCal: $('#tituloCal'),
        inicioCal: $('#inicioCal'),
        finalCal: $('#finalCal'),
        statusCal: $('#statusCal'),
        
        selectCalDia: $('#selectCalDia'),
        tipoDia: $('#tipoDia'),
        inicioDia: $('#inicioDia'),
        checkRange: $('#checkRange'),
        divFinalDia: $('#divFinalDia'),
        finalDia: $('#finalDia'),
        
        viewInputs: {
            titulo: $('#viewTitulo'),
            inicio: $('#viewInicio'),
            fim: $('#viewFim'),
            status: $('#viewStatus')
        },
        
        pagElements: {
            prev: $('#prevPage'),
            next: $('#nextPage'),
            info: $('#pageInfo'),
            sizeSel: null
        }
    };

    let calendarInstance = null;

    // --- Helpers ---

    function addDays(dateStr, days) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().split('T')[0];
    }

    function toggleErrorFinalDia(show) {
        let err = document.getElementById('msg-erro-final-dia');
        if (!err) {
            err = document.createElement('div');
            err.id = 'msg-erro-final-dia';
            err.className = 'text-red-500 text-xs mt-1 font-bold';
            err.innerText = 'Não é possível selecionar nenhuma data final enquanto a data Início não for inserida.';
            refs.divFinalDia.appendChild(err);
        }
        err.style.display = show ? 'block' : 'none';
    }

    // NOVA FUNÇÃO: Verifica se uma data está dentro de algum período já cadastrado
    function isDateBusy(dateStr) {
        if (!dateStr || !STATE.busyRanges.length) return false;
        
        return STATE.busyRanges.some(range => {
            // Se for o mesmo ID que estamos editando, não conta como ocupado
            if (ignoreId && range.id === ignoreId) return false;
            
            return dateStr >= range.start && dateStr <= range.end;
        });
    }

    // --- Inicialização ---

    async function carregarDados() {
        try {
            const data = await safeFetch(API.bootstrap);
            STATE.calendarios = Array.isArray(data.calendarios) ? data.calendarios : [];
            STATE.activeCalendars = Array.isArray(data.calendarios_ativos) ? data.calendarios_ativos : [];
            
            populateCalendarSelect();
            renderizarConteudo();
        } catch(e) {
            console.error(e);
            refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
        }
    }

    function populateCalendarSelect() {
        if (!refs.selectCalDia) return;
        const opts = ['<option value="">Selecione...</option>']
            .concat(STATE.activeCalendars.map(c => {
                const inicio = (c.inicio_calendario || '').split('T')[0] || '';
                const fim = (c.final_calendario || '').split('T')[0] || '';
                return `<option value="${c._id}" data-min="${inicio}" data-max="${fim}">${c.titulo}</option>`;
            }));
        refs.selectCalDia.innerHTML = opts.join('');
    }

    // --- Renderização e Filtros ---

    function applyFiltersFromUI() {
        const elSearch = document.getElementById('gen_search');
        STATE.filters.q = (elSearch?.value || '').trim();

        const elStatus = document.getElementById('gen_status');
        STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

        const elFrom = document.getElementById('gen_created_from');
        const elTo = document.getElementById('gen_created_to');
        STATE.filters.created_from = elFrom?.value ? App.utils.toIsoStartOfDayLocal(elFrom.value) : '';
        STATE.filters.created_to = elTo?.value ? App.utils.toIsoEndOfDayLocal(elTo.value) : '';

        const elSize = document.getElementById('gen_pagesize');
        if (elSize) {
          STATE.pagination.pageSize = parseInt(elSize.value, 10);
          refs.pagElements.sizeSel = elSize;
        }
    }

    function renderizarConteudo() {
        applyFiltersFromUI();

        const filtered = STATE.calendarios.filter(c => {
            const f = STATE.filters;
            if (f.q) {
                const text = `${c.titulo}`.toLowerCase();
                if (!text.includes(f.q.toLowerCase())) return false;
            }
            if (f.status[0] !== 'Todos') {
                const statusItem = (c.status || 'Ativo').toLowerCase();
                const filtroStatus = f.status[0].toLowerCase();
                if (statusItem !== filtroStatus) return false;
            }
            if (f.created_from && c.criado_em < f.created_from) return false;
            if (f.created_to && c.criado_em > f.created_to) return false;
            return true;
        });

        const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
        STATE.pagination = { ...STATE.pagination, ...meta };

        updateUI(refs.pagElements, meta);
        renderTable(pagedData);
    }

    function renderTable(lista) {
        if (!lista || !lista.length) {
            refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        refs.tableBody.innerHTML = lista.map(c => `
            <tr>
                <td>${c.titulo}</td>
                <td>${fmtData(c.inicio_calendario)}</td>
                <td>${fmtData(c.final_calendario)}</td>
                <td><span class="${c.status === 'Inativo' ? 'text-red-500' : 'text-green-600'} font-bold">${c.status}</span></td>
                <td>${fmtData(c.criado_em)}</td>
                <td>
                    <div class="flex gap-2 justify-center">
                        <button class="btn btn-icon btn-view" data-id="${c._id}" title="Ver"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-icon btn-edit" data-id="${c._id}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" data-id="${c._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function setupFilters() {
        if (App.filters && App.filters.render) {
            App.filters.render(
                'filter_area',
                { search: true, date: true, status: true, pageSize: true },
                null,
                () => { STATE.pagination.page = 1; renderizarConteudo(); },
                () => { 
                    STATE.filters = { q: '', status: ['Todos'], created_from: '', created_to: '' };
                    STATE.pagination.page = 1;
                    renderizarConteudo();
                }
            );
        }
        renderizarConteudo();
    }

    // --- Modais ---
    // Função para abrir o modal em modo de EDIÇÃO (chamada pelo clique no FullCalendar)
    function openDiaModalEdit(eventObj) {
        const props = eventObj.extendedProps;
        
        // 1. Preenche o ID oculto para o submit saber que é edição
        $('#diaId').value = eventObj.id; 
        
        // 2. Define o calendário pai e dispara change para carregar limites
        refs.selectCalDia.value = STATE.editingCal._id; 
        refs.selectCalDia.dispatchEvent(new Event('change')); // Importante para carregar busyRanges
        
        // 3. Preenche Tipo e Data Início
        refs.tipoDia.value = props.tipo || eventObj.title; 
        const startStr = eventObj.startStr.split('T')[0];
        refs.inicioDia.value = startStr;
        
        // 4. Lógica do Checkbox Range (Período)
        // Verifica se é range ou se tem data fim diferente da início
        if (props.isRange || (props.data_fim && props.data_fim.split('T')[0] !== startStr)) {
            refs.checkRange.checked = true;
            refs.finalDia.disabled = false;
            refs.finalDia.value = props.data_fim.split('T')[0];
        } else {
            refs.checkRange.checked = false;
            refs.finalDia.disabled = true;
            refs.finalDia.value = '';
        }

        // 5. Habilita os campos para edição
        refs.tipoDia.disabled = false;
        refs.inicioDia.disabled = false;
        refs.checkRange.disabled = false;

        // 6. Ajustes Visuais: Título e Botão Excluir
        $('#modalTitleDia').innerText = "Editar Dias/Período Letivo"; // Título exigido na regra
        const btnDel = document.getElementById('btnDeleteDia');
        if(btnDel) btnDel.classList.remove('hidden'); // Mostra botão excluir
        
        // Remove erro visual anterior se houver
        toggleErrorFinalDia(false);
        
        App.ui.showModal(refs.diaModal);
    }

    // Atualize a função openDiaModal existente para garantir o estado de "Criação"
    function openDiaModal() {
        refs.diaForm.reset();
        $('#diaId').value = ''; // Limpa o ID -> Indica CRIAÇÃO
        
        refs.tipoDia.disabled = true;
        refs.inicioDia.disabled = true;
        refs.checkRange.disabled = true;
        refs.checkRange.checked = false;
        refs.finalDia.disabled = true; 
        refs.finalDia.value = '';
        refs.finalDia.required = false;
        
        // Ajustes Visuais: Título e Esconder Excluir
        const titleEl = document.getElementById('modalTitleDia');
        if(titleEl) titleEl.innerText = "Criar Dia/Período Letivo";
        
        const btnDel = document.getElementById('btnDeleteDia');
        if(btnDel) btnDel.classList.add('hidden'); // Esconde botão excluir
        
        toggleErrorFinalDia(false);
        STATE.busyRanges = []; 
        App.ui.showModal(refs.diaModal);
    }

    function openCalModal(editId = null) {
        refs.calForm.reset();
        $('#calId').value = '';
        STATE.editingCal = null;
        refs.statusCal.disabled = true;
        refs.finalCal.disabled = true;

        if (editId) {
            const cal = STATE.calendarios.find(c => c._id === editId);
            if (cal) {
                STATE.editingCal = cal;
                $('#calId').value = cal._id;
                refs.tituloCal.value = cal.titulo;
                refs.inicioCal.value = cal.inicio_calendario.split('T')[0];
                
                refs.finalCal.disabled = false;
                refs.finalCal.value = cal.final_calendario.split('T')[0];
                refs.finalCal.min = refs.inicioCal.value;
                
                refs.statusCal.value = cal.status;
                refs.statusCal.disabled = false;
                $('#modalTitleCal').innerText = "Editar Calendário";
            }
        } else {
            $('#modalTitleCal').innerText = "Adicionar Novo Calendário";
            refs.statusCal.value = "Ativo";
        }
        App.ui.showModal(refs.calModal);
    }

    function openDiaModal() {
        refs.diaForm.reset();
        refs.tipoDia.disabled = true;
        refs.inicioDia.disabled = true;
        refs.checkRange.disabled = true;
        refs.checkRange.checked = false;
        refs.finalDia.disabled = true; 
        refs.finalDia.value = '';
        refs.finalDia.required = false;
        toggleErrorFinalDia(false);
        // Limpa cache de dias ocupados ao abrir para evitar lixo de memória
        STATE.busyRanges = []; 
        App.ui.showModal(refs.diaModal);
    }

    // --- Events ---

   function setupEvents() {
        // --- Paginação ---
        bindControls(refs.pagElements, (action) => {
            if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
            if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
            renderizarConteudo();
        });

        // --- Ações da Tabela (Delegation) ---
        refs.tableBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            
            // Botão EDITAR (Abre Popup de Decisão)
            if (btn.classList.contains('btn-edit')) {
                STATE.tempEditId = id; // Guarda o ID temporariamente
                App.ui.showModal(document.getElementById('decisionModal'));
            }
            
            // Botão EXCLUIR
            if (btn.classList.contains('btn-delete')) {
                if(confirm('Deseja excluir? Se houver dias letivos, será bloqueado.')) {
                    try {
                        App.loader.show();
                        await safeFetch(`${API.base}?action=delete&id=${id}`, { method: 'POST' });
                        await carregarDados(); 
                        alert('Removido!');
                    } catch(err) { alert(err.message); } finally { App.loader.hide(); }
                }
            }

            // Botão VISUALIZAR
            if (btn.classList.contains('btn-view')) {
                const cal = STATE.calendarios.find(c => c._id === id);
                if (cal) {
                    STATE.editingCal = cal;
                    refs.viewInputs.titulo.value = cal.titulo;
                    refs.viewInputs.inicio.value = fmtData(cal.inicio_calendario);
                    refs.viewInputs.fim.value = fmtData(cal.final_calendario);
                    
                    // Tratamento seguro para status (caso não venha do backend)
                    const stInput = document.getElementById('viewStatus');
                    if(stInput) stInput.value = cal.status || '';
                    
                    App.ui.showModal(refs.viewModal);
                }
            }
        });

        // --- Botões do Modal de Decisão ---
        const btnDecisaoDados = document.getElementById('btnDecisaoDados');
        if (btnDecisaoDados) {
            btnDecisaoDados.onclick = () => {
                App.ui.hideModal(document.getElementById('decisionModal'));
                openCalModal(STATE.tempEditId); // Abre edição normal
            };
        }

        const btnDecisaoDias = document.getElementById('btnDecisaoDias');
        if (btnDecisaoDias) {
            btnDecisaoDias.onclick = () => {
                App.ui.hideModal(document.getElementById('decisionModal'));
                const cal = STATE.calendarios.find(c => c._id === STATE.tempEditId);
                if(cal) {
                    STATE.editingCal = cal;
                    // Abre FullCalendar interativo (true)
                    initFullCalendar(cal, true); 
                    App.ui.showModal(refs.fullCalendarModal);
                }
            };
        }

        // --- Botões de Fechar Modais (Globais) ---
        $$('.close-button').forEach(btn => {
            // Evita duplicar listeners se rodar setupEvents mais de uma vez (boa prática)
            btn.onclick = () => App.ui.hideModal(btn.closest('.modal'));
        });
        
        // Específicos do FullCalendar
        const btnCloseTop = $('#closeFullCalendarBtn');
        if (btnCloseTop) btnCloseTop.onclick = () => App.ui.hideModal(refs.fullCalendarModal);

        const btnCloseFooter = $('#btnCloseFullCal');
        if (btnCloseFooter) btnCloseFooter.onclick = () => App.ui.hideModal(refs.fullCalendarModal);

        // Cancelar forms
        $('#cancelCalBtn').onclick = () => App.ui.hideModal(refs.calModal);
        $('#cancelDiaBtn').onclick = () => App.ui.hideModal(refs.diaModal);
        const closeViewBtn = $('#closeViewBtn');
        if(closeViewBtn) closeViewBtn.onclick = () => App.ui.hideModal(refs.viewModal);


        // --- Lógica do Formulário de Calendário ---
        $('#addCalBtn').addEventListener('click', () => openCalModal());
        
        refs.inicioCal.addEventListener('change', (e) => {
            refs.finalCal.disabled = false;
            refs.finalCal.min = e.target.value;
            if (refs.finalCal.value && refs.finalCal.value < e.target.value) {
                refs.finalCal.value = e.target.value;
            }
        });

        refs.calForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = $('#calId').value;
            const payload = {
                titulo: refs.tituloCal.value,
                inicio_calendario: new Date(refs.inicioCal.value).toISOString(),
                final_calendario: new Date(refs.finalCal.value).toISOString(),
                status: refs.statusCal.value
            };
            try {
                App.loader.show();
                const action = id ? `update&id=${id}` : 'create';
                await safeFetch(`${API.base}?action=${action}`, {
                    method: 'POST', body: JSON.stringify(payload)
                });
                App.ui.hideModal(refs.calModal);
                await carregarDados();
                alert('Salvo com sucesso!');
            } catch(err) { alert(err.message); } finally { App.loader.hide(); }
        });


        // --- Lógica de Dias Letivos (Criação/Edição) ---
        
        // Botão "Adicionar Dia" solto na tela
        $('#addDiaBtn').addEventListener('click', openDiaModal);

        // Select Calendário Pai
        refs.selectCalDia.addEventListener('change', async (e) => {
            const valor = e.target.value;
            const opt = e.target.selectedOptions[0];

            // Resetar UI
            STATE.busyRanges = [];
            refs.tipoDia.value = "";
            refs.inicioDia.value = "";
            refs.checkRange.checked = false;
            refs.finalDia.value = "";
            
            // Se estiver em modo edição e trocarem o calendário, pode ser perigoso,
            // mas aqui só resetamos limites. O ideal é bloquear o select na edição.
            
            if (!valor) {
                refs.tipoDia.disabled = true;
                refs.inicioDia.disabled = true;
                refs.checkRange.disabled = true;
                refs.finalDia.disabled = true;
                return; 
            }

            refs.tipoDia.disabled = false;
            refs.inicioDia.disabled = false;
            refs.checkRange.disabled = false;
            
            const minDate = opt.dataset.min;
            const maxDate = opt.dataset.max;

            refs.inicioDia.min = minDate;
            refs.inicioDia.max = maxDate;
            refs.finalDia.min = minDate;
            refs.finalDia.max = maxDate;

            // Fetch dias ocupados
            try {
                const days = await safeFetch(`${API.base}?action=list_days&cal_id=${valor}`);
                STATE.busyRanges = days.map(d => ({
                    start: d.data_inicio.split('T')[0],
                    end: (d.data_fim || d.data_inicio).split('T')[0],
                    id: d._id // Guardamos ID para saber ignorar na edição
                }));
            } catch(e) { console.error("Erro ao buscar dias ocupados", e); }
        });

        // Toggle Checkbox Range
        refs.checkRange.addEventListener('change', (e) => {
            if (e.target.checked) {
                refs.finalDia.disabled = false; 
                refs.finalDia.required = true;
            } else {
                refs.finalDia.disabled = true;
                refs.finalDia.value = ''; 
                refs.finalDia.required = false;
                toggleErrorFinalDia(false);
            }
        });

        // Validação Início
        refs.inicioDia.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                // Passa o ID atual para ignorar conflito consigo mesmo
                const currentId = $('#diaId').value;
                if (isDateBusy(val, currentId)) {
                    alert('Esta data já possui um evento cadastrado.');
                    e.target.value = '';
                    return;
                }
                toggleErrorFinalDia(false);
                const minDate = addDays(val, 1);
                refs.finalDia.min = minDate;
                if (refs.finalDia.value && refs.finalDia.value <= val) {
                    refs.finalDia.value = '';
                }
            } else {
                const opt = refs.selectCalDia.selectedOptions[0];
                if(opt) refs.finalDia.min = opt.dataset.min;
            }
        });

        // Validação Fim
        refs.finalDia.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                 const currentId = $('#diaId').value;
                 if (isDateBusy(val, currentId)) {
                      alert('Esta data já possui um evento cadastrado.');
                      e.target.value = '';
                      return;
                 }
                 if (refs.inicioDia.value && val <= refs.inicioDia.value) {
                     alert('A data final deve ser posterior à data inicial.');
                     e.target.value = '';
                 }
            }
        });

        // Bloqueio visual
        const checkFinalDiaAccess = (e) => {
            if (refs.checkRange.checked && !refs.inicioDia.value) {
                e.preventDefault();
                refs.finalDia.blur(); 
                toggleErrorFinalDia(true);
            }
        };
        refs.finalDia.addEventListener('click', checkFinalDiaAccess);
        refs.finalDia.addEventListener('focus', checkFinalDiaAccess);

        // Submit Dia (Criar ou Editar)
        refs.diaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const diaId = $('#diaId').value;
            
            if (refs.checkRange.checked && refs.finalDia.value <= refs.inicioDia.value) {
                alert("A data final deve ser posterior à data inicial.");
                return;
            }

            const payload = {
                calendario_id: refs.selectCalDia.value,
                tipo: refs.tipoDia.value,
                data_inicio: new Date(refs.inicioDia.value).toISOString(),
                data_final_check: refs.checkRange.checked,
                data_fim: refs.checkRange.checked ? new Date(refs.finalDia.value).toISOString() : null
            };

            try {
                App.loader.show();
                if (diaId) {
                    // EDIÇÃO
                    await safeFetch(`${API.base}?action=update_day&id=${diaId}`, { 
                        method: 'POST', body: JSON.stringify(payload) 
                    });
                    alert('Dia letivo atualizado!');
                } else {
                    // CRIAÇÃO
                    await safeFetch(`${API.base}?action=create_day`, { 
                        method: 'POST', body: JSON.stringify(payload) 
                    });
                    alert('Dia/Período adicionado!');
                }

                App.ui.hideModal(refs.diaModal);
                
                // Recarrega FullCalendar se estiver aberto (modo gerenciamento)
                if(STATE.editingCal) {
                     initFullCalendar(STATE.editingCal, true); 
                }
            } catch(err) { alert(err.message); } finally { App.loader.hide(); }
        });

        // Botão EXCLUIR DIA (dentro do modal de edição)
        const btnDelDia = document.getElementById('btnDeleteDia');
        if(btnDelDia) {
            btnDelDia.onclick = async () => {
                const diaId = $('#diaId').value;
                if (!diaId) return;
                
                if(confirm('Tem certeza que deseja excluir este registro?')) {
                    try {
                        App.loader.show();
                        await safeFetch(`${API.base}?action=delete_day&id=${diaId}`, { method: 'POST' });
                        alert('Removido com sucesso!');
                        App.ui.hideModal(refs.diaModal);
                        if(STATE.editingCal) initFullCalendar(STATE.editingCal, true);
                    } catch(e) { alert(e.message); } finally { App.loader.hide(); }
                }
            };
        }

        // Botão Visualizar Dias (FullCalendar Apenas Leitura vindo do ViewModal)
        $('#openFullCalendarBtn')?.addEventListener('click', () => {
             App.ui.hideModal(refs.viewModal);
             if (STATE.editingCal) {
                 initFullCalendar(STATE.editingCal, false); // FALSE = não interativo
                 App.ui.showModal(refs.fullCalendarModal);
             }
        });
    }
    
    async function loadDaysTable(calId) {
        const tbody = $('#manageDaysBody');
        tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
        try {
            const days = await safeFetch(`${API.base}?action=list_days&cal_id=${calId}`);
            if (days.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nenhum dia cadastrado.</td></tr>';
                return;
            }
            tbody.innerHTML = days.map(d => `
                <tr>
                    <td>${fmtData(d.data_inicio)}${d.data_fim ? ' a ' + fmtData(d.data_fim) : ''}</td>
                    <td>${d.tipo}</td>
                    <td>
                        <button class="btn btn-icon text-red-500" onclick="App.deleteDay('${d._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
            
            window.App.deleteDay = async (id) => {
                if(!confirm('Excluir este dia letivo?')) return;
                try {
                    await safeFetch(`${API.base}?action=delete_day&id=${id}`, { method: 'POST' });
                    loadDaysTable(calId);
                } catch(e) { alert(e.message); }
            };

        } catch(e) { console.error(e); }
    }

    function initFullCalendar(cal, isInteractive = false) {
        const el = document.getElementById('calendarEl');
        el.innerHTML = ''; 
        
        // 1. Determina a data inicial de visualização
        const hoje = new Date().toISOString().split('T')[0];
        let dataInicial = hoje;

        // Se HOJE estiver fora do range do calendário, força o início na data de início das aulas
        if (hoje < cal.inicio_calendario.split('T')[0] || hoje > cal.final_calendario.split('T')[0]) {
             dataInicial = cal.inicio_calendario;
        }

        calendarInstance = new FullCalendar.Calendar(el, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            initialDate: dataInicial,
            
            // 2. Bloqueio de Navegação (Trava o usuário dentro do período do calendário)
            validRange: {
                start: cal.inicio_calendario,
                end: addDays(cal.final_calendario, 1) // +1 dia para incluir o último dia visualmente
            },

            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            height: '100%',

            // 3. Interatividade (Só ativa se isInteractive for true)
            // Isso diferencia o "Visualizar" (somente leitura) do "Gerenciar Dias" (edição)
            eventClick: function(info) {
                if (isInteractive) {
                    openDiaModalEdit(info.event); // Abre o modal de edição carregando os dados
                }
            },
            eventMouseEnter: isInteractive ? (info) => info.el.style.cursor = 'pointer' : null,
            
            // 4. Carregamento de eventos
            events: async (info, successCallback, failureCallback) => {
                try {
                    const days = await safeFetch(`${API.base}?action=list_days&cal_id=${cal._id}`);
                    const events = days.map(d => {
                        let color = '#ccc';
                        // Cores conforme legenda
                        if (d.tipo === 'Presencial') color = '#bfdbfe'; 
                        if (d.tipo === 'EAD') color = '#e9d5ff';        
                        if (d.tipo === 'Prática na Unidade') color = '#bbf7d0'; 
                        if (d.tipo === 'Reposição') color = '#fef08a';  
                        
                        return {
                            id: d._id, // IMPORTANTE: Necessário para a edição saber qual ID atualizar
                            title: d.tipo,
                            start: d.data_inicio,
                            end: d.data_fim ? addDays(d.data_fim, 1) : d.data_inicio,
                            backgroundColor: color,
                            textColor: '#333',
                            borderColor: color,
                            allDay: true,
                            
                            // 5. Dados Extras: Necessários para preencher o formulário de edição corretamente
                            extendedProps: { 
                                tipo: d.tipo,
                                data_fim: d.data_fim,
                                // Define se é um intervalo ou dia único
                                isRange: d.data_fim && d.data_fim !== d.data_inicio
                            }
                        };
                    });
                    successCallback(events);
                } catch(e) { failureCallback(e); }
            }
        });
        
        // Renderiza após o modal estar visível para evitar bugs de layout
        setTimeout(() => {
            calendarInstance.render();
            calendarInstance.updateSize();
        }, 200);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        App.loader.show();
        try {
            await carregarDados();
            setupFilters(); 
            setupEvents();
        } catch(e) {
            console.error(e);
            alert("Erro fatal ao iniciar aplicação.");
        } finally {
            App.loader.hide();
        }
    });
})();