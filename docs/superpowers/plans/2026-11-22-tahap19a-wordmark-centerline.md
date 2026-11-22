# Tahap 19a Implementation Plan: SVG Stroke Animation di Dalam Tubuh Huruf (Centerline + Glyph Clip) Mengikuti Referensi

**Goal:** Memperbaiki cacat visual Tahap 19 (garis tipis berjalan di tepi luar huruf seperti Gambar 1) menjadi animasi line drawing putih penuh **di dalam tubuh huruf** mengikuti lekukan tulisan tangan `R -> e -> n -> K -> e -> u` (seperti Gambar 2 referensi Threads), dengan menjaga seluruh mekanisme Tahap 19, ukuran `+2pt` (`24.5px`), performa `60fps` pada CPU throttle 4x, dan isolasi Mode APK.

**Root Cause (Gambar 1 vs Gambar 2):**
- Tahap 19 menerapkan `stroke-width: 1.05` langsung pada kontur luar outline font Pacifico, sehingga garis putih tampak melingkari sisi tepi luar huruf abu-abu.
- Referensi Gambar 2 menampilkan guratan putih selebar penuh tubuh huruf yang bergerak di sepanjang sumbu tengah (centerline) di dalam tubuh huruf abu-abu tanpa meluber keluar tepi.

**Architecture:**
1. 9 jalur sumbu tengah tulisan tangan (`RK_WM_STROKES`: `R:2, e:1, n:1, K:3, e:1, u:1`, total panjang `~425.2` unit SVG) yang diturunkan dari peta jarak medial glyph Pacifico.
2. Klip siluet glyph per huruf (`<clipPath id="rk-wm-g-<seq>-<i>"><path d="RK_WM_GLYPHS[i]"/></clipPath>`) di dalam `<defs>` agar guratan putih tebal (`stroke-width: 6.8`) mengisi penuh 100% ketebalan tubuh huruf Pacifico tanpa meluber keluar tepi maupun bocor ke huruf tetangga yang bersambung.
3. Grup tunggal `<g class="mt-wm-drawn-grp">` (`opacity: 0.78`) membungkus 9 path `.mt-wm-drawn` (`stroke-opacity: 1`) sehingga persimpangan garis (mis. silang `R`/`K` dan sambungan antarhuruf) mulus seragam tanpa bercak alpha ganda.
4. 5 lapisan aktif kepala/ekor/halo (`.mt-wm-trail`): 2 halo lembut tak terklip tepat di ujung kepala bergerak (`stroke-width: 9` @ `0.09` & `7` @ `0.16`) + 3 ekor/kepala putih menyala (`stroke-width: 6.8`, `opacity: 0.42 -> 0.74 -> 1.00`) yang terklip ketat pada siluet huruf aktif.
5. Pengecualian sadar Aturan 3 tetap sama (hanya properti `stroke*` pada elemen garis wordmark saat non-idle melalui rAF tunggal `_rkWmClock`, tanpa `<filter>`/`feGaussianBlur`).

## Langkah Eksekusi
- [ ] **Step 1 (TDD RED)**: Tulis `tests/schedule/tahap19a_wordmark_centerline.test.js` dan pastikan gagal sebelum ubah kode.
- [ ] **Step 2 (Generator & Konstanta)**: Perbarui `tools/gen-wordmark-pacifico.js` dan `js/ui-mobile/mobile-app.js` dengan 9 jalur centerline (`li`, `d`, `len`), `<clipPath>` siluet per huruf ber-ID unik, `<g class="mt-wm-drawn-grp">`, dan penulis `applyWmProgress` yang memperbarui `clip-path` ekor dalam hanya saat huruf aktif berubah.
- [ ] **Step 3 (CSS, Token, SW)**: Perbarui `css/tokens.css`, `css/mobile.css`, dan naikkan `sw.js` ke `rk-cache-v43`.
- [ ] **Step 4 (Tes & Build)**: Perbarui ketat `tahap19_wordmark_stroke.test.js` untuk membedakan `<clipPath>` siluet huruf vs `.mt-wm-clip-rect` lama yang tetap terlarang; jalankan `npm run build`, `npm test`, dan `npm run test:bot`.
- [ ] **Step 5 (Chrome CDP & Laporan)**: Verifikasi visual & metrik nyata di `C:\Users\daffa\Documents\verif-tahap19a\` (cakupan isi dalam huruf >= 98%, tanpa outline tepi, jarak kepala vs `getPointAtLength`, 1x & 4x CPU throttle FPS), lalu tulis `laporan tahap 19a.md`.
