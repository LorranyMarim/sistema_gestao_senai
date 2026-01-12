(() => {
    'use strict';

    if (!window.App) throw new Error('Carregue geral_script.js antes.');

    const { $, $$ } = App.dom;
    const { safeFetch } = App.net;
    const { paginateData, bindControls, updateUI } = App.pagination;
    const fmtData = App.format.fmtDateBR;

    // Configuração da API (Assume que o PHP faz proxy para o Python ou chama direto)
    // Para simplificar, assumindo que rotas_calendario.py roda via uvicorn em porta diferente
    // OU que existe um processa_calendarios.php que age como proxy. 
    // Usaremos o padrão do arquivo ucs: apontar para o PHP que lida com a requisição.
    const API = {
        base: '../backend/processa_calendarios.php',
        bootstrap: '../backend/processa_calendarios.php?action=bootstrap'
    };

    const STATE = {
        calendarios: [],
        activeCalendars: [], // Para o select
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        filters: { q: '', status: ['Todos'] },
        editingCal: null,
        daysCache: []
    };

    const refs = {
        tableBody: $('#calTableBody'),
        // Modais
        calModal: $('#calModal'),
        diaModal: $('#diaModal'),
        viewModal: $('#viewModal'),
        manageDaysModal: $('#manageDaysModal'),
        fullCalendarModal: $('#fullCalendarModal'),
        
        // Forms
        calForm: $('#calForm'),
        diaForm: $('#diaForm'),
        
        // Inputs Calendário
        tituloCal: $('#tituloCal'),
        inicioCal: $('#inicioCal'),
        finalCal: $('#finalCal'),
        statusCal: $('#statusCal'),
        editDaysArea: $('#editDaysArea'),
        
        // Inputs Dia
        selectCalDia: $('#selectCalDia'),
        tipoDia: $('#tipoDia'),
        inicioDia: $('#inicioDia'),
        checkRange: $('#checkRange'),
        divFinalDia: $('#divFinalDia'),
        finalDia: $('#finalDia'),
        
        // View
        viewInputs: {
            titulo: $('#viewTitulo'),
            inicio: $('#viewInicio'),
            fim: $('#viewFim')
        },
        
        pagElements: {
            prev: $('#prevPage'),
            next: $('#nextPage'),
            info: $('#pageInfo')
        }
    };

    let calendarInstance = null; // FullCalendar

    // --- Inicialização ---

    async function init() {
        App.loader.show();
        try {
            await carregarDados();
            setupEvents();
            renderTable();
        } catch(e) {
            console.error(e);
            alert("Erro ao inicializar módulo.");
        } finally {
            App.loader.hide();
        }
    }

    async function carregarDados() {
    // Carrega lista principal e dados para selects
    const [listaData, bootstrapData] = await Promise.all([
        safeFetch(`${API.base}?action=list`),
        safeFetch(API.bootstrap)
    ]);

    // Proteção com Optional Chaining (?.) e fallback
    STATE.calendarios = listaData?.items || []; 
    STATE.pagination.total = listaData?.total || 0;
    
    STATE.activeCalendars = bootstrapData?.calendarios_ativos || [];
    populateCalendarSelect();
}

   function populateCalendarSelect() {
    const opts = ['<option value="">Selecione...</option>']
        .concat(STATE.activeCalendars.map(c => {
            // Proteção contra datas nulas ou indefinidas
            const inicio = (c.inicio_calendario || '').split('T')[0] || '';
            const fim = (c.final_calendario || '').split('T')[0] || '';
            
            return `<option value="${c._id}" data-min="${inicio}" data-max="${fim}">${c.titulo}</option>`;
        }));
    refs.selectCalDia.innerHTML = opts.join('');
}

    // --- Renderização ---

    function renderTable() {
        const start = (STATE.pagination.page - 1) * STATE.pagination.pageSize;
        const end = start + STATE.pagination.pageSize;
        const sliced = STATE.calendarios.slice(start, end);

        refs.tableBody.innerHTML = sliced.map(c => `
            <tr>
                <td>${c.titulo}</td>
                <td>${fmtData(c.inicio_calendario)}</td>
                <td>${fmtData(c.final_calendario)}</td>
                <td><span class="${c.status === 'Inativo' ? 'text-red-500' : 'text-green-600'} font-bold">${c.status}</span></td>
                <td>${fmtData(c.criado_em)}</td>
                <td>
                    <div class="flex gap-2 justify-center">
                        <button class="btn btn-icon btn-view" data-id="${c._id}"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-icon btn-edit" data-id="${c._id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" data-id="${c._id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        updateUI(refs.pagElements, { 
            page: STATE.pagination.page, 
            totalPages: Math.ceil(STATE.calendarios.length / STATE.pagination.pageSize),
            total: STATE.calendarios.length 
        });
    }

    // --- Lógica de Modais ---

    function openCalModal(editId = null) {
        refs.calForm.reset();
        $('#calId').value = '';
        STATE.editingCal = null;
        refs.editDaysArea.classList.add('hidden');
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
                
                refs.editDaysArea.classList.remove('hidden');
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
    
    // Cenário 1: Desabilitar campos por default ao abrir
    refs.tipoDia.disabled = true;
    refs.inicioDia.disabled = true;
    refs.checkRange.disabled = true;
    refs.checkRange.checked = false; // Resetar checkbox
    
    // Ocultar e resetar o campo final
    refs.finalDia.disabled = true; 
    refs.finalDia.value = '';
    refs.finalDia.required = false;
    App.ui.showModal(refs.diaModal);
}

    // --- Event Listeners ---

    function setupEvents() {
        // Ações da Tabela
        refs.tableBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            
            if (btn.classList.contains('btn-edit')) openCalModal(id);
            
            if (btn.classList.contains('btn-delete')) {
                if(confirm('Deseja excluir? Se houver dias letivos, será bloqueado.')) {
                    try {
                        await safeFetch(`${API.base}?action=delete&id=${id}`, { method: 'POST' }); // Usando POST para simular DELETE via PHP proxy
                        await carregarDados();
                        renderTable();
                        alert('Removido!');
                    } catch(err) { alert(err.message); }
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

        // Controle de Datas no Cadastro de Calendário
        refs.inicioCal.addEventListener('change', (e) => {
            refs.finalCal.disabled = false;
            refs.finalCal.min = e.target.value;
            if (refs.finalCal.value && refs.finalCal.value < e.target.value) {
                refs.finalCal.value = e.target.value;
            }
        });

        // Botões Topo
        $('#addCalBtn').addEventListener('click', () => openCalModal());
        $('#addDiaBtn').addEventListener('click', openDiaModal);

        // Submissão Calendário
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
                const action = id ? `update&id=${id}` : 'create';
                await safeFetch(`${API.base}?action=${action}`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                App.ui.hideModal(refs.calModal);
                await carregarDados();
                renderTable();
                alert('Salvo com sucesso!');
            } catch(err) { alert(err.message); }
        });

        // Lógica Modal Dias Letivos (Criação)
        refs.selectCalDia.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    const valor = e.target.value;

    // Cenário 3: Se selecionar "Selecione..." (valor vazio)
    if (!valor) {
        refs.tipoDia.disabled = true;
        refs.inicioDia.disabled = true;
        refs.checkRange.disabled = true;
        
        // Limpar valores para evitar inconsistência
        refs.tipoDia.value = "";
        refs.inicioDia.value = "";
        refs.checkRange.checked = false;
        refs.finalDia.disabled = true;
        refs.finalDia.value = "";
        
        return; 
    }

    // Cenário 2: Se selecionar option válida -> Habilita campos
    refs.tipoDia.disabled = false;
    refs.inicioDia.disabled = false;
    refs.checkRange.disabled = false;
    
    // Cenário 5 (Parte 1): Configurar limites baseados no calendário pai
    // Os atributos data-min e data-max já foram populados na função populateCalendarSelect
    const minDate = opt.dataset.min; // Data inicio do calendario pai
    const maxDate = opt.dataset.max; // Data fim do calendario pai

    // Aplica restrição >= inicio_calendario e <= final_calendario
    refs.inicioDia.min = minDate;
    refs.inicioDia.max = maxDate;
    
    refs.finalDia.min = minDate; // Inicialmente igual ao pai, será ajustado no change do inicioDia
    refs.finalDia.max = maxDate;
});
refs.inicioDia.addEventListener('change', (e) => {
    const dataInicial = e.target.value;
    if (dataInicial) {
        // Cenário 5: Data Final deve ser > Data inserida em inicioDia
        // Definimos o min do finalDia como a data inicial. 
        // HTML5 date input trata min como inclusive (>=), para garantir estritamente > (maior)
        // a validação final ocorre no backend ou submit, mas visualmente >= é o padrão de UX aceitável.
        refs.finalDia.min = dataInicial;
    }
});
        refs.checkRange.addEventListener('change', (e) => {
    if (e.target.checked) {
        
        refs.finalDia.disabled = false; 
        refs.finalDia.required = true;
    } else {
        refs.finalDia.disabled = true;
        refs.finalDia.value = ''; 
        refs.finalDia.required = false;
    }
});

        refs.diaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validação extra para garantir Cenário 5 (Frontend)
    if (refs.checkRange.checked) {
        if (refs.finalDia.value <= refs.inicioDia.value) {
            alert("A data final deve ser maior ou igual à data inicial.");
            return;
        }
    }

    const payload = {
        calendario_id: refs.selectCalDia.value,
        tipo: refs.tipoDia.value,
        data_inicio: new Date(refs.inicioDia.value).toISOString(),
        
        // Cenários 6 e 7: Lógica de Checkbox e Data Final
        data_final_check: refs.checkRange.checked, // Boolean true/false
        data_fim: refs.checkRange.checked ? new Date(refs.finalDia.value).toISOString() : null
    };

    try {
        await safeFetch(`${API.base}?action=create_day`, { method: 'POST', body: JSON.stringify(payload) });
        App.ui.hideModal(refs.diaModal);
        alert('Dia/Período adicionado!');
        // Opcional: Recarregar visualização se necessário
    } catch(err) { alert(err.message); }
});

        // Botão Gerenciar Dias (Dentro da Edição)
        $('#openManageDaysBtn').addEventListener('click', async () => {
            if (!STATE.editingCal) return;
            App.ui.hideModal(refs.calModal); // Troca de modal
            $('#manageDaysTitle').innerText = STATE.editingCal.titulo;
            App.ui.showModal(refs.manageDaysModal);
            loadDaysTable(STATE.editingCal._id);
        });

        // Botão FullCalendar
        $('#openFullCalendarBtn').addEventListener('click', () => {
             App.ui.hideModal(refs.viewModal);
             initFullCalendar(STATE.editingCal);
             App.ui.showModal(refs.fullCalendarModal);
        });

        // Fechar modais
        $$('.close-button').forEach(btn => btn.onclick = () => {
            App.ui.hideModal(btn.closest('.modal'));
        });
        $('#cancelCalBtn').onclick = () => App.ui.hideModal(refs.calModal);
        $('#cancelDiaBtn').onclick = () => App.ui.hideModal(refs.diaModal);
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
            
            // Hack global para o onclick inline acima (simples e funcional)
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
        el.innerHTML = '';
        
        calendarInstance = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
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
            events: async (info, successCallback, failureCallback) => {
                try {
                    const days = await safeFetch(`${API.base}?action=list_days&cal_id=${cal._id}`);
                    const events = days.map(d => {
                        let color = '#ccc';
                        if (d.tipo === 'Presencial') color = '#bfdbfe'; // Azul
                        if (d.tipo === 'EAD') color = '#e9d5ff'; // Lilas
                        if (d.tipo === 'Prática na Unidade') color = '#bbf7d0'; // Verde
                        if (d.tipo === 'Reposição') color = '#fef08a'; // Amarelo
                        
                        return {
                            title: d.tipo,
                            start: d.data_inicio,
                            end: d.data_fim ? new Date(new Date(d.data_fim).getTime() + 86400000).toISOString() : d.data_inicio, // FullCalendar exclusive end fix
                            backgroundColor: color,
                            textColor: '#333',
                            borderColor: color
                        };
                    });
                    successCallback(events);
                } catch(e) { failureCallback(e); }
            }
        });
        
        // Timeout para renderizar corretamente após modal abrir
        setTimeout(() => calendarInstance.render(), 200);
    }

    document.addEventListener('DOMContentLoaded', init);
})();