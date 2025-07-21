<?php
// Arquivo: /backend/login.php
session_start();
// require_once(__DIR__ . '/../config/config.php'); // descomente se precisar de configs globais

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    // Payload para API externa (ajuste a URL/porta se mudar a API)
    $payload = json_encode([
        'user_name' => $username,
        'senha'     => $password
    ]);

    $ch = curl_init('http://localhost:8000/api/login');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($payload)
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode === 200 && isset($result['user_name'])) {
        // Login bem-sucedido, cria sessão
        $_SESSION['loggedin']      = true;
        $_SESSION['username']      = $result['user_name'];
        $_SESSION['tipo_acesso']   = $result['tipo_acesso'] ?? null;
        $_SESSION['nome']          = $result['nome'] ?? '';
        $_SESSION['instituicao_id']= $result['instituicao_id'] ?? null;
        header("Location: ../views/dashboard.html");
        exit();
    } else {
        // Login inválido
        header("Location: ../views/index.php?erro=1");
        exit();
    }
} else {
    header("Location: ../views/index.php");
    exit();
}
?>
