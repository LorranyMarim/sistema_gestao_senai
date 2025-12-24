(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral_script.js antes de empresas_script.js.');

  const { $, $$ } = App.dom;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  const LS_KEY = 'empresas_gestao_state_v1';

  const API = Object.freeze({
    bootstrap: '../backend/processa_empresa.php?action=bootstrap',
    empresa: '../backend/processa_empresa.php',
  });

  const DEFAULT_STATE = {
    instituicoes: [],
    empresas: [],
    empresaEditId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', status: ['Todos'], created_from: '', created_to: '' },
  };

  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  const refs = {
    empresaModal: $('#empresaModal'),
    addEmpresaBtn: $('#addEmpresaBtn'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    empresaForm: $('#empresaForm'),
    modalTitleEmpresa: $('#modalTitleEmpresa'),
    
    empresaIdInput: $('#empresaId'),
    razaoSocialInput: $('#razaoSocial'),
    cnpjInput: $('#cnpjEmpresa'), 
    selectInstituicao: $('#instituicaoEmpresa'),
    statusEmpresa: $('#statusEmpresa'),
    alertEmpresa: $('#alertEmpresa'),
    
    empresaTableBody: $('#empresaTableBody'),
    
    visualizarEmpresaModal: $('#visualizarEmpresaModal'),
    closeVisualizarEmpresaBtn: $('#closeVisualizarEmpresaBtn'),
    fecharVisualizarEmpresaBtn: $('#fecharVisualizarEmpresaBtn'),
    viewFields: {
      razaoSocial: $('#viewRazaoSocial'),
      cnpj: $('#viewCnpj'),
      status: $('#viewStatusEmpresa')
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
      
      STATE.empresas = Array.isArray(data.empresas) ? data.empresas : (Array.isArray(data) ? data : []);

      popularSelectModal();
    } catch (err) {
      console.error(err);
      refs.empresaTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
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

    const filtered = STATE.empresas.filter(emp => {
      const f = STATE.filters;
      
      if (f.q) {
        const text = `${emp.razao_social} ${emp.cnpj || ''}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      
      if (f.status[0] !== 'Todos') {
          const statusItem = (emp.status || 'Ativo').toLowerCase();
          const filtroStatus = f.status[0].toLowerCase();
          if (statusItem !== filtroStatus) return false;
      }

      if (f.created_from && emp.data_criacao < f.created_from) return false;
      if (f.created_to && emp.data_criacao > f.created_to) return false;

      return true;
    });

    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!lista.length) {
      refs.empresaTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const fmtData = App.format.fmtDateBR;

    refs.empresaTableBody.innerHTML = lista.map(emp => {
        // Regra de estilização do Status
        const statusClass = (emp.status === 'Inativo') ? 'text-red-500 font-bold' : 'text-green-600 font-bold';
        
        return `
      <tr>
        <td>${emp.razao_social || ''}</td>
        <td>${emp.cnpj || '—'}</td>
        <td><span class="${statusClass}">${emp.status || 'Ativo'}</span></td>
        <td>${fmtData(emp.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view" data-id="${emp._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${emp._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${emp._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  function setupFilters() {
    if (App.filters && App.filters.render) {
      // Configuração dos filtros: search, date, status, pageSize. "tipoUc" removido.
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

  function openModalCadastro() {
      STATE.empresaEditId = null;
      refs.empresaForm.reset();
      refs.empresaIdInput.value = '';
      refs.modalTitleEmpresa.textContent = 'Adicionar Nova Empresa';
      
      // Regra: Status readonly e disabled na criação, valor padrão Ativo
      refs.statusEmpresa.value = 'Ativo';
      refs.statusEmpresa.disabled = true; 

      if (STATE.instituicoes.length > 0 && !refs.selectInstituicao.value) {
        refs.selectInstituicao.value = STATE.instituicoes[0]._id;
      }

      App.ui.showModal(refs.empresaModal);
  }

  function openModalEdicao(emp) {
      STATE.empresaEditId = emp._id;
      
      refs.empresaIdInput.value = emp._id;
      refs.razaoSocialInput.value = emp.razao_social || '';
      refs.cnpjInput.value = emp.cnpj || '';
      refs.selectInstituicao.value = emp.instituicao_id || '';
      
      refs.statusEmpresa.value = emp.status || 'Ativo';
      // Na edição, o status pode ser alterado
      refs.statusEmpresa.disabled = false;
      
      refs.modalTitleEmpresa.textContent = 'Editar/Alterar Dados da Empresa';
      App.ui.showModal(refs.empresaModal);
  }

  function setupEvents() {
    bindControls(refs.pagElements, (action) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    refs.empresaTableBody?.addEventListener('click', async (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      if (btnView) {
        const emp = STATE.empresas.find(u => u._id === btnView.dataset.id);
        if (!emp) return;
        refs.viewFields.razaoSocial.value = emp.razao_social || '';
        refs.viewFields.cnpj.value = emp.cnpj || '';
        refs.viewFields.status.value = emp.status || '';
        App.ui.showModal(refs.visualizarEmpresaModal);
      }

      if (btnEdit) {
        const emp = STATE.empresas.find(u => u._id === btnEdit.dataset.id);
        if (emp) openModalEdicao(emp);
      }

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir esta Empresa?')) return;
        try {
            App.loader.show();
            await safeFetch(`${API.empresa}?id=${btnDel.dataset.id}`, { method: 'DELETE' });
            await carregarDadosIniciais();
            renderizarConteudo();
            alert('Removido com sucesso.');
        } catch (err) { 
            alert('Erro ao excluir: ' + err.message); 
        } finally {
            App.loader.hide();
        }
      }
    });

    refs.addEmpresaBtn?.addEventListener('click', openModalCadastro);

    const closeModal = () => App.ui.hideModal(refs.empresaModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);

    refs.empresaForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!refs.selectInstituicao.value) {
          if(STATE.instituicoes.length > 0) refs.selectInstituicao.value = STATE.instituicoes[0]._id;
          else {
              alert('Erro: Nenhuma instituição vinculada para salvar a empresa.');
              return;
          }
      }

      const isEdit = !!STATE.empresaEditId;

      const payload = {
        razao_social: refs.razaoSocialInput.value.trim(),
        cnpj: refs.cnpjInput.value.trim(),
        instituicao_id: refs.selectInstituicao.value,
        // Se for edição, pega o valor do select, senão força Ativo
        status: isEdit ? refs.statusEmpresa.value : 'Ativo'
      };

      const url = isEdit ? `${API.empresa}?id=${STATE.empresaEditId}` : API.empresa;
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

    const closeView = () => App.ui.hideModal(refs.visualizarEmpresaModal);
    refs.closeVisualizarEmpresaBtn?.addEventListener('click', closeView);
    refs.fecharVisualizarEmpresaBtn?.addEventListener('click', closeView);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Exibe o loader ao carregar
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