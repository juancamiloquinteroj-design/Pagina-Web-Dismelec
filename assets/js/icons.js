// DISMELEC -- librería de íconos reutilizada por el sitio (site-content.js)
// y por el panel privado (admin.js) para el selector de ícono de cada
// tarjeta. Un solo lugar para agregar íconos nuevos sin tocar el resto.
window.DISMELEC_ICONS = {
  redes: {
    label: 'Redes (nodos)',
    svg: '<circle cx="12" cy="5" r="2.1" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="2.1" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="2.1" fill="currentColor" stroke="none"/><path d="M12 7L6.3 17M12 7l5.7 10M7.2 19h9.6"/>',
  },
  subestaciones: {
    label: 'Subestaciones (barras)',
    svg: '<rect x="4" y="9" width="4" height="10"/><rect x="10" y="5" width="4" height="14"/><rect x="16" y="9" width="4" height="10"/><path d="M4 5h16"/>',
  },
  medida: {
    label: 'Medida (medidor)',
    svg: '<path d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path d="M12 12l4-4M7 13a5 5 0 0110 0"/>',
  },
  retie: {
    label: 'RETIE (documento)',
    svg: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/>',
  },
  rayo: {
    label: 'Energía (rayo)',
    svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  },
  escudo: {
    label: 'Seguridad (escudo)',
    svg: '<path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z"/>',
  },
  reloj: {
    label: 'Soporte (reloj)',
    svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  },
  mapa: {
    label: 'Cobertura (mapa)',
    svg: '<path d="M12 21s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
  },
  equipo: {
    label: 'Equipo (personas)',
    svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  },
  check: {
    label: 'Calidad (check)',
    svg: '<path d="M20 6L9 17l-5-5"/>',
  },
};

function dismelecIconSvg(id, strokeWidth) {
  const icon = window.DISMELEC_ICONS[id] || window.DISMELEC_ICONS.rayo;
  const sw = strokeWidth || '1.8';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}">${icon.svg}</svg>`;
}
