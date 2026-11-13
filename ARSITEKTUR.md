# Arsitektur Rencana Keuangan

Disusun dari kode sumber (bukan README). Diperbarui untuk kondisi repo saat ini: `node build.js --check` lulus, `node tests/run-schedule.js` lulus.

## 1. Bentuk program

Web statis satu berkas. Tanpa framework, tanpa bundler, tanpa modul ES. Semua berkas berjalan sebagai skrip global di satu halaman; setiap berkas memakai global dari berkas sebelumnya.

- Sumber kebenaran: `index.dev.html` (283 baris), `css/style.css` (2.026 baris), `js/**` (35 berkas dimuat, 10.674 baris).
- Hasil build: `index.html` (546 KB, 13.020 baris), disalin identik ke `dist/index.html`.
- Hosting: GitHub Pages (`dist/` untuk deploy; `index.html` di root untuk pemakaian langsung).
- Data: `localStorage` + Supabase (opsional, sinkron antar perangkat).
- Bot Telegram: Cloudflare Worker terpisah di `bot/`.

## 2. Urutan muat (kontrak)

Urutan `<script src>` di `index.dev.html` mengikat. Berkas baru wajib disisipkan di posisi yang benar.

| # | Berkas | Baris | Isi |
|---|---|---|---|
| 1 | `js/config.js` | 6 | `SB_URL`, `SB_KEY` (publishable). Satu-satunya berkas yang perlu diedit untuk Supabase. |
| 2 | `js/core/util.js` | 146 | Murni: `esc`, `rp`, `parseRp`, `fd`, `isoD`, `fmtD`, `shortP`, `pad2`, `addDaysISO`, `dayBadge`, `txInitials`, `dayGroupLabel`, `netSigned`, daftar `MON`/`FULL_MON`/`WD3`, `normalisasiNamaItem`. |
| 3 | `js/core/schedule.js` | 225 | Mesin jadwal: `at`, `series`, `occ`, `nextDates`, `every`, `segAt`, `priceSeg`, `priceAt`, `sumP`, `origDate`, `curDate`, `lastOcc`, `chSame`. |
| 4 | `js/core/state.js` | 509 | `ALL`/`S`, `seed`, `norm`, `normItem`, `normAdj`, `normKas`, `chNorm`, `save`, `snapList`, `snap`, `restoreSnap`, `mergeAll`, `loadState`, `dsig`, `smEff`, `smEffYear`. |
| 5 | `js/core/items.js` | 241 | `item`, `sameItem`, `cloneItem`, `isInvestCat`, `allCategories`, `remapStatus`, `moveStatusExact`, `trackSchedule`, `carryAdjustments`. |
| 6 | `js/core/calc.js` | 135 | `calc` (pengeluaran bulanan, penyesuaian saldo, total kategori), `incomeYear`, `adjMonths`. Murni, hanya membaca `S`. |
| 7 | `js/core/reminders.js` | 89 | `reminders`, `isLateISO`, `markPastPaid`. Lintas semua tahun tersimpan. |
| 8 | `js/core/match.js` | 223 | Pencocokan kas ke tagihan: `nameScore`, `matchCandidates`, `linkedTxIds`, `realTx`, `suggestMatches`, `applyLink`, `unlinkBill`, `autoMatchTx`, `realisasiData`. |
| 9 | `js/core/csv.js` | 118 | `toCSV`, `parseCSV`, `csvItems`. |
| 10 | `js/ui/dom.js` | 164 | `$`, `fmtLive`, `navPill`, `tab()`, `toast(msg, undo)`, `askConfirm`, `bindDom`, `setSaveStatus`. |
| 11 | `js/ui/render.js` | 84 | `renderAll()` (orkestrasi semua render), `setStartMonth`, `smSyncUI`, `smAutoMark`, `refreshToday`, `syncUI`, `migSmManual`. |
| 12 | `js/ui/chart.js` | 669 | Grafik SVG. |
| 13 | `js/ui/rincian.js` | 1.186 | Tab Rincian: `kasFlow`, `kasRunway`, `kasFirstNegative`, `yearCash`, `topExpensesCard`, `insightCard`, `flowChart`, `billsCard`, `recentTxCard`, `kasStatusHtml`, `renderRincian`, `bindRincian`. |
| 14 | `js/ui/realisasi.js` | 80 | Rencana vs realisasi. |
| 15 | `js/ui/jadwal.js` | 353 | Tabel item x bulan, chip status. |
| 16 | `js/ui/items.js` | 550 | Tab Kelola Item + `parseQuickItem`. |
| 17 | `js/ui/years.js` | 146 | Pindah/tambah/hapus tahun. |
| 18 | `js/ui/header.js` | 32 | Saldo awal & tahun di header. |
| 19 | `js/ui/adjust.js` | 8 | Penyesuaian saldo (tipis). |
| 20 | `js/ui/price-modal.js` | 1.062 | Jendela ubah harga/jadwal, geser siklus. |
| 21 | `js/ui/io.js` | 244 | Impor/ekspor JSON & CSV. |
| 22 | `js/ui/backup.js` | 76 | Cadangan otomatis. |
| 23 | `js/ui/diag.js` | 206 | Cek sistem (penyimpanan, unduhan, Supabase). |
| 24 | `js/ui/reminders.js` | 126 | Banner & jendela pengingat. |
| 25 | `js/ui/skiprange.js` | 101 | Ubah status banyak tagihan dalam rentang. |
| 26 | `js/sync.js` | 399 | `sbInit`, `sbStat`, `pull`, `push`, `schedPush`, `flushPush`, `applyRemote`, `askConflict`, `mergeAll` via dialog, `auth`, `bindSync`. |
| 27 | `js/ui/theme.js` | 93 | Lima tema (`auto`, `light`, `dark`, `bw`, `bwd`) via `data-theme`. |
| 28 | `js/ui/kas.js` | 574 | Tab Catatan Kas: profil (Utama = `link:true`), transaksi, utang/piutang (`debtData`, `debtHtml`, `openDebtForm`, `hideDebt`), kas kilat, `renderKas`, `bindKas`. |
| 29 | `js/ui/trip.js` | 1.695 | Terbesar. Mode Perjalanan (`setMode`, `trips`, `tp`, `tripPlan`, `tripRing`, `tripItin`, `tripBook`, `tripCek`, `renderTrip`, `bindTrip`), target tabungan (`kasGoals`, `goalMonths`, `goalCard`), Simulasi (`simCalc`, `renderSim`, `simApply`, `bindSim`), impor Excel (`xlParse`, `xlCommit`, `xlTemplate`), `modeUi`, jembatan `tools/` (`toolSendLoad`, `toolMount`, `toolPush`, `toolsPull`), PWA/notifikasi. |
| 30 | `js/ui/report.js` | 258 | Laporan harian/mingguan/bulanan/tahunan. |
| 31 | `js/ui/nav.js` | 283 | Menu Alat (desktop), bilah bawah + sheet Lainnya (<= 720 px), `navGo`, `applyTripVis`, `railMove`, `bindNav`. |
| 32 | `js/ui/tip.js` | 69 | Tooltip. |
| 33 | `js/ui/datepick.js` | 415 | Pemilih tanggal & rentang (`pkRange`, `pkMulti`, `upPickers`). |
| 34 | `js/ui/topbar.js` | 71 | Topbar, mode privasi. |
| 35 | `js/app.js` | 38 | `main()`: `loadState` -> semua `bind*` -> `renderAll` -> `save` -> `bindSync` -> `sbInit`. |

Tidak dimuat: `js/ui/agenda.js` (140 baris) — tidak ada tag `<script>` untuknya di `index.dev.html`; kodenya tidak berjalan.

View di `index.dev.html`: `v-rincian`, `v-jadwal`, `v-kas`, `v-sim`, `v-trip`, `v-rebalance`, `v-ibkr`, `v-item`. Tombol nav bertanda `data-t`: `rincian|kas|jadwal|item|sim`. `tab(id)` menyalakan section lalu memanggil `syncNav()`.

Mode halaman di `localStorage['rk-mode']`: `rencana`, `trip`, `rebalance`, `ibkr`.

## 3. Model data

`localStorage['rencana-keuangan-v1']` = satu objek `ALL`:

```
ALL = {
  year: 2027,          // tahun aktif
  rev: 1762...,        // versi untuk sinkron
  data: { [tahun]: S },// S = ALL.data[ALL.year]
  kas: { pr: { [idProfil]: profil } }
}
```

`S` (satu tahun):

| Field | Isi |
|---|---|
| `saldo`, `startMonth`, `smManual` | Saldo awal, bulan mulai saldo (0-11), penanda "dipilih manual". Tanpa penanda, tahun berjalan mengikuti bulan kalender (`smEffYear`). |
| `items[]` | `{id, name, price, n, unit, start, end, cnt, pokok, cat, ch[]}`. `unit`: `hari|minggu|bulan|tahun|sekali`. |
| `ch[]` | Perubahan per rentang: `{from, to, price, n, unit, cut, anchor, dates[], mv{}}`. `cut` memotong sisa tagihan, `anchor` menggeser tanggal siklus, `dates` harga untuk tanggal tertentu, `mv` geser per tagihan. |
| `paid`, `skip` | Peta status per tagihan, kunci `itemId|YYYY-MM-DD`. |
| `real` | `{ "itemId|YYYY-MM-DD": {tx: idTransaksi} }`; tagihan tertaut otomatis lunas. |
| `adj[]` | Penyesuaian saldo manual `{id, t, amt, note, m, rep}` — dimigrasi `norm()` menjadi transaksi kas profil tergabung, lalu `adj` dikosongkan. |

Profil kas (`ALL.kas.pr[id]`): `{id, name, saldo, link, start, end, budget, cur, rate, tx[], it[], bk[], lk[], ck[], dt{}, note, goal, auto, nm[]}`.
- `link: true` = tepat satu profil, terhubung ke Rencana (memakai `S.saldo`, transaksinya masuk `calc()`). Sisanya profil terpisah (mode Perjalanan).
- `tx`: `{id, d, t:'+'|'-', amt, cat, note, debt, debtName, debtKind, debtDone}`; `debtKind`: `utang|piutang|bayar-utang|bayar-piutang`.
- `it` itinerary, `bk` pemesanan, `lk` tautan, `ck` checklist, `dt` catatan per tanggal, `goal` target tabungan, `nm` daftar transaksi yang ditolak dari saran pencocokan.

`norm()` di `js/core/state.js` adalah satu-satunya gerbang validasi: localStorage, impor, cloud, dan bot semuanya lewat sini. Data kosong diisi `seed()` (12 item contoh, saldo 25 juta, tahun 2027).

## 4. Sinkron Supabase

- Klien dari `SB_URL`/`SB_KEY`; bila kosong aplikasi jalan lokal dan menampilkan status di header.
- Tabel `rk_state`: satu baris per pengguna (`user_id`, `data` jsonb, `rev`, `updated_at`).
- `push()` memakai update bersyarat `eq('rev', prevRev)` agar dua perangkat tidak saling menimpa; versi tersinkron per akun di `localStorage['rk-sync']`.
- `pull()` membandingkan `dataSig` lokal vs cloud: sama -> perbarui `rev`; satu sisi berubah -> ikuti; keduanya berubah -> `askConflict()` (pilih lokal/cloud/gabung).
- `applyRemote()` membuat snapshot (`snap`) sebelum menimpa data lokal; setiap aksi destruktif lain juga memakai `snap` + `toast(…, undo)`.
- `tools/` menyimpan state sendiri lewat `tools/bridge.js` (postMessage ke halaman induk) ke tabel `rk_tools`, bukan `rk_state`.

## 5. Build

`node build.js`:

1. Baca `index.dev.html`.
2. Ganti `<link rel="stylesheet" href="css/...">` dengan `<style>`, dan inline setiap `url(fonts/*.woff2)` jadi data URI base64.
3. Kumpulkan semua `<script src="js/...">` sesuai urutan, gabung jadi satu `<script>` sebelum `</body>` dengan penanda `/* ===== js/... ===== */`.
4. Tulis `index.html` dan `dist/index.html`.
5. Salin `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`, dan seluruh `tools/` ke `dist/`.

`node build.js --check` membandingkan hasil build dengan `index.html` yang ada (CRLF dinormalkan), keluar kode 1 bila berbeda. Gerbang CI.

`index.html` adalah artefak. Edit `index.dev.html` / `css/style.css` / `js/**`, build ulang, commit `index.html` + `dist/`. `sw.js` memakai cache `rk-cache-v6`.

## 6. Bot Telegram (Cloudflare Worker)

- Entry `bot/worker.mjs`. Route `POST /tg` (webhook, header `x-telegram-bot-api-secret-token`), `GET /` dan `GET /diag` (hanya melaporkan secret ada/kosong).
- `build-bot.js` merakit `bot/core.mjs` dari `js/core/*` plus fungsi murni pilihan di `js/ui/items.js`, `kas.js`, `trip.js` (`pick()` mengekstrak satu fungsi top-level). Tidak ada duplikasi rumus. Hasilnya ditandai jangan disunting manual.
- `bot/router.mjs`: `@saldo`, `@jatah`, `@tagihan`, `@jadwal`, `@rekap`, `@kas`, `@cari`, `@debug`, `@masuk`, `@keluar`, `@utang`, `@piutang`, `@bayarutang`, `@bayarpiutang`, `@utangku`, `@beli`, `@lunas`, `@hapus`, `@tahun`, `@pakai`, `@laporanharian`, `@laporanmingguan`, `@laporanbulanan`, `@laporantahun`.
- `bot/store.mjs`: baca `rk_state` via REST, tulis `PATCH ... &rev=eq.<rev>` supaya bot dan web tidak saling menimpa.
- `bot/report.mjs` + `bot/pdf.mjs`: laporan PDF (pdf-lib).
- `wrangler.toml`: `rencana-bot`, cron `0 1 1 * *`. Secret: `TG_TOKEN`, `TG_SECRET`, `MY_TG`, `SB_URL`, `SB_KEY`.

## 7. Alat terpisah (`tools/`)

- `tools/rebalance/` (`app.js`, `journal.js`, `index.html`, `styles.css`): kalkulator rebalance porto dengan band per aset, jurnal eksekusi, posisi, riwayat band, simulasi, rute IBKR. Data jurnal lewat `rkGetState()` dari halaman induk.
- `tools/ibkr-flip/index.html`: perbandingan biaya IBKR vs Flip, satu berkas mandiri.
- `tools/bridge.js`: jembatan iframe, tidak aktif bila dibuka langsung.

## 8. Test dan CI

| Perintah | Cakupan | Status terverifikasi |
|---|---|---|
| `node build.js --check` / `npm run check` | Kompilasi semua `js/` + `tools/` + skrip inline, plus kesegaran `index.html` | Lulus (`35 file js`) |
| `npm test` | `build` + `check` + unit (`tests/unit/`) + jadwal (`tests/schedule/`) | Unit & jadwal lulus; `tests/rebalance` merah |
| `npm run test:e2e` | `tests/e2e/` di jsdom atas `dist/index.html` | Gagal: harness jsdom belum punya `matchMedia`/`ResizeObserver` |
| `npm run test:browser` | `tests/browser/smoke.js` (puppeteer, 390 px) | Butuh `npm i -D puppeteer`, di luar CI |
| `npm run test:bot` | `build-bot.js` + `tests/bot.test.mjs` | Lulus |

CI (`.github/workflows/ci.yml`): `npm ci`, `npm run check`, `npm test`. Deploy bot (`deploy-bot.yml`) dipicu push yang menyentuh `bot/**`, `build-bot.js`, `js/core/**`, `wrangler.toml`, `package.json`.

`tests/schedule/` memuat `index.html` di jsdom dengan harness sendiri (`tests/schedule/ui.js`) — itu sebabnya lulus, sedangkan `tests/e2e/` belum.

## 9. Konvensi kerja

1. Jangan edit `index.html` atau `dist/`; keduanya hasil build.
2. Berkas baru: tambah `<script src="js/...">` di `index.dev.html` pada posisi benar, lalu `npm run build`.
3. Sebelum commit: `npm run check` dan `npm test` lulus; `index.html` dan `dist/` ikut di-commit.
4. Logika murni (tanpa DOM, tanpa `localStorage`) masuk `js/core/`, supaya bisa dipakai bot via `build-bot.js`. Fungsi yang diambil bot harus top-level dan ditutup `}` di kolom 0.
5. Kunci status tagihan selalu `itemId|YYYY-MM-DD`. Mengubah kunci memutus `paid`, `skip`, dan `real`.
6. Semua data masuk lewat `norm()`. Field baru wajib punya normalisasi.
7. Tidak ada `js/ui/sync.js`; modul sinkron ada di `js/sync.js`.

## 10. Batas yang perlu diketahui

- `tests/e2e/` dan `tests/rebalance/` merah karena harness (bukan regresi logika). `tests/e2e/` kurang `matchMedia`, `ResizeObserver`, dan sebagian elemen baru di `tools/rebalance/index.html`.
- `js/ui/agenda.js` tidak dimuat `index.dev.html`; 140 baris mati.
- `js/ui/trip.js` (1.695) dan `js/ui/price-modal.js` (1.062) memegang porsi logika UI terbesar dan paling sedikit tercakup tes.
- README masih menjelaskan struktur lama; dokumen ini yang dipakai sebagai rujukan.
