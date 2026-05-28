// app.js
import { auth, googleProvider, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// DOM Elements
const authContainer = document.getElementById('auth-container');
const mainScreen = document.getElementById('main-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

// Inputs
const nameWrapper = document.getElementById('wrapper-name');
const nameInput = document.getElementById('reg-name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmWrapper = document.getElementById('wrapper-confirm-password');
const confirmInput = document.getElementById('confirm-password');

// Buttons & Toggles
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

let isSignUpMode = false;
let currentBalance = 0;

// ==========================================
// INTERACTIVE TOGGLE LOGIC (LOGIN <-> SIGN UP)
// ==========================================

btnSecondary.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authForm.reset();

    if (isSignUpMode) {
        // Berubah ke Tampilan Pendaftaran (Sign Up)
        authTitle.innerHTML = "Daftar Akun<br><span class='font-bold'>Tanggal Tua</span>";
        authSubtitle.innerText = "buat akun baru untuk mulai berhemat";
        btnPrimary.innerText = "Daftar";
        btnSecondary.innerText = "Masuk di sini";
        document.getElementById('text-toggle-info').innerText = "Sudah punya akun?";
        
        // Tampilkan input tambahan
        nameWrapper.classList.remove('hidden');
        confirmWrapper.classList.remove('hidden');
        nameInput.setAttribute('required', 'true');
        confirmInput.setAttribute('required', 'true');
    } else {
        // Berubah ke Tampilan Masuk (Login)
        authTitle.innerHTML = "Selamat Datang di<br><span class='font-bold'>Tanggal Tua</span>";
        authSubtitle.innerText = "kelola keuangan dengan mudah dan lebih hemat";
        btnPrimary.innerText = "Masuk";
        btnSecondary.innerText = "Daftar di sini";
        document.getElementById('text-toggle-info').innerText = "Belum punya akun?";
        
        // Sembunyikan input tambahan
        nameWrapper.classList.add('hidden');
        confirmWrapper.classList.add('hidden');
        nameInput.removeAttribute('required');
        confirmInput.removeAttribute('required');
    }
});

// ==========================================
// FIREBASE AUTHENTICATION PROCESS
// ==========================================

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        const name = nameInput.value;
        const confirmPass = confirmInput.value;

        // Validasi kecocokan password
        if (password !== confirmPass) {
            alert("Oops! Kata sandi konfirmasi tidak cocok.");
            return;
        }

        // Jalankan Registrasi Baru di Firebase
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Simpan nama pengguna ke profil Firebase Auth
                return updateProfile(userCredential.user, {
                    displayName: name
                });
            })
            .then(() => {
                alert("Registrasi Berhasil! Selamat datang di keluarga TanggalTua.");
                btnSecondary.click(); // Alihkan otomatis kembali ke mode login
            })
            .catch((error) => alert("Gagal Mendaftar: " + error.message));

    } else {
        // Jalankan Proses Login
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => alert("Gagal Masuk: " + error.message));
    }
});

btnGoogle.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider)
        .catch((error) => alert("Gagal Login Google: " + error.message));
});

btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        currentBalance = 0;
    }).catch((error) => alert("Gagal Keluar: " + error.message));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        mainScreen.classList.remove('hidden');

        // Menampilkan nama asli yang diinput saat daftar (atau nama Google)
        userDisplayName.innerText = user.displayName || "Pengguna TanggalTua";
        userEmailDisplay.innerText = user.email;

        loadBalanceFromCloud(user.uid);
    } else {
        mainScreen.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});

// ==========================================
// BUSINESS LOGIC (FIRESTORE CLOUD)
// ==========================================

async function loadBalanceFromCloud(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentBalance = docSnap.data().balance || 0;
        } else {
            currentBalance = 0;
            await setDoc(docRef, { balance: currentBalance });
        }
        updateBalanceDOM();
    } catch (error) {
        console.error(error);
    }
}

function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(currentBalance);
}

btnSaveTransaction.addEventListener('click', async () => {
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

    if (currentUser) {
        try {
            const docRef = doc(db, "users", currentUser.uid);
            await setDoc(docRef, { balance: currentBalance }, { merge: true });
            updateBalanceDOM();
            transactionAmount.value = ""; 
            alert("Transaksi berhasil diperbarui!");
        } catch (error) {
            alert("Gagal sinkronisasi data: " + error.message);
        }
    }
});