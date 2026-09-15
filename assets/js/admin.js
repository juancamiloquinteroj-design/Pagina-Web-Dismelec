// DISMELEC -- panel privado (admin.html). Edita assets/data/content.json
// (y sube fotos nuevas) directo al repositorio de GitHub usando la API
// REST con un Personal Access Token que el usuario pega una sola vez.
// No hay backend propio -- esto ES el backend, corriendo en el navegador.
//
// Seguridad, en criollo: la clave de acceso de abajo (comparada por hash,
// no en texto plano) solo evita que un visitante casual entre a mirar/
// tocar el formulario. La protección REAL es el token de GitHub -- sin
// uno con permiso de escritura sobre el repo, "Publicar" no puede hacer
// nada. Guardalo solo en un navegador de confianza (queda en
// localStorage de este sitio, nunca se manda a otro lado que no sea
// api.github.com).

const ADMIN_OWNER = 'juancamiloquinteroj-design';
const ADMIN_REPO = 'Pagina-Web-Dismelec';
const ADMIN_BRANCH = 'master';
const ADMIN_CONTENT_PATH = 'assets/data/content.json';

// SHA-256 de la clave "dismelec2026" -- pedile a Claude que la cambie
// cuando quieras (es un solo hash acá, no hay que tocar nada más).
const ADMIN_PASSWORD_HASH = '36779c358ffeb18636a545cdd9d7d90e13de1b75a9fe4592a284bd3740ec1dec';

let ADMIN_STATE = { hero: {}, cards: [] };
let ADMIN_NUEVA_FOTO = null; // {file, dataUrl} si el usuario eligió una foto nueva

async function _sha256Hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- gate
document.addEventListener('DOMContentLoaded', () => {
  const pass = document.getElementById('admin-password');
  const btn = document.getElementById('admin-entrar');
  const err = document.getElementById('admin-error');

  const intentar = async () => {
    const hash = await _sha256Hex(pass.value.trim());
    if (hash === ADMIN_PASSWORD_HASH) {
      document.getElementById('admin-gate').hidden = true;
      document.getElementById('admin-panel').hidden = false;
      adminIniciarPanel();
    } else {
      err.classList.add('show');
      pass.value = '';
      pass.focus();
    }
  };
  btn.addEventListener('click', intentar);
  pass.addEventListener('keydown', e => { if (e.key === 'Enter') intentar(); });
  pass.focus();

  // ---- token (vive en el módulo Configuración) ----
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

  document.getElementById('admin-photo-input').addEventListener('change', onAdminFotoElegida);
  document.getElementById('admin-card-agregar').addEventListener('click', () => {
    ADMIN_STATE.cards.push({ icon: 'rayo', title: 'Nueva tarjeta', desc: '', link: '' });
    adminRenderCards();
  });
  document.getElementById('admin-publicar').addEventListener('click', adminPublicar);

  adminRenderCards();
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
