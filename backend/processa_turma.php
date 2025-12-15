<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// URL da API Python
$api_url = 'http://localhost:8000/api/turmas';

function curl_request($method, $url, $data = null) {
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json'];
    
    // Repassa o cookie de sessão para autenticação
    if (isset($_COOKIE['session_token'])) {
        curl_setopt($ch, CURLOPT_COOKIE, 'session_token=' . $_COOKIE['session_token']);
    }

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 10
    ];

    if ($data !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($data);
    }

    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($http_code);
    return $response;
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? '';

// Tratamento de rotas
if ($method === 'GET') {
    // Se tiver ID, busca específica, senão lista tudo
    $url = $id ? "$api_url/" . urlencode($id) : $api_url;
    echo curl_request('GET', $url);
} 
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    echo curl_request('POST', $api_url, $input);
} 
elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    echo curl_request('PUT', "$api_url/" . urlencode($id), $input);
} 
elseif ($method === 'DELETE') {
    echo curl_request('DELETE', "$api_url/" . urlencode($id));
} 
elseif ($method === 'OPTIONS') {
    http_response_code(200);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
}
?>