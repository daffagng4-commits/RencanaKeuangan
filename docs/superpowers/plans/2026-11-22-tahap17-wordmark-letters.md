# Tahap 17: Animasi Refresh Wordmark "RenKeu" Huruf-per-Huruf & Penutup Kekurangan Tahap 16 (Mode APK)

> **Ruang lingkup**: Hanya Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`). Desktop/Browser Mode, skema data (`RK_SCHEMA_VER = 3`), native Android, workflow, dan `bot/` tidak berubah.

## 1. Temuan C0 (Bukti Kode Nyata)

- **Wordmark (`js/ui-mobile/mobile-app.js:781-793`)**: `svg.mt-wordmark` (`viewBox="1.9 2.5 101 21"`, `role="img"`, `aria-label="RenKeu"`, `height: 22.5px`) saat ini memakai `<clipPath id="rk-wm-clip">`, `<linearGradient id="rk-wm-grad">`, `.mt-wm-base`, `.mt-wm-shimmer-clip`, dan `.mt-wm-beam` (`@keyframes rkWmSweep` + `--dur-wm-sweep`/`--ease-wm-sweep`).
- **Struktur `RK_WORDMARK_PATH`**: tepat 7 subpath `M...Z`:
  - `0` (`x: 1.93..18.51`) + `1` (`x: 6.44..13.10`, lubang dalam) = huruf **`R`** (2 perintah `M`).
  - `2` (`x: 19.32..33.99`) = huruf **`e`** (1 perintah `M`).
  - `3` (`x: 35.76..50.51`) = huruf **`n`** (1 perintah `M`).
  - `4` (`x: 53.12..70.17`) = huruf **`K`** (1 perintah `M`).
  - `5` (`x: 70.76..85.43`) = huruf **`e`** (1 perintah `M`).
  - `6` (`x: 86.97..101.47`) = huruf **`u`** (1 perintah `M`).
  - Penggabungan `RK_WORDMARK_LETTERS.join('') === RK_WORDMARK_PATH` identik byte-per-byte.
- **Mesin status saat ini (`mobile-app.js:4072-4410`)**: `rkSetRefreshIndicator(on)`, `forceStopRefreshIndicator()`, `runRefresh()`, `finishRefresh()`, `_rkPtrReset()`, `syncMobileCloudUI()`.
- **Kekurangan Tahap 16 (Bagian A)**:
  - **A1**: tambah uji eksplisit `syncMobileCloudUI()` berulang pada pengguna yang sama saat `pull()` tertahan -> `data-refreshing` tetap `'1'`.
  - **A2**: perbaiki komentar meleset di `tahap16_refresh_indicator.test.js:162` ("melalui pembungkus rkSetRefreshIndicator" -> `MutationObserver` pada `data-refreshing`) dan bersihkan komentar usang Tahap 16.
  - **A3**: risiko `skewX` pada `clipPath` di WebView lama gugur karena `.mt-wm-beam` dan `#rk-wm-clip` dihapus total.
  - **A4**: `git ls-files node_modules | wc -l` = `1419`; hanya dilaporkan beserta perintah `git add` aman dan saran opsional commit terpisah (tidak dijalankan).

## 2. Desain Animasi Huruf-per-Huruf & Kilat Kuning

1. **Struktur SVG (6 grup huruf berurutan)**:
   - Konstanta statis `RK_WORDMARK_LETTERS` (6 string path: `R, e, n, K, e, u`) di `js/ui-mobile/mobile-app.js`.
   - Di dalam `svg.mt-wordmark`: 6 `<g class="mt-wm-letter" data-wm-idx="0..5" aria-hidden="true">`, masing-masing berisi 4 `<path>` bertumpuk dengan `fill` token statis (hanya `opacity` yang berubah):
     - `.mt-wm-white` (`fill: var(--wm-lit)`, default `opacity: 1` saat idle -> default terlihat bila JS/animasi gagal).
     - `.mt-wm-dead` (`fill: var(--wm-dead)` = `#858B94`, abu-abu netral mati; kontras vs header terang `#0E3F86` = `3,14:1`, vs gelap `#092B60` = `4,11:1`, vs putih menyala = `3,41:1`).
     - `.mt-wm-lit` (`fill: var(--wm-lit)` = `#FFFFFF`, menyala satu per satu pada huruf aktif).
     - `.mt-wm-flash` (`fill: var(--wm-flash)` = `#FDE047`, kilat kuning pada finale sukses).
   - Hapus seluruh elemen/CSS/token Tahap 16 (`#rk-wm-clip`, `#rk-wm-grad`, `.mt-wm-beam`, `.mt-wm-shimmer-clip`, `@keyframes rkWmSweep`, `--dur-wm-sweep`, `--ease-wm-sweep`).
2. **Mesin status satu pintu (`rkSetRefreshIndicator` + `runRefresh` / `finishRefresh`)**:
   - Konstanta: `RK_WM_STEP_MS = 300` (6 huruf = `1800ms`), `RK_WM_LOOP_PAUSE_MS = 180`, `RK_WM_FLASH_IN_MS = 120`, `RK_WM_FLASH_OUT_MS = 380` (finale `500ms`; total lokal instan `2300ms`), `RK_WM_REDUCED_MIN_MS = 850`, `RK_REFRESH_MAX_MS = 20000`.
   - Atribut pada `#mobile-app-shell`: `data-refreshing="1"`, `data-wm-step="0..5"` (disertai kelas `.is-lit` hanya pada 1 `.mt-wm-letter` aktif), `data-wm-finale="1"`, `data-wm-flash="in|out"`. Tetap mempertahankan `#m-main[aria-busy="true"]` dan `#m-refresh-status`.
   - **Sukses**: setelah mencapai langkah `5` (`u`) dan `refreshCounter === 0`, jalankan finale (`in` 120ms -> `out` 380ms) lalu kembali idle putih penuh. Jika refresh masih berjalan setelah `u`, jeda `180ms` lalu ulang dari `R` (0).
   - **Non-sukses** (`pull()` reject, `_rkLastPullOk === false`, timeout 20 detik, logout/ganti akun, `_rkPtrReset()`, `unmountMobileShell()`): langsung kembali putih idle tanpa kilat kuning, semua timer dibersihkan.
   - **Ketukan beruntun**: re-tap 10x tidak me-restart cahaya; ketukan/PTR baru saat finale langsung membatalkan finale dan memulai siklus baru dari abu-abu + `R`.
   - **Reduced motion** (`rkIsReducedMotion()`): tidak menjalankan rantai langkah/finale; abu-abu statis selama refresh (minimum `850ms`) lalu langsung putih seketika.

## 3. Checkpoint

- **C0**: Diagnosis, baseline piksel idle CDP, rencana ini, tes TDD merah `tests/schedule/tahap17_wordmark_letters.test.js`.
- **C1**: Bagian A (A1 tes + verifikasi `syncMobileCloudUI`, A2 perbaikan komentar).
- **C2–C4**: `RK_WORDMARK_LETTERS`, markup 6 grup huruf, mesin status langkah + finale, token `--wm-*` & CSS opacity, hapus sisa Tahap 16, perbarui tes Tahap 16 ketat setara.
- **C5**: `sw.js` -> `rk-cache-v40`, `npm run build`, Chrome CDP penuh ke `C:\Users\daffa\Documents\verif-tahap17\`, `npm test`, `npm run test:bot`.
