<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Turmas - SENAI</title>

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
                    <li><a href="gestao_turmas.php" class="active"><i class="fas fa-users"></i> Gestão de Turmas</a>
                    </li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a>
                    </li>
                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle">
                            <span><i class="fas fa-file-alt"></i> Relatórios</span>
                            <i class="fas fa-chevron-right caret"></i>
                        </a>
                        <ul class="submenu">
                            <li><a href="relatorio_disponibilidade_instrutor.php">Disponibilidade de Instrutor</a></li>
                        </ul>
                    </li>
                    <li id="nav-config" class="has-submenu">
                        <a href="#" class="submenu-toggle">
                            <span><i class="fas fa-tools"></i> Configuração</span>
                            <i class="fas fa-chevron-right caret"></i>
                        </a>
                        <ul class="submenu">
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
                <button class="btn btn-primary" id="addTurmaBtn">
                    <i class="fas fa-plus-circle"></i> Adicionar Nova Turma
                </button>
            </header>

            <section class="cards-section-class">
                <h2>Turmas Cadastradas</h2>

                <div id="filter_area" class="mb-3"></div>

                <div id="turmasCardsContainer" class="cards-responsive-class">
                </div>

                <div class="pagination-bar"
                    style="display:flex; justify-content: space-between; align-items:center; gap:10px; margin-top:20px; width: 100%;">
                    <button class="btn btn-secondary" id="prevPage" type="button">Anterior</button>
                    <span id="pageInfo">Página 1 de 1 • 0 registros</span>
                    <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
                </div>
            </section>
        </main>
    </div>

    <div id="turmaModal" class="modal modal-dialog-centered">
        <div class="modal-content">
            <span class="close-button" id="closeModalBtn">&times;</span>
            <h2 id="modalTitleTurma">Adicionar Nova Unidade Curricular</h2>

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

            <form id="turmaForm" autocomplete="off"
                style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
                <input type="hidden" id="turmaId">
                <input type="hidden" id="instituicaoId">

                <div class="modal-body">
                    <div id="alertTurma" style="display:none" class="alert alert-danger"></div>

                    <div class="form-step active" id="step-1">
                        <h5 class="mb-3 border-bottom pb-2"><b>Dados de Identificação</b></h5>
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label for="codTurma">Código da Turma <span class="text-danger">*</span></label>
                                <input type="text" id="codTurma" class="form-control" required minlength="3"
                                    maxlength="50" placeholder="Ex: HT-DES-01">
                            </div>

                            <div class="form-group col-md-8">
                                <label for="cursoVinculado">Curso <span class="text-danger">*</span></label>
                                <select id="cursoVinculado" class="form-control" required>
                                    <option value="">Selecione...</option>
                                </select>
                            </div>

                            <div class="form-group col-md-12 mt-2">
                                <label for="calendarioAcademico">Calendário Acadêmico <span
                                        class="text-danger">*</span></label>
                                <select id="calendarioAcademico" class="form-control" required>
                                    <option value="">Selecione...</option>
                                </select>
                            </div>

                            <div class="form-group col-md-3 mt-2">
                                <label class="small text-muted">Modalidade</label>
                                <input type="text" id="carregaModalidade" readonly disabled
                                    class="form-control bg-light">
                            </div>
                            <div class="form-group col-md-3 mt-2">
                                <label class="small text-muted">Área Tec.</label>
                                <input type="text" id="carregaAreaTec" readonly disabled class="form-control bg-light">
                            </div>
                            <div class="form-group col-md-3 mt-2">
                                <label class="small text-muted">Tipo</label>
                                <input type="text" id="carregaTipoCurso" readonly disabled
                                    class="form-control bg-light">
                            </div>
                            <div class="form-group col-md-3 mt-2">
                                <label class="small text-muted">Carga Horária</label>
                                <input type="text" id="carregaCargaHora" readonly disabled
                                    class="form-control bg-light">
                            </div>
                        </div>
                    </div>

                    <div class="form-step" id="step-2">
                        <h5 class="mb-3 border-bottom pb-2"><b>Operação e Cronograma</b></h5>
                        <div class="row">
                            <div class="form-group col-md-4">
                                <label for="turnoTurma">Turno <span class="text-danger">*</span></label>
                                <select id="turnoTurma" class="form-control" required>
                                    <option value="">Selecione...</option>
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noite">Noite</option>
                                </select>
                            </div>

                            <div class="form-group col-md-8">
                                <label for="empresaVinculada">Empresa Parceira <span
                                        class="text-danger">*</span></label>
                                <select id="empresaVinculada" class="form-control" required>
                                    <option value="">Selecione...</option>
                                </select>
                            </div>

                            <div class="form-group col-md-6 mt-2">
                                <label for="dataInicio">Data Início <span class="text-danger">*</span></label>
                                <input type="date" id="dataInicio" class="form-control" required>
                            </div>

                            <div class="form-group col-md-6 mt-2">
                                <label for="dataFim">Data Fim <span class="text-danger">*</span></label>
                                <input type="date" id="dataFim" class="form-control" required disabled>
                                <small class="text-muted" id="msgDataFim">Selecione início primeiro.</small>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="qtdAlunos">Qtd. Alunos <span class="text-danger">*</span></label>
                                <input type="number" id="qtdAlunos" class="form-control" required min="1">
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="situacaoTurma">Situação <span class="text-danger">*</span></label>
                                <select id="situacaoTurma" class="form-control" required>
                                    <option value="Não iniciada">Não iniciada</option>
                                    <option value="Em andamento">Em andamento</option>
                                    <option value="Concluída">Concluída</option>
                                    <option value="Cancelada">Cancelada</option>
                                </select>
                            </div>

                            <div class="form-group col-md-4 mt-2">
                                <label for="statusTurma">Status</label>
                                <select id="statusTurma" class="form-control bg-light" disabled>
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div class="form-group col-md-12 mt-2">
                                <label for="obsTurma">Observações</label>
                                <textarea id="obsTurma" class="form-control" rows="2"></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-step" id="step-3">
                        <h5 class="mb-3 border-bottom pb-2"><b>Grade de UCs e Docência</b></h5>

                        <div id="alertUcs" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mt-4"
                            role="alert">
                            <h5 class="font-bold flex items-center gap-2" style="font-size: 1rem;">
                                <i class="fas fa-exclamation-triangle"></i> Atenção aos Dias Letivos
                            </h5>
                            <p class="text-sm mt-1">
                                Confira o total de dias letivos que cada unidade curricular possui (informado abaixo do
                                título da UC).
                            </p>
                            <hr class="border-yellow-200 my-2">
                            <p class="text-sm mb-0">
                                Com base nesta quantidade,
                                <a href="gestao_calendarios.php" target="_blank"
                                    class="font-bold underline hover:text-yellow-900">
                                    abra a gestão de calendários
                                </a>, visualize o calendário escolhido para esta turma e verifique os dias letivos para
                                garantir que não haja erros de cronograma.
                            </p>
                        </div>

                        <div id="listaUcsContainer">
                            <p class="text-center text-muted py-4">Selecione um curso no Passo 1 para carregar a grade.
                            </p>
                        </div>
                    </div>

                    <div class="form-step" id="step-4">
                        <h4 class="mb-3 text-success"><i class="fas fa-check-circle"></i> Confirmação</h4>
                        <p class="text-muted">Verifique os dados abaixo antes de salvar.</p>

                        <div id="resumoContainer" class="row">
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="background-color: #fff; z-index: 10;">
                    <div class="step-actions" style="display: flex; justify-content: space-between; width: 100%;">
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
    <script src="../assets/js/turmas_script.js" defer></script>
</body>

</html>