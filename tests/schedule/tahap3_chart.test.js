// Tahap 3 (item 12): warna kategori stabil, tooltip (hover/ketuk/fokus + sensor privasi), dan empty state dengan tombol aksi.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const txt = (el) => el.textContent.replace(/\s+/g, ' ');
  const ev = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
  const it = (o) => Object.assign({ id: 'x', name: 'T', price: 1000, n: 1, unit: 'bulan', start: '2026-01-05', ch: [], cat: '', end: '', cnt: 0 }, o);

  // ---- warna kategori stabil ----
  assert.strictEqual(w.catColor(''), 'var(--mut)');
  assert.strictEqual(w.catColor('Tanpa kategori'), 'var(--mut)');
  assert.strictEqual(w.catColor('Investasi'), 'var(--bl)');
  assert.strictEqual(w.catColor('DCA saham'), 'var(--bl)');
  const makan = w.catColor('Makan'), a = w.catColor('Hiburan');
  assert(/^(#[0-9a-f]{6}|hsl\()/.test(makan), makan);
  assert.strictEqual(w.catColor('Makan'), makan, 'deterministik');

  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 0; w.S.smManual = true;
  w.S.items = [it({ id: 'a', name: 'A', price: 900000, cat: 'Hiburan' }), it({ id: 'b', name: 'B', price: 100000, cat: 'Makan' }), it({ id: 'c', name: 'C', price: 500000, cat: 'Investasi' })];
  w.S.paid = {};
  w.S.skip = {};
  w.tab('rincian');
  w.renderAll();
  const dotColor = (name) => {
    const row = [...$('where-cat-list').querySelectorAll('.simple-row')].find((b) => b.dataset.wcat === name);
    return row.querySelector('.simple-row-bar i').style.background;
  };
  const before = { h: dotColor('Hiburan'), m: dotColor('Makan') };
  w.S.items[1].price = 5000000; // urutan nilai berubah (Makan jadi terbesar)
  w.renderAll();
  assert.strictEqual(dotColor('Makan'), before.m, 'warna Makan tidak berubah walau urutannya berubah');
  assert.strictEqual(dotColor('Hiburan'), before.h, 'warna Hiburan tidak berubah');
  w.S.items[1].price = 100000;
  w.renderAll();

  // ---- bar & daftar per kategori ----
  const barSeg = $('where-cat-list').querySelector('.simple-row-bar i');
  assert(barSeg, 'segmen bar kategori ada');

  // grafik: kurva halus + crosshair/tooltip interaktif
  const chart = $('svg-cashflow');
  assert(chart, 'grafik arus saldo #svg-cashflow ada');
  assert(chart.querySelector('path[d]') && chart.querySelector('path[d]').getAttribute('d').length > 10, 'kurva halus ter-render');
  const hit = chart.getElementById('cf-hit'), tip = $('cashflow-tooltip');
  assert(hit && tip, 'hit rect dan tooltip grafik arus kas ada');
  chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 250, right: 720, bottom: 250 });
  $('cashflow-chart-wrap').getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 250, right: 720, bottom: 250 });
  const mv = new w.MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 80 });
  hit.dispatchEvent(mv);
  assert(chart.getElementById('cf-crosshair').style.display !== 'none', 'crosshair muncul saat digeser');
  assert(tip.classList.contains('visible'), 'tooltip tampil');
  assert(/Rp/.test(tip.textContent), 'tooltip berisi nominal: ' + tip.textContent);
  hit.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  assert.strictEqual(chart.getElementById('cf-crosshair').style.display, 'none', 'mouseleave menutup crosshair');

  w.S.startMonth = 10;
  w.renderAll();
  assert($('svg-cashflow').querySelector('path[d]'), 'grafik tetap tampil walau mulai November');
  w.S.startMonth = 0;
  w.renderAll();
  w.kasLinked().tx = [{ id: 'g', d: '2026-12-01', t: '+', amt: 3000000, cat: 'Gaji', note: 'Gaji' }];
  w.S.items.push(it({ id: 'd', name: 'Cicilan', price: 700000, unit: 'sekali', start: '2026-11-20' }));
  w.renderAll();

  // kategori urut dari terbesar & footer
  w.tab('rincian');
  w.renderAll();
  const vals = [].map.call($('where-cat-list').querySelectorAll('.simple-row-amt'), function (v) { return Number(v.textContent.replace(/[^\d]/g, '')); });
  assert(vals.length > 1 && vals.every(function (v, i) { return i === 0 || vals[i - 1] >= v; }), 'kategori urut dari terbesar');

  // ---- empty state ----
  w.kasLinked().tx = [];
  w.renderAll();
  w.tab('kas');
  assert($('tab-kas').textContent.includes('Tidak ada transaksi'), 'empty state riwayat kas tampil');
  w.S.items = [it({ id: 'z', name: 'Z', price: 100000, cat: '' })];
  w.tab('rincian');
  w.renderAll();
  assert(/Tagihan/.test(txt($('tab-rincian'))), 'tagihan tanpa kategori tetap tampil di kategori');
  w.S.items = [];
  w.tab('rincian');
  w.renderAll();
  assert(/Semua tagihan sudah lunas/.test(txt($('upcoming-bills-list'))), 'pesan saat belum ada tagihan jatuh tempo');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_chart lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
