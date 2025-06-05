function verificarRol(req, res, next) {
  const { rol } = req.body;
  if (rol !== 'departamento') {
    return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
  }
  next();
}
// filepath: middlewares/verificarRol.js
module.exports = verificarRol;