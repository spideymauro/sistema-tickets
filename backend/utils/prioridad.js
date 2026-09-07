// Prioridad base confirmada por categoría
const PRIORIDAD_BASE = {
  redes: 'alta',
  software: 'media',
  accesos: 'media',
  hardware: 'baja',
  solicitudes: 'baja',
  otro: 'baja',
};

// Palabras clave que indican afectación masiva (escalan a "urgente" sin importar la categoría)
const KEYWORDS_URGENTE = [
  'nadie',
  'todos',
  'oficina completa',
  'servidor caido',
  'servidor caído',
  'nadie puede',
  'sistema caido',
  'sistema caído',
];

function calcularPrioridad(categoria, mensaje = '') {
  const texto = mensaje.toLowerCase();
  const esMasivo = KEYWORDS_URGENTE.some((kw) => texto.includes(kw));

  if (esMasivo) return 'urgente';
  return PRIORIDAD_BASE[categoria] || 'baja';
}

module.exports = { calcularPrioridad };
