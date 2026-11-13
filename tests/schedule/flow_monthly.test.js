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
  const root = $('v-rincian');
  const bs = root.querySelector('.bs-card');
  assert(bs, 'kartu stacked bar ada');
  assert(/Pemasukan vs pengeluaran per bulan/.test(bs.querySelector('h2').textContent), 'judul baru');
  assert(bs.querySelectorAll('.bs-seg.i').length >= 1 && bs.querySelectorAll('.bs-seg.o').length >= 2, 'segmen masuk dan keluar');
  const foot = bs.querySelector('.bs-foot').textContent.replace(/\s+/g, ' ');
  assert(/Total masuk Rp 2\.000\.000/.test(foot), 'penyesuaian tidak dihitung sebagai pemasukan: ' + foot);
  assert(/Total .*keluar Rp 800\.000/.test(foot), 'total keluar: ' + foot);
  assert(/Surplus/.test(foot), 'surplus 1,2jt: ' + foot);
  const grid = root.querySelector('.rk');
  assert(grid, 'grid Rincian ada');
  const cat = grid.querySelector('.rk-cat'), top = grid.querySelector('.rk-top');
  assert(grid.querySelector('.rk-kas .rk-flow svg.lc'), 'arus saldo: grafik di dalam kartu Kondisi kas');
  assert(cat && cat.querySelector('.insight'), 'baris 2: kartu kategori');
  assert(top && top.querySelector('.expense-card'), 'baris 2: kartu item terbesar terpisah');
  assert(/Pengeluaran & pemasukan per kategori/.test(cat.querySelector('.insight h2').textContent), 'judul kategori');
  assert(/Item pengeluaran terbesar/.test(top.querySelector('.expense-card h2').textContent), 'judul item terbesar');
  click(bs.querySelector('[data-bsp="y"]'));
  const bs2 = $('v-rincian').querySelector('.bs-card');
  assert(bs2.querySelectorAll('.bs-tick').length === 12, 'mode tahun: 12 label bulan');
  assert.strictEqual(bs2.querySelectorAll('.bs-d').length, 2, 'bulan kosong tanpa label selisih');
  const cols = bs2.querySelectorAll('.bs-col[tabindex]');
  assert(/November 2026: pemasukan Rp 2\.000\.000, pengeluaran Rp 500\.000, selisih plus Rp 1\.500\.000/.test(cols[0].getAttribute('aria-label')));
  cols[0].focus();
  assert(bs2.querySelector('.bs-tip').classList.contains('on'), 'tooltip fokus keyboard');
  cols[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.strictEqual(w.document.activeElement, cols[1], 'panah memindahkan fokus');
  cols[1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!bs2.querySelector('.bs-tip').classList.contains('on'), 'Escape menutup tooltip');
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
  assert($('v-rincian').querySelector('.bs-card .empty'), 'empty state tanpa chart rekaan');
  console.log('OK flow_monthly');
  w.close();
})().catch((e) => { console.error(e); process.exit(1); });
