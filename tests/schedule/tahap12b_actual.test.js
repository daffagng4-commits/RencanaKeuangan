// Verifikasi Tahap 12B: Harga Aktual per item, Kartu "Rencana vs Realita", Hapus Sub-tab Realisasi, & Pengaman Versi Sinkronisasi.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  // =========================================================================
  // C1: BAGIAN A — Data ax/ak, normKas, tripActualRp, tripPlannedRp, tripVsPlan
  // =========================================================================

  // 1. normKas whitelist ax/ak + uji nilai berbahaya + P.ac warisan tetap bolak-balik
  const rawKas = {
    pr: {
      'p-12b-c1': {
        id: 'p-12b-c1',
        name: 'Tokyo 12B C1',
        link: false,
        saldo: 0,
        start: '2026-10-01',
        end: '2026-10-10',
        budget: 25000000,
        cur: 'JPY',
        rate: 100,
        fxs: [{ c: 'USD', r: 16000 }],
        it: [
          // Valid fx + ax + ak
          { id: 'it-ok-fx', day: '2026-10-02', time: '18:00', time2: '', place: 'Makan Malam', est: 5000, fx: true, pay: 'cash', cat: 'Makan', ax: 6200, ak: 107 },
          // Item Rp dengan ax valid + ak berbahaya (harus dibuang ak karena bukan fx)
          { id: 'it-ok-rp', day: '2026-10-03', time: '', time2: '', place: 'Oleh-oleh', est: 400000, fx: false, pay: 'cash', cat: 'Belanja', ax: 450000, ak: 120 },
          // Item fx tanpa ax -> ak tidak bermakna dan harus dibuang
          { id: 'it-no-ax', day: '2026-10-04', time: '', time2: '', place: 'Tanpa Aktual', est: 1000, fx: true, pay: 'cash', cat: 'Transport', ak: 115 },
          // Nilai berbahaya pada ax & ak: NaN, Infinity, negatif, 0, string, null, >1e12 / 2e9, array, objek
          { id: 'it-bad-1', day: '2026-10-05', place: 'Bad NaN', est: 1000, fx: true, ax: NaN, ak: Infinity },
          { id: 'it-bad-2', day: '2026-10-05', place: 'Bad Neg Zero', est: 1000, fx: true, ax: -500, ak: 0 },
          { id: 'it-bad-3', day: '2026-10-05', place: 'Bad Over', est: 1000, fx: true, ax: 1e12 + 1, ak: 2e9 },
          { id: 'it-bad-4', day: '2026-10-05', place: 'Bad Types', est: 1000, fx: true, ax: '6200', ak: { x: 1 } },
          { id: 'it-bad-5', day: '2026-10-05', place: 'Bad Arr Null', est: 1000, fx: true, ax: [500], ak: null },
        ],
        bk: [
          { id: 'bk-ok-fx', title: 'Hotel Shinjuku', amt: 20000, fx: true, paid: true, rt: 98, ra: true, cat: 'Penginapan', a: '2026-10-01', b: '2026-10-05', pay: 'on', ax: 21000, ak: 102 },
          { id: 'bk-bad', title: 'Tiket', amt: 500000, fx: false, paid: false, cat: 'Transport', a: '2026-10-01', b: '2026-10-01', ax: -1, ak: 99 },
        ],
        ac: [
          { id: 'ac-leg-1', d: '2026-10-02', amt: 1500, fx: true, cat: 'Makan', note: 'Warisan 11' },
        ],
        lk: [],
        ck: [],
      },
    },
  };
  const nk = w.normKas(rawKas);
  const prC1 = nk.pr['p-12b-c1'];
  assert.strictEqual(prC1.it[0].ax, 6200, 'C1 normKas: it.ax valid dipertahankan');
  assert.strictEqual(prC1.it[0].ak, 107, 'C1 normKas: it.ak valid (fx + ax) dipertahankan');
  assert.strictEqual(prC1.it[1].ax, 450000, 'C1 normKas: it.ax Rp dipertahankan');
  assert.strictEqual(prC1.it[1].ak, undefined, 'C1 normKas: ak pada item Rp dibuang');
  assert.strictEqual(prC1.it[2].ax, undefined, 'C1 normKas: ax tidak ada tetap undefined');
  assert.strictEqual(prC1.it[2].ak, undefined, 'C1 normKas: ak tanpa ax dibuang');
  for (let idx = 3; idx <= 7; idx++) {
    assert.strictEqual(prC1.it[idx].ax, undefined, 'C1 normKas: nilai berbahaya it[' + idx + '].ax dibuang');
    assert.strictEqual(prC1.it[idx].ak, undefined, 'C1 normKas: nilai berbahaya it[' + idx + '].ak dibuang');
  }
  assert.strictEqual(prC1.bk[0].ax, 21000, 'C1 normKas: bk.ax valid dipertahankan');
  assert.strictEqual(prC1.bk[0].ak, 102, 'C1 normKas: bk.ak valid dipertahankan');
  assert.strictEqual(prC1.bk[1].ax, undefined, 'C1 normKas: bk.ax negatif dibuang');
  assert.strictEqual(prC1.bk[1].ak, undefined, 'C1 normKas: bk.ak non-fx dibuang');
  assert.strictEqual(prC1.ac.length, 1, 'C1 normKas: warisan P.ac tetap dipertahankan bolak-balik');
  assert.strictEqual(prC1.ac[0].note, 'Warisan 11', 'C1 normKas: isi warisan P.ac utuh');

  // 2. Kasus nyata #1: Makan malam JPY 5.000 kurs 100 -> aktual JPY 6.200 kurs 107
  const pDinner = {
    id: 'p-din',
    name: 'Makan Malam',
    cur: 'JPY',
    rate: 100,
    budget: 0,
    it: [
      { id: 'd1', day: '2026-10-02', place: 'Wagyu Dinner', est: 5000, fx: true, pay: 'cash', cat: 'Makan', ax: 6200, ak: 107 },
      { id: 'd-on', day: '2026-10-02', place: 'Tur Online', est: 3000, fx: true, pay: 'on', cat: 'Tiket & Tour' },
    ],
    bk: [],
  };
  assert.strictEqual(w.tripActualRp(pDinner, pDinner.it[0]), 663400, 'C1 Kasus 1: actualRp = 663.400');
  assert.strictEqual(w.tripPlannedRp(pDinner, pDinner.it[0]), 500000, 'C1 Kasus 1: plannedRp = 500.000');
  const vpDin = w.tripVsPlan(pDinner);
  assert.strictEqual(vpDin.n, 1, 'C1 Kasus 1: n=1 item ber-ax');
  assert.strictEqual(vpDin.m, 1, 'C1 Kasus 1: m=1 (item pay=on tidak dihitung memenuhi syarat)');
  assert.strictEqual(vpDin.estSum, 500000, 'C1 Kasus 1: estSum = 500.000');
  assert.strictEqual(vpDin.actSum, 663400, 'C1 Kasus 1: actSum = 663.400');
  assert.strictEqual(vpDin.diff, 163400, 'C1 Kasus 1: diff = 163.400');
  assert.strictEqual(vpDin.efekHarga, 120000, 'C1 Kasus 1: efekHarga = 120.000');
  assert.strictEqual(vpDin.efekKurs, 43400, 'C1 Kasus 1: efekKurs = 43.400');
  assert.strictEqual(vpDin.forecast, 663400, 'C1 Kasus 1: forecast = tripPlan.t + diff');

  // 3. Kasus nyata #2: Item Rupiah aktual 450.000 vs estimasi 400.000
  const pIdr = {
    id: 'p-idr',
    name: 'Lokal Bandung',
    cur: '',
    rate: 0,
    budget: 0,
    it: [
      { id: 'r1', day: '2026-10-02', place: 'Hotel Lokal', est: 400000, fx: false, pay: 'cash', cat: 'Penginapan', ax: 450000 },
    ],
    bk: [],
  };
  const vpIdr = w.tripVsPlan(pIdr);
  assert.strictEqual(vpIdr.diff, 50000, 'C1 Kasus 2: diff Rp = 50.000');
  assert.strictEqual(vpIdr.efekHarga, 50000, 'C1 Kasus 2: efekHarga Rp = 50.000');
  assert.strictEqual(vpIdr.efekKurs, 0, 'C1 Kasus 2: efekKurs Rp = 0');

  // 4. Kasus nyata #3: Anggaran 25.000.000, tripPlan.t = 24.788.992, 2 item diff total +1.000.000 -> forecast 25.788.992, overBudgetDiff 788.992
  const pBud = {
    id: 'p-bud',
    name: 'Anggaran 12B',
    cur: '',
    rate: 0,
    budget: 25000000,
    it: [
      { id: 'b-it1', day: '2026-10-02', place: 'Item A', est: 4788992, fx: false, pay: 'cash', cat: 'Makan', ax: 5188992 }, // +400.000
    ],
    bk: [
      { id: 'b-bk1', title: 'Tiket Pesawat', amt: 20000000, fx: false, paid: true, cat: 'Transport', ax: 20600000 }, // +600.000
    ],
  };
  assert.strictEqual(w.tripPlan(pBud).t, 24788992, 'C1 Kasus 3: tripPlan.t = 24.788.992');
  const vpBud = w.tripVsPlan(pBud);
  assert.strictEqual(vpBud.diff, 1000000, 'C1 Kasus 3: diff total = 1.000.000');
  assert.strictEqual(vpBud.forecast, 25788992, 'C1 Kasus 3: forecast = 25.788.992');
  assert.strictEqual(vpBud.overBudget, true, 'C1 Kasus 3: overBudget true');
  assert.strictEqual(vpBud.overBudgetDiff, 788992, 'C1 Kasus 3: overBudgetDiff = 788.992');

  // 5. Kasus nyata #4: Multi mata uang (NOK & SEK, saklar fxs menyala) + pemesanan lunas dg kurs terkunci sbg rencana
  const pMulti = {
    id: 'p-multi',
    name: 'Nordik Multi',
    cur: 'NOK',
    rate: 1500,
    fxs: [{ c: 'SEK', r: 1600 }],
    budget: 40000000,
    it: [
      { id: 'm-it1', day: '2026-10-02', place: 'Ferry Geiranger', est: 1000, fx: true, pay: 'cash', cat: 'Transport', ax: 900, ak: 1520 }, // plan 1.500.000, act 1.368.000 -> diff -132.000
      { id: 'm-it2', day: '2026-10-03', place: 'Museum Vasa', est: 400, fx: true, c: 'SEK', pay: 'cash', cat: 'Tiket & Tour', ax: 500, ak: 1650 }, // plan 640.000, act 825.000 -> diff +185.000
    ],
    bk: [
      { id: 'm-bk1', title: 'Hotel Oslo Lunas', amt: 5000, fx: true, paid: true, rt: 1450, ra: true, cat: 'Penginapan', ax: 5000, ak: 1450 }, // plan locked 1450 -> diff 0
      { id: 'm-bk2', title: 'Kereta SJ', amt: 2000, fx: true, c: 'SEK', paid: true, rt: 1580, cat: 'Transport', ax: 2100 }, // plan locked 1580 (3.160.000), ak kosong -> pakai rt rencana 1580 -> 3.318.000, diff +158.000
    ],
  };
  const vpMulti = w.tripVsPlan(pMulti);
  assert.strictEqual(vpMulti.byCur.length, 2, 'C1 Kasus 4: byCur memuat 2 mata uang (NOK & SEK)');
  const byNok = vpMulti.byCur.find((b) => b.c === 'NOK');
  const bySek = vpMulti.byCur.find((b) => b.c === 'SEK');
  assert.ok(byNok && byNok.diff === -132000, 'C1 Kasus 4: NOK diff = -132.000');
  assert.ok(bySek && bySek.diff === 343000, 'C1 Kasus 4: SEK diff = +185.000 + 158.000 = 343.000');
  assert.strictEqual(byNok.diff + bySek.diff, vpMulti.diff, 'C1 Kasus 4: Σ byCur.diff == diff');
  assert.strictEqual(vpMulti.topOver[0].id, 'm-it2', 'C1 Kasus 4: topOver #1 selisih positif terbesar');
  assert.strictEqual(vpMulti.topSave[0].id, 'm-it1', 'C1 Kasus 4: topSave #1 hemat terbesar');

  // 6. Properti acak (250 fixture: campuran Rp/asing/kurs pecahan/rt/lunas)
  let seedR = 1337;
  const rnd = () => {
    seedR = (seedR * 1664525 + 1013904223) >>> 0;
    return seedR / 4294967296;
  };
  for (let trial = 0; trial < 250; trial++) {
    const mainR = +(80 + rnd() * 17000).toFixed(2);
    const secR = +(100 + rnd() * 15000).toFixed(2);
    const Pfx = {
      id: 'rnd-' + trial,
      name: 'Rnd ' + trial,
      cur: 'JPY',
      rate: mainR,
      fxs: [{ c: 'EUR', r: secR }],
      budget: Math.round(rnd() * 50000000),
      it: [],
      bk: [],
    };
    const nIt = 1 + Math.floor(rnd() * 6);
    for (let j = 0; j < nIt; j++) {
      const isOn = rnd() < 0.2;
      const isFx = rnd() < 0.7;
      const useSec = isFx && rnd() < 0.4;
      const hasAx = !isOn && rnd() < 0.65;
      const it = {
        id: 'ri-' + j,
        day: '2026-10-0' + (1 + (j % 5)),
        place: 'Item ' + j,
        est: Math.round(100 + rnd() * 50000),
        fx: isFx,
        pay: isOn ? 'on' : 'cash',
        cat: 'Makan',
      };
      if (useSec) it.c = 'EUR';
      if (isFx && rnd() < 0.4) it.rt = +(80 + rnd() * 17000).toFixed(2);
      if (hasAx) {
        it.ax = Math.round(50 + rnd() * 60000);
        if (isFx && rnd() < 0.6) it.ak = +(80 + rnd() * 17000).toFixed(2);
      }
      Pfx.it.push(it);
    }
    const nBk = 1 + Math.floor(rnd() * 4);
    for (let j = 0; j < nBk; j++) {
      const isFx = rnd() < 0.7;
      const useSec = isFx && rnd() < 0.4;
      const isPaid = rnd() < 0.5;
      const hasAx = rnd() < 0.6;
      const bk = {
        id: 'rb-' + j,
        title: 'Bk ' + j,
        amt: Math.round(1000 + rnd() * 100000),
        fx: isFx,
        paid: isPaid,
        cat: 'Penginapan',
      };
      if (useSec) bk.c = 'EUR';
      if (isFx && (isPaid || rnd() < 0.4)) bk.rt = +(80 + rnd() * 17000).toFixed(2);
      if (hasAx) {
        bk.ax = Math.round(500 + rnd() * 120000);
        if (isFx && rnd() < 0.6) bk.ak = +(80 + rnd() * 17000).toFixed(2);
      }
      Pfx.bk.push(bk);
    }
    const vpR = w.tripVsPlan(Pfx);
    assert.strictEqual(vpR.efekHarga + vpR.efekKurs, Math.round(vpR.diff), 'Prop #' + trial + ': efekHarga + efekKurs === Math.round(diff)');
    assert.ok(Math.abs(vpR.forecast - (w.tripPlan(Pfx).t + vpR.diff)) < 1e-6, 'Prop #' + trial + ': forecast === tripPlan.t + diff');
    // Hapus atau tambah item tanpa ax tidak boleh mengubah diff
    const PfxNoAx = JSON.parse(JSON.stringify(Pfx));
    PfxNoAx.it.push({ id: 'extra-no-ax', day: '2026-10-01', place: 'NoAx', est: 999999, fx: false, pay: 'cash' });
    assert.strictEqual(w.tripVsPlan(PfxNoAx).diff, vpR.diff, 'Prop #' + trial + ': item tanpa ax tidak mengubah diff');
    if (vpR.byCur.length > 0 && vpR.items.every((x) => x.fx)) {
      const sumByCurDiff = vpR.byCur.reduce((s, c) => s + c.diff, 0);
      assert.strictEqual(sumByCurDiff, Math.round(vpR.diff), 'Prop #' + trial + ': Σ byCur.diff === round(diff)');
    }
  }

  // =========================================================================
  // C2: BAGIAN B, C, D — Tombol & Popup Harga Aktual, Baris Tombol, Kartu Ringkasan
  // =========================================================================
  w.setShellMode('browser');
  w.ALL.kas.pr['p-12b-c2'] = {
    id: 'p-12b-c2',
    name: 'Jepang 12B <img src=x>',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-10-01',
    end: '2026-10-05',
    budget: 25000000,
    cur: 'JPY',
    rate: 100,
    fxs: [{ c: 'SEK', r: 1600 }],
    dt: {},
    it: [
      { id: 'c2-it-fx', day: '2026-10-01', time: '19:00', time2: '', place: 'Makan Malam <script>', est: 5000, fx: true, pay: 'cash', cat: 'Makan', link: '', note: 'Catatan', done: false },
      { id: 'c2-it-rp', day: '2026-10-01', time: '21:00', time2: '', place: 'Oleh-oleh Rp', est: 400000, fx: false, pay: 'cash', cat: 'Belanja', link: '', note: '', done: false },
      { id: 'c2-it-on', day: '2026-10-01', time: '22:00', time2: '', place: 'Tur Online', est: 3000, fx: true, pay: 'on', cat: 'Tiket & Tour', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'c2-bk-lunas', title: 'Hotel Tokyo', amt: 15000, fx: true, paid: true, rt: 98, ra: true, cat: 'Penginapan', a: '2026-10-01', b: '2026-10-05', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setMode('trip');
  w.setTrip('p-12b-c2');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();

  // D: n=0 & m>0 -> keadaan kosong 1 baris
  const emptyVs = $('trip-root').querySelector('.trip-vs-empty');
  assert.ok(emptyVs && emptyVs.textContent.includes('Belum ada harga aktual. Buka Itinerary atau Pemesanan'), 'C2 D Desktop: keadaan kosong n=0 tampil');
  assert.strictEqual($('trip-root').querySelector('.trip-vs-card'), null, 'C2 D Desktop: kartu penuh tidak tampil saat n=0');

  // B & C: Sub-tab Itinerary Desktop
  w.BR_STATE.tripSubTab = 'itin';
  if (w.BR_STATE.tripOpenDays) delete w.BR_STATE.tripOpenDays['p-12b-c2'];
  w.renderTrip();
  click($('trip-root').querySelector('[data-it-day-tog="2026-10-01"]'));

  const rowFx = $('trip-root').querySelector('[data-it-row="c2-it-fx"]');
  const rowRp = $('trip-root').querySelector('[data-it-row="c2-it-rp"]');
  const rowOn = $('trip-root').querySelector('[data-it-row="c2-it-on"]');

  // Tombol Harga Aktual ada di FX & Rp, disembunyikan di pay === 'on'
  const btnActFx = rowFx.querySelector('[data-it-act="c2-it-fx"]');
  const btnActRp = rowRp.querySelector('[data-it-act="c2-it-rp"]');
  assert.ok(btnActFx && btnActFx.textContent.includes('Harga Aktual'), 'C2 B Desktop: tombol Harga Aktual tampil di item layak');
  assert.strictEqual(btnActFx.getAttribute('aria-label'), 'Catat harga sebenarnya di lapangan', 'C2 B Desktop: aria-label tombol Harga Aktual');
  assert.strictEqual(rowOn.querySelector('[data-it-act]'), null, 'C2 A/B Desktop: pay===on tidak menampilkan tombol Harga Aktual');

  // C: Urutan tombol pada kartu Itinerary ([Tandai/Selesai], Harga Aktual, Ubah, Hapus)
  const itBtnLabels = [...rowFx.querySelectorAll('.trip-card-actions button')].map((b) => b.textContent.replace(/✓\s*/g, '').trim());
  assert.deepStrictEqual(itBtnLabels, ['Tandai', 'Harga Aktual', 'Ubah', 'Hapus'], 'C2 C Desktop Itin: urutan 4 tombol persis');

  // Buka popup FX & uji pratinjau + validasi + simpan
  let curScrollY = 0;
  Object.defineProperty(w, 'scrollY', { configurable: true, get: () => curScrollY });
  w.scrollTo = (_x, y) => {
    curScrollY = typeof y === 'number' ? y : ((_x && typeof _x.top === 'number') ? _x.top : curScrollY);
  };
  w.scrollTo(0, 320);
  click(btnActFx);
  const modAct = $('modal-trip-actual');
  assert.ok(modAct && !modAct.hidden, 'C2 B Desktop: modal #modal-trip-actual terbuka');
  assert.strictEqual(w.document.activeElement, $('act-m-ax'), 'C2 B Desktop: fokus otomatis ke kolom harga');
  assert.ok($('act-m-est').textContent.includes('5.000') && $('act-m-est').textContent.includes('500.000'), 'C2 B Desktop: baris Estimasi baca-saja tampil');
  assert.strictEqual($('act-m-ak-wrap').hidden, false, 'C2 B Desktop FX: kolom kurs tampil untuk item FX');
  assert.strictEqual($('act-m-del').hidden, true, 'C2 B Desktop: tombol Hapus harga aktual hidden bila belum ada');

  // Validasi kosong / 0 -> gagal & pesan inline
  $('act-m-ax').value = '';
  fire($('trip-actual-form'), 'submit');
  assert.strictEqual($('act-m-ax-err').hidden, false, 'C2 B Desktop: error inline saat harga kosong');
  assert.strictEqual(modAct.hidden, false, 'C2 B Desktop: modal tetap terbuka saat validasi gagal');

  // Isi ¥6.200 & kurs 107 -> pratinjau langsung
  $('act-m-ax').value = '6200';
  fire($('act-m-ax'), 'input');
  $('act-m-ak').value = '107';
  fire($('act-m-ak'), 'input');
  const prevTxt = $('act-m-prev').textContent;
  assert.ok(prevTxt.includes('663.400') && prevTxt.includes('lebih mahal Rp 163.400'), 'C2 B Desktop: pratinjau live ≈ Rp 663.400 · lebih mahal Rp 163.400');
  assert.ok($('act-m-prev-det').textContent.includes('120.000') && $('act-m-prev-det').textContent.includes('43.400'), 'C2 B Desktop: rincian efek harga & kurs tampil');

  fire($('trip-actual-form'), 'submit');
  assert.strictEqual(modAct.hidden, true, 'C2 B Desktop: simpan via submit menutup modal');
  assert.strictEqual($('ttm').textContent, 'Harga aktual disimpan', 'C2 B Desktop: toast Harga aktual disimpan');
  assert.strictEqual(w.scrollY, 320, 'C2 B Desktop: posisi scroll halaman tidak berubah setelah simpan');
  const savedFxIt = w.ALL.kas.pr['p-12b-c2'].it.find((x) => x.id === 'c2-it-fx');
  assert.strictEqual(savedFxIt.ax, 6200, 'C2 B Desktop: ax tersimpan');
  assert.strictEqual(savedFxIt.ak, 107, 'C2 B Desktop: ak tersimpan');
  assert.strictEqual(savedFxIt.note, 'Catatan', 'C2 B Desktop: MERGE menjaga field lain');
  const rowFxAfter = $('trip-root').querySelector('[data-it-row="c2-it-fx"]');
  assert.ok(rowFxAfter.querySelector('.trip-item-actual-line') && rowFxAfter.querySelector('.trip-item-actual-line').textContent.includes('663.400') && rowFxAfter.querySelector('.trip-item-actual-line').textContent.includes('lebih mahal'), 'C2 B Desktop: baris Aktual di kartu tampil');
  assert.ok(rowFxAfter.querySelector('.trip-item-actual-line').classList.contains('pv'), 'C2 B Desktop: baris Aktual memakai kelas pv');
  assert.ok(rowFxAfter.querySelector('[data-it-act="c2-it-fx"]').textContent.includes('✓'), 'C2 B Desktop: tombol memuat centang saat sudah diisi');

  // Uji tombol Esc menutup modal & fokus kembali ke pemicu
  click(rowFxAfter.querySelector('[data-it-act="c2-it-fx"]'));
  assert.strictEqual($('act-m-del').hidden, false, 'C2 B Desktop: tombol Hapus tampil saat ax sudah ada');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(modAct.hidden, true, 'C2 B Desktop: Esc menutup modal');
  assert.strictEqual(w.document.activeElement.getAttribute('data-it-act'), 'c2-it-fx', 'C2 B Desktop: Esc mengembalikan fokus ke tombol pemicu');

  // Uji Hapus harga aktual + askConfirm + Urungkan
  click($('trip-root').querySelector('[data-it-act="c2-it-fx"]'));
  click($('act-m-del'));
  const cfDel = w.document.querySelector('.cfm [data-cf-y]');
  assert.ok(cfDel, 'C2 B Desktop: konfirmasi askConfirm muncul saat Hapus harga aktual');
  click(cfDel);
  assert.strictEqual(savedFxIt.ax, undefined, 'C2 B Desktop: ax terhapus setelah konfirmasi');
  assert.strictEqual(savedFxIt.ak, undefined, 'C2 B Desktop: ak terhapus');
  assert.strictEqual($('ttm').textContent, 'Harga aktual dihapus', 'C2 B Desktop: toast Harga aktual dihapus');
  assert.strictEqual($('ttu').hidden, false, 'C2 B Desktop: tombol Urungkan tampil');
  click($('ttu'));
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[0].ax, 6200, 'C2 B Desktop: Urungkan memulihkan ax');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[0].ak, 107, 'C2 B Desktop: Urungkan memulihkan ak');

  // Uji item Rupiah: popup TANPA kolom kurs, simpan Rp 450.000
  click($('trip-root').querySelector('[data-it-act="c2-it-rp"]'));
  assert.strictEqual($('act-m-ak-wrap').hidden, true, 'C2 B Desktop Rp: kolom kurs tersembunyi');
  $('act-m-ax').value = '450000';
  fire($('trip-actual-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].ax, 450000, 'C2 B Desktop Rp: ax tersimpan');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].ak, undefined, 'C2 B Desktop Rp: ak tidak disimpan');

  // Uji ganti mata uang item ber-ax di form Ubah -> konfirmasi askConfirm (batal vs ya)
  click($('trip-root').querySelector('[data-trip-it-edit="c2-it-rp"]'));
  $('it-cur').value = 'fx';
  fire($('trip-itin-form'), 'submit');
  const cfCurNo = w.document.querySelector('.cfm [data-cf-n]');
  assert.ok(cfCurNo, 'C2 A Desktop: ganti mata uang item ber-ax memicu askConfirm');
  click(cfCurNo);
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].fx, false, 'C2 A Desktop: batal konfirmasi tidak mengubah mata uang');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].ax, 450000, 'C2 A Desktop: batal konfirmasi tidak menghapus ax');
  fire($('trip-itin-form'), 'submit');
  click(w.document.querySelector('.cfm [data-cf-y]'));
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].fx, true, 'C2 A Desktop: setuju konfirmasi mengubah mata uang');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].it[1].ax, undefined, 'C2 A Desktop: setuju konfirmasi menghapus ax');

  // Pemesanan: urutan tombol & popup Harga Aktual pada Pemesanan
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  const bkRowD = $('trip-root').querySelector('[data-bk-row="c2-bk-lunas"]');
  const bkBtnLabels = [...bkRowD.querySelectorAll('.trip-card-actions button')].map((b) => b.textContent.replace(/✓\s*/g, '').trim());
  assert.deepStrictEqual(bkBtnLabels, ['Lunas', 'Harga Aktual', 'Ubah', 'Hapus'], 'C2 C Desktop Book: urutan 4 tombol persis');
  click(bkRowD.querySelector('[data-bk-act="c2-bk-lunas"]'));
  $('act-m-ax').value = '14500';
  fire($('trip-actual-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].bk[0].ax, 14500, 'C2 B Desktop Book: ax tersimpan');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].bk[0].paid, true, 'C2 B Desktop Book: paid & rt terjaga via merge');
  assert.strictEqual(w.ALL.kas.pr['p-12b-c2'].bk[0].rt, 98, 'C2 B Desktop Book: rt terjaga');

  // D: Kartu Rencana vs Realita di Ringkasan Desktop (n > 0)
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const vsCardD = $('trip-root').querySelector('.trip-vs-card');
  assert.ok(vsCardD, 'C2 D Desktop: kartu .trip-vs-card tampil saat n > 0');
  assert.ok(vsCardD.textContent.includes('Rencana vs Realita') && vsCardD.textContent.includes('2 item'), 'C2 D Desktop: judul & subjudul item');
  assert.ok(vsCardD.textContent.includes('Efek harga') && vsCardD.textContent.includes('Efek kurs'), 'C2 D Desktop: efek harga & kurs tampil');
  assert.ok(vsCardD.textContent.includes('2 dari 3 item'), 'C2 D Desktop: progres n dari m item');
  assert.ok(vsCardD.textContent.includes('Perkiraan total akhir'), 'C2 D Desktop: perkiraan total akhir tampil');
  assert.ok(vsCardD.textContent.includes('Sisa anggaran') || vsCardD.textContent.includes('melebihi anggaran'), 'C2 D Desktop: badge anggaran kata tampil');
  assert.ok(!vsCardD.innerHTML.includes('<script>'), 'C2 D Desktop XSS: nama item ter-escape aman');
  const progFillD = vsCardD.querySelector('.trip-vs-prog-fill');
  assert.ok(progFillD && /scaleX\(/.test(progFillD.getAttribute('style') || ''), 'C2 D Desktop: batang progres memakai transform: scaleX');
  assert.ok(vsCardD.querySelectorAll('.pv').length >= 4, 'C2 D Desktop: semua nominal memakai kelas pv');

  delete w.ALL.kas.pr['p-12b-c2'];

  // =========================================================================
  // C3: BAGIAN E — Hapus Sub-tab Realisasi, PDF/Bagikan Rencana vs Realita, & sw.js v34
  // =========================================================================
  const fs = require('fs');
  const path = require('path');

  // 1. Fungsi Stage 11 Realisasi sudah dibersihkan
  for (const fnOld of [
    'tripUnlinkAcRef',
    'tripAcRp',
    'tripAcSplit',
    'tripAcPlan',
    'tripAcRefSelectOptsHtml',
    'tripBkExtraAcHtml',
    'tripAcFxDetailCardHtml',
    'tripRenderRealSubTabHtml',
  ]) {
    assert.strictEqual(typeof w[fnOld], 'undefined', 'C3 E Desktop: fungsi lama ' + fnOld + ' harus dihapus');
  }
  assert.strictEqual(typeof w.tripSignedRp, 'function', 'C3 E: helper tripSignedRp tetap tersedia untuk kartu Rencana vs Realita');

  // 2. Sub-tab Desktop tanpa "real", form #trip-ac-form tidak ada walau P.ac warisan terisi
  const pC3 = {
    id: 'p-12b-c3',
    name: 'Tokyo 12B C3',
    link: false,
    saldo: 0,
    start: '2026-10-01',
    end: '2026-10-05',
    budget: 2000000,
    cur: 'JPY',
    rate: 100,
    it: [
      { id: 'c3-i1', day: '2026-10-02', time: '18:00', time2: '19:30', place: 'Sushi', est: 5000, fx: true, pay: 'cash', cat: 'Makan', ax: 6200, ak: 107 },
      { id: 'c3-i2', day: '2026-10-03', time: '', time2: '', place: 'Oleh-oleh', est: 400000, fx: false, pay: 'cash', cat: 'Belanja', ax: 450000 },
    ],
    bk: [
      { id: 'c3-b1', title: 'Hotel Shinjuku', a: '2026-10-01', b: '2026-10-05', amt: 10000, fx: true, cat: 'Hotel', paid: false },
    ],
    ac: [{ id: 'ac-legacy-1', d: '2026-10-02', amt: 5000, fx: false, cat: 'Makan', note: 'Warisan Tahap 11 🍣' }],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.ALL.kas.pr['p-12b-c3'] = pC3;
  w.setTrip('p-12b-c3');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const deskSubsC3 = [...$('trip-root').querySelectorAll('[data-triptab]')].map((b) => b.dataset.triptab);
  assert.deepStrictEqual(deskSubsC3, ['ring', 'itin', 'book', 'cek', 'cat', 'sv'], 'C3 E Desktop: sub-tab Realisasi dihapus dari daftar sub-tab');
  assert.strictEqual($('trip-ac-form'), null, 'C3 E Desktop: #trip-ac-form tidak ada di DOM');
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  assert.ok(!$('trip-root').textContent.includes('Biaya tambahan dicatat'), 'C3 E Desktop: book tidak lagi menampilkan catatan P.ac warisan');

  // 3. tripPdfHasNonWinAnsi mengabaikan P.ac warisan (hanya emoji di item aktif yang memicu)
  assert.strictEqual(w.tripPdfHasNonWinAnsi(pC3), false, 'C3 E PDF: P.ac[].note warisan berisi emoji diabaikan oleh tripPdfHasNonWinAnsi');

  // 4. Tanpa item ber-ax -> PDF bytes identik meski P.ac warisan terisi vs kosong
  const pC3NoAxEmptyAc = JSON.parse(JSON.stringify(pC3));
  pC3NoAxEmptyAc.it.forEach((x) => { delete x.ax; delete x.ak; });
  pC3NoAxEmptyAc.ac = [];
  const pC3NoAxWithLegacy = JSON.parse(JSON.stringify(pC3NoAxEmptyAc));
  pC3NoAxWithLegacy.ac = [{ id: 'ac-w1', d: '2026-10-02', amt: 99999, fx: false, cat: 'Lainnya', note: 'Legacy' }];
  assert.strictEqual(
    Buffer.from(w.repPdf(w.tripPdfData(pC3NoAxEmptyAc, true))).toString('hex'),
    Buffer.from(w.repPdf(w.tripPdfData(pC3NoAxWithLegacy, true))).toString('hex'),
    'C3 E PDF: tanpa item ber-ax, PDF identik byte-per-byte walau ada P.ac warisan vs kosong',
  );
  assert.strictEqual(w.tripText(pC3NoAxEmptyAc, true), w.tripText(pC3NoAxWithLegacy, true), 'C3 E Bagikan: tanpa item ber-ax, tripText identik');
  assert.ok(!w.tripText(pC3NoAxEmptyAc, true).includes('Rencana vs Realita') && !w.tripText(pC3NoAxEmptyAc, true).includes('Realisasi Pengeluaran'), 'C3 E Bagikan: tanpa ax tidak memuat blok Rencana vs Realita atau Realisasi');
  const pdfNoAx = w.tripPdfData(pC3NoAxEmptyAc, true);
  assert.ok(!pdfNoAx.tables.some((tb) => /Pengeluaran Aktual/i.test(tb.head)), 'C3 E PDF: tidak ada tabel Pengeluaran Aktual');
  assert.ok(!pdfNoAx.summary.some((r) => /Rencana vs Realita|Rencana s\/d hari ini|Realisasi Total/i.test(r[0])), 'C3 E PDF: tanpa ax tidak ada baris Rencana vs Realita atau warisan Tahap 11');

  // 5. Dengan cost=true & n > 0 -> PDF & Bagikan memuat Rencana vs Realita, PDF bebas ? dan ≈
  const pdfC3 = w.tripPdfData(pC3, true);
  const pdfC3Sum = pdfC3.summary.map((r) => r[0] + ': ' + r[1]).join('\n');
  assert.ok(pdfC3Sum.includes('Rencana vs Realita'), 'C3 E PDF: memuat baris Rencana vs Realita saat n > 0');
  assert.ok(pdfC3Sum.includes('900.000') && pdfC3Sum.includes('1.113.400') && pdfC3Sum.includes('213.400'), 'C3 E PDF: angka estimasi/aktual/selisih sesuai');
  assert.ok(pdfC3Sum.includes('Efek harga') && pdfC3Sum.includes('Efek kurs'), 'C3 E PDF FX: memuat efek harga & efek kurs');
  assert.ok(pdfC3Sum.includes('Perkiraan total akhir'), 'C3 E PDF: memuat perkiraan total akhir');
  assert.ok(!JSON.stringify(pdfC3).includes('≈'), 'C3 E PDF: bebas karakter non-WinAnsi ≈');
  const streamC3 = Buffer.from(w.repPdf(pdfC3)).toString('latin1');
  assert.ok(!streamC3.includes('?'), 'C3 E PDF stream: bebas ?');

  const pdfC3NoCost = w.tripPdfData(pC3, false);
  assert.ok(!pdfC3NoCost.summary.some((r) => /Rencana vs Realita|Harga aktual/i.test(r[0])), 'C3 E PDF cost=false: menyembunyikan Rencana vs Realita');

  const txtC3 = w.tripText(pC3, true);
  assert.ok(txtC3.includes('*Rencana vs Realita*'), 'C3 E Bagikan: memuat bagian *Rencana vs Realita*');
  assert.ok(txtC3.includes('1.113.400') && txtC3.includes('213.400') && txtC3.includes('Efek harga') && txtC3.includes('Perkiraan total akhir'), 'C3 E Bagikan: angka selisih/efek/perkiraan sesuai');
  assert.ok(!txtC3.includes('Realisasi Pengeluaran'), 'C3 E Bagikan: tidak memakai header Realisasi Pengeluaran lama');
  assert.ok(!w.tripText(pC3, false).includes('Rencana vs Realita'), 'C3 E Bagikan cost=false: menyembunyikan Rencana vs Realita');

  // 6. Data P.ac warisan tetap aman melewati norm()
  const roundAc = w.norm({ year: 2026, data: {}, kas: { pr: { 'p-12b-c3': pC3 } } }).kas.pr['p-12b-c3'];
  assert.strictEqual(roundAc.ac.length, 1, 'C3 E norm: data P.ac warisan tetap terjaga saat migrasi');

  // 7. sw.js CACHE_NAME dinaikkan menjadi rk-cache-v34 (>= 34)
  const swSrc12b = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
  const swVer12b = swSrc12b.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert.ok(swVer12b && Number(swVer12b[1]) >= 34, 'C3 E sw.js: CACHE_NAME harus minimal rk-cache-v34 (saat ini: ' + (swVer12b && swVer12b[0]) + ')');

  delete w.ALL.kas.pr['p-12b-c3'];

  // =========================================================================
  // C4: BAGIAN S — Pengaman Versi Sinkronisasi (RK_SCHEMA_VER / sv)
  // =========================================================================
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'C4 S: konstanta RK_SCHEMA_VER === 3');
  assert.strictEqual(w.norm(null).sv, 3, 'C4 S: norm(null) mengisi sv === RK_SCHEMA_VER');
  assert.strictEqual(w.emptyAllState(2026).sv, 3, 'C4 S: emptyAllState() mengisi sv === RK_SCHEMA_VER');

  // Siapkan mock Supabase untuk menguji push/pull/konflik & banner persisten
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origAllSnap = JSON.parse(JSON.stringify(w.ALL));
  const origBlocked = w.syncBlocked;
  const origSchemaBlocked = w.syncSchemaBlocked;
  try {
    let remoteRowMock = null;
    const pushedPayloads = [];
    w.sbUser = { id: 'u-12b-schema', email: 'u12b@example.com' };
    w.sb = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: remoteRowMock, error: null }),
                };
              },
            };
          },
          upsert(p) {
            pushedPayloads.push(JSON.parse(JSON.stringify(p)));
            return { select: async () => ({ data: [{ rev: p.rev }], error: null }) };
          },
          update(p) {
            pushedPayloads.push(JSON.parse(JSON.stringify(p)));
            return {
              eq() { return this; },
              select: async () => ({ data: [{ rev: p.rev }], error: null }),
            };
          },
        };
      },
    };
    if (typeof w.bindSync === 'function') w.bindSync();

    // 1. push() selalu menyertakan data.sv === 3
    w.syncBlocked = false;
    w.syncSchemaBlocked = false;
    w.ALL.rev = Date.now();
    await w.push();
    assert.strictEqual(pushedPayloads.length, 1, 'C4 S: push mengirim payload ke mock cloud');
    assert.strictEqual(pushedPayloads[0].data.sv, 3, 'C4 S: payload.data.sv selalu 3');

    // 2. pull() menerima data cloud dengan sv lebih tinggi (sv: 99) -> blokir total
    pushedPayloads.length = 0;
    const localBeforePull = JSON.parse(JSON.stringify(w.ALL));
    const newerCloudState = w.emptyAllState(2026);
    newerCloudState.data[2026].saldo = 99887766;
    newerCloudState.sv = 99;
    remoteRowMock = { rev: Date.now() + 50000, data: newerCloudState };

    await w.pull();
    assert.strictEqual(w.syncBlocked, true, 'C4 S: syncBlocked true saat cloud sv > RK_SCHEMA_VER');
    assert.strictEqual(w.syncSchemaBlocked, true, 'C4 S: syncSchemaBlocked true saat cloud sv > RK_SCHEMA_VER');
    assert.strictEqual(pushedPayloads.length, 0, 'C4 S: tidak ada push saat cloud sv lebih tinggi');
    assert.strictEqual(w.ALL.data[w.ALL.year].saldo, localBeforePull.data[localBeforePull.year].saldo, 'C4 S: ALL tidak ditimpa oleh cloud sv lebih tinggi');

    // Banner Desktop persisten & memuat pesan exact + petunjuk muat ulang
    assert.notStrictEqual($('sbs').style.display, 'none', 'C4 S Desktop: banner #sbs tampil persisten');
    const sbsTxt = $('sbs').textContent;
    assert.ok(sbsTxt.includes('Data cloud dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi agar tidak ada data yang hilang.'), 'C4 S Desktop: teks wajib pada banner #sbs');
    assert.ok(/muat ulang/i.test(sbsTxt), 'C4 S Desktop: memuat petunjuk muat ulang halaman');

    // Panggilan sbStat non-blokir / coba push lagi / event online & visibilitychange tidak menimpa blokir
    w.sbStat('Tersinkron biasa');
    assert.notStrictEqual($('sbs').style.display, 'none', 'C4 S: banner tetap persisten meski sbStat biasa dipanggil');
    assert.ok($('sbs').textContent.includes('versi aplikasi yang lebih baru'), 'C4 S: isi banner tetap persisten');
    w.schedPush();
    await w.push();
    assert.strictEqual(pushedPayloads.length, 0, 'C4 S: push/schedPush diblokir penuh');
    w.dispatchEvent(new w.Event('online'));
    await new Promise((r) => setTimeout(r, 15));
    assert.strictEqual(pushedPayloads.length, 0, 'C4 S: event online tidak mem-push data lokal');

    // Dialog konflik #cf [data-cf="local"] tidak boleh mem-bypass blokir saat syncSchemaBlocked
    if ($('cf')) {
      w.cfRow = remoteRowMock;
      const btnCfLocal = $('cf').querySelector('[data-cf="local"]');
      if (btnCfLocal) click(btnCfLocal);
      assert.strictEqual(w.syncBlocked, true, 'C4 S: tombol lokal #cf tidak dapat membypass syncSchemaBlocked');
      assert.strictEqual(pushedPayloads.length, 0, 'C4 S: tombol lokal #cf tidak mengirim push ke cloud');
    }

    // Banner APK (#m-sync-banner) juga tampil persisten dengan instruksi Pengaturan -> Cek pembaruan
    w.setShellMode('mobile-app');
    w.syncMobileCloudUI();
    const mBan = $('m-sync-banner');
    assert.ok(mBan && !mBan.hidden, 'C4 S APK: #m-sync-banner tampil persisten');
    assert.ok(mBan.textContent.includes('Data cloud dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi agar tidak ada data yang hilang.'), 'C4 S APK: teks wajib pada #m-sync-banner');
    assert.ok(mBan.textContent.includes('Pengaturan') && /Cek pembaruan/i.test(mBan.textContent), 'C4 S APK: petunjuk Pengaturan -> Cek pembaruan tampil');
    w.setShellMode('browser');

    // 3. Upgrade / cloud sv <= RK_SCHEMA_VER (sv <= 3 atau sv hilang -> dianggap 1): sinkron normal kembali
    const compatState = w.emptyAllState(2026);
    compatState.data[2026].saldo = 12345678;
    delete compatState.sv; // Data lama tanpa field sv (dianggap v1)
    remoteRowMock = { rev: Date.now() + 90000, data: compatState };
    await w.pull();
    assert.strictEqual(w.syncBlocked, false, 'C4 S: cloud lama tanpa sv (dianggap v1 <= 3) membuka blokir & sinkron normal');
    assert.strictEqual(w.syncSchemaBlocked, false, 'C4 S: syncSchemaBlocked false kembali');
    assert.strictEqual(w.ALL.data[2026].saldo, 12345678, 'C4 S: data cloud sv<=3 berhasil dimuat');
    assert.strictEqual(w.ALL.sv, 3, 'C4 S: ALL.sv tetap 3 setelah memuat data lama');

    // 4. Ekspor / Impor cadangan JSON membawa sv & menerima cadangan lama tanpa sv
    const exportedJson = JSON.stringify(w.ALL, null, 1);
    const parsedExp = JSON.parse(exportedJson);
    assert.strictEqual(parsedExp.sv, 3, 'C4 S Backup: JSON ekspor menyertakan sv === 3');
    const legacyBackup = JSON.parse(exportedJson);
    delete legacyBackup.sv;
    legacyBackup.data[2029] = {
      year: 2029,
      saldo: 777000,
      startMonth: 0,
      items: [{ id: 999111, name: 'Pos Warisan', price: 25000, n: 1, unit: 'bulan', start: '2029-01-01', cat: 'Lainnya' }],
      paid: {},
      skip: {},
      real: {},
      adj: [],
    };
    w.doImport(JSON.stringify(legacyBackup));
    assert.ok(w.ALL.data[2029] && w.ALL.data[2029].saldo === 777000 && w.ALL.data[2029].items.some((x) => x.id === 999111), 'C4 S Backup: impor cadangan lama tanpa sv berhasil menggabung tahun & item baru');
    assert.strictEqual(w.ALL.data[2026].saldo, 12345678, 'C4 S Backup: data eksisting 2026 tetap utuh');
    assert.strictEqual(w.ALL.sv, 3, 'C4 S Backup: ALL.sv setelah impor cadangan lama tetap 3');
    const replacedOld = w.norm(legacyBackup);
    assert.strictEqual(replacedOld.data[2029].saldo, 777000, 'C4 S Backup: norm() cadangan lama tanpa sv mempertahankan saldo');
    assert.strictEqual(replacedOld.sv, 3, 'C4 S Backup: norm() mengisi sv === 3 pada cadangan lama');
    w.doImport(exportedJson);
    assert.strictEqual(w.ALL.data[2026].saldo, 12345678, 'C4 S Backup: impor cadangan dengan sv:3 berhasil');
  } finally {
    w.sb = origSb;
    w.sbUser = origSbUser;
    w.ALL = w.norm(origAllSnap);
    w.S = w.ALL.data[w.ALL.year];
    w.syncBlocked = origBlocked;
    w.syncSchemaBlocked = origSchemaBlocked;
  }

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap12b_actual (C1+C2+C3+C4)');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap12b_actual:', e);
  process.exit(1);
});
