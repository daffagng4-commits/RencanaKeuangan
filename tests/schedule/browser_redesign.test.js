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
  const jarBands = [...jar.querySelectorAll('.jar-band')];
  assert.strictEqual(jarBands.length, 2, 'Jar memuat 2 pita cair');
  assert.strictEqual(jarBands[0].tagName.toLowerCase(), 'path', 'lapisan teratas berupa satu path tertutup bergelombang');
  assert(jarBands[0].classList.contains('jar-wave-anim'), 'lapisan teratas sekaligus membawa animasi gelombang');
  assert(jarBands.slice(1).every((b) => b.tagName.toLowerCase() === 'rect'), 'lapisan di bawahnya berupa rect datar tanpa gelombang');
  assert(+jarBands[0].getAttribute('data-amt') >= +jarBands[1].getAttribute('data-amt'), 'lapisan terbesar berada di paling atas');
  assert(jar.querySelectorAll('.jar-wave-anim').length === 1 && jar.querySelectorAll('.jar-wave-back').length === 1, 'ada 1 gelombang utama dan 1 gelombang belakang');
  assert.strictEqual(jar.querySelector('.jar-wave-back').getAttribute('fill'), jarBands[0].getAttribute('fill'), 'gelombang belakang memakai warna lapisan teratas');
  assert.strictEqual(jar.querySelector('.jar-wave-back').getAttribute('opacity'), '0.5', 'gelombang belakang memakai opacity 0.5');
  // Bugfix Jar Top Layer: lebar path >= 2x lebar jar (-104..376 = 480px) & clipPath statis tidak ikut translateX
  const jarInnerW = 120;
  const extractPathXSpan = (dStr) => {
    const startMatch = dStr.match(/^M\s*(-?[\d.]+)/);
    const endMatch = dStr.match(/L\s*(-?[\d.]+)\s+[\d.]+\s+L\s*(-?[\d.]+)\s+[\d.]+\s*Z$/);
    const minX = Math.min(parseFloat(startMatch[1]), parseFloat(endMatch[2]));
    const maxX = parseFloat(endMatch[1]);
    return { minX, maxX, span: maxX - minX };
  };
  const clipGroupDesk = jar.querySelector('[clip-path="url(#clip_full_jar)"]');
  assert(clipGroupDesk && !clipGroupDesk.classList.contains('jar-wave-anim') && !clipGroupDesk.classList.contains('jar-wave-back') && !clipGroupDesk.classList.contains('jar-wave-bob'), 'clipPath jar desktop dipasang di grup induk statis tanpa translate');
  assert(clipGroupDesk.contains(jar.querySelector('.jar-wave-anim')) && clipGroupDesk.contains(jar.querySelector('.jar-wave-back')), 'kedua gelombang berada di dalam grup clipPath statis');
  const spFront = extractPathXSpan(jar.querySelector('.jar-wave-anim').getAttribute('d'));
  const spBack = extractPathXSpan(jar.querySelector('.jar-wave-back').getAttribute('d'));
  assert(spFront.span >= 2 * jarInnerW && spBack.span >= 2 * jarInnerW, 'lebar path gelombang depan & belakang >= 2x lebar dalam jar (' + spFront.span + ', ' + spBack.span + ')');
  assert.strictEqual(spFront.minX, spBack.minX, 'x-origin gelombang depan dan belakang identik');
  assert.strictEqual(spFront.maxX, spBack.maxX, 'lebar total gelombang depan dan belakang identik');
  [0, -30, -60, -90, -120].forEach((tx) => {
    assert(spFront.minX + tx <= 16 && spFront.maxX + tx >= 136, 'tidak ada celah kiri/kanan pada pergeseran translateX(' + tx + 'px)');
  });
  // Cek render pada 4 persentase lapisan teratas: 100%, 70%, 40%, 15%
  [
    [{ id: 'p100', name: 'Satu', cat: 'Tagihan rutin', total: 1000 }],
    [{ id: 'p70a', name: 'Utama', cat: 'Tagihan rutin', total: 700 }, { id: 'p70b', name: 'Sisa', cat: 'Investasi', total: 300 }],
    [{ id: 'p40a', name: 'A', cat: 'Tagihan rutin', total: 400 }, { id: 'p40b', name: 'B', cat: 'Investasi', total: 350 }, { id: 'p40c', name: 'C', cat: 'Lainnya', total: 250 }],
    [{ id: 'p15_1', name: 'Top15', cat: 'Tagihan rutin', total: 150 }, { id: 'p15_2', name: 'K2', cat: 'Investasi', total: 150 }, { id: 'p15_3', name: 'K3', cat: 'Makanan', total: 140 }, { id: 'p15_4', name: 'K4', cat: 'Transportasi', total: 140 }, { id: 'p15_5', name: 'K5', cat: 'Hiburan', total: 140 }, { id: 'p15_6', name: 'K6', cat: 'Kesehatan', total: 140 }, { id: 'p15_7', name: 'K7', cat: 'Lainnya', total: 140 }],
  ].forEach((sampleRows) => {
    const tmpBox = w.document.createElement('div');
    const sum = sampleRows.reduce((s, x) => s + x.total, 0);
    tmpBox.innerHTML = w.renderFullWaterJarSvg(sampleRows, sum);
    const fSp = extractPathXSpan(tmpBox.querySelector('.jar-wave-anim').getAttribute('d'));
    const bSp = extractPathXSpan(tmpBox.querySelector('.jar-wave-back').getAttribute('d'));
    assert(fSp.minX === -104 && fSp.maxX === 376 && bSp.minX === -104 && bSp.maxX === 376, 'gelombang tetap menutupi penuh pada skenario total ' + sampleRows[0].total);
  });
  assert(!$('jar-hover-hint'), 'REVISI 3: teks "Tabung penuh 100% ..." dihapus dari kartu jar');
  assert(jar.getAttribute('viewBox') === '0 0 186 228', 'REVISI 3.1: jar desktop memakai viewBox & geometri yang sama dengan jar APK');
  assert(!$('jar-hud-box') && !$('jar-hud-pct') && !$('jar-hud-sub') && !$('jar-hud-amt'), 'REVISI 1: kotak info #jar-hud-box dihapus sepenuhnya dari jar');
  const invBand = jar.querySelector('.jar-band[data-cat="Investasi"]');
  invBand.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: true }));
  assert(invBand.classList.contains('lit') && $('jar-ptr').style.display === 'block' && !$('jar-hud-box'), 'REVISI 1: hover band menyalakan lapisan + panah #jar-ptr tanpa kotak info');
  invBand.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  assert(!invBand.classList.contains('lit') && $('jar-ptr').style.display === 'none', 'mouseleave melepas sorotan lapisan & menyembunyikan #jar-ptr');

  // REVISI 1.1: 1 kategori = 1 lapisan air di Jar + hover item di Rincian Item menyalakan kategori induknya
  w.S.items = [
    { id: 'c1', name: 'ETF 60%', price: 460000, n: 1, unit: 'sekali', start: '2026-11-15', cat: 'Investasi', ch: [] },
    { id: 'c2', name: 'Saham Lokal 40%', price: 306000, n: 1, unit: 'sekali', start: '2026-11-16', cat: 'Investasi', ch: [] },
    { id: 'c3', name: 'Makan Siang', price: 234000, n: 1, unit: 'sekali', start: '2026-11-17', cat: 'Makanan', ch: [] },
  ];
  w.renderAll();
  const catJar = $('svg-jar-main');
  const catJarBands = [...catJar.querySelectorAll('.jar-band')];
  assert.strictEqual(catJarBands.length, 2, 'REVISI 1.1: 3 item dalam 2 kategori digambar sebagai 2 lapisan kategori (bukan 3 lapisan item)');
  assert.strictEqual(catJarBands[0].dataset.cat, 'Investasi', 'kategori terbesar (Investasi 76.6%) di lapisan atas');
  assert.strictEqual(catJarBands[0].getAttribute('data-pct'), '76.6', 'persentase lapisan atas = total kategori (76.6%)');
  const btcRow = [...$('top5-items-list').querySelectorAll('.simple-row')].find((r) => r.dataset.wcat === 'Investasi');
  assert(btcRow, 'baris item Investasi ada di #top5-items-list');
  btcRow.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: true }));
  assert(catJarBands[0].classList.contains('lit') && !catJarBands[1].classList.contains('lit') && catJarBands[1].classList.contains('dim') && $('jar-ptr').style.display === 'block', 'REVISI 1.1: sorot item menyalakan lapisan kategori induknya dan meredupkan lainnya');
  btcRow.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  // REVISI 2: meniscus cekung + highlight putih tipis 0.25 + gradien vertikal tipis antar lapisan (2-3 kat & 6+ kat, nonaktif bila lapisan < 6px)
  assert(catJar.querySelector('.jar-wave-hl') && catJar.querySelector('.jar-wave-hl').getAttribute('stroke') === 'rgba(255,255,255,0.25)', 'REVISI 2: permukaan atas memiliki highlight putih transparan 0.25');
  assert(catJar.querySelector('.jar-meniscus-hl') && /Q\s/.test(catJar.querySelector('.jar-meniscus-hl').getAttribute('d')), 'REVISI 2: pemisah antar lapisan memakai kurva meniscus halus (Q), bukan garis lurus');
  assert(catJar.querySelector('.jar-meniscus-blend') && catJar.querySelector('#dJarBlend_1'), 'REVISI 2: pemisah antar lapisan dilengkapi linearGradient transisi lembut 6px');
  const sevenCats = [
    { id: 'g1', name: 'A', cat: 'Tagihan rutin', total: 400 },
    { id: 'g2', name: 'B', cat: 'Investasi', total: 200 },
    { id: 'g3', name: 'C', cat: 'Makanan', total: 150 },
    { id: 'g4', name: 'D', cat: 'Transportasi', total: 100 },
    { id: 'g5', name: 'E', cat: 'Hiburan', total: 80 },
    { id: 'g6', name: 'F', cat: 'Kesehatan', total: 50 },
    { id: 'g7', name: 'G', cat: 'Lainnya', total: 20 },
  ];
  const sevenBox = w.document.createElement('div');
  sevenBox.innerHTML = w.renderFullWaterJarSvg(sevenCats, 1000);
  assert.strictEqual(sevenBox.querySelectorAll('.jar-band').length, 7, 'REVISI 2: 7 kategori menghasilkan 7 lapisan jar');
  assert(sevenBox.querySelectorAll('.jar-meniscus-hl').length === 6 && sevenBox.querySelectorAll('.jar-meniscus-blend').length >= 1, 'REVISI 2: 6+ kategori merender kurva meniscus & gradien pemisah yang valid');
  const thinBox = w.document.createElement('div');
  thinBox.innerHTML = w.rkBuildWaterJarSvg({
    svgId: 'thin-jar',
    clipId: 'clip-thin-jar',
    gradPrefix: 'th',
    bands: [
      { id: 't1', cat: 'Investasi', total: 990, pct: 99, color: '#0F52BA' },
      { id: 't2', cat: 'Lainnya', total: 10, pct: 1, color: '#64748B' },
    ].concat(Array.from({ length: 26 }, (_, k) => ({ id: 'x' + k, cat: 'Kat' + k, total: 1, pct: 0.1, color: '#10B981' }))),
  });
  assert.strictEqual(thinBox.querySelectorAll('.jar-meniscus-blend').length, 0, 'REVISI 2: gradien pemisah otomatis nonaktif jika lapisan lebih tipis dari zona gradien 6px');

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
  // REVISI 2, 2.1, 2.2: edge-to-edge fill 0..1060, tanpa instruksi & tanpa "Batas Defisit (Rp 0)", legenda baru
  const cfWrapTxt = $('cashflow-chart-wrap').textContent;
  assert(cfWrapTxt.includes('Saldo Hari Ini') && cfWrapTxt.includes('Masa Depan') && cfWrapTxt.includes('< Rp 0'), 'REVISI 2.2: teks legenda desktop diperbarui');
  assert(!/Saldo Nyata \(s\/d Hari Ini\)|Proyeksi Kas|Zona Defisit|Sorot grafik untuk crosshair/.test(cfWrapTxt), 'REVISI 2.1 & 2.2: teks lama & instruksi crosshair dihapus');
  assert(!/Batas Defisit/.test($('svg-cashflow').textContent), 'REVISI 2.1: teks Batas Defisit dihapus dari SVG');
  ['w', 'm', 'y'].forEach((rg) => {
    click(shell.querySelector('[data-range="' + rg + '"]'));
    const areaPath = $('svg-cashflow').querySelector('.rk-anim-fill-right').getAttribute('d');
    const areaStartX = parseFloat(areaPath.match(/^M\s*([\d.]+)/)[1]);
    const areaEndX = parseFloat(areaPath.match(/L\s*([\d.]+)\s+[\d.]+\s+L\s*([\d.]+)\s+[\d.]+\s*Z$/)[1]);
    assert.strictEqual(areaStartX, 68, 'REVISI 1: grafik arus kas (' + rg + ') mulai pada inset kiri padL=68 agar tidak menimpa label sumbu Y');
    assert.strictEqual(areaEndX, 1060, 'REVISI 1: grafik arus kas (' + rg + ') tetap memanjang sampai tepi kanan x=1060');
    const tLine = $('svg-cashflow').querySelector('.cf-today-line');
    const tNode = $('svg-cashflow').querySelector('.cf-node.is-today');
    assert(tLine && tNode, 'garis permanen hari ini & titik Hari ini ada di rentang ' + rg);
    assert.strictEqual(tLine.getAttribute('x1'), tLine.getAttribute('x2'), 'garis hari ini vertikal lurus');
    assert(Math.abs(parseFloat(tLine.getAttribute('x1')) - parseFloat(tNode.getAttribute('cx'))) <= 0.1, 'garis hari ini tepat pada posisi x titik Hari ini (' + rg + ')');
    assert.strictEqual(tLine.getAttribute('stroke'), 'var(--accent)', 'warna garis hari ini memakai biru accent');
    assert.strictEqual(tLine.getAttribute('stroke-dasharray'), '4 3', 'garis hari ini putus-putus halus 4 3');
    const cfHtml = $('svg-cashflow').innerHTML;
    assert(cfHtml.indexOf('rk-anim-fill-right') < cfHtml.indexOf('cf-today-line') && cfHtml.indexOf('cf-today-line') < cfHtml.indexOf('cf-node') && cfHtml.indexOf('cf-today-line') < cfHtml.indexOf('cf-crosshair'), 'garis hari ini berada di atas area fill dan di bawah titik serta crosshair');
  });
  assert(!/\bToday\b/.test($('cashflow-chart-wrap').textContent) && $('svg-cashflow').textContent.includes('Hari ini'), 'tanpa pill Today, memakai label Hari ini di sumbu X');
  const yTextsDesk = [...$('svg-cashflow').querySelectorAll('text[text-anchor="end"]')];
  assert(yTextsDesk.length >= 4 && yTextsDesk.every((el) => parseFloat(el.getAttribute('x')) <= 58), 'REVISI 1: seluruh label sumbu Y desktop berada di kolom inset kiri (x <= 58)');
  w.switchYear(2027);
  w.renderAll();
  assert.strictEqual($('svg-cashflow').querySelector('.cf-today-line'), null, 'garis hari ini tidak tampil di tahun yang tidak memuat tanggal hari ini');
  w.switchYear(2026);
  w.renderAll();

  // Fase 2: Sidebar persistensi localStorage, kategori check icon + just-selected, checkbox .rk-check
  click($('sb-toggle'));
  assert(w.document.body.classList.contains('sidebar-collapsed'), 'klik #sb-toggle menciutkan sidebar');
  assert.strictEqual(w.localStorage.getItem('rk-sb-collapsed'), '1', 'status ciut sidebar disimpan di localStorage');
  assert.strictEqual($('sb-toggle').getAttribute('aria-expanded'), 'false', 'aria-expanded sidebar diperbarui');
  click($('sb-toggle'));
  assert(!w.document.body.classList.contains('sidebar-collapsed'), 'klik #sb-toggle kedua membuka kembali sidebar');
  assert.strictEqual(w.localStorage.getItem('rk-sb-collapsed'), '0', 'status buka sidebar disimpan di localStorage');

  // Revisi Sidebar Desktop: urutan struktur, tooltip, klik logo -> Rincian Transaksi
  const sidebarEl = shell.querySelector('aside.sidebar');
  const sbTop = sidebarEl.querySelector(':scope > .sb-top');
  const sbNav = sidebarEl.querySelector(':scope > #rk-nav');
  const sbBot = sidebarEl.querySelector(':scope > .sb-bot');
  const brandBtn = $('sb-brand-btn');
  assert(sbTop && brandBtn && brandBtn.tagName === 'BUTTON' && sbTop.contains(brandBtn) && sbTop.contains($('sb-toggle')), 'baris header sidebar memuat tombol logo #sb-brand-btn dan tombol collapse #sb-toggle');
  assert.strictEqual(brandBtn.getAttribute('aria-label'), 'Buka Rincian Transaksi', '#sb-brand-btn memiliki aria-label Buka Rincian Transaksi');
  assert(brandBtn.querySelector('.sb-brand-mark') && brandBtn.querySelector('.sb-brand-wordmark'), '#sb-brand-btn membungkus simbol dan teks lockup');
  const navBtns = [...sbNav.querySelectorAll(':scope > button')];
  assert.strictEqual(navBtns[navBtns.length - 1].id, 'alat-btn', '#alat-btn dipindah ke item terakhir di dalam #rk-nav');
  assert.strictEqual(navBtns[navBtns.length - 2].id, 'nav-btn-trip', '#alat-btn tepat setelah #nav-btn-trip');
  assert(navBtns.every((b) => (b.getAttribute('title') || '').trim().length > 0), 'semua item nav termasuk Pengaturan punya tooltip title untuk mode ciut');
  assert(sbBot && sbBot.contains($('acct')) && !sbBot.contains($('alat-btn')), '#acct dipindah ke .sb-bot di bawah garis pemisah');
  w.acctUI({ email: 'mix@renkeu.id', user_metadata: { full_name: 'Mix' } });
  assert(($('acct').getAttribute('title') || '').includes('Halo, Mix'), 'tooltip #acct menampilkan nama akun saat mode ciut');
  w.acctUI(null);
  w.tab('kas');
  assert.strictEqual(w.curTab, 'kas', 'pindah ke tab Transaksi sebelum klik logo');
  click(brandBtn);
  assert.strictEqual(w.curTab, 'rincian', 'klik #sb-brand-btn dari tab Transaksi membuka Rincian Transaksi');
  assert(sbNav.querySelector('[data-tab="rincian"]').classList.contains('active') && !$('tab-rincian').hidden, 'tab Rincian Transaksi menjadi aktif & terlihat setelah klik logo');
  w.setMode('trip');
  click(brandBtn);
  assert.strictEqual(w.mode, 'rencana', 'klik #sb-brand-btn dari mode Perjalanan kembali ke mode Rencana');
  assert.strictEqual(w.curTab, 'rincian', 'klik #sb-brand-btn dari mode Perjalanan membuka Rincian Transaksi');
  $('tt').hidden = true;
  click($('acct'));
  assert(!$('tt').hidden || !$('lg').hidden, 'klik #acct di .sb-bot memicu aksi akun (toast info lokal / buka modal #lg)');
  const prevSb = w.sb;
  w.sb = {};
  click($('acct'));
  assert(!$('lg').hidden && $('lg').classList.contains('open'), 'klik #acct saat cloud aktif membuka modal akun #lg');
  click($('lgc'));
  w.sb = prevSb;
  $('tt').hidden = true;

  w.tab('kas');
  const kCatBtn = $('kas-cat-pills').querySelector('.cat-pill-opt:not(.selected)');
  assert(kCatBtn && kCatBtn.querySelector('.cat-check-ico'), 'pil kategori memiliki ikon centang .cat-check-ico');
  const kCatVal = kCatBtn.getAttribute('data-kcat-opt');
  click(kCatBtn);
  const kCatSelected = $('kas-cat-pills').querySelector('.cat-pill-opt.selected[data-kcat-opt="' + kCatVal + '"]');
  assert(kCatSelected && kCatSelected.classList.contains('just-selected'), 'klik kategori memberi kelas .just-selected untuk pop spring');

  const chkWrap = shell.querySelector('.rk-check input[type="checkbox"]');
  assert(chkWrap && chkWrap.closest('.rk-check').querySelector('.rk-check-svg path'), 'checkbox dibungkus .rk-check dengan SVG centang');

  // Regresi Masalah A & B di Desktop Browser Mode
  w.kasLinked().tx.push({ id: 'desk_del_tx1', d: '2026-11-16', t: '-', amt: 45000, cat: 'Makanan', note: 'Uji Hapus Desktop' });
  w.renderAll();
  w.tab('kas');
  $('tt').hidden = true;
  click(shell.querySelector('[data-kdel="desk_del_tx1"]'));
  assert(w.document.querySelector('.modal.cfm.open') && $('tt').hidden === true, 'desktop hapus transaksi membuka konfirmasi tanpa toast prematur');
  assert(w.kasLinked().tx.some((x) => x.id === 'desk_del_tx1'), 'desktop transaksi belum terhapus sebelum konfirmasi');
  click(w.document.querySelector('.modal.cfm [data-cf-n]'));
  assert(w.kasLinked().tx.some((x) => x.id === 'desk_del_tx1') && $('tt').hidden === true, 'desktop batal hapus transaksi membiarkan data utuh tanpa toast');
  click(shell.querySelector('[data-kdel="desk_del_tx1"]'));
  click(w.document.querySelector('.modal.cfm [data-cf-y]'));
  assert(!w.kasLinked().tx.some((x) => x.id === 'desk_del_tx1') && $('tt').hidden === false, 'desktop konfirmasi hapus transaksi menghapus data & menampilkan toast sekali');

  // Desktop item delete confirm check
  w.tab('item');
  $('tt').hidden = true;
  click(shell.querySelector('[data-it-del="p20"]'));
  assert(w.document.querySelector('.modal.cfm.open') && w.S.items.some((x) => x.id === 'p20') && $('tt').hidden === true, 'desktop hapus item membuka konfirmasi tanpa menghapus & tanpa toast');
  click(w.document.querySelector('.modal.cfm [data-cf-n]'));
  assert(w.S.items.some((x) => x.id === 'p20') && $('tt').hidden === true, 'desktop batal hapus item mempertahankan data & tanpa toast');
  click(shell.querySelector('[data-it-del="p20"]'));
  click(w.document.querySelector('.modal.cfm [data-cf-y]'));
  assert(!w.S.items.some((x) => x.id === 'p20') && $('tt').hidden === false, 'desktop konfirmasi hapus item menghapus item & memunculkan toast');

  // Desktop Masalah B: pill meluncur antar lebar berbeda & tetap memicu animasi meski .seg dirender ulang (trip-subtabs)
  w.tab('rincian');
  const dSeg = shell.querySelector('#tab-rincian .seg');
  [...dSeg.querySelectorAll('.seg-btn')].forEach((b, idx) => {
    const widths = [70, 58, 60];
    const lefts = [3, 75, 135];
    Object.defineProperty(b, 'offsetLeft', { configurable: true, value: lefts[idx] });
    Object.defineProperty(b, 'offsetTop', { configurable: true, value: 3 });
    Object.defineProperty(b, 'offsetWidth', { configurable: true, value: widths[idx] });
    Object.defineProperty(b, 'offsetHeight', { configurable: true, value: 31 });
  });
  const fsDesk = require('fs');
  const cssDeskSrc = fsDesk.readFileSync(require('path').join(__dirname, '..', '..', 'css', 'desktop.css'), 'utf8');
  const deskSegBtnRule = cssDeskSrc.match(/#browser-shell\s+\.seg-btn\s*\{([^}]*)\}/);
  assert(deskSegBtnRule && !/min-height\s*:/i.test(deskSegBtnRule[1]), 'desktop .seg-btn menjaga ukuran visual asli tanpa min-height tambahan');

  dSeg._pillPos = null;
  w.rkSyncSegPills(dSeg, false);
  const dPill = dSeg.querySelector(':scope > .seg-pill');
  const dBtnW = dSeg.querySelector('[data-range="w"]');
  click(dBtnW);
  assert.strictEqual(dSeg.querySelector(':scope > .seg-pill'), dPill, 'desktop .seg-pill tidak dibuat ulang saat pindah filter');
  assert(dPill.classList.contains('is-jelly') && dPill.style.width === '70px' && dPill.style.transform.includes('translate3d(3px, 3px, 0)'), 'desktop .seg-pill menyesuaikan lebar & berpindah dengan jelly');
  dPill.querySelector('.seg-pill-inner').dispatchEvent(new w.Event('animationend'));
  assert(!dPill.classList.contains('is-jelly'), 'desktop .is-jelly dilepas saat animasi selesai');
  assert(Math.abs(parseFloat(dPill.style.width) - dBtnW.offsetWidth) <= 1 && Math.abs(parseFloat(dPill.style.height) - dBtnW.offsetHeight) <= 1, 'ukuran pill desktop akhir = ukuran tombol aktif (toleransi 1px)');

  w.ALL.kas.pr.t_seg_test = { id: 't_seg_test', name: 'Trip Seg Uji', it: [], bk: [], ck: [], lk: [], lg: [] };
  w.setMode('trip');
  w.setTrip('t_seg_test');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const mockTripBtns = (segEl) => {
    [...segEl.querySelectorAll('.seg-btn')].forEach((b, idx) => {
      Object.defineProperty(b, 'offsetLeft', { configurable: true, value: 3 + idx * 84 });
      Object.defineProperty(b, 'offsetTop', { configurable: true, value: 3 });
      Object.defineProperty(b, 'offsetWidth', { configurable: true, value: 80 });
      Object.defineProperty(b, 'offsetHeight', { configurable: true, value: 31 });
    });
  };
  let tSubSeg = shell.querySelector('.trip-subtabs');
  mockTripBtns(tSubSeg);
  w.rkSyncSegPills(tSubSeg, false);
  w.BR_STATE.tripSubTab = 'itin';
  w.BR_STATE._tripSubAnimate = true;
  w.renderTrip();
  tSubSeg = shell.querySelector('.trip-subtabs');
  mockTripBtns(tSubSeg);
  w.rkSyncSegPills(tSubSeg, true);
  assert(tSubSeg.querySelector(':scope > .seg-pill').classList.contains('is-jelly'), 'cache posisi pill menjaga transisi meski container .seg dirender ulang');

  // Fase 3: Koreografi Entrance, Line/Bar/Jar Chart marks, Privacy Count-Up, Error Shake, & Sync Shimmer
  w.setMode('rencana');
  w.tab('rincian');
  w.renderAll();
  assert($('svg-cashflow').querySelector('.rk-anim-line') && $('svg-cashflow').querySelector('.rk-anim-fill-right'), 'SVG arus kas memuat penanda line draw & area fill');
  assert($('jar-main-stage').querySelector('.rk-anim-fill-up'), 'SVG jar chart memuat grup fill .rk-anim-fill-up');
  const rincPanel = $('tab-rincian');
  Object.defineProperty(rincPanel, 'offsetWidth', { configurable: true, value: 960 });
  const cardsR = [...rincPanel.querySelectorAll('.card, .summary-stat-card, .quick-parse-bar')];
  w.rkRunEntrance('browser', 'rincian');
  assert(cardsR.every((c) => c.classList.contains('rk-card-enter')), 'rkRunEntrance menambahkan .rk-card-enter ke card aktif');
  assert(rincPanel.querySelector('#svg-bar-compare.rk-bar-anim') && rincPanel.querySelector('#svg-bar-compare .rk-bar-rect') && rincPanel.querySelector('#svg-bar-compare .rk-bar-net-line.rk-line-draw'), 'REVISI 1: bar chart tumbuh .rk-bar-anim & garis Tren Arus Bersih mendapat .rk-line-draw saat entrance');
  assert(rincPanel.querySelector('.rk-anim-line.rk-line-draw'), 'line chart mendapat .rk-line-draw saat entrance');
  // REVISI 2: rkCountUpEl mendukung negatif (-Rp), sub-teks ("Atau Rp ... / bln"), dan 2 angka ("7 / 15 tagihan")
  const negEl = $('metric-end-bal'), ratioEl = $('rincian-bills-ratio'), hintEl = $('metric-daily-hint');
  Object.defineProperty(negEl, 'offsetWidth', { configurable: true, value: 160 });
  Object.defineProperty(ratioEl, 'offsetWidth', { configurable: true, value: 160 });
  Object.defineProperty(hintEl, 'offsetWidth', { configurable: true, value: 160 });
  negEl.textContent = '-Rp 1.178.275';
  ratioEl.textContent = '7 / 15 tagihan';
  hintEl.textContent = 'Atau Rp 1.340.820 / bln';
  w.rkAnimateRincianKpis(false);
  assert(negEl.dataset.rkFinal === '-Rp 1.178.275' && negEl.textContent.includes('Rp '), 'REVISI 2: count-up memproses nominal negatif -Rp');
  assert(/\d+\s*\/\s*\d+\s*tagihan/.test(ratioEl.textContent), 'REVISI 2: count-up memproses dua angka & unit pada tagihan');
  assert(/^Atau\s+Rp\s+[\d.]+\s+\/\s+bln$/.test(hintEl.textContent), 'REVISI 2: count-up memproses teks turunan "Atau Rp ... / bln"');
  w.rkCancelAllCountUps();
  // Re-render kecil (klik filter) hanya menganimasikan grafik terkait tanpa memicu ulang page/card entrance
  Object.defineProperty($('cashflow-chart-wrap'), 'offsetWidth', { configurable: true, value: 640 });
  Object.defineProperty($('jar-main-stage'), 'offsetWidth', { configurable: true, value: 320 });
  Object.defineProperty($('bar-chart-wrap'), 'offsetWidth', { configurable: true, value: 640 });
  const runBeforeFilter = w._rkEntranceRunId;
  click(shell.querySelector('[data-range="y"]'));
  assert.strictEqual(w._rkEntranceRunId, runBeforeFilter, 'klik filter tidak memicu ulang page entrance');
  assert($('cashflow-chart-wrap').classList.contains('is-filter-anim'), 'klik filter arus kas memberi .is-filter-anim pada grafik terkait');
  click(shell.querySelector('[data-where-dir="in"]'));
  assert($('jar-main-stage').classList.contains('is-filter-anim') && w._rkEntranceRunId === runBeforeFilter, 'klik filter arah jar hanya menganimasikan #jar-main-stage');
  click(shell.querySelector('[data-bsperiod="m"]'));
  assert($('bar-chart-wrap').classList.contains('is-filter-anim') && w._rkEntranceRunId === runBeforeFilter, 'klik filter bar compare hanya menganimasikan #bar-chart-wrap');

  // Privacy mode melindungi count-up agar angka sensitif tidak terbaca di tengah animasi & tombol privasi/notif berfungsi
  click($('btn-privacy'));
  assert(w.document.body.classList.contains('privacy-mode') && $('btn-privacy').classList.contains('on'), 'klik #btn-privacy mengaktifkan mode privasi desktop');
  const heroEl = $('rincian-saldo-now');
  Object.defineProperty(heroEl, 'offsetWidth', { configurable: true, value: 240 });
  const origHeroTxt = heroEl.textContent;
  w.rkCountUpEl(heroEl, 1900, 0);
  assert.strictEqual(heroEl.textContent, origHeroTxt, 'count-up dibatalkan seketika saat mode privasi aktif');
  click($('btn-privacy'));
  assert(!w.document.body.classList.contains('privacy-mode'), 'klik #btn-privacy kedua mematikan mode privasi');
  click($('btn-notif'));
  assert($('notif-popover').classList.contains('open'), 'klik #btn-notif membuka popover notifikasi desktop');
  click($('btn-notif'));
  assert(!$('notif-popover').classList.contains('open'), 'klik #btn-notif kedua menutup popover desktop');

  // Error Shake (#8) & novalidate di form desktop
  ['kas-form', 'item-form', 'sim-add-form', 'quick-tx-form', 'trip-meta-form'].forEach((fid) => {
    assert($(fid) && $(fid).hasAttribute('novalidate'), 'desktop form ' + fid + ' memakai novalidate');
  });
  w.tab('item');
  $('qp-input').value = 'format salah tanpa angka';
  click($('qp-submit'));
  assert($('qp-input').classList.contains('rk-input-error') && $('qp-input').classList.contains('rk-error-shake'), 'input invalid Tambah Cepat memicu border merah & shake');
  $('qp-input').value = 'Netflix 100rb';
  fire($('qp-input'), 'input');
  assert(!$('qp-input').classList.contains('rk-input-error'), 'status error input hilang saat pengguna mengetik ulang');
  w.tab('sim');
  $('sim-new-title').value = '';
  $('sim-new-amt').value = '';
  fire($('sim-add-form'), 'submit');
  assert($('sim-new-title').classList.contains('rk-input-error') && $('sim-new-title').classList.contains('rk-error-shake'), 'submit form simulasi kosong memicu error shake');

  // Sync Shimmer (#7) in-card di dalam kartu saldo (tanpa bilah #rk-sync-skeleton)
  w.tab('rincian');
  assert(!$('rk-sync-skeleton') && shell.querySelector('#tab-rincian .rk-skel-wrap #rincian-saldo-now'), 'skeleton cloud berada di dalam kartu Kondisi Kas Realtime (#rincian-saldo-now)');
  w.rkSetSyncLoading(true);
  assert(w.document.body.classList.contains('rk-syncing') && !$('rk-sync-skeleton'), 'sinkron cloud mengaktifkan in-card shimmer lewat body.rk-syncing');
  w.rkSetSyncLoading(false);
  assert(!w.document.body.classList.contains('rk-syncing') && w.document.body.classList.contains('rk-sync-reveal'), 'selesai sinkron menutup shimmer in-card dengan cross-fade');

  // Fase 4 (#16.1, #16.2, #17, #18, #20) Desktop:
  // #16.2 Icon morphing 2-SVG di tombol privasi & tema
  assert($('btn-privacy').querySelector('.rk-morph-icon .rk-ico-a') && $('btn-privacy').querySelector('.rk-morph-icon .rk-ico-b'), 'tombol privasi desktop memiliki 2 lapisan SVG untuk morph');
  click($('btn-privacy'));
  assert($('btn-privacy').classList.contains('on') && $('priv-morph').classList.contains('is-morphed'), 'mode privasi mengaktifkan morph mata <-> mata-tercoret');
  // #20 Theme View Transition desktop + Privacy Mode tetap terlindungi selama transisi
  w.document.startViewTransition = (cb) => {
    cb();
    assert(w.document.body.classList.contains('privacy-mode'), 'mode privasi tidak bocor saat startViewTransition mengganti tema');
    return { finished: Promise.resolve() };
  };
  w.setTheme('dark');
  assert(w.document.documentElement.getAttribute('data-theme') === 'dark' && w.document.documentElement.classList.contains('rk-vt-desktop'), 'ganti tema desktop memicu rk-vt-desktop (circular reveal)');
  await Promise.resolve();
  w.document.startViewTransition = undefined;
  w.setTheme('light');
  assert(w.document.documentElement.getAttribute('data-theme') === 'light' && w.document.documentElement.classList.contains('rk-theme-fallback'), 'fallback tanpa startViewTransition memakai kelas rk-theme-fallback');
  click($('btn-privacy'));
  // #16.1 Bell swing & active state sinkron dengan status popover notif desktop (REVISI 2)
  click($('btn-notif'));
  assert($('notif-popover').classList.contains('open') && $('btn-notif').classList.contains('on') && $('btn-notif').classList.contains('active') && $('btn-notif').getAttribute('aria-expanded') === 'true' && $('btn-notif').classList.contains('rk-bell-ringing'), 'klik #btn-notif desktop membuka popover, mengaktifkan state biru (.on/.active), & memicu ayunan lonceng');
  click($('btn-notif'));
  assert(!$('notif-popover').classList.contains('open') && !$('btn-notif').classList.contains('on') && !$('btn-notif').classList.contains('active') && $('btn-notif').getAttribute('aria-expanded') === 'false', 'klik #btn-notif kedua menutup popover & melepas class aktif');
  click($('btn-notif'));
  assert($('btn-notif').classList.contains('on'), 'popover terbuka kembali -> tombol notif aktif');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!$('notif-popover').classList.contains('open') && !$('btn-notif').classList.contains('on') && !$('btn-notif').classList.contains('active'), 'Escape menutup popover desktop & melepas class aktif tombol notif');
  click($('btn-notif'));
  click(w.document.body);
  assert(!$('notif-popover').classList.contains('open') && !$('btn-notif').classList.contains('on'), 'klik di luar popover menutup & melepas class aktif tombol notif desktop');
  w.tab('jadwal');
  assert($('btn-toggle-guide').querySelector('.rk-palette-ico'), 'tombol Panduan warna memuat ikon palet SVG');
  click($('btn-toggle-guide'));
  assert($('jadwal-guide').classList.contains('open') && $('btn-toggle-guide').getAttribute('aria-expanded') === 'true' && $('btn-toggle-guide').classList.contains('is-spinning'), 'klik Panduan warna memutar ikon palet & membuka drawer dengan animasi swatch');
  // #17 Elemen default tetap terlihat tanpa Observer & Back-to-Top tersedia
  assert($('rk-btt-desk') && ![...shell.querySelectorAll('.card')].some((c) => c.classList.contains('rk-scroll-pending')), 'card default tetap terlihat tanpa JS/Observer & tombol back-to-top tersedia');

  // Tahap 1b: Bug integritas data Mode Perjalanan di desktop aktif (browser-app.js)
  w.setMode('trip');
  const dTripId = 'p_desk_t1b';
  w.ALL.kas.pr[dTripId] = {
    id: dTripId, name: 'Desktop Integrity Trip', saldo: 0, link: false,
    start: '2026-12-01', end: '2026-12-05', budget: 10000000, cur: 'JPY', rate: 110,
    dt: {}, tx: [],
    it: [{ id: 'd_it1', day: '2026-12-01', time: '09:00', time2: '', place: 'Narita Express', cat: 'Transport', est: 300000, fx: false, pay: 'cash', link: '', note: '', done: false, rec: '' }],
    bk: [{ id: 'd_bk1', title: 'Hotel Tokyo', cat: 'Penginapan', amt: 5000000, fx: false, pay: 'on', link: '', a: '2026-12-01', b: '2026-12-05', paid: false, rec: '' }],
    lk: [{ id: 'd_lk1', title: 'Peta Metro', url: 'https://tokyometro.jp' }],
    ck: [{ id: 'd_ck1', text: 'Paspor', done: false }],
    note: '', goal: null,
  };
  w.setTrip(dTripId);
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'sv';
  w.BR_STATE.tripGoalEdit = false;
  w.renderAll();

  // 1b-1. Submit #trip-goal-form menghitung & menyimpan `per`, lolos normKas, dan tervalidasi
  $('tg-t').value = '6000000';
  fire($('tg-t'), 'input');
  $('tg-s0').value = '1500000';
  fire($('tg-s0'), 'input');
  $('tg-from').value = '2026-10';
  $('tg-to').value = '2026-12';
  $('tg-link').value = '1';
  fire($('trip-goal-form'), 'submit');
  const dGoalSaved = w.ALL.kas.pr[dTripId].goal;
  assert(dGoalSaved && dGoalSaved.per === 1500000, 'Tahap 1b (Bug 1): submit #trip-goal-form menyimpan per=1500000 untuk (6jt-1.5jt)/3 bulan');
  const dGoalNorm = w.normKas(JSON.parse(JSON.stringify(w.ALL.kas))).pr[dTripId].goal;
  assert(dGoalNorm && dGoalNorm.per === 1500000, 'Tahap 1b (Bug 1): goal desktop tetap bertahan setelah normKas');
  // Validasi menolak bulan terbalik & target <= s0 tanpa merusak goal yang tersimpan
  click($('br-tg-edit'));
  $('tg-to').value = '2026-09';
  fire($('trip-goal-form'), 'submit');
  assert(w.ALL.kas.pr[dTripId].goal.to === '2026-12' && $('tg-to').classList.contains('rk-input-error'), 'Tahap 1b (Bug 1): bulan selesai < bulan mulai ditolak & menggoyang #tg-to');
  $('tg-to').value = '2026-12';
  $('tg-t').value = '1000000';
  fire($('tg-t'), 'input');
  fire($('trip-goal-form'), 'submit');
  assert(w.ALL.kas.pr[dTripId].goal.t === 6000000 && $('tg-t').classList.contains('rk-input-error'), 'Tahap 1b (Bug 1): target <= s0 ditolak & menggoyang #tg-t');
  w.BR_STATE.tripGoalEdit = false;

  // Dampak ke Rincian Bulanan (calc()) pada tahun cocok, tahun berbeda, & privacy-mode
  w.setMode('rencana');
  w.switchYear(2026);
  const c2026WithGoal = w.calc();
  w.ALL.kas.pr[dTripId].goal.link = false;
  const c2026Unlinked = w.calc();
  w.ALL.kas.pr[dTripId].goal.link = true;
  assert.strictEqual(c2026Unlinked.end - c2026WithGoal.end, 3 * 1500000, 'Tahap 1b: target terhubung menghitung 3x1.500.000 di calc() 2026 tanpa NaN');
  w.switchYear(2027);
  assert(!Number.isNaN(w.calc().end), 'Tahap 1b: calc() pada tahun di luar bulan target tidak menghasilkan NaN');
  w.switchYear(2026);
  click($('btn-privacy'));
  w.renderAll();
  assert(w.document.body.classList.contains('privacy-mode') && !Number.isNaN(w.calc().end), 'Tahap 1b: mode privasi + goal tersimpan berjalan aman');
  click($('btn-privacy'));

  // 1b-2. Hapus item Perjalanan desktop memakai askConfirm + snap() + Undo (#ttu)
  w.setMode('trip');
  click(shell.querySelector('[data-trip-open="' + dTripId + '"]'));
  const verifyDeskDel = (subTab, triggerFn, existsFn, label) => {
    w.BR_STATE.tripSubTab = subTab;
    w.renderTrip();
    $('tt').hidden = true;
    $('ttm').textContent = '';
    triggerFn();
    const cfm1 = w.document.querySelector('.modal.cfm');
    assert(cfm1, 'Tahap 1b (Bug 2 - ' + label + '): dialog konfirmasi tampil');
    assert(existsFn(), 'Tahap 1b (Bug 2 - ' + label + '): data belum terhapus sebelum konfirmasi');
    assert(!/dihapus/i.test($('ttm').textContent), 'Tahap 1b (Bug 2 - ' + label + '): toast terhapus belum muncul sebelum konfirmasi');
    click(cfm1.querySelector('[data-cf-n]'));
    assert(existsFn() && !/dihapus/i.test($('ttm').textContent), 'Tahap 1b (Bug 2 - ' + label + '): Batal menjaga data & tanpa toast hapus');
    triggerFn();
    const cfm2 = w.document.querySelector('.modal.cfm');
    click(cfm2.querySelector('[data-cf-y]'));
    assert(!existsFn(), 'Tahap 1b (Bug 2 - ' + label + '): Ya hapus menghapus data');
    assert(!$('ttu').hidden && /dihapus/i.test($('ttm').textContent), 'Tahap 1b (Bug 2 - ' + label + '): toast Urungkan tampil');
    click($('ttu'));
    assert(existsFn(), 'Tahap 1b (Bug 2 - ' + label + '): klik Urungkan memulihkan data');
  };

  w.BR_STATE.tripSubTab = 'itin';
  w.renderTrip();
  click(shell.querySelector('[data-trip-it-edit="d_it1"]'));
  assert.strictEqual(w.BR_STATE.tripEditItId, 'd_it1', 'edit kegiatan disetel sebelum uji hapus');
  verifyDeskDel('itin', () => click(shell.querySelector('[data-trip-it-del="d_it1"]')), () => w.ALL.kas.pr[dTripId].it.some((x) => x.id === 'd_it1'), 'kegiatan');
  assert.strictEqual(w.BR_STATE.tripEditItId, null, 'hapus kegiatan yang sedang diedit mereset tripEditItId');

  verifyDeskDel('book', () => click(shell.querySelector('[data-bk-del="d_bk1"]')), () => w.ALL.kas.pr[dTripId].bk.some((x) => x.id === 'd_bk1'), 'pemesanan');
  verifyDeskDel('cek', () => click(shell.querySelector('[data-ck-del="d_ck1"]')), () => w.ALL.kas.pr[dTripId].ck.some((x) => x.id === 'd_ck1'), 'checklist');
  verifyDeskDel('cat', () => click(shell.querySelector('[data-lk-del="d_lk1"]')), () => w.ALL.kas.pr[dTripId].lk.some((x) => x.id === 'd_lk1'), 'tautan');
  verifyDeskDel('sv', () => click($('br-tg-del')), () => !!w.ALL.kas.pr[dTripId].goal, 'target tabungan');
  verifyDeskDel('ring', () => click($('br-trip-del')), () => !!w.ALL.kas.pr[dTripId], 'hapus perjalanan');
  w.setMode('rencana');

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('Semua pengujian browser_redesign lulus tanpa error!');
  process.exit(0);
})();
