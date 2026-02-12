<?php
// (opcional) verificação de sessão aqui
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Calendário - SENAI</title>

  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

  <!-- FullCalendar -->
  <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.14/index.global.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core/locales/pt-br.global.js"></script>

  <!-- jQuery (para Select2) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

  <!-- Select2 -->
  <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
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
                    <li><a href="calendario_geral.php" class="active"><i class="fas fa-calendar-alt"></i>Calendário Geral</a></li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i>
                            Gestão de UCs</a></li>
                    <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a>
                    </li>

                    <li id="nav-relatorios" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-file-alt"></i> Relatórios e Consultas</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="ocupacao_instrutores.php">Ocupação de Intrutores</a></li>
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
        <h1>Gestão de Calendário Acadêmico</h1>
      </header>

      <div class="calendar-page-layout">
        <div class="calendar-container-main">
          <h2>Calendário Geral</h2>
          <div class="action-buttons-group">
            <button type="button" class="btn btn-primary" id="btnAbrirModalCadastrarCalendario">
              <i class="fas fa-plus-circle"></i> Cadastrar Calendário
            </button>
            <button type="button" class="btn btn-warning" id="btnAbrirModalAdicionarEvento">
              <i class="fas fa-calendar-plus"></i> Adicionar Evento
            </button>
          </div>
          <p>Visualize os eventos e datas importantes. Eventos são carregados por faixa de datas visível.</p>
          <div id="calendario" aria-label="Calendário Acadêmico"></div>
        </div>
      </div>

      <section class="table-section">
        <h2>Calendários Cadastrados</h2>

        <!-- Filtros & Paginação -->
        <div class="filter-section">
          <!-- Linha 1: Buscar, Ano, Empresa, Instituição -->
          <div class="filter-row" style="display:flex; gap:12px; flex-wrap:wrap;">
            <div class="filter-group">
              <label for="filtroBusca">Buscar:</label>
              <input id="filtroBusca" type="text" placeholder="Digite para filtrar..." class="form-control"
                autocomplete="off">
            </div>
            <div class="filter-group">
              <label for="filtroAno">Ano:</label>
              <select id="filtroAno" class="form-control">
                <option value="">Todos</option>
                <!-- preenchido via JS -->
              </select>
            </div>
            <div class="filter-group">
              <label for="filtroEmpresa">Empresa:</label>
              <select id="filtroEmpresa" class="form-control">
                <option value="">Todas</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="filtroInstituicao">Instituição:</label>
              <select id="filtroInstituicao" class="form-control">
                <option value="">Todas</option>
              </select>
            </div>
          </div>

          <!-- Linha 2: Status, Itens por página, Limpar filtros -->
          <div class="filter-row" style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
            <div class="filter-group">
              <label for="filtroStatus">Status:</label>
              <select id="filtroStatus" class="form-control">
                <option value="">Todas</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            <div class="filter-group" style="margin-left:auto;">
              <label for="pageSize">Itens por página:</label>
              <select id="pageSize" class="form-control" style="min-width:100px;">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>

            <button id="btnClearFilters" class="btn btn-light" type="button" title="Limpar filtros">
              <i class="fas fa-broom"></i> Limpar filtros
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" aria-label="Tabela de Calendários">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Área</th>
                <th>Nível</th>
                <th>Criado em</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="tbodyCalendarios"><!-- via JS --></tbody>
          </table>
        </div>

        <div class="pagination-bar" style="display:flex;align-items:center;gap:8px; margin-top:10px;">
          <button id="btnPrevPage" class="btn btn-secondary" aria-label="Página anterior">&laquo; Anterior</button>
          <span id="pageInfo">Página 1</span>
          <button id="btnNextPage" class="btn btn-secondary" aria-label="Próxima página">Próxima &raquo;</button>
        </div>
      </section>
    </main>
  </div>

  <!-- MODAL ADICIONAR EVENTO -->
  <div id="modalAdicionarEvento" class="modal" role="dialog" aria-modal="true" aria-labelledby="tituloAdicionarEvento">
    <div class="modal-content">
      <span class="close-button" onclick="closeModal('modalAdicionarEvento')" aria-label="Fechar">&times;</span>
      <h2 id="tituloAdicionarEvento">Adicionar Evento</h2>
      <form id="formAdicionarEvento" novalidate>
        <div class="form-group">
          <label for="eventoCalendario">Calendário(s):</label>
          <select id="eventoCalendario" name="calendarios[]" multiple="multiple" class="form-control"
            style="width:100%"></select>
        </div>
        <div class="form-group">
          <label for="eventoDescricao">Descrição:</label>
          <textarea id="eventoDescricao" name="descricao" rows="2" class="form-control" required></textarea>
        </div>
        <div class="form-group">
          <label for="eventoInicio">Início:</label>
          <input type="date" id="eventoInicio" name="inicio" class="form-control" required>
        </div>
        <div class="form-group">
          <label for="eventoFim">Fim:</label>
          <input type="date" id="eventoFim" name="fim" class="form-control" required>
        </div>
        <button type="button" class="btn btn-warning" onclick="closeModal('modalAdicionarEvento')">Cancelar</button>
        <button id="btnSalvarEvento" type="submit" class="btn btn-primary">Salvar Evento</button>
      </form>
    </div>
  </div>

  <!-- MODAL CADASTRAR/EDITAR CALENDÁRIO -->
  <div id="modalCadastrarCalendario" class="modal" role="dialog" aria-modal="true"
    aria-labelledby="tituloCadastrarCalendario">
    <div class="modal-content">
      <span class="close-button" onclick="closeModal('modalCadastrarCalendario')" aria-label="Fechar">&times;</span>
      <h2 id="tituloCadastrarCalendario">Cadastrar Calendário</h2>
      <form id="formCadastrarCalendario" novalidate>
        <input type="hidden" id="calIdEdicao" value="">
        <div class="form-group">
          <label for="calInstituicao">Instituição:</label>
          <select id="calInstituicao" name="instituicao" class="form-control" required>
            <option value="">Selecione</option>
          </select>
        </div>
        <div class="form-group">
          <label for="calNome">Nome do Calendário:</label>
          <input type="text" id="calNome" name="nome" class="form-control" required autocomplete="off">
        </div>
       
        <div class="form-group">
          <label for="calInicio">Início do Calendário:</label>
          <input type="date" id="calInicio" name="inicio_cal" class="form-control" required>
        </div>
        <div class="form-group">
          <label for="calFim">Fim do Calendário:</label>
          <input type="date" id="calFim" name="fim_cal" class="form-control" required>
        </div>
        <!-- Observação: data_criacao NÃO aparece no formulário (é controlado pelo backend) -->
        <button type="button" class="btn btn-warning" onclick="closeModal('modalCadastrarCalendario')">Cancelar</button>
        <button id="btnCadastrarCalendario" type="submit" class="btn btn-primary">Cadastrar</button>
      </form>
    </div>
  </div>

  <!-- MODAL FULL SCREEN (Visualizar + tabela de Não Letivos) -->
  <div id="modalVisualizarCalendarioFull" class="modal modal-lg" role="dialog" aria-modal="true"
    aria-labelledby="tituloVisualizarCalendarioFull">
    <div class="modal-content modal-content-lg">
      <span class="close-button" onclick="closeModal('modalVisualizarCalendarioFull')"
        aria-label="Fechar">&times;</span>
      <h2 id="tituloVisualizarCalendarioFull">Detalhes do Calendário</h2>

      <div id="detalhesCalendarioFull" style="margin-bottom:10px;"></div>

      <div class="table-responsive">
        <table id="tblDiasLetivos" class="data-table" aria-label="Tabela de Dias Não Letivos">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tbodyDiasLetivos"><!-- via JS --></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Modal pequeno legado (gerenciar dias) -->
  <div id="modalVisualizarCalendario" class="modal" role="dialog" aria-modal="true"
    aria-labelledby="tituloVisualizarCalendario">
    <div class="modal-content" style="max-width:500px">
      <span class="close-button" onclick="closeModal('modalVisualizarCalendario')" aria-label="Fechar">&times;</span>
      <h2 id="tituloVisualizarCalendario">Detalhes do Calendário</h2>
      <div id="detalhesCalendario"></div>
    </div>
  </div>

  <!-- JS da página -->
  <!-- JS da página -->
  <script src="../assets/js/geral_script.js"></script>
  <script src="../assets/js/calendario_geral_script.js"></script>

</body>

</html>