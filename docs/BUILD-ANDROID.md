# Panduan Build APK Android (Capacitor) — RenKeu

## Prasyarat
- **Node.js** 20+ (`npm install`)
- **JDK 17** (atau JDK 21) dengan `JAVA_HOME` terpasang
- **Android Studio / Android SDK** (Platform Android API 35/36 & Build-Tools) dengan `ANDROID_HOME` terpasang

## Build APK Debug (Lokal)
1. Sinkronkan bundle web (`dist/`) ke proyek Android:
   ```bash
   npm run cap:sync
   ```
2. Compile APK debug:
   ```bash
   npm run android:debug
   ```
3. Lokasi output APK debug:
   ```text
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
   > Catatan: Bila sebelumnya sudah menginstal APK versi lama dengan signature/package ID berbeda, **uninstall** aplikasi lama di HP terlebih dahulu sebelum memasang `app-debug.apk`.

## Build APK Debug Otomatis via GitHub Actions
Workflow `.github/workflows/android-debug.yml` dapat dijalankan manual (*workflow_dispatch*) atau saat push ke `main`, lalu mengunduh artefak `renkeu-android-debug` (`app-debug.apk`) dari tab **Actions** GitHub.

## Membuat APK Release Bertanda Tangan (Signed Release)
1. Buat keystore pribadi di luar folder repo (atau pastikan file `*.jks`/`*.keystore` tidak pernah di-commit; sudah masuk `.gitignore`):
   ```bash
   keytool -genkeypair -v -keystore renkeu-release.jks -alias renkeu -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Build APK release unsigned:
   ```bash
   npm run cap:sync
   cd android
   ./gradlew assembleRelease
   ```
   *(Di Windows PowerShell gunakan `.\gradlew.bat assembleRelease`)*
3. Tandatangani APK dengan `apksigner` (dari Android SDK `build-tools/<versi>/`):
   ```bash
   apksigner sign --ks /path/ke/renkeu-release.jks --ks-key-alias renkeu --out RenKeu-release.apk app/build/outputs/apk/release/app-release-unsigned.apk
   ```
   **Jangan pernah** menyimpan file `.jks`/`.keystore` atau password keystore di dalam repositori Git.
