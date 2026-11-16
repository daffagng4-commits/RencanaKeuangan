// A/B/C/D: hitung mundur, penanda saldo minus, filter global, solid/putus-putus arus saldo.
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
    w.S.saldo = 1472000;
    w.S.items = [
      { id: 'k1', name: 'Kuota', price: 50000, start: '2026-11-17', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 't1', name: 'Torbox', price: 500000, start: '2026-11-26', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 's1', name: 'Saham', price: 570000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'b1', name: 'BTC', price: 250000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'w1', name: 'Warp', price: 15000, start: '2026-12-07', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'p1', name: 'BPJS', price: 150000, start: '2026-12-10', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'v1', name: 'Vidio', price: 200000, start: '2026-12-12', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'e1', name: 'ETF', price: 3350000, start: '2026-12-15', n: 1, unit: 'sekali', cat: 'A', ch: [] }
    ];
    w.S.paid = {};
    w.S.skip = {};
    const P = w.kasLinked();
    P.tx = [
      { id: 'belanja', d: '2026-11-01', t: '-', amt: 100000, cat: 'Belanja', note: '' },
      { id: 'gaji', d: '2026-12-01', t: '+', amt: 2500000, cat: 'Gaji', note: '' }
    ];
    w.renderAll();

    // === C: hitung mundur ===
    const bills = w.document.getElementById('upcoming-bills-list');
    assert(bills, 'daftar tagihan terdekat ada');
    const txt = bills.textContent.replace(/\s+/g, ' ');
    assert(/Kuota.*5 hari lagi/.test(txt), 'Kuota 17 Nov = 5 hari lagi: ' + txt);
    assert(/Torbox.*14 hari lagi/.test(txt), 'Torbox 26 Nov = 14 hari lagi: ' + txt);
    assert(/Saham.*23 hari lagi/.test(txt), 'Saham 5 Des = 23 hari lagi: ' + txt);
    assert(/BTC.*23 hari lagi/.test(txt), 'BTC 5 Des = 23 hari lagi: ' + txt);
    assert(/Warp.*25 hari lagi/.test(txt), 'Warp 7 Des = 25 hari lagi: ' + txt);

    // === C: tanggal saldo minus dan metrik defisit ===
    const fn = w.kasFirstNegative(P);
    assert(fn, 'ada tanggal saldo minus');
    assert.strictEqual(fn.date, '2026-12-15', 'saldo minus 15 Des');
    assert.strictEqual(fn.days, 33, '33 hari lagi');
    assert.strictEqual(fn.balanceAfter, -1213000, 'minus Rp 1.213.000');
    assert(/Defisit mulai 15 Des/.test(w.document.getElementById('metric-end-hint').textContent), 'hint defisit terisi');

    // === B: grafik garis solid vs putus-putus dan batas defisit ===
    const svg = w.document.getElementById('svg-cashflow');
    assert(svg, 'svg arus saldo ada');
    const paths = [...svg.querySelectorAll('path[stroke]')];
    assert(paths.some((p) => !p.getAttribute('stroke-dasharray') && p.getAttribute('d')), 'garis solid saldo nyata ada');
    assert(paths.some((p) => /7 5/.test(p.getAttribute('stroke-dasharray') || '') && p.getAttribute('d')), 'garis putus-putus proyeksi ada');
    assert(/Batas Defisit/.test(svg.textContent), 'penanda Batas Defisit ada');

    // === A1: grafik bar compare masuk/keluar ada ===
    assert(w.document.getElementById('svg-bar-compare'), 'grafik bar perbandingan ada');

    // === A2: jatah jajan ===
    const dailyVal = w.document.getElementById('metric-daily-val');
    assert(dailyVal && /\/ hr/.test(dailyVal.textContent), 'metric jatah jajan terisi');
    assert(/15 Des 2026/.test(w.document.getElementById('metric-daily-lbl').textContent), 'jatah jajan dibatasi hingga tanggal mulai defisit');

    // === Ke mana uangnya pergi: tab Minggu / Bulan / Tahun ===
    const whereLabels = [...w.document.querySelectorAll('#card-where-money [data-where-period]')].map((b) => b.textContent.trim());
    assert.deepStrictEqual(whereLabels, ['Minggu', 'Bulan', 'Tahun']);

    // === Toggle rentang grafik arus kas: Minggu / Bulan / Tahun ===
    for (const per of ['w', 'm', 'y']) {
      w.document.querySelector('#tab-rincian [data-range="' + per + '"]').click();
      assert(w.document.querySelector('#svg-cashflow circle.cf-node'), 'titik grafik render untuk rentang ' + per);
    }

    console.log('OK dashboard_abcd');
  } finally {
    w.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
