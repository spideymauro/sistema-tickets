'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../[folio]/consulta.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ConsultarTicket() {
  const [folio, setFolio] = useState('');
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
        body: JSON.stringify({ correo, folio: folio.trim().toUpperCase() }),
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
        <h1 className={styles.titulo}>Consulta tu ticket</h1>
        <p className={styles.subtitulo}>Ingresa tu correo y tu folio para ver el estado.</p>

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
              />
            </label>
            <label className={styles.etiqueta}>
              Folio
              <input
                className={styles.input}
                type="text"
                required
                placeholder="TCK-XXXXXX"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
              />
            </label>
            <button className={styles.boton} type="submit" disabled={cargando}>
              {cargando ? 'Consultando…' : 'Consultar'}
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

            <button className={styles.botonSecundario} onClick={() => setResultado(null)}>
              Consultar otro ticket
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
