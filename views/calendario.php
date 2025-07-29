<?php
// --- DADOS SIMULADOS ---
$eventos_calendario = [
    [
        'title' => 'Manutenção Preventiva - Lab 01',
        'start' => date('Y-m-d') . 'T08:00:00',
        'end' => date('Y-m-d') . 'T11:45:00',
        'backgroundColor' => '#007BFF',
        'borderColor' => '#0056b3'
    ],
    [
        'title' => 'Palestra de Segurança',
        'start' => date('Y-m-') . '15',
        'allDay' => true,
        'backgroundColor' => '#28a745',
        'borderColor' => '#1e7e34'
    ],
];
$calendarios_cadastrados = [
    [
        'id' => 1,
        'descricao' => 'Calendário Acadêmico Geral 2025',
        'empresa_parceiro' => 'SENAI',
        'data_inicial' => '2025-01-01',
        'data_final' => '2025-12-31'
    ],
    [
        'id' => 2,
        'descricao' => 'Calendário de Férias e Recessos',
        'empresa_parceiro' => 'SENAI',
        'data_inicial' => '2025-01-01',
        'data_final' => '2025-12-31'
    ],
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendário - SENAI</title>
    <link rel="stylesheet" href="../css/style_turmas.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.14/index.global.min.js'></script>
    <script src='https://cdn.jsdelivr.net/npm/@fullcalendar/core/locales/pt-br.global.js'></script>

    <style>
        /* Estilos adicionais para organizar a página de calendário */
        .calendar-page-layout {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
            flex-wrap: wrap; /* Permite que os itens quebrem para a linha de baixo em telas menores */
        }
        .filters-container {
            flex: 1; /* Ocupa 1 parte do espaço */
            min-width: 320px; /* Largura mínima para o container de filtros */
            background-color: #ffffff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        }
        .calendar-container-main {
            flex: 3; /* Ocupa 3 partes do espaço, sendo maior */
            min-width: 500px; /* Largura mínima para o calendário não espremer */
            background-color: #ffffff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        }
        .filters-container h2, .calendar-container-main h2 {
            color: #004B8D;
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .action-buttons-group {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        /* Estilo para os inputs e selects dos formulários e filtros */
        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 1em;
        }
    </style>
</head>

<body>
    <div class="dashboard-container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <img src="logo.png" alt="Logo SENAI" class="sidebar-logo">
                <h3>Menu Principal</h3>
            </div>
            <nav class="sidebar-nav">
        <ul>
          <li><a href="dashboard.html"><i class="fas fa-chart-line"></i> Dashboard</a></li>
          <li><a href="gestao_alocacao.php" class="active"><i class="fas fa-random"></i> Gestão de Alocações</a></li>
          <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
          <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
        </ul>
      </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Gestão de Calendário Acadêmico</h1>
            </header>

            <div class="calendar-page-layout">

                <div class="filters-container">
                    <h2>Filtros/Ações</h2>
                    <form>
                        <div class="form-group">
                            <label for="filtro1">Filtro 1:</label>
                            <select id="filtro1" name="filtro1" class="form-control"><option>Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro2">Filtro 2:</label>
                            <select id="filtro2" name="filtro2" class="form-control"><option>Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro3">Filtro 3:</label>
                            <select id="filtro3" name="filtro3" class="form-control"><option>Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro4">Filtro 4:</label>
                            <select id="filtro4" name="filtro4" class="form-control"><option>Selecione</option></select>
                        </div>

                        <button type="button" class="btn btn-secondary">Filtrar</button>
                        
                        <div class="action-buttons-group">
                            <button type="button" class="btn btn-primary" onclick="openModal('modalAdicionarEvento')">Adicionar Evento</button>
                            <button type="button" class="btn btn-primary" onclick="openModal('modalCadastrarCalendario')">Cadastrar Calendário</button>
                        </div>
                    </form>
                </div>

                <div class="calendar-container-main">
                    <h2>Calendário Geral</h2>
                    <div id="calendario"></div>
                </div>
            </div>

            <section class="table-section">
                <h2>Calendários Cadastrados</h2>
                <div class="form-group">
                    <input type="text" placeholder="Buscar por descrição ou empresa..." class="form-control">
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Empresa/Parceiro</th>
                                <th>Data Inicial</th>
                                <th>Data Final</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($calendarios_cadastrados as $cal) : ?>
                            <tr>
                                <td><?= htmlspecialchars($cal['descricao']) ?></td>
                                <td><?= htmlspecialchars($cal['empresa_parceiro']) ?></td>
                                <td><?= date('d/m/Y', strtotime($cal['data_inicial'])) ?></td>
                                <td><?= date('d/m/Y', strtotime($cal['data_final'])) ?></td>
                                <td class="actions">
                                    <button class="btn btn-icon btn-edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-icon btn-delete"><i class="fas fa-trash-alt"></i></button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <div id="modalAdicionarEvento" class="modal">
        <div class="modal-content">
            <span class="close-button" onclick="closeModal('modalAdicionarEvento')">&times;</span>
            <h2>Adicionar Evento</h2>
            <form>
                <div class="form-group">
                    <label for="eventoCalendario">Calendário(s):</label>
                    <select id="eventoCalendario" name="calendarios[]" multiple class="form-control" style="height: 100px;">
                        <?php foreach($calendarios_cadastrados as $cal): ?>
                            <option value="<?= $cal['id'] ?>"><?= htmlspecialchars($cal['descricao']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventoDescricao">Descrição:</label>
                    <textarea id="eventoDescricao" name="descricao" rows="3" class="form-control"></textarea>
                </div>
                <div class="form-group">
                    <label for="eventoInicio">Início:</label>
                    <input type="datetime-local" id="eventoInicio" name="inicio" class="form-control">
                </div>
                <div class="form-group">
                    <label for="eventoFim">Fim:</label>
                    <input type="datetime-local" id="eventoFim" name="fim" class="form-control">
                </div>
                <button type="button" class="btn btn-secondary" onclick="closeModal('modalAdicionarEvento')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Evento</button>
            </form>
        </div>
    </div>

    <div id="modalCadastrarCalendario" class="modal">
        <div class="modal-content">
            <span class="close-button" onclick="closeModal('modalCadastrarCalendario')">&times;</span>
            <h2>Cadastrar Calendário</h2>
            <form>
                <div class="form-group">
                    <label for="calNome">Nome do Calendário:</label>
                    <input type="text" id="calNome" name="nome" class="form-control">
                </div>
                <div class="form-group">
                    <label for="calEmpresa">Empresa/Parceiro:</label>
                    <select id="calEmpresa" name="empresa" class="form-control">
                        <option value="SENAI">SENAI</option>
                        <option value="Empresa X">Empresa X</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calInicio">Início do Calendário:</label>
                    <input type="date" id="calInicio" name="inicio_cal" class="form-control">
                </div>
                <div class="form-group">
                    <label for="calFim">Fim do Calendário:</label>
                    <input type="date" id="calFim" name="fim_cal" class="form-control">
                </div>
                <button type="button" class="btn btn-secondary" onclick="closeModal('modalCadastrarCalendario')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Cadastrar</button>
            </form>
        </div>
    </div>

    <script>
        // Lógica para abrir/fechar modal
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Fechar modal clicando fora
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                closeModal(event.target.id);
            }
        }

        // Inicialização do FullCalendar
        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendario');
            var calendar = new FullCalendar.Calendar(calendarEl, {
                locale: 'pt-br',
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                events: <?php echo json_encode($eventos_calendario); ?>,
                editable: true,
                selectable: true,
                dayMaxEvents: true,
            });
            calendar.render();
        });
    </script>
</body>
</html>
