// Verifikasi Tahap 9: kurs terkunci (bk[].rt) untuk pemesanan yang sudah dibayar (Desktop + APK + core + PDF + Bagikan).
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

  // --- 0. Pastikan helper baru Tahap 9 tersedia ---
  assert.strictEqual(typeof w.tripBkHasLock, 'function', 'tripBkHasLock harus diekspos di js/ui/trip.js');
  assert.strictEqual(typeof w.tripBkRp, 'function', 'tripBkRp harus diekspos di js/ui/trip.js');
  assert.strictEqual(typeof w.tripParseRateVal, 'function', 'tripParseRateVal harus diekspos di js/ui/trip.js');
  assert.strictEqual(typeof w.tripToggleBkPaid, 'function', 'tripToggleBkPaid harus diekspos di js/ui/trip.js');
  assert.strictEqual(typeof w.tripMergeBkEdit, 'function', 'tripMergeBkEdit harus diekspos di js/ui/trip.js');

  // --- 1 & 2. Kasus inti + batal lunas di Desktop ---
  w.ALL.kas.pr['p-t9-core'] = {
    id: 'p-t9-core',
    name: 'Tokyo Lock Test',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-03',
    budget: 5000000,
    cur: 'JPY',
    rate: 100,
    dt: {},
    it: [],
    bk: [
      { id: 't9-b1', title: 'Hotel Shinjuku', amt: 10000, fx: true, paid: false, cat: 'Hotel', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
      { id: 't9-b2', title: 'Shinkansen', amt: 10000, fx: true, paid: false, cat: 'Transport', a: '2026-12-02', b: '2026-12-02', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pCore = () => w.ALL.kas.pr['p-t9-core'];

  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip('p-t9-core');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();

  // Ketuk lunas pada pemesanan #1 via tombol UI [data-bk-pay]
  click($('trip-root').querySelector('[data-bk-pay="t9-b1"]'));
  assert.strictEqual(pCore().bk[0].paid, true, '1. ketuk lunas desktop mengubah paid=true');
  assert.strictEqual(pCore().bk[0].rt, 100, '1. ketuk lunas mengunci rt=100');
  assert.ok(!$('tt').hidden && $('ttm').textContent === 'Kurs terkunci: 1 JPY = Rp 100', '1. toast konfirmasi kurs terkunci muncul');

  // Ubah kurs perjalanan ke 110 -> bk1 tetap Rp 1.000.000, bk2 naik ke Rp 1.100.000
  pCore().rate = 110;
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const pl110 = w.tripPlan(pCore());
  assert.strictEqual(pl110.b, 2100000, '1. total pemesanan Rp 2.100.000 setelah kurs naik ke 110');
  assert.strictEqual(pl110.paid, 1000000, '1. paid pemesanan tetap Rp 1.000.000 (rt=100)');
  assert.strictEqual(pl110.t, 2100000, '1. total rencana biaya Rp 2.100.000');

  const sp110 = w.tripFxSplit(pCore());
  assert.strictEqual(sp110.fxIdr, 2100000, '1. tripFxSplit.fxIdr = 2.100.000');
  assert.strictEqual(sp110.fxAmt, 20000, '1. tripFxSplit.fxAmt = JPY 20.000');
  assert.strictEqual(sp110.noRate, false, '1. noRate false');

  // Batal lunas pada bk1 -> rt dihapus, nilai mengikuti kurs 110
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-pay="t9-b1"]'));
  assert.strictEqual(pCore().bk[0].paid, false, '2. batal lunas mengubah paid=false');
  assert.strictEqual(pCore().bk[0].rt, undefined, '2. batal lunas menghapus rt');
  assert.strictEqual(w.tripBkRp(pCore(), pCore().bk[0]), 1100000, '2. nilai kembali ke kurs berjalan 110 (Rp 1.100.000)');

  // Kunci ulang pada rate=100 untuk pengujian form & konsumen
  pCore().rate = 100;
  click($('trip-root').querySelector('[data-bk-pay="t9-b1"]'));
  pCore().rate = 110;
  assert.strictEqual(pCore().bk[0].rt, 100, 're-lock di kurs 100 sebelum uji edit form');

  // --- 3. Edit kurs terkunci pada form Desktop (#trip-book-form) ---
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-edit="t9-b1"]'));
  const rtWrap = $('bk-rt-wrap');
  const rtInp = $('bk-rt');
  assert.ok(rtWrap && rtWrap.style.display !== 'none', '3. #bk-rt-wrap tampil saat edit pemesanan lunas asing');
  assert.strictEqual(rtInp.value, '100', '3. #bk-rt terisi 100 saat edit');
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 1.000.000 · kurs terkunci 100', '3. pratinjau form menampilkan ekuivalen kurs terkunci 100');

  // Ubah rt menjadi 105 -> simpan -> rt=105 & nilai Rp 1.050.000
  rtInp.value = '105';
  fire(rtInp, 'input');
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 1.050.000 · kurs terkunci 105', '3. mengetik 105 langsung memperbarui pratinjau');
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pCore().bk[0].rt, 105, '3. submit form menyimpan rt=105');
  assert.strictEqual(w.tripBkRp(pCore(), pCore().bk[0]), 1050000, '3. nilai bk1 menjadi Rp 1.050.000');

  // Edit judul saja tanpa menyentuh #bk-rt -> rt=105 tetap terjaga
  click($('trip-root').querySelector('[data-bk-edit="t9-b1"]'));
  $('bk-title').value = 'Hotel Shinjuku Deluxe';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pCore().bk[0].title, 'Hotel Shinjuku Deluxe', '3. judul diperbarui');
  assert.strictEqual(pCore().bk[0].rt, 105, '3. edit field lain tetap menjaga rt=105');

  // Kosongkan #bk-rt lalu simpan -> rt dihapus & ikut kurs berjalan 110
  click($('trip-root').querySelector('[data-bk-edit="t9-b1"]'));
  $('bk-rt').value = '';
  fire($('bk-rt'), 'input');
  assert.strictEqual($('bk-amt-eq').textContent, '≈ Rp 1.100.000', '3. mengosongkan #bk-rt menampilkan kurs perjalanan saat ini');
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pCore().bk[0].rt, undefined, '3. submit dengan #bk-rt kosong menghapus rt');
  assert.strictEqual(w.tripBkRp(pCore(), pCore().bk[0]), 1100000, '3. bk1 mengikuti kurs berjalan 110');

  // Isi ulang rt=105, lalu ubah mata uang JPY -> Rp -> rt dihapus
  click($('trip-root').querySelector('[data-bk-edit="t9-b1"]'));
  $('bk-rt').value = '105';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pCore().bk[0].rt, 105, 'rt diisi lagi 105');
  click($('trip-root').querySelector('[data-bk-edit="t9-b1"]'));
  $('bk-cur').value = 'idr';
  fire($('bk-cur'), 'change');
  assert.strictEqual($('bk-rt-wrap').style.display, 'none', '3. ubah mata uang ke Rp menyembunyikan #bk-rt-wrap');
  $('bk-amt').value = '1500000';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pCore().bk[0].fx, false, '3. fx berubah false');
  assert.strictEqual(pCore().bk[0].rt, undefined, '3. ubah ke Rp menghapus rt');

  // Kembalikan bk1 ke kondisi terkunci rt=100, bk2 tidak lunas (kurs berjalan 110) untuk menguji konsumen
  pCore().bk[0] = { id: 't9-b1', title: 'Hotel Shinjuku', amt: 10000, fx: true, paid: true, rt: 100, cat: 'Hotel', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' };
  pCore().rate = 110;

  // Pemesanan belum lunas: #bk-rt-wrap tersembunyi saat edit
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-edit="t9-b2"]'));
  assert.strictEqual($('bk-rt-wrap').style.display, 'none', '3. pemesanan belum lunas tidak menampilkan #bk-rt-wrap');
  click($('trip-root').querySelector('[data-bk-cancel="1"]'));

  // Uji parser koma pada tripParseRateVal
  assert.strictEqual(w.tripParseRateVal('105,5'), 105.5, 'tripParseRateVal menerima desimal koma');
  assert.strictEqual(w.tripParseRateVal('-5'), 0, 'tripParseRateVal menolak negatif');

  // --- 4. Normalisasi normKas ---
  const normOut = w.normKas({
    pr: {
      pnorm: {
        id: 'pnorm',
        name: 'Norm',
        cur: 'JPY',
        rate: 110,
        bk: [
          { id: 'n1', title: 'Valid float', amt: 100, fx: true, paid: true, rt: 105.5 },
          { id: 'n2', title: 'Neg', amt: 100, fx: true, paid: true, rt: -10 },
          { id: 'n3', title: 'Zero', amt: 100, fx: true, paid: true, rt: 0 },
          { id: 'n4', title: 'NaN', amt: 100, fx: true, paid: true, rt: NaN },
          { id: 'n5', title: 'Inf', amt: 100, fx: true, paid: true, rt: Infinity },
          { id: 'n6', title: 'TooBig', amt: 100, fx: true, paid: true, rt: 2e9 },
          { id: 'n7', title: 'StringNum', amt: 100, fx: true, paid: true, rt: '100' },
          { id: 'n8', title: 'StringAlpha', amt: 100, fx: true, paid: true, rt: 'abc' },
          { id: 'n9', title: 'NotFx', amt: 100, fx: false, paid: true, rt: 100 },
          { id: 'n10', title: 'NotPaid', amt: 100, fx: true, paid: false, rt: 100 },
        ],
      },
    },
  });
  const nbk = normOut.pr.pnorm.bk;
  assert.strictEqual(nbk[0].rt, 105.5, '4. normKas mempertahankan rt angka positif valid pada paid+fx');
  for (let i = 1; i < nbk.length; i++) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(nbk[i], 'rt'), false, '4. normKas membuang rt tidak valid / tidak memenuhi syarat: ' + nbk[i].id);
  }

  // --- 5. Semua konsumen nilai pemesanan ---
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  const bkRows = [...$('trip-root').querySelectorAll('.upcoming-item')];
  assert.strictEqual(bkRows[0].querySelector('.trip-eq-hint').textContent, '≈ Rp 1.000.000 · kurs terkunci 100', '5. baris pemesanan terkunci menampilkan keterangan kurs terkunci');
  assert.ok(bkRows[0].querySelector('.trip-eq-hint').classList.contains('pv'), '5. keterangan kurs terkunci membawa kelas .pv');
  assert.strictEqual(bkRows[1].querySelector('.trip-eq-hint').textContent, '≈ Rp 1.100.000', '5. baris belum lunas tetap memakai kurs perjalanan 110 tanpa kata terkunci');

  // Ringkasan desktop & tripBook & tripRing
  const bookHtml = w.tripBook(pCore());
  assert.ok(bookHtml.includes('Total</span><b>Rp 2.100.000</b>'), '5. tripBook menampilkan total Rp 2.100.000');
  assert.ok(bookHtml.includes('Sudah dibayar</span><b>Rp 1.000.000</b>'), '5. tripBook menampilkan sudah dibayar Rp 1.000.000');
  assert.ok(bookHtml.includes('<b>Rp 1.000.000</b>') && bookHtml.includes('<b>Rp 1.100.000</b>'), '5. tripBook kelompok kategori memakai kurs terkunci & berjalan masing-masing');

  const ringHtml = w.tripRing(pCore());
  assert.ok(ringHtml.includes('<div class="big">Rp 2.100.000</div>'), '5. tripRing total memakai kurs terkunci');
  assert.ok(ringHtml.includes('Hotel</span><b>Rp 1.000.000 <span class="sub">48%</span>') && ringHtml.includes('Transport</span><b>Rp 1.100.000 <span class="sub">52%</span>'), '5. tripRing persentase chart kategori memakai 1jt/2.1jt (48%) vs 1.1jt/2.1jt (52%)');

  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const deskRingText = $('trip-root').textContent;
  assert.ok(deskRingText.includes('Rp 1.000.000') && deskRingText.includes('47.6%') && deskRingText.includes('Rp 1.100.000') && deskRingText.includes('52.4%'), '5. chart kategori desktop subtab Ringkasan memakai nilai kurs terkunci');
  w.BR_STATE.tripSubTab = 'book';

  // PDF & repPdf
  const pdfD = w.tripPdfData(pCore(), true);
  assert.ok(pdfD.summary.some((r) => r[0] === 'Total Rencana Biaya' && r[1] === 'Rp 2.100.000'), '5. PDF summary Total Rencana Biaya memakai kurs terkunci');
  assert.ok(pdfD.summary.some((r) => r[0] === 'Sudah Dibayar' && r[1] === 'Rp 1.000.000'), '5. PDF summary Sudah Dibayar memakai kurs terkunci');
  assert.ok(pdfD.summary.some((r) => r[0] === 'Mata uang asing' && r[1] === 'Rp 2.100.000 (JPY 20.000)'), '5. PDF summary Mata uang asing memakai kurs terkunci');
  const rawPdf = Buffer.from(w.repPdf(pdfD)).toString('latin1');
  assert.ok(!rawPdf.includes('?'), '5. PDF stream bebas karakter ?');

  // tripText (Bagikan)
  const shTxt = w.tripText(pCore(), true);
  assert.ok(shTxt.includes('Asing: Rp 2.100.000 (≈ JPY 20.000)'), '5. tripText memakai nilai kurs terkunci');

  // --- 6. Invarian property test (120 fixture acak deterministik termasuk kurs pecahan) ---
  let seed = 4209;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 120; i++) {
    const rate = i % 3 === 0 ? 112.35 : Math.round((80 + rnd() * 200) * 100) / 100;
    const bks = [];
    for (let j = 0; j < 4; j++) {
      const fx = rnd() > 0.35;
      const paid = rnd() > 0.45;
      const lock = fx && paid && rnd() > 0.25;
      bks.push({
        id: 'pb-' + j,
        title: 'Item ' + j,
        amt: Math.round((10 + rnd() * 5000) * 100) / 100,
        fx,
        paid,
        rt: lock ? Math.round((70 + rnd() * 180) * 100) / 100 : undefined,
        cat: 'Transport',
        a: '',
        b: '',
        pay: 'on',
        link: '',
        rec: '',
      });
    }
    const its = [
      { id: 'pi-1', day: '2026-12-01', time: '', time2: '', place: 'Makan', est: Math.round(rnd() * 3000), fx: rnd() > 0.5, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
      { id: 'pi-2', day: '2026-12-01', time: '', time2: '', place: 'Sudah', est: Math.round(rnd() * 3000), fx: true, pay: 'on', cat: 'Tiket', link: '', note: '', done: false },
    ];
    const Ptest = { id: 'p-prop', name: 'Prop', cur: 'JPY', rate, it: its, bk: bks, lk: [], ck: [], dt: {}, start: '2026-12-01', end: '2026-12-02', budget: 0, note: '', goal: null };
    const plT = w.tripPlan(Ptest);
    const spT = w.tripFxSplit(Ptest);
    assert.strictEqual(spT.noRate, false, '6. invarian property test punya kurs > 0 -> noRate false (' + i + ')');
    assert.strictEqual(w.rp(spT.idr + spT.fxIdr), w.rp(Math.round(plT.t)), '6. invarian Rupiah + Asing == total tripPlan ke-' + i);
  }

  // --- 7. Kurs perjalanan kosong/0 + item terkunci ---
  const pZeroRateAllLocked = {
    id: 'p-zr1',
    name: 'Zero All Locked',
    cur: 'JPY',
    rate: 0,
    it: [],
    bk: [
      { id: 'z1', title: 'Hotel', amt: 10000, fx: true, paid: true, rt: 100, cat: 'Hotel' },
      { id: 'z2', title: 'Makan', amt: 500000, fx: false, paid: false, cat: 'Makan' },
    ],
    lk: [],
    ck: [],
    dt: {},
  };
  const spZr1 = w.tripFxSplit(pZeroRateAllLocked);
  assert.strictEqual(spZr1.noRate, false, '7a. kurs=0 tapi semua item asing terkunci -> noRate=false');
  assert.strictEqual(spZr1.fxIdr, 1000000, '7a. fxIdr tetap dihitung penuh dari rt');
  assert.strictEqual(spZr1.idr, 500000, '7a. idr tetap 500.000');

  const pZeroRatePartial = {
    id: 'p-zr2',
    name: 'Zero Partial',
    cur: 'JPY',
    rate: 0,
    it: [],
    bk: [
      { id: 'z1', title: 'Hotel', amt: 10000, fx: true, paid: true, rt: 100, cat: 'Hotel' },
      { id: 'z2', title: 'Belum lunas', amt: 5000, fx: true, paid: false, cat: 'Transport' },
    ],
    lk: [],
    ck: [],
    dt: {},
  };
  const spZr2 = w.tripFxSplit(pZeroRatePartial);
  assert.strictEqual(spZr2.noRate, true, '7b. masih ada item asing tanpa kunci saat kurs=0 -> noRate=true');

  // --- 8. Kompatibilitas mundur: data lama paid:true, fx:true tanpa rt ---
  const pLegacy = {
    id: 'p-leg',
    name: 'Legacy',
    cur: 'JPY',
    rate: 115,
    it: [],
    bk: [{ id: 'lg1', title: 'Lama', amt: 1000, fx: true, paid: true, cat: 'Hotel' }],
    lk: [],
    ck: [],
    dt: {},
  };
  assert.strictEqual(w.tripBkHasLock(pLegacy.bk[0]), false, '8. data lama tanpa rt dianggap belum terkunci');
  assert.strictEqual(w.tripBkRp(pLegacy, pLegacy.bk[0]), 115000, '8. data lama mengikuti kurs berjalan');
  const legHint = w.tripEqHint(pLegacy, pLegacy.bk[0]);
  assert.strictEqual(legHint, '≈ Rp 115.000', '8. data lama tidak menampilkan teks kurs terkunci');

  // --- 9. Snapshot undo & ekspor/impor round-trip mempertahankan rt ---
  pCore().rate = 110;
  const sEntry = w.snap('uji lock');
  const bkIdrt = pCore().bk[0].rt;
  assert.strictEqual(bkIdrt, 100, '9. sebelum hapus, rt=100');
  pCore().bk[0].rt = 999;
  w.restoreSnap(sEntry.t);
  assert.strictEqual(w.ALL.kas.pr['p-t9-core'].bk[0].rt, 100, '9. restoreSnap memulihkan rt=100');
  const jsonClone = JSON.parse(JSON.stringify(w.ALL.kas));
  const reNorm = w.normKas(jsonClone);
  assert.strictEqual(reNorm.pr['p-t9-core'].bk[0].rt, 100, '9. JSON backup + normKas round-trip mempertahankan rt=100');

  // --- 10. Paritas Desktop vs APK (alur dasar) ---
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-t9-core';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mobTileTotal = parseRpText($('m-trip-root').querySelector('.m-tile-v').textContent);
  w.setShellMode('browser');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const deskTileTotal = parseRpText($('trip-root').querySelector('.metric-tile-val').textContent);
  assert.strictEqual(mobTileTotal, deskTileTotal, '10. total Rencana Biaya Desktop & APK identik');
  assert.strictEqual(mobTileTotal, 2100000, '10. nilainya persis Rp 2.100.000');

  // --- 11. Keamanan XSS esc() pada kode mata uang ---
  w.ALL.kas.pr['p-t9-xss'] = {
    id: 'p-t9-xss',
    name: 'XSS Cur',
    cur: '<img src=x onerror=1>',
    rate: 100,
    it: [],
    bk: [{ id: 'x1', title: 'A', amt: 10, fx: true, paid: true, rt: 100, cat: 'Hotel' }],
    lk: [],
    ck: [],
    dt: {},
  };
  w.setShellMode('browser');
  w.setTrip('p-t9-xss');
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-edit="x1"]'));
  assert.strictEqual($('trip-root').querySelectorAll('img').length, 0, '11. label #bk-rt tidak menyuntikkan HTML dari cur');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap9_rate_lock');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap9_rate_lock:', e);
  process.exit(1);
});
