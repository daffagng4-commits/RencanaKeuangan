# Rencana Audit Menyeluruh: Rencana Keuangan (RenKeu) — HTML & APK

Tanggal: 23 November 2026
Status: Menunggu persetujuan sebelum masuk Tahap 2 (Audit Kode) dan sebelum mengubah file aplikasi apa pun.

## Prinsip Kerja
- Tidak menambah fitur baru dan tidak merombak desain.
- Tidak mengubah struktur data tersimpan (`rencana-keuangan-v1`, `RK_SCHEMA_VER = 3`) tanpa jalur migrasi aman.
- Tidak menghapus atau melonggarkan tes yang sudah ada agar lolos.
- Setiap temuan pada laporan akhir (`LAPORAN_AUDIT.md`) diberi label jujur: **TERVERIFIKASI**, **DUGAAN**, atau **TIDAK BISA DIUJI**.
- Perubahan teks antarmuka (Tahap 3) diajukan dulu dalam tabel (`sebelum | sesudah | alasan`) untuk persetujuan sebelum diterapkan.
- Perbaikan (Tahap 5) dilakukan satu bug = satu perubahan terpisah, akar masalah dulu, dan perubahan sekecil mungkin.

---

## Tahap 2: Audit Kode Statis (Urut dari Risiko Tertinggi)

### Prioritas 1 (Kritis) — Akurasi Perhitungan Keuangan & Tanggal
Target file: `js/core/calc.js`, `js/core/schedule.js`, `js/core/items.js`, `js/core/util.js`, `js/core/match.js`, `js/core/reminders.js`, `js/ui/num-input.js`, `js/ui/trip.js`, `js/ui/report.js`, `js/ui/browser-app.js`, `js/ui-mobile/mobile-app.js`.
1. Audit rumus perhitungan saldo awal, total pengeluaran/pemasukan/investasi per bulan dan per tahun, sisa akhir tahun, jatah bulanan, penyesuaian saldo berulang, utang/cicilan, serta simulasi skenario (satuan bulanan vs tahunan, persen vs desimal, tanda +/-).
2. Audit floating point dan pembulatan: operasi kurs valuta asing (`trip.js` multi-currency & rate lock), pembagian rata-rata bulanan, persentase kategori, `toFixed` vs `Math.round`, serta potensi selisih jumlah rincian terhadap total.
3. Audit parsing dan format Rupiah (`parseRp`, `rp`, `fmtRpInputStr`, `fmtRpBlurStr`, `tripParseRateLocale`): input `"1.500.000"` vs `"1,500,000"`, input kosong, `0`, negatif, angka sangat besar (`> Number.MAX_SAFE_INTEGER` atau miliaran/triliunan), desimal, dan karakter huruf/simbol.
4. Audit pembagian dengan nol serta kemungkinan `NaN` atau `Infinity` bocor ke tampilan UI, SVG grafik, maupun PDF laporan.
5. Audit perhitungan tanggal: bulan 28/29/30/31 hari, tahun kabisat (2024/2028 vs 2026/2027), konversi UTC vs zona waktu lokal (`toISOString()` vs tanggal lokal), pengurutan transaksi, dan pergeseran jadwal (`shift`).

### Prioritas 2 (Tinggi) — Data, State, Migrasi, & Keamanan
Target file: `js/core/state.js`, `js/sync.js`, `js/ui/io.js`, `js/ui/backup.js`, `js/ui/kas.js`, `js/ui/items.js`, `js/ui/jadwal.js`, `js/ui/trip.js`, `js/ui/browser-app.js`, `js/ui-mobile/mobile-app.js`.
1. Audit persistensi `localStorage`: penanganan `JSON.parse` tanpa `try/catch`, kuota penuh (`QuotaExceededError`), kehilangan data saat refresh, dan kompatibilitas migrasi data versi lama (`RK_SCHEMA_VER` < 3 atau format lama).
2. Audit sinkronisasi state: edit/hapus transaksi, tagihan, profil kas, atau item trip memastikan seluruh total, grafik, KPI, badge navigasi, dan tab lain (termasuk pindah Mode Browser <-> Mode APK) ikut terbarui tanpa ID bentrok atau duplikasi.
3. Audit keamanan: pemindaian menyeluruh penggunaan `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, serta tautan `href` yang menerima input pengguna (XSS), plus pengecekan `js/config.js` & `bot/` terhadap secret/API key hardcoded.

### Prioritas 3 (Tinggi) — Khusus APK Android & Selisih HTML vs APK
Target file: `capacitor.config.json`, `android/app/build.gradle`, `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/id/renkeu/app/*.java`, `android/app/src/main/assets/public/`, `js/ui/io.js`, `js/ui/reminders.js`, `js/ui-mobile/mobile-app.js`, `css/mobile.css`.
1. Audit `AndroidManifest.xml` & Gradle: izin (`INTERNET`, `POST_NOTIFICATIONS`, `REQUEST_INSTALL_PACKAGES`, `VIBRATE`), `allowBackup`, `minSdkVersion` (24) / `targetSdkVersion` (36), cleartext traffic, `FileProvider`, dan deep link OAuth `id.renkeu.app://auth`.
2. Audit kompatibilitas WebView Android: unduh/ekspor file (PDF/CSV/JSON/Excel), clipboard, file picker, notifikasi lokal, `window.open`, `alert`/`confirm`/`prompt`, tombol Back hardware Android, lifecycle pause/resume (apakah state form/edit hilang saat app di-background), dan rotasi layar.
3. Audit path aset dan ketergantungan offline: dampak kegagalan CDN (`@supabase/supabase-js` di `index.dev.html`, SheetJS `xlsx` di `trip.js`, serta CDN di `tools/` bila masuk cakupan) saat APK dibuka offline.
4. Audit UI sentuh mobile: elemen hover-only, tap target `< 44x44px`, keyboard virtual menutupi input pada sheet/form, meta viewport, dan `env(safe-area-inset-*)`.
5. Bandingkan selisih isi `dist/index.html` (hasil build terbaru) terhadap salinan lokal `android/app/src/main/assets/public/index.html` serta perbedaan perilaku fitur antara Mode Browser (Desktop) dan Mode APK (`#mobile-app-shell`).

### Prioritas 4 (Sedang) — Kode Umum, Validitas HTML/CSS, & Responsivitas
Target file: `index.dev.html`, `css/tokens.css`, `css/desktop.css`, `css/mobile.css`, semua file `js/**/*.js` (termasuk cek file tidak terpakai seperti `js/ui/agenda.js`).
1. Audit potensi galat runtime: variabel tidak terdefinisi, event listener ganda/bocor, async/Promise tanpa `.catch()`, dan `fetch()` tanpa penanganan timeout/error HTTP.
2. Audit HTML & CSS: tag tidak tertutup, atribut `id` duplikat di `index.dev.html` maupun template dinamis `mobile-app.js`, serta bentrok selektor CSS antara Desktop dan APK.
3. Audit responsivitas lintas ukuran: HP kecil (`320x640`, `360x740`), tablet (`768x1024`), desktop lebar (`1440x900`), zoom `150%`, dan mode terang/gelap.

---

## Tahap 3: Audit Teks Antarmuka (`/antislop-copywriting`)
1. Kumpulkan dan tinjau seluruh teks antarmuka pada `index.dev.html`, `js/ui/*.js`, dan `js/ui-mobile/mobile-app.js` (judul, label, tombol, placeholder, pesan galat, empty state, tooltip, teks panduan).
2. Periksa konsistensi sapaan, istilah keuangan (mis. pemasukan vs pendapatan, transaksi vs mutasi, tagihan vs beban), kejelasan pesan galat (apa yang salah + langkah perbaikan), typo, teks campuran Indonesia-Inggris tidak disengaja, serta frasa bertele-tele atau klise.
3. Sajikan daftar usulan perbaikan dalam tabel (`Lokasi | Sebelum | Sesudah | Alasan`) dan tunggu persetujuan sebelum diterapkan.

---

## Tahap 4: Audit Dinamis & Tes Perhitungan Manual
1. Jalankan aplikasi hasil build (`index.html`) di Chromium headless (CDP) untuk Mode Browser dan Mode APK, tangkap seluruh console error/warning dan uncaught exception.
2. Uji alur utama dengan data normal dan data ekstrem (kosong, `0`, nominal sangat besar, angka desimal, karakter XSS/khusus, tanggal kabisat 29 Feb & 31 bulan pendek) pada kedua mode serta cek responsivitas multi-viewport + mode gelap + zoom 150%.
3. Tulis skrip tes perhitungan keuangan dengan hasil hitung manual terlebih dahulu (jadwal bulanan/harian/kabisat, saldo akhir, jatah bulanan, penyesuaian saldo, pencocokan kas, multi-kurs perjalanan, simulasi), lalu bandingkan dengan output aplikasi.
4. Periksa ketersediaan toolchain Android (Java/Gradle/SDK); jalankan lint/build APK bila SDK tersedia, atau nyatakan jujur bila tidak dapat dijalankan di lingkungan lokal ini.

---

## Tahap 5: Perbaikan Bertahap (Setelah Temuan Disetujui)
1. Perbaiki bug satu per satu dari keparahan Kritis -> Tinggi -> Sedang -> Rendah (akar masalah dulu, perubahan minimal, tanpa menyentuh file di luar cakupan).
2. Untuk bug di sumber bersama (`index.dev.html`, `css/`, `js/`), jalankan `npm run build` dan (bila disetujui) sinkronkan ke `android/app/src/main/assets/public/` via `npm run cap:sync`, lalu catat semua file yang disalin.
3. Terapkan perubahan teks antarmuka yang telah disetujui dari Tahap 3.

---

## Tahap 6: Verifikasi Akhir & Laporan (`LAPORAN_AUDIT.md`)
1. Jalankan ulang seluruh rangkaian tes otomatis (`npm test`, `npm run test:bot`, plus tes audit baru yang ditulis di Tahap 4) dan verifikasi dinamis Chrome headless; tampilkan output nyata.
2. Tinjau ulang diff dengan `/requesting-code-review` dan `/karpathy-guidelines`.
3. Susun `LAPORAN_AUDIT.md` berisi ringkasan jumlah bug per keparahan, tabel lengkap temuan (`ID | Platform | File:baris | Deskripsi | Keparahan | Status | Bukti verifikasi` dengan label `TERVERIFIKASI` / `DUGAAN` / `TIDAK BISA DIUJI`), daftar perubahan teks, daftar hal yang tidak bisa diuji beserta langkah uji manual di HP asli, serta risiko tersisa.
