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
  FAQ: 'faq',
  NOMBRE: 'nombre',
  CORREO: 'correo',
  CONFIRMAR_CORREO: 'confirmar_correo',
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

  async function consultarSugerenciaIA(cat, mensaje) {
    try {
      const resp = await fetch(`${API_URL}/api/sugerencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: cat, mensaje }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.sugerencia || null;
    } catch {
      return null;
    }
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
    const sugerenciaIA = await consultarSugerenciaIA(categoria, texto);

    if (sugerenciaIA) {
      agregarMensaje('bot', `${sugerenciaIA} ¿Esto resolvió tu problema?`);
      setPaso(PASOS.FAQ);
    } else {
      agregarMensaje('bot', 'Entendido, vamos a levantar tu ticket. ¿Cómo te llamas?');
      setPaso(PASOS.NOMBRE);
    }
  }

  function enviarNombre(e) {
    e.preventDefault();
    const valor = inputTexto.trim();
    if (!valor) return;
    setNombre(valor);
    agregarMensaje('usuario', valor);
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
      agregarMensaje('bot', 'Entendido, vamos a levantar tu ticket. ¿Cómo te llamas?');
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

    agregarMensaje(
      'bot',
      'Correo confirmado ✅ ¿Quieres adjuntar alguna captura o foto? Hasta 3 archivos, máximo 5MB cada uno (opcional).'
    );
    setInputTexto('');
    setPaso(PASOS.EVIDENCIAS);
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
