// DISMELEC -- inicializa Firebase (Auth + Firestore) para los 2 portales
// (privado en admin.html, público en portal-clientes.html). Usa el SDK
// "compat" por CDN (namespace firebase.*) -- no hay build/bundler en este
// sitio, así que evita el SDK modular moderno (pensado para npm/Vite).
//
// *** REEMPLAZAR con la config real que te da Firebase Console ***
// (Project settings -> Your apps -> ícono </> Web). Estos valores NO son
// secretos (van igual en el HTML de cualquier sitio con Firebase, las
// reglas de seguridad de Firestore son la protección real), así que no
// pasa nada por tenerlos visibles acá.
const FIREBASE_CONFIG = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};

firebase.initializeApp(FIREBASE_CONFIG);
const dismelecAuth = firebase.auth();
const dismelecDb = firebase.firestore();

// App secundaria -- SOLO para crear usuarios nuevos desde el módulo
// "Usuarios" del panel privado sin cerrar la sesión del admin que está
// logueado. auth.createUserWithEmailAndPassword() en el SDK de cliente
// inicia sesión automáticamente como el usuario recién creado -- si se
// hiciera con la app principal, el admin quedaría deslogueado y logueado
// como el usuario nuevo. Truco estándar de Firebase para paneles admin
// sin backend propio (sin esto habría que usar Cloud Functions + Admin
// SDK, que necesita plan de pago "Blaze" y un backend real).
const dismelecAppSecundaria = firebase.initializeApp(FIREBASE_CONFIG, 'Secundaria');
const dismelecAuthSecundaria = dismelecAppSecundaria.auth();
