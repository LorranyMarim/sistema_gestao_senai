/* eslint-disable no-console */
(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral.js antes de gestao_unidades_curriculares.js.');
  
  // Imports centralizados
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination; // Import da paginação

  // ===================== Config & State =====================
  const API = Object.freeze({
    bootstrap: '../backend/processa_unidade_curricular.php?action=bootstrap',
    uc: '../backend/processa_unidade_curricular.php',
  });

  const STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', instituicoes: [], status: [], created_from: '', created_to: '' },
  };

  // ===================== DOM refs =====================
  const ucModal = $('#ucModal');
  const addUcBtn = $('#addUcBtn');
  const closeModalBtn = $('#closeModalBtn');
  const cancelBtn = $('#cancelBtn');
  const ucForm = $('#ucForm');
  const modalTitleUc = $('#modalTitleUc');
  const ucIdInput = $('#ucId');
  const descricaoUcInput = $('#descricaoUc');
  const salaIdealInput = $('#salaIdeal');
  const selectInstituicao = $('#instituicaoUc');
  const statusUc = $('#statusUc');
  const alertUc = $('#alertUc');

  // Modal Visualizar
  const visualizarUcModal = $('#visualizarUcModal');
  const closeVisualizarUcBtn = $('#closeVisualizarUcBtn');
  const fecharVisualizarUcBtn = $('#fecharVisualizarUcBtn');
  const viewInstituicaoUc = $('#viewInstituicaoUc');
  const viewDescricaoUc = $('#viewDescricaoUc');
  const viewSalaIdealUc = $('#viewSalaIdealUc');
  const viewStatusUc = $('#viewStatusUc');

  // Tabela / busca
  const ucTableBody = $('#ucTableBody');
  const searchInput = $('#searchUc');

  // Filtros UI
  const filterInstituicao = $('#filterInstituicao');
  const filterStatus = $('#filterStatus');
  const filterCriadoDe = $('#filterCriadoDe');
  const filterCriadoAte = $('#filterCriadoAte');
  
  // Elementos de Paginação (Agrupados)
  const pagElements = {
    prev: $('#prevPage'),
    next: $('#nextPage'),
    info: $('#pageInfo'),
    sizeSel: $('#pageSize')
  };

  // ===================== Utils de data =====================
  function fmtDateBR(isoLike) {
    if (!isoLike) return '—';
    const dt = new Date(isoLike);
    if (isNaN(dt)) return '—';
    return dt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } 

  async function preencherSelectInstituicao(selectedId = '') {
    const insts = STATE.instituicoes;
    const opts = ['<option value="">Selecione a instituição</option>']
        .concat(insts.map(i =>
            `<option value="${i._id}" ${i._id === selectedId ? 'selected' : ''}>${i.razao_social ?? i.nome ?? '(sem nome)'}</option>`
        ));
    selectInstituicao.innerHTML = opts.join('');
  }

  // ===================== Modais UC =====================
  function openModalUC(edit = false, uc = {}) {
    preencherSelectInstituicao(edit ? uc.instituicao_id : '');
    ucModal.classList.add('show');
    ucIdInput.value = edit ? uc._id : '';
    descricaoUcInput.value = edit ? (uc.descricao ?? '') : '';
    salaIdealInput.value = edit ? (uc.sala_ideal ?? '') : '';
    statusUc.value = edit ? (uc.status ?? 'Ativa') : 'Ativa';
    modalTitleUc.textContent = edit ? 'Editar Unidade Curricular' : 'Adicionar Nova Unidade Curricular';
    STATE.ucEditId = edit ? uc._id : null;
    clearAlert();
  }

  function closeModalUC() {
    ucModal.classList.remove('show');
    ucForm.reset();
    STATE.ucEditId = null;
    clearAlert();
  }

  function openVisualizarUcModal(uc) {
    const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
    viewInstituicaoUc.value = inst ? (inst.razao_social ?? inst.nome ?? '') : '';
    viewDescricaoUc.value = uc.descricao ?? '';
    viewSalaIdealUc.value = uc.sala_ideal ?? '';
    viewStatusUc.value = uc.status ?? 'Ativa';
    visualizarUcModal.classList.add('show');
  }

  function closeVisualizarUcModal() { visualizarUcModal.classList.remove('show'); }

  function wireModalEvents() {
    addUcBtn?.addEventListener('click', () => openModalUC());
    closeModalBtn?.addEventListener('click', closeModalUC);
    cancelBtn?.addEventListener('click', closeModalUC);
    closeVisualizarUcBtn?.addEventListener('click', closeVisualizarUcModal);
    fecharVisualizarUcBtn?.addEventListener('click', closeVisualizarUcModal);
    window.addEventListener('click', (e) => {
      if (e.target === ucModal) closeModalUC();
      if (e.target === visualizarUcModal) closeVisualizarUcModal();
    });
  }

  // ===================== Carregamento e Renderização =====================

  async function carregarDadosIniciais() {
    try {
        const data = await safeFetch(API.bootstrap);
        STATE.instituicoes = data.instituicoes || [];
        STATE.ucs = data.ucs || [];

        popularFiltrosIniciais();
        renderizarConteudo(); 
    } catch (err) {
        console.error(err);
        ucTableBody.innerHTML = `<tr><td colspan="7">Erro ao buscar dados. Tente recarregar a página.</td></tr>`;
        if (pagElements.info) pagElements.info.textContent = '—';
    }
  }

  function popularFiltrosIniciais() {
    const insts = STATE.instituicoes;
    const opts = ['<option value="">Todas as instituições</option>']
        .concat(insts.map(i => `<option value="${i._id}">${i.razao_social ?? '(sem nome)'}</option>`));
    if (filterInstituicao) filterInstituicao.innerHTML = opts.join('');
  }

  // === Renderização Refatorada com Geral.js ===
  function renderizarConteudo() {
    applyFiltersFromUI();

    // 1. Filtragem
    const filteredUcs = STATE.ucs.filter(uc => {
        const { q, instituicoes, status, created_from, created_to } = STATE.filters;

        if (q && !`${uc.descricao} ${uc.sala_ideal}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (instituicoes.length && !instituicoes.includes(uc.instituicao_id)) return false;
        if (status.length && !status.includes(uc.status)) return false;
        if (created_from && uc.data_criacao < created_from) return false;
        if (created_to && uc.data_criacao > created_to) return false;

        return true;
    });

    // 2. Paginação (Usa lógica do geral.js)
    const { pagedData, meta } = paginateData(
        filteredUcs, 
        STATE.pagination.page, 
        STATE.pagination.pageSize
    );

    // Atualiza STATE
    STATE.pagination = { ...STATE.pagination, ...meta };

    // 3. Atualiza UI de paginação (botões e texto)
    updateUI(pagElements, meta);

    // 4. Renderiza tabela
    renderTableUC(pagedData);
  }

  function renderTableUC(ucsParaRenderizar) {
    if (!ucsParaRenderizar.length) {
        ucTableBody.innerHTML = `<tr><td colspan="7">Nenhuma UC encontrada com os filtros aplicados.</td></tr>`;
        return;
    }

    const instituicoesMap = new Map(STATE.instituicoes.map(i => [i._id, i.razao_social ?? i.nome ?? '(sem nome)']));

    const rows = ucsParaRenderizar.map(uc => {
        const nomeInst = instituicoesMap.get(uc.instituicao_id) || '';
        return `
            <tr>
                <td>${uc._id}</td>
                <td>${nomeInst}</td>
                <td>${uc.descricao ?? ''}</td>
                <td>${uc.sala_ideal ?? ''}</td>
                <td>${uc.status ?? 'Ativa'}</td>
                <td>${fmtDateBR(uc.data_criacao)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-view" data-id="${uc._id}" title="Visualizar"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-icon btn-edit" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    ucTableBody.innerHTML = rows.join('');
  }

  function wireTableActions() {
    ucTableBody.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('.btn-view');
      const editBtn = e.target.closest('.btn-edit');
      const delBtn  = e.target.closest('.btn-delete');

      if (viewBtn) {
        const uc = STATE.ucs.find(u => u._id === viewBtn.dataset.id);
        if (uc) openVisualizarUcModal(uc);
        return;
      }
      if (editBtn) {
        const uc = STATE.ucs.find(u => u._id === editBtn.dataset.id);
        if (uc) openModalUC(true, uc);
        return;
      }
      if (delBtn) {
        if (!confirm('Deseja excluir esta UC?')) return;
        try {
           await safeFetch(`${API.uc}/${encodeURIComponent(delBtn.dataset.id)}`, { method: 'DELETE' });
           await carregarDadosIniciais(); 
        } catch (err) {
          console.error(err);
          alert('Erro ao excluir. Tente novamente.');
        }
      }
    });
  }

  // ===================== Validação =====================
  const forbiddenChars = /[<>"';{}]/g;
  function clearAlert() { alertUc.textContent = ''; alertUc.className = ''; alertUc.style.display = 'none'; }
  function showAlert(msg, type = 'error') {
    alertUc.textContent = msg;
    alertUc.className = (type === 'error' ? 'alert-error' : 'alert-success');
    alertUc.style.display = 'block';
    if (type === 'success') setTimeout(clearAlert, 2500);
  }
  function sanitize(val) { return (val || '').replace(/\s+/g, ' ').trim(); }

  function validateUcForm() {
    clearAlert();
    // Verifica se instituição existe (segurança adicional frontend)
    if (!selectInstituicao.value) { showAlert('Selecione uma instituição.', 'error'); selectInstituicao.focus(); return false; }

    descricaoUcInput.value = sanitize(descricaoUcInput.value);
    if (descricaoUcInput.value.length < 2 || descricaoUcInput.value.length > 100) {
      showAlert('Descrição deve ter entre 2 e 100 caracteres.', 'error'); descricaoUcInput.focus(); return false;
    }
    if (forbiddenChars.test(descricaoUcInput.value)) { showAlert('Descrição contém caracteres inválidos.', 'error'); descricaoUcInput.focus(); return false; }

    salaIdealInput.value = sanitize(salaIdealInput.value);
    const alphaNumBR = /^[A-Za-zÀ-ÿ0-9 ]+$/;
    if (salaIdealInput.value.length < 2 || salaIdealInput.value.length > 20) {
      showAlert('Sala Ideal deve ter entre 2 e 20 caracteres.', 'error'); salaIdealInput.focus(); return false;
    }
    if (!alphaNumBR.test(salaIdealInput.value)) { showAlert('Sala Ideal aceita apenas letras, números e espaços.', 'error'); salaIdealInput.focus(); return false; }

    if (!statusUc.value) { showAlert('Selecione o status.', 'error'); statusUc.focus(); return false; }
    return true;
  }

  function wireInlineValidation() {
    [descricaoUcInput, salaIdealInput, selectInstituicao, statusUc].forEach(input => {
      input.addEventListener('input', clearAlert);
    });
  }

  // ===================== Submit CRUD =====================
  function disableForm(disabled) { $$('button, input, select, textarea', ucForm).forEach(el => { el.disabled = disabled; }); }
  
  function buildPayload() {
    // Pega a primeira instituição carregada no STATE (já que o usuário só vê a dele)
    const instituicaoLogada = STATE.instituicoes[0]?._id; 
    if (!instituicaoLogada) {
        alert("Erro de segurança: Instituição não identificada na sessão.");
        return null;
    }
    return {
      descricao: descricaoUcInput.value,
      sala_ideal: salaIdealInput.value,
      instituicao_id: instituicaoLogada,
      status: statusUc.value
    };
  }

  function wireFormSubmit() {
    ucForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateUcForm()) return;

      const payload = buildPayload();
      if (!payload) return;

      const isEdit = Boolean(STATE.ucEditId);
      const url = isEdit ? `${API.uc}/${encodeURIComponent(STATE.ucEditId)}` : API.uc;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        disableForm(true);
        await safeFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        closeModalUC();
        setTimeout(async () => {
          alert('Unidade Curricular salva com sucesso!');
          STATE.pagination.page = 1;
          await carregarDadosIniciais();
        }, 200);
      } catch (err) {
        console.error(err);
        showAlert('Erro ao salvar UC. Tente novamente.', 'error');
      } finally {
        disableForm(false);
      }
    });
  }

  // ===================== Filtros & Paginação =====================
  function applyFiltersFromUI() {
    STATE.filters.q = (searchInput?.value || '').trim();

    const selInst = filterInstituicao?.value || '';
    STATE.filters.instituicoes = selInst ? [selInst] : [];

    const selStatus = filterStatus?.value || '';
    STATE.filters.status = selStatus ? [selStatus] : [];

    STATE.filters.created_from = toIsoStartOfDayLocal(filterCriadoDe?.value || '');
    STATE.filters.created_to   = toIsoEndOfDayLocal(filterCriadoAte?.value || '');
  }

  function wireFilters() {
    // 1. Filtros de Texto e Selects (Recuperado do código original)
    searchInput?.addEventListener('input', debounce(() => {
        STATE.pagination.page = 1;
        renderizarConteudo();
    }, 350));

    filterInstituicao?.addEventListener('change', () => {
        STATE.pagination.page = 1;
        renderizarConteudo();
    });

    filterStatus?.addEventListener('change', () => {
        STATE.pagination.page = 1;
        renderizarConteudo();
    });

    [filterCriadoDe, filterCriadoAte].forEach(el => {
        el?.addEventListener('change', () => {
            STATE.pagination.page = 1;
            renderizarConteudo();
        });
    });

    // 2. Paginação (Nova lógica via geral.js)
    bindControls(pagElements, (action, value) => {
        if (action === 'prev') {
             if (STATE.pagination.page > 1) STATE.pagination.page--;
        } else if (action === 'next') {
             if (STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
        } else if (action === 'size') {
             STATE.pagination.pageSize = value;
             STATE.pagination.page = 1; // Reseta ao mudar tamanho
        }
        renderizarConteudo();
    });
  }

  // --- UX de intervalo de datas ---
  function setupFiltroCriadoRange() {
    if (!filterCriadoDe || !filterCriadoAte) return;

    const sync = () => {
      const hasStart = !!filterCriadoDe.value;
      filterCriadoAte.disabled = !hasStart;
      filterCriadoAte.min = hasStart ? filterCriadoDe.value : '';

      if (!hasStart) {
        filterCriadoAte.value = '';
      } else if (filterCriadoAte.value && filterCriadoAte.value < filterCriadoDe.value) {
        filterCriadoAte.value = filterCriadoDe.value;
      }
    };

    sync();

    filterCriadoDe.addEventListener('input', () => {
      sync();
      STATE.pagination.page = 1;
      renderizarConteudo();
    });

    filterCriadoAte.addEventListener('input', () => {
      if (filterCriadoDe.value && filterCriadoAte.value < filterCriadoDe.value) {
        filterCriadoAte.value = filterCriadoDe.value;
      }
    });
  }

  // ===================== Inicialização =====================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
        await carregarDadosIniciais();

        wireModalEvents();
        wireInlineValidation();
        wireFormSubmit();
        wireTableActions();
        wireFilters();
        setupFiltroCriadoRange();

        // Limpar Filtros
        const clearCtl = App.ui.setupClearFilters({
            onClear: async () => {
                STATE.filters = { q: '', instituicoes: [], status: [], created_from: '', created_to: '' };
                STATE.pagination.page = 1;
                renderizarConteudo();
            }
        });
        clearCtl?.update && clearCtl.update();
    } catch (err) {
        console.error('Falha ao inicializar a página:', err);
    }
  });

})();