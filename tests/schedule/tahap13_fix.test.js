// Verifikasi Tahap 13 (Butir 1+2): Popup Harga Aktual (3 keadaan x Desktop/APK), data-actual-mode, audit [hidden], & regresi 12B/12B.1.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');
const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  const fireInput = (el, val) => {
    el.value = val;
    el.dispatchEvent(new w.Event('input', { bubbles: true, cancelable: true }));
  };

  // Fixture perjalanan campuran Rp & NOK/JPY
  w.ALL.kas.pr['p-t13-b12'] = {
    id: 'p-t13-b12',
    name: 'Uji Tahap 13 Popup',
    cur: 'NOK',
    rate: 1500,
    fxs: [{ c: 'JPY', r: 100 }],
    budget: 30000000,
    start: '2026-11-21',
    end: '2026-11-25',
    dt: {},
    it: [
      { id: 't13-it-rp', day: '2026-11-21', time: '09:00', place: 'Sewa Sepeda Rp', est: 500000, fx: false, pay: 'cash', cat: 'Transport' },
      { id: 't13-it-fx', day: '2026-11-21', time: '12:00', place: 'Tour Fuji NOK', est: 5000, fx: true, pay: 'cash', cat: 'Tiket & Tour' },
      { id: 't13-it-au', day: '2026-11-21', time: '15:00', place: 'Oleh-oleh Ber-AU', est: 500000, fx: false, pay: 'cash', cat: 'Belanja', ax: 250, au: 'NOK' },
    ],
    bk: [
      { id: 't13-bk-rp', title: 'Tiket Bus Rp', a: '2026-11-21', b: '2026-11-21', amt: 500000, fx: false, paid: false, cat: 'Transport' },
      { id: 't13-bk-fx', title: 'Hotel Oslo NOK', a: '2026-11-21', b: '2026-11-23', amt: 6000, fx: true, paid: false, cat: 'Penginapan' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };

  const assertDisplayNone = (id, msg) => {
    const el = $(id);
    if (!el) return;
    assert.strictEqual(w.getComputedStyle(el).display, 'none', msg + ' (computed display=' + w.getComputedStyle(el).display + ')');
  };
  const assertVisibleBlock = (id, msg) => {
    const el = $(id);
    assert.ok(el, msg + ' (elemen tidak ditemukan)');
    assert.notStrictEqual(w.getComputedStyle(el).display, 'none', msg + ' (seharusnya tampil, bukan none)');
    assert.strictEqual(el.hidden, false, msg + ' (atribut hidden seharusnya false)');
  };

  // =========================================================================
  // BUTIR 1+2 DESKTOP & APK: TIGA KEADAAN x (ITINERARY, PEMESANAN)
  // =========================================================================
  for (const shellCfg of [
    {
      name: 'Desktop',
      enter: () => {
        w.setShellMode('browser');
        w.setMode('trip');
        w.setTrip('p-t13-b12');
        w.BR_STATE.tripView = 'detail';
      },
      setSub: (sub) => {
        w.BR_STATE.tripSubTab = sub;
        w.renderTrip();
        if ($('br-it-fold-all') && $('br-it-fold-all').textContent.includes('Buka')) click($('br-it-fold-all'));
      },
      rootSel: '#trip-root',
      modalId: 'modal-trip-actual',
      pfx: 'act-m',
      formId: 'trip-actual-form',
      itAttr: 'data-it-act',
      bkAttr: 'data-bk-act',
      foldBtnId: 'br-it-fold-all',
    },
    {
      name: 'APK',
      enter: () => {
        w.setShellMode('mobile-app');
        w.switchMobileTab('trip');
        w.MOB_STATE.tripId = 'p-t13-b12';
        w.MOB_STATE.tripView = 'detail';
      },
      setSub: (sub) => {
        w.MOB_STATE.tripSub = sub;
        w.renderMobTrip();
        if ($('m-it-fold-all') && $('m-it-fold-all').textContent.includes('Buka')) click($('m-it-fold-all'));
      },
      rootSel: '#m-trip-root',
      modalId: 'm-sheet-actual',
      pfx: 'm-act',
      formId: 'm-trip-actual-form',
      itAttr: 'data-mit-act',
      bkAttr: 'data-mbk-act',
      foldBtnId: 'm-it-fold-all',
    },
  ]) {
    shellCfg.enter();
    const g = (s) => shellCfg.pfx + '-' + s;

    for (const pair of [
      { sub: 'itin', attr: shellCfg.itAttr, rpId: 't13-it-rp', fxId: 't13-it-fx' },
      { sub: 'book', attr: shellCfg.bkAttr, rpId: 't13-bk-rp', fxId: 't13-bk-fx' },
    ]) {
      shellCfg.setSub(pair.sub);

      // (a) Item Rupiah, kotak centang tidak dicentang
      click(w.document.querySelector(shellCfg.rootSel + ' [' + pair.attr + '="' + pair.rpId + '"]'));
      assert.strictEqual($(shellCfg.modalId).getAttribute('data-actual-mode'), 'rp', shellCfg.name + ' ' + pair.sub + ' (a): data-actual-mode harus rp');
      assertVisibleBlock(g('est'), shellCfg.name + ' ' + pair.sub + ' (a): est tampil');
      assertVisibleBlock(g('ax'), shellCfg.name + ' ' + pair.sub + ' (a): kotak Rp tampil');
      assertVisibleBlock(g('fx-toggle-wrap'), shellCfg.name + ' ' + pair.sub + ' (a): checkbox tampil');
      assert.strictEqual($(g('use-fx')).checked, false, shellCfg.name + ' ' + pair.sub + ' (a): checkbox default tidak dicentang');
      assertVisibleBlock(g('prev'), shellCfg.name + ' ' + pair.sub + ' (a): prev tampil');
      assertVisibleBlock(g('cancel'), shellCfg.name + ' ' + pair.sub + ' (a): Batal tampil');
      assertVisibleBlock(g('save'), shellCfg.name + ' ' + pair.sub + ' (a): Simpan tampil');
      assertDisplayNone(g('au-wrap'), shellCfg.name + ' ' + pair.sub + ' (a): pemilih mata uang WAJIB display none');
      assertDisplayNone(g('ak-wrap'), shellCfg.name + ' ' + pair.sub + ' (a): kolom kurs WAJIB display none');
      assertDisplayNone(g('ak-read'), shellCfg.name + ' ' + pair.sub + ' (a): teks Terbaca WAJIB display none');
      assertDisplayNone(g('ak-help'), shellCfg.name + ' ' + pair.sub + ' (a): teks Kosong= WAJIB display none');
      assertDisplayNone(g('del'), shellCfg.name + ' ' + pair.sub + ' (a): tombol Hapus aktual tanpa ax WAJIB display none');

      // Isi nominal Rp, lalu centang FX -> mode (b), ingat nilai Rp & FX saat bolak-balik!
      fireInput($(g('ax')), '350000');
      $(g('use-fx')).checked = true;
      fire($(g('use-fx')), 'change');

      // (b) Item Rupiah, kotak centang dicentang
      assert.strictEqual($(shellCfg.modalId).getAttribute('data-actual-mode'), 'fx', shellCfg.name + ' ' + pair.sub + ' (b): data-actual-mode harus fx');
      assertVisibleBlock(g('ax'), shellCfg.name + ' ' + pair.sub + ' (b): nominal asing tampil');
      assertVisibleBlock(g('au-wrap'), shellCfg.name + ' ' + pair.sub + ' (b): dropdown mata uang tampil');
      assertVisibleBlock(g('ak-wrap'), shellCfg.name + ' ' + pair.sub + ' (b): kolom kurs tampil');
      assertVisibleBlock(g('ak-help'), shellCfg.name + ' ' + pair.sub + ' (b): teks bantu kurs tampil');
      assert.ok($(g('au')).options.length >= 2 && $(g('au')).selectedIndex === 0 && $(g('au')).value === 'NOK', shellCfg.name + ' ' + pair.sub + ' (b): opsi pertama (NOK) terpilih default, tidak pernah kosong');
      fireInput($(g('ax')), '250');
      fireInput($(g('ak')), '1500');
      assertVisibleBlock(g('ak-read'), shellCfg.name + ' ' + pair.sub + ' (b): Terbaca tampil saat kurs diisi');

      // Hapus centang kembali -> nilai Rp 350.000 tetap diingat & kolom asing benar-benar hilang!
      $(g('use-fx')).checked = false;
      fire($(g('use-fx')), 'change');
      assert.strictEqual($(shellCfg.modalId).getAttribute('data-actual-mode'), 'rp', shellCfg.name + ' ' + pair.sub + ' (a2): kembali ke mode rp');
      assert.strictEqual($(g('ax')).value.replace(/\D/g, ''), '350000', shellCfg.name + ' ' + pair.sub + ' (a2): nominal Rp yang diketik sebelumnya diingat');
      assertDisplayNone(g('au-wrap'), shellCfg.name + ' ' + pair.sub + ' (a2): pemilih mata uang hilang kembali');
      assertDisplayNone(g('ak-wrap'), shellCfg.name + ' ' + pair.sub + ' (a2): kolom kurs hilang kembali');
      assertDisplayNone(g('ak-read'), shellCfg.name + ' ' + pair.sub + ' (a2): Terbaca hilang kembali');
      assertDisplayNone(g('ak-help'), shellCfg.name + ' ' + pair.sub + ' (a2): teks bantu kurs hilang kembali');
      click($(g('cancel')));

      // (c) Item bermata uang asing (fx: true) -> TANPA checkbox, TANPA dropdown au!
      click(w.document.querySelector(shellCfg.rootSel + ' [' + pair.attr + '="' + pair.fxId + '"]'));
      assert.strictEqual($(shellCfg.modalId).getAttribute('data-actual-mode'), 'fxplan', shellCfg.name + ' ' + pair.sub + ' (c): data-actual-mode harus fxplan');
      assertDisplayNone(g('fx-toggle-wrap'), shellCfg.name + ' ' + pair.sub + ' (c): checkbox WAJIB tersembunyi');
      assertDisplayNone(g('au-wrap'), shellCfg.name + ' ' + pair.sub + ' (c): dropdown Mata uang WAJIB tersembunyi');
      assert.strictEqual($(g('au')).options.length, 0, shellCfg.name + ' ' + pair.sub + ' (c): select Mata uang kosong tanpa opsi pada item FX');
      assertVisibleBlock(g('ax'), shellCfg.name + ' ' + pair.sub + ' (c): nominal asing tampil');
      assertVisibleBlock(g('ak-wrap'), shellCfg.name + ' ' + pair.sub + ' (c): kolom kurs tampil');
      assert.ok($(g('ax-lbl')).textContent.includes('NOK'), shellCfg.name + ' ' + pair.sub + ' (c): label memuat kode mata uang item (NOK)');
      assert.ok($(g('ak-lbl')).textContent.includes('NOK'), shellCfg.name + ' ' + pair.sub + ' (c): label kurs memuat NOK');
      assertDisplayNone(g('del'), shellCfg.name + ' ' + pair.sub + ' (c): tombol Hapus tanpa ax tersembunyi');
      click($(g('cancel')));
    }

    // Item Rupiah yang sudah punya au tersimpan -> buka modal -> otomatis tercentang (b)
    shellCfg.setSub('itin');
    click(w.document.querySelector(shellCfg.rootSel + ' [' + shellCfg.itAttr + '="t13-it-au"]'));
    assert.strictEqual($(shellCfg.modalId).getAttribute('data-actual-mode'), 'fx', shellCfg.name + ' ber-au: data-actual-mode fx');
    assert.strictEqual($(g('use-fx')).checked, true, shellCfg.name + ' ber-au: checkbox otomatis dicentang');
    assertVisibleBlock(g('au-wrap'), shellCfg.name + ' ber-au: dropdown tampil');
    assertVisibleBlock(g('del'), shellCfg.name + ' ber-au: tombol Hapus tampil karena ax > 0');
    click($(g('cancel')));
  }

  // Simpan item FX di APK memastikan tidak menulis au
  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = 'p-t13-b12';
  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  click(w.document.querySelector('#m-trip-root [data-mbk-act="t13-bk-fx"]'));
  fireInput($('m-act-ax'), '6200');
  fireInput($('m-act-ak'), '1550');
  fire($('m-trip-actual-form'), 'submit');
  const savedBkFx = w.ALL.kas.pr['p-t13-b12'].bk.find((x) => x.id === 't13-bk-fx');
  assert.strictEqual(savedBkFx.ax, 6200, 'T13 APK item FX: ax tersimpan');
  assert.strictEqual(savedBkFx.ak, 1550, 'T13 APK item FX: ak tersimpan');
  assert.strictEqual(savedBkFx.au, undefined, 'T13 APK item FX: au TIDAK ditulis');

  // Regresi rumus 12B & 12B.1
  const vp12b = w.tripVsPlan({
    cur: 'JPY',
    rate: 100,
    it: [{ id: 'r1', day: '2026-11-21', place: 'Makan Malam', est: 5000, fx: true, pay: 'cash', ax: 6200, ak: 107 }],
    bk: [],
  });
  assert.strictEqual(vp12b.diff, 163400, 'Regresi 12B ¥5.000@100 -> ¥6.200@107: diff = 163.400');
  assert.strictEqual(vp12b.efekHarga, 120000, 'Regresi 12B: efekHarga = 120.000');
  assert.strictEqual(vp12b.efekKurs, 43400, 'Regresi 12B: efekKurs = 43.400');

  const pNokBase = {
    cur: 'JPY',
    rate: 100,
    fxs: [{ c: 'NOK', r: 1500 }],
    it: [{ id: 'r2', day: '2026-11-21', place: 'Sepeda', est: 500000, fx: false, pay: 'cash', ax: 250, au: 'NOK' }],
    bk: [],
  };
  assert.strictEqual(w.tripActualRp(pNokBase, pNokBase.it[0]), 375000, 'Regresi 12B.1 Rp 500k -> NOK 250 @1.500 = 375.000');
  const pNokAk = Object.assign({}, pNokBase, { it: [Object.assign({}, pNokBase.it[0], { ak: 1600 })] });
  assert.strictEqual(w.tripActualRp(pNokAk, pNokAk.it[0]), 400000, 'Regresi 12B.1 Rp 500k -> NOK 250 ak=1.600 = 400.000');

  // Audit CSS: mobile.css & desktop.css memiliki aturan [hidden] { display: none !important; } yang efektif
  const mobCss = fs.readFileSync(path.join(__dirname, '..', '..', 'css', 'mobile.css'), 'utf8');
  assert.ok(/#mobile-app-shell\s+\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i.test(mobCss), 'Audit CSS APK: #mobile-app-shell [hidden] { display: none !important; } wajib ada');

  delete w.ALL.kas.pr['p-t13-b12'];
  w.MOB_STATE.tripId = null;

  // =========================================================================
  // BUTIR 4 (APK): BAR SUB-TAB PERJALANAN TIDAK RESET KE AWAL
  // =========================================================================
  w.ALL.kas.pr['p-t13-b4'] = {
    id: 'p-t13-b4',
    name: 'Uji Bar Sub-Tab B4',
    cur: 'JPY',
    rate: 100,
    start: '2026-11-21',
    end: '2026-11-25',
    it: [],
    bk: [],
    ck: [{ id: 'b4-ck1', text: 'Paspor', done: false }],
    lk: [],
    note: '',
    goal: null,
  };
  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = 'p-t13-b4';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';

  // Pasang stub layout di HTMLElement.prototype sementara agar bertahan lintas innerHTML
  const origDesc = {
    sw: Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'scrollWidth'),
    cw: Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'clientWidth'),
    ol: Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'offsetLeft'),
    ow: Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'offsetWidth'),
    st: Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'scrollTo'),
  };
  const chipLayout = {
    ring: [0, 84],
    itin: [90, 76],
    book: [172, 92],
    cek: [270, 80],
    cat: [356, 76],
    sv: [438, 86],
  };
  const scrollToCalls = [];
  let mockReducedMotion = false;
  const origMatchMedia = w.matchMedia;
  try {
    Object.defineProperty(w.HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() { return this.id === 'm-trip-subnav' ? 530 : (origDesc.sw && origDesc.sw.get ? origDesc.sw.get.call(this) : 0); },
    });
    Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() { return this.id === 'm-trip-subnav' ? 320 : (origDesc.cw && origDesc.cw.get ? origDesc.cw.get.call(this) : 0); },
    });
    Object.defineProperty(w.HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get() {
        const s = this.getAttribute && this.getAttribute('data-mtripsub');
        return (s && chipLayout[s]) ? chipLayout[s][0] : (origDesc.ol && origDesc.ol.get ? origDesc.ol.get.call(this) : 0);
      },
    });
    Object.defineProperty(w.HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        const s = this.getAttribute && this.getAttribute('data-mtripsub');
        return (s && chipLayout[s]) ? chipLayout[s][1] : (origDesc.ow && origDesc.ow.get ? origDesc.ow.get.call(this) : 0);
      },
    });
    w.HTMLElement.prototype.scrollTo = function (opts) {
      if (this.id === 'm-trip-subnav' && opts && typeof opts === 'object') {
        scrollToCalls.push({ left: opts.left, behavior: opts.behavior || 'auto' });
        this.scrollLeft = opts.left;
      } else if (origDesc.st && origDesc.st.value) {
        return origDesc.st.value.apply(this, arguments);
      }
    };
    w.matchMedia = (q) => ({
      matches: q.includes('prefers-reduced-motion') ? mockReducedMotion : false,
      media: q,
      addListener() {},
      removeListener() {},
    });

    w.renderMobTrip();
    const getNav = () => w.document.querySelector('#m-trip-subnav');
    assert.ok(getNav(), 'B4: bar sub-tab #m-trip-subnav terpasang di detail perjalanan');

    // 1. Geser bar ke kanan penuh (210px), klik Tabungan ("sv": left 438, w 86, vis [210..530] -> sudah terlihat penuh!)
    getNav().scrollLeft = 210;
    click(w.document.querySelector('#m-trip-subnav [data-mtripsub="sv"]'));
    assert.ok(getNav().scrollLeft > 0 && getNav().scrollLeft >= 200, 'B4: scrollLeft tidak reset ke 0 setelah menekan Tabungan (scrollLeft=' + getNav().scrollLeft + ')');
    const svChip = w.document.querySelector('#m-trip-subnav [data-mtripsub="sv"]');
    assert.strictEqual(svChip.getAttribute('aria-selected'), 'true', 'B4 A11y: Tabungan aria-selected="true"');
    assert.strictEqual(svChip.getAttribute('aria-current'), 'page', 'B4 A11y: Tabungan aria-current="page"');
    assert.strictEqual(w.document.querySelector('#m-trip-subnav [data-mtripsub="ring"]').getAttribute('aria-selected'), 'false', 'B4 A11y: Ringkasan aria-selected="false"');

    // 2. Klik tab di luar tampilan kiri ("cek" saat scrollLeft=210, atau kembali ke "ring" saat scrollLeft=210 -> ring left=0..84 < 210 -> digeser smooth agar terlihat!)
    scrollToCalls.length = 0;
    getNav().scrollLeft = 210;
    w.MOB_STATE._tripSubScrollLeft = 210;
    click(w.document.querySelector('#m-trip-subnav [data-mtripsub="itin"]'));
    assert.ok(scrollToCalls.some((c) => c.behavior === 'smooth'), 'B4: saat tab di luar tampilan, gulir memakai behavior smooth');
    assert.ok(getNav().scrollLeft <= 90, 'B4: Itinerary (left=90, w=76) berada dalam rentang tampilan (scrollLeft=' + getNav().scrollLeft + ')');

    // 3. prefers-reduced-motion memakai behavior 'auto'
    mockReducedMotion = true;
    scrollToCalls.length = 0;
    click(w.document.querySelector('#m-trip-subnav [data-mtripsub="sv"]'));
    assert.ok(getNav().scrollLeft >= 200, 'B4 reduced-motion: Tabungan masuk tampilan (scrollLeft=' + getNav().scrollLeft + ')');
    assert.ok(scrollToCalls.every((c) => c.behavior === 'auto'), 'B4 reduced-motion: tidak memakai smooth scrolling');
    mockReducedMotion = false;

    // 4. Re-render ulang non-tab (checklist centang) mempertahankan scrollLeft
    const prevSlCk = getNav().scrollLeft;
    click(w.document.querySelector('#m-trip-subnav [data-mtripsub="cek"]'));
    getNav().scrollLeft = 185;
    w.MOB_STATE._tripSubScrollLeft = 185;
    const cb = w.document.querySelector('[data-mck-tog="b4-ck1"]');
    cb.checked = true;
    fire(cb, 'change');
    assert.strictEqual(getNav().scrollLeft, 185, 'B4: centang checklist (syncUI re-render) mempertahankan scrollLeft');

    // 5. Masuk detail dari daftar -> bar reset ke 0 dan Ringkasan aktif
    click(w.document.querySelector('[data-mtrip-list]'));
    click(w.document.querySelector('[data-mtrip-sel="p-t13-b4"]'));
    assert.strictEqual(getNav().scrollLeft, 0, 'B4: buka perjalanan dari daftar reset bar ke posisi awal (scrollLeft=0)');
    assert.strictEqual(w.MOB_STATE.tripSub, 'ring', 'B4: buka dari daftar aktif di ring');

    // 6. Drag suppression initMobDragSliders tetap menjaga klik pasca-drag terblokir
    w.initMobDragSliders();
    assert.strictEqual(getNav().dataset.dragInit, '1', 'B4: drag-slider aktif setelah renderMobTrip');
  } finally {
    if (origDesc.sw) Object.defineProperty(w.HTMLElement.prototype, 'scrollWidth', origDesc.sw);
    if (origDesc.cw) Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', origDesc.cw);
    if (origDesc.ol) Object.defineProperty(w.HTMLElement.prototype, 'offsetLeft', origDesc.ol);
    if (origDesc.ow) Object.defineProperty(w.HTMLElement.prototype, 'offsetWidth', origDesc.ow);
    if (origDesc.st) Object.defineProperty(w.HTMLElement.prototype, 'scrollTo', origDesc.st);
    w.matchMedia = origMatchMedia;
  }

  delete w.ALL.kas.pr['p-t13-b4'];
  w.MOB_STATE.tripId = null;

  // ===========================================================================
  // BUTIR 3 (datepick.js opt-in data-pk-sheet + APK Mode Perjalanan bottom sheet)
  // ===========================================================================
  {
    const { JSDOM: SubJSDOM } = require('jsdom');
    const dpDom = new SubJSDOM(
      '<!DOCTYPE html><html><body>' +
      '<input id="old-d" type="date" value="2026-11-21">' +
      '<input id="new-d" type="date" value="2026-11-21" min="2026-11-10" max="2026-11-25" data-pk-sheet="1" data-pk-title="Pilih tanggal mulai">' +
      '</body></html>',
      { runScripts: 'outside-only', pretendToBeVisual: true }
    );
    const dw = dpDom.window;
    const dd = dw.document;
    dw.MutationObserver = undefined;
    dw.FULL_MON = w.FULL_MON;
    dw.MON = w.MON;
    dw.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    try {
      dw.eval(fs.readFileSync(path.join(ROOT, 'js/ui/datepick.js'), 'utf8'));
      dw.upPickers();

      const oldInp = dd.getElementById('old-d');
      const oldBtn = oldInp.parentElement.querySelector('.pk-in');
      oldBtn.getBoundingClientRect = () => ({ left: 20, right: 200, top: 80, bottom: 116 });
      oldBtn.click();
      assert.strictEqual(dd.querySelector('.pk-sheet-backdrop'), null, 'B3 datepick tanpa atribut: TIDAK membuat sheet backdrop');
      const oldPop = dd.querySelector('.pk.pk-cal');
      assert.ok(oldPop && !oldPop.classList.contains('pk-sheet'), 'B3 datepick tanpa atribut: memakai popup .pk.pk-cal lama');
      assert.strictEqual(oldPop.querySelector('[data-pk-cancel]'), null, 'B3 datepick tanpa atribut: tanpa tombol Batal sheet');
      dw.dispatchEvent(new dw.Event('scroll'));
      assert.strictEqual(dd.querySelector('.pk.pk-cal'), null, 'B3 datepick tanpa atribut: tetap menutup saat window scroll');

      const newInp = dd.getElementById('new-d');
      const newBtn = newInp.parentElement.querySelector('.pk-in');
      newBtn.click();
      const backdrop = dd.querySelector('.pk-sheet-backdrop');
      assert.ok(backdrop, 'B3 datepick data-pk-sheet: membuka .pk-sheet-backdrop');
      const sheet = backdrop.querySelector('.pk.pk-cal.pk-sheet[role="dialog"]');
      assert.ok(sheet && sheet.getAttribute('aria-modal') === 'true', 'B3 datepick data-pk-sheet: dialog modal aria-modal="true"');
      assert.ok(sheet.textContent.includes('Pilih tanggal mulai'), 'B3 datepick data-pk-sheet: judul sheet tampil');
      assert.ok(sheet.querySelector('[data-pk-cancel]') && sheet.querySelector('[data-t="1"]'), 'B3 datepick data-pk-sheet: tombol Hari ini & Batal tersedia');
      assert.strictEqual(sheet.querySelector('[data-d="2026-11-05"]').disabled, true, 'B3 datepick data-pk-sheet: min dihormati');
      assert.strictEqual(sheet.querySelector('[data-d="2026-11-28"]').disabled, true, 'B3 datepick data-pk-sheet: max dihormati');

      // Window scroll & resize tidak menutup sheet opt-in
      dw.dispatchEvent(new dw.Event('scroll'));
      dw.dispatchEvent(new dw.Event('resize'));
      assert.ok(dd.querySelector('.pk-sheet-backdrop'), 'B3 datepick data-pk-sheet: TIDAK tertutup oleh scroll/resize');

      // Escape menutup sheet dan mengembalikan fokus ke tombol pemicu
      dd.dispatchEvent(new dw.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assert.strictEqual(dd.querySelector('.pk-sheet-backdrop'), null, 'B3 datepick data-pk-sheet: Escape menutup sheet');
      assert.strictEqual(dd.activeElement, newBtn, 'B3 datepick data-pk-sheet: fokus kembali ke tombol pemicu setelah Escape');

      // Pilih tanggal baru & cek input/change
      newBtn.click();
      let inpCnt = 0, chgCnt = 0;
      newInp.addEventListener('input', () => inpCnt++);
      newInp.addEventListener('change', () => chgCnt++);
      dd.querySelector('.pk-sheet [data-d="2026-11-22"]').click();
      assert.strictEqual(newInp.value, '2026-11-22', 'B3 datepick data-pk-sheet: nilai diperbarui');
      assert.strictEqual(inpCnt, 1, 'B3 datepick data-pk-sheet: memicu input event');
      assert.strictEqual(chgCnt, 1, 'B3 datepick data-pk-sheet: memicu change event');
      assert.strictEqual(dd.querySelector('.pk-sheet-backdrop'), null, 'B3 datepick data-pk-sheet: menutup setelah memilih tanggal');
    } finally {
      dpDom.window.close();
    }
  }

  // APK Mode Perjalanan bottom sheet kalender (#m-cal-sheet-backdrop) & paritas non-Trip
  {
    w.ALL.kas.pr['p-t13-b3'] = {
      id: 'p-t13-b3',
      name: 'B3 Trip APK',
      cur: 'JPY',
      rate: 100,
      start: '2026-11-10',
      end: '2026-11-30',
      it: [],
      bk: [],
      ck: [],
      lk: [],
      note: '',
      goal: null,
    };
    w.switchMobileTab('kas');
    w.renderMobKas();
    const kasInp = w.document.getElementById('m-kas-date');
    assert.strictEqual(kasInp.hasAttribute('data-pk-sheet'), false, 'B3 non-Trip APK: m-kas-date TIDAK memakai opt-in data-pk-sheet');
    click(w.document.getElementById('m-kas-date-trig'));
    assert.ok(w.document.getElementById('m-kas-date-cal').classList.contains('open'), 'B3 non-Trip APK: m-kas-date tetap membuka .picker-popover lama');
    const calBdKas = w.document.getElementById('m-cal-sheet-backdrop');
    assert.ok(!calBdKas || !calBdKas.classList.contains('open'), 'B3 non-Trip APK: m-kas-date tidak membuka #m-cal-sheet-backdrop');

    w.switchMobileTab('trip');
    w.MOB_STATE.tripId = 'p-t13-b3';
    w.MOB_STATE.tripView = 'list';
    w.renderMobTrip();
    click(w.document.getElementById('m-btn-trip-new'));
    assert.strictEqual(w.document.getElementById('m-kp-start').hasAttribute('data-pk-sheet'), false, 'B3 Trip sheet (Tahap 19b): m-kp-start seragam memakai .picker-popover');
    assert.strictEqual(w.document.getElementById('m-kp-end').hasAttribute('data-pk-sheet'), false, 'B3 Trip sheet (Tahap 19b): m-kp-end seragam memakai .picker-popover');

    // Buka kalender Mulai -> popover seragam Mode Keuangan terbuka & Nov 30 tersedia
    w.MOB_CAL_VIEW['m-kp-start'] = { y: 2026, m: 10 };
    click(w.document.getElementById('m-kp-start-trig'));
    const kpStartCal = w.document.getElementById('m-kp-start-cal');
    assert.ok(kpStartCal && kpStartCal.classList.contains('open'), 'B3 APK m-kp-start: membuka .picker-popover.open seragam');
    assert.ok(kpStartCal.querySelector('[data-mcal-pick="m-kp-start|2026-11-30"]'), 'B3 APK Nov 2026: tanggal 30 ada di grid');

    // Pilih tanggal 21 Nov 2026 -> memperbarui m-kp-start & tutup popover
    click(kpStartCal.querySelector('[data-mcal-pick="m-kp-start|2026-11-21"]'));
    assert.strictEqual(w.document.getElementById('m-kp-start').value, '2026-11-21', 'B3 APK: memilih tanggal memperbarui nilai m-kp-start');
    assert.strictEqual(kpStartCal.classList.contains('open'), false, 'B3 APK: popover kalender menutup setelah memilih tanggal');

    // Buka kalender Selesai -> tanggal sebelum Mulai (2026-11-15) disabled (min = Mulai)
    w.MOB_CAL_VIEW['m-kp-end'] = { y: 2026, m: 10 };
    click(w.document.getElementById('m-kp-end-trig'));
    const kpEndCal = w.document.getElementById('m-kp-end-cal');
    assert.ok(kpEndCal && kpEndCal.classList.contains('open'), 'B3 APK m-kp-end: membuka .picker-popover.open seragam');
    const disEnd15 = kpEndCal.querySelector('[data-mcal-pick="m-kp-end|2026-11-15"]');
    const enEnd25 = kpEndCal.querySelector('[data-mcal-pick="m-kp-end|2026-11-25"]');
    assert.ok(disEnd15 && disEnd15.disabled, 'B3 APK m-kp-end: tanggal sebelum Mulai disabled');
    assert.ok(enEnd25 && !enEnd25.disabled, 'B3 APK m-kp-end: tanggal >= Mulai aktif');

    // Android Back saat kalender terbuka di atas #m-sheet-trip -> menutup kalender dulu, sheet Perjalanan masih terbuka
    w.Capacitor = { isNativePlatform: () => true };
    const r1 = w.rkHandleAndroidBack();
    assert.ok(r1, 'B3 Android Back 1: menangani back saat kalender terbuka');
    assert.strictEqual(kpEndCal.classList.contains('open'), false, 'B3 Android Back 1: kalender menutup lebih dulu');
    assert.strictEqual(w.document.getElementById('m-sheet-trip').classList.contains('open'), true, 'B3 Android Back 1: #m-sheet-trip tetap terbuka');
    const r2 = w.rkHandleAndroidBack();
    assert.strictEqual(r2, 'sheet', 'B3 Android Back 2: baru menutup #m-sheet-trip');
    delete w.Capacitor;

    // Itinerary (m-it-day) & Pemesanan (m-bk-start, m-bk-end) seragam memakai .picker-popover
    w.MOB_STATE.tripView = 'detail';
    w.MOB_STATE.tripSub = 'itin';
    w.renderMobTrip();
    assert.strictEqual(w.document.getElementById('m-it-day').hasAttribute('data-pk-sheet'), false, 'B3 APK Itin: m-it-day seragam .picker-popover');
    click(w.document.getElementById('m-it-day-trig'));
    const itCal = w.document.getElementById('m-it-day-cal');
    assert.ok(itCal && itCal.classList.contains('open'), 'B3 APK Itin: membuka .picker-popover.open');
    assert.strictEqual(itCal.querySelector('[data-mcal-pick="m-it-day|2026-11-05"]').disabled, true, 'B3 APK Itin: di luar rentang trip disabled');
    click(w.document.getElementById('m-trip-root'));
    assert.strictEqual(itCal.classList.contains('open'), false, 'B3 APK: ketuk luar menutup popover kalender');

    w.MOB_STATE.tripSub = 'book';
    w.renderMobTrip();
    assert.strictEqual(w.document.getElementById('m-bk-start').hasAttribute('data-pk-sheet'), false, 'B3 APK Book: m-bk-start seragam .picker-popover');
    assert.strictEqual(w.document.getElementById('m-bk-end').hasAttribute('data-pk-sheet'), false, 'B3 APK Book: m-bk-end seragam .picker-popover');
    click(w.document.getElementById('m-bk-start-trig'));
    const bkStartCal = w.document.getElementById('m-bk-start-cal');
    assert.ok(bkStartCal && bkStartCal.classList.contains('open'), 'B3 APK Book start: membuka .picker-popover.open');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.strictEqual(bkStartCal.classList.contains('open'), false, 'B3 APK: tombol Esc menutup popover kalender');

    // CSS guard + sw.js CACHE_NAME >= v36
    const mobCss = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
    assert.ok(mobCss.includes('.m-cal-sheet-backdrop') && mobCss.includes('max-height: min(86dvh, 520px)'), 'B3 CSS: aturan .m-cal-sheet-backdrop & max-height min(86dvh, 520px) hadir');
    const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const swVer = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
    assert.ok(swVer && Number(swVer[1]) >= 36, 'sw.js: CACHE_NAME naik ke rk-cache-v36 (saat ini: ' + (swVer && swVer[0]) + ')');

    delete w.ALL.kas.pr['p-t13-b3'];
    w.MOB_STATE.tripId = null;
  }

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.join(' | '));
  console.log('OK tahap13_fix');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap13_fix:', e);
  process.exit(1);
});
