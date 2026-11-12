// Arus saldo: lunas masa depan dibayar hari ini; grafik hari ini = saldo realtime; legend per filter.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 1000000;
    const it = (id, price, start) => ({ id, name: id, price, start, n: 1, unit: 'sekali', cat: 'A', ch: [] });
    w.S.items = [it('Lalu', 50000, '2026-11-10'), it('A', 100000, '2026-11-15'), it('B', 200000, '2026-11-25'), it('C', 300000, '2026-11-20'), it('E', 400000, '2026-12-05')];
    w.S.paid = { 'Lalu|2026-11-10': 1, 'A|2026-11-15': 1, 'B|2026-11-25': 1 };
    w.S.skip = {};
    w.kasLinked().tx = [];
    const series = {};
    const legend = {};
    for (const per of ['w', 'm', 'y']) {
      w.flowPeriod = per;
      w.renderAll();
      const card = [...w.document.querySelectorAll('.card')].find((c) => /Arus saldo/.test(c.textContent));
      const cfg = w.LCQ[+card.querySelector('svg.lc').dataset.lci];
      series[per] = Object.fromEntries(cfg.pts.map((p) => [p.d, p.v]));
      legend[per] = ['s', 'p'].map((k) => !card.querySelector('.lc-lg .' + k).hidden);
      const lastSolid = cfg.pts.filter((p) => p.d <= '2026-11-12').pop();
      // inv 1: hari ini = saldo realtime
      assert.strictEqual(series[per]['2026-11-12'], w.kasBal(w.kasLinked()).bal, 'hari ini = realtime (' + per + ')');
      assert(lastSolid.d === '2026-11-12', 'titik hari ini = titik solid terakhir');
    }
    assert.strictEqual(series.y['2026-11-12'], 650000);
    // inv 2/3: saldo akhir = base - semua tagihan, satu kali
    assert.strictEqual(series.y['2026-12-05'], 1000000 - 50000 - 100000 - 200000 - 300000 - 400000);
    // inv 4: sebelum hari ini tidak berubah oleh pemindahan
    assert.strictEqual(series.y['2026-11-11'], 950000);
    // inv 5: nilai sama antar filter
    for (const per of ['w', 'm'])
      for (const d in series[per]) if (d in series.y) assert.strictEqual(series[per][d], series.y[d], 'beda filter ' + per + ' ' + d);
    // legend
    assert.deepStrictEqual(legend.w, [true, false], 'Minggu s.d. hari ini: hanya Nyata');
    assert.deepStrictEqual(legend.y, [true, true]);
    assert.deepStrictEqual(legend.m, [true, true]);
    console.log('OK flow_consistency');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
