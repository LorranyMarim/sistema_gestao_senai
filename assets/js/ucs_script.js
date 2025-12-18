(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral_script.js antes de ucs_script.js.');

  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
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
    filters: { q: '', instituicoes: [], status: ['Todos'], created_from: '', created_to: '' },
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
      STATE.ucs = data.ucs || [];

      popularSelectModal();
    } catch (err) {
      console.error(err);
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
    }
  }

  function popularSelectModal() {
    if (refs.selectInstituicao) {
      refs.selectInstituicao.innerHTML = STATE.instituicoes.map(i => 
        `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`
      ).join('');
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

    const elFrom = document.getElementById('gen_created_from');
    const elTo = document.getElementById('gen_created_to');
    STATE.filters.created_from = elFrom?.value ? toIsoStartOfDayLocal(elFrom.value) : '';
    STATE.filters.created_to = elTo?.value ? toIsoEndOfDayLocal(elTo.value) : '';

    STATE.filters.instituicoes = [];

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
      if (f.status[0] !== 'Todos' && uc.status !== f.status[0]) return false;
      if (f.instituicoes.length && !f.instituicoes.includes(uc.instituicao_id)) return false;
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
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const mapInst = new Map(STATE.instituicoes.map(i => [i._id, i.razao_social ?? i.nome]));

    const fmtData = (d) => {
      if (!d) return '-';
      try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; }
    };

    refs.ucTableBody.innerHTML = lista.map(uc => `
      <tr>
       
        <td>${uc.descricao || ''}</td>
        <td>${uc.tipo_uc || ''}</td>
        <td>${uc.status || 'Ativo'}</td>
        <td>${fmtData(uc.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view text-white-500" data-id="${uc._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit text-white-500" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete text-white-500" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function setupFiltersAndRender() {

    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area',
        { search: true, date: true, status: true, pageSize: true },
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

    renderizarConteudo();
  }

  function setupEvents() {
    bindControls(refs.pagElements, (action, val) => {
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
        
        refs.viewFields.descricao.value = uc.descricao;
        refs.viewFields.tipo.value = uc.tipo_uc; 
        refs.viewFields.status.value = uc.status;
        
        App.ui.showModal(refs.visualizarUcModal);
      }

      if (btnEdit) {
        const uc = STATE.ucs.find(u => u._id === btnEdit.dataset.id);
        if (!uc) return;

        STATE.ucEditId = uc._id; 
        refs.ucIdInput.value = uc._id;

        refs.selectInstituicao.value = uc.instituicao_id || '';
        refs.descricaoUcInput.value = uc.descricao;
        refs.tipoUcInput.value = uc.tipo_uc;
        

        if (refs.statusUc) {
             refs.statusUc.disabled = false; 
             refs.statusUc.value = uc.status; 
        }

        refs.modalTitleUc.textContent = 'Editar/Alterar Unidade Curricular';
        App.ui.showModal(refs.ucModal);
      }

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir esta UC?')) return;
        try {
          await safeFetch(`${API.uc}?id=${btnDel.dataset.id}`, { method: 'DELETE' });
          await carregarDadosIniciais();
          renderizarConteudo();
        } catch (err) { alert('Erro ao excluir.'); }
      }
    });


    refs.addUcBtn?.addEventListener('click', () => {
      if (!refs.ucModal) return;
      
      STATE.ucEditId = null;
      refs.ucForm.reset();
      refs.ucIdInput.value = ''; 
      refs.modalTitleUc.textContent = 'Adicionar Nova Unidade Curricular';
      
      if (STATE.instituicoes.length > 0) {
          refs.selectInstituicao.value = STATE.instituicoes[0]._id;
      }


      if (refs.statusUc) {
        refs.statusUc.value = 'Ativo'; 
        refs.statusUc.disabled = true; 
      }

      App.ui.showModal(refs.ucModal);
    });

    const closeModal = () => App.ui.hideModal(refs.ucModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);

   
    refs.ucForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isEdit = !!STATE.ucEditId;

      const idInstituicao = refs.selectInstituicao.value;
      if (!idInstituicao) {
          exibirMensagem("Erro: Instituição não identificada.");
          return;
      }

      const payload = {
        descricao: refs.descricaoUcInput.value.trim(),
        tipo_uc: refs.tipoUcInput.value.trim(),
        instituicao_id: idInstituicao,
        status: isEdit ? (refs.statusUc?.value ?? 'Ativo') : 'Ativo'
      };

      const url = isEdit ? `${API.uc}?id=${STATE.ucEditId}` : API.uc;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        await safeFetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });

        closeModal();

        await carregarDadosIniciais();

        renderizarConteudo();
        
        exibirMensagem('Salvo com sucesso!');
        
      } catch (err) { 
          console.error(err); 
          exibirMensagem('Erro ao salvar. Tente novamente.'); 
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

      setupFiltersAndRender();
    } catch (err) {
      console.error('Falha na inicialização:', err);
      alert('Erro ao carregar dados do sistema. Verifique sua conexão.');
    } finally {
      App.loader.hide();
    }
  });


  function setupFiltersAndRender() {

    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area',
        { search: true, date: true, status: true, pageSize: true },
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

    renderizarConteudo();
  }

  function applyFiltersFromUI() {
    const elSearch = document.getElementById('gen_search');
    STATE.filters.q = (elSearch?.value || '').trim();

    const elStatus = document.getElementById('gen_status');
    STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

    const elFrom = document.getElementById('gen_created_from');
    const elTo = document.getElementById('gen_created_to');
    STATE.filters.created_from = elFrom?.value ? toIsoStartOfDayLocal(elFrom.value) : '';
    STATE.filters.created_to = elTo?.value ? toIsoEndOfDayLocal(elTo.value) : '';

    STATE.filters.instituicoes = [];

    const elSize = document.getElementById('gen_pagesize');
    if (elSize) {
      STATE.pagination.pageSize = parseInt(elSize.value, 10);
      refs.pagElements.sizeSel = elSize;
    }
  }

})();