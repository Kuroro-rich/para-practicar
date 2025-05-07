document.addEventListener('DOMContentLoaded', function () {
    // =========================
    // Variables y utilidades
    // =========================
    let idAlumno = obtenerIdAlumnoDeURL();

    function obtenerIdAlumnoDeURL() {
        return window.location.pathname.split('/').pop();
    }

    function mostrarLoader(mostrar) {
        const loader = document.getElementById('loaderContainer');
        if (loader) loader.style.display = mostrar ? 'flex' : 'none';
    }

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

    function llenarFormulario(selector, datos) {
        const form = document.querySelector(selector);
        if (!form) return;
        Object.keys(datos).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                let valor = datos[key];
                if (valor === undefined || valor === null) valor = '';
                if (input.type === 'checkbox') {
                    input.checked = !!valor;
                } else if (input.type === 'radio') {
                    const radios = form.querySelectorAll(`[name="${key}"]`);
                    radios.forEach(radio => {
                        radio.checked = radio.value == valor;
                    });
                } else if (input.tagName === 'SELECT') {
                    establecerValorSelect(input, valor);
                } else if (input.type === 'date' && valor) {
                    const fecha = new Date(valor);
                    const yyyy = fecha.getFullYear();
                    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
                    const dd = String(fecha.getDate()).padStart(2, '0');
                    input.value = `${yyyy}-${mm}-${dd}`;
                } else {
                    input.value = valor;
                }
            } else {
                const radios = form.querySelectorAll(`[name="${key}"]`);
                if (radios.length) {
                    radios.forEach(radio => {
                        radio.checked = radio.value == datos[key];
                    });
                }
            }
        });
    }

    // =========================
    // Carga de datos auxiliares y selects
    // =========================
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
                } else if (url.includes('parentescos')) {
                    option.value = dato.id_parentesco;
                    option.textContent = dato.nombre;
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

    async function cargarParentescosAmbos() {
        try {
            const response = await fetch('/obtener-parentescos');
            if (!response.ok) throw new Error('Error al cargar parentescos');
            const datos = await response.json();
            const selects = [
                document.querySelector('select[name="parentesco"]'),
                document.querySelector('select[name="tipoApoderado"]')
            ];
            selects.forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Seleccione parentesco</option>';
                datos.forEach(dato => {
                    const option = document.createElement('option');
                    option.value = dato.id_parentesco;
                    option.textContent = dato.nombre;
                    select.appendChild(option.cloneNode(true));
                });
            });
        } catch (error) {
            console.error('Error al cargar parentescos:', error);
        }
    }

    async function cargarDatosAuxiliares() {
        try {
            await Promise.all([
                cargarOpciones('/obtener-nacionalidades', 'select[name="idNacionalidad"]', 'Seleccione nacionalidad'),
                cargarOpciones('/obtener-comunas', 'select[name="idComuna"]', 'Seleccione comuna'),
                cargarOpciones('/obtener-comunas', 'select[name="idComunaApoderado"]', 'Seleccione comuna'),
                cargarOpciones('/obtener-establecimientos', 'select[name="idEstablecimiento"]', 'Seleccione establecimiento', true),
                cargarOpciones('/obtener-planes', 'select[name="idPlan"]', 'Seleccione plan'),
                cargarOpciones('/obtener-anos', 'select[name="idAno"]', 'Seleccione año'),
                cargarParentescosAmbos() // <-- aquí
            ]);
        } catch (error) {
            console.error('Error al cargar datos auxiliares:', error);
        }
    }

    // =========================
    // Carga de datos de alumno, apoderado y familiar
    // =========================
    async function cargarDatosAlumno() {
        try {
            const response = await fetch(`/api/alumno/${idAlumno}`);
            if (!response.ok) throw new Error('Error al cargar datos del alumno');
            const alumno = await response.json();
            console.log('Datos alumno:', alumno); // <-- Agrega este log
            llenarFormulario('#form-datos-personales', alumno);
            document.getElementById('nombreCompletoAlumno').textContent =
                `${alumno.apellidoPaterno || ''} ${alumno.apellidoMaterno || ''} ${alumno.nombres || ''}`.trim();
            document.getElementById('rutAlumno').textContent = alumno.rut || '';
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

    async function cargarDatosApoderado() {
        try {
            const response = await fetch(`/api/apoderado/${idAlumno}`);
            if (!response.ok) throw new Error('Error al cargar datos del apoderado');
            const data = await response.json();
            console.log('Datos apoderado:', data);

            // Accede al objeto apoderado anidado
            const apoderado = data.apoderado;
            if (!apoderado || !apoderado.rut) return;

            // Mapeo para que coincidan los name del formulario
            const apoderadoMapeado = {
                apellidoPaternoApoderado: apoderado.apellidoPaterno || apoderado.ap_paterno,
                apellidoMaternoApoderado: apoderado.apellidoMaterno || apoderado.ap_materno,
                nombresApoderado: apoderado.nombres || apoderado.nombre,
                rutApoderado: apoderado.rut,
                generoApoderado: apoderado.genero || apoderado.sexo,
                fechaNacimientoApoderado: apoderado.fechaNacimiento || apoderado.fecha_nacimiento,
                direccionApoderado: apoderado.direccion,
                numeroApoderado: apoderado.numero,
                villaApoderado: apoderado.villa,
                departamentoApoderado: apoderado.departamento,
                idComunaApoderado: apoderado.idComuna || apoderado.id_comuna,
                telefonoApoderado: apoderado.telefono,
                emailApoderado: apoderado.email || apoderado.e_mail,
                empresaApoderado: apoderado.empresaTrabajo || apoderado.empresa,
                cargoApoderado: apoderado.cargoEmpresa || apoderado.cargo,
                direccionTrabajoApoderado: apoderado.direccionTrabajo,
                telefonoTrabajoApoderado: apoderado.telefonoTrabajo,
                tipoApoderado: apoderado.parentesco || apoderado.id_parentesco
            };

            llenarFormulario('#form-datos-apoderado', apoderadoMapeado);
        } catch (error) {
            console.warn('No se encontraron datos del apoderado:', error.message);
        }
    }

    async function cargarDatosFamiliares() {
        try {
            const response = await fetch(`/api/familiares/${idAlumno}`);
            if (!response.ok) throw new Error('Error al cargar datos familiares');
            const data = await response.json();
            console.log('Datos familiares:', data);
            if (!data.success || !data.familiares.length) return;
            const familiar = data.familiares[0];

            // Mapeo para que coincidan los name del formulario
            const familiarMapeado = {
                parentesco: familiar.parentesco || familiar.id_parentesco,
                rutFamiliar: familiar.rut,
                nombresFamiliar: familiar.nombres || familiar.nombre,
                apellidoPaternoFamiliar: familiar.apellidoPaterno || familiar.ap_paterno,
                apellidoMaternoFamiliar: familiar.apellidoMaterno || familiar.ap_materno,
                fechaNacimientoFamiliar: familiar.fechaNacimiento || familiar.fecha_nacimiento,
                empresaFamiliar: familiar.empresa || familiar.em_nombre,
                generoFamiliar: familiar.genero || familiar.sexo,
                direccionTrabajoFamiliar: familiar.direccionTrabajo || familiar.em_direccion,
                cargoFamiliar: familiar.cargo || familiar.em_cargo,
                telefonoFamiliar: familiar.telefono,
                telefonoTrabajoFamiliar: familiar.telefonoTrabajo || familiar.em_telefono,
                apoderadoSuplente: familiar.apoderadoSuplente || familiar.apoderado_conf || familiar.esApoderadoSuplente
            };

            llenarFormulario('#form-datos-familiares', familiarMapeado);
        } catch (error) {
            console.warn('No se encontraron datos familiares:', error.message);
        }
    }

    // =========================
    // Guardar cambios unificado
    // =========================
    async function guardarCambios() {
        try {
            mostrarLoader(true);

            // 1. Guardar datos personales del alumno
            const datosPersonales = new FormData(document.getElementById('form-datos-personales'));
            // Puedes agregar validaciones aquí si lo necesitas

            const responseAlumno = await fetch(`/actualizar-alumno/${idAlumno}`, {
                method: 'POST',
                body: datosPersonales
            });
            const resultAlumno = await responseAlumno.json();
            if (!resultAlumno.success) throw new Error(resultAlumno.error || "Error al guardar alumno");

            // 2. Guardar apoderado
            const formApoderado = document.getElementById('form-datos-apoderado');
            if (formApoderado) {
                const datosApoderado = new FormData(formApoderado);

                // Validación de campos obligatorios de apoderado
                if (
                    !datosApoderado.get('rutApoderado') ||
                    !datosApoderado.get('nombresApoderado') ||
                    !datosApoderado.get('apellidoPaternoApoderado') ||
                    !datosApoderado.get('apellidoMaternoApoderado')
                ) {
                    mostrarMensaje("Debes completar los datos obligatorios del apoderado.", "error");
                    return;
                }

                datosApoderado.append('idUsuarioAlumno', idAlumno);

                // Mapeo para backend
                if (datosApoderado.has('nombresApoderado')) {
                    datosApoderado.set('nombres', datosApoderado.get('nombresApoderado'));
                }
                if (datosApoderado.has('apellidoPaternoApoderado')) {
                    datosApoderado.set('apellidoPaterno', datosApoderado.get('apellidoPaternoApoderado'));
                }
                if (datosApoderado.has('apellidoMaternoApoderado')) {
                    datosApoderado.set('apellidoMaterno', datosApoderado.get('apellidoMaternoApoderado'));
                }
                if (datosApoderado.has('rutApoderado')) {
                    datosApoderado.set('rut', datosApoderado.get('rutApoderado'));
                }
                if (datosApoderado.has('empresaApoderado')) {
                    datosApoderado.set('empresaTrabajo', datosApoderado.get('empresaApoderado'));
                }
                if (datosApoderado.has('cargoApoderado')) {
                    datosApoderado.set('cargoEmpresa', datosApoderado.get('cargoApoderado'));
                }
                if (datosApoderado.has('direccionTrabajoApoderado')) {
                    datosApoderado.set('direccionTrabajo', datosApoderado.get('direccionTrabajoApoderado'));
                }
                if (datosApoderado.has('telefonoTrabajoApoderado')) {
                    datosApoderado.set('telefonoTrabajo', datosApoderado.get('telefonoTrabajoApoderado'));
                }
                if (datosApoderado.has('tipoApoderado')) {
                    datosApoderado.set('parentesco', datosApoderado.get('tipoApoderado'));
                }
                const responseApo = await fetch('/guardar-apoderado', {
                    method: 'POST',
                    body: datosApoderado
                });
                const resultApo = await responseApo.json();
                if (!resultApo.success) throw new Error(resultApo.error || "Error al guardar apoderado");
            }

            // 3. Guardar familiar
            const formFamiliar = document.getElementById('form-datos-familiares');
            if (formFamiliar) {
                const datosFamiliar = new FormData(formFamiliar);

                // Validación de campos obligatorios de familiar
                if (
                    !datosFamiliar.get('rutFamiliar') ||
                    !datosFamiliar.get('nombresFamiliar') ||
                    !datosFamiliar.get('apellidoPaternoFamiliar') ||
                    !datosFamiliar.get('apellidoMaternoFamiliar')
                ) {
                    mostrarMensaje("Debes completar los datos obligatorios del familiar.", "error");
                    return;
                }

                datosFamiliar.append('idUsuario', idAlumno);
                if (datosFamiliar.has('empresaFamiliar')) {
                    datosFamiliar.set('empresa', datosFamiliar.get('empresaFamiliar'));
                }
                if (datosFamiliar.has('cargoFamiliar')) {
                    datosFamiliar.set('cargo', datosFamiliar.get('cargoFamiliar'));
                }
                if (datosFamiliar.has('direccionTrabajoFamiliar')) {
                    datosFamiliar.set('direccionTrabajo', datosFamiliar.get('direccionTrabajoFamiliar'));
                }
                if (datosFamiliar.has('telefonoTrabajoFamiliar')) {
                    datosFamiliar.set('telefonoTrabajo', datosFamiliar.get('telefonoTrabajoFamiliar'));
                }
                if (datosFamiliar.has('nombresFamiliar')) {
                    datosFamiliar.set('nombres', datosFamiliar.get('nombresFamiliar'));
                }
                if (datosFamiliar.has('apellidoPaternoFamiliar')) {
                    datosFamiliar.set('apellidoPaterno', datosFamiliar.get('apellidoPaternoFamiliar'));
                }
                if (datosFamiliar.has('apellidoMaternoFamiliar')) {
                    datosFamiliar.set('apellidoMaterno', datosFamiliar.get('apellidoMaternoFamiliar'));
                }
                if (datosFamiliar.has('rutFamiliar')) {
                    datosFamiliar.set('rut', datosFamiliar.get('rutFamiliar'));
                }
                if (datosFamiliar.has('fechaNacimientoFamiliar')) {
                    datosFamiliar.set('fechaNacimiento', datosFamiliar.get('fechaNacimientoFamiliar'));
                }
                if (datosFamiliar.has('generoFamiliar')) {
                    datosFamiliar.set('genero', datosFamiliar.get('generoFamiliar'));
                }
                const responseFam = await fetch('/guardar-familiar', {
                    method: 'POST',
                    body: datosFamiliar
                });
                const resultFam = await responseFam.json();
                if (!resultFam.success) throw new Error(resultFam.error || "Error al guardar familiar");
            }

            mostrarMensaje("Todos los datos guardados correctamente", "success");
        } catch (error) {
            mostrarMensaje(error.message || "Error al guardar datos", "error");
        } finally {
            mostrarLoader(false);
        }
    }

    // =========================
    // Inicialización y navegación de pestañas
    // =========================
    if (!idAlumno) {
        mostrarMensaje('No se especificó un alumno para editar', 'error');
        setTimeout(() => {
            window.location.href = '/listar';
        }, 3000);
        return;
    }

    // Listener para el botón de guardar cambios
    const btnGuardar = document.getElementById('guardarCambios');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambios);
    }

    // Cargar datos iniciales
    cargarDatosAuxiliares().then(() => {
        cargarDatosAlumno();
        cargarDatosApoderado();
        cargarDatosFamiliares();
    });

    // Navegación de pestañas
    document.querySelectorAll('.tabs ul li').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tabs ul li').forEach(t => t.classList.remove('is-active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('is-active'));
            this.classList.add('is-active');
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => {
                if (c.id === tabId) c.classList.add('is-active');
            });
        });
    });

    // Copiar datos del familiar al apoderado
    const btnCopiar = document.getElementById('btnCopiarComoApoderado');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', function() {
            const formFamiliar = document.getElementById('form-datos-familiares');
            const formApoderado = document.getElementById('form-datos-apoderado');
            if (!formFamiliar || !formApoderado) return;

            const campos = [
                ['nombresFamiliar', 'nombresApoderado'],
                ['apellidoPaternoFamiliar', 'apellidoPaternoApoderado'],
                ['apellidoMaternoFamiliar', 'apellidoMaternoApoderado'],
                ['rutFamiliar', 'rutApoderado'],
                ['generoFamiliar', 'generoApoderado'],
                ['fechaNacimientoFamiliar', 'fechaNacimientoApoderado'],
                ['direccionTrabajoFamiliar', 'direccionTrabajoApoderado'],
                ['telefonoTrabajoFamiliar', 'telefonoTrabajoApoderado'],
                ['empresaFamiliar', 'empresaApoderado'],
                ['cargoFamiliar', 'cargoApoderado'],
                ['telefonoFamiliar', 'telefonoApoderado'],
            ];

            campos.forEach(([from, to]) => {
                const inputFrom = formFamiliar.querySelector(`[name="${from}"]`);
                const inputTo = formApoderado.querySelector(`[name="${to}"]`);
                if (inputFrom && inputTo) {
                    inputTo.value = inputFrom.value || '';
                }
            });

            // Cambia a la pestaña de apoderado (ajusta el selector según tu HTML)
            document.querySelectorAll('.tabs ul li').forEach(t => t.classList.remove('is-active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('is-active'));
            document.querySelector('[data-tab="datos-apoderado"]').classList.add('is-active');
            document.getElementById('datos-apoderado').classList.add('is-active');
        });
    }

    // =========================
    // Validaciones de campos de formulario
    // =========================

    // RUT: solo números, k/K y guion
    document.querySelectorAll('input[name="rut"], input[name="rutApoderado"], input[name="rutFamiliar"]').forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9kK\-]/g, '').toUpperCase();
        });
    });

    // Teléfonos: solo números
    document.querySelectorAll('input[name="telefono"], input[name="telefonoApoderado"], input[name="telefonoFamiliar"], input[name="telefonoTrabajoApoderado"], input[name="telefonoTrabajoFamiliar"]').forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
        });
    });

    // Nombres y apellidos: solo letras y espacios
    document.querySelectorAll('input[name="nombres"], input[name="apellidoPaterno"], input[name="apellidoMaterno"], input[name="nombresApoderado"], input[name="apellidoPaternoApoderado"], input[name="apellidoMaternoApoderado"], input[name="nombresFamiliar"], input[name="apellidoPaternoFamiliar"], input[name="apellidoMaternoFamiliar"]').forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        });
    });

    // Email: validación al perder el foco
    document.querySelectorAll('input[type="email"], input[name="email"], input[name="emailApoderado"]').forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
                mostrarMensaje("El email no es válido.", "error");
                this.focus();
            }
        });
    });

    // Función para validar RUT chileno
    function validarRutChileno(rutCompleto) {
        rutCompleto = rutCompleto.replace(/\./g, '').replace(/-/g, '').toUpperCase();
        if (!/^[0-9]+[0-9K]$/.test(rutCompleto)) return false;
        let rut = rutCompleto.slice(0, -1);
        let dv = rutCompleto.slice(-1);
        let suma = 0, multiplo = 2;
        for (let i = rut.length - 1; i >= 0; i--) {
            suma += parseInt(rut.charAt(i)) * multiplo;
            multiplo = multiplo < 7 ? multiplo + 1 : 2;
        }
        let dvEsperado = 11 - (suma % 11);
        dvEsperado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
        return dv === dvEsperado;
    }

    // Validación de RUT chileno al perder el foco
    document.querySelectorAll('input[name="rut"], input[name="rutApoderado"], input[name="rutFamiliar"]').forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value && !validarRutChileno(this.value.replace(/[^0-9kK]/g, '').toUpperCase())) {
                mostrarMensaje("El RUT ingresado no es válido.", "error");
                this.focus();
            }
        });
    });
});