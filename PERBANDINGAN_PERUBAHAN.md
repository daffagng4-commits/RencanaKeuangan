# Perbandingan Perubahan Audit Putaran 1 dan Putaran 2 (RenKeu)

## 1. Ringkasan

- Putaran 1 (`bc854d3`, dibanding `f053269`): 11 bug diperbaiki (1 Kritis, 3 Tinggi, 6 Sedang, 1 Rendah) dan 10 teks antarmuka (`TX-01` s.d. `TX-10`).
- Putaran 2 (`85b9ba5` s.d. `83a1719`, dibanding `bc854d3`): 8 bug diperbaiki (4 Tinggi, 3 Sedang, 1 Rendah), 3 tindak lanjut `INFO-01` s.d. `INFO-03`, 1 audit workflow `INFO-04`, 1 observasi `SYNC-01`, dan 13 teks antarmuka (`TX-11` s.d. `TX-23`).
- Total lintas dua putaran: 19 bug diperbaiki, 4 item `INFO`, 1 observasi sinkronisasi, 23 perbaikan teks, serta 14 kasus tes regresi baru (unit naik dari 62 menjadi 76; jadwal tetap 54; bot tetap 18).
- Total file yang disentuh pada `git diff --stat f053269..HEAD`: 29 file (17 file kode/CSS/manifest, 3 hasil build, 2 file dokumentasi diperbarui, 1 file yatim dihapus, 2 file tes baru, dan 4 file dokumen audit).

**Apa artinya bagi pengguna:**
Sebelumnya, saat Anda membayar tagihan terjadwal lalu mencatatnya di Catatan Kas, saldo akhir tahun berkurang dua kali sehingga proyeksi terlihat jauh lebih kecil daripada uang yang sebenarnya tersisa. Menempel angka dengan koma desimal dari aplikasi bank atau Excel juga sempat membuat nominal membengkak seratus kali lipat di formulir atau justru menyusut sejuta kali lipat saat impor perjalanan. Kini seluruh perhitungan saldo, laporan PDF, dan impor angka konsisten; data keuangan lokal di APK tidak lagi ikut tercadangkan otomatis ke cadangan perangkat; tombol kecil di layar HP lebih mudah ditekan tanpa mengubah tampilan; serta pesan error di layar memberi tahu langkah perbaikan yang jelas.

---

## 2. Perbandingan Versi

Seluruh nomor versi aplikasi dan skema data **tidak berubah** (sesuai aturan agar tidak menaikkan versi secara sepihak dan tidak mengubah skema penyimpanan).

| Komponen | Sebelum (`f053269` / awal Putaran 1) | Sesudah (`HEAD` `83a1719` / disk sekarang) | Sumber Bukti |
|---|---|---|---|
| `package.json` (`version`) | `1.0.0` | `1.0.0` (tidak berubah) | `git diff f053269..HEAD -- package.json` (kosong) |
| `package-lock.json` (`version`) | `1.0.0` | `1.0.0` (tidak berubah) | `git diff f053269..HEAD -- package-lock.json` (kosong) |
| Kunci penyimpanan `localStorage` | `rencana-keuangan-v1` | `rencana-keuangan-v1` (tidak berubah) | `js/core/state.js:5` |
| Versi skema data (`RK_SCHEMA_VER`) | `3` | `3` (tidak berubah) | `js/core/state.js:6` |
| Versi build di aplikasi (`#ver-info` / `RK_BUILD`) | `dev` saat build lokal; di CI `RK_BUILD_ID` (`<run>-<sha7>`) | `dev` saat build lokal; di CI `RK_BUILD_ID` (tidak berubah) | `index.dev.html:173`, `build.js:13-30` |
| Service Worker cache (`CACHE_NAME`) | `rk-cache-v44` | `rk-cache-v44` (tidak berubah) | `git diff f053269..HEAD -- sw.js` (kosong) |
| `android/app/build.gradle` (`versionCode` / `versionName`) | Default `1` / `"1.0"` (override env `RK_VERSION_CODE` / `RK_VERSION_NAME`) | Default `1` / `"1.0"` (tidak berubah) | `android/app/build.gradle:6-16` |
| `android/variables.gradle` (`minSdk` / `compileSdk` / `targetSdk`) | `24` / `36` / `36` | `24` / `36` / `36` (tidak berubah) | `android/variables.gradle:2-4` |
| `capacitor.config.json` (`appId`, `appName`, `webDir`, `androidScheme`) | `id.renkeu.app`, `RenKeu`, `dist`, `https` | `id.renkeu.app`, `RenKeu`, `dist`, `https` (tidak berubah) | `git diff f053269..HEAD -- capacitor.config.json` (kosong) |
| `index.html` (ukuran & SHA-256) | `1.757.281 B` (`15ddbbfbc4e31e05...`) | `1.761.565 B` (`6570e7ca98e3021f...`) | `git show f053269:index.html` vs file disk sekarang |
| `dist/index.html` (ukuran & SHA-256) | `1.757.281 B` (`15ddbbfbc4e31e05...`) | `1.761.565 B` (`6570e7ca98e3021f...`) | `git show f053269:dist/index.html` vs file disk sekarang |
| `android/app/src/main/assets/public/index.html` | `1.705.912 B` (`63be393eab63...`) [SUMBER: LAPORAN, file gitignored] | `1.761.565 B` (`6570e7ca98e3021f...`) | `LAPORAN_AUDIT.md` vs pemeriksaan SHA-256 disk pasca `npm run cap:sync` |
| Jumlah tes unit (`npm run test:unit`) | 62/62 lulus (sebelum Putaran 1); 67/67 (akhir Putaran 1) | 76/76 lulus (+14 tes regresi baru) | Eksekusi langsung `npm test` |
| Jumlah tes jadwal (`tests/run-schedule.js`) | 54/54 lulus | 54/54 lulus | Eksekusi langsung `npm test` |
| Jumlah tes bot (`npm run test:bot`) | 18/18 lulus | 18/18 lulus | Eksekusi langsung `npm run test:bot` |

**USULAN Penomoran Versi (belum diterapkan):**
- Usulan: naikkan versi patch `package.json` dari `1.0.0` menjadi `1.0.1` dan `CACHE_NAME` di `sw.js` dari `rk-cache-v44` menjadi `rk-cache-v45` saat Anda siap merilis ke produksi.
- Alasan: seluruh perubahan bersifat perbaikan bug, keamanan, aksesibilitas, dan perapian teks tanpa fitur baru dan tanpa perubahan skema data (`RK_SCHEMA_VER` tetap `3`). Menaikkan `CACHE_NAME` memastikan pengguna PWA/browser lama otomatis menarik bundle `index.html` terbaru.

---

## 3. Peta Perubahan per File

Diurutkan dari file sumber dengan jumlah baris berubah terbanyak pada `git diff --stat f053269..HEAD` (tidak termasuk file hasil build `index.html`, `dist/index.html`, `bot/core.mjs` dan dokumen laporan).

| File | ID yang Menyentuhnya | Jumlah Perubahan (`+tambah / -hapus`) |
|---|---|---|
| `js/core/util.js` | `BUG-02`, `BUG-05`, `BUG-11`, `BUG-14` | +32 / -12 (44 baris) |
| `js/ui/trip.js` | `BUG-03`, `BUG-04`, `BUG-13`, `BUG-15`, `TX-09`, `TX-10`, `TX-22`, `TX-23` | +17 / -16 (33 baris) |
| `js/ui/num-input.js` | `BUG-12` | +19 / -8 (27 baris) |
| `js/sync.js` | `BUG-09`, `BUG-16`, `TX-01`, `TX-14` | +21 / -5 (26 baris) |
| `js/core/state.js` | `BUG-08`, `BUG-17` | +17 / -5 (22 baris) |
| `js/ui/report.js` | `BUG-07`, `BUG-19`, `TX-21` | +15 / -5 (20 baris) |
| `js/ui-mobile/mobile-app.js` | `TX-05`, `TX-12`, `TX-13`, `TX-17`, `TX-18`, `TX-19`, `TX-20` | +8 / -8 (16 baris) |
| `css/mobile.css` | `INFO-03` | +11 / -4 (15 baris) |
| `js/core/schedule.js` | `BUG-06` | +7 / -5 (12 baris) |
| `js/core/calc.js` | `BUG-01` | +7 / -2 (9 baris) |
| `js/ui/browser-app.js` | `TX-02`, `TX-03`, `TX-04`, `TX-11` | +4 / -4 (8 baris) |
| `js/ui/io.js` | `TX-06`, `TX-15`, `TX-16` | +4 / -4 (8 baris) |
| `js/ui/datepick.js` | `BUG-18` | +5 / -1 (6 baris) |
| `ARSITEKTUR.md` | `INFO-01` | +0 / -3 (3 baris) |
| `README.md` | `INFO-01` | +1 / -1 (2 baris) |
| `android/app/src/main/AndroidManifest.xml` | `INFO-02` | +1 / -1 (2 baris) |
| `js/ui/items.js` | `TX-07` | +1 / -1 (2 baris) |
| `js/ui/kas.js` | `BUG-11` | +1 / -1 (2 baris) |
| `js/ui/topbar.js` | `TX-08` | +1 / -1 (2 baris) |

**File hasil build yang disinkronkan:**
- `index.html` (+169 / -83), `dist/index.html` (+169 / -83), `bot/core.mjs` (+47 / -20), serta `android/app/src/main/assets/public/index.html` (gitignored, disinkronkan lewat `npm run cap:sync`).

**File yang dihapus:**
- `js/ui/agenda.js` (-140 baris, kode mati tidak dimuat di `index.dev.html`, dihapus pada `INFO-01` commit `f4aaf8f`).

**File baru yang ditambahkan:**
- `tests/unit/audit_finance.test.js` (+89 baris, 5 kasus tes regresi Putaran 1).
- `tests/unit/audit_putaran2.test.js` (+218 baris, 9 kasus tes regresi Putaran 2).
- Dokumen rencana dan laporan: `RENCANA_AUDIT.md`, `LAPORAN_AUDIT.md`, `PLAN_PUTARAN2.md`, `LAPORAN_AUDIT_2.md`.

---

## 4. Rincian Perbaikan Bug

Catatan sumber: commit `f053269` (`tahap 19.b`) adalah induk langsung dari `bc854d3` (`baseline putaran 1`), sehingga kode sebelum Putaran 1 dapat diambil langsung dari Git (`f053269`), kecuali file lokal gitignored pada `BUG-10`.

### BUG-01: Hitung ganda tagihan tertaut Catatan Kas (`S.real`) di `calc()`
- Keparahan: Kritis | Platform: Keduanya (HTML dan APK) | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/calc.js:40-88` menjadi `js/core/calc.js:40-90`
- Gejala yang dilihat pengguna: Ketika sebuah tagihan terjadwal dibayar dan ditautkan ke transaksi pengeluaran di Catatan Kas, proyeksi saldo akhir tahun, grafik bulanan, dan jatah pengeluaran per bulan berkurang dua kali.
- Sebelum:
```js
    list.forEach(function (t) {
      var mm = new Date(t).getUTCMonth();
      if (S.skip[it.id + '|' + isoD(t)]) {
        skipped[mm].push({ it: it, t: t });
        return;
      }
      var price = priceAt(it, t),
        cat = it.cat || '';
      events[mm].push({ it: it, t: t });
      spend[mm] += price;
```
```js
  var KL = kasLinked();
  if (KL)
    KL.tx.forEach(function (x) {
      if (+x.d.slice(0, 4) !== y) return;
```
- Sesudah:
```js
  var countedLinkedTx = {};
  S.items.forEach(function (it) {
    ...
      var key = it.id + '|' + isoD(t);
      if (S.skip[key]) { skipped[mm].push({ it: it, t: t }); return; }
      var rtx = typeof realTx === 'function' ? realTx(key) : null;
      var price = rtx ? (+rtx.amt || 0) : priceAt(it, t),
        cat = it.cat || '';
      if (rtx && rtx.id) countedLinkedTx[rtx.id] = true;
```
```js
  var KL = kasLinked();
  if (KL)
    KL.tx.forEach(function (x) {
      if (x.id && countedLinkedTx[x.id]) return;
      if (+x.d.slice(0, 4) !== y) return;
```
- Mengapa berubah: `kasDerived()` dan `yearCash()` sudah melewatkan duplikat tagihan yang tertaut ke transaksi kas, tetapi `calc()` sebelumnya tetap menambahkan harga rencana ke `spend[mm]` sekaligus mengurangi transaksi tertaut pada loop `KL.tx`. Kini `calc()` memakai nominal realisasi `rtx.amt` sekali saja lalu melewati `rtx.id` di loop `KL.tx`.
- Contoh angka nyata: Saldo awal Rp 10.000.000, tagihan rencana Listrik PLN Rp 200.000 dibayar aktual Rp 205.000 di Catatan Kas. Sebelum perbaikan `calc().end` menjadi Rp 9.595.000 (kurang Rp 405.000); sesudah perbaikan menjadi Rp 9.795.000, sama persis dengan saldo Catatan Kas.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-01: calc() tidak menghitung ganda tagihan yang tertaut ke Catatan Kas (S.real)`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Buat tagihan Listrik PLN Rp 200.000, lalu catat pengeluaran Catatan Kas Rp 205.000 dengan catatan "bayar listrik pln" hingga otomatis tertaut/lunas. Pastikan saldo akhir tahun di Rincian hanya berkurang Rp 205.000 dan cocok dengan saldo Catatan Kas.
- Status verifikasi: `TERVERIFIKASI` (lulus di `tests/unit/audit_finance.test.js` dan `npm test`).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/calc.js`).

### BUG-02: `parseRp()` menggembungkan 100x input desimal dan membocorkan `Infinity`
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/util.js:63-72` menjadi `js/core/util.js:65-89`
- Gejala yang dilihat pengguna: Saat menempel nominal berdesimal dari aplikasi bank atau Excel (seperti `1.500.000,00`), nilai terbaca seratus kali lipat menjadi Rp 150.000.000. Input angka raksasa seperti `1e308jt` membocorkan `Infinity`.
- Sebelum:
```js
function parseRp(s) {
  s = String(s).toLowerCase().replace(/rp|\s/g, '');
  ...
  s = s.replace(/(m|miliar|milyar|jt|juta|rb|ribu|k)$/, '');
  var v = m > 1 ? parseFloat(s.replace(',', '.')) : parseInt(s.replace(/[.,]/g, ''), 10);
  return isNaN(v) ? 0 : Math.round(v * m);
}
```
- Sesudah:
```js
  if (m > 1) {
    v = parseFloat(s.replace(',', '.'));
  } else if (/^[+-]?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  } else if (/^[+-]?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    v = parseFloat(s.replace(/,/g, ''));
  } else if (/^[+-]?\d+[.,]\d{1,2}$/.test(s)) {
    v = parseFloat(s.replace(',', '.'));
  } else {
    v = parseInt(s.replace(/[.,]/g, ''), 10);
  }
  var out = Math.round(v * m);
  return Number.isFinite(out) ? out : 0;
```
- Mengapa berubah: `parseInt(s.replace(/[.,]/g, ''), 10)` menghapus tanda desimal sehingga dua digit sen di belakang koma bergabung menjadi digit ribuan. Selain itu `isNaN(Infinity)` bernilai `false`, sehingga `Infinity` lolos.
- Contoh angka nyata: `parseRp("1.500.000,00")` berubah dari `150000000` menjadi `1500000`; `parseRp("1.500.000,50")` dari `150000050` menjadi `1500001`; `parseRp("1e308jt")` dari `Infinity` menjadi `0`.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-02: parseRp menangani angka desimal m-banking/Excel dan menolak Infinity`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Tempel `1.500.000,00` pada kolom Saldo Awal atau Catatan Kas, lalu simpan. Pastikan nominal tercatat Rp 1.500.000.
- Status verifikasi: `TERVERIFIKASI` (lulus di `audit_finance.test.js` dan `core.test.js`).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/util.js`).

### BUG-03: `simCalc()` crash saat `kasLinked()` bernilai `null`
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/ui/trip.js:2577-2592` menjadi `js/ui/trip.js:2577-2592`
- Gejala yang dilihat pengguna: Membuka atau menghitung tab Simulasi dapat berhenti dengan `TypeError` bila profil kas utama belum terhubung.
- Sebelum:
```js
function simCalc(list) {
  var keepS = S, KL = kasLinked(), keepTx = KL.tx, extra = [], C = JSON.parse(JSON.stringify(S)), y = +S.year;
  ...
  S = C;
  KL.tx = keepTx.concat(extra);
  try { return calc(); } finally { S = keepS; KL.tx = keepTx; }
}
```
- Sesudah:
```js
function simCalc(list) {
  var keepS = S, KL = kasLinked(), keepTx = KL ? KL.tx : null, extra = [], C = JSON.parse(JSON.stringify(S)), y = +S.year;
  ...
  S = C;
  if (KL) KL.tx = keepTx.concat(extra);
  try { return calc(); } finally { S = keepS; if (KL) KL.tx = keepTx; }
}
```
- Mengapa berubah: `kasLinked()` bisa mengembalikan `null` saat state profil kas belum lengkap, tetapi `simCalc()` langsung membaca dan menulis `KL.tx` tanpa pengecekan null.
- Contoh angka nyata: Tidak ada perubahan angka normal; kondisi `ALL.kas.pr = {}` yang semula melempar `Cannot read properties of null (reading 'tx')` kini mengembalikan hasil `calc()` yang valid.
- Cara uji otomatis: `tests/schedule/sim.test.js` dan verifikasi dinamis `simCalc([])` dengan `ALL.kas.pr = {}`. Perintah: `node tests/schedule/sim.test.js`.
- Cara uji manual: Buka tab Simulasi dan tambah satu skenario pemasukan/pengeluaran, pastikan hasil dampak tampil tanpa galat konsol.
- Status verifikasi: `TERVERIFIKASI` (`sim.test.js` dan repro dinamis pasca-perbaikan lulus).
- Sumber "sebelum": `GIT` (`git show f053269:js/ui/trip.js`).

### BUG-04: Tag HTML rusak `<div"` pada kartu Target Tabungan perjalanan
- Keparahan: Tinggi | Platform: HTML (Browser Mode) | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/ui/trip.js:2108-2110` menjadi `js/ui/trip.js:2108-2110`
- Gejala yang dilihat pengguna: Badge status dampak target tabungan perjalanan terhadap Rencana Keuangan kehilangan gaya chip warnanya karena tag pembuka rusak.
- Sebelum:
```js
      (lk && !goalMonthsIn(g, +S.year).length
        ? '<div" class="chp ic mt8">Bulan menabung ada di tahun ' + ...
        : '') +
      (lk && low && goalMonthsIn(g, +S.year).length ? '<div" class="chp ' + (neg.length ? 'cash' : 'on') + ' mt8">' + ...
```
- Sesudah:
```js
      (lk && !goalMonthsIn(g, +S.year).length
        ? '<div class="chp ic mt8">Bulan menabung ada di tahun ' + ...
        : '') +
      (lk && low && goalMonthsIn(g, +S.year).length ? '<div class="chp ' + (neg.length ? 'cash' : 'on') + ' mt8">' + ...
```
- Mengapa berubah: Terdapat tanda kutip ganda liar tepat setelah `<div` sehingga parser HTML mengabaikan atribut `class="chp ..."`.
- Contoh angka nyata: Tidak berlaku (perbaikan markup HTML).
- Cara uji otomatis: Pemindai HTML statis (0 temuan `<div"`) dan `tests/schedule/tahap3_trip.test.js`. Perintah: `node tests/schedule/tahap3_trip.test.js`.
- Cara uji manual: Di Browser Mode, masuk ke Mode Perjalanan, buat target tabungan yang tersambung ke Rencana Keuangan, lalu pastikan kotak status dampak saldo tampil rapi sebagai chip berwarna.
- Status verifikasi: `TERVERIFIKASI` (output `goalCard()` diperiksa bebas `<div"` dan `tahap3_trip.test.js` lulus).
- Sumber "sebelum": `GIT` (`git show f053269:js/ui/trip.js`).

### BUG-05: `rp()` dan `shortP()` rusak untuk `NaN`, `Infinity`, dan angka negatif
- Keparahan: Sedang | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/util.js:58-60, 127-133` menjadi `js/core/util.js:58-62, 143-153`
- Gejala yang dilihat pengguna: Nilai tak terdefinisi tampil sebagai `"Rp NaN"` atau `"NaN"`, sedangkan nominal negatif besar pada label ringkas grafik tampil panjang tanpa singkatan (`"-2500000"`).
- Sebelum:
```js
function rp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
```
```js
function shortP(p) {
  return p >= 1e6
    ? (p / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + 'jt'
    : p >= 1000
      ? Math.round(p / 1000) + 'rb'
      : String(p);
}
```
- Sesudah:
```js
function rp(n) {
  var num = Number(n);
  if (!Number.isFinite(num)) num = 0;
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}
```
```js
function shortP(p) {
  var num = Number(p);
  if (!Number.isFinite(num)) return '0';
  var neg = num < 0 ? '-' : '';
  var a = Math.abs(num);
  return neg + (a >= 1e6
    ? (a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + 'jt'
    : a >= 1000
      ? Math.round(a / 1000) + 'rb'
      : String(Math.round(a)));
}
```
- Mengapa berubah: Kedua formatter tidak menjaga masukan non-finite dan `shortP()` membandingkan nilai bertanda `p >= 1e6` alih-alih nilai absolut `Math.abs(num)`.
- Contoh angka nyata: `rp(NaN)` menjadi `"Rp 0"`; `shortP(-2500000)` dari `"-2500000"` menjadi `"-2,5jt"`; `shortP(-500000)` dari `"-500000"` menjadi `"-500rb"`.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-05 & BUG-11: rp(), shortP(), dan esc() aman untuk NaN, Infinity, negatif, dan kutip tunggal`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Buat skenario defisit (saldo akhir minus lebih dari Rp 1 juta) di tab Rincian/Simulasi dan pastikan label ringkas menampilkan format seperti `-2,5jt` tanpa teks `NaN`.
- Status verifikasi: `TERVERIFIKASI` (lulus di `audit_finance.test.js`).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/util.js`).

### BUG-06: Batas 4000 langkah `series()` dan `NaN` dari tanggal `mv` rusak
- Keparahan: Sedang | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/schedule.js:59-97` menjadi `js/core/schedule.js:59-99`
- Gejala yang dilihat pengguna: Item harian yang tanggal mulainya lebih dari 10,9 tahun lalu mendadak menghasilkan 0 tagihan di tahun berjalan; data tanggal geser (`mv`) yang rusak menyisipkan `NaN` ke daftar tanggal.
- Sebelum:
```js
  for (k = 0; k < 4000; k++) {
    t = at(it, k);
    if (t > endMs) break;
```
```js
      if (!mvs[d]) return true;
      add.push(Date.parse(mvs[d] + 'T00:00:00Z'));
      return false;
```
- Sesudah:
```js
  for (k = 0; k < 50000; k++) {
    t = at(it, k);
    if (isNaN(t) || t > endMs) break;
```
```js
      if (!mvs[d]) return true;
      var mvMs = Date.parse(mvs[d] + 'T00:00:00Z');
      if (isNaN(mvMs)) return true;
      add.push(mvMs);
      return false;
```
- Mengapa berubah: Batas loop `4000` hanya mencakup sekitar 10,95 tahun untuk siklus harian (`365 * 11 = 4015`), dan `Date.parse()` pada string `mv` tak valid langsung dimasukkan tanpa dicek `isNaN`.
- Contoh angka nyata: Item harian mulai `2010-01-01` yang dilihat pada tahun `2026` meningkat dari `0` kejadian menjadi `365` kejadian.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-06: series() mendukung item harian > 11 tahun dan mengabaikan tanggal mv rusak`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Tambah item berulang setiap 1 hari dengan tanggal mulai `2010-01-01`, lalu cek tab Jadwal tahun 2026 memastikan jadwal terisi penuh.
- Status verifikasi: `TERVERIFIKASI` (lulus di `audit_finance.test.js` dan `core.test.js`).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/schedule.js`).

### BUG-07: Komparator `byD` tidak simetris dan tanggal kabisat palsu di `repData('w')`
- Keparahan: Sedang | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/ui/report.js:27, 79-80` menjadi `js/ui/report.js:29, 80-90` (bergeser +2 baris oleh `BUG-19`)
- Gejala yang dilihat pengguna: Saat pengguna membuka laporan mingguan untuk tahun non-kabisat (misalnya 2026) tepat pada hari kabisat (29 Februari), nama file PDF dan rentang tanggal menghasilkan tanggal palsu `2026-02-29`.
- Sebelum:
```js
  var byD = function (a, b) { return a.d < b.d ? -1 : 1; };
```
```js
  if (p === 'w') {
    var to = y === +today.slice(0, 4) ? today : y + today.slice(4),
      from = addDaysISO(to, -6);
```
- Sesudah:
```js
  var byD = function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; };
```
```js
  if (p === 'w') {
    var to;
    if (y === +today.slice(0, 4)) {
      to = today;
    } else {
      var tm = +today.slice(5, 7),
        td = +today.slice(8, 10),
        maxD = new Date(Date.UTC(y, tm, 0)).getUTCDate();
      to = y + '-' + pad2(tm) + '-' + pad2(Math.min(td, maxD));
    }
    var from = addDaysISO(to, -6);
```
- Mengapa berubah: Penggabungan string `y + today.slice(4)` menempelkan `-02-29` ke tahun non-kabisat, dan `byD` mengembalikan `1` saat `a.d === b.d` sehingga melanggar kontrak komparator stabil.
- Contoh angka nyata: Pada `today = "2024-02-29"` untuk tahun `2026`, nama file berubah dari `laporan-mingguan-2026-02-29.pdf` menjadi `laporan-mingguan-2026-02-28.pdf` (`22 Feb 2026 - 28 Feb 2026`).
- Cara uji otomatis: `tests/unit/report.test.js` dan verifikasi dinamis `repData('w')`. Perintah: `node --test tests/unit/report.test.js`.
- Cara uji manual: Unduh laporan Mingguan dari menu Pengaturan / Laporan dan pastikan rentang 7 hari valid serta terurut rapi.
- Status verifikasi: `TERVERIFIKASI` (repro dinamis pasca-perbaikan dan `report.test.js` lulus).
- Sumber "sebelum": `GIT` (`git show f053269:js/ui/report.js`).

### BUG-08: `restoreSnap()` memanggil `JSON.parse()` tanpa `try/catch`
- Keparahan: Sedang | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/state.js:519-531` menjadi `js/core/state.js:524-543` (bergeser +5 baris oleh `BUG-17`)
- Gejala yang dilihat pengguna: Memulihkan cadangan otomatis yang isinya rusak di penyimpanan lokal menyebabkan aplikasi gagal dengan galat tak tertangani dan sempat menambah entri cadangan baru sebelum crash.
- Sebelum:
```js
  if (!s) return null;
  var back = snap('Sebelum memulihkan');
  ALL = norm(JSON.parse(s.d));
  S = ALL.data[ALL.year];
```
- Sesudah:
```js
  if (!s) return null;
  var parsed;
  try {
    parsed = JSON.parse(s.d);
  } catch (e) {
    if (typeof toast === 'function') toast('Data cadangan rusak dan tidak dapat dipulihkan.');
    return null;
  }
  var back = snap('Sebelum memulihkan');
  ALL = norm(parsed);
```
- Mengapa berubah: `JSON.parse(s.d)` dipanggil tanpa penjagaan, padahal fungsi lain seperti `loadState()` dan `snapList()` sudah memakai `try/catch`.
- Contoh angka nyata: Tidak mengubah angka valid; state `S.saldo` tetap aman (tidak hilang) bila snapshot korup.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-08: restoreSnap() tidak melempar SyntaxError pada JSON cadangan rusak`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Di menu Cadangan Otomatis, lakukan perubahan lalu tekan Urungkan / Pulihkan untuk memastikan pemulihan berjalan mulus.
- Status verifikasi: `TERVERIFIKASI` (lulus di `audit_finance.test.js`).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/state.js`).

### BUG-09: Status offline menyesatkan, tooltip `#ver-info` menumpuk, dan `getSession()` tanpa `.catch()`
- Keparahan: Sedang | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/sync.js:49, 63-67, 103-106` menjadi `js/sync.js:49-53, 67-76, 112-117`
- Gejala yang dilihat pengguna: Saat membuka aplikasi tanpa internet padahal sinkron cloud sudah terpasang, muncul keterangan "Supabase belum diisi". Tooltip status versi juga terus memanjang menumpuk teks lama setiap kali status sinkron diperbarui.
- Sebelum:
```js
    if (vi && t) vi.title = (vi.title ? vi.title + ' · ' : '') + t;
```
```js
  if (!SB_URL || !SB_KEY || !window.supabase) {
    acctUI(null);
    sbStat('Mode lokal (Supabase belum diisi)');
    return;
  }
```
```js
  sb.auth.getSession().then(function (r) {
    var s0 = r && r.data ? r.data.session : null;
    if (s0 || !sbUser) setUser(s0);
  });
```
- Sesudah:
```js
    if (vi && t) {
      if (vi.dataset && vi.dataset.baseTitle == null) vi.dataset.baseTitle = vi.title || '';
      var baseT = (vi.dataset && vi.dataset.baseTitle) || '';
      vi.title = (baseT ? baseT + ' · ' : '') + t;
    }
```
```js
  if (!SB_URL || !SB_KEY) {
    acctUI(null);
    sbStat('Mode lokal (Supabase belum dikonfigurasi)');
    return;
  }
  if (!window.supabase) {
    acctUI(null);
    sbStat('Mode lokal (offline, sinkron cloud tidak tersedia)');
    return;
  }
```
```js
  sb.auth.getSession().then(function (r) {
    var s0 = r && r.data ? r.data.session : null;
    if (s0 || !sbUser) setUser(s0);
  }).catch(function () {
    if (!sbUser) setUser(null);
  });
```
- Mengapa berubah: Kondisi kredensial kosong digabung dengan kondisi SDK CDN gagal dimuat saat offline, `vi.title` selalu menambahkan teks baru di belakang dirinya sendiri, dan `getSession()` tidak menangani penolakan Promise.
- Contoh angka nyata: Tidak berlaku (perilaku status sinkronisasi).
- Cara uji otomatis: `tests/unit/sync_isolation.test.js` dan audit Headless Chrome mode offline. Perintah: `node --test tests/unit/sync_isolation.test.js`.
- Cara uji manual: Matikan internet (Mode Pesawat), buka aplikasi, lalu cek status sinkron memastikan muncul pesan offline, bukan "Supabase belum diisi".
- Status verifikasi: `TERVERIFIKASI` (`sync_isolation.test.js` dan audit dinamis offline lulus).
- Sumber "sebelum": `GIT` (`git show f053269:js/sync.js`).

### BUG-10: Aset web APK lokal tertinggal dari `dist/index.html`
- Keparahan: Sedang | Platform: APK | Putaran: 1 (disinkron ulang Putaran 2) | Commit: tidak di-track Git (gitignored, disinkron via `npm run cap:sync`)
- Lokasi: `android/app/src/main/assets/public/index.html`
- Gejala yang dilihat pengguna: APK yang dibangun dari direktori Android lokal sebelum sinkronisasi memuat versi HTML lama yang tertinggal sekitar 51 KB dari `dist/index.html`.
- Sebelum: File lokal berukuraan `1.705.912 B` (SHA-256 `63be393eab63...`) sementara `dist/index.html` sudah `1.757.281 B` (SUMBER: LAPORAN, belum bisa dicocokkan dengan Git karena folder `assets/public/` masuk `.gitignore`).
- Sesudah: Setelah `npm run cap:sync`, `android/app/src/main/assets/public/index.html` berukuran `1.761.565 B` dengan SHA-256 `6570e7ca98e3021f2ad37dd3844a4aa9ebdf2df7cddf2b5cd29970b6a227b7d5`, identik dengan `index.html` dan `dist/index.html`.
- Mengapa berubah: Build web (`npm run build`) sebelumnya tidak diikuti `npx cap sync android` di mesin lokal.
- Contoh angka nyata: Selisih ukuran turun dari ~51 KB menjadi `0 B` (hash SHA-256 3-arah identik).
- Cara uji otomatis: `npm run cap:sync` diikuti perbandingan SHA-256 3 file.
- Cara uji manual: Bandingkan hash SHA-256 `index.html`, `dist/index.html`, dan `android/app/src/main/assets/public/index.html` setelah build.
- Status verifikasi: `TERVERIFIKASI` (hash 3-arah cocok 100%).
- Sumber "sebelum": `LAPORAN` (nilai sebelum berasal dari `LAPORAN_AUDIT.md`, karena folder aset Android tidak dilacak Git).

### BUG-11: Higiene HTML escaping pada `esc()` dan `P.cur` di Catatan Kas
- Keparahan: Rendah | Platform: Keduanya | Putaran: 1 | Commit: `bc854d3`
- Lokasi: `js/core/util.js:51-55` dan `js/ui/kas.js:290` (baris tetap sama)
- Gejala yang dilihat pengguna: Karakter kutip tunggal (`'`) tidak di-escape oleh `esc()`, dan kode mata uang `P.cur` pada dropdown mata uang kas disisipkan langsung ke HTML.
- Sebelum:
```js
function esc(t) {
  return String(t).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
```
```js
(mode === 'trip' && P.cur && P.rate ? '<select class="wauto" id="kcu"><option value="idr">Rp</option><option value="fx">' + P.cur + '</option></select>' : '') +
```
- Sesudah:
```js
function esc(t) {
  return String(t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
```
```js
(mode === 'trip' && P.cur && P.rate ? '<select class="wauto" id="kcu"><option value="idr">Rp</option><option value="fx">' + esc(P.cur) + '</option></select>' : '') +
```
- Mengapa berubah: Menutup celah injeksi atribut HTML yang memakai tanda kutip tunggal dan menjaga konsistensi escaping pada semua interpolasi DOM.
- Contoh angka nyata: `esc("O'Brien <x>")` berubah dari `"O'Brien &lt;x&gt;"` menjadi `"O&#39;Brien &lt;x&gt;"`.
- Cara uji otomatis: `tests/unit/audit_finance.test.js`, kasus `BUG-05 & BUG-11: rp(), shortP(), dan esc() aman untuk NaN, Infinity, negatif, dan kutip tunggal`. Perintah: `node --test tests/unit/audit_finance.test.js`.
- Cara uji manual: Tambah item atau catatan transaksi dengan nama berisi tanda kutip dan tag HTML (misalnya `O'Brien <b>tes</b>`) dan pastikan tampil sebagai teks biasa.
- Status verifikasi: `TERVERIFIKASI` (`audit_finance.test.js` dan probe XSS Headless Chrome `window.__xss === 0` lulus).
- Sumber "sebelum": `GIT` (`git show f053269:js/core/util.js`, `git show f053269:js/ui/kas.js`).

### BUG-12: `fmtRpBlurStr()` dan `fmtRpInputStr()` menggembungkan 100x input desimal dan mengabaikan negatif
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 2 | Commit: `85b9ba5`
- Lokasi: `js/ui/num-input.js:48-68` menjadi `js/ui/num-input.js:48-79`
- Gejala yang dilihat pengguna: Meski `parseRp()` sudah diperbaiki di Putaran 1, saat pengguna menempel `1.500.000,00` ke kolom input nominal berformat otomatis lalu memindahkan kursor, tampilan angka langsung berubah menjadi `150.000.000`. Input `-500rb` juga tidak terformat menjadi `-500.000`.
- Sebelum:
```js
function fmtRpInputStr(raw) {
  if (raw == null) return '';
  var s = String(raw);
  if (!s || /[^\d.,\s]/.test(s)) return s;
  var d = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtRpBlurStr(raw) {
  ...
  if (/[^\d.,\s]/.test(s) && typeof parseRp === 'function') {
    var n = parseRp(s);
    if (!isNaN(n) && n > 0) return fmtRpInputStr(String(Math.round(n)));
```
- Sesudah:
```js
function fmtRpInputStr(raw) {
  if (raw == null) return '';
  var s = String(raw);
  if (!s) return '';
  var neg = /^\s*-/.test(s);
  var body = neg ? s.replace(/^\s*-/, '') : s;
  if (!body || /[^\d.,\s]/.test(body)) return s;
  var compact = body.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(compact) || /^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(compact) || /^\d+[.,]\d{1,2}$/.test(compact)) {
    var parsed = typeof parseRp === 'function' ? parseRp(s) : Math.round(parseFloat(compact.replace(/\./g, '').replace(',', '.')));
    if (Number.isFinite(parsed)) { ... }
  }
```
```js
  if (typeof parseRp === 'function' && (/[^\d.,\s]/.test(s) || /[.,]\d{1,2}$/.test(s.replace(/\s/g, '')))) {
    var n = parseRp(s);
    if (Number.isFinite(n) && n !== 0) return fmtRpInputStr(String(Math.round(n)));
```
- Mengapa berubah: Pengujian `/[^\d.,\s]/` bernilai `false` untuk `1.500.000,00` sehingga `fmtRpBlurStr()` melewatkan `parseRp()` dan `fmtRpInputStr()` menghapus semua pemisah non-digit. Syarat `n > 0` juga melewatkan nominal negatif.
- Contoh angka nyata: `fmtRpBlurStr("1.500.000,00")` berubah dari `"150.000.000"` menjadi `"1.500.000"`; `fmtRpBlurStr("-500rb")` dari `"-500rb"` menjadi `"-500.000"`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-12: num-input fmtRpBlurStr & fmtRpInputStr tidak menggembungkan desimal 100x dan mendukung shorthand negatif`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Tempel `1.500.000,00` ke kolom Nominal di tab Catatan Kas, lalu ketuk area luar input. Kolom harus menampilkan `1.500.000`.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js` dan `num-input.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/num-input.js`).

### BUG-13: `xlNum()` mengecilkan 1.000.000x angka desimal Excel dan membocorkan `NaN`/`Infinity`
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 2 | Commit: `e0dbbd8`
- Lokasi: `js/ui/trip.js:3096-3107` menjadi `js/ui/trip.js:3096-3108`
- Gejala yang dilihat pengguna: Saat mengimpor jadwal perjalanan dari Excel yang berisi teks biaya seperti `1.500.000,00` atau `1,500,000.00`, biaya tercatat menjadi Rp 1,5 (sejuta kali lebih kecil).
- Sebelum:
```js
function xlNum(v) {
  if (typeof v === 'number') return v;
  ...
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  return parseFloat(t) || 0;
}
```
- Sesudah:
```js
function xlNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  ...
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  var n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}
```
- Mengapa berubah: Pola ribuan lama hanya mencocokkan angka bulat tanpa akhiran desimal, sehingga `"1.500.000,00"` jatuh ke cabang `else` dan `parseFloat("1.500.000.00")` berhenti di titik kedua menjadi `1.5`.
- Contoh angka nyata: `xlNum("1.500.000,00")` berubah dari `1.5` menjadi `1500000`; `xlNum(NaN)` dari `NaN` menjadi `0`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-13: xlNum mengurai format desimal Excel (1.500.000,00 & 1,500,000.00) dan menolak NaN/Infinity`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Impor file `.xlsx` perjalanan yang kolom Biayanya berisi teks `1.500.000,00`, lalu cek ringkasan biaya menampilkan Rp 1.500.000.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/trip.js`).

### BUG-14: `parseRp()` menerima tanda negatif di tengah dan notasi ilmiah liar
- Keparahan: Sedang | Platform: Keduanya | Putaran: 2 | Commit: `9a2ee5c`
- Lokasi: `js/core/util.js:72` menjadi `js/core/util.js:73`
- Gejala yang dilihat pengguna: Salah ketik seperti `50-000` (tanda minus di tengah) diam-diam terbaca sebagai Rp 50, dan input `1e308` terbaca sebagai Rp 1 alih-alih ditolak sebagai 0.
- Sebelum:
```js
  s = s.replace(/(m|miliar|milyar|jt|juta|rb|ribu|k)$/, '');
  var v;
```
- Sesudah:
```js
  s = s.replace(/(m|miliar|milyar|jt|juta|rb|ribu|k)$/, '');
  if (!s || !/^[+-]?[\d.,]+$/.test(s)) return 0;
  var v;
```
- Mengapa berubah: Cabang fallback `parseInt()` berhenti membaca pada karakter non-digit pertama (`-` atau `e`) dan mengembalikan awalan angka yang salah.
- Contoh angka nyata: `parseRp("50-000")` berubah dari `50` menjadi `0`; `parseRp("1e308")` dari `1` menjadi `0`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-14: parseRp menolak tanda negatif di tengah ("50-000") dan notasi ilmiah liar ("1e308")`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Masukkan `50-000` di input Tambah Cepat atau Catatan Kas dan pastikan sistem meminta nominal yang benar (bukan menyimpan Rp 50).
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/core/util.js`).

### BUG-15: `simApply()` crash saat `kasLinked()` null dan `renderSim()` rawan null pada `rows` kosong
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 2 | Commit: `aabba2d`
- Lokasi: `js/ui/trip.js:2721-2731` menjadi `js/ui/trip.js:2721-2731`
- Gejala yang dilihat pengguna: Menekan "Terapkan ke data" pada skenario pemasukan di Simulasi menyebabkan error bila profil kas terhubung tidak ditemukan.
- Sebelum:
```js
    '...<span>Saldo terendah asli</span><b>' + rp(la.ak) + '</b><span>' + MON[la.m] +
    '</span></div><div><span>Saldo terendah simulasi</span><b>' + rp(lb.ak) + '</b><span>' + MON[lb.m] + '</span>...'
```
```js
    else if (x.k === 'in') simMonths(x).forEach(function (mm) { KL.tx.push({ id: kid('s'), d: y + '-' + pad2(mm + 1) + '-01', t: '+', amt: x.amt, cat: 'Simulasi', note: x.name, pay: '' }); });
```
- Sesudah:
```js
    '...<span>Saldo terendah asli</span><b>' + (la ? rp(la.ak) : '\u2014') + '</b><span>' + (la ? MON[la.m] : '') +
    '</span></div><div><span>Saldo terendah simulasi</span><b>' + (lb ? rp(lb.ak) : '\u2014') + '</b><span>' + (lb ? MON[lb.m] : '') + '</span>...'
```
```js
    else if (x.k === 'in') { if (KL && Array.isArray(KL.tx)) simMonths(x).forEach(function (mm) { KL.tx.push({ id: kid('s'), d: y + '-' + pad2(mm + 1) + '-01', t: '+', amt: x.amt, cat: 'Simulasi', note: x.name, pay: '' }); }); }
```
- Mengapa berubah: `simApply()` mewarisi pola bug yang sama dengan `simCalc()` (BUG-03) karena langsung memanggil `KL.tx.push()` tanpa memastikan `KL` ada; `renderSim()` juga langsung membaca `la.ak` dan `lb.ak`.
- Contoh angka nyata: Kondisi `ALL.kas.pr = {}` saat menerapkan skenario tidak lagi melempar `TypeError`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-15: simApply tidak crash saat kasLinked() bernilai null`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Tambah skenario pemasukan di tab Simulasi lalu tekan Terapkan ke data, pastikan transaksi masuk ke Catatan Kas dan bisa diurungkan.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/trip.js`).

### BUG-16: Loop tak berujung `pull()` dan `push()` saat konflik offline multi-perangkat
- Keparahan: Tinggi | Platform: Keduanya | Putaran: 2 | Commit: `4e4f0bc`
- Lokasi: `js/sync.js:373-380, 699-703, 743-750` menjadi `js/sync.js:373-381, 699-705, 744-754`
- Gejala yang dilihat pengguna: Saat dua perangkat sama-sama mengedit data dan perangkat yang lebih baru sempat offline, sinkronisasi cloud bisa terjebak berputar terus-menerus antara memuat dan mengirim ulang. Selain itu kegagalan jaringan saat login email/password tidak menampilkan pesan error.
- Sebelum:
```js
      if (!localChanged || rr >= lr) {
        applyRemote(row);
        finishSync(true);
        return;
      }
      finishSync(!window._rkBootDataAnimated);
      return push();
```
```js
    $('lp').value = '';
  });
```
```js
      ALL.rev = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(ALL));
      } catch (e) {}
      push();
```
- Sesudah:
```js
      if (!localChanged || rr >= lr) {
        applyRemote(row);
        finishSync(true);
        return;
      }
      setSync(rr);
      finishSync(!window._rkBootDataAnimated);
      return push();
```
```js
    $('lp').value = '';
  }).catch(function (err) {
    if ($('lm')) $('lm').textContent = 'Gagal terhubung ke server: ' + ((err && err.message) || 'periksa koneksi internet Anda.');
  });
```
```js
      ALL.rev = Date.now();
      setSync(+row.rev || 0);
      try {
        if (typeof rkWriteCache === 'function') rkWriteCache(ALL);
        else localStorage.setItem(KEY, JSON.stringify(ALL));
      } catch (e) {}
      push();
```
- Mengapa berubah: `pull()` memanggil `push()` ketika revisi lokal lebih baru (`lr > rr`), tetapi `getSync()` masih menyimpan revisi lama (`ls`), sehingga kueri optimistic lock `.eq('rev', prevRev)` mengembalikan 0 baris dan memicu `pull()` lagi tanpa henti.
- Contoh angka nyata: Pada mock `ls = 100`, `rr = 200`, `lr = 300`, jumlah panggilan `pull()` turun dari loop tak terbatas (`> 5` hingga error) menjadi 1 kali dan `cloudRev` terbarui menjadi `300`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-16: sync.js pull() tidak masuk loop pull<->push tak berujung saat konflik offline (lr > rr > ls)`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Login dengan akun yang sama di dua perangkat, ubah data di Perangkat A (online), ubah data di Perangkat B (Mode Pesawat, lebih baru), lalu aktifkan internet di Perangkat B dan pastikan status menjadi Tersinkron tanpa berputar terus.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau via mock Supabase; uji server produksi ditandai di Bagian 8).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/sync.js`).

### BUG-17: `rkWriteCache()` tidak menangkap `QuotaExceededError`
- Keparahan: Sedang | Platform: Keduanya | Putaran: 2 | Commit: `e5dd887`
- Lokasi: `js/core/state.js:456-475` menjadi `js/core/state.js:456-480`
- Gejala yang dilihat pengguna: Saat kuota `localStorage` penuh atau diblokir oleh mode privasi browser, pemanggilan `rkWriteCache()` melempar exception yang tidak tertangkap.
- Sebelum:
```js
function rkWriteCache(obj) {
  var k = rkStorageKey();
  if (!k || typeof localStorage === 'undefined') return;
  localStorage.setItem(k, JSON.stringify(obj || ALL));
}
```
```js
    rkWriteCache(ALL);
    setSaveStatus(true);
```
- Sesudah:
```js
function rkWriteCache(obj) {
  var k = rkStorageKey();
  if (!k || typeof localStorage === 'undefined') return true;
  try {
    localStorage.setItem(k, JSON.stringify(obj || ALL));
    return true;
  } catch (e) {
    return false;
  }
}
```
```js
    var ok = rkWriteCache(ALL);
    setSaveStatus(ok);
```
- Mengapa berubah: `localStorage.setItem()` dipanggil langsung tanpa `try/catch`, sehingga jika gagal, status penyimpanan gagal tidak dilaporkan secara bersih.
- Contoh angka nyata: Tidak berlaku (perlindungan exception penyimpanan).
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-17: rkWriteCache tidak melempar exception saat localStorage penuh (QuotaExceededError)`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Buka aplikasi di jendela privasi browser dengan penyimpanan dibatasi dan pastikan aplikasi tetap dapat dibuka tanpa layar kosong.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/core/state.js`).

### BUG-18: Fallback `tday()` di pemilih tanggal memakai UTC alih-alih tanggal lokal
- Keparahan: Rendah | Platform: HTML | Putaran: 2 | Commit: `a7b1101`
- Lokasi: `js/ui/datepick.js:18` menjadi `js/ui/datepick.js:18-22`
- Gejala yang dilihat pengguna: Bila pemilih tanggal terpanggil sebelum `todayISO()` tersedia pada pukul 00:00 sampai 06:59 WIB, tanggal "hari ini" di kalender dapat mundur satu hari karena memakai jam UTC.
- Sebelum:
```js
  function tday() { return typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10); }
```
- Sesudah:
```js
  function tday() {
    if (typeof todayISO === 'function') return todayISO();
    var d = new Date();
    return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
  }
```
- Mengapa berubah: `toISOString()` selalu menggunakan UTC (7 jam di belakang WIB), sehingga lewat tengah malam WIB menghasilkan tanggal kemarin.
- Contoh angka nyata: Pada `2026-06-16 00:30 WIB` (`2026-06-15T17:30:00Z`), fallback berubah dari `2026-06-15` menjadi `2026-06-16`.
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-18: datepick.js fallback tday() memakai tanggal lokal (bukan UTC toISOString)`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Buka pemilih tanggal pada jam 00:30 WIB dan pastikan penanda hari ini sesuai tanggal lokal.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/datepick.js`).

### BUG-19: `repCollect()` memakai harga rencana alih-alih nominal realisasi `S.real`
- Keparahan: Sedang | Platform: Keduanya | Putaran: 2 | Commit: `b127978`
- Lokasi: `js/ui/report.js:24` menjadi `js/ui/report.js:24-26`
- Gejala yang dilihat pengguna: Pada laporan PDF, tagihan yang sudah lunas dan tertaut ke transaksi Catatan Kas menampilkan angka rencana (misalnya Rp 200.000) di tabel Tagihan, sementara tabel Transaksi Kas dan `calc()` menampilkan angka aktual (Rp 205.000).
- Sebelum:
```js
        var k = it.id + '|' + ds;
        bil.push({ d: ds, name: it.name, cat: it.cat || '-', amt: priceAt(it, t), st: S.paid[k] ? 'Lunas' : S.skip[k] ? 'Dilewati' : 'Belum' });
```
- Sesudah:
```js
        var k = it.id + '|' + ds;
        var rtx = typeof realTx === 'function' ? realTx(k) : null;
        var amt = rtx ? (+rtx.amt || 0) : priceAt(it, t);
        bil.push({ d: ds, name: it.name, cat: it.cat || '-', amt: amt, st: S.paid[k] ? 'Lunas' : S.skip[k] ? 'Dilewati' : 'Belum' });
```
- Mengapa berubah: `repCollect()` selalu memanggil `priceAt(it, t)` tanpa memeriksa apakah tagihan sudah memiliki transaksi realisasi `realTx(k)`.
- Contoh angka nyata: Tagihan rencana Rp 200.000 yang dibayar aktual Rp 205.000 kini muncul Rp 205.000 di tabel Tagihan PDF (sebelumnya Rp 200.000).
- Cara uji otomatis: `tests/unit/audit_putaran2.test.js`, kasus `BUG-19: repCollect memakai nominal realisasi (rtx.amt) untuk tagihan yang tertaut Catatan Kas (S.real)`. Perintah: `node --test tests/unit/audit_putaran2.test.js`.
- Cara uji manual: Tautkan satu tagihan dengan nominal aktual berbeda dari rencana, lalu buka pratinjau/unduh Laporan PDF dan pastikan nominal di tabel Tagihan cocok dengan nominal aktual.
- Status verifikasi: `TERVERIFIKASI` (TDD merah lalu hijau di `audit_putaran2.test.js` dan `report.test.js`).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/report.js`).

### INFO-01: Penghapusan file yatim `js/ui/agenda.js` dan pembersihan dokumentasi
- Keparahan: Informasional | Platform: HTML | Putaran: 2 | Commit: `f4aaf8f`
- Lokasi: `js/ui/agenda.js` (dihapus), `README.md:43`, `ARSITEKTUR.md:57, 159`
- Gejala yang dilihat pengguna: Tidak berdampak langsung ke tampilan; mengurangi kebingungan pemeliharaan kode karena 140 baris di `js/ui/agenda.js` tidak pernah dimuat di `index.dev.html`.
- Sebelum: File `js/ui/agenda.js` (140 baris) ada di repositori dan disebut di `README.md:43` serta dicatat sebagai kode mati di `ARSITEKTUR.md:57, 159`.
- Sesudah: File `js/ui/agenda.js` dihapus (`git rm`), kata `agenda.js` dihapus dari daftar file di `README.md:43`, dan dua catatan kode mati dihapus dari `ARSITEKTUR.md`.
- Mengapa berubah: Membersihkan kode mati sesuai keputusan Anda di Tahap 0 Putaran 2.
- Contoh angka nyata: Jumlah skrip terkompilasi pada `tests/check-bundle.js` berubah dari `55 skrip` menjadi `54 skrip`.
- Cara uji otomatis: `node tests/check-bundle.js` dan `npm test`.
- Cara uji manual: Pastikan seluruh tab aplikasi di browser dan APK tetap berjalan normal tanpa referensi hilang.
- Status verifikasi: `TERVERIFIKASI` (`npm test` 76/76 unit + 54/54 jadwal lulus).
- Sumber "sebelum": `GIT` (`git show bc854d3:js/ui/agenda.js`).

### INFO-02: Penonaktifan Android Auto Backup (`android:allowBackup="false"`)
- Keparahan: Informasional / Keamanan | Platform: APK | Putaran: 2 | Commit: `1bdea9d`
- Lokasi: `android/app/src/main/AndroidManifest.xml:5` menjadi `android/app/src/main/AndroidManifest.xml:5`
- Gejala yang dilihat pengguna: Data keuangan lokal tidak lagi ikut disalin secara otomatis ke cadangan perangkat Google Drive atau ADB backup.
- Sebelum:
```xml
    <application
        android:allowBackup="true"
```
- Sesudah:
```xml
    <application
        android:allowBackup="false"
```
- Mengapa berubah: Data keuangan pribadi di `localStorage` WebView lebih aman bila tidak ikut tercadangkan di luar kontrol aplikasi; pemulihan antar perangkat memakai sinkronisasi Supabase atau ekspor JSON manual.
- Contoh angka nyata: Tidak berlaku.
- Cara uji otomatis: `tests/unit/apk_installer_static.test.js`. Perintah: `node --test tests/unit/apk_installer_static.test.js`.
- Cara uji manual: Setelah build APK, uji instalasi di HP baru dan pastikan data dipulihkan melalui login Supabase atau impor JSON.
- Status verifikasi: `TERVERIFIKASI` (perubahan manifest terverifikasi; perilaku backup OS di HP asli `TIDAK BISA DIUJI` lokal).
- Sumber "sebelum": `GIT` (`git show bc854d3:android/app/src/main/AndroidManifest.xml`).

### INFO-03: Perluasan area sentuh tombol APK minimal 44 px tanpa mengubah visual
- Keparahan: Informasional / Aksesibilitas | Platform: APK | Putaran: 2 | Commit: `09a9b45`, `fb87143`
- Lokasi: `css/mobile.css:432-439, 1005-1015, 1348, 1962-1963` menjadi `css/mobile.css:432-440, 1006-1018, 1350, 1962-1968`
- Gejala yang dilihat pengguna: Tombol kecil di layar HP (ikon header, tombol segmen `Bar`, tombol `.btn-sm`, dan tombol banner notifikasi) sebelumnya memiliki area sentuh efektif di bawah 44 px (16 px hingga 42 px), sehingga rawan meleset saat ditekan jari.
- Sebelum:
```css
body[data-shell="mobile-app"] #mobile-app-shell .av-btn::before,
body[data-shell="mobile-app"] #mobile-app-shell .ico-btn::before {
  content: "";
  position: absolute;
  inset: -5px;
```
```css
body[data-shell="mobile-app"] #mobile-app-shell .btn-sm::after { content: ''; position: absolute; inset: -4px 0; }
```
- Sesudah:
```css
body[data-shell="mobile-app"] #mobile-app-shell .av-btn::before,
body[data-shell="mobile-app"] #mobile-app-shell .ico-btn::before {
  content: "";
  position: absolute;
  inset: -5px;
  margin: -1px;
```
```css
body[data-shell="mobile-app"] #mobile-app-shell .btn-sm::after { content: ''; position: absolute; inset: -5px 0; }
```
(Ditambah `min-width: var(--tap)` terpusat pada `.seg-btn::before`, `inset: -10px 0` pada `.pon-btn::before`, dan `inset: -14px` pada `#m-pon-close::before`.)
- Mengapa berubah: `border: 1px` mengurangi kotak padding sebesar 2 px sehingga `inset: -5px` pada tombol 34 px hanya menghasilkan 42 px; tambahan `margin: -1px` mencapai tepat 44 px sambil tetap mempertahankan aturan `inset: -5px` yang diuji oleh `mobile_app_mode.test.js`.
- Contoh angka nyata: Jumlah kontrol di bawah 44 px efektif pada viewport 360x740 turun dari 9 kontrol menjadi 0 kontrol di seluruh 6 tab APK.
- Cara uji otomatis: `tests/schedule/mobile_app_mode.test.js` dan audit Headless Chrome 360x740. Perintah: `node tests/schedule/mobile_app_mode.test.js`.
- Cara uji manual: Di layar HP 360 dp, tekan tombol Akun, Privasi, Notifikasi, Perlebar, dan segmen Bar dengan ibu jari, pastikan responsif dan ukuran visualnya tidak berubah.
- Status verifikasi: `TERVERIFIKASI` (`mobile_app_mode.test.js` OK dan audit Chrome CDP mencatat 0 kontrol di bawah 44 px efektif).
- Sumber "sebelum": `GIT` (`git show bc854d3:css/mobile.css`).

### INFO-04: Audit workflow CI build APK (`.github/workflows/android-debug.yml`)
- Keparahan: Lingkungan / Informasional | Platform: APK (CI) | Putaran: 2 | Commit: tidak diubah (sesuai keputusan Tahap 0)
- Lokasi: `.github/workflows/android-debug.yml:1-136`
- Gejala yang dilihat pengguna: Build APK tidak bisa dijalankan di mesin lokal karena Android SDK belum terpasang; jalur CI GitHub Actions tetap menjadi jalur build utama.
- Sebelum: Workflow berisi `Node 22`, `JDK 21` (Temurin), `Android SDK 36`, `build-tools 36.0.0`, `npm ci`, `npm run cap:sync`, `./gradlew assembleDebug`, unggah artefak, dan rilis `apk-latest` bersyarat.
- Sesudah: Tidak diubah. Seluruh konfigurasi divalidasi cocok dengan `android/variables.gradle` (`compileSdk 36`) dan Capacitor 8.
- Mengapa berubah: Keputusan Anda di Tahap 0 Putaran 2 adalah memvalidasi file workflow tanpa mengubahnya dan menuliskan panduan pemicu manual.
- Contoh angka nyata: Tidak berlaku.
- Cara uji otomatis: `tests/unit/apk_update_ci.test.js`, kasus `A2: .github/workflows/android-debug.yml valid YAML & memuat pipeline rilis apk-latest aman`. Perintah: `node --test tests/unit/apk_update_ci.test.js`.
- Cara uji manual: Picu workflow `Android Debug APK` lewat tab Actions di GitHub (rincian langkah di Bagian 7d).
- Status verifikasi: `TIDAK BISA DIUJI` untuk eksekusi Gradle lokal (tanpa Android SDK); struktur YAML `TERVERIFIKASI` via `apk_update_ci.test.js`.
- Sumber "sebelum": `GIT` (`git show f053269:.github/workflows/android-debug.yml`).

### SYNC-01: Observasi sesi kedaluwarsa dan resolusi konflik berbasis jam perangkat
- Keparahan: Informasional | Platform: Keduanya | Putaran: 2 | Commit: tidak diubah (observasi analisis statis)
- Lokasi: `js/sync.js:103-117, 370-381`
- Gejala yang dilihat pengguna: Jika dua perangkat dengan jam sistem berbeda jauh mengedit data saat offline, perangkat dengan jam lebih maju berpotensi menimpa perangkat lain karena penentuan pemenang memakai `Date.now()` lokal.
- Sebelum: `pull()` membandingkan `rr >= lr` berdasarkan stempel waktu `Date.now()` perangkat, dan pembaruan token otomatis mengandalkan opsi `autoRefreshToken: true` milik SDK Supabase.
- Sesudah: Tidak diubah (memerlukan kredensial server Supabase dan perubahan perilaku konflik yang berada di luar cakupan audit perbaikan bedah).
- Mengapa berubah: Hanya dicatat sebagai risiko agar menjadi pertimbangan iterasi berikutnya.
- Contoh angka nyata: Tidak berlaku.
- Cara uji otomatis: Belum tersedia tanpa lingkungan Supabase live.
- Cara uji manual: Uji sinkron dua perangkat dengan akun Supabase asli setelah sesi dibiarkan lebih dari 1 jam.
- Status verifikasi: `DUGAAN` (analisis kode statis tanpa kredensial Supabase produksi).
- Sumber "sebelum": `GIT` (`git show HEAD:js/sync.js`).

---

## 5. Perubahan Teks Antarmuka (`TX-01` s.d. `TX-23`)

Catatan: pada kolom **Sebelum**, karakter em dash asli ditulis `\u2014` dan tanda seru asli ditulis `[tanda seru]` agar dokumen ini mematuhi aturan nol em dash dan nol tanda seru di luar blok kode sambil tetap menunjukkan perbedaan karakter aslinya secara jujur.

| ID | File:baris (Sesudah) | Sebelum | Sesudah | Alasan | Tampil di | Cara Melihatnya di Aplikasi |
|---|---|---|---|---|---|---|
| `TX-01` | `js/sync.js:69, 74` | `Mode lokal (Supabase belum diisi)` (muncul juga saat offline) | `Mode lokal (Supabase belum dikonfigurasi)` / `Mode lokal (offline, sinkron cloud tidak tersedia)` | Tidak menyesatkan saat offline padahal Supabase sudah dikonfigurasi | Keduanya | Buka aplikasi dalam Mode Pesawat lalu lihat tooltip versi atau status sinkron cloud |
| `TX-02` | `js/ui/browser-app.js:2681` | `Aman · Tidak pernah minus[tanda seru]` / `Masih defisit \u2014 uji penghematan tambahan` | `Aman · Saldo tidak pernah minus` / `Masih defisit. Uji penghematan tambahan.` | Hapus tanda seru dan em dash agar tenang dan lugas | Browser | Tab Simulasi, lihat teks status di bawah kartu Saldo Akhir Simulasi |
| `TX-03` | `js/ui/browser-app.js:3493` | `Gagal membaca file.` | `Gagal membaca file. Pastikan file valid dan tidak rusak.` | Menjelaskan langkah perbaikan saat impor gagal | Browser | Menu Pengaturan & Alat, pilih Impor JSON/CSV dengan file yang gagal dibaca |
| `TX-04` | `js/ui/browser-app.js:3535` | `File Excel tidak dapat dibaca.` | `File Excel tidak dapat dibaca. Pastikan format sesuai template.` | Membantu pengguna mengetahui penyebab dan solusinya | Browser | Mode Perjalanan, pilih Impor Excel dengan file bukan format template |
| `TX-05` | `js/ui-mobile/mobile-app.js:4033, 4037` | `Hari Ini[tanda seru]` / `Semua tagihan terdekat aman[tanda seru]` | `Hari Ini` / `Semua tagihan terdekat aman` | Hapus tanda seru agar nada antarmuka tenang | APK | Buka sheet Pengaturan / Notifikasi lalu lihat daftar tagihan jatuh tempo terdekat |
| `TX-06` | `js/ui/io.js:216` | `Unduh file gagal.` | `Gagal mengunduh file. Coba ulangi atau periksa izin penyimpanan.` | Memberi tindakan lanjutan bila unduhan gagal | Keduanya | Menu Cadangan / Ekspor, saat mekanisme unduhan browser gagal |
| `TX-07` | `js/ui/items.js:483` | `Nominal tidak valid.` | `Nominal harus lebih besar dari 0 (mis. 50.000 atau 200k).` | Pesan validasi spesifik dengan contoh format yang diterima | Keduanya | Tab Item, kolom Tambah Cepat, ketik item dengan nominal 0 |
| `TX-08` | `js/ui/topbar.js:115` | `Notifikasi diblokir di browser \u2014 ubah di setelan situs` | `Notifikasi diblokir browser. Aktifkan kembali di setelan situs.` | Hapus em dash dan perjelas instruksi | Browser | Blokir izin notifikasi situs di browser, lalu arahkan kursor ke tombol lonceng di topbar |
| `TX-09` | `js/ui/trip.js:1299` | `Kurs <kode> belum diatur \u2014 isi kurs manual` | `Kurs <kode> belum diatur. Isi kurs manual terlebih dahulu.` | Hapus em dash dan perjelas instruksi | Keduanya | Mode Perjalanan, dialog Harga Aktual pada item bermata uang asing tanpa kurs |
| `TX-10` | `js/ui/trip.js:3273` | `...dapat diisi di Ubah Perjalanan).` | `...dapat diisi lewat tombol Ubah Perjalanan).` | Lebih alami dalam bahasa Indonesia (hindari "di Ubah") | Keduanya | Mode Perjalanan, pratinjau Impor Excel yang memuat lebih dari satu mata uang asing |
| `TX-11` | `js/ui/browser-app.js:2255` | `Semua tagihan sudah lunas[tanda seru]` | `Semua tagihan sudah lunas` | Hapus tanda seru tersisa agar selaras dengan `TX-05` | Browser | Tab Rincian, kartu Tagihan Terdekat ketika semua tagihan sudah lunas |
| `TX-12` | `js/ui-mobile/mobile-app.js:5015` | `Offline \u2014 menampilkan data lokal` | `Offline. Menampilkan data lokal.` | Hapus em dash pada status pull-to-refresh | APK | Login akun cloud, aktifkan Mode Pesawat, lalu tarik layar ke bawah untuk refresh |
| `TX-13` | `js/ui-mobile/mobile-app.js:5031` | `Gagal sinkron \u2014 cek koneksi` | `Gagal sinkron. Periksa koneksi internet.` | Hapus em dash dan pakai bahasa baku | APK | Tarik layar ke bawah untuk refresh saat permintaan sinkron cloud gagal jaringan |
| `TX-14` | `js/sync.js:798` | `Sinkron belum aktif. Isi Supabase di js/config.js.` | `Sinkron cloud belum aktif. Periksa koneksi atau konfigurasi Supabase.` | Hindari menampilkan path kode `js/config.js` ke pengguna akhir | Browser | Buka aplikasi tanpa koneksi Supabase lalu klik tombol Akun di sidebar |
| `TX-15` | `js/ui/io.js:338` | `Isinya kosong.` | `Data impor kosong. Tempel teks JSON/CSV atau pilih file terlebih dahulu.` | Pesan error kini memberi langkah lanjut yang jelas | Browser | Dialog Impor/Ekspor, tekan Muat saat kotak teks kosong |
| `TX-16` | `js/ui/io.js:424` | `Gagal membaca file.` | `Gagal membaca file. Pastikan file valid dan tidak rusak.` | Menyamakan pesan error dengan `TX-03` | Browser | Dialog Impor/Ekspor, saat `FileReader` gagal membaca file cadangan |
| `TX-17` | `js/ui-mobile/mobile-app.js:6712` | `File tidak dapat dibaca.` | `File tidak dapat dibaca. Pastikan file valid dan tidak rusak.` | Paritas pesan desktop dan mobile saat impor gagal | APK | Mode Perjalanan di APK, Impor Excel saat file gagal dibaca perangkat |
| `TX-18` | `js/ui-mobile/mobile-app.js:3780` | `Gagal menyalin tautan.` | `Gagal menyalin tautan. Coba lagi atau buka langsung lewat browser.` | Memberi solusi alternatif bila salin tautan pembaruan gagal | APK | Sheet Pengaturan, kartu Pembaruan Aplikasi, tombol Salin Tautan saat clipboard gagal |
| `TX-19` | `js/ui-mobile/mobile-app.js:5603` | `Sinkron Google belum aktif` | `Login Google belum tersedia saat mode lokal/offline.` | Lebih jelas dibanding pesan ambigu "belum aktif" | APK | Sheet Akun di APK saat mode lokal/offline, ketuk tombol Masuk dengan Google |
| `TX-20` | `js/ui-mobile/mobile-app.js:6148` | `Berbagi teks gagal` | `Gagal berbagi teks. Gunakan "Salin teks" sebagai alternatif.` | Selaras dengan pesan status agar langsung memberi solusi | APK | Mode Perjalanan di APK, menu Bagikan, saat dialog berbagi sistem gagal |
| `TX-21` | `js/ui/report.js:388` | `Unduh laporan gagal: <err>` | `Gagal mengunduh laporan: <err>. Coba ulangi atau periksa izin penyimpanan.` | Konsisten awalan "Gagal ..." (`TX-06`) dengan langkah perbaikan | Keduanya | Menu Laporan PDF, saat proses pembuatan atau pengunduhan PDF melempar error |
| `TX-22` | `js/ui/trip.js:2757` | `Isi nama.` | `Nama skenario belum diisi.` | Lebih spesifik dan selaras dengan pesan validasi lain | Browser | Tab Simulasi lama (`simAdd`), simpan skenario pemasukan/pengeluaran tanpa mengisi nama |
| `TX-23` | `js/ui/trip.js:2758` | `Isi jumlah yang valid.` | `Nominal harus lebih besar dari 0 (mis. 50.000 atau 200k).` | Selaras dengan `TX-07` beserta contoh format yang diterima | Browser | Tab Simulasi lama (`simAdd`), simpan skenario dengan nominal 0 atau kosong |

---

## 6. Perubahan Non-Kode

- **`INFO-02` (`android/app/src/main/AndroidManifest.xml:5`)**: Mengubah `android:allowBackup="true"` menjadi `android:allowBackup="false"`. **Konsekuensi bagi pengguna:** saat Anda pindah ke HP Android baru atau menginstal ulang aplikasi, data keuangan lokal di perangkat lama tidak otomatis dipulihkan oleh Google Backup. Untuk memindahkan data, gunakan login sinkronisasi Supabase atau fitur Ekspor/Impor JSON.
- **`INFO-03` (`css/mobile.css`)**: Memperluas area sentuh transparan (`::before` dan `::after`) pada `.av-btn`, `.ico-btn`, `.seg-btn`, `.btn-sm`, `.pon-btn`, dan `#m-pon-close` hingga minimal `44x44 px` efektif tanpa mengubah dimensi visual tombol.
- **`INFO-04` (`.github/workflows/android-debug.yml`)**: Diaudit tanpa perubahan. Valid YAML, memakai Node 22, JDK 21 (Temurin), Android SDK 36, `npm run cap:sync`, `./gradlew assembleDebug`, serta guard anti-downgrade pada rilis `apk-latest`.
- **Sinkronisasi aset Capacitor (`npm run cap:sync`)**: Menyalin `dist/` ke `android/app/src/main/assets/public/` sehingga aset web APK 100% identik dengan `index.html` dan `dist/index.html` (`6570e7ca98e3021f...`).

---

## 7. Panduan Pengujian Lengkap

### 7a. Pengujian Otomatis

Jalankan berurutan dari root proyek:

1. `npm test`
   - Menjalankan `node build.js`, `node tests/check-bundle.js`, `node tests/run-unit.js`, dan `node tests/run-schedule.js`.
   - Hasil yang diharapkan: `OK: 54 skrip dikompilasi tanpa error sintaks; index.html sinkron dengan sumber.`, `tests 76 / pass 76 / fail 0`, dan 54 berkas jadwal `OK` (`Semua tes jadwal lulus.`).
2. `npm run test:bot`
   - Menjalankan `node build-bot.js` dan `node --test tests/bot.test.mjs`.
   - Hasil yang diharapkan: `tests 18 / pass 18 / fail 0`.
3. Pengujian terfokus per berkas regresi audit:
   - `node --test tests/unit/audit_finance.test.js` (diharapkan `5/5` lulus).
   - `node --test tests/unit/audit_putaran2.test.js` (diharapkan `9/9` lulus).
   - `node --test tests/unit/apk_installer_static.test.js tests/unit/apk_update_ci.test.js` (diharapkan `7/7` lulus).
4. Audit browser headless (opsional bila `puppeteer` terpasang): `npm run test:browser` menjalankan `tests/browser/smoke.js`. Catatan: pada mesin ini `puppeteer` tidak terpasang di `node_modules`, sehingga audit Headless Chrome 52 tampilan dilakukan memakai skrip CDP sementara di luar repo.

### 7b. Pengujian Manual di Browser Desktop

| No | ID Terkait | Langkah | Hasil yang Benar | Hasil yang Salah (Perilaku Lama) |
|---|---|---|---|---|
| 1 | `BUG-01`, `BUG-19` | Buat tagihan Listrik Rp 200.000, lalu catat pengeluaran Catatan Kas Rp 205.000 dengan catatan "bayar listrik" hingga tertaut. Cek Saldo Akhir Tahun di Rincian dan tabel Tagihan di Laporan PDF. | Saldo akhir hanya berkurang Rp 205.000 (cocok dengan Catatan Kas) dan tabel Tagihan PDF menampilkan Rp 205.000. | Saldo akhir berkurang Rp 405.000 (hitung ganda) dan tabel Tagihan PDF menampilkan Rp 200.000. |
| 2 | `BUG-02`, `BUG-12`, `BUG-14` | Tempel `1.500.000,00` ke input nominal Catatan Kas lalu klik luar kolom. Ulangi dengan `50-000`. | `1.500.000,00` berubah menjadi `1.500.000`; `50-000` dianggap tidak valid (0). | `1.500.000,00` membengkak menjadi `150.000.000`; `50-000` terbaca Rp 50. |
| 3 | `BUG-13`, `TX-04`, `TX-10` | Di Mode Perjalanan, impor file `.xlsx` dengan teks biaya `1.500.000,00` dan lebih dari satu mata uang asing. | Biaya terbaca Rp 1.500.000 dan teks pratinjau memakai "lewat tombol Ubah Perjalanan". | Biaya menyusut menjadi Rp 1,5 dan teks pratinjau bertuliskan "di Ubah Perjalanan". |
| 4 | `BUG-04` | Di Mode Perjalanan, buat target tabungan yang tersambung ke Rencana Keuangan. | Chip dampak saldo tampil dengan latar warna dan sudut membulat rapi. | Chip kehilangan kelas CSS karena tag rusak `<div"`. |
| 5 | `BUG-03`, `BUG-15`, `TX-02` | Buka tab Simulasi, tambah skenario pemasukan/pengeluaran, lihat teks status, lalu terapkan dan urungkan. | Teks status bebas tanda seru dan em dash; terapkan dan urungkan berjalan tanpa error. | Muncul tanda seru/em dash, dan rawan crash `TypeError` bila profil kas belum ada. |
| 6 | `BUG-06` | Tambah item harian dengan tanggal mulai `2010-01-01`, lalu cek tab Jadwal tahun 2026. | Tagihan harian muncul penuh sepanjang tahun 2026 (365 hari). | Tidak ada tagihan muncul di 2026 karena berhenti di langkah ke-4000. |
| 7 | `BUG-08`, `TX-03`, `TX-15`, `TX-16` | Di dialog Impor/Ekspor, tekan Muat saat teks kosong; coba pulihkan cadangan otomatis. | Muncul panduan jelas saat kosong; pemulihan aman tanpa error konsol. | Pesan hanya "Isinya kosong." dan JSON cadangan rusak melempar `SyntaxError`. |
| 8 | `BUG-09`, `TX-01`, `TX-14` | Putus internet di DevTools (Offline), muat ulang halaman, lalu klik tombol Akun dan arahkan kursor ke status versi. | Muncul keterangan mode lokal offline dan tooltip tidak menumpuk teks berulang. | Muncul "Supabase belum diisi", pesan menyebut `js/config.js`, dan tooltip menumpuk. |

### 7c. Pengujian Manual di HP Android (APK)

| No | ID Terkait | Langkah | Hasil yang Benar | Hasil yang Salah (Perilaku Lama) |
|---|---|---|---|---|
| 1 | `INFO-03` | Di layar 360 dp, ketuk tombol Akun, Privasi, Notifikasi, tombol Perlebar, segmen Bar, dan tombol banner notifikasi. | Semua tombol responsif ditekan ibu jari tanpa perubahan bentuk visual. | Area sentuh di bawah 44 px (16 px hingga 42 px) sehingga mudah meleset. |
| 2 | `INFO-02` | Instal APK di HP baru tanpa login Supabase, lalu cek apakah data lama muncul dari Google Backup. | Aplikasi mulai bersih; data dipulihkan dengan login Supabase atau impor JSON. | Data keuangan lokal terbawa otomatis oleh Android Auto Backup. |
| 3 | `BUG-09`, `TX-12`, `TX-19` | Aktifkan Mode Pesawat, buka APK, tarik layar ke bawah untuk refresh, lalu buka sheet Akun dan ketuk Masuk dengan Google. | Status tampil `Offline. Menampilkan data lokal.` dan toast menjelaskan login Google tidak tersedia saat offline. | Muncul em dash dan pesan ambigu `Sinkron Google belum aktif`. |
| 4 | `BUG-16` | Login akun sama di dua perangkat; ubah data di Perangkat A (online) dan di Perangkat B (Mode Pesawat, lebih baru), lalu aktifkan internet di Perangkat B. | Sinkronisasi selesai dalam satu siklus dan data terbaru tersimpan di cloud. | Sinkronisasi berputar terus-menerus antara `pull()` dan `push()`. |
| 5 | `BUG-18` | Catat transaksi baru di Catatan Kas pada pukul 00:01 hingga 06:59 WIB. | Tanggal default sesuai hari WIB saat itu. | Fallback UTC dapat menggeser tanggal ke kemarin. |
| 6 | Lifecycle native | Buka bottom sheet / form, ketik dengan keyboard virtual, lalu tekan tombol Back Android; uji ekspor PDF dan berbagi. | Tombol Simpan tetap terjangkau di atas keyboard, Back menutup sheet dulu sebelum keluar aplikasi, dan ekspor PDF berjalan. | Sheet tertutup tidak rapi, tombol tertutup keyboard, atau aplikasi langsung keluar. |

### 7d. Cara Membangun APK Lewat GitHub Actions

1. Pastikan seluruh commit yang ingin dibangun sudah di-push ke branch `main` (atau branch target).
2. Buka repositori di GitHub lalu masuk ke tab **Actions**.
3. Pilih workflow **Android Debug APK** (`.github/workflows/android-debug.yml`).
4. Klik tombol **Run workflow**, pilih branch target, lalu klik **Run workflow** untuk memulai build secara manual (`workflow_dispatch`).
5. Tunggu hingga job `build-android-debug` hijau, lalu unduh file APK dari bagian **Artifacts** (`renkeu-android-debug`) atau dari tag prerelease `apk-latest` (bila keempat secret signing `RK_KEYSTORE_BASE64`, `RK_KEYSTORE_PASSWORD`, `RK_KEY_ALIAS`, dan `RK_KEY_PASSWORD` sudah terpasang).

### 7e. Cara Membandingkan Sendiri Sebelum dan Sesudah

Gunakan perintah berikut di terminal dari root proyek:

- Perubahan Putaran 2 saja (dari baseline Putaran 1 ke posisi sekarang):
  - `git diff bc854d3..HEAD -- js/core/util.js`
  - `git diff bc854d3..HEAD -- js/ui/num-input.js`
  - `git diff bc854d3..HEAD -- js/ui/trip.js`
  - `git diff bc854d3..HEAD -- js/sync.js`
  - `git diff bc854d3..HEAD -- js/core/state.js`
  - `git diff bc854d3..HEAD -- js/ui/report.js`
  - `git diff bc854d3..HEAD -- js/ui/datepick.js`
  - `git diff bc854d3..HEAD -- css/mobile.css`
  - `git diff bc854d3..HEAD -- android/app/src/main/AndroidManifest.xml`
- Perubahan gabungan Putaran 1 dan Putaran 2 (dari `f053269` sebelum audit ke posisi sekarang):
  - `git diff f053269..HEAD -- js/core/calc.js js/core/util.js js/core/schedule.js js/core/state.js js/sync.js`
  - `git diff --stat f053269..HEAD`

---

## 8. Yang Tidak Bisa Dibuktikan

| Item | Label | Alasan | Cara Melengkapinya |
|---|---|---|---|
| `BUG-10` (ukuran & SHA-256 `android/app/src/main/assets/public/index.html` sebelum Putaran 1) | `LAPORAN` | Direktori `android/app/src/main/assets/public/` masuk `.gitignore`, sehingga isi lama (`1.705.912 B`, `63be393eab63...`) tidak tersimpan dalam objek Git dan hanya tercatat di `LAPORAN_AUDIT.md`. | Kondisi sesudah (`1.761.565 B`, `6570e7ca98e3021f...`) sudah terverifikasi langsung pada disk pasca `npm run cap:sync`. |
| `INFO-04` (eksekusi `./gradlew assembleDebug` dan `./gradlew lint` lokal) | `TIDAK BISA DIUJI` | Android SDK (`ANDROID_HOME` / `%LOCALAPPDATA%\Android\Sdk`) tidak terpasang di mesin ini. | Jalankan workflow `Android Debug APK` di GitHub Actions atau pasang Android SDK 36 secara lokal. |
| Uji HP Android asli (Back, keyboard virtual, `allowBackup="false"`, OAuth deep link `id.renkeu.app://auth`, notifikasi lokal, haptic) | `TIDAK BISA DIUJI` | Tidak ada perangkat Android fisik maupun emulator di lingkungan audit ini. | Pasang APK hasil build GitHub Actions di HP Android asli lalu jalankan daftar cek Bagian 7c. |
| `SYNC-01` dan pengujian server Supabase asli (login Google live, refresh token kedaluwarsa, sinkron dua perangkat nyata) | `DUGAAN` / `TIDAK TERSEDIA` | Kredensial akun uji dan server Supabase live tidak digunakan dalam audit otomatis lokal. | Uji manual dengan akun Supabase nyata pada dua perangkat (lihat Bagian 7c baris 4). |

---

## 9. Risiko Tersisa

1. **Resolusi konflik sinkronisasi cloud (`SYNC-01`, `DUGAAN`)**: `js/sync.js` memakai *last-write-wins* berdasarkan `Date.now()` perangkat lokal. Bila jam sistem salah satu perangkat meleset jauh saat offline, perubahan baru bisa kalah; di iterasi mendatang dapat dipertimbangkan stempel waktu server atau penggabungan per bagian data.
2. **Bulan mulai manual lebih awal dari bulan berjalan (`startMonth < today.month`)**: `kasBal(P)` menghitung saldo realtime sampai bulan `smEff()` sesuai kontrak 4 tes jadwal existing (`todayNode.val === kasBal(P).bal`). Bila pengguna menyetel bulan mulai manual jauh lebih awal dari bulan berjalan, transaksi di antara bulan mulai dan hari ini tidak masuk ke titik `balNow` grafik proyeksi.
3. **Android Lint di CI (`INFO-04`)**: `.github/workflows/android-debug.yml` menjalankan `./gradlew assembleDebug` tanpa `./gradlew lintDebug`. Bila diinginkan di masa depan, step lint dapat ditambahkan sebagai pengaman native.
4. **Tes E2E lama (`tests/e2e/`)**: Harness `tests/e2e/` lama belum mendukung `matchMedia` dan `ResizeObserver`, dan cakupan fungsionalnya kini dijalankan oleh 54 berkas di `tests/schedule/`.
