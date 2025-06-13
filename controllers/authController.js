const bcrypt = require('bcryptjs');
const db = require('../db.js');
// authController.js o donde corresponda
require('dotenv').config();
const USER = process.env.USER;
const PASS = process.env.PASS;
const DEPARTAMENTO = process.env.DEPARTAMENTO;
const DEPARTAMENTO_PASS = process.env.DEPARTAMENTO_PASS;


// Login estático
function loginStatic(req, res) {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
  }
  const { nombre_usuario, contrasena } = req.body;
  if (nombre_usuario === USER && contrasena === PASS) {
    return res.status(200).json({ usuario: USER, rol: 'usuario' });
  }
  if (nombre_usuario === DEPARTAMENTO && contrasena === DEPARTAMENTO_PASS) {
    // Devuelve el colegio predeterminado o uno fijo
    return res.status(200).json({
      usuario: DEPARTAMENTO,
      rol: 'departamento',
      colegio: "Colegio Provincial Dr.Ernesto Guevara" // <-- Cambia por el colegio que corresponda
    });
  }
  return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
}

// Registro usuario
async function register(req, res) {
  const { nombre_usuario, correo, contrasena, dni, modalidad, fecha_nacimiento, curso, division } = req.body;
  if (!nombre_usuario || !correo || !contrasena || !dni || !modalidad|| !fecha_nacimiento || !curso || !division) {
    return res.status(400).json({ error: 'Faltan campos' });
  }
  if (!/^\d{7,8}$/.test(dni)) return res.status(400).json({ error: 'DNI inválido' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return res.status(400).json({ error: 'Email inválido' });
  if (contrasena.length < 6) return res.status(400).json({ error: 'Contraseña muy corta' });

  const hash = await bcrypt.hash(contrasena, 10);

  db.query(
    'INSERT INTO usuarios (nombre_usuario, correo, contrasena_hash, DNI, fecha_nacimiento, modalidad, curso, division) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre_usuario, correo, hash, dni, fecha_nacimiento, modalidad, curso, division],
    (err, results) => {
      if (err) {
        // Manejo de error por DNI o correo duplicado
        if (err.code === 'ER_DUP_ENTRY') {
          if (err.sqlMessage.includes('DNI')) {
            return res.status(409).json({ error: 'El DNI ya está registrado.' });
          }
          if (err.sqlMessage.includes('correo')) {
            return res.status(409).json({ error: 'El correo ya está registrado.' });
          }
        }
        console.error('Error al registrar el usuario:', err);
        return res.status(500).json({ error: 'Error al registrar' });
      }
      const usuario_id = results.insertId;
      db.query(
        'UPDATE boletin SET usuario_id = ? WHERE usuario_dni = ?',
        [usuario_id, dni],
        (err) => {
          if (err) {
            console.error('Error al asociar las notas al usuario:', err);
            return res.status(500).json({ error: 'Error al asociar las notas al usuario' });
          }
          res.status(201).json({ mensaje: 'Usuario registrado con éxito y notas asociadas.' });
        }
      );
    }
  );
}

// Registro departamento
async function registerDepartamento(req, res) {
  const { nombre_usuario_departamento, correo_departamento, contrasena_departamento, dni_departamento } = req.body;
  if (!nombre_usuario_departamento || !correo_departamento || !contrasena_departamento || !dni_departamento ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const hash = await bcrypt.hash(contrasena_departamento, 10);
    db.query(
      'INSERT INTO departamento_usuarios (nombre, dni, correo, contrasena_hash) VALUES (?, ?, ?, ?)',
      [nombre_usuario_departamento, dni_departamento, correo_departamento, hash],
      (err) => {
        if (err) {
          // Mostrar mensaje específico si es duplicado
          if (err.code === 'ER_DUP_ENTRY') {
            if (err.sqlMessage.includes('dni')) {
              return res.status(409).json({ error: 'El DNI ya está registrado.' });
            }
            if (err.sqlMessage.includes('correo')) {
              return res.status(409).json({ error: 'El correo ya está registrado.' });
            }
          }
          console.error('Error al registrar el usuario del departamento:', err);
          return res.status(500).json({ error: 'Error al registrar el usuario del departamento' });
        }
        res.status(201).json({ mensaje: 'Usuario del departamento registrado con éxito' });
      }
    );
  } catch (error) {
    console.error('Error al registrar el usuario del departamento:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// Login dinámico
async function login(req, res) {
  const { nombre_usuario, contrasena } = req.body;
  db.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario], async (err, results) => {
    if (err) {
      console.error('Error al buscar el usuario:', err);
      return res.status(500).json({ error: 'Error al buscar el usuario' });
    }
    if (results.length > 0) {
      const usuario = results[0];
      const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
      if (!contrasenaValida) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
      // Verificar campos incompletos
      const camposFaltantes = [];
      if (!usuario.modalidad) camposFaltantes.push('modalidad');
      if (!usuario.curso) camposFaltantes.push('curso');
      if (!usuario.division) camposFaltantes.push('división');
      if (!usuario.fecha_nacimiento) camposFaltantes.push('fecha de nacimiento');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Faltan completar los siguientes campos: ${camposFaltantes.join(', ')}`,
        });
      }
      return res.status(200).json({

        usuario: usuario.nombre_usuario,
        rol: 'usuario',
        dni: usuario.DNI,
      });
    }
    // Si no se encuentra en `usuarios`, buscar en `departamento_usuarios`
    db.query('SELECT * FROM departamento_usuarios WHERE nombre = ?', [nombre_usuario], async (err, results) => {
      if (err) {
        console.error('Error al buscar el usuario del departamento:', err);
        return res.status(500).json({ error: 'Error al buscar el usuario del departamento' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const usuarioDepartamento = results[0];
      const contrasenaValida = await bcrypt.compare(contrasena, usuarioDepartamento.contrasena_hash);
      if (!contrasenaValida) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
      return res.status(200).json({
        usuario: usuarioDepartamento.nombre,
        rol: 'departamento',
        dni: usuarioDepartamento.dni || ''
      });
    });
  });
}



// ...aquí van las funciones loginStatic, login, register, registerDepartamento...
module.exports = { loginStatic, login, register, registerDepartamento };

