<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestão de Calendário Acadêmico - SENAI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="../css/style_turmas.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .modal.show {
      display: flex !important;
    }

    .modal-content {
      background: #fff;
      border-radius: 10px;
      padding: 30px;
      min-width: 320px;
      max-width: 90vw;
      position: relative;
    }

    .close-button {
      position: absolute;
      top: 15px;
      right: 30px;
      font-size: 2em;
      cursor: pointer;
    }

    /* NOVO LAYOUT */
    .main-sections-row {
      display: flex;
      flex-direction: row;
      gap: 2rem;
      width: 100%;
      margin-bottom: 2rem;
    }

    #leftSection {
      width: 30%;
      min-width: 260px;
      box-sizing: border-box;
    }

    #rightSection {
      width: 70%;
      min-width: 320px;
      box-sizing: border-box;
    }

    #bottomSection {
      width: 100%;
      max-width: 100%;
      margin-top: 0;
      box-sizing: border-box;
    }

    @media (max-width: 900px) {
      .main-sections-row {
        flex-direction: column;
      }

      #leftSection,
      #rightSection {
        width: 100%;
        min-width: unset;
      }
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
          <li><a href="dashboard.html"><i class="fas fa-chart-line"></i> Dashboard</a></li>
          <li><a href="gestao_alocacao.php"><i class="fas fa-random"></i> Gestão de Alocações</a></li>
          <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="calendario.php" class="active"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
    </aside>
    <main class="main-content">
      <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>
      <header class="main-header">
        <h1>Gestão de Calendário Acadêmico</h1>
      </header>

      <div class="main-sections-row">
        <!-- Left (30%) -->
        <section class="table-section" id="leftSection">
          <h2>Filtros/Ações</h2>
          <button class="btn btn-warning" id="addEvento"><i class="fas fa-plus-circle"></i> Adicionar Evento</button>
          <button class="btn btn-primary" id="addCalendario"><i class="fas fa-calendar-plus-o"></i> Adicionar Calendário</button>
          <div class="table-responsive"></div>
        </section>

        <!-- Right (70%) -->
        <section class="table-section" id="rightSection">
          <h2>Calendário</h2>
          <div class="filter-section"></div>
          <div class="table-responsive"></div>
        </section>
      </div>

      <!-- Bottom (100%) -->
      <section class="table-section" id="bottomSection">
        <h2>Calendários Cadastrados</h2>
        <div class="filter-section">
          <div class="filter-group">
            <label for="searchCalendario">Buscar:</label>
            <input type="text" id="searchCalendario" placeholder="Digite para filtrar..." class="search-input">
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Empresa/Parceiro</th>
                <th>Data Inicial</th>
                <th>Data Final</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody id="calendarioTableBody"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <script>
    // SIDEBAR
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const dashboardContainer = document.querySelector('.dashboard-container');
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      dashboardContainer.classList.toggle('sidebar-active');
    });
    dashboardContainer.addEventListener('click', (event) => {
      if (dashboardContainer.classList.contains('sidebar-active') && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebar.classList.remove('active');
        dashboardContainer.classList.remove('sidebar-active');
      }
    });
  </script>
</body>

</html>
