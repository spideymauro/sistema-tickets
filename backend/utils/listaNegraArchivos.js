// Lista negra explícita de extensiones peligrosas. Esta es una capa SEPARADA de la
// validación por tipo MIME/firma de bytes: aunque ya solo aceptamos imágenes y PDF
// (lo cual de por sí bloquea todo esto), esta lista existe como control adicional,
// explícito y fácil de auditar, que revisa el nombre del archivo antes que nada.
const EXTENSIONES_PROHIBIDAS = [
  // Ejecutables e instaladores de Windows
  '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.pif', '.cpl', '.msp', '.msc',
  '.gadget', '.application', '.apk', '.appx', '.appxbundle',
  // Scripts y automatización
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml',
  '.scf', '.lnk', '.inf', '.reg', '.hta', '.jnlp',
  // Scripts de macOS/Linux
  '.sh', '.bash', '.zsh', '.command', '.workflow', '.run',
  // Archivos comprimidos (pueden ocultar cualquier cosa dentro)
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz',
  '.iso', '.dmg', '.pkg', '.cab',
  // Documentos de Office con macros habilitadas
  '.docm', '.xlsm', '.pptm', '.dotm', '.xltm', '.potm', '.xlam', '.ppam',
  // Java y librerías/controladores del sistema
  '.jar', '.class', '.dll', '.sys', '.drv', '.vxd', '.ocx',
  // Lenguajes de servidor / scripting general
  '.py', '.pyc', '.rb', '.pl', '.php', '.asp', '.aspx', '.jsp', '.cgi',
];

function obtenerExtension(nombreArchivo) {
  const partes = String(nombreArchivo || '').toLowerCase().split('.');
  if (partes.length < 2) return '';
  return `.${partes[partes.length - 1]}`;
}

// Devuelve null si está permitido, o un mensaje de error si la extensión está en la lista negra
function validarExtensionPermitida(nombreArchivo) {
  const ext = obtenerExtension(nombreArchivo);
  if (EXTENSIONES_PROHIBIDAS.includes(ext)) {
    return `El archivo "${nombreArchivo}" tiene una extensión prohibida (${ext}).`;
  }
  return null;
}

module.exports = { EXTENSIONES_PROHIBIDAS, validarExtensionPermitida };
