// app.js
import { auth, googleProvider, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Tambahkan import fungsi Firestore untuk manipulasi data cloud
import { 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

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

let isSignUpMode = false;
let currentBalance = 0;

// ==========================================
// AUTHENTICATION LOGIC (LOGIN / REGISTER)
// ==========================================

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

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert("Registrasi sukses! Selamat datang di TanggalTua.");
                toggleAuthMode();
            })
            .catch((error) => alert("Gagal Daftar: " + error.message));
    } else {
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
    }).catch((error) => alert("Gagal Logout: " + error.message));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.add('hidden');
        authIllustration.classList.add('hidden');
        mainScreen.classList.remove('hidden');

        userDisplayName.innerText = user.displayName || "Pengguna TanggalTua";
        userEmailDisplay.innerText = user.email;

        // SEKARANG MEMUAT SALDO DARI FIRESTORE CLOUD
        loadBalanceFromCloud(user.uid);
    } else {
        mainScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        authIllustration.classList.remove('hidden');
    }
});

// ==========================================
// CORE APP BUSINESS LOGIC (FIRESTORE CLOUD)
// ==========================================

// Fungsi Baru: Mengambil saldo dari Firebase Firestore Cloud
async function loadBalanceFromCloud(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Jika data user sudah ada di cloud, ambil saldonya
            currentBalance = docSnap.data().balance || 0;
        } else {
            // Jika user baru pertama kali login, buat data saldo default 0 di cloud
            currentBalance = 0;
            await setDoc(docRef, { balance: currentBalance });
        }
        updateBalanceDOM();
    } catch (error) {
        console.error("Gagal mengambil data dari Cloud:", error);
    }
}

function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(currentBalance);
}

// Proses Mengubah Saldo dan Mengirimkannya ke Cloud
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

    // SIMPAN DATA KE CLOUD FIRESTORE BERDASARKAN UID USER
    if (currentUser) {
        try {
            const docRef = doc(db, "users", currentUser.uid);
            await setDoc(docRef, { balance: currentBalance }, { merge: true });
            
            updateBalanceDOM();
            transactionAmount.value = ""; 
            alert("Transaksi berhasil diperbarui di Cloud!");
        } catch (error) {
            alert("Gagal sinkronisasi data ke cloud: " + error.message);
        }
    }
});