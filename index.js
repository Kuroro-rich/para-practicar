const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views"))); // Servir archivos HTML

// Configuración de multer para procesar multipart/form-data
const upload = multer();

// Conexión a la base de datos
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "erp_lph",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error al conectar a la base de datos:", err);
    process.exit(1);
  }
  console.log("✅ Conectado a la base de datos MySQL");
});

// Función para manejar errores de base de datos
const handleDatabaseError = (err, res, message) => {
  console.error(message, err);
  res.status(500).json({ success: false, error: message });
};

// Rutas principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html")); // Página principal con enlaces a los formularios
});

app.get("/crear-apoderado", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "registro-completo.html"));
});

app.get("/listar", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "listar.html"));
});

app.get("/registro-completo", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "registro-completo.html"));
});

app.get("/modificar/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "modificar.html"));
});

// Rutas para obtener datos
app.get("/obtener-regiones", (req, res) => {
  const query = "SELECT id_region, nombre FROM region";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener regiones");
    res.json(results);
  });
});

// Ruta mejorada para guardar datos completos
app.post("/guardar-datos-completos", (req, res) => {
  const datos = req.body;
  console.log("Datos recibidos:", datos);

  // Verificar si tenemos el ID de usuario
  if (!datos.idUsuario) {
    return res.json({ success: false, error: "Falta el ID del usuario" });
  }

  // Actualizar información adicional del alumno que no se guardó en las rutas anteriores
  const queryActualizarAlumno = `
  UPDATE alumno 
  SET 
    origen_indigena = ?,
    realizo_pie = ?,
    educ_fisica = ?,
    alergico = ?,
    enfermedad_actual = ?,
    medicamentos_consumo = ?,
    certificado_nacimiento = ?,
    inform_personalidad = ?,
    inform_parcial_nota = ?,
    certificada_anual_estudio = ?,
    ficha_firmada = ?,
    obs = ?
  WHERE id_usuario = ?
`;

  db.query(queryActualizarAlumno, [
    datos.origenIndigena === 'Si' ? 1 : 0,
    datos.programaPIE === 'Si' ? 1 : 0,
    datos.realizaEducacionFisica === 'Si' ? 1 : 0,
    datos.alergicoMedicamento === 'Si' ? 1 : 0,
    datos.enfermedadActual || null,
    datos.medicamentoConsumo || null,
    datos.certificadoNacimiento === 'Si' ? 1 : 0,
    datos.informePersonalidad === 'Si' ? 1 : 0,
    datos.informeNotas === 'Si' ? 1 : 0,
    datos.certificadoEstudios === 'Si' ? 1 : 0,
    datos.fichaFirmada === 'Si' ? 1 : 0,
    datos.observaciones || null,
    datos.idUsuario
  ], (err) => {
    if (err) {
      console.error("Error al actualizar datos adicionales del alumno:", err);
      return res.json({ success: false, error: "Error al actualizar datos adicionales del alumno" });
    }

    // Actualizar datos del padre/madre/familiar si existen
    const queryActualizarFamiliar = `
      UPDATE alumno 
      SET 
        padre_nombre = ?,
        padre_rut = ?,
        padre_apellidoP = ?,
        padre_apellidoM = ?,
        padre_telefono = ?,
        padre_empresa = ?,
        padre_cargo = ?,
        padre_direccion_trabajo = ?,
        padre_telefono_trabajo = ?,
        vivienda = ?,
        num_hermanos = ?,
        her_estudi_act = ?,
        num_personas = ?,
        num_trabajadores = ?,
        ingreso = ?,
        viveCon = ?
      WHERE id_usuario = ?
    `;

    db.query(queryActualizarFamiliar, [
      datos.nombresFamiliar || null,
      datos.rutFamiliar || null,
      datos.apellidoPaternoFamiliar || null,
      datos.apellidoMaternoFamiliar || null,
      datos.telefonoFamiliar || null,
      datos.nombreEmpresa || null,
      datos.cargoEmpresa || null,
      datos.direccionTrabajo || null,
      datos.telefonoTrabajo || null,
      datos.tipoVivienda || null,
      datos.hermanos || null,
      datos.hermanosEstudiando || null,
      datos.personas || null,
      datos.trabajadores || null,
      datos.ingresoPesos || null,
      datos.viveCon || null,
      datos.idUsuario
    ], (err) => {
      if (err) {
        console.error("Error al actualizar datos familiares:", err);
        return res.json({ success: false, error: "Error al actualizar datos familiares" });
      }

      res.json({
        success: true,
        message: "Datos guardados correctamente",
        idUsuario: datos.idUsuario
      });
    });
  });
});

app.get("/obtener-cursos", (req, res) => {
  const query = "SELECT id_curso, nombre_curso FROM curso";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener cursos");
    res.json(results);
  });
});

// Endpoint corregido para obtener años académicos desde la tabla correcta
app.get("/obtener-anos", (req, res) => {
  const query = "SELECT id_ano, nombre_ano FROM ano_establecimiento ORDER BY nombre_ano DESC";

  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener años académicos");

    // Ya no necesitamos el mapeo personalizado porque la tabla ya tiene el formato correcto
    const formattedResults = results.map(row => {
      return {
        id_ano: row.id_ano,
        nombre_ano: `${row.nombre_ano}` // Usar directamente el valor de la columna nombre_ano
      };
    });

    res.json(formattedResults);
  });
});



app.get("/obtener-alumno/:id", (req, res) => {
  const idAlumno = req.params.id;
  const query = `
    SELECT 
      u.id_usuario AS idUsuario, 
      u.nombres AS nombres, 
      u.a_paterno AS apellidoPaterno, 
      u.a_materno AS apellidoMaterno, 
      u.rut AS rut, 
      u.sexo AS genero, 
      u.nacionalidad AS idNacionalidad,
      u.direccion AS direccion, 
      u.direccion_villa AS villa, 
      u.direccion_nro AS numero, 
      u.direccion_depto AS departamento, 
      u.telefono AS telefono, 
      u.e_mail AS email,
      u.id_comuna AS idComuna, 
      a.fecha_nacimiento AS fechaNacimiento, 
      a.id_ano AS idAno, 
      a.id_plan AS idPlan, 
      a.promedio_anterior AS promedioAnterior, 
      a.origen_indigena AS origenIndigena,
      a.realizo_pie AS programaPIE, 
      a.educ_fisica AS realizaEducacionFisica, 
      a.alergico AS alergicoMedicamento, 
      a.especificar_alergia AS especificarAlergia,
      a.enfermedad_actual AS enfermedadActual, 
      a.medicamentos_consumo AS medicamentoConsumo, 
      a.certificado_nacimiento AS certificadoNacimiento, 
      a.inform_personalidad AS informePersonalidad,
      a.inform_parcial_nota AS informeNotas, 
      a.certificada_anual_estudio AS certificadoEstudios, 
      a.ficha_firmada AS fichaFirmada, 
      a.id_estabAnterior AS idEstablecimiento,
      a.id_apoderado AS idApoderado, 
      a.persona_retiro AS personaRetiro, 
      a.obs AS observaciones, 
      aa.id_curso AS idCurso
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    LEFT JOIN alumno_ano aa ON u.id_usuario = aa.id_usuario
    WHERE u.id_usuario = ?
  `;
  db.query(query, [idAlumno], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener datos del alumno");
    if (results.length === 0) return res.status(404).json({ error: "Alumno no encontrado" });
    res.json(results[0]);
  });
});

// Rutas para verificar datos
app.get("/verificar-rut/:rut", (req, res) => {
  const rut = req.params.rut;
  if (rut === "EXTRANJERO" || rut === "SIN RUT") {
    return res.json({ existe: false });
  }

  // Validar el formato del rut 
  const rutValido = validarRut(rut);

  if (!rutValido) {
    return res.status(400).json({ existe: false, error: "RUT inválido" });
  }
  const query = "SELECT id_usuario AS idUsuario FROM usuario WHERE rut = ?";
  db.query(query, [rut], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al verificar RUT");
    res.json({
      existe: results.length > 0,
      idUsuario: results.length > 0 ? results[0].id_usuario : null,
    });
  });
});

// Rutas para registrar datos
app.post("/crear-usuario", upload.none(), (req, res) => {
  console.log(req.body);
  const {
    rut,
    nombres,
    apellidoPaterno: a_paterno,
    apellidoMaterno: a_materno,
    telefono,
    email: e_mail,
    calle: direccion,
    numeroCasa: direccion_nro,
    villa: direccion_villa,
    departamento: direccion_depto,
    comuna: id_comuna,
    genero: sexo,
    nacionalidad
  } = req.body;

  const idPerfilBase = 1; // O el valor que corresponda según tu sistema


  if (!nombres || !a_paterno) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = `
    INSERT INTO usuario (
      rut, nombres, a_paterno, a_materno, telefono, e_mail, direccion, direccion_nro, 
      direccion_villa, direccion_depto, id_comuna, sexo, nacionalidad, id_perfil_base
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Corregir los valores antes de enviarlos a la base de datos
  const id_comuna_value = id_comuna === 'null' || id_comuna === '' ? null : id_comuna;
  const nacionalidad_value = nacionalidad === 'null' || nacionalidad === '' ? null : nacionalidad;

  db.query(
    query,
    [
      rut || null,
      nombres.toUpperCase(),
      a_paterno.toUpperCase(),
      a_materno ? a_materno.toUpperCase() : "",
      telefono || null,
      e_mail || null,
      direccion || null,
      direccion_nro || null,
      direccion_villa || null,
      direccion_depto || null,
      id_comuna_value, // Usar el valor procesado
      sexo || null,
      nacionalidad_value, // Usar el valor procesado
      idPerfilBase,
    ],
    (err, result) => {
      if (err) return handleDatabaseError(err, res, "Error al registrar el usuario");
      res.json({
        success: true,
        message: "Usuario registrado correctamente",
        idUsuario: result.insertId,
      });
    }
  );
});

app.post("/crear-apoderado", upload.none(), (req, res) => {
  console.log(req);
  const datos = req.body;  // <-- Añade esta línea
  
  console.log("Datos recibidos apoderados:", datos);  // Para depuración

  // Verificar que tengamos los datos necesarios
  if (!datos.idUsuario) {
    return res.status(400).json({ success: false, error: "Falta el ID del alumno" });
  }

  // Crear un nuevo usuario para el apoderado (esto generará un nuevo ID)
  const datosUsuarioApoderado = {
    rut: datos.rutApoderado || null,
    nombres: datos.nombresApoderado ? datos.nombresApoderado.toUpperCase() : null,
    a_paterno: datos.apellidoPaternoApoderado ? datos.apellidoPaternoApoderado.toUpperCase() : null,
    a_materno: datos.apellidoMaternoApoderado ? datos.apellidoMaternoApoderado.toUpperCase() : null,
    sexo: datos.generoApoderado || null,
    telefono: datos.telefonoApoderado || null,
    e_mail: datos.emailApoderado || null,
    direccion: datos.direccionApoderado || null,
    direccion_nro: datos.numeroApoderado || null,
    direccion_villa: datos.villaApoderado || null,
    id_comuna: datos.comunaApoderado || null,
    id_perfil_base: 2, // ID perfil para apoderados
  };

  console.log("Datos de usuario apoderado:", datosUsuarioApoderado);

  // Iniciar una transacción para asegurar que todo se guarde correctamente
  db.beginTransaction(err => {
    if (err) {
      console.error("Error al iniciar transacción:", err);
      return res.status(500).json({ success: false, error: "Error al iniciar la transacción" });
    }

    // Paso 1: Insertar en la tabla usuario
    db.query("INSERT INTO usuario SET ?", datosUsuarioApoderado, (err, result) => {
      if (err) {
        console.error("Error al crear usuario-apoderado:", err);
        return db.rollback(() => {
          res.status(500).json({ success: false, error: "Error al crear registro de usuario para el apoderado" });
        });
      }

      // Obtener el nuevo ID del apoderado
      const idApoderado = result.insertId;
      console.log(`Nuevo usuario-apoderado creado con ID: ${idApoderado}`);

      // Paso 2: Insertar en la tabla apoderado
      const datosApoderado = {
        id_apoderado: idApoderado,
        id_usuario: idApoderado, // Ya has añadido esta línea, bien!
        empresa: datos.empresa || null,
        cargo: datos.cargo || null,
        sueldo: datos.sueldo || null,
        antiguedad_laboral: datos.antiguedad || null,
        direccion_trabajo: datos.direccionTrabajo || null,
        telefono_trabajo: datos.telefonoTrabajo || null
      };

      // Usar el objeto datosApoderado directamente
      db.query(
        "INSERT INTO apoderado SET ?", 
        datosApoderado,
        (err) => { 
          if (err) {
            console.error("Error al crear apoderado:", err);
            return db.rollback(() => {
              res.status(500).json({ success: false, error: "Error al crear registro de apoderado" });
            });
          }

          // Paso 3: Actualizar la relación en la tabla alumno
          db.query("UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?", 
            [idApoderado, datos.idUsuario], (err) => {
            if (err) {
              console.error("Error al asociar apoderado con alumno:", err);
              return db.rollback(() => {
                res.status(500).json({ success: false, error: "Error al asociar apoderado con alumno" });
              });
            }

            // Confirmar la transacción
            db.commit(err => {
              if (err) {
                console.error("Error al confirmar transacción:", err);
                return db.rollback(() => {
                  res.status(500).json({ success: false, error: "Error al confirmar transacción" });
                });
              }

              res.json({ 
                success: true, 
                message: "Apoderado registrado correctamente",
                idApoderado: idApoderado
              });
            });
          });
        }
      );
    });
  });
});

// En tu endpoint crear-alumno
app.post("/crear-alumno", upload.none(), (req, res) => {
  const datos = req.body;

  const idAnio = 1;

  // Obtener datos del usuario desde el formulario
  const idUsuario = datos.idUsuario;
  const promedioAnterior = datos.promedioAnterior;
  const realizoPIE = datos.programaPIE === 'Si' ? 1 : 0;
  const esAlergico = datos.alergicoMedicamento === 'Si' ? 1 : 0;
  const enfermedadActual = datos.enfermedadActual;
  const medicamentosConsumo = datos.medicamentoConsumo;
  const realizaEducFisica = datos.realizaEducacionFisica === 'Si' ? 1 : 0;
  const idEstablecimiento = datos.sinInformacion ? -1 : datos.idEstablecimientoAnterior;
  const idUsuarioInscribio = 1; // En lugar de usuarioInscribio
  // Mejor aún, validar que existe antes de intentar crear el alumno
  const idPlan = datos.plan;
  const origenIndigena = datos.origenIndigena === 'Si' ? 1 : 0;
  const certNacimiento = datos.certificadoNacimiento === 'Si' ? 1 : 0;
  const informPersonalidad = datos.informePersonalidad === 'Si' ? 1 : 0;
  const informNotas = datos.informeNotas === 'Si' ? 1 : 0;
  const certEstudios = datos.certificadoEstudios === 'Si' ? 1 : 0;
  const fichaFirmada = datos.fichaFirmada === 'Si' ? 1 : 0;
  const observaciones = datos.observaciones;

  // Query para insertar alumno
  const queryAlumno = `
  INSERT INTO alumno (
    id_usuario, promedio_anterior, realizo_pie, alergico, enfermedad_actual, 
    medicamentos_consumo, educ_fisica, id_apoderado, id_estabAnterior, id_usuario_inscribio, 
    id_ano, id_plan, origen_indigena, certificado_nacimiento, inform_personalidad,
    inform_parcial_nota, certificada_anual_estudio, ficha_firmada, obs
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`;

  // Verificar si debemos crear un apoderado
  if (datos.nombresApoderado && datos.apellidoPaternoApoderado) {
    // Preparar datos del apoderado
    const datosApoderado = {
      rut: datos.rutApoderado || null,
      ext: datos.extranjeroSinRutApoderado === true || datos.extranjeroSinRutApoderado === 'true' ? '1' : '0',
      nombres: datos.nombresApoderado ? datos.nombresApoderado.toUpperCase() : null,
      apellido_p: datos.apellidoPaternoApoderado ? datos.apellidoPaternoApoderado.toUpperCase() : null,
      apellido_m: datos.apellidoMaternoApoderado ? datos.apellidoMaternoApoderado.toUpperCase() : null,
      genero: datos.generoApoderado || null,
      fecha_nacimiento: datos.fechaNacimientoApoderado || null,
      direccion: datos.direccionApoderado || null,
      numero: datos.numeroApoderado || null,
      villa: datos.villaApoderado || null,
      id_comuna: datos.comunaApoderado || null,
      telefono: datos.telefonoApoderado || null,
      email: datos.emailApoderado || null,
      empresa: datos.empresaApoderado || null,
      cargo: datos.cargoApoderado || null,
      sueldo: datos.sueldoApoderado || 0,
      antiguedad_laboral: datos.antiguedadApoderado || 0,
      direccion_trabajo: datos.direccionTrabajoApoderado || null,
      telefono_trabajo: datos.telefonoTrabajoApoderado || null,
      tipo_apoderado: datos.tipoApoderado || null
    };

    // Crear primero el apoderado
    db.query("INSERT INTO apoderado SET ?", datosApoderado, (err, result) => {
      if (err) {
        console.error("Error al crear apoderado:", err);
        // Continuar con la creación del alumno sin apoderado
        crearAlumnoSinApoderado();
      } else {
        const idApoderado = result.insertId;
        console.log(`Apoderado creado con ID: ${idApoderado}`);
        crearAlumnoConApoderado(idApoderado);
      }
    });
  } else {
    crearAlumnoSinApoderado();
  }

  // Función para crear alumno con un apoderado
  function crearAlumnoConApoderado(idApoderado) {
    db.query(
      queryAlumno,
      [
        idUsuario,
        promedioAnterior || null,
        realizoPIE,
        esAlergico,
        enfermedadActual || null,
        medicamentosConsumo || null,
        realizaEducFisica,
        idApoderado, // Usar el ID del apoderado recién creado
        idEstablecimiento,
        idUsuarioInscribio,
        idAnio,
        idPlan || null,
        origenIndigena,
        certNacimiento,
        informPersonalidad,
        informNotas,
        certEstudios,
        fichaFirmada,
        observaciones || null
      ],
      (err) => {
        if (err) {
          console.error("Error al crear alumno con apoderado:", err);
          return res.status(500).json({
            success: false,
            error: "Error al registrar el alumno: " + err.message
          });
        }

        // Si hay curso, asignar al alumno al curso en el año especificado
        if (datos.curso) {
          asignarAlumnoCurso(idUsuario, datos.curso, idAnio);
        } else {
          // No hay curso, devolver respuesta exitosa directamente
          res.json({
            success: true,
            message: "Alumno registrado correctamente",
            idUsuario: idUsuario
          });
        }
      }
    );
  }

  // Función para crear alumno sin apoderado
  function crearAlumnoSinApoderado() {
    db.query(
      queryAlumno,
      [
        idUsuario,
        promedioAnterior || null,
        realizoPIE,
        esAlergico,
        enfermedadActual || null,
        medicamentosConsumo || null,
        realizaEducFisica,
        null, // Sin apoderado
        idEstablecimiento,
        idUsuarioInscribio,
        idAnio,
        idPlan || null,
        origenIndigena,
        certNacimiento,
        informPersonalidad,
        informNotas,
        certEstudios,
        fichaFirmada,
        observaciones || null
      ],
      (err) => {
        if (err) {
          console.error("Error al crear alumno sin apoderado:", err);
          return res.status(500).json({
            success: false,
            error: "Error al registrar el alumno: " + err.message
          });
        }

        // Si hay curso, asignar al alumno al curso en el año especificado
        if (datos.curso) {
          asignarAlumnoCurso(idUsuario, datos.curso, idAnio);
        } else {
          // No hay curso, devolver respuesta exitosa directamente
          res.json({
            success: true,
            message: "Alumno registrado correctamente",
            idUsuario: idUsuario
          });
        }
      }
    );
  }

  // Función para asignar alumno a un curso
  function asignarAlumnoCurso(idUsuario, idCurso, idAnio) {
    const queryAsignarCurso = `
      INSERT INTO alumno_ano (id_usuario, id_curso, id_ano)
      VALUES (?, ?, ?)
    `;

    db.query(queryAsignarCurso, [idUsuario, idCurso, idAnio], (err) => {
      if (err) {
        console.error("Error al asignar alumno al curso:", err);
        return res.status(500).json({
          success: false,
          error: "Error al asignar alumno al curso: " + err.message
        });
      }

      res.json({
        success: true,
        message: "Alumno registrado y asignado al curso correctamente",
        idUsuario: idUsuario
      });
    });
  }
});

// Rutas para modificar datos
app.post("/api/usuarios/modificar/:id", (req, res) => {
  const id = req.params.id;
  const { nombres, a_paterno, a_materno, rut } = req.body;

  const query = `
    UPDATE usuario
    SET nombres = ?, a_paterno = ?, a_materno = ?, rut = ?
    WHERE id_usuario = ?
  `;

  db.query(query, [nombres, a_paterno, a_materno, rut, id], (err) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar los datos del usuario");

    // Si también se necesita actualizar el curso, hacerlo en una consulta separada
    if (req.body.id_curso) {
      const queryCurso = `
        UPDATE alumno_ano
        SET id_curso = ?
        WHERE id_usuario = ?
      `;

      db.query(queryCurso, [req.body.id_curso, id], (err) => {
        if (err) {
          console.error("Error al actualizar el curso:", err);
          // No devolvemos error, el usuario ya se actualizó
        }
      });
    }

    res.json({ success: true, message: "Usuario modificado con éxito" });
  });
});

// NUEVAS RUTAS PARA EL FORMULARIO COMPLETO

// Ruta para obtener comunas por región
app.get("/obtener-comunas/:region", (req, res) => {
  const region = req.params.region;
  const query = "SELECT id_comuna, comuna FROM comuna WHERE region = ?";

  db.query(query, [region], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener comunas");
    res.json(results);
  });
});

// Ruta para obtener todas las comunas
app.get("/obtener-comunas", (req, res) => {
  const query = "SELECT id_comuna, comuna, region FROM comuna WHERE estado = 1";

  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener comunas");
    res.json(results);
  });
});

// Ruta para guardar familiares adicionales
app.post("/guardar-familiar", upload.none(), (req, res) => {
  const {
    idUsuario,
    parentesco,
    rut,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    fechaNacimiento,
    esApoderadoSuplente,
    telefono,
    sexo,
    nombreEmpresa,
    cargoEmpresa,
    direccionTrabajo,
    telefonoTrabajo
  } = req.body;

  if (!idUsuario || !parentesco || !nombres) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = `
    INSERT INTO alumno_familia (
      id_usuario, rut, ext, nombre, ap_paterno, ap_materno, 
      id_parentesco, apoderado_conf, fecha_nacimiento, sexo, telefono,
      em_nombre, em_cargo, em_direccion, em_telefono
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      idUsuario,
      rut || null,
      rut === 'SIN RUT' ? '1' : '0', // Indicador de extranjero sin RUT
      nombres.toUpperCase(),
      apellidoPaterno ? apellidoPaterno.toUpperCase() : null,
      apellidoMaterno ? apellidoMaterno.toUpperCase() : null,
      parentesco,
      esApoderadoSuplente ? '1' : '0',
      fechaNacimiento || null,
      sexo || null,
      telefono || null,
      nombreEmpresa || null,
      cargoEmpresa || null,
      direccionTrabajo || null,
      telefonoTrabajo || null
    ],
    (err, result) => {
      if (err) return handleDatabaseError(err, res, "Error al registrar el familiar");
      res.json({
        success: true,
        message: "Familiar registrado correctamente",
        idFamiliar: result.insertId
      });
    }
  );
});

// Ruta para obtener establecimientos educacionales con valores predeterminados
app.get("/obtener-establecimientos", (req, res) => {
  const busqueda = req.query.q || '';
  const query = "SELECT id_establecimiento, nombre, rbd FROM establecimiento_alumno_anterior WHERE estado = 1";

  if (busqueda) {
    db.query(
      `${query} AND (nombre LIKE ? OR rbd LIKE ?) LIMIT 20`,
      [`%${busqueda}%`, `%${busqueda}%`],
      (err, results) => {
        if (err || results.length === 0) {
          console.error("Error al buscar establecimientos:", err);
          return res.json([
            { id_establecimiento: 1, nombre: "COLEGIO PARTICULAR HENRI BACHELET", rbd: "8956-7" },
            { id_establecimiento: 2, nombre: "ESCUELA REPÚBLICA DE ISRAEL", rbd: "10352-6" },
            { id_establecimiento: 3, nombre: "COLEGIO CHILENO ÁRABE", rbd: "8963-K" },
            { id_establecimiento: 4, nombre: "LICEO INDUSTRIAL A-16", rbd: "9324-2" },
            { id_establecimiento: 5, nombre: "COLEGIO ADVENTISTA", rbd: "8842-4" }
          ]);
        }
        res.json(results);
      }
    );
  } else {
    db.query(`${query} LIMIT 100`, (err, results) => {
      if (err || results.length === 0) {
        console.error("Error al obtener establecimientos:", err);
        return res.json([
          { id_establecimiento: 1, nombre: "COLEGIO PARTICULAR HENRI BACHELET", rbd: "8956-7" },
          { id_establecimiento: 2, nombre: "ESCUELA REPÚBLICA DE ISRAEL", rbd: "10352-6" },
          { id_establecimiento: 3, nombre: "COLEGIO CHILENO ÁRABE", rbd: "8963-K" },
          { id_establecimiento: 4, nombre: "LICEO INDUSTRIAL A-16", rbd: "9324-2" },
          { id_establecimiento: 5, nombre: "COLEGIO ADVENTISTA", rbd: "8842-4" }
        ]);
      }
      res.json(results);
    });
  }
});
// Ruta para obtener datos de un familiar
app.get("/obtener-familiar/:id/:parentesco", (req, res) => {
  const idUsuario = req.params.id;
  const parentesco = req.params.parentesco;

  const query = `
    SELECT * FROM alumno_familia
    WHERE id_usuario = ? AND id_parentesco = ?
    LIMIT 1
  `;

  db.query(query, [idUsuario, parentesco], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener datos del familiar");
    if (results.length === 0) {
      res.json({ success: false, message: "No se encontró el familiar" });
    } else {
      res.json({ success: true, familiar: results[0] });
    }
  });
});

// Ruta para manejar el checkbox de "Sin RUT" al guardar o actualizar usuarios
app.post("/actualizar-rut", upload.none(), (req, res) => {
  const { idUsuario, rut, sinRut } = req.body;

  if (!idUsuario) {
    return res.status(400).json({ success: false, error: "Falta el ID del usuario" });
  }

  const rutFinal = sinRut === 'true' ? 'SIN RUT' : rut;
  const ext = sinRut === 'true' ? '1' : '0';

  const query = `
    UPDATE usuario
    SET rut = ?, ext = ?
    WHERE id_usuario = ?
  `;

  db.query(query, [rutFinal, ext, idUsuario], (err) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar el RUT del usuario");
    res.json({ success: true, message: "RUT actualizado correctamente" });
  });
});

// Ruta para obtener nacionalidades
app.get("/obtener-nacionalidades", (req, res) => {
  const query = "SELECT id_pais as id_nacionalidad,nombre as nacionalidad FROM pais WHERE estado = 1 ORDER BY nombre";


  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener nacionalidades:", err);
      // Valores por defecto en caso de error
      return res.json([
        { id_nacionalidad: 1, nacionalidad: "Chilena" },
        { id_nacionalidad: 2, nacionalidad: "Argentina" },
        { id_nacionalidad: 3, nacionalidad: "Peruana" },
        { id_nacionalidad: 4, nacionalidad: "Boliviana" },
        { id_nacionalidad: 5, nacionalidad: "Colombiana" },
        { id_nacionalidad: 6, nacionalidad: "Venezolana" },
        { id_nacionalidad: 7, nacionalidad: "Haitiana" },
        { id_nacionalidad: 8, nacionalidad: "Ecuatoriana" }
      ]);
    }
    res.json(results);
  });
});

// Ruta para obtener motivos de postulación (solo valores estáticos)
app.get("/obtener-motivos-postulacion", (req, res) => {
  // Devolvemos directamente valores predefinidos sin intentar consultar la tabla
  return res.json([
    { id_motivo: 1, descripcion: "Cerca del domicilio" },
    { id_motivo: 2, descripcion: "Recomendación de conocidos" },
    { id_motivo: 3, descripcion: "Prestigio académico" },
    { id_motivo: 4, descripcion: "Instalaciones y equipamiento" },
    { id_motivo: 5, descripcion: "Valores y formación" },
    { id_motivo: 6, descripcion: "Otro" }
  ]);
});

// Ruta para obtener planes académicos
app.get("/obtener-planes", (req, res) => {
  const query = "SELECT id_plan, nombre_plan as descripcion FROM plan_estudios ORDER BY nombre_plan";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener planes académicos:", err);
      return res.json([
        { id_plan: 1, descripcion: "PLAN FORMACIÓN GENERAL" },
        { id_plan: 8, descripcion: "FORMACIÓN DIFERENCIADA-C3" },
        { id_plan: 4, descripcion: "FORMACIÓN DIFERENCIADA-E3" },
        { id_plan: 9, descripcion: "FORMACIÓN DIFERENCIADA-E4" }
      ]);
    }
    res.json(results);
  });
});

// Endpoint para listar alumnos
app.get("/api/listar", (req, res) => {
  const { id_ano, nombre, curso } = req.query;

  console.log("Parámetros de búsqueda:", { id_ano, nombre, curso });

  // Validar parámetro año académico
  if (!id_ano) {
    return res.status(400).json({ error: "Se debe especificar un año académico" });
  }

  // Construir la consulta base
  let query = `
    SELECT 
      u.id_usuario, 
      u.rut, 
      u.nombres, 
      u.a_paterno, 
      u.a_materno,
      u.id_usuario AS id_alumno,
      c.nombre_curso AS curso
    FROM 
      usuario u
      INNER JOIN alumno a ON u.id_usuario = a.id_usuario
      LEFT JOIN alumno_ano aa ON a.id_usuario = aa.id_usuario AND aa.id_ano = ?
      LEFT JOIN curso c ON aa.id_curso = c.id_curso
    WHERE 
      aa.id_ano = ?
  `;

  const queryParams = [id_ano, id_ano];

  // Añadir filtro por nombre si se especifica
  if (nombre) {
    query += ` AND (u.nombres LIKE ? OR u.a_paterno LIKE ? OR u.a_materno LIKE ?)`;
    const nombreParam = `%${nombre}%`;
    queryParams.push(nombreParam, nombreParam, nombreParam);
  }

  // Añadir filtro por curso si se especifica
  if (curso) {
    query += ` AND c.nombre_curso LIKE ?`;
    queryParams.push(`%${curso}%`);
  }

  // Ordenar por apellidos y nombre
  query += ` ORDER BY u.a_paterno, u.a_materno, u.nombres`;

  console.log("Ejecutando consulta SQL:", query);
  console.log("Con parámetros:", queryParams);

  // Ejecutar la consulta
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error en la consulta de alumnos:', err);
      return res.status(500).json({ error: 'Error al consultar alumnos' });
    }

    console.log(`Se encontraron ${results.length} alumnos`);
    res.json(results);
  });
});

// Endpoint para obtener cursos por año
app.get("/api/cursos", (req, res) => {
  const { id_ano } = req.query;

  if (!id_ano) {
    return res.status(400).json({ error: "Se debe especificar un año académico" });
  }

  const query = `
    SELECT DISTINCT c.id_curso, c.nombre_curso 
    FROM curso c
    INNER JOIN alumno_ano aa ON c.id_curso = aa.id_curso
    WHERE aa.id_ano = ?
    ORDER BY c.nombre_curso
  `;

  db.query(query, [id_ano], (err, results) => {
    if (err) {
      console.error('Error en la consulta de cursos:', err);
      return res.status(500).json({ error: 'Error al consultar cursos' });
    }

    console.log(`Se encontraron ${results.length} cursos para el año ${id_ano}`);
    res.json(results);
  });
});



// Endpoint mejorado para exportar a Excel (versión CSV)
app.get("/exportar-excel", (req, res) => {
  const { id_ano, nombre, curso } = req.query;

  // Validar parámetro año académico
  if (!id_ano) {
    return res.status(400).json({ error: "Se debe especificar un año académico" });
  }

  // Consulta para obtener alumnos
  let query = `
    SELECT 
      u.id_usuario, 
      u.rut, 
      u.nombres, 
      u.a_paterno, 
      u.a_materno,
      c.nombre_curso AS curso
    FROM 
      usuario u
      INNER JOIN alumno a ON u.id_usuario = a.id_usuario
      LEFT JOIN alumno_ano aa ON a.id_usuario = aa.id_usuario AND aa.id_ano = ?
      LEFT JOIN curso c ON aa.id_curso = c.id_curso
    WHERE 
      aa.id_ano = ?
  `;

  const queryParams = [id_ano, id_ano];

  // Añadir filtro por nombre si se especifica
  if (nombre) {
    query += ` AND (u.nombres LIKE ? OR u.a_paterno LIKE ? OR u.a_materno LIKE ?)`;
    const nombreParam = `%${nombre}%`;
    queryParams.push(nombreParam, nombreParam, nombreParam);
  }

  // Añadir filtro por curso si se especifica
  if (curso) {
    query += ` AND c.nombre_curso LIKE ?`;
    queryParams.push(`%${curso}%`);
  }

  query += ` ORDER BY u.a_paterno, u.a_materno, u.nombres`;

  console.log("Ejecutando consulta para Excel:", query);
  console.log("Parámetros:", queryParams);

  // Ejecutar consulta
  db.query(query, queryParams, (err, alumnos) => {
    if (err) {
      console.error('Error en la consulta de alumnos para Excel:', err);
      return res.status(500).json({ error: 'Error al consultar alumnos' });
    }

    console.log(`Se encontraron ${alumnos.length} alumnos para exportar`);

    // Obtener el nombre del año académico para el nombre del archivo
    db.query("SELECT nombre_ano FROM ano_establecimiento WHERE id_ano = ?", [id_ano], (err, results) => {
      let yearName = id_ano;
      if (!err && results.length > 0) {
        yearName = results[0].nombre_ano;
      }

      try {
        // Generar un archivo HTML que Excel puede abrir directamente
        let excelContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:x="urn:schemas-microsoft-com:office:excel" 
                xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Alumnos</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table {border-collapse: collapse;}
              td, th {border: 1px solid black; padding: 4px;}
              th {background-color: #f0f0f0; font-weight: bold;}
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  <th>RUT</th>
                  <th>Nombre Completo</th>
                  <th>Curso</th>
                </tr>
              </thead>
              <tbody>`;

        alumnos.forEach(alumno => {
          const nombreCompleto = `${alumno.a_paterno || ''} ${alumno.a_materno || ''}, ${alumno.nombres}`;
          excelContent += `
                <tr>
                  <td>${alumno.rut || 'Sin RUT'}</td>
                  <td>${nombreCompleto}</td>
                  <td>${alumno.curso || 'No asignado'}</td>
                </tr>`;
        });

        excelContent += `
              </tbody>
            </table>
          </body>
          </html>`;

        // Cambiar Content-Type para que Excel lo reconozca como un archivo Excel
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename=Alumnos_${yearName}.xls`);

        console.log("Archivo Excel generado correctamente");
        res.send(excelContent);
      } catch (error) {
        console.error("Error al generar el archivo Excel:", error);
        res.status(500).json({ error: 'Error al generar el archivo Excel' });
      }
    });
  });
});

// Endpoint mejorado para obtener datos completos de un alumno por ID
app.get('/api/alumno/:id', (req, res) => {
  const idUsuario = req.params.id;

  const query = `
    SELECT 
      a.id_usuario AS idUsuario, 
      u.rut, 
      u.nombres, 
      u.a_paterno AS apellidoPaterno, 
      u.a_materno AS apellidoMaterno,
      u.direccion, 
      u.direccion_nro AS numeroDireccion, 
      u.direccion_villa AS villaOPoblacion, 
      u.direccion_depto AS departamento,
      u.telefono, 
      u.e_mail AS email,
      u.sexo AS genero,
      u.nacionalidad AS idNacionalidad,
      p.nombre AS nacionalidadNombre,
      u.id_comuna AS idComuna,
      c.comuna AS comunaNombre,
      u.fecha_nacimiento AS fechaNacimiento,
      '' AS nombreContacto,
      
      a.promedio_anterior AS promedioAnterior,
      a.origen_indigena AS origenIndigena,
      a.realizo_pie AS programaPIE,
      a.educ_fisica AS realizaEducacionFisica,
      a.alergico AS alergicoMedicamento,
      a.enfermedad_actual AS enfermedadActual,
      a.medicamentos_consumo AS medicamentoConsumo,
      a.certificado_nacimiento AS certificadoNacimiento,
      a.inform_personalidad AS informePersonalidad,
      a.inform_parcial_nota AS informeNotas,
      a.certificada_anual_estudio AS certificadoEstudios,
      a.ficha_firmada AS fichaFirmada,
      a.obs AS observaciones,
      a.id_estabAnterior AS idEstablecimientoAnterior,
      COALESCE(e.nombre, 'Sin información') AS establecimientoNombre,
      a.id_plan AS idPlan,
      pl.nombre_plan AS planNombre,
      
      cur.nombre_curso AS curso
      
    FROM alumno a
    INNER JOIN usuario u ON a.id_usuario = u.id_usuario
    LEFT JOIN pais p ON u.nacionalidad = p.id_pais
    LEFT JOIN comuna c ON u.id_comuna = c.id_comuna
    LEFT JOIN establecimiento_alumno_anterior e ON a.id_estabAnterior = e.id_establecimiento
    LEFT JOIN plan_estudios pl ON a.id_plan = pl.id_plan
    LEFT JOIN alumno_ano aa ON a.id_usuario = aa.id_usuario
    LEFT JOIN curso cur ON aa.id_curso = cur.id_curso
    WHERE a.id_usuario = ?
    ORDER BY aa.id_ano DESC
    LIMIT 1
  `;

  db.query(query, [idUsuario], (err, results) => {
    if (err) {
      console.error('Error al obtener datos del alumno:', err);
      return res.status(500).json({ error: 'Error al obtener datos del alumno' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Formatear campos binarios/numéricos a Sí/No
    const alumno = results[0];

    alumno.origenIndigena = alumno.origenIndigena === 1 ? 'Si' : 'No';
    alumno.programaPIE = alumno.programaPIE === 1 ? 'Si' : 'No';
    alumno.realizaEducacionFisica = alumno.realizaEducacionFisica === 1 ? 'Si' : 'No';
    alumno.alergicoMedicamento = alumno.alergicoMedicamento === 1 ? 'Si' : 'No';
    alumno.certificadoNacimiento = alumno.certificadoNacimiento === 1 ? 'Si' : 'No';
    alumno.informePersonalidad = alumno.informePersonalidad === 1 ? 'Si' : 'No';
    alumno.informeNotas = alumno.informeNotas === 1 ? 'Si' : 'No';
    alumno.certificadoEstudios = alumno.certificadoEstudios === 1 ? 'Si' : 'No';
    alumno.fichaFirmada = alumno.fichaFirmada === 1 ? 'Si' : 'No';

    console.log("Datos del alumno:", alumno);
    res.json(alumno);
  });
});

// Endpoint para actualizar datos del alumno
app.post('/actualizar-alumno/:id', upload.none(), (req, res) => {
  const idAlumno = req.params.id;
  const datos = req.body;

  console.log("Actualizando alumno:", idAlumno, "Datos:", datos);
  console.log("ID usuario recibido:", datos.idUsuario || datos.id_usuario);

  // Verificar que tengamos un ID de usuario válido
  const idUsuario = datos.idUsuario || datos.id_usuario;

  if (!idUsuario || idUsuario === 'undefined') {
    return res.status(400).json({ error: 'ID de usuario no válido' });
  }

  // Datos para la tabla usuario (solo incluir campos que existen y con valores válidos)
  const datosUsuario = {
    nombres: datos.nombres || '',
    a_paterno: datos.apellidoPaterno || '',
    a_materno: datos.apellidoMaterno || ''
  };

  // Agregar solo los campos que tengan valores definidos
  if (datos.rut !== undefined) datosUsuario.rut = datos.sinRut ? 'SIN RUT' : datos.rut;
  if (datos.sinRut !== undefined) datosUsuario.ext = datos.sinRut ? '1' : '0';
  if (datos.nacionalidad) datosUsuario.nacionalidad = datos.nacionalidad;
  if (datos.genero) datosUsuario.sexo = datos.genero;
  if (datos.direccion) datosUsuario.direccion = datos.direccion;
  if (datos.numero) datosUsuario.direccion_nro = datos.numero;
  if (datos.villa) datosUsuario.direccion_villa = datos.villa;
  if (datos.departamento) datosUsuario.direccion_depto = datos.departamento;
  if (datos.telefono) datosUsuario.telefono = datos.telefono;
  if (datos.comuna) datosUsuario.id_comuna = datos.comuna;
  if (datos.email) datosUsuario.e_mail = datos.email;
  if (datos.nombreContacto) datosUsuario.nombre_contacto = datos.nombreContacto;

  // Datos para la tabla alumno (solo campos que existen y con valores válidos)
  const datosAlumno = {};

  // Añadir estas líneas
  if (datos.anioIngreso) {
    datosAlumno.id_ano = datos.anioIngreso;

    // También actualizar la tabla alumno_ano si existe un curso
    const idCurso = datos.curso || null;
    if (idCurso) {
      db.query('UPDATE alumno_ano SET id_ano = ?, id_curso = ? WHERE id_usuario = ?',
        [datos.anioIngreso, idCurso, idUsuario], (err) => {
          if (err) {
            console.error('Error al actualizar año/curso:', err);
            // No afecta la transacción principal
          }
        });
    }
  }

  // Resto de asignaciones existentes
  if (datos.checkSinInformacion !== undefined || datos.idEstablecimientoAnterior)
    datosAlumno.id_estabAnterior = datos.checkSinInformacion ? -1 : datos.idEstablecimientoAnterior;
  if (datos.promedioAnterior) datosAlumno.promedio_anterior = datos.promedioAnterior;
  if (datos.programaPIE !== undefined) datosAlumno.realizo_pie = datos.programaPIE === 'Si' ? 1 : 0;
  if (datos.plan) datosAlumno.id_plan = datos.plan;
  if (datos.alergicoMedicamento !== undefined) datosAlumno.alergico = datos.alergicoMedicamento === 'Si' ? 1 : 0;
  if (datos.enfermedadActual) datosAlumno.enfermedad_actual = datos.enfermedadActual;
  if (datos.medicamentoConsumo) datosAlumno.medicamentos_consumo = datos.medicamentoConsumo;
  if (datos.realizaEducFisica !== undefined) datosAlumno.educ_fisica = datos.realizaEducFisica === 'Si' ? 1 : 0;
  if (datos.certificadoNacimiento !== undefined) datosAlumno.certificado_nacimiento = datos.certificadoNacimiento === 'Si' ? 1 : 0;
  if (datos.informePersonalidad !== undefined) datosAlumno.inform_personalidad = datos.informePersonalidad === 'Si' ? 1 : 0;
  if (datos.informeNotas !== undefined) datosAlumno.inform_parcial_nota = datos.informeNotas === 'Si' ? 1 : 0;
  if (datos.certificadoEstudios !== undefined) datosAlumno.certificada_anual_estudio = datos.certificadoEstudios === 'Si' ? 1 : 0;
  if (datos.fichaFirmada !== undefined) datosAlumno.ficha_firmada = datos.fichaFirmada === 'Si' ? 1 : 0;
  if (datos.origenIndigena !== undefined) datosAlumno.origen_indigena = datos.origenIndigena === 'Si' ? 1 : 0;

  console.log("Datos a actualizar - Usuario:", datosUsuario);
  console.log("Datos a actualizar - Alumno:", datosAlumno);

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar transacción:', err);
      return res.status(500).json({ error: 'Error al actualizar alumno' });
    }

    // Paso 1: Actualizar usuario
    db.query('UPDATE usuario SET ? WHERE id_usuario = ?',
      [datosUsuario, idUsuario], (err) => {
        if (err) {
          console.error('Error al actualizar usuario:', err);
          return db.rollback(() => {
            res.status(500).json({ error: 'Error al actualizar datos del usuario: ' + err.message });
          });
        }

        // Solo actualizar alumno si hay datos que actualizar
        if (Object.keys(datosAlumno).length > 0) {
          // Paso 2: Actualizar alumno
          db.query('UPDATE alumno SET ? WHERE id_usuario = ?',
            [datosAlumno, idUsuario], (err) => {
              if (err) {
                console.error('Error al actualizar alumno:', err);
                return db.rollback(() => {
                  res.status(500).json({ error: 'Error al actualizar datos del alumno: ' + err.message });
                });
              }

              // Confirmar transacción
              commitTransaction();
            });
        } else {
          // No hay datos de alumno para actualizar, confirmar la transacción directamente
          commitTransaction();
        }

        function commitTransaction() {
          db.commit((err) => {
            if (err) {
              console.error('Error al finalizar transacción:', err);
              return db.rollback(() => {
                res.status(500).json({ error: 'Error al guardar los cambios: ' + err.message });
              });
            }

            res.json({ success: true, message: 'Alumno actualizado correctamente' });
          });
        }
      });
  });
});

// Endpoint para actualizar familiar
app.post('/actualizar-familiar/:id', upload.none(), (req, res) => {
  const idFamiliar = req.params.id;
  const datos = req.body;

  console.log("Actualizando familiar:", idFamiliar);

  const datosFamiliar = {
    parentesco: datos.parentesco || datos.parentescoApoderado,
    rut: datos.rut || datos.rutApoderado || datos.rutFamiliar,
    nombre: datos.nombres || datos.nombresApoderado || datos.nombresFamiliar,
    ap_paterno: datos.apellidoPaterno || datos.apellidoPaternoApoderado || datos.apellidoPaternoFamiliar,
    ap_materno: datos.apellidoMaterno || datos.apellidoMaternoApoderado || datos.apellidoMaternoFamiliar,
    fecha_nacimiento: datos.fechaNacimiento || datos.fechaNacimientoApoderado || datos.fechaNacimientoFamiliar,
    em_cargo: datos.cargo || datos.cargoApoderado,
    em_nombre: datos.empresa || datos.empresaApoderado,
    em_direccion: datos.direccionTrabajo || datos.direccionTrabajoApoderado,
    em_telefono: datos.telefonoTrabajo || datos.telefonoTrabajoApoderado,
    apoderado_conf: datos.esApoderadoSuplente || (datos.apoderadoSuplente ? 1 : 0)
  };

  db.query('UPDATE alumno_familia SET ? WHERE id_alumno_familia = ?',
    [datosFamiliar, idFamiliar], (err) => { // ← Eliminar "_" completamente
      if (err) {
        console.error('Error al actualizar familiar:', err);
        return res.status(500).json({ error: 'Error al actualizar familiar' });
      }

      res.json({ success: true, message: 'Familiar actualizado correctamente' });
    });
});

// Endpoint para eliminar familiar
app.delete('/eliminar-familiar/:id', (req, res) => {
  const idFamiliar = req.params.id;

  db.query('DELETE FROM alumno_familia WHERE id_alumno_familia = ?', [idFamiliar], (err) => { // ← Eliminar "_" completamente
    if (err) {
      console.error('Error al eliminar familiar:', err);
      return res.status(500).json({ error: 'Error al eliminar familiar' });
    }

    res.json({ success: true, message: 'Familiar eliminado correctamente' });
  });
});

// Endpoint para obtener todos los familiares de un alumno
app.get('/api/familiares', (req, res) => {
  const idUsuario = req.query.id_usuario;

  if (!idUsuario) {
    return res.status(400).json({ error: 'Falta el ID del usuario' });
  }

  const query = `
    SELECT 
      id_alumno_familia AS idFamiliar,  
      id_usuario AS idUsuario,
      id_parentesco AS parentesco,
      rut,
      nombre AS nombres,
      ap_paterno AS apellidoPaterno,
      ap_materno AS apellidoMaterno,
      fecha_nacimiento AS fechaNacimiento,
      apoderado_conf AS esApoderadoSuplente,
      sexo,
      telefono,
      em_nombre AS empresa,
      em_cargo AS cargo,
      em_direccion AS direccionTrabajo,
      em_telefono AS telefonoTrabajo
    FROM alumno_familia
    WHERE id_usuario = ?
  `;

  db.query(query, [idUsuario], (err, results) => {
    if (err) {
      console.error('Error al obtener familiares:', err);
      return res.status(500).json({ error: 'Error al obtener familiares' });
    }

    res.json(results);
  });
});

// Añadir este endpoint manteniendo el anterior para compatibilidad
app.get('/api/familiares/:idUsuario', (req, res) => {
  const idUsuario = req.params.idUsuario;

  // Mismo código que el existente...
  const query = `
    SELECT 
      id_alumno_familia AS idFamiliar,  
      id_usuario AS idUsuario,
      id_parentesco AS parentesco,
      rut,
      nombre AS nombres,
      ap_paterno AS apellidoPaterno,
      ap_materno AS apellidoMaterno,
      fecha_nacimiento AS fechaNacimiento,
      apoderado_conf AS esApoderadoSuplente,
      sexo,
      telefono,
      em_nombre AS empresa,
      em_cargo AS cargo,
      em_direccion AS direccionTrabajo,
      em_telefono AS telefonoTrabajo
    FROM alumno_familia
    WHERE id_usuario = ?
  `;

  db.query(query, [idUsuario], (err, results) => {
    if (err) {
      console.error('Error al obtener familiares:', err);
      return res.status(500).json({ error: 'Error al obtener familiares' });
    }

    res.json(results);
  });
});

// Endpoint para guardar o actualizar apoderado
app.post("/guardar-apoderado", upload.none(), (req, res) => {
  const datos = req.body;

  // Verificar datos requeridos
  if (!datos.idUsuario) {
    return res.status(400).json({ success: false, error: "Falta el ID del alumno" });
  }

  console.log("Guardando apoderado para alumno ID:", datos.idUsuario);

  // Preparar datos para la tabla apoderado
  const datosApoderado = {
    // Datos básicos
    rut: datos.rutApoderado || null,
    ext: datos.extranjeroSinRutApoderado === true || datos.extranjeroSinRutApoderado === 'true' ? '1' : '0',
    nombres: datos.nombresApoderado ? datos.nombresApoderado.toUpperCase() : null,
    apellido_p: datos.apellidoPaternoApoderado ? datos.apellidoPaternoApoderado.toUpperCase() : null,
    apellido_m: datos.apellidoMaternoApoderado ? datos.apellidoMaternoApoderado.toUpperCase() : null,
    genero: datos.generoApoderado || null,
    fecha_nacimiento: datos.fechaNacimientoApoderado || null,
    direccion: datos.direccionApoderado || null,
    numero: datos.numeroApoderado || null,
    villa: datos.villaApoderado || null,
    id_comuna: datos.comunaApoderado || null,
    telefono: datos.telefonoApoderado || null,
    email: datos.emailApoderado || null,
    empresa: datos.empresaApoderado || null,
    cargo: datos.cargoApoderado || null,
    sueldo: datos.sueldoApoderado || 0,
    antiguedad_laboral: datos.antiguedadApoderado || 0,
    direccion_trabajo: datos.direccionTrabajoApoderado || null,
    telefono_trabajo: datos.telefonoTrabajoApoderado || null,
    tipo_apoderado: datos.tipoApoderado || null
  };

  // Primero verificamos si ya existe un apoderado para este alumno
  db.query("SELECT id_apoderado FROM alumno WHERE id_usuario = ?", [datos.idUsuario], (err, results) => {
    if (err) {
      console.error("Error al verificar apoderado existente:", err);
      return res.status(500).json({ success: false, error: "Error en la base de datos" });
    }

    const existeApoderado = results.length > 0 && results[0].id_apoderado;

    if (existeApoderado) {
      // Actualizar apoderado existente
      db.query("UPDATE apoderado SET ? WHERE id_apoderado = ?",
        [datosApoderado, results[0].id_apoderado], (err) => {
          if (err) {
            console.error("Error al actualizar apoderado:", err);
            return res.status(500).json({ success: false, error: "Error al actualizar apoderado" });
          }

          res.json({
            success: true,
            message: "Apoderado actualizado correctamente",
            idApoderado: results[0].id_apoderado
          });
        });
    } else {
      // Crear nuevo apoderado
      db.query("INSERT INTO apoderado SET ?", datosApoderado, (err, result) => {
        if (err) {
          console.error("Error al crear apoderado:", err);
          return res.status(500).json({ success: false, error: "Error al crear apoderado" });
        }

        const idApoderado = result.insertId;

        // Actualizar la referencia en la tabla alumno
        db.query("UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?",
          [idApoderado, datos.idUsuario], (err) => {
            if (err) {
              console.error("Error al actualizar referencia del apoderado:", err);
              return res.status(500).json({ success: false, error: "Error al actualizar referencia del apoderado" });
            }

            res.json({
              success: true,
              message: "Apoderado creado correctamente",
              idApoderado: idApoderado
            });
          });
      });
    }
  });
});

// Endpoint para obtener datos del apoderado de un alumno
app.get("/api/apoderado/:idUsuario", (req, res) => {
  const idUsuario = req.params.idUsuario;

  if (!idUsuario) {
    return res.status(400).json({ success: false, error: "Falta el ID del alumno" });
  }

  // Primero obtenemos el id_apoderado desde la tabla alumno
  db.query("SELECT id_apoderado FROM alumno WHERE id_usuario = ?", [idUsuario], (err, results) => {
    if (err) {
      console.error("Error al buscar referencia del apoderado:", err);
      return res.status(500).json({ success: false, error: "Error en la base de datos" });
    }

    if (results.length === 0 || !results[0].id_apoderado) {
      return res.json({ success: false, message: "No se encontró apoderado para este alumno" });
    }

    const idApoderado = results[0].id_apoderado;

    // Obtenemos los datos completos del apoderado
    const query = `
      SELECT 
        a.id_apoderado AS idApoderado,
        a.rut AS rutApoderado,
        a.ext AS extranjeroSinRutApoderado,
        a.nombres AS nombresApoderado,
        a.apellido_p AS apellidoPaternoApoderado,
        a.apellido_m AS apellidoMaternoApoderado,
        a.genero AS generoApoderado,
        a.fecha_nacimiento AS fechaNacimientoApoderado,
        a.direccion AS direccionApoderado,
        a.numero AS numeroApoderado,
        a.villa AS villaApoderado,
        a.id_comuna AS comunaApoderado,
        c.comuna AS nombreComunaApoderado,
        a.telefono AS telefonoApoderado,
        a.email AS emailApoderado,
        a.empresa AS empresaApoderado,
        a.cargo AS cargoApoderado,
        a.sueldo AS sueldoApoderado,
        a.antiguedad_laboral AS antiguedadApoderado,
        a.direccion_trabajo AS direccionTrabajoApoderado,
        a.telefono_trabajo AS telefonoTrabajoApoderado,
        a.tipo_apoderado AS tipoApoderado
      FROM apoderado a
      LEFT JOIN comuna c ON a.id_comuna = c.id_comuna
      WHERE a.id_apoderado = ?
    `;

    db.query(query, [idApoderado], (err, results) => {
      if (err) {
        console.error("Error al obtener datos del apoderado:", err);
        return res.status(500).json({ success: false, error: "Error al obtener datos del apoderado" });
      }

      if (results.length === 0) {
        return res.json({ success: false, message: "No se encontraron datos del apoderado" });
      }

      // Convertir valor binario a booleano para checkboxes
      const apoderado = results[0];
      apoderado.extranjeroSinRutApoderado = apoderado.extranjeroSinRutApoderado === '1';

      res.json({ success: true, apoderado: apoderado });
    });
  });
});

// Función para validar RUT chileno
function validarRut(rut) {
  // Eliminar puntos y guión si existen
  rut = rut.replace(/\./g, '').replace('-', '');
  
  // Verificar si el RUT está vacío o es un caso especial
  if (!rut || rut === 'SINRUT' || rut === 'SIN RUT' || rut === 'EXTRANJERO') {
    return true; // Permitimos estos casos especiales
  }
  
  // Verificar longitud mínima
  if (rut.length < 2) {
    return false;
  }
  
  // Separar cuerpo y dígito verificador
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;
  
  // Calcular suma ponderada
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  // Calcular dígito verificador esperado
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado;
  
  if (dvEsperado === 11) {
    dvCalculado = '0';
  } else if (dvEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = dvEsperado.toString();
  }
  
  // Comparar dígito verificador calculado con el proporcionado
  return dvCalculado === dv;
}

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
