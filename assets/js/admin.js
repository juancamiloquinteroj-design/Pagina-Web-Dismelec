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

let ADMIN_STATE = { index: { hero: {}, cards: [] } };
let ADMIN_NUEVA_FOTO = null; // {file, dataUrl} si el usuario eligió una foto nueva
let ADMIN_USER = null; // {uid, email, nombre, rol} del usuario logueado
let ADMIN_LISTAS = {}; // wrapId -> {render} de cada lista genérica montada (ver adminMontarLista)

// Campos de texto simples (un input/textarea = un campo del JSON) -- id del
// elemento en el HTML es "admin-" + la clave de acá. Un solo mapa alcanza
// para cargar TODOS al abrir el panel y leerlos TODOS antes de publicar,
// sin repetir el mismo código a mano por cada página. Los 3 campos del
// hero del Inicio (admin-hero-tag/title/lead) quedan aparte -- ya tenían
// su propio manejo (el "tag" necesita aplanar el salto de línea al
// mostrarlo) y no hacía falta tocarlos.
const ADMIN_CAMPOS = {
  'index-proyseccion-eyebrow': 'index.proyectosSeccion.eyebrow',
  'index-proyseccion-title': 'index.proyectosSeccion.title',
  'index-proyseccion-desc': 'index.proyectosSeccion.desc',
  'index-cta-title': 'index.cta.title',
  'index-cta-desc': 'index.cta.desc',
  'index-cta-ctatext': 'index.cta.ctaText',
  'servicios-hero-eyebrow': 'servicios.hero.eyebrow',
  'servicios-hero-title': 'servicios.hero.title',
  'servicios-hero-lead': 'servicios.hero.lead',
  'servicios-cta-title': 'servicios.cta.title',
  'servicios-cta-desc': 'servicios.cta.desc',
  'servicios-cta-ctatext': 'servicios.cta.ctaText',
  'proyectos-hero-eyebrow': 'proyectos.hero.eyebrow',
  'proyectos-hero-title': 'proyectos.hero.title',
  'proyectos-hero-lead': 'proyectos.hero.lead',
  'proyectos-cta-title': 'proyectos.cta.title',
  'proyectos-cta-desc': 'proyectos.cta.desc',
  'proyectos-cta-ctatext': 'proyectos.cta.ctaText',
  'nosotros-hero-eyebrow': 'nosotros.hero.eyebrow',
  'nosotros-hero-title': 'nosotros.hero.title',
  'nosotros-hero-lead': 'nosotros.hero.lead',
  'nosotros-mision-title': 'nosotros.mision.title',
  'nosotros-mision-desc': 'nosotros.mision.desc',
  'nosotros-vision-title': 'nosotros.vision.title',
  'nosotros-vision-desc': 'nosotros.vision.desc',
  'nosotros-cta-title': 'nosotros.cta.title',
  'nosotros-cta-desc': 'nosotros.cta.desc',
  'nosotros-cta-ctatext': 'nosotros.cta.ctaText',
  'contacto-hero-eyebrow': 'contacto.hero.eyebrow',
  'contacto-hero-title': 'contacto.hero.title',
  'contacto-hero-lead': 'contacto.hero.lead',
  'contacto-telefono': 'contacto.telefono',
  'contacto-whatsapp': 'contacto.whatsapp',
  'contacto-correo': 'contacto.correo',
  'contacto-info-oficina': 'contacto.info.oficina',
  'contacto-info-horario': 'contacto.info.horario',
};

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
function adminCargarCamposSimples() {
  Object.entries(ADMIN_CAMPOS).forEach(([id, ruta]) => {
    const el = document.getElementById('admin-' + id);
    if (el) el.value = _adminRuta(ADMIN_STATE, ruta) || '';
  });
}
function adminLeerCamposSimples() {
  Object.entries(ADMIN_CAMPOS).forEach(([id, ruta]) => {
    const el = document.getElementById('admin-' + id);
    if (el) _adminSetRuta(ADMIN_STATE, ruta, el.value.trim());
  });
}

// Además de leerse recién al publicar (arriba), cada campo simple
// (incluidos los 3 del hero del Inicio, que van aparte) también
// actualiza ADMIN_STATE y la vista previa EN VIVO, mientras se escribe --
// pedido explícito ("como si fuera una copia de la página con edición de
// campos"). Se cablea una sola vez (guardado por _adminListenersListos en
// el llamador).
function adminVincularCamposEnVivo() {
  const camposHero = { 'hero-title': 'index.hero.title', 'hero-lead': 'index.hero.lead' };
  Object.entries({ ...ADMIN_CAMPOS, ...camposHero }).forEach(([id, ruta]) => {
    const el = document.getElementById('admin-' + id);
    if (!el) return;
    el.addEventListener('input', () => {
      _adminSetRuta(ADMIN_STATE, ruta, el.value);
      adminActualizarVistasPrevias();
    });
  });
  // El "tag" de la esquina es texto con saltos de línea aplanados a
  // espacios en la caja (ver adminIniciarPanel) -- no pasa por el mapa
  // genérico de arriba porque necesita ese tratamiento especial.
  const tagEl = document.getElementById('admin-hero-tag');
  if (tagEl) {
    tagEl.addEventListener('input', () => {
      ADMIN_STATE.index.hero.tag = tagEl.value;
      adminActualizarVistasPrevias();
    });
  }
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
  if (!Array.isArray(ADMIN_STATE.index.cards)) ADMIN_STATE.index.cards = [];
  if (!Array.isArray(ADMIN_STATE.index.stats)) ADMIN_STATE.index.stats = [];
  if (!Array.isArray(ADMIN_STATE.index.proyectosDestacados)) ADMIN_STATE.index.proyectosDestacados = [];
  if (!Array.isArray(ADMIN_STATE.servicios.items)) ADMIN_STATE.servicios.items = [];
  if (!Array.isArray(ADMIN_STATE.proyectos.items)) ADMIN_STATE.proyectos.items = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.valores)) ADMIN_STATE.nosotros.valores = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.timeline)) ADMIN_STATE.nosotros.timeline = [];
  if (!Array.isArray(ADMIN_STATE.nosotros.stats)) ADMIN_STATE.nosotros.stats = [];

  document.getElementById('admin-hero-tag').value = (ADMIN_STATE.index.hero.tag || '').replace(/\n/g, ' ');
  document.getElementById('admin-hero-title').value = ADMIN_STATE.index.hero.title || '';
  document.getElementById('admin-hero-lead').value = ADMIN_STATE.index.hero.lead || '';
  if (ADMIN_STATE.index.hero.photo) document.getElementById('admin-photo-preview').src = ADMIN_STATE.index.hero.photo;
  if (ADMIN_STATE.servicios.hero.photo) document.getElementById('admin-servicios-photo-preview').src = ADMIN_STATE.servicios.hero.photo;
  adminCargarCamposSimples();

  if (!_adminListenersListos) {
    _adminListenersListos = true;
    document.getElementById('admin-photo-input').addEventListener('change', onAdminFotoElegida);
    document.getElementById('admin-servicios-photo-input').addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        ADMIN_STATE.servicios.hero._nuevaFoto = { file, dataUrl: reader.result };
        document.getElementById('admin-servicios-photo-preview').src = reader.result;
        // Igual que con la foto del hero del Inicio -- la vista previa usa
        // el dataURL directo, ADMIN_STATE.servicios.hero.photo recién se
        // actualiza al publicar (ahí es cuando existe una URL real).
        const prev = document.getElementById('admin-preview-servicios');
        const foto = prev && prev.querySelector('.page-hero-photo');
        if (foto) foto.style.backgroundImage = `url('${reader.result}')`;
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('admin-card-agregar').addEventListener('click', () => {
      ADMIN_STATE.index.cards.push({ icon: 'rayo', title: 'Nueva tarjeta', desc: '', link: '' });
      adminRenderCards();
    });
    document.getElementById('admin-publicar').addEventListener('click', adminPublicar);
    adminMontarTodasLasListas();
    adminMontarVistasPrevias();
    adminVincularCamposEnVivo();
  }

  adminRenderCards();
  Object.values(ADMIN_LISTAS).forEach((l) => l.render());
  adminActualizarVistasPrevias();
  adminCargarUsuarios();
}

// Une los 7 arreglos nuevos (estadísticas, proyectos, servicios, valores,
// línea de tiempo...) al mismo componente genérico -- una sola
// implementación de "agregar/quitar/reordenar/editar campos" en vez de
// repetirla 7 veces con pequeñas variaciones.
function adminMontarTodasLasListas() {
  const campoIcono = { key: 'icon', tipo: 'icon' };
  const campoFoto = { key: 'photo', label: 'Foto (opcional, reemplaza el ícono)', tipo: 'foto' };

  ADMIN_LISTAS.indexStats = adminMontarLista({
    wrapId: 'admin-index-stats-list', addBtnId: 'admin-index-stats-agregar',
    getArr: () => ADMIN_STATE.index.stats,
    nuevo: () => ({ icon: 'rayo', valor: '', label: '' }),
    campos: [campoIcono, { key: 'valor', label: 'Número / valor grande', tipo: 'text' }, { key: 'label', label: 'Texto debajo', tipo: 'text' }],
  });
  ADMIN_LISTAS.indexDestacados = adminMontarLista({
    wrapId: 'admin-index-destacados-list', addBtnId: 'admin-index-destacados-agregar',
    getArr: () => ADMIN_STATE.index.proyectosDestacados,
    nuevo: () => ({ icon: 'rayo', title: 'Nuevo proyecto', sub: '', link: 'proyectos.html' }),
    campos: [campoIcono, campoFoto, { key: 'title', label: 'Título', tipo: 'text' }, { key: 'sub', label: 'Subtítulo (sector · ubicación)', tipo: 'text' }, { key: 'link', label: 'Enlace', tipo: 'text' }],
  });
  ADMIN_LISTAS.serviciosItems = adminMontarLista({
    wrapId: 'admin-servicios-items-list', addBtnId: 'admin-servicios-items-agregar',
    getArr: () => ADMIN_STATE.servicios.items,
    nuevo: () => ({ icon: 'rayo', numero: '0', title: 'Nuevo servicio', desc: '', checks: '', ctaText: 'Cotizar este servicio', anchor: '' }),
    campos: [
      campoIcono, campoFoto, { key: 'numero', label: 'Número (01, 02...)', tipo: 'text' }, { key: 'title', label: 'Título', tipo: 'text' },
      { key: 'desc', label: 'Descripción', tipo: 'textarea' }, { key: 'checks', label: 'Lista de checks', tipo: 'lineas' },
      { key: 'ctaText', label: 'Texto del botón', tipo: 'text' }, { key: 'anchor', label: 'Ancla (para enlaces #ancla, sin espacios)', tipo: 'text' },
    ],
  });
  ADMIN_LISTAS.proyectosItems = adminMontarLista({
    wrapId: 'admin-proyectos-items-list', addBtnId: 'admin-proyectos-items-agregar',
    getArr: () => ADMIN_STATE.proyectos.items,
    nuevo: () => ({ icon: 'rayo', title: 'Nuevo proyecto', sectorLabel: '', ubicacion: '', filtro: 'todos', anchor: '' }),
    campos: [
      campoIcono, campoFoto, { key: 'title', label: 'Título', tipo: 'text' }, { key: 'sectorLabel', label: 'Sector (ej: Sector industrial)', tipo: 'text' },
      { key: 'ubicacion', label: 'Ubicación', tipo: 'text' },
      { key: 'filtro', label: 'Filtro (todos / industrial / infraestructura / comercial / institucional)', tipo: 'text' },
      { key: 'anchor', label: 'Ancla (opcional, sin espacios)', tipo: 'text' },
    ],
  });
  ADMIN_LISTAS.nosotrosValores = adminMontarLista({
    wrapId: 'admin-nosotros-valores-list', addBtnId: 'admin-nosotros-valores-agregar',
    getArr: () => ADMIN_STATE.nosotros.valores,
    nuevo: () => ({ icon: 'rayo', title: 'Nuevo valor', desc: '' }),
    campos: [campoIcono, { key: 'title', label: 'Título', tipo: 'text' }, { key: 'desc', label: 'Descripción', tipo: 'textarea' }],
  });
  ADMIN_LISTAS.nosotrosTimeline = adminMontarLista({
    wrapId: 'admin-nosotros-timeline-list', addBtnId: 'admin-nosotros-timeline-agregar',
    getArr: () => ADMIN_STATE.nosotros.timeline,
    nuevo: () => ({ numero: '0', title: 'Nuevo paso', desc: '' }),
    campos: [{ key: 'numero', label: 'Número (01, 02...)', tipo: 'text' }, { key: 'title', label: 'Título', tipo: 'text' }, { key: 'desc', label: 'Descripción', tipo: 'textarea' }],
  });
  ADMIN_LISTAS.nosotrosStats = adminMontarLista({
    wrapId: 'admin-nosotros-stats-list', addBtnId: 'admin-nosotros-stats-agregar',
    getArr: () => ADMIN_STATE.nosotros.stats,
    nuevo: () => ({ icon: 'rayo', valor: '', label: '' }),
    campos: [campoIcono, { key: 'valor', label: 'Número / valor grande', tipo: 'text' }, { key: 'label', label: 'Texto debajo', tipo: 'text' }],
  });
}

// ------------------------------------------------ vista previa en vivo
// Pedido explícito: "que en el portal privado sea como la misma página
// web... como si fuera una copia de la página web pero con edición de
// campos". Cada tarjeta "Vista previa en vivo" del panel tiene adentro
// una copia MUY reducida del HTML real de esa sección (mismas clases de
// style.css) -- vacía al cargar, la llenan las mismas funciones
// _dmRenderX(datos, root) de site-content.js que pintan el sitio real
// (con un "root" propio en vez de document), así que nunca se desalinean.
const ADMIN_ESQUELETOS = {
  index: `
    <section class="hero" style="min-height:260px">
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
    <section class="page-hero">
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
    <section class="page-hero"><div class="container">
      <span class="eyebrow" data-c="hero.eyebrow"></span>
      <h1 data-c="hero.title"></h1>
      <p data-c="hero.lead"></p>
    </div></section>
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
    <section class="page-hero"><div class="container">
      <span class="eyebrow" data-c="hero.eyebrow"></span>
      <h1 data-c="hero.title"></h1>
      <p data-c="hero.lead"></p>
    </div></section>
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
    <section class="page-hero"><div class="container">
      <span class="eyebrow" data-c="hero.eyebrow"></span>
      <h1 data-c="hero.title"></h1>
      <p data-c="hero.lead"></p>
    </div></section>
    <section class="section"><div class="container">
      <div class="contact-card" style="max-width:420px">
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('rayo')}</div>
          <div><strong>Teléfono / WhatsApp</strong><a href="#" data-c-tel></a></div>
        </div>
        <div class="contact-item">
          <div class="feature-icon">${dismelecIconSvg('check')}</div>
          <div><strong>Correo electrónico</strong><a href="#" data-c-correo></a></div>
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

// ids de los contenedores de vista previa que hay en admin.html -- "index"
// tiene 2 copias (pestañas Portada e Inicio-mas), el resto 1 cada uno.
const ADMIN_PREVIEW_IDS = {
  index: ['admin-preview-index-a', 'admin-preview-index-b'],
  servicios: ['admin-preview-servicios'],
  proyectos: ['admin-preview-proyectos'],
  nosotros: ['admin-preview-nosotros'],
  contacto: ['admin-preview-contacto'],
};

function adminMontarVistasPrevias() {
  Object.entries(ADMIN_PREVIEW_IDS).forEach(([pagina, ids]) => {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = ADMIN_ESQUELETOS[pagina];
    });
  });
}

function adminActualizarVistasPrevias() {
  ADMIN_PREVIEW_IDS.index.forEach((id) => {
    const el = document.getElementById(id);
    if (el) _dmRenderIndex(ADMIN_STATE, el);
  });
  ADMIN_PREVIEW_IDS.servicios.forEach((id) => {
    const el = document.getElementById(id);
    if (el) _dmRenderServicios(ADMIN_STATE, el);
  });
  ADMIN_PREVIEW_IDS.proyectos.forEach((id) => {
    const el = document.getElementById(id);
    if (el) _dmRenderProyectos(ADMIN_STATE, el);
  });
  ADMIN_PREVIEW_IDS.nosotros.forEach((id) => {
    const el = document.getElementById(id);
    if (el) _dmRenderNosotros(ADMIN_STATE, el);
  });
  ADMIN_PREVIEW_IDS.contacto.forEach((id) => {
    const el = document.getElementById(id);
    if (el) _dmRenderContacto(ADMIN_STATE, el);
  });
}

// ------------------------------------------------- componente genérico de lista
// Un solo lugar que sabe pintar filas editables (con selector de ícono
// opcional), agregar, quitar y reordenar -- parametrizado por qué campos
// tiene cada fila. Las tarjetas del Inicio (adminRenderCards, arriba) NO
// pasan por acá a propósito -- ya funcionaban probadas con su propia
// vista previa en vivo, y tocarlas de nuevo solo agregaba riesgo sin
// necesidad real.
function adminMontarLista(cfg) {
  const wrap = document.getElementById(cfg.wrapId);
  if (!wrap) return { render() {} };

  function fila(item, idx) {
    const campos = cfg.campos.map((c) => _adminCampoHTML(c, item[c.key], item)).join('');
    return `
      <div class="admin-card-item" data-idx="${idx}">
        <div class="admin-card-item-top">
          <strong>Elemento ${idx + 1}</strong>
          <div class="admin-card-actions">
            <button type="button" class="admin-icon-btn" data-accion="up" title="Subir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
            <button type="button" class="admin-icon-btn" data-accion="down" title="Bajar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></button>
            <button type="button" class="admin-icon-btn danger" data-accion="remove" title="Quitar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg></button>
          </div>
        </div>
        ${campos}
      </div>`;
  }

  function render() {
    wrap.innerHTML = cfg.getArr().map(fila).join('');
    adminActualizarVistasPrevias();
  }

  wrap.addEventListener('input', (ev) => {
    const key = ev.target.dataset.key;
    const filaEl = ev.target.closest('[data-idx]');
    if (!key || !filaEl || ev.target.tagName === 'SELECT') return;
    cfg.getArr()[Number(filaEl.dataset.idx)][key] = ev.target.value;
  });
  wrap.addEventListener('change', (ev) => {
    if (ev.target.tagName !== 'SELECT') return;
    const key = ev.target.dataset.key;
    const filaEl = ev.target.closest('[data-idx]');
    if (!key || !filaEl) return;
    cfg.getArr()[Number(filaEl.dataset.idx)][key] = ev.target.value;
    const preview = filaEl.querySelector('[data-icon-preview]');
    if (preview) preview.innerHTML = dismelecIconSvg(ev.target.value);
  });
  wrap.addEventListener('change', (ev) => {
    if (ev.target.tagName !== 'INPUT' || ev.target.type !== 'file') return;
    const key = ev.target.dataset.key;
    const filaEl = ev.target.closest('[data-idx]');
    const file = ev.target.files[0];
    if (!key || !filaEl || !file) return;
    const idx = Number(filaEl.dataset.idx);
    const reader = new FileReader();
    reader.onload = () => {
      cfg.getArr()[idx]._nuevaFoto = { file, dataUrl: reader.result };
      render();
    };
    reader.readAsDataURL(file);
  });
  wrap.addEventListener('click', (ev) => {
    const quitar = ev.target.closest('[data-accion-foto="quitar"]');
    if (quitar) {
      const filaEl = quitar.closest('[data-idx]');
      const item = cfg.getArr()[Number(filaEl.dataset.idx)];
      delete item._nuevaFoto;
      delete item.photo;
      render();
      return;
    }
    const btn = ev.target.closest('[data-accion]');
    if (!btn) return;
    const filaEl = btn.closest('[data-idx]');
    const idx = Number(filaEl.dataset.idx);
    const arr = cfg.getArr();
    if (btn.dataset.accion === 'up') {
      if (idx === 0) return;
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      render();
    } else if (btn.dataset.accion === 'down') {
      if (idx === arr.length - 1) return;
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      render();
    } else if (btn.dataset.accion === 'remove') {
      if (!confirm('¿Quitar este elemento?')) return;
      arr.splice(idx, 1);
      render();
    }
  });
  if (cfg.addBtnId) {
    const addBtn = document.getElementById(cfg.addBtnId);
    if (addBtn) addBtn.addEventListener('click', () => { cfg.getArr().push(cfg.nuevo()); render(); });
  }

  render();
  return { render };
}

function _adminCampoHTML(campo, valor, item) {
  const val = valor === undefined || valor === null ? '' : valor;
  if (campo.tipo === 'foto') {
    const fotoUrl = (item && item._nuevaFoto && item._nuevaFoto.dataUrl) || val;
    const previewHtml = fotoUrl
      ? `<img src="${fotoUrl}" style="width:44px;height:44px;object-fit:cover;border-radius:9px;flex:none">`
      : `<div class="preview" data-icon-preview>${dismelecIconSvg(item && item.icon)}</div>`;
    return `<div class="admin-field">
      <label>${campo.label}</label>
      <div class="admin-icon-picker">
        ${previewHtml}
        <input type="file" accept="image/*" data-key="${campo.key}">
        ${fotoUrl ? `<button type="button" class="admin-icon-btn danger" data-accion-foto="quitar" title="Quitar foto">×</button>` : ''}
      </div>
      <div class="hint">PNG o JPG. Si no subís nada, se usa el ícono de arriba.</div>
    </div>`;
  }
  if (campo.tipo === 'icon') {
    const opciones = Object.entries(window.DISMELEC_ICONS).map(([id, info]) =>
      `<option value="${id}" ${id === val ? 'selected' : ''}>${info.label}</option>`).join('');
    return `<div class="admin-field">
      <label>Ícono</label>
      <div class="admin-icon-picker">
        <div class="preview" data-icon-preview>${dismelecIconSvg(val)}</div>
        <select data-key="${campo.key}">${opciones}</select>
      </div>
    </div>`;
  }
  if (campo.tipo === 'textarea' || campo.tipo === 'lineas') {
    const hint = campo.tipo === 'lineas' ? '<div class="hint">Una por línea.</div>' : '';
    return `<div class="admin-field">
      <label>${campo.label}</label>
      <textarea data-key="${campo.key}">${_dmEsc(val)}</textarea>
      ${hint}
    </div>`;
  }
  return `<div class="admin-field">
    <label>${campo.label}</label>
    <input type="text" data-key="${campo.key}" value="${_dmEsc(val)}">
  </div>`;
}

function onAdminFotoElegida(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    ADMIN_NUEVA_FOTO = { file, dataUrl: reader.result };
    document.getElementById('admin-photo-preview').src = reader.result;
    // La vista previa en vivo usa el dataURL directo -- ADMIN_STATE.index.hero.photo
    // recién se actualiza al publicar (ahí es cuando existe una URL real).
    ADMIN_PREVIEW_IDS.index.forEach((id) => {
      const el = document.getElementById(id);
      const foto = el && el.querySelector('.hero-photo');
      if (foto) foto.style.backgroundImage = `url('${reader.result}')`;
    });
  };
  reader.readAsDataURL(file);
}

function adminRenderCards() {
  const wrap = document.getElementById('admin-cards-list');
  const tpl = document.getElementById('admin-card-template');
  wrap.innerHTML = '';
  ADMIN_STATE.index.cards.forEach((card, idx) => {
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

    const fotoPreview = node.querySelector('[data-foto-preview]');
    const fotoInput = node.querySelector('[data-foto-input]');
    const fotoQuitar = node.querySelector('[data-foto-quitar]');
    const refrescarFoto = () => {
      const url = (card._nuevaFoto && card._nuevaFoto.dataUrl) || card.photo;
      fotoPreview.src = url || '';
      fotoPreview.hidden = !url;
      preview.hidden = !!url;
      fotoQuitar.hidden = !url;
    };
    refrescarFoto();
    fotoInput.addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        card._nuevaFoto = { file, dataUrl: reader.result };
        refrescarFoto();
        adminRenderPreview();
      };
      reader.readAsDataURL(file);
    });
    fotoQuitar.addEventListener('click', () => {
      delete card._nuevaFoto;
      delete card.photo;
      fotoInput.value = '';
      refrescarFoto();
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
      [ADMIN_STATE.index.cards[idx - 1], ADMIN_STATE.index.cards[idx]] = [ADMIN_STATE.index.cards[idx], ADMIN_STATE.index.cards[idx - 1]];
      adminRenderCards();
    });
    node.querySelector('[data-mover=down]').addEventListener('click', () => {
      if (idx === ADMIN_STATE.index.cards.length - 1) return;
      [ADMIN_STATE.index.cards[idx + 1], ADMIN_STATE.index.cards[idx]] = [ADMIN_STATE.index.cards[idx], ADMIN_STATE.index.cards[idx + 1]];
      adminRenderCards();
    });
    node.querySelector('[data-mover=remove]').addEventListener('click', () => {
      if (!confirm('¿Quitar esta tarjeta?')) return;
      ADMIN_STATE.index.cards.splice(idx, 1);
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
  wrap.innerHTML = ADMIN_STATE.index.cards.map(c => {
    const fotoUrl = (c._nuevaFoto && c._nuevaFoto.dataUrl) || c.photo;
    const icono = fotoUrl ? `<img src="${fotoUrl}" class="feature-icon-img">` : dismelecIconSvg(c.icon);
    return `
    <div class="feature-card">
      <div class="feature-icon">${icono}</div>
      <div class="feature-body">
        <h3>${c.title || '(sin título)'}</h3>
        <p>${c.desc || ''}</p>
        <span class="feature-more">Conocer más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
      </div>
    </div>`;
  }).join('');
  adminActualizarVistasPrevias();
}

function adminLeerFormularioHero() {
  ADMIN_STATE.index.hero.tag = document.getElementById('admin-hero-tag').value.trim();
  ADMIN_STATE.index.hero.title = document.getElementById('admin-hero-title').value.trim();
  ADMIN_STATE.index.hero.lead = document.getElementById('admin-hero-lead').value.trim();
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
// arreglo que la tenga -- usado para tarjetas/proyectos/servicios, no
// solo para la foto de portada (que va aparte, es un campo único). Deja
// el item.photo apuntando al archivo subido y borra el _nuevaFoto
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
    adminLeerFormularioHero();
    adminLeerCamposSimples();

    if (ADMIN_NUEVA_FOTO) {
      status.textContent = 'Subiendo foto nueva...';
      const ext = (ADMIN_NUEVA_FOTO.file.name.split('.').pop() || 'jpg').toLowerCase();
      const nombreArchivo = `assets/img/foto-portada-${Date.now()}.${ext}`;
      await _ghSubirArchivo(nombreArchivo, _dataUrlABase64(ADMIN_NUEVA_FOTO.dataUrl), 'Actualiza foto de portada (panel privado)', token);
      ADMIN_STATE.index.hero.photo = nombreArchivo;
      ADMIN_NUEVA_FOTO = null;
    }

    await adminSubirFotosPendientes(ADMIN_STATE.index.cards, 'tarjeta', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.index.proyectosDestacados, 'proyecto-destacado', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.proyectos.items, 'proyecto', status, token);
    await adminSubirFotosPendientes(ADMIN_STATE.servicios.items, 'servicio', status, token);
    await adminSubirFotosPendientes([ADMIN_STATE.servicios.hero], 'portada-servicios', status, token);

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
