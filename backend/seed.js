// Ejecutar una sola vez de forma local: node seed.js
// (En producción esto ya no es necesario, el servidor lo hace solo al arrancar)
const db = require('./database');
const { seedAdminIfNeeded } = require('./utils/seedAdmin');

setTimeout(() => {
  seedAdminIfNeeded(db);
  setTimeout(() => process.exit(0), 500);
}, 500);
