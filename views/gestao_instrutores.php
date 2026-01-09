<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestão de Instrutores - SENAI</title>

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
          <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php" class="active"><i class="fas fa-chalkboard-teacher"></i> Gestão de
              Instrutores</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
              Gestão de UCs</a></li>
          <li><a href="gestao_calendario.php"><i class="fas fa-calendar-alt"></i>Gestão de Calendários</a>
          </li>

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
        <h1>Gestão de Instrutores</h1>
        <button class="btn btn-primary" id="addInstructorBtn"><i class="fas fa-plus-circle"></i> Adicionar Novo
          Instrutor</button>
      </header>

      <section class="table-section">
        <h2>Instrutores Cadastrados</h2>

        <div id="filter_area" class="mb-3">
        </div>

        <div class="table-responsive">
          <table id="instructorTable" class="data-table">
            <thead>
              <tr>
                <th>Nome do Instrutor</th>
                <th>Matrícula</th>
                <th>Categoria</th>
                <th>Área</th>
                <th>Tipo de Contrato</th>
                <th>Turno</th>
                <th>Status</th>
                <th>Criado em</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody id="instructorTableBody"></tbody>
          </table>
          <div class="pagination-bar" style="display:flex;align-items:center;gap:10px;margin-top:10px;">
            <button class="btn btn-secondary" id="prevPage" type="button">Anterior</button>
            <span id="pageInfo">Página 1 de 1 • 0 registros</span>
            <button class="btn btn-secondary" id="nextPage" type="button">Próximo</button>
          </div>

        </div>
      </section>
    </main>
  </div>

<div id="instructorModal" class="modal modal-dialog-centered">
    <div class="modal-content">
      
      <div class="modal-header">
        <h2 id="modalTitleInstructor">Adicionar Novo Instrutor</h2>
        <span class="close-button" id="closeModalBtn">&times;</span>
      </div>

      <form id="instructorForm" autocomplete="off">
        
        <div class="modal-body">
            <input type="hidden" id="instructorId">

            <div id="alertInstructor" class="alert alert-danger"
              style="display:none; margin-bottom: 15px; padding: 10px; border-radius: 5px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">
            </div>

            <div class="form-group">
              <label for="nomeInstructor">Nome:</label>
              <input type="text" id="nomeInstructor" class="form-control" required minlength="2" maxlength="100" placeholder="Nome completo">
            </div>

            <div class="form-group">
              <label for="matriculaInstructor">Matrícula:</label>
              <input type="text" id="matriculaInstructor" class="form-control" required minlength="2" maxlength="50" placeholder="Ex: 12345">
            </div>

            <div class="form-group">
              <label for="categoriaInstructor">Categoria:</label>
              <select id="categoriaInstructor" class="form-control" required>
                <option value="">Selecione</option>
                <option value="A">A</option>
                <option value="C">C</option>
              </select>
            </div>

            <div class="form-group">
              <label for="tipoContratoInstructor">Tipo de Contrato:</label>
              <select id="tipoContratoInstructor" class="form-control" required>
                <option value="">Selecione</option>
                <option value="Efetivo">Efetivo</option>
                <option value="Empréstimo">Empréstimo</option>
                <option value="RPA">RPA</option>
              </select>
            </div>

            <div class="col-md-6 form-group">
              <label for="cargaHorariaInstructor" class="form-label">Carga Horária</label>
              <select class="form-select" id="cargaHorariaInstructor" required>
                <option value="" disabled selected>Selecione...</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">40</option>
              </select>
            </div>

            <div class="form-group">
              <label>Turno (Selecione 1 ou 2):</label>
              <div class="ms" id="ms-turno-modal">
                <button type="button" class="ms__control" aria-haspopup="listbox" aria-expanded="false">
                  <div class="ms__value" aria-live="polite">
                    <span class="ms__placeholder">Selecione...</span>
                  </div>
                  <span class="ms__caret" aria-hidden="true">▾</span>
                </button>
                <div class="ms__dropdown" role="listbox" aria-multiselectable="true">
                  <ul class="ms__options">
                    <li class="ms__option"><label><input type="checkbox" value="Manhã"> Manhã</label></li>
                    <li class="ms__option"><label><input type="checkbox" value="Tarde"> Tarde</label></li>
                    <li class="ms__option"><label><input type="checkbox" value="Noite"> Noite</label></li>
                  </ul>
                  <div class="ms__footer">
                    <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
                    <button type="button" class="btn btn-primary ms__close">OK</button>
                  </div>
                </div>
                <input type="hidden" id="turnoInstructor" name="turno" value="[]" required>
              </div>
            </div>

            <div class="form-group">
              <label>Área de Atuação:</label>
              <div class="ms" id="ms-area-modal">
                <button type="button" class="ms__control" aria-haspopup="listbox" aria-expanded="false">
                  <div class="ms__value" aria-live="polite">
                    <span class="ms__placeholder">Selecione...</span>
                  </div>
                  <span class="ms__caret" aria-hidden="true">▾</span>
                </button>
                <div class="ms__dropdown" role="listbox" aria-multiselectable="true">
                  <div class="ms__search">
                    <input type="text" class="ms__search-input" placeholder="Pesquisar..." />
                  </div>
                  <ul class="ms__options">
                    <li class="ms__option"><label><input type="checkbox" value="Tecnologia da Informação"> Tecnologia da Informação</label></li>
                    <li class="ms__option"><label><input type="checkbox" value="Automação"> Automação</label></li>
                    <li class="ms__option"><label><input type="checkbox" value="Metal Mecânica"> Metal Mecânica</label></li>
                    <li class="ms__option"><label><input type="checkbox" value="Gestão"> Gestão</label></li>
                  </ul>
                  <div class="ms__footer">
                    <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
                    <button type="button" class="btn btn-primary ms__close">OK</button>
                  </div>
                </div>
                <input type="hidden" id="areaInstructor" name="area" value="[]">
              </div>
            </div>

            <div class="form-group">
              <label>Mapa de Competências (UCs):</label>
              <div class="ms" id="ms-competencia-modal">
                <button type="button" class="ms__control" aria-haspopup="listbox" aria-expanded="false">
                  <div class="ms__value" aria-live="polite">
                    <span class="ms__placeholder">Selecione as UCs...</span>
                  </div>
                  <span class="ms__caret" aria-hidden="true">▾</span>
                </button>
                <div class="ms__dropdown" role="listbox" aria-multiselectable="true">
                  <div class="ms__search">
                    <input type="text" class="ms__search-input" placeholder="Pesquisar UCs..." />
                  </div>
                  <ul class="ms__options" id="competenciasOptionsList">
                    </ul>
                  <div class="ms__footer">
                    <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
                    <button type="button" class="btn btn-primary ms__close">OK</button>
                  </div>
                </div>
                <input type="hidden" id="competenciasInstructor" name="competencias" value="[]">
              </div>
            </div>

            <div class="form-group">
              <label for="statusInstructor">Status:</label>
              <select id="statusInstructor" class="form-control">
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            </div> <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancelBtn">
              <i class="fas fa-times-circle"></i> Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Salvar
            </button>
        </div>

      </form>
    </div>
  </div>

  <div id="visualizarInstructorModal" class="modal modal-dialog-centered">
    <div class="modal-content">
      <span class="close-button" id="closeVisualizarBtn">&times;</span>
      <h2>Detalhes do Instrutor</h2>

      <form>
        <div class="form-group">
          <label>Nome:</label>
          <input type="text" id="viewNomeInstructor" readonly disabled>
        </div>
        <div class="form-group">
          <label>Matrícula:</label>
          <input type="text" id="viewMatriculaInstructor" readonly disabled>
        </div>
        <div class="form-group">
          <label>Categoria:</label>
          <input type="text" id="viewCategoriaInstructor" readonly disabled>
        </div>
        <div class="form-group">
          <label>Área:</label>
          <input type="text" id="viewAreaInstructor" readonly disabled>
        </div>
        <div class="form-group">
          <label>Tipo de Contrato:</label>
          <input type="text" id="viewTipoContratoInstructor" readonly disabled>
        </div>
        <div class="col-md-6 form-group">
          <label class="form-label">Carga Horária</label>
          <input type="text" class="form-control" id="viewCargaHorariaInstructor" readonly>
        </div>

        <div class="form-group">
          <label>Turno:</label>
          <input type="text" id="viewTurnoInstructor" readonly disabled>
        </div>
        <div class="form-group">
          <label>Status:</label>
          <input type="text" id="viewStatusInstructor" readonly disabled>
        </div>

        <div id="viewCompetenciasContainer"
          style="display:none; margin-top:15px; padding-top:10px; border-top:1px solid #eee;">
          <label style="font-weight:bold; display:block; margin-bottom:5px;">Mapa de Competências:</label>
          <ul id="viewCompetenciasList" style="list-style: disc; padding-left: 20px; color: #333;"></ul>
        </div>
      </form>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="fecharVisualizarBtn">Fechar</button>
      </div>
    </div>
  </div>

  <script src="../assets/js/geral_script.js"></script>
  <script src="../assets/js/instrutores_script.js" defer></script>
</body>

</html>