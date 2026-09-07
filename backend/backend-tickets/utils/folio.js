// Genera un folio no secuencial, ej. TCK-4F7K9C
// Excluye caracteres ambiguos: 0/O, 1/I/L
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarFolio(longitud = 6) {
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    const indice = Math.floor(Math.random() * ALFABETO.length);
    codigo += ALFABETO[indice];
  }
  return `TCK-${codigo}`;
}

// Genera un folio verificando que no exista ya en la tabla tickets
function generarFolioUnico(db) {
  return new Promise((resolve, reject) => {
    const intentar = () => {
      const folio = generarFolio();
      db.get('SELECT 1 FROM tickets WHERE folio = ?', [folio], (err, row) => {
        if (err) return reject(err);
        if (row) return intentar(); // colisión (muy poco probable), reintenta
        resolve(folio);
      });
    };
    intentar();
  });
}

module.exports = { generarFolio, generarFolioUnico };
