(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral_script.js antes de ucs_script.js.');

  const { $, $$ } = App.dom;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  const LS_KEY = 'ucs_gestao_state_v2';

  const API = Object.freeze({
    bootstrap: '../backend/processa_ucs.php?action=bootstrap',
    uc: '../backend/processa_ucs.php',
  });

  const DEFAULT_STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', status: ['Todos'], tipoUc: 'Todos', created_from: '', created_to: '' },
  };

  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  const refs = {
    ucModal: $('#ucModal'),
    addUcBtn: $('#addUcBtn'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    ucForm: $('#ucForm'),
    modalTitleUc: $('#modalTitleUc'),
    
    ucIdInput: $('#ucId'),
    descricaoUcInput: $('#descricaoUc'),
    tipoUcInput: $('#tipoUc'), 
    selectInstituicao: $('#instituicaoUc'),
    statusUc: $('#statusUc'),
    alertUc: $('#alertUc'),
    
    ucTableBody: $('#ucTableBody'),
    
    visualizarUcModal: $('#visualizarUcModal'),
    closeVisualizarUcBtn: $('#closeVisualizarUcBtn'),
    fecharVisualizarUcBtn: $('#fecharVisualizarUcBtn'),
    viewFields: {
      descricao: $('#viewDescricaoUc'),
      tipo: $('#viewTipoUc'),
      status: $('#viewStatusUc')
    },
    
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: null
    }
  };

  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }

  async function carregarDadosIniciais() {
    try {
      const data = await safeFetch(API.bootstrap);
      STATE.instituicoes = data.instituicoes || [];
      
      STATE.ucs = Array.isArray(data.ucs) ? data.ucs : (Array.isArray(data) ? data : []);

      popularSelectModal();
    } catch (err) {
      console.error(err);
      refs.ucTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
    }
  }

  function popularSelectModal() {
    if (refs.selectInstituicao) {
        const options = ['<option value="">Selecione...</option>']
            .concat(STATE.instituicoes.map(i => `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`));
        refs.selectInstituicao.innerHTML = options.join('');

        if (STATE.instituicoes.length > 0) {
            refs.selectInstituicao.value = STATE.instituicoes[0]._id;
        }
    }
  }

  function applyFiltersFromUI() {
    const elSearch = document.getElementById('gen_search');
    STATE.filters.q = (elSearch?.value || '').trim();

    const elStatus = document.getElementById('gen_status');
    STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

    const elTipo = document.getElementById('gen_tipo_uc');
    STATE.filters.tipoUc = elTipo ? elTipo.value : 'Todos';

    const elFrom = document.getElementById('gen_created_from');
    const elTo = document.getElementById('gen_created_to');
    STATE.filters.created_from = elFrom?.value ? toIsoStartOfDayLocal(elFrom.value) : '';
    STATE.filters.created_to = elTo?.value ? toIsoEndOfDayLocal(elTo.value) : '';

    const elSize = document.getElementById('gen_pagesize');
    if (elSize) {
      STATE.pagination.pageSize = parseInt(elSize.value, 10);
      refs.pagElements.sizeSel = elSize;
    }
  }

  function renderizarConteudo() {
    applyFiltersFromUI();
    saveState();

    const filtered = STATE.ucs.filter(uc => {
      const f = STATE.filters;
      
      if (f.q) {
        const text = `${uc.descricao} ${uc.tipo_uc}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      
      if (f.status[0] !== 'Todos') {
          const statusItem = (uc.status || 'Ativo').toLowerCase();
          const filtroStatus = f.status[0].toLowerCase();
          if (statusItem !== filtroStatus) return false;
      }

      if (f.tipoUc && f.tipoUc !== 'Todos') {
          
          if (uc.tipo_uc !== f.tipoUc) return false;
      }

      if (f.created_from && uc.data_criacao < f.created_from) return false;
      if (f.created_to && uc.data_criacao > f.created_to) return false;

      return true;
    });

    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!lista.length) {
      refs.ucTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const fmtData = App.format.fmtDateBR;

    refs.ucTableBody.innerHTML = lista.map(uc => {
        const statusClass = (uc.status === 'Inativo') ? 'text-red-500 font-bold' : 'text-green-600';

        return `
      <tr>
        <td>${uc.descricao || ''}</td>
        <td>${uc.tipo_uc || ''}</td>
        <td><span class="${statusClass}">${uc.status || 'Ativo'}</span></td>
        <td>${fmtData(uc.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view" data-id="${uc._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  function setupFilters() {
    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area',
        { search: true, date: true, status: true, pageSize: true, tipoUc: true },
        null,
        () => {
          STATE.pagination.page = 1;
          renderizarConteudo();
        },
        () => {
          STATE.filters = { ...DEFAULT_STATE.filters };
          STATE.pagination.page = 1;
          renderizarConteudo();
        }
      );
    }

    if (STATE.filters.q && document.getElementById('gen_search'))
      document.getElementById('gen_search').value = STATE.filters.q;
      
    if (STATE.filters.tipoUc && document.getElementById('gen_tipo_uc'))
        document.getElementById('gen_tipo_uc').value = STATE.filters.tipoUc;

    renderizarConteudo();
  }

  function openModalCadastro() {
      STATE.ucEditId = null;
      refs.ucForm.reset();
      refs.ucIdInput.value = '';
      refs.modalTitleUc.textContent = 'Adicionar Nova Unidade Curricular';
      
      refs.statusUc.value = 'Ativo';
      refs.statusUc.disabled = true; 

      if (STATE.instituicoes.length > 0 && !refs.selectInstituicao.value) {
        refs.selectInstituicao.value = STATE.instituicoes[0]._id;
      }

      App.ui.showModal(refs.ucModal);
  }

  function openModalEdicao(uc) {
      STATE.ucEditId = uc._id;
      
      refs.ucIdInput.value = uc._id;
      refs.descricaoUcInput.value = uc.descricao || '';
      refs.tipoUcInput.value = uc.tipo_uc || '';
      refs.selectInstituicao.value = uc.instituicao_id || '';
      
      refs.statusUc.value = uc.status || 'Ativo';
      refs.statusUc.disabled = false;
      
      refs.modalTitleUc.textContent = 'Editar UC';
      App.ui.showModal(refs.ucModal);
  }

  function setupEvents() {
    bindControls(refs.pagElements, (action) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    refs.ucTableBody?.addEventListener('click', async (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      if (btnView) {
        const uc = STATE.ucs.find(u => u._id === btnView.dataset.id);
        if (!uc) return;
        refs.viewFields.descricao.value = uc.descricao || '';
        refs.viewFields.tipo.value = uc.tipo_uc || '';
        refs.viewFields.status.value = uc.status || '';
        App.ui.showModal(refs.visualizarUcModal);
      }

      if (btnEdit) {
        const uc = STATE.ucs.find(u => u._id === btnEdit.dataset.id);
        if (uc) openModalEdicao(uc);
      }

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir esta UC?')) return;
        try {
            App.loader.show();
            await safeFetch(`${API.uc}?id=${btnDel.dataset.id}`, { method: 'DELETE' });
            await carregarDadosIniciais();
            renderizarConteudo();
            alert('Excluído com sucesso.');
        } catch (err) { 
            alert('Erro ao excluir: ' + err.message); 
        } finally {
            App.loader.hide();
        }
      }
    });

    refs.addUcBtn?.addEventListener('click', openModalCadastro);

    const closeModal = () => App.ui.hideModal(refs.ucModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);

    refs.ucForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!refs.selectInstituicao.value) {
          if(STATE.instituicoes.length > 0) refs.selectInstituicao.value = STATE.instituicoes[0]._id;
          else {
              alert('Erro: Nenhuma instituição vinculada para salvar a UC.');
              return;
          }
      }

      const isEdit = !!STATE.ucEditId;

      const payload = {
        descricao: refs.descricaoUcInput.value.trim(),
        tipo_uc: refs.tipoUcInput.value.trim(),
        instituicao_id: refs.selectInstituicao.value,
    
        status: isEdit ? refs.statusUc.value : 'Ativo'
      };

      const url = isEdit ? `${API.uc}?id=${STATE.ucEditId}` : API.uc;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        App.loader.show();
        await safeFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        closeModal();
        await carregarDadosIniciais();
        renderizarConteudo();
        alert('Salvo com sucesso!');
      } catch (err) { 
          console.error(err);
          alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido.')); 
      } finally {
          App.loader.hide();
      }
    });

    const closeView = () => App.ui.hideModal(refs.visualizarUcModal);
    refs.closeVisualizarUcBtn?.addEventListener('click', closeView);
    refs.fecharVisualizarUcBtn?.addEventListener('click', closeView);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    App.loader.show();
    setupEvents();

    try {
      await carregarDadosIniciais();
      setupFilters();
    } catch (err) {
      console.error('Falha na inicialização:', err);
      alert('Erro ao carregar sistema.');
    } finally {
      App.loader.hide();
    }
  });

})();