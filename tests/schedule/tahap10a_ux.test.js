// Verifikasi Tahap 10A: A1 (bug dropdown Anggaran), A2 (toast semua aksi + tes penjaga), A3 (scroll otomatis saat Ubah + kembali saat Simpan/Batal).
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;
  const doc = w.document;

  const keyEv = (el, key, opts) =>
    el.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, opts || {})));

  // --- A1. Dropdown Anggaran Desktop & APK + Keyboard .mselect ---
  w.setShellMode('browser');
  w.setMode('trip');
  w.BR_STATE.tripView = 'list';
  w.renderTrip();
  click($('br-trip-new'));

  const kpSel = $('kp-use-budget');
  assert.strictEqual(kpSel.value, '0', 'A1 Desktop: default #kp-use-budget adalah 0 (Belum ditentukan)');
  assert.deepStrictEqual(
    [...kpSel.options].map((o) => [o.value, o.textContent.trim()]),
    [['0', 'Belum ditentukan'], ['1', 'Tetapkan anggaran']],
    'A1 Desktop: label opsi Anggaran konsisten'
  );
  assert.strictEqual($('kp-budget-wrap').style.display, 'none', 'A1 Desktop: #kp-budget-wrap tersembunyi saat default 0');
  assert.strictEqual($('kp-budget').value, '', 'A1 Desktop: #kp-budget kosong tanpa angka karangan');
  assert.strictEqual(kpSel.closest('.field').style.gridColumn, '1 / -1', 'A1 Desktop: dropdown Anggaran mengisi lebar penuh saat field anggaran tersembunyi');

  // Toggle Desktop 0 -> 1 -> 0
  kpSel.value = '1';
  fire(kpSel, 'change');
  assert.strictEqual($('kp-budget-wrap').style.display, 'flex', 'A1 Desktop: memilih 1 menampilkan #kp-budget-wrap');
  assert.strictEqual($('kp-budget').value, '', 'A1 Desktop: field anggaran tampil kosong siap diisi pengguna');
  assert.strictEqual(kpSel.closest('.field').style.gridColumn, '', 'A1 Desktop: kolom dropdown kembali 1 kolom saat #kp-budget-wrap tampil');

  kpSel.value = '0';
  fire(kpSel, 'change');
  assert.strictEqual($('kp-budget-wrap').style.display, 'none', 'A1 Desktop: kembali ke 0 menyembunyikan #kp-budget-wrap');

  // Keyboard navigation & fokus balik ke pemicu .mselect
  const msWrap = kpSel._mselect;
  assert.ok(msWrap, 'A1 Desktop: .mselect terpasang pada #kp-use-budget');
  const msTrig = msWrap.querySelector('.mselect-trigger');
  msTrig.focus();
  keyEv(msTrig, 'ArrowDown');
  assert.ok(msWrap.classList.contains('open'), 'A1 Keyboard: ArrowDown pada trigger membuka .mselect-menu');
  keyEv(msWrap, 'Escape');
  assert.ok(!msWrap.classList.contains('open'), 'A1 Keyboard: Escape menutup .mselect-menu');
  assert.ok(!$('modal-trip-form').hidden, 'A1 Keyboard: Escape menutup menu terlebih dulu tanpa menutup modal');
  assert.strictEqual(doc.activeElement, msTrig, 'A1 Keyboard: fokus kembali ke .mselect-trigger setelah Escape');

  // Simpan tanpa anggaran -> budget === 0
  $('kp-name').value = 'Garut Tanpa Anggaran';
  fire($('trip-meta-form'), 'submit');
  const garutId = Object.keys(w.ALL.kas.pr).find((k) => w.ALL.kas.pr[k].name === 'Garut Tanpa Anggaran');
  assert.ok(garutId, 'A1 Desktop: perjalanan tanpa anggaran berhasil tersimpan');
  assert.strictEqual(w.ALL.kas.pr[garutId].budget, 0, 'A1 Desktop: budget === 0');
  assert.strictEqual($('ttm').textContent, 'Perjalanan dibuat', 'A2 Desktop: toast Perjalanan dibuat');

  // Edit perjalanan tanpa anggaran -> value = '0'; ubah menjadi dengan anggaran -> value = '1'
  click($('br-trip-edit'));
  assert.strictEqual($('kp-use-budget').value, '0', 'A1 Desktop edit tanpa anggaran: memuat 0');
  $('kp-use-budget').value = '1';
  fire($('kp-use-budget'), 'change');
  $('kp-budget').value = '7500000';
  fire($('trip-meta-form'), 'submit');
  assert.strictEqual(w.ALL.kas.pr[garutId].budget, 7500000, 'A1 Desktop: budget diperbarui ke 7.500.000');
  assert.strictEqual($('ttm').textContent, 'Perjalanan diperbarui', 'A2 Desktop: toast Perjalanan diperbarui');
  click($('br-trip-edit'));
  assert.strictEqual($('kp-use-budget').value, '1', 'A1 Desktop edit beranggaran: memuat 1');
  assert.strictEqual($('kp-budget').value, '7.500.000', 'A1 Desktop edit beranggaran: memuat nominal terformat');
  click($('kpf-cancel'));

  // APK A1 parity check
  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');
  w.MOB_STATE.tripView = 'list';
  w.renderMobTrip();
  click($('m-btn-trip-new'));
  const mSel = $('m-kp-use-budget');
  assert.strictEqual(mSel.value, '0', 'A1 APK: default #m-kp-use-budget adalah 0');
  assert.deepStrictEqual(
    [...mSel.options].map((o) => [o.value, o.textContent.trim()]),
    [['0', 'Belum ditentukan'], ['1', 'Tetapkan anggaran']],
    'A1 APK: label opsi Anggaran sama persis dengan Desktop'
  );
  assert.strictEqual($('m-kp-budget-wrap').style.display, 'none', 'A1 APK: #m-kp-budget-wrap tersembunyi');
  assert.strictEqual($('m-kp-budget').value, '', 'A1 APK: #m-kp-budget kosong tanpa Rp 10.000.000');
  assert.strictEqual(mSel.closest('.field').style.gridColumn, '1 / -1', 'A1 APK: dropdown Anggaran lebar penuh saat field anggaran tersembunyi');
  mSel.value = '1';
  fire(mSel, 'change');
  assert.strictEqual($('m-kp-budget-wrap').style.display, 'flex', 'A1 APK: memilih 1 menampilkan #m-kp-budget-wrap');
  assert.strictEqual($('m-kp-budget').value, '', 'A1 APK: field muncul kosong dengan placeholder');
  mSel.value = '0';
  fire(mSel, 'change');
  $('m-kp-name').value = 'Malang Tanpa Anggaran';
  fire($('m-trip-meta-form'), 'submit');
  const malangId = Object.keys(w.ALL.kas.pr).find((k) => w.ALL.kas.pr[k].name === 'Malang Tanpa Anggaran');
  assert.strictEqual(w.ALL.kas.pr[malangId].budget, 0, 'A1 APK: simpan dengan 0 menghasilkan budget === 0');
  assert.strictEqual($('m-toast-box').textContent, 'Perjalanan dibuat', 'A2 APK: toast Perjalanan dibuat');
  assert.strictEqual($('m-toast-box').getAttribute('role'), 'status', 'A2 APK: #m-toast-box punya role="status"');
  assert.strictEqual($('m-toast-box').getAttribute('aria-live'), 'polite', 'A2 APK: #m-toast-box punya aria-live="polite"');
  w.mobCloseSheet('m-sheet-trip');

  // --- A2. Aksesibilitas Toast Desktop & Durasi (1.6 - 2.2s) ---
  const timeoutsMob = [];
  const origSetTO0 = w.setTimeout;
  w.setTimeout = function (fn, ms) { timeoutsMob.push(ms); return origSetTO0.apply(this, arguments); };
  w.showMobToast('Uji durasi apk');
  w.setTimeout = origSetTO0;
  assert.ok(timeoutsMob.length && timeoutsMob[timeoutsMob.length - 1] >= 1600 && timeoutsMob[timeoutsMob.length - 1] <= 2200, 'A2 APK: durasi toast non-undo di rentang 1600..2200 ms, didapat: ' + timeoutsMob[timeoutsMob.length - 1]);

  w.setShellMode('browser');
  assert.strictEqual($('tt').getAttribute('role'), 'status', 'A2 Desktop: #tt punya role="status"');
  assert.strictEqual($('tt').getAttribute('aria-live'), 'polite', 'A2 Desktop: #tt punya aria-live="polite"');

  const timeouts = [];
  const origSetTO = w.setTimeout;
  w.setTimeout = function (fn, ms) {
    timeouts.push(ms);
    return origSetTO.apply(this, arguments);
  };
  w.toast('Uji durasi');
  w.setTimeout = origSetTO;
  const deskDelay = timeouts[timeouts.length - 1];
  assert.ok(deskDelay >= 1600 && deskDelay <= 2200, 'A2 Desktop: durasi toast non-undo di rentang 1600..2200 ms, didapat: ' + deskDelay);

  // Fixture kaya untuk menguji semua aksi Desktop & APK + A3 scroll
  w.ALL.kas.pr['p-t10a'] = {
    id: 'p-t10a',
    name: 'Uji UX 10A',
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
      { id: '10a-i1', day: '2026-12-01', time: '09:00', time2: '', place: 'Asakusa', est: 1000, fx: true, pay: 'cash', cat: 'Tiket & Tour', link: '', note: '', done: false },
    ],
    bk: [
      { id: '10a-b1', title: 'Hotel Ueno', amt: 10000, fx: true, paid: false, cat: 'Penginapan', a: '2026-12-01', b: '2026-12-03', pay: 'on', link: '', rec: '' },
    ],
    lk: [{ id: '10a-l1', title: 'Peta Tokyo', url: 'https://maps.google.com' }],
    ck: [{ id: '10a-c1', text: 'Paspor', done: false }],
    note: '',
    goal: null,
  };

  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip('p-t10a');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();

  // Desktop: Tambah & Ubah kegiatan
  $('it-place').value = 'Ueno Park';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Kegiatan disimpan', 'A2 Desktop: toast Kegiatan disimpan');
  click($('trip-root').querySelector('[data-trip-it-edit="10a-i1"]'));
  $('it-place').value = 'Asakusa Kuil';
  fire($('trip-itin-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Kegiatan diperbarui', 'A2 Desktop: toast Kegiatan diperbarui');
  click($('trip-root').querySelector('[data-it-done="10a-i1"]'));
  assert.strictEqual($('ttm').textContent, 'Kegiatan ditandai selesai', 'A2 Desktop: toast selesai');
  click($('trip-root').querySelector('[data-it-done="10a-i1"]'));
  assert.strictEqual($('ttm').textContent, 'Status selesai dibatalkan', 'A2 Desktop: toast batal selesai');

  // Desktop: Judul hari
  const dtInp = $('trip-root').querySelector('[data-dt-day="2026-12-01"]');
  dtInp.value = 'Hari Pertama Tokyo';
  fire(dtInp, 'change');
  assert.strictEqual($('ttm').textContent, 'Judul hari disimpan', 'A2 Desktop: toast Judul hari disimpan');

  // Desktop: Pemesanan (tambah, ubah, lunas lock, batal lunas)
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  $('bk-title').value = 'Skyliner';
  $('bk-amt').value = '250000';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Pemesanan disimpan', 'A2 Desktop: toast Pemesanan disimpan');
  click($('trip-root').querySelector('[data-bk-edit="10a-b1"]'));
  fire($('trip-book-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Pemesanan diperbarui', 'A2 Desktop: toast Pemesanan diperbarui');
  click($('trip-root').querySelector('[data-bk-pay="10a-b1"]'));
  assert.strictEqual($('ttm').textContent, 'Ditandai lunas · Kurs terkunci: 1 JPY = Rp 100', 'A2 Desktop: satu toast gabungan lunas + kurs terkunci');
  click($('trip-root').querySelector('[data-bk-pay="10a-b1"]'));
  assert.strictEqual($('ttm').textContent, 'Lunas dibatalkan', 'A2 Desktop: toast Lunas dibatalkan');

  // Desktop: Checklist & daftar standar
  w.BR_STATE.tripSubTab = 'cek';
  w.renderTrip();
  $('trip-ck-input').value = 'Powerbank';
  fire($('trip-ck-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Checklist ditambahkan', 'A2 Desktop: toast Checklist ditambahkan');
  click($('br-trip-ck-std'));
  assert.strictEqual($('ttm').textContent, 'Daftar standar ditambahkan', 'A2 Desktop: toast Daftar standar ditambahkan');

  // Desktop: Tautan (valid + tidak valid) & Catatan
  w.BR_STATE.tripSubTab = 'cat';
  w.renderTrip();
  $('trip-lk-title').value = 'Bad URL';
  $('trip-lk-url').value = 'javascript:alert(1)';
  fire($('trip-lk-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Tautan tidak valid', 'A2 Desktop: toast galat Tautan tidak valid');
  $('trip-lk-title').value = 'Shinkansen';
  $('trip-lk-url').value = 'smart-ex.jp';
  fire($('trip-lk-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Tautan ditambahkan', 'A2 Desktop: toast Tautan ditambahkan');
  const noteElD = $('trip-note-box');
  noteElD.value = 'Kode KLOOK 12345';
  fire(noteElD, 'change');
  assert.strictEqual($('ttm').textContent, 'Catatan disimpan', 'A2 Desktop: toast Catatan disimpan');

  // Desktop: Target tabungan
  w.BR_STATE.tripSubTab = 'sv';
  w.renderTrip();
  $('tg-t').value = '6000000';
  $('tg-from').value = '2026-07';
  $('tg-to').value = '2026-12';
  fire($('trip-goal-form'), 'submit');
  assert.strictEqual($('ttm').textContent, 'Target tabungan disimpan', 'A2 Desktop: toast Target tabungan disimpan');

  // Desktop: Bagikan (Salin & PDF) + Template
  const origClip = w.navigator.clipboard;
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } });
  const origDl = w.rkDownloadBlob;
  w.rkDownloadBlob = () => ({ ok: true, method: 'mock', done: Promise.resolve({ ok: true, method: 'mock' }) });
  click($('br-trip-share'));
  click($('modal-trip-share').querySelector('[data-sh="copy"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual($('ttm').textContent, 'Teks disalin', 'A2 Desktop: toast Teks disalin');
  click($('modal-trip-share').querySelector('[data-sh="pdf"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual($('ttm').textContent, 'PDF disimpan', 'A2 Desktop: toast PDF disimpan');
  w.brCloseModal('modal-trip-share');
  w.rkDownloadBlob = origDl;
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: origClip });

  // A2 Guard Test: telusuri SEMUA tombol/kontrol aksi di seluruh tampilan Perjalanan Desktop & APK
  const DESK_ACTION_INVENTORY = new Set([
    // Ber-toast
    'id:br-trip-del', 'id:br-trip-tpl', 'id:br-trip-ck-std', 'id:br-tg-del',
    'form:trip-meta-form', 'form:trip-xl-form', 'form:trip-itin-form', 'form:trip-book-form',
    'form:trip-ck-form', 'form:trip-lk-form', 'form:trip-goal-form',
    'attr:data-it-done', 'attr:data-trip-it-del', 'attr:data-bk-pay', 'attr:data-bk-del',
    'attr:data-ck-del', 'attr:data-lk-del', 'attr:data-dt-day', 'id:trip-note-box', 'attr:data-sh',
    // Dikecualikan (navigasi / buka-tutup / centang checklist frekuensi tinggi / kalender)
    'id:br-trip-new', 'id:br-trip-xl', 'id:br-trip-back-list', 'id:br-trip-share', 'id:br-trip-edit',
    'id:br-tg-edit', 'id:br-tg-cancel', 'attr:data-trip-open', 'attr:data-trip-pick', 'attr:data-triptab',
    'attr:data-trip-it-edit', 'attr:data-it-cancel', 'attr:data-bk-edit', 'attr:data-bk-cancel',
    'attr:data-ck-tog', 'attr:data-ical-trig', 'attr:data-ical-mv', 'attr:data-ical-pick',
    // Tahap 12A C2 Akordeon & Tampilkan/Sembunyikan
    'id:br-it-fold-all', 'attr:data-it-day-tog', 'attr:data-it-more', 'attr:data-bk-more',
    // Tahap 12B C2 Harga Aktual
    'attr:data-it-act', 'attr:data-bk-act',
  ]);
  const collectDeskControls = () => {
    const found = [];
    $('trip-root').querySelectorAll('button, form, input[type="checkbox"], [data-dt-day], textarea#trip-note-box').forEach((el) => {
      if (el.tagName === 'FORM' && el.id) found.push('form:' + el.id);
      else if (el.id) found.push('id:' + el.id);
      else if (el.dataset) {
        for (const k of Object.keys(el.dataset)) {
          if (/^(tripOpen|tripPick|triptab|itDone|itAct|tripItEdit|itCancel|tripItDel|itDayTog|itMore|bkPay|bkAct|bkEdit|bkCancel|bkDel|bkMore|ckTog|ckDel|lkDel|dtDay|icalTrig)$/.test(k)) {
            const attrName = 'data-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
            found.push('attr:' + attrName);
          }
        }
      }
    });
    return found;
  };
  w.BR_STATE.tripView = 'list';
  w.renderTrip();
  const deskKeys = new Set(collectDeskControls());
  w.BR_STATE.tripView = 'detail';
  for (const sub of ['ring', 'itin', 'book', 'cek', 'cat', 'sv']) {
    w.BR_STATE.tripSubTab = sub;
    if (sub === 'sv') w.BR_STATE.tripGoalEdit = false;
    w.renderTrip();
    collectDeskControls().forEach((k) => deskKeys.add(k));
    if (sub === 'sv') {
      w.BR_STATE.tripGoalEdit = true;
      w.renderTrip();
      collectDeskControls().forEach((k) => deskKeys.add(k));
      w.BR_STATE.tripGoalEdit = false;
    }
  }
  const unlistedDesk = [...deskKeys].filter((k) => !DESK_ACTION_INVENTORY.has(k));
  assert.deepStrictEqual(unlistedDesk, [], 'A2 Guard Desktop: semua aksi Mode Perjalanan harus masuk inventaris atau pengecualian eksplisit');

  // --- A3. Scroll Otomatis saat Ubah + Fokus (Desktop only) + Reduced Motion + Kembali ke Baris ---
  const scrollCalls = [];
  let reduceMotionFlag = false;
  let focusedEl = null;
  const origMatchMedia = w.matchMedia;
  w.matchMedia = (q) => ({
    matches: /prefers-reduced-motion/.test(q) ? reduceMotionFlag : false,
    media: q,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  const origSIV = w.Element.prototype.scrollIntoView;
  w.Element.prototype.scrollIntoView = function (arg) {
    scrollCalls.push({ id: this.id || this.getAttribute('data-it-row') || this.getAttribute('data-bk-row') || this.tagName, arg });
  };
  const origFocus = w.HTMLElement.prototype.focus;
  w.HTMLElement.prototype.focus = function (arg) {
    focusedEl = { id: this.id, preventScroll: !!(arg && arg.preventScroll) };
    return origFocus.apply(this, arguments);
  };

  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  scrollCalls.length = 0;
  focusedEl = null;

  // Tandai selesai / centang TIDAK boleh memicu scrollIntoView
  click($('trip-root').querySelector('[data-it-done="10a-i1"]'));
  assert.strictEqual(scrollCalls.length, 0, 'A3 Desktop: tandai selesai tidak menggulir layar');

  // Ubah kegiatan -> scroll smooth ke kartu form + fokus #it-place dengan preventScroll:true
  click($('trip-root').querySelector('[data-trip-it-edit="10a-i1"]'));
  assert.strictEqual(scrollCalls.length, 1, 'A3 Desktop Ubah kegiatan: scrollIntoView dipanggil');
  assert.strictEqual(scrollCalls[0].arg.behavior, 'smooth', 'A3 Desktop: behavior smooth saat motion normal');
  assert.deepStrictEqual(focusedEl, { id: 'it-place', preventScroll: true }, 'A3 Desktop: fokus ke #it-place dengan preventScroll:true');

  // Batal ubah (baris di luar layar karena getBoundingClientRect() top=0 < 72) -> gulir kembali ke baris [data-it-row="10a-i1"]
  scrollCalls.length = 0;
  click($('trip-root').querySelector('[data-it-cancel="1"]'));
  assert.ok(scrollCalls.some((c) => c.id === '10a-i1'), 'A3 Desktop Batal kegiatan: gulir kembali ke baris item 10a-i1');

  // Uji prefers-reduced-motion: reduce -> behavior 'auto'
  reduceMotionFlag = true;
  scrollCalls.length = 0;
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  scrollCalls.length = 0;
  focusedEl = null;
  click($('trip-root').querySelector('[data-bk-pay="10a-b1"]'));
  assert.strictEqual(scrollCalls.length, 0, 'A3 Desktop: tandai lunas tidak memicu scroll');
  click($('trip-root').querySelector('[data-bk-edit="10a-b1"]'));
  assert.strictEqual(scrollCalls.length, 1, 'A3 Desktop Ubah pemesanan: memicu scroll ke form');
  assert.strictEqual(scrollCalls[0].arg.behavior, 'auto', 'A3 Desktop: reduced-motion memakai behavior auto');
  assert.deepStrictEqual(focusedEl, { id: 'bk-title', preventScroll: true }, 'A3 Desktop: fokus ke #bk-title dengan preventScroll:true');
  scrollCalls.length = 0;
  fire($('trip-book-form'), 'submit');
  assert.ok(scrollCalls.some((c) => c.id === '10a-b1'), 'A3 Desktop Simpan pemesanan: gulir kembali ke baris item 10a-b1');

  // Ubah Target Tabungan
  w.BR_STATE.tripSubTab = 'sv';
  w.renderTrip();
  scrollCalls.length = 0;
  focusedEl = null;
  click($('br-tg-edit'));
  assert.strictEqual(scrollCalls.length, 1, 'A3 Desktop Ubah Target Tabungan: memicu scroll');
  assert.deepStrictEqual(focusedEl, { id: 'tg-t', preventScroll: true }, 'A3 Desktop: fokus ke #tg-t dengan preventScroll:true');

  // Checklist centang tidak memicu scroll
  w.BR_STATE.tripSubTab = 'cek';
  w.renderTrip();
  scrollCalls.length = 0;
  const ckTog = $('trip-root').querySelector('[data-ck-tog]');
  ckTog.checked = true;
  fire(ckTog, 'change');
  assert.strictEqual(scrollCalls.length, 0, 'A3 Desktop: centang checklist tidak memicu scroll');

  // Kembalikan stub
  w.matchMedia = origMatchMedia;
  w.Element.prototype.scrollIntoView = origSIV;
  w.HTMLElement.prototype.focus = origFocus;

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap10a_ux');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap10a_ux:', e);
  process.exit(1);
});
