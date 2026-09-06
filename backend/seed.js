// Ejecutar una sola vez: node seed.js
const bcrypt = require('bcrypt');
const db = require('./database');

const CORREO_ADMIN = 'maurocontrerasurrutia@gmail.com';
const PASSWORD_ADMIN = 'admin123'; // cámbiala después del primer login

setTimeout(() => {
  bcrypt.hash(PASSWORD_ADMIN, 10, (err, hash) => {
    if (err) throw err;

    db.run(
      `INSERT OR IGNORE INTO usuarios_staff (correo, password_hash, rol, nombre)
       VALUES (?, ?, 'admin', 'Administrador')`,
      [CORREO_ADMIN, hash],
      function (err) {
        if (err) return console.error('Error al crear el admin:', err.message);
        if (this.changes === 0) {
          console.log('El usuario admin ya existía, no se creó de nuevo.');
        } else {
          console.log(`Usuario admin creado: ${CORREO_ADMIN} / ${PASSWORD_ADMIN}`);
        }
        process.exit(0);
      }
    );
  });
}, 500); // pequeño delay para asegurar que las tablas ya se inicializaron
