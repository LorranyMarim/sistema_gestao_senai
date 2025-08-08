<?php
// Não carrega dados mocados; tudo via AJAX/REST do FastAPI!
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestão de Turmas - SENAI</title>
  <link rel="stylesheet" href="../css/style_turmas.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/css/select2.min.css" />
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css" />
  <style>
    /* Stepper e Accordion das UCs */
    .stepper-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      /* MANTÉM O ALINHAMENTO VERTICAL */
      margin-bottom: 30px;
      position: relative;
      z-index: 1;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      /* GARANTE CENTRALIZAÇÃO VERTICAL DO CÍRCULO */
      position: relative;
      flex: 1 1 0;
      min-width: 0;
      min-height: 32px;
      /* GARANTE ALTURA IGUAL AO CÍRCULO */
    }

    .step-item:not(:first-child)::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -50%;
      width: 100%;
      height: 3px;
      background-color: var(--cor-borda, #dee2e6);
      z-index: 0;
      transform: translateY(-50%);
      transition: background-color .4s;
      pointer-events: none;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #fff;
      border: 3px solid var(--cor-borda, #dee2e6);
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      color: var(--cor-borda, #dee2e6);
      font-size: 1.2rem;
      box-shadow: 0 1px 6px rgba(0, 0, 0, .04);
      z-index: 1;
      transition: background .4s, color .4s, border .4s;
    }

    .step-item.active .step-circle,
    .step-item.completed .step-circle {
      background-color: var(--cor-primaria, #007BFF);
      color: #fff;
      border-color: var(--cor-primaria, #007BFF);
    }

    .step-item.active:not(:first-child)::before,
    .step-item.completed:not(:first-child)::before {
      background-color: var(--cor-primaria, #007BFF);
    }

    .step-item.completed .step-circle {
      background: linear-gradient(135deg, var(--cor-primaria, #007BFF) 80%, #fff 100%);
      color: #fff;
      border-color: var(--cor-primaria, #007BFF);
      box-shadow: 0 1px 10px rgba(0, 123, 255, .08);
    }

    .step-label {
      margin-top: 8px;
      font-size: .97rem;
      color: #888;
      font-weight: 500;
      text-align: center;
    }

    @media (max-width:480px) {
      .step-circle {
        width: 22px;
        height: 22px;
        font-size: .85rem;
      }

      .step-label {
        font-size: .82rem;
      }

      .step-item {
        min-height: 22px;
      }
    }

    .uc-remove-btn {
      background: #e3342f;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 12px;
      transition: background 0.2s;
      cursor: pointer;
      font-size: 18px;
      outline: none;
    }

    .uc-remove-btn:hover {
      background: #c82333;
    }

    /* Accordion UCs */
    .uc-accordion {
      border: 1px solid #ccc;
      border-radius: 7px;
      margin-bottom: 12px;
      background: #fff;
    }

    .uc-accordion-header {
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 8px 12px;
    }

    .uc-accordion-header span {
      flex: 1;
    }

    .uc-accordion-header i {
      transition: .2s;
    }

    .uc-accordion-header.open i {
      transform: rotate(90deg);
    }

    .uc-accordion-content {
      display: none;
      padding: 12px;
      border-top: 1px solid #eee;
    }

    .uc-accordion.open .uc-accordion-content {
      display: block;
    }

    .btn-add-remove {
      margin: 0 3px;
    }

    .form-step {
      display: none;
    }

    .form-step.active {
      display: block;
    }

    .table-section { position: relative; }
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
          <li><a href="gestao_turmas.php" class="active"><i class="fas fa-users"></i> Gestão de Turmas</a>
          </li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
              Instrutores</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de
              UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
    </aside>
    <main class="main-content">
      <header class="main-header">
        <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>
        <h1>Gestão de Turmas</h1>
        <button class="btn btn-primary" id="addTurmaBtn"><i class="fas fa-plus-circle"></i> Adicionar Turma</button>
      </header>

      <section class="table-section">
        <h2>Turmas Cadastradas</h2>

        <!-- Filtros (input-group + selects). Persistência via query string -->
        <div class="filter-section" id="turmas-filtros">
          <div class="filter-group" style="min-width:260px">
            <label for="q">Busca</label>
            <div class="input-group">
              <input id="q" type="text" class="search-input" placeholder="Código, empresa..." aria-label="Buscar">
            </div>
          </div>

          <div class="filter-group">
            <label for="fCurso">Curso</label>
            <select id="fCurso" class="search-input">
              <option value="">Todos</option>
              <!-- options populadas via JS a partir de dadosCursos -->
            </select>
          </div>

          <div class="filter-group" style="max-width:180px">
            <label for="fTurno">Turno</label>
            <select id="fTurno" class="search-input">
              <option value="">Todos</option>
              <option value="MANHÃ">Manhã</option>
              <option value="TARDE">Tarde</option>
              <option value="NOITE">Noite</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Período</label>
            <div class="input-group" style="gap:.5rem">
              <input id="fInicio" type="date" class="search-input" aria-label="Data inicial">
              <input id="fFim" type="date" class="search-input" aria-label="Data final">
            </div>
          </div>

          <div class="filter-group" style="max-width:140px">
            <label for="pageSize">Por página</label>
            <select id="pageSize" class="search-input">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div class="filter-group" style="max-width:120px">
            <label>&nbsp;</label>
            <button id="btnLimpar" class="btn btn-secondary">Limpar</button>
          </div>
        </div>

        <!-- Tabela responsiva -->
        <div class="table-responsive">
          <table class="data-table table table-hover">
            <thead>
              <tr>
                <th aria-hidden="true" style="width:42px"></th>
                <th role="button" data-sort="codigo" aria-sort="none">Código <span aria-hidden="true">↕</span></th>
                <th role="button" data-sort="turno" aria-sort="none">Turno <span aria-hidden="true">↕</span></th>
                <th role="button" data-sort="data_inicio" aria-sort="ascending">Início <span aria-hidden="true">↕</span>
                </th>
                <th role="button" data-sort="data_fim" aria-sort="none">Fim <span aria-hidden="true">↕</span></th>
                <th>Curso</th>
                <th>Empresa</th>
                <th role="button" data-sort="status" aria-sort="none">Status <span aria-hidden="true">↕</span></th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody id="tblTurmas"></tbody>
          </table>
        </div>

        <!-- Paginação + contagem -->
        <div class="d-flex"
          style="display:flex;gap:.75rem;align-items:center;justify-content:space-between;margin-top:.75rem;flex-wrap:wrap">
          <small id="rangeInfo" class="text-muted">Mostrando 0–0 de 0</small>
          <nav aria-label="Paginação de turmas">
            <ul class="pagination" id="pager" style="display:flex;gap:.25rem;list-style:none;margin:0;padding:0"></ul>
          </nav>
        </div>

        <!-- Spinner (feedback de carregamento) -->
        <div id="loading"
          style="display:none;position:absolute;inset:0;backdrop-filter:saturate(0.5) blur(1px);align-items:center;justify-content:center">
          <div class="spinner-border" role="status" aria-label="Carregando…"
            style="width:3rem;height:3rem;border:.35rem solid #ddd;border-top-color:#007BFF;border-radius:50%;animation:spin .8s linear infinite">
          </div>
        </div>

        <!-- Toasts (erros) -->
        <div id="toastArea" aria-live="polite" aria-atomic="true"
          style="position:fixed;right:1rem;bottom:1rem;display:flex;flex-direction:column;gap:.5rem;z-index:1100"></div>
      </section>
    </main>

    <style>
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    </style>

  </div>

  <!-- Modal Multi-step de Turma -->
  <div id="turmaFormModal" class="modal" style="display:none;">
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="modalTitle">Cadastrar Turma</h2>
        <button class="close-button" id="closeFormModalBtn">&times;</button>
      </header>
      <div class="modal-body">
        <div class="stepper-wrapper">
          <div class="step-item active">
            <div class="step-circle">1</div>
            <div class="step-label">Dados Básicos</div>
          </div>
          <div class="step-item">
            <div class="step-circle">2</div>
            <div class="step-label">Detalhes</div>
          </div>
          <div class="step-item">
            <div class="step-circle">3</div>
            <div class="step-label">Confirmação</div>
          </div>
        </div>
        <form id="multiStepForm" novalidate>
          <!-- Step 1 -->
          <div class="form-step active" data-step="1">
            <div class="form-group"><label for="codigoTurma">Código da Turma:</label><input type="text" id="codigoTurma"
                required></div>
            <div class="form-group"><label for="curso">Curso:</label>
              <select id="curso" required></select>
            </div>
            <div class="form-group"><label for="dataInicio">Data de Início:</label><input type="date" id="dataInicio"
                required></div>
            <div class="form-group"><label for="dataFim">Data de Término:</label><input type="date" id="dataFim"
                required></div>
          </div>
          <!-- Step 2 -->
          <div class="form-step" data-step="2">
            <div class="form-group"><label for="turno">Turno:</label>
              <select id="turno" required>
                <option value="">Selecione</option>
                <option value="MANHÃ">Manhã</option>
                <option value="TARDE">Tarde</option>
                <option value="NOITE">Noite</option>
              </select>
            </div>
            <div class="form-group"><label for="numAlunos">Número de Alunos:</label><input type="number" id="numAlunos"
                min="1" required></div>
            <div class="form-group"><label for="instituicao">Instituição:</label>
              <select id="instituicao" required></select>
            </div>
            <div class="form-group"><label for="calendario">Calendário:</label>
              <select id="calendario" required></select>
            </div>
            <div class="form-group"><label for="empresa">Empresa:</label>
              <select id="empresa" required></select>
            </div>
          </div>
          <!-- Step 3 -->
          <div class="form-step" data-step="3">
            <div class="form-group"><label>Código da Turma:</label><input type="text" id="codigoTurmaConf" disabled>
            </div>
            <div class="form-group"><label>Curso:</label><input type="text" id="cursoConf" disabled></div>
            <div class="form-group"><label>Categoria:</label><input type="text" id="categoriaConf" disabled>
            </div>
            <div class="form-group"><label>Modalidade:</label><input type="text" id="modalidadeConf" disabled></div>
            <div class="form-group"><label>Tipo:</label><input type="text" id="tipoConf" disabled></div>
            <div class="form-group"><label>Carga Horária:</label><input type="text" id="cargaHorariaConf" disabled>
            </div>
            <div class="form-group"><label>Eixo Tecnológico:</label><input type="text" id="eixoTecConf" disabled></div>
            <div class="form-group"><label>Data de Início:</label><input type="date" id="dataInicioConf" disabled></div>
            <div class="form-group"><label>Data de Término:</label><input type="date" id="dataFimConf" disabled></div>
            <div class="form-group"><label>Turno:</label><input type="text" id="turnoConf" disabled></div>
            <div class="form-group"><label>Nº de Alunos:</label><input type="number" id="numAlunosConf" disabled></div>
            <div class="form-group"><label>Instituição:</label><input type="text" id="instituicaoConf" disabled></div>
            <div class="form-group"><label>Calendário:</label><input type="text" id="calendarioConf" disabled></div>
            <div class="form-group"><label>Empresa:</label><input type="text" id="empresaConf" disabled>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancelar</button>
            <button type="button" class="btn btn-secondary" id="prevBtn" style="display:none;">Voltar</button>
            <button type="button" class="btn btn-primary" id="nextBtn">Próximo</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div id="turmaViewModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="tituloTurmaView" style="display:none;">
  <div class="modal-content">
    <header class="modal-header">
      <h2 id="tituloTurmaView">Detalhes da Turma</h2>
      <button class="close-button" id="closeTurmaViewBtn" aria-label="Fechar">&times;</button>
    </header>
      <div class="modal-body">
        <dl class="detail-list">
          <div>
            <dt>Código da Turma</dt>
            <dd id="vwCodigo">—</dd>
          </div>
          <div>
            <dt>Curso</dt>
            <dd id="vwCurso">—</dd>
          </div>
          <div>
            <dt>Data de Início</dt>
            <dd id="vwInicio">—</dd>
          </div>
          <div>
            <dt>Data de Término</dt>
            <dd id="vwFim">—</dd>
          </div>
          <div>
            <dt>Turno</dt>
            <dd id="vwTurno">—</dd>
          </div>
          <div>
            <dt>Número de Alunos</dt>
            <dd id="vwNumAlunos">—</dd>
          </div>
          <div>
            <dt>Instituição</dt>
            <dd id="vwInstituicao">—</dd>
          </div>
          <div>
            <dt>Calendário</dt>
            <dd id="vwCalendario">—</dd>
          </div>
          <div>
            <dt>Empresa</dt>
            <dd id="vwEmpresa">—</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd id="vwStatus">—</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>

  <style>
    /* Layout enxuto do "apenas texto" */
    .detail-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: .5rem;
    }

    .detail-list dt {
      font-weight: 600;
      color: #6b7280;
    }

    .detail-list dd {
      margin: 0;
      font-weight: 500;
    }

    .detail-list>div {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: .5rem;
    }

    @media (max-width: 520px) {
      .detail-list>div {
        grid-template-columns: 1fr;
      }
    }
  </style>

  <!-- MODAL UC -->
  <div id="ucModal" class="modal" style="display:none;">
    <div class="modal-content">
      <header class="modal-header">
        <h2>Cadastrar Unidades Curriculares na Turma</h2>
        <button class="close-button" id="closeUcModalBtn">&times;</button>
      </header>
      <div class="modal-body">
        <h3>Ordem das Unidades Curriculares da Turma</h3>
        <div id="uc-rows-container"></div>
        <div style="text-align:right;margin-top:10px;">
          <button type="button" class="btn btn-primary" id="addUcBtn"><i class="fas fa-plus"></i> Adicionar
            UC</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancelUcBtn">Cancelar</button>
        <button type="button" class="btn btn-primary" id="saveUcBtn">Cadastrar Unidades Curriculares</button>
      </div>
    </div>
  </div>

  <script src="script_turma.js"></script>





</body>

</html>