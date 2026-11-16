// Uji harga per tanggal (priceAt) & perubahan harga lewat #modal-scenario (data lama maupun ubah baru).
const assert = require('assert');
const { boot } = require('./ui.js');
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log('ok -', m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire, click } = t;
  const price = (it, d) => w.priceAt(it, Date.parse(d + 'T00:00:00Z'));

  // data lama: harga awal 1,1 jt; tagihan 1 Nov & 1 Des digeser ke 5 Nov & 5 Des
  const base = () => ({
    id: 31, name: 'Saham Lokal 40%', price: 1100000, start: '2026-11-01', n: 1, unit: 'bulan',
    ch: [
      { from: '2026-11-01', to: '2026-11-01', dates: ['2026-11-01'], price: 300000, n: null, unit: null, cut: false },
      { from: '2026-11-01', to: '2026-12-01', price: null, n: null, unit: null, cut: false, mv: { '2026-11-01': '2026-11-05', '2026-12-01': '2026-12-05' } },
      { from: '2026-12-01', to: '2026-12-01', dates: ['2026-12-01'], price: 1300000, n: null, unit: null, cut: false },
      { from: '2026-12-01', to: '', price: null, n: null, unit: null, cut: false },
    ],
  });
  const legacy5 = { from: '2026-12-05', to: '2026-12-05', dates: ['2026-12-05'], price: 570000, n: null, unit: null, cut: false };

  // 1. Data lama: harga 5 Des terbaca 570.000
  const it0 = base(); it0.ch.push(legacy5);
  ok(price(it0, '2026-12-05') === 570000, 'data lama (570.000 tersimpan dengan tanggal 5 Des): harga 5 Des terbaca Rp 570.000');
  ok(price(it0, '2026-11-05') === 300000, 'harga 5 Nov (asli 1 Nov) tetap Rp 300.000');
  ok(price(base(), '2026-12-05') === 1100000, 'tanpa perubahan 5 Des: kembali ke harga awal 1,1 jt');

  // 2. Simpan harga baru lewat #modal-scenario (kartu Harga berubah & Harga sementara)
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.items = [{ id: 32, name: 'Internet', price: 350000, start: '2026-10-10', n: 1, unit: 'bulan', ch: [] }];
  w.S.paid = {}; w.S.skip = {};
  w.renderAll();

  w.openPm(32, '2026-12-10');
  click($('scenario-cards-grid').querySelector('[data-scen="change_price"]'));
  $('scen-new-price').value = '500000';
  fire($('scen-new-price'), 'input');
  ok($('scen-new-price').value === '500.000', 'input harga skenario auto-format titik');
  $('scen-month').value = '11'; // Des
  click($('btn-save-scenario'));
  ok(price(w.S.items[0], '2026-12-10') === 500000, 'harga Des naik menjadi Rp 500.000');
  ok(price(w.S.items[0], '2026-11-10') === 350000, 'harga Nov tetap Rp 350.000');

  // 3. Tagihan yang tidak digeser tidak terpengaruh
  const plain = { id: 33, name: 'Lain', price: 100000, start: '2026-11-10', n: 1, unit: 'bulan', ch: [{ from: '2026-12-10', to: '2026-12-10', dates: ['2026-12-10'], price: 250000, n: null, unit: null, cut: false }] };
  ok(price(plain, '2026-12-10') === 250000 && price(plain, '2026-11-10') === 100000 && price(plain, '2027-01-10') === 100000, 'tagihan lain: harga per tanggal tetap benar');

  ok(t.errs.length === 0, 'tidak ada galat JavaScript: ' + t.errs.slice(0, 2).join('|'));
  console.log(`\n${pass} pengecekan price lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
