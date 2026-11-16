// Uji ubah jadwal & geser tanggal lewat #modal-scenario + mesin core schedule.js (series, occ, moveStatusExact).
const assert = require('assert');
const { boot } = require('./ui.js');
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log('ok -', m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire } = t;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const sched = (it, y) => w.occ(it, y).map(iso);
  const ser = (it) => w.series(it, Date.UTC(2032, 11, 31)).map(iso);
  const mk = (o) => Object.assign({ id: 501, name: 'Tagihan Test', price: 100000, ch: [] }, o);

  // 1. Buka #modal-scenario & geser tanggal lewat UI mockup
  w.switchYear(2028);
  w.S.startMonth = 0;
  w.S.items = [mk({ start: '2028-01-01', n: 1, unit: 'bulan' })];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();

  w.openPm(501, '2028-02-01');
  assert(!$('modal-scenario').hidden && $('modal-scenario').classList.contains('open'), '#modal-scenario terbuka');
  click($('scenario-cards-grid').querySelector('[data-scen="shift"]'));
  $('scen-month').value = '1'; // Feb
  $('scen-shift-day').value = '18';
  click($('btn-save-scenario'));
  ok($('modal-scenario').hidden && !$('modal-scenario').classList.contains('open'), '#modal-scenario tertutup sesudah simpan');
  const dates28 = sched(w.S.items[0], 2028);
  ok(dates28.includes('2028-02-18') && !dates28.includes('2028-02-01'), 'tagihan Feb bergeser dari 1 Feb ke 18 Feb');

  // 2. Uji Berhenti bayar mulai Juli
  w.openPm(501, '2028-07-01');
  click($('scenario-cards-grid').querySelector('[data-scen="stop"]'));
  $('scen-month').value = '6'; // Jul (index 6)
  click($('btn-save-scenario'));
  ok(w.S.items[0].end === '2028-06-30', 'it.end diset ke 2028-06-30');
  ok(!sched(w.S.items[0], 2028).some((d) => d >= '2028-07-01'), 'tagihan mulai Juli berhenti');

  // 3. Mesin core schedule.js: siklus berbagai interval tidak pernah duplikat atau hilang
  const cycles = [
    { n: 13, unit: 'hari' },
    { n: 28, unit: 'hari' },
    { n: 2, unit: 'minggu' },
    { n: 1, unit: 'bulan' },
    { n: 3, unit: 'bulan' },
  ];
  for (const cy of cycles) {
    const it = mk({ start: '2028-02-05', ...cy });
    const list = ser(it);
    ok(list.length > 0 && new Set(list).size === list.length, 'series ' + cy.n + ' ' + cy.unit + ' unik tanpa duplikat');
    ok(list.join() === [...list].sort().join(), 'series ' + cy.n + ' ' + cy.unit + ' terurut kronologis');
  }

  ok(t.errs.length === 0, 'tidak ada galat JS: ' + t.errs.slice(0, 2).join('|'));
  console.log(`\n${pass} pengecekan modal & jadwal lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
