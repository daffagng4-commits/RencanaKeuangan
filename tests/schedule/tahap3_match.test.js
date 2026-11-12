// Tahap 3 (item 10): pencocokan otomatis Catatan Kas dengan tagihan (kartu saran sudah dihapus).
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const txt = (el) => el.textContent.replace(/\s+/g, ' ');
  const it = (o) => Object.assign({ id: 'x', name: 'T', price: 1000, n: 1, unit: 'bulan', start: '2026-01-05', ch: [], cat: '', end: '', cnt: 0 }, o);
  const addTx = (amt, d, cat, note) => {
    $('ka').value = amt;
    $('kd').value = d;
    $('kc').value = cat;
    $('kn').value = note;
    click($('ks'));
  };

  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 0; w.S.smManual = true;
  w.S.saldo = 10000000;
  w.S.items = [
    it({ id: 'l', name: 'Listrik PLN', price: 200000, start: '2026-01-05' }),
    it({ id: 'n', name: 'Netflix', price: 50000, start: '2026-01-20' }),
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.S.real = {};
  const P = w.kasLinked();
  P.tx = [];
  w.tab('kas');
  w.renderAll();

  // kartu "Cocokkan dengan tagihan" sudah dihapus
  assert(!/Cocokkan dengan tagihan/.test(txt($('v-kas'))), 'kartu pencocokan tidak tampil');
  assert(!$('mauto'), 'kontrol otomatis di kartu dihapus');

  // catat transaksi sangat cocok -> otomatis lunas
  addTx('205000', '2026-03-06', 'Tagihan', 'bayar listrik pln');
  assert(w.S.paid['l|2026-03-05'], 'Listrik Maret otomatis lunas');
  assert.strictEqual(w.S.real['l|2026-03-05'].tx, P.tx[0].id);
  assert(/otomatis ditandai lunas/.test($('ttm').textContent), 'toast: ' + $('ttm').textContent);
  const rows = w.kasRows(P).filter((x) => /listrik/i.test(x.note || ''));
  assert.strictEqual(rows.length, 1, 'tidak terhitung dua kali');
  assert.strictEqual(rows[0].amt, 205000, 'jumlah realisasi dari transaksi');
  assert(/melunasi: Listrik PLN/.test(txt($('v-kas'))), 'chip tertaut di daftar transaksi');

  // urungkan
  click($('ttu'));
  assert(!w.S.paid['l|2026-03-05'] && !w.S.real['l|2026-03-05'], 'urungkan melepas tautan');
  assert.strictEqual(P.tx.length, 1, 'transaksinya tetap ada');
  assert(!/Cocokkan dengan tagihan/.test(txt($('v-kas'))), 'kartu tetap tidak muncul');

  // tanpa nama + jumlah persis tidak otomatis
  addTx('50000', '2026-05-22', '', 'langganan bulanan');
  assert(!w.S.paid['n|2026-05-20'], 'tidak otomatis bila tanpa nama');

  // matikan otomatis lewat state (UI kartu sudah tidak ada)
  P.auto = false;
  addTx('49000', '2026-07-19', '', 'netflix');
  assert(!w.S.paid['n|2026-07-20'], 'otomatis mati -> tidak melunasi sendiri');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_match lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
