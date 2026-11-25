# Laporan Tahap 20 — Perluasan Kategori Pemasukan (`+ Masuk`) & Keseragaman Logo Desktop + APK

Tanggal: 25 November 2026  
Proyek: **RencanaKeuangan (RenKeu)**  
Ruang lingkup: Perluasan kategori pemasukan (`KAS_IN`), keseragaman logo kategori di Desktop (`BR_CAT_META`) dan APK (`MOB_CAT_META`), perbaikan daftar kategori `+ Masuk` di APK agar memakai `KAS_IN` sebagai satu sumber kebenaran, serta reset otomatis kategori saat berganti tipe transaksi (`+` ↔ `-`).

---

## 1. Masalah Sebelum Perbaikan

1. **Desktop (`js/ui/kas.js` & `js/ui/browser-app.js`)**: Tab **Transaksi → Catat Transaksi Baru → `+ Pemasukan`** hanya menyediakan 3 kategori di `KAS_IN` (`Gaji`, `Transfer`, `Lainnya`).
2. **APK (`js/ui-mobile/mobile-app.js`)**: `renderMobKas()` memakai `allCategories().slice(0, 8)` untuk **semua** tipe transaksi, sehingga `+ Masuk` menampilkan kategori pengeluaran (`Langganan`, `Tagihan rutin`, `Kesehatan`, dst.) dan handler `[data-mktype]` tidak mereset `MOB_STATE.kasCat` saat berganti tipe transaksi.

---

## 2. Daftar Final `KAS_IN` & Desain Logo Seragam

Sumber tunggal di `js/ui/kas.js`:

```js
var KAS_IN = ['Gaji', 'Bonus', 'Freelance', 'Usaha', 'Investasi', 'Hadiah', 'Refund', 'Transfer', 'Lainnya'];
```

**Alasan urutan & komposisi (9 kategori):**
- `Gaji` di posisi pertama sebagai pemasukan rutin paling umum.
- `Bonus`, `Freelance`, `Usaha`, `Investasi` mencakup sumber pemasukan aktif & pasif utama pengguna pribadi.
- `Hadiah`, `Refund`, `Transfer` mencakup pemasukan insidental/pengembalian/perpindahan dana.
- `Lainnya` tetap di posisi terakhir sebagai fallback umum.
- `Investasi` memakai ulang entri logo yang sudah ada (tanpa duplikasi).

### Tabel Logo Kategori (`BR_CAT_META` & `MOB_CAT_META` — Identik 100%)

Semua ikon memakai format seragam `{ hex, grad: [c1, c2], svg }` pada `viewBox="0 0 24 24"`, bidang utama putih (`#FFFFFF` / `#ECFDF5`) dengan aksen kuning hangat (`#FDE047` / `#FEF08A`), dan gradien berbeda di tiap kategori:

| # | Kategori | Status Logo | `hex` | Gradien (`grad`) | Motif Ikon SVG |
|---|----------|-------------|-------|------------------|----------------|
| 1 | **Gaji** | Sudah ada (disamakan di APK) | `#16A34A` | `#16A34A → #65A30D` | Lembar uang + kilau kuning |
| 2 | **Bonus** | **Baru** | `#D97706` | `#F59E0B → #E11D48` | Bintang putih + titik kilau kuning |
| 3 | **Freelance** | **Baru** | `#7C3AED` | `#8B5CF6 → #4F46E5` | Laptop putih + aksen garis layar kuning |
| 4 | **Usaha** | **Baru** | `#EA580C` | `#F97316 → #DC2626` | Toko/etalase putih + kanopi kuning |
| 5 | **Investasi** | Pakai ulang (disamakan) | `#0D9488` | `#10B981 → #0284C7` | Grafik batang naik + garis tren kuning |
| 6 | **Hadiah** | **Baru** | `#DB2777` | `#EC4899 → #F43F5E` | Kotak kado putih + pita kuning |
| 7 | **Refund** | **Baru** | `#0284C7` | `#06B6D4 → #2563EB` | Panah putar balik putih + koin kuning |
| 8 | **Transfer** | Sudah ada di Desktop (ditambah ke APK) | `#0D9488` | `#14B8A6 → #0284C7` | Panah dua arah horizontal |
| 9 | **Lainnya** | Sudah ada (disamakan) | `#64748B` | `#64748B → #475569` | Tiga titik horizontal |

> Bonus konsistensi: `Penginapan` (anggota `KAS_OUT`) yang sebelumnya belum ada di `MOB_CAT_META` juga disamakan agar 100% kategori `KAS_IN` dan `KAS_OUT` punya logo lengkap di kedua mode.

---

## 3. Daftar File & Perubahan

| File | Ringkasan Perubahan |
|------|---------------------|
| `js/ui/kas.js` (baris 24) | Memperluas `KAS_IN` dari 3 menjadi 9 kategori (`Gaji` pertama, `Lainnya` terakhir). Konsumen lain di Desktop (filter Riwayat `#kas-filter-cat`, form quick-tx, datalist) otomatis mengikuti `KAS_IN`. |
| `js/ui/browser-app.js` (baris 59–90) | Menambahkan entri logo `Bonus`, `Freelance`, `Usaha`, `Hadiah`, `Refund` ke `BR_CAT_META`. |
| `js/ui-mobile/mobile-app.js` (baris 309, 318–336) | Menyamakan `MOB_CAT_META` dengan `BR_CAT_META` untuk seluruh kategori `KAS_IN` (`Gaji`, `Bonus`, `Freelance`, `Usaha`, `Investasi`, `Hadiah`, `Refund`, `Transfer`, `Lainnya`) + `Penginapan`. |
| `js/ui-mobile/mobile-app.js` (baris 2281–2310) | Menambah helper `mobKasPillCats(type)`: saat `type === '+'` memakai seluruh `KAS_IN` tanpa `.slice(0, 8)`; saat `'-'` tetap `allCategories().slice(0, 8)`. Menambah guard reset `MOB_STATE.kasCat` jika tidak ada di daftar aktif, memperbaiki wrap teks label pill (`overflow-wrap:anywhere`), dan menyertakan `KAS_IN` di filter Riwayat APK (`#m-kas-flt-cat`). |
| `js/ui-mobile/mobile-app.js` (baris 5866–5874) | Memperbarui handler klik `[data-mktype]` agar langsung mereset `MOB_STATE.kasCat` ke kategori pertama tipe baru bila kategori sebelumnya tidak cocok. |
| `tests/schedule/tahap20_kas_in_categories.test.js` | Tes otomatis baru memverifikasi: (a) daftar final `KAS_IN`, (b) kelengkapan & kesamaan logo `BR_CAT_META` ↔ `MOB_CAT_META` untuk semua `KAS_IN` & `KAS_OUT`, (c) render pill & filter Desktop, (d) render pill APK (`+` tampil 9 kategori, `-` tetap 8 kategori pengeluaran) + reset `MOB_STATE.kasCat` saat toggle `+` ↔ `-`, (e) 0 error runtime. |
| `index.html`, `dist/index.html` | Hasil build otomatis dari `npm run build` (tidak diedit manual). |

**Yang tidak disentuh (sesuai batasan keras):** rumus saldo/perhitungan keuangan, skema transaksi (`d, t, amt, cat, note, debt*`), kunci `localStorage`, `norm()`, sinkronisasi Supabase, kode `bot/`, serta mekanisme update APK (`rkCheckApkUpdate`, `rkInstallApkInApp`, `ApkInstallerPlugin`, `android-debug.yml`).

---

## 4. Hasil Verifikasi Perintah Nyata

Semua perintah dijalankan setelah perubahan terakhir:

| Perintah | Hasil | Bukti Output |
|----------|-------|--------------|
| `npm run build` | **PASS** | `index.html + dist/index.html dibuat (1727 KB, 41 file js) beserta file pendukung` |
| `node build.js --check` | **PASS** | `OK: index.html sinkron dengan sumber (41 file js).` |
| `npm run check` | **PASS** | `OK: 54 skrip dikompilasi tanpa error sintaks; index.html sinkron dengan sumber.` |
| `npm test` (unit) | **PASS** | `tests 78`, `pass 78`, `fail 0` |
| `npm test` (jadwal) | **PASS** | `55/55` berkas `OK`, termasuk `OK tahap20_kas_in_categories.test.js` (`Semua tes jadwal lulus.`) |
| `npm run test:bot` | **PASS** | `tests 18`, `pass 18`, `fail 0` |

---

## 5. Bukti Visual (Screenshot)

Semua screenshot diambil langsung dari hasil build `index.html` memakai Headless Chrome dan disimpan di luar repositori pada `C:\Users\daffa\Documents\verif-tahap-20\`:

| Berkas | Mode & Lebar | Tipe | Jumlah Pill | `overflowX` | `gridOverflow` | Tinggi Min Pill | Teks Terpotong |
|--------|--------------|------|-------------|-------------|----------------|-----------------|----------------|
| `C:\Users\daffa\Documents\verif-tahap-20\desktop-1440-masuk.png` | Desktop `1440px` | `+ Pemasukan` | 9 | `false` | `false` | `44px` | Tidak ada |
| `C:\Users\daffa\Documents\verif-tahap-20\desktop-1440-keluar.png` | Desktop `1440px` | `− Pengeluaran` | 6 | `false` | `false` | `44px` | Tidak ada |
| `C:\Users\daffa\Documents\verif-tahap-20\desktop-1024-masuk.png` | Desktop `1024px` | `+ Pemasukan` | 9 | `false` | `false` | `44px` | Tidak ada |
| `C:\Users\daffa\Documents\verif-tahap-20\desktop-1024-keluar.png` | Desktop `1024px` | `− Pengeluaran` | 6 | `false` | `false` | `44px` | Tidak ada |
| `C:\Users\daffa\Documents\verif-tahap-20\apk-390-masuk.png` | APK `390px` | `+ Masuk` | 9 | `false` | `false` | `44px` | `[]` (0) |
| `C:\Users\daffa\Documents\verif-tahap-20\apk-390-keluar.png` | APK `390px` | `− Keluar` | 8 | `false` | `false` | `44px` | `[]` (0) |

Semua gambar sudah diperiksa secara visual: ikon 9 kategori pemasukan tampil tajam, warna gradien saling kontras, grid 2 kolom di APK menampilkan seluruh 9 pill tanpa scroll tersembunyi, dan `- Keluar` di APK tidak berubah.

---

## 6. Hal yang Belum Terverifikasi & Catatan

1. **Build APK fisik / `npx cap sync android`**: Belum dijalankan pada tahap ini (fokus perubahan ada di sumber web + hasil `npm run build` di `index.html` & `dist/index.html`). Sebelum kompilasi APK Android, jalankan `npm run cap:sync`.
2. **Git push**: Tidak dilakukan (`git push` ke `main` dilarang pada instruksi karena memicu workflow build APK & force update). Perubahan hanya ada di lokal.
3. **Catatan visual di luar cakupan Tahap 20 (bawaan sebelumnya)**: Pada `css/mobile.css:1272` (`body[data-shell="mobile-app"] #mobile-app-shell .active .cat-check-ico`), karena panel tab aktif `#m-tab-kas` juga memiliki kelas `.active`, ikon centang kecil `.cat-check-ico` tampil di semua pill kategori APK (baik `+ Masuk` maupun `- Keluar`). Hal ini merupakan perilaku CSS bawaan sebelum Tahap 20 dan sengaja tidak diubah agar perubahan tetap minimal sesuai cakupan tugas.
