'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './detalle.module.css';
import { obtenerSesion, cerrarSesion } from '../../../lib/auth';
import NavAdmin from '../../components/NavAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ESTADOS = ['nuevo', 'en_proceso', 'pendiente', 'resuelto', 'cerrado'];

export default function DetalleTicket() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [sesion, setSesion] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [respuesta, setRespuesta] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  const cargarTicket = useCallback(
    async (token) => {
      setCargando(true);
      setError('');
      try {
        const resp = await fetch(`${API_URL}/api/admin/tickets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.status === 401 || resp.status === 403) {
          cerrarSesion();
          router.push('/admin/login');
          return;
        }
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'No se pudo cargar el ticket');
        setTicket(data);
      } catch (err) {
        setError(err.message || 'No se pudo cargar el ticket');
      } finally {
        setCargando(false);
      }
    },
    [id, router]
  );

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push('/admin/login');
      return;
    }
    setSesion(s);
    cargarTicket(s.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function asignarme() {
    const resp = await fetch(`${API_URL}/api/admin/tickets/${id}/asignar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
    if (resp.ok) cargarTicket(sesion.token);
  }

  async function cambiarEstado(nuevoEstado) {
    const resp = await fetch(`${API_URL}/api/admin/tickets/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sesion.token}`,
      },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (resp.ok) cargarTicket(sesion.token);
  }

  async function enviarRespuesta(e) {
    e.preventDefault();
    if (!respuesta.trim()) return;
    setEnviando(true);
    setErrorEnvio('');

    const formData = new FormData();
    formData.append('contenido', respuesta.trim());
    archivos.forEach((a) => formData.append('adjuntos', a));

    try {
      const resp = await fetch(`${API_URL}/api/admin/tickets/${id}/mensajes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sesion.token}` },
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo enviar la respuesta');
      setRespuesta('');
      setArchivos([]);
      cargarTicket(sesion.token);
    } catch (err) {
      setErrorEnvio(err.message || 'No se pudo enviar la respuesta');
    } finally {
      setEnviando(false);
    }
  }

  function urlDescarga(adjunto) {
    if (!ticket) return '#';
    const params = new URLSearchParams({ correo: ticket.correo, folio: ticket.folio });
    return `${API_URL}/api/adjuntos/${adjunto.id_adjunto}/descargar?${params.toString()}`;
  }

  if (cargando)
    return (
      <>
        <NavAdmin usuario={sesion?.usuario} />
        <main className={styles.contenedor}>
          <p className={styles.nota}>Cargando…</p>
        </main>
      </>
    );
  if (error)
    return (
      <>
        <NavAdmin usuario={sesion?.usuario} />
        <main className={styles.contenedor}>
          <p className={styles.error}>{error}</p>
        </main>
      </>
    );
  if (!ticket) return null;

  return (
    <>
      <NavAdmin usuario={sesion?.usuario} />
      <main className={styles.contenedor}>
        <button className={styles.volver} onClick={() => router.push('/admin/dashboard')}>
          ← Volver al panel
        </button>

        <div className={styles.encabezado}>
          <div>
            <h1 className={styles.folio}>{ticket.folio}</h1>
            <p className={styles.metaInfo}>
            {ticket.nombre} · {ticket.correo} · <span className={styles.capitalize}>{ticket.categoria}</span>
          </p>
        </div>
        <span className={`${styles.prioridadPill} ${styles['prioridad_' + ticket.prioridad]}`}>
          {ticket.prioridad}
        </span>
      </div>

      <div className={styles.acciones}>
        {!ticket.id_agente && (
          <button className={styles.botonSecundario} onClick={asignarme}>
            Asignarme
          </button>
        )}
        <select
          className={styles.select}
          value={ticket.estado}
          onChange={(e) => cambiarEstado(e.target.value)}
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.hilo}>
        {ticket.mensajes.map((m) => (
          <div
            key={m.id_mensaje}
            className={m.tipo_remitente === 'agente' ? styles.mensajeAgente : styles.mensajeUsuario}
          >
            <p className={styles.mensajeRemitente}>
              {m.tipo_remitente === 'agente' ? 'Agente' : 'Usuario'}
            </p>
            <p className={styles.mensajeTexto}>{m.contenido}</p>
            {ticket.adjuntos
              .filter((a) => a.id_mensaje === m.id_mensaje)
              .map((a) => (
                <a
                  key={a.id_adjunto}
                  href={urlDescarga(a)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.adjuntoLink}
                >
                  📎 Ver adjunto ({a.tipo_archivo})
                </a>
              ))}
            <span className={styles.mensajeFecha}>{m.fecha_envio}</span>
          </div>
        ))}
      </div>

      <form className={styles.formRespuesta} onSubmit={enviarRespuesta}>
        <textarea
          className={styles.textarea}
          placeholder="Escribe tu respuesta al usuario…"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
        />
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf,video/mp4,video/webm"
          onChange={(e) => setArchivos(Array.from(e.target.files || []))}
          className={styles.inputArchivo}
        />
        {errorEnvio && <p className={styles.error}>{errorEnvio}</p>}
        <button className={styles.boton} type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar respuesta'}
        </button>
      </form>
      </main>
    </>
  );
}
