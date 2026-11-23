# Rencana Audit Putaran 2 — Rencana Keuangan (RenKeu)

- **Baseline terverifikasi**: `npm test` (67/67 unit, 54/54 jadwal, `check-bundle` OK), `npm run test:bot` (18/18 bot).
- **Cakupan**: Aplikasi utama HTML Browser Mode (`index.dev.html`, `js/core/*`, `js/ui/*`, `js/sync.js`, `css/*`), APK Mobile Mode (`js/ui-mobile/mobile-app.js`, `css/mobile.css`), dan `android/`. Folder `tools/` dan `bot/` tetap di luar cakupan (kecuali `bot/core.mjs` yang ikut teruji via `npm run test:bot`).
- **Keputusan INFO-01 s.d. INFO-04 yang telah disetujui**:
  - `INFO-01`: Hapus `js/ui/agenda.js` dan bersihkan referensi di `README.md` & `ARSITEKTUR.md`.
  - `INFO-02`: Ubah `android:allowBackup` menjadi `"false"` di `android/app/src/main/AndroidManifest.xml`.
  - `INFO-03`: Perluas area sentuh (`>= 44×44 px`) untuk tombol header & `.seg-btn` Mode APK menggunakan hit-area transparan (`::before` / perluasan non-visual) tanpa mengubah tampilan visual.
  - `INFO-04`: Audit validasi `.github/workflows/android-debug.yml` saja (tanpa mengubah file workflow) dan dokumentasikan langkah pemicu manual.
- **Aturan keras**:
  - Tidak menambah fitur baru dan tidak merombak desain.
  - Tidak menghapus atau melonggarkan tes existing.
  - Tidak mengubah skema data tersimpan (`rencana-keuangan-v1`, `RK_SCHEMA_VER = 3`).
  - Setiap bug baru: tulis tes regresi yang gagal dulu di `tests/unit/`, perbaiki akar masalah secara bedah (`1 bug = 1 perubahan/commit terpisah`), lalu verifikasi hijau.
  - Perubahan teks Putaran 2 (`TX-11` dst.) **wajib** melalui tabel persetujuan (`file:baris | sebelum | sesudah | alasan`) sebelum diterapkan.

---

## Urutan Kerja (Dari Risiko Tertinggi ke Terendah)

### Langkah 1 — Audit Keluarga BUG-01 (Risiko Kritis: Konsistensi & Hitung Ganda Tagihan Tertaut `S.real`)
- **Target audit**: Semua jalur yang menghitung rencana + transaksi aktual:
  - `js/core/calc.js`, `js/core/reminders.js`, `js/core/match.js`
  - `js/ui/rincian.js`, `js/ui/kas.js`, `js/ui/report.js`, `js/ui/trip.js` (`simCalc` & ringkasan), `js/ui/browser-app.js` (kartu Rincian, grafik proyeksi, ekspor PDF/Excel, notifikasi)
  - `js/ui-mobile/mobile-app.js` (kartu saldo, grafik proyeksi, ringkasan, laporan)
  - `bot/core.mjs` (konsistensi angka via `test:bot`)
- **Tujuan**: Pastikan untuk satu set data dengan tagihan tertaut (`S.real`), angka saldo akhir, jatah/bulan, total pengeluaran tahun, grafik, dan laporan PDF identik lintas tampilan.
- **Verifikasi**: Tes regresi di `tests/unit/audit_putaran2.test.js` + verifikasi dinamis lintas modul.

### Langkah 2 — Audit Keluarga BUG-02 & BUG-05 (Risiko Tinggi: Parser & Formatter Angka Lain)
- **Target audit**: `js/ui/num-input.js`, `js/core/items.js` (parser Tambah Cepat), `js/core/csv.js`, `js/ui/io.js` (impor CSV/JSON), `js/ui/trip.js` (`tripParseRateLocale`, `xlParse`, `fxs`, `amtTxt`), `js/ui/browser-app.js`, `js/ui-mobile/mobile-app.js`.
- **Kasus uji ekstrem**: `"1.500.000,00"`, `"1,500,000.00"`, `"Rp 1,5jt"`, `"1.5jt"`, `"1 500 000"`, `"-500rb"`, `""`, `"abc"`, `"1e308"`, spasi berlebih, tanda negatif di tengah (`"50-000"`).
- **Verifikasi**: Tes regresi gagal-dulu lalu hijau di `tests/unit/audit_putaran2.test.js`.

### Langkah 3 — Audit Keluarga BUG-03 & BUG-08 + Migrasi Skema (Risiko Tinggi: Null Guard, `JSON.parse`, `localStorage`, Skema v1/v2 → v3)
- **Target audit**: Pemindaian skrip otomatis ke semua `JSON.parse`, `localStorage.getItem`/`setItem`, dan akses properti berantai di `js/core/*.js`, `js/sync.js`, `js/ui/*.js`, `js/ui-mobile/mobile-app.js`.
- **Pengujian migrasi**: `localStorage` kosong, JSON rusak, dan payload skema lama (`RK_SCHEMA_VER` 1 dan 2, serta format legacy tanpa `data`/`kas`) untuk memastikan migrasi ke v3 aman dan idempoten.
- **Verifikasi**: Tes unit migrasi & fuzz `localStorage` di `tests/unit/audit_putaran2.test.js`.

### Langkah 4 — Audit Alur Data End-to-End & Tanggal/Waktu (Risiko Tinggi–Sedang: Bagian E & F)
- **Target audit**:
  - Ekspor JSON → impor kembali (round-trip identik), impor Excel dengan baris cacat (`xlParse`), backup/restore, undo/redo berulang, edit & hapus transaksi lalu cek total/grafik/ringkasan.
  - Tanggal & waktu: pergantian bulan/tahun, 29 Februari, tanggal 31, zona waktu **WIB (`UTC+7`) vs UTC** (mis. transaksi jam `00:30 WIB` / `17:30 UTC` hari sebelumnya tidak boleh lompat hari di `todayISO()` / `isoD()` / filter laporan / pengingat), item berulang bulanan/mingguan/tahunan.
- **Target file**: `js/core/util.js`, `js/core/schedule.js`, `js/core/state.js`, `js/core/reminders.js`, `js/ui/io.js`, `js/ui/backup.js`, `js/ui/report.js`, `js/ui/trip.js`, `js/ui/browser-app.js`, `js/ui-mobile/mobile-app.js`.
- **Verifikasi**: Tes regresi e2e & timezone di `tests/unit/audit_putaran2.test.js` + `tests/schedule/`.

### Langkah 5 — Audit Keluarga BUG-04 (Risiko Sedang: Pemindai Otomatis HTML Rusak dalam Template String)
- **Target audit**: Skrip pemindai otomatis ke seluruh `js/**/*.js` dan `index.dev.html` untuk mendeteksi: kutip nyasar (`<tag"`), tag tidak tertutup/tidak seimbang, atribut dobel dalam satu elemen, dan ID duplikat pada DOM hasil render (Browser Mode & APK Mode).
- **Verifikasi**: Skrip pemindai melapor 0 anomali setelah perbaikan + tes DOM lulus.

### Langkah 6 — Audit Statis Sinkronisasi Supabase (`js/sync.js`, Bagian G)
- **Target audit**: `js/sync.js` — penanganan konflik lokal vs cloud, alur login-logout, sesi kedaluwarsa (`refreshSession` / `onAuthStateChange`), dan deep link OAuth (`id.renkeu.app://auth`).
- **Catatan**: Karena tanpa kredensial Supabase asli, temuan diberi label **`DUGAAN`** (kecuali bug logika murni yang dapat direproduksi di tes unit `tests/unit/sync_auth.test.js`).

### Langkah 7 — Eksekusi Temuan INFO-01 s.d. INFO-04 (Sesuai Keputusan Tahap 0)
- `INFO-01`: Hapus `js/ui/agenda.js`; perbarui referensi di `README.md` dan `ARSITEKTUR.md`.
- `INFO-02`: Ubah `android:allowBackup="false"` di `android/app/src/main/AndroidManifest.xml`.
- `INFO-03`: Perluas hit-area `>= 44×44 px` tanpa mengubah tampilan visual pada `#m-acct-btn`, `#m-btn-privacy`, `#m-btn-notif`, dan `.seg-btn` di `css/mobile.css`. Verifikasi bounding/hit-area di Headless Chrome `360×740`.
- `INFO-04`: Validasi penuh `.github/workflows/android-debug.yml` (YAML, Node 22, JDK 21, SDK 36, `cap:sync`, `./gradlew assembleDebug`) tanpa mengubah file workflow, lalu tulis panduan pemicu manual di `LAPORAN_AUDIT_2.md`.

### Langkah 8 — Audit Teks Antarmuka Putaran 2 (Tahap 4 — Gerbang Persetujuan Wajib)
- Kumpulkan seluruh string UI yang terlihat pengguna di `index.dev.html`, `js/sync.js`, `js/ui/*.js`, `js/ui-mobile/mobile-app.js` (judul, label, tombol, placeholder, toast, pesan error, empty state, tooltip, konfirmasi, notifikasi, nama file ekspor, teks PDF), tandai `TX-01` s.d. `TX-10` yang sudah selesai.
- Periksa konsistensi sapaan ("Anda"), istilah Pemasukan/Pengeluaran, tanda seru, *em dash*, klise AI, panjang teks di layar HP, singkatan (`rb`/`jt`/`Rp`), campuran bahasa tak disengaja, kapitalisasi, placeholder tersisa, error tanpa solusi, dan paritas teks desktop vs mobile.
- **Berhenti dan tampilkan tabel (`file:baris | sebelum | sesudah | alasan`) untuk persetujuan Anda** sebelum menerapkan `TX-11` dst.

### Langkah 9 — Build, `cap:sync`, Verifikasi Akhir & `LAPORAN_AUDIT_2.md` (Tahap 5)
- Jalankan `npm run build` dan `npm run cap:sync`; cocokkan SHA-256 `index.html` (root), `dist/index.html`, dan `android/app/src/main/assets/public/index.html`.
- Jalankan ulang `npm test`, `npm run test:bot`, dan audit Headless Chrome (`1440×900`, `768×1024`, `360×740`, `320×640`, light/dark, mode offline, XSS, tap-target, overflow).
- Tulis `LAPORAN_AUDIT_2.md` lengkap (termasuk bagian **"Pola yang sudah dipindai"** dengan jumlah lokasi diperiksa & hasilnya).
