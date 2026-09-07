const express = require('express');
const cors = require('cors');
const db = require('./database');
const { seedAdminIfNeeded } = require('./utils/seedAdmin');

const app = express();
const PORT = process.env.PORT || 3001;

const ORIGENES_PERMITIDOS = [
  'https://sistema-tickets-eosin.vercel.app',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (ej. curl, Postman) y las de la lista
      if (!origin || ORIGENES_PERMITIDOS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origen no permitido por CORS'));
      }
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pequeño delay para asegurar que las tablas ya se inicializaron antes de sembrar el admin
setTimeout(() => seedAdminIfNeeded(db), 800);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API de tickets funcionando' });
});

app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/adjuntos', require('./routes/adjuntos'));
app.use('/api/sugerencia', require('./routes/sugerencia'));

// Manejo de errores de multer (archivo muy grande, tipo no permitido, etc.)
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Error al procesar la solicitud' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
