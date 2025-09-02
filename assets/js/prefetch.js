/* assets/js/prefetch.js */
/* eslint-disable no-console */
(() => {
  'use strict';

  // Usa utilidades se App existir; caso não, cria o mínimo necessário
  const App = (window.App = window.App || {});
  const $ = App.dom?.$ || ((s, r = document) => r.querySelector(s));

  // ===================== Cache (localStorage com TTL) =====================
  const NS_DEFAULT = 'v1:default'; // troque o "default" pelo ID do usuário após o login
  let NAMESPACE = NS_DEFAULT;

  const now = () => Date.now();
  const toMs = (sec) => sec * 1000;

  const Cache = {
    setNamespace(ns) {
      NAMESPACE = ns || NS_DEFAULT;
    },
    _k(key) {
      return `prefetch:${NAMESPACE}:${key}`;
    },
    set(key, value, ttlSeconds = 300) {
      try {
        const item = { v: value, exp: now() + toMs(ttlSeconds) };
        localStorage.setItem(this._k(key), JSON.stringify(item));
      } catch (e) {
        // Se lotou o storage, tenta limpar esse namespace
        this.clearMatching(`^prefetch:${NAMESPACE}:`);
      }
    },
    get(key) {
      try {
        const raw = localStorage.getItem(this._k(key));
        if (!raw) return null;
        const { v, exp } = JSON.parse(raw);
        if (exp && now() > exp) {
          localStorage.removeItem(this._k(key));
          return null;
        }
        return v;
      } catch {
        return null;
      }
    },
    del(key) {
      localStorage.removeItem(this._k(key));
    },
    clearMatching(regexStr) {
      const re = new RegExp(regexStr);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (re.test(k)) localStorage.removeItem(k);
      }
    },
  };

  App.cache = Cache;

  // ===================== Prefetch =====================
  // Ajuste estes endpoints conforme os seus nomes reais.
  // Dica: retorne só campos leves (id/nome/status) e uma página pequena.
  const API = {
    instituicoes: 'http://localhost:8000/api/instituicoes?page=1&page_size=100&fields=id,nome,status',
    empresas:     'http://localhost:8000/api/empresas?page=1&page_size=100&fields=id,nome,status',
    instrutores:  'http://localhost:8000/api/instrutores?page=1&page_size=100&fields=_id,nome,status',
    cursos:       'http://localhost:8000/api/cursos?page=1&page_size=50&fields=id,nome,status,tipo,modalidade',
    ucs:          'http://localhost:8000/api/unidades_curriculares?page=1&page_size=100&fields=id,descricao,status',
    turmas:       'http://localhost:8000/api/turmas?page=1&page_size=50&fields=id,codigo,status',
    calendario:   'http://localhost:8000/api/calendario?page=1&page_size=50',
    
  };

  // O que cada view precisa para “abrir já com dados”
  const VIEW_BUNDLES = {
    dashboard: ['dashboard_metrics', 'instituicoes', 'empresas', 'instrutores', 'cursos', 'ucs', 'turmas'],
    gestao_instrutores: ['instrutores', 'instituicoes'],
    gestao_empresas: ['empresas', 'instituicoes'],
    gestao_cursos: ['cursos', 'instituicoes', 'empresas'],
    gestao_unidades_curriculares: ['ucs', 'instituicoes'],
    gestao_turmas: ['turmas', 'cursos', 'instrutores', 'instituicoes'],
    gestao_calendario: ['calendario', 'turmas', 'instrutores', 'salas'],
  };

  // wrapper de fetch que nunca quebra a página
  async function safeFetchJSON(url, signal) {
    try {
      const res = await fetch(url, { signal, credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[prefetch] Falhou:', url, err.message);
      return null;
    }
  }

  // Faz prefetch de um conjunto de chaves (endpoints) e guarda no cache
  async function prefetchKeys(keys, { ttl = 300, abortSignal } = {}) {
    const jobs = keys.map(async (k) => {
      if (!API[k]) return null;

      // Evita buscar se cache ainda válido
      const cached = Cache.get(k);
      if (cached) return { k, from: 'cache', data: cached };

      const json = await safeFetchJSON(API[k], abortSignal);
      if (json) {
        // Normalize: tente detectar onde está a lista
        const list = Array.isArray(json) ? json
          : json.data || json.items || json.results || json.rows || json.lista || json.registros || json.content || json.values || json;

        Cache.set(k, list, ttl);
        return { k, from: 'net', data: list };
      }
      return null;
    });

    const results = await Promise.all(jobs);
    return results.filter(Boolean);
  }

  // Revalida (SWR): entrega cache já e atualiza em segundo plano
  async function getWithRevalidate(key, { ttl = 300 } = {}) {
    const cached = Cache.get(key);
    // Dispara atualização “em segundo plano”
    prefetchKeys([key], { ttl }).catch(() => {});
    return cached;
  }

  // Prefetch ao passar o mouse no menu (deixa tudo pronto antes do clique)
  function attachMenuHoverPrefetch(selectorToViewName, { ttl = 300 } = {}) {
    // selectorToViewName: { '#menu-instrutores': 'gestao_instrutores', ... }
    for (const [sel, view] of Object.entries(selectorToViewName)) {
      const el = $(sel);
      if (!el || !VIEW_BUNDLES[view]) continue;
      let started = false;
      const onHover = () => {
        if (started) return;
        started = true;
        prefetchKeys(VIEW_BUNDLES[view], { ttl }).catch(() => {});
      };
      el.addEventListener('mouseenter', onHover);
      el.addEventListener('touchstart', onHover, { passive: true });
    }
  }

  // API pública
  App.prefetch = {
    start({ userNamespace = NS_DEFAULT, ttl = 300 } = {}) {
      Cache.setNamespace(userNamespace || NS_DEFAULT);
      // Prefetch do “pacote” do dashboard logo após login
      return prefetchKeys(VIEW_BUNDLES.dashboard, { ttl });
    },
    forView(viewName, { ttl = 300 } = {}) {
      const keys = VIEW_BUNDLES[viewName] || [];
      return prefetchKeys(keys, { ttl });
    },
    getWithRevalidate, // uso pontual por chave
    attachMenuHoverPrefetch,
  };

  console.log('[prefetch] pronto.');
})();
