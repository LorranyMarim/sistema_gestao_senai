<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Gestão de Turmas - SENAI</title>

  <!-- Tailwind (já usava) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Font Awesome (já usava) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"/>

  <!-- Bootstrap CSS (novo, necessário para o modal/stepper) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>

  <!-- Seu CSS -->
  <link rel="stylesheet" href="../assets/css/style_turmas.css" />

  <style>
    /* ---------------------------------------------------------
       IMPORTANTE: Seu CSS antigo usava .modal (conflito com Bootstrap).
       Renomeei/escopi para .app-modal-* só se você ainda precisar
       daquele modal custom (não-Bootstrap). Se não precisar, pode remover.
       --------------------------------------------------------- */
    body.app-modal-open { overflow: hidden; }
    .main-content { position: relative; }
    .app-modal-overlay {
      display: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,.3);
      align-items: center;
      justify-content: center;
      z-index: 20;
    }
    .app-modal-overlay.show { display: flex !important; }
    .app-modal-content {
      background: #fff;
      border-radius: 10px;
      padding: 30px;
      width: min(720px, 92%);
      max-height: 80vh;
      overflow: auto;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,.15);
    }

    /* ====== Estilos do Stepper (para o modal Bootstrap) ====== */
    .stepper-container { position: relative; padding: 10px 8px 0 8px; }
    .steper-box { position: relative; z-index: 2; gap: 6px; }
    .progress-line {
      position: absolute; top: 27px; left: 16px; right: 16px; height: 4px;
      background: #e9ecef; z-index: 1; border-radius: 999px; overflow: hidden;
    }
    .progress-line::after {
      content: ""; display: block; height: 100%; width: 0%;
      background: #0d6efd; transition: width 220ms ease;
    }
    .stepper-item { display: grid; justify-items: center; text-align: center; min-width: 70px; }
    .stepper-circle {
      width: 34px; height: 34px; border-radius: 50%; border: 2px solid #adb5bd;
      display: grid; place-items: center; font-weight: 600; color: #6c757d; background: #fff;
      transition: all 180ms ease;
    }
    .stepper-title { margin-top: 6px; font-size: 0.85rem; color: #6c757d; max-width: 120px; }
    .stepper-item.active .stepper-circle {
      border-color: #0d6efd; color: #0d6efd; box-shadow: 0 0 0 4px rgba(13,110,253,.12);
    }
    .stepper-item.completed .stepper-circle { background: #0d6efd; border-color: #0d6efd; color: #fff; }
    .stepper-item.active .stepper-title,
    .stepper-item.completed .stepper-title { color: #212529; font-weight: 600; }
    .step-pane { display: none; }
    .step-pane.active { display: block; }
    .form-label { font-weight: 600; }
    .summary-table th { width: 30%; white-space: nowrap; }
    .summary-table td, .summary-table th { vertical-align: top; }
  </style>
</head>

<body>
  <div class="dashboard-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Logo SENAI" class="sidebar-logo">
        <h3>Menu Principal</h3>
      </div>
      <nav class="sidebar-nav">
        <ul>
          <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
          <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php" class="active"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i>Gestão de Calendários</a></li>
          <li id="nav-relatorios" class="has-submenu">
            <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
              <span><i class="fas fa-file-alt"></i> Relatórios</span>
              <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
            </a>
            <ul class="submenu" id="submenu-relatorios">
              <li><a href="relatorio_disponibilidade_instrutor.php">Disponibilidade de Instrutor</a></li>
            </ul>
          </li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
      <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>

      <header class="main-header">
        <h1>Gestão de Turmas</h1>
        <!-- ESTE BOTÃO ABRIRÁ O MODAL BOOTSTRAP -->
        <button class="btn btn-primary" id="addTurmaBtn">
          <i class="fas fa-plus-circle"></i> Adicionar Nova Turma
        </button>
      </header>

      <section class="table-section">
        <h2>Turmas Cadastradas</h2>

        <div class="table-responsive">
          <table class="data-table" id="turmasTable">
            <thead>
              <tr>
                <th>Código</th>
                <th>Turno</th>
                <th>Eixo Tecnologico</th>
                <th>Empresa/Parceiro</th>
                <th>STATUS</th>
                <th>CRIADO EM</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody><!-- preenchido via JS --></tbody>
          </table>

          <div class="pagination-bar" style="display:flex; align-items:center; gap:10px; margin-top:10px;">
            <button class="btn btn-secondary" id="prevPage">Anterior</button>
            <span id="pageInfo">Página 1 de 1 • 0 registros</span>
            <button class="btn btn-secondary" id="nextPage">Próximo</button>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- ======================= MODAL BOOTSTRAP COM STEPPER ======================= -->
  <div class="modal fade" id="addTurmaModal" tabindex="-1" aria-labelledby="stepperModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">

        <div class="modal-header">
          <h5 class="modal-title" id="stepperModalLabel">Cadastrar Turma</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
        </div>

        <div class="modal-body">
          <!-- STEPPER HEADER -->
          <div class="stepper-container">
            <div class="progress-line" id="progressLine"></div>
            <div class="d-flex justify-content-between align-items-center steper-box" id="stepperHeader">
              <div class="stepper-item active" data-step="1">
                <div class="stepper-circle">1</div>
                <div class="stepper-title">Dados do Curso</div>
              </div>
              <div class="stepper-item" data-step="2">
                <div class="stepper-circle">2</div>
                <div class="stepper-title">Datas/Calendários</div>
              </div>
              <div class="stepper-item" data-step="3">
                <div class="stepper-circle">3</div>
                <div class="stepper-title">Informações Gerais</div>
              </div>
              <div class="stepper-item" data-step="4">
                <div class="stepper-circle">4</div>
                <div class="stepper-title">Instrutor por UCs</div>
              </div>
              <div class="stepper-item" data-step="5">
                <div class="stepper-circle">5</div>
                <div class="stepper-title">Confirmação</div>
              </div>
            </div>
          </div>

          <!-- STEPPER CONTENT -->
          <div class="step-content mt-4">
            <!-- Passo 1 -->
            <div class="step-pane active" data-step="1">
              <div class="mb-3">
                <label for="instituicaoTurma" class="form-label">Instituição</label>
                <select id="instituicaoTurma" class="form-select" required>
                  <option value="">Selecione</option>
                  <option>Instituição A</option>
                  <option>Instituição B</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="codigoTurma" class="form-label">Código da Turma</label>
                <input type="text" id="codigoTurma" class="form-control" style="text-transform: uppercase;" required />
              </div>
              <div class="mb-3">
                <label for="cursoTurma" class="form-label">Curso</label>
                <select id="cursoTurma" class="form-select" required>
                  <option value="">Selecione</option>
                  <option>Desenvolvimento de Sistemas</option>
                  <option>Eletrotécnica</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="empresaTurma" class="form-label">Empresa/Parceiro</label>
                <select id="empresaTurma" class="form-select" required>
                  <option value="">Selecione</option>
                  <option>Empresa X</option>
                  <option>Empresa Y</option>
                </select>
              </div>
            </div>

            <!-- Passo 2 -->
            <div class="step-pane" data-step="2">
              <div class="mb-3">
                <label for="calendarioTurma" class="form-label">Calendário Acadêmico</label>
                <select id="calendarioTurma" class="form-select" required>
                  <option value="">Selecione</option>
                  <option>2025 - Regular</option>
                  <option>2025 - Intensivo</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="dataInicio" class="form-label">Data de Início</label>
                <input type="date" id="dataInicio" class="form-control" required />
              </div>
              <div class="mb-3">
                <label for="dataFim" class="form-label">Data de Fim</label>
                <input type="date" id="dataFim" class="form-control" required />
              </div>
            </div>

            <!-- Passo 3 -->
            <div class="step-pane" data-step="3">
              <div class="mb-3">
                <label for="turnoTurma" class="form-label">Turno</label>
                <select id="turnoTurma" class="form-select" required>
                  <option value="">Selecione o turno</option>
                  <option value="MANHÃ">Manhã</option>
                  <option value="TARDE">Tarde</option>
                  <option value="NOITE">Noite</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="quantidadeAlunos" class="form-label">Quantidade de Alunos</label>
                <input type="number" id="quantidadeAlunos" class="form-control" min="1" required />
              </div>
              <div class="mb-3">
                <label for="statusTurma" class="form-label">Status</label>
                <select id="statusTurma" class="form-select" required>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <!-- Passo 4 (com Instrutor) -->
            <div class="step-pane" data-step="4">
              <div class="row g-3 align-items-end">
                <div class="col-md-6">
                  <label for="ucTurma1" class="form-label">Unidade Curricular</label>
                  <select id="ucTurma1" class="form-select" required>
                    <option value="">Selecione...</option>
                    <option>Lógica de Programação</option>
                    <option>Banco de Dados</option>
                    <option>Desenvolvimento Web</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="instrutorTurma1" class="form-label">Instrutor</label>
                  <select id="instrutorTurma1" class="form-select" required>
                    <option value="">Selecione...</option>
                    <option>Juliano</option>
                    <option>Cassio</option>
                    <option>Priscila</option>
                    <option>Edson</option>
                  </select>
                </div>
              </div>
              <small class="text-muted d-block mt-2">
                * Neste exemplo há um único pareamento UC → Instrutor.
              </small>
            </div>

            <!-- Passo 5 (Confirmação com resumo) -->
            <div class="step-pane" data-step="5">
              <h5 class="mb-3">Confirmação</h5>
              <div id="summaryArea"><!-- Preenchido via JS --></div>
            </div>
          </div>
        </div>

        <div class="modal-footer d-flex justify-content-between">
          <button type="button" class="btn btn-secondary" id="btn-back" disabled>Voltar</button>
          <button type="button" class="btn btn-primary" id="btn-next">Próximo</button>
        </div>
      </div>
    </div>
  </div>
  <!-- ===================== /MODAL BOOTSTRAP ===================== -->

  <!-- Bootstrap JS (necessário para Modal) -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <!-- Seus scripts (se existirem) -->
  <script src="../assets/js/geral.js"></script>
  <script src="../assets/js/gestao_turmas.js"></script>

  <script>
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
  </script>
</body>
</html>
