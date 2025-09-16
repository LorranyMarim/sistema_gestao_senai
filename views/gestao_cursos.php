<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gestão de Cursos - SENAI</title>

  <link rel="stylesheet" href="../assets/css/style_turmas.css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/css/select2.min.css" />
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css" />

  <style>
    body.modal-open {
      overflow: hidden;
    }

    .main-content {
      position: relative;
    }

    .modal {
      display: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, .3);
      align-items: center;
      justify-content: center;
      z-index: 20;
    }

    .modal.show {
      display: flex !important;
    }

    .modal-content {
      background: #fff;
      border-radius: 10px;
      padding: 30px;
      width: min(820px, 92%);
      max-height: 80vh;
      overflow: auto;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
    }

    .close-button {
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: 1.6em;
      cursor: pointer;
      line-height: 1;
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
    }

    .form-group label {
      font-weight: 600;
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
          <li><a href="gestao_cursos.php" class="active"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i>Gestão de Calendários</a></li>
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
      <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>

      <header class="main-header">
        <h1>Gestão de Cursos</h1>
        <button class="btn btn-primary" id="btnAddCurso">
          <i class="fas fa-plus-circle"></i> Adicionar Novo Curso
        </button>
      </header>

      <section class="table-section">
        <h2>Cursos Cadastrados</h2>

        <div class="filter-section" style="display:flex; flex-wrap:wrap; gap:12px; align-items:end;">
          <div class="filter-group">
            <label for="searchCurso">Buscar Curso:</label>
            <input type="text" id="searchCurso" placeholder="Digite para filtrar..." class="search-input" />
          </div>
          <!-- +++ NOVOS FILTROS +++ -->
          <div class="filter-group">
            <label for="filterInstituicao">Instituição:</label>
            <select id="filterInstituicao" style="min-width:220px"></select>
          </div>

          <div class="filter-group">
            <label for="filterStatus">Status:</label>
            <select id="filterStatus">
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filterArea">Área Tecnológica:</label>
            <select id="filterArea">
              <option value="Todos">Todos</option>
              <option value="TI">TI</option>
              <option value="Metal Mecânica">Metal Mecânica</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filterModalidade">Modalidade:</label>
            <select id="filterModalidade">
              <option value="Todos">Todos</option>
              <option value="Técnico">Técnico</option>
              <option value="Aprendizagem">Aprendizagem</option>
              <option value="Aperfeiçoamento">Aperfeiçoamento</option>
              <option value="Qualificação">Qualificação</option>
              <option value="Especialização">Especialização</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filterTipo">Tipo:</label>
            <select id="filterTipo">
              <option value="Todos">Todos</option>
              <option value="Presencial">Presencial</option>
              <option value="EAD">EAD</option>
              <option value="Semipresencial">Semipresencial</option>
            </select>
          </div>

          <div class="filter-group" style="min-width:260px;">
            <label for="filterUcs">Unidades Curriculares:</label>
            <select id="filterUcs" multiple style="width:100%"></select>
          </div>

          <div class="filter-group">
            <label for="sortBy">Ordenar por:</label>
            <select id="sortBy">
              <option value="created_desc">Criado em (recente→antigo)</option>
              <option value="nome_asc">Nome (A→Z)</option>
              <option value="status_asc">Status</option>
              <option value="area_asc">Área</option>
              <option value="modalidade_asc">Modalidade</option>
              <option value="tipo_asc">Tipo</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="pageSize">Itens/página:</label>
            <select id="pageSize">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div class="filter-group">
            <label>&nbsp;</label>
            <button id="btnClearFilters" class="btn btn-light" type="button" title="Limpar filtros" disabled>
              <i class="fas fa-broom"></i> Limpar filtros
            </button>
          </div>
          <!-- +++ FIM NOVOS FILTROS +++ -->

        </div>

        <div class="table-responsive">
          <table class="data-table" id="cursosTable">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Área Tecnológica</th>
                <th>Modalidade</th>
                <th>Criado em</th>
                <th>Status</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody><!-- via JS --></tbody>
          </table>
        </div>
        <div class="pagination-bar" style="display:flex;align-items:center;gap:10px;margin-top:10px;">
  <button class="btn btn-secondary" id="prevPage" type="button">Anterior</button>
  <span id="pageInfo">Página 1 de 1 • 0 registros</span>
  <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
</div>


        <!-- Modal: Detalhe -->
        <div class="modal" id="modalDetalheCurso">
          <div class="modal-content" style="min-width:420px;max-width:92%;">
            <span class="close-button" data-close="modalDetalheCurso">&times;</span>
            <h2>Detalhes do Curso</h2>
            <div id="detalheCursoConteudo"></div>
            <div class="mt-4" style="display:flex; justify-content:flex-start;">
              <button class="btn btn-secondary" data-close="modalDetalheCurso">Fechar</button>
            </div>
          </div>
        </div>

        <!-- Modal: Adicionar/Editar -->
        <div id="modalCurso" class="modal">
          <div class="modal-content">
            <span class="close-button" data-close="modalCurso">×</span>
            <h2 id="modalCursoTitulo">Adicionar Novo Curso</h2>

            <form id="formCurso" autocomplete="off">
              <input type="hidden" id="cursoId" name="id" />

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label for="instituicaoId">Instituição:</label>
                  <select id="instituicaoId" name="instituicao_id" required>
                    <option value="">Selecione</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="nomeCurso">Nome:</label>
                  <input type="text" id="nomeCurso" name="nome" style="text-transform: uppercase;" required />
                </div>

                <div class="form-group">
                  <label for="nivelCurso">Modalidade:</label>
                  <select id="nivelCurso" name="nivel_curso" required>
                    <option value="">Selecione</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Técnico">Aprendizagem</option>
                    <option value="Aperfeiçoamento">Aperfeiçoamento</option>
                    <option value="Qualificação">Qualificação</option>
                    <option value="Especialização">Especialização</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="tipoCurso">Tipo:</label>
                  <select id="tipoCurso" name="tipo" required>
                    <option value="">Selecione</option>
                    <option value="Presencial">Presencial</option>
                    <option value="EAD">EAD</option>
                    <option value="Semipresencial">Semipresencial</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="statusCurso">Status:</label>
                  <select id="statusCurso" name="status" required>
                    <option value="Ativo" selected>Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>

                
                <div class="form-group">
                  <label for="areaTecnologicaCurso">Área Tecnológica:</label>
                  <select id="areaTecnologicaCurso" name="area_tecnologica" required>
                    <option value="">Selecione</option>
                    <option value="TI">TI</option>
                    <option value="Metal Mecânica">Metal Mecânica</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="cargaHoraria">Carga Horária (h):</label>
                  <input type="number" id="cargaHoraria" name="carga_horaria" required min="1" />
                </div>

                <div class="form-group md:col-span-2">
                  <label for="ucsSelect">Unidades Curriculares:</label>
                  <select class="form-select" id="ucsSelect" name="ucs[]" multiple style="width:100%;"
                    required></select>
                </div>

                <div class="form-group md:col-span-2">
                  <label for="observacao">Observação:</label>
                  <textarea id="observacao" name="observacao" rows="3" class="w-full"></textarea>
                </div>
              </div>

              <div class="mt-4 flex justify-end gap-2">
                <button type="button" class="btn btn-secondary" data-close="modalCurso">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Modal: Configuração de UCs -->
        <div class="modal" id="modalUcsConfig" style="display:none;">
          <div class="modal-content" style="min-width:420px;max-width:95vw;">
            <span class="close-button" data-close="modalUcsConfig">&times;</span>
            <h3>Configurar Dados das Unidades Curriculares</h3>
            <div id="ucsAccordion"></div>
            <div style="text-align:right;margin-top:18px;">
              <button class="btn btn-secondary" data-close="modalUcsConfig">Cancelar</button>
              <button class="btn btn-primary" id="saveAllUcsBtn">Salvar</button>
            </div>
          </div>
        </div>

      </section>
    </main>
  </div>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.full.min.js"></script>
  <script src="../assets/js/geral.js"></script>
  <script src="../assets/js/prefetch.js"></script>
  <script src="../assets/js/gestao_cursos.js"></script>
</body>

</html>