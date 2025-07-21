<?php
// Arquivo: /data/dados_dash.php

// Se quiser acessar configs globais futuramente:
// require_once(__DIR__ . '/../config/config.php');

header('Content-Type: application/json'); // Define o cabeçalho como JSON

$chart_type = $_GET['chart'] ?? '';

$data = [];

switch ($chart_type) {
    case 'instrutores_area':
        $data = [
            ['area' => 'TI', 'quantidade' => 15],
            ['area' => 'Gestão', 'quantidade' => 10],
            ['area' => 'Elétrica', 'quantidade' => 8],
            ['area' => 'Mecânica', 'quantidade' => 12],
            ['area' => 'Outras', 'quantidade' => 5]
        ];
        break;
    case 'alocacao_instrutor':
        $data = [
            ['instrutor' => 'Ana Silva', 'porcentagem' => 80],
            ['instrutor' => 'João Costa', 'porcentagem' => 75],
            ['instrutor' => 'Maria Santos', 'porcentagem' => 90],
            ['instrutor' => 'Pedro Almeida', 'porcentagem' => 60],
        ];
        // Calcula "Outros" como diferença para 100% do total
        $media = (80 + 75 + 90 + 60) / 4;
        $data[] = ['instrutor' => 'Outros', 'porcentagem' => round(100 - $media)];

        $total_porcentagem = array_sum(array_column($data, 'porcentagem'));
        foreach ($data as &$item) {
            $item['porcentagem'] = round(($item['porcentagem'] / $total_porcentagem) * 100);
        }
        unset($item);
        break;
    case 'cursos_finalizados':
        $data = [
            ['status' => 'Finalizados', 'quantidade' => 60],
            ['status' => 'Em Andamento', 'quantidade' => 35],
            ['status' => 'Não Iniciados', 'quantidade' => 5]
        ];
        break;
    case 'instrutores_janela':
        $data = [
            ['turno' => 'Manhã', 'quantidade' => 3],
            ['turno' => 'Tarde', 'quantidade' => 2],
            ['turno' => 'Noite', 'quantidade' => 1]
        ];
        break;
    default:
        $data = ['message' => 'Nenhum gráfico especificado ou gráfico inválido.'];
        break;
}

echo json_encode($data);
?>
