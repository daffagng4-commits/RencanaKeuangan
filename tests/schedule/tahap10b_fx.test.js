// Verifikasi Tahap 10B: Bagian B1 (kurs per item di Ubah untuk Pemesanan & Itinerary) + Bagian B2 (beberapa mata uang opsional).
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  const parseRpText = (txt) => {
    const m = String(txt || '').match(/Rp\s*([\d.]+)/);
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : NaN;
  };

  // =========================================================================
  // BAGIAN B1 — Kurs per item (Pemesanan & Itinerary) di "Ubah"
  // =========================================================================

  // B1.0 Helper bersama harus diekspos dari js/ui/trip.js
  for (const fnName of [
    'tripHasValidRt',
    'tripItemCur',
    'tripCurRate',
    'tripItemRate',
    'tripItRp',
    'tripBkRp',
    'tripMergeItemEdit',
    'tripSyncItemRateField',
  ]) {
    assert.strictEqual(typeof w[fnName], 'function', 'B1: helper ' + fnName + ' harus ada di window');
  }

  // B1.1 normKas round-trip untuk bk[].rt, bk[].ra, it[].rt + tolak nilai berbahaya
  const dangerRt = [NaN, Infinity, -Infinity, -10, 0, '100', 'abc', null, undefined, 2e9, [100], { r: 100 }];
  const normB1 = w.normKas({
    pr: {
      pb1: {
        id: 'pb1',
        name: 'Norm B1',
        cur: 'JPY',
        rate: 100,
        it: [
          { id: 'ni-ok', day: '2026-12-01', place: 'Kereta', est: 1000, fx: true, rt: 112.5 },
          { id: 'ni-notfx', day: '2026-12-01', place: 'Lokal', est: 50000, fx: false, rt: 112.5 },
          ...dangerRt.map((bad, idx) => ({
            id: 'ni-bad-' + idx,
            day: '2026-12-01',
            place: 'Bad ' + idx,
            est: 100,
            fx: true,
            rt: bad,
          })),
        ],
        bk: [
          { id: 'nb-unpaid-rt', title: 'Hotel Manual', amt: 1000, fx: true, paid: false, rt: 120 },
          { id: 'nb-paid-auto', title: 'Tiket Auto', amt: 1000, fx: true, paid: true, rt: 105, ra: true },
          { id: 'nb-paid-man', title: 'Tur Manual', amt: 1000, fx: true, paid: true, rt: 115, ra: '1' },
          { id: 'nb-unpaid-ra', title: 'Hotel Ra Stale', amt: 1000, fx: true, paid: false, rt: 110, ra: true },
          { id: 'nb-notfx', title: 'IDR', amt: 500000, fx: false, paid: true, rt: 100, ra: true },
          ...dangerRt.map((bad, idx) => ({
            id: 'nb-bad-' + idx,
            title: 'Bad ' + idx,
            amt: 100,
            fx: true,
            paid: true,
            rt: bad,
            ra: true,
          })),
        ],
      },
    },
  });
  const nit = normB1.pr.pb1.it;
  assert.strictEqual(nit[0].rt, 112.5, 'B1 normKas: it[].rt valid tetap dipertahankan');
  for (let i = 1; i < nit.length; i++) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(nit[i], 'rt'), false, 'B1 normKas: buang it.rt tidak valid/' + nit[i].id);
  }
  const nbk = normB1.pr.pb1.bk;
  assert.strictEqual(nbk[0].rt, 120, 'B1 normKas: bk[].rt valid dipertahankan meski paid=false');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[0], 'ra'), false, 'B1 normKas: ra tidak diset bila paid=false');
  assert.strictEqual(nbk[1].rt, 105, 'B1 normKas: bk[].rt auto valid dipertahankan');
  assert.strictEqual(nbk[1].ra, true, 'B1 normKas: bk[].ra=true dipertahankan saat paid+rt valid');
  assert.strictEqual(nbk[2].rt, 115, 'B1 normKas: bk[].rt valid tetap');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[2], 'ra'), false, 'B1 normKas: ra bukan boolean true dibuang');
  assert.strictEqual(nbk[3].rt, 110, 'B1 normKas: rt dipertahankan walau unpaid');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[3], 'ra'), false, 'B1 normKas: ra dibuang bila !paid');
  for (let i = 4; i < nbk.length; i++) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[i], 'rt'), false, 'B1 normKas: buang bk.rt tidak valid/' + nbk[i].id);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[i], 'ra'), false, 'B1 normKas: buang bk.ra bila rt tidak valid/' + nbk[i].id);
  }

  // B1.2 Konsumen nilai itinerary & pemesanan (plan, ring, itin, cash, PDF, teks bagikan, HTML cetak, Desktop & APK)
  w.ALL.kas.pr['p-b1-core'] = {
    id: 'p-b1-core',
    name: 'Uji B1 Tokyo',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 10000000,
    cur: 'JPY',
    rate: 100,
    dt: {},
    it: [
      { id: 'b1-i1', day: '2026-12-01', time: '09:00', time2: '', place: 'Shinkansen Cash', est: 2000, fx: true, rt: 130, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
      { id: 'b1-i2', day: '2026-12-01', time: '12:00', time2: '', place: 'Ramen IC', est: 1000, fx: true, pay: 'ic', cat: 'Makan', link: '', note: '', done: false },
      { id: 'b1-i3', day: '2026-12-01', time: '14:00', time2: '', place: 'Online Sudah Masuk Booking', est: 5000, fx: true, rt: 999, pay: 'on', cat: 'Tiket & Tour', link: '', note: '', done: false },
      { id: 'b1-i4', day: '2026-12-02', time: '10:00', time2: '', place: 'Bakmi Jakarta', est: 50000, fx: false, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'b1-b1', title: 'Hotel Belum Lunas Manual', amt: 10000, fx: true, paid: false, rt: 120, cat: 'Penginapan', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
      { id: 'b1-b2', title: 'Tiket Pesawat Lunas Auto', amt: 10000, fx: true, paid: true, rt: 100, ra: true, cat: 'Transport', a: '2026-12-01', b: '2026-12-01', pay: 'on', link: '', rec: '' },
      { id: 'b1-b3', title: 'JR Pass Ikut Kurs', amt: 5000, fx: true, paid: false, cat: 'Transport', a: '2026-12-02', b: '2026-12-02', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pB1 = () => w.ALL.kas.pr['p-b1-core'];

  // Verifikasi nilai awal (rate = 100)
  // bk: 10k*120 (1.2jt) + 10k*100 (1jt) + 5k*100 (500rb) = 2.700.000
  // it non-on: 2k*130 (260rb) + 1k*100 (100rb) + 50rb = 410.000
  // total = 3.110.000
  assert.strictEqual(w.tripItemRate(pB1(), pB1().it[0]), 130, 'B1: tripItemRate memakai rt item itinerary');
  assert.strictEqual(w.tripItRp(pB1(), pB1().it[0]), 260000, 'B1: tripItRp memakai rt=130');
  assert.strictEqual(w.tripBkRp(pB1(), pB1().bk[0]), 1200000, 'B1: tripBkRp pemesanan unpaid memakai rt=120');
  const plB1Init = w.tripPlan(pB1());
  assert.strictEqual(plB1Init.b, 2700000, 'B1: tripPlan.b akurat');
  assert.strictEqual(plB1Init.d, 410000, 'B1: tripPlan.d akurat');
  assert.strictEqual(plB1Init.t, 3110000, 'B1: tripPlan.t akurat');

  // Naikkan kurs perjalanan P.rate -> 150
  // bk: 1.2jt (rt 120) + 1.0jt (rt 100) + 750rb (live 150) = 2.950.000
  // it: 260rb (rt 130) + 150rb (live 150) + 50rb (idr) = 460.000
  // total = 3.410.000
  pB1().rate = 150;
  const plB1_150 = w.tripPlan(pB1());
  assert.strictEqual(w.tripItRp(pB1(), pB1().it[0]), 260000, 'B1: mengubah P.rate tidak mengubah it berkurs khusus');
  assert.strictEqual(w.tripItRp(pB1(), pB1().it[1]), 150000, 'B1: it tanpa rt ikut P.rate baru');
  assert.strictEqual(w.tripBkRp(pB1(), pB1().bk[0]), 1200000, 'B1: mengubah P.rate tidak mengubah bk unpaid berkurs khusus');
  assert.strictEqual(plB1_150.b, 2950000, 'B1: tripPlan.b setelah rate=150');
  assert.strictEqual(plB1_150.d, 460000, 'B1: tripPlan.d setelah rate=150');
  assert.strictEqual(plB1_150.t, 3410000, 'B1: tripPlan.t setelah rate=150');

  // Cek semua fungsi UI & export murni memakai tripItRp/tripBkRp
  const ringB1 = w.tripRing(pB1());
  assert.ok(ringB1.includes('<div class="big">Rp 3.410.000</div>'), 'B1: tripRing total memakai kurs per item');
  assert.ok(ringB1.includes('&asymp; Rp 260.000') || ringB1.includes('≈ Rp 260.000'), 'B1: tripRing Siapkan tunai/kartu memakai kurs per item it[0] (260.000, bukan 300.000)');

  const itinB1 = w.tripItin(pB1());
  assert.ok(itinB1.includes('Estimasi hari ini <b>Rp 410.000</b>'), 'B1: tripItin total hari pertama memakai 260rb + 150rb = Rp 410.000');
  assert.ok(itinB1.includes('kurs 130'), 'B1: tripItin baris menampilkan tanda · kurs 130');

  const pdfB1 = w.tripPdfData(pB1(), true);
  assert.ok(pdfB1.summary.some((r) => r[0] === 'Total Rencana Biaya' && r[1] === 'Rp 3.410.000'), 'B1: tripPdfData total memakai rt item');
  const rawPdfB1 = Buffer.from(w.repPdf(pdfB1)).toString('latin1');
  assert.ok(!rawPdfB1.includes('?'), 'B1: stream PDF bebas ?');

  const txtB1 = w.tripText(pB1(), true);
  assert.ok(txtB1.includes('Total: Rp 3.410.000'), 'B1: tripText memakai rt item');
  assert.ok(txtB1.includes('Asing: Rp 3.360.000 (≈ JPY 28.000)'), 'B1: tripText Asing memakai rt item');

  const printB1 = w.tripPrintHtml(pB1(), true);
  assert.ok(printB1.includes('JPY 2.000'), 'B1: tripPrintHtml merender item itinerary');

  // Render Desktop Ringkasan & Itinerary
  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip('p-b1-core');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const dRingTxt = $('trip-root').textContent;
  assert.ok(dRingTxt.includes('Rp 3.410.000'), 'B1 Desktop Ring: total Rp 3.410.000');
  assert.ok(dRingTxt.includes('≈ Rp 260.000'), 'B1 Desktop Cash: Cash · Transport pakai kurs 130 -> Rp 260.000');
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  assert.ok($('trip-root').textContent.includes('Estimasi: Rp 410.000'), 'B1 Desktop Itin: badge Estimasi hari 1 = Rp 410.000');
  const itRow0Hint = $('trip-root').querySelector('[data-it-row="b1-i1"] .trip-eq-hint');
  assert.ok(itRow0Hint && itRow0Hint.textContent === '≈ Rp 260.000 · kurs 130' && itRow0Hint.classList.contains('pv'), 'B1 Desktop Itin: penanda baris it = ≈ Rp 260.000 · kurs 130 + pv');

  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  const bkRow0Hint = $('trip-root').querySelector('[data-bk-row="b1-b1"] .trip-eq-hint');
  const bkRow1Hint = $('trip-root').querySelector('[data-bk-row="b1-b2"] .trip-eq-hint');
  const bkRow2Hint = $('trip-root').querySelector('[data-bk-row="b1-b3"] .trip-eq-hint');
  assert.strictEqual(bkRow0Hint && bkRow0Hint.textContent, '≈ Rp 1.200.000 · kurs 120', 'B1 Desktop Book: belum lunas ber-rt manual -> · kurs 120');
  assert.strictEqual(bkRow1Hint && bkRow1Hint.textContent, '≈ Rp 1.000.000 · kurs terkunci 100', 'B1 Desktop Book: lunas ber-rt -> · kurs terkunci 100');
  assert.strictEqual(bkRow2Hint && bkRow2Hint.textContent, '≈ Rp 750.000', 'B1 Desktop Book: tanpa rt -> tampilan Tahap 8');

  // Render APK Ringkasan & Itinerary & Booking parity
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-b1-core';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mRingTxt = $('m-trip-root').textContent;
  assert.ok(mRingTxt.includes('Rp 3.410.000'), 'B1 APK Ring: total sama Rp 3.410.000');
  assert.ok(mRingTxt.includes('≈ Rp 260.000'), 'B1 APK Cash: Cash · Transport pakai kurs 130 -> Rp 260.000');
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  assert.ok($('m-trip-root').textContent.includes('Estimasi: Rp 410.000'), 'B1 APK Itin: badge Estimasi hari 1 = Rp 410.000');
  assert.strictEqual($('m-trip-root').querySelector('[data-it-row="b1-i1"] .trip-eq-hint').textContent, '≈ Rp 260.000 · kurs 130', 'B1 APK Itin: penanda baris it = ≈ Rp 260.000 · kurs 130');
  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  assert.strictEqual($('m-trip-root').querySelector('[data-bk-row="b1-b1"] .trip-eq-hint').textContent, '≈ Rp 1.200.000 · kurs 120', 'B1 APK Book: unpaid ber-rt manual -> · kurs 120');
  assert.strictEqual($('m-trip-root').querySelector('[data-bk-row="b1-b2"] .trip-eq-hint').textContent, '≈ Rp 1.000.000 · kurs terkunci 100', 'B1 APK Book: lunas ber-rt -> · kurs terkunci 100');

  // B1.3 Field "Kurs" hanya di form Ubah (bukan form Tambah), tanpa syarat lunas (Desktop & APK)
  w.setShellMode('browser');
  w.BR_STATE.tripEditItId = null;
  w.BR_STATE.tripEditBkId = null;
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  $('it-cur').value = 'fx';
  fire($('it-cur'), 'change');
  assert.strictEqual($('it-rt-wrap').style.display, 'none', 'B1 Desktop Form Tambah Itinerary: #it-rt-wrap tersembunyi');
  click($('trip-root').querySelector('[data-trip-it-edit="b1-i2"]'));
  assert.ok($('it-rt-wrap') && $('it-rt-wrap').style.display !== 'none', 'B1 Desktop Form Ubah Itinerary: #it-rt-wrap tampil untuk fx');
  assert.ok($('it-rt').placeholder.includes('150'), 'B1 Desktop: placeholder #it-rt memuat kurs berlaku saat ini (150)');
  $('it-rt').value = '140,5';
  fire($('it-rt'), 'input');
  assert.strictEqual($('it-est-eq').textContent, '≈ Rp 140.500 · kurs 140,5', 'B1 Desktop: pratinjau it live ikut koma desimal 140,5');
  assert.ok($('it-est-eq').classList.contains('pv'), 'B1 Desktop: pratinjau it membawa kelas .pv');
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual(pB1().it[1].rt, 140.5, 'B1 Desktop: submit Ubah Itinerary menyimpan it.rt = 140.5');

  // Ubah Pemesanan belum lunas di Desktop (edit b1-b3)
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  $('bk-cur').value = 'fx';
  fire($('bk-cur'), 'change');
  assert.strictEqual($('bk-rt-wrap').style.display, 'none', 'B1 Desktop Form Tambah Pemesanan: #bk-rt-wrap tersembunyi');
  click($('trip-root').querySelector('[data-bk-edit="b1-b3"]'));
  assert.ok($('bk-rt-wrap') && $('bk-rt-wrap').style.display !== 'none', 'B1 Desktop Form Ubah Pemesanan unpaid: #bk-rt-wrap TAMPIL tanpa syarat lunas');
  assert.ok($('bk-rt').placeholder.includes('150'), 'B1 Desktop: placeholder #bk-rt memuat kurs 150');
  $('bk-rt').value = '125';
  fire($('bk-rt'), 'input');
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 625.000 · kurs 125', 'B1 Desktop: pratinjau unpaid bk memakai · kurs 125');
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pB1().bk[2].rt, 125, 'B1 Desktop: submit menyimpan bk.rt manual = 125 pada paid=false');
  assert.strictEqual(pB1().bk[2].ra, undefined, 'B1 Desktop: kurs manual di Ubah tidak menyetel ra');

  // Ganti mata uang tanpa mengedit Kurs pada form Ubah membuang nilai rt lama; jika sudah diedit dipertahankan
  click($('trip-root').querySelector('[data-bk-edit="b1-b3"]'));
  assert.strictEqual($('bk-rt').value, '125', 'B1 Desktop: membuka Ubah mengisi #bk-rt = 125');
  $('bk-cur').value = 'idr';
  fire($('bk-cur'), 'change');
  assert.strictEqual($('bk-rt').value, '', 'B1 Desktop: ganti mata uang tanpa edit Kurs mengosongkan rt lama');
  click($('trip-root').querySelector('[data-bk-cancel="1"]'));

  // Form Ubah Itinerary & Pemesanan di APK
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripEditIt = null;
  w.MOB_STATE.tripEditBk = null;
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  $('m-it-cur').value = 'fx';
  fire($('m-it-cur'), 'change');
  assert.strictEqual($('m-it-rt-wrap').style.display, 'none', 'B1 APK Form Tambah Itinerary: #m-it-rt-wrap tersembunyi');
  click($('m-trip-root').querySelector('[data-mit-edit="b1-i1"]'));
  assert.ok($('m-it-rt-wrap') && $('m-it-rt-wrap').style.display !== 'none', 'B1 APK Form Ubah Itinerary: #m-it-rt-wrap tampil');
  $('m-it-rt').value = '135';
  fire($('m-it-rt'), 'input');
  assert.strictEqual($('m-it-est-eq').textContent, '≈ Rp 270.000 · kurs 135', 'B1 APK: pratinjau it live ikut 135');
  fire($('m-trip-itin-form'), 'submit');
  assert.strictEqual(pB1().it[0].rt, 135, 'B1 APK: submit menyimpan m-it-rt = 135');

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  $('m-bk-cur').value = 'fx';
  fire($('m-bk-cur'), 'change');
  assert.strictEqual($('m-bk-rt-wrap').style.display, 'none', 'B1 APK Form Tambah Pemesanan: #m-bk-rt-wrap tersembunyi');
  click($('m-trip-root').querySelector('[data-mbk-edit="b1-b3"]'));
  assert.ok($('m-bk-rt-wrap') && $('m-bk-rt-wrap').style.display !== 'none', 'B1 APK Form Ubah Pemesanan unpaid: #m-bk-rt-wrap TAMPIL');
  click($('m-bk-cancel'));

  // B1.4 Lunas vs batal lunas pada kurs manual vs otomatis (bk[].ra)
  const trPaid = {
    id: 'p-b1-paid',
    name: 'Paid RA',
    cur: 'JPY',
    rate: 150,
    it: [],
    bk: [
      { id: 'pm-auto', title: 'Tanpa rt awal', amt: 1000, fx: true, paid: false, cat: 'Hotel' },
      { id: 'pm-man', title: 'Punya rt manual', amt: 1000, fx: true, paid: false, rt: 120, cat: 'Hotel' },
    ],
    lk: [],
    ck: [],
    dt: {},
  };
  const msgAutoOn = w.tripToggleBkPaid(trPaid, trPaid.bk[0]);
  assert.strictEqual(trPaid.bk[0].paid, true);
  assert.strictEqual(trPaid.bk[0].rt, 150, 'B1 Paid: item tanpa rt mengunci ke P.rate=150');
  assert.strictEqual(trPaid.bk[0].ra, true, 'B1 Paid: kunci otomatis menandai ra=true');
  assert.ok(msgAutoOn.includes('150'), 'B1 Paid: toast menyebut 150');
  w.tripToggleBkPaid(trPaid, trPaid.bk[0]);
  assert.strictEqual(trPaid.bk[0].rt, undefined, 'B1 Untoggle: kunci otomatis ra=true menghapus rt');
  assert.strictEqual(trPaid.bk[0].ra, undefined, 'B1 Untoggle: ra dibersihkan');

  const msgManOn = w.tripToggleBkPaid(trPaid, trPaid.bk[1]);
  assert.strictEqual(trPaid.bk[1].paid, true);
  assert.strictEqual(trPaid.bk[1].rt, 120, 'B1 Paid: item ber-rt manual TIDAK ditimpa P.rate');
  assert.strictEqual(trPaid.bk[1].ra, undefined, 'B1 Paid: item ber-rt manual TIDAK diset ra');
  assert.ok(msgManOn.includes('120'), 'B1 Paid: toast menyebut kurs manual 120');
  w.tripToggleBkPaid(trPaid, trPaid.bk[1]);
  assert.strictEqual(trPaid.bk[1].rt, 120, 'B1 Untoggle: rt manual TETAP dipertahankan saat batal lunas');

  // B1.5 tripFxSplit / noRate menghormati it.rt dan unpaid bk.rt
  const trZeroB1 = {
    id: 'p-b1-zr',
    name: 'Zero Rate All Custom',
    cur: 'JPY',
    rate: 0,
    it: [{ id: 'zi1', day: '2026-12-01', place: 'Kereta', est: 1000, fx: true, rt: 140, pay: 'cash', cat: 'Transport' }],
    bk: [{ id: 'zb1', title: 'Hotel', amt: 2000, fx: true, paid: false, rt: 130, cat: 'Penginapan' }],
    lk: [],
    ck: [],
    dt: {},
  };
  const spZrB1 = w.tripFxSplit(trZeroB1);
  assert.strictEqual(spZrB1.noRate, false, 'B1 tripFxSplit: item unpaid & itinerary dengan rt dianggap berkurs (noRate=false)');
  assert.strictEqual(spZrB1.fxIdr, 400000, 'B1 tripFxSplit: fxIdr = 1000*140 + 2000*130 = 400.000');

  // =========================================================================
  // BAGIAN B2 — Beberapa mata uang dalam satu perjalanan (OPSIONAL)
  // =========================================================================

  // B2.0 Helper B2 harus tersedia di window
  for (const fnName of [
    'tripMultiCurOn',
    'tripAllCurList',
    'tripCountCurUsage',
    'tripCountAllExtraCurUsage',
    'tripFormatCurUsageMsg',
    'tripCurSelectOptsHtml',
    'tripFxDetailCardHtml',
    'tripCashRowHtml',
  ]) {
    assert.strictEqual(typeof w[fnName], 'function', 'B2: helper ' + fnName + ' harus ada di window');
  }

  // B2.1 normKas untuk fxs[] dan x.c (round-trip, max 6, unik, != cur, nilai berbahaya dibuang)
  const normB2 = w.normKas({
    pr: {
      pnofxs: { id: 'pnofxs', name: 'Satu Kurs', cur: 'JPY', rate: 100, bk: [], it: [{ id: 'i0', day: '2026-12-01', place: 'T', est: 10, fx: true, c: 'NOK' }] },
      pmulti: {
        id: 'pmulti',
        name: 'Multi Euro',
        cur: 'JPY',
        rate: 100,
        fxs: [
          { c: 'nok', r: 1500 },
          { c: 'JPY', r: 999 }, // sama dgn cur -> dibuang
          { c: 'NOK', r: 1600 }, // duplikat -> dibuang
          { c: 'IDR', r: 1 }, // IDR -> dibuang
          { c: 'AB', r: 100 }, // bukan 3 huruf -> dibuang
          { c: 'SEK', r: -5 }, // negatif -> r menjadi 0
          { c: 'DKK', r: 2300.5 },
          { c: 'EUR', r: 'bad' }, // string -> r menjadi 0
          { c: 'GBP', r: 2e9 }, // >1e9 -> r menjadi 0
          { c: 'USD', r: Infinity }, // Inf -> r menjadi 0
          { c: 'SGD', r: 12000 },
          { c: 'MYR', r: 3500 }, // ke-7 -> dibuang (maks 6 tambahan)
        ],
        it: [
          { id: 'mi1', day: '2026-12-01', place: 'Oslo Bus', est: 100, fx: true, c: 'nok' },
          { id: 'mi2', day: '2026-12-01', place: 'Unknown Cur', est: 100, fx: true, c: 'MYR' },
          { id: 'mi3', day: '2026-12-01', place: 'Rupiah', est: 50000, fx: false, c: 'NOK' },
        ],
        bk: [
          { id: 'mb1', title: 'Hotel Oslo', amt: 1000, fx: true, c: 'NOK', paid: false },
          { id: 'mb2', title: 'Ferry', amt: 500, fx: true, c: 'ZZZ', paid: false },
        ],
      },
    },
  });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normB2.pr.pnofxs, 'fxs'), false, 'B2 normKas: fxs tetap tidak ada bila saklar mati');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normB2.pr.pnofxs.it[0], 'c'), false, 'B2 normKas: c dibuang bila saklar mati');
  const pm = normB2.pr.pmulti;
  assert.ok(Array.isArray(pm.fxs), 'B2 normKas: fxs array dipertahankan');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(pm.fxs)),
    [
      { c: 'NOK', r: 1500 },
      { c: 'SEK', r: 0 },
      { c: 'DKK', r: 2300.5 },
      { c: 'EUR', r: 0 },
      { c: 'GBP', r: 0 },
      { c: 'USD', r: 0 },
    ],
    'B2 normKas: fxs disanitasi (unik, != cur/IDR, max 6, r berbahaya -> 0)',
  );
  assert.strictEqual(pm.it[0].c, 'NOK', 'B2 normKas: it.c valid dipertahankan & huruf besar');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(pm.it[1], 'c'), false, 'B2 normKas: it.c tak dikenal/melebihi 6 dibuang');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(pm.it[2], 'c'), false, 'B2 normKas: it.c dibuang bila !fx');
  assert.strictEqual(pm.bk[0].c, 'NOK', 'B2 normKas: bk.c valid dipertahankan');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(pm.bk[1], 'c'), false, 'B2 normKas: bk.c tak ada di fxs dibuang');

  // B2.2 Saklar mati = output identik dengan Tahap 8/9 (tile, PDF byte, teks bagikan, dropdown)
  const pSnapOff = {
    id: 'p-b2-off',
    name: 'Tokyo Switch Off',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 0,
    cur: 'JPY',
    rate: 100,
    dt: {},
    it: [{ id: 'o-i1', day: '2026-12-01', time: '09:00', time2: '', place: 'Kereta', est: 1000, fx: true, pay: 'cash', cat: 'Transport', link: '', note: '', done: false }],
    bk: [
      { id: 'o-b1', title: 'Hotel', amt: 10000, fx: true, paid: false, cat: 'Penginapan', a: '', b: '', pay: 'on', link: '', rec: '' },
      { id: 'o-b2', title: 'Visa', amt: 500000, fx: false, paid: true, cat: 'Persiapan', a: '', b: '', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.ALL.kas.pr['p-b2-off'] = pSnapOff;
  const pdfOff = w.tripPdfData(pSnapOff, true);
  assert.ok(pdfOff.summary.some((r) => r[0] === 'Mata uang asing' && r[1] === 'Rp 1.100.000 (JPY 11.000)'), 'B2 Off: PDF summary tetap format Tahap 8');
  const txtOff = w.tripText(pSnapOff, true);
  assert.ok(txtOff.includes('• Asing: Rp 1.100.000 (≈ JPY 11.000)'), 'B2 Off: tripText tetap format Tahap 8');
  w.setShellMode('browser');
  w.setTrip('p-b2-off');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelector('.trip-fx-detail-card'), null, 'B2 Off: kartu Rincian mata uang TIDAK muncul');
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  assert.deepStrictEqual([...$('it-cur').options].map((o) => o.value), ['idr', 'fx'], 'B2 Off: dropdown hanya Rp dan fx');

  // B2.3 Saklar menyala dengan 2 dan 3 mata uang (JPY + NOK + SEK)
  const pMulti = {
    id: 'p-b2-multi',
    name: 'Nordic Japan Trip',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 50000000,
    cur: 'JPY',
    rate: 100,
    fxs: [
      { c: 'NOK', r: 1500 },
      { c: 'SEK', r: 1400 },
    ],
    dt: {},
    it: [
      { id: 'mu-i1', day: '2026-12-01', time: '09:00', time2: '', place: 'Metro Tokyo', est: 1000, fx: true, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
      { id: 'mu-i2', day: '2026-12-01', time: '12:00', time2: '', place: 'Lunch Oslo', est: 200, fx: true, c: 'NOK', pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
      { id: 'mu-i3', day: '2026-12-01', time: '18:00', time2: '', place: 'Bus Oslo Custom', est: 100, fx: true, c: 'NOK', rt: 1600, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'mu-b1', title: 'Hotel Oslo', amt: 1000, fx: true, c: 'NOK', paid: false, cat: 'Penginapan', a: '', b: '', pay: 'on', link: '', rec: '' },
      { id: 'mu-b2', title: 'Tiket Jakarta', amt: 2000000, fx: false, paid: true, cat: 'Transport', a: '', b: '', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  // Perhitungan: IDR = 2.000.000; JPY = 1000*100 = 100.000; NOK = (200+1000)*1500 + 100*1600 = 1.800.000 + 160.000 = 1.960.000 -> total fx = 2.060.000, total = 4.060.000
  const sp2 = w.tripFxSplit(pMulti);
  assert.strictEqual(sp2.idr, 2000000, 'B2 2 cur terpakai: idr=2.000.000');
  assert.strictEqual(sp2.fxIdr, 2060000, 'B2 2 cur terpakai: fxIdr=2.060.000');
  assert.strictEqual(sp2.by.length, 2, 'B2 2 cur terpakai: sp.by memuat JPY dan NOK');

  w.ALL.kas.pr['p-b2-multi'] = pMulti;
  w.setShellMode('browser');
  w.setTrip('p-b2-multi');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const tileMultiTxt = $('trip-root').querySelector('.grid-4 .metric-tile .metric-tile-hint').textContent;
  assert.ok(tileMultiTxt.includes('Rupiah Rp 2.000.000'), 'B2 Tile 2 cur: memuat Rupiah Rp 2.000.000');
  assert.ok(/Asing Rp 2\.060\.000 \(≈ JPY 1\.000 · NOK 1\.300\)/.test(tileMultiTxt), 'B2 Tile 2 cur: SATU baris (≈ JPY 1.000 · NOK 1.300), didapat: ' + tileMultiTxt);

  const detCard = $('trip-root').querySelector('.trip-fx-detail-card');
  assert.ok(detCard && detCard.textContent.includes('Rincian mata uang'), 'B2 Ringkasan: kartu Rincian mata uang tampil');
  assert.ok(detCard.textContent.includes('NOK') && detCard.textContent.includes('1.300') && detCard.textContent.includes('Rp 1.960.000'), 'B2 Rincian mata uang memuat NOK & ekuivalen Rp');
  assert.ok(detCard.querySelectorAll('.pv').length >= 3, 'B2 Rincian mata uang membawa kelas .pv pada nominal');

  // Cash grouping dengan campuran JPY + NOK dalam Transport
  assert.ok($('trip-root').textContent.includes('JPY 1.000 · NOK 100') || $('trip-root').textContent.includes('NOK 100 · JPY 1.000'), 'B2 Cash: nominal per mata uang untuk Cash · Transport');
  assert.ok($('trip-root').textContent.includes('≈ Rp 260.000'), 'B2 Cash: ekuivalen 1000*100 + 100*1600 = Rp 260.000');

  // Tambah item SEK -> tile menjadi 3 mata uang (tampil +1)
  pMulti.bk.push({ id: 'mu-b3', title: 'Train Stockholm', amt: 500, fx: true, c: 'SEK', paid: false, cat: 'Transport', a: '', b: '', pay: 'on', link: '', rec: '' });
  w.renderTrip();
  const tile3Txt = $('trip-root').querySelector('.grid-4 .metric-tile .metric-tile-hint').textContent;
  assert.ok(/≈ JPY 1\.000 · NOK 1\.300 · \+1/.test(tile3Txt), 'B2 Tile 3 cur: memendek dgn · +1, didapat: ' + tile3Txt);

  // Peringatan per mata uang saat NOK r=0 & ubah kurs NOK tidak mengubah SEK maupun rt=1600
  pMulti.fxs[0].r = 0;
  w.renderTrip();
  assert.ok($('trip-root').textContent.includes('Kurs NOK belum diatur'), 'B2: peringatan spesifik Kurs NOK belum diatur');
  assert.ok(!$('trip-root').textContent.includes('Kurs SEK belum diatur'), 'B2: SEK tetap berkurs, tidak diperingatkan');
  pMulti.fxs[0].r = 1600; // mu-i3 sudah rt=1600, mu-i2=200*1600=320k, mu-b1=1000*1600=1.6m -> NOK 2.08m
  assert.strictEqual(w.tripItRp(pMulti, pMulti.it[2]), 160000, 'B2: item NOK berkurs khusus rt=1600 tetap tidak terpengaruh');
  assert.strictEqual(w.tripItRp(pMulti, pMulti.it[1]), 320000, 'B2: item NOK tanpa rt ikut kurs baru 1600');
  assert.strictEqual(w.tripBkRp(pMulti, pMulti.bk[2]), 700000, 'B2: item SEK tetap 500*1400=700.000');
  pMulti.fxs[0].r = 1500;

  // PDF & tripText multi-cur
  const pdfMulti = w.tripPdfData(pMulti, true);
  assert.ok(pdfMulti.summary.some((r) => r[0] === 'Mata uang asing NOK' && r[1] === 'Rp 1.960.000 (NOK 1.300)'), 'B2 PDF: baris per mata uang NOK tanpa ≈');
  assert.ok(pdfMulti.summary.some((r) => r[0] === 'Mata uang asing SEK' && r[1] === 'Rp 700.000 (SEK 500)'), 'B2 PDF: baris per mata uang SEK tanpa ≈');
  const rawPdfMulti = Buffer.from(w.repPdf(pdfMulti)).toString('latin1');
  assert.ok(!rawPdfMulti.includes('?'), 'B2 PDF: stream bebas karakter ?');
  const txtMulti = w.tripText(pMulti, true);
  assert.ok(txtMulti.includes('• Asing NOK: Rp 1.960.000 (≈ NOK 1.300)'), 'B2 tripText: baris per mata uang NOK');

  // B2.4 Editor Modal Ubah Perjalanan Desktop: saklar, tambah maks 6, blokir hapus/matikan dengan pesan pasti
  click($('br-trip-edit'));
  assert.strictEqual($('kp-multi-cur').checked, true, 'B2 Modal Edit: saklar #kp-multi-cur aktif');
  const firstDelBtn = $('kp-fxs-list').querySelector('[data-fx-del="0"]');
  click(firstDelBtn);
  assert.strictEqual($('kp-fxs-list').querySelectorAll('[data-fx-row]').length, 2, 'B2 Modal: hapus NOK yang terpakai DIBLOKIR');
  // NOK dipakai di 1 booking (mu-b1) + 2 it (mu-i2, mu-i3) = 3 item (1 pemesanan, 2 itinerary)
  assert.strictEqual($('kp-fxs-err').textContent, 'Dipakai 3 item (1 pemesanan, 2 itinerary)', 'B2 Modal: pesan blokir hapus NOK persis');

  // Matikan saklar saat mata uang tambahan masih dipakai -> diblokir dengan total ekstra item (4 item: 2 pemesanan, 2 itinerary)
  $('kp-multi-cur').checked = false;
  fire($('kp-multi-cur'), 'change');
  assert.strictEqual($('kp-multi-cur').checked, true, 'B2 Modal: mematikan saklar saat ekstra terpakai DIBLOKIR');
  assert.strictEqual($('kp-fxs-err').textContent, 'Dipakai 4 item (2 pemesanan, 2 itinerary)', 'B2 Modal: pesan blokir matikan saklar persis');

  // Uji batas maks 6 tambahan
  for (let k = 0; k < 4; k++) click($('kp-fxs-add'));
  assert.strictEqual($('kp-fxs-list').querySelectorAll('[data-fx-row]').length, 6, 'B2 Modal: bisa tambah sampai 6 mata uang tambahan');
  assert.strictEqual($('kp-fxs-add').disabled, true, 'B2 Modal: tombol + Tambah mata uang nonaktif di 6');
  click($('kp-fxs-add'));
  assert.strictEqual($('kp-fxs-list').querySelectorAll('[data-fx-row]').length, 6, 'B2 Modal: tidak pernah melebihi 6 baris');
  click($('kpf-cancel'));

  // B2.5 Paritas Desktop vs APK untuk fixture yang sama
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-b2-multi';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mTileB2Total = parseRpText($('m-trip-root').querySelector('.m-tile-v').textContent);
  const mHasDetailCard = !!$('m-trip-root').querySelector('.trip-fx-detail-card');
  w.setShellMode('browser');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const dTileB2Total = parseRpText($('trip-root').querySelector('.metric-tile-val').textContent);
  assert.strictEqual(mTileB2Total, dTileB2Total, 'B2 Paritas: Total Rencana Biaya APK == Desktop');
  assert.ok(mHasDetailCard, 'B2 Paritas: APK juga menampilkan kartu Rincian mata uang');

  // B2.6 Properti 160 fixture acak deterministik (campuran IDR/utama/tambahan, rt, paid, it.pay:'on', pecahan, kurs kosong)
  let seedB2 = 91024;
  const rndB2 = () => {
    seedB2 = (seedB2 * 1664525 + 1013904223) >>> 0;
    return seedB2 / 4294967296;
  };
  const extraPool = ['NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD'];
  for (let i = 0; i < 160; i++) {
    const mainR = i % 5 === 0 ? 0 : Math.round((75 + rndB2() * 180) * 100) / 100;
    const nExtra = Math.floor(rndB2() * 6);
    const fxsArr = extraPool.slice(0, nExtra).map((c, j) => ({
      c,
      r: (i + j) % 4 === 0 ? 0 : Math.round((500 + rndB2() * 2000) * 100) / 100,
    }));
    const mkFx = () => {
      const fx = rndB2() > 0.3;
      const cIdx = Math.floor(rndB2() * (nExtra + 1)) - 1;
      const c = fx && cIdx >= 0 ? fxsArr[cIdx].c : undefined;
      const rt = fx && rndB2() > 0.65 ? Math.round((50 + rndB2() * 2200) * 100) / 100 : undefined;
      return { fx, c, rt };
    };
    const bksP = Array.from({ length: 4 }, (_, j) => {
      const fSpec = mkFx();
      return Object.assign({ id: 'pb' + j, title: 'B' + j, amt: Math.round((5 + rndB2() * 5000) * 100) / 100, paid: rndB2() > 0.5, cat: 'Transport' }, fSpec);
    });
    const itsP = Array.from({ length: 4 }, (_, j) => {
      const fSpec = mkFx();
      return Object.assign({ id: 'pi' + j, day: '2026-12-01', place: 'I' + j, est: Math.round((5 + rndB2() * 2000) * 100) / 100, pay: j === 0 ? 'on' : 'cash', cat: 'Makan' }, fSpec);
    });
    const pProp = { id: 'p-prop-b2', name: 'PropB2', cur: 'JPY', rate: mainR, fxs: fxsArr, bk: bksP, it: itsP, lk: [], ck: [], dt: {} };
    const plP = w.tripPlan(pProp);
    const spP = w.tripFxSplit(pProp);
    const sumBy = spP.by.reduce((s, b) => s + b.idr, 0);
    assert.strictEqual(sumBy, spP.fxIdr, 'B2 Properti ke-' + i + ': sum(by[].idr) === fxIdr');
    assert.strictEqual(spP.idr + sumBy, Math.round(plP.t), 'B2 Properti ke-' + i + ': idr + sum(by[].idr) === Math.round(tripPlan.t)');
  }

  // B2.7 Impor Excel multi-mata-uang (2 kode, 7 kode, 8 kode ditolak, 1 kode)
  const mkMockWb = (itRows, bkRows) => ({
    SheetNames: ['Itinerary', 'Pemesanan'],
    Sheets: { Itinerary: { rows: itRows }, Pemesanan: { rows: bkRows } },
  });
  // Ganti sementara sheet_to_json pada mock XLSX untuk menguji xlParse secara langsung tanpa butuh file biner eksternal
  const origXlsx = w.XLSX;
  w.XLSX = {
    utils: {
      sheet_to_json: (sh) => sh.rows || [],
    },
  };
  try {
    // Kasus A: 2 kode asing (NOK & SEK)
    const wb2 = mkMockWb(
      [
        ['Tanggal', 'Jam', 'Kegiatan', 'Kategori', 'Biaya', 'Mata uang', 'Pembayaran'],
        ['2026-12-01', '09.00', 'Ferry Oslo', 'Transport', 300, 'NOK', 'Cash'],
        ['2026-12-02', '10.00', 'Vasa Museum', 'Tiket & Tour', 200, 'SEK', 'Cash'],
      ],
      [
        ['Nama', 'Kategori', 'Jumlah', 'Mata uang', 'Pembayaran', 'Lunas'],
        ['Hotel Oslo', 'Penginapan', 1200, 'NOK', 'Online', 'Belum'],
      ],
    );
    const d2 = w.xlParse(wb2);
    assert.strictEqual(d2.cur, 'NOK', 'B2 Excel 2 kode: cur utama = NOK (pertama)');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(d2.extras)), ['SEK'], 'B2 Excel 2 kode: extras = [SEK]');
    assert.strictEqual(d2.it[0].fx, true);
    assert.ok(!d2.it[0].c, 'B2 Excel 2 kode: item NOK ikut cur utama');
    assert.strictEqual(d2.it[1].fx, true);
    assert.strictEqual(d2.it[1].c, 'SEK', 'B2 Excel 2 kode: item kedua ditandai c=SEK');
    const built2 = w.xlBuildProfile(d2, 'Nordic', 'NOK', 1500);
    assert.strictEqual(built2.profile.cur, 'NOK');
    assert.strictEqual(built2.profile.rate, 1500);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(built2.profile.fxs)), [{ c: 'SEK', r: 0 }], 'B2 Excel 2 kode: menyalakan fxs dengan SEK kurs 0');

    // Kasus B: 7 kode asing (1 utama + 6 tambahan -> tepat batas maks, sah)
    const wb7 = mkMockWb(
      [['Tanggal', 'Jam', 'Kegiatan', 'Biaya', 'Mata uang'], ...['JPY', 'NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD'].map((c, idx) => ['2026-12-01', '10.00', 'Act ' + idx, 100, c])],
      [],
    );
    const d7 = w.xlParse(wb7);
    assert.ok(!d7.error, 'B2 Excel 7 kode: tidak error');
    const built7 = w.xlBuildProfile(d7, 'Keliling Dunia', 'JPY', 100);
    assert.strictEqual(built7.profile.fxs.length, 6, 'B2 Excel 7 kode: 1 utama + 6 tambahan = valid');

    // Kasus C: 8 kode asing (> 6 tambahan) -> pesan galat jelas tanpa merusak data
    const prevPrKeys = Object.keys(w.ALL.kas.pr).length;
    const wb8 = mkMockWb(
      [['Tanggal', 'Jam', 'Kegiatan', 'Biaya', 'Mata uang'], ...['JPY', 'NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD', 'SGD'].map((c, idx) => ['2026-12-01', '10.00', 'Act ' + idx, 100, c])],
      [],
    );
    const d8 = w.xlParse(wb8);
    assert.ok(d8.error && /7|maksimal|6/i.test(d8.error), 'B2 Excel 8 kode: mengembalikan pesan galat batas mata uang');
    const v8 = w.xlValidateMeta(d8, 'Terlalu Banyak', 'JPY', 100);
    assert.ok(v8.error, 'B2 Excel 8 kode: xlValidateMeta juga menolak dengan error');
    assert.strictEqual(Object.keys(w.ALL.kas.pr).length, prevPrKeys, 'B2 Excel 8 kode: tidak merusak data profil');

    // Kasus D: 1 kode asing -> saklar tetap mati
    const wb1 = mkMockWb([['Tanggal', 'Jam', 'Kegiatan', 'Biaya', 'Mata uang'], ['2026-12-01', '09.00', 'Ramen', 900, 'JPY']], []);
    const d1 = w.xlParse(wb1);
    const built1 = w.xlBuildProfile(d1, 'Solo Tokyo', 'JPY', 100);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(built1.profile, 'fxs'), false, 'B2 Excel 1 kode: fxs tetap tidak diset (saklar mati)');
  } finally {
    w.XLSX = origXlsx;
  }

  assert.strictEqual(errs.length, 0, 'tidak ada galat JS: ' + errs.join(' | '));
  console.log('OK tahap10b_fx (B1 + B2)');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap10b_fx:', e);
  process.exit(1);
});
