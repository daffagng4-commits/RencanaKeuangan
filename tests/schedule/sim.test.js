// Uji tab Simulasi: perhitungan simulasi terisolasi dari data utama & UI mockup bekerja penuh.
const assert = require('assert');
const { boot } = require('./ui.js');
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log('ok -', m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire, click, errs } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const mk = (o) => Object.assign({ price: 100000, ch: [] }, o);
  const load = async (items, paid) => {
    w.switchYear(2028);
    w.S.startMonth = 0;
    w.SIM = []; w.S.items = items; w.S.paid = paid || {}; w.S.skip = {};
    w.renderAll(); w.tab('sim'); await tick();
  };

  const kuartalan = mk({ id: 11, name: 'Asuransi', start: '2028-01-15', n: 3, unit: 'bulan', price: 500000 });
  const bulanan = mk({ id: 12, name: 'Internet', start: '2028-01-05', n: 1, unit: 'bulan' });

  // 1. Form mockup #sim-add-form: hanya + Tambah Kas / Hemat (1) dan − Pengeluaran Baru (-1)
  await load([kuartalan, bulanan]);
  const dirOpts = [...$('sim-new-dir').options].map((o) => o.value);
  ok(dirOpts.join() === '1,-1', 'opsi dampak saldo sesuai mockup: 1,-1');

  const snapS = JSON.stringify(w.S), snapCalc = JSON.stringify(w.calc());
  $('sim-new-title').value = 'Bonus Proyek';
  $('sim-new-dir').value = '1';
  $('sim-new-amt').value = '1000000';
  fire($('sim-new-amt'), 'input');
  ok($('sim-new-amt').value === '1.000.000', 'auto-format titik di #sim-new-amt');
  fire($('sim-add-form'), 'submit');
  await tick();

  $('sim-new-title').value = 'Cicilan Gadget';
  $('sim-new-dir').value = '-1';
  $('sim-new-amt').value = '250000';
  fire($('sim-new-amt'), 'input');
  fire($('sim-add-form'), 'submit');
  await tick();

  ok(w.SIM.length === 2, 'dua skenario tertambah (+ masuk dan - keluar)');
  ok(JSON.stringify(w.S) === snapS, 'data item/status utama tidak tersentuh sebelum Terapkan');
  ok(JSON.stringify(w.calc()) === snapCalc, 'perhitungan utama tidak berubah oleh skenario');

  // 2. Toggle aktif/nonaktif lewat checkbox kartu skenario
  const chk1 = $('sim-scenarios-list').querySelector('[data-br-smtog="1"]');
  chk1.checked = false;
  fire(chk1, 'change');
  await tick();
  ok(w.SIM[1].off === true, 'checkbox uncheck menonaktifkan skenario ke-2');

  // 3. Inti simCalc tetap mendukung semua jenis skenario (stop, price, cycle, shift, in, out)
  const coreSim = w.simCalc([
    { k: 'stop', id: 12, m: 6 },
    { k: 'price', id: 11, m: 3, amt: 900000 },
    { k: 'in', name: 'Hemat', amt: 200000, m: 0, rep: 'bulan', n: 1 },
  ]);
  ok(coreSim.end !== JSON.parse(snapCalc).end, 'mesin simCalc mengubah proyeksi akhir tahun');

  // 4. Hapus skenario lewat tombol Hapus & terapkan skenario aktif lewat #btn-apply-sim
  click($('sim-scenarios-list').querySelector('[data-br-smdel="1"]'));
  ok(w.SIM.length === 1, 'tombol Hapus menghapus skenario');
  click($('btn-apply-sim'));
  ok(w.SIM.length === 0, 'Terapkan mengosongkan daftar simulasi setelah diterapkan ke data');

  ok(errs.length === 0, 'tidak ada error JS: ' + errs.join('|'));
  console.log(`\n${pass} pengecekan sim lulus`);
  process.exit(0);
})();
