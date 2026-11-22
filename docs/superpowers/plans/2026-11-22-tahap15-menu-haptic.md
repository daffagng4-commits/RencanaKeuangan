# Tahap 15: Perbaikan Tombol Menu, Haptic Feedback, Re-tap Tab, & Penutup Kekurangan Tahap 14 (Mode APK)

> **Ruang lingkup**: Hanya Mode APK (`#mobile-app-shell`, `body[data-shell="mobile-app"]`) + pemasangan dependensi native `@capacitor/haptics` (`package.json`, `package-lock.json`, berkas `cap sync` di `android/`, izin `VIBRATE` di `AndroidManifest.xml`). Desktop / Browser Mode tidak berubah.

## 1. Temuan Diagnosis C0 & Akar Masalah Bug Menu

### Akar masalah bug tombol Menu (`#m-btn-more` / `#m-sheet-more`)
Reproduksi di jsdom dan Chrome CDP (`360x740`, klik sungguhan `Input.dispatchMouseEvent` / `Input.dispatchTouchEvent`) membuktikan **3 cacat nyata**:
1. **Utama — Tutup lewat klik scrim memasang `hidden = true` permanen**:
   - Pada klik sungguhan di area scrim `#m-sheet-more.modal-backdrop`, `js/ui/dom.js` (`mousedown` -> `click`) menangkap gelembung event karena handler `#mobile-app-shell` di `js/ui-mobile/mobile-app.js:4466-4467` memanggil `mobCloseSheet(bd.id)` tanpa `e.stopPropagation()`.
   - `dom.js` kemudian memanggil `closeBackdropEl(e.target)` -> `brCloseModal('m-sheet-more')`, yang menetapkan `el.hidden = true`.
   - `css/mobile.css:3595` menetapkan `body[data-shell="mobile-app"] #mobile-app-shell [hidden] { display: none !important; }`, sedangkan `mobOpenSheet(id)` tidak pernah melepas atribut `hidden`. Akibatnya ketukan Menu ke-2 menambah `.open` namun sheet tetap `display: none` (`0×0`), dan `.modal-backdrop.open` yang tersembunyi turut memblokir `hasOpenOverlay()` pada PTR.
2. **Sekunder — Timer anonim pada drag-to-dismiss (`finishSheetDrag`)**:
   - `finishSheetDrag` di `js/ui-mobile/mobile-app.js:4337-4359` membiarkan kelas `.open` (`pointer-events: auto; z-index: 160`) selama `250ms` dalam `setTimeout` anonim yang tidak disimpan ke `st.bd._mCloseT`.
   - Selama jendela `250ms`, backdrop menutup `#m-btn-more` (`elementFromPoint` mengenai backdrop), dan jika dibuka ulang sebelum `250ms`, timer lama tetap mengeksekusi `classList.remove('open', 'is-closing')` sehingga menutup sheet yang baru dibuka.
3. **Tersier — Pilih "Tema Tampilan" (`#m-menu-theme`) tidak menutup sheet + view transition menyerap klik**:
   - Handler `#m-menu-theme` (`js/ui-mobile/mobile-app.js:4473-4477`) tidak memanggil `mobCloseSheet('m-sheet-more')`, sehingga `#m-sheet-more` tetap terbuka menutupi `#m-btn-more`.
   - `setTheme()` mengaktifkan `html.rk-vt-apk` (`startViewTransition`), dan `::view-transition` bawaan Chromium memiliki `pointer-events: auto` yang menangkap `elementFromPoint` selama transisi.

### Status 6 hipotesis wajib
- (a) `renderMobMetaMenus()` melempar error di panggilan ke-2: **Terbantah** (0 error).
- (b) Timer penutupan menghapus `.open` yang baru ditambahkan: **Terbukti** pada jalur drag-to-dismiss (`finishSheetDrag` timer 250ms tanpa pelacakan `_mCloseT`).
- (c) Gaya/atribut sisa setelah tutup membuat sheet tak terlihat: **Terbukti** (`hidden = true` dari `dom.js` -> `brCloseModal` + timer/gaya inline `finishSheetDrag`).
- (d) Delegasi klik navbar Tahap 14 menelan klik `#m-btn-more`: **Terbantah** untuk delegasi langsung; **Terbukti** untuk intersepsi lapisan atas (`#m-sheet-more` yang belum ditutup setelah `#m-menu-theme` dan `::view-transition`).
- (e) Pembaruan `aria-current`/`.active` pada Menu di `switchMobileTab` mengganggu: **Terbantah**.
- (f) Flag internal yang tidak direset: **Terbantah** untuk handler `#m-btn-more` (tetapi `.modal-backdrop.open[hidden]` memicu false-positive di `hasOpenOverlay()`).

## 2. Penutup Kekurangan Tahap 14 (A1, A2, A3)
- **A1**: Ubah posisi `#m-btn-more .m-upd-dot` di `css/mobile.css` dari `top: 12px; right: calc(50% - 16px);` menjadi `top: 8px; right: calc(50% - 21px);` agar berjarak `>= 2px` dari goresan ikon Menu (aktif & nonaktif, terang & gelap, lebar 320–412px) tanpa menabrak tepi batang.
- **A2**: Di `rkSyncUpdateDots()`, ubah `aria-label` `#m-btn-more` menjadi `"Menu, ada pembaruan aplikasi"` saat titik pembaruan tampil dan `"Menu"` saat tidak tampil; sinkronkan juga saat `ensureMobileShell()`.
- **A3 (Pengecualian sadar Aturan 3)**: Transisi `color` pada `.bn-btn` (`css/mobile.css:1495`, `color var(--dur-nav-icon) var(--ease-out)`) dipertahankan secara sadar karena hanya memengaruhi goresan ikon SVG `24px` (`currentColor`) dan tidak menyebabkan reflow/layout thrash. Daftar putih eksplisit untuk `color` ditambahkan pada audit statis CSS navbar di `tests/schedule/tahap15_menu_haptic.test.js`.

## 3. Desain Haptic Feedback & Native Android
- **Helper tunggal**: `rkHaptic(kind)` di `js/ui-mobile/mobile-app.js` dekat `rkIsCapacitorNative()`, plus `rkIsHapticsEnabled()` / `rkSetHapticsEnabled(on)` berbasis `localStorage['rk-haptics']` (bawaan aktif, tidak menyentuh `S` atau `RK_SCHEMA_VER = 3`).
- **Gerbang**: aktif hanya bila `getShellMode() === 'mobile-app'` dan `rkIsHapticsEnabled()`.
- **Urutan sumber**: (1) `window.Capacitor.Plugins.Haptics`, (2) `navigator.vibrate`, (3) no-op diam-diam. Tanpa `await` di jalur UI; seluruh panggilan dibungkus `try/catch` dan `.catch(function () {})`.
- **Pembatasan laju**: khusus `tick` (`RK_HAPTIC_TICK_MS = 40` ms); `arm`, `refresh`, `edge` tidak dibatasi.
- **Native Android**: pasang `@capacitor/haptics@^8.0.0` (selaras dengan `@capacitor/core: ^8.6.2`), baca sumber Java Android di `node_modules/@capacitor/haptics` untuk verifikasi durasi/amplitudo nyata, tambahkan `<uses-permission android:name="android.permission.VIBRATE" />` di `android/app/src/main/AndroidManifest.xml` (agar jalur cadangan `navigator.vibrate` juga dijamin izinnya), lalu jalankan `npx cap sync android`.

## 4. Checkpoint Pelaksanaan (Hijau di Tiap Titik)
- **C0**: Rencana ini + tes TDD merah `tests/schedule/tahap15_menu_haptic.test.js`.
- **C1**: Perbaikan akar masalah bug Menu/Sheet (`mobile-app.js`, `tokens.css`) + A1 (`mobile.css`) + A2 (`mobile-app.js`).
- **C2**: Pasang `@capacitor/haptics@^8.0.0`, inspeksi kode Java, `AndroidManifest.xml`, `npx cap sync android`, implementasi `rkHaptic(kind)`.
- **C3**: Haptic PTR (`arm`, `refresh`) + re-tap tab aktif tanpa batas (`rincian`, `kas`, `jadwal`) dengan coalescing aman pada `pull()` & pembaruan 2 asersi lama yang secara eksplisit diganti oleh Butir 3 (`mobile_app_mode.test.js` 23b & 23f).
- **C4**: Haptic scrub grafik `#m-svg-cashflow` / `#m-cf-hit` (`tick` per pergantian indeks titik, bukan `#m-sheet-cf-zoom`) + opt-in `data-haptic="slider"` pada `#m-kas-slider` dan `#m-item-price-slider` (`tick` / `edge`, berbasis interaksi pointer/sentuh).
- **C5**: Sakelar "Getaran sentuh" di `#m-card-settings-notif`, bump `sw.js` ke `rk-cache-v38`, `npm run build`, `npm test`, `npm run test:bot`, dan verifikasi nyata Chrome CDP ke `C:\Users\daffa\Documents\verif-tahap15\`.
