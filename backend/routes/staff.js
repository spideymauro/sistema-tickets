const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');
const { verificarToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);
router.use(requireAdmin); // toda esta sección es exclusiva de administradores

// GET /api/admin/staff — lista de agentes y administradores
router.get('/', (req, res) => {
  db.all(
    `SELECT id_usuario, correo, nombre, apellido, puesto, rol, activo
     FROM usuarios_staff ORDER BY id_usuario ASC`,
    [],
    (err, staff) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      res.json({ staff });
    }
  );
});

// POST /api/admin/staff — crear un nuevo agente o administrador
router.post('/', (req, res) => {
  const { correo, password, nombre, apellido, puesto, rol } = req.body;

  if (!correo || !password || !nombre || !rol) {
    return res.status(400).json({ error: 'correo, password, nombre y rol son requeridos' });
  }
  if (!['admin', 'agente'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });

    db.run(
      `INSERT INTO usuarios_staff (correo, password_hash, rol, nombre, apellido, puesto)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [correo, hash, rol, nombre, apellido || null, puesto || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
          }
          return res.status(500).json({ error: 'Error al crear el usuario' });
        }
        res.status(201).json({ mensaje: 'Usuario creado correctamente', id_usuario: this.lastID });
      }
    );
  });
});

module.exports = router;
