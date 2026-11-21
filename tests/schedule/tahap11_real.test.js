// Verifikasi Tahap 11 (Mode Perjalanan): Realisasi vs Rencana (C1: Model data, normKas, rumus murni)
const assert = require('assert');
const { boot } = require('./ui.js');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  // =========================================================================
  // C1.1 Helper murni Tahap 11 harus tersedia di window
  // =========================================================================
  for (const fnName of ['tripAcRp', 'tripAcSplit', 'tripAcPlan', 'tripUnlinkAcRef']) {
    assert.strictEqual(typeof w[fnName], 'function', 'C1: helper ' + fnName + ' harus diekspos');
  }

  // =========================================================================
  // C1.2 normKas round-trip & sanitasi P.ac (nilai valid, berbahaya, orphan rf, batas 3000)
  // =========================================================================
  const dangerAmts = [NaN, Infinity, -Infinity, -10, 0, 1e12 + 1, 2e12, '100', 'abc', null, undefined, [100], { v: 100 }];
  const badDates = ['', null, undefined, '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026/05/01', 'not-a-date', 20260501];
  const dangerRts = [NaN, Infinity, -Infinity, -5, 0, 1e9 + 1, '105', null, [], {}];

  const longNote = 'N'.repeat(250);
  const normIn = {
    pr: {
      utama: { id: 'utama', name: 'Utama', saldo: 0, tx: [], link: true },
      'p-norm': {
        id: 'p-norm',
        name: 'Uji Ac',
        cur: 'JPY',
        rate: 100,
        fxs: [{ c: 'SEK', r: 1500 }],
        it: [{ id: 'it-1', day: '2026-05-01', place: 'Ramen', est: 1000, fx: true, pay: 'cash', cat: 'Makan' }],
        bk: [{ id: 'bk-1', title: 'Hotel', amt: 500000, fx: false, paid: true, cat: 'Penginapan' }],
        ac: [
          { id: 'ac-ok-it', d: '2026-05-01', amt: 1200, fx: true, rt: 105.5, cat: 'Makan', note: longNote, rf: 'it:it-1' },
          { id: 'ac-ok-sek', d: '2026-05-02', amt: 250, fx: true, c: 'sek', cat: 'Transport', rf: 'bk:bk-1' },
          { id: 'ac-ok-idr', d: '2026-05-03', amt: 75000, fx: false, c: 'SEK', rt: 999, cat: 'KategoriAneh', rf: 'it:hilang' },
          { id: 'ac-orphan-bk', d: '2026-05-03', amt: 30000, fx: false, cat: 'Belanja', rf: 'bk:hilang' },
          { id: 'ac-bad-cur', d: '2026-05-03', amt: 100, fx: true, c: 'ZZZ', cat: 'Lainnya', rf: 'invalid-ref' },
          // duplikat id -> dibuang
          { id: 'ac-ok-it', d: '2026-05-04', amt: 999, fx: false, cat: 'Makan' },
          // id kosong / objek -> dibuang
          { id: '', d: '2026-05-01', amt: 100, fx: false, cat: 'Makan' },
          { id: '   ', d: '2026-05-01', amt: 100, fx: false, cat: 'Makan' },
          { id: { x: 1 }, d: '2026-05-01', amt: 100, fx: false, cat: 'Makan' },
          // amt berbahaya -> dibuang
          ...dangerAmts.map((ba, i) => ({ id: 'bad-amt-' + i, d: '2026-05-01', amt: ba, fx: false, cat: 'Makan' })),
          // d tidak valid -> dibuang
          ...badDates.map((bd, i) => ({ id: 'bad-d-' + i, d: bd, amt: 1000, fx: false, cat: 'Makan' })),
          // rt berbahaya -> entri tetap, hanya rt dibuang
          ...dangerRts.map((brt, i) => ({ id: 'bad-rt-' + i, d: '2026-05-01', amt: 500, fx: true, rt: brt, cat: 'Makan' })),
        ],
      },
      'p-cap': {
        id: 'p-cap',
        name: 'Cap 3000',
        ac: Array.from({ length: 3050 }, (_, i) => ({
          id: 'c-' + i,
          d: '2026-06-01',
          amt: 1000 + i,
          fx: false,
          cat: 'Makan',
        })),
      },
    },
  };

  const normOut = w.normKas(normIn);
  const pN = normOut.pr['p-norm'];
  assert.ok(Array.isArray(pN.ac), 'C1 normKas: P.ac harus berupa array');
  assert.strictEqual(pN.ac.length, 5 + dangerRts.length, 'C1 normKas: entri tidak valid/duplikat harus dibuang, bad-rt tetap dipertahankan');

  const a1 = pN.ac.find((x) => x.id === 'ac-ok-it');
  assert.strictEqual(a1.amt, 1200);
  assert.strictEqual(a1.rt, 105.5);
  assert.strictEqual(a1.note.length, 200, 'C1 normKas: note dibatasi maks 200 karakter');
  assert.strictEqual(a1.rf, 'it:it-1', 'C1 normKas: rf valid it: dipertahankan');

  const a2 = pN.ac.find((x) => x.id === 'ac-ok-sek');
  assert.strictEqual(a2.c, 'SEK', 'C1 normKas: c tambahan valid dinormalisasi ke huruf besar');
  assert.strictEqual(a2.rf, 'bk:bk-1', 'C1 normKas: rf valid bk: dipertahankan');

  const a3 = pN.ac.find((x) => x.id === 'ac-ok-idr');
  assert.strictEqual(a3.fx, false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a3, 'c'), false, 'C1 normKas: c dibuang bila !fx');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a3, 'rt'), false, 'C1 normKas: rt dibuang bila !fx');
  assert.strictEqual(a3.cat, 'Lainnya', 'C1 normKas: kategori tak dikenal jatuh ke Lainnya');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a3, 'rf'), false, 'C1 normKas: rf yatim it: dilepas tanpa menghapus entri');

  const a4 = pN.ac.find((x) => x.id === 'ac-orphan-bk');
  assert.ok(a4, 'C1 normKas: entri dgn rf yatim bk: TIDAK ikut terhapus');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a4, 'rf'), false, 'C1 normKas: rf yatim bk: dilepas');

  const a5 = pN.ac.find((x) => x.id === 'ac-bad-cur');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a5, 'c'), false, 'C1 normKas: c yang tidak ada di P.fxs/P.cur dibuang');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(a5, 'rf'), false, 'C1 normKas: rf berformat salah dibuang');

  for (let i = 0; i < dangerRts.length; i++) {
    const ar = pN.ac.find((x) => x.id === 'bad-rt-' + i);
    assert.ok(ar, 'C1 normKas: bad-rt-' + i + ' tetap ada');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(ar, 'rt'), false, 'C1 normKas: rt berbahaya dibuang: ' + i);
  }

  // Round-trip kedua tidak mengubah apa pun
  const round2 = JSON.parse(JSON.stringify(w.normKas(JSON.parse(JSON.stringify(normOut))).pr['p-norm'].ac));
  assert.deepStrictEqual(round2, JSON.parse(JSON.stringify(pN.ac)), 'C1 normKas: idempoten round-trip P.ac');

  // Batas 3000 entri
  assert.strictEqual(normOut.pr['p-cap'].ac.length, 3000, 'C1 normKas: P.ac dibatasi maksimal 3000 entri');

  // Pelepasan tautan rf saat item dihapus (tanpa menghapus entri ac)
  const pUnlink = JSON.parse(JSON.stringify(pN));
  w.tripUnlinkAcRef(pUnlink, 'it:it-1');
  const unlinked1 = pUnlink.ac.find((x) => x.id === 'ac-ok-it');
  assert.ok(unlinked1, 'C1 tripUnlinkAcRef: entri ac tetap ada setelah tautan it dilepas');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(unlinked1, 'rf'), false, 'C1 tripUnlinkAcRef: rf dilepas');
  assert.strictEqual(pUnlink.ac.find((x) => x.id === 'ac-ok-sek').rf, 'bk:bk-1', 'C1 tripUnlinkAcRef: rf lain tidak ikut terlepas');

  // =========================================================================
  // C1.3 KASUS 3 (Nyata): Efek harga vs efek kurs (JPY 5.000 @100 vs JPY 6.200 @107)
  // =========================================================================
  const pKasus3 = {
    id: 'k3',
    name: 'Kasus 3 Tokyo',
    cur: 'JPY',
    rate: 100,
    start: '2026-05-01',
    end: '2026-05-03',
    budget: 10000000,
    it: [
      { id: 'k3-i1', day: '2026-05-01', place: 'Makan Malam', est: 5000, fx: true, pay: 'cash', cat: 'Makan' },
      { id: 'k3-i2', day: '2026-05-01', place: 'Transport Asing Beda', est: 1000, fx: true, pay: 'ic', cat: 'Transport' },
    ],
    bk: [],
    ac: [
      { id: 'k3-a1', d: '2026-05-01', amt: 6200, fx: true, rt: 107, cat: 'Makan', rf: 'it:k3-i1' },
      { id: 'k3-a2', d: '2026-05-01', amt: 80000, fx: false, cat: 'Transport', rf: 'it:k3-i2' }, // beda mata uang dgn k3-i2
    ],
  };
  assert.strictEqual(w.tripAcRp(pKasus3, pKasus3.ac[0]), 663400, 'C1 Kasus 3: tripAcRp(6200 @107) == Rp 663.400');
  const planK3 = w.tripAcPlan(pKasus3, '2026-05-01');
  const ef3 = planK3.byItEffect['k3-i1'];
  assert.ok(ef3 && ef3.sameCur === true, 'C1 Kasus 3: k3-i1 punya pecahan efek');
  assert.strictEqual(ef3.estRp, 500000, 'C1 Kasus 3: estRp = 500.000');
  assert.strictEqual(ef3.acRp, 663400, 'C1 Kasus 3: acRp = 663.400');
  assert.strictEqual(ef3.selisih, 163400, 'C1 Kasus 3: selisih = Rp 163.400');
  assert.strictEqual(ef3.efekHarga, 120000, 'C1 Kasus 3: efekHarga = Rp 120.000');
  assert.strictEqual(ef3.efekKurs, 43400, 'C1 Kasus 3: efekKurs = Rp 43.400');
  assert.strictEqual(ef3.efekHarga + ef3.efekKurs, ef3.selisih, 'C1 Kasus 3: efekHarga + efekKurs === selisih');

  const ef3DiffCur = planK3.byItEffect['k3-i2'];
  assert.ok(ef3DiffCur && ef3DiffCur.sameCur === false, 'C1 Kasus 3 beda mata uang: sameCur = false');
  assert.strictEqual(ef3DiffCur.efekHarga, null, 'C1 Kasus 3 beda mata uang: tanpa pecahan efekHarga');
  assert.strictEqual(ef3DiffCur.efekKurs, null, 'C1 Kasus 3 beda mata uang: tanpa pecahan efekKurs');
  assert.strictEqual(ef3DiffCur.selisih, -20000, 'C1 Kasus 3 beda mata uang: hanya selisih total (-20.000)');

  // =========================================================================
  // C1.4 KASUS 4 (Nyata): Proyeksi & Laju melebihi anggaran
  // Budget 25jt, pl.b 21.5jt, N=10, todayISO=hari ke-3, realHarian=1.4jt
  // =========================================================================
  const pKasus4 = {
    id: 'k4',
    name: 'Kasus 4 Proyeksi',
    start: '2026-05-01',
    end: '2026-05-10',
    budget: 25000000,
    cur: '',
    rate: 0,
    bk: [
      { id: 'k4-b1', title: 'Tiket & Hotel', amt: 21500000, fx: false, paid: true, cat: 'Transport' },
    ],
    it: [
      { id: 'k4-i1', day: '2026-05-01', place: 'Makan H1', est: 300000, fx: false, pay: 'cash', cat: 'Makan' },
      { id: 'k4-i2', day: '2026-05-02', place: 'Kereta H2', est: 200000, fx: false, pay: 'cash', cat: 'Transport' },
      { id: 'k4-i3', day: '2026-05-03', place: 'Tiket H3', est: 400000, fx: false, pay: 'cash', cat: 'Tiket & Tour' },
      { id: 'k4-i4', day: '2026-05-08', place: 'Belanja H8', est: 1000000, fx: false, pay: 'cash', cat: 'Belanja' },
    ],
    ac: [
      { id: 'k4-a1', d: '2026-05-01', amt: 500000, fx: false, cat: 'Makan' },
      { id: 'k4-a2', d: '2026-05-02', amt: 450000, fx: false, cat: 'Transport' },
      { id: 'k4-a3', d: '2026-05-03', amt: 450000, fx: false, cat: 'Tiket & Tour' },
    ],
  };
  const planK4 = w.tripAcPlan(pKasus4, '2026-05-03');
  assert.strictEqual(planK4.N, 10, 'C1 Kasus 4: N = 10');
  assert.strictEqual(planK4.elapsed, 3, 'C1 Kasus 4: elapsed = 3');
  assert.strictEqual(planK4.through, '2026-05-03', 'C1 Kasus 4: through = 2026-05-03');
  assert.strictEqual(planK4.realHarian, 1400000, 'C1 Kasus 4: realHarian = 1.400.000');
  assert.strictEqual(planK4.paid, 21500000, 'C1 Kasus 4: paid = 21.500.000');
  assert.strictEqual(planK4.realTotal, 22900000, 'C1 Kasus 4: realTotal = 22.900.000');
  assert.strictEqual(planK4.planToDate, 900000, 'C1 Kasus 4: planToDate s/d hari ke-3 = 900.000');
  assert.strictEqual(planK4.realToDate, 1400000, 'C1 Kasus 4: realToDate s/d hari ke-3 = 1.400.000');
  assert.strictEqual(planK4.diffToDate, 500000, 'C1 Kasus 4: diffToDate = +500.000');
  assert.strictEqual(planK4.sisaAnggaranHarian, 3500000, 'C1 Kasus 4: sisaAnggaranHarian = 3.500.000');
  assert.strictEqual(Math.round(planK4.laju), 466667, 'C1 Kasus 4: laju = 466.667');
  assert.strictEqual(Math.round(planK4.proyeksiHarian), 4666667, 'C1 Kasus 4: proyeksiHarian = 4.666.667');
  assert.strictEqual(planK4.overPace, true, 'C1 Kasus 4: badge Laju melebihi anggaran aktif');
  assert.strictEqual(Math.round(planK4.overPaceDiff), 1166667, 'C1 Kasus 4: selisih Laju melebihi anggaran = Rp 1.166.667');
  assert.strictEqual(Math.round(planK4.sisaPerHari), 300000, 'C1 Kasus 4: sisaPerHari = Rp 300.000');
  assert.strictEqual(planK4.overBudget, false, 'C1 Kasus 4: total commitment 22.9jt <= 25jt -> overBudget false');

  // =========================================================================
  // C1.5 KASUS 5 (Nyata): Multi-mata uang NOK + SEK + IDR, pemesanan lunas tanpa dobel + bk extra
  // =========================================================================
  const pKasus5 = {
    id: 'k5',
    name: 'Kasus 5 Nordik',
    start: '2026-07-01',
    end: '2026-07-04',
    budget: 30000000,
    cur: 'NOK',
    rate: 1500,
    fxs: [{ c: 'SEK', r: 1600 }],
    bk: [
      { id: 'k5-b1', title: 'Hotel Oslo', amt: 4000, fx: true, paid: true, rt: 1480, cat: 'Penginapan' },
      { id: 'k5-b2', title: 'Kereta SJ', amt: 1000, fx: true, c: 'SEK', paid: false, cat: 'Transport' },
    ],
    it: [
      { id: 'k5-i1', day: '2026-07-01', place: 'Kopi Oslo', est: 100, fx: true, pay: 'cash', cat: 'Makan' },
    ],
    ac: [
      { id: 'k5-a1', d: '2026-07-01', amt: 250, fx: true, cat: 'Makan', rf: 'it:k5-i1' }, // 250 * 1500 = 375.000
      { id: 'k5-a2', d: '2026-07-02', amt: 300, fx: true, c: 'SEK', rt: 1620, cat: 'Transport' }, // 300 * 1620 = 486.000
      { id: 'k5-a3', d: '2026-07-02', amt: 150000, fx: false, cat: 'Belanja' }, // 150.000
      { id: 'k5-a4', d: '2026-07-01', amt: 200, fx: true, cat: 'Penginapan', note: 'Biaya city tax', rf: 'bk:k5-b1' }, // 200 * 1500 = 300.000 (biaya tambahan pemesanan lunas)
    ],
  };
  const spK5 = w.tripAcSplit(pKasus5);
  assert.strictEqual(spK5.idr, 150000, 'C1 Kasus 5: idr = 150.000');
  assert.strictEqual(spK5.fxIdr, 375000 + 300000 + 486000, 'C1 Kasus 5: fxIdr = 1.161.000');
  assert.strictEqual(spK5.by.length, 2, 'C1 Kasus 5: by memuat NOK dan SEK');
  assert.strictEqual(spK5.by[0].c, 'NOK');
  assert.strictEqual(spK5.by[0].amt, 450);
  assert.strictEqual(spK5.by[0].idr, 675000);
  assert.strictEqual(spK5.by[1].c, 'SEK');
  assert.strictEqual(spK5.by[1].amt, 300);
  assert.strictEqual(spK5.by[1].idr, 486000);

  const planK5 = w.tripAcPlan(pKasus5, '2026-07-02');
  // paid = 4000 * 1480 = 5.920.000 (Hotel Oslo lunas); realHarian = 150k + 1.161k = 1.311.000 -> realTotal = 7.231.000 (tanpa dobel!)
  assert.strictEqual(planK5.paid, 5920000, 'C1 Kasus 5: paid = 5.920.000');
  assert.strictEqual(planK5.realHarian, 1311000, 'C1 Kasus 5: realHarian = 1.311.000');
  assert.strictEqual(planK5.realTotal, 5920000 + 1311000, 'C1 Kasus 5: realTotal = paid + realHarian (tanpa dobel pemesanan lunas)');
  assert.ok(planK5.bkExtra['k5-b1'] && planK5.bkExtra['k5-b1'].rp === 300000 && planK5.bkExtra['k5-b1'].count === 1, 'C1 Kasus 5: rf bk: masuk bkExtra biaya tambahan');
  assert.strictEqual(planK5.unlinked.count, 2, 'C1 Kasus 5: 2 catatan tanpa tautan rf');
  assert.strictEqual(planK5.unlinked.rp, 486000 + 150000, 'C1 Kasus 5: total tanpa tautan = 636.000');

  // =========================================================================
  // C1.6 Tes Properti Acak (200 fixture): pembulatan, efekHarga+efekKurs, realTotal
  // =========================================================================
  const rng = mulberry32(20261121);
  const cats = ['Makan', 'Transport', 'Tiket & Tour', 'Belanja', 'Penginapan', 'Persiapan', 'Lainnya'];
  for (let f = 0; f < 200; f++) {
    const mainR = 50 + Math.round(rng() * 19000) / 100; // kurs pecahan
    const sekR = 800 + Math.round(rng() * 120000) / 100;
    const eurR = 14000 + Math.round(rng() * 350000) / 100;
    const nIt = 1 + Math.floor(rng() * 4);
    const itArr = [];
    for (let i = 0; i < nIt; i++) {
      const fx = rng() > 0.3;
      const curChoice = rng() > 0.5 ? '' : rng() > 0.5 ? 'SEK' : 'EUR';
      itArr.push({
        id: 'ri-' + f + '-' + i,
        day: '2026-08-0' + (1 + Math.floor(rng() * 5)),
        place: 'P' + i,
        est: Math.round((1 + rng() * 500) * 100) / 100,
        fx,
        c: fx && curChoice ? curChoice : undefined,
        rt: fx && rng() > 0.6 ? Math.round((mainR * (0.8 + rng() * 0.4)) * 100) / 100 : undefined,
        pay: rng() > 0.2 ? 'cash' : 'ic',
        cat: cats[Math.floor(rng() * cats.length)],
      });
    }
    const bkArr = [
      { id: 'rb-' + f, title: 'Bk', amt: Math.round(rng() * 3000), fx: rng() > 0.4, paid: rng() > 0.3, rt: Math.round((mainR + 2.35) * 100) / 100, cat: 'Transport' },
    ];
    const acArr = [];
    const nAc = 1 + Math.floor(rng() * 8);
    for (let j = 0; j < nAc; j++) {
      const fx = rng() > 0.25;
      const cPick = fx ? (rng() > 0.5 ? undefined : rng() > 0.5 ? 'SEK' : 'EUR') : undefined;
      const linkPick = rng() > 0.35 ? ('it:' + itArr[Math.floor(rng() * itArr.length)].id) : rng() > 0.5 ? ('bk:' + bkArr[0].id) : undefined;
      acArr.push({
        id: 'ra-' + f + '-' + j,
        d: '2026-08-0' + (1 + Math.floor(rng() * 7)),
        amt: Math.round((0.5 + rng() * 600) * 100) / 100,
        fx,
        c: cPick,
        rt: fx && rng() > 0.4 ? Math.round((mainR * (0.75 + rng() * 0.5)) * 100) / 100 : undefined,
        cat: cats[Math.floor(rng() * cats.length)],
        rf: linkPick,
      });
    }
    const propP = {
      id: 'prop-' + f,
      name: 'Prop ' + f,
      start: '2026-08-01',
      end: '2026-08-06',
      budget: 50000000,
      cur: 'NOK',
      rate: mainR,
      fxs: [{ c: 'SEK', r: sekR }, { c: 'EUR', r: eurR }],
      it: itArr,
      bk: bkArr,
      ac: acArr,
    };
    const apProp = w.tripAcPlan(propP, '2026-08-04');
    const spProp = w.tripAcSplit(propP);
    assert.strictEqual(spProp.idr + spProp.fxIdr, Math.round(apProp.realHarian), 'Prop #' + f + ': idr + fxIdr == Math.round(realHarian)');
    const sumBy = spProp.by.reduce((s, b) => s + b.idr, 0);
    assert.strictEqual(sumBy, spProp.fxIdr, 'Prop #' + f + ': sum(by.idr) == fxIdr');
    assert.ok(Math.abs(apProp.realTotal - (apProp.paid + apProp.realHarian)) < 1e-6, 'Prop #' + f + ': realTotal == paid + realHarian');
    for (const iid of Object.keys(apProp.byItEffect)) {
      const ef = apProp.byItEffect[iid];
      if (ef.sameCur) {
        assert.strictEqual(ef.efekHarga + ef.efekKurs, ef.selisih, 'Prop #' + f + ' item ' + iid + ': efekHarga + efekKurs == selisih');
      }
    }
  }

  // =========================================================================
  // C1.7 Kasus Batas Rentang Tanggal: tanpa rentang, sebelum mulai, setelah selesai
  // =========================================================================
  const pNoRange = { id: 'nr', name: 'Tanpa Rentang', start: '', end: '', budget: 5000000, cur: '', rate: 0, it: [], bk: [], ac: [{ id: 'a1', d: '2026-05-02', amt: 100000, fx: false, cat: 'Makan' }] };
  const apNoRange = w.tripAcPlan(pNoRange, '2026-05-02');
  assert.strictEqual(apNoRange.hasRange, false, 'C1 tanpa rentang: hasRange = false');
  assert.strictEqual(apNoRange.sisaPerHari, null, 'C1 tanpa rentang: sisaPerHari = null');
  assert.strictEqual(apNoRange.overPace, false, 'C1 tanpa rentang: overPace = false');
  assert.strictEqual(apNoRange.overBudget, false, 'C1 tanpa rentang: overBudget = false');
  assert.strictEqual(apNoRange.realHarian, 100000, 'C1 tanpa rentang: realHarian tetap terhitung');

  const apBefore = w.tripAcPlan(pKasus4, '2026-04-28');
  assert.strictEqual(apBefore.elapsed, 0, 'C1 sebelum mulai: elapsed = 0');
  assert.strictEqual(apBefore.through, '', 'C1 sebelum mulai: through kosong');
  assert.strictEqual(apBefore.planToDate, 0, 'C1 sebelum mulai: planToDate = 0');
  assert.strictEqual(apBefore.realToDate, 0, 'C1 sebelum mulai: realToDate = 0');
  assert.strictEqual(apBefore.laju, 0, 'C1 sebelum mulai: laju = 0');
  assert.strictEqual(apBefore.overPace, false, 'C1 sebelum mulai: overPace = false');

  const apAfter = w.tripAcPlan(pKasus4, '2026-05-15');
  assert.strictEqual(apAfter.elapsed, 10, 'C1 setelah selesai: elapsed = N');
  assert.strictEqual(apAfter.through, '2026-05-10', 'C1 setelah selesai: through = P.end');
  assert.strictEqual(apAfter.sisaPerHari, null, 'C1 setelah selesai: sisaPerHari = null (elapsed == N)');

  // =========================================================================
  // C2: UI Desktop & Paritas Desktop-APK Sub-tab "Realisasi"
  // =========================================================================
  const origToday = w.todayISO;
  try {
    w.setShellMode('browser');
    w.setMode('trip');

    // C2.1 Sub-tab "Realisasi" terletak persis setelah "Pemesanan" & keadaan kosong
    w.ALL.kas.pr['p-11d-empty'] = {
      id: 'p-11d-empty',
      name: 'Kosong Uji',
      link: false,
      saldo: 0,
      tx: [],
      start: '',
      end: '',
      budget: 0,
      cur: 'JPY',
      rate: 105,
      dt: {},
      it: [{ id: 'ei1', day: '2026-05-01', time: '09:00', time2: '', place: 'Kopi', est: 500, fx: true, pay: 'cash', cat: 'Makan', link: '', note: '', done: false }],
      bk: [{ id: 'eb1', title: 'Hotel', amt: 1000000, fx: false, paid: true, cat: 'Penginapan', a: '', b: '', pay: 'on', link: '', rec: '' }],
      ac: [],
      lk: [],
      ck: [],
      note: '',
      goal: null,
    };
    w.tripAct = 'p-11d-empty';
    w.BR_STATE.tripView = 'detail';
    w.BR_STATE.tripSubTab = 'ring';
    w.renderTrip();
    const deskSubBtns = [...$('trip-root').querySelectorAll('[data-triptab]')].map((b) => b.dataset.triptab);
    assert.deepStrictEqual(deskSubBtns, ['ring', 'itin', 'book', 'real', 'cek', 'cat', 'sv'], 'C2 Desktop: urutan sub-tab meletakkan real setelah book');

    click($('trip-root').querySelector('[data-triptab="real"]'));
    assert.strictEqual(w.BR_STATE.tripSubTab, 'real', 'C2 Desktop: klik sub-tab Realisasi membuka real');
    const emptyTxt = $('trip-root').textContent;
    assert.ok(emptyTxt.includes('Belum ada pengeluaran. Catat yang pertama.'), 'C2 Desktop: teks empty state tampil');
    assert.ok(/tanpa rentang|belum lengkap/i.test(emptyTxt), 'C2 Desktop: keterangan tanpa rentang tanggal tampil');
    assert.ok(!emptyTxt.includes('Laju melebihi anggaran'), 'C2 Desktop tanpa rentang: tanpa peringatan laju');
    assert.ok($('ac-rt-details'), 'C2 Desktop: elemen lipat Kurs aktual ada juga di form TAMBAH');
    assert.strictEqual($('ac-rt-details').style.display !== 'none', true, 'C2 Desktop: saat cur mata uang asing/terakhir asing atau dipilih fx, kurs tampil');

    // Form mengingat pilihan terakhir per perjalanan & kurs aktual di form TAMBAH + pratinjau ≈ Rp + toast + esc XSS + .pv
    $('ac-amt').value = '6200';
    $('ac-cur').value = 'fx';
    fire($('ac-cur'), 'change');
    assert.strictEqual($('ac-rt-details').style.display !== 'none', true, 'C2 Desktop: Kurs aktual tampil di form Tambah saat fx dipilih');
    $('ac-rt').value = '107';
    fire($('ac-rt'), 'input');
    assert.ok($('ac-amt-eq').textContent.includes('663.400'), 'C2 Desktop: pratinjau ≈ Rp mengikuti kurs aktual 107 -> Rp 663.400');
    click($('trip-ac-form').querySelector('[data-ac-cat="Belanja"]'));
    $('ac-note').value = '<img src=x onerror=alert(1)> Oleh-oleh';
    fire($('trip-ac-form'), 'submit');
    assert.strictEqual($('ttm').textContent, 'Pengeluaran dicatat', 'C2 Desktop: toast tambah pengeluaran');
    assert.strictEqual(w.ALL.kas.pr['p-11d-empty'].ac.length, 1, 'C2 Desktop: P.ac bertambah');
    const recAc = w.ALL.kas.pr['p-11d-empty'].ac[0];
    assert.strictEqual(recAc.cat, 'Belanja');
    assert.strictEqual(recAc.rt, 107);
    assert.ok(!$('trip-root').innerHTML.includes('<img src=x onerror'), 'C2 Desktop: catatan di-escape dengan esc()');
    assert.ok([...$('trip-root').querySelectorAll('.metric-tile-val')].every((el) => el.classList.contains('pv')), 'C2 Desktop: seluruh nilai tile memakai kelas .pv');

    // Mengingat pilihan terakhir (mata uang & kategori) saat merender ulang
    assert.strictEqual($('ac-cur').value, 'fx', 'C2 Desktop: ingat mata uang terakhir');
    assert.strictEqual($('trip-ac-form').querySelector('[data-ac-cat="Belanja"]').getAttribute('aria-pressed'), 'true', 'C2 Desktop: ingat kategori terakhir');

    // C2.2 Kasus 3 & Ubah + Scroll + Pindah Sub-tab Reset Edit Mode + Hapus dgn Urungkan
    w.ALL.kas.pr['p-11d-k3'] = {
      id: 'p-11d-k3',
      name: 'Kasus 3 UI',
      link: false,
      saldo: 0,
      tx: [],
      start: '2026-05-01',
      end: '2026-05-03',
      budget: 25000000,
      cur: 'JPY',
      rate: 100,
      dt: {},
      it: [
        { id: 'k3u-i1', day: '2026-05-01', time: '19:00', time2: '', place: 'Wagyu Dinner', est: 5000, fx: true, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
      ],
      bk: [
        { id: 'k3u-b1', title: 'JR Pass', amt: 5000000, fx: false, paid: true, cat: 'Transport', a: '2026-05-01', b: '2026-05-03', pay: 'on', link: '', rec: '' },
      ],
      ac: [
        { id: 'k3u-a1', d: '2026-05-01', amt: 6200, fx: true, rt: 107, cat: 'Makan', note: 'Wagyu', rf: 'it:k3u-i1' },
        { id: 'k3u-a2', d: '2026-04-29', amt: 50000, fx: false, cat: 'Lainnya', note: 'Pra-berangkat' },
        { id: 'k3u-a3', d: '2026-05-01', amt: 120000, fx: false, cat: 'Transport', note: 'Bagasi ekstra', rf: 'bk:k3u-b1' },
      ],
      lk: [],
      ck: [],
      note: '',
      goal: null,
    };
    w.todayISO = () => '2026-05-02';
    w.tripAct = 'p-11d-k3';
    w.BR_STATE.tripSubTab = 'real';
    w.BR_STATE.inlineDates.acDay = '2026-05-01';
    w.renderTrip();
    const k3Txt = $('trip-root').textContent;
    assert.ok(k3Txt.includes('Efek harga') && k3Txt.includes('Rp 120.000'), 'C2 Desktop K3: tampil Efek harga Rp 120.000');
    assert.ok(k3Txt.includes('Efek kurs') && k3Txt.includes('Rp 43.400'), 'C2 Desktop K3: tampil Efek kurs Rp 43.400');
    assert.ok(k3Txt.includes('Di luar rentang'), 'C2 Desktop: entri 2026-04-29 diberi badge Di luar rentang');
    assert.ok(k3Txt.includes('Tanpa tautan rencana:') && k3Txt.includes('Rp 50.000') && k3Txt.includes('1 catatan'), 'C2 Desktop: baris Tanpa tautan rencana: Rp X (n catatan)');
    assert.ok(k3Txt.includes('lebih'), 'C2 Desktop: selisih positif kategori memuat kata lebih');
    assert.ok(k3Txt.includes('Kategori paling meleset'), 'C2 Desktop: kartu Kategori paling meleset tampil');
    assert.ok([...$('ac-rf').options].some((o) => o.value === 'it:k3u-i1'), 'C2 Desktop: #ac-rf memuat kegiatan itinerary pd tgl tsb');
    assert.ok([...$('ac-rf').options].some((o) => o.value === 'bk:k3u-b1'), 'C2 Desktop: #ac-rf memuat pemesanan');

    // Tab Pemesanan menampilkan biaya tambahan di bawah baris JR Pass
    click($('trip-root').querySelector('[data-triptab="book"]'));
    const bookTxt = $('trip-root').textContent;
    assert.ok(bookTxt.includes('Biaya tambahan') && bookTxt.includes('Rp 120.000'), 'C2 Desktop Book: biaya tambahan rf=bk: tampil di bawah pemesanan');
    click($('trip-root').querySelector('[data-triptab="real"]'));

    // Scroll saat Ubah & kembali ke baris setelah Simpan + reset saat pindah sub-tab
    const deskScrolls = [];
    const origSIV = w.Element.prototype.scrollIntoView;
    w.Element.prototype.scrollIntoView = function () {
      deskScrolls.push(this.id || this.getAttribute('data-ac-row') || this.tagName);
    };
    click($('trip-root').querySelector('[data-ac-edit="k3u-a1"]'));
    assert.strictEqual(w.BR_STATE.tripEditAcId, 'k3u-a1', 'C2 Desktop Ubah: masuk mode edit');
    assert.ok(deskScrolls.length >= 1, 'C2 Desktop Ubah: menggulir ke form');
    // Pindah sub-tab mereset mode edit pengeluaran
    click($('trip-root').querySelector('[data-triptab="ring"]'));
    assert.strictEqual(w.BR_STATE.tripEditAcId, null, 'C2 Desktop: pindah sub-tab mereset mode edit pengeluaran');
    click($('trip-root').querySelector('[data-triptab="real"]'));
    click($('trip-root').querySelector('[data-ac-edit="k3u-a1"]'));
    $('ac-note').value = 'Wagyu Diperbarui';
    deskScrolls.length = 0;
    fire($('trip-ac-form'), 'submit');
    assert.strictEqual($('ttm').textContent, 'Pengeluaran diperbarui', 'C2 Desktop: toast perbarui pengeluaran');
    assert.strictEqual(w.BR_STATE.tripEditAcId, null, 'C2 Desktop: selesai edit mereset tripEditAcId');
    assert.ok(w.ALL.kas.pr['p-11d-k3'].ac.find((x) => x.id === 'k3u-a1').note === 'Wagyu Diperbarui');
    w.Element.prototype.scrollIntoView = origSIV;

    // Hapus item itinerary yg ditautkan -> catatan ac tetap ada, rf lepas
    click($('trip-root').querySelector('[data-triptab="itin"]'));
    click($('trip-root').querySelector('[data-trip-it-del="k3u-i1"]'));
    click(w.document.querySelector('.cfm [data-cf-y]'));
    assert.strictEqual(w.ALL.kas.pr['p-11d-k3'].it.length, 0, 'C2 Desktop: itinerary k3u-i1 terhapus');
    const keptAc = w.ALL.kas.pr['p-11d-k3'].ac.find((x) => x.id === 'k3u-a1');
    assert.ok(keptAc && !keptAc.rf, 'C2 Desktop: menghapus item itinerary bertaut tidak menghapus catatan pengeluaran & melepas rf');

    // Hapus pengeluaran memakai toast Urungkan
    click($('trip-root').querySelector('[data-triptab="real"]'));
    const cntBeforeDel = w.ALL.kas.pr['p-11d-k3'].ac.length;
    click($('trip-root').querySelector('[data-ac-del="k3u-a2"]'));
    click(w.document.querySelector('.cfm [data-cf-y]'));
    assert.strictEqual(w.ALL.kas.pr['p-11d-k3'].ac.length, cntBeforeDel - 1, 'C2 Desktop: pengeluaran terhapus setelah konfirmasi');
    assert.ok(!$('tt').hidden && $('ttu') && !$('ttu').hidden, 'C2 Desktop: toast hapus memuat tombol Urungkan');
    click($('ttu'));
    assert.strictEqual(w.ALL.kas.pr['p-11d-k3'].ac.length, cntBeforeDel, 'C2 Desktop: Urungkan mengembalikan pengeluaran terhapus');

    // C2.3 Kasus 4 + Kasus 5 & Paritas Desktop vs APK
    w.ALL.kas.pr['p-11-k4'] = Object.assign(JSON.parse(JSON.stringify(pKasus4)), { id: 'p-11-k4' });
    w.todayISO = () => '2026-05-03';
    w.tripAct = 'p-11-k4';
    w.BR_STATE.tripSubTab = 'real';
    w.renderTrip();
    const deskK4Txt = $('trip-root').textContent;
    assert.ok(deskK4Txt.includes('Laju melebihi anggaran') && deskK4Txt.includes('Rp 1.166.667'), 'C2 Desktop K4: badge Laju melebihi anggaran dgn selisih Rp 1.166.667');
    assert.ok(deskK4Txt.includes('Rp 300.000'), 'C2 Desktop K4: Sisa per hari Rp 300.000');

    w.setShellMode('mobile-app');
    w.MOB_STATE.tripId = 'p-11-k4';
    w.MOB_STATE.tripView = 'detail';
    w.MOB_STATE.tripSub = 'real';
    w.renderMobTrip();
    const mobK4Txt = $('m-trip-root').textContent;
    assert.ok(mobK4Txt.includes('Laju melebihi anggaran') && mobK4Txt.includes('Rp 1.166.667'), 'C2 APK K4: paritas badge Laju melebihi anggaran');
    assert.ok(mobK4Txt.includes('Rp 300.000'), 'C2 APK K4: paritas Sisa per hari Rp 300.000');
    const deskVals = [...$('trip-root').querySelectorAll('.trip-real-kpis .metric-tile-val')].map((el) => el.textContent.trim());
    const mobVals = [...$('m-trip-root').querySelectorAll('.trip-real-kpis .m-tile-v')].map((el) => el.textContent.trim());
    assert.deepStrictEqual(mobVals, deskVals, 'C2 Paritas K4: 4 nilai KPI Realisasi APK identik dengan Desktop');

    // Paritas Kasus 5 (Multi mata uang NOK & SEK)
    w.ALL.kas.pr['p-11-k5'] = Object.assign(JSON.parse(JSON.stringify(pKasus5)), { id: 'p-11-k5' });
    w.todayISO = () => '2026-07-02';
    w.MOB_STATE.tripId = 'p-11-k5';
    w.MOB_STATE.tripSub = 'real';
    w.renderMobTrip();
    const mobK5CurCard = $('m-trip-root').querySelector('.trip-ac-fx-detail-card');
    assert.ok(mobK5CurCard && mobK5CurCard.textContent.includes('NOK') && mobK5CurCard.textContent.includes('SEK'), 'C2 APK K5: kartu rincian mata uang aktual memuat NOK & SEK');

    w.setShellMode('browser');
    w.tripAct = 'p-11-k5';
    w.BR_STATE.tripSubTab = 'real';
    w.renderTrip();
    const deskK5CurCard = $('trip-root').querySelector('.trip-ac-fx-detail-card');
    assert.ok(deskK5CurCard && deskK5CurCard.textContent.includes('NOK') && deskK5CurCard.textContent.includes('SEK'), 'C2 Desktop K5: kartu rincian mata uang aktual memuat NOK & SEK');

    // Bersihkan fixture uji C2
    ['p-11d-empty', 'p-11d-k3', 'p-11-k4', 'p-11-k5'].forEach((k) => { delete w.ALL.kas.pr[k]; });

    // =========================================================================
    // C3: PDF (tripPdfData), Bagikan (tripText), WinAnsi bebas ?, & sw.js v32
    // =========================================================================
    const fs = require('fs');
    const path = require('path');
    w.todayISO = () => '2026-07-02';
    const pNoAcUndef = Object.assign({}, JSON.parse(JSON.stringify(pKasus5)));
    delete pNoAcUndef.ac;
    const pNoAcEmpty = Object.assign({}, JSON.parse(JSON.stringify(pKasus5)), { ac: [] });
    assert.strictEqual(
      Buffer.from(w.repPdf(w.tripPdfData(pNoAcUndef, true))).toString('hex'),
      Buffer.from(w.repPdf(w.tripPdfData(pNoAcEmpty, true))).toString('hex'),
      'C3 PDF tanpa P.ac identik byte-per-byte (undef vs [])',
    );
    assert.strictEqual(w.tripText(pNoAcUndef, true), w.tripText(pNoAcEmpty, true), 'C3 tripText tanpa P.ac identik');
    assert.ok(!w.tripText(pNoAcEmpty, true).includes('Realisasi Pengeluaran'), 'C3 tanpa P.ac tidak menyisipkan blok Realisasi');

    // Dengan cost=true & P.ac.length > 0 -> PDF & Bagikan memuat ringkasan + pengeluaran aktual
    const pdfK5 = w.tripPdfData(pKasus5, true);
    const pdfSummaryStr = pdfK5.summary.map((r) => r.join(': ')).join('\n');
    const pdfTableHeads = pdfK5.tables.map((t0) => t0.head);
    const pdfFlatTxt = JSON.stringify(pdfK5);
    assert.ok(pdfSummaryStr.includes('Rencana s/d hari ini'), 'C3 PDF summary memuat Rencana s/d hari ini');
    assert.ok(pdfSummaryStr.includes('Realisasi'), 'C3 PDF summary memuat Realisasi');
    assert.ok(pdfSummaryStr.includes('Selisih'), 'C3 PDF summary memuat Selisih');
    assert.ok(pdfTableHeads.some((h) => /Pengeluaran Aktual/i.test(h)), 'C3 PDF memuat tabel Pengeluaran Aktual');
    assert.ok(!pdfFlatTxt.includes('≈'), 'C3 PDF tidak memuat karakter non-WinAnsi ≈');
    const pdfBytesK5 = w.repPdf(pdfK5);
    const pdfStreamK5 = Buffer.from(pdfBytesK5).toString('latin1');
    assert.ok(!pdfStreamK5.includes('?'), 'C3 PDF stream baru bebas karakter ?');

    // Dengan cost=false -> tidak menyertakan rincian realisasi biaya
    const pdfK5NoCost = w.tripPdfData(pKasus5, false);
    assert.ok(!pdfK5NoCost.tables.some((t0) => /Pengeluaran Aktual/i.test(t0.head)), 'C3 PDF tanpa cost tidak menyertakan Pengeluaran Aktual');

    // Non-WinAnsi deteksi juga memeriksa P.ac[].note
    assert.strictEqual(w.tripPdfHasNonWinAnsi(pKasus5), false, 'C3 tripPdfHasNonWinAnsi false untuk P.ac ASCII/WinAnsi');
    const pEmojiAc = Object.assign(JSON.parse(JSON.stringify(pKasus5)), {
      ac: [{ id: 'e1', d: '2026-07-01', amt: 100, fx: true, cat: 'Makan', note: 'Sushi 🍣' }],
    });
    assert.strictEqual(w.tripPdfHasNonWinAnsi(pEmojiAc), true, 'C3 tripPdfHasNonWinAnsi mendeteksi emoji pada P.ac[].note');

    // Bagikan teks WhatsApp boleh memakai ≈
    const txtK5 = w.tripText(pKasus5, true);
    assert.ok(txtK5.includes('*Realisasi Pengeluaran*'), 'C3 tripText memuat bagian Realisasi Pengeluaran');
    assert.ok(txtK5.includes('Rencana s/d hari ini'), 'C3 tripText memuat Rencana s/d hari ini');
    assert.ok(txtK5.includes('Biaya city tax') && txtK5.includes('SEK 300') && txtK5.includes('≈ Rp 486.000'), 'C3 tripText memuat detail aktual dan ≈ Rp');
    assert.ok(!w.tripText(pKasus5, false).includes('Realisasi Pengeluaran'), 'C3 tripText tanpa cost tidak menyertakan Realisasi');

    // Service Worker minimal rk-cache-v32 (naik di tahap berikutnya ke v33+)
    const swSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
    const swVerMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
    assert.ok(swVerMatch && Number(swVerMatch[1]) >= 32, 'C3 sw.js: CACHE_NAME harus minimal rk-cache-v32');
  } finally {
    w.todayISO = origToday;
  }

  assert.strictEqual(errs.length, 0, 'tidak ada galat JS: ' + errs.join(' | '));
  console.log('OK tahap11_real (C1 + C2 + C3)');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap11_real:', e);
  process.exit(1);
});
