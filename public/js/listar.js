/**
 * SISTEMA DE GESTIÓN DE ALUMNOS
 * Módulo de listado de alumnos
 * 
 * Este archivo contiene todas las funciones necesarias para:
 * - Cargar y filtrar alumnos por año académico, nombre y curso
 * - Mostrar resultados paginados
 * - Exportar a Excel e imprimir listados
 */

// ====================================================
// VARIABLES GLOBALES
// ====================================================

/** Variables para paginación */
let currentPage = 1;           // Página actual
let totalPages = 1;            // Total de páginas 
let itemsPerPage = 20;         // Ítems por página
let currentResults = [];       // Resultados actuales (todos)

// ====================================================
// FUNCIONES DE UTILIDAD
// ====================================================

/**
 * Muestra un mensaje al usuario con un tipo específico
 * @param {string} texto - Texto del mensaje
 * @param {string} tipo - Tipo de mensaje (success, warning, danger, info)
 */
function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById('successMessage');
  mensaje.className = `notification is-${tipo} is-light mb-4`;
  mensaje.innerHTML = `<button class="delete"></button>${texto}`;
  mensaje.style.display = 'block';

  // Ocultar automáticamente después de 5 segundos
  setTimeout(() => {
    mensaje.style.display = 'none';
  }, 5000);

  // Configurar el botón de cierre
  mensaje.querySelector('.delete').addEventListener('click', function () {
    mensaje.style.display = 'none';
  });
}

// ====================================================
// FUNCIONES DE CARGA DE DATOS
// ====================================================

/**
 * Carga los cursos disponibles para un año académico específico
 * @param {string} idAno - ID del año académico
 */
function cargarCursos(idAno) {
  idAno ? url = `/obtener-cursos?anio=${idAno}` : url = '/obtener-cursos';
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(cursos => {
      const cursosSelect = document.getElementById('searchCurso');
      cursosSelect.innerHTML = '<option value="">-- Todos los cursos --</option>';
      if (cursos.length === 0) {
        mostrarMensaje('No hay cursos disponibles para el año académico seleccionado.', 'warning');
        return;
      }
      cursos.forEach(curso => {
        if (curso.nombre_curso === "--------" || curso.nombre_curso === "---------") {
          // Si el año académico es "--------", saltar a la siguiente iteración
          return;
        }
        const option = document.createElement('option');
        option.value = curso.id_curso;
        option.textContent = idAno ? `${curso.nombre_curso}` : `${curso.nombre_curso} (${curso.nombre_ano})`;
        cursosSelect.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error al cargar cursos:', error);
      mostrarMensaje('Error al cargar los cursos disponibles.', 'warning');
    });
}

/**
 * Carga años académicos y configura el select
 */
function cargarAnosAcademicos() {
  fetch('/obtener-anos')
    .then(response => {
      if (response.status === 404) {
        throw new Error('El endpoint "/obtener-anos" no existe. Verifique la implementación del backend.');
      } else if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => { 
      const yearSelect = document.getElementById('yearSelect');
      data.forEach(year => {
        const option = document.createElement('option');
        option.value = year.nombre_ano;
        option.textContent = year.nombre_ano;
        yearSelect.appendChild(option);
      });

      // Debugging: mostrar los años disponibles
      console.log("Años cargados:", Array.from(yearSelect.options).map(opt => ({
        value: opt.value,
        text: opt.textContent
      })));

    })
    .catch(error => {
      console.error('Error al cargar los años:', error);
      mostrarMensaje('Error al cargar los años académicos. Por favor, recargue la página.', 'danger');
    });
}



// ====================================================
// FUNCIONES DE FILTRADO Y BÚSQUEDA
// ====================================================

/**
 * Maneja el envío del formulario de filtro
 * @param {Event} e - Evento del formulario
 */
function handleFilterSubmit(e) {
  e.preventDefault();

  const anio = document.getElementById('yearSelect').value;
  const nombre = document.getElementById('searchNombre').value.trim();
  const curso = document.getElementById('searchCurso').value.trim();
  const cursoNombre = document.getElementById('searchCurso').options[document.getElementById('searchCurso').selectedIndex].textContent;
  console.log(`
      id_ano: ${anio}
      nombre: ${nombre}
      cursoId: ${curso}
      cursoNombre: ${cursoNombre}
    `)

  // Validaciones
  if (!anio) {
    mostrarMensaje('Debe seleccionar un año académico antes de buscar.', 'warning');
    return;
  }

  // Mostrar indicador de carga
  document.getElementById('loadingIndicator').style.display = 'block';

  // Construir la URL con los parámetros de búsqueda
  let url = `/api/listar?ano=${anio}`;

  if (nombre) {
    url += `&nombre=${encodeURIComponent(nombre)}`;
  }

  if (curso) {
    url += `&curso=${encodeURIComponent(curso)}`;
  }

  //const yearText = yearSelectElement.options[yearSelectElement.selectedIndex].textContent;
  console.log("Buscando alumnos con año:", anio, "- Nombre:", nombre, "- Curso:", curso);
  console.log("URL de búsqueda:", url);
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Resultados de búsqueda:", data);
      // Ocultar indicador de carga
      document.getElementById('loadingIndicator').style.display = 'none';

      // Validar que data sea un array
      if (!Array.isArray(data)) {
        console.error('Formato de datos incorrecto:', data);
        throw new Error('Formato de datos incorrecto');
      }

      // Almacenar resultados y configurar paginación
      currentResults = data;
      currentPage = 1;
      totalPages = Math.ceil(data.length / itemsPerPage);

      // Actualizar contador de resultados
      document.getElementById('resultsCount').textContent = `${data.length} alumnos encontrados`;

      // Mostrar resultados paginados
      displayResults();
    })
    .catch(error => {
      console.error('Error al cargar alumnos:', error);
      document.getElementById('loadingIndicator').style.display = 'none';
      document.getElementById('resultsCount').textContent = 'Error al cargar los alumnos';
      document.getElementById('usuariosTable').innerHTML =
        `<tr><td colspan="4" class="has-text-centered has-text-danger">
           Error al cargar los datos. Por favor, intente nuevamente.
           <br><small>${error.message}</small>
         </td></tr>`;
      mostrarMensaje(`Error: ${error.message}`, 'danger');
    });
}

// ====================================================
// FUNCIONES DE VISUALIZACIÓN DE RESULTADOS
// ====================================================

/**
 * Muestra los resultados paginados en la tabla
 */
function displayResults() {
  const usuariosTable = document.getElementById('usuariosTable');
  usuariosTable.innerHTML = ''; // Limpiar tabla

  // Ocultar indicador de carga si aún estaba visible
  document.getElementById('loadingIndicator').style.display = 'none';

  // Verificar si hay resultados
  if (currentResults.length === 0) {
    usuariosTable.innerHTML = '<tr><td colspan="4" class="has-text-centered">No hay alumnos que coincidan con los criterios de búsqueda.</td></tr>';
    document.getElementById('paginationNumbers').innerHTML = '';
    document.getElementById('prevPage').classList.add('is-disabled');
    document.getElementById('nextPage').classList.add('is-disabled');
    return;
  }

  // Calcular slice de datos para la página actual
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, currentResults.length);
  const paginatedItems = currentResults.slice(start, end);

  // Crear filas de la tabla para cada alumno
  paginatedItems.forEach(alumno => {
    const row = document.createElement('tr');

    // Formatear el RUT con puntos y guión si existe
    let rutFormateado = alumno.rut || "Sin RUT";
    if (alumno.rut && alumno.rut.length > 1) {
      // Simple formato RUT chileno (asume que viene sin formato)
      if (!alumno.rut.includes('-') && alumno.rut.length > 7) {
        const rutSinDv = alumno.rut.slice(0, -1);
        const dv = alumno.rut.slice(-1);
        rutFormateado = rutSinDv.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
      }
    }

    row.innerHTML = `
      <td>${rutFormateado}</td>
      <td>${alumno.apellidoPaterno} ${alumno.apellidoMaterno || ''}, ${alumno.nombres}</td>
      <td>${alumno.curso || 'No asignado'}</td>
      <td class="buttons are-small">
          <a href="/modificar/${alumno.idUsuario}" class="button is-warning">
          <span class="icon"><i class="fas fa-edit"></i></span>
          <span>Editar</span>
        </a>
        <a href="/detalle?id=${alumno.idUsuario}" class="button is-info">
          <span class="icon"><i class="fas fa-eye"></i></span>
          <span>Ver</span>
        </a>
      </td>
    `;
    usuariosTable.appendChild(row);
  });

  // Actualizar controles de paginación
  updatePaginationControls();
}

/**
 * Actualiza los controles de paginación
 */
function updatePaginationControls() {
  const paginationNumbers = document.getElementById('paginationNumbers');
  paginationNumbers.innerHTML = '';

  // Habilitar/deshabilitar botones anterior/siguiente
  document.getElementById('prevPage').classList.toggle('is-disabled', currentPage === 1);
  document.getElementById('nextPage').classList.toggle('is-disabled', currentPage === totalPages);

  // Si hay muchas páginas, mostrar solo un rango
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4 && totalPages > 5) {
    startPage = Math.max(1, endPage - 4);
  }

  // Generar enlaces de paginación
  addPaginationLinks(startPage, endPage, paginationNumbers);
}

/**
 * Genera enlaces de paginación
 * @param {number} startPage - Página inicial a mostrar
 * @param {number} endPage - Página final a mostrar
 * @param {HTMLElement} paginationNumbers - Contenedor de paginación
 */
function addPaginationLinks(startPage, endPage, paginationNumbers) {
  // Siempre mostrar la primera página
  if (startPage > 1) {
    addPageNumber(1, paginationNumbers);
    if (startPage > 2) {
      addEllipsis(paginationNumbers);
    }
  }

  // Páginas intermedias
  for (let i = startPage; i <= endPage; i++) {
    addPageNumber(i, paginationNumbers);
  }

  // Siempre mostrar la última página
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      addEllipsis(paginationNumbers);
    }
    addPageNumber(totalPages, paginationNumbers);
  }
}

/**
 * Añade un número de página a la paginación
 * @param {number} pageNum - Número de página
 * @param {HTMLElement} container - Contenedor donde añadirlo
 */
function addPageNumber(pageNum, container) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.classList.add('pagination-link');
  if (pageNum === currentPage) {
    a.classList.add('is-current');
  }
  a.setAttribute('aria-label', `Ir a página ${pageNum}`);
  a.textContent = pageNum;
  a.href = '#';
  a.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = pageNum;
    displayResults();
  });
  li.appendChild(a);
  container.appendChild(li);
}

/**
 * Añade puntos suspensivos a la paginación
 * @param {HTMLElement} container - Contenedor donde añadirlo
 */
function addEllipsis(container) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.classList.add('pagination-ellipsis');
  span.innerHTML = '&hellip;';
  li.appendChild(span);
  container.appendChild(li);
}

// ====================================================
// FUNCIONES DE EXPORTACIÓN E IMPRESIÓN
// ====================================================

/**
 * Exporta los resultados actuales a Excel
 */
function exportToExcel() {
  if (currentResults.length === 0) {
    mostrarMensaje('No hay datos para exportar', 'warning');
    return;
  }

  // Construir la URL con los mismos parámetros que el listado
  const yearSelect = document.getElementById('yearSelect');
  const nombreInput = document.getElementById('searchNombre');
  const cursoInput = document.getElementById('searchCurso');

  let url = `/exportar-excel?ano=${yearSelect.value}`;

  if (nombreInput.value.trim()) {
    url += `&nombre=${encodeURIComponent(nombreInput.value.trim())}`;
  }

  if (cursoInput.value) {
    url += `&curso=${encodeURIComponent(cursoInput.value)}`;
  }

  // Redirigir al usuario a la URL de descarga
  window.location.href = url;
}

/**
 * Imprime el listado actual de alumnos
 */
function printList() {
  if (currentResults.length === 0) {
    mostrarMensaje('No hay datos para imprimir', 'warning');
    return;
  }

  const yearSelect = document.getElementById('yearSelect');
  const yearText = yearSelect.options[yearSelect.selectedIndex].textContent;

  // Crear ventana de impresión
  const printWindow = window.open('', '_blank');

  // Crear contenido HTML para impresión
  printWindow.document.write(`
    <html>
      <head>
        <title>Listado de Alumnos - ${yearText}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Listado de Alumnos - ${yearText}</h1>
        <div class="no-print">
          <button onclick="window.print()">Imprimir</button>
          <button onclick="window.close()">Cerrar</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre Completo</th>
              <th>Curso</th>
            </tr>
          </thead>
          <tbody>
            ${currentResults.map(alumno => `
              <tr>
                <td>${alumno.rut || 'Sin RUT'}</td>
                <td>${alumno.a_paterno} ${alumno.a_materno || ''}, ${alumno.nombres}</td>
                <td>${alumno.curso || 'No asignado'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Fecha de impresión: ${new Date().toLocaleDateString()} - Total alumnos: ${currentResults.length}</p>
        </div>
      </body>
    </html>
  `);

  // Cerrar documento y enfocar para impresión
  printWindow.document.close();
  printWindow.focus();
}

// ====================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ====================================================

/**
 * Configura todos los event listeners y carga datos iniciales
 */
function inicializarPagina() {
  // Verificar parámetros URL para mensajes de éxito
  const urlParams = new URLSearchParams(window.location.search);
  const showSuccess = urlParams.get('success');

  if (showSuccess) {
    document.getElementById('successMessage').style.display = 'block';
    setTimeout(() => {
      document.getElementById('successMessage').style.display = 'none';
    }, 5000);
  }

  // Configurar cierre de mensajes
  document.querySelector('.notification .delete').addEventListener('click', function () {
    document.getElementById('successMessage').style.display = 'none';
  });

  // Cargar años académicos
  cargarAnosAcademicos();

  // Cargar todos los cursos sin filtrar
  cargarCursos()

  // Event listener para cambio de año
  document.getElementById('yearSelect').addEventListener('change', function () {
    const idAno = this.value;
    if (idAno) {
      cargarCursos(idAno);
    }
  });

  // Event listeners para botones de acción
  document.getElementById('exportExcel').addEventListener('click', exportToExcel);
  document.getElementById('printList').addEventListener('click', printList);

  // Event listeners para paginación
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayResults();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayResults();
    }
  });

  // Event listener para búsqueda
  document.getElementById('filterForm').addEventListener('submit', handleFilterSubmit);
}


// Inicializar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', inicializarPagina);