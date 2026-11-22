# Tahap 19b: Penyempurnaan UX Mode APK (Wordmark Speed, PTR Header Pull Rincian, Kalender Seragam, Perlebar Grafik + Haptic, Force Update)

> **For agentic workers:** Executing inline in this session with TDD (`test-driven-development`), `systematic-debugging`, `antislop` (during mode), `impeccable` craft floor, and `verification-before-completion`.

**Goal:** Menerapkan 5 penyempurnaan UX khusus Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`) tanpa mengubah Desktop/Browser Mode, `package.json`, `js/core/`, `RK_SCHEMA_VER = 3`, `android/`, `bot/`, maupun `.github/`.

**Architecture:** Semua perubahan berada pada `js/ui-mobile/mobile-app.js`, hook opsional non-breaking pada `js/ui/browser-app.js` (`brRenderCashflowInto` hanya meneruskan metadata `nearIdx`/`allowHaptic` ke `opts.onScrub`), `css/mobile.css`, dan bump cache `sw.js` (`rk-cache-v44`). Verifikasi memakai suite TDD baru `tests/schedule/tahap19b_apk_refinements.test.js`, pembaruan ketat tes terdampak, `npm test`, `npm run test:bot`, dan verifikasi nyata Chrome CDP.

**Tech Stack:** Vanilla HTML/CSS/JS, Capacitor Android JS bridge (`Capacitor.Plugins.App`, `Filesystem`, `ApkInstaller`, `Haptics`), JSDOM Node tests, Chrome CDP.

## Global Constraints
- Hanya Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`). Desktop (`css/desktop.css`) tidak berubah.
- Tidak mengubah `package.json`, `package-lock.json`, `android/`, `bot/`, `.github/`, `js/core/`, `RK_SCHEMA_VER = 3`.
- Audit CSS Tahap 19 A1 harus tetap lulus: nol literal hex baru pada aturan wordmark, nol `<filter>`/`feGaussianBlur`, nol `animation: infinite` baru pada wordmark/header/popup.
- `sw.js` & `dist/sw.js` dinaikkan ke `'rk-cache-v44'`.
- Laporan akhir disimpan sebagai `laporan tahap 19b.md` di root repo; belum commit/push.

## Review Focus
1. PTR Rincian saat jari ditarik ke bawah lalu didorong balik ke atas melampaui `startY` (`dy <= 0`): bar atas `.apk-header-block` dan `.mob-main` harus turun mulus kembali ke `0px` bersama wordmark, tanpa loncatan atau celah putih di tepi atas layar, dan melepas di `< PULL_TRIG` tidak memicu refresh.
2. Kalender Mode Perjalanan (`m-kp-start`, `m-kp-end`) di dalam `#m-sheet-trip .ms-body`: portal popover melayang `.picker-popover.is-cal-portal` tidak terpotong oleh `overflow: hidden`/`transform` milik `.modal-sheet`, tetap menutup pada klik luar, `Esc`, Android Back (sebelum menutup `#m-sheet-trip`), dan saat `#m-sheet-trip` ditutup.
3. Haptic pada grafik Perlebar: hanya bergetar saat disentuh/digeser (pointerdown/touchstart/touchmove/pin/slider drag), tidak bergetar saat hover mouse pasif atau pembaruan slider programatik.
4. Force Update Kondisi (b) vs (a): cek manual di Pengaturan atau saat APK sudah terbuka tidak pernah memunculkan popup force update; hanya cold start (`fromColdStart: true`) pada native APK build CI (`!meta.isDev`) yang memunculkan popup bila `parsed.run > meta.run`.
5. Force Update Lock (`data-force-update-lock="1"`): setelah klik `Update`, hanya `#m-card-settings-update` yang dapat disentuh; topbar, bottom nav, tab lain, PTR, scroll, `Esc`, dan tombol Back Android terkunci total, sementara `rkInstallApkInApp()` langsung berjalan otomatis.

---

### Task 1: Percepat Animasi Line Drawing Wordmark (`RK_WM_PASS_MS = 1750`)
**Files:**
- Modify: `js/ui-mobile/mobile-app.js` (`RK_WM_PASS_MS`)
- Test: `tests/schedule/tahap19b_apk_refinements.test.js`, `tests/schedule/tahap19_wordmark_stroke.test.js`

- [ ] **Step 1:** Tulis tes gagal di `tests/schedule/tahap19b_apk_refinements.test.js` yang memastikan `RK_WM_PASS_MS === 1750` (lebih cepat dari `2200`, tetap nyaman `1600..1900`).
- [ ] **Step 2:** Ubah `RK_WM_PASS_MS = 2200` menjadi `RK_WM_PASS_MS = 1750` di `js/ui-mobile/mobile-app.js` dan selaraskan rentang pada `tests/schedule/tahap19_wordmark_stroke.test.js`.

### Task 2: PTR Khusus Tab Rincian — Hilangkan Lingkaran Muter + Tarik Bar Atas Sinkron Naik-Turun
**Files:**
- Modify: `js/ui-mobile/mobile-app.js` (`bindMobPullToRefresh`, `switchMobileTab`)
- Modify: `css/mobile.css` (`.mob-shell[data-mtab-active="rincian"] .m-ptr-ind`, `::before` pengisi biru atas, `--ptr-hdr-y` pada `.apk-header-block` & `.mob-main`, `.is-ptr-snapping`, reduced-motion)
- Test: `tests/schedule/tahap19b_apk_refinements.test.js`, `tests/schedule/mobile_app_mode.test.js`, `tests/schedule/tahap16_refresh_indicator.test.js`

- [ ] **Step 1:** Tulis tes gagal: di tab `rincian`, `#m-ptr-ind` disembunyikan (CSS `display: none` & tidak dianimasikan JS), tarik turun menyetel `data-ptr-pull="1"` dan `--ptr-hdr-y > 0px` pada `.mob-shell`, tarik balik ke atas mengurangi `--ptr-hdr-y` sinkron hingga `0.0px`, dan lepas memberi `.is-ptr-snapping` lalu kembali `0px`. Di tab `kas`/`jadwal`, `#m-ptr-ind` tetap bekerja normal.
- [ ] **Step 2:** Implementasikan `setRincianHdrPull(pullY, snapCls)` di `bindMobPullToRefresh()` + aturan CSS GPU-only (`translate3d` + `::before` warna `var(--mob-hdr-top)` setinggi `84px` pada `z-index: 59`).

### Task 3: Seragamkan 5 Kalender Mode Perjalanan dengan Mode Keuangan (Popover Melayang `.picker-popover`)
**Files:**
- Modify: `js/ui-mobile/mobile-app.js` (`mobDateFieldHtml`, `mobPositionCalPopover`, `mobCloseAllCalPopovers`, 5 pemanggilan Mode Perjalanan `m-kp-start`, `m-kp-end`, `m-it-day`, `m-bk-start`, `m-bk-end`, `rkHandleAndroidBack`, `mobCloseSheet`)
- Modify: `css/mobile.css` (`.picker-popover.is-cal-portal` fixed positioning z-index `230` di atas `.modal-sheet`)
- Test: `tests/schedule/tahap19b_apk_refinements.test.js`, `tests/schedule/tahap13_fix.test.js`, `tests/schedule/mobile_app_mode.test.js`

- [ ] **Step 1:** Tulis tes gagal: semua 5 input tanggal Mode Perjalanan tidak memakai `data-pk-sheet`, klik trigger membuka `#<id>-cal.picker-popover.open` (identik Mode Keuangan), tetap mengunci rentang trip (`m-it-day`, `m-bk-start`, `m-bk-end`) & `minDate` (`m-kp-end >= m-kp-start`), menutup pada klik luar / `Esc` / Android Back sebelum menutup `#m-sheet-trip`.
- [ ] **Step 2:** Implementasikan penyeragaman `.picker-popover` + portal aman `mobOpenCalPopover(cid, trigEl)` agar popover di dalam `#m-sheet-trip` maupun di pinggir layar selalu menempel ke trigger dan ter-clamp aman di dalam viewport.

### Task 4: Card Proyeksi Arus Kas — Hapus Perbesar, Ganti Perlebar + Haptic Feedback
**Files:**
- Modify: `js/ui-mobile/mobile-app.js` (`mobShellTemplate`, `renderMobCashflowZoom`, event handler `#m-btn-expand-cf`, hapus `#m-cf-zoom-wide`)
- Modify: `js/ui/browser-app.js` (`brRenderCashflowInto` meneruskan `{ nearIdx, allowHaptic }` ke `opts.onScrub` tanpa mengubah perilaku Desktop)
- Test: `tests/schedule/tahap19b_apk_refinements.test.js`, `tests/schedule/mobile_app_mode.test.js`, `tests/schedule/tahap15_menu_haptic.test.js`

- [ ] **Step 1:** Tulis tes gagal: tombol `#m-btn-expand-cf` berlabel `Perlebar` (bukan `Perbesar`), klik langsung membuka `#m-sheet-cf-zoom` dalam mode lebar (`is-zoom-wide`, `viewBox="0 0 920 340"`), tombol `#m-cf-zoom-wide` sudah dihapus, `#m-cf-zoom-touch-seg` langsung tampil, dan menyentuh/menggeser grafik zoom maupun `#m-cf-zoom-scrub` memicu `rkHaptic('tick')` / `rkHaptic('edge')` (tetapi hover mouse pasif tidak memicu haptic).
- [ ] **Step 2:** Implementasikan perubahan markup, render wide default, dan integrasi haptic.

### Task 5: Pop up Force Update (APK Debug Hijau, Cold Start Only, Lock UI + Auto Download, Force Close)
**Files:**
- Modify: `js/ui-mobile/mobile-app.js` (markup `#m-force-upd-backdrop`, `rkCheckForceUpdateOnColdStart`, `rkShowForceUpdatePopup`, `rkEnterForceUpdateLock`, `rkForceCloseApk`, capture-phase UI lock & guards di `switchMobileTab`, `rkHandleAndroidBack`, PTR)
- Modify: `css/mobile.css` (gaya centered dialog `#m-force-upd-backdrop` & `.m-fupd-dialog`, aturan `body[data-force-update-lock="1"]` mengunci topbar, bottom nav, scroll, dan menyembunyikan sibling non-update agar `#m-card-settings-update` fokus penuh)
- Modify: `sw.js` (`rk-cache-v44`)
- Test: `tests/schedule/tahap19b_apk_refinements.test.js`

- [ ] **Step 1:** Tulis tes gagal menguji:
  - Kondisi (a): cold start native APK (`meta.run = 9`, rilis `run = 12`) -> bypass jeda 6 jam -> memunculkan `#m-force-upd-backdrop.open` di tengah layar dengan info build `9` -> `12`, tombol `Tidak` & `Update`. Klik backdrop / `Esc` / Android Back tidak menutup popup.
  - Kondisi (b): cek update saat APK sudah terbuka (`fromColdStart` false / `rkCheckApkUpdate` / `rkAutoCheckApkUpdate`) -> TIDAK memunculkan popup force update.
  - Dev build (`meta.isDev = true`) / bukan Capacitor native -> TIDAK memunculkan popup.
  - Tombol `Tidak`: memanggil `Capacitor.Plugins.App.exitApp()`.
  - Tombol `Update`: menutup popup, pindah ke `settings`, menyalakan `body[data-force-update-lock="1"]`, langsung memulai `rkInstallApkInApp()`, mengunci perpindahan tab / klik luar `#m-card-settings-update` / PTR / Android Back, sementara tombol di dalam `#m-card-settings-update` tetap bisa diklik.
- [ ] **Step 2:** Implementasikan seluruh mekanisme Force Update + CSS + `sw.js` `rk-cache-v44`.

### Task 6: Build, Full Test Suite, Verifikasi Nyata Chrome CDP, & Laporan `laporan tahap 19b.md`
- [ ] Jalankan `npm test` (build + bundle check + unit + seluruh schedule test) dan `npm run test:bot`.
- [ ] Jalankan skrip verifikasi Chrome CDP nyata pada `C:\Users\daffa\Documents\verif-tahap19b\` (screenshot & metrik: PTR Rincian tarik turun + tarik balik ke atas, kalender Mode Perjalanan vs Mode Keuangan termasuk di dalam `#m-sheet-trip`, card Proyeksi Arus Kas tombol Perlebar + sheet wide + haptic, popup Force Update & mode kunci Pengaturan di light/dark & multi-viewport).
- [ ] Verifikasi `git diff` Desktop/core/native/`package.json` kosong.
- [ ] Tulis `laporan tahap 19b.md` di root repo (tanpa commit/push).
