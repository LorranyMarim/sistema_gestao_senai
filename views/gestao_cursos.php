<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestão de Cursos - SENAI</title>

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
          <li><a href="gestao_cursos.php" class="active"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
          <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
          <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
          <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
          <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
          <li><a href="gestao_calendarios.php"><i class="fas fa-calendar-check"></i>Gestão de Calendários</a></li>

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
        <h1>Gestão de Cursos</h1>
        <button class="btn btn-primary" id="addCursoBtn"><i class="fas fa-plus-circle"></i> Adicionar Curso</button>
      </header>

      <section class="table-section">
        <h2>Cursos Cadastrados</h2>

        <div id="filter_area" class="mb-3"></div>

        <div class="table-responsive">
          <table id="cursoTable" class="data-table">
            <thead>
              <tr>
                <th>Nome do Curso</th>
                <th>Modalidade</th>
                <th>Área Tecnológica</th>
                <th>Carga H. Total</th>
                <th>Status</th>
                <th>Criado em</th>
                <th class="actions">Ações</th>
              </tr>
            </thead>
            <tbody id="cursoTableBody"></tbody>
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

  <div id="cursoModal" class="modal modal-dialog-centered">
    <div class="modal-content">
      <span class="close-button" id="closeModalBtn">&times;</span>

      <h2 id="modalTitleCurso">Adicionar Novo Curso</h2>

      <form id="cursoForm" autocomplete="off">
        <div class="modal-body">
          <input type="hidden" id="cursoId">

          <div id="alertCurso" class="alert alert-danger"
            style="display:none; margin-bottom: 15px; padding: 10px; border-radius: 5px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">
          </div>

          <div class="form-group">
            <label for="nomeCurso">Nome do Curso:</label>
            <input type="text" id="nomeCurso" class="form-control" required minlength="2" maxlength="200"
              placeholder="Ex: Técnico em Desenvolvimento de Sistemas">
          </div>

          <div class="form-group">
            <label for="modalidadeCurso">Modalidade:</label>
            <select id="modalidadeCurso" class="form-control" required>
              <option value="">Selecione</option>
              <option value="Aperfeiçoamento">Aperfeiçoamento</option>
              <option value="Aprendizagem Industrial">Aprendizagem</option>
              <option value="Qualificação Profissional">Qualificação</option>
              <option value="Técnico">Técnico</option>
            </select>
          </div>
         
          <div class="form-group">
            <label for="tipoCurso">Tipo do Curso:</label>
            <select id="tipoCurso" class="form-control" required>
              <option value="">Selecione</option>
              <option value="EAD">EAD</option>
              <option value="Presencial">Presencial</option>
              <option value="Semipresencial">Semipresencial</option>
              <option value="Trilhas nas Escolas">Trilhas nas Escolas</option>
            </select>
          </div>

          <div class="form-group">
            <label>Área Tecnológica:</label>
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
                  <li class="ms__option"><label><input type="checkbox" value="Automação"> Automação</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Automotiva"> Automotiva</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Eletroeletrônica"> Eletroeletrônica</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Gestão"> Gestão</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Metalmecânica"> Metalmecânica</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Segurança do Trabalho"> Segurança do Trabalho</label></li>
                  <li class="ms__option"><label><input type="checkbox" value="Tecnologia da Informação"> Tecnologia da Informação</label></li>
                </ul>
                <div class="ms__footer">
                  <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
                  <button type="button" class="btn btn-primary ms__close">OK</button>
                </div>
              </div>
              <input type="hidden" id="areaCurso" name="area" value="[]">
            </div>
          </div>   
           
          <div class="form-group">
            <label for="cargaTotalCurso">Carga Horária Total (h):</label>
            <input type="text" id="cargaTotalCurso" class="form-control" required placeholder="Ex: 1200.00" title="Apenas números e ponto.">
          </div>

          <div class="form-group">
            <label>Unidades Curriculares:</label>
            <div class="ms" id="ms-ucs-modal">
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
                <ul class="ms__options" id="competenciasOptionsList"></ul>
                <div class="ms__footer">
                  <button type="button" class="btn btn-secondary ms__clear">Limpar</button>
                  <button type="button" class="btn btn-primary ms__close">OK</button>
                </div>
              </div>
              <input type="hidden" id="competenciasCurso" name="competencias" value="[]">
            </div>
          </div>

          <div class="form-group md:col-span-2">
              <label for="observacaoCurso">Observações:</label>
              <textarea id="observacaoCurso" name="observacao" rows="3" class="form-control w-full"></textarea>
          </div>

          <div class="form-group">
            <label for="statusCurso">Status:</label>
            <select id="statusCurso" class="form-control">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>
        
        <div class="modal-footer"
          style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between;">
          <button type="button" class="btn btn-secondary" id="cancelBtn">
            <i class="fas fa-times-circle"></i> Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Salvar & Parametrizar
          </button>
        </div>
      </form>
    </div>
  </div>

 <div id="visualizarcursoModal" class="modal modal-dialog-centered">
    <div class="modal-content">
      <span class="close-button" id="closeVisualizarBtn">&times;</span>
      
      <h2 style="padding: 20px 25px 0 25px; margin: 0;">Detalhes do Curso</h2>

      <form> <div class="modal-body">
          
          <div class="form-group">
            <label class="font-bold text-gray-700">Nome do Curso:</label>
            <input type="text" id="viewnomeCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Modalidade:</label>
            <input type="text" id="viewmodalidadeCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Tipo do Curso:</label>
            <input type="text" id="viewtipoCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Área Tecnológica:</label>
            <input type="text" id="viewareaCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Carga Horária Total (h):</label>
            <input type="text" id="viewcargaHorariaTotalCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Status:</label>
            <input type="text" id="viewstatusCurso" class="form-control bg-gray-100" readonly disabled>
          </div>

          <div class="form-group">
            <label class="font-bold text-gray-700">Observações:</label>
            <textarea id="viewObservacaoCurso" class="form-control bg-gray-100" rows="3" readonly disabled></textarea>
          </div>

          <div id="unidadeCurricularCursoContainer" class="form-group" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <label class="font-bold text-gray-700 mb-2 block">Unidades Curriculares:</label>
            
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
              <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 border-b">Descrição</th>
                    <th class="px-3 py-2 border-b text-center text-blue-800">C.H Pres.</th>
                    <th class="px-3 py-2 border-b text-center text-blue-800">Aulas Pres.</th>
                    <th class="px-3 py-2 border-b text-center text-blue-800">Dias Pres.</th>
                    <th class="px-3 py-2 border-b text-center text-green-800">C.H EAD</th>
                    <th class="px-3 py-2 border-b text-center text-green-800">Aulas EAD</th>
                    <th class="px-3 py-2 border-b text-center text-green-800">Dias EAD</th>
                  </tr>
                </thead>
                <tbody id="viewUcTableBody" class="bg-white divide-y divide-gray-200">
                  </tbody>
              </table>
            </div>
          </div>

        </div>

        <div class="modal-footer" style="padding: 15px 25px; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" id="fecharVisualizarBtn">Fechar</button>
        </div>
      </form>
    </div>
  </div>

  <script src="../assets/js/geral_script.js"></script>
  <script src="../assets/js/curso_script.js" defer></script>
</body>
</html>