// Kartu "Pemasukan vs pengeluaran per bulan": stacked bar, Penyesuaian saldo tidak dihitung, layout kolom benar.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click } = t;
  w.__today = '2026-12-01';
  w.switchYear(2026);
  w.S.adj = []; w.S.startMonth = 10; w.S.smManual = true; w.S.saldo = 5000000; w.S.items = []; w.S.paid = {}; w.S.skip = {};
  const P = w.kasLinked();
  P.tx = [
    { id: 'i1', d: '2026-11-15', t: '+', amt: 2000000, cat: 'Gaji', note: '' },
    { id: 'o1', d: '2026-11-20', t: '-', amt: 500000, cat: 'Makan', note: '' },
    { id: 'o2', d: '2026-12-05', t: '-', amt: 300000, cat: 'Transport', note: '' },
    { id: 'adj', d: '2026-12-10', t: '+', amt: 2500000, cat: 'Penyesuaian saldo', note: '' }
  ];
  w.renderAll();
  const root = $('tab-rincian');
  const svg = root.querySelector('#svg-bar-compare');
  assert(svg, 'grafik bar perbandingan #svg-bar-compare ada');
  assert(svg.querySelectorAll('.bar-col').length >= 2, 'kolom bar bulan ter-render');
  const detail = $('bar-month-detail').textContent.replace(/\s+/g, ' ');
  assert(/Masuk Rp 2\.000\.000/.test(detail), 'penyesuaian tidak dihitung sebagai pemasukan: ' + detail);
  assert(/Keluar Rp 800\.000/.test(detail), 'total keluar: ' + detail);
  assert(/\+Rp 1\.200\.000/.test(detail), 'surplus 1,2jt: ' + detail);
  click(root.querySelector('[data-bsperiod="y"]'));
  assert.strictEqual(svg.querySelectorAll('.bar-col').length, 12, 'mode tahun: 12 kolom bulan Jan-Des');
  const novCol = svg.querySelector('.bar-col[data-bidx="10"]');
  assert(novCol, 'kolom November (idx 10) ada');
  novCol.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: true }));
  assert($('bar-tooltip').classList.contains('visible'), 'tooltip bar tampil saat hover');
  const tipText = $('bar-tooltip').textContent.replace(/\s+/g, ' ');
  assert(/November 2026/.test(tipText) && /Masuk: Rp 2\.000\.000/.test(tipText) && /Keluar: Rp 500\.000/.test(tipText), 'isi tooltip November benar: ' + tipText);
  novCol.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  assert(!$('bar-tooltip').classList.contains('visible'), 'mouseleave menutup tooltip');

  const html = w.monthFlowCard({ entries: [
    { d: '2026-11-01', t: '+', amt: 693000, cat: 'Gaji' },
    { d: '2026-12-01', t: '+', amt: 2500000, cat: 'Gaji' },
    { d: '2026-11-01', t: '-', amt: 6827500, cat: 'Tagihan' },
    { d: '2026-12-01', t: '-', amt: 4535000, cat: 'Tagihan' },
    { d: '2026-12-01', t: '+', amt: 2500000, cat: 'Penyesuaian saldo' }
  ] });
  assert(html.includes('Rp 3.193.000') && html.includes('Rp 11.362.500'), 'sanity check agregasi sesuai spesifikasi (fixture)');
  P.tx = [];
  w.renderAll();
  assert(/Masuk Rp 0/.test($('bar-month-detail').textContent), 'total kembali Rp 0 saat kosong');
  console.log('OK flow_monthly');
  w.close();
})().catch((e) => { console.error(e); process.exit(1); });
