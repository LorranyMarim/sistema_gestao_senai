<?php
// backend/processa_logout.php
if (isset($_COOKIE['session_token'])) {
    // Invalida o cookie no navegador definindo validade no passado
    setcookie('session_token', '', time() - 3600, '/'); 
    unset($_COOKIE['session_token']);
}

// Redirecionamento final
header("Location: ../views/index.php");
exit();
?>