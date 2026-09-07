const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Nombre aleatorio: nunca usamos el nombre original (evita path traversal / colisiones)
    const nombreUnico = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, nombreUnico);
  },
});

const TIPOS_USUARIO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TIPOS_AGENTE = [...TIPOS_USUARIO, 'video/mp4', 'video/webm'];

function filtroTipos(tiposPermitidos) {
  return (req, file, cb) => {
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  };
}

// Usuario público: hasta 3 archivos, 5MB cada uno, solo imágenes/PDF
const uploadUsuario = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: filtroTipos(TIPOS_USUARIO),
});

// Agente de soporte: límite ampliado, incluye video
const uploadAgente = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: filtroTipos(TIPOS_AGENTE),
});

module.exports = { uploadUsuario, uploadAgente, UPLOAD_DIR };
