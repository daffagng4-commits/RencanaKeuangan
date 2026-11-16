// Verifikasi Fase 4 & 5 Mode Aplikasi HP (#mobile-app-shell):
// navigasi 5-slot bottom nav, input nominal bertitik (num-input), tandai lunas tagihan,
// transaksi kas, mode perjalanan lengkap, notifikasi bar HP, pratinjau laporan, dan sinkronisasi 2 arah dengan Browser Mode.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;
  const doc = w.document;

  // Seed data awal yang deterministik untuk tahun aktif
  w.__today = '2026-11-12';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 10000000;
  w.S.items = [
    { id: 901, name: 'Internet Fiber', price: 450000, n: 1, unit: 'bulan', start: '2026-11-15', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
    { id: 902, name: 'Gaji Bulanan', price: 12000000, n: 1, unit: 'bulan', start: '2026-11-01', end: '', cnt: 0, cat: 'Pemasukan', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().saldo = 0;
  w.kasLinked().tx = [];
  w.renderAll();

  // 1. Beralih ke Mode Aplikasi HP (#mobile-app-shell) & verifikasi 5-slot Bottom Nav
  w.setShellMode('mobile-app');
  assert.strictEqual(doc.body.getAttribute('data-shell'), 'mobile-app', 'body[data-shell] menjadi mobile-app');
  const mobShell = $('mobile-app-shell').querySelector('.mob-shell');
  assert(mobShell, '#mobile-app-shell .mob-shell terpasang');
  const bnav = mobShell.querySelector('.mob-bottom-nav');
  assert(bnav, 'Bottom navigation ter-render');
  assert.strictEqual(bnav.querySelectorAll('.bn-btn').length, 4, '4 tombol tab navigasi di bottom nav');
  assert($('m-yr-btn-center'), 'tombol emas + Periode di tengah bottom nav ada');
  assert($('m-svg-cashflow'), 'grafik SVG Proyeksi Arus Kas ter-render di tab Rincian');
  assert($('m-svg-jar') && $('m-jar-spotlight'), 'visual 3D Glass Jar (#m-svg-jar) & Spotlight (#m-jar-spotlight) ter-render');
  assert(mobShell.querySelector('#m-upcoming-bills .cat-logo svg'), 'logo kategori memakai SVG ikon penuh sesuai mockup');
  assert.strictEqual(mobShell.querySelectorAll('.pk-in, .pk-field, input[type="date"]').length, 0, 'Mode APK bebas dari input date native atau .pk-in lama');
  click($('m-kas-date-trig'));
  assert($('m-kas-date-cal').classList.contains('open'), 'kalender modern Mode APK terbuka pada #m-kas-date-cal');
  click($('m-kas-date-cal').querySelector('[data-mcal-pick$="-15"]'));
  assert.strictEqual($('m-kas-date').value.slice(-3), '-15', 'memilih tanggal di kalender modern Mode APK memperbarui #m-kas-date');

  // Regresi touchmove slide grafik kas HP & kesamaan titik Hari ini vs hero saldo
  $('m-svg-cashflow').getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 210 });
  const mobTmEv = new w.Event('touchmove', { bubbles: true, cancelable: true });
  mobTmEv.touches = [{ clientX: 160 }];
  $('m-cf-hit').dispatchEvent(mobTmEv);
  assert($('m-cf-tooltip').classList.contains('visible'), 'touchmove pada #m-cf-hit menggeser tooltip Arus Kas Mode HP');
  const mobTodayPt = w.brBuildCashflowPoints('m').find((p) => p.today);
  assert.strictEqual(mobTodayPt.val, w.kasBal(w.kasLinked()).bal, 'titik Hari Ini grafik HP sama dengan saldo kas realtime');

  // 2. Tombol tengah "+" Periode/Saldo -> auto-format 15000000 -> 15.000.000 -> sinkron ke S & Browser #saldo
  click($('m-yr-btn-center'));
  assert($('m-sheet-periode').classList.contains('open'), 'klik tombol tengah membuka sheet periode');
  const cfgSaldo = $('m-cfg-saldo');
  assert.strictEqual(cfgSaldo.getAttribute('data-num-fmt'), 'rp', '#m-cfg-saldo memakai data-num-fmt="rp"');
  cfgSaldo.value = '15000000';
  fire(cfgSaldo, 'input');
  assert.strictEqual(cfgSaldo.value, '15.000.000', 'input #m-cfg-saldo terformat otomatis menjadi 15.000.000');
  click($('m-cfg-save'));
  assert.strictEqual(w.S.saldo, 15000000, 'nilai murni S.saldo tersimpan sebagai Number 15000000');
  assert(!$('m-sheet-periode').classList.contains('open'), 'sheet periode tertutup setelah simpan');
  assert.strictEqual(w.parseRp($('saldo').value), 15000000, 'input Browser Mode #saldo ikut tersinkron 15.000.000');
  assert($('m-rincian-saldo').textContent.includes('15.000.000'), 'hero saldo Mode Aplikasi HP menampilkan 15.000.000');

  // 3. Tab Jadwal -> Horizontal Month Scroller & tandai Lunas tagihan -> sinkron ke S.paid
  click(bnav.querySelector('[data-mtab="jadwal"]'));
  assert($('m-tab-jadwal').classList.contains('active'), 'tab Jadwal aktif');
  assert(mobShell.querySelectorAll('[data-mjmonth]').length === 13, 'Horizontal month scroller berisi Semua + 12 bulan');
  const chip = mobShell.querySelector('[data-mchip="901|2026-11-15"]');
  assert(chip, 'kartu jadwal memuat pil tagihan Internet Fiber 2026-11-15');
  click(chip);
  assert($('m-sheet-chip').classList.contains('open'), 'klik pil tagihan membuka sheet aksi tagihan');
  click(mobShell.querySelector('[data-cp-act="paid"]'));
  assert.strictEqual(w.S.paid['901|2026-11-15'], 1, 'S.paid["901|2026-11-15"] tercatat lunas (1)');

  // 4. Tab Kas (Transaksi) -> auto-format 250000 -> 250.000 -> simpan ke kasLinked().tx & kasBal
  const balBefore = w.kasBal(w.kasLinked()).bal;
  click(bnav.querySelector('[data-mtab="kas"]'));
  assert($('m-tab-kas').classList.contains('active'), 'tab Kas aktif');
  click(mobShell.querySelector('[data-mktype="-"]'));
  const kasAmt = $('m-kas-amt');
  assert.strictEqual(kasAmt.getAttribute('data-num-fmt'), 'rp', '#m-kas-amt memakai data-num-fmt="rp"');
  kasAmt.value = '250000';
  fire(kasAmt, 'input');
  assert.strictEqual(kasAmt.value, '250.000', 'input #m-kas-amt terformat otomatis menjadi 250.000');
  if ($('m-kas-note')) $('m-kas-note').value = 'Belanja Harian';
  fire($('m-kas-form'), 'submit');
  const txAdded = w.kasLinked().tx.find((x) => x.note === 'Belanja Harian');
  assert(txAdded, 'transaksi Belanja Harian masuk ke w.kasLinked().tx');
  assert.strictEqual(txAdded.amt, 250000, 'nominal transaksi tersimpan sebagai angka murni 250000');
  assert.strictEqual(w.kasBal(w.kasLinked()).bal, balBefore - 250000, 'saldo kas berkurang sesuai transaksi');

  // 5. Menu -> Perjalanan: buat perjalanan baru, tambah itinerary, booking, checklist, & catatan
  click($('m-btn-more'));
  assert($('m-sheet-more').classList.contains('open'), 'Menu sheet terbuka');
  click(mobShell.querySelector('[data-mgo="trip"]'));
  assert($('m-tab-trip').classList.contains('active'), 'tab Perjalanan aktif');
  click($('m-btn-trip-new'));
  assert($('m-sheet-trip').classList.contains('open'), 'sheet Perjalanan Baru terbuka');
  $('m-kp-name').value = 'Kyoto 5D4N';
  $('m-kp-start').value = '2026-12-01';
  $('m-kp-end').value = '2026-12-05';
  const kpBudget = $('m-kp-budget');
  kpBudget.value = '12000000';
  fire(kpBudget, 'input');
  assert.strictEqual(kpBudget.value, '12.000.000', 'budget trip terformat 12.000.000');
  fire($('m-trip-meta-form'), 'submit');

  const tripKey = Object.keys(w.ALL.kas.pr).find((k) => w.ALL.kas.pr[k].name === 'Kyoto 5D4N');
  assert(tripKey, 'profil perjalanan Kyoto 5D4N tersimpan di ALL.kas.pr');
  const tripObj = w.ALL.kas.pr[tripKey];
  assert.strictEqual(tripObj.budget, 12000000, 'budget trip tersimpan sebagai 12000000');

  // Itinerary
  click(mobShell.querySelector('[data-mtripsub="itin"]'));
  $('m-it-place').value = 'Fushimi Inari';
  $('m-it-est').value = '150000';
  fire($('m-it-est'), 'input');
  assert.strictEqual($('m-it-est').value, '150.000', 'estimasi itinerary terformat 150.000');
  fire($('m-trip-itin-form'), 'submit');
  assert.strictEqual(tripObj.it.length, 1, 'itinerary ditambahkan ke trip');
  assert.strictEqual(tripObj.it[0].est, 150000, 'estimasi itinerary tersimpan 150000');
  click(mobShell.querySelector('[data-mit-edit="' + tripObj.it[0].id + '"]'));
  assert.strictEqual($('m-it-place').value, 'Fushimi Inari', 'klik Ubah kegiatan itinerary di Mode APK mengisi form');
  $('m-it-place').value = 'Fushimi Inari Pagi';
  fire($('m-trip-itin-form'), 'submit');
  assert.strictEqual(tripObj.it[0].place, 'Fushimi Inari Pagi', 'simpan Ubah kegiatan itinerary di Mode APK tersimpan');

  // Pemesanan (Booking) + Ubah
  click(mobShell.querySelector('[data-mtripsub="book"]'));
  $('m-bk-title').value = 'Shinkansen';
  $('m-bk-amt').value = '2200000';
  fire($('m-bk-amt'), 'input');
  assert.strictEqual($('m-bk-amt').value, '2.200.000', 'nominal booking terformat 2.200.000');
  fire($('m-trip-book-form'), 'submit');
  assert.strictEqual(tripObj.bk.length, 1, 'booking ditambahkan ke trip');
  assert.strictEqual(tripObj.bk[0].amt, 2200000, 'nominal booking tersimpan 2200000');
  click(mobShell.querySelector('[data-mbk-edit="' + tripObj.bk[0].id + '"]'));
  assert.strictEqual($('m-bk-title').value, 'Shinkansen', 'klik Ubah pemesanan di Mode APK mengisi form');
  $('m-bk-title').value = 'Shinkansen Green Car';
  fire($('m-trip-book-form'), 'submit');
  assert.strictEqual(tripObj.bk[0].title, 'Shinkansen Green Car', 'simpan Ubah pemesanan di Mode APK tersimpan');

  // Checklist (verifikasi properti .text kompatibel dengan normKas)
  click(mobShell.querySelector('[data-mtripsub="cek"]'));
  $('m-ck-inp').value = 'Paspor & JR Pass';
  fire($('m-trip-ck-form'), 'submit');
  assert.strictEqual(tripObj.ck.length, 1, 'checklist ditambahkan');
  assert.strictEqual(tripObj.ck[0].text, 'Paspor & JR Pass', 'item checklist memakai properti .text');
  const ckBox = mobShell.querySelector('[data-mck-tog="' + tripObj.ck[0].id + '"]');
  assert(ckBox, 'checkbox checklist ter-render');
  ckBox.checked = true;
  fire(ckBox, 'change');
  assert.strictEqual(tripObj.ck[0].done, true, 'checkbox checklist memperbarui status done');

  // Catatan Perjalanan + Target Tabungan (6 subtab trip) + Tambah Cepat Item HP
  click(mobShell.querySelector('[data-mtripsub="cat"]'));
  const noteEl = $('m-trip-note');
  noteEl.value = 'Check-in hotel pukul 15:00';
  fire(noteEl, 'input');
  assert.strictEqual(tripObj.note, 'Check-in hotel pukul 15:00', 'catatan perjalanan tersimpan di ALL.kas.pr');
  click(mobShell.querySelector('[data-mtripsub="sv"]'));
  assert($('m-trip-goal-form'), 'subtab Target Tabungan (sv) ter-render di Mode HP');
  click(mobShell.querySelector('[data-mgo="item"]'));
  $('m-qp-input').value = 'Spotify 55rb tiap tgl 7';
  fire($('m-qp-input'), 'input');
  click($('m-qp-submit'));
  assert(w.S.items.some((x) => x.name === 'Spotify' && x.price === 55000), 'Tambah Cepat item berfungsi di Mode HP');

  // 6. Pengaturan Notifikasi, Notif Bar HP (#m-os-notif), dan Pratinjau Laporan d/w/m/y
  click($('m-btn-more'));
  click(mobShell.querySelector('[data-mgo="settings"]'));
  assert($('m-tab-settings').classList.contains('active'), 'tab Settings aktif');
  click($('m-btn-test-notif'));
  assert($('m-os-notif').classList.contains('show'), 'notifikasi bar HP #m-os-notif muncul saat dipicu');
  for (const [k, label] of Object.entries({ d: 'Harian', w: 'Mingguan', m: 'Bulanan', y: 'Tahunan' })) {
    click(mobShell.querySelector('[data-mrep="' + k + '"]'));
    assert($('m-rep-sub').textContent.includes(label), 'pratinjau laporan tab ' + k + ' memuat ' + label);
    assert($('m-report-preview').querySelector('.rep-table'), 'pratinjau laporan tab ' + k + ' merender tabel laporan');
  }

  // 7. Pindah kembali ke Mode Browser -> #mobile-app-shell ter-unmount & semua data dari Mode Aplikasi HP tetap ada
  w.setShellMode('browser');
  assert.strictEqual(doc.body.getAttribute('data-shell'), 'browser', 'body[data-shell] kembali ke browser');
  assert.strictEqual($('mobile-app-shell').innerHTML, '', '#mobile-app-shell ter-unmount bersih di Mode Browser');
  assert.strictEqual(w.S.saldo, 15000000, 'Browser Mode tetap memegang S.saldo 15000000');
  assert.strictEqual(w.S.paid['901|2026-11-15'], 1, 'Browser Mode tetap memegang status Lunas 901|2026-11-15');
  assert(w.kasLinked().tx.some((x) => x.note === 'Belanja Harian' && x.amt === 250000), 'Browser Mode melihat transaksi dari Mode Aplikasi HP');
  assert(w.ALL.kas.pr[tripKey] && w.ALL.kas.pr[tripKey].ck[0].text === 'Paspor & JR Pass', 'Browser Mode melihat data trip & checklist');

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('OK mobile_app_mode');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL mobile_app_mode:', e);
  process.exit(1);
});
