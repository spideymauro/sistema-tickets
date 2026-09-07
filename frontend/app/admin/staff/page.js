'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './staff.module.css';
import { obtenerSesion, cerrarSesion } from '../../lib/auth';
import NavAdmin from '../components/NavAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PATRON_PASSWORD = /^(?=.*\d)(?=.*[._*-])[A-Z].{5,}$/;

export default function Staff() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [staff, setStaff] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('activos');

  // Formulario de creación
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [puesto, setPuesto] = useState('');
  const [rol, setRol] = useState('agente');
  const [puedeVerUsuarios, setPuedeVerUsuarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Edición inline
  const [editando, setEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ puesto: '', rol: 'agente', puedeVerUsuarios: false });

  // Flujo de eliminación
  const [eliminando, setEliminando] = useState(null);
  const [pasoEliminar, setPasoEliminar] = useState('cargando'); // 'cargando' | 'reasignar' | 'confirmar'
  const [ticketsAbiertosEliminar, setTicketsAbiertosEliminar] = useState([]);
  const [agenteDestino, setAgenteDestino] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [errorEliminar, setErrorEliminar] = useState('');

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

    if (!PATRON_PASSWORD.test(password)) {
      setErrorForm(
        'La contraseña debe empezar con mayúscula, incluir al menos un número y un símbolo (. - _ *), y tener mínimo 6 caracteres.'
      );
      return;
    }

    setEnviando(true);

    try {
      const resp = await fetch(`${API_URL}/api/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ correo, password, nombre, apellido, puesto, rol, puedeVerUsuarios }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo crear el usuario');

      setNombre('');
      setApellido('');
      setCorreo('');
      setPassword('');
      setPuesto('');
      setRol('agente');
      setPuedeVerUsuarios(false);
      cargarStaff(sesion.token);
    } catch (err) {
      setErrorForm(err.message || 'No se pudo crear el usuario');
    } finally {
      setEnviando(false);
    }
  }

  function iniciarEdicion(s) {
    setEditando(s.id_usuario);
    setFormEdicion({
      puesto: s.puesto || '',
      rol: s.rol,
      puedeVerUsuarios: !!s.puede_ver_usuarios,
    });
  }

  function cancelarEdicion() {
    setEditando(null);
  }

  async function guardarEdicion(id) {
    try {
      const resp = await fetch(`${API_URL}/api/admin/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify(formEdicion),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo actualizar');
      setEditando(null);
      cargarStaff(sesion.token);
    } catch (err) {
      alert(err.message || 'No se pudo actualizar el usuario');
    }
  }

  async function iniciarEliminacion(s) {
    setEliminando(s.id_usuario);
    setErrorEliminar('');
    setConfirmacionTexto('');
    setAgenteDestino('');
    setPasoEliminar('cargando');

    try {
      const resp = await fetch(`${API_URL}/api/admin/staff/${s.id_usuario}/tickets-abiertos`, {
        headers: { Authorization: `Bearer ${sesion.token}` },
      });
      const data = await resp.json();
      setTicketsAbiertosEliminar(data.tickets || []);
      setPasoEliminar(data.tickets && data.tickets.length > 0 ? 'reasignar' : 'confirmar');
    } catch {
      setPasoEliminar('confirmar');
    }
  }

  function cancelarEliminacion() {
    setEliminando(null);
    setTicketsAbiertosEliminar([]);
  }

  async function confirmarReasignacion() {
    if (!agenteDestino) return;
    setErrorEliminar('');
    try {
      const resp = await fetch(`${API_URL}/api/admin/staff/${eliminando}/reasignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ idAgenteDestino: agenteDestino }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo reasignar');
      setPasoEliminar('confirmar');
    } catch (err) {
      setErrorEliminar(err.message || 'No se pudo reasignar');
    }
  }

  async function confirmarEliminacion() {
    if (confirmacionTexto.trim().toUpperCase() !== 'ELIMINAR') {
      setErrorEliminar('Escribe la palabra ELIMINAR para confirmar.');
      return;
    }
    setErrorEliminar('');
    try {
      const resp = await fetch(`${API_URL}/api/admin/staff/${eliminando}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sesion.token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo eliminar');
      cancelarEliminacion();
      cargarStaff(sesion.token);
    } catch (err) {
      setErrorEliminar(err.message || 'No se pudo eliminar');
    }
  }

  const staffMostrado = staff.filter((s) => (pestana === 'activos' ? s.activo : !s.activo));
  const staffEliminando = staff.find((s) => s.id_usuario === eliminando);
  const opcionesDestino = staff.filter((s) => s.activo && s.id_usuario !== eliminando);

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
              required
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
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <p className={styles.ayudaPassword}>
            La contraseña debe empezar con mayúscula, incluir al menos un número y un símbolo
            (. - _ *), mínimo 6 caracteres.
          </p>
          <div className={styles.filaFormulario}>
            <input
              className={styles.input}
              placeholder="Puesto (ej. Agente de Soporte)"
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
              required
            />
            <select className={styles.select} value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="agente">Agente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {rol === 'agente' && (
            <div className={styles.permisos}>
              <p className={styles.permisosTitulo}>Permisos de este agente</p>
              <label className={styles.permisoFijo}>
                <input type="checkbox" checked disabled />
                Responder tickets (incluido siempre)
              </label>
              <label className={styles.permisoOpcional}>
                <input
                  type="checkbox"
                  checked={puedeVerUsuarios}
                  onChange={(e) => setPuedeVerUsuarios(e.target.checked)}
                />
                Ver tabla de usuarios que levantan tickets
              </label>
            </div>
          )}

          {errorForm && <p className={styles.error}>{errorForm}</p>}
          <button className={styles.boton} type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>

        <div className={styles.pestanas}>
          <button
            className={`${styles.botonPestana} ${pestana === 'activos' ? styles.botonPestanaActiva : ''}`}
            onClick={() => setPestana('activos')}
          >
            Activos
          </button>
          <button
            className={`${styles.botonPestana} ${pestana === 'eliminados' ? styles.botonPestanaActiva : ''}`}
            onClick={() => setPestana('eliminados')}
          >
            Eliminados
          </button>
        </div>

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
                <th>Ve usuarios</th>
                <th>Tickets abiertos</th>
                {pestana === 'activos' && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {staffMostrado.map((s) =>
                editando === s.id_usuario ? (
                  <tr key={s.id_usuario}>
                    <td>
                      {s.nombre} {s.apellido}
                    </td>
                    <td>{s.correo}</td>
                    <td>
                      <input
                        className={styles.inputInline}
                        value={formEdicion.puesto}
                        onChange={(e) => setFormEdicion({ ...formEdicion, puesto: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.selectInline}
                        value={formEdicion.rol}
                        onChange={(e) => setFormEdicion({ ...formEdicion, rol: e.target.value })}
                      >
                        <option value="agente">agente</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      {formEdicion.rol === 'agente' ? (
                        <input
                          type="checkbox"
                          checked={formEdicion.puedeVerUsuarios}
                          onChange={(e) =>
                            setFormEdicion({ ...formEdicion, puedeVerUsuarios: e.target.checked })
                          }
                        />
                      ) : (
                        'Sí (admin)'
                      )}
                    </td>
                    <td className={styles.centrado}>{s.ticketsAbiertos}</td>
                    <td className={styles.accionesCelda}>
                      <button className={styles.botonGuardar} onClick={() => guardarEdicion(s.id_usuario)}>
                        Guardar
                      </button>
                      <button className={styles.botonCancelar} onClick={cancelarEdicion}>
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id_usuario}>
                    <td>
                      {s.nombre} {s.apellido}
                    </td>
                    <td>{s.correo}</td>
                    <td>{s.puesto || '—'}</td>
                    <td className={styles.capitalize}>{s.rol}</td>
                    <td>{s.rol === 'admin' ? 'Sí (admin)' : s.puede_ver_usuarios ? 'Sí' : 'No'}</td>
                    <td className={styles.centrado}>{s.ticketsAbiertos}</td>
                    {pestana === 'activos' && (
                      <td className={styles.accionesCelda}>
                        <button className={styles.botonEditar} onClick={() => iniciarEdicion(s)}>
                          Editar
                        </button>
                        <button className={styles.botonEliminar} onClick={() => iniciarEliminacion(s)}>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </main>

      {eliminando && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>
              Eliminar a {staffEliminando?.nombre} {staffEliminando?.apellido}
            </h2>

            {pasoEliminar === 'cargando' && <p className={styles.nota}>Revisando tickets asignados…</p>}

            {pasoEliminar === 'reasignar' && (
              <>
                <p className={styles.modalTexto}>
                  Este usuario tiene {ticketsAbiertosEliminar.length} ticket(s) abierto(s). Elige a quién
                  reasignarlos antes de continuar:
                </p>
                <ul className={styles.listaTicketsModal}>
                  {ticketsAbiertosEliminar.map((t) => (
                    <li key={t.id_ticket}>
                      {t.folio} — {t.categoria} ({t.prioridad})
                    </li>
                  ))}
                </ul>
                <select
                  className={styles.select}
                  value={agenteDestino}
                  onChange={(e) => setAgenteDestino(e.target.value)}
                >
                  <option value="">Selecciona un agente…</option>
                  {opcionesDestino.map((s) => (
                    <option key={s.id_usuario} value={s.id_usuario}>
                      {s.nombre} {s.apellido}
                    </option>
                  ))}
                </select>
                {errorEliminar && <p className={styles.error}>{errorEliminar}</p>}
                <div className={styles.modalBotones}>
                  <button
                    className={styles.boton}
                    onClick={confirmarReasignacion}
                    disabled={!agenteDestino}
                  >
                    Reasignar y continuar
                  </button>
                  <button className={styles.botonCancelar} onClick={cancelarEliminacion}>
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {pasoEliminar === 'confirmar' && (
              <>
                <p className={styles.modalTexto}>
                  Esta acción desactiva permanentemente a este usuario. Ya no podrá iniciar sesión, pero
                  su historial en tickets ya cerrados se conserva.
                </p>
                <p className={styles.modalTexto}>
                  Para confirmar, escribe la palabra <strong>ELIMINAR</strong>:
                </p>
                <input
                  className={styles.input}
                  value={confirmacionTexto}
                  onChange={(e) => setConfirmacionTexto(e.target.value)}
                  autoFocus
                />
                {errorEliminar && <p className={styles.error}>{errorEliminar}</p>}
                <div className={styles.modalBotones}>
                  <button className={styles.botonEliminar} onClick={confirmarEliminacion}>
                    Eliminar definitivamente
                  </button>
                  <button className={styles.botonCancelar} onClick={cancelarEliminacion}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
