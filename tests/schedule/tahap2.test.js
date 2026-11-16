// Tahap 2: Rincian, menu Alat (tautan eksternal, cadangan, perjalanan), bilah bawah mobile, dan #modal-scenario.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const txt = (el) => el.textContent.replace(/\s+/g, ' ');
  const key = (k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const it = (o) => Object.assign({ id: 'x', name: 'T', price: 1000, n: 1, unit: 'sekali', start: '2026-11-20', ch: [], cat: '', end: '', cnt: 0 }, o);

  // ---------- 1. Rincian Hero & Grafik ----------
  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 5000000;
  w.S.items = [
    it({ id: 'a', name: 'Listrik', price: 200000, start: '2026-11-20' }),
    it({ id: 'b', name: 'DCA Saham', price: 600000, start: '2026-11-30', cat: 'Investasi' }),
    it({ id: 'c', name: 'Telat', price: 100000, start: '2026-11-02' }),
    it({ id: 'e', name: 'Cicilan', price: 1000000, start: '2026-12-05' }),
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [{ id: 'g1', d: '2026-12-01', t: '+', amt: 8000000, cat: 'Gaji', note: 'Gaji Des' }];
  w.renderAll();
  const hero = txt($('tab-rincian').querySelector('.stack > .card'));
  assert(!/Investasi \(aset\)/.test(hero), 'statistik investasi terpisah dihapus');
  assert(!/Di luar investasi/.test(hero), 'pengeluaran di luar investasi dihapus');
  assert($('tab-rincian').querySelector('#svg-cashflow'), 'grafik arus saldo tampil');

  // ---------- 2. Navigasi ----------
  const alatBtn = $('alat-btn'), alatMenu = $('alat-menu');
  assert(!alatMenu.classList.contains('open') && alatBtn.getAttribute('aria-expanded') === 'false', 'menu Alat tertutup awalnya');
  click(alatBtn);
  assert(alatMenu.classList.contains('open') && alatBtn.getAttribute('aria-expanded') === 'true', 'menu Alat terbuka');
  assert.strictEqual(alatMenu.querySelectorAll('a.alat-item').length, 2, 'dua tautan eksternal di menu (Rebalance, IBKR vs Flip)');
  key('Escape');
  assert(!alatMenu.classList.contains('open'), 'Escape menutup menu Alat');
  click(alatBtn);
  w.document.body.click();
  assert(!alatMenu.classList.contains('open'), 'klik di luar menutup menu Alat');

  const bar = w.document.querySelector('.mobile-bottom-nav'), btn = (k) => bar.querySelector('button[data-tab="' + k + '"]');
  const moreBtn = $('btn-mobile-more');
  assert.strictEqual(bar.querySelectorAll('button').length, 5, 'lima tujuan di bilah bawah');
  assert(btn('rincian').classList.contains('active'), 'Rincian aktif awalnya');
  click(btn('kas'));
  assert.strictEqual(w.curTab, 'kas');
  assert(!$('tab-kas').hidden && btn('kas').classList.contains('active'), 'tab Kas aktif');
  click(btn('item'));
  assert.strictEqual(w.curTab, 'item');
  assert(!$('tab-item').hidden && btn('item').classList.contains('active'), 'tab Kelola Item aktif');
  const sheet = $('mobile-more-sheet');
  click(moreBtn);
  assert(sheet.classList.contains('open'), 'lembar Lainnya terbuka');
  click(sheet.querySelector('[data-mob-go="trip"]'));
  assert.strictEqual(w.mode, 'trip');
  assert(!$('tab-trip').hidden, 'mode Perjalanan aktif dari Lainnya');
  click(btn('jadwal'));
  assert.strictEqual(w.mode, 'rencana', 'kembali ke mode Rencana');
  assert(w.curTab === 'jadwal' && !$('tab-jadwal').hidden && $('tab-trip').hidden, 'tab Jadwal aktif');
  click(moreBtn);
  click(sheet.querySelector('[data-mob-go="sim"]'));
  assert(!sheet.classList.contains('open') && w.curTab === 'sim', 'Simulasi dari Lainnya');
  click(moreBtn);
  click(sheet.querySelector('[data-mob-go="backup"]'));
  assert(!$('modal-backup').hidden && $('modal-backup').classList.contains('open'), 'Impor / Ekspor membuka #modal-backup');
  w.brCloseModal('modal-backup');
  click(btn('rincian'));

  // ---------- 3. Modal Skenario (#modal-scenario): Harga sementara & Berhenti bayar ----------
  w.S.items = [it({ id: 'm', name: 'Langganan', price: 100000, unit: 'bulan', start: '2026-01-01' })];
  w.S.startMonth = 0;
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();
  w.openPm('m');
  const sc = (k) => $('scenario-cards-grid').querySelector('button[data-scen="' + k + '"]');
  assert(sc('temp_price') && sc('stop'), 'kartu Harga sementara dan Berhenti bayar ada');
  click(sc('stop'));
  $('scen-month').value = '6'; // berhenti mulai Jul
  click($('btn-save-scenario'));
  const m = w.S.items.find((x) => x.id === 'm');
  assert.strictEqual(m.end, '2026-06-30', 'berhenti mulai Jul menandai end 2026-06-30');
  assert.strictEqual(w.occ(m, 2026).length, 6, 'tinggal 6 tagihan di 2026');
  assert($('modal-scenario').hidden, 'modal tertutup setelah simpan');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap2 lulus');
  process.exit(0);
})();
