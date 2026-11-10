# Arsitektur Rencana Keuangan

Catatan ini disusun dari kode sumber, bukan dari README. Semua angka dan status di bawah diambil dari repo pada commit `354bb48` (branch `main`, working tree bersih, 10 Nov 2026).

## 1. Bentuk program

Aplikasi web statis satu berkas. Tidak ada framework, tidak ada bundler, tidak ada modul ES. Semua kode berjalan sebagai skrip global di satu halaman.

- Sumber kebenaran: `index.dev.html` (277 baris), `css/style.css` (1.522 baris), `js/**` (33 berkas).
- Hasil build: `index.html` (438 KB, 10.560 baris), disalin identik ke `dist/index.html`.
- Hosting: GitHub Pages. `dist/` dipakai untuk deploy, `index.html` di root untuk pemakaian langsung.
- Data: `localStorage` + Supabase (opsional, untuk sinkron antar perangkat).
- Bot Telegram terpisah sebagai Cloudflare Worker (`bot/`).

## 2. Urutan muat dan peran modul

Urutan `<script>` di `index.dev.html` adalah kontrak: setiap berkas memakai global dari berkas sebelumnya. Menambah berkas wajib menyisipkan tag di posisi yang benar.

| Urutan | Berkas | Baris | Isi |
|---|---|---|---|
| 1 | `js/config.js` | 6 | `SB_URL`, `SB_KEY` (publishable). Satu-satunya berkas yang perlu diedit untuk Supabase. |
| 2 | `js/core/util.js` | 67 | Format uang/tanggal, `esc`, `parseRp`, `addDaysISO`. Murni. |
| 3 | `js/core/schedule.js` | 225 | Mesin jadwal: `at`, `series`, `occ`, `nextDates`, `every`, `priceAt`, `priceSeg`, `sumP`. Menghitung tanggal tagihan dari mulai + siklus + batas + daftar perubahan `ch`. |
| 4 | `js/core/state.js` | 495 | `ALL`/`S`, `seed`, `norm`, `normItem`, `normKas`, `save`, `snap`, `mergeAll`, `loadState`. |
| 5 | `js/core/items.js` | 241 | `item`, `cloneItem`, `isInvestCat`, `allCategories`, `remapStatus`, `trackSchedule`, `carryAdjustments`. |
| 6 | `js/core/calc.js` | 135 | `calc` (pengeluaran per bulan, penyesuaian saldo, total kategori), `incomeYear`, `adjMonths`. Murni, hanya membaca `S`. |
| 7 | `js/core/reminders.js` | 89 | `reminders`, `isLateISO`, `markPastPaid`. Lintas semua tahun tersimpan. |
| 8 | `js/core/match.js` | 223 | Pencocokan transaksi kas ke tagihan: `nameScore`, `matchCandidates`, `applyLink`, `autoMatchTx`, `realisasiData`. |
| 9 | `js/core/csv.js` | 118 | `toCSV`, `parseCSV`, `csvItems`. |
| 10-12 | `js/ui/dom.js`, `render.js`, `chart.js` | 145/28/150 | `$`, toast Urungkan, `tab()`; `renderAll()`; grafik SVG saldo. |
| 13-25 | `js/ui/*` | lihat tabel bawah | Satu berkas per tab atau per jendela: `rincian`, `realisasi`, `jadwal`, `items`, `years`, `header`, `adjust`, `price-modal`, `io`, `backup`, `diag`, `reminders`, `skiprange`. |
| 26 | `js/sync.js` | 391 | Login Supabase, `pull`, `push`, `applyRemote`, dialog konflik. |
| 27-33 | `js/ui/theme.js`, `kas.js`, `trip.js`, `nav.js`, `tip.js`, `topbar.js`, `js/app.js` | | `app.js` terakhir: `main()` memanggil `loadState`, `bind*`, `renderAll`, sinkron. |

Berkas UI terbesar:

| Berkas | Baris | Cakupan |
|---|---|---|
| `js/ui/trip.js` | 1.690 | Mode Perjalanan: profil kas terpisah, itinerary, pemesanan, checklist, kurs manual. |
| `js/ui/price-modal.js` | 1.062 | Jendela ubah harga/jadwal berbasis tujuan, pemilih tanggal, geser siklus. |
| `js/ui/rincian.js` | 709 | Tab Rincian Bulanan: saldo, grafik bulan, grafik kategori, tabel arus kas. |
| `js/ui/kas.js` | 553 | Tab Catatan Kas: profil (Utama, Liburan, dll), transaksi, dashboard. |
| `js/ui/items.js` | 550 | Tab Kelola Item, termasuk `parseQuickItem` untuk Tambah Cepat. |
| `js/ui/jadwal.js` | 350 | Tabel item x bulan dengan status chip (normal, lunas, dilewati, terlambat). |
| `js/ui/io.js` | 244 | Impor/ekspor JSON dan CSV. |
| `js/ui/diag.js` | 206 | Cek sistem: penyimpanan, unduhan, Supabase. |
| `js/ui/nav.js` | 193 | Menu Alat (desktop) dan bilah bawah + sheet Lainnya (<= 720 px). |
| `js/ui/reminders.js` | 158 | Banner dan jendela pengingat tagihan. |
| `js/ui/years.js` | 147 | Pindah, tambah, hapus tahun. |
| `js/ui/agenda.js` | 140 | Agenda 30 hari ke depan dengan saldo berjalan. |
| `js/ui/skiprange.js` | 101 | Ubah status banyak tagihan satu item dalam rentang tanggal. |
| `js/ui/theme.js` | 80 | Lima tema: `auto`, `light`, `dark`, `bw`, `bwd` lewat atribut `data-theme`, diingat per perangkat. |
| `js/ui/backup.js`, `realisasi.js`, `topbar.js`, `tip.js`, `header.js`, `adjust.js`, `render.js` | 76-8 | Cadangan otomatis, Rencana vs realisasi, mode privasi, tooltip, saldo awal. |

Tab dan view di `index.dev.html`: tombol `data-t="rincian|kas|jadwal|item|sim"`, section `v-rincian`, `v-jadwal`, `v-kas`, `v-sim`, `v-item`, `v-trip`, `v-rebalance`, `v-ibkr`. `tab(id)` di `js/ui/dom.js` menyalakan section dan `syncNav()`.

Mode halaman disimpan di `localStorage['rk-mode']`: `rencana`, `trip`, `rebalance`, `ibkr`.

## 3. Model data

`localStorage['rencana-keuangan-v1']` berisi satu objek `ALL`:

```
ALL = {
  year: 2027,                 // tahun aktif
  rev: 1762... ,              // versi untuk sinkron
  data: { [tahun]: S },       // S = ALL.data[ALL.year]
  kas: { pr: { [idProfil]: profil } }
}
```

`S` (satu tahun):

| Field | Isi |
|---|---|
| `saldo`, `startMonth` | Saldo awal dan bulan mulai saldo (0-11). |
| `items[]` | `{id, name, price, n, unit, start, end, cnt, pokok, cat, ch[]}`. `unit` salah satu `hari|minggu|bulan|tahun|sekali`. |
| `ch[]` | Perubahan harga/jadwal per rentang: `{from, to, price, n, unit, cut, anchor, dates[]}`. `cut` memotong sisa tagihan, `anchor` menggeser tanggal siklus, `dates` untuk harga satu tanggal saja. |
| `paid`, `skip` | Peta status per tagihan, kunci `itemId|YYYY-MM-DD`. |
| `adj[]` | Penyesuaian saldo manual `{id, t, amt, note, m, rep}`. |
| `real` | `{ "itemId|YYYY-MM-DD": {tx: idTransaksi} }`, tautan ke transaksi kas; tagihan tertaut otomatis lunas. |

Profil kas (`ALL.kas.pr[id]`): `{id, name, saldo, link, start, end, budget, cur, rate, tx[], it[], bk[], goal, auto, nm[]}`. `link: true` menandai satu profil yang terhubung ke Rencana Keuangan; sisanya profil terpisah (dipakai mode Perjalanan). `tx` = `{id, d, t: '+'|'-', amt, cat, note, debt, debtName, debtKind, debtDone}`.

`norm()` di `js/core/state.js` adalah satu-satunya gerbang validasi: semua data dari localStorage, impor, cloud, atau bot dilewatkan ke sini sebelum dipakai. Data kosong diisi `seed()` (contoh 12 item, saldo 25 juta, tahun 2027).

## 4. Sinkron Supabase

- Klien dibuat dari `SB_URL`/`SB_KEY`; bila kosong, aplikasi jalan mode lokal dan menampilkan status di header.
- Tabel `rk_state`: satu baris per pengguna, kolom `user_id`, `data` (jsonb), `rev`, `updated_at`.
- `push()` memakai update bersyarat `eq('rev', prevRev)` supaya dua perangkat tidak saling menimpa. Versi terakhir per akun dicatat di `localStorage['rk-sync']`.
- `pull()` membandingkan `dataSig` lokal dan cloud. Sama: hanya perbarui `rev`. Satu sisi berubah: ikuti sisi itu. Keduanya berubah: `askConflict()` menampilkan dialog pilihan.
- `applyRemote()` menyimpan snapshot dulu (`snap`) sebelum menimpa data lokal.
- Alat di `tools/` menyimpan state sendiri lewat `tools/bridge.js` (postMessage ke halaman induk) ke tabel `rk_tools`, bukan ke `rk_state`.

## 5. Build

`node build.js`:

1. Baca `index.dev.html`.
2. Ganti `<link rel="stylesheet" href="css/style.css">` dengan `<style>` isi CSS, dan inline setiap `url(fonts/*.woff2)` sebagai data URI base64.
3. Kumpulkan semua `<script src="js/...">` sesuai urutan, gabung jadi satu `<script>` sebelum `</body>`, tiap berkas diberi komentar `/* ===== js/... ===== */`.
4. Tulis `index.html` dan `dist/index.html`.
5. Salin `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`, dan seluruh `tools/` ke `dist/`.

`node build.js --check` membandingkan hasil build dengan `index.html` yang ada (CRLF dinormalkan) dan keluar kode 1 bila berbeda. Ini gerbang CI.

Konsekuensi: `index.html` adalah artefak. Edit `index.dev.html`, `css/style.css`, atau `js/**`, lalu build ulang dan commit `index.html` + `dist/`.

`sw.js` memakai cache `rk-cache-v6`, menyajikan `index.html` offline, dan melewati cache untuk permintaan Supabase.

## 6. Bot Telegram (Cloudflare Worker)

- Entry: `bot/worker.mjs`. Route `POST /tg` (webhook Telegram, diverifikasi header `x-telegram-bot-api-secret-token`), `GET /` dan `GET /diag` untuk diagnosa (hanya melaporkan secret ada atau kosong).
- `build-bot.js` merakit `bot/core.mjs` (1.164 baris) dari `js/core/*` plus fungsi murni tertentu di `js/ui/items.js`, `kas.js`, `trip.js`, dengan `pick()` yang mengekstrak satu fungsi top-level. Tidak ada duplikasi rumus. Berkas hasil diberi tanda jangan disunting manual.
- `bot/router.mjs`: perintah `@saldo`, `@jatah`, `@tagihan`, `@jadwal`, `@rekap`, `@kas`, `@cari`, `@debug`, `@masuk`, `@keluar`, `@utang`, `@piutang`, `@bayarutang`, `@bayarpiutang`, `@utangku`, `@beli`, `@lunas`, `@hapus`, `@tahun`, `@pakai`, `@laporanharian`, `@laporanmingguan`, `@laporanbulanan`, `@laporantahun`.
- `bot/store.mjs`: baca `rk_state` lewat REST, tulis dengan `PATCH ... &rev=eq.<rev>` supaya bot dan web tidak saling menimpa.
- `bot/report.mjs` + `bot/pdf.mjs`: laporan PDF (pdf-lib).
- `wrangler.toml`: nama `rencana-bot`, cron `0 1 1 * *` (laporan tanggal 1).
- Secret wajib: `TG_TOKEN`, `TG_SECRET`, `MY_TG`, `SB_URL`, `SB_KEY`.

## 7. Alat terpisah

- `tools/rebalance/` (`app.js` 1.514 baris, `journal.js` 450 baris, `index.html`, `styles.css`): kalkulator rebalance porto dengan band per aset (saham BMRI/BBRI, ETF VOO/VXUS/SMH/NVDA), jurnal eksekusi, posisi, riwayat band, simulasi, rute IBKR. Data jurnal ikut state aplikasi induk lewat `rkGetState()`.
- `tools/ibkr-flip/index.html` (235 baris): perbandingan biaya IBKR vs Flip, satu berkas mandiri.
- `tools/bridge.js` (50 baris): jembatan iframe, tidak aktif bila dibuka langsung.

## 8. Test dan CI

| Perintah | Cakupan | Status terverifikasi |
|---|---|---|
| `npm run check` | Kompilasi 44 skrip (`js/`, `tools/`, skrip inline di HTML) + kesegaran `index.html` | Lulus |
| `npm test` | `build` + `check` + 27 tes unit (`tests/unit/core.test.js`) + 17 berkas tes jadwal (`tests/schedule/`) | Lulus semua |
| `npm run test:e2e` | 5 berkas `tests/e2e/` di jsdom terhadap `dist/index.html` | Gagal: `matchMedia is not defined`, `tests/e2e/sync.js` error, `balance.js`/`features.js` berhenti saat modul dimuat |
| `node tests/rebalance/run.js` | `bundle.test.js`, `journal.test.js` | Gagal: assertion `fee 0,15%: sisa RDN tidak negatif`, `journal.test.js` `Cannot set properties of null` |
| `npm run test:bot` | `build-bot.js` + `tests/bot.test.mjs` | Lulus |
| `npm run test:browser` | Puppeteer, viewport 390 px, tema terang dan gelap | Butuh `npm i -D puppeteer`, tidak termasuk CI |

CI (`.github/workflows/ci.yml`): `npm ci`, `npm run check`, `npm test` pada setiap push dan pull request.

Deploy bot (`.github/workflows/deploy-bot.yml`): dipicu push ke `main` yang menyentuh `bot/**`, `build-bot.js`, `js/core/**`, `wrangler.toml`, `package.json`; langkahnya `build:bot`, `node --check bot/core.mjs`, `node --test tests/bot.test.mjs`, `wrangler deploy`.

Tes jadwal (`tests/schedule/`) memuat `index.html` di jsdom dengan harness sendiri (`tests/schedule/ui.js`), jadi berbeda dari `tests/e2e/` yang memakai `dist/index.html` dan belum menyediakan `matchMedia`/`ResizeObserver`.

## 9. Konvensi kerja

1. Jangan edit `index.html` atau `dist/`. Keduanya hasil build.
2. Berkas baru: tambahkan `<script src="js/...">` di `index.dev.html` pada posisi yang benar, lalu `npm run build`.
3. Sebelum commit: `npm run check` dan `npm test` harus lulus; `index.html` dan `dist/` ikut di-commit.
4. Logika murni (tanpa DOM, tanpa `localStorage`) masuk `js/core/`, supaya bisa dipakai bot lewat `build-bot.js`. Fungsi yang diambil bot harus top-level dan diakhiri `}` di kolom 0.
5. Kunci status tagihan selalu `itemId|YYYY-MM-DD`. Mengubah kunci berarti memutus `paid`, `skip`, dan `real`.
6. Semua data masuk lewat `norm()`. Jangan menambah field tanpa menambahkan normalisasinya.
7. Tidak ada `js/ui/sync.js`; modul sinkron ada di `js/sync.js`.

## 10. Batas yang perlu diketahui

- `tests/e2e/` dan `tests/rebalance/` merah saat ini. Bukan regresi dari perubahan terakhir, tetapi harness jsdom yang belum lengkap (tidak ada `matchMedia`, `ResizeObserver`, dan sebagian elemen baru di `tools/rebalance/index.html`).
- README belum mencerminkan struktur ini. Dokumen ini yang dipakai sebagai rujukan.
- `js/ui/trip.js` dan `js/ui/price-modal.js` memegang porsi besar logika UI; perubahan di sana paling berisiko dan paling sedikit tercakup tes.
