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
//
// Cada _dmRenderX(datos, root) acepta un "root" opcional (por defecto
// document) -- esto es lo que permite reusar EXACTAMENTE este mismo
// código para pintar la página real Y la vista previa en vivo del panel
// privado (admin.html tiene una copia del HTML de cada página adentro de
// una tarjeta "Vista previa"; admin.js llama a estas mismas funciones
// pasándole ese contenedor en vez de document). Un solo lugar que sabe
// convertir content.json en HTML, para que la vista previa nunca se
// desalinee de cómo se ve el sitio real.

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
    const telHref = 'tel:' + seccion.telefono.replace(/[^\d+]/g, '');
    root.querySelectorAll('a[data-c-tel]').forEach((a) => {
      a.textContent = seccion.telefono;
      a.href = telHref;
    });
    // Botones con label propio (ej. "Llamar ahora") -- solo cambia el
    // destino, no el texto visible.
    root.querySelectorAll('a[data-c-tel-href]').forEach((a) => { a.href = telHref; });
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

// ---------------------------------------------------------------- Inicio
function _dmRenderIndex(datos, root) {
  root = root || document;
  const d = datos.index;
  if (!d) return;

  const heroPhoto = root.querySelector('.hero-photo');
  const heroTag = root.querySelector('.hero-tag-corner');
  if (d.hero) {
    if (heroPhoto && d.hero.photo) heroPhoto.style.backgroundImage = `url('${d.hero.photo}')`;
    if (heroTag && d.hero.tag) heroTag.innerHTML = d.hero.tag.split('\n').map((l) => _dmEsc(l)).join('<br>');
  }
  root.querySelectorAll('.hero').forEach((h) => _dmAplicarTextos(h, d));

  const cardsWrap = root.querySelector('.feature-strip');
  if (cardsWrap && Array.isArray(d.cards) && d.cards.length) {
    cardsWrap.innerHTML = d.cards.map((c) => `
      <a href="${_dmEsc(c.link || '#')}" class="feature-card reveal in">
        <div class="feature-icon">${_dmIconoOFoto(c)}</div>
        <div class="feature-body">
          <h3>${_dmEsc(c.title || '')}</h3>
          <p>${_dmEsc(c.desc || '')}</p>
          <span class="feature-more">Conocer más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
        </div>
      </a>`).join('');
  }

  const statsWrap = root.querySelector('#index-stats');
  if (statsWrap && Array.isArray(d.stats) && d.stats.length) _dmPintarStats(statsWrap, d.stats);

  root.querySelectorAll('.projects-head').forEach((h) => _dmAplicarTextos(h, d));

  const destWrap = root.querySelector('#index-proyectos-destacados');
  if (destWrap && Array.isArray(d.proyectosDestacados) && d.proyectosDestacados.length) {
    destWrap.innerHTML = d.proyectosDestacados.map((p) => `
      <a href="${_dmEsc(p.link || 'proyectos.html')}" class="project-card reveal in">
        <div class="project-thumb">${_dmIconoOFotoThumb(p, '1.6')}</div>
        <div class="project-body"><h4>${_dmEsc(p.title || '')}</h4><span>${_dmEsc(p.sub || '')}</span></div>
      </a>`).join('');
  }

  const ctaWrap = root.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

function _dmPintarStats(wrap, items) {
  wrap.innerHTML = items.map((s) => `
    <div class="stat-item">
      <div class="stat-icon">${dismelecIconSvg(s.icon)}</div>
      <div><strong>${_dmEsc(s.valor || '')}</strong><span>${_dmEsc(s.label || '')}</span></div>
    </div>`).join('');
}

// Tarjetas (Inicio) y proyectos aceptan una foto opcional (PNG/JPG) en vez
// del ícono -- si hay foto, ocupa el mismo lugar/tamaño que el ícono
// (mismo "cuadradito"), no agranda la tarjeta.
function _dmIconoOFoto(item) {
  if (item.photo) return `<img src="${_dmEsc(item.photo)}" alt="" class="feature-icon-img">`;
  return dismelecIconSvg(item.icon);
}
function _dmIconoOFotoThumb(item, strokeWidth) {
  if (item.photo) return `<img src="${_dmEsc(item.photo)}" alt="" class="project-thumb-img">`;
  return dismelecIconSvg(item.icon, strokeWidth);
}

// -------------------------------------------------------------- Servicios
function _dmRenderServicios(datos, root) {
  root = root || document;
  const d = datos.servicios;
  if (!d) return;

  root.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const wrap = root.querySelector('#servicios-items');
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
      const visual = `<div class="service-visual">${_dmIconoOFotoThumb(it, '1.4')}</div>`;
      const idAttr = it.anchor ? ` id="${_dmEsc(it.anchor)}"` : '';
      return `<div class="service-block reveal in"${idAttr}>${idx % 2 === 0 ? textoBloque + visual : visual + textoBloque}</div>`;
    }).join('');
  }

  const ctaWrap = root.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// -------------------------------------------------------------- Proyectos
function _dmRenderProyectos(datos, root) {
  root = root || document;
  const d = datos.proyectos;
  if (!d) return;

  root.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const wrap = root.querySelector('#proyectos-items');
  if (wrap && Array.isArray(d.items) && d.items.length) {
    wrap.innerHTML = d.items.map((p) => {
      const idAttr = p.anchor ? ` id="${_dmEsc(p.anchor)}"` : '';
      return `
      <a href="contacto.html" class="project-card reveal in"${idAttr} data-sector="${_dmEsc(p.filtro || 'todos')}">
        <div class="project-thumb">${_dmIconoOFotoThumb(p, '1.6')}</div>
        <div class="project-body"><h4>${_dmEsc(p.title || '')}</h4><span>${_dmEsc(p.sectorLabel || '')} · ${_dmEsc(p.ubicacion || '')}</span></div>
      </a>`;
    }).join('');
  }

  const ctaWrap = root.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// --------------------------------------------------------------- Nosotros
function _dmRenderNosotros(datos, root) {
  root = root || document;
  const d = datos.nosotros;
  if (!d) return;

  root.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));

  const misionEl = root.querySelector('[data-c="mision.title"]');
  const misionCard = misionEl && misionEl.closest('.value-card');
  if (misionCard) _dmAplicarTextos(misionCard, d);
  const visionEl = root.querySelector('[data-c="vision.title"]');
  const visionCard = visionEl && visionEl.closest('.value-card');
  if (visionCard) _dmAplicarTextos(visionCard, d);

  const valoresWrap = root.querySelector('#nosotros-valores');
  if (valoresWrap && Array.isArray(d.valores) && d.valores.length) {
    valoresWrap.innerHTML = d.valores.map((v) => `
      <div class="value-card reveal in">
        <div class="feature-icon">${dismelecIconSvg(v.icon)}</div>
        <h3>${_dmEsc(v.title || '')}</h3>
        <p>${_dmEsc(v.desc || '')}</p>
      </div>`).join('');
  }

  const timelineWrap = root.querySelector('#nosotros-timeline');
  if (timelineWrap && Array.isArray(d.timeline) && d.timeline.length) {
    timelineWrap.innerHTML = d.timeline.map((t, idx) => `
      <div class="timeline-item reveal in">
        <div class="t-year">${_dmEsc(t.numero || '')}</div>
        <div class="t-line"><div class="t-dot"></div>${idx < d.timeline.length - 1 ? '<div class="t-bar"></div>' : ''}</div>
        <div class="t-body"><h4>${_dmEsc(t.title || '')}</h4><p>${_dmEsc(t.desc || '')}</p></div>
      </div>`).join('');
  }

  const statsWrap = root.querySelector('#nosotros-stats');
  if (statsWrap && Array.isArray(d.stats) && d.stats.length) _dmPintarStats(statsWrap, d.stats);

  const ctaWrap = root.querySelector('.cta-band');
  if (ctaWrap) _dmAplicarTextos(ctaWrap, d);
}

// --------------------------------------------------------------- Contacto
function _dmRenderContacto(datos, root) {
  root = root || document;
  const d = datos.contacto;
  if (!d) return;

  root.querySelectorAll('.page-hero').forEach((h) => _dmAplicarTextos(h, d));
  root.querySelectorAll('.contact-card').forEach((c) => {
    _dmAplicarTextos(c, d);
    _dmAplicarContacto(c, d);
  });

  const form = root.querySelector('#form-contacto');
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

  // El teléfono/WhatsApp/correo del pie de página y el botón flotante son
  // los MISMOS en todas las páginas -- se aplican acá, antes del switch
  // por página, para que editar el teléfono en Parametrización > Página
  // Contacto se refleje en todos lados (antes solo pintaba en la propia
  // página de Contacto; bug real reportado -- "si coloco el número en un
  // solo lado no se actualiza en todo lado").
  if (datos.contacto) _dmAplicarContacto(document, datos.contacto);

  const pagina = document.body.dataset.page || 'index';
  if (pagina === 'index') _dmRenderIndex(datos);
  else if (pagina === 'servicios') _dmRenderServicios(datos);
  else if (pagina === 'proyectos') _dmRenderProyectos(datos);
  else if (pagina === 'nosotros') _dmRenderNosotros(datos);
  else if (pagina === 'contacto') _dmRenderContacto(datos);
}

function _dmEsc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', dismelecCargarContenido);
