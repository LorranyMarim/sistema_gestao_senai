(() => {
  'use strict';

  // Verifica dependências globais
  if (typeof App === 'undefined') {
    console.warn('App não definido. Certifique-se de carregar geral_script.js.');
    window.App = { net: { safeFetch: fetch }, dom: { $: document.querySelector.bind(document) } };
  }

  const { safeFetch } = App.net;
  const { $ } = App.dom;

  // Configurações e Estado
  const CONFIG = {
    apiEndpoint: '../backend/processa_ocupacao.php',
    visibleDays: 10,
    daysNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    monthsNames: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    // DEFINIÇÃO DOS LIMITES DE DATA (Ano, Mês (0-11), Dia)
    minDate: new Date(2000, 0, 1), // 01/01/2000
    maxDate: new Date(2036, 0, 1)  // 01/01/2036
  };

  const STATE = {
    instructors: [],
    currentShift: 'Manhã',
    startDate: new Date(),
    searchQuery: ''
  };

  // Normaliza hora para comparação precisa
  STATE.startDate.setHours(0, 0, 0, 0);

  // Elementos do DOM
  const refs = {
    shiftTabs: document.querySelectorAll('.shift-tab'),
    instructorColumn: document.getElementById('instructorColumn'),
    dayHeaderRow: document.getElementById('dayHeaderRow'),
    scheduleGrid: document.getElementById('scheduleGrid'),
    startDateInput: document.getElementById('startDateInput'),
    searchInput: document.getElementById('searchInstructor'),
    btnPrev: document.getElementById('btnPrevDay'),
    btnNext: document.getElementById('btnNextDay'),
    btnToday: document.getElementById('btnToday')
  };

  /**
   * Inicialização
   */
  async function init() {
    setupEventListeners();
    
    // Configura limites no input HTML nativo (formato YYYY-MM-DD)
    if (refs.startDateInput) {
        refs.startDateInput.min = '2000-01-01';
        refs.startDateInput.max = '2036-01-01';
    }

    // Garante que a data inicial esteja dentro dos limites
    validateAndSetDate(STATE.startDate);

    // Carrega dados iniciais
    await loadInstructors();
  }

  function setupEventListeners() {
    // Abas de Turno
    refs.shiftTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        refs.shiftTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        STATE.currentShift = e.currentTarget.dataset.shift;
        loadInstructors();
      });
    });
    // Navegação de Datas
    refs.btnPrev.addEventListener('click', () => changeDate(-1));
    refs.btnNext.addEventListener('click', () => changeDate(1));
    
    refs.btnToday.addEventListener('click', () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      validateAndSetDate(today);
    });

    // Input de Data
    refs.startDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        // Cria data localmente (ano, mes-1, dia)
        const parts = e.target.value.split('-');
        const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        selectedDate.setHours(0,0,0,0);
        
        validateAndSetDate(selectedDate);
      }
    });

    // Busca de Instrutor
    refs.searchInput.addEventListener('input', (e) => {
      STATE.searchQuery = e.target.value.toLowerCase();
      renderTimeline();
    });
  }

  /**
   * Lógica de Dados e Navegação
   */
  function changeDate(days) {
    const newDate = new Date(STATE.startDate);
    newDate.setDate(STATE.startDate.getDate() + days);
    newDate.setHours(0,0,0,0);
    
    validateAndSetDate(newDate);
  }

  function validateAndSetDate(date) {
    // Verifica limites
    if (date < CONFIG.minDate) {
        date = new Date(CONFIG.minDate);
    } else if (date > CONFIG.maxDate) {
        date = new Date(CONFIG.maxDate);
    }

    STATE.startDate = date;
    updateDateInput();
    renderTimeline();
    updateNavigationButtons();
  }

  function updateNavigationButtons() {
    // Opcional: Desabilita botões visualmente se atingir o limite
    // Pode remover se quiser que o botão apenas pare de funcionar sem mudar estilo
    const prevDate = new Date(STATE.startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    const nextDate = new Date(STATE.startDate);
    nextDate.setDate(nextDate.getDate() + 1);

    if (refs.btnPrev) refs.btnPrev.disabled = prevDate < CONFIG.minDate;
    if (refs.btnNext) refs.btnNext.disabled = nextDate > CONFIG.maxDate;
  }

  async function loadInstructors() {
    try {
      const url = `${CONFIG.apiEndpoint}?turno=${encodeURIComponent(STATE.currentShift)}`;
      const data = await safeFetch(url);
      STATE.instructors = Array.isArray(data) ? data : [];
      renderTimeline();
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
      refs.instructorColumn.innerHTML += '<div class="p-4 text-red-500">Erro ao carregar dados.</div>';
    }
  }

  function updateDateInput() {
    // Formata YYYY-MM-DD local
    const year = STATE.startDate.getFullYear();
    const month = String(STATE.startDate.getMonth() + 1).padStart(2, '0');
    const day = String(STATE.startDate.getDate()).padStart(2, '0');
    refs.startDateInput.value = `${year}-${month}-${day}`;
  }

  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 90%)`;
  }
  
  function getAvatarTextColor(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 80%, 30%)`;
  }

  /**
   * Lógica de Renderização
   */
  function renderTimeline() {
    renderInstructors();
    renderDateHeaders();
    renderScheduleGrid();
  }

  function getFilteredInstructors() {
    if (!STATE.searchQuery) return STATE.instructors;
    return STATE.instructors.filter(ins => 
      ins.nome.toLowerCase().includes(STATE.searchQuery) || 
      (ins.area && ins.area.join(' ').toLowerCase().includes(STATE.searchQuery))
    );
  }

  function renderInstructors() {
    const list = getFilteredInstructors();
    let html = '<div class="instructor-header">Instrutores</div>';

    if (list.length === 0) {
      html += '<div class="p-4 text-gray-500 text-sm">Nenhum instrutor encontrado.</div>';
    } else {
      html += list.map(ins => {
        const initials = getInitials(ins.nome);
        const bgColor = getAvatarColor(ins.nome);
        const textColor = getAvatarTextColor(ins.nome);
        const area = (ins.area && ins.area.length > 0) ? ins.area.join(', ') : 'Geral';

        return `
          <div class="instructor-card" title="${ins.nome}">
            <div class="instructor-avatar" style="background: ${bgColor}; color: ${textColor};">${initials}</div>
            <div class="instructor-info">
              <h4>${ins.nome}</h4>
              <span>${area}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    refs.instructorColumn.innerHTML = html;
  }

  function renderDateHeaders() {
    let html = '';
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < CONFIG.visibleDays; i++) {
      const d = new Date(STATE.startDate);
      d.setDate(d.getDate() + i);
      
      const dayName = CONFIG.daysNames[d.getDay()];
      const dayNum = d.getDate();
      const monthName = CONFIG.monthsNames[d.getMonth()];
      
      const isToday = d.getTime() === today.getTime();
      const isSunday = d.getDay() === 0;

      let classes = 'day-header';
      if (isToday) classes += ' today';
      if (isSunday) classes += ' disabled-day';
      
      const isSaturday = d.getDay() === 6;
      let spanStyle = '';
      if (isSaturday || isSunday) spanStyle = 'color: #ef4444;';

      html += `
        <div class="${classes}">
          <span style="${spanStyle}">${dayName}</span>
          <small>${dayNum}/${monthName}</small>
        </div>
      `;
    }
    refs.dayHeaderRow.innerHTML = html;
  }

  function renderScheduleGrid() {
    const list = getFilteredInstructors();
    let html = '';

    list.forEach(ins => {
      html += '<div class="schedule-row">';
      
      for (let i = 0; i < CONFIG.visibleDays; i++) {
        const d = new Date(STATE.startDate);
        d.setDate(d.getDate() + i);
        const isSunday = d.getDay() === 0;

        if (isSunday) {
            html += `<div class="schedule-cell disabled-cell"></div>`;
        } else {
            html += `
            <div class="schedule-cell">
                <div class="event-free"></div>
            </div>`;
        }
      }
      html += '</div>';
    });

    refs.scheduleGrid.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', init);

})();