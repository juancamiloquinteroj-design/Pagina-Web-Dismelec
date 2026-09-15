// DISMELEC -- helpers de autenticación compartidos entre el portal
// privado (admin.html) y el portal de clientes (portal-clientes.html).
// Requiere que firebase-init.js ya haya corrido antes (dismelecAuth,
// dismelecDb, dismelecAuthSecundaria).

const AUTH_MENSAJES = {
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos -- esperá un momento y probá de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/network-request-failed': 'Sin conexión -- revisá tu internet.',
};

function authMensajeError(err) {
  return AUTH_MENSAJES[err && err.code] || (err && err.message) || 'Algo falló. Intentá de nuevo.';
}

// ---- mostrar/ocultar clave con el ojito ----
function authTogglePass(inputEl, btnEl) {
  const mostrar = inputEl.type === 'password';
  inputEl.type = mostrar ? 'text' : 'password';
  btnEl.innerHTML = mostrar
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-10-8-10-8a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ---- perfil (rol) en Firestore -- lo crea el módulo Usuarios del panel
// privado al dar de alta a alguien, ver assets/js/admin.js ----
async function authObtenerPerfil(uid) {
  const doc = await dismelecDb.collection('usuarios').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function authIniciarSesion(correo, clave) {
  const cred = await dismelecAuth.signInWithEmailAndPassword(correo.trim(), clave);
  return cred.user;
}

function authCerrarSesion() {
  return dismelecAuth.signOut();
}

// El correo de recuperación NO lo manda Firebase directo (ese es de texto
// plano, sin diseño) -- lo manda este backend propio (Flask en Render,
// mismo patrón que las otras apps CINCO), que genera el enlace con el SDK
// de administrador de Firebase y lo envía con una plantilla con la marca
// de DISMELEC.
const DISMELEC_BACKEND_URL = 'https://dismelec-backend-correos.onrender.com';

async function authRecuperarClave(correo) {
  const resp = await fetch(`${DISMELEC_BACKEND_URL}/api/recuperar-clave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo.trim() }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) {
    throw new Error(data.error || 'No pudimos enviar el correo. Intentá de nuevo en un momento.');
  }
  return data;
}
