(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral_script.js antes de usuarios_script.js.');

  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  const LS_KEY = 'usuarios_gestao_state_v1';

  // Configuração da API
  const API = Object.freeze({
    bootstrap: '../backend/processa_usuarios.php?action=bootstrap',
    users: '../backend/processa_usuarios.php',
  });

  const DEFAULT_STATE = {
    instituicoes: [],
    users: [],
    userEditId: null,
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
    // Modais e Botões Principais
    userModal: $('#userModal'),
    addUserBtn: $('#addUserBtn'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    userForm: $('#userForm'),
    modalTitleUser: $('#modalTitleUser'),
    
    // Campos do Formulário
    userIdInput: $('#userId'),
    nomeUserInput: $('#nomeUser'),
    emailUserInput: $('#emailUser'),
    tipoUserInput: $('#tipoUser'),
    senhaUserInput: $('#senhaUser'),
    confirmaSenhaInput: $('#confirmaSenhaUser'),
    lblSenha: $('#lblSenha'),
    lblConfirmaSenha: $('#lblConfirmaSenha'),
    selectInstituicao: $('#instituicaoUser'),
    statusUser: $('#statusUser'),
    
    // Tabela e Paginação
    userTableBody: $('#userTableBody'),
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: null
    },

    // Modal de Visualização
    visualizarUserModal: $('#visualizarUserModal'),
    closeVisualizarUserBtn: $('#closeVisualizarUserBtn'),
    fecharVisualizarUserBtn: $('#fecharVisualizarUserBtn'),
    viewFields: {
      nome: $('#viewNomeUser'),
      email: $('#viewEmailUser'),
      tipo: $('#viewTipoUser'),
      status: $('#viewStatusUser')
    },

    // Modal de Mensagem do Sistema
    systemMessageModal: $('#systemMessageModal'),
    systemMessageText: $('#systemMessageText'),
    closeSystemMessageBtn: $('#closeSystemMessageBtn')
  };

  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }

  // --- Função para Exibir Mensagem Personalizada ---
  const exibirMensagem = (texto) => {
    if (refs.systemMessageModal && refs.systemMessageText) {
        refs.systemMessageText.textContent = texto;
        App.ui.showModal(refs.systemMessageModal);
    } else {
        alert(texto);
    }
  };

  // Substitua a função carregarDadosIniciais atual por esta:
  async function carregarDadosIniciais() {
    try {
      // O App.loader já foi iniciado no DOMContentLoaded, então aqui só buscamos os dados
      const data = await safeFetch(API.users); 
      
      // Ajuste para garantir que STATE.users seja sempre um array
      // Verifica se a API retornou array direto ou um objeto com chave "items" ou "usuarios"
      if (Array.isArray(data)) {
         STATE.users = data;
      } else if (data.items) {
         STATE.users = data.items;
      } else {
         STATE.users = []; 
      }
      
    } catch (err) {
      console.error(err);
      refs.userTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
    }
  }

  function popularSelectModal() {
    // Se houver lógica de instituição vinda do backend, popula aqui.
    // Caso contrário, deixa vazio ou com valor fixo se o backend pegar do token.
  }

  function applyFiltersFromUI() {
    // Filtros podem ser implementados se houver UI para eles na tela
  }

  function renderizarConteudo() {
    saveState();

    // Filtros básicos no frontend (Busca textual)
    const filtered = STATE.users.filter(u => {
      // Exemplo de filtro simples
      return true; 
    });

    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  // Dentro de usuarios_script.js
// ...
  function renderTable(lista) {
    if (!lista.length) {
      refs.userTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const fmtData = (d) => {
      if (!d) return '-';
      try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; }
    };

    refs.userTableBody.innerHTML = lista.map(u => {
        // Lógica para badge de status visual
        // O banco retorna string "Ativo", "Inativo" ou "Bloqueado" no campo 'status'
        const statusTexto = u.status || 'Inativo';
        
        // Define cor do texto baseado no status (opcional, para melhor UX)
        let statusClass = 'text-gray-600';
        if(statusTexto === 'Ativo') statusClass = 'text-green-600 font-bold';
        if(statusTexto === 'Inativo') statusClass = 'text-red-600';

        return `
      <tr>
        <td class="hidden-col">${u.id}</td> 
        <td class="hidden-col">${u.instituicao_id || '-'}</td>
        <td>${u.nome || '(Sem Nome)'}</td>
        <td>${u.user_name || ''}</td> 
        <td>${u.tipo_acesso || 'Padrao'}</td>
        <td><span class="${statusClass}">${statusTexto}</span></td>
        <td>${fmtData(u.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view text-blue-500" data-id="${u.id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit text-yellow-500" data-id="${u.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete text-red-500" data-id="${u.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  }
// ...

  function setupEvents() {
    // Paginação
    bindControls(refs.pagElements, (action, val) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    // Mensagem do Sistema
    refs.closeSystemMessageBtn?.addEventListener('click', () => {
        App.ui.hideModal(refs.systemMessageModal);
    });

    // Eventos da Tabela (View, Edit, Delete)
    refs.userTableBody?.addEventListener('click', async (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      // --- MUDANÇA 5: DETALHES DO USUÁRIO ---
      if (btnView) {
        const user = STATE.users.find(u => (u.id || u._id) === btnView.dataset.id);
        if (!user) return;
        
        refs.viewFields.nome.value = user.nome;
        refs.viewFields.email.value = user.user_name;
        refs.viewFields.tipo.value = user.tipo_acesso;
        refs.viewFields.status.value = (user.ativo === true || user.ativo === 'true' || user.ativo === 1) ? 'Ativo' : 'Inativo';
        
        App.ui.showModal(refs.visualizarUserModal);
      }

      // --- MUDANÇA 6: EDITAR USUÁRIO ---
      if (btnEdit) {
        const user = STATE.users.find(u => (u.id || u._id) === btnEdit.dataset.id);
        if (!user) return;

        STATE.userEditId = user.id || user._id;
        refs.userIdInput.value = STATE.userEditId;
        
        // Preenche campos
        refs.nomeUserInput.value = user.nome;
        refs.emailUserInput.value = user.user_name;
        refs.tipoUserInput.value = user.tipo_acesso;
        
        // Ajusta Status
        refs.statusUser.disabled = false;
        refs.statusUser.value = (user.ativo === true || user.ativo === 'true' || user.ativo === 1) ? 'Ativo' : 'Inativo';

        // Título e Labels
        refs.modalTitleUser.textContent = 'Editar/Alterar Dados do Usuário';
        refs.lblSenha.textContent = 'Cadastrar Nova Senha:';
        refs.lblConfirmaSenha.textContent = 'Repetir Nova Senha:';
        
        // Limpa senhas (não mostramos senha antiga)
        refs.senhaUserInput.value = '';
        refs.confirmaSenhaInput.value = '';
        
        App.ui.showModal(refs.userModal);
      }

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        try {
          await safeFetch(`${API.users}/${btnDel.dataset.id}`, { method: 'DELETE' }); // Ajuste de rota RESTful se necessário
          await carregarDadosIniciais();
          renderizarConteudo();
          exibirMensagem('Usuário removido com sucesso!');
        } catch (err) { 
            exibirMensagem('Erro ao excluir usuário.'); 
        }
      }
    });

    // --- MUDANÇA 3: CADASTRAR USUÁRIO ---
    refs.addUserBtn?.addEventListener('click', () => {
      if (!refs.userModal) return;
      
      STATE.userEditId = null;
      refs.userForm.reset();
      refs.userIdInput.value = ''; 
      
      // Configuração Visual
      refs.modalTitleUser.textContent = 'Cadastrar Novo Usuário';
      refs.lblSenha.textContent = 'Cadastrar Senha:';
      refs.lblConfirmaSenha.textContent = 'Confirme a Senha:';
      
      // Status Default e Travado
      refs.statusUser.value = 'Ativo';
      refs.statusUser.disabled = true;

      App.ui.showModal(refs.userModal);
    });

    // Fechar Modais
    const closeModal = () => App.ui.hideModal(refs.userModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);
    refs.cancelBtn?.addEventListener('click', closeModal);
    
    const closeView = () => App.ui.hideModal(refs.visualizarUserModal);
    refs.closeVisualizarUserBtn?.addEventListener('click', closeView);
    refs.fecharVisualizarUserBtn?.addEventListener('click', closeView);

    // --- SALVAR (SUBMIT) ---
    refs.userForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isEdit = !!STATE.userEditId;

      // Validação de Senha
      const senha = refs.senhaUserInput.value;
      const confirma = refs.confirmaSenhaInput.value;

      if (!isEdit && !senha) {
          exibirMensagem("A senha é obrigatória para novos usuários.");
          return;
      }
      if (senha && senha !== confirma) {
          exibirMensagem("As senhas não conferem.");
          return;
      }

      // Monta Payload
      const payload = {
        nome: refs.nomeUserInput.value.trim(),
        user_name: refs.emailUserInput.value.trim(),
        tipo_acesso: refs.tipoUserInput.value,
        // Backend espera booleano para 'ativo'
        ativo: isEdit ? (refs.statusUser.value === 'Ativo') : true 
      };

      // Se tiver senha preenchida, adiciona ao payload
      if (senha) {
          payload.senha = senha;
      }

      const url = isEdit ? `${API.users}/${STATE.userEditId}` : API.users;
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
          // Tenta extrair mensagem de erro da API se possível
          exibirMensagem('Erro ao salvar. Verifique os dados.'); 
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    App.loader.show();
    setupEvents();
    try {
      await carregarDadosIniciais();
      renderizarConteudo();
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados.');
    } finally {
      App.loader.hide();
    }
  });

})();