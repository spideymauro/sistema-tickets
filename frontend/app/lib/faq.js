// Bot simple basado en palabras clave (sin librerías de NLP, tal como se acordó).
// Si ninguna palabra clave coincide, o la categoría no tiene tip, se salta directo a pedir el correo.
export const FAQS = {
  hardware: {
    keywords: ['no prende', 'no enciende', 'pantalla', 'no imprime', 'impresora', 'ruido'],
    tip: 'Verifica que los cables de corriente estén bien conectados y que el contacto tenga energía. Si es una impresora, revisa que tenga papel y tóner o tinta.',
  },
  redes: {
    keywords: ['internet', 'wifi', 'red', 'conexion', 'conexión', 'vpn', 'lento'],
    tip: 'Intenta reiniciar el router (desconéctalo 10 segundos) y verifica que el modo avión esté apagado en tu equipo.',
  },
  software: {
    keywords: ['error', 'no abre', 'lento', 'lentitud', 'no funciona', 'se cierra'],
    tip: 'Intenta cerrar por completo el programa y volver a abrirlo. Si el error persiste, reinicia tu equipo.',
  },
  accesos: {
    keywords: ['contraseña', 'password', 'no puedo entrar', 'bloqueado', 'bloqueo', 'olvide'],
    tip: 'Verifica que Bloq Mayús esté desactivado y que estés usando tu correo completo como usuario.',
  },
  solicitudes: {
    keywords: [],
    tip: null,
  },
  otro: {
    keywords: [],
    tip: null,
  },
};

export function buscarSugerencia(categoria, mensaje) {
  const faq = FAQS[categoria];
  if (!faq || !faq.tip) return null;
  const texto = mensaje.toLowerCase();
  const coincide = faq.keywords.some((kw) => texto.includes(kw));
  return coincide ? faq.tip : null;
}
