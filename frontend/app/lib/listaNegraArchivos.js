// Espejo de la lista negra del backend (utils/listaNegraArchivos.js), para dar feedback
// inmediato en el navegador antes de siquiera intentar subir el archivo.
const EXTENSIONES_PROHIBIDAS = [
  '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.pif', '.cpl', '.msp', '.msc',
  '.gadget', '.application', '.apk', '.appx', '.appxbundle',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml',
  '.scf', '.lnk', '.inf', '.reg', '.hta', '.jnlp',
  '.sh', '.bash', '.zsh', '.command', '.workflow', '.run',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz',
  '.iso', '.dmg', '.pkg', '.cab',
  '.docm', '.xlsm', '.pptm', '.dotm', '.xltm', '.potm', '.xlam', '.ppam',
  '.jar', '.class', '.dll', '.sys', '.drv', '.vxd', '.ocx',
  '.py', '.pyc', '.rb', '.pl', '.php', '.asp', '.aspx', '.jsp', '.cgi',
];

function obtenerExtension(nombreArchivo) {
  const partes = String(nombreArchivo || '').toLowerCase().split('.');
  if (partes.length < 2) return '';
  return `.${partes[partes.length - 1]}`;
}

export function validarExtensionPermitida(nombreArchivo) {
  const ext = obtenerExtension(nombreArchivo);
  if (EXTENSIONES_PROHIBIDAS.includes(ext)) {
    return `El archivo "${nombreArchivo}" tiene una extensión prohibida (${ext}).`;
  }
  return null;
}
