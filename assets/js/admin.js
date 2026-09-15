// DISMELEC -- panel privado (admin.html). Dos partes bien separadas:
//   1. QUIÉN entra -- Firebase Authentication + Firestore (colección
//      "usuarios", campo rol=='admin'). Ver assets/js/firebase-init.js y
//      assets/js/auth.js.
//   2. QUÉ publica -- el contenido del sitio (assets/data/content.json,
//      fotos) se sigue subiendo directo al repo de GitHub con un
//      Personal Access Token, sin backend propio (esto ES el backend,
//      corriendo en el navegador). El login de arriba NO tiene nada que
//      ver con esto -- son 2 sistemas distintos que conviven.

const ADMIN_OWNER = 'juancamiloquinteroj-design';
const ADMIN_REPO = 'Pagina-Web-Dismelec';
const ADMIN_BRANCH = 'master';
const ADMIN_CONTENT_PATH = 'assets/data/content.json';

let ADMIN_STATE = { hero: {}, cards: [] };
let ADMIN_NUEVA_FOTO = null; // {file, dataUrl} si el usuario eligió una foto nueva
let ADMIN_USER = null; // {uid, email, nombre, rol} del usuario logueado

// ---------------------------------------------------------------- login
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  const emailEl = document.getElementById('admin-email');
  const passEl = document.getElementById('admin-password');
  const err = document.getElementById('admin-error');
  const ok = document.getElementById('admin-ok');
  const eye = document.getElementById('admin-eye');
  const entrarBtn = document.getElementById('admin-entrar');

  eye.addEventListener('click', () => authTogglePass(passEl, eye));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.classList.remove('show');
    entrarBtn.disabled = true;
    entrarBtn.textContent = 'Ingresando...';
    try {
      await authIniciarSesion(emailEl.value, passEl.value);
      // onAuthStateChanged (más abajo) se encarga de validar el rol y
      // mostrar el panel -- acá solo se maneja el error de credenciales.
    } catch (e) {
      err.textContent = authMensajeError(e);
      err.classList.add('show');
      entrarBtn.disabled = false;
      entrarBtn.textContent = 'Ingresar';
    }
  });

  document.getElementById('admin-olvide').addEventListener('click', async (ev) => {
    ev.preventDefault();
    err.classList.remove('show'); ok.classList.remove('show');
    const correo = (emailEl.value || '').trim();
    if (!correo) { err.textContent = 'Escribí tu correo arriba primero.'; err.classList.add('show'); return; }
    try {
      await authRecuperarClave(correo);
      ok.textContent = 'Te mandamos un correo para restablecer la clave.';
      ok.classList.add('show');
    } catch (e) {
      err.textContent = authMensajeError(e);
      err.classList.add('show');
    }
  });

  document.getElementById('admin-salir').addEventListener('click', () => authCerrarSesion());

  // ---- ¿ya hay sesión abierta / se cierra? -- único lugar que decide si
  // se ve el login o el panel. Corre también al cargar la página (por si
  // Firebase todavía tiene la sesión guardada de la visita anterior). ----
  dismelecAuth.onAuthStateChanged(async (user) => {
    const entrarBtnLocal = document.getElementById('admin-entrar');
    entrarBtnLocal.disabled = false;
    entrarBtnLocal.textContent = 'Ingresar';
    if (!user) {
      ADMIN_USER = null;
      document.getElementById('admin-gate').hidden = false;
      document.getElementById('admin-panel').hidden = true;
      return;
    }
    const perfil = await authObtenerPerfil(user.uid);
    if (!perfil || perfil.rol !== 'admin') {
      // Se autenticó bien pero no es cuenta de equipo -- por ejemplo,
      // alguien probó su login de cliente acá por error.
      err.textContent = 'Tu cuenta no tiene acceso al Portal Privado.';
      err.classList.add('show');
      await authCerrarSesion();
      return;
    }
    ADMIN_USER = { uid: user.uid, email: user.email, nombre: perfil.nombre || user.email, rol: perfil.rol };
    document.getElementById('admin-quien').textContent = `${ADMIN_USER.nombre} ·`;
    document.getElementById('admin-gate').hidden = true;
    document.getElementById('admin-panel').hidden = false;
    adminIniciarPanel();
  });

  // ---- token de GitHub (vive en el módulo Configuración) ----
  const tokenStatus = document.getElementById('admin-token-status');
  const tokenInput = document.getElementById('admin-token-input');
  const tokenGuardar = document.getElementById('admin-token-guardar');

  const refrescarTokenStatus = () => {
    const t = localStorage.getItem('dismelec_gh_token');
    tokenStatus.textContent = t ? 'Token de GitHub configurado ✓' : 'Sin token de GitHub configurado';
  };
  refrescarTokenStatus();
  tokenGuardar.addEventListener('click', () => {
    const v = tokenInput.value.trim();
    if (!v) return;
    localStorage.setItem('dismelec_gh_token', v);
    tokenInput.value = '';
    refrescarTokenStatus();
  });

  document.getElementById('admin-crear-usuario').addEventListener('click', adminCrearUsuario);

  adminSetupNav();
});

// ------------------------------------------------- módulos + pestañas
// Menú lateral ("módulos") y las pestañas de adentro de cada uno -- pedido
// explícito ("quiero que sean módulos laterales... y que tenga pestañas
// cada módulo"). Funciona por simple mostrar/ocultar, sin routing -- no
// hace falta más para 2 módulos.
function adminSetupNav() {
  document.querySelectorAll('.admin-sidebar-link').forEach(link => {
    link.addEventListener('click', () => adminIrAModulo(link.dataset.module));
  });
  document.querySelectorAll('.admin-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      const modulo = tab.closest('.admin-module');
      modulo.querySelectorAll('.admin-tab-btn').forEach(t => t.classList.toggle('active', t === tab));
      modulo.querySelectorAll('.admin-tab-panel').forEach(p => p.hidden = p.id !== tab.dataset.tab);
    });
  });
}

function adminIrAModulo(nombre) {
  document.querySelectorAll('.admin-sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.module === nombre));
  document.querySelectorAll('.admin-module').forEach(m => m.hidden = m.id !== `modulo-${nombre}`);
}

// ---------------------------------------------------------------- panel
let _adminListenersListos = false; // evita duplicar listeners si onAuthStateChanged dispara más de una vez en la misma pestaña (logout + login sin recargar)

async function adminIniciarPanel() {
  // Sin token todavía -- arranca directo en Configuración en vez de
  // Parametrización, para no dejar a alguien editando 10 minutos y
  // recién ahí enterarse de que no puede publicar nada.
  if (!localStorage.getItem('dismelec_gh_token')) adminIrAModulo('configuracion');

  try {
    const res = await fetch('assets/data/content.json', { cache: 'no-store' });
    ADMIN_STATE = await res.json();
  } catch (e) {
    ADMIN_STATE = { hero: {}, cards: [] };
  }

  document.getElementById('admin-hero-tag').value = (ADMIN_STATE.hero.tag || '').replace(/\n/g, ' ');
  document.getElementById('admin-hero-title').value = ADMIN_STATE.hero.title || '';
  document.getElementById('admin-hero-lead').value = ADMIN_STATE.hero.lead || '';
  if (ADMIN_STATE.hero.photo) document.getElementById('admin-photo-preview').src = ADMIN_STATE.hero.photo;

  if (!_adminListenersListos) {
    _adminListenersListos = true;
    document.getElementById('admin-photo-input').addEventListener('change', onAdminFotoElegida);
    document.getElementById('admin-card-agregar').addEventListener('click', () => {
      ADMIN_STATE.cards.push({ icon: 'rayo', title: 'Nueva tarjeta', desc: '', link: '' });
      adminRenderCards();
    });
    document.getElementById('admin-publicar').addEventListener('click', adminPublicar);
  }

  adminRenderCards();
  adminCargarUsuarios();
}

function onAdminFotoElegida(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    ADMIN_NUEVA_FOTO = { file, dataUrl: reader.result };
    document.getElementById('admin-photo-preview').src = reader.result;
  };
  reader.readAsDataURL(file);
}

function adminRenderCards() {
  const wrap = document.getElementById('admin-cards-list');
  const tpl = document.getElementById('admin-card-template');
  wrap.innerHTML = '';
  ADMIN_STATE.cards.forEach((card, idx) => {
    const node = tpl.content.cloneNode(true);
    const item = node.querySelector('[data-card]');
    item.dataset.index = idx;

    const select = node.querySelector('select[data-field=icon]');
    select.innerHTML = Object.entries(window.DISMELEC_ICONS).map(([id, info]) =>
      `<option value="${id}" ${id === card.icon ? 'selected' : ''}>${info.label}</option>`).join('');
    const preview = node.querySelector('[data-icon-preview]');
    preview.innerHTML = dismelecIconSvg(card.icon);
    select.addEventListener('change', () => {
      card.icon = select.value;
      preview.innerHTML = dismelecIconSvg(card.icon);
      adminRenderPreview();
    });

    node.querySelector('[data-field=title]').value = card.title || '';
    node.querySelector('[data-field=title]').addEventListener('input', e => { card.title = e.target.value; adminRenderPreview(); });
    node.querySelector('[data-field=desc]').value = card.desc || '';
    node.querySelector('[data-field=desc]').addEventListener('input', e => { card.desc = e.target.value; adminRenderPreview(); });
    node.querySelector('[data-field=link]').value = card.link || '';
    node.querySelector('[data-field=link]').addEventListener('input', e => card.link = e.target.value);

    node.querySelector('[data-mover=up]').addEventListener('click', () => {
      if (idx === 0) return;
      [ADMIN_STATE.cards[idx - 1], ADMIN_STATE.cards[idx]] = [ADMIN_STATE.cards[idx], ADMIN_STATE.cards[idx - 1]];
      adminRenderCards();
    });
    node.querySelector('[data-mover=down]').addEventListener('click', () => {
      if (idx === ADMIN_STATE.cards.length - 1) return;
      [ADMIN_STATE.cards[idx + 1], ADMIN_STATE.cards[idx]] = [ADMIN_STATE.cards[idx], ADMIN_STATE.cards[idx + 1]];
      adminRenderCards();
    });
    node.querySelector('[data-mover=remove]').addEventListener('click', () => {
      if (!confirm('¿Quitar esta tarjeta?')) return;
      ADMIN_STATE.cards.splice(idx, 1);
      adminRenderCards();
    });

    wrap.appendChild(node);
  });
  adminRenderPreview();
}

// Vista previa -- usa las MISMAS clases (.feature-card, etc.) que el
// sitio real (style.css ya está cargado en admin.html), así que se ve
// igual a como va a quedar publicado, sin tener que adivinar.
function adminRenderPreview() {
  const wrap = document.getElementById('admin-cards-preview');
  if (!wrap) return;
  wrap.innerHTML = ADMIN_STATE.cards.map(c => `
    <div class="feature-card">
      <div class="feature-icon">${dismelecIconSvg(c.icon)}</div>
      <h3>${c.title || '(sin título)'}</h3>
      <p>${c.desc || ''}</p>
      <span class="feature-more">Conocer más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
    </div>`).join('');
}

function adminLeerFormularioHero() {
  ADMIN_STATE.hero.tag = document.getElementById('admin-hero-tag').value.trim();
  ADMIN_STATE.hero.title = document.getElementById('admin-hero-title').value.trim();
  ADMIN_STATE.hero.lead = document.getElementById('admin-hero-lead').value.trim();
}

// ---------------------------------------------------------- GitHub API
function _ghHeaders(token) {
  return { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' };
}

async function _ghObtenerSha(path, token) {
  const url = `https://api.github.com/repos/${ADMIN_OWNER}/${ADMIN_REPO}/contents/${path}?ref=${ADMIN_BRANCH}`;
  const res = await fetch(url, { headers: _ghHeaders(token) });
  if (res.status === 404) return null; // archivo nuevo, todavía no existe
  if (!res.ok) throw new Error(`No se pudo leer ${path} (HTTP ${res.status}) -- revisá el token.`);
  const datos = await res.json();
  return datos.sha;
}

async function _ghSubirArchivo(path, base64, mensaje, token) {
  const sha = await _ghObtenerSha(path, token);
  const url = `https://api.github.com/repos/${ADMIN_OWNER}/${ADMIN_REPO}/contents/${path}`;
  const body = { message: mensaje, content: base64, branch: ADMIN_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method: 'PUT', headers: { ..._ghHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const detalle = await res.json().catch(() => ({}));
    throw new Error(detalle.message || `No se pudo publicar ${path} (HTTP ${res.status}).`);
  }
  return res.json();
}

function _dataUrlABase64(dataUrl) {
  return dataUrl.split(',')[1];
}

function _utf8ABase64(texto) {
  return btoa(unescape(encodeURIComponent(texto)));
}

async function adminPublicar() {
  const status = document.getElementById('admin-status');
  const token = localStorage.getItem('dismelec_gh_token');
  if (!token) {
    status.textContent = 'Primero configurá el token de GitHub -- módulo "Configuración" del menú.';
    status.className = 'admin-status err';
    return;
  }
  const boton = document.getElementById('admin-publicar');
  boton.disabled = true;
  status.textContent = 'Publicando...';
  status.className = 'admin-status busy';

  try {
    adminLeerFormularioHero();

    if (ADMIN_NUEVA_FOTO) {
      status.textContent = 'Subiendo foto nueva...';
      const ext = (ADMIN_NUEVA_FOTO.file.name.split('.').pop() || 'jpg').toLowerCase();
      const nombreArchivo = `assets/img/foto-portada-${Date.now()}.${ext}`;
      await _ghSubirArchivo(nombreArchivo, _dataUrlABase64(ADMIN_NUEVA_FOTO.dataUrl), 'Actualiza foto de portada (panel privado)', token);
      ADMIN_STATE.hero.photo = nombreArchivo;
      ADMIN_NUEVA_FOTO = null;
    }

    status.textContent = 'Guardando cambios de contenido...';
    const contenido = JSON.stringify(ADMIN_STATE, null, 2);
    await _ghSubirArchivo(ADMIN_CONTENT_PATH, _utf8ABase64(contenido), 'Actualiza contenido del sitio (panel privado)', token);

    status.textContent = '✓ Publicado -- el sitio se actualiza solo en 30-60 segundos.';
    status.className = 'admin-status ok';
  } catch (e) {
    status.textContent = e.message || 'Algo falló al publicar.';
    status.className = 'admin-status err';
  } finally {
    boton.disabled = false;
  }
}

// -------------------------------------------------------------- Usuarios
// Crea cuentas para el equipo (rol admin, entran acá) o clientes (rol
// cliente, entran a portal-clientes.html). Usa dismelecAuthSecundaria
// (ver firebase-init.js) para que crear el usuario nuevo no cierre la
// sesión del admin logueado en esta pestaña.
async function adminCrearUsuario() {
  const status = document.getElementById('admin-usuarios-status');
  const nombre = document.getElementById('admin-nuevo-nombre').value.trim();
  const correo = document.getElementById('admin-nuevo-correo').value.trim();
  const clave = document.getElementById('admin-nuevo-clave').value;
  const rol = document.getElementById('admin-nuevo-rol').value;

  if (!nombre || !correo || !clave) {
    status.textContent = 'Completá nombre, correo y contraseña.';
    status.className = 'admin-status err';
    return;
  }

  const boton = document.getElementById('admin-crear-usuario');
  boton.disabled = true;
  status.textContent = 'Creando cuenta...';
  status.className = 'admin-status busy';

  try {
    const cred = await dismelecAuthSecundaria.createUserWithEmailAndPassword(correo, clave);
    await dismelecDb.collection('usuarios').doc(cred.user.uid).set({
      nombre, email: correo, rol,
      creado_en: firebase.firestore.FieldValue.serverTimestamp(),
      creado_por: ADMIN_USER ? ADMIN_USER.email : null,
    });
    await dismelecAuthSecundaria.signOut(); // la app secundaria quedó logueada como el usuario nuevo -- no hace falta

    status.textContent = `✓ Cuenta creada para ${correo} (${rol === 'admin' ? 'equipo' : 'cliente'}).`;
    status.className = 'admin-status ok';
    document.getElementById('admin-nuevo-nombre').value = '';
    document.getElementById('admin-nuevo-correo').value = '';
    document.getElementById('admin-nuevo-clave').value = '';
    adminCargarUsuarios();
  } catch (e) {
    status.textContent = authMensajeError(e);
    status.className = 'admin-status err';
  } finally {
    boton.disabled = false;
  }
}

async function adminCargarUsuarios() {
  const wrap = document.getElementById('admin-usuarios-lista');
  if (!wrap) return;
  wrap.innerHTML = '<p class="sub">Cargando...</p>';
  try {
    const snap = await dismelecDb.collection('usuarios').orderBy('creado_en', 'desc').get();
    if (snap.empty) {
      wrap.innerHTML = '<p class="sub">Todavía no hay cuentas creadas.</p>';
      return;
    }
    wrap.innerHTML = snap.docs.map(doc => {
      const u = doc.data();
      const etiquetaRol = u.rol === 'admin' ? 'Equipo DISMELEC' : 'Cliente';
      return `
        <div class="admin-card-item" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <div>
            <strong style="font-size:14px;color:var(--ink)">${_dmEsc(u.nombre || '(sin nombre)')}</strong>
            <div class="sub" style="margin:2px 0 0">${_dmEsc(u.email || '')} -- ${etiquetaRol}</div>
          </div>
          <button type="button" class="btn btn-outline-dark btn-sm" data-revocar="${doc.id}">Revocar acceso</button>
        </div>`;
    }).join('');
    wrap.querySelectorAll('[data-revocar]').forEach(btn => {
      btn.addEventListener('click', () => adminRevocarUsuario(btn.dataset.revocar, btn));
    });
  } catch (e) {
    wrap.innerHTML = `<p class="sub" style="color:#c0392b">No se pudo cargar la lista -- ${authMensajeError(e)}</p>`;
  }
}

async function adminRevocarUsuario(uid, boton) {
  if (!confirm('¿Revocar el acceso de esta cuenta? Deja de poder entrar a los portales (la cuenta de Firebase no se borra).')) return;
  boton.disabled = true;
  try {
    await dismelecDb.collection('usuarios').doc(uid).delete();
    adminCargarUsuarios();
  } catch (e) {
    alert(authMensajeError(e));
    boton.disabled = false;
  }
}

function _dmEsc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
