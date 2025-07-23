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
                    <li><a href="gestao_instrutores.php"><i class="fas fa-chalkboard-teacher"></i> Gestão de
                            Instrutores</a></li>
                    <li><a href="gestao_salas.php"><i class="fas fa-door-open"></i> Gestão de Salas</a></li>
                    <li><a href="gestao_empresas.php"><i class="fas fa-building"></i> Gestão de Empresas</a></li>
                    <li><a href="gestao_unidades_curriculares.php"><i class="fas fa-graduation-cap"></i> Gestão de
                            UCs</a></li>
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
                        <label for="searchCurso">Buscar Curso:</label>
                        <input type="text" id="searchCurso" placeholder="Digite para filtrar..." class="search-input">
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
                                <th>Código Matriz</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
                <!-- Modal de Detalhe do Curso -->
                <div class="modal" id="modalDetalheCurso">
                    <div class="modal-content" style="min-width:400px;max-width:90vw;">
                        <span class="modal-close" onclick="fecharModalDetalhe()">&times;</span>
                        <h2>Detalhes do Curso</h2>
                        <form id="editCursoForm">
                            <div id="detalheCursoConteudo"></div>
                            <div style="text-align:right;margin-top:16px;">
                                <button id="salvarAlteracoesBtn" type="submit" class="btn btn-primary">Salvar
                                    Alterações</button>
                                <button id="excluirCursoBtn" type="button" class="btn btn-danger">Excluir Curso</button>
                            </div>
                        </form>
                    </div>
                </div>
                <!-- Modal de Adicionar Novo Curso -->
                <div id="addCursoModal" class="modal">
                    <div class="modal-content">
                        <span class="close-button" onclick="closeModal('addCursoModal')">×</span>
                        <h2><span id="modalTitle">Adicionar Novo Curso</span></h2>
                        <form id="cursoForm">
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
                            <button type="submit" class="btn btn-primary">Salvar Curso</button>
                            <button type="button" class="btn btn-secondary"
                                onclick="closeModal('addCursoModal')">Cancelar</button>
                        </form>
                    </div>
                </div>
                <!-- Modal UC Config em lote -->
                <div class="modal" id="modalUcsConfig" style="display:none;">
                    <div class="modal-content" style="min-width:420px;max-width:95vw;">
                        <span class="modal-close" onclick="closeModalUcsConfig()">&times;</span>
                        <h3>Configurar Dados das Unidades Curriculares</h3>
                        <div id="ucsAccordion"></div>
                        <div style="text-align:right;margin-top:18px;">
                            <button class="btn btn-primary" id="saveAllUcsBtn">Salvar</button>
                            <button class="btn btn-secondary" onclick="closeModalUcsConfig()">Cancelar</button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.full.min.js"></script>
    <script>
        let instituicoesCache = null;
        let ucsCache = null;
        let cursosDataTable = [];
        let ucDataMap = {};

        // Busca Instituições
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
        function openAddCursoModal() {
            preencherInstituicoes();
            preencherUCs();
            $('#addCursoModal').addClass('show');
        }
        function closeModal(modalId) {
            $('#' + modalId).removeClass('show');
        }
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

<td>${curso.codigo_matriz || ''}</td>

<td>
    <button class="btn btn-icon btn-view" data-id="${curso._id}" title="Visualizar"><i class="far fa-file-alt"></i><button>            
    <button class="btn btn-icon btn-edit" data-id="${curso._id}" title="Editar"><i class="fas fa-edit"></i></button>
    <button class="btn btn-icon btn-delete" data-id="${curso._id}" title="Excluir"><i class="fas fa-trash-alt"></i><button>
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

        // ###### NOVO FLUXO DE CADASTRO COM MODAL UCS CONFIG ######
        let cursoDataTemp = null;

        // SUBSTITUI O ENVIO DIRETO PARA O BACKEND
        $('#cursoForm').on('submit', function (e) {
            e.preventDefault();
            const selectedUcs = $('#ucsSelect').val() || [];
            if (selectedUcs.length === 0) {
                alert('Selecione ao menos uma Unidade Curricular.');
                return false;
            }
            // Monta os dados do curso (exceto as UCs detalhadas)
            cursoDataTemp = {
                nome: $('#nomeCurso').val(),
                codigo_matriz: $('#codigoMatriz').val(),
                tipo: $('#tipoCurso').val(),
                nivel_curso: $('#nivelCurso').val(),
                turnos: $('#turnosSelect').val() || [],
                carga_horaria: parseInt($('#cargaHoraria').val(), 10),
                cbo: $('#cbo').val(),
                area: $('#area').val(),
                eixo_tecnologico: $('#eixoTecnologico').val(),
                nivel_qualificacao: parseInt($('#nivelQualificacao').val(), 10),
                instituicao_id: $('#instituicaoId').val(),
                // ordem_ucs virá depois!
            };
            // Lista das UCs selecionadas, com nome e id
            const ucsSelecionadas = selectedUcs.map(id => ({
                id: id,
                descricao: ucDataMap[id] || id
            }));
            // Fecha o modal de curso e abre o de configuração das UCs
            closeModal('addCursoModal');
            openModalUcsConfig(ucsSelecionadas, cursoDataTemp);
        });

        // MODAL UCS CONFIG - reutilizado
        function openModalUcsConfig(ucsData, cursoData) {
            window._cursoDataToSave = cursoData;
            let html = `<div class="accordion" id="accordionUcModal">`;
            ucsData.forEach((uc, idx) => {
                html += `
        <div class="accordion-item border border-gray-300 rounded mb-2" style="background:#f9f9f9">
            <h2 class="accordion-header" id="heading${uc.id}">
                <button class="accordion-button flex justify-between items-center w-full py-3 px-4 text-left font-medium"
                    type="button"
                    onclick="toggleAccordion('${uc.id}')"
                    style="background: none; border: none; width:100%; outline:none;">
                    <span>${uc.descricao}</span>
                    <i class="fas fa-chevron-down ml-2"></i>
                </button>
            </h2>
            <div id="collapse${uc.id}" class="accordion-collapse" data-ucid="${uc.id}" style="display:${idx === 0 ? 'block' : 'none'};">
                <div class="accordion-body px-4 py-3">
                    <form class="uc-form-config" data-ucid="${uc.id}">
                        <div class="form-group">
                            <label>ID da UC:</label>
                            <input type="text" value="${uc.id}" readonly class="form-control" />
                        </div>
                        <div class="form-group">
                            <label>Nome da UC:</label>
                            <input type="text" value="${uc.descricao}" readonly class="form-control" />
                        </div>
                        <div class="form-group">
                            <label>Carga Horária Total:</label>
                            <input type="number" min="1" class="form-control ch_total" name="carga_horaria_total" required />
                        </div>
                        <div class="form-group">
                            <label>Presencial - CH:</label>
                            <input type="number" min="0" class="form-control presencial_ch" name="presencial_ch" required />
                        </div>
                        <div class="form-group">
                            <label>Presencial - Aulas 45min:</label>
                            <input type="number" min="0" class="form-control presencial_aulas" name="presencial_aulas" required />
                        </div>
                        <div class="form-group">
                            <label>Presencial - Dias Letivos:</label>
                            <input type="number" min="0" class="form-control presencial_dias" name="presencial_dias" required />
                        </div>
                        <div class="form-group">
                            <label>EAD - CH:</label>
                            <input type="number" min="0" class="form-control ead_ch" name="ead_ch" required />
                        </div>
                        <div class="form-group">
                            <label>EAD - Aulas 45min:</label>
                            <input type="number" min="0" class="form-control ead_aulas" name="ead_aulas" required />
                        </div>
                        <div class="form-group">
                            <label>EAD - Dias Letivos:</label>
                            <input type="number" min="0" class="form-control ead_dias" name="ead_dias" required />
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
            });
            html += '</div>';
            document.getElementById('ucsAccordion').innerHTML = html;
            document.getElementById('modalUcsConfig').classList.add('show');
            document.getElementById('modalUcsConfig').style.display = "flex";
        }
        function closeModalUcsConfig() {
            document.getElementById('modalUcsConfig').classList.remove('show');
            document.getElementById('modalUcsConfig').style.display = "none";
            document.getElementById('ucsAccordion').innerHTML = "";
            window._cursoDataToSave = null;
        }
        function toggleAccordion(id) {
            const allCollapses = document.querySelectorAll('.accordion-collapse');
            allCollapses.forEach(el => {
                el.style.display = (el.id === 'collapse' + id)
                    ? (el.style.display === 'block' ? 'none' : 'block')
                    : 'none';
            });
        }
        // Salvar curso com UCs detalhadas (fluxo final!)
        // Salvar curso com UCs detalhadas (fluxo final!)
        document.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'saveAllUcsBtn') {
                let allForms = document.querySelectorAll('.uc-form-config');
                let ucsToSave = [];
                let erro = false;
                allForms.forEach(form => {
                    let id = form.getAttribute('data-ucid');
                    // Lê todos os campos obrigatórios
                    let ch_total = form.querySelector('.ch_total').value;
                    let presencial_ch = form.querySelector('.presencial_ch').value;
                    let presencial_aulas = form.querySelector('.presencial_aulas').value;
                    let presencial_dias = form.querySelector('.presencial_dias').value;
                    let ead_ch = form.querySelector('.ead_ch').value;
                    let ead_aulas = form.querySelector('.ead_aulas').value;
                    let ead_dias = form.querySelector('.ead_dias').value;
                    if (
                        ch_total === "" || presencial_ch === "" || presencial_aulas === "" ||
                        presencial_dias === "" || ead_ch === "" || ead_aulas === "" || ead_dias === ""
                    ) {
                        erro = true;
                    }
                    let values = {
                        id: id,
                        unidade_curricular: form.querySelectorAll('input[readonly]')[1].value,
                        carga_horaria_total: parseInt(ch_total, 10),
                        presencial: {
                            carga_horaria: parseInt(presencial_ch, 10),
                            quantidade_aulas_45min: parseInt(presencial_aulas, 10),
                            dias_letivos: parseInt(presencial_dias, 10)
                        },
                        ead: {
                            carga_horaria: parseInt(ead_ch, 10),
                            quantidade_aulas_45min: parseInt(ead_aulas, 10),
                            dias_letivos: parseInt(ead_dias, 10)
                        }
                    };
                    ucsToSave.push(values);
                });
                if (erro) {
                    alert('Preencha todos os campos obrigatórios de todas as UCs!');
                    return;
                }
                // Envia o curso completo com UCs
                let dataFinal = Object.assign({}, window._cursoDataToSave, { ordem_ucs: ucsToSave });
                fetch('http://localhost:8000/api/cursos', { // <-- ENDPOINT CORRETO!
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataFinal)
                }).then(resp => {
                    if (resp.ok) {
                        alert('Curso cadastrado com sucesso!');
                        closeModalUcsConfig();
                        closeModal('addCursoModal');
                        window.location = 'gestao_cursos.php';
                    } else {
                        resp.text().then(txt => alert('Erro ao salvar curso: ' + txt));
                    }
                }).catch(() => {
                    alert('Erro ao conectar com o servidor.');
                });
            }
        });
        let cursoIdEmEdicao = null;
        let cursoOrdemUcsEmEdicao = null;

        // Atualize esta função para montar o modal em modo edição:
        function mostrarDetalheCurso(curso, instituicoes, ucs) {
            cursoIdEmEdicao = curso._id;
            cursoOrdemUcsEmEdicao = curso.ordem_ucs || [];
            let html = `
        <div class="form-group"><label>Nome:</label>
            <input type="text" id="editNome" value="${curso.nome || ''}" class="form-control" required></div>
        <div class="form-group"><label>Tipo:</label>
            <select id="editTipo" class="form-control">
                <option value="Presencial" ${curso.tipo === 'Presencial' ? 'selected' : ''}>Presencial</option>
                <option value="EAD" ${curso.tipo === 'EAD' ? 'selected' : ''}>EAD</option>
                <option value="Híbrido" ${curso.tipo === 'Híbrido' ? 'selected' : ''}>Híbrido</option>
            </select>
        </div>
        <div class="form-group"><label>Turnos:</label>
            <select id="editTurnos" class="form-control" multiple>
                <option value="Manhã" ${(curso.turnos || []).includes('Manhã') ? 'selected' : ''}>Manhã</option>
                <option value="Tarde" ${(curso.turnos || []).includes('Tarde') ? 'selected' : ''}>Tarde</option>
                <option value="Noite" ${(curso.turnos || []).includes('Noite') ? 'selected' : ''}>Noite</option>
            </select>
        </div>
        <div class="form-group"><label>Carga Horária:</label>
            <input type="number" id="editCargaHoraria" value="${curso.carga_horaria || ''}" class="form-control">
        </div>
      
        <div class="form-group"><label>Código Matriz:</label>
            <input type="text" id="editCodigoMatriz" value="${curso.codigo_matriz || ''}" class="form-control">
        </div>
       
        <div class="form-group"><label>Instituição:</label>
            <select id="editInstituicao" class="form-control">
                ${instituicoes.map(inst => `<option value="${inst._id}" ${curso.instituicao_id == inst._id ? 'selected' : ''}>${inst.razao_social || inst.nome}</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label>Unidades Curriculares:</label>
            <select id="editUcs" class="form-control" multiple>
                ${ucs.map(uc => {
                let selecionada = (cursoOrdemUcsEmEdicao || []).some(selUc => String(selUc.id) === String(uc._id));
                return `<option value="${uc._id}" ${selecionada ? 'selected' : ''}>${uc.descricao}</option>`;
            }).join('')}
            </select>
        </div>
        <div id="editUCsExtra"></div>
    `;
            document.getElementById('detalheCursoConteudo').innerHTML = html;
            document.getElementById('modalDetalheCurso').classList.add('show');
            // Limpa e aplica select2 só uma vez para evitar bug!
            if ($.fn.select2) {
                $('#editTurnos').select2({ theme: 'bootstrap-5', width: '100%', closeOnSelect: false, dropdownParent: $('#modalDetalheCurso') });
                $('#editUcs').select2({ theme: 'bootstrap-5', width: '100%', closeOnSelect: false, dropdownParent: $('#modalDetalheCurso') });
            }
        }


        document.getElementById('editCursoForm').onsubmit = function (e) {
            e.preventDefault();
            let ucsSelecionadas = $('#editUcs').val() || [];
            let ordem_ucs = (cursoOrdemUcsEmEdicao || []).filter(uc => ucsSelecionadas.includes(String(uc.id)));
            // Adiciona novas UCs sem detalhes, se houver
            ucsSelecionadas.forEach(id => {
                if (!ordem_ucs.some(uc => String(uc.id) === String(id))) {
                    let nome = $('#editUcs option[value="' + id + '"]').text();
                    ordem_ucs.push({
                        id,
                        unidade_curricular: nome,
                        carga_horaria_total: null, presencial: {}, ead: {}
                    });
                }
            });
            let dataEditada = {
                nome: $('#editNome').val(),
                tipo: $('#editTipo').val(),
                turnos: $('#editTurnos').val() || [],
                carga_horaria: parseInt($('#editCargaHoraria').val(), 10),
                area: $('#editArea').val(),
                cbo: $('#editCbo').val(),
                codigo_matriz: $('#editCodigoMatriz').val(),
                eixo_tecnologico: $('#editEixoTec').val(),
                nivel_qualificacao: parseInt($('#editNivelQualificacao').val(), 10),
                instituicao_id: $('#editInstituicao').val(),
                ordem_ucs: ordem_ucs
            };
            fetch(`http://localhost:8000/api/cursos/${cursoIdEmEdicao}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataEditada)
            }).then(resp => {
                if (resp.ok) {
                    alert('Curso atualizado com sucesso!');
                    fecharModalDetalhe();
                    carregarCursos();
                } else {
                    resp.text().then(txt => alert('Erro ao atualizar curso: ' + txt));
                }
            });
        };


        // Excluir curso
        document.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'excluirCursoBtn') {
                if (!confirm("Deseja realmente excluir este curso?")) return;
                fetch(`http://localhost:8000/api/cursos/${cursoIdEmEdicao}`, {
                    method: 'DELETE'
                }).then(resp => {
                    if (resp.ok) {
                        alert('Curso excluído com sucesso!');
                        fecharModalDetalhe();
                        carregarCursos();
                    } else {
                        resp.text().then(txt => alert('Erro ao excluir curso: ' + txt));
                    }
                });
            }
        });


    </script>
</body>

</html>