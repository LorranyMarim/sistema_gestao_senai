// gestao_turmas.js (refatorado)
(() => {
  'use strict';
  // Referências para os controles de paginação
const pagElements = {
  prev: document.getElementById('prevPage'),
  next: document.getElementById('nextPage'),
  info: document.getElementById('pageInfo'),
  sizeSel: document.getElementById('pageSize')
};

  // ========================= ESTADO & CACHES =========================
  let cursosCache = [];
  let instrutoresCache = [];
  let empresasMap = new Map();
  let allTurmas = [];
const { paginateData, bindControls, updateUI } = App.pagination;
  const state = { page: 1, pageSize: 25, sort: 'created_desc' };

  // ========================= HELPERS GERAIS =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const esc = (s = '') => String(s).replace(/[&<>"'`=\/]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
  }[c]));

  const distinct = arr => [...new Set(arr.filter(Boolean))];

  const getVal = (sel) => $(sel)?.value?.trim() || '';
  const getNum = (sel, def = 0) => {
    const v = Number(getVal(sel));
    return Number.isFinite(v) ? v : def;
  };
  const getOptText = (sel) => {
    const el = $(sel);
    if (!el) return '';
    const idx = el.selectedIndex;
    return idx >= 0 ? (el.options[idx]?.text || '') : '';
  };

  const getTurmaId = (t) => t?.id ?? t?._id ?? t?.id_turma ?? t?.uuid ?? t?.codigo ?? '';

  const statusAtivo = (rec) => {
    const raw = rec?.status ?? rec?.situacao ?? rec?.ativo ?? rec?.estado;
    if (typeof raw === 'boolean') return raw;
    const s = String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return s === 'ativo' || s === 'ativa' || s === 'true' || s === '1';
  };

  const addInvalid = (el, msg) => { if (el) { el.classList.add('is-invalid'); if (msg) el.title = msg; } };
  const clearInvalid = (el) => { if (el) { el.classList.remove('is-invalid'); el.removeAttribute('title'); } };

  const fmtBR = (iso) => {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : iso;
  };

  const fmtDateHoraBR = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (isNaN(+d)) return String(v);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
    } catch { return String(v); }
  };

  const fetchJSON = async (url, init) => {
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { return txt; }
  };

  const loadSelectOptions = (sel, items, getValFn, getLabelFn, placeholder = 'Selecione', keep) => {
    if (!sel) return;
    const prev = keep ?? sel.value;
    sel.disabled = true;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(it => {
      const value = getValFn(it);
      const label = getLabelFn(it);
      if (value) sel.add(new Option(label, value));
    });
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
    sel.disabled = false;
  };

  // ========================= CURSOS / INSTRUTORES / EMPRESAS =========================
  async function ensureCursosCache() {
    if (cursosCache.length) return;
    try {
      const data = await fetchJSON('../backend/processa_curso.php');
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      cursosCache = items.filter(statusAtivo)
        .filter((it => { // remove duplicados por id
          const seen = new Set();
          return x => {
            const id = x.id || x._id;
            if (!id || seen.has(id)) return false;
            seen.add(id); return true;
          };
        })())
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    } catch (e) {
      console.error('Falha ao carregar cursos:', e);
      cursosCache = [];
    }
  }

  const getCursoById = (id) => (cursosCache || []).find(c => String(c._id || c.id) === String(id || ''));
  const getCursoMetaById = (id) => {
    const c = getCursoById(id) || {};
    return {
      area_tecnologica: c.area_tecnologica || c.area || '',
      nivel_curso: c.nivel_curso || c.nivel || '',
      tipo: c.tipo || '',
      categoria: c.categoria || '',
    };
  };

  async function carregarInstrutoresLista() {
    if (instrutoresCache.length) return instrutoresCache;
    try {
      const data = await fetchJSON('../backend/processa_instrutor.php');
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      instrutoresCache = items.map(it => ({
        id: it.id || it._id || '',
        nome: it.nome || it.nome_completo || '(sem nome)',
        status_ok: statusAtivo(it),
        mapa_competencia: (Array.isArray(it.mapa_competencia) ? it.mapa_competencia : []).map(String).filter(Boolean)
      })).filter(x => x.id);
    } catch (e) {
      console.error('Erro ao carregar instrutores:', e);
      instrutoresCache = [];
    }
    return instrutoresCache;
  }

  async function carregarEmpresasParaMapa() {
    try {
      const data = await fetchJSON('../backend/processa_empresa.php');
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      empresasMap = new Map(items.map(it => [
        String(it.id || it._id),
        it.razao_social || it.nome || it.nome_fantasia || '(sem nome)'
      ]));
    } catch (e) {
      console.error('Falha ao carregar empresas p/ tabela:', e);
      empresasMap = new Map();
    }
  }

  async function carregarEmpresasFiltro() {
    const sel = $('#filterEmpresa');
    if (!sel) return;
    const keep = sel.value || 'Todos';
    sel.disabled = true;
    sel.innerHTML = '<option value="Todos">Carregando…</option>';
    try {
      const data = await fetchJSON('../backend/processa_empresa.php');
      const itemsRaw = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const nomes = distinct(itemsRaw.filter(statusAtivo).map(it =>
        it.razao_social || it.nome || it.nome_fantasia || it.fantasia || it.cnpj_razao || '(sem nome)'
      )).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
      sel.innerHTML = '<option value="Todos">Todos</option>' + nomes.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
      sel.value = [...sel.options].some(o => o.value === keep) ? keep : 'Todos';
      sel.dataset.filled = '1';
    } catch (e) {
      console.error('Erro ao carregar empresas para filtro:', e);
      sel.innerHTML = '<option value="Todos">Falha ao carregar</option>';
      sel.value = 'Todos';
    } finally { sel.disabled = false; }
  }

  // ========================= LISTAGEM / FILTROS =========================
  function populateFilterOptions(items) {
    const selEmp = $('#filterEmpresa');
    const selArea = $('#filterArea');

    if (selEmp && !selEmp.dataset.filled) {
      const empresas = distinct(items.map(i => i.empresa_razao_social));
      selEmp.innerHTML = `<option value="Todos">Todos</option>` + empresas.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      selEmp.dataset.filled = '1';
    }
    if (selArea && !selArea.dataset.filled) {
      const areas = distinct(items.map(i => i.area_tecnologica));
      selArea.innerHTML = `<option value="Todos">Todos</option>` + areas.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      selArea.dataset.filled = '1';
    }
  }

  const readFilters = () => ({
    q: ($('#searchTurma')?.value || '').trim().toLowerCase(),
    empresa: $('#filterEmpresa')?.value || 'Todos',
    status: $('#filterStatus')?.value || 'Todos',
    turno: $('#filterTurno')?.value || 'Todos',
    area: $('#filterArea')?.value || 'Todos',
    pageSize: Number($('#pageSize')?.value || 25),
  });

  function applyFilters(items, f) {
    return items.filter(t => {
      if (f.empresa !== 'Todos' && (t.empresa_razao_social || '—') !== f.empresa) return false;

      if (f.status !== 'Todos') {
        const st = (typeof t.status === 'boolean') ? (t.status ? 'Ativo' : 'Inativo') : String(t.status || '').trim();
        if (st.toLowerCase() !== f.status.toLowerCase()) return false;
      }

      if (f.turno !== 'Todos' && String(t.turno || '').toUpperCase() !== f.turno.toUpperCase()) return false;
      if (f.area !== 'Todos' && String(t.area_tecnologica || '') !== f.area) return false;

      if (f.q) {
        const hay = `${t.codigo || ''} ${t.area_tecnologica || ''} ${t.empresa_razao_social || ''}`.toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });
  }

  const sorters = {
    'created_desc': (a, b) => new Date(b.data_hora_criacao || 0) - new Date(a.data_hora_criacao || 0),
    'created_asc': (a, b) => new Date(a.data_hora_criacao || 0) - new Date(b.data_hora_criacao || 0),
    'codigo_asc': (a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { sensitivity: 'base' }),
    'codigo_desc': (a, b) => (b.codigo || '').localeCompare(a.codigo || '', 'pt-BR', { sensitivity: 'base' }),
    'empresa_asc': (a, b) => (a.empresa_razao_social || '').localeCompare(b.empresa_razao_social || '', 'pt-BR', { sensitivity: 'base' }),
    'area_asc': (a, b) => (a.area_tecnologica || '').localeCompare(b.area_tecnologica || '', 'pt-BR', { sensitivity: 'base' }),
    'status_asc': (a, b) => (a.status || '').localeCompare(b.status || '', 'pt-BR', { sensitivity: 'base' }),
    'turno_asc': (a, b) => (a.turno || '').localeCompare(b.turno || '', 'pt-BR', { sensitivity: 'base' }),
  };

  const turmaRowHTML = (t) => {
    const statusTxt = (typeof t.status === 'boolean') ? (t.status ? 'Ativo' : 'Inativo') : (t.status || '—');
    const criadoEm = fmtDateHoraBR(t.data_hora_criacao || t.criado_em);
    const empresaNome = t.empresa_razao_social || '—';
    const tid = getTurmaId(t);
    return `
      <tr data-id="${esc(tid)}">
        <td>${esc(t.codigo || '')}</td>
        <td>${esc(t.turno || '')}</td>
        <td>${esc(t.area_tecnologica || '')}</td>
        <td>${esc(empresaNome)}</td>
        <td>${esc(statusTxt)}</td>
        <td>${esc(criadoEm)}</td>
        <td class="actions">
          <button type="button" class="btn btn-icon btn-view" title="Visualizar" data-id="${esc(tid)}">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-icon btn-edit" title="Editar" data-id="${esc(tid)}">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>`;
  };

function renderFiltered() {
    const f = readFilters();

    // 1. Filtra e Ordena
    const filteredRows = applyFilters(allTurmas, f).sort(sorters['created_desc']);

    // 2. Pagina usando o módulo centralizado
    const { pagedData, meta } = paginateData(filteredRows, state.page, f.pageSize);

    // Atualiza estado local caso a página tenha sido ajustada automaticamente
    state.page = meta.page;

    // 3. Renderiza Tabela
    const tbody = $('#turmasTable tbody');
    if (tbody) {
        tbody.innerHTML = pagedData.length
            ? pagedData.map(turmaRowHTML).join('')
            : `<tr><td colspan="7" class="text-muted">Nenhum registro encontrado.</td></tr>`;
    }

    // 4. Atualiza Botões e Texto (Geral.js)
    updateUI(pagElements, meta);

    // 5. Atualiza estado do botão limpar
    const hasFilters = !!(f.q || f.empresa !== 'Todos' || f.status !== 'Todos' || f.turno !== 'Todos' || f.area !== 'Todos');
    const btnClear = $('#btnClearFilters');
    if (btnClear) btnClear.disabled = !hasFilters;
}
  async function carregarTurmas() {
    const tbody = $('#turmasTable tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Carregando…</td></tr>`;
    try {
      const data = await fetchJSON('../backend/processa_turma.php');
      allTurmas = Array.isArray(data?.items) ? data.items : [];
      populateFilterOptions(allTurmas);
      renderFiltered();
    } catch (e) {
      console.error('Falha ao buscar turmas:', e);
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger">Erro ao carregar turmas.</td></tr>`;
    }
  }

  function attachFilterHandlers() {
    // 1. Listeners dos filtros (Input de texto, Selects de filtro)
    ['searchTurma', 'filterEmpresa', 'filterStatus', 'filterTurno', 'filterArea', 'pageSize'].forEach(id => {
        const el = $('#' + id);
        if (!el) return;
        
        // Ao digitar ou trocar filtro, volta para página 1 e renderiza
        on(el, 'input', () => { state.page = 1; renderFiltered(); });
        on(el, 'change', () => { state.page = 1; renderFiltered(); });
    });

    // 2. Botão Limpar Filtros
    const btnClear = $('#btnClearFilters');
    if (btnClear) on(btnClear, 'click', () => {
        const setVal = (id, v) => { const el = $('#' + id); if (el) el.value = v; };
        setVal('searchTurma', '');
        setVal('filterEmpresa', 'Todos');
        setVal('filterStatus', 'Todos');
        setVal('filterTurno', 'Todos');
        setVal('filterArea', 'Todos');
        state.page = 1;
        renderFiltered();
    });

    // 3. Paginação (Nova Lógica)
    
    // --> MANTENHA ESTA LINHA <--
    // Ela garante que o select comece com o valor certo (ex: 25)
    if (pagElements.sizeSel) pagElements.sizeSel.value = state.pageSize; 

    // Removemos os clicks manuais antigos e usamos a central:
    bindControls(pagElements, (action, value) => {
        if (action === 'prev') state.page--;
        if (action === 'next') state.page++;
        if (action === 'size') {
            state.page = 1;
            // O valor do pageSize é pego automaticamente no renderFiltered -> readFilters
        }
        renderFiltered();
    });
}

  // ========================= VIEWER (MODAL DE VISUALIZAÇÃO) =========================
  const getUcNomeByCurso = (cursoId, ucId) => {
    if (!cursoId || !ucId) return '';
    const curso = getCursoById(cursoId);
    const lista = Array.isArray(curso?.ordem_ucs) ? curso.ordem_ucs : [];
    const uc = lista.find(u => String(u.id || u._id || u.id_uc) === String(ucId));
    return uc?.nome || uc?.unidade_curricular || uc?.titulo || '';
  };

  const getInstrutorNomeById = (instrutorId) => {
    if (!instrutorId) return 'Sem instrutor';
    const i = (instrutoresCache || []).find(x => String(x.id) === String(instrutorId));
    return i?.nome || 'Sem instrutor';
  };

  function buildTurmaSummaryHTMLFromObject(turma) {
    const cursoNome = turma.curso_nome || getCursoById(turma.id_curso)?.nome || '—';
    const empresaNome = turma.empresa_razao_social || empresasMap.get(String(turma.id_empresa)) || '—';
    const instituicaoNome = turma.instituicao_nome || turma.instituicao_razao_social || '—';
    const calendarioNome = turma.calendario_nome || '—';

    const dataObj = {
      'Instituição': instituicaoNome,
      'Código da Turma': turma.codigo || '—',
      'Curso': cursoNome,
      'Área Tecnológica': turma.area_tecnologica || '—',
      'Nível do Curso': turma.nivel_curso || '—',
      'Tipo': turma.tipo || '—',
      'Categoria': turma.categoria || '—',
      'Empresa/Parceiro': empresaNome,
      'Calendário': calendarioNome,
      'Data de Início': turma.data_inicio ? fmtBR(turma.data_inicio) : '—',
      'Data de Fim': turma.data_fim ? fmtBR(turma.data_fim) : '—',
      'Turno': turma.turno || '—',
      'Quantidade de Alunos': (turma.num_alunos ?? '') || '—',
      'Status da Turma': turma.status || '—',
    };

    const ucs = Array.isArray(turma.unidades_curriculares) ? turma.unidades_curriculares : [];
    const ucRows = ucs.map((uc, idx) => ({
      ordem: idx + 1,
      descricao: getUcNomeByCurso(turma.id_curso, uc.id_uc) || '(sem nome)',
      inicio: uc.data_inicio ? fmtBR(uc.data_inicio) : '—',
      fim: uc.data_fim ? fmtBR(uc.data_fim) : '—',
      instrutor: getInstrutorNomeById(uc.id_instrutor)
    }));

    const lines = Object.entries(dataObj).map(([k, v]) => `
      <tr>
        <th class="bg-light">${k}</th>
        <td>${v ? esc(v) : '<span class="text-muted">—</span>'}</td>
      </tr>`).join('');

    const ucTable = ucRows.length
      ? `
        <div class="table-responsive">
          <table class="table table-sm table-striped mb-0">
            <thead>
              <tr>
                <th style="width: 80px;">Ordem</th>
                <th>Descrição</th>
                <th style="width: 120px;">Início</th>
                <th style="width: 120px;">Fim</th>
                <th style="width: 220px;">Instrutor</th>
              </tr>
            </thead>
            <tbody>
              ${ucRows.map(r => `
                <tr>
                  <td>${r.ordem}º</td>
                  <td>${esc(r.descricao)}</td>
                  <td>${esc(r.inicio)}</td>
                  <td>${esc(r.fim)}</td>
                  <td>${esc(r.instrutor)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      : '<span class="text-muted">—</span>';

    return `
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle summary-table">
          <tbody>
            ${lines}
            <tr>
              <th class="bg-light">Unidades Curriculares</th>
              <td>${ucTable}</td>
            </tr>
            <tr>
              <th class="bg-light">Observações</th>
              <td>${turma.observacoes ? esc(turma.observacoes) : '<span class="text-muted">—</span>'}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  async function openTurmaViewer(turmaId) {
    const modalEl = $('#viewTurmaModal');
    const bodyEl = $('#viewTurmaBody');
    const subEl = $('#viewTurmaSubTitle');
    if (!modalEl || !bodyEl || !turmaId) return;

    let turma = allTurmas.find(t => String(t.id) === String(turmaId));
    if (!turma) {
      try {
        const data = await fetchJSON(`http://localhost:8000/api/turmas/${encodeURIComponent(turmaId)}`);
        turma = data?.item || data;
      } catch (e) {
        console.error('Falha ao buscar turma por id:', e);
      }
    }
    if (!turma) return alert('Não foi possível localizar esta turma.');

    await Promise.all([
      ensureCursosCache(),
      carregarInstrutoresLista().catch(() => {}),
      carregarEmpresasParaMapa().catch(() => {}),
    ]);

    if (subEl) {
      const empresaNome = turma.empresa_razao_social || empresasMap.get(String(turma.id_empresa)) || '';
      subEl.textContent = `${turma.codigo || ''}${empresaNome ? ` • ${empresaNome}` : ''}`;
    }

    bodyEl.innerHTML = buildTurmaSummaryHTMLFromObject(turma);

    const inst = (window.bootstrap && bootstrap.Modal)
      ? bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: true })
      : null;
    if (inst) inst.show();
  }

  // ========================= MODAL DE CADASTRO (STEPPER) =========================
  async function carregarInstituicoes() {
    const sel = $('#instituicaoTurma');
    if (!sel) return;
    try {
      const data = await fetchJSON('../backend/processa_instituicao.php');
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      loadSelectOptions(sel, items, it => it.id || it._id || '', it =>
        it.razao_social || it.nome || it.nome_fantasia || it.fantasia || it.cnpj_razao || '(sem nome)', 'Selecione');
    } catch (e) {
      console.error('Erro ao carregar instituições', e);
      sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
      sel.disabled = false;
    }
  }

  async function carregarCursos() {
    const sel = $('#cursoTurma');
    if (!sel) return;

    const ctrl = new AbortController();
    $('#addTurmaModal')?.addEventListener('hide.bs.modal', () => ctrl.abort(), { once: true });

    try {
      await ensureCursosCache();
      loadSelectOptions(sel, cursosCache, it => it.id || it._id || '', it => it.nome || '(sem nome)', 'Selecione');
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao carregar cursos', e);
        sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
        sel.disabled = false;
      }
    }
  }

  async function carregarEmpresas() {
    const sel = $('#empresaTurma');
    if (!sel) return;
    try {
      const data = await fetchJSON('../backend/processa_empresa.php');
      const items = (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])).filter(statusAtivo);
      loadSelectOptions(sel, items, it => it.id || it._id || '', it =>
        it.razao_social || it.nome || it.nome_fantasia || it.fantasia || it.cnpj_razao || '(sem nome)', 'Selecione');
    } catch (e) {
      console.error('Erro ao carregar empresas', e);
      sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
      sel.disabled = false;
    }
  }

  async function carregaCalendarios() {
    const sel = $('#calendarioTurma');
    if (!sel) return;
    try {
      const data = await fetchJSON('../backend/processa_calendario.php');
      const items = (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])).filter(statusAtivo);
      loadSelectOptions(sel, items, it => it.id || it._id || '', it =>
        it.nome_calendario || it.nome || it.descricao || '(sem nome)', 'Selecione');
    } catch (e) {
      console.error('Erro ao carregar calendários', e);
      sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
      sel.disabled = false;
    }
  }

  function aplicarRegraDatas() {
    const i = $('#dataInicio'), f = $('#dataFim');
    if (!i || !f) return;

    const update = () => {
      const vi = (i.value || '').trim();
      if (!vi) {
        f.value = '';
        f.disabled = true;
        f.removeAttribute('min');
        clearInvalid(f);
        return;
      }
      f.disabled = false;
      f.min = vi;
      if (f.value && f.value < vi) { f.value = vi; clearInvalid(f); }
    };

    f.disabled = true;
    update();

    if (!i.dataset.boundInicioFim) {
      on(i, 'input', update);
      on(i, 'change', update);
      i.dataset.boundInicioFim = '1';
    }
  }

  function bindUcDateRules(row) {
    const i = row.querySelector('[data-uc-inicio]');
    const f = row.querySelector('[data-uc-fim]');
    if (!i || !f) return;

    const update = () => {
      const vi = (i.value || '').trim();
      if (!vi) {
        f.value = ''; f.disabled = true; f.removeAttribute('min'); clearInvalid(f); return;
      }
      f.disabled = false; f.min = vi;
      if (f.value && f.value < vi) { f.value = vi; clearInvalid(f); }
      const max = $('#dataFim')?.value; if (max) f.max = max;
    };

    const turmaStart = $('#dataInicio')?.value;
    const turmaEnd = $('#dataFim')?.value;
    if (turmaStart) i.min = turmaStart;
    if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }

    on(i, 'input', update); on(i, 'change', update);
    update();

    const ucId = row.dataset.ucId;
    const syncPeriod = () => updatePeriodForUc(ucId);
    ['input', 'change'].forEach(ev => {
      on(i, ev, syncPeriod);
      on(f, ev, syncPeriod);
    });
  }

  function setupUcChainRules() {
    const rows = $$('#ucsContainer [data-uc-row]');
    if (!rows.length) return;

    const turmaStart = $('#dataInicio')?.value || '';
    const turmaEnd = $('#dataFim')?.value || '';

    rows.forEach((row, idx) => {
      const i = row.querySelector('[data-uc-inicio]');
      const f = row.querySelector('[data-uc-fim]');
      if (!i || !f) return;

      if (idx === 0) {
        if (turmaStart) i.min = turmaStart;
        if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }
        i.disabled = false;
        return;
      }

      const prevF = rows[idx - 1].querySelector('[data-uc-fim]');

      const applyFromPrev = () => {
        const prevDf = (prevF?.value || '').trim();
        if (!prevDf) {
          i.value = ''; f.value = ''; i.disabled = true; f.disabled = true;
          i.removeAttribute('min'); i.removeAttribute('max');
          f.removeAttribute('min'); f.removeAttribute('max');
          clearInvalid(i); clearInvalid(f);
          return;
        }

        i.disabled = false;
        i.min = turmaStart && prevDf < turmaStart ? turmaStart : prevDf;
        if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }
        if (i.value && i.value < i.min) i.value = i.min;
        i.dispatchEvent(new Event('input', { bubbles: true }));
      };

      on(prevF, 'input', applyFromPrev);
      on(prevF, 'change', applyFromPrev);
      applyFromPrev();
    });
  }

  function applyTurmaDatesToUc() {
    const tStart = $('#dataInicio')?.value || '';
    const tEnd = $('#dataFim')?.value || '';
    $$('#ucsContainer [data-uc-row]').forEach(row => {
      const i = row.querySelector('[data-uc-inicio]');
      const f = row.querySelector('[data-uc-fim]');
      if (i) { i.min = tStart || ''; i.max = tEnd || ''; }
      if (f && tEnd) f.max = tEnd;
    });
    setupUcChainRules();
  }

  function getUcDatesFromStep4(ucId) {
    const row4 = $(`#ucsContainer [data-uc-row][data-uc-id="${ucId}"]`);
    if (!row4) return { di: '', df: '' };
    return {
      di: row4.querySelector('[data-uc-inicio]')?.value || '',
      df: row4.querySelector('[data-uc-fim]')?.value || ''
    };
  }

  function updatePeriodForUc(ucId) {
    if (!ucId) return;
    const { di, df } = getUcDatesFromStep4(ucId);
    const periodoTxt = (di && df) ? `${fmtBR(di)} - ${fmtBR(df)}` : '—';
    const row5 = $(`#ucsInstrutoresContainer [data-uc-id="${ucId}"]`);
    row5?.querySelector('[data-uc-period]')?.value = periodoTxt;
  }

  function renderUcsParaCurso() {
    const wrap = $('#ucsContainer');
    if (!wrap) return console.warn('ucsContainer não encontrado.');

    const idCurso = getVal('#cursoTurma');
    wrap.innerHTML = '';
    if (!idCurso) return wrap.innerHTML = '<div class="text-muted">Selecione um curso no passo 1.</div>';

    const curso = getCursoById(idCurso);
    if (!curso) return wrap.innerHTML = '<div class="text-danger">Curso não encontrado no cache.</div>';

    const ucs = Array.isArray(curso.ordem_ucs) ? curso.ordem_ucs : [];
    if (!ucs.length) return wrap.innerHTML = '<div class="text-muted">Este curso não possui UCs cadastradas.</div>';

    ucs.forEach((uc, idx) => {
      const row = document.createElement('div');
      row.className = 'row g-3 align-items-end mb-2';
      row.dataset.ucRow = '1';
      row.dataset.ucId = (uc.id || uc._id || uc.id_uc || '');

      row.innerHTML = `
        <div class="col-12 col-md-7 col-lg-8">
          <label class="form-label d-flex align-items-center">
            <span class="badge bg-secondary me-2">${idx + 1}º</span> Unidade Curricular
          </label>
          <div class="form-control uc-name pe-none bg-body-secondary" role="textbox" aria-disabled="true">
            ${esc(uc.nome || uc.unidade_curricular || uc.titulo || '(sem nome)')}
          </div>
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <label class="form-label">Início</label>
          <input type="date" class="form-control" data-uc-inicio required />
        </div>
        <div class="col-6 col-md-2 col-lg-2">
          <label class="form-label">Fim</label>
          <input type="date" class="form-control" data-uc-fim required disabled />
        </div>`;
      wrap.appendChild(row);
      bindUcDateRules(row);
    });

    applyTurmaDatesToUc();
    setupUcChainRules();
  }

  async function renderUcsInstrutores() {
    const wrap = $('#ucsInstrutoresContainer');
    if (!wrap) return;

    wrap.innerHTML = '';
    const idCurso = getVal('#cursoTurma');
    if (!idCurso) return wrap.innerHTML = '<div class="text-muted">Selecione um curso no passo 1.</div>';

    const curso = getCursoById(idCurso);
    const ucs = Array.isArray(curso?.ordem_ucs) ? curso.ordem_ucs : [];
    if (!ucs.length) return wrap.innerHTML = '<div class="text-muted">Este curso não possui UCs cadastradas.</div>';

    try { await carregarInstrutoresLista(); } catch (e) { console.error('Erro ao carregar instrutores', e); }

    const popularSelectInstrutores = (sel) => {
      if (!sel) return;
      sel.innerHTML = '';
      sel.add(new Option('Sem instrutor', '', true, true));
      instrutoresCache.filter(it => it.status_ok).forEach(it => sel.add(new Option(it.nome, it.id)));
    };

    ucs.forEach((uc, idx) => {
      const ucId = String(uc.id || uc._id || uc.id_uc || '');
      const nomeUc = uc.nome || uc.unidade_curricular || uc.titulo || '(sem nome)';
      const { di, df } = getUcDatesFromStep4(ucId);
      const periodoTxt = (di && df) ? `${fmtBR(di)} - ${fmtBR(df)}` : '—';

      const row = document.createElement('div');
      row.className = 'row g-3 align-items-end mb-2';
      row.dataset.ucId = ucId;
      row.innerHTML = `
        <div class="col-12 col-lg-6">
          <label class="form-label d-flex align-items-center">
            <span class="badge bg-secondary me-2">${idx + 1}º</span> Unidade Curricular
          </label>
          <div class="form-control uc-name bg-body-secondary text-body-secondary" role="textbox" aria-disabled="true">
            ${esc(nomeUc)}
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <label class="form-label">Período</label>
          <input type="text" class="form-control bg-body-secondary text-body-secondary" data-uc-period value="${esc(periodoTxt)}" disabled readonly />
        </div>
        <div class="col-6 col-lg-3">
          <label class="form-label">Instrutor</label>
          <select class="form-select" data-uc-instrutor data-uc-id="${esc(ucId)}"></select>
        </div>`;
      wrap.appendChild(row);
      popularSelectInstrutores(row.querySelector('select[data-uc-instrutor]'));
    });
  }

  function validateRequiredIn(pane) {
    const required = $$('[required]', pane);
    for (const el of required) {
      if (!(el.value || '').trim()) {
        addInvalid(el, 'Campo obrigatório');
        const handler = () => clearInvalid(el);
        on(el, 'input', handler, { once: true });
        on(el, 'change', handler, { once: true });
        el.focus?.();
        return false;
      }
    }
    return true;
  }

  function validateDataRange() {
    const i = $('#dataInicio'), f = $('#dataFim');
    if (!i || !f) return true;
    const vi = i.value, vf = f.value;
    if (vi && vf && new Date(vf) < new Date(vi)) {
      addInvalid(f, 'Data de fim não pode ser anterior ao início');
      on(f, 'change', () => clearInvalid(f), { once: true });
      f.focus?.();
      return false;
    }
    return true;
  }

  const validateNumericMin = (el, min = 1) => {
    if (!el) return true;
    const v = Number(el.value);
    if (!Number.isFinite(v) || v < min) {
      addInvalid(el, `Valor mínimo: ${min}`);
      on(el, 'input', () => clearInvalid(el), { once: true });
      el.focus?.();
      return false;
    }
    return true;
  };

  function validateStep(step, panes) {
    const pane = panes.find(p => Number(p.dataset.step) === step);
    if (!pane) return true;

    if (!validateRequiredIn(pane)) return false;

    switch (step) {
      case 1: { const codigo = $('#codigoTurma'); if (codigo) codigo.value = (codigo.value || '').toUpperCase(); break; }
      case 2: if (!validateDataRange()) return false; break;
      case 3: if (!validateNumericMin($('#quantidadeAlunos'), 1)) return false; break;
      case 4: {
        const rows = $$('#ucsContainer [data-uc-row]');
        if (!rows.length) return alert('Selecione um curso com UCs no passo 1.'), false;
        for (const row of rows) {
          const i = row.querySelector('[data-uc-inicio]'), f = row.querySelector('[data-uc-fim]');
          if (!i?.value) return addInvalid(i, 'Obrigatório'), i?.focus?.(), false;
          if (!f?.value) return addInvalid(f, 'Obrigatório'), f?.focus?.(), false;
          if (f.value < i.value) return addInvalid(f, 'Fim não pode ser anterior ao início'), f?.focus?.(), false;
        }
        break;
      }
      default: break;
    }
    return true;
  }

  function buildSummary(summaryArea) {
    if (!summaryArea) return;
    const meta = getCursoMetaById(getVal('#cursoTurma')) || {};

    const data = {
      'Instituição': getOptText('#instituicaoTurma'),
      'Código da Turma': getVal('#codigoTurma'),
      'Curso': getOptText('#cursoTurma'),
      'Área Tecnológica': meta.area_tecnologica || '—',
      'Nível do Curso': meta.nivel_curso || '—',
      'Tipo': meta.tipo || '—',
      'Categoria': meta.categoria || '—',
      'Empresa/Parceiro': getOptText('#empresaTurma'),
      'Calendário': getOptText('#calendarioTurma'),
      'Data de Início': fmtBR(getVal('#dataInicio')),
      'Data de Fim': fmtBR(getVal('#dataFim')),
      'Turno': getOptText('#turnoTurma') || getVal('#turnoTurma'),
      'Quantidade de Alunos': getVal('#quantidadeAlunos'),
      'Status da Turma': getOptText('#statusTurma') || getVal('#statusTurma'),
    };

    const ucRows = [];
    $$('#ucsContainer [data-uc-row]').forEach((row, idx) => {
      const ucId = row.dataset.ucId || '';
      const desc = row.querySelector('.uc-name')?.textContent?.trim() || '(sem nome)';
      const di = row.querySelector('[data-uc-inicio]')?.value || '';
      const df = row.querySelector('[data-uc-fim]')?.value || '';
      const sel = $(`#ucsInstrutoresContainer select[data-uc-id="${ucId}"]`);
      let instrutor = 'Sem instrutor';
      if (sel) {
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value) instrutor = opt.text || 'Sem instrutor';
      }
      ucRows.push({ ordem: idx + 1, descricao: desc, inicio: di ? fmtBR(di) : '—', fim: df ? fmtBR(df) : '—', instrutor });
    });

    const lines = Object.entries(data).map(([k, v]) => `
      <tr><th class="bg-light">${k}</th><td>${v || '<span class="text-muted">—</span>'}</td></tr>`
    ).join('');

    const ucTable = ucRows.length ? `
      <div class="table-responsive">
        <table class="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th style="width: 80px;">Ordem</th>
              <th>Descrição</th>
              <th style="width: 120px;">Início</th>
              <th style="width: 120px;">Fim</th>
              <th style="width: 220px;">Instrutor</th>
            </tr>
          </thead>
          <tbody>
            ${ucRows.map(r => `
              <tr>
                <td>${r.ordem}º</td>
                <td>${esc(r.descricao)}</td>
                <td>${esc(r.inicio)}</td>
                <td>${esc(r.fim)}</td>
                <td>${esc(r.instrutor)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<span class="text-muted">—</span>';

    summaryArea.innerHTML = `
      <div class="alert alert-info mb-3">Confira os dados antes de concluir.</div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle summary-table"><tbody>
          ${lines}
          <tr><th class="bg-light">Unidades Curriculares</th><td>${ucTable}</td></tr>
          <tr><th class="bg-light">Observações</th><td><span id="obsPreview"></span></td></tr>
        </tbody></table>
      </div>`;

    const obs = $('#observacoesTurma'), obsPreview = $('#obsPreview');
    const setPreview = () => { const v = (obs?.value || '').trim(); obsPreview.textContent = v || '—'; };
    setPreview(); if (obs) on(obs, 'input', setPreview);
  }

  function buildPayload() {
    const meta = getCursoMetaById(getVal('#cursoTurma'));
    const instrutorByUc = {};
    $$('#ucsInstrutoresContainer select[data-uc-instrutor]').forEach(sel => {
      const ucId = sel.dataset.ucId;
      if (ucId) instrutorByUc[ucId] = sel.value || '';
    });

    const unidades_curriculares = [];
    $$('#ucsContainer [data-uc-row]').forEach(row => {
      const id_uc = row.dataset.ucId || '';
      const di = row.querySelector('[data-uc-inicio]')?.value || '';
      const df = row.querySelector('[data-uc-fim]')?.value || '';
      if (id_uc) unidades_curriculares.push({ id_uc, id_instrutor: instrutorByUc[id_uc] || '', data_inicio: di, data_fim: df });
    });

    return {
      codigo: getVal('#codigoTurma'),
      id_curso: getVal('#cursoTurma'),
      data_inicio: getVal('#dataInicio'),
      data_fim: getVal('#dataFim'),
      turno: getVal('#turnoTurma'),
      num_alunos: getNum('#quantidadeAlunos', 0),
      id_instituicao: getVal('#instituicaoTurma'),
      id_calendario: getVal('#calendarioTurma'),
      id_empresa: getVal('#empresaTurma'),
      status: getOptText('#statusTurma') || getVal('#statusTurma') || 'Ativo',
      area_tecnologica: meta.area_tecnologica,
      nivel_curso: meta.nivel_curso,
      tipo: meta.tipo,
      categoria: meta.categoria,
      observacoes: getVal('#observacoesTurma'),
      unidades_curriculares
    };
  }

  // ========================= BOOTSTRAP / LIFECYCLE =========================
  document.addEventListener('DOMContentLoaded', async () => {
    attachFilterHandlers();
    carregarEmpresasFiltro().catch(console.error);
    await carregarTurmas().catch(console.error);

    // Tabela - abrir viewer
    const table = $('#turmasTable');
    if (table) {
      on(table, 'click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (!btn) return;
        const turmaId = btn.dataset.id;
        if (turmaId) openTurmaViewer(turmaId);
      });
    }

    // Modal de cadastro
    const modalEl = $('#addTurmaModal');
    if (!modalEl) return;

    const bsModal = (window.bootstrap && bootstrap.Modal)
      ? new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false })
      : null;

    const addBtn = $('#addTurmaBtn');
    if (addBtn && !addBtn.hasAttribute('data-bs-toggle')) on(addBtn, 'click', () => bsModal && bsModal.show());

    const header = $('#stepperHeader');
    const items = $$('.stepper-item', header);
    const panes = $$('.step-pane');
    const btnNext = $('#btn-next');
    const btnBack = $('#btn-back');
    const summaryArea = $('#summaryArea');
    const total = items.length;
    let current = 1;

    // progresso do stepper
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    const setProgressPct = (pct) => { styleEl.textContent = `#progressLine::after{width:${pct}%;}`; };

    const setActive = (step) => {
      current = Math.min(Math.max(step, 1), total);
      items.forEach((el) => {
        const n = Number(el.dataset.step);
        el.classList.toggle('active', n === current);
        el.classList.toggle('completed', n < current);
        el.setAttribute('aria-current', n === current ? 'step' : 'false');
      });
      panes.forEach((p) => {
        const n = Number(p.dataset.step);
        p.classList.toggle('active', n === current);
        p.setAttribute('aria-hidden', n === current ? 'false' : 'true');
      });
      setProgressPct(((current - 1) / (total - 1)) * 100);
      btnBack.disabled = current === 1;
      btnNext.textContent = current === total ? 'Concluir' : 'Próximo';
      panes.find(p => Number(p.dataset.step) === current)?.querySelector('input,select,textarea,button')?.focus?.();
    };

    // validações & fluxo
    on(btnNext, 'click', async () => {
      if (current < total) {
        if (!validateStep(current, panes)) return;
        if (current + 1 === total) buildSummary(summaryArea);
        setActive(current + 1);
      } else {
        const payload = buildPayload();
        try {
          const resp = await fetch('../backend/processa_turma.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const txt = await resp.text();
          if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt}`);
          if (bsModal) bsModal.hide();
          await carregarTurmas();
          setTimeout(() => alert('Cadastro concluído!'), 120);
        } catch (e) {
          console.error('Falha ao salvar:', e);
          alert('Falha ao salvar a turma. Veja o console para detalhes.');
        }
      }
    });

    on(btnBack, 'click', () => setActive(current - 1));
    on($('#cursoTurma'), 'change', async () => {
      renderUcsParaCurso();
      await carregarInstrutoresLista();
      renderUcsInstrutores();
    });
    on($('#dataInicio'), 'change', applyTurmaDatesToUc);
    on($('#dataFim'), 'change', applyTurmaDatesToUc);

    items.forEach(item => {
      item.style.cursor = 'pointer';
      on(item, 'click', () => {
        const step = Number(item.dataset.step);
        if (step === current) return;
        if (step > current && !validateStep(current, panes)) return;
        if (step === total) buildSummary(summaryArea);
        setActive(step);
      });
    });

    panes.forEach(pane => {
      on(pane, 'keydown', (e) => {
        if (e.key === 'Enter') {
          const tag = (e.target.tagName || '').toLowerCase();
          if (['select', 'textarea'].includes(tag)) return;
          e.preventDefault();
          btnNext.click();
        }
      });
    });

    on(modalEl, 'show.bs.modal', async () => {
      current = 1;
      setActive(1);
      $$('.is-invalid').forEach(clearInvalid);
      aplicarRegraDatas();
      await Promise.all([
        carregarInstituicoes(),
        carregarEmpresas(),
        carregaCalendarios(),
        carregarCursos(),
        carregarInstrutoresLista()
      ]);
      if (getVal('#cursoTurma')) {
        renderUcsParaCurso();
        renderUcsInstrutores();
      }
    });

    // Uppercase em código
    const codigoTurma = $('#codigoTurma');
    on(codigoTurma, 'input', () => {
      const pos = codigoTurma.selectionStart;
      codigoTurma.value = (codigoTurma.value || '').toUpperCase();
      try { codigoTurma.setSelectionRange(pos, pos); } catch { }
    });
  });
})();
