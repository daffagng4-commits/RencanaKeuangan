// Sinkronisasi penanda manual, pembacaan efektif, dan pembaca S.startMonth langsung tidak tersisa.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const root = path.join(__dirname, '..', '..');

function grepDirectStartMonth() {
  const dirs = ['js/core', 'js/ui', 'bot'];
  const bad = [];
  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
    for (const f of files) {
      if (f === 'core.mjs') continue;
      const p = path.join(root, dir, f);
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!/\.startMonth/.test(l)) continue;
        // Daftar allowlist: state norm/clamp/definition, render setter/migration, years seed, bot dev seed/router normalization, debug.
        if (dir === 'js/core' && f === 'state.js') continue;
        if (dir === 'js/ui' && f === 'render.js') continue;
        if (dir === 'js/ui' && f === 'years.js') continue;
        if (dir === 'bot' && f === 'dev.mjs') continue;
        if (dir === 'bot' && f === 'router.mjs' && (/s\.startMonth/.test(l) || /stored/.test(l))) continue;
        bad.push(`${dir}/${f}:${i + 1}: ${l.trim()}`);
      }
    }
  }
  return bad;
}

(async () => {
  const bad = grepDirectStartMonth();
  assert.strictEqual(bad.length, 0, 'Pembacaan S.startMonth langsung tersisa:\n' + bad.join('\n'));

  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    w.localStorage.removeItem('rk-sm-manual');

    // Invarian 1/2/4/5: manual di tahun berjalan tersinkron; perangkat lain membaca nilai+penanda sama.
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 0;
    delete w.S.smManual;
    w.$('sm').value = '4';
    w.$('sm').onchange.call(w.$('sm'));
    assert.strictEqual(w.S.smManual, true);
    assert.strictEqual(+w.S.startMonth, 4);

    // Simulasi sinkron: serialize state, "buka" di instance lain lewat JSON round-trip.
    const key = 'rencana-keuangan-v1';
    const snapshot = JSON.parse(w.localStorage.getItem(key));
    assert(snapshot.data[2026].smManual === true, 'penanda tersimpan di localStorage');

    // Simulasi perangkat B: muat snapshot, ubah saldo awal (tanpa menyentuh bulan saldo), simpan.
    // (Tidak boot ulang, tapi norm ulang snapshot dan cek efektif.)
    const clone = JSON.parse(JSON.stringify(snapshot));
    clone.data[2026].saldo = 999999;
    w.ALL = clone;
    w.S = clone.data[2026];
    w.save();
    const saved = JSON.parse(w.localStorage.getItem(key));
    assert.strictEqual(saved.data[2026].smManual, true, 'penanda manual bertahan setelah perubahan lain');
    assert.strictEqual(+saved.data[2026].startMonth, 4, 'nilai bulan saldo manual bertahan');

    // Simulasi perangkat A buka lagi: manual masih menang.
    w.ALL = JSON.parse(JSON.stringify(saved));
    w.S = w.ALL.data[2026];
    w.__today = '2026-12-01';
    assert.strictEqual(w.smEff(), 4, 'perangkat A: manual tetap efektif setelah sinkron');

    // Invarian 3: menyimpan form tanpa menyentuh bulan saldo tidak menandai manual.
    w.__today = '2026-11-12';
    w.switchYear(2026);
    delete w.S.smManual;
    w.S.startMonth = 10;
    w.$('saldo').value = '1.000.000';
    w.$('saldo').onchange.call(w.$('saldo'));
    assert.strictEqual(w.S.smManual, undefined, 'ubah saldo awal tidak menandai manual');

    // Invarian 4: tahun depan/lampau tidak ditandai manual.
    w.switchYear(2028);
    w.S.startMonth = 3;
    w.$('sm').value = '7';
    w.$('sm').onchange.call(w.$('sm'));
    assert.strictEqual(w.S.smManual, undefined, 'tahun depan: tidak ada penanda manual');
    assert.strictEqual(w.smEff(), 7);

    // Invarian 8: data lama tanpa field baru sama dengan auto kalender.
    w.ALL = { year: 2026, data: { 2026: { year: 2026, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] } }, kas: { pr: {} } };
    w.S = w.ALL.data[2026];
    w.__today = '2026-11-12';
    assert.strictEqual(w.smEff(), 10, 'data lama tanpa smManual -> ikut kalender');

    console.log('OK start_month_sync');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
