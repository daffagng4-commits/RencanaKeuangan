# Laporan Audit Putaran 2 — Rencana Keuangan (RenKeu)

- **Tanggal**: 23 November 2026
- **Titik Awal**: Commit lokal `bc854d3` (`baseline putaran 1`) — `67/67` unit, `54/54` jadwal, `18/18` bot.
- **Cakupan**: Aplikasi utama HTML Browser Mode (`index.dev.html`, `js/core/*`, `js/ui/*`, `js/sync.js`, `css/*`), APK Mobile Mode (`js/ui-mobile/mobile-app.js`, `css/mobile.css`), dan `android/`. Folder `tools/` dan `bot/` di luar cakupan (kecuali `bot/core.mjs` yang otomatis ikut teruji via `npm run test:bot`).
- **Status Git**: Seluruh perbaikan dicatat rapi dengan pola **1 bug = 1 commit lokal** di cabang `main` (tidak di-*push* ke remote).
- **Kebijakan Skema Data**: Tidak ada perubahan skema penyimpanan (`rencana-keuangan-v1`, `RK_SCHEMA_VER = 3`); migrasi v1/v2 → v3 terverifikasi aman.

---

## 1. Ringkasan Jumlah Temuan Putaran 2 per Keparahan

| Kategori / Keparahan | Ditemukan | Diperbaiki | Status Verifikasi |
|---|---:|---:|---|
| **Kritis** | 0 | 0 | — *(keluarga BUG-01 lintas tampilan sudah bersih kecuali BUG-19 Sedang)* |
| **Tinggi** | 4 (`BUG-12`, `BUG-13`, `BUG-15`, `BUG-16`) | 4 | 4 `TERVERIFIKASI` |
| **Sedang** | 3 (`BUG-14`, `BUG-17`, `BUG-19`) | 3 | 3 `TERVERIFIKASI` |
| **Rendah** | 1 (`BUG-18`) | 1 | 1 `TERVERIFIKASI` |
| **Total Bug Baru Putaran 2** | **8** (`BUG-12` s.d. `BUG-19`) | **8** | **8/8 `TERVERIFIKASI` (TDD merah → hijau)** |
| **Tindak Lanjut INFO Putaran 1** | 4 (`INFO-01` s.d. `INFO-04`) | 3 selesai, 1 diaudit | 3 `TERVERIFIKASI`, 1 `TIDAK BISA DIUJI` (SDK lokal absen; workflow CI valid) |
| **Analisis Supabase Tanpa Kredensial** | 1 (`SYNC-01`) | 0 *(observasi arsitektur)* | 1 `DUGAAN` |
| **Perubahan Teks Antarmuka** | 13 (`TX-11` s.d. `TX-23`) | 13 | 13 `TERVERIFIKASI` (0 tes pecah) |

---

## 2. Tabel Lengkap Temuan Bug (`BUG-12` s.d. `BUG-19`) & Tindak Lanjut INFO

| ID | Platform | File:baris | Deskripsi | Keparahan | Status & Commit | Bukti Verifikasi |
|---|---|---|---|---|---|---|
| **BUG-12** | Keduanya | `js/ui/num-input.js:48-77` | **`fmtRpBlurStr()` dan `fmtRpInputStr()` menggembungkan 100x input desimal & mengabaikan shorthand negatif**: Saat pengguna menempel `"1.500.000,00"` atau `"1,500,000.00"` ke input nominal lalu blur/ketik, regex `/[^\d.,\s]/` mengembalikan `false` sehingga `parseRp()` dilewati dan semua pemisah dihapus menjadi `"150.000.000"`. Selain itu `fmtRpBlurStr("-500rb")` mengembalikan `"-500rb"` karena syarat lama `n > 0` mengabaikan nilai negatif. **Perbaikan**: Deteksi pola ribuan+desimal 1–2 digit, pertahankan tanda `-`, dan arahkan input desimal/negatif lewat `parseRp()`. | **Tinggi** | **Diperbaiki** (`85b9ba5`) | `TERVERIFIKASI` — Tes TDD `tests/unit/audit_putaran2.test.js` (`BUG-12`): gagal dulu (`'150.000.000' !== '1.500.000'`), lalu hijau + `tests/unit/num-input.test.js` tetap lulus. |
| **BUG-13** | Keduanya | `js/ui/trip.js:3096-3108` | **`xlNum()` mengecilkan 1.000.000x angka desimal Excel & membocorkan `NaN`/`Infinity`**: Pada impor Excel perjalanan, `"1.500.000,00"` dan `"1,500,000.00"` tidak cocok regex ribuan lama sehingga jatuh ke `t.replace(',', '.')` lalu `parseFloat("1.500.000.00")` menghasilkan **`1.5`** (sejuta kali lebih kecil!). Nilai numerik `NaN`/`Infinity` juga lolos mentah. **Perbaikan**: Dukung pola ribuan + desimal lokal/internasional dan guard `Number.isFinite`. | **Tinggi** | **Diperbaiki** (`e0dbbd8`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-13`): gagal dulu (`1.5 !== 1500000`), lalu hijau (`1500000`, `250000.5`, `0` untuk `NaN`/`Infinity`). |
| **BUG-14** | Keduanya | `js/core/util.js:72-73` | **`parseRp()` menerima tanda minus di tengah (`"50-000"` → `50`) dan notasi ilmiah liar (`"1e308"` → `1`)**: Fallback `parseInt()` berhenti di karakter `-` atau `e` lalu mengembalikan angka parsial yang menyesatkan. **Perbaikan**: Validasi sisa string pasca-satuan wajib cocok `/^[+-]?[\d.,]+$/`, selain itu kembalikan `0`. | **Sedang** | **Diperbaiki** (`9a2ee5c`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-14`): gagal dulu (`50 !== 0`), lalu hijau (`0` untuk `"50-000"` & `"1e308"`, tetap lulus untuk `"1 500 000"`, `"-500rb"`, `"  200.000  "`). |
| **BUG-15** | Keduanya | `js/ui/trip.js:2721-2731` | **`simApply()` crash `TypeError` bila `kasLinked()` bernilai `null`**, dan `renderSim()` berisiko null-deref `la.ak`/`lb.ak` bila `rows` kosong (keluarga BUG-03). **Perbaikan**: Tambah guard `if (KL && Array.isArray(KL.tx))` di `simApply()` dan guard `la ? ... : '—'` di `renderSim()`. | **Tinggi** | **Diperbaiki** (`aabba2d`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-15`): gagal dulu (`Cannot read properties of null (reading 'tx')`), lalu hijau. |
| **BUG-16** | Keduanya | `js/sync.js:373-380, 700-705, 746-753` | **Loop tak berujung `pull() ↔ push()` saat konflik offline multi-perangkat (`lr > rr > ls`)** + `auth()` tanpa `.catch()` + handler konflik `c === 'local'` menulis ke `KEY` generik: Saat perangkat offline mengubah data (`lr = 300`, `ls = 100`) sementara cloud sudah di `rr = 200`, `pull()` memanggil `push()` dengan `prevRev = 100` → 0 baris ter-update → memanggil `pull()` lagi selamanya. **Perbaikan**: Perbarui `setSync(rr)` sebelum `push()` saat `lr > rr`, tambah `.catch()` pada `auth()`, dan pakai `rkWriteCache(ALL)` + `setSync(+row.rev || 0)` pada cabang `c === 'local'`. | **Tinggi** | **Diperbaiki** (`4e4f0bc`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-16`): gagal dulu (`pullCount=6`, loop tak berujung), lalu hijau (`pullCount <= 2`, `cloudRev === 300`). |
| **BUG-17** | Keduanya | `js/core/state.js:456-480` | **`rkWriteCache()` memanggil `localStorage.setItem` tanpa `try/catch`**: Saat penyimpanan penuh (`QuotaExceededError`) atau mode privasi memblokir storage, pemanggil langsung melempar exception. **Perbaikan**: Bungkus dengan `try/catch` yang mengembalikan boolean sukses/gagal lalu teruskan ke `setSaveStatus(ok)` di `save()`. | **Sedang** | **Diperbaiki** (`e5dd887`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-17`): gagal dulu (`Error: QuotaExceededError`), lalu hijau tanpa exception. |
| **BUG-18** | HTML | `js/ui/datepick.js:18-22` | **Fallback `tday()` memakai `new Date().toISOString().slice(0, 10)` (UTC)**: Pada pukul 00:30 WIB (`17:30 UTC` hari sebelumnya), bila `todayISO` belum dimuat, tanggal kalender bisa melompat mundur 1 hari. **Perbaikan**: Gunakan komponen tanggal lokal (`getFullYear`, `getMonth`, `getDate`). | **Rendah** | **Diperbaiki** (`a7b1101`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-18`): gagal dulu, lalu hijau. |
| **BUG-19** | Keduanya | `js/ui/report.js:23-26` | **`repCollect()` memakai harga rencana (`priceAt`) alih-alih nominal realisasi (`realTx(k).amt`) untuk tagihan tertaut `S.real`**: Pada laporan PDF harian/mingguan/bulanan/tahunan, tabel Tagihan menampilkan Rp 200.000 (rencana) sementara tabel Transaksi Kas & `calc()` mencatat Rp 205.000 (aktual). **Perbaikan**: Pakai `rtx ? (+rtx.amt || 0) : priceAt(it, t)` di `repCollect()`. | **Sedang** | **Diperbaiki** (`b127978`) | `TERVERIFIKASI` — Tes TDD `audit_putaran2.test.js` (`BUG-19`): gagal dulu (`200000 !== 205000`), lalu hijau + `tests/unit/report.test.js` seluruhnya lulus. |
| **INFO-01** | HTML | `js/ui/agenda.js`, `README.md`, `ARSITEKTUR.md` | Hapus 140 baris kode mati `js/ui/agenda.js` dan bersihkan referensi usang di `README.md` & `ARSITEKTUR.md`. | Informasional | **Selesai** (`f4aaf8f`) | `TERVERIFIKASI` — `check-bundle.js` lulus (`54 skrip`), `npm test` hijau penuh. |
| **INFO-02** | APK | `android/app/src/main/AndroidManifest.xml:5` | Ubah `android:allowBackup="true"` → `"false"` agar data `localStorage` keuangan lokal tidak ikut tercadangkan otomatis ke Google Drive/ADB backup. | Keamanan / Info | **Selesai** (`1bdea9d`) | `TERVERIFIKASI` — `AndroidManifest.xml` terverifikasi + tes `apk_installer_static.test.js` lulus. |
| **INFO-03** | APK | `css/mobile.css:432-441, 1005-1017, 1348, 1962-1968` | Perluas hit-area efektif (`::before`/`::after`) menjadi `>= 44×44 px` tanpa mengubah ukuran visual pada `.av-btn`, `.ico-btn` (`inset: -5px; margin: -1px;`), `.seg-btn`, `.btn-sm`, `.pon-btn`, dan `#m-pon-close`. | Aksesibilitas / Info | **Selesai** (`09a9b45`, `fb87143`) | `TERVERIFIKASI` — Audit Chrome CDP 360×740: **0 kontrol `< 44px` efektif** di seluruh 6 tab APK (`rincian`, `kas`, `jadwal`, `item`, `sim`, `trip`), `OK mobile_app_mode`. |
| **INFO-04** | APK (CI) | `.github/workflows/android-debug.yml` | Audit konfigurasi workflow CI build APK tanpa mengubah file workflow (lihat Bagian 5). | Lingkungan / Info | **Diaudit** | `TIDAK BISA DIUJI` secara lokal (Android SDK tidak terpasang); YAML & isi workflow terverifikasi `TERVERIFIKASI` via `apk_update_ci.test.js`. |
| **SYNC-01** | Keduanya | `js/sync.js:103-112, 370-379` | **Observasi sesi kedaluwarsa & konflik last-write-wins**: Refresh token otomatis bergantung pada `autoRefreshToken: true` milik SDK Supabase (tidak bisa diuji live tanpa kredensial); resolusi konflik saat ini memakai *last-write-wins* berdasarkan `Date.now()` lokal (bila jam perangkat meleset jauh dari perangkat lain, revisi bisa kalah). | Informasional | Dilaporkan | `DUGAAN` — Analisis kode statis (tanpa kredensial Supabase asli). |

---

## 3. Pola yang Sudah Dipindai (Tahap 2 A–G)

| Keluarga / Pola | Jumlah File / Lokasi Diperiksa | Hasil Pemindaian | Status |
|---|---|---|---|
| **A. Hitung ganda `S.real` / konsistensi rencana + aktual** | 39 file JS, **117 titik referensi** (`calc.js`, `kas.js`, `rincian.js`, `report.js`, `trip.js`, `browser-app.js`, `mobile-app.js`, `bot/core.mjs`) | Ditemukan 1 inkonsistensi (`BUG-19` di `report.js:24`) & 1 null-deref (`BUG-15` di `simApply`). `calc()`, `simCalc()`, `yearCash()`, `kasRows()`, `kasBal()`, `brBuildCashflowPoints()` (default `smEff()`), dan `bot/core.mjs` konsisten 100% (`calc().end === cashflow last pt === 4.140.000`). | **Bersih** (`TERVERIFIKASI`) |
| **B. Parser & formatter angka** | 39 file JS, **186 titik referensi** (`parseRp`, `rp`, `shortP`, `num-input.js`, `xlNum`, `tripParseRateLocale`, `csv.js`, `parseQuickItem`) | Ditemukan & diperbaiki 3 bug: `BUG-12` (`num-input.js`), `BUG-13` (`xlNum`), `BUG-14` (`parseRp`). Seluruh 11 input ekstrem (`"1.500.000,00"`, `"1,500,000.00"`, `"Rp 1,5jt"`, `"1.5jt"`, `"1 500 000"`, `"-500rb"`, `""`, `"abc"`, `"1e308"`, `"  200.000  "`, `"50-000"`) kini konsisten. `tripParseRateLocale` sudah bersih. | **Bersih** (`TERVERIFIKASI`) |
| **C. HTML rusak dalam template string & duplikasi ID DOM** | 39 file JS + `index.dev.html` (**2.841 baris HTML**), plus audit DOM runtime Browser Mode (**321 ID**) & APK Mode (**633 ID**) | **0** tag rusak/kutip nyasar (`<div"`), **0** atribut dobel, **0** ID duplikat di DOM Browser Mode maupun APK Mode. *(15 temuan mentah pemindai adalah false-positive string PDF `<< /Type ... >>` dan konkatenasi sah `'<span' + (cls ? ...)`.)* | **Bersih** (`TERVERIFIKASI`) |
| **D. Null guard, `JSON.parse`, `localStorage`, migrasi skema v1/v2 → v3** | 39 file JS (**16 `JSON.parse`**, **65 panggilan `localStorage`**) + uji migrasi `norm(null)`, `sv:1`, `sv:2` | Ditemukan & diperbaiki 2 bug: `BUG-15` (`simApply`/`renderSim`) & `BUG-17` (`rkWriteCache`). Semua `JSON.parse` dari sumber eksternal/`localStorage` sudah terlindungi `try/catch`; migrasi v1 & v2 ke `sv: 3` lulus 100%. | **Bersih** (`TERVERIFIKASI`) |
| **E. Alur data end-to-end** | 5 alur utama: ekspor/impor JSON round-trip, Excel baris cacat, backup/restore, undo/redo berulang, edit/hapus transaksi | Seluruh 5 alur lulus: `dataSig` sebelum & sesudah ekspor→impor `replace` identik; `xlDate`/`xlNum` aman untuk sel cacat; undo/redo 4 langkah berturut-turut tepat; edit & hapus transaksi tertaut langsung memperbarui `calc().end`, `kasBal`, dan grafik proyeksi. | **Bersih** (`TERVERIFIKASI`) |
| **F. Tanggal, waktu, kabisat & zona waktu WIB vs UTC** | 39 file JS (**220 referensi tanggal/waktu**) | Ditemukan & diperbaiki 1 bug: `BUG-18` (`datepick.js` fallback `tday()`). `todayISO()` (`reminders.js:10`), `nowHM()` (`trip.js:2825`), dan `dueTriggerDate()` (`trip.js:3925`) seluruhnya memakai komponen waktu lokal (aman untuk transaksi 00:30 WIB). Tanggal 29 Feb & 31 bulanan lulus di `core.test.js` & `audit_finance.test.js`. | **Bersih** (`TERVERIFIKASI`) |
| **G. Sinkronisasi Supabase (`js/sync.js`)** | 1 file inti (`js/sync.js`, 831 baris) + mock unit test `sync_isolation.test.js` & `audit_putaran2.test.js` | Ditemukan & diperbaiki 1 bug besar: `BUG-16` (loop tak berujung `pull()↔push()` + `.catch()` `auth()` + `rkWriteCache` konflik). OAuth deep link `id.renkeu.app://auth` & pembersihan `rkSignOut` sudah aman. Pengujian live server Supabase tetap `DUGAAN` / `TIDAK BISA DIUJI` tanpa kredensial asli. | **Terperiksa** (`TERVERIFIKASI` via mock, live `DUGAAN`) |

---

## 4. Daftar Perubahan Teks Antarmuka Putaran 2 (`TX-11` s.d. `TX-23`)

Seluruh 13 perubahan di bawah diterapkan pada commit `93b8f7f` setelah disetujui (melanjutkan `TX-01` s.d. `TX-10` dari Putaran 1). Pemindaian mengonfirmasi **0** penggunaan kata ganti *"kamu"/"mu"*, **0** istilah *"pendapatan"*, dan **0** tes yang terganggu.

| ID | File:baris | Sebelum | Sesudah | Alasan |
|---|---|---|---|---|
| **TX-11** | `js/ui/browser-app.js:2255` | `Semua tagihan sudah lunas!` | `Semua tagihan sudah lunas` | Menghapus tanda seru tersisa agar selaras dengan nada tenang `TX-05`. |
| **TX-12** | `js/ui-mobile/mobile-app.js:5015` | `Offline — menampilkan data lokal` | `Offline. Menampilkan data lokal.` | Menghapus *em dash* (`—`) pada status pull-to-refresh APK. |
| **TX-13** | `js/ui-mobile/mobile-app.js:5031` | `Gagal sinkron — cek koneksi` | `Gagal sinkron. Periksa koneksi internet.` | Menghapus *em dash* dan menyelaraskan bahasa Indonesia baku. |
| **TX-14** | `js/sync.js:798` | `Sinkron belum aktif. Isi Supabase di js/config.js.` | `Sinkron cloud belum aktif. Periksa koneksi atau konfigurasi Supabase.` | Menghilangkan path file kode (`js/config.js`) dari pesan pengguna akhir. |
| **TX-15** | `js/ui/io.js:338` | `Isinya kosong.` | `Data impor kosong. Tempel teks JSON/CSV atau pilih file terlebih dahulu.` | Pesan error kini memberi langkah lanjutan yang jelas. |
| **TX-16** | `js/ui/io.js:424` | `Gagal membaca file.` | `Gagal membaca file. Pastikan file valid dan tidak rusak.` | Menyamakan pesan error dengan `TX-03` (`browser-app.js:3493`). |
| **TX-17** | `js/ui-mobile/mobile-app.js:6712` | `File tidak dapat dibaca.` | `File tidak dapat dibaca. Pastikan file valid dan tidak rusak.` | Paritas teks desktop-mobile untuk impor file APK. |
| **TX-18** | `js/ui-mobile/mobile-app.js:3780` | `Gagal menyalin tautan.` | `Gagal menyalin tautan. Coba lagi atau buka langsung lewat browser.` | Memberi solusi alternatif bila salin tautan pembaruan APK gagal. |
| **TX-19** | `js/ui-mobile/mobile-app.js:5603` | `Sinkron Google belum aktif` | `Login Google belum tersedia saat mode lokal/offline.` | Lebih jelas daripada pesan ambigu "belum aktif". |
| **TX-20** | `js/ui-mobile/mobile-app.js:6148` | `Berbagi teks gagal` | `Gagal berbagi teks. Gunakan "Salin teks" sebagai alternatif.` | Menyelaraskan toast dengan instruksi langkah lanjut. |
| **TX-21** | `js/ui/report.js:388` | `Unduh laporan gagal: <err>` | `Gagal mengunduh laporan: <err>. Coba ulangi atau periksa izin penyimpanan.` | Konsisten awalan "Gagal ..." (`TX-06`) dengan langkah perbaikan. |
| **TX-22** | `js/ui/trip.js:2757` | `Isi nama.` | `Nama skenario belum diisi.` | Lebih spesifik dan selaras dengan pesan validasi lain. |
| **TX-23** | `js/ui/trip.js:2758` | `Isi jumlah yang valid.` | `Nominal harus lebih besar dari 0 (mis. 50.000 atau 200k).` | Selaras dengan `TX-07` beserta contoh format yang diterima. |

---

## 5. Bukti Verifikasi Akhir & Audit GitHub Actions (`INFO-04`)

Seluruh perintah berikut dijalankan segar pada build final (`fb87143`):

1. **Build & Sinkronisasi Capacitor (`npm run cap:sync`)**: Exit code `0` (`0.148s`), menyalin `dist/` ke `android/app/src/main/assets/public/` (7 plugin Capacitor aktif).
2. **Kesamaan SHA-256 3-Arah (`TERVERIFIKASI`)**:
   - `index.html`: `6570e7ca98e3021f2ad37dd3844a4aa9ebdf2df7cddf2b5cd29970b6a227b7d5`
   - `dist/index.html`: `6570e7ca98e3021f2ad37dd3844a4aa9ebdf2df7cddf2b5cd29970b6a227b7d5`
   - `android/app/src/main/assets/public/index.html`: `6570e7ca98e3021f2ad37dd3844a4aa9ebdf2df7cddf2b5cd29970b6a227b7d5`
3. **`npm test`**: Exit code `0`:
   - `tests/check-bundle.js`: `OK: 54 skrip dikompilasi tanpa error sintaks; index.html sinkron dengan sumber.`
   - `tests/run-unit.js`: **76/76 lulus** (`+9` tes regresi baru di `tests/unit/audit_putaran2.test.js`, `0` gagal).
   - `tests/run-schedule.js`: **54/54 lulus** (`Semua tes jadwal lulus.`, termasuk `OK mobile_app_mode`).
4. **`npm run test:bot`**: Exit code `0` — **18/18 lulus**.
5. **Audit Dinamis Headless Chrome (CDP)**: Exit code `0`:
   - **52 tampilan tab** (`1440×900` terang/gelap/zoom 150%, `768×1024`, `360×740`, `320×640`, Browser & APK, Mode Offline): **0** error konsol, **0** `pageerror`, **0** horizontal overflow, **0** eksekusi XSS.
   - **Audit Hit-Area Efektif APK (`360×740`)**: **0** tombol `< 44px` efektif di seluruh 6 tab APK (`rincian`, `kas`, `jadwal`, `item`, `sim`, `trip`).
6. **Audit Workflow `.github/workflows/android-debug.yml` (`INFO-04` — `TERVERIFIKASI` secara statis, tanpa mengubah file)**:
   - Valid YAML (diverifikasi juga oleh tes `A2` di `tests/unit/apk_update_ci.test.js`).
   - Lingkungan sesuai: `ubuntu-latest`, `actions/checkout@v4`, `setup-node@v4` (Node `22`), `setup-java@v4` (Temurin **JDK 21** — cocok untuk AGP/Capacitor 8), `android-actions/setup-android@v3` (`platform-tools`, `platforms;android-36`, `build-tools;36.0.0` — cocok dengan `compileSdk 36` di `android/variables.gradle`).
   - Alur build & rilis: `npm ci` → `npm run cap:sync` → `cd android && ./gradlew assembleDebug` → `upload-artifact@v4` (`renkeu-android-debug`) → publikasi rilis bergulir `apk-latest` hanya bila keempat secret signing (`RK_KEYSTORE_BASE64`, `RK_KEYSTORE_PASSWORD`, `RK_KEY_ALIAS`, `RK_KEY_PASSWORD`) lengkap dan dengan guard anti-downgrade `EXISTING_RUN`.
   - **Langkah memicu build APK secara manual**:
     1. *Push* commit lokal ke branch `main` (otomatis memicu workflow via `on.push.branches: [main]`), **atau**
     2. Buka tab **Actions** di repositori GitHub → pilih workflow **Android Debug APK** → klik **Run workflow** → pilih branch target → klik **Run workflow** (`workflow_dispatch`).
     3. Setelah hijau, unduh APK dari *Artifact* `renkeu-android-debug` atau rilis `apk-latest` (bila secret signing terpasang).

---

## 6. Hal yang Tidak Bisa Diuji Lokal & Langkah Tes Manual di HP Android Asli

Berstatus **`TIDAK BISA DIUJI`** di mesin ini karena Android SDK, perangkat Android fisik, dan kredensial Supabase produksi tidak tersedia:

1. **Kompilasi Gradle & Instalasi APK**: Picu workflow `Android Debug APK` di GitHub Actions lalu pasang APK hasil build pada HP Android asli.
2. **Uji `INFO-02` (`allowBackup="false"`)**: Pastikan `adb backup` tidak menyertakan data aplikasi dan aplikasi tetap memuat data cloud setelah login Supabase.
3. **Uji `INFO-03` (Area Sentuh APK)**: Ketuk tombol header (Akun, Privasi, Notifikasi), tombol `Perlebar`, tombol segmen (`Bar`/periode), dan tombol banner notifikasi menggunakan ibu jari pada layar 360 dp — pastikan responsif tanpa perubahan tampilan visual.
4. **Uji `BUG-12` & `BUG-13` (Desimal m-banking/Excel)**: Tempel `1.500.000,00` ke input Catatan Kas / Saldo Awal lalu tap di luar kolom (harus jadi `1.500.000`, bukan `150.000.000`); impor file `.xlsx` perjalanan berisi nominal `1.500.000,00` (harus terbaca `Rp 1.500.000`, bukan `Rp 2`).
5. **Uji `BUG-16` (Sinkron Offline Multi-Perangkat)**: Ubah data di Perangkat A dalam keadaan online, ubah data berbeda di Perangkat B dalam Mode Pesawat (lebih baru), lalu hidupkan internet di Perangkat B — pastikan sinkronisasi selesai dalam 1 siklus tanpa loop atau error jaringan.
6. **Uji Waktu Tengah Malam WIB (`00:01–06:59 WIB`)**: Catat transaksi baru pada jam tersebut dan pastikan tanggal default jatuh pada hari WIB saat itu (bukan kemarin).

---

## 7. Risiko Tersisa & Saran Perbaikan Berikutnya

1. **Bulan Mulai Manual Lebih Awal dari Bulan Berjalan (`startMonth < today.month`)**: `kasBal(P)` secara sengaja menghitung saldo realtime sampai bulan `smEff()` agar konsisten dengan kontrak 4 tes jadwal existing (`todayNode.val === kasBal(P).bal`). Bila pengguna menyetel *bulan mulai* manual lebih awal daripada bulan berjalan saat ini, transaksi di antara `(sm + 1)` hingga `today` tidak masuk ke `kasBal(P)` maupun grafik `brBuildCashflowPoints`. Bila perilaku ini ingin diubah di masa depan, perlu kesepakatan kontrak baru bersama pembaruan 4 tes jadwal terkait.
2. **Resolusi Konflik Sinkron Cloud (`SYNC-01`, `DUGAAN`)**: `js/sync.js` saat ini memakai *last-write-wins* berdasarkan `Date.now()` perangkat lokal. Jika dua perangkat dengan jam sistem berbeda jauh mengedit offline, perubahan yang lebih baru secara riil bisa tertimpa. Disarankan di iterasi mendatang mempertimbangkan *server timestamp* atau *field-level merge*.
3. **Android Lint di CI (`INFO-04`)**: Saat ini `android-debug.yml` menjalankan `./gradlew assembleDebug` tanpa `./gradlew lint`. Jika diinginkan di masa depan, bisa ditambahkan step `./gradlew lintDebug` sebagai jaring pengaman native tambahan.
4. **Tes E2E Legacy (`tests/e2e/`)**: Seperti dicatat di `ARSITEKTUR.md`, harness `tests/e2e/` lama belum mendukung `matchMedia`/`ResizeObserver` dan sudah digantikan oleh 54 tes di `tests/schedule/`; dapat dibersihkan atau dimodernisasi di sesi terpisah.
