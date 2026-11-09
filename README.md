# Rencana Keuangan

Perencana keuangan berbasis **jadwal tagihan**: isi item (harga, siklus, tanggal mulai), program menghitung tanggal tiap tagihan,
rincian arus kas per bulan, status lunas/lewati, pengingat, kategori, dan data per tahun. Berjalan penuh di browser
(vanilla JS, tanpa framework), data tersimpan lokal dan bisa disinkron lewat Supabase.

## Memasang

**Cara 1 – satu file (paling mudah).** Unggah `index.html` (hasil build: sudah berisi CSS dan semua skrip) ke repo GitHub.
Aktifkan GitHub Pages (Settings → Pages → Deploy from branch → `main`, `/ (root)`).

**Cara 2 – seluruh proyek.** Unggah semua isi folder ini; GitHub Pages memakai `index.html` di root. Untuk mencoba tanpa build,
buka `index.dev.html` (memuat `css/` dan `js/` apa adanya, bisa dari `file://`).

### Supabase (opsional, untuk sinkron antar perangkat)
1. SQL Editor → jalankan `schema.sql` (tabel `rk_state` + Row Level Security: tiap akun hanya melihat datanya sendiri).
2. Authentication → Users → Add user (centang Auto Confirm), lalu **matikan** pendaftaran baru (Allow new users to sign up).
3. Isi `js/config.js`: `SB_URL` (hanya `https://xxxx.supabase.co`, tanpa `/rest/v1/`) dan `SB_KEY` (**Publishable key**, jangan kunci secret).
4. Buka aplikasi → Impor / Ekspor → **Jalankan cek sistem** untuk memastikan semuanya tersambung (termasuk tes tulis dan baca balik).

Tanpa Supabase aplikasi tetap penuh fungsi dengan penyimpanan lokal (localStorage).

## Struktur

```
index.dev.html        SUMBER markup + daftar <script> (urutan penting); bisa dibuka langsung
index.html            HASIL build (satu file) = yang dipakai GitHub Pages. Jangan diedit langsung
css/style.css         seluruh gaya (tema lewat variabel CSS) + kelas utilitas pengganti style= inline
css/fonts/            Plus Jakarta Sans (latin, variabel) + lisensi OFL; disematkan ke index.html oleh build.js
js/config.js          satu-satunya file konfigurasi (Supabase)
js/core/              logika murni, TANPA DOM -> bisa diuji sebagai unit
  util.js             format uang/tanggal, escape HTML
  schedule.js         mesin jadwal: tanggal tagihan, perubahan harga/siklus (ch), batas berhenti
  state.js            data per tahun (ALL/S), normalisasi, simpan, cadangan otomatis, gabung data
  items.js            operasi item, kategori, pindah status lunas saat jadwal bergeser, bawa penyesuaian
  calc.js             arus kas bulanan (pengeluaran, penyesuaian saldo tunggal/berulang, kategori)
  csv.js              baca/tulis CSV
  reminders.js        tagihan terlambat / akan datang, tandai lunas massal
  match.js            pencocokan transaksi Catatan Kas dengan tagihan (tautan S.real) + data rencana vs realisasi
  cicilan.js          kemajuan, sisa, dan bunga cicilan/utang
js/ui/                tampilan + event listener (tiap file punya fungsi bindXxx())
  render.js           renderAll(): memperbarui semua tampilan dari state
  rincian.js jadwal.js items.js years.js header.js adjust.js price-modal.js reminders.js skiprange.js
  kas.js trip.js theme.js topbar.js nav.js tip.js agenda.js realisasi.js cicilan.js io.js backup.js diag.js dom.js
js/sync.js            sinkron Supabase + dialog konflik
js/app.js             titik masuk: muat data -> bind semua -> render -> sinkron
build.js              gabungkan index.dev.html + css + js -> index.html (+ dist/); `node build.js --check` memeriksa kesegarannya
tests/                unit, e2e (jsdom), dan tes browser sungguhan
```

Semua skrip adalah skrip klasik (bukan ES module) yang berbagi lingkup global, jadi bisa dibuka langsung dari `file://`
dan di-host di GitHub Pages tanpa bundler. Urutan di `index.dev.html` harus: config → core → ui → sync → app.

## Catatan fitur (Tahap 1-2)

- **Kategori investasi.** Item yang kategorinya mengandung `invest`, `dca`, `saham`, `reksa`, `etf`, `sbn`, `obligasi`, `emas`, `kripto` atau `crypto`
  (huruf besar/kecil tidak berpengaruh) dihitung sebagai investasi (`isInvestCat` di `js/core/items.js`). Uangnya tetap keluar dari kas, tetapi
  di Rincian Bulanan ditampilkan terpisah: "Investasi (aset)", rasio terhadap pemasukan tercatat (baris `+` di Catatan Kas tahun aktif, mulai
  bulan saldo), dan "Di luar investasi", plus tautan ke Rebalance porto.
- **Aman dipakai hari ini.** Saldo Realtime dikurangi tagihan belum lunas (termasuk yang terlambat) sampai akhir bulan, dibagi sisa hari.
  Hanya tampil bila Catatan Kas tergabung ada dan tahun aktif = tahun berjalan.
- **Agenda 30 hari.** Tagihan belum lunas + baris Catatan Kas di bulan sesudah bulan saldo (mis. gaji), saldo berjalan, dan penanda saldo terendah.
- **Ubah harga / jadwal.** Pilihan tujuan: Harga berubah (dengan chip cepat +5/+10/+15/-10%), Harga sementara, Ganti seberapa sering bayar,
  Geser tanggal bayar, **Berhenti bayar** (mengisi tanggal berhenti item; bisa diurungkan lewat toast), dan Atur manual.
- **Navigasi.** Desktop: menu "Alat" di topbar. HP (lebar <= 720px): bilah menu bawah (Rincian, Kas, Jadwal, Perjalanan atau Item, Lainnya).
- **Rencana vs realisasi (Tahap 3).** Transaksi keluar di Catatan Kas bisa *ditautkan* ke satu tagihan (`S.real[kunciTagihan] = {tx}`): tagihan otomatis
  lunas, transaksi itulah yang dihitung di kas (baris turunan "(lunas)" tagihan itu dilewati, jadi tidak terhitung dua kali), dan realisasi
  (jumlah + tanggal) mengikuti transaksi. Pencocokan memakai nama, jumlah, dan tanggal (maks 10 hari): yang sangat cocok dan tunggal otomatis
  dilunasi saat dicatat (bisa dimatikan di kartu "Cocokkan dengan tagihan", bisa diurungkan); sisanya jadi saran yang bisa diterima atau ditolak
  ("Bukan"). Tagihan yang sudah lunas manual dan punya transaksi yang sama ditawarkan untuk "Gabungkan". Kartu "Rencana vs realisasi" di Rincian
  menampilkan selisih per bulan dan yang terbesar.
- **Cicilan & utang.** Item dengan batas berhenti (berhenti setelah N kali atau sampai tanggal) tampil di kartu "Cicilan & utang": sisa tenor,
  sisa kewajiban, tanggal lunas, dan, bila "Pokok pinjaman" diisi di form item, total bunga/biaya. Tahun yang tidak ada datanya dan sudah lewat
  dianggap lunas (dicatat sebagai asumsi di kartu).
- **Grafik.** Warna kategori stabil berdasarkan nama (`catColor`, investasi selalu indigo). Tooltip (`data-tip`) muncul saat disorot, difokus, atau
  diketuk, dan nominalnya disamarkan saat Mode Privasi aktif. Tersedia empty state dengan tombol aksi (`data-goto` membuka tab tujuan).
- **Tema & font.** Tombol topbar: Otomatis > Terang > Gelap. Hitam-putih dipilih dari menu Alat / Lainnya. Font Plus Jakarta Sans disematkan
  (tanpa Google Fonts) sehingga aplikasi jalan offline.
- **Perjalanan.** Tersembunyi bila belum ada data perjalanan; pilihan "Tampilkan Perjalanan" di menu Alat / Lainnya (data tidak dihapus saat disembunyikan).

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
npm run build        # index.dev.html + css/ + js/  ->  index.html (+ dist/)
npm run check        # error sintaks di js/ atau bundel, dan index.html masih sinkron dengan sumber
npm test             # build + check + tes unit + tes jadwal
npm run test:browser # opsional, butuh: npm i -D puppeteer
```

**Alur kerja:** edit HANYA sumber (`js/`, `css/`, `index.dev.html`), jalankan `npm run build`, lalu commit `index.html` dan `dist/` yang baru.
CI (`.github/workflows/ci.yml`) menolak commit yang bundelnya usang atau yang punya error sintaks, supaya satu salah ketik tidak mematikan seluruh aplikasi lagi.

Menambah fitur: (1) logika di `js/core/` + tes unit di `tests/unit/`, (2) tampilan di `js/ui/` dengan fungsi `bindXxx()` dipanggil di `app.js`,
(3) skrip baru ditambahkan ke `index.dev.html`, (4) tes UI di `tests/schedule/`, (5) `npm run build` lalu `npm test`.

## Tes

| Jenis | Lokasi | Isi |
|---|---|---|
| Unit | `tests/unit/core.test.js` | jadwal, harga, hitungan, pengingat, remap status, norm, CSV, gabung data, cadangan |
| Jadwal (jsdom) | `tests/schedule/*.test.js` | UI Rincian/Jadwal/Kas pada `index.html` hasil build: geser tanggal, ubah harga, lunas/lewati, saldo realtime, simulasi |
| E2E (jsdom, **usang**) | `tests/e2e/*.js` | seluruh alur UI: item, ubah harga/jadwal, lunas/lewati, saldo, pengingat, kategori, impor/ekspor, sinkron (server Supabase tiruan). Ditulis untuk UI lama dan sebagian gagal; belum ikut `npm test` (`npm run test:e2e`) |
| Browser | `tests/browser/smoke.js` | Chrome sungguhan: lebar HP 390 px terang/gelap, jendela, unduhan file, tangkapan layar |

Tes e2e tidak menyentuh Supabase asli. Untuk Supabase sungguhan pakai **Impor / Ekspor → Jalankan cek sistem** di aplikasi.

## Keamanan

- Publishable key memang boleh publik; yang melindungi data adalah **RLS** di `schema.sql` dan login. Jangan pernah menaruh kunci *secret*/`service_role` di repo (cek sistem akan memperingatkan).
- Matikan pendaftaran baru di Supabase setelah akun Anda dibuat.
- Tindakan yang merusak (hapus tahun/item, impor, pulihkan contoh, memuat data cloud) membuat **cadangan otomatis** (5 terakhir) dan menampilkan tombol **Urungkan**.

## Alat tambahan (r18): Rebalance porto & IBKR vs Flip

Dua tab baru di bar atas (di samping Rencana Keuangan dan Perjalanan). Keduanya **berdiri sendiri dan tidak terhubung ke data Rencana Keuangan**.

- File: `tools/rebalance/` (kalkulator rebalancing), `tools/ibkr-flip/` (simulator deposit IBKR), `tools/bridge.js` (jembatan penyimpanan). Ditampilkan lewat iframe, jadi kode dan gayanya tidak bentrok dengan aplikasi utama.
- Penyimpanan: isian disimpan di perangkat (`localStorage`, kunci `rk-tool-<nama>`) dan, setelah masuk, di Supabase tabel `rk_tools` (satu baris per akun per alat, terlindungi RLS, terpisah dari `rk_state`). Bila data lokal dan cloud berbeda, yang paling baru dipakai.
- Pasang: (1) jalankan bagian bawah `schema.sql` (bagian "Alat") di Supabase SQL Editor satu kali; (2) unggah `index.html` dan folder `tools/` ke repo. Sebelum tabel dibuat, alat tetap jalan dan menyimpan di perangkat; statusnya menampilkan pesan.
- Data alat tidak ikut Impor/Ekspor Rencana Keuangan.
- Kalkulator rebalancing memakai Tailwind dan Chart.js dari CDN, jadi butuh internet.
- Catatan: tab Perjalanan ada di `js/ui/trip.js`; alat-alat ini berada di `tools/` dan disalin ke `dist/tools/` oleh `build.js`.

## Pembaruan alat Rebalance porto (r19)

- **Fee broker**: isian fee Stockbit (saat beli saham, mengurangi saldo RDN) dan fee IBKR (saat beli ETF, dikurangkan dari dana yang masuk). Kosong = tanpa fee.
- **Setoran per bulan**: tiap kartu di Rencana Aksi punya ceklist. Tidak dicentang = sama dengan "Dana baru per bulan"; dicentang = isi nominal manual untuk bulan itu. Rencana pemulihan dihitung ulang bulan demi bulan.
- **Tautan IBKR vs Flip**: ceklist di tab IBKR vs Flip mengirim rute termurah (kurs efektif + biaya rute) ke tab Rebalance. Saat terhubung, kurs USD/IDR dan biaya wire di Rebalance terkunci memakai hasil itu; bila dimatikan, isian manual kembali.

Uji: `npm i` lalu `npm run test:rebalance`.
