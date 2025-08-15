/* eslint-disable no-console */

// ======================= Endpoints (via proxies PHP) =======================
const API_CURSO = '../backend/processa_curso.php';
const API_INST  = '../backend/processa_instituicao.php';
const API_UC    = '../backend/processa_unidade_curricular.php';
const API_EMP   = '../backend/processa_empresa.php'; // ajuste se necessário

// ======================= Cache/estado =======================
let empresasCache = [];
let cursosCache = [];
let instituicoesCache = [];
let ucsCache = [];
let ucDataMap = {};         // { ucId: descricao }
let cursoEditando = null;
let modoEdicao = false;

// ======================= Bootstrap =======================
$(document).ready(function () {
  inicializarSelects();
  bindFecharModal();
  bindAccordionDelegation();

  carregarCursos();

  // filtros/ações
  $('#searchCurso').on('input', filtrarCursos);

  $('#btnAddCurso').on('click', () => {
    preencherSelectConvenios();
    abrirModalCurso(false, null);
  });

  $('#formCurso').on('submit', salvarCurso);
  $('#saveAllUcsBtn').on('click', salvarUcsConfig);

  // delegates da tabela
  $(document)
    .on('click', '.btn-view', function (e) {
      e.stopPropagation();
      mostrarDetalheCurso($(this).data('id'));
    })
    .on('click', '.btn-edit', function (e) {
      e.stopPropagation();
      abrirModalCurso(true, $(this).data('id'));
    })
    .on('click', '.btn-delete', function (e) {
      e.stopPropagation();
      excluirCurso($(this).data('id'));
    });

  // ações no modal de detalhes
  $('#btnEditarCurso').on('click', function () {
    abrirModalCurso(true, $(this).data('id'));
  });
  $('#btnExcluirCurso').on('click', function () {
    excluirCurso($(this).data('id'));
  });
});

// ======================= Util/fetch =======================
async function fetchJson(url) {
  try {
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return Array.isArray(data) ? data : (data?.items ?? data ?? []);
  } catch (err) {
    console.error('fetchJson falhou:', url, err);
    return [];
  }
}

async function carregarCursos() {
  const [cursos, insts, ucs, emps] = await Promise.all([
    fetchJson(API_CURSO),
    fetchJson(API_INST),
    fetchJson(API_UC),
    fetchJson(API_EMP)
  ]);

  cursosCache = cursos || [];
  instituicoesCache = insts || [];
  ucsCache = ucs || [];
  empresasCache = emps || [];

  // mapa rápido de descrição de UC
  ucDataMap = {};
  ucsCache.forEach(uc => {
    const id = uc._id || uc.id;
    if (id) ucDataMap[id] = uc.descricao || '';
  });

  renderCursosTable(cursosCache);
}

function inicializarSelects() {
  $('#ucsSelect, #convenioSelect').select2({
    theme: 'bootstrap-5',
    width: '100%'
  });
}

// fecha modais sem usar onclick no HTML
function bindFecharModal() {
  $(document).on('click', '[data-close]', function () {
    const alvo = $(this).attr('data-close');
    fecharModal(alvo);
  });
}

// delega o clique do acordeão (sem onclick inline)
function bindAccordionDelegation() {
  $(document).on('click', '.accordion-button', function () {
    const ucid = $(this).attr('data-ucid');
    toggleAccordion(ucid);
  });
}

// ======================= Preenchimento de selects =======================
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
  const selectedArr = Array.isArray(selected) ? selected.map(String) : (selected ? [String(selected)] : []);
  $sel.empty().append('<option value="">Selecione</option>');
  empresasCache.forEach(emp => {
    const id = emp._id || emp.id;
    const nome = emp.razao_social || emp.nome_fantasia || id;
    const isSel = selectedArr.includes(String(id)) ? 'selected' : '';
    $sel.append(`<option value="${id}" ${isSel}>${nome}</option>`);
  });
  $sel.val(selectedArr.length ? selectedArr[0] : '').trigger('change');
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
    // Empresa pode ser 1 id ou lista
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

    $tbody.append(`
      <tr>
        <td>${curso.nome || ''}</td>
        <td>${curso.tipo || ''}</td>
        <td>${curso.categoria || ''}</td>
        <td>${curso.eixo_tecnologico || ''}</td>
        <td>${empresaNome || ''}</td>
        <td>${curso.nivel_curso || ''}</td>
        <td>${curso.carga_horaria ?? ''}</td>
        <td>
          <div style="display:flex;gap:4px;">
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
      curso.nome, curso.tipo, curso.categoria, curso.eixo_tecnologico,
      curso.nivel_curso, curso.carga_horaria, curso._id
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
  preencherSelectConvenios(edit ? (cursoEditando?.empresa ?? []) : []);
  preencherSelectUCs(
    edit && Array.isArray(cursoEditando?.ordem_ucs)
      ? cursoEditando.ordem_ucs.map(u => u.id)
      : []
  );

  $('#nivelCurso').val(edit ? (cursoEditando?.nivel_curso || '') : '');
  $('#tipoCurso').val(edit ? (cursoEditando?.tipo || '') : '');
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
  const nome = ($('#nomeCurso').val() || '').trim();
  const modalidade = $('#nivelCurso').val();
  const tipo = $('#tipoCurso').val();
  const categoria = ($('#categoriaCurso').val() || '').trim();
  const eixo = ($('#eixoTecnologicoCurso').val() || '').trim();
  const cargaHoraria = Number($('#cargaHoraria').val());
  const empresaSel = $('#convenioSelect').val(); // select simples
  const instituicao = $('#instituicaoId').val();

  if (!instituicao) { alert('Selecione a Instituição.'); $('#instituicaoId').focus(); return false; }
  if (!nome || nome.length < 3 || nome.length > 100) { alert('Nome do curso obrigatório (3-100 caracteres).'); $('#nomeCurso').focus(); return false; }
  if (!modalidade) { alert('Selecione a Modalidade.'); $('#nivelCurso').focus(); return false; }
  if (!tipo) { alert('Selecione o Tipo.'); $('#tipoCurso').focus(); return false; }
  if (!categoria) { alert('Categoria obrigatória.'); $('#categoriaCurso').focus(); return false; }
  if (!eixo) { alert('Eixo Tecnológico obrigatório.'); $('#eixoTecnologicoCurso').focus(); return false; }
  if (!empresaSel) { alert('Selecione a Empresa/Parceiro.'); $('#convenioSelect').focus(); return false; }
  if (!Number.isFinite(cargaHoraria) || cargaHoraria <= 0) { alert('Informe a Carga Horária corretamente.'); $('#cargaHoraria').focus(); return false; }

  return true;
}

// ======================= Salvar (passo 1) =======================
function salvarCurso(e) {
  e.preventDefault();
  if (!validarFormCurso()) return;

  const selectedUcs = $('#ucsSelect').val() || [];
  if (!selectedUcs.length) {
    alert('Selecione ao menos uma Unidade Curricular.');
    return;
  }

  const dataBase = {
    nome: $('#nomeCurso').val(),
    tipo: $('#tipoCurso').val(),
    nivel_curso: $('#nivelCurso').val(),
    categoria: $('#categoriaCurso').val(),
    eixo_tecnologico: $('#eixoTecnologicoCurso').val(),
    carga_horaria: Number($('#cargaHoraria').val()),
    empresa: $('#convenioSelect').val(),
    instituicao_id: $('#instituicaoId').val(),
    observacao: $('#observacao').val() || '',
    ordem_ucs: selectedUcs.map(id => ({ id, descricao: ucDataMap[id] || '' }))
  };

  const id = $('#cursoId').val();
  if (id) dataBase._id = id;

  window._cursoDataToSave = dataBase;

  fecharModal('modalCurso');
  abrirModalUcsConfig(selectedUcs, (cursoEditando && Array.isArray(cursoEditando.ordem_ucs)) ? cursoEditando.ordem_ucs : []);
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
                <input type="number" min="0" class="form-control presencial_ch" required value="${det.presencial?.carga_horaria ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade de Aulas Total (Presencial):</label>
                <input type="number" min="0" class="form-control presencial_aulas" required value="${det.presencial?.quantidade_aulas_45min ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade Total de Dias (Presencial):</label>
                <input type="number" min="0" class="form-control presencial_dias" required value="${det.presencial?.dias_letivos ?? 0}"/>
              </div>

              <div class="form-group">
                <label>Carga Horária de Aulas EAD:</label>
                <input type="number" min="0" class="form-control ead_ch" required value="${det.ead?.carga_horaria ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade de Aulas Total (EAD):</label>
                <input type="number" min="0" class="form-control ead_aulas" required value="${det.ead?.quantidade_aulas_45min ?? 0}"/>
              </div>
              <div class="form-group">
                <label>Quantidade Total de Dias (EAD):</label>
                <input type="number" min="0" class="form-control ead_dias" required value="${det.ead?.dias_letivos ?? 0}"/>
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

// sem onclick inline: usamos delegated handler (bindAccordionDelegation)
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

  forms.forEach(form => {
    const id = form.getAttribute('data-ucid');

    const presencial_ch    = form.querySelector('.presencial_ch').value;
    const presencial_aulas = form.querySelector('.presencial_aulas').value;
    const presencial_dias  = form.querySelector('.presencial_dias').value;
    const ead_ch           = form.querySelector('.ead_ch').value;
    const ead_aulas        = form.querySelector('.ead_aulas').value;
    const ead_dias         = form.querySelector('.ead_dias').value;

    if ([presencial_ch, presencial_aulas, presencial_dias, ead_ch, ead_aulas, ead_dias].some(v => v === '')) {
      erro = true;
      return;
    }

    const nomeUC = form.querySelectorAll('input[readonly]')[1].value;
    ucsToSave.push({
      id,
      unidade_curricular: nomeUC,
      presencial: {
        carga_horaria: Number(presencial_ch),
        quantidade_aulas_45min: Number(presencial_aulas),
        dias_letivos: Number(presencial_dias)
      },
      ead: {
        carga_horaria: Number(ead_ch),
        quantidade_aulas_45min: Number(ead_aulas),
        dias_letivos: Number(ead_dias)
      }
    });
  });

  if (erro) {
    alert('Preencha todos os campos obrigatórios de todas as UCs!');
    return;
  }

  const dataFinal = Object.assign({}, window._cursoDataToSave, { ordem_ucs: ucsToSave });

  const edit = !!(modoEdicao && cursoEditando && cursoEditando._id);
  const url = edit ? `${API_CURSO}?id=${encodeURIComponent(cursoEditando._id)}` : API_CURSO;
  const method = edit ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataFinal)
  })
    .then(async resp => {
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      alert(edit ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!');
      fecharModal('modalUcsConfig');
      carregarCursos();
    })
    .catch(err => {
      console.error('Erro ao salvar curso:', err);
      alert('Erro ao salvar curso: ' + (err?.message || 'desconhecido'));
    });
}

// ======================= Visualizar (somente leitura) =======================
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
    <div class="popup-field"><span class="popup-label">Instituição:</span> ${instNome}</div>
    <div class="popup-field"><span class="popup-label">Unidades Curriculares do Curso:</span></div>
    <div style="max-height:350px;overflow:auto;">${renderUCTable(curso.ordem_ucs)}</div>
  `;

  document.getElementById('detalheCursoConteudo').innerHTML = html;
  $('#modalDetalheCurso').addClass('show');
  $('#btnEditarCurso').data('id', cursoId);
  $('#btnExcluirCurso').data('id', cursoId);
}

// ======================= Excluir =======================
function excluirCurso(cursoId) {
  if (!confirm('Tem certeza que deseja excluir este curso?')) return;

  fetch(`${API_CURSO}?id=${encodeURIComponent(cursoId)}`, { method: 'DELETE' })
    .then(async resp => {
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      alert('Curso excluído com sucesso!');
      fecharModal('modalDetalheCurso');
      carregarCursos();
    })
    .catch(err => {
      console.error('Erro ao excluir curso:', err);
      alert('Erro ao excluir curso: ' + (err?.message || 'desconhecido'));
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
