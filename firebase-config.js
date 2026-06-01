// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// Menyembunyikan Key menggunakan Environment Variables bawaan hosting/Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || window._env_?.FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || window._env_?.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || window._env_?.FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || window._env_?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || window._env_?.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || window._env_?.FIREBASE_APP_ID
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);