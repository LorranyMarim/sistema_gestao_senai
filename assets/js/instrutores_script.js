(() => {
  'use strict';

  const API_URL = '../backend/processa_instrutor.php';
  const API_UCS = '../backend/processa_ucs.php'; // Para carregar UCs nos selects

  // State
  let currentState = {
    page: 1,
    pageSize: 10,
    filters: {},
    total: 0
  };

  // Cache para mapear UCs (ID -> Nome) para exibição
  let ucsMap = {}; 

  // DOM Elements
  const tableBody = document.getElementById('instructorTableBody');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  // Modal Elements
  const modal = document.getElementById('instructorModal');
  const form = document.getElementById('instructorForm');
  const modalTitle = document.getElementById('modalTitleInstructor');
  const alertBox = document.getElementById('alertInstructor');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // View Modal Elements
  const viewModal = document.getElementById('visualizarInstructorModal');
  const closeViewBtn = document.getElementById('closeVisualizarBtn');
  const closeViewBtnFooter = document.getElementById('fecharVisualizarBtn');

  // Init
  function init() {
    setupFilters();
    setupPagination();
    setupModals();
    setupModalDropdowns();
    loadCompetenciasAndInit(); // Carrega UCs primeiro, depois busca dados
  }
  // --- Fix MultiSelects in Modal ---
  function setupModalDropdowns() {
    // Seleciona todos os controles de multiselect dentro do modal
    const multiselects = document.querySelectorAll('.modal .ms__control');

    multiselects.forEach(control => {
        // Remove listeners antigos para evitar duplicação (boa prática)
        const newControl = control.cloneNode(true);
        control.parentNode.replaceChild(newControl, control);

        newControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Fecha outros dropdowns abertos primeiro (UX behavior)
            document.querySelectorAll('.ms__control.ms--open').forEach(other => {
                if (other !== newControl) other.classList.remove('ms--open');
            });

            // Alterna o estado do atual
            newControl.classList.toggle('ms--open');
        });
    });

    // Fecha o dropdown se clicar fora dele
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ms')) {
            document.querySelectorAll('.ms__control.ms--open').forEach(el => {
                el.classList.remove('ms--open');
            });
        }
    });
  }

  // --- Filters ---
  function setupFilters() {
    App.filters.render('filter_area', {
      search: true,
      status: true, // "Todos", "Ativo", "Inativo"
      cargaHoraria: true,
      categoria: true,
      tipoContrato: true,
      area: true, // Multiselect
      turno: true, // Multiselect
      competencia: true, // Multiselect (será populado depois)
      pageSize: true
    }, null, onFilterChange, onFilterClear);
  }

  function onFilterChange() {
    const getVal = (id) => document.getElementById(id)?.value;
    const getJsonVal = (id) => {
        const val = document.getElementById(id)?.value;
        try { return val ? JSON.parse(val) : []; } catch { return []; }
    };

    currentState.filters = {
      busca: getVal('gen_search'), // Agora enviamos explicitamente como 'busca'
  status: getVal('gen_status') !== 'Todos' ? [getVal('gen_status')] : null,
      carga_horaria: getVal('gen_carga_horaria'),
      categoria: getVal('gen_categoria'),
      tipo_contrato: getVal('gen_tipo_contrato'),
      area: getJsonVal('gen_area-hidden'),
      turno: getJsonVal('gen_turno-hidden'),
      competencia: getJsonVal('gen_competencia-hidden')
    };

    // Remove 'Todos' from selects
    ['carga_horaria', 'categoria', 'tipo_contrato'].forEach(k => {
        if (currentState.filters[k] === 'Todos') delete currentState.filters[k];
    });

    // Se arrays vazios, remover do filtro para não enviar "[]"
    ['area', 'turno', 'competencia'].forEach(k => {
        if (Array.isArray(currentState.filters[k]) && currentState.filters[k].length === 0) {
            delete currentState.filters[k];
        }
    });

    currentState.pageSize = parseInt(getVal('gen_pagesize') || 10);
    currentState.page = 1;
    fetchData();
  }

  function onFilterClear() {
    currentState.filters = {};
    currentState.page = 1;
    fetchData();
  }

  // --- Data Loading ---
  async function loadCompetenciasAndInit() {
    try {
        // Carrega UCs para popular multiselects de filtro e modal
        // page_size=300 conforme requisito
        const res = await App.net.fetchJSON(`${API_UCS}?status=Ativo&page_size=300`);
        const ucs = res.items || [];

        // Popula Mapa global
        ucs.forEach(uc => {
            ucsMap[uc._id] = uc.descricao;
        });
        
        // Popula Filtro "Por Competência"
        populateMultiselectOptions('gen_competencia', ucs.map(uc => ({ value: uc._id, label: uc.descricao })));

        // Popula Modal "Mapa de Competências"
        populateMultiselectOptions('ms-competencia-modal', ucs.map(uc => ({ value: uc._id, label: uc.descricao })));

        // Inicializa comportamento do multiselect (re-bind events for new options)
        App.ui.initMultiSelects();

        // Agora busca dados da tabela
        fetchData();

    } catch (err) {
        console.error("Erro ao carregar UCs:", err);
        fetchData(); // Tenta buscar dados mesmo sem UCs
    }
  }

  function populateMultiselectOptions(wrapperId, options) {
      const wrapper = document.getElementById(wrapperId);
      if(!wrapper) return;
      const ul = wrapper.querySelector('.ms__options');
      if(!ul) return;
      
      ul.innerHTML = '';
      options.sort((a,b) => a.label.localeCompare(b.label)).forEach(opt => {
          const li = document.createElement('li');
          li.className = 'ms__option';
          li.innerHTML = `
            <label>
                <input type="checkbox" value="${opt.value}" />
                ${opt.label}
            </label>
          `;
          ul.appendChild(li);
      });
  }

  async function fetchData() {
    App.loader.show();
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Carregando...</td></tr>';

    try {
      const query = new URLSearchParams();
      query.set('page', currentState.page);
      query.set('page_size', currentState.pageSize);
      
      Object.entries(currentState.filters).forEach(([k, v]) => {
        if (v != null && v !== '') {
            if(Array.isArray(v)) {
                v.forEach(val => query.append(k, val));
            } else {
                query.set(k, v);
            }
        }
      });

      const res = await App.net.fetchJSON(`${API_URL}?${query.toString()}`);
      renderTable(res.items || []);
      updatePagination(res);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    } finally {
      App.loader.hide();
    }
  }

  function renderTable(items) {
    tableBody.innerHTML = '';
    if (!items.length) {
      tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhum instrutor encontrado.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      
      // Status formatting
      const statusClass = item.status === 'Ativo' ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
      
      // Area Tags
      const areas = Array.isArray(item.area) ? item.area : [];
      const areaHtml = areas.map(a => `<span class="badge bg-light text-dark border me-1" style="font-size:0.8em; padding:2px 5px; border-radius:4px;">${a}</span>`).join('');

      // Turno formatting
      const turnos = Array.isArray(item.turno) ? item.turno.join(', ') : item.turno;

      tr.innerHTML = `
        <td>${item.nome || '-'}</td>
        <td>${item.matricula || '-'}</td>
        <td>${item.categoria || '-'}</td>
        <td>${areaHtml || '-'}</td>
        <td>${item.tipo_contrato || '-'}</td>
        <td>${turnos || '-'}</td>
        <td class="${statusClass}">${item.status}</td>
        <td>${App.format.fmtDateBR(item.data_criacao)}</td>
        <td class="actions">
            <button class="btn btn-icon btn-view" title="Visualizar" data-id="${item._id}"><i class="fas fa-eye"></i></button>
            <button class="btn btn-icon btn-edit" title="Editar" data-id="${item._id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" title="Excluir" data-id="${item._id}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      
      // Bind actions
      tr.querySelector('.btn-view').addEventListener('click', () => openViewModal(item));
      tr.querySelector('.btn-edit').addEventListener('click', () => openModal(item));
      tr.querySelector('.btn-delete').addEventListener('click', () => deleteInstructor(item));

      tableBody.appendChild(tr);
    });
  }

  // --- Pagination ---
  function setupPagination() {
    App.pagination.bindControls({ prev: prevBtn, next: nextBtn }, (action) => {
      if (action === 'prev' && currentState.page > 1) currentState.page--;
      if (action === 'next') currentState.page++;
      fetchData();
    });
  }

  function updatePagination(meta) {
    currentState.total = meta.total;
    const totalPages = Math.ceil(meta.total / currentState.pageSize) || 1;
    pageInfo.textContent = `Página ${currentState.page} de ${totalPages} • ${meta.total} registros`;
    
    prevBtn.disabled = currentState.page <= 1;
    nextBtn.disabled = currentState.page >= totalPages;
  }

  // --- Modals Logic ---
  function setupModals() {
    // Open Add
    document.getElementById('addInstructorBtn').addEventListener('click', () => openModal());

    // Close Add/Edit
    [closeModalBtn, cancelBtn].forEach(el => el.addEventListener('click', () => {
        App.ui.hideModal(modal);
    }));

    // Close View
    [closeViewBtn, closeViewBtnFooter].forEach(el => el.addEventListener('click', () => {
        App.ui.hideModal(viewModal);
    }));

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validação customizada de Turno (1 ou 2)
        const turnoInput = document.getElementById('turnoInstructor');
        let turnos = [];
        try { turnos = JSON.parse(turnoInput.value); } catch {}
        
        if (!turnos || turnos.length === 0 || turnos.length > 2) {
    if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Selecione no mínimo 1 e no máximo 2 turnos.';
    } else {
        // Fallback caso o elemento HTML tenha sido removido acidentalmente
        alert('Selecione no mínimo 1 e no máximo 2 turnos.');
    }
    return;
}

        const id = document.getElementById('instructorId').value;
        const payload = {
            nome: document.getElementById('nomeInstructor').value,
            matricula: document.getElementById('matriculaInstructor').value,
            categoria: document.getElementById('categoriaInstructor').value,
            tipo_contrato: document.getElementById('tipoContratoInstructor').value,
            carga_horaria: parseInt(document.getElementById('cargaHorariaInstructor').value),
            status: document.getElementById('statusInstructor').value,
            turno: turnos,
            area: JSON.parse(document.getElementById('areaInstructor').value || '[]'),
            mapa_competencias: JSON.parse(document.getElementById('competenciasInstructor').value || '[]')
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}?id=${id}` : API_URL;

        try {
            App.loader.show();
            await App.net.fetchJSON(url, {
                method,
                body: JSON.stringify(payload)
            });
            App.ui.hideModal(modal);
            fetchData();
        } catch (err) {
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = err.message || 'Erro ao salvar instrutor.';
        } finally {
            App.loader.hide();
        }
    });
  }

  function openModal(item = null) {
    form.reset();
    if (alertBox) {
        alertBox.style.display = 'none';
    }
    
    // Reset Multiselects UI
    resetMultiselect('ms-turno-modal');
    resetMultiselect('ms-area-modal');
    resetMultiselect('ms-competencia-modal');

    if (item) {
        modalTitle.textContent = 'Editar Instrutor';
        document.getElementById('instructorId').value = item._id;
        document.getElementById('nomeInstructor').value = item.nome;
        document.getElementById('matriculaInstructor').value = item.matricula;
        document.getElementById('categoriaInstructor').value = item.categoria;
        document.getElementById('tipoContratoInstructor').value = item.tipo_contrato;
        document.getElementById('cargaHorariaInstructor').value = item.carga_horaria;
        document.getElementById('statusInstructor').value = item.status;
        document.getElementById('statusInstructor').disabled = false; // Pode editar status

        // Set Multiselects
        setMultiselectValue('ms-turno-modal', item.turno);
        setMultiselectValue('ms-area-modal', item.area);
        setMultiselectValue('ms-competencia-modal', item.mapa_competencias || []);

    } else {
        modalTitle.textContent = 'Adicionar Novo Instrutor';
        document.getElementById('instructorId').value = '';
        document.getElementById('statusInstructor').value = 'Ativo';
        document.getElementById('statusInstructor').disabled = true; // Disabled no cadastro
    }

    App.ui.showModal(modal);
  }

  function openViewModal(item) {
      document.getElementById('viewNomeInstructor').value = item.nome;
      document.getElementById('viewMatriculaInstructor').value = item.matricula;
      document.getElementById('viewCategoriaInstructor').value = item.categoria;
      
      const areas = Array.isArray(item.area) ? item.area.join(', ') : item.area;
      document.getElementById('viewAreaInstructor').value = areas;
      
      document.getElementById('viewTipoContratoInstructor').value = item.tipo_contrato;
      document.getElementById('viewCargaHorariaInstructor').value = item.carga_horaria ? item.carga_horaria + 'h' : '-';
      
      const turnos = Array.isArray(item.turno) ? item.turno.join(', ') : item.turno;
      document.getElementById('viewTurnoInstructor').value = turnos;
      
      document.getElementById('viewStatusInstructor').value = item.status;

      // Mapa de Competencias
      const compContainer = document.getElementById('viewCompetenciasContainer');
      const compList = document.getElementById('viewCompetenciasList');
      compList.innerHTML = '';

      if (item.status === 'Ativo' && item.mapa_competencias && item.mapa_competencias.length > 0) {
          compContainer.style.display = 'block';
          item.mapa_competencias.forEach(compId => { // Use item.mapa_competencias
              const li = document.createElement('li');
              li.textContent = ucsMap[compId] || 'UC não encontrada (ID: ' + compId + ')';
              compList.appendChild(li);
          });
      } else {
          compContainer.style.display = 'none';
      }
      
      App.ui.showModal(viewModal);
  }

  function deleteInstructor(item) {
      // Regra de bloqueio de exclusão conforme requisito
      alert("O instrutor não pode ser removido. Apenas mude o status do instrutor para Inativo para que ele não aparece mais como uma opção");
  }

  // --- Multiselect Helpers for Modal ---
  function resetMultiselect(wrapperId) {
      const wrapper = document.getElementById(wrapperId);
      if(!wrapper) return;
      const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      
      // Dispara evento para sincronizar UI (assumindo que o componente ouve change)
      // Ou, se o componente não expor método publico facil, recriamos ou forçamos update
      // O componente MultiSelect em geral_script.js ouve 'change' nos checkboxes.
      checkboxes.forEach(cb => cb.dispatchEvent(new Event('change')));
  }

  function setMultiselectValue(wrapperId, values) {
      if(!Array.isArray(values)) return;
      const wrapper = document.getElementById(wrapperId);
      if(!wrapper) return;
      
      const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
          if (values.includes(cb.value)) {
              cb.checked = true;
          } else {
              cb.checked = false;
          }
          cb.dispatchEvent(new Event('change'));
      });
  }

  init();
})();