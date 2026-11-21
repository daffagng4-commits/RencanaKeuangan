// Verifikasi Tahap 12B.1 (Bagian P): P2 (tombol tanpa harga), P3/P4 (au + RK_SCHEMA_VER=3 + popup FX untuk item Rp).
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  const fireInput = (el, val) => {
    el.value = val;
    el.dispatchEvent(new w.Event('input', { bubbles: true, cancelable: true }));
  };

  // =========================================================================
  // P2 + P3 DATA & RUMUS: normKas(au), RK_SCHEMA_VER=3, tripActualRp, tripVsPlan
  // =========================================================================
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'P3 Schema: RK_SCHEMA_VER harus naik ke 3');
  assert.strictEqual(w.norm(null).sv, 3, 'P3 Schema: norm(null).sv === 3');

  // normKas untuk au valid vs berbahaya
  const normAu = w.normKas({
    pr: {
      'p-au-norm': {
        id: 'p-au-norm',
        name: 'Uji AU',
        cur: 'JPY',
        rate: 100,
        fxs: [{ c: 'NOK', r: 1500 }],
        it: [
          { id: 'au-ok-main', day: '2026-10-01', place: 'Rp->JPY', est: 500000, fx: false, pay: 'cash', ax: 3000, au: 'jpy', ak: 105 },
          { id: 'au-ok-extra', day: '2026-10-01', place: 'Rp->NOK', est: 500000, fx: false, pay: 'cash', ax: 250, au: 'NOK' },
          // au tidak dikenal (ZZZ) -> harus buang au, ax, DAN ak sekaligus!
          { id: 'au-bad-cur', day: '2026-10-01', place: 'BadCur', est: 500000, fx: false, pay: 'cash', ax: 250, au: 'ZZZ', ak: 1500 },
          // au bukan 3 huruf / tipe berbahaya -> buang au, ax, ak sekaligus!
          { id: 'au-bad-len', day: '2026-10-01', place: 'BadLen', est: 500000, fx: false, pay: 'cash', ax: 250, au: 'AB', ak: 1500 },
          { id: 'au-bad-type', day: '2026-10-01', place: 'BadType', est: 500000, fx: false, pay: 'cash', ax: 250, au: 123, ak: 1500 },
          // Item FX dengan ak tapi tanpa ax -> buang ak
          { id: 'au-no-ax', day: '2026-10-01', place: 'NoAx', est: 500000, fx: false, pay: 'cash', au: 'NOK', ak: 1500 },
        ],
        bk: [
          { id: 'bk-au-ok', title: 'Tour Rp->NOK', amt: 1000000, fx: false, ax: 600, au: 'nok', ak: 1550 },
          { id: 'bk-au-bad', title: 'Tour Rp->BAD', amt: 1000000, fx: false, ax: 600, au: 'EUR', ak: 17000 },
        ],
      },
    },
  });
  const np = normAu.pr['p-au-norm'];
  assert.strictEqual(np.it[0].au, 'JPY', 'P3 normKas: au lowercase dinormalisasi menjadi uppercase JPY');
  assert.strictEqual(np.it[0].ak, 105, 'P3 normKas: ak dipertahankan saat au valid walau item !fx');
  assert.strictEqual(np.it[1].au, 'NOK', 'P3 normKas: au dari fxs[] dipertahankan');
  assert.strictEqual(np.it[2].au, undefined, 'P3 normKas: au ZZZ tidak valid dibuang');
  assert.strictEqual(np.it[2].ax, undefined, 'P3 normKas: ax ikut dibuang bila au ZZZ tidak valid (jangan jadi Rupiah!)');
  assert.strictEqual(np.it[2].ak, undefined, 'P3 normKas: ak ikut dibuang bila au ZZZ tidak valid');
  assert.strictEqual(np.it[3].ax, undefined, 'P3 normKas: ax ikut dibuang bila au 2 huruf');
  assert.strictEqual(np.it[4].ax, undefined, 'P3 normKas: ax ikut dibuang bila au tipe number');
  assert.strictEqual(np.it[5].au, undefined, 'P3 normKas: au tanpa ax dibuang');
  assert.strictEqual(np.it[5].ak, undefined, 'P3 normKas: ak tanpa ax dibuang');
  assert.strictEqual(np.bk[0].au, 'NOK', 'P3 normKas bk: au valid dipertahankan');
  assert.strictEqual(np.bk[0].ak, 1550, 'P3 normKas bk: ak valid dipertahankan');
  assert.strictEqual(np.bk[1].ax, undefined, 'P3 normKas bk: ax+au+ak dibuang bila kode au tidak ada di perjalanan');

  // tripCountCurUsage & tripCountAllExtraCurUsage memperhitungkan au
  const usageNok = w.tripCountCurUsage(np, 'NOK');
  assert.strictEqual(usageNok.total, 2, 'P3 tripCountCurUsage: menghitung pemakaian NOK dari au (1 it + 1 bk)');
  assert.strictEqual(w.tripCountAllExtraCurUsage(np).total, 2, 'P3 tripCountAllExtraCurUsage: menghitung pemakaian mata uang tambahan via au');

  // Fixture angka P3: item Rp 500.000, aktual NOK 250 tanpa ak (kurs NOK = 1.500) -> actualRp 375.000, diff -125.000, efekHarga -125.000, efekKurs 0
  const pFix = {
    id: 'p-12c-calc',
    name: 'Calc P3',
    cur: 'JPY',
    rate: 100,
    fxs: [{ c: 'NOK', r: 1500 }],
    budget: 5000000,
    it: [
      { id: 'c-rp-nok', day: '2026-10-01', place: 'Sewa Sepeda', est: 500000, fx: false, pay: 'cash', ax: 250, au: 'NOK' },
      { id: 'c-jpy', day: '2026-10-02', place: 'Makan Malam', est: 5000, fx: true, pay: 'cash', ax: 6200, ak: 107 },
      { id: 'c-rp-rp', day: '2026-10-03', place: 'Oleh-oleh', est: 300000, fx: false, pay: 'cash', ax: 280000 },
      { id: 'c-no-est', day: '2026-10-03', place: 'Jalan Pagi Gratis', est: 0, fx: false, pay: 'cash' },
    ],
    bk: [],
  };
  assert.strictEqual(w.tripActualRp(pFix, pFix.it[0]), 375000, 'P3 Kasus 1: Rp 500k dibayar NOK 250 @1.500 = Rp 375.000');
  const vpSingleAu = w.tripVsPlan({ cur: 'JPY', rate: 100, fxs: [{ c: 'NOK', r: 1500 }], it: [pFix.it[0]], bk: [] });
  assert.strictEqual(vpSingleAu.diff, -125000, 'P3 Kasus 1: diff = -125.000');
  assert.strictEqual(vpSingleAu.efekHarga, -125000, 'P3 Kasus 1: efekHarga = -125.000');
  assert.strictEqual(vpSingleAu.efekKurs, 0, 'P3 Kasus 1: efekKurs = 0 karena beda mata uang rencana (IDR vs NOK)');
  const itWithAk = Object.assign({}, pFix.it[0], { ak: 1600 });
  assert.strictEqual(w.tripActualRp(pFix, itWithAk), 400000, 'P3 Kasus 1 + ak=1.600 -> Rp 400.000');
  const vpSingleAuAk = w.tripVsPlan({ cur: 'JPY', rate: 100, fxs: [{ c: 'NOK', r: 1500 }], it: [itWithAk], bk: [] });
  assert.strictEqual(vpSingleAuAk.diff, -100000, 'P3 Kasus 1 + ak=1.600 -> diff -100.000');

  // Regresi 12B: JPY 5000 @100 -> 6200 @107 => diff 163.400 = efekHarga 120.000 + efekKurs 43.400
  const vpRegJpy = w.tripVsPlan({ cur: 'JPY', rate: 100, it: [pFix.it[1]], bk: [] });
  assert.strictEqual(vpRegJpy.diff, 163400, 'P3 Regresi JPY: diff = 163.400');
  assert.strictEqual(vpRegJpy.efekHarga, 120000, 'P3 Regresi JPY: efekHarga = 120.000');
  assert.strictEqual(vpRegJpy.efekKurs, 43400, 'P3 Regresi JPY: efekKurs = 43.400');

  // P2 penyebut m & byCur mencakup IDR + asing
  const vpMix = w.tripVsPlan(pFix);
  assert.strictEqual(vpMix.m, 3, 'P2: item est=0 tanpa ax TIDAK dihitung dalam penyebut m (hanya 3 dari 4)');
  assert.strictEqual(vpMix.n, 3, 'P2: n = 3');
  const bIdr = vpMix.byCur.find((b) => b.c === 'IDR');
  const bNok = vpMix.byCur.find((b) => b.c === 'NOK');
  const bJpy = vpMix.byCur.find((b) => b.c === 'JPY');
  assert.ok(bIdr && bNok && bJpy, 'P3 byCur[]: dikelompokkan menurut mata uang AKTUAL (termasuk bucket IDR)');
  assert.strictEqual(bIdr.diff + bNok.diff + bJpy.diff, Math.round(vpMix.diff), 'P3 byCur[]: Σ semua bucket.diff === Math.round(diff)');

  // Properti acak 250 fixture campuran Rp/FX/au/ak/rt/kurs pecahan
  let sRnd = 987654;
  const rnd = () => {
    sRnd = (sRnd * 1664525 + 1013904223) >>> 0;
    return sRnd / 4294967296;
  };
  for (let trial = 0; trial < 250; trial++) {
    const rMain = +(80 + rnd() * 17000).toFixed(2);
    const rNok = +(1200 + rnd() * 600).toFixed(2);
    const Pt = { id: 'pt-' + trial, name: 'Rnd', cur: 'JPY', rate: rMain, fxs: [{ c: 'NOK', r: rNok }], budget: 25000000, it: [], bk: [] };
    for (let j = 0; j < 4; j++) {
      const isFx = rnd() < 0.5;
      const isZeroEst = rnd() < 0.15;
      const it = { id: 'i-' + j, day: '2026-10-01', place: 'P' + j, est: isZeroEst ? 0 : Math.round(100 + rnd() * 50000), fx: isFx, pay: 'cash', cat: 'Makan' };
      if (isFx && rnd() < 0.4) it.rt = +(90 + rnd() * 50).toFixed(2);
      if (rnd() < 0.65) {
        it.ax = Math.round(50 + rnd() * 50000);
        if (!isFx && rnd() < 0.5) {
          it.au = rnd() < 0.5 ? 'JPY' : 'NOK';
          if (rnd() < 0.5) it.ak = +(80 + rnd() * 2000).toFixed(2);
        } else if (isFx && rnd() < 0.5) {
          it.ak = +(80 + rnd() * 2000).toFixed(2);
        }
      }
      Pt.it.push(it);
    }
    const vp = w.tripVsPlan(Pt);
    assert.strictEqual(vp.efekHarga + vp.efekKurs, Math.round(vp.diff), 'P3 Rnd #' + trial + ': efekHarga + efekKurs === round(diff)');
    assert.ok(Math.abs(vp.forecast - (w.tripPlan(Pt).t + vp.diff)) < 1e-6, 'P3 Rnd #' + trial + ': forecast === tripPlan.t + diff');
    if (vp.byCur.length > 0) {
      assert.strictEqual(vp.byCur.reduce((s, b) => s + b.diff, 0), Math.round(vp.diff), 'P3 Rnd #' + trial + ': Σ semua byCur.diff === round(diff)');
    }
  }

  // =========================================================================
  // P2 + P3 UI DESKTOP
  // =========================================================================
  w.setShellMode('browser');
  w.ALL.kas.pr['p-12c-ui'] = {
    id: 'p-12c-ui',
    name: 'Uji P2-P3 Desktop',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-10-01',
    end: '2026-10-05',
    budget: 10000000,
    cur: 'JPY',
    rate: 100,
    fxs: [{ c: 'NOK', r: 1500 }],
    dt: {},
    it: [
      { id: 'u-it-noest', day: '2026-10-01', time: '09:00', time2: '', place: 'Gratis', est: 0, fx: false, pay: 'cash', cat: 'Wisata', link: '', note: '', done: false },
      { id: 'u-it-zero-ax', day: '2026-10-01', time: '10:00', time2: '', place: 'Gratis Ada Ax', est: 0, fx: false, pay: 'cash', cat: 'Wisata', ax: 50000, link: '', note: '', done: false },
      { id: 'u-it-on', day: '2026-10-01', time: '11:00', time2: '', place: 'Online', est: 5000, fx: true, pay: 'on', cat: 'Transport', link: '', note: '', done: false },
      { id: 'u-it-rp', day: '2026-10-01', time: '12:00', time2: '', place: 'Sepeda Rp', est: 500000, fx: false, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
      { id: 'u-it-fx', day: '2026-10-01', time: '18:00', time2: '', place: 'Sushi JPY', est: 5000, fx: true, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'u-bk-zero', title: 'Free Voucher', a: '2026-10-01', b: '2026-10-01', amt: 0, fx: false, cat: 'Lainnya', paid: false, link: '' },
      { id: 'u-bk-rp', title: 'Tur Lokal', a: '2026-10-02', b: '2026-10-02', amt: 500000, fx: false, cat: 'Tiket & Tour', paid: false, link: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setMode('trip');
  w.setTrip('p-12c-ui');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  w.BR_STATE.tripOpenDays = {};
  w.renderTrip();
  const foldAllD = $('br-it-fold-all');
  if (foldAllD && foldAllD.textContent.includes('Buka')) click(foldAllD);

  // P2 checks on Desktop Itinerary
  assert.strictEqual($('trip-root').querySelector('[data-it-row="u-it-noest"] [data-it-act]'), null, 'P2 Desktop Itin: est=0 tanpa ax TIDAK punya tombol Harga Aktual');
  assert.ok($('trip-root').querySelector('[data-it-row="u-it-zero-ax"] [data-it-act="u-it-zero-ax"]'), 'P2 Desktop Itin: est=0 tetapi ada ax TETAP punya tombol Harga Aktual');
  assert.strictEqual($('trip-root').querySelector('[data-it-row="u-it-on"] [data-it-act]'), null, 'P2 Desktop Itin: pay=on tidak punya tombol Harga Aktual');

  // P2 checks on Desktop Booking
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelector('[data-bk-row="u-bk-zero"] [data-bk-act]'), null, 'P2 Desktop Book: amt=0 tanpa ax TIDAK punya tombol Harga Aktual');
  assert.ok($('trip-root').querySelector('[data-bk-row="u-bk-rp"] [data-bk-act="u-bk-rp"]'), 'P2 Desktop Book: amt>0 punya tombol Harga Aktual');

  // P3 Popup Desktop: item Rp -> checkbox default tidak dicentang, dicentang -> [Nominal][Currency][Kurs]
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  click($('trip-root').querySelector('[data-it-act="u-it-rp"]'));
  assert.strictEqual($('act-m-fx-toggle-wrap').hidden, false, 'P3 Desktop Rp: kotak centang Gunakan mata uang asing tampil bila trip punya kurs asing');
  assert.strictEqual($('act-m-use-fx').checked, false, 'P3 Desktop Rp: bawaan TIDAK dicentang');
  assert.strictEqual($('act-m-au-wrap').hidden, true, 'P3 Desktop Rp: dropdown mata uang hidden saat unchecked');
  assert.strictEqual($('act-m-ak-wrap').hidden, true, 'P3 Desktop Rp: kolom kurs hidden saat unchecked');

  // Centang "Gunakan mata uang asing"
  $('act-m-use-fx').checked = true;
  fire($('act-m-use-fx'), 'change');
  assert.strictEqual($('act-m-au-wrap').hidden, false, 'P3 Desktop Rp+FX: dropdown mata uang tampil saat checked');
  assert.strictEqual($('act-m-ak-wrap').hidden, false, 'P3 Desktop Rp+FX: kolom kurs tampil saat checked');
  const auOptsD = [...$('act-m-au').options].map((o) => o.value);
  assert.deepStrictEqual(auOptsD, ['JPY', 'NOK'], 'P3 Desktop Rp+FX: pilihan mata uang = P.cur lalu P.fxs');
  $('act-m-au').value = 'NOK';
  fire($('act-m-au'), 'change');
  assert.ok($('act-m-ak-help').textContent.includes('1 NOK = Rp 1.500'), 'P3 Desktop Rp+FX: teks bantu menampilkan kurs perjalanan NOK');
  fireInput($('act-m-ax'), '250');
  assert.ok($('act-m-prev').textContent.includes('375.000') && $('act-m-prev').textContent.includes('lebih murah Rp 125.000'), 'P3 Desktop live preview: ≈ Rp 375.000 · lebih murah Rp 125.000');

  fire($('trip-actual-form'), 'submit');
  const savedRpAu = w.ALL.kas.pr['p-12c-ui'].it.find((x) => x.id === 'u-it-rp');
  assert.strictEqual(savedRpAu.ax, 250, 'P3 Desktop simpan au: ax = 250');
  assert.strictEqual(savedRpAu.au, 'NOK', 'P3 Desktop simpan au: au = NOK');
  assert.strictEqual(savedRpAu.ak, undefined, 'P3 Desktop simpan au tanpa ak custom: ak tidak ditulis');
  const lineAuD = $('trip-root').querySelector('[data-it-row="u-it-rp"] .trip-item-actual-line').textContent;
  assert.ok(lineAuD.includes('Aktual NOK 250 (≈ Rp 375.000)') && lineAuD.includes('lebih murah Rp 125.000'), 'P3 Desktop kartu: baris Aktual asing format benar: ' + lineAuD);

  // Buka ulang item ber-au -> checkbox otomatis tercentang dan dropdown NOK terpilih
  click($('trip-root').querySelector('[data-it-act="u-it-rp"]'));
  assert.strictEqual($('act-m-use-fx').checked, true, 'P3 Desktop buka ulang item ber-au: checkbox otomatis dicentang');
  assert.strictEqual($('act-m-au').value, 'NOK', 'P3 Desktop buka ulang item ber-au: mata uang NOK terpilih');
  // Matikan centang -> simpan sebagai Rp -> au & ak dibuang
  $('act-m-use-fx').checked = false;
  fire($('act-m-use-fx'), 'change');
  fireInput($('act-m-ax'), '450000');
  fire($('trip-actual-form'), 'submit');
  assert.strictEqual(savedRpAu.ax, 450000, 'P3 Desktop simpan balik ke Rp: ax=450000');
  assert.strictEqual(savedRpAu.au, undefined, 'P3 Desktop simpan balik ke Rp: au dibuang');
  assert.strictEqual(savedRpAu.ak, undefined, 'P3 Desktop simpan balik ke Rp: ak dibuang');

  // Item FX: tidak ada kotak centang & tidak ada dropdown au
  click($('trip-root').querySelector('[data-it-act="u-it-fx"]'));
  assert.strictEqual($('act-m-fx-toggle-wrap').hidden, true, 'P3 Desktop item FX: kotak centang tersembunyi');
  assert.strictEqual($('act-m-au-wrap').hidden, true, 'P3 Desktop item FX: dropdown au tersembunyi');
  assert.strictEqual($('act-m-ak-wrap').hidden, false, 'P3 Desktop item FX: kolom kurs ak tampil');
  click($('act-m-cancel'));

  // Perjalanan tanpa mata uang asing -> kotak centang tersembunyi untuk item Rp
  w.ALL.kas.pr['p-12c-idronly'] = {
    id: 'p-12c-idronly',
    name: 'Lokal Saja',
    cur: '',
    rate: 0,
    it: [{ id: 'lo-1', day: '2026-10-01', place: 'Taman', est: 100000, fx: false, pay: 'cash' }],
    bk: [],
  };
  w.setTrip('p-12c-idronly');
  w.renderTrip();
  click($('trip-root').querySelector('[data-it-act="lo-1"]'));
  assert.strictEqual($('act-m-fx-toggle-wrap').hidden, true, 'P3 Desktop tanpa kurs asing: kotak centang disembunyikan');
  click($('act-m-cancel'));

  delete w.ALL.kas.pr['p-12c-ui'];
  delete w.ALL.kas.pr['p-12c-idronly'];

  // =========================================================================
  // P1 APK: BARIS TOMBOL KARTU 1 BARIS COMPACT (~32px + HIT AREA >= 40px)
  // =========================================================================
  const fs = require('fs');
  const path = require('path');
  const mobCss = fs.readFileSync(path.join(__dirname, '..', '..', 'css', 'mobile.css'), 'utf8');
  const actionsRuleMatch = mobCss.match(/#mobile-app-shell\s+\.trip-item-card\s+\.trip-card-actions\s*\{([^}]+)\}/);
  assert.ok(actionsRuleMatch && /flex-wrap:\s*nowrap/i.test(actionsRuleMatch[1]), 'P1 CSS: .trip-card-actions harus flex-wrap: nowrap (1 baris)');
  const actionsBtnRule = mobCss.match(/#mobile-app-shell\s+\.trip-item-card\s+\.trip-card-actions\s+\.btn\s*\{([^}]+)\}/);
  assert.ok(actionsBtnRule && /height:\s*32px/i.test(actionsBtnRule[1]) && /0\.75rem|12px/i.test(actionsBtnRule[1]), 'P1 CSS: tombol kartu visual ~32px dengan font >= 12px');
  assert.ok(/#mobile-app-shell\s+\.trip-item-card\s+\.trip-card-actions\s+\.btn::before\s*\{[^}]*inset:\s*-4px/i.test(mobCss), 'P1 CSS: area sentuh tombol diperluas min 40px vertikal via ::before');

  w.setShellMode('mobile-app');
  w.ALL.kas.pr['p-12c-p1'] = {
    id: 'p-12c-p1',
    name: 'Uji P1 APK',
    cur: 'JPY',
    rate: 100,
    start: '2026-10-01',
    end: '2026-10-02',
    it: [
      { id: 'p1-it4', day: '2026-10-01', time: '09:00', place: 'Sushi', est: 5000, fx: true, pay: 'cash', cat: 'Makan', ax: 5200 },
      { id: 'p1-it3', day: '2026-10-01', time: '11:00', place: 'Taman', est: 0, fx: false, pay: 'cash', cat: 'Wisata' },
    ],
    bk: [
      { id: 'p1-bk4', title: 'Hotel', a: '2026-10-01', b: '2026-10-02', amt: 10000, fx: true, paid: true, cat: 'Penginapan', ax: 10000 },
      { id: 'p1-bk3', title: 'Voucher 0', a: '2026-10-01', b: '2026-10-01', amt: 0, fx: false, paid: false, cat: 'Lainnya' },
    ],
  };
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = 'p-12c-p1';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  if ($('m-it-fold-all') && $('m-it-fold-all').textContent.includes('Buka')) click($('m-it-fold-all'));
  const delIt4 = $('m-trip-root').querySelector('[data-it-row="p1-it4"] [data-mit-del="p1-it4"]');
  assert.ok(delIt4 && delIt4.getAttribute('aria-label') === 'Hapus' && delIt4.querySelector('svg'), 'P1 APK Itin: tombol Hapus memakai ikon SVG ringkas + aria-label="Hapus"');
  assert.ok(delIt4.querySelector('.sr-only') && delIt4.textContent.trim() === 'Hapus', 'P1 APK Itin: tombol Hapus tetap aksesibel utk pembaca layar');
  const rowIt3Btns = [...$('m-trip-root').querySelectorAll('[data-it-row="p1-it3"] .trip-card-actions button')];
  assert.strictEqual(rowIt3Btns.length, 3, 'P1 APK Itin 3-tombol: hanya 3 tombol tanpa Harga Aktual');
  assert.ok(rowIt3Btns[2].classList.contains('trip-btn-del'), 'P1 APK Itin 3-tombol: Hapus di ujung kanan');

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  const delBk4 = $('m-trip-root').querySelector('[data-bk-row="p1-bk4"] [data-mbk-del="p1-bk4"]');
  assert.ok(delBk4 && delBk4.getAttribute('aria-label') === 'Hapus' && delBk4.querySelector('svg'), 'P1 APK Book: tombol Hapus memakai ikon SVG + aria-label');
  const rowBk3Btns = [...$('m-trip-root').querySelectorAll('[data-bk-row="p1-bk3"] .trip-card-actions button')];
  assert.strictEqual(rowBk3Btns.length, 3, 'P1 APK Book 3-tombol: hanya 3 tombol');
  assert.ok(rowBk3Btns[2].classList.contains('trip-btn-del'), 'P1 APK Book 3-tombol: Hapus di ujung kanan');

  delete w.ALL.kas.pr['p-12c-p1'];
  w.MOB_STATE.tripId = null;

  // =========================================================================
  // P5 + P6: RINGKASAN RINGKAS + DISCLOSURE BERSAMA + rpShort + sw.js v35
  // =========================================================================
  assert.strictEqual(typeof w.rpShort, 'function', 'P5/P6: rpShort harus diekspor');
  assert.strictEqual(w.rpShort(0), 'Rp 0', 'rpShort(0)');
  assert.strictEqual(w.rpShort(950), 'Rp 950', 'rpShort(950)');
  assert.strictEqual(w.rpShort(450000), 'Rp 450 rb', 'rpShort(450000)');
  assert.strictEqual(w.rpShort(1500000), 'Rp 1,5 jt', 'rpShort(1500000)');
  assert.strictEqual(w.rpShort(2000000), 'Rp 2 jt', 'rpShort(2000000)');
  assert.strictEqual(w.rpShort(-1500000), '-Rp 1,5 jt', 'rpShort(-1500000)');
  assert.strictEqual(w.rpShort(2500000000), 'Rp 2,5 M', 'rpShort(2500000000)');

  assert.strictEqual(typeof w.tripDisclosureHtml, 'function', 'P5/P6: komponen tripDisclosureHtml tersedia');

  // SW cache v35
  const swSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert.ok(swMatch && Number(swMatch[1]) >= 35, 'sw.js: CACHE_NAME naik ke rk-cache-v35 (saat ini: ' + (swMatch && swMatch[0]) + ')');

  // CSS tokens & reduced-motion untuk disclosure
  const deskCss = fs.readFileSync(path.join(__dirname, '..', '..', 'css', 'desktop.css'), 'utf8');
  assert.ok(deskCss.includes('.trip-disc-btn') && deskCss.includes('.trip-disc-body'), 'P5/P6 CSS Desktop: styling disclosure tersedia');
  assert.ok(mobCss.includes('.trip-disc-btn') && mobCss.includes('.trip-disc-body'), 'P5/P6 CSS APK: styling disclosure tersedia');

  // Profil uji P5/P6 Desktop
  w.setShellMode('browser');
  w.ALL.kas.pr['p-12c-sum'] = {
    id: 'p-12c-sum',
    name: 'Uji Ringkasan P5-P6 <img src=x>',
    cur: 'JPY',
    rate: 100,
    fxs: [{ c: 'NOK', r: 1500 }],
    budget: 20000000,
    start: '2026-10-01',
    end: '2026-10-04',
    it: [
      { id: 's-i1', day: '2026-10-01', place: 'Sewa Bike <script>', est: 500000, fx: false, pay: 'cash', cat: 'Transport', ax: 250, au: 'NOK' },
      { id: 's-i2', day: '2026-10-02', place: 'Makan Sushi', est: 5000, fx: true, pay: 'cash', cat: 'Makan', ax: 6200, ak: 107 },
    ],
    bk: [
      { id: 's-b1', title: 'Hotel Oslo', a: '2026-10-01', b: '2026-10-04', amt: 5000, fx: true, c: 'NOK', paid: false, cat: 'Penginapan', ax: 5200, ak: 1550 },
    ],
  };
  w.setTrip('p-12c-sum');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.BR_STATE.tripRingDisclosures = {};
  const snapAllBefore = JSON.stringify(w.ALL);
  w.renderTrip();

  // P5 tertutup default pada trip FX
  const totTileD = $('trip-root').querySelector('.grid-4 .metric-tile');
  const totTrigD = totTileD.querySelector('[data-trip-disc]');
  const totBodyD = totTileD.querySelector('.trip-disc-body');
  assert.ok(totTrigD && totBodyD, 'P5 Desktop FX: Total Rencana Biaya memakai disclosure');
  assert.strictEqual(totTrigD.getAttribute('aria-expanded'), 'false', 'P5 Desktop: default tertutup');
  assert.strictEqual(totBodyD.hidden, true, 'P5 Desktop: body rincian hidden default');
  assert.ok(totTileD.querySelector('.trip-tot-brief'), 'P5 Desktop: ringkasan singkat tampil saat tertutup');

  // Buka P5 lalu renderTrip -> state tetap terbuka, ALL tidak berubah
  click(totTrigD);
  assert.strictEqual(totTrigD.getAttribute('aria-expanded'), 'true', 'P5 Desktop: toggle membuka');
  assert.strictEqual(totBodyD.hidden, false, 'P5 Desktop: body rincian terbuka');
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelector('.grid-4 .metric-tile [data-trip-disc]').getAttribute('aria-expanded'), 'true', 'P5 Desktop: status terbuka bertahan setelah renderTrip');
  assert.strictEqual(JSON.stringify(w.ALL), snapAllBefore, 'P5 Desktop: state lipatan TIDAK mengubah ALL / tersimpan ke storage');

  // P5 noRate -> peringatan "Kurs belum diatur" tetap terlihat meski tertutup
  w.ALL.kas.pr['p-12c-norate'] = {
    id: 'p-12c-norate',
    name: 'No Rate',
    cur: 'JPY',
    rate: 0,
    it: [{ id: 'nr1', day: '2026-10-01', place: 'Tes', est: 1000, fx: true, pay: 'cash' }],
    bk: [],
  };
  w.setTrip('p-12c-norate');
  w.renderTrip();
  const nrTileD = $('trip-root').querySelector('.grid-4 .metric-tile');
  const nrVisibleHead = [...nrTileD.children].filter((el) => !el.hidden);
  assert.ok(nrTileD.querySelector('.metric-tile-hint').textContent.includes('Kurs belum diatur') && nrTileD.querySelector('.trip-fx-warn-pill'), 'P5 noRate: peringatan Kurs belum diatur terlihat saat disclosure tertutup');
  assert.strictEqual(nrTileD.querySelector('.trip-disc-body').hidden, true, 'P5 noRate: body rincian tetap tertutup default');

  // P5 Non-FX -> persis sama (tanpa tombol lipat!)
  w.ALL.kas.pr['p-12c-rp'] = {
    id: 'p-12c-rp',
    name: 'Lokal Rp',
    cur: '',
    rate: 0,
    it: [{ id: 'rp1', day: '2026-10-01', place: 'Bakmi', est: 50000, fx: false, pay: 'cash' }],
    bk: [{ id: 'rpb1', title: 'Tiket', amt: 200000, fx: false }],
  };
  w.setTrip('p-12c-rp');
  w.renderTrip();
  const rpTileD = $('trip-root').querySelector('.grid-4 .metric-tile');
  assert.strictEqual(rpTileD.querySelector('[data-trip-disc]'), null, 'P5 Non-FX Desktop: TIDAK ada tombol lipat');
  assert.strictEqual(rpTileD.querySelector('.metric-tile-hint').textContent, 'Pemesanan Rp 200.000 + Harian Rp 50.000', 'P5 Non-FX Desktop: teks tetap persis sama');

  // P6 Desktop: Rencana vs Realita tertutup default + rpShort + buka menampilkan detail
  w.setTrip('p-12c-sum');
  w.renderTrip();
  const vsD = $('trip-root').querySelector('.trip-vs-card');
  const vsTrigD = vsD.querySelector('[data-trip-disc]');
  const vsBodyD = vsD.querySelector('.trip-disc-body');
  assert.ok(vsTrigD && vsBodyD, 'P6 Desktop: Rencana vs Realita memakai disclosure');
  assert.strictEqual(vsTrigD.getAttribute('aria-expanded'), 'false', 'P6 Desktop: default tertutup');
  assert.strictEqual(vsBodyD.hidden, true, 'P6 Desktop: detail hidden default');
  assert.ok(vsD.querySelector('.trip-vs-stats.is-compact'), 'P6 Desktop: ringkasan KPI 3 kolom tampil saat tertutup');
  assert.ok(!vsBodyD.innerHTML.includes('IDR</span>'), 'P6 Desktop: Rincian per mata uang pada kartu tidak menampilkan lencana IDR');
  click(vsTrigD);
  assert.strictEqual(vsTrigD.getAttribute('aria-expanded'), 'true', 'P6 Desktop: toggle membuka Rencana vs Realita');
  assert.strictEqual(vsBodyD.hidden, false, 'P6 Desktop: detail terbuka setelah diklik');
  assert.ok(!vsD.innerHTML.includes('<script>'), 'P6 Desktop XSS: aman dari <script>');

  delete w.ALL.kas.pr['p-12c-sum'];
  delete w.ALL.kas.pr['p-12c-norate'];
  delete w.ALL.kas.pr['p-12c-rp'];
  w.BR_STATE.tripRingDisclosures = {};

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap12c_fix (P1..P6)');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap12c_fix:', e);
  process.exit(1);
});
