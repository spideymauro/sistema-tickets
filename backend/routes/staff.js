const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');
const { verificarToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ESTADOS_ABIERTOS = ['nuevo', 'en_proceso', 'pendiente'];

router.use(verificarToken);
router.use(requireAdmin); // toda esta sección es exclusiva de administradores

// GET /api/admin/staff — lista de agentes y administradores (activos e inactivos),
// con el conteo de tickets abiertos que tiene asignados cada uno
router.get('/', (req, res) => {
  db.all(
    `SELECT id_usuario, correo, nombre, apellido, puesto, rol, puede_ver_usuarios, activo
     FROM usuarios_staff ORDER BY id_usuario ASC`,
    [],
    (err, staff) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });

      db.all(
        `SELECT id_agente, COUNT(*) AS total FROM tickets
         WHERE estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')}) AND id_agente IS NOT NULL
         GROUP BY id_agente`,
        ESTADOS_ABIERTOS,
        (err, conteos) => {
          if (err) return res.status(500).json({ error: 'Error del servidor' });

          const mapaConteos = {};
          conteos.forEach((c) => {
            mapaConteos[c.id_agente] = c.total;
          });

          const staffConConteo = staff.map((s) => ({
            ...s,
            ticketsAbiertos: mapaConteos[s.id_usuario] || 0,
          }));

          res.json({ staff: staffConConteo });
        }
      );
    }
  );
});

// GET /api/admin/staff/:id/tickets-abiertos — detalle de los tickets abiertos de un agente
router.get('/:id/tickets-abiertos', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT id_ticket, folio, categoria, prioridad, estado FROM tickets
     WHERE id_agente = ? AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')})
     ORDER BY fecha_creacion ASC`,
    [id, ...ESTADOS_ABIERTOS],
    (err, tickets) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      res.json({ tickets });
    }
  );
});

// POST /api/admin/staff — crear un nuevo agente o administrador
const PATRON_PASSWORD = /^(?=.*\d)(?=.*[._*-])[A-Z].{5,}$/;

router.post('/', (req, res) => {
  const { correo, password, nombre, apellido, puesto, rol, puedeVerUsuarios } = req.body;

  if (!correo || !password || !nombre || !apellido || !puesto || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!['admin', 'agente'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (!PATRON_PASSWORD.test(password)) {
    return res.status(400).json({
      error:
        'La contraseña debe empezar con mayúscula, incluir al menos un número y un símbolo (. - _ *), y tener mínimo 6 caracteres.',
    });
  }

  // Los administradores ya tienen acceso total; este permiso granular solo aplica a agentes
  const verUsuarios = rol === 'agente' && puedeVerUsuarios === true ? 1 : 0;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });

    db.run(
      `INSERT INTO usuarios_staff (correo, password_hash, rol, nombre, apellido, puesto, puede_ver_usuarios)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [correo, hash, rol, nombre, apellido || null, puesto || null, verUsuarios],
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

// PUT /api/admin/staff/:id — editar puesto, rol y/o permisos de un usuario existente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, puesto, rol, puedeVerUsuarios } = req.body;

  if (rol && !['admin', 'agente'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  const campos = [];
  const valores = [];

  if (nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (apellido !== undefined) {
    campos.push('apellido = ?');
    valores.push(apellido);
  }
  if (puesto !== undefined) {
    campos.push('puesto = ?');
    valores.push(puesto);
  }
  if (rol !== undefined) {
    campos.push('rol = ?');
    valores.push(rol);
  }
  if (puedeVerUsuarios !== undefined) {
    // Si se está cambiando a admin, este campo deja de tener sentido (admin ya ve todo)
    const rolFinal = rol || null;
    campos.push('puede_ver_usuarios = ?');
    valores.push(rolFinal === 'admin' ? 0 : puedeVerUsuarios ? 1 : 0);
  }

  if (campos.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  valores.push(id);

  db.run(`UPDATE usuarios_staff SET ${campos.join(', ')} WHERE id_usuario = ?`, valores, function (err) {
    if (err) return res.status(500).json({ error: 'Error al actualizar el usuario' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  });
});

// PUT /api/admin/staff/:id/reasignar — mueve todos los tickets abiertos de un agente a otro
router.put('/:id/reasignar', (req, res) => {
  const { id } = req.params;
  const { idAgenteDestino } = req.body;

  if (!idAgenteDestino) {
    return res.status(400).json({ error: 'idAgenteDestino es requerido' });
  }
  if (String(idAgenteDestino) === String(id)) {
    return res.status(400).json({ error: 'El destino no puede ser el mismo usuario' });
  }

  db.get(
    'SELECT id_usuario FROM usuarios_staff WHERE id_usuario = ? AND activo = 1',
    [idAgenteDestino],
    (err, destino) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (!destino) return res.status(400).json({ error: 'El agente destino no existe o está inactivo' });

      db.run(
        `UPDATE tickets SET id_agente = ?, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id_agente = ? AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')})`,
        [idAgenteDestino, id, ...ESTADOS_ABIERTOS],
        function (err) {
          if (err) return res.status(500).json({ error: 'Error al reasignar tickets' });
          res.json({ mensaje: `${this.changes} ticket(s) reasignado(s) correctamente` });
        }
      );
    }
  );
});

// DELETE /api/admin/staff/:id — desactivación permanente (soft delete, preserva el histórico)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (String(req.usuario.id_usuario) === String(id)) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  // Nunca permitir que se quede el sistema sin ningún administrador activo
  db.get('SELECT rol, activo FROM usuarios_staff WHERE id_usuario = ?', [id], (err, usuario) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const continuarConValidacion = () => {
      // No permitir eliminar si aún tiene tickets abiertos (deben reasignarse primero)
      db.get(
        `SELECT COUNT(*) AS total FROM tickets
         WHERE id_agente = ? AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')})`,
        [id, ...ESTADOS_ABIERTOS],
        (err, fila) => {
          if (err) return res.status(500).json({ error: 'Error del servidor' });
          if (fila.total > 0) {
            return res.status(409).json({
              error: `Este usuario todavía tiene ${fila.total} ticket(s) abierto(s). Reasígnalos antes de eliminar.`,
            });
          }

          db.run('UPDATE usuarios_staff SET activo = 0 WHERE id_usuario = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: 'Error al eliminar el usuario' });
            res.json({ mensaje: 'Usuario eliminado correctamente' });
          });
        }
      );
    };

    if (usuario.rol === 'admin' && usuario.activo) {
      db.get(
        `SELECT COUNT(*) AS total FROM usuarios_staff WHERE rol = 'admin' AND activo = 1 AND id_usuario != ?`,
        [id],
        (err, fila) => {
          if (err) return res.status(500).json({ error: 'Error del servidor' });
          if (fila.total === 0) {
            return res
              .status(400)
              .json({ error: 'No puedes eliminar al único administrador activo del sistema' });
          }
          continuarConValidacion();
        }
      );
    } else {
      continuarConValidacion();
    }
  });
});

module.exports = router;
