const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;

  try {
    // === 1a: tagihan lunas tanpa real hanya terhitung sekali di yearCash ===
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 0;
    w.S.items = [
      { id: 'paid1', name: 'Paid', price: 1000, start: '2026-11-05', n: 1, unit: 'sekali', cat: 'X', ch: [] },
      { id: 'open1', name: 'Open', price: 2000, start: '2026-11-20', n: 1, unit: 'sekali', cat: 'X', ch: [] }
    ];
    w.S.paid = { 'paid1|2026-11-05': 1 };
    w.S.skip = {};
    w.S.real = {};
    const P = w.kasLinked();
    P.tx = [{ id: 'r1', d: '2026-11-01', t: '-', amt: 500, cat: 'X', note: 'raw' }];
    const C = w.yearCash();
    assert.strictEqual(C.out, 3500, 'raw 500 + lunas 1000 + terbuka 2000 = 3500, tidak ganda');
    assert.strictEqual(C.entries.length, 3, 'tiga entri unik');

    // === 1b: horizon tagihan hanya Nov-Januari, bukan sampai Februari ===
    w.S.items = [
      { id: 'n1', name: 'NovA', price: 1000, start: '2026-11-15', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'n2', name: 'NovB', price: 1000, start: '2026-11-25', n: 1, unit: 'sekali', cat: 'A', ch: [] }
    ];
    for (let i = 0; i < 7; i++) {
      w.S.items.push({ id: 'd' + i, name: 'Des' + i, price: 1000, start: '2026-12-' + String(i + 1).padStart(2, '0'), n: 1, unit: 'sekali', cat: 'A', ch: [] });
    }
    w.S.paid = {};
    w.switchYear(2027);
    w.S.startMonth = 0;
    w.S.items = [];
    for (let i = 0; i < 12; i++) {
      w.S.items.push({ id: 'j' + i, name: 'Jan' + i, price: 1000, start: '2027-01-' + String(i + 1).padStart(2, '0'), n: 1, unit: 'sekali', cat: 'A', ch: [] });
    }
    for (let i = 0; i < 6; i++) {
      w.S.items.push({ id: 'f' + i, name: 'Feb' + i, price: 1000, start: '2027-02-' + String(i + 1).padStart(2, '0'), n: 1, unit: 'sekali', cat: 'A', ch: [] });
    }
    w.S.paid = {};
    w.switchYear(2026);
    w.renderAll();
    const billsCard = [...w.document.querySelectorAll('.card')].find(function (c) {
      return /Jadwal tagihan/.test(c.textContent);
    });
    assert(billsCard, 'kartu jadwal tagihan ada');
    const billsText = billsCard.textContent;
    assert(/6 tagihan ke depan/.test(billsText), 'subjudul: ' + billsText);
    assert(!/Feb/.test(billsText), 'Februari tidak ikut');

    // === 1c: transaksi terakhir hanya 6-12 Nov, fallback label benar ===
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.items = [];
    w.S.paid = {};
    P.tx = [
      { id: 'a', d: '2026-11-05', t: '-', amt: 100, cat: 'A', note: 'lama' },
      { id: 'b', d: '2026-11-10', t: '-', amt: 200, cat: 'A', note: 'dalam' },
      { id: 'c', d: '2026-11-15', t: '-', amt: 300, cat: 'A', note: 'masa depan' },
      { id: 'd', d: '2026-12-01', t: '+', amt: 1000, cat: 'Gaji', note: 'masa depan' }
    ];
    w.txDir = 'all';
    w.renderAll();
    const txCard = [...w.document.querySelectorAll('.rk .card')].find(function (c) {
      return /Transaksi terakhir/.test(c.textContent);
    });
    assert(txCard, 'kartu transaksi terakhir ada');
    const txText = txCard.textContent;
    assert(/7 hari terakhir/.test(txText), 'subtitle 7 hari terakhir');
    assert(!/15 Nov/.test(txText), 'tidak ada 15 Nov');
    assert(!/1 Des/.test(txText), 'tidak ada 1 Des');

    // fallback: hanya transaksi lama
    P.tx = [
      { id: 'x', d: '2026-10-01', t: '-', amt: 50, cat: 'A', note: 'lama' },
      { id: 'y', d: '2026-10-05', t: '-', amt: 60, cat: 'A', note: 'lama' }
    ];
    w.renderAll();
    const txCard2 = [...w.document.querySelectorAll('.rk .card')].find(function (c) {
      return /Transaksi terakhir/.test(c.textContent);
    });
    assert(/7 catatan terakhir/.test(txCard2.textContent), 'fallback subtitle 7 catatan terakhir');

    // === 1d: runway memakai pemasukan masa depan ===
    w.S.saldo = 1472000;
    w.S.startMonth = 10;
    w.S.items = [
      { id: 'k1', name: 'Kuota', price: 50000, start: '2026-11-17', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 't1', name: 'Torbox', price: 500000, start: '2026-11-26', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 's1', name: 'Saham', price: 570000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'b1', name: 'BTC', price: 250000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'w1', name: 'Warp', price: 15000, start: '2026-12-07', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'p1', name: 'BPJS', price: 150000, start: '2026-12-10', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'v1', name: 'Vidio', price: 200000, start: '2026-12-12', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'e1', name: 'ETF', price: 3350000, start: '2026-12-15', n: 1, unit: 'sekali', cat: 'A', ch: [] }
    ];
    w.S.paid = {};
    w.S.skip = {};
    P.tx = [{ id: 'gaji', d: '2026-12-01', t: '+', amt: 2500000, cat: 'Gaji', note: '' }];
    const rw = w.kasRunway(P, null);
    assert.strictEqual(rw.date, '2026-12-15', 'tanggal pertama negatif 15 Des');
    assert.strictEqual(rw.days, 33, '33 hari lagi');
    assert.strictEqual(rw.deficit, 1113000, 'minus Rp 1.113.000');
    assert.strictEqual(rw.status, 'warning', 'status warning');

    console.log('OK dashboard_bugs (1a 1b 1c 1d)');
  } finally {
    w.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
