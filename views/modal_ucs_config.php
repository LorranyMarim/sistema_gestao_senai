<!-- modal_ucs_config.php -->
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
<script>
function openModalUcsConfig(ucsData, cursoData) {
    window._cursoDataToSave = cursoData; // mantém dados do curso principal
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
            <div id="collapse${uc.id}" class="accordion-collapse" data-ucid="${uc.id}" style="display:${idx===0?'block':'none'};">
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
        el.style.display = (el.id === 'collapse'+id) 
            ? (el.style.display === 'block' ? 'none' : 'block')
            : 'none';
    });
}
// Event delegation para botão Salvar
document.addEventListener('click', function(e) {
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
        let dataFinal = Object.assign({}, window._cursoDataToSave, {ordem_ucs: ucsToSave});
        fetch('processa_curso.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
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
</script>
