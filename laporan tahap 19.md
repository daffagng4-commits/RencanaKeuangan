# Laporan Tahap 19: Wordmark "RenKeu" +2 Poin, SVG Stroke Animation dengan Glowing Light Trail Putih, & Penutup Kekurangan Tahap 18 (Mode APK)

Status: Selesai dan seluruh pengujian otomatis serta verifikasi Chrome CDP lulus. Belum di-commit atau push.

## 1. Temuan C0 & Keputusan Desain Final

### Temuan C0 (Kode Nyata Sebelum Perubahan)
- Status Git awal: bersih (Tahap 18 sudah terkomit). Jumlah berkas `node_modules` terlacak Git: `1419`.
- Wordmark Tahap 18: `svg.mt-wordmark` (`role="img"`, `aria-label="RenKeu"`, `viewBox="0 0 132.92 31.78"`, tinggi `22.5px`, lebar `94.09px`, `overflow: hidden`) dengan 6 `<clipPath>` + `<rect class="mt-wm-clip-rect">` dan `scaleY(fill_i)` via `rkWmFill()`.
- Struktur kontur `RK_WM_GLYPHS`: total 9 kontur tertutup (`R`: 2, `e`: 2, `n`: 1, `K`: 1, `e`: 2, `u`: 1). Titik awal mentah font berada di ekor kanan bawah (`R` di `(33.84, 22.96)`, `K` di `(100.35, 22.96)`).
- Tinggi `.mob-topbar`: `36px` (mengikuti tinggi tombol `.mt-actions`), dengan padding/margin vertikal `>= 8px` dan kiri `14px`. Kenaikan wordmark ke `24.5px` dan `overflow: visible` tidak menaikkan tinggi header dan tidak terpotong.
- A3 (`build.js`): `copyDir(tools -> dist/tools)` dibutuhkan runtime untuk `tools/rebalance/`, `tools/ibkr-flip/`, dan `tools/bridge.js`, tetapi `tools/gen-wordmark-pacifico.js` hanya skrip pengembangan sehingga dikecualikan dari `dist/tools/` (tidak ikut ke APK).
- Tes terdampak yang ditemukan di C0: `tests/schedule/mobile_app_mode.test.js:665` (`height: 22.5px`), `tahap16_refresh_indicator.test.js`, `tahap17_wordmark_letters.test.js`, dan `tahap18_wordmark_write.test.js`.

### Keputusan Desain Final
- **Ukuran (+2 poin, Butir 1)**: Token `--wm-h: 24.5px` di `css/tokens.css`, `height: var(--wm-h); width: auto; overflow: visible;` di `css/mobile.css`. Ukuran terukur di Chrome CDP: `102.47 x 24.5 px` (naik proporsional dari `94.09 x 22.5 px`, rasio tetap). Jarak ke `.mt-actions` pada `320x640` sebesar `69.53px` (nol tabrakan, `hdrDelta = 0`).
- **Pemecahan kontur & titik awal**: Generator `tools/gen-wordmark-pacifico.js` (`opentype.js@1.3.4` di direktori scratch + `@fontsource/pacifico`, SIL Open Font License 1.1) memecah 6 huruf menjadi 9 kontur (`RK_WM_STROKES`, panjang total `834.90` unit SVG):
  - Kontur luar diurutkan sebelum lubang dalam (berdasarkan luas absolut).
  - Seluruh kontur stroke diseragamkan searah jarum jam (CW dalam koordinat SVG y-bawah) dan diputar titik awalnya ke simpul on-curve kiri-atas (`R` di `(8.51, 2.86)`, `e` di `(35.11, 15.48)`, `n` di `(48.82, 14.70)`, `K` di `(70.36, 1.63)`, `e` di `(101.63, 15.48)`, `u` di `(115.43, 14.68)`).
  - `RK_WM_GLYPHS` tetap mempertahankan winding asli font sehingga lapisan isi (`white`, `dead`, `flash`) identik tanpa perubahan bentuk.
- **Lapisan SVG Stroke & Glowing Light Trail (tanpa `<filter>`/`feGaussianBlur`)**:
  - 9 path permanen `.mt-wm-drawn` (`pathLength="1"`, `stroke: var(--wm-trail)`, `stroke-width: 1.05`, `stroke-opacity: 0.9`, `stroke-linecap: round`): menggambar garis putih tipis kumulatif dan tetap tampak pada kontur yang sudah dilewati. Hanya kontur yang berubah pecahannya yang ditulis tiap frame.
  - 5 lapisan aktif bersama (`.mt-wm-trail`, `pathLength="1"`, `d` hanya diganti saat berpindah kontur aktif, 9 kali per lintasan):
    1. `.mt-wm-halo-outer`: `stroke: var(--wm-glow-soft)` (`rgba(255,255,255,0.12)`), `stroke-width: 5.2`, panjang ekor `min(s, min(0.30, 20 / seg.len))`.
    2. `.mt-wm-halo-inner`: `stroke: var(--wm-glow)` (`rgba(255,255,255,0.28)`), `stroke-width: 3.1`, panjang ekor `min(s, min(0.20, 12 / seg.len))`.
    3. `.mt-wm-tail-2`: `stroke: var(--wm-trail)`, `stroke-width: 1.65`, `stroke-opacity: 0.30`, panjang ekor `min(s, min(0.32, 22 / seg.len))`.
    4. `.mt-wm-tail-1`: `stroke: var(--wm-trail)`, `stroke-width: 2.00`, `stroke-opacity: 0.62`, panjang ekor `min(s, min(0.16, 11 / seg.len))`.
    5. `.mt-wm-head`: `stroke: var(--wm-trail)`, `stroke-width: 2.40`, `stroke-opacity: 1.00`, panjang kepala `min(s, min(0.045, 3.2 / seg.len))`.
- **Durasi lintasan (`RK_WM_PASS_MS`)**: Ditetapkan **`2200ms`** (dalam rentang 2000-2400ms agar lintasan 9 kontur sepanjang `834.90` unit terbaca jelas tanpa terasa lamban). Total siklus lokal: `160ms` (fade abu-abu) + `2200ms` (lintasan) + `500ms` (finale `120ms` kuning + `380ms` putih) = `~2860ms`.
- **Pengecualian Sadar Aturan 3**: Properti `stroke`, `stroke-dasharray`, `stroke-dashoffset`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, dan `stroke-opacity` diizinkan secara terbatas hanya pada elemen garis wordmark saat non-idle melalui satu rAF loop (`_rkWmClock`), tanpa filter/blur/box-shadow animasi dan tanpa `animation: infinite`. Daftar putih ini dikunci oleh audit CSS menyeluruh (A1) di `tests/schedule/tahap19_wordmark_stroke.test.js`.

## 2. Daftar Perubahan & Berkas Diubah

Hanya mode APK dan skrip build/tes terkait. Nol perubahan di `package.json`, `package-lock.json`, `css/desktop.css`, `android/`, `bot/`, `.github/`, maupun `js/core/`.

- `tools/gen-wordmark-pacifico.js`: generator diperbarui untuk memecah 9 kontur, menyeragamkan arah CW, memutar titik awal ke kiri-atas, menghitung panjang busur Bezier (`24` sampel/kurva), dan memvalidasi bebas `NaN/Infinity`.
- `build.js`: mengecualikan `gen-wordmark-pacifico.js` saat menyalin `tools/` ke `dist/tools/` sekaligus membersihkan berkas lama `dist/tools/gen-wordmark-pacifico.js` (A3).
- `js/ui-mobile/mobile-app.js`: mengganti `RK_WM_BOXES`/`rkWmFill`/`clipPath`/`scaleY` dengan `RK_WM_STROKES`, `RK_WM_SEGS`, fungsi murni `rkWmStrokeState(p, segs)`, markup `.mt-wm-strokes` (9 `.mt-wm-drawn` + 5 `.mt-wm-trail`), `RK_WM_PASS_MS = 2200`, dan penulis gaya efisien per-frame (`getWmStrokeNodes`, `applyWmProgress`).
- `css/tokens.css`: menambah `--wm-h: 24.5px`, `--wm-trail: #FFFFFF`, `--wm-glow: rgba(255, 255, 255, 0.28)`, `--wm-glow-soft: rgba(255, 255, 255, 0.12)`.
- `css/mobile.css`: mengganti `.mt-wm-clip-rect`/`.mt-wm-lit` dengan gaya `.mt-wm-strokes`/`.mt-wm-drawn`/`.mt-wm-trail` (`--wm-h`, `overflow: visible`, aturan `prefers-reduced-motion`).
- `sw.js` & `dist/sw.js`: `CACHE_NAME` dinaikkan ke `'rk-cache-v42'`.
- `index.html` & `dist/index.html`: hasil `npm run build` (`1698 KB`, `41` file JS).
- `tests/schedule/tahap19_wordmark_stroke.test.js`: tes TDD baru lengkap termasuk audit CSS menyeluruh (A1) dan cek A3.
- `tests/schedule/mobile_app_mode.test.js`, `tahap16_refresh_indicator.test.js`, `tahap17_wordmark_letters.test.js`, `tahap18_wordmark_write.test.js`: diperbarui ketat ke kontrak Tahap 19 dan komentar usang A4 dibersihkan.
- `docs/superpowers/plans/2026-11-22-tahap19-wordmark-stroke.md`: dokumen rencana C0-C7.
- `laporan tahap 19.md`: laporan hasil ini.

## 3. Hasil Pengujian & Status Git

- `npm test` (exit `0`):
  - `build.js`: `index.html + dist/index.html` (`1698 KB, 41 file js`).
  - `check-bundle.js`: `55` skrip valid, sinkron dengan sumber.
  - `run-unit.js`: **62/62 lulus** (`1604.3 ms`).
  - `run-schedule.js`: **52/52 lulus** (termasuk `tahap19_wordmark_stroke.test.js` dan seluruh tes regresi).
- `npm run test:bot` (exit `0`): **18/18 lulus** (`496.1 ms`).
- `git diff -- package.json package-lock.json css/desktop.css android/ bot/ .github/ js/core/`: **kosong (0 perubahan)**.
- `git status -s` (sebelum pembuatan berkas laporan ini; 0 berkas tangkapan layar/sementara di repo):
  - Modified: `build.js`, `css/mobile.css`, `css/tokens.css`, `dist/index.html`, `dist/sw.js`, `index.html`, `js/ui-mobile/mobile-app.js`, `sw.js`, `tests/schedule/mobile_app_mode.test.js`, `tests/schedule/tahap16_refresh_indicator.test.js`, `tests/schedule/tahap17_wordmark_letters.test.js`, `tests/schedule/tahap18_wordmark_write.test.js`, `tools/gen-wordmark-pacifico.js`
  - Deleted: `dist/tools/gen-wordmark-pacifico.js` (A3)
  - Untracked: `docs/superpowers/plans/2026-11-22-tahap19-wordmark-stroke.md`, `tests/schedule/tahap19_wordmark_stroke.test.js`, `laporan tahap 19.md`
- `git ls-files node_modules | wc -l`: **`1419`** (tidak diubah).
- Perintah `git add` yang disarankan (tanpa `node_modules/`):
  ```bash
  git add build.js css/mobile.css css/tokens.css js/ui-mobile/mobile-app.js sw.js index.html dist/index.html dist/sw.js dist/tools/gen-wordmark-pacifico.js tools/gen-wordmark-pacifico.js tests/schedule/mobile_app_mode.test.js tests/schedule/tahap16_refresh_indicator.test.js tests/schedule/tahap17_wordmark_letters.test.js tests/schedule/tahap18_wordmark_write.test.js tests/schedule/tahap19_wordmark_stroke.test.js docs/superpowers/plans/2026-11-22-tahap19-wordmark-stroke.md "laporan tahap 19.md"
  ```
- Saran opsional komit terpisah nanti (tidak dijalankan): tambah `node_modules/` ke `.gitignore` lalu jalankan `git rm -r --cached node_modules` (GitHub Actions memakai `npm ci`).

## 4. Pengukuran Chrome CDP Nyata (Sebelum vs Sesudah)

Bukti tangkapan layar PNG dan JSON disimpan di luar repo pada `C:\Users\daffa\Documents\verif-tahap19\`. `pageErrors: []` (0 error).

### Ukuran, Layout, & Idle (10 Konfigurasi: `360x740`, `320x640`, `390x844`, `412x915`, `740x360` x Terang/Gelap)
| Metrik | Sebelum (Tahap 18) | Sesudah (Tahap 19) |
|---|---|---|
| Ukuran wordmark (`svg.mt-wordmark`) | `94.09 x 22.5 px` | **`102.47 x 24.5 px`** (+2px tinggi, +8.38px lebar proporsional) |
| Jarak ke `.mt-actions` (`320x640` / `360x740` / `390x844` / `412x915`) | `77.91` / `117.91` / `147.91` / - px | **`69.53` / `109.53` / `139.53` / `161.53 px`** (`collidesActions: false`) |
| `overflow` wordmark & ruang halo | `hidden` | **`visible`**, margin atas `>= 40.75px`, kiri `14px` (nol pemotongan) |
| Pergeseran layout (`hdrDelta`, `mainJump`, `cardJump`, `overflowX`) | `0`, `0`, `0`, `false` | **`0`, `0`, `0`, `false`** di semua 10 konfigurasi |
| Idle (`light` / `dark`) | `rgb(253,254,254)`, `0` animasi | `rgb(253,254,254)` / `rgb(253,253,254)`, `wm.getAnimations({ subtree: true }) = 0`, `raf = false` |

### Fidelitas Font per Huruf vs `renkeu-topbar.html` (A2)
| Indeks | Huruf | IoU | Offset `(dx, dy)` px |
|---|---|---|---|
| 0 | `R` | `0.9259` | `(0, 0)` |
| 1 | `e` | `0.9168` | `(0, 0)` |
| 2 | `n` | `0.9115` | `(0, -1)` |
| 3 | `K` | **`0.9228`** | `(0, 0)` |
| 4 | `e` | `0.9218` | `(0, 0)` |
| 5 | `u` | `0.9167` | `(0, -1)` |

Semua 6 huruf (termasuk `K`) melebihi `0.91` (di atas ambang `0.88`).

### Pelacakan Kepala Cahaya vs `getPointAtLength` & Penurunan Luminans Ekor
| Target `P` | `P` aktual | Kontur aktif (`segFrac`) | Jarak kepala vs jalur (`headErrCssPx`) | `headMaxLum` | `maxLum` ekor (`0, 3, 8, 16, 28` unit di belakang) | Luminans depan abu-abu |
|---|---|---|---|---|---|---|
| `0.10` | `0.096` | `0` (`R` luar, `0.578`) | **`0.00 px`** | `1.000` | `1.000 -> 1.000 -> 0.989 -> 0.972 -> 0.944` | `0.324` |
| `0.30` | `0.298` | `2` (`e` luar, `0.338`) | **`0.00 px`** | `1.000` | `1.000 -> 1.000 -> 0.991 -> 0.964 -> 0.944` | `0.543` |
| `0.50` | `0.500` | `4` (`n`, `0.981`) | **`0.00 px`** | `1.000` | `1.000 -> 1.000 -> 0.996 -> 0.972 -> 0.952` | - (dekat ujung) |
| `0.70` | `0.702` | `5` (`K`, `0.732`) | **`0.50 px`** | `1.000` | `1.000 -> 1.000 -> 1.000 -> 0.996 -> 0.944` | `0.423` |
| `0.90` | `0.904` | `8` (`u`, `0.186`) | **`0.00 px`** | `1.000` | `1.000 -> 1.000 -> 0.989 -> 0.964 -> 0.961` | `0.276` |

### Tarikan Dua Arah, Refresh, Finale, & Reduced Motion
- **Dua arah (`20px` maju vs `40px -> mundur 20px`)**: `fwd20P = 0.3846`, `back20P = 0.3846` (`pEqual = true`), `meanChannelDiff = 0.521` (identik secara visual).
- **Lepas batal di `30px`**: kembali ke idle dalam `234ms`, `data-refreshing = null`, `aria-busy = null`, `haptics = []`, putih `rgb(253,254,254)`.
- **Commit PTR (`60px`) & Finale**: `ref = [on, off]`, `finale = [start, end]`, `haptics = [impact:LIGHT, impact:MEDIUM]`, total lokal `2870.1ms` (`finale 515.4ms`). Puncak kuning: `rgb(251, 223, 75)` (R dan G tinggi, B jauh lebih rendah); akhir putih: `rgb(253, 254, 254)`.
- **10x Re-tap per tab**: `rincian 2793.3ms`, `kas 2832.3ms`, `jadwal 2867.6ms` (semua tepat `1x on/off` dan `1x finale`).
- **Cloud lambat (`2600ms`)**: total `5300.4ms`, `sawLoopReset = true`, `1x finale`.
- **`pull()` macet 20 dtk**: berhenti otomatis di `20002.8ms`, `finCount = 0` (tanpa kuning), `stillActive = false`.
- **Reduced motion**: refresh abu-abu statis `rgb(131, 138, 148)`, `854.1ms`, `finCount = 0`, `raf = false`; tarikan jari tetap menggambar garis (`P = 0.5`) dan langsung idle saat dilepas.

### Performa (1x CPU vs 4x CPU Throttling via CDP)
| Kondisi CPU | Frame dalam 1 lintasan (`2200ms`) | FPS Rata-rata | Waktu Skrip / Frame | Penulisan Gaya / Frame |
|---|---|---|---|---|
| Normal (`rate = 1`) | `133` frame | **`60.5 fps`** | **`0.0496 ms`** | `6.06` properti/elemen |
| Throttle 4x (`rate = 4`) | `133` frame | **`60.5 fps`** | **`0.2767 ms`** | `6.06` properti/elemen |

Memenuhi target `>= 55 fps` pada throttle CPU 4x tanpa pengurangan lapisan ekor/halo.

## 5. Tabel Tes Lama -> Status -> Alasan

| Berkas Tes | Status | Alasan |
|---|---|---|
| `tests/schedule/tahap19_wordmark_stroke.test.js` | Baru (Lulus) | Mengunci `rkWmStrokeState`, `RK_WM_STROKES` (9 kontur), 5 lapisan aktif ekor/halo, ukuran `--wm-h: 24.5px`, `overflow: visible`, audit CSS menyeluruh (A1), A3 (`dist/tools/gen-wordmark-pacifico.js` absen), seluruh mekanisme drag/refresh/finale/non-sukses/reduced-motion, `sw.js >= v42`. |
| `tests/schedule/tahap18_wordmark_write.test.js` | Diperbarui ketat (Lulus) | Kontrak `rkWmFill`/`RK_WM_BOXES`/`clipPath`/`scaleY` diganti asersi setara untuk `rkWmStrokeState`/`RK_WM_STROKES`/`.mt-wm-drawn`/`strokeDashoffset`, `sw.js >= v42`, komentar usang A4 dibersihkan. |
| `tests/schedule/tahap17_wordmark_letters.test.js` | Diperbarui ketat (Lulus) | Kontrak `RK_WM_BOXES`/`scaleY`/`.mt-wm-lit` disesuaikan setara ke `RK_WM_STROKES`/`.mt-wm-drawn`/`strokeDashoffset` dan `sw.js >= v42`. |
| `tests/schedule/tahap16_refresh_indicator.test.js` | Diperbarui ketat (Lulus) | Jendela tunggu jam tiruan disesuaikan ke `RK_WM_PASS_MS = 2200` (`~2860ms` total siklus lokal) dan `sw.js >= v42`. |
| `tests/schedule/mobile_app_mode.test.js` | Diperbarui ketat (Lulus) | Baris 665 (`height: 22.5px`) diperbarui mengikuti butir 1 ke `height: var(--wm-h)` (`24.5px`). |
| 47 tes jadwal lainnya + 62 tes unit + 18 tes bot | Lulus tanpa ubah | Tidak ada regresi pada Desktop, core, skema (`RK_SCHEMA_VER = 3`), haptic, PTR, maupun bot. |

## 6. Risiko Yang Tersisa & Yang Tidak Dijalankan

- Belum dilakukan build APK Gradle / GitHub Actions dan belum diuji langsung pada perangkat Android fisik.
- Kelancaran rendering 9 path kontur + 5 lapisan `stroke-dasharray`/`stroke-dashoffset` pada beragam GPU/WebView Android nyata belum diuji (baru diuji via Chromium CDP desktop dengan CPU throttling 4x).
- Pengaturan "Hapus animasi" OS Android nyata, tombol Back hardware saat sedang menarik/refresh, serta rotasi fisik potret <-> lanskap pada perangkat nyata belum diuji.
- Belum dilakukan `git commit`, `git push`, ataupun penghapusan `node_modules` dari indeks Git.

## 7. Checklist Uji Manual di HP

1. Periksa ukuran wordmark `RenKeu`: tampil lebih besar (+2pt, memanjang proporsional) dan tidak bertabrakan dengan tombol di sisi kanan topbar.
2. Tarik layar pelan ke bawah tanpa melepas: pastikan garis putih menyala menyusuri lekukan huruf `R -> e -> n -> K -> e -> u`, kepala berpijar dengan ekor memudar halus, tanpa jeda antarhuruf.
3. Kembalikan jari ke atas sebelum melepas: pastikan garis dan kepala cahaya mundur mulus kembali ke huruf awal.
4. Lepas di bawah ambang: garis kembali mulus ke awal lalu wordmark memudar ke putih tanpa refresh dan tanpa getaran.
5. Lepas di atas ambang: wordmark berubah abu-abu, garis menulis kontinu dari awal sampai akhir, kilat kuning singkat, lalu kembali putih penuh.
6. Re-tap cepat berulang pada tiap tab aktif (Rincian, Transaksi, Jadwal): garis tidak melompat restart ke awal, finale kuning hanya 1x.
7. Uji Mode Lokal, sinkron cloud lambat (mengulang lintasan sampai sinkron selesai lalu kilat kuning), dan koneksi putus/mode pesawat (kembali putih tanpa kuning).
8. Uji mode gelap, orientasi lanskap, pengaturan animasi sistem Android dimatikan (refresh abu-abu statis, tarikan jari tetap menggambar garis), serta pastikan aplikasi tidak terasa berat/panas saat diam.
9. Evaluasi subjektif: catat apakah bentuk garis yang menyusuri tepi kontur huruf sudah terasa seperti "menulis" sesuai harapan, atau apakah tahap berikutnya perlu jalur garis tengah huruf (single-stroke centerline).

## 8. Peta Kode Terbaru

| Komponen | Berkas & Baris |
|---|---|
| Generator outline + 9 kontur stroke Pacifico | `tools/gen-wordmark-pacifico.js` |
| Pengecualian `gen-wordmark-pacifico.js` dari `dist/tools/` (A3) | `build.js` (L38-49, L91) |
| Konstanta `RK_WM_VIEWBOX`, `RK_WM_GLYPHS`, `RK_WM_STROKES`, `RK_WM_SEGS`, `rkWmStrokeState`, `mobWordmarkSvgHtml` | `js/ui-mobile/mobile-app.js` (L741-846) |
| Konstanta lintasan (`RK_WM_PASS_MS = 2200`, `RK_WM_TRAIL_SPECS`) & penulis stroke efisien (`getWmStrokeNodes`, `applyWmProgress`, `wmTick`) | `js/ui-mobile/mobile-app.js` (L4172-4458) |
| Handler drag/return & pintu tunggal (`updateWmDrag`, `startWmReturn`, `forceStopRefreshIndicator`, `rkSetRefreshIndicator`) | `js/ui-mobile/mobile-app.js` (L4460-4588) |
| Token ukuran & warna glow (`--wm-h`, `--wm-dead`, `--wm-lit`, `--wm-flash`, `--wm-trail`, `--wm-glow`, `--wm-glow-soft`, `--dur-wm-*`) | `css/tokens.css` (L230-241, L516-519) |
| Gaya wordmark, `.mt-wm-strokes`, `.mt-wm-drawn`, `.mt-wm-halo-*`, `.mt-wm-tail-*`, `.mt-wm-head`, `prefers-reduced-motion` | `css/mobile.css` (L279-396) |
| Service Worker Cache (`rk-cache-v42`) | `sw.js` (L4) |
| Tes baru Tahap 19 (termasuk audit CSS A1 & A3) | `tests/schedule/tahap19_wordmark_stroke.test.js` |

---

## Catatan Pembaruan APK

Perubahan ini hanya sampai ke HP setelah: commit + push ke main -> GitHub Actions Android Debug APK selesai (rilis apk-latest memuat nomor run baru) -> di aplikasi: Pengaturan -> Pembaruan Aplikasi -> Cek pembaruan -> Unduh & pasang.
