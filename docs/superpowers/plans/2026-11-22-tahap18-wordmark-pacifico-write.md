# Tahap 18 Implementation Plan: Wordmark "RenKeu" Pacifico, Efek Menulis Atas-ke-Bawah Kontinu, & Progres Tarikan Pull-to-Refresh (Mode APK)

## Temuan C0 (Diagnosis Kode Nyata)

1. **Status Tahap 17**: Sudah diterapkan penuh di working tree (belum di-commit):
   - `sw.js`: `CACHE_NAME = 'rk-cache-v40'` (target Tahap 18: `rk-cache-v41`).
   - `js/ui-mobile/mobile-app.js`: `RK_WORDMARK_LETTERS` (L741-748), `RK_WORDMARK_PATH` (L749), `mobWordmarkSvgHtml()` (L755-767), mesin langkah per huruf `syncWmLetterLit` / `clearWmTimers` / `startWmFinale` / `runWmStep` / `forceStopRefreshIndicator` / `rkSetRefreshIndicator` (L4092-4261), `finishRefresh` / `runRefresh` (L4338-4427), `onActiveMove` / `endPtr` (L4429-4486).
   - `css/tokens.css`: `--wm-dead`, `--wm-lit`, `--wm-flash`, `--dur-wm-fade`, `--dur-wm-lit-in`, `--dur-wm-lit-out`, `--dur-wm-flash-in`, `--dur-wm-flash-out` (L230-237 & L513-517).
   - `css/mobile.css`: aturan 4 lapis `.mt-wm-white/.mt-wm-dead/.mt-wm-lit/.mt-wm-flash` + `[data-wm-step="0..5"]` + `[data-wm-finale="1"][data-wm-flash="in|out"]` (L279-352).
2. **Pemakaian `RK_WORDMARK_PATH` dan `.mt-wordmark`**:
   - `RK_WORDMARK_PATH` hanya didefinisikan di `js/ui-mobile/mobile-app.js` L749/L752 dan diuji di `tests/schedule/tahap17_wordmark_letters.test.js`. Tidak dipakai di Desktop, login, maupun ikon aplikasi.
   - `.mt-wordmark` dipakai di `js/ui-mobile/mobile-app.js` (header APK) dan `js/ui-mobile/header-motif.js` L165 (`measureZones` memakai `getBoundingClientRect()`).
3. **Bagian A (Kekurangan Tahap 16/17)**:
   - **A1**: `syncMobileCloudUI()` (L665-672) memeriksa `MOB_STATE._lastCloudUid !== nextUid` sehingga pemanggilan ulang untuk pengguna sama saat `pull()` berjalan tidak memanggil `_rkPtrReset()`. Tetap dikunci di tes Tahap 16/17/18.
   - **A2**: Bersihkan sisa komentar/pesan usang tentang "shimmer" / "langkah per huruf" di `tests/schedule/tahap16_refresh_indicator.test.js` dan `tests/schedule/tahap17_wordmark_letters.test.js`.
   - **A3**: Seluruh sasaran Tahap 17 sudah terpenuhi sebelumnya (50/50 jadwal, 62/62 unit, 18/18 bot, Chrome CDP 0 error); mesin langkah per huruf digantikan mesin progres kontinu Tahap 18.
   - **A4**: `git ls-files node_modules | wc -l` = `1419` berkas terlacak. Tidak diubah; laporkan perintah `git add` aman tanpa `node_modules/`.

## Arsitektur & Keputusan Desain Tahap 18

- **C2 — Font Pacifico Outline SVG (`tools/gen-wordmark-pacifico.js`)**:
  - Skrip Node sekali jalan memakai `opentype.js` + font Pacifico Regular (`@fontsource/pacifico` subset latin, SIL OFL 1.1) yang dipasang sementara di direktori scratch di luar repo (`package.json` & `package-lock.json` tidak disentuh).
  - Parameter tipografi identik `renkeu-topbar.html`: `fontSize = 36`, `kerning: true`, tambahan `letterSpacing = 0.5 / 36` em per huruf (`0.5px` pada `36px`).
  - Menghasilkan konstanta khusus APK di `js/ui-mobile/mobile-app.js`:
    - `RK_WM_GLYPHS` (6 path `d` dibulatkan 2 desimal untuk `R, e, n, K, e, u`)
    - `RK_WM_BOXES` (6 kotak batas `{ x, y, w, h }` per glyph untuk `<clipPath><rect>`)
    - `RK_WM_VIEWBOX` (kotak batas ketat gabungan + padding kecil)
    - Atribusi 1 baris: `/* Pacifico (Vernon Adams), SIL Open Font License 1.1 */`
  - Verifikasi fidelitas piksel terhadap `renkeu-topbar.html` di Chrome CDP pada cap-height sama; cek lebar wordmark pada 320px agar tidak bertabrakan dengan `.mt-actions`.
- **C3 — Progres Kontinu `rkWmFill(p, n)` & Klip Transform**:
  - Fungsi murni `rkWmFill(p, n = 6)`: `fill_i = clamp(clamp(p, 0, 1) * n - i, 0, 1)`.
  - Setiap huruf ke-`i` memiliki `<clipPath id="rk-wm-c-<seq>-<i>"><rect class="mt-wm-clip-rect" data-wm-idx="i" x="..." y="..." width="..." height="..."/></clipPath>` yang diterapkan pada `<path class="mt-wm-lit" clip-path="url(#...)"/>`.
  - Animasi pengisian atas-ke-bawah memakai CSS `transform: scaleY(fill_i)` dengan `transform-box: fill-box; transform-origin: 0 0` (Aturan 3: hanya `transform` dan `opacity`). Verifikasi langsung di Chrome CDP bahwa `<clipPath>` + `scaleY` merender akurat di Chromium/WebView.
  - Abstraksi scheduler tunggal `window._rkWmClock` (`rkWmNow()`, `rkWmSchedule(fn)`, `rkWmCancel(id)`, `rkWmSetTimeout(fn, ms)`, `rkWmClearTimeout(id)`): 1 loop `requestAnimationFrame` hanya saat status aktif (`reset|run|finale|return`), berhenti total saat `idle` dan `drag` diam. Nol pembacaan layout di dalam loop.
- **C4 — Mesin Status Refresh (Satu Pintu)**:
  - Status `wmMode`: `idle`, `drag`, `return`, `reset`, `run`, `finale`.
  - Parameter waktu:
    - `RK_WM_FADE_IN_MS = 160` (`--dur-wm-fade: 160ms`)
    - `RK_WM_PASS_MS = 2000` (lintasan kontinu `P: 0 -> 1` tanpa jeda antarhuruf)
    - `RK_WM_LOOP_RESET_MS = 200` (`--dur-wm-reset: 200ms`, jeda fade ke abu-abu saat `pull()` cloud lambat mengulang lintasan)
    - `RK_WM_FLASH_IN_MS = 120` (`--dur-wm-flash-in: 120ms`), `RK_WM_FLASH_OUT_MS = 380` (`--dur-wm-flash-out: 380ms`)
    - `RK_WM_REDUCED_MIN_MS = 850`, `RK_REFRESH_MAX_MS = 20000`
  - Jalur non-sukses (reject, `_rkLastPullOk === false`, timeout 20 dtk, logout/ganti akun, `_rkPtrReset`, `unmountMobileShell`) -> langsung putih idle tanpa kilat kuning, semua loop/timer dibersihkan.
- **C5 — Tarikan Jari Pull-to-Refresh (`drag` / `return` / `commit`)**:
  - Zona mati `WM_DRAG_DEAD_PX = 4` (selaras `LOCK_PX = 8` dengan redaman `dy * 0.5`).
  - `P = clamp(pullY / PULL_TRIG, 0, 1)` dua arah tanpa histeresis; `pullY >= PULL_TRIG` (`52px`) -> `P = 1`.
  - Dilepas di bawah ambang: `return` mulus `P -> 0` selama `clamp(80 + P * 180, 80, 260)ms` (ease-out cubic), lalu kembali putih idle tanpa `data-refreshing`, tanpa `aria-busy`, tanpa haptic.
  - Dilepas di atas ambang: masuk alur refresh (`reset` fade-out `.mt-wm-lit` ke abu-abu `160ms` agar transisi dari `P=1` tidak patah -> `run` `P: 0 -> 1` -> `finale` -> `idle`).
  - `touchcancel`, target dikecualikan, atau overlay terbuka -> batal tanpa efek. Tarikan saat refresh berjalan tidak mengganggu lintasan berjalan.
- **C6 — CSS, Token, & Reduced Motion**:
  - Token di `css/tokens.css`: `--wm-dead`, `--wm-lit`, `--wm-flash`, `--dur-wm-fade: 160ms`, `--dur-wm-reset: 200ms`, `--dur-wm-flash-in: 120ms`, `--dur-wm-flash-out: 380ms` (reduksi `0.001ms` pada `prefers-reduced-motion: reduce`; hapus `--dur-wm-lit-in`/`--dur-wm-lit-out` usang Tahap 17).
  - Reduced motion: tidak ada lintasan waktu dan tidak ada kilat kuning saat refresh (abu-abu statis minimal `850ms` -> putih); manipulasi langsung tarik jari tetap mengikuti jari, lepas batal langsung putih tanpa animasi return.
- **C7 — Build, Tes, & Chrome CDP**:
  - Naikkan `sw.js` ke `rk-cache-v41`, jalankan `npm run build`, jalankan tes baru `tests/schedule/tahap18_wordmark_write.test.js` + pembaruan ketat `tahap16_refresh_indicator.test.js` & `tahap17_wordmark_letters.test.js`, jalankan `npm test`, `npm run test:bot`, dan verifikasi Chrome CDP nyata (bukti di `C:\Users\daffa\Documents\verif-tahap18\`).
