'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { obtenerSesion, cerrarSesion } from '../../lib/auth';
import NavAdmin from '../components/NavAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ESTADOS = ['nuevo', 'en_proceso', 'pendiente', 'resuelto', 'cerrado'];
const PRIORIDADES = ['urgente', 'alta', 'media', 'baja'];
const ETIQUETAS_ESTADO = {
  nuevo: 'Nuevos',
  en_proceso: 'En proceso',
  pendiente: 'Pendientes',
  resuelto: 'Resueltos',
  cerrado: 'Cerrados',
};

export default function Dashboard() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('kanban'); // 'kanban' | 'lista'
  const [columnaSobre, setColumnaSobre] = useState(null);

  const cargarResumen = useCallback(async (token) => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/tickets/resumen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) setResumen(await resp.json());
    } catch {
      // el resumen es un extra visual; si falla, no bloqueamos el resto del dashboard
    }
  }, []);

  const cargarTickets = useCallback(
    async (token) => {
      setCargando(true);
      setError('');
      try {
        const params = new URLSearchParams();
        // En vista kanban siempre traemos todos los estados (las columnas ya los separan)
        if (vista === 'lista' && filtroEstado) params.append('estado', filtroEstado);
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
    [vista, filtroEstado, filtroPrioridad, router]
  );

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push('/admin/login');
      return;
    }
    setSesion(s);
    cargarTickets(s.token);
    cargarResumen(s.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, filtroEstado, filtroPrioridad]);

  function alHacerClicTarjeta(estado) {
    if (vista === 'kanban') return; // en kanban las columnas ya muestran todo, el filtro no aplica
    setFiltroEstado(estado === filtroEstado ? '' : estado);
  }

  async function cambiarEstadoTicket(idTicket, nuevoEstado) {
    if (!sesion) return;
    try {
      const resp = await fetch(`${API_URL}/api/admin/tickets/${idTicket}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (resp.ok) {
        cargarTickets(sesion.token);
        cargarResumen(sesion.token);
      }
    } catch {
      // si falla, simplemente no se mueve; el usuario puede reintentar arrastrando de nuevo
    }
  }

  function alIniciarArrastre(e, idTicket) {
    e.dataTransfer.setData('text/plain', String(idTicket));
  }

  function alSobrevolar(e, estado) {
    e.preventDefault();
    if (columnaSobre !== estado) setColumnaSobre(estado);
  }

  function alSoltar(e, nuevoEstado) {
    e.preventDefault();
    const idTicket = e.dataTransfer.getData('text/plain');
    setColumnaSobre(null);
    if (idTicket) cambiarEstadoTicket(idTicket, nuevoEstado);
  }

  const ticketsPorEstado = (estado) => tickets.filter((t) => t.estado === estado);

  return (
    <>
      <NavAdmin usuario={sesion?.usuario} />
      <main className={styles.contenedor}>
        <div className={styles.encabezadoTitulo}>
          <h1 className={styles.titulo}>Tickets</h1>
          <div className={styles.toggleVista}>
            <button
              className={`${styles.botonVista} ${vista === 'kanban' ? styles.botonVistaActivo : ''}`}
              onClick={() => setVista('kanban')}
            >
              Kanban
            </button>
            <button
              className={`${styles.botonVista} ${vista === 'lista' ? styles.botonVistaActivo : ''}`}
              onClick={() => setVista('lista')}
            >
              Lista
            </button>
          </div>
        </div>

        {resumen && (
          <div className={styles.tarjetasResumen}>
            {ESTADOS.map((estado) => (
              <button
                key={estado}
                className={`${styles.tarjeta} ${filtroEstado === estado ? styles.tarjetaActiva : ''}`}
                onClick={() => alHacerClicTarjeta(estado)}
              >
                <span className={styles.tarjetaNumero}>{resumen[estado] ?? 0}</span>
                <span className={styles.tarjetaEtiqueta}>{ETIQUETAS_ESTADO[estado]}</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.filtros}>
          {vista === 'lista' && (
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
          )}

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

        {!cargando && !error && vista === 'lista' && (
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
        )}

        {!cargando && !error && vista === 'kanban' && (
          <div className={styles.tablero}>
            {ESTADOS.map((estado) => (
              <div
                key={estado}
                className={`${styles.columna} ${columnaSobre === estado ? styles.columnaSobre : ''}`}
                onDragOver={(e) => alSobrevolar(e, estado)}
                onDragLeave={() => setColumnaSobre(null)}
                onDrop={(e) => alSoltar(e, estado)}
              >
                <div className={styles.columnaEncabezado}>
                  <span>{ETIQUETAS_ESTADO[estado]}</span>
                  <span className={styles.columnaContador}>{ticketsPorEstado(estado).length}</span>
                </div>
                <div className={styles.columnaCuerpo}>
                  {ticketsPorEstado(estado).map((t) => (
                    <div
                      key={t.id_ticket}
                      className={styles.tarjetaTicket}
                      draggable
                      onDragStart={(e) => alIniciarArrastre(e, t.id_ticket)}
                      onClick={() => router.push(`/admin/ticket/${t.id_ticket}`)}
                    >
                      <span
                        className={`${styles.prioridadPill} ${styles['prioridad_' + t.prioridad]}`}
                      >
                        {t.prioridad}
                      </span>
                      <p className={styles.tarjetaFolio}>{t.folio}</p>
                      <p className={styles.tarjetaNombre}>{t.nombre || t.correo}</p>
                      <p className={styles.tarjetaCategoria}>{t.categoria}</p>
                      <p className={styles.tarjetaFecha}>{t.fecha_creacion}</p>
                    </div>
                  ))}
                  {ticketsPorEstado(estado).length === 0 && (
                    <p className={styles.columnaVacia}>Sin tickets</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
