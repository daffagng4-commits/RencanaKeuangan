# Pembaruan APK Rencana Keuangan (`id.renkeu.app`)

Dokumen ini menjelaskan cara kerja pembaruan APK Android langsung dari dalam aplikasi (in-app download + pemasang sistem Android), dengan cadangan browser/Salin tautan.

---

## 1. Ringkasan Arsitektur (Tahap 7)

```text
Push ke main / workflow_dispatch
   │
   ▼
GitHub Actions (.github/workflows/android-debug.yml)
   ├─ Menyematkan RK_BUILD_ID, RK_VERSION_CODE, RK_VERSION_NAME ke build web & Gradle
   ├─ Mendekode keystore tetap dari GitHub Secrets ke $RUNNER_TEMP
   ├─ Mem-build APK (assembleDebug) bertanda tangan keystore tetap
   └─ Mengunggah APK & catatan kunci=nilai (termasuk sha256=) ke GitHub Release `apk-latest`
         │
         ▼
Aplikasi Android (#mobile-app-shell → Menu → Pengaturan → Pembaruan Aplikasi)
   ├─ Cek https://api.github.com/repos/daffagng4-commits/RencanaKeuangan/releases/tags/apk-latest
   │  (GET publik, Accept: application/vnd.github+json, tanpa token, timeout 10 dtk)
   ├─ Membandingkan RK_BUILD.run secara numerik terhadap `run=` di catatan rilis
   └─ Saat menekan "Unduh & pasang" (jalur in-app):
      ├─ Validasi prefiks URL (https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/)
      ├─ Unduh ke cache/rk-update/renkeu-<run>.apk via @capacitor/filesystem (progress bar)
      ├─ Verifikasi SHA-256 berkas hasil unduhan (bila sha256 & WebCrypto tersedia)
      ├─ Cek izin `REQUEST_INSTALL_PACKAGES` aplikasi **RenKeu** via plugin `ApkInstaller.canInstall()`
      └─ Membuka pemasang paket sistem Android langsung pada berkas APK cache (FileProvider)
         (+ cadangan "Buka lewat browser" & "Salin tautan" jika gagal / macet)
```

---

## 2. Bootstrap Tahap 7 & Migrasi Pertama

- **Dari APK sebelum Tahap 6 (kunci debug acak)** -> ikuti migrasi sekali: login/sinkron cloud (atau ekspor cadangan `.JSON`), **uninstall** APK lama, pasang APK baru.
- **Bootstrap dari Tahap 6 (sudah memakai kunci tetap) ke build Tahap 7**:
  - Build Tahap 6 belum memiliki plugin `ApkInstaller` maupun in-app download (hanya tombol **Unduh & pasang** yang membuka browser bawaan dan pada beberapa perangkat macet di 99%).
  - Untuk memasang **build Tahap 7 pertama kalinya**, buka `https://github.com/daffagng4-commits/RencanaKeuangan/releases/tag/apk-latest` langsung di **Brave** atau **Chrome**, unduh berkas `renkeu-<nomor>.apk` dari bagian **Assets**, lalu pasang (**tanpa uninstall**; tanda tangan keystore tetap sama; **data lokal tetap aman**).
  - Mulai dari build Tahap 7 ke atas, pembaruan di masa depan akan diunduh langsung di dalam aplikasi dan langsung membuka pemasang Android.

**Ketahanan cek & pemasang (Tahap 7.1):** Setelah APK selesai diunduh dan menunggu izin atau pemasangan, mengetuk **Cek pembaruan** tidak akan menghapus berkas yang sudah ada selama nomor rilis masih sama (berkas hanya di-reset bila tersedia rilis lebih baru atau aplikasi sudah versi terbaru; saat fase mengunduh/memverifikasi/memasang berlangsung, cek pembaruan dilewati). Jika pemasang sistem gagal terbuka setelah unduhan selesai, kartu menampilkan tombol utama **Coba pasang lagi** (tanpa mengunduh ulang) beserta pilihan **Unduh ulang**, dan otomatis mengunduh ulang apabila berkas di cache sudah tidak ditemukan.

---

## 3. Izin "Pasang Aplikasi yang Tidak Dikenal"

- Karena berkas APK kini diunduh dan dibuka langsung oleh aplikasi **RenKeu** (`id.renkeu.app`), Android meminta izin **Pasang aplikasi dari sumber ini** untuk **RenKeu sendiri** (bukan untuk browser seperti Brave/Chrome).
- Saat izin belum aktif, aplikasi akan menampilkan status **"Perlu izin"** dan tombol **"Buka pengaturan izin"** (membuka setelan izin langsung ke aplikasi RenKeu) serta tombol **"Pasang"** tanpa mengunduh ulang berkas APK yang sudah selesai diunduh.

---

## 4. Setup Sekali (Keystore, Secrets, dan Visibilitas Repo)

1. **Pastikan repositori GitHub bersifat publik** agar endpoint rilis `api.github.com` dan tautan unduhan APK dapat diakses tanpa menyematkan token.
2. **Simpan 4 GitHub Secrets** pada *Settings → Secrets and variables → Actions*:
   - `RK_KEYSTORE_BASE64`: isi file `.jks` dalam encoding base64 satu baris.
   - `RK_KEYSTORE_PASSWORD`: kata sandi keystore.
   - `RK_KEY_ALIAS`: alias kunci di dalam keystore.
   - `RK_KEY_PASSWORD`: kata sandi key alias.
3. Jangan pernah menyimpan file `.jks`, `.keystore`, `keystore.properties`, atau token GitHub di dalam repositori git.

---

## 5. Pemecahan Masalah

- **Unduhan di browser bawaan HP macet di 99% (atau koneksi terputus saat unduh)**
  - Mulai Tahap 7, tombol **Unduh & pasang** mengunduh langsung di dalam aplikasi memakai `HttpURLConnection` native agar terhindar dari kendala pengelola unduhan browser bawaan.
  - Jika unduhan in-app tidak menerima progres selama 30 detik (**"Unduhan tersendat"**) atau gagal jaringan, gunakan tombol cadangan **Salin tautan** (lalu tempel di **Brave** atau Chrome) atau **Buka lewat browser**.
- **Verifikasi `sha256` gagal (unduhan rusak/terpotong)**
  - Aplikasi otomatis menghapus berkas APK yang korup agar tidak memasang berkas terpotong dan menawarkan tombol coba lagi / **Buka lewat browser** / **Salin tautan**.
- **Izin pemasangan ditolak / "Perlu izin"**
  - Ketuk **Buka pengaturan izin** → aktifkan **Izinkan dari sumber ini** untuk **Rencana Keuangan (RenKeu)** → kembali ke aplikasi lalu ketuk **Pasang** (berkas tidak perlu diunduh ulang).
- **Peringatan Google Play Protect**
  - Karena APK ditandatangani secara mandiri di luar Play Store, Play Protect dapat memunculkan konfirmasi pengembang. Ketuk **Detail selengkapnya → Tetap pasang**.
- **Gagal pasang: konflik tanda tangan paket**
  - Pastikan aplikasi terpasang sebelumnya sudah menggunakan keystore tetap yang sama. Jika masih berasal dari build debug lama acak, lakukan sinkron/cadangan lalu uninstall APK lama sekali saja.
- **HTTP 404 saat Cek pembaruan**
  - Pastikan rilis `apk-latest` sudah terbit dan repositori bersifat **Publik**.
- **HTTP 403 / 429 (Batas laju GitHub API)**
  - Kuota API tanpa token adalah 60 permintaan/jam per IP. Tunggu sebentar atau matikan VPN lalu coba lagi.

---

## 6. Cadangan Keystore

Simpan file asli `renkeu.jks` beserta password store, alias, dan password key di brankas terenkripsi / password manager pribadi di luar repositori git.
