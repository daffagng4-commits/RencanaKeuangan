# TAHAP 14: Bottom Navbar APK Baru (Putih, Melayang, Hanya Ikon, Takik Melengkung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah tampilan bottom navbar Mode APK (`#mobile-app-shell .mob-bottom-nav`) menjadi batang putih melayang (netral gelap di dark mode), hanya ikon (4 tab tanpa label teks visual), takik melengkung halus di sekitar tombol `+` biru di tengah, serta penanda titik biru yang meluncur halus dengan karakter jelly ringan tanpa mengubah perilaku tombol, data, maupun tampilan Desktop.

**Architecture:** Menggunakan satu elemen SVG `<path>` dinamis pada `.bn-bg` (dengan sudut kapsul 26px dan kurva takik C1-tangensial di tengah atas) yang diberi `filter: drop-shadow` statis pada pembungkusnya, ditambah satu elemen `.bn-active-dot` yang berpindah memakai `transform: translate3d(var(--bn-dot-x), 0, 0)`. Seluruh warna, jarak, durasi, dan easing dikelola lewat token di `css/tokens.css`, sedangkan markup/geometri ada di `js/ui-mobile/mobile-app.js` dan gaya terisolasi di `css/mobile.css`.

**Tech Stack:** Vanilla HTML/CSS/JS, SVG inline, Capacitor 8 web bundle (`build.js`), Node test runner + jsdom, Chrome DevTools Protocol (CDP) via Node `WebSocket`.

---

## Global Constraints
- Mode APK saja (`body[data-shell="mobile-app"] #mobile-app-shell`); Desktop (`css/desktop.css`, `js/ui/browser-app.js`) tidak boleh tersentuh.
- Fungsi semua tombol (tab `rincian`, `kas`, `jadwal`, `#m-btn-more`, tombol `+` `#m-yr-btn-center`, re-tap Rincian, Back Android, PTR) tidak berubah.
- Hanya animasikan `transform` dan `opacity` (plus `color` untuk ikon tab); tidak ada animasi `filter`, `box-shadow`, `width`, `height`, `left`; `:hover` wajib di dalam `@media (hover: hover) and (pointer: fine)`; hormati `@media (prefers-reduced-motion: reduce)`.
- Tidak ada hex literal baru di blok navbar `css/mobile.css` (semua via token di `css/tokens.css`); target sentuh tab `>= 44x44px` via `::before`.
- Ubah sumber, lalu `npm run build`; naikkan `CACHE_NAME` di `sw.js` ke `rk-cache-v37`. Jangan commit/push.

---

### Task 1: Baseline CDP & Rencana
- [x] Catat temuan C0 dan simpan rencana ini di `docs/superpowers/plans/2026-11-21-tahap14-bottom-navbar.md`.
- [ ] Buat skrip verifikasi Chrome CDP di scratch (`verify-tahap14.mjs`) dan jalankan fase `before` ke `C:\Users\daffa\Documents\verif-tahap14\`.

### Task 2: TDD — Tes `tests/schedule/tahap14_navbar.test.js`
- [ ] Tulis tes lengkap (struktur 4 tab + `aria-label` + `aria-current="page"`, tanpa teks judul visual, ikon bawaan 24px, takik SVG + 1 titik penanda, tombol `+` di tengah, perilaku pindah tab + re-tap Rincian + tanpa ripple pada `.bn-btn` + PTR exclusion, audit statis CSS & token, isolasi Desktop, `sw.js >= v37`).
- [ ] Jalankan `node tests/schedule/tahap14_navbar.test.js` dan pastikan GAGAL (RED) sebelum implementasi.

### Task 3: Implementasi Token, Gaya CSS, Markup, & Logika Tata Letak
- [ ] Perbarui `css/tokens.css` (token warna, jarak melayang, durasi/easing jelly, reduced-motion, `#m-btt-btn`).
- [ ] Perbarui `js/ui-mobile/mobile-app.js` (markup `<nav class="mob-bottom-nav">`, `rkBuildNavNotchPath`, `rkSyncMobNavLayout`, sinkronisasi di mount/tab/frame/resize, hapus `.bn-btn` dari selector ripple).
- [ ] Perbarui `css/mobile.css` (blok navbar melayang, takik SVG, tombol `+` tengah, titik aktif meluncur, hover media, reduced-motion, padding bawah `.mob-main`, toast, dot update, home indicator).
- [ ] Naikkan `CACHE_NAME` di `sw.js` menjadi `rk-cache-v37`.

### Task 4: Build, Uji Otomatis, & Verifikasi CDP Sesudah
- [ ] Jalankan `npm run build`.
- [ ] Jalankan `node tests/schedule/tahap14_navbar.test.js`, `npm test`, dan `npm run test:bot` -> pastikan semuanya lulus (GREEN).
- [ ] Jalankan skrip Chrome CDP fase `after` di 6 viewport × 2 tema, periksa angka & tangkapan layar, perbaiki bila ada cacat, dan konfirmasi `git status -s`.
