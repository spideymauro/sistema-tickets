'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './BotWidget.module.css';
import { CATEGORIAS } from '../lib/categories';
import { buscarSugerencia, pareceProblemaDeSoporte } from '../lib/faq';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PASOS = {
  CATEGORIA: 'categoria',
  DESCRIBIR: 'describir',
  PENSANDO_IA: 'pensando_ia',
  PREGUNTA_SEGUIMIENTO: 'pregunta_seguimiento',
  CONFIRMAR_CATEGORIA: 'confirmar_categoria',
  FAQ: 'faq',
  NOMBRE: 'nombre',
  APELLIDO: 'apellido',
  CORREO: 'correo',
  CONFIRMAR_CORREO: 'confirmar_correo',
  SOLICITUD_EQUIPO: 'solicitud_equipo',
  EVIDENCIAS: 'evidencias',
  ENVIANDO: 'enviando',
  LISTO: 'listo',
  RESUELTO: 'resuelto',
  ERROR: 'error',
};

export default function BotWidget() {
  const [mensajes, setMensajes] = useState([
    { de: 'bot', texto: 'Hola 👋 soy el asistente de soporte. ¿En qué categoría entra tu problema?' },
  ]);
  const [paso, setPaso] = useState(PASOS.CATEGORIA);
  const [categoria, setCategoria] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [inputTexto, setInputTexto] = useState('');
  const [primerCorreo, setPrimerCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaSugerida, setCategoriaSugerida] = useState(null);
  const [sugerenciaPendiente, setSugerenciaPendiente] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [errorArchivos, setErrorArchivos] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [folioFinal, setFolioFinal] = useState(null);
  const finalRef = useRef(null);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, paso]);

  function agregarMensaje(de, texto) {
    setMensajes((prev) => [...prev, { de, texto }]);
  }

  function elegirCategoria(cat) {
    setCategoria(cat.value);
    agregarMensaje('usuario', cat.label);
    agregarMensaje('bot', 'Cuéntame brevemente qué está pasando.');
    setPaso(PASOS.DESCRIBIR);
  }

  function labelDeCategoria(valor) {
    const encontrada = CATEGORIAS.find((c) => c.value === valor);
    return encontrada ? encontrada.label : valor;
  }

  function continuarConSugerencia(sugerencia, categoriaEfectiva) {
    if (categoriaEfectiva === 'solicitudes') {
      // Una solicitud no se "resuelve" con un tip de sí/no; siempre se levanta el ticket
      agregarMensaje('bot', 'Entendido, vamos a levantar tu ticket. ¿Cuál es tu nombre completo?');
      setPaso(PASOS.NOMBRE);
      return;
    }
    if (sugerencia) {
      agregarMensaje('bot', `${sugerencia} ¿Esto resolvió tu problema?`);
      setPaso(PASOS.FAQ);
    } else {
      agregarMensaje('bot', 'Entendido, vamos a levantar tu ticket. ¿Cuál es tu nombre completo?');
      setPaso(PASOS.NOMBRE);
    }
  }

  async function consultarSugerenciaIA(cat, mensaje, permitirPregunta = true) {
    try {
      const resp = await fetch(`${API_URL}/api/sugerencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: cat, mensaje, permitirPregunta }),
      });
      if (!resp.ok) return null;
      return await resp.json(); // { categoriaDetectada, sugerencia, esSolicitudLegitima, preguntaSeguimiento }
    } catch {
      return null;
    }
  }

  function confirmarCategoria(cambiar) {
    const categoriaFinal = cambiar ? categoriaSugerida : categoria;
    if (cambiar) {
      agregarMensaje('usuario', 'Sí, cambiar');
      setCategoria(categoriaSugerida);
    } else {
      agregarMensaje('usuario', 'No, dejar como está');
    }
    const sugerenciaAUsar = sugerenciaPendiente;
    setCategoriaSugerida(null);
    setSugerenciaPendiente(null);
    continuarConSugerencia(sugerenciaAUsar, categoriaFinal);
  }

  async function enviarDescripcion(e) {
    e.preventDefault();
    const texto = inputTexto.trim();
    if (!texto) return;
    agregarMensaje('usuario', texto);
    setInputTexto('');

    if (!pareceProblemaDeSoporte(texto)) {
      agregarMensaje(
        'bot',
        'No logro identificar un problema o solicitud de soporte en tu mensaje. ¿Puedes contarme, con tus palabras, qué está fallando o qué necesitas?'
      );
      return; // se queda en el mismo paso, no avanza a pedir nombre/correo
    }

    setDescripcion(texto);

    // Primer intento: match instantáneo por palabras clave (sin costo, sin espera)
    const sugerenciaLocal = buscarSugerencia(categoria, texto);
    if (sugerenciaLocal) {
      agregarMensaje('bot', `${sugerenciaLocal} ¿Esto resolvió tu problema?`);
      setPaso(PASOS.FAQ);
      return;
    }

    // Segundo intento (único): la IA, solo si el match local no encontró nada
    setPaso(PASOS.PENSANDO_IA);
    const analisis = await consultarSugerenciaIA(categoria, texto);

    if (!analisis) {
      continuarConSugerencia(null, categoria);
      return;
    }

    if (analisis.esSolicitudLegitima === false) {
      agregarMensaje(
        'bot',
        'Tu mensaje parece incluir contenido que no está relacionado con un problema o solicitud real de soporte. ¿Puedes redactarlo de nuevo, enfocándote solo en el problema?'
      );
      return; // se queda en el mismo paso, no avanza a pedir nombre/correo
    }

    // Si el mensaje es muy vago, la IA pide un detalle más antes de decidir (solo una vez)
    if (analisis.preguntaSeguimiento) {
      agregarMensaje('bot', analisis.preguntaSeguimiento);
      setPaso(PASOS.PREGUNTA_SEGUIMIENTO);
      return;
    }

    // Si la IA detecta que la categoría real es otra distinta a la elegida, confirmamos antes de seguir
    if (analisis.categoriaDetectada && analisis.categoriaDetectada !== categoria) {
      setCategoriaSugerida(analisis.categoriaDetectada);
      setSugerenciaPendiente(analisis.sugerencia || null);
      agregarMensaje(
        'bot',
        `Esto parece más relacionado con "${labelDeCategoria(analisis.categoriaDetectada)}". ¿Cambiamos la categoría del ticket?`
      );
      setPaso(PASOS.CONFIRMAR_CATEGORIA);
      return;
    }

    continuarConSugerencia(analisis.sugerencia, categoria);
  }

  async function enviarRespuestaSeguimiento(e) {
    e.preventDefault();
    const respuesta = inputTexto.trim();
    if (!respuesta) return;
    agregarMensaje('usuario', respuesta);
    setInputTexto('');

    // Combinamos el mensaje original con el detalle adicional para darle a la IA el contexto completo
    const mensajeCombinado = `${descripcion} ${respuesta}`.trim();
    setDescripcion(mensajeCombinado);

    setPaso(PASOS.PENSANDO_IA);
    // Segunda ronda: permitirPregunta=false, ya no puede volver a preguntar, debe decidir
    const analisis = await consultarSugerenciaIA(categoria, mensajeCombinado, false);

    if (!analisis) {
      continuarConSugerencia(null, categoria);
      return;
    }

    if (analisis.esSolicitudLegitima === false) {
      agregarMensaje(
        'bot',
        'Sigo sin identificar un problema o solicitud de soporte claro. Empecemos de nuevo: ¿qué está fallando o qué necesitas?'
      );
      setPaso(PASOS.DESCRIBIR);
      return;
    }

    if (analisis.categoriaDetectada && analisis.categoriaDetectada !== categoria) {
      setCategoriaSugerida(analisis.categoriaDetectada);
      setSugerenciaPendiente(analisis.sugerencia || null);
      agregarMensaje(
        'bot',
        `Esto parece más relacionado con "${labelDeCategoria(analisis.categoriaDetectada)}". ¿Cambiamos la categoría del ticket?`
      );
      setPaso(PASOS.CONFIRMAR_CATEGORIA);
      return;
    }

    continuarConSugerencia(analisis.sugerencia, categoria);
  }

  function enviarNombre(e) {
    e.preventDefault();
    const valor = inputTexto.trim();
    if (!valor) return;
    agregarMensaje('usuario', valor);
    setInputTexto('');

    const tieneMasDeUnaPalabra = valor.trim().split(/\s+/).length > 1;
    if (!tieneMasDeUnaPalabra) {
      setNombre(valor);
      agregarMensaje('bot', '¿Cuál es tu apellido?');
      setPaso(PASOS.APELLIDO);
      return;
    }

    setNombre(valor);
    agregarMensaje('bot', '¿Cuál es tu correo?');
    setPaso(PASOS.CORREO);
  }

  function enviarApellido(e) {
    e.preventDefault();
    const valor = inputTexto.trim();
    if (!valor) return;
    agregarMensaje('usuario', valor);
    setNombre((prev) => `${prev} ${valor}`.trim());
    agregarMensaje('bot', '¿Cuál es tu correo?');
    setInputTexto('');
    setPaso(PASOS.CORREO);
  }

  function responderFaq(resuelto) {
    if (resuelto) {
      agregarMensaje('usuario', 'Sí, gracias');
      agregarMensaje('bot', 'Me da gusto poder ayudarte. Si necesitas algo más, aquí estaré.');
      setPaso(PASOS.RESUELTO);
    } else {
      agregarMensaje('usuario', 'No, sigue igual');
      agregarMensaje('bot', 'Entendido, vamos a levantar tu ticket. ¿Cuál es tu nombre completo?');
      setPaso(PASOS.NOMBRE);
    }
  }

  function enviarCorreo(e) {
    e.preventDefault();
    const correo = inputTexto.trim();
    if (!correo || !correo.includes('@')) return;
    setPrimerCorreo(correo);
    agregarMensaje('usuario', correo);
    agregarMensaje('bot', 'Para confirmar, ¿me lo repites una vez más?');
    setInputTexto('');
    setPaso(PASOS.CONFIRMAR_CORREO);
  }

  function confirmarCorreo(e) {
    e.preventDefault();
    const correo = inputTexto.trim();
    if (!correo) return;
    agregarMensaje('usuario', correo);

    if (correo !== primerCorreo) {
      agregarMensaje('bot', 'Los correos no coinciden. Escribamos tu correo de nuevo, con calma.');
      setPrimerCorreo('');
      setInputTexto('');
      setPaso(PASOS.CORREO);
      return;
    }

    setInputTexto('');

    if (categoria === 'solicitudes') {
      agregarMensaje(
        'bot',
        'Correo confirmado ✅ Para tu solicitud, ¿tienes fotos del equipo dañado o anterior?'
      );
      setPaso(PASOS.SOLICITUD_EQUIPO);
    } else {
      agregarMensaje(
        'bot',
        'Correo confirmado ✅ ¿Quieres adjuntar alguna captura o foto? Hasta 3 archivos, máximo 5MB cada uno (opcional).'
      );
      setPaso(PASOS.EVIDENCIAS);
    }
  }

  function manejarArchivos(e) {
    const seleccionados = Array.from(e.target.files || []);
    if (seleccionados.length > 3) {
      setErrorArchivos('Solo puedes adjuntar hasta 3 archivos.');
      return;
    }
    const muyPesado = seleccionados.find((f) => f.size > 5 * 1024 * 1024);
    if (muyPesado) {
      setErrorArchivos(`El archivo "${muyPesado.name}" pesa más de 5MB.`);
      return;
    }
    setErrorArchivos('');
    setArchivos(seleccionados);
  }

  async function crearTicket() {
    setPaso(PASOS.ENVIANDO);
    setErrorEnvio('');

    const formData = new FormData();
    formData.append('correo', primerCorreo);
    formData.append('nombre', nombre);
    formData.append('categoria', categoria);
    formData.append('mensaje', descripcion);
    archivos.forEach((archivo) => formData.append('adjuntos', archivo));

    try {
      const resp = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'No se pudo crear el ticket');
      }

      setFolioFinal(data.folio);
      agregarMensaje('bot', '¡Listo! Tu ticket fue creado correctamente.');
      setPaso(PASOS.LISTO);
    } catch (err) {
      setErrorEnvio(err.message || 'Ocurrió un error al enviar tu ticket. Intenta de nuevo.');
      setPaso(PASOS.EVIDENCIAS);
    }
  }

  function levantarOtroTicket() {
    setMensajes([
      { de: 'bot', texto: 'Hola 👋 soy el asistente de soporte. ¿En qué categoría entra tu problema?' },
    ]);
    setPaso(PASOS.CATEGORIA);
    setCategoria(null);
    setDescripcion('');
    setInputTexto('');
    setPrimerCorreo('');
    setNombre('');
    setCategoriaSugerida(null);
    setSugerenciaPendiente(null);
    setArchivos([]);
    setErrorArchivos('');
    setErrorEnvio('');
    setFolioFinal(null);
  }

  return (
    <div className={styles.widget}>
      <header className={styles.encabezado}>
        <div className={styles.avatar} aria-hidden="true">
          🎧
        </div>
        <div>
          <p className={styles.nombreBot}>Soporte Interno</p>
          <p className={styles.estadoBot}>Asistente virtual</p>
        </div>
      </header>

      <div className={styles.transcripcion}>
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={m.de === 'bot' ? styles.burbujaBot : styles.burbujaUsuario}
          >
            {m.texto}
          </div>
        ))}

        {paso === PASOS.LISTO && folioFinal && (
          <div className={styles.talonFolio}>
            <p className={styles.talonEtiqueta}>Ticket creado</p>
            <p className={styles.talonFolioTexto}>{folioFinal}</p>
            <p className={styles.talonAyuda}>
              Guarda este folio junto con tu correo para consultarlo después.
            </p>
          </div>
        )}

        <div ref={finalRef} />
      </div>

      <div className={styles.controles}>
        {paso === PASOS.CATEGORIA && (
          <div className={styles.opciones}>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.value}
                className={styles.botonOpcion}
                onClick={() => elegirCategoria(cat)}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {paso === PASOS.DESCRIBIR && (
          <form className={styles.formInput} onSubmit={enviarDescripcion}>
            <input
              className={styles.input}
              type="text"
              placeholder="Describe brevemente el problema"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Enviar
            </button>
          </form>
        )}

        {paso === PASOS.PENSANDO_IA && (
          <p className={styles.notaArchivos}>Un momento, estoy revisando tu caso…</p>
        )}

        {paso === PASOS.PREGUNTA_SEGUIMIENTO && (
          <form className={styles.formInput} onSubmit={enviarRespuestaSeguimiento}>
            <input
              className={styles.input}
              type="text"
              placeholder="Escribe el detalle que te pidió"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Enviar
            </button>
          </form>
        )}

        {paso === PASOS.CONFIRMAR_CATEGORIA && (
          <div className={styles.opciones}>
            <button
              className={styles.botonOpcion}
              onClick={() => confirmarCategoria(true)}
              type="button"
            >
              Sí, cambiar categoría
            </button>
            <button
              className={styles.botonOpcion}
              onClick={() => confirmarCategoria(false)}
              type="button"
            >
              No, dejar como está
            </button>
          </div>
        )}

        {paso === PASOS.FAQ && (
          <div className={styles.opciones}>
            <button className={styles.botonOpcion} onClick={() => responderFaq(true)} type="button">
              Sí, gracias
            </button>
            <button className={styles.botonOpcion} onClick={() => responderFaq(false)} type="button">
              No, sigue igual
            </button>
          </div>
        )}

        {paso === PASOS.NOMBRE && (
          <form className={styles.formInput} onSubmit={enviarNombre}>
            <input
              className={styles.input}
              type="text"
              placeholder="Tu nombre"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Enviar
            </button>
          </form>
        )}

        {paso === PASOS.APELLIDO && (
          <form className={styles.formInput} onSubmit={enviarApellido}>
            <input
              className={styles.input}
              type="text"
              placeholder="Tu apellido"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Enviar
            </button>
          </form>
        )}

        {paso === PASOS.CORREO && (
          <form className={styles.formInput} onSubmit={enviarCorreo}>
            <input
              className={styles.input}
              type="email"
              placeholder="tu.correo@empresa.com"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Enviar
            </button>
          </form>
        )}

        {paso === PASOS.CONFIRMAR_CORREO && (
          <form className={styles.formInput} onSubmit={confirmarCorreo}>
            <input
              className={styles.input}
              type="email"
              placeholder="Confirma tu correo"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              autoFocus
            />
            <button className={styles.botonEnviar} type="submit">
              Confirmar
            </button>
          </form>
        )}

        {paso === PASOS.SOLICITUD_EQUIPO && (
          <div className={styles.opciones}>
            <button
              className={styles.botonOpcion}
              onClick={() => setPaso(PASOS.EVIDENCIAS)}
              type="button"
            >
              Subir foto del equipo dañado
            </button>
            <button className={styles.botonOpcion} onClick={crearTicket} type="button">
              No tengo un equipo anterior
            </button>
          </div>
        )}

        {paso === PASOS.EVIDENCIAS && (
          <div className={styles.evidencias}>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={manejarArchivos}
              className={styles.inputArchivo}
            />
            {archivos.length > 0 && (
              <p className={styles.notaArchivos}>{archivos.length} archivo(s) listo(s)</p>
            )}
            {errorArchivos && <p className={styles.textoError}>{errorArchivos}</p>}
            {errorEnvio && <p className={styles.textoError}>{errorEnvio}</p>}
            <div className={styles.opciones}>
              <button className={styles.botonOpcion} onClick={crearTicket} type="button">
                Enviar y crear ticket
              </button>
            </div>
          </div>
        )}

        {paso === PASOS.ENVIANDO && <p className={styles.notaArchivos}>Creando tu ticket…</p>}

        {paso === PASOS.LISTO && (
          <div className={styles.opciones}>
            <button className={styles.botonOpcion} onClick={levantarOtroTicket} type="button">
              Levantar otro ticket
            </button>
          </div>
        )}

        {paso === PASOS.RESUELTO && (
          <div className={styles.opciones}>
            <button className={styles.botonOpcion} onClick={levantarOtroTicket} type="button">
              Levantar otro ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
