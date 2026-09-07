'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './consulta.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ConsultarTicketPorFolio() {
  const params = useParams();
  const folio = decodeURIComponent(params.folio || '');
  const [correo, setCorreo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function consultar(e) {
    e.preventDefault();
    setError('');
    setResultado(null);
    setCargando(true);

    try {
      const resp = await fetch(`${API_URL}/api/tickets/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, folio }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'No se encontró el ticket');
      }
      setResultado(data);
    } catch (err) {
      setError(err.message || 'No se encontró el ticket con esos datos');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={styles.contenedor}>
      <div className={styles.tarjeta}>
        <Link href="/" className={styles.enlaceVolver}>
          ← Volver al inicio
        </Link>
        <h1 className={styles.titulo}>Ticket {folio}</h1>
        <p className={styles.subtitulo}>Ingresa el correo con el que lo creaste para verlo.</p>

        {!resultado && (
          <form className={styles.formulario} onSubmit={consultar}>
            <label className={styles.etiqueta}>
              Correo
              <input
                className={styles.input}
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoFocus
              />
            </label>
            <button className={styles.boton} type="submit" disabled={cargando}>
              {cargando ? 'Consultando…' : 'Ver mi ticket'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </form>
        )}

        {resultado && (
          <div className={styles.resultado}>
            <div className={styles.encabezadoResultado}>
              <span className={styles.folioTexto}>{resultado.folio}</span>
              <span className={styles.estadoPill}>{resultado.estado}</span>
            </div>
            <p className={styles.categoriaTexto}>Categoría: {resultado.categoria}</p>

            <div className={styles.hilo}>
              {resultado.mensajes.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.tipo_remitente === 'usuario' ? styles.mensajeUsuario : styles.mensajeAgente
                  }
                >
                  <p className={styles.mensajeTexto}>{m.contenido}</p>
                  <span className={styles.mensajeFecha}>{m.fecha_envio}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
