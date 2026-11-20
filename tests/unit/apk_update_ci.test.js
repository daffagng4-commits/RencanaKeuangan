/** Verifikasi statis A1 (build.gradle), A2 (GitHub Actions workflow YAML via PyYAML), dan A5 (docs/UPDATE-APK.md). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

test('A1: android/app/build.gradle mendukung signingConfigs.rk bersyarat dan env versionCode/versionName', () => {
  const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8');
  assert.match(gradle, /applicationId\s+"id\.renkeu\.app"/, 'applicationId tetap id.renkeu.app');
  for (const envVar of [
    'RK_KEYSTORE_PATH',
    'RK_KEYSTORE_PASSWORD',
    'RK_KEY_ALIAS',
    'RK_KEY_PASSWORD',
    'RK_VERSION_CODE',
    'RK_VERSION_NAME',
  ]) {
    assert.ok(gradle.includes(envVar), 'build.gradle membaca env ' + envVar);
  }
  assert.match(gradle, /signingConfigs\s*\{[\s\S]*\brk\s*\{/, 'signingConfigs.rk didefinisikan');
  assert.match(gradle, /debug\s*\{[\s\S]*signingConfigs\.rk/, 'debug memakai signingConfigs.rk secara bersyarat');
  assert.match(gradle, /exists\s*\(\)/, 'hanya menerapkan keystore bila file keystore ada');
});

test('A2: .github/workflows/android-debug.yml valid YAML & memuat pipeline rilis apk-latest aman', () => {
  const wfPath = path.join(ROOT, '.github', 'workflows', 'android-debug.yml');
  const rawYaml = fs.readFileSync(wfPath, 'utf8');
  const pyOut = execFileSync(
    'python',
    ['-c', 'import sys,json,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1], encoding="utf-8"))))', wfPath],
    { encoding: 'utf8' },
  );
  const wf = JSON.parse(pyOut);
  assert.equal(wf.permissions && wf.permissions.contents, 'write', 'permissions.contents = write');
  assert.ok(wf.concurrency && wf.concurrency.group, 'concurrency group diatur');
  assert.equal(wf.concurrency['cancel-in-progress'], false, 'concurrency tidak membatalkan run yang sedang berjalan');

  const job = wf.jobs && wf.jobs['build-android-debug'];
  assert.ok(job && Array.isArray(job.steps), 'job build-android-debug ada');
  const co = job.steps.find((s) => s.uses && s.uses.startsWith('actions/checkout@'));
  assert.ok(co && co.with && co.with['fetch-depth'] !== undefined, 'checkout menyertakan fetch-depth untuk git log -1');
  const up = job.steps.find((s) => s.uses && s.uses.startsWith('actions/upload-artifact@'));
  assert.ok(up, 'upload-artifact debug APK dipertahankan');

  assert.ok(rawYaml.includes('RK_BUILD_ID=${GITHUB_RUN_NUMBER}-${GITHUB_SHA::7}'), 'RK_BUILD_ID dipakai ulang');
  assert.ok(rawYaml.includes('RK_VERSION_CODE=${GITHUB_RUN_NUMBER}'), 'RK_VERSION_CODE diisi GITHUB_RUN_NUMBER');
  assert.ok(rawYaml.includes('RK_VERSION_NAME=1.0.${GITHUB_RUN_NUMBER}'), 'RK_VERSION_NAME diisi 1.0.<run>');
  for (const sec of ['RK_KEYSTORE_BASE64', 'RK_KEYSTORE_PASSWORD', 'RK_KEY_ALIAS', 'RK_KEY_PASSWORD']) {
    assert.ok(rawYaml.includes('secrets.' + sec), 'workflow membaca secret ' + sec);
  }
  assert.ok(rawYaml.includes('::warning::'), 'workflow menulis ::warning:: jika secret tidak lengkap');
  assert.ok(rawYaml.includes('apk-latest'), 'rilis bergulir memakai tag apk-latest');
  assert.ok(rawYaml.includes('--prerelease'), 'rilis memakai flag --prerelease');
  assert.ok(rawYaml.includes('renkeu-${GITHUB_RUN_NUMBER}.apk'), 'nama aset APK memakai run number');
  assert.ok(rawYaml.includes('sha256sum'), 'menghitung sha256 APK');
  assert.ok(rawYaml.includes('msg='), 'menulis msg= satu baris di catatan rilis');
  assert.ok(rawYaml.includes('git/refs/tags/') || rawYaml.includes('--target'), 'memperbarui ref tag apk-latest');
  assert.ok(!/echo\s+["']?\$(KS_|secrets\.RK_)/i.test(rawYaml), 'tidak mencetak secret ke log');
});

test('A5: docs/UPDATE-APK.md lengkap mencakup arsitektur, setup, migrasi pertama, troubleshooting, dan backup', () => {
  const docPath = path.join(ROOT, 'docs', 'UPDATE-APK.md');
  assert.ok(fs.existsSync(docPath), 'docs/UPDATE-APK.md ada');
  const md = fs.readFileSync(docPath, 'utf8');
  for (const kw of [
    'apk-latest',
    'RK_KEYSTORE_BASE64',
    'RK_KEYSTORE_PASSWORD',
    'RK_KEY_ALIAS',
    'RK_KEY_PASSWORD',
    'uninstall',
    'konflik tanda tangan',
    'Play Protect',
    '404',
  ]) {
    assert.ok(md.toLowerCase().includes(kw.toLowerCase()), 'UPDATE-APK.md menyebut ' + kw);
  }
});
