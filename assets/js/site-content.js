// DISMELEC -- pinta en cada página lo que venga de assets/data/content.json
// (textos, fotos, tarjetas). Si el fetch falla (sin conexión, archivo
// corrupto, etc.) el HTML estático que ya está en cada página queda tal
// cual -- esto es una mejora progresiva, nunca deja nada en blanco si algo
// sale mal.
//
// Convención: cualquier elemento con data-c="ruta.al.campo" recibe su
// textContent desde esa ruta dentro de la sección de la página actual
// (document.body.dataset.page) del JSON. Las listas repetibles (tarjetas,
// valores, proyectos, etc.) se re-generan a mano por página porque cada
// una tiene una estructura HTML distinta.

function _dmRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function _dmAplicarTextos(root, seccion) {
  root.querySelectorAll('[data-c]').forEach((el) => {
    const valor = _dmRuta(seccion, el.dataset.c);
    if (valor !== undefined && valor !== null && valor !== '') el.textContent = valor;
  });
}

function _dmAplicarContacto(root, seccion) {
  if (!seccion) return;
  if (seccion.telefono) {
    root.querySelectorAll('a[data-c-tel]').forEach((a) => {
      a.textContent = seccion.telefono;
      a.href = 'tel:' + seccion.telefono.replace(/[^\d+]/g, '');
    });
  }
  if (seccion.correo) {
    root.querySelectorAll('a[data-c-correo]').forEach((a) => {
      a.textContent = seccion.correo;
      a.href = 'mailto:' + seccion.correo;
    });
  }
  if (seccion.whatsapp) {
    root.querySelectorAll('a[data-c-whatsapp]').forEach((a) => {
      a.href = 'https://wa.me/' + seccion.whatsapp;
    });
  }
}

function _dmMarcarVisible(el) {
  el.querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));
}

// ---------------------------------------------------------------- Inicio
function _dmRenderIndex(datos) {
  const d = datos.index;
  if (!d) return;

  const heroPhoto = document.querySelector('.hero-photo');
  const heroTag = document.querySelector('.hero-tag-corner');
  if (d.hero) {
    if (heroPhoto && d.hero.photo) heroPhoto.style.backgroundImage = `url('${d.hero.photo}')`;
    if (heroTag && d.hero.tag) heroTag.innerHTML = d.hero.tag.split('\n').map((l) => _dmEsc(l)).join('<br>');
  }
  document.querySelectorAll('.hero').forEach((h) => _dmAplicarTextos(h, d));

  const cardsWrap = document.querySelector('.feature-strip');
  if (cardsWrap && Array.isArray(d.cards) && d.cards.length) {
    cardsWrap.innerHTML = d.cards.map((c) => `
      <a href="${_dmEsc(c.link || '#')}" class="feature-card reveal">
        <div class="feature-icon">${dismelecIconSvg(c.icon)}</div>
        <h3>${_dmEsc(c.title || '')}</h3>
        <p>${_dmEsc(c.desc || '')}</p>
        <span class="feature-more">Conocer más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
      </a>`).join('');
    _dmMarcarVisible(cardsWrap.parentElement);
  }

  const statsWrap = document.getElementById('index-stats');
  if (statsWrap && Array.isArray(d.stats) && d.stats.length) _dmPintarStats(statsWrap, d.stats);

  document.querySelectorAll('.projects-head').forEach((h) => _dmAplicarTextos(h, d));

  const destWrap = document.getElementById('index-proyectos-destacados');
  if (destWrap && Array.isArray(d.proyectosDestacados) && d.proyectosDestacados.length) {
    destWrap.innerHTML = d.proyectosDestacados.map((p) => `
      <a href="${_dmEsc(p.link || 'proyectos.html')}" class="project-card reveal">
        <div class="project-thumb">${dismelecIconSvg(p.icon, '1.6')}</div>
        <div class="project-body"><h4>${_dmEsc(p.title || '')}</h4><span>${_dmEsc(p.sub || '')}</span></div>
      </a>`).join('');
    _dmMarcarVisible(destWrap);
  }

  const ctaWrap = document.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

function _dmPintarStats(wrap, items) {
  wrap.innerHTML = items.map((s) => `
    <div class="stat-item">
      <div class="stat-icon">${dismelecIconSvg(s.icon)}</div>
      <div><strong>${_dmEsc(s.valor || '')}</strong><span>${_dmEsc(s.label || '')}</span></div>
    </div>`).join('');
}

// -------------------------------------------------------------- Servicios
function _dmRenderServicios(datos) {
  const d = datos.servicios;
  if (!d) return;

  document.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const wrap = document.getElementById('servicios-items');
  if (wrap && Array.isArray(d.items) && d.items.length) {
    wrap.innerHTML = d.items.map((it, idx) => {
      const checks = (it.checks || '').split('\n').filter(Boolean).map((linea) => `
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>${_dmEsc(linea)}</li>`).join('');
      const textoBloque = `
        <div>
          <span class="service-id">${_dmEsc(it.numero || '')}</span>
          <h2>${_dmEsc(it.title || '')}</h2>
          <p>${_dmEsc(it.desc || '')}</p>
          <ul class="service-check-list">${checks}</ul>
          <a href="contacto.html#formulario" class="btn btn-outline-dark btn-sm">${_dmEsc(it.ctaText || 'Cotizar este servicio')}</a>
        </div>`;
      const visual = `<div class="service-visual">${dismelecIconSvg(it.icon, '1.4')}</div>`;
      const idAttr = it.anchor ? ` id="${_dmEsc(it.anchor)}"` : '';
      return `<div class="service-block reveal"${idAttr}>${idx % 2 === 0 ? textoBloque + visual : visual + textoBloque}</div>`;
    }).join('');
    _dmMarcarVisible(wrap);
  }

  const ctaWrap = document.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// -------------------------------------------------------------- Proyectos
function _dmRenderProyectos(datos) {
  const d = datos.proyectos;
  if (!d) return;

  document.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const wrap = document.getElementById('proyectos-items');
  if (wrap && Array.isArray(d.items) && d.items.length) {
    wrap.innerHTML = d.items.map((p) => {
      const idAttr = p.anchor ? ` id="${_dmEsc(p.anchor)}"` : '';
      return `
      <a href="contacto.html" class="project-card reveal"${idAttr} data-sector="${_dmEsc(p.filtro || 'todos')}">
        <div class="project-thumb">${dismelecIconSvg(p.icon, '1.6')}</div>
        <div class="project-body"><h4>${_dmEsc(p.title || '')}</h4><span>${_dmEsc(p.sectorLabel || '')} · ${_dmEsc(p.ubicacion || '')}</span></div>
      </a>`;
    }).join('');
    _dmMarcarVisible(wrap);
  }

  const ctaWrap = document.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// --------------------------------------------------------------- Nosotros
function _dmRenderNosotros(datos) {
  const d = datos.nosotros;
  if (!d) return;

  document.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const misionEl = document.querySelector('[data-c="mision.title"]');
  const misionCard = misionEl && misionEl.closest('.value-card');
  if (misionCard) _dmAplicarTextos(misionCard, d);
  const visionEl = document.querySelector('[data-c="vision.title"]');
  const visionCard = visionEl && visionEl.closest('.value-card');
  if (visionCard) _dmAplicarTextos(visionCard, d);

  const valoresWrap = document.getElementById('nosotros-valores');
  if (valoresWrap && Array.isArray(d.valores) && d.valores.length) {
    valoresWrap.innerHTML = d.valores.map((v) => `
      <div class="value-card reveal">
        <div class="feature-icon">${dismelecIconSvg(v.icon)}</div>
        <h3>${_dmEsc(v.title || '')}</h3>
        <p>${_dmEsc(v.desc || '')}</p>
      </div>`).join('');
    _dmMarcarVisible(valoresWrap);
  }

  const timelineWrap = document.getElementById('nosotros-timeline');
  if (timelineWrap && Array.isArray(d.timeline) && d.timeline.length) {
    timelineWrap.innerHTML = d.timeline.map((t, idx) => `
      <div class="timeline-item reveal">
        <div class="t-year">${_dmEsc(t.numero || '')}</div>
        <div class="t-line"><div class="t-dot"></div>${idx < d.timeline.length - 1 ? '<div class="t-bar"></div>' : ''}</div>
        <div class="t-body"><h4>${_dmEsc(t.title || '')}</h4><p>${_dmEsc(t.desc || '')}</p></div>
      </div>`).join('');
    _dmMarcarVisible(timelineWrap);
  }

  const statsWrap = document.getElementById('nosotros-stats');
  if (statsWrap && Array.isArray(d.stats) && d.stats.length) _dmPintarStats(statsWrap, d.stats);

  const ctaWrap = document.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// --------------------------------------------------------------- Contacto
function _dmRenderContacto(datos) {
  const d = datos.contacto;
  if (!d) return;

  document.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));
  document.querySelectorAll('.contact-card').forEach((c) => {
    _dmAplicarTextos(c, d);
    _dmAplicarContacto(c, d);
  });

  const form = document.getElementById('form-contacto');
  if (form && d.correo) form.dataset.mailto = d.correo;
}

// ------------------------------------------------------------------ init
async function dismelecCargarContenido() {
  let datos;
  try {
    const res = await fetch('assets/data/content.json', { cache: 'no-store' });
    if (!res.ok) return;
    datos = await res.json();
  } catch (e) {
    return;
  }

  const pagina = document.body.dataset.page || 'index';
  if (pagina === 'index') _dmRenderIndex(datos);
  else if (pagina === 'servicios') _dmRenderServicios(datos);
  else if (pagina === 'proyectos') _dmRenderProyectos(datos);
  else if (pagina === 'nosotros') _dmRenderNosotros(datos);
  else if (pagina === 'contacto') _dmRenderContacto(datos);

  // El logo/WhatsApp del pie y el botón flotante son iguales en todas las
  // páginas -- si algún día tienen datos propios en content.json se
  // pintan acá también, pero por ahora quedan fijos (ver nota en la
  // conversación sobre alcance).
}

function _dmEsc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', dismelecCargarContenido);
