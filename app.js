// app.js
import { auth, googleProvider } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const authIllustration = document.getElementById('auth-illustration');
const authForm = document.getElementById('auth-form');
const authSubtitle = document.getElementById('auth-subtitle');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnPrimary = document.getElementById('btn-primary');
const btnSecondary = document.getElementById('btn-secondary');
const btnGoogle = document.getElementById('btn-google');
const btnLogout = document.getElementById('btn-logout');

// Main Screen DOM Elements
const userDisplayName = document.getElementById('user-display-name');
const userEmailDisplay = document.getElementById('user-email');
const balanceDisplay = document.getElementById('balance-display');
const transactionAmount = document.getElementById('transaction-amount');
const btnSaveTransaction = document.getElementById('btn-save-transaction');

// App State Flags
let isSignUpMode = false;
let currentBalance = 0;

// ==========================================
// AUTHENTICATION LOGIC (LOGIN / REGISTER)
// ==========================================

// Ganti Tampilan form antara SIGN IN dan SIGN UP
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authSubtitle.innerText = "Create your new Account";
        btnPrimary.innerText = "REGISTER";
        btnSecondary.innerText = "BACK TO LOGIN";
    } else {
        authSubtitle.innerText = "Sign in to your Account";
        btnPrimary.innerText = "SIGN IN";
        btnSecondary.innerText = "SIGN UP";
    }
    authForm.reset();
};

// Handler Submit Form (Email Auth)
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        // Proses Pendaftaran Akun Baru
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("Registrasi sukses! Selamat datang di TanggalTua.");
                toggleAuthMode();
            })
            .catch((error) => alert("Gagal Daftar: " + error.message));
    } else {
        // Proses Masuk Akun Lama
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => alert("Gagal Masuk: " + error.message));
    }
});

// Login Menggunakan Google Popup
btnGoogle.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider)
        .catch((error) => alert("Gagal Login Google: " + error.message));
});

// Proses Keluar Akun (Logout)
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Reset state data lokal saat logout
        currentBalance = 0;
    }).catch((error) => alert("Gagal Logout: " + error.message));
});

// Monitor Status Autentikasi User (Realtime)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Jika User Sedang Login -> Tampilkan Main Screen
        loginScreen.classList.add('hidden');
        authIllustration.classList.add('hidden');
        mainScreen.classList.remove('hidden');

        // Set Informasi Profil User
        userDisplayName.innerText = user.displayName || "Pengguna TanggalTua";
        userEmailDisplay.innerText = user.email;

        // Muat saldo user dari database lokal berbasis UID akun
        loadBalanceData(user.uid);
    } else {
        // Jika User Tidak Login -> Tampilkan Login Screen kembali
        mainScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        authIllustration.classList.remove('hidden');
    }
});

// ==========================================
// CORE APP BUSINESS LOGIC (MAIN SCREEN)
// ==========================================

// Fungsi mengambil data saldo spesifik per user
function loadBalanceData(uid) {
    const savedBalance = localStorage.getItem(`balance_${uid}`);
    currentBalance = savedBalance ? parseInt(savedBalance) : 0;
    updateBalanceDOM();
}

// Format Angka Integer Menjadi Rupiah Currency Style
function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(currentBalance);
}

// Proses Penghitungan Saldo Masuk/Keluar
btnSaveTransaction.addEventListener('click', () => {
    const amount = parseInt(transactionAmount.value);
    const selectedType = document.querySelector('input[name="transaction-type"]:checked').value;
    const currentUser = auth.currentUser;

    if (!amount || amount <= 0) {
        alert("Harap masukkan nilai jumlah uang yang valid.");
        return;
    }

    if (selectedType === 'income') {
        currentBalance += amount;
    } else if (selectedType === 'expense') {
        if (amount > currentBalance) {
            alert("Awas dompet kritis! Pengeluaran melebihi sisa saldo Anda.");
            return;
        }
        currentBalance -= amount;
    }

    // Amankan data saldo ke local storage berdasarkan user UID unik
    if (currentUser) {
        localStorage.setItem(`balance_${currentUser.uid}`, currentBalance);
    }

    updateBalanceDOM();
    transactionAmount.value = ""; // bersihkan form field setelah input
    alert("Transaksi berhasil diperbarui!");
});