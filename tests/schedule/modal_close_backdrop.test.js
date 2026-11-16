const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  console.log('=== Menguji Tutup Modal Mockup (Tombol Tutup, Klik Backdrop, Escape) ===');

  w.switchYear(2028);
  w.S.items = [{ id: 99, name: 'Netflix', price: 186000, start: '2028-01-01', n: 1, unit: 'bulan', ch: [] }];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();

  const modals = [
    { id: 'yr-panel', open: () => click($('yr-btn')), closeBtn: () => $('yr-panel').querySelector('[data-close-modal="yr-panel"]') },
    { id: 'modal-scenario', open: () => w.openPm(99), closeBtn: () => $('modal-scenario').querySelector('[data-close-modal="modal-scenario"]') },
    { id: 'modal-quick-tx', open: () => w.brOpenModal('modal-quick-tx'), closeBtn: () => $('qtx-cancel') },
    { id: 'modal-backup', open: () => click($('bk')), closeBtn: () => $('modal-backup').querySelector('[data-close-modal="modal-backup"]') },
    { id: 'modal-trip-form', open: () => w.brOpenTripMetaModal(false), closeBtn: () => $('kpf-cancel') },
    { id: 'modal-report', open: () => w.openRepModal('m'), closeBtn: () => $('rep-m-cl') },
  ];

  for (const m of modals) {
    const el = $(m.id);
    assert(el && el.hidden === true && !el.classList.contains('open'), '#' + m.id + ' awalnya tertutup');

    // Buka & klik di dalam modal-box tidak menutup modal
    m.open();
    assert(!el.hidden && el.classList.contains('open'), '#' + m.id + ' terbuka');
    const box = el.querySelector('.modal-box');
    fire(box, 'mousedown');
    fire(box, 'click');
    assert(!el.hidden, 'klik di dalam modal-box tidak menutup #' + m.id);

    // Klik di luar (backdrop) menutup modal
    fire(el, 'mousedown');
    fire(el, 'click');
    assert(el.hidden && !el.classList.contains('open'), 'klik backdrop menutup #' + m.id);

    // Buka lagi & tombol Tutup menutup modal
    m.open();
    click(m.closeBtn());
    assert(el.hidden && !el.classList.contains('open'), 'tombol tutup menutup #' + m.id);

    // Buka lagi & Escape menutup modal
    m.open();
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(el.hidden && !el.classList.contains('open'), 'Escape menutup #' + m.id);
  }

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('Semua pengujian modal & backdrop Fiscal Atelier berhasil!');
  process.exit(0);
})();
