/* eslint-disable no-console */
(() => {
  'use strict';

  // ===================== Config & State =====================
  const API = Object.freeze({
    instituicao: '../backend/processa_instituicao.php',
    uc: '../backend/processa_unidade_curricular.php',
  });

  const STATE = {
    instituicoes: [],
    ucs: [],
    ucEditId: null,
  };

  // ===================== DOM Helpers =====================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Sidebar
  const menuToggle = $('#menu-toggle');
  const sidebar = $('.sidebar');
  const dashboardContainer = $('.dashboard-container');

  // Modais UC
  const ucModal = $('#ucModal');
  const addUcBtn = $('#addUcBtn');
  const closeModalBtn = $('#closeModalBtn');
  const cancelBtn = $('#cancelBtn');
  const ucForm = $('#ucForm');
  const modalTitleUc = $('#modalTitleUc');
  const ucIdInput = $('#ucId');
  const descricaoUcInput = $('#descricaoUc');
  const salaIdealInput = $('#salaIdeal');
  const selectInstituicao = $('#instituicaoUc');
  const statusUc = $('#statusUc');
  const alertUc = $('#alertUc');

  // Modal Visualizar
  const visualizarUcModal = $('#visualizarUcModal');
  const closeVisualizarUcBtn = $('#closeVisualizarUcBtn');
  const fecharVisualizarUcBtn = $('#fecharVisualizarUcBtn');
  const viewInstituicaoUc = $('#viewInstituicaoUc');
  const viewDescricaoUc = $('#viewDescricaoUc');
  const viewSalaIdealUc = $('#viewSalaIdealUc');
  const viewStatusUc = $('#viewStatusUc');

  // Tabela / busca
  const ucTableBody = $('#ucTableBody');
  const searchInput = $('#searchUc');

  // ===================== Sidebar Behavior =====================
  function initSidebar() {
    if (!menuToggle || !sidebar || !dashboardContainer) return;

    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      dashboardContainer.classList.toggle('sidebar-active');
    });

    dashboardContainer.addEventListener('click', (event) => {
      const isOpen = dashboardContainer.classList.contains('sidebar-active');
      const clickedOutsideSidebar = !sidebar.contains(event.target) && !menuToggle.contains(event.target);
      if (isOpen && clickedOutsideSidebar) {
        sidebar.classList.remove('active');
        dashboardContainer.classList.remove('sidebar-active');
      }
    });
  }

  // ===================== Fetch helpers =====================
  async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erro HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  // ===================== Instituições =====================
  async function fetchInstituicoes() {
    if (STATE.instituicoes.length) return STATE.instituicoes;
    const data = await safeFetch(API.instituicao);
    STATE.instituicoes = Array.isArray(data) ? data : [];
    return STATE.instituicoes;
  }

  async function preencherSelectInstituicao(selectedId = '') {
    const insts = await fetchInstituicoes();
    const opts = ['<option value="">Selecione a instituição</option>']
      .concat(insts.map(i =>
        `<option value="${i._id}" ${i._id === selectedId ? 'selected' : ''}>${i.razao_social}</option>`
      ));
    selectInstituicao.innerHTML = opts.join('');
  }

  // ===================== Modais UC =====================
  function openModalUC(edit = false, uc = {}) {
    preencherSelectInstituicao(edit ? uc.instituicao_id : '');
    ucModal.classList.add('show');
    ucIdInput.value = edit ? uc._id : '';
    descricaoUcInput.value = edit ? (uc.descricao ?? '') : '';
    salaIdealInput.value = edit ? (uc.sala_ideal ?? '') : '';
    statusUc.value = edit ? (uc.status ?? 'Ativa') : 'Ativa';
    modalTitleUc.textContent = edit ? 'Editar Unidade Curricular' : 'Adicionar Nova Unidade Curricular';
    STATE.ucEditId = edit ? uc._id : null;
    clearAlert();
  }

  function closeModalUC() {
    ucModal.classList.remove('show');
    ucForm.reset();
    STATE.ucEditId = null;
    clearAlert();
  }

  function openVisualizarUcModal(uc) {
    const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
    viewInstituicaoUc.value = inst ? inst.razao_social : '';
    viewDescricaoUc.value = uc.descricao ?? '';
    viewSalaIdealUc.value = uc.sala_ideal ?? '';
    viewStatusUc.value = uc.status ?? 'Ativa';
    visualizarUcModal.classList.add('show');
  }

  function closeVisualizarUcModal() {
    visualizarUcModal.classList.remove('show');
  }

  function wireModalEvents() {
    addUcBtn?.addEventListener('click', () => openModalUC());
    closeModalBtn?.addEventListener('click', closeModalUC);
    cancelBtn?.addEventListener('click', closeModalUC);

    closeVisualizarUcBtn?.addEventListener('click', closeVisualizarUcModal);
    fecharVisualizarUcBtn?.addEventListener('click', closeVisualizarUcModal);

    window.addEventListener('click', (e) => {
      if (e.target === ucModal) closeModalUC();
      if (e.target === visualizarUcModal) closeVisualizarUcModal();
    });
  }

  // ===================== UC: Busca & Tabela =====================
  async function carregarUnidadesCurriculares() {
    try {
      const [ucs] = await Promise.all([
        safeFetch(API.uc),
        fetchInstituicoes()
      ]);
      STATE.ucs = Array.isArray(ucs) ? ucs : [];
      renderTableUC();
    } catch (err) {
      console.error(err);
      ucTableBody.innerHTML = `<tr><td colspan="6">Erro ao buscar dados.</td></tr>`;
    }
  }

  function renderTableUC() {
    const search = (searchInput.value || '').toLowerCase();
    const rows = [];
function ucTimestamp(u) {
  if (u.created_at) return Date.parse(u.created_at) || 0;
  if (u.data_cadastro) return Date.parse(u.data_cadastro) || 0;
  if (typeof u._id === 'string' && /^[a-f\d]{24}$/i.test(u._id)) {
    return parseInt(u._id.slice(0, 8), 16) * 1000; // ObjectId -> segundos
  }
  return 0;
}
    const filtered = STATE.ucs.filter(uc => {
      const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
      return (
        !search ||
        (uc.descricao || '').toLowerCase().includes(search) ||
        (uc.sala_ideal || '').toLowerCase().includes(search) ||
        (inst && (inst.razao_social || '').toLowerCase().includes(search))
      );
    });

    if (!filtered.length) {
      ucTableBody.innerHTML = `<tr><td colspan="6">Nenhuma UC cadastrada.</td></tr>`;
      return;
    }

    for (const uc of filtered) {
      const inst = STATE.instituicoes.find(i => i._id === uc.instituicao_id);
      rows.push(`
        <tr>
          <td>${uc._id}</td>
          <td>${inst ? inst.razao_social : ''}</td>
          <td>${uc.descricao ?? ''}</td>
          <td>${uc.sala_ideal ?? ''}</td>
          <td>${uc.status ?? 'Ativa'}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-icon btn-view" data-id="${uc._id}" title="Visualizar"><i class="fas fa-eye"></i></button>
              <button class="btn btn-icon btn-edit" data-id="${uc._id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn btn-icon btn-delete" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
            </div>
          </td>
        </tr>
      `);
    }

    ucTableBody.innerHTML = rows.join('');
  }

  // Event delegation para ações da tabela (melhor prática)
  function wireTableActions() {
    ucTableBody.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('.btn-view');
      const editBtn = e.target.closest('.btn-edit');
      const delBtn = e.target.closest('.btn-delete');

      if (viewBtn) {
        const id = viewBtn.dataset.id;
        const uc = STATE.ucs.find(u => u._id === id);
        if (uc) openVisualizarUcModal(uc);
        return;
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const uc = STATE.ucs.find(u => u._id === id);
        if (uc) openModalUC(true, uc);
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.id;
        if (!confirm('Deseja excluir esta UC?')) return;
        try {
          await safeFetch(`${API.uc}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
          await carregarUnidadesCurriculares();
        } catch (err) {
          console.error(err);
          alert('Erro ao excluir. Tente novamente.');
        }
      }
    });
  }

  // ===================== Validação =====================
  const forbiddenChars = /[<>"';{}]/g;

  function clearAlert() {
    alertUc.textContent = '';
    alertUc.className = '';
    alertUc.style.display = 'none';
  }

  function showAlert(msg, type = 'error') {
    alertUc.textContent = msg;
    alertUc.className = (type === 'error' ? 'alert-error' : 'alert-success');
    alertUc.style.display = 'block';
    if (type === 'success') {
      setTimeout(clearAlert, 2500);
    }
  }

  function sanitize(val) {
    return (val || '').replace(/\s+/g, ' ').trim();
  }

  function validateUcForm() {
  clearAlert();

  // Campos obrigatórios
  if (!selectInstituicao.value) {
    showAlert('Selecione uma instituição.', 'error');
    selectInstituicao.focus();
    return false;
  }

  // Normalização
  descricaoUcInput.value = sanitize(descricaoUcInput.value);
  salaIdealInput.value = sanitize(salaIdealInput.value);

  // Descrição: 3–150
  if (descricaoUcInput.value.length < 3 || descricaoUcInput.value.length > 150) {
    showAlert('Descrição deve ter entre 3 e 150 caracteres.', 'error');
    descricaoUcInput.focus();
    return false;
  }
  // opcionalmente mantenha a barreira contra caracteres proibidos
  if (forbiddenChars.test(descricaoUcInput.value)) {
    showAlert('Descrição contém caracteres inválidos.', 'error');
    descricaoUcInput.focus();
    return false;
  }

  // Sala Ideal: 2–20 e apenas letras/números (permitindo espaço)
  const alphaNumBR = /^[A-Za-zÀ-ÿ0-9 ]+$/;
  if (salaIdealInput.value.length < 2 || salaIdealInput.value.length > 20) {
    showAlert('Sala Ideal deve ter entre 2 e 20 caracteres.', 'error');
    salaIdealInput.focus();
    return false;
  }
  if (!alphaNumBR.test(salaIdealInput.value)) {
    showAlert('Sala Ideal aceita apenas letras, números e espaços.', 'error');
    salaIdealInput.focus();
    return false;
  }

  if (!statusUc.value) {
    showAlert('Selecione o status.', 'error');
    statusUc.focus();
    return false;
  }

  return true;
}


// Sala Ideal: 2–20 e apenas letras/números/espaços
const alphaNumBR = /^[A-Za-zÀ-ÿ0-9 ]+$/;
if (salaIdealInput.value.length < 2 || salaIdealInput.value.length > 20) {
  showAlert('Sala Ideal deve ter entre 2 e 20 caracteres.', 'error');
  salaIdealInput.focus();
  return false;
}
if (!alphaNumBR.test(salaIdealInput.value)) {
  showAlert('Sala Ideal aceita apenas letras, números e espaços.', 'error');
  salaIdealInput.focus();
  return false;
}

  function validateUcForm() {
    clearAlert();

    if (!selectInstituicao.value) {
      showAlert('Selecione uma instituição.', 'error');
      selectInstituicao.focus();
      return false;
    }

    descricaoUcInput.value = sanitize(descricaoUcInput.value);
    if (descricaoUcInput.value.length < 2 || descricaoUcInput.value.length > 100) {
      showAlert('Descrição deve ter entre 2 e 100 caracteres.', 'error');
      descricaoUcInput.focus();
      return false;
    }
    if (forbiddenChars.test(descricaoUcInput.value)) {
      showAlert('Descrição contém caracteres inválidos.', 'error');
      descricaoUcInput.focus();
      return false;
    }

    salaIdealInput.value = sanitize(salaIdealInput.value);
    if (salaIdealInput.value.length < 2 || salaIdealInput.value.length > 100) {
      showAlert('Sala Ideal deve ter entre 2 e 100 caracteres.', 'error');
      salaIdealInput.focus();
      return false;
    }
    if (forbiddenChars.test(salaIdealInput.value)) {
      showAlert('Sala Ideal contém caracteres inválidos.', 'error');
      salaIdealInput.focus();
      return false;
    }

    if (!statusUc.value) {
      showAlert('Selecione o status.', 'error');
      statusUc.focus();
      return false;
    }
    return true;
  }

  function wireInlineValidation() {
    [descricaoUcInput, salaIdealInput, selectInstituicao, statusUc].forEach(input => {
      input.addEventListener('input', clearAlert);
    });
  }

  // ===================== Submit CRUD =====================
  function disableForm(disabled) {
    $$('button, input, select, textarea', ucForm).forEach(el => { el.disabled = disabled; });
  }

  function buildPayload() {
    return {
      descricao: descricaoUcInput.value,
      sala_ideal: salaIdealInput.value,
      instituicao_id: selectInstituicao.value,
      status: statusUc.value
    };
  }

  function wireFormSubmit() {
    ucForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateUcForm()) return;

      const payload = buildPayload();
      const isEdit = Boolean(STATE.ucEditId);
      const url = isEdit ? `${API.uc}?id=${encodeURIComponent(STATE.ucEditId)}` : API.uc;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        disableForm(true);
        await safeFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        closeModalUC();
        // Mantém o mesmo feedback do código original
        setTimeout(async () => {
          alert('Unidade Curricular salva com sucesso!');
          await carregarUnidadesCurriculares();
        }, 200);
      } catch (err) {
        console.error(err);
        showAlert('Erro ao salvar UC. Tente novamente.', 'error');
      } finally {
        disableForm(false);
      }
    });
  }

  // ===================== Busca =====================
  function wireSearch() {
    searchInput.addEventListener('input', renderTableUC);
  }

  // ===================== Bootstrap =====================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      initSidebar();
      wireModalEvents();
      wireInlineValidation();
      wireFormSubmit();
      wireTableActions();
      wireSearch();
      await carregarUnidadesCurriculares();
    } catch (err) {
      console.error('Falha ao inicializar a página:', err);
    }
  });
})();
