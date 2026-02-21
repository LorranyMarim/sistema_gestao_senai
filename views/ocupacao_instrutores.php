<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ocupação de Intrutores - SENAI</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <style>
        .day-header.disabled-day {
            background-color: #f3f4f6;
            color: #9ca3af;
            pointer-events: none;
        }
        .schedule-cell.disabled-cell {
            background-color: #f3f4f6;
            background-image: repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 1px, transparent 0, transparent 50%);
            background-size: 10px 10px;
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
                    <li><a href="calendario_geral.php"><i class="fas fa-calendar-alt"></i>Calendário Geral</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a></li>
                    <li id="nav-relatorios" class="has-submenu active open">
                        <a href="#" class="submenu-toggle" aria-expanded="true" aria-controls="submenu-relatorios" class="active">
                            <span><i class="fas fa-tools"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-down caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu show" id="submenu-relatorios">
                            <li><a href="ocupacao_instrutores.php" class="active"> Ocupação de Instrutor</a></li>
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
      <header class="main-header">
        <h1>Ocupação de Instrutores</h1>
        <button class="btn btn-primary" id="exportOcupacao"><i class="fas fa-download"></i> Exportar</button>
      </header>

      <section class="table-section">
        <h2>Alocação/Ocupação Geral dos Instrutores da Unidade</h2>

        <div id="filter_area" class="mb-3"></div>

        <div class="timeline-toolbar" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: space-between;">
          
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div class="relative w-full max-w-xs">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i class="fas fa-search"></i>
              </span>
              <input type="text" id="searchInstructor" class="filter-input pl-10" placeholder="Buscar Instrutor...">
            </div>

            <div class="relative w-full max-w-xs">
              <input type="date" id="startDateInput" class="filter-input">
            </div>
          </div>

          <div class="shift-tabs" id="shiftTabsContainer">
            <button class="shift-tab active" data-shift="Manhã">
              <i class="fas fa-sun text-yellow-500 mr-2"></i>Manhã
            </button>
            <button class="shift-tab" data-shift="Tarde">
              <i class="fas fa-cloud-sun text-orange-500 mr-2"></i>Tarde
            </button>
            <button class="shift-tab" data-shift="Noite">
              <i class="fas fa-moon text-blue-800 mr-2"></i>Noite
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button id="btnPrevDay" class="timeline-nav-btn btn-secondary"><i class="fas fa-chevron-left"></i></button>
            <button id="btnToday" class="timeline-nav-btn font-bold btn-secondary">Hoje</button>
            <button id="btnNextDay" class="timeline-nav-btn btn-secondary"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <div id="timeline" class="timeline-wrapper" style="box-shadow: none; overflow-x: auto;">
          <div class="timeline-grid-container" id="timelineGrid">
            
            <div class="instructor-column" id="instructorColumn">
              <div class="instructor-header">Instrutores</div>
              </div>

            <div class="days-column flex-col" style="flex: 1;">
              
              <div class="day-header-row" id="dayHeaderRow">
                </div>

              <div id="scheduleGrid">
                </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="../assets/js/geral_script.js"></script>
  <script src="../assets/js/ocupacao_script.js"></script>
</body>
</html>