// Análisis de "primer auxilio" vía IA (Gemini). Nunca debe bloquear la creación
// del ticket: cualquier error, timeout, o respuesta ambigua/inválida se traduce en
// `null`, y el flujo normal de creación de ticket continúa como si la IA no existiera.
const MODELO = 'gemini-2.5-flash';
const TIMEOUT_MS = 8000;

const CATEGORIAS_VALIDAS = ['hardware', 'redes', 'software', 'accesos', 'solicitudes', 'otro'];

function construirPrompt(categoria, mensaje, permitirPregunta) {
  const instruccionPregunta = permitirPregunta
    ? `Si el mensaje es demasiado vago o genérico para dar una sugerencia confiable o clasificar
bien el caso (por ejemplo, "mi computadora no enciende" sin más contexto, cuando podría ser algo
tan simple como que no está enchufada), en vez de adivinar, formula UNA sola pregunta breve y
concreta pidiendo el detalle mínimo que falta, y ponla en el campo "pregunta_seguimiento". En ese
caso deja "sugerencia" en null.`
    : `NO hagas ninguna pregunta de seguimiento en esta respuesta, sin importar qué tan vago siga
siendo el mensaje: ya tuviste tu oportunidad de preguntar. Decide con la información disponible:
da una sugerencia si es posible, o dejarla en null si no la tienes. El campo "pregunta_seguimiento"
debe ser SIEMPRE null en esta respuesta.`;

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

Primero evalúa si el mensaje, en su conjunto, describe genuinamente un problema o solicitud
real de soporte técnico/administrativo de trabajo. Si el mensaje mezcla una parte relevante
con contenido claramente ajeno al trabajo (chistes, temas personales, peticiones absurdas,
o cualquier cosa sin relación con un problema o solicitud real), NO se considera legítimo,
aunque mencione alguna palabra técnica de pasada.

${instruccionPregunta}

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin explicaciones)
con este formato exacto:

{"es_solicitud_legitima": <true o false>, "categoria_detectada": "<la categoría de la lista de arriba que mejor corresponde, o la misma que eligió el usuario si es_solicitud_legitima es false>", "pregunta_seguimiento": "<una pregunta breve en español para pedir más detalle, o null>", "sugerencia": "<una sugerencia breve, concreta y confiable en español, máximo 2 oraciones, para que el usuario resuelva esto por su cuenta, o null si no tienes una sugerencia confiable, específica, si hay pregunta_seguimiento, o si es_solicitud_legitima es false>"}`;
}

async function analizarConIA(categoria, mensaje, permitirPregunta = true) {
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
          contents: [{ parts: [{ text: construirPrompt(categoria, mensaje, permitirPregunta) }] }],
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

    // Si no se permite preguntar (segunda ronda), ignoramos este campo aunque la IA lo devuelva
    const preguntaSeguimiento =
      permitirPregunta && analisis.pregunta_seguimiento && analisis.pregunta_seguimiento !== 'null'
        ? String(analisis.pregunta_seguimiento).trim()
        : null;

    // Si el campo no viene o no es booleano, asumimos legítimo (nunca bloqueamos por un campo faltante)
    const esSolicitudLegitima =
      typeof analisis.es_solicitud_legitima === 'boolean' ? analisis.es_solicitud_legitima : true;

    return { categoriaDetectada, sugerencia, esSolicitudLegitima, preguntaSeguimiento };
  } catch (err) {
    console.error('Error al consultar Gemini:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { analizarConIA };
