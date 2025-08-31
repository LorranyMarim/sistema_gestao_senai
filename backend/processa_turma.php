<?php
header('Content-Type: application/json');

// Suportar GET e POST
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método inválido']);
    exit;
}

// Se for GET, listar turmas
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $apiUrl = 'http://localhost:8000/api/turmas/';
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_HTTPHEADER      => [
            'Accept: application/json'
        ],
        CURLOPT_CONNECTTIMEOUT  => 5,
        CURLOPT_TIMEOUT         => 15,
        CURLOPT_FOLLOWLOCATION  => false,
        CURLOPT_MAXREDIRS       => 0,
    ]);
    
    $result   = curl_exec($ch);
    $httpcode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);
    
    // Falha de transporte
    if ($result === false) {
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error'   => 'Falha ao conectar na API de turmas',
            'detail'  => $curlErr
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Resposta da API
    $resp = json_decode($result, true);
    
    // Sucesso
    if ($httpcode === 200) {
        // Retornar apenas os dados das turmas
        echo json_encode($resp['data'] ?? [], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Erro da API
    http_response_code($httpcode);
    echo json_encode([
        'success' => false,
        'error'   => 'Erro ao listar turmas',
        'status'  => $httpcode,
        'api_raw' => $resp ?? $result,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Se for POST, criar turma
// Lê JSON
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido no body']);
    exit;
}

/* ===== Validação mínima ===== */
$required = [
    'codigo','id_curso','data_inicio','data_fim','turno',
    'num_alunos','id_instituicao','id_calendario','id_empresa','unidades_curriculares'
];
$missing = array_values(array_diff($required, array_keys($data)));
if ($missing) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Campos obrigatórios ausentes', 'missing' => $missing]);
    exit;
}
if (!is_array($data['unidades_curriculares']) || count($data['unidades_curriculares']) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'unidades_curriculares deve ser uma lista não vazia']);
    exit;
}

// Normalizações
$data['num_alunos'] = (int)$data['num_alunos'];

// status: default true; coerção p/ boolean se vier do front
if (!array_key_exists('status', $data)) {
    $data['status'] = true;
} else {
    // aceita true/false, "true"/"false", 1/0
    $val = filter_var($data['status'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    $data['status'] = ($val === null) ? true : $val;
}

/* ===== Chama a API FastAPI ===== */
$apiUrl = 'http://localhost:8000/api/turmas/'; // mantém a barra final
$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST            => 1,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HTTPHEADER      => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_POSTFIELDS      => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_CONNECTTIMEOUT  => 5,
    CURLOPT_TIMEOUT         => 15,
    CURLOPT_FOLLOWLOCATION  => false,
    CURLOPT_MAXREDIRS       => 0,
]);

$result   = curl_exec($ch);
$httpcode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// Falha de transporte
if ($result === false) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error'   => 'Falha ao conectar na API de turmas',
        'detail'  => $curlErr
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Resposta da API
$resp = json_decode($result, true);

// Sucesso
if ($httpcode === 201) {
    http_response_code(201);
    echo json_encode(['success' => true, 'api' => $resp ?: []], JSON_UNESCAPED_UNICODE);
    exit;
}

// Erro da API
http_response_code($httpcode);
$msg = 'Erro ao cadastrar turma!';
if (is_array($resp) && isset($resp['detail'])) {
    $msg = is_string($resp['detail']) ? $resp['detail'] : json_encode($resp['detail'], JSON_UNESCAPED_UNICODE);
}
echo json_encode([
    'success' => false,
    'error'   => $msg,
    'status'  => $httpcode,
    'api_raw' => $resp ?? $result,
], JSON_UNESCAPED_UNICODE);
