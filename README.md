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
admin.html              Panel privado -- edita el contenido del Inicio y lo publica al repo
assets/css/style.css    Estilos de todo el sitio
assets/css/admin.css    Estilos propios del panel privado
assets/js/main.js       Menú móvil, animaciones, filtro de proyectos y formulario
assets/js/icons.js      Librería de íconos (sitio + panel privado)
assets/js/site-content.js  Pinta en el Inicio lo que venga de assets/data/content.json
assets/js/admin.js      Lógica del panel privado (login, edición, publicar a GitHub)
assets/data/content.json  Contenido editable del Inicio (foto, textos, tarjetas)
assets/img/             Logo y demás imágenes
```

## Panel privado (`admin.html`)

Edita la foto de portada, el título/texto del hero y las tarjetas de
servicio del Inicio, sin tocar código -- ver la sección **"Panel privado
de edición"** más abajo para la clave y cómo generar el token de GitHub.

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
## Panel privado de edición

El botón "Portal clientes" ahora abre `admin.html` -- un editor de
contenido casero, sin backend propio: los cambios se publican directo al
repositorio de GitHub usando la API REST con un token personal.

- **Clave de acceso por defecto: `dismelec2026`** -- cambiala pidiéndole
  a Claude que actualice `ADMIN_PASSWORD_HASH` en `assets/js/admin.js`
  (es un hash SHA-256, no queda la clave en texto plano en el código).
  Esta clave solo evita que un visitante casual entre a mirar el
  formulario -- no es una protección fuerte por sí sola.
- **La protección real es el token de GitHub**: la primera vez que se
  entra al panel, pide generar uno en
  [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
  (tipo "classic", permiso `repo` completo) y pegarlo -- queda guardado
  SOLO en `localStorage` de ese navegador, nunca se manda a otro lado que
  no sea `api.github.com`. Cualquiera con acceso a ese navegador y ese
  token podría publicar cambios, así que conviene generarlo solo en el
  equipo de confianza del equipo DISMELEC y no compartirlo.
- Al tocar "Publicar cambios", sube (si cambió) la foto nueva a
  `assets/img/` con un nombre único y actualiza
  `assets/data/content.json` -- GitHub Pages redespliega solo en
  30-60 segundos.
