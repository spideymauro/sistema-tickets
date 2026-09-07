const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

// GET /api/adjuntos/:id_adjunto/descargar
// Acceso para AGENTE: header Authorization Bearer <token>
// Acceso para USUARIO: query params ?correo=...&folio=... (deben coincidir exactamente con el ticket dueño del adjunto)
router.get('/:id_adjunto/descargar', (req, res) => {
  const { id_adjunto } = req.params;
  const { correo, folio } = req.query;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const sql = `
    SELECT a.ruta_archivo, a.tipo_archivo, t.folio, d.correo
    FROM adjuntos a
    JOIN tickets t ON a.id_ticket = t.id_ticket
    JOIN directorio_usuarios d ON t.id_usuario = d.id_usuario
    WHERE a.id_adjunto = ?
  `;

  db.get(sql, [id_adjunto], (err, adjunto) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!adjunto) return res.status(404).json({ error: 'Adjunto no encontrado' });

    const autorizarComoAgente = () => {
      if (!token) return false;
      try {
        jwt.verify(token, JWT_SECRET);
        return true;
      } catch {
        return false;
      }
    };

    const autorizarComoUsuario = () => {
      return correo === adjunto.correo && folio === adjunto.folio;
    };

    if (!autorizarComoAgente() && !autorizarComoUsuario()) {
      return res.status(403).json({ error: 'No autorizado para ver este adjunto' });
    }

    const rutaAbsoluta = path.join(UPLOAD_DIR, adjunto.ruta_archivo);
    res.sendFile(rutaAbsoluta, (err) => {
      if (err) res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    });
  });
});

module.exports = router;
