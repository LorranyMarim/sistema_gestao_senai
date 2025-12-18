<?php
// Arquivo: backend/processa_usuarios.php

header("Content-Type: application/json; charset=UTF-8");
require_once("../config/verifica_login.php"); // Garante segurança de sessão PHP

// Configuração da URL da API Python
$api_base_url = 'http://localhost:8000/api';
$api_url = $api_base_url . '/usuarios'; // Rota da API Python

function getRequestData() {
    $raw = file_get_contents('php://input');
    return ($raw && $raw !== '') ? json_decode($raw, true) : null;
}

function curl_json($method, $url, $payload = null) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_TIMEOUT        => 10
    ];

    // Repassa o Token da sessão para a API Python
    if (isset($_COOKIE['session_token'])) {
        $opts[CURLOPT_COOKIE] = 'session_token=' . $_COOKIE['session_token'];
    }

    if ($payload !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
    }

    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($http_code);
    echo $response;
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? ''; // Pega ID da URL se houver (ex: processa_usuarios.php?id=123)

// Roteamento Simples
switch ($method) {
    case 'GET':
        // Se tiver ID, busca um específico, senão lista todos
        $url_final = ($id !== '') ? "$api_url/$id" : $api_url;
        curl_json('GET', $url_final);
        break;

    case 'POST':
        curl_json('POST', $api_url, getRequestData());
        break;

    case 'PUT':
        if ($id === '') { http_response_code(400); echo json_encode(['msg' => 'ID necessário']); exit; }
        curl_json('PUT', "$api_url/$id", getRequestData());
        break;

    case 'DELETE':
        if ($id === '') { http_response_code(400); echo json_encode(['msg' => 'ID necessário']); exit; }
        curl_json('DELETE', "$api_url/$id");
        break;
}
?>