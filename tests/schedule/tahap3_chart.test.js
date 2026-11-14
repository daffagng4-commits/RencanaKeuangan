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
    const row = [...$('v-rincian').querySelectorAll('.insight .dn-lg button')].filter((b) => b.querySelector('.n').textContent.trim() === name)[0];
    return row.querySelector('i').style.background;
  };
  const before = { h: dotColor('Hiburan'), m: dotColor('Makan') };
  w.S.items[1].price = 5000000; // urutan nilai berubah (Makan jadi terbesar)
  w.renderAll();
  assert.strictEqual(dotColor('Makan'), before.m, 'warna Makan tidak berubah walau urutannya berubah');
  assert.strictEqual(dotColor('Hiburan'), before.h, 'warna Hiburan tidak berubah');
  w.S.items[1].price = 100000;
  w.renderAll();

  // ---- tooltip ----
  const brow = $('v-rincian').querySelector('.insight .dn-lg button');
  const ctr = $('v-rincian').querySelector('.insight .dn-c');
  ev(brow, 'pointerover');
  assert(/Rp [\d.]+/.test(ctr.textContent) && /% dari total/.test(ctr.textContent), 'hover keterangan menyalakan irisan: ' + ctr.textContent);
  assert(brow.classList.contains('on'), 'baris keterangan ikut tersorot');
  ev(brow, 'pointerleave');
  assert(/^TotalRp / .test(ctr.textContent.replace(/\s+/g,' ')) || /Total/.test(ctr.textContent), 'lepas kursor mengembalikan total: ' + ctr.textContent);
  click(brow);
  assert.strictEqual(brow.getAttribute('aria-pressed'), 'false', 'ketuk keterangan menyembunyikan irisan');
  click(brow);
  assert.strictEqual(brow.getAttribute('aria-pressed'), 'true', 'ketuk lagi menampilkan irisan');

  // grafik: kurva halus + crosshair/tooltip interaktif
  const chart = $('v-rincian').querySelector('svg[aria-label^="Grafik arus saldo"]');
  assert(chart, 'grafik arus saldo ada');
  const line = chart.querySelector('.lc-line');
  assert(line.getAttribute('d') && line.getAttribute('d').split('L').length > 10, 'kurva halus banyak titik');
  // Grafik tanpa kepala (bare): judul di .lc-cap, angka besar & chip tetap element-nya sendiri.
  // jsdom closest('.card') bisa berhenti di .lc-card terdalam; ambil kartu gabungan lewat .cond.
  const kasCard = chart.closest('.cond') || chart.closest('.card');
  const big = kasCard.querySelector('#cond-big') || kasCard.querySelector('.hm-big');
  assert(big && /Rp/.test(big.textContent), 'nominal besar terisi: ' + (big ? big.textContent : 'tidak ada'));
  const chip = kasCard.querySelector('#cond-chip');
  assert(chip && /^[▲▼] \d/.test(chip.textContent), 'chip persen perubahan: ' + (chip ? chip.textContent : 'tidak ada #cond-chip'));
  const ctip = chart.closest('.lc-card').querySelector('.lc-tip');
  chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 250, right: 720, bottom: 250 });
  const pe = (type, x) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    e.pointerId = 1; e.clientX = x; e.clientY = 40;
    chart.dispatchEvent(e);
  };
  pe('pointerdown', 4);
  assert(chart.querySelector('.lc-cur').style.display !== 'none', 'crosshair muncul saat disentuh');
  assert.strictEqual(ctip.style.opacity, '1', 'tooltip tampil');
  assert(/Rp/.test(ctip.lastElementChild.textContent), 'tooltip berisi nominal: ' + ctip.lastElementChild.textContent);
  const cx0 = +chart.querySelector('.lc-cd').getAttribute('cx');
  pe('pointermove', 716);
  assert(+chart.querySelector('.lc-cd').getAttribute('cx') > cx0, 'crosshair ikut bergeser');
  chart.dispatchEvent(new w.Event('pointerleave', { bubbles: true }));
  assert.strictEqual(chart.querySelector('.lc-cur').style.display, 'none', 'lepas menutup crosshair');
  w.S.startMonth = 10;
  w.renderAll();
  const c2 = $('v-rincian').querySelector('svg[aria-label^="Grafik arus saldo"]');
  assert(c2 && c2.querySelector('.lc-line').getAttribute('d'), 'grafik tetap tampil walau mulai November');
  w.S.startMonth = 0;
  w.renderAll();
  w.kasLinked().tx = [{ id: 'g', d: '2026-12-01', t: '+', amt: 3000000, cat: 'Gaji', note: 'Gaji' }];
  w.S.items.push(it({ id: 'd', name: 'Cicilan', price: 700000, unit: 'sekali', start: '2026-11-20' }));
  w.renderAll();

  // pie pemasukan vs pengeluaran pindah ke Rincian Bulanan, di samping grafik arus saldo
  w.tab('rincian');
  w.renderAll();
  const dn = $('v-rincian').querySelector('.insight .dn');
  assert(dn, 'donut per kategori di Rincian Bulanan');
  const ns = dn.querySelectorAll('.dn-slice').length,
    nr = dn.querySelectorAll('.dn-lg button').length;
  assert(ns > 1, 'donut punya irisan per kategori: ' + ns);
  assert.strictEqual(nr, ns, 'satu baris keterangan per irisan');
  const vals = [].map.call(dn.querySelectorAll('.dn-lg .v'), function (v) { return Number(v.textContent.replace(/[^\d]/g, '')); });
  assert(vals.every(function (v, i) { return i === 0 || vals[i - 1] >= v; }), 'keterangan urut dari terbesar');
  assert(/transaksi/.test(txt($('v-rincian').querySelector('.insight-cat'))), 'footer transaksi tetap ada');

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
