# Bot Telegram — cara pasang (Rp0)

Semua angka bot dihitung dari modul yang sama dengan web (`js/core/*`), dirakit oleh
`node build-bot.js` menjadi `bot/core.mjs`. Tidak ada rumus duplikat.

## Yang sudah ada

| File | Isi |
|---|---|
| `build-bot.js` | rakit `bot/core.mjs` dari `js/core/*` + `parseQuickItem`, `kas*` |
| `bot/router.mjs` | semua perintah chat (`@saldo`, `@beli`, ...) — fungsi murni, tanpa DOM |
| `bot/report.mjs` | data laporan harian/mingguan/bulanan/tahunan |
| `bot/pdf.mjs` | render PDF A4 (pdf-lib), cek margin/overlap otomatis |
| `bot/store.mjs` | baca/tulis `rk_state` di Supabase dengan `rev` compare-and-swap |
| `bot/telegram.mjs` | `sendMessage` / `sendDocument` |
| `bot/worker.mjs` | webhook `/tg` + cron tgl 1 (laporan bulanan) |
| `bot/dev.mjs` | uji lokal tanpa Telegram/Supabase |
| `tests/bot.test.mjs` | 11 tes: angka = `calc()`, mutasi state, whitelist, PDF |

Coba lokal tanpa kredensial apa pun:

```bash
npm run test:bot
node bot/dev.mjs "@saldo" "@beli Netflix 186k tiap tgl 15" "@laporanbulanan nov"
node bot/dev.mjs --pdf bulanan jan      # tulis PDF ke folder temp
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `@keterangan` | daftar perintah |
| `@saldo` | saldo realtime (kas) + sisa akhir tahun + total tagihan |
| `@jatah` | jatah jajan per bulan |
| `@tagihan` | telat + jatuh tempo 7 hari |
| `@rekap [bulan]` | masuk/keluar/tagihan/saldo akhir bulan |
| `@cari <kata>` | cari item |
| `@beli <teks>` | Tambah Cepat (parser sama dengan tab Kelola Item) |
| `@lunas <nama> [tgl]` | tandai lunas |
| `@hapus <nama\|id>` | hapus item |
| `@laporanharian [tgl]` | PDF hari ini / tanggal tertentu |
| `@laporanmingguan` | PDF 7 hari terakhir |
| `@laporanbulanan [bln]` | PDF sebulan |
| `@laporantahun` | PDF rekap 12 bulan |

## Kredensial yang Anda ambil

| Nama secret | Dari mana |
|---|---|
| `TG_TOKEN` | Telegram → `@BotFather` → `/newbot` → token |
| `TG_SECRET` | string acak buatan sendiri (mis. `openssl rand -hex 24`) |
| `MY_TG` | chat id Anda (lihat langkah 2) |
| `SB_URL` | Supabase → Settings → API → Project URL |
| `SB_KEY` | Supabase → Settings → API → `service_role` key |

Nilai-nilai ini **hanya** masuk lewat `wrangler secret put`, jangan ke chat/repo/`js/config.js`.

## Langkah pasang

1. **Buat bot**: `@BotFather` → `/newbot` → simpan token.
2. **Ambil chat id**: kirim satu pesan ke bot, lalu buka
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → lihat `"chat":{"id":...}`.
3. **Deploy**:
   ```bash
   npm i -g wrangler      # sekali saja
   wrangler login
   cd C:/Users/daffa/Documents/GitHub/RencanaKeuangan
   npm run build:bot
   wrangler deploy                        # menghasilkan https://rencana-bot.<subdomain>.workers.dev
   ```
4. **Isi secret** (satu perintah, tempel nilainya saat diminta):
   ```bash
   wrangler secret put TG_TOKEN
   wrangler secret put TG_SECRET
   wrangler secret put MY_TG
   wrangler secret put SB_URL
   wrangler secret put SB_KEY
   ```
5. **Sambungkan webhook** (ganti `<worker>` dan `<acak>`):
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<worker>.workers.dev/tg&secret_token=<acak>"
   ```
   `secret_token` harus sama dengan `TG_SECRET`. Worker menolak (403) permintaan tanpa header itu.
6. **Uji**: kirim `@keterangan`, `@saldo`, `@laporanbulanan`.

## Catatan

- **Wajib**: `MY_TG` terisi. Tanpa whitelist, siapa pun yang menemukan bot bisa `@hapus` data.
- Bot memakai **tahun aktif** yang tersimpan di state web (`all.year`), sama seperti tampilan web.
- Penulisan state memakai `rev` CAS: kalau web menyimpan bersamaan, bot membatalkan dan minta ulang
  (tidak ada data yang saling menimpa).
- `calc()` sengaja mengabaikan `paid` — sama dengan web, jadi angka bot = angka kartu web.
- Cron `0 1 1 * *` (UTC) = tgl 1 pukul 08:00 WIB: laporan bulanan bulan lalu dikirim otomatis.
- Supabase free di-pause setelah 7 hari idle; cron bulanan belum cukup untuk itu. Kalau bot terasa
  "tidur", buka web sekali atau tambah cron harian `["0 1 * * *"]` di `wrangler.toml`.
