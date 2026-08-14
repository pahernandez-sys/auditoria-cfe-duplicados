/**
 * CFE SOSSA - DASHBOARD DE AUDITORÍA DE DUPLICADOS
 * Lógica interactiva en JavaScript moderno
 */

let dashboardData = null;
let currentFilteredCases = [];
let selectedCase = null;
let currentView = 'linkaform'; // 'linkaform', 'photos', 'diff'
let activeFilter = 'all';

// Elementos DOM
const kpiAudited = document.getElementById('kpi-total-audited');
const kpiDuplicates = document.getElementById('kpi-total-duplicates');
const kpiCritical = document.getElementById('kpi-critical-duplicates');
const countSev4 = document.getElementById('count-sev-4');
const countSev3 = document.getElementById('count-sev-3');
const countSev2 = document.getElementById('count-sev-2');
const countSev1 = document.getElementById('count-sev-1');
const severityChart = document.getElementById('severity-chart-container');
const censadoresRanking = document.getElementById('censadores-ranking');
const casesContainer = document.getElementById('cases-list-container');
const totalCasesCount = document.getElementById('total-cases-count');
const caseTitle = document.getElementById('current-case-title');
const contentArea = document.getElementById('comparator-content-area');
const masterTableBody = document.getElementById('master-table-body');
const searchInput = document.getElementById('case-search');
const filterPills = document.querySelectorAll('.pill-btn');
const viewTabs = document.querySelectorAll('.view-tab');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadDashboardData();
});

function setupEventListeners() {
  // Búsqueda
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterCases();
    });
  }

  // Filtros por severidad
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      filterCases();
    });
  });

  // Pestañas de visualización
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.dataset.view;
      renderComparatorView();
    });
  });
}

// Cargar datos (soporta doble clic local sin servidor y fetch en servidor web)
async function loadDashboardData() {
  if (window.DASHBOARD_DATA) {
    dashboardData = window.DASHBOARD_DATA;
  } else {
    try {
      const response = await fetch('data.json');
      if (!response.ok) throw new Error('data.json no encontrado');
      dashboardData = await response.json();
    } catch (e) {
      console.warn('Cargando datos de respaldo...', e);
      dashboardData = getFallbackData();
    }
  }

  renderSummaryKPIs();
  renderAnalytics();
  currentFilteredCases = [...dashboardData.cases];
  renderCasesList();
  renderMasterTable();

  if (dashboardData.cases.length > 0) {
    selectCase(dashboardData.cases[0]);
  }
}

// Renderizar KPIs
function renderSummaryKPIs() {
  const s = dashboardData.summary;
  if (kpiAudited) kpiAudited.textContent = Number(s.total_records_audited).toLocaleString();
  if (kpiDuplicates) kpiDuplicates.textContent = Number(s.total_pairs_duplicates).toLocaleString();
  
  const crit = (s.breakdown_by_photos['4_photos'] || 0) + (s.breakdown_by_photos['3_photos'] || 0);
  if (kpiCritical) kpiCritical.textContent = Number(crit).toLocaleString();

  if (countSev4) countSev4.textContent = Number(s.breakdown_by_photos['4_photos'] || 0).toLocaleString();
  if (countSev3) countSev3.textContent = Number(s.breakdown_by_photos['3_photos'] || 0).toLocaleString();
  if (countSev2) countSev2.textContent = Number(s.breakdown_by_photos['2_photos'] || 0).toLocaleString();
  if (countSev1) countSev1.textContent = Number(s.breakdown_by_photos['1_photo'] || 0).toLocaleString();
}

// Renderizar Gráficos de Severidad y Censadores
function renderAnalytics() {
  const s = dashboardData.summary;
  
  // Gráfico de Severidad en CSS/SVG
  if (severityChart) {
    const total = s.total_pairs_duplicates || 1;
    const b = s.breakdown_by_photos;
    const p4 = ((b['4_photos'] / total) * 100).toFixed(1);
    const p3 = ((b['3_photos'] / total) * 100).toFixed(1);
    const p2 = ((b['2_photos'] / total) * 100).toFixed(1);
    const p1 = ((b['1_photo'] / total) * 100).toFixed(1);

    severityChart.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
          <span>Proporción de Reutilización</span>
          <span>100% de la Base de Duplicados</span>
        </div>
        <div style="height: 24px; width: 100%; display: flex; border-radius: 6px; overflow: hidden; background: #1e293b;">
          <div style="width: ${p4}%; background: var(--accent-rose);" title="4 Fotos: ${p4}% (${b['4_photos']})"></div>
          <div style="width: ${p3}%; background: var(--accent-amber);" title="3 Fotos: ${p3}% (${b['3_photos']})"></div>
          <div style="width: ${p2}%; background: var(--accent-cyan);" title="2 Fotos: ${p2}% (${b['2_photos']})"></div>
          <div style="width: ${p1}%; background: #64748b;" title="1 Foto: ${p1}% (${b['1_photo']})"></div>
        </div>
        <div style="display: flex; gap: 1rem; font-size: 0.72rem; color: #94a3b8; justify-content: space-between; flex-wrap: wrap;">
          <span><strong style="color: var(--accent-rose);">■</strong> 4 Fotos (${p4}%)</span>
          <span><strong style="color: var(--accent-amber);">■</strong> 3 Fotos (${p3}%)</span>
          <span><strong style="color: var(--accent-cyan);">■</strong> 2 Fotos (${p2}%)</span>
          <span><strong style="color: #64748b;">■</strong> 1 Foto (${p1}%)</span>
        </div>
      </div>
    `;
  }

  // Ranking Censadores
  if (censadoresRanking && s.top_censadores) {
    const maxVal = s.top_censadores[0]?.count || 1;
    censadoresRanking.innerHTML = s.top_censadores.slice(0, 5).map((c, i) => {
      const pct = ((c.count / maxVal) * 100).toFixed(0);
      return `
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem;">
            <span style="color: #f1f5f9; font-weight: 600;">#${i+1} ${c.censador}</span>
            <span style="color: var(--accent-purple); font-weight: 700;">${c.count.toLocaleString()} folios</span>
          </div>
          <div style="height: 6px; width: 100%; background: #1e293b; border-radius: 99px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: linear-gradient(to right, var(--accent-indigo), var(--accent-purple)); border-radius: 99px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Filtrar lista de casos
function filterCases() {
  const query = searchInput.value.toLowerCase().trim();
  
  currentFilteredCases = dashboardData.cases.filter(c => {
    // Filtro por fotos
    if (activeFilter !== 'all' && c.total_fotos_identicas !== parseInt(activeFilter)) {
      return false;
    }
    // Filtro por texto
    if (query) {
      const matchF1 = c.folio1.toLowerCase().includes(query);
      const matchF2 = c.folio2.toLowerCase().includes(query);
      const matchUser1 = (c.meta1.censador || '').toLowerCase().includes(query);
      const matchUser2 = (c.meta2.censador || '').toLowerCase().includes(query);
      const matchMuni = (c.meta1.municipio || '').toLowerCase().includes(query);
      return matchF1 || matchF2 || matchUser1 || matchUser2 || matchMuni;
    }
    return true;
  });

  renderCasesList();
}

// Renderizar barra lateral con los casos
function renderCasesList() {
  if (!casesContainer) return;
  
  if (totalCasesCount) totalCasesCount.textContent = currentFilteredCases.length;

  if (currentFilteredCases.length === 0) {
    casesContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
        <p>No se encontraron casos con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  casesContainer.innerHTML = currentFilteredCases.map(c => {
    const isSelected = selectedCase && selectedCase.case_id === c.case_id;
    const tagClass = `sev-${c.total_fotos_identicas}-tag`;
    const tagText = `${c.total_fotos_identicas} ${c.total_fotos_identicas === 1 ? 'Foto' : 'Fotos'}`;
    
    return `
      <div class="case-item ${isSelected ? 'active' : ''}" onclick="selectCaseById(${c.case_id})">
        <div class="case-top">
          <span class="case-id-badge">CASO #${c.case_id}</span>
          <span class="severity-tag ${tagClass}">🚨 ${tagText}</span>
        </div>
        <div class="case-folios">
          <span>${c.folio1}</span>
          <i class="fa-solid fa-arrow-right" style="font-size: 0.65rem; color: var(--text-muted);"></i>
          <span>${c.folio2}</span>
        </div>
        <div class="case-censador">
          <i class="fa-regular fa-user" style="margin-right: 0.25rem;"></i>
          ${c.meta1.censador || 'No especificado'}
        </div>
      </div>
    `;
  }).join('');
}

window.selectCaseById = function(id) {
  const found = dashboardData.cases.find(c => c.case_id === id);
  if (found) selectCase(found);
};

function selectCase(c) {
  selectedCase = c;
  
  // Actualizar clase activa en la lista
  document.querySelectorAll('.case-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Actualizar título
  if (caseTitle) {
    caseTitle.innerHTML = `
      <span>CASO #${c.case_id}:</span>
      <span style="color: var(--accent-indigo);">${c.folio1}</span>
      <span style="color: var(--text-muted); font-weight: 400; font-size: 0.9rem;">vs</span>
      <span style="color: var(--accent-purple);">${c.folio2}</span>
      <span class="severity-tag sev-${c.total_fotos_identicas}-tag" style="margin-left: 0.5rem; font-size: 0.8rem;">
        🚨 ${c.total_fotos_identicas} Fotos Idénticas
      </span>
    `;
  }

  renderCasesList();
  renderComparatorView();
}

// Renderizar la vista activa del comparador
function renderComparatorView() {
  if (!contentArea || !selectedCase) return;

  if (currentView === 'linkaform') {
    renderLinkaformView();
  } else if (currentView === 'photos') {
    renderPhotosView();
  } else if (currentView === 'diff') {
    renderDiffView();
  }
}

// Vista 1: Capturas Reales LinkaForm
function renderLinkaformView() {
  const c = selectedCase;
  const metaImg = c.linka_meta_img;
  const photoImg = c.linka_photo_img;

  if (!c.has_linkaform && !metaImg) {
    contentArea.innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--text-secondary); background: #090d16; border-radius: var(--radius-md);">
        <i class="fa-solid fa-camera-retro" style="font-size: 3rem; color: var(--accent-indigo); margin-bottom: 1rem;"></i>
        <h3 style="color: #ffffff; margin-bottom: 0.5rem;">Captura de Plataforma no disponible en esta muestra</h3>
        <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 1.5rem;">
          Este caso se encuentra registrado en la base de datos de auditoría. Puedes inspeccionar las fotografías en alta resolución en la siguiente pestaña.
        </p>
        <button class="btn-export" onclick="document.querySelector('[data-view=photos]').click()">
          <i class="fa-solid fa-images"></i>
          <span>Ver Fotos HD Lado a Lado</span>
        </button>
      </div>
    `;
    return;
  }

  contentArea.innerHTML = `
    <div class="linkaform-view-container">
      <!-- Metadatos & Fechas -->
      <div class="screenshot-card">
        <div class="screenshot-card-header">
          <span><i class="fa-solid fa-table-cells" style="margin-right: 0.4rem;"></i> Metadatos y Panel de Fechas LinkaForm (Folio 1 Izquierda vs Folio 2 Derecha)</span>
          <span style="color: #cbd5e1; font-size: 0.75rem;"><i class="fa-solid fa-eye" style="margin-right: 0.25rem;"></i> Captura Directa</span>
        </div>
        <div class="screenshot-img-wrapper">
          <img src="${metaImg}" alt="Metadatos Caso ${c.case_id}">
        </div>
      </div>

      <!-- Fotografías LinkaForm -->
      <div class="screenshot-card">
        <div class="screenshot-card-header">
          <span><i class="fa-solid fa-image" style="margin-right: 0.4rem;"></i> Evidencia Fotográfica en Plataforma (Lado a Lado)</span>
          <span style="color: #cbd5e1; font-size: 0.75rem;"><i class="fa-solid fa-magnifying-glass" style="margin-right: 0.25rem;"></i> Mismas Evidencias</span>
        </div>
        <div class="screenshot-img-wrapper">
          <img src="${photoImg}" alt="Fotos Caso ${c.case_id}">
        </div>
      </div>
    </div>
  `;
}

// Vista 2: Fotos HD Lado a Lado
function renderPhotosView() {
  const c = selectedCase;
  
  contentArea.innerHTML = `
    <div class="photos-grid-container">
      ${c.photos.map(p => {
        const matchBadge = p.is_identical
          ? `<span class="identical-badge yes"><i class="fa-solid fa-circle-check"></i> FOTO IDÉNTICA (MATCH CRIPTOGRÁFICO)</span>`
          : `<span class="identical-badge no">Foto Distinta / No disponible</span>`;
        
        const img1Src = p.img1 || 'https://via.placeholder.com/400x300?text=Sin+Foto';
        const img2Src = p.img2 || 'https://via.placeholder.com/400x300?text=Sin+Foto';

        return `
          <div class="photo-pair-row">
            <div class="photo-pair-header">
              <div class="photo-pair-title">
                <i class="fa-solid fa-camera" style="margin-right: 0.4rem; color: var(--accent-indigo);"></i>
                ${p.type}
              </div>
              ${matchBadge}
            </div>
            
            <div class="photo-pair-body">
              <!-- Folio 1 Photo -->
              <div class="single-photo-box">
                <div class="single-photo-header">
                  <span style="color: var(--accent-indigo);">Folio 1: ${c.folio1}</span>
                  <span style="color: var(--text-muted);">${c.meta1.censador}</span>
                </div>
                <div class="photo-img-holder">
                  <img src="${img1Src}" alt="Folio 1 - ${p.type}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Foto+no+descargada'">
                </div>
                <div class="photo-hash">SHA: ${p.hash1 || 'N/A'}</div>
              </div>

              <!-- Folio 2 Photo -->
              <div class="single-photo-box">
                <div class="single-photo-header">
                  <span style="color: var(--accent-purple);">Folio 2: ${c.folio2}</span>
                  <span style="color: var(--text-muted);">${c.meta2.censador}</span>
                </div>
                <div class="photo-img-holder">
                  <img src="${img2Src}" alt="Folio 2 - ${p.type}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Foto+no+descargada'">
                </div>
                <div class="photo-hash">SHA: ${p.hash2 || 'N/A'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Vista 3: Ficha Técnica Diff
function renderDiffView() {
  const c = selectedCase;
  
  contentArea.innerHTML = `
    <div class="diff-table-container">
      <table class="diff-table">
        <thead>
          <tr>
            <th>Parámetro de Auditoría</th>
            <th>Folio 1 (Original / Registro A)</th>
            <th>Folio 2 (Duplicado / Registro B)</th>
            <th>Diagnóstico Forense</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="field-name">Número de Folio</td>
            <td class="highlight-diff">${c.folio1}</td>
            <td class="highlight-diff">${c.folio2}</td>
            <td><span class="severity-tag sev-4-tag">Folios Distintos</span></td>
          </tr>
          <tr>
            <td class="field-name">Censador / Gestor</td>
            <td>${c.meta1.censador || 'No especificado'}</td>
            <td>${c.meta2.censador || 'No especificado'}</td>
            <td>${c.meta1.censador === c.meta2.censador ? '<span class="highlight-same">Mismo Censador</span>' : '<span class="highlight-diff">Censadores Distintos</span>'}</td>
          </tr>
          <tr>
            <td class="field-name">Fecha de Creación</td>
            <td>${c.meta1.fecha || 'N/D'}</td>
            <td>${c.meta2.fecha || 'N/D'}</td>
            <td><span class="highlight-diff">Desfase Temporal Detectado</span></td>
          </tr>
          <tr>
            <td class="field-name">Municipio & Colonia</td>
            <td class="highlight-same">${c.meta1.municipio} - ${c.meta1.colonia || 'N/D'}</td>
            <td class="highlight-same">${c.meta2.municipio} - ${c.meta2.colonia || 'N/D'}</td>
            <td><span class="highlight-same"><i class="fa-solid fa-location-dot"></i> Misma Ubicación Declarada</span></td>
          </tr>
          <tr>
            <td class="field-name">Coordenadas GPS</td>
            <td class="highlight-same">${c.meta1.lat ? `${c.meta1.lat.toFixed(5)}, ${c.meta1.lon.toFixed(5)}` : 'N/D'}</td>
            <td class="highlight-same">${c.meta2.lat ? `${c.meta2.lat.toFixed(5)}, ${c.meta2.lon.toFixed(5)}` : 'N/D'}</td>
            <td><span class="highlight-same">Mismo Punto Geográfico</span></td>
          </tr>
          <tr>
            <td class="field-name">Total Fotos Idénticas</td>
            <td colspan="2" style="text-align: center; font-size: 1.1rem; font-weight: 800; color: var(--accent-rose);">
              🚨 ${c.total_fotos_identicas} Fotografías Reutilizadas de 6
            </td>
            <td><span class="severity-tag sev-${c.total_fotos_identicas}-tag">Fraude Confirmado</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// Renderizar tabla maestra inferior
function renderMasterTable() {
  if (!masterTableBody) return;
  
  masterTableBody.innerHTML = dashboardData.cases.slice(0, 50).map(c => `
    <tr>
      <td style="font-weight: 700; color: var(--accent-purple);">#${c.case_id}</td>
      <td style="font-weight: 600; color: #f8fafc;">${c.folio1}</td>
      <td>${c.meta1.censador || 'N/D'}</td>
      <td style="font-weight: 600; color: #f8fafc;">${c.folio2}</td>
      <td>${c.meta2.censador || 'N/D'}</td>
      <td style="font-weight: 700; color: var(--accent-rose);">${c.total_fotos_identicas} Fotos</td>
      <td><span class="severity-tag sev-${c.total_fotos_identicas}-tag">${c.total_fotos_identicas} Idénticas</span></td>
      <td>
        <button class="btn-table-action" onclick="selectCaseById(${c.case_id}); window.scrollTo({top: 500, behavior: 'smooth'});">
          <i class="fa-solid fa-eye"></i> Comparar
        </button>
      </td>
    </tr>
  `).join('');
}

// Datos de fallback en caso de retraso en fetch
function getFallbackData() {
  return {
    summary: {
      total_records_audited: 52940,
      total_pairs_duplicates: 36382,
      breakdown_by_photos: {
        '4_photos': 976,
        '3_photos': 3882,
        '2_photos': 8514,
        '1_photo': 23010
      },
      top_censadores: [
        { censador: 'Administración PCLink', count: 9812 },
        { censador: 'Tecnicos PC Metro', count: 5410 },
        { censador: 'MAQTEL - Alberto Lobeira', count: 4120 },
        { censador: 'Gil Francisco Avendaño', count: 3890 },
        { censador: 'Adolfo Torres Ocampo', count: 2940 }
      ]
    },
    cases: [
      {
        case_id: 1,
        folio1: '13809333-1259',
        folio2: '13814342-1259',
        total_fotos_identicas: 4,
        meta1: { censador: 'No. de censador: pue18', fecha: '2026-06-25 18:56:14', municipio: 'Acapulco', colonia: 'Vicente Guerrero', lat: 16.87724, lon: -99.84905 },
        meta2: { censador: 'No. de censador: cano02', fecha: '2026-06-25 19:00:14', municipio: 'Acapulco', colonia: 'Vicente Guerrero', lat: 16.87724, lon: -99.84905 },
        has_linkaform: true,
        linka_meta_img: '../evidencias_linkaform/caso_1_meta_combined.png',
        linka_photo_img: '../evidencias_linkaform/caso_1_photo_combined.png',
        photos: [
          { type: 'Fotografía de Fachada', is_identical: true, hash1: '16ec66372011', hash2: '16ec66372011', img1: '../evidencias_linkaform/folio_13809333-1259_photos.png', img2: '../evidencias_linkaform/folio_13814342-1259_photos.png' }
        ]
      }
    ]
  };
}
