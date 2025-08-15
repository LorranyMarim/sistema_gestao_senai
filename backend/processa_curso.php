<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

$api_url = 'http://localhost:8000/api/cursos';

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
        CURLOPT_CONNECTTIMEOUT => 3,   // timeout de conexão
        CURLOPT_TIMEOUT        => 10,  // timeout total
    ];
    if ($payload !== null) {
        $opts[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $response = curl_exec($ch);
    $errno    = curl_errno($ch);
    $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 200;
    curl_close($ch);

    if ($errno) {
        http_response_code(502);
        echo json_encode(['error' => 'Erro ao contatar API', 'code' => $errno], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code($http);
    echo ($response !== false && $response !== null) ? $response : json_encode([]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id     = $_GET['id'] ?? '';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($method) {
    case 'GET':
        // GET por ID ou lista (repassa query string)
        if ($id !== '') {
            curl_json('GET', $api_url . '/' . rawurlencode($id));
        } else {
            $qs = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
                ? '?' . $_SERVER['QUERY_STRING']
                : '';
            curl_json('GET', $api_url . $qs);
        }
        break;

    case 'POST':
        $data = getRequestData() ?? [];
        curl_json('POST', $api_url, $data);
        break;

    case 'PUT':
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $data = getRequestData() ?? [];
        curl_json('PUT', $api_url . '/' . rawurlencode($id), $data);
        break;

    case 'DELETE':
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        curl_json('DELETE', $api_url . '/' . rawurlencode($id));
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não suportado'], JSON_UNESCAPED_UNICODE);
        exit;
}
