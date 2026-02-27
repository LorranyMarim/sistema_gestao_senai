(() => {
  'use strict';

  if (!window.App) throw new Error('Carregue geral_script.js antes de usuarios_script.js.');

  let currentUserRole = 'Administrador';
  const { $, $$ } = App.dom;
  const { debounce, toIsoStartOfDayLocal, toIsoEndOfDayLocal } = App.utils;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;
  const { isValidEmail } = App.validators;

  const LS_KEY = 'usuarios_config_state';

  const API = Object.freeze({
    list: '../backend/processa_usuarios.php?action=list',
    save: '../backend/processa_usuarios.php', 
    password: '../backend/processa_usuarios.php?action=update_password'
  });

  const DEFAULT_STATE = {
    usuarios: [],
    editId: null,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', status: ['Todos'], tipoUsuario: 'Todos' },
    formOriginalState: null 
  };

  
  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };
  
  const refs = {
    tableBody: $('#userTableBody'),
    filterArea: $('#filter_area'),
    addUserBtn: $('#addUserBtn'),
    pagElements: {
      prev: $('#prevPage'),
      next: $('#nextPage'),
      info: $('#pageInfo'),
      sizeSel: null
    },

    userModal: $('#userModal'),
    closeModalBtn: $('#closeModalBtn'),
    cancelBtn: $('#cancelBtn'),
    userForm: $('#userForm'),
    modalTitle: $('#modalTitleUser'),
    
    inpId: $('#userId'),
    inpNome: $('#nomeUser'),
    inpEmail: $('#emailUser'),
    selTipo: $('#tipoUser'),
    selStatus: $('#statusUser'),
    divSenhaCadastro: $('#divSenhaCadastro'),
    inpSenha: $('#senhaUser'),
    inpConfirmaSenha: $('#confirmaSenhaUser'),
    
    divBtnAlterarSenha: $('#divBtnAlterarSenha'),
    btnOpenChangePassword: $('#btnOpenChangePassword'),

    changePasswordModal: $('#changePasswordModal'),
    changePasswordForm: $('#changePasswordForm'),
    inpNovaSenha: $('#novaSenha'),
    inpConfirmaNovaSenha: $('#confirmaNovaSenha'),
    cancelChangePasswordBtn: $('#cancelChangePasswordBtn'),

    visualizarModal: $('#visualizarUserModal'),
    closeVisualizarBtn: $('#closeVisualizarUserBtn'),
    fecharVisualizarBtn: $('#fecharVisualizarUserBtn'),
    viewFields: {
      nome: $('#viewNomeUser'),
      email: $('#viewEmailUser'),
      tipo: $('#viewTipoUser'),
      status: $('#viewStatusUser'),
      auditInfo: $('#auditInfoUser'),
      dataCriacao: $('#viewDataCriacao'),
      dataAtualizacao: $('#viewDataAtualizacao'),
      alteradoPor: $('#viewAlteradoPor')
    }
  };

  function saveLocalStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }


  async function carregarDados() {
    try {
      const data = await safeFetch(API.list);
      STATE.usuarios = Array.isArray(data) ? data : [];
      if (STATE.usuarios.length > 0) {
        const hasAdmin = STATE.usuarios.some(u => u.tipo_acesso === 'Administrador');
        currentUserRole = (STATE.usuarios.length === 1 && !hasAdmin) 
          ? STATE.usuarios[0].tipo_acesso 
          : 'Administrador';
      }
      if (currentUserRole !== 'Administrador') {
        if (refs.addUserBtn) refs.addUserBtn.style.display = 'none';
      }
      

    } catch (err) {
      console.error(err);
      refs.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-600">Erro ao carregar usuários.</td></tr>`;
    }
  }


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

    const filtered = STATE.usuarios.filter(u => {
      const f = STATE.filters;
      if (f.q) {
        const text = `${u.nome} ${u.user_name}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      if (f.status[0] !== 'Todos') {
        const st = (u.status || 'Ativo').toLowerCase();
        const fSt = f.status[0].toLowerCase();
        if (st !== fSt) return false;
      }
      if (f.tipoUsuario && f.tipoUsuario !== 'Todos') {
        if (u.tipo_acesso !== f.tipoUsuario) return false;
      }
      return true;
    });

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
      const statusClass = (u.status === 'Inativo') ? 'text-red-500 font-bold' : 'text-green-600';
      
      // Remove botões de exclusão (inativação) para perfis que não são Administradores
      const deleteBtnHtml = currentUserRole === 'Administrador' 
        ? `<button class="btn btn-icon btn-delete" data-id="${u._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>`
        : '';

      return `
      <tr>
        <td class="hidden-col">${u._id || ''}</td>
        <td class="hidden-col">${u.instituicao_id || ''}</td>
        <td>${u.nome || ''}</td>
        <td>${u.user_name || ''}</td>
        <td>${u.tipo_acesso || ''}</td>
        <td><span class="${statusClass}">${u.status || 'Ativo'}</span></td>
        <td>${fmtData(u.alterado_em || u.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
            <button class="btn btn-icon btn-view" data-id="${u._id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${u._id}" title="Editar"><i class="fas fa-edit"></i></button>
            ${deleteBtnHtml}
          </div>
        </td>
      </tr>
    `}).join('');
  }

  function getFormState() {
    const fd = new FormData(refs.userForm);
    return JSON.stringify(Object.fromEntries(fd));
  }

  function tryCloseModal() {
    const current = getFormState();
    if (STATE.formOriginalState && current !== STATE.formOriginalState) {
      if (!confirm('Existem alterações não salvas. Deseja realmente sair e descartar as mudanças?')) {
        return; 
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
    
    refs.modalTitle.textContent = 'Cadastrar Novo Usuário';
    refs.divSenhaCadastro.style.display = 'block';    
    refs.divBtnAlterarSenha.style.display = 'none';    
    refs.inpEmail.readOnly = false;                    
    refs.inpSenha.required = true;
    refs.inpConfirmaSenha.required = true;
    refs.selStatus.value = 'Ativo';
    refs.selStatus.disabled = true; 
    App.ui.showModal(refs.userModal);
    STATE.formOriginalState = getFormState();
  }

  function openModalEdicao(user) {
    STATE.editId = user._id;
    refs.inpId.value = user._id;
    refs.inpNome.value = user.nome;
    refs.inpEmail.value = user.user_name;
    refs.selTipo.value = user.tipo_acesso;
    refs.selStatus.value = user.status || 'Ativo';
    refs.selStatus.disabled = false;
    
    refs.modalTitle.textContent = 'Editar Usuário';
    refs.divSenhaCadastro.style.display = 'none';     
    refs.divBtnAlterarSenha.style.display = 'block';  
    refs.inpEmail.readOnly = false;              
    refs.inpSenha.required = false;
    refs.inpConfirmaSenha.required = false;
    if (currentUserRole !== 'Administrador') {
        refs.selTipo.disabled = true;
        refs.selStatus.disabled = true;
    } else {
        refs.selTipo.disabled = false;
        refs.selStatus.disabled = false;
    }
    App.ui.showModal(refs.userModal);
    STATE.formOriginalState = getFormState();
  }

  async function handleSaveUser(e) {
    e.preventDefault();

    if (refs.inpNome.value.trim().length < 3) {
      alert('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(refs.inpEmail.value)) {
      alert('Por favor, insira um e-mail válido (ex: seu.nome@dominio.com).');
      return;
    }
    if (!isValidEmail(refs.inpEmail.value)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }

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

    if (!STATE.editId) {
      payload.senha = refs.inpSenha.value;
    }

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

      STATE.formOriginalState = null; 
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


  function openChangePasswordModal() {
    refs.changePasswordForm.reset();
    App.ui.showModal(refs.changePasswordModal);
  }

  function closeChangePasswordModal() {
    App.ui.hideModal(refs.changePasswordModal);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    
    if (!STATE.editId) return;
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
      const url = `${API.password}&id=${STATE.editId}`;
      
      await safeFetch(url, {
        method: 'POST', 
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


  function setupEvents() {
    bindControls(refs.pagElements, (action) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    refs.tableBody?.addEventListener('click', (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnDel = e.target.closest('.btn-delete');

      if (btnView) {
        const u = STATE.usuarios.find(x => x._id === btnView.dataset.id);
        if (u) {
          refs.viewFields.nome.value = u.nome;
          refs.viewFields.email.value = u.user_name;
          refs.viewFields.tipo.value = u.tipo_acesso;
          refs.viewFields.status.value = u.status;
          
          if (refs.viewFields.auditInfo) {
            refs.viewFields.auditInfo.style.display = 'block';
            
            // Função local para formatar Data e Hora (Ex: 20/09/2025 às 14:32)
            const formatarDataHora = (isoStr) => {
              if (!isoStr) return '--/--/---- às --:--';
              const d = new Date(isoStr);
              const dia = String(d.getDate()).padStart(2, '0');
              const mes = String(d.getMonth() + 1).padStart(2, '0');
              const ano = d.getFullYear();
              const horas = String(d.getHours()).padStart(2, '0');
              const minutos = String(d.getMinutes()).padStart(2, '0');
              return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
            };

            // Busca o nome do usuário que alterou diretamente dos dados já carregados no Client
            let nomeUsuario = 'Desconhecido';
            if (u.alterado_por) {
               const usuarioAlterador = STATE.usuarios.find(x => x._id === u.alterado_por);
               if (usuarioAlterador) nomeUsuario = usuarioAlterador.nome;
            }
            
            refs.viewFields.dataCriacao.textContent = formatarDataHora(u.data_criacao);
            refs.viewFields.dataAtualizacao.textContent = formatarDataHora(u.alterado_em || u.data_criacao);
            refs.viewFields.alteradoPor.textContent = nomeUsuario;
          }

          App.ui.showModal(refs.visualizarModal);
        }
      }

      if (btnEdit) {
        const u = STATE.usuarios.find(x => x._id === btnEdit.dataset.id);
        if (u) openModalEdicao(u);
      }

      if (btnDel) {
        alert("O usuário deve ser inativado através da edição, pois o sistema não permite a exclusão definitiva.");
      }
    });

    refs.addUserBtn?.addEventListener('click', openModalCadastro);

    refs.cancelBtn?.addEventListener('click', tryCloseModal);

    refs.userForm?.addEventListener('submit', handleSaveUser);

    // Novo código adicionado: Força o texto do nome a ficar em caixa alta
    refs.inpNome?.addEventListener('input', function(e) {
      e.target.value = e.target.value.toUpperCase();
    });

    refs.btnOpenChangePassword?.addEventListener('click', openChangePasswordModal);
    refs.cancelChangePasswordBtn?.addEventListener('click', closeChangePasswordModal);
    refs.changePasswordForm?.addEventListener('submit', handleChangePassword);

    const closeVis = () => App.ui.hideModal(refs.visualizarModal);
    refs.closeVisualizarBtn?.addEventListener('click', closeVis);
    refs.fecharVisualizarBtn?.addEventListener('click', closeVis);
  }

  function setupFilters() {
    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area',
        { search: true, status: true, pageSize: true, tipoUsuario: true }, 
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
  }

  document.addEventListener('DOMContentLoaded', async () => {
    App.loader.show();
    setupEvents();
    
    try {
      await carregarDados();
      setupFilters();

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