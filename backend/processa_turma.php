<?php
header('Content-Type: application/json');

// Só POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'error' => 'Método inválido']);
    exit;
}

// Lê JSON do body
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido no body']);
    exit;
}

/* ====== Validação mínima (opcional, mas ajuda a evitar 422) ====== */
$required = ['codigo','id_curso','data_inicio','data_fim','turno','num_alunos','id_instituicao','id_calendario','id_empresa','unidades_curriculares'];
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
$data['num_alunos'] = (int)$data['num_alunos']; // força inteiro
/* ================================================================ */

// Chama a API FastAPI
$apiUrl = 'http://localhost:8000/api/turmas/'; // mantenha a barra final
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
    CURLOPT_FOLLOWLOCATION  => false, // com barra final não precisamos seguir redirect
    CURLOPT_MAXREDIRS       => 0,
]);

$result   = curl_exec($ch);
$httpcode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// Falha de transporte (DNS, porta, serviço off, etc.)
if ($result === false) {
    http_response_code(502); // Bad Gateway
    echo json_encode([
        'success' => false,
        'error'   => 'Falha ao conectar na API de turmas',
        'detail'  => $curlErr
    ]);
    exit;
}

// Tente decodificar a resposta da API para repassar mensagens úteis
$resp = json_decode($result, true);

// Sucesso (criado)
if ($httpcode === 201) {
    http_response_code(201);
    echo json_encode(['success' => true, 'api' => $resp ?: []], JSON_UNESCAPED_UNICODE);
    exit;
}

// Erro da API: repasse o status original
http_response_code($httpcode);

// Mensagem amigável + payload bruto para debug inicial
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
