// ========================= UTIL =========================
function toHexId(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
        if (v.$oid) return v.$oid;
        if (v.oid) return v.oid;
        if (v._id && typeof v._id === "string") return v._id;
        if (v._id && typeof v._id === "object" && v._id.$oid) return v._id.$oid;
    }
    return String(v);
}
function fmtBR(iso) {
    if (!iso) return "—";
    const d = iso.slice(0, 10).split("-");
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}
function statusToText(v) {
    // default é Ativo quando o campo não existe (retrocompatibilidade)
    return v === false ? "Inativo" : "Ativo";
}

// ========================= CONFIG =========================
const URL_API = "http://localhost:8000/api";
// >>>> AJUSTE ESTE CAMINHO para o seu PHP proxy <<<<
const URL_SALVAR_TURMA = "../backend/processa_turma.php";

// ========================= STORES =========================
let dadosCursos = [];
let dadosInstituicoes = [];
let dadosEmpresas = [];
let dadosCalendarios = [];
let dadosUcs = [];
let dadosInstrutores = [];

// Map empresa -> nome
let empById = new Map();
function getEmpresaNome(id) { return empById.get(toHexId(id)) || "—"; }

// Força visual "btn-outline-dark" na coluna .actions sem mexer no CSS global
const iconBtnsPatch = document.createElement("style");
iconBtnsPatch.innerHTML = `
  .data-table td.actions .btn.btn-icon{
    width:36px;height:36px;padding:0;margin-right:.25rem;
    display:inline-flex;align-items:center;justify-content:center;gap:0;
    border:1px solid #dee2e6;border-radius:.375rem;cursor:pointer;
    background:#fff;color:#212529;
  }
  .data-table td.actions .btn.btn-icon i{ pointer-events:none; }

  .data-table td.actions .btn.btn-view{   border-color:#0d6efd; }
  .data-table td.actions .btn.btn-view:hover{   background:#0d6efd;color:#fff; }

  .data-table td.actions .btn.btn-edit{   border-color:#198754; }
  .data-table td.actions .btn.btn-edit:hover{   background:#198754;color:#fff; }

  .data-table td.actions .btn.btn-delete{ border-color:#dc3545; }
  .data-table td.actions .btn.btn-delete:hover{ background:#dc3545;color:#fff; }
`;
document.head.appendChild(iconBtnsPatch);

// ========================= FETCH HELPERS =========================
async function fetchCursos() { const r = await fetch(`${URL_API}/cursos`); if (!r.ok) throw 0; return r.json(); }
async function fetchInstituicoes() { const r = await fetch(`${URL_API}/instituicoes`); if (!r.ok) throw 0; return r.json(); }
async function fetchEmpresas() { const r = await fetch(`${URL_API}/empresas`); if (!r.ok) throw 0; return r.json(); }
async function fetchCalendarios() { const r = await fetch(`${URL_API}/calendarios`); if (!r.ok) throw 0; return r.json(); }
async function fetchUcs() { const r = await fetch(`${URL_API}/unidades_curriculares`); if (!r.ok) throw 0; return r.json(); }
async function fetchInstrutores() { const r = await fetch(`${URL_API}/instrutores`); if (!r.ok) throw 0; return r.json(); }

// ========================= DOM READY =========================
document.addEventListener("DOMContentLoaded", async () => {
    // CSS pontual (modais de UC)
    const style = document.createElement("style");
    style.innerHTML = `
    #addUcBtn.btn.btn-primary { background-color:#28a745 !important;border-color:#28a745 !important; }
    #addUcBtn.btn.btn-primary:hover { background-color:#218838 !important;border-color:#1e7e34 !important; }
    .uc-remove-btn{ background:#dc3545 !important;color:#fff !important;border:none !important;border-radius:50% !important;
      width:34px;height:34px;display:flex;align-items:center;justify-content:center;transition:background .2s;margin-left:8px; }
    .uc-remove-btn:hover{ background:#b91c1c !important; }
  `;
    document.head.appendChild(style);

    // ---------- Carrega dados base ----------
    try {
        [
            dadosCursos,
            dadosInstituicoes,
            dadosEmpresas,
            dadosCalendarios,
            dadosUcs,
            dadosInstrutores,
        ] = await Promise.all([
            fetchCursos(),
            fetchInstituicoes(),
            fetchEmpresas(),
            fetchCalendarios(),
            fetchUcs(),
            fetchInstrutores(),
        ]);
        empById = new Map(dadosEmpresas.map(e => [toHexId(e._id), e.razao_social || ""]));
    } catch (e) {
        console.error("Erro ao carregar dados iniciais:", e);
        alert("Não foi possível carregar dados iniciais. Verifique a API.");
        return;
    }

    // ---------- Elementos do modal principal (já existentes) ----------
    const turmaFormModal = document.getElementById("turmaFormModal");
    const addTurmaBtn = document.getElementById("addTurmaBtn");
    const closeFormModalBtn = document.getElementById("closeFormModalBtn");
    const cancelFormBtn = document.getElementById("cancelFormBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const formSteps = document.querySelectorAll(".form-step");
    const stepItems = document.querySelectorAll(".step-item");

    // ---------- Popular selects do Step 1/2 ----------
    function populaSelectCursos() {
        const sel = document.getElementById("curso"); if (!sel) return;
        sel.innerHTML = '<option value="">Selecione</option>';
        dadosCursos.forEach(c => sel.innerHTML += `<option value="${toHexId(c._id)}">${c.nome}</option>`);
    }
    function populaSelectInstituicoes() {
        const sel = document.getElementById("instituicao"); if (!sel) return;
        sel.innerHTML = '<option value="">Selecione</option>';
        dadosInstituicoes.forEach(i => sel.innerHTML += `<option value="${toHexId(i._id)}">${i.razao_social}</option>`);
    }
    function populaSelectEmpresas() {
        const sel = document.getElementById("empresa"); if (!sel) return;
        sel.innerHTML = '<option value="">Selecione</option>';
        dadosEmpresas.forEach(e => sel.innerHTML += `<option value="${toHexId(e._id)}">${e.razao_social}</option>`);
    }
    function populaSelectCalendarios() {
        const sel = document.getElementById("calendario"); if (!sel) return;
        sel.innerHTML = '<option value="">Selecione</option>';
        dadosCalendarios.forEach(c => sel.innerHTML += `<option value="${toHexId(c._id)}">${c.nome_calendario}</option>`);
    }
    populaSelectCursos(); populaSelectInstituicoes(); populaSelectEmpresas(); populaSelectCalendarios();

    // =========================================================
    // =============== LISTAGEM (PAG/FILTRO/ORD) ===============
    // =========================================================
    const $tbody = document.getElementById("tblTurmas") || document.querySelector(".data-table tbody") || document.querySelector("tbody");
    const $pager = document.getElementById("pager");
    const $rangeInfo = document.getElementById("rangeInfo");
    const $loading = document.getElementById("loading");
    const $toastArea = document.getElementById("toastArea");

    const $q = document.getElementById("q") || document.getElementById("searchEmpresa");
    const $fCurso = document.getElementById("fCurso");
    const $fTurno = document.getElementById("fTurno");
    const $fInicio = document.getElementById("fInicio");
    const $fFim = document.getElementById("fFim");
    const $pageSz = document.getElementById("pageSize");
    const $btnLimpar = document.getElementById("btnLimpar");

    // Popular filtro Curso
    if ($fCurso) {
        $fCurso.innerHTML = '<option value="">Todos</option>';
        dadosCursos.forEach(c => $fCurso.innerHTML += `<option value="${toHexId(c._id)}">${c.nome}</option>`);
    }

    const state = {
        page: 1,
        page_size: Number(($pageSz && $pageSz.value) || 25),
        sort_by: "data_inicio",
        sort_dir: "asc",
        q: "",
        id_curso: "",
        turno: "",
        inicio: "",
        fim: ""
    };

    let turmasPageCache = []; // cache da página p/ abrir detalhe

    let tDebounce;
    function debounce(fn, ms = 350) { return (...a) => { clearTimeout(tDebounce); tDebounce = setTimeout(() => fn(...a), ms); }; }

    function loadFromQuery() {
        const p = new URLSearchParams(location.search);
        state.page = Number(p.get("page") || state.page);
        state.page_size = Number(p.get("page_size") || state.page_size);
        state.sort_by = p.get("sort_by") || state.sort_by;
        state.sort_dir = p.get("sort_dir") || state.sort_dir;
        state.q = p.get("q") || "";
        state.id_curso = p.get("id_curso") || "";
        state.turno = p.get("turno") || "";
        state.inicio = p.get("inicio") || "";
        state.fim = p.get("fim") || "";

        if ($pageSz) $pageSz.value = String(state.page_size);
        if ($q) $q.value = state.q;
        if ($fCurso) $fCurso.value = state.id_curso;
        if ($fTurno) $fTurno.value = state.turno;
        if ($fInicio) $fInicio.value = state.inicio;
        if ($fFim) $fFim.value = state.fim;
    }
    function pushQuery() {
        const p = new URLSearchParams();
        Object.entries(state).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, String(v)); });
        history.replaceState(null, "", `?${p.toString()}`);
    }

    function showLoading(v) { if ($loading) $loading.style.display = v ? "flex" : "none"; }
    function toast(msg) {
        if (!$toastArea) { alert(msg); return; }
        const el = document.createElement("div");
        el.setAttribute("role", "alert");
        el.style.cssText = "background:#dc3545;color:#fff;padding:.5rem .75rem;border-radius:.5rem;box-shadow:0 2px 8px rgba(0,0,0,.15)";
        el.textContent = msg;
        $toastArea.appendChild(el);
        setTimeout(() => el.remove(), 4500);
    }

    // antes: const cursoMap = ()=> new Map(dadosCursos.map(c => [toHexId(c._id), c.nome || ""]));
    const cursoMap = () => {
        const map = new Map();
        dadosCursos.forEach(c => {
            const key = toHexId(c._id || c.id); // aceita _id OU id
            const nome = c.nome || c.nome_curso || c.titulo || c.descricao || "—"; // aceita variações
            if (key) map.set(key, nome);
        });
        return map;
    };


    async function fetchTurmasServer() {
        const qs = new URLSearchParams({
            page: String(state.page),
            page_size: String(state.page_size),
            sort_by: state.sort_by,
            sort_dir: state.sort_dir,
        });
        if (state.q) qs.set("q", state.q);
        if (state.id_curso) qs.set("id_curso", state.id_curso);
        if (state.turno) qs.set("turno", state.turno);
        if (state.inicio) qs.set("inicio", state.inicio);
        if (state.fim) qs.set("fim", state.fim);

        showLoading(true);
        try {
            const r = await fetch(`${URL_API}/turmas?${qs.toString()}`);
            if (!r.ok) throw new Error(`Falha ao buscar turmas: ${r.status}`);
            const data = await r.json();
            if (Array.isArray(data)) {
                // compat: API antiga sem paginação
                return { items: data, page: 1, page_size: data.length, total: data.length };
            }
            return data; // {items, page, page_size, total}
        } finally {
            showLoading(false);
        }
    }

    function renderRows(items) {
        const mapCurso = cursoMap();
        turmasPageCache = items.slice();
        if (!$tbody) return;

        $tbody.innerHTML = "";
        items.forEach(t => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>
          <button class="btn btn-outline-dark btn-sm btn-collapse" aria-expanded="false" aria-controls="det-${t.id}" title="Detalhe rápido">+</button>
        </td>
        <td>${t.codigo || "—"}</td>
        <td>${t.turno || "—"}</td>
        <td>${fmtBR(t.data_inicio)}</td>
        <td>${fmtBR(t.data_fim)}</td>
        <td>${mapCurso.get(toHexId(t.id_curso)) || "—"}</td>
        <td>${getEmpresaNome(t.id_empresa)}</td>
        <td>${statusToText(t.status)}</td>
       <td class="actions">
  <div class="btn-group" role="group" aria-label="Ações">
    <button class="btn btn-icon btn-view"   data-id="${t.id}" title="Visualizar" aria-label="Visualizar">
      <i class="fas fa-eye" aria-hidden="true"></i>
    </button>
    <button class="btn btn-icon btn-edit"   data-id="${t.id}" title="Editar" aria-label="Editar">
      <i class="fas fa-pen" aria-hidden="true"></i>
    </button>
    <button class="btn btn-icon btn-delete" data-id="${t.id}" title="Excluir" aria-label="Excluir">
      <i class="fas fa-trash" aria-hidden="true"></i>
    </button>
  </div>
</td>
      `;
            $tbody.appendChild(tr);

            const trDet = document.createElement("tr");
            trDet.id = `det-${t.id}`;
            trDet.hidden = true;
            trDet.innerHTML = `
        <td colspan="9">
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <div><strong>Período:</strong> ${fmtBR(t.data_inicio)} – ${fmtBR(t.data_fim)}</div>
            <div><strong>Curso:</strong> ${mapCurso.get(toHexId(t.id_curso)) || "—"}</div>
            <div><strong>Empresa:</strong> ${getEmpresaNome(t.id_empresa)}</div>
            <div><strong>Status:</strong> ${statusToText(t.status)}</div>
          </div>
        </td>`;
            $tbody.appendChild(trDet);
        });

        // Eventos das linhas
        $tbody.querySelectorAll(".btn-collapse").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                const row = ev.currentTarget.closest("tr");
                const det = row?.nextElementSibling;
                if (!det) return;
                const expanded = det.hidden === false;
                det.hidden = !det.hidden;
                ev.currentTarget.setAttribute("aria-expanded", String(!expanded));
                ev.currentTarget.textContent = expanded ? "+" : "–";
            });
        });

    }

    function renderPager(page, pageSize, total) {
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        state.page = Math.min(state.page, totalPages);

        const start = total === 0 ? 0 : ((state.page - 1) * pageSize + 1);
        const end = Math.min(state.page * pageSize, total);
        if ($rangeInfo) $rangeInfo.textContent = `Mostrando ${start}–${end} de ${total}`;

        if (!$pager) return;
        $pager.innerHTML = "";
        const addBtn = (label, pageTarget, disabled = false, active = false) => {
            const li = document.createElement("li");
            const a = document.createElement("button");
            a.textContent = label;
            a.className = "btn btn-secondary";
            a.disabled = disabled || active;
            a.addEventListener("click", () => { state.page = pageTarget; update(); });
            li.appendChild(a);
            $pager.appendChild(li);
        };
        addBtn("«", 1, state.page === 1);
        addBtn("‹", Math.max(1, state.page - 1), state.page === 1);

        const win = 2;
        const from = Math.max(1, state.page - win);
        const to = Math.min(totalPages, state.page + win);
        for (let p = from; p <= to; p++) addBtn(String(p), p, false, p === state.page);

        addBtn("›", Math.min(totalPages, state.page + 1), state.page === totalPages);
        addBtn("»", totalPages, state.page === totalPages);
    }

    function applySortIndicators() {
        document.querySelectorAll(".data-table thead th[data-sort]").forEach(th => {
            const key = th.dataset.sort;
            let val = "none";
            if (key === state.sort_by) val = state.sort_dir === "asc" ? "ascending" : "descending";
            th.setAttribute("aria-sort", val);
            th.style.cursor = "pointer";
        });
    }

    async function update() {
        pushQuery();
        try {
            const data = await fetchTurmasServer();
            renderRows(data.items || []);
            renderPager(data.page || 1, data.page_size || state.page_size, data.total || 0);
            applySortIndicators();
        } catch (e) {
            console.error(e);
            toast("Não foi possível carregar as turmas. Tente novamente.");
        }
    }

    // Eventos filtros/ordenação
    if ($q) $q.addEventListener("input", debounce(() => { state.q = $q.value.trim(); state.page = 1; update(); }, 350));
    if ($fCurso) $fCurso.addEventListener("change", () => { state.id_curso = $fCurso.value; state.page = 1; update(); });
    if ($fTurno) $fTurno.addEventListener("change", () => { state.turno = $fTurno.value; state.page = 1; update(); });
    if ($fInicio) $fInicio.addEventListener("change", () => { state.inicio = $fInicio.value; state.page = 1; update(); });
    if ($fFim) $fFim.addEventListener("change", () => { state.fim = $fFim.value; state.page = 1; update(); });
    if ($pageSz) $pageSz.addEventListener("change", () => { state.page_size = Number($pageSz.value || 25); state.page = 1; update(); });
    if ($btnLimpar) $btnLimpar.addEventListener("click", () => {
        state.page = 1; state.q = ""; state.id_curso = ""; state.turno = ""; state.inicio = ""; state.fim = "";
        if ($q) $q.value = ""; if ($fCurso) $fCurso.value = ""; if ($fTurno) $fTurno.value = "";
        if ($fInicio) $fInicio.value = ""; if ($fFim) $fFim.value = "";
        update();
    });

    document.querySelectorAll(".data-table thead th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (state.sort_by === key) state.sort_dir = state.sort_dir === "asc" ? "desc" : "asc";
            else { state.sort_by = key; state.sort_dir = "asc"; }
            state.page = 1;
            update();
        });
    });

    function initSortDefaultFromHeader() {
        const thAsc = document.querySelector('.data-table thead th[aria-sort="ascending"]');
        if (thAsc && thAsc.dataset.sort) { state.sort_by = thAsc.dataset.sort; state.sort_dir = "asc"; }
    }

    // ---------- Detalhes no Step 3 (somente leitura) ----------
    let currentStep = 1;
    const totalSteps = 3;

    function updateFormStep() {
        if (!formSteps.length) return;
        formSteps.forEach((el, i) => el.classList.toggle("active", i + 1 === currentStep));
        stepItems.forEach((step, i) => {
            step.classList.toggle("active", i < currentStep);
            step.classList.toggle("completed", i < currentStep - 1);
        });
        if (prevBtn) prevBtn.style.display = currentStep === 1 ? "none" : "";
        if (cancelFormBtn) cancelFormBtn.style.display = currentStep === 1 ? "" : "none";
        if (nextBtn) nextBtn.textContent = currentStep === totalSteps ? "Salvar" : "Próximo";
    }
    function toggleStep3Readonly(isReadonly) {
        const step3 = formSteps[2]; if (!step3) return;
        step3.querySelectorAll("input, select, textarea").forEach(el => {
            if (["INPUT", "TEXTAREA"].includes(el.tagName)) el.readOnly = !!isReadonly;
            el.disabled = !!isReadonly;
        });
    }
    function enterDetailsMode() {
        if (!turmaFormModal) return;
        turmaFormModal.dataset.detailsMode = "1";
        currentStep = 3;
        updateFormStep();
        stepItems.forEach(el => el.style.display = "none");
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
        if (cancelFormBtn) cancelFormBtn.style.display = "none";
        toggleStep3Readonly(true);
    }
    function exitDetailsMode() {
        if (!turmaFormModal) return;
        turmaFormModal.dataset.detailsMode = "0";
        stepItems.forEach(el => el.style.display = "");
        toggleStep3Readonly(false);
        currentStep = 1;
        updateFormStep();
    }
    function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = (val ?? ""); }
    function getById(list, id) { const hex = toHexId(id); return list.find(x => toHexId(x._id) === hex); }
    function openTurmaDetails(id) {
        const t = turmasPageCache.find(x => String(x.id) === String(id));
        if (!t) { alert("Turma não encontrada."); return; }

        const curso = getById(dadosCursos, t.id_curso || t.idCurso);
        const inst = getById(dadosInstituicoes, t.id_instituicao || t.instituicao);
        const cal = getById(dadosCalendarios, t.id_calendario || t.calendario);
        const emp = getById(dadosEmpresas, t.id_empresa || t.empresa);

        setVal("codigoTurmaConf", t.codigo ?? "");
        setVal("cursoConf", curso?.nome ?? "");
        setVal("categoriaConf", curso?.categoria ?? "");
        setVal("modalidadeConf", curso?.nivel_curso ?? "");
        setVal("tipoConf", curso?.tipo ?? "");
        setVal("cargaHorariaConf", curso?.carga_horaria ?? "");
        setVal("eixoTecConf", curso?.eixo_tecnologico ?? "");

        setVal("dataInicioConf", t.data_inicio ?? "");
        setVal("dataFimConf", t.data_fim ?? "");
        setVal("turnoConf", t.turno ?? "");
        setVal("numAlunosConf", t.num_alunos ?? "");

        setVal("instituicaoConf", inst?.razao_social ?? "");
        setVal("calendarioConf", cal?.nome_calendario ?? "");
        setVal("empresaConf", emp?.razao_social ?? "");

        enterDetailsMode();
        if (turmaFormModal) { turmaFormModal.style.display = "flex"; document.body.classList.add("modal-open"); }
    }

    function clearForm() {
        const ids = ["codigoTurma", "curso", "dataInicio", "dataFim", "turno", "numAlunos", "instituicao", "calendario", "empresa"];
        ids.forEach(id => { const el = document.getElementById(id); if (!el) return; if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = ""; });
    }
    if (addTurmaBtn) addTurmaBtn.addEventListener("click", () => {
        currentStep = 1; clearForm(); updateFormStep();
        if (turmaFormModal) { turmaFormModal.style.display = "flex"; document.body.classList.add("modal-open"); }
    });
    function closeTurmaModal() {
        if (!turmaFormModal) return;
        turmaFormModal.style.display = "none";
        document.body.classList.remove("modal-open");
        if (turmaFormModal.dataset.detailsMode === "1") exitDetailsMode();
    }
    if (closeFormModalBtn) closeFormModalBtn.onclick = closeTurmaModal;
    if (cancelFormBtn) cancelFormBtn.onclick = closeTurmaModal;

    if (nextBtn) nextBtn.onclick = () => {
        if (currentStep < totalSteps) {
            currentStep++; updateFormStep();
            if (currentStep === 3) fillStep3();
        } else {
            if (turmaFormModal) turmaFormModal.style.display = "none";
            openUcModal();
        }
    };
    if (prevBtn) prevBtn.onclick = () => { if (currentStep > 1) { currentStep--; updateFormStep(); } };

    function fillStep3() {
        const cursoSel = document.getElementById("curso")?.value;
        document.getElementById("codigoTurmaConf")?.setAttribute("value", document.getElementById("codigoTurma")?.value ?? "");

        const curso = dadosCursos.find(c => toHexId(c._id) === toHexId(cursoSel));
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
        set("cursoConf", curso?.nome);
        set("categoriaConf", curso?.categoria);
        set("modalidadeConf", curso?.nivel_curso);
        set("tipoConf", curso?.tipo);
        set("cargaHorariaConf", curso?.carga_horaria);
        set("eixoTecConf", curso?.eixo_tecnologico);

        set("dataInicioConf", document.getElementById("dataInicio")?.value);
        set("dataFimConf", document.getElementById("dataFim")?.value);
        set("turnoConf", document.getElementById("turno")?.value);
        set("numAlunosConf", document.getElementById("numAlunos")?.value);

        const instSel = document.getElementById("instituicao")?.value;
        const calSel = document.getElementById("calendario")?.value;
        const empSel = document.getElementById("empresa")?.value;

        const inst = dadosInstituicoes.find(i => toHexId(i._id) === toHexId(instSel));
        const cal = dadosCalendarios.find(c => toHexId(c._id) === toHexId(calSel));
        const emp = dadosEmpresas.find(e => toHexId(e._id) === toHexId(empSel));

        set("instituicaoConf", inst?.razao_social);
        set("calendarioConf", cal?.nome_calendario);
        set("empresaConf", emp?.razao_social);
    }

    // ---------- Modal de UCs (sem alterações estruturais) ----------
    const ucModal = document.getElementById("ucModal");
    const closeUcModalBtn = document.getElementById("closeUcModalBtn");
    const cancelUcBtn = document.getElementById("cancelUcBtn");
    const saveUcBtn = document.getElementById("saveUcBtn");
    const ucRowsContainer = document.getElementById("uc-rows-container");
    const addUcBtn = document.getElementById("addUcBtn");

    let ucList = [];
    function ordinalNumber(n) { return `${n}°`; }
    function updateAllUcOrdinals() { ucRowsContainer?.querySelectorAll(".uc-ordinal-label").forEach((l, i) => l.textContent = ordinalNumber(i + 1)); }
    function openUcModal() {
        if (!ucModal) return;
        ucRowsContainer.innerHTML = "";
        ucList = [];
        addUcRow();
        ucModal.style.display = "flex"; // só isso
        document.body.classList.add("modal-open");
    }
    function closeUcModal() { if (!ucModal) return; if (confirm("Cancelar irá perder o cadastro das UCs. Deseja continuar?")) { ucModal.style.display = "none"; document.body.classList.remove("modal-open"); } }
    if (addUcBtn) addUcBtn.classList.add("btn", "btn-primary");
    if (closeUcModalBtn) closeUcModalBtn.onclick = closeUcModal;
    if (cancelUcBtn) cancelUcBtn.onclick = closeUcModal;
    if (addUcBtn) addUcBtn.onclick = () => addUcRow();

    function addUcRow() {
        if (!ucRowsContainer) return;
        const acc = document.createElement("div");
        acc.className = "uc-accordion open";
        const cursoId = document.getElementById("curso")?.value;
        const curso = dadosCursos.find(c => toHexId(c._id) === toHexId(cursoId));
        let ucOptions = "";
        if (curso && Array.isArray(curso.ordem_ucs)) {
            ucOptions = curso.ordem_ucs.map(uc => `<option value="${toHexId(uc.id)}">${uc.unidade_curricular}</option>`).join("");
        }
        acc.innerHTML = `
      <div style="display:flex;align-items:center;">
        <strong class="uc-ordinal-label" style="margin-right:10px;font-size:1.1em;"></strong>
        <div class="uc-accordion-header open" style="flex:1;">
          <span class="uc-title">Selecione uma unidade curricular</span>
          <i class="fas fa-chevron-right"></i>
        </div>
        <button type="button" class="uc-remove-btn btn-add-remove btn-remove-uc" title="Remover Unidade Curricular">
          <i class="fas fa-minus"></i>
        </button>
      </div>
      <div class="uc-accordion-content">
        <div class="form-group">
          <label>UC</label>
          <select class="uc-select" required>
            <option value="">Selecione</option>
            ${ucOptions}
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <div class="form-group" style="flex:1;"><label>Carga horária Presencial</label><input class="uc-presencial-ch" type="number" disabled></div>
          <div class="form-group" style="flex:1;"><label>Quantidade de Aulas Presencial</label><input class="uc-presencial-aulas" type="number" disabled></div>
          <div class="form-group" style="flex:1;"><label>Quantidade de Dias Presencial</label><input class="uc-presencial-dias" type="number" disabled></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <div class="form-group" style="flex:1;"><label>Carga horária EAD</label><input class="uc-ead-ch" type="number" disabled></div>
          <div class="form-group" style="flex:1;"><label>Quantidade de Aulas EAD</label><input class="uc-ead-aulas" type="number" disabled></div>
          <div class="form-group" style="flex:1;"><label>Quantidade de Dias EAD</label><input class="uc-ead-dias" type="number" disabled></div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <label>Instrutor</label>
          <select class="uc-instrutor" required>
            <option value="">Selecione</option>
            ${dadosInstrutores.map(ins => `<option value="${toHexId(ins._id)}">${ins.nome}</option>`).join("")}
          </select>
        </div>
        <div class="form-row" style="display:flex;gap:8px;">
          <div class="form-group" style="flex:1;"><label>Data Início</label><input type="date" class="uc-data-inicio" required></div>
          <div class="form-group" style="flex:1;"><label>Data Término</label><input type="date" class="uc-data-fim" required></div>
        </div>
      </div>`;
        ucRowsContainer.appendChild(acc); ucList.push({}); updateAllUcOrdinals();

        acc.querySelector(".uc-accordion-header").onclick = (e) => { if (e.target.closest(".uc-remove-btn")) return; acc.classList.toggle("open"); };
        acc.querySelector(".uc-remove-btn").onclick = () => { if (ucRowsContainer.childElementCount > 1) { const idx = [...ucRowsContainer.children].indexOf(acc); acc.remove(); if (idx >= 0) ucList.splice(idx, 1); updateAllUcOrdinals(); } else { alert("Deve ter pelo menos uma UC na turma."); } };
        acc.querySelector(".uc-select").onchange = function () {
            const ucId = toHexId(this.value);
            const cursoId = document.getElementById("curso")?.value;
            const curso = dadosCursos.find(c => toHexId(c._id) === toHexId(cursoId));
            const foundUc = (curso && Array.isArray(curso.ordem_ucs)) ? curso.ordem_ucs.find(ucObj => toHexId(ucObj.id) === ucId) : null;
            acc.querySelector(".uc-title").textContent = foundUc ? foundUc.unidade_curricular : "Selecione uma unidade curricular";
            const p = foundUc?.presencial || {}, e = foundUc?.ead || {};
            acc.querySelector(".uc-presencial-ch").value = (p.carga_horaria ?? p.cargaHoraria ?? "");
            acc.querySelector(".uc-presencial-aulas").value = (p.quantidade_aulas_45min ?? p.aulas45 ?? "");
            acc.querySelector(".uc-presencial-dias").value = (p.dias_letivos ?? p.dias ?? "");
            acc.querySelector(".uc-ead-ch").value = (e.carga_horaria ?? e.cargaHoraria ?? "");
            acc.querySelector(".uc-ead-aulas").value = (e.quantidade_aulas_45min ?? e.aulas45 ?? "");
            acc.querySelector(".uc-ead-dias").value = (e.dias_letivos ?? e.dias ?? "");
        };
    }

    // ---------- Payload/Salvar (status default true) ----------
    function buildTurmaPayload(arrUC) {
        return {
            codigo: document.getElementById("codigoTurma")?.value.trim(),
            id_curso: toHexId(document.getElementById("curso")?.value),
            data_inicio: document.getElementById("dataInicio")?.value,
            data_fim: document.getElementById("dataFim")?.value,
            turno: document.getElementById("turno")?.value,
            num_alunos: parseInt(document.getElementById("numAlunos")?.value ?? "", 10),
            id_instituicao: toHexId(document.getElementById("instituicao")?.value),
            id_calendario: toHexId(document.getElementById("calendario")?.value),
            id_empresa: toHexId(document.getElementById("empresa")?.value),
            status: true, // <<< NOVO: toda nova turma nasce ativa
            unidades_curriculares: arrUC.map(uc => ({
                id_uc: toHexId(uc.uc),
                id_instrutor: toHexId(uc.instrutor),
                data_inicio: uc.data_inicio,
                data_fim: uc.data_fim
            }))
        };
    }
    async function salvarTurmaNoBackend(payload) {
        const r = await fetch(URL_SALVAR_TURMA, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data };
    }
    if (saveUcBtn) {
        saveUcBtn.onclick = async function () {
            let ok = true; const arrUC = [];
            ucRowsContainer?.querySelectorAll(".uc-accordion").forEach(acc => {
                const selectUc = acc.querySelector(".uc-select");
                const instrutor = acc.querySelector(".uc-instrutor");
                const dataIni = acc.querySelector(".uc-data-inicio");
                const dataFim = acc.querySelector(".uc-data-fim");
                if (!selectUc.value || !instrutor.value || !dataIni.value || !dataFim.value) ok = false;
                arrUC.push({ uc: selectUc.value, instrutor: instrutor.value, data_inicio: dataIni.value, data_fim: dataFim.value });
            });
            if (!ok || arrUC.length === 0) { alert("Preencha todas as informações obrigatórias para cada UC."); return; }
            const payload = buildTurmaPayload(arrUC);
            if (!payload.codigo || !payload.id_curso || !payload.data_inicio || !payload.data_fim ||
                !payload.turno || !payload.num_alunos || !payload.id_instituicao ||
                !payload.id_calendario || !payload.id_empresa) {
                alert("Há campos obrigatórios da turma sem preenchimento."); return;
            }
            try {
                const resp = await salvarTurmaNoBackend(payload);
                if (resp.data && resp.data.success) {
                    alert("Turma e Unidades Curriculares cadastradas com sucesso!");
                    if (ucModal) { ucModal.style.display = "none"; document.body.classList.remove("modal-open"); }
                    await update();
                } else {
                    const msg = (resp.data && (resp.data.error || resp.data.detail)) || "Erro ao salvar turma.";
                    console.error("Erro salvar:", resp); alert(`Falha ao salvar: ${msg}`);
                }
            } catch (err) {
                console.error("Exceção no salvar:", err);
                alert("Erro inesperado ao salvar turma. Verifique o console e o backend.");
            }
        };
    }

    // Delegação: sem botão "UCs" (removido)
    if ($tbody) $tbody.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button"); if (!btn) return;
        const id = btn.dataset.id; if (!id) return;

        if (btn.classList.contains("btn-det-turma")) {
            // antes: openTurmaDetails(id);
            openTurmaViewModalById(id); // << agora abre o modal somente texto
        }
    });

    // ---------- Inicialização ----------
    function initSortDefaultFromHeader() {
        const thAsc = document.querySelector('.data-table thead th[aria-sort="ascending"]');
        if (thAsc && thAsc.dataset.sort) { state.sort_by = thAsc.dataset.sort; state.sort_dir = "asc"; }
    }
    loadFromQuery();
    initSortDefaultFromHeader();
    await update();
    // ===== Modal de visualização (somente texto) =====
    const turmaViewModal = document.getElementById("turmaViewModal");
    const closeTurmaViewBtn = document.getElementById("closeTurmaViewBtn");

    function statusToText(v) { return v === false ? "Inativo" : "Ativo"; }
    function fmtBR(iso) { if (!iso) return "—"; const d = iso.slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso; }

    // Helpers p/ nomes (usam arrays já carregados no início do app)
    function getCursoNome(id) {
        const hex = toHexId(id);
        const c = dadosCursos.find(x => toHexId(x._id) === hex);
        return c?.nome || "—";
    }
    function getInstituicaoNome(id) {
        const hex = toHexId(id);
        const i = dadosInstituicoes.find(x => toHexId(x._id) === hex);
        return i?.razao_social || "—";
    }
    function getCalendarioNome(id) {
        const hex = toHexId(id);
        const c = dadosCalendarios.find(x => toHexId(x._id) === hex);
        return c?.nome_calendario || "—";
    }
    // Empresa já temos como getEmpresaNome(id)

    async function fetchTurmaById(id) {
        const r = await fetch(`${URL_API}/turmas/${id}`);
        if (!r.ok) throw new Error(`Falha ao buscar turma ${id}: ${r.status}`);
        return r.json();
    }

    function fillViewModalFromTurma(t) {
        // Campos de destino
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = (val ?? "—"); };

        set("vwCodigo", t.codigo);
        set("vwCurso", getCursoNome(t.id_curso));
        set("vwInicio", fmtBR(t.data_inicio));
        set("vwFim", fmtBR(t.data_fim));
        set("vwTurno", t.turno || "—");
        set("vwNumAlunos", (t.num_alunos ?? "—"));
        set("vwInstituicao", getInstituicaoNome(t.id_instituicao));
        set("vwCalendario", getCalendarioNome(t.id_calendario));
        set("vwEmpresa", getEmpresaNome(t.id_empresa));
        set("vwStatus", statusToText(t.status));
    }

    async function openTurmaViewModalById(id) {
        try {
            // Busca direto no backend para garantir dados atualizados
            const t = await fetchTurmaById(id);
            fillViewModalFromTurma(t);
            turmaViewModal.style.display = "flex";
            document.body.classList.add("modal-open");
        } catch (e) {
            console.error(e);
            alert("Não foi possível carregar os detalhes da turma.");
        }
    }
    function closeTurmaViewModal() {
        turmaViewModal.style.display = "none";
        document.body.classList.remove("modal-open");
    }
    if (closeTurmaViewBtn) closeTurmaViewBtn.onclick = closeTurmaViewModal;

});
