<?php
session_start();

// (Opcional) limites de tentativas: garanta inicialização antes de usar
$_SESSION['login_attempts']   = $_SESSION['login_attempts']   ?? 0;
$_SESSION['last_attempt_time'] = $_SESSION['last_attempt_time'] ?? time();

if (!isset($_POST['username']) || !isset($_POST['password']) || !isset($_POST['instituicao_id'])) {
    header("Location: ../views/index.php?erro=1");
    exit();
}

$user = trim($_POST['username']);   // OK: FastAPI faz strip no user_name
$pass = $_POST['password'];         // ⚠️ NÃO dar trim na senha!
$inst = $_POST['instituicao_id'];

if (strlen($user) < 4 || strlen($user) > 50 || strlen($pass) < 4 || strlen($pass) > 50) {
    header("Location: ../views/index.php?erro=1");
    exit();
}

$api_url = "http://localhost:8000/api/login";
$dados = ["user_name" => $user, "senha" => $pass, "instituicao_id" => $inst];

$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_POSTFIELDS      => json_encode($dados, JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HEADER          => true,   // para separar cabeçalhos e corpo
    CURLOPT_TIMEOUT         => 10,
    CURLOPT_CONNECTTIMEOUT  => 5,
]);
$response = curl_exec($ch);

if ($response === false) {
    // (Opcional) log de erro interno
    // error_log("Login cURL error: " . curl_error($ch));
    $_SESSION['login_attempts'] += 1;
    $_SESSION['last_attempt_time'] = time();
    header("Location: ../views/index.php?erro=1");
    exit();
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$body        = substr($response, $header_size);
curl_close($ch);

// Trate mensagens específicas (melhora UX)
if ($http_code === 422) {
    header("Location: ../views/index.php?erro=valid"); // dados inválidos
    exit();
}
if ($http_code === 429) {
    header("Location: ../views/index.php?erro=limite"); // muitas tentativas
    exit();
}
if ($http_code !== 200) {
    $_SESSION['login_attempts'] += 1;
    $_SESSION['last_attempt_time'] = time();
    header("Location: ../views/index.php?erro=1");
    exit();
}

// Decodifica e valida o corpo
$user_data = json_decode($body, true);
if (!is_array($user_data) || !isset($user_data['id'])) {
    // 200 sem JSON esperado → trate como erro
    $_SESSION['login_attempts'] += 1;
    $_SESSION['last_attempt_time'] = time();
    header("Location: ../views/index.php?erro=1");
    exit();
}

// Sucesso de login: fortaleça a sessão
session_regenerate_id(true);
$_SESSION['login_attempts'] = 0;
$_SESSION['loggedin'] = true;
$_SESSION['start'] = time();
$_SESSION['expire'] = $_SESSION['start'] + (30 * 60);

$_SESSION['user_id']        = $user_data['id'];
$_SESSION['nome']           = $user_data['nome'] ?? null;
$_SESSION['tipo_acesso']    = $user_data['tipo_acesso'] ?? null;
$_SESSION['user_name']      = $user_data['user_name'] ?? null;
$_SESSION['instituicao_id'] = $user_data['instituicao_id'] ?? null;

header("Location: ../views/dashboard.php");
exit();
