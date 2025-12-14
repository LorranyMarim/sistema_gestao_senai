<?php
header('Content-Type: application/json');

$api_url = 'http://localhost:8000/api/empresas'; // ajuste se seu endpoint for diferente

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
    ];
    if ($payload !== null) {
        $opts[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
    }
    // [ETAPA 5] Repassa o cookie de sessão para a API Python
    if (isset($_COOKIE['session_token'])) {
        curl_setopt($ch, CURLOPT_COOKIE, 'session_token=' . $_COOKIE['session_token']);
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
    echo $response !== false ? $response : json_encode([]);
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Repassa filtros/paginação caso você ative no backend depois
        $qs = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
            ? '?' . $_SERVER['QUERY_STRING']
            : '';
        curl_json('GET', $api_url . $qs);
        break;

    case 'POST':
        $data = getRequestData() ?? [];
        curl_json('POST', $api_url, $data);
        break;

    case 'PUT':
        $id = $_GET['id'] ?? '';
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $data = getRequestData() ?? [];
        curl_json('PUT', $api_url . '/' . rawurlencode($id), $data);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? '';
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
}
