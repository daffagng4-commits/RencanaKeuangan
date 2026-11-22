# Laporan Tahap 19b: Penyempurnaan UX Mode APK (Kecepatan Line Drawing, PTR Bar Atas Rincian, Kalender Seragam, Perlebar Grafik + Haptic, & Force Update)

Status: Selesai. Seluruh pengujian otomatis dan verifikasi visual Chrome CDP lulus. Belum di-commit atau push.

## 1. Ringkasan 5 Perubahan & Keputusan Desain Final

Seluruh perubahan diterapkan khusus untuk Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`). Desktop/Browser Mode (`css/desktop.css`), `package.json`, `package-lock.json`, `android/`, `bot/`, `.github/`, `js/core/`, dan `RK_SCHEMA_VER = 3` tidak berubah.

### 1. Animasi Line Drawing Wordmark Dipercepat Sedikit
- `RK_WM_PASS_MS` di `js/ui-mobile/mobile-app.js` dipercepat dari `2200 ms` menjadi **`1750 ms`** (~20% lebih cepat). Seluruh 9 jalur centerline (`R -> e -> n -> K -> e -> u`) tetap terbaca jelas tanpa menghilangkan efek kepala cahaya maupun finale kuning.

### 2. Pull-to-Refresh Khusus Tab Home/Rincian (Hilangkan Lingkaran Muter + Tarik Bar Atas Sinkron)
- **Lingkaran panah `#m-ptr-ind` dihilangkan khusus di tab `rincian`**: CSS menyetel `.mob-shell[data-mtab-active="rincian"] .m-ptr-ind { display: none !important; }` dan JS tidak menggerakkan `#m-ptr-ind` saat aktif di tab `rincian`. Pada tab selain `rincian` (`kas`, `jadwal`, dll.), `#m-ptr-ind` tetap berfungsi normal.
- **Bar atas biru ikut ketarik dan sinkron turun-naik 1:1**:
  - `setRincianHdrPull(pullY, mode)` menyetel variabel CSS `--ptr-hdr-y` (`min(64, max(0, pullY * 0.72))`) pada `.mob-shell` saat jari menarik turun.
  - `.apk-header-block` dan `.mob-main` bergerak serempak menggunakan `transform: translate3d(0, var(--ptr-hdr-y, 0px), 0)` (GPU compositor-only, nol layout shift).
  - Pseudo-element `.mob-shell[data-mtab-active="rincian"]::before` setinggi `84px` pada `z-index: 59` dengan warna `var(--mob-hdr-top)` mengisi ruang atas tepat di belakang header saat tertarik sehingga tidak pernah muncul celah putih di tepi atas layar.
  - Saat jari digerakkan balik dari tarik turun kembali ke atas sebelum dilepas (`dy` mengecil hingga `<= 0`), `--ptr-hdr-y` langsung ikut turun real-time 1:1 ke `0.0px` selaras dengan mundurnya garis wordmark `RenKeu`.
  - Saat jari dilepas, kelas `.is-ptr-snapping` memantulkan bar atas kembali ke `0px` dalam `280ms` (`--ease-spring`, dinonaktifkan pada `prefers-reduced-motion: reduce`), lalu seluruh properti transform dibersihkan agar tidak meninggalkan containing block saat idle.

### 3. Penyeragaman Kalender Mode Perjalanan dengan Mode Keuangan
- Seluruh 5 input tanggal Mode Perjalanan (`m-kp-start`, `m-kp-end` pada form Perjalanan Baru/Edit; `m-it-day` pada Itinerary; `m-bk-start`, `m-bk-end` pada Pemesanan) disamakan cara muncul dan tampilannya dengan 2 kalender Mode Keuangan (`m-kas-date`, `m-item-start`): seluruhnya memakai **popover melayang `.picker-popover`** (`292 x 286 px`, radius `14px`, navigasi bulan `‹ / ›`, grid 7 kolom, badge `Hari Ini`).
- Helper `mobPositionCalPopover()` memportal popover ke `.mob-shell` dengan `position: fixed; z-index: 230;` (`is-cal-portal`) serta clamp terhadap tepi viewport dan flip otomatis ke atas bila ruang bawah sempit, sehingga kalender di dalam bottom sheet `#m-sheet-trip` maupun di tepi layar tidak pernah terpotong.
- Validasi tetap utuh: `m-kp-end` tetap menonaktifkan tanggal sebelum `m-kp-start`, `m-it-day`/`m-bk-start`/`m-bk-end` tetap menonaktifkan tanggal di luar rentang perjalanan, serta `Esc`, klik luar, penutupan sheet, dan tombol Back Android menutup popover lebih dulu sebelum menutup `#m-sheet-trip`.

### 4. Card Proyeksi Arus Kas: Hapus Fitur "Perbesar", Ganti "Perlebar" + Haptic Feedback
- Tombol pada card Proyeksi Arus Kas (`#m-btn-expand-cf`) diubah labelnya dari `⤢ Perbesar` menjadi **`Perlebar`** dengan ikon SVG 13px rapi (`m-cf-expand-btn`).
- Tombol toggle redundan `#m-cf-zoom-wide` (`🔍 Perlebar`) di dalam `#m-sheet-cf-zoom` dihapus. Mengetuk `Perlebar` langsung membuka grafik dalam mode lebar penuh (`is-zoom-wide`, `viewBox="0 0 920 340"`) dengan segmen mode sentuh `Garis` / `Geser` langsung aktif.
- **Haptic feedback ditambahkan** pada grafik Perlebar dan slider-nya agar sama dengan grafik utama di card Proyeksi Arus Kas:
  - `brRenderCashflowInto()` (`js/ui/browser-app.js`) meneruskan metadata `{ nearIdx, allowHaptic }` ke callback opsional `opts.onScrub` (nol perubahan pada Desktop/Browser Mode).
  - Menyentuh/menggeser antar titik pada grafik Perlebar maupun mengetuk pin memicu `rkHaptic('tick')`; hover mouse pasif tidak memicu haptic.
  - `#m-cf-zoom-scrub` diberi `data-haptic="slider"` sehingga menggeser slider memicu `rkHaptic('tick')` per langkah dan `rkHaptic('edge')` di ujung `0`/`100`, tanpa memicu haptic saat nilai diperbarui programatik.

### 5. Pop up Force Update (APK Debug Hijau)
- **Aturan pemicu (Kondisi a & b)**:
  - `rkCheckForceUpdateOnColdStart()` dipanggil tepat 1x pada cold start di `ensureMobileShell()` (delay `400ms`), khusus native Capacitor APK build CI (`rkIsCapacitorNative() && !meta.isDev`), dan **melewati jeda 6 jam** `RK_UPDATE_INTERVAL_MS` agar build hijau terbaru langsung terdeteksi saat APK dibuka (Kondisi a).
  - Pemeriksaan update biasa saat APK sudah terbuka (`rkCheckApkUpdate` manual di Pengaturan atau `rkAutoCheckApkUpdate` tanpa `fromColdStart: true`) **tidak pernah** memunculkan pop up force update (Kondisi b), sehingga pengguna tidak terganggu di tengah sesi hingga menutup dan membuka ulang APK.
  - Saat offline atau build dev lokal, pop up tidak muncul.
- **Desain & isi pop up (`#m-force-upd-backdrop` / `#m-fupd-dialog`)**:
  - Dialog terpusat di tengah layar (`role="alertdialog"`, `aria-modal="true"`, `z-index: 950`), mendukung tema terang & gelap, menampilkan ikon unduh SVG, judul **Pembaruan Wajib Tersedia**, perbandingan `Terpasang (build X)` vs `Terbaru (build Y)`, waktu rilis, dan ringkasan catatan rilis.
  - Tidak dapat ditutup melalui klik backdrop, tombol `Esc`, maupun tombol Back Android.
- **Aksi 2 tombol**:
  - **`Tidak` (`#m-fupd-no`)**: memanggil `rkForceCloseApk()` -> `Capacitor.Plugins.App.exitApp()` untuk force close aplikasi.
  - **`Update` (`#m-fupd-yes`)**: menutup pop up, menyembunyikan notifikasi dalam aplikasi (`#m-os-notif`), berpindah ke tab `settings`, menyalakan mode kunci `body[data-force-update-lock="1"]` (seluruh tombol luar, topbar, bottom navbar, scroll, tab lain, PTR, `Esc`, dan Back Android dikunci; hanya card `#m-card-settings-update` yang tampil penuh di atas layar dengan banner pembaruan wajib), lalu **langsung memulai `rkInstallApkInApp()` secara otomatis**.

## 2. Daftar Berkas Diubah

- `js/ui-mobile/mobile-app.js`: percepatan `RK_WM_PASS_MS = 1750`, PTR tarik bar atas Rincian (`setRincianHdrPull`), portal penyeragaman `.picker-popover` (`mobPositionCalPopover`, `mobCloseCalPopover`, `mobCloseAllCalPopovers`), penghapusan Perbesar -> Perlebar langsung lebar + haptic, dan sistem Force Update cold start + UI lock (`rkCheckForceUpdateOnColdStart`, `rkShowForceUpdatePopup`, `rkEnterForceUpdateLock`, `rkForceCloseApk`).
- `js/ui/browser-app.js`: meneruskan `{ nearIdx, allowHaptic }` serta `onScrubStart`/`onScrubEnd` pada `brRenderCashflowInto()` (opsional non-breaking, Desktop tidak berubah).
- `css/mobile.css`: sembunyikan `.m-ptr-ind` di `rincian`, penyambung biru `::before` & transform `--ptr-hdr-y` + snap-back, `.picker-popover.is-cal-portal`, `.m-cf-expand-btn`, gaya dialog `.m-fupd-backdrop`/`.m-fupd-dialog`, dan aturan kunci `body[data-force-update-lock="1"]`.
- `sw.js` & `dist/sw.js`: `CACHE_NAME` dinaikkan ke `'rk-cache-v44'`.
- `index.html` & `dist/index.html`: hasil `npm run build` (`1715 KB`, `41` file JS).
- `tests/schedule/tahap19b_apk_refinements.test.js`: suite TDD baru untuk seluruh 5 poin Tahap 19b.
- `tests/schedule/mobile_app_mode.test.js`, `tahap13_fix.test.js`, `tahap15_menu_haptic.test.js`, `tahap19_wordmark_stroke.test.js`: diselaraskan ketat ke kontrak baru Tahap 19b.
- `docs/superpowers/plans/2026-11-22-tahap19b-ux-refinements.md`: rencana kerja Tahap 19b.
- `laporan tahap 19b.md`: laporan ini.

## 3. Hasil Pengujian & Status Git

- `npm test` (exit `0`):
  - `build.js`: `index.html + dist/index.html` (`1715 KB, 41 file js`).
  - `check-bundle.js`: `55` skrip valid, sinkron dengan sumber.
  - `run-unit.js`: **62/62 lulus** (`1636.0 ms`).
  - `run-schedule.js`: **54/54 lulus** (termasuk `tahap19b_apk_refinements.test.js` dan seluruh tes regresi).
- `npm run test:bot` (exit `0`): **18/18 lulus** (`495.2 ms`).
- `git diff -- package.json package-lock.json css/desktop.css android/ bot/ .github/ js/core/`: **kosong (0 perubahan)**.

## 4. Verifikasi Nyata Chrome CDP (360x740 Mobile Touch, Light & Dark)

Bukti tangkapan layar PNG dan `metrics-tahap19b.json` tersimpan di luar repo pada `C:\Users\daffa\Documents\verif-tahap19b\`. `pageErrors: []` (0 error).

| Aspek | Hasil Terukur di Chrome CDP |
|---|---|
| Kecepatan line drawing wordmark | `RK_WM_PASS_MS = 1750 ms` |
| PTR tab Rincian (`ptr-rincian-down.png`, `ptr-rincian-back.png`) | `#m-ptr-ind` `display: none`; header `top`: `0 px` -> tarik turun `43.2 px` (`mainTop`: `274.25 -> 317.45 px`) -> dorong balik ke atas `14.4 px` (`mainTop`: `288.65 px`) -> balik ke `0 px`; tanpa celah putih di tepi atas |
| Penyeragaman kalender (`cal-keuangan.png`, `cal-trip-sheet.png`, `cal-trip-itin.png`) | Ukuran & radius identik (`292 x 286 px`, `border-radius: 14px`) pada Keuangan (`m-kas-date`), Sheet Perjalanan (`m-kp-start`, `portal: true`, `clipped: false`), dan Itinerary (`m-it-day`, `clipped: false`) |
| Card Proyeksi Arus Kas (`card-proyeksi-perlebar.png`, `sheet-proyeksi-wide.png`) | Tombol `#m-btn-expand-cf` bertuliskan `Perlebar`; sheet langsung terbuka lebar (`is-zoom-wide`, `viewBox="0 0 920 340"`), `#m-cf-zoom-wide` absen, segmen `Garis`/`Geser` tampil, `#m-cf-zoom-scrub` memiliki `data-haptic="slider"` |
| Pop up Force Update (`force-update-popup-light.png`, `force-update-popup-dark.png`) | Terpusat tepat (`centeredX: true`, `centeredY: true`), ukuran `328 x 382 px`, tinggi tombol `Tidak` & `Update` masing-masing `44 px`, `overflowX: false` |
| Mode Kunci Update (`force-update-locked.png`) | `data-force-update-lock="1"`, tab `settings`, hanya `#m-card-settings-update` yang terlihat (`cardTop: 70 px`, `cardBottom: 419 px`, `otherSettingsCardsVisible: 0`), bottom nav `pointer-events: none`, `.mob-main` `overflow-y: hidden`, progress bar unduh otomatis aktif, `.m-ptr-ind` & `.phone-os-notif` tersembunyi bersih |

## 5. Tabel Tes -> Status -> Alasan

| Berkas Tes | Status | Alasan |
|---|---|---|
| `tests/schedule/tahap19b_apk_refinements.test.js` | Baru (Lulus) | Mengunci seluruh 5 poin Tahap 19b: `RK_WM_PASS_MS = 1750`, PTR Rincian tanpa lingkaran + sinkron tarik turun-naik, 5 kalender Mode Perjalanan seragam `.picker-popover`, tombol `Perlebar` langsung wide + haptic grafik & slider, serta Force Update Kondisi (a)/(b), force close `exitApp`, dan kunci total UI. |
| `tests/schedule/tahap19_wordmark_stroke.test.js` | Diperbarui ketat (Lulus) | Rentang asersi `RK_WM_PASS_MS` diselaraskan dari `2000..2400` ke `1600..2000` mengikuti percepatan `1750ms`. |
| `tests/schedule/tahap15_menu_haptic.test.js` | Diperbarui ketat (Lulus) | Daftar opt-in `data-haptic="slider"` diperbarui menyertakan `#m-cf-zoom-scrub` (tetap mengunci nol haptic pada perubahan nilai programatik). |
| `tests/schedule/tahap13_fix.test.js` | Diperbarui ketat (Lulus) | Seksi kalender Mode Perjalanan diselaraskan dari bottom sheet `#m-cal-sheet-backdrop` ke popover seragam `.picker-popover.open` dengan seluruh cek minDate, rentang trip, Esc, dan Android Back tetap aktif. |
| `tests/schedule/mobile_app_mode.test.js` | Diperbarui ketat (Lulus) | Diselaraskan untuk: klik `#m-btn-expand-cf` langsung mode lebar (`920x340`, tanpa `#m-cf-zoom-wide`), tarik pendek Rincian memakai `.is-ptr-snapping`, dan kalender trip memakai `.picker-popover.open`. |
| 49 tes jadwal lainnya + 62 tes unit + 18 tes bot | Lulus tanpa ubah | Nol regresi pada Desktop, core, `RK_SCHEMA_VER = 3`, maupun bot. |

## 6. Risiko Yang Tersisa & Yang Tidak Dijalankan

- Belum dilakukan build APK Gradle / GitHub Actions dan belum diuji langsung di HP Android fisik (termasuk verifikasi `Capacitor.Plugins.App.exitApp()` nyata dan transisi cold start Android OS).
- Pada Android fisik, jika pengguna menaruh aplikasi di latar belakang (recent apps) tanpa menutup paksa (swipe away), proses WebView tetap hidup sehingga pop up Force Update baru akan muncul setelah APK benar-benar ditutup dan dibuka ulang (sesuai Kondisi b).
- Belum dilakukan `git commit` ataupun `git push`.

## 7. Checklist Uji Manual di HP

1. Tarik layar di tab Home/Rincian: pastikan lingkaran bulat panah tidak muncul, bar biru atas + saldo ikut ketarik turun mulus tanpa celah putih di atas, dan saat jari didorong balik ke atas bar biru naik sinkron mengikuti jari bersama garis wordmark `RenKeu`.
2. Lepas tarik di atas ambang: pastikan animasi line drawing wordmark terasa sedikit lebih cepat namun tetap halus di dalam badan huruf.
3. Buka Mode Perjalanan -> Perjalanan Baru (Mulai/Selesai), Itinerary (Tanggal), dan Pemesanan (Check-in/Check-out): pastikan semua kalender muncul melayang dengan desain sama persis seperti kalender di Mode Keuangan, tidak terpotong, dan tetap membatasi rentang tanggal perjalanan.
4. Di card Proyeksi Arus Kas: pastikan tombol bertuliskan `Perlebar` (bukan `Perbesar`), mengetuknya langsung membuka grafik lebar tanpa tombol Perlebar lagi di dalamnya, dan menggeser grafik maupun slider memicu getaran haptic halus.
5. Setelah build debug baru hijau di GitHub Actions:
   - Bila APK sedang terbuka, pastikan pop up tidak muncul mengganggu.
   - Tutup paksa APK lalu buka kembali: pastikan pop up `Pembaruan Wajib Tersedia` muncul di tengah layar, tidak bisa ditutup klik luar/Back; tombol `Tidak` langsung menutup aplikasi, sedangkan tombol `Update` langsung mengarahkan ke card Pembaruan Aplikasi, mengunci semua tombol/scroll lain, dan otomatis memulai unduhan APK.

---

## Catatan Pembaruan APK

Perubahan ini hanya sampai ke HP setelah: commit + push ke main -> GitHub Actions Android Debug APK selesai (rilis apk-latest memuat nomor run baru) -> di aplikasi: Pengaturan -> Pembaruan Aplikasi -> Cek pembaruan -> Unduh & pasang.
