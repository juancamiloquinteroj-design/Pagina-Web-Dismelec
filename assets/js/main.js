// DISMELEC INGENIEROS SAS -- comportamiento general del sitio (sin backend,
// pensado para GitHub Pages: todo corre en el navegador).

document.addEventListener('DOMContentLoaded', () => {
  // ---- Menu movil ----
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
      const open = document.body.classList.contains('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => document.body.classList.remove('nav-open'));
    });
  }

  // ---- Resalta el link activo segun la pagina actual ----
  const aqui = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    if (a.dataset.page === aqui) a.classList.add('active');
  });

  // ---- Año dinamico en el footer ----
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ---- Animacion simple al hacer scroll ----
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // ---- Filtro de proyectos (solo en proyectos.html) ----
  // Las tarjetas se re-consultan en cada click (no se cachean al cargar)
  // porque site-content.js puede haber reemplazado el .project-grid
  // completo después de este DOMContentLoaded (llega con datos de
  // content.json vía fetch, que termina más tarde) -- una lista cacheada
  // acá apuntaría a nodos viejos ya fuera del DOM.
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sector = btn.dataset.filter;
        document.querySelectorAll('[data-sector]').forEach(card => {
          const coincide = sector === 'todos' || card.dataset.sector === sector;
          card.style.display = coincide ? '' : 'none';
        });
      });
    });
  }

  // ---- Formulario de contacto: sin backend propio todavia, arma un
  // mailto: con los datos cargados -- abre el cliente de correo del
  // visitante con todo prellenado, funciona en cualquier hosting estatico
  // (GitHub Pages incluido) sin necesitar un servicio externo. El día que
  // se quiera recibir los mensajes directo en un backend/Formspree, solo
  // hay que cambiar este handler. ----
  const form = document.getElementById('form-contacto');
  if (form) {
    const status = document.getElementById('form-status');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const datos = new FormData(form);
      const nombre = (datos.get('nombre') || '').toString().trim();
      const correo = (datos.get('correo') || '').toString().trim();
      const empresa = (datos.get('empresa') || '').toString().trim();
      const telefono = (datos.get('telefono') || '').toString().trim();
      const servicio = (datos.get('servicio') || '').toString().trim();
      const mensaje = (datos.get('mensaje') || '').toString().trim();

      if (!nombre || !correo || !mensaje) {
        status.textContent = 'Completá al menos nombre, correo y mensaje.';
        status.className = 'form-status err';
        return;
      }

      const destino = form.dataset.mailto || 'contacto@dismelecingenieros.com';
      const asunto = `Solicitud de cotización -- ${nombre}${empresa ? ' (' + empresa + ')' : ''}`;
      const cuerpo = [
        `Nombre: ${nombre}`,
        `Correo: ${correo}`,
        telefono ? `Teléfono: ${telefono}` : null,
        empresa ? `Empresa: ${empresa}` : null,
        servicio ? `Servicio de interés: ${servicio}` : null,
        '',
        mensaje,
      ].filter(Boolean).join('\n');

      const mailto = `mailto:${destino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      window.location.href = mailto;

      status.textContent = 'Se abrió tu cliente de correo con el mensaje listo para enviar.';
      status.className = 'form-status ok';
    });
  }
});
