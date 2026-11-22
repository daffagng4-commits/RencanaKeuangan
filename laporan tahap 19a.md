# Laporan Tahap 19a: Perbaikan Garis Animasi Wordmark "RenKeu" ke Dalam Badan Huruf (Centerline + Glyph Clip, Mode APK)

Status: Selesai. Seluruh pengujian otomatis dan verifikasi visual Chrome CDP lulus. Belum di-commit atau push.

## 1. Akar Masalah (Gambar 1 vs Referensi Gambar 2) & Keputusan Desain Final

### Akar Masalah
- Pada Tahap 19 sebelumnya (Gambar 1), `RK_WM_STROKES` menelusuri **kontur tepi luar** font Pacifico (`834.90` unit SVG) dengan ketebalan tipis (`stroke-width: 1.05`). Akibatnya, saat menarik Pull-to-Refresh, garis putih tampak seperti garis tepi (outline) di sekeliling sisi luar huruf abu-abu, bukan menyala di dalam badan huruf.
- Pada referensi yang diminta pengguna (Gambar 2, gaya Threads), garis animasi berwarna putih penuh berjalan **di dalam badan huruf** (mengisi penuh lebar batang huruf dari tengah ke tepi badan huruf abu-abu) dengan ujung kepala cahaya putih terang.

### Keputusan Desain Final
- **9 jalur sumbu tengah (centerline) di dalam badan huruf**:
  - `RK_WM_STROKES` di `js/ui-mobile/mobile-app.js` diganti dari kontur keliling menjadi 9 jalur goresan tulisan tangan di sepanjang sumbu tengah tiap huruf (`R`: 2 goresan, `e`: 1 goresan, `n`: 1 goresan, `K`: 3 goresan, `e`: 1 goresan, `u`: 1 goresan; total panjang `425.18` unit SVG).
  - Koordinat jalur centerline diturunkan dari medial ridge (Euclidean distance transform) siluet Pacifico asli, mengikuti arah menulis alami dari kiri ke kanan (`R -> e -> n -> K -> e -> u`) tanpa jeda antarhuruf.
  - `RK_WM_GLYPHS` tidak diubah sehingga bentuk font Pacifico, ukuran `+2pt` (`--wm-h: 24.5px`, `102.47 x 24.5 px`), dan fidelitas IoU per huruf terhadap `renkeu-topbar.html` tetap terjaga.
- **Kliping ketat ke siluet masing-masing huruf**:
  - `mobWordmarkSvgHtml()` menambahkan `<defs>` berisi 6 `<clipPath class="mt-wm-glyph-clip" id="rk-wm-g-<seq>-<i>">` yang masing-masing memakai path `RK_WM_GLYPHS[i]`.
  - Setiap garis permanen `.mt-wm-drawn` diberi `clip-path="url(#rk-wm-g-<seq>-<li/>)"` sehingga kuas tebal tidak pernah keluar dari batas siluet hurufnya sendiri dan tidak merembes ke huruf sebelah.
- **Kuas pengisi seragam bebas bercak tumpang tindih**:
  - Lebar maksimum batang huruf Pacifico pada viewBox `132.92 x 31.78` adalah `6.40` unit. Lebar kuas `.mt-wm-drawn` ditetapkan `stroke-width: 6.8` dengan `stroke-opacity: 1` agar mengisi penuh badan huruf hingga tepi dalam tanpa menyisakan celah abu-abu.
  - Seluruh 9 path `.mt-wm-drawn` dibungkus dalam satu grup `<g class="mt-wm-drawn-grp">` dengan `opacity: 0.78`. Pembungkusan grup tunggal menghilangkan bercak ganda (double-alpha spot) di titik persilangan goresan (`R`, `K`, dan sambungan kursif) sehingga isian putih di `P = 1.0` merata 100%.
- **5 lapisan kepala cahaya dan ekor memudar (tanpa `<filter>`/`feGaussianBlur`)**:
  - 2 lapisan halo luar lembut tanpa klip di sekitar kepala bergerak: `.mt-wm-halo-outer` (`stroke-width: 9`, `--wm-glow-soft: rgba(255, 255, 255, 0.09)`) dan `.mt-wm-halo-inner` (`stroke-width: 7`, `--wm-glow: rgba(255, 255, 255, 0.16)`).
  - 3 lapisan kepala dan ekor di dalam huruf (`clip: true`, `clip-path` diperbarui hanya saat indeks huruf `seg.li` berpindah, maksimal 6 kali per lintasan): `.mt-wm-tail-2` (`stroke-width: 6.8`, `stroke-opacity: 0.42`), `.mt-wm-tail-1` (`stroke-width: 6.8`, `stroke-opacity: 0.74`), dan `.mt-wm-head` (`stroke-width: 6.8`, `stroke-opacity: 1`).
- **Kontrak Tahap 19 yang dipertahankan penuh**:
  - Ukuran `--wm-h: 24.5px`, `overflow: visible`, durasi lintasan `RK_WM_PASS_MS = 2200ms`, tarikan jari dua arah, return batal mulus, loop pada cloud lambat, finale kuning (`120ms` masuk + `380ms` keluar ke putih) khusus saat sukses, mode reduced-motion, satu loop rAF (`_rkWmClock`), serta perbaikan A1 sampai A5.
  - Pengecualian sadar Aturan 3 tetap sama: `stroke`, `stroke-dasharray`, `stroke-dashoffset`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, dan `stroke-opacity` hanya diizinkan secara terbatas pada garis wordmark saat non-idle tanpa filter/blur dan tanpa `animation: infinite` (terkunci audit CSS A1).

## 2. Daftar Perubahan & Berkas Diubah

Perubahan gabungan Tahap 19 + 19a di working tree hanya menyentuh mode APK, build, dan tes. Nol perubahan pada `package.json`, `package-lock.json`, `css/desktop.css`, `android/`, `bot/`, `.github/`, maupun `js/core/`.

- `js/ui-mobile/mobile-app.js`:
  - `RK_WM_STROKES` (L752-774): 9 jalur centerline kaligrafi (`R:2, e:1, n:1, K:3, e:1, u:1`, total panjang `425.18` unit).
  - `mobWordmarkSvgHtml()` (L826-851): menambah 6 `<clipPath class="mt-wm-glyph-clip">`, membungkus 9 `.mt-wm-drawn` dalam `<g class="mt-wm-drawn-grp">`, dan menandai `data-wm-clip-pfx`.
  - `RK_WM_TRAIL_SPECS`, `getWmStrokeNodes()`, `applyWmProgress()` (L4276-4382): mengganti `clip-path` untuk 3 lapisan kepala/ekor dalam hanya saat `seg.li` berubah.
- `css/tokens.css` (L230-238): `--wm-h: 24.5px`, `--wm-trail: #FFFFFF`, `--wm-glow: rgba(255, 255, 255, 0.16)`, `--wm-glow-soft: rgba(255, 255, 255, 0.09)`.
- `css/mobile.css` (L279-396): menambah `.mt-wm-drawn-grp { opacity: 0.78; }`, menyesuaikan `.mt-wm-drawn` (`stroke-width: 6.8`, `stroke-opacity: 1`), `.mt-wm-halo-outer` (`9`), `.mt-wm-halo-inner` (`7`), `.mt-wm-tail-2` (`6.8`, `0.42`), `.mt-wm-tail-1` (`6.8`, `0.74`), dan `.mt-wm-head` (`6.8`, `1`), nol literal warna hex, nol `<filter>`/`blur`.
- `sw.js` & `dist/sw.js`: `CACHE_NAME` dinaikkan ke `'rk-cache-v43'`.
- `build.js`: mengecualikan `gen-wordmark-pacifico.js` dari `dist/tools/` (menghapus `dist/tools/gen-wordmark-pacifico.js`, A3).
- `index.html` & `dist/index.html`: hasil `npm run build` (`1695 KB`, `41` file JS).
- `tests/schedule/tahap19a_wordmark_centerline.test.js`: tes TDD baru mengunci 9 jalur centerline (`[2, 1, 1, 3, 1, 1]`), keberadaan 6 `clipPath.mt-wm-glyph-clip`, `.mt-wm-drawn-grp`, `stroke-width: 6.8`, penukaran `clip-path` pada lapisan trail dalam, cakupan tiap huruf, dan `sw.js >= v43`.
- `tests/schedule/tahap19_wordmark_stroke.test.js`, `tahap18_wordmark_write.test.js`, `tahap17_wordmark_letters.test.js`, `tahap16_refresh_indicator.test.js`, `mobile_app_mode.test.js`: diselaraskan ketat ke kontrak centerline Tahap 19a.
- `docs/superpowers/plans/2026-11-22-tahap19a-wordmark-centerline.md`: dokumen rencana kerja Tahap 19a.
- `laporan tahap 19a.md`: laporan hasil ini.

## 3. Hasil Pengujian & Status Git

- `npm test` (exit `0`):
  - `build.js`: `index.html + dist/index.html` (`1695 KB, 41 file js`).
  - `check-bundle.js`: `55` skrip valid, sinkron dengan sumber.
  - `run-unit.js`: **62/62 lulus** (`1598.3 ms`).
  - `run-schedule.js`: **53/53 lulus** (termasuk `tahap19a_wordmark_centerline.test.js` dan `tahap19_wordmark_stroke.test.js`).
- `npm run test:bot` (exit `0`): **18/18 lulus** (`620.6 ms`).
- `git diff -- package.json package-lock.json css/desktop.css android/ bot/ .github/ js/core/`: **kosong (0 perubahan)**.
- `git ls-files node_modules | wc -l`: **`1419`** (tidak diubah).
- Perintah `git add` yang disarankan (tanpa `node_modules/`):
  ```bash
  git add build.js css/mobile.css css/tokens.css js/ui-mobile/mobile-app.js sw.js index.html dist/index.html dist/sw.js dist/tools/gen-wordmark-pacifico.js tools/gen-wordmark-pacifico.js tests/schedule/mobile_app_mode.test.js tests/schedule/tahap16_refresh_indicator.test.js tests/schedule/tahap17_wordmark_letters.test.js tests/schedule/tahap18_wordmark_write.test.js tests/schedule/tahap19_wordmark_stroke.test.js tests/schedule/tahap19a_wordmark_centerline.test.js docs/superpowers/plans/2026-11-22-tahap19-wordmark-stroke.md docs/superpowers/plans/2026-11-22-tahap19a-wordmark-centerline.md "laporan tahap 19.md" "laporan tahap 19a.md"
  ```

## 4. Pengukuran Chrome CDP Nyata (Sebelum vs Sesudah)

Bukti tangkapan layar PNG (`apk-p-10.png` s.d. `apk-p-100.png`, `drag-fwd-20.png`, `drag-back-20.png`, `finale-peak-yellow.png`, `finale-end-white.png`, `idle-360x740-light.png`, `idle-360x740-dark.png`) dan `metrics-tahap19a.json` disimpan di luar repo pada `C:\Users\daffa\Documents\verif-tahap19a\`. `pageErrors: []` (0 error).

### Perubahan Visual Utama (Tahap 19 vs Tahap 19a)
| Aspek | Tahap 19 (Gambar 1) | Tahap 19a (Sesuai Referensi Gambar 2) |
|---|---|---|
| Lintasan stroke | Kontur tepi luar (`834.90` unit), `stroke-width: 1.05` | **9 jalur centerline di dalam huruf (`425.18` unit), `stroke-width: 6.8`** |
| Kliping siluet huruf | Tidak ada (garis berjalan di sisi luar huruf) | **6 `clipPath.mt-wm-glyph-clip` per huruf** (mengisi penuh badan huruf) |
| Cakupan piksel inti badan huruf pada `P = 1.0` | Tepi saja (bagian tengah tetap abu-abu) | **`3271 / 3271` piksel = `100.00%`** (`meanCoreLum = 0.897`, seragam tanpa bercak tumpang tindih) |

### Ukuran, Layout, & Idle (10 Konfigurasi: `360x740`, `320x640`, `390x844`, `412x915`, `740x360` x Terang/Gelap)
| Viewport | Tema | Ukuran Wordmark | Jarak ke `.mt-actions` | Tabrakan / Overflow X |
|---|---|---|---|---|
| `320x640` | Light / Dark | `102.47 x 24.5 px` | `69.53 px` | `false` / `false` |
| `360x740` | Light / Dark | `102.47 x 24.5 px` | `109.53 px` | `false` / `false` |
| `390x844` | Light / Dark | `102.47 x 24.5 px` | `139.53 px` | `false` / `false` |
| `412x915` | Light / Dark | `102.47 x 24.5 px` | `161.53 px` | `false` / `false` |
| `740x360` | Light / Dark | `102.47 x 24.5 px` | `109.53 px` | `false` / `false` |

- Idle (Light & Dark): `rgb(253, 253, 254)`, `wmSubtreeAnimations = 0`.
- Fidelitas bentuk font Pacifico vs `renkeu-topbar.html` (glyph tidak berubah dari Tahap 19 A2): `R = 0.9259`, `e = 0.9168`, `n = 0.9115`, `K = 0.9228`, `e = 0.9218`, `u = 0.9167`.

### Pelacakan Kepala Cahaya di Dalam Huruf vs `getPointAtLength`
| Target `P` | `P` aktual | Segmen aktif (`huruf`, `segFrac`) | Jarak kepala vs jalur (`headErrCssPx`) | `headMaxLum` |
|---|---|---|---|---|
| `0.10` | `0.096` | `0` (`R`, `0.4449`) | **`0.00 px`** | `1.000` |
| `0.30` | `0.298` | `2` (`e`, `0.1938`) | **`0.00 px`** | `1.000` |
| `0.50` | `0.500` | `3` (`n`, `0.9537`) | **`0.00 px`** | `1.000` |
| `0.70` | `0.702` | `5` (`K`, `0.8817`) | **`0.00 px`** | `1.000` |
| `0.90` | `0.904` | `8` (`u`, `0.2155`) | **`0.00 px`** | `0.996` |

### Tarikan Dua Arah, Batal, & Finale
- **Dua arah (`20px` maju vs `40px -> mundur 20px`)**: `fwd20P = 0.3846`, `back20P = 0.3846` (`pEqual = true`), `meanChannelDiff = 0.641`.
- **Lepas batal di `30px`**: kembali ke idle dalam `233 ms`, `data-refreshing = null`, `haptics = []`.
- **Finale sukses**: puncak kuning `rgb(251, 223, 76)`, akhir putih `rgb(251, 252, 251)`.

### Performa (1x CPU vs 4x CPU Throttling via CDP)
| Kondisi CPU | Frame dalam 1 lintasan (`2200ms`) | FPS Rata-rata | Waktu Skrip / Frame | Penulisan Gaya / Frame |
|---|---|---|---|---|
| Normal (`rate = 1`) | `133` frame | **`60.5 fps`** | **`0.0789 ms`** | `6.06` properti/elemen |
| Throttle 4x (`rate = 4`) | `133` frame | **`60.5 fps`** | **`0.3609 ms`** | `6.06` properti/elemen |

## 5. Tabel Tes -> Status -> Alasan

| Berkas Tes | Status | Alasan |
|---|---|---|
| `tests/schedule/tahap19a_wordmark_centerline.test.js` | Baru (Lulus) | Mengunci 9 jalur centerline (`[2, 1, 1, 3, 1, 1]`), 6 `clipPath.mt-wm-glyph-clip`, grup `.mt-wm-drawn-grp`, `stroke-width: 6.8`, penukaran `clip-path` lapisan kepala/ekor dalam, bebas outline luar, dan `sw.js >= v43`. |
| `tests/schedule/tahap19_wordmark_stroke.test.js` | Diperbarui ketat (Lulus) | Tetap mengunci `rkWmStrokeState`, 5 lapisan aktif trail, `--wm-h: 24.5px`, `overflow: visible`, audit CSS menyeluruh (A1), A3, drag/refresh/finale/reduced-motion, dan diselaraskan ke jumlah jalur centerline per huruf `[2, 1, 1, 3, 1, 1]`. |
| `tests/schedule/tahap18_wordmark_write.test.js` | Lulus (diperbarui sejak Tahap 19) | Mengunci kontrak progres kontinu, drag dua arah, finale kuning, dan reduced-motion pada mesin stroke. |
| `tests/schedule/tahap17_wordmark_letters.test.js` | Lulus (diperbarui sejak Tahap 19) | Mengunci urutan huruf `R -> e -> n -> K -> e -> u` dan lapisan wordmark pada mesin stroke. |
| `tests/schedule/tahap16_refresh_indicator.test.js` | Lulus (diperbarui sejak Tahap 19) | Mengunci pintu tunggal `rkSetRefreshIndicator` dan durasi lintasan `2200ms`. |
| `tests/schedule/mobile_app_mode.test.js` | Lulus (diperbarui sejak Tahap 19) | Mengunci `height: var(--wm-h)` (`24.5px`) pada mode APK. |
| 47 tes jadwal lainnya + 62 tes unit + 18 tes bot | Lulus tanpa ubah | Nol regresi pada Desktop, core, `RK_SCHEMA_VER = 3`, haptic, PTR, maupun bot. |

## 6. Risiko Yang Tersisa & Yang Tidak Dijalankan

- Belum dilakukan build APK Gradle / GitHub Actions dan belum diuji pada perangkat Android fisik.
- Rendering `<clipPath>` per huruf + `<g opacity="0.78">` pada variasi GPU WebView Android nyata baru disimulasikan melalui Chromium CDP desktop dengan CPU throttling 4x.
- Pengaturan "Hapus animasi" OS Android nyata, tombol Back hardware saat refresh, serta rotasi fisik potret <-> lanskap pada HP fisik belum diuji.
- Belum dilakukan `git commit` ataupun `git push`.

## 7. Checklist Uji Manual di HP

1. Tarik layar pelan ke bawah (Pull-to-Refresh) tanpa melepas: pastikan garis putih tebal berjalan **di dalam badan huruf** abu-abu `R -> e -> n -> K -> e -> u` (bukan garis tipis di pinggir luar huruf) dengan kepala cahaya putih terang.
2. Periksa lekukan tiap huruf (`R`, `e`, `n`, `K`, `e`, `u`): pastikan tidak ada celah abu-abu tertinggal di tengah huruf dan tidak ada bercak lebih terang di titik persilangan huruf.
3. Kembalikan jari ke atas sebelum melepas: pastikan garis mundur mulus di dalam badan huruf kembali ke huruf awal.
4. Lepas di bawah ambang: garis kembali mulus lalu memudar ke putih penuh tanpa refresh dan tanpa getaran.
5. Lepas di atas ambang: wordmark berubah abu-abu, garis menulis di dalam badan huruf dari awal hingga akhir, kilat kuning singkat, lalu putih penuh.
6. Uji re-tap berulang pada tab aktif (Rincian, Transaksi, Jadwal), mode gelap, orientasi lanskap, serta koneksi putus (kembali putih tanpa kuning).

## 8. Peta Kode Terbaru

| Komponen | Berkas & Baris |
|---|---|
| 9 jalur centerline `RK_WM_STROKES`, `RK_WM_SEGS`, `rkWmStrokeState` | `js/ui-mobile/mobile-app.js` (L752-825) |
| Markup SVG 6 `clipPath.mt-wm-glyph-clip`, `.mt-wm-drawn-grp`, 5 trail | `js/ui-mobile/mobile-app.js` (L826-851) |
| Penulis gaya & penukaran `clip-path` per huruf (`applyWmProgress`, `wmTick`) | `js/ui-mobile/mobile-app.js` (L4276-4458) |
| Pintu tunggal refresh & drag (`updateWmDrag`, `startWmReturn`, `rkSetRefreshIndicator`) | `js/ui-mobile/mobile-app.js` (L4460-4596) |
| Token `--wm-h`, `--wm-trail`, `--wm-glow`, `--wm-glow-soft` | `css/tokens.css` (L230-241) |
| Gaya `.mt-wm-drawn-grp`, `.mt-wm-drawn` (`6.8`), halo & ekor | `css/mobile.css` (L279-396) |
| Service Worker Cache (`rk-cache-v43`) | `sw.js` (L4) |
| Tes baru Tahap 19a | `tests/schedule/tahap19a_wordmark_centerline.test.js` |

---

## Catatan Pembaruan APK

Perubahan ini hanya sampai ke HP setelah: commit + push ke main -> GitHub Actions Android Debug APK selesai (rilis apk-latest memuat nomor run baru) -> di aplikasi: Pengaturan -> Pembaruan Aplikasi -> Cek pembaruan -> Unduh & pasang.
