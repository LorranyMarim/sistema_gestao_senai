/* eslint-disable no-console */
(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral.js antes de gestao_unidades_curriculares.js.');

  // ===================== Imports =====================
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  // Variável para o filtro customizado (Instituição)
  let filterInstituicaoEl = null;

  // ===================== Config & State =====================
  const LS_KEY = 'ucs_gestao_state_v2';
  
  const API = Object.freeze({
    bootstrap: '../backend/processa_unidade_curricular.php?action=bootstrap',
    uc: '../backend/processa_unidade_curricular.php',
  });

  // Estado inicial
  const DEFAULT_STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', instituicoes: [], status: ['Todos'], created_from: '', created_to: '' },
  };

  // Carrega do LocalStorage
  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch {}

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  // ===================== DOM Refs =====================
  const refs = {
    ucModal: $('#ucModal'),
    addUcBtn: $('#addUcBtn'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    ucForm: $('#ucForm'),
    modalTitleUc: $('#modalTitleUc'),
    ucIdInput: $('#ucId'),
    descricaoUcInput: $('#descricaoUc'),
    salaIdealInput: $('#salaIdeal'),
    selectInstituicao: $('#instituicaoUc'), // Select dentro do MODAL (não confundir com filtro)
    statusUc: $('#statusUc'),
    alertUc: $('#alertUc'),
    ucTableBody: $('#ucTableBody'),
    // Visualizar
    visualizarUcModal: $('#visualizarUcModal'),
    closeVisualizarUcBtn: $('#closeVisualizarUcBtn'),
    fecharVisualizarUcBtn: $('#fecharVisualizarUcBtn'),
    viewFields: {
      descricao: $('#viewDescricaoUc'),
      sala: $('#viewSalaIdealUc'),
      status: $('#viewStatusUc')
    },
    // Paginação
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: null // Será vinculado dinamicamente pelo geral.js
    }
  };

  // ===================== Persistência =====================
  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }

  // ===================== Core Logic =====================
  
  async function carregarDadosIniciais() {
    try {
      const data = await safeFetch(API.bootstrap);
      STATE.instituicoes = data.instituicoes || [];
      STATE.ucs = data.ucs || [];
      
      // Popula apenas o select do MODAL de cadastro (o filtro é separado)
      popularSelectModal();
    } catch (err) {
      console.error(err);
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
    }
  }

  function popularSelectModal() {
    if (refs.selectInstituicao) {
       refs.selectInstituicao.innerHTML = ['<option value="">Selecione...</option>']
        .concat(STATE.instituicoes.map(i => `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`))
        .join('');
    }
  }

  // Leitura dos filtros gerados pelo geral.js
  function applyFiltersFromUI() {
    // Texto
    const elSearch = document.getElementById('gen_search');
    STATE.filters.q = (elSearch?.value || '').trim();
    
    // Status
    const elStatus = document.getElementById('gen_status');
    STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

    // Datas
    const elFrom = document.getElementById('gen_created_from');
    const elTo = document.getElementById('gen_created_to');
    STATE.filters.created_from = elFrom?.value ? toIsoStartOfDayLocal(elFrom.value) : '';
    STATE.filters.created_to = elTo?.value ? toIsoEndOfDayLocal(elTo.value) : '';

    // Customizado (Instituição)
    const selInst = filterInstituicaoEl?.value || '';
    STATE.filters.instituicoes = selInst ? [selInst] : [];

    // PageSize
    const elSize = document.getElementById('gen_pagesize');
    if (elSize) {
        STATE.pagination.pageSize = parseInt(elSize.value, 10);
        // Atualiza a referência para o módulo de paginação
        refs.pagElements.sizeSel = elSize;
    }
  }

  function renderizarConteudo() {
    applyFiltersFromUI();
    saveState();

    // 1. Filtragem Local
    const filtered = STATE.ucs.filter(uc => {
      const f = STATE.filters;
      // Texto
      if (f.q) {
        const text = `${uc.descricao} ${uc.sala_ideal}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      // Status
      if (f.status[0] !== 'Todos' && uc.status !== f.status[0]) return false;
      // Instituição
      if (f.instituicoes.length && !f.instituicoes.includes(uc.instituicao_id)) return false;
      // Datas
      if (f.created_from && uc.data_criacao < f.created_from) return false;
      if (f.created_to && uc.data_criacao > f.created_to) return false;
      
      return true;
    });

    // 2. Paginação
    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    // 3. UI
    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!lista.length) {
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const mapInst = new Map(STATE.instituicoes.map(i => [i._id, i.razao_social ?? i.nome]));
    
    // Helper data
    const fmtData = (d) => {
        if(!d) return '-';
        try { return new Date(d).toLocaleDateString('pt-BR'); } catch{ return '-'; }
    };

    refs.ucTableBody.innerHTML = lista.map(uc => `
      <tr>
        <td>${uc._id?.substring(0,8)}...</td>
        <td>${mapInst.get(uc.instituicao_id) || '—'}</td>
        <td>${uc.descricao || ''}</td>
        <td>${uc.sala_ideal || ''}</td>
        <td>${uc.status || 'Ativa'}</td>
        <td>${fmtData(uc.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view text-blue-500" data-id="${uc._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit text-yellow-500" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete text-red-500" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ===================== Inicialização dos Filtros =====================
  function setupFiltersAndRender() {
    // 1. Criar o Select de Instituição manualmente
    filterInstituicaoEl = document.createElement('select');
    filterInstituicaoEl.id = 'custom_instituicao'; 
    filterInstituicaoEl.className = 'form-select border rounded px-2 py-1';
    filterInstituicaoEl.dataset.label = 'Instituição:';
    filterInstituicaoEl.innerHTML = '<option value="">Todas as instituições</option>';
    
    // Popula com dados carregados
    if (STATE.instituicoes && STATE.instituicoes.length) {
        STATE.instituicoes.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i._id;
            opt.textContent = i.razao_social || i.nome || '(sem nome)';
            filterInstituicaoEl.appendChild(opt);
        });
    }

    // 2. Chamar o renderizador do geral.js
    if (App.filters && App.filters.render) {
        App.filters.render(
            'filter_area', 
            { search: true, date: true, status: true, pageSize: true }, 
            filterInstituicaoEl, 
            () => { // OnChange
                STATE.pagination.page = 1;
                renderizarConteudo();
            },
            () => { // OnClear
                STATE.filters = { ...DEFAULT_STATE.filters }; // Reseta estado
                STATE.pagination.page = 1;
                renderizarConteudo();
            }
        );
    }

    // 3. Restaurar valores salvos na UI (opcional, para UX melhor)
    if(STATE.filters.q && document.getElementById('gen_search')) 
        document.getElementById('gen_search').value = STATE.filters.q;
        
    // 4. Renderizar Tabela Inicialmente
    renderizarConteudo();
  }

  // ===================== Eventos da Tabela e Modal =====================
  function setupEvents() {
    // Paginação
    bindControls(refs.pagElements, (action, val) => {
        if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
        if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
        // 'size' é tratado no change do filtro gerado
        renderizarConteudo();
    });

    // Ações da Tabela
    refs.ucTableBody?.addEventListener('click', async (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      if (btnView) {
        const uc = STATE.ucs.find(u => u._id === btnView.dataset.id);
        if(!uc) return;
        refs.viewFields.descricao.value = uc.descricao;
        refs.viewFields.sala.value = uc.sala_ideal;
        refs.viewFields.status.value = uc.status;
        App.ui.showModal(refs.visualizarUcModal);
      }

      if (btnEdit) {
        const uc = STATE.ucs.find(u => u._id === btnEdit.dataset.id);
        if(!uc) return;
        STATE.ucEditId = uc._id;
        refs.ucIdInput.value = uc._id;
        refs.selectInstituicao.value = uc.instituicao_id;
        refs.descricaoUcInput.value = uc.descricao;
        refs.salaIdealInput.value = uc.sala_ideal;
        refs.statusUc.value = uc.status;
        refs.modalTitleUc.textContent = 'Editar UC';
        App.ui.showModal(refs.ucModal);
      }

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir esta UC?')) return;
        try {
          await safeFetch(`${API.uc}/${btnDel.dataset.id}`, { method: 'DELETE' });
          await carregarDadosIniciais(); 
          renderizarConteudo();
        } catch(err) { alert('Erro ao excluir.'); }
      }
    });

    // Modal
    refs.addUcBtn?.addEventListener('click', () => {
      STATE.ucEditId = null;
      refs.ucForm.reset();
      refs.modalTitleUc.textContent = 'Adicionar UC';
      App.ui.showModal(refs.ucModal);
    });

    const closeModal = () => App.ui.hideModal(refs.ucModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);

    // Salvar
    refs.ucForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        descricao: refs.descricaoUcInput.value.trim(),
        sala_ideal: refs.salaIdealInput.value.trim(),
        instituicao_id: refs.selectInstituicao.value,
        status: refs.statusUc.value
      };
      const isEdit = !!STATE.ucEditId;
      const url = isEdit ? `${API.uc}/${STATE.ucEditId}` : API.uc;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        await safeFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        closeModal();
        await carregarDadosIniciais();
        renderizarConteudo();
        alert('Salvo com sucesso!');
      } catch (err) { alert('Erro ao salvar.'); }
    });
    
    // Fechar View Modal
    const closeView = () => App.ui.hideModal(refs.visualizarUcModal);
    refs.closeVisualizarUcBtn?.addEventListener('click', closeView);
    refs.fecharVisualizarUcBtn?.addEventListener('click', closeView);
  }

  // ===================== Init =====================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
        await carregarDadosIniciais(); // Busca dados
        setupFiltersAndRender();       // Cria filtros e Renderiza a tabela
        setupEvents();                 // Liga eventos de clique/modal
    } catch (err) {
        console.error('Falha na inicialização:', err);
    }
  });

})();