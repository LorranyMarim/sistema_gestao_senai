<?php
session_start();
session_unset();
session_destroy();

if (isset($_COOKIE['session_token'])) {
    setcookie('session_token', '', time() - 3600, '/'); 
    unset($_COOKIE['session_token']);
}

header("Location: ../views/index.php");
exit();
?>