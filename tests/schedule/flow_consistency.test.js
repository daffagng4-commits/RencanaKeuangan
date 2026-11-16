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
    for (const per of ['w', 'm', 'y']) {
      w.document.querySelector('#tab-rincian [data-range="' + per + '"]').click();
      const pts = w.brBuildCashflowPoints(per);
      series[per] = Object.fromEntries(pts.map((p) => [p.d, p.val]));
      const svg = w.document.getElementById('svg-cashflow');
      assert(svg && svg.querySelectorAll('.cf-node').length === pts.length, 'SVG merender node sesuai titik (' + per + ')');
      // inv 1: hari ini = saldo realtime
      assert.strictEqual(series[per]['2026-11-12'], w.kasBal(w.kasLinked()).bal, 'hari ini = realtime (' + per + ')');
      const todayPt = pts.find((p) => p.d === '2026-11-12');
      assert(todayPt && todayPt.actual === true && todayPt.today === true, 'titik hari ini valid (' + per + ')');
    }
    assert.strictEqual(series.y['2026-11-12'], 650000);
    // inv 2/3: saldo akhir = base - semua tagihan, satu kali
    assert.strictEqual(series.y['2026-12-05'], 1000000 - 50000 - 100000 - 200000 - 300000 - 400000);
    // inv 4: sebelum hari ini tidak berubah oleh pemindahan
    assert.strictEqual(series.y['2026-11-10'], 950000);
    // inv 5: nilai sama antar filter
    for (const per of ['w', 'm'])
      for (const d in series[per]) if (d in series.y) assert.strictEqual(series[per][d], series.y[d], 'beda filter ' + per + ' ' + d);
    console.log('OK flow_consistency');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
