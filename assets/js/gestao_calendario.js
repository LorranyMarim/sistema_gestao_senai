/* eslint-disable no-console */
/* Requer: geral.js (expondo window.App) */
if (!window.App) throw new Error('Carregue geral.js antes de gestao_calendario.js.');

const { $, $$ } = App.dom;
const { debounce, norm, toId } = App.utils;
const { fetchJSON } = App.net;
const { attachDateRangeValidation } = App.ui;

// ===================== Config & State =====================
const API = Object.freeze({
  calendario: "../backend/processa_calendario.php",
  empresa: "../backend/processa_empresa.php",
  instituicao: "../backend/processa_instituicao.php",
  turma: "../backend/processa_turma.php"
});

const TZ = "America/Sao_Paulo";
const FIX_OFFSET_MS = 3 * 60 * 60 * 1000; // ajuste -3h

const STATE = {
  empresas: [],
  instituicoes: [],
  calendarios: [],
  // mapa com TODOS os calendários (usado para regras do modal "Adicionar Evento")
  calendariosAllById: {},

  fc: null, // FullCalendar instance
  calEmEdicaoId: null,
  gerenciarEventosCalId: null,
  // paginação/filtros
  pagination: { page: 1, pageSize: 10, total: 0 },
  filters: { q: "", year: "", empresa: "", instituicao: "", status: "" }, // <-- status
};

// ===================== Utils específicos da view =====================
function fmtBR(iso) {
  if (!iso) return "";
  const p = String(iso).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

// ---- Datas/horários ----
function parseIsoAssumindoUtc(v) {
  if (!v) return null;
  let iso = String(v);
  // se vier sem offset, trate como UTC
  if (/^\d{4}-\d{2}-\d{2}T/.test(iso) && !(/[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso))) iso += "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateTimeBR(v) {
  if (!v) return "—";
  const d = parseIsoAssumindoUtc(v);
  if (!d) return "—";
  // ajuste -3h solicitado
  const corrigido = new Date(d.getTime() - FIX_OFFSET_MS);
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", year: "2-digit", month: "2-digit", day: "2-digit" }).format(corrigido);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }).format(corrigido);
  return `${data} ${hora}`;
}

// Helpers de comparação de datas (YYYY-MM-DD)
const dateMax = (a, b) => (!a ? b : !b ? a : (a > b ? a : b));
const dateMin = (a, b) => (!a ? b : !b ? a : (a < b ? a : b));
const dateClamp = (v, min, max) => {
  if (!v) return v;
  if (min && v < min) return min;
  if (max && v > max) return max;
  return v;
};

// timestamp do ObjectId (primeiros 4 bytes = epoch seconds)
function tsFromObjectId(id) {
  const s = String(id || "");
  if (!/^[a-fA-F0-9]{24}$/.test(s)) return 0;
  try {
    const seconds = parseInt(s.substring(0, 8), 16);
    return seconds * 1000;
  } catch {
    return 0;
  }
}

// timestamp de criação para ordenação (desc)
function tsCriacao(cal) {
  // 1) data_criacao
  const d = parseIsoAssumindoUtc(cal?.data_criacao);
  if (d) return d.getTime() - FIX_OFFSET_MS; // manter coerência com exibição

  // 2) timestamp embutido no _id (Mongo)
  const id = toId(cal) || toId(cal?._id) || toId(cal?.id);
  const tId = tsFromObjectId(id);
  if (tId) return tId;

  // 3) fallback: datas do período
  const di = cal?.data_inicial ? Date.parse(cal.data_inicial) : 0;
  const df = cal?.data_final ? Date.parse(cal.data_final) : 0;
  return Math.max(di, df, 0);
}

function corParaCalendario(id) {
  if (!id) return "#e6f0ff";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const h = (hash % 360 + 360) % 360;
  return `hsl(${h},70%,80%)`;
}

// ===================== Lookups (dependem do STATE) =====================
function nomeEmpresa(id) {
  const e = STATE.empresas.find(x => toId(x) === id || toId(x._id) === id);
  return e?.razao_social || id || "";
}
function nomeInstituicao(id) {
  const i = STATE.instituicoes.find(x => toId(x) === id || toId(x._id) === id);
  return i?.razao_social || id || "";
}

// ===================== Modais (específico desta view) =====================
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
    // Mantém status "Ativo" como padrão visual ao fechar
    const st = $("#calStatus");
    if (st) st.value = "Ativo";
    resetEdicaoCalendarioUI();
  }
  if (id === "modalAdicionarEvento") {
    $("#formAdicionarEvento")?.reset();
    if ($("#eventoCalendario") && $("#eventoCalendario").classList.contains("select2-hidden-accessible")) {
      try { $("#eventoCalendario").value = null; } catch (_) {}
      window.jQuery && window.jQuery("#eventoCalendario").val(null).trigger("change");
    }
    // Desabilita e limpa limites dos inputs de data ao fechar o modal
    const ini = $("#eventoInicio");
    const fim = $("#eventoFim");
    if (ini && fim) {
      ini.value = ""; fim.value = "";
      ini.min = ""; ini.max = "";
      fim.min = ""; fim.max = "";
      ini.disabled = true; fim.disabled = true;
    }
  }
}
window.openModal = openModal;
window.closeModal = closeModal;

// Importante: o geral.js já fecha modais ao clicar no overlay .modal,
// mas aqui garantimos o reset correto destes modais específicos.
document.addEventListener("click", (ev) => {
  const tgt = ev.target;
  if (tgt?.classList?.contains("modal")) {
    const id = tgt.id;
    if (id === "modalCadastrarCalendario" || id === "modalAdicionarEvento" ||
        id === "modalVisualizarCalendario" || id === "modalVisualizarCalendarioFull") {
      closeModal(id);
    }
  }
});

// ===================== Botão "Limpar filtros" =====================
function updateClearBtn() {
  const btn = $("#btnClearFilters");
  if (!btn) return;
  const { q, year, empresa, instituicao, status } = STATE.filters;
  const hasFilters = !!(q || year || empresa || instituicao || status);
  btn.disabled = !hasFilters;
  btn.setAttribute("aria-disabled", String(!hasFilters));
}

async function clearFilters() {
  STATE.filters = { q: "", year: "", empresa: "", instituicao: "", status: "" };
  STATE.pagination.page = 1;

  // zera inputs da UI
  const $id = (s) => document.getElementById(s);
  if ($id("filtroBusca")) $id("filtroBusca").value = "";
  if ($id("filtroAno")) $id("filtroAno").value = "";
  if ($id("filtroEmpresa")) $id("filtroEmpresa").value = "";
  if ($id("filtroInstituicao")) $id("filtroInstituicao").value = "";
  if ($id("filtroStatus")) $id("filtroStatus").value = ""; // Todas

  updateClearBtn();
  await carregarCalendarios();
  await carregarEventosNoCalendario();
}
window.clearFilters = clearFilters;

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded", async () => {
  initFullCalendar();
  await carregarDadosReferencia();
  popularFiltrosFixos();
  await carregarCalendarios();
  await carregarEventosNoCalendario(); // primeiro render

  const buscaInput = $("#filtroBusca");
  if (buscaInput) {
    buscaInput.setAttribute("placeholder", "Buscar por nome do calendário, empresa ou instituição");
  }

  $("#btnAbrirModalAdicionarEvento")?.addEventListener("click", async () => {
    // prepara o formulário (desabilita datas até selecionar calendário)
    prepareAdicionarEventoForm();
    openModal("modalAdicionarEvento");
    await carregarListaCalendariosParaEvento();
  });

  $("#btnAbrirModalCadastrarCalendario")?.addEventListener("click", async () => {
    openModal("modalCadastrarCalendario");
    await carregarInstituicoesEmpresas();
    if (STATE.filters.instituicao) $("#calInstituicao").value = STATE.filters.instituicao;
    if (STATE.filters.empresa) $("#calEmpresa").value = STATE.filters.empresa;
    // status padrão ao abrir criação
    const st = $("#calStatus");
    if (st && !STATE.calEmEdicaoId) st.value = "Ativo";
  });

  $("#formCadastrarCalendario")?.addEventListener("submit", onSubmitCadastrarCalendario);
  $("#formAdicionarEvento")?.addEventListener("submit", onSubmitAdicionarEvento);
  $("#tbodyCalendarios")?.addEventListener("click", onClickTabelaCalendarios);

  // Filtros e paginação
  const debouncedBusca = debounce(async (val) => {
    STATE.filters.q = val.trim();
    STATE.pagination.page = 1;
    updateClearBtn();
    await carregarCalendarios();
  }, 400);

  $("#filtroBusca")?.addEventListener("input", (e) => debouncedBusca(e.target.value));
  $("#filtroAno")?.addEventListener("change", async (e) => { STATE.filters.year = e.target.value; STATE.pagination.page = 1; updateClearBtn(); await carregarCalendarios(); });
  $("#filtroEmpresa")?.addEventListener("change", async (e) => { STATE.filters.empresa = e.target.value; STATE.pagination.page = 1; updateClearBtn(); await carregarCalendarios(); });
  $("#filtroInstituicao")?.addEventListener("change", async (e) => { STATE.filters.instituicao = e.target.value; STATE.pagination.page = 1; updateClearBtn(); await carregarCalendarios(); });
  $("#filtroStatus")?.addEventListener("change", async (e) => { STATE.filters.status = e.target.value; STATE.pagination.page = 1; updateClearBtn(); await carregarCalendarios(); });
  $("#pageSize")?.addEventListener("change", async (e) => { STATE.pagination.pageSize = parseInt(e.target.value || "10", 10); STATE.pagination.page = 1; await carregarCalendarios(); });

  $("#btnPrevPage")?.addEventListener("click", async () => {
    if (STATE.pagination.page > 1) { STATE.pagination.page--; await carregarCalendarios(); }
  });
  $("#btnNextPage")?.addEventListener("click", async () => {
    const { page, pageSize, total } = STATE.pagination;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page < maxPage) { STATE.pagination.page++; await carregarCalendarios(); }
  });

  // Botão "Limpar filtros"
  $("#btnClearFilters")?.addEventListener("click", clearFilters);
  updateClearBtn();

  // Validações de intervalo (usando util do geral.js)
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

  // Interações do formulário "Adicionar Evento" (regra 1)
  wireEventoFormInteractions();
});

// ===================== Regras do formulário "Adicionar Evento" =====================

// Deixa inputs de data limpos/indisponíveis até escolher calendário
function prepareAdicionarEventoForm() {
  const ini = $("#eventoInicio");
  const fim = $("#eventoFim");
  if (!ini || !fim) return;
  ini.value = ""; fim.value = "";
  ini.min = ""; ini.max = "";
  fim.min = ""; fim.max = "";
  ini.disabled = true; fim.disabled = true;
}

// Obtém ids selecionados no Select2
function getSelectedEventoCalendarios() {
  const $select = window.jQuery && window.jQuery("#eventoCalendario");
  if (!$select) return [];
  return $select.val() || [];
}

// Calcula interseção do período dos calendários selecionados
// (garante que o evento caiba em TODOS os calendários escolhidos)
function computeSelectedCalendarsRange(ids) {
  if (!ids || !ids.length) return null;
  let startMax = null; // maior data_inicial
  let endMin = null;   // menor data_final
  ids.forEach(id => {
    const cal = STATE.calendariosAllById[id] ||
                STATE.calendarios.find(c => (toId(c) || toId(c?._id) || toId(c?.id)) === id);
    if (!cal) return;
    const s = cal.data_inicial || null;
    const e = cal.data_final || null;
    if (s) startMax = dateMax(startMax, s);
    if (e) endMin   = dateMin(endMin, e);
  });
  if (!startMax || !endMin || startMax > endMin) return { start: null, end: null, invalid: true };
  return { start: startMax, end: endMin, invalid: false };
}

// Aplica limites min/max nos inputs de data de acordo com a seleção
function applyEventoDateBounds(range) {
  const ini = $("#eventoInicio");
  const fim = $("#eventoFim");
  if (!ini || !fim) return;

  if (!range || range.invalid || !range.start || !range.end) {
    ini.min = ""; ini.max = "";
    fim.min = ""; fim.max = "";
    ini.disabled = true; fim.disabled = true;
    return;
  }

  ini.disabled = false;
  fim.disabled = false;

  ini.min = range.start;
  ini.max = range.end;

  // mantém o início dentro do range
  ini.value = dateClamp(ini.value, range.start, range.end) || ini.value;

  // fim >= início e dentro do range
  const minFim = dateMax(range.start, ini.value || range.start);
  fim.min = minFim;
  fim.max = range.end;

  // se fim vazio ou fora do permitido, puxa para o início
  if (!fim.value || fim.value < minFim || fim.value > range.end) {
    fim.value = ini.value || minFim;
  }
}

// Encaixa mudanças do select e do início
function wireEventoFormInteractions() {
  // evita bind duplicado
  const ini = $("#eventoInicio");
  const fim = $("#eventoFim");
  if (ini && !ini.dataset.wired) {
    ini.dataset.wired = "1";
    ini.addEventListener("change", () => {
      // Regra 1: ao escolher início, preenche fim automaticamente (se vazio ou menor)
      if (ini.value && (!fim.value || fim.value < ini.value)) {
        fim.value = ini.value;
      }
      // Recalcula limites considerando seleção atual de calendários
      const ids = getSelectedEventoCalendarios();
      const range = computeSelectedCalendarsRange(ids);
      applyEventoDateBounds(range);
    });
  }
}

// ===================== FullCalendar =====================
function initFullCalendar() {
  const el = document.getElementById("calendario");
  if (!el) return;
  STATE.fc = new FullCalendar.Calendar(el, {
    locale: "pt-br",
    timeZone: TZ,
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    editable: false,
    selectable: false,
    dayMaxEvents: true,
    events: async (info, success, failure) => {
      try {
        const qs = new URLSearchParams({
          action: "eventos_range",
          start: info.startStr,
          end: info.endStr,
        }).toString();
        const eventos = await fetchJSON(`${API.calendario}?${qs}`);
        const mapped = (eventos || []).map(ev => ({
          title: `${ev.descricao} (${ev.nome_calendario || "Calendário"})`,
          start: ev.data,
          allDay: true,
          backgroundColor: corParaCalendario(ev.calendario_id),
          borderColor: corParaCalendario(ev.calendario_id),
        }));
        success(mapped);
      } catch (e) {
        console.error("Falha ao carregar eventos por faixa:", e);
        failure(e);
      }
    },
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

function popularFiltrosFixos() {
  // Empresa/Instituição
  const empSel = $("#filtroEmpresa");
  const instSel = $("#filtroInstituicao");
  if (empSel) {
    empSel.innerHTML = `<option value="">Todas</option>` + STATE.empresas.map(e => `<option value="${toId(e)}">${e.razao_social || "(sem nome)"}</option>`).join("");
  }
  if (instSel) {
    instSel.innerHTML = `<option value="">Todas</option>` + STATE.instituicoes.map(i => `<option value="${toId(i)}">${i.razao_social || "(sem nome)"}</option>`).join("");
  }
  // Ano (dinâmico)
  const anoSel = $("#filtroAno");
  if (anoSel) {
    const now = new Date().getFullYear();
    const anos = [];
    for (let a = now + 5; a >= now - 5; a--) anos.push(a);
    anoSel.innerHTML = `<option value="">Todos</option>` + anos.map(a => `<option value="${a}">${a}</option>`).join("");
  }
  // Status
  const stSel = $("#filtroStatus");
  if (stSel) {
    stSel.innerHTML = `
      <option value="">Todas</option>
      <option value="Ativo">Ativo</option>
      <option value="Inativo">Inativo</option>
    `;
  }
}

async function carregarCalendarios() {
  try {
    const { page, pageSize } = STATE.pagination;
    const { q, year, empresa, instituicao, status } = STATE.filters;

    const qs = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });

    // Busca inteligente: se "q" bater com empresa ou instituição conhecidas, envia o id específico
    let usouQ = false;
    if (q) {
      const alvo = norm(q.trim());
      if (!empresa) {
        const emp = STATE.empresas.find(e => norm(e.razao_social).includes(alvo));
        if (emp) { qs.set("id_empresa", toId(emp)); usouQ = true; }
      }
      if (!usouQ && !instituicao) {
        const inst = STATE.instituicoes.find(i => norm(i.razao_social).includes(alvo));
        if (inst) { qs.set("id_instituicao", toId(inst)); usouQ = true; }
      }
      if (!usouQ) qs.set("q", q);
    }

    if (year) qs.set("year", year);
    if (empresa) qs.set("id_empresa", empresa);
    if (instituicao) qs.set("id_instituicao", instituicao);
    if (status) qs.set("status", status); // <-- filtro por status

    const res = await fetchJSON(`${API.calendario}?${qs.toString()}`);
    // Back-end retorna {items, total}
    STATE.calendarios = res.items || [];
    STATE.pagination.total = res.total ?? STATE.calendarios.length;

    renderTabelaCalendarios(STATE.calendarios);
    atualizarPaginacaoUI();
    updateClearBtn(); // mantém o estado do botão coerente após carregar
  } catch (e) {
    console.error("Falha ao carregar calendários:", e.message);
    const tb = $("#tbodyCalendarios");
    if (tb) tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">Erro ao carregar.</td></tr>'; // 7 colunas agora
  }
}

async function carregarEventosNoCalendario() {
  try {
    STATE.fc?.refetchEvents();
  } catch (e) {
    console.error("Falha ao carregar eventos:", e.message);
  }
}

async function carregarListaCalendariosParaEvento() {
  try {
    const res = await fetchJSON(`${API.calendario}?limit=1000&page=1`);
    const lista = res.items || res; // compat
    const $select = window.jQuery && window.jQuery("#eventoCalendario");
    if (!$select) return;

    // atualiza mapa de todos os calendários
    STATE.calendariosAllById = {};
    (lista || []).forEach(cal => {
      const id = toId(cal) || toId(cal._id) || toId(cal.id);
      if (!id) return;
      STATE.calendariosAllById[id] = cal;
    });

    // popula select
    $select.empty();
    (lista || []).forEach(cal => {
      const id = toId(cal) || toId(cal._id) || toId(cal.id);
      const nome = cal.nome_calendario || cal.descricao || "(Sem nome)";
      $select.append(`<option value="${id}">${nome}</option>`);
    });

    // (re)inicializa select2
    if ($select.hasClass("select2-hidden-accessible")) {
      $select.select2("destroy");
    }
    $select.select2({
      width: "100%",
      placeholder: "Selecione os Calendários",
      dropdownParent: window.jQuery("#modalAdicionarEvento .modal-content"),
    });

    // regra 2: ao alterar seleção, restringe o range dos inputs de data
    $select.off("change.gestao").on("change.gestao", () => {
      const ids = getSelectedEventoCalendarios();
      const range = computeSelectedCalendarsRange(ids);
      applyEventoDateBounds(range);
    });

    // dispara uma vez (útil quando abrimos via "Gerenciar" com um calendário pré-selecionado)
    $select.trigger("change");
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

  // Status no modal de edição
  const st = $("#calStatus");
  if (st) st.value = cal.status || "Ativo";

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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum calendário cadastrado.</td></tr>'; // 7 colunas agora
    return;
  }

  // ORDENAR por mais recente (data_criacao DESC), com fallbacks
  const ordenada = [...lista].sort((a, b) => tsCriacao(b) - tsCriacao(a));

  const rows = ordenada.map(cal => {
    const id = toId(cal) || toId(cal._id) || toId(cal.id);
    const nome = cal.nome_calendario || cal.descricao || "";
    const empresa = nomeEmpresa(cal.id_empresa);
    const dtIni = cal.data_inicial ? fmtBR(cal.data_inicial) : "";
    const dtFim = cal.data_final ? fmtBR(cal.data_final) : "";
    const criadoEm = fmtDateTimeBR(cal.data_criacao);
    const status = cal.status || "Ativo";

    return `
      <tr class="calendario-row" data-calendario-id="${id}" style="cursor: pointer;">
        <td>${nome}</td>
        <td>${empresa}</td>
        <td>${dtIni}</td>
        <td>${dtFim}</td>
        <td>${criadoEm}</td>
        <td>${status}</td>
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
  
  // Adicionar event listeners para clique nas linhas
  tbody.querySelectorAll('.calendario-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      // Não executar se clicou em um botão de ação
      if (e.target.closest('.actions button')) return;
      
      const calendarioId = row.dataset.calendarioId;
      await exibirCalendarioComTurmas(calendarioId);
    });
  });
  
  // Adicionar event listeners para clique nas linhas
  tbody.querySelectorAll('.calendario-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      // Não executar se clicou em um botão de ação
      if (e.target.closest('.actions button')) return;
      
      const calendarioId = row.dataset.calendarioId;
      await exibirCalendarioComTurmas(calendarioId);
    });
  });
}

function atualizarPaginacaoUI() {
  const { page, pageSize, total } = STATE.pagination;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  $("#pageInfo").textContent = `Página ${page} de ${maxPage} • ${total} registros`;
  const prev = $("#btnPrevPage");
  const next = $("#btnNextPage");
  if (prev) { prev.disabled = page <= 1; prev.setAttribute("aria-disabled", prev.disabled); }
  if (next) { next.disabled = page >= maxPage; next.setAttribute("aria-disabled", next.disabled); }
}

// ===================== Handlers =====================
async function onSubmitCadastrarCalendario(ev) {
  ev.preventDefault();
  const btn = $("#btnCadastrarCalendario");
  try {
    if (btn) btn.disabled = true;

    const statusEl = $("#calStatus");
    const payload = {
      id_instituicao: $("#calInstituicao").value,
      nome_calendario: $("#calNome").value.trim(),
      id_empresa: $("#calEmpresa").value,
      data_inicial: $("#calInicio").value,
      data_final: $("#calFim").value,
      status: statusEl ? (statusEl.value || "Ativo") : "Ativo", // <-- status no payload
      dias_letivos: {}, // ignorado pelo backend; mantido por compat
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

  // Garante que constraints HTML5 (required, min/max) sejam respeitadas
  const form = $("#formAdicionarEvento");
  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }

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
    const res = await fetchJSON(`${API.calendario}?action=evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // aceita chaves tanto do PHP quanto do FastAPI
    const adicionados = Array.isArray(res?.adicionados) ? res.adicionados : (res?.added || []);
    const duplicados  = Array.isArray(res?.duplicados)  ? res.duplicados  : (res?.duplicated || []);

    const fmt = (d) => fmtBR(d);
    let msg = res?.msg || "Evento cadastrado e dias não letivos registrados!";

    if (duplicados?.length) {
      const listaDup = duplicados.map(fmt).join(", ");
      const qtdNovos = adicionados?.length || 0;
      msg = `Os dias ${listaDup} já eram não letivos. ` +
            (qtdNovos > 0 ? `${qtdNovos} dia(s) novo(s) adicionado(s).` : "Nenhum novo dia foi adicionado.");
    }

    alert(msg);
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


// regra: só exclui calendário se NÃO houver dias_não_letivos
function podeExcluirCalendario(cal) {
  const arr = cal?.dias_nao_letivos;
  return !(Array.isArray(arr) && arr.length > 0);
}
async function excluirCalendario(id) {
  await fetchJSON(`${API.calendario}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
    if (editarCalendario) abrirEdicaoCalendario(cal);
    else abrirGerenciarEventos(cal);
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
    `<strong>Período:</strong> ${cal.data_inicial ? fmtBR(cal.data_inicial) : ""} a ${cal.data_final ? fmtBR(cal.data_final) : ""}<br>`,
    `<strong>Criado em:</strong> ${fmtDateTimeBR(cal.data_criacao)}`
  ].join("");
  $("#detalhesCalendarioFull").innerHTML = resumoHTML;

  const tbody = $("#tbodyDiasLetivos");
  if (!tbody) return;

  const diasNL = Array.isArray(cal.dias_nao_letivos) ? cal.dias_nao_letivos.slice() : [];
  diasNL.sort((a, b) => String(a.data).localeCompare(String(b.data)));

  const delBtnStyle = 'width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;';

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
      const atualizado = getCalendarioById(calId) || cal; // fallback
      abrirVisualizarCalendarioFull(atualizado);
    }
  };

  openModal("modalVisualizarCalendarioFull");
}

// ===================== Modal pequeno: gerenciar (somente excluir) =====================
function abrirGerenciarEventos(cal) {
  const calId = toId(cal) || toId(cal._id) || toId(cal.id);
  STATE.gerenciarEventosCalId = calId;

  const delBtnStyle = 'width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;';

  const detalhes = [
    `<strong>Nome:</strong> ${cal.nome_calendario || ""}<br>`,
    `<strong>Empresa/Parceiro:</strong> ${nomeEmpresa(cal.id_empresa)}<br>`,
    `<strong>Instituição:</strong> ${nomeInstituicao(cal.id_instituicao)}<br>`,
    `<strong>Período:</strong> ${cal.data_inicial ? fmtBR(cal.data_inicial) : ""} a ${cal.data_final ? fmtBR(cal.data_final) : ""}<br>`,
    `<strong>Criado em:</strong> ${fmtDateTimeBR(cal.data_criacao)}<br><br>`,
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
      // prepara o form, abre, carrega lista e pré-seleciona este calendário
      prepareAdicionarEventoForm();
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

// ===================== Modal pequeno legado (somente visualizar) =====================
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

// Nova função para carregar turmas por calendário
async function carregarTurmasPorCalendario(calendarioId) {
  try {
    const response = await fetch(`../backend/processa_turma.php`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const turmas = await response.json();
    
    // Filtrar turmas pelo calendário
    return turmas.filter(turma => turma.id_calendario === calendarioId);
  } catch (error) {
    console.error('Erro ao carregar turmas:', error);
    return [];
  }
}

// Nova função para exibir calendário com turmas
async function exibirCalendarioComTurmas(calendarioId) {
  try {
    const calendario = getCalendarioById(calendarioId);
    if (!calendario) {
      alert('Calendário não encontrado.');
      return;
    }
    
    // Carregar turmas associadas ao calendário
    const turmas = await carregarTurmasPorCalendario(calendarioId);
    
    // Limpar eventos existentes no FullCalendar
    if (STATE.fc) {
      STATE.fc.removeAllEvents();
    }
    
    // Adicionar dias não letivos do calendário
    if (Array.isArray(calendario.dias_nao_letivos)) {
      calendario.dias_nao_letivos.forEach(dia => {
        if (STATE.fc && dia.data) {
          STATE.fc.addEvent({
            id: `nao-letivo-${dia.data}`,
            title: dia.descricao || 'Dia não letivo',
            start: dia.data,
            allDay: true,
            backgroundColor: '#ff6b6b',
            borderColor: '#ff5252',
            textColor: '#ffffff'
          });
        }
      });
    }
    
    // Adicionar turmas como eventos
    turmas.forEach(turma => {
      if (STATE.fc && turma.data_inicio) {
        const endDate = turma.data_fim || turma.data_inicio;
        
        STATE.fc.addEvent({
          id: `turma-${turma._id || turma.id}`,
          title: `${turma.codigo} - ${turma.turno}`,
          start: turma.data_inicio,
          end: endDate,
          allDay: true,
          backgroundColor: '#4CAF50',
          borderColor: '#45a049',
          textColor: '#ffffff',
          extendedProps: {
            tipo: 'turma',
            turma: turma
          }
        });
      }
    });
    
    // Navegar para o período do calendário
    if (STATE.fc && calendario.data_inicial) {
      STATE.fc.gotoDate(calendario.data_inicial);
    }
    
    // Mostrar informações do calendário selecionado
    const infoDiv = document.createElement('div');
    infoDiv.id = 'calendario-info';
    infoDiv.innerHTML = `
      <div style="background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
        <h3 style="margin: 0 0 10px 0; color: #333;">📅 ${calendario.nome_calendario || 'Calendário'}</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Empresa:</strong> ${nomeEmpresa(calendario.id_empresa)}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Período:</strong> ${fmtBR(calendario.data_inicial)} até ${fmtBR(calendario.data_final)}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Turmas associadas:</strong> ${turmas.length}</p>
        ${turmas.length > 0 ? `
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; color: #007bff;">Ver turmas (${turmas.length})</summary>
            <ul style="margin: 10px 0 0 20px;">
              ${turmas.map(t => `<li>${t.codigo} - ${t.turno} (${t.num_alunos || 0} alunos)</li>`).join('')}
            </ul>
          </details>
        ` : ''}
      </div>
    `;
    
    // Remover info anterior se existir
    const existingInfo = document.getElementById('calendario-info');
    if (existingInfo) {
      existingInfo.remove();
    }
    
    // Inserir antes do calendário
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
      calendarEl.parentNode.insertBefore(infoDiv, calendarEl);
    }
    
    console.log(`Calendário ${calendario.nome_calendario} carregado com ${turmas.length} turmas`);
    
  } catch (error) {
    console.error('Erro ao exibir calendário com turmas:', error);
    alert('Erro ao carregar calendário e turmas.');
  }
}

// Nova função para carregar turmas por calendário
async function carregarTurmasPorCalendario(calendarioId) {
  try {
    const response = await fetch(`../backend/processa_turma.php`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const turmas = await response.json();
    
    // Filtrar turmas pelo calendário
    return turmas.filter(turma => turma.id_calendario === calendarioId);
  } catch (error) {
    console.error('Erro ao carregar turmas:', error);
    return [];
  }
}

// Nova função para exibir calendário com turmas
async function exibirCalendarioComTurmas(calendarioId) {
  try {
    const calendario = getCalendarioById(calendarioId);
    if (!calendario) {
      alert('Calendário não encontrado.');
      return;
    }
    
    // Carregar turmas associadas ao calendário
    const turmas = await carregarTurmasPorCalendario(calendarioId);
    
    // Limpar eventos existentes no FullCalendar
    if (STATE.fc) {
      STATE.fc.removeAllEvents();
    }
    
    // Adicionar dias não letivos do calendário
    if (Array.isArray(calendario.dias_nao_letivos)) {
      calendario.dias_nao_letivos.forEach(dia => {
        if (STATE.fc && dia.data) {
          STATE.fc.addEvent({
            id: `nao-letivo-${dia.data}`,
            title: dia.descricao || 'Dia não letivo',
            start: dia.data,
            allDay: true,
            backgroundColor: '#ff6b6b',
            borderColor: '#ff5252',
            textColor: '#ffffff'
          });
        }
      });
    }
    
    // Adicionar turmas como eventos
    turmas.forEach(turma => {
      if (STATE.fc && turma.data_inicio) {
        const endDate = turma.data_fim || turma.data_inicio;
        
        STATE.fc.addEvent({
          id: `turma-${turma._id || turma.id}`,
          title: `${turma.codigo} - ${turma.turno}`,
          start: turma.data_inicio,
          end: endDate,
          allDay: true,
          backgroundColor: '#4CAF50',
          borderColor: '#45a049',
          textColor: '#ffffff',
          extendedProps: {
            tipo: 'turma',
            turma: turma
          }
        });
      }
    });
    
    // Navegar para o período do calendário
    if (STATE.fc && calendario.data_inicial) {
      STATE.fc.gotoDate(calendario.data_inicial);
    }
    
    // Mostrar informações do calendário selecionado
    const infoDiv = document.createElement('div');
    infoDiv.id = 'calendario-info';
    infoDiv.innerHTML = `
      <div style="background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
        <h3 style="margin: 0 0 10px 0; color: #333;">📅 ${calendario.nome_calendario || 'Calendário'}</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Empresa:</strong> ${nomeEmpresa(calendario.id_empresa)}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Período:</strong> ${fmtBR(calendario.data_inicial)} até ${fmtBR(calendario.data_final)}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Turmas associadas:</strong> ${turmas.length}</p>
        ${turmas.length > 0 ? `
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; color: #007bff;">Ver turmas (${turmas.length})</summary>
            <ul style="margin: 10px 0 0 20px;">
              ${turmas.map(t => `<li>${t.codigo} - ${t.turno} (${t.num_alunos || 0} alunos)</li>`).join('')}
            </ul>
          </details>
        ` : ''}
      </div>
    `;
    
    // Remover info anterior se existir
    const existingInfo = document.getElementById('calendario-info');
    if (existingInfo) {
      existingInfo.remove();
    }
    
    // Inserir antes do calendário
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
      calendarEl.parentNode.insertBefore(infoDiv, calendarEl);
    }
    
    console.log(`Calendário ${calendario.nome_calendario} carregado com ${turmas.length} turmas`);
    
  } catch (error) {
    console.error('Erro ao exibir calendário com turmas:', error);
    alert('Erro ao carregar calendário e turmas.');
  }
}
