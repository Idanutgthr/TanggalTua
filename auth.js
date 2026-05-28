// auth.js
import { auth, googleProvider } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    signInWithPopup, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const nameWrapper = document.getElementById('wrapper-name');
const nameInput = document.getElementById('reg-name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmWrapper = document.getElementById('wrapper-confirm-password');
const confirmInput = document.getElementById('confirm-password');
const btnPrimary = document.getElementById('btn-primary');
const btnSecondary = document.getElementById('btn-secondary');
const btnGoogle = document.getElementById('btn-google');

let isSignUpMode = false;

// Efek Toggle Form Masuk / Daftar
btnSecondary.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authForm.reset();
    if (isSignUpMode) {
        authTitle.innerHTML = "Daftar Akun<br><span class='font-bold'>Tanggal Tua</span>";
        authSubtitle.innerText = "buat akun baru untuk mulai berhemat";
        btnPrimary.innerText = "Daftar";
        btnSecondary.innerText = "Masuk di sini";
        document.getElementById('text-toggle-info').innerText = "Sudah punya akun?";
        nameWrapper.classList.remove('hidden');
        confirmWrapper.classList.remove('hidden');
    } else {
        authTitle.innerHTML = "Selamat Datang di<br><span class='font-bold'>Tanggal Tua</span>";
        authSubtitle.innerText = "kelola keuangan dengan mudah dan lebih hemat";
        btnPrimary.innerText = "Masuk";
        btnSecondary.innerText = "Daftar di sini";
        document.getElementById('text-toggle-info').innerText = "Belum punya akun?";
        nameWrapper.classList.add('hidden');
        confirmWrapper.classList.add('hidden');
    }
});

// Proses Submit Form
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSignUpMode) {
        if (passwordInput.value !== confirmInput.value) {
            alert("Kata sandi konfirmasi tidak cocok.");
            return;
        }
        createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
            .then((res) => updateProfile(res.user, { displayName: nameInput.value }))
            .then(() => {
                alert("Pendaftaran berhasil!");
                btnSecondary.click();
            })
            .catch(err => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
            .catch(err => alert("Gagal Masuk: " + err.message));
    }
});

// Google Login
btnGoogle.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).catch(err => alert(err.message));
});

// Proteksi: Jika terdeteksi sudah login, langsung lempar ke dashboard.html
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});