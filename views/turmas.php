<?php
    //require_once("../config/verifica_login.php"); 
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Turmas - SENAI</title>

    <script src="https://cdn.tailwindcss.com"></script>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
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
                    <li><a href="gestao_turmas.php" class="active"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a></li>
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
            <header class="main-header">
                <h1>Gestão de Turmas</h1>
                <button class="btn btn-primary" id="addTurmaBtn"><i class="fas fa-plus-circle"></i> Criar Turma</button>
            </header>

            <section class="cards-section-class">
                <h2>Turmas Cadastradas</h2>

                <div id="filter_area" class="filter-container mb-3">
                    <div class="filter-group">
                        <label for="mock_search">Buscar:</label>
                        <input type="text" id="mock_search" class="filter-input form-control" placeholder="Digite para buscar...">
                    </div>
                    <div class="filter-group">
                        <label for="mock_status">Status:</label>
                        <select id="mock_status" class="filter-input form-select">
                            <option value="Todos">Todos</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="mock_pagesize">Itens/página:</label>
                        <select id="mock_pagesize" class="filter-input form-select">
                            <option value="10" selected>10</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                    <div class="filter-group" style="flex: 0 0 auto;">
                         <button id="mock_clear" class="btn btn-light border filter-btn-clear filter-input">
                            <i class="fas fa-broom"></i> Limpar
                         </button>
                    </div>
                </div>

                <div id="cardsContainer" class="cards-responsive-class">
                    </div>

                <div class="pagination-bar" style="display:flex;align-items:center;gap:10px;margin-top:10px;">
                    <button class="btn btn-secondary" id="prevPage" type="button" disabled>Anterior</button>
                    <span id="pageInfo">Página 1 de 2 • 20 registros</span>
                    <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
                </div>
            </section>
        </main>
    </div>

    <div id="turmaModal" class="modal modal-dialog-centered">
        <div class="modal-content">

            <span class="close-button" id="closeModalBtn">&times;</span>
            <h2 id="modalTitleTurma">Adicionar Nova Turma</h2>


            <div class="stepper-wrapper">
                <div class="step-item active" data-step="1">
                    <div class="step-circle">1</div><small>Identificação</small>
                </div>
                <div class="step-item" data-step="2">
                    <div class="step-circle">2</div><small>Operação</small>
                </div>
                <div class="step-item" data-step="3">
                    <div class="step-circle">3</div><small>Grade</small>
                </div>
                <div class="step-item" data-step="4">
                    <div class="step-circle">4</div><small>Resumo</small>
                </div>
            </div>

            <form id="turmaForm" autocomplete="off">
                <div class="modal-body">
                    <input type="hidden" id="turmaId">
                    <div id="alertTurma" class="alert alert-danger" style="display:none;"></div>

                    <div class="form-step active" id="step-1">
                        <h5 class="mb-3 border-bottom pb-2"><b>Dados de Identificação</b></h5>
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label for="codTurma">Código da Turma <span class="text-danger">*</span></label>
                                <input type="text" id="codTurma" class="form-control" required minlength="3"
                                    maxlength="50" placeholder="Ex: HT-DES-01-M-26-12800">
                                <small class="form-text text-muted">Mínimo 3 e máximo 50 caracteres.</small>
                            </div>

                            <div class="form-group col-md-8">
                                <label for="cursoVinculado">Curso <span class="text-danger">*</span></label>
                                <select id="cursoVinculado" class="form-control" required>
                                    <option value="">Selecione o Curso</option>
                                    <option value="Desenvolvimento">Desenvolvimento de Sistemas</option>
                                    <option value="Eletronica">Eletrônica Industrial</option>
                                </select>
                            </div>

                            <div class="form-group col-md-12 mt-2">
                                <label for="calendarioAcademico">Calendário Acadêmico <span
                                        class="text-danger">*</span></label>
                                <select id="calendarioAcademico" class="form-control" required>
                                    <option value="">Selecione o Calendário</option>
                                    <option value="2026.1">2026.1 - Primeiro Semestre</option>
                                    <option value="2026.2">2026.2 - Segundo Semestre</option>
                                    <option value="2027.1">2027.1 - Primeiro Semestre</option>
                                </select>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label>Modalidade:</label>
                                <input type="text" id="carregaModalidade" readonly disabled
                                    class="form-control bg-light" placeholder="...">
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label>Área Tecnológica:</label>
                                <input type="text" id="carregaAreaTec" readonly disabled class="form-control bg-light"
                                    placeholder="...">
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label>Tipo do Curso:</label>
                                <input type="text" id="carregaTipoCurso" readonly disabled class="form-control bg-light"
                                    placeholder="...">
                            </div>

                            <div class="form-group col-md-12 mt-2">
                                <label>Carga Horária Total:</label>
                                <input type="text" id="carregaCargaHora" readonly disabled class="form-control bg-light"
                                    placeholder="...">
                            </div>
                        </div>
                    </div>

                    <div class="form-step" id="step-2">
                        <h5 class="mb-3 border-bottom pb-2"><b>Operação e Cronograma</b></h5>
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label for="turnoTurma">Turno <span class="text-danger">*</span></label>
                                <select id="turnoTurma" class="form-control" required>
                                    <option value="">Selecione o Turno</option>
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noite">Noite</option>
                                </select>
                            </div>

                            <div class="form-group col-md-8">
                                <label for="empresaVinculada">Empresa Parceira <span
                                        class="text-danger">*</span></label>
                                <select id="empresaVinculada" class="form-control" required>
                                    <option value="">Selecione a Empresa</option>
                                    <option value="Empresa A">Empresa A</option>
                                    <option value="Empresa B">Empresa B</option>
                                    <option value="Venda Direta">Venda Direta (Pessoa Física)</option>
                                </select>
                            </div>

                            <div class="form-group col-md-6 mt-2">
                                <label for="dataInicio">Data de Início <span class="text-danger">*</span></label>
                                <input type="date" id="dataInicio" class="form-control" required>
                            </div>

                            <div class="form-group col-md-6 mt-2">
                                <label for="dataFim">Data de Fim <span class="text-danger">*</span></label>
                                <input type="date" id="dataFim" class="form-control" required disabled>
                                <small class="text-muted" id="msgDataFim">Selecione a data de início primeiro.</small>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="qtdAlunos">Qtd. Alunos <span class="text-danger">*</span></label>
                                <input type="text" id="qtdAlunos" class="form-control" placeholder="0" required
                                    inputmode="numeric">
                                <small id="errorQtdAlunos" class="text-danger fw-bold" style="display:none;"></small>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="situacaoTurma">Situação <span class="text-danger">*</span></label>
                                <select id="situacaoTurma" class="form-control" required>
                                    <option value="">Selecione a Situação</option>
                                    <option value="Não iniciada">Não iniciada</option>
                                    <option value="Em andamento">Em andamento</option>
                                    <option value="Concluída">Concluída</option>
                                </select>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="statusTurma">Status</label>
                                <select id="statusTurma" class="form-control bg-light" disabled readonly>
                                    <option value="Ativo" selected>Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div class="form-group col-md-12 mt-2">
                                <label for="obsTurma">Observações</label>
                                <textarea id="obsTurma" class="form-control" rows="2"
                                    placeholder="Opcional..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-step" id="step-3">
                        <h5 class="mb-3 border-bottom pb-2"><b>Grade de UCs e Docência</b></h5>



                        <div class="alert alert-warning mt-4" role="alert">
                            <h5 class="alert-heading" style="font-size: 1rem;">
                                <i class="fas fa-exclamation-triangle"></i> Atenção aos Dias Letivos
                            </h5>
                            <p class="mb-1 small">
                                Confira o total de dias letivos que cada unidade curricular possui (informado abaixo do
                                título da UC).
                            </p>
                            <hr class="my-2">
                            <p class="mb-0 small">
                                Com base nesta quantidade, <a href="#" target="_blank" class="alert-link fw-bold">abra a
                                    gestão de calendários</a>,
                                visualize o calendário escolhido para esta turma e verifique os dias letivos da data
                                inicial contando até a data final
                                para garantir que não haja erros de cronograma.
                            </p>
                        </div>
                        <div id="listaUcsContainer">
                        </div>
                    </div>

                    <div class="form-step" id="step-4">
                        <h4 class="mb-3 text-success"><i class="fas fa-check-circle"></i> Confirmação de Dados</h4>
                        <p class="text-muted">Verifique se as informações abaixo estão corretas antes de salvar.</p>

                        <div class="row" id="resumoContainer">
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <div class="step-actions">
                        <button type="button" class="btn btn-secondary" id="btnPrev" disabled>
                            <i class="fas fa-arrow-left"></i> Anterior
                        </button>
                        <div>
                            <button type="button" class="btn btn-primary" id="btnNext">
                                Próximo <i class="fas fa-arrow-right"></i>
                            </button>
                            <button type="submit" class="btn btn-success" id="btnSubmit" style="display: none;">
                                <i class="fas fa-save"></i> Finalizar Cadastro
                            </button>
                        </div>
                    </div>
                </div>
            </form>

        </div>
    </div>
    <script src="../assets/js/geral_script.js"></script>
    

    <script>
        // Função global para o toggle do substituto (HTML requer isso no escopo global)
        function toggleSubstituto(checkbox) {
            const box = checkbox.closest('.ucs-row').querySelector('.substituto-box');
            box.style.display = checkbox.checked ? 'flex' : 'none';
        }

        // --- LÓGICA DO MODAL (ADAPTADA PARA O ID DO BOTÃO PRINCIPAL) ---
        (() => {
            'use strict';

            // --- SELETORES DO DOM ---
            const modal = document.getElementById('turmaModal');
            const form = document.getElementById('turmaForm');
            const cursoSelect = document.getElementById('cursoVinculado');
            const containerUcs = document.getElementById('listaUcsContainer');
            const resumoContainer = document.getElementById('resumoContainer');

            // Seletores específicos para regras de negócio (Step 2)
            const dataInicioInput = document.getElementById('dataInicio');
            const dataFimInput = document.getElementById('dataFim');
            const qtdAlunosInput = document.getElementById('qtdAlunos');
            const errorQtdAlunos = document.getElementById('errorQtdAlunos');

            // --- DADOS MOCKADOS ---
            const dadosCurso = {
                "Desenvolvimento": {
                    ucs: ["Lógica de Programação", "Banco de Dados", "Testes de Software", "Comunicação e Redação Técnica", "Modelagem de Sistemas"],
                    info: {
                        modalidade: "Híbrido",
                        area: "Tecnologia da Informação",
                        tipo: "Técnico",
                        carga: "1200 horas"
                    }
                },
                "Eletronica": {
                    ucs: ["Comunicação e Redação Técnica", "Informática Aplicada", "Cálculo Aplicado", "Fundamentos de Eletroeletronica", "Princípios de Elétrica"],
                    info: {
                        modalidade: "Presencial",
                        area: "Indústria",
                        tipo: "Técnico",
                        carga: "1400 horas"
                    }
                }
            };

            // --- CONTROLE DE ESTADO ---
            let currentStep = 0;
            const steps = document.querySelectorAll('.form-step');
            const stepIndicators = document.querySelectorAll('.step-item');

            // --- INICIALIZAÇÃO ---
            const init = () => {
                bindEvents();
            };

            const bindEvents = () => {
                // Navegação e Modal
                // AQUI FOI A ALTERAÇÃO: ID do botão principal da página
                document.getElementById('addTurmaBtn').addEventListener('click', openModal);
                document.getElementById('closeModalBtn').addEventListener('click', closeModal);
                document.getElementById('btnNext').addEventListener('click', nextStep);
                document.getElementById('btnPrev').addEventListener('click', prevStep);

                // Regras Step 1
                cursoSelect.addEventListener('change', handleCursoChange);

                // Regras Step 2
                if (dataInicioInput) dataInicioInput.addEventListener('change', handleDataInicio);
                if (qtdAlunosInput) qtdAlunosInput.addEventListener('input', handleQtdAlunosInput);

                // Submit
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    // Simulação de envio
                    alert("Turma salva com sucesso! Dados prontos para envio ao Backend.");
                    closeModal();
                });
            };

            // --- LÓGICA DE NEGÓCIO: STEP 1 ---
            function handleCursoChange() {
                renderUcs();
                preencherDadosCurso();
            }

            function preencherDadosCurso() {
                const curso = cursoSelect.value;
                const ids = ['carregaModalidade', 'carregaAreaTec', 'carregaTipoCurso', 'carregaCargaHora'];

                // Helper para limpar campos
                const clearFields = () => ids.forEach(id => document.getElementById(id).value = "");

                if (curso && dadosCurso[curso]) {
                    const info = dadosCurso[curso].info;
                    document.getElementById('carregaModalidade').value = info.modalidade;
                    document.getElementById('carregaAreaTec').value = info.area;
                    document.getElementById('carregaTipoCurso').value = info.tipo;
                    document.getElementById('carregaCargaHora').value = info.carga;
                } else {
                    clearFields();
                }
            }

            // --- LÓGICA DE NEGÓCIO: STEP 2 ---
            function handleDataInicio() {
                const dataInicio = dataInicioInput.value;
                const msgErro = document.getElementById('msgDataFim');

                if (dataInicio) {
                    dataFimInput.disabled = false;
                    dataFimInput.min = dataInicio;
                    if (msgErro) msgErro.style.display = 'none';
                } else {
                    dataFimInput.disabled = true;
                    dataFimInput.value = '';
                    if (msgErro) msgErro.style.display = 'block';
                }
            }

            function handleQtdAlunosInput(e) {
                const input = e.target;
                const value = input.value;
                const isInteger = /^\d+$/.test(value);

                if (value === '') {
                    if (errorQtdAlunos) errorQtdAlunos.style.display = 'none';
                    input.classList.remove('is-invalid');
                    return;
                }

                if (!isInteger) {
                    if (errorQtdAlunos) {
                        errorQtdAlunos.textContent = "Permitido apenas números inteiros positivos.";
                        errorQtdAlunos.style.display = 'block';
                    }
                    input.classList.add('is-invalid');
                } else {
                    if (errorQtdAlunos) errorQtdAlunos.style.display = 'none';
                    input.classList.remove('is-invalid');
                }
            }

            // --- LÓGICA DE NEGÓCIO: STEP 3 (Renderização) ---
            function renderUcs() {
                const curso = cursoSelect.value;
                containerUcs.innerHTML = '';

                if (!curso) {
                    containerUcs.innerHTML = '<p class="text-muted p-3">Por favor, selecione um curso no Passo 1 para carregar a grade.</p>';
                    return;
                }

                const lista = dadosCurso[curso].ucs;

                lista.forEach((disc) => {
                    const row = document.createElement('div');
                    row.className = 'ucs-row';

                    row.innerHTML = `
                <div class="ucs-title" style="font-weight:bold; color:#0d6efd;">${disc}</div>
                
                <div id="totalDiasUc" class="text-muted small mb-3" style="font-weight: 500;">
                    Total de dias letivos da UC: <span class="text-dark">10</span>
                </div>

                <div class="row">
                    <div class="col-md-3">
                        <label class="small">Início</label>
                        <input type="date" id="uc_init" class="form-control form-control-sm inp-inicio-uc">
                    </div>
                    <div class="col-md-3">
                        <label class="small">Fim</label>
                        <input type="date" id="uc_fim" class="form-control form-control-sm inp-fim-uc">
                    </div>
                    <div class="col-md-6">
                        <label class="small">Instrutor Titular</label>
                        <select class="form-control form-control-sm inp-instrutor">
                            <option value="">Selecione o Instrutor</option>
                            <option value="1">Instrutor A</option>
                            <option value="2">Instrutor B</option>
                        </select>
                    </div>
                </div>

                <div class="mt-2">
                    <label class="small text-primary" style="cursor:pointer">
                        <input type="checkbox" id="subs_check" onchange="toggleSubstituto(this)" class="check-subs"> Possui Substituto Temporário?
                    </label>
                </div>

                <div class="substituto-box row" style="display:none; margin-top:10px; background:#fff3cd; padding:10px; border-radius:5px;">
                    <div class="col-md-6">
                        <label class="small">Instrutor Substituto</label>
                        <select class="form-control form-control-sm">
                            <option value="">Selecione o Substituto</option>
                            <option value="3">Instrutor C</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="small">Início Subst.</label>
                        <input type="date" id="inicio_subs" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="small">Fim Subst.</label>
                        <input type="date" id="fim_subs" class="form-control form-control-sm">
                    </div>
                </div>
            `;
                    containerUcs.appendChild(row);
                });
            }

            // --- LÓGICA DE NEGÓCIO: STEP 4 (Resumo) ---
            const renderResumo = () => {
                const getText = (id) => {
                    const el = document.getElementById(id);
                    return el && el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : (el ? el.value : '-');
                };
                const getVal = (id) => {
                    const el = document.getElementById(id);
                    return el ? (el.value || '-') : '-';
                };

                let html = `
            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Código</span><span class="summary-value">${getVal('codTurma')}</span></div></div>
            <div class="col-md-8"><div class="summary-group"><span class="summary-label">Curso</span><span class="summary-value">${getText('cursoVinculado')}</span></div></div>
            <div class="col-md-12"><div class="summary-group"><span class="summary-label">Calendário</span><span class="summary-value">${getText('calendarioAcademico')}</span></div></div>

            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Modalidade</span><span class="summary-value">${getVal('carregaModalidade')}</span></div></div>
            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Área</span><span class="summary-value">${getVal('carregaAreaTec')}</span></div></div>
            <div class="col-md-4"><div class="summary-group"><span class="summary-label">CH Total</span><span class="summary-value">${getVal('carregaCargaHora')}</span></div></div>
            
            <div class="col-12"><hr></div>

            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Início</span><span class="summary-value">${getVal('dataInicio')}</span></div></div>
            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Fim</span><span class="summary-value">${getVal('dataFim')}</span></div></div>
            <div class="col-md-4"><div class="summary-group"><span class="summary-label">Turno</span><span class="summary-value">${getVal('turnoTurma')}</span></div></div>
            <div class="col-md-6"><div class="summary-group"><span class="summary-label">Empresa</span><span class="summary-value">${getText('empresaVinculada')}</span></div></div>
            <div class="col-md-3"><div class="summary-group"><span class="summary-label">Qtd. Alunos</span><span class="summary-value">${getVal('qtdAlunos')}</span></div></div>
            <div class="col-md-3"><div class="summary-group"><span class="summary-label">Situação</span><span class="summary-value">${getVal('situacaoTurma')}</span></div></div>
            <div class="col-12"><div class="summary-group"><span class="summary-label">Obs</span><span class="summary-value small">${getVal('obsTurma')}</span></div></div>
            
            <div class="col-12"><hr><h6 class="text-secondary">Resumo da Grade</h6></div>
        `;

                const rows = containerUcs.querySelectorAll('.ucs-row');
                if (rows.length === 0) {
                    html += '<div class="col-12 text-center text-muted">Nenhuma unidade curricular encontrada.</div>';
                } else {
                    html += '<div class="col-12"><ul class="list-group list-group-flush">';
                    
                    // Helper para formatar data: YYYY-MM-DD para DD/MM/AAAA
                    const formatDate = (dateString) => {
                        if(!dateString) return null;
                        const [year, month, day] = dateString.split('-');
                        return `${day}/${month}/${year}`;
                    };

                    rows.forEach(row => {
                        const title = row.querySelector('.ucs-title').innerText;
                        const selectInstrutor = row.querySelector('.inp-instrutor');
                        const instrutor = selectInstrutor.options[selectInstrutor.selectedIndex] ? selectInstrutor.options[selectInstrutor.selectedIndex].text : 'Não definido';
                        
                        // Capturando valores das datas
                        const valInicio = row.querySelector('.inp-inicio-uc').value;
                        const valFim = row.querySelector('.inp-fim-uc').value;

                        // Formatando
                        const dtInicio = formatDate(valInicio);
                        const dtFim = formatDate(valFim);

                        // Lógica de exibição da data
                        let displayData = 'não há data de inicio e fim';
                        if(dtInicio && dtFim) {
                            displayData = `${dtInicio} - ${dtFim}`;
                        }

                        // Construindo o HTML com 4 colunas usando o Grid do Bootstrap dentro da li
                        html += `
                        <li class="list-group-item py-3">
                            <div class="row align-items-center g-2 text-center text-md-start">
                                
                                <div class="col-md-4">
                                    <span class="fw-bold text-primary" style="font-size: 0.95rem;">${title}</span>
                                </div>
                                
                                <div class="col-md-2 text-md-center">
                                    <span class="badge bg-secondary">10 dias</span>
                                </div>

                                <div class="col-md-3 text-md-center">
                                     <small class="text-muted" style="font-size: 0.85rem;">${displayData}</small>
                                </div>

                                <div class="col-md-3 text-md-end">
                                     <span class="badge bg-light text-dark border text-wrap">${instrutor}</span>
                                </div>
                            </div>
                        </li>`;
                    });
                    html += '</ul></div>';
                }

                resumoContainer.innerHTML = html;
            };

            // --- CONTROLE DE NAVEGAÇÃO ---
            const openModal = () => {
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');
                resetStepper();
            };

            const closeModal = () => {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            };

            const updateUI = () => {
                steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
                stepIndicators.forEach((s, i) => s.classList.toggle('active', i <= currentStep));
                document.getElementById('btnPrev').disabled = currentStep === 0;

                const isLast = currentStep === steps.length - 1;
                document.getElementById('btnNext').style.display = isLast ? 'none' : 'inline-flex';
                document.getElementById('btnSubmit').style.display = isLast ? 'inline-flex' : 'none';

                if (isLast) renderResumo();
            };

            const nextStep = () => {
                const activeStepDiv = steps[currentStep];
                const inputs = activeStepDiv.querySelectorAll('input[required], select[required]');
                let valid = true;

                // 1. Validação padrão HTML5
                inputs.forEach(inp => {
                    if (!inp.checkValidity()) {
                        inp.classList.add('is-invalid');
                        inp.reportValidity();
                        valid = false;
                    } else {
                        inp.classList.remove('is-invalid');
                    }
                });

                // 2. Validação Customizada (Qtd Alunos)
                if (qtdAlunosInput && qtdAlunosInput.classList.contains('is-invalid')) {
                    valid = false;
                    // Se estiver no step 2 e houver erro, foca no input
                    if (currentStep === 1) qtdAlunosInput.focus();
                }

                if (valid && currentStep < steps.length - 1) {
                    currentStep++;
                    updateUI();
                }
            };

            const prevStep = () => { if (currentStep > 0) { currentStep--; updateUI(); } };

            const resetStepper = () => {
                currentStep = 0;
                form.reset();
                containerUcs.innerHTML = '';
                // Reset manual de estados visuais
                if (dataFimInput) {
                    dataFimInput.disabled = true;
                    document.getElementById('msgDataFim').style.display = 'block';
                }
                if (errorQtdAlunos) errorQtdAlunos.style.display = 'none';

                updateUI();
            };

            init();
        })();

        // --- LÓGICA DOS CARDS E PAGINAÇÃO (MANTIDA) ---
        (() => {
            const container = document.getElementById('cardsContainer');
            const btnPrev = document.getElementById('prevPage');
            const btnNext = document.getElementById('nextPage');
            const pageInfo = document.getElementById('pageInfo');
            const btnClear = document.getElementById('mock_clear');

            let currentPage = 1;
            const itemsPerPage = 10;
            const totalItems = 20;
            
            const mockData = Array.from({ length: 20 }, (_, i) => {
                const id = i + 1;
                const isOdd = id % 2 !== 0;
                const turno = isOdd ? 'Noite' : 'Tarde';
                
                return {
                    id: id,
                    codigo: `HT-SIS-${String(id).padStart(2, '0')}-N-25-12800`,
                    turno: turno,
                    curso: 'Técnico de Desenvolvimento de Sistemas',
                    situacao: 'Em andamento',
                    status: 'Ativo',
                    periodo: '01/01/2026 até 01/01/2027',
                    modalidade: 'Técnico / Presencial'
                };
            });

            function renderCards(page) {
                container.innerHTML = '';
                
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedItems = mockData.slice(start, end);

                paginatedItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'card-turma';
                    card.innerHTML = `
                        <div class="card-turma-header">
                            <span class="card-turma-code">${item.codigo}</span>
                            <span class="card-badge-turno">${item.turno}</span>
                        </div>
                        <div class="card-turma-body">
                            <div class="card-info-row">
                                <i class="fas fa-book"></i>
                                <strong>${item.curso}</strong>
                            </div>
                            <div class="card-info-row">
                                <i class="fas fa-info-circle"></i>
                                <span>Situação: ${item.situacao} <span class="mx-1">•</span> Status: <span class="status-badge status-ativo">${item.status}</span></span>
                            </div>
                            <div class="card-info-row">
                                <i class="far fa-calendar-alt"></i>
                                <span>${item.periodo}</span>
                            </div>
                            <div class="card-info-row">
                                <i class="fas fa-shapes"></i>
                                <span>${item.modalidade}</span>
                            </div>
                        </div>
                        <div class="card-turma-footer">
                            <button type="button" class="btn-card btn-card-view" title="Visualizar Dados">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn-card btn-card-edit" title="Editar Turma">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button type="button" class="btn-card btn-card-deactivate" title="Desativar">
                                <i class="fas fa-ban"></i>
                            </button>
                            <button type="button" class="btn-card btn-card-calendar" title="Calendário da Turma">
                                <i class="fas fa-calendar-day"></i>
                            </button>
                        </div>
                    `;
                    container.appendChild(card);
                });

                updatePaginationInfo();
            }

            function updatePaginationInfo() {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                pageInfo.textContent = `Página ${currentPage} de ${totalPages} • ${totalItems} registros`;
                
                btnPrev.disabled = currentPage === 1;
                btnNext.disabled = currentPage === totalPages;
            }

            btnNext.addEventListener('click', () => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderCards(currentPage);
                }
            });

            btnPrev.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderCards(currentPage);
                }
            });

            if(btnClear){
                btnClear.addEventListener('click', () => {
                    document.getElementById('mock_search').value = '';
                    document.getElementById('mock_status').value = 'Todos';
                    document.getElementById('mock_pagesize').value = '10';
                    currentPage = 1;
                    renderCards(currentPage);
                });
            }

            renderCards(currentPage);
            if (!window.App) throw new Error('Carregue geral_script.js antes de ucs_script.js.');

  const { $, $$ } = App.dom;
  const { safeFetch } = App.net;
  const { paginateData, bindControls, updateUI } = App.pagination;

  const LS_KEY = 'ucs_gestao_state_v2';

  // Mantemos a API pois ela alimenta a tabela
  const API = Object.freeze({
    bootstrap: '../backend/processa_ucs.php?action=bootstrap',
    uc: '../backend/processa_ucs.php',
  });

  const DEFAULT_STATE = {
    ucs: [], // Instituições removido pois não há select para popular
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    filters: { q: '', status: ['Todos'], tipoUc: 'Todos', created_from: '', created_to: '' },
  };

  let savedState = {};
  try { savedState = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { }

  const STATE = {
    ...DEFAULT_STATE,
    pagination: { ...DEFAULT_STATE.pagination, ...savedState.pagination },
    filters: { ...DEFAULT_STATE.filters, ...savedState.filters }
  };

  // Apenas referências que existem no HTML fornecido
  const refs = {
    ucTableBody: $('#ucTableBody'), // Existe no HTML
    
    pagElements: {
      prev: $('#prevPage'), // Existe no HTML
      next: $('#nextPage'), // Existe no HTML
      info: $('#pageInfo'), // Existe no HTML
      sizeSel: null
    }
  };

  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      pagination: { pageSize: STATE.pagination.pageSize },
      filters: STATE.filters
    }));
  }

  async function carregarDadosIniciais() {
    try {
      const data = await safeFetch(API.bootstrap);
      // Removemos a lógica de instituições, pois não há onde exibir
      STATE.ucs = Array.isArray(data.ucs) ? data.ucs : (Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if(refs.ucTableBody) {
        refs.ucTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-600">Erro ao carregar dados.</td></tr>`;
      }
    }
  }

  function applyFiltersFromUI() {
    const elSearch = document.getElementById('gen_search');
    STATE.filters.q = (elSearch?.value || '').trim();

    const elStatus = document.getElementById('gen_status');
    STATE.filters.status = elStatus ? [elStatus.value] : ['Todos'];

    const elTipo = document.getElementById('gen_tipo_uc');
    STATE.filters.tipoUc = elTipo ? elTipo.value : 'Todos';

    const elFrom = document.getElementById('gen_created_from');
    const elTo = document.getElementById('gen_created_to');
    STATE.filters.created_from = elFrom?.value ? toIsoStartOfDayLocal(elFrom.value) : '';
    STATE.filters.created_to = elTo?.value ? toIsoEndOfDayLocal(elTo.value) : '';

    const elSize = document.getElementById('gen_pagesize');
    if (elSize) {
      STATE.pagination.pageSize = parseInt(elSize.value, 10);
      refs.pagElements.sizeSel = elSize;
    }
  }

  function renderizarConteudo() {
    applyFiltersFromUI();
    saveState();

    const filtered = STATE.ucs.filter(uc => {
      const f = STATE.filters;
      
      if (f.q) {
        const text = `${uc.descricao} ${uc.tipo_uc}`.toLowerCase();
        if (!text.includes(f.q.toLowerCase())) return false;
      }
      
      if (f.status[0] !== 'Todos') {
          const statusItem = (uc.status || 'Ativo').toLowerCase();
          const filtroStatus = f.status[0].toLowerCase();
          if (statusItem !== filtroStatus) return false;
      }

      if (f.tipoUc && f.tipoUc !== 'Todos') {
          if (uc.tipo_uc !== f.tipoUc) return false;
      }

      if (f.created_from && uc.data_criacao < f.created_from) return false;
      if (f.created_to && uc.data_criacao > f.created_to) return false;

      return true;
    });

    const { pagedData, meta } = paginateData(filtered, STATE.pagination.page, STATE.pagination.pageSize);
    STATE.pagination = { ...STATE.pagination, ...meta };

    updateUI(refs.pagElements, meta);
    renderTable(pagedData);
  }

  function renderTable(lista) {
    if (!refs.ucTableBody) return;

    if (!lista.length) {
      refs.ucTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    const fmtData = App.format.fmtDateBR;

    // Mantemos a estrutura das colunas para bater com o <thead> do HTML
    // Mas os botões de ação (view/edit/delete) foram tornados inertes ou removidos,
    // pois os modais correspondentes não existem neste HTML.
    refs.ucTableBody.innerHTML = lista.map(uc => {
        const statusClass = (uc.status === 'Inativo') ? 'text-red-500 font-bold' : 'text-green-600';

        return `
      <tr>
        <td>${uc.descricao || ''}</td>
        <td>${uc.tipo_uc || ''}</td>
        <td><span class="${statusClass}">${uc.status || 'Ativo'}</span></td>
        <td>${fmtData(uc.data_criacao)}</td>
        <td>
          <div class="action-buttons flex gap-2 justify-center">
             <button class="btn btn-icon btn-view disabled" disabled title="Visualização indisponível nesta tela"><i class="fas fa-eye"></i></button>
             <button class="btn btn-icon btn-edit disabled" disabled title="Edição indisponível nesta tela"><i class="fas fa-edit"></i></button>
             <button class="btn btn-icon btn-delete" data-id="${uc._id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  function setupFilters() {
    if (App.filters && App.filters.render) {
      App.filters.render(
        'filter_area', // Existe no HTML
        { search: true, date: true, status: true, pageSize: true, tipoUc: true },
        null,
        () => {
          STATE.pagination.page = 1;
          renderizarConteudo();
        },
        () => {
          STATE.filters = { ...DEFAULT_STATE.filters };
          STATE.pagination.page = 1;
          renderizarConteudo();
        }
      );
    }

    if (STATE.filters.q && document.getElementById('gen_search'))
      document.getElementById('gen_search').value = STATE.filters.q;
      
    if (STATE.filters.tipoUc && document.getElementById('gen_tipo_uc'))
        document.getElementById('gen_tipo_uc').value = STATE.filters.tipoUc;

    renderizarConteudo();
  }

  function setupEvents() {
    // Eventos de Paginação (Elementos existem no HTML)
    bindControls(refs.pagElements, (action) => {
      if (action === 'prev' && STATE.pagination.page > 1) STATE.pagination.page--;
      if (action === 'next' && STATE.pagination.page < STATE.pagination.totalPages) STATE.pagination.page++;
      renderizarConteudo();
    });

    // Eventos da Tabela (Apenas Delete foi mantido como tentativa, pois não requer Modal HTML, apenas JS confirm)
    refs.ucTableBody?.addEventListener('click', async (e) => {
      const btnDel = e.target.closest('.btn-delete');

      if (btnDel) {
        if (!confirm('Tem certeza que deseja excluir esta UC?')) return;
        try {
            App.loader.show();
            await safeFetch(`${API.uc}?id=${btnDel.dataset.id}`, { method: 'DELETE' });
            await carregarDadosIniciais();
            renderizarConteudo();
            alert('Excluído com sucesso.');
        } catch (err) { 
            alert('Erro ao excluir: ' + err.message); 
        } finally {
            App.loader.hide();
        }
      }
    });

    // Removido listeners de Add/Edit/View/Save pois os elementos #addUcBtn, #ucModal, etc não existem no HTML.
  }

  document.addEventListener('DOMContentLoaded', async () => {
    App.loader.show();
    setupEvents();

    try {
      await carregarDadosIniciais();
      setupFilters();
    } catch (err) {
      console.error('Falha na inicialização:', err);
      // alert('Erro ao carregar sistema.'); // Opcional
    } finally {
      App.loader.hide();
    }
  });
        })();
    </script>
</body>
</html>