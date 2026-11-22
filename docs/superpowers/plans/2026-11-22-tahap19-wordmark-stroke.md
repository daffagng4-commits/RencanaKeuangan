# Tahap 19 Implementation Plan: Wordmark "RenKeu" +2 Poin, SVG Stroke Animation dengan Glowing Light Trail Putih, & Penutup Kekurangan Tahap 18 (Mode APK)

**Goal:** Menaikkan tinggi wordmark APK "RenKeu" sebesar +2px (`22.5px -> 24.5px`, rasio tetap), mengganti efek tulis atas-ke-bawah (`clipPath + scaleY`) dengan SVG Stroke Animation + Glowing Light Trail putih tanpa filter blur, dan menutup kekurangan Tahap 18 (A1–A5).

**Architecture:** Generator sekali jalan `tools/gen-wordmark-pacifico.js` (`opentype.js@1.3.4` di direktori scratch + `@fontsource/pacifico`) memecah 6 huruf Pacifico menjadi 9 kontur tertutup (`RK_WM_STROKES`, dimulai dari titik kiri-atas tiap kontur luar dengan panjang busur akurat). Satu fungsi murni `rkWmStrokeState(P, segs)` memetakan progres tunggal `P` (`[0, 1]`) ke panjang busur kumulatif seluruh kontur tanpa jeda, menggerakkan 9 path `.mt-wm-drawn` dan 5 lapisan aktif kepala/ekor/halo putih melalui satu rAF scheduler (`window._rkWmClock`) tanpa pembacaan layout di dalam loop.

**Tech Stack:** Vanilla HTML/CSS/JS, SVG `stroke-dasharray`/`stroke-dashoffset` (`pathLength="1"`), Node.js test harness + jsdom, Chrome CDP verification.

## Global Constraints
- Hanya mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`). Zero perubahan di `css/desktop.css`, `android/`, `bot/`, `.github/`, `js/core/`, `package.json`, `package-lock.json`.
- Tanpa library runtime baru, tanpa font web, tanpa `<filter>`/`feGaussianBlur`/`drop-shadow`.
- `RK_SCHEMA_VER = 3`, haptic Tahap 15, ambang/pengecualian PTR, antrean re-tap, dan reduced-motion tidak berubah.
- `sw.js` dinaikkan ke `rk-cache-v42`; `npm run build` dijalankan dari sumber.
- **Pengecualian Sadar Aturan 3**: Animasi garis memakai `stroke-dasharray`/`stroke-dashoffset` (dengan daftar putih eksplisit `stroke`, `stroke-dasharray`, `stroke-dashoffset`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `stroke-opacity`) hanya pada elemen garis wordmark (9 kontur + 5 lapisan aktif), hanya saat status bukan `idle`, dikendalikan oleh rAF tunggal `_rkWmClock`, tanpa `animation: infinite`, tanpa filter/blur. Lapisan isi (abu-abu, putih, kuning) tetap hanya `opacity`.

## Temuan C0 (Kode Nyata)
1. `git status -s` bersih; `git ls-files node_modules | wc -l` = `1419`.
2. Wordmark Tahap 18 memakai `RK_WM_VIEWBOX = '0 0 132.92 31.78'`, 6 glyph `RK_WM_GLYPHS` (9 kontur total: `R:2, e:2, n:1, K:1, e:2, u:1`), 6 `<clipPath>` + `scaleY(fill_i)`, `height: 22.5px`, `overflow: hidden`.
3. `tests/schedule/mobile_app_mode.test.js:665` mengunci `height: 22.5px`; akan diperbarui ketat ke `--wm-h` (`24.5px`) dan dicatat di tabel tes lama.
4. `build.js:85` menyalin seluruh `tools/` ke `dist/tools/`; `tools/rebalance/`, `tools/ibkr-flip/`, `tools/bridge.js` dipakai runtime, sedangkan `tools/gen-wordmark-pacifico.js` hanya skrip pengembangan sehingga dikecualikan dari `dist/tools/` (A3).
5. `.mob-topbar` tingginya `36px` (mengikuti tombol `.mt-actions`), sehingga kenaikan tinggi wordmark ke `24.5px` tidak menaikkan tinggi header; `overflow: visible` aman karena `.mob-topbar` punya ruang margin/padding >= `8px` vertikal dan `14px` horizontal.

## Review Focus
1. Kontur yang belum tersentuh (`s = 0`) pada `stroke-linecap: round` dapat meninggalkan titik putih kecil bila `stroke-dasharray` tidak disetel `"0 2"` dan `opacity: 0`.
2. Titik batas antarkontur (`targetLen === acc + seg.len`) tidak boleh memadamkan kepala cahaya selama 1 frame atau melompati kontur.
3. Transisi `drag (P = 1) -> commit` dan `loop` cloud lambat harus memudarkan lapisan garis halus selama fase `reset` sebelum `P` mulai lagi dari `0`.
4. `prefers-reduced-motion: reduce`: refresh hanya menampilkan abu-abu statis (semua lapisan garis & kilat `opacity: 0`), sedangkan tarikan jari tetap menggambar garis secara langsung.
5. Performa 4x CPU throttle pada Chrome CDP harus tetap `>= ~55 fps` dengan hanya memperbarui kontur yang berubah tiap frame.

---

## Tahapan Eksekusi (C1–C7)
- [ ] **C1 (Bagian A)**: Siapkan audit CSS menyeluruh (A1) di `tests/schedule/tahap19_wordmark_stroke.test.js` (TDD RED dulu), kecualikan `gen-wordmark-pacifico.js` dari `dist/tools/` di `build.js` (A3), bersihkan komentar Tahap 18 usang (A4), laporkan A5.
- [ ] **C2 (Ukuran +2 poin)**: Token `--wm-h: 24.5px`, `--wm-trail`, `--wm-glow`, `--wm-glow-soft` di `css/tokens.css`, `height: var(--wm-h); overflow: visible;` di `css/mobile.css`.
- [ ] **C3 (Generator & Data Stroke + A2 IoU per huruf)**: Perbarui `tools/gen-wordmark-pacifico.js` untuk memecah 9 kontur, rotasi titik awal kiri-atas + arah konsisten + panjang busur rapat (`RK_WM_STROKES`), ukur IoU per huruf vs `renkeu-topbar.html` (A2).
- [ ] **C4 (Fungsi Progres & Render Efisien)**: Implementasikan `rkWmStrokeState(P, segs)`, markup 9 `.mt-wm-drawn` + 5 lapisan aktif kepala/ekor/halo, penulis gaya efisien per-frame, hapus `clipPath`/`.mt-wm-clip-rect`/`RK_WM_BOXES`/`rkWmFill`.
- [ ] **C5 & C6 (Mesin Status, CSS, & Pembaruan Tes)**: Adaptasi `bindMobPullToRefresh()` (`RK_WM_PASS_MS = 2200`), CSS stroke + reduced-motion, perbarui ketat `tahap18_wordmark_write.test.js`, `tahap17_wordmark_letters.test.js`, `tahap16_refresh_indicator.test.js`, `mobile_app_mode.test.js:665`.
- [ ] **C7 (Build, CDP Nyata, & Laporan)**: Naikkan `sw.js` ke `rk-cache-v42`, `npm run build`, jalankan verifikasi Chrome CDP nyata (`C:\Users\daffa\Documents\verif-tahap19\`, termasuk 4x CPU throttle & uji jarak kepala vs `getPointAtLength`), jalankan `npm test` + `npm run test:bot`, dan tulis `laporan tahap 19.md`.
