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
  assert.strictEqual(w.catColor(''), '#8a99a3');
  assert.strictEqual(w.catColor('Tanpa kategori'), '#8a99a3');
  assert.strictEqual(w.catColor('Investasi'), '#6366f1');
  assert.strictEqual(w.catColor('DCA saham'), '#6366f1');
  const makan = w.catColor('Makan'), a = w.catColor('Hiburan');
  assert(/^#[0-9a-f]{6}$/.test(makan));
  assert.strictEqual(w.catColor('Makan'), makan, 'deterministik');

  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 0;
  w.S.items = [it({ id: 'a', name: 'A', price: 900000, cat: 'Hiburan' }), it({ id: 'b', name: 'B', price: 100000, cat: 'Makan' }), it({ id: 'c', name: 'C', price: 500000, cat: 'Investasi' })];
  w.S.paid = {};
  w.S.skip = {};
  w.tab('rincian');
  w.renderAll();
  const dotColor = (name) => {
    const row = [...$('v-rincian').querySelectorAll('.catrow')].filter((r) => r.querySelector('.cathd span').textContent.trim().startsWith(name))[0];
    return row.querySelector('.catbar i').style.background;
  };
  const before = { h: dotColor('Hiburan'), m: dotColor('Makan') };
  w.S.items[1].price = 5000000; // urutan nilai berubah (Makan jadi terbesar)
  w.renderAll();
  assert.strictEqual(dotColor('Makan'), before.m, 'warna Makan tidak berubah walau urutannya berubah');
  assert.strictEqual(dotColor('Hiburan'), before.h, 'warna Hiburan tidak berubah');
  w.S.items[1].price = 100000;
  w.renderAll();

  // ---- tooltip ----
  const row = $('v-rincian').querySelector('.catrow[data-tip]');
  assert(/Rp [\d.]+ \(\d+% dari total\)/.test(row.dataset.tip), row.dataset.tip);
  const tip = $('tip');
  assert(tip && tip.hidden, 'tooltip tersembunyi awalnya');
  ev(row, 'pointerover');
  assert(!tip.hidden && tip.textContent === row.dataset.tip, 'hover menampilkan tooltip');
  ev(row, 'pointerout');
  assert(tip.hidden, 'pointerout menyembunyikan');
  click(row);
  assert(!tip.hidden, 'ketuk menampilkan');
  click(row);
  assert(tip.hidden, 'ketuk lagi menyembunyikan');
  click(row);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(tip.hidden, 'Escape menutup');
  click($('btn-privacy'));
  ev(row, 'pointerover');
  assert(!/\d{3}/.test(tip.textContent.replace(/\d+%/, '')) && /Rp \u2022\u2022\u2022\u2022/.test(tip.textContent), 'nominal disamarkan saat privasi aktif: ' + tip.textContent);
  ev(row, 'pointerout');
  click($('btn-privacy'));

  // grafik: satu grafik arus saldo dengan 12 titik + area hover bertooltip
  const dots = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] circle.lc-d');
  assert.strictEqual(dots.length, 12, '12 titik saldo akhir');
  const hits = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] rect[data-tip]');
  assert.strictEqual(hits.length, 12, '12 area hover punya tooltip');
  assert(/saldo Rp/.test(hits[0].dataset.tip), hits[0].dataset.tip);
  w.S.startMonth = 10;
  w.renderAll();
  const part = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] rect[data-tip]');
  assert.strictEqual(part.length, 12, 'grafik tetap 12 bulan walau mulai November');
  assert(/sebelum pencatatan/.test(part[0].dataset.tip), part[0].dataset.tip);
  w.S.startMonth = 0;
  w.renderAll();
  w.kasLinked().tx = [{ id: 'g', d: '2026-12-01', t: '+', amt: 3000000, cat: 'Gaji', note: 'Gaji' }];
  w.S.items.push(it({ id: 'd', name: 'Cicilan', price: 700000, unit: 'sekali', start: '2026-11-20' }));
  w.renderAll();

  // grafik kas
  w.tab('kas');
  w.kasLinked().tx = [
    { id: 'k1', d: '2026-03-01', t: '+', amt: 1000000, cat: 'Gaji', note: '' },
    { id: 'k2', d: '2026-03-09', t: '-', amt: 250000, cat: 'Makan', note: '' },
    { id: 'k3', d: '2026-03-15', t: '-', amt: 100000, cat: 'Makan', note: '' },
  ];
  w.renderAll();
  const kr = $('v-kas').querySelectorAll('.kch rect[data-tip]');
  assert(kr.length >= 2 && /saldo Rp/.test(kr[0].dataset.tip), 'grafik kas punya tooltip: ' + kr.length);
  assert($('v-kas').querySelector('.catrow[data-tip]'), 'kategori kas punya tooltip');

  // ---- empty state ----
  w.kasLinked().tx = [];
  w.renderAll();
  const cta = $('v-kas').querySelector('[data-kfocus]');
  assert(cta, 'CTA catat transaksi pertama');
  click(cta);
  assert.strictEqual(w.document.activeElement && w.document.activeElement.id, 'ka', 'kolom jumlah difokuskan');
  w.S.items = [it({ id: 'z', name: 'Z', price: 100000, cat: '' })];
  w.tab('rincian');
  w.renderAll();
  assert(/Belum ada kategori/.test(txt($('v-rincian'))));
  click($('v-rincian').querySelector('.card [data-goto="item"]'));
  assert.strictEqual(w.curTab, 'item', 'CTA kategori membuka Kelola Item');
  w.S.items = [];
  w.tab('rincian');
  w.renderAll();
  assert(/Mulai dari item pertama/.test(txt($('v-rincian'))), 'ajakan saat belum ada item');
  click($('v-rincian').querySelector('button.p[data-goto="item"]'));
  assert.strictEqual(w.curTab, 'item');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_chart lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
