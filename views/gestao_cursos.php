<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Cursos - SENAI</title>
    <link rel="stylesheet" href="../css/style_turmas.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/css/select2.min.css" />
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css" />
    <style>
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            align-items: center;
            justify-content: center;
            z-index: 999;
        }

        .modal-content {
            background: #fff;
            border-radius: 10px;
            padding: 30px;
            min-width: 350px;
            max-width: 90vw;
            position: relative;
        }

        .show {
            display: flex !important;
        }

        .btn {
            margin: 2px;
        }

        .modal-close,
        .close-button {
            position: absolute;
            top: 15px;
            right: 30px;
            font-size: 2em;
            cursor: pointer;
        }

        .popup-field {
            margin-bottom: 12px;
        }

        .popup-label {
            font-weight: bold;
            margin-right: 8px;
        }

        .uc-list-detail {
            margin-left: 18px;
            margin-bottom: 12px;
            border-left: 2px solid #e5e7eb;
            padding-left: 10px;
        }

        .uc-header {
            font-weight: bold;
            color: #3b82f6;
        }

        .uc-table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 8px;
        }

        .uc-table th,
        .uc-table td {
            border: 1px solid #ddd;
            padding: 3px 6px;
        }

        .uc-table th {
            background: #f3f4f6;
        }
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
                <li><a href="gestao_alocacao.php"><i class="fas fa-random"></i> Gestão de Alocações</a></li>
                <li><a href="gestao_cursos.php" class="active"><i class="fas fa-book"></i> Gestão de Cursos</a></li>
                <li><a href="gestao_turmas.php"><i class="fas fa-users"></i> Gestão de Turmas</a></li>
                <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de Instrutores</a></li>
                <li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
                <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                <li><a href="gestao_unidades_curriculares.php" ><i class="fas fa-graduation-cap"></i> Gestão de UCs</a></li>
                <li><a href="calendario.php"><i class="fas fa-calendar-alt"></i> Calendário</a></li>
                <li><a href="../backend/logout.php"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
            </ul>
        </nav>
    </aside>
    <main class="main-content">
        <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>
        <header class="main-header">
            <h1>Gestão de Cursos</h1>
             <button class="btn btn-primary" onclick="openAddCursoModal()">
                            <i class="fas fa-plus-circle"></i> Adicionar Novo Curso
                        </button>
        </header>
        <section class="table-section">
            <h2>Cursos Cadastrados</h2>
            <div class="filter-section">
                <div class="filter-group">
                    <label for="searchUc">Buscar Curso:</label>
                    <input type="text" id="searchUc" placeholder="Digite para filtrar..." class="search-input">
                </div>
            </div>
            <div class="table-responsive">
                    <table class="data-table" id="cursosTable">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Turnos</th>
                                <th>Nível do Curso</th>
                                <th>Carga Horária</th>
                                <th>Área</th>
                                <th>CBO</th>
                                <th>Código Matriz</th>
                                <th>Eixo Tecnológico</th>
                                <th>Nível Qualificação</th>
                                <th>Instituição</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Preenchido por JS -->
                        </tbody>
                    </table>
                </div>
                <!-- Modal de Detalhe do Curso -->
                <div class="modal" id="modalDetalheCurso">
                    <div class="modal-content" style="min-width:400px;max-width:90vw;">
                        <span class="modal-close" onclick="fecharModalDetalhe()">&times;</span>
                        <h2>Detalhes do Curso</h2>
                        <div id="detalheCursoConteudo"></div>
                    </div>
                </div>
                <!-- Modal de Adicionar Novo Curso -->
                <div id="addCursoModal" class="modal">
                    <div class="modal-content">
                        <span class="close-button" onclick="closeModal('addCursoModal')">×</span>
                        <h2><span id="modalTitle">Adicionar Novo Curso</span></h2>
                        <form id="cursoForm" action="processa_curso.php" method="POST">
                            <input type="hidden" id="cursoId" name="id" value="">
                            <input type="hidden" id="action" name="action" value="add">
                            <div class="form-group">
                                <label for="nomeCurso">Nome do Curso:</label>
                                <input type="text" id="nomeCurso" name="nome_curso" required="">
                            </div>
                            <div class="form-group">
                                <label for="codigoMatriz">Código Matriz:</label>
                                <input type="text" id="codigoMatriz" name="codigo_matriz" required="">
                            </div>
                            <div class="form-group">
                                <label for="tipoCurso">Tipo:</label>
                                <select id="tipoCurso" name="tipoCurso" required="">
                                    <option value="">Selecione</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="EAD">EAD</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="nivelCurso">Nível do Curso:</label>
                                <select id="nivelCurso" name="nivel_curso" required>
                                    <option value="">Selecione</option>
                                    <option value="Técnico">Técnico</option>
                                    <option value="Aprendizagem">Aprendizagem</option>
                                    <option value="Superior">Superior</option>
                                    <option value="Especialização">Especialização</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="turnosSelect">Turnos:</label>
                                <select class="form-select" id="turnosSelect" name="turnos[]"
                                    data-placeholder="Selecione os turnos" multiple required style="width:100%;">
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noite">Noite</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="cargaHoraria">Carga Horária (h):</label>
                                <input type="number" id="cargaHoraria" name="carga_horaria" required="" min="1">
                            </div>
                            <div class="form-group">
                                <label for="cbo">CBO:</label>
                                <input type="text" id="cbo" name="cbo" required="">
                            </div>
                            <div class="form-group">
                                <label for="area">Área:</label>
                                <input type="text" id="area" name="area" required="">
                            </div>
                            <div class="form-group">
                                <label for="eixoTecnologico">Eixo Tecnologico:</label>
                                <input type="text" id="eixoTecnologico" name="eixo_tecnologico" required="">
                            </div>
                            <div class="form-group">
                                <label for="nivelQualificacao">Nível de Qualificação</label>
                                <input type="number" id="nivelQualificacao" name="nivel_qualificacao" required=""
                                    min="1">
                            </div>
                            <div class="form-group">
                                <label for="instituicaoId">Instituição:</label>
                                <select id="instituicaoId" name="instituicao_id" required>
                                    <option value="">Selecione</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ucsSelect">Unidades Curriculares:</label>
                                <select class="form-select" id="ucsSelect" name="ucs[]" multiple style="width:100%;"
                                    required>
                                </select>
                            </div>
                            <div class="form-group" id="ucFormsSection" style="display:none;">
                                <h4>Configurar Dados das Unidades Curriculares Selecionadas</h4>
                                <div id="ucConfigForms"></div>
                            </div>
                            <button type="submit" class="btn btn-primary">Salvar Curso</button>
                            <button type="button" class="btn btn-secondary"
                                onclick="closeModal('addCursoModal')">Cancelar</button>
                        </form>
                    </div>
                </div>
                <div class="modal" id="modalUcConfig">
                    <div class="modal-content" style="min-width:320px;max-width:95vw;">
                        <span class="modal-close" onclick="closeUcConfigModal()">&times;</span>
                        <h3>Configurar Unidade Curricular</h3>
                        <form id="ucConfigForm">
                            <input type="hidden" id="ucConfigId">
                            <div class="form-group"><label>UC: <span id="ucConfigName"></span></label></div>
                            <div class="form-group">
                                <label for="ch_total">Carga Horária Total:</label>
                                <input type="number" id="ch_total" name="carga_horaria_total" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="presencial_ch">Presencial - CH:</label>
                                <input type="number" id="presencial_ch" name="presencial_ch" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="presencial_aulas">Presencial - Aulas 45min:</label>
                                <input type="number" id="presencial_aulas" name="presencial_aulas" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="presencial_dias">Presencial - Dias Letivos:</label>
                                <input type="number" id="presencial_dias" name="presencial_dias" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="ead_ch">EAD - CH:</label>
                                <input type="number" id="ead_ch" name="ead_ch" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="ead_aulas">EAD - Aulas 45min:</label>
                                <input type="number" id="ead_aulas" name="ead_aulas" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="ead_dias">EAD - Dias Letivos:</label>
                                <input type="number" id="ead_dias" name="ead_dias" min="0" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Salvar UC</button>
                        </form>
                    </div>
                </div>
                <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.full.min.js"></script>
                <script>
                    let instituicoesCache = null;
                    let ucsCache = null;
                    let cursosDataTable = [];
                    let ucDataMap = {};
                    let ucConfigs = {};

                    async function fetchInstituicoes() {
                        if (instituicoesCache) return instituicoesCache;
                        const resp = await fetch('http://localhost:8000/api/instituicoes');
                        instituicoesCache = await resp.json();
                        return instituicoesCache;
                    }
                    async function fetchUCs() {
                        if (ucsCache) return ucsCache;
                        const resp = await fetch('http://localhost:8000/api/unidades_curriculares');
                        ucsCache = await resp.json();
                        return ucsCache;
                    }
                    function getNomeInstituicao(id, lista) {
                        const inst = lista.find(i => i._id === id || i.id === id);
                        return inst ? (inst.razao_social || inst.nome || id) : id;
                    }
                    function renderTurnos(turnos) {
                        if (!turnos) return '-';
                        if (Array.isArray(turnos)) return turnos.join(', ');
                        return Object.entries(turnos)
                            .filter(([_, v]) => v)
                            .map(([k, _]) => k.charAt(0).toUpperCase() + k.slice(1))
                            .join(', ');
                    }
                    function renderUCTable(ucs = []) {
                        if (!Array.isArray(ucs) || ucs.length === 0) return "-";
                        let html = `<table class="uc-table">
        <thead>
            <tr>
                <th>#</th>
                <th>UC</th>
                <th>C.H. Total</th>
                <th>Presencial</th>
                <th>EAD</th>
            </tr>
        </thead>
        <tbody>`;
                        ucs.forEach((uc, idx) => {
                            html += `<tr>
            <td>${idx + 1}</td>
            <td>${uc.unidade_curricular || '-'}</td>
            <td>${uc.carga_horaria_total ?? '-'}</td>
            <td>
                CH: ${uc.presencial?.carga_horaria ?? '-'}<br>
                Aulas: ${uc.presencial?.quantidade_aulas_45min ?? '-'}<br>
                Dias: ${uc.presencial?.dias_letivos ?? '-'}
            </td>
            <td>
                CH: ${uc.ead?.carga_horaria ?? '-'}<br>
                Aulas: ${uc.ead?.quantidade_aulas_45min ?? '-'}<br>
                Dias: ${uc.ead?.dias_letivos ?? '-'}
            </td>
        </tr>`;
                        });
                        html += `</tbody></table>`;
                        return html;
                    }
                    async function preencherInstituicoes() {
                        const select = document.getElementById('instituicaoId');
                        if (!select) return;
                        const instituicoes = await fetchInstituicoes();
                        select.innerHTML = '<option value="">Selecione</option>';
                        instituicoes.forEach(inst => {
                            select.innerHTML += `<option value="${inst._id || inst.id}">${inst.razao_social || inst.nome || '(sem nome)'}</option>`;
                        });
                    }
                    async function preencherUCs() {
                        const select = $('#ucsSelect');
                        const ucs = await fetchUCs();
                        select.empty();
                        ucDataMap = {};
                        ucs.forEach(uc => {
                            const id = uc._id || uc.id || uc.codigo || uc.descricao;
                            ucDataMap[id] = uc.descricao;
                            select.append(`<option value="${id}">${uc.descricao}</option>`);
                        });
                        select.trigger('change');
                    }
                    function resetUcConfigs() {
                        ucConfigs = {};
                        $('#ucConfigForms').html('');
                        $('#ucFormsSection').hide();
                    }
                    function showUcConfigModal(ucId, ucName) {
                        $('#ucConfigId').val(ucId);
                        $('#ucConfigName').text(ucName);
                        if (ucConfigs[ucId]) {
                            $('#ch_total').val(ucConfigs[ucId].carga_horaria_total);
                            $('#presencial_ch').val(ucConfigs[ucId].presencial.carga_horaria);
                            $('#presencial_aulas').val(ucConfigs[ucId].presencial.quantidade_aulas_45min);
                            $('#presencial_dias').val(ucConfigs[ucId].presencial.dias_letivos);
                            $('#ead_ch').val(ucConfigs[ucId].ead.carga_horaria);
                            $('#ead_aulas').val(ucConfigs[ucId].ead.quantidade_aulas_45min);
                            $('#ead_dias').val(ucConfigs[ucId].ead.dias_letivos);
                        } else {
                            $('#ucConfigForm')[0].reset();
                        }
                        $('#modalUcConfig').addClass('show');
                    }
                    function closeUcConfigModal() {
                        $('#modalUcConfig').removeClass('show');
                    }
                    $('#ucConfigForm').on('submit', function (e) {
                        e.preventDefault();
                        const ucId = $('#ucConfigId').val();
                        ucConfigs[ucId] = {
                            id: ucId,
                            unidade_curricular: ucDataMap[ucId],
                            carga_horaria_total: parseInt($('#ch_total').val(), 10),
                            presencial: {
                                carga_horaria: parseInt($('#presencial_ch').val(), 10),
                                quantidade_aulas_45min: parseInt($('#presencial_aulas').val(), 10),
                                dias_letivos: parseInt($('#presencial_dias').val(), 10)
                            },
                            ead: {
                                carga_horaria: parseInt($('#ead_ch').val(), 10),
                                quantidade_aulas_45min: parseInt($('#ead_aulas').val(), 10),
                                dias_letivos: parseInt($('#ead_dias').val(), 10)
                            }
                        };
                        $('#ucConfigForms').find(`[data-ucid="${ucId}"]`).removeClass('pending').addClass('configured');
                        closeUcConfigModal();
                        checkUcConfigsRequired();
                    });
                    function checkUcConfigsRequired() {
                        let allConfigured = true;
                        $('#ucConfigForms').children().each(function () {
                            if (!$(this).hasClass('configured')) {
                                allConfigured = false;
                            }
                        });
                        if (allConfigured) {
                            $('#ucFormsSection').hide();
                        } else {
                            $('#ucFormsSection').show();
                        }
                    }
                    $('#ucsSelect').on('change', function () {
                        const selected = $(this).val() || [];
                        Object.keys(ucConfigs).forEach(k => {
                            if (!selected.includes(k)) delete ucConfigs[k];
                        });
                        $('#ucConfigForms').html('');
                        selected.forEach(id => {
                            const name = ucDataMap[id] || id;
                            const status = ucConfigs[id] ? 'configured' : 'pending';
                            $('#ucConfigForms').append(
                                `<div class="uc-config-row ${status}" data-ucid="${id}" style="margin-bottom:10px;">
                        <strong>${name}</strong>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="showUcConfigModal('${id}', '${name}')">
                            ${ucConfigs[id] ? 'Editar Dados' : 'Configurar Dados'}
                        </button>
                        ${status === 'pending' ? '<span style="color:#c00;margin-left:10px;">(Pendente)</span>' : '<span style="color:green;margin-left:10px;">(OK)</span>'}
                    </div>`
                            );
                        });
                        if (selected.length > 0) {
                            $('#ucFormsSection').show();
                            let nextPending = selected.find(id => !ucConfigs[id]);
                            if (nextPending) showUcConfigModal(nextPending, ucDataMap[nextPending]);
                        } else {
                            $('#ucFormsSection').hide();
                        }
                    });
                    function openAddCursoModal() {
                        preencherInstituicoes();
                        preencherUCs();
                        resetUcConfigs();
                        $('#addCursoModal').addClass('show');
                    }
                    function closeModal(modalId) {
                        $('#' + modalId).removeClass('show');
                    }
                    // Função para renderizar tabela
                    function renderCursosTable(cursos, instituicoes) {
                        const tbody = document.querySelector('#cursosTable tbody');
                        tbody.innerHTML = '';
                        cursos.forEach(curso => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
            <td>${curso.nome || ''}</td>
            <td>${curso.tipo || ''}</td>
            <td>${renderTurnos(curso.turnos)}</td>
            <td>${curso.nivel_curso || ''}</td>
            <td>${curso.carga_horaria || ''}</td>
            <td>${curso.area || ''}</td>
            <td>${curso.cbo || ''}</td>
            <td>${curso.codigo_matriz || ''}</td>
            <td>${curso.eixo_tecnologico || ''}</td>
            <td>${curso.nivel_qualificacao || ''}</td>
            <td>${getNomeInstituicao(curso.instituicao_id, instituicoes)}</td>
            <td>
                <button class="btn btn-edit" title="Editar" onclick="editarCurso(event, '${curso._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" title="Excluir" onclick="excluirCurso(event, '${curso._id}', '${curso.nome}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
                            tr.addEventListener('click', function (e) {
                                if (
                                    !e.target.closest('.btn-edit') &&
                                    !e.target.closest('.btn-delete') &&
                                    !e.target.closest('.fa-edit') &&
                                    !e.target.closest('.fa-trash-alt')
                                ) {
                                    mostrarDetalheCurso(curso, instituicoes, ucsCache);
                                }
                            });
                            tbody.appendChild(tr);
                        });
                    }
                    // Listar cursos cadastrados
                    async function carregarCursos() {
                        const [instituicoes, ucs] = await Promise.all([fetchInstituicoes(), fetchUCs()]);
                        const resp = await fetch('http://localhost:8000/api/cursos');
                        const cursos = await resp.json();
                        cursosDataTable = cursos; // salva para filtrar depois
                        renderCursosTable(cursos, instituicoes);
                    }
                    function editarCurso(event, cursoId) {
                        event.stopPropagation();
                        alert("Editar curso ID: " + cursoId);
                    }
                    function excluirCurso(event, cursoId, nome) {
                        event.stopPropagation();
                        if (confirm("Deseja realmente excluir o curso \"" + nome + "\"?")) {
                            alert("Curso excluído (simulação): " + nome + " (ID: " + cursoId + ")");
                        }
                    }
                    function mostrarDetalheCurso(curso, instituicoes, ucs) {
                        const nomeInstituicao = getNomeInstituicao(curso.instituicao_id, instituicoes);
                        document.getElementById('detalheCursoConteudo').innerHTML = `
        <div class="popup-field"><span class="popup-label">ID:</span> ${curso._id}</div>
        <div class="popup-field"><span class="popup-label">Nome:</span> ${curso.nome || ''}</div>
        <div class="popup-field"><span class="popup-label">Tipo:</span> ${curso.tipo || ''}</div>
        <div class="popup-field"><span class="popup-label">Turnos:</span> ${renderTurnos(curso.turnos)}</div>
        <div class="popup-field"><span class="popup-label">Nível do Curso:</span> ${curso.nivel_curso || ''}</div>
        <div class="popup-field"><span class="popup-label">Carga Horária:</span> ${curso.carga_horaria || ''}</div>
        <div class="popup-field"><span class="popup-label">Área:</span> ${curso.area || ''}</div>
        <div class="popup-field"><span class="popup-label">CBO:</span> ${curso.cbo || ''}</div>
        <div class="popup-field"><span class="popup-label">Código Matriz:</span> ${curso.codigo_matriz || ''}</div>
        <div class="popup-field"><span class="popup-label">Eixo Tecnológico:</span> ${curso.eixo_tecnologico || ''}</div>
        <div class="popup-field"><span class="popup-label">Nível Qualificação:</span> ${curso.nivel_qualificacao || ''}</div>
        <div class="popup-field"><span class="popup-label">Instituição:</span> ${nomeInstituicao}</div>
        <div class="popup-field"><span class="popup-label">Unidades Curriculares do Curso:</span></div>
        <div style="max-height:350px;overflow:auto;">${renderUCTable(curso.ordem_ucs)}</div>
    `;
                        document.getElementById('modalDetalheCurso').classList.add('show');
                    }
                    function fecharModalDetalhe() {
                        document.getElementById('modalDetalheCurso').classList.remove('show');
                    }
                    window.onclick = function (e) {
                        if (e.target.classList.contains('modal') && e.target.id === "modalDetalheCurso") fecharModalDetalhe();
                        if (e.target.classList.contains('modal') && e.target.id === "addCursoModal") closeModal('addCursoModal');
                        if (e.target.classList.contains('modal') && e.target.id === "modalUcConfig") closeUcConfigModal();
                    }
                    $(document).ready(function () {
                        $('#turnosSelect').select2({
                            theme: 'bootstrap-5',
                            width: '100%',
                            placeholder: $('#turnosSelect').data('placeholder'),
                            closeOnSelect: false
                        });
                        $('#ucsSelect').select2({
                            theme: 'bootstrap-5',
                            width: '100%',
                            placeholder: 'Selecione as UCs...',
                            closeOnSelect: false
                        });
                        // Filtro dinâmico
                        $('#searchCurso').on('input', function () {
                            const termo = this.value.toLowerCase();
                            const instituicoes = instituicoesCache || [];
                            const cursosFiltrados = cursosDataTable.filter(curso => {
                                return Object.values({
                                    ...curso,
                                    instituicao: getNomeInstituicao(curso.instituicao_id, instituicoes)
                                }).some(val =>
                                    String(val).toLowerCase().includes(termo)
                                );
                            });
                            renderCursosTable(cursosFiltrados, instituicoes);
                        });
                        carregarCursos();
                    });
                    // Salvar curso via AJAX com as UCs completas
                    $('#cursoForm').on('submit', function (e) {
                        e.preventDefault();
                        const selectedUcs = $('#ucsSelect').val() || [];
                        if (selectedUcs.length === 0) {
                            alert('Selecione ao menos uma Unidade Curricular.');
                            return false;
                        }
                        for (let ucId of selectedUcs) {
                            if (!ucConfigs[ucId]) {
                                alert(`Configure todos os dados da UC "${ucDataMap[ucId]}" antes de salvar o curso.`);
                                return false;
                            }
                        }
                        const ordem_ucs = selectedUcs.map(ucId => ucConfigs[ucId]);
                        const turnos = $('#turnosSelect').val() || [];
                        const data = {
                            nome: $('#nomeCurso').val(),
                            codigo_matriz: $('#codigoMatriz').val(),
                            tipo: $('#tipoCurso').val(),
                            nivel_curso: $('#nivelCurso').val(),
                            turnos: turnos,
                            carga_horaria: parseInt($('#cargaHoraria').val(), 10),
                            cbo: $('#cbo').val(),
                            area: $('#area').val(),
                            eixo_tecnologico: $('#eixoTecnologico').val(),
                            nivel_qualificacao: parseInt($('#nivelQualificacao').val(), 10),
                            instituicao_id: $('#instituicaoId').val(),
                            ordem_ucs: ordem_ucs
                        };
                        $.ajax({
                            url: 'processa_curso.php',
                            type: 'POST',
                            data: JSON.stringify(data),
                            contentType: "application/json",
                            success: function (resp) {
                                alert('Curso cadastrado com sucesso!');
                                closeModal('addCursoModal');
                                carregarCursos();
                            },
                            error: function (xhr) {
                                alert('Erro ao salvar curso: ' + (xhr.responseText || ''));
                            }
                        });
                    });
                </script>
</body>

</html>