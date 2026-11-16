// Verifikasi Browser Mode 1:1 Fiscal Atelier: #browser-shell, zero legacy UI, semua tombol & modal berfungsi tanpa error.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;

  // 1. Isolasi #browser-shell & tidak ada elemen UI index lama
  const shell = $('browser-shell');
  assert(shell && shell.classList.contains('app-shell') && shell.classList.contains('app'), '#browser-shell terpasang');
  assert($('mobile-app-shell'), '#mobile-app-shell siap sebagai saudara terpisah');
  ['top-trip-btn', 'btn-rep-open', 'pm', 'sk', 'm', 'rm', 'xlm', 'shm', 'v-rebalance', 'v-ibkr', 'item-n', 'item-start', 'qtx-date', 'sim-amt-slider'].forEach((oldId) => {
    assert(!$(oldId), 'elemen index lama #' + oldId + ' sudah dihapus dari #browser-shell');
  });

  // 2. Topbar & Alat Menu
  const alatMenu = $('alat-menu');
  ['d', 'w', 'm', 'y'].forEach((k) => {
    assert(alatMenu.querySelector('[data-rep="' + k + '"]'), 'menu Alat punya laporan ' + k);
  });
  assert(alatMenu.querySelector('a[href*="rebalance"]'), 'tautan eksternal Rebalance porto ada');
  assert(alatMenu.querySelector('a[href*="ibkr-flip"]'), 'tautan eksternal IBKR vs Flip ada');

  // 3. 100% Full Liquid Jar + HUD interaktif di Rincian
  w.__today = '2026-11-12';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.items = [
    { id: 'j1', name: 'Sewa', price: 3000000, n: 1, unit: 'sekali', start: '2026-11-15', cat: 'Tagihan rutin', ch: [] },
    { id: 'j2', name: 'ETF', price: 1000000, n: 1, unit: 'sekali', start: '2026-11-20', cat: 'Investasi', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();

  const jar = $('tab-rincian').querySelector('#svg-jar-main');
  assert(jar && $('tab-rincian').querySelector('#where-cat-list'), 'Jar & kategori ter-render');
  assert.strictEqual(jar.querySelectorAll('.jar-band').length, 2, 'Jar memuat 2 pita cair');
  const invBand = jar.querySelector('.jar-band[data-cat="Investasi"]');
  invBand.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: true }));
  assert.strictEqual($('jar-hud-pct').textContent.trim(), '25.0%', 'hover band menyalakan porsi');
  invBand.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  assert.strictEqual($('jar-hud-pct').textContent.trim(), '100%', 'mouseleave mengembalikan HUD ke 100%');

  // 4. Tab Kelola Item: 4 opsi mockup, kalender modern #item-date-trigger (tanpa #item-day & tanpa .pk-in), auto-format ribuan
  w.tab('item');
  const cycOpts = [...$('item-cycle').options].map((o) => o.value);
  assert.deepStrictEqual(cycOpts, ['tiap bulan', 'tiap 28 hari', 'sekali saja', 'tiap tahun'], 'opsi siklus sesuai mockup');
  assert(!$('item-day'), 'kotak #item-day (Tanggal Bulanan 1-31) sudah dihapus sesuai revisi');
  assert($('item-date-trigger') && $('item-date-cal') && $('item-date'), 'kalender modern #item-date-trigger & #item-date-cal tersedia');
  assert.strictEqual(shell.querySelectorAll('.pk-in, .pk-field, input[type="date"]').length, 0, 'tidak ada input date native atau .pk-in lama di #browser-shell');
  $('qp-input').value = 'Spotify 55rb tiap tgl 5';
  fire($('qp-input'), 'input');
  assert($('qp-preview-tokens').textContent.includes('Spotify'), 'preview Tambah Cepat menampilkan nama item');
  click($('qp-submit'));
  assert(w.S.items.some((x) => x && x.name === 'Spotify' && x.price === 55000), 'Tambah Cepat menyimpan item valid');
  click($('item-date-trigger'));
  assert($('item-date-cal').classList.contains('open'), 'klik #item-date-trigger membuka popover kalender modern #item-date-cal');
  const day12Btn = $('item-date-cal').querySelector('[data-ical-pick$="-12"]');
  assert(day12Btn, 'kalender modern merender sel tanggal 12');
  click(day12Btn);
  assert(!$('item-date-cal').classList.contains('open'), 'popover kalender tertutup setelah pilih tanggal');
  $('item-name').value = 'Cloud Backup';
  $('item-price').value = '150000';
  fire($('item-price'), 'input');
  assert.strictEqual($('item-price').value, '150.000', 'auto-format titik di #item-price');
  fire($('item-form'), 'submit');
  assert(w.S.items.some((x) => x.name === 'Cloud Backup' && x.price === 150000 && x.start.endsWith('-12')), 'item baru tersimpan dengan angka murni dan tanggal pilihan kalender');
  $('item-name').value = 'Tanggal Tunggal';
  $('item-price').value = '200000';
  fire($('item-price'), 'input');
  $('item-date').value = '2026-12-24';
  fire($('item-date'), 'change');
  fire($('item-form'), 'submit');
  assert(w.S.items.some((x) => x.name === 'Tanggal Tunggal' && x.start === '2026-12-24'), 'input tanggal tunggal #item-date tersimpan presisi');

  // 5. Tab Simulasi: mockup form (+ Tambah Kas / Hemat & − Pengeluaran Baru) + checkbox toggle + Terapkan
  w.tab('sim');
  const sma = $('sim-new-amt');
  assert(sma && sma.getAttribute('data-num-fmt') === 'rp', '#sim-new-amt memakai data-num-fmt="rp"');
  $('sim-new-title').value = 'Freelance';
  $('sim-new-dir').value = '1';
  sma.value = '1500000';
  fire(sma, 'input');
  assert.strictEqual(sma.value, '1.500.000', 'auto-format #sim-new-amt jadi 1.500.000');
  assert.strictEqual(w.parseRp(sma.value), 1500000, 'nilai murni tetap 1500000');
  fire($('sim-add-form'), 'submit');
  assert.strictEqual(w.SIM.length, 1, 'skenario simulasi ditambahkan');
  const chk = $('sim-scenarios-list').querySelector('[data-br-smtog="0"]');
  assert(chk && chk.checked, 'kartu checkbox skenario aktif ter-render');

  // 6. Modal Laporan (#modal-report) via #alat-menu [data-rep]
  const repM = $('modal-report');
  assert(repM && repM.hidden === true && !repM.classList.contains('open'), '#modal-report awalnya tertutup');
  click(alatMenu.querySelector('[data-rep="m"]'));
  assert(!repM.hidden && repM.classList.contains('open'), 'klik laporan di Alat membuka #modal-report');
  for (const [k, title] of Object.entries({ d: 'Laporan Harian', w: 'Laporan Mingguan', m: 'Laporan Bulanan', y: 'Laporan Tahunan' })) {
    click(repM.querySelector('[data-drep="' + k + '"]'));
    assert.strictEqual($('rep-m-title').textContent.trim(), title, 'tab ' + k + ' menampilkan ' + title);
    assert(repM.querySelectorAll('.rep-kpi').length >= 4, 'KPI ter-render untuk ' + k);
  }
  click($('rep-m-cl'));
  assert(repM.hidden && !repM.classList.contains('open'), 'tombol X menutup #modal-report');

  // 7. Audit interaktif seluruh tombol utama, popover, & modal
  assert(!$('acct-m'), 'tombol D (#acct-m) dihapus dari topbar desktop');
  assert(!$('btn-privacy').querySelector('.btn-lbl-sm'), 'teks label Privasi dihapus dari topbar desktop');
  assert(!$('btn-notif').querySelector('.btn-lbl-sm'), 'teks label Notifikasi dihapus dari topbar desktop');
  click($('btn-privacy'));
  assert(w.document.body.classList.contains('privacy-on'), 'Mode Privasi menyala');
  click($('btn-privacy'));
  click($('tb-more'));
  assert($('topbar-actions').classList.contains('min'), 'chevron topbar mengecilkan aksi');
  click($('tb-more'));
  click($('btn-notif'));
  assert($('notif-popover').classList.contains('open'), 'popover notifikasi terbuka');
  w.document.body.click();
  click($('thm'));
  click($('acct'));
  assert($('lin-google'), 'tombol Masuk dengan Google (Gmail) #lin-google tersedia di modal akun');
  // Regresi tombol Pengaturan & Alat tetap terbuka setelah pindah shell mode
  click(w.document.querySelector('#alat-menu [data-shell-switch="mobile-app"]'));
  w.setShellMode('browser');
  click($('alat-btn'));
  assert(!$('alat-menu').hidden && $('alat-menu').classList.contains('open'), 'button Pengaturan & Alat (#alat-btn) tetap berfungsi setelah pindah mode');
  click(w.document.querySelector('#alat-menu [data-go="settings"]'));
  assert(!$('yr-panel').hidden && $('yr-panel').classList.contains('open'), 'Pengaturan (Tahun & Saldo) dari #alat-menu membuka #yr-panel');
  click($('yr-done'));
  assert($('yr-panel').hidden, '#yr-panel tertutup');
  click(w.document.querySelector('[data-mob-go="settings"]'));
  assert(!$('yr-panel').hidden && $('yr-panel').classList.contains('open'), 'Pengaturan (Tahun & Saldo) dari #mobile-more-sheet membuka #yr-panel');
  click($('yr-done'));
  click($('yr-btn'));
  assert(!$('yr-panel').hidden && $('yr-panel').classList.contains('open'), '#yr-panel terbuka');
  click($('yr-done'));
  assert($('yr-panel').hidden, '#yr-panel tertutup');
  click($('bk'));
  assert(!$('modal-backup').hidden, '#modal-backup terbuka');
  click($('modal-backup').querySelector('[data-close-modal="modal-backup"]'));
  assert($('modal-backup').hidden, '#modal-backup tertutup');

  w.openPm('j1');
  assert(!$('modal-scenario').hidden, '#modal-scenario terbuka');
  for (const sc of ['change_price', 'temp_price', 'cycle', 'shift', 'stop', 'manual']) {
    click($('scenario-cards-grid').querySelector('[data-scen="' + sc + '"]'));
  }
  click($('modal-scenario').querySelector('[data-close-modal="modal-scenario"]'));
  assert($('modal-scenario').hidden, '#modal-scenario tertutup');

  w.tab('jadwal');
  const chip = $('jadwal-tbody').querySelector('[data-chip-it]');
  assert(chip, 'chip jadwal ter-render');
  click(chip);
  assert($('chip-popover').classList.contains('open'), '#chip-popover terbuka saat klik chip');
  click($('chip-popover').querySelector('[data-cp-act="paid"]'));
  assert(!$('chip-popover').classList.contains('open'), '#chip-popover tertutup setelah Lunas');

  w.tab('kas');
  click($('kas-date-trigger'));
  assert($('kas-cal-popover').classList.contains('open'), 'kalender Kas terbuka');
  click($('kas-range-trigger'));
  assert($('kas-range-popover').classList.contains('open'), 'kalender rentang Kas terbuka');
  w.document.body.click();

  w.brOpenModal('modal-quick-tx');
  $('qtx-amt').value = '50000';
  fire($('qtx-amt'), 'input');
  assert.strictEqual($('qtx-amt').value, '50.000', 'auto-format titik di #qtx-amt');
  $('qtx-note').value = 'Kopi';
  fire($('quick-tx-form'), 'submit');
  assert($('modal-quick-tx').hidden, '#modal-quick-tx tertutup sesudah simpan');

  click($('nav-btn-trip'));
  assert.strictEqual(w.mode, 'trip', 'klik #nav-btn-trip mengaktifkan Mode Perjalanan');
  click($('br-trip-new'));
  assert(!$('modal-trip-form').hidden, '#modal-trip-form terbuka');
  $('kp-name').value = 'Kyoto 5D';
  fire($('trip-meta-form'), 'submit');
  assert($('modal-trip-form').hidden, '#modal-trip-form tertutup sesudah simpan');
  click(shell.querySelector('[data-triptab="itin"]'));
  assert.strictEqual(w.BR_STATE.tripSubTab, 'itin', 'tombol Itinerary di desktop Mode Perjalanan berfungsi');
  assert($('trip-itin-form'), '#trip-itin-form ter-render di subtab Itinerary');
  $('it-place').value = 'Kiyomizu-dera';
  fire($('trip-itin-form'), 'submit');
  assert(w.tp().it.some((x) => x.place === 'Kiyomizu-dera'), 'kegiatan itinerary berhasil ditambahkan');
  const itEditBtn = shell.querySelector('[data-trip-it-edit]');
  assert(itEditBtn, 'tombol Ubah [data-trip-it-edit] pada kegiatan itinerary tersedia');
  click(itEditBtn);
  assert.strictEqual($('it-place').value, 'Kiyomizu-dera', 'klik Ubah mengisi form Ubah Kegiatan dengan nama lama');
  $('it-place').value = 'Arashiyama';
  fire($('trip-itin-form'), 'submit');
  assert(w.tp().it.some((x) => x.place === 'Arashiyama') && !w.tp().it.some((x) => x.place === 'Kiyomizu-dera'), 'simpan perubahan kegiatan itinerary berhasil');
  click($('br-trip-share'));
  assert(!$('modal-trip-share').hidden, '#modal-trip-share terbuka');
  click($('modal-trip-share').querySelector('[data-close-modal="modal-trip-share"]'));
  assert($('modal-trip-share').hidden, '#modal-trip-share tertutup');
  w.setMode('rencana');

  // 8. Regresi filter Jadwal, touch slide cashflow, & kesamaan saldo Realtime vs titik Hari Ini
  w.tab('jadwal');
  click(shell.querySelector('[data-jfilter="unpaid"]'));
  assert.strictEqual(w.BR_STATE.jadwalFilter, 'unpaid', 'filter Belum lunas aktif');
  click(shell.querySelector('[data-jfilter="paid"]'));
  assert.strictEqual(w.BR_STATE.jadwalFilter, 'paid', 'filter Lunas aktif');
  click(shell.querySelector('[data-jfilter="all"]'));

  w.__today = '2026-11-16';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 2000000;
  w.S.items = [{ id: 'p20', name: 'Bill20', price: 200000, n: 1, unit: 'sekali', start: '2026-11-20', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] }];
  w.S.paid = { 'p20|2026-11-20': 1 };
  w.S.skip = {};
  w.kasLinked().tx = [{ id: 't_ai', d: '2026-11-16', t: '-', amt: 506275, cat: 'Makanan', note: 'beli ai', pay: '' }];
  w.tab('rincian');
  w.renderAll();
  const ptsToday = w.brBuildCashflowPoints('m');
  const ptsWeek = w.brBuildCashflowPoints('w');
  assert.notDeepStrictEqual(ptsWeek.map((p) => p.d), ptsToday.map((p) => p.d), 'filter Minggu dan Bulan menampilkan rentang grafik yang berbeda');
  const todayNode = ptsToday.find((p) => p.today);
  assert(todayNode, 'titik Hari ini ada');
  assert.strictEqual(todayNode.val, w.kasBal(w.kasLinked()).bal, 'nilai titik Hari ini sama persis dengan hero Saldo Realtime');
  $('svg-cashflow').getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 250 });
  const tmEv = new w.Event('touchmove', { bubbles: true, cancelable: true });
  tmEv.touches = [{ clientX: 380 }];
  $('cf-hit').dispatchEvent(tmEv);
  assert($('cashflow-tooltip').classList.contains('visible'), 'touchmove menggeser crosshair & tooltip grafik kas');

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('Semua pengujian browser_redesign lulus tanpa error!');
  process.exit(0);
})();
