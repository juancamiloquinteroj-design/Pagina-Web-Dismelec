# Sitio web -- DISMELEC Ingenieros SAS

Sitio estático (HTML/CSS/JS puro, sin build ni dependencias) pensado para
publicarse en **GitHub Pages**.

## Estructura

```
index.html            Inicio
servicios.html         Servicios (Redes / Subestaciones / Medida / RETIE)
proyectos.html         Portafolio de proyectos (con filtro por sector)
nosotros.html           Misión, visión, valores y metodología
contacto.html           Datos de contacto + formulario
portal-clientes.html    Placeholder ("próximamente")
assets/css/style.css    Estilos de todo el sitio
assets/js/main.js       Menú móvil, animaciones, filtro de proyectos y formulario
assets/img/             Logo y demás imágenes
```

## Publicar en GitHub Pages

1. `Settings` → `Pages` en el repositorio.
2. Source: `Deploy from a branch`, branch `main`, carpeta `/ (root)`.
3. Guardar -- el sitio queda en `https://<usuario>.github.io/<repo>/`.

## Pendiente antes de publicar en serio

Este sitio se armó con la imagen de referencia del Inicio y datos de
**contacto de relleno** (hay que reemplazarlos):

- Teléfono/WhatsApp: `+57 300 000 0000` -- aparece en el header, footer,
  botón flotante de WhatsApp y en `contacto.html`.
- Correo: `contacto@dismelecingenieros.com` -- footer, `contacto.html` y
  destino del formulario (`data-mailto` en el `<form>`).
- Dirección/oficina: solo dice "Colombia -- cobertura nacional" en
  `contacto.html`, sin dirección puntual.
- Las fotos de "Proyectos" son ilustraciones/iconos, no fotografías reales
  (para no usar imágenes de stock sin licencia) -- se pueden reemplazar por
  fotos reales en `assets/img/` y cambiar el `<div class="project-thumb">`
  por un `<img>`.
- El formulario de contacto arma un `mailto:` (abre el correo del
  visitante) -- no hay backend propio. Si más adelante se quiere recibir
  los mensajes directo (sin depender de que el visitante tenga cliente de
  correo configurado), se puede conectar a un servicio como Formspree o
  EmailJS cambiando el handler en `assets/js/main.js`.
- "Portal clientes" es una página de aviso ("próximamente") -- todavía no
  hay backend/login real detrás.
