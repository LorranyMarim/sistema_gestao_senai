// gestao_turmas.js
(() => {
  'use strict';

  // ===== Helpers rápidos =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function on(el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
  }

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

  // ===== Bootstrap Modal =====
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
    const header         = $('#stepperHeader');
    const items          = $$('.stepper-item', header);
    const panes          = $$('.step-pane');
    const progress       = $('#progressLine');
    const btnNext        = $('#btn-next');
    const btnBack        = $('#btn-back');
    const summaryArea    = $('#summaryArea');

    const total = items.length;
    let current = 1;

    // Mapa de campos (para resumo e payload)
    const fields = {
      instituicaoTurma : () => $('#instituicaoTurma')?.value.trim(),
      codigoTurma      : () => $('#codigoTurma')?.value.trim(),
      cursoTurma       : () => $('#cursoTurma')?.value.trim(),
      empresaTurma     : () => $('#empresaTurma')?.value.trim(),
      calendarioTurma  : () => $('#calendarioTurma')?.value.trim(),
      dataInicio       : () => $('#dataInicio')?.value.trim(),
      dataFim          : () => $('#dataFim')?.value.trim(),
      turnoTurma       : () => $('#turnoTurma')?.value.trim(),
      quantidadeAlunos : () => $('#quantidadeAlunos')?.value.trim(),
      statusTurma      : () => $('#statusTurma')?.value.trim(),
      ucTurma1         : () => $('#ucTurma1')?.value.trim(),
      instrutorTurma1  : () => $('#instrutorTurma1')?.value.trim(),
    };

    // Barra de progresso via ::after
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    function setProgressPct(pct) {
      styleEl.textContent = `#progressLine::after{width:${pct}%;}`;
    }

    function setActive(step) {
      current = Math.min(Math.max(step, 1), total);

      items.forEach((el) => {
        const n = Number(el.dataset.step);
        el.classList.toggle('active', n === current);
        el.classList.toggle('completed', n < current);
        // acessibilidade básica
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
      // foca primeiro campo visível
      const firstInput = panes.find(p => Number(p.dataset.step) === current)?.querySelector('input,select,textarea,button');
      if (firstInput && typeof firstInput.focus === 'function') firstInput.focus();
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
      const vi = i.value;
      const vf = f.value;
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
      if (Number.isNaN(v) || v < min) {
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

      // 1) campos required
      if (!validateRequiredIn(pane)) return false;

      // 2) validações específicas por etapa
      switch (step) {
        case 1: {
          const codigo = $('#codigoTurma');
          if (codigo) {
            // força maiúsculas de forma amigável
            codigo.value = codigo.value.toUpperCase();
          }
          break;
        }
        case 2: {
          if (!validateDataRange()) return false;
          break;
        }
        case 3: {
          const qtd = $('#quantidadeAlunos');
          if (!validateNumericMin(qtd, 1)) return false;
          break;
        }
        default:
          break;
      }
      return true;
    }

    // ===== Resumo (antes de concluir) =====
    function buildSummary() {
      if (!summaryArea) return;
      const data = {
        'Instituição'           : fields.instituicaoTurma(),
        'Código da Turma'       : fields.codigoTurma(),
        'Curso'                 : fields.cursoTurma(),
        'Empresa/Parceiro'      : fields.empresaTurma(),
        'Calendário'            : fields.calendarioTurma(),
        'Data de Início'        : fields.dataInicio(),
        'Data de Fim'           : fields.dataFim(),
        'Turno'                 : fields.turnoTurma(),
        'Quantidade de Alunos'  : fields.quantidadeAlunos(),
        'Status da Turma'       : fields.statusTurma(),
        'Unidade Curricular'    : fields.ucTurma1(),
        'Instrutor'             : fields.instrutorTurma1(),
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

    // ===== Payload final (exemplo) =====
    function buildPayload() {
      return {
        instituicao   : fields.instituicaoTurma(),
        codigo        : fields.codigoTurma(),
        curso         : fields.cursoTurma(),
        empresa       : fields.empresaTurma(),
        calendario    : fields.calendarioTurma(),
        data_inicio   : fields.dataInicio(),
        data_fim      : fields.dataFim(),
        turno         : fields.turnoTurma(),
        qtd_alunos    : Number(fields.quantidadeAlunos() || 0),
        status        : fields.statusTurma(),
        ucs: [
          {
            uc        : fields.ucTurma1(),
            instrutor : fields.instrutorTurma1()
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
        // Concluir: aqui você integra com seu backend (ex.: fetch POST)
        const payload = buildPayload();
        console.log('[Turma] payload:', payload);

        // Exemplo de envio (descomente/ajuste a rota conforme seu backend):
        // fetch('../backend/processa_turma.php', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ acao: 'criar', dados: payload })
        // })
        // .then(r => r.json())
        // .then(resp => {
        //   // tratar resposta, atualizar tabela, fechar modal etc.
        // })
        // .catch(err => console.error(err));

        // Fecha modal e dá feedback
        if (bsModal) bsModal.hide();
        setTimeout(() => alert('Cadastro concluído!'), 120);
      }
    });

    on(btnBack, 'click', () => setActive(current - 1));

    // Navegar clicando no cabeçalho (com validação ao avançar)
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

    // Enter avança (quando apropriado)
    panes.forEach(pane => {
      on(pane, 'keydown', (e) => {
        if (e.key === 'Enter') {
          // evita submit acidental e respeita selects
          const tag = (e.target.tagName || '').toLowerCase();
          if (['select', 'textarea'].includes(tag)) return;
          e.preventDefault();
          btnNext.click();
        }
      });
    });

    // Reset a cada abertura
    on(modalEl, 'show.bs.modal', () => {
      current = 1;
      setActive(1);
      $$('.is-invalid').forEach(clearInvalid);

      // restaura valores default se desejar
      // $$('#addTurmaModal input, #addTurmaModal select').forEach(el => el.value = '');
    });

    // UX: transformar código da turma em maiúsculas enquanto digita
    const codigoTurma = $('#codigoTurma');
    if (codigoTurma) {
      on(codigoTurma, 'input', () => {
        const pos = codigoTurma.selectionStart;
        codigoTurma.value = (codigoTurma.value || '').toUpperCase();
        // tenta manter o cursor
        try { codigoTurma.setSelectionRange(pos, pos); } catch (_) {}
      });
    }

  }); // DOMContentLoaded
})();
