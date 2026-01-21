(() => {
  'use strict';

  const API_URL = '../backend/processa_instrutor.php';
  const API_UCS = '../backend/processa_ucs.php'; 

  let currentState = {
    page: 1,
    pageSize: 10,
    filters: {},
    total: 0
  };

  let ucsMap = {}; 

  const tableBody = document.getElementById('cursoTableBody');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  const pagElements = {
      prev: document.getElementById('prevPage'),
      next: document.getElementById('nextPage'),
      info: document.getElementById('pageInfo'),
      sizeSel: document.getElementById('gen_pagesize') 
  };
  
  const modal = document.getElementById('instructorModal');
  const form = document.getElementById('cursoForm');
  const modalTitle = document.getElementById('modalTitleCurso');
  const alertBox = document.getElementById('alertCurso');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const viewModal = document.getElementById('visualizarCursoModal');
  const closeViewBtn = document.getElementById('closeVisualizarBtn');
  const closeViewBtnFooter = document.getElementById('fecharVisualizarBtn');

function init() {
    setupFilters();
    setupModals();
    setupAsyncCompetencias();

    App.pagination.bindControls(pagElements, (action) => {
        if (action === 'prev' && currentState.page > 1) {
            currentState.page--;
            fetchData(); 
        }
        if (action === 'next') {
            const totalPages = Math.ceil(currentState.total / currentState.pageSize) || 1;
            if (currentState.page < totalPages) {
                currentState.page++;
                fetchData();
            }
        }
        if (action === 'size' && arguments[1]) {
             currentState.pageSize = arguments[1];
             currentState.page = 1;
             fetchData();
        }
    });

    fetchData(); 
  }


  function setupFilters() {
    App.filters.render('filter_area', {
      search: true,
      status: true,
      cargaHoraria: true,
      categoria: true,
      tipoContrato: true,
      area: true, 
      turno: true, 
      competencia: true, 
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
      busca: getVal('gen_search'), 
  status: getVal('gen_status') !== 'Todos' ? [getVal('gen_status')] : null,
      carga_horaria: getVal('gen_carga_horaria'),
      categoria: getVal('gen_categoria'),
      tipo_contrato: getVal('gen_tipo_contrato'),
      area: getJsonVal('gen_area-hidden'),
      turno: getJsonVal('gen_turno-hidden'),
      competencia: getJsonVal('gen_competencia-hidden')
    };

    ['carga_horaria', 'categoria', 'tipo_contrato'].forEach(k => {
        if (currentState.filters[k] === 'Todos') delete currentState.filters[k];
    });

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


  function setupAsyncCompetencias() {
    const fetchCompetencias = async (page, pageSize, term) => {
        const params = new URLSearchParams({
            page: page,
            page_size: pageSize,
            status: 'Ativo',
            busca: term || '' 
        });
        
        const res = await App.net.fetchJSON(`${API_UCS}?${params.toString()}`);

        (res.items || []).forEach(uc => {
             ucsMap[uc._id] = uc.descricao;
        });

        return (res.items || []).map(uc => ({
            value: uc._id,
            label: uc.descricao
        }));
    };

    const msFiltroEl = document.getElementById('gen_competencia');
    if (msFiltroEl && msFiltroEl._msInstance) {
        msFiltroEl._msInstance.setupAsync(fetchCompetencias);
    }

    const msModalEl = document.getElementById('ms-competencia-modal');
    if (msModalEl && msModalEl._msInstance) {
        msModalEl._msInstance.setupAsync(fetchCompetencias);
    }
  }

  async function fetchData() {
    App.loader.show();
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Carregando...</td></tr>';

    try {

      const query = new URLSearchParams();
      query.set('page', currentState.page);
      query.set('page_size', currentState.pageSize);

      const res = await App.net.fetchJSON(`${API_URL}?${query.toString()}`);
      
      renderTable(res.items || []);

      currentState.total = res.total || 0;
      const totalPages = Math.ceil(currentState.total / currentState.pageSize) || 1;

      const meta = {
          page: currentState.page,
          pageSize: currentState.pageSize,
          total: currentState.total,
          totalPages: totalPages
      };

      App.pagination.updateUI(pagElements, meta);

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
      tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhum curso encontrado.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      
      const statusClass = item.status === 'Ativo' ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
      
      const areas = Array.isArray(item.area) ? item.area : [];
      const areaHtml = areas.map(a => `<span class="badge bg-light text-dark border me-1" style="font-size:0.8em; padding:2px 5px; border-radius:4px;">${a}</span>`).join('');

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
      
      tr.querySelector('.btn-view').addEventListener('click', () => openViewModal(item));
      tr.querySelector('.btn-edit').addEventListener('click', () => openModal(item));
      tr.querySelector('.btn-delete').addEventListener('click', () => deleteInstructor(item));

      tableBody.appendChild(tr);
    });
  }

  function setupModals() {
    document.getElementById('addInstructorBtn').addEventListener('click', () => openModal());

    [closeModalBtn, cancelBtn].forEach(el => el.addEventListener('click', () => {
        App.ui.hideModal(modal);
    }));

    [closeViewBtn, closeViewBtnFooter].forEach(el => el.addEventListener('click', () => {
        App.ui.hideModal(viewModal);
    }));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const turnoInput = document.getElementById('turnoInstructor');
        let turnos = [];
        try { turnos = JSON.parse(turnoInput.value); } catch {}
        
        if (!turnos || turnos.length === 0 || turnos.length > 2) {
    if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Selecione no mínimo 1 e no máximo 2 turnos.';
    } else {
        alert('Selecione no mínimo 1 e no máximo 2 turnos.');
    }
    return;
}

        const id = document.getElementById('cursoId').value;
        const payload = {
            nome: document.getElementById('nomeCurso').value,
            matricula: document.getElementById('matriculaInstructor').value,
            categoria: document.getElementById('modalidadecurso').value,
            tipo_contrato: document.getElementById('tipoCurso').value,
            carga_horaria: parseInt(document.getElementById('cargaHorariaInstructor').value),
            status: document.getElementById('statusCurso').value,
            turno: turnos,
            area: JSON.parse(document.getElementById('areaCurso').value || '[]'),
            mapa_competencias: JSON.parse(document.getElementById('competenciasCurso').value || '[]')
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
    
    resetMultiselect('ms-turno-modal');
    resetMultiselect('ms-area-modal');
    resetMultiselect('ms-competencia-modal');

    if (item) {
        modalTitle.textContent = 'Editar Instrutor';
        document.getElementById('cursoId').value = item._id;
        document.getElementById('nomeCurso').value = item.nome;
        document.getElementById('matriculaInstructor').value = item.matricula;
        document.getElementById('modalidadecurso').value = item.categoria;
        document.getElementById('tipoCurso').value = item.tipo_contrato;
        document.getElementById('cargaHorariaInstructor').value = item.carga_horaria;
        document.getElementById('statusCurso').value = item.status;
        document.getElementById('statusCurso').disabled = false; 

        setMultiselectValue('ms-turno-modal', item.turno);
        setMultiselectValue('ms-area-modal', item.area);
        setMultiselectValue('ms-competencia-modal', item.mapa_competencias || []);

    } else {
        modalTitle.textContent = 'Adicionar Novo Instrutor';
        document.getElementById('cursoId').value = '';
        document.getElementById('statusCurso').value = 'Ativo';
        document.getElementById('statusCurso').disabled = true; 
    }

    App.ui.showModal(modal);
  }

  function openViewModal(item) {
      document.getElementById('viewnomeCurso').value = item.nome;
      document.getElementById('viewMatriculaCurso').value = item.matricula;
      document.getElementById('viewmodalidadecurso').value = item.categoria;
      
      const areas = Array.isArray(item.area) ? item.area.join(', ') : item.area;
      document.getElementById('viewareaCurso').value = areas;
      
      document.getElementById('viewtipoCurso').value = item.tipo_contrato;
      document.getElementById('viewCargaHorariaInstructor').value = item.carga_horaria ? item.carga_horaria + 'h' : '-';
      
      const turnos = Array.isArray(item.turno) ? item.turno.join(', ') : item.turno;
      document.getElementById('viewObsCurso').value = turnos;
      
      document.getElementById('viewstatusCurso').value = item.status;

      const compContainer = document.getElementById('viewCompetenciasContainer');
      const compList = document.getElementById('viewCompetenciasList');
      compList.innerHTML = '';

      if (item.status === 'Ativo' && item.mapa_competencias && item.mapa_competencias.length > 0) {
          compContainer.style.display = 'block';
          item.mapa_competencias.forEach(compId => { 
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
      alert("O instrutor não pode ser removido. Apenas mude o status do instrutor para Inativo para que ele não aparece mais como uma opção");
  }

  function resetMultiselect(wrapperId) {
      const wrapper = document.getElementById(wrapperId);
      if(!wrapper) return;
      const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      
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