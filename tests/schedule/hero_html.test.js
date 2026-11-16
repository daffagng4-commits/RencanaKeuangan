// Kartu "Kondisi kas": satu section tertutup rapi, memuat saldo besar, grafik, dan 4 tile.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { $ } = t;
  try {
    const root = $('tab-rincian');
    assert(root, '#tab-rincian ada');
    const hero = root.querySelector('.stack > .card');
    assert(hero, 'kartu pertama (hero) ada');
    assert(hero.querySelector('.hero-balance-row'), 'hero memuat .hero-balance-row');
    assert(hero.querySelector('#rincian-saldo-now.hero-amount'), 'kartu memuat saldo utama #rincian-saldo-now');
    assert(hero.querySelector('#svg-cashflow'), 'grafik arus saldo #svg-cashflow di dalam kartu kondisi kas');
    assert(hero.querySelector('.grid-4') && hero.querySelectorAll('.grid-4 .metric-tile').length === 4, 'kartu memuat 4 metric-tile');
    assert(hero.querySelector('#metric-end-bal') && hero.querySelector('#metric-daily-val') && hero.querySelector('#metric-avg-bill') && hero.querySelector('#metric-total-year'), '4 metrik utama terpasang');
    assert.strictEqual(hero.querySelector('#upcoming-bills-list, #svg-bar-compare, #card-where-money, #monthly-flow-tbody, #recent-tx-groups'), null, 'kartu lain tidak masuk ke dalam kartu hero');
    console.log('OK hero_html');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
