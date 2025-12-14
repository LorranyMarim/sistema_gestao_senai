<?php
header('Content-Type: application/json');

// Apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método inválido']);
    exit;
}

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

/*  ❌ Removido: conversão de status para boolean
    Queremos "ativo"|"inativo" como string, do jeito que veio do front.
    if (!array_key_exists('status', $data)) { ... }
*/

// ===== Chama a API FastAPI =====
// IMPORTANTE: sem barra final para evitar redirect (ou ligue FOLLOWLOCATION)
$apiUrl = 'http://localhost:8000/api/turmas';

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
    CURLOPT_FOLLOWLOCATION  => true,   // ✅ segue redirect se houver
    CURLOPT_MAXREDIRS       => 2,
]);
// ... após curl_setopt_array($ch, [...]);

// [ETAPA 5] Repassa o cookie de sessão do navegador para a API Python
if (isset($_COOKIE['session_token'])) {
    $cookie_string = 'session_token=' . $_COOKIE['session_token'];
    curl_setopt($ch, CURLOPT_COOKIE, $cookie_string);
}

// $result = curl_exec($ch); ...

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

// Sucesso (aceita 200 ou 201)
if ($httpcode === 201 || $httpcode === 200) {
    http_response_code($httpcode);
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
