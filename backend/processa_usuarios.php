<?php
// backend/processa_usuarios.php

// Inicia sessão para acesso a cookies/tokens se necessário, 
// mas o principal é o repasse do Cookie 'session_token' para a API.
session_start();

// Configuração da API Python
$apiUrl = getenv('API_URL') ?: 'http://localhost:8000'; // Ajuste conforme seu ambiente
$endpoint = '/api/usuarios';

// Captura dados da requisição
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? '';

// URL Final da API
$url = $apiUrl . $endpoint;

// Lógica de Roteamento de Ações
if ($action === 'list') {
    // GET /api/usuarios
    // Não precisa alterar a URL base
} 
elseif ($action === 'update_password' && $id) {
    // Rota específica de senha: PATCH /api/usuarios/{id}/senha
    // O Frontend envia POST, nós convertemos para PATCH
    $url = $apiUrl . "/api/usuarios/{$id}/senha";
    $method = 'PATCH'; 
} 
elseif ($id) {
    // Operações em usuário específico (PUT, DELETE, GET ID)
    $url = $apiUrl . "/api/usuarios/{$id}";
}

// Inicializa cURL
$ch = curl_init($url);

// Captura o payload (JSON) enviado pelo JS
$inputData = file_get_contents('php://input');

// Configurações comuns do cURL
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

// Repassa o Cookie de sessão (Autenticação)
if (isset($_COOKIE['session_token'])) {
    curl_setopt($ch, CURLOPT_COOKIE, "session_token=" . $_COOKIE['session_token']);
}

// Configura o Método HTTP e Body
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
        // Se houver query params extras (filtros), poderíamos repassar aqui
        break;
}

// Executa a requisição
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Tratamento de erros de conexão com a API
if (curl_errno($ch)) {
    http_response_code(502); // Bad Gateway
    echo json_encode(['error' => 'Erro de comunicação com o serviço de usuários: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Repassa o código HTTP da API para o Frontend
http_response_code($httpCode);

// Retorna a resposta da API
header('Content-Type: application/json');
echo $response;
exit;