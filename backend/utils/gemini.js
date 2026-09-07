// Sugerencia de "primer auxilio" vía IA (Gemini). Nunca debe bloquear la creación
// del ticket: cualquier error, timeout, o respuesta ambigua se traduce en `null`,
// y el flujo normal de creación de ticket continúa como si la IA no existiera.
const MODELO = 'gemini-2.5-flash';
const TIMEOUT_MS = 8000;

function construirPrompt(categoria, mensaje) {
  return `Eres un asistente de soporte técnico interno de primer nivel para una empresa.
Un empleado reportó lo siguiente:

Categoría: ${categoria}
Mensaje: "${mensaje}"

Si puedes dar una sugerencia breve, concreta y confiable para que la persona resuelva esto
por su cuenta (sin necesidad de un agente humano), respóndela en español, en máximo 2 oraciones,
tono cordial y directo.

Si el mensaje no describe un problema o solicitud real de soporte, o no tienes una sugerencia
confiable y específica para este caso, responde EXACTAMENTE y ÚNICAMENTE con: NO_RESUELVE`;
}

async function obtenerSugerenciaIA(categoria, mensaje) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null; // IA no configurada todavía; no es un error, solo se omite

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPrompt(categoria, mensaje) }] }],
          generationConfig: {
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 }, // desactiva el "pensamiento" extendido, prioriza velocidad
          },
        }),
      }
    );

    if (!resp.ok) {
      const cuerpoError = await resp.text();
      console.error('Gemini respondió con error HTTP:', resp.status, cuerpoError);
      return null;
    }

    const data = await resp.json();

    if (data.error) {
      console.error('Gemini devolvió un error:', data.error.message);
      return null;
    }

    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!texto || texto.includes('NO_RESUELVE')) {
      return null;
    }

    return texto;
  } catch (err) {
    console.error('Error al consultar Gemini:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { obtenerSugerenciaIA };
