const express = require('express');
const { analizarConIA } = require('../utils/gemini');

const router = express.Router();

const CATEGORIAS_VALIDAS = ['hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro'];

router.post('/', async (req, res) => {
  const { categoria, mensaje, permitirPregunta } = req.body;

  if (!categoria || !mensaje) {
    return res.status(400).json({ error: 'categoria y mensaje son requeridos' });
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }

  // Por default se permite una pregunta de seguimiento, salvo que el frontend indique lo contrario
  const analisis = await analizarConIA(categoria, mensaje, permitirPregunta !== false);

  if (!analisis) {
    return res.json({ categoriaDetectada: null, sugerencia: null, preguntaSeguimiento: null });
  }

  res.json(analisis);
});

module.exports = router;
