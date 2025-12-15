/* eslint-disable no-console */
(() => {
  'use strict';

  // ========= Endpoints & Estado =========
  const API_EMPRESA = '../backend/processa_empresa.php';
  const API_INST = '../backend/processa_instituicao.php';

  let empresasData = [];           // lista crua vinda da API (sem filtros)
  let instituicoesMap = {};        // { _id: razao_social }
  const STATE = {
    filters: { q: '', status: '' }, // '' = todas; 'Ativa' | 'Inativa'
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  };

  // ========= DOM =========
  const empresaModal = document.getElementById('empresaModal');
  const addEmpresaBtn = document.getElementById('addEmpresaBtn');
  const closeEmpresaModal = document.getElementById('closeEmpresaModal');
  const empresaForm = document.getElementById('empresaForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const btnSubmitEmpresa = document.getElementById('btnSubmitEmpresa');
  const modalTitle = document.getElementById('modalTitle');
  const dataTableBody = document.querySelector('#empresasTable tbody');

  const searchEmpresaInput = document.getElementById('searchEmpresa');
  const filterInstituicao = document.getElementById('filterInstituicao');
  const filterStatus = document.getElementById('filterStatus');
  const pageSizeSel = document.getElementById('pageSize');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  // Campos do form
  const empresaIdInput = document.getElementById('empresaId');
  const nomeEmpresaInput = document.getElementById('nomeEmpresa');
  const cnpjMatrizInput = document.getElementById('cnpjMatriz');
  const statusSelect = document.getElementById('statusEmpresa');
  const alertEmpresa = document.getElementById('alertEmpresa');

  // Modal Visualizar
  const visualizarEmpresaModal = document.getElementById('visualizarEmpresaModal');
  const closeVisualizarEmpresa = document.getElementById('closeVisualizarEmpresa');
  const fecharVisualizarEmpresa = document.getElementById('fecharVisualizarEmpresa');
  const viewNomeEmpresa = document.getElementById('viewNomeEmpresa');
  const viewCnpjMatriz = document.getElementById('viewCnpjMatriz');

  // ========= Utils =========
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const strip = (s = '') => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (s = '') => String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  // ====== >>> Correção do horário local ao criar (sua sugestão) <<< ======
  function pad2(value) { return value.toString().padStart(2, '0'); }
  function nowLocalISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
      `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  // =======================================================================

  const safeCNPJ = (cnpj = '') => cnpj.replace(/[^\d]/g, '');

  function fmtDateBR(input) {
    if (!input) return '—';
    const dt = (input instanceof Date) ? input : new Date(input);
    if (isNaN(+dt)) return '—';
    return dt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function oidToDate(id) {
    if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
    const ts = parseInt(id.slice(0, 8), 16);
    return new Date(ts * 1000);
  }

  // usa data_criacao (ISO) se existir; senão, deriva do ObjectId
  function getCreatedDate(emp) {
    if (emp?.data_criacao) {
      const dt = new Date(emp.data_criacao);
      if (!isNaN(+dt)) return dt;
    }
    return oidToDate(emp?._id) || new Date(0);
  }

  // Validação real do CNPJ (com dígitos verificadores)
  function validaCNPJ(cnpj) {
    const v = safeCNPJ(cnpj);
    if (v.length !== 14 || /^(\d)\1{13}$/.test(v)) return false;
    const toNums = v.split('').map(n => +n);
    const calc = (arr) => {
      let soma = 0, pos = arr.length - 7;
      for (let i = arr.length; i >= 1; i--) {
        soma += arr[arr.length - i] * pos--;
        if (pos < 2) pos = 9;
      }
      const resto = soma % 11;
      return (resto < 2) ? 0 : 11 - resto;
    };
    const d1 = calc(toNums.slice(0, 12));
    if (d1 !== toNums[12]) return false;
    const d2 = calc(toNums.slice(0, 13));
    return d2 === toNums[13];
  }

  // Máscara de CNPJ conforme digita
  function formatCNPJ(cnpj) {
    const v = safeCNPJ(cnpj).slice(0, 14);
    let out = v;
    if (v.length > 12) out = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
    else if (v.length > 8) out = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
    else if (v.length > 5) out = v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
    else if (v.length > 2) out = v.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
    return out;
  }

  // ========= Fetch helpers =========
  async function safeFetchJSON(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json().catch(() => (Array.isArray(res) ? [] : {}));
  }

  // ========= Carregamento de dados =========
  async function carregarInstituicoes() {
    let lista = [];
    try {
      lista = await safeFetchJSON(API_INST);
    } catch (e) {
      console.error('Erro ao carregar instituições:', e);
      lista = [];
    }
    instituicoesMap = {};

    if (filterInstituicao) filterInstituicao.innerHTML = '<option value="">Todas as instituições</option>';
    if (instituicaoSelect) instituicaoSelect.innerHTML = '<option value="">Selecione</option>';

    lista.forEach(inst => {
      const nome = inst.razao_social || inst.nome || '(sem nome)';
      instituicoesMap[inst._id] = nome;
      if (filterInstituicao) {
        filterInstituicao.innerHTML += `<option value="${esc(inst._id)}">${esc(nome)}</option>`;
      }
      if (instituicaoSelect) {
        instituicaoSelect.innerHTML += `<option value="${esc(inst._id)}">${esc(nome)}</option>`;
      }
    });
  }

  async function carregarEmpresas() {
    try {
      empresasData = await safeFetchJSON(API_EMPRESA);
    } catch (e) {
      console.error('Erro ao carregar empresas:', e);
      empresasData = [];
    }
    STATE.page = 1;
    renderTabela();
    renderPaginacao();
  }

  // ========= Filtros e paginação (front) =========
  function getFilteredSorted() {
    const q = strip(STATE.filters.q).slice(0, 100);
    const inst = STATE.filters.instituicao;
    const st = STATE.filters.status; // ''|Ativa|Inativa

    let list = empresasData.filter(emp => {
      const nome = strip(emp.razao_social || '');
      const cnpj = strip(emp.cnpj || '');
      const haystack = `${nome} ${cnpj}`;
      const okQ = !q || haystack.includes(q);
      const okInst = !inst || (emp.instituicao_id === inst);
      const statusVal = (emp.status || 'Ativa');
      const okSt = !st || statusVal === st;
      return okQ && okInst && okSt;
    });

    // ordena SEMPRE por mais recente -> mais antigo
    list.sort((a, b) => +getCreatedDate(b) - +getCreatedDate(a));
    return list;
  }

  function paginate(list) {
    const size = STATE.pageSize;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(Math.max(1, STATE.page), totalPages);
    const start = (page - 1) * size;
    const end = start + size;
    return { page, total, totalPages, items: list.slice(start, end) };
  }

  // ========= Render =========
  function renderTabela() {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = '';

    const filtered = getFilteredSorted();
    const { page, total, totalPages, items } = paginate(filtered);

    STATE.page = page;
    STATE.total = total;
    STATE.totalPages = totalPages;

    if (items.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7">Nenhuma empresa encontrada com os filtros aplicados.</td>`;
      dataTableBody.appendChild(tr);
      renderPaginacao();
      return;
    }

    items.forEach(empresa => {
      const created = getCreatedDate(empresa);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="display:none">${esc(empresa._id)}</td>
        <td>${esc(empresa.razao_social || '')}</td>
        <td>${esc(empresa.cnpj || '')}</td>
        <td style="display:none">${esc(instituicoesMap[empresa.instituicao_id] || '')}</td>
        <td>${esc(empresa.status || 'Ativa')}</td>
        <td>${esc(fmtDateBR(created))}</td>
        <td class="actions">
          <button class="btn btn-icon btn-view"   title="Visualizar" data-id="${esc(empresa._id)}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-icon btn-edit"   title="Editar"     data-id="${esc(empresa._id)}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-icon btn-delete" title="Excluir"    data-id="${esc(empresa._id)}"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      dataTableBody.appendChild(tr);
    });

    attachTableActionListeners();
    renderPaginacao();
  }

  function renderPaginacao() {
    if (pageInfo) pageInfo.textContent = `Página ${STATE.page} de ${STATE.totalPages} • ${STATE.total} registros`;
    if (prevPageBtn) prevPageBtn.disabled = STATE.page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = STATE.page >= STATE.totalPages || STATE.total === 0;
    if (pageSizeSel) pageSizeSel.value = String(STATE.pageSize);
  }

  // ========= Ações da tabela =========
  function attachTableActionListeners() {
    document.querySelectorAll('.btn-view').forEach(button => {
      button.onclick = (e) => {
        const empresa = empresasData.find(emp => emp._id === e.currentTarget.dataset.id);
        openVisualizarEmpresaModal(empresa);
      };
    });
    document.querySelectorAll('.btn-edit').forEach(button => {
      button.onclick = (e) => openEditModal(e.currentTarget.dataset.id);
    });
    document.querySelectorAll('.btn-delete').forEach(button => {
      button.onclick = async (e) => {
        const id = e.currentTarget.dataset.id;
        await deleteEmpresa(id);
      };
    });
  }

  // ========= Modais =========
  function openVisualizarEmpresaModal(empresa) {
    if (!empresa) return;
    viewNomeEmpresa.value = empresa.razao_social || '';
    viewCnpjMatriz.value = empresa.cnpj || '';
    visualizarEmpresaModal?.classList.add('show');
    document.body.classList.add('modal-open');
  }
  function closeVisualizarEmpresaModal() {
    visualizarEmpresaModal?.classList.remove('show');
    document.body.classList.remove('modal-open');
  }

  async function openEditModal(id) {
    const empresa = empresasData.find(e => e._id == id);
    if (!empresa) return;
    modalTitle.textContent = 'Editar Empresa';
    empresaIdInput.value = empresa._id || '';
    nomeEmpresaInput.value = empresa.razao_social || '';
    cnpjMatrizInput.value = empresa.cnpj || '';
    await carregarInstituicoes();
    instituicaoSelect.value = empresa.instituicao_id || '';
    statusSelect.value = (empresa.status === 'Inativa') ? 'Inativa' : 'Ativa';
    empresaModal?.classList.add('show');
    document.body.classList.add('modal-open');
  }

  async function deleteEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir a empresa?')) return;
    try {
      const res = await fetch(API_EMPRESA + '?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await carregarEmpresas();
      alert('Empresa excluída com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir a empresa. Tente novamente.');
    }
  }

  // ========= Validação de formulário =========
  function showAlertEmpresa(msg, type = 'error') {
    if (!alertEmpresa) return;
    alertEmpresa.textContent = msg;
    alertEmpresa.className = (type === 'error' ? 'alert-error' : 'alert-success');
    alertEmpresa.style.display = 'block';
    if (type !== 'error') setTimeout(() => { alertEmpresa.style.display = 'none'; }, 2500);
  }
  function clearAlertEmpresa() {
    if (!alertEmpresa) return;
    alertEmpresa.textContent = '';
    alertEmpresa.className = '';
    alertEmpresa.style.display = 'none';
  }
  function setFormDisabled(disabled) {
    const els = empresaForm ? empresaForm.querySelectorAll('button, input, select, textarea') : [];
    els.forEach(el => el.disabled = disabled);
    if (btnSubmitEmpresa) btnSubmitEmpresa.innerHTML = disabled ? '<i class="fas fa-spinner fa-spin"></i> Salvando...' : '<i class="fas fa-save"></i> Salvar Empresa';
  }

  function validaCNPJCampo() {
    const cnpj = (cnpjMatrizInput?.value || '').trim();
    if (!cnpj) return true; // opcional
    if (!validaCNPJ(cnpj)) {
      showAlertEmpresa('CNPJ inválido. Verifique os dígitos.', 'error');
      cnpjMatrizInput?.focus();
      return false;
    }
    // normaliza para a máscara
    cnpjMatrizInput.value = formatCNPJ(cnpj);
    return true;
  }

  function validateEmpresaForm() {
    clearAlertEmpresa();
    const nome = (nomeEmpresaInput?.value || '').trim();
    const inst = (instituicaoSelect?.value || '');
    const status = (statusSelect?.value || 'Ativa');

    if (!inst) { showAlertEmpresa('Selecione uma instituição.', 'error'); instituicaoSelect?.focus(); return false; }
    if (!nome || nome.length < 2 || nome.length > 100 || /[<>"';{}]/g.test(nome)) {
      showAlertEmpresa('Nome da Empresa/Parceiro obrigatório, 2–100 caracteres e sem caracteres especiais.', 'error');
      nomeEmpresaInput?.focus();
      return false;
    }
    if (!['Ativa', 'Inativa'].includes(status)) {
      showAlertEmpresa('Selecione um status válido.', 'error');
      statusSelect?.focus();
      return false;
    }
    return validaCNPJCampo();
  }

  [nomeEmpresaInput, cnpjMatrizInput, instituicaoSelect, statusSelect].forEach(el => {
    el?.addEventListener('input', clearAlertEmpresa);
  });

  // máscara de CNPJ on-the-fly
  cnpjMatrizInput?.addEventListener('input', () => {
    const start = cnpjMatrizInput.selectionStart;
    cnpjMatrizInput.value = formatCNPJ(cnpjMatrizInput.value);
    cnpjMatrizInput.selectionStart = cnpjMatrizInput.selectionEnd = start;
  });

  // ========= Submit CRUD =========
  empresaForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validateEmpresaForm()) return;

    const id = empresaIdInput?.value || '';
    const payload = {
      razao_social: (nomeEmpresaInput?.value || '').trim(),
      cnpj: (cnpjMatrizInput?.value || '').trim(),
      instituicao_id: (instituicaoSelect?.value || ''),
      status: (statusSelect?.value || 'Ativa')
    };

    // >>> adiciona data_criacao local SOMENTE no POST (criação) <<<
    if (!id) {
      payload.data_criacao = nowLocalISO();
    }

    try {
      setFormDisabled(true);
      let res;
      if (id) {
        res = await fetch(API_EMPRESA + '?id=' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(API_EMPRESA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => 'Erro ao salvar.');
        throw new Error(txt || 'Erro ao salvar.');
      }

      closeEmpresaModalFn();
      alert('Empresa salva com sucesso!');
      await carregarEmpresas();
    } catch (err) {
      console.error(err);
      showAlertEmpresa('Erro ao salvar Empresa. Tente novamente.', 'error');
    } finally {
      setFormDisabled(false);
    }
  });

  function closeEmpresaModalFn() {
    empresaModal?.classList.remove('show');
    empresaForm?.reset();
    if (statusSelect) statusSelect.value = 'Ativa';
    if (modalTitle) modalTitle.textContent = 'Adicionar Nova Empresa';
    if (empresaIdInput) empresaIdInput.value = '';
    clearAlertEmpresa();
    document.body.classList.remove('modal-open');
  }

  // ========= Eventos UI (filtros/paginação/UX) =========
  searchEmpresaInput?.addEventListener('input', debounce(() => {
    STATE.filters.q = searchEmpresaInput.value || '';
    STATE.page = 1;
    renderTabela();
  }, 300));

  filterInstituicao?.addEventListener('change', () => {
    STATE.filters.instituicao = filterInstituicao.value || '';
    STATE.page = 1;
    renderTabela();
  });

  filterStatus?.addEventListener('change', () => {
    STATE.filters.status = filterStatus.value || '';
    STATE.page = 1;
    renderTabela();
  });

  pageSizeSel?.addEventListener('change', () => {
    STATE.pageSize = parseInt(pageSizeSel.value || '10', 10);
    STATE.page = 1;
    renderTabela();
  });

  prevPageBtn?.addEventListener('click', () => {
    if (STATE.page > 1) {
      STATE.page--;
      renderTabela();
    }
  });
  nextPageBtn?.addEventListener('click', () => {
    if (STATE.page < STATE.totalPages) {
      STATE.page++;
      renderTabela();
    }
  });

  // Abrir/fechar modais
  addEmpresaBtn?.addEventListener('click', async () => {
    if (modalTitle) modalTitle.textContent = 'Adicionar Nova Empresa';
    empresaForm?.reset();
    if (empresaIdInput) empresaIdInput.value = '';
    if (statusSelect) statusSelect.value = 'Ativa'; // default
    await carregarInstituicoes();
    empresaModal?.classList.add('show');
    document.body.classList.add('modal-open');
    nomeEmpresaInput?.focus();
  });
  closeEmpresaModal?.addEventListener('click', closeEmpresaModalFn);
  cancelBtn?.addEventListener('click', closeEmpresaModalFn);

  // Fechar com overlay e ESC
  window.addEventListener('click', (ev) => {
    if (ev.target === empresaModal) closeEmpresaModalFn();
    if (ev.target === visualizarEmpresaModal) closeVisualizarEmpresaModal();
  });
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (empresaModal?.classList.contains('show')) closeEmpresaModalFn();
      if (visualizarEmpresaModal?.classList.contains('show')) closeVisualizarEmpresaModal();
    }
  });

  

  closeVisualizarEmpresa?.addEventListener('click', closeVisualizarEmpresaModal);
  fecharVisualizarEmpresa?.addEventListener('click', closeVisualizarEmpresaModal);

  // ========= Bootstrap =========
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await carregarInstituicoes();
      await carregarEmpresas();
      if (pageSizeSel) pageSizeSel.value = String(STATE.pageSize);
      if (filterStatus) filterStatus.value = STATE.filters.status;
      const clearCtl = App.ui.setupClearFilters({
        buttonSelector: '#btnClearFilters',

        // Observe apenas os filtros válidos desta tela (NÃO inclua #pageSize)
        watchSelectors: ['#searchEmpresa', '#filterInstituicao', '#filterStatus'],

        // Estado que habilita o botão
        getFiltersState: () => {
          const { q, instituicao, status } = STATE.filters; // <- nomes corretos
          return { q, instituicao, status };
        },

        // O que zerar na UI ao clicar no botão
        resetUI: () => {
          if (searchEmpresaInput) searchEmpresaInput.value = '';
          if (filterInstituicao) filterInstituicao.value = '';
          if (filterStatus) filterStatus.value = '';
        },

        // O que zerar no estado e como recarregar
        onClear: async () => {
          STATE.filters = { q: '', instituicao: '', status: '' };
          STATE.page = 1;
          renderTabela(); // já chama renderPaginacao por dentro
        }
      });

      // começa desabilitado se não houver filtro
      clearCtl?.update?.();
    } catch (e) {
      console.error('Falha ao inicializar a página:', e);
    }
  });
})();
