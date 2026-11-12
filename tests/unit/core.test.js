/** Tes unit untuk logika inti (tanpa DOM): util, jadwal, state, hitungan, pengingat, CSV. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, newYear, item } = require('../helpers/core');

const c = loadCore();
/** Array hasil dari sandbox vm berasal dari 'realm' lain; Array.from mengubahnya jadi array biasa agar bisa dibandingkan. */
const dates = (list) => Array.from(list, (t) => c.isoD(t));
const ms = (iso) => Date.parse(iso + 'T00:00:00Z');

test('parseRp memahami singkatan dan pemisah ribuan', () => {
  assert.equal(c.parseRp('200k'), 200000);
  assert.equal(c.parseRp('1,5jt'), 1500000);
  assert.equal(c.parseRp('200.000'), 200000);
  assert.equal(c.parseRp('Rp 2.500'), 2500);
  assert.equal(c.parseRp(''), 0);
  assert.equal(c.parseRp('abc'), 0);
  assert.equal(c.rp(1250000), 'Rp 1.250.000');
});

test('jadwal bulanan: tanggal 31 menyesuaikan akhir bulan (tahun biasa dan kabisat)', () => {
  const it = item({ start: '2035-01-31' });
  assert.deepEqual(dates(c.occ(it, 2035)).slice(0, 4), ['2035-01-31', '2035-02-28', '2035-03-31', '2035-04-30']);
  assert.equal(dates(c.occ(item({ start: '2036-01-31' }), 2036))[1], '2036-02-29');
});

test('jadwal: tiap 28 hari dan tiap 5 bulan, tahunan, sekali', () => {
  assert.equal(c.occ(item({ unit: 'hari', n: 28, start: '2034-10-21' }), 2035).length, 13);
  assert.deepEqual(dates(c.occ(item({ n: 5 }), 2035)), ['2035-01-01', '2035-06-01', '2035-11-01']);
  assert.deepEqual(dates(c.occ(item({ unit: 'tahun', start: '2035-03-15' }), 2036)), ['2036-03-15']);
  const once = item({ unit: 'sekali', start: '2035-05-05' });
  assert.deepEqual(dates(c.occ(once, 2035)), ['2035-05-05']);
  assert.equal(c.occ(once, 2036).length, 0);
});

test('batas berhenti: jumlah kali dan tanggal', () => {
  assert.equal(c.occ(item({ cnt: 4, start: '2035-01-31' }), 2035).length, 4);
  assert.deepEqual(dates(c.occ(item({ unit: 'minggu', n: 2, start: '2035-01-04', end: '2035-02-01' }), 2035)), ['2035-01-04', '2035-01-18', '2035-02-01']);
  assert.equal(c.lastOcc(item({ cnt: 3 })) !== null, true);
  assert.equal(c.lastOcc(item()), null);
});

test('perubahan harga: seterusnya, sementara, dan kembali ke awal', () => {
  const up = item({ price: 200, ch: [{ from: '2035-07-01', to: '', price: 300, n: null, unit: null }] });
  assert.equal(c.priceAt(up, ms('2035-06-01')), 200);
  assert.equal(c.priceAt(up, ms('2035-07-01')), 300);
  const temp = item({ price: 100, ch: [{ from: '2035-01-01', to: '2035-03-01', price: 150, n: null, unit: null }] });
  assert.deepEqual([1, 3, 4].map((m) => c.priceAt(temp, Date.UTC(2035, m - 1, 1))), [150, 150, 100]);
  const back = item({ price: 200, ch: [{ from: '2035-01-01', to: '', price: 300 }, { from: '2035-07-01', to: '', price: null }] });
  assert.equal(c.priceAt(back, ms('2035-08-01')), 200);
});

test('perubahan siklus: tagihan lama dipertahankan atau dihapus (cut)', () => {
  const keep = item({ unit: 'tahun', price: 337, ch: [{ from: '2035-03-16', to: '', price: null, n: 6, unit: 'bulan' }] });
  assert.deepEqual(dates(c.occ(keep, 2035)), ['2035-01-01', '2035-03-16', '2035-09-16']);
  keep.ch[0].cut = true;
  assert.deepEqual(dates(c.occ(keep, 2035)), ['2035-03-16', '2035-09-16']);
});

test('geser tanggal: Juli punya dua tagihan (1 Jul dan 15 Jul)', () => {
  const it = item({ ch: [{ from: '2035-07-15', to: '', price: null, n: 1, unit: 'bulan' }] });
  const d = dates(c.occ(it, 2035));
  assert.equal(d.length, 13);
  assert.ok(d.includes('2035-07-01') && d.includes('2035-07-15') && d.includes('2035-12-15'));
});

test('calc: pengeluaran, tagihan dilewati, dan kategori', () => {
  const Y = newYear(c, 2035, { saldo: 10000000 });
  Y.items.push(item({ id: 1, price: 100000, cat: 'A' }), item({ id: 2, price: 50000 }));
  let r = c.calc();
  assert.equal(r.total, 12 * 150000);
  assert.equal(r.end, 10000000 - 1800000);
  assert.equal(r.byCat.A, 1200000);
  assert.equal(r.byCat[''], 600000);
  Y.skip['1|2035-02-01'] = 1;
  r = c.calc();
  assert.equal(r.rows[1].sp, 50000);
  assert.equal(r.total, 1800000 - 100000);
  Y.paid['2|2035-03-01'] = 1;
  assert.equal(c.calc().total, 1700000, 'status lunas tidak mengubah pengeluaran');
});

test('calc: bulan saldo membuang bulan sebelumnya', () => {
  const Y = newYear(c, 2035, { saldo: 1000, startMonth: 3 });
  Y.items.push(item({ price: 100 }));
  const r = c.calc();
  assert.equal(r.rows.length, 9);
  assert.equal(r.total, 900);
});

test('penyesuaian saldo: sekali, mulai bulan, dan berulang', () => {
  const Y = newYear(c, 2035, { saldo: 0 });
  const A = (o) => Object.assign({ id: Math.random(), t: '+', amt: 1000, note: '', m: null, rep: null, at: '' }, o);
  Y.adj = [A({})];
  assert.equal(c.calc().open, 1000);
  Y.adj = [A({ m: 5 })];
  let r = c.calc();
  assert.equal(r.open, 0);
  assert.equal(r.rows[5].ad, 1000);
  Y.adj = [A({ m: 1, rep: { n: 1, cnt: 0 } })];
  r = c.calc();
  assert.equal(r.adjLate, 11000);
  Y.adj = [A({ m: 0, rep: { n: 3, cnt: 0 } })];
  r = c.calc();
  assert.equal(r.adjIn, 1000, 'kemunculan di bulan saldo digabung ke saldo awal');
  assert.deepEqual([3, 6, 9].map((m) => r.rows[m].ad), [1000, 1000, 1000]);
  Y.adj = [A({ m: 2, rep: { n: 1, cnt: 4 } })];
  assert.deepEqual(Array.from(c.adjMonths(Y.adj[0])), [2, 3, 4, 5]);
  Y.adj = [A({ t: '-', m: 0, rep: { n: 1, cnt: 0 } })];
  assert.equal(c.calc().end, -12000);
});

test('pengingat: terlambat, lebih lama, akan datang, dan lintas tahun', () => {
  const Y = newYear(c, 2035, {});
  Y.items.push(item({ id: 1 }));
  Y.smManual = true; // pin Januari agar pengingat mencakup Januari-Desember
  c.window = { __today: '2035-06-10' };
  let r = c.reminders(7);
  assert.deepEqual(Array.from(r.late, (x) => x.iso), ['2035-05-01', '2035-06-01']);
  assert.equal(r.older, 4);
  assert.equal(r.soon.length, 0);
  assert.deepEqual(Array.from(c.reminders(30).soon, (x) => x.iso), ['2035-07-01']);
  c.setStatus(2035, '1|2035-06-01', 'paid');
  c.setStatus(2035, '1|2035-05-01', 'skip');
  assert.equal(c.reminders(7).late.length, 0);
  assert.equal(c.markPastPaid(), 4, 'hanya yang belum ditandai dan sudah lewat');
  assert.equal(c.reminders(7).older, 0);
  c.window = undefined;
});

test('remapStatus: pindah ke bulan yang sama, batas 20 hari, tanpa tabrakan', () => {
  const U = (s) => Date.parse(s + 'T00:00:00Z');
  const paid = { '1|2035-03-01': 1 };
  assert.equal(c.remapStatus(1, [U('2035-03-01')], [U('2035-02-15'), U('2035-03-15')], [paid]), 1);
  assert.ok(paid['1|2035-03-15'], 'seri jarak: utamakan bulan yang sama');
  assert.equal(c.remapStatus(1, [U('2035-01-01')], [U('2035-02-25')], [{ '1|2035-01-01': 1 }]), 0);
  const mp = { '5|2035-01-01': 1, '5|2035-02-01': 1 };
  assert.equal(c.remapStatus(5, [U('2035-01-01'), U('2035-02-01')], [U('2035-01-10')], [mp]), 1);
  assert.ok(mp['5|2035-02-01'] && mp['5|2035-01-10']);
});

test('carryAdjustments: sisa jumlah kali, tahunan, dan yang sudah habis', () => {
  const src = { year: 2035, adj: [
    { id: 1, t: '+', amt: 700, note: '', m: 2, rep: { n: 1, cnt: 20 } },
    { id: 2, t: '+', amt: 800, note: '', m: 2, rep: { n: 1, cnt: 8 } },
    { id: 3, t: '+', amt: 900, note: '', m: 2, rep: { n: 12, cnt: 0 } },
    { id: 4, t: '+', amt: 55, note: '', m: 4, rep: null } ] };
  newYear(c, 2036, {});
  assert.equal(c.carryAdjustments(src), 2);
  const by = (a) => c.S.adj.find((x) => x.amt === a);
  assert.deepEqual([by(700).m, by(700).rep.cnt], [0, 10]);
  assert.deepEqual([by(900).m, by(900).rep.n], [2, 12]);
  assert.equal(c.carryAdjustments(src), 0, 'tidak menggandakan');
});

test('norm: format lama, data rusak, dan idempoten', () => {
  const legacy = c.norm({ saldo: 5, year: 2027, items: [{ id: 1, name: 'A', price: 100, unit: 'x', pc: [{ d: '2027-06-01', p: 150 }] }, null] });
  const Y = legacy.data[2027];
  assert.equal(Y.items[0].unit, 'bulan');
  assert.equal(Y.items[0].ch[0].price, 150);
  assert.equal(Y.items[1].name, 'Item');
  assert.equal(JSON.stringify(Y.paid), '{}');
  const bad = c.norm({ year: 2030, data: { 2030: { adj: [{ t: 'x', amt: 5 }, { t: '+', amt: -3 }, { t: '+', amt: 200, m: 99, rep: { n: 2 } }, null] } } });
  // Penyesuaian saldo lama dipindah ke catatan kas profil tergabung (adj dikosongkan); m=99 dijepit ke Desember.
  assert.equal(bad.data[2030].adj.length, 0);
  const migrated = Array.from(Object.values(bad.kas.pr).find((p) => p.link).tx);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].cat, 'Penyesuaian saldo');
  assert.equal(migrated[0].amt, 200);
  assert.equal(migrated[0].d, '2030-12-01');
  const kept = c.norm({ year: 2031, data: { 2031: {} }, kas: { pr: { utama: { link: true, tx: [{ id: 'd1', d: '2031-01-02', t: '-', amt: 9000, debt: true, debtName: 'Budi', debtKind: 'piutang', debtDone: true }] } } } }).kas.pr.utama.tx[0];
  assert.equal(kept.debt, true, 'penanda utang bertahan setelah reload/norm');
  assert.equal(kept.debtName, 'Budi');
  assert.equal(kept.debtKind, 'piutang');
  assert.equal(kept.debtDone, true, 'utang yang di-X tetap tersembunyi setelah reload');
  const once = JSON.stringify(c.norm(JSON.parse(JSON.stringify(legacy))));
  assert.equal(JSON.stringify(c.norm(JSON.parse(once))), once);
  assert.ok(c.norm(null).data[2027].items.length === 12, 'null -> data contoh');
});

test('data contoh menghasilkan total bulanan yang sama dengan Excel', () => {
  const all = c.norm(null);
  c.ALL = all;
  c.S = all.data[all.year];
  assert.deepEqual(Array.from(c.calc().rows, (r) => r.sp), [2300000, 1415000, 2075000, 1865000, 1550000, 1965000, 2000000, 1415000, 2075000, 1865000, 2300000, 1615000]);
});

test('CSV: tulis, baca (kutip/pemisah), tanggal, dan item', () => {
  const text = c.toCSV([['a', 'b;c', 'd"e']]);
  assert.ok(text.startsWith('\uFEFF'));
  assert.equal(JSON.stringify(c.parseCSV('x;"b;c";"d""e"\r\n1;2;3\n')), JSON.stringify([['x', 'b;c', 'd"e'], ['1', '2', '3']]));
  assert.equal(c.normDate('01/03/2027'), '2027-03-01');
  assert.equal(c.normDate('2027-3-1'), '2027-03-01');
  assert.equal(c.normDate('31/13/2027'), '');
  const res = c.csvItems(c.parseCSV('Nama;Harga;Tiap;Satuan;Mulai;Sampai;Jumlah kali;Kategori\nVidio;200k;3;bulan;2027-03-01;;;Langganan\nRusak;0;1;bulan;2027-01-01;;;\n'));
  assert.equal(res.ok.length, 1);
  assert.equal(res.bad, 1);
  assert.equal(res.ok[0].cat, 'Langganan');
});

test('mergeAll: gabung tanpa duplikat, status dan penyesuaian ikut', () => {
  const base = c.norm(null);
  c.ALL = base;
  c.S = base.data[2027];
  const incoming = JSON.parse(JSON.stringify(base));
  incoming.data[2027].items.push(item({ id: 999, name: 'Baru' }));
  incoming.data[2027].paid['999|2027-01-01'] = 1;
  incoming.data[2027].adj.push({ id: 5, t: '+', amt: 10, note: 'x', m: null, rep: null, at: '' });
  incoming.data[2030] = { saldo: 1, items: [] };
  const r = c.mergeAll(incoming);
  assert.equal(r.years, 1);
  assert.equal(c.ALL.data[2027].items.filter((i) => i.name === 'Baru').length, 1);
  assert.equal(c.mergeAll(incoming).items, 0, 'tidak menggandakan');
  assert.equal(Object.keys(c.ALL.data[2027].paid).length, 1);
  // Penyesuaian saldo ikut digabung lewat catatan kas profil tergabung (adj lama dikosongkan), tanpa duplikat.
  const adjTx = Array.from(Object.values(c.ALL.kas.pr).find((p) => p.link).tx).filter((x) => x.cat === 'Penyesuaian saldo');
  assert.equal(c.ALL.data[2027].adj.length, 0);
  assert.equal(adjTx.length, 1);
});

test('cadangan otomatis: maksimal 5, waktu unik, dan pulihkan', () => {
  const all = c.norm(null);
  c.ALL = all;
  c.S = all.data[2027];
  for (let i = 0; i < 7; i++) c.snap('cadangan ' + i);
  assert.equal(c.snapList().length, 5);
  assert.equal(new Set(c.snapList().map((s) => s.t)).size, 5);
  c.S.saldo = 123;
  const target = c.snapList()[0].t;
  assert.ok(c.restoreSnap(target));
  assert.equal(c.S.saldo, 25000000);
});

test('allCategories: bawaan + yang dipakai', () => {
  const Y = newYear(c, 2035, {});
  Y.items.push(item({ cat: 'Hobi Baru' }));
  const cats = c.allCategories();
  assert.ok(cats.includes('Langganan') && cats.includes('Hobi Baru'));
});

test('isInvestCat: kata kunci investasi/aset dikenali, kategori biasa tidak', () => {
  ['Investasi', 'DCA saham', 'Reksa Dana', 'ETF IBKR', 'Emas', 'Kripto', 'SBN ritel'].forEach((k) => assert.ok(c.isInvestCat(k), k));
  ['', 'Makan', 'Langganan', 'Tagihan rutin', null, undefined].forEach((k) => assert.ok(!c.isInvestCat(k), String(k)));
});

test('calc: total investasi dan per bulan dipisah dari pengeluaran lain', () => {
  const Y = newYear(c, 2041, { startMonth: 2 });
  Y.items.push(
    item({ id: 'i1', name: 'DCA', price: 100000, n: 1, unit: 'bulan', start: '2041-01-01', cat: 'Investasi' }),
    item({ id: 'i2', name: 'Makan', price: 50000, n: 1, unit: 'bulan', start: '2041-01-01', cat: 'Konsumsi' }),
    item({ id: 'i3', name: 'Dilewati', price: 999, n: 1, unit: 'bulan', start: '2041-01-01', cat: 'Investasi' }),
  );
  Y.skip['i3|2041-03-01'] = 1;
  const r = c.calc();
  // mulai Maret: 10 bulan DCA (i3 dilewati sekali di Maret => 9 x 999 = 8991)
  assert.equal(r.invest, 10 * 100000 + 9 * 999);
  assert.equal(r.investM[0], 0);
  assert.equal(r.investM[2], 100000);
  assert.equal(r.total - r.invest, 10 * 50000);
});

test('incomeYear: hanya baris + di profil tergabung, tahun aktif, mulai bulan saldo', () => {
  const Y = newYear(c, 2042, { startMonth: 2 });
  assert.equal(c.incomeYear(), 0);
  c.ALL.kas = {
    pr: {
      k1: {
        id: 'k1',
        link: true,
        tx: [
          { d: '2042-01-10', t: '+', amt: 1000 },
          { d: '2042-03-05', t: '+', amt: 5000000 },
          { d: '2042-04-05', t: '-', amt: 7 },
          { d: '2042-06-05', t: '+', amt: 2500000 },
          { d: '2041-12-31', t: '+', amt: 9 },
        ],
      },
    },
  };
  assert.equal(c.incomeYear(), 7500000);
  delete c.ALL.kas;
  assert.ok(Y);
});

function matchSetup(year) {
  const Y = newYear(c, year, { real: {} });
  Y.items.push(
    item({ id: 'l', name: 'Listrik PLN', price: 200000, n: 1, unit: 'bulan', start: year + '-01-05' }),
    item({ id: 'n', name: 'Netflix', price: 50000, n: 1, unit: 'bulan', start: year + '-01-20' }),
  );
  c.ALL.kas = { pr: { k: { id: 'k', link: true, auto: true, nm: [], tx: [] } } };
  return { Y, P: c.ALL.kas.pr.k };
}

test('match: nama + jumlah + tanggal yang dekat = sangat cocok; tautan membuat tagihan lunas dan realisasi mengikuti transaksi', () => {
  const { Y, P } = matchSetup(2043);
  P.tx.push({ id: 't1', d: '2043-03-06', t: '-', amt: 205000, cat: 'Tagihan', note: 'bayar listrik pln' });
  P.tx.push({ id: 't2', d: '2043-03-21', t: '-', amt: 70000, cat: 'Hiburan', note: 'nonton' });
  const s = c.suggestMatches();
  assert.equal(s.length, 1, 'hanya t1 yang cocok (t2 selisih jumlah 40% tanpa nama)');
  assert.equal(s[0].tx.id, 't1');
  assert.equal(s[0].cand.key, 'l|2043-03-05');
  assert.equal(s[0].cand.conf, 'high');
  assert.equal(s[0].kind, 'unpaid');
  c.applyLink('l|2043-03-05', 't1');
  assert.ok(Y.paid['l|2043-03-05']);
  assert.equal(c.realTx('l|2043-03-05').amt, 205000);
  assert.deepEqual(Object.keys(c.linkedTxIds()), ['t1']);
  assert.equal(c.suggestMatches().length, 0, 'yang sudah tertaut tidak diusulkan lagi');
  const D = c.realisasiData();
  assert.equal(D.nPaid, 1);
  assert.equal(D.nReal, 1);
  assert.equal(D.planPaid, 200000);
  assert.equal(D.act, 205000);
  assert.equal(D.months[2].act - D.months[2].planPaid, 5000);
  // transaksi dihapus -> kembali ke jumlah rencana, status lunas tetap
  P.tx = P.tx.filter((x) => x.id !== 't1');
  assert.equal(c.realTx('l|2043-03-05'), null);
  assert.equal(c.realisasiData().act, 200000);
});

test('match: otomatis hanya bila tepat satu tagihan sangat cocok, dan bisa dimatikan', () => {
  const { Y, P } = matchSetup(2044);
  const tx = { id: 'a1', d: '2044-04-19', t: '-', amt: 49000, cat: '', note: 'netflix' };
  P.tx.push(tx);
  P.auto = false;
  assert.equal(c.autoMatchTx(tx), null, 'dimatikan');
  P.auto = true;
  const r = c.autoMatchTx(tx);
  assert.equal(r.key, 'n|2044-04-20');
  assert.ok(Y.paid['n|2044-04-20'] && Y.real['n|2044-04-20'].tx === 'a1');
  c.unlinkBill('n|2044-04-20');
  assert.ok(!Y.paid['n|2044-04-20'] && !Y.real['n|2044-04-20']);
  // dua tagihan sama-sama cocok -> ambigu, tidak otomatis
  Y.items.push(item({ id: 'n2', name: 'Netflix', price: 50000, n: 1, unit: 'bulan', start: '2044-01-20' }));
  assert.equal(c.autoMatchTx(tx), null);
  // tanggal terlalu jauh / transaksi masuk -> tidak
  assert.equal(c.autoMatchTx({ id: 'a2', d: '2044-04-02', t: '-', amt: 49000, note: 'netflix' }), null);
  assert.equal(c.autoMatchTx({ id: 'a3', d: '2044-04-20', t: '+', amt: 49000, note: 'netflix' }), null);
});

test('match: jumlah persis tanpa nama = saran biasa (bukan otomatis); tagihan sudah lunas + transaksi = saran gabung; Bukan menyembunyikan', () => {
  const { Y, P } = matchSetup(2045);
  P.tx.push({ id: 'm1', d: '2045-05-22', t: '-', amt: 50000, cat: '', note: 'langganan' });
  const s = c.suggestMatches();
  assert.equal(s.length, 1);
  assert.equal(s[0].cand.conf, 'mid');
  assert.equal(c.autoMatchTx(P.tx[0]), null, 'mid tidak pernah otomatis');
  P.nm = ['m1'];
  assert.equal(c.suggestMatches().length, 0, 'ditolak -> tidak diusulkan');
  P.nm = [];
  // tagihan sudah ditandai lunas manual dan ada transaksi yang sangat cocok -> hitung ganda, ditawarkan gabung
  Y.paid['l|2045-05-05'] = 1;
  P.tx.push({ id: 'm2', d: '2045-05-05', t: '-', amt: 200000, cat: '', note: 'listrik pln' });
  const g = c.suggestMatches().filter((x) => x.tx.id === 'm2')[0];
  assert.equal(g.kind, 'paid');
  c.applyLink(g.cand.key, 'm2');
  assert.equal(c.realTx('l|2045-05-05').id, 'm2');
});

test('remapStatus/moveStatusExact: S.real ikut pindah bersama status lunas', () => {
  const { Y } = matchSetup(2046);
  Y.paid['l|2046-02-05'] = 1;
  Y.real['l|2046-02-05'] = { tx: 'z' };
  c.moveStatusExact('l', [['2046-02-05', '2046-02-12']], [Y.paid, Y.skip], [Y.real]);
  assert.ok(Y.paid['l|2046-02-12'] && !Y.paid['l|2046-02-05']);
  assert.equal(Y.real['l|2046-02-12'].tx, 'z');
  assert.ok(!Y.real['l|2046-02-05']);
});

test('norm: S.real dibersihkan dan profil kas membawa auto + nm', () => {
  const n = c.norm({ year: 2047, data: { 2047: { real: { 'a|2047-01-02': { tx: 't' }, rusak: { tx: 'x' }, 'b|2047-01-03': {} } } }, kas: { pr: { u: { id: 'u', link: true, nm: ['q', 5], tx: [] } } } });
  assert.deepEqual(JSON.parse(JSON.stringify(n.data[2047].real)), { 'a|2047-01-02': { tx: 't' } });
  assert.equal(n.kas.pr.u.auto, true);
  assert.deepEqual(Array.from(n.kas.pr.u.nm), ['q', '5']);
});
