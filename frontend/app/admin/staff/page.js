'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './staff.module.css';
import { obtenerSesion, cerrarSesion } from '../../lib/auth';
import NavAdmin from '../components/NavAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Staff() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [staff, setStaff] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [puesto, setPuesto] = useState('');
  const [rol, setRol] = useState('agente');
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push('/admin/login');
      return;
    }
    if (s.usuario?.rol !== 'admin') {
      router.push('/admin/dashboard');
      return;
    }
    setSesion(s);
    cargarStaff(s.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarStaff(token) {
    setCargando(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        cerrarSesion();
        router.push('/admin/login');
        return;
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al cargar el equipo');
      setStaff(data.staff);
    } catch (err) {
      setError(err.message || 'Error al cargar el equipo');
    } finally {
      setCargando(false);
    }
  }

  async function crearStaff(e) {
    e.preventDefault();
    setErrorForm('');
    setEnviando(true);

    try {
      const resp = await fetch(`${API_URL}/api/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ correo, password, nombre, apellido, puesto, rol }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo crear el usuario');

      setNombre('');
      setApellido('');
      setCorreo('');
      setPassword('');
      setPuesto('');
      setRol('agente');
      cargarStaff(sesion.token);
    } catch (err) {
      setErrorForm(err.message || 'No se pudo crear el usuario');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <NavAdmin usuario={sesion?.usuario} />
      <main className={styles.contenedor}>
        <h1 className={styles.titulo}>Agentes y administradores</h1>
        <p className={styles.subtitulo}>Solo los administradores pueden crear nuevos usuarios.</p>

        <form className={styles.formulario} onSubmit={crearStaff}>
          <div className={styles.filaFormulario}>
            <input
              className={styles.input}
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <input
              className={styles.input}
              placeholder="Apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </div>
          <div className={styles.filaFormulario}>
            <input
              className={styles.input}
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.filaFormulario}>
            <input
              className={styles.input}
              placeholder="Puesto (ej. Agente de Soporte)"
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
            />
            <select className={styles.select} value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="agente">Agente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {errorForm && <p className={styles.error}>{errorForm}</p>}
          <button className={styles.boton} type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>

        {cargando && <p className={styles.nota}>Cargando…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!cargando && !error && (
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Puesto</th>
                <th>Rol</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id_usuario}>
                  <td>
                    {s.nombre} {s.apellido}
                  </td>
                  <td>{s.correo}</td>
                  <td>{s.puesto || '—'}</td>
                  <td className={styles.capitalize}>{s.rol}</td>
                  <td>{s.activo ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
