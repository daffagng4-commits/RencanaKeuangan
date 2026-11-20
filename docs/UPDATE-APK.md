# Pembaruan APK Rencana Keuangan (`id.renkeu.app`)

Dokumen ini menjelaskan cara kerja pembaruan APK Android dari dalam aplikasi tanpa mengunduh artifact GitHub Actions secara manual.

---

## 1. Ringkasan Arsitektur

```text
Push ke main / workflow_dispatch
   │
   ▼
GitHub Actions (.github/workflows/android-debug.yml)
   ├─ Menyematkan RK_BUILD_ID, RK_VERSION_CODE, RK_VERSION_NAME ke build web & Gradle
   ├─ Mendekode keystore tetap dari GitHub Secrets ke $RUNNER_TEMP
   ├─ Mem-build APK (assembleDebug) bertanda tangan keystore tetap
   └─ Mengunggah APK & catatan kunci=nilai ke GitHub Release bergulir (tag `apk-latest`, prerelease)
         │
         ▼
Aplikasi Android (#mobile-app-shell → Pengaturan → Pembaruan Aplikasi)
   ├─ Memeriksa https://api.github.com/repos/daffagng4-commits/RencanaKeuangan/releases/tags/apk-latest
   │  (GET publik, Accept: application/vnd.github+json, tanpa token/Authorization, timeout 10 dtk)
   ├─ Membandingkan RK_BUILD.run secara numerik terhadap `run=` di catatan rilis
   └─ Jika ada versi baru, tombol "Unduh & pasang" membuka URL aset APK lewat Capacitor Browser
      (https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/...)
```

> **Catatan keamanan & batas platform Android:**
> Aplikasi Android tidak memasang APK secara diam-diam di latar belakang. Pemasangan langsung dari dalam aplikasi menggunakan plugin native APK installer merupakan tahap terpisah (di luar cakupan Tahap 6).

---

## 2. Setup Sekali (Keystore, Secrets, dan Visibilitas Repo)

1. **Pastikan repositori GitHub bersifat publik** agar endpoint rilis `api.github.com` dan tautan unduhan APK dapat diakses oleh aplikasi tanpa menyematkan token pribadi apa pun.
2. **Simpan 4 GitHub Secrets** pada *Settings → Secrets and variables → Actions*:
   - `RK_KEYSTORE_BASE64`: isi file `.jks` dalam encoding base64 satu baris (`base64 -w0 renkeu.jks`).
   - `RK_KEYSTORE_PASSWORD`: kata sandi keystore.
   - `RK_KEY_ALIAS`: alias kunci di dalam keystore (mis. `renkeu`).
   - `RK_KEY_PASSWORD`: kata sandi key alias.
3. Jangan pernah menyimpan file `.jks`, `.keystore`, `keystore.properties`, atau token GitHub di dalam repositori git (`.gitignore` sudah mengecualikan ekstensi keystore).

---

## 3. Migrasi Pertama (WAJIB Dibaca Sebelum Memasang APK Baru)

Build APK lama menggunakan kunci debug acak bawaan Android runner GitHub. Build baru dari rilis `apk-latest` menggunakan **kunci tetap** dari GitHub Secrets. Android akan menolak pembaruan di tempat jika tanda tangan APK lama berbeda dengan APK baru.

**Langkah migrasi pertama (dilakukan SEKALI SAJA):**
1. **Amankan data lebih dulu:**
   - Buka aplikasi lama dan **login/sinkron cloud** (atau buka *Pengaturan → Cadangan & Ekspor Data → Cadangan .JSON* dan simpan file cadangan di tempat aman).
   - Data lokal yang belum tersinkron ke cloud akan terhapus saat aplikasi lama di-uninstall!
2. **Uninstall APK lama** dari perangkat Android.
3. **Pasang APK pertama** yang diunduh dari rilis `apk-latest` (atau lewat artifact build bertanda tangan baru).
4. Login kembali (atau impor file cadangan JSON) untuk memulihkan data.

Setelah migrasi pertama ini selesai, semua build berikutnya bertanda tangan keystore tetap yang sama sehingga dapat dipasang menimpa aplikasi lama tanpa uninstall dan **tanpa menghilangkan data**.

---

## 4. Pemecahan Masalah

- **Gagal pasang: "App not installed as package conflicts with an existing package" / konflik tanda tangan**
  - Penyebab: APK yang terpasang di HP masih memakai kunci debug acak lama (atau ditandatangani kunci berbeda).
  - Solusi: Ikuti **Migrasi Pertama** di atas (pastikan sudah sinkron/ekspor data → uninstall APK lama → pasang APK dari rilis `apk-latest`).
- **Peringatan Google Play Protect**
  - APK debug ditandatangani dengan keystore pribadi (bukan lewat Google Play Store). Jika Play Protect memunculkan peringatan "Play Protect tidak mengenali developer aplikasi ini", ketuk **Detail selengkapnya → Tetap pasang**.
- **Diminta izin "Pasang aplikasi yang tidak dikenal" / "Pasang dari sumber ini"**
  - Browser atau pengelola file (Chrome / Files Android) memerlukan izin pemasangan APK satu kali. Aktifkan izin **Izinkan dari sumber ini**, lalu kembali untuk mengetuk **Pasang**.
- **HTTP 404 saat Cek pembaruan ("Rilis tidak ditemukan atau repo privat")**
  - Periksa apakah workflow **Android Debug APK** sudah pernah berjalan sukses menerbitkan tag `apk-latest` setelah branch di-push ke `main` (atau dijalankan manual lewat `workflow_dispatch`).
  - Jika rilis sudah ada di GitHub tetapi aplikasi tetap menerima `404`, kemungkinan repositori masih **Privat** (API publik tanpa token mengembalikan `404` untuk repo privat). Ubah repositori ke **Publik** jika ingin memakai pemeriksaan tanpa token.
- **HTTP 403 / 429 (Batas laju GitHub API)**
  - GitHub API membatasi 60 permintaan/jam per alamat IP publik untuk permintaan tanpa token (WiFi bersama/VPN sering berbagi kuota). Tunggu beberapa menit atau matikan VPN lalu tekan **Cek pembaruan** lagi. Pemeriksaan otomatis aplikasi sudah dibatasi maksimal 1 kali setiap 6 jam.
- **Rilis `apk-latest` tidak muncul setelah workflow hijau**
  - Buka log langkah **Prepare APK signing** dan **Publish rolling prerelease apk-latest** di tab GitHub Actions.
  - Jika muncul peringatan `::warning::` tentang secret tidak lengkap, periksa keempat nama secret (`RK_KEYSTORE_BASE64`, `RK_KEYSTORE_PASSWORD`, `RK_KEY_ALIAS`, `RK_KEY_PASSWORD`) dan pastikan `workflow_dispatch` atau `push` dijalankan pada branch `main` (bukan Pull Request).

---

## 5. Cadangan Keystore

Kehilangan atau berubahnya file `renkeu.jks` berarti pengguna harus kembali meng-uninstall aplikasi seperti saat migrasi pertama.
- Simpan file asli `renkeu.jks` beserta password store, alias, dan key password di **password manager / brankas cloud terenkripsi pribadi** di luar repositori git.
- Jangan membagikan file `.jks` maupun isi `RK_KEYSTORE_BASE64` di chat atau issue publik.
