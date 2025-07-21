<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Gestão de Alocação - SENAI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../css/style_turmas.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        .modal { display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.2); z-index:1000; align-items:center; justify-content:center;}
        .modal-content { background:#fff; border-radius:10px; min-width:350px; max-width:90vw; padding:30px; box-shadow:0 8px 40px rgba(0,0,0,0.2);}
        .modal.show { display:flex!important;}
    </style>
</head>
<body>
<div class="dashboard-container">
    <aside class="sidebar">
        <div class="sidebar-header">
            <img src="../assets/logo.png" alt="Logo SENAI" class="sidebar-logo">
            <h3>Menu Principal</h3>
        </div>
        <nav class="sidebar-nav">
            <ul>
                <li><a href="dashboard.html"><i class="fas fa-chart-line"></i> Dashboard</a></li>
                <li><a href="gestao_alocacao.php" class="active"><i class="fas fa-random"></i> Gestão de Alocações</a></li>
                <li><a href="gestao_cursos.php"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                <li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
                <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                <li><a href="calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
            </ul>
        </nav>
    </aside>
    <main class="main-content bg-gray-100 min-h-screen p-8">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-2xl font-bold">Gestão de Alocação</h1>
            <button onclick="abrirPopupFiltro()" class="bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 font-semibold">Gerar Alocação</button>
        </div>
        <div id="alocacoes-list" class="flex flex-wrap gap-4"></div>
    </main>

    <!-- Popup Filtro -->
    <div class="modal" id="popupFiltro">
        <div class="modal-content relative">
            <button onclick="fecharPopupFiltro()" class="absolute top-3 right-3 text-2xl text-gray-400 hover:text-black">&times;</button>
            <h2 class="text-xl mb-4 font-semibold">Gerar Nova Alocação</h2>
            <form id="formFiltro" onsubmit="confirmarFiltro(event)">
                <div class="mb-3">
                    <label class="font-medium">Turma(s):</label>
                    <select id="selectTurmas" multiple required class="w-full mt-1 border rounded px-3 py-2" style="min-height: 80px;" onchange="atualizarTurnosInstrutores()">
                        <option value="" disabled selected hidden>selecione uma ou mais opções</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="font-medium">Turno(s):</label>
                    <select id="selectTurnos" multiple required class="w-full mt-1 border rounded px-3 py-2" style="min-height: 80px;" onchange="atualizarInstrutores()">
                        <option value="" disabled selected hidden>selecione uma ou mais opções</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="font-medium">Instrutor(es):</label>
                    <select id="selectInstrutores" multiple required class="w-full mt-1 border rounded px-3 py-2" style="min-height: 80px;">
                        <option value="" disabled selected hidden>selecione uma ou mais opções</option>
                    </select>
                </div>
                <button type="submit" class="bg-green-600 px-4 py-2 rounded text-white font-semibold hover:bg-green-700">Confirmar</button>
            </form>
        </div>
    </div>

    <!-- Popup Edição de Datas -->
    <div class="modal" id="popupDatas">
        <div class="modal-content relative">
            <button onclick="fecharPopupDatas()" class="absolute top-3 right-3 text-2xl text-gray-400 hover:text-black">&times;</button>
            <h2 class="text-xl mb-4 font-semibold">Definir Período da Alocação</h2>
            <form id="formDatas" onsubmit="salvarAlocacao(event)">
                <div class="mb-3 flex gap-2">
                    <div>
                        <label>Data de Início:</label>
                        <input type="date" id="inputDataInicio" name="data_inicio" required class="border rounded px-3 py-2">
                    </div>
                    <div>
                        <label>Data de Fim:</label>
                        <input type="date" id="inputDataFim" name="data_fim" required class="border rounded px-3 py-2">
                    </div>
                </div>
                <button type="submit" class="bg-blue-600 px-4 py-2 rounded text-white font-semibold hover:bg-blue-700">Salvar</button>
            </form>
        </div>
    </div>
</div>
<script>
    // Dados em cache
    let turmasCache = [], instrutoresCache = [];
    let alocacoes = [];
    let alocacaoTemp = null;

    function abrirPopupFiltro() {
        document.getElementById("popupFiltro").classList.add("show");
        carregarOpcoesFiltros();
    }
    function fecharPopupFiltro() {
        document.getElementById("popupFiltro").classList.remove("show");
    }
    function abrirPopupDatas() {
        document.getElementById("popupDatas").classList.add("show");
    }
    function fecharPopupDatas() {
        document.getElementById("popupDatas").classList.remove("show");
    }

    // Carregar turmas e instrutores do backend
    async function carregarOpcoesFiltros() {
        [turmasCache, instrutoresCache] = await Promise.all([
            fetch('http://localhost:8000/api/turmas').then(r=>r.json()),
            fetch('http://localhost:8000/api/instrutores').then(r=>r.json()),
        ]);
        // Turmas
        let selectTurmas = document.getElementById("selectTurmas");
        selectTurmas.innerHTML = "";
        turmasCache.forEach(t => {
            selectTurmas.innerHTML += `<option value="${t._id}">${t.codigo}</option>`;
        });
        atualizarTurnosInstrutores();
    }

    // Quando turmas mudam, atualizar turnos e instrutores possíveis
    function atualizarTurnosInstrutores() {
        let selectTurmas = document.getElementById("selectTurmas");
        let selectedTurmas = Array.from(selectTurmas.selectedOptions).map(o => o.value);
        let turnosSet = new Set();
        turmasCache.filter(t => selectedTurmas.includes(t._id)).forEach(t => {
            if (t.turno) turnosSet.add(t.turno.toLowerCase());
        });
        let selectTurnos = document.getElementById("selectTurnos");
        selectTurnos.innerHTML = "";
        Array.from(turnosSet).forEach(turno => {
            selectTurnos.innerHTML += `<option value="${turno}">${turno.charAt(0).toUpperCase()+turno.slice(1)}</option>`;
        });
        atualizarInstrutores();
    }

    // Quando turnos mudam, atualizar instrutores possíveis
    function atualizarInstrutores() {
        let selectTurnos = document.getElementById("selectTurnos");
        let selectedTurnos = Array.from(selectTurnos.selectedOptions).map(o => o.value);
        let instrutoresSet = new Set();
        instrutoresCache.forEach(i => {
            if (!i.turnos) return;
            for (let turno of selectedTurnos) {
                if (i.turnos[turno]) instrutoresSet.add(i.nome);
            }
        });
        let selectInstrutores = document.getElementById("selectInstrutores");
        selectInstrutores.innerHTML = "";
        Array.from(instrutoresSet).forEach(nome => {
            selectInstrutores.innerHTML += `<option value="${nome}">${nome}</option>`;
        });
    }

    function confirmarFiltro(event) {
        event.preventDefault();
        // Obter todos selecionados (turmas, turnos, instrutores)
        const turmas = Array.from(document.getElementById("selectTurmas").selectedOptions).map(o=>o.value);
        const turnos = Array.from(document.getElementById("selectTurnos").selectedOptions).map(o=>o.value);
        const instrutores = Array.from(document.getElementById("selectInstrutores").selectedOptions).map(o=>o.value);
        alocacaoTemp = {
            codigo: "gerar_alocacao",
            turmas, turnos, instrutores,
            data_inicio: null,
            data_fim: null
        };
        fecharPopupFiltro();
        abrirPopupDatas();
    }

    function salvarAlocacao(event) {
        event.preventDefault();
        alocacaoTemp.data_inicio = document.getElementById("inputDataInicio").value;
        alocacaoTemp.data_fim = document.getElementById("inputDataFim").value;
        alocacoes.push({...alocacaoTemp});
        fecharPopupDatas();
        renderAlocacoes();
    }

    function renderAlocacoes() {
        const list = document.getElementById("alocacoes-list");
        list.innerHTML = "";
        alocacoes.forEach((a, idx) => {
            list.innerHTML += `
            <div class="bg-white rounded shadow p-4 mb-3 w-full max-w-xl border cursor-pointer hover:shadow-xl transition" onclick="detalharAlocacao(${idx})">
                <div><b>Turma(s):</b> ${a.turmas.map(id=>turmasCache.find(t=>t._id===id)?.codigo||id).join(', ')}</div>
                <div><b>Turno(s):</b> ${a.turnos.map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(', ')}</div>
                <div><b>Instrutor(es):</b> ${a.instrutores.join(', ')}</div>
                <div><b>Período:</b> ${a.data_inicio} até ${a.data_fim}</div>
            </div>
            `;
        });
    }

    function detalharAlocacao(idx) {
        alert('Detalhe da alocação:\n' + JSON.stringify(alocacoes[idx], null, 2));
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderAlocacoes();
    });
</script>
</body>
</html>
