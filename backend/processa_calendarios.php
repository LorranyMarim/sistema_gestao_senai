<?php
require_once("../config/verifica_login.php");

// Configuração da API Python (Ajuste a porta conforme seu ambiente, ex: 8000)
define('API_URL', 'http://localhost:8000/api');

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$token = $_COOKIE['session_token'] ?? '';

// Função auxiliar para fazer requisições cURL
function callApi($endpoint, $method = 'GET', $data = null, $token = '') {
    $ch = curl_init(API_URL . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = [
        "Cookie: session_token=" . $token,
        "Content-Type: application/json"
    ];
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    http_response_code($httpCode);
    return $response;
}

// Roteamento de Ações
try {
    switch ($action) {
        case 'list':
            echo callApi('/calendarios', 'GET', null, $token);
            break;
            
        case 'bootstrap':
            echo callApi('/gestao_calendarios/bootstrap', 'GET', null, $token);
            break;
            
        case 'create':
            $input = json_decode(file_get_contents('php://input'), true);
            echo callApi('/calendarios', 'POST', $input, $token);
            break;
            
        case 'update':
            $id = $_GET['id'];
            $input = json_decode(file_get_contents('php://input'), true);
            echo callApi("/calendarios/$id", 'PUT', $input, $token);
            break;
            
        case 'delete':
            // Frontend envia POST para simular delete, nós convertemos
            $id = $_GET['id'];
            echo callApi("/calendarios/$id", 'DELETE', null, $token);
            break;
            
        case 'list_days':
            $cal_id = $_GET['cal_id'];
            echo callApi("/calendario_letivo?calendario_id=$cal_id", 'GET', null, $token);
            break;
            
        case 'create_day':
            $input = json_decode(file_get_contents('php://input'), true);
            echo callApi('/calendario_letivo', 'POST', $input, $token);
            break;
            
        case 'delete_day':
            $id = $_GET['id'];
            echo callApi("/calendario_letivo/$id", 'DELETE', null, $token);
            break;

        default:
            http_response_code(400);
            echo json_encode(["error" => "Ação inválida"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>