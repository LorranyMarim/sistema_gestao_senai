
    // ========= Abrir o modal Bootstrap ao clicar no botão "Adicionar Nova Turma" =========
    const addBtn = document.getElementById('addTurmaBtn');
    const modalEl = document.getElementById('addTurmaModal');
    const turmaModal = new bootstrap.Modal(modalEl, { backdrop: 'static' });

    addBtn.addEventListener('click', () => {
      turmaModal.show();
    });

    // ========= Lógica do Stepper =========
    (function () {
      const header = document.getElementById('stepperHeader');
      const items = Array.from(header.querySelectorAll('.stepper-item'));
      const panes = Array.from(document.querySelectorAll('.step-pane'));
      const progress = document.getElementById('progressLine');
      const btnNext = document.getElementById('btn-next');
      const btnBack = document.getElementById('btn-back');

      const total = items.length;
      let current = 1;

      // Campos para o resumo
      const fields = {
        instituicaoTurma: () => document.getElementById('instituicaoTurma').value,
        codigoTurma:      () => document.getElementById('codigoTurma').value,
        cursoTurma:       () => document.getElementById('cursoTurma').value,
        empresaTurma:     () => document.getElementById('empresaTurma').value,
        calendarioTurma:  () => document.getElementById('calendarioTurma').value,
        dataInicio:       () => document.getElementById('dataInicio').value,
        dataFim:          () => document.getElementById('dataFim').value,
        turnoTurma:       () => document.getElementById('turnoTurma').value,
        quantidadeAlunos: () => document.getElementById('quantidadeAlunos').value,
        statusTurma:      () => document.getElementById('statusTurma').value,
        ucTurma1:         () => document.getElementById('ucTurma1').value,
        instrutorTurma1:  () => document.getElementById('instrutorTurma1').value,
      };

      function setActive(step) {
        current = Math.min(Math.max(step, 1), total);

        items.forEach((el) => {
          const n = Number(el.dataset.step);
          el.classList.toggle('active', n === current);
          el.classList.toggle('completed', n < current);
        });

        panes.forEach((p) => {
          const n = Number(p.dataset.step);
          p.classList.toggle('active', n === current);
        });

        const pct = ((current - 1) / (total - 1)) * 100;
        updateProgressBar(pct);

        btnBack.disabled = current === 1;
        btnNext.textContent = current === total ? 'Concluir' : 'Próximo';
      }

      // Barra de progresso (::after)
      const styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
      function updateProgressBar(pct) {
        styleEl.textContent = `#progressLine::after { width: ${pct}%; }`;
      }

      function validateStep(step) {
        const pane = panes.find(p => Number(p.dataset.step) === step);
        if (!pane) return true;
        const required = Array.from(pane.querySelectorAll('[required]'));
        for (const el of required) {
          if (!el.value || el.value === '') {
            el.classList.add('is-invalid');
            el.addEventListener('input', () => el.classList.remove('is-invalid'), { once: true });
            if (typeof el.focus === 'function') el.focus();
            return false;
          }
        }
        return true;
      }

      function buildSummary() {
        const summaryArea = document.getElementById('summaryArea');
        const data = {
          'Instituição':            fields.instituicaoTurma(),
          'Código da Turma':        fields.codigoTurma(),
          'Curso':                  fields.cursoTurma(),
          'Empresa/Parceiro':       fields.empresaTurma(),
          'Calendário':             fields.calendarioTurma(),
          'Data de Início':         fields.dataInicio(),
          'Data de Fim':            fields.dataFim(),
          'Turno':                  fields.turnoTurma(),
          'Quantidade de Alunos':   fields.quantidadeAlunos(),
          'Status da Turma':        fields.statusTurma(),
          'Unidade Curricular':     fields.ucTurma1(),
          'Instrutor':              fields.instrutorTurma1(),
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

      btnNext.addEventListener('click', () => {
        if (current < total) {
          if (!validateStep(current)) return;
          if (current + 1 === total) buildSummary();
          setActive(current + 1);
        } else {
          // Aqui você pode enviar dados para backend
          turmaModal.hide();
          setTimeout(() => alert('Cadastro concluído!'), 100);
        }
      });

      btnBack.addEventListener('click', () => setActive(current - 1));

      // Navegar clicando no cabeçalho do stepper (opcional)
      items.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          const step = Number(item.dataset.step);
          if (step === current) return;
          if (step > current && !validateStep(current)) return;
          if (step === total) buildSummary();
          setActive(step);
        });
      });

      // Sempre que abrir o modal, resetar para o passo 1
      modalEl.addEventListener('show.bs.modal', () => {
        setActive(1);
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
      });
    })();
  