# Laporan Audit Bug, Akurasi Perhitungan Keuangan, APK, & Teks Antarmuka — Rencana Keuangan (RenKeu)

- **Tanggal**: 23 November 2026
- **Cakupan**: Aplikasi utama Rencana Keuangan — Versi HTML Browser Mode (`index.dev.html`, `js/core/*`, `js/ui/*`, `js/sync.js`, `css/*`), Versi APK Mobile Mode (`js/ui-mobile/mobile-app.js`, `css/mobile.css`), dan pembungkus native Capacitor Android (`capacitor.config.json`, `android/`). Sub-alat `tools/rebalance/`, `tools/ibkr-flip/`, dan `bot/` di luar cakupan audit (namun `bot/core.mjs` ikut terverifikasi lulus 18/18 tes regresi karena mewarisi `js/core/`).
- **Status Git**: Perubahan dibiarkan di *working tree* lokal (tidak di-*commit* dan tidak di-*push*, sesuai instruksi).
- **Kebijakan Skema Data**: Tidak ada perubahan pada skema penyimpanan (`rencana-keuangan-v1`, `RK_SCHEMA_VER = 3`).

---

## 1. Ringkasan Jumlah Temuan per Keparahan

| Keparahan | Ditemukan | Diperbaiki | Belum Diperbaiki / Informasional | Status Verifikasi |
|---|---:|---:|---:|---|
| **Kritis** | 1 | 1 | 0 | 1 `TERVERIFIKASI` |
| **Tinggi** | 3 | 3 | 0 | 3 `TERVERIFIKASI` |
| **Sedang** | 6 | 6 | 0 | 6 `TERVERIFIKASI` |
| **Rendah** | 1 | 1 | 0 | 1 `TERVERIFIKASI` |
| **Informasional / Lingkungan** | 4 | 0 *(di luar cakupan ubah desain / tanpa SDK)* | 4 | 3 `TERVERIFIKASI`, 1 `TIDAK BISA DIUJI` |
| **Total Bug Kode/Build** | **11** | **11** | **0** | **11/11 `TERVERIFIKASI` lulus** |

Selain 11 bug di atas, **10 perbaikan teks antarmuka (`TX-01` s.d. `TX-10`)** telah diterapkan sesuai gaya bahasa yang disepakati (netral / "Anda", standar "Pemasukan" & "Pengeluaran", tanpa *em dash* pada kalimat pesan error/status dan tanpa tanda seru berlebih).

---

## 2. Tabel Lengkap Temuan Bug & Status Verifikasi

| ID | Platform | File:baris | Deskripsi | Keparahan | Status | Bukti Verifikasi |
|---|---|---|---|---|---|---|
| **BUG-01** | Keduanya | `js/core/calc.js:40-88` | **Double-counting tagihan tertaut Catatan Kas (`S.real`) di `calc()`**: Saat transaksi pengeluaran Catatan Kas ditautkan ke tagihan terjadwal (`S.real[key] = { tx: id }`), `kasDerived()` dan `yearCash()` sudah mengecualikan duplikat, tetapi `calc()` tetap menjumlahkan harga rencana ke `spend[mm]` **dan** sekaligus mengurangi transaksi `KL.tx` di `adjIn`/`adjM`, sehingga `calc().end`, grafik proyeksi, dan jatah/bulan berkurang dua kali (contoh: saldo Rp 10.000.000 dikurangi Rp 200.000 rencana + Rp 205.000 aktual = Rp 9.595.000, seharusnya Rp 9.795.000). **Perbaikan**: `calc()` kini memakai nominal realisasi `rtx.amt` pada tagihan tertaut dan melewati `rtx.id` di loop `KL.tx`. | **Kritis** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit baru `tests/unit/audit_finance.test.js` (`BUG-01`, PASS) + verifikasi dinamis `calc().end === kasBal === 9.795.000` dan `yearCash().out === 205.000`. Seluruh 67/67 unit + 54/54 jadwal + 18/18 bot lulus. |
| **BUG-02** | Keduanya | `js/core/util.js:63-86` | **`parseRp()` menggembungkan 100x input desimal & membocorkan `Infinity`**: Input yang ditempel dari m-banking/Excel seperti `"1.500.000,00"`, `"1.500.000,50"`, dan `"1,500,000.00"` sebelumnya menghapus semua `.` dan `,` sehingga dibaca `150.000.000` (100x lebih besar). Input `"1e308jt"` menghasilkan `Infinity`. **Perbaikan**: Kenali format ribuan + 1–2 digit desimal (dibulatkan dengan `Math.round`) dan jaga hasil akhir dengan `Number.isFinite(...) ? out : 0`. | **Tinggi** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit `tests/unit/audit_finance.test.js` (`BUG-02`, PASS) + `tests/unit/core.test.js` + `tests/unit/num-input.test.js` seluruhnya lulus. |
| **BUG-03** | Keduanya | `js/ui/trip.js:2577-2592` | **`simCalc(list)` crash `TypeError` bila `kasLinked()` bernilai `null`**: Membaca `KL.tx` tanpa memeriksa `KL` melempar `Cannot read properties of null (reading 'tx')`. **Perbaikan**: Guard `KL ? KL.tx : null` dan `if (KL)` saat menyisipkan serta memulihkan `KL.tx`. | **Tinggi** | **Diperbaiki** | `TERVERIFIKASI` — Repro sebelum perbaikan melempar `TypeError`; pasca-perbaikan `simCalc([])` mengembalikan hasil valid saat `ALL.kas.pr = {}`. |
| **BUG-04** | HTML (Browser Mode) | `js/ui/trip.js:2108,2110` | **Tag HTML rusak `<div" class="chp ...">`** pada `goalCard()`: Tanda kutip ganda liar setelah `<div` merusak atribut `class` pada badge dampak tabungan perjalanan terhadap Rencana Keuangan. **Perbaikan**: Diperbaiki menjadi `<div class="chp ...">`. | **Tinggi** | **Diperbaiki** | `TERVERIFIKASI` — Output `goalCard()` diperiksa langsung: tidak ada `<div"`, atribut `<div class="chp ...">` valid. |
| **BUG-05** | Keduanya | `js/core/util.js:58-62,141-151` | **`rp()` dan `shortP()` rusak pada `NaN`, `Infinity`, dan angka negatif**: `rp(NaN)` menghasilkan `"Rp NaN"`, `rp(Infinity)` menghasilkan `"Rp ∞"`, `shortP(-2500000)` menghasilkan `"-2500000"` alih-alih `"-2,5jt"`, dan `shortP(NaN)` menghasilkan `"NaN"`. **Perbaikan**: Guard `Number.isFinite` dengan fallback `0`, serta evaluasi besaran berdasarkan `Math.abs(num)` pada `shortP()`. | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit `tests/unit/audit_finance.test.js` (`BUG-05`, PASS): `rp(NaN) === 'Rp 0'`, `shortP(-2500000) === '-2,5jt'`, `shortP(-500000) === '-500rb'`. |
| **BUG-06** | Keduanya | `js/core/schedule.js:59-100` | **Batas 4000 langkah di `series()` & kebocoran `NaN` dari tanggal `mv` rusak**: Item harian yang dimulai >10,9 tahun lalu (mis. `2010-01-01` dilihat pada `2026`) berhenti sebelum mencapai `2026` sehingga menghasilkan `0` tagihan alih-alih `365`. Entri `ch[].mv` dengan string tanggal rusak mendorong `NaN` ke hasil `series()`. **Perbaikan**: Naikkan batas aman loop menjadi `50000` dengan `if (isNaN(t) || t > endMs) break;`, dan abaikan tanggal `mv` yang menghasilkan `isNaN(Date.parse(...))`. | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit `tests/unit/audit_finance.test.js` (`BUG-06`, PASS): item harian `2010-01-01` menghasilkan `365` tagihan di `2026`, dan `mv` rusak tidak menghasilkan `NaN`. |
| **BUG-07** | Keduanya | `js/ui/report.js:27,79-89` | **Komparator `byD` tidak simetris & tanggal kabisat palsu di `repData('w')`**: `byD` mengembalikan `1` untuk tanggal sama (seharusnya `0`); ketika hari ini `2024-02-29` dan pengguna melihat tahun non-kabisat `2026`, `repData('w')` membentuk tanggal palsu `2026-02-29` (`laporan-mingguan-2026-02-29.pdf`). **Perbaikan**: `byD` mengembalikan `0` saat sama, dan tanggal akhir bulan dijepit ke hari terakhir bulan tahun target (`2026-02-28`). | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — Repro dinamis pasca-perbaikan: `repData('w')` pada `2024-02-29` untuk tahun `2026` menghasilkan `laporan-mingguan-2026-02-28.pdf` (`22 Feb 2026 - 28 Feb 2026 \| 2026`). |
| **BUG-08** | Keduanya | `js/core/state.js:519-538` | **`restoreSnap()` memanggil `JSON.parse(s.d)` tanpa `try/catch`**: Snapshot korup di `localStorage['rk-undo']` melempar uncaught `SyntaxError` dan sempat membuat snapshot tambahan sebelum crash. **Perbaikan**: Bungkus `JSON.parse(s.d)` dengan `try/catch` sebelum membuat snapshot baru dan kembalikan `null` + tampilkan toast error. | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit `tests/unit/audit_finance.test.js` (`BUG-08`, PASS): `restoreSnap()` pada JSON korup mengembalikan `null` tanpa mengubah state `S`. |
| **BUG-09** | Keduanya | `js/sync.js:46-73,103-116` | **Status offline menyesatkan, tooltip `#ver-info` menumpuk, dan `getSession()` tanpa `.catch()`**: Saat offline (`!window.supabase`) padahal `SB_URL`/`SB_KEY` terisi, `sbInit()` menampilkan `"Mode lokal (Supabase belum diisi)"`, tooltip `#ver-info` menumpuk string status berulang kali, dan `sb.auth.getSession().then(...)` belum menangani rejection. **Perbaikan**: Pisahkan cabang `!SB_URL || !SB_KEY` vs `!window.supabase`, simpan `dataset.baseTitle` agar tooltip tidak menumpuk, dan tambahkan `.catch()`. | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — Pemanggilan `sbInit()` 2x saat `window.supabase = undefined` menghasilkan tooltip tunggal: `Tersimpan otomatis ... · Mode lokal (offline, sinkron cloud tidak tersedia)`. |
| **BUG-10** | APK | `android/app/src/main/assets/public/index.html` | **Aset web APK lokal tertinggal ~51 KB dari `dist/index.html`**: Sebelum audit, `index.html` / `dist/index.html` berukuran `1.757.281 B`, sedangkan aset APK `android/app/src/main/assets/public/index.html` masih `1.705.912 B` (belum memuat pembaruan terbaru). **Perbaikan**: Menjalankan `npm run cap:sync` setelah seluruh perbaikan dan build selesai. | **Sedang** | **Diperbaiki** | `TERVERIFIKASI` — `npm run cap:sync` sukses (`0.259s`); SHA-256 `index.html`, `dist/index.html`, dan `android/app/src/main/assets/public/index.html` identik (`531cc80651348c41`). |
| **BUG-11** | Keduanya | `js/core/util.js:51-55`, `js/ui/kas.js:290` | **Higiene escaping HTML**: `esc()` belum meng-escape kutip tunggal (`'`), dan `P.cur` pada `<option>` di `js/ui/kas.js:290` belum dibungkus `esc()`. **Perbaikan**: Tambahkan `'` -> `&#39;` di `esc()` dan bungkus `esc(P.cur)`. | **Rendah** | **Diperbaiki** | `TERVERIFIKASI` — Tes unit `audit_finance.test.js` (`esc("O'Brien <x>") === 'O&#39;Brien &lt;x&gt;'`) + probe XSS Headless Chrome (`window.__xss === 0`). |
| **INFO-01** | HTML | `js/ui/agenda.js` | **File yatim (*dead code*)**: `js/ui/agenda.js` (6.850 B) tidak dimuat di `index.dev.html` maupun `build.js`. Tidak dihapus agar tidak melampaui ruang lingkup tanpa instruksi eksplisit. | Informasional | Dilaporkan | `TERVERIFIKASI` — Pemindaian statis daftar `<script>` di `index.dev.html` dan `build.js`. |
| **INFO-02** | APK | `android/app/src/main/AndroidManifest.xml:15` | **`android:allowBackup="true"`**: Secara bawaan memungkinkan *Android Auto Backup* mencadangkan data lokal aplikasi ke Google Drive pengguna. Aman untuk aplikasi keuangan pribadi bila disengaja, tetapi bisa diubah ke `false` bila ingin data lokal ketat di perangkat saja. | Informasional | Dilaporkan | `TERVERIFIKASI` — Pembacaan langsung `AndroidManifest.xml`. |
| **INFO-03** | APK | `css/mobile.css` / `js/ui-mobile/mobile-app.js` | **Beberapa tombol kecil di bawah 44×44 px pada viewport 360 px**: Tombol header (`#m-acct-btn`, `#m-btn-privacy`, `#m-btn-notif`: `34×34 px`) dan tombol segmented periode (`.seg-btn`: `99×27 px`). Tidak diubah agar tidak merombak desain. | Informasional | Dilaporkan | `TERVERIFIKASI` — Pengukuran bounding rect langsung di Headless Chrome (`360×740`, Mode APK). |
| **INFO-04** | APK | `android/` (Gradle / Emulator) | **Build Gradle (`assembleDebug` / `lint`) dan pengujian HP asli**: Android SDK (`ANDROID_HOME` / `%LOCALAPPDATA%\Android\Sdk`) tidak terpasang di lingkungan mesin ini sehingga kompilasi APK dan uji perangkat nyata belum dapat dijalankan secara lokal. | Lingkungan | Tidak Bisa Diuji | `TIDAK BISA DIUJI` — Pemeriksaan direktori SDK lokal mengembalikan `false` pada seluruh path standar Windows. |

---

## 3. Daftar Perubahan Teks Antarmuka yang Diterapkan

Seluruh perubahan berikut telah dipastikan tidak mematahkan satu pun tes otomatis dan mengikuti gaya bahasa netral / "Anda", istilah baku "Pemasukan"/"Pengeluaran", pesan error yang jelas beserta langkah lanjutan, serta bebas *em dash* dan tanda seru berlebih.

| ID | Lokasi | Sebelum | Sesudah | Alasan |
|---|---|---|---|---|
| **TX-01** | `js/sync.js:63-73` | `Mode lokal (Supabase belum diisi)` *(muncul juga saat offline)* | `Mode lokal (Supabase belum dikonfigurasi)` *(bila kredensial kosong)* / `Mode lokal (offline, sinkron cloud tidak tersedia)` *(bila offline)* | Menghilangkan pesan menyesatkan saat pengguna offline padahal Supabase sudah dikonfigurasi. |
| **TX-02** | `js/ui/browser-app.js:2681` | `Aman · Tidak pernah minus!` / `Masih defisit — uji penghematan tambahan` | `Aman · Saldo tidak pernah minus` / `Masih defisit. Uji penghematan tambahan.` | Menghapus tanda seru tidak perlu dan mengganti *em dash* dengan kalimat lugas. |
| **TX-03** | `js/ui/browser-app.js:3493` | `Gagal membaca file.` | `Gagal membaca file. Pastikan file valid dan tidak rusak.` | Menjelaskan langkah perbaikan saat impor file gagal. |
| **TX-04** | `js/ui/browser-app.js:3535` | `File Excel tidak dapat dibaca.` | `File Excel tidak dapat dibaca. Pastikan format sesuai template.` | Membantu pengguna langsung tahu penyebab dan solusinya. |
| **TX-05** | `js/ui-mobile/mobile-app.js:4033,4037` | `Hari Ini!` / `Semua tagihan terdekat aman!` | `Hari Ini` / `Semua tagihan terdekat aman` | Menghapus tanda seru tidak perlu agar nada antarmuka tenang dan konsisten. |
| **TX-06** | `js/ui/io.js:216-217` | `Unduh file gagal.` | `Gagal mengunduh file. Coba ulangi atau periksa izin penyimpanan.` | Memberi tindakan lanjutan yang jelas bila unduhan gagal. |
| **TX-07** | `js/ui/items.js:483` | `Nominal tidak valid.` | `Nominal harus lebih besar dari 0 (mis. 50.000 atau 200k).` | Pesan validasi lebih spesifik dengan contoh format yang diterima. |
| **TX-08** | `js/ui/topbar.js:115` | `Notifikasi diblokir di browser — ubah di setelan situs` | `Notifikasi diblokir browser. Aktifkan kembali di setelan situs.` | Menghapus *em dash*, kalimat instruksi lebih jelas dan ringkas. |
| **TX-09** | `js/ui/trip.js:1299` | `Kurs <kode> belum diatur — isi kurs manual` | `Kurs <kode> belum diatur. Isi kurs manual terlebih dahulu.` | Menghapus *em dash* dan memperjelas instruksi. |
| **TX-10** | `js/ui/trip.js:3272` | `...dapat diisi di Ubah Perjalanan).` | `...dapat diisi lewat tombol Ubah Perjalanan).` | Memperbaiki kealamian bahasa Indonesia (menghindari "di Ubah"). |

---

## 4. Ringkasan Bukti Verifikasi Akhir

Seluruh pemeriksaan berikut dijalankan ulang secara segar setelah perbaikan terakhir dan `npm run cap:sync`:

1. **`npm run cap:sync`**: Exit code `0` (`0.259s`), menyalin `dist/` ke `android/app/src/main/assets/public/` dengan 7 plugin Capacitor terdeteksi. Hash SHA-256 `index.html` = `dist/index.html` = `android/app/src/main/assets/public/index.html` (`531cc80651348c41`).
2. **`npm test`**: Exit code `0`:
   - `tests/check-bundle.js`: `OK: 55 skrip dikompilasi tanpa error sintaks; index.html sinkron dengan sumber.`
   - `tests/run-unit.js`: **67/67 lulus** (termasuk 5 tes regresi baru di `tests/unit/audit_finance.test.js`).
   - `tests/run-schedule.js`: **54/54 lulus** (`Semua tes jadwal lulus.`).
3. **`npm run test:bot`**: Exit code `0` — **18/18 lulus**.
4. **Audit Dinamis Headless Chrome (CDP)**: Exit code `0` — **52 tampilan tab** diuji pada `1440×900` (terang, gelap, zoom 150%), `768×1024`, `360×740` (Browser & APK, terang & gelap), `320×640` (Browser & APK), dan **Mode Offline** (seluruh domain CDN & API diblokir):
   - **0** galat konsol (`console.error`),
   - **0** galat halaman tak tertangani (`pageerror`),
   - **0** *horizontal overflow* (`scrollWidth > innerWidth`),
   - **0** eksekusi XSS pada payload `<img src=x onerror="window.__xss=1">`.

---

## 5. Hal yang Tidak Bisa Diverifikasi & Langkah Tes Manual di HP Android Asli

Karena Android SDK dan perangkat/emulator Android tidak tersedia di lingkungan mesin ini, hal-hal berikut berstatus **`TIDAK BISA DIUJI`** secara lokal dan perlu diuji pada HP Android asli setelah APK dibangun lewat GitHub Actions (`android-debug.yml`) atau mesin ber-Android SDK:

1. **Kompilasi Gradle & Android Lint**: Jalankan `./gradlew lint assembleDebug` (atau picu workflow `.github/workflows/android-debug.yml`) untuk memastikan tidak ada warning/error lint native dan APK terpasang bersih.
2. **Alur Perhitungan Tagihan Tertaut (`BUG-01`) di HP**:
   - Buat tagihan baru (mis. `Listrik PLN Rp 200.000`).
   - Catat pengeluaran Catatan Kas yang cocok (`Rp 205.000`, catatan `bayar listrik pln`) hingga otomatis tertaut/lunas.
   - Pastikan **Saldo Akhir Tahun** di kartu Rincian & grafik Proyeksi Arus Kas hanya berkurang `Rp 205.000` (bukan `Rp 405.000`) dan konsisten dengan saldo Catatan Kas.
3. **Tempel Nominal Desimal (`BUG-02`)**: Salin teks `1.500.000,00` dari m-banking/WhatsApp, tempel ke input saldo/transaksi/tagihan, lalu pastikan terbaca `1.500.000` (bukan `150.000.000`).
4. **Mode Offline (Mode Pesawat)**: Nyalakan Mode Pesawat, buka APK, pastikan aplikasi terbuka tanpa layar putih, transaksi lokal bisa disimpan, dan status sinkron menampilkan pesan offline (bukan "Supabase belum diisi").
5. **Lifecycle Native Android**:
   - Uji tombol **Back** fisik/gestur saat modal/bottom sheet/drawer terbuka (harus menutup overlay dulu sebelum keluar aplikasi).
   - Uji **keyboard virtual** saat mengisi form di dalam bottom sheet (pastikan tombol Simpan tidak tertutup keyboard).
   - Uji **kirim ke background lalu buka kembali** saat sedang mengisi form atau menggulir daftar.
   - Uji **ekspor PDF / JSON / Share Sheet**, **notifikasi pengingat lokal**, **OAuth Google deep link (`com.renkeu.app://auth-callback`)**, dan **haptic feedback**.

---

## 6. Risiko Tersisa & Saran Perbaikan Berikutnya

1. **Ketergantungan CDN saat Offline untuk Fitur Sekunder**: Pustaka Supabase SDK, SheetJS (`xlsx`), dan Google Fonts dimuat dari CDN. Aplikasi inti dan penyimpanan lokal tetap berjalan normal saat offline, tetapi fitur impor Excel dan sinkron cloud membutuhkan internet (sudah wajar, namun pastikan fallback pesan tetap jelas).
2. **Ukuran Tap Target Tombol Kecil di APK (`INFO-03`)**: Bila nanti ada iterasi polish UI APK, pertimbangkan memperluas area sentuh (*hit area* via padding/pseudo-element minimal `44×44 px`) pada `#m-acct-btn`, `#m-btn-privacy`, `#m-btn-notif`, dan `.seg-btn` tanpa mengubah ukuran visual ikon.
3. **Pembersihan File Yatim (`INFO-01`)**: Bila `js/ui/agenda.js` memang sudah digantikan sepenuhnya oleh tab Jadwal & Rincian, file tersebut dapat dihapus di sesi pembersihan terpisah agar repositori lebih ramping.
4. **Keamanan Backup Android (`INFO-02`)**: Pertimbangkan menyetel `android:allowBackup="false"` di `AndroidManifest.xml` jika ingin memastikan data `localStorage` WebView tidak ikut tercadangkan otomatis ke Google Backup di luar sinkron Supabase.
