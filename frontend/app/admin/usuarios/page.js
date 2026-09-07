'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './usuarios.module.css';
import { obtenerSesion, cerrarSesion } from '../../lib/auth';
import NavAdmin from '../components/NavAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Usuarios() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push('/admin/login');
      return;
    }
    setSesion(s);
    cargarUsuarios(s.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarUsuarios(token) {
    setCargando(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/admin/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401) {
        cerrarSesion();
        router.push('/admin/login');
        return;
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsuarios(data.usuarios);
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <NavAdmin usuario={sesion?.usuario} />
      <main className={styles.contenedor}>
        <h1 className={styles.titulo}>Usuarios que han solicitado tickets</h1>
        <p className={styles.subtitulo}>
          Directorio de personas que han reportado al menos un caso, sin necesidad de cuenta.
        </p>

        {cargando && <p className={styles.nota}>Cargando…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!cargando && !error && (
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tickets creados</th>
                <th>Primer contacto</th>
                <th>Último ticket</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre || '—'}</td>
                  <td>{u.correo}</td>
                  <td className={styles.centrado}>{u.tickets_creados}</td>
                  <td>{u.fecha_primer_contacto}</td>
                  <td>{u.fecha_ultimo_ticket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
