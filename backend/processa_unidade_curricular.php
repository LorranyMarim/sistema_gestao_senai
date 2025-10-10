<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

// URLs da API para os endpoints de UCs e o novo de bootstrap
$api_base_url = 'http://localhost:8000/api';
$api_uc_url = $api_base_url . '/unidades_curriculares';
$api_bootstrap_url = $api_base_url . '/gestao_ucs/bootstrap';

/**
 * Obtém o corpo da requisição JSON.
 * @return array|null
 */
function getRequestData() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

/**
 * Realiza uma requisição cURL para a API FastAPI e ecoa a resposta.
 * @param string $method Método HTTP (GET, POST, PUT, DELETE).
 * @param string $url URL do endpoint da API.
 * @param array|null $payload Corpo da requisição (para POST/PUT).
 */
function curl_json($method, $url, $payload = null) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_CONNECTTIMEOUT => 5,   // Aumentado para 5 segundos
        CURLOPT_TIMEOUT        => 15,  // Aumentado para 15 segundos
        CURLOPT_HTTPHEADER     => ['Accept: application/json'], // Sempre aceita JSON
    ];

    if ($payload !== null) {
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS]   = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $errno    = curl_errno($ch);
    $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 200;
    curl_close($ch);

    if ($errno) {
        http_response_code(502); // Bad Gateway
        echo json_encode(['error' => 'Erro ao contatar a API de UCs', 'code' => $errno], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code($http);
    echo ($response !== false && $response !== '') ? $response : json_encode([]);
    exit;
}

// Roteamento principal
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$id     = $_GET['id'] ?? '';

// Requisição OPTIONS (pre-flight) para CORS
if ($method === 'OPTIONS') {
    http_response_code(204); // No Content
    exit;
}

// **NOVO**: Rota especial para a ação de bootstrap
if ($method === 'GET' && $action === 'bootstrap') {
    curl_json('GET', $api_bootstrap_url);
    exit; // Termina a execução aqui para não cair no switch
}

// Lógica de CRUD existente
switch ($method) {
    case 'GET':
        // Se um ID for especificado, busca um único recurso
        if ($id !== '') {
            curl_json('GET', $api_uc_url . '/' . rawurlencode($id));
        } else {
            // Caso contrário, lista os recursos, repassando a query string para filtros e paginação
            $qs = $_SERVER['QUERY_STRING'] ?? '';
            // Remove 'action' para não interferir na API de listagem
            parse_str($qs, $params);
            unset($params['action']);
            $final_qs = http_build_query($params);
            
            curl_json('GET', $api_uc_url . ($final_qs ? '?' . $final_qs : ''));
        }
        break;

    case 'POST':
        $data = getRequestData() ?? [];
        curl_json('POST', $api_uc_url, $data);
        break;

    case 'PUT':
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado para a operação PUT'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $data = getRequestData() ?? [];
        unset($data['data_criacao']); // Garante que a data de criação não seja alterada
        curl_json('PUT', $api_uc_url . '/' . rawurlencode($id), $data);
        break;

    case 'DELETE':
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado para a operação DELETE'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        curl_json('DELETE', $api_uc_url . '/' . rawurlencode($id));
        break;

    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Método não suportado'], JSON_UNESCAPED_UNICODE);
}