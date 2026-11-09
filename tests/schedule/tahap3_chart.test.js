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

  // grafik: satu grafik arus saldo per tanggal + area hover bertooltip
  const dots = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] circle.lc-d');
  assert(dots.length >= 1, 'titik saldo per tanggal');
  const hits = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] rect[data-tip]');
  assert.strictEqual(hits.length, dots.length, 'area hover punya tooltip');
  assert(/saldo Rp/.test(hits[0].dataset.tip), hits[0].dataset.tip);

  // geser jari (touch): titik aktif mengikuti posisi jari
  const chart = $('v-rincian').querySelector('svg.lc');
  chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 238, right: 720, bottom: 238 });
  const pe = (type, x) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    e.pointerId = 1; e.clientX = x; e.clientY = 40;
    hits[0].dispatchEvent(e);
  };
  const activeIdx = () => [...chart.querySelectorAll('.lc-p')].findIndex((g) => g.classList.contains('active'));
  pe('pointerdown', 2);
  assert.strictEqual(activeIdx(), 0, 'sentuh kiri: titik pertama aktif');
  pe('pointermove', 718);
  assert.strictEqual(activeIdx(), dots.length - 1, 'geser ke kanan: titik terakhir aktif');
  assert(!$('tip').hidden, 'geser jari menampilkan tooltip');
  w.document.dispatchEvent(new w.Event('pointercancel'));
  assert.strictEqual(activeIdx(), -1, 'lepas jari menghapus titik aktif');
  w.S.startMonth = 10;
  w.renderAll();
  const part = $('v-rincian').querySelectorAll('svg[aria-label^="Grafik arus saldo"] rect[data-tip]');
  assert(part.length >= 1, 'grafik tetap tampil walau mulai November');
  w.S.startMonth = 0;
  w.renderAll();
  w.kasLinked().tx = [{ id: 'g', d: '2026-12-01', t: '+', amt: 3000000, cat: 'Gaji', note: 'Gaji' }];
  w.S.items.push(it({ id: 'd', name: 'Cicilan', price: 700000, unit: 'sekali', start: '2026-11-20' }));
  w.renderAll();

  // pie pemasukan vs pengeluaran pindah ke Rincian Bulanan, di samping grafik arus saldo
  w.tab('rincian');
  w.renderAll();
  const pie = $('v-rincian').querySelector('.insight .pie');
  assert(pie, 'pie pemasukan vs pengeluaran di Rincian Bulanan');
  assert.strictEqual(pie.querySelectorAll('.pie-slice').length, 2, 'dua potongan pie (pemasukan & pengeluaran)');
  assert(/Masuk/.test(txt($('v-rincian'))) && /Keluar/.test(txt($('v-rincian'))), 'legenda warna pemasukan/pengeluaran');

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
  assert(/Tagihan/.test(txt($('v-rincian'))), 'tagihan tanpa kategori tetap tampil di kategori');
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
