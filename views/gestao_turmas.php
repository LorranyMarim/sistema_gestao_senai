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
                <button class="btn btn-primary" id="addTurmaBtn"><i class="fas fa-plus-circle"></i> Adicionar
                    Turma</button>
            </header>
            <section class="table-section">
                <h2>Turmas Cadastradas</h2>
                <div class="filter-section">
                    <div class="filter-group">
                        <label for="searchEmpresa">Buscar Empresa (Nome, CNPJ):</label>
                        <input type="text" id="searchEmpresa" placeholder="Digite para filtrar..." class="search-input">
                    </div>
                </div>
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
                        <div class="form-group"><label for="codigoTurma">Código da Turma:</label><input type="text"
                                id="codigoTurma" required></div>
                        <div class="form-group"><label for="curso">Curso:</label>
                            <select id="curso" required></select>
                        </div>
                        <div class="form-group"><label for="dataInicio">Data de Início:</label><input type="date"
                                id="dataInicio" required></div>
                        <div class="form-group"><label for="dataFim">Data de Término:</label><input type="date"
                                id="dataFim" required></div>
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
                        <div class="form-group"><label for="numAlunos">Número de Alunos:</label><input type="number"
                                id="numAlunos" min="1" required></div>
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
                        <div class="form-group"><label>Código da Turma:</label><input type="text" id="codigoTurmaConf"
                                disabled></div>
                        <div class="form-group"><label>Curso:</label><input type="text" id="cursoConf" disabled></div>
                        <div class="form-group"><label>Categoria:</label><input type="text" id="categoriaConf" disabled>
                        </div>
                        <div class="form-group"><label>Modalidade:</label><input type="text" id="modalidadeConf"
                                disabled></div>
                        <div class="form-group"><label>Tipo:</label><input type="text" id="tipoConf" disabled></div>
                        <div class="form-group"><label>Carga Horária:</label><input type="text" id="cargaHorariaConf"
                                disabled></div>
                        <div class="form-group"><label>Eixo Tecnológico:</label><input type="text" id="eixoTecConf"
                                disabled></div>
                        <div class="form-group"><label>Data de Início:</label><input type="date" id="dataInicioConf"
                                disabled></div>
                        <div class="form-group"><label>Data de Término:</label><input type="date" id="dataFimConf"
                                disabled></div>
                        <div class="form-group"><label>Turno:</label><input type="text" id="turnoConf" disabled></div>
                        <div class="form-group"><label>Nº de Alunos:</label><input type="number" id="numAlunosConf"
                                disabled></div>
                        <div class="form-group"><label>Instituição:</label><input type="text" id="instituicaoConf"
                                disabled></div>
                        <div class="form-group"><label>Calendário:</label><input type="text" id="calendarioConf"
                                disabled></div>
                        <div class="form-group"><label>Empresa:</label><input type="text" id="empresaConf" disabled>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancelar</button>
                        <button type="button" class="btn btn-secondary" id="prevBtn"
                            style="display:none;">Voltar</button>
                        <button type="button" class="btn btn-primary" id="nextBtn">Próximo</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

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

    <script>
        // --- URLs do backend FastAPI ---
        const URL_API = "http://localhost:8000/api";

        // Armazena dados de selects globais
        let dadosCursos = [];
        let dadosInstituicoes = [];
        let dadosEmpresas = [];
        let dadosCalendarios = [];
        let dadosUcs = [];
        let dadosInstrutores = [];

        // Utils para buscar dados via FastAPI
        async function fetchCursos() {
            const r = await fetch(`${URL_API}/cursos`);
            return r.json();
        }
        async function fetchInstituicoes() {
            const r = await fetch(`${URL_API}/instituicoes`);
            return r.json();
        }
        async function fetchEmpresas() {
            const r = await fetch(`${URL_API}/empresas`);
            return r.json();
        }
        async function fetchCalendarios() {
            const r = await fetch(`${URL_API}/calendarios`);
            return r.json();
        }
        async function fetchUcs() {
            const r = await fetch(`${URL_API}/unidades_curriculares`);
            return r.json();
        }
        async function fetchInstrutores() {
            const r = await fetch(`${URL_API}/instrutores`);
            return r.json();
        }

        // CSS dinâmico: botão verde para adicionar e botão vermelho para remover
        document.addEventListener("DOMContentLoaded", function () {
            const style = document.createElement('style');
            style.innerHTML = `
        #addUcBtn.btn.btn-primary {
            background-color: #28a745 !important;
            border-color: #28a745 !important;
        }
        #addUcBtn.btn.btn-primary:hover {
            background-color: #218838 !important;
            border-color: #1e7e34 !important;
        }
        .uc-remove-btn {
            background: #dc3545 !important;
            color: #fff !important;
            border: none !important;
            border-radius: 50% !important;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            margin-left: 8px;
        }
        .uc-remove-btn:hover {
            background: #b91c1c !important;
        }
    `;
            document.head.appendChild(style);
        });

        // Ao DOM pronto, popula os selects e inicializa eventos
        document.addEventListener('DOMContentLoaded', async () => {
            // Carregar dados dos selects de todos os steps
            [dadosCursos, dadosInstituicoes, dadosEmpresas, dadosCalendarios, dadosUcs, dadosInstrutores] = await Promise.all([
                fetchCursos(), fetchInstituicoes(), fetchEmpresas(), fetchCalendarios(), fetchUcs(), fetchInstrutores()
            ]);
            populaSelectCursos();
            populaSelectInstituicoes();
            populaSelectEmpresas();
            populaSelectCalendarios();

            // Multi-step lógica
            let turmaDados = {};
            let currentStep = 1;
            const totalSteps = 3;

            const turmaFormModal = document.getElementById('turmaFormModal');
            const addTurmaBtn = document.getElementById('addTurmaBtn');
            const closeFormModalBtn = document.getElementById('closeFormModalBtn');
            const cancelFormBtn = document.getElementById('cancelFormBtn');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const formSteps = document.querySelectorAll('.form-step');
            const stepItems = document.querySelectorAll('.step-item');

            // Abrir o modal de turma
            addTurmaBtn.addEventListener('click', () => {
                currentStep = 1;
                clearForm();
                updateFormStep();
                turmaFormModal.style.display = 'flex';
                document.body.classList.add('modal-open');
            });
            closeFormModalBtn.onclick = cancelFormBtn.onclick = function () {
                turmaFormModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }

            nextBtn.onclick = () => {
                if (!validateStep(currentStep)) return;
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateFormStep();
                    if (currentStep === 3) fillStep3();
                } else {
                    turmaFormModal.style.display = 'none';
                    openUcModal();
                }
            };
            prevBtn.onclick = () => {
                if (currentStep > 1) {
                    currentStep--;
                    updateFormStep();
                }
            };
            function updateFormStep() {
                formSteps.forEach((el, i) => el.classList.toggle('active', (i + 1) === currentStep));
                stepItems.forEach((step, i) => {
                    step.classList.toggle('active', i < currentStep);
                    step.classList.toggle('completed', i < currentStep - 1);
                });
                prevBtn.style.display = (currentStep === 1) ? 'none' : '';
                cancelFormBtn.style.display = (currentStep === 1) ? '' : 'none';
                nextBtn.textContent = (currentStep === totalSteps) ? 'Salvar' : 'Próximo';
            }
            function clearForm() {
                document.getElementById('codigoTurma').value = "";
                document.getElementById('curso').selectedIndex = 0;
                document.getElementById('dataInicio').value = "";
                document.getElementById('dataFim').value = "";
                document.getElementById('turno').selectedIndex = 0;
                document.getElementById('numAlunos').value = "";
                document.getElementById('instituicao').selectedIndex = 0;
                document.getElementById('calendario').selectedIndex = 0;
                document.getElementById('empresa').selectedIndex = 0;
            }
            function fillStep3() {
                document.getElementById('codigoTurmaConf').value = document.getElementById('codigoTurma').value;
                const curso = dadosCursos.find(c => c._id === document.getElementById('curso').value);
                document.getElementById('cursoConf').value = curso ? curso.nome : "";
                document.getElementById('categoriaConf').value = curso ? curso.categoria : "";
                document.getElementById('modalidadeConf').value = curso ? curso.nivel_curso : "";
                document.getElementById('tipoConf').value = curso ? curso.tipo : "";
                document.getElementById('cargaHorariaConf').value = curso ? curso.carga_horaria : "";
                document.getElementById('eixoTecConf').value = curso ? curso.eixo_tecnologico : "";
                document.getElementById('dataInicioConf').value = document.getElementById('dataInicio').value;
                document.getElementById('dataFimConf').value = document.getElementById('dataFim').value;
                document.getElementById('turnoConf').value = document.getElementById('turno').value;
                document.getElementById('numAlunosConf').value = document.getElementById('numAlunos').value;
                const inst = dadosInstituicoes.find(i => i._id === document.getElementById('instituicao').value);
                document.getElementById('instituicaoConf').value = inst ? inst.razao_social : "";
                const cal = dadosCalendarios.find(c => c._id === document.getElementById('calendario').value);
                document.getElementById('calendarioConf').value = cal ? cal.nome_calendario : "";
                const emp = dadosEmpresas.find(e => e._id === document.getElementById('empresa').value);
                document.getElementById('empresaConf').value = emp ? emp.razao_social : "";
            }
            function validateStep(step) {
                if (step === 1) {
                    if (!document.getElementById('codigoTurma').value.trim() ||
                        !document.getElementById('curso').value ||
                        !document.getElementById('dataInicio').value ||
                        !document.getElementById('dataFim').value) {
                        alert("Preencha todos os campos do passo 1!");
                        return false;
                    }
                }
                if (step === 2) {
                    if (!document.getElementById('turno').value ||
                        !document.getElementById('numAlunos').value ||
                        !document.getElementById('instituicao').value ||
                        !document.getElementById('calendario').value ||
                        !document.getElementById('empresa').value) {
                        alert("Preencha todos os campos do passo 2!");
                        return false;
                    }
                }
                return true;
            }
            function populaSelectCursos() {
                const sel = document.getElementById('curso');
                sel.innerHTML = '<option value="">Selecione</option>';
                dadosCursos.forEach(c => sel.innerHTML += `<option value="${c._id}">${c.nome}</option>`);
            }
            function populaSelectInstituicoes() {
                const sel = document.getElementById('instituicao');
                sel.innerHTML = '<option value="">Selecione</option>';
                dadosInstituicoes.forEach(i => sel.innerHTML += `<option value="${i._id}">${i.razao_social}</option>`);
            }
            function populaSelectEmpresas() {
                const sel = document.getElementById('empresa');
                sel.innerHTML = '<option value="">Selecione</option>';
                dadosEmpresas.forEach(e => sel.innerHTML += `<option value="${e._id}">${e.razao_social}</option>`);
            }
            function populaSelectCalendarios() {
                const sel = document.getElementById('calendario');
                sel.innerHTML = '<option value="">Selecione</option>';
                dadosCalendarios.forEach(c => sel.innerHTML += `<option value="${c._id}">${c.nome_calendario}</option>`);
            }

            // Modal Unidades Curriculares
            const ucModal = document.getElementById('ucModal');
            const closeUcModalBtn = document.getElementById('closeUcModalBtn');
            const cancelUcBtn = document.getElementById('cancelUcBtn');
            const saveUcBtn = document.getElementById('saveUcBtn');
            const ucRowsContainer = document.getElementById('uc-rows-container');
            const addUcBtn = document.getElementById('addUcBtn');

            let ucList = [];

            // Função para ordinal em português (1°, 2°, 3°...)
            function ordinalNumber(n) {
                return `${n}°`;
            }

            function openUcModal() {
                ucRowsContainer.innerHTML = '';
                ucList = [];
                addUcRow();
                ucModal.style.display = 'flex';
                document.body.classList.add('modal-open');
            }

            function closeUcModal() {
                if (confirm("Cancelar irá perder o cadastro das UCs. Deseja continuar?")) {
                    ucModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            }

            closeUcModalBtn.onclick = cancelUcBtn.onclick = closeUcModal;
            addUcBtn.classList.add('btn', 'btn-primary'); // Garantir que fica verde

            addUcBtn.onclick = function () {
                addUcRow();
            }

            // Atualiza os números ordinais de todas as UCs
            function updateAllUcOrdinals() {
                ucRowsContainer.querySelectorAll('.uc-ordinal-label').forEach((label, i) => {
                    label.textContent = ordinalNumber(i + 1);
                });
            }

            function addUcRow(data = null) {
                const accordion = document.createElement('div');
                accordion.className = 'uc-accordion open';

                let ucName = 'Selecione uma unidade curricular';
                const cursoId = document.getElementById('curso').value;
                const curso = dadosCursos.find(c => c._id === cursoId);
                let ucOptions = '';
                if (curso && Array.isArray(curso.ordem_ucs)) {
                    ucOptions = curso.ordem_ucs
                        .map(uc => `<option value="${uc.id}">${uc.unidade_curricular}</option>`)
                        .join('');
                }

                // Monta o HTML dos campos presenciais e EAD lado a lado
                accordion.innerHTML = `
    <div style="display: flex; align-items: center;">
        <strong class="uc-ordinal-label" style="margin-right: 10px; font-size:1.1em;"></strong>
        <div class="uc-accordion-header open" style="flex:1;">
            <span class="uc-title">${ucName}</span>
            <i class="fas fa-chevron-right"></i>
        </div>
        <button type="button" class="uc-remove-btn btn-add-remove btn-remove-uc" title="Remover Unidade Curricular">
            <i class="fas fa-minus"></i>
        </button>
    </div>
    <div class="uc-accordion-content">
        <div class="form-group">
            <label>UC</label>
            <select class="uc-select" required>
                <option value="">Selecione</option>
                ${ucOptions}
            </select>
        </div>
        <div style="display: flex; gap: 8px;">
            <div class="form-group" style="flex:1;">
                <label>Carga horária Presencial</label>
                <input class="uc-presencial-ch" type="number" disabled>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Quantidade de Aulas Presencial</label>
                <input class="uc-presencial-aulas" type="number" disabled>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Quantidade de Dias Presencial</label>
                <input class="uc-presencial-dias" type="number" disabled>
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 6px;">
            <div class="form-group" style="flex:1;">
                <label>Carga horária EAD</label>
                <input class="uc-ead-ch" type="number" disabled>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Quantidade de Aulas EAD</label>
                <input class="uc-ead-aulas" type="number" disabled>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Quantidade de Dias EAD</label>
                <input class="uc-ead-dias" type="number" disabled>
            </div>
        </div>
        <div class="form-group" style="margin-top:8px;">
            <label>Instrutor</label>
            <select class="uc-instrutor" required>
                <option value="">Selecione</option>
                ${dadosInstrutores.map(ins => `<option value="${ins._id}">${ins.nome}</option>`).join('')}
            </select>
        </div>
        <div class="form-row" style="display: flex; gap: 8px;">
            <div class="form-group" style="flex:1;">
                <label>Data Início</label>
                <input type="date" class="uc-data-inicio" required>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Data Término</label>
                <input type="date" class="uc-data-fim" required>
            </div>
        </div>
    </div>
    `;

                ucRowsContainer.appendChild(accordion);
                ucList.push({});
                updateAllUcOrdinals();

                // Accordion abrir/fechar
                accordion.querySelector('.uc-accordion-header').onclick = function (e) {
                    if (e.target.closest('.uc-remove-btn')) return;
                    accordion.classList.toggle('open');
                };

                // Remover UC
                accordion.querySelector('.uc-remove-btn').onclick = function () {
                    if (ucRowsContainer.childElementCount > 1) {
                        accordion.remove();
                        ucList.splice([...ucRowsContainer.children].indexOf(accordion), 1);
                        updateAllUcOrdinals();
                    } else {
                        alert("Deve ter pelo menos uma UC na turma.");
                    }
                };

                // Preenche campos automáticos ao selecionar UC
                accordion.querySelector('.uc-select').onchange = function () {
                    const ucId = this.value;
                    const title = accordion.querySelector('.uc-title');
                    const cursoId = document.getElementById('curso').value;
                    const curso = dadosCursos.find(c => c._id === cursoId);
                    let foundUc = null;

                    // Busca na ordem_ucs do curso selecionado
                    if (curso && Array.isArray(curso.ordem_ucs)) {
                        foundUc = curso.ordem_ucs.find(ucObj => String(ucObj.id) === String(ucId));

                    }

                    title.textContent = foundUc ? foundUc.unidade_curricular : 'Selecione uma unidade curricular';

                    // Preenche ou limpa os campos
                    accordion.querySelector('.uc-presencial-ch').value = foundUc?.presencial?.carga_horaria || "";
                    accordion.querySelector('.uc-presencial-aulas').value = foundUc?.presencial?.quantidade_aulas_45min || "";
                    accordion.querySelector('.uc-presencial-dias').value = foundUc?.presencial?.dias_letivos || "";
                    accordion.querySelector('.uc-ead-ch').value = foundUc?.ead?.carga_horaria || "";
                    accordion.querySelector('.uc-ead-aulas').value = foundUc?.ead?.quantidade_aulas_45min || "";
                    accordion.querySelector('.uc-ead-dias').value = foundUc?.ead?.dias_letivos || "";
                };
            }



            // Salvar UCs da turma (simulação)
            saveUcBtn.onclick = function () {
                let ok = true;
                let arrUC = [];
                ucRowsContainer.querySelectorAll('.uc-accordion').forEach(acc => {
                    const selectUc = acc.querySelector('.uc-select');
                    const instrutor = acc.querySelector('.uc-instrutor');
                    const dataIni = acc.querySelector('.uc-data-inicio');
                    const dataFim = acc.querySelector('.uc-data-fim');
                    if (!selectUc.value || !instrutor.value || !dataIni.value || !dataFim.value) ok = false;
                    arrUC.push({
                        uc: selectUc.value,
                        instrutor: instrutor.value,
                        data_inicio: dataIni.value,
                        data_fim: dataFim.value
                    });
                });
                if (!ok || arrUC.length === 0) {
                    alert("Preencha todas as informações obrigatórias para cada UC.");
                    return;
                }
                // Aqui faria a requisição para salvar a turma + UCs no backend!
                alert("Turma e Unidades Curriculares cadastradas com sucesso! (Simulação)");
                ucModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            };
        });
    </script>

</body>

</html>