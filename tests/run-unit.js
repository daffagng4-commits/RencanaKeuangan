/** Menjalankan semua tes unit (tests/unit/*.test.js) dengan test runner bawaan Node. Portabel lintas OS. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'unit');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).map((f) => path.join(dir, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
