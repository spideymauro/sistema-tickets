const express = require('express');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

// Verifica el permiso en tiempo real (nunca confía en un JWT viejo si el permiso cambió después)
function verificarPermisoVerUsuarios(req, res, next) {
  if (req.usuario.rol === 'admin') return next(); // los admins siempre tienen acceso total

  db.get(
    'SELECT puede_ver_usuarios FROM usuarios_staff WHERE id_usuario = ?',
    [req.usuario.id_usuario],
    (err, fila) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (!fila || !fila.puede_ver_usuarios) {
        return res.status(403).json({ error: 'No tienes permiso para ver esta sección' });
      }
      next();
    }
  );
}

// GET /api/admin/usuarios — lista de usuarios que han solicitado tickets (directorio silencioso)
router.get('/', verificarPermisoVerUsuarios, (req, res) => {
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
