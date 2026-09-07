// Análisis de "primer auxilio" vía IA (Gemini). Nunca debe bloquear la creación
// del ticket: cualquier error, timeout, o respuesta ambigua/inválida se traduce en
// `null`, y el flujo normal de creación de ticket continúa como si la IA no existiera.
const MODELO = 'gemini-2.5-flash';
const TIMEOUT_MS = 8000;

const CATEGORIAS_VALIDAS = ['hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro'];

function construirPrompt(categoria, mensaje) {
  return `Eres un asistente de soporte técnico interno de primer nivel para una empresa.

Las categorías válidas son EXACTAMENTE estas (usa el valor entre paréntesis, en minúsculas):
- Hardware / Equipo (hardware)
- Redes e Internet (redes)
- Software y Sistemas (software)
- Accesos y Cuentas (accesos)
- Solicitudes de equipo o licencias (solicitudes)
- Otro / General (otro)

Un empleado eligió la categoría "${categoria}" y escribió este mensaje:
"${mensaje}"

Analiza el mensaje y responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin
markdown, sin explicaciones) con este formato exacto:

{"categoria_detectada": "<la categoría de la lista de arriba que mejor corresponde al mensaje, sin importar cuál eligió el usuario>", "sugerencia": "<una sugerencia breve, concreta y confiable en español, máximo 2 oraciones, para que el usuario resuelva esto por su cuenta, o null si no tienes una sugerencia confiable y específica>"}`;
}

async function analizarConIA(categoria, mensaje) {
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
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
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
    if (!texto) return null;

    let analisis;
    try {
      analisis = JSON.parse(texto);
    } catch (errParseo) {
      console.error('No se pudo interpretar el JSON de Gemini:', texto);
      return null;
    }

    const categoriaDetectada = CATEGORIAS_VALIDAS.includes(analisis.categoria_detectada)
      ? analisis.categoria_detectada
      : categoria; // si la IA devuelve algo inválido, no corregimos la categoría

    const sugerencia =
      analisis.sugerencia && analisis.sugerencia !== 'null' ? String(analisis.sugerencia).trim() : null;

    return { categoriaDetectada, sugerencia };
  } catch (err) {
    console.error('Error al consultar Gemini:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { analizarConIA };
