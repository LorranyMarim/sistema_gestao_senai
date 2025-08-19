// geral.js
(() => {
  'use strict';

  // Exposição global mínima
  const App = (window.App = window.App || {});

  // ===================== DOM helpers =====================
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

  // ===================== Rede =====================
  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || res.statusText);
    }
    // tenta JSON, cai pra objeto vazio
    return res.json().catch(() => ({}));
  }

  // ===================== UI comum =====================
  // 1) Dropdown "Relatórios"
  function initRelatoriosDropdown() {
    const relatoriosLi = document.getElementById('nav-relatorios');
    if (!relatoriosLi) return;

    const toggle = relatoriosLi.querySelector('.submenu-toggle');
    const submenu = relatoriosLi.querySelector('.submenu');
    if (!toggle || !submenu) return;

    // Evita bind duplicado se a função for chamada mais de uma vez
    if (toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    // Garante acessibilidade: aria-controls e ids coerentes
    if (!submenu.id) submenu.id = 'submenu-relatorios';
    if (!toggle.hasAttribute('aria-controls')) {
      toggle.setAttribute('aria-controls', submenu.id);
    }

    // estado inicial coerente
    toggle.setAttribute('aria-expanded', String(relatoriosLi.classList.contains('open')));
    submenu.setAttribute('aria-hidden', String(!relatoriosLi.classList.contains('open')));

    const doToggle = (e) => {
      e.preventDefault();
      const isOpen = relatoriosLi.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      submenu.setAttribute('aria-hidden', String(!isOpen));

      // fecha outros submenus abertos
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

    // clique
    toggle.addEventListener('click', doToggle);
    // teclado (Enter/Espaço)
    toggle.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') doToggle(ev);
    });

    // Abre automaticamente se estiver em uma página da seção
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

  // 2) Hamburger da sidebar (se existir na view)
  function initSidebarHamburger() {
    const menuToggle = $('#menu-toggle');
    const sidebar = $('.sidebar');
    const dashboardContainer = $('.dashboard-container');
    if (!menuToggle || !sidebar || !dashboardContainer) return;

    // evita binds duplicados
    if (menuToggle.dataset.wired === '1') return;
    menuToggle.dataset.wired = '1';

    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      dashboardContainer.classList.toggle('sidebar-active');
    });

    // fecha se clicar fora
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

  // 4) Validação de intervalo de datas (genérica)
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

  // 5) Botão genérico "Limpar filtros" (centralizado aqui para reuso entre views)
  /**
   * App.ui.setupClearFilters({
   *   buttonSelector: '#btnClearFilters',            // CSS selector do botão
   *   getFiltersState: () => STATE.filters,          // função que retorna o estado atual dos filtros
   *   resetUI: () => { /* zere inputs da UI aqui *\/ },
   *   onClear: async () => { /* recarregue a lista/tabela aqui *\/ }
   * })
   */
  function setupClearFilters({ buttonSelector = '#btnClearFilters', getFiltersState, resetUI, onClear } = {}) {
    const btn = $(buttonSelector);
    if (!btn) return;

    // evita bind duplicado
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';

    // container de escuta: prioriza a filter-section; senão table-section; senão body
    const container =
      btn.closest('.filter-section') ||
      btn.closest('.table-section') ||
      document.body;

    // Função: checa se há algum filtro aplicado (string não vazia, array com items, obj com chaves, boolean true, número não zero)
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

    // Atualiza estado visual do botão
    const updateBtn = () => {
      const state = (typeof getFiltersState === 'function') ? (getFiltersState() || {}) : {};
      const active = hasAnyFilter(state);
      btn.disabled = !active;
      btn.setAttribute('aria-disabled', String(!active));
      // classe auxiliar opcional (caso o CSS queira estilizar o estado)
      btn.classList.toggle('is-disabled', !active);
    };

    // Observa mudanças dos campos de filtro dentro do container (input/change)
    const debouncedUpdate = debounce(updateBtn, 120);
    container.addEventListener('input', debouncedUpdate, { passive: true });
    container.addEventListener('change', debouncedUpdate, { passive: true });

    // Clique do botão
    btn.addEventListener('click', async () => {
      // evita ação quando desabilitado
      if (btn.disabled) return;

      // feedback acessibilidade
      btn.setAttribute('aria-busy', 'true');

      try {
        if (typeof resetUI === 'function') await resetUI();
        if (typeof onClear === 'function')  await onClear();
      } catch (e) {
        console.error('[setupClearFilters] onClear/resetUI error:', e);
      } finally {
        btn.removeAttribute('aria-busy');
        // Depois de limpar, o botão volta a ficar desabilitado
        updateBtn();
      }
    });

    // primeira avaliação
    updateBtn();

    // expõe util para chamadas externas (opcional)
    btn._updateClearFiltersBtn = updateBtn;
    return { update: updateBtn };
  }

  // ===================== Export & Auto-init =====================
  App.dom   = { $, $$ };
  App.utils = { debounce, norm, toId, toIsoStartOfDayLocal, toIsoEndOfDayLocal };
  App.net   = { fetchJSON, safeFetch: fetchJSON };
  App.ui    = {
    initRelatoriosDropdown,
    initSidebarHamburger,
    enableModalOverlayClose,
    attachDateRangeValidation,
    setupClearFilters, // << export do botão genérico
  };

  // Helper: roda agora se o DOM já está pronto; senão espera o DOMContentLoaded
  function runNowOrOnReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  runNowOrOnReady(() => {
    App.ui.initRelatoriosDropdown();
    App.ui.initSidebarHamburger();
    App.ui.enableModalOverlayClose();
  });
})();
