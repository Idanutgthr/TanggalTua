// dashboard.js
import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const userDisplayName = document.getElementById('user-display-name');
const userEmailDisplay = document.getElementById('user-email');
const balanceDisplay = document.getElementById('balance-display');
const transactionAmount = document.getElementById('transaction-amount');
const btnSaveTransaction = document.getElementById('btn-save-transaction');
const btnLogout = document.getElementById('btn-logout');

let currentBalance = 0;

// Proteksi Halaman: Jika user tidak terdeteksi login, langsung tendang ke index.html
onAuthStateChanged(auth, (user) => {
    if (user) {
        userDisplayName.innerText = user.displayName || "Pengguna TanggalTua";
        userEmailDisplay.innerText = user.email;
        loadBalanceFromCloud(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// Ambil data saldo dari Cloud Firestore
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
        console.error("Gagal memuat saldo:", error);
    }
}

function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(currentBalance);
}

// Simpan Transaksi Ke Cloud
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
            alert("Transaksi berhasil disimpan!");
        } catch (error) {
            alert("Gagal sinkronisasi data: " + error.message);
        }
    }
});

// Tombol Keluar
btnLogout.addEventListener('click', () => {
    signOut(auth).catch(err => alert(err.message));
});