/* eslint-disable no-console */
// ===================== Config & State =====================
const API = Object.freeze({
  calendario: "../backend/processa_calendario.php",
  empresa: "../backend/processa_empresa.php",
  instituicao: "../backend/processa_instituicao.php",
});

const STATE = {
  empresas: [],
  instituicoes: [],
  calendarios: [],
  fc: null, // FullCalendar instance
  calEmEdicaoId: null,
  gerenciarEventosCalId: null,
};

// ===================== Utils =====================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function toId(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (obj._id && typeof obj._id === "string") return obj._id;
  if (obj._id && typeof obj._id === "object" && obj._id.$oid) return obj._id.$oid;
  if (obj.id && typeof obj.id === "string") return obj.id;
  if (obj.$oid) return obj.$oid;
  return String(obj);
}

function fmtBR(iso) {
  if (!iso) return "";
  const p = String(iso).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function corParaCalendario(id) {
  if (!id) return "#e6f0ff";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const h = (hash % 360 + 360) % 360;
  return `hsl(${h},70%,80%)`;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = "";
    try { msg = await res.text(); } catch (_) {}
    throw new Error(msg || res.statusText);
  }
  return res.json();
}

// ===================== Lookups =====================
function nomeEmpresa(id) {
  const e = STATE.empresas.find(x => toId(x) === id || toId(x._id) === id);
  return e?.razao_social || id || "";
}
function nomeInstituicao(id) {
  const i = STATE.instituicoes.find(x => toId(x) === id || toId(x._id) === id);
  return i?.razao_social || id || "";
}

// ===================== Modais =====================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "flex";
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "none";

  if (id === "modalCadastrarCalendario") {
    $("#formCadastrarCalendario")?.reset();
  }
  if (id === "modalAdicionarEvento") {
    $("#formAdicionarEvento")?.reset();
    if ($("#eventoCalendario") && $("#eventoCalendario").classList.contains("select2-hidden-accessible")) {
      try { $("#eventoCalendario").value = null; } catch (_) {}
      window.jQuery && window.jQuery("#eventoCalendario").val(null).trigger("change");
    }
  }
}
window.openModal = openModal;
window.closeModal = closeModal;

window.addEventListener("click", (ev) => {
  if (ev.target?.classList?.contains("modal")) {
    closeModal(ev.target.id);
  }
});

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded", async () => {
  initFullCalendar();
  await carregarDadosReferencia();
  await carregarCalendarios();
  await carregarEventosNoCalendario();

  $("#btnAbrirModalAdicionarEvento")?.addEventListener("click", async () => {
    openModal("modalAdicionarEvento");
    await carregarListaCalendariosParaEvento();
  });

  $("#btnAbrirModalCadastrarCalendario")?.addEventListener("click", async () => {
    openModal("modalCadastrarCalendario");
    await carregarInstituicoesEmpresas();
  });

  $("#formCadastrarCalendario")?.addEventListener("submit", onSubmitCadastrarCalendario);
  $("#formAdicionarEvento")?.addEventListener("submit", onSubmitAdicionarEvento);

  $("#tbodyCalendarios")?.addEventListener("click", onClickTabelaCalendarios);

  $("#filtroCalendarios")?.addEventListener("input", filtrarCalendariosPorTexto);
});

// ===================== FullCalendar =====================
function initFullCalendar() {
  const el = document.getElementById("calendario");
  if (!el) return;
  STATE.fc = new FullCalendar.Calendar(el, {
    locale: "pt-br",
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    editable: true,
    selectable: true,
    dayMaxEvents: true,
  });
  STATE.fc.render();
}

// ===================== Carregamentos =====================
async function carregarDadosReferencia() {
  try { STATE.empresas = await fetchJSON(API.empresa); }
  catch (e) { console.error("Falha ao carregar empresas:", e.message); }

  try { STATE.instituicoes = await fetchJSON(API.instituicao); }
  catch (e) { console.error("Falha ao carregar instituições:", e.message); }
}

async function carregarCalendarios() {
  try {
    STATE.calendarios = await fetchJSON(API.calendario);
    renderTabelaCalendarios(STATE.calendarios);
  } catch (e) {
    console.error("Falha ao carregar calendários:", e.message);
    $("#tbodyCalendarios").innerHTML = '<tr><td colspan="5" style="text-align:center;">Erro ao carregar.</td></tr>';
  }
}

async function carregarEventosNoCalendario() {
  let calendarios = [];
  try {
    calendarios = await fetchJSON(API.calendario);
  } catch (e) {
    console.error("Falha ao carregar eventos:", e.message);
    return;
  }

  const eventos = [];
  calendarios.forEach(cal => {
    const id = toId(cal) || toId(cal._id) || toId(cal.id);
    const nome = cal.nome_calendario || cal.descricao || "";
    const cor = corParaCalendario(id);
    if (Array.isArray(cal.dias_nao_letivos)) {
      cal.dias_nao_letivos.forEach(d => {
        eventos.push({
          title: `${d.descricao} (${nome})`,
          start: d.data,
          allDay: true,
          backgroundColor: cor,
          borderColor: cor,
        });
      });
    }
  });

  STATE.fc.removeAllEvents();
  eventos.forEach(evt => STATE.fc.addEvent(evt));
}

async function carregarListaCalendariosParaEvento() {
  try {
    const lista = await fetchJSON(API.calendario);
    const $select = window.jQuery && window.jQuery("#eventoCalendario");
    if (!$select) return;

    $select.empty();
    lista.forEach(cal => {
      const id = toId(cal) || toId(cal._id) || toId(cal.id);
      const nome = cal.nome_calendario || cal.descricao || "(Sem nome)";
      $select.append(`<option value="${id}">${nome}</option>`);
    });

    if ($select.hasClass("select2-hidden-accessible")) {
      $select.select2("destroy");
    }
    $select.select2({
      width: "100%",
      placeholder: "Selecione os Calendários",
      dropdownParent: window.jQuery("#modalAdicionarEvento .modal-content"),
    });

  } catch (e) {
    console.error("Falha ao carregar lista de calendários para evento:", e.message);
  }
}

async function carregarInstituicoesEmpresas() {
  const instSelect = $("#calInstituicao");
  const empSelect = $("#calEmpresa");
  if (!instSelect || !empSelect) return;

  instSelect.innerHTML = '<option value="">Selecione</option>';
  STATE.instituicoes.forEach(i => {
    const opt = document.createElement("option");
    opt.value = toId(i) || "";
    opt.textContent = i.razao_social || "(sem nome)";
    instSelect.appendChild(opt);
  });

  empSelect.innerHTML = '<option value="">Selecione</option>';
  STATE.empresas.forEach(e => {
    const opt = document.createElement("option");
    opt.value = toId(e) || "";
    opt.textContent = e.razao_social || "(sem nome)";
    empSelect.appendChild(opt);
  });
}

// ===================== Edição de calendário =====================
async function abrirEdicaoCalendario(cal) {
  STATE.calEmEdicaoId = toId(cal) || toId(cal._id) || toId(cal.id);
  await carregarInstituicoesEmpresas();

  $("#calIdEdicao").value = STATE.calEmEdicaoId;
  $("#calNome").value = cal.nome_calendario || "";
  $("#calInicio").value = cal.data_inicial || "";
  $("#calFim").value = cal.data_final || "";
  $("#calInstituicao").value = cal.id_instituicao || "";
  $("#calEmpresa").value = cal.id_empresa || "";

  const btn = $("#btnCadastrarCalendario");
  if (btn) btn.textContent = "Salvar alterações";

  openModal("modalCadastrarCalendario");
}

function resetEdicaoCalendarioUI() {
  STATE.calEmEdicaoId = null;
  const btn = $("#btnCadastrarCalendario");
  if (btn) btn.textContent = "Cadastrar";
  const hid = $("#calIdEdicao");
  if (hid) hid.value = "";
}

// ===================== Tabela principal =====================
function renderTabelaCalendarios(lista) {
  const tbody = $("#tbodyCalendarios");
  if (!tbody) return;

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum calendário cadastrado.</td></tr>';
    return;
  }

  const rows = lista.map(cal => {
    const id = toId(cal) || toId(cal._id) || toId(cal.id);
    const nome = cal.nome_calendario || cal.descricao || "";
    const empresa = nomeEmpresa(cal.id_empresa);
    const dtIni = cal.data_inicial ? fmtBR(cal.data_inicial) : "";
    const dtFim = cal.data_final ? fmtBR(cal.data_final) : "";
    return `
      <tr>
        <td>${nome}</td>
        <td>${empresa}</td>
        <td>${dtIni}</td>
        <td>${dtFim}</td>
        <td class="actions">
          <button class="btn btn-icon btn-view" title="Visualizar" data-action="view" data-id="${id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-icon btn-edit" title="Editar" data-action="edit" data-id="${id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-icon btn-delete" title="Excluir" data-action="delete" data-id="${id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = rows.join("");
}

// ===================== Handlers =====================
async function onSubmitCadastrarCalendario(ev) {
  ev.preventDefault();
  const btn = $("#btnCadastrarCalendario");
  try {
    if (btn) btn.disabled = true;

    const payload = {
      id_instituicao: $("#calInstituicao").value,
      nome_calendario: $("#calNome").value.trim(),
      id_empresa: $("#calEmpresa").value,
      data_inicial: $("#calInicio").value,
      data_final: $("#calFim").value,
      dias_letivos: {},
    };

    if (!payload.id_instituicao || !payload.nome_calendario || !payload.id_empresa || !payload.data_inicial || !payload.data_final) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    const idEdicao = $("#calIdEdicao").value;
    if (idEdicao) {
      await fetchJSON(`${API.calendario}?id=${encodeURIComponent(idEdicao)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("Calendário atualizado com sucesso!");
    } else {
      await fetchJSON(API.calendario, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("Calendário cadastrado com sucesso!");
    }

    closeModal("modalCadastrarCalendario");
    resetEdicaoCalendarioUI();
    await carregarCalendarios();
    await carregarEventosNoCalendario();

  } catch (e) {
    console.error(e);
    alert("Erro ao salvar calendário!");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function onSubmitAdicionarEvento(ev) {
  ev.preventDefault();
  const btn = $("#btnSalvarEvento");
  try {
    btn && (btn.disabled = true);

    const $select = window.jQuery && window.jQuery("#eventoCalendario");
    const calendarios_ids = $select ? $select.val() : [];
    const descricao = $("#eventoDescricao").value.trim();
    const data_inicial = $("#eventoInicio").value;
    const data_final = $("#eventoFim").value;

    if (!calendarios_ids?.length || !descricao || !data_inicial || !data_final) {
      alert("Preencha todos os campos obrigatórios e selecione pelo menos um calendário!");
      return;
    }

    const payload = { calendarios_ids, descricao, data_inicial, data_final };
    await fetchJSON(`${API.calendario}?action=evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    alert("Evento cadastrado e dias não letivos registrados!");
    closeModal("modalAdicionarEvento");
    await carregarCalendarios();
    await carregarEventosNoCalendario();
  } catch (e) {
    console.error(e);
    alert("Erro ao cadastrar evento!");
  } finally {
    btn && (btn.disabled = false);
  }
}

// === NOVO: somente permite excluir calendário se não houver dias_nao_letivos ===
function podeExcluirCalendario(cal) {
  const arr = cal?.dias_nao_letivos;
  return !(Array.isArray(arr) && arr.length > 0);
}

async function excluirCalendario(id) {
  await fetchJSON(`${API.calendario}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function onClickTabelaCalendarios(ev) {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const cal = STATE.calendarios.find(c => {
    const cid = toId(c) || toId(c._id) || toId(c.id);
    return cid === id;
  });
  if (!cal) return;

  if (action === "view") {
    abrirVisualizarCalendarioFull(cal);
  } else if (action === "edit") {
    const editarCalendario = confirm(
      "Clique em OK para editar os DADOS do calendário.\nClique em Cancelar para GERENCIAR os eventos (dias não letivos)."
    );
    if (editarCalendario) {
      abrirEdicaoCalendario(cal);
    } else {
      abrirGerenciarEventos(cal);
    }
  } else if (action === "delete") {
    if (!podeExcluirCalendario(cal)) {
      alert("Não é possível excluir este calendário: existem Dias Não Letivos cadastrados.\nRemova-os primeiro e tente novamente.");
      return;
    }
    if (confirm("Tem certeza que deseja excluir este calendário? Esta ação não poderá ser desfeita.")) {
      try {
        await excluirCalendario(id);
        await carregarCalendarios();
        await carregarEventosNoCalendario();
        alert("Calendário excluído com sucesso.");
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir calendário.");
      }
    }
  }
}

function getCalendarioById(id) {
  return STATE.calendarios.find(c => {
    const cid = toId(c) || toId(c._id) || toId(c.id);
    return cid === id;
  });
}

// ===================== Modal FULL: visualizar (somente excluir dias) =====================
async function abrirVisualizarCalendarioFull(cal) {
  const calId = toId(cal) || toId(cal._id) || toId(cal.id);

  const resumoHTML = [
    `<strong>Nome:</strong> ${cal.nome_calendario || ""}<br>`,
    `<strong>Empresa/Parceiro:</strong> ${nomeEmpresa(cal.id_empresa)}<br>`,
    `<strong>Instituição:</strong> ${nomeInstituicao(cal.id_instituicao)}<br>`,
    `<strong>Período:</strong> ${cal.data_inicial ? fmtBR(cal.data_inicial) : ""} a ${cal.data_final ? fmtBR(cal.data_final) : ""}`,
  ].join("");
  $("#detalhesCalendarioFull").innerHTML = resumoHTML;

  const thead = $("#tblDiasLetivos thead");
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Ações</th>
      </tr>`;
  }

  const diasNL = Array.isArray(cal.dias_nao_letivos) ? cal.dias_nao_letivos.slice() : [];
  diasNL.sort((a, b) => String(a.data).localeCompare(String(b.data)));

  const tbody = $("#tbodyDiasLetivos");
  if (!tbody) return;

  const delBtnStyle = 'width:36px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;';

  if (!diasNL.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum dia não letivo cadastrado.</td></tr>`;
  } else {
    tbody.innerHTML = diasNL.map(d => `
      <tr data-date="${d.data}">
        <td>${fmtBR(d.data)}</td>
        <td>${d.descricao || ""}</td>
        <td class="actions">
          <button class="btn btn-icon btn-delete" title="Excluir" data-acao="remover" aria-label="Excluir dia" style="${delBtnStyle}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  tbody.onclick = async (ev) => {
    const btn = ev.target.closest("button[data-acao='remover']");
    const tr = ev.target.closest("tr[data-date]");
    if (!btn || !tr) return;

    const dataOriginal = tr.getAttribute("data-date");
    if (confirm(`Remover o dia não letivo ${fmtBR(dataOriginal)}?`)) {
      await removerDiaNaoLetivo(calId, dataOriginal);
      await carregarCalendarios();
      await carregarEventosNoCalendario();
      const atualizado = getCalendarioById(calId);
      abrirVisualizarCalendarioFull(atualizado);
    }
  };

  openModal("modalVisualizarCalendarioFull");
}

// ===================== Modal pequeno: gerenciar (somente excluir) =====================
function abrirGerenciarEventos(cal) {
  const calId = toId(cal) || toId(cal._id) || toId(cal.id);
  STATE.gerenciarEventosCalId = calId;

  const delBtnStyle = 'width:36px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;';

  const detalhes = [
    `<strong>Nome:</strong> ${cal.nome_calendario || ""}<br>`,
    `<strong>Empresa/Parceiro:</strong> ${nomeEmpresa(cal.id_empresa)}<br>`,
    `<strong>Instituição:</strong> ${nomeInstituicao(cal.id_instituicao)}<br>`,
    `<strong>Período:</strong> ${cal.data_inicial ? fmtBR(cal.data_inicial) : ""} a ${cal.data_final ? fmtBR(cal.data_final) : ""}<br><br>`,
    `<strong>Dias Não Letivos:</strong>`,
    `<ul id="listaDnl" style="margin-top:6px;">`,
    ...(Array.isArray(cal.dias_nao_letivos) && cal.dias_nao_letivos.length
      ? cal.dias_nao_letivos
          .slice()
          .sort((a, b) => String(a.data).localeCompare(String(b.data)))
          .map(d => `
            <li data-data="${d.data}">
              <span class="dnl-data">${fmtBR(d.data)}</span> - <span class="dnl-desc">${d.descricao || ""}</span>
              <button class="btn btn-icon btn-delete" title="Excluir" data-acao="remover" aria-label="Excluir dia" style="${delBtnStyle}">
                <i class="fas fa-trash-alt"></i>
              </button>
            </li>
          `)
      : ["<li>Nenhum</li>"]),
    `</ul>`,
    `<div style="margin-top:10px;">
       <button class="btn btn-warning" id="btnAdicionarEventoRapido">
         <i class="fas fa-calendar-plus"></i> Adicionar Novo Evento (intervalo)
       </button>
     </div>`
  ].join("");

  $("#detalhesCalendario").innerHTML = detalhes;
  openModal("modalVisualizarCalendario");

  const lista = $("#listaDnl");
  if (lista) {
    lista.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button[data-acao='remover']");
      const li = ev.target.closest("li[data-data]");
      if (!btn || !li) return;

      const dataOriginal = li.getAttribute("data-data");
      if (confirm(`Remover o dia não letivo ${fmtBR(dataOriginal)}?`)) {
        await removerDiaNaoLetivo(STATE.gerenciarEventosCalId, dataOriginal);
        await recarregarGerenciarEventos();
      }
    });
  }

  const btnRapido = $("#btnAdicionarEventoRapido");
  if (btnRapido) {
    btnRapido.addEventListener("click", async () => {
      openModal("modalAdicionarEvento");
      await carregarListaCalendariosParaEvento();
      const $select = window.jQuery && window.jQuery("#eventoCalendario");
      if ($select) {
        $select.val([STATE.gerenciarEventosCalId]).trigger("change");
      }
    });
  }
}

async function recarregarGerenciarEventos() {
  await carregarCalendarios();
  await carregarEventosNoCalendario();
  const cal = getCalendarioById(STATE.gerenciarEventosCalId);
  if (cal) abrirGerenciarEventos(cal);
}

// ===================== API auxiliares (excluir dia NL) =====================
async function removerDiaNaoLetivo(calId, data) {
  try {
    await fetchJSON(`${API.calendario}?action=remover_dia_nao_letivo&id=${encodeURIComponent(calId)}&data=${encodeURIComponent(data)}`, {
    method: "DELETE",
    });
  } catch (e) {
    console.error(e);
    alert("Erro ao remover dia não letivo.");
  }
}

// ===================== Filtro =====================
function filtrarCalendariosPorTexto(ev) {
  const q = ev.target.value.trim().toLowerCase();
  if (!q) {
    renderTabelaCalendarios(STATE.calendarios);
    return;
  }
  const filtrados = STATE.calendarios.filter(cal => {
    const nome = (cal.nome_calendario || cal.descricao || "").toLowerCase();
    const emp = (nomeEmpresa(cal.id_empresa) || "").toLowerCase();
    return nome.includes(q) || emp.includes(q);
  });
  renderTabelaCalendarios(filtrados);
}

// ===================== Modal pequeno legado (sem ações) =====================
function visualizarCalendario(cal) {
  const html = [
    `<strong>Nome:</strong> ${cal.nome_calendario || ""}<br>`,
    `<strong>Empresa/Parceiro:</strong> ${nomeEmpresa(cal.id_empresa)}<br>`,
    `<strong>Instituição:</strong> ${nomeInstituicao(cal.id_instituicao)}<br>`,
    `<strong>Data Inicial:</strong> ${cal.data_inicial ? fmtBR(cal.data_inicial) : ""}<br>`,
    `<strong>Data Final:</strong> ${cal.data_final ? fmtBR(cal.data_final) : ""}<br>`,
    `<strong>Dias Não Letivos:</strong>`,
    "<ul>",
    ...(Array.isArray(cal.dias_nao_letivos) && cal.dias_nao_letivos.length
      ? cal.dias_nao_letivos.map(d => `<li>${fmtBR(d.data)} - ${d.descricao || ""}</li>`)
      : ["<li>Nenhum</li>"]),
    "</ul>",
  ].join("");

  $("#detalhesCalendario").innerHTML = html;
  openModal("modalVisualizarCalendario");
}






















function attachDateRangeValidation({ formId, startId, endId, fieldNames = { start: 'Início', end: 'Fim' } }) {
  const form = document.getElementById(formId);
  const startEl = document.getElementById(startId);
  const endEl = document.getElementById(endId);
  if (!form || !startEl || !endEl) return;

  const validate = () => {
    // atualiza o min do fim com base no início
    if (startEl.value) endEl.min = startEl.value;

    // limpa mensagens se faltar algum valor
    if (!startEl.value || !endEl.value) {
      endEl.setCustomValidity('');
      return;
    }

    // comparação ISO funciona para date e datetime-local
    const startVal = startEl.value;
    const endVal = endEl.value;

    if (endVal < startVal) {
      endEl.setCustomValidity(`${fieldNames.end} não pode ser anterior ao ${fieldNames.start}.`);
    } else {
      endEl.setCustomValidity('');
    }
  };

  startEl.addEventListener('input', validate);
  endEl.addEventListener('input', validate);

  form.addEventListener('submit', (e) => {
    validate();
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity(); // mostra o balão de erro do HTML5
    }
  });

  // roda uma vez ao iniciar
  validate();
}

// Ativa a validação nos dois modais
document.addEventListener('DOMContentLoaded', () => {
  attachDateRangeValidation({
    formId: 'formCadastrarCalendario',
    startId: 'calInicio',
    endId: 'calFim',
    fieldNames: { start: 'Início do Calendário', end: 'Término do Calendário' }
  });

  attachDateRangeValidation({
    formId: 'formAdicionarEvento',
    startId: 'eventoInicio',
    endId: 'eventoFim',
    fieldNames: { start: 'Início', end: 'Fim' }
  });
});