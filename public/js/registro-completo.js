function mostrarToast(mensaje, tipo = 'is-info') {
    // Crear elemento toast si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1000';
        document.body.appendChild(toastContainer);
    }

    // Crear toast
    const toast = document.createElement('div');
    toast.className = `notification ${tipo}`;
    toast.style.marginBottom = '10px';
    toast.style.minWidth = '250px';
    toast.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16)';

    // Botón de cierre
    const closeButton = document.createElement('button');
    closeButton.className = 'delete';
    closeButton.addEventListener('click', () => {
        toastContainer.removeChild(toast);
    });

    // Contenido
    toast.appendChild(closeButton);
    toast.appendChild(document.createTextNode(mensaje));

    // Añadir al container
    toastContainer.appendChild(toast);

    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        if (toastContainer.contains(toast)) {
            toastContainer.removeChild(toast);
        }
    }, 5000);
}

function mostrarCarga(mensaje = 'Cargando...') {
    // Crear overlay de carga
    let cargaOverlay = document.getElementById('carga-overlay');
    if (!cargaOverlay) {
        cargaOverlay = document.createElement('div');
        cargaOverlay.id = 'carga-overlay';
        cargaOverlay.style.position = 'fixed';
        cargaOverlay.style.top = '0';
        cargaOverlay.style.left = '0';
        cargaOverlay.style.width = '100%';
        cargaOverlay.style.height = '100%';
        cargaOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        cargaOverlay.style.display = 'flex';
        cargaOverlay.style.justifyContent = 'center';
        cargaOverlay.style.alignItems = 'center';
        cargaOverlay.style.zIndex = '9999';

        const contenido = document.createElement('div');
        contenido.className = 'box has-text-centered';
        contenido.style.minWidth = '300px';

        const spinner = document.createElement('div');
        spinner.className = 'loader is-loading';
        spinner.style.height = '80px';
        spinner.style.width = '80px';
        spinner.style.margin = '0 auto 20px';

        const textoMensaje = document.createElement('p');
        textoMensaje.className = 'has-text-weight-bold';
        textoMensaje.id = 'carga-mensaje';
        textoMensaje.textContent = mensaje;

        contenido.appendChild(spinner);
        contenido.appendChild(textoMensaje);
        cargaOverlay.appendChild(contenido);
        document.body.appendChild(cargaOverlay);
    } else {
        document.getElementById('carga-mensaje').textContent = mensaje;
        cargaOverlay.style.display = 'flex';
    }
}

function ocultarCarga() {
    const overlay = document.getElementById('carga-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos de las pestañas
    configurarEventosNavegacion();
    
    // Configurar evento para el botón de guardar
    const btnGuardarTodo = document.getElementById('btnGuardarTodo');
    if (btnGuardarTodo) {
        btnGuardarTodo.addEventListener('click', guardarRegistroCompleto);
    }
    
    // Configurar evento para el botón de copiar datos como apoderado
    const btnCopiarComoApoderado = document.getElementById('btnCopiarComoApoderado');
    if (btnCopiarComoApoderado) {
        btnCopiarComoApoderado.addEventListener('click', copiarDatosComoApoderado);
    }
    
    // Configurar evento para el botón de agregar familiar
    const btnAgregarFamiliar = document.getElementById('btnAgregarFamiliar');
    if (btnAgregarFamiliar) {
        btnAgregarFamiliar.addEventListener('click', agregarFamiliarAdicional);
    }
    
    // Configurar evento para autocompletar apoderado desde tipo
    const tipoApoderadoSelect = document.getElementById('tipoApoderado');
    if (tipoApoderadoSelect) {
        tipoApoderadoSelect.addEventListener('change', autocompletarApoderadoDesdeParentesco);
    }
    
    // Configurar evento para checkbox sin RUT del familiar
    const extranjeroSinRut = document.getElementById('extranjeroSinRut');
    if (extranjeroSinRut) {
        extranjeroSinRut.addEventListener('change', function() {
            const rutFamiliar = document.getElementById('rutFamiliar');
            if (rutFamiliar) {
                rutFamiliar.value = this.checked ? 'SIN RUT' : '';
                rutFamiliar.disabled = this.checked;
            }
        });
    }
    
    // Configurar evento para checkbox sin información de establecimiento
    const sinInformacion = document.getElementById('checkSinInformacion');
    if (sinInformacion) {
        sinInformacion.addEventListener('change', function() {
            const establecimiento = document.getElementById('idEstablecimientoAnterior');
            if (establecimiento) {
                establecimiento.value = this.checked ? '-1' : '';
                establecimiento.disabled = this.checked;
            }
        });
    }
    
    // Inicializar aplicación
    cargarAniosAcademicos();
    cargarEstablecimientos();
    cargarComunas();
    cargarNacionalidades();
    cargarTodosLosCursos();
    cargarPlanesAcademicos();
    cargarMotivosPostulacion();
    validarSoloNumeros();
    validarSoloTexto();
    validarCamposNumericos();
});

// Función para configurar la navegación por pestañas
function configurarEventosNavegacion() {
    document.querySelectorAll('.tabs ul li').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase 'is-active' de todos los tabs
            document.querySelectorAll('.tabs ul li').forEach(t => {
                t.classList.remove('is-active');
            });
            
            // Ocultar todos los contenidos
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
                content.classList.remove('is-active');
            });
            
            // Activar el tab seleccionado
            this.classList.add('is-active');
            
            // Mostrar el contenido correspondiente
            const target = this.getAttribute('data-tab');
            if (target) {
                const content = document.getElementById(target);
                if (content) {
                    content.style.display = 'block';
                    content.classList.add('is-active');
                }
            }
        });
    });
    
    // Inicialmente mostrar solo el primer tab
    const tabs = document.querySelectorAll('.tabs ul li');
    const contents = document.querySelectorAll('.tab-content');
    
    if (tabs.length > 0 && contents.length > 0) {
        tabs.forEach((tab, index) => {
            if (index === 0) {
                tab.classList.add('is-active');
            } else {
                tab.classList.remove('is-active');
            }
        });
        
        contents.forEach((content, index) => {
            if (index === 0) {
                content.style.display = 'block';
                content.classList.add('is-active');
            } else {
                content.style.display = 'none';
                content.classList.remove('is-active');
            }
        });
    }
}

function guardarRegistroCompleto() {
    try {
        mostrarCarga('Guardando datos del registro...');
        
        // 1. Validar datos personales
        if (!validarDatosPersonales()) {
            ocultarCarga();
            mostrarToast('Por favor complete todos los campos obligatorios en Datos Personales', 'is-danger');
            const tabDatosPersonales = document.querySelector('[data-tab="datos-personales"]');
            if (tabDatosPersonales) tabDatosPersonales.click();
            return;
        }
        
        // 2. Validar datos del apoderado
        if (!validarDatosApoderado()) {
            ocultarCarga();
            mostrarToast('Por favor complete todos los campos obligatorios en Datos Apoderado', 'is-danger');
            const tabDatosApoderado = document.querySelector('[data-tab="datos-apoderado"]');
            if (tabDatosApoderado) tabDatosApoderado.click();
            return;
        }
        
        // 3. Recopilar datos de todos los formularios
        const datosPersonales = obtenerDatosFormulario('form-datos-personales');
        const datosFamiliares = obtenerDatosFamiliares();
        const datosApoderado = obtenerDatosFormulario('form-datos-apoderado');
        
        // 4. Crear un objeto con todos los datos
        const registroCompleto = {
            alumno: datosPersonales,
            familiares: datosFamiliares,
            apoderado: datosApoderado
        };
        
        console.log('Datos a enviar:', registroCompleto);
        
        // 5. Enviar los datos al servidor
        fetch('/guardar-registro-completo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registroCompleto)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            ocultarCarga();
            if (data.success) {
                mostrarToast(`Registro guardado con éxito. ID Alumno: ${data.idAlumno}, ID Apoderado: ${data.idApoderado}`, 'is-success');
                
                // Mostrar un modal con los IDs
                setTimeout(() => {
                    alert(`¡Registro completado con éxito!\n\nID Alumno: ${data.idAlumno}\nID Apoderado: ${data.idApoderado}`);
                    
                    // Opcional: redirigir a otra página
                    window.location.href = '/listar';
                }, 1000);
            } else {
                mostrarToast(`Error al guardar: ${data.message}`, 'is-danger');
            }
        })
        .catch(error => {
            ocultarCarga();
            console.error('Error al guardar el registro:', error);
            mostrarToast('Error al guardar el registro. Por favor, inténtelo de nuevo.', 'is-danger');
        });
        
    } catch (error) {
        ocultarCarga();
        console.error('Error en el proceso de guardar:', error);
        mostrarToast('Error en el proceso de guardar', 'is-danger');
    }
}

// Función para obtener todos los datos de un formulario
function obtenerDatosFormulario(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const datos = {};
    
    formData.forEach((value, key) => {
        // Manejar radios y checkboxes
        if (form.querySelector(`input[name="${key}"][type="radio"]`)) {
            datos[key] = value;
        } else if (form.querySelector(`input[name="${key}"][type="checkbox"]`)) {
            datos[key] = value === 'on' ? true : value;
        } else {
            datos[key] = value;
        }
    });
    
    return datos;
}

// Función para obtener datos de familiares (considerando que puede haber múltiples)
function obtenerDatosFamiliares() {
    const formFamiliares = document.getElementById('form-datos-familiares');
    if (!formFamiliares) return [];
    
    // Para el primer familiar (obligatorio)
    const familiar1 = {
        parentesco: formFamiliares.querySelector('select[name="parentesco"]')?.value || '',
        rut: formFamiliares.querySelector('input[name="rutFamiliar"]')?.value || '',
        extranjeroSinRut: formFamiliares.querySelector('input[name="extranjeroSinRut"]')?.checked || false,
        nombres: formFamiliares.querySelector('input[name="nombresFamiliar"]')?.value || '',
        apellidoPaterno: formFamiliares.querySelector('input[name="apellidoPaternoFamiliar"]')?.value || '',
        apellidoMaterno: formFamiliares.querySelector('input[name="apellidoMaternoFamiliar"]')?.value || '',
        fechaNacimiento: formFamiliares.querySelector('input[name="fechaNacimientoFamiliar"]')?.value || '',
        genero: formFamiliares.querySelector('select[name="generoFamiliar"]')?.value || '',
        apoderadoSuplente: formFamiliares.querySelector('input[name="apoderadoSuplente"]')?.checked || false,
        // Datos de trabajo
        nombreEmpresa: formFamiliares.querySelector('input[name="nombreEmpresa"]')?.value || '',
        cargoEmpresa: formFamiliares.querySelector('input[name="cargoEmpresa"]')?.value || '',
        direccionTrabajo: formFamiliares.querySelector('input[name="direccionTrabajo"]')?.value || '',
        telefonoTrabajo: formFamiliares.querySelector('input[name="telefonoTrabajo"]')?.value || '',
        telefono: formFamiliares.querySelector('input[name="telefonoFamiliar2"]')?.value || ''
    };
    
    // Obtener familiares adicionales si existen
    const familiares = [familiar1];
    
    // Buscar contenedores de familiares adicionales
    const contenedoresAdicionales = document.querySelectorAll('.datos-familiar');
    contenedoresAdicionales.forEach((contenedor, index) => {
        const numFamiliar = index + 2; // El primer familiar ya está incluido
        
        const familiar = {
            parentesco: contenedor.querySelector(`select[name="parentesco_${numFamiliar}"]`)?.value || '',
            rut: contenedor.querySelector(`input[name="rutFamiliar_${numFamiliar}"]`)?.value || '',
            extranjeroSinRut: contenedor.querySelector(`input[name="extranjeroSinRut_${numFamiliar}"]`)?.checked || false,
            nombres: contenedor.querySelector(`input[name="nombresFamiliar_${numFamiliar}"]`)?.value || '',
            apellidoPaterno: contenedor.querySelector(`input[name="apellidoPaternoFamiliar_${numFamiliar}"]`)?.value || '',
            apellidoMaterno: contenedor.querySelector(`input[name="apellidoMaternoFamiliar_${numFamiliar}"]`)?.value || '',
            fechaNacimiento: contenedor.querySelector(`input[name="fechaNacimientoFamiliar_${numFamiliar}"]`)?.value || '',
            genero: contenedor.querySelector(`select[name="generoFamiliar_${numFamiliar}"]`)?.value || '',
            apoderadoSuplente: contenedor.querySelector(`input[name="apoderadoSuplente_${numFamiliar}"]`)?.checked || false,
            // Datos de trabajo
            nombreEmpresa: contenedor.querySelector(`input[name="nombreEmpresa_${numFamiliar}"]`)?.value || '',
            cargoEmpresa: contenedor.querySelector(`input[name="cargoEmpresa_${numFamiliar}"]`)?.value || '',
            direccionTrabajo: contenedor.querySelector(`input[name="direccionTrabajo_${numFamiliar}"]`)?.value || '',
            telefonoTrabajo: contenedor.querySelector(`input[name="telefonoTrabajo_${numFamiliar}"]`)?.value || '',
            telefono: contenedor.querySelector(`input[name="telefonoFamiliar_${numFamiliar}"]`)?.value || ''
        };
        
        familiares.push(familiar);
    });
    
    // Incluir también la información general familiar
    const infoFamiliar = {
        viveCon: formFamiliares.querySelector('select[name="viveCon"]')?.value || 'Ambos Padres',
        tipoVivienda: formFamiliares.querySelector('select[name="tipoVivienda"]')?.value || '',
        hermanos: formFamiliares.querySelector('input[name="hermanos"]')?.value || '0',
        hermanosEstudiando: formFamiliares.querySelector('input[name="hermanosEstudiando"]')?.value || '0',
        personas: formFamiliares.querySelector('input[name="personas"]')?.value || '1',
        trabajadores: formFamiliares.querySelector('input[name="trabajadores"]')?.value || '0',
        ingresoPesos: formFamiliares.querySelector('input[name="ingresoPesos"]')?.value || '0',
        telefonoFamiliar: formFamiliares.querySelector('input[name="telefonoFamiliar"]')?.value || '',
        nombreContactoFamiliar: formFamiliares.querySelector('input[name="nombreContactoFamiliar"]')?.value || ''
    };
    
    familiares.infoFamiliar = infoFamiliar;
    
    return familiares;
}

function mostrarMensaje(mensaje, tipo = 'info') {
    if (tipo === 'success') {
        alert('✅ ' + mensaje);
    } else if (tipo === 'error') {
        alert('❌ ' + mensaje);
    } else {
        alert('ℹ️ ' + mensaje);
    }
}

function deshabilitarBoton(btn, texto = 'Procesando...') {
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.setAttribute('data-original-text', btn.textContent);
    btn.textContent = texto;
}

function habilitarBoton(btn) {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    if (btn.getAttribute('data-original-text')) {
        btn.textContent = btn.getAttribute('data-original-text');
    }
}

function actualizarEdadApoderado(fechaNacimiento) {
    if (!fechaNacimiento) return;

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const m = hoy.getMonth() - fechaNac.getMonth();

    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }

    const mesesComoFraccion = (12 + hoy.getMonth() - fechaNac.getMonth()) % 12 / 12;
    const edadConDecimal = (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate()))
        ? edad + mesesComoFraccion
        : edad + (hoy.getMonth() - fechaNac.getMonth()) / 12;

    document.getElementById('edadApoderado').textContent = `${edadConDecimal.toFixed(1)} años.`;
}

function reemplazaString(texto, busca, reemplaza) {
    while (texto.indexOf(busca) != -1) {
        texto = texto.replace(busca, reemplaza);
    }
    return texto;
}

async function diagnosticarRespuesta(response, etiqueta) {
    try {
        const copia = response.clone();
        const texto = await copia.text();
        console.log(`=== DIAGNÓSTICO ${etiqueta} ===`);
        console.log(`Estado: ${response.status} ${response.statusText}`);
        console.log("Encabezados:", Object.fromEntries(response.headers.entries()));
        console.log("Cuerpo:", texto);

        try {
            const json = JSON.parse(texto);
            console.log("Como JSON:", json);
            return json;
        } catch (e) {
            console.log("No es JSON válido");
            return texto;
        }
    } catch (error) {
        console.error(`Error al diagnosticar ${etiqueta}:`, error);
        return null;
    }
}

function rutFormateado(rut) {
    if (!rut) return '';
    if (rut.toUpperCase() === 'SIN RUT') return rut;

    rut = rut.toString().replace(/\./g, '').replace(/-/g, '');
    const cuerpo = rut.slice(0, -1) || '';
    const dv = rut.slice(-1).toUpperCase();

    let resultado = '';
    let i = cuerpo.length;
    let contador = 0;

    while (i > 0) {
        resultado = cuerpo.charAt(i - 1) + resultado;
        contador++;
        if (contador === 3 && i > 1) {
            resultado = '.' + resultado;
            contador = 0;
        }
        i--;
    }

    return resultado + '-' + dv;
}

function isRut(x) {
    if (x === "") return true;
    if (x && x.toUpperCase() === 'SIN RUT') return true;

    x = x.toString().replace(/\./g, '').replace(/-/g, '');
    if (x.length < 2) return false;

    const cuerpo = x.slice(0, -1);
    const dv = x.slice(-1).toUpperCase();
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    let dvEsperado = 11 - (suma % 11);
    if (dvEsperado === 11) dvEsperado = '0';
    else if (dvEsperado === 10) dvEsperado = 'K';
    else dvEsperado = dvEsperado.toString();

    return dv === dvEsperado;
}

function validarSoloNumeros() {
    const camposTelefono = document.querySelectorAll('input[name="telefono"], input[name="telefonoApoderado"], input[name="telefonoTrabajoApoderado"], input[name="telefonoFamiliar"], input[name="telefonoFamiliar2"], input[name="telefonoTrabajo"]');

    camposTelefono.forEach(campo => {
        campo.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 9) {
                this.value = this.value.slice(0, 9);
            }
        });

        campo.addEventListener('keypress', function (e) {
            const charCode = (e.which) ? e.which : e.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                e.preventDefault();
                return false;
            }
        });
    });
}

function validarSoloTexto() {
    const camposTexto = document.querySelectorAll('input[name="nombres"], input[name="apellidoPaterno"], input[name="apellidoMaterno"], input[name="nombresApoderado"], input[name="apellidoPaternoApoderado"], input[name="apellidoMaternoApoderado"], input[name="nombreContacto"], input[name="nombresFamiliar"], input[name="apellidoPaternoFamiliar"], input[name="apellidoMaternoFamiliar"], input[name="nombreContactoFamiliar"]');

    camposTexto.forEach(campo => {
        campo.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
        });

        campo.addEventListener('keypress', function (e) {
            const charCode = (e.which) ? e.which : e.keyCode;
            const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/;
            if (!regex.test(String.fromCharCode(charCode))) {
                e.preventDefault();
                return false;
            }
        });
    });
}

function validarCamposNumericos() {
    const camposNumericos = document.querySelectorAll('input[name="hermanos"], input[name="hermanosEstudiando"], input[name="personas"], input[name="trabajadores"], input[name="ingresoPesos"], input[name="antiguedadApoderado"], input[name="sueldoApoderado"]');

    camposNumericos.forEach(campo => {
        campo.type = 'text';

        campo.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            this.value = this.value.replace(/e/gi, '');

            if (this.value !== '') {
                const num = parseInt(this.value);

                if (this.name === 'hermanos' || this.name === 'hermanosEstudiando') {
                    if (num > 99) this.value = '99';
                } else if (this.name === 'personas' || this.name === 'trabajadores') {
                    if (num > 99) this.value = '99';
                }
            }
        });

        campo.addEventListener('keypress', function (e) {
            const charCode = (e.which) ? e.which : e.keyCode;
            if (charCode === 101 || charCode === 69 || (charCode > 31 && (charCode < 48 || charCode > 57))) {
                e.preventDefault();
                return false;
            }
        });

        campo.addEventListener('paste', function (e) {
            let pasteData = (e.clipboardData || window.clipboardData).getData('text');
            if (/[^0-9]/.test(pasteData)) {
                e.preventDefault();
                return false;
            }
        });
    });
}

function actualizarCamposHermanos() {
    const numeroHermanos = parseInt(this.value) || 0;
    const contenedorHermanos1 = document.getElementById('contenedor-hermanos');
    const contenedorHermanos2 = document.getElementById('contenedor-hermanos-2');

    contenedorHermanos1.innerHTML = '';
    contenedorHermanos2.innerHTML = '';

    for (let i = 1; i <= numeroHermanos; i++) {
        const fieldHTML = `
            <div class="field">
                <label class="label">Hermano Nro ${i}</label>
                <div class="control">
                    <input class="input" type="number" name="añoHermano${i}" value="${2023 - 20 - i}" min="1950" max="2025">
                </div>
            </div>
        `;

        if (i <= Math.ceil(numeroHermanos / 2)) {
            contenedorHermanos1.innerHTML += fieldHTML;
        } else {
            contenedorHermanos2.innerHTML += fieldHTML;
        }
    }
}

function manejarCheckboxSinRut() {
    const campoRut = document.getElementById('rutFamiliar');
    if (this.checked) {
        campoRut.value = 'SIN RUT';
        campoRut.disabled = true;
    } else {
        campoRut.value = '';
        campoRut.disabled = false;
    }
}

function manejarCheckboxSinInformacion() {
    const establecimientoSelect = document.getElementById('idEstablecimientoAnterior');
    if (this.checked) {
        establecimientoSelect.value = "-1"; // Opción "SIN INFORMACIÓN"
        establecimientoSelect.disabled = true;
    } else {
        establecimientoSelect.value = "";
        establecimientoSelect.disabled = false;
    }
}

function copiarDatosFamiliarComoApoderado(e) {
    e.preventDefault();

    console.log("Iniciando copia de datos de familiar a apoderado...");

    // Obtener los valores de los campos del familiar
    // Usar selectores más flexibles que coincidan con la estructura de la página
    const parentescoSelect = document.querySelector('select[name^="parentesco"]');
    const nombresFamiliarInput = document.querySelector('input[name^="nombresFamiliar"]');
    const apellidoPaternoFamiliarInput = document.querySelector('input[name^="apellidoPaternoFamiliar"]');
    const apellidoMaternoFamiliarInput = document.querySelector('input[name^="apellidoMaternoFamiliar"]');
    const rutFamiliarInput = document.querySelector('input[name^="rutFamiliar"]');
    const extranjeroCheckbox = document.querySelector('input[type="checkbox"][name^="extranjeroSinRut"]');
    const fechaNacimientoInput = document.querySelector('input[type="date"][name^="fechaNacimientoFamiliar"]');
    const generoSelect = document.querySelector('select:has(option[value="Masculino"])');

    // Verificar si encontramos los elementos necesarios
    if (!nombresFamiliarInput || !apellidoPaternoFamiliarInput || !apellidoMaternoFamiliarInput) {
        console.error("No se encontraron los campos del familiar necesarios", {
            nombres: nombresFamiliarInput,
            apellidoPaterno: apellidoPaternoFamiliarInput,
            apellidoMaterno: apellidoMaternoFamiliarInput
        });
        mostrarMensaje("Error al encontrar los campos del familiar. Por favor contacte al administrador.", "error");
        return;
    }

    // Verificar que los campos obligatorios tengan datos
    if (!nombresFamiliarInput.value || !apellidoPaternoFamiliarInput.value) {
        mostrarMensaje("Por favor complete al menos nombres y apellido paterno del familiar antes de copiar", "error");
        return;
    }

    console.log("Datos encontrados del familiar:", {
        parentesco: parentescoSelect?.value,
        nombres: nombresFamiliarInput.value,
        apellidoPaterno: apellidoPaternoFamiliarInput.value,
        apellidoMaterno: apellidoMaternoFamiliarInput.value
    });

    try {
        // Copiar datos al apoderado
        if (parentescoSelect) {
            const tipoApoderadoSelect = document.querySelector('select[name="tipoApoderado"]');
            if (tipoApoderadoSelect) {
                tipoApoderadoSelect.value = parentescoSelect.value;
            }
        }

        // Asignar valores a los campos de apoderado
        asignarValorSeguro('input[name="nombresApoderado"]', nombresFamiliarInput.value);
        asignarValorSeguro('input[name="apellidoPaternoApoderado"]', apellidoPaternoFamiliarInput.value);
        asignarValorSeguro('input[name="apellidoMaternoApoderado"]', apellidoMaternoFamiliarInput.value);

        if (rutFamiliarInput) {
            asignarValorSeguro('input[name="rutApoderado"]', rutFamiliarInput.value);
        }

        // Manejar checkbox de extranjero sin RUT
        if (extranjeroCheckbox) {
            const extranjeroApoderado = document.querySelector('input[name="extranjeroSinRutApoderado"]');
            if (extranjeroApoderado) {
                extranjeroApoderado.checked = extranjeroCheckbox.checked;
            }
        }

        // Copiar género
        if (generoSelect && generoSelect.value) {
            const generoValue = generoSelect.value;
            const radioGenero = document.querySelector(`input[name="generoApoderado"][value="${generoValue}"]`);
            if (radioGenero) {
                radioGenero.checked = true;
            }
        }

        // Copiar fecha de nacimiento
        if (fechaNacimientoInput && fechaNacimientoInput.value) {
            asignarValorSeguro('input[name="fechaNacimientoApoderado"]', fechaNacimientoInput.value);
            actualizarEdadApoderado(fechaNacimientoInput.value);
        }

        // Copiar datos de trabajo
        asignarValorSeguro('input[name="empresaApoderado"]', document.querySelector('input[name="nombreEmpresa"]')?.value || '');
        asignarValorSeguro('input[name="cargoApoderado"]', document.querySelector('input[name="cargoEmpresa"]')?.value || '');
        asignarValorSeguro('input[name="direccionTrabajoApoderado"]', document.querySelector('input[name="direccionTrabajo"]')?.value || '');
        asignarValorSeguro('input[name="telefonoTrabajoApoderado"]', document.querySelector('input[name="telefonoTrabajo"]')?.value || '');

        // Copiar teléfono
        asignarValorSeguro('input[name="telefonoApoderado"]', document.querySelector('input[name^="telefonoFamiliar"]')?.value || '');

        console.log("Datos copiados exitosamente");

        // Cambiar a pestaña de apoderado - usando múltiples estrategias
        const tabApoderado = document.querySelector('[data-tab="datos-apoderado"]');
        if (tabApoderado) {
            console.log("Cambiando a pestaña de apoderado mediante data-tab");
            tabApoderado.click();
        } else {
            // Intentar encontrar el tab por texto
            const tabs = document.querySelectorAll('.tabs ul li');
            for (const tab of tabs) {
                if (tab.textContent.includes('Apoderado')) {
                    console.log("Cambiando a pestaña de apoderado mediante texto");
                    tab.click();
                    break;
                }
            }
        }

        mostrarMensaje("Datos copiados al apoderado correctamente", "success");
    } catch (error) {
        console.error("Error al copiar datos:", error);
        mostrarMensaje("Error al copiar los datos: " + error.message, "error");
    }
}

// Función auxiliar para asignar valores de manera segura
function asignarValorSeguro(selector, valor) {
    const elemento = document.querySelector(selector);
    if (elemento) {
        elemento.value = valor;
        // Disparar evento de cambio para activar cualquier listener
        const event = new Event('change', { bubbles: true });
        elemento.dispatchEvent(event);
    }
}

function agregarFamiliarAdicional(e) {
    e.preventDefault();

    // Verificar campos obligatorios
    const campos = ['parentesco', 'nombresFamiliar', 'apellidoPaternoFamiliar', 'apellidoMaternoFamiliar'];
    let faltanCampos = false;

    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (!elemento.value) {
            elemento.classList.add('is-danger');
            faltanCampos = true;
        } else {
            elemento.classList.remove('is-danger');
        }
    });

    if (faltanCampos) {
        mostrarMensaje("Por favor complete todos los campos requeridos del familiar actual", "error");
        return;
    }

    // Contador de familiares (empezamos con el 2 porque ya tenemos el familiar 1)
    const contadorFamiliares = document.querySelectorAll('.datos-familiar').length + 2;

    // HTML para un nuevo familiar - el código HTML queda igual
    const nuevoFamiliarHTML = `
        <div class="datos-familiar" id="familiar-${contadorFamiliares}">
            <div class="header-section mt-5">DATOS FAMILIAR ${contadorFamiliares}</div>
            <div class="columns">
                <div class="column is-half">
                    <div class="field">
                        <label class="label required">Parentesco</label>
                        <div class="control">
                            <div class="select is-fullwidth">
                                <select name="parentesco_${contadorFamiliares}">
                                    <option value="">** Seleccione **</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Madre">Madre</option>
                                    <option value="Hermano/a">Hermano/a</option>
                                    <option value="Abuelo/a">Abuelo/a</option>
                                    <option value="Tío/a">Tío/a</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <div class="control">
                            <button type="button" class="button is-danger is-light" onclick="eliminarFamiliar(${contadorFamiliares})">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns is-multiline">
                <!-- Campos del familiar -->
                <div class="column is-half">
                    <div class="field">
                        <label class="label required">RUT</label>
                        <div class="control">
                            <input class="input" type="text" name="rutFamiliar_${contadorFamiliares}" placeholder="Ej: 12.345.678-9">
                            <label class="checkbox ml-2">
                                <input type="checkbox" name="extranjeroSinRut_${contadorFamiliares}" onchange="marcarSinRut(this, ${contadorFamiliares})">
                                Extranjero sin Rut
                            </label>
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <label class="label">Apoderado Suplente</label>
                        <div class="control">
                            <input type="checkbox" name="apoderadoSuplente_${contadorFamiliares}">
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <label class="label required">Nombres</label>
                        <div class="control">
                            <input class="input" type="text" name="nombresFamiliar_${contadorFamiliares}">
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <label class="label required">Apellido Paterno</label>
                        <div class="control">
                            <input class="input" type="text" name="apellidoPaternoFamiliar_${contadorFamiliares}">
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <label class="label">Apellido Materno</label>
                        <div class="control">
                            <input class="input" type="text" name="apellidoMaternoFamiliar_${contadorFamiliares}">
                        </div>
                    </div>
                </div>
                <div class="column is-half">
                    <div class="field">
                        <label class="label">Fecha Nacimiento</label>
                        <div class="control">
                            <input class="input" type="date" name="fechaNacimientoFamiliar_${contadorFamiliares}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('familiares-adicionales').insertAdjacentHTML('beforeend', nuevoFamiliarHTML);
    mostrarMensaje(`Se ha agregado el familiar ${contadorFamiliares}`, "success");
}

function autocompletarApoderadoDesdeParentesco() {
    try {
        const tipoApoderadoSelect = document.getElementById('tipoApoderado');
        const seleccion = tipoApoderadoSelect.value;
        
        console.log("Tipo de apoderado seleccionado:", seleccion);
        if (!seleccion) return;
        
        // Mapeo de valores de texto a valores del parentesco en la base de datos
        const mapaParentescos = {
            "Padre": "1",
            "Madre": "2",
            "Abuelo/a": "3",
            "Tío/a": "5",
            "Otro": "6"
        };
        
        const valorParentesco = mapaParentescos[seleccion];
        console.log("Buscando familiar con parentesco valor:", valorParentesco);
        
        // Buscar el familiar con el parentesco correspondiente
        const familiarSelect = document.querySelector('select[name="parentesco"]');
        if (familiarSelect && (familiarSelect.value === valorParentesco || familiarSelect.value === seleccion)) {
            // Copiar datos al apoderado
            const nombresFamiliar = document.querySelector('input[name="nombresFamiliar"]').value || '';
            const apellidoPaterno = document.querySelector('input[name="apellidoPaternoFamiliar"]').value || '';
            const apellidoMaterno = document.querySelector('input[name="apellidoMaternoFamiliar"]').value || '';
            const rutFamiliar = document.querySelector('input[name="rutFamiliar"]').value || '';
            const esSinRut = document.querySelector('input[name="extranjeroSinRut"]')?.checked || false;
            
            // Asignar valores al apoderado
            document.querySelector('input[name="nombresApoderado"]').value = nombresFamiliar;
            document.querySelector('input[name="apellidoPaternoApoderado"]').value = apellidoPaterno;
            document.querySelector('input[name="apellidoMaternoApoderado"]').value = apellidoMaterno;
            document.querySelector('input[name="rutApoderado"]').value = rutFamiliar;
            
            // Checkbox de extranjero sin RUT
            const apoderadoSinRut = document.querySelector('input[name="extranjeroSinRutApoderado"]');
            if (apoderadoSinRut) apoderadoSinRut.checked = esSinRut;
            
            // Género
            const generoFamiliar = document.querySelector('select[name="generoFamiliar"]')?.value;
            if (generoFamiliar) {
                const generoMasculino = document.querySelector('input[name="generoApoderado"][value="1"]');
                const generoFemenino = document.querySelector('input[name="generoApoderado"][value="2"]');
                
                if (generoFamiliar === "1" && generoMasculino) generoMasculino.checked = true;
                else if (generoFamiliar === "2" && generoFemenino) generoFemenino.checked = true;
            }
            
            // Datos adicionales
            document.querySelector('input[name="empresaApoderado"]').value = document.querySelector('input[name="nombreEmpresa"]')?.value || '';
            document.querySelector('input[name="cargoApoderado"]').value = document.querySelector('input[name="cargoEmpresa"]')?.value || '';
            document.querySelector('input[name="direccionTrabajoApoderado"]').value = document.querySelector('input[name="direccionTrabajo"]')?.value || '';
            document.querySelector('input[name="telefonoTrabajoApoderado"]').value = document.querySelector('input[name="telefonoTrabajo"]')?.value || '';
            document.querySelector('input[name="telefonoApoderado"]').value = document.querySelector('input[name="telefonoFamiliar2"]')?.value || '';
            
            // Mostrar mensaje de éxito
            mostrarToast(`Datos del familiar (${seleccion}) copiados como apoderado`, 'is-success');
        } else {
            mostrarToast(`No se encontró un familiar con parentesco ${seleccion}`, 'is-warning');
        }
    } catch (error) {
        console.error("Error al autocompletar apoderado:", error);
        mostrarToast('Error al autocompletar los datos del apoderado', 'is-danger');
    }
}

function cargarEstablecimientos() {
    fetch('/obtener-establecimientos')
        .then(response => response.json())
        .then(establecimientos => {
            const selectEstablecimiento = document.getElementById('idEstablecimientoAnterior');
            if (selectEstablecimiento) {
                selectEstablecimiento.innerHTML = '<option value="">Seleccione establecimiento</option>';
                selectEstablecimiento.innerHTML += '<option value="-1">SIN INFORMACIÓN</option>';

                establecimientos.forEach(est => {
                    const option = document.createElement('option');
                    option.value = est.id_establecimiento;
                    option.textContent = `${est.nombre} ${est.rbd ? `(RBD: ${est.rbd})` : ''}`;
                    selectEstablecimiento.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar establecimientos:', error);
        });
}

function cargarComunas() {
    fetch('/obtener-comunas')
        .then(response => response.json())
        .then(comunas => {
            const comunaSelect = document.querySelector('select[name="idComuna"]');
            const comunaApoderadoSelect = document.querySelector('select[name="idComunaApoderado"]');

            if (comunaSelect) {
                comunaSelect.innerHTML = '<option value="">Seleccione comuna</option>';
                let regionesUnicas = [...new Set(comunas.map(c => c.region))].sort();

                regionesUnicas.forEach(region => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = region;

                    comunas.filter(c => c.region === region).forEach(comuna => {
                        const option = document.createElement('option');
                        option.value = comuna.id_comuna;
                        option.textContent = comuna.comuna;
                        optgroup.appendChild(option);
                    });

                    comunaSelect.appendChild(optgroup);
                });
            }

            // También llenar el select de comunas del apoderado
            if (comunaApoderadoSelect) {
                comunaApoderadoSelect.innerHTML = comunaSelect ? comunaSelect.innerHTML : '<option value="">Seleccione comuna</option>';
            }
        })
        .catch(error => {
            console.error('Error al cargar comunas:', error);
        });
}

function cargarNacionalidades() {
    fetch('/obtener-nacionalidades')
        .then(response => response.json())
        .then(nacionalidades => {
            const nacionalidadSelect = document.querySelector('select[name="idNacionalidad"]');
            if (nacionalidadSelect) {
                nacionalidadSelect.innerHTML = '<option value="">Seleccione nacionalidad</option>';

                // Poner Chile primero si existe
                const chileIndex = nacionalidades.findIndex(n => n.nacionalidad === 'Chilena');
                if (chileIndex !== -1) {
                    const chile = nacionalidades.splice(chileIndex, 1)[0];
                    nacionalidades.unshift(chile);
                }

                nacionalidades.forEach(nac => {
                    const option = document.createElement('option');
                    option.value = nac.id_nacionalidad;
                    option.textContent = nac.nacionalidad;
                    nacionalidadSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar nacionalidades:', error);
        });
}

function cargarMotivosPostulacion() {
    // Usamos ruta correcta y manejo apropiado de errores
    fetch('/obtener-motivos-postulacion')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(motivos => {
            const motivoSelect = document.querySelector('select[name="motivoPostulacion"]');
            if (motivoSelect) {
                motivoSelect.innerHTML = '<option value="">*** SELECCIONE UNA OPCIÓN ***</option>';

                // Verificamos que hay datos
                if (motivos && Array.isArray(motivos) && motivos.length > 0) {
                    motivos.forEach(motivo => {
                        const option = document.createElement('option');
                        option.value = motivo.id_motivo || motivo.id;
                        option.textContent = motivo.descripcion || motivo.nombre;
                        motivoSelect.appendChild(option);
                    });
                    console.log(`Cargados ${motivos.length} motivos de postulación`);
                } else {
                    console.warn("No se recibieron motivos de postulación o el formato es incorrecto");
                    
                    // Añadimos algunos valores por defecto
                    const valoresPorDefecto = [
                        {id: 1, nombre: "Recomendación familiar"},
                        {id: 2, nombre: "Cercanía al domicilio"},
                        {id: 3, nombre: "Proyecto educativo"},
                        {id: 4, nombre: "Prestigio académico"},
                        {id: 5, nombre: "Valores y formación"}
                    ];
                    
                    valoresPorDefecto.forEach(motivo => {
                        const option = document.createElement('option');
                        option.value = motivo.id;
                        option.textContent = motivo.nombre;
                        motivoSelect.appendChild(option);
                    });
                }
            } else {
                console.warn("No se encontró el selector de motivo de postulación");
            }
        })
        .catch(error => {
            console.error('Error al cargar motivos de postulación:', error);
            
            // Si falla la carga, añadimos valores por defecto
            const motivoSelect = document.querySelector('select[name="motivoPostulacion"]');
            if (motivoSelect) {
                motivoSelect.innerHTML = '<option value="">*** SELECCIONE UNA OPCIÓN ***</option>';
                const valoresPorDefecto = [
                    {id: 1, nombre: "Recomendación familiar"},
                    {id: 2, nombre: "Cercanía al domicilio"},
                    {id: 3, nombre: "Proyecto educativo"},
                    {id: 4, nombre: "Prestigio académico"},
                    {id: 5, nombre: "Valores y formación"}
                ];
                
                valoresPorDefecto.forEach(motivo => {
                    const option = document.createElement('option');
                    option.value = motivo.id;
                    option.textContent = motivo.nombre;
                    motivoSelect.appendChild(option);
                });
            }
        });
}

function cargarPlanesAcademicos() {
    fetch('/obtener-planes')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(planes => {
            const selectPlan = document.getElementById('plan');
            if (selectPlan) {
                selectPlan.innerHTML = '<option value="">Seleccione un plan</option>';

                if (planes && planes.length > 0) {
                    // Ordenar planes por nombre/descripción
                    planes.sort((a, b) => {
                        const textoA = a.nombre_plan || a.descripcion || '';
                        const textoB = b.nombre_plan || b.descripcion || '';
                        return textoA.localeCompare(textoB);
                    });

                    // Agregar todos los planes al select
                    planes.forEach(plan => {
                        const option = document.createElement('option');
                        option.value = plan.id_plan;
                        option.textContent = plan.nombre_plan || plan.descripcion;
                        selectPlan.appendChild(option);
                    });

                    console.log(`Cargados ${planes.length} planes académicos`);
                } else {
                    console.warn("No se encontraron planes académicos");
                }
            } else {
                console.error("No se encontró el elemento 'plan'");
            }
        })
        .catch(error => {
            console.error('Error al cargar planes académicos:', error);
            const selectPlan = document.getElementById('plan');
            if (selectPlan) {
                selectPlan.innerHTML = '<option value="">Error al cargar planes</option>';
            }
        });
}

function cargarTodosLosCursos() {
    // Intentar usar el año 2025 por defecto
    fetch('/obtener-cursos?anio=2025')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(cursos => {
            // Cambio de cursosSelect a idCurso
            const cursosSelect = document.getElementById('idCurso');
            if (cursosSelect) {
                cursosSelect.innerHTML = '<option value="">-- Seleccione curso --</option>';

                if (cursos && cursos.length > 0) {
                    // Crear un array para agrupar por nivel
                    const nivelesPorCurso = {};

                    // Agrupar los cursos por nivel (extraer parte numérica)
                    cursos.forEach(curso => {
                        // Extraer el nivel básico (ej: "1° BÁSICO" de "1° BÁSICO A")
                        const nivelMatch = curso.nombre_curso.match(/^([0-9]+[°º]?\s+[A-ZÁ-ÚÑ]+)/i);
                        const nivel = nivelMatch ? nivelMatch[0] : curso.nombre_curso;

                        // Agrupar por nivel
                        if (!nivelesPorCurso[nivel]) {
                            nivelesPorCurso[nivel] = [];
                        }

                        nivelesPorCurso[nivel].push(curso);
                    });

                    // Obtener niveles ordenados
                    const niveles = Object.keys(nivelesPorCurso).sort((a, b) => {
                        // Extraer números de niveles para ordenar correctamente
                        const numA = parseInt(a.match(/\d+/) || [0]);
                        const numB = parseInt(b.match(/\d+/) || [0]);

                        return numA - numB;
                    });

                    // Crear optgroup para cada nivel
                    niveles.forEach(nivel => {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = nivel;

                        // Agregar cada curso de este nivel
                        nivelesPorCurso[nivel].forEach(curso => {
                            const option = document.createElement('option');
                            option.value = curso.id_curso;
                            option.textContent = curso.nombre_curso;
                            optgroup.appendChild(option);
                        });

                        cursosSelect.appendChild(optgroup);
                    });

                    console.log(`Cargados ${cursos.length} cursos agrupados por nivel`);
                } else {
                    console.warn("No se encontraron cursos");
                }
            } else {
                // Mensaje de error actualizado
                console.warn("No se encontró el elemento 'idCurso'");
            }
        })
        .catch(error => {
            console.error('Error al cargar cursos:', error);
            // Si falla con el año 2025, intentar obtener todos los cursos
            fetch('/obtener-cursos')
                .then(response => response.json())
                .then(cursos => {
                    // También actualizar aquí idCurso
                    const cursosSelect = document.getElementById('idCurso');
                    if (cursosSelect && cursos.length > 0) {
                        cursosSelect.innerHTML = '<option value="">-- Seleccione curso --</option>';
                        cursos.forEach(curso => {
                            const option = document.createElement('option');
                            option.value = curso.id_curso;
                            option.textContent = curso.nombre_curso;
                            cursosSelect.appendChild(option);
                        });
                    }
                })
                .catch(err => console.error('Error al obtener todos los cursos:', err));
        });
}

function cargarAniosAcademicos() {
    fetch('/obtener-anos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(anios => {
            const aniosSelect = document.getElementById('idAno');
            if (aniosSelect) {
                aniosSelect.innerHTML = '<option value="">-- Seleccione año académico --</option>';

                anios.forEach(anio => {
                    const option = document.createElement('option');
                    option.value = anio.id_ano;
                    option.textContent = anio.nombre_ano;
                    aniosSelect.appendChild(option);
                });

                // Después de cargar los años, precargar 2025 si está disponible
                precargarAnio2025();
            }
        })
        .catch(error => {
            console.error('Error al cargar años académicos:', error);
        });
}

function precargarAnio2025() {
    const selectAnio = document.getElementById('idAno'); // CORREGIDO: anioIngreso -> idAno
    if (!selectAnio || !selectAnio.options || selectAnio.options.length <= 1) {
        console.error("Elemento 'idAno' no disponible o sin opciones"); // CORREGIDO: anioIngreso -> idAno
        return;
    }

    // Buscar la opción que contiene "2025"
    let encontrado = false;
    for (let i = 0; i < selectAnio.options.length; i++) {
        if (selectAnio.options[i].textContent.includes('2025')) {
            selectAnio.selectedIndex = i;
            encontrado = true;

            // Disparar el evento change manualmente para cargar cursos
            const event = new Event('change');
            selectAnio.dispatchEvent(event);
            break;
        }
    }

    if (!encontrado) {
        console.warn("No se encontró el año 2025 en las opciones");
    }
}

function validarDatosPersonales() {
    // Validar campos obligatorios de datos personales
    const camposObligatorios = [
        {name: 'nombres', label: 'Nombres'},
        {name: 'apellidoPaterno', label: 'Apellido Paterno'},
        {name: 'apellidoMaterno', label: 'Apellido Materno'},
        {name: 'idAno', label: 'Año de Ingreso'},
        {name: 'idCurso', label: 'Curso'}
    ];

    for (const campo of camposObligatorios) {
        const elemento = document.querySelector(`[name="${campo.name}"]`);
        if (!elemento || !elemento.value.trim()) {
            mostrarToast(`El campo ${campo.label} es obligatorio`, 'is-danger');
            return false;
        }
    }

    // Validar RUT (si no es extranjero sin RUT)
    const sinRut = document.querySelector('input[name="sinRut"]')?.checked;
    const rut = document.querySelector('input[name="rut"]')?.value;

    if (!sinRut && (!rut || !isRut(rut.trim()))) {
        mostrarToast('El RUT no es válido', 'is-danger');
        return false;
    }

    return true;
}

function validarDatosApoderado() {
    // Validar campos obligatorios del apoderado
    const camposObligatorios = [
        {name: 'nombresApoderado', label: 'Nombres del apoderado'},
        {name: 'apellidoPaternoApoderado', label: 'Apellido Paterno del apoderado'},
        {name: 'apellidoMaternoApoderado', label: 'Apellido Materno del apoderado'}
    ];

    for (const campo of camposObligatorios) {
        const elemento = document.querySelector(`[name="${campo.name}"]`);
        if (!elemento || !elemento.value.trim()) {
            mostrarToast(`El campo ${campo.label} es obligatorio`, 'is-danger');
            return false;
        }
    }

    // Validar RUT del apoderado (si no está marcado como extranjero sin RUT)
    const extranjeroSinRut = document.querySelector('input[name="extranjeroSinRutApoderado"]')?.checked;
    const rutApoderado = document.querySelector('input[name="rutApoderado"]')?.value;
    
    if (!extranjeroSinRut && rutApoderado && !isRut(rutApoderado.trim())) {
        mostrarToast('El RUT del apoderado no es válido', 'is-danger');
        return false;
    }

    return true;
}

function cargarCursosPorAnio(idAno) {
    // Primero obtener el nombre del año usando idAno
    fetch(`/obtener-nombre-ano?id=${idAno}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.nombre_ano) {
                return fetch(`/obtener-cursos?anio=${data.nombre_ano}`);
            } else {
                return fetch('/obtener-cursos'); // sin filtro por año si no hay nombre
            }
        })
        .then(response => response.json())
        .then(cursos => {
            // Aquí va tu código para procesar los cursos
            const selectCurso = document.getElementById('idCurso');
            selectCurso.innerHTML = '<option value="">Seleccione un curso</option>';

            cursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = curso.id_curso;
                option.textContent = curso.nombre_curso;
                selectCurso.appendChild(option);
            });
        })
        .catch(error => console.error('Error al cargar cursos:', error));
}

function copiarDatosComoApoderado() {
    try {
        console.log("Iniciando copia de datos como apoderado...");
        
        // Obtener valores con manejo seguro de errores
        const getValueSafely = (selector) => {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Elemento no encontrado: ${selector}`);
                return '';
            }
            return element.value || '';
        };
        
        const setValueSafely = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Elemento destino no encontrado: ${selector}`);
                return false;
            }
            element.value = value;
            return true;
        };
        
        // Obtener valores del formulario de alumno
        const nombres = getValueSafely('input[name="nombres"]');
        const apellidoPaterno = getValueSafely('input[name="apellidoPaterno"]');
        const apellidoMaterno = getValueSafely('input[name="apellidoMaterno"]');
        const rut = getValueSafely('input[name="rut"]');
        const telefono = getValueSafely('input[name="telefono"]');
        const email = getValueSafely('input[name="email"]');
        
        console.log("Datos obtenidos correctamente:", {
            nombres, apellidoPaterno, apellidoMaterno, rut, telefono, email
        });
        
        // Establecer valores en el formulario de apoderado
        let exito = true;
        exito &= setValueSafely('input[name="nombresApoderado"]', nombres);
        exito &= setValueSafely('input[name="apellidoPaternoApoderado"]', apellidoPaterno);
        exito &= setValueSafely('input[name="apellidoMaternoApoderado"]', apellidoMaterno);
        exito &= setValueSafely('input[name="rutApoderado"]', rut);
        exito &= setValueSafely('input[name="telefonoApoderado"]', telefono);
        exito &= setValueSafely('input[name="emailApoderado"]', email);
        
        // Intentar obtener el género seleccionado
        try {
            const generoRadio = document.querySelector('input[name="genero"]:checked');
            if (generoRadio) {
                const generoValue = generoRadio.value;
                const generoApoderadoRadio = document.querySelector(`input[name="generoApoderado"][value="${generoValue}"]`);
                if (generoApoderadoRadio) {
                    generoApoderadoRadio.checked = true;
                }
            }
        } catch (error) {
            console.warn("Error al copiar el género:", error);
        }
        
        // Activar pestaña de apoderado
        const tabApoderado = document.querySelector('[data-tab="datos-apoderado"]');
        if (tabApoderado) {
            tabApoderado.click();
            console.log("Pestaña de apoderado activada mediante clic directo");
        } else {
            console.error("No se pudo encontrar la pestaña de apoderado");
        }
        
        console.log("Datos copiados con " + (exito ? "éxito" : "algunos errores"));
        
        // Mostrar mensaje de confirmación
        mostrarToast('Datos copiados del alumno al apoderado', 'is-success');
        
    } catch (error) {
        console.error("Error al copiar datos como apoderado:", error);
        mostrarToast('Ocurrió un error al copiar los datos. Por favor, inténtalo nuevamente.', 'is-danger');
    }
}