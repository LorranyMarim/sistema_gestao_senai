<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Gestão de Instrutores - SENAI</title>

  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Select2 -->
  <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

  <style>
    /* ---- Evita scroll do body enquanto modal estiver aberto ---- */
    body.modal-open { overflow: hidden; }

    /* ---- Modal centralizado e limitado ao MAIN (responsivo) ---- */
    .main-content { position: relative; }

    .modal {
      display: none;
      position: absolute;   /* limita ao main */
      inset: 0;             /* top/right/bottom/left = 0 dentro do main */
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,.3);
      align-items: center;
      justify-content: center;
      z-index: 20;          /* acima do conteúdo do main */
    }
    .modal.show { display: flex !important; }

    .modal-content {
      background: #fff;
      border-radius: 10px;
      padding: 30px;
      width: min(720px, 92%);
      max-height: 80vh;
      overflow: auto;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,.15);
    }
    .close-button {
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: 1.6em;
      cursor: pointer;
      line-height: 1;
    }

    .alert-error, .alert-success {
      margin: 10px 0 0 0;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 1em;
    }
    .alert-error { background: #fde2e1; color: #b20000; }
    .alert-success { background: #e7f8e2; color: #227b2f; }

    .form-group label { font-weight: bold; }
    .action-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
    }

    /* ---- Responsividade leve de inputs ---- */
    .select2-container { width: 100% !important; }
    @media (max-width: 640px) {
      .modal-content { padding: 18px; }
      .form-group label { display:block; margin-bottom:6px; }
      .search-input { width: 100%; }
    }

    /* ============================
       Ocultar colunas na tabela:
       1 = ID
       4 = Telefone
       5 = Email
       6 = Instituição
       (mantém a ordem original do THEAD)
       ============================ */
    .data-table th:nth-child(1), .data-table td:nth-child(1),
    .data-table th:nth-child(4), .data-table td:nth-child(4),
    .data-table th:nth-child(5), .data-table td:nth-child(5),
    .data-table th:nth-child(6), .data-table td:nth-child(6) {
      display: none;
    }
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
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php" class="active"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
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
          <li id="nav-config" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-config">
                            <span><i class="fas fa-tools"></i> Configuração</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-config">
                            <li><a href="configuracao_usuarios.php"> Usuários</a></li>
                        </ul>
                    </li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
      <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>

      <header class="main-header">
        <h1>Gestão de Instrutores</h1>
        <button class="btn btn-primary" id="addInstrutorBtn">
          <i class="fas fa-plus-circle"></i> Adicionar Novo Instrutor
        </button>
      </header>

      <section class="table-section">
        <h2>Instrutores Cadastrados</h2>

        <div class="filter-section">
          <div class="filter-group">
            <label for="searchInstrutor">Buscar Instrutor:</label>
            <input type="text" id="searchInstrutor" placeholder="Busque por Nome, Matrícula ou E-mail" class="search-input">
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome do Instrutor</th>
                <th>Matrícula</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Instituição</th>
                <th>Turnos</th>
                <th>Categoria</th>
                <th>Carga Horária</th>
                <th>Status</th>
                <th>Criado em</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody><!-- preenchido pelo JS --></tbody>
          </table>
        </div>
      </section>
    

  <!-- Modal de Cadastro/Edição -->
  <div id="instrutorModal" class="modal">
    <div class="modal-content">
      <span class="close-button" id="closeInstrutorModal">&times;</span>
      <h2 id="modalTitle">Adicionar Novo Instrutor</h2>

      <!-- container de alert inline -->
      <div id="alertInstrutor" style="display:none" class="alert-error"></div>

      <form id="instrutorForm" autocomplete="off">
  <input type="hidden" id="instrutorId">

  <!-- 1) Instituição -->
  <div class="form-group">
    <label for="instituicaoId">Instituição:</label>
    <select id="instituicaoId" required>
      <option value="">Selecione</option>
    </select>
  </div>

  <!-- 2) Nome -->
  <div class="form-group">
    <label for="nomeInstrutor">Nome do Instrutor:</label>
    <input type="text" id="nomeInstrutor" required minlength="3" maxlength="100">
  </div>

  <!-- 3) Matrícula -->
  <div class="form-group">
    <label for="matriculaInstrutor">Matrícula:</label>
    <input type="text" id="matriculaInstrutor" required minlength="3" maxlength="20"
           pattern="^[A-Za-z0-9._-]{3,20}$"
           title="Letras, números, ponto, hífen e underline (3–20).">
  </div>

  <div class="form-group">
    <label for="categoriaInstrutor">Categoria do Instrutor:</label>
    <select id="categoriaInstrutor" multiple="multiple" style="width: 100%" required>
      <option value="A">A</option>
      <option value="C">C</option>
    </select>
  </div>

  <!-- 4) Carga Horária -->
  <div class="form-group">
    <label for="cargaHoraria">Carga Horária (horas):</label>
    <input type="number" id="cargaHoraria" required min="1" max="60" step="1">
  </div>

  <!-- 5) Telefone (opcional) -->
  <div class="form-group">
    <label for="instrutorTelefone">Telefone:</label>
    <input type="text" id="instrutorTelefone" inputmode="tel" placeholder="(11) 98765-4321">
  </div>

  <!-- 6) Email -->
  <div class="form-group">
    <label for="instrutorEmail">Email:</label>
    <input type="email" id="instrutorEmail" required>
  </div>

  <!-- 7) Turno (multiselect) -->
  <div class="form-group">
    <label for="turnosInstrutor">Turnos:</label>
    <select id="turnosInstrutor" multiple="multiple" style="width: 100%" required>
      <option value="Manhã">Manhã</option>
      <option value="Tarde">Tarde</option>
      <option value="Noite">Noite</option>
    </select>
  </div>

  <!-- 8) Mapa de Competência (multiselect) -->
  <div class="form-group">
    <label for="mapaCompetencia">Mapa de Competência (UCs):</label>
    <select id="mapaCompetencia" multiple="multiple" style="width: 100%" required></select>
  </div>

  <!-- 9) Status (NOVO) -->
  <div class="form-group">
    <label for="statusInstrutor">Status:</label>
    <select id="statusInstrutor" required>
      <option value="Ativo" selected>Ativo</option>
      <option value="Inativo">Inativo</option>
    </select>
  </div>

  <button type="button" class="btn btn-secondary" id="cancelBtn">
    <i class="fas fa-times-circle"></i> Cancelar
  </button>
    <button type="submit" class="btn btn-primary" id="btnSalvarInstrutor">
    <i class="fas fa-save"></i> Salvar Instrutor
  </button>
</form>

    </div>
  </div>

  <!-- Modal Visualizar Instrutor -->
  <div id="visualizarInstrutorModal" class="modal">
    <div class="modal-content">
      <span class="close-button" id="closeVisualizarInstrutor">&times;</span>
      <h2>Detalhes do Instrutor</h2>
      <form>
        <div class="form-group">
          <label>Instituição:</label>
          <input type="text" id="viewInstituicao" readonly>
        </div>
        <div class="form-group">
          <label>Nome do Instrutor:</label>
          <input type="text" id="viewNomeInstrutor" readonly>
        </div>
        <div class="form-group">
          <label>Matrícula:</label>
          <input type="text" id="viewMatriculaInstrutor" readonly>
        </div>
        <div class="form-group">
          <label>Carga Horária:</label>
          <input type="text" id="viewCargaHoraria" readonly>
        </div>
        <div class="form-group">
          <label>Categoria do Instrutor:</label>
          <input type="text" id="viewCategoria" readonly>
        </div>
        <div class="form-group">
          <label>Telefone:</label>
          <input type="text" id="viewTelefone" readonly>
        </div>
        <div class="form-group">
          <label>Email:</label>
          <input type="text" id="viewEmail" readonly>
        </div>
        <div class="form-group">
          <label>Turnos:</label>
          <input type="text" id="viewTurnosInstrutor" readonly>
        </div>
        <div class="form-group">
          <label>Mapa de Competência:</label>
          <div id="viewMapaCompetenciaList" style="padding: 4px 0;"></div>
        </div>
        <button type="button" class="btn btn-secondary" id="fecharVisualizarInstrutor">Fechar</button>
      </form>
    </div>
  </div>
  </main>
  </div>

  <script src="../assets/js/geral_script.js"></script>
  <script src="../assets/js/instrutores_script.js"></script>
</body>
</html>
