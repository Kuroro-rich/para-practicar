document.addEventListener('DOMContentLoaded', function() {
    inicializarAplicacion();
});

function inicializarAplicacion() {
    if (document.getElementById('anioIngreso')) {
        cargarAnosAcademicos();
        // precargarAnio2025() se llama desde cargarAnosAcademicos() para evitar duplicación
    } else {
        console.error("Elemento 'anioIngreso' no encontrado");
    }
    
    cargarEstablecimientos();
    cargarComunas();
    cargarNacionalidades();
    cargarTodosLosCursos(); // Añadir esta línea
    cargarPlanesAcademicos();
    configurarEventos();
    configurarSistemaPestanas();
    validarSoloNumeros();
    validarSoloTexto();
    validarCamposNumericos();
}

function configurarEventos() {
    // Evento para actualizar edad del apoderado
    const fechaNacApoderado = document.querySelector('input[name="fechaNacimientoApoderado"]');
    if (fechaNacApoderado) {
        fechaNacApoderado.addEventListener('change', function() {
            actualizarEdadApoderado(this.value);
        });
    }
    
    // Evento para guardar el formulario
    const btnGuardar = document.getElementById("guardar");
    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardarRegistroCompleto);
    }

    // Evento para cargar cursos al cambiar año académico
    const selectAnio = document.getElementById('anioIngreso');
    if (selectAnio) {
        selectAnio.addEventListener('change', function() {
            /* 
            const idAnio = this.value;
            if (!idAnio) return;
            
            const cursosSelect = document.getElementById('cursosSelect');
            if (cursosSelect) {
                cursosSelect.innerHTML = '<option value="">-- Seleccione un curso --</option>';
                
                fetch(`/api/cursos?id_ano=${idAnio}`)
                    .then(response => response.json())
                    .then(cursos => {
                        if (cursos && Array.isArray(cursos)) {
                            cursos.forEach(curso => {
                                const option = document.createElement('option');
                                option.value = curso.id_curso;
                                option.textContent = curso.nombre_curso;
                                cursosSelect.appendChild(option);
                            });
                        } else {
                            console.error("Formato incorrecto en respuesta de cursos:", cursos);
                        }
                    })
                    .catch(error => console.error('Error al cargar cursos:', error));
            } else {
                console.error("Elemento 'cursosSelect' no encontrado");
            }
            */
        });
    }
    
    // Otros eventos específicos
    const hermanos = document.querySelector('input[name="hermanos"]');
    if (hermanos) {
        hermanos.addEventListener('change', actualizarCamposHermanos);
    }
    
    const sinRutCheckbox = document.querySelector('input[name="sinRut"]');
    if (sinRutCheckbox) {
        sinRutCheckbox.addEventListener('change', manejarCheckboxSinRut);
    }
    
    const sinInfoCheckbox = document.querySelector('input[name="sinInformacion"]');
    if (sinInfoCheckbox) {
        sinInfoCheckbox.addEventListener('change', manejarCheckboxSinInformacion);
    }
    
    // Corregir el selector para el botón "Copiar como Apoderado"
    const btnCopiarFamiliar = document.getElementById('btnCopiarComoApoderado');
    if (btnCopiarFamiliar) {
        console.log("Botón 'Copiar como Apoderado' encontrado, asignando evento");
        btnCopiarFamiliar.addEventListener('click', copiarDatosFamiliarComoApoderado);
    } else {
        console.error("No se encontró el botón 'Copiar como Apoderado'");
    }
    
    const btnAgregarFamiliar = document.getElementById('agregarFamiliar');
    if (btnAgregarFamiliar) {
        btnAgregarFamiliar.addEventListener('click', agregarFamiliarAdicional);
    }
    
    const selectTipoApoderado = document.querySelector('select[name="tipoApoderado"]');
    if (selectTipoApoderado) {
        selectTipoApoderado.addEventListener('change', autocompletarApoderadoDesdeParentesco);
    }
}

/**
 * Configura el sistema de navegación por pestañas
 */
function configurarSistemaPestanas() {
    const tabs = document.querySelectorAll(".tabs ul li");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("is-active"));
            tabContents.forEach(tc => tc.classList.remove("is-active"));
            tab.classList.add("is-active");
            const target = tab.getAttribute("data-tab");
            document.getElementById(target).classList.add("is-active");
        });
    });
}

/**
 * Muestra mensaje al usuario
 */
function mostrarMensaje(mensaje, tipo = 'info') {
    if (tipo === 'success') {
        alert('✅ ' + mensaje);
    } else if (tipo === 'error') {
        alert('❌ ' + mensaje);
    } else {
        alert('ℹ️ ' + mensaje);
    }
}

/**
 * Control de botones durante operaciones
 */
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

/**
 * Actualiza la edad del apoderado basado en la fecha de nacimiento
 */
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

/**
 * Funciones de utilidad para texto
 */
function reemplazaString(texto, busca, reemplaza) {
    while (texto.indexOf(busca) != -1) {
        texto = texto.replace(busca, reemplaza);
    }
    return texto;
}

/**
 * Diagnóstico de respuestas para depuración
 */
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

/**
 * Formatea un RUT con puntos y guión
 */
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

/**
 * Valida un RUT chileno
 * @param {string} x - RUT a validar
 * @returns {boolean} true si el RUT es válido
 */
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

/**
 * Aplica validación de RUT en formularios
 */
function validaRut(rut) {
    const formDatosPersonales = document.getElementById("form-datos-personales");
    const rutInput = formDatosPersonales.querySelector('input[name="rut"]');
    const sinRutCheckbox = formDatosPersonales.querySelector('input[name="sinRut"]');

    rutInput.value = rutFormateado(rut);

    if (!sinRutCheckbox.checked) {
        if (!isRut(rutInput.value)) {
            alert("RUT inválido");
            rutInput.focus();
            rutInput.select();
            rutInput.value = "";
            return false;
        }
    }

    return true;
}

/**
 * Validaciones de campos
 */
function validarSoloNumeros() {
    const camposTelefono = document.querySelectorAll('input[name="telefono"], input[name="telefonoApoderado"], input[name="telefonoTrabajoApoderado"], input[name="telefonoFamiliar"], input[name="telefonoFamiliar2"], input[name="telefonoTrabajo"]');

    camposTelefono.forEach(campo => {
        campo.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 9) {
                this.value = this.value.slice(0, 9);
            }
        });

        campo.addEventListener('keypress', function(e) {
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
        campo.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
        });

        campo.addEventListener('keypress', function(e) {
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

        campo.addEventListener('input', function(e) {
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

        campo.addEventListener('keypress', function(e) {
            const charCode = (e.which) ? e.which : e.keyCode;
            if (charCode === 101 || charCode === 69 || (charCode > 31 && (charCode < 48 || charCode > 57))) {
                e.preventDefault();
                return false;
            }
        });

        campo.addEventListener('paste', function(e) {
            let pasteData = (e.clipboardData || window.clipboardData).getData('text');
            if (/[^0-9]/.test(pasteData)) {
                e.preventDefault();
                return false;
            }
        });
    });
}

/**
 * Actualiza los campos de hermanos según el número ingresado
 */
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

/**
 * Maneja los checkbox de "Sin RUT" e "Sin información"
 */
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

/**
 * Funciones para manejar familiares y apoderados
 */
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
    const seleccion = this.value; // Ej: "Padre", "Madre", etc.
    console.log("Tipo de apoderado seleccionado:", seleccion);
    
    // Mapeo de valores de texto a valores numéricos de parentesco
    const mapaParentescos = {
        "Padre": "1",
        "Madre": "2",
        "Abuelo/a": "3",
        "Hermano/a": "4",
        "Tío/a": "5",
        "Otro": "6"
    };
    
    // Obtener el valor numérico correspondiente
    const valorParentescoNumerico = mapaParentescos[seleccion];
    console.log("Buscando familiar con parentesco valor:", valorParentescoNumerico);
    
    // También buscar por texto para mayor compatibilidad
    const parentescoSelects = document.querySelectorAll('select[name^="parentesco"]');
    
    let familiarEncontrado = false;
    
    // Primero intentar buscar por valor numérico
    parentescoSelects.forEach(select => {
        console.log("Evaluando select:", select.name, "con valor:", select.value);
        
        // Comparar tanto con el valor numérico como con el valor de texto
        if (select.value === valorParentescoNumerico || select.value === seleccion) {
            familiarEncontrado = true;
            console.log("¡Coincidencia encontrada!");

            // Determinar el sufijo del familiar
            const nombreInput = select.name;
            const esPrimero = nombreInput === "parentesco";
            const sufijo = esPrimero ? "" : nombreInput.substring(nombreInput.indexOf("_"));

            console.log("Sufijo determinado:", sufijo);

            // Copiar datos al apoderado
            const nombresFamiliarInput = document.querySelector(`input[name="nombresFamiliar${sufijo}"]`);
            if (nombresFamiliarInput) {
                document.querySelector('input[name="nombresApoderado"]').value = nombresFamiliarInput.value || '';
            }

            const apellidoPaternoInput = document.querySelector(`input[name="apellidoPaternoFamiliar${sufijo}"]`);
            if (apellidoPaternoInput) {
                document.querySelector('input[name="apellidoPaternoApoderado"]').value = apellidoPaternoInput.value || '';
            }

            const apellidoMaternoInput = document.querySelector(`input[name="apellidoMaternoFamiliar${sufijo}"]`);
            if (apellidoMaternoInput) {
                document.querySelector('input[name="apellidoMaternoApoderado"]').value = apellidoMaternoInput.value || '';
            }

            const rutFamiliarInput = document.querySelector(`input[name="rutFamiliar${sufijo}"]`);
            if (rutFamiliarInput) {
                document.querySelector('input[name="rutApoderado"]').value = rutFamiliarInput.value || '';
                
                // También copiar el estado "extranjero sin RUT"
                const extranjeroCheckbox = document.querySelector(`input[name="extranjeroSinRut${sufijo}"]`);
                const apoderadoExtranjeroCheckbox = document.querySelector('input[name="extranjeroSinRutApoderado"]');
                if (extranjeroCheckbox && apoderadoExtranjeroCheckbox) {
                    apoderadoExtranjeroCheckbox.checked = extranjeroCheckbox.checked;
                }
            }

            // Fecha de nacimiento
            const fechaNacimientoInput = document.querySelector(`input[name="fechaNacimientoFamiliar${sufijo}"]`);
            if (fechaNacimientoInput && fechaNacimientoInput.value) {
                const fechaApoderado = document.querySelector('input[name="fechaNacimientoApoderado"]');
                if (fechaApoderado) {
                    fechaApoderado.value = fechaNacimientoInput.value;
                    // Actualizar edad si existe la función
                    if (typeof actualizarEdadApoderado === "function") {
                        actualizarEdadApoderado(fechaNacimientoInput.value);
                    }
                }
            }

            // Género
            const generoSelect = document.querySelector(`select[name="generoFamiliar${sufijo}"]`);
            if (generoSelect) {
                const generoValue = generoSelect.value;
                const radioGeneroM = document.querySelector('input[name="generoApoderado"][value="1"]');
                const radioGeneroF = document.querySelector('input[name="generoApoderado"][value="2"]');
                
                if (generoValue === "1" && radioGeneroM) {
                    radioGeneroM.checked = true;
                } else if (generoValue === "2" && radioGeneroF) {
                    radioGeneroF.checked = true;
                }
            }

            // Datos de trabajo
            const empresaInput = document.querySelector(`input[name="nombreEmpresa${sufijo}"]`) || document.querySelector(`input[name="nombreEmpresa"]`);
            if (empresaInput) {
                document.querySelector('input[name="empresaApoderado"]').value = empresaInput.value || '';
            }

            const cargoInput = document.querySelector(`input[name="cargoEmpresa${sufijo}"]`) || document.querySelector(`input[name="cargoEmpresa"]`);
            if (cargoInput) {
                document.querySelector('input[name="cargoApoderado"]').value = cargoInput.value || '';
            }

            const direccionTrabajoInput = document.querySelector(`input[name="direccionTrabajo${sufijo}"]`) || document.querySelector(`input[name="direccionTrabajo"]`);
            if (direccionTrabajoInput) {
                document.querySelector('input[name="direccionTrabajoApoderado"]').value = direccionTrabajoInput.value || '';
            }

            const telefonoTrabajoInput = document.querySelector(`input[name="telefonoTrabajo${sufijo}"]`) || document.querySelector(`input[name="telefonoTrabajo"]`);
            if (telefonoTrabajoInput) {
                document.querySelector('input[name="telefonoTrabajoApoderado"]').value = telefonoTrabajoInput.value || '';
            }

            // Teléfono personal
            const telefonoInput = document.querySelector(`input[name="telefonoFamiliar${sufijo}"]`) || document.querySelector(`input[name="telefonoFamiliar2${sufijo}"]`) || document.querySelector(`input[name="telefonoFamiliar"]`) || document.querySelector(`input[name="telefonoFamiliar2"]`);
            if (telefonoInput) {
                document.querySelector('input[name="telefonoApoderado"]').value = telefonoInput.value || '';
            }
            
            mostrarMensaje(`Datos del familiar (${seleccion}) copiados al apoderado`, "success");
            return;
        }
    });

    if (!familiarEncontrado) {
        mostrarMensaje(`No se encontró ningún familiar con parentesco ${seleccion}`, "info");
    }
}

/**
 * Funciones globales para acceso desde HTML
 */
window.marcarSinRut = function(checkbox, id) {
    const rutInput = document.querySelector(`input[name="rutFamiliar_${id}"]`);
    if (checkbox.checked) {
        rutInput.value = 'SIN RUT';
        rutInput.disabled = true;
    } else {
        rutInput.value = '';
        rutInput.disabled = false;
    }
};

window.eliminarFamiliar = function(id) {
    const familiar = document.getElementById(`familiar-${id}`);
    if (familiar) {
        if (confirm(`¿Está seguro de eliminar el familiar ${id}?`)) {
            familiar.remove();
            mostrarMensaje(`Familiar ${id} eliminado`, "info");
        }
    }
};

/**
 * Funciones de carga de datos desde el servidor
 */
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
    fetch('/obtener-motivos-postulacion')
        .then(response => response.json())
        .then(motivos => {
            const motivoSelect = document.querySelector('select[name="motivoPostulacion"]');
            if (motivoSelect) {
                motivoSelect.innerHTML = '<option value="">*** SELECCIONE UNA OPCIÓN ***</option>';

                motivos.forEach(motivo => {
                    const option = document.createElement('option');
                    option.value = motivo.id_motivo;
                    option.textContent = motivo.descripcion;
                    motivoSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar motivos de postulación:', error);
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

// Añadir después de las demás funciones de carga
function cargarTodosLosCursos() {
    fetch('/obtener-cursos')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(cursos => {
            const cursosSelect = document.getElementById('cursosSelect');
            if (cursosSelect) {
                cursosSelect.innerHTML = '<option value="">-- Seleccione curso --</option>';
                
                // Usar todos los cursos sin filtrar por año
                if (cursos && cursos.length > 0) {
                    // Agrupar por año académico y luego por nivel
                    const cursosPorAno = {};
                    
                    // Primero: agrupar cursos por año académico
                    cursos.forEach(curso => {
                        if (!cursosPorAno[curso.id_ano]) {
                            cursosPorAno[curso.id_ano] = {};
                        }
                        
                        // Extraer solo el nivel sin la letra/sección
                        const nivelBase = curso.nombre_curso.replace(/([0-9]+\s+[A-ZÑÁÉÍÓÚ]+)(\s+[A-Z])?/i, '$1').trim();
                        
                        // Solo guardar el primer curso de cada nivel
                        if (!cursosPorAno[curso.id_ano][nivelBase]) {
                            cursosPorAno[curso.id_ano][nivelBase] = curso;
                        }
                    });
                    
                    // Agregar los cursos al select, agrupados por año
                    Object.keys(cursosPorAno).forEach(idAno => {
                        // Crear el grupo para este año
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `Año académico ID: ${idAno}`;
                        
                        // Obtener los niveles únicos y ordenarlos
                        const nivelesUnicos = Object.values(cursosPorAno[idAno]);
                        nivelesUnicos.sort((a, b) => {
                            // Extraer número de nivel para ordenar
                            const numA = parseInt(a.nombre_curso.match(/(\d+)/)?.[0] || 0);
                            const numB = parseInt(b.nombre_curso.match(/(\d+)/)?.[0] || 0);
                            
                            if (numA !== numB) return numA - numB;
                            
                            // Si los números son iguales, ordenar por nombre
                            return a.nombre_curso.localeCompare(b.nombre_curso);
                        });
                        
                        // Agregar cada nivel único de este año
                        nivelesUnicos.forEach(curso => {
                            const option = document.createElement('option');
                            option.value = curso.id_curso;
                            
                            // Mostrar solo el nivel básico (1 AÑO, 2 AÑO, etc.)
                            const nivelBase = curso.nombre_curso.replace(/([0-9]+\s+[A-ZÑÁÉÍÓÚ]+)(\s+[A-Z])?/i, '$1').trim();
                            option.textContent = nivelBase;
                            
                            optgroup.appendChild(option);
                        });
                        
                        cursosSelect.appendChild(optgroup);
                    });
                    
                    console.log(`Cargados niveles únicos de cursos`);
                } else {
                    console.warn("No se encontraron cursos");
                }
            } else {
                console.error("No se encontró el elemento 'cursosSelect'");
            }
        })
        .catch(error => console.error('Error al cargar cursos:', error));
}

function cargarAnosAcademicos() {
    const selectAnio = document.getElementById('anioIngreso');
    if (!selectAnio) {
        console.error("Elemento 'anioIngreso' no encontrado al cargar años académicos");
        return;
    }
    
    fetch('/obtener-anos')
        .then(response => response.json())
        .then(anos => {
            if (!selectAnio) return;
            
            selectAnio.innerHTML = '<option value="">-- Seleccione un año académico --</option>';
            anos.forEach(ano => {
                const option = document.createElement('option');
                option.value = ano.id_ano;
                option.textContent = ano.nombre_ano;
                selectAnio.appendChild(option);
            });
            
            // Llamar a precargarAnio2025 solo aquí, no duplicadamente
            precargarAnio2025();
        })
        .catch(error => {
            console.error('Error al cargar años académicos:', error);
        });
}

function precargarAnio2025() {
    const selectAnio = document.getElementById('anioIngreso');
    if (!selectAnio || !selectAnio.options || selectAnio.options.length <= 1) {
        console.error("Elemento 'anioIngreso' no disponible o sin opciones");
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

/**
 * Función principal para guardar el registro completo
 */
async function guardarRegistroCompleto(e) {
    if (e) e.preventDefault(); // Prevenir comportamiento por defecto
    
    // Obtener referencia al botón
    const btnGuardar = document.getElementById("guardar");
    
    // Deshabilitar el botón mientras se procesa
    deshabilitarBoton(btnGuardar, "Guardando...");
    
    // Crear objeto FormData con los datos del formulario
    const formData = new FormData(document.getElementById("form-datos-personales"));
    
    try {
        // PASO 1: Crear usuario alumno
        console.log("Paso 1: Creando usuario alumno...");
        
        const respUsuario = await fetch('/crear-usuario', {
            method: 'POST',
            body: formData
        });
        
        if (!respUsuario.ok) {
            await diagnosticarRespuesta(respUsuario, "Error al guardar usuario");
            throw new Error(`Error al guardar datos del usuario: ${respUsuario.status}`);
        }
        
        const respuestaUsuario = await respUsuario.json();
        const idUsuario = respuestaUsuario.idUsuario;
        console.log("Usuario creado con ID:", idUsuario);
        
        // PASO 2: Crear apoderado con idUsuarioAlumno
        console.log("Paso 2: Creando apoderado...");
        
        const formDataApoderado = new FormData();
        formDataApoderado.append('idUsuarioAlumno', idUsuario); // ¡Crucial!
        formDataApoderado.append('nombres', document.getElementById('nombresApoderado').value);
        formDataApoderado.append('apellidoPaterno', document.getElementById('apellidoPaternoApoderado').value);
        formDataApoderado.append('apellidoMaterno', document.getElementById('apellidoMaternoApoderado').value);
        formDataApoderado.append('rut', document.getElementById('rutApoderado').value);
        
        // Añadir todos los campos adicionales del apoderado
        const generoApoderado = document.querySelector('input[name="generoApoderado"]:checked');
        if (generoApoderado) formDataApoderado.append('genero', generoApoderado.value);
        
        formDataApoderado.append('fechaNacimiento', document.getElementById('fechaNacimientoApoderado')?.value || '');
        formDataApoderado.append('direccion', document.getElementById('direccionApoderado')?.value || '');
        formDataApoderado.append('villa', document.getElementById('villaApoderado')?.value || '');
        formDataApoderado.append('numero', document.getElementById('numeroApoderado')?.value || '');
        formDataApoderado.append('departamento', document.getElementById('departamentoApoderado')?.value || '');
        formDataApoderado.append('idComuna', document.getElementById('idComunaApoderado')?.value || '');
        formDataApoderado.append('telefono', document.getElementById('telefonoApoderado')?.value || '');
        formDataApoderado.append('email', document.getElementById('emailApoderado')?.value || '');
        formDataApoderado.append('tipoApoderado', document.getElementById('tipoApoderado')?.value || '');
        formDataApoderado.append('empresaTrabajo', document.getElementById('empresaApoderado')?.value || '');
        formDataApoderado.append('cargoEmpresa', document.getElementById('cargoApoderado')?.value || '');
        formDataApoderado.append('direccionTrabajo', document.getElementById('direccionTrabajoApoderado')?.value || '');
        formDataApoderado.append('telefonoTrabajo', document.getElementById('telefonoTrabajoApoderado')?.value || '');
        
        console.log("ID de alumno a vincular:", idUsuario);
        console.log("FormData del apoderado:", [...formDataApoderado.entries()]);
        
        const respApoderado = await fetch('/crear-apoderado', {
            method: 'POST',
            body: formDataApoderado
        });
        
        if (!respApoderado.ok) {
            await diagnosticarRespuesta(respApoderado, "Error al guardar apoderado");
            throw new Error(`Error al guardar datos del apoderado: ${respApoderado.status}`);
        }
        
        const respuestaApoderado = await respApoderado.json();
        const idApoderado = respuestaApoderado.idApoderado;
        console.log("Apoderado creado con ID:", idApoderado);
        
        // PASO 3: Crear el registro de alumno con los datos específicos
        console.log("Paso 3: Creando registro de alumno...");

        const formDataAlumno = new FormData();
        formDataAlumno.append('idUsuario', idUsuario);
        formDataAlumno.append('fechaNacimiento', formData.get('fechaNacimiento'));
        formDataAlumno.append('idAno', document.getElementById('anioIngreso').value);
        formDataAlumno.append('idPlan', document.getElementById('plan').value);
        formDataAlumno.append('promedioAnterior', formData.get('promedioAnterior') || '');
        formDataAlumno.append('idEstablecimiento', document.getElementById('idEstablecimientoAnterior').value);
        formDataAlumno.append('idApoderado', idApoderado); // Importante: incluir el ID del apoderado
        formDataAlumno.append('idCurso', document.getElementById('cursosSelect').value);

        // Campos booleanos
        formDataAlumno.append('origenIndigena', document.querySelector('input[name="origenIndigena"]:checked')?.value === 'Si' ? 'S' : 'N');
        formDataAlumno.append('programaPIE', document.querySelector('input[name="programaPIE"]:checked')?.value === 'Si' ? 'S' : 'N');
        formDataAlumno.append('realizaEducacionFisica', document.querySelector('input[name="realizaEducacionFisica"]:checked')?.value === 'Si' ? 'S' : 'N');
        formDataAlumno.append('alergicoMedicamento', document.querySelector('input[name="alergicoMedicamento"]:checked')?.value === 'Si' ? 'S' : 'N');

        // Campos de texto
        formDataAlumno.append('especificarAlergia', formData.get('especificarAlergia') || '');
        formDataAlumno.append('enfermedadActual', formData.get('enfermedadActual') || '');
        formDataAlumno.append('medicamentoConsumo', formData.get('medicamentoConsumo') || '');
        formDataAlumno.append('personaRetiro', formData.get('personaRetiro') || '');
        formDataAlumno.append('observaciones', formData.get('observaciones') || '');

        // Documentación
        formDataAlumno.append('certificadoNacimiento', document.getElementById('certificadoNacimiento')?.checked ? 'S' : 'N');
        formDataAlumno.append('informePersonalidad', document.getElementById('informePersonalidad')?.checked ? 'S' : 'N');
        formDataAlumno.append('informeNotas', document.getElementById('informeNotas')?.checked ? 'S' : 'N');
        formDataAlumno.append('certificadoEstudios', document.getElementById('certificadoEstudios')?.checked ? 'S' : 'N');
        formDataAlumno.append('fichaFirmada', document.getElementById('fichaFirmada')?.checked ? 'S' : 'N');

        console.log("FormData del alumno:", [...formDataAlumno.entries()]);

        const respAlumno = await fetch('/crear-alumno', {
            method: 'POST',
            body: formDataAlumno
        });

        if (!respAlumno.ok) {
            await diagnosticarRespuesta(respAlumno, "Error al guardar alumno");
            throw new Error(`Error al guardar datos del alumno: ${respAlumno.status}`);
        }

        const respuestaAlumno = await respAlumno.json();
        console.log("Alumno creado correctamente:", respuestaAlumno);

        // Todo se guardó correctamente
        mostrarMensaje(`Registro completado con éxito. ID de usuario: ${idUsuario}`, "success");
        
    } catch (error) {
        console.error("Error en el proceso de registro:", error);
        mostrarMensaje("Error: " + error.message, "error");
    } finally {
        // Quitar indicador de carga
        habilitarBoton(btnGuardar);
    }
}