<?php
session_start();

$apiUrl = getenv('API_URL') ?: 'http://localhost:8000'; 
$endpoint = '/api/usuarios';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? '';

$url = $apiUrl . $endpoint;

if ($action === 'list') {

} 
elseif ($action === 'update_password' && $id) {

    $url = $apiUrl . "/api/usuarios/{$id}/senha";
    $method = 'PATCH'; 
} 
elseif ($id) {
    $url = $apiUrl . "/api/usuarios/{$id}";
}

$ch = curl_init($url);

$inputData = file_get_contents('php://input');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

if (isset($_COOKIE['session_token'])) {
    curl_setopt($ch, CURLOPT_COOKIE, "session_token=" . $_COOKIE['session_token']);
}

switch ($method) {
    case 'POST':
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $inputData);
        break;
    
    case 'PUT':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $inputData);
        break;

    case 'PATCH':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $inputData);
        break;
        
    case 'DELETE':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        break;
        
    case 'GET':
    default:
        curl_setopt($ch, CURLOPT_HTTPGET, true);
        break;
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(502); 
    echo json_encode(['error' => 'Erro de comunicação com o serviço de usuários: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);

http_response_code($httpCode);

header('Content-Type: application/json');
echo $response;
exit;