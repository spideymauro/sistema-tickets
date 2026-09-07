'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { obtenerSesion, cerrarSesion } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ESTADOS = ['nuevo', 'en_proceso', 'pendiente', 'resuelto', 'cerrado'];
const PRIORIDADES = ['urgente', 'alta', 'media', 'baja'];

export default function Dashboard() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarTickets = useCallback(
    async (token) => {
      setCargando(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (filtroEstado) params.append('estado', filtroEstado);
        if (filtroPrioridad) params.append('prioridad', filtroPrioridad);

        const resp = await fetch(`${API_URL}/api/admin/tickets?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (resp.status === 401 || resp.status === 403) {
          cerrarSesion();
          router.push('/admin/login');
          return;
        }

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Error al cargar tickets');
        setTickets(data.tickets);
      } catch (err) {
        setError(err.message || 'Error al cargar tickets');
      } finally {
        setCargando(false);
      }
    },
    [filtroEstado, filtroPrioridad, router]
  );

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push('/admin/login');
      return;
    }
    setSesion(s);
    cargarTickets(s.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroPrioridad]);

  function salir() {
    cerrarSesion();
    router.push('/admin/login');
  }

  return (
    <main className={styles.contenedor}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Panel de soporte</h1>
          {sesion?.usuario && (
            <p className={styles.subtitulo}>
              {sesion.usuario.nombre} · {sesion.usuario.rol}
            </p>
          )}
        </div>
        <button className={styles.botonSalir} onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <div className={styles.filtros}>
        <select
          className={styles.select}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace('_', ' ')}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
        >
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {cargando && <p className={styles.nota}>Cargando tickets…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!cargando && !error && tickets.length === 0 && (
        <p className={styles.nota}>No hay tickets con estos filtros.</p>
      )}

      <div className={styles.lista}>
        {tickets.map((t) => (
          <button
            key={t.id_ticket}
            className={styles.fila}
            onClick={() => router.push(`/admin/ticket/${t.id_ticket}`)}
          >
            <span className={`${styles.prioridadPill} ${styles['prioridad_' + t.prioridad]}`}>
              {t.prioridad}
            </span>
            <span className={styles.folio}>{t.folio}</span>
            <span className={styles.categoria}>{t.categoria}</span>
            <span className={styles.nombreUsuario}>{t.nombre || t.correo}</span>
            <span className={styles.estadoPill}>{t.estado.replace('_', ' ')}</span>
            <span className={styles.fecha}>{t.fecha_creacion}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
