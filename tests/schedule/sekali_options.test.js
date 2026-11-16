const assert = require('assert');
const { boot } = require('./ui');

(async () => {
  console.log('=== Menguji Modal Skenario (#modal-scenario) untuk Item Sekali Saja ===');
  const { w, $, click, fire, errs } = boot();
  w.switchYear(2026);
  w.S.startMonth = 0;

  const itemSekali = {
    id: 888,
    name: 'Tiket Konser',
    price: 500000,
    start: '2026-11-20',
    unit: 'sekali',
    n: 1,
    ch: [],
  };
  w.S.items = [itemSekali];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();

  // 1. Buka modal #modal-scenario untuk item sekali saja
  w.openPm(888, '2026-11-20');
  assert(!$('modal-scenario').hidden && $('modal-scenario').classList.contains('open'), 'Modal #modal-scenario terbuka');
  ['change_price', 'temp_price', 'cycle', 'shift', 'stop', 'manual'].forEach((k) => {
    assert($('scenario-cards-grid').querySelector('[data-scen="' + k + '"]'), 'kartu ' + k + ' tersedia');
  });

  // 2. Uji 'Geser tanggal'
  click($('scenario-cards-grid').querySelector('[data-scen="shift"]'));
  $('scen-month').value = '10';
  $('scen-shift-day').value = '25';
  click($('btn-save-scenario'));
  let dates = w.occ(w.S.items[0], 2026).map(w.isoD);
  assert.strictEqual(dates[0], '2026-11-25', 'Tanggal bergeser ke 2026-11-25');
  assert.strictEqual(dates.length, 1);

  // 3. Uji 'Ganti siklus' (dari sekali menjadi tiap 1 bulan)
  w.openPm(888, '2026-11-25');
  click($('scenario-cards-grid').querySelector('[data-scen="cycle"]'));
  $('scen-cycle-val').value = 'tiap bulan';
  fire($('scen-cycle-val'), 'change');
  click($('btn-save-scenario'));
  const dates2026 = w.occ(w.S.items[0], 2026).map(w.isoD);
  assert(dates2026.length >= 2, 'Harus menghasilkan jadwal berulang tiap bulan');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JS: ' + errs.join('|'));
  console.log('Semua pengujian opsi item sekali saja di #modal-scenario BERHASIL!');
  process.exit(0);
})();
