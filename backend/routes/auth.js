const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  db.get(
    'SELECT * FROM usuarios_staff WHERE correo = ? AND activo = 1',
    [correo],
    (err, usuario) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

      bcrypt.compare(password, usuario.password_hash, (err, coincide) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });
        if (!coincide) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign(
          { id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol },
          JWT_SECRET,
          { expiresIn: '8h' }
        );

        // Auditoría: registra la IP en el login (relevante sobre todo para admin)
        const ip = req.ip || req.connection.remoteAddress;
        db.run('UPDATE usuarios_staff SET ultima_ubicacion = ? WHERE id_usuario = ?', [
          ip,
          usuario.id_usuario,
        ]);

        res.json({
          token,
          usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            puesto: usuario.puesto,
            rol: usuario.rol,
            puedeVerUsuarios: !!usuario.puede_ver_usuarios,
          },
        });
      });
    }
  );
});

module.exports = router;
