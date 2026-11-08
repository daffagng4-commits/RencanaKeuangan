/** Menjalankan semua tes jadwal (tests/schedule/*.test.js) terhadap index.html, satu per satu. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'schedule');
let failed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.js')).sort()) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  console.log((r.status === 0 ? 'OK     ' : 'GAGAL  ') + f);
  if (r.status !== 0) { failed++; console.log(out.split('\n').slice(-6).join('\n')); }
}
console.log(failed ? '\n' + failed + ' berkas tes jadwal gagal.' : '\nSemua tes jadwal lulus.');
process.exit(failed ? 1 : 0);
