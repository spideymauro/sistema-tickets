const express = require('express');
const fs = require('fs');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');
const { uploadAgente } = require('../middleware/upload');
const { notificarN8n } = require('../utils/webhook');
const { esFirmaValida } = require('../utils/validarFirma');

const router = express.Router();

const ESTADOS_VALIDOS = ['nuevo', 'en_proceso', 'pendiente', 'resuelto', 'cerrado'];
const ORDEN_PRIORIDAD = { urgente: 0, alta: 1, media: 2, baja: 3 };

router.use(verificarToken); // todas las rutas de este archivo requieren agente/admin autenticado

// GET /api/admin/tickets?estado=&prioridad= — lista con filtros opcionales
router.get('/', (req, res) => {
  const { estado, prioridad } = req.query;
  const condiciones = [];
  const parametros = [];

  if (estado) {
    condiciones.push('t.estado = ?');
    parametros.push(estado);
  }
  if (prioridad) {
    condiciones.push('t.prioridad = ?');
    parametros.push(prioridad);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const sql = `
    SELECT t.id_ticket, t.folio, t.categoria, t.prioridad, t.estado,
           t.fecha_creacion, t.fecha_actualizacion, t.id_agente,
           d.correo, d.nombre
    FROM tickets t
    JOIN directorio_usuarios d ON t.id_usuario = d.id_usuario
    ${where}
    ORDER BY t.fecha_creacion DESC
  `;

  db.all(sql, parametros, (err, tickets) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    tickets.sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
    res.json({ tickets });
  });
});

// GET /api/admin/tickets/resumen — conteo de tickets por estado (para las tarjetas del dashboard)
// IMPORTANTE: debe ir antes de router.get('/:id', ...) para que Express no lo confunda con un id
router.get('/resumen', (req, res) => {
  db.all('SELECT estado, COUNT(*) AS total FROM tickets GROUP BY estado', [], (err, filas) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });

    const resumen = { nuevo: 0, en_proceso: 0, pendiente: 0, resuelto: 0, cerrado: 0 };
    filas.forEach((f) => {
      resumen[f.estado] = f.total;
    });
    res.json(resumen);
  });
});

// GET /api/admin/tickets/:id — detalle completo (mensajes + adjuntos)
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT t.*, d.correo, d.nombre
    FROM tickets t
    JOIN directorio_usuarios d ON t.id_usuario = d.id_usuario
    WHERE t.id_ticket = ?
  `;

  db.get(sql, [id], (err, ticket) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    db.all(
      `SELECT id_mensaje, tipo_remitente, contenido, fecha_envio FROM mensajes_ticket
       WHERE id_ticket = ? ORDER BY fecha_envio ASC`,
      [id],
      (err, mensajes) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });

        db.all(
          `SELECT id_adjunto, id_mensaje, tipo_archivo, subido_por FROM adjuntos WHERE id_ticket = ?`,
          [id],
          (err, adjuntos) => {
            if (err) return res.status(500).json({ error: 'Error del servidor' });
            res.json({ ...ticket, mensajes, adjuntos });
          }
        );
      }
    );
  });
});

// PUT /api/admin/tickets/:id/asignar — el agente autenticado se asigna el ticket
router.put('/:id/asignar', (req, res) => {
  const { id } = req.params;
  db.run(
    `UPDATE tickets SET id_agente = ?, estado = 'en_proceso', fecha_actualizacion = CURRENT_TIMESTAMP
     WHERE id_ticket = ?`,
    [req.usuario.id_usuario, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (this.changes === 0) return res.status(404).json({ error: 'Ticket no encontrado' });
      res.json({ mensaje: 'Ticket asignado correctamente' });
    }
  );
});

// PUT /api/admin/tickets/:id/estado — cambiar el estado del ticket
router.put('/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  // Si el ticket todavía no tiene agente asignado, este cambio lo asigna automáticamente
  db.get('SELECT id_agente FROM tickets WHERE id_ticket = ?', [id], (err, ticket) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    const idAgenteFinal = ticket.id_agente || req.usuario.id_usuario;

    db.run(
      `UPDATE tickets SET estado = ?, id_agente = ?, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_ticket = ?`,
      [estado, idAgenteFinal, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Error del servidor' });
        res.json({ mensaje: 'Estado actualizado correctamente' });
      }
    );
  });
});

// POST /api/admin/tickets/:id/mensajes — el agente responde, con evidencia opcional (límite ampliado)
router.post('/:id/mensajes', uploadAgente.array('adjuntos', 5), (req, res) => {
  const { id } = req.params;
  const { contenido } = req.body;
  const archivos = req.files || [];

  if (!contenido || !contenido.trim()) {
    return res.status(400).json({ error: 'El contenido del mensaje es requerido' });
  }

  // Misma validación real por firma de bytes (los tipos de video no tienen firma definida y pasan)
  for (const archivo of archivos) {
    if (!esFirmaValida(archivo.path, archivo.mimetype)) {
      archivos.forEach((a) => {
        try {
          fs.unlinkSync(a.path);
        } catch {}
      });
      return res.status(400).json({
        error: `El archivo "${archivo.originalname}" no es válido: su contenido no coincide con un ${archivo.mimetype} real.`,
      });
    }
  }

  db.run(
    `INSERT INTO mensajes_ticket (id_ticket, tipo_remitente, id_agente, contenido)
     VALUES (?, 'agente', ?, ?)`,
    [id, req.usuario.id_usuario, contenido.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al guardar el mensaje' });

      const idMensaje = this.lastID;

      archivos.forEach((archivo) => {
        db.run(
          `INSERT INTO adjuntos (id_ticket, id_mensaje, ruta_archivo, tipo_archivo, subido_por)
           VALUES (?, ?, ?, ?, 'agente')`,
          [id, idMensaje, archivo.filename, archivo.mimetype]
        );
      });

      db.run('UPDATE tickets SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_ticket = ?', [id]);

      res.status(201).json({ mensaje: 'Respuesta enviada correctamente' });

      // Notifica a n8n para que le avise al usuario por correo (no bloquea la respuesta)
      db.get(
        `SELECT t.folio, d.correo FROM tickets t
         JOIN directorio_usuarios d ON t.id_usuario = d.id_usuario
         WHERE t.id_ticket = ?`,
        [id],
        (err, fila) => {
          if (!err && fila) {
            notificarN8n('respuesta', { folio: fila.folio, correo: fila.correo });
          }
        }
      );
    }
  );
});

module.exports = router;
