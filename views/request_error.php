<?php
require_once("../config/verifica_login.php");
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro 400 - Requisição Inválida - SENAI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body>
    <div class="dashboard-container">
        

        <main class="main-content">
            <header class="main-header">
                <h1>Requisição Inválida</h1>
            </header>
            
            <div class="flex flex-col items-center justify-center text-center mt-10" style="min-height: 60vh;">
                <img src="../assets/400 Error Bad Request-rafiki.svg" alt="Erro 400" style="max-width: 350px; width: 100%; margin-bottom: 20px;">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado (Erro 400)</h2>
                <p class="text-gray-600 mb-6 max-w-md">O servidor não conseguiu processar sua solicitação devido a uma sintaxe inválida ou dados incorretos. Verifique as informações e tente novamente.</p>
                <div class="flex gap-3">
                    <button onclick="window.history.back()" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar</button>
                    <a href="dashboard.php" class="btn btn-primary"><i class="fas fa-home"></i> Ir para o Início</a>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/geral_script.js"></script>
</body>

</html>