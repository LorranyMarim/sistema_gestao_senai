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

  /* Arquivo: assets/js/ucs_script.js */

  function popularSelectModal() {
    if (refs.selectInstituicao) {
      // Cria as opções
      refs.selectInstituicao.innerHTML = STATE.instituicoes.map(i => 
        `<option value="${i._id}">${i.razao_social ?? i.nome}</option>`
      ).join('');

      // LÓGICA NOVA: Selecionar automaticamente a primeira instituição disponível
      // Isso garante que o valor não vá vazio, já que o campo está oculto
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
        
        // Correção: usar .tipo ao invés de .sala, conforme definido em refs.viewFields
        refs.viewFields.descricao.value = uc.descricao;
        refs.viewFields.tipo.value = uc.tipo_uc; 
        refs.viewFields.status.value = uc.status;
        
        // Abre o modal
        App.ui.showModal(refs.visualizarUcModal);
      }

      // Evento: Abrir Modal de Edição (dentro do listener da tabela)
      if (btnEdit) {
        // Encontra a UC no array em memória (carregado do backend)
        const uc = STATE.ucs.find(u => u._id === btnEdit.dataset.id);
        if (!uc) return;

        STATE.ucEditId = uc._id; // Salva o ID para usar no PUT
        refs.ucIdInput.value = uc._id;
        
        // Preenche os campos
        refs.selectInstituicao.value = uc.instituicao_id || ''; // Garante seleção
        refs.descricaoUcInput.value = uc.descricao;
        refs.tipoUcInput.value = uc.tipo_uc;
        
        // Regra de Negócio: Na edição, o Status pode ser alterado
        if (refs.statusUc) {
             refs.statusUc.disabled = false; 
             refs.statusUc.value = uc.status; // Vai receber "Ativo" ou "Inativo" do banco
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

    // Evento: Abrir Modal de Adicionar
    /* Arquivo: assets/js/ucs_script.js - Dentro de setupEvents() */

    refs.addUcBtn?.addEventListener('click', () => {
      if (!refs.ucModal) return;
      
      STATE.ucEditId = null;
      refs.ucForm.reset();
      refs.ucIdInput.value = ''; 
      refs.modalTitleUc.textContent = 'Adicionar Nova Unidade Curricular';
      
      // GARANTIR A INSTITUIÇÃO: Reaplica o valor da instituição do usuário logado
      if (STATE.instituicoes.length > 0) {
          refs.selectInstituicao.value = STATE.instituicoes[0]._id;
      }

      // AJUSTE DO STATUS: Define como 'Ativo'
      if (refs.statusUc) {
        refs.statusUc.value = 'Ativo'; // Valor atualizado
        refs.statusUc.disabled = true; // Mantém travado na criação
      }

      App.ui.showModal(refs.ucModal);
    });

    const closeModal = () => App.ui.hideModal(refs.ucModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);

    // Evento: Salvar (Submit do Formulário)
    /* Arquivo: assets/js/ucs_script.js - Dentro do submit do form */

    // --- EVENTO: SALVAR (CRIAR OU EDITAR) ---
    refs.ucForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isEdit = !!STATE.ucEditId;

      // Validação: Instituição Obrigatória
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
        // 1. Envia os dados para o backend
        await safeFetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });

        // 2. Fecha o modal
        closeModal();

        // 3. Recarrega os dados do banco (Atualiza STATE.ucs)
        await carregarDadosIniciais();

        // 4. ATUALIZA A TABELA VISUALMENTE (Aplica filtros e paginação)
        renderizarConteudo();
        
        // 5. Exibe a mensagem de sucesso personalizada
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
    // 1. Mostra o loader imediatamente
    App.loader.show();

    // Configura eventos de UI (botões) para que o usuário veja a interface pronta por trás do loader,
    // ou você pode mover isso para depois do await se preferir que nada seja interativo.
    // Manter aqui permite que o DOM esteja pronto.
    setupEvents();

    try {
      // 2. Aguarda o carregamento dos dados da API
      await carregarDadosIniciais();

      // 3. Renderiza a tabela
      setupFiltersAndRender();
    } catch (err) {
      console.error('Falha na inicialização:', err);
      // Opcional: Mostrar mensagem de erro na tela
      alert('Erro ao carregar dados do sistema. Verifique sua conexão.');
    } finally {
      // 4. Esconde o loader independentemente de sucesso ou erro
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