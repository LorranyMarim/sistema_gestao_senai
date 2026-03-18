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
        busyRanges: [], 
        currentStepCal: 0 
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
        },
        
        stepsCal: $$('#calForm .form-step'),
        stepIndicatorsCal: $$('#calModal .step-item'),
        btnCancelCal: $('#btnCancelCal'),
        btnPrevCal: $('#btnPrevCal'),
        btnNextCal: $('#btnNextCal'),
        btnSubmitCal: $('#btnSubmit')
    };

    let calendarInstance = null;
    
    function getLocalDateString(isoStr) {
        if (!isoStr) return '';
        if (isoStr.includes('T')) {
            return isoStr.split('T')[0];
        }
        return isoStr;
    }

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
            refs.divFinalDia?.appendChild(err);
        }
        err.style.display = show ? 'block' : 'none';
    }

    function toggleErrorCalFinal(show) {
        if(!refs.finalCal) return;
        const divFim = refs.finalCal.closest('.form-group');
        let err = document.getElementById('msg-erro-cal-final');
        if (!err) {
            err = document.createElement('span');
            err.id = 'msg-erro-cal-final';
            err.className = 'text-red-500 text-xs mt-1 font-bold block';
            err.innerText = 'A data final não pode ser anterior à data inicial.';
            divFim.appendChild(err);
        }
        err.style.display = show ? 'block' : 'none';
        
        if (show) refs.finalCal.classList.add('border-red-500');
        else refs.finalCal.classList.remove('border-red-500');
    }

    function isDateBusy(dateStr, ignoreId) {
        if (!dateStr || !STATE.busyRanges.length) return false;
        return STATE.busyRanges.some(range => {
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
            if(refs.tableBody) refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
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
        if(!refs.tableBody) return;
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
    function openDiaModalEdit(eventObj) {
        const props = eventObj.extendedProps;
        
        $('#diaId').value = eventObj.id; 
        
        refs.selectCalDia.value = STATE.editingCal._id; 
        refs.selectCalDia.dispatchEvent(new Event('change')); 
        
        refs.tipoDia.value = props.tipo || eventObj.title; 
        const startStr = eventObj.startStr.split('T')[0];
        refs.inicioDia.value = startStr;
        
        if (props.isRange || (props.data_fim && props.data_fim.split('T')[0] !== startStr)) {
            refs.checkRange.checked = true;
            refs.finalDia.disabled = false;
            refs.finalDia.value = props.data_fim.split('T')[0];
        } else {
            refs.checkRange.checked = false;
            refs.finalDia.disabled = true;
            refs.finalDia.value = '';
        }

        refs.tipoDia.disabled = false;
        refs.inicioDia.disabled = false;
        refs.checkRange.disabled = false;

        const titleEl = document.getElementById('modalTitleDia');
        if(titleEl) titleEl.innerText = "Editar Dias/Período Letivo"; 
        
        const btnDel = document.getElementById('btnDeleteDia');
        if(btnDel) btnDel.classList.remove('hidden'); 
        
        toggleErrorFinalDia(false);
        App.ui.showModal(refs.diaModal);
    }

    function openDiaModal() {
        refs.diaForm.reset();
        $('#diaId').value = ''; 
        
        refs.tipoDia.disabled = true;
        refs.inicioDia.disabled = true;
        refs.checkRange.disabled = true;
        refs.checkRange.checked = false;
        refs.finalDia.disabled = true; 
        refs.finalDia.value = '';
        refs.finalDia.required = false;
        
        const titleEl = document.getElementById('modalTitleDia');
        if(titleEl) titleEl.innerText = "Criar Dia/Período Letivo";
        
        const btnDel = document.getElementById('btnDeleteDia');
        if(btnDel) btnDel.classList.add('hidden'); 
        
        toggleErrorFinalDia(false);
        STATE.busyRanges = []; 
        App.ui.showModal(refs.diaModal);
    }

    function openCalModal(editId = null) {
        STATE.currentStepCal = 0;
        updateWizardCalUI();
        
        refs.calForm.reset();
        $('#calId').value = '';
        STATE.editingCal = null;
        toggleErrorCalFinal(false); 

        if (editId) {
            const cal = STATE.calendarios.find(c => c._id === editId);
            if (cal) {
                STATE.editingCal = cal;
                $('#calId').value = cal._id;
                refs.tituloCal.value = cal.titulo;
                
                refs.inicioCal.value = getLocalDateString(cal.inicio_calendario);
                refs.finalCal.value = getLocalDateString(cal.final_calendario);

                refs.finalCal.disabled = false;
                refs.finalCal.min = refs.inicioCal.value;
                
                refs.statusCal.value = cal.status;
                refs.statusCal.disabled = false;
                
                const titleEl = document.getElementById('modalTitleCal');
                if(titleEl) titleEl.innerText = "Editar Calendário";
            }
        } else {
            const titleEl = document.getElementById('modalTitleCal');
            if(titleEl) titleEl.innerText = "Adicionar Novo Calendário";
            if(refs.statusCal) refs.statusCal.value = "Ativo";
        }
        App.ui.showModal(refs.calModal);
    }

    // --- LÓGICA DO WIZARD DE CALENDÁRIO ---
    function updateWizardCalUI() {
        if(!refs.btnCancelCal || !refs.stepsCal.length) return;

        refs.stepIndicatorsCal.forEach((el, idx) => el.classList.toggle('active', idx <= STATE.currentStepCal));
        refs.stepsCal.forEach((el, idx) => el.classList.toggle('active', idx === STATE.currentStepCal));

        if (STATE.currentStepCal === 0) {
            refs.btnCancelCal.style.display = 'inline-block';
            refs.btnCancelCal.disabled = false;
            refs.btnPrevCal.style.display = 'none';
            
            refs.btnNextCal.style.display = 'inline-block';
            refs.btnSubmitCal.style.display = 'none';
        } else if (STATE.currentStepCal > 0 && STATE.currentStepCal < refs.stepsCal.length - 1) {
            refs.btnCancelCal.style.display = 'none';
            refs.btnPrevCal.style.display = 'inline-block';
            refs.btnPrevCal.disabled = false;
            
            refs.btnNextCal.style.display = 'inline-block';
            refs.btnSubmitCal.style.display = 'none';
        } else if (STATE.currentStepCal === refs.stepsCal.length - 1) {
            refs.btnCancelCal.style.display = 'none';
            refs.btnPrevCal.style.display = 'inline-block';
            refs.btnPrevCal.disabled = false;
            
            refs.btnNextCal.style.display = 'none';
            refs.btnSubmitCal.style.display = 'inline-block';
            gerarResumoFinalCal();
        }
    }

    function gerarResumoFinalCal() {
        let resumoDiv = document.getElementById('boxResumoFinal');
        if (!resumoDiv) {
            resumoDiv = document.createElement('div');
            resumoDiv.id = 'boxResumoFinal';
            resumoDiv.className = 'bg-blue-50 border border-blue-200 p-4 rounded text-sm text-gray-700 mt-4 mb-4';
            const step6 = document.getElementById('step-cal-6'); 
            if(step6) step6.insertBefore(resumoDiv, step6.querySelector('h5').nextSibling);
        }

        const titulo = refs.tituloCal?.value || '[Sem título]';
        const inicio = refs.inicioCal?.value ? refs.inicioCal.value.split('-').reverse().join('/') : '';
        const fim = refs.finalCal?.value ? refs.finalCal.value.split('-').reverse().join('/') : '';
        
        const isPresencialOff = document.getElementById('switchPresencial')?.checked;
        const diasP = Array.from(document.querySelectorAll('#gridPresencial input:checked')).map(i => i.value);
        const txtPresencial = isPresencialOff ? 'Nenhuma' : (diasP.length ? diasP.join(', ') : 'Não selecionado');

        const isEadOff = document.getElementById('switchEad')?.checked;
        const diasE = Array.from(document.querySelectorAll('#gridEad input:checked')).map(i => i.value);
        const txtEad = isEadOff ? 'Nenhuma' : (diasE.length ? diasE.join(', ') : 'Não selecionado');

        const qtdFeriados = document.querySelectorAll('#listaFeriadosAdicionados li').length;
        const qtdPraticas = document.querySelectorAll('#listaPraticasAdicionadas li').length;

        resumoDiv.innerHTML = `
            <h6 class="font-bold text-blue-800 mb-2"><i class="fas fa-clipboard-check"></i> Resumo do Calendário</h6>
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>Título:</strong> ${titulo}</li>
                <li><strong>Período:</strong> ${inicio} a ${fim}</li>
                <li><strong>Presencial:</strong> ${txtPresencial}</li>
                <li><strong>EAD:</strong> ${txtEad}</li>
                <li><strong>Feriados Customizados:</strong> ${qtdFeriados} adicionado(s)</li>
                <li><strong>Aulas Práticas:</strong> ${qtdPraticas} adicionada(s)</li>
            </ul>
            <p class="mt-3 text-xs text-blue-600 font-bold">Verifique os dados acima. Ao clicar em "Gerar Calendário", o sistema processará essas regras.</p>
        `;
    }

    function validateCurrentStepCal() {
        const currentStepEl = refs.stepsCal[STATE.currentStepCal];
        if(!currentStepEl) return false;
        
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

        if (STATE.currentStepCal === 1) {
            const switchPresencial = document.getElementById('switchPresencial');
            const diasPresenciais = document.querySelectorAll('#gridPresencial input[type="checkbox"]:checked');
            if (switchPresencial && !switchPresencial.checked && diasPresenciais.length === 0) {
                alert('Por favor, selecione ao menos um dia de aula presencial ou marque a opção "Não há aulas presenciais".');
                valid = false;
            }
        }

        if (STATE.currentStepCal === 2) {
            const switchEad = document.getElementById('switchEad');
            const diasEad = document.querySelectorAll('#gridEad input[type="checkbox"]:checked');
            if (switchEad && !switchEad.checked && diasEad.length === 0) {
                alert('Por favor, selecione ao menos um dia de aula EAD ou marque a opção "Não há aulas EAD".');
                valid = false;
            }
        }

        return valid;
    }

    function nextStepCal() {
        if (STATE.currentStepCal < refs.stepsCal.length - 1) {
            if (validateCurrentStepCal()) {
                STATE.currentStepCal++;
                updateWizardCalUI();
            }
        }
    }

    function prevStepCal() {
        if (STATE.currentStepCal > 0) {
            STATE.currentStepCal--;
            updateWizardCalUI();
        }
    }

   function setupEvents() {
        bindControls(refs.pagElements, (action) => {
            if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
            if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
            renderizarConteudo();
        });

        refs.tableBody?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            
            if (btn.classList.contains('btn-edit')) {
                STATE.tempEditId = id; 
                App.ui.showModal(document.getElementById('decisionModal'));
            }
            
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
                    
                    const stInput = document.getElementById('viewStatus');
                    if(stInput) stInput.value = cal.status || '';
                    
                    App.ui.showModal(refs.viewModal);
                }
            }
        }); 

        refs.btnNextCal?.addEventListener('click', (e) => {
            e.preventDefault();
            nextStepCal();
        });

        refs.btnPrevCal?.addEventListener('click', (e) => {
            e.preventDefault();
            prevStepCal();
        });

        refs.btnCancelCal?.addEventListener('click', () => {
            App.ui.hideModal(refs.calModal);
        });

        const setupSwitch = (switchId, gridId) => {
            const sw = $(switchId);
            const grid = $(gridId);
            if(sw && grid) {
                sw.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    const chks = grid.querySelectorAll('input[type="checkbox"]');
                    chks.forEach(chk => {
                        chk.checked = false;
                        chk.disabled = isChecked;
                        chk.readOnly = isChecked;
                    });
                });
            }
        };
        setupSwitch('#switchPresencial', '#gridPresencial');
        setupSwitch('#switchEad', '#gridEad');

        const syncPresencialEad = () => {
            const chksPresencial = document.querySelectorAll('#gridPresencial input[type="checkbox"]');
            const chksEad = document.querySelectorAll('#gridEad input[type="checkbox"]');
            const eadSwitch = document.getElementById('switchEad');
            const isEadSwitchOff = eadSwitch ? eadSwitch.checked : false;

            chksPresencial.forEach((chkP) => {
                const chkE = Array.from(chksEad).find(c => c.value === chkP.value);
                if (chkE) {
                    if (chkP.checked) {
                        chkE.checked = false;
                        chkE.disabled = true;
                        chkE.parentElement.title = "Já selecionado como aula presencial";
                        chkE.parentElement.classList.add('opacity-50', 'cursor-not-allowed');
                    } else {
                        chkE.disabled = isEadSwitchOff;
                        chkE.parentElement.title = "";
                        chkE.parentElement.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }
            });
        };

        document.querySelectorAll('#gridPresencial input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', syncPresencialEad);
        });

        document.getElementById('switchPresencial')?.addEventListener('change', () => setTimeout(syncPresencialEad, 50));
        document.getElementById('switchEad')?.addEventListener('change', () => setTimeout(syncPresencialEad, 50));
        
        const setupRadios = (name, containerId) => {
            const radios = document.querySelectorAll(`input[name="${name}"]`);
            const container = $(containerId);
            if(radios.length && container) {
                radios.forEach(r => {
                    r.addEventListener('change', (e) => {
                        if(e.target.value === 'sim') container.classList.remove('hidden');
                        else container.classList.add('hidden');
                    });
                });
            }
        };

        setupRadios('hasPratica', '#containerPratica');

        const bindDynamicRows = (containerId, rowClass, btnAddClass, btnRemoveClass) => {
            const container = $(containerId);
            if(!container) return;
            container.addEventListener('click', (e) => {
                const btnAdd = e.target.closest(btnAddClass);
                const btnRemove = e.target.closest(btnRemoveClass);
                
                if (btnAdd) {
                    const row = btnAdd.closest(rowClass);
                    const clone = row.cloneNode(true);
                    if (clone.querySelector('input[type="date"]')) clone.querySelector('input[type="date"]').value = '';
                    if (clone.querySelector('input[type="text"]')) clone.querySelector('input[type="text"]').value = '';
                    
                    clone.querySelector(btnAddClass)?.classList.add('hidden');
                    clone.querySelector(btnRemoveClass)?.classList.remove('hidden');
                    
                    container.appendChild(clone);
                }
                if (btnRemove) {
                    btnRemove.closest(rowClass).remove();
                }
            });
        };
        
        const radioNaoFeriado = document.querySelector('input[name="considerarFeriados"][value="nao"]');
        if (radioNaoFeriado && radioNaoFeriado.nextElementSibling) {
            radioNaoFeriado.nextElementSibling.innerText = "Feriados Nacionais/Estaduais e Municipais não terão aulas (Dias não letivos)";
        }
        
        const radioSimFeriado = document.querySelector('input[name="considerarFeriados"][value="sim"]');
        if (radioSimFeriado && radioSimFeriado.nextElementSibling) {
            radioSimFeriado.nextElementSibling.innerText = "Feriados Nacionais/Estaduais e Municipais terão aulas (Dias letivos normais)";
        }

        const containerFeriados = $('#containerFeriadosMunicipais');
        if (containerFeriados) {
            const ulFeriados = document.createElement('ul');
            ulFeriados.id = 'listaFeriadosAdicionados';
            ulFeriados.className = 'mt-3 space-y-2 pl-1 text-sm text-gray-700';
            containerFeriados.parentNode.insertBefore(ulFeriados, containerFeriados.nextSibling);

            containerFeriados.addEventListener('click', (e) => {
                const btnAdd = e.target.closest('.btn-add-feriado');
                
                if (btnAdd) {
                    const row = btnAdd.closest('.feriado-row');
                    const dateInput = row.querySelector('input[type="date"]');
                    const textInput = row.querySelector('input[type="text"]');
                    
                    if (!dateInput.value || !textInput.value.trim()) {
                        alert('Por favor, preencha a data e a descrição do recesso escolar.');
                        return;
                    }

                    const dateObj = new Date(dateInput.value + 'T00:00:00');
                    const dayOfWeek = dateObj.getDay();
                    const mapDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                    const dayName = mapDays[dayOfWeek];

                    const isPresencialOff = document.getElementById('switchPresencial')?.checked;
                    const isEadOff = document.getElementById('switchEad')?.checked;
                    const diasP = Array.from(document.querySelectorAll('#gridPresencial input:checked')).map(i => i.value);
                    const diasE = Array.from(document.querySelectorAll('#gridEad input:checked')).map(i => i.value);

                    const mapRecessos = Array.from(document.querySelectorAll('#listaFeriadosAdicionados li')).map(li => li.dataset.date);

                    let tipoExistente = "";
                    
                    if (mapRecessos.includes(dateInput.value)) {
                        alert('Esta data já foi adicionada como recesso escolar.');
                        return;
                    } else if (!isPresencialOff && diasP.includes(dayName)) {
                        tipoExistente = "Dia Letivo Presencial";
                    } else if (!isEadOff && diasE.includes(dayName)) {
                        tipoExistente = "Dia Letivo EAD";
                    }

                    if (tipoExistente !== "") {
                        if (!confirm(`A data especificada (${dateInput.value.split('-').reverse().join('/')}) já está marcada como ${tipoExistente} e agora será convertida em um recesso escolar (dia não letivo). Deseja mesmo realizar a alteração?`)) {
                            return; 
                        }
                    }

                    const dataPartes = dateInput.value.split('-');
                    const dataFormatada = `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}`;

                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center bg-red-50 p-2 rounded border border-red-200';
                    li.dataset.date = dateInput.value;
                    li.dataset.desc = textInput.value;
                    li.innerHTML = `
                        <span><i class="fas fa-ban text-red-600 mr-2"></i> <strong>${dataFormatada}</strong> - ${textInput.value}</span>
                        <button type="button" class="text-red-500 hover:text-red-700 font-bold ml-3 text-xs" onclick="this.parentElement.remove()">[x] Remover</button>
                    `;
                    
                    ulFeriados.appendChild(li);
                    dateInput.value = '';
                    textInput.value = '';
                }
            });
        }

        const containerPratica = $('#containerPratica');
        if (containerPratica) {
            const ulPraticas = document.createElement('ul');
            ulPraticas.id = 'listaPraticasAdicionadas';
            ulPraticas.className = 'mt-3 space-y-2 pl-1 text-sm text-gray-700';
            containerPratica.parentNode.insertBefore(ulPraticas, containerPratica.nextSibling);

            containerPratica.addEventListener('click', (e) => {
                const btnAdd = e.target.closest('.btn-add-pratica');
                
                if (btnAdd) {
                    const row = btnAdd.closest('.pratica-row');
                    const dateInput = row.querySelector('input[type="date"]');
                    const textInput = row.querySelector('input[type="text"]');
                    
                    if (!dateInput.value || !textInput.value.trim()) {
                        alert('Por favor, preencha a data e a descrição da aula prática.');
                        return;
                    }

                    const dateObj = new Date(dateInput.value + 'T00:00:00');
                    const dayOfWeek = dateObj.getDay();
                    const mapDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                    const dayName = mapDays[dayOfWeek];

                    const isPresencialOff = document.getElementById('switchPresencial')?.checked;
                    const isEadOff = document.getElementById('switchEad')?.checked;
                    const diasP = Array.from(document.querySelectorAll('#gridPresencial input:checked')).map(i => i.value);
                    const diasE = Array.from(document.querySelectorAll('#gridEad input:checked')).map(i => i.value);

                    const mapRecessos = Array.from(document.querySelectorAll('#listaFeriadosAdicionados li')).map(li => li.dataset.date);
                    const mapPraticas = Array.from(document.querySelectorAll('#listaPraticasAdicionadas li')).map(li => li.dataset.date);

                    let tipoExistente = "";
                    
                    if (mapPraticas.includes(dateInput.value)) {
                         alert('Esta data já foi adicionada como aula prática.');
                         return;
                    } else if (mapRecessos.includes(dateInput.value)) {
                        tipoExistente = "Recesso Escolar/Feriado (Não Letivo)";
                    } else if (!isPresencialOff && diasP.includes(dayName)) {
                        tipoExistente = "Dia Letivo Presencial";
                    } else if (!isEadOff && diasE.includes(dayName)) {
                        tipoExistente = "Dia Letivo EAD";
                    }

                    if (tipoExistente !== "") {
                        if (!confirm(`A data especificada (${dateInput.value.split('-').reverse().join('/')}) já está marcada como ${tipoExistente}. Ela será substituída por um dia letivo do tipo Prática. Deseja mesmo realizar a alteração?`)) {
                            return;
                        }
                    }

                    const dataPartes = dateInput.value.split('-');
                    const dataFormatada = `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}`;

                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center bg-green-50 p-2 rounded border border-green-200';
                    li.dataset.date = dateInput.value;
                    li.dataset.desc = textInput.value;
                    li.innerHTML = `
                        <span><i class="fas fa-chalkboard-teacher text-green-600 mr-2"></i> <strong>${dataFormatada}</strong> - ${textInput.value}</span>
                        <button type="button" class="text-red-500 hover:text-red-700 font-bold ml-3 text-xs" onclick="this.parentElement.remove()">[x] Remover</button>
                    `;
                    
                    ulPraticas.appendChild(li);
                    dateInput.value = '';
                    textInput.value = '';
                }
            });
        }

        const btnDecisaoDados = document.getElementById('btnDecisaoDados');
        if (btnDecisaoDados) {
            btnDecisaoDados.onclick = () => {
                App.ui.hideModal(document.getElementById('decisionModal'));
                
                const cal = STATE.calendarios.find(c => c._id === STATE.tempEditId);
                if (cal) {
                    $('#editBasicId').value = cal._id;
                    $('#editBasicTitulo').value = cal.titulo;
                    $('#editBasicInicio').value = App.format.fmtDateBR(cal.inicio_calendario);
                    $('#editBasicFim').value = App.format.fmtDateBR(cal.final_calendario);
                    $('#editBasicStatus').value = cal.status;
                    
                    App.ui.showModal(document.getElementById('editBasicModal'));
                }
            };
        }

        const editBasicForm = document.getElementById('editBasicForm');
        if (editBasicForm) {
            editBasicForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btnSave = document.getElementById('btnSaveBasicEdit');
                const id = $('#editBasicId').value;
                const txtOriginal = btnSave.innerHTML;
                
                btnSave.disabled = true;
                btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

                const payload = {
                    titulo: $('#editBasicTitulo').value.toUpperCase(),
                    status: $('#editBasicStatus').value
                };

                try {
                    App.loader.show();
                    await safeFetch(`${API.base}?action=update&id=${id}`, {
                        method: 'POST', body: JSON.stringify(payload)
                    });
                    App.ui.hideModal(document.getElementById('editBasicModal'));
                    await carregarDados();
                    alert('Dados básicos atualizados com sucesso!');
                } catch(err) { 
                    alert(err.message); 
                } finally { 
                    App.loader.hide(); 
                    btnSave.disabled = false;
                    btnSave.innerHTML = txtOriginal;
                }
            });
        }

        const btnDecisaoDias = document.getElementById('btnDecisaoDias');
        if (btnDecisaoDias) {
            btnDecisaoDias.onclick = () => {
                App.ui.hideModal(document.getElementById('decisionModal'));
                const cal = STATE.calendarios.find(c => c._id === STATE.tempEditId);
                if(cal) {
                    STATE.editingCal = cal;
                    initFullCalendar(cal, true); 
                    App.ui.showModal(refs.fullCalendarModal);
                }
            };
        }

        $$('.close-button').forEach(btn => {
            btn.onclick = () => App.ui.hideModal(btn.closest('.modal'));
        });
        
        const btnCloseTop = $('#closeFullCalendarBtn');
        if (btnCloseTop) btnCloseTop.onclick = () => App.ui.hideModal(refs.fullCalendarModal);

        const btnCloseFooter = $('#btnCloseFullCal');
        if (btnCloseFooter) btnCloseFooter.onclick = () => App.ui.hideModal(refs.fullCalendarModal);

        const cancelDiaBtn = $('#cancelDiaBtn');
        if(cancelDiaBtn) cancelDiaBtn.onclick = () => App.ui.hideModal(refs.diaModal);
        
        const closeViewBtn = $('#closeViewBtn');
        if(closeViewBtn) closeViewBtn.onclick = () => App.ui.hideModal(refs.viewModal);

        $('#addCalBtn')?.addEventListener('click', () => openCalModal());
        
        refs.tituloCal?.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        refs.inicioCal?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                refs.finalCal.disabled = false;
                refs.finalCal.min = val;
                if (refs.finalCal.value && refs.finalCal.value < val) {
                    refs.finalCal.value = ''; 
                    toggleErrorCalFinal(true); 
                } else {
                    toggleErrorCalFinal(false);
                }
            } else {
                refs.finalCal.disabled = true;
                refs.finalCal.value = '';
                toggleErrorCalFinal(false);
            }
        });

        refs.finalCal?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val && refs.inicioCal.value && val < refs.inicioCal.value) {
                e.target.value = ''; 
                toggleErrorCalFinal(true); 
            } else {
                toggleErrorCalFinal(false); 
            }
        });

        refs.calForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = document.getElementById('btnSubmit');
            const txtOriginal = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

            const id = $('#calId').value;
            const switchPresencial = document.getElementById('switchPresencial')?.checked;
            const diasPresenciais = Array.from(document.querySelectorAll('#gridPresencial input:checked')).map(i => i.value);

            const switchEad = document.getElementById('switchEad')?.checked;
            const diasEad = Array.from(document.querySelectorAll('#gridEad input:checked')).map(i => i.value);
            const btnFeriados = document.querySelector('input[name="considerarFeriados"]:checked');
            const considerarFeriadosLetivos = btnFeriados ? btnFeriados.value === 'sim' : false;
            
            const recessos = [];
            document.querySelectorAll('#listaFeriadosAdicionados li').forEach(li => {
                recessos.push({
                    data: li.dataset.date,
                    descricao: li.dataset.desc
                });
            });

            const praticas = [];
            document.querySelectorAll('#listaPraticasAdicionadas li').forEach(li => {
                praticas.push({
                    data: li.dataset.date,
                    descricao: li.dataset.desc
                });
            });

            const payload = {
                titulo: refs.tituloCal.value,
                inicio_calendario: new Date(refs.inicioCal.value + 'T00:00:00').toISOString(),
                final_calendario: new Date(refs.finalCal.value + 'T00:00:00').toISOString(),
                status: refs.statusCal.value,
                is_presencial_off: switchPresencial,
                dias_presenciais: diasPresenciais,
                is_ead_off: switchEad,
                dias_ead: diasEad,
                considerar_feriados_letivos: considerarFeriadosLetivos,
                recessos: recessos,
                praticas: praticas
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
            } catch(err) { 
                alert(err.message); 
            } finally { 
                App.loader.hide(); 
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = txtOriginal;
            }
        });

        $('#addDiaBtn')?.addEventListener('click', openDiaModal);

        refs.selectCalDia?.addEventListener('change', async (e) => {
            const valor = e.target.value;
            const opt = e.target.selectedOptions[0];

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
            
            const minDate = opt.dataset.min;
            const maxDate = opt.dataset.max;

            refs.inicioDia.min = minDate;
            refs.inicioDia.max = maxDate;
            refs.finalDia.min = minDate;
            refs.finalDia.max = maxDate;

            try {
                const days = await safeFetch(`${API.base}?action=list_days&cal_id=${valor}`);
                STATE.busyRanges = days.map(d => ({
                    start: d.data_inicio.split('T')[0],
                    end: (d.data_fim || d.data_inicio).split('T')[0],
                    id: d._id 
                }));
            } catch(e) { console.error("Erro ao buscar dias ocupados", e); }
        });

        refs.checkRange?.addEventListener('change', (e) => {
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

        refs.inicioDia?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
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

        refs.finalDia?.addEventListener('change', (e) => {
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

        const checkFinalDiaAccess = (e) => {
            if (refs.checkRange.checked && !refs.inicioDia.value) {
                e.preventDefault();
                refs.finalDia.blur(); 
                toggleErrorFinalDia(true);
            }
        };
        refs.finalDia?.addEventListener('click', checkFinalDiaAccess);
        refs.finalDia?.addEventListener('focus', checkFinalDiaAccess);

        refs.diaForm?.addEventListener('submit', async (e) => {
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
                    await safeFetch(`${API.base}?action=update_day&id=${diaId}`, { 
                        method: 'POST', body: JSON.stringify(payload) 
                    });
                    alert('Dia letivo atualizado!');
                } else {
                    await safeFetch(`${API.base}?action=create_day`, { 
                        method: 'POST', body: JSON.stringify(payload) 
                    });
                    alert('Dia/Período adicionado!');
                }

                App.ui.hideModal(refs.diaModal);
                
                if(STATE.editingCal) {
                     initFullCalendar(STATE.editingCal, true); 
                }
            } catch(err) { alert(err.message); } finally { App.loader.hide(); }
        });

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

        $('#openFullCalendarBtn')?.addEventListener('click', () => {
             App.ui.hideModal(refs.viewModal);
             if (STATE.editingCal) {
                 initFullCalendar(STATE.editingCal, false);
                 App.ui.showModal(refs.fullCalendarModal);
             }
        });
    } 
    // FINAL DA FUNÇÃO SETUPEVENTS ====================================

    function initFullCalendar(cal, isInteractive = false) {
        const el = document.getElementById('calendarEl');
        if (!el) return;
        el.innerHTML = ''; 
        
        const hoje = new Date().toISOString().split('T')[0];
        let dataInicial = hoje;

        if (hoje < cal.inicio_calendario.split('T')[0] || hoje > cal.final_calendario.split('T')[0]) {
             dataInicial = cal.inicio_calendario;
        }

        calendarInstance = new FullCalendar.Calendar(el, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            initialDate: dataInicial,
            validRange: {
                start: cal.inicio_calendario,
                end: addDays(cal.final_calendario, 1) 
            },
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            height: '100%',
            eventClick: function(info) {
                if (isInteractive) openDiaModalEdit(info.event);
            },
            eventMouseEnter: isInteractive ? (info) => info.el.style.cursor = 'pointer' : null,
            
            events: function(info, successCallback, failureCallback) {
                try {
                    const eventsArray = [];
                    
                    if (cal.estrutura_dias && Array.isArray(cal.estrutura_dias)) {
                        cal.estrutura_dias.forEach(d => {
                            let color = '';
                            let title = '';
                            let textColor = '#1f2937'; 
                            
                            const dataFormatada = typeof d.data === 'string' && d.data.includes('T') 
                                ? d.data.split('T')[0] 
                                : d.data;

                            if (d.status === 'LETIVO') {
                                if (d.modalidade === 'Presencial') {
                                    color = 'rgb(191, 219, 254)';
                                    title = 'Presencial';
                                } else if (d.modalidade === 'EAD') {
                                    color = 'rgb(233, 213, 255)';
                                    title = 'EAD';
                                } else if (d.modalidade === 'Prática (Senai/Empresa)' || d.modalidade === 'Prática') {
                                    color = 'rgb(187, 247, 208)';
                                    title = 'Prática - Unidade/Empresa';
                                } else {
                                    color = '#fef08a'; 
                                    title = d.modalidade || 'Letivo';
                                }
                            } else if (d.status === 'NÃO LETIVO' && d.descricao) {
                                color = 'rgb(254, 202, 202)';
                                title = d.descricao;
                            } else {
                                return;
                            }

                            eventsArray.push({
                                id: dataFormatada,
                                title: title,
                                start: dataFormatada,
                                allDay: true,
                                backgroundColor: color,
                                borderColor: color,
                                textColor: textColor,
                                extendedProps: { 
                                    tipo: d.modalidade || 'Feriado/Recesso',
                                    descricao: d.descricao,
                                    status: d.status
                                }
                            });
                        });
                    }
                    successCallback(eventsArray);
                } catch(e) { 
                    failureCallback(e); 
                }
            }
        });
        
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