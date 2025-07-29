<?php
// processa_empresa.php

require 'vendor/autoload.php'; // Necessário: composer require mongodb/mongodb

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Conexão MongoDB
$client = new MongoDB\Client("mongodb+srv://09116122:aBJ3J0L3ce9rLuWh@senai.jgpu3za.mongodb.net/?retryWrites=true&w=majority&appName=senai");
$db = $client->senai_sistema_gestao;
$method = $_SERVER['REQUEST_METHOD'];

if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

function sanitizeEmpresa($data) {
    // Prepara e sanitiza todos os campos
    return [
        'razao_social'        => $data['razao_social']        ?? '',
        'cnpj_matriz'         => $data['cnpj_matriz']         ?? '',
        'cnpj_filial'         => $data['cnpj_filial']         ?? '',
        'endereco'            => $data['endereco']            ?? '',
        'responsavel_nome'    => $data['responsavel_nome']    ?? '',
        'responsavel_telefone'=> $data['responsavel_telefone']?? '',
        'responsavel_email'   => $data['responsavel_email']   ?? '',
        'instituicao_id'      => $data['instituicao_id']      ?? '',
    ];
}

switch ($method) {
    case "GET":
        if ($action === "instituicoes") {
            // Listar instituições
            $instituicoes = $db->instituicao->find()->toArray();
            foreach ($instituicoes as &$inst) $inst['_id'] = (string)$inst['_id'];
            echo json_encode($instituicoes);
            exit;
        } else {
            // Listar empresas (Empresas)
            $empresas = $db->empresa->find()->toArray();
            foreach ($empresas as &$conv) $conv['_id'] = (string)$conv['_id'];
            echo json_encode($empresas);
            exit;
        }

    case "POST":
        // Adicionar nova empresa (Empresa)
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['razao_social']) || !isset($data['cnpj_matriz']) || !isset($data['instituicao_id'])) {
            http_response_code(400);
            echo json_encode(["erro" => "Campos obrigatórios faltando: razão social, CNPJ matriz, instituição"]);
            exit;
        }
        $novaEmpresa = sanitizeEmpresa($data);
        $res = $db->empresa->insertOne($novaEmpresa);
        $novaEmpresa['_id'] = (string)$res->getInsertedId();
        echo json_encode($novaEmpresa);
        exit;

    case "PUT":
        // Editar empresa (Empresa)
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(["erro" => "ID não informado"]);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $novaEmpresa = sanitizeEmpresa($data);
        $db->empresa->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($id)],
            ['$set' => $novaEmpresa]
        );
        $novaEmpresa['_id'] = $id;
        echo json_encode($novaEmpresa);
        exit;

    case "DELETE":
        // Excluir empresa (Empresa)
        parse_str($_SERVER['QUERY_STRING'], $query);
        $id = $query['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(["erro" => "ID não informado"]);
            exit;
        }
        $db->empresa->deleteOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
        echo json_encode(["msg" => "Empresa excluído"]);
        exit;

    default:
        http_response_code(405);
        echo json_encode(["erro" => "Método não permitido"]);
        exit;
}