// Verifikasi Tahap 12A (Desktop & Bersama): C1 (Butir 3, 4, 5) + placeholder C2 & C3.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;
  const doc = w.document;

  const fireInput = (el, val) => {
    el.value = val;
    el.dispatchEvent(new w.Event('input', { bubbles: true, cancelable: true }));
  };
  const fireBlur = (el) => el.dispatchEvent(new w.FocusEvent('blur', { bubbles: true }));
  const fireBeforeInput = (el, data) => {
    const Ev = w.InputEvent || w.Event;
    const ev = new Ev('beforeinput', { bubbles: true, cancelable: true, data });
    if (ev.data === undefined) Object.defineProperty(ev, 'data', { value: data });
    el.dispatchEvent(ev);
    return ev;
  };
  const firePaste = (el, text) => {
    try { el.setSelectionRange(0, el.value.length); } catch (e) {}
    const ev = new w.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', {
      value: { getData: (fmt) => (fmt === 'text/plain' || fmt === 'text' ? text : '') },
    });
    el.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      el.value = text;
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
    return ev;
  };
  const fireDrop = (el, text) => {
    try { el.setSelectionRange(0, el.value.length); } catch (e) {}
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', {
      value: { getData: (fmt) => (fmt === 'text/plain' || fmt === 'text' ? text : '') },
    });
    el.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      el.value = text;
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
    return ev;
  };

  // =========================================================================
  // C1: BUTIR 4 — Input Angka Opt-In (data-num-only="int" | "dec") vs Mode Kas
  // =========================================================================
  w.setShellMode('browser');
  w.tab('kas');
  const kasInp = $('kas-amount');
  assert.ok(kasInp && !kasInp.hasAttribute('data-num-only'), 'B4 Regresi: #kas-amount tidak memakai data-num-only');
  fireInput(kasInp, '250rb');
  assert.strictEqual(kasInp.value, '250rb', 'B4 Regresi Kas: shorthand 250rb tetap dibiarkan saat mengetik');
  fireBlur(kasInp);
  assert.strictEqual(kasInp.value, '250.000', 'B4 Regresi Kas: shorthand 250rb menjadi 250.000 saat blur');

  // Fixture perjalanan untuk B3, B4, B5 Desktop
  w.ALL.kas.pr['p-t12a-c1'] = {
    id: 'p-t12a-c1',
    name: 'Hokkaido C1',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-12',
    end: '2026-12-21',
    budget: 20000000,
    cur: 'JPY',
    rate: 108.5,
    fxs: [{ c: 'SGD', r: 12000 }],
    dt: {},
    it: [
      { id: 'c1-i1', day: '2026-12-15', time: '09:00', time2: '', place: 'Otaru Canal', est: 2000, fx: true, pay: 'cash', cat: 'Transport', link: '', note: '', done: false },
      { id: 'c1-i-out', day: '2026-12-25', time: '10:00', time2: '', place: 'Item Out Of Range', est: 100000, fx: false, pay: 'cash', cat: 'Makan', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'c1-b1', title: 'JR Hokkaido Pass', amt: 20000, fx: true, paid: false, cat: 'Transport', a: '2026-12-12', b: '2026-12-18', pay: 'on', link: '', rec: '' },
      { id: 'c1-b-out', title: 'Hotel Terlambat', amt: 500000, fx: false, paid: false, cat: 'Penginapan', a: '2026-12-22', b: '2026-12-24', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const pC1 = () => w.ALL.kas.pr['p-t12a-c1'];

  w.setMode('trip');
  w.setTrip('p-t12a-c1');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  w.BR_STATE.tripEditItId = null;
  w.renderTrip();

  // B4: #it-est (data-num-only="int") & #it-rt (data-num-only="dec")
  const itEst = $('it-est');
  assert.strictEqual(itEst.getAttribute('data-num-only'), 'int', 'B4 Desktop: #it-est punya data-num-only="int"');
  assert.strictEqual(itEst.getAttribute('inputmode'), 'numeric', 'B4 Desktop: #it-est punya inputmode="numeric"');
  const biLetter = fireBeforeInput(itEst, 'a');
  assert.strictEqual(biLetter.defaultPrevented, true, 'B4 Desktop: beforeinput menolak huruf non-digit');
  fireInput(itEst, '12abc-+e');
  assert.strictEqual(itEst.value, '12', 'B4 Desktop: ketik 12abc-+e disanitasi menjadi 12');
  fireInput(itEst, '250rb');
  fireBlur(itEst);
  assert.strictEqual(itEst.value, '250', 'B4 Desktop: shorthand rb dibuang tanpa konversi ke 250.000');
  firePaste(itEst, '1.234.567');
  assert.strictEqual(itEst.value, '1.234.567', 'B4 Desktop: paste 1.234.567 terformat utuh');
  fireDrop(itEst, 'Rp 98.765 abc');
  assert.strictEqual(itEst.value, '98.765', 'B4 Desktop: drop teks campuran hanya menyisakan angka 98.765');
  fireInput(itEst, '1234567890123456'); // 16 digit -> maksimal 13 digit
  assert.strictEqual(itEst.value.replace(/\D/g, '').length, 13, 'B4 Desktop: maksimal 13 digit pada #it-est');
  assert.strictEqual(itEst.value, '1.234.567.890.123', 'B4 Desktop: format titik 13 digit benar');

  // Kolom kurs Desktop (it-rt, bk-rt, kp-rate, br-xl-rate) punya data-num-only="dec"
  click($('trip-root').querySelector('[data-trip-it-edit="c1-i1"]'));
  const itRt = $('it-rt');
  assert.strictEqual(itRt.getAttribute('data-num-only'), 'dec', 'B4 Desktop: #it-rt punya data-num-only="dec"');
  assert.strictEqual(itRt.getAttribute('inputmode'), 'decimal', 'B4 Desktop: #it-rt inputmode="decimal"');
  fireInput(itRt, '108,5,2abc');
  assert.strictEqual(itRt.value, '108,52', 'B4 Desktop dec: hanya digit & satu pemisah desimal pertama bertahan');
  click($('trip-root').querySelector('[data-it-cancel="1"]'));

  click($('br-trip-edit'));
  assert.strictEqual($('kp-rate').getAttribute('data-num-only'), 'dec', 'B4 Desktop: #kp-rate punya data-num-only="dec"');
  assert.strictEqual($('kp-budget').getAttribute('data-num-only'), 'int', 'B4 Desktop: #kp-budget punya data-num-only="int"');
  click($('kp-fxs-add'));
  const fxRateInp = $('kp-fxs-list').querySelector('[data-fx-rate]');
  assert.strictEqual(fxRateInp.getAttribute('data-num-only'), 'dec', 'B4 Desktop: baris kurs fxs [data-fx-rate] punya data-num-only="dec"');
  click($('kpf-cancel'));
  assert.strictEqual($('br-xl-rate').getAttribute('data-num-only'), 'dec', 'B4 Desktop: #br-xl-rate punya data-num-only="dec"');

  // =========================================================================
  // C1: BUTIR 3 — Validasi Rentang Tanggal + Fokus + Aria + Badge + Confirm
  // =========================================================================
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  // Lacak fokus & pesan galat tanggal di Itinerary Tambah (day < P.start & day > P.end)
  const expectedItMsg = 'Tanggal kegiatan harus berada dalam rentang perjalanan (12 Des 2026 - 21 Des 2026).';
  const itBeforeLen = pC1().it.length;
  w.BR_STATE.inlineDates.itDay = '2026-12-11';
  $('it-place').value = 'Coba Sebelum Mulai';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual(pC1().it.length, itBeforeLen, 'B3 Desktop Itin Tambah (< start): tidak menyimpan');
  const itTrig = $('trip-itin-form').querySelector('[data-ical-trig^="it-day-cal"]');
  assert.strictEqual(itTrig.getAttribute('aria-invalid'), 'true', 'B3 Desktop Itin: trigger tanggal memiliki aria-invalid="true"');
  assert.strictEqual(doc.activeElement, itTrig, 'B3 Desktop Itin: fokus diarahkan ke kolom tanggal saat galat');
  const itDayErr = $('it-day-err');
  assert.ok(itDayErr && itDayErr.getAttribute('role') === 'alert' && itDayErr.textContent.trim() === expectedItMsg, 'B3 Desktop Itin: pesan inline role="alert" persis: ' + (itDayErr && itDayErr.textContent));
  assert.strictEqual($('ttm').textContent, expectedItMsg, 'B3 Desktop Itin: toast galat menampilkan pesan persis');

  // > P.end pada mode Ubah
  click($('trip-root').querySelector('[data-trip-it-edit="c1-i1"]'));
  w.BR_STATE.inlineDates.itDay = '2026-12-22';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual(pC1().it[0].day, '2026-12-15', 'B3 Desktop Itin Ubah (> end): tidak mengubah day');
  assert.strictEqual($('it-day-err').textContent.trim(), expectedItMsg, 'B3 Desktop Itin Ubah: pesan inline tampil');
  assert.strictEqual($('trip-itin-form').querySelector('[data-ical-trig^="it-day-cal"]').getAttribute('aria-invalid'), 'true', 'B3 Desktop Itin Ubah: aria-invalid="true"');

  // Batas tepat hari pertama & hari terakhir diterima
  w.BR_STATE.inlineDates.itDay = '2026-12-12';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual(pC1().it[0].day, '2026-12-12', 'B3 Desktop Itin: batas tepat hari pertama diterima');
  w.BR_STATE.inlineDates.itDay = '2026-12-21';
  $('it-place').value = 'Hari Terakhir';
  fire($('trip-itin-form'), 'submit');
  assert.ok(pC1().it.some((x) => x.place === 'Hari Terakhir' && x.day === '2026-12-21'), 'B3 Desktop Itin: batas tepat hari terakhir diterima');

  // Opt-in min/max pada kalender brDrawInlineCal
  click($('trip-itin-form').querySelector('[data-ical-trig^="it-day-cal"]'));
  const disBtn = $('it-day-cal').querySelector('[data-ical-pick$="|2026-12-10"]');
  const okBtn = $('it-day-cal').querySelector('[data-ical-pick$="|2026-12-12"]');
  assert.ok(disBtn && disBtn.disabled, 'B3 Desktop Cal: tanggal di luar rentang dinonaktifkan di kalender');
  assert.ok(okBtn && !okBtn.disabled, 'B3 Desktop Cal: tanggal dalam rentang aktif');
  doc.body.click();

  // Badge lunak "Di luar rentang" pada kartu item existing
  const outItRow = $('trip-root').querySelector('[data-it-row="c1-i-out"]');
  assert.ok(outItRow && outItRow.querySelector('.trip-out-range-badge') && outItRow.textContent.includes('Di luar rentang'), 'B3 Desktop Itin: badge Di luar rentang tampil pada item di luar rentang');

  // --- Pemesanan Desktop (B3, B4, B5) ---
  w.BR_STATE.tripSubTab = 'book';
  w.BR_STATE.tripEditBkId = null;
  w.renderTrip();
  const bkAmt = $('bk-amt');
  assert.strictEqual(bkAmt.getAttribute('data-num-only'), 'int', 'B4 Desktop: #bk-amt punya data-num-only="int"');
  assert.ok($('bk-link'), 'B5 Desktop: input #bk-link tersedia di form Tambah Pemesanan');

  // Badge Di luar rentang pada Pemesanan existing
  const outBkRow = $('trip-root').querySelector('[data-bk-row="c1-b-out"]');
  assert.ok(outBkRow && outBkRow.querySelector('.trip-out-range-badge') && outBkRow.textContent.includes('Di luar rentang'), 'B3 Desktop Book: badge Di luar rentang tampil pada pemesanan di luar rentang');

  // Validasi tanggal pemesanan (< start, > end, b < a)
  const expectedBkMsg = 'Tanggal masuk dan keluar harus berada dalam rentang perjalanan (12 Des 2026 - 21 Des 2026).';
  const expectedBkOrderMsg = 'Tanggal keluar tidak boleh sebelum tanggal masuk.';
  const bkBeforeLen = pC1().bk.length;
  $('bk-title').value = 'Hotel Salah Rentang';
  $('bk-amt').value = '500000';
  w.BR_STATE.inlineDates.bkStart = '2026-12-10';
  w.BR_STATE.inlineDates.bkEnd = '2026-12-15';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pC1().bk.length, bkBeforeLen, 'B3 Desktop Book (< start): tidak menyimpan');
  const bkStartTrig = $('trip-book-form').querySelector('[data-ical-trig^="bk-start-cal"]');
  assert.strictEqual(bkStartTrig.getAttribute('aria-invalid'), 'true', 'B3 Desktop Book: start trigger aria-invalid="true"');
  assert.strictEqual($('bk-date-err').textContent.trim(), expectedBkMsg, 'B3 Desktop Book: pesan inline rentang persis');
  assert.strictEqual($('ttm').textContent, expectedBkMsg, 'B3 Desktop Book: toast rentang persis');

  // b < a
  w.BR_STATE.inlineDates.bkStart = '2026-12-18';
  w.BR_STATE.inlineDates.bkEnd = '2026-12-15';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pC1().bk.length, bkBeforeLen, 'B3 Desktop Book (b < a): tidak menyimpan');
  const bkEndTrig = $('trip-book-form').querySelector('[data-ical-trig^="bk-end-cal"]');
  assert.strictEqual(bkEndTrig.getAttribute('aria-invalid'), 'true', 'B3 Desktop Book (b < a): end trigger aria-invalid="true"');
  assert.strictEqual(doc.activeElement, bkEndTrig, 'B3 Desktop Book (b < a): fokus ke kolom tanggal keluar');
  assert.strictEqual($('bk-date-err').textContent.trim(), expectedBkOrderMsg, 'B3 Desktop Book (b < a): pesan inline persis');

  // B5 Desktop: tautan pemesanan (kosong, tanpa skema, >400, tidak valid) + sama di Itinerary
  w.BR_STATE.inlineDates.bkStart = '2026-12-12';
  w.BR_STATE.inlineDates.bkEnd = '2026-12-21';
  $('bk-title').value = 'Uji Link Booking';
  $('bk-amt').value = '800000';
  // > 400 karakter -> tolak
  $('bk-link').value = 'https://contoh.com/' + 'a'.repeat(390);
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pC1().bk.length, bkBeforeLen, 'B5 Desktop Book: > 400 karakter ditolak');
  assert.strictEqual($('bk-link').getAttribute('aria-invalid'), 'true', 'B5 Desktop Book: #bk-link aria-invalid="true"');
  assert.strictEqual($('bk-link-err').textContent.trim(), 'Tautan terlalu panjang (maks. 400 karakter).', 'B5 Desktop Book: pesan inline > 400 persis');
  // Tidak valid -> tolak
  $('bk-link').value = 'javascript:alert(1)';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(pC1().bk.length, bkBeforeLen, 'B5 Desktop Book: URL javascript ditolak');
  assert.strictEqual($('bk-link-err').textContent.trim(), 'Tautan tidak valid. Gunakan alamat web, mis. https://contoh.com', 'B5 Desktop Book: pesan inline URL invalid persis');
  // Tanpa skema -> auto https:// & tersimpan ke bk.link
  $('bk-link').value = 'contoh.com/tiket-kereta';
  fire($('trip-book-form'), 'submit');
  const savedBkLink = pC1().bk.find((x) => x.title === 'Uji Link Booking');
  assert.ok(savedBkLink && savedBkLink.link === 'https://contoh.com/tiket-kereta', 'B5 Desktop Book: tanpa skema otomatis https:// dan tersimpan ke bk.link');
  // Mode Ubah membawa #bk-link
  click($('trip-root').querySelector('[data-bk-edit="' + savedBkLink.id + '"]'));
  assert.strictEqual($('bk-link').value, 'https://contoh.com/tiket-kereta', 'B5 Desktop Book Ubah: memuat #bk-link');
  click($('trip-root').querySelector('[data-bk-cancel="1"]'));

  // B5 Itinerary validasi sama (>400, invalid, auto-https)
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  w.BR_STATE.inlineDates.itDay = '2026-12-15';
  $('it-place').value = 'Uji Link Itin';
  $('it-link').value = 'https://contoh.com/' + 'b'.repeat(390);
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('it-link-err').textContent.trim(), 'Tautan terlalu panjang (maks. 400 karakter).', 'B5 Desktop Itin: pesan inline > 400 persis');
  $('it-link').value = 'bukan url';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('it-link-err').textContent.trim(), 'Tautan tidak valid. Gunakan alamat web, mis. https://contoh.com', 'B5 Desktop Itin: pesan inline URL invalid persis');
  $('it-link').value = 'maps.google.com/?q=sapporo';
  fire($('trip-itin-form'), 'submit');
  const savedItLink = pC1().it.find((x) => x.place === 'Uji Link Itin');
  assert.ok(savedItLink && savedItLink.link === 'https://maps.google.com/?q=sapporo', 'B5 Desktop Itin: auto https://');

  // B3: Mempersempit rentang perjalanan memicu askConfirm "N item berada di luar rentang baru. Tetap simpan?"
  click($('br-trip-edit'));
  w.BR_STATE.inlineDates.kpStart = '2026-12-16';
  w.BR_STATE.inlineDates.kpEnd = '2026-12-17';
  fire($('trip-meta-form'), 'submit');
  const cfmOut = doc.querySelector('.modal.cfm');
  assert.ok(cfmOut && /\d+\s+item berada di luar rentang baru\. Tetap simpan\?/.test(cfmOut.textContent), 'B3 Desktop Meta Edit: muncul konfirmasi N item di luar rentang baru');
  // Batal -> start/end belum berubah
  click(cfmOut.querySelector('[data-cf-n]'));
  assert.strictEqual(pC1().start, '2026-12-12', 'B3 Desktop Meta Edit: Batal tidak mengubah rentang');
  // Submit ulang & pilih Tetap simpan
  fire($('trip-meta-form'), 'submit');
  const cfmOut2 = doc.querySelector('.modal.cfm');
  click(cfmOut2.querySelector('[data-cf-y]'));
  assert.strictEqual(pC1().start, '2026-12-16', 'B3 Desktop Meta Edit: Tetap simpan memperbarui rentang');

  // Tanpa rentang lengkap (start/end kosong): bebas menyimpan tanggal apa saja
  pC1().start = '';
  pC1().end = '';
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  w.BR_STATE.inlineDates.itDay = '2027-02-01';
  $('it-place').value = 'Bebas Tanpa Rentang';
  fire($('trip-itin-form'), 'submit');
  assert.ok(pC1().it.some((x) => x.place === 'Bebas Tanpa Rentang' && x.day === '2027-02-01'), 'B3 Desktop: tanpa rentang lengkap bebas menyimpan tanggal mana pun');

  delete w.ALL.kas.pr['p-t12a-c1'];

  // =========================================================================
  // C2: BUTIR 1, 2, 6 — Akordeon Hari, Tautan Kartu, Tombol Tampilkan/Sembunyikan
  // =========================================================================
  w.setShellMode('browser');
  w.ALL.kas.pr['p-t12a-c2'] = {
    id: 'p-t12a-c2',
    name: 'Kyoto C2',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-12',
    end: '2026-12-14', // 3 hari: 12, 13 (kosong), 14
    budget: 10000000,
    cur: 'JPY',
    rate: 105,
    dt: { '2026-12-12': 'Hari Tiba di Kyoto' },
    it: [
      {
        id: 'c2-i-long',
        day: '2026-12-12',
        time: '09:00',
        time2: '12:00',
        place: 'Jelajah Fushimi Inari Taisha Gerbang Senbon Torii Puncak Gunung Inari',
        est: 2000,
        fx: true,
        pay: 'cash',
        cat: 'Tiket & Tour',
        link: 'https://www.klook.com/id/activity/999-fushimi-inari/?utm_source=abc',
        note: 'Catatan panjang kegiatan untuk uji tombol Tampilkan dan Sembunyikan pada kartu.',
        done: false,
      },
      {
        id: 'c2-i-short',
        day: '2026-12-12',
        time: '15:00',
        time2: '',
        place: 'Kopi Kyoto',
        est: 500,
        fx: true,
        pay: 'cash',
        cat: 'Makan',
        link: 'javascript:alert(1)',
        note: 'Ringkas',
        done: false,
      },
      {
        id: 'c2-i-d3',
        day: '2026-12-14',
        time: '10:00',
        time2: '',
        place: 'Arashiyama Bamboo Grove <img src=x onerror=alert(1)>',
        est: 1000,
        fx: true,
        pay: 'cash',
        cat: 'Tiket & Tour',
        link: 'https://www.sub.arashiyama.jp/"><script>alert(1)</script>',
        note: '',
        done: false,
      },
    ],
    bk: [
      {
        id: 'c2-b-long',
        title: 'Tiket Shinkansen Nozomi Tokyo ke Kyoto PP Kursi Jendela Gunung Fuji',
        amt: 28000,
        fx: true,
        paid: true,
        cat: 'Transport',
        a: '2026-12-12',
        b: '2026-12-14',
        pay: 'on',
        link: 'https://www.smart-ex.jp/en/index.php',
        rec: '',
      },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setMode('trip');
  w.setTrip('p-t12a-c2');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  if (w.BR_STATE.tripOpenDays) delete w.BR_STATE.tripOpenDays['p-t12a-c2'];
  if (w.BR_STATE.tripExpandedItems) w.BR_STATE.tripExpandedItems = {};
  w.renderTrip();

  // B6 Desktop: akordeon bawaan tertutup (3 hari, termasuk 2026-12-13 kosong)
  const dayTogsD = [...$('trip-root').querySelectorAll('[data-it-day-tog]')];
  assert.strictEqual(dayTogsD.length, 3, 'B6 Desktop Itin: ada 3 header hari akordeon');
  assert.ok(dayTogsD.every((b) => b.tagName === 'BUTTON' && b.getAttribute('aria-expanded') === 'false'), 'B6 Desktop Itin: semua header hari <button> bawaan aria-expanded="false"');
  dayTogsD.forEach((b) => {
    const pid = b.getAttribute('aria-controls');
    const panel = pid && doc.getElementById(pid);
    assert.ok(panel && panel.hidden === true, 'B6 Desktop Itin: panel hari bawaan hidden=true');
  });
  assert.ok(dayTogsD[0].textContent.includes('2 kegiatan'), 'B6 Desktop Itin: header hari 1 memuat jumlah 2 kegiatan');
  assert.ok(dayTogsD[1].textContent.includes('0 kegiatan'), 'B6 Desktop Itin: hari kosong tetap tampil dg 0 kegiatan');

  // Buka hari 1 via klik header & verifikasi persisten saat renderTrip()
  click(dayTogsD[0]);
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-12"]').getAttribute('aria-expanded'), 'true', 'B6 Desktop: klik header membuka hari 1');
  assert.strictEqual(doc.getElementById(dayTogsD[0].getAttribute('aria-controls')).hidden, false, 'B6 Desktop: panel hari 1 visible setelah dibuka');
  w.renderTrip();
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-12"]').getAttribute('aria-expanded'), 'true', 'B6 Desktop: status terbuka bertahan setelah renderTrip');
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-14"]').getAttribute('aria-expanded'), 'false', 'B6 Desktop: hari lain tetap tertutup');

  // Tombol Buka semua / Tutup semua
  const foldAllBtn = $('br-it-fold-all');
  assert.ok(foldAllBtn && /Buka semua/i.test(foldAllBtn.textContent), 'B6 Desktop: tombol Buka semua tampil bila ada hari tertutup');
  click(foldAllBtn);
  assert.ok([...$('trip-root').querySelectorAll('[data-it-day-tog]')].every((b) => b.getAttribute('aria-expanded') === 'true'), 'B6 Desktop: Buka semua membuka seluruh hari');
  assert.ok(/Tutup semua/i.test($('br-it-fold-all').textContent), 'B6 Desktop: label berubah menjadi Tutup semua');
  assert.ok(doc.getElementById('it-day-panel-2026-12-13').textContent.includes('Belum ada kegiatan'), 'B6 Desktop: hari kosong dibuka memuat Belum ada kegiatan');
  click($('br-it-fold-all'));
  assert.ok([...$('trip-root').querySelectorAll('[data-it-day-tog]')].every((b) => b.getAttribute('aria-expanded') === 'false'), 'B6 Desktop: Tutup semua menutup seluruh hari');

  // Auto-buka hari saat Ubah kegiatan di hari tertutup
  click($('trip-root').querySelector('[data-trip-it-edit="c2-i-long"]'));
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-12"]').getAttribute('aria-expanded'), 'true', 'B6 Desktop: klik Ubah otomatis membuka hari kegiatan tersebut');
  click($('trip-root').querySelector('[data-it-cancel="1"]'));

  // B2 Desktop: tautan kartu Itinerary (domain tanpa www., hanya http(s), esc XSS, target _blank rel noopener noreferrer)
  const rowLong = $('trip-root').querySelector('[data-it-row="c2-i-long"]');
  const rowShort = $('trip-root').querySelector('[data-it-row="c2-i-short"]');
  const rowD3 = $('trip-root').querySelector('[data-it-row="c2-i-d3"]');
  const linkLongEl = rowLong.querySelector('.trip-card-link');
  assert.ok(linkLongEl && linkLongEl.tagName === 'A', 'B2 Desktop Itin: chip tautan berupa <a>');
  assert.strictEqual(linkLongEl.getAttribute('href'), 'https://www.klook.com/id/activity/999-fushimi-inari/?utm_source=abc', 'B2 Desktop Itin: href utuh');
  assert.strictEqual(linkLongEl.getAttribute('title'), 'https://www.klook.com/id/activity/999-fushimi-inari/?utm_source=abc', 'B2 Desktop Itin: URL lengkap di title');
  assert.strictEqual(linkLongEl.getAttribute('target'), '_blank', 'B2 Desktop Itin: target="_blank"');
  assert.strictEqual(linkLongEl.getAttribute('rel'), 'noopener noreferrer', 'B2 Desktop Itin: rel="noopener noreferrer"');
  assert.ok(linkLongEl.textContent.trim().includes('klook.com') && !linkLongEl.textContent.includes('www.'), 'B2 Desktop Itin: domain tampil tanpa www.');
  assert.ok(linkLongEl.querySelector('svg'), 'B2 Desktop Itin: ada ikon SVG link inline');
  assert.strictEqual(rowShort.querySelector('.trip-card-link'), null, 'B2 Desktop Itin: tautan javascript: tidak dirender');
  assert.strictEqual(rowD3.querySelector('.trip-card-link'), null, 'B2 Desktop Itin: tautan XSS "><script> tidak lolos okUrl');
  assert.ok(!rowD3.innerHTML.includes('<img src=x') && !rowD3.innerHTML.includes('<script>'), 'B2 Desktop XSS: semua teks dinamis ter-escape');

  // B1 Desktop: tombol Tampilkan/Sembunyikan hanya saat scrollHeight > clientHeight + 1 atau scrollWidth > clientWidth + 1
  const moreLongBtn = rowLong.querySelector('[data-it-more="c2-i-long"]');
  const moreShortBtn = rowShort.querySelector('[data-it-more="c2-i-short"]');
  assert.ok(moreLongBtn && moreShortBtn, 'B1 Desktop Itin: tombol toggle ada di DOM');
  assert.strictEqual(moreLongBtn.hidden, true, 'B1 Desktop Itin: hidden sebelum terpotong');
  assert.strictEqual(moreShortBtn.hidden, true, 'B1 Desktop Itin: item pendek hidden');

  // Stub terpotong hanya pada c2-i-long (via scrollWidth > clientWidth + 1 pada nama kegiatan)
  const placeLongEl = rowLong.querySelector('.trip-it-place');
  const noteLongEl = rowLong.querySelector('.trip-it-note');
  Object.defineProperty(placeLongEl, 'scrollWidth', { configurable: true, get: () => 420 });
  Object.defineProperty(placeLongEl, 'clientWidth', { configurable: true, get: () => 180 });
  Object.defineProperty(noteLongEl, 'scrollHeight', { configurable: true, get: () => 48 });
  Object.defineProperty(noteLongEl, 'clientHeight', { configurable: true, get: () => 20 });
  w.tripRefreshTruncation($('trip-root'), w.BR_STATE.tripExpandedItems);
  assert.strictEqual(moreLongBtn.hidden, false, 'B1 Desktop Itin: tombol Tampilkan muncul saat terpotong');
  assert.strictEqual(moreLongBtn.textContent.trim(), 'Tampilkan', 'B1 Desktop Itin: label awal Tampilkan');
  assert.strictEqual(moreLongBtn.getAttribute('aria-expanded'), 'false', 'B1 Desktop Itin: aria-expanded="false" awal');
  assert.ok(moreLongBtn.getAttribute('aria-controls'), 'B1 Desktop Itin: memiliki aria-controls');
  assert.strictEqual(moreShortBtn.hidden, true, 'B1 Desktop Itin: item tidak terpotong tetap hidden');

  click(moreLongBtn);
  assert.ok(rowLong.classList.contains('is-expanded'), 'B1 Desktop Itin: klik Tampilkan menambah kelas is-expanded');
  assert.strictEqual(moreLongBtn.textContent.trim(), 'Sembunyikan', 'B1 Desktop Itin: label berubah menjadi Sembunyikan');
  assert.strictEqual(moreLongBtn.getAttribute('aria-expanded'), 'true', 'B1 Desktop Itin: aria-expanded="true"');
  assert.strictEqual(w.BR_STATE.tripExpandedItems['c2-i-long'], true, 'B1 Desktop Itin: status tersimpan di state tampilan');
  assert.strictEqual(w.ALL.kas.pr['p-t12a-c2'].it[0].expanded, undefined, 'B1 Desktop Itin: tidak mengotori data perjalanan');

  w.renderTrip();
  const rowLongAfter = $('trip-root').querySelector('[data-it-row="c2-i-long"]');
  const moreAfter = rowLongAfter.querySelector('[data-it-more="c2-i-long"]');
  assert.ok(rowLongAfter.classList.contains('is-expanded'), 'B1 Desktop Itin: status expanded bertahan saat renderTrip ulang');
  assert.strictEqual(moreAfter.hidden, false, 'B1 Desktop Itin: tombol Sembunyikan tetap tampil sesudah renderTrip');
  assert.strictEqual(moreAfter.textContent.trim(), 'Sembunyikan', 'B1 Desktop Itin: label Sembunyikan bertahan saat renderTrip');

  click(moreAfter);
  assert.strictEqual(w.BR_STATE.tripExpandedItems['c2-i-long'], false, 'B1 Desktop Itin: klik Sembunyikan menutup kembali');

  // B1 + B2 Paritas Pemesanan Desktop
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  const bkRow = $('trip-root').querySelector('[data-bk-row="c2-b-long"]');
  const bkLinkEl = bkRow.querySelector('.trip-card-link');
  assert.ok(bkLinkEl && bkLinkEl.tagName === 'A' && bkLinkEl.textContent.includes('smart-ex.jp') && !bkLinkEl.textContent.includes('www.'), 'B2 Desktop Book: chip tautan smart-ex.jp tanpa www.');
  const bkTitleEl = bkRow.querySelector('.trip-bk-title');
  const bkMoreBtn = bkRow.querySelector('[data-bk-more="c2-b-long"]');
  assert.ok(bkMoreBtn && bkMoreBtn.hidden === true, 'B1 Desktop Book: tombol tersembunyi sebelum terpotong');
  Object.defineProperty(bkTitleEl, 'scrollWidth', { configurable: true, get: () => 450 });
  Object.defineProperty(bkTitleEl, 'clientWidth', { configurable: true, get: () => 200 });
  w.tripRefreshTruncation($('trip-root'), w.BR_STATE.tripExpandedItems);
  assert.strictEqual(bkMoreBtn.hidden, false, 'B1 Desktop Book: tombol Tampilkan muncul saat judul terpotong');
  click(bkMoreBtn);
  assert.ok(bkRow.classList.contains('is-expanded') && bkMoreBtn.textContent.trim() === 'Sembunyikan', 'B1 Desktop Book: toggle ke Sembunyikan berhasil');

  delete w.ALL.kas.pr['p-t12a-c2'];

  // =========================================================================
  // C3: BUTIR 7 & 8 — Tata Letak Form, Textarea Auto-Grow, Toast "Lihat"
  // =========================================================================
  w.setShellMode('browser');
  w.ALL.kas.pr['p-t12a-c3'] = {
    id: 'p-t12a-c3',
    name: 'Hokkaido C3',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-20',
    end: '2026-12-22',
    budget: 15000000,
    cur: 'JPY',
    rate: 105,
    dt: {},
    it: [
      { id: 'c3-i-edit', day: '2026-12-20', time: '09:00', time2: '10:00', place: 'Sapporo TV Tower', est: 1000, fx: true, pay: 'cash', cat: 'Tiket & Tour', link: '', note: 'Catatan awal', done: false },
    ],
    bk: [
      { id: 'c3-b-edit', title: 'Hotel Sapporo', amt: 15000, fx: true, paid: false, cat: 'Penginapan', a: '2026-12-20', b: '2026-12-22', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.setMode('trip');
  w.setTrip('p-t12a-c3');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  if (w.BR_STATE.tripOpenDays) delete w.BR_STATE.tripOpenDays['p-t12a-c3'];
  w.renderTrip();

  // B7 Desktop Itinerary: semua ID form tetap, kelas layout seragam Tambah & Ubah, textarea catatan + counter
  const itReqIdsD = ['it-t1', 'it-t2', 'it-place', 'it-est', 'it-cur', 'it-pay', 'it-cat', 'it-rt-wrap', 'it-rt', 'it-link', 'it-note', 'it-note-cnt'];
  itReqIdsD.forEach((id) => assert.ok($(id), 'B7 Desktop Itin: ID #' + id + ' tersedia'));
  const itFormAddD = $('trip-itin-form');
  assert.ok(itFormAddD.classList.contains('trip-form-layout'), 'B7 Desktop Itin: form memakai kelas .trip-form-layout');
  const itRowCountAddD = itFormAddD.querySelectorAll('.trip-form-row').length;
  assert.ok(itRowCountAddD >= 3, 'B7 Desktop Itin: memiliki baris .trip-form-row');
  assert.strictEqual($('it-note').tagName, 'TEXTAREA', 'B7 Desktop Itin: #it-note berupa <textarea>');
  assert.strictEqual($('it-note').getAttribute('maxlength'), '200', 'B7 Desktop Itin: maxlength 200');
  assert.strictEqual($('it-note-cnt').textContent.trim(), '0/200', 'B7 Desktop Itin: counter awal 0/200');
  Object.defineProperty($('it-note'), 'scrollHeight', { configurable: true, get: () => 88 });
  $('it-note').value = 'Catatan dua baris untuk menguji auto-grow dan penghitung karakter.';
  fire($('it-note'), 'input');
  assert.strictEqual($('it-note-cnt').textContent.trim(), $('it-note').value.length + '/200', 'B7 Desktop Itin: counter berubah live');

  // Switch ke Ubah Kegiatan -> kelas layout identik, counter terisi
  click($('trip-root').querySelector('[data-trip-it-edit="c3-i-edit"]'));
  assert.ok($('trip-itin-form').classList.contains('trip-form-layout'), 'B7 Desktop Itin Ubah: memakai .trip-form-layout');
  assert.strictEqual($('trip-itin-form').querySelectorAll('.trip-form-row').length, itRowCountAddD, 'B7 Desktop Itin: jumlah baris Tambah dan Ubah identik');
  assert.strictEqual($('it-note-cnt').textContent.trim(), '12/200', 'B7 Desktop Itin Ubah: counter awal sesuai panjang catatan');

  // B8 Desktop: Ubah Kegiatan -> toast "Kegiatan diperbarui" TANPA tombol Lihat
  $('it-place').value = 'Sapporo Clock Tower';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Kegiatan diperbarui', 'B8 Desktop Ubah: pesan Kegiatan diperbarui');
  assert.ok(!$('tt-act') || $('tt-act').hidden === true, 'B8 Desktop Ubah: TIDAK ada tombol Lihat saat Ubah');

  // B7 Desktop Book: semua ID form tetap & kelas layout identik Tambah & Ubah
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  ['bk-title', 'bk-amt', 'bk-cur', 'bk-rt-wrap', 'bk-rt', 'bk-cat', 'bk-link'].forEach((id) => assert.ok($(id), 'B7 Desktop Book: ID #' + id + ' tersedia'));
  const bkFormAddD = $('trip-book-form');
  assert.ok(bkFormAddD.classList.contains('trip-form-layout'), 'B7 Desktop Book: memakai .trip-form-layout');
  const bkRowCountAddD = bkFormAddD.querySelectorAll('.trip-form-row').length;
  click($('trip-root').querySelector('[data-bk-edit="c3-b-edit"]'));
  assert.strictEqual($('trip-book-form').querySelectorAll('.trip-form-row').length, bkRowCountAddD, 'B7 Desktop Book: jumlah baris Tambah dan Ubah identik');
  click($('trip-root').querySelector('[data-bk-cancel="1"]'));

  // B8 Desktop: Kompatibilitas mundur toast() lama + uji timer 7000ms + jeda hover/fokus + resume + klik Lihat
  w.toast('Pesan Biasa');
  assert.strictEqual($('ttm').textContent, 'Pesan Biasa', 'B8 Compat: toast 1 arg');
  assert.ok(!$('tt-act') || $('tt-act').hidden === true, 'B8 Compat: toast 1 arg tanpa tombol Lihat');
  let undoCalledD = false;
  w.toast('Bisa Urung', () => { undoCalledD = true; });
  assert.strictEqual($('ttu').hidden, false, 'B8 Compat: toast 2 arg menampilkan Urungkan');
  click($('ttu'));
  assert.strictEqual(undoCalledD, true, 'B8 Compat: klik Urungkan memanggil callback');

  // Tambah Kegiatan baru di hari tertutup (2026-12-22) -> tutup semua hari dulu
  w.BR_STATE.tripSubTab = 'itin';
  if (w.BR_STATE.tripOpenDays) delete w.BR_STATE.tripOpenDays['p-t12a-c3'];
  w.renderTrip();

  // Tangkap durasi setTimeout untuk verifikasi 7000ms + pause/resume
  const origSetTO = w.setTimeout;
  const origClrTO = w.clearTimeout;
  const scheduledD = [];
  let fakeTidD = 9000;
  w.setTimeout = function (fn, ms) {
    const id = ++fakeTidD;
    scheduledD.push({ id, fn, ms, cleared: false });
    return id;
  };
  w.clearTimeout = function (id) {
    const hit = scheduledD.find((x) => x.id === id);
    if (hit) hit.cleared = true;
  };

  w.BR_STATE.inlineDates.itDay = '2026-12-22';
  $('it-place').value = 'Otaru Canal Malam';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Kegiatan disimpan', 'B8 Desktop Tambah Itin: teks Kegiatan disimpan');
  assert.strictEqual($('tt').hidden, false, 'B8 Desktop Tambah Itin: toast tampil');
  assert.ok($('tt-act') && $('tt-act').hidden === false && /Lihat/.test($('tt-act').textContent), 'B8 Desktop Tambah Itin: tombol Lihat tampil');
  assert.ok($('tt-cls') && $('tt-cls').hidden === false, 'B8 Desktop Tambah Itin: tombol tutup × tampil');
  const timerAddD = scheduledD[scheduledD.length - 1];
  assert.ok(timerAddD && timerAddD.ms >= 6900 && timerAddD.ms <= 7100, 'B8 Desktop Tambah Itin: durasi default ~7000ms (got ' + (timerAddD && timerAddD.ms) + ')');

  // Hari 2026-12-22 TIDAK otomatis dibuka & item baru TIDAK otomatis disorot sebelum "Lihat" diklik
  const newItD = w.ALL.kas.pr['p-t12a-c3'].it.find((x) => x.place === 'Otaru Canal Malam');
  assert.ok(newItD, 'B8 Desktop: item tersimpan');
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-22"]').getAttribute('aria-expanded'), 'false', 'B8 Desktop: hari tertutup TIDAK otomatis dibuka sebelum Lihat diklik');
  assert.strictEqual($('trip-root').querySelector('[data-it-row="' + newItD.id + '"]').classList.contains('rk-row-highlight'), false, 'B8 Desktop: baris TIDAK otomatis tersorot sebelum Lihat diklik');

  // Jeda saat hover/fokus & lanjut saat leave
  fire($('tt'), 'mouseenter');
  assert.strictEqual(timerAddD.cleared, true, 'B8 Desktop: timer dijeda saat mouseenter');
  fire($('tt'), 'mouseleave');
  const resumedTimerD = scheduledD[scheduledD.length - 1];
  assert.ok(resumedTimerD.id !== timerAddD.id && resumedTimerD.ms > 0, 'B8 Desktop: timer dilanjutkan sisa waktunya saat mouseleave');

  // Klik tombol tutup × -> langsung menutup toast tanpa pindah
  click($('tt-cls'));
  assert.strictEqual($('tt').hidden, true, 'B8 Desktop: klik × menutup toast');

  // Tambah satu item lagi untuk uji klik "Lihat" lintas sub-tab ("book" -> klik Lihat -> pindah ke "itin", buka hari, scroll, sorot)
  w.BR_STATE.inlineDates.itDay = '2026-12-22';
  $('it-place').value = 'Biei Blue Pond';
  fire($('trip-itin-form'), 'submit');
  const newItD2 = w.ALL.kas.pr['p-t12a-c3'].it.find((x) => x.place === 'Biei Blue Pond');
  // Pindah ke tab lain sebelum klik "Lihat"
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  click($('tt-act'));
  assert.strictEqual($('tt').hidden, true, 'B8 Desktop: klik Lihat menutup toast');
  assert.strictEqual(w.BR_STATE.tripSubTab, 'itin', 'B8 Desktop Lihat: kembali ke sub-tab itin');
  assert.strictEqual($('trip-root').querySelector('[data-it-day-tog="2026-12-22"]').getAttribute('aria-expanded'), 'true', 'B8 Desktop Lihat: otomatis membuka akordeon hari item');
  const hlRowD = $('trip-root').querySelector('[data-it-row="' + newItD2.id + '"]');
  assert.ok(hlRowD && hlRowD.classList.contains('rk-row-highlight'), 'B8 Desktop Lihat: memasang kelas rk-row-highlight');
  // Jalankan timer cleanup sorot
  const hlTimerD = scheduledD[scheduledD.length - 1];
  assert.ok(hlTimerD && hlTimerD.ms >= 1500 && hlTimerD.ms <= 2100, 'B8 Desktop Lihat: timer hapus sorot ~1600-2000ms');
  hlTimerD.fn();
  assert.strictEqual($('trip-root').querySelector('[data-it-row="' + newItD2.id + '"]').classList.contains('rk-row-highlight'), false, 'B8 Desktop Lihat: kelas sorot dibersihkan setelah timer');

  // Uji prefers-reduced-motion: reduce -> kelas statis & tidak crash
  const origMatchMediaD = w.matchMedia;
  w.matchMedia = (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q), addEventListener() {}, removeEventListener() {} });
  w.tripFocusItemFromToast('p-t12a-c3', 'itin', newItD2.id, false);
  const hlRowRedD = $('trip-root').querySelector('[data-it-row="' + newItD2.id + '"]');
  assert.ok(hlRowRedD.classList.contains('rk-row-highlight') && hlRowRedD.classList.contains('rk-row-highlight-static'), 'B8 Desktop reduced-motion: memakai rk-row-highlight-static');
  scheduledD[scheduledD.length - 1].fn();
  w.matchMedia = origMatchMediaD;

  // Pemesanan baru -> Lihat -> sub-tab book + sorot; lalu hapus item -> klik Lihat -> toast "Kegiatan tidak ditemukan"
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  $('bk-title').value = 'JR Hokkaido Pass';
  $('bk-amt').value = '25000';
  fire($('trip-book-form'), 'submit');
  const newBkD = w.ALL.kas.pr['p-t12a-c3'].bk.find((x) => x.title === 'JR Hokkaido Pass');
  assert.strictEqual($('ttm').textContent, 'Pemesanan disimpan', 'B8 Desktop Book: toast Pemesanan disimpan');
  assert.strictEqual($('tt-act').hidden, false, 'B8 Desktop Book: tombol Lihat tampil saat Pemesanan disimpan');
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  click($('tt-act'));
  assert.strictEqual(w.BR_STATE.tripSubTab, 'book', 'B8 Desktop Book Lihat: pindah ke sub-tab book');
  assert.ok($('trip-root').querySelector('[data-bk-row="' + newBkD.id + '"]').classList.contains('rk-row-highlight'), 'B8 Desktop Book Lihat: menyorot baris pemesanan');

  // Item sudah terhapus saat tombol Lihat diklik -> pesan ramah tanpa galat
  w.ALL.kas.pr['p-t12a-c3'].it = [];
  w.tripFocusItemFromToast('p-t12a-c3', 'itin', 'id-sudah-dihapus', false);
  assert.strictEqual($('ttm').textContent, 'Kegiatan tidak ditemukan', 'B8 Desktop Missing: toast "Kegiatan tidak ditemukan"');

  w.setTimeout = origSetTO;
  w.clearTimeout = origClrTO;
  delete w.ALL.kas.pr['p-t12a-c3'];

  // Service Worker CACHE_NAME dinaikkan menjadi rk-cache-v33 (>= 33)
  const fs = require('fs');
  const path = require('path');
  const swSrc12a = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
  const swVer12a = swSrc12a.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert.ok(swVer12a && Number(swVer12a[1]) >= 33, 'C3 sw.js: CACHE_NAME harus dinaikkan minimal rk-cache-v33');
  assert.ok(/['"]rk-cache-v33['"]/.test(swSrc12a), 'C3 sw.js: CACHE_NAME memakai rk-cache-v33');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap12a_ux (C1-C3)');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap12a_ux:', e);
  process.exit(1);
});
