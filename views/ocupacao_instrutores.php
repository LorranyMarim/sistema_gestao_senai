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
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a>
                    </li>
                    <li id="nav-relatorios" class="has-submenu active open">
                        <a href="#" class="submenu-toggle" aria-expanded="true" aria-controls="submenu-relatorios"
                            class="active">
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
              <input type="text" class="filter-input pl-10" placeholder="Buscar Instrutor...">
            </div>

            <div class="relative w-full max-w-xs">
              <input type="date" class="filter-input" value="2026-02-12">
            </div>
          </div>

          <div class="shift-tabs">
            <button class="shift-tab active" onclick="alert('Filtrando Turno: Manhã')">
              <i class="fas fa-sun text-yellow-500 mr-2"></i>Manhã
            </button>
            <button class="shift-tab" onclick="alert('Filtrando Turno: Tarde')">
              <i class="fas fa-cloud-sun text-orange-500 mr-2"></i>Tarde
            </button>
            <button class="shift-tab" onclick="alert('Filtrando Turno: Noite')">
              <i class="fas fa-moon text-blue-800 mr-2"></i>Noite
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button class="timeline-nav-btn btn-secondary"><i class="fas fa-chevron-left"></i></button>
            <button class="timeline-nav-btn font-bold btn-secondary">Hoje</button>
            <button class="timeline-nav-btn btn-secondary"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <div id="timeline" class="timeline-wrapper" style="box-shadow: none; overflow-x: auto;">
          <div class="timeline-grid-container">

            <div class="instructor-column">
              <div class="instructor-header">
                Instrutores
              </div>

              <div class="instructor-card">
                <div class="instructor-avatar">CS</div>
                <div class="instructor-info">
                  <h4>Carlos Silva</h4>
                  <span>Dev. Backend</span>
                </div>
              </div>

              <div class="instructor-card">
                <div class="instructor-avatar" style="background: #ffe0e0; color: #dc3545;">AM</div>
                <div class="instructor-info">
                  <h4>Ana Maria</h4>
                  <span>UX/UI Design</span>
                </div>
              </div>

              <div class="instructor-card">
                <div class="instructor-avatar" style="background: #fff3cd; color: #856404;">RJ</div>
                <div class="instructor-info">
                  <h4>Roberto Justus</h4>
                  <span>Gestão Ágil</span>
                </div>
              </div>

              <div class="instructor-card">
                <div class="instructor-avatar" style="background: #d4edda; color: #155724;">PL</div>
                <div class="instructor-info">
                  <h4>Pedro Lima</h4>
                  <span>Banco de Dados</span>
                </div>
              </div>
            </div>

            <div class="days-column flex-col">

              <div class="day-header-row">
                <div class="day-header today">
                  <span>Hoje</span>
                  <small>12/Fev</small>
                </div>
                <div class="day-header">
                  <span>Sexta</span>
                  <small>13/Fev</small>
                </div>
                <div class="day-header" style="background: #ffecec;">
                  <span class="text-red-500">Sábado</span>
                  <small>14/Fev</small>
                </div>
                <div class="day-header" style="background: #ffecec;">
                  <span class="text-red-500">Domingo</span>
                  <small>15/Fev</small>
                </div>
                <div class="day-header">
                  <span>Segunda</span>
                  <small>16/Fev</small>
                </div>
                <div class="day-header">
                  <span>Terça</span>
                  <small>17/Fev</small>
                </div>
                <div class="day-header">
                  <span>Quarta</span>
                  <small>18/Fev</small>
                </div>
              </div>

              <div class="schedule-row">
                <div class="schedule-cell">
                  <div class="event-bar event-occupied event-start" title="Turma: DS-2024-1 | UC: API Rest">
                    <span class="tooltip-text">DS-2024-1</span>
                    <span class="tooltip-sub">API Rest</span>
                  </div>
                </div>
                <div class="schedule-cell">
                  <div class="event-bar event-occupied event-middle" title="Turma: DS-2024-1 | UC: API Rest">
                    <span class="tooltip-text">Continuação...</span>
                  </div>
                </div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell">
                  <div class="event-bar event-occupied event-end" title="Turma: DS-2024-1 | UC: API Rest">
                    <span class="tooltip-text">Finalização</span>
                  </div>
                </div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
              </div>

              <div class="schedule-row">
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell">
                  <div class="event-bar event-occupied" style="background-color: var(--cor-aviso); border-color: #d39e00; color: #333;">
                    <span class="tooltip-text">UX-Intro</span>
                    <span class="tooltip-sub">Prototipagem</span>
                  </div>
                </div>
                <div class="schedule-cell">
                  <div class="event-bar event-occupied" style="background-color: var(--cor-aviso); border-color: #d39e00; color: #333;">
                    <span class="tooltip-text">UX-Intro</span>
                    <span class="tooltip-sub">Figma</span>
                  </div>
                </div>
                <div class="schedule-cell">
                  <div class="event-bar event-occupied" style="background-color: var(--cor-aviso); border-color: #d39e00; color: #333;">
                    <span class="tooltip-text">UX-Intro</span>
                  </div>
                </div>
              </div>

              <div class="schedule-row">
                <div class="schedule-cell">
                  <div class="event-bar event-occupied">
                    <span class="tooltip-text">AGIL-01</span>
                    <span class="tooltip-sub">Scrum</span>
                  </div>
                </div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
              </div>

              <div class="schedule-row">
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell" style="background: #fafafa;"></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
                <div class="schedule-cell"><div class="event-free"></div></div>
              </div>

            </div>
          </div>

          <div class="p-4 bg-gray-50 border-t text-sm flex gap-4 text-gray-600">
            <div class="flex items-center gap-2"><span class="w-3 h-3 bg-blue-600 rounded-sm"></span> Aula Confirmada</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 bg-yellow-400 rounded-sm"></span> Aula Pendente/Substituição</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 bg-gray-300 h-[2px]"></span> Disponível</div>
          </div>

        </div>
      </section>
    </main>
  </div>

  <script src="../assets/js/geral_script.js"></script>
  
  <script>
    // Exemplo simples de funcionalidade das abas
    const tabs = document.querySelectorAll('.shift-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  </script>
</body>
</html>