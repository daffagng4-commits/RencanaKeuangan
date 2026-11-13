# Laporan — Tata ulang dashboard (Fase A + B)

Repo: `C:\Users\daffa\Documents\GitHub\RencanaKeuangan`. Baseline rujukan `b0619f2`. Perubahan belum di-commit, tanpa `git stash`.

## 1. Hasil tes & build

| Cek | Hasil |
|---|---|
| `node build.js --check` | `OK: index.html sinkron dengan sumber (36 file js)` |
| `node tests/run-schedule.js` | 33 `OK`, 0 `GAGAL` |
| `npm test` | "Semua tes jadwal lulus." |
| Git status | hanya `css/style.css`, `index.html`, `dist/index.html` berubah (3 berkas, +5/−5 baris) |

## 2. Angka acuan brief (dibuktikan di Chrome, fixture brief, `__today=2026-11-12`)

| Acuan | Tampil |
|---|---|
| Saldo `Rp 1.472.000` | ✓ `.rk-kas` |
| Sisa akhir Des `-Rp 1.113.000` | ✓ (chip, grafik, `Sisa saldo akhir Des 2026`) |
| Kas habis `15 Des` | ✓ header "Kas cukup sampai 15 Des 2026 (33 hari lagi)" + label grafik |
| `Terendah Rp -1.113.000 (15 Des)` | ✓ teks Tile |

Pemasukan/keluar pada fixture brief = `Rp 2.500.000 / Rp 5.085.000` (brief menyebut `3.193.000 / 8.781.500` untuk fixture berbeda; tidak diubah, asumsi: brief memakai data contoh lain). Tidak ada perhitungan yang diubah — nilai `.rk-kas` identik dengan kartu lama (dibuktikan `snapshot_baseline.test.js` vs `b0619f2`).

## 3. Grid & breakpoint (terukur, Chrome 1440/1280/1024/768/390)

- 12 kolom, `gap 16px`, `align-items: stretch`, kontainer fluida.
- ≥1280: baris 1 `kas(1-8) + bills(9-12)`; baris 2 `mf/cat/top (4 masing-masing)`; baris 3 `detail(1-8) + tx(9-12)`.
- 768–1279: dua kolom; `kas`, `bills`, `top`, `detail`, `tx` penuh; `mf`+`cat` berdampingan.
- ≤640: satu kolom, nav bawah.
- Whitespace bawah tiap kartu = **0 px** di semua lebar (kriteria ≤24px terpenuhi).
- Scroll horizontal = **0 px** di 1920/1440/1280/1280+sidebar/1024/768/390, terang & gelap.
  - Dua penyebab yang diperbaiki: `.dn-lg button` dan `.insight-reserve-row` memakai `1fr` (min-content) → `minmax(0, 1fr)`.

## 4. Tema, privasi, aksesibilitas

| Cek | Hasil |
|---|---|
| Privasi 60/60 nominal terblur (24 kombinasi lebar×tema) | ✓ DOM tetap utuh |
| Kontras teks: h1, ringkasan, nilai besar, label tile, chip, judul kartu, sub, topbar, header tabel | 5,25–17,26:1 terang; 6,67–16,04:1 gelap (semua ≥4,5) |
| Kontras tab aktif (teks di atas pil gradien) | 6,48:1 terang, 7,17:1 gelap |
| Kontras tab non-aktif (di atas `--sf`) | 5,89:1 terang, 6,67:1 gelap |
| Target sentuh tombol topbar | 34×34 (≥1280), 32×32 (≤768), rail 48×48 |
| `aria-label` + tooltip Bahasa Indonesia tombol topbar | ✓ semua (Akun, Tahun…, Privasi, Notifikasi, Alat, Tema, Pasang, Sembunyikan) |
| Tab rail tanpa label teks (≤1027) | `title`+`aria-label` per tab (5 tab); rail 48×48 |
| Fokus keyboard | 20 langkah Tab, semua `outline: 2px solid var(--ac)`; tidak ada yang hilang |

## 5. Inventaris kontrol (sebelum → sesudah)

| Kontrol | Ada | Berfungsi (diklik) |
|---|---|---|
| Akun `#acct` | ✓ 48×48 | ✓ |
| Tahun/bulan/saldo `#yr-btn` | ✓ 48×48 | ✓ panel buka/tutup (`aria-expanded` true) |
| Privasi `#btn-privacy` | ✓ | ✓ blur 0→48 |
| Notifikasi `#btn-notif` | ✓ | ✓ (permintaan izin; tidak berubah status karena headless = izin default) |
| Alat `#alat-btn` | ✓ | ✓ menu buka (none→block) |
| Tema `#thm` | ✓ (dalam menu Alat) | ✓ light→dark + persist `rk-theme` |
| Pasang aplikasi `#pwa` | ✓ | ✓ (instruksi toast) |
| Impor/Ekspor `#bk` | ✓ | ✓ (modal) |
| Collapse sidebar `#sb-toggle` | ✓ 178×48 | ✓ 196→64 px, persist `rk-sb`, `aria-expanded` |
| Sembunyikan tombol `#tb-more` | ✓ 34×34 | ✓ |

Tidak ada kontrol yang dihapus. Badge notifikasi belum ada di baseline `b0619f2` (`git show b0619f2:index.dev.html`) — tidak ditambahkan karena berarti fitur baru, di luar "tata letak murni".

## 6. Mekanisme offset

Satu mekanisme saja: grid `.app` (`grid-template-columns: 104px minmax(0,1fr)`; `.app.sb-open` → `216px`). Sidebar sticky di grid-column 1, konten di column 2. Tidak ada margin/left-offset paralel di CSS maupun JS.

## 7. Tes yang ditulis ulang (menyesuaikan tata letak final, invarian dipertahankan)

- `snapshot_baseline.test.js` — bandingkan himpunan nominal `Rp`/`%` per slot vs baseline `b0619f2` via `git show` (tanpa stash).
- `hero_html.test.js`, `render_shell_dom.test.js`, `flow_monthly.test.js`, `saldo_hero.test.js`, `year_profile.test.js`, `_snap.js`.

## 8. Asumsi

1. Badge notifikasi tidak dibuat (bukan elemen baseline; akan berarti fitur baru).
2. Angka `Rp 3.193.000 / Rp 8.781.500` di brief berasal dari data contoh berbeda; fixture yang tersedia menghasilkan `Rp 2.500.000 / Rp 5.085.000`. Perhitungan tidak diubah.
3. Sidebar expand default hanya ≥1280; 768–1279 tetap rail ikon (konsisten satu grid).
4. Grafik arus saldo tinggal di dalam kartu "Kondisi kas" (brief menyebutnya satu kartu).

## 9. Sisa

- `index.html` + `dist/index.html` perlu di-commit bersama `css/style.css` (belum dilakukan; menunggu keputusan Anda).
- Scratch `AppData\Local\hermes\cache\scratch\rkv` (puppeteer-core) dihapus setelah laporan ini.
