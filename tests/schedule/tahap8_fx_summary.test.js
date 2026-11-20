// Verifikasi Tahap 8: rincian rupiah / mata uang asing / gabungan (Desktop + APK + PDF + Bagikan) & ekuivalen rupiah D1-D4.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;
  const doc = w.document;

  const parseNumFromRp = (txt) => {
    const m = String(txt || '').match(/Rp\s*([\d.]+)/);
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : NaN;
  };

  // --- 0. Pastikan fungsi bersama baru tersedia ---
  assert.strictEqual(typeof w.tripFxSplit, 'function', 'tripFxSplit harus ada di js/ui/trip.js');
  assert.strictEqual(typeof w.tripEqHint, 'function', 'tripEqHint harus ada di js/ui/trip.js');

  // --- 1. Snapshot !hasFx: teks tile, PDF, & teks bagikan identik dengan perilaku sebelumnya ---
  w.ALL.kas.pr['p-t8-nofx'] = {
    id: 'p-t8-nofx',
    name: 'Bandung Santai',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 3000000,
    cur: '',
    rate: 0,
    dt: {},
    it: [
      { id: 'it-nf1', day: '2026-12-01', time: '09:00', time2: '', place: 'Sarapan', est: 300000, fx: false, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'bk-nf1', title: 'Kereta', amt: 1500000, fx: false, paid: true, cat: 'Transport', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pNoFx = w.ALL.kas.pr['p-t8-nofx'];
  const spNoFx = w.tripFxSplit(pNoFx);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(spNoFx)),
    { hasFx: false, idr: 1800000, fxIdr: 0, fxAmt: 0, noRate: false },
    '!hasFx: tripFxSplit mengembalikan hasFx=false',
  );

  // Desktop !hasFx
  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip('p-t8-nofx');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const deskHintNoFx = $('trip-root').querySelector('.metric-tile-hint');
  assert.strictEqual(deskHintNoFx.textContent, 'Pemesanan Rp 1.500.000 + Harian Rp 300.000', '!hasFx: hint desktop persis lama');
  assert.ok(deskHintNoFx.classList.contains('pv'), '!hasFx: kelas pv wadah tetap dipertahankan');
  assert.strictEqual($('trip-root').querySelectorAll('.trip-fx-line').length, 0, '!hasFx: tidak ada baris rincian fx');
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelectorAll('.upcoming-right .trip-eq-hint').length, 0, '!hasFx: tidak ada ekuivalen di daftar itinerary desktop');
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelectorAll('.upcoming-right .trip-eq-hint').length, 0, '!hasFx: tidak ada ekuivalen di daftar pemesanan desktop');

  // APK !hasFx
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-t8-nofx';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mobHintNoFx = $('m-trip-root').querySelector('.m-tile-s');
  assert.strictEqual(mobHintNoFx.textContent, 'Pemesanan Rp 1.500.000 + Harian Rp 300.000', '!hasFx: hint APK persis lama');
  assert.ok(mobHintNoFx.classList.contains('pv'), '!hasFx: kelas pv APK tetap dipertahankan');

  // PDF & tripText !hasFx identik byte-per-byte dengan summary 4 baris baseline
  const pdfNoFx = w.tripPdfData(pNoFx, true);
  assert.strictEqual(pdfNoFx.summary.length, 4, '!hasFx: summary PDF tetap 4 baris');
  const pdfNoFxBaseline = Object.assign({}, pdfNoFx, {
    summary: [
      ['Kegiatan', '1 jadwal'],
      ['Pemesanan', '1 item'],
      ['Total Rencana Biaya', 'Rp 1.800.000'],
      ['Sudah Dibayar', 'Rp 1.500.000'],
    ],
  });
  assert.strictEqual(
    Buffer.compare(Buffer.from(w.repPdf(pdfNoFx)), Buffer.from(w.repPdf(pdfNoFxBaseline))),
    0,
    '!hasFx: byte PDF identik dengan baseline',
  );
  const txtNoFx = w.tripText(pNoFx, true);
  assert.ok(!txtNoFx.includes('*Rencana Biaya*'), '!hasFx: teks bagikan tidak menambah blok *Rencana Biaya*');

  // --- 2. Fixture inti: JPY kurs 100; bk Rp 1.000.000 + JPY 10.000 ---
  w.ALL.kas.pr['p-t8-jpy'] = {
    id: 'p-t8-jpy',
    name: 'Tokyo Inti',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-03',
    budget: 5000000,
    cur: 'JPY',
    rate: 100,
    dt: {},
    it: [
      { id: 'it-j1', day: '2026-12-01', time: '09:00', time2: '', place: 'Shinjuku', est: 0, fx: false, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'bk-j1', title: 'Asuransi & Visa', amt: 1000000, fx: false, paid: true, cat: 'Persiapan', a: '2026-12-01', b: '2026-12-03', pay: 'on', link: '', rec: '' },
      { id: 'bk-j2', title: 'Hotel Shinjuku', amt: 10000, fx: true, paid: false, cat: 'Penginapan', a: '2026-12-01', b: '2026-12-03', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pJpy = w.ALL.kas.pr['p-t8-jpy'];
  const spInti = w.tripFxSplit(pJpy);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(spInti)),
    { hasFx: true, idr: 1000000, fxIdr: 1000000, fxAmt: 10000, noRate: false },
    'Fixture inti: tripFxSplit tepat',
  );
  assert.strictEqual(w.tripEqHint(pJpy, 10000, true), '≈ Rp 1.000.000', 'tripEqHint fx tepat');
  assert.strictEqual(w.tripEqHint(pJpy, 10000, false), '', 'tripEqHint rupiah kosong');
  assert.strictEqual(w.tripEqHint(pJpy, 0, true), '', 'tripEqHint nominal 0 kosong');

  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip('p-t8-jpy');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const deskTile0 = $('trip-root').querySelector('.grid-4 .metric-tile');
  assert.strictEqual(deskTile0.querySelector('.metric-tile-val').textContent, 'Rp 2.000.000', 'Fixture inti desktop: total Rp 2.000.000');
  const deskHint0 = deskTile0.querySelector('.metric-tile-hint').textContent;
  assert.ok(/Rupiah\s+Rp\s*1\.000\.000/.test(deskHint0), 'Fixture inti desktop: memuat Rupiah Rp 1.000.000');
  assert.ok(/Asing\s+Rp\s*1\.000\.000\s*\(≈\s*JPY\s*10\.000\)/.test(deskHint0), 'Fixture inti desktop: memuat Asing Rp 1.000.000 (≈ JPY 10.000)');
  assert.ok(/Pemesanan\s+Rp\s*2\.000\.000\s*\+\s*Harian\s+Rp\s*0/.test(deskHint0), 'Fixture inti desktop: baris lama tetap ada di bawahnya');

  // Privasi .pv pada semua nominal baru di tile
  const pvElsTile = [...deskTile0.querySelectorAll('.metric-tile-hint .pv')];
  assert.ok(pvElsTile.some((el) => /1\.000\.000/.test(el.textContent)), 'pv mencakup nominal Rupiah/Asing');
  assert.ok(pvElsTile.some((el) => /JPY\s*10\.000/.test(el.textContent)), 'pv mencakup nominal asing dalam kurung');

  // Ubah kurs ke 110 via UI Ubah desktop tanpa reload -> ringkasan ter-render ulang otomatis
  click($('br-trip-edit'));
  $('kp-rate').value = '110';
  fire($('trip-meta-form'), 'submit');
  const deskTile110 = $('trip-root').querySelector('.grid-4 .metric-tile');
  assert.strictEqual(deskTile110.querySelector('.metric-tile-val').textContent, 'Rp 2.100.000', 'Ubah kurs 110 desktop: total Rp 2.100.000');
  assert.ok(/Rupiah\s+Rp\s*1\.000\.000/.test(deskTile110.textContent), 'Ubah kurs 110 desktop: Rupiah tetap Rp 1.000.000');
  assert.ok(/Asing\s+Rp\s*1\.100\.000\s*\(≈\s*JPY\s*10\.000\)/.test(deskTile110.textContent), 'Ubah kurs 110 desktop: Asing Rp 1.100.000 dan JPY 10.000 tetap');

  // --- 3. Properti pembulatan kurs pecahan (105.5, 103.33, 157.75) + aturan inklusi ---
  const fracCases = [
    {
      name: 'Kurs 105.5 + campuran bk/it/pay:on/tanpa est',
      cur: 'JPY',
      rate: 105.5,
      bk: [
        { id: 'b1', title: 'Tiket', amt: 1234567, fx: false, paid: false, cat: 'Transport' },
        { id: 'b2', title: 'JR Pass', amt: 3333, fx: true, paid: false, cat: 'Transport' },
      ],
      it: [
        { id: 'i1', day: '2026-12-01', place: 'Ramen', est: 1255, fx: true, pay: 'cash', cat: 'Makan' },
        { id: 'i2', day: '2026-12-01', place: 'Kopi', est: 45123, fx: false, pay: 'cash', cat: 'Makan' },
        { id: 'i3', day: '2026-12-01', place: 'Online Skip', est: 99999, fx: true, pay: 'on', cat: 'Tiket & Tour' },
        { id: 'i4', day: '2026-12-01', place: 'Tanpa Est', est: 0, fx: true, pay: 'cash', cat: 'Lainnya' },
      ],
    },
    {
      name: 'Kurs 103.33 pecahan ganjil',
      cur: 'JPY',
      rate: 103.33,
      bk: [{ id: 'b1', title: 'Hostel', amt: 7777, fx: true, paid: false, cat: 'Penginapan' }],
      it: [
        { id: 'i1', day: '2026-12-01', place: 'Bus', est: 333, fx: true, pay: 'ic', cat: 'Transport' },
        { id: 'i2', day: '2026-12-01', place: 'SimCard', est: 150000, fx: false, pay: 'cash', cat: 'Lainnya' },
      ],
    },
    {
      name: 'Kurs 157.75 dengan 2 fx & 2 idr',
      cur: 'USD',
      rate: 15775.5,
      bk: [
        { id: 'b1', title: 'Visa', amt: 185, fx: true, paid: true, cat: 'Persiapan' },
        { id: 'b2', title: 'Asuransi', amt: 425500, fx: false, paid: true, cat: 'Persiapan' },
      ],
      it: [
        { id: 'i1', day: '2026-12-01', place: 'Makan', est: 47, fx: true, pay: 'cash', cat: 'Makan' },
        { id: 'i2', day: '2026-12-01', place: 'Taxi Online', est: 500, fx: true, pay: 'on', cat: 'Transport' },
      ],
    },
  ];
  for (let idx = 0; idx < fracCases.length; idx++) {
    const fc = fracCases[idx];
    const idFc = 'p-t8-fc-' + idx;
    w.ALL.kas.pr[idFc] = Object.assign({ id: idFc, link: false, saldo: 0, tx: [], start: '2026-12-01', end: '2026-12-02', budget: 0, dt: {}, lk: [], ck: [], note: '', goal: null }, fc);
    const trFc = w.ALL.kas.pr[idFc];
    const plFc = w.tripPlan(trFc);
    const spFc = w.tripFxSplit(trFc);
    assert.strictEqual(spFc.idr + spFc.fxIdr, Math.round(plFc.t), fc.name + ': idr + fxIdr == Math.round(pl.t)');

    w.setShellMode('browser');
    w.setTrip(idFc);
    w.BR_STATE.tripSubTab = 'ring';
    w.renderTrip();
    const dTile = $('trip-root').querySelector('.grid-4 .metric-tile');
    const dBig = parseNumFromRp(dTile.querySelector('.metric-tile-val').textContent);
    const dLines = [...dTile.querySelectorAll('.trip-fx-line')].map((el) => el.textContent);
    assert.strictEqual(parseNumFromRp(dLines[0]) + parseNumFromRp(dLines[1]), dBig, fc.name + ' desktop: jumlah Rupiah + Asing == angka besar');

    w.setShellMode('mobile-app');
    w.MOB_STATE.tripId = idFc;
    w.MOB_STATE.tripSub = 'ring';
    w.renderMobTrip();
    const mTile = $('m-trip-root').querySelector('.m-tile');
    const mBig = parseNumFromRp(mTile.querySelector('.m-tile-v').textContent);
    const mLines = [...mTile.querySelectorAll('.trip-fx-line')].map((el) => el.textContent);
    assert.strictEqual(mBig, dBig, fc.name + ' paritas: angka besar APK == Desktop');
    assert.strictEqual(mLines[0].replace(/\s+/g, ' ').trim(), dLines[0].replace(/\s+/g, ' ').trim(), fc.name + ' paritas: baris Rupiah APK == Desktop');
    assert.strictEqual(mLines[1].replace(/\s+/g, ' ').trim(), dLines[1].replace(/\s+/g, ' ').trim(), fc.name + ' paritas: baris Asing APK == Desktop');
    assert.strictEqual(parseNumFromRp(mLines[0]) + parseNumFromRp(mLines[1]), mBig, fc.name + ' APK: jumlah Rupiah + Asing == angka besar');
  }

  // --- 4. noRate: P.cur terisi tetapi P.rate = 0 -> peringatan tanpa ekuivalen Rp ---
  w.ALL.kas.pr['p-t8-norate'] = {
    id: 'p-t8-norate',
    name: 'Tokyo Tanpa Kurs',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 0,
    cur: 'JPY',
    rate: 0,
    dt: {},
    it: [
      { id: 'it-nr1', day: '2026-12-01', time: '10:00', time2: '', place: 'Museum', est: 1500, fx: true, pay: 'cash', cat: 'Tiket & Tour', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'bk-nr1', title: 'Hotel', amt: 10000, fx: true, paid: false, cat: 'Penginapan', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
      { id: 'bk-nr2', title: 'Visa', amt: 500000, fx: false, paid: true, cat: 'Persiapan', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pNoRate = w.ALL.kas.pr['p-t8-norate'];
  const spNoRate = w.tripFxSplit(pNoRate);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(spNoRate)),
    { hasFx: true, idr: 500000, fxIdr: 0, fxAmt: 11500, noRate: true },
    'noRate: tripFxSplit tepat',
  );
  assert.strictEqual(w.tripEqHint(pNoRate, 10000, true), '', 'noRate: tripEqHint mengembalikan string kosong');

  w.setShellMode('browser');
  w.setTrip('p-t8-norate');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const nrDeskText = $('trip-root').querySelector('.grid-4 .metric-tile .metric-tile-hint').textContent;
  assert.ok(/Asing\s+JPY\s*11\.500\s*·\s*kurs belum diatur/i.test(nrDeskText), 'noRate desktop: tampil Asing JPY 11.500 · kurs belum diatur');
  assert.ok(/Kurs belum diatur:\s*total belum akurat/i.test(nrDeskText), 'noRate desktop: tampil peringatan total belum akurat');
  assert.ok(!nrDeskText.includes('≈ Rp'), 'noRate desktop: tidak menampilkan ekuivalen Rp');

  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelectorAll('.upcoming-right .trip-eq-hint').length, 0, 'noRate desktop itinerary: tidak ada hint ekuivalen Rp');
  // Form preview saat noRate & pilih fx -> Kurs belum diatur
  $('it-cur').value = 'fx';
  fire($('it-cur'), 'change');
  assert.strictEqual($('it-est-eq').textContent, 'Kurs belum diatur', 'D1 noRate: form menampilkan Kurs belum diatur');
  assert.ok(!$('it-est-eq').classList.contains('pv'), 'D1 noRate: teks peringatan tidak perlu pv');

  // --- 5. Form D1 & Daftar D3 pada Desktop (JPY kurs 100) ---
  pJpy.rate = 100;
  pJpy.it = [
    { id: 'it-j1', day: '2026-12-01', time: '09:00', time2: '', place: 'Kereta Bandara', est: 3000, fx: true, pay: 'ic', cat: 'Transport', link: '', note: '', done: false },
    { id: 'it-j2', day: '2026-12-01', time: '12:00', time2: '', place: 'Bakmi Jakarta', est: 75000, fx: false, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
  ];
  w.setShellMode('browser');
  w.setTrip('p-t8-jpy');
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();

  // D3 Itinerary: item fx punya ≈ Rp 300.000 + .pv, item rupiah tidak punya .trip-eq-hint
  const itRowsD = [...$('trip-root').querySelectorAll('.upcoming-item')];
  assert.strictEqual(itRowsD.length, 2, 'D3 itinerary: 2 baris kegiatan');
  assert.ok(itRowsD[0].querySelector('.upcoming-right').textContent.includes('JPY 3.000'), 'D3 itinerary fx: nominal JPY tampil');
  const eqIt0 = itRowsD[0].querySelector('.upcoming-right .trip-eq-hint');
  assert.ok(eqIt0 && eqIt0.textContent === '≈ Rp 300.000' && eqIt0.classList.contains('pv'), 'D3 itinerary fx: ekuivalen ≈ Rp 300.000 + .pv');
  assert.strictEqual(itRowsD[1].querySelector('.upcoming-right .trip-eq-hint'), null, 'D3 itinerary rupiah: tidak ada trip-eq-hint');

  // D1 Form Itinerary: ketik + ganti mata uang + mode edit
  $('it-cur').value = 'fx';
  $('it-est').value = '2500';
  fire($('it-est'), 'input');
  assert.strictEqual($('it-est-eq').textContent, '≈ Rp 250.000', 'D1 itinerary: mengetik memperbarui pratinjau ekuivalen');
  assert.ok($('it-est-eq').classList.contains('pv'), 'D1 itinerary: pratinjau membawa kelas pv');
  $('it-cur').value = 'idr';
  fire($('it-cur'), 'change');
  assert.strictEqual($('it-est-eq').textContent, '', 'D1 itinerary: ganti ke Rp mengosongkan pratinjau');

  click($('trip-root').querySelector('[data-trip-it-edit="it-j1"]'));
  assert.strictEqual($('it-est-eq').textContent, '≈ Rp 300.000', 'D1 itinerary mode edit: pratinjau langsung tampil');
  assert.ok($('it-est-eq').classList.contains('pv'), 'D1 itinerary mode edit: kelas pv ada');
  click($('trip-root').querySelector('[data-it-cancel="1"]'));

  // D3 & D1 Pemesanan Desktop
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  const bkRowsD = [...$('trip-root').querySelectorAll('.upcoming-item')];
  assert.strictEqual(bkRowsD.length, 2, 'D3 pemesanan: 2 baris pemesanan');
  assert.strictEqual(bkRowsD[0].querySelector('.upcoming-right .trip-eq-hint'), null, 'D3 pemesanan rupiah: tidak ada trip-eq-hint');
  const eqBk1 = bkRowsD[1].querySelector('.upcoming-right .trip-eq-hint');
  assert.ok(bkRowsD[1].querySelector('.upcoming-right').textContent.includes('JPY 10.000'), 'D3 pemesanan fx: nominal JPY tampil');
  assert.ok(eqBk1 && eqBk1.textContent === '≈ Rp 1.000.000' && eqBk1.classList.contains('pv'), 'D3 pemesanan fx: ekuivalen ≈ Rp 1.000.000 + .pv');

  $('bk-cur').value = 'fx';
  $('bk-amt').value = '5000';
  fire($('bk-amt'), 'input');
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 500.000', 'D1 pemesanan: mengetik memperbarui pratinjau');
  assert.ok($('bk-amt-eq').classList.contains('pv'), 'D1 pemesanan: pratinjau membawa kelas pv');
  $('bk-cur').value = 'idr';
  fire($('bk-cur'), 'change');
  assert.strictEqual($('bk-amt-eq').textContent, '', 'D1 pemesanan: ganti ke Rp mengosongkan pratinjau');

  click($('trip-root').querySelector('[data-bk-edit="bk-j2"]'));
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 1.000.000', 'D1 pemesanan mode edit: pratinjau langsung tampil');
  click($('trip-root').querySelector('[data-bk-cancel="1"]'));

  // --- 6. Keamanan XSS esc() pada kode mata uang ---
  w.ALL.kas.pr['p-t8-xss'] = {
    id: 'p-t8-xss',
    name: 'Uji XSS',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 0,
    cur: '<img src=x onerror=alert(1)>',
    rate: 100,
    dt: {},
    it: [{ id: 'it-x1', day: '2026-12-01', time: '', time2: '', place: 'Tes', est: 10, fx: true, pay: 'cash', cat: 'Lainnya', link: '', note: '', done: false }],
    bk: [{ id: 'bk-x1', title: 'Tiket', amt: 20, fx: true, paid: false, cat: 'Transport', a: '', b: '', pay: 'on', link: '', rec: '' }],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setShellMode('browser');
  w.setTrip('p-t8-xss');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelectorAll('img').length, 0, 'XSS desktop: kode cur di-escape');
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-t8-xss';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  assert.strictEqual($('m-trip-root').querySelectorAll('img').length, 0, 'XSS APK: kode cur di-escape');

  // --- 7. PDF & Bagikan (C) untuk hasFx && !noRate ---
  pJpy.it = []; // total: idr 1.000.000 + fxIdr 1.000.000 (JPY 10.000)
  const pdfFx = w.tripPdfData(pJpy, true);
  assert.ok(
    pdfFx.summary.some((r) => r[0] === 'Rupiah' && r[1] === 'Rp 1.000.000'),
    'C PDF: summary memuat Rupiah Rp 1.000.000',
  );
  assert.ok(
    pdfFx.summary.some((r) => r[0] === 'Mata uang asing' && r[1] === 'Rp 1.000.000 (JPY 10.000)'),
    'C PDF: summary memuat Mata uang asing Rp 1.000.000 (JPY 10.000) tanpa tanda ≈',
  );
  const rawPdfFx = Buffer.from(w.repPdf(pdfFx)).toString('latin1');
  assert.ok(rawPdfFx.includes('(Rp 1.000.000 \\(JPY 10.000\\)) Tj'), 'C PDF stream: memuat teks rincian asing valid');
  assert.ok(!rawPdfFx.includes('?'), 'C PDF stream: tidak ada karakter ? akibat WinAnsi');

  const pdfFxNoCost = w.tripPdfData(pJpy, false);
  assert.ok(!pdfFxNoCost.summary.some((r) => r[0] === 'Rupiah' || r[0] === 'Mata uang asing'), 'C PDF tanpa biaya: tidak menambah rincian biaya');

  const shareFx = w.tripText(pJpy, true);
  assert.ok(shareFx.includes('Rupiah: Rp 1.000.000'), 'C Bagikan: memuat Rupiah: Rp 1.000.000');
  assert.ok(shareFx.includes('Asing: Rp 1.000.000 (≈ JPY 10.000)'), 'C Bagikan: memuat Asing: Rp 1.000.000 (≈ JPY 10.000)');
  const shareFxNoCost = w.tripText(pJpy, false);
  assert.ok(!shareFxNoCost.includes('*Rencana Biaya*') && !shareFxNoCost.includes('Rupiah:'), 'C Bagikan tanpa biaya: tidak memuat rincian biaya');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap8_fx_summary');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap8_fx_summary:', e);
  process.exit(1);
});
