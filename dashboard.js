// dashboard.js
import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// ==========================================
// KUMPULAN ELEMEN DOM UTAMA
// ==========================================
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
const tabPemasukan = document.getElementById('tab-pemasukan');
const tabPengeluaran = document.getElementById('tab-pengeluaran');
const transactionAmount = document.getElementById('transaction-amount');
const kategoriGrid = document.getElementById('kategori-grid');

// DOM Mode Disiplin
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

// DOM Akun/Profile
const profileSavingDisplay = document.getElementById('profile-saving-display');
const inputFileAvatar = document.getElementById('input-file-avatar');
const imgUserAvatar = document.getElementById('img-user-avatar');
const iconUserDefault = document.getElementById('icon-user-default');

// ==========================================
// GLOBAL STATE MANAJEMEN
// ==========================================
let currentDate = new Date(); // Otomatis Deteksi Tanggal Sekarang (29 Mei 2026)
let reportDate = new Date();  
let currentBalance = 0;
let currentSavings = 0; 
let selectedType = 'expense'; 
let selectedKategori = '';
let editingTransactionId = null; 

// State Khusus Disiplin Mode
let disiplinActive = false;
let nominalAwalVal = 0;
let tipeMenabungLevel = 'kustom';
let aturanBatasKategori = []; 
let ruleSelectedKategori = '';
let ruleSelectedPeriod = 'hari'; 

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
// 1. SISTEM NAVIGASI (MENU UTAMA BOTTOM BAR)
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

btnBukaInput.addEventListener('click', () => {
    editingTransactionId = null;
    btnSubmitTransaksi.innerText = "Submit";
    subLayarHistori.classList.add('hidden');
    subLayarInput.classList.remove('hidden');
    renderKategori();
});

btnCancelTransaksi.addEventListener('click', () => {
    subLayarInput.classList.add('hidden');
    subLayarHistori.classList.remove('hidden');
    transactionAmount.value = '';
    selectedKategori = '';
    editingTransactionId = null;
});

function formatTanggalString(dateObj) { return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
function formatTanggalDatabase(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

document.getElementById('btn-prev-date').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); updateTanggalLayar(); });
document.getElementById('btn-next-date').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 1); updateTanggalLayar(); });
function updateTanggalLayar() { currentDateDisplay.innerText = formatTanggalString(currentDate); if(auth.currentUser) loadHistoriHariIni(auth.currentUser.uid); }

// ==========================================
// 2. SISTEM RESET BULANAN & SINKRONISASI DATA
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('user-display-name').innerText = user.displayName || "Pengguna TanggalTua";
        document.getElementById('user-email').innerText = user.email;
        if (user.photoURL) { imgUserAvatar.src = user.photoURL; imgUserAvatar.classList.remove('hidden'); iconUserDefault.classList.add('hidden'); }
        
        await cekResetAkhirBulanDanSync(user.uid);
        updateTanggalLayar();
        pindahMenuUtama('transaksi'); 
    } else {
        window.location.href = "index.html";
    }
});

async function cekResetAkhirBulanDanSync(uid) {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    const sekarang = new Date();
    const stringBulanSekarang = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;

    if (docSnap.exists()) {
        const data = docSnap.data();
        currentBalance = data.balance || 0;
        currentSavings = data.savings || 0;
        disiplinActive = data.disiplinActive || false;
        
        const lastResetMonth = data.lastResetMonth || stringBulanSekarang;
        
        if (lastResetMonth !== stringBulanSekarang && currentBalance > 0) {
            currentSavings += currentBalance;
            alert(`Periode baru dimulai! Sisa uang bulan lalu sebesar Rp ${currentBalance.toLocaleString('id-ID')} otomatis dimasukkan ke tabungan.`);
            currentBalance = 0;
            
            await setDoc(userRef, { 
                balance: currentBalance, 
                savings: currentSavings, 
                lastResetMonth: stringBulanSekarang,
                disiplinActive: false 
            }, { merge: true });
        }
    } else {
        await setDoc(userRef, { balance: 0, savings: 0, lastResetMonth: stringBulanSekarang, disiplinActive: false });
    }
    
    toggleModeDisiplin.checked = disiplinActive;
    if (disiplinActive) boxKonfigurasiDisiplin.classList.remove('hidden');
    updateBalanceDOM();
    await loadRulesFromCloud(uid);
}

function updateBalanceDOM() {
    balanceDisplay.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(currentBalance);
    profileSavingDisplay.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(currentSavings);
}

// ==========================================
// 3. PENGELOLA FORM KATEGORI TRANSAKSI
// ==========================================
function setTabFormType(type) {
    selectedType = type;
    if (type === 'income') {
        tabPemasukan.className = "flex-1 bg-white text-center py-2 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
        tabPengeluaran.className = "flex-1 text-center py-2 text-xs font-semibold rounded-full text-slate-500 transition";
    } else {
        tabPengeluaran.className = "flex-1 bg-white text-center py-2 text-xs font-bold rounded-full text-slate-800 shadow-sm transition";
        tabPemasukan.className = "flex-1 text-center py-2 text-xs font-semibold rounded-full text-slate-500 transition";
    }
}
tabPemasukan.addEventListener('click', () => { setTabFormType('income'); selectedKategori = ''; renderKategori(); });
tabPengeluaran.addEventListener('click', () => { setTabFormType('expense'); selectedKategori = ''; renderKategori(); });

function renderKategori() {
    kategoriGrid.innerHTML = '';
    kategoriData[selectedType].forEach(kat => {
        const itemBox = document.createElement('div');
        const activeStyle = (kat.name === selectedKategori) ? 'bg-pink-100 border-pink-300' : 'border-transparent';
        itemBox.className = `flex flex-col items-center p-2 rounded-xl cursor-pointer hover:bg-pink-50 transition border ${activeStyle}`;
        itemBox.innerHTML = `<div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner mb-1 text-xl ${kat.color}"><i class="fa-solid ${kat.icon}"></i></div><span class="text-[10px] font-medium text-slate-700">${kat.name}</span>`;
        itemBox.addEventListener('click', () => {
            document.querySelectorAll('#kategori-grid > div').forEach(el => el.classList.remove('bg-pink-100', 'border-pink-300'));
            itemBox.classList.add('bg-pink-100', 'border-pink-300');
            selectedKategori = kat.name;
        });
        kategoriGrid.appendChild(itemBox);
    });
}

// =====================================================================
// 4. KODE FITUR LAMA: RENDERING HISTORI DENGAN GESER (SWIPE GESTURE)
// =====================================================================
async function loadHistoriHariIni(uid) {
    historiList.innerHTML = '';
    const tglDb = formatTanggalDatabase(currentDate);

    try {
        const q = query(collection(db, "transactions"), where("uid", "==", uid), where("dateStr", "==", tglDb), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        if (snap.empty) {
            historiList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-10">Belum ada transaksi hari ini.</p>';
            return;
        }

        snap.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const id = documentSnapshot.id;
            const sign = data.type === 'income' ? '+' : '-';
            const color = data.type === 'income' ? 'text-green-600' : 'text-slate-700';
            const kf = [...kategoriData.expense, ...kategoriData.income].find(k => k.name === data.kategori);

            const itemWrapper = document.createElement('div');
            itemWrapper.className = "relative overflow-hidden rounded-2xl min-h-[66px] w-full border border-pink-50 shadow-sm";
            itemWrapper.innerHTML = `
                <div class="absolute inset-0 bg-pink-100 flex items-center justify-around px-4 z-0">
                    <button class="btn-swipe-hapus bg-[#f87171] text-white font-bold px-4 py-1.5 rounded-full text-xs shadow-sm active:scale-95 transition">Hapus</button>
                    <button class="btn-swipe-edit bg-[#fbbf24] text-slate-800 font-bold px-5 py-1.5 rounded-full text-xs shadow-sm active:scale-95 transition">Edit</button>
                    <button class="btn-swipe-batal bg-[#4ade80] text-white font-bold px-4 py-1.5 rounded-full text-xs shadow-sm active:scale-95 transition">Batal</button>
                </div>
                <div class="layer-konten flex justify-between items-center bg-white px-4 py-3 relative z-10 w-full h-full transition-transform duration-300 transform translate-x-0 cursor-grab select-none">
                    <div class="flex items-center gap-3 pointer-events-none">
                        <div class="w-10 h-10 bg-[#fbcfe8] bg-opacity-40 rounded-xl flex items-center justify-center text-slate-700"><i class="fa-solid ${kf?kf.icon:'fa-tags'}"></i></div>
                        <div><p class="text-xs font-bold text-slate-800">${data.kategori}</p><p class="text-[10px] text-slate-400">${data.timeStr}</p></div>
                    </div>
                    <span class="text-xs font-bold ${color} pointer-events-none">${sign} Rp. ${data.amount.toLocaleString('id-ID')}</span>
                </div>
            `;

            const layerKonten = itemWrapper.querySelector('.layer-konten');
            let startX = 0, currentX = 0, isSwiping = false;

            layerKonten.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isSwiping = true; layerKonten.classList.remove('transition-transform'); });
            layerKonten.addEventListener('touchmove', (e) => { if (!isSwiping) return; currentX = e.touches[0].clientX; let diff = currentX - startX; if (diff < 0 && diff > -260) layerKonten.style.transform = `translateX(${diff}px)`; });
            layerKonten.addEventListener('touchend', () => { isSwiping = false; layerKonten.classList.add('transition-transform'); if (currentX - startX < -60) layerKonten.style.transform = 'translateX(-100%)'; else layerKonten.style.transform = 'translateX(0)'; });
            
            // Mouse Listener bagi Desktop
            layerKonten.addEventListener('mousedown', (e) => { startX = e.clientX; isSwiping = true; layerKonten.classList.remove('transition-transform'); });
            window.addEventListener('mousemove', (e) => { if (!isSwiping) return; currentX = e.clientX; let diff = currentX - startX; if (diff < 0 && diff > -260) layerKonten.style.transform = `translateX(${diff}px)`; });
            window.addEventListener('mouseup', () => { if (!isSwiping) return; isSwiping = false; layerKonten.classList.add('transition-transform'); if (currentX - startX < -60) layerKonten.style.transform = 'translateX(-100%)'; else layerKonten.style.transform = 'translateX(0)'; });

            itemWrapper.querySelector('.btn-swipe-batal').addEventListener('click', () => layerKonten.style.transform = 'translateX(0)');
            
            // PROSES ACTION DELETE LAMA
            itemWrapper.querySelector('.btn-swipe-hapus').addEventListener('click', async () => {
                if (confirm(`Hapus catatan ${data.kategori}?`)) {
                    if (data.type === 'income') currentBalance -= data.amount;
                    else currentBalance += data.amount;
                    await deleteDoc(doc(db, "transactions", id));
                    await setDoc(doc(db, "users", uid), { balance: currentBalance }, { merge: true });
                    updateBalanceDOM();
                    loadHistoriHariIni(uid);
                }
            });

            // PROSES ACTION EDIT LAMA
            itemWrapper.querySelector('.btn-swipe-edit').addEventListener('click', () => {
                editingTransactionId = id;
                transactionAmount.value = data.amount;
                setTabFormType(data.type);
                selectedKategori = data.kategori;
                subLayarHistori.classList.add('hidden');
                subLayarInput.classList.remove('hidden');
                btnSubmitTransaksi.innerText = "Simpan Perubahan";
                renderKategori();
            });

            historiList.appendChild(itemWrapper);
        });
    } catch(e){}
}

// ==========================================
// 5. SUBMIT TRANSAKSI BARU / UPDATE EDIT LAMA
// ==========================================
btnSubmitTransaksi.addEventListener('click', async () => {
    const amount = parseInt(transactionAmount.value);
    const currentUser = auth.currentUser;
    if (!amount || amount <= 0 || !selectedKategori) { alert("Data form belum lengkap."); return; }

    try {
        const userRef = doc(db, "users", currentUser.uid);

        if (editingTransactionId) {
            const oldSnap = await getDoc(doc(db, "transactions", editingTransactionId));
            if (oldSnap.exists()) {
                const old = oldSnap.data();
                if (old.type === 'income') currentBalance -= old.amount;
                else currentBalance += old.amount;
            }
            if (selectedType === 'expense' && amount > currentBalance) { alert("Saldo tidak cukup."); return; }
            
            if (selectedType === 'income') currentBalance += amount;
            else currentBalance -= amount;

            await updateDoc(doc(db, "transactions", editingTransactionId), { amount: amount, type: selectedType, kategori: selectedKategori });
            alert("Berhasil diubah!");
        } else {
            if (selectedType === 'expense') {
                if (amount > currentBalance) { alert("Saldo tidak mencukupi."); return; }
                
                // INTERSEPTOR NOTIFIKASI MODE DISIPLIN
                if (disiplinActive) {
                    const rule = aturanBatasKategori.find(r => r.kategori === selectedKategori);
                    if (rule && amount > rule.limit) {
                        const lanjut = confirm(`[PERINGATAN DISIPLIN]\n\nPengeluaran Kategori "${selectedKategori}" senilai Rp ${amount.toLocaleString('id-ID')} melampaui batas maksimal rule aturan Anda (Batas: Rp ${rule.limit.toLocaleString('id-ID')}).\n\nTetap ingin melanjutkan transaksi ini?`);
                        if (!lanjut) return;
                    }
                }
                currentBalance -= amount;
            } else {
                currentBalance += amount;
            }

            const skrg = new Date();
            const waktu = skrg.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
            await addDoc(collection(db, "transactions"), { uid: currentUser.uid, amount: amount, type: selectedType, kategori: selectedKategori, dateStr: formatTanggalDatabase(currentDate), timeStr: waktu, timestamp: Date.now() });
            alert("Transaksi disimpan!");
        }

        await setDoc(userRef, { balance: currentBalance }, { merge: true });
        updateBalanceDOM();
        btnCancelTransaksi.click();
        loadHistoriHariIni(currentUser.uid);
    } catch(e){ alert(e.message); }
});

// ==========================================
// 6. LOGIKA DAN ATURAN LAYAR MODE DISIPLIN
// ==========================================
toggleModeDisiplin.addEventListener('change', async (e) => {
    disiplinActive = e.target.checked;
    boxKonfigurasiDisiplin.classList.toggle('hidden', !disiplinActive);
    if (!disiplinActive) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { disiplinActive: false }, { merge: true });
        alert("Mode disiplin dinonaktifkan.");
    }
});

btnGetSaldo.addEventListener('click', () => {
    nominalAwalVal = currentBalance;
    inputNominalAwal.value = nominalAwalVal;
    hitungPersenTabungan();
});

const lvlButtons = { 'kustom': document.getElementById('lvl-kustom'), 'sulit': document.getElementById('lvl-sulit'), 'sedang': document.getElementById('lvl-sedang'), 'mudah': document.getElementById('lvl-mudah') };
Object.keys(lvlButtons).forEach(lvl => {
    lvlButtons[lvl].addEventListener('click', () => {
        Object.values(lvlButtons).forEach(b => b.className = "py-2 rounded-lg text-slate-600");
        lvlButtons[lvl].className = "py-2 rounded-lg text-slate-600 bg-white shadow-sm";
        tipeMenabungLevel = lvl;
        hitungPersenTabungan();
    });
});

function hitungPersenTabungan() {
    let persen = 0;
    inputNilaiTabungan.removeAttribute('readonly');
    if (tipeMenabungLevel === 'mudah') { persen = 10; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    else if (tipeMenabungLevel === 'sedang') { persen = 20; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    else if (tipeMenabungLevel === 'sulit') { persen = 30; inputNilaiTabungan.setAttribute('readonly', 'true'); }
    labelTabunganPersen.innerText = `Tabungan (${persen}%)`;
    if (tipeMenabungLevel !== 'kustom') inputNilaiTabungan.value = Math.round(nominalAwalVal * (persen / 100));
}

btnTambahAturan.addEventListener('click', () => { subDisiplinUtama.classList.add('hidden'); subDisiplinRulesPicker.classList.remove('hidden'); renderKategoriRulesSelection(); });
btnCancelRule.addEventListener('click', () => { subDisiplinRulesPicker.classList.add('hidden'); subDisiplinUtama.classList.remove('hidden'); ruleSelectedKategori = ''; });

tabRulePerhari.addEventListener('click', () => { ruleSelectedPeriod = 'hari'; tabRulePerhari.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm"; tabRulePerbulan.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500"; });
tabRulePerbulan.addEventListener('click', () => { ruleSelectedPeriod = 'bulan'; tabRulePerbulan.className = "flex-1 bg-white text-center py-1.5 text-xs font-bold rounded-full text-slate-800 shadow-sm"; tabRulePerhari.className = "flex-1 text-center py-1.5 text-xs font-semibold rounded-full text-slate-500"; });

function renderKategoriRulesSelection() {
    gridKategoriRules.innerHTML = '';
    kategoriData.expense.forEach(kat => {
        const box = document.createElement('div');
        box.className = "flex flex-col items-center p-2 rounded-xl cursor-pointer bg-slate-50 border border-transparent hover:bg-pink-50";
        box.innerHTML = `<div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-base ${kat.color}"><i class="fa-solid ${kat.icon}"></i></div><span class="text-[9px] font-bold mt-1 text-slate-700">${kat.name}</span>`;
        box.addEventListener('click', () => { document.querySelectorAll('#grid-kategori-rules > div').forEach(el => el.classList.remove('bg-pink-100', 'border-pink-300')); box.classList.add('bg-pink-100', 'border-pink-300'); ruleSelectedKategori = kat.name; });
        gridKategoriRules.appendChild(box);
    });
}

btnSaveRule.addEventListener('click', () => {
    const limit = parseInt(inputNominalMaksimalRule.value) || 0;
    if (!ruleSelectedKategori || limit <= 0) { alert("Lengkapi data kriteria batasan."); return; }
    aturanBatasKategori = aturanBatasKategori.filter(r => r.kategori !== ruleSelectedKategori);
    aturanBatasKategori.push({ kategori: ruleSelectedKategori, periode: ruleSelectedPeriod, limit: limit });
    renderRulesListDOM();
    btnCancelRule.click();
});

function renderRulesListDOM() {
    rulesListContainer.innerHTML = '';
    aturanBatasKategori.forEach(rule => {
        const row = document.createElement('div');
        row.className = "bg-pink-50/60 border border-pink-100 rounded-xl p-3 flex justify-between items-center text-xs";
        row.innerHTML = `<div><p class="font-bold text-slate-800">${rule.kategori}</p><p class="text-[9px] text-slate-400">Batas Maksimal: Per ${rule.periode}</p></div><div class="text-right"><span class="font-black text-slate-700">Rp ${rule.limit.toLocaleString('id-ID')}</span><button class="block text-[9px] text-red-400 font-bold hover:underline mt-0.5" onclick="hapusRuleLokal('${rule.kategori}')">Hapus</button></div>`;
        rulesListContainer.appendChild(row);
    });
}

window.hapusRuleLokal = async (katName) => {
    aturanBatasKategori = aturanBatasKategori.filter(r => r.kategori !== katName);
    if(auth.currentUser) { try { await deleteDoc(doc(db, "users", auth.currentUser.uid, "rules", katName)); } catch(e){} }
    renderRulesListDOM();
};

async function loadRulesFromCloud(uid) {
    aturanBatasKategori = [];
    try { const snap = await getDocs(collection(db, "users", uid, "rules")); snap.forEach(doc => aturanBatasKategori.push(doc.data())); renderRulesListDOM(); } catch(e){}
}

btnSimpanDisiplinConfig.addEventListener('click', async () => {
    const tabunganVal = parseInt(inputNilaiTabungan.value) || 0;
    if (nominalAwalVal <= 0 || tabunganVal <= 0) { alert("Isi nominal awal dan nilai tabungan."); return; }
    if (tabunganVal > currentBalance) { alert("Alokasi tabungan melebihi sisa saldomu!"); return; }

    currentBalance -= tabunganVal;
    currentSavings += tabunganVal;

    try {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, "users", uid), { balance: currentBalance, savings: currentSavings, disiplinActive: true }, { merge: true });
        for (const rule of aturanBatasKategori) { await setDoc(doc(db, "users", uid, "rules", rule.kategori), rule); }
        alert("Mode Disiplin Dikunci! Alokasi dana tabungan langsung dikirim ke profil.");
        cekResetAkhirBulanDanSync(uid);
    } catch(e) { alert(e.message); }
});

// ==========================================
// 7. EDIT FOTO PROFILE & BAHASA/TEMA LOCAL
// ==========================================
inputFileAvatar.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            imgUserAvatar.src = reader.result;
            imgUserAvatar.classList.remove('hidden');
            iconUserDefault.classList.add('hidden');
            if (auth.currentUser) await updateDoc(doc(db, "users", auth.currentUser.uid), { avatarBase64: reader.result });
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-edit-name').addEventListener('click', async () => {
    const nama = prompt("Nama profil baru:", auth.currentUser.displayName);
    if(nama) { await updateProfile(auth.currentUser, { displayName: nama }); document.getElementById('user-display-name').innerText = nama; }
});

// ==========================================
// 8. MENU REPORT LAPORAN (CHART.JS)
// ==========================================
const repBtnPrevMonth = document.getElementById('rep-btn-prev-month');
const repBtnNextMonth = document.getElementById('rep-btn-next-month');
const repMonthDisplay = document.getElementById('rep-month-display');
const repTotalIncome = document.getElementById('rep-total-income');
const repTotalSaving = document.getElementById('rep-total-saving'); 
const repTotalExpense = document.getElementById('rep-total-expense');
const repBtnPrevType = document.getElementById('rep-btn-prev-type');
const repBtnNextType = document.getElementById('rep-btn-next-type');
const repTypeDisplay = document.getElementById('rep-type-display');
const repDataList = document.getElementById('rep-data-list');

const reportTypes = ['pemasukan', 'pengeluaran', 'rata-rata'];
let currentTypeIndex = 1; 
let activeChartInstance = null; 

repBtnPrevMonth.addEventListener('click', () => { reportDate.setMonth(reportDate.getMonth() - 1); updateHalamanLaporan(); });
repBtnNextMonth.addEventListener('click', () => { reportDate.setMonth(reportDate.getMonth() + 1); updateHalamanLaporan(); });
repBtnPrevType.addEventListener('click', () => { currentTypeIndex = (currentTypeIndex === 0) ? reportTypes.length - 1 : currentTypeIndex - 1; updateHalamanLaporan(); });
repBtnNextType.addEventListener('click', () => { currentTypeIndex = (currentTypeIndex === reportTypes.length - 1) ? 0 : currentTypeIndex + 1; updateHalamanLaporan(); });

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

        const userSnap = await getDoc(doc(db, "users", uid));
        const totalSavingsValue = userSnap.exists() ? (userSnap.data().savings || 0) : 0;

        repTotalIncome.innerText = `Rp ${totalIncomeValue.toLocaleString('id-ID')}`;
        repTotalExpense.innerText = `Rp ${totalExpenseValue.toLocaleString('id-ID')}`;
        repTotalSaving.innerText = `Rp ${totalSavingsValue.toLocaleString('id-ID')}`; 

        if (activeChartInstance) activeChartInstance.destroy();
        if (tipeAktif === 'pemasukan' || tipeAktif === 'pengeluaran') renderDonutChart(kategoriKalkulator, tipeAktif === 'pemasukan' ? totalIncomeValue : totalExpenseValue);
        else renderLineChart(harianKalkulator);
    } catch (err) { console.error(err); }
}

function renderDonutChart(dataObj, totalUang) { repDataList.innerHTML = ''; const labelData = Object.keys(dataObj); const valueData = Object.values(dataObj); if (labelData.length === 0) { repDataList.innerHTML = '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada data.</p>'; const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Kosong'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] }, options: { plugins: { legend: { display: false } } } }); return; } const warnaWarni = ['#60a5fa', '#c084fc', '#34d399', '#4ade80', '#f87171', '#fbbf24', '#d97706', '#2dd4bf']; const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: labelData, datasets: [{ data: valueData, backgroundColor: warnaWarni.slice(0, labelData.length), borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' } }); labelData.forEach((label, index) => { const nominal = valueData[index]; const persentase = totalUang > 0 ? Math.round((nominal / totalUang) * 100) : 0; const row = document.createElement('div'); row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-2xl px-4 py-2.5 shadow-sm text-xs"; row.innerHTML = `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background-color: ${warnaWarni[index]}"></div><span class="font-bold text-slate-700">${label}</span></div><div class="flex gap-4 text-slate-600"><span class="font-medium">${persentase}%</span><span class="font-bold text-slate-800">Rp ${nominal.toLocaleString('id-ID')}</span></div>`; repDataList.appendChild(row); }); }
function renderLineChart(harianObj) { repDataList.innerHTML = ''; const arrayTanggalKeys = Object.keys(harianObj); const arrayNilaiValues = Object.values(harianObj); const labelHariSaja = arrayTanggalKeys.map(k => parseInt(k.split('-')[2])); const ctx = document.getElementById('financialChart').getContext('2d'); activeChartInstance = new Chart(ctx, { type: 'line', data: { labels: labelHariSaja, datasets: [{ data: arrayNilaiValues, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 2, tension: 0.3, pointRadius: 1, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } } }); const headerRow = document.createElement('div'); headerRow.className = "flex justify-between px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1"; headerRow.innerHTML = `<span>Tanggal</span><span>Total Pengeluaran</span>`; repDataList.appendChild(headerRow); let adaTransaksi = false; arrayTanggalKeys.forEach((tglFull, index) => { const pengeluaranHariIni = arrayNilaiValues[index]; if (pengeluaranHariIni > 0) { adaTransaksi = true; const formatTglIndo = new Date(tglFull).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); const row = document.createElement('div'); row.className = "flex justify-between items-center bg-white border border-pink-50 rounded-xl px-4 py-2 shadow-sm text-xs"; row.innerHTML = `<span>${formatTglIndo}</span><span class="font-bold text-slate-800">Rp ${pengeluaranHariIni.toLocaleString('id-ID')}</span>`; repDataList.appendChild(row); } }); if (!adaTransaksi) { repDataList.innerHTML += '<p class="text-center text-xs text-slate-400 mt-6">Tidak ada catatan pengeluaran bulan ini.</p>'; } }

// Log-out
document.getElementById('btn-logout').addEventListener('click', () => { signOut(auth).catch(err => alert(err.message)); });