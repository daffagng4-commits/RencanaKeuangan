# Rencana Keuangan

Perencana keuangan berbasis **jadwal tagihan**: isi item (harga, siklus, tanggal mulai), program menghitung tanggal tiap tagihan,
rincian arus kas per bulan, status lunas/lewati, pengingat, kategori, dan data per tahun. Berjalan penuh di browser
(vanilla JS, tanpa framework), data tersimpan lokal dan bisa disinkron lewat Supabase.

## Memasang

**Cara 1 – satu file (paling mudah).** Jalankan `npm run build` lalu unggah `dist/index.html` ke repo GitHub dengan nama `index.html`.
Aktifkan GitHub Pages (Settings → Pages → Deploy from branch → `main`, `/ (root)`).

**Cara 2 – folder penuh.** Unggah isi folder ini (`index.html`, `css/`, `js/`) apa adanya ke repo. Tidak perlu build.

### Supabase (opsional, untuk sinkron antar perangkat)
1. SQL Editor → jalankan `schema.sql` (tabel `rk_state` + Row Level Security: tiap akun hanya melihat datanya sendiri).
2. Authentication → Users → Add user (centang Auto Confirm), lalu **matikan** pendaftaran baru (Allow new users to sign up).
3. Isi `js/config.js`: `SB_URL` (hanya `https://xxxx.supabase.co`, tanpa `/rest/v1/`) dan `SB_KEY` (**Publishable key**, jangan kunci secret).
4. Buka aplikasi → Impor / Ekspor → **Jalankan cek sistem** untuk memastikan semuanya tersambung (termasuk tes tulis dan baca balik).

Tanpa Supabase aplikasi tetap penuh fungsi dengan penyimpanan lokal (localStorage).

## Struktur

```
index.html            markup + daftar <script> (urutan penting)
css/style.css         seluruh gaya (tema terang/gelap lewat variabel CSS)
js/config.js          satu-satunya file konfigurasi (Supabase)
js/core/              logika murni, TANPA DOM -> bisa diuji sebagai unit
  util.js             format uang/tanggal, escape HTML
  schedule.js         mesin jadwal: tanggal tagihan, perubahan harga/siklus (ch), batas berhenti
  state.js            data per tahun (ALL/S), normalisasi, simpan, cadangan otomatis, gabung data
  items.js            operasi item, kategori, pindah status lunas saat jadwal bergeser, bawa penyesuaian
  calc.js             arus kas bulanan (pengeluaran, penyesuaian saldo tunggal/berulang, kategori)
  csv.js              baca/tulis CSV
  reminders.js        tagihan terlambat / akan datang, tandai lunas massal
js/ui/                tampilan + event listener (tiap file punya fungsi bindXxx())
  render.js           renderAll(): memperbarui semua tampilan dari state
  rincian.js jadwal.js items.js years.js header.js adjust.js price-modal.js reminders.js skiprange.js
  io.js backup.js diag.js dom.js
js/sync.js            sinkron Supabase + dialog konflik
js/app.js             titik masuk: muat data -> bind semua -> render -> sinkron
build.js              gabungkan semua jadi dist/index.html (satu file)
tests/                unit, e2e (jsdom), dan tes browser sungguhan
```

Semua skrip adalah skrip klasik (bukan ES module) yang berbagi lingkup global, jadi bisa dibuka langsung dari `file://`
dan di-host di GitHub Pages tanpa bundler. Urutan di `index.html` harus: config → core → ui → sync → app.

## Model data

```
ALL = { year, rev, data: { [tahun]: Y } }        // satu objek per akun; `rev` = penanda versi untuk sinkron
Y   = { saldo, startMonth, items[], paid{}, skip{}, adj[] }
item = { id, name, price, n, unit, start, end, cnt, cat, ch[] }
  unit: hari | minggu | bulan | tahun | sekali       end/cnt: batas berhenti (tanggal / jumlah kali)
  ch[] (perubahan): { from, to, price, n, unit, cut }  -> harga/siklus berubah mulai `from`
                    (to = sementara; n/unit = siklus baru; cut = hapus tagihan sebelum `from`)
paid / skip: { "<id item>|YYYY-MM-DD": 1 }        // status per tagihan (satu tagihan hanya satu status)
adj  = { id, t:'+'|'-', amt, note, m (bulan mulai | null = gabung ke saldo awal), rep:{n,cnt}|null }
```

Tagihan **tidak disimpan**; selalu dihitung dari item (`series()` di `schedule.js`). Karena itu mengubah item cukup satu tempat.
Status lunas/lewati disimpan per tanggal; bila tanggal bergeser, `remapStatus()` memindahkannya ke tanggal baru terdekat.

## Pengembangan

```
npm install          # sekali (hanya jsdom untuk tes)
npm run build        # -> dist/index.html
npm test             # build + tes unit + tes e2e
npm run test:browser # opsional, butuh: npm i -D puppeteer
```

Menambah fitur: (1) logika di `js/core/` + tes unit di `tests/unit/`, (2) tampilan di `js/ui/` dengan fungsi `bindXxx()` dipanggil di `app.js`,
(3) skrip baru ditambahkan ke `index.html`, (4) tes e2e di `tests/e2e/`, (5) `npm test`.

## Tes

| Jenis | Lokasi | Isi |
|---|---|---|
| Unit | `tests/unit/core.test.js` | jadwal, harga, hitungan, pengingat, remap status, norm, CSV, gabung data, cadangan |
| E2E (jsdom) | `tests/e2e/*.js` | seluruh alur UI: item, ubah harga/jadwal, lunas/lewati, saldo, pengingat, kategori, impor/ekspor, sinkron (server Supabase tiruan) |
| Browser | `tests/browser/smoke.js` | Chrome sungguhan: lebar HP 390 px terang/gelap, jendela, unduhan file, tangkapan layar |

Tes e2e tidak menyentuh Supabase asli. Untuk Supabase sungguhan pakai **Impor / Ekspor → Jalankan cek sistem** di aplikasi.

## Keamanan

- Publishable key memang boleh publik; yang melindungi data adalah **RLS** di `schema.sql` dan login. Jangan pernah menaruh kunci *secret*/`service_role` di repo (cek sistem akan memperingatkan).
- Matikan pendaftaran baru di Supabase setelah akun Anda dibuat.
- Tindakan yang merusak (hapus tahun/item, impor, pulihkan contoh, memuat data cloud) membuat **cadangan otomatis** (5 terakhir) dan menampilkan tombol **Urungkan**.
