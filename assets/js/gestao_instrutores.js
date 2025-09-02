/* eslint-disable no-console */
(() => {
  'use strict';

  // ===================== Endpoints =====================
  const API_INSTRUTOR = '../backend/processa_instrutor.php';
  const API_INST = '../backend/processa_instituicao.php';
  const API_UC = '../backend/processa_unidade_curricular.php';

  // ===================== Estado =====================
  let instrutoresData = [];   // dados crus da API
  let instituicoesMap = {};   // { _id: nome }
  let ucsMap = {};   // { _id: descricao }

  // Estado dos filtros/UX (persistimos apenas o "último filtro")
  const LS_LAST_FILTER = 'instrutoresFiltersLast';
  let filters = {
    text: '',
    instituicao: '',        // <— select único
    status: 'Todos',        // Todos | Ativo | Inativo
    turnos: [],             // multiselect
    ucs: [],                // multiselect por ID
    comSemUcs: 'Todos',     // Todos | Com | Sem
    sortBy: 'created_desc', // created_desc | nome_asc | matricula_asc | carga_asc | status_asc
    pageSize: 10,
    page: 1
  };

  // ===================== DOM =====================
  // Modais (cadastro/edição)
  const instrutorModal = document.getElementById('instrutorModal');
  const addInstrutorBtn = document.getElementById('addInstrutorBtn');
  const closeInstrutorModalBtn = document.getElementById('closeInstrutorModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const instrutorForm = document.getElementById('instrutorForm');
  const modalTitle = document.getElementById('modalTitle');
  const btnSalvar = document.getElementById('btnSalvarInstrutor');
  const alertBox = document.getElementById('alertInstrutor');
  const statusSelect = document.getElementById('statusInstrutor');

  // Tabela e busca
  const dataTableBody = document.querySelector('.data-table tbody');
  const searchInstrutorInput = document.getElementById('searchInstrutor');

  // Campos do form
  const instrutorIdInput = document.getElementById('instrutorId');
  const nomeInstrutorInput = document.getElementById('nomeInstrutor');
  const matriculaInstrutorInput = document.getElementById('matriculaInstrutor');
  const instrutorTelefoneInput = document.getElementById('instrutorTelefone');
  const instrutorEmailInput = document.getElementById('instrutorEmail');
  const instituicaoSelect = document.getElementById('instituicaoId');
  const mapaCompetenciaSelect = window.$ ? window.$('#mapaCompetencia') : null; // select2 (multi)
  const turnosSelect = window.$ ? window.$('#turnosInstrutor') : null; // select2 (multi)
  const cargaHorariaInput = document.getElementById('cargaHoraria');

  // Modal Visualizar
  const visualizarInstrutorModal = document.getElementById('visualizarInstrutorModal');
  const closeVisualizarInstrutor = document.getElementById('closeVisualizarInstrutor');
  const fecharVisualizarInstrutor = document.getElementById('fecharVisualizarInstrutor');
  const viewInstituicao = document.getElementById('viewInstituicao');
  const viewNomeInstrutor = document.getElementById('viewNomeInstrutor');
  const viewMatriculaInstrutor = document.getElementById('viewMatriculaInstrutor');
  const viewTelefone = document.getElementById('viewTelefone');
  const viewEmail = document.getElementById('viewEmail');
  const viewMapaCompetenciaList = document.getElementById('viewMapaCompetenciaList');
  const viewTurnosInstrutor = document.getElementById('viewTurnosInstrutor');
  const viewCargaHoraria = document.getElementById('viewCargaHoraria');

  // ============== Utils (format, validações, helpers) ==============
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const strip = (s = '') => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const FORBIDDEN = /[<>"';{}]/g;
  const MATRICULA = /^[A-Za-z0-9._-]{3,20}$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TELMASK = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

  const sanitizeSpaces = (s = '') => s.replace(/\s+/g, ' ').trim();
  const onlyDigits = (s = '') => s.replace(/\D+/g, '');

  // Data/hora formatada
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
  // Extrai timestamp do ObjectId (fallback caso não haja data_criacao)
  function oidToDate(id) {
    if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
    const ts = parseInt(id.slice(0, 8), 16);
    return new Date(ts * 1000);
  }
  function getCreatedDate(doc) {
    if (doc?.data_criacao) {
      const d = new Date(doc.data_criacao);
      if (!isNaN(+d)) return d;
    }
    return oidToDate(doc?._id) || new Date(0);
  }

  // Status para exibição
  function normalizeStatus(v) {
    if (v === undefined || v === null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Ativo' : 'Inativo';
    const s = String(v).trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  async function safeFetchJSON(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  }

  function showModal(el) {
    if (!el) return;
    if (el.classList) el.classList.add('show');
    else el.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
  function hideModal(el) {
    if (!el) return;
    if (el.classList) el.classList.remove('show');
    else el.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function clearForm() {
    instrutorForm?.reset();
    if (mapaCompetenciaSelect?.length) mapaCompetenciaSelect.val(null).trigger('change');
    if (turnosSelect?.length) turnosSelect.val(null).trigger('change');
    if (statusSelect) statusSelect.value = 'Ativo';  // default
    if (modalTitle) modalTitle.textContent = 'Adicionar Novo Instrutor';
    if (instrutorIdInput) instrutorIdInput.value = '';
    clearAlert();
  }

  function setFormDisabled(disabled) {
    if (!instrutorForm) return;
    [...instrutorForm.elements].forEach(el => el.disabled = disabled);
    if (btnSalvar) btnSalvar.disabled = disabled;
  }

  function showAlert(msg, type = 'error') {
    if (!alertBox) { alert(msg); return; }
    alertBox.textContent = msg;
    alertBox.className = (type === 'error' ? 'alert-error' : 'alert-success');
    alertBox.style.display = 'block';
    if (type !== 'error') setTimeout(clearAlert, 2500);
  }
  function clearAlert() {
    if (!alertBox) return;
    alertBox.textContent = '';
    alertBox.className = '';
    alertBox.style.display = 'none';
  }

  // Máscara de telefone (amigável)
  function maskPhone(value = '') {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/^(\d{0,2})/, '($1')
        .replace(/^\((\d{2})/, '($1) ')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
        .replace('--', '-')
        .replace(/\)\s-/, ') ');
    }
    return d
      .replace(/^(\d{0,2})/, '($1')
      .replace(/^\((\d{2})/, '($1) ')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
      .replace('--', '-')
      .replace(/\)\s-/, ') ');
  }

  // ===================== Select2 (form) =====================
  function initSelect2InModal() {
    if (!window.$?.fn?.select2) return;
    const $parent = $('#instrutorModal .modal-content');

    // Turnos (sempre local; opções já estão no HTML)
    if (turnosSelect?.length && !turnosSelect.hasClass('select2-hidden-accessible')) {
      turnosSelect.select2({
        width: '100%',
        placeholder: 'Selecione os Turnos',
        dropdownParent: $parent,
        closeOnSelect: false
      });
    }

    // Mapa de Competências (AJAX)
    if (mapaCompetenciaSelect?.length && !mapaCompetenciaSelect.hasClass('select2-hidden-accessible')) {
      mapaCompetenciaSelect.select2({
        width: '100%',
        placeholder: 'Selecione as UCs',
        dropdownParent: $parent,
        minimumInputLength: 0,
        ajax: {
          url: '../backend/processa_unidade_curricular.php',
          dataType: 'json',
          delay: 250,
          cache: true,
          data: (params) => ({
            q: params.term || '',
            page: params.page || 1,
            page_size: 1000
          }),
          processResults: (data) => {
            const items = Array.isArray(data) ? data : (data.items || []);
            const results = items.map(uc => ({ id: uc._id, text: uc.descricao }));
            const pageSize = (Array.isArray(data) ? items.length : (data.page_size || 1000));
            const more = items.length === pageSize;
            return { results, pagination: { more } };
          }
        }
      });
    }
  }

  // ===================== Catálogos =====================
  async function carregarInstituicoes() {
    try {
      const lista = await safeFetchJSON(API_INST);
      instituicoesMap = {};
      if (instituicaoSelect) instituicaoSelect.innerHTML = '<option value="">Selecione</option>';
      lista.forEach(inst => {
        const nome = inst.razao_social || inst.nome || '(sem nome)';
        instituicoesMap[inst._id] = nome;
        if (instituicaoSelect) {
          instituicaoSelect.innerHTML += `<option value="${inst._id}">${nome}</option>`;
        }
      });
      // popular o filtro
      populateFilterInstituicao();
    } catch (e) {
      console.error('Falha ao carregar instituições:', e);
      instituicoesMap = {};
      if (instituicaoSelect) instituicaoSelect.innerHTML = '<option value="">(erro ao carregar)</option>';
      populateFilterInstituicao(); // limpa opções do filtro
    }
  }

  // Apenas montamos nomes de UCs para exibir nos modais (o filtro usa IDs)
  async function carregarUCs() {
    try {
      const lista = await safeFetchJSON(`${API_UC}?page_size=1000`);
      lista.sort((a, b) => (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' }));
      ucsMap = {};
      lista.forEach(uc => { ucsMap[uc._id] = uc.descricao || '(sem descrição)'; });
    } catch (e) {
      console.error('Falha ao carregar UCs (ucsMap):', e);
      ucsMap = {};
    }
  }

  // ===================== Dados (instrutores) =====================
  async function carregarInstrutores() {
    try {
      instrutoresData = await safeFetchJSON(API_INSTRUTOR);
      applyFiltersAndRender();
    } catch (e) {
      console.error('Falha ao carregar instrutores:', e);
      instrutoresData = [];
      applyFiltersAndRender();
    }
  }

  // ===================== Filtros - UI Dinâmica (duas linhas) =====================
  function ensureFilterUI() {
    const tableSection = document.querySelector('.table-section');
    let filterSection = document.querySelector('.filter-section');

    // cria a seção se não existir
    if (!filterSection) {
      filterSection = document.createElement('div');
      filterSection.className = 'filter-section';
      tableSection?.prepend(filterSection);
    }

    // Zera o conteúdo e cria duas linhas


    // Zera o conteúdo e cria TRÊS linhas
    filterSection.innerHTML = '';
    filterSection.style.display = 'block';
    const rowStyle = 'display:flex;flex-wrap:wrap;gap:12px;align-items:end;width:100%';

    const row1 = document.createElement('div'); row1.style = rowStyle; // Buscar | Instituição | Status
    const row2 = document.createElement('div'); row2.style = rowStyle; // Turno | UCs | Com/sem UCs
    const row3 = document.createElement('div'); row3.style = rowStyle; // Ordenar por | Itens/página | Limpar filtros

    filterSection.appendChild(row1);
    filterSection.appendChild(row2);
    filterSection.appendChild(row3);

    // Helper criador de grupos
    const mkGroup = (html) => {
      const div = document.createElement('div');
      div.className = 'filter-group';
      div.innerHTML = html;
      return div;
    };

    // ================== LINHA 1: Buscar | Instituição | Status ==================
    if (searchInstrutorInput) {
      let grp = searchInstrutorInput.closest('.filter-group');
      if (!grp) {
        grp = mkGroup(`
      <label for="searchInstrutor">Buscar Instrutor (Nome, Matrícula, E-mail):</label>
    `);
        grp.appendChild(searchInstrutorInput);
      }
      row1.appendChild(grp);
    } else {
      // fallback, cria se não houver no HTML
      const grp = mkGroup(`
    <label for="searchInstrutor">Buscar Instrutor (Nome, Matrícula, E-mail):</label>
    <input type="text" id="searchInstrutor" placeholder="Digite para filtrar..." class="search-input"/>
  `);
      row1.appendChild(grp);
    }

    // Instituição (select único)
    row1.appendChild(mkGroup(`
  <label for="filterInstituicao">Instituição:</label>
  <select id="filterInstituicao" style="min-width:220px"></select>
`));

    // Status
    row1.appendChild(mkGroup(`
  <label for="filterStatus">Status:</label>
  <select id="filterStatus">
    <option value="Todos">Todos</option>
    <option value="Ativo">Ativo</option>
    <option value="Inativo">Inativo</option>
  </select>
`));

    // ============== LINHA 2: Turno | UCs | Com/sem UCs =================
    row2.appendChild(mkGroup(`
  <label for="filterTurnos">Turno:</label>
  <select id="filterTurnos" multiple style="min-width:200px">
    <option value="Manhã">Manhã</option>
    <option value="Tarde">Tarde</option>
    <option value="Noite">Noite</option>
  </select>
`));

    // UCs (multiselect via AJAX)
    row2.appendChild(mkGroup(`
  <label for="filterUcs">Mapa de Competência (UCs):</label>
  <select id="filterUcs" multiple style="min-width:260px"></select>
`));

    // Com/sem UCs
    row2.appendChild(mkGroup(`
  <label for="filterComSemUcs">Com/sem UCs:</label>
  <select id="filterComSemUcs">
    <option value="Todos">Todos</option>
    <option value="Com">Com UCs</option>
    <option value="Sem">Sem UCs</option>
  </select>
`));

    // ======= LINHA 3: Ordenar por | Itens/página | Limpar filtros =======
    row3.appendChild(mkGroup(`
  <label for="sortBy">Ordenar por:</label>
  <select id="sortBy">
    <option value="created_desc">Criado em (recente→antigo)</option>
    <option value="nome_asc">Nome (A→Z)</option>
    <option value="matricula_asc">Matrícula</option>
    <option value="carga_asc">Carga horária</option>
    <option value="status_asc">Status</option>
  </select>
`));

    row3.appendChild(mkGroup(`
  <label for="pageSize">Itens/página:</label>
  <select id="pageSize">
    <option value="10">10</option>
    <option value="25">25</option>
    <option value="50">50</option>
    <option value="100">100</option>
  </select>
`));

    // Botão Limpar filtros (desabilitado por padrão). Mantém o mesmo estilo.
    const grpClear = mkGroup(`
  <label>&nbsp;</label>
  <button id="btnClearFilters" class="btn btn-light" type="button" title="Limpar filtros" disabled>
    <i class="fas fa-broom"></i> Limpar filtros
  </button>
`);
    row3.appendChild(grpClear);

    // Paginação (prev/next + info), se não existir
    const tableResponsive = document.querySelector('.table-responsive');
    if (tableResponsive && !document.getElementById('pageInfo')) {
      const bar = document.createElement('div');
      bar.className = 'pagination-bar';
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '10px';
      bar.style.marginTop = '10px';
      bar.innerHTML = `
    <button class="btn btn-secondary" id="prevPage" type="button">Anterior</button>
    <span id="pageInfo">Página 1 de 1 • 0 registros</span>
    <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
  `;
      tableResponsive.appendChild(bar);
    }

    // Inicializa Select2 nos filtros multiselect (fora de modal)
    initFilterSelect2();
    // Conecta eventos
    wireFilterEvents();
    // Popular instituição
    populateFilterInstituicao();

  }
  function initFilterSelect2() {
    if (!window.$?.fn?.select2) return;

    // Turnos
    const $turnos = $('#filterTurnos');
    if ($turnos.length && !$turnos.hasClass('select2-hidden-accessible')) {
      $turnos.select2({ width: '100%', placeholder: 'Turnos...' });
    }

    // UCs (AJAX)
    const $ucs = $('#filterUcs');
    if ($ucs.length && !$ucs.hasClass('select2-hidden-accessible')) {
      $ucs.select2({
        width: '100%',
        placeholder: 'Selecione UCs...',
        minimumInputLength: 0,
        ajax: {
          url: '../backend/processa_unidade_curricular.php',
          dataType: 'json',
          delay: 250,
          cache: true,
          data: (params) => ({
            q: params.term || '',
            page: params.page || 1,
            page_size: 1000
          }),
          processResults: (data) => {
            const items = Array.isArray(data) ? data : (data.items || []);
            const results = items.map(uc => ({ id: uc._id, text: uc.descricao }));
            const pageSize = (Array.isArray(data) ? items.length : (data.page_size || 1000));
            const more = items.length === pageSize;
            return { results, pagination: { more } };
          }
        }
      });
    }
  }

  function populateFilterInstituicao() {
  const sel = document.getElementById('filterInstituicao');
  if (!sel) return;
  const current = sel.value || filters.instituicao || '';
  sel.innerHTML = `<option value="">Todas</option>`;
  Object.entries(instituicoesMap).forEach(([id, nome]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = nome;
    sel.appendChild(opt);
  });
  sel.value = current;
  updateClearBtn(); // <- ADICIONE ESTA LINHA
}

  // Lê o estado ATUAL da UI (sem depender do objeto filters)
  function getUIFilterState() {
    const $ = (id) => document.getElementById(id);
    return {
      text: ($('searchInstrutor')?.value || '').trim(),
      instituicao: $('filterInstituicao')?.value || '',
      status: $('filterStatus')?.value || 'Todos',
      comSemUcs: $('filterComSemUcs')?.value || 'Todos',
      turnos: (window.$ ? (window.$('#filterTurnos').val() || []) : []),
      ucs: (window.$ ? (window.$('#filterUcs').val() || []) : []),
    };
  }

  function hasActiveFiltersFromUI() {
    const s = getUIFilterState();
    return Boolean(
      s.text ||
      s.instituicao ||
      (s.status !== 'Todos') ||
      (s.comSemUcs !== 'Todos') ||
      (s.turnos && s.turnos.length) ||
      (s.ucs && s.ucs.length)
    );
  }

  function updateClearBtn() {
    const btn = document.getElementById('btnClearFilters');
    if (btn) btn.disabled = !hasActiveFiltersFromUI();
  }


  function wireFilterEvents() {
  const el = (id) => document.getElementById(id);

  // Busca textual — debounce
  if (searchInstrutorInput) {
    searchInstrutorInput.addEventListener('input', debounce(() => {
      filters.text = searchInstrutorInput.value || '';
      filters.page = 1;
      persistLastFilter();
      applyFiltersAndRender();
      updateClearBtn();
    }, 250));
  }

  el('filterInstituicao')?.addEventListener('change', (e) => {
    filters.instituicao = e.target.value || '';
    filters.page = 1;
    persistLastFilter();
    applyFiltersAndRender();
    updateClearBtn();
  });

  el('filterStatus')?.addEventListener('change', (e) => {
    filters.status = e.target.value || 'Todos';
    filters.page = 1;
    persistLastFilter();
    applyFiltersAndRender();
    updateClearBtn();
  });

  el('filterComSemUcs')?.addEventListener('change', (e) => {
    filters.comSemUcs = e.target.value || 'Todos';
    filters.page = 1;
    persistLastFilter();
    applyFiltersAndRender();
    updateClearBtn();
  });

  // Select2
  try {
    $('#filterTurnos').on('change', function () {
      filters.turnos = $(this).val() || [];
      filters.page = 1;
      persistLastFilter();
      applyFiltersAndRender();
      updateClearBtn();
    });
    $('#filterUcs').on('change', function () {
      filters.ucs = $(this).val() || [];
      filters.page = 1;
      persistLastFilter();
      applyFiltersAndRender();
      updateClearBtn();
    });
  } catch { }
  const btnClear = document.getElementById('btnClearFilters');
  if (btnClear && !btnClear._bound) {
    btnClear.addEventListener('click', () => {
      const $ = (id) => document.getElementById(id);
      if ($('searchInstrutor'))   $('searchInstrutor').value = '';
      if ($('filterInstituicao')) $('filterInstituicao').value = '';
      if ($('filterStatus'))      $('filterStatus').value = 'Todos';
      if ($('filterComSemUcs'))   $('filterComSemUcs').value = 'Todos';
      try { window.$ && window.$('#filterTurnos').val([]).trigger('change'); } catch {}
      try { window.$ && window.$('#filterUcs').val([]).trigger('change'); } catch {}

      filters = {
        ...filters,
        text: '',
        instituicao: '',
        status: 'Todos',
        turnos: [],
        ucs: [],
        comSemUcs: 'Todos',
        page: 1
      };
      persistLastFilter();
      applyFiltersAndRender();
      updateClearBtn(); // volta a desabilitar
    });
    btnClear._bound = true; // evita listeners duplicados
  }

  // *** sortBy / pageSize / paginação NÃO interferem no botão ***
  el('sortBy')?.addEventListener('change', (e) => {
    filters.sortBy = e.target.value || 'created_desc';
    filters.page = 1;
    persistLastFilter();
    applyFiltersAndRender();
    // não chama updateClearBtn()
  });

  el('pageSize')?.addEventListener('change', (e) => {
    filters.pageSize = Number(e.target.value || 10);
    filters.page = 1;
    persistLastFilter();
    applyFiltersAndRender();
    // não chama updateClearBtn()
  });

  el('prevPage')?.addEventListener('click', () => {
    if (filters.page > 1) {
      filters.page -= 1;
      persistLastFilter();
      applyFiltersAndRender();
    }
  });

  el('nextPage')?.addEventListener('click', () => {
    const { totalPages } = getFilteredAndSorted();
    if (filters.page < totalPages) {
      filters.page += 1;
      persistLastFilter();
      applyFiltersAndRender();
    }
  });
}


  function persistLastFilter() {
    localStorage.setItem(LS_LAST_FILTER, JSON.stringify(filters));
  }
  function loadLastFilter() {
    try {
      const last = JSON.parse(localStorage.getItem(LS_LAST_FILTER) || '{}');
      filters = { ...filters, ...last };
    } catch { }
  }
  function reflectFiltersToUI() {
    const el = (id) => document.getElementById(id);
    if (searchInstrutorInput) searchInstrutorInput.value = filters.text || '';
    if (el('filterInstituicao')) el('filterInstituicao').value = filters.instituicao || '';
    if (el('filterStatus')) el('filterStatus').value = filters.status || 'Todos';
    if (el('filterComSemUcs')) el('filterComSemUcs').value = filters.comSemUcs || 'Todos';
    if (el('sortBy')) el('sortBy').value = filters.sortBy || 'created_desc';
    if (el('pageSize')) el('pageSize').value = String(filters.pageSize || 10);

    // multiselects
    try { $('#filterTurnos').val(filters.turnos || []).trigger('change.select2'); } catch { }
    // UCs Select2 AJAX: injeta opções selecionadas para exibir imediatamente
    try {
      const $ucs = $('#filterUcs');
      const want = filters.ucs || [];
      want.forEach(id => {
        if (!$ucs.find(`option[value="${id}"]`).length) {
          const nome = ucsMap[id] || id;
          $ucs.append(new Option(nome, id, true, true));
        }
      });
      $ucs.trigger('change.select2');
    } catch {}

  }

  // ===================== Aplicar filtros, ordenar, paginar =====================
  function matchesInstituicao(instru) {
    if (!filters.instituicao) return true;
    return instru.instituicao_id === filters.instituicao;
  }
  function matchesStatus(instru) {
    if (filters.status === 'Todos') return true;
    return normalizeStatus(instru.status) === filters.status;
  }
  function matchesTurnos(instru) {
    if (!filters.turnos?.length) return true;
    const arr = Array.isArray(instru.turnos) ? instru.turnos : [];
    return arr.some(t => filters.turnos.includes(t));
  }
  function matchesUcs(instru) {
    if (!filters.ucs?.length) return true;
    const arr = Array.isArray(instru.mapa_competencia) ? instru.mapa_competencia : [];
    return arr.some(id => filters.ucs.includes(id));
  }
  function matchesComSemUcs(instru) {
    const n = Array.isArray(instru.mapa_competencia) ? instru.mapa_competencia.length : 0;
    if (filters.comSemUcs === 'Com') return n > 0;
    if (filters.comSemUcs === 'Sem') return n === 0;
    return true;
  }
  function matchesText(instru) {
    const term = strip(filters.text || '');
    if (!term) return true;
    const blob = strip(`${instru.nome || ''} ${instru.matricula || ''} ${instru.email || ''}`);
    return blob.includes(term);
  }

  function compareBy(a, b) {
    switch (filters.sortBy) {
      case 'nome_asc':
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
      case 'matricula_asc':
        return (a.matricula || '').localeCompare(b.matricula || '', 'pt-BR', { sensitivity: 'base' });
      case 'carga_asc':
        return (a.carga_horaria ?? 0) - (b.carga_horaria ?? 0);
      case 'status_asc':
        return normalizeStatus(a.status).localeCompare(normalizeStatus(b.status), 'pt-BR', { sensitivity: 'base' });
      case 'created_desc':
      default:
        return +getCreatedDate(b) - +getCreatedDate(a);
    }
  }

  function getFilteredAndSorted() {
    let filtered = instrutoresData.filter(i =>
      matchesText(i) &&
      matchesInstituicao(i) &&
      matchesStatus(i) &&
      matchesTurnos(i) &&
      matchesUcs(i) &&
      matchesComSemUcs(i)
    );

    filtered.sort(compareBy);

    // Paginação
    const total = filtered.length;
    const pageSize = Math.max(1, filters.pageSize || 10);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, filters.page || 1), totalPages);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    return { filtered, pageItems, total, page, totalPages, pageSize };
  }

  function applyFiltersAndRender() {
    const { pageItems, total, page, totalPages } = getFilteredAndSorted();
    renderTable(pageItems, total, page, totalPages);
  }

  // ===================== Render Tabela =====================
  function renderTable(rows, total, page, totalPages) {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = '';

    if (!rows.length) {
      const tr = document.createElement('tr');
      // 10 dados + 1 ações
      tr.innerHTML = `<td colspan="11">Nenhum Instrutor encontrado com os filtros aplicados.</td>`;
      dataTableBody.appendChild(tr);
    } else {
      rows.forEach(instrutor => {
        const turnosNomes = Array.isArray(instrutor.turnos) ? instrutor.turnos.join(', ') : '';
        const created = getCreatedDate(instrutor);
        const tr = document.createElement('tr');

        // Colunas (ordem do seu <thead>):
        // ID | Nome | Matrícula | Telefone | Email | Instituição | Turnos | Carga Horária | STATUS | CRIADO EM
        const tds = [
          instrutor._id || '',
          instrutor.nome || '',
          instrutor.matricula || '',
          instrutor.telefone || '',
          instrutor.email || '',
          instituicoesMap[instrutor.instituicao_id] || '',
          turnosNomes,
          (instrutor.carga_horaria ?? ''),
          normalizeStatus(instrutor.status),
          fmtDateBR(created)
        ];

        tds.forEach((val) => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });

        const tdAcoes = document.createElement('td');
        tdAcoes.className = 'actions';
        tdAcoes.innerHTML = `
          <button class="btn btn-icon btn-view" title="Visualizar" data-id="${instrutor._id}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-icon btn-edit" title="Editar" data-id="${instrutor._id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-icon btn-delete" title="Excluir" data-id="${instrutor._id}"><i class="fas fa-trash-alt"></i></button>
        `;
        tr.appendChild(tdAcoes);

        dataTableBody.appendChild(tr);
      });
    }

    // Atualiza paginação
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.textContent = `Página ${page} de ${totalPages} • ${total} registros`;
  }

  // ===================== Delegação eventos tabela =====================
  dataTableBody?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains('btn-view')) {
      const instrutor = instrutoresData.find(i => i._id === id);
      openVisualizarInstrutorModal(instrutor);
    } else if (btn.classList.contains('btn-edit')) {
      await openEditModal(id);
    } else if (btn.classList.contains('btn-delete')) {
      await deleteInstrutor(id);
    }
  });

  // ===================== Modais =====================
  async function openModal() {
    setFormDisabled(true);
    await carregarInstituicoes();
    await carregarUCs();          // preenche ucsMap
    initSelect2InModal();         // select2 do Turno e do Mapa (AJAX)
    setFormDisabled(false);
    showModal(instrutorModal);
  }

  function closeModal() {
    hideModal(instrutorModal);
    clearForm();
  }

  function openVisualizarInstrutorModal(instrutor) {
    if (!instrutor) return;
    viewInstituicao.value = instituicoesMap[instrutor.instituicao_id] || '';
    viewNomeInstrutor.value = instrutor.nome || '';
    viewMatriculaInstrutor.value = instrutor.matricula || '';
    viewCargaHoraria.value = instrutor.carga_horaria ?? '';
    viewTelefone.value = instrutor.telefone || '';
    viewEmail.value = instrutor.email || '';

    const ucs = Array.isArray(instrutor.mapa_competencia) ? instrutor.mapa_competencia : [];
    viewMapaCompetenciaList.innerHTML = ucs.length
      ? ucs.map(id => `<div>${ucsMap[id] || id}</div>`).join('')
      : '<div>-</div>';

    viewTurnosInstrutor.value = Array.isArray(instrutor.turnos) ? instrutor.turnos.join(', ') : '';

    showModal(visualizarInstrutorModal);
  }
  function closeVisualizarInstrutorModal() {
    hideModal(visualizarInstrutorModal);
  }

  async function openEditModal(id) {
    const instrutor = instrutoresData.find(e => e._id === id);
    if (!instrutor) return;

    modalTitle.textContent = 'Editar Instrutor';
    instrutorIdInput.value = instrutor._id || '';
    instituicaoSelect.value = '';
    nomeInstrutorInput.value = instrutor.nome || '';
    matriculaInstrutorInput.value = instrutor.matricula || '';
    cargaHorariaInput.value = instrutor.carga_horaria ?? '';
    instrutorTelefoneInput.value = instrutor.telefone || '';
    instrutorEmailInput.value = instrutor.email || '';

    setFormDisabled(true);
    await carregarInstituicoes();
    instituicaoSelect.value = instrutor.instituicao_id || '';

    // Status no editar
    if (statusSelect) statusSelect.value = (normalizeStatus(instrutor.status) === 'Inativo') ? 'Inativo' : 'Ativo';

    await carregarUCs();          // preenche ucsMap
    initSelect2InModal();         // garante select2 ativo

    // Turnos
    if (turnosSelect?.length) {
      turnosSelect.val(instrutor.turnos || []).trigger('change');
    }

    // Mapa de Competências (Select2 AJAX): injeta selecionadas se ainda não houver as options
    if (mapaCompetenciaSelect?.length) {
      const selecionadas = Array.isArray(instrutor.mapa_competencia) ? instrutor.mapa_competencia : [];
      selecionadas.forEach(idUC => {
        if (!mapaCompetenciaSelect.find(`option[value="${idUC}"]`).length) {
          const nome = ucsMap[idUC] || idUC;
          mapaCompetenciaSelect.append(new Option(nome, idUC, true, true));
        }
      });
      mapaCompetenciaSelect.trigger('change');
    }

    setFormDisabled(false);
    showModal(instrutorModal);
  }

  async function deleteInstrutor(id) {
    if (!confirm('Tem certeza que deseja excluir o Instrutor?')) return;
    try {
      await fetch(`${API_INSTRUTOR}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await carregarInstrutores();
    } catch (e) {
      console.error('Erro ao excluir instrutor:', e);
      alert('Erro ao excluir. Tente novamente.');
    }
  }

  // ===================== Validações formulário =====================
  function isValidEmail(e = '') { return EMAIL.test(e); }

  function validateFormFields() {
    clearAlert();

    // Instituição
    const inst = (instituicaoSelect?.value || '');
    if (!inst) { showAlert('Selecione uma instituição.'); instituicaoSelect?.focus(); return false; }

    // Nome
    let nome = sanitizeSpaces(nomeInstrutorInput?.value || '');
    if (nome.length < 3 || nome.length > 100) {
      showAlert('Nome deve ter entre 3 e 100 caracteres.'); nomeInstrutorInput?.focus(); return false;
    }
    if (FORBIDDEN.test(nome)) { showAlert('Nome contém caracteres inválidos.'); nomeInstrutorInput?.focus(); return false; }
    nomeInstrutorInput.value = nome;

    // Matrícula
    const matricula = (matriculaInstrutorInput?.value || '').trim();
    if (!MATRICULA.test(matricula)) {
      showAlert('Matrícula inválida. Use letras, números, ponto, hífen ou underline (3–20).');
      matriculaInstrutorInput?.focus(); return false;
    }

    // Carga Horária (1–60)
    const ch = Number(cargaHorariaInput?.value || 0);
    if (!Number.isInteger(ch) || ch < 1 || ch > 60) {
      showAlert('Carga horária deve ser um inteiro entre 1 e 60.');
      cargaHorariaInput?.focus(); return false;
    }

    // Telefone (opcional)
    let tel = (instrutorTelefoneInput?.value || '').trim();
    if (tel) {
      const digits = onlyDigits(tel);
      if (!(TELMASK.test(tel) || [10, 11].includes(digits.length))) {
        showAlert('Telefone inválido. Use (11) 98765-4321 ou informe 10/11 dígitos.');
        instrutorTelefoneInput?.focus(); return false;
      }
      instrutorTelefoneInput.value = maskPhone(tel);
    }

    // E-mail
    const email = (instrutorEmailInput?.value || '').trim().toLowerCase();
    if (!isValidEmail(email)) { showAlert('Informe um e-mail válido.'); instrutorEmailInput?.focus(); return false; }
    instrutorEmailInput.value = email;

    // Turnos – obrigatório
    const turnos = (turnosSelect?.length ? turnosSelect.val() : []) || [];
    if (!turnos.length) {
      showAlert('Selecione pelo menos um Turno.');
      try { turnosSelect?.select2('open'); } catch { document.getElementById('turnosInstrutor')?.focus(); }
      return false;
    }

    // Mapa de Competência – obrigatório
    const mapa = (mapaCompetenciaSelect?.length ? mapaCompetenciaSelect.val() : []) || [];
    if (!mapa.length) {
      showAlert('Selecione pelo menos uma Unidade Curricular no Mapa de Competência.');
      try { mapaCompetenciaSelect?.select2('open'); } catch { document.getElementById('mapaCompetencia')?.focus(); }
      return false;
    }

    // Status – sanity
    if (statusSelect && !['Ativo', 'Inativo'].includes(statusSelect.value)) {
      showAlert('Status inválido.'); statusSelect.focus(); return false;
    }

    return true;
  }

  [nomeInstrutorInput, matriculaInstrutorInput, instrutorTelefoneInput, instrutorEmailInput, instituicaoSelect, cargaHorariaInput, statusSelect]
    .forEach(el => el?.addEventListener('input', clearAlert));

  instrutorTelefoneInput?.addEventListener('input', (e) => {
    const pos = e.target.selectionStart;
    e.target.value = maskPhone(e.target.value);
    try { e.target.setSelectionRange(pos, pos); } catch { }
  });

  // ===================== Submit (criar/editar) =====================
  instrutorForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validateFormFields()) return;

    const id = instrutorIdInput?.value || '';
    const payload = {
      nome: sanitizeSpaces(nomeInstrutorInput?.value || ''),
      matricula: (matriculaInstrutorInput?.value || '').trim(),
      telefone: (instrutorTelefoneInput?.value || '').trim(),
      email: (instrutorEmailInput?.value || '').trim().toLowerCase(),
      instituicao_id: (instituicaoSelect?.value || ''),
      turnos: (turnosSelect?.length ? turnosSelect.val() : []) || [],
      mapa_competencia: (mapaCompetenciaSelect?.length ? mapaCompetenciaSelect.val() : []) || [],
      carga_horaria: Number(cargaHorariaInput?.value || 0) || 0,
      status: statusSelect?.value || 'Ativo'   // salva status
      // data_criacao é definido no backend
    };

    try {
      setFormDisabled(true);
      const opts = {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
      const url = id ? `${API_INSTRUTOR}?id=${encodeURIComponent(id)}` : API_INSTRUTOR;
      const res = await fetch(url, opts);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      showAlert('Instrutor salvo com sucesso!', 'success');
      setTimeout(async () => {
        closeModal();
        await carregarInstrutores();
      }, 200);
    } catch (e) {
      console.error('Erro ao salvar instrutor:', e);
      showAlert('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setFormDisabled(false);
    }
  });

  // ===================== Eventos UI (fora do form) =====================
  addInstrutorBtn?.addEventListener('click', async () => {
    clearForm();
    await openModal();
  });
  closeInstrutorModalBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  closeVisualizarInstrutor?.addEventListener('click', closeVisualizarInstrutorModal);
  fecharVisualizarInstrutor?.addEventListener('click', closeVisualizarInstrutorModal);

  window.addEventListener('click', (ev) => {
    if (ev.target === instrutorModal) closeModal();
    if (ev.target === visualizarInstrutorModal) closeVisualizarInstrutorModal();
  });

  // ===================== Bootstrap =====================
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // UI dos filtros (duas linhas)
      ensureFilterUI();
      // Carrega "último filtro" salvo
      loadLastFilter();
      reflectFiltersToUI();
      // Botão "Limpar filtros" (usa helper do geral.js)
      // Habilita quando QUALQUER filtro (exceto Itens/página e Ordenação) estiver ativo
      updateClearBtn();

      // Catálogos
      await carregarInstituicoes();
      await carregarUCs();

      // Dados
      await carregarInstrutores();
    } catch (e) {
      console.error('Falha ao inicializar a página de instrutores:', e);
    }
  });
})();
