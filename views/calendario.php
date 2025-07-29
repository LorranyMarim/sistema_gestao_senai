<?php
// --- DADOS SIMULADOS ---
// Em um ambiente real, estes dados viriam do banco de dados.

// Simulação de eventos para o FullCalendar
$eventos_calendario = [
    [
        'title' => 'Manutenção Preventiva - Lab 01',
        'start' => date('Y-m-d') . 'T08:00:00', // Hoje, às 8h
        'end' => date('Y-m-d') . 'T11:45:00',   // Hoje, às 11:45h
        'backgroundColor' => '#007BFF', // Azul
        'borderColor' => '#0056b3'
    ],
    [
        'title' => 'Palestra de Segurança',
        'start' => date('Y-m-') . '15', // Dia 15 do mês atual
        'allDay' => true,
        'backgroundColor' => '#28a745', // Verde
        'borderColor' => '#1e7e34'
    ],
    [
        'title' => 'Reunião Pedagógica',
        'start' => date('Y-m-', strtotime('+1 month')) . '05', // Dia 05 do próximo mês
        'backgroundColor' => '#ffc107', // Amarelo
        'borderColor' => '#d39e00',
        'textColor' => '#212529'
    ]
];

// Simulação da lista de calendários já cadastrados (para a tabela e o select do modal)
$calendarios_cadastrados = [
    [
        'id' => 1,
        'codigo' => 'CAL-2025-GERAL',
        'descricao' => 'Calendário Acadêmico Geral 2025',
        'empresa_parceiro' => 'SENAI',
        'data_inicial' => '2025-01-01',
        'data_final' => '2025-12-31'
    ],
    [
        'id' => 2,
        'codigo' => 'CAL-2025-FERIAS',
        'descricao' => 'Calendário de Férias e Recessos',
        'empresa_parceiro' => 'SENAI',
        'data_inicial' => '2025-01-01',
        'data_final' => '2025-12-31'
    ],
    [
        'id' => 3,
        'codigo' => 'CAL-2025-EMPRESA-X',
        'descricao' => 'Calendário Empresa X',
        'empresa_parceiro' => 'Empresa X',
        'data_inicial' => '2025-03-01',
        'data_final' => '2025-11-30'
    ]
];
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendário - SENAI</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../css/style_turmas.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js"></script>

    <style>

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
                    <li><a href="#"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="#"><i class="fas fa-tasks"></i> Gestão de Alocações</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="#"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="#"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
                    <li><a href="#"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="#"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="calendario.php" class="active"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                    <li><a href="#"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Gestão de Calendário Acadêmico</h1>
            </header>

            <div class="page-content-grid">
                <div class="filters-actions-section">
                    <h2>Filtros/Ações</h2>
                    <form>
                        <div class="form-group">
                            <label for="filtro1">Filtro 1:</label>
                            <select id="filtro1" name="filtro1" class="form-control"><option value="">Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro2">Filtro 2:</label>
                            <select id="filtro2" name="filtro2" class="form-control"><option value="">Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro3">Filtro 3:</label>
                            <select id="filtro3" name="filtro3" class="form-control"><option value="">Selecione</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filtro4">Filtro 4:</label>
                            <select id="filtro4" name="filtro4" class="form-control"><option value="">Selecione</option></select>
                        </div>
                        <button type="button" class="btn btn-secondary">Filtrar</button>

                        <div class="action-buttons">
                            <button type="button" class="btn btn-primary" onclick="openModal('modalAdicionarEvento')">Adicionar Evento</button>
                            <button type="button" class="btn btn-primary" onclick="openModal('modalCadastrarCalendario')">Cadastrar Calendário</button>
                        </div>
                    </form>
                </div>

                <div class="calendar-section">
                    <h2>Calendário Geral</h2>
                    <div id="calendario"></div>
                </div>
            </div>

             <section class="table-section" style="margin-top: 30px;">
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
                    <select id="eventoCalendario" name="calendarios[]" multiple required style="height: 100px;">
                        <?php foreach($calendarios_cadastrados as $cal): ?>
                            <option value="<?= $cal['id'] ?>"><?= htmlspecialchars($cal['descricao']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventoDescricao">Descrição:</label>
                    <textarea id="eventoDescricao" name="descricao" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label for="eventoInicio">Início:</label>
                    <input type="datetime-local" id="eventoInicio" name="inicio" required>
                </div>
                <div class="form-group">
                    <label for="eventoFim">Fim:</label>
                    <input type="datetime-local" id="eventoFim" name="fim" required>
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
                    <input type="text" id="calNome" name="nome" required>
                </div>
                <div class="form-group">
                    <label for="calEmpresa">Empresa/Parceiro:</label>
                    <select id="calEmpresa" name="empresa">
                        <option value="SENAI">SENAI</option>
                        <option value="Empresa X">Empresa X</option>
                        <option value="Empresa Y">Empresa Y</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calInicio">Início do Calendário:</label>
                    <input type="date" id="calInicio" name="inicio_cal" required>
                </div>
                <div class="form-group">
                    <label for="calFim">Fim do Calendário:</label>
                    <input type="date" id="calFim" name="fim_cal" required>
                </div>
                <button type="button" class="btn btn-secondary" onclick="closeModal('modalCadastrarCalendario')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Cadastrar Calendário</button>
            </form>
        </div>
    </div>

    <script>
        // Lógica para abrir/fechar modal (reutilizada)
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
                locale: 'pt-br', // Traduz para o português do Brasil
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                events: <?php echo json_encode($eventos_calendario); ?>, // Carrega os eventos do PHP
                editable: true,       // Permite arrastar e redimensionar eventos
                selectable: true,     // Permite selecionar datas
                dayMaxEvents: true,   // Ativa o link "+ more" quando há muitos eventos
            });
            calendar.render();
        });
    </script>
</body>
</html>