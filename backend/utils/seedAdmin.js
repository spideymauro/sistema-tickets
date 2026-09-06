const bcrypt = require('bcrypt');

const CORREO_ADMIN = 'maurocontrerasurrutia@gmail.com';
const PASSWORD_ADMIN = 'admin123'; // cámbiala después del primer login

// Crea el usuario admin si todavía no existe (INSERT OR IGNORE = seguro de correr varias veces)
function seedAdminIfNeeded(db) {
  bcrypt.hash(PASSWORD_ADMIN, 10, (err, hash) => {
    if (err) return console.error('Error al hashear password admin:', err.message);

    db.run(
      `INSERT OR IGNORE INTO usuarios_staff (correo, password_hash, rol, nombre)
       VALUES (?, ?, 'admin', 'Administrador')`,
      [CORREO_ADMIN, hash],
      function (err) {
        if (err) return console.error('Error al crear el admin:', err.message);
        if (this.changes > 0) {
          console.log(`Usuario admin creado: ${CORREO_ADMIN} / ${PASSWORD_ADMIN}`);
        } else {
          console.log('El usuario admin ya existía, no se creó de nuevo.');
        }
      }
    );
  });
}

module.exports = { seedAdminIfNeeded, CORREO_ADMIN };
