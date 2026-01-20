<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

$api_base_url = 'http://localhost:8000/api';
$api_url = $api_base_url . '/instrutores';
$api_bootstrap_url = $api_base_url . '/gestao_instrutores/bootstrap';

function getRequestData() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

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
        $opts[CURLOPT_POSTFIELDS]   = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
$id     = $_GET['id'] ?? '';
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($method) {
    case 'GET':
        if ($action === 'bootstrap') {
            curl_json('GET', $api_bootstrap_url);
        } elseif ($id !== '') {
            curl_json('GET', $api_url . '/' . rawurlencode($id));
        } else {
          $qs = $_SERVER['QUERY_STRING'] ?? '';
            $parts = explode('&', $qs);
            $new_parts = array_filter($parts, function($p) {
                return !empty($p) && strpos($p, 'action=') !== 0;
            });
            
            $final_qs = implode('&', $new_parts);
            curl_json('GET', $api_url . ($final_qs ? '?' . $final_qs : ''));
        }
        break;

    case 'POST':
        $data = getRequestData() ?? [];
        curl_json('POST', $api_url, $data);
        break;

    case 'PUT':
        if ($id === '') { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = getRequestData() ?? [];
        unset($data['data_criacao']);
        curl_json('PUT', $api_url . '/' . rawurlencode($id), $data);
        break;

    case 'DELETE':
        if ($id === '') { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        curl_json('DELETE', $api_url . '/' . rawurlencode($id));
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>