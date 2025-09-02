/* eslint-disable no-console */
(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral.js antes de gestao_unidades_curriculares.js.');
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;

  // ===================== Config & State =====================
  const API = Object.freeze({
    instituicao: 'http://localhost:8000/api/instituicoes',
    uc: 'http://localhost:8000/api/unidades_curriculares',
  });

  const STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    // status = [] -> Todos; ["Ativa"] -> Ativo; ["Inativa"] -> Inativo
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
  const filterInstituicao = $('#filterInstituicao');   // select simples ("" = todas)
  const filterStatus = $('#filterStatus');             // select: ""|Ativa|Inativa
  const filterCriadoDe = $('#filterCriadoDe');         // type="date"
  const filterCriadoAte = $('#filterCriadoAte');       // type="date"
  const pageSizeSel = $('#pageSize');

  // Paginação UI
  const prevPageBtn = $('#prevPage');
  const nextPageBtn = $('#nextPage');
  const pageInfo = $('#pageInfo');

  // ===================== Utils de data (específico desta view) =====================
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

  // ===================== Instituições =====================
  async function fetchInstituicoes() {
    if (STATE.instituicoes.length) return STATE.instituicoes;
    const data = await safeFetch(API.instituicao);
    STATE.instituicoes = Array.isArray(data) ? data : [];
    return STATE.instituicoes;
  }
  async function preencherSelectInstituicao(selectedId = '') {
    const insts = await fetchInstituicoes();
    const opts = ['<option value="">Selecione a instituição</option>']
      .concat(insts.map(i =>
        `<option value="${i._id}" ${i._id === selectedId ? 'selected' : ''}>${i.razao_social ?? i.nome ?? '(sem nome)'}</option>`
      ));
    selectInstituicao.innerHTML = opts.join('');
  }
  async function preencherFiltroInstituicao() {
    const insts = await fetchInstituicoes();
    const opts = ['<option value="">Todas as instituições</option>']
      .concat(insts.map(i => `<option value="${i._id}">${i.razao_social ?? i.nome ?? '(sem nome)'}</option>`));
    filterInstituicao.innerHTML = opts.join('');
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

  // ===================== Build Query =====================
  function buildQuery() {
    const p = new URLSearchParams();
    const { page, pageSize } = STATE.pagination;
    const { q, instituicoes, status, created_from, created_to } = STATE.filters;

    if (q) p.set('q', q);
    instituicoes.forEach(v => p.append('instituicao', v));
    status.forEach(s => p.append('status', s));
    if (created_from) p.set('created_from', created_from);
    if (created_to)   p.set('created_to', created_to);
    p.set('page', String(page));
    p.set('page_size', String(pageSize));

    return p.toString();
  }

  // ===================== UC: Busca & Tabela =====================
  async function carregarUnidadesCurriculares() {
    try {
      const qs = buildQuery();
      const [data] = await Promise.all([
        safeFetch(`${API.uc}?${qs}`),
        fetchInstituicoes()
      ]);

      const items = Array.isArray(data) ? data : (data.items || []);
      const total = Array.isArray(data) ? items.length : (data.total ?? items.length);

      STATE.ucs = items;
      STATE.pagination.total = total;
      STATE.pagination.totalPages = Math.max(1, Math.ceil(total / STATE.pagination.pageSize));

      renderTableUC();
      renderPaginationInfo();
    } catch (err) {
      console.error(err);
      ucTableBody.innerHTML = `<tr><td colspan="7">Erro ao buscar dados.</td></tr>`;
      pageInfo && (pageInfo.textContent = '—');
    }
  }

  function renderTableUC() {
    if (!STATE.ucs.length) {
      ucTableBody.innerHTML = `<tr><td colspan="7">Nenhuma UC cadastrada.</td></tr>`;
      return;
    }
    const rows = STATE.ucs.map(uc => {
      const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
      return `
        <tr>
          <td>${uc._id}</td>
          <td>${inst ? (inst.razao_social ?? inst.nome ?? '') : ''}</td>
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

  function renderPaginationInfo() {
    const { page, total, totalPages, pageSize } = STATE.pagination;
    if (pageInfo) pageInfo.textContent = `Página ${page} de ${totalPages} • ${total} registros`;
    if (prevPageBtn) prevPageBtn.disabled = page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = page >= totalPages || total === 0;
    if (pageSizeSel) pageSizeSel.value = String(pageSize);
  }

  // Delegação de eventos da tabela
  function wireTableActions() {
    ucTableBody.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('.btn-view');
      const editBtn = e.target.closest('.btn-edit');
      const delBtn  = e.target.closest('.btn-delete');

      if (viewBtn) {
        const id = viewBtn.dataset.id;
        const uc = STATE.ucs.find(u => u._id === id);
        if (uc) openVisualizarUcModal(uc);
        return;
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const uc = STATE.ucs.find(u => u._id === id);
        if (uc) openModalUC(true, uc);
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.id;
        if (!confirm('Deseja excluir esta UC?')) return;
        try {
          await safeFetch(`${API.uc}/${encodeURIComponent(id)}`, { method: 'DELETE' });
          await carregarUnidadesCurriculares();
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
    return {
      descricao: descricaoUcInput.value,
      sala_ideal: salaIdealInput.value,
      instituicao_id: selectInstituicao.value,
      status: statusUc.value
    };
  }
  function wireFormSubmit() {
    ucForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateUcForm()) return;

      const payload = buildPayload();
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
          await carregarUnidadesCurriculares();
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
    // busca (debounce)
    searchInput?.addEventListener('input', debounce(async () => {
      STATE.pagination.page = 1;
      applyFiltersFromUI();
      await carregarUnidadesCurriculares();
    }, 350));

    // instituicao (select simples)
    filterInstituicao?.addEventListener('change', async () => {
      STATE.pagination.page = 1;
      applyFiltersFromUI();
      await carregarUnidadesCurriculares();
    });

    // status (select)
    filterStatus?.addEventListener('change', async () => {
      STATE.pagination.page = 1;
      applyFiltersFromUI();
      await carregarUnidadesCurriculares();
    });

    // datas
    [filterCriadoDe, filterCriadoAte].forEach(el => {
      el?.addEventListener('change', async () => {
        STATE.pagination.page = 1;
        applyFiltersFromUI();
        await carregarUnidadesCurriculares();
      });
    });

    // itens por página
    pageSizeSel?.addEventListener('change', async () => {
      STATE.pagination.pageSize = parseInt(pageSizeSel.value || '10', 10);
      STATE.pagination.page = 1;
      await carregarUnidadesCurriculares();
    });

    // paginação
    prevPageBtn?.addEventListener('click', async () => {
      if (STATE.pagination.page > 1) {
        STATE.pagination.page--;
        await carregarUnidadesCurriculares();
      }
    });
    nextPageBtn?.addEventListener('click', async () => {
      if (STATE.pagination.page < STATE.pagination.totalPages) {
        STATE.pagination.page++;
        await carregarUnidadesCurriculares();
      }
    });
  }
  // --- UX de intervalo de datas (filtros) ---
function setupFiltroCriadoRange() {
  if (!filterCriadoDe || !filterCriadoAte) return;

  const sync = () => {
    const hasStart = !!filterCriadoDe.value;
    // habilita/desabilita o "até"
    filterCriadoAte.disabled = !hasStart;

    // restringe o mínimo do "até" para o mesmo "de"
    filterCriadoAte.min = hasStart ? filterCriadoDe.value : '';

    // se não houver "de", limpa o "até"
    if (!hasStart) {
      filterCriadoAte.value = '';
    } else if (filterCriadoAte.value && filterCriadoAte.value < filterCriadoDe.value) {
      // se o usuário já tinha algo menor, corrige
      filterCriadoAte.value = filterCriadoDe.value;
    }
  };

  // estado inicial
  sync();

  // quando alterar o "de", re-sincroniza e reaplica filtros
  filterCriadoDe.addEventListener('input', async () => {
    sync();
    // (opcional) já dispara a busca ao mudar o "de"
    STATE.pagination.page = 1;
    applyFiltersFromUI();
    await carregarUnidadesCurriculares();
  });

  // protege contra “até” < “de” caso o usuário force
  filterCriadoAte.addEventListener('input', () => {
    if (filterCriadoDe.value && filterCriadoAte.value < filterCriadoDe.value) {
      filterCriadoAte.value = filterCriadoDe.value;
    }
  });
}


  // ===================== Bootstrap =====================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await preencherFiltroInstituicao();
      wireModalEvents();
      wireInlineValidation();
      wireFormSubmit();
      wireTableActions();
      wireFilters();
      setupFiltroCriadoRange();


      // filtros iniciais (Status = Todos)
      applyFiltersFromUI();
      await carregarUnidadesCurriculares();

      // Botão "Limpar filtros" (centralizado no geral.js)
      const clearCtl = App.ui.setupClearFilters({
        buttonSelector: '#btnClearFilters',
        // campos observados para habilitar/desabilitar o botão
        watchSelectors: [
          '#searchUc',
          '#filterInstituicao',
          '#filterStatus',
          '#filterCriadoDe',
          '#filterCriadoAte',
        ],
        getFiltersState: () => STATE.filters,
        resetUI: () => {
          const $id = (s) => document.getElementById(s);
          $id('searchUc')         && ($id('searchUc').value = '');
          $id('filterInstituicao')&& ($id('filterInstituicao').value = '');
          $id('filterStatus')     && ($id('filterStatus').value = '');
          $id('filterCriadoDe')   && ($id('filterCriadoDe').value = '');
          $id('filterCriadoAte')  && ($id('filterCriadoAte').value = '');
          // normalmente não resetamos "Itens por página"
          setupFiltroCriadoRange();
        },
        onClear: async () => {
          STATE.filters = { q: '', instituicoes: [], status: [], created_from: '', created_to: '' };
          STATE.pagination.page = 1;
          await carregarUnidadesCurriculares();
        }
      });

      // garante estado inicial correto do botão (desabilitado sem filtros)
      clearCtl?.update && clearCtl.update();

    } catch (err) {
      console.error('Falha ao inicializar a página:', err);
    }
  });

})();
