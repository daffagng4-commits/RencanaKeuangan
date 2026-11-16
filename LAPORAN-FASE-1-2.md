# Laporan Implementasi — Fase 1 & Fase 2

Tanggal: 16 November 2026  
Cakupan: **Fase 1 (Pemisahan CSS & Shell Router)** dan **Fase 2 (Helper Input Nominal Auto-Format `js/ui/num-input.js`)**

---

## 1. Daftar File Baru

| File | Fungsi & Peran |
| :--- | :--- |
| [css/tokens.css](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/css/tokens.css) | Berisi `@font-face` (`Plus Jakarta Sans`), token warna & tema dasar (`light`, `dark`, `bw`, `bwd`), token bersama untuk desain ulang / Mode Aplikasi HP, gaya `.modern-slider`, serta aturan CSS router visibilitas (`body[data-shell="mobile-app"]` vs `body:not([data-shell="mobile-app"])`). |
| [css/desktop.css](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/css/desktop.css) | Berisi seluruh gaya antarmuka **Browser Mode** hasil pemisahan dari `css/style.css` lama agar terisolasi dari Mode Aplikasi HP. |
| [css/mobile.css](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/css/mobile.css) | Berisi seluruh gaya **Mode Aplikasi HP (PWA / Standalone)** dari `mockup-mobile.html` yang seluruh selektornya di-*scope* di bawah `body[data-shell="mobile-app"]` dan `#mobile-app-shell` agar tidak memengaruhi Browser Mode. |
| [js/ui/shell-mode.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/ui/shell-mode.js) | Router mode tampilan (`detectShellMode`, `getShellMode`, `setShellMode`, `toggleShellMode`, `syncShellSwitchUI`, `bindShellMode`) beserta deteksi `?mode=app|browser`, penyimpanan preferensi `localStorage` (`rk-shell-mode`), dan deteksi PWA `standalone`. |
| [js/ui/num-input.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/ui/num-input.js) | Helper auto-format pemisah ribuan titik secara *real-time* (`fmtRpInputStr`, `fmtRpBlurStr`, `fmtLive`, `getRpVal`, `setRpVal`, `syncModernSlider`, `bindNumInputs`) menggunakan *event delegation* global dan sinkronisasi dua arah dengan `.modern-slider`. |
| [tests/unit/num-input.test.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/tests/unit/num-input.test.js) | 5 tes unit untuk `fmtRpInputStr`, `fmtRpBlurStr`, `fmtLive` (penjagaan posisi kursor), round-trip `getRpVal`/`setRpVal` + `.modern-slider`, serta `detectShellMode` & `setShellMode`. |

---

## 2. Daftar File yang Diperbarui & Dihapus

| File | Ringkasan Perubahan |
| :--- | :--- |
| [index.dev.html](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/index.dev.html) | Memuat 3 CSS terpisah (`tokens.css`, `desktop.css`, `mobile.css`); menambah `type="text" inputmode="numeric" data-num-fmt="rp"` pada `#saldo`, `#f-price`, `#kpg`, `#pp`, `#qka`; menambah kontainer `#mobile-app-shell`, tombol pemindah mode `#alat-shell-mode` (`data-shell-switch="mobile-app"`), serta tag `<script>` untuk `js/ui/num-input.js` dan `js/ui/shell-mode.js`. |
| [js/ui/dom.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/ui/dom.js) | Menghapus duplikasi fungsi `fmtLive(el)` lama karena implementasi utama kini dipusatkan di `js/ui/num-input.js`. |
| [js/ui/kas.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/ui/kas.js) | Menambahkan `type="text" inputmode="numeric" data-num-fmt="rp"` pada input jumlah transaksi kas `#ka`. |
| [js/ui/trip.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/ui/trip.js) | Menambahkan `type="text" inputmode="numeric" data-num-fmt="rp"` pada `amtField()` (`#ite`, `#bke`), target tabungan (`#gt`, `#gs`), dan input simulasi (`#sma`), serta menambahkan *defensive guard* `typeof matchMedia === 'undefined'` pada `bindPwa()` agar aman dijalankan pada lingkungan JSDOM/headless tanpa `window.matchMedia`. |
| [js/app.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/js/app.js) | Memanggil `bindNumInputs()` dan `bindShellMode()` saat inisialisasi `main()`. |
| [manifest.webmanifest](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/manifest.webmanifest) | Mengubah `"start_url"` menjadi `"./?mode=app"` agar PWA yang dipasang di perangkat langsung membuka Mode Aplikasi HP. |
| [build.js](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/build.js) | Memperbarui komentar sumber CSS menjadi `css/tokens.css`, `css/desktop.css`, `css/mobile.css`. |
| `css/style.css` *(Dihapus)* | Digantikan sepenuhnya oleh `css/tokens.css`, `css/desktop.css`, dan `css/mobile.css`. |
| **Hasil Build Otomatis** | [index.html](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html), `dist/index.html` (`669 KB, 38 file js`), dan [bot/core.mjs](file:///c:/Users/daffa/Music/backup/untuk%20antigravity14%20nov-RencanaKeuangan-main/RencanaKeuangan-main/bot/core.mjs) (`39 KB`) berhasil dibangun ulang. |

---

## 3. Ringkasan Mekanisme Teknis

1. **Pemisahan CSS & Isolasi Shell (Fase 1):**
   - `build.js` tetap membundel seluruh `<link rel="stylesheet" href="css/...">` menjadi file tunggal offline (`index.html` & `dist/index.html`).
   - Visibilitas dan gaya dikendalikan oleh atribut `body[data-shell="browser" | "mobile-app"]` dari `js/ui/shell-mode.js`. Seluruh selektor di `css/mobile.css` terkunci di dalam `body[data-shell="mobile-app"] #mobile-app-shell` sehingga tidak mengganggu tata letak Browser Mode.
2. **Input Nominal Auto-Format Real-Time (Fase 2):**
   - Kolom angka/nominal memakai `type="text" inputmode="numeric" data-num-fmt="rp"` agar keyboard angka tetap muncul di HP sembari menampilkan pemisah titik ribuan (`1000000` → `1.000.000`) secara *real-time* saat mengetik dan menjaga posisi kursor.
   - Input *shorthand* (`250k`, `1,5jt`) tetap dapat diketik dan otomatis dikonversi ke format titik ribuan saat `blur` (`fmtRpBlurStr`).
   - Nilai yang dibaca dan disimpan ke `S`/`ALL` (`js/core/*`) serta disinkronkan ke Supabase tetap berupa `Number` murni (`1000000`) melalui `parseRp()` / `getRpVal()`.

---

## 4. Hasil Verifikasi Build & Tes Otomatis

Seluruh perintah verifikasi dijalankan ulang setelah perubahan terakhir:

| Perintah | Hasil |
| :--- | :--- |
| `npm test` (`node build.js && node tests/check-bundle.js && node tests/run-unit.js && node tests/run-schedule.js`) | **Lulus (exit code 0)** |
| — `node build.js` | `index.html + dist/index.html dibuat (669 KB, 38 file js)` |
| — `tests/check-bundle.js` | `49 skrip` dikompilasi tanpa error sintaks; `index.html` sinkron dengan sumber |
| — `tests/run-unit.js` | **34 / 34 lulus** (termasuk 5 tes baru pada `tests/unit/num-input.test.js`) |
| — `tests/run-schedule.js` | **35 / 35 berkas tes jadwal lulus** |
| `npm run test:bot` (`node build-bot.js && node --test tests/bot.test.mjs`) | **Lulus (exit code 0)** — `bot/core.mjs dibuat (39 KB)`, **18 / 18 tes bot lulus** |

> **Catatan terkait `tests/e2e/`:** Skrip di `tests/e2e/*.js` (yang memang tidak termasuk dalam `npm test`) masih merupakan tes warisan pra-redesain UI (merujuk elemen yang sudah dipindahkan seperti tombol `#adjb` dan sebelumnya gagal pada `bindPwa` karena JSDOM tidak menyediakan `matchMedia`). Pada Fase 1–2 ini, `matchMedia` di `js/ui/trip.js:1672` telah diberi *defensive guard*.

---

## 5. Status Kesiapan Fase Berikutnya

Fase 1 dan Fase 2 telah selesai, terbundel, dan lulus seluruh rangkaian tes resmi (`npm test` dan `npm run test:bot`). Proyek siap dilanjutkan ke **Fase 3 (Redesign Browser Mode sesuai `mockup-preview.html`)** setelah Anda menyetujui laporan ini.
