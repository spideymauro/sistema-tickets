const { generarFolioUnico } = require('./folio');
const { calcularPrioridad } = require('./prioridad');

// Casos de ejemplo: cubren las 6 categorías, varias prioridades, y los 5 estados posibles.
// El texto de cada mensaje está pensado para que la lógica real de prioridad (calcularPrioridad)
// produzca resultados variados, tal como pasaría con tickets reales.
const TICKETS_EJEMPLO = [
  {
    correo: 'ana.torres@ejemplo.com',
    nombre: 'Ana Torres',
    categoria: 'redes',
    mensaje: 'Nadie tiene internet en la oficina desde hace una hora.',
    estado: 'nuevo',
    respuestaAgente: null,
  },
  {
    correo: 'luis.mendez@ejemplo.com',
    nombre: 'Luis Méndez',
    categoria: 'hardware',
    mensaje: 'Mi laptop no prende desde esta mañana.',
    estado: 'nuevo',
    respuestaAgente: null,
  },
  {
    correo: 'karla.ruiz@ejemplo.com',
    nombre: 'Karla Ruiz',
    categoria: 'accesos',
    mensaje: 'Olvidé mi contraseña y no puedo entrar a mi cuenta.',
    estado: 'en_proceso',
    respuestaAgente: 'Te acabo de enviar un enlace para restablecer tu contraseña, revisa tu correo.',
  },
  {
    correo: 'jorge.paredes@ejemplo.com',
    nombre: 'Jorge Paredes',
    categoria: 'software',
    mensaje: 'Excel se cierra solo cada vez que intento guardar un archivo grande.',
    estado: 'pendiente',
    respuestaAgente: '¿Podrías confirmarme qué versión de Excel tienes instalada?',
  },
  {
    correo: 'maria.lopez@ejemplo.com',
    nombre: 'María López',
    categoria: 'solicitudes',
    mensaje: 'Necesito un teclado nuevo, el mío ya no funciona bien.',
    estado: 'resuelto',
    respuestaAgente: 'Listo, tu teclado nuevo fue entregado en recepción.',
  },
  {
    correo: 'diego.fernandez@ejemplo.com',
    nombre: 'Diego Fernández',
    categoria: 'otro',
    mensaje: 'Quiero saber el proceso para solicitar días de vacaciones.',
    estado: 'cerrado',
    respuestaAgente: 'Ese trámite se hace directo con Recursos Humanos, te comparto el enlace del formulario.',
  },
];

function sembrarTicketsEjemplo(db) {
  db.get('SELECT COUNT(*) AS total FROM tickets', [], (err, fila) => {
    if (err) return console.error('Error al verificar tickets existentes:', err.message);
    if (fila.total > 0) {
      console.log('Ya existen tickets, se omite la siembra de ejemplo.');
      return;
    }

    console.log('No hay tickets. Sembrando tickets de ejemplo...');
    TICKETS_EJEMPLO.forEach((ejemplo) => crearTicketEjemplo(db, ejemplo));
  });
}

function crearTicketEjemplo(db, ejemplo) {
  db.run(
    `INSERT INTO directorio_usuarios (correo, nombre) VALUES (?, ?)`,
    [ejemplo.correo, ejemplo.nombre],
    function (err) {
      if (err) return console.error('Error al crear usuario de ejemplo:', err.message);
      const idUsuario = this.lastID;
      const prioridad = calcularPrioridad(ejemplo.categoria, ejemplo.mensaje);

      generarFolioUnico(db)
        .then((folio) => {
          // El admin sembrado siempre queda con id_usuario = 1
          const idAgente = ejemplo.estado === 'nuevo' ? null : 1;

          db.run(
            `INSERT INTO tickets (folio, id_usuario, categoria, prioridad, estado, id_agente)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [folio, idUsuario, ejemplo.categoria, prioridad, ejemplo.estado, idAgente],
            function (err) {
              if (err) return console.error('Error al crear ticket de ejemplo:', err.message);
              const idTicket = this.lastID;

              db.run(
                `INSERT INTO mensajes_ticket (id_ticket, tipo_remitente, contenido)
                 VALUES (?, 'usuario', ?)`,
                [idTicket, ejemplo.mensaje]
              );

              if (ejemplo.respuestaAgente) {
                db.run(
                  `INSERT INTO mensajes_ticket (id_ticket, tipo_remitente, id_agente, contenido)
                   VALUES (?, 'agente', ?, ?)`,
                  [idTicket, 1, ejemplo.respuestaAgente]
                );
              }

              console.log(`Ticket de ejemplo creado: ${folio} (${ejemplo.categoria}, ${prioridad}, ${ejemplo.estado})`);
            }
          );
        })
        .catch((err) => console.error('Error al generar folio de ejemplo:', err.message));
    }
  );
}

module.exports = { sembrarTicketsEjemplo };
