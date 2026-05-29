// dashboard.js
import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// DOM Navigasi Utama
const navItems = {
    'transaksi': document.getElementById('nav-transaksi'),
    'notifikasi': document.getElementById('nav-notifikasi'),
    'laporan': document.getElementById('nav-laporan'),
    'akun': document.getElementById('nav-akun')
};
const containers = {
    'transaksi': document.getElementById('menu-transaksi-container'),
    'notifikasi': document.getElementById('menu-notifikasi-container'),
    'laporan': document.getElementById('menu-laporan-container'),
    'akun': document.getElementById('menu-akun-container')
};

// DOM Sub-Layar Transaksi
const subLayarHistori = document.getElementById('sub-layar-histori');
const subLayarInput = document.getElementById('sub-layar-input');
const btnBukaInput = document.getElementById('btn-buka-input');
const btnCancelTransaksi = document.getElementById('btn-cancel-transaksi');
const btnSubmitTransaksi = document.getElementById('btn-submit-transaksi');

// DOM Element Komponen Transaksi
const balanceDisplay = document.getElementById('balance-display');
const currentDateDisplay = document.getElementById('current-date-display');
const historiList = document.getElementById('histori-list');
const tabPemasukan = document.getElementById('tab-pemasukan');
const tabPengeluaran = document.getElementById('tab-pengeluaran');
const transactionAmount = document.getElementById('transaction-amount');
const kategoriGrid = document.getElementById('kategori-grid');

// ==========================================================
// FIX BUG 1: DETEKSI TANGGAL SEKARANG SECARA OTOMATIS (REALTIME)
// ==========================================================
let currentDate = new Date(); // Mengambil tanggal hari ini dari perangkat user
let reportDate = new Date();  // Set bulan default laporan sesuai bulan berjalan saat ini
let currentBalance = 0;
let selectedType = 'expense'; 
let selectedKategori = '';

// Data Kategori & Ikon
const kategoriData = {
    expense: [
        { name: 'Makan', icon: 'fa-utensils', color: 'text-sky-400' },
        { name: 'Belanja', icon: 'fa-bag-shopping', color: 'text-purple-400' },
        { name: 'Pajak', icon: 'fa-money-bill-wave', color: 'text-emerald-400' },
        { name: 'Transportasi', icon: 'fa-car', color: 'text-green-500' },
        { name: 'Medis', icon: 'fa-kit-medical', color: 'text-red-500' },
        { name: 'Hiburan', icon: 'fa-gamepad', color: 'text-amber-500' },
        { name: 'Lainnya', icon: 'fa-window-maximize', color: 'text-yellow-600' }
    ],
    income: [
        { name: 'Gaji', icon: 'fa-wallet', color: 'text-blue-500' },
        { name: 'Investasi', icon: 'fa-chart-line', color: 'text-emerald-500' },
        { name: 'Bonus', icon: 'fa-gift', color: 'text-amber-500' },
        { name: 'Uang Saku', icon: 'fa-coins', color: 'text-teal-400' }
    ]
};

// ==========================================
// LOGIKA NAVIGASI UTAMA (BOTTOM BAR)
// ==========================================
function pindahMenuUtama(targetMenu) {
    Object.keys(containers).forEach(menu => {
        if (menu === targetMenu) {
            containers[menu].classList.remove('hidden');
            containers[menu].classList.add('flex');
            navItems[menu].className = "nav-item w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md border border-pink-100 text-pink-500 text-base transition transform scale-110";
        } else {
            containers[menu].classList.add('hidden');
            containers[menu].classList.remove('flex');
            navItems[menu].className = "nav-item w-10 h-10 text-slate-400 hover:text-pink-400 text-base transition";
        }
    });
}

Object.keys(navItems).forEach(menu => {
    navItems[menu].addEventListener('click', () => pindahMenuUtama(menu));
});

btnBukaInput.addEventListener('click', () => {
    subLayarHistori.classList.add('hidden');
    subLayarInput.classList.remove('hidden');
    renderKategori();
});

btnCancelTransaksi.addEventListener('click', () => {
    subLayarInput.classList.add('hidden');
    subLayarHistori.classList.remove('hidden');
    transactionAmount.value = '';
    selectedKategori = '';
});

// ==========================================
// LOGIKA MANAJEMEN KALENDER HARIAN
// ==========================================
function formatTanggalString(dateObj) {
    const opsi = { day: 'numeric', month: 'long', year: 'numeric' };
    return dateObj.toLocaleDateString('id-ID', opsi);
}

// Fungsi standarisasi format YYYY-MM-DD berbasis penyesuaian zona waktu lokal (WIB/WITA/WIT)
function formatTanggalDatabase(dateObj) {
    const tahun = dateObj.getFullYear();
    const bulan = String(dateObj.getMonth() + 1).padStart(2, '0');
    const hari = String(dateObj.getDate()).padStart(2, '0');
    return `${tahun}-${bulan}-${hari}`;
}

document.getElementById('btn-prev-date').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateTanggalLayar();
});

document.getElementById('btn-next-date').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateTanggalLayar();
});

function updateTanggalLayar() {
    currentDateDisplay.innerText = formatTanggalString(currentDate);
    if(auth.currentUser) loadHistoriHariIni(auth.currentUser.uid);
}

// ==========================================
// MANAJEMEN FORM KATEGORI TRANSAKSI
// ==========================================
tabPemasukan.addEventListener('click', () => {
    selectedType = 'income';
    tabPemasukan.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
    tabPengeluaran.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500 transition";
    selectedKategori = '';
    renderKategori();
});

tabPengeluaran.addEventListener('click', () => {
    selectedType = 'expense';
    tabPengeluaran.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
    tabPemasukan.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500 transition";
    selectedKategori = '';
    renderKategori();
});

function renderKategori() {
    kategoriGrid.innerHTML = '';
    kategoriData[selectedType].forEach(kat => {
        const itemBox = document.createElement('div');
        itemBox.className = "flex flex-col items-center p-2 rounded-xl cursor-pointer hover:bg-pink-50 transition border border-transparent";
        itemBox.innerHTML = `
            <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner mb-1 text-xl ${kat.color}">
                <i class="fa-solid ${kat.icon}"></i>
            </div>
            <span class="text-[10px] font-medium text-slate-700">${kat.name}</span>
        `;
        
        itemBox.addEventListener('click', () => {
            document.querySelectorAll('#kategori-grid > div').forEach(el => el.classList.remove('bg-pink-100', 'border-pink-300'));
            itemBox.classList.add('bg-pink-100', 'border-pink-300');
            selectedKategori = kat.name;
        });
        kategoriGrid.appendChild(itemBox);
    });
}

// ==========================================
// MONITOR STATUS LOGIN FIREBASE
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('user-display-name').innerText = user.displayName || "Pengguna TanggalTua";
        document.getElementById('user-email').innerText = user.email;
        
        loadBalanceFromCloud(user.uid);
        updateTanggalLayar();
        pindahMenuUtama('transaksi'); 
    } else {
        window.location.href = "index.html";
    }
});

async function loadBalanceFromCloud(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        currentBalance = docSnap.data().balance || 0;
    }
    updateBalanceDOM();
}

function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 2
    }).format(currentBalance);
}

// Load List Histori Harian
async function loadHistoriHariIni(uid) {
    historiList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-10">Memuat data...</p>';
    const tglDb = formatTanggalDatabase(currentDate);

    try {
        const q = query(
            collection(db, "transactions"),
            where("uid", "==", uid),
            where("dateStr", "==", tglDb),
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        historiList.innerHTML = '';

        if (querySnapshot.empty) {
            historiList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-10">Belum ada transaksi hari ini.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const sign = data.type === 'income' ? '+' : '-';
            const colorClass = data.type === 'income' ? 'text-green-600' : 'text-slate-700';
            
            const kf = [...kategoriData.expense, ...kategoriData.income].find(k => k.name === data.kategori);
            const iconStr = kf ? kf.icon : 'fa-tags';

            const item = document.createElement('div');
            item.className = "flex justify-between items-center bg-white border border-pink-50 rounded-2xl px-4 py-3 shadow-sm";
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-[#fbcfe8] bg-opacity-40 rounded-xl flex items-center justify-center text-slate-700"><i class="fa-solid ${iconStr}"></i></div>
                    <div>
                        <p class="text-xs font-bold text-slate-800">${data.kategori}</p>
                        <p class="text-[10px] text-slate-400">${data.timeStr}</p>
                    </div>
                </div>
                <span class="text-xs font-bold ${colorClass}">${sign} Rp. ${data.amount.toLocaleString('id-ID')}</span>
            `;
            historiList.appendChild(item);
        });
    } catch (e) {
        console.error(e);
        historiList.innerHTML = '<p class="text-center text-xs text-red-400 mt-10">Gagal memuat histori.</p>';
    }
}

// Simpan Catatan Baru ke Cloud
btnSubmitTransaksi.addEventListener('click', async () => {
    const amount = parseInt(transactionAmount.value);
    const currentUser = auth.currentUser;

    if (!amount || amount <= 0) {
        alert("Harap masukkan nilai nominal transaksi yang valid.");
        return;
    }
    if (!selectedKategori) {
        alert("Pilih salah satu kategori terlebih dahulu.");
        return;
    }
    if (selectedType === 'expense' && amount > currentBalance) {
        alert("Transaksi gagal! Saldo Anda tidak mencukupi.");
        return;
    }

    if (selectedType === 'income') currentBalance += amount;
    else currentBalance -= amount;

    const sekarang = new Date();
    const waktuJamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    const payloadTransaksi = {
        uid: currentUser.uid,
        amount: amount,
        type: selectedType,
        kategori: selectedKategori,
        dateStr: formatTanggalDatabase(currentDate), 
        timeStr: waktuJamMenit,
        timestamp: Date.now()
    };

    try {
        await addDoc(collection(db, "transactions"), payloadTransaksi);
        await setDoc(doc(db, "users", currentUser.uid), { balance: currentBalance }, { merge: true });

        updateBalanceDOM();
        alert("Transaksi berhasil dicatat!");
        btnCancelTransaksi.click();
        loadHistoriHariIni(currentUser.uid);
    } catch (err) {
        alert("Gagal memproses transaksi: " + err.message);
    }
});

// ==========================================================
// FIX BUG 2: IMPLEMENTASI MENU LAPORAN BERBASIS TIMEZONE LOKAL
// ==========================================================
const repBtnPrevMonth = document.getElementById('rep-btn-prev-month');
const repBtnNextMonth = document.getElementById('rep-btn-next-month');
const repMonthDisplay = document.getElementById('rep-month-display');
const repTotalIncome = document.getElementById('rep-total-income');
const repTotalExpense = document.getElementById('rep-total-expense');
const repBtnPrevType = document.getElementById('rep-btn-prev-type');
const repBtnNextType = document.getElementById('rep-btn-next-type');
const repTypeDisplay = document.getElementById('rep-type-display');
const repDataList = document.getElementById('rep-data-list');

const reportTypes = ['pemasukan', 'pengeluaran', 'rata-rata'];
let currentTypeIndex = 1; 
let activeChartInstance = null; 

repBtnPrevMonth.addEventListener('click', () => {
    reportDate.setMonth(reportDate.getMonth() - 1);
    updateHalamanLaporan();
});
repBtnNextMonth.addEventListener('click', () => {
    reportDate.setMonth(reportDate.getMonth() + 1);
    updateHalamanLaporan();
});
repBtnPrevType.addEventListener('click', () => {
    currentTypeIndex = (currentTypeIndex === 0) ? reportTypes.length - 1 : currentTypeIndex - 1;
    updateHalamanLaporan();
});
repBtnNextType.addEventListener('click', () => {
    currentTypeIndex = (currentTypeIndex === reportTypes.length - 1) ? 0 : currentTypeIndex + 1;
    updateHalamanLaporan();
});

document.getElementById('nav-laporan').addEventListener('click', () => {
    updateHalamanLaporan();
});

async function updateHalamanLaporan() {
    const namaBulan = reportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    repMonthDisplay.innerText = namaBulan;

    const tipeAktif = reportTypes[currentTypeIndex];
    repTypeDisplay.innerText = tipeAktif === 'rata-rata' ? 'Rata Rata' : tipeAktif;

    const uid = auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) return;

    try {
        const q = query(collection(db, "transactions"), where("uid", "==", uid));
        const snap = await getDocs(q);
        
        let totalIncomeValue = 0;
        let totalExpenseValue = 0;
        let kategoriKalkulator = {};
        let harianKalkulator = {};

        // Ambil String Tahun & Bulan Berbasis Waktu Lokal ("2026-05") bukan UTC .toISOString()
        const thn = reportDate.getFullYear();
        const bln = String(reportDate.getMonth() + 1).padStart(2, '0');
        const stringTahunBulan = `${thn}-${bln}`; 

        const jumlahHari = new Date(thn, reportDate.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= jumlahHari; d++) {
            const tanggalPad = String(d).padStart(2, '0');
            harianKalkulator[`${stringTahunBulan}-${tanggalPad}`] = 0;
        }

        snap.forEach(doc => {
            const data = doc.data();
            if (data.dateStr && data.dateStr.startsWith(stringTahunBulan)) {
                if (data.type === 'income') totalIncomeValue += data.amount;
                if (data.type === 'expense') totalExpenseValue += data.amount;

                if (data.type === (tipeAktif === 'pemasukan' ? 'income' : 'expense')) {
                    kategoriKalkulator[data.kategori] = (kategoriKalkulator[data.kategori] || 0) + data.amount;
                }
                if (data.type === 'expense') {
                    harianKalkulator[data.dateStr] = (harianKalkulator[data.dateStr] || 0) + data.amount;
                }
            }
        });

        repTotalIncome.innerText = `Rp ${totalIncomeValue.toLocaleString('id-ID')}`;
        repTotalExpense.innerText = `Rp ${totalExpenseValue.toLocaleString('id-ID')}`;

        if (activeChartInstance) activeChartInstance.destroy();

        if (tipeAktif === 'pemasukan' || tipeAktif === 'pengeluaran') {
            renderDonutChart(kategoriKalkulator, tipeAktif === 'pemasukan' ? totalIncomeValue : totalExpenseValue);
        } else {
            renderLineChart(harianKalkulator);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderDonutChart(dataObj, totalUang) {
    repDataList.innerHTML = '';
    const labelData = Object.keys(dataObj);
    const valueData = Object.values(dataObj);

    if (labelData.length === 0) {
        repDataList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada data transaksi.</p>';
        const ctx = document.getElementById('financialChart').getContext('2d');
        activeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Kosong'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] },
            options: { plugins: { legend: { display: false } } }
        });
        return;
    }

    const warnaWarni = ['#60a5fa', '#c084fc', '#34d399', '#4ade80', '#f87171', '#fbbf24', '#d97706', '#2dd4bf'];
    const ctx = document.getElementById('financialChart').getContext('2d');
    activeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labelData,
            datasets: [{ data: valueData, backgroundColor: warnaWarni.slice(0, labelData.length), borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' }
    });

    labelData.forEach((label, index) => {
        const nominal = valueData[index];
        const persentase = totalUang > 0 ? Math.round((nominal / totalUang) * 100) : 0;
        const row = document.createElement('div');
        row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-2xl px-4 py-2.5 shadow-sm text-xs";
        row.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${warnaWarni[index]}"></div>
                <span class="font-bold text-slate-700">${label}</span>
            </div>
            <div class="flex gap-4 text-slate-600">
                <span class="font-medium">${persentase}%</span>
                <span class="font-bold text-slate-800">Rp ${nominal.toLocaleString('id-ID')}</span>
            </div>`;
        repDataList.appendChild(row);
    });
}

function renderLineChart(harianObj) {
    repDataList.innerHTML = '';
    const arrayTanggalKeys = Object.keys(harianObj);
    const arrayNilaiValues = Object.values(harianObj);
    const labelHariSaja = arrayTanggalKeys.map(k => parseInt(k.split('-')[2]));

    const ctx = document.getElementById('financialChart').getContext('2d');
    activeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelHariSaja,
            datasets: [{
                data: arrayNilaiValues,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } }
        }
    });

    const headerRow = document.createElement('div');
    headerRow.className = "flex justify-between px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1";
    headerRow.innerHTML = `<span>Tanggal</span><span>Total Pengeluaran</span>`;
    repDataList.appendChild(headerRow);

    let adaTransaksi = false;
    arrayTanggalKeys.forEach((tglFull, index) => {
        const pengeluaranHariIni = arrayNilaiValues[index];
        if (pengeluaranHariIni > 0) {
            adaTransaksi = true;
            const formatTglIndo = new Date(tglFull).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const row = document.createElement('div');
            row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-xl px-4 py-2 shadow-sm text-xs";
            row.innerHTML = `<span>${formatTglIndo}</span><span class="font-bold text-slate-800">Rp ${pengeluaranHariIni.toLocaleString('id-ID')}</span>`;
            repDataList.appendChild(row);
        }
    });

    if (!adaTransaksi) {
        repDataList.innerHTML += '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada catatan pengeluaran bulan ini.</p>';
    }
}

// Log-out
document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).catch(err => alert(err.message));
});