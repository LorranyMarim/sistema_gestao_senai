/* eslint-disable no-console */
(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral.js antes de gestao_unidades_curriculares.js.');
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;

  // ===================== Config & State =====================
  const API = Object.freeze({
    bootstrap: '../backend/processa_unidade_curricular.php?action=bootstrap',
    uc: '../backend/processa_unidade_curricular.php', // Mantido para CRUD
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
  async function preencherSelectInstituicao(selectedId = '') {
    // Agora usa os dados do STATE, não faz mais fetch.
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

/**
 * Busca o pacote inicial de dados (UCs e Instituições) do backend.
 * Esta função é chamada apenas uma vez no carregamento da página.
 */
async function carregarDadosIniciais() {
    try {
        const data = await safeFetch(API.bootstrap);
        STATE.instituicoes = data.instituicoes || [];
        STATE.ucs = data.ucs || [];

        // Após carregar os dados, preenche os filtros e a tabela pela primeira vez
        popularFiltrosIniciais();
        renderizarConteudo(); 
    } catch (err) {
        console.error(err);
        ucTableBody.innerHTML = `<tr><td colspan="7">Erro ao buscar dados. Tente recarregar a página.</td></tr>`;
        pageInfo && (pageInfo.textContent = '—');
    }
}

/**
 * Preenche os selects de filtro com os dados carregados.
 */
function popularFiltrosIniciais() {
    const insts = STATE.instituicoes;
    const opts = ['<option value="">Todas as instituições</option>']
        .concat(insts.map(i => `<option value="${i._id}">${i.razao_social ?? '(sem nome)'}</option>`));
    if (filterInstituicao) filterInstituicao.innerHTML = opts.join('');
}

/**
 * Filtra e pagina os dados em STATE e atualiza a UI (tabela e paginação).
 */
function renderizarConteudo() {
    applyFiltersFromUI(); // Pega os valores atuais dos inputs de filtro

    // Filtra a lista completa de UCs em memória
    const filteredUcs = STATE.ucs.filter(uc => {
        const { q, instituicoes, status, created_from, created_to } = STATE.filters;

        if (q && !`${uc.descricao} ${uc.sala_ideal}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (instituicoes.length && !instituicoes.includes(uc.instituicao_id)) return false;
        if (status.length && !status.includes(uc.status)) return false;
        if (created_from && uc.data_criacao < created_from) return false;
        if (created_to && uc.data_criacao > created_to) return false;

        return true;
    });

    STATE.pagination.total = filteredUcs.length;
    STATE.pagination.totalPages = Math.max(1, Math.ceil(STATE.pagination.total / STATE.pagination.pageSize));
    STATE.pagination.page = Math.min(Math.max(1, STATE.pagination.page), STATE.pagination.totalPages);

    const start = (STATE.pagination.page - 1) * STATE.pagination.pageSize;
    const end = start + STATE.pagination.pageSize;
    const pageItems = filteredUcs.slice(start, end);

    renderTableUC(pageItems); // Passa apenas os itens da página atual para renderizar
    renderPaginationInfo();
}

 function renderTableUC(ucsParaRenderizar) { // Recebe a lista de UCs da página atual
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
          // Recarrega os dados do bootstrap para garantir consistência após a exclusão
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
    // Todas as chamadas para carregarUnidadesCurriculares() são substituídas por renderizarConteudo()

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

    pageSizeSel?.addEventListener('change', () => {
        STATE.pagination.pageSize = parseInt(pageSizeSel.value || '10', 10);
        STATE.pagination.page = 1;
        renderizarConteudo();
    });

    prevPageBtn?.addEventListener('click', () => {
        if (STATE.pagination.page > 1) {
            STATE.pagination.page--;
            renderizarConteudo();
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        if (STATE.pagination.page < STATE.pagination.totalPages) {
            STATE.pagination.page++;
            renderizarConteudo();
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
   filterCriadoDe.addEventListener('input', () => { // Não precisa mais ser async
    sync();
    STATE.pagination.page = 1;
    renderizarConteudo();
  });

  // protege contra “até” < “de” caso o usuário force
  filterCriadoAte.addEventListener('input', () => {
    if (filterCriadoDe.value && filterCriadoAte.value < filterCriadoDe.value) {
      filterCriadoAte.value = filterCriadoDe.value;
    }
  });
}


  // ===================== Bootstrap =====================
  // ===================== Bootstrap =====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await carregarDadosIniciais();

        wireModalEvents();
        wireInlineValidation();
        wireFormSubmit();
        wireTableActions();
        wireFilters();
        setupFiltroCriadoRange();

        // O código do botão "Limpar filtros" permanece o mesmo, mas ele agora chamará
        // onClear, que irá resetar os filtros no STATE e chamar renderizarConteudo().
        const clearCtl = App.ui.setupClearFilters({
            // ... (configuração existente) ...
            onClear: async () => {
                STATE.filters = { q: '', instituicoes: [], status: [], created_from: '', created_to: '' };
                STATE.pagination.page = 1;
                renderizarConteudo(); // <<< Apenas renderiza novamente
            }
        });

        clearCtl?.update && clearCtl.update();
    } catch (err) {
        console.error('Falha ao inicializar a página:', err);
    }
});

})();
