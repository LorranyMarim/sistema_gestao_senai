<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

$api_base_url = 'http://localhost:8000/api';
$api_url = $api_base_url . '/ocupacao/instrutores';

function curl_json($method, $url, $payload = null) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ];

    if (isset($_COOKIE['session_token'])) {
        $opts[CURLOPT_COOKIE] = 'session_token=' . $_COOKIE['session_token'];
    }

    if ($payload !== null) {
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS]   = json_encode($payload);
    }
    
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 500;
    curl_close($ch);

    http_response_code($http_code);
    echo ($response !== false) ? $response : json_encode(['error' => 'Falha na conexão com API']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$turno = $_GET['turno'] ?? '';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method === 'GET') {
    $qs = '';
    if ($turno) {
        $qs = '?turno=' . rawurlencode($turno);
    }
    curl_json('GET', $api_url . $qs);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
}
?>