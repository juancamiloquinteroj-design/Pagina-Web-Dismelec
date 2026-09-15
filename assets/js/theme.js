// DISMELEC -- tema claro/oscuro del portal privado y portal de clientes.
// Se carga ANTES que el resto (bloqueante, justo después de las hojas de
// estilo) para aplicar el tema guardado sin parpadeo antes de pintar el
// body.
(function () {
  const KEY = 'dismelec_theme';
  let guardado = null;
  try { guardado = localStorage.getItem(KEY); } catch (e) {}
  if (guardado === 'dark') document.documentElement.dataset.theme = 'dark';

  window.dismelecTema = {
    actual() {
      return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    },
    alternar() {
      const nuevo = window.dismelecTema.actual() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nuevo;
      try { localStorage.setItem(KEY, nuevo); } catch (e) {}
      document.querySelectorAll('[data-theme-icono]').forEach((el) => {
        el.innerHTML = nuevo === 'dark' ? ICONO_SOL : ICONO_LUNA;
      });
    },
  };

  const ICONO_LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>';
  const ICONO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icono = btn.querySelector('[data-theme-icono]') || btn;
      icono.innerHTML = window.dismelecTema.actual() === 'dark' ? ICONO_SOL : ICONO_LUNA;
      btn.addEventListener('click', () => window.dismelecTema.alternar());
    });
  });
})();
