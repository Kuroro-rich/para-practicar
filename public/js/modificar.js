document.addEventListener('DOMContentLoaded', function () {
    // Variables globales
    let idAlumno;
    
    // Funciones compartidas (necesitan estar disponibles dentro y fuera del evento)
    function obtenerIdAlumnoDeURL() {
        return window.location.pathname.split('/').pop();
    }
    
    function llenarFormulario(selector, datos) {
        const form = document.querySelector(selector);
        if (!form) return;

        Object.keys(datos).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!datos[key];
                } else if (input.tagName === 'SELECT') {
                    establecerValorSelect(input, datos[key]);
                } else {
                    input.value = datos[key];
                }
            }
        });
    }
    
    // Asignar el ID del alumno
    idAlumno = obtenerIdAlumnoDeURL();
    
    if (!idAlumno) {
        mostrarMensaje('No se especificó un alumno para editar', 'error');
        setTimeout(() => {
            window.location.href = '/listar';
        }, 3000);
        return;
    }

    // Mostrar u ocultar loader
    function mostrarLoader(mostrar) {
        const loader = document.getElementById('loaderContainer');
        if (loader) loader.style.display = mostrar ? 'flex' : 'none';
    }

    // Mostrar mensajes
    function mostrarMensaje(mensaje, tipo) {
        const container = document.getElementById('mensajes');
        if (!container) return;

        const notificacion = document.createElement('div');
        notificacion.className = `notification ${getTipoNotificacion(tipo)}`;
        notificacion.innerHTML = `
            <button class="delete"></button>
            ${mensaje}
        `;

        container.appendChild(notificacion);

        setTimeout(() => notificacion.classList.add('show'), 100);

        notificacion.querySelector('.delete').addEventListener('click', () => {
            notificacion.classList.add('hide');
            setTimeout(() => notificacion.remove(), 300);
        });

        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.classList.add('hide');
                setTimeout(() => notificacion.remove(), 300);
            }
        }, 5000);
    }

    function getTipoNotificacion(tipo) {
        switch (tipo) {
            case 'success': return 'is-success';
            case 'error': return 'is-danger';
            case 'warning': return 'is-warning';
            case 'info': return 'is-info';
            default: return 'is-info';
        }
    }

    // Establecer valores en select
    function establecerValorSelect(select, valor) {
        if (!select || valor === undefined || valor === null) return false;

        const opcion = Array.from(select.options).find(opt => opt.value == valor);
        if (opcion) {
            opcion.selected = true;
            return true;
        }

        console.warn(`No se encontró opción con valor ${valor} en ${select.name || select.id}`);
        return false;
    }

    // Cargar datos auxiliares
    async function cargarDatosAuxiliares() {
        try {
            await Promise.all([
                cargarOpciones('/obtener-nacionalidades', 'select[name="nacionalidad"]', 'Seleccione nacionalidad'),
                cargarOpciones('/obtener-comunas', 'select[name="comuna"]', 'Seleccione comuna'),
                cargarOpciones('/obtener-establecimientos', '#idEstablecimientoAnterior', 'Seleccione establecimiento', true),
                cargarOpciones('/obtener-planes', 'select[name="plan"]', 'Seleccione plan')
            ]);
        } catch (error) {
            console.error('Error al cargar datos auxiliares:', error);
        }
    }

    async function cargarOpciones(url, selector, placeholder, agregarSinInfo = false) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error al cargar datos desde ${url}`);

            const datos = await response.json();
            const select = document.querySelector(selector);
            if (!select) return;

            select.innerHTML = `<option value="">${placeholder}</option>`;
            datos.forEach(dato => {
                const option = document.createElement('option');
                option.value = dato.id || dato.id_nacionalidad || dato.id_comuna || dato.id_plan || dato.id_establecimiento;
                option.textContent = dato.nombre || dato.nacionalidad || dato.comuna || dato.nombre_plan;
                select.appendChild(option);
            });

            if (agregarSinInfo) {
                const optionSinInfo = document.createElement('option');
                optionSinInfo.value = "-1";
                optionSinInfo.textContent = "SIN INFORMACIÓN";
                select.appendChild(optionSinInfo);
            }
        } catch (error) {
            console.error(`Error al cargar opciones para ${selector}:`, error);
        }
    }

    // Cargar datos del alumno
    async function cargarDatosAlumno() {
        try {
            const response = await fetch(`/api/alumno/${idAlumno}`);
            if (!response.ok) throw new Error('Error al cargar datos del alumno');

            const alumno = await response.json();

            llenarFormulario('#form-datos-personales', alumno);
        } catch (error) {
            console.error('Error al cargar datos del alumno:', error);
        }
    }

    // Guardar cambios
    async function guardarCambios() {
        try {
            mostrarLoader(true);
            const datosPersonales = new FormData(document.getElementById('form-datos-personales'));
            const response = await fetch(`/actualizar-alumno/${idAlumno}`, {
                method: 'POST',
                body: datosPersonales
            });
            
            const result = await response.json();
            
            if (result.success) {
                mostrarMensaje("Cambios guardados correctamente", "success");
            } else {
                mostrarMensaje(result.error || "Error al guardar cambios", "error");
            }
        } catch (error) {
            console.error("Error al guardar cambios:", error);
            mostrarMensaje("Error al guardar cambios", "error");
        } finally {
            mostrarLoader(false);
        }
    }
    
    // Función para llenar datos del apoderado (AÑADIDA AQUÍ DENTRO DEL DOMCONTENTLOADED)
    function llenarDatosApoderado(apoderado) {
        if (!apoderado) return;
        
        const form = document.getElementById('form-datos-apoderado');
        if (!form) return;
        
        // Asignar el ID del apoderado
        if (apoderado.idApoderado) {
            const idApoderadoInput = form.querySelector('#idFamiliar');
            if (idApoderadoInput) idApoderadoInput.value = apoderado.idApoderado;
        }
        
        // Seleccionar el tipo de apoderado
        const tipoApoderadoSelect = form.querySelector('#tipoApoderado');
        if (tipoApoderadoSelect && apoderado.tipoApoderado) {
            for (const option of tipoApoderadoSelect.options) {
                if (option.value === apoderado.tipoApoderado) {
                    option.selected = true;
                    break;
                }
            }
        }
        
        // Completar el resto de campos
        const camposTexto = [
            'rut', 'nombres', 'apellidoPaterno', 'apellidoMaterno', 'telefono', 
            'email', 'empresa', 'cargo', 'direccionTrabajo', 'telefonoTrabajo'
        ];
        
        camposTexto.forEach(campo => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (input && apoderado[campo] !== undefined) {
                input.value = apoderado[campo] || '';
            }
        });
        
        // Campos especiales
        if (apoderado.fechaNacimiento) {
            const fechaInput = form.querySelector('[name="fechaNacimiento"]');
            if (fechaInput) {
                // Formatear la fecha si es necesario
                fechaInput.value = apoderado.fechaNacimiento;
            }
        }
        
        // Checkbox para apoderado suplente
        const checkSuplente = form.querySelector('[name="esApoderadoSuplente"]');
        if (checkSuplente) {
            checkSuplente.checked = !!apoderado.esApoderadoSuplente;
        }
    }

    // Función para cargar datos del apoderado
    async function cargarDatosApoderado() {
        try {
            if (!idAlumno) return;

            const response = await fetch(`/api/apoderado/${idAlumno}`);
            const data = await response.json();

            if (!data.success) {
                console.log("No se encontraron datos del apoderado:", data.message);
                return;
            }

            // Ahora usamos la función que está bien definida en este scope
            llenarDatosApoderado(data.apoderado);
            
        } catch (error) {
            console.error("Error al cargar datos del apoderado:", error);
        }
    }

    // Inicializar
    async function inicializar() {
        mostrarLoader(true);
        await cargarDatosAuxiliares();
        await cargarDatosAlumno();
        await cargarDatosApoderado();
        mostrarLoader(false);
    }

    inicializar();

    document.getElementById('guardarCambios').addEventListener('click', guardarCambios);
});