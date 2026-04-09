<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alocação de UCs - SENAI</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        /* Pequeno ajuste para destacar a data no card */
        .uc-date-highlight {
            font-size: 1.1em;
            color: var(--cor-perigo);
            font-weight: bold;
            margin-top: 10px;
        }
        .uc-date-highlight.safe {
            color: var(--cor-sucesso);
        }
        .uc-date-highlight.warning {
            color: var(--cor-aviso);
        }
    </style>
</head>

<body>
    <div class="dashboard-container">
        <aside class="sidebar">
            <div class="sidebar-header" style="text-align: center; padding-top: 20px;">
                <div style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 20px;">SENAI</div>
                <h3>Menu Principal</h3>
            </div>
            <nav class="sidebar-nav" id="sidebar-nav-wrapper">
                <ul id="sidebar-ul-list">
                    <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li id="geral_instrutor" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios" class="active">
                            <span><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="gestao_instrutores.php"> Cadastro e Edição</a></li>
                            <li><a href="ocupacao_instrutores.php" class="active"> Alocação em Turmas</a></li>
                            <li><a href="ocupacao_instrutores.php"> Disponbilidade por Período</a></li>
                        </ul>
                    </li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>                    
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                            <li id="gestao_calendario" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-calendar-alt"></i> Gestão de Calendários</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="gestao_calendarios.php"> Cadastro e Edição</a></li>
                            <li><a href="calendario_geral.php"> Visão Geral</a></li>
                        </ul>
                    </li>
                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-file-alt"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="dashboard.php"> Relatório Um</a></li>
                        </ul>
                    </li>
                    <li id="nav-config" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-config">
                            <span><i class="fas fa-tools"></i> Configurações</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-config">
                            <li><a href="configuracao_usuarios.php"> Usuários</a></li>
                        </ul>
                    </li>
                    <li><a href="../backend/processa_logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
                </ul>
            </nav>
        </aside>

        <div class="main-content">
            <div class="main-header">
                <h1>Pendências de Alocação</h1>
                <p style="color: #666; margin-top: 5px;">Gerencie as Unidades Curriculares que estão sem instrutor definido.</p>
            </div>

            <div class="filter-section">
                <div class="filter-group">
                    <label for="filtroCurso">Curso</label>
                    <select id="filtroCurso" class="form-control">
                        <option value="">Todos os Cursos</option>
                        <option value="1">Técnico em Informática</option>
                        <option value="2">Técnico em Eletrotécnica</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filtroTurma">Turma</label>
                    <input type="text" id="filtroTurma" class="form-control" placeholder="Ex: 2026.1-A">
                </div>

                <div class="filter-group" style="max-width: 150px;">
                    <label for="qtdCards">Exibir Cards</label>
                    <select id="qtdCards" class="form-control">
                        <option value="10">10 UCs</option>
                        <option value="20" selected>20 UCs</option>
                        <option value="50">50 UCs</option>
                        <option value="all">Todas</option>
                    </select>
                </div>

                <div class="filter-group" style="flex: 0 0 auto;">
                    <button class="btn btn-primary" style="height: 42px; margin-top: auto;">
                        <i class="fas fa-search"></i> Filtrar
                    </button>
                </div>
            </div>

            <div class="cards-section-class">
                <h2>UCs Aguardando Instrutor</h2>
                
                <div class="cards-responsive-class">
                    
                    <div class="card-turma" style="border-left-color: var(--cor-perigo);">
                        <div class="card-turma-header">
                            <span class="card-turma-code">Desenvolvimento Web Frontend</span>
                            <span class="card-badge-turno">Manhã</span>
                        </div>
                        <div class="card-turma-body">
                            <div class="card-info-row">
                                <i class="fas fa-users"></i>
                                <span><strong>Turma:</strong> 2026.1-A - Informática</span>
                            </div>
                            <div class="card-info-row">
                                <i class="fas fa-clock"></i>
                                <span><strong>Carga Horária:</strong> 80h</span>
                            </div>
                            <div class="uc-date-highlight">
                                <i class="fas fa-calendar-exclamation"></i> Início: 16/03/2026 a 30/03/2026
                            </div>
                        </div>
                        <div class="card-turma-footer" style="grid-template-columns: 1fr;">
                            <button class="btn-card btn-card-calendar btn-abrir-modal" onclick="abrirModalAlocacao('Desenvolvimento Web Frontend', '2026.1-A', '16/03/2026 a 30/03/2026')">
                                <i class="fas fa-user-plus mr-2"></i> Alocar Instrutor
                            </button>
                        </div>
                    </div>

                    <div class="card-turma" style="border-left-color: var(--cor-aviso);">
                        <div class="card-turma-header">
                            <span class="card-turma-code">Banco de Dados Relacional</span>
                            <span class="card-badge-turno">Noite</span>
                        </div>
                        <div class="card-turma-body">
                            <div class="card-info-row">
                                <i class="fas fa-users"></i>
                                <span><strong>Turma:</strong> 2026.1-B - Informática</span>
                            </div>
                            <div class="card-info-row">
                                <i class="fas fa-clock"></i>
                                <span><strong>Carga Horária:</strong> 60h</span>
                            </div>
                            <div class="uc-date-highlight warning">
                                <i class="fas fa-calendar-alt"></i> Início: 05/04/2026 a 20/04/2026
                            </div>
                        </div>
                        <div class="card-turma-footer" style="grid-template-columns: 1fr;">
                            <button class="btn-card btn-card-calendar btn-abrir-modal" onclick="abrirModalAlocacao('Banco de Dados Relacional', '2026.1-B', '05/04/2026 a 20/04/2026')">
                                <i class="fas fa-user-plus mr-2"></i> Alocar Instrutor
                            </button>
                        </div>
                    </div>

                    <div class="card-turma" style="border-left-color: var(--cor-sucesso);">
                        <div class="card-turma-header">
                            <span class="card-turma-code">UI/UX Design Avançado</span>
                            <span class="card-badge-turno">Tarde</span>
                        </div>
                        <div class="card-turma-body">
                            <div class="card-info-row">
                                <i class="fas fa-users"></i>
                                <span><strong>Turma:</strong> 2026.2-A - Informática</span>
                            </div>
                            <div class="card-info-row">
                                <i class="fas fa-clock"></i>
                                <span><strong>Carga Horária:</strong> 40h</span>
                            </div>
                            <div class="uc-date-highlight safe">
                                <i class="fas fa-calendar-check"></i> Início: 10/08/2026 a 25/08/2026
                            </div>
                        </div>
                        <div class="card-turma-footer" style="grid-template-columns: 1fr;">
                            <button class="btn-card btn-card-calendar btn-abrir-modal" onclick="abrirModalAlocacao('UI/UX Design Avançado', '2026.2-A', '10/08/2026 a 25/08/2026')">
                                <i class="fas fa-user-plus mr-2"></i> Alocar Instrutor
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <div id="modalAlocacao" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2 id="modalTitle">Alocar Instrutor</h2>
                <button type="button" class="close-button" onclick="fecharModal()">&times;</button>
            </div>
            <form id="formAlocacao">
                <div class="modal-body">
                    <div class="summary-group" style="margin-bottom: 25px;">
                        <span class="summary-label">Unidade Curricular:</span>
                        <span class="summary-value" id="modalUcNome" style="font-weight: bold; color: var(--cor-sidebar);">...</span>
                        
                        <div style="display: flex; gap: 20px; margin-top: 10px;">
                            <div>
                                <span class="summary-label">Turma:</span>
                                <span class="summary-value" id="modalUcTurma">...</span>
                            </div>
                            <div>
                                <span class="summary-label">Período:</span>
                                <span class="summary-value" id="modalUcDatas">...</span>
                            </div>
                        </div>
                    </div>

                    <h4 style="margin-bottom: 15px; color: #333; font-size: 1.1em; border-bottom: 1px solid #eee; padding-bottom: 5px;">Selecione o Instrutor</h4>

                    <div class="form-group">
                        <label for="instrutorComCompetencia" style="color: var(--cor-sucesso); font-weight: bold;">
                            <i class="fas fa-check-circle"></i> Instrutores Aptos (Possuem a competência no mapa)
                        </label>
                        <p style="font-size: 0.85em; color: #666; margin-top: -5px; margin-bottom: 8px;">Lista filtrada por disponibilidade nas datas da UC.</p>
                        <select id="instrutorComCompetencia" class="form-control">
                            <option value="">-- Selecione o Titular --</option>
                            <option value="1">Ana Silva (Disponível)</option>
                            <option value="2">Marcos Rocha (Disponível)</option>
                        </select>
                    </div>

                    <div style="text-align: center; margin: 20px 0; color: #999; font-weight: bold; position: relative;">
                        <span style="background: #fff; padding: 0 10px; position: relative; z-index: 2;">OU</span>
                        <hr style="position: absolute; top: 50%; left: 0; width: 100%; margin: 0; border: 0; border-top: 1px solid #ddd; z-index: 1;">
                    </div>

                    <div class="form-group">
                        <label for="instrutorSemCompetencia" style="color: var(--cor-perigo); font-weight: bold;">
                            <i class="fas fa-exclamation-triangle"></i> Instrutores Exceção (NÃO possuem a competência)
                        </label>
                        <p style="font-size: 0.85em; color: #666; margin-top: -5px; margin-bottom: 8px;">Use apenas em casos excepcionais. Lista de instrutores ativos e disponíveis.</p>
                        <select id="instrutorSemCompetencia" class="form-control" style="border-color: #fca5a5; background-color: #fef2f2;">
                            <option value="">-- Selecione o Substituto/Exceção --</option>
                            <option value="3">Carlos Almeida</option>
                            <option value="4">João Oliveira</option>
                        </select>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="salvarAlocacao()">
                        <i class="fas fa-save"></i> Confirmar Alocação
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const modal = document.getElementById('modalAlocacao');
        const selectCom = document.getElementById('instrutorComCompetencia');
        const selectSem = document.getElementById('instrutorSemCompetencia');

        function abrirModalAlocacao(ucNome, turma, datas) {
            // Preenche os dados de resumo no modal
            document.getElementById('modalUcNome').textContent = ucNome;
            document.getElementById('modalUcTurma').textContent = turma;
            document.getElementById('modalUcDatas').textContent = datas;
            
            // Reseta os selects
            selectCom.value = "";
            selectSem.value = "";
            
            // Exibe o modal
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }

        function fecharModal() {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }

        function salvarAlocacao() {
            const valCom = selectCom.value;
            const valSem = selectSem.value;

            if (!valCom && !valSem) {
                alert("Por favor, selecione um instrutor (com ou sem competência) para prosseguir.");
                return;
            }
            if (valCom && valSem) {
                alert("Selecione apenas um instrutor para esta alocação. Limpe o outro campo.");
                return;
            }

            alert("Alocação salva com sucesso!");
            fecharModal();
            // Aqui entraria a lógica de requisição fetch() para enviar ao backend
        }

        // Lógica de UX: Se preencher um select, limpa o outro para evitar confusão
        selectCom.addEventListener('change', function() {
            if(this.value !== "") selectSem.value = "";
        });

        selectSem.addEventListener('change', function() {
            if(this.value !== "") selectCom.value = "";
        });
    </script>
</body>
</html>