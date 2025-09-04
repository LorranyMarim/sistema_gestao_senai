// gestao_turmas.js
(() => {
    'use strict';

    // ===== Helpers rápidos =====
    let cursosCache = []; // mantém cursos com 'ordem_ucs' para uso no passo 4
    let instrutoresCache = []; // cache global dos instrutores

    function fmtBR(iso) {
        // "2025-01-05" -> "05/01/2025"
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${y}`;
    }
    function setupUcChainRules() {
        const rows = $$('#ucsContainer [data-uc-row]');
        if (!rows.length) return;

        const turmaStart = $('#dataInicio')?.value || '';
        const turmaEnd = $('#dataFim')?.value || '';

        rows.forEach((row, idx) => {
            const i = row.querySelector('[data-uc-inicio]');
            const f = row.querySelector('[data-uc-fim]');
            if (!i || !f) return;

            if (idx === 0) {
                // 1ª UC: apenas respeita o intervalo da turma (o bindUcDateRules já cuida do Fim >= Início)
                if (turmaStart) i.min = turmaStart;
                if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }
                i.disabled = false; // primeira nunca depende de anterior
                return;
            }

            // Para as demais, dependem do FIM da UC anterior
            const prev = rows[idx - 1];
            const prevF = prev.querySelector('[data-uc-fim]');

            const applyFromPrev = () => {
                const prevDf = (prevF?.value || '').trim();

                if (!prevDf) {
                    // Trava até o FIM anterior ser definido
                    i.value = '';
                    f.value = '';
                    i.disabled = true;
                    f.disabled = true;
                    i.removeAttribute('min'); i.removeAttribute('max');
                    f.removeAttribute('min'); f.removeAttribute('max');
                    clearInvalid(i); clearInvalid(f);
                    return;
                }

                // Libera e define limites: Início >= Fim anterior e dentro do intervalo da turma
                i.disabled = false;
                i.min = prevDf;
                if (turmaStart && i.min < turmaStart) i.min = turmaStart;
                if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }

                // Se o valor atual do início violar o mínimo, corrige
                if (i.value && i.value < i.min) {
                    i.value = i.min;
                }

                // Dispara o "update" já ligado em bindUcDateRules para habilitar/ajustar o FIM
                i.dispatchEvent(new Event('input', { bubbles: true }));
            };

            // Atualiza quando o fim da UC anterior mudar
            on(prevF, 'input', applyFromPrev);
            on(prevF, 'change', applyFromPrev);

            // Estado inicial
            applyFromPrev();
        });
    }


    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
    const getVal = (sel) => $(sel)?.value?.trim() || "";
    const getNum = (sel, def = 0) => {
        const v = Number(getVal(sel));
        return Number.isFinite(v) ? v : def;
    };
    const getOptText = (sel) => {
        const el = $(sel);
        if (!el) return "";
        const idx = el.selectedIndex;
        return idx >= 0 ? (el.options[idx]?.text || "") : "";
    };

    function addInvalid(el, msg) {
        if (!el) return;
        el.classList.add('is-invalid');
        if (msg) el.setAttribute('title', msg);
    }
    function clearInvalid(el) {
        if (!el) return;
        el.classList.remove('is-invalid');
        el.removeAttribute('title');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const modalEl = $('#addTurmaModal');
        if (!modalEl) return;

        const bsModal = (window.bootstrap && bootstrap.Modal)
            ? new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false })
            : null;

        // Abre via JS apenas se o botão NÃO usar data-bs-*
        const addBtn = $('#addTurmaBtn');
        if (addBtn && !addBtn.hasAttribute('data-bs-toggle')) {
            on(addBtn, 'click', () => bsModal && bsModal.show());
        }

        // ===== Stepper =====
        const header = $('#stepperHeader');
        const items = $$('.stepper-item', header);
        const panes = $$('.step-pane');
        const btnNext = $('#btn-next');
        const btnBack = $('#btn-back');
        const summaryArea = $('#summaryArea');

        const total = items.length;
        let current = 1;

        // Barra de progresso via ::after
        const styleEl = document.createElement('style');
        document.head.appendChild(styleEl);
        const setProgressPct = (pct) => { styleEl.textContent = `#progressLine::after{width:${pct}%;}`; };

        function setActive(step) {
            current = Math.min(Math.max(step, 1), total);

            items.forEach((el) => {
                const n = Number(el.dataset.step);
                el.classList.toggle('active', n === current);
                el.classList.toggle('completed', n < current);
                el.setAttribute('aria-current', n === current ? 'step' : 'false');
            });

            panes.forEach((p) => {
                const n = Number(p.dataset.step);
                p.classList.toggle('active', n === current);
                p.setAttribute('aria-hidden', n === current ? 'false' : 'true');
            });

            const pct = ((current - 1) / (total - 1)) * 100;
            setProgressPct(pct);

            btnBack.disabled = current === 1;
            btnNext.textContent = current === total ? 'Concluir' : 'Próximo';

            const firstInput = panes.find(p => Number(p.dataset.step) === current)?.querySelector('input,select,textarea,button');
            firstInput?.focus?.();
        }

        // ===== Validação por etapa =====
        function validateRequiredIn(pane) {
            const required = $$('[required]', pane);
            for (const el of required) {
                const val = (el.value || '').trim();
                if (!val) {
                    addInvalid(el, 'Campo obrigatório');
                    const handler = () => clearInvalid(el);
                    on(el, 'input', handler, { once: true });
                    on(el, 'change', handler, { once: true }); // <— adiciona
                    el.focus?.();
                    return false;
                }

            }
            return true;
        }

        function validateDataRange() {
            const i = $('#dataInicio');
            const f = $('#dataFim');
            if (!i || !f) return true;
            const vi = i.value, vf = f.value;
            if (vi && vf && new Date(vf) < new Date(vi)) {
                addInvalid(f, 'Data de fim não pode ser anterior ao início');
                on(f, 'change', () => clearInvalid(f), { once: true });
                f.focus?.();
                return false;
            }
            return true;
        }

        function validateNumericMin(el, min = 1) {
            if (!el) return true;
            const v = Number(el.value);
            if (!Number.isFinite(v) || v < min) {
                addInvalid(el, `Valor mínimo: ${min}`);
                on(el, 'input', () => clearInvalid(el), { once: true });
                el.focus?.();
                return false;
            }
            return true;
        }

        function validateStep(step) {
            const pane = panes.find(p => Number(p.dataset.step) === step);
            if (!pane) return true;

            if (!validateRequiredIn(pane)) return false;

            switch (step) {
                case 1: {
                    const codigo = $('#codigoTurma');
                    if (codigo) codigo.value = (codigo.value || '').toUpperCase();
                    break;
                }
                case 2: {
                    if (!validateDataRange()) return false;
                    break;
                }
                case 3: {
                    if (!validateNumericMin($('#quantidadeAlunos'), 1)) return false;
                    break;
                }
                case 4: {
                    const rows = $$('#ucsContainer [data-uc-row]');
                    if (!rows.length) {
                        alert('Selecione um curso com UCs no passo 1.');
                        return false;
                    }
                    for (const row of rows) {
                        const i = row.querySelector('[data-uc-inicio]');
                        const f = row.querySelector('[data-uc-fim]');
                        if (!i?.value) { addInvalid(i, 'Obrigatório'); i?.focus?.(); return false; }
                        if (!f?.value) { addInvalid(f, 'Obrigatório'); f?.focus?.(); return false; }
                        if (f.value < i.value) {
                            addInvalid(f, 'Fim não pode ser anterior ao início');
                            f?.focus?.();
                            return false;
                        }
                    }
                    break;
                }
                case 5: {
                    const selects = $$('#ucsInstrutoresContainer select[data-uc-instrutor]');
                    if (!selects.length) {
                        alert('Selecione um curso com UCs no passo 1.');
                        return false;
                    }
                    for (const sel of selects) {
                        if (!sel.value) {
                            addInvalid(sel, 'Selecione um instrutor');
                            sel.focus();
                            return false;
                        }
                    }
                    break;
                }


                default: break;
            }
            return true;
        }

        // ===== Carregar instituições (AGORA no escopo certo) =====
        // ===== Carregar instituições (CORRIGIDO) =====
        async function carregarInstituicoes() {
            const sel = $('#instituicaoTurma');
            if (!sel) return;

            // UX: desabilita e mostra placeholder temporário
            const keep = sel.value;
            sel.disabled = true;
            sel.innerHTML = '<option value="">Carregando...</option>';

            try {
                // Chame a API FastAPI diretamente ou via proxy PHP
                // Ex.: const resp = await fetch('../backend/processa_instituicao.php');
                const resp = await fetch('../backend/processa_instituicao.php');
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();

                // aceita { items:[...] } ou [...]
                const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

                // Monta opções
                sel.innerHTML = '<option value="">Selecione</option>';
                for (const it of items) {
                    const value = it.id || it._id || ""; // suporta id ou _id
                    const label =
                        it.razao_social ||
                        it.nome ||
                        it.nome_fantasia ||
                        it.fantasia ||
                        it.cnpj_razao ||
                        '(sem nome)';

                    if (value) sel.add(new Option(label, value));
                }

                // Restaura seleção anterior se ainda existir
                if (keep && [...sel.options].some(o => o.value === keep)) {
                    sel.value = keep;
                }
            } catch (e) {
                console.error('Erro ao carregar instituições', e);
                sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
            } finally {
                sel.disabled = false;
            }
        }

        // ===== Carregar cursos =====
        // ===== Carregar cursos (com ordenação, dedupe e cancelamento) =====
        async function carregarCursos() {
            const sel = $('#cursoTurma');
            if (!sel) return;

            const keep = sel.value;
            sel.disabled = true;
            sel.innerHTML = '<option value="">Carregando...</option>';

            // AbortController para evitar corrida se o modal fechar
            const ctrl = new AbortController();
            const onHide = () => ctrl.abort();
            $('#addTurmaModal')?.addEventListener('hide.bs.modal', onHide, { once: true });

            try {
                // Use o que fizer sentido no seu deploy:
                const resp = await fetch('../backend/processa_curso.php', { signal: ctrl.signal });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();


                let items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

                // Dedup por id/_id
                const seen = new Set();
                items = items.filter(it => {
                    const id = it.id || it._id;
                    if (!id || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });

                // Ordenar por nome (case-insensitive)
                items.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
                cursosCache = items; // <-- adicione esta linha

                sel.innerHTML = '<option value="">Selecione</option>';
                for (const it of items) {
                    const value = it.id || it._id || '';
                    const label = it.nome || '(sem nome)';
                    if (value) sel.add(new Option(label, value));
                }

                if (keep && [...sel.options].some(o => o.value === keep)) {
                    sel.value = keep;
                }
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Erro ao carregar cursos', e);
                    sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
                }
            } finally {
                sel.disabled = false;
            }
        }

        async function carregarEmpresas() {
            const sel = $('#empresaTurma');
            if (!sel) return;

            // UX: desabilita e mostra placeholder temporário
            const keep = sel.value;
            sel.disabled = true;
            sel.innerHTML = '<option value="">Carregando...</option>';

            try {
                // Chame a API FastAPI diretamente ou via proxy PHP
                // Ex.: const resp = await fetch('../backend/processa_instituicao.php');
                const resp = await fetch('../backend/processa_empresa.php');
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();

                // aceita { items:[...] } ou [...]
                const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

                // Monta opções
                sel.innerHTML = '<option value="">Selecione</option>';
                for (const it of items) {
                    const value = it.id || it._id || ""; // suporta id ou _id
                    const label =
                        it.razao_social ||
                        it.nome ||
                        it.nome_fantasia ||
                        it.fantasia ||
                        it.cnpj_razao ||
                        '(sem nome)';

                    if (value) sel.add(new Option(label, value));
                }

                // Restaura seleção anterior se ainda existir
                if (keep && [...sel.options].some(o => o.value === keep)) {
                    sel.value = keep;
                }
            } catch (e) {
                console.error('Erro ao carregar empresas', e);
                sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
            } finally {
                sel.disabled = false;
            }
        }

        async function carregaCalendarios() {
            const sel = $('#calendarioTurma');
            if (!sel) return;

            // UX: desabilita e mostra placeholder temporário
            const keep = sel.value;
            sel.disabled = true;
            sel.innerHTML = '<option value="">Carregando...</option>';

            try {
                // Chame a API FastAPI diretamente ou via proxy PHP
                // Ex.: const resp = await fetch('../backend/processa_instituicao.php');
                const resp = await fetch('../backend/processa_calendario.php');
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();

                // aceita { items:[...] } ou [...]
                const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

                // Monta opções
                sel.innerHTML = '<option value="">Selecione</option>';
                for (const it of items) {
                    const value = it.id || it._id || ""; // suporta id ou _id
                    const label =
                        it.nome_calendario ||
                        it.nome ||
                        it.descricao ||
                        '(sem nome)';

                    if (value) sel.add(new Option(label, value));
                }

                // Restaura seleção anterior se ainda existir
                if (keep && [...sel.options].some(o => o.value === keep)) {
                    sel.value = keep;
                }
            } catch (e) {
                console.error('Erro ao carregar calendários', e);
                sel.innerHTML = '<option value="">Falha ao carregar. Tente novamente.</option>';
            } finally {
                sel.disabled = false;
            }
        }
        function getCursoById(id) {
            const want = String(id || '');
            return (cursosCache || []).find(c => String(c._id || c.id) === want);
        }
        async function carregarInstrutoresLista() {
            if (instrutoresCache.length) return instrutoresCache; // já carregado

            const resp = await fetch('../backend/processa_instrutor.php');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

            instrutoresCache = items.map(it => ({
                id: it.id || it._id || '',
                nome: it.nome || it.nome_completo || '(sem nome)'
            })).filter(x => x.id);

            return instrutoresCache;
        }

        function popularSelectInstrutores(sel) {
            if (!sel) return;
            const keep = sel.value;
            sel.innerHTML = '<option value="">Selecione</option>';
            instrutoresCache.forEach(it => sel.add(new Option(it.nome, it.id)));
            if (keep && [...sel.options].some(o => o.value === keep)) sel.value = keep;
        }


        function applyTurmaDatesToUc() {
            const tStart = $('#dataInicio')?.value || '';
            const tEnd = $('#dataFim')?.value || '';
            $$('#ucsContainer [data-uc-row]').forEach(row => {
                const i = row.querySelector('[data-uc-inicio]');
                const f = row.querySelector('[data-uc-fim]');
                if (i) { i.min = tStart || ''; i.max = tEnd || ''; }
                if (f && tEnd) f.max = tEnd;
            });
            setupUcChainRules();
        }

        function bindUcDateRules(row) {
            const i = row.querySelector('[data-uc-inicio]');
            const f = row.querySelector('[data-uc-fim]');
            if (!i || !f) return;

            const update = () => {
                const vi = (i.value || '').trim();
                if (!vi) {
                    f.value = '';
                    f.disabled = true;
                    f.removeAttribute('min');
                    clearInvalid(f);
                    return;
                }
                f.disabled = false;
                f.min = vi;
                if (f.value && f.value < vi) {
                    f.value = vi;
                    clearInvalid(f);
                }
                const max = $('#dataFim')?.value;
                if (max) f.max = max;
            };

            on(i, 'input', update);
            on(i, 'change', update);

            // respeita limites da turma (passo 2), se já preenchidos
            const turmaStart = $('#dataInicio')?.value;
            const turmaEnd = $('#dataFim')?.value;
            if (turmaStart) i.min = turmaStart;
            if (turmaEnd) { i.max = turmaEnd; f.max = turmaEnd; }

            update();
            // após update(); acrescente:
            const ucId = row.dataset.ucId;
            const syncPeriod = () => updatePeriodForUc(ucId);
            on(row.querySelector('[data-uc-inicio]'), 'input', syncPeriod);
            on(row.querySelector('[data-uc-inicio]'), 'change', syncPeriod);
            on(row.querySelector('[data-uc-fim]'), 'input', syncPeriod);
            on(row.querySelector('[data-uc-fim]'), 'change', syncPeriod);

        }
        function updatePeriodForUc(ucId) {
            if (!ucId) return;
            const { di, df } = getUcDatesFromStep4(ucId);
            const periodoTxt = (di && df) ? `${fmtBR(di)} - ${fmtBR(df)}` : '—';
            const row5 = $(`#ucsInstrutoresContainer [data-uc-id="${ucId}"]`);
            if (!row5) return;
            const input = row5.querySelector('[data-uc-period]');
            if (input) input.value = periodoTxt;
        }

        function getUcDatesFromStep4(ucId) {
            const row4 = $(`#ucsContainer [data-uc-row][data-uc-id="${ucId}"]`);
            if (!row4) return { di: '', df: '' };
            const di = row4.querySelector('[data-uc-inicio]')?.value || '';
            const df = row4.querySelector('[data-uc-fim]')?.value || '';
            return { di, df };
        }

        function renderUcsParaCurso() {
            const wrap = $('#ucsContainer');
            if (!wrap) {
                console.warn('ucsContainer não encontrado.');
                return;
            }

            const idCurso = getVal('#cursoTurma');
            wrap.innerHTML = '';

            if (!idCurso) {
                wrap.innerHTML = '<div class="text-muted">Selecione um curso no passo 1.</div>';
                return;
            }

            const curso = getCursoById(idCurso);
            if (!curso) {
                wrap.innerHTML = '<div class="text-danger">Curso não encontrado no cache.</div>';
                return;
            }

            const ucs = Array.isArray(curso.ordem_ucs) ? curso.ordem_ucs : [];
            if (!ucs.length) {
                wrap.innerHTML = '<div class="text-muted">Este curso não possui UCs cadastradas.</div>';
                return;
            }

            ucs.forEach((uc, idx) => {
                const row = document.createElement('div');
                row.className = 'row g-3 align-items-end mb-2';
                row.dataset.ucRow = '1';
                row.dataset.ucId = (uc.id || uc._id || uc.id_uc || '');

                row.innerHTML = `
      <div class="col-12 col-md-7 col-lg-8">
        <label class="form-label d-flex align-items-center">
          <span class="badge bg-secondary me-2">${idx + 1}º</span> Unidade Curricular
        </label>
        <div class="form-control uc-name pe-none bg-body-secondary" role="textbox" aria-disabled="true"></div>
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="form-label">Início</label>
        <input type="date" class="form-control" data-uc-inicio required />
      </div>

      <div class="col-6 col-md-2 col-lg-2">
        <label class="form-label">Fim</label>
        <input type="date" class="form-control" data-uc-fim required disabled />
      </div>
    `;

                // ⬇️ Agora o .uc-name EXISTE; podemos preencher
                row.querySelector('.uc-name').textContent =
                    (uc.nome || uc.unidade_curricular || uc.titulo || '(sem nome)');

                wrap.appendChild(row);
                bindUcDateRules(row);
            });

            applyTurmaDatesToUc();
            setupUcChainRules();
        }

        async function renderUcsInstrutores() {
            const wrap = $('#ucsInstrutoresContainer');
            if (!wrap) return;

            wrap.innerHTML = '';

            const idCurso = getVal('#cursoTurma');
            if (!idCurso) {
                wrap.innerHTML = '<div class="text-muted">Selecione um curso no passo 1.</div>';
                return;
            }

            const curso = getCursoById(idCurso);
            const ucs = Array.isArray(curso?.ordem_ucs) ? curso.ordem_ucs : [];
            if (!ucs.length) {
                wrap.innerHTML = '<div class="text-muted">Este curso não possui UCs cadastradas.</div>';
                return;
            }

            // garante lista de instrutores
            try { await carregarInstrutoresLista(); } catch (e) {
                console.error('Erro ao carregar instrutores', e);
            }

            ucs.forEach((uc, idx) => {
                const ucId = (uc.id || uc._id || uc.id_uc || '');
                const nomeUc = (uc.nome || uc.unidade_curricular || uc.titulo || '(sem nome)');
                const { di, df } = getUcDatesFromStep4(ucId);
                const periodoTxt = (di && df) ? `${fmtBR(di)} - ${fmtBR(df)}` : '—';

                const row = document.createElement('div');
                row.className = 'row g-3 align-items-end mb-2';
                row.dataset.ucId = ucId; // ajuda na sincronização

                row.innerHTML = `
      <!-- UC (cinza não-editável) -->
      <div class="col-12 col-lg-6">
        <label class="form-label d-flex align-items-center">
          <span class="badge bg-secondary me-2">${idx + 1}º</span> Unidade Curricular
        </label>
        <div class="form-control uc-name bg-body-secondary text-body-secondary"
             role="textbox" aria-disabled="true">${nomeUc}</div>
      </div>

      <!-- Período (texto único, cinza) -->
      <div class="col-6 col-lg-3">
        <label class="form-label">Período</label>
        <input type="text" class="form-control bg-body-secondary text-body-secondary"
               data-uc-period value="${periodoTxt}" disabled readonly />
      </div>

      <!-- Select de Instrutor -->
      <div class="col-6 col-lg-3">
        <label class="form-label">Instrutor</label>
        <select class="form-select" data-uc-instrutor data-uc-id="${ucId}">
          <option value="">Selecione</option>
        </select>
      </div>
    `;

                wrap.appendChild(row);
                // popular select com cache
                popularSelectInstrutores(row.querySelector('select[data-uc-instrutor]'));
            });
        }


        function aplicarRegraDatas() {
            const i = $('#dataInicio');
            const f = $('#dataFim');
            if (!i || !f) return;

            const update = () => {
                const vi = (i.value || '').trim();

                if (!vi) {
                    // sem início: fim desabilitado e limpo
                    f.value = '';
                    f.disabled = true;
                    f.removeAttribute('min');
                    clearInvalid(f);
                    return;
                }

                // com início: fim habilita e ganha min
                f.disabled = false;
                f.min = vi;

                // se já houver fim selecionado anterior ao início, ajusta para o início
                if (f.value && f.value < vi) {
                    f.value = vi; // garante fim >= início (permite fim == início)
                    clearInvalid(f);
                }
            };

            // estado inicial
            f.disabled = true;
            update();

            // evita listeners duplicados em reaberturas do modal
            if (!i.dataset.boundInicioFim) {
                on(i, 'input', update);
                on(i, 'change', update);
                i.dataset.boundInicioFim = '1';
            }
        }

        // ===== Resumo (usa o TEXTO visível do select) =====
        function buildSummary() {
            if (!summaryArea) return;

            // 1) Infos gerais (como já fazia)
            const data = {
                'Instituição': getOptText('#instituicaoTurma'),
                'Código da Turma': getVal('#codigoTurma'),
                'Curso': getOptText('#cursoTurma'),
                'Empresa/Parceiro': getOptText('#empresaTurma'),
                'Calendário': getOptText('#calendarioTurma'),
                'Data de Início': fmtBR(getVal('#dataInicio')),
                'Data de Fim': fmtBR(getVal('#dataFim')),
                'Turno': getOptText('#turnoTurma') || getVal('#turnoTurma'),
                'Quantidade de Alunos': getVal('#quantidadeAlunos'),
                'Status da Turma': getOptText('#statusTurma') || getVal('#statusTurma'),
            };

            // 2) Monta linhas das UCs a partir do passo 4/5
            const ucRows = [];
            $$('#ucsContainer [data-uc-row]').forEach((row, idx) => {
                const ucId = row.dataset.ucId || '';
                const desc = row.querySelector('.uc-name')?.textContent?.trim() || '(sem nome)';
                const di = row.querySelector('[data-uc-inicio]')?.value || '';
                const df = row.querySelector('[data-uc-fim]')?.value || '';

                // instrutor selecionado no passo 5
                const sel = document.querySelector(`#ucsInstrutoresContainer select[data-uc-id="${ucId}"]`);
                let instrutor = '—';
                if (sel) {
                    const opt = sel.options[sel.selectedIndex];
                    if (opt && opt.value) instrutor = opt.text || '—';
                }

                ucRows.push({
                    ordem: idx + 1,
                    descricao: desc,
                    inicio: di ? fmtBR(di) : '—',
                    fim: df ? fmtBR(df) : '—',
                    instrutor
                });
            });

            // 3) HTML da tabela de resumo
            let html = `
    <div class="alert alert-info mb-3">Confira os dados antes de concluir.</div>
    <div class="table-responsive">
      <table class="table table-sm table-bordered align-middle summary-table">
        <tbody>
  `;

            for (const [k, v] of Object.entries(data)) {
                html += `
      <tr>
        <th class="bg-light">${k}</th>
        <td>${v ? v : '<span class="text-muted">—</span>'}</td>
      </tr>`;
            }

            // 4) Bloco "Unidades Curriculares" como TABELA
            let ucTable = '<span class="text-muted">—</span>';
            if (ucRows.length) {
                ucTable = `
      <div class="table-responsive">
        <table class="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th style="width: 80px;">Ordem</th>
              <th>Descrição</th>
              <th style="width: 120px;">Início</th>
              <th style="width: 120px;">Fim</th>
              <th style="width: 220px;">Instrutor</th>
            </tr>
          </thead>
          <tbody>
            ${ucRows.map(r => `
              <tr>
                <td>${r.ordem}º</td>
                <td>${r.descricao}</td>
                <td>${r.inicio}</td>
                <td>${r.fim}</td>
                <td>${r.instrutor}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
            }

            html += `
      <tr>
        <th class="bg-light">Unidades Curriculares</th>
        <td>${ucTable}</td>
      </tr>
    </tbody></table>
  </div>`;

            summaryArea.innerHTML = html;
        }
        // dentro do seu arquivo gestao_turmas.js


        // no clique de concluir (último passo)
        on(btnNext, 'click', async () => {
            if (current < total) {
                if (!validateStep(current)) return;
                if (current + 1 === total) buildSummary();
                setActive(current + 1);
            } else {
                const payload = buildPayload();
                console.log('[Turma] payload enviado:', payload);

                try {
                    const resp = await fetch('../backend/processa_turma.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const txt = await resp.text();
                    console.log('HTTP', resp.status, 'Body:', txt);

                    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt}`);

                    const data = JSON.parse(txt);
                    console.log('Turma criada:', data);
                    if (bsModal) bsModal.hide();
                    setTimeout(() => alert('Cadastro concluído!'), 120);
                } catch (e) {
                    console.error('Falha ao salvar:', e);
                    alert('Falha ao salvar a turma. Veja o console para detalhes.');
                }
            }
        });



        // ===== Payload final (NOMES que o backend espera) =====
        function buildPayload() {
            return {
                codigo: getVal('#codigoTurma'),
                id_curso: getVal('#cursoTurma'),
                data_inicio: getVal('#dataInicio'),
                data_fim: getVal('#dataFim'),
                turno: getVal('#turnoTurma'),
                num_alunos: getNum('#quantidadeAlunos', 0),
                id_instituicao: getVal('#instituicaoTurma'),
                id_calendario: getVal('#calendarioTurma'),
                id_empresa: getVal('#empresaTurma'),

                // ➜ Envie a string exatamente como quer no banco (“Ativo” | “Inativo”)
                status: getOptText('#statusTurma') || getVal('#statusTurma') || 'Ativo',

                unidades_curriculares: (() => {
                    const instrutorByUc = {};
                    $$('#ucsInstrutoresContainer select[data-uc-instrutor]').forEach(sel => {
                        const ucId = sel.dataset.ucId;
                        if (ucId) instrutorByUc[ucId] = sel.value || '';
                    });

                    const list = [];
                    $$('#ucsContainer [data-uc-row]').forEach(row => {
                        const id_uc = row.dataset.ucId || '';
                        const di = row.querySelector('[data-uc-inicio]')?.value || '';
                        const df = row.querySelector('[data-uc-fim]')?.value || '';
                        if (id_uc) {
                            list.push({
                                id_uc,
                                id_instrutor: instrutorByUc[id_uc] || '',
                                data_inicio: di,
                                data_fim: df
                            });
                        }
                    });
                    return list;
                })()
            };
        }



        on(btnBack, 'click', () => setActive(current - 1));
        on($('#cursoTurma'), 'change', async () => {
            renderUcsParaCurso();
            await carregarInstrutoresLista(); // pre-carrega para não piscar
            renderUcsInstrutores();
        });
        on($('#dataInicio'), 'change', applyTurmaDatesToUc);
        on($('#dataFim'), 'change', applyTurmaDatesToUc);


        // Navegar clicando no cabeçalho
        items.forEach(item => {
            item.style.cursor = 'pointer';
            on(item, 'click', () => {
                const step = Number(item.dataset.step);
                if (step === current) return;
                if (step > current && !validateStep(current)) return;
                if (step === total) buildSummary();
                setActive(step);
            });
        });

        // Enter avança
        panes.forEach(pane => {
            on(pane, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    const tag = (e.target.tagName || '').toLowerCase();
                    if (['select', 'textarea'].includes(tag)) return;
                    e.preventDefault();
                    btnNext.click();
                }
            });
        });

        // Reset + carregar instituições ao abrir
        on(modalEl, 'show.bs.modal', async () => {
            current = 1;
            setActive(1);
            $$('.is-invalid').forEach(clearInvalid);

            aplicarRegraDatas();

            // Carregamentos em paralelo (cada um é async)
            await Promise.all([
                carregarInstituicoes(),
                carregarEmpresas(),
                carregaCalendarios(),
                carregarCursos(),          // precisa antes de renderizar UCs
                carregarInstrutoresLista() // se você usa o passo 5 dinâmico
            ]);

            if (getVal('#cursoTurma')) {
                renderUcsParaCurso();
                renderUcsInstrutores();
            }
        });

        // UX: código da turma em maiúsculas
        const codigoTurma = $('#codigoTurma');
        on(codigoTurma, 'input', () => {
            const pos = codigoTurma.selectionStart;
            codigoTurma.value = (codigoTurma.value || '').toUpperCase();
            try { codigoTurma.setSelectionRange(pos, pos); } catch (_) { }
        });

    }); // DOMContentLoaded
})();
