<?php
// --- DADOS SIMULADOS REMOVIDOS ---
$eventos_calendario = [];
$calendarios_cadastrados = [];
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
        .calendar-page-layout {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .filters-container {
            flex: 1;
            min-width: 320px;
            background-color: #ffffff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        }

        .calendar-container-main {
            flex: 3;
            min-width: 500px;
            background-color: #ffffff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        }

        .filters-container h2,
        .calendar-container-main h2 {
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
            <header class="main-header">
                <h1>Gestão de Calendário Acadêmico</h1>
            </header>

            <div class="calendar-page-layout">

                <div class="filters-container">
                    <h2>Filtros/Ações</h2>
                    <form>
                        <div class="form-group">
                            <label for="filtro1">Filtro 1:</label>
                            <select id="filtro1" name="filtro1" class="form-control">
                                <option>Selecione</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filtro2">Filtro 2:</label>
                            <select id="filtro2" name="filtro2" class="form-control">
                                <option>Selecione</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filtro3">Filtro 3:</label>
                            <select id="filtro3" name="filtro3" class="form-control">
                                <option>Selecione</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filtro4">Filtro 4:</label>
                            <select id="filtro4" name="filtro4" class="form-control">
                                <option>Selecione</option>
                            </select>
                        </div>
                        <button type="button" class="btn btn-secondary">Filtrar</button>
                        <div class="action-buttons-group">
                            <button type="button" class="btn btn-primary"
                                id="btnAbrirModalCadastrarCalendario">Cadastrar Calendário</button>
                            <button type="button" class="btn btn-primary"
                                onclick="openModal('modalAdicionarEvento')">Adicionar Evento</button>
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
                            <?php foreach ($calendarios_cadastrados as $cal): ?>
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
                    <select id="eventoCalendario" name="calendarios[]" multiple class="form-control"
                        style="height: 100px;">
                        <?php foreach ($calendarios_cadastrados as $cal): ?>
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
                <button type="button" class="btn btn-secondary"
                    onclick="closeModal('modalAdicionarEvento')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Evento</button>
            </form>
        </div>
    </div>

    <!-- MODAL CADASTRAR CALENDÁRIO -->
    <div id="modalCadastrarCalendario" class="modal">
        <div class="modal-content">
            <span class="close-button" onclick="closeModal('modalCadastrarCalendario')">&times;</span>
            <h2>Cadastrar Calendário</h2>
            <form id="formCadastrarCalendario">
                <div class="form-group">
                    <label for="calInstituicao">Instituição:</label>
                    <select id="calInstituicao" name="instituicao" class="form-control" required>
                        <option value="">Selecione</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calNome">Nome do Calendário:</label>
                    <input type="text" id="calNome" name="nome" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="calEmpresa">Empresa/Parceiro:</label>
                    <select id="calEmpresa" name="empresa" class="form-control" required>
                        <option value="">Selecione</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="calInicio">Início do Calendário:</label>
                    <input type="date" id="calInicio" name="inicio_cal" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="calFim">Fim do Calendário:</label>
                    <input type="date" id="calFim" name="fim_cal" class="form-control" required>
                </div>
                <button type="button" class="btn btn-secondary"
                    onclick="closeModal('modalCadastrarCalendario')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Cadastrar</button>
            </form>
        </div>
    </div>

    <script>
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            // Opcional: limpa os campos do modal ao fechar
            if(modalId === 'modalCadastrarCalendario'){
                document.getElementById('formCadastrarCalendario').reset();
            }
        }

        // Fechar modal clicando fora
        window.onclick = function (event) {
            if (event.target.classList.contains('modal')) {
                closeModal(event.target.id);
            }
        }

        // Inicialização do FullCalendar
        document.addEventListener('DOMContentLoaded', function () {
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

        // Carregar instituições e empresas ao abrir o modal
        document.getElementById('btnAbrirModalCadastrarCalendario').addEventListener('click', function () {
            openModal('modalCadastrarCalendario');
            carregarInstituicoesEmpresas();
        });

        async function carregarInstituicoesEmpresas() {
            // Pega instituições
            const instSelect = document.getElementById('calInstituicao');
            instSelect.innerHTML = '<option value="">Selecione</option>';
            const instRes = await fetch('../backend/processa_instituicao.php');
            if (instRes.ok) {
                const instList = await instRes.json();
                instList.forEach(i => {
                    let opt = document.createElement('option');
                    opt.value = i._id || i.id || '';
                    opt.textContent = i.razao_social || '(sem nome)';
                    instSelect.appendChild(opt);
                });
            }

            // Pega empresas
            const empSelect = document.getElementById('calEmpresa');
            empSelect.innerHTML = '<option value="">Selecione</option>';
            const empRes = await fetch('../backend/processa_empresa.php');
            if (empRes.ok) {
                const empList = await empRes.json();
                empList.forEach(e => {
                    let opt = document.createElement('option');
                    opt.value = e._id || e.id || '';
                    opt.textContent = e.razao_social || '(sem nome)';
                    empSelect.appendChild(opt);
                });
            }
        }

        // Submit do formulário de cadastro de calendário
        document.getElementById('formCadastrarCalendario').onsubmit = async function (e) {
            e.preventDefault();

            const data = {
                id_instituicao: document.getElementById('calInstituicao').value,
                nome_calendario: document.getElementById('calNome').value,
                id_empresa: document.getElementById('calEmpresa').value,
                data_inicial: document.getElementById('calInicio').value,
                data_final: document.getElementById('calFim').value,
                dias_letivos: {} // vazio ao cadastrar
            };

            // Validação básica
            if (!data.id_instituicao || !data.nome_calendario || !data.id_empresa || !data.data_inicial || !data.data_final) {
                alert('Preencha todos os campos obrigatórios!');
                return;
            }

            // Envia para o backend PHP (que chama FastAPI)
            const res = await fetch('../backend/processa_calendario.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Calendário cadastrado com sucesso!');
                closeModal('modalCadastrarCalendario');
                // Se quiser, pode atualizar a tabela aqui.
            } else {
                alert('Erro ao cadastrar calendário!');
            }
        };
    </script>
</body>

</html>
