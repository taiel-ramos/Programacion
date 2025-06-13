const express = require('express');
const db = require('../db.js'); // Asegúrate de que la conexión a la base de datos esté configurada
const verificarRol = require('../middlewares/verificarRol'); // Middleware para verificar el rol

const router = express.Router();

router.put('/ajustes-usuario', (req, res) => {
  const { dni, nombre_usuario, curso, division } = req.body;
  if (!dni || !nombre_usuario || !curso || !division) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  db.query(
    'UPDATE usuarios SET nombre_usuario = ?, curso = ?, division = ? WHERE DNI = ?',
    [nombre_usuario, curso, division, dni],
    (err, result) => {
      if (err) {
        console.error('Error al actualizar los datos del usuario:', err);
        return res.status(500).json({ error: 'Error al actualizar los datos' });
      }
      res.status(200).json({ mensaje: 'Datos actualizados correctamente' });
    }
  );
});





// Ruta para guardar los datos del boletín (solo para usuarios del departamento)
router.post('/guardar-boletin', async (req, res) => {
  const { materias, dni } = req.body;
  console.log('Materias recibidas:', materias);

  if (!materias || !dni || !Array.isArray(materias) || materias.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Si el usuario es departamento, verificar que solo pueda cargar para su colegio
  if (req.body.rol === 'departamento') {
  // Ya no se verifica modalidad/colegio, solo se permite guardar directamente
    db.query('DELETE FROM boletin WHERE usuario_dni = ?', [dni], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al borrar notas anteriores' });
      }
      db.query('SELECT id_usuario FROM usuarios WHERE DNI = ?', [dni], (err, results) => {
        let usuario_id = null;
        if (results && results.length > 0) {
          usuario_id = results[0].id_usuario;
        }
        let queries = materias.map(materia => {
          return new Promise((resolve, reject) => {
            db.query(
              `INSERT INTO boletin 
                (usuario_id, materia, informe1, informe2, cuatrimestre1, informe3, informe4, cuatrimestre2, nota_final, usuario_dni)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                usuario_id,
                materia.nombre,
                materia.informe1,
                materia.informe2,
                materia.cuatrimestre1,
                materia.informe3,
                materia.informe4,
                materia.cuatrimestre2,
                materia.nota_final,
                dni
              ],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        });

        Promise.all(queries)
          .then(() => res.status(201).json({ mensaje: 'Notas guardadas exitosamente.' }))
          .catch(err => {
            console.error('Error al guardar las notas:', err);
            res.status(500).json({ error: 'Error al guardar las notas' });
          });
      });
    });
    return;
  }

  // --- BORRAR NOTAS ANTERIORES PARA USUARIOS NO DEPARTAMENTO ---
  db.query('DELETE FROM boletin WHERE usuario_dni = ?', [dni], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al borrar notas anteriores' });
    }
    db.query('SELECT id_usuario FROM usuarios WHERE DNI = ?', [dni], (err, results) => {
      let usuario_id = null;
      if (results && results.length > 0) {
        usuario_id = results[0].id_usuario;
      }
      let queries = materias.map(materia => {
        return new Promise((resolve, reject) => {
          db.query(
            `INSERT INTO boletin 
              (usuario_id, materia, informe1, informe2, cuatrimestre1, informe3, informe4, cuatrimestre2, nota_final, usuario_dni)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              usuario_id,
              materia.nombre,
              materia.informe1,
              materia.informe2,
              materia.cuatrimestre1,
              materia.informe3,
              materia.informe4,
              materia.cuatrimestre2,
              materia.nota_final,
              dni
            ],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      });

      Promise.all(queries)
        .then(() => res.status(201).json({ mensaje: 'Notas guardadas exitosamente.' }))
        .catch(err => {
          console.error('Error al guardar las notas:', err);
          res.status(500).json({ error: 'Error al guardar las notas' });
        });
    });
  });
});





  

router.get('/verificar-alumno/:dni', (req, res) => {
  const { dni } = req.params;

  db.query(
    `SELECT 
      u.*,
      COUNT(DISTINCT b.materia) as materias_cargadas,
      (SELECT COUNT(*) FROM boletin WHERE usuario_dni = ? AND nota_final IS NOT NULL) as notas_finales
    FROM usuarios u 
    LEFT JOIN boletin b ON u.DNI = b.usuario_dni 
    WHERE u.DNI = ?
    GROUP BY u.DNI`,
    [dni, dni],
    (err, results) => {
      if (err) {
        console.error('Error al verificar el alumno:', err);
        return res.status(500).json({ error: 'Error al verificar el alumno' });
      }

      if (results.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no registrado' });
      }

      // Verificar que tenga todas las materias (13 en total)
      const materiasCompletas = results[0].materias_cargadas === 13;
      const notasFinalesCargadas = results[0].notas_finales === 13;

      res.status(200).json({ 
        mensaje: 'Usuario registrado', 
        alumno: results[0],
        materiasCompletas,
        notasFinalesCargadas
      });
    }
  );
});


router.get('/obtener-boletin/:dni', async (req, res) => {
  const { dni } = req.params;
  console.log('Obteniendo notas para DNI:', dni);

  try {
    const query = `
      SELECT 
        b.*,
        u.nombre_usuario AS alumno,
        u.curso,
        u.division,
        u.modalidad,
        DATE_FORMAT(b.fecha, '%Y-%m-%d') as fecha
      FROM boletin b 
      JOIN usuarios u ON b.usuario_dni = u.DNI 
      WHERE b.usuario_dni = ?
      ORDER BY b.materia ASC`;

    const results = await new Promise((resolve, reject) => {
      db.query(query, [dni], (err, results) => {
        if (err) {
          console.error('Error en consulta:', err);
          reject(err);
        } else {
          console.log('Notas encontradas:', results);
          resolve(results);
        }
      });
    });

    if (!results || results.length === 0) {
      return res.status(404).json([]);  // Devolver array vacío en lugar de objeto
    }

    res.status(200).json(results); // Devolver directamente el array de resultados

  } catch (error) {
    console.error('Error al obtener boletín:', error);
    res.status(500).json({ 
      error: 'Error al obtener las notas',
      detalles: error.message 
    });
  }
});



module.exports = router;