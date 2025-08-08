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

// ===================== Data lookups =====================
function nomeEmpresa(id) {
  const e = STATE.empresas.find(x => toId(x) === id || toId(x._id) === id);
  return e?.razao_social || id || "";
}

function nomeInstituicao(id) {
  const i = STATE.instituicoes.find(x => toId(x) === id || toId(x._id) === id);
  return i?.razao_social || id || "";
}

// ===================== Modal helpers (expostos globalmente p/ botões existentes) =====================
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
      // via jQuery
      try { $("#eventoCalendario").value = null; } catch (_) {}
      window.jQuery && window.jQuery("#eventoCalendario").val(null).trigger("change");
    }
  }
}

// Deixar acessível ao HTML (X dos modais):
window.openModal = openModal;
window.closeModal = closeModal;

// Fechar clicando fora
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

  // Abertura de modais
  $("#btnAbrirModalAdicionarEvento")?.addEventListener("click", async () => {
    openModal("modalAdicionarEvento");
    await carregarListaCalendariosParaEvento();
  });

  $("#btnAbrirModalCadastrarCalendario")?.addEventListener("click", async () => {
    openModal("modalCadastrarCalendario");
    await carregarInstituicoesEmpresas();
  });

  // Submits
  $("#formCadastrarCalendario")?.addEventListener("submit", onSubmitCadastrarCalendario);
  $("#formAdicionarEvento")?.addEventListener("submit", onSubmitAdicionarEvento);

  // Delegação de ações na tabela (view/edit/delete)
  $("#tbodyCalendarios")?.addEventListener("click", onClickTabelaCalendarios);

  // Filtro simples por texto
  $("#filtroCalendarios")?.addEventListener("input", filtrarCalendariosPorTexto);
});

// ===================== FullCalendar =====================
function initFullCalendar() {
  const el = document.getElementById("calendario");
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
  try {
    STATE.empresas = await fetchJSON(API.empresa);
  } catch (e) {
    console.error("Falha ao carregar empresas:", e.message);
  }
  try {
    STATE.instituicoes = await fetchJSON(API.instituicao);
  } catch (e) {
    console.error("Falha ao carregar instituições:", e.message);
  }
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

    // Recria as opções
    $select.empty();
    lista.forEach(cal => {
      const id = toId(cal) || toId(cal._id) || toId(cal.id);
      const nome = cal.nome_calendario || cal.descricao || "(Sem nome)";
      $select.append(`<option value="${id}">${nome}</option>`);
    });

    // >>> Igual ao "Mapa de Competência (UCs)": apenas width e placeholder <<<
    if ($select.hasClass("select2-hidden-accessible")) {
      $select.select2("destroy");
    }
    $select.select2({
      width: "100%",
      placeholder: "Selecione os Calendários"
    });

  } catch (e) {
    console.error("Falha ao carregar lista de calendários para evento:", e.message);
  }
}


async function carregarInstituicoesEmpresas() {
  // Popular selects do modal "Cadastrar Calendário"
  const instSelect = $("#calInstituicao");
  const empSelect = $("#calEmpresa");
  if (!instSelect || !empSelect) return;

  // Instituições
  instSelect.innerHTML = '<option value="">Selecione</option>';
  STATE.instituicoes.forEach(i => {
    const opt = document.createElement("option");
    opt.value = toId(i) || "";
    opt.textContent = i.razao_social || "(sem nome)";
    instSelect.appendChild(opt);
  });

  // Empresas
  empSelect.innerHTML = '<option value="">Selecione</option>';
  STATE.empresas.forEach(e => {
    const opt = document.createElement("option");
    opt.value = toId(e) || "";
    opt.textContent = e.razao_social || "(sem nome)";
    empSelect.appendChild(opt);
  });
}

// ===================== Renderização da Tabela =====================
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
    btn && (btn.disabled = true);

    const data = {
      id_instituicao: $("#calInstituicao").value,
      nome_calendario: $("#calNome").value.trim(),
      id_empresa: $("#calEmpresa").value,
      data_inicial: $("#calInicio").value,
      data_final: $("#calFim").value,
      dias_letivos: {}, // mantido como no código original
    };

    if (!data.id_instituicao || !data.nome_calendario || !data.id_empresa || !data.data_inicial || !data.data_final) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    await fetchJSON(API.calendario, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    alert("Calendário cadastrado com sucesso!");
    closeModal("modalCadastrarCalendario");
    await carregarCalendarios();
    await carregarEventosNoCalendario();
  } catch (e) {
    console.error(e);
    alert("Erro ao cadastrar calendário!");
  } finally {
    btn && (btn.disabled = false);
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

function onClickTabelaCalendarios(ev) {
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
    visualizarCalendario(cal);
  } else if (action === "edit") {
    // Placeholder para sua edição (não alterei comportamento original)
    alert("Funcionalidade de edição pendente.");
  } else if (action === "delete") {
    // Placeholder para sua exclusão (não alterei comportamento original)
    alert("Funcionalidade de exclusão pendente.");
  }
}

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

// ===================== Visualização (modal de detalhes) =====================
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
