(() => {
  'use strict';

  const App = (window.App = window.App || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function runNowOrOnReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

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

  const dateMax = (a, b) => (!a ? b : !b ? a : (a > b ? a : b));
  const dateMin = (a, b) => (!a ? b : !b ? a : (a < b ? a : b));
  const dateClamp = (v, min, max) => {
    if (!v) return v;
    if (min && v < min) return min;
    if (max && v > max) return max;
    return v;
  };

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
    // 1. Monitoramento de Conectividade: Bloqueia antes de tentar
    if (!navigator.onLine) {
        alert("Você está offline. Verifique sua conexão antes de continuar.");
        throw new Error("Sem conexão com a internet.");
    }

    try {
        // Mantém a chamada original com timeout
        const res = await fetchWithTimeout(url, options);
        
        // 2. Interceptador de Sessão Expirada (401)
        if (res.status === 401) {
            console.warn("Sessão expirada ou não autorizada. Redirecionando...");
            
            // Detecta se precisa subir um nível (../) ou não, dependendo de onde o script está rodando
            const isView = window.location.pathname.includes('/views/');
            const loginPath = isView ? 'index.php?erro=auth' : 'views/index.php?erro=auth';
            
            window.location.href = loginPath;
            
            // Interrompe o fluxo lançando um erro específico
            throw new Error("Sessão expirada");
        }

        // 3. Tratamento de erro padrão (Lógica Original mantida)
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || res.statusText || `HTTP ${res.status}`);
        }

        // 4. Retorno do JSON com Fallback (Lógica Original mantida)
        return res.json().catch(() => (Array.isArray(options.fallback) ? options.fallback : {}));

    } catch (err) {
        // Se o erro foi lançado pelo nosso interceptador de 401, apenas o repassa
        // para interromper a execução de quem chamou a função.
        throw err;
    }
  }

  function parseIsoAssumindoUtc(v) {
    if (!v) return null;
    let iso = String(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(iso) && !(/[zZ]|[+\-]\d{2}:?\d{2}$/.test(iso))) iso += 'Z';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function fmtBR(yyyy_mm_dd) {
    if (!yyyy_mm_dd) return '';
    const p = String(yyyy_mm_dd).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : yyyy_mm_dd;
  }

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

  function fmtDateBR(input, tz = 'America/Sao_Paulo') {
    if (!input) return '—';
    const d = (input instanceof Date) ? input : parseIsoAssumindoUtc(input) || new Date(input);
    if (isNaN(+d)) return '—';
    try {
     return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, dateStyle: 'short' }).format(d);
    } catch { return d.toLocaleDateString('pt-BR'); }
  }

  const OBJECTID_24 = /^[a-f\d]{24}$/i;
  function oidToDate(id) {
    if (!id) return null;
    const s = String(id);
    if (!OBJECTID_24.test(s)) return null;
    const ts = parseInt(s.slice(0, 8), 16);
    return new Date(ts * 1000);
  }

  function normalizeStatus(v) {
    if (v === undefined || v === null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Ativo' : 'Inativo';
    const t = String(v).trim().toLowerCase();
    if (t === 'ativo' || t === 'ativa' || t === 'true') return 'Ativo';
    if (t === 'inativo' || t === 'inativa' || t === 'false') return 'Inativo';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const FORBIDDEN = /[<>"';{}]/g;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MATRICULA_RE = /^[A-Za-z0-9._-]{3,20}$/;

  const sanitizeSpaces = (s = '') => s.replace(/\s+/g, ' ').trim();
  const onlyDigits = (s = '') => s.replace(/\D+/g, '');

  function isValidEmail(s = '') { return EMAIL_RE.test(String(s).trim()); }
  function isValidMatricula(s = '') { return MATRICULA_RE.test(String(s).trim()); }

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

  function saveJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch { }
  }
  function loadJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function qs(el, sel) { return el.querySelector(sel); }
  function qsa(el, sel) { return Array.from(el.querySelectorAll(sel)); }

  class MultiSelect {
    constructor(root) {
      if (root._msInstance) {
        root._msInstance.refresh();
        return root._msInstance;
      }
      root._msInstance = this;

      this.root = root;
      this.btn = qs(root, ".ms__control");
      this.valueArea = qs(root, ".ms__value");
      this.placeholder = qs(root, ".ms__placeholder");
      this.dropdown = qs(root, ".ms__dropdown");
      this.search = qs(root, ".ms__search-input");
      this.optionsList = qs(root, ".ms__options");
      this.hidden = qs(root, 'input[type="hidden"]');
      this.btnClear = qs(root, ".ms__clear");
      this.btnClose = qs(root, ".ms__close");

      this.checkboxes = qsa(root, '.ms__options input[type="checkbox"]');

      this.isAsync = false;
      this.asyncState = {
        page: 1,
        pageSize: 50,
        loading: false,
        hasMore: true,
        term: "",
        fetchFn: null
      };

      this.bind();
      this.syncUI();
    }

    setupAsync(fetchFunction) {
      this.isAsync = true;
      this.asyncState.fetchFn = fetchFunction;
      this.optionsList.innerHTML = ''; 
      this.loadMoreData(true); 
      
      this.optionsList.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = this.optionsList;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
          this.loadMoreData();
        }
      });
    }

    async loadMoreData(reset = false) {
      if (!this.isAsync || this.asyncState.loading) return;
      if (!reset && !this.asyncState.hasMore) return;

      this.asyncState.loading = true;
      
      if (reset) {
        this.asyncState.page = 1;
        this.optionsList.innerHTML = ''; 
        this.asyncState.hasMore = true;
      }

      try {
        const data = await this.asyncState.fetchFn(this.asyncState.page, this.asyncState.pageSize, this.asyncState.term);
        
        if (data && data.length > 0) {
          const currentVals = JSON.parse(this.hidden.value || '[]');

          data.forEach(opt => {
             const li = document.createElement('li');
             li.className = 'ms__option';
             
             const isChecked = currentVals.includes(opt.value) ? 'checked' : '';

             li.innerHTML = `
                <label>
                    <input type="checkbox" value="${opt.value}" ${isChecked} />
                    ${opt.label}
                </label>
             `;
             
             const cb = li.querySelector('input');
             cb.addEventListener("change", () => {
                 this.syncUI();
                 this.hidden.dispatchEvent(new Event('change', { bubbles: true }));
             });

             this.optionsList.appendChild(li);
          });
          
          this.asyncState.page++;
          if (data.length < this.asyncState.pageSize) {
            this.asyncState.hasMore = false; 
          }
        } else {
          this.asyncState.hasMore = false;
        }

      } catch (err) {
        console.error("Erro no infinite scroll", err);
      } finally {
        this.asyncState.loading = false;
        this.refresh(); 
      }
    }

    refresh() {
        this.checkboxes = qsa(this.root, '.ms__options input[type="checkbox"]');
        this.checkboxes.forEach(cb => {
            cb.addEventListener("change", () => {
                 this.syncUI();
                 this.hidden.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        this.syncUI();
    }

    bind() {
      if(this.btn) this.btn.addEventListener("click", () => this.toggle());

      if(this.btnClear) {
          this.btnClear.addEventListener("click", (e) => {
            e.preventDefault();
            this.checkboxes.forEach(cb => cb.checked = false);
            
            if(this.search) this.search.value = "";
            
            if(this.isAsync) {
                this.asyncState.term = "";
                this.loadMoreData(true);
            } else {
                this.filterOptions("");
            }
            
            this.syncUI();
            this.hidden.dispatchEvent(new Event('change', { bubbles: true }));
          });
      }

      if(this.btnClose) {
          this.btnClose.addEventListener("click", (e) => {
            e.preventDefault();
            this.close();
          });
      }

      this.checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
             this.syncUI();
             this.hidden.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      if(this.search) {
          let timeout;
          this.search.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const term = this.search.value;
                if (this.isAsync) {
                    this.asyncState.term = term;
                    this.loadMoreData(true); 
                } else {
                    this.filterOptions(term); 
                }
            }, 300);
          });
      }

      document.addEventListener("click", (e) => {
        if (!this.root.contains(e.target)) this.close();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.close();
      });
    }

    open() {
      document.querySelectorAll('.ms.ms--open').forEach(otherRoot => {
        if (otherRoot !== this.root) {
          otherRoot.classList.remove("ms--open");
          const otherBtn = otherRoot.querySelector(".ms__control");
          if (otherBtn) {
            otherBtn.classList.remove("ms--open");
            otherBtn.setAttribute("aria-expanded", "false");
          }
        }
      });

      this.root.classList.add("ms--open");
      if(this.btn) {
          this.btn.classList.add("ms--open");
          this.btn.setAttribute("aria-expanded", "true");
      }
      if(this.search) setTimeout(() => this.search.focus(), 0);
    }

    close() {
      this.root.classList.remove("ms--open");
      if(this.btn) {
          this.btn.classList.remove("ms--open");
          this.btn.setAttribute("aria-expanded", "false");
      }
    }

    toggle() {
      if (this.root.classList.contains("ms--open")) this.close();
      else this.open();
    }

    getSelected() {
      return this.checkboxes
        .filter(cb => cb.checked)
        .map(cb => ({
          value: cb.value,
          label: cb.closest("label")?.innerText?.trim() || cb.value
        }));
    }

    setHiddenValue(selected) {
      if(this.hidden) this.hidden.value = JSON.stringify(selected.map(s => s.value));
    }

    filterOptions(term) {
      if(this.isAsync) return; 
      const t = (term || "").toLowerCase().trim();
      qsa(this.optionsList, ".ms__option").forEach(li => {
        const label = li.innerText.toLowerCase();
        li.style.display = label.includes(t) ? "" : "none";
      });
    }

    renderTags(selected) {
      qsa(this.valueArea, ".ms__tag").forEach(t => t.remove());

      if (selected.length === 0) {
        if(this.placeholder) this.placeholder.style.display = "inline";
        return;
      }

      if(this.placeholder) this.placeholder.style.display = "none";

      const MAX_ITEMS = 2;
      const total = selected.length;
      const itemsToShow = selected.slice(0, MAX_ITEMS);
      const remaining = total - MAX_ITEMS;

      itemsToShow.forEach(item => {
        const tag = document.createElement("span");
        tag.className = "ms__tag";

        const text = document.createElement("span");
        text.className = "ms__tag-text";
        text.textContent = item.label;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ms__tag-remove";
        remove.textContent = "×";

        remove.addEventListener("click", (e) => {
          e.stopPropagation();
          const cb = Array.from(this.checkboxes).find(c => c.value === item.value);
          if (cb) {
              cb.checked = false;
              this.syncUI();
              this.hidden.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        tag.appendChild(text);
        tag.appendChild(remove);
        this.valueArea.appendChild(tag);
      });

      if (remaining > 0) {
        const moreTag = document.createElement("span");
        moreTag.className = "ms__tag ms__tag--more";
        moreTag.style.backgroundColor = "#e9ecef";
        moreTag.style.color = "#495057";
        
        const text = document.createElement("span");
        text.className = "ms__tag-text";
        text.textContent = `+ ${remaining}`;
        
        moreTag.appendChild(text);
        this.valueArea.appendChild(moreTag);
      }
    }

    syncUI() {
      const selected = this.getSelected();
      this.setHiddenValue(selected);
      this.renderTags(selected);
    }
  }

  function initRelatoriosDropdown() {
    const relatoriosLi = document.getElementById('nav-item-relatorios');
    if (!relatoriosLi) return;

    const toggle = relatoriosLi.querySelector('.submenu-toggle');
    const submenu = relatoriosLi.querySelector('.submenu');
    if (!toggle || !submenu) return;
    if (toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    if (!submenu.id) submenu.id = 'submenu-relatorios-list';
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
          const t = li.querySelector('.submenu-toggle');
          const sm = li.querySelector('.submenu');
          t && t.setAttribute('aria-expanded', 'false');
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
      'ocupacao_instrutores.php'
    ].includes(current);

    if (isRelatoriosSection) {
      relatoriosLi.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      submenu.setAttribute('aria-hidden', 'false');

      if (current === 'ocupacao_instrutores.php') {
        const link = relatoriosLi.querySelector('.submenu a[href$="ocupacao_instrutores.php"]');
        link && link.classList.add('active');
      }
    }
  }

  function initConfigDropdown() {
    const configLi = document.getElementById('nav-item-config');
    if (!configLi) return;

    const toggle = configLi.querySelector('.submenu-toggle');
    const submenu = configLi.querySelector('.submenu');
    if (!toggle || !submenu) return;
    if (toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    if (!submenu.id) submenu.id = 'submenu-config-list';
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
          const t = li.querySelector('.submenu-toggle');
          const sm = li.querySelector('.submenu');
          t && t.setAttribute('aria-expanded', 'false');
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

  function initSidebarHamburger() {
    const menuToggle = $('#btn-menu-toggle-mobile');
    const sidebar = $('#sidebar-navigation-area');
    const dashboardContainer = $('#wrapper-dashboard-layout');
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

  function enableModalOverlayClose() {
    if (window.__overlayCloseWired) return;
    window.__overlayCloseWired = true;

    window.addEventListener('click', (ev) => {
      const el = ev.target;
      if (el?.classList?.contains('modal')) {
        App.ui.hideModal(el);
      }

    });
  }

  function showModal(el) {
    if (!el) return;
    el.classList.add('show');
    el.style.display = 'flex';
    document.body.classList.add('modal-open');
  }

  function hideModal(el) {
    if (!el) return;
    el.classList.remove('show');
    el.style.display = 'none';
    document.body.classList.remove('modal-open');
  }


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
  function safe(name, fn) { try { fn(); } catch (e) { console.error(`[init] ${name} falhou:`, e); } }

  function initSidebarSubmenusGeneric() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    nav.querySelectorAll('li.has-submenu').forEach((li, idx) => {
      const toggle = li.querySelector('.submenu-toggle');
      const submenu = li.querySelector('.submenu');
      if (!toggle || !submenu) return;

      if (li.dataset.wired === '1' || toggle.dataset.wired === '1') return;
      li.dataset.wired = '1';
      toggle.dataset.wired = '1';

      if (!submenu.id) submenu.id = `submenu-generic-${idx}-${Math.random().toString(36).slice(2)}`;
      if (!toggle.hasAttribute('aria-controls')) toggle.setAttribute('aria-controls', submenu.id);

      const sync = () => {
        const open = li.classList.contains('open');
        toggle.setAttribute('aria-expanded', String(open));
        submenu.setAttribute('aria-hidden', String(!open));
      };

      const doToggle = (e) => {
        e.preventDefault();
        const isOpen = li.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        submenu.setAttribute('aria-hidden', String(!isOpen));

        nav.querySelectorAll('li.has-submenu.open').forEach((other) => {
          if (other === li) return;
          other.classList.remove('open');
          const t = other.querySelector('.submenu-toggle');
          const sm = other.querySelector('.submenu');
          t && t.setAttribute('aria-expanded', 'false');
          sm && sm.setAttribute('aria-hidden', 'true');
        });
      };

      toggle.addEventListener('click', doToggle);
      toggle.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') doToggle(ev);
      });

      sync();
    });
  }

  function setupClearFilters({
    buttonSelector = '#gen_clear',
    getFiltersState,
    resetUI,
    onClear,
    watchSelectors
  } = {}) {
    const btn = document.querySelector(buttonSelector);
    if (!btn) return;

    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';

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

      if (btn.tagName === 'BUTTON') {
        btn.disabled = !active;
      }
      btn.setAttribute('aria-disabled', String(!active));
      btn.classList.toggle('is-disabled', !active);
    };

    const debouncedUpdate = App.utils?.debounce ? App.utils.debounce(updateBtn, 120) : updateBtn;

    container.addEventListener('input', debouncedUpdate, { passive: true });
    container.addEventListener('change', debouncedUpdate, { passive: true });

    if (Array.isArray(watchSelectors) && watchSelectors.length) {
      watchSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.addEventListener('input', debouncedUpdate, { passive: true });
          el.addEventListener('change', debouncedUpdate, { passive: true });
        });
      });
    }

    btn.addEventListener('click', async () => {
      const isDisabled = (btn.tagName === 'BUTTON') ? btn.disabled : (btn.getAttribute('aria-disabled') === 'true');
      if (isDisabled) return;

      btn.setAttribute('aria-busy', 'true');
      try {
        if (typeof resetUI === 'function') await resetUI();
        if (typeof onClear === 'function') await onClear();
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

    return { update };
  }

  App.dom = { $, $$, runNowOrOnReady };
  App.utils = {
    debounce, norm, toId,
    fmtBR, fmtDateBR, fmtDateTimeBR,
    dateMax, dateMin, dateClamp,
    sanitizeSpaces
  };
  App.net = { fetchJSON, safeFetch: fetchJSON, fetchWithTimeout };
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
  App.ui = {
    initRelatoriosDropdown,
    initSidebarHamburger,
    initConfigDropdown,
    enableModalOverlayClose,
    attachDateRangeValidation,
    setupClearFilters,
    bindSimplePagination,
    showModal, hideModal,
    initSidebarSubmenusGeneric,
    initMultiSelects: () => {
        document.querySelectorAll(".ms").forEach(el => new MultiSelect(el));
    }
  };
  App.components = { MultiSelect };

  runNowOrOnReady(() => {
    safe('Relatorios', App.ui.initRelatoriosDropdown);
    safe('SidebarHamburger', App.ui.initSidebarHamburger);
    safe('Config', App.ui.initConfigDropdown);
    safe('OverlayClose', App.ui.enableModalOverlayClose);

    safe('SubmenusGeneric', App.ui.initSidebarSubmenusGeneric);
  });

  App.pagination = {

    paginateData: (items, page, pageSize) => {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const validPage = Math.min(Math.max(1, page), totalPages);

      const start = (validPage - 1) * pageSize;
      const end = start + pageSize;

      return {
        pagedData: items.slice(start, end),
        meta: {
          page: validPage,
          pageSize,
          total,
          totalPages
        }
      };
    },

    bindControls: (els, onChange) => {
      const { prev, next, sizeSel } = els;

      if (prev) {
        const newPrev = prev.cloneNode(true);
        if (prev.id) newPrev.id = prev.id;
        prev.parentNode.replaceChild(newPrev, prev);
        newPrev.addEventListener('click', () => onChange('prev'));
        els.prev = newPrev;
      }
      if (next) {
        const newNext = next.cloneNode(true);
        if (next.id) newNext.id = next.id;
        next.parentNode.replaceChild(newNext, next);
        newNext.addEventListener('click', () => onChange('next'));
        els.next = newNext;
      }
      if (sizeSel) {
        const newSize = sizeSel.cloneNode(true);
        if (sizeSel.id) newSize.id = sizeSel.id;
        sizeSel.parentNode.replaceChild(newSize, sizeSel);
        newSize.addEventListener('change', () => onChange('size', parseInt(newSize.value, 10)));
        els.sizeSel = newSize;
      }
    },

    updateUI: (els, meta) => {
      const { prev, next, info } = els;
      const { page, total, totalPages } = meta;

      if (info) {
        info.textContent = `Página ${page} de ${totalPages} • ${total} registros`;
      }

      const setButtonState = (btn, isDisabled) => {
        if (!btn) return;
        btn.disabled = isDisabled;

        if (isDisabled) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-secondary');
        } else {
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
        }
      };

      setButtonState(prev, page <= 1);
      setButtonState(next, page >= totalPages || total === 0);
    }
  };

 App.filters = {
    render: function (targetId, config = {}, customElement = null, onChange = () => {}, onClear = () => {}) {
      const container = document.getElementById(targetId);
      if (!container) return;
      
      container.innerHTML = '';
      container.className = 'filter-container';

      // Helper para criar a estrutura HTML padrão (Label + Input)
      const createGroup = (lbl, input, idSuffix) => {
        const div = document.createElement('div');
        div.className = 'filter-group';
        div.id = `filter-group-${idSuffix}`;

        const label = document.createElement('label');
        label.textContent = lbl;
        label.id = `filter-label-${idSuffix}`;
        if(input.id) label.setAttribute('for', input.id);

        // Adiciona classes padrão se não existirem
        if (!input.classList.contains('filter-input') && !input.classList.contains('ms')) {
          input.classList.add('filter-input');
          if (!input.classList.contains('form-control') && !input.classList.contains('form-select')) {
            input.classList.add('form-control');
          }
        }

        div.appendChild(label);
        div.appendChild(input);
        return div;
      };

      // Helper para disparar o callback onChange
      const triggerChange = () => { if (typeof onChange === 'function') onChange(); };

      // --- 1. BUSCA TEXTUAL ---
      if (config.search) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.id = 'gen_search';
        inp.placeholder = 'Digite para buscar...';
        inp.addEventListener('input', App.utils.debounce(triggerChange, 400));
        container.appendChild(createGroup('Buscar:', inp, 'search'));
      }

      // --- 2. DATA DE CRIAÇÃO ---
      if (config.date) {
        const today = new Date().toISOString().split('T')[0];

        const from = document.createElement('input');
        from.type = 'date';
        from.id = 'gen_created_from';
        from.min = '1900-01-01';
        from.max = today;

        const to = document.createElement('input');
        to.type = 'date';
        to.id = 'gen_created_to';
        to.max = today;

        from.addEventListener('change', () => {
          const val = from.value;
          to.min = val;
          if (val) to.value = val;
          triggerChange();
        });
        to.addEventListener('change', triggerChange);

        container.appendChild(createGroup('Criado de:', from, 'date-from'));
        container.appendChild(createGroup('Criado até:', to, 'date-to'));
      }

      // --- 3. CARGA HORÁRIA ---
      if (config.cargaHoraria) {
        const sel = document.createElement('select');
        sel.id = 'gen_carga_horaria';
        sel.className = 'form-select filter-input';
        ['Todos', '20', '30', '40'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Carga Horária:', sel, 'carga-horaria'));
      }

      // --- 4. CATEGORIA ---
      if (config.categoria) {
        const sel = document.createElement('select');
        sel.id = 'gen_categoria';
        sel.className = 'form-select filter-input';
        ['Todos', 'A', 'C'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Categoria:', sel, 'categoria'));
      }

      // --- 5. TIPO DE CONTRATO ---
      if (config.tipoContrato) {
        const sel = document.createElement('select');
        sel.id = 'gen_tipo_contrato';
        sel.className = 'form-select filter-input';
        ['Todos', 'Efetivo', 'Empréstimo', 'RPA'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Tipo de Contrato:', sel, 'tipo-contrato'));
      }

      // --- 6. MODALIDADE ---
      if (config.modalidade) {
        const sel = document.createElement('select');
        sel.id = 'gen_modalidade';
        sel.className = 'form-select filter-input';
        ['Todos', 'Aperfeiçoamento', 'Aprendizagem Industrial', 'Qualificação Profissional', 'Técnico', 'Iniciação Profissional', 'Extensão'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Modalidade:', sel, 'modalidade'));
      }

      // --- 7. TIPO DE CURSO ---
      if (config.tipoCurso) {
        const sel = document.createElement('select');
        sel.id = 'gen_tipo_curso';
        sel.className = 'form-select filter-input';
        ['Todos', 'Presencial', 'EAD', 'Semipresencial', 'Trilhas nas Escolas'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Tipo de Curso:', sel, 'tipo-curso'));
      }

      //Helper para MultiSelect
      const createMultiselectHTML = (id, placeholder, options, defaultAll = false) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ms';
        wrapper.id = id;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms__control';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = `
            <div class="ms__value" aria-live="polite">
                <span class="ms__placeholder">${placeholder}</span>
            </div>
            <span class="ms__caret" aria-hidden="true">▾</span>
        `;
        wrapper.appendChild(btn);

        const dropdown = document.createElement('div');
        dropdown.className = 'ms__dropdown';
        dropdown.setAttribute('role', 'listbox');
        dropdown.setAttribute('aria-multiselectable', 'true');

        const searchDiv = document.createElement('div');
        searchDiv.className = 'ms__search';
        searchDiv.innerHTML = '<input type="text" class="ms__search-input" placeholder="Pesquisar..." />';
        dropdown.appendChild(searchDiv);

        const ul = document.createElement('ul');
        ul.className = 'ms__options';
        
        options.forEach(opt => {
             const li = document.createElement('li');
             li.className = 'ms__option';
             const isChecked = defaultAll ? 'checked' : '';
             li.innerHTML = `
                <label>
                    <input type="checkbox" value="${opt}" ${isChecked} />
                    ${opt}
                </label>
             `;
             ul.appendChild(li);
        });
        dropdown.appendChild(ul);

        const footer = document.createElement('div');
        footer.className = 'ms__footer';
        footer.innerHTML = `
            <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
            <button type="button" class="btn btn-primary ms__close">OK</button>
        `;
        dropdown.appendChild(footer);
        
        wrapper.appendChild(dropdown);

        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = id + '-hidden';
        hidden.value = defaultAll ? JSON.stringify(options) : '[]';
        hidden.addEventListener('change', triggerChange); 
        wrapper.appendChild(hidden);

        return wrapper;
      };

      // --- 8. ÁREA (Multiselect) ---
      if (config.area) {
         const ms = createMultiselectHTML(
             'gen_area', 
             'Selecione...', 
             ['Tecnologia da Informação', 'Automação', 'Metalmecânica', 'Gestão', 'Automotiva', 'Segurança do Trabalho', 'Eletroeletrônica']
         );
         container.appendChild(createGroup('Área:', ms, 'area'));
      }

      // --- 9. TURNO (Multiselect) ---
      if (config.turno) {
         const ms = createMultiselectHTML(
             'gen_turno', 
             'Selecione...', 
             ['Manhã', 'Tarde', 'Noite'],
             false 
         );
         container.appendChild(createGroup('Turno:', ms, 'turno'));
      }

      // --- 10. COMPETÊNCIA (Multiselect) ---
      if (config.competencia) {
         const ms = createMultiselectHTML(
             'gen_competencia', 
             'Selecione...', 
             [] 
         );
         container.appendChild(createGroup('Por Competência:', ms, 'competencia'));
      }

      // --- 11. STATUS ---
      if (config.status) {
        const sel = document.createElement('select');
        sel.id = 'gen_status';
        sel.classList.add('form-select');
        ['Todos', 'Ativo', 'Inativo'].forEach(optTxt => {
          const opt = document.createElement('option');
          opt.value = optTxt;
          opt.textContent = optTxt;
          opt.id = `opt-status-${optTxt.toLowerCase()}`;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Status:', sel, 'status'));
      }

      // --- 12. SITUAÇÃO (Novo para Turmas) ---
      if (config.situacao) {
        const sel = document.createElement('select');
        sel.id = 'gen_situacao';
        sel.classList.add('form-select');
        ['Todos', 'Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'].forEach(optTxt => {
            const opt = document.createElement('option');
            opt.value = optTxt;
            opt.textContent = optTxt;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Situação:', sel, 'situacao'));
      }

      // --- 13. TIPO DE UC ---
      if (config.tipoUc) {
        const sel = document.createElement('select');
        sel.id = 'gen_tipo_uc';
        sel.classList.add('form-select');
        
        const opcoes = ['Todos', 'EAD', 'Teórica', 'Prática', 'Teórica 70% - Prática 30%'];
        
        opcoes.forEach(optTxt => {
          const opt = document.createElement('option');
          opt.value = optTxt;
          opt.textContent = optTxt;
          sel.appendChild(opt);
        });
        
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Tipo de UC:', sel, 'tipo-uc'));
      }

      // --- 14. TIPO DE USUÁRIO ---
      if (config.tipoUsuario) {
        const sel = document.createElement('select');
        sel.id = 'gen_tipo_usuario';
        sel.classList.add('form-select');
        ['Todos', 'Coordenador', 'Pedagogo', 'Instrutor', 'Administrador'].forEach(optTxt => {
          const opt = document.createElement('option');
          opt.value = optTxt;
          opt.textContent = optTxt;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Tipo de Usuário:', sel, 'tipo-usuario'));
      }
      
      // --- 15. ELEMENTO CUSTOMIZADO (Legado/Extra) ---
      if (customElement) {
        if (customElement instanceof Element && !customElement.classList.contains('filter-input')) {
          customElement.classList.add('filter-input');
        }
        if (!customElement.id) customElement.id = 'gen_custom_filter';

        const div = createGroup(customElement.dataset?.label || 'Filtro:', customElement, 'custom');
        container.appendChild(div);
      }

      // --- 16. ITENS POR PÁGINA (PAGESIZE) ---
      if (config.pageSize) {
        const sel = document.createElement('select');
        sel.id = 'gen_pagesize';
        sel.classList.add('form-select');
        [10, 25, 50, 100].forEach(num => {
          const opt = document.createElement('option');
          opt.value = num;
          opt.textContent = num;
          opt.id = `opt-pagesize-${num}`;
          sel.appendChild(opt);
        });
        sel.value = 10;
        sel.addEventListener('change', triggerChange);
        container.appendChild(createGroup('Itens/página:', sel, 'pagesize'));
      }

      // --- BOTÃO LIMPAR ---
      const btnDiv = document.createElement('div');
      btnDiv.className = 'filter-group';
      btnDiv.id = 'filter-group-actions';
      btnDiv.style.flex = '0 0 auto';

      const btn = document.createElement('button');
      btn.id = 'gen_clear';
      btn.className = 'btn btn-light border filter-btn-clear filter-input';
      btn.innerHTML = '<i class="fas fa-broom" id="icon-btn-clear"></i> Limpar';
      btn.type = 'button';

      btn.addEventListener('click', () => {
        if (document.getElementById('gen_search')) document.getElementById('gen_search').value = '';
        if (document.getElementById('gen_created_from')) document.getElementById('gen_created_from').value = '';
        if (document.getElementById('gen_created_to')) document.getElementById('gen_created_to').value = '';
        
        // Reseta Selects
        if (document.getElementById('gen_status')) document.getElementById('gen_status').value = 'Todos';
        if (document.getElementById('gen_situacao')) document.getElementById('gen_situacao').value = 'Todos'; // Reset Situação
        if (document.getElementById('gen_tipo_usuario')) document.getElementById('gen_tipo_usuario').value = 'Todos';
        if (document.getElementById('gen_tipo_uc')) document.getElementById('gen_tipo_uc').value = 'Todos';
        if (document.getElementById('gen_pagesize')) document.getElementById('gen_pagesize').value = 10;
        if (document.getElementById('gen_carga_horaria')) document.getElementById('gen_carga_horaria').value = 'Todos';
        if (document.getElementById('gen_categoria')) document.getElementById('gen_categoria').value = 'Todos';
        if (document.getElementById('gen_tipo_contrato')) document.getElementById('gen_tipo_contrato').value = 'Todos';
        if (document.getElementById('gen_modalidade')) document.getElementById('gen_modalidade').value = 'Todos';
        if (document.getElementById('gen_tipo_curso')) document.getElementById('gen_tipo_curso').value = 'Todos';

        // Reseta Multiselects
        document.querySelectorAll('.ms__clear').forEach(clearBtn => {
             clearBtn.click();
        });

        // Reseta Custom
        if (customElement && (customElement.tagName === 'SELECT' || customElement.tagName === 'INPUT')) customElement.value = '';

        if (typeof onClear === 'function') onClear();
      });

      btnDiv.appendChild(btn);
      container.appendChild(btnDiv);

      App.ui.initMultiSelects();
    }
};

  window.App = App;

  App.loader = {
    _el: null, 
    init: function() {
      if (document.getElementById('app-loader-overlay')) {
        this._el = document.getElementById('app-loader-overlay');
        return;
      }

      const style = document.createElement('style');
      style.innerHTML = `
        .loader-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-color: rgba(255, 255, 255, 0.9); /* Fundo branco com leve transparência */
          z-index: 99999; /* Fica acima de tudo, inclusive modais */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: opacity 0.3s ease;
        }
        .loader-hidden {
          opacity: 0;
          pointer-events: none; /* Permite clicar através quando invisível */
          visibility: hidden;
        }
        .loader-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #e0e0e0; /* Cinza claro para o fundo do anel */
          border-top: 5px solid #0056b3; /* Cor da plataforma */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }
        .loader-text {
          font-family: 'Arial', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #0056b3; /* Cor da plataforma */
          letter-spacing: 0.5px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.id = 'app-loader-overlay';
      div.className = 'loader-overlay loader-hidden'; 
      div.innerHTML = `
        <div class="loader-spinner"></div>
        <div class="loader-text">Por favor, aguarde.</div>
      `;
      
      const appendToBody = () => {
          if(document.body) {
              document.body.appendChild(div);
              this._el = div;
          } else {
              window.addEventListener('DOMContentLoaded', () => {
                  document.body.appendChild(div);
                  this._el = div;
              });
          }
      };
      appendToBody();
    },

    show: function() {
      if (!this._el) this.init();
      if(this._el) this._el.classList.remove('loader-hidden');
    },

    hide: function() {
      if (this._el) {
        this._el.classList.add('loader-hidden');
      }
    }
  };

  App.loader.init();

})();