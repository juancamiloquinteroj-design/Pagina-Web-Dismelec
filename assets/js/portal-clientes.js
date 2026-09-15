// DISMELEC -- login del portal de clientes (portal-clientes.html).
// Cualquier cuenta creada desde el Portal Privado (rol "admin" o
// "cliente") puede entrar acá -- a diferencia de admin.html, que exige
// rol=="admin" específicamente. Ver assets/js/admin.js (módulo Usuarios)
// para cómo se crean las cuentas.

document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('portal-gate');
  const dash = document.getElementById('portal-dashboard');
  const form = document.getElementById('portal-login-form');
  const emailEl = document.getElementById('portal-email');
  const passEl = document.getElementById('portal-password');
  const err = document.getElementById('portal-error');
  const ok = document.getElementById('portal-ok');
  const eye = document.getElementById('portal-eye');
  const entrarBtn = document.getElementById('portal-entrar');

  eye.addEventListener('click', () => authTogglePass(passEl, eye));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.classList.remove('show');
    entrarBtn.disabled = true;
    entrarBtn.textContent = 'Ingresando...';
    try {
      await authIniciarSesion(emailEl.value, passEl.value);
    } catch (e) {
      err.textContent = authMensajeError(e);
      err.classList.add('show');
      entrarBtn.disabled = false;
      entrarBtn.textContent = 'Ingresar';
    }
  });

  document.getElementById('portal-olvide').addEventListener('click', async (ev) => {
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

  document.getElementById('portal-salir').addEventListener('click', () => authCerrarSesion());

  dismelecAuth.onAuthStateChanged(async (user) => {
    entrarBtn.disabled = false;
    entrarBtn.textContent = 'Ingresar';
    if (!user) {
      gate.hidden = false;
      dash.hidden = true;
      return;
    }
    const perfil = await authObtenerPerfil(user.uid);
    if (!perfil) {
      err.textContent = 'Tu cuenta no tiene acceso al Portal de Clientes -- contactanos.';
      err.classList.add('show');
      await authCerrarSesion();
      return;
    }
    document.getElementById('portal-nombre').textContent = perfil.nombre || user.email;
    gate.hidden = true;
    dash.hidden = false;
  });
});
