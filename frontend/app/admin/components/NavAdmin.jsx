'use client';

import { useRouter, usePathname } from 'next/navigation';
import styles from './NavAdmin.module.css';
import { cerrarSesion } from '../../lib/auth';

export default function NavAdmin({ usuario }) {
  const router = useRouter();
  const pathname = usePathname();

  function salir() {
    cerrarSesion();
    router.push('/admin/login');
  }

  const enlaces = [{ href: '/admin/dashboard', label: 'Tickets' }];
  if (usuario?.rol === 'admin' || usuario?.puedeVerUsuarios) {
    enlaces.push({ href: '/admin/usuarios', label: 'Usuarios' });
  }
  if (usuario?.rol === 'admin') {
    enlaces.push({ href: '/admin/staff', label: 'Agentes' });
  }

  return (
    <header className={styles.encabezado}>
      <div className={styles.izquierda}>
        <span className={styles.marca}>Panel de soporte</span>
        <nav className={styles.nav}>
          {enlaces.map((e) => (
            <button
              key={e.href}
              className={`${styles.enlace} ${pathname === e.href ? styles.enlaceActivo : ''}`}
              onClick={() => router.push(e.href)}
            >
              {e.label}
            </button>
          ))}
        </nav>
      </div>
      <div className={styles.derecha}>
        {usuario && (
          <div className={styles.perfil}>
            <p className={styles.nombrePerfil}>
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className={styles.puestoPerfil}>{usuario.puesto || usuario.rol}</p>
          </div>
        )}
        <button className={styles.botonSalir} onClick={salir}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
