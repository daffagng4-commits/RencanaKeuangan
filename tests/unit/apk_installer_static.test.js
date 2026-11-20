/** Verifikasi statis Tahap 7: plugin ApkInstaller Java, manifest, MainActivity, token gerak, CSS, dan docs/UPDATE-APK.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

test('Tahap 7 Android: AndroidManifest.xml & file_paths.xml memenuhi syarat pasang APK via FileProvider', () => {
  const manifest = fs.readFileSync(
    path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8',
  );
  assert.match(
    manifest,
    /<uses-permission\s+android:name="android\.permission\.REQUEST_INSTALL_PACKAGES"\s*\/>/,
    'AndroidManifest.xml memuat REQUEST_INSTALL_PACKAGES',
  );
  assert.match(
    manifest,
    /android:authorities="\$\{applicationId\}\.fileprovider"/,
    'FileProvider memakai ${applicationId}.fileprovider',
  );

  const fpXml = fs.readFileSync(
    path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml'),
    'utf8',
  );
  assert.match(fpXml, /<cache-path[^>]*path="\."/, 'file_paths.xml memuat <cache-path path="." />');
});

test('Tahap 7 Java: MainActivity mendaftarkan ApkInstallerPlugin sebelum super.onCreate dan plugin memvalidasi path aman', () => {
  const mainAct = fs.readFileSync(
    path.join(ROOT, 'android', 'app', 'src', 'main', 'java', 'id', 'renkeu', 'app', 'MainActivity.java'),
    'utf8',
  );
  const regIdx = mainAct.indexOf('registerPlugin(ApkInstallerPlugin.class)');
  const superIdx = mainAct.indexOf('super.onCreate(');
  assert.ok(regIdx > 0, 'MainActivity memanggil registerPlugin(ApkInstallerPlugin.class)');
  assert.ok(superIdx > 0 && regIdx < superIdx, 'registerPlugin dipanggil SEBELUM super.onCreate');

  const pluginPath = path.join(
    ROOT,
    'android',
    'app',
    'src',
    'main',
    'java',
    'id',
    'renkeu',
    'app',
    'ApkInstallerPlugin.java',
  );
  assert.ok(fs.existsSync(pluginPath), 'ApkInstallerPlugin.java ada');
  const pluginSrc = fs.readFileSync(pluginPath, 'utf8');
  const nameMatch = /@CapacitorPlugin\s*\(\s*name\s*=\s*"([^"]+)"\s*\)/.exec(pluginSrc);
  assert.ok(nameMatch, 'ApkInstallerPlugin memiliki anotasi @CapacitorPlugin(name = "...")');
  const pluginName = nameMatch[1];
  assert.equal(pluginName, 'ApkInstaller', 'nama plugin Java adalah ApkInstaller');

  const mobJs = fs.readFileSync(path.join(ROOT, 'js', 'ui-mobile', 'mobile-app.js'), 'utf8');
  assert.ok(mobJs.includes("'" + pluginName + "'") || mobJs.includes('"' + pluginName + '"'), 'mobile-app.js memanggil nama plugin yang sama dengan Java');

  for (const methodName of ['canInstall', 'openInstallSettings', 'install']) {
    assert.match(pluginSrc, new RegExp('@PluginMethod[\\s\\S]*?public\\s+void\\s+' + methodName + '\\s*\\('), 'metode @PluginMethod ' + methodName + ' ada');
  }
  assert.ok(pluginSrc.includes('getPackageName() + ".fileprovider"'), 'authority .fileprovider cocok dengan manifest');
  assert.ok(pluginSrc.includes('Intent.ACTION_VIEW'), 'install memakai Intent.ACTION_VIEW');
  assert.ok(pluginSrc.includes('application/vnd.android.package-archive'), 'install memakai MIME APK');
  assert.ok(pluginSrc.includes('Intent.FLAG_GRANT_READ_URI_PERMISSION'), 'install memberi FLAG_GRANT_READ_URI_PERMISSION');
  assert.ok(pluginSrc.includes('Intent.FLAG_ACTIVITY_NEW_TASK'), 'install memberi FLAG_ACTIVITY_NEW_TASK');
  assert.ok(pluginSrc.includes('getCanonicalFile()'), 'install memvalidasi canonical path');
  assert.ok(pluginSrc.includes('"rk-update"'), 'install membatasi ke subdirektori rk-update');
  assert.ok(pluginSrc.includes('".apk"'), 'install memeriksa ekstensi .apk');
  assert.ok(pluginSrc.includes('canRequestPackageInstalls()'), 'canInstall memeriksa PackageManager.canRequestPackageInstalls()');
  assert.ok(pluginSrc.includes('ACTION_MANAGE_UNKNOWN_APP_SOURCES'), 'openInstallSettings membuka pengaturan sumber tidak dikenal untuk package aplikasi');
});

test('Tahap 7 CSS & Docs: token progres, reduced-motion, dan panduan UPDATE-APK lengkap', () => {
  const tokensCss = fs.readFileSync(path.join(ROOT, 'css', 'tokens.css'), 'utf8');
  assert.ok(tokensCss.includes('--dur-upd-progress'), 'tokens.css mendefinisikan --dur-upd-progress');
  assert.ok(tokensCss.includes('--ease-upd-progress'), 'tokens.css mendefinisikan --ease-upd-progress');
  assert.ok(tokensCss.includes('--dur-upd-indet'), 'tokens.css mendefinisikan --dur-upd-indet');

  const mobileCss = fs.readFileSync(path.join(ROOT, 'css', 'mobile.css'), 'utf8');
  assert.ok(mobileCss.includes('.m-upd-prog-fill'), 'mobile.css mengatur .m-upd-prog-fill');
  assert.ok(mobileCss.includes('prefers-reduced-motion') && mobileCss.includes('.m-upd-prog-track.is-indeterminate .m-upd-prog-fill'), 'mobile.css mematikan animasi indeterminate pada prefers-reduced-motion');

  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'UPDATE-APK.md'), 'utf8').toLowerCase();
  for (const kw of ['in-app', 'renkeu', 'salin tautan', 'brave', 'bootstrap', 'sha256', '99%', 'play protect']) {
    assert.ok(doc.includes(kw), 'docs/UPDATE-APK.md mencakup "' + kw + '"');
  }
});

test('Tahap 7.1 C4: docs/UPDATE-APK.md memuat URL bootstrap apk-latest, tidak menyuruh Salin tautan untuk Tahap 6, dan menjelaskan C1/C2', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'UPDATE-APK.md'), 'utf8');
  const mSec2 = md.match(/##\s*2\.\s*Bootstrap[\s\S]*?(?=\n##\s*3\.)/i);
  assert.ok(mSec2, 'bagian 2 Bootstrap ditemukan di docs/UPDATE-APK.md');
  const sec2 = mSec2[0];
  assert.ok(
    sec2.includes('https://github.com/daffagng4-commits/RencanaKeuangan/releases/tag/apk-latest'),
    'bagian 2 memuat URL lengkap releases/tag/apk-latest',
  );
  assert.ok(sec2.includes('Assets'), 'bagian 2 menyebut bagian Assets');
  assert.ok(/Brave/i.test(sec2) && /Chrome/i.test(sec2), 'bagian 2 menyebut Brave/Chrome');
  assert.ok(/tanpa uninstall/i.test(sec2), 'bagian 2 menyebut tanpa uninstall');
  assert.ok(
    !/salin\s+tautan/i.test(sec2),
    'bagian 2 bootstrap Tahap 6 TIDAK menyuruh mengetuk Salin tautan',
  );
  assert.ok(md.includes('Coba pasang lagi'), 'dokumen menjelaskan tombol Coba pasang lagi (C2)');
  assert.ok(md.includes('Unduh ulang'), 'dokumen menjelaskan tombol Unduh ulang (C2)');
});
