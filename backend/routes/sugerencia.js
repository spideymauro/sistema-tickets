const express = require('express');
const { analizarConIA } = require('../utils/gemini');

const router = express.Router();

const CATEGORIAS_VALIDAS = ['hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro'];

router.post('/', async (req, res) => {
  const { categoria, mensaje } = req.body;

  if (!categoria || !mensaje) {
    return res.status(400).json({ error: 'categoria y mensaje son requeridos' });
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }

  const analisis = await analizarConIA(categoria, mensaje);

  if (!analisis) {
    return res.json({ categoriaDetectada: null, sugerencia: null });
  }

  res.json(analisis);
});

module.exports = router;
