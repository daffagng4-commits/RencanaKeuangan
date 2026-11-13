// heroHtml (kartu "Kondisi kas") harus menutup wrapper .hero-nya sendiri.
// Bila satu </div> hilang, DOM browser memasukkan kartu-kartu berikutnya ke dalam kartu saldo.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { w, $ } = t;
  try {
    const hero = $('v-rincian').querySelector('.hero');
    assert(hero, 'kartu saldo (.hero) ada');
    // Satu kartu tunggal: blok saldo + .hm-stats di dalamnya (bukan dua kartu terpisah).
    assert.strictEqual(hero.querySelectorAll(':scope > .card').length, 1, '.hero berisi tepat 1 kartu pembungkus');
    assert(hero.querySelector('.hm-stats'), '.hero memuat .hm-stats');
    assert(hero.querySelector('.hm-big'), '.hero memuat saldo utama .hm-big');
    assert(!hero.querySelector('.rk-flow, .rk-mf, .rk-bills'), 'slot lain tidak ikut masuk ke dalam .hero');
    // Keseimbangan tag: elemen .hero harus sejajar dengan slot saudaranya, bukan membungkusnya.
    const grid = $('v-rincian').querySelector('.rk');
    const kids = [...grid.children].map((e) => e.className.split(' ')[0]);
    assert.deepStrictEqual(kids, ['rk-kas', 'rk-flow', 'rk-mf', 'rk-bills', 'rk-cat', 'rk-detail', 'rk-tx']);
    assert.strictEqual(grid.querySelector('.rk-kas').querySelector('.rk-flow'), null, '.rk-kas tidak memuat .rk-flow');
    console.log('OK hero_html');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
