<?php
session_start();

if (!isset($_COOKIE['session_token'])) {
    header("Location: ../views/index.php");
    exit();
}

?>
