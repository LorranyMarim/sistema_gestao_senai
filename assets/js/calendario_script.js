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
            fim: $('#viewFim')
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
        // Compara strings ISO (YYYY-MM-DD) diretamente
        return STATE.busyRanges.some(range => {
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
        bindControls(refs.pagElements, (action) => {
            if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
            if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
            renderizarConteudo();
        });

        refs.tableBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            
            if (btn.classList.contains('btn-edit')) openCalModal(id);
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
            if (btn.classList.contains('btn-view')) {
                const cal = STATE.calendarios.find(c => c._id === id);
                if (cal) {
                    STATE.editingCal = cal;
                    refs.viewInputs.titulo.value = cal.titulo;
                    refs.viewInputs.inicio.value = fmtData(cal.inicio_calendario);
                    refs.viewInputs.fim.value = fmtData(cal.final_calendario);
                    App.ui.showModal(refs.viewModal);
                }
            }
        });

        refs.inicioCal.addEventListener('change', (e) => {
            refs.finalCal.disabled = false;
            refs.finalCal.min = e.target.value;
            if (refs.finalCal.value && refs.finalCal.value < e.target.value) {
                refs.finalCal.value = e.target.value;
            }
        });

        $('#addCalBtn').addEventListener('click', () => openCalModal());
        $('#addDiaBtn').addEventListener('click', openDiaModal);

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

        // --- Lógica Dia Letivo / Calendário Filho ---

        // 1. Ao selecionar o Calendário Pai: Fetch dos dias ocupados
        refs.selectCalDia.addEventListener('change', async (e) => {
            const opt = e.target.selectedOptions[0];
            const valor = e.target.value;

            // Resetar
            STATE.busyRanges = [];
            refs.tipoDia.value = "";
            refs.inicioDia.value = "";
            refs.checkRange.checked = false;
            refs.finalDia.value = "";

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
            
            // Configura limites min/max baseados no pai
            const minDate = opt.dataset.min;
            const maxDate = opt.dataset.max;

            refs.inicioDia.min = minDate;
            refs.inicioDia.max = maxDate;
            
            refs.finalDia.min = minDate;
            refs.finalDia.max = maxDate;

            // BUSCA DATAS JÁ OCUPADAS (Assíncrono)
            try {
                const days = await safeFetch(`${API.base}?action=list_days&cal_id=${valor}`);
                STATE.busyRanges = days.map(d => ({
                    start: d.data_inicio.split('T')[0],
                    // Se não tiver data_fim, considera o próprio dia de início como fim do range
                    end: (d.data_fim || d.data_inicio).split('T')[0] 
                }));
            } catch(e) { console.error("Erro ao buscar dias ocupados", e); }
        });

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

        // 2. Validação InicioDia: Bloqueio de datas ocupadas
        refs.inicioDia.addEventListener('change', (e) => {
            const dataInicial = e.target.value;

            if (dataInicial) {
                // NOVA REGRA: Verifica se a data selecionada está ocupada
                if (isDateBusy(dataInicial)) {
                    alert('Esta data já possui um evento cadastrado e não pode ser selecionada.');
                    e.target.value = '';
                    toggleErrorFinalDia(false);
                    return;
                }

                toggleErrorFinalDia(false);
                // Bloquear dias <= Data Inicial para o campo Final (min = dia seguinte)
                const minDate = addDays(dataInicial, 1);
                refs.finalDia.min = minDate;

                // Limpa data final se ficou inconsistente
                if (refs.finalDia.value && refs.finalDia.value <= dataInicial) {
                    refs.finalDia.value = '';
                }
            } else {
                const opt = refs.selectCalDia.selectedOptions[0];
                if(opt) refs.finalDia.min = opt.dataset.min;
            }
        });
        
        // 3. Validação FinalDia: Bloqueio de datas ocupadas e menor que inicio
        refs.finalDia.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                 // NOVA REGRA: Verifica se a data selecionada está ocupada
                 if (isDateBusy(val)) {
                      alert('Esta data já possui um evento cadastrado e não pode ser selecionada.');
                      e.target.value = '';
                      return;
                 }
                 
                 // Regra <= InicioDia (redundância caso o min falhe em algum browser)
                 if (refs.inicioDia.value && val <= refs.inicioDia.value) {
                     alert('A data final deve ser posterior à data inicial.');
                     e.target.value = '';
                 }
            }
        });

        const checkFinalDiaAccess = (e) => {
            if (refs.checkRange.checked && !refs.inicioDia.value) {
                e.preventDefault();
                refs.finalDia.blur(); 
                toggleErrorFinalDia(true);
            }
        };
        refs.finalDia.addEventListener('click', checkFinalDiaAccess);
        refs.finalDia.addEventListener('focus', checkFinalDiaAccess);

        // Submit Único
        refs.diaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validações finais antes de enviar
            if (refs.checkRange.checked) {
                if (refs.finalDia.value <= refs.inicioDia.value) {
                    alert("A data final deve ser posterior à data inicial.");
                    return;
                }
            }
            
            // Verifica overlap de range (opcional mas recomendado dado o requisito de bloqueio)
            if (refs.checkRange.checked && refs.inicioDia.value && refs.finalDia.value) {
                // Se o usuário tentar criar um periodo [1, 10] mas o dia 5 estiver ocupado
                // A validação de 'isDateBusy' nos inputs só pegou as pontas. Aqui pegaria o meio.
                // Mas seguindo estritamente seu pedido de "bloquear datas registradas", 
                // o backend também fará essa verificação de colisão.
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
                await safeFetch(`${API.base}?action=create_day`, { method: 'POST', body: JSON.stringify(payload) });
                App.ui.hideModal(refs.diaModal);
                
                if(STATE.editingCal) {
                     loadDaysTable(STATE.editingCal._id); 
                }
                
                alert('Dia/Período adicionado!');
            } catch(err) { alert(err.message); } finally { App.loader.hide(); }
        });

        $('#openManageDaysBtn')?.addEventListener('click', async () => {
            if (!STATE.editingCal) return;
            App.ui.hideModal(refs.calModal);
            $('#manageDaysTitle').innerText = STATE.editingCal.titulo;
            App.ui.showModal(refs.manageDaysModal);
            loadDaysTable(STATE.editingCal._id);
        });

        $('#openFullCalendarBtn')?.addEventListener('click', () => {
             App.ui.hideModal(refs.viewModal);
             initFullCalendar(STATE.editingCal);
             App.ui.showModal(refs.fullCalendarModal);
        });

        $$('.close-button').forEach(btn => btn.onclick = () => App.ui.hideModal(btn.closest('.modal')));
        $('#cancelCalBtn').onclick = () => App.ui.hideModal(refs.calModal);
        $('#cancelDiaBtn').onclick = () => App.ui.hideModal(refs.diaModal);
        $('#closeViewBtn').onclick = () => App.ui.hideModal(refs.viewModal);
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

    function initFullCalendar(cal) {
        const el = document.getElementById('calendarEl');
        el.innerHTML = ''; // Limpa o calendário anterior
        
        // Determina a data inicial:
        // O requisito diz "mostrando o mês da data atual".
        // Porém, se a data atual estiver MUITO longe do calendário (ex: calendário de 2024 e estamos em 2026),
        // o usuário veria tudo cinza. 
        // A lógica abaixo tenta usar a data atual, mas se ela estiver fora do range, 
        // força o início do calendário para garantir boa UX.
        
        const hoje = new Date().toISOString().split('T')[0];
        let dataInicial = hoje;

        // Opcional: Se quiser forçar estritamente a visualização do mês atual mesmo que esteja tudo cinza,
        // mantenha dataInicial = hoje. 
        // Se quiser pular para o inicio do calendario caso hoje esteja fora, descomente abaixo:
        /*
        if (hoje < cal.inicio_calendario.split('T')[0] || hoje > cal.final_calendario.split('T')[0]) {
             dataInicial = cal.inicio_calendario;
        }
        */

        calendarInstance = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            initialDate: dataInicial, // Define o mês inicial
            
            // AQUI ESTÁ A REGRA DE NEGÓCIO PRINCIPAL
            // validRange bloqueia a navegação e visualização de dias fora deste intervalo
            validRange: {
                start: cal.inicio_calendario,
                end: cal.final_calendario
            },
            
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            },
            height: '100%',
            
            // Carregamento de eventos (dias letivos)
            events: async (info, successCallback, failureCallback) => {
                try {
                    const days = await safeFetch(`${API.base}?action=list_days&cal_id=${cal._id}`);
                    const events = days.map(d => {
                        let color = '#ccc';
                        // Ajuste para bater com a legenda do HTML
                        if (d.tipo === 'Presencial') color = '#bfdbfe'; // Azul
                        if (d.tipo === 'EAD') color = '#e9d5ff';        // Roxo
                        if (d.tipo === 'Prática na Unidade') color = '#bbf7d0'; // Verde
                        if (d.tipo === 'Reposição') color = '#fef08a';  // Amarelo
                        
                        return {
                            title: d.tipo,
                            start: d.data_inicio,
                            // FullCalendar v6 aceita ISO string. Adiciona 1 dia se for range para cobrir visualmente o dia final
                            end: d.data_fim ? addDays(d.data_fim, 1) : d.data_inicio, 
                            backgroundColor: color,
                            textColor: '#333',
                            borderColor: color,
                            display: 'block' // Melhora visualização
                        };
                    });
                    successCallback(events);
                } catch(e) { 
                    console.error(e);
                    failureCallback(e); 
                }
            }
        });
        
        // Renderiza após um pequeno delay para garantir que o Modal abriu e o elemento tem tamanho
        setTimeout(() => {
            calendarInstance.render();
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