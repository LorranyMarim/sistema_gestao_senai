<?php
require_once '../config/verifica_login.php';

$python_host = 'http://localhost:8000';
$base_path = '/api/empresas';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? '';

$url = $python_host;

if ($method === 'GET') {
    if ($action === 'bootstrap') {
        $url .= '/api/gestao_empresas/bootstrap';
    } else {
        $query_params = $_GET;
        unset($query_params['action']); 
        unset($query_params['id']);
        
        $query = http_build_query($query_params);
        $url .= $base_path . '?' . $query;
    }
} elseif ($method === 'POST') {
    $url .= $base_path;
} elseif ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(["detail" => "ID não fornecido"]);
        exit;
    }
    $url .= $base_path . '/' . $id;
} elseif ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(["detail" => "ID não fornecido"]);
        exit;
    }
    $url .= $base_path . '/' . $id;
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

$input_data = file_get_contents('php://input');
if ($input_data && in_array($method, ['POST', 'PUT'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input_data);
}

$headers = [
    'Content-Type: application/json',
];

if (isset($_COOKIE['session_token'])) {
    $headers[] = 'Cookie: session_token=' . $_COOKIE['session_token'];
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["detail" => "Erro de comunicação com API Python: " . curl_error($ch)]);
} else {
    http_response_code($http_code);
    echo $response;
}

curl_close($ch);
?>