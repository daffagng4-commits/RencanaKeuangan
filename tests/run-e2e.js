/**
 * Menjalankan semua tes e2e (tests/e2e/*.js) terhadap dist/index.html, satu per satu.
 * Keluar dengan kode 1 bila ada yang gagal. Dipanggil oleh `npm run test:e2e`.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'e2e');
const html = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(html)) {
  console.error('dist/index.html belum ada. Jalankan: npm run build');
  process.exit(1);
}
let failed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
  const r = spawnSync(process.execPath, [path.join(dir, f), html], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const line = out.split('\n').filter((l) => /LULUS/.test(l)).pop() || out.trim().split('\n').slice(-3).join(' | ');
  console.log((r.status === 0 ? 'OK     ' : 'GAGAL  ') + f.padEnd(20) + line);
  if (r.status !== 0) {
    failed++;
    console.log(out.split('\n').filter((l) => /^ x /.test(l)).join('\n'));
  }
}
console.log(failed ? '\n' + failed + ' berkas tes gagal.' : '\nSemua tes e2e lulus.');
process.exit(failed ? 1 : 0);
