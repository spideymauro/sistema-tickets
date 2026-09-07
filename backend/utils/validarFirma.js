const fs = require('fs');

// Firmas conocidas (magic numbers) de los tipos que sí validamos estrictamente.
// Los tipos que no están aquí (ej. video, que usan los agentes) no se bloquean por firma.
const FIRMAS = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // "%PDF"
};

function leerPrimerosBytes(ruta, cantidad) {
  const fd = fs.openSync(ruta, 'r');
  const buffer = Buffer.alloc(cantidad);
  fs.readSync(fd, buffer, 0, cantidad, 0);
  fs.closeSync(fd);
  return buffer;
}

function coincideFirma(buffer, firma) {
  return firma.every((byte, i) => buffer[i] === byte);
}

// Devuelve true si el contenido real del archivo coincide con lo que dice ser.
// Nunca confía en la extensión del nombre ni en el mimetype declarado por el cliente.
function esFirmaValida(ruta, mimetypeDeclarado) {
  try {
    const buffer = leerPrimerosBytes(ruta, 12);

    if (mimetypeDeclarado === 'image/webp') {
      const esRiff = coincideFirma(buffer, [0x52, 0x49, 0x46, 0x46]); // "RIFF"
      const esWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
      return esRiff && esWebp;
    }

    const firmas = FIRMAS[mimetypeDeclarado];
    if (!firmas) return true; // tipo sin firma conocida (ej. video de agente): no lo bloqueamos aquí

    return firmas.some((firma) => coincideFirma(buffer, firma));
  } catch (err) {
    return false; // si no se pudo ni leer el archivo, lo tratamos como inválido
  }
}

module.exports = { esFirmaValida };
