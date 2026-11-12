// Bulan mulai: auto ikut kalender (tahun berjalan), manual menang, ganti hari/tab memicu render ulang.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    w.localStorage.removeItem('rk-sm-manual');
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 0;
    w.refreshToday();
    assert.strictEqual(+w.S.startMonth, 10, 'tahun berjalan: auto = Nov');
    assert.strictEqual(w.$('sm').getAttribute('data-auto'), 'auto');

    // pergantian 30 Nov -> 1 Des, lalu 31 Des -> 1 Jan (tahun aktif 2026 tidak pindah)
    w.__today = '2026-12-01';
    w.refreshToday();
    assert.strictEqual(+w.S.startMonth, 11, 'auto ikut Des');
    w.__today = '2027-01-01';
    w.refreshToday();
    assert.strictEqual(+w.S.year, 2026, 'tahun aktif tidak berpindah otomatis');
    assert.strictEqual(+w.S.startMonth, 11, 'tahun lampau: bulan mulai tidak diubah');
    assert.strictEqual(w.$('sm').getAttribute('data-auto'), '', 'tahun lampau: tanpa penanda');

    // tahun depan (simulasi): tidak disentuh
    w.switchYear(2028);
    w.S.startMonth = 3;
    w.__today = '2026-12-05';
    w.refreshToday();
    assert.strictEqual(+w.S.startMonth, 3, 'tahun depan: tidak diubah');

    // manual menang
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.$('sm').value = '4';
    w.$('sm').onchange.call(w.$('sm'));
    assert.strictEqual(+w.S.startMonth, 4);
    assert.strictEqual(w.$('sm').getAttribute('data-auto'), 'manual');
    w.__today = '2026-12-01';
    w.refreshToday();
    assert.strictEqual(+w.S.startMonth, 4, 'manual tidak ditimpa');
    console.log('OK start_month_auto');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
