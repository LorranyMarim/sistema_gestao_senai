<?php
// processa_convenio.php

require 'vendor/autoload.php'; // Requer a biblioteca mongodb/mongodb via composer
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Conexão MongoDB
$client = new MongoDB\Client("mongodb://localhost:27017");
$db = $client->senai_betim_bd;

$method = $_SERVER['REQUEST_METHOD'];

// Permitir preflight para CORS
if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Roteamento simples via querystring
$action = $_GET['action'] ?? '';

switch ($method) {
    case "GET":
        if ($action === "instituicoes") {
            // Listar instituições
            $instituicoes = $db->instituicao->find()->toArray();
            foreach ($instituicoes as &$inst) $inst['_id'] = (string)$inst['_id'];
            echo json_encode($instituicoes);
            exit;
        } else {
            // Listar convenios
            $convenios = $db->convenio->find()->toArray();
            foreach ($convenios as &$conv) $conv['_id'] = (string)$conv['_id'];
            echo json_encode($convenios);
            exit;
        }

    case "POST":
        // Adicionar novo convênio
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['razao_social'], $data['cnpj'], $data['instituicao_id'])) {
            http_response_code(400);
            echo json_encode(["erro" => "Campos obrigatórios faltando"]);
            exit;
        }
        $res = $db->convenio->insertOne($data);
        $data['_id'] = (string)$res->getInsertedId();
        echo json_encode($data);
        exit;

    case "PUT":
        // Editar convênio
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(["erro" => "ID não informado"]);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $db->convenio->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($id)],
            ['$set' => $data]
        );
        $data['_id'] = $id;
        echo json_encode($data);
        exit;

    case "DELETE":
        // Excluir convênio
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(["erro" => "ID não informado"]);
            exit;
        }
        $db->convenio->deleteOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
        echo json_encode(["msg" => "Convênio excluído"]);
        exit;

    default:
        http_response_code(405);
        echo json_encode(["erro" => "Método não permitido"]);
        exit;
}
