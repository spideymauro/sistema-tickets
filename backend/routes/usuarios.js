const express = require('express');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

// GET /api/admin/usuarios — lista de usuarios que han solicitado tickets (directorio silencioso)
router.get('/', (req, res) => {
  db.all(
    `SELECT id_usuario, correo, nombre, departamento, fecha_primer_contacto,
            fecha_ultimo_ticket, tickets_creados
     FROM directorio_usuarios
     ORDER BY fecha_ultimo_ticket DESC`,
    [],
    (err, usuarios) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      res.json({ usuarios });
    }
  );
});

module.exports = router;
