/* eslint-disable no-console */
(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral.js antes de gestao_unidades_curriculares.js.');

  // ===================== Imports =====================
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  // ===================== Config & State =====================
  const LS_KEY = 'ucs_gestao_state_v1';
  
  const API = Object.freeze({
    bootstrap: '../backend/processa_unidade_curricular.php?action=bootstrap',
    uc: '../backend/processa_unidade_curricular.php',
  });

  // Estado inicial padrão
  const DEFAULT_STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', instituicoes: [], status: [], created_from: '', created_to: '' },
  };

  // Carrega do LocalStorage ou usa padrão, preservando arrays vazios
  let savedState = {};
  try {
    savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {}

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  // ===================== DOM Refs =====================
  const refs = {
    // Modais e Formulários
    ucModal: $('#ucModal'),
    addUcBtn: $('#addUcBtn'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    ucForm: $('#ucForm'),
    modalTitleUc: $('#modalTitleUc'),
    ucIdInput: $('#ucId'),
    descricaoUcInput: $('#descricaoUc'),
    salaIdealInput: $('#salaIdeal'),
    selectInstituicao: $('#instituicaoUc'),
    statusUc: $('#statusUc'),
    alertUc: $('#alertUc'),

    // Visualizar
    visualizarUcModal: $('#visualizarUcModal'),
    closeVisualizarUcBtn: $('#closeVisualizarUcBtn'),
    fecharVisualizarUcBtn: $('#fecharVisualizarUcBtn'),
    viewFields: {
      instituicao: $('#viewInstituicaoUc'),
      descricao: $('#viewDescricaoUc'),
      sala: $('#viewSalaIdealUc'),
      status: $('#viewStatusUc')
    },

    // Tabela e Filtros
    ucTableBody: $('#ucTableBody'),
    searchInput: $('#searchUc'),
    filterInstituicao: $('#filterInstituicao'),
    filterStatus: $('#filterStatus'),
    filterCriadoDe: $('#filterCriadoDe'),
    filterCriadoAte: $('#filterCriadoAte'),

    // Paginação
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: $('#pageSize')
    }
  };

  // ===================== Persistência =====================
  function saveState() {
    const toSave = {
      pagination: { pageSize: STATE.pagination.pageSize }, // Salva apenas o tamanho da página
      filters: STATE.filters
    };
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  }

  // ===================== Utils UI =====================
  function fmtDateBR(isoLike) {
    if (!isoLike) return '—';
    const dt = new Date(isoLike);
    return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function clearAlert() {
    if (!refs.alertUc) return;
    refs.alertUc.style.display = 'none';
    refs.alertUc.className = '';
    refs.alertUc.textContent = '';
  }

  function showAlert(msg, type = 'error') {
    if (!refs.alertUc) return;
    refs.alertUc.textContent = msg;
    refs.alertUc.className = type === 'error' ? 'alert-error' : 'alert-success';
    refs.alertUc.style.display = 'block';
    if (type === 'success') setTimeout(clearAlert, 3000);
  }

  // ===================== Core Logic =====================
  
  // 1. Carregamento Inicial
  async function carregarDados() {
    try {
      const data = await safeFetch(API.bootstrap);
      STATE.instituicoes = data.instituicoes || [];
      STATE.ucs = data.ucs || [];
      
      popularSelects();
      restaurarFiltrosUI(); // Preenche inputs com valor do LocalStorage
      renderizarConteudo();
    } catch (err) {
      console.error(err);
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Erro ao carregar dados.</td></tr>`;
    }
  }

  // 2. Popula Selects (Modal e Filtro)
  function popularSelects() {
    const insts = STATE.instituicoes;
    
    // Select do Filtro
    if (refs.filterInstituicao) {
      const current = refs.filterInstituicao.value;
      refs.filterInstituicao.innerHTML = ['<option value="">Todas as instituições</option>']
        .concat(insts.map(i => `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`))
        .join('');
      if(current) refs.filterInstituicao.value = current;
    }

    // Select do Modal (Edição/Criação)
    if (refs.selectInstituicao) {
       refs.selectInstituicao.innerHTML = ['<option value="">Selecione...</option>']
        .concat(insts.map(i => `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`))
        .join('');
    }
  }

  // 3. Restaura UI baseada no Estado salvo
  function restaurarFiltrosUI() {
    if(refs.searchInput) refs.searchInput.value = STATE.filters.q || '';
    if(refs.filterInstituicao && STATE.filters.instituicoes[0]) refs.filterInstituicao.value = STATE.filters.instituicoes[0];
    if(refs.filterStatus && STATE.filters.status[0]) refs.filterStatus.value = STATE.filters.status[0];
    // Datas precisariam de conversão reversa de ISO para YYYY-MM-DD se necessário, 
    // mas simplificamos mantendo vazio se complexo.
    if(refs.pagElements.sizeSel) refs.pagElements.sizeSel.value = STATE.pagination.pageSize;
  }

  // 4. Renderização Principal (Filtro -> Paginação -> Tabela)
  function renderizarConteudo() {
    // A. Filtragem Local
    const filtered = STATE.ucs.filter(uc => {
      const f = STATE.filters;
      // Texto
      if (f.q) {
        const text = `${uc.descricao} ${uc.sala_ideal}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      // Selects
      if (f.instituicoes.length && !f.instituicoes.includes(uc.instituicao_id)) return false;
      if (f.status.length && !f.status.includes(uc.status)) return false;
      // Datas
      if (f.created_from && uc.data_criacao < f.created_from) return false;
      if (f.created_to && uc.data_criacao > f.created_to) return false;
      return true;
    });

    // B. Paginação (usa helper do geral.js)
    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    // C. Atualiza UI
    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!lista.length) {
      refs.ucTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const mapInst = new Map(STATE.instituicoes.map(i => [i._id, i.razao_social ?? i.nome]));

    refs.ucTableBody.innerHTML = lista.map(uc => `
      <tr>
        <td>${uc._id?.substring(0,8)}...</td>
        <td>${mapInst.get(uc.instituicao_id) || '—'}</td>
        <td>${uc.descricao || ''}</td>
        <td>${uc.sala_ideal || ''}</td>
        <td>${uc.status || 'Ativa'}</td>
        <td>${fmtDateBR(uc.data_criacao)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-icon btn-view" data-id="${uc._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ===================== Event Listeners =====================
  
  function setupFilters() {
    // Helper para atualizar estado e redesenhar
    const update = () => {
      STATE.pagination.page = 1; // Reseta página ao filtrar
      saveState();
      renderizarConteudo();
    };

    // Input Texto (Debounce)
    refs.searchInput?.addEventListener('input', debounce((e) => {
      STATE.filters.q = e.target.value.trim();
      update();
    }, 300));

    // Selects
    refs.filterInstituicao?.addEventListener('change', (e) => {
      STATE.filters.instituicoes = e.target.value ? [e.target.value] : [];
      update();
    });

    refs.filterStatus?.addEventListener('change', (e) => {
      STATE.filters.status = e.target.value ? [e.target.value] : [];
      update();
    });

    // Datas
    const onDateChange = () => {
      STATE.filters.created_from = toIsoStartOfDayLocal(refs.filterCriadoDe.value);
      STATE.filters.created_to = toIsoEndOfDayLocal(refs.filterCriadoAte.value);
      update();
    };
    refs.filterCriadoDe?.addEventListener('change', onDateChange);
    refs.filterCriadoAte?.addEventListener('change', onDateChange);

    // Paginação (Binds do geral.js)
    bindControls(refs.pagElements, (action, val) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      if (action === 'size') {
        STATE.pagination.pageSize = parseInt(val);
        STATE.pagination.page = 1;
      }
      saveState();
      renderizarConteudo();
    });

    // Botão Limpar
    App.ui.setupClearFilters({
      onClear: async () => {
        STATE.filters = { ...DEFAULT_STATE.filters };
        STATE.pagination.page = 1;
        
        // Limpa inputs visuais
        if(refs.searchInput) refs.searchInput.value = '';
        if(refs.filterInstituicao) refs.filterInstituicao.value = '';
        if(refs.filterStatus) refs.filterStatus.value = '';
        if(refs.filterCriadoDe) refs.filterCriadoDe.value = '';
        if(refs.filterCriadoAte) refs.filterCriadoAte.value = '';
        
        saveState();
        renderizarConteudo();
      }
    });
  }

  function setupModais() {
    // Abrir Modal
    refs.addUcBtn?.addEventListener('click', () => {
      STATE.ucEditId = null;
      refs.ucForm.reset();
      refs.ucIdInput.value = '';
      refs.modalTitleUc.textContent = 'Adicionar Nova UC';
      
      // Auto-seleciona a instituição se só houver uma
      if (STATE.instituicoes.length === 1 && refs.selectInstituicao) {
          refs.selectInstituicao.value = STATE.instituicoes[0]._id;
      }
      
      App.ui.showModal(refs.ucModal);
    });

    // Fechar Modal
    const fechar = () => {
      App.ui.hideModal(refs.ucModal);
      clearAlert();
    };
    refs.closeModalBtn?.addEventListener('click', fechar);
    refs.cancelBtn?.addEventListener('click', fechar);

    // Submit
    refs.ucForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validarForm()) return;

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
        await safeFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        alert('Operação realizada com sucesso!');
        fechar();
        carregarDados(); // Recarrega para atualizar tabela
      } catch (err) {
        console.error(err);
        showAlert('Erro ao salvar. Verifique os dados.', 'error');
      }
    });
  }

  function setupTableActions() {
    refs.ucTableBody?.addEventListener('click', async (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      if (btnView) {
        const uc = STATE.ucs.find(u => u._id === btnView.dataset.id);
        if(!uc) return;
        const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
        
        refs.viewFields.instituicao.value = inst?.razao_social || '—';
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
          carregarDados();
        } catch(err) {
          alert('Erro ao excluir: ' + err.message);
        }
      }
    });

    // Fechar modal de visualização
    const fechaView = () => App.ui.hideModal(refs.visualizarUcModal);
    refs.closeVisualizarUcBtn?.addEventListener('click', fechaView);
    refs.fecharVisualizarUcBtn?.addEventListener('click', fechaView);
  }

  function validarForm() {
    // Validação simples (pode ser expandida)
    if (!refs.selectInstituicao.value) { showAlert('Selecione a instituição'); return false; }
    if (refs.descricaoUcInput.value.length < 3) { showAlert('Descrição muito curta'); return false; }
    return true;
  }

  // ===================== Init =====================
  document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    setupModais();
    setupTableActions();
    carregarDados();
  });

})();