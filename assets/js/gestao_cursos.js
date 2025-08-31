/* eslint-disable no-console */

// ======================= Endpoints (via proxies PHP) =======================
const API_CURSO = '../backend/processa_curso.php';
const API_INST  = '../backend/processa_instituicao.php';
const API_UC    = '../backend/processa_unidade_curricular.php';
const API_EMP   = '../backend/processa_empresa.php';

// ======================= Domínio (conjuntos permitidos) =======================
const TIPOS_SET   = new Set(['Presencial', 'EAD', 'Semipresencial']);
const NIVEIS_SET  = new Set(['Técnico', 'Aperfeiçoamento', 'Qualificação', 'Especialização']);
const STATUS_SET  = new Set(['Ativo', 'Inativo']);
const CATEG_SET   = new Set(['C', 'A']);
const EIXO_SET    = new Set(['TI', 'Metal Mecânica']);

// ======================= Cache/estado =======================
let empresasCache = [];
let cursosCache = [];
let instituicoesCache = [];
let ucsCache = [];
let ucDataMap = {};
let cursoEditando = null;
let modoEdicao = false;

// ======================= Utils UI =======================
function setLoadingTable(on) {
  const $tbody = $('#cursosTable tbody');
  if (on) {
    $tbody.html('<tr><td colspan="8">Carregando...</td></tr>');
  } else if (!$tbody.children().length) {
    $tbody.html('<tr><td colspan="8">Nenhum curso encontrado.</td></tr>');
  }
}

function showToast(msg, type = 'info') {
  // Simples: use alert. Se houver biblioteca de toasts, troque aqui.
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

  $('#searchCurso').on('input', filtrarCursos);

  $('#btnAddCurso').on('click', () => {
    preencherSelectConvenios();
    abrirModalCurso(false, null);
  });

  $('#formCurso').on('submit', salvarCurso);
  $('#saveAllUcsBtn').on('click', salvarUcsConfig);

  // Event listeners para os botões de ação da tabela
  $(document).on('click', '.btn-view', function() {
    const cursoId = $(this).data('id');
    mostrarDetalheCurso(cursoId);
  });

  $(document).on('click', '.btn-edit', function() {
    const cursoId = $(this).data('id');
    preencherSelectConvenios();
    abrirModalCurso(true, cursoId);
  });

  $(document).on('click', '.btn-delete', function() {
    const cursoId = $(this).data('id');
    excluirCurso(cursoId);
  });

  // limpar erros inline ao digitar
  $('#formCurso').on('input change', 'input, select, textarea', function () {
    clearFieldError(this);
  });
});

// ======================= Carga inicial =======================
async function carregarCursos() {
  setLoadingTable(true);
  const [cursos, insts, emps] = await Promise.all([
    fetchJson(API_CURSO, []),
    fetchJson(API_INST, []),
    fetchJson(API_EMP, [])
  ]);
  const ucs = await fetchAllUCs(1000);

  cursosCache = cursos || [];
  instituicoesCache = insts || [];
  ucsCache = ucs || [];
  empresasCache = emps || [];

  ucDataMap = {};
  ucsCache.forEach(uc => {
    const id = uc._id || uc.id;
    if (id) ucDataMap[id] = uc.descricao || '';
  });

  renderCursosTable(cursosCache);
}

// ======================= Select2 =======================
function inicializarSelects() {
  $('#ucsSelect, #convenioSelect').select2({ theme: 'bootstrap-5', width: '100%' });
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

function preencherSelectConvenios(selected = []) {
  const $sel = $('#convenioSelect');
  $sel.empty().append('<option value="">Selecione</option>');
  empresasCache.forEach(emp => {
    const id = emp._id || emp.id;
    const nome = emp.razao_social || emp.nome_fantasia || id;
    $sel.append(`<option value="${id}">${nome}</option>`);
  });
  const val = Array.isArray(selected) ? selected[0] : selected;
  $sel.val(val || '').trigger('change');
}

// ======================= Tabela =======================
function renderCursosTable(cursos) {
  const $tbody = $('#cursosTable tbody');
  $tbody.empty();

  if (!Array.isArray(cursos) || !cursos.length) {
    $tbody.append('<tr><td colspan="8">Nenhum curso encontrado.</td></tr>');
    return;
  }

  cursos.forEach(curso => {
    let empresaNome = '';
    const v = curso.empresa;
    if (Array.isArray(v)) {
      empresaNome = v.map(empId => {
        const emp = empresasCache.find(e => String(e._id || e.id) === String(empId));
        return emp ? (emp.razao_social || emp.nome_fantasia) : empId;
      }).join(', ');
    } else if (v) {
      const emp = empresasCache.find(e => String(e._id || e.id) === String(v));
      empresaNome = emp ? (emp.razao_social || emp.nome_fantasia) : v;
    }

    $tbody.append(`
      <tr>
        <td>${curso.nome || ''}</td>
        <td>${curso.categoria || ''}</td>
        <td>${curso.eixo_tecnologico || ''}</td>
        <td>${empresaNome || ''}</td>
        <td>${curso.nivel_curso || ''}</td>
        <td>${fmtDateBR(curso.data_criacao)}</td>
        <td>${normalizeStatus(curso.status)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-icon btn-view" data-id="${curso._id}" title="Visualizar"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" data-id="${curso._id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" data-id="${curso._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `);
  });
}

function filtrarCursos() {
  const termo = ($('#searchCurso').val() || '').toLowerCase().trim();
  if (!termo) { renderCursosTable(cursosCache); return; }

  const filtrados = cursosCache.filter(curso => {
    const base = [
      curso.nome, curso.categoria, curso.eixo_tecnologico,
      curso.nivel_curso, curso.status
    ].map(v => String(v || '').toLowerCase());
    return base.some(v => v.includes(termo));
  });

  renderCursosTable(filtrados);
}

// ======================= Modais =======================
function abrirModalCurso(edit = false, cursoId = null) {
  modoEdicao = !!edit;
  cursoEditando = edit ? cursosCache.find(c => String(c._id) === String(cursoId)) : null;

  preencherSelectInstituicao(edit ? cursoEditando?.instituicao_id : '');
  preencherSelectConvenios(edit ? (cursoEditando?.empresa ?? '') : '');
  preencherSelectUCs(
    edit && Array.isArray(cursoEditando?.ordem_ucs)
      ? cursoEditando.ordem_ucs.map(u => u.id)
      : []
  );

  $('#nivelCurso').val(edit ? (cursoEditando?.nivel_curso || '') : '');
  $('#tipoCurso').val(edit ? (cursoEditando?.tipo || '') : '');
  $('#statusCurso').val(edit ? (cursoEditando?.status || 'Ativo') : 'Ativo');
  $('#cargaHoraria').val(edit ? (cursoEditando?.carga_horaria ?? '') : '');
  $('#cursoId').val(edit ? (cursoEditando?._id || '') : '');
  $('#nomeCurso').val(edit ? (cursoEditando?.nome || '') : '');
  $('#categoriaCurso').val(edit ? (cursoEditando?.categoria || '') : '');
  $('#eixoTecnologicoCurso').val(edit ? (cursoEditando?.eixo_tecnologico || '') : '');
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
  ['#instituicaoId','#convenioSelect','#nomeCurso','#nivelCurso','#tipoCurso','#statusCurso','#categoriaCurso','#eixoTecnologicoCurso','#cargaHoraria','#ucsSelect']
    .forEach(sel => clearFieldError(sel));

  const instituicao = $('#instituicaoId').val();
  const empresaSel = $('#convenioSelect').val();
  const nome = ($('#nomeCurso').val() || '').trim();
  const modalidade = $('#nivelCurso').val();
  const tipo = $('#tipoCurso').val();
  const status = $('#statusCurso').val();
  const categoria = $('#categoriaCurso').val();
  const eixo = $('#eixoTecnologicoCurso').val();
  const cargaHoraria = Number($('#cargaHoraria').val());
  const ucs = $('#ucsSelect').val() || [];

  // obrigatórios
  if (!instituicao) { setFieldError('#instituicaoId','Obrigatório'); ok = false; }
  if (!empresaSel) { setFieldError('#convenioSelect','Obrigatório'); ok = false; }
  if (!nome || nome.length < 3 || nome.length > 100) { setFieldError('#nomeCurso','Entre 3 e 100 caracteres'); ok = false; }
  if (!modalidade) { setFieldError('#nivelCurso','Obrigatório'); ok = false; }
  if (!tipo) { setFieldError('#tipoCurso','Obrigatório'); ok = false; }
  if (!status) { setFieldError('#statusCurso','Obrigatório'); ok = false; }
  if (!categoria) { setFieldError('#categoriaCurso','Obrigatório'); ok = false; }
  if (!eixo) { setFieldError('#eixoTecnologicoCurso','Obrigatório'); ok = false; }
  if (!Number.isFinite(cargaHoraria) || !Number.isInteger(cargaHoraria) || cargaHoraria < 1) {
    setFieldError('#cargaHoraria','Inteiro ≥ 1'); ok = false;
  }
  if (!ucs.length) { setFieldError('#ucsSelect','Selecione ao menos uma UC'); ok = false; }

  // domínio
  if (modalidade && !NIVEIS_SET.has(modalidade)) { setFieldError('#nivelCurso','Valor inválido'); ok = false; }
  if (tipo && !TIPOS_SET.has(tipo)) { setFieldError('#tipoCurso','Valor inválido'); ok = false; }
  if (status && !STATUS_SET.has(status)) { setFieldError('#statusCurso','Valor inválido'); ok = false; }
  if (categoria && !CATEG_SET.has(categoria)) { setFieldError('#categoriaCurso','Valor inválido'); ok = false; }
  if (eixo && !EIXO_SET.has(eixo)) { setFieldError('#eixoTecnologicoCurso','Valor inválido'); ok = false; }

  // referências
  const instOk = instituicoesCache.some(i => String(i._id || i.id) === String(instituicao));
  if (instituicao && !instOk) { setFieldError('#instituicaoId','Instituição inexistente'); ok = false; }

  const empOk = empresasCache.some(e => String(e._id || e.id) === String(empresaSel));
  if (empresaSel && !empOk) { setFieldError('#convenioSelect','Empresa inexistente'); ok = false; }

  const ucSet = new Set(ucs);
  if (ucSet.size !== ucs.length) {
    setFieldError('#ucsSelect','Remova duplicatas'); ok = false;
  }
  const allUcExist = ucs.every(id => ucsCache.some(u => String(u._id || u.id) === String(id)));
  if (!allUcExist) { setFieldError('#ucsSelect','Alguma UC não existe'); ok = false; }

  if (!ok) {
    // foca no primeiro com erro
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
    categoria: $('#categoriaCurso').val(),
    eixo_tecnologico: $('#eixoTecnologicoCurso').val(),
    carga_horaria: Number($('#cargaHoraria').val()),
    empresa: $('#convenioSelect').val(),
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

    const presencial_ch    = parseInt(form.querySelector('.presencial_ch').value, 10);
    const presencial_aulas = parseInt(form.querySelector('.presencial_aulas').value, 10);
    const presencial_dias  = parseInt(form.querySelector('.presencial_dias').value, 10);
    const ead_ch           = parseInt(form.querySelector('.ead_ch').value, 10);
    const ead_aulas        = parseInt(form.querySelector('.ead_aulas').value, 10);
    const ead_dias         = parseInt(form.querySelector('.ead_dias').value, 10);

    const fields = [presencial_ch, presencial_aulas, presencial_dias, ead_ch, ead_aulas, ead_dias];
    if (fields.some(v => Number.isNaN(v) || v < 0)) {
      erro = true;
      return;
    }

    const totalCH = presencial_ch + ead_ch;
    somaTotalCH += totalCH;

    ucsToSave.push({
      id,
      descricao: ucDataMap[id] || '',
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
  const curso = cursosCache.find(c => String(c._id) === String(cursoId));
  if (!curso) return;

  const instNome = (instituicoesCache.find(i => String(i._id || i.id) === String(curso.instituicao_id))?.razao_social) || curso.instituicao_id || '';

  let empresaNome = '';
  const val = curso.empresa;
  if (Array.isArray(val)) {
    empresaNome = val.map(empId => {
      const emp = empresasCache.find(e => String(e._id || e.id) === String(empId));
      return emp ? (emp.razao_social || emp.nome_fantasia) : empId;
    }).join(', ');
  } else if (val) {
    const emp = empresasCache.find(e => String(e._id || e.id) === String(val));
    empresaNome = emp ? (emp.razao_social || emp.nome_fantasia) : val;
  }

  const html = `
    <div class="popup-field"><span class="popup-label">ID:</span> ${curso._id}</div>
    <div class="popup-field"><span class="popup-label">Nome:</span> ${curso.nome || ''}</div>
    <div class="popup-field"><span class="popup-label">Tipo:</span> ${curso.tipo || ''}</div>
    <div class="popup-field"><span class="popup-label">Modalidade:</span> ${curso.nivel_curso || ''}</div>
    <div class="popup-field"><span class="popup-label">Categoria:</span> ${curso.categoria || ''}</div>
    <div class="popup-field"><span class="popup-label">Eixo Tecnológico:</span> ${curso.eixo_tecnologico || ''}</div>
    <div class="popup-field"><span class="popup-label">Carga Horária:</span> ${curso.carga_horaria ?? ''}</div>
    <div class="popup-field"><span class="popup-label">Empresa/Parceiro:</span> ${empresaNome || ''}</div>
    <div class="popup-field"><span class="popup-label">Status:</span> ${normalizeStatus(curso.status)}</div>
    <div class="popup-field"><span class="popup-label">Criado em:</span> ${fmtDateBR(curso.data_criacao)}</div>

    <div class="popup-field"><span class="popup-label">Unidades Curriculares do Curso:</span></div>
    <div style="max-height:350px;overflow:auto;">${renderUCTable(curso.ordem_ucs)}</div>

    <div class="mt-4">
      <button class="btn btn-secondary" data-close="modalDetalheCurso">Fechar</button>
    </div>
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
  if (!Array.isArray(ucs) || ucs.length === 0) {
    $('#ucTableContainer').html('<p>Nenhuma UC encontrada.</p>');
    return;
  }

  let tableHtml = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>UC</th>
          <th>CH Presencial</th>
          <th>Aulas Presencial</th>
          <th>Dias Presencial</th>
          <th>CH EAD</th>
          <th>Aulas EAD</th>
          <th>Dias EAD</th>
          <th>CH Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  ucs.forEach(uc => {
    const presencial = uc.presencial || {};
    const ead = uc.ead || {};
    const chTotal = (presencial.carga_horaria || 0) + (ead.carga_horaria || 0);

    tableHtml += `
      <tr>
        <td>${uc.descricao || uc.id || 'N/A'}</td>
        <td>${presencial.carga_horaria || 0}h</td>
        <td>${presencial.quantidade_aulas_45min || 0}</td>
        <td>${presencial.dias_letivos || 0}</td>
        <td>${ead.carga_horaria || 0}h</td>
        <td>${ead.quantidade_aulas_45min || 0}</td>
        <td>${ead.dias_letivos || 0}</td>
        <td>${chTotal}h</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  $('#ucTableContainer').html(tableHtml);
}
