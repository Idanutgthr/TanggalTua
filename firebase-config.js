// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// GANTI DENGAN KONFIGURASI FIREBASE PROJECT ANDA SENDIRI
const firebaseConfig = {
  apiKey: "AIzaSyBeooj-bdmmH46dbwAQKLaHUiS5-brURpM",
  authDomain: "tanggaltua-45171.firebaseapp.com",
  projectId: "tanggaltua-45171",
  storageBucket: "tanggaltua-45171.firebasestorage.app",
  messagingSenderId: "119166926168",
  appId: "1:119166926168:web:1364a0b6460482b964792d",
  measurementId: "G-C1GLDXWDYK"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor instance Auth dan Google Provider untuk dipakai di app.js
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);