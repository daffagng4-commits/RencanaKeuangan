// Tahap 3 (item 14): Perjalanan disembunyikan bila belum ada datanya; bisa ditampilkan/disembunyikan dari menu.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const bar = $('botnav'), keys = () => [...bar.querySelectorAll('button')].map((b) => b.dataset.k);
  const tripBtn = () => w.document.querySelector('[data-md="trip"]');
  const alatToggle = () => w.document.querySelector('#alat-menu [data-trip-toggle]');

  // tanpa data perjalanan dan tanpa pilihan -> tersembunyi
  Object.keys(w.ALL.kas.pr).forEach((id) => { if (!w.ALL.kas.pr[id].link) delete w.ALL.kas.pr[id]; });
  w.localStorage.removeItem('rk-trip-vis');
  w.applyTripVis(true);
  assert.strictEqual(w.tripOn(), false, 'bawaan: tersembunyi tanpa data perjalanan');
  assert(tripBtn().hidden, 'tombol mode Perjalanan tersembunyi');
  assert.deepStrictEqual(keys(), ['rincian', 'kas', 'jadwal', 'item', 'more'], 'bilah bawah memakai Item');
  assert(!w.document.querySelector('#botsheet [data-go="item"]'), 'Kelola Item tidak diulang di lembar');
  assert(w.getComputedStyle(tripBtn()).display === 'none');

  // menyalakan dari menu Alat
  assert.strictEqual(alatToggle().getAttribute('aria-checked'), 'false');
  click($('alat-btn'));
  click(alatToggle());
  assert.strictEqual(w.tripOn(), true);
  assert.strictEqual(w.localStorage.getItem('rk-trip-vis'), '1');
  assert(!tripBtn().hidden, 'tombol mode tampil');
  assert.deepStrictEqual(keys(), ['rincian', 'kas', 'jadwal', 'trip', 'more'], 'bilah bawah memakai Perjalanan');
  assert(w.document.querySelector('#botsheet [data-go="item"]'), 'Kelola Item pindah ke lembar Lainnya');
  assert(alatToggle().classList.contains('on') && alatToggle().getAttribute('aria-checked') === 'true');

  // masuk mode Perjalanan lalu sembunyikan -> kembali ke Rencana
  click(bar.querySelector('[data-k="trip"]'));
  assert.strictEqual(w.mode, 'trip');
  click($('alat-btn'));
  click(alatToggle());
  assert.strictEqual(w.tripOn(), false);
  assert.strictEqual(w.mode, 'rencana', 'keluar dari mode Perjalanan saat disembunyikan');
  assert(!$('v-rincian').hidden || !$('v-jadwal').hidden || !$('v-kas').hidden, 'tampilan Rencana kembali');
  assert($('v-trip').hidden);

  // lembar Lainnya (HP) juga bisa menyalakan; tombol 'item' aktif saat tab Item terbuka
  click(bar.querySelector('[data-k="item"]'));
  assert.strictEqual(w.curTab, 'item');
  assert(bar.querySelector('[data-k="item"]').classList.contains('on'), 'Item menyala');
  click(bar.querySelector('[data-k="more"]'));
  click(w.document.querySelector('#botsheet [data-trip-toggle]'));
  assert.strictEqual(w.tripOn(), true);
  assert($('botsheet').hidden, 'lembar menutup');
  assert(bar.querySelector('[data-k="more"]').classList.contains('on'), 'Lainnya menyala untuk tab Item bila Perjalanan tampil');

  // data perjalanan ada + belum ada pilihan eksplisit -> tampil otomatis
  w.localStorage.removeItem('rk-trip-vis');
  w.ALL.kas.pr.tripx = { id: 'tripx', name: 'Bali', link: false, tx: [], saldo: 0, nm: [], auto: true };
  w.applyTripVis(false);
  assert.strictEqual(w.tripOn(), true, 'ada data perjalanan -> tampil');
  // pilihan eksplisit menang atas data
  w.setTripVisible(false);
  assert.strictEqual(w.tripOn(), false);
  delete w.ALL.kas.pr.tripx;
  w.localStorage.removeItem('rk-trip-vis');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_trip lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
