// Kartu "Kondisi kas": satu section tertutup rapi, memuat saldo besar, grafik, dan 4 tile.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { $ } = t;
  try {
    const root = $('v-rincian');
    const kas = root.querySelector('.rk > .rk-kas');
    assert(kas, 'slot .rk-kas ada');
    assert.strictEqual(kas.querySelectorAll(':scope > section.card').length, 1, '.rk-kas berisi tepat 1 kartu');
    const hero = kas.querySelector('.card.cond.hm.hero');
    assert(hero, 'kartu tunggal .cond.hm.hero');
    assert(hero.querySelector('.hm-stats'), 'kartu memuat .hm-stats');
    assert(hero.querySelector('.cond-big.hm-big'), 'kartu memuat saldo utama .hm-big');
    assert(hero.querySelector('.rk-flow svg.lc'), 'grafik arus saldo di dalam kartu Kondisi kas');
    assert.strictEqual(root.querySelectorAll('.rk > .rk-kas').length, 1, 'satu kartu gabungan untuk Kondisi kas');
    assert(!root.querySelector('.rk > .rk-flow'), 'grafik bukan lagi slot bersaudara');
    // Keseimbangan tag: 7 slot, urutan sesuai target tata letak.
    const grid = root.querySelector('.rk');
    const kids = [...grid.children].map((e) => e.className.split(' ')[0]);
    assert.deepStrictEqual(kids, ['rk-kas', 'rk-bills', 'rk-mf', 'rk-cat', 'rk-top', 'rk-detail', 'rk-tx']);
    assert.strictEqual(kas.querySelector('.rk-mf, .rk-bills, .rk-top'), null, 'slot lain tidak ikut masuk ke .rk-kas');
    console.log('OK hero_html');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
