// Dispara un evento a n8n para que envíe el correo correspondiente.
// No bloquea la respuesta al usuario: si falla o si N8N_WEBHOOK_URL no está
// configurado todavía, simplemente no hace nada (no rompe la creación del ticket).
function notificarN8n(evento, datos) {
  const url = process.env.N8N_WEBHOOK_URL;
  const secreto = process.env.N8N_WEBHOOK_SECRET;

  if (!url) return; // n8n aún no está desplegado/configurado

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secreto || '',
    },
    body: JSON.stringify({ evento, ...datos }),
  }).catch((err) => {
    console.error('Error al notificar a n8n:', err.message);
  });
}

module.exports = { notificarN8n };
