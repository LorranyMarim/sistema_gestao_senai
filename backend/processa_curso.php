<?php
header('Content-Type: application/json');

// URL base da API
$api_url = 'http://localhost:8000/api/cursos';

// Utilitário para pegar dados do body da requisição POST
function getRequestData() {
    return json_decode(file_get_contents('php://input'), true);
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Lista todos os cursos
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        break;

    case 'POST':
        // Cria novo curso
        $data = getRequestData();
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        break;

    case 'PUT':
        // Atualiza curso
        $id = $_GET['id'] ?? '';
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID não informado']); exit; }
        $data = getRequestData();
        $ch = curl_init($api_url . "/$id");
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        break;

    case 'DELETE':
        // Remove curso
        $id = $_GET['id'] ?? '';
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID não informado']); exit; }
        $ch = curl_init($api_url . "/$id");
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        break;

    default:
        http_response_code(405);
        echo json_encode(['error'=>'Método não suportado']);
}
