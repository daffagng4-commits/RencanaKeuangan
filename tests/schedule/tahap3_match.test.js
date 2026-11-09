// Tahap 3 (item 10): pencocokan Catatan Kas dengan tagihan + Rencana vs realisasi, lewat UI.
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
  w.S.startMonth = 0;
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
  w.tab('rincian');
  w.renderAll();

  // ---- keadaan awal: belum ada yang lunas -> empty state dengan tombol aksi ----
  let rv = $('v-rincian');
  assert(/Belum ada tagihan yang dilunasi/.test(txt(rv)), 'empty state realisasi');
  click(rv.querySelector('[data-goto="jadwal"]'));
  assert.strictEqual(w.curTab, 'jadwal', 'tombol aksi membuka Jadwal');

  // ---- catat transaksi sangat cocok -> otomatis lunas ----
  w.tab('kas');
  w.renderAll();
  assert(/Cocokkan dengan tagihan/.test(txt($('v-kas'))), 'kartu pencocokan tampil di tab Kas');
  assert($('mauto').checked, 'otomatis aktif secara bawaan');
  addTx('205000', '2026-03-06', 'Tagihan', 'bayar listrik pln');
  assert(w.S.paid['l|2026-03-05'], 'Listrik Maret otomatis lunas');
  assert.strictEqual(w.S.real['l|2026-03-05'].tx, P.tx[0].id);
  assert(/otomatis ditandai lunas/.test($('ttm').textContent), 'toast: ' + $('ttm').textContent);
  const rows = w.kasRows(P).filter((x) => /listrik/i.test(x.note || ''));
  assert.strictEqual(rows.length, 1, 'tidak terhitung dua kali: hanya transaksi yang dihitung, baris "(lunas)" dilewati');
  assert.strictEqual(rows[0].amt, 205000, 'jumlah realisasi dari transaksi');
  assert(/melunasi: Listrik PLN/.test(txt($('v-kas'))), 'chip tertaut di daftar transaksi');

  // ---- urungkan ----
  click($('ttu'));
  assert(!w.S.paid['l|2026-03-05'] && !w.S.real['l|2026-03-05'], 'urungkan melepas tautan');
  assert.strictEqual(P.tx.length, 1, 'transaksinya tetap ada');
  assert(/Cocokkan dengan tagihan/.test(txt($('v-kas'))) && $('v-kas').querySelector('[data-mok]'), 'kini muncul sebagai saran');

  // ---- terima saran manual ----
  click($('v-kas').querySelector('[data-mok]'));
  assert(w.S.paid['l|2026-03-05'] && w.S.real['l|2026-03-05'], 'saran diterima');

  // ---- saran biasa (nama tidak ada, jumlah persis) + tolak ----
  w.tab('kas');
  addTx('50000', '2026-05-22', '', 'langganan bulanan');
  assert(!w.S.paid['n|2026-05-20'], 'tidak otomatis bila tanpa nama');
  const mok = $('v-kas').querySelector('[data-mok]');
  assert(mok && /n\|2026-05-20$/.test(mok.dataset.mok), 'jadi saran');
  click($('v-kas').querySelector('[data-mno]'));
  assert(!$('v-kas').querySelector('[data-mok]'), 'Bukan menyembunyikan saran');
  assert(P.nm.length === 1, 'penolakan tersimpan di profil');

  // ---- matikan otomatis ----
  $('mauto').checked = false;
  $('mauto').dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.strictEqual(P.auto, false);
  addTx('49000', '2026-07-19', '', 'netflix');
  assert(!w.S.paid['n|2026-07-20'], 'otomatis mati -> tidak melunasi sendiri');
  assert($('v-kas').querySelector('[data-mok]'), 'tetap jadi saran');

  // ---- tagihan sudah ditandai lunas manual + transaksi yang sama = hitung ganda -> gabung ----
  w.S.paid['l|2026-08-05'] = 1;
  const balAll = () => {
    w.S.startMonth = 11; // Saldo Realtime sampai Desember supaya semua transaksi terhitung
    const b = w.kasBal(P).bal;
    w.S.startMonth = 0;
    return b;
  };
  const before = balAll();
  addTx('201000', '2026-08-06', '', 'listrik pln');
  const gab = [...$('v-kas').querySelectorAll('[data-mok]')].filter((b) => /l\|2026-08-05$/.test(b.dataset.mok))[0];
  assert(gab && /Gabungkan/.test(gab.textContent), 'saran gabung untuk tagihan yang sudah lunas');
  const dbl = balAll();
  click(gab);
  const after = balAll();
  assert.strictEqual(before - dbl, 201000, 'transaksi ikut mengurangi saldo');
  assert.strictEqual(after - dbl, 200000, 'sesudah digabung: baris "(lunas)" 200.000 dilewati, hanya transaksi 201.000 yang dihitung');

  // ---- kartu Rencana vs realisasi ----
  w.tab('rincian');
  w.renderAll();
  rv = txt($('v-rincian'));
  assert(/Rencana vs realisasi 2026/.test(rv), 'kartu realisasi');
  assert(/2 tagihan lunas: rencana Rp 400\.000, realisasi Rp 406\.000 · lebih besar Rp 6\.000/.test(rv), rv.match(/\d tagihan lunas[^.]*\./)?.[0] + ' | ' + rv.slice(rv.indexOf('Rencana vs realisasi'), rv.indexOf('Rencana vs realisasi') + 300));
  assert(/Selisih terbesar/.test(rv) && /Listrik PLN/.test(rv));
  assert(/tagihan sudah lewat jatuh tempo dan belum lunas/.test(rv), 'peringatan tagihan terlambat');
  assert.strictEqual($('v-rincian').querySelectorAll('.rv-m').length - 1, 2, 'baris bulan: Maret dan Agustus');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_match lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
