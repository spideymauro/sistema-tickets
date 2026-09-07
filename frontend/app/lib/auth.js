const CLAVE_TOKEN = 'admin_token';
const CLAVE_USUARIO = 'admin_usuario';

export function guardarSesion(token, usuario) {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerSesion() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(CLAVE_TOKEN);
  if (!token) return null;
  const usuarioRaw = localStorage.getItem(CLAVE_USUARIO);
  return { token, usuario: usuarioRaw ? JSON.parse(usuarioRaw) : null };
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}
