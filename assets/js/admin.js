// DISMELEC -- panel privado (admin.html). Dos partes bien separadas:
//   1. QUIÉN entra -- Firebase Authentication + Firestore (colección
//      "usuarios", campo rol=='admin'). Ver assets/js/firebase-init.js y
//      assets/js/auth.js.
//   2. QUÉ publica -- el contenido del sitio (assets/data/content.json,
//      fotos) se sigue subiendo directo al repo de GitHub con un
//      Personal Access Token, sin backend propio (esto ES el backend,
//      corriendo en el navegador). El login de arriba NO tiene nada que
//      ver con esto -- son 2 sistemas distintos que conviven.
//
// EDITOR VISUAL (reemplaza al viejo sistema de formularios por pestaña --
// pedido explícito: "que exista la misma página pero cada letra editable,
// si doy clic sobre letras pueda cambiar el texto y clic sobre los
// espacios de imágenes pueda cambiar la imagen, clic derecho agregar
// nuevas tarjetas"). La página real de cada sección (Inicio/Servicios/
// Proyectos/Nosotros/Contacto) se pinta adentro de #admin-editor-canvas
// con las MISMAS funciones _dmRenderX(datos, root) de site-content.js que
// pintan el sitio real -- nunca se desalinea de cómo se ve publicado.
// Encima de ese HTML se engancha, por atributos data-*:
//   [data-c]        texto de un campo FIJO (no repetible) -- ruta = "<página>.<data-c>"
//   [data-c-item]   texto DENTRO de un elemento de una lista repetible
//                   -- ruta = "<data-lista del contenedor>.<data-item-idx>.<data-c-item>"
//   [data-foto-item]        ícono/foto de un elemento de lista (admite foto)
//   [data-foto-item-icono]  ídem pero solo ícono (stats/valores no admiten foto)
//   [data-lista]+[data-lista-tipo]  contenedor de una lista -- clic derecho: agregar
//   [data-item-idx] raíz de un elemento de lista -- clic derecho: subir/bajar/eliminar
// Estos atributos los agrega site-content.js al armar el HTML de cada
// lista -- un solo lugar sabe la "forma" de los datos, tanto para pintar
// el sitio real como para hacerlo editable acá.

const ADMIN_OWNER = 'juancamiloquinteroj-design';
const ADMIN_REPO = 'Pagina-Web-Dismelec';
const ADMIN_BRANCH = 'master';
const ADMIN_CONTENT_PATH = 'assets/data/content.json';

let ADMIN_STATE = { index: { hero: {}, cards: [] } };
let ADMIN_USER = null; // {uid, email, nombre, rol} del usuario logueado
let ADMIN_EDITOR_PAGINA = 'index';

function _adminRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}
function _adminSetRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  let o = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof o[partes[i]] !== 'object' || o[partes[i]] === null) o[partes[i]] = {};
    o = o[partes[i]];
  }
  o[partes[partes.length - 1]] = valor;
}

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
    document.getElementById('admin-quien').textContent = ADMIN_USER.nombre;
    document.getElementById('admin-rol-label').textContent = ADMIN_USER.rol === 'admin' ? 'Administrador' : ADMIN_USER.rol;
    document.getElementById('admin-avatar').textContent = _adminIniciales(ADMIN_USER.nombre);
    document.getElementById('admin-saludo-nombre').textContent = ADMIN_USER.nombre;
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

  // ---- accesos rápidos del Panel principal -- van al mismo módulo que
  // el botón correspondiente del menú lateral ----
  document.querySelectorAll('.admin-quicklink[data-ir]').forEach((btn) => {
    btn.addEventListener('click', () => adminIrAModulo(btn.dataset.ir));
  });

  // ---- campanita de notificaciones -- no hay sistema de notificaciones
  // real todavía, solo un mensaje fijo; se abre/cierra al clic y se
  // cierra si se hace clic afuera ----
  const notifBtn = document.getElementById('admin-notif-btn');
  const notifDrop = document.getElementById('admin-notif-drop');
  if (notifBtn && notifDrop) {
    notifBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      notifDrop.hidden = !notifDrop.hidden;
    });
    document.addEventListener('click', () => { notifDrop.hidden = true; });
  }

  // ---- buscador del topbar -- filtra los botones del menú lateral por
  // el texto visible, no busca dentro de cada módulo ----
  const buscador = document.getElementById('admin-buscar-modulo');
  if (buscador) {
    buscador.addEventListener('input', () => {
      const q = buscador.value.trim().toLowerCase();
      document.querySelectorAll('.admin-sidebar-link').forEach((link) => {
        link.style.display = !q || link.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  adminSetupNav();
});

function _adminIniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '--';
  return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
}

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
  // "Publicar cambios" solo tiene sentido en Parametrización -- en el
  // resto de los módulos no hay nada de content.json para publicar.
  const barraPublicar = document.querySelector('.admin-publish-bar');
  if (barraPublicar) barraPublicar.hidden = nombre !== 'parametrizacion';
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
    ADMIN_STATE = {};
  }
  // Por si algún campo/página todavía no existe en el JSON (sitio viejo o
  // primera vez) -- evita reventar con "Cannot read properties of
  // undefined" al leer/escribir cualquiera de los campos de abajo.
  ['index', 'servicios', 'proyectos', 'nosotros', 'contacto'].forEach((p) => { if (!ADMIN_STATE[p]) ADMIN_STATE[p] = {}; });
  if (!ADMIN_STATE.index.hero) ADMIN_STATE.index.hero = {};
  if (!ADMIN_STATE.servicios.hero) ADMIN_STATE.servicios.hero = {};
  if (!ADMIN_STATE.proyectos.hero) ADMIN_STATE.proyectos.hero = {};
  if (!ADMIN_STATE.nosotros.hero) ADMIN_STATE.nosotros.hero = {};
  if (!ADMIN_STATE.contacto.hero) ADMIN_STATE.contacto.hero = {};
  if (!Array.isArray(ADMIN_STATE.index.cards)) ADMIN_STATE.index.cards = [];
  if (!Array.isArray(ADMIN_STATE.index.stats)) ADMIN_STATE.index.stats = [];
  if (!Array.isArray(ADMIN_STATE.index.proyectosDestacados)) ADMIN_STATE.index.proyectosDestacados = [];
  if (!Array.isArray(ADMIN_STATE.servicios.items)) ADMIN_STATE.servicios.items = [];
  if (!Array.isArray(ADMIN_STATE.proyectos.items)) ADMIN_STATE.proyectos.items = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.valores)) ADMIN_STATE.nosotros.valores = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.timeline)) ADMIN_STATE.nosotros.timeline = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.stats)) ADMIN_STATE.nosotros.stats = [];

  if (!_adminListenersListos) {
    _adminListenersListos = true;
    document.getElementById('admin-publicar').addEventListener('click', adminPublicar);
    document.querySelectorAll('[data-editor-pagina]').forEach((btn) => {
      btn.addEventListener('click', () => adminMostrarPagina(btn.dataset.editorPagina));
    });
    document.getElementById('admin-editor-centrar').addEventListener('click', () => {
      const fotoEl = document.querySelector('#admin-editor-canvas .' + ADMIN_CLASE_FOTO_HERO[ADMIN_EDITOR_PAGINA]);
      if (!fotoEl) return;
      const pos = ADMIN_EDITOR_PAGINA === 'index' ? '50% 30%' : '50% 50%';
      ADMIN_STATE[ADMIN_EDITOR_PAGINA].hero.photoPos = pos;
      fotoEl.style.backgroundPosition = pos;
    });
    document.getElementById('admin-contacto-whatsapp').addEventListener('input', (ev) => { ADMIN_STATE.contacto.whatsapp = ev.target.value.trim(); });
    document.getElementById('admin-contacto-whatsappmensaje').addEventListener('input', (ev) => { ADMIN_STATE.contacto.whatsappMensaje = ev.target.value; });
  }

  document.getElementById('admin-contacto-whatsapp').value = ADMIN_STATE.contacto.whatsapp || '';
  document.getElementById('admin-contacto-whatsappmensaje').value = ADMIN_STATE.contacto.whatsappMensaje || '';

  adminMostrarPagina(ADMIN_EDITOR_PAGINA);
  adminCargarUsuarios();
}

// ============================================================ EDITOR VISUAL

// Esqueletos con las MISMAS clases de style.css que el sitio real --
// _dmRenderX(datos, root) de site-content.js los llena, así el editor
// nunca se desalinea de cómo se ve publicado.
const ADMIN_ESQUELETOS = {
  index: `
    <section class="hero" style="min-height:340px">
      <div class="hero-photo"></div>
      <div class="hero-tag-corner"></div>
      <div class="container"><div class="hero-inner">
        <h1 data-c="hero.title"></h1>
        <p class="lead" data-c="hero.lead"></p>
      </div></div>
    </section>
    <div class="container" style="margin-top:24px"><div class="feature-strip"></div></div>
    <section class="stats-bar section-tight" style="margin-top:32px">
      <div class="container stats-grid" id="index-stats"></div>
    </section>
    <section class="section"><div class="container">
      <div class="projects-head"><div class="section-head">
        <span class="eyebrow" data-c="proyectosSeccion.eyebrow"></span>
        <h2 data-c="proyectosSeccion.title"></h2>
        <p data-c="proyectosSeccion.desc"></p>
      </div></div>
      <div class="project-grid" id="index-proyectos-destacados"></div>
    </div></section>
    <section class="section-tight"><div class="container">
      <div class="cta-band">
        <div><h3 data-c="cta.title"></h3><p data-c="cta.desc"></p></div>
        <div class="cta-actions"><a href="#" class="btn btn-primary" data-c="cta.ctaText"></a></div>
      </div>
    </div></section>`,
  servicios: `
    <section class="page-hero" style="min-height:260px">
      <div class="page-hero-photo"></div>
      <div class="container">
        <span class="eyebrow" data-c="hero.eyebrow"></span>
        <h1 data-c="hero.title"></h1>
        <p data-c="hero.lead"></p>
      </div>
    </section>
    <section class="section"><div class="container" id="servicios-items"></div></section>
    <section class="section-tight"><div class="container">
      <div class="cta-band">
        <div><h3 data-c="cta.title"></h3><p data-c="cta.desc"></p></div>
        <div class="cta-actions"><a href="#" class="btn btn-primary" data-c="cta.ctaText"></a></div>
      </div>
    </div></section>`,
  proyectos: `
    <section class="page-hero" style="min-height:260px">
      <div class="page-hero-photo"></div>
      <div class="container">
        <span class="eyebrow" data-c="hero.eyebrow"></span>
        <h1 data-c="hero.title"></h1>
        <p data-c="hero.lead"></p>
      </div>
    </section>
    <section class="section"><div class="container">
      <div class="project-grid" id="proyectos-items"></div>
    </div></section>
    <section class="section-tight"><div class="container">
      <div class="cta-band">
        <div><h3 data-c="cta.title"></h3><p data-c="cta.desc"></p></div>
        <div class="cta-actions"><a href="#" class="btn btn-primary" data-c="cta.ctaText"></a></div>
      </div>
    </div></section>`,
  nosotros: `
    <section class="page-hero" style="min-height:260px">
      <div class="page-hero-photo"></div>
      <div class="container">
        <span class="eyebrow" data-c="hero.eyebrow"></span>
        <h1 data-c="hero.title"></h1>
        <p data-c="hero.lead"></p>
      </div>
    </section>
    <section class="section"><div class="container">
      <div class="values-grid" style="grid-template-columns:1fr 1fr">
        <div class="value-card">
          <div class="feature-icon">${dismelecIconSvg('mapa')}</div>
          <h3 data-c="mision.title"></h3><p data-c="mision.desc"></p>
        </div>
        <div class="value-card">
          <div class="feature-icon">${dismelecIconSvg('rayo')}</div>
          <h3 data-c="vision.title"></h3><p data-c="vision.desc"></p>
        </div>
      </div>
    </div></section>
    <section class="section" style="background:var(--bg-soft)">
      <div class="container"><div class="values-grid" id="nosotros-valores"></div></div>
    </section>
    <section class="section"><div class="container"><div class="timeline" id="nosotros-timeline"></div></div></section>
    <section class="stats-bar section-tight"><div class="container stats-grid" id="nosotros-stats"></div></section>
    <section class="section-tight"><div class="container">
      <div class="cta-band">
        <div><h3 data-c="cta.title"></h3><p data-c="cta.desc"></p></div>
        <div class="cta-actions"><a href="#" class="btn btn-primary" data-c="cta.ctaText"></a></div>
      </div>
    </div></section>`,
  contacto: `
    <section class="page-hero" style="min-height:260px">
      <div class="page-hero-photo"></div>
      <div class="container">
        <span class="eyebrow" data-c="hero.eyebrow"></span>
        <h1 data-c="hero.title"></h1>
        <p data-c="hero.lead"></p>
      </div>
    </section>
    <section class="section"><div class="container">
      <div class="contact-card" style="max-width:420px">
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('rayo')}</div>
          <div><strong>Teléfono / WhatsApp</strong><a href="#" data-c-tel data-c="telefono"></a></div>
        </div>
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('check')}</div>
          <div><strong>Correo electrónico</strong><a href="#" data-c-correo data-c="correo"></a></div>
        </div>
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('mapa')}</div>
          <div><strong>Oficina</strong><span data-c="info.oficina"></span></div>
        </div>
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('reloj')}</div>
          <div><strong>Horario de atención</strong><span data-c="info.horario"></span></div>
        </div>
      </div>
    </div></section>`,
};

const ADMIN_CLASE_FOTO_HERO = {
  index: 'hero-photo',
  servicios: 'page-hero-photo',
  proyectos: 'page-hero-photo',
  nosotros: 'page-hero-photo',
  contacto: 'page-hero-photo',
};

const ADMIN_RENDER_POR_PAGINA = {
  index: _dmRenderIndex, servicios: _dmRenderServicios, proyectos: _dmRenderProyectos,
  nosotros: _dmRenderNosotros, contacto: _dmRenderContacto,
};

const ADMIN_NUEVO_ITEM_POR_TIPO = {
  cards: () => ({ icon: 'rayo', title: 'Nueva tarjeta', desc: '', link: '#' }),
  proyectosDestacados: () => ({ icon: 'rayo', title: 'Nuevo proyecto', sub: '', link: 'proyectos.html' }),
  servicios: () => ({ icon: 'rayo', numero: '0', title: 'Nuevo servicio', desc: '', checks: '', ctaText: 'Cotizar este servicio', anchor: '' }),
  proyectos: () => ({ icon: 'rayo', title: 'Nuevo proyecto', sectorLabel: '', ubicacion: '', filtro: 'todos', anchor: '' }),
  valores: () => ({ icon: 'rayo', title: 'Nuevo valor', desc: '' }),
  timeline: () => ({ numero: '0', title: 'Nuevo paso', desc: '' }),
  stats: () => ({ icon: 'rayo', valor: '', label: '' }),
};
const ADMIN_ETIQUETA_POR_TIPO = {
  cards: 'tarjeta', proyectosDestacados: 'proyecto destacado', servicios: 'servicio',
  proyectos: 'proyecto', valores: 'valor', timeline: 'paso', stats: 'estadística',
};

// Cambiar de página en el editor -- reconstruye el canvas desde cero (esqueleto
// vacío + datos + TODOS los listeners), a diferencia de adminActualizarListasEnCanvas
// (más abajo) que solo repinta las listas tras agregar/quitar/reordenar.
function adminMostrarPagina(pagina) {
  ADMIN_EDITOR_PAGINA = pagina;
  document.querySelectorAll('[data-editor-pagina]').forEach((b) => b.classList.toggle('active', b.dataset.editorPagina === pagina));
  document.getElementById('admin-editor-campos-extra').hidden = pagina !== 'contacto';

  const canvas = document.getElementById('admin-editor-canvas');
  canvas.innerHTML = ADMIN_ESQUELETOS[pagina];
  adminRenderContenido(pagina);
  adminActivarEdicionListas(canvas, pagina);

  // Elementos FIJOS (título, lead, CTA, etc.) y la foto de portada -- se
  // cablean una sola vez por cambio de página, porque estos nodos NO se
  // recrean cuando se agrega/quita un elemento de una lista (a diferencia
  // de los nodos de listas, que sí, y por eso se recablean en
  // adminActivarEdicionListas cada vez que hace falta).
  canvas.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (a) ev.preventDefault();
  });
  canvas.querySelectorAll('[data-c]').forEach((el) => {
    adminHabilitarTextoEditable(el, () => `${pagina}.${el.dataset.c}`, () => adminPostGuardarTexto(el));
  });
  const tagEl = canvas.querySelector('.hero-tag-corner');
  if (tagEl) adminHabilitarEdicionMultilinea(tagEl, pagina);

  const fotoEl = canvas.querySelector('.' + ADMIN_CLASE_FOTO_HERO[pagina]);
  if (fotoEl) adminHabilitarFotoHeroInteractiva(fotoEl, pagina);
}

function adminRenderContenido(pagina) {
  const canvas = document.getElementById('admin-editor-canvas');
  ADMIN_RENDER_POR_PAGINA[pagina](ADMIN_STATE, canvas);
}

// Tras agregar/quitar/reordenar un elemento de lista, o cambiarle la
// foto/ícono -- vuelve a pintar (recrea los nodos de esa lista) y
// re-cablea SOLO los nodos de listas (los fijos ya están cableados y no
// se tocaron).
function adminActualizarListasEnCanvas() {
  const pagina = ADMIN_EDITOR_PAGINA;
  adminRenderContenido(pagina);
  const canvas = document.getElementById('admin-editor-canvas');
  adminActivarEdicionListas(canvas, pagina);
}

function adminActivarEdicionListas(canvas, pagina) {
  canvas.querySelectorAll('[data-c-item]').forEach((el) => {
    const itemEl = el.closest('[data-item-idx]');
    const listaEl = el.closest('[data-lista]');
    if (!itemEl || !listaEl) return;
    const ruta = `${listaEl.dataset.lista}.${itemEl.dataset.itemIdx}.${el.dataset.cItem}`;
    adminHabilitarTextoEditable(el, () => ruta, () => {});
  });
  canvas.querySelectorAll('[data-foto-item]').forEach((el) => adminHabilitarCambioFotoItem(el, true));
  canvas.querySelectorAll('[data-foto-item-icono]').forEach((el) => adminHabilitarCambioFotoItem(el, false));
  canvas.querySelectorAll('[data-lista]').forEach((el) => adminHabilitarMenuLista(el, pagina));
}

// ---------------------------------------------------- texto editable in-place
// Clic sobre cualquier letra -- pedido explícito ("si doy clic sobre
// letras pueda cambiar el texto"). contentEditable nativo del navegador;
// Enter/Escape confirman y sueltan el foco en vez de insertar un salto de
// línea real (los campos del JSON son de una sola línea -- ver hero.tag
// más abajo para el único caso que sí admite varias).
function adminHabilitarTextoEditable(el, rutaFn, alGuardar) {
  el.classList.add('admin-editable');
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (el.isContentEditable) return;
    el.contentEditable = 'true';
    el.classList.add('editando');
    el.focus();
    _adminSeleccionarTodo(el);

    const soltar = () => {
      el.contentEditable = 'false';
      el.classList.remove('editando');
      _adminSetRuta(ADMIN_STATE, rutaFn(), el.textContent.trim());
      el.removeEventListener('blur', soltar);
      el.removeEventListener('keydown', teclaAbajo);
      alGuardar();
    };
    const teclaAbajo = (kev) => {
      if (kev.key === 'Enter' || kev.key === 'Escape') { kev.preventDefault(); el.blur(); }
    };
    el.addEventListener('blur', soltar);
    el.addEventListener('keydown', teclaAbajo);
  });
}

function _adminSeleccionarTodo(el) {
  const seleccion = window.getSelection();
  const rango = document.createRange();
  rango.selectNodeContents(el);
  seleccion.removeAllRanges();
  seleccion.addRange(rango);
}

// El "tag" de la esquina de la portada (Inicio) es el único campo con
// varias líneas de verdad (se separan con <br> al pintarlo -- ver
// _dmRenderIndex en site-content.js), así que necesita su propio manejo
// en vez del genérico de arriba (que trata todo como una sola línea).
function adminHabilitarEdicionMultilinea(el, pagina) {
  el.classList.add('admin-editable');
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (el.isContentEditable) return;
    el.contentEditable = 'true';
    el.classList.add('editando');
    el.focus();
    _adminSeleccionarTodo(el);
    const soltar = () => {
      el.contentEditable = 'false';
      el.classList.remove('editando');
      const texto = el.innerText.replace(/\n{3,}/g, '\n\n').trim();
      ADMIN_STATE[pagina].hero.tag = texto;
      el.innerHTML = texto.split('\n').map((l) => _dmEsc(l)).join('<br>');
      el.removeEventListener('blur', soltar);
    };
    el.addEventListener('blur', soltar, { once: true });
  });
}

// Teléfono/correo de Contacto también arman un href (tel:/mailto:) además
// del texto visible -- tras guardar el texto hay que recalcular ese href.
function adminPostGuardarTexto(el) {
  if (el.hasAttribute('data-c-tel')) {
    const href = 'tel:' + (ADMIN_STATE.contacto.telefono || '').replace(/[^\d+]/g, '');
    document.querySelectorAll('#admin-editor-canvas [data-c-tel], #admin-editor-canvas [data-c-tel-href]').forEach((a) => { a.href = href; });
  }
  if (el.hasAttribute('data-c-correo')) {
    document.querySelectorAll('#admin-editor-canvas [data-c-correo]').forEach((a) => { a.href = 'mailto:' + (ADMIN_STATE.contacto.correo || ''); });
  }
}

// ------------------------------------------------------- foto de portada
// Arrastrar reposiciona (pedido explícito: "poder mover las imágenes para
// acomodarlas bien en su rango de visión"); un clic SIN arrastre (menos de
// 4px de movimiento) abre el selector de archivo para cambiar la foto --
// mismo elemento, dos gestos distintos.
function adminHabilitarFotoHeroInteractiva(fotoEl, pagina) {
  fotoEl.classList.add('admin-foto-arrastrable');
  fotoEl.title = 'Arrastrá para reposicionar -- clic para cambiar la foto';
  let activo = false;
  let movido = false;
  let posOrigen = { x: 50, y: 30 };
  let puntoOrigen = { x: 0, y: 0 };

  fotoEl.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    activo = true;
    movido = false;
    const [xA, yA] = ((ADMIN_STATE[pagina].hero.photoPos) || '50% 30%').replace(/%/g, '').trim().split(/\s+/).map(Number);
    posOrigen = { x: isNaN(xA) ? 50 : xA, y: isNaN(yA) ? 30 : yA };
    puntoOrigen = { x: ev.clientX, y: ev.clientY };
    fotoEl.setPointerCapture(ev.pointerId);
    fotoEl.classList.add('arrastrando');
  });
  fotoEl.addEventListener('pointermove', (ev) => {
    if (!activo) return;
    const dxPx = ev.clientX - puntoOrigen.x;
    const dyPx = ev.clientY - puntoOrigen.y;
    if (!movido && Math.hypot(dxPx, dyPx) > 4) movido = true;
    if (!movido) return;
    const rect = fotoEl.getBoundingClientRect();
    const dx = (dxPx / rect.width) * 100;
    const dy = (dyPx / rect.height) * 100;
    const x = Math.max(0, Math.min(100, posOrigen.x - dx));
    const y = Math.max(0, Math.min(100, posOrigen.y - dy));
    const pos = `${x.toFixed(0)}% ${y.toFixed(0)}%`;
    ADMIN_STATE[pagina].hero.photoPos = pos;
    fotoEl.style.backgroundPosition = pos;
  });
  const soltar = () => {
    const fueClick = activo && !movido;
    activo = false;
    fotoEl.classList.remove('arrastrando');
    if (fueClick) {
      adminAbrirInputArchivo((dataUrl, file) => {
        ADMIN_STATE[pagina].hero._nuevaFoto = { file, dataUrl };
        fotoEl.style.backgroundImage = `url('${dataUrl}')`;
      });
    }
  };
  fotoEl.addEventListener('pointerup', soltar);
  fotoEl.addEventListener('pointercancel', () => { activo = false; fotoEl.classList.remove('arrastrando'); });
}

function adminAbrirInputArchivo(cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result, file);
    reader.readAsDataURL(file);
  });
  input.click();
}

// ------------------------------------------------- foto/ícono de un ítem de lista
// Clic sobre el espacio de la foto -- pedido explícito ("clic sobre los
// espacios de imágenes pueda cambiar la imagen"). Abre un menú chico con
// "Subir foto" (si el tipo la admite) y la lista de íconos disponibles.
function adminHabilitarCambioFotoItem(el, permiteFoto) {
  el.classList.add('admin-foto-editable');
  el.title = permiteFoto ? 'Clic para cambiar la foto o el ícono' : 'Clic para cambiar el ícono';
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    adminAbrirSelectorFoto(el, permiteFoto);
  });
}

function _adminRutaItem(el) {
  const itemEl = el.closest('[data-item-idx]');
  const listaEl = el.closest('[data-lista]');
  if (!itemEl || !listaEl) return null;
  return `${listaEl.dataset.lista}.${itemEl.dataset.itemIdx}`;
}

function adminAbrirSelectorFoto(el, permiteFoto) {
  adminCerrarFlotantes();
  const ruta = _adminRutaItem(el);
  const item = ruta ? _adminRuta(ADMIN_STATE, ruta) : null;
  if (!item) return;

  const pop = document.createElement('div');
  pop.className = 'admin-popover-foto';
  const tieneFoto = !!(item.photo || item._nuevaFoto);
  const iconos = Object.entries(window.DISMELEC_ICONS).map(([id, info]) => `
    <button type="button" class="admin-popover-icono" data-icono="${id}" title="${_dmEsc(info.label)}">${dismelecIconSvg(id)}</button>`).join('');
  pop.innerHTML = `
    ${permiteFoto ? '<label class="btn btn-outline-dark btn-sm admin-popover-subir">Subir foto<input type="file" accept="image/*" hidden></label>' : ''}
    ${permiteFoto && tieneFoto ? '<button type="button" class="btn btn-outline-dark btn-sm" data-quitar-foto>Quitar foto (usar ícono)</button>' : ''}
    <div class="hint" style="margin:8px 0 4px">O elegí un ícono:</div>
    <div class="admin-popover-iconos">${iconos}</div>`;
  document.body.appendChild(pop);
  _adminPosicionarFlotante(pop, el);

  if (permiteFoto) {
    pop.querySelector('input[type=file]').addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        item._nuevaFoto = { file, dataUrl: reader.result };
        adminCerrarFlotantes();
        adminActualizarListasEnCanvas();
      };
      reader.readAsDataURL(file);
    });
    const quitarBtn = pop.querySelector('[data-quitar-foto]');
    if (quitarBtn) quitarBtn.addEventListener('click', () => {
      delete item.photo; delete item._nuevaFoto;
      adminCerrarFlotantes();
      adminActualizarListasEnCanvas();
    });
  }
  pop.querySelectorAll('[data-icono]').forEach((btn) => {
    btn.addEventListener('click', () => {
      item.icon = btn.dataset.icono;
      delete item.photo; delete item._nuevaFoto;
      adminCerrarFlotantes();
      adminActualizarListasEnCanvas();
    });
  });
  setTimeout(() => document.addEventListener('click', adminCerrarFlotantes, { once: true }), 0);
}

function _adminPosicionarFlotante(flotante, elAncla) {
  const rect = elAncla.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 6;
  let left = window.scrollX + rect.left;
  document.body.appendChild(flotante); // asegura medidas correctas antes de leer su ancho
  const anchoFlotante = flotante.offsetWidth;
  if (left + anchoFlotante > window.scrollX + document.documentElement.clientWidth - 10) {
    left = window.scrollX + document.documentElement.clientWidth - anchoFlotante - 10;
  }
  flotante.style.top = `${top}px`;
  flotante.style.left = `${Math.max(10, left)}px`;
}

function adminCerrarFlotantes() {
  document.querySelectorAll('.admin-popover-foto, .admin-menu-contextual').forEach((n) => n.remove());
}

// ----------------------------------------------------- listas: clic derecho
// Clic derecho sobre el contenedor de una lista (tarjetas, proyectos,
// servicios, valores, línea de tiempo, estadísticas) agrega un elemento
// nuevo -- pedido explícito ("clic derecho agregar nueva tarjetas"). Clic
// derecho sobre un elemento puntual, además, deja subirlo/bajarlo/
// eliminarlo.
function adminHabilitarMenuLista(listaEl, pagina) {
  listaEl.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const itemEl = ev.target.closest('[data-item-idx]');
    if (itemEl && listaEl.contains(itemEl)) adminMenuContextualItem(ev, listaEl, itemEl, pagina);
    else adminMenuContextualLista(ev, listaEl, pagina);
  });
}

function adminMenuContextualLista(ev, listaEl, pagina) {
  const tipo = listaEl.dataset.listaTipo;
  const ruta = listaEl.dataset.lista;
  const etiqueta = ADMIN_ETIQUETA_POR_TIPO[tipo] || 'elemento';
  _adminCrearMenu(ev, [
    { texto: `+ Agregar ${etiqueta}`, accion: () => {
      _adminRuta(ADMIN_STATE, ruta).push(ADMIN_NUEVO_ITEM_POR_TIPO[tipo]());
      adminActualizarListasEnCanvas();
    } },
  ]);
}

function adminMenuContextualItem(ev, listaEl, itemEl, pagina) {
  const tipo = listaEl.dataset.listaTipo;
  const ruta = listaEl.dataset.lista;
  const arr = _adminRuta(ADMIN_STATE, ruta);
  const idx = Number(itemEl.dataset.itemIdx);
  const etiqueta = ADMIN_ETIQUETA_POR_TIPO[tipo] || 'elemento';
  _adminCrearMenu(ev, [
    { texto: `+ Agregar ${etiqueta}`, accion: () => { arr.push(ADMIN_NUEVO_ITEM_POR_TIPO[tipo]()); adminActualizarListasEnCanvas(); } },
    { texto: '↑ Subir', deshabilitado: idx === 0, accion: () => { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; adminActualizarListasEnCanvas(); } },
    { texto: '↓ Bajar', deshabilitado: idx === arr.length - 1, accion: () => { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; adminActualizarListasEnCanvas(); } },
    { texto: '🗑 Eliminar', clase: 'danger', accion: () => {
      if (!confirm(`¿Eliminar este ${etiqueta}?`)) return;
      arr.splice(idx, 1);
      adminActualizarListasEnCanvas();
    } },
  ]);
}

function _adminCrearMenu(ev, opciones) {
  adminCerrarFlotantes();
  const menu = document.createElement('div');
  menu.className = 'admin-menu-contextual';
  menu.innerHTML = opciones.map((o, i) => `<button type="button" class="${o.clase || ''}" data-i="${i}" ${o.deshabilitado ? 'disabled' : ''}>${o.texto}</button>`).join('');
  document.body.appendChild(menu);
  menu.style.top = `${window.scrollY + ev.clientY}px`;
  menu.style.left = `${window.scrollX + ev.clientX}px`;
  menu.querySelectorAll('button').forEach((btn, i) => {
    if (opciones[i].deshabilitado) return;
    btn.addEventListener('click', () => { adminCerrarFlotantes(); opciones[i].accion(); });
  });
  setTimeout(() => document.addEventListener('click', adminCerrarFlotantes, { once: true }), 0);
  return menu;
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

// Sube la foto pendiente (item._nuevaFoto) de cada elemento de un
// arreglo que la tenga -- usado para tarjetas/proyectos/servicios y
// también para cada foto de portada (pasada como arreglo de 1 elemento).
// Deja el item.photo apuntando al archivo subido y borra el _nuevaFoto
// temporal para que no quede colgado en el JSON publicado.
async function adminSubirFotosPendientes(arr, prefijo, status, token) {
  if (!Array.isArray(arr)) return;
  for (const item of arr) {
    if (!item._nuevaFoto) continue;
    status.textContent = `Subiendo foto de ${prefijo}...`;
    const ext = (item._nuevaFoto.file.name.split('.').pop() || 'jpg').toLowerCase();
    const nombreArchivo = `assets/img/${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    await _ghSubirArchivo(nombreArchivo, _dataUrlABase64(item._nuevaFoto.dataUrl), `Sube foto de ${prefijo} (panel privado)`, token);
    item.photo = nombreArchivo;
    delete item._nuevaFoto;
  }
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
    await adminSubirFotosPendientes(ADMIN_STATE.index.cards, 'tarjeta', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.index.proyectosDestacados, 'proyecto-destacado', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.proyectos.items, 'proyecto', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.servicios.items, 'servicio', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.index.hero], 'portada-inicio', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.servicios.hero], 'portada-servicios', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.proyectos.hero], 'portada-proyectos', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.nosotros.hero], 'portada-nosotros', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.contacto.hero], 'portada-contacto', status, token);

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
