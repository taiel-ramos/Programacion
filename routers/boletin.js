const express = require('express');
const db = require('../db.js'); // Asegúrate de que la conexión a la base de datos esté configurada
const verificarRol = require('../middlewares/verificarRol'); // Middleware para verificar el rol

const router = express.Router();

// Ruta para guardar los datos del boletín (solo para usuarios del departamento)


/*
// Ruta para guardar los datos del boletín (solo para usuarios del departamento)
router.post('/guardar-boletin', async (req, res) => {
  const { materias, dni, colegio, departamento_usuario } = req.body;

  if (!materias || !dni || !Array.isArray(materias) || materias.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Si el usuario es departamento, verificar que solo pueda cargar para su colegio
  if (req.body.rol === 'departamento') {
    db.query(
      'SELECT colegio FROM departamento_usuarios WHERE nombre = ?',
      [departamento_usuario],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error al verificar el colegio del departamento' });
        }
        if (!results.length || results[0].colegio !== colegio) {
          return res.status(403).json({ error: 'No tienes permiso para cargar notas en este colegio.' });
        }
        // ... aquí sigue la lógica normal para guardar las notas ...
        db.query('SELECT id_usuario FROM usuarios WHERE DNI = ?', [dni], (err, results) => {
    if (err) {
      console.error('Error al buscar el usuario:', err);
      return res.status(500).json({ error: 'Error al buscar el usuario' });
    }
    let usuario_id = null;
    if (results.length > 0) {
      usuario_id = results[0].id_usuario;
    }

    let queries = materias.map(materia => {
      return new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO boletin 
            (usuario_id, materia, informe1, informe2, cuatrimestre1, informe3, informe4, cuatrimestre2, nota_final, usuario_dni)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            informe1=VALUES(informe1), informe2=VALUES(informe2), cuatrimestre1=VALUES(cuatrimestre1),
            informe3=VALUES(informe3), informe4=VALUES(informe4), cuatrimestre2=VALUES(cuatrimestre2),
            nota_final=VALUES(nota_final)`,
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
      .then(() => res.status(201).json({ mensaje: 'Notas guardadas/actualizadas exitosamente.' }))
      .catch(err => {
        console.error('Error al guardar/actualizar las notas:', err);
        res.status(500).json({ error: 'Error al guardar/actualizar las notas' });
      });
  });
      }
    );
    return; // Importante: no sigas si eres departamento, espera el callback
  }

  // ... lógica normal para usuarios no departamento ...
});
*/

router.post('/guardar-boletin', async (req, res) => {
  const { materias, dni, colegio, departamento_usuario } = req.body;

  if (!materias || !dni || !Array.isArray(materias) || materias.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Si el usuario es departamento, verificar que solo pueda cargar para su colegio
  if (req.body.rol === 'departamento') {
    db.query(
      'SELECT colegio FROM departamento_usuarios WHERE nombre = ?',
      [departamento_usuario],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error al verificar el colegio del departamento' });
        }
        if (!results.length || results[0].colegio !== colegio) {
          return res.status(403).json({ error: 'No tienes permiso para cargar notas en este colegio.' });
        }
        // --- BORRAR NOTAS ANTERIORES ---
        db.query('DELETE FROM boletin WHERE usuario_dni = ?', [dni], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error al borrar notas anteriores' });
          }
          // ... sigue la lógica de insertar las nuevas notas ...
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
      }
    );
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
    'SELECT * FROM usuarios WHERE DNI = ?',
    [dni],
    (err, results) => {
      if (err) {
        console.error('Error al verificar el alumno:', err);
        return res.status(500).json({ error: 'Error al verificar el alumno' });
      }

      if (results.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no registrado' });
      }

      res.status(200).json({ mensaje: 'Usuario registrado', alumno: results[0] });
    }
  );
});

router.get('/obtener-colegios', (req, res) => {
  db.query('SELECT nombre FROM colegios', (err, results) => {
    if (err) {
      console.error('Error al obtener los colegios:', err);
      return res.status(500).json({ error: 'Error al obtener los colegios' });
    }

    res.status(200).json(results);
  });
});

router.get('/obtener-boletin/:dni', (req, res) => {
  const { dni } = req.params;

  console.log('DNI recibido:', dni);

  db.query(
    `SELECT 
        b.*, 
        u.nombre_usuario AS alumno, 
        u.curso, 
        u.division, 
        u.colegio 
     FROM boletin b 
     LEFT JOIN usuarios u ON b.usuario_dni = u.DNI 
     WHERE b.usuario_dni = ? 
     ORDER BY b.materia ASC`,
    [dni],
    (err, results) => {
      if (err) {
        console.error('Error al obtener los boletines:', err);
        return res.status(500).json({ error: 'Error al obtener los boletines' });
      }

      if (results.length === 0) {
        console.log('No se encontraron boletines para el usuario con DNI:', dni);
        return res.status(404).json({ mensaje: 'No se encontraron boletines para este usuario' });
      }

      console.log('Boletines encontrados:', results);
      res.status(200).json(results);
    }
  );
});
module.exports = router;