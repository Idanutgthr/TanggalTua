// dashboard.js
import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// DOM Navigasi Utama & Sub Notifikasi/Disiplin
const navItems = { 'transaksi': document.getElementById('nav-transaksi'), 'notifikasi': document.getElementById('nav-notifikasi'), 'laporan': document.getElementById('nav-laporan'), 'akun': document.getElementById('nav-akun') };
const containers = { 'transaksi': document.getElementById('menu-transaksi-container'), 'notifikasi': document.getElementById('menu-notifikasi-container'), 'laporan': document.getElementById('menu-laporan-container'), 'akun': document.getElementById('menu-akun-container') };

const subLayarHistori = document.getElementById('sub-layar-histori');
const subLayarInput = document.getElementById('sub-layar-input');
const btnBukaInput = document.getElementById('btn-buka-input');
const btnCancelTransaksi = document.getElementById('btn-cancel-transaksi');
const btnSubmitTransaksi = document.getElementById('btn-submit-transaksi');

const balanceDisplay = document.getElementById('balance-display');
const currentDateDisplay = document.getElementById('current-date-display');
const historiList = document.getElementById('histori-list');
const transactionAmount = document.getElementById('transaction-amount');
const kategoriGrid = document.getElementById('kategori-grid');

// DOM Mode Disiplin (Layar Baru)
const subDisiplinUtama = document.getElementById('sub-disiplin-utama');
const subDisiplinRulesPicker = document.getElementById('sub-disiplin-rules-picker');
const toggleModeDisiplin = document.getElementById('toggle-mode-disiplin');
const boxKonfigurasiDisiplin = document.getElementById('box-konfigurasi-disiplin');
const btnGetSaldo = document.getElementById('btn-get-saldo');
const inputNominalAwal = document.getElementById('input-nominal-awal');
const labelTabunganPersen = document.getElementById('label-tabungan-persen');
const inputNilaiTabungan = document.getElementById('input-nilai-tabungan');
const btnTambahAturan = document.getElementById('btn-tambah-aturan');
const rulesListContainer = document.getElementById('rules-list-container');
const btnSimpanDisiplinConfig = document.getElementById('btn-simpan-disiplin-config');

const gridKategoriRules = document.getElementById('grid-kategori-rules');
const tabRulePerhari = document.getElementById('tab-rule-perhari');
const tabRulePerbulan = document.getElementById('tab-rule-perbulan');
const inputNominalMaksimalRule = document.getElementById('input-nominal-maksimal-rule');
const btnCancelRule = document.getElementById('btn-cancel-rule');
const btnSaveRule = document.getElementById('btn-save-rule');

// DOM Profile Tambahan
const profileSavingDisplay = document.getElementById('profile-saving-display');
const inputFileAvatar = document.getElementById('input-file-avatar');
const imgUserAvatar = document.getElementById('img-user-avatar');
const iconUserDefault = document.getElementById('icon-user-default');

// State Finansial
let currentDate = new Date(); 
let reportDate = new Date();  
let currentBalance = 0;
let currentSavings = 0; 
let selectedType = 'expense'; 
let selectedKategori = '';

// State Konfigurasi Disiplin
let disiplinActive = false;
let nominalAwalVal = 0;
let tipeMenabungLevel = 'mudah'; // mudah (10%), sedang (20%), sulit (30%), kustom
let aturanBatasKategori = []; // Simpan list local rules sebelum save ke Firestore
let ruleSelectedKategori = '';
let ruleSelectedPeriod = 'hari'; // hari / bulan

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
// 1. SYSTEM UTILITY & CORE ROUTING NAVIGATION
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
Object.keys(navItems).forEach(menu => { navItems[menu].addEventListener('click', () => pindahMenuUtama(menu)); });

btnBukaInput.addEventListener('click', () => { subLayarHistori.classList.add('hidden'); subLayarInput.classList.remove('hidden'); renderKategori(); });
btnCancelTransaksi.addEventListener('click', () => { subLayarInput.classList.add('hidden'); subLayarHistori.classList.remove('hidden'); transactionAmount.value = ''; selectedKategori = ''; });

function formatTanggalString(dateObj) { return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
function formatTanggalDatabase(dateObj) { return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; }

document.getElementById('btn-prev-date').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); updateTanggalLayar(); });
document.getElementById('btn-next-date').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 1); updateTanggalLayar(); });
function updateTanggalLayar() { currentDateDisplay.innerText = formatTanggalString(currentDate); if(auth.currentUser) loadHistoriHariIni(auth.currentUser.uid); }

// ==========================================
// 2. REALTIME PROFILE SYNC & AVATAR LOADER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('user-display-name').innerText = user.displayName || "Pengguna TanggalTua";
        document.getElementById('user-email').innerText = user.email;
        if (user.photoURL) { imgUserAvatar.src = user.photoURL; imgUserAvatar.classList.remove('hidden'); iconUserDefault.classList.add('hidden'); }
        
        await sinkronisasiAkunDanCekResetBulan(user.uid);
        updateTanggalLayar();
        pindahMenuUtama('transaksi'); 
    } else {
        window.location.href = "index.html";
    }
});

// Ganti foto profil lokal via Base64 string
inputFileAvatar.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            imgUserAvatar.src = reader.result;
            imgUserAvatar.classList.remove('hidden');
            iconUserDefault.classList.add('hidden');
            if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: reader.result });
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-edit-name').addEventListener('click', async () => {
    const namaBaru = prompt("Masukkan nama profil baru Anda:", auth.currentUser.displayName);
    if (namaBaru) {
        await updateProfile(auth.currentUser, { displayName: namaBaru });
        document.getElementById('user-display-name').innerText = namaBaru;
    }
});

// =====================================================================
// 3. FIX: SISTEM RESET OTOMATIS AKHIR BULAN KE TABUNGAN (MONTH END CLEANSING)
// =====================================================================
async function sinkronisasiAkunDanCekResetBulan(uid) {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    const hariIni = new Date();
    const stringBulanIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}`;

    if (docSnap.exists()) {
        const data = docSnap.data();
        currentBalance = data.balance || 0;
        currentSavings = data.savings || 0;
        disiplinActive = data.disiplinActive || false;
        
        // Deteksi apakah bulan berjalan sudah berganti dari catatan login terakhir user
        const lastResetMonth = data.lastResetMonth || stringBulanIni;
        
        if (lastResetMonth !== stringBulanIni && currentBalance > 0) {
            // JIKA BULAN BERGANTI: Sisa saldo bulan lalu disapu bersih dan dimasukkan otomatis ke tabungan
            currentSavings += currentBalance;
            alert(`Periode baru dimulai! Sisa saldo bulan lalu sebesar Rp. ${currentBalance.toLocaleString('id-ID')} otomatis dialihkan ke tabungan.`);
            currentBalance = 0;
            
            await setDoc(userRef, { 
                balance: currentBalance, 
                savings: currentSavings, 
                lastResetMonth: stringBulanIni,
                disiplinActive: false // nonaktifkan otomatis untuk setup awal nominal baru
            }, { merge: true });
        }
    } else {
        await setDoc(userRef, { balance: 0, savings: 0, lastResetMonth: stringBulanIni, disiplinActive: false });
    }
    
    // Sinkronisasi data ke tampilan layar komponen
    toggleModeDisiplin.checked = disiplinActive;
    if (disiplinActive) { boxKonfigurasiDisiplin.classList.remove('hidden'); }
    profileSavingDisplay.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(currentSavings);
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(currentBalance);
    
    await loadRulesFromCloud(uid);
}

// =====================================================================
// 4. FIX: IMPLEMENTASI MODE DISIPLIN & INTERSEPTOR ATURAN (OVERSPENDING)
// =====================================================================
toggleModeDisiplin.addEventListener('change', (e) => {
    disiplinActive = e.target.checked;
    if (disiplinActive) {
        boxKonfigurasiDisiplin.classList.remove('hidden');
    } else {
        boxKonfigurasiDisiplin.classList.add('hidden');
        matikanModeDisiplinDiCloud();
    }
});

async function matikanModeDisiplinDiCloud() {
    if (auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { disiplinActive: false }, { merge: true });
        alert("Mode Disiplin dinonaktifkan.");
    }
}

btnGetSaldo.addEventListener('click', () => {
    nominalAwalVal = currentBalance;
    inputNominalAwal.value = nominalAwalVal;
    hitungAlokasiTabunganOtomatis();
});

// Setup tombol level tingkatan menabung
const levelButtons = { 'kustom': document.getElementById('lvl-kustom'), 'sulit': document.getElementById('lvl-sulit'), 'sedang': document.getElementById('lvl-sedang'), 'mudah': document.getElementById('lvl-mudah') };
Object.keys(levelButtons).forEach(lvl => {
    levelButtons[lvl].addEventListener('click', () => {
        Object.values(levelButtons).forEach(btn => btn.className = "py-2 rounded-lg text-slate-600");
        levelButtons[lvl].className = "py-2 rounded-lg text-slate-600 bg-white shadow-sm";
        tipeMenabungLevel = lvl;
        hitungAlokasiTabunganOtomatis();
    });
});

function hitungAlokasiTabunganOtomatis() {
    let persen = 0;
    inputNilaiTabungan.removeAttribute('readonly');
    if (tipeMenabungLevel === 'mudah') { persen = 10; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    else if (tipeMenabungLevel === 'sedang') { persen = 20; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    else if (tipeMenabungLevel === 'sulit') { persen = 30; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    
    labelTabunganPersen.innerText = `Tabungan (${persen}%)`;
    if (tipeMenabungLevel !== 'kustom') {
        inputNilaiTabungan.value = Math.round(nominalAwalVal * (persen / 100));
    }
}

// SIMPAN KONFIGURASI TOTAL MODE DISIPLIN
btnSimpanDisiplinConfig.addEventListener('click', async () => {
    const nilaiTabungan = parseInt(inputNilaiTabungan.value) || 0;
    if (nominalAwalVal <= 0 || nilaiTabungan <= 0) {
        alert("Harap tentukan Nominal Awal dan nilai tabungan.");
        return;
    }
    if (nilaiTabungan > currentBalance) {
        alert("Nilai alokasi tabungan melebihi sisa saldo berjalan Anda!");
        return;
    }

    // POTONG SALDO LANGSUNG MASUK KE TABUNGAN SESUAI KETENTUAN
    currentBalance -= nilaiTabungan;
    currentSavings += nilaiTabungan;

    try {
        const uid = auth.currentUser.uid;
        // Amankan data ke dokumen User utama
        await setDoc(doc(db, "users", uid), {
            balance: currentBalance,
            savings: currentSavings,
            disiplinActive: true
        }, { merge: true });

        // Simpan seluruh aturan batasan ke sub-koleksi cloud
        for (const rule of aturanBatasKategori) {
            await setDoc(doc(db, "users", uid, "rules", rule.kategori), rule);
        }

        alert("Mode Disiplin Berhasil Disimpan! Alokasi dana tabungan langsung dikunci.");
        sinkronisasiAkunDanCekResetBulan(uid);
    } catch (err) {
        alert(err.message);
    }
});

// ==========================================
// FORM SUB-LAYAR KETIGA: RULES PICKER
// ==========================================
btnTambahAturan.addEventListener('click', () => {
    subDisiplinUtama.classList.add('hidden');
    subDisiplinRulesPicker.classList.remove('hidden');
    renderKategoriRulesSelection();
});

btnCancelRule.addEventListener('click', () => {
    subDisiplinRulesPicker.classList.add('hidden');
    subDisiplinUtama.classList.remove('hidden');
    ruleSelectedKategori = '';
});

tabRulePerhari.addEventListener('click', () => { ruleSelectedPeriod = 'hari'; tabRulePerhari.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm"; tabRulePerbulan.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500"; });
tabRulePerbulan.addEventListener('click', () => { ruleSelectedPeriod = 'bulan'; tabRulePerbulan.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm"; tabRulePerhari.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500"; });

function renderKategoriRulesSelection() {
    gridKategoriRules.innerHTML = '';
    kategoriData.expense.forEach(kat => {
        const itemBox = document.createElement('div');
        itemBox.className = "flex flex-col items-center p-2 rounded-xl cursor-pointer bg-slate-50 border border-transparent hover:bg-pink-50";
        itemBox.innerHTML = `<div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-base ${kat.color}"><i class="fa-solid ${kat.icon}"></i></div><span class="text-[9px] font-bold mt-1 text-slate-700">${kat.name}</span>`;
        itemBox.addEventListener('click', () => {
            document.querySelectorAll('#grid-kategori-rules > div').forEach(el => el.classList.remove('bg-pink-100', 'border-pink-300'));
            itemBox.classList.add('bg-pink-100', 'border-pink-300');
            ruleSelectedKategori = kat.name;
        });
        gridKategoriRules.appendChild(itemBox);
    });
}

btnSaveRule.addEventListener('click', () => {
    const limitMax = parseInt(inputNominalMaksimalRule.value) || 0;
    if (!ruleSelectedKategori || limitMax <= 0) { alert("Pilih kategori dan nilai nominal maksimal."); return; }
    
    const objekRuleBaru = { kategori: ruleSelectedKategori, periode: ruleSelectedPeriod, limit: limitMax };
    
    // Perbarui array lokal (timpa jika kategori sama)
    aturanBatasKategori = aturanBatasKategori.filter(r => r.kategori !== ruleSelectedKategori);
    aturanBatasKategori.push(objekRuleBaru);
    
    renderRulesListDOM();
    btnCancelRule.click();
});

function renderRulesListDOM() {
    rulesListContainer.innerHTML = '';
    aturanBatasKategori.forEach(rule => {
        const row = document.createElement('div');
        row.className = "bg-pink-50/60 border border-pink-100 rounded-xl p-3 flex justify-between items-center text-xs animate-fadeIn";
        row.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${rule.kategori}</p>
                <p class="text-[9px] text-slate-400 font-medium">Batas Maksimal: Per ${rule.periode}</p>
            </div>
            <div class="text-right">
                <span class="font-black text-slate-700">Rp. ${rule.limit.toLocaleString('id-ID')}</span>
                <button class="block text-[9px] text-red-400 font-bold hover:underline mt-0.5" onclick="hapusRuleLokal('${rule.kategori}')">Hapus</button>
            </div>
        `;
        rulesListContainer.appendChild(row);
    });
}

window.hapusRuleLokal = async (katName) => {
    aturanBatasKategori = aturanBatasKategori.filter(r => r.kategori !== katName);
    if(auth.currentUser) {
        try { await deleteDoc(doc(db, "users", auth.currentUser.uid, "rules", katName)); } catch(e){}
    }
    renderRulesListDOM();
};

async function loadRulesFromCloud(uid) {
    aturanBatasKategori = [];
    try {
        const snap = await getDocs(collection(db, "users", uid, "rules"));
        snap.forEach(doc => { aturanBatasKategori.push(doc.data()); });
        renderRulesListDOM();
    } catch(e){}
}

// =====================================================================
// 5. INTERSEPTOR TRANSAKSI BARU (PROTEKSI NOTIFIKASI DISIPLIN)
// =====================================================================
function pembagiTabKategori(type) {
    selectedType = type;
    if (type === 'income') {
        tabPemasukan.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
        tabPengeluaran.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500 transition";
    } else {
        tabPengeluaran.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
        tabPemasukan.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500 transition";
    }
}
tabPemasukan.addEventListener('click', () => { pembagiTabKategori('income'); selectedKategori = ''; renderKategori(); });
tabPengeluaran.addEventListener('click', () => { pembagiTabKategori('expense'); selectedKategori = ''; renderKategori(); });

function renderKategori() {
    kategoriGrid.innerHTML = '';
    kategoriData[selectedType].forEach(kat => {
        const itemBox = document.createElement('div');
        itemBox.className = "flex flex-col items-center p-2 rounded-xl cursor-pointer hover:bg-pink-50 transition border border-transparent";
        itemBox.innerHTML = `<div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner mb-1 text-xl ${kat.color}"><i class="fa-solid ${kat.icon}"></i></div><span class="text-[10px] font-medium text-slate-700">${kat.name}</span>`;
        itemBox.addEventListener('click', () => {
            document.querySelectorAll('#kategori-grid > div').forEach(el => el.classList.remove('bg-pink-100', 'border-pink-300'));
            itemBox.classList.add('bg-pink-100', 'border-pink-300');
            selectedKategori = kat.name;
        });
        kategoriGrid.appendChild(itemBox);
    });
}

btnSubmitTransaksi.addEventListener('click', async () => {
    const amount = parseInt(transactionAmount.value);
    const currentUser = auth.currentUser;

    if (!amount || amount <= 0 || !selectedKategori) { alert("Data input transaksi belum lengkap."); return; }

    if (selectedType === 'expense') {
        if (amount > currentBalance) { alert("Transaksi gagal! Saldo utama Anda habis."); return; }

        // CEK INTEGRASI INTERSEPTOR MODE DISIPLIN
        if (disiplinActive) {
            const ruleDitemukan = aturanBatasKategori.find(r => r.kategori === selectedKategori);
            if (ruleDitemukan && amount > ruleDitemukan.limit) {
                // JIKA MELEBIHI: Munculkan modal/notifikasi konfirmasi sesuai instruksi Anda
                const lanjut = confirm(`[PERINGATAN DISIPLIN TANGGALTUA]\n\nPengeluaran untuk "${selectedKategori}" sebesar Rp. ${amount.toLocaleString('id-ID')} mendobrak batas aturan maksimal Anda (Batas: Rp. ${ruleDitemukan.limit.toLocaleString('id-ID')}).\n\nApakah Anda tetap ingin melanjutkannya?`);
                if (!lanjut) return; // batalkan transaksi jika user menekan cancel
            }
        }
        currentBalance -= amount;
    } else {
        currentBalance += amount;
    }

    const sekarang = new Date();
    const waktuJamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    const payload = { uid: currentUser.uid, amount: amount, type: selectedType, kategori: selectedKategori, dateStr: formatTanggalDatabase(currentDate), timeStr: waktuJamMenit, timestamp: Date.now() };

    try {
        await addDoc(collection(db, "transactions"), payload);
        await setDoc(doc(db, "users", currentUser.uid), { balance: currentBalance }, { merge: true });
        alert("Transaksi berhasil disimpan!");
        btnCancelTransaksi.click();
        loadHistoriHariIni(currentUser.uid);
    } catch (err) { alert(err.message); }
});

async function loadHistoriHariIni(uid) {
    historiList.innerHTML = '';
    const tglDb = formatTanggalDatabase(currentDate);
    try {
        const q = query(collection(db, "transactions"), where("uid", "==", uid), where("dateStr", "==", tglDb), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) { historiList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-10">Belum ada transaksi hari ini.</p>'; return; }
        snap.forEach(doc => {
            const data = doc.data();
            const sign = data.type === 'income' ? '+' : '-';
            const color = data.type === 'income' ? 'text-green-600' : 'text-slate-700';
            const kf = [...kategoriData.expense, ...kategoriData.income].find(k => k.name === data.kategori);
            const item = document.createElement('div');
            item.className = "flex justify-between items-center bg-white border border-pink-50 rounded-2xl px-4 py-3 shadow-sm";
            item.innerHTML = `<div class="flex items-center gap-3"><div class="w-10 h-10 bg-[#fbcfe8] bg-opacity-40 rounded-xl flex items-center justify-center text-slate-700"><i class="fa-solid ${kf?kf.icon:'fa-tags'}"></i></div><div><p class="text-xs font-bold text-slate-800">${data.kategori}</p><p class="text-[10px] text-slate-400">${data.timeStr}</p></div></div><span class="text-xs font-bold ${color}">${sign} Rp. ${data.amount.toLocaleString('id-ID')}</span>`;
            historiList.appendChild(item);
        });
    } catch(e){}
}

// =====================================================================
// 6. MENU LAPORAN (REPORT DENGAN DOKUMEN INFO TABUNGAN DI TENGAH)
// =====================================================================
const repBtnPrevMonth = document.getElementById('rep-btn-prev-month');
const repBtnNextMonth = document.getElementById('rep-btn-next-month');
const repMonthDisplay = document.getElementById('rep-month-display');
const repTotalIncome = document.getElementById('rep-total-income');
const repTotalSaving = document.getElementById('rep-total-saving'); // Ikon tengah baru
const repTotalExpense = document.getElementById('rep-total-expense');
const repBtnPrevType = document.getElementById('rep-btn-prev-type');
const repBtnNextType = document.getElementById('rep-btn-next-type');
const repTypeDisplay = document.getElementById('rep-type-display');
const repDataList = document.getElementById('rep-data-list');

let activeChartInstance = null;
document.getElementById('nav-laporan').addEventListener('click', () => updateHalamanLaporan());

async function updateHalamanLaporan() {
    repMonthDisplay.innerText = reportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const tipeAktif = reportTypes[currentTypeIndex];
    repTypeDisplay.innerText = tipeAktif === 'rata-rata' ? 'Rata Rata' : tipeAktif;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
        const snap = await getDocs(query(collection(db, "transactions"), where("uid", "==", uid)));
        let totalIncomeValue = 0, totalExpenseValue = 0;
        let kategoriKalkulator = {}, harianKalkulator = {};

        const stringTahunBulan = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
        const jumlahHari = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= jumlahHari; d++) { harianKalkulator[`${stringTahunBulan}-${String(d).padStart(2, '0')}`] = 0; }

        snap.forEach(doc => {
            const data = doc.data();
            if (data.dateStr && data.dateStr.startsWith(stringTahunBulan)) {
                if (data.type === 'income') totalIncomeValue += data.amount;
                if (data.type === 'expense') totalExpenseValue += data.amount;
                if (data.type === (tipeAktif === 'pemasukan' ? 'income' : 'expense')) { kategoriKalkulator[data.kategori] = (kategoriKalkulator[data.kategori] || 0) + data.amount; }
                if (data.type === 'expense') { harianKalkulator[data.dateStr] = (harianKalkulator[data.dateStr] || 0) + data.amount; }
            }
        });

        // Hitung akumulasi tabungan khusus bulan ini dari Firestore data User
        const userSnap = await getDoc(doc(db, "users", uid));
        const totalSavingsValue = userSnap.exists() ? (userSnap.data().savings || 0) : 0;

        repTotalIncome.innerText = `Rp ${totalIncomeValue.toLocaleString('id-ID')}`;
        repTotalExpense.innerText = `Rp ${totalExpenseValue.toLocaleString('id-ID')}`;
        repTotalSaving.innerText = `Rp ${totalSavingsValue.toLocaleString('id-ID')}`; // Pasang data tengah

        if (activeChartInstance) activeChartInstance.destroy();
        if (tipeAktif === 'pemasukan' || tipeAktif === 'pengeluaran') { renderDonutChart(kategoriKalkulator, tipeAktif === 'pemasukan' ? totalIncomeValue : totalExpenseValue); }
        else { renderLineChart(harianKalkulator); }
    } catch (err) { console.error(err); }
}

// (Fungsi renderDonutChart dan renderLineChart tetap sama seperti modul bebas bug sebelumnya)
function renderDonutChart(dataObj, totalUang) { repDataList.innerHTML = ''; const labelData = Object.keys(dataObj); const valueData = Object.values(dataObj); if (labelData.length === 0) { repDataList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada data.</p>'; const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Kosong'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] }, options: { plugins: { legend: { display: false } } } }); return; } const warnaWarni = ['#60a5fa', '#c084fc', '#34d399', '#4ade80', '#f87171', '#fbbf24', '#d97706', '#2dd4bf']; const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: labelData, datasets: [{ data: valueData, backgroundColor: warnaWarni.slice(0, labelData.length), borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' } }); labelData.forEach((label, index) => { const nominal = valueData[index]; const persentase = totalUang > 0 ? Math.round((nominal / totalUang) * 100) : 0; const row = document.createElement('div'); row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-2xl px-4 py-2.5 shadow-sm text-xs"; row.innerHTML = `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background-color: ${warnaWarni[index]}"></div><span class="font-bold text-slate-700">${label}</span></div><div class="flex gap-4 text-slate-600"><span class="font-medium">${persentase}%</span><span class="font-bold text-slate-800">Rp ${nominal.toLocaleString('id-ID')}</span></div>`; repDataList.appendChild(row); }); }
function renderLineChart(harianObj) { repDataList.innerHTML = ''; const arrayTanggalKeys = Object.keys(harianObj); const arrayNilaiValues = Object.values(harianObj); const labelHariSaja = arrayTanggalKeys.map(k => parseInt(k.split('-')[2])); const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'line', data: { labels: labelHariSaja, datasets: [{ data: arrayNilaiValues, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 2, tension: 0.3, pointRadius: 1, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } } }); const headerRow = document.createElement('div'); headerRow.className = "flex justify-between px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1"; headerRow.innerHTML = `<span>Tanggal</span><span>Total Pengeluaran</span>`; repDataList.appendChild(headerRow); let adaTransaksi = false; arrayTanggalKeys.forEach((tglFull, index) => { const pengeluaranHariIni = arrayNilaiValues[index]; if (pengeluaranHariIni > 0) { adaTransaksi = true; const formatTglIndo = new Date(tglFull).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); const row = document.createElement('div'); row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-xl px-4 py-2 shadow-sm text-xs"; row.innerHTML = `<span>${formatTglIndo}</span><span class="font-bold text-slate-800">Rp ${pengeluaranHariIni.toLocaleString('id-ID')}</span>`; repDataList.appendChild(row); } }); if (!adaTransaksi) { repDataList.innerHTML += '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada catatan pengeluaran bulan ini.</p>'; } }