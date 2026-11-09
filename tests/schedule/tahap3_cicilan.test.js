// Tahap 3 (item 11): kartu "Cicilan & utang" dan kolom "Pokok pinjaman" di form item.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const txt = (el) => el.textContent.replace(/\s+/g, ' ');
  const it = (o) => Object.assign({ id: 'x', name: 'T', price: 1000, n: 1, unit: 'bulan', start: '2026-01-05', ch: [], cat: '', end: '', cnt: 0, pokok: 0 }, o);

  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 0;
  w.S.items = [
    it({ id: 'k', name: 'KPR Mini', price: 1000000, start: '2026-06-10', cnt: 12, pokok: 11000000 }),
    it({ id: 'o', name: 'Langganan', price: 10000, start: '2026-01-01' }),
  ];
  w.S.paid = {};
  ['06', '07', '08', '09', '10'].forEach((m) => (w.S.paid['k|2026-' + m + '-10'] = 1));
  w.S.skip = {};
  w.tab('rincian');
  w.renderAll();
  const card = $('v-rincian').querySelector('.cicilan');
  assert(card, 'kartu cicilan tampil');
  const c = txt(card);
  assert(/Sisa Rp 7\.000\.000/.test(c), c);
  assert(/Semua selesai paling lambat Mei 2027/.test(c), c);
  assert(/5 dari 12 sudah dibayar/.test(c), c);
  assert(/Pinjaman Rp 11\.000\.000 · total bayar Rp 12\.000\.000 · biaya tambahan Rp 1\.000\.000 \(9% dari pinjaman\)/.test(c), c);
  assert(/Berikutnya lunas: KPR Mini pada Mei 2027/.test(c), 'ringkasan berikutnya lunas');
  assert(!/Langganan/.test(c), 'item tanpa batas tidak masuk');
  assert.strictEqual(card.querySelector('.cc-bar i').style.width, '42%', 'progres 5 dari 12');
  click($('btn-privacy'));
  assert(/blur/.test(w.getComputedStyle(card.querySelector('.pv')).filter), 'ikut disensor');
  click($('btn-privacy'));

  // selesai semua -> kartu hilang
  ['11', '12'].forEach((m) => (w.S.paid['k|2026-' + m + '-10'] = 1));
  w.ALL.data[2027].items = [];
  ['01', '02', '03', '04', '05'].forEach((m) => (w.ALL.data[2027].paid['k|2027-' + m + '-10'] = 1));
  w.renderAll();
  assert(!$('v-rincian').querySelector('.cicilan'), 'kartu hilang bila semua lunas');

  // ---- form item: pokok pinjaman ----
  w.tab('item');
  assert($('w-pokok').hidden, 'pokok disembunyikan bila tidak berhenti');
  $('f-name').value = 'Kredit HP';
  $('f-price').value = '500.000';
  $('f-start').value = '2026-01-01';
  $('f-stop').value = 'cnt';
  $('f-stop').dispatchEvent(new w.Event('change', { bubbles: true }));
  assert(!$('w-pokok').hidden, 'pokok tampil untuk jadwal terbatas');
  $('f-cnt').value = '6';
  $('f-pokok').value = '2700000';
  $('f-pokok').dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.strictEqual($('f-pokok').value, '2.700.000', 'format ribuan');
  click($('save'));
  const hp = w.S.items.find((x) => x.name === 'Kredit HP');
  assert(hp && hp.pokok === 2700000 && hp.cnt === 6, 'tersimpan: ' + JSON.stringify(hp));
  // ubah -> kolom terisi lagi
  w.editItem(hp);
  assert.strictEqual($('f-pokok').value, '2.700.000');
  w.resetForm();
  assert.strictEqual($('f-pokok').value, '');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_cicilan lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
