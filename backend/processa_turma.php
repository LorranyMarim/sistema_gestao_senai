<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

// Definição das Rotas da API Python
$api_base_url = 'http://localhost:8000/api';
$api_turma_url = $api_base_url . '/turmas';
$api_bootstrap_url = $api_base_url . '/gestao_turmas/bootstrap';

// Helper para ler o corpo da requisição (JSON)
function getRequestData() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

// Helper para fazer requisições CURL para a API Python
function curl_json($method, $url, $payload = null) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ];

    // Encaminha o cookie de sessão para autenticação no Python
    if (isset($_COOKIE['session_token'])) {
        $opts[CURLOPT_COOKIE] = 'session_token=' . $_COOKIE['session_token'];
    }

    if ($payload !== null) {
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS]   = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 500;
    curl_close($ch);

    // Repassa o código HTTP e a resposta da API
    http_response_code($http_code);
    echo ($response !== false) ? $response : json_encode(['error' => 'Falha na conexão com API']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id     = $_GET['id'] ?? '';
$action = $_GET['action'] ?? '';

// Tratamento de Preflight Request (CORS)
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($method) {
    case 'GET':
        if ($action === 'bootstrap') {
            // Rota de carregamento inicial (Cursos, Calendários, Instrutores, etc)
            curl_json('GET', $api_bootstrap_url);
        } elseif ($id !== '') {
            // Buscar uma turma específica por ID
            curl_json('GET', $api_turma_url . '/' . rawurlencode($id));
        } else {
            // Listagem com filtros (repassa query string inteira)
            $qs = $_SERVER['QUERY_STRING'] ?? '';
            parse_str($qs, $params);
            unset($params['action']); // Remove param interno 'action'
            $final_qs = http_build_query($params);
            curl_json('GET', $api_turma_url . ($final_qs ? '?' . $final_qs : ''));
        }
        break;

    case 'POST':
        $data = getRequestData() ?? [];
        curl_json('POST', $api_turma_url, $data);
        break;

    case 'PUT':
        if ($id === '') { 
            http_response_code(400); 
            echo json_encode(['error' => 'ID obrigatório']); 
            exit; 
        }
        $data = getRequestData() ?? [];
        // Remove campos de auditoria que não devem ser alterados manualmente
        unset($data['data_criacao']);
        unset($data['criado_em']);
        
        curl_json('PUT', $api_turma_url . '/' . rawurlencode($id), $data);
        break;

    case 'DELETE':
        if ($id === '') { 
            http_response_code(400); 
            echo json_encode(['error' => 'ID obrigatório']); 
            exit; 
        }
        curl_json('DELETE', $api_turma_url . '/' . rawurlencode($id));
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>