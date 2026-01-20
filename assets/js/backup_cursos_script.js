/* eslint-disable no-console */

// ======================= Endpoints (via proxies PHP) =======================
const API_CURSO = '../backend/processa_curso.php';
const API_INST = '../backend/processa_instituicao.php';
const API_UC = '../backend/processa_unidade_curricular.php';

// ======================= Domínio (conjuntos permitidos) =======================
const TIPOS_SET = new Set(['Presencial', 'EAD', 'Semipresencial']);
const NIVEIS_SET = new Set(['Técnico', 'Aprendizagem','Aperfeiçoamento', 'Qualificação', 'Especialização']);
const STATUS_SET = new Set(['Ativo', 'Inativo']);
const CATEG_SET = new Set(['C', 'A']);
const AREA_SET = new Set(['TI', 'Metal Mecânica']);

// ======================= Cache/estado =======================
let cursosCache = [];
let instituicoesCache = [];
let ucsCache = [];
let ucDataMap = {};
let cursoEditando = null;
let modoEdicao = false;

// ======================= Filtros (estado + persistência) =======================
const LS_CURSOS_FILTERS = 'cursosFiltersLast';
let filtros = {
  text: '',
  instituicao: '',
  status: 'Todos',
  area: 'Todos',
  modalidade: 'Todos', // mapeia nivel_curso
  tipo: 'Todos',       // mapeia tipo
  ucs: [],             // array de IDs
  sortBy: 'created_desc',
  pageSize: 10,
  page: 1
};

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const strip = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function oidToDate(id){
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) return null;
  const ts = parseInt(String(id).slice(0, 8), 16);
  return new Date(ts * 1000);
}
function getCreatedDate(c){
  if (c?.data_criacao) {
    const d = new Date(c.data_criacao);
    if (!isNaN(+d)) return d;
  }
  // Correção: tenta c.id se c._id não existir
  return oidToDate(c?.id || c?._id) || new Date(0);
}


function saveFiltros() { localStorage.setItem(LS_CURSOS_FILTERS, JSON.stringify(filtros)); }
function loadFiltros() { try { filtros = { ...filtros, ...(JSON.parse(localStorage.getItem(LS_CURSOS_FILTERS) || '{}')) }; } catch { } }

function hasAtivos() {
  return !!(filtros.text ||
    filtros.instituicao ||
    filtros.status !== 'Todos' ||
    filtros.area !== 'Todos' ||
    filtros.modalidade !== 'Todos' ||
    filtros.tipo !== 'Todos' ||
    (Array.isArray(filtros.ucs) && filtros.ucs.length));
}
function updateClearBtn() {
  const btn = document.getElementById('btnClearFilters');
  if (btn) btn.disabled = !hasAtivos();
}

function initFilterUcsSelect2(){
  if (!window.$?.fn?.select2) return;

  const $ucs = $('#filterUcs');
  if (!$ucs.length || $ucs.hasClass('select2-hidden-accessible')) return;

  $ucs.select2({
    theme: 'bootstrap-5',     // <- deixa com o visual Bootstrap 5
    width: '100%',            // <- garante ocupar toda a largura
    placeholder: 'Unidades Curriculares...',
    allowClear: true,         // <- mostra o 'X' para limpar
    closeOnSelect: false,     // <- não fecha a cada seleção (multi)
    minimumInputLength: 0,
    ajax: {
      url: '../backend/processa_unidade_curricular.php',
      dataType: 'json',
      delay: 250,
      cache: true,
      data: params => ({
        q: params.term || '',
        page: params.page || 1,
        page_size: 1000
      }),
      processResults: (data) => {
        const items = Array.isArray(data) ? data : (data.items || []);
        return {
          results: items.map(uc => ({ id: uc._id || uc.id, text: uc.descricao || '' })),
          pagination: { more: items.length >= 1000 }
        };
      }
    }
  });

  // Se já houver UCs salvas em filtros.ucs, injeta as opções para aparecerem selecionadas
  try {
    (filtros.ucs || []).forEach(id => {
      if (!$ucs.find(`option[value="${id}"]`).length) {
        $ucs.append(new Option(ucDataMap[id] || id, id, true, true));
      }
    });
    $ucs.trigger('change.select2');
  } catch {}

  // Atualiza o estado dos filtros quando mudar
  $ucs.on('change', () => {
    filtros.ucs = $ucs.val() || [];
    filtros.page = 1;
    saveFiltros();
    applyFiltersAndRender();
    updateClearBtn();
  });
}


function populateFilterInstituicao(){
  const sel = document.getElementById('filterInstituicao');
  if (!sel) return;
  const current = sel.value || filtros.instituicao || '';
  sel.innerHTML = `<option value="">Todas</option>`;
  (instituicoesCache || []).forEach(inst => {
    const id = inst._id || inst.id;
    const nome = inst.razao_social || inst.nome || id;
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = nome;
    sel.appendChild(opt);
  });
  sel.value = current;
  updateClearBtn(); // <— acrescentar
}

function reflectFiltrosToUI() {
  const el = id => document.getElementById(id);
  if (el('searchCurso')) el('searchCurso').value = filtros.text || '';
  if (el('filterInstituicao')) el('filterInstituicao').value = filtros.instituicao || '';
  if (el('filterStatus')) el('filterStatus').value = filtros.status || 'Todos';
  if (el('filterArea')) el('filterArea').value = filtros.area || 'Todos';
  if (el('filterModalidade')) el('filterModalidade').value = filtros.modalidade || 'Todos';
  if (el('filterTipo')) el('filterTipo').value = filtros.tipo || 'Todos';
  if (el('sortBy')) el('sortBy').value = filtros.sortBy || 'created_desc';
  if (el('pageSize')) el('pageSize').value = String(filtros.pageSize || 10);

  // filterUcs: já tratado no initFilterUcsSelect2 (pré-injeção)
  updateClearBtn();
}

function wireFilterEvents() {
  const el = id => document.getElementById(id);

  // Busca textual
  $('#searchCurso').off('input').on('input', debounce(() => {
    filtros.text = $('#searchCurso').val() || '';
    filtros.page = 1; saveFiltros(); applyFiltersAndRender(); updateClearBtn();
  }, 250));

  // selects simples
  [['filterInstituicao', 'instituicao'], ['filterStatus', 'status'],
  ['filterArea', 'area'], ['filterModalidade', 'modalidade'], ['filterTipo', 'tipo']].forEach(([id, key]) => {
    el(id)?.addEventListener('change', e => {
      filtros[key] = e.target.value || (key === 'status' ? 'Todos' : '');
      filtros.page = 1; saveFiltros(); applyFiltersAndRender(); updateClearBtn();
    });
  });

  // Select2 de UCs (multi)
  try {
    $('#filterUcs').off('change').on('change', function () {
      filtros.ucs = $(this).val() || [];
      filtros.page = 1; saveFiltros(); applyFiltersAndRender(); updateClearBtn();
    });
  } catch { }

  // Ordenação e paginação
  el('sortBy')?.addEventListener('change', e => {
    filtros.sortBy = e.target.value || 'created_desc';
    filtros.page = 1; saveFiltros(); applyFiltersAndRender();
  });
  App.pagination.bindControls(
    {
      prev: document.getElementById('prevPage'),
      next: document.getElementById('nextPage'),
      sizeSel: document.getElementById('pageSize') // Se houver select de tamanho
    },
    (action, value) => {
      // Callback que o geral_script.js chama quando clica
      if (action === 'prev') filtros.page--;
      if (action === 'next') filtros.page++;
      if (action === 'size') {
        filtros.pageSize = value;
        filtros.page = 1;
      }
      
      saveFiltros();
      applyFiltersAndRender();
    }
  );

  
  // Limpar filtros
  const btnClear = el('btnClearFilters');
  if (btnClear && !btnClear._bound) {
    btnClear.addEventListener('click', () => {
      $('#searchCurso').val('');
      el('filterInstituicao').value = '';
      el('filterStatus').value = 'Todos';
      el('filterArea').value = 'Todos';
      el('filterModalidade').value = 'Todos';
      el('filterTipo').value = 'Todos';
      try { $('#filterUcs').val([]).trigger('change'); } catch { }

      filtros = {
        ...filtros, text: '', instituicao: '', status: 'Todos', area: 'Todos',
        modalidade: 'Todos', tipo: 'Todos', ucs: [], page: 1
      };
      saveFiltros(); applyFiltersAndRender(); updateClearBtn();
    });
    btnClear._bound = true;
  }
}
function matchesText(c) {
  const t = strip(filtros.text);
  if (!t) return true;
  const blob = strip([c.nome, c.area_tecnologica, c.nivel_curso, c.tipo, c.status].join(' '));
  return blob.includes(t);
}
function matchesInstituicao(c) {
  if (!filtros.instituicao) return true;
  return String(c.instituicao_id || '') === String(filtros.instituicao);
}
function matchesStatus(c) {
  if (filtros.status === 'Todos') return true;
  return (String(normalizeStatus(c.status)) === filtros.status);
}
function matchesArea(c) {
  if (filtros.area === 'Todos') return true;
  return String(c.area_tecnologica || '') === filtros.area;
}
function matchesModalidade(c) {
  if (filtros.modalidade === 'Todos') return true;
  return String(c.nivel_curso || '') === filtros.modalidade;
}
function matchesTipo(c) {
  if (filtros.tipo === 'Todos') return true;
  return String(c.tipo || '') === filtros.tipo;
}
function matchesUcs(c) {
  const sel = filtros.ucs || [];
  if (!sel.length) return true;
  const ids = Array.isArray(c.ordem_ucs) ? c.ordem_ucs.map(u => String(u.id)) : [];
  return sel.some(x => ids.includes(String(x)));
}

function compareBy(a, b) {
  switch (filtros.sortBy) {
    case 'nome_asc': return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
    case 'status_asc': return normalizeStatus(a.status).localeCompare(normalizeStatus(b.status), 'pt-BR', { sensitivity: 'base' });
    case 'area_asc': return (a.area_tecnologica || '').localeCompare(b.area_tecnologica || '', 'pt-BR', { sensitivity: 'base' });
    case 'modalidade_asc': return (a.nivel_curso || '').localeCompare(b.nivel_curso || '', 'pt-BR', { sensitivity: 'base' });
    case 'tipo_asc': return (a.tipo || '').localeCompare(b.tipo || '', 'pt-BR', { sensitivity: 'base' });
    case 'created_desc':
    default: return +getCreatedDate(b) - +getCreatedDate(a);
  }
}


// Substitua a função applyFiltersAndRender e getFilteredAndSorted antigas por esta lógica:

function getFilteredList() {
  // Apenas filtra e ordena, SEM FATIAR (SLICE)
  let list = (cursosCache || []).filter(c =>
    matchesText(c) && matchesInstituicao(c) && matchesStatus(c) && matchesArea(c) && matchesModalidade(c) &&
    matchesTipo(c) && matchesUcs(c)
  );
  list.sort(compareBy);
  return list;
}

function applyFiltersAndRender() {
  // 1. Pega lista completa filtrada
  const fullList = getFilteredList();

  // 2. Usa a ferramenta centralizada para paginar
  const { pagedData, meta } = App.pagination.paginateData(
    fullList, 
    filtros.page, 
    filtros.pageSize || 10
  );

  // Atualiza o filtro local caso a página tenha sido corrigida pelo paginateData (ex: usuário estava na pag 10 e filtrou, caindo pra pag 1)
  if (filtros.page !== meta.page) {
    filtros.page = meta.page;
    saveFiltros();
  }

  // 3. Renderiza a tabela com os dados da página (pagedData)
  renderCursosTable(pagedData);

  // 4. Atualiza os botões (Azul/Cinza) e o texto
  App.pagination.updateUI(
    {
      prev: document.getElementById('prevPage'),
      next: document.getElementById('nextPage'),
      info: document.getElementById('pageInfo')
    },
    meta
  );
}

// ======================= Utils UI =======================
function setLoadingTable(on) {
  const $tbody = $('#cursosTable tbody');
  if (on) {
    $tbody.html('<tr><td colspan="7">Carregando...</td></tr>');
  } else if (!$tbody.children().length) {
    $tbody.html('<tr><td colspan="7">Nenhum curso encontrado.</td></tr>');
  }
}

function showToast(msg, type = 'info') {
  alert(msg);
}

function setFieldError(selector, message) {
  const $el = $(selector);
  $el.addClass('border-red-500');
  let $err = $el.siblings('.field-error');
  if (!$err.length) {
    $err = $('<div class="field-error text-red-600 text-sm mt-1"></div>');
    $el.after($err);
  }
  $err.text(message || '');
}

function clearFieldError(selector) {
  const $el = $(selector);
  $el.removeClass('border-red-500');
  $el.siblings('.field-error').remove();
}

function disableForm(disabled) {
  const $form = $('#formCurso')[0];
  if (!$form) return;
  [...$form.elements].forEach(el => el.disabled = disabled);
}

// ======================= fetch com timeout =======================
async function fetchWithTimeout(url, opts = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...opts, signal: ctrl.signal, credentials: 'same-origin' });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

async function fetchJson(url, fallback = []) {
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return Array.isArray(data) ? data : (data?.items ?? data ?? fallback);
  } catch (err) {
    console.error('fetchJson falhou:', url, err);
    return fallback;
  }
}

// Carrega TODAS as UCs (ignorando paginação)
async function fetchAllUCs(pageSize = 1000) {
  let page = 1;
  let all = [];
  while (true) {
    const chunk = await fetchJson(`${API_UC}?page=${page}&page_size=${pageSize}`, []);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all = all.concat(chunk);
    if (chunk.length < pageSize) break;
    page += 1;
  }
  if (all.length === 0) {
    all = await fetchJson(`${API_UC}?page_size=${pageSize}`, []);
  }
  return all;
}

function fmtDateBR(val) {
  if (!val) return '—';
  try {
    const d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(+d)) return '—';
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  } catch { return '—'; }
}

function normalizeStatus(s) {
  if (!s && s !== 0) return '—';
  const t = String(s).toLowerCase().trim();
  if (t === 'ativo' || t === 'ativa' || t === 'true') return 'Ativo';
  if (t === 'inativo' || t === 'inativa' || t === 'false') return 'Inativo';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ======================= Bootstrap =======================
$(document).ready(function () {
  inicializarSelects();
  bindFecharModal();
  bindAccordionDelegation();
  carregarCursos();
  loadFiltros();
  reflectFiltrosToUI();
  wireFilterEvents();



  $('#btnAddCurso').on('click', () => {
    abrirModalCurso(false, null);
  });

  $('#formCurso').on('submit', salvarCurso);
  $('#saveAllUcsBtn').on('click', salvarUcsConfig);

  // limpar erros inline ao digitar
  $('#formCurso').on('input change', 'input, select, textarea', function () {
    clearFieldError(this);
  });
  $(document).on('click', '#cursosTable .btn-view, #cursosTable .btn-edit, #cursosTable .btn-delete', function () {
  const id = $(this).data('id');
  if ($(this).hasClass('btn-view')) {
    mostrarDetalheCurso(id);
  } else if ($(this).hasClass('btn-edit')) {
    abrirModalCurso(true, id);
  } else if ($(this).hasClass('btn-delete')) {
    excluirCurso(id);
  }
});

});

// Função para buscar TODOS os cursos paginados até acabar
async function fetchAllCursos() {
  let page = 1;
  const pageSize = 100; // O backend limita a 100 (le=100 em rotas_curso.py)
  let all = [];
  
  while (true) {
    // Busca página atual
    // O backend aceita parâmetros via GET, o PHP repassa a query string
    const url = `${API_CURSO}?page=${page}&page_size=${pageSize}`;
    const data = await fetchJson(url);
    
    // O fetchJson do seu projeto retorna data.items se existir, ou o próprio array
    const items = Array.isArray(data) ? data : (data.items || []);
    
    if (!items.length) break; // Acabaram os dados
    
    all = all.concat(items);
    
    // Se vier menos que o tamanho da página, é a última página
    if (items.length < pageSize) break;
    
    page++;
  }
  return all;
}
// ======================= Carga inicial =======================
// Substitua a função carregarCursos inteira por esta:
async function carregarCursos() {
  setLoadingTable(true);
  
  // Agora usamos fetchAllCursos() para garantir que pegamos tudo do banco
  const [cursos, insts] = await Promise.all([
    fetchAllCursos(), 
    fetchJson(API_INST, []),
  ]);
  
  // Carrega UCs (já existia)
  const ucs = await fetchAllUCs(1000);

  cursosCache = cursos || [];
  instituicoesCache = insts || [];
  ucsCache = ucs || [];

  ucDataMap = {};
  ucsCache.forEach(uc => {
    // Correção preventiva para ID de UCs também
    const id = uc.id || uc._id;
    if (id) ucDataMap[id] = uc.descricao || '';
  });

  populateFilterInstituicao();
  initFilterUcsSelect2();
  applyFiltersAndRender();
  updateClearBtn();
}

// ======================= Select2 =======================
function inicializarSelects() {
  $('#ucsSelect').select2({ theme: 'bootstrap-5', width: '100%' });
}

function bindFecharModal() {
  $(document).on('click', '[data-close]', function () {
    const alvo = $(this).attr('data-close');
    fecharModal(alvo);
  });
}

function bindAccordionDelegation() {
  $(document).on('click', '.accordion-button', function () {
    const ucid = $(this).attr('data-ucid');
    toggleAccordion(ucid);
  });
}

// ======================= Preenche selects =======================
function preencherSelectInstituicao(selectedId = '') {
  const $sel = $('#instituicaoId');
  $sel.empty().append('<option value="">Selecione</option>');
  instituicoesCache.forEach(inst => {
    const id = inst._id || inst.id;
    const nome = inst.razao_social || inst.nome || id;
    const selected = String(id) === String(selectedId) ? 'selected' : '';
    $sel.append(`<option value="${id}" ${selected}>${nome}</option>`);
  });
}

function preencherSelectUCs(selectedUcs = []) {
  const $sel = $('#ucsSelect');
  $sel.empty();
  ucsCache.forEach(uc => {
    $sel.append(`<option value="${uc._id || uc.id}">${uc.descricao || ''}</option>`);
  });
  $sel.val(selectedUcs || []).trigger('change');
}

// ======================= Tabela =======================
function renderCursosTable(cursos) {
  const $tbody = $('#cursosTable tbody');
  $tbody.empty();

  if (!Array.isArray(cursos) || !cursos.length) {
    $tbody.append('<tr><td colspan="7">Nenhum curso encontrado.</td></tr>');
    return;
  }

  cursos.forEach(curso => {
    const cursoId = curso.id || curso._id;
    $tbody.append(`
      <tr>
        <td>${curso.nome || ''}</td>
        <td>${curso.area_tecnologica || ''}</td>
        <td>${curso.nivel_curso || ''}</td>
        <td>${fmtDateBR(curso.data_criacao)}</td>
        <td>${normalizeStatus(curso.status)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-icon btn-view" data-id="${cursoId}" title="Visualizar"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${cursoId}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${cursoId}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `);
  });
}



// ======================= Modais =======================
function abrirModalCurso(edit = false, cursoId = null) {
  modoEdicao = !!edit;
  cursoEditando = edit ? cursosCache.find(c => String(c.id || c._id) === String(cursoId)) : null;

  preencherSelectInstituicao(edit ? cursoEditando?.instituicao_id : '');
  preencherSelectUCs(
    edit && Array.isArray(cursoEditando?.ordem_ucs)
      ? cursoEditando.ordem_ucs.map(u => u.id)
      : []
  );

  $('#nivelCurso').val(edit ? (cursoEditando?.nivel_curso || '') : '');
  $('#tipoCurso').val(edit ? (cursoEditando?.tipo || '') : '');
  $('#statusCurso').val(edit ? (cursoEditando?.status || 'Ativo') : 'Ativo');
  $('#cargaHoraria').val(edit ? (cursoEditando?.carga_horaria ?? '') : '');
  $('#cursoId').val(edit ? (cursoEditando?.id || cursoEditando?._id || '') : '');
  $('#nomeCurso').val(edit ? (cursoEditando?.nome || '') : '');
  $('#areaTecnologicaCurso').val(edit ? (cursoEditando?.area_tecnologica || '') : '');
  $('#observacao').val(edit ? (cursoEditando?.observacao || '') : '');

  $('#modalCursoTitulo').text(edit ? 'Editar Curso' : 'Adicionar Novo Curso');
  $('#modalCurso').addClass('show');
}

function fecharModal(modalId) {
  $('#' + modalId).removeClass('show');
  if (modalId === 'modalUcsConfig') {
    document.getElementById('modalUcsConfig').style.display = 'none';
    document.getElementById('ucsAccordion').innerHTML = '';
  }
}

// ======================= Validação =======================
function validarFormCurso() {
  let ok = true;

  // limpa erros
  ['#instituicaoId', '#nomeCurso', '#nivelCurso', '#tipoCurso', '#statusCurso', '#areaTecnologicaCurso', '#cargaHoraria', '#ucsSelect']
    .forEach(sel => clearFieldError(sel));

  const instituicao = $('#instituicaoId').val();
  const nome = ($('#nomeCurso').val() || '').trim();
  const modalidade = $('#nivelCurso').val();
  const tipo = $('#tipoCurso').val();
  const status = $('#statusCurso').val();
  const area = $('#areaTecnologicaCurso').val();
  const cargaHoraria = Number($('#cargaHoraria').val());
  const ucs = $('#ucsSelect').val() || [];

  // obrigatórios
  if (!instituicao) { setFieldError('#instituicaoId', 'Obrigatório'); ok = false; }
  if (!nome || nome.length < 3 || nome.length > 100) { setFieldError('#nomeCurso', 'Entre 3 e 100 caracteres'); ok = false; }
  if (!modalidade) { setFieldError('#nivelCurso', 'Obrigatório'); ok = false; }
  if (!tipo) { setFieldError('#tipoCurso', 'Obrigatório'); ok = false; }
  if (!status) { setFieldError('#statusCurso', 'Obrigatório'); ok = false; }
  if (!area) { setFieldError('#areaTecnologicaCurso', 'Obrigatório'); ok = false; }
  if (!Number.isFinite(cargaHoraria) || !Number.isInteger(cargaHoraria) || cargaHoraria < 1) {
    setFieldError('#cargaHoraria', 'Inteiro ≥ 1'); ok = false;
  }
  if (!ucs.length) { setFieldError('#ucsSelect', 'Selecione ao menos uma UC'); ok = false; }

  // domínio
  if (modalidade && !NIVEIS_SET.has(modalidade)) { setFieldError('#nivelCurso', 'Valor inválido'); ok = false; }
  if (tipo && !TIPOS_SET.has(tipo)) { setFieldError('#tipoCurso', 'Valor inválido'); ok = false; }
  if (status && !STATUS_SET.has(status)) { setFieldError('#statusCurso', 'Valor inválido'); ok = false; }
  if (area && !AREA_SET.has(area)) { setFieldError('#areaTecnologicaCurso', 'Valor inválido'); ok = false; }

  // referências
  const instOk = instituicoesCache.some(i => String(i._id || i.id) === String(instituicao));
  if (instituicao && !instOk) { setFieldError('#instituicaoId', 'Instituição inexistente'); ok = false; }

  const ucSet = new Set(ucs);
  if (ucSet.size !== ucs.length) {
    setFieldError('#ucsSelect', 'Remova duplicatas'); ok = false;
  }
  const allUcExist = ucs.every(id => ucsCache.some(u => String(u._id || u.id) === String(id)));
  if (!allUcExist) { setFieldError('#ucsSelect', 'Alguma UC não existe'); ok = false; }

  if (!ok) {
    const $firstErr = $('.border-red-500').first();
    if ($firstErr.length) $firstErr.focus();
  }
  return ok;
}

// ======================= Salvar (passo 1) =======================
function salvarCurso(e) {
  e.preventDefault();
  if (!validarFormCurso()) return;

  disableForm(true);

  // Dedup UCs
  const selectedUcs = Array.from(new Set($('#ucsSelect').val() || []));

  const dataBase = {
    nome: $('#nomeCurso').val().trim(),
    tipo: $('#tipoCurso').val(),
    nivel_curso: $('#nivelCurso').val(),
    status: $('#statusCurso').val(),
    area_tecnologica: $('#areaTecnologicaCurso').val(),
    carga_horaria: Number($('#cargaHoraria').val()),
    instituicao_id: $('#instituicaoId').val(),
    observacao: ($('#observacao').val() || '').slice(0, 1000),
    ordem_ucs: selectedUcs.map(id => ({ id, descricao: ucDataMap[id] || '' }))
  };

  const id = $('#cursoId').val();
  if (id) dataBase._id = id;

  window._cursoDataToSave = dataBase;

  fecharModal('modalCurso');
  abrirModalUcsConfig(
    selectedUcs,
    (cursoEditando && Array.isArray(cursoEditando.ordem_ucs)) ? cursoEditando.ordem_ucs : []
  );

  disableForm(false);
}

// ======================= Modal de UCs (passo 2) =======================
function abrirModalUcsConfig(ucsIds, dadosExistentes = []) {
  let html = '<div class="accordion" id="accordionUcModal">';
  ucsIds.forEach((id, idx) => {
    const ucDesc = ucDataMap[id] || id;
    const det = dadosExistentes.find(u => String(u.id) === String(id)) || {};
    html += `
      <div class="accordion-item border border-gray-300 rounded mb-2" style="background:#f9f9f9">
        <div class="accordion-header" id="heading${id}">
          <button class="accordion-button flex justify-between items-center w-full py-3 px-4 text-left font-medium"
            type="button" data-ucid="${id}"
            style="background:none;border:none;width:100%;outline:none;">
            <span>${ucDesc}</span>
            <i class="fas fa-chevron-down ml-2"></i>
          </button>
        </div>
        <div id="collapse${id}" class="accordion-collapse" data-ucid="${id}" style="display:${idx === 0 ? 'block' : 'none'};">
          <div class="accordion-body px-4 py-3">
            <form class="uc-form-config" data-ucid="${id}">
              <div class="form-group">
                <label>ID da UC:</label>
                <input type="text" value="${id}" readonly disabled class="form-control"/>
              </div>
              <div class="form-group">
                <label>Nome da UC:</label>
                <input type="text" value="${ucDesc}" readonly disabled class="form-control"/>
              </div>

              <div class="form-group">
                <label>Carga Horária de Aulas Presenciais:</label>
                <input type="number" min="0" step="1" class="form-control presencial_ch" required value="${det.presencial?.carga_horaria ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade de Aulas Total (Presencial):</label>
                <input type="number" min="0" step="1" class="form-control presencial_aulas" required value="${det.presencial?.quantidade_aulas_45min ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade Total de Dias (Presencial):</label>
                <input type="number" min="0" step="1" class="form-control presencial_dias" required value="${det.presencial?.dias_letivos ?? 0}"/>
              </div>

              <div class="form-group">
                <label>Carga Horária de Aulas EAD:</label>
                <input type="number" min="0" step="1" class="form-control ead_ch" required value="${det.ead?.carga_horaria ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade de Aulas Total (EAD):</label>
                <input type="number" min="0" step="1" class="form-control ead_aulas" required value="${det.ead?.quantidade_aulas_45min ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade Total de Dias (EAD):</label>
                <input type="number" min="0" step="1" class="form-control ead_dias" required value="${det.ead?.dias_letivos ?? 0}"/>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  });
  html += '</div>';

  document.getElementById('ucsAccordion').innerHTML = html;

  const modal = document.getElementById('modalUcsConfig');
  modal.classList.add('show');
  modal.style.display = 'flex';
}

function toggleAccordion(id) {
  document.querySelectorAll('.accordion-collapse').forEach(el => {
    if (el.id === 'collapse' + id) {
      el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

// ======================= Salvar UCs + curso (POST/PUT) =======================
function salvarUcsConfig() {
  const forms = document.querySelectorAll('.uc-form-config');
  const ucsToSave = [];
  let erro = false;
  let somaTotalCH = 0;

  forms.forEach(form => {
    const id = form.getAttribute('data-ucid');

    const presencial_ch = parseInt(form.querySelector('.presencial_ch').value, 10);
    const presencial_aulas = parseInt(form.querySelector('.presencial_aulas').value, 10);
    const presencial_dias = parseInt(form.querySelector('.presencial_dias').value, 10);
    const ead_ch = parseInt(form.querySelector('.ead_ch').value, 10);
    const ead_aulas = parseInt(form.querySelector('.ead_aulas').value, 10);
    const ead_dias = parseInt(form.querySelector('.ead_dias').value, 10);

    const fields = [presencial_ch, presencial_aulas, presencial_dias, ead_ch, ead_aulas, ead_dias];
    if (fields.some(v => Number.isNaN(v) || v < 0)) {
      erro = true;
      return;
    }

    somaTotalCH += (presencial_ch + ead_ch);

    const nomeUC = form.querySelectorAll('input[readonly]')[1].value;
    ucsToSave.push({
      id,
      unidade_curricular: nomeUC,
      presencial: {
        carga_horaria: presencial_ch,
        quantidade_aulas_45min: presencial_aulas,
        dias_letivos: presencial_dias
      },
      ead: {
        carga_horaria: ead_ch,
        quantidade_aulas_45min: ead_aulas,
        dias_letivos: ead_dias
      }
    });
  });

  if (erro) {
    showToast('Preencha corretamente (inteiros ≥ 0) todos os campos de todas as UCs.', 'error');
    return;
  }

  const dataFinal = Object.assign({}, window._cursoDataToSave, { ordem_ucs: ucsToSave });

  // Aviso (não bloqueia): soma de CH das UCs vs carga_horaria do curso
  const chCurso = Number(dataFinal.carga_horaria || 0);
  if (Number.isFinite(chCurso) && chCurso > 0 && somaTotalCH !== chCurso) {
    const prosseguir = confirm(`Aviso: soma de CH das UCs (${somaTotalCH}) difere da carga horária do curso (${chCurso}). Deseja continuar?`);
    if (!prosseguir) return;
  }

  const edit = !!(modoEdicao && cursoEditando && cursoEditando._id);
  const url = edit ? `${API_CURSO}?id=${encodeURIComponent(cursoEditando._id)}` : API_CURSO;
  const method = edit ? 'PUT' : 'POST';

  fetchWithTimeout(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataFinal)
  }, 15000)
    .then(async resp => {
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      showToast(edit ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!', 'success');
      fecharModal('modalUcsConfig');
      carregarCursos();
    })
    .catch(err => {
      console.error('Erro ao salvar curso:', err);
      showToast('Ops! Não conseguimos salvar. Revise os campos destacados ou tente novamente.', 'error');
    });
}

// ======================= Visualizar: SOMENTE LEITURA =======================
function mostrarDetalheCurso(cursoId) {
  const curso = cursosCache.find(c => String(c.id || c._id) === String(cursoId));
  if (!curso) return;

  const instNome = (instituicoesCache.find(i => String(i._id || i.id) === String(curso.instituicao_id))?.razao_social) || curso.instituicao_id || '';

  const html = `
    <div class="popup-field"><span class="popup-label">ID:</span> ${curso._id}</div>
    <div class="popup-field"><span class="popup-label">Nome:</span> ${curso.nome || ''}</div>
    <div class="popup-field"><span class="popup-label">Tipo:</span> ${curso.tipo || ''}</div>
    <div class="popup-field"><span class="popup-label">Modalidade:</span> ${curso.nivel_curso || ''}</div>
    <div class="popup-field"><span class="popup-label">Área Tecnológica:</span> ${curso.area_tecnologica || ''}</div>
    <div class="popup-field"><span class="popup-label">Carga Horária:</span> ${curso.carga_horaria ?? ''}</div>
    <div class="popup-field"><span class="popup-label">Status:</span> ${normalizeStatus(curso.status)}</div>
    <div class="popup-field"><span class="popup-label">Instituição:</span> ${instNome}</div>
    <div class="popup-field"><span class="popup-label">Criado em:</span> ${fmtDateBR(curso.data_criacao)}</div>

    <div class="popup-field"><span class="popup-label">Unidades Curriculares do Curso:</span></div>
    <div style="max-height:350px;overflow:auto;">${renderUCTable(curso.ordem_ucs)}</div>

   
  `;

  document.getElementById('detalheCursoConteudo').innerHTML = html;
  $('#modalDetalheCurso').addClass('show');
}

// ======================= Excluir (fora do modal de detalhe) =======================
function excluirCurso(cursoId) {
  if (!confirm('Tem certeza que deseja excluir este curso?')) return;

  fetchWithTimeout(`${API_CURSO}?id=${encodeURIComponent(cursoId)}`, { method: 'DELETE' }, 12000)
    .then(async resp => {
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      showToast('Curso excluído com sucesso!', 'success');
      fecharModal('modalDetalheCurso');
      carregarCursos();
    })
    .catch(err => {
      console.error('Erro ao excluir curso:', err);
      showToast('Não foi possível excluir. Verifique a conexão e tente novamente.', 'error');
    });
}

// ======================= Render tabela de UCs (detalhe) =======================
function renderUCTable(ucs = []) {
  if (!Array.isArray(ucs) || !ucs.length) return '-';

  let html = `<table class="uc-table">
    <thead>
      <tr>
        <th>#</th>
        <th>UC</th>
        <th>Presencial (CH/Aulas/Dias)</th>
        <th>EAD (CH/Aulas/Dias)</th>
      </tr>
    </thead>
    <tbody>`;

  ucs.forEach((uc, idx) => {
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${uc.unidade_curricular || ucDataMap[uc.id] || '-'}</td>
      <td>
        ${uc.presencial ? `
          CH: ${uc.presencial.carga_horaria ?? '-'}<br>
          Aulas: ${uc.presencial.quantidade_aulas_45min ?? '-'}<br>
          Dias: ${uc.presencial.dias_letivos ?? '-'}
        ` : '-'}
      </td>
      <td>
        ${uc.ead ? `
          CH: ${uc.ead.carga_horaria ?? '-'}<br>
          Aulas: ${uc.ead.quantidade_aulas_45min ?? '-'}<br>
          Dias: ${uc.ead.dias_letivos ?? '-'}
        ` : '-'}
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}
