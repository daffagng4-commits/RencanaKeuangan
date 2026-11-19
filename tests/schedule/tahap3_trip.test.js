// Mode Perjalanan tampil di sidebar (sesuai mockup), menu Alat, dan lembar Lainnya HP.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const bar = w.document.querySelector('.mobile-bottom-nav'), keys = () => [...bar.querySelectorAll('button[data-tab]')].map((b) => b.dataset.tab);
  const tripBtn = () => w.document.getElementById('nav-btn-trip');

  // Tombol Perjalanan di sidebar selalu siap sesuai mockup
  assert(tripBtn() && !tripBtn().hidden, 'tombol Perjalanan #nav-btn-trip tampil di sidebar');
  assert.deepStrictEqual(keys(), ['rincian', 'kas', 'jadwal', 'item'], 'bilah bawah memakai 4 tab inti');

  // Klik di menu Alat langsung ke Perjalanan
  click($('alat-btn'));
  const tripItem = w.document.querySelector('#alat-menu [data-go="trip"]');
  assert(tripItem && /Perjalanan/.test(tripItem.textContent), 'menu Alat punya item Perjalanan');
  click(tripItem);
  assert.strictEqual(w.mode, 'trip', 'klik di menu Alat mengaktifkan Mode Perjalanan');
  assert(!$('tab-trip').hidden, '#tab-trip tampil');

  // Lembar Lainnya (HP) juga berpindah langsung ke Perjalanan
  w.setMode('rencana');
  click($('btn-mobile-more'));
  const sheetTrip = w.document.querySelector('#mobile-more-sheet [data-mob-go="trip"]');
  assert(sheetTrip && /Perjalanan/.test(sheetTrip.textContent));
  click(sheetTrip);
  assert.strictEqual(w.mode, 'trip', 'lembar Lainnya mengaktifkan Mode Perjalanan');

  // Paritas fungsi murni goalCompute dengan aturan goalCalc desktop
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(w.goalCompute(6000000, 1500000, '2026-10', '2026-12', false))),
    { link: false, t: 6000000, s0: 1500000, from: '2026-10', to: '2026-12', n: 3, per: 1500000 },
    'goalCompute menghitung cicilan bulanan sesuai aturan desktop'
  );
  assert.strictEqual(w.goalCompute(6000000, 100000, '2026-10', '2026-12', true).per, 1967000, 'goalCompute membulatkan per ke atas kelipatan 1000');
  assert.strictEqual(w.goalCompute(6000000, 0, '2026-12', '2026-10', true).n, 0, 'goalCompute mengembalikan n=0 bila to < from');
  assert.strictEqual(w.goalCompute(6000000, 6000000, '2026-10', '2026-12', true).per, 0, 'goalCompute mengembalikan per=0 bila dana terkumpul >= target');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_trip lulus');
  process.exit(0);
})();
