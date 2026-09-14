// DISMELEC -- pinta en el Inicio lo que venga de assets/data/content.json
// (foto de portada, título/bajada del hero, tarjetas de servicio). Si el
// fetch falla (sin conexión, archivo corrupto, etc.) el HTML estático que
// ya está en index.html queda tal cual -- esto es una mejora progresiva,
// nunca dejarla vista en blanco si algo sale mal.
async function dismelecCargarContenido() {
  const heroPhoto = document.querySelector('.hero-photo');
  const heroTag = document.querySelector('.hero-tag-corner');
  const heroTitle = document.querySelector('.hero h1');
  const heroLead = document.querySelector('.hero p.lead');
  const cardsWrap = document.querySelector('.feature-strip');
  if (!heroPhoto && !cardsWrap) return; // no estamos en el Inicio

  let datos;
  try {
    const res = await fetch('assets/data/content.json', { cache: 'no-store' });
    if (!res.ok) return;
    datos = await res.json();
  } catch (e) {
    return;
  }

  if (datos.hero) {
    if (heroPhoto && datos.hero.photo) {
      heroPhoto.style.backgroundImage = `url('${datos.hero.photo}')`;
    }
    if (heroTag && datos.hero.tag) {
      heroTag.innerHTML = datos.hero.tag.split('\n').map(l => l).join('<br>');
    }
    if (heroTitle && datos.hero.title) heroTitle.textContent = datos.hero.title;
    if (heroLead && datos.hero.lead) heroLead.textContent = datos.hero.lead;
  }

  if (cardsWrap && Array.isArray(datos.cards) && datos.cards.length) {
    cardsWrap.innerHTML = datos.cards.map(c => `
      <a href="${_dmEsc(c.link || '#')}" class="feature-card reveal">
        <div class="feature-icon">${dismelecIconSvg(c.icon)}</div>
        <h3>${_dmEsc(c.title || '')}</h3>
        <p>${_dmEsc(c.desc || '')}</p>
        <span class="feature-more">Conocer más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
      </a>`).join('');
    // Las tarjetas nuevas entran sin pasar por el observer de .reveal que
    // ya corrió en DOMContentLoaded (este fetch termina después) -- se
    // marcan visibles directo, si no quedan invisibles para siempre.
    cardsWrap.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }
}

function _dmEsc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', dismelecCargarContenido);
