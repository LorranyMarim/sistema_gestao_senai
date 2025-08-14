<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Gestão de Empresas - SENAI</title>

  <link rel="stylesheet" href="../assets/css/style_turmas.css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"/>

  <style>
    /* ---- Evita scroll do body enquanto modal estiver aberto ---- */
    body.modal-open { overflow: hidden; }

    /* ---- Modal centralizado e limitado ao MAIN ---- */
    .main-content { position: relative; }

    .modal {
      display: none;
      position: absolute;      /* limita ao main */
      inset: 0;                /* top/right/bottom/left = 0 dentro do main */
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,.3);
      align-items: center;
      justify-content: center;
      z-index: 20;             /* acima do conteúdo do main */
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

    /* ---- Ocultar colunas: 1 = ID, 4 = Instituição ---- */
    #empresasTable th:nth-child(1),
    #empresasTable td:nth-child(1),
    #empresasTable th:nth-child(4),
    #empresasTable td:nth-child(4) {
      display: none;
    }
  </style>
</head>

<body>
  <div class="dashboard-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Logo SENAI" class="sidebar-logo" />
        <h3>Menu Principal</h3>
      </div>
      <nav class="sidebar-nav">
        <ul>
          <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
          <li><a href="gestao_cursos.php"><i class="fas a-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_empresas.php" class="active"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
      <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>

      <header class="main-header">
        <h1>Gestão de Empresas</h1>
        <button class="btn btn-primary" id="addEmpresaBtn">
          <i class="fas fa-plus-circle"></i> Adicionar Nova Empresa
        </button>
      </header>

      <section class="table-section">
        <h2>Empresas / Parceiros</h2>

        <!-- Filtros -->
        <div class="filter-section" style="display:flex; flex-wrap:wrap; gap:12px; align-items:end;">
          <div class="filter-group">
            <label for="searchEmpresa">Buscar:</label>
            <input type="text" id="searchEmpresa" placeholder="Razão social ou CNPJ..." class="search-input"/>
          </div>

          <div class="filter-group">
            <label for="filterInstituicao">Instituição:</label>
            <select id="filterInstituicao" style="min-width:220px">
              <!-- preenchido via JS -->
            </select>
          </div>

          <div class="filter-group">
            <label for="filterStatus">Status:</label>
            <select id="filterStatus">
              <option value="">Todas</option>
              <option value="Ativa">Ativas</option>
              <option value="Inativa">Inativas</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="pageSize">Itens por página:</label>
            <select id="pageSize">
              <option value="10" selected>10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="empresasTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Instituição</th>
                <th>STATUS</th>
                <th>CRIADO EM</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody><!-- preenchido via JS --></tbody>
          </table>

          <!-- Paginação -->
          <div class="pagination-bar" style="display:flex; align-items:center; gap:10px; margin-top:10px;">
            <button class="btn btn-secondary" id="prevPage">Anterior</button>
            <span id="pageInfo">Página 1 de 1 • 0 registros</span>
            <button class="btn btn-secondary" id="nextPage">Próximo</button>
          </div>
        </div>
      </section>

      <!-- Modal de Cadastro/Edição -->
      <div id="empresaModal" class="modal" aria-modal="true" role="dialog">
        <div class="modal-content">
          <span class="close-button" id="closeEmpresaModal" title="Fechar">&times;</span>
          <h2 id="modalTitle">Adicionar Nova Empresa</h2>

          <form id="empresaForm" autocomplete="off">
            <input type="hidden" id="empresaId" />
            <div id="alertEmpresa" style="display:none"></div>

            <div class="form-group">
              <label for="instituicaoId">Instituição:</label>
              <select id="instituicaoId" required>
                <option value="">Selecione</option>
              </select>
            </div>

            <div class="form-group">
              <label for="nomeEmpresa">Nome da Empresa/Parceiro:</label>
              <input type="text" id="nomeEmpresa" required maxlength="100" />
            </div>

            <div class="form-group">
              <label for="cnpjMatriz">CNPJ:</label>
              <input type="text" id="cnpjMatriz" maxlength="18" placeholder="00.000.000/0001-00" />
            </div>

            <div class="form-group">
              <label for="statusEmpresa">Status:</label>
              <select id="statusEmpresa" required>
                <option value="Ativa" selected>Ativa</option>
                <option value="Inativa">Inativa</option>
              </select>
            </div>
            <button type="button" class="btn btn-secondary" id="cancelBtn">
              <i class="fas fa-times-circle"></i> Cancelar
            </button>
            <button type="submit" class="btn btn-primary" id="btnSubmitEmpresa">
              <i class="fas fa-save"></i> Salvar Empresa
            </button>
            
          </form>
        </div>
      </div>

      <!-- Modal Visualizar Empresa -->
      <div id="visualizarEmpresaModal" class="modal" aria-modal="true" role="dialog">
        <div class="modal-content">
          <span class="close-button" id="closeVisualizarEmpresa" title="Fechar">&times;</span>
          <h2>Detalhes da Empresa</h2>
          <form>
            <div class="form-group">
              <label>Instituição:</label>
              <input type="text" id="viewInstituicao" readonly disabled/>
            </div>
            <div class="form-group">
              <label>Nome da Empresa/Parceiro:</label>
              <input type="text" id="viewNomeEmpresa" readonly disabled/>
            </div>
            <div class="form-group">
              <label>CNPJ:</label>
              <input type="text" id="viewCnpjMatriz" readonly disabled/>
            </div>
            <button type="button" class="btn btn-secondary" id="fecharVisualizarEmpresa">Fechar</button>
          </form>
        </div>
      </div>
    </main>
  </div>

  <script src="../assets/js/gestao_empresas.js"></script>
</body>
</html>
