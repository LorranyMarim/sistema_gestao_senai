<?php
// config/verifica_login.php
session_start();

if (!isset($_COOKIE['session_token'])) {
    // Redirecionamento ativo se não houver credencial
    header("Location: ../views/index.php");
    exit();
}
?>