# Tahap 16: Indikator Refresh Shimmer Wordmark "RenKeu" & Penutup Kekurangan Tahap 15 (Mode APK)

> **Ruang lingkup**: Hanya Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`). Desktop/Browser Mode, skema data (`RK_SCHEMA_VER = 3`), native Android, workflow, dan `bot/` tidak berubah.

## 1. Temuan C0 (Bukti Kode Nyata)

- **Wordmark (`js/ui-mobile/mobile-app.js:774`, `css/mobile.css:279-284`)**: `<svg class="mt-wordmark" viewBox="1.9 2.5 101 21" fill="none" role="img" aria-label="RenKeu"><path d="RK_WORDMARK_PATH" fill="#FFFFFF"/></svg>` dengan `height: 22.5px; width: auto;`. `rkSyncHeaderMotif()` di `js/ui-mobile/header-motif.js:188-191` hanya mengganti `.hdr-motif` (`cur.outerHTML = nextSvg`) dan tidak menyentuh `.hdr-inner` maupun `.mt-wordmark`.
- **Indikator PTR saat ini (`js/ui-mobile/mobile-app.js:807-810`, `css/mobile.css:603-665`)**: `<div class="m-ptr-ind" id="m-ptr-ind" aria-hidden="true">` adalah elemen mengambang `position: absolute; z-index: 58` (tidak menggeser `#m-main`). Berisi panah tarik `.m-ptr-ico` dan spinner lingkaran `.m-ptr-spin` (`@keyframes rkPtrSpin`).
- **Titik masuk/keluar refresh (`js/ui-mobile/mobile-app.js:4052-4310`)**: PTR (`endPtr`) dan re-tap (`window.rkMobRefresh({ fromRetap: true })`) sama-sama memanggil `runRefresh(fromRetap)` dan `finishRefresh(msg, fromRetap)`. Sebelumnya `runRefresh` memunculkan `.m-ptr-ind.is-refreshing` (spinner lingkaran), sehingga re-tap juga sempat memunculkan spinner lingkaran tersebut.
- **Kekurangan Tahap 15**:
  - **A1**: `#m-set-haptic-enabled` di template `mobShellTemplate()` ditulis `checked` statis; perlu inisialisasi sesuai `rkIsHapticsEnabled()` di template dan sinkron di `renderMobSettings()`, serta tes pemulihan dari `localStorage['rk-haptics'] = '0'`.
  - **A2**: `rkHaptic()` di `mobile-app.js:1189-1225` memakai `return !!res || res === undefined;` dan ternary fallback `navigator.vibrate`, sehingga jenis tidak dikenal bisa mengembalikan `true` atau memicu fallback `8ms`. Perlu validasi jenis di awal dan flag `called` eksplisit.
  - **A3**: `package.json:33` berisi `"@capacitor/haptics": "^8.0.2"` (dicatat di laporan, tanpa ubah berkas).
  - **A4**: `tests/schedule/tahap15_menu_haptic.test.js` memuat 8 banner dekoratif `// =========` dengan huruf besar; bersihkan hanya komentar tanpa menyentuh kode/asersi.
  - **A5**: `git ls-files node_modules | wc -l` = `1419`; hanya dilaporkan beserta perintah `git add` aman.
- **Tes lama terdampak**: `tests/schedule/mobile_app_mode.test.js:1221` memeriksa `$('m-ptr-ind').classList.contains('is-refreshing')`; diperbarui setara secara ketat ke `$('#mobile-app-shell').getAttribute('data-refreshing') === '1'` karena spinner `#m-ptr-ind.is-refreshing` diganti shimmer wordmark.

## 2. Keputusan Desain Shimmer Wordmark & Status Refresh

1. **Satu pintu status**: `rkSetRefreshIndicator(on)` mengatur `data-refreshing="1"` pada `#mobile-app-shell`, `aria-busy="true"` pada `#m-main`, dan teks `"Menyegarkan data"` sekali per siklus pada `<span class="sr-only" id="m-refresh-status" role="status" aria-live="polite"></span>`.
2. **Penghitung & batas waktu**:
   - Penghitung `refreshCounter` (bukan boolean), `RK_REFRESH_MIN_MS = 850` ms (satu siklus umpan balik penuh untuk refresh lokal instan), `RK_REFRESH_MAX_MS = 20000` ms (pengaman jika `pull()` tak kunjung selesai), dan `refreshCycleId` untuk membatalkan callback basi.
   - Berhenti bersih di semua jalur akhir: `pull()` sukses, `pull()` reject, timeout 20 detik, pindah tab di tengah refresh, `unmountMobileShell()`, logout/ganti akun (deteksi perubahan `uid` di `syncMobileCloudUI()`), dan `window._rkPtrReset()`.
3. **Teknik shimmer SVG**:
   - `<clipPath id="rk-wm-clip">` + `<linearGradient id="rk-wm-grad">` di dalam `<defs>` pada `svg.mt-wordmark`.
   - `<path class="mt-wm-base">` meredup lewat `opacity: 0.56` saat `[data-refreshing="1"]`; `<rect class="mt-wm-beam">` (lebar `44` / ~43% lebar wordmark, miring `skewX(-18deg)`) dianimasikan **hanya** lewat `transform: translate3d(...)` dengan token `--dur-wm-sweep: 1250ms` dan `--ease-wm-sweep: cubic-bezier(0.45, 0.05, 0.55, 0.95)`.
   - Saat idle: tanpa `animation` (`getAnimations().length === 0`), dasar `opacity: 1`.
   - `@media (prefers-reduced-motion: reduce)`: `--dur-wm-sweep: 0.001ms`, pita disembunyikan (`animation: none; opacity: 0`), dasar meredup statis (`opacity: 0.6`).
4. **PTR**: `.m-ptr-spin`, CSS `.m-ptr-spin`, dan `@keyframes rkPtrSpin` dihapus total. Panah tarik `.m-ptr-ico` tetap tampil saat jari menarik; begitu dilepas melewati ambang, `resetVisual('is-exiting')` menutup panah mulus dan shimmer wordmark menjadi satu-satunya penanda refreshing.

## 3. Checkpoint Pelaksanaan

- **C0**: Rencana ini + tes TDD merah `tests/schedule/tahap16_refresh_indicator.test.js`.
- **C1 (Bagian A)**: Perbaikan A1, A2 (`mobile-app.js`), A4 (`tahap15_menu_haptic.test.js`).
- **C2 (Status Refresh)**: `rkSetRefreshIndicator(on)`, penghitung, batas min 850ms / maks 20s, pembersihan di semua jalur akhir.
- **C3 (Visual)**: Hapus `.m-ptr-spin` & `rkPtrSpin`, tambah `<defs>/<clipPath>/<linearGradient>` & `.mt-wm-beam`, token di `css/tokens.css`, CSS shimmer & reduced-motion di `css/mobile.css`.
- **C4**: Perbarui `mobile_app_mode.test.js:1221`, jalankan `tahap16_refresh_indicator.test.js` (hijau), verifikasi Chrome CDP nyata ke `C:\Users\daffa\Documents\verif-tahap16\`.
- **C5**: Naikkan `sw.js` ke `rk-cache-v39`, `npm run build`, `npm test`, `npm run test:bot`, dan laporkan `git status -s`.
