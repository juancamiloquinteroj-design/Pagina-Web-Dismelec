// DISMELEC -- inicializa Firebase (Auth + Firestore) para los 2 portales
// (privado en admin.html, público en portal-clientes.html). Usa el SDK
// "compat" por CDN (namespace firebase.*) -- no hay build/bundler en este
// sitio, así que evita el SDK modular moderno (pensado para npm/Vite).
//
// Config del proyecto real "DISMELEC" (dismelec-2c98c) en Firebase
// Console. Estos valores NO son secretos (van igual en el HTML de
// cualquier sitio con Firebase, las reglas de seguridad de Firestore son
// la protección real), así que no pasa nada por tenerlos visibles acá.
// measurementId (Analytics) se dejó afuera a propósito -- no lo usamos.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA8wN2EM15PmeEyThE4zDQNiPHooSmiNew',
  authDomain: 'dismelec-2c98c.firebaseapp.com',
  projectId: 'dismelec-2c98c',
  storageBucket: 'dismelec-2c98c.firebasestorage.app',
  messagingSenderId: '603989150578',
  appId: '1:603989150578:web:3c846875f82a26e9a8ebeb',
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
