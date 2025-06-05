const express = require('express');
const router = express.Router();
const { loginStatic, login, register, registerDepartamento } = require('../controllers/authController');
const verificarRol = require('../middlewares/verificarRol');

router.post('/login-static', loginStatic);
router.post('/login', login);
router.post('/register', register);
router.post('/register-departamento', registerDepartamento);

module.exports = router;