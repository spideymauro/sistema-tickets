'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { guardarSesion } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminLogin() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const resp = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'No se pudo iniciar sesión');
      }

      guardarSesion(data.token, data.usuario);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={styles.contenedor}>
      <div className={styles.tarjeta}>
        <h1 className={styles.titulo}>Panel de soporte</h1>
        <p className={styles.subtitulo}>Acceso exclusivo para agentes y administradores.</p>

        <form className={styles.formulario} onSubmit={manejarSubmit}>
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
          <label className={styles.etiqueta}>
            Contraseña
            <input
              className={styles.input}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className={styles.boton} type="submit" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
