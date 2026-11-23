/** Tes regresi audit akurasi perhitungan keuangan, utilitas nominal, jadwal, dan cadangan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, newYear, item } = require('../helpers/core');

test('BUG-01: calc() tidak menghitung ganda tagihan yang tertaut ke Catatan Kas (S.real)', () => {
  const c = loadCore();
  newYear(c, 2026, {
    saldo: 10000000,
    startMonth: 0,
    smManual: true,
    items: [item({ id: 'l', name: 'Listrik PLN', price: 200000, unit: 'sekali', start: '2026-06-05', cat: 'Tagihan' })],
    paid: { 'l|2026-06-05': true },
    skip: {},
    real: { 'l|2026-06-05': { tx: 'tx1' } },
  });
  c.ALL.kas = {
    cur: 'k1',
    pr: {
      k1: {
        id: 'k1',
        name: 'Utama',
        link: true,
        tx: [
          { id: 'tx1', d: '2026-06-06', t: '-', amt: 205000, cat: 'Tagihan', note: 'bayar listrik pln' },
          { id: 'tx2', d: '2026-06-10', t: '-', amt: 50000, cat: 'Makan', note: 'makan siang' },
          { id: 'tx3', d: '2026-06-12', t: '+', amt: 500000, cat: 'Bonus', note: 'bonus' },
        ],
      },
    },
  };
  const r = c.calc();
  // 10.000.000 - 205.000 (aktual tagihan tertaut) - 50.000 (bebas) + 500.000 (masuk) = 10.245.000
  assert.equal(r.end, 10245000);
  assert.equal(r.total, 205000);
  assert.equal(r.byCat.Tagihan, 205000);
});

test('BUG-02: parseRp menangani angka desimal m-banking/Excel dan menolak Infinity', () => {
  const c = loadCore();
  assert.equal(c.parseRp('1.500.000'), 1500000);
  assert.equal(c.parseRp('1,500,000'), 1500000);
  assert.equal(c.parseRp('1.500.000,00'), 1500000);
  assert.equal(c.parseRp('1.500.000,50'), 1500001);
  assert.equal(c.parseRp('1,500,000.00'), 1500000);
  assert.equal(c.parseRp('1500000,00'), 1500000);
  assert.equal(c.parseRp('1500000.40'), 1500000);
  assert.equal(c.parseRp('Rp 2.500,00'), 2500);
  assert.equal(c.parseRp('1,5jt'), 1500000);
  assert.equal(c.parseRp('200k'), 200000);
  assert.equal(c.parseRp('-500.000'), -500000);
  assert.equal(c.parseRp('1e308jt'), 0);
  assert.equal(c.parseRp(null), 0);
  assert.equal(c.parseRp(undefined), 0);
});

test('BUG-05 & BUG-11: rp(), shortP(), dan esc() aman untuk NaN, Infinity, negatif, dan kutip tunggal', () => {
  const c = loadCore();
  assert.equal(c.rp(NaN), 'Rp 0');
  assert.equal(c.rp(Infinity), 'Rp 0');
  assert.equal(c.rp(-1500), 'Rp -1.500');
  assert.equal(c.shortP(-2500000), '-2,5jt');
  assert.equal(c.shortP(-500000), '-500rb');
  assert.equal(c.shortP(NaN), '0');
  assert.equal(c.shortP(Infinity), '0');
  assert.equal(c.esc("O'Brien <x>"), 'O&#39;Brien &lt;x&gt;');
});

test('BUG-06: series() mendukung item harian > 11 tahun dan mengabaikan tanggal mv rusak', () => {
  const c = loadCore();
  const dailyOld = c.occ(item({ unit: 'hari', n: 1, start: '2010-01-01' }), 2026);
  assert.equal(dailyOld.length, 365);

  const sBad = c.series(
    item({ unit: 'sekali', start: '2026-05-01', ch: [{ from: '2026-05-01', mv: { '2026-05-01': 'bukan-tanggal' } }] }),
    Date.UTC(2026, 11, 31),
  );
  assert.equal(sBad.some(Number.isNaN), false);
  assert.deepEqual(Array.from(sBad, (t) => c.isoD(t)), ['2026-05-01']);
});

test('BUG-08: restoreSnap() tidak melempar SyntaxError pada JSON cadangan rusak', () => {
  const c = loadCore();
  newYear(c, 2026, { saldo: 500000 });
  c.localStorage.setItem('rk-undo', JSON.stringify([{ t: 999, l: 'Rusak', d: '{invalid json' }]));
  const res = c.restoreSnap(999);
  assert.equal(res, null);
  assert.equal(c.S.saldo, 500000);
});
