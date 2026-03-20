<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro 500 - Erro Interno do Servidor - SENAI</title>
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
            <nav class="sidebar-nav" id="sidebar-nav-wrapper">
                <ul id="sidebar-ul-list">
                    <li><a href="dashboard.php"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                    <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                    <li id="geral_instrutor" class="has-submenu">
                        <a href="#" class="submenu-toggle" aria-expanded="false" aria-controls="submenu-relatorios">
                            <span><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</span>
                            <i class="fas fa-chevron-right caret" aria-hidden="true"></i>
                        </a>
                        <ul class="submenu" id="submenu-relatorios">
                            <li><a href="gestao_instrutores.php"> Cadastro e Edição</a></li>
                            <li><a href="ocupacao_instrutores.php"> Alocação em Turmas</a></li>
                            <li><a href="ocupacao_instrutores.php"> Disponbilidade por Período</a></li>
                        </ul>
                    </li>
                    <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>                    
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_ucs.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
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
                            <span><i class="fas fa-tools"></i> Configuração</span>
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

        <main class="main-content">
            <header class="main-header">
                <h1>Erro Interno</h1>
            </header>
            
            <div class="flex flex-col items-center justify-center text-center mt-10" style="min-height: 60vh;">
                <img src="../assets/500 Internal Server Error-cuate.svg" alt="Erro 500" style="max-width: 350px; width: 100%; margin-bottom: 20px;">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Erro Interno do Servidor (Erro 500)</h2>
                <p class="text-gray-600 mb-6 max-w-md">Ocorreu um problema inesperado nos nossos servidores. Nossa equipe técnica já foi notificada e está trabalhando na solução.</p>
                <div class="flex gap-3">
                    <button onclick="window.location.reload()" class="btn btn-secondary"><i class="fas fa-sync-alt"></i> Tentar Novamente</button>
                    <a href="dashboard.php" class="btn btn-primary"><i class="fas fa-home"></i> Ir para o Início</a>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/geral_script.js"></script>
</body>

</html>