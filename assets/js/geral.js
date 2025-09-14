// geral.js (consolidado)
(() => {
  'use strict';

  // Exposição global mínima
  const App = (window.App = window.App || {});

  // ===================== DOM helpers =====================
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Helper para rodar agora ou quando o DOM estiver pronto
  function runNowOrOnReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  // ===================== Utils =====================
  const debounce = (fn, ms = 350) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const norm = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  function toId(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj._id && typeof obj._id === 'string') return obj._id;
    if (obj._id && typeof obj._id === 'object' && obj._id.$oid) return obj._id.$oid;
    if (obj.id && typeof obj.id === 'string') return obj.id;
    if (obj.$oid) return obj.$oid;
    return String(obj);
  }

  // yyyy-mm-dd -> ISO UTC no início/fim do dia local
  function toIsoStartOfDayLocal(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    return dt.toISOString();
  }
  function toIsoEndOfDayLocal(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
    return dt.toISOString();
  }

  // Comparadores/limites simples de datas (YYYY-MM-DD)
  const dateMax   = (a, b) => (!a ? b : !b ? a : (a > b ? a : b));
  const dateMin   = (a, b) => (!a ? b : !b ? a : (a < b ? a : b));
  const dateClamp = (v, min, max) => {
    if (!v) return v;
    if (min && v < min) return min;
    if (max && v > max) return max;
    return v;
  };

  // ===================== Rede =====================
  async function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal, credentials: opts.credentials ?? 'same-origin' });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetchWithTimeout(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    // tenta JSON, cai pra objeto/array vazio
    return res.json().catch(() => (Array.isArray(options.fallback) ? options.fallback : {}));
  }

  // ===================== Formatadores & datas =====================
  // Trata strings ISO sem offset como UTC.
  function parseIsoAssumindoUtc(v) {
    if (!v) return null;
    let iso = String(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(iso) && !(/[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso))) iso += 'Z';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/aaaa (somente data) — útil para cabeçalhos/tabelas simples
  function fmtBR(yyyy_mm_dd) {
    if (!yyyy_mm_dd) return '';
    const p = String(yyyy_mm_dd).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : yyyy_mm_dd;
  }

  // Data+hora local pt-BR (com fuso configurável)
  function fmtDateTimeBR(input, tz = 'America/Sao_Paulo') {
    if (!input) return '—';
    const d = (input instanceof Date) ? input : parseIsoAssumindoUtc(input) || new Date(input);
    if (isNaN(+d)) return '—';
    try {
      const data = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, dateStyle: 'short' }).format(d);
      const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(d);
      return `${data} ${hora}`;
    } catch { return d.toLocaleString('pt-BR'); }
  }

  // Data+hora local (atalho usado em várias telas)
  function fmtDateBR(input, tz = 'America/Sao_Paulo') {
    return fmtDateTimeBR(input, tz);
  }

  // ObjectId (Mongo) -> Date (criado em)
  const OBJECTID_24 = /^[a-f\d]{24}$/i;
  function oidToDate(id) {
    if (!id) return null;
    const s = String(id);
    if (!OBJECTID_24.test(s)) return null;
    const ts = parseInt(s.slice(0, 8), 16);
    return new Date(ts * 1000);
  }

  // Normaliza status (Ativo/Inativo/—)
  function normalizeStatus(v) {
    if (v === undefined || v === null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Ativo' : 'Inativo';
    const t = String(v).trim().toLowerCase();
    if (t === 'ativo' || t === 'ativa' || t === 'true') return 'Ativo';
    if (t === 'inativo' || t === 'inativa' || t === 'false') return 'Inativo';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ===================== Validações & máscaras =====================
  const FORBIDDEN = /[<>"';{}]/g;
  const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MATRICULA_RE = /^[A-Za-z0-9._-]{3,20}$/;

  const sanitizeSpaces = (s = '') => s.replace(/\s+/g, ' ').trim();
  const onlyDigits     = (s = '') => s.replace(/\D+/g, '');

  function isValidEmail(s = '') { return EMAIL_RE.test(String(s).trim()); }
  function isValidMatricula(s='') { return MATRICULA_RE.test(String(s).trim()); }

  // Máscara amigável de telefone brasileiro
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

  // ===================== Storage simples (LocalStorage JSON) =====================
  function saveJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  }
  function loadJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  // ===================== UI comum =====================
  // 1) Dropdown "Relatórios"
  function initRelatoriosDropdown() {
    const relatoriosLi = document.getElementById('nav-relatorios');
    if (!relatoriosLi) return;

    const toggle = relatoriosLi.querySelector('.submenu-toggle');
    const submenu = relatoriosLi.querySelector('.submenu');
    if (!toggle || !submenu) return;
    if (toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    if (!submenu.id) submenu.id = 'submenu-relatorios';
    if (!toggle.hasAttribute('aria-controls')) {
      toggle.setAttribute('aria-controls', submenu.id);
    }

    toggle.setAttribute('aria-expanded', String(relatoriosLi.classList.contains('open')));
    submenu.setAttribute('aria-hidden', String(!relatoriosLi.classList.contains('open')));

    const doToggle = (e) => {
      e.preventDefault();
      const isOpen = relatoriosLi.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      submenu.setAttribute('aria-hidden', String(!isOpen));

      document.querySelectorAll('.sidebar-nav li.has-submenu.open').forEach(li => {
        if (li !== relatoriosLi) {
          li.classList.remove('open');
          const t  = li.querySelector('.submenu-toggle');
          const sm = li.querySelector('.submenu');
          t  && t.setAttribute('aria-expanded', 'false');
          sm && sm.setAttribute('aria-hidden', 'true');
        }
      });
    };

    toggle.addEventListener('click', doToggle);
    toggle.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') doToggle(ev);
    });

    const current = location.pathname.split('/').pop() || '';
    const isRelatoriosSection = [
      'gestao_relatorios.php',
      'relatorio_disponibilidade_instrutor.php'
    ].includes(current);

    if (isRelatoriosSection) {
      relatoriosLi.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      submenu.setAttribute('aria-hidden', 'false');

      if (current === 'relatorio_disponibilidade_instrutor.php') {
        const link = relatoriosLi.querySelector('.submenu a[href$="relatorio_disponibilidade_instrutor.php"]');
        link && link.classList.add('active');
      }
    }
  }

    function initConfigDropdown() {
    const configLi = document.getElementById('nav-config');
    if (!configLi) return;

    const toggle = configLi.querySelector('.submenu-toggle');
    const submenu = configLi.querySelector('.submenu');
    if (!toggle || !submenu) return;
    if (toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    if (!submenu.id) submenu.id = 'submenu-config';
    if (!toggle.hasAttribute('aria-controls')) {
      toggle.setAttribute('aria-controls', submenu.id);
    }

    toggle.setAttribute('aria-expanded', String(configLi.classList.contains('open')));
    submenu.setAttribute('aria-hidden', String(!configLi.classList.contains('open')));

    const doToggle = (e) => {
      e.preventDefault();
      const isOpen = configLi.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      submenu.setAttribute('aria-hidden', String(!isOpen));

      document.querySelectorAll('.sidebar-nav li.has-submenu.open').forEach(li => {
        if (li !== configLi) {
          li.classList.remove('open');
          const t  = li.querySelector('.submenu-toggle');
          const sm = li.querySelector('.submenu');
          t  && t.setAttribute('aria-expanded', 'false');
          sm && sm.setAttribute('aria-hidden', 'true');
        }
      });
    };

    toggle.addEventListener('click', doToggle);
    toggle.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') doToggle(ev);
    });

    const current = location.pathname.split('/').pop() || '';
    const isConfigSection = [
      'configuracao.php',
      'configuracao_usuarios.php'
    ].includes(current);

    if (isConfigSection) {
      configLi.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      submenu.setAttribute('aria-hidden', 'false');

      if (current === 'configuracao_usuarios.php') {
        const link = configLi.querySelector('.submenu a[href$="configuracao_usuarios.php"]');
        link && link.classList.add('active');
      }
    }
  }

  // 2) Hamburger da sidebar (se existir na view)
  function initSidebarHamburger() {
    const menuToggle = $('#menu-toggle');
    const sidebar = $('.sidebar');
    const dashboardContainer = $('.dashboard-container');
    if (!menuToggle || !sidebar || !dashboardContainer) return;
    if (menuToggle.dataset.wired === '1') return;
    menuToggle.dataset.wired = '1';

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

  // 3) Fechar qualquer modal ao clicar no overlay (classe .modal)
  function enableModalOverlayClose() {
    if (window.__overlayCloseWired) return;
    window.__overlayCloseWired = true;

    window.addEventListener('click', (ev) => {
      const el = ev.target;
      if (el?.classList?.contains('modal')) {
        el.style.display = 'none';
      }
    });
  }

  // 4) Helpers genéricos de modal (show/hide)
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

  // 5) Validação de intervalo de datas (genérica)
  function attachDateRangeValidation({ formId, startId, endId, fieldNames = { start: 'Início', end: 'Fim' } }) {
    const form = document.getElementById(formId);
    const startEl = document.getElementById(startId);
    const endEl = document.getElementById(endId);
    if (!form || !startEl || !endEl) return;

    const validate = () => {
      if (startEl.value) endEl.min = startEl.value;
      if (!startEl.value || !endEl.value) { endEl.setCustomValidity(''); return; }
      if (endEl.value < startEl.value) {
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
        form.reportValidity();
      }
    });
    validate();
  }

  // 6) Botão genérico "Limpar filtros"
  /**
   * App.ui.setupClearFilters({
   *   buttonSelector: '#btnClearFilters',
   *   getFiltersState: () => STATE.filters,
   *   resetUI: () => { /* zere inputs da UI aqui *\/ },
   *   onClear: async () => { /* recarregue a lista/tabela aqui *\/ }
   * })
   */
  // 6) Botão genérico "Limpar filtros"
function setupClearFilters({
  buttonSelector = '#btnClearFilters',
  getFiltersState,
  resetUI,
  onClear,
  watchSelectors // <- NOVO: seletores de campos que devem disparar update
} = {}) {
  const btn = document.querySelector(buttonSelector);
  if (!btn) return;

  if (btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';

  // container padrão (retrocompatível)
  const container =
    btn.closest('.filter-section') ||
    btn.closest('.table-section') ||
    document.body;

  function hasAnyFilter(state) {
    if (!state || typeof state !== 'object') return false;
    for (const k of Object.keys(state)) {
      const v = state[k];
      if (v == null) continue;
      if (typeof v === 'string' && v.trim() !== '') return true;
      if (Array.isArray(v) && v.some(x => (typeof x === 'string' ? x.trim() !== '' : x != null))) return true;
      if (typeof v === 'number' && !Number.isNaN(v) && v !== 0) return true;
      if (typeof v === 'boolean' && v) return true;
      if (typeof v === 'object' && Object.keys(v).length > 0) return true;
    }
    return false;
  }

  const updateBtn = () => {
    const state = (typeof getFiltersState === 'function') ? (getFiltersState() || {}) : {};
    const active = hasAnyFilter(state);

    // Se for <button>, dá para usar disabled nativo
    if (btn.tagName === 'BUTTON') {
      btn.disabled = !active;
    }
    btn.setAttribute('aria-disabled', String(!active));
    btn.classList.toggle('is-disabled', !active);
  };

  const debouncedUpdate = App.utils?.debounce ? App.utils.debounce(updateBtn, 120) : updateBtn;

  // 1) Listeners pelo container (retrocompatível)
  container.addEventListener('input', debouncedUpdate, { passive: true });
  container.addEventListener('change', debouncedUpdate, { passive: true });

  // 2) Listeners diretos nos campos informados (NOVO e decisivo no seu caso)
  if (Array.isArray(watchSelectors) && watchSelectors.length) {
    watchSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.addEventListener('input', debouncedUpdate, { passive: true });
        el.addEventListener('change', debouncedUpdate, { passive: true });
      });
    });
  }

  btn.addEventListener('click', async () => {
    // respeita disabled nativo ou aria
    const isDisabled = (btn.tagName === 'BUTTON') ? btn.disabled : (btn.getAttribute('aria-disabled') === 'true');
    if (isDisabled) return;

    btn.setAttribute('aria-busy', 'true');
    try {
      if (typeof resetUI === 'function') await resetUI();
      if (typeof onClear === 'function')  await onClear();
    } catch (e) {
      console.error('[setupClearFilters] onClear/resetUI error:', e);
    } finally {
      btn.removeAttribute('aria-busy');
      updateBtn();
    }
  });

  updateBtn();
  btn._updateClearFiltersBtn = updateBtn;
  return { update: updateBtn };
}


  // 7) Paginação simples: atualiza texto e estado dos botões
  /**
   * App.ui.bindSimplePagination({
   *   prevSelector:'#prevPage', nextSelector:'#nextPage', infoSelector:'#pageInfo',
   *   getState: () => ({ page, pageSize, total }),
   *   onChange: (newPage) => { ...carregar... }
   * })
   */
  function bindSimplePagination({ prevSelector, nextSelector, infoSelector, getState, onChange }) {
    const prev = $(prevSelector);
    const next = $(nextSelector);
    const info = $(infoSelector);

    function update() {
      const { page = 1, pageSize = 10, total = 0 } = (getState?.() || {});
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
      if (info) info.textContent = `Página ${page} de ${totalPages} • ${total} registros`;
      if (prev) { prev.disabled = page <= 1; prev.setAttribute('aria-disabled', String(prev.disabled)); }
      if (next) { next.disabled = page >= totalPages; next.setAttribute('aria-disabled', String(next.disabled)); }
    }

    prev?.addEventListener('click', () => {
      const { page = 1 } = (getState?.() || {});
      if (page > 1) onChange?.(page - 1);
    });
    next?.addEventListener('click', () => {
      const { page = 1, pageSize = 10, total = 0 } = (getState?.() || {});
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
      if (page < totalPages) onChange?.(page + 1);
    });

    // devolve updater para a view chamar após recarregar dados
    return { update };
  }

  // ===================== Export =====================
  App.dom   = { $, $$, runNowOrOnReady };
  App.utils = {
    debounce, norm, toId,
    toIsoStartOfDayLocal, toIsoEndOfDayLocal,
    dateMax, dateMin, dateClamp,
    sanitizeSpaces
  };
  App.net   = { fetchJSON, safeFetch: fetchJSON, fetchWithTimeout };
  App.format = {
    fmtBR, fmtDateBR, fmtDateTimeBR,
    parseIsoAssumindoUtc,
    oidToDate,
    normalizeStatus
  };
  App.validators = {
    FORBIDDEN, EMAIL_RE, MATRICULA_RE,
    isValidEmail, isValidMatricula,
    onlyDigits, maskPhone
  };
  App.store = { saveJSON, loadJSON };
  App.ui    = {
    initRelatoriosDropdown,
    initSidebarHamburger,
    initConfigDropdown,
    enableModalOverlayClose,
    attachDateRangeValidation,
    setupClearFilters,
    bindSimplePagination,
    showModal, hideModal
  };

  // ===================== Auto-init básico =====================
  runNowOrOnReady(() => {
    App.ui.initRelatoriosDropdown();
    App.ui.initSidebarHamburger();
    App.ui.initConfigDropdown();
    App.ui.enableModalOverlayClose();
  });

})();
