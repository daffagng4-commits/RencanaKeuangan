// Verifikasi Tahap 12A.1 (Bagian K): pengurai kurs lokal Indonesia, sanitasi dec multi-titik, blur kanonik, & pratinjau "Terbaca" (Desktop + APK).
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
  const fireBlur = (el) => {
    el.dispatchEvent(new w.FocusEvent('blur', { bubbles: false, cancelable: true }));
  };
  const fireBeforeInput = (el, data) => {
    const ev = new w.InputEvent('beforeinput', { bubbles: true, cancelable: true, data, inputType: 'insertText' });
    el.dispatchEvent(ev);
    return ev;
  };

  // =========================================================================
  // 1. Fungsi bersama tripParseRateLocale & tripParseRateVal (tabel uji lengkap)
  // =========================================================================
  assert.strictEqual(typeof w.tripParseRateLocale, 'function', 'K: tripParseRateLocale harus tersedia di window');
  const rateTable = [
    ['16.500', 16500],
    ['1.500', 1500],
    ['1.234.567', 1234567],
    ['16,500', 16.5],
    ['105,5', 105.5],
    ['105.5', 105.5],
    ['0,07', 0.07],
    ['0.07', 0.07],
    ['0.500', 0.5],
    ['1.234,5', 1234.5],
    ['16.500,25', 16500.25],
    ['1500', 1500],
    ['.5', 0.5],
    ['1.5.0', 0],
    ['abc', 0],
    ['', 0],
    ['1000000001', 0],
    ['100', 100],
    ['107', 107],
  ];
  for (const [raw, exp] of rateTable) {
    const gotLoc = w.tripParseRateLocale(raw);
    const gotVal = w.tripParseRateVal(raw);
    if (exp === 0) {
      assert.strictEqual(gotLoc, 0, 'K tripParseRateLocale("' + raw + '") === 0');
      assert.strictEqual(gotVal, 0, 'K tripParseRateVal("' + raw + '") === 0');
    } else {
      assert.ok(Math.abs(gotLoc - exp) < 1e-9, 'K tripParseRateLocale("' + raw + '") = ' + gotLoc + ' (seharusnya ' + exp + ')');
      assert.ok(Math.abs(gotVal - exp) < 1e-9, 'K tripParseRateVal("' + raw + '") = ' + gotVal + ' (seharusnya ' + exp + ')');
    }
  }

  // =========================================================================
  // 2. Sanitasi data-num-only="dec": izinkan multi-titik & 1 koma + beforeinput
  // =========================================================================
  assert.strictEqual(w.sanitizeNumOnlyDecStr('1.234,5'), '1.234,5', 'K dec sanitize: 1.234,5 tetap 1.234,5');
  assert.strictEqual(w.sanitizeNumOnlyDecStr('1.234.567'), '1.234.567', 'K dec sanitize: 1.234.567 tetap 1.234.567');
  assert.strictEqual(w.sanitizeNumOnlyDecStr('16.500,25,99abc'), '16.500,2599', 'K dec sanitize: hanya 1 koma bertahan & huruf dibuang');

  // =========================================================================
  // 3. Pratinjau "Terbaca" (.pv) & blur kanonik — DESKTOP
  // =========================================================================
  w.setShellMode('browser');
  w.ALL.kas.pr['p-12a1-d'] = {
    id: 'p-12a1-d',
    name: 'Norway 12A1 D',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-11-01',
    end: '2026-11-05',
    budget: 25000000,
    cur: 'NOK',
    rate: 1500,
    fxs: [{ c: 'SEK', r: 1400 }],
    dt: {},
    it: [{ id: 'k-i1', day: '2026-11-02', time: '10:00', time2: '', place: 'Fjord', est: 100, fx: true, pay: 'cash', cat: 'Wisata', link: '', note: '', done: false }],
    bk: [{ id: 'k-b1', title: 'Hotel Oslo', a: '2026-11-01', b: '2026-11-05', amt: 1000, fx: true, cat: 'Penginapan', paid: false, link: '' }],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setMode('trip');
  w.setTrip('p-12a1-d');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();

  // 3a. Modal Ubah Perjalanan (#kp-rate & #kp-fxs-list [data-fx-rate])
  click($('br-trip-edit'));
  const kpRate = $('kp-rate');
  kpRate.value = '1.234';
  kpRate.selectionStart = kpRate.selectionEnd = kpRate.value.length;
  assert.strictEqual(fireBeforeInput(kpRate, '.').defaultPrevented, false, 'K Desktop beforeinput: izinkan titik kedua untuk 1.234.567');
  assert.strictEqual(fireBeforeInput(kpRate, ',').defaultPrevented, false, 'K Desktop beforeinput: izinkan koma setelah titik untuk 1.234,5');

  fireInput(kpRate, '16.500');
  const kpRead = $('kp-rate-read');
  assert.ok(kpRead && kpRead.classList.contains('pv'), 'K Desktop #kp-rate-read ada dan memakai kelas pv');
  assert.ok(kpRead.textContent.includes('Terbaca: 1 NOK = Rp 16.500'), 'K Desktop #kp-rate-read menampilkan Terbaca: 1 NOK = Rp 16.500 (actual: ' + kpRead.textContent + ')');
  fireBlur(kpRate);
  assert.strictEqual(kpRate.value, '16500', 'K Desktop #kp-rate blur menulis kanonik 16500');
  assert.ok($('kp-rate-read').textContent.includes('Terbaca: 1 NOK = Rp 16.500'), 'K Desktop #kp-rate-read tetap sama sesudah blur');

  fireInput(kpRate, '105.5');
  fireBlur(kpRate);
  assert.strictEqual(kpRate.value, '105,5', 'K Desktop #kp-rate blur 105.5 -> 105,5 kanonik');

  fireInput(kpRate, '');
  assert.strictEqual($('kp-rate-read').textContent.trim(), '', 'K Desktop #kp-rate kosong -> pratinjau Terbaca kosong');

  fireInput(kpRate, '1.500');
  const fxInpD = $('kp-fxs-list').querySelector('[data-fx-rate="0"]');
  const fxReadD = $('kp-fxs-list').querySelector('[data-fx-read="0"]');
  assert.ok(fxInpD && fxReadD && fxReadD.classList.contains('pv'), 'K Desktop FX readback memakai .pv');
  fireInput(fxInpD, '16.500,25');
  assert.ok(fxReadD.textContent.includes('Terbaca: 1 SEK = Rp 16.500,25'), 'K Desktop FX readback = ' + fxReadD.textContent);
  fireBlur(fxInpD);
  assert.strictEqual(fxInpD.value, '16500,25', 'K Desktop FX blur -> 16500,25');

  fire($('trip-meta-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].rate, 1500, 'K Desktop submit meta: "1.500" tersimpan 1500, bukan 1,5');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].fxs[0].r, 16500.25, 'K Desktop submit meta fxs: "16.500,25" tersimpan 16500.25');

  // 3b. Itinerary Ubah #it-rt + Harga Aktual #act-m-ak
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  click($('trip-root').querySelector('[data-trip-it-edit="k-i1"]'));
  fireInput($('it-rt'), '1.800');
  assert.ok($('it-rt-read') && $('it-rt-read').classList.contains('pv') && $('it-rt-read').textContent.includes('Terbaca: 1 NOK = Rp 1.800'), 'K Desktop #it-rt-read memuat Terbaca 1.800');
  fireBlur($('it-rt'));
  assert.strictEqual($('it-rt').value, '1800', 'K Desktop #it-rt blur -> 1800');
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].it[0].rt, 1800, 'K Desktop #it-rt submit menyimpan 1800');

  click($('trip-root').querySelector('[data-it-act="k-i1"]'));
  fireInput($('act-m-ak'), '1.620');
  assert.ok($('act-m-ak-read') && $('act-m-ak-read').classList.contains('pv') && $('act-m-ak-read').textContent.includes('Terbaca: 1 NOK = Rp 1.620'), 'K Desktop #act-m-ak-read memuat Terbaca 1.620');
  fireInput($('act-m-ax'), '120');
  assert.ok($('act-m-prev').textContent.includes('194.400'), 'K Desktop live preview Harga Aktual mengikuti kurs 1.620 -> Rp 194.400');
  fireBlur($('act-m-ak'));
  assert.strictEqual($('act-m-ak').value, '1620', 'K Desktop #act-m-ak blur -> 1620');
  fire($('trip-actual-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].it[0].ak, 1620, 'K Desktop #act-m-ak submit menyimpan 1620');

  // 3c. Pemesanan Ubah #bk-rt + Excel modal #br-xl-rate
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-edit="k-b1"]'));
  fireInput($('bk-rt'), '1.750');
  assert.ok($('bk-rt-read') && $('bk-rt-read').textContent.includes('Terbaca: 1 NOK = Rp 1.750'), 'K Desktop #bk-rt-read memuat Terbaca 1.750');
  fireBlur($('bk-rt'));
  assert.strictEqual($('bk-rt').value, '1750', 'K Desktop #bk-rt blur -> 1750');
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].bk[0].rt, 1750, 'K Desktop #bk-rt submit menyimpan 1750');

  $('br-xl-cur').value = 'USD';
  fireInput($('br-xl-rate'), '16.500');
  assert.ok($('br-xl-rate-read') && $('br-xl-rate-read').classList.contains('pv') && $('br-xl-rate-read').textContent.includes('Terbaca: 1 USD = Rp 16.500'), 'K Desktop #br-xl-rate-read memuat Terbaca 16.500');
  const xlMetaD = w.xlValidateMeta({ it: [1], bk: [], dt: {}, fx: true }, 'Test XL', 'USD', '16.500');
  assert.strictEqual(xlMetaD.rate, 16500, 'K xlValidateMeta membaca 16.500 -> 16500');

  // =========================================================================
  // 4. Pratinjau "Terbaca" (.pv) & blur kanonik — APK (mobile-app)
  // =========================================================================
  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = 'p-12a1-d';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();

  click($('m-trip-root').querySelector('#m-btn-trip-edit'));
  fireInput($('m-kp-rate'), '1.500');
  assert.ok($('m-kp-rate-read') && $('m-kp-rate-read').classList.contains('pv') && $('m-kp-rate-read').textContent.includes('Terbaca: 1 NOK = Rp 1.500'), 'K APK #m-kp-rate-read memuat Terbaca 1.500');
  const fxReadM = $('m-kp-fxs-list').querySelector('[data-fx-read="0"]');
  assert.ok(fxReadM && fxReadM.textContent.includes('Terbaca: 1 SEK = Rp 16.500,25'), 'K APK FX readback sinkron');
  fireBlur($('m-kp-rate'));
  assert.strictEqual($('m-kp-rate').value, '1500', 'K APK #m-kp-rate blur -> 1500');
  fire($('m-trip-meta-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12a1-d'].rate, 1500, 'K APK submit meta menyimpan 1500');

  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  click($('m-trip-root').querySelector('[data-mit-edit="k-i1"]'));
  fireInput($('m-it-rt'), '1.900');
  assert.ok($('m-it-rt-read') && $('m-it-rt-read').textContent.includes('Terbaca: 1 NOK = Rp 1.900'), 'K APK #m-it-rt-read memuat Terbaca 1.900');
  fireBlur($('m-it-rt'));
  assert.strictEqual($('m-it-rt').value, '1900', 'K APK #m-it-rt blur -> 1900');
  click($('m-trip-root').querySelector('#m-it-cancel'));

  click($('m-trip-root').querySelector('[data-mit-act="k-i1"]'));
  fireInput($('m-act-ak'), '1.700');
  assert.ok($('m-act-ak-read') && $('m-act-ak-read').textContent.includes('Terbaca: 1 NOK = Rp 1.700'), 'K APK #m-act-ak-read memuat Terbaca 1.700');
  fireBlur($('m-act-ak'));
  assert.strictEqual($('m-act-ak').value, '1700', 'K APK #m-act-ak blur -> 1700');
  click($('m-act-cancel'));

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  click($('m-trip-root').querySelector('[data-mbk-edit="k-b1"]'));
  fireInput($('m-bk-rt'), '2.100');
  assert.ok($('m-bk-rt-read') && $('m-bk-rt-read').textContent.includes('Terbaca: 1 NOK = Rp 2.100'), 'K APK #m-bk-rt-read memuat Terbaca 2.100');
  fireBlur($('m-bk-rt'));
  assert.strictEqual($('m-bk-rt').value, '2100', 'K APK #m-bk-rt blur -> 2100');

  $('m-xl-cur').value = 'EUR';
  fireInput($('m-xl-rate'), '17.250');
  assert.ok($('m-xl-rate-read') && $('m-xl-rate-read').textContent.includes('Terbaca: 1 EUR = Rp 17.250'), 'K APK #m-xl-rate-read memuat Terbaca 17.250');

  // =========================================================================
  // 5. Regresi: tripPlan/tripFxSplit data tersimpan & Mode Kas num-input tetap utuh
  // =========================================================================
  const plReg = w.tripPlan(w.ALL.kas.pr['p-12a1-d']);
  assert.strictEqual(Math.round(plReg.t), 100 * 1800 + 1000 * 1750, 'K Regresi: tripPlan memakai angka tersimpan (1800 & 1750)');
  const kasAmt = $('kas-amount');
  fireInput(kasAmt, '250k');
  fireBlur(kasAmt);
  assert.strictEqual(kasAmt.value, '250.000', 'K Regresi: Mode Kas tanpa data-num-only tetap mengonversi 250k -> 250.000');

  delete w.ALL.kas.pr['p-12a1-d'];
  w.MOB_STATE.tripId = null;

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap12a1_rate');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap12a1_rate:', e);
  process.exit(1);
});
