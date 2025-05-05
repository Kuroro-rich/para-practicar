require('dotenv').config();


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
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME,
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

// Función para convertir valores a booleanos para la base de datos
function toBooleanDB(value) {
  return value === 'true' || value === true || value === 1 ? 1 : 0;
}

// Función para manejar transacciones de la base de datos
function handleTransaction(queries, res, successMessage, finalCallback = null) {
  db.beginTransaction(err => {
    if (err) return handleDatabaseError(err, res, "Error al iniciar transacción");
    
    executeQueries(queries, 0, (error) => {
      if (error) {
        return db.rollback(() => {
          handleDatabaseError(error, res, "Error durante la transacción");
        });
      }
      
      db.commit(err => {
        if (err) {
          return db.rollback(() => {
            handleDatabaseError(err, res, "Error al confirmar transacción");
          });
        }
        
        if (finalCallback) {
          finalCallback();
        } else {
          res.json({ success: true, message: successMessage });
        }
      });
    });
  });

  // Función auxiliar para ejecutar consultas secuencialmente
  function executeQueries(queries, index, callback) {
    if (index >= queries.length) {
      return callback(null);
    }
    
    const query = queries[index];
    
    db.query(query.sql, query.params, (err, results) => {
      if (err) return callback(err);
      
      // Si hay un callback para esta consulta, ejecutarlo
      if (query.callback) {
        query.callback(results);
      }
      
      // Procesar la siguiente consulta
      executeQueries(queries, index + 1, callback);
    });
  }
}

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
  const query = "SELECT id_plan, nombre_plan FROM plan_estudios ORDER BY nombre_plan";
  db.query(query, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener planes de estudio");
    res.json(results);
  });
});

app.get("/obtener-cursos", (req, res) => {
  const anio = req.query.anio;
  let query;

  if(!anio){
    return res.status(200).json([]);
  }

  /*
  // en caso de que no haya un año, se devuelven todos los cursos y se retorna para terminar la ejecución
  if(!anio){
    //   query = `
    //   SELECT id_curso, nombre_curso 
    //   FROM curso
    //   ORDER BY nombre_curso ASC
    // `;
    query = `
      SELECT 
        cu.id_curso,
        cu.nombre_curso,
        ae.nombre_ano 
      FROM 
        curso cu
      INNER JOIN
        ano_establecimiento ae
      ON
        cu.id_ano = ae.id_ano
      ORDER BY nombre_curso ASC
    `
    
    db.query(query, (err, resultadosCursos) => {
      if (err) return handleDatabaseError(err, res, "Error al obtener todos los cursos");
      console.log("resultadosCursos", resultadosCursos);
      res.json(resultadosCursos);
    });
    return;
  }
  */
  
  query = `
    SELECT 
          cu.id_curso,
          cu.nombre_curso 
        from 
          ano_establecimiento an
        inner join 
          curso cu
          on 
          an.id_ano = cu.id_ano
        where an.nombre_ano = ?;
  `
  db.query(query, [anio], (err, resultadosAno) => {
    if (err) return handleDatabaseError(err, res, "Error al buscar el año académico");
    console.log("resultadosCursos2", resultadosAno);
    res.json(resultadosAno);
  });
  return;


});

app.get("/obtener-anos", (req, res) => {
  const query = "SELECT id_ano, nombre_ano FROM ano_establecimiento ORDER BY nombre_ano DESC";
  console.log(query);
  db.query(query, (err, results) => { console.log (results);
    if (err) return handleDatabaseError(err, res, "Error al obtener años académicos");
    const formattedResults = results.map(row => {
      return {
        id_ano: row.id_ano,
        nombre_ano: `${row.nombre_ano}`
      };
    });
    //console.log(res.json(formattedResults));
    return res.json(formattedResults);
  });
});

app.get("/obtener-nombre-ano", (req, res) => {
  const idAno = req.query.id;
  if (!idAno) {
    return res.status(400).json({ error: "Falta el ID del año" });
  }
  
  const query = "SELECT nombre_ano FROM ano_establecimiento WHERE id_ano = ?";
  
  db.query(query, [idAno], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener nombre del año");
    
    if (results.length === 0) {
      return res.json({ nombre_ano: null });
    }
    
    res.json({ nombre_ano: results[0].nombre_ano });
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
      u.fecha_nacimiento AS fechaNacimiento, 
      a.id_ano AS idAno, 
      a.id_plan AS idPlan, 
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
      a.id_estabAnterior AS idEstablecimiento,
      a.id_apoderado AS idApoderado, 
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
      u.fecha_nacimiento AS fechaNacimiento, 
      a.id_ano AS idAno, 
      a.id_plan AS idPlan, 
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
      a.id_estabAnterior AS idEstablecimiento,
      a.id_apoderado AS idApoderado, 
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

    // CORREGIDO: Ahora usa los nombres de columnas correctos
    const queryApoderado = `
      SELECT 
        a.id_apoderado AS idApoderado,
        u.rut AS rut,
        u.nombres AS nombres,
        u.a_paterno AS apellidoPaterno,
        u.a_materno AS apellidoMaterno,
        u.telefono AS telefono,
        u.e_mail AS email,
        a.empresa AS empresa,
        a.cargo AS cargo,
        a.direccion_trabajo AS direccionTrabajo,
        a.telefono_trabajo AS telefonoTrabajo,
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
  console.log("Año:", ano);
  console.log("Nombre:", nombre);
  console.log("Curso:", curso);
  let query = `
    SELECT
      c.id_curso,
      c.id_ano,
      ae.nombre_ano,
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
    LEFT JOIN ano_establecimiento ae on c.id_ano = ae.id_ano
    WHERE 1=1
  `;

  const params = [];

  if (ano) {
    query += "AND ae.nombre_ano = ?";
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
  console.log("Consulta SQL:", query);

  db.query(query, params, (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener listado de alumnos");
    res.json(results);
  });
});

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
    enfermedadActual,
    medicamentoConsumo,
    certificadoNacimiento,
    informePersonalidad,
    informeNotas,
    certificadoEstudios,
    fichaFirmada,
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
      educ_fisica, alergico, enfermedad_actual, 
      medicamentos_consumo, certificado_nacimiento, inform_personalidad, 
      inform_parcial_nota, certificada_anual_estudio, ficha_firmada, 
       obs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valoresAlumno = [
    idUsuario,
    fechaNacimiento || null,
    idAno,
    idPlan || null,
    promedioAnterior || null,
    idEstablecimiento || null,
    idApoderado || null,
    toBooleanDB(origenIndigena),
    toBooleanDB(programaPIE),
    toBooleanDB(realizaEducacionFisica),
    toBooleanDB(alergicoMedicamento),
    enfermedadActual || null,
    medicamentoConsumo || null,
    toBooleanDB(certificadoNacimiento),
    toBooleanDB(informePersonalidad),
    toBooleanDB(informeNotas),
    toBooleanDB(certificadoEstudios),
    toBooleanDB(fichaFirmada),
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
    enfermedadActual,
    medicamentoConsumo,
    certificadoNacimiento,
    informePersonalidad,
    informeNotas,
    certificadoEstudios,
    fichaFirmada,
    observaciones,
    idCurso
  } = req.body;

  // Validar campos obligatorios
  if (!idUsuario || !idAno || !idCurso) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  // Usar transacciones para actualizar tanto alumno como alumno_ano
  const queries = [
    // Actualiza la tabla usuario (fecha de nacimiento)
    {
      sql: `
        UPDATE usuario SET
          fecha_nacimiento = ?
        WHERE id_usuario = ?
      `,
      params: [
        fechaNacimiento || null,
        idUsuario
      ]
    },
    // Actualiza la tabla alumno
    {
      sql: `
        UPDATE alumno SET
          id_ano = ?,
          id_plan = ?,
          promedio_anterior = ?,
          id_estabAnterior = ?,
          id_apoderado = ?,
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
      `,
      params: [
        idAno,
        idPlan || null,
        promedioAnterior || null,
        idEstablecimiento || null,
        idApoderado || null,
        toBooleanDB(origenIndigena),
        toBooleanDB(programaPIE),
        toBooleanDB(realizaEducacionFisica),
        toBooleanDB(alergicoMedicamento),
        enfermedadActual || null,
        medicamentoConsumo || null,
        toBooleanDB(certificadoNacimiento),
        toBooleanDB(informePersonalidad),
        toBooleanDB(informeNotas),
        toBooleanDB(certificadoEstudios),
        toBooleanDB(fichaFirmada),
        observaciones || null,
        idUsuario
      ]
    },
    {
      sql: `
        UPDATE alumno_ano SET 
          id_curso = ?,
          id_ano = ?
        WHERE id_usuario = ?
      `,
      params: [idCurso, idAno, idUsuario]
    }
  ];

  // Si no existe registro en alumno_ano, insertar en lugar de actualizar
  db.query("SELECT id_usuario FROM alumno_ano WHERE id_usuario = ?", [idUsuario], (err, results) => {
    if (err) return handleDatabaseError(err, res, "Error al verificar alumno_ano");

    if (results.length === 0) {
      // Si no existe, reemplazar la segunda consulta por un INSERT
      queries[2] = {
        sql: `
          INSERT INTO alumno_ano (id_usuario, id_curso, id_ano) 
          VALUES (?, ?, ?)
        `,
        params: [idUsuario, idCurso, idAno]
      };
    }

    // Ejecutar las consultas dentro de una transacción
    handleTransaction(queries, res, "Alumno actualizado correctamente", () => {
      res.json({
        success: true,
        message: "Alumno actualizado correctamente",
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
    rut,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    telefono,
    email,
    calle,
    villa,
    numeroCasa,
    departamento,
    comuna,
    genero,
    nacionalidad
  } = req.body;

  // Incluir id_perfil_base en la consulta
  const query = `
    INSERT INTO usuario (
      rut, nombres, a_paterno, a_materno, telefono, e_mail, direccion, direccion_villa, 
      direccion_nro, direccion_depto, id_comuna, sexo, nacionalidad, id_perfil_base
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Necesitas asegurarte que los valores se obtienen correctamente
  const valores = [
    rut,
    nombres,
    apellidoPaterno, // frontend usa apellidoPaterno
    apellidoMaterno, // frontend usa apellidoMaterno
    telefono,
    email, // frontend usa email
    calle, // frontend usa calle en lugar de direccion
    villa, // cuidado con estos nombres
    numeroCasa, // en lugar de direccion_nro
    departamento, // en lugar de direccion_depto
    comuna, // idComuna en el frontend
    genero, // sexo en base de datos
    nacionalidad, // idNacionalidad en el frontend
    3
  ];

  db.query(query, valores, (err, result) => {
    if (err) return handleDatabaseError(err, res, "Error al crear usuario");

    res.json({
      success: true,
      mensaje: "Usuario creado correctamente",
      idUsuario: result.insertId
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
  const queryVerificarRut = "SELECT id_usuario AS idUsuario FROM usuario WHERE rut = ? AND id_perfil_base = 3";

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
        const queryVerificarApoderado = `
          SELECT id_apoderado FROM apoderado WHERE id_usuario = ?
        `;

        db.query(queryVerificarApoderado, [idUsuarioApoderado], (err, apoderadoResults) => {
          if (err) return handleDatabaseError(err, res, "Error al verificar apoderado");

          if (apoderadoResults.length > 0) {
            // Si existe, actualizamos
            const queryActualizarApoderado = `
              UPDATE apoderado SET
                empresa = ?,
                cargo = ?,
                direccion_trabajo = ?,
                telefono_trabajo = ?
              WHERE id_usuario = ?
            `;

            const valoresActualizarApoderado = [
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
                  message: "Apoderado actualizado correctamente",
                  idApoderado: idApoderado
                });
              });
            });
          } else {
            // Si no existe, lo creamos
            // 1. Obtener el próximo id_apoderado disponible
            db.query('SELECT IFNULL(MAX(id_apoderado), 0) + 1 AS nuevoId FROM apoderado', function(err, result) {
                if (err) {
                    return db.rollback(function() {
                        console.error('Error al obtener nuevo id_apoderado:', err);
                        res.status(500).json({ success: false, message: 'Error al obtener nuevo id_apoderado' });
                    });
                }
                const nuevoId = result[0].nuevoId;

                // 2. Ahora sí, haz el INSERT incluyendo id_apoderado
                const queryApoderado = `
                    INSERT INTO apoderado (
                        id_apoderado, id_usuario, empresa, cargo, direccion_trabajo, telefono_trabajo
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                const valoresApoderado = [
                    nuevoId,
                    idUsuarioApoderado,
                    apoderado.empresaApoderado || '',
                    apoderado.cargoApoderado || '',
                    apoderado.direccionTrabajoApoderado || '',
                    apoderado.telefonoTrabajoApoderado || ''
                ];

                db.query(queryApoderado, valoresApoderado, function(err, resultApoderado) {
                    if (err) {
                        return db.rollback(function() {
                            console.error('Error al crear apoderado:', err);
                            res.status(500).json({ success: false, message: 'Error al crear apoderado' });
                        });
                    }
                    const idApoderado = nuevoId;

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
    } else {
      // Si el RUT no existe, creamos un nuevo usuario
      const queryInsertarUsuario = `
        INSERT INTO usuario (
          rut, nombres, a_paterno, a_materno, sexo, 
          fecha_nacimiento, direccion, direccion_villa, direccion_nro, direccion_depto,
          id_comuna, telefono, e_mail, id_perfil_base, nacionalidad
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, ?)
      `;

      const valoresInsertarUsuario = [
        rut,
        nombres,
        apellidoPaterno, // frontend usa apellidoPaterno
        apellidoMaterno, // frontend usa apellidoMaterno
        telefono,
        email, // frontend usa email
        calle, // frontend usa calle en lugar de direccion
        villa, // cuidado con estos nombres
        numeroCasa, // en lugar de direccion_nro
        departamento, // en lugar de direccion_depto
        comuna, // idComuna en el frontend
        genero, // sexo en base de datos
        nacionalidad, // idNacionalidad en el frontend
        3
      ];

      db.query(queryInsertarUsuario, valoresInsertarUsuario, (err, resultUsuario) => {
        if (err) return handleDatabaseError(err, res, "Error al crear usuario apoderado");

        idUsuarioApoderado = resultUsuario.insertId;

        // Luego crear el apoderado
        const queryInsertarApoderado = `
          INSERT INTO apoderado (
            id_usuario, empresa, cargo,
            direccion_trabajo, telefono_trabajo
          ) VALUES (?, ?, ?, ?, ?)
        `;

        const valoresInsertarApoderado = [
          idUsuarioApoderado,
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
      u.fecha_nacimiento AS 'Fecha Nacimiento',
      IFNULL(p.nacionalidad, 'Chilena') AS 'Nacionalidad',
      a.origen_indigena AS 'Origen Indígena',
      a.realizo_pie AS 'Programa PIE',
      a.educ_fisica AS 'Ed. Física',
      a.alergico AS 'Alérgico',
      a.enfermedad_actual AS 'Enfermedad',
      a.medicamentos_consumo AS 'Medicamentos',
      a.promedio_anterior AS 'Promedio Anterior',
      e.nombre AS 'Establecimiento Anterior',
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
        handleDatabaseError(err, res, 'Error al generar archivo Excel');
      });
  });
});

// Endpoint para guardar registro completo
app.post('/guardar-registro-completo', async (req, res) => {
    try {
        const { alumno, familiares, apoderado } = req.body;

        if (!alumno || !apoderado) {
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos. Se requieren datos del alumno y apoderado.'
            });
        }

        db.beginTransaction(async function(err) {
            if (err) {
                console.error('Error al iniciar transacción:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error al iniciar la transacción en la base de datos'
                });
            }

            try {
                // 1. Crear usuario del apoderado
                const queryUsuarioApoderado = `
                    INSERT INTO usuario (
                        rut, nombres, a_paterno, a_materno, sexo, 
                        fecha_nacimiento, direccion, direccion_villa, direccion_nro, direccion_depto,
                        id_comuna, telefono, e_mail, id_perfil_base
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3)
                `;
                const valoresUsuarioApoderado = [
                    apoderado.rutApoderado || 'SIN RUT',
                    apoderado.nombresApoderado.toUpperCase(),
                    apoderado.apellidoPaternoApoderado.toUpperCase(),
                    (apoderado.apellidoMaternoApoderado || '').toUpperCase(),
                    apoderado.generoApoderado || '1',
                    apoderado.fechaNacimientoApoderado || null,
                    apoderado.direccionApoderado || '',
                    apoderado.villaApoderado || '',
                    apoderado.numeroApoderado || '',
                    apoderado.departamentoApoderado || '',
                    apoderado.idComunaApoderado || null,
                    apoderado.telefonoApoderado || '',
                    apoderado.emailApoderado || '',
                ];

                db.query(queryUsuarioApoderado, valoresUsuarioApoderado, function(err, resultUsuarioApoderado) {
                    if (err) {
                        return db.rollback(function() {
                            console.error('Error al crear usuario del apoderado:', err);
                            res.status(500).json({ success: false, message: 'Error al crear usuario del apoderado' });
                        });
                    }
                    const idUsuarioApoderado = resultUsuarioApoderado.insertId;

                    // 2. Crear apoderado
                    db.query('SELECT IFNULL(MAX(id_apoderado), 0) + 1 AS nuevoId FROM apoderado', function(err, result) {
                        if (err) {
                            return db.rollback(function() {
                                console.error('Error al obtener nuevo id_apoderado:', err);
                                res.status(500).json({ success: false, message: 'Error al obtener nuevo id_apoderado' });
                            });
                        }
                        const nuevoId = result[0].nuevoId;

                        const queryApoderado = `
                            INSERT INTO apoderado (
                                id_apoderado, id_usuario, empresa, cargo, direccion_trabajo, telefono_trabajo
                            ) VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        const valoresApoderado = [
                            nuevoId,
                            idUsuarioApoderado,
                            apoderado.empresaApoderado || '',
                            apoderado.cargoApoderado || '',
                            apoderado.direccionTrabajoApoderado || '',
                            apoderado.telefonoTrabajoApoderado || ''
                        ];

                        db.query(queryApoderado, valoresApoderado, function(err, resultApoderado) {
                            if (err) {
                                return db.rollback(function() {
                                    console.error('Error al crear apoderado:', err);
                                    res.status(500).json({ success: false, message: 'Error al crear apoderado' });
                                });
                            }
                            const idApoderado = nuevoId;

                            // 3. Crear usuario del alumno
                            const queryUsuarioAlumno = `
                                INSERT INTO usuario (
                                    rut, nombres, a_paterno, a_materno, sexo, 
                                    fecha_nacimiento, direccion, direccion_villa, direccion_nro, direccion_depto,
                                    id_comuna, telefono, e_mail, id_perfil_base
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2)
                            `;
                            const valoresUsuarioAlumno = [
                                alumno.rut || 'SIN RUT',
                                alumno.nombres.toUpperCase(),
                                alumno.apellidoPaterno.toUpperCase(),
                                (alumno.apellidoMaterno || '').toUpperCase(),
                                alumno.genero || '1',
                                alumno.fechaNacimiento || null,
                                alumno.direccion || '',
                                alumno.villa || '',
                                alumno.numero || '',
                                alumno.departamento || '',
                                alumno.idComuna || null,
                                alumno.telefono || '',
                                alumno.email || '',
                            ];

                            db.query(queryUsuarioAlumno, valoresUsuarioAlumno, function(err, resultUsuarioAlumno) {
                                if (err) {
                                    return db.rollback(function() {
                                        console.error('Error al crear usuario del alumno:', err);
                                        res.status(500).json({ success: false, message: 'Error al crear usuario del alumno' });
                                    });
                                }
                                const idUsuarioAlumno = resultUsuarioAlumno.insertId;

                                // 4. Crear alumno
                                const queryAlumno = `
                                    INSERT INTO alumno (
                                        id_usuario, id_apoderado, id_ano, id_plan, promedio_anterior, 
                                        id_estabAnterior, origen_indigena, realizo_pie, educ_fisica, alergico, 
                                        enfermedad_actual, medicamentos_consumo, certificado_nacimiento, 
                                        inform_personalidad, inform_parcial_nota, certificada_anual_estudio, 
                                        ficha_firmada, obs, id_usuario_inscribio
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `;

                                const valoresAlumno = [
                                    idUsuarioAlumno,
                                    idApoderado,
                                    alumno.idAno || null,
                                    alumno.idPlan || null,
                                    alumno.promedioAnterior !== undefined && alumno.promedioAnterior !== '' ? alumno.promedioAnterior : null,
                                    alumno.idEstablecimientoAnterior || null,
                                    alumno.origenIndigena === 'Si' ? 1 : 0,
                                    alumno.programaPIE === 'Si' ? 1 : 0,
                                    alumno.realizaEducacionFisica === 'Si' ? 1 : 0,
                                    alumno.alergicoMedicamento === 'Si' ? 1 : 0,
                                    alumno.enfermedadActual || '',
                                    alumno.medicamentoConsumo || '',
                                    alumno.certificadoNacimiento === 'Si' ? 1 : 0,
                                    alumno.informePersonalidad === 'Si' ? 1 : 0,
                                    alumno.informeNotas === 'Si' ? 1 : 0,
                                    alumno.certificadoEstudios === 'Si' ? 1 : 0,
                                    alumno.fichaFirmada === 'Si' ? 1 : 0,
                                    alumno.observaciones || '',
                                    idUsuarioApoderado // <-- este es el usuario que inscribe (apoderado)
                                ];

                                db.query(queryAlumno, valoresAlumno, function(err, resultAlumno) {
                                    if (err) {
                                        return db.rollback(function() {
                                            console.error('Error al crear alumno:', err);
                                            res.status(500).json({ success: false, message: 'Error al crear alumno' });
                                        });
                                    }

                                    db.commit(function(err) {
                                        if (err) {
                                            return db.rollback(function() {
                                                console.error('Error al confirmar la transacción:', err);
                                                res.status(500).json({ success: false, message: 'Error al confirmar la transacción' });
                                            });
                                        }
                                        res.json({
                                            success: true,
                                            message: "Registro completo guardado correctamente",
                                            idAlumno: idUsuarioAlumno,
                                            idApoderado: idApoderado
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } catch (error) {
                db.rollback(function() {
                    console.error('Error en la transacción:', error);
                    res.status(500).json({ success: false, message: 'Error en la transacción' });
                });
            }
        });
    } catch (error) {
        console.error('Error general al procesar la solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
    }
});

// Reemplaza tu ruta actual por esta:
app.get('/obtener-motivos-postulacion', (req, res) => {
    // Obtener valores únicos de motivos de inscripción existentes en el sistema
    if (db) {
        db.query('SELECT DISTINCT motivo_inscripcion AS id_motivo, motivo_inscripcion AS descripcion FROM alumno WHERE motivo_inscripcion IS NOT NULL ORDER BY motivo_inscripcion', (err, results) => {
            if (err || results.length === 0) {
                console.log("Usando valores predeterminados para motivos de inscripción");
                // Si hay error o no hay resultados, devolver valores por defecto
                return res.json([
                    {id_motivo: 1, descripcion: "Recomendación familiar"},
                    {id_motivo: 2, descripcion: "Cercanía al domicilio"},
                    {id_motivo: 3, descripcion: "Proyecto educativo"},
                    {id_motivo: 4, descripcion: "Prestigio académico"},
                    {id_motivo: 5, descripcion: "Valores y formación"}
                ]);
            }
            
            return res.json(results);
        });
    } else {
        // Si no hay conexión a base de datos, devolver valores por defecto
        res.json([
            {id_motivo: 1, descripcion: "Recomendación familiar"},
            {id_motivo: 2, descripcion: "Cercanía al domicilio"},
            {id_motivo: 3, descripcion: "Proyecto educativo"},
            {id_motivo: 4, descripcion: "Prestigio académico"},
            {id_motivo: 5, descripcion: "Valores y formación"}
        ]);
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});