const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tickets_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
    inicializarTablas();
  }
});

function inicializarTablas() {
  db.serialize(() => {
    db.run(`PRAGMA foreign_keys = ON`);

    // 1. Staff (agentes y administradores) — únicos roles autenticados
    db.run(`CREATE TABLE IF NOT EXISTS usuarios_staff (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      correo TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT CHECK(rol IN ('admin', 'agente')) NOT NULL,
      nombre TEXT,
      ultima_ubicacion TEXT,
      activo BOOLEAN DEFAULT 1
    )`);

    // 2. Directorio de usuarios (registro silencioso, sin cuenta)
    db.run(`CREATE TABLE IF NOT EXISTS directorio_usuarios (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      correo TEXT UNIQUE NOT NULL,
      nombre TEXT,
      departamento TEXT,
      fecha_primer_contacto DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_ultimo_ticket DATETIME DEFAULT CURRENT_TIMESTAMP,
      tickets_creados INTEGER DEFAULT 1
    )`);

    // 3. Tickets — folio no secuencial (se genera en código, ver utils/folio.js)
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id_ticket INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      id_usuario INTEGER NOT NULL,
      categoria TEXT CHECK(categoria IN ('hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro')) NOT NULL,
      prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
      estado TEXT CHECK(estado IN ('nuevo', 'en_proceso', 'pendiente', 'resuelto', 'cerrado')) DEFAULT 'nuevo',
      id_agente INTEGER,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(id_usuario) REFERENCES directorio_usuarios(id_usuario),
      FOREIGN KEY(id_agente) REFERENCES usuarios_staff(id_usuario)
    )`);

    // 4. Hilo de mensajes del ticket
    db.run(`CREATE TABLE IF NOT EXISTS mensajes_ticket (
      id_mensaje INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ticket INTEGER NOT NULL,
      tipo_remitente TEXT CHECK(tipo_remitente IN ('usuario', 'agente', 'bot')) NOT NULL,
      id_agente INTEGER,
      contenido TEXT NOT NULL,
      fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(id_ticket) REFERENCES tickets(id_ticket),
      FOREIGN KEY(id_agente) REFERENCES usuarios_staff(id_usuario)
    )`);

    // 5. Adjuntos (evidencias de usuario y agente)
    db.run(`CREATE TABLE IF NOT EXISTS adjuntos (
      id_adjunto INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ticket INTEGER NOT NULL,
      id_mensaje INTEGER,
      ruta_archivo TEXT NOT NULL,
      tipo_archivo TEXT,
      subido_por TEXT CHECK(subido_por IN ('usuario', 'agente')) NOT NULL,
      FOREIGN KEY(id_ticket) REFERENCES tickets(id_ticket),
      FOREIGN KEY(id_mensaje) REFERENCES mensajes_ticket(id_mensaje)
    )`, () => {
      console.log('Tablas inicializadas correctamente.');
    });
  });
}

module.exports = db;
