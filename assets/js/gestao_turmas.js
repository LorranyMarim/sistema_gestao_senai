// gestao_turmas.js
(() => {
  'use strict';

  // ===== Helpers rápidos =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const getVal = (sel) => $(sel)?.value?.trim() || "";
  const getNum = (sel, def = 0) => {
    const v = Number(getVal(sel));
    return Number.isFinite(v) ? v : def;
  };
  const getOptText = (sel) => {
    const el = $(sel);
    if (!el) return "";
    const idx = el.selectedIndex;
    return idx >= 0 ? (el.options[idx]?.text || "") : "";
  };

  function addInvalid(el, msg) {
    if (!el) return;
    el.classList.add('is-invalid');
    if (msg) el.setAttribute('title', msg);
  }
  function clearInvalid(el) {
    if (!el) return;
    el.classList.remove('is-invalid');
    el.removeAttribute('title');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const modalEl = $('#addTurmaModal');
    if (!modalEl) return;

    const bsModal = (window.bootstrap && bootstrap.Modal)
      ? new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false })
      : null;

    // Abre via JS apenas se o botão NÃO usar data-bs-*
    const addBtn = $('#addTurmaBtn');
    if (addBtn && !addBtn.hasAttribute('data-bs-toggle')) {
      on(addBtn, 'click', () => bsModal && bsModal.show());
    }

    // ===== Stepper =====
    const header      = $('#stepperHeader');
    const items       = $$('.stepper-item', header);
    const panes       = $$('.step-pane');
    const btnNext     = $('#btn-next');
    const btnBack     = $('#btn-back');
    const summaryArea = $('#summaryArea');

    const total = items.length;
    let current = 1;

    // Barra de progresso via ::after
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    const setProgressPct = (pct) => { styleEl.textContent = `#progressLine::after{width:${pct}%;}`; };

    function setActive(step) {
      current = Math.min(Math.max(step, 1), total);

      items.forEach((el) => {
        const n = Number(el.dataset.step);
        el.classList.toggle('active', n === current);
        el.classList.toggle('completed', n < current);
        el.setAttribute('aria-current', n === current ? 'step' : 'false');
      });

      panes.forEach((p) => {
        const n = Number(p.dataset.step);
        p.classList.toggle('active', n === current);
        p.setAttribute('aria-hidden', n === current ? 'false' : 'true');
      });

      const pct = ((current - 1) / (total - 1)) * 100;
      setProgressPct(pct);

      btnBack.disabled = current === 1;
      btnNext.textContent = current === total ? 'Concluir' : 'Próximo';

      const firstInput = panes.find(p => Number(p.dataset.step) === current)?.querySelector('input,select,textarea,button');
      firstInput?.focus?.();
    }

    // ===== Validação por etapa =====
    function validateRequiredIn(pane) {
      const required = $$('[required]', pane);
      for (const el of required) {
        const val = (el.value || '').trim();
        if (!val) {
          addInvalid(el, 'Campo obrigatório');
          on(el, 'input', () => clearInvalid(el), { once: true });
          el.focus?.();
          return false;
        }
      }
      return true;
    }

    function validateDataRange() {
      const i = $('#dataInicio');
      const f = $('#dataFim');
      if (!i || !f) return true;
      const vi = i.value, vf = f.value;
      if (vi && vf && new Date(vf) < new Date(vi)) {
        addInvalid(f, 'Data de fim não pode ser anterior ao início');
        on(f, 'change', () => clearInvalid(f), { once: true });
        f.focus?.();
        return false;
      }
      return true;
    }

    function validateNumericMin(el, min = 1) {
      if (!el) return true;
      const v = Number(el.value);
      if (!Number.isFinite(v) || v < min) {
        addInvalid(el, `Valor mínimo: ${min}`);
        on(el, 'input', () => clearInvalid(el), { once: true });
        el.focus?.();
        return false;
      }
      return true;
    }

    function validateStep(step) {
      const pane = panes.find(p => Number(p.dataset.step) === step);
      if (!pane) return true;

      if (!validateRequiredIn(pane)) return false;

      switch (step) {
        case 1: {
          const codigo = $('#codigoTurma');
          if (codigo) codigo.value = (codigo.value || '').toUpperCase();
          break;
        }
        case 2: {
          if (!validateDataRange()) return false;
          break;
        }
        case 3: {
          if (!validateNumericMin($('#quantidadeAlunos'), 1)) return false;
          break;
        }
        default: break;
      }
      return true;
    }

    // ===== Carregar instituições (AGORA no escopo certo) =====
    async function carregarInstituicoes() {
      const sel = $('#instituicaoTurma');
      if (!sel) return;

      const keep = sel.value || "";
      sel.innerHTML = '<option value="">Carregando instituições...</option>';
      sel.disabled = true;

      try {
        // Direto na API (ajuste a URL conforme seu deploy/CORS):
        const resp = await fetch('/api/instituicoes');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        // aceita {items:[...]} ou [...]
        const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
        sel.innerHTML = '<option value="">Selecione</option>';

        items.forEach(it => {
          const opt = new Option(it.razao_social || '(sem razão social)', it.id);
          sel.add(opt);
        });

        if (keep && [...sel.options].some(o => o.value === keep)) {
          sel.value = keep;
        }
      } catch (e) {
        console.error('Erro ao carregar instituições', e);
        sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
      } finally {
        sel.disabled = false;
      }
    }

    // ===== Resumo (usa o TEXTO visível do select) =====
    function buildSummary() {
      if (!summaryArea) return;
      const data = {
        'Instituição'          : getOptText('#instituicaoTurma'), // mostra razão social
        'Código da Turma'      : getVal('#codigoTurma'),
        'Curso'                : getOptText('#cursoTurma'),
        'Empresa/Parceiro'     : getOptText('#empresaTurma'),
        'Calendário'           : getOptText('#calendarioTurma'),
        'Data de Início'       : getVal('#dataInicio'),
        'Data de Fim'          : getVal('#dataFim'),
        'Turno'                : getOptText('#turnoTurma') || getVal('#turnoTurma'),
        'Quantidade de Alunos' : getVal('#quantidadeAlunos'),
        'Status da Turma'      : getOptText('#statusTurma') || getVal('#statusTurma'),
        'Unidade Curricular'   : getOptText('#ucTurma1'),
        'Instrutor'            : getOptText('#instrutorTurma1'),
      };

      let html = `
        <div class="alert alert-info mb-3">Confira os dados antes de concluir.</div>
        <div class="table-responsive">
          <table class="table table-sm table-bordered align-middle summary-table">
            <tbody>
      `;
      for (const [k, v] of Object.entries(data)) {
        html += `
          <tr>
            <th class="bg-light">${k}</th>
            <td>${v ? v : '<span class="text-muted">—</span>'}</td>
          </tr>
        `;
      }
      html += `</tbody></table></div>`;
      summaryArea.innerHTML = html;
    }

    // ===== Payload final (NOMES que o backend espera) =====
    function buildPayload() {
      return {
        codigo        : getVal('#codigoTurma'),
        id_curso      : getVal('#cursoTurma'),       // precisa ser o ID no value do select
        data_inicio   : getVal('#dataInicio'),
        data_fim      : getVal('#dataFim'),
        turno         : getVal('#turnoTurma'),
        num_alunos    : getNum('#quantidadeAlunos', 0),
        id_instituicao: getVal('#instituicaoTurma'), // ID da instituição
        id_calendario : getVal('#calendarioTurma'),  // ID do calendário
        id_empresa    : getVal('#empresaTurma'),     // ID da empresa
        status        : (getVal('#statusTurma') || 'ativo').toLowerCase() === 'ativo',
        unidades_curriculares: [
          {
            id_uc:        getVal('#ucTurma1'),       // ID da UC
            id_instrutor: getVal('#instrutorTurma1'),// ID do instrutor (ou "" se vazio)
            data_inicio:  getVal('#dataInicio'),     // ajuste se for diferente da turma
            data_fim:     getVal('#dataFim')
          }
        ]
      };
    }

    // ===== Navegação =====
    on(btnNext, 'click', () => {
      if (current < total) {
        if (!validateStep(current)) return;
        if (current + 1 === total) buildSummary();
        setActive(current + 1);
      } else {
        const payload = buildPayload();
        console.log('[Turma] payload:', payload);

        // Exemplo de envio:
        // fetch('../backend/processa_turma.php', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload)
        // })
        // .then(r => r.json())
        // .then(resp => { /* tratar resposta */ })
        // .catch(err => console.error(err));

        if (bsModal) bsModal.hide();
        setTimeout(() => alert('Cadastro concluído!'), 120);
      }
    });

    on(btnBack, 'click', () => setActive(current - 1));

    // Navegar clicando no cabeçalho
    items.forEach(item => {
      item.style.cursor = 'pointer';
      on(item, 'click', () => {
        const step = Number(item.dataset.step);
        if (step === current) return;
        if (step > current && !validateStep(current)) return;
        if (step === total) buildSummary();
        setActive(step);
      });
    });

    // Enter avança
    panes.forEach(pane => {
      on(pane, 'keydown', (e) => {
        if (e.key === 'Enter') {
          const tag = (e.target.tagName || '').toLowerCase();
          if (['select', 'textarea'].includes(tag)) return;
          e.preventDefault();
          btnNext.click();
        }
      });
    });

    // Reset + carregar instituições ao abrir
    on(modalEl, 'show.bs.modal', () => {
      current = 1;
      setActive(1);
      $$('.is-invalid').forEach(clearInvalid);
      carregarInstituicoes(); // <<< agora funciona
    });

    // UX: código da turma em maiúsculas
    const codigoTurma = $('#codigoTurma');
    on(codigoTurma, 'input', () => {
      const pos = codigoTurma.selectionStart;
      codigoTurma.value = (codigoTurma.value || '').toUpperCase();
      try { codigoTurma.setSelectionRange(pos, pos); } catch (_) {}
    });

  }); // DOMContentLoaded
})();
