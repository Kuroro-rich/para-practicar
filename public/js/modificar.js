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
                } else if (input.type === 'date' && datos[key]) {
                    // Formatear fecha a yyyy-MM-dd
                    const fecha = new Date(datos[key]);
                    const yyyy = fecha.getFullYear();
                    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
                    const dd = String(fecha.getDate()).padStart(2, '0');
                    input.value = `${yyyy}-${mm}-${dd}`;
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
                cargarOpciones('/obtener-nacionalidades', 'select[name="idNacionalidad"]', 'Seleccione nacionalidad'),
                cargarOpciones('/obtener-comunas', 'select[name="idComuna"]', 'Seleccione comuna'),
                cargarOpciones('/obtener-establecimientos', 'select[name="idEstablecimiento"]', 'Seleccione establecimiento', true),
                cargarOpciones('/obtener-planes', 'select[name="idPlan"]', 'Seleccione plan'),
                cargarOpciones('/obtener-anos', 'select[name="idAno"]', 'Seleccione año')
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
                if (url.includes('nacionalidades')) {
                    option.value = dato.id_nacionalidad;
                    option.textContent = dato.nacionalidad;
                } else if (url.includes('comunas')) {
                    option.value = dato.id_comuna;
                    option.textContent = dato.comuna;
                } else if (url.includes('establecimientos')) {
                    option.value = dato.id_establecimiento;
                    option.textContent = dato.nombre;
                } else if (url.includes('planes')) {
                    option.value = dato.id_plan;
                    option.textContent = dato.nombre_plan;
                } else if (url.includes('anos')) {
                    option.value = dato.id_ano;
                    option.textContent = dato.nombre_ano;
                }
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
            console.log(alumno); // <-- Aquí revisa si los campos aparecen

            llenarFormulario('#form-datos-personales', alumno);

            document.getElementById('nombreCompletoAlumno').textContent =
                `${alumno.apellidoPaterno || ''} ${alumno.apellidoMaterno || ''} ${alumno.nombres || ''}`.trim();
            document.getElementById('rutAlumno').textContent = alumno.rut || '';

            // Forzar selección de los selects después de cargar opciones
            setTimeout(() => {
                ['idAno', 'idComuna', 'idEstablecimiento', 'idPlan'].forEach(name => {
                    const select = document.querySelector(`[name="${name}"]`);
                    if (select && alumno[name]) {
                        establecerValorSelect(select, alumno[name]);
                    }
                });
            }, 300);

            if (alumno.idCurso) {
                document.querySelector('[name="idCurso"]').value = alumno.idCurso;
            }
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

    // Función para llenar datos del apoderado (CORREGIDA PARA MAPEAR ALIAS DEL BACKEND A LOS NOMBRES DEL HTML)
    function llenarDatosApoderado(apoderado) {
        if (!apoderado) return;

        const form = document.getElementById('form-datos-apoderado');
        if (!form) return;

        // Mapear los datos del backend a los nombres del HTML
        const mapeo = {
            apellidoPaternoApoderado: apoderado.apellidoPaterno,
            apellidoMaternoApoderado: apoderado.apellidoMaterno,
            nombresApoderado: apoderado.nombres,
            rutApoderado: apoderado.rut,
            generoApoderado: apoderado.genero || '',
            fechaNacimientoApoderado: apoderado.fechaNacimiento,
            direccionApoderado: apoderado.direccion || '',
            numeroApoderado: apoderado.numero || '',
            villaApoderado: apoderado.villa || '',
            departamentoApoderado: apoderado.departamento || '',
            idComunaApoderado: apoderado.idComuna || '',
            telefonoApoderado: apoderado.telefono,
            emailApoderado: apoderado.email,
            empresaApoderado: apoderado.empresa,
            cargoApoderado: apoderado.cargo,
            direccionTrabajoApoderado: apoderado.direccionTrabajo,
            telefonoTrabajoApoderado: apoderado.telefonoTrabajo
        };

        Object.keys(mapeo).forEach(nombreCampo => {
            const input = form.querySelector(`[name="${nombreCampo}"]`);
            if (input && mapeo[nombreCampo] !== undefined) {
                input.value = mapeo[nombreCampo] || '';
            }
        });

        // Si tienes radios o selects especiales, agrégalos aquí
        // Checkbox para apoderado suplente
        const checkSuplente = form.querySelector('[name="esApoderadoSuplente"]');
        if (checkSuplente && apoderado.esApoderadoSuplente !== undefined) {
            checkSuplente.checked = !!apoderado.esApoderadoSuplente;
        }

        const inputFecha = form.querySelector('[name="fechaNacimientoApoderado"]');
        if (inputFecha && apoderado.fechaNacimiento) {
            const fecha = new Date(apoderado.fechaNacimiento);
            const yyyy = fecha.getFullYear();
            const mm = String(fecha.getMonth() + 1).padStart(2, '0');
            const dd = String(fecha.getDate()).padStart(2, '0');
            inputFecha.value = `${yyyy}-${mm}-${dd}`;
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

            llenarDatosApoderado(data.apoderado);

        } catch (error) {
            console.error("Error al cargar datos del apoderado:", error);
        }
    }

    async function cargarDatosFamiliares() {
        try {
            if (!idAlumno) return;
            const response = await fetch(`/api/familiares/${idAlumno}`);
            const data = await response.json();
            if (!data.success) {
                console.log("No se encontraron datos familiares:", data.message);
                return;
            }
            // Aquí deberías llenar el formulario de familiares, similar a llenarDatosApoderado
            // llenarFormulario('#form-datos-familiares', data.familiares);
        } catch (error) {
            console.error("Error al cargar datos familiares:", error);
        }
    }

    // Inicializar
    async function inicializar() {
        mostrarLoader(true);
        await cargarDatosAuxiliares();
        await cargarDatosAlumno();
        await cargarDatosApoderado();
        await cargarDatosFamiliares();
        mostrarLoader(false);
    }

    inicializar();

    document.getElementById('guardarCambios').addEventListener('click', guardarCambios);

    // Manejo de pestañas
    document.querySelectorAll('.tabs ul li').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.tabs ul li').forEach(t => t.classList.remove('is-active'));
            this.classList.add('is-active');
            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('is-active');
            });
            document.getElementById(tabName).classList.add('is-active');
            // Cargar datos familiares si corresponde
            if (tabName === 'datos-familiares') {
                cargarDatosFamiliares();
            }
            if (tabName === 'datos-apoderado') {
                cargarDatosApoderado();
            }
        });
    });

    const btnCopiar = document.getElementById('btnCopiarComoApoderado');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', function () {
            // Copiar datos del familiar al apoderado
            const formFamiliar = document.getElementById('form-datos-familiares');
            const formApoderado = document.getElementById('form-datos-apoderado');
            if (formFamiliar && formApoderado) {
                // Mapea los campos principales (ajusta si tienes más)
                const mapeo = {
                    apellidoPaternoFamiliar: 'apellidoPaternoApoderado',
                    apellidoMaternoFamiliar: 'apellidoMaternoApoderado',
                    nombresFamiliar: 'nombresApoderado',
                    rutFamiliar: 'rutApoderado',
                    generoFamiliar: 'generoApoderado',
                    fechaNacimientoFamiliar: 'fechaNacimientoApoderado',
                    direccionTrabajoFamiliar: 'direccionTrabajoApoderado',
                    telefonoFamiliar: 'telefonoApoderado',
                    empresaFamiliar: 'empresaApoderado',
                    cargoFamiliar: 'cargoApoderado',
                    telefonoTrabajoFamiliar: 'telefonoTrabajoApoderado'
                };
                Object.keys(mapeo).forEach(fam => {
                    const inputFam = formFamiliar.querySelector(`[name="${fam}"]`);
                    const inputApo = formApoderado.querySelector(`[name="${mapeo[fam]}"]`);
                    if (inputFam && inputApo) {
                        inputApo.value = inputFam.value;
                    }
                });
            }

            // Cambiar a la pestaña de apoderado
            document.querySelectorAll('.tabs ul li').forEach(t => t.classList.remove('is-active'));
            const tabApoderado = document.querySelector('.tabs ul li[data-tab="datos-apoderado"]');
            if (tabApoderado) tabApoderado.classList.add('is-active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('is-active'));
            const contentApoderado = document.getElementById('datos-apoderado');
            if (contentApoderado) contentApoderado.classList.add('is-active');
            
            const checkApoderado = formApoderado.querySelector('[name="esApoderado"]');
            if (checkApoderado) checkApoderado.checked = true;
        });
    }
});