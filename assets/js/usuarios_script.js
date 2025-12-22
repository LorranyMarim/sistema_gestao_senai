(() => {
  'use strict';

  // Verifica dependências
  if (!window.App) throw new Error('Carregue geral_script.js antes de usuarios_script.js.');

  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;
  const { isValidEmail } = App.validators;

  const LS_KEY = 'usuarios_config_state';

  // Definição das rotas para o "Proxy" PHP (que criaremos no Passo 5)
  const API = Object.freeze({
    list: '../backend/processa_usuarios.php?action=list',
    save: '../backend/processa_usuarios.php', // POST (cria) ou PUT (atualiza)
    password: '../backend/processa_usuarios.php?action=update_password' // PATCH
  });

  const DEFAULT_STATE = {
    usuarios: [],
    editId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', status: ['Todos'], tipoUsuario: 'Todos' },
    formOriginalState: null // Para controle de 'dirty' (alterações não salvas)
  };

  // Recupera estado salvo do localStorage se existir
  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  // Referências aos elementos do DOM
  const refs = {
    // Listagem
    tableBody: $('#userTableBody'),
    filterArea: $('#filter_area'),
    addUserBtn: $('#addUserBtn'),
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: null
    },

    // Modal Principal (Criação/Edição)
    userModal: $('#userModal'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    userForm: $('#userForm'),
    modalTitle: $('#modalTitleUser'),
    
    // Campos do Formulário Principal
    inpId: $('#userId'),
    inpNome: $('#nomeUser'),
    inpEmail: $('#emailUser'),
    selTipo: $('#tipoUser'),
    selStatus: $('#statusUser'),
    divSenhaCadastro: $('#divSenhaCadastro'),
    inpSenha: $('#senhaUser'),
    inpConfirmaSenha: $('#confirmaSenhaUser'),
    
    // Seção de alteração de senha (Edição)
    divBtnAlterarSenha: $('#divBtnAlterarSenha'),
    btnOpenChangePassword: $('#btnOpenChangePassword'),

    // Sub-modal (Troca de Senha)
    changePasswordModal: $('#changePasswordModal'),
    changePasswordForm: $('#changePasswordForm'),
    inpNovaSenha: $('#novaSenha'),
    inpConfirmaNovaSenha: $('#confirmaNovaSenha'),
    cancelChangePasswordBtn: $('#cancelChangePasswordBtn'),

    // Visualização
    visualizarModal: $('#visualizarUserModal'),
    closeVisualizarBtn: $('#closeVisualizarUserBtn'),
    fecharVisualizarBtn: $('#fecharVisualizarUserBtn'),
    viewFields: {
      nome: $('#viewNomeUser'),
      email: $('#viewEmailUser'),
      tipo: $('#viewTipoUser'),
      status: $('#viewStatusUser'),
    }
  };

  // --- Funções de Estado e Persistência ---

  function saveLocalStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }

  // --- Carregamento de Dados ---

  async function carregarDados() {
    try {
      const data = await safeFetch(API.list);
      // A API retorna lista direta de usuários
      STATE.usuarios = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(err);
      refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-600">Erro ao carregar usuários.</td></tr>`;
    }
  }

  // --- Renderização ---

  function applyFiltersFromUI() {
    const elSearch = document.getElementById('gen_search');
    STATE.filters.q = (elSearch?.value || '').trim();

    const elStatus = document.getElementById('gen_status');
    STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];
    const elTipo = document.getElementById('gen_tipo_usuario');
    STATE.filters.tipoUsuario = elTipo ? elTipo.value : 'Todos';
    const elSize = document.getElementById('gen_pagesize');
    if (elSize) {
      STATE.pagination.pageSize = parseInt(elSize.value, 10);
      refs.pagElements.sizeSel = elSize;
    }
  }

  function renderizarConteudo() {
    applyFiltersFromUI();
    saveLocalStorage();

    // Filtragem Local
    const filtered = STATE.usuarios.filter(u => {
      const f = STATE.filters;
      // Filtro de Texto (Nome ou Email)
      if (f.q) {
        const text = `${u.nome} ${u.user_name}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      // Filtro de Status
      if (f.status[0] !== 'Todos') {
        // Normaliza status vindo do banco ou do filtro
        const st = (u.status || 'Ativo').toLowerCase();
        const fSt = f.status[0].toLowerCase();
        if (st !== fSt) return false;
      }
      if (f.tipoUsuario && f.tipoUsuario !== 'Todos') {
        if (u.tipo_acesso !== f.tipoUsuario) return false;
      }
      return true;
    });

    // Paginação
    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!lista.length) {
      refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const fmtData = App.format.fmtDateBR; 

    refs.tableBody.innerHTML = lista.map(u => {
      // Determina classe de status para visualização
      const statusClass = (u.status === 'Inativo') ? 'text-red-500 font-bold' : 'text-green-600';
      
      return `
      <tr>
        <td class="hidden-col">${u._id || ''}</td>
        <td class="hidden-col">${u.instituicao_id || ''}</td>
        <td>${u.nome || ''}</td>
        <td>${u.user_name || ''}</td>
        <td>${u.tipo_acesso || ''}</td>
        <td><span class="${statusClass}">${u.status || 'Ativo'}</span></td>
        <td>${fmtData(u.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view" data-id="${u._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${u._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${u._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  // --- Lógica do Modal e Formulário ---

  // Captura o estado atual do formulário como string JSON para comparação
  function getFormState() {
    const fd = new FormData(refs.userForm);
    return JSON.stringify(Object.fromEntries(fd));
  }

  // Tenta fechar o modal, verificando alterações
  function tryCloseModal() {
    const current = getFormState();
    if (STATE.formOriginalState && current !== STATE.formOriginalState) {
      if (!confirm('Existem alterações não salvas. Deseja realmente sair e descartar as mudanças?')) {
        return; // Cancela fechamento
      }
    }
    App.ui.hideModal(refs.userModal);
    STATE.editId = null;
    STATE.formOriginalState = null;
    refs.userForm.reset();
  }

  function openModalCadastro() {
    STATE.editId = null;
    refs.userForm.reset();
    refs.inpId.value = '';
    
    // Configuração de UI para Cadastro
    refs.modalTitle.textContent = 'Cadastrar Novo Usuário';
    refs.divSenhaCadastro.style.display = 'block';     // Mostra inputs de senha
    refs.divBtnAlterarSenha.style.display = 'none';    // Esconde botão de troca de senha
    refs.inpEmail.readOnly = false;                    // Email editável no cadastro
    
    // Inputs de senha obrigatórios no cadastro
    refs.inpSenha.required = true;
    refs.inpConfirmaSenha.required = true;

    // Define estado 'Ativo' como padrão e desabilita alteração no cadastro inicial se desejar, 
    // ou deixa livre. Requisito diz: "Status (Disabled: Ativo)" para criação?
    // O requisito diz "Status (Disabled: Ativo)". Vamos forçar:
    refs.selStatus.value = 'Ativo';
    refs.selStatus.disabled = true; // Desabilita o campo no cadastro
    // refs.selStatus.disabled = true; // Se quiser bloquear visualmente. Vamos manter habilitado mas padrão Ativo.

    App.ui.showModal(refs.userModal);
    STATE.formOriginalState = getFormState();
  }

  function openModalEdicao(user) {
    STATE.editId = user._id;
    
    // Preenche campos
    refs.inpId.value = user._id;
    refs.inpNome.value = user.nome;
    refs.inpEmail.value = user.user_name;
    refs.selTipo.value = user.tipo_acesso;
    refs.selStatus.value = user.status || 'Ativo';
    refs.selStatus.disabled = false;
    
    // Configuração de UI para Edição
    refs.modalTitle.textContent = 'Editar Usuário';
    refs.divSenhaCadastro.style.display = 'none';      // Esconde inputs de senha principais
    refs.divBtnAlterarSenha.style.display = 'block';   // Mostra botão de sub-modal
    refs.inpEmail.readOnly = false;                    // Permite editar email (API trata duplicidade)

    // Inputs de senha principais não são usados aqui
    refs.inpSenha.required = false;
    refs.inpConfirmaSenha.required = false;

    // refs.selStatus.disabled = false; // Garante que esteja habilitado na edição

    App.ui.showModal(refs.userModal);
    STATE.formOriginalState = getFormState();
  }

  async function handleSaveUser(e) {
    e.preventDefault();

    // Validações básicas de Frontend
    if (refs.inpNome.value.trim().length < 3) {
      alert('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    if (!isValidEmail(refs.inpEmail.value)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }

    // Se for cadastro, validar senhas
    if (!STATE.editId) {
      const s1 = refs.inpSenha.value;
      const s2 = refs.inpConfirmaSenha.value;
      if (s1 !== s2) {
        alert('As senhas digitadas não coincidem.');
        return;
      }
      if (s1.length < 6) {
        alert('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
    }

    const payload = {
      nome: refs.inpNome.value.trim(),
      user_name: refs.inpEmail.value.trim(),
      tipo_acesso: refs.selTipo.value,
      status: refs.selStatus.value
    };

    // Adiciona senha ao payload apenas se for criação
    if (!STATE.editId) {
      payload.senha = refs.inpSenha.value;
    }

    // Determina URL e Método
    const url = STATE.editId 
      ? `${API.save}?id=${STATE.editId}` 
      : API.save;
    
    const method = STATE.editId ? 'PUT' : 'POST';

    try {
      App.loader.show();
      await safeFetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });

      // Sucesso
      STATE.formOriginalState = null; // Reseta dirty check para permitir fechar
      App.ui.hideModal(refs.userModal);
      await carregarDados();
      renderizarConteudo();
      alert('Usuário salvo com sucesso!');

    } catch (err) {
      alert(err.message || 'Erro ao salvar usuário.');
    } finally {
      App.loader.hide();
    }
  }

  // --- Lógica de Alteração de Senha (Sub-modal) ---

  function openChangePasswordModal() {
    refs.changePasswordForm.reset();
    App.ui.showModal(refs.changePasswordModal);
  }

  function closeChangePasswordModal() {
    App.ui.hideModal(refs.changePasswordModal);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    
    if (!STATE.editId) return; // Segurança

    const s1 = refs.inpNovaSenha.value;
    const s2 = refs.inpConfirmaNovaSenha.value;

    if (s1 !== s2) {
      alert('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (s1.length < 6) {
      alert('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      App.loader.show();
      // Chama endpoint específico de PATCH
      const url = `${API.password}&id=${STATE.editId}`;
      
      await safeFetch(url, {
        method: 'POST', // O PHP vai traduzir isso para o PATCH do Python ou chamará a função correta
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nova_senha: s1 })
      });

      alert('Senha alterada com sucesso!');
      closeChangePasswordModal();

    } catch (err) {
      alert(err.message || 'Erro ao alterar a senha.');
    } finally {
      App.loader.hide();
    }
  }

  // --- Inicialização e Eventos ---

  function setupEvents() {
    // Paginação
    bindControls(refs.pagElements, (action) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    // Ações da Tabela
    refs.tableBody?.addEventListener('click', (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      // Visualizar
      if (btnView) {
        const u = STATE.usuarios.find(x => x._id === btnView.dataset.id);
        if (u) {
          refs.viewFields.nome.value = u.nome;
          refs.viewFields.email.value = u.user_name;
          refs.viewFields.tipo.value = u.tipo_acesso;
          refs.viewFields.status.value = u.status;format.fmtDateBR(u.data_criacao);
          App.ui.showModal(refs.visualizarModal);
        }
      }

      // Editar
      if (btnEdit) {
        const u = STATE.usuarios.find(x => x._id === btnEdit.dataset.id);
        if (u) openModalEdicao(u);
      }

      // Excluir (Bloqueado por regra de negócio)
      if (btnDel) {
        alert("O usuário deve ser inativado através da edição, pois o sistema não permite a exclusão definitiva.");
      }
    });

    // Botão Adicionar
    refs.addUserBtn?.addEventListener('click', openModalCadastro);

    // Fechamento Modal Principal (Dirty Check)
    refs.closeModalBtn?.addEventListener('click', tryCloseModal);
    refs.cancelBtn?.addEventListener('click', tryCloseModal);

    // Salvar Principal
    refs.userForm?.addEventListener('submit', handleSaveUser);

    // Sub-modal Senha
    refs.btnOpenChangePassword?.addEventListener('click', openChangePasswordModal);
    refs.cancelChangePasswordBtn?.addEventListener('click', closeChangePasswordModal);
    refs.changePasswordForm?.addEventListener('submit', handleChangePassword);

    // Fechar Visualização
    const closeVis = () => App.ui.hideModal(refs.visualizarModal);
    refs.closeVisualizarBtn?.addEventListener('click', closeVis);
    refs.fecharVisualizarBtn?.addEventListener('click', closeVis);
  }

  function setupFilters() {
    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area',
        // ATIVE O NOVO FILTRO AQUI
        { search: true, status: true, pageSize: true, tipoUsuario: true }, 
        null, 
        () => { // onChange
          STATE.pagination.page = 1;
          renderizarConteudo();
        },
        () => { // onClear
          STATE.filters = { ...DEFAULT_STATE.filters };
          STATE.pagination.page = 1;
          renderizarConteudo();
        }
      );
    }
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', async () => {
    App.loader.show();
    setupEvents();
    
    try {
      await carregarDados();
      setupFilters();
      
      // Restaura valores de filtro na UI se houver estado salvo
      if (STATE.filters.q && document.getElementById('gen_search'))
          document.getElementById('gen_search').value = STATE.filters.q;
      
      renderizarConteudo();
    } catch (err) {
      console.error('Falha na inicialização:', err);
    } finally {
      App.loader.hide();
    }
  });

})();