const express = require('express');
const { obtenerSugerenciaIA } = require('../utils/gemini');

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

  const sugerencia = await obtenerSugerenciaIA(categoria, mensaje);
  res.json({ sugerencia });
});

module.exports = router;
