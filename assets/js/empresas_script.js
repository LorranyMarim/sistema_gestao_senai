(() => {
  'use strict';

  const MODULE_PATH = '../backend/processa_empresa.php';
  const MODAL_ID = 'empresaModal';
  const TABLE_BODY_ID = 'empresaTableBody';
  const PAGE_INFO_ID = 'pageInfo';

  let state = {
    page: 1,
    pageSize: 10,
    total: 0,
    filters: {},
    empresas: [] 
  };

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEvents();
  });

  async function init() {
    App.loader.show();

    try {
      const res = await App.net.get(`${MODULE_PATH}?action=bootstrap`);

      if (res.instituicoes && res.instituicoes.length > 0) {
        populateSelect('instituicaoEmpresa', res.instituicoes, '_id', 'nome');
      }

      if (res.empresas) {
        state.empresas = res.empresas; 
        state.total = res.empresas.length;
        renderTable(state.empresas);
        updatePaginationInfo(state.total, state.page, state.pageSize);
      }

      setupFiltersComponent();

    } catch (error) {
      console.error('Erro na inicialização:', error);
      const tbody = document.getElementById(TABLE_BODY_ID);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500">Erro ao carregar o módulo.</td></tr>';
    } finally {
      App.loader.hide();
    }
  }

  function setupEvents() {
    document.getElementById('addEmpresaBtn')?.addEventListener('click', openModalCreate);

    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closeModal);

    document.getElementById('empresaForm')?.addEventListener('submit', handleSave);

    const closeView = () => {
      document.getElementById('visualizarEmpresaModal').style.display = 'none';
    };
    document.getElementById('closeVisualizarEmpresaBtn')?.addEventListener('click', closeView);
    document.getElementById('fecharVisualizarEmpresaBtn')?.addEventListener('click', closeView);
  }

  function setupFiltersComponent() {
    if (App.filters) {
      App.filters.render('filter_area', [
        {
          name: 'q',
          label: 'Buscar',
          type: 'text',
          placeholder: 'Razão Social ou CNPJ'
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: '', label: 'Todos' },
            { value: 'Ativo', label: 'Ativo' },
            { value: 'Inativo', label: 'Inativo' }
          ]
        }
      ], (filters) => {
        state.filters = filters;
        state.page = 1;
        carregarEmpresas();
      });
    }
  }

  async function carregarEmpresas() {
    App.loader.show();
    const tbody = document.getElementById(TABLE_BODY_ID);

    try {
      const params = new URLSearchParams({
        page: state.page,
        page_size: state.pageSize,
        ...state.filters
      });

      const res = await App.net.get(`${MODULE_PATH}?${params.toString()}`);

      state.total = res.total || 0;
      state.empresas = res.items || []; 

      renderTable(state.empresas);
      updatePaginationInfo(res.total, res.page, res.page_size);

    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-500">Erro ao carregar dados.</td></tr>';
    } finally {
      App.loader.hide();
    }
  }

  function renderTable(lista) {
    const tbody = document.getElementById(TABLE_BODY_ID);
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhuma empresa encontrada.</td></tr>';
      return;
    }

    lista.forEach(emp => {
      const tr = document.createElement('tr');

      const dataCriacao = emp.data_criacao
        ? new Date(emp.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';

      let statusClass = 'text-gray-600';
      if (emp.status === 'Ativo') statusClass = 'text-green-600 font-semibold';
      else if (emp.status === 'Inativo') statusClass = 'text-red-500 font-semibold';

      const razao = safeHtml(emp.razao_social);
      const cnpj = safeHtml(emp.cnpj || '-');

      tr.innerHTML = `
        <td>${razao}</td>
        <td>${cnpj}</td>
        <td><span class="${statusClass}">${emp.status}</span></td>
        <td>${dataCriacao}</td>
        <td class="actions">
          <button class="btn-icon view-btn" title="Visualizar" onclick="abrirVisualizar('${emp._id}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon edit-btn" title="Editar" onclick="abrirModalEditar('${emp._id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon delete-btn" title="Excluir" onclick="deletarEmpresa('${emp._id}', '${safeHtml(emp.razao_social, true)}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  function updatePaginationInfo(total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    const infoEl = document.getElementById(PAGE_INFO_ID);

    if (infoEl) {
      infoEl.textContent = `Página ${page} de ${totalPages} • ${total} registros`;
    }

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (prevBtn) {
      prevBtn.disabled = page <= 1;
      prevBtn.onclick = () => {
        if (page > 1) {
          state.page--;
          carregarEmpresas();
        }
      };
    }

    if (nextBtn) {
      nextBtn.disabled = page >= totalPages;
      nextBtn.onclick = () => {
        if (page < totalPages) {
          state.page++;
          carregarEmpresas();
        }
      };
    }
  }

  function openModalCreate() {
    const modal = document.getElementById(MODAL_ID);
    const form = document.getElementById('empresaForm');
    const title = document.getElementById('modalTitleEmpresa');
    const statusSelect = document.getElementById('statusEmpresa');
    const alertArea = document.getElementById('alertEmpresa');

    form.reset();
    document.getElementById('empresaId').value = '';

    title.textContent = 'Adicionar Nova Empresa';
    
    statusSelect.value = 'Ativo';
    statusSelect.disabled = true;

    if (alertArea) {
      alertArea.style.display = 'none';
      alertArea.innerHTML = '';
    }

    modal.style.display = 'block';
  }

  function closeModal() {
    document.getElementById(MODAL_ID).style.display = 'none';
  }

  async function handleSave(event) {
    event.preventDefault();

    const id = document.getElementById('empresaId').value;
    const razaoSocial = document.getElementById('razaoSocial').value.trim();
    const cnpj = document.getElementById('cnpj').value.trim();
    
    let statusVal = document.getElementById('statusEmpresa').value;
    if (!id) statusVal = 'Ativo';

    const payload = {
      razao_social: razaoSocial,
      cnpj: cnpj || null,
      status: statusVal
    };

    App.loader.show();
    const alertArea = document.getElementById('alertEmpresa');
    if (alertArea) alertArea.style.display = 'none';

    try {
      let url = MODULE_PATH;
      let method = 'POST';

      if (id) {
        url = `${MODULE_PATH}?id=${id}`;
        method = 'PUT';
      }

      if (method === 'POST') await App.net.post(url, payload);
      else await App.net.put(url, payload);

      closeModal();
      carregarEmpresas();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      if (alertArea) {
        alertArea.style.display = 'block';
        alertArea.className = 'alert alert-danger';
        alertArea.textContent = error.detail || error.message || 'Erro ao salvar dados.';
      }
    } finally {
      App.loader.hide();
    }
  }

  window.abrirVisualizar = function(id) {
    const empresa = state.empresas.find(e => e._id === id);
    if (!empresa) return;

    document.getElementById('viewRazaoSocial').value = empresa.razao_social || '';
    document.getElementById('viewCnpj').value = empresa.cnpj || '';
    document.getElementById('viewStatusEmpresa').value = empresa.status || '';

    document.getElementById('visualizarEmpresaModal').style.display = 'block';
  };

  window.abrirModalEditar = function(id) {
    const empresa = state.empresas.find(e => e._id === id);
    if (!empresa) return;

    const modal = document.getElementById(MODAL_ID);
    const title = document.getElementById('modalTitleEmpresa');
    const statusSelect = document.getElementById('statusEmpresa');
    const alertArea = document.getElementById('alertEmpresa');

    if (alertArea) alertArea.style.display = 'none';

    document.getElementById('empresaId').value = empresa._id;
    document.getElementById('razaoSocial').value = empresa.razao_social || '';
    document.getElementById('cnpj').value = empresa.cnpj || '';

    title.textContent = 'Editar Empresa';

    statusSelect.value = empresa.status || 'Ativo';
    statusSelect.disabled = false;

    modal.style.display = 'block';
  };

  window.deletarEmpresa = async function(id, razaoSocial) {
    if (!confirm(`Tem certeza que deseja remover a empresa "${razaoSocial}"?\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    App.loader.show();
    try {
      await App.net.delete(`${MODULE_PATH}?id=${id}`);
      await carregarEmpresas();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao excluir empresa: ' + (error.detail || error.message || 'Erro desconhecido.'));
    } finally {
      App.loader.hide();
    }
  };

  function populateSelect(elementId, data, keyField, labelField) {
    const sel = document.getElementById(elementId);
    if (!sel) return;
    sel.innerHTML = '';
    data.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[keyField];
      opt.textContent = item[labelField];
      sel.appendChild(opt);
    });
  }

  function safeHtml(text, isAttribute = false) {
    if (!text) return '';
    let str = text.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    if (!isAttribute) {
      str = str.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    } else {
      str = str.replace(/'/g, "\\'"); 
    }
    return str;
  }

})();