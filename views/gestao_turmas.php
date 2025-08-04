<?php
require_once '../data/dados_turmas.php';
require_once '../data/dados_uc.php'; // Inclui os dados das Unidades Curriculares

function formatarData($data)
{
    if (empty($data)) return '';
    return DateTime::createFromFormat('Y-m-d', $data)->format('d/m/Y');
}
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
        :root {
            --cor-primaria: #007BFF;
            --cor-sidebar: #004B8D;
            --cor-texto-principal: #004B8D;
            --cor-aviso: #FFC107;
            --cor-perigo: #dc3545;
            --cor-sucesso: #28a745;
            --cor-fundo: #f0f2f5;
            --cor-texto-sidebar: #ffffff;
            --cor-borda: #dee2e6;
            --sombra-caixa: 0 4px 12px rgba(0, 0, 0, 0.08);
            --cor-cinza-texto: #6c757d;
        }


        .content-section {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: var(--sombra-caixa);
        }

        .content-section h2 {
            color: #333;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }

        .table-responsive {
            overflow-x: auto;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--cor-borda);
        }

        .data-table thead th {
            background-color: var(--cor-primaria);
            color: white;
            text-transform: uppercase;
            font-size: 0.85rem;
        }

        .data-table .actions {
            text-align: center;
        }

        .btn-icon {
            background: none;
            border: none;
            padding: 5px;
            font-size: 1.1rem;
            cursor: pointer;
            margin: 0 4px;
            transition: transform 0.2s;
        }

        .btn-icon:hover {
            transform: scale(1.2);
        }

        .btn-view i {
            color: var(--cor-aviso);
        }

        .btn-edit i {
            color: var(--cor-primaria);
        }

        .btn-delete i {
            color: var(--cor-perigo);
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .modal-content {
            background-color: #fff;
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            box-shadow: var(--sombra-caixa);
            display: flex;
            flex-direction: column;
            max-height: 90vh;
        }

        .modal-header {
            padding: 20px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h2 {
            font-size: 1.8rem;
            font-weight: bold;
            color: var(--cor-texto-principal);
        }

        .close-button {
            background: none;
            border: none;
            font-size: 2rem;
            color: #888;
            cursor: pointer;
        }

        .modal-header .close-button.hidden {
            display: none;
        }

        .modal-body {
            padding: 0 25px 25px;
            overflow-y: auto;
        }

        .stepper-wrapper {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            width: 33.33%;
        }

        .step-circle {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #fff;
            border: 3px solid var(--cor-borda);
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            color: var(--cor-borda);
            transition: all 0.4s ease;
        }

        .step-item:not(:first-child)::before {
            content: '';
            position: absolute;
            top: 15px;
            right: 50%;
            width: 100%;
            height: 3px;
            background-color: var(--cor-borda);
            z-index: -1;
            transition: background-color 0.4s ease;
        }

        .step-item.active .step-circle {
            background-color: var(--cor-primaria);
            color: white;
            border-color: var(--cor-primaria);
        }

        .step-item.active:not(:first-child)::before {
            background-color: var(--cor-primaria);
        }

        .form-step {
            display: none;
        }

        .form-step.active {
            display: block;
            animation: fadeIn 0.5s;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
            text-align: left;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--cor-borda);
            border-radius: 5px;
            font-size: 1rem;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding-top: 20px;
            border-top: 1px solid var(--cor-borda);
            margin-top: 20px;
        }

        /* CSS Específico para o Modal de UCs */
        #ucModal .modal-content {
            max-width: 950px;
        }

        /* Modal maior */
        #ucModal h3 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #333;
        }

        #uc-rows-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .uc-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .uc-row .form-group {
            margin-bottom: 0;
        }

        .uc-row-order {
            font-weight: bold;
            font-size: 1.1rem;
            min-width: 20px;
        }

        .uc-row .inputs-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            border: 1px solid #eee;
            padding: 10px;
            border-radius: 5px;
            background-color: #fdfdfd;
        }

        .uc-row .form-group {
            flex: 1 1 auto;
        }

        .uc-row .form-group.small {
            min-width: 60px;
            flex-grow: 0;
        }

        .uc-row .form-group.medium {
            min-width: 150px;
        }

        .uc-row input[readonly] {
            background-color: #e9ecef;
            cursor: not-allowed;
        }

        .uc-row .btn-add-remove {
            width: 35px;
            height: 35px;
            min-width: 35px;
            padding: 0;
            font-size: 1rem;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .uc-row .btn-add-uc {
            background-color: var(--cor-sucesso);
            color: white;
        }

        .uc-row .btn-remove-uc {
            background-color: var(--cor-perigo);
            color: white;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
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
                    <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php" class="active"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                    <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content">
            <header class="main-header">
                <h1>Gestão de Turmas</h1>
                <button class="btn btn-primary" id="addTurmaBtn">
                    <i class="fas fa-plus-circle"></i> Adicionar Turma
                </button>
            </header>
            <section class="content-section">
                <h2>Turmas Cadastradas</h2>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Código da Turma</th>
                                <th>Data Inicial</th>
                                <th>Data Final</th>
                                <th class="actions">Ações</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <div id="viewModal" class="modal"> </div>

    <div id="turmaFormModal" class="modal">
        <div class="modal-content">
            <header class="modal-header">
                <h2 id="modalTitle">Cadastrar Turma</h2>
                <button class="close-button" id="closeFormModalBtn">&times;</button>
            </header>
            <div class="modal-body">
                <div class="stepper-wrapper">
                    <div class="step-item active" data-step="1">
                        <div class="step-circle">1</div>
                    </div>
                    <div class="step-item" data-step="2">
                        <div class="step-circle">2</div>
                    </div>
                    <div class="step-item" data-step="3">
                        <div class="step-circle">3</div>
                    </div>
                </div>
                <form id="multiStepForm" novalidate>
                    <div class="form-step active" data-step="1">
                        <div class="form-group"><label for="instituicao">Instituição:</label><select id="instituicao" required>
                                <option value="">Selecione</option>
                                <option value="SENAI BETIM">SENAI BETIM</option>
                            </select></div>
                        <div class="form-group"><label for="curso">Curso:</label><select id="curso" required>
                                <option value="">Selecione</option>
                                <option value="Técnico em Sistemas">Técnico em Sistemas</option>
                            </select></div>
                        <div class="form-group"><label for="codigoTurma">Código da Turma:</label><input type="text" id="codigoTurma" required></div>
                        <div class="form-group"><label for="dataInicio">Data do Início:</label><input type="date" id="dataInicio" required></div>
                        <div class="form-group"><label for="dataFim">Data do Fim:</label><input type="date" id="dataFim" required></div>
                    </div>
                    <div class="form-step" data-step="2">
                        <div class="form-group"><label for="calendario">Calendário:</label><select id="calendario" required>
                                <option value="">Selecione</option>
                                <option value="Padrão 2025/1">Padrão 2025/1</option>
                            </select></div>
                        <div class="form-group"><label for="empresa">Empresa/Parceiro:</label><select id="empresa" required>
                                <option value="N/A">N/A</option>
                            </select></div>
                        <div class="form-group"><label for="eixo">Eixo Tecnológico:</label><select id="eixo" required>
                                <option value="">Selecione</option>
                                <option value="Informação e Comunicação">Informação e Comunicação</option>
                            </select></div>
                        <div class="form-group"><label for="turno">Turno:</label><select id="turno" required>
                                <option value="">Selecione</option>
                                <option value="MANHÃ">Manhã</option>
                                <option value="TARDE">Tarde</option>
                                <option value="NOITE">Noite</option>
                            </select></div>
                        <div class="form-group"><label for="numAlunos">Número de Alunos:</label><input type="number" id="numAlunos" required min="1"></div>
                    </div>
                    <div class="form-step" data-step="3">
                        <div class="form-group"><label for="categoria">Categoria:</label><select id="categoria" required>
                                <option value="">Selecione</option>
                                <option value="Aprendizagem Industrial">Aprendizagem Industrial</option>
                            </select></div>
                        <div class="form-group"><label for="modalidade">Modalidade:</label><select id="modalidade" required>
                                <option value="">Selecione</option>
                                <option value="Presencial">Presencial</option>
                            </select></div>
                        <div class="form-group"><label for="tipo">Tipo:</label><select id="tipo" required>
                                <option value="">Selecione</option>
                                <option value="Qualificação">Qualificação</option>
                            </select></div>
                        <div class="form-group"><label for="cargaHoraria">Carga horária total:</label><input type="number" id="cargaHoraria" placeholder="Ex: 1200" required min="1"></div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancelar</button>
                        <button type="button" class="btn btn-secondary" id="prevBtn">Voltar</button>
                        <button type="button" class="btn btn-primary" id="nextBtn">Próximo</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div id="ucModal" class="modal">
        <div class="modal-content">
            <header class="modal-header">
                <h2>Cadastrar Unidades Curriculares na Turma</h2>
                <button class="close-button hidden" id="closeUcModalBtn">&times;</button>
            </header>
            <div class="modal-body">
                <h3>Ordem das Unidades Curriculares</h3>
                <div id="uc-rows-container">
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="cancelUcBtn">Cancelar</button>
                <button type="button" class="btn btn-primary" id="saveUcBtn">Cadastrar Unidades Curriculares</button>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            let turmasData = <?php echo json_encode($turmas); ?>;
            const ucData = <?php echo json_encode($unidades_curriculares); ?>;

            // --- LÓGICA DO MODAL DE CADASTRO/EDIÇÃO (PRINCIPAL) ---
            const turmaFormModal = document.getElementById('turmaFormModal');
            const addTurmaBtn = document.getElementById('addTurmaBtn');
            const closeFormModalBtn = document.getElementById('closeFormModalBtn');
            const cancelFormBtn = document.getElementById('cancelFormBtn');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const formSteps = document.querySelectorAll('.form-step');
            const stepItems = document.querySelectorAll('.step-item');
            const modalTitle = document.getElementById('modalTitle');
            let currentStep = 1;
            const totalSteps = formSteps.length;

            // --- LÓGICA DO MODAL DE UNIDADES CURRICULARES ---
            const ucModal = document.getElementById('ucModal');
            const ucRowsContainer = document.getElementById('uc-rows-container');
            const saveUcBtn = document.getElementById('saveUcBtn');
            const cancelUcBtn = document.getElementById('cancelUcBtn');
            const closeUcModalBtn = document.getElementById('closeUcModalBtn');

            const openFormModal = (turmaId = null) => {
                currentStep = 1;
                updateFormStep();
                turmaFormModal.classList.add('locked');
                closeFormModalBtn.classList.add('hidden');
                turmaFormModal.style.display = 'flex';
                document.body.classList.add('modal-open');
            };
            const closeFormModal = () => {
                turmaFormModal.classList.remove('locked');
                closeFormModalBtn.classList.remove('hidden');
                turmaFormModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            };
            const openUcModal = () => {
                closeFormModal();
                ucModal.classList.add('locked');
                ucModal.style.display = 'flex';
                document.body.classList.add('modal-open');
                ucRowsContainer.innerHTML = ''; // Limpa antes de adicionar
                addUcRow(); // Adiciona a primeira linha obrigatória
            };
            const closeUcModal = () => {
                if (confirm('Deseja cancelar o cadastro de Unidades Curriculares? O cadastro da turma será perdido.')) {
                    ucModal.classList.remove('locked');
                    ucModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            };

            addTurmaBtn.addEventListener('click', () => openFormModal());
            cancelFormBtn.addEventListener('click', closeFormModal);
            cancelUcBtn.addEventListener('click', closeUcModal);
            closeUcModalBtn.addEventListener('click', closeUcModal); // Embora oculto, é bom ter

            nextBtn.addEventListener('click', () => {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateFormStep();
                } else {
                    openUcModal();
                }
            });
            prevBtn.addEventListener('click', () => {
                if (currentStep > 1) {
                    currentStep--;
                    updateFormStep();
                }
            });

            function updateFormStep() {
                formSteps.forEach(step => step.classList.remove('active'));
                formSteps[currentStep - 1].classList.add('active');
                stepItems.forEach((step, index) => step.classList.toggle('active', index < currentStep));
                if (currentStep === 1) {
                    prevBtn.style.display = 'none';
                    cancelFormBtn.style.display = 'inline-flex';
                } else {
                    prevBtn.style.display = 'inline-flex';
                    cancelFormBtn.style.display = 'none';
                }
                nextBtn.textContent = (currentStep === totalSteps) ? 'Salvar e Avançar' : 'Próximo';
            }

            // --- LÓGICA DINÂMICA DO MODAL DE UCs ---
            function createUcSelectOptions() {
                let options = '<option value="">Selecione</option>';
                ucData.forEach(uc => {
                    options += `<option value="${uc.id}">${uc.descricao}</option>`;
                });
                return options;
            }

            function addUcRow() {
                const newRow = document.createElement('div');
                newRow.className = 'uc-row';
                const rowIndex = ucRowsContainer.children.length + 1;

                newRow.innerHTML = `
                <span class="uc-row-order">${rowIndex}º</span>
                <div class="inputs-container">
                    <div class="form-group medium"><label>Descrição</label><select class="uc-select">${createUcSelectOptions()}</select></div>
                    <div class="form-group small"><label>Presencial C.H.</label><input type="text" class="uc-presencial-ch" readonly></div>
                    <div class="form-group small"><label>Presencial Q.A.</label><input type="text" class="uc-presencial-qa" readonly></div>
                    <div class="form-group small"><label>Presencial Q.D.</label><input type="text" class="uc-presencial-qd" readonly></div>
                    <div class="form-group small"><label>EAD C.H.</label><input type="text" class="uc-ead-ch" readonly></div>
                    <div class="form-group small"><label>EAD Q.A.</label><input type="text" class="uc-ead-qa" readonly></div>
                    <div class="form-group small"><label>EAD Q.D.</label><input type="text" class="uc-ead-qd" readonly></div>
                    <div class="form-group medium"><label>Instrutor</label><select><option value="">Selecione</option></select></div>
                    <div class="form-group medium"><label>Data Início</label><input type="date"></div>
                    <div class="form-group medium"><label>Data Fim</label><input type="date"></div>
                </div>
                <button type="button" class="btn-add-remove btn-add-uc">+</button>
                <button type="button" class="btn-add-remove btn-remove-uc">-</button>
            `;
                ucRowsContainer.appendChild(newRow);
                updateUcRowButtons();
            }

            function removeUcRow(button) {
                button.closest('.uc-row').remove();
                updateUcRowButtons();
                updateUcRowOrder();
            }

            function updateUcRowButtons() {
                const rows = ucRowsContainer.querySelectorAll('.uc-row');
                rows.forEach((row, index) => {
                    const removeBtn = row.querySelector('.btn-remove-uc');
                    removeBtn.style.display = (rows.length > 1) ? 'flex' : 'none';
                });
            }

            function updateUcRowOrder() {
                ucRowsContainer.querySelectorAll('.uc-row').forEach((row, index) => {
                    row.querySelector('.uc-row-order').textContent = `${index + 1}º`;
                });
            }

            ucRowsContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('btn-add-uc')) addUcRow();
                if (e.target.classList.contains('btn-remove-uc')) removeUcRow(e.target);
            });

            ucRowsContainer.addEventListener('change', function(e) {
                if (e.target.classList.contains('uc-select')) {
                    const selectedId = e.target.value;
                    const selectedUc = ucData.find(uc => uc.id == selectedId);
                    const parentRow = e.target.closest('.uc-row');

                    if (selectedUc) {
                        parentRow.querySelector('.uc-presencial-ch').value = selectedUc.presencial_ch;
                        parentRow.querySelector('.uc-presencial-qa').value = selectedUc.presencial_qa;
                        parentRow.querySelector('.uc-presencial-qd').value = selectedUc.presencial_qd;
                        parentRow.querySelector('.uc-ead-ch').value = selectedUc.ead_ch;
                        parentRow.querySelector('.uc-ead-qa').value = selectedUc.ead_qa;
                        parentRow.querySelector('.uc-ead-qd').value = selectedUc.ead_qd;
                    } else {
                        parentRow.querySelectorAll('input[readonly]').forEach(input => input.value = '');
                    }
                }
            });

            saveUcBtn.addEventListener('click', () => {
                alert('Simulação: Turma e Unidades Curriculares foram salvas com sucesso!');
                ucModal.classList.remove('locked');
                closeUcModal();
                document.body.classList.remove('modal-open');
            });

            // --- LÓGICA DA TABELA PRINCIPAL (Funções vazias para preencher) ---
            function updateTableDisplay() {
                /* Adicione sua lógica de exibição da tabela aqui */
            }

            function attachTableActionListeners() {
                document.querySelectorAll('.btn-edit').forEach(button => {
                    button.onclick = (e) => openFormModal(e.currentTarget.dataset.id);
                });
                // Adicione aqui a lógica para os botões de visualizar e deletar
            }
            updateTableDisplay();
        });
    </script>
</body>

</html>