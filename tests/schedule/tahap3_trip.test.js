// Perjalanan disembunyikan bila belum ada datanya; menu memakai item navigasi langsung (bukan toggle).
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

  // menu: toggle hilang, item Perjalanan langsung navigasi
  w.document.querySelector('#alat-menu').hidden = false;
  const tripItem = w.document.querySelector('#alat-menu [data-go="trip"]');
  assert(tripItem, 'menu Alat punya item Perjalanan');
  assert.strictEqual(tripItem.textContent.trim(), 'Perjalanan');
  assert(!w.document.querySelector('#alat-menu [data-trip-toggle]'), 'toggle Perjalanan dihapus');
  assert.strictEqual(w.tripOn(), false, 'menu tidak mengubah visibilitas');

  // lembar Lainnya (HP): item Perjalanan langsung ke mode perjalanan
  click(bar.querySelector('[data-k="more"]'));
  const sheetTrip = w.document.querySelector('#botsheet [data-go="trip"]');
  assert(sheetTrip, 'lembar punya item Perjalanan');
  assert.strictEqual(sheetTrip.textContent.trim(), 'Perjalanan');
  click(sheetTrip);
  assert.strictEqual(w.mode, 'trip', 'langsung ke halaman Perjalanan');
  assert(!$('v-trip').hidden);
  assert(w.localStorage.getItem('rk-trip-vis') !== '1', 'tanpa set visibilitas eksplisit');

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
  console.error('GAGAL:', e.stack || e.message);
  process.exit(1);
});
