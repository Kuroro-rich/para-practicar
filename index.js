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

// Función para validar RUT chileno
function validarRut(rutCompleto) {
  if (!rutCompleto) return false;

  // Acepta formato con puntos y guión
  if (rutCompleto.includes("EXTRANJERO") || rutCompleto.includes("SIN RUT")) return true;

  // Limpiar el RUT de caracteres no deseados
  rutCompleto = rutCompleto.replace(/\./g, "").replace("-", "").trim().toUpperCase();

  if (!/^[0-9]{7,8}[0-9K]$/i.test(rutCompleto)) return false;

  const rut = rutCompleto.slice(0, -1);
  let dv = rutCompleto.slice(-1).toUpperCase();

  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut.charAt(i)) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();

  return dv === dvCalculado;
}

// =========================================================
// Rutas principales
// =========================================================

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

// =========================================================
// Rutas para obtener datos auxiliares
// =========================================================

app.get("/obtener-regiones", (req, res) => {
  const query = "SELECT id_region, nombre FROM region";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener regiones");
    res.json(results);
  });
});

app.get("/obtener-nacionalidades", (req, res) => {
  const query = "SELECT id_pais AS id_nacionalidad, nombre AS nacionalidad FROM pais WHERE estado = 1";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener nacionalidades");
    res.json(results);
  });
});

app.get("/obtener-comunas", (req, res) => {
  const query = "SELECT id_comuna, comuna FROM comuna ORDER BY comuna";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener comunas");
    res.json(results);
  });
});

app.get("/obtener-establecimientos", (req, res) => {
  const query = "SELECT id_establecimiento, nombre FROM establecimiento_alumno_anterior ORDER BY nombre";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener establecimientos");
    res.json(results);
  });
});

app.get('/obtener-planes', (req, res) => {
  // CORREGIR: Cambiar 'plan' a 'plan_estudios'
  const query = "SELECT id_plan, nombre_plan FROM plan_estudios ORDER BY nombre_plan";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener planes:', err);
      return res.status(500).json({ error: 'Error al cargar los planes de estudio' });
    }
    res.json(results);
  });
});

app.get("/obtener-cursos", (req, res) => {
  const query = "SELECT id_curso, nombre_curso FROM curso";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener cursos");
    res.json(results);
  });
});

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

// =========================================================
// Rutas para verificación de datos
// =========================================================

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
      idUsuario: results.length > 0 ? results[0].idUsuario : null,
    });
  });
});

// =========================================================
// Rutas para obtener datos de alumnos y apoderados
// =========================================================

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

app.get("/api/alumno/:id", (req, res) => {
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

app.get("/api/apoderado/:idUsuario", (req, res) => {
  const idUsuario = req.params.idUsuario;

  // Primero, obtenemos el id_apoderado del alumno
  const queryAlumno = "SELECT id_apoderado FROM alumno WHERE id_usuario = ?";

  db.query(queryAlumno, [idUsuario], (err, alumnoResults) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener datos del apoderado");

    if (alumnoResults.length === 0 || !alumnoResults[0].id_apoderado) {
      return res.json({
        success: false,
        message: "No se encontró apoderado para este alumno"
      });
    }

    const idApoderado = alumnoResults[0].id_apoderado;

    // Ahora obtenemos los datos del apoderado
    const queryApoderado = `
      SELECT 
        a.id_apoderado AS idApoderado,
        a.tipo_apoderado AS tipoApoderado,
        u.rut AS rut,
        u.nombres AS nombres,
        u.a_paterno AS apellidoPaterno,
        u.a_materno AS apellidoMaterno,
        u.telefono AS telefono,
        u.e_mail AS email,
        a.nombre_empresa AS empresa,
        a.cargo AS cargo,
        a.direccion_empresa AS direccionTrabajo,
        a.telefono_empresa AS telefonoTrabajo,
        u.fecha_nacimiento AS fechaNacimiento
      FROM apoderado a
      JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.id_usuario = ?
    `;

    db.query(queryApoderado, [idApoderado], (err, results) => {
      if (err) return handleDatabaseError(err, res, "Error al obtener datos del apoderado");

      if (results.length === 0) {
        return res.json({
          success: false,
          message: "No se encontró el apoderado en la base de datos"
        });
      }

      res.json({
        success: true,
        apoderado: results[0]
      });
    });
  });
});

app.get("/api/familiares/:idUsuario", (req, res) => {
  const idUsuario = req.params.idUsuario;
  const query = `
    SELECT 
      id_alumno_familia AS idFamiliar,
      id_usuario AS idUsuario,
      id_parentesco AS parentesco,
      nombre AS nombres,
      ap_paterno AS apellidoPaterno,
      ap_materno AS apellidoMaterno,
      rut,
      fecha_nacimiento AS fechaNacimiento,
      sexo AS genero,
      telefono,
      em_nombre AS empresa,
      em_cargo AS cargo,
      em_direccion AS direccionTrabajo,
      em_telefono AS telefonoTrabajo,
      apoderado_conf AS esApoderadoSuplente
    FROM alumno_familia
    WHERE id_usuario = ?
  `;

  db.query(query, [idUsuario], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener familiares");
    res.json(results);
  });
});

app.get("/obtener-familiar/:id/:parentesco", (req, res) => {
  const idUsuario = req.params.id;
  const parentesco = req.params.parentesco;

  const query = `
    SELECT 
      id_alumno_familia AS idFamiliar,
      id_usuario AS idUsuario,
      id_parentesco AS parentesco,
      nombre AS nombres,
      ap_paterno AS apellidoPaterno,
      ap_materno AS apellidoMaterno,
      rut,
      fecha_nacimiento AS fechaNacimiento,
      sexo AS genero,
      telefono,
      em_nombre AS empresa,
      em_cargo AS cargo,
      em_direccion AS direccionTrabajo,
      em_telefono AS telefonoTrabajo,
      apoderado_conf AS esApoderadoSuplente
    FROM alumno_familia
    WHERE id_usuario = ? AND id_parentesco = ?
  `;

  db.query(query, [idUsuario, parentesco], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener familiar");

    if (results.length === 0) {
      res.json({ success: false, message: "No se encontró el familiar" });
    } else {
      res.json({ success: true, familiar: results[0] });
    }
  });
});

app.get("/api/listar", (req, res) => {
  const { ano, nombre, curso } = req.query;

  let query = `
    SELECT 
      u.id_usuario AS idUsuario, 
      u.rut, 
      u.nombres, 
      u.a_paterno AS apellidoPaterno, 
      u.a_materno AS apellidoMaterno, 
      c.nombre_curso AS curso, 
      a.id_ano AS idAno
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    LEFT JOIN alumno_ano aa ON u.id_usuario = aa.id_usuario
    LEFT JOIN curso c ON aa.id_curso = c.id_curso
    WHERE 1=1
  `;

  const params = [];

  if (ano) {
    query += " AND a.id_ano = ?";
    params.push(ano);
  }

  if (curso) {
    query += " AND aa.id_curso = ?";
    params.push(curso);
  }

  if (nombre) {
    query += " AND (u.nombres LIKE ? OR u.a_paterno LIKE ? OR u.a_materno LIKE ?)";
    const nombreParam = `%${nombre}%`;
    params.push(nombreParam, nombreParam, nombreParam);
  }

  query += " ORDER BY u.a_paterno, u.a_materno, u.nombres";

  db.query(query, params, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener listado de alumnos");
    res.json(results);
  });
});

// Rutas para crear y actualizar datos de alumnos
app.post("/crear-alumno", upload.none(), (req, res) => {
  const {
    idUsuario,
    fechaNacimiento,
    idAno,
    idPlan,
    promedioAnterior,
    idEstablecimiento,
    idApoderado,
    origenIndigena,
    programaPIE,
    realizaEducacionFisica,
    alergicoMedicamento,
    especificarAlergia,
    enfermedadActual,
    medicamentoConsumo,
    certificadoNacimiento,
    informePersonalidad,
    informeNotas,
    certificadoEstudios,
    fichaFirmada,
    personaRetiro,
    observaciones,
    idCurso
  } = req.body;

  // Validar campos obligatorios
  if (!idUsuario || !idAno || !idCurso) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  // Primero insertar en la tabla alumno
  const queryAlumno = `
    INSERT INTO alumno (
      id_usuario, fecha_nacimiento, id_ano, id_plan, promedio_anterior, 
      id_estabAnterior, id_apoderado, origen_indigena, realizo_pie, 
      educ_fisica, alergico, especificar_alergia, enfermedad_actual, 
      medicamentos_consumo, certificado_nacimiento, inform_personalidad, 
      inform_parcial_nota, certificada_anual_estudio, ficha_firmada, 
      persona_retiro, obs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valoresAlumno = [
    idUsuario,
    fechaNacimiento || null,
    idAno,
    idPlan || null,
    promedioAnterior || null,
    idEstablecimiento || null,
    idApoderado || null,
    origenIndigena === 'true' || origenIndigena === true || origenIndigena === 1 ? 1 : 0,
    programaPIE === 'true' || programaPIE === true || programaPIE === 1 ? 1 : 0,
    realizaEducacionFisica === 'true' || realizaEducacionFisica === true || realizaEducacionFisica === 1 ? 1 : 0,
    alergicoMedicamento === 'true' || alergicoMedicamento === true || alergicoMedicamento === 1 ? 1 : 0,
    especificarAlergia || null,
    enfermedadActual || null,
    medicamentoConsumo || null,
    certificadoNacimiento === 'true' || certificadoNacimiento === true || certificadoNacimiento === 1 ? 1 : 0,
    informePersonalidad === 'true' || informePersonalidad === true || informePersonalidad === 1 ? 1 : 0,
    informeNotas === 'true' || informeNotas === true || informeNotas === 1 ? 1 : 0,
    certificadoEstudios === 'true' || certificadoEstudios === true || certificadoEstudios === 1 ? 1 : 0,
    fichaFirmada === 'true' || fichaFirmada === true || fichaFirmada === 1 ? 1 : 0,
    personaRetiro || null,
    observaciones || null
  ];

  db.query(queryAlumno, valoresAlumno, (err, resultAlumno) => {
    if (err) return handleDatabaseError(err, res, "Error al registrar el alumno");

    // Luego insertar en la tabla alumno_ano
    const queryAlumnoAno = `
      INSERT INTO alumno_ano (id_usuario, id_curso, id_ano) 
      VALUES (?, ?, ?)
    `;

    const valoresAlumnoAno = [idUsuario, idCurso, idAno];

    db.query(queryAlumnoAno, valoresAlumnoAno, (err, resultAlumnoAno) => {
      if (err) return handleDatabaseError(err, res, "Error al registrar el alumno en el curso");

      res.json({
        success: true,
        message: "Alumno registrado correctamente",
        idUsuario: idUsuario
      });
    });
  });
});

app.post("/actualizar-alumno/:id", upload.none(), (req, res) => {
  const idUsuario = req.params.id;
  const {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    genero,
    idNacionalidad,
    direccion,
    villa,
    numero,
    departamento,
    telefono,
    email,
    idComuna,
    fechaNacimiento,
    idAno,
    idPlan,
    promedioAnterior,
    idEstablecimiento,
    idApoderado,
    origenIndigena,
    programaPIE,
    realizaEducacionFisica,
    alergicoMedicamento,
    especificarAlergia,
    enfermedadActual,
    medicamentoConsumo,
    certificadoNacimiento,
    informePersonalidad,
    informeNotas,
    certificadoEstudios,
    fichaFirmada,
    personaRetiro,
    observaciones,
    idCurso
  } = req.body;

  // Primero actualizar la tabla usuario
  const queryUsuario = `
    UPDATE usuario SET
      nombres = ?,
      a_paterno = ?,
      a_materno = ?,
      rut = ?,
      sexo = ?,
      nacionalidad = ?,
      direccion = ?,
      direccion_villa = ?,
      direccion_nro = ?,
      direccion_depto = ?,
      telefono = ?,
      e_mail = ?,
      id_comuna = ?
    WHERE id_usuario = ?
  `;

  const valoresUsuario = [
    nombres ? nombres.toUpperCase() : null,
    apellidoPaterno ? apellidoPaterno.toUpperCase() : null,
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut || null,
    genero || null,
    idNacionalidad || null, // ✅ Corregido
    direccion || null,
    villa || null,
    numero || null,
    departamento || null,
    idComuna || null, // ✅ Corregido
    telefono || null, // ✅ Corregido
    email || null,
    idUsuario
  ];

  db.query(queryUsuario, valoresUsuario, (err, resultUsuario) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar datos del usuario");

    // Comprobar si existe un registro en la tabla alumno
    const queryCheckAlumno = "SELECT id_usuario FROM alumno WHERE id_usuario = ?";
    db.query(queryCheckAlumno, [idUsuario], (err, checkResult) => {
      if (err) return handleDatabaseError(err, res, "Error al verificar existencia del alumno");

      let queryAlumno;
      let valoresAlumno;

      if (checkResult.length === 0) {
        // Si no existe, crear un nuevo registro
        queryAlumno = `
          INSERT INTO alumno (
            id_usuario, fecha_nacimiento, id_ano, id_plan, promedio_anterior, 
            id_estabAnterior, id_apoderado, origen_indigena, realizo_pie, 
            educ_fisica, alergico, especificar_alergia, enfermedad_actual, 
            medicamentos_consumo, certificado_nacimiento, inform_personalidad, 
            inform_parcial_nota, certificada_anual_estudio, ficha_firmada, 
            persona_retiro, obs
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        valoresAlumno = [
          idUsuario,
          fechaNacimiento || null,
          idAno,
          idPlan || null,
          promedioAnterior || null,
          idEstablecimiento || null,
          idApoderado || null,
          origenIndigena === 'true' || origenIndigena === true || origenIndigena === 1 ? 1 : 0,
          programaPIE === 'true' || programaPIE === true || programaPIE === 1 ? 1 : 0,
          realizaEducacionFisica === 'true' || realizaEducacionFisica === true || realizaEducacionFisica === 1 ? 1 : 0,
          alergicoMedicamento === 'true' || alergicoMedicamento === true || alergicoMedicamento === 1 ? 1 : 0,
          especificarAlergia || null,
          enfermedadActual || null,
          medicamentoConsumo || null,
          certificadoNacimiento === 'true' || certificadoNacimiento === true || certificadoNacimiento === 1 ? 1 : 0,
          informePersonalidad === 'true' || informePersonalidad === true || informePersonalidad === 1 ? 1 : 0,
          informeNotas === 'true' || informeNotas === true || informeNotas === 1 ? 1 : 0,
          certificadoEstudios === 'true' || certificadoEstudios === true || certificadoEstudios === 1 ? 1 : 0,
          fichaFirmada === 'true' || fichaFirmada === true || fichaFirmada === 1 ? 1 : 0,
          personaRetiro || null,
          observaciones || null
        ];

        db.query(queryAlumno, valoresAlumno, (err, resultAlumno) => {
          if (err) return handleDatabaseError(err, res, "Error al registrar el alumno");

          // Luego insertar en la tabla alumno_ano
          const queryAlumnoAno = `
            INSERT INTO alumno_ano (id_usuario, id_curso, id_ano) 
            VALUES (?, ?, ?)
          `;

          const valoresAlumnoAno = [idUsuario, idCurso, idAno];

          db.query(queryAlumnoAno, valoresAlumnoAno, (err, resultAlumnoAno) => {
            if (err) return handleDatabaseError(err, res, "Error al registrar el alumno en el curso");

            res.json({
              success: true,
              message: "Alumno registrado correctamente",
              idUsuario: idUsuario
            });
          });
        });
      } else {
        // Si existe, actualizar el registro existente
        queryAlumno = `
          UPDATE alumno SET
            fecha_nacimiento = ?,
            id_ano = ?,
            id_plan = ?,
            promedio_anterior = ?,
            id_estabAnterior = ?,
            id_apoderado = ?,
            origen_indigena = ?,
            realizo_pie = ?,
            educ_fisica = ?,
            alergico = ?,
            especificar_alergia = ?,
            enfermedad_actual = ?,
            medicamentos_consumo = ?,
            certificado_nacimiento = ?,
            inform_personalidad = ?,
            inform_parcial_nota = ?,
            certificada_anual_estudio = ?,
            ficha_firmada = ?,
            persona_retiro = ?,
            obs = ?
          WHERE id_usuario = ?
        `;

        valoresAlumno = [
          fechaNacimiento || null,
          idAno || null,
          idPlan || null,
          promedioAnterior || null,
          idEstablecimiento || null,
          idApoderado || null,
          origenIndigena === 'true' || origenIndigena === true || origenIndigena === 1 ? 1 : 0,
          programaPIE === 'true' || programaPIE === true || programaPIE === 1 ? 1 : 0,
          realizaEducacionFisica === 'true' || realizaEducacionFisica === true || realizaEducacionFisica === 1 ? 1 : 0,
          alergicoMedicamento === 'true' || alergicoMedicamento === true || alergicoMedicamento === 1 ? 1 : 0,
          especificarAlergia || null,
          enfermedadActual || null,
          medicamentoConsumo || null,
          certificadoNacimiento === 'true' || certificadoNacimiento === true || certificadoNacimiento === 1 ? 1 : 0,
          informePersonalidad === 'true' || informePersonalidad === true || informePersonalidad === 1 ? 1 : 0,
          informeNotas === 'true' || informeNotas === true || informeNotas === 1 ? 1 : 0,
          certificadoEstudios === 'true' || certificadoEstudios === true || certificadoEstudios === 1 ? 1 : 0,
          fichaFirmada === 'true' || fichaFirmada === true || fichaFirmada === 1 ? 1 : 0,
          personaRetiro || null,
          observaciones || null,
          idUsuario
        ];

        db.query(queryAlumno, valoresAlumno, (err, resultAlumno) => {
          if (err) return handleDatabaseError(err, res, "Error al actualizar datos del alumno");

          // Comprobar si existe un registro en la tabla alumno_ano
          const queryCheckAlumnoAno = "SELECT id_usuario FROM alumno_ano WHERE id_usuario = ?";
          db.query(queryCheckAlumnoAno, [idUsuario], (err, checkResultAno) => {
            if (err) return handleDatabaseError(err, res, "Error al verificar existencia del alumno en curso");

            let queryAlumnoAno;
            let valoresAlumnoAno;

            if (checkResultAno.length === 0) {
              // Si no existe, crear un nuevo registro
              queryAlumnoAno = "INSERT INTO alumno_ano (id_usuario, id_curso, id_ano) VALUES (?, ?, ?)";
              valoresAlumnoAno = [idUsuario, idCurso || null, idAno || null];
            } else {
              // Si existe, actualizar el registro existente
              queryAlumnoAno = "UPDATE alumno_ano SET id_curso = ?, id_ano = ? WHERE id_usuario = ?";
              valoresAlumnoAno = [idCurso || null, idAno || null, idUsuario];
            }

            db.query(queryAlumnoAno, valoresAlumnoAno, (err, resultAlumnoAno) => {
              if (err) return handleDatabaseError(err, res, "Error al actualizar curso del alumno");

              res.json({
                success: true,
                message: "Datos del alumno actualizados correctamente",
                idUsuario: idUsuario
              });
            });
          });
        });
      }
    });
  });
});

// Rutas para familiares
app.post("/crear-familiar", upload.none(), (req, res) => {
  const {
    idUsuario,
    parentesco,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    fechaNacimiento,
    genero,
    telefono,
    empresa,
    cargo,
    direccionTrabajo,
    telefonoTrabajo,
    esApoderadoSuplente
  } = req.body;

  // Validar campos obligatorios
  if (!idUsuario || !parentesco || !nombres || !apellidoPaterno) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = `
    INSERT INTO alumno_familia (
      id_usuario, id_parentesco, nombre, ap_paterno, ap_materno, rut,
      fecha_nacimiento, sexo, telefono, em_nombre, em_cargo,
      em_direccion, em_telefono, apoderado_conf
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    idUsuario,
    parentesco,
    nombres.toUpperCase(),
    apellidoPaterno.toUpperCase(),
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut || null,
    fechaNacimiento || null,
    genero || null,
    telefono || null,
    empresa || null,
    cargo || null,
    direccionTrabajo || null,
    telefonoTrabajo || null,
    esApoderadoSuplente === 'true' || esApoderadoSuplente === true || esApoderadoSuplente === 1 ? 1 : 0
  ];

  db.query(query, valores, (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al registrar familiar");

    res.json({
      success: true,
      message: "Familiar registrado correctamente",
      idFamiliar: result.insertId,
      idUsuario: idUsuario
    });
  });
});

app.post("/actualizar-familiar/:id", upload.none(), (req, res) => {
  const idFamiliar = req.params.id;
  const {
    parentesco,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    fechaNacimiento,
    genero,
    telefono,
    empresa,
    cargo,
    direccionTrabajo,
    telefonoTrabajo,
    esApoderadoSuplente
  } = req.body;

  // Validar campos obligatorios
  if (!idFamiliar || !nombres || !apellidoPaterno) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = `
    UPDATE alumno_familia SET
      id_parentesco = ?,
      nombre = ?,
      ap_paterno = ?,
      ap_materno = ?,
      rut = ?,
      fecha_nacimiento = ?,
      sexo = ?,
      telefono = ?,
      em_nombre = ?,
      em_cargo = ?,
      em_direccion = ?,
      em_telefono = ?,
      apoderado_conf = ?
    WHERE id_alumno_familia = ?
  `;

  const valores = [
    parentesco || null,
    nombres.toUpperCase(),
    apellidoPaterno.toUpperCase(),
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut || null,
    fechaNacimiento || null,
    genero || null,
    telefono || null,
    empresa || null,
    cargo || null,
    direccionTrabajo || null,
    telefonoTrabajo || null,
    esApoderadoSuplente === 'true' || esApoderadoSuplente === true || esApoderadoSuplente === 1 ? 1 : 0,
    idFamiliar
  ];

  db.query(query, valores, (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar familiar");

    res.json({
      success: true,
      message: "Familiar actualizado correctamente",
      idFamiliar: idFamiliar
    });
  });
});

app.delete("/eliminar-familiar/:id", (req, res) => {
  const idFamiliar = req.params.id;
  const query = "DELETE FROM alumno_familia WHERE id_alumno_familia = ?";

  db.query(query, [idFamiliar], (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al eliminar familiar");

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Familiar no encontrado" });
    }

    res.json({
      success: true,
      message: "Familiar eliminado correctamente"
    });
  });
});

// Rutas para actualizar apoderado
app.post("/actualizar-apoderado/:id", upload.none(), (req, res) => {
  const idUsuario = req.params.id;
  const {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    genero,
    fechaNacimiento,
    direccion,
    numero,
    villa,
    departamento,
    idComuna,
    telefono,
    email,
    tipoApoderado,
    empresaTrabajo,
    cargoEmpresa,
    direccionTrabajo,
    telefonoTrabajo
  } = req.body;

  // Primero actualizar la tabla usuario
  const queryUsuario = `
    UPDATE usuario SET
      nombres = ?,
      a_paterno = ?,
      a_materno = ?,
      rut = ?,
      sexo = ?,
      fecha_nacimiento = ?,
      direccion = ?,
      direccion_nro = ?,
      direccion_villa = ?,
      direccion_depto = ?,
      id_comuna = ?,
      telefono = ?,
      e_mail = ?
    WHERE id_usuario = ?
  `;

  const valoresUsuario = [
    nombres ? nombres.toUpperCase() : null,
    apellidoPaterno ? apellidoPaterno.toUpperCase() : null,
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut || null,
    genero || null,
    fechaNacimiento || null,
    direccion || null,
    villa || null,
    numero || null,
    departamento || null,
    idComuna || null,
    telefono || null,
    email || null,
    idUsuario
  ];

  db.query(queryUsuario, valoresUsuario, (err, resultUsuario) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar datos del apoderado");

    // Luego actualizar la tabla apoderado
    const queryApoderado = `
      UPDATE apoderado SET
        tipo_apoderado = ?,
        nombre_empresa = ?,
        cargo = ?,
        direccion_empresa = ?,
        telefono_empresa = ?
      WHERE id_usuario = ?
    `;

    const valoresApoderado = [
      tipoApoderado || null,
      empresaTrabajo || null,
      cargoEmpresa || null,
      direccionTrabajo || null,
      telefonoTrabajo || null,
      idUsuario
    ];

    db.query(queryApoderado, valoresApoderado, (err, resultApoderado) => {
      if (err) return handleDatabaseError(err, res, "Error al actualizar datos laborales del apoderado");

      res.json({
        success: true,
        message: "Datos del apoderado actualizados correctamente",
        idUsuario: idUsuario
      });
    });
  });
});

// API endpoint para buscar alumnos
app.get("/api/buscar-alumnos", (req, res) => {
  const { rut, nombre, curso, ano } = req.query;

  let query = `
    SELECT 
      u.id_usuario AS idUsuario,
      u.rut,
      u.nombres,
      u.a_paterno AS apellidoPaterno,
      u.a_materno AS apellidoMaterno,
      c.nombre_curso AS curso,
      ae.nombre_ano AS ano,
      a.id_ano AS idAno,
      aa.id_curso AS idCurso
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    LEFT JOIN alumno_ano aa ON u.id_usuario = aa.id_usuario
    LEFT JOIN curso c ON aa.id_curso = c.id_curso
    LEFT JOIN ano_establecimiento ae ON a.id_ano = ae.id_ano
    WHERE 1=1
  `;

  const params = [];

  if (rut) {
    query += " AND u.rut LIKE ?";
    params.push(`%${rut}%`);
  }

  if (nombre) {
    query += " AND (u.nombres LIKE ? OR u.a_paterno LIKE ? OR u.a_materno LIKE ?)";
    params.push(`%${nombre}%`, `%${nombre}%`, `%${nombre}%`);
  }

  if (curso) {
    query += " AND aa.id_curso = ?";
    params.push(curso);
  }

  if (ano) {
    query += " AND a.id_ano = ?";
    params.push(ano);
  }

  query += " ORDER BY u.a_paterno, u.a_materno, u.nombres";

  db.query(query, params, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al buscar alumnos");
    res.json(results);
  });
});

// =========================================================
// Rutas para crear usuarios y apoderados
// =========================================================

app.post("/crear-usuario", upload.none(), (req, res) => {
  const {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    genero,
    idNacionalidad,
    direccion,
    villa,
    numero,
    departamento,
    idComuna,
    telefono,
    email
  } = req.body;

  // Validar campos obligatorios
  if (!nombres || !apellidoPaterno || !rut) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = `
    INSERT INTO usuario (
      nombres, a_paterno, a_materno, rut, sexo, nacionalidad,
      direccion, direccion_villa, direccion_nro, direccion_depto,
      id_comuna, telefono, e_mail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    nombres.toUpperCase(),
    apellidoPaterno.toUpperCase(),
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut,
    genero || null,
    idNacionalidad || null,
    direccion || null,
    villa || null,
    numero || null,
    departamento || null,
    idComuna || null,
    telefono || null,
    email || null
  ];

  db.query(query, valores, (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al crear usuario");

    res.json({
      success: true,
      message: "Usuario creado correctamente",
      idUsuario: result.insertId
    });
  });
});

app.post("/crear-apoderado", upload.none(), (req, res) => {
  const {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    genero,
    fechaNacimiento,
    direccion,
    villa,
    numero,
    departamento,
    idComuna,
    telefono,
    email,
    tipoApoderado,
    empresaTrabajo,
    cargoEmpresa,
    direccionTrabajo,
    telefonoTrabajo,
    idUsuarioAlumno
  } = req.body;

  // Validar campos obligatorios
  if (!nombres || !apellidoPaterno || !rut) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  // Primero crear el usuario (SIN tipo_usuario)
  const queryUsuario = `
    INSERT INTO usuario (
      nombres, a_paterno, a_materno, rut, sexo, fecha_nacimiento,
      direccion, direccion_villa, direccion_nro, direccion_depto,
      id_comuna, telefono, e_mail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valoresUsuario = [
    nombres.toUpperCase(),
    apellidoPaterno.toUpperCase(),
    apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
    rut,
    genero || null,
    fechaNacimiento || null,
    direccion || null,
    villa || null,
    numero || null,
    departamento || null,
    idComuna || null,
    telefono || null,
    email || null
    // Ya no incluimos 'APODERADO' aquí
  ];

  db.query(queryUsuario, valoresUsuario, (err, resultUsuario) => {
    if (err) return handleDatabaseError(err, res, "Error al crear usuario apoderado");

    const idUsuario = resultUsuario.insertId;

    // Luego crear el apoderado
    const queryApoderado = `
      INSERT INTO apoderado (
        id_usuario, tipo_apoderado, nombre_empresa, cargo,
        direccion_empresa, telefono_empresa
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const valoresApoderado = [
      idUsuario,
      tipoApoderado || null,
      empresaTrabajo || null,
      cargoEmpresa || null,
      direccionTrabajo || null,
      telefonoTrabajo || null
    ];

    db.query(queryApoderado, valoresApoderado, (err, resultApoderado) => {
      if (err) return handleDatabaseError(err, res, "Error al crear apoderado");

      const idApoderado = resultApoderado.insertId;

      // Al final:
      if (idUsuarioAlumno) {
        // Solo actualizar la referencia si se proporciona un ID de alumno
        const queryActualizarAlumno = "UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?";
        
        db.query(queryActualizarAlumno, [idApoderado, idUsuarioAlumno], (err) => {
          if (err) return handleDatabaseError(err, res, "Error al actualizar referencia del apoderado");
          
          res.json({
            success: true,
            message: "Apoderado creado y vinculado correctamente",
            idApoderado: idApoderado,
            idUsuario: idUsuario
          });
        });
      } else {
        // Si no hay ID de alumno, simplemente devolvemos el apoderado creado
        res.json({
          success: true,
          message: "Apoderado creado correctamente (sin vincular)",
          idApoderado: idApoderado,
          idUsuario: idUsuario
        });
      }
    });
  });
});

// Endpoint para actualizar datos de RUT
app.post("/actualizar-rut", upload.none(), (req, res) => {
  const { idUsuario, rut } = req.body;

  if (!idUsuario || !rut) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  const query = "UPDATE usuario SET rut = ? WHERE id_usuario = ?";

  db.query(query, [rut, idUsuario], (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar RUT");

    res.json({
      success: true,
      message: "RUT actualizado correctamente"
    });
  });
});

// Endpoint para guardar apoderado (crear o actualizar)
app.post("/guardar-apoderado", upload.none(), (req, res) => {
  const {
    idApoderado,
    idUsuarioAlumno,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    genero,
    fechaNacimiento,
    direccion,
    numero,
    villa,
    departamento,
    idComuna,
    telefono,
    email,
    tipoApoderado,
    empresaTrabajo,
    cargoEmpresa,
    direccionTrabajo,
    telefonoTrabajo
  } = req.body;

  // Validar campos obligatorios
  if (!nombres || !apellidoPaterno || !rut || !idUsuarioAlumno) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  // Primero, verificar si el RUT ya existe en la base de datos
  const queryVerificarRut = "SELECT id_usuario AS idUsuario FROM usuario WHERE rut = ? AND tipo_usuario = 'APODERADO'";

  db.query(queryVerificarRut, [rut], (err, rutResults) => {
    if (err) return handleDatabaseError(err, res, "Error al verificar RUT");

    let idUsuarioApoderado;

    // Si el RUT ya existe, usamos ese id_usuario
    if (rutResults.length > 0) {
      idUsuarioApoderado = rutResults[0].idUsuario;

      // Actualizamos los datos del usuario
      const queryActualizarUsuario = `
        UPDATE usuario SET
          nombres = ?,
          a_paterno = ?,
          a_materno = ?,
          sexo = ?,
          fecha_nacimiento = ?,
          direccion = ?,
          direccion_villa = ?,
          direccion_nro = ?,
          direccion_depto = ?,
          id_comuna = ?,
          telefono = ?,
          e_mail = ?
        WHERE id_usuario = ?
      `;

      const valoresActualizarUsuario = [
        nombres.toUpperCase(),
        apellidoPaterno.toUpperCase(),
        apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
        genero || null,
        fechaNacimiento || null,
        direccion || null,
        villa || null,
        numero || null,
        departamento || null,
        idComuna || null,
        telefono || null,
        email || null,
        idUsuarioApoderado
      ];

      db.query(queryActualizarUsuario, valoresActualizarUsuario, (err) => {
        if (err) return handleDatabaseError(err, res, "Error al actualizar datos del apoderado");

        // Verificar si existe un registro en tabla apoderado
        const queryVerificarApoderado = "SELECT id_apoderado FROM apoderado WHERE id_usuario = ?";

        db.query(queryVerificarApoderado, [idUsuarioApoderado], (err, apoderadoResults) => {
          if (err) return handleDatabaseError(err, res, "Error al verificar apoderado");

          if (apoderadoResults.length > 0) {
            // Si existe, actualizamos
            const queryActualizarApoderado = `
              UPDATE apoderado SET
                tipo_apoderado = ?,
                nombre_empresa = ?,
                cargo = ?,
                direccion_empresa = ?,
                telefono_empresa = ?
              WHERE id_usuario = ?
            `;

            const valoresActualizarApoderado = [
              tipoApoderado || null,
              empresaTrabajo || null,
              cargoEmpresa || null,
              direccionTrabajo || null,
              telefonoTrabajo || null,
              idUsuarioApoderado
            ];

            db.query(queryActualizarApoderado, valoresActualizarApoderado, (err) => {
              if (err) return handleDatabaseError(err, res, "Error al actualizar datos laborales del apoderado");

              const idApoderado = apoderadoResults[0].id_apoderado;

              // Actualizar la referencia en la tabla alumno
              const queryActualizarAlumno = "UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?";

              db.query(queryActualizarAlumno, [idApoderado, idUsuarioAlumno], (err) => {
                if (err) return handleDatabaseError(err, res, "Error al actualizar referencia del apoderado");

                res.json({
                  success: true,
                  message: "Apoderado creado correctamente",
                  idApoderado: idApoderado
                });
              });
            });
          } else {
            // Si no existe, lo creamos
            const queryInsertarApoderado = `
              INSERT INTO apoderado (
                id_usuario, tipo_apoderado, nombre_empresa, cargo,
                direccion_empresa, telefono_empresa
              ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            const valoresInsertarApoderado = [
              idUsuarioApoderado,
              tipoApoderado || null,
              empresaTrabajo || null,
              cargoEmpresa || null,
              direccionTrabajo || null,
              telefonoTrabajo || null
            ];

            db.query(queryInsertarApoderado, valoresInsertarApoderado, (err, resultApoderado) => {
              if (err) return handleDatabaseError(err, res, "Error al crear apoderado");

              const idApoderado = resultApoderado.insertId;

              // Actualizar la referencia en la tabla alumno
              const queryActualizarAlumno = "UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?";

              db.query(queryActualizarAlumno, [idApoderado, idUsuarioAlumno], (err) => {
                if (err) return handleDatabaseError(err, res, "Error al actualizar referencia del apoderado");

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
    } else {
      // Si el RUT no existe, creamos un nuevo usuario
      const queryInsertarUsuario = `
        INSERT INTO usuario (
          nombres, a_paterno, a_materno, rut, sexo, fecha_nacimiento,
          direccion, direccion_villa, direccion_nro, direccion_depto,
          id_comuna, telefono, e_mail
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const valoresInsertarUsuario = [
        nombres.toUpperCase(),
        apellidoPaterno.toUpperCase(),
        apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
        rut,
        genero || null,
        fechaNacimiento || null,
        direccion || null,
        villa || null,
        numero || null,
        departamento || null,
        idComuna || null,
        telefono || null,
        email || null
      ];

      db.query(queryInsertarUsuario, valoresInsertarUsuario, (err, resultUsuario) => {
        if (err) return handleDatabaseError(err, res, "Error al crear usuario apoderado");

        idUsuarioApoderado = resultUsuario.insertId;

        // Luego crear el apoderado
        const queryInsertarApoderado = `
          INSERT INTO apoderado (
            id_usuario, tipo_apoderado, nombre_empresa, cargo,
            direccion_empresa, telefono_empresa
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const valoresInsertarApoderado = [
          idUsuarioApoderado,
          tipoApoderado || null,
          empresaTrabajo || null,
          cargoEmpresa || null,
          direccionTrabajo || null,
          telefonoTrabajo || null
        ];

        db.query(queryInsertarApoderado, valoresInsertarApoderado, (err, resultApoderado) => {
          if (err) return handleDatabaseError(err, res, "Error al crear apoderado");

          const idApoderado = resultApoderado.insertId;

          // Actualizar la referencia en la tabla alumno
          const queryActualizarAlumno = "UPDATE alumno SET id_apoderado = ? WHERE id_usuario = ?";

          db.query(queryActualizarAlumno, [idApoderado, idUsuarioAlumno], (err) => {
            if (err) return handleDatabaseError(err, res, "Error al actualizar referencia del apoderado");

            res.json({
              success: true,
              message: "Apoderado creado correctamente",
              idApoderado: idApoderado
            });
          });
        });
      });
    }
  });
});

// Endpoint para guardar familiar adicional
app.post("/guardar-familiar", upload.none(), (req, res) => {
  const {
    idUsuario,
    parentesco,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut,
    fechaNacimiento,
    genero,
    telefono,
    empresa,
    cargo,
    direccionTrabajo,
    telefonoTrabajo,
    esApoderadoSuplente
  } = req.body;

  // Validar campos obligatorios
  if (!idUsuario || !nombres || !apellidoPaterno || !parentesco) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  // Verificar si ya existe un familiar con ese parentesco para este usuario
  const queryVerificar = "SELECT id_alumno_familia FROM alumno_familia WHERE id_usuario = ? AND id_parentesco = ?";

  db.query(queryVerificar, [idUsuario, parentesco], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al verificar familiar");

    let query;
    let valores;

    if (results.length > 0) {
      // Si existe, actualizamos
      const idFamiliar = results[0].id_alumno_familia;

      query = `
        UPDATE alumno_familia SET
          nombre = ?,
          ap_paterno = ?,
          ap_materno = ?,
          rut = ?,
          fecha_nacimiento = ?,
          sexo = ?,
          telefono = ?,
          em_nombre = ?,
          em_cargo = ?,
          em_direccion = ?,
          em_telefono = ?,
          apoderado_conf = ?
        WHERE id_alumno_familia = ?
      `;

      valores = [
        nombres.toUpperCase(),
        apellidoPaterno.toUpperCase(),
        apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
        rut || null,
        fechaNacimiento || null,
        genero || null,
        telefono || null,
        empresa || null,
        cargo || null,
        direccionTrabajo || null,
        telefonoTrabajo || null,
        esApoderadoSuplente === 'true' || esApoderadoSuplente === true || esApoderadoSuplente === 1 ? 1 : 0,
        idFamiliar
      ];

      db.query(query, valores, (err) => {
        if (err) return handleDatabaseError(err, res, "Error al actualizar familiar");

        res.json({
          success: true,
          message: "Familiar actualizado correctamente",
          idFamiliar: idFamiliar
        });
      });
    } else {
      // Si no existe, lo creamos
      query = `
        INSERT INTO alumno_familia (
          id_usuario, id_parentesco, nombre, ap_paterno, ap_materno, rut,
          fecha_nacimiento, sexo, telefono, em_nombre, em_cargo,
          em_direccion, em_telefono, apoderado_conf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      valores = [
        idUsuario,
        parentesco,
        nombres.toUpperCase(),
        apellidoPaterno.toUpperCase(),
        apellidoMaterno ? apellidoMaterno.toUpperCase() : '',
        rut || null,
        fechaNacimiento || null,
        genero || null,
        telefono || null,
        empresa || null,
        cargo || null,
        direccionTrabajo || null,
        telefonoTrabajo || null,
        esApoderadoSuplente === 'true' || esApoderadoSuplente === true || esApoderadoSuplente === 1 ? 1 : 0
      ];

      db.query(query, valores, (err, result) => {
        if (err) return handleDatabaseError(err, res, "Error al crear familiar");

        res.json({
          success: true,
          message: "Familiar creado correctamente",
          idFamiliar: result.insertId
        });
      });
    }
  });
});

// =========================================================
// Exportación de datos
// =========================================================

const excel = require('exceljs');

app.get('/exportar-excel', (req, res) => {
  const { ano, curso } = req.query;

  let query = `
    SELECT 
      u.rut AS 'RUT',
      u.nombres AS 'Nombres', 
      u.a_paterno AS 'Apellido Paterno', 
      u.a_materno AS 'Apellido Materno',
      u.direccion AS 'Dirección',
      u.direccion_villa AS 'Villa',
      u.direccion_nro AS 'Número',
      u.direccion_depto AS 'Depto',
      c.comuna AS 'Comuna',
      u.telefono AS 'Teléfono',
      u.e_mail AS 'Email',
      a.fecha_nacimiento AS 'Fecha Nacimiento',
      IFNULL(p.nacionalidad, 'Chilena') AS 'Nacionalidad',
      a.origen_indigena AS 'Origen Indígena',
      a.realizo_pie AS 'Programa PIE',
      a.educ_fisica AS 'Ed. Física',
      a.alergico AS 'Alérgico',
      a.especificar_alergia AS 'Especificar Alergia',
      a.enfermedad_actual AS 'Enfermedad',
      a.medicamentos_consumo AS 'Medicamentos',
      a.promedio_anterior AS 'Promedio Anterior',
      e.nombre AS 'Establecimiento Anterior',
      a.persona_retiro AS 'Persona Retiro',
      cu.nombre_curso AS 'Curso',
      ae.nombre_ano AS 'Año'
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    LEFT JOIN alumno_ano aa ON u.id_usuario = aa.id_usuario
    LEFT JOIN curso cu ON aa.id_curso = cu.id_curso
    LEFT JOIN comuna c ON u.id_comuna = c.id_comuna
    LEFT JOIN pais p ON u.nacionalidad = p.id_pais
    LEFT JOIN establecimiento_alumno_anterior e ON a.id_estabAnterior = e.id_establecimiento
    LEFT JOIN ano_establecimiento ae ON a.id_ano = ae.id_ano
    WHERE 1=1
  `;

  const params = [];

  if (ano) {
    query += " AND a.id_ano = ?";
    params.push(ano);
  }

  if (curso) {
    query += " AND aa.id_curso = ?";
    params.push(curso);
  }

  query += " ORDER BY u.a_paterno, u.a_materno, u.nombres";

  db.query(query, params, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener datos para exportación");

    // Crear un nuevo libro de Excel
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Alumnos');

    // Definir encabezados
    if (results.length > 0) {
      const headers = Object.keys(results[0]);
      worksheet.addRow(headers);

      // Agregar datos
      results.forEach(row => {
        const values = Object.values(row);
        worksheet.addRow(values);
      });
    }

    // Configurar la respuesta HTTP
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=alumnos.xlsx');

    // Enviar el archivo
    workbook.xlsx.write(res)
      .then(() => {
        res.end();
      })
      .catch(err => {
        console.error('Error al generar Excel:', err);
        res.status(500).send('Error al generar el archivo Excel');
      });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
