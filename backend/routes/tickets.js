const express = require('express');
const db = require('../database');
const { generarFolioUnico } = require('../utils/folio');
const { calcularPrioridad } = require('../utils/prioridad');
const { uploadUsuario } = require('../middleware/upload');

const router = express.Router();

const CATEGORIAS_VALIDAS = ['hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro'];

// POST /api/tickets — crear ticket (usuario público, sin cuenta), hasta 3 adjuntos
router.post('/', uploadUsuario.array('adjuntos', 3), (req, res) => {
  const { correo, nombre, categoria, mensaje } = req.body;
  const archivos = req.files || [];

  if (!correo || !categoria || !mensaje) {
    return res.status(400).json({ error: 'correo, categoria y mensaje son requeridos' });
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }

  // 1. Registro silencioso: upsert en directorio_usuarios
  db.get('SELECT * FROM directorio_usuarios WHERE correo = ?', [correo], (err, usuario) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });

    const continuarConTicket = (id_usuario) => {
      const prioridad = calcularPrioridad(categoria, mensaje);

      generarFolioUnico(db)
        .then((folio) => {
          db.run(
            `INSERT INTO tickets (folio, id_usuario, categoria, prioridad, estado)
             VALUES (?, ?, ?, ?, 'nuevo')`,
            [folio, id_usuario, categoria, prioridad],
            function (err) {
              if (err) return res.status(500).json({ error: 'Error al crear el ticket' });

              const id_ticket = this.lastID;

              // Guarda el mensaje inicial del usuario en el hilo
              db.run(
                `INSERT INTO mensajes_ticket (id_ticket, tipo_remitente, contenido)
                 VALUES (?, 'usuario', ?)`,
                [id_ticket, mensaje],
                function (err) {
                  if (err) return; // el ticket ya se creó; no bloqueamos la respuesta por esto
                  const id_mensaje = this.lastID;

                  // Guarda cada adjunto vinculado a ese mensaje
                  archivos.forEach((archivo) => {
                    db.run(
                      `INSERT INTO adjuntos (id_ticket, id_mensaje, ruta_archivo, tipo_archivo, subido_por)
                       VALUES (?, ?, ?, ?, 'usuario')`,
                      [id_ticket, id_mensaje, archivo.filename, archivo.mimetype]
                    );
                  });
                }
              );

              // La prioridad se calcula y se guarda, pero nunca se expone al usuario público
              res.status(201).json({
                folio,
                categoria,
                estado: 'nuevo',
                mensaje: 'Ticket creado correctamente',
              });

              // TODO (fase siguiente): disparar webhook a n8n con { evento: 'nuevo', folio, correo }
            }
          );
        })
        .catch(() => res.status(500).json({ error: 'Error al generar el folio' }));
    };

    if (usuario) {
      // Ya existe: actualiza métricas
      db.run(
        `UPDATE directorio_usuarios
         SET fecha_ultimo_ticket = CURRENT_TIMESTAMP, tickets_creados = tickets_creados + 1
         WHERE id_usuario = ?`,
        [usuario.id_usuario],
        (err) => {
          if (err) return res.status(500).json({ error: 'Error del servidor' });
          continuarConTicket(usuario.id_usuario);
        }
      );
    } else {
      // No existe: lo crea de forma silenciosa
      db.run(
        `INSERT INTO directorio_usuarios (correo, nombre) VALUES (?, ?)`,
        [correo, nombre || null],
        function (err) {
          if (err) return res.status(500).json({ error: 'Error del servidor' });
          continuarConTicket(this.lastID);
        }
      );
    }
  });
});

// POST /api/tickets/consultar — OTP implícito (correo + folio exacto)
router.post('/consultar', (req, res) => {
  const { correo, folio } = req.body;

  if (!correo || !folio) {
    return res.status(400).json({ error: 'correo y folio son requeridos' });
  }

  const sql = `
    SELECT t.* FROM tickets t
    JOIN directorio_usuarios d ON t.id_usuario = d.id_usuario
    WHERE t.folio = ? AND d.correo = ?
  `;

  db.get(sql, [folio, correo], (err, ticket) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    db.all(
      `SELECT tipo_remitente, contenido, fecha_envio FROM mensajes_ticket
       WHERE id_ticket = ? ORDER BY fecha_envio ASC`,
      [ticket.id_ticket],
      (err, mensajes) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });

        db.all(
          `SELECT id_adjunto, tipo_archivo, subido_por FROM adjuntos WHERE id_ticket = ?`,
          [ticket.id_ticket],
          (err, adjuntos) => {
            if (err) return res.status(500).json({ error: 'Error del servidor' });

            res.json({
              folio: ticket.folio,
              categoria: ticket.categoria,
              estado: ticket.estado,
              fecha_creacion: ticket.fecha_creacion,
              mensajes,
              adjuntos,
            });
          }
        );
      }
    );
  });
});

module.exports = router;
