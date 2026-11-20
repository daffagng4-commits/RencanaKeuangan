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
  assert($('m-yr-btn-center'), 'tombol emas + di tengah bottom nav ada');
  assert(!bnav.querySelector('.bn-center-lbl'), 'keterangan teks Periode dihapus dari bottom nav');
  assert.strictEqual($('m-user-name').textContent.trim(), 'Halo, XXX', 'sapaan Mode APK menampilkan Halo, XXX saat belum login');
  assert.strictEqual($('m-acct-ini').textContent.trim(), '', 'lingkaran avatar Mode APK kosong saat belum login');
  assert($('m-acct-btn').querySelector('.av-circle').classList.contains('anon'), 'lingkaran avatar Mode APK abu-abu (.anon) saat belum login');
  w.acctUI({ email: 'davinagng@gmail.com', user_metadata: { full_name: 'Davina Pratama' } });
  assert.strictEqual($('m-acct-ini').textContent.trim(), 'D', 'lingkaran avatar Mode APK menjadi D saat login Google');
  assert.strictEqual($('m-user-name').textContent.trim(), 'Halo, Davina', 'sapaan Mode APK menjadi nama depan Halo, Davina');
  w.acctUI(null);
  click($('m-acct-btn'));
  assert($('m-acct-popover').classList.contains('open') && $('m-acct-btn').classList.contains('on'), 'klik #m-acct-btn membuka popover Akun dengan status aktif');
  click($('m-menu-acct'));
  assert($('m-sheet-acct').classList.contains('open') && !$('m-acct-popover').classList.contains('open') && $('m-lg-google'), 'sheet akun Mode APK terbuka dari #m-menu-acct di popover dan memuat tombol Masuk dengan Google (Gmail)');
  click($('m-sheet-acct').querySelector('[data-mclose="m-sheet-acct"]'));
  assert($('m-svg-cashflow'), 'grafik SVG Proyeksi Arus Kas ter-render di tab Rincian');
  assert($('m-svg-jar') && !$('m-jar-spotlight'), 'visual 3D Glass Jar (#m-svg-jar) terpusat tanpa kotak spotlight samping');
  assert(!$('m-where-sub'), 'sub-keterangan nominal (#m-where-sub) dihapus dari card Ke Mana Uangnya Pergi');
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
  $('m-cf-hit').dispatchEvent(new w.Event('touchend', { bubbles: true }));
  assert(!$('m-cf-tooltip').classList.contains('visible'), 'touchend menyembunyikan tooltip Arus Kas Mode HP');
  assert.strictEqual($('m-cf-strip'), null, 'keterangan strip Hari ini dihapus dari card Proyeksi Arus Kas');
  const cfRangeSeg = mobShell.querySelector('.cf-range-seg');
  assert(cfRangeSeg && cfRangeSeg.querySelector('[data-mrange="w"]') && cfRangeSeg.querySelector('[data-mrange="m"]') && cfRangeSeg.querySelector('[data-mrange="y"]'), 'filter Minggu/Bulan/Tahun dipindah ke card Proyeksi Arus Kas');
  const heroCard = mobShell.querySelector('.wallet-hero');
  assert(heroCard && !heroCard.querySelector('[data-mrange]'), 'card Saldo Realtime tidak lagi memuat filter Minggu/Bulan/Tahun');
  assert(heroCard.querySelector('.wallet-io-ico.in') && $('m-hero-inc'), 'card Saldo Realtime memuat kotak pemasukan setahun dengan panah hijau ke atas');
  assert(heroCard.querySelector('.wallet-io-ico.out') && $('m-hero-out'), 'card Saldo Realtime memuat kotak pengeluaran setahun dengan panah merah ke bawah');
  const ycCheck = w.yearCash();
  assert.strictEqual($('m-hero-inc').textContent, w.rp(ycCheck.inc || 0), 'kotak pemasukan hero menampilkan total pemasukan setahun');
  assert.strictEqual($('m-hero-out').textContent, w.rp(ycCheck.out || 0), 'kotak pengeluaran hero menampilkan total pengeluaran setahun');
  assert.strictEqual($('m-runway-pill'), null, 'keterangan pil Defisit di wallet-hero dihapus');
  const whereRow = mobShell.querySelector('.where-filter-row');
  assert(whereRow && whereRow.querySelector('[data-mwperiod]') && whereRow.querySelector('[data-mwdir]'), 'filter Minggu/Bulan/Tahun dan Keluar/Masuk berada pada satu baris .where-filter-row');
  click($('m-btn-expand-cf'));
  assert($('m-sheet-cf-zoom').classList.contains('open') && $('m-svg-cf-zoom').querySelector('.cf-node'), 'tombol Perbesar membuka popup grafik mode desktop');
  assert.strictEqual($('m-svg-cf-zoom').style.touchAction, 'pan-y', 'grafik Perbesar memakai touch-action: pan-y agar scroll vertikal tetap jalan');
  assert.strictEqual($('m-svg-cf-zoom').getAttribute('viewBox'), '0 0 600 320', 'grafik Perbesar memakai rasio lebih tinggi agar besar dan jelas di HP');
  $('m-cf-zoom-scrub').value = '75';
  fire($('m-cf-zoom-scrub'), 'input');
  assert($('m-cf-zoom-tip').classList.contains('visible'), 'menggeser #m-cf-zoom-scrub memunculkan tooltip garis grafik');
  click($('m-cf-zoom-wide'));
  assert($('m-svg-cf-zoom').classList.contains('is-zoom-wide'), 'tombol Perlebar memperbesar lebar grafik');
  click(mobShell.querySelector('[data-mzmode="pan"]'));
  assert.strictEqual($('m-svg-cf-zoom').style.touchAction, 'pan-x pan-y', 'mode Geser di Perlebar mengizinkan scroll jari horizontal');
  assert($('m-cf-zoom-stage') && $('m-cf-zoom-tip').parentElement === $('m-cf-zoom-stage'), 'tooltip zoom berada di stage luar agar tidak terpotong scroll kanan');
  click($('m-sheet-cf-zoom').querySelector('[data-mclose="m-sheet-cf-zoom"]'));
  assert(!$('m-sheet-cf-zoom').classList.contains('open'), 'popup grafik Perbesar dapat ditutup');
  // Uji jarak label sumbu X grafik Tahun tidak tumpang tindih dengan Hari ini
  click(mobShell.querySelector('[data-mrange="y"]'));
  const xLabelXs = [...$('m-svg-cashflow').querySelectorAll('text[text-anchor="middle"]')].map((el) => +el.getAttribute('x')).sort((a, b) => a - b);
  for (let xi = 1; xi < xLabelXs.length; xi++) {
    assert(xLabelXs[xi] - xLabelXs[xi - 1] >= 48, 'label sumbu X grafik Mode APK tidak saling bertabrakan: ' + xLabelXs.join(','));
  }
  click(mobShell.querySelector('[data-mrange="m"]'));
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
  // Uji 5 opsi Ubah Harga / Jadwal Mode APK (tanpa Atur manual) & form Geser tanggal bebas popup kalender
  click(mobShell.querySelector('[data-mchip="901|2026-12-15"]'));
  click(mobShell.querySelector('[data-cp-act="edit"]'));
  assert($('m-sheet-scenario').classList.contains('open'), 'sheet Ubah Harga / Jadwal terbuka');
  const scenTabs = [...$('m-scen-tabs').querySelectorAll('[data-mscen]')].map((b) => b.getAttribute('data-mscen'));
  assert.deepStrictEqual(scenTabs, ['change_price', 'temp_price', 'cycle', 'shift', 'stop'], 'sheet Ubah Harga / Jadwal memuat 5 fitur tanpa Atur manual');
  click($('m-scen-tabs').querySelector('[data-mscen="shift"]'));
  assert($('m-sc-shift-day') && $('m-sc-month') && !$('m-sheet-scenario').querySelector('.picker-popover'), 'Geser tanggal Mode APK memakai input tanggal 1-31 + bulan tanpa popup kalender terpotong');
  $('m-sc-shift-day').value = '20';
  click($('m-btn-save-scen'));
  assert(!$('m-sheet-scenario').classList.contains('open'), 'sheet skenario tertutup setelah simpan');
  assert(w.occ(w.item(901), 2026).some((t) => w.isoD(t) === '2026-12-20'), 'tanggal tagihan Desember berhasil digeser ke 20 Des 2026');

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
  // Uji Utang & Piutang Mode APK: tombol Lunas & Cicil auto-direct ke + Masuk & update sisa nominal
  w.kasLinked().tx.push({ id: 'm_p1', d: '2026-11-12', t: '-', amt: 300000, cat: 'Lainnya', note: 'Budi', debt: true, debtKind: 'piutang', debtName: 'Budi' });
  w.renderMobKas();
  assert.strictEqual($('m-debt-list').querySelector('[data-mdebt-pay="Budi"]').textContent.trim(), 'Lunas', 'tombol Lunas di Mode APK berlabel Lunas');
  click($('m-debt-list').querySelector('[data-mdebt-cicil="Budi"]'));
  assert.strictEqual(w.MOB_STATE.kasType, '+', 'Cicil piutang Mode APK mengarahkan form ke + Masuk');
  assert.strictEqual($('m-kas-debt-kind').value, 'bayar-piutang', 'dropdown jenis utang Mode APK otomatis bayar-piutang');
  $('m-kas-amt').value = '100000';
  fire($('m-kas-amt'), 'input');
  fire($('m-kas-form'), 'submit');
  assert($('m-debt-list').textContent.includes('200rb') || $('m-debt-list').textContent.includes('200.000'), 'sisa piutang Mode APK otomatis berkurang menjadi 200rb');
  assert($('m-kas-hist-list').textContent.includes('Sisa Rp 200.000'), 'riwayat kas Mode APK menampilkan Sisa Rp 200.000');
  // Uji dropdown kategori Riwayat Transaksi menampilkan ikon .cat-logo & bisa memilih kategori
  assert($('m-kas-cat-val').querySelector('.cat-logo'), 'trigger filter kategori memuat ikon .cat-logo');
  const mOptMak = $('m-kas-cat-menu').querySelector('[data-mcatval="Transport"]');
  assert(mOptMak && mOptMak.querySelector('.cat-logo'), 'opsi dropdown kategori Mode APK memuat ikon kategori');
  click($('m-kas-cat-trig'));
  assert($('m-kas-cat-ms').classList.contains('open'), 'dropdown kategori Mode APK terbuka');
  click(mOptMak);
  assert.strictEqual($('m-kas-flt-cat').value, 'Transport', 'memilih opsi dropdown ikon memperbarui filter kategori');
  click($('m-kas-flt-reset'));
  assert.strictEqual($('m-kas-flt-cat').value, 'all', 'reset filter mengembalikan Semua Kategori');

  // Uji checkDueNotifications, tanda merah #m-notif-dot, CTA aktifkan notif, dan swipe kanan hapus notif
  w.S.paid['902|2026-11-01'] = 1;
  w.renderMobSettings();
  assert.strictEqual($('m-notif-dot').style.display, 'none', 'default tidak ada tanda merah #m-notif-dot saat belum ada tagihan jatuh tempo');
  w.S.items.push({ id: 903, name: 'Tagihan Hari Ini', price: 99000, n: 1, unit: 'bulan', start: w.todayISO(), end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] });
  w.renderMobSettings();
  assert.strictEqual($('m-notif-dot').style.display, 'block', 'tanda merah #m-notif-dot muncul saat ada tagihan jatuh tempo');
  $('m-os-notif').classList.remove('show');
  try { w.localStorage.removeItem('rk_last_bill_notif_sig'); w.localStorage.removeItem('rk_last_bill_notif_sig_mobile-app'); } catch (e) {}
  w['__rkLastNotifSig_mobile-app'] = '';
  w.checkDueNotifications(false);
  assert($('m-os-notif').classList.contains('show'), 'checkDueNotifications otomatis menampilkan #m-os-notif saat ada tagihan jatuh tempo hari ini');
  assert($('m-pon-body').textContent.includes('Tagihan Hari Ini'), 'isi notif otomatis menyebut nama tagihan yang jatuh tempo hari ini');
  $('m-os-notif').classList.remove('show');
  w.checkDueNotifications(false);
  assert(!$('m-os-notif').classList.contains('show'), 'notifikasi otomatis hanya muncul 1 kali untuk daftar tagihan & hari yang sama');
  // Buka popover lonceng atas -> tombol CTA aktifkan notif -> swipe kanan hapus isi notif
  click($('m-btn-notif'));
  assert($('m-notif-popover').classList.contains('open'), 'popover notifikasi terbuka dari tombol lonceng atas');
  const enBtn = $('m-pop-enable-os');
  assert(enBtn && enBtn.textContent.includes('Pencet, untuk aktifkan notifikasi'), 'popover memuat keterangan Pencet, untuk aktifkan notifikasi saat izin OS belum aktif');
  const swItem = $('m-notif-pop-list').querySelector('.m-notif-swipe-row');
  assert(swItem, 'item notif bisa di-swipe di popover');
  const tsEv = new w.Event('touchstart', { bubbles: true }); tsEv.touches = [{ clientX: 20 }]; swItem.dispatchEvent(tsEv);
  const tmEv = new w.Event('touchmove', { bubbles: true }); tmEv.touches = [{ clientX: 110 }]; swItem.dispatchEvent(tmEv);
  swItem.dispatchEvent(new w.Event('touchend', { bubbles: true }));
  assert(!$('m-notif-pop-list').querySelector('.m-notif-swipe-row'), 'slide ke kanan menghapus isi notif dari popover');
  assert.strictEqual($('m-notif-dot').style.display, 'none', 'tanda merah #m-notif-dot hilang setelah semua notif dihapus');
  click($('m-pop-enable-os'));
  assert(!$('m-notif-popover').classList.contains('open') && $('m-tab-settings').classList.contains('active'), 'klik Pencet, untuk aktifkan notifikasi langsung menuju Pengaturan Notifikasi APK');
  // Uji tombol khusus aktivasi & reset notifikasi di Pengaturan + dukungan iOS requestPermission callback/promise
  const actBtn = $('m-btn-notif-activate');
  assert(actBtn && actBtn.textContent.includes('Pencet, untuk aktifkan notifikasi'), 'button khusus di Pengaturan Notifikasi memuat Pencet, untuk aktifkan notifikasi');
  const prevNotif = w.Notification;
  function FakeNotif() {}
  FakeNotif.permission = 'default';
  FakeNotif.requestPermission = (cb) => { FakeNotif.permission = 'granted'; if (cb) cb('granted'); return Promise.resolve('granted'); };
  w.Notification = FakeNotif;
  click(actBtn);
  await new Promise((r) => setTimeout(r, 15));
  assert(actBtn.classList.contains('is-active') && actBtn.textContent.includes('Notifikasi, sudah aktif. klik untuk reset notif'), 'button berubah ke status aktif & ket klik untuk reset notif');
  assert.strictEqual($('m-notif-perm-badge').textContent, 'OS & Bar Aktif', 'badge berubah menjadi OS & Bar Aktif');
  click(actBtn);
  assert(!actBtn.classList.contains('is-active') && actBtn.textContent.includes('Pencet, untuk aktifkan notifikasi'), 'klik saat aktif mereset izin notif kembali ke awal');
  assert.strictEqual(w.rkIsNotifReset(), true, 'rkIsNotifReset menjadi true setelah reset notif');
  assert.strictEqual($('m-set-notif-enabled').checked, false, 'switch Pengingat Bar HP ikut dimatikan saat reset notif');
  w.rkSetNotifReset(false);
  if (prevNotif === undefined) delete w.Notification;
  else w.Notification = prevNotif;
  click(bnav.querySelector('[data-mtab="kas"]'));

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
  // Kelola Item tergabung di tab Jadwal
  click(bnav.querySelector('[data-mtab="jadwal"]'));
  click(mobShell.querySelector('[data-mjsub="add"]'));
  $('m-qp-input').value = 'Spotify 55rb tiap tgl 7';
  fire($('m-qp-input'), 'input');
  click($('m-qp-submit'));
  assert(w.S.items.some((x) => x.name === 'Spotify' && x.price === 55000), 'Tambah Cepat item berfungsi di dalam tab Jadwal');

  // 6. Menu streamlined + Pengaturan (Akun, Cadangan, Notif Bar HP, Pratinjau Laporan >5 baris toggle)
  click($('m-btn-more'));
  const menuMore = $('m-sheet-more');
  assert(!menuMore.querySelector('[data-mopen-rep]'), 'menu Laporan PDF dihapus dari Menu');
  assert(!menuMore.querySelector('[data-shell-switch="browser"]'), 'menu Mode Browser dihapus dari Menu');
  assert(!menuMore.querySelector('#m-menu-backup') && !menuMore.querySelector('#m-menu-acct') && !menuMore.querySelector('[data-mgo="item"]'), 'Cadangan, Akun, & Kelola Item dipindah/digabung dari Menu');
  assert.strictEqual(menuMore.querySelector('[data-mgo="settings"] strong').textContent, 'Pengaturan', 'label menu menjadi Pengaturan');
  click(menuMore.querySelector('[data-mgo="settings"]'));
  assert($('m-tab-settings').classList.contains('active'), 'tab Settings aktif');
  assert($('m-card-settings-acct') && $('m-card-settings-backup'), 'Akun & Cadangan tersedia di Pengaturan');
  click($('m-btn-test-notif'));
  assert($('m-os-notif').classList.contains('show'), 'notifikasi bar HP #m-os-notif muncul saat dipicu');
  // Tambah >5 transaksi pada bulan aktif untuk menguji tombol Ringkas / Tampilkan semua di Laporan Keuangan
  for (let i = 1; i <= 7; i++) w.kasLinked().tx.push({ id: 'rep_' + i, d: '2026-11-0' + i, t: '-', amt: 10000 * i, cat: 'Makanan', note: 'Tx' + i });
  for (const [k, label] of Object.entries({ d: 'Harian', w: 'Mingguan', m: 'Bulanan', y: 'Tahunan' })) {
    click(mobShell.querySelector('[data-mrep="' + k + '"]'));
    assert($('m-rep-sub').textContent.includes(label), 'pratinjau laporan tab ' + k + ' memuat ' + label);
    assert($('m-report-preview').querySelector('.rep-table'), 'pratinjau laporan tab ' + k + ' merender tabel laporan');
  }
  click(mobShell.querySelector('[data-mrep="m"]'));
  assert.strictEqual($('m-report-preview').querySelector('.rep-table tbody').querySelectorAll('tr').length, 5, 'tabel Laporan Keuangan dibatasi 5 baris awal');
  const repTog = $('m-report-preview').querySelector('[data-mrep-tog]');
  assert(repTog && /Tampilkan semua/.test(repTog.textContent), 'tombol Tampilkan semua muncul saat >5 baris');
  click(repTog);
  assert($('m-report-preview').querySelector('.rep-table tbody').querySelectorAll('tr').length > 5, 'klik Tampilkan semua memperpanjang daftar >5 baris');

  // 7. Pindah kembali ke Mode Browser -> #mobile-app-shell ter-unmount & semua data dari Mode Aplikasi HP tetap ada
  w.setShellMode('browser');
  assert.strictEqual(doc.body.getAttribute('data-shell'), 'browser', 'body[data-shell] kembali ke browser');
  assert.strictEqual($('mobile-app-shell').innerHTML, '', '#mobile-app-shell ter-unmount bersih di Mode Browser');
  assert.strictEqual(w.S.saldo, 15000000, 'Browser Mode tetap memegang S.saldo 15000000');
  assert.strictEqual(w.S.paid['901|2026-11-15'], 1, 'Browser Mode tetap memegang status Lunas 901|2026-11-15');
  assert(w.kasLinked().tx.some((x) => x.note === 'Belanja Harian' && x.amt === 250000), 'Browser Mode melihat transaksi dari Mode Aplikasi HP');
  assert(w.ALL.kas.pr[tripKey] && w.ALL.kas.pr[tripKey].ck[0].text === 'Paspor & JR Pass', 'Browser Mode melihat data trip & checklist');

  // 8. Kembali ke Mode APK & uji logout (#m-acct-logout) tetap berhasil walau sb.auth.signOut error
  w.setShellMode('mobile-app');
  const qRes = (d) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: d, error: null }),
    then: (cb) => Promise.resolve({ data: d ? [d] : [], error: null }).then(cb),
  });
  w.sb = {
    auth: { signOut: async () => { throw new Error('network/session error'); } },
    from: () => ({ select() { return qRes(null); }, upsert: () => qRes({ rev: 1 }), update: () => qRes({ rev: 1 }) }),
  };
  w.setUser({ user: { id: 'hp_u1', email: 'davinagng@gmail.com', user_metadata: { full_name: 'Davina Pratama' } } });
  assert.strictEqual($('m-user-name').textContent, 'Halo, Davina', 'header Mode APK menampilkan nama akun sebelum logout');
  click($('m-acct-btn'));
  assert($('m-acct-popover').classList.contains('open'), 'popover Akun terbuka dari avatar Mode APK');
  click($('m-menu-acct'));
  assert($('m-sheet-acct').classList.contains('open') && !$('m-acct-popover').classList.contains('open'), 'sheet Akun terbuka dari popover avatar Mode APK');
  const outBtn = $('m-acct-logout');
  assert(outBtn, 'tombol #m-acct-logout tersedia di sheet Akun');
  click(outBtn);
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(w.sbUser, null, 'sbUser terhapus menjadi null setelah klik #m-acct-logout');
  assert.strictEqual($('m-user-name').textContent, 'Halo, XXX', 'nama header kembali menjadi Halo, XXX setelah logout Mode APK');
  assert(!$('m-sheet-acct').classList.contains('open'), 'sheet Akun tertutup setelah logout');

  // 9. Fase 2: Kategori check icon + Checkbox .rk-check + Drag-to-dismiss sheet backdrop click
  w.switchMobileTab('kas');
  const mCatPick = $('m-kas-cat-pills').querySelector('[data-mkcatpick="Investasi"]');
  assert(mCatPick && mCatPick.querySelector('.cat-check-ico'), 'pil kategori APK memiliki .cat-check-ico');
  click(mCatPick);
  assert($('m-kas-cat-pills').querySelector('.active.just-selected[data-mkcatpick="Investasi"]'), 'pil kategori APK aktif dengan .just-selected');
  assert($('mobile-app-shell').querySelector('.rk-check .rk-check-svg path'), 'checkbox APK dibungkus .rk-check dengan SVG centang');
  w.mobOpenSheet('m-sheet-more');
  assert($('m-sheet-more').classList.contains('open'), 'sheet Lainnya terbuka');
  click($('m-sheet-more'));
  assert(!$('m-sheet-more').classList.contains('open'), 'klik backdrop menutup sheet APK');

  // 10. Regresi Masalah A, B, C di Mode APK
  const curMobShell = $('mobile-app-shell');
  // Masalah A (1): hapus transaksi -> batal = data utuh & tanpa toast
  w.kasLinked().tx.push({ id: 'mob_del_tx1', d: '2026-11-12', t: '-', amt: 77000, cat: 'Makanan', note: 'Uji Hapus APK' });
  w.save();
  w.switchMobileTab('kas');
  $('m-toast-box').classList.remove('show');
  $('m-toast-box').textContent = '';
  const delTxBtn = curMobShell.querySelector('[data-mdeltx="mob_del_tx1"]');
  assert(delTxBtn, 'tombol hapus transaksi APK ada');
  click(delTxBtn);
  let cfmBox = doc.querySelector('.modal.cfm');
  assert(cfmBox && cfmBox.classList.contains('open'), 'klik hapus transaksi APK membuka dialog konfirmasi');
  assert(w.kasLinked().tx.some((x) => x.id === 'mob_del_tx1'), 'data transaksi BELUM terhapus sebelum konfirmasi ditekan');
  assert(!$('m-toast-box').classList.contains('show'), 'toast terhapus TIDAK muncul di belakang konfirmasi sebelum disetujui');
  click(cfmBox.querySelector('[data-cf-n]'));
  assert(!doc.querySelector('.modal.cfm'), 'klik Batal menutup konfirmasi');
  assert(w.kasLinked().tx.some((x) => x.id === 'mob_del_tx1'), 'klik Batal membiarkan transaksi tetap utuh');
  assert(!$('m-toast-box').classList.contains('show'), 'klik Batal tidak memunculkan toast');

  // Masalah A (2): hapus transaksi -> konfirmasi = data terhapus & toast muncul sekali
  click(curMobShell.querySelector('[data-mdeltx="mob_del_tx1"]'));
  cfmBox = doc.querySelector('.modal.cfm');
  click(cfmBox.querySelector('[data-cf-y]'));
  assert(!w.kasLinked().tx.some((x) => x.id === 'mob_del_tx1'), 'klik konfirmasi menghapus transaksi');
  assert($('m-toast-box').classList.contains('show') && /Transaksi dihapus/.test($('m-toast-box').textContent), 'toast Transaksi dihapus muncul setelah konfirmasi');

  // Masalah A (3): hapus item di Mode APK juga meminta konfirmasi
  w.S.items.push({ id: 995, name: 'Uji Hapus Item', price: 50000, n: 1, unit: 'sekali', start: '2026-11-18', end: '', cnt: 0, cat: 'Lainnya', ch: [] });
  w.save();
  w.MOB_STATE.jadwalSub = 'manage';
  w.switchMobileTab('jadwal');
  $('m-toast-box').classList.remove('show');
  click(curMobShell.querySelector('[data-mdel-it="995"]'));
  cfmBox = doc.querySelector('.modal.cfm');
  assert(cfmBox, 'klik hapus item APK membuka dialog konfirmasi');
  assert(w.S.items.some((x) => x.id === 995) && !$('m-toast-box').classList.contains('show'), 'item belum terhapus & tanpa toast sebelum konfirmasi');
  click(cfmBox.querySelector('[data-cf-n]'));
  assert(w.S.items.some((x) => x.id === 995) && !$('m-toast-box').classList.contains('show'), 'batal hapus item membiarkan data utuh tanpa toast');
  click(curMobShell.querySelector('[data-mdel-it="995"]'));
  click(doc.querySelector('.modal.cfm [data-cf-y]'));
  assert(!w.S.items.some((x) => x.id === 995) && $('m-toast-box').classList.contains('show'), 'konfirmasi hapus item menghapus data & memunculkan toast');

  // Masalah C: askConfirm mendukung tutup via tombol Escape tanpa memanggil onYes
  let escCalled = false;
  w.askConfirm('Uji Escape', () => { escCalled = true; });
  assert(doc.querySelector('.modal.cfm.open'), 'askConfirm membuka .modal.cfm.open');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!doc.querySelector('.modal.cfm') && !escCalled, 'Escape menutup dialog konfirmasi tanpa menghapus data');

  // Masalah B: rkSyncSegPills bergerak dengan 1 elemen pill persisten ketika tombol .seg diklik & ukuran visual tidak membengkak
  const fsMob = require('fs');
  const cssMobSrc = fsMob.readFileSync(require('path').join(__dirname, '..', '..', 'css', 'mobile.css'), 'utf8');
  const mobSegBtnRule = cssMobSrc.match(/#mobile-app-shell\s+\.seg-btn\s*\{([^}]*)\}/);
  assert(mobSegBtnRule && !/min-height\s*:/i.test(mobSegBtnRule[1]), 'tombol visual .seg-btn APK tidak memakai min-height: 44px agar tinggi .seg tetap sama seperti sebelum Fase 2');
  assert(/#mobile-app-shell\s+\.seg-btn::before\s*\{[^}]*min-height\s*:\s*var\(--tap\)/s.test(cssMobSrc), 'target sentuh 44px .seg-btn APK memakai pseudo-element ::before transparan');

  w.switchMobileTab('rincian');
  const mobRangeSeg = curMobShell.querySelector('.cf-range-seg');
  const mobRangeBtns = [...mobRangeSeg.querySelectorAll('.seg-btn')];
  mobRangeBtns.forEach((b, idx) => {
    Object.defineProperty(b, 'offsetLeft', { configurable: true, value: 3 + idx * 92 });
    Object.defineProperty(b, 'offsetTop', { configurable: true, value: 3 });
    Object.defineProperty(b, 'offsetWidth', { configurable: true, value: idx === 1 ? 82 : 90 });
    Object.defineProperty(b, 'offsetHeight', { configurable: true, value: 27 });
  });
  w.rkSyncSegPills(mobRangeSeg, false);
  const firstPill = mobRangeSeg.querySelector(':scope > .seg-pill');
  assert(firstPill, 'segmented control APK memiliki elemen .seg-pill persisten');
  const mRangeBtnW = mobRangeSeg.querySelector('[data-mrange="w"]');
  click(mRangeBtnW);
  const samePillAfterClick = mobRangeSeg.querySelector(':scope > .seg-pill');
  assert.strictEqual(firstPill, samePillAfterClick, 'elemen .seg-pill persisten (tidak dibuat ulang)');
  assert(samePillAfterClick.style.transform.includes('translate3d(3px, 3px, 0)') && samePillAfterClick.style.transform.includes('scale(1, 1)'), 'pill berpindah ke posisi opsi baru tanpa scale tertahan');
  assert(samePillAfterClick.classList.contains('is-jelly'), 'pill memicu animasi jelly saat berpindah');
  samePillAfterClick.querySelector('.seg-pill-inner').dispatchEvent(new w.Event('animationend'));
  assert(!samePillAfterClick.classList.contains('is-jelly'), 'kelas .is-jelly dilepas otomatis saat animationend');
  assert(Math.abs(parseFloat(samePillAfterClick.style.width) - mRangeBtnW.offsetWidth) <= 1, 'lebar pill akhir sama dengan tombol aktif (toleransi 1px)');
  assert(Math.abs(parseFloat(samePillAfterClick.style.height) - mRangeBtnW.offsetHeight) <= 1, 'tinggi pill akhir sama dengan tombol aktif (toleransi 1px)');

  // 11. Fase 3 Mode APK: Chart marks, Ringan entrance (#2.2), Undo Toast (#5), Error Shake (#8), & List Stagger (#9)
  assert($('m-svg-cashflow').querySelector('.rk-anim-line') && $('m-svg-cashflow').querySelector('.rk-anim-fill-right'), 'SVG arus kas APK memuat penanda line draw & fill');
  const mobCfArea = $('m-svg-cashflow').querySelector('.rk-anim-fill-right').getAttribute('d');
  const mobAreaM = mobCfArea.match(/L\s*([\d.]+)\s+[\d.]+\s+L\s*([\d.]+)\s+[\d.]+\s*Z$/);
  assert(parseFloat(mobAreaM[2]) === 40 && parseFloat(mobAreaM[1]) === 340, 'REVISI 1 APK: area fill arus kas mulai di inset kiri pL=40 dan memanjang sampai tepi kanan 340');
  const mYTexts = [...$('m-svg-cashflow').querySelectorAll('text[text-anchor="end"]')];
  assert(mYTexts.length >= 4 && mYTexts.every((el) => parseFloat(el.getAttribute('x')) <= 35), 'REVISI 1 APK: label sumbu Y berada di kolom inset kiri pL=40 (x <= 35)');
  const mTodayLine = $('m-svg-cashflow').querySelector('.cf-today-line');
  const mTodayDot = $('m-svg-cashflow').querySelector('.cf-node.is-today');
  assert(mTodayLine && mTodayDot && Math.abs(parseFloat(mTodayLine.getAttribute('x1')) - parseFloat(mTodayDot.getAttribute('cx'))) <= 0.1, 'APK: garis vertikal permanen hari ini sejajar tepat dengan titik Hari ini');
  const mCfHtml = $('m-svg-cashflow').innerHTML;
  assert(mCfHtml.indexOf('rk-anim-fill-right') < mCfHtml.indexOf('cf-today-line') && mCfHtml.indexOf('cf-today-line') < mCfHtml.indexOf('cf-node') && mCfHtml.indexOf('cf-today-line') < mCfHtml.indexOf('m-cf-ch'), 'APK: garis hari ini di atas area fill dan di bawah titik serta crosshair');
  assert(!/\bToday\b/.test($('m-cf-wrap').textContent) && $('m-svg-cashflow').textContent.includes('Hari ini'), 'APK: tanpa label Today, pakai Hari ini di sumbu X');
  const prevMobYr = w.S.year;
  w.switchYear(2027);
  w.renderAll();
  assert.strictEqual($('m-svg-cashflow').querySelector('.cf-today-line'), null, 'APK: garis hari ini tidak tampil di tahun yang tidak memuat hari ini');
  w.switchYear(prevMobYr);
  w.renderAll();
  const zoomLegendTxt = $('m-sheet-cf-zoom').querySelector('.cf-legend-bar').textContent;
  assert(zoomLegendTxt.includes('Saldo Hari Ini') && zoomLegendTxt.includes('Masa Depan') && zoomLegendTxt.includes('< Rp 0'), 'REVISI 2.2 APK: legenda grafik memakai Saldo Hari Ini / Masa Depan / < Rp 0');
  const prevMobItems = w.S.items.slice();
  const jarCaseSets = [
    [{ id: 981, name: 'Jar100', price: 1000000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] }],
    [
      { id: 981, name: 'Jar70', price: 700000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
      { id: 982, name: 'Jar30', price: 300000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Makanan', ch: [] },
    ],
    [
      { id: 981, name: 'Jar40', price: 400000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
      { id: 982, name: 'Jar35', price: 350000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Makanan', ch: [] },
      { id: 983, name: 'Jar25', price: 250000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Transportasi', ch: [] },
    ],
    [
      { id: 981, name: 'Jar15', price: 150000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
      { id: 982, name: 'Jar14b', price: 145000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Makanan', ch: [] },
      { id: 983, name: 'Jar14c', price: 140000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Transportasi', ch: [] },
      { id: 984, name: 'Jar13d', price: 135000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Belanja', ch: [] },
      { id: 985, name: 'Jar13e', price: 130000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Hiburan', ch: [] },
      { id: 986, name: 'Jar12f', price: 125000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Kesehatan', ch: [] },
      { id: 987, name: 'Jar10g', price: 100000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Pendidikan', ch: [] },
      { id: 988, name: 'Jar07h', price: 75000, n: 1, unit: 'sekali', start: '2026-11-12', end: '', cnt: 0, cat: 'Lainnya', ch: [] },
    ],
  ];
  jarCaseSets.forEach((itemsSet) => {
    w.S.items = itemsSet;
    w.renderAll();
    const mJar = $('m-svg-jar');
    const mClipG = mJar && mJar.querySelector('[clip-path="url(#clip-m-jar)"]');
    const mFront = mJar && mJar.querySelector('.jar-wave-anim');
    const mBack = mJar && mJar.querySelector('.jar-wave-back');
    assert(mClipG && !mClipG.classList.contains('jar-wave-anim') && !mClipG.classList.contains('jar-wave-back') && mClipG.contains(mFront) && mClipG.contains(mBack), 'clipPath jar APK dipasang di grup statis, gelombang ada di dalamnya');
    const mFEnd = mFront.getAttribute('d').match(/L\s*(-?[\d.]+)\s+[\d.]+\s+L\s*(-?[\d.]+)\s+[\d.]+\s*Z$/);
    const mBEnd = mBack.getAttribute('d').match(/L\s*(-?[\d.]+)\s+[\d.]+\s+L\s*(-?[\d.]+)\s+[\d.]+\s*Z$/);
    assert(parseFloat(mFEnd[1]) - parseFloat(mFEnd[2]) >= 240 && mFEnd[1] === mBEnd[1] && mFEnd[2] === mBEnd[2], 'gelombang depan & belakang APK selebar >= 2x lebar jar dengan asal & lebar identik');
    if (itemsSet.length >= 2) {
      assert(mClipG.querySelector('.jar-meniscus-hl') && mClipG.querySelector('.jar-meniscus-blend'), 'REVISI 2 APK: batas antar lapisan jar memakai kurva meniscus & gradien lembut di dalam clipPath');
    }
  });
  // REVISI 3 APK: Jar 3D / Bar menggantikan Ring donut dengan bar bersegmen horizontal per kategori
  const barStyleBtn = curMobShell.querySelector('[data-mwstyle="bar"]');
  assert(barStyleBtn && barStyleBtn.textContent.trim() === 'Bar' && !curMobShell.querySelector('[data-mwstyle="ring"]'), 'REVISI 3 APK: toggle Jar 3D / Bar tersedia tanpa opsi Ring');
  click(barStyleBtn);
  const segWrap = $('m-jar-stage').querySelector('.m-where-segbar-wrap');
  const segItems = [...$('m-jar-stage').querySelectorAll('.m-segbar-item')];
  assert(segWrap && segItems.length === 8 && !$('m-jar-stage').querySelector('circle'), 'REVISI 3 APK: bar horizontal bersegmen 1 per kategori tanpa donut SVG');
  assert(segWrap.querySelector('.m-where-segbar-meta').textContent.includes('100% · 8 kat'), 'REVISI 3 APK: teks ringkasan 100% · N kat tampil di atas bar');
  assert(segItems[0].getAttribute('data-mkcat') === 'Tagihan rutin' && parseFloat(segItems[0].getAttribute('data-pct')) >= parseFloat(segItems[1].getAttribute('data-pct')), 'REVISI 3 APK: segmen kategori terbesar di paling kiri');
  click(segItems[1]);
  const lockedSegs = [...$('m-jar-stage').querySelectorAll('.m-segbar-item')];
  assert(lockedSegs[1].classList.contains('lit') && lockedSegs[0].classList.contains('dim'), 'REVISI 3 APK: ketuk segmen menyalakan kategori & meredupkan segmen lain');
  click(curMobShell.querySelector('[data-mwstyle="jar"]'));
  assert($('m-svg-jar'), 'kembali ke Jar 3D merender #m-svg-jar');
  w.MOB_STATE.whereLock = null;
  w.S.items = prevMobItems;
  w.renderAll();
  assert($('m-jar-stage').querySelector('.rk-anim-fill-up'), 'Jar APK memuat grup .rk-anim-fill-up');
  const mRincPanel = $('m-tab-rincian');
  Object.defineProperty(mRincPanel, 'offsetWidth', { configurable: true, value: 360 });
  w.rkRunEntrance('mobile-app', 'rincian');
  assert(mRincPanel.querySelector('.card.rk-card-enter') && mRincPanel.querySelector('#m-svg-bar.rk-bar-anim') && mRincPanel.querySelector('#m-svg-bar .rk-bar-rect') && mRincPanel.querySelector('#m-svg-bar .rk-bar-net-line.rk-line-draw'), 'entrance APK menandai card entrance, bar grow (.rk-bar-anim), & line draw Tren Arus Bersih');
  // Error shake di form kas APK (#8)
  w.switchMobileTab('kas');
  $('m-kas-amt').value = '';
  fire($('m-kas-form'), 'submit');
  assert($('m-kas-amt').classList.contains('rk-input-error') && $('m-kas-amt').classList.contains('rk-error-shake'), 'submit form kas APK nominal kosong memicu error shake');
  // Undo toast di APK (#5) memulihkan item terhapus
  w.S.items.push({ id: 996, name: 'Uji Undo APK', price: 33000, n: 1, unit: 'sekali', start: '2026-11-18', end: '', cnt: 0, cat: 'Lainnya', ch: [] });
  w.save();
  w.MOB_STATE.jadwalSub = 'manage';
  w.switchMobileTab('jadwal');
  click(curMobShell.querySelector('[data-mdel-it="996"]'));
  click(doc.querySelector('.modal.cfm [data-cf-y]'));
  assert(!w.S.items.some((x) => x.id === 996), 'item terhapus setelah konfirmasi');
  const mobUndoBtn = $('m-toast-box').querySelector('.m-toast-undo');
  assert($('m-toast-box').classList.contains('has-undo') && mobUndoBtn, 'toast APK menyediakan tombol Urungkan');
  click(mobUndoBtn);
  assert(w.S.items.some((x) => x.id === 996), 'klik Urungkan di toast APK memulihkan item terhapus');

  // 12. Regresi MASALAH A-F (APK):
  // MASALAH A: Remount shell APK (mobile-app -> browser -> mobile-app) tidak menduplikasi listener privasi/notif
  w.switchMobileTab('rincian');
  w.setShellMode('browser');
  w.setShellMode('mobile-app');
  const remountShell = $('mobile-app-shell');
  doc.body.classList.remove('privacy-mode', 'privacy-on');
  click($('m-btn-privacy'));
  assert(doc.body.classList.contains('privacy-mode') && $('m-btn-privacy').classList.contains('on'), 'MASALAH A APK: ketuk #m-btn-privacy mengaktifkan mode privasi meski setelah remount shell');
  click($('m-btn-privacy'));
  assert(!doc.body.classList.contains('privacy-mode') && !$('m-btn-privacy').classList.contains('on'), 'MASALAH A APK: ketuk #m-btn-privacy kedua mematikan mode privasi');
  click($('m-btn-notif'));
  assert($('m-notif-popover').classList.contains('open'), 'MASALAH A APK: ketuk #m-btn-notif membuka popover notifikasi');
  click($('m-btn-notif'));
  assert(!$('m-notif-popover').classList.contains('open'), 'MASALAH A APK: ketuk #m-btn-notif kedua menutup popover');

  // MASALAH B: Skeleton shimmer sinkron di dalam kartu (.rk-skel-wrap), bukan bilah terpisah (#m-sync-skeleton)
  assert(!$( 'm-sync-skeleton') && remountShell.querySelector('.wallet-hero .rk-skel-wrap #m-rincian-saldo'), 'MASALAH B APK: skeleton berada di dalam wallet-hero (#m-rincian-saldo) tanpa #m-sync-skeleton');
  w.rkSetSyncLoading(true);
  assert(doc.body.classList.contains('rk-syncing') && !$( 'm-sync-skeleton'), 'MASALAH B APK: rkSetSyncLoading(true) memakai body.rk-syncing in-card');
  w.rkSetSyncLoading(false);
  assert(!doc.body.classList.contains('rk-syncing'), 'MASALAH B APK: rkSetSyncLoading(false) melepas body.rk-syncing');

  // MASALAH C: Semua form APK punya novalidate dan input kosong memicu rkShakeInvalid
  ['m-kas-form', 'm-item-form', 'm-sim-form', 'm-trip-meta-form'].forEach((fid) => {
    const fel = $(fid);
    assert(fel && fel.hasAttribute('novalidate'), 'MASALAH C APK: form ' + fid + ' memakai novalidate');
  });
  w.switchMobileTab('sim');
  $('m-sim-title').value = '';
  $('m-sim-price').value = '';
  fire($('m-sim-form'), 'submit');
  assert($('m-sim-title').classList.contains('rk-input-error') && $('m-sim-title').classList.contains('rk-error-shake'), 'MASALAH C APK: submit form simulasi kosong memicu error shake');
  $('m-kp-name').value = '';
  fire($('m-trip-meta-form'), 'submit');
  assert($('m-kp-name').classList.contains('rk-input-error') && $('m-kp-name').classList.contains('rk-error-shake'), 'MASALAH C APK: submit form perjalanan kosong memicu error shake');

  // MASALAH F: Klik filter grafik APK menganimasikan grafik terkait (.is-filter-anim) tanpa memicu ulang page entrance
  w.switchMobileTab('rincian');
  Object.defineProperty($('m-cf-wrap'), 'offsetWidth', { configurable: true, value: 320 });
  Object.defineProperty($('m-jar-stage'), 'offsetWidth', { configurable: true, value: 320 });
  Object.defineProperty($('m-bar-wrap'), 'offsetWidth', { configurable: true, value: 320 });
  const mobRunBeforeF = w._rkEntranceRunId;
  click(remountShell.querySelector('[data-mrange="y"]'));
  assert($('m-cf-wrap').classList.contains('is-filter-anim') && $('m-svg-cashflow').querySelector('.cf-today-line.rk-today-line-draw') && w._rkEntranceRunId === mobRunBeforeF, 'MASALAH F APK: filter rentang arus kas memicu .is-filter-anim + animasi garis hari ini tanpa mengulang entrance halaman');
  click(remountShell.querySelector('[data-mwdir="+"]'));
  assert($('m-jar-stage').classList.contains('is-filter-anim') && w._rkEntranceRunId === mobRunBeforeF, 'MASALAH F APK: filter arah jar memicu .is-filter-anim tanpa mengulang entrance');
  click(remountShell.querySelector('[data-mbsp="m"]'));
  assert($('m-bar-wrap').classList.contains('is-filter-anim') && w._rkEntranceRunId === mobRunBeforeF, 'MASALAH F APK: filter bar compare memicu .is-filter-anim tanpa mengulang entrance');

  // 13. Fase 4 Mode APK (#16 Bottom Nav + Bell/Morph, #17 Scroll/BTT, #20 Theme Cross-fade, #4 Ripple)
  // #16.2 Privasi 2-SVG morph + remount safety
  assert($('m-btn-privacy').querySelector('.rk-morph-icon .rk-ico-a') && $('m-btn-privacy').querySelector('.rk-morph-icon .rk-ico-b'), 'tombol privasi APK punya 2 SVG untuk morph');
  click($('m-btn-privacy'));
  assert($('m-priv-morph').classList.contains('is-morphed') && doc.body.classList.contains('privacy-mode'), 'klik #m-btn-privacy mengaktifkan morph mata-tercoret');
  // #20 Theme cross-fade APK + Privacy guard
  doc.startViewTransition = (cb) => {
    cb();
    assert(doc.body.classList.contains('privacy-mode'), 'mode privasi tetap terkunci saat View Transition ganti tema APK');
    return { finished: Promise.resolve() };
  };
  w.setTheme('dark');
  assert(doc.documentElement.classList.contains('rk-vt-apk') && doc.documentElement.getAttribute('data-theme') === 'dark', 'ganti tema APK memakai rk-vt-apk cross-fade');
  await Promise.resolve();
  doc.startViewTransition = undefined;
  w.setTheme('light');
  click($('m-btn-privacy'));
  // #16 Notif bell swing + active state sinkron popover (REVISI 2) & Bottom Nav gaya lama bersih (REVISI 1)
  click($('m-btn-notif'));
  assert($('m-notif-popover').classList.contains('open') && $('m-btn-notif').classList.contains('on') && $('m-btn-notif').classList.contains('active') && $('m-btn-notif').getAttribute('aria-expanded') === 'true' && $('m-btn-notif').classList.contains('rk-bell-ringing'), 'ketuk #m-btn-notif memicu ayunan lonceng, membuka popover, & mengaktifkan state biru (.on/.active)');
  click($('m-btn-notif'));
  assert(!$('m-notif-popover').classList.contains('open') && !$('m-btn-notif').classList.contains('on') && !$('m-btn-notif').classList.contains('active') && $('m-btn-notif').getAttribute('aria-expanded') === 'false', 'ketuk #m-btn-notif kedua menutup & melepas class aktif');
  click($('m-btn-notif'));
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!$('m-notif-popover').classList.contains('open') && !$('m-btn-notif').classList.contains('on') && !$('m-btn-notif').classList.contains('active'), 'Escape menutup #m-notif-popover & melepas class aktif tombol notif APK');
  click($('m-btn-notif'));
  click($('m-main'));
  assert(!$('m-notif-popover').classList.contains('open') && !$('m-btn-notif').classList.contains('on'), 'ketuk di luar popover menutup #m-notif-popover & melepas class aktif');
  const mKasNavBtn = remountShell.querySelector('.mob-bottom-nav [data-mtab="kas"]');
  w.switchMobileTab('kas');
  assert(!$('m-bn-pill') && !remountShell.querySelector('.mob-bottom-nav .bn-pill') && mKasNavBtn.classList.contains('active'), 'bottom nav APK kembali bersih tanpa #m-bn-pill, tab .active putih penuh tanpa pil latar');
  // #4 Ripple APK pada tombol utama / list-row dan cleanup
  const kasSubmitBtn = remountShell.querySelector('#m-kas-form .btn-primary');
  const pdEvt = new w.Event('pointerdown', { bubbles: true });
  pdEvt.clientX = 20; pdEvt.clientY = 12; pdEvt.button = 0;
  kasSubmitBtn.dispatchEvent(pdEvt);
  const clipEl = kasSubmitBtn.querySelector('.rk-ripple-clip');
  const waveEl = clipEl && clipEl.querySelector('.rk-ripple');
  assert(clipEl && waveEl, 'pointerdown tombol utama APK memunculkan ripple di dalam .rk-ripple-clip');
  waveEl.dispatchEvent(new w.Event('animationend'));
  assert(!kasSubmitBtn.querySelector('.rk-ripple-clip'), 'elemen ripple dibersihkan setelah animationend');
  // #17 Sticky topbar scroll & back-to-top APK
  assert($('m-btt-btn') && $('m-main'), 'APK memiliki #m-btt-btn untuk kembali ke atas');

  // 14. Redesign Header & Bottom Nav v4: struktur, fungsi per tombol, popover Akun, & keamanan privasi
  w.switchMobileTab('rincian');
  const hdrBlock = remountShell.querySelector('.apk-header-block');
  assert(hdrBlock && hdrBlock.querySelector('.hdr-motif') && hdrBlock.querySelector('.mt-wordmark') && hdrBlock.querySelector('#m-user-name'), 'v4: header biru bermotif memuat motif SVG inline, wordmark .mt-wordmark, dan sapaan #m-user-name');
  const actionIds = [...hdrBlock.querySelectorAll('.mt-actions > button')].map((el) => el.id);
  assert.deepStrictEqual(actionIds, ['m-acct-btn', 'm-btn-privacy', 'm-btn-notif'], 'v4: urutan tombol kanan header adalah Akun, Privasi, Notifikasi');
  const v4Hero = remountShell.querySelector('.apk-hero-well .wallet-hero');
  assert(v4Hero && !v4Hero.querySelector('#card-eye-btn, .card-eye-btn, #m-btn-privacy'), 'v4: kartu Saldo Realtime putih berada di dalam .apk-hero-well tanpa tombol mata di dalam kartu');
  assert(/\.mt-wordmark\s*\{[^}]*height:\s*22\.5px/i.test(cssMobSrc), 'v4: ukuran teks logo .mt-wordmark adalah 22.5px');
  assert(/\.av-btn::before,\s*[\r\n\s]*body\[data-shell="mobile-app"\]\s+#mobile-app-shell\s+\.ico-btn::before\s*\{[^}]*inset:\s*-5px/s.test(cssMobSrc), 'v4: tombol aksi header mempertahankan pseudo touch target 44px via ::before');
  assert.strictEqual(w.$('m-fab-add'), $('m-yr-btn-center'), 'v4: alias m-fab-add di w.$() mengembalikan #m-yr-btn-center yang sama');
  // Ketuk #m-btn-privacy -> satu aksi toggle + status #m-priv-morph
  doc.body.classList.remove('privacy-mode', 'privacy-on');
  click($('m-btn-privacy'));
  assert(doc.body.classList.contains('privacy-mode') && $('m-btn-privacy').classList.contains('on') && $('m-priv-morph').classList.contains('is-morphed'), 'v4 fungsi: ketuk #m-btn-privacy aktifkan Mode Privasi sekali klik');
  click($('m-btn-privacy'));
  assert(!doc.body.classList.contains('privacy-mode') && !$('m-btn-privacy').classList.contains('on'), 'v4 fungsi: ketuk kedua #m-btn-privacy nonaktifkan Mode Privasi');
  // Seed tahun 2027 & uji Popover Akun (#m-acct-popover): Escape, pilih tahun, Pengaturan & Alat, #m-top-yr-pill
  if (!w.ALL.data[2027]) {
    w.ALL.data[2027] = { year: 2027, saldo: 4850000, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
    w.renderMobMetaMenus();
  }
  click($('m-acct-btn'));
  assert($('m-acct-popover').classList.contains('open') && $('m-acct-btn').getAttribute('aria-expanded') === 'true', 'v4 fungsi: ketuk #m-acct-btn membuka #m-acct-popover');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!$('m-acct-popover').classList.contains('open') && $('m-acct-btn').getAttribute('aria-expanded') === 'false', 'v4 fungsi: Escape menutup #m-acct-popover dan melepas status aktif');
  click($('m-acct-btn'));
  const yrPick2027 = $('m-acct-yr-pills').querySelector('[data-myrpick="2027"]');
  assert(yrPick2027, 'v4 fungsi: #m-acct-popover memuat pemilih tahun [data-myrpick]');
  click(yrPick2027);
  assert.strictEqual(+w.S.year, 2027, 'v4 fungsi: memilih tahun di #m-acct-popover menjalankan switchYear ke 2027');
  assert(!$('m-acct-popover').classList.contains('open') && $('m-top-yr-txt').textContent.trim() === '2027', 'v4 fungsi: memilih tahun menutup popover dan memperbarui #m-top-yr-txt');
  w.switchYear(2026);
  click($('m-acct-btn'));
  click($('m-top-yr-pill'));
  assert($('m-sheet-periode').classList.contains('open') && !$('m-acct-popover').classList.contains('open'), 'v4 fungsi: ketuk #m-top-yr-pill di popover Akun membuka #m-sheet-periode');
  click($('m-sheet-periode').querySelector('[data-mclose="m-sheet-periode"]'));
  click($('m-acct-btn'));
  click($('m-acct-go-settings'));
  assert($('m-tab-settings').classList.contains('active') && !$('m-acct-popover').classList.contains('open'), 'v4 fungsi: Pengaturan & Alat di #m-acct-popover membuka tab #m-tab-settings yang sama');
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'settings', 'v4 layout: .mob-shell[data-mtab-active] mengikuti tab aktif agar header membulat di luar Rincian');
  click($('m-yr-btn-center'));
  assert($('m-sheet-periode').classList.contains('open'), 'v4 fungsi: ketuk #m-yr-btn-center (+) tetap membuka #m-sheet-periode');
  click($('m-sheet-periode').querySelector('[data-mclose="m-sheet-periode"]'));
  click(remountShell.querySelector('.mob-bottom-nav [data-mtab="rincian"]'));
  assert($('m-tab-rincian').classList.contains('active') && remountShell.querySelector('.mob-bottom-nav [data-mtab="rincian"]').getAttribute('aria-current') === 'page', 'v4 fungsi: ketuk tab Rincian berpindah ke #m-tab-rincian');

  // 15. Status bar & theme-color sinkron di Mode APK (Terang #0E3F86 / Gelap #092B60) dan Mode Browser
  assert(/body\[data-shell="mobile-app"\]\s*\{[^}]*padding-top:\s*0\b/s.test(cssMobSrc), 'Mode APK mereset body padding-top: 0 agar safe-area-inset-top terisi langsung oleh .apk-header-block tanpa celah');
  const metaTheme = doc.getElementById('rk-meta-theme');
  assert(metaTheme, 'meta #rk-meta-theme tersedia');
  w.setTheme('light');
  assert.strictEqual(metaTheme.getAttribute('content'), '#0E3F86', 'APK tema terang menyetel theme-color #0E3F86 (sama dengan bagian atas gradien header)');
  w.setTheme('dark');
  assert.strictEqual(metaTheme.getAttribute('content'), '#092B60', 'APK tema gelap menyetel theme-color #092B60 (biru header versi gelap)');
  w.setShellMode('browser');
  assert.strictEqual(metaTheme.getAttribute('content'), '#0A0E14', 'Browser tema gelap menyetel theme-color #0A0E14');
  w.setTheme('light');
  assert.strictEqual(metaTheme.getAttribute('content'), '#F3F5F2', 'Browser tema terang menyetel theme-color #F3F5F2');
  w.setShellMode('mobile-app');
  assert.strictEqual(metaTheme.getAttribute('content'), '#0E3F86', 'kembali ke Mode APK memulihkan theme-color #0E3F86');

  // 16. Swipe-to-dismiss pada notifikasi dalam aplikasi (#m-os-notif)
  const fireTouch = (el, type, clientX, clientY) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX, clientY };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
  };
  const paidBeforeSwipe = JSON.stringify(w.ALL.data[2026].paid);
  w.triggerMobPhoneBarNotif(true);
  let osNotif = $('m-os-notif');
  assert(osNotif && osNotif.classList.contains('show'), 'triggerMobPhoneBarNotif(true) menampilkan #m-os-notif');
  // 16a. Swipe pendek (<35%) di atas #m-pon-paid -> snapback dan TIDAK memicu Tandai Lunas
  const ponPaidBtn = $('m-pon-paid');
  assert(ponPaidBtn, 'tombol #m-pon-paid tersedia');
  fireTouch(ponPaidBtn, 'touchstart', 50, 40);
  fireTouch(ponPaidBtn, 'touchmove', 90, 42);
  await new Promise((r) => setTimeout(r, 100));
  fireTouch(ponPaidBtn, 'touchend', 90, 42);
  click(ponPaidBtn);
  assert.strictEqual(osNotif.style.getPropertyValue('--pon-dx'), '0px', 'swipe pendek memicu snapback ke --pon-dx: 0px');
  assert.strictEqual(JSON.stringify(w.ALL.data[2026].paid), paidBeforeSwipe, 'melepas swipe di atas #m-pon-paid tidak menandai lunas');
  // 16b. Swipe kanan melewati 35% lebar kartu -> animasi keluar & hapus #m-os-notif dari DOM
  fireTouch(osNotif, 'touchstart', 30, 40);
  fireTouch(osNotif, 'touchmove', 260, 44);
  assert(osNotif.classList.contains('is-swiping'), 'saat drag horizontal #m-os-notif mendapat kelas .is-swiping');
  fireTouch(osNotif, 'touchend', 260, 44);
  await new Promise((r) => setTimeout(r, 250));
  assert.strictEqual(doc.getElementById('m-os-notif'), null, 'swipe kanan melewati ambang menghapus #m-os-notif dari DOM');
  assert.strictEqual(JSON.stringify(w.ALL.data[2026].paid), paidBeforeSwipe, 'swipe tutup tidak mengubah status lunas');
  // 16c. Notifikasi berikutnya tetap bisa muncul dengan membuat ulang #m-os-notif & tap #m-pon-paid tetap menandai lunas
  w.triggerMobPhoneBarNotif(true);
  osNotif = $('m-os-notif');
  assert(osNotif && osNotif.classList.contains('show'), 'notifikasi berikutnya membuat ulang dan menampilkan #m-os-notif');
  await new Promise((r) => setTimeout(r, 150));
  click($('m-pon-paid'));
  const paidAfterTap = Object.keys(w.ALL.data[2026].paid).length;
  assert(paidAfterTap >= Object.keys(JSON.parse(paidBeforeSwipe)).length + 1, 'tap langsung pada #m-pon-paid tetap menandai tagihan lunas');
  // 16d. Reduced motion: swipe kiri langsung menghapus #m-os-notif tanpa menunggu 200ms
  const origMatchMedia = w.matchMedia;
  w.matchMedia = (q) => ({ matches: String(q).includes('prefers-reduced-motion'), media: q, addListener() {}, removeListener() {} });
  w.triggerMobPhoneBarNotif(true);
  osNotif = $('m-os-notif');
  assert(osNotif && osNotif.classList.contains('show'), '#m-os-notif tampil kembali sebelum uji reduced-motion');
  fireTouch(osNotif, 'touchstart', 260, 40);
  fireTouch(osNotif, 'touchmove', 30, 42);
  fireTouch(osNotif, 'touchend', 30, 42);
  assert.strictEqual(doc.getElementById('m-os-notif'), null, 'dengan prefers-reduced-motion swipe melewati ambang langsung menghapus #m-os-notif dari DOM');
  w.matchMedia = origMatchMedia;

  // 17. Greeting "HALO, MIX" (.hdr-greet) hanya tampil di tab Rincian, tersembunyi rapi di tab lain
  assert(/\.mob-shell:not\(\[data-mtab-active="rincian"\]\)\s+\.hdr-greet\s*\{[^}]*position:\s*absolute[^}]*opacity:\s*0[^}]*visibility:\s*hidden/s.test(cssMobSrc), 'CSS menyembunyikan .hdr-greet dengan position:absolute, opacity:0, visibility:hidden di luar tab Rincian');
  assert(/--dur-hdr-greet:\s*220ms/.test(require('fs').readFileSync(require('path').join(process.cwd(), 'css', 'tokens.css'), 'utf8')), 'token --dur-hdr-greet: 220ms tersedia di tokens.css');
  click(remountShell.querySelector('.mob-bottom-nav [data-mtab="kas"]'));
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'kas', 'tab Transaksi menyetel data-mtab-active="kas"');
  click(remountShell.querySelector('.mob-bottom-nav [data-mtab="jadwal"]'));
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'jadwal', 'tab Jadwal menyetel data-mtab-active="jadwal"');
  // Simulasi reload di tab non-Rincian: render ulang shell saat MOB_STATE.tab === "jadwal" tidak boleh berkedip Rincian
  remountShell.innerHTML = '';
  w.ensureMobileShell();
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'jadwal', 'remount saat tab aktif=jadwal langsung merender data-mtab-active="jadwal" tanpa kedip Rincian');
  click(remountShell.querySelector('.mob-bottom-nav [data-mtab="rincian"]'));
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'rincian', 'kembali ke tab Rincian memulihkan data-mtab-active="rincian"');
  assert($('m-user-name').textContent.includes('Halo,'), '#m-user-name tetap dinamis menampilkan sapaan akun');

  // 18. Satu lapisan motif bunga halus (mode "s") kontinu di .apk-header-block
  const allMotifs = remountShell.querySelectorAll('.hdr-motif');
  assert.strictEqual(allMotifs.length, 1, 'hanya ada satu elemen .hdr-motif di seluruh shell APK (tidak ada duplikat .hdr-motif-well)');
  const motifEl = allMotifs[0];
  const mainHdrBlock = remountShell.querySelector('.apk-header-block');
  assert(mainHdrBlock && mainHdrBlock.contains(motifEl), 'satu-satunya .hdr-motif berada di dalam .apk-header-block');
  assert(mainHdrBlock.contains(remountShell.querySelector('.apk-hero-well .wallet-hero')), '.apk-hero-well dan .wallet-hero berada di dalam .apk-header-block agar motif menerus di belakang kartu saldo');
  assert.strictEqual(motifEl.getAttribute('preserveAspectRatio'), 'xMidYMid slice', '.hdr-motif memakai preserveAspectRatio="xMidYMid slice" sesuai mockup bunga halus');
  assert(motifEl.querySelector('.hm-mg') && motifEl.querySelector('mask') && motifEl.querySelector('filter feGaussianBlur'), '.hdr-motif memakai struktur mask + blur zona pudar dan grup .hm-mg');
  assert(!motifEl.querySelector('#rk-hdr-dots, #rk-hdr-diag-grad, #rk-hdr-arc-tr, #rk-hdr-arc-bl, #rk-hdr-glow-tr'), 'tidak ada sisa elemen motif lama di dalam .hdr-motif');
  const mId1 = motifEl.querySelector('mask').id;
  const svg2 = w.rkRenderHeaderMotifSvg(false);
  assert(svg2.indexOf(mId1) === -1, 'setiap render SVG motif menghasilkan ID mask/filter/gradient yang unik');
  assert(/\.hdr-motif\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*width:\s*100%[^}]*height:\s*100%[^}]*z-index:\s*0/s.test(cssMobSrc), 'CSS .hdr-motif mengisi penuh .apk-header-block (inset:0; width:100%; height:100%; z-index:0)');
  assert(/\.apk-header-block\s*\{[^}]*padding:\s*(?:max\()?env\(safe-area-inset-top,\s*0px\)/s.test(cssMobSrc), 'CSS .apk-header-block memberi padding-top safe-area hanya untuk konten sementara latar & .hdr-motif dimulai dari top:0');
  assert(/viewport-fit=cover/i.test(doc.querySelector('meta[name="viewport"]').getAttribute('content') || ''), 'meta viewport menyertakan viewport-fit=cover untuk edge-to-edge');
  assert(/\.apk-hero-well\s*\{[^}]*z-index:\s*1[^}]*background:\s*transparent[^}]*overflow:\s*visible/s.test(cssMobSrc), 'CSS .apk-hero-well punya z-index:1 (> .hdr-motif), background:transparent, dan overflow:visible agar tidak memotong/menutupi motif');
  assert(/\.wallet-hero\s*\{[^}]*z-index:\s*1/s.test(cssMobSrc), 'CSS .wallet-hero punya z-index:1 (> .hdr-motif)');

  // 19. Tombol Back Android (@capacitor/app) sesuai urutan prioritas & hanya aktif di native Capacitor
  const origCap = w.Capacitor;
  w.Capacitor = { isNativePlatform: () => false, Plugins: { App: { addListener() { throw new Error('tidak boleh daftar di browser'); } } } };
  w.rkInitCapacitorBackButton();
  assert.strictEqual(w.rkHandleAndroidBack(), false, 'handler tombol Back tidak aktif saat bukan native Capacitor');

  let backCb = null;
  let addCount = 0;
  let exitCount = 0;
  w._rkCapBackBound = false;
  w.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      App: {
        addListener(ev, fn) { if (ev === 'backButton') { addCount += 1; backCb = fn; } },
        exitApp() { exitCount += 1; },
      },
    },
  };
  w.rkInitCapacitorBackButton();
  w.rkInitCapacitorBackButton();
  assert.strictEqual(addCount, 1, 'listener backButton Capacitor hanya didaftarkan satu kali (tanpa listener ganda)');
  assert(typeof backCb === 'function', 'callback backButton terdaftar');

  // Siapkan semua lapisan terbuka sekaligus untuk menguji prioritas 1 -> 2 -> 3 -> 4 -> 5
  w.switchMobileTab('jadwal');
  $('m-sheet-periode').classList.add('open');
  const cfEl = $('cf');
  cfEl.hidden = false;
  $('m-acct-popover').classList.add('open');
  // Prioritas 1a: tutup popover Akun dulu
  assert.strictEqual(w.rkHandleAndroidBack(), 'popover-acct', 'Back prioritas 1 menutup #m-acct-popover');
  assert(!$('m-acct-popover').classList.contains('open') && !cfEl.hidden && $('m-sheet-periode').classList.contains('open'), 'popover Akun tertutup sementara modal & sheet masih terbuka');
  // Prioritas 1b: tutup popover Notifikasi
  $('m-notif-popover').classList.add('open');
  assert.strictEqual(w.rkHandleAndroidBack(), 'popover-notif', 'Back prioritas 1 menutup #m-notif-popover');
  assert(!$('m-notif-popover').classList.contains('open'), 'popover Notifikasi tertutup');
  // Prioritas 2: tutup dialog konfirmasi (#cf)
  assert.strictEqual(w.rkHandleAndroidBack(), 'modal', 'Back prioritas 2 menutup dialog konfirmasi #cf');
  assert(cfEl.hidden && $('m-sheet-periode').classList.contains('open'), 'dialog #cf tertutup sementara bottom sheet masih terbuka');
  // Prioritas 3: tutup bottom sheet (#m-sheet-periode) via mobCloseSheet
  assert.strictEqual(w.rkHandleAndroidBack(), 'sheet', 'Back prioritas 3 menutup bottom sheet terbuka');
  assert(!$('m-sheet-periode').classList.contains('open'), 'bottom sheet #m-sheet-periode tertutup');
  // Prioritas 4: dari tab selain Rincian kembali ke tab Rincian
  assert.strictEqual(w.rkHandleAndroidBack(), 'tab-rincian', 'Back prioritas 4 dari tab Jadwal kembali ke tab Rincian');
  assert.strictEqual(remountShell.querySelector('.mob-shell').getAttribute('data-mtab-active'), 'rincian', 'tab aktif kembali ke rincian');
  // Prioritas 5: di Rincian tanpa overlay, tekan 1x tampilkan toast tanpa keluar; tekan 2x dalam 2 detik -> App.exitApp()
  backCb();
  assert.strictEqual(exitCount, 0, 'Back pertama di Rincian tidak langsung memanggil App.exitApp()');
  assert($('m-toast-box').textContent.includes('Tekan lagi untuk keluar'), 'Back pertama di Rincian menampilkan toast "Tekan lagi untuk keluar"');
  backCb();
  assert.strictEqual(exitCount, 1, 'Back kedua dalam 2 detik memanggil App.exitApp()');
  w.Capacitor = origCap;

  // 20. Login Google native (Browser Custom Tab + appUrlOpen) & adaptor notifikasi native (LocalNotifications)
  const fs = require('fs');
  const path = require('path');
  const manifestXml = fs.readFileSync(path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
  assert(/android:scheme="id\.renkeu\.app"[^>]*android:host="auth"/s.test(manifestXml), 'AndroidManifest.xml mendaftarkan deep link scheme="id.renkeu.app" host="auth"');
  assert(/android:launchMode="singleTask"/.test(manifestXml), 'MainActivity memakai launchMode="singleTask"');
  assert(/android\.permission\.POST_NOTIFICATIONS/.test(manifestXml), 'AndroidManifest.xml meminta POST_NOTIFICATIONS');
  assert(!/SCHEDULE_EXACT_ALARM/.test(manifestXml), 'AndroidManifest.xml tidak meminta SCHEDULE_EXACT_ALARM');

  // 20a. OAuth Google di native Capacitor vs browser
  const origSb = w.sb;
  const origPull = w.pull;
  const oauthCalls = [];
  const exchCalls = [];
  const setSessCalls = [];
  let pullCount = 0;
  w.pull = () => { pullCount += 1; return Promise.resolve(); };
  w.sb = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => ({
        select: () => Promise.resolve({ data: [{ rev: 1 }], error: null }),
        then: (fn) => Promise.resolve({ error: null }).then(fn),
      }),
    }),
    auth: {
      signInWithOAuth(arg) {
        oauthCalls.push(arg);
        const u = (arg && arg.options && arg.options.skipBrowserRedirect)
          ? 'https://accounts.google.com/o/oauth2/v2/auth?mock=1'
          : '#oauth-mock';
        return Promise.resolve({ data: { url: u }, error: null });
      },
      exchangeCodeForSession(code) { exchCalls.push(code); return Promise.resolve({ data: { session: { user: { id: 'u-cap-1', email: 'cap@example.com' } } }, error: null }); },
      setSession(sess) { setSessCalls.push(sess); return Promise.resolve({ data: { session: { user: { id: 'u-cap-2', email: 'imp@example.com' } } }, error: null }); },
    },
  };
  let urlOpenCb = null;
  let brFinCb = null;
  let urlOpenCount = 0;
  const brOpened = [];
  let brClosed = 0;
  w._rkCapAuthBound = false;
  w.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      App: {
        addListener(ev, fn) { if (ev === 'appUrlOpen') { urlOpenCount += 1; urlOpenCb = fn; } },
        getLaunchUrl: () => Promise.resolve(null),
      },
      Browser: {
        open(opts) { brOpened.push(opts.url); return Promise.resolve(); },
        close() { brClosed += 1; return Promise.resolve(); },
        addListener(ev, fn) { if (ev === 'browserFinished') brFinCb = fn; },
      },
    },
  };
  w.rkInitCapacitorAuth();
  w.rkInitCapacitorAuth();
  assert.strictEqual(urlOpenCount, 1, 'listener appUrlOpen hanya didaftarkan satu kali (tanpa duplikat)');
  await w.authGoogle();
  assert.strictEqual(oauthCalls.length, 1, 'authGoogle di native memanggil signInWithOAuth');
  assert.strictEqual(oauthCalls[0].options.redirectTo, 'id.renkeu.app://auth', 'authGoogle native memakai redirectTo id.renkeu.app://auth');
  assert.strictEqual(oauthCalls[0].options.skipBrowserRedirect, true, 'authGoogle native menyertakan skipBrowserRedirect: true');
  assert.strictEqual(brOpened.length, 1, 'Browser.open dipanggil untuk membuka URL OAuth di Custom Tab');
  assert(typeof brFinCb === 'function', 'browserFinished listener terdaftar');
  await w.rkHandleOAuthRedirectUrl('id.renkeu.app://auth?code=pkce-abc-123');
  assert.strictEqual(brClosed, 1, 'Browser.close() dipanggil saat callback deep link masuk');
  assert.strictEqual(exchCalls[0], 'pkce-abc-123', 'exchangeCodeForSession dipanggil dengan code PKCE dari deep link');
  assert(w.sbUser && w.sbUser.id === 'u-cap-1', 'sesi pengguna dipulihkan setelah callback deep link');
  assert(pullCount >= 1, 'pull() dijalankan setelah sesi Google pulih');
  // Implicit flow (#access_token & refresh_token)
  await w.rkHandleOAuthRedirectUrl('id.renkeu.app://auth#access_token=at-99&refresh_token=rt-88');
  assert.strictEqual(setSessCalls[0].access_token, 'at-99', 'setSession dipanggil bila callback membawa access_token di hash');
  // Browser flow tidak berubah (tidak pakai skipBrowserRedirect)
  w.Capacitor = { isNativePlatform: () => false };
  await w.authGoogle();
  assert.strictEqual(oauthCalls[oauthCalls.length - 1].options.skipBrowserRedirect, undefined, 'di browser authGoogle tidak memakai skipBrowserRedirect');
  w.setUser(null);

  // 20b. Adaptor Notifikasi rkNotify (native LocalNotifications vs browser)
  const origNotif = w.Notification;
  delete w.Notification;
  w.Capacitor = { isNativePlatform: () => false };
  assert.strictEqual(w.rkNotify.isSupported(), false, 'di browser tanpa Notification API, rkNotify.isSupported() bernilai false');

  let chanCreated = null;
  let permState = 'granted';
  let pendingList = [];
  const canceledBatches = [];
  const scheduledBatches = [];
  w.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      LocalNotifications: {
        createChannel(ch) { chanCreated = ch; return Promise.resolve(); },
        checkPermissions() { return Promise.resolve({ display: permState }); },
        requestPermissions() { permState = 'granted'; return Promise.resolve({ display: 'granted' }); },
        getPending() { return Promise.resolve({ notifications: pendingList.slice() }); },
        schedule(opts) {
          scheduledBatches.push(opts.notifications);
          opts.notifications.forEach((n) => {
            if (!pendingList.some((x) => x.id === n.id)) pendingList.push({ id: n.id, title: n.title });
          });
          return Promise.resolve();
        },
        cancel(opts) {
          canceledBatches.push(opts.notifications);
          const rm = new Set(opts.notifications.map((n) => n.id));
          pendingList = pendingList.filter((n) => !rm.has(n.id));
          return Promise.resolve();
        },
      },
    },
  };
  assert.strictEqual(w.rkNotify.isNative(), true, 'rkNotify.isNative() aktif di Capacitor walau window.Notification tidak ada');
  assert.strictEqual(w.rkNotify.isSupported(), true, 'rkNotify.isSupported() bernilai true di native');
  w.rkSetNotifReset(false);
  w.requestNotifPermission();
  await new Promise((r) => setTimeout(r, 80));
  assert(chanCreated && chanCreated.id === 'rk-bill-reminders', 'channel Android "Pengingat Tagihan" dibuat di native');
  assert(!String($('toast')?.textContent || '').includes('belum mendukung'), 'pesan browser tidak mendukung notifikasi tidak muncul di native');
  // Tambah tagihan jatuh tempo hari ini untuk uji schedule & cancel saat lunas
  w.__today = '2026-11-12';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.items.push({ id: 995, name: 'Air PDAM', price: 150000, n: 1, unit: 'bulan', start: '2026-11-12', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] });
  w.S.paid = {};
  w.syncUI();
  await new Promise((r) => setTimeout(r, 80));
  assert(pendingList.length >= 1, 'notifikasi tagihan lokal terjadwal deterministik di native');
  const pdamId = w.rkNotify.hashId('995|2026-11-12');
  assert(pendingList.some((n) => n.id === pdamId), 'id notifikasi deterministik terdaftar untuk tagihan 995|2026-11-12');
  // Tandai lunas -> jadwal dibatalkan
  w.S.paid['995|2026-11-12'] = 1;
  w.syncUI();
  await new Promise((r) => setTimeout(r, 80));
  assert(canceledBatches.some((b) => b.some((x) => x.id === pdamId)), 'jadwal notifikasi tagihan otomatis dibatalkan saat ditandai lunas');

  w.setUser(null);
  w.Notification = origNotif;
  w.sb = origSb;
  w.pull = origPull;
  w.Capacitor = origCap;

  // 21. Pull-to-Refresh (hanya mode APK, di semua tab, hormati zona kecualian & cooldown)
  assert(/overscroll-behavior-y:\s*contain/.test(cssMobSrc), 'CSS menyetel overscroll-behavior-y: contain di mode app agar tidak bentrok dengan PTR WebView');
  assert(!/body\[data-shell="mobile-app"\]\s*\{[^}]*overscroll-behavior-y:\s*contain/s.test(cssMobSrc), 'CSS tidak menyetel overscroll-behavior-y: contain pada body[data-shell="mobile-app"]');
  assert(/data-phone-frame="full"\]\s+#mobile-app-shell\s+\.mob-main\s*\{[^}]*overflow-y:\s*visible[^}]*overscroll-behavior-y:\s*auto/s.test(cssMobSrc), 'CSS layar penuh membuka overflow-y: visible & overscroll-behavior-y: auto pada .mob-main agar scroll window tidak terkunci');
  assert(doc.documentElement.classList.contains('rk-mob-app'), 'html mendapat kelas .rk-mob-app saat mode mobile-app aktif');
  const ptrInd = $('m-ptr-ind');
  assert(ptrInd, 'elemen indikator #m-ptr-ind tersedia di shell APK');
  const origSb21 = w.sb;
  const origSbUser21 = w.sbUser;
  const origPull21 = w.pull;
  let ptrPullCount = 0;
  w.sb = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) };
  w.sbUser = { id: 'u-ptr-1', email: 'ptr@example.com' };
  w.pull = () => {
    ptrPullCount += 1;
    w._rkLastPullOk = true;
    return Promise.resolve();
  };
  const doPtr = (target, dx, dy) => {
    fireTouch(target, 'touchstart', 100, 120);
    fireTouch(target, 'touchmove', 100 + dx, 120 + dy);
    fireTouch(target, 'touchend', 100 + dx, 120 + dy);
  };
  w.switchMobileTab('rincian');
  $('m-main').scrollTop = 0;
  w._rkPtrReset();
  // 21a. Tarik dari scrollTop 0 melewati ambang (dy=150 -> pullY=75 >= 64) memanggil pull() 1x
  doPtr($('m-tab-rincian'), 0, 150);
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(ptrPullCount, 1, 'tarik dari scrollTop=0 melewati ambang memanggil pull() sekali');
  assert($('m-toast-box').textContent.includes('Data tersinkron'), 'selesai pull() menampilkan toast Data tersinkron');
  // 21b. Cooldown 1 detik: tarik langsung tanpa jeda tidak memicu ganda
  doPtr($('m-tab-rincian'), 0, 150);
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptrPullCount, 1, 'tarik langsung dalam masa cooldown 1 detik tidak memicu pull() ganda');
  // 21c. Tarik pendek (<64px): kembali tanpa refresh
  w._rkPtrReset();
  doPtr($('m-tab-rincian'), 0, 70);
  assert(ptrInd.classList.contains('is-snapping'), 'tarik pendek (<64px) memberi kelas .is-snapping');
  assert.strictEqual(ptrPullCount, 1, 'tarik pendek tidak memanggil pull()');
  // 21d. scrollTop > 0: tidak aktif
  w._rkPtrReset();
  $('m-main').scrollTop = 120;
  doPtr($('m-tab-rincian'), 0, 160);
  assert.strictEqual(ptrPullCount, 1, 'scrollTop > 0 tidak mengaktifkan Pull-to-Refresh');
  $('m-main').scrollTop = 0;
  // 21e. Gestur horizontal di grafik/slider/konten & ketuk tombol header tanpa geser: tidak mengaktifkan PTR
  w._rkPtrReset();
  doPtr($('m-cf-wrap'), 80, 10);
  doPtr($('m-kpi-slider'), 80, 10);
  doPtr($('m-tab-rincian'), 80, 12);
  assert.strictEqual(ptrPullCount, 1, 'gestur horizontal di grafik, slider horizontal, atau konten tidak memicu Pull-to-Refresh');
  // Ketuk tombol header (#m-btn-notif) tanpa geser tetap membuka popover & tidak memicu PTR
  fireTouch($('m-btn-notif'), 'touchstart', 350, 30);
  fireTouch($('m-btn-notif'), 'touchend', 350, 30);
  click($('m-btn-notif'));
  assert($('m-notif-popover').classList.contains('open'), 'ketuk #m-btn-notif tanpa geser tetap membuka popover notifikasi');
  click($('m-btn-notif'));
  assert.strictEqual(ptrPullCount, 1, 'ketuk tombol header tanpa geser tidak memicu PTR');
  // 21f. Sheet terbuka atau dialog konfirmasi terbuka: tidak aktif
  w._rkPtrReset();
  $('m-sheet-periode').classList.add('open');
  doPtr($('m-tab-rincian'), 0, 160);
  $('m-sheet-periode').classList.remove('open');
  $('cf').hidden = false;
  doPtr($('m-tab-rincian'), 0, 160);
  $('cf').hidden = true;
  assert.strictEqual(ptrPullCount, 1, 'sheet/modal terbuka memblokir Pull-to-Refresh');
  // 21g. Berfungsi di tab lain (Transaksi, Jadwal, Menu)
  for (const tabId of ['kas', 'jadwal', 'settings']) {
    w.switchMobileTab(tabId);
    w._rkPtrReset();
    const beforeTab = ptrPullCount;
    doPtr($('m-tab-' + tabId), 0, 150);
    await new Promise((r) => setTimeout(r, 25));
    assert.strictEqual(ptrPullCount, beforeTab + 1, 'Pull-to-Refresh aktif dan memanggil pull() di tab ' + tabId);
  }
  // 21h. Belum login (sbUser = null) + Mode Privasi aktif -> render lokal + toast "Data diperbarui", .pv tetap aman
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  w.sbUser = null;
  doc.body.classList.add('privacy-mode');
  doPtr($('m-tab-rincian'), 0, 150);
  await new Promise((r) => setTimeout(r, 25));
  assert($('m-toast-box').textContent.includes('Data diperbarui'), 'mode lokal tanpa login menampilkan toast Data diperbarui saat PTR');
  assert(doc.body.classList.contains('privacy-mode'), 'Mode Privasi tetap terkunci saat render ulang PTR');
  doc.body.classList.remove('privacy-mode');
  // 21j. Scroll biasa (atas/bawah) tidak pernah memanggil preventDefault(); hanya saat terkunci tarik bawah di scrollY=0
  const fireTouchEv = (el, type, clientX, clientY) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX, clientY };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
    return ev;
  };
  for (const tabId of ['rincian', 'kas', 'jadwal', 'settings']) {
    w.switchMobileTab(tabId);
    w._rkPtrReset();
    $('m-main').scrollTop = 0;
    fireTouchEv($('m-tab-' + tabId), 'touchstart', 150, 400);
    const upMv = fireTouchEv($('m-tab-' + tabId), 'touchmove', 150, 260);
    assert.strictEqual(upMv.defaultPrevented, false, 'scroll biasa ke bawah (jari naik) di tab ' + tabId + ' tidak memanggil preventDefault');
    fireTouchEv($('m-tab-' + tabId), 'touchend', 150, 260);
  }
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  // Saat terkunci tarik bawah dari scrollY=0, barulah preventDefault dipanggil; touchcancel lalu mereset agar scroll berikutnya normal
  const beforeCancel = ptrPullCount;
  fireTouchEv($('m-tab-rincian'), 'touchstart', 150, 200);
  const subLockMv = fireTouchEv($('m-tab-rincian'), 'touchmove', 150, 204);
  assert.strictEqual(subLockMv.defaultPrevented, false, 'sebelum melewati 8px lock, touchmove tidak memanggil preventDefault');
  const lockedMv = fireTouchEv($('m-tab-rincian'), 'touchmove', 150, 240);
  assert.strictEqual(lockedMv.defaultPrevented, true, 'setelah terkunci tarik bawah dari scrollY=0, preventDefault dipanggil');
  fireTouchEv($('m-tab-rincian'), 'touchcancel', 150, 240);
  assert.strictEqual(ptrPullCount, beforeCancel, 'touchcancel mereset gestur PTR tanpa memicu refresh');
  $('m-main').scrollTop = 90;
  fireTouchEv($('m-tab-rincian'), 'touchstart', 150, 300);
  const scrolledDownMv = fireTouchEv($('m-tab-rincian'), 'touchmove', 150, 420);
  assert.strictEqual(scrolledDownMv.defaultPrevented, false, 'saat scrollTop > 0 gestur tarik ke bawah pun tidak memanggil preventDefault');
  fireTouchEv($('m-tab-rincian'), 'touchend', 150, 420);
  $('m-main').scrollTop = 0;

  w.setShellMode('browser');
  assert(!doc.documentElement.classList.contains('rk-mob-app'), 'kelas .rk-mob-app dilepas saat kembali ke mode browser');
  w.sbUser = { id: 'u-ptr-1' };
  const beforeBr = ptrPullCount;
  doPtr(remountShell, 0, 160);
  assert.strictEqual(ptrPullCount, beforeBr, 'Pull-to-Refresh tidak aktif di mode browser/desktop');
  w.setShellMode('mobile-app');

  // 22. Matriks zona PTR konsisten: header, ikon SVG, kartu, slider, grafik (vertikal ya, horizontal tidak)
  w.switchMobileTab('rincian');
  $('m-main').scrollTop = 0;
  w.sbUser = { id: 'u-ptr-1', email: 'ptr@example.com' };
  const curShell22 = remountShell.querySelector('.mob-shell');
  const bnav22 = curShell22.querySelector('.mob-bottom-nav');
  const ptrHdrBlock = curShell22.querySelector('.apk-header-block');
  const ioSvg = curShell22.querySelector('.wallet-io-ico svg');
  const rincianCard = $('m-tab-rincian').querySelector('.card');
  const cfHit = $('m-cf-hit') || $('m-svg-cashflow');
  const cfWrap = $('m-cf-wrap');
  const kpiSlider = $('m-kpi-slider');
  assert(ptrHdrBlock && ioSvg && rincianCard && cfWrap && kpiSlider, 'elemen zona PTR Rincian lengkap');

  const triggerZoneTargets = [
    ['header (.apk-header-block)', () => curShell22.querySelector('.apk-header-block')],
    ['judul sapaan (#m-user-name)', () => $('m-user-name')],
    ['kartu saldo (.wallet-hero)', () => curShell22.querySelector('.wallet-hero')],
    ['ikon SVG (.wallet-io-ico svg)', () => curShell22.querySelector('.wallet-io-ico svg')],
    ['kartu Rincian (.card)', () => $('m-tab-rincian').querySelector('.card')],
    ['kartu slider KPI (.card-slider)', () => $('m-kpi-slider')],
    ['grafik Arus Kas (.chart-stage)', () => $('m-cf-wrap')],
    ['area hit grafik (#m-cf-hit)', () => curShell22.querySelector('#m-cf-hit') || $('m-svg-cashflow')],
  ];
  for (const [label, getEl] of triggerZoneTargets) {
    w._rkPtrReset();
    const prevCount = ptrPullCount;
    doPtr(getEl(), 0, 120);
    await new Promise((r) => setTimeout(r, 25));
    assert.strictEqual(ptrPullCount, prevCount + 1, 'tarik vertikal 120px dari ' + label + ' harus memicu PTR');
  }
  // Subpixel scroll <= 1px (mis. 0.5px di Android WebView) tetap dihitung di atas
  w._rkPtrReset();
  const prevSubPx = ptrPullCount;
  w.scrollY = 0.5;
  doPtr(ptrHdrBlock, 0, 120);
  w.scrollY = 0;
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, prevSubPx + 1, 'nilai pecahan scrollY <= 1px tetap dapat memicu PTR');

  // Zona yang TIDAK boleh memicu PTR: horizontal di pill/card slider/chart, input/select/textarea, overlay terbuka, scrollY > 1
  w.switchMobileTab('kas');
  $('m-main').scrollTop = 0;
  const kasPillSlider = $('m-kas-subnav');
  const kasInput = $('m-kas-search');
  const kasSelect = $('m-kas-debt-kind');
  const kasNote = $('m-kas-note');
  w._rkPtrReset();
  const beforeNoPtr = ptrPullCount;
  doPtr(kasPillSlider, 90, 8);
  doPtr(kasInput, 0, 150);
  doPtr(kasSelect, 0, 150);
  doPtr(kasNote, 0, 150);
  doPtr($('m-kas-slider'), 0, 150);
  doPtr(bnav22, 0, 150);
  // Overlay terbuka: popover, mselect, modal-backdrop, notif bar HP
  $('m-acct-popover').classList.add('open');
  doPtr($('m-tab-kas'), 0, 150);
  $('m-acct-popover').classList.remove('open');
  $('m-kas-cat-ms').classList.add('open');
  doPtr($('m-tab-kas'), 0, 150);
  $('m-kas-cat-ms').classList.remove('open');
  $('m-os-notif').classList.add('show');
  doPtr($('m-os-notif'), 0, 150);
  $('m-os-notif').classList.remove('show');
  $('m-main').scrollTop = 50;
  doPtr(ptrHdrBlock, 0, 150);
  $('m-main').scrollTop = 0;
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeNoPtr, 'gestur horizontal slider, input/select/range, bottom-nav, overlay terbuka, dan scroll > 1 tidak memicu PTR');

  // 23. Re-tap tab Rincian memicu refresh tunggal bersama PTR
  assert.strictEqual(typeof w.rkMobRefresh, 'function', 'fungsi refresh tunggal window.rkMobRefresh diekspos');
  const origRenderMobRincian = w.renderMobRincian;
  let rincianRenderCount = 0;
  w.renderMobRincian = function () {
    rincianRenderCount += 1;
    return origRenderMobRincian.apply(this, arguments);
  };
  w.switchMobileTab('rincian');
  $('m-main').scrollTop = 0;
  w._rkPtrReset();
  rincianRenderCount = 0;
  const beforeRetap = ptrPullCount;
  const navRincianBtn = bnav22.querySelector('[data-mtab="rincian"]');
  const navKasBtn = bnav22.querySelector('[data-mtab="kas"]');
  // 23a. Re-tap saat di Rincian (posisi atas) -> refresh tepat 1x tanpa double render switchMobileTab
  click(navRincianBtn);
  assert($('m-ptr-ind').classList.contains('is-refreshing'), 'indikator PTR aktif dengan kelas .is-refreshing saat refresh berjalan');
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(ptrPullCount, beforeRetap + 1, 'tap ulang tombol Rincian di bottom nav memicu refresh 1x');
  assert.strictEqual(rincianRenderCount, 1, 're-tap Rincian tidak menyebabkan render ulang ganda dari switchMobileTab + PTR');
  // 23b. Tap beruntun dalam masa cooldown tidak memicu ganda
  click(navRincianBtn);
  click(navRincianBtn);
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeRetap + 1, 'tap beruntun dalam masa cooldown tidak memicu refresh ganda');
  // 23c. Overlay terbuka memblokir re-tap refresh
  w._rkPtrReset();
  $('m-sheet-periode').classList.add('open');
  click(navRincianBtn);
  $('m-sheet-periode').classList.remove('open');
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeRetap + 1, 'overlay terbuka memblokir refresh saat re-tap Rincian');
  // 23d. Mode Privasi tetap aman selama refresh re-tap
  w._rkPtrReset();
  doc.body.classList.add('privacy-mode');
  doc.body.classList.add('privacy-on');
  click(navRincianBtn);
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeRetap + 2, 're-tap Rincian tetap berfungsi saat Mode Privasi aktif');
  assert(doc.body.classList.contains('privacy-mode') && doc.body.classList.contains('privacy-on'), 'Mode Privasi tidak bocor selama refresh re-tap');
  doc.body.classList.remove('privacy-mode', 'privacy-on');
  // 23e. Re-tap saat tergulir: scroll halus ke atas lalu jalankan refresh 1x
  w._rkPtrReset();
  const origWinScrollTo = w.scrollTo;
  const scrollCalls = [];
  w.scrollTo = (opts) => {
    scrollCalls.push(opts);
    w.scrollY = 0;
  };
  $('m-main').scrollTop = 180;
  click(navRincianBtn);
  // Tap beruntun sementara masih menunggu ke atas tidak boleh memicu ganda
  click(navRincianBtn);
  await new Promise((r) => setTimeout(r, 380));
  assert(scrollCalls.length >= 1, 're-tap Rincian saat halaman tergulir memanggil scrollTo ke atas');
  assert.strictEqual(ptrPullCount, beforeRetap + 3, 're-tap Rincian saat tergulir menjalankan refresh tepat 1x');
  w.scrollTo = origWinScrollTo;
  $('m-main').scrollTop = 0;
  // 23f. Tab selain Rincian tidak refresh saat ditap ulang; pindah dari tab lain ke Rincian tidak memicu refresh
  w._rkPtrReset();
  const beforeOtherTab = ptrPullCount;
  click(navKasBtn);
  click(navKasBtn);
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeOtherTab, 'tap ulang tab selain Rincian (Kas) tidak memicu refresh');
  click(navRincianBtn);
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeOtherTab, 'pindah dari tab Kas ke Rincian tidak dihitung re-tap dan tidak memicu refresh');
  // 23g. Mode browser tidak terpengaruh
  w.setShellMode('browser');
  const beforeBrowserRetap = ptrPullCount;
  assert.strictEqual(w.rkMobRefresh(), false, 'window.rkMobRefresh nonaktif di mode browser');
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(ptrPullCount, beforeBrowserRetap, 'mode browser tidak terpengaruh oleh rkMobRefresh');
  w.setShellMode('mobile-app');
  w.renderMobRincian = origRenderMobRincian;

  w.sb = origSb21;
  w.sbUser = origSbUser21;
  w.pull = origPull21;

  // 24. Paritas data Mode Perjalanan APK (Tahap 1/4): bug target tabungan, edit itin/book, hapus konfirmasi + Undo
  w.setShellMode('mobile-app');
  const curShell24 = remountShell.querySelector('.mob-shell');
  click(curShell24.querySelector('[data-mgo="trip"]'));
  click($('m-btn-trip-new-pill') || $('m-btn-trip-new'));
  $('m-kp-name').value = 'Osaka Uji Paritas';
  $('m-kp-start').value = '2026-12-01';
  $('m-kp-end').value = '2026-12-06';
  $('m-kp-cur').value = 'JPY';
  $('m-kp-rate').value = '110';
  fire($('m-trip-meta-form'), 'submit');
  const parId = Object.keys(w.ALL.kas.pr).find((k) => w.ALL.kas.pr[k].name === 'Osaka Uji Paritas');
  assert(parId, 'trip Osaka Uji Paritas dibuat untuk uji integritas data');
  const parTr = () => w.ALL.kas.pr[parId];

  // Bug 1a: Target tabungan APK menyimpan `per`, bertahan lewat normKas, dan tampil benar (bukan Rp 0/bln)
  click(curShell24.querySelector('[data-mtripsub="sv"]'));
  $('m-tg-t').value = '6000000';
  fire($('m-tg-t'), 'input');
  $('m-tg-from').value = '2026-10';
  $('m-tg-to').value = '2026-12';
  fire($('m-trip-goal-form'), 'submit');
  assert(parTr().goal && parTr().goal.per === 2000000, 'Bug 1: target tabungan APK menyimpan per=2000000 untuk 3 bulan');
  const reloadedGoal = w.normKas(JSON.parse(JSON.stringify(w.ALL.kas))).pr[parId].goal;
  assert(reloadedGoal && reloadedGoal.per === 2000000, 'Bug 1: goal APK tidak hilang menjadi null setelah normKas');
  assert(!/Rp\s*0\s*(?:\/bln|per bulan)/.test($('m-trip-root').textContent) && /2\.000\.000 per bulan/.test($('m-trip-root').textContent), 'Bug 1: UI target tabungan APK menampilkan g.per (2.000.000 per bulan), bukan Rp 0');

  // Bug 1b: Edit target di APK mempertahankan s0 & link, dan validasi menolak bulan terbalik / s0 >= t
  parTr().goal.s0 = 1500000;
  parTr().goal.link = false;
  w.renderMobTrip();
  click($('m-tg-edit'));
  $('m-tg-t').value = '9000000';
  fire($('m-tg-t'), 'input');
  $('m-tg-from').value = '2026-10';
  $('m-tg-to').value = '2026-12';
  fire($('m-trip-goal-form'), 'submit');
  assert.strictEqual(parTr().goal.s0, 1500000, 'Bug 1: edit target di APK mempertahankan s0');
  assert.strictEqual(parTr().goal.link, false, 'Bug 1: edit target di APK mempertahankan link=false');
  assert.strictEqual(parTr().goal.per, 2500000, 'Bug 1: edit target menghitung ulang per=(9jt-1.5jt)/3 = 2500000');
  click($('m-tg-edit'));
  $('m-tg-to').value = '2026-09';
  fire($('m-trip-goal-form'), 'submit');
  assert.strictEqual(parTr().goal.to, '2026-12', 'Bug 1: validasi menolak bulan selesai < bulan mulai');
  $('m-tg-to').value = '2026-12';
  $('m-tg-t').value = '1000000';
  fire($('m-tg-t'), 'input');
  fire($('m-trip-goal-form'), 'submit');
  assert.strictEqual(parTr().goal.t, 9000000, 'Bug 1: validasi menolak target <= s0');
  w.MOB_STATE.tripGoalEdit = false;
  w.renderMobTrip();

  // Bug 2: Edit kegiatan di APK mempertahankan time2, fx, pay, link, note + default baru pay=''
  parTr().it.push({
    id: 'it-desk-1', day: '2026-12-02', time: '09:00', time2: '11:30',
    place: 'Kiyomizu', cat: 'Tiket & Tour', est: 500, fx: true, pay: 'ic',
    link: 'https://maps.app.goo.gl/abc', note: 'Datang pagi', done: true, rec: 'rk-keep-it',
  });
  click(curShell24.querySelector('[data-mtripsub="itin"]'));
  click(curShell24.querySelector('[data-mit-edit="it-desk-1"]'));
  $('m-it-place').value = 'Kiyomizu-dera';
  fire($('m-trip-itin-form'), 'submit');
  const editedIt = parTr().it.find((x) => x.id === 'it-desk-1');
  assert.strictEqual(editedIt.place, 'Kiyomizu-dera', 'Bug 2: judul kegiatan berubah');
  assert.strictEqual(editedIt.time2, '11:30', 'Bug 2: edit APK tidak menimpa time2');
  assert.strictEqual(editedIt.fx, true, 'Bug 2: edit APK tidak menimpa fx');
  assert.strictEqual(editedIt.pay, 'ic', 'Bug 2: edit APK tidak menimpa pay');
  assert.strictEqual(editedIt.link, 'https://maps.app.goo.gl/abc', 'Bug 2: edit APK tidak menimpa link');
  assert.strictEqual(editedIt.note, 'Datang pagi', 'Bug 2: edit APK tidak menimpa note');
  assert.strictEqual(editedIt.done, true, 'Bug 2: edit APK mempertahankan done');
  assert.strictEqual(editedIt.rec, 'rk-keep-it', 'Bug 2: edit APK mempertahankan rec');
  $('m-it-place').value = 'Arashiyama';
  $('m-it-est').value = '20000';
  fire($('m-trip-itin-form'), 'submit');
  const newItApk = parTr().it.find((x) => x.place === 'Arashiyama');
  assert(newItApk && newItApk.pay === 'cash', 'Bug 2 / Tahap 2: kegiatan baru di APK memakai default desktop aktif pay="cash"');

  // Bug 3: Edit pemesanan di APK mempertahankan a, b, pay, link, fx + default baru a='', b=''
  parTr().bk.push({
    id: 'bk-desk-1', title: 'Hotel Osaka', cat: 'Penginapan', amt: 15000,
    fx: true, pay: 'cash', link: 'https://booking.com/osaka', a: '2026-12-02', b: '2026-12-04',
    paid: true, rec: 'rk-keep-bk',
  });
  click(curShell24.querySelector('[data-mtripsub="book"]'));
  click(curShell24.querySelector('[data-mbk-edit="bk-desk-1"]'));
  $('m-bk-amt').value = '18000';
  fire($('m-bk-amt'), 'input');
  fire($('m-trip-book-form'), 'submit');
  const editedBk = parTr().bk.find((x) => x.id === 'bk-desk-1');
  assert.strictEqual(editedBk.amt, 18000, 'Bug 3: nominal pemesanan berubah');
  assert.strictEqual(editedBk.a, '2026-12-02', 'Bug 3: edit APK tidak menimpa check-in a');
  assert.strictEqual(editedBk.b, '2026-12-04', 'Bug 3: edit APK tidak menimpa check-out b');
  assert.strictEqual(editedBk.pay, 'cash', 'Bug 3: edit APK tidak menimpa pay');
  assert.strictEqual(editedBk.link, 'https://booking.com/osaka', 'Bug 3: edit APK tidak menimpa link');
  assert.strictEqual(editedBk.fx, true, 'Bug 3: edit APK tidak menimpa fx');
  assert.strictEqual(editedBk.paid, true, 'Bug 3: edit APK mempertahankan paid');
  assert.strictEqual(editedBk.rec, 'rk-keep-bk', 'Bug 3: edit APK mempertahankan rec');
  $('m-bk-title').value = 'JR Haruka';
  $('m-bk-amt').value = '350000';
  fire($('m-bk-amt'), 'input');
  fire($('m-trip-book-form'), 'submit');
  const newBkApk = parTr().bk.find((x) => x.title === 'JR Haruka');
  assert(newBkApk && newBkApk.a === '2026-12-01' && newBkApk.b === '2026-12-06' && newBkApk.pay === 'on', 'Bug 3 / Tahap 3: pemesanan baru di APK memakai tanggal default trip & pay="on"');

  // Bug 4: Hapus kegiatan, pemesanan, checklist, dan target tabungan di APK memakai askConfirm + snap + Undo
  const verifyConfirmUndo = (triggerDelFn, checkExistsFn, label) => {
    $('m-toast-box').textContent = '';
    $('m-toast-box').classList.remove('show', 'has-undo');
    triggerDelFn();
    const cfm1 = doc.querySelector('.modal.cfm');
    assert(cfm1, 'Bug 4 (' + label + '): dialog konfirmasi tampil');
    assert(checkExistsFn(), 'Bug 4 (' + label + '): data belum terhapus sebelum konfirmasi');
    assert(!$('m-toast-box').textContent.includes('dihapus'), 'Bug 4 (' + label + '): toast terhapus belum muncul sebelum konfirmasi');
    click(cfm1.querySelector('[data-cf-n]'));
    assert(checkExistsFn(), 'Bug 4 (' + label + '): Batal membiarkan data utuh');
    assert(!$('m-toast-box').textContent.includes('dihapus'), 'Bug 4 (' + label + '): Batal tidak memunculkan toast terhapus');
    triggerDelFn();
    const cfm2 = doc.querySelector('.modal.cfm');
    click(cfm2.querySelector('[data-cf-y]'));
    assert(!checkExistsFn(), 'Bug 4 (' + label + '): Ya hapus menghapus data');
    const undoBtn = $('m-toast-box').querySelector('.m-toast-undo');
    assert(undoBtn, 'Bug 4 (' + label + '): toast Urungkan tampil');
    click(undoBtn);
    assert(checkExistsFn(), 'Bug 4 (' + label + '): Undo mengembalikan data');
  };

  click(curShell24.querySelector('[data-mtripsub="itin"]'));
  verifyConfirmUndo(
    () => click(curShell24.querySelector('[data-mit-del="it-desk-1"]')),
    () => parTr().it.some((x) => x.id === 'it-desk-1'),
    'kegiatan'
  );
  click(curShell24.querySelector('[data-mtripsub="book"]'));
  verifyConfirmUndo(
    () => click(curShell24.querySelector('[data-mbk-del="bk-desk-1"]')),
    () => parTr().bk.some((x) => x.id === 'bk-desk-1'),
    'pemesanan'
  );
  click(curShell24.querySelector('[data-mtripsub="cek"]'));
  $('m-ck-inp').value = 'Adaptor Universal';
  fire($('m-trip-ck-form'), 'submit');
  const ckDelId = parTr().ck[0].id;
  verifyConfirmUndo(
    () => click(curShell24.querySelector('[data-mck-del="' + ckDelId + '"]')),
    () => parTr().ck.some((x) => x.id === ckDelId),
    'checklist'
  );
  click(curShell24.querySelector('[data-mtripsub="sv"]'));
  verifyConfirmUndo(
    () => click($('m-tg-del')),
    () => !!parTr().goal,
    'target tabungan'
  );

  // 25. Tahap 2/4: Daftar, Header Kurs, Sheet Profil, dan Itinerary APK = Desktop Aktif
  w.switchMobileTab('trip');
  const t2Id = parId;
  const t2 = () => w.ALL.kas.pr[t2Id];
  // Siapkan 2 trip untuk uji daftar (1 dalam anggaran, 1 overbudget, 1 tanpa anggaran & IDR default)
  t2().budget = 1000000;
  t2().it = [
    { id: 'it-b', day: '2026-12-02', time: '14:00', time2: '16:30', place: 'Osaka Castle', cat: 'Tiket & Tour', est: 500000, fx: false, pay: 'cash', link: 'https://osaka.jp', note: 'Beli tiket', done: false, rec: '' },
    { id: 'it-a', day: '2026-12-02', time: '09:00', time2: '', place: 'Kuromon', cat: 'Makan', est: 10000, fx: true, pay: 'ic', link: '', note: '', done: true, rec: 'r-rec' },
    { id: 'it-on', day: '2026-12-02', time: '08:00', time2: '', place: 'JR Pass Online', cat: 'Transport', est: 900000, fx: false, pay: 'on', link: '', note: '', done: false, rec: '' },
    { id: 'it-d1', day: '2026-12-01', time: '10:00', time2: '', place: 'Tiba Kansai', cat: 'Transport', est: 100000, fx: false, pay: 'cash', link: '', note: '', done: false, rec: '' },
  ];
  t2().bk = [];
  t2().dt = { '2026-12-01': 'Hari Pertama di Osaka' };
  const noBudId = 'p_nobud_t2';
  w.ALL.kas.pr[noBudId] = {
    id: noBudId, name: 'Trip Tanpa Budget', saldo: 0, link: false,
    start: '2026-12-10', end: '2026-12-12', budget: 0, cur: '', rate: 0,
    dt: {}, tx: [], it: [], bk: [], lk: [], ck: [], note: '', goal: null,
  };
  // 25a. Tampilan daftar: N hari, bar anggaran (.rank-track/.rank-fill merah saat overbudget), IDR bawaan, "anggaran belum ditentukan", .pv
  w.MOB_STATE.tripView = 'list';
  w.renderMobTrip();
  const listRootHtml = $('m-trip-root').innerHTML;
  const cardT2 = $('m-trip-root').querySelector('[data-mtrip-sel="' + t2Id + '"]');
  const cardNoBud = $('m-trip-root').querySelector('[data-mtrip-sel="' + noBudId + '"]');
  assert(cardT2 && /6 hari/.test(cardT2.textContent), 'Tahap 2a: kartu daftar menampilkan jumlah hari "6 hari"');
  assert(cardT2.querySelector('.rank-track .rank-fill'), 'Tahap 2a: kartu beranggaran menampilkan bar .rank-track/.rank-fill');
  assert(/var\(--crimson\)/i.test(cardT2.querySelector('.rank-fill').style.background), 'Tahap 2a: bar anggaran berwarna crimson saat rencana melebihi anggaran');
  assert(/Rencana biaya/.test(cardT2.textContent) && /dari anggaran/.test(cardT2.textContent), 'Tahap 2a: teks Rencana biaya ... dari anggaran ... tampil');
  assert(cardNoBud && /3 hari/.test(cardNoBud.textContent) && /IDR/.test(cardNoBud.textContent) && /anggaran belum ditentukan/i.test(cardNoBud.textContent), 'Tahap 2a: kartu tanpa anggaran menampilkan 3 hari, badge IDR, dan anggaran belum ditentukan');
  assert(!cardNoBud.querySelector('.rank-track'), 'Tahap 2a: kartu tanpa anggaran tidak menampilkan bar anggaran');
  assert(cardT2.querySelectorAll('.pv').length >= 2, 'Tahap 2a: nominal di kartu daftar memakai .pv');

  // 25b. Header detail menampilkan kurs
  click(cardT2);
  assert(w.MOB_STATE.tripView === 'detail', 'Tahap 2b: klik kartu membuka tampilan detail');
  assert(/Kurs 1 JPY = Rp 110/.test($('m-trip-root').textContent), 'Tahap 2b: header detail menampilkan Kurs 1 JPY = Rp 110');
  assert($('m-trip-root').querySelector('.pv') && $('m-btn-trip-share'), 'Tahap 2b/4a: kurs aman .pv & tombol Bagikan tersedia setelah Tahap 4');

  // 25c. Sheet profil menyembunyikan baris nominal saat Belum ditentukan & profil baru punya goal: null
  click($('m-btn-trip-new-pill'));
  assert($('m-kp-use-budget').value === '1', 'Tahap 2c: sheet baru menyetel penggunaan anggaran default');
  $('m-kp-use-budget').value = '0';
  fire($('m-kp-use-budget'), 'change');
  assert.strictEqual($('m-kp-budget-wrap').style.display, 'none', 'Tahap 2c: baris nominal #m-kp-budget-wrap tersembunyi saat Belum ditentukan');
  $('m-kp-name').value = 'Bali Santai';
  $('m-kp-cur').value = '';
  $('m-kp-rate').value = '';
  fire($('m-trip-meta-form'), 'submit');
  const baliId = Object.keys(w.ALL.kas.pr).find((k) => w.ALL.kas.pr[k].name === 'Bali Santai');
  assert(baliId && Object.prototype.hasOwnProperty.call(w.ALL.kas.pr[baliId], 'goal') && w.ALL.kas.pr[baliId].goal === null, 'Tahap 2c: profil baru menulis goal: null eksplisit');
  assert.strictEqual(w.ALL.kas.pr[baliId].budget, 0, 'Tahap 2c: budget 0 saat Belum ditentukan');

  // Empty state itinerary tanpa tanggal & tanpa kegiatan setara desktop aktif
  click(curShell24.querySelector('[data-mtripsub="itin"]'));
  assert(!$('m-it-cur').querySelector('option[value="fx"]'), 'Tahap 2d: opsi mata uang asing tidak tampil jika profil tidak punya cur');
  // Pindahkan sementara tanggal kosong untuk cek empty state tanpa tanggal
  w.ALL.kas.pr[baliId].start = '';
  w.ALL.kas.pr[baliId].end = '';
  w.renderMobTrip();
  assert(/Atur tanggal mulai\/selesai atau tambahkan kegiatan pertama/.test($('m-trip-root').textContent), 'Tahap 2d: empty state itinerary setara desktop aktif');

  // 25d. Kembali ke Osaka (punya JPY, multi-hari, judul hari) -> uji form 9 field + daftar bergrup
  click(curShell24.querySelector('[data-mtrip-sel="' + t2Id + '"]'));
  click(curShell24.querySelector('[data-mtripsub="itin"]'));
  ['m-it-day', 'm-it-time', 'm-it-time2', 'm-it-place', 'm-it-est', 'm-it-cur', 'm-it-pay', 'm-it-cat', 'm-it-link', 'm-it-note'].forEach((id) => {
    assert($(id), 'Tahap 2d: field form #' + id + ' tersedia');
  });
  assert($('m-it-cur').querySelector('option[value="fx"]'), 'Tahap 2d: opsi mata uang asing JPY tampil pada profil ber-mata-uang');
  assert.strictEqual($('m-it-pay').value, 'cash', 'Tahap 2d: default pembayaran baru = cash sesuai desktop aktif');

  // Validasi URL di m-it-link & submit lengkap
  $('m-it-day').value = '2026-12-03';
  $('m-it-time').value = '09.30';
  $('m-it-time2').value = '11.45';
  $('m-it-place').value = 'Fushimi Inari Lengkap';
  $('m-it-est').value = '1200';
  fire($('m-it-est'), 'input');
  $('m-it-cur').value = 'fx';
  $('m-it-pay').value = 'ic';
  $('m-it-cat').value = 'Tiket & Tour';
  $('m-it-link').value = 'ftp://salah';
  $('m-it-note').value = 'Lewat gerbang torii';
  fire($('m-trip-itin-form'), 'submit');
  assert(!t2().it.some((x) => x.place === 'Fushimi Inari Lengkap'), 'Tahap 2d: tautan non-http/https ditolak okUrl');
  $('m-it-link').value = 'https://maps.app.goo.gl/fushimi';
  fire($('m-trip-itin-form'), 'submit');
  const fullIt = t2().it.find((x) => x.place === 'Fushimi Inari Lengkap');
  assert(fullIt && fullIt.time === '09:30' && fullIt.time2 === '11:45' && fullIt.fx === true && fullIt.pay === 'ic' && fullIt.cat === 'Tiket & Tour' && fullIt.link === 'https://maps.app.goo.gl/fushimi' && fullIt.note === 'Lewat gerbang torii', 'Tahap 2d: semua 9 field itinerary tersimpan benar');

  // Edit tidak menimpa done & rec, & panggil scrollIntoView({block:'center'})
  let scrollCenterCalls = 0;
  const origScrollInto = w.HTMLElement.prototype.scrollIntoView;
  w.HTMLElement.prototype.scrollIntoView = function (opts) { if (opts && opts.block === 'center') scrollCenterCalls += 1; };
  click(curShell24.querySelector('[data-mit-edit="it-a"]'));
  assert(scrollCenterCalls >= 1, 'Tahap 2d: klik Ubah memanggil scrollIntoView({block: "center"})');
  w.HTMLElement.prototype.scrollIntoView = origScrollInto;
  assert.strictEqual($('m-it-time').value, '09.00', 'Tahap 2d: edit mengisi m-it-time');
  assert.strictEqual($('m-it-cur').value, 'fx', 'Tahap 2d: edit mengisi m-it-cur=fx');
  assert.strictEqual($('m-it-pay').value, 'ic', 'Tahap 2d: edit mengisi m-it-pay=ic');
  $('m-it-place').value = 'Kuromon Pagi';
  fire($('m-trip-itin-form'), 'submit');
  const edItA = t2().it.find((x) => x.id === 'it-a');
  assert(edItA.place === 'Kuromon Pagi' && edItA.done === true && edItA.rec === 'r-rec', 'Tahap 2d: edit mempertahankan done & rec');

  // 25e. Pengelompokan per hari, urut jam, estimasi harian mengabaikan pay:'on', FX tampil "JPY 10.000", tanpa render tautan eksternal
  const dayCards = [...$('m-trip-root').querySelectorAll('.m-itin-day-card')];
  assert(dayCards.length === 6, 'Tahap 2e: daftar itinerary dikelompokkan menjadi 6 kartu hari sesuai tripDays');
  const day2Card = dayCards.find((el) => el.getAttribute('data-mday') === '2026-12-02');
  assert(day2Card, 'Tahap 2e: kartu hari 2026-12-02 tersedia');
  const day2Order = [...day2Card.querySelectorAll('.mob-sched-card')].map((el) => el.textContent);
  assert(day2Order.length === 3 && /08\.00.*JR Pass Online/.test(day2Order[0]) && /09\.00.*Kuromon Pagi/.test(day2Order[1]) && /14\.00.*16\.30.*Osaka Castle/.test(day2Order[2]), 'Tahap 2e: kegiatan dalam satu hari terurut berdasarkan jam (08.00 -> 09.00 -> 14.00–16.30)');
  // Estimasi hari 2026-12-02 = (10000*110 = 1.100.000) + 500.000 = Rp 1.600.000 (JR Pass 900.000 pay:'on' diabaikan!)
  assert(/Estimasi:\s*Rp\s*1\.600\.000/.test(day2Card.textContent), 'Tahap 2e: estimasi harian mengabaikan item pay=on (1.600.000)');
  assert(/JPY 10\.000/.test(day2Card.textContent), 'Tahap 2e: item FX menampilkan "JPY 10.000"');
  assert(/Beli tiket/.test(day2Card.textContent) && !day2Card.querySelector('a[href^="http"]'), 'Tahap 2e: catatan item tampil dan tautan tidak dirender di kartu item seperti desktop aktif');

  // 25f. Judul hari via change (tanpa re-render & tanpa hapus fokus), hapus bila kosong, tanpa listener ganda, Mode Privasi aman
  const dtInput = $('m-trip-root').querySelector('[data-mdt-day="2026-12-02"]');
  assert(dtInput, 'Tahap 2f: input judul hari [data-mdt-day] tersedia');
  dtInput.value = 'Eksplor Kota Osaka';
  fire(dtInput, 'change');
  assert.strictEqual(t2().dt['2026-12-02'], 'Eksplor Kota Osaka', 'Tahap 2f: change menyimpan judul hari ke P.dt');
  assert.strictEqual($('m-trip-root').querySelector('[data-mdt-day="2026-12-02"]'), dtInput, 'Tahap 2f: change judul hari tidak me-re-render DOM sehingga fokus tidak hilang');
  dtInput.value = '   ';
  fire(dtInput, 'change');
  assert(!Object.prototype.hasOwnProperty.call(t2().dt, '2026-12-02'), 'Tahap 2f: judul hari kosong menghapus kunci dari P.dt');
  // Render berulang tidak menggandakan listener & Mode Privasi aman
  const origSave25 = w.save;
  let saveCalls25 = 0;
  w.save = function () { saveCalls25 += 1; return origSave25.apply(this, arguments); };
  w.renderMobTrip();
  w.renderMobTrip();
  const dtAfterRerender = $('m-trip-root').querySelector('[data-mdt-day="2026-12-02"]');
  dtAfterRerender.value = 'Hari 2 Final';
  fire(dtAfterRerender, 'change');
  assert.strictEqual(saveCalls25, 1, 'Tahap 2f: render berulang tidak menambah listener ganda');
  w.save = origSave25;
  doc.body.classList.add('privacy-mode', 'privacy-on');
  w.renderMobTrip();
  assert($('m-trip-root').querySelectorAll('.pv').length >= 3 && doc.body.classList.contains('privacy-on'), 'Tahap 2f: elemen nominal memakai .pv dan Mode Privasi tetap aman');
  doc.body.classList.remove('privacy-mode', 'privacy-on');

  // 26. Tahap 3 Mode Perjalanan APK = Desktop Aktif (Ikon Itinerary, Ringkasan, Pemesanan, Checklist, Catatan/Tautan, Tabungan)
  w.ALL.kas.pr['p-t3'] = {
    id: 'p-t3',
    name: 'Tokyo Autumn',
    saldo: 0,
    link: false,
    start: '2026-12-01',
    end: '2026-12-04',
    budget: 15000000,
    cur: 'JPY',
    rate: 110,
    dt: {},
    tx: [],
    it: [
      { id: 't3-i1', day: '2026-12-01', time: '09:00', time2: '10:30', place: 'Ramen Shinjuku', est: 10000, fx: true, pay: 'cash', cat: 'Makan', link: '', note: '', done: false, rec: '' },
      { id: 't3-i2', day: '2026-12-02', time: '11:00', time2: '', place: 'Suica Topup', est: 500000, fx: false, pay: 'ic', cat: 'Transport', link: '', note: '', done: false, rec: '' },
      { id: 't3-i3', day: '2026-12-02', time: '13:00', time2: '', place: 'TeamLab Online', est: 400000, fx: false, pay: 'on', cat: 'Tiket & Tour', link: '', note: '', done: false, rec: '' },
    ],
    bk: [
      { id: 't3-b1', title: 'ANA Flight PP', amt: 50000, fx: true, a: '2026-12-01', b: '2026-12-04', cat: 'Transport', pay: 'ic', link: 'https://ana.example', paid: true, rec: 'rec-b1' },
      { id: 't3-b2', title: 'Shinjuku Granbell', amt: 4000000, fx: false, a: '2026-12-01', b: '2026-12-03', cat: 'Penginapan', pay: 'on', link: '', paid: false, rec: '' },
    ],
    lk: [
      { id: 't3-l1', title: 'Peta Metro Tokyo', url: 'https://maps.google.com/?q=tokyo' },
      { id: 't3-lbad', title: 'Bahaya XSS', url: 'javascript:alert(1)' },
    ],
    ck: [
      { id: 't3-c1', text: 'Paspor', done: true },
      { id: 't3-c2', text: 'JR Pass', done: false },
    ],
    note: 'Hotel ref #ANA99',
    goal: null,
  };
  w.MOB_STATE.tripId = 'p-t3';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripEditIt = null;
  w.MOB_STATE.tripEditBk = null;
  w.MOB_STATE.tripGoalEdit = false;
  const t3 = () => w.ALL.kas.pr['p-t3'];

  // 26a. Sisa Tahap 2: Ikon kategori .cat-logo pada kartu Itinerary APK
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  const itCards3 = [...$('m-trip-root').querySelectorAll('.m-itin-day-card .mob-sched-card')];
  assert(itCards3.length === 3 && itCards3.every((c) => !!c.querySelector('.cat-logo svg')), 'Tahap 3a: semua kartu itinerary memiliki ikon kategori .cat-logo');
  assert(itCards3[0].querySelector('.cat-logo').getAttribute('title') === 'Makan & Minum' && /F97316|249,\s*115,\s*22/i.test(itCards3[0].querySelector('.cat-logo').getAttribute('style') || ''), 'Tahap 3a: kategori Makan terpetakan ke warna Makan & Minum');

  // 26b. Subtab Ringkasan (ring) setara desktop aktif
  // Bandingkan angka & label kunci langsung dengan renderTrip() desktop aktif
  w.setMode('trip');
  w.setTrip('p-t3');
  w.BR_STATE.tripView = 'detail';
  w.BR_STATE.tripSubTab = 'ring';
  w.renderTrip();
  const dtRingText = $('trip-root').textContent;
  w.setShellMode('mobile-app');

  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mobRingRoot = $('m-trip-root');
  const mobRingText = mobRingRoot.textContent;
  // pl: bk = 50000*110 (5.500.000) + 4.000.000 = 9.500.000; d = 10000*110 (1.100.000) + 500.000 = 1.600.000; t = 11.100.000; paid = 5.500.000; unpaid = 4.000.000; N = 4 -> per hari = 2.775.000
  assert(/Total Rencana Biaya/.test(mobRingText) && /11\.100\.000/.test(mobRingText) && /Pemesanan\s*Rp\s*9\.500\.000\s*\+\s*Harian\s*Rp\s*1\.600\.000/.test(mobRingText), 'Tahap 3b: kartu Total Rencana Biaya & hint sama dengan desktop');
  assert(/Sisa Anggaran/.test(mobRingText) && /3\.900\.000/.test(mobRingText) && /74%\s*dari\s*Rp\s*15\.000\.000/.test(mobRingText), 'Tahap 3b: kartu Sisa Anggaran & persentase sama dengan desktop');
  assert(/Sudah Dibayar/.test(mobRingText) && /5\.500\.000/.test(mobRingText) && /Belum dibayar:\s*Rp\s*4\.000\.000/.test(mobRingText), 'Tahap 3b: kartu Sudah Dibayar & Belum dibayar sama dengan desktop');
  assert(/Rencana per Hari/.test(mobRingText) && /2\.775\.000/.test(mobRingText) && /4 hari\s*·\s*1 JPY = Rp 110/.test(mobRingText), 'Tahap 3b: kartu Rencana per Hari & kurs sama dengan desktop');
  assert(!/Checklist:\s*\d+\/\d+/.test(mobRingText), 'Tahap 3b: hint lama Checklist x/y dihapus');
  assert(/Siapkan Tunai \/ Kartu/.test(mobRingText) && /JPY\s*10\.000/.test(mobRingText) && /1\.100\.000/.test(mobRingText), 'Tahap 3b: seksi Siapkan Tunai / Kartu tampil dengan FX & ekivalen Rp');
  assert(/Estimasi per Hari/.test(mobRingText) && /Rencana Biaya per Kategori/.test(mobRingText), 'Tahap 3b: seksi Estimasi per Hari dan Rencana Biaya per Kategori tampil');
  assert(/2\.775\.000/.test(dtRingText) && /3\.900\.000/.test(dtRingText) && mobRingRoot.querySelectorAll('.simple-row .cat-logo').length === 3, 'Tahap 3b: paritas numerik & 3 ikon kategori sejalan dengan desktop aktif');

  // Edge case Ringkasan: overbudget -> Melebihi Anggaran, budget=0 -> Belum diatur, tanpa tanggal -> Tanggal belum diisi & empty sections
  t3().budget = 9000000;
  w.renderMobTrip();
  assert(/Melebihi Anggaran/.test(mobRingRoot.textContent) && /2\.100\.000/.test(mobRingRoot.textContent), 'Tahap 3b: overbudget menampilkan Melebihi Anggaran');
  t3().budget = 0; t3().start = ''; t3().end = '';
  const origIt3 = t3().it; t3().it = [];
  w.renderMobTrip();
  assert(/Belum diatur/.test(mobRingRoot.textContent) && /Atur lewat tombol Ubah/.test(mobRingRoot.textContent) && /Tanggal belum diisi/.test(mobRingRoot.textContent) && /Belum ada pengeluaran tunai\/kartu harian di Itinerary\./.test(mobRingRoot.textContent), 'Tahap 3b: edge case tanpa anggaran & tanpa tanggal/itinerary sama dengan desktop');
  t3().budget = 15000000; t3().start = '2026-12-01'; t3().end = '2026-12-04'; t3().it = origIt3;

  // 26c. Subtab Pemesanan (book)
  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  const bkText0 = $('m-trip-root').textContent;
  assert(/Total Pemesanan/.test(bkText0) && /Sudah Dibayar/.test(bkText0) && /Belum Dibayar/.test(bkText0), 'Tahap 3c: 3 kartu ringkasan atas Pemesanan tampil');
  assert($('m-bk-cur') && [...$('m-bk-cur').options].some((o) => o.value === 'fx' && o.textContent.trim() === 'JPY'), 'Tahap 3c: selector mata uang JPY tampil saat tr.cur diset');
  assert($('m-bk-start') && $('m-bk-start').value === '2026-12-01' && $('m-bk-end') && $('m-bk-end').value === '2026-12-04', 'Tahap 3c: tanggal default check-in/out mengikuti start/end trip');
  assert(/1 Des – 4 Des/.test(bkText0) && /5\.500\.000/.test(bkText0) && $('m-trip-root').querySelector('.mob-sched-card .cat-logo'), 'Tahap 3c: item daftar menampilkan ikon kategori, rentang tanggal a–b, dan nominal terkonversi');

  // Tambah pemesanan baru dalam FX + tanggal
  $('m-bk-title').value = 'JR Kansai Pass';
  $('m-bk-amt').value = '5000';
  $('m-bk-cur').value = 'fx';
  $('m-bk-start').value = '2026-12-02';
  $('m-bk-end').value = '2026-12-04';
  $('m-bk-cat').value = 'Tiket & Tour';
  fire($('m-trip-book-form'), 'submit');
  const addedBk = t3().bk.find((x) => x.title === 'JR Kansai Pass');
  assert(addedBk && addedBk.amt === 5000 && addedBk.fx === true && addedBk.a === '2026-12-02' && addedBk.b === '2026-12-04' && addedBk.pay === 'on' && addedBk.paid === false, 'Tahap 3c: tambah pemesanan menyimpan fx, a, b, cat, default pay=on');

  // Edit pemesanan mempertahankan pay, link, paid, rec & Batal tidak mengubah data
  click($('m-trip-root').querySelector('[data-mbk-edit="t3-b1"]'));
  assert($('m-bk-cur').value === 'fx' && $('m-bk-start').value === '2026-12-01' && $('m-bk-end').value === '2026-12-04' && $('m-bk-cancel'), 'Tahap 3c: edit memuat fx & tanggal a/b serta tombol Batal');
  click($('m-bk-cancel'));
  assert(w.MOB_STATE.tripEditBk === null, 'Tahap 3c: Batal keluar dari mode edit');
  click($('m-trip-root').querySelector('[data-mbk-edit="t3-b1"]'));
  $('m-bk-title').value = 'ANA Flight Revised';
  $('m-bk-amt').value = '55000';
  fire($('m-trip-book-form'), 'submit');
  const edBk = t3().bk.find((x) => x.id === 't3-b1');
  assert(edBk.title === 'ANA Flight Revised' && edBk.pay === 'ic' && edBk.link === 'https://ana.example' && edBk.paid === true && edBk.rec === 'rec-b1', 'Tahap 3c: edit me-merge field form dan mempertahankan pay, link, paid, rec');

  // 26d. Subtab Checklist (cek) + progress bar + jaga scroll
  w.MOB_STATE.tripSub = 'cek';
  w.renderMobTrip();
  assert(/1 dari 2 siap \(50%\)/.test($('m-trip-root').textContent), 'Tahap 3d: subjudul checklist menampilkan N dari M siap (P%)');
  const ckBar = $('m-trip-root').querySelector('.rank-track .rank-fill');
  assert(ckBar && ckBar.style.width === '50%', 'Tahap 3d: progress bar checklist menampilkan lebar 50%');
  assert($('m-trip-ck-std') && /Isi Daftar Standar/.test($('m-trip-ck-std').textContent), 'Tahap 3d: tombol memakai teks Isi Daftar Standar');
  assert($('m-ck-inp') && $('m-ck-inp').getAttribute('maxlength') === '60', 'Tahap 3d: input checklist punya maxlength=60');
  const mmScroll = $('m-main');
  if (mmScroll) mmScroll.scrollTop = 180;
  const ckCb = $('m-trip-root').querySelector('[data-mck-tog="t3-c2"]');
  ckCb.checked = true;
  fire(ckCb, 'change');
  assert(/2 dari 2 siap \(100%\)/.test($('m-trip-root').textContent), 'Tahap 3d: toggle checklist memperbarui hitungan jadi 2 dari 2 siap (100%)');
  if (mmScroll) assert.strictEqual(mmScroll.scrollTop, 180, 'Tahap 3d: toggle checklist tidak mereset posisi scroll');

  // 26e. Subtab Catatan & Tautan (cat) + keamananan XSS/javascript: + Capacitor Browser + Undo
  w.MOB_STATE.tripSub = 'cat';
  w.renderMobTrip();
  const catHtml = $('m-trip-root').innerHTML;
  assert(catHtml.indexOf('Tautan Berguna') !== -1 && catHtml.indexOf('Tautan Berguna') < catHtml.indexOf('Catatan Penting'), 'Tahap 3e: kartu Tautan Berguna muncul sebelum Catatan Penting');
  assert(!catHtml.includes('href="javascript:'), 'Tahap 3e: URL javascript: tidak dirender sebagai tautan aktif');
  // Tambah tautan tanpa https:// -> otomatis ditambah https://, serta escape karakter HTML
  $('m-lk-title').value = '<img onerror=1> Panduan';
  $('m-lk-url').value = 'tokyometro.jp/en';
  fire($('m-trip-lk-form'), 'submit');
  const addedLk = t3().lk.find((x) => x.title.includes('Panduan'));
  assert(addedLk && addedLk.url === 'https://tokyometro.jp/en', 'Tahap 3e: URL tanpa skema otomatis dilengkapi https://');
  assert(!$('m-trip-root').querySelector('#m-trip-root img[onerror]'), 'Tahap 3e: judul tautan di-escape agar aman dari XSS');
  // Klik tautan di Capacitor memakai Browser.open dan tidak menavigasi WebView
  let openedExtUrl = '';
  const origCap26 = w.Capacitor;
  w.Capacitor = {
    isNativePlatform: () => true,
    Plugins: { Browser: { open: (opts) => { openedExtUrl = opts && opts.url; return Promise.resolve(); } } },
  };
  const safeAnchor = $('m-trip-root').querySelector('a[data-m-ext-url="https://maps.google.com/?q=tokyo"]');
  assert(safeAnchor, 'Tahap 3e: tautan aman memakai [data-m-ext-url]');
  click(safeAnchor);
  assert.strictEqual(openedExtUrl, 'https://maps.google.com/?q=tokyo', 'Tahap 3e: klik tautan di Capacitor memanggil Browser.open({url})');
  w.Capacitor = origCap26;
  // Hapus tautan pakai konfirmasi + snap + Undo
  click($('m-trip-root').querySelector('[data-mlk-del="t3-l1"]'));
  const cfmLk = doc.querySelector('.modal.cfm');
  assert(cfmLk, 'Tahap 3e: hapus tautan membuka dialog konfirmasi');
  click(cfmLk.querySelector('[data-cf-y]'));
  assert(!t3().lk.some((x) => x.id === 't3-l1'), 'Tahap 3e: konfirmasi menghapus tautan');
  const undoLk = $('m-toast-box').querySelector('.m-toast-undo');
  assert(undoLk, 'Tahap 3e: toast Undo tampil setelah menghapus tautan');
  click(undoLk);
  assert(t3().lk.some((x) => x.id === 't3-l1'), 'Tahap 3e: Undo mengembalikan tautan yang dihapus');
  // Auto-save catatan tetap jalan
  const noteEl26 = $('m-trip-note');
  noteEl26.value = 'Catatan baru';
  fire(noteEl26, 'input');
  assert.strictEqual(t3().note, 'Catatan baru', 'Tahap 3e: auto-save #m-trip-note tetap bekerja');

  // 26f. Subtab Tabungan (sv) dengan s0, link, progress %, dan tombol Batal
  w.MOB_STATE.tripSub = 'sv';
  w.renderMobTrip();
  assert($('m-tg-s0') && $('m-tg-link') && !$('m-tg-cancel'), 'Tahap 3f: form target baru memiliki m-tg-s0, m-tg-link, dan tanpa Batal');
  $('m-tg-t').value = '12000000';
  $('m-tg-s0').value = '2000000';
  $('m-tg-link').value = '0';
  $('m-tg-from').value = '2026-07';
  $('m-tg-to').value = '2026-11'; // 5 bulan -> ceil((12jt - 2jt)/5 / 1000)*1000 = 2.000.000
  fire($('m-trip-goal-form'), 'submit');
  assert(t3().goal && t3().goal.s0 === 2000000 && t3().goal.link === false && t3().goal.per === 2000000, 'Tahap 3f: simpan target membaca s0 & link dari form');
  const svViewText = $('m-trip-root').textContent;
  // Pada tanggal 2026-11-12, seluruh 5 bulan (2026-07..2026-11) sudah berjalan -> goalSavedNow = min(12jt, 2jt + 5*2jt) = 12.000.000 (100%)
  assert(/Hanya Pencatat/.test(svViewText) && /Terkumpul\s*Rp\s*12\.000\.000\s*dari\s*Rp\s*12\.000\.000/.test(svViewText) && /100%/.test(svViewText) && /Sisihkan\s*Rp\s*2\.000\.000\s*per bulan\s*·\s*2026-07\s*–\s*2026-11/.test(svViewText), 'Tahap 3f / D2: kartu tampilan target menampilkan badge, akumulasi bulan berjalan terkumpul/target, %, dan sisihkan bulanan');
  assert($('m-tg-edit') && /Ubah Target/.test($('m-tg-edit').textContent) && $('m-tg-del') && /Hapus Target/.test($('m-tg-del').textContent), 'Tahap 3f: tombol Ubah Target & Hapus Target tampil');
  click($('m-tg-edit'));
  assert($('m-tg-cancel') && $('m-tg-s0').value === '2.000.000' && $('m-tg-link').value === '0', 'Tahap 3f: Ubah Target mengisi s0 & link serta menampilkan tombol Batal');
  $('m-tg-t').value = '99000000';
  click($('m-tg-cancel'));
  assert(t3().goal.t === 12000000 && $('m-tg-edit'), 'Tahap 3f: Batal mengembalikan kartu tampilan tanpa mengubah tr.goal');
  // Tidak ada listener ganda setelah renderMobTrip() berulang
  const origSave26 = w.save;
  let saveCalls26 = 0;
  w.save = function () { saveCalls26 += 1; return origSave26.apply(this, arguments); };
  w.renderMobTrip();
  w.renderMobTrip();
  w.MOB_STATE.tripSub = 'cek';
  w.renderMobTrip();
  const tog26 = $('m-trip-root').querySelector('[data-mck-tog="t3-c1"]');
  tog26.checked = false;
  fire(tog26, 'change');
  assert.strictEqual(saveCalls26, 1, 'Tahap 3f: render berulang tidak menambah listener ganda pada aksi Tahap 3');
  w.save = origSave26;

  // 27. Tahap 4/4: Bagikan Itinerary (WhatsApp, Salin, PDF) & Impor/Template Excel di APK
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-t3';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();

  // 27a. Tombol Bagikan di header detail membuka sheet Bagikan + Back Android menutup sheet
  const shareBtn27 = $('m-btn-trip-share');
  assert(shareBtn27 && /Bagikan/.test(shareBtn27.textContent), 'Tahap 4a: tombol Bagikan (#m-btn-trip-share) tampil di header detail');
  assert($('m-btn-trip-edit') && $('m-trip-root').querySelector('[data-mtrip-del]'), 'Tahap 4a: tombol Ubah & Hapus tetap ada bersama Bagikan');
  click(shareBtn27);
  const shSheet = $('m-sheet-trip-share');
  assert(shSheet && shSheet.classList.contains('open'), 'Tahap 4a: klik Bagikan membuka #m-sheet-trip-share');
  assert($('m-sh-inc-cost') && $('m-sh-inc-cost').checked === true, 'Tahap 4a: checkbox Sertakan rincian biaya default tercentang');
  assert(shSheet.querySelector('[data-msh="wa"]') && shSheet.querySelector('[data-msh="copy"]') && shSheet.querySelector('[data-msh="pdf"]'), 'Tahap 4a: tombol aksi Bagikan lengkap');

  // Back Android menutup sheet Bagikan
  const origCap27 = w.Capacitor;
  w.Capacitor = { isNativePlatform: () => true, Plugins: {} };
  assert.strictEqual(w.rkHandleAndroidBack(), 'sheet', 'Tahap 4a: rkHandleAndroidBack menutup #m-sheet-trip-share');
  assert(!shSheet.classList.contains('open'), 'Tahap 4a: #m-sheet-trip-share tertutup setelah Back Android');
  click(shareBtn27);

  // 27b. Checkbox biaya mengubah tripText + Salin teks menyalin persis tripText(tr, cost)
  let copied27 = '';
  const origClip27 = w.navigator.clipboard;
  Object.defineProperty(w.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (txt) => { copied27 = txt; return Promise.resolve(); } },
  });
  click(shSheet.querySelector('[data-msh="copy"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(copied27, w.tripText(t3(), true), 'Tahap 4b: Salin teks (biaya aktif) sama persis dengan tripText(tr, true)');
  assert.strictEqual($('m-sh-status').textContent, 'Teks disalin. Tinggal tempel di WhatsApp atau catatan.', 'Tahap 4b: status salin teks sama dengan desktop');
  $('m-sh-inc-cost').checked = false;
  click(shSheet.querySelector('[data-msh="copy"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(copied27, w.tripText(t3(), false), 'Tahap 4b: uncheck biaya mengubah teks menjadi tripText(tr, false)');
  $('m-sh-inc-cost').checked = true;
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: origClip27 });

  // 27c. Kirim teks (WA): navigator.share bila ada, wa.me lewat Capacitor Browser bila tidak ada, tolak bila > 1800 char
  let navShareArg = null;
  const origShare27 = w.navigator.share;
  Object.defineProperty(w.navigator, 'share', {
    configurable: true,
    value: (obj) => { navShareArg = obj; return Promise.resolve(); },
  });
  click(shSheet.querySelector('[data-msh="wa"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert(navShareArg && navShareArg.text === w.tripText(t3(), true), 'Tahap 4c: Kirim teks memanggil navigator.share saat tersedia');

  // Tanpa navigator.share -> wa.me lewat Capacitor Browser.open
  Object.defineProperty(w.navigator, 'share', { configurable: true, value: undefined });
  let waOpened = '';
  w.Capacitor = {
    isNativePlatform: () => true,
    Plugins: { Browser: { open: (o) => { waOpened = o && o.url; return Promise.resolve(); } } },
  };
  const hrefBefore27 = w.location.href;
  click(shSheet.querySelector('[data-msh="wa"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert(waOpened.startsWith('https://wa.me/?text=') && w.location.href === hrefBefore27, 'Tahap 4c: fallback membuka wa.me lewat Browser.open tanpa mengubah WebView');

  // Teks sangat panjang -> menolak URL terpotong & arahkan ke Salin teks
  waOpened = '';
  const origItLen = t3().it.slice();
  t3().it = Array.from({ length: 18 }, (_, i) => ({
    id: 'lg-' + i, day: '2026-12-01', time: '09:00', time2: '10:00',
    place: 'Kunjungan Panjang Tokyo Station Museum #' + i + ' catatan detail ekstra panjang untuk menguji batas panjang URL WhatsApp',
    est: 5000, fx: true, pay: 'cash', cat: 'Tiket & Tour', link: 'https://example.com/tokyotour/' + i, note: 'Bawa voucher cetak', done: false, rec: '',
  }));
  click(shSheet.querySelector('[data-msh="wa"]'));
  assert(waOpened === '' && /Salin teks/i.test($('m-sh-status').textContent), 'Tahap 4c: itinerary terlalu panjang ditolak dengan arahan Salin teks');
  t3().it = origItLen;
  Object.defineProperty(w.navigator, 'share', { configurable: true, value: origShare27 });
  w.Capacitor = origCap27;

  // 27d. PDF Itinerary APK: tripPdfData + repPdf + rkDownloadBlob + non-Latin + repPdf Laporan Keuangan tidak berubah
  const repFinancialBefore = w.repPdf(w.repData('m'));
  const longPlace27 = 'Kunjungan ke Tokyo Skytree Tembo Galleria dan Museum Akuarium Sumida dengan pemandu wisata lokal serta makan siang bento bersama rombongan';
  const pdfTrip = Object.assign({}, t3(), {
    name: 'Tokyo \u6771\u4EAC Trip /:*?',
    it: [
      { id: 'p-1', day: '2026-12-01', time: '09:00', time2: '12:00', place: longPlace27, est: 3200, fx: true, pay: 'cash', cat: 'Tiket & Tour', link: '', note: 'Catatan \u65E5\u672C\u8A9E', done: false, rec: '' },
    ],
  });
  const pdfDocCost = w.tripPdfData(pdfTrip, true);
  const pdfDocNoCost = w.tripPdfData(pdfTrip, false);
  assert(!/[\\/:*?"<>|]/.test(pdfDocCost.filename) && pdfDocCost.filename.endsWith('.pdf'), 'Tahap 4d: nama file PDF aman dari karakter terlarang');
  const dayTableRows = pdfDocCost.tables[0].rows;
  assert(dayTableRows.length >= 2 && dayTableRows.every((r) => !String(r[1]).endsWith('..')), 'Tahap 4d: teks panjang dipecah ke baris lanjutan, bukan dipotong ..');
  assert(dayTableRows.some((r) => /JPY\s*3\.200/.test(String(r[2] || ''))), 'Tahap 4d: biaya FX terformat saat Sertakan rincian biaya aktif');
  assert(pdfDocNoCost.tables[0].cols.length === 2 && !pdfDocNoCost.summary.some((s) => /Total Rencana/i.test(s[0])), 'Tahap 4d: tanpa biaya menyembunyikan kolom & ringkasan biaya');
  const pdfBytes27 = w.repPdf(pdfDocCost);
  const pdfLatin1 = Buffer.from(pdfBytes27).toString('latin1');
  assert(pdfLatin1.startsWith('%PDF-'), 'Tahap 4d: byte PDF dimulai %PDF-');
  assert(!pdfLatin1.includes('Tokyo Skytree..'), 'Tahap 4d: isi PDF tidak terpotong .. untuk judul kegiatan panjang');
  assert.strictEqual(Buffer.compare(Buffer.from(repFinancialBefore), Buffer.from(w.repPdf(w.repData('m')))), 0, 'Tahap 4d: keluaran repPdf Laporan Keuangan identik tidak berubah');

  // Klik tombol Simpan / bagikan PDF memanggil rkDownloadBlob + catatan non-WinAnsi + status metode jujur
  const t3OrigName = t3().name;
  t3().name = 'Trip \u6771\u4EAC';
  const origDl27 = w.rkDownloadBlob;
  let dlArgs27 = null;
  w.rkDownloadBlob = function (name, data, mime) {
    dlArgs27 = { name, data, mime };
    return { ok: true, method: 'capacitor-share', done: Promise.resolve({ ok: true, method: 'capacitor-share' }) };
  };
  click(shSheet.querySelector('[data-msh="pdf"]'));
  await new Promise((r) => setTimeout(r, 10));
  assert(dlArgs27 && dlArgs27.mime === 'application/pdf' && Buffer.from(dlArgs27.data).toString('latin1').startsWith('%PDF-'), 'Tahap 4d: aksi PDF memanggil rkDownloadBlob dengan MIME application/pdf');
  assert(/capacitor-share|dibagikan/i.test($('m-sh-status').textContent) && /non-Latin|\?/i.test($('m-sh-status').textContent), 'Tahap 4d: status PDF menampilkan metode pengiriman jujur dan catatan karakter non-Latin');
  w.rkDownloadBlob = origDl27;
  t3().name = t3OrigName;
  w.mobCloseSheet('m-sheet-trip-share');

  // 27e. Excel: tombol di daftar, accept MIME+ekstensi, xlBuildProfile & validasi identik desktop, impor, template, & gagal muat offline
  w.MOB_STATE.tripView = 'list';
  w.renderMobTrip();
  assert($('m-btn-trip-new') && $('m-btn-trip-xl') && $('m-btn-trip-tpl'), 'Tahap 4e: daftar perjalanan menampilkan + Perjalanan baru, Impor Excel, dan Template Excel');
  const xlFileEl = $('m-xl-file');
  const xlAcc = (xlFileEl && xlFileEl.getAttribute('accept')) || '';
  assert(xlAcc.includes('.xlsx') && xlAcc.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && xlAcc.includes('text/csv'), 'Tahap 4e: input #m-xl-file menyertakan ekstensi dan MIME Android');

  // Stub SheetJS minimal kompatibel dengan xlParse & xlBuildTemplateWb
  const origXlsx = w.XLSX;
  let writeCalled = null, writeFileCalled = null;
  const fakeWb = {
    SheetNames: ['Itinerary', 'Pemesanan'],
    Sheets: { Itinerary: 'it', Pemesanan: 'bk' },
  };
  w.XLSX = {
    read: () => fakeWb,
    utils: {
      sheet_to_json: (sh) => sh === 'it'
        ? [
            ['Tanggal', 'Jam', 'Kegiatan', 'Kategori', 'Biaya', 'Mata uang', 'Pembayaran'],
            ['', '', 'DAY 1 Tiba Haneda', '', '', '', ''],
            ['2026-12-10', '09.00-11.00', 'Naik Monorail', 'Transport', 500, 'JPY', 'Kartu IC'],
          ]
        : [
            ['Nama', 'Kategori', 'Jumlah', 'Mata uang', 'Pembayaran', 'Lunas'],
            ['ANA PP', 'Transport', 6500000, 'IDR', 'Online', 'Ya'],
          ],
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: (aoa) => ({ aoa }),
      book_append_sheet: (wb, ws, nm) => { wb.SheetNames.push(nm); wb.Sheets[nm] = ws; },
    },
    write: (wb, opts) => { writeCalled = { wb, opts }; return new Uint8Array([80, 75, 3, 4]); },
    writeFile: (wb, fn) => { writeFileCalled = { wb, fn }; },
  };
  const parsed27 = w.xlParse(fakeWb);
  assert.strictEqual(parsed27.it.length, 1);
  assert.strictEqual(parsed27.bk.length, 1);

  // Uji validasi xlValidateMeta sama persis dengan xlCommit
  assert.strictEqual(w.xlValidateMeta(parsed27, '', 'JPY', '110').error, 'Nama perjalanan belum diisi.');
  assert.strictEqual(w.xlValidateMeta(parsed27, 'Tokyo Baru', '', '').error, 'Ada biaya mata uang asing (mis. yen). Isi kodenya, misalnya JPY.');
  assert.strictEqual(w.xlValidateMeta(parsed27, 'Tokyo Baru', 'JP', '110').error, 'Mata uang terdiri dari 3 huruf, mis. JPY.');
  assert.strictEqual(w.xlValidateMeta(parsed27, 'Tokyo Baru', 'JPY', '0').error, 'Isi kurs: berapa rupiah untuk 1 JPY.');

  // Uji Template: APK pakai rkDownloadBlob + MIME xlsx, Desktop pakai X.writeFile
  const origDlTpl = w.rkDownloadBlob;
  let tplDl = null;
  w.rkDownloadBlob = function (name, data, mime) { tplDl = { name, data, mime }; return { ok: true, method: 'data-url' }; };
  click($('m-btn-trip-tpl'));
  await new Promise((r) => setTimeout(r, 20));
  assert(writeCalled && writeCalled.opts && writeCalled.opts.bookType === 'xlsx' && writeCalled.opts.type === 'array', 'Tahap 4e: Template APK menulis workbook ke array byte xlsx');
  assert(tplDl && tplDl.name === 'template-itinerary.xlsx' && tplDl.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Tahap 4e: Template APK memanggil rkDownloadBlob dengan MIME xlsx');
  w.rkDownloadBlob = origDlTpl;
  w.xlTemplate();
  await new Promise((r) => setTimeout(r, 20));
  assert(writeFileCalled && writeFileCalled.fn === 'template-itinerary.xlsx', 'Tahap 4e: Template desktop tetap memakai X.writeFile');

  // Uji alur gagal muat pustaka (offline) -> pesan jelas & tidak menumpuk listener saat dicoba ulang
  const origLoadXlsx27 = w.loadXlsx;
  w.loadXlsx = () => Promise.reject(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet.'));
  click($('m-btn-trip-tpl'));
  click($('m-btn-trip-tpl'));
  await new Promise((r) => setTimeout(r, 20));
  assert(/Pustaka Excel gagal dimuat/i.test($('m-toast-box').textContent) && !$('m-btn-trip-tpl').disabled, 'Tahap 4e: offline gagal muat menampilkan pesan jelas & tombol tidak macet disabled');
  w.loadXlsx = origLoadXlsx27;
  let retryDlCnt = 0;
  w.rkDownloadBlob = function () { retryDlCnt += 1; return { ok: true, method: 'data-url' }; };
  click($('m-btn-trip-tpl'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(retryDlCnt, 1, 'Tahap 4e: coba ulang setelah offline tidak menumpuk listener ganda');
  w.rkDownloadBlob = origDlTpl;

  // Uji sheet Impor Excel APK: pilih file -> validasi error identik -> submit sukses (termasuk nama unik "Tokyo Autumn (2)") -> pindah ke detail ring
  const fakeFile = new w.File([new Uint8Array([1, 2, 3])], 'Tokyo_Autumn.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(xlFileEl, 'files', { configurable: true, get: () => [fakeFile] });
  fire(xlFileEl, 'change');
  await new Promise((r) => setTimeout(r, 30));
  const xlSheet = $('m-sheet-trip-xl');
  assert(xlSheet && xlSheet.classList.contains('open'), 'Tahap 4e: memilih file Excel membuka #m-sheet-trip-xl');
  assert.strictEqual($('m-xl-summary').textContent, w.xlSummaryText(parsed27), 'Tahap 4e: ringkasan sheet impor sama persis dengan xlSummaryText desktop');
  assert.strictEqual($('m-xl-name').value, 'Tokyo Autumn', 'Tahap 4e: nama default diambil dari nama file');
  // Error kurs wajib diisi
  $('m-xl-cur').value = 'JPY';
  $('m-xl-rate').value = '';
  fire($('m-trip-xl-form'), 'submit');
  assert.strictEqual($('m-xl-err').textContent, 'Isi kurs: berapa rupiah untuk 1 JPY.', 'Tahap 4e: pesan error kurs identik dengan xlCommit desktop');
  assert(xlSheet.classList.contains('open'), 'Tahap 4e: error validasi tidak menutup sheet impor');
  // Back Android menutup sheet Impor
  w.Capacitor = { isNativePlatform: () => true, Plugins: {} };
  assert.strictEqual(w.rkHandleAndroidBack(), 'sheet', 'Tahap 4e: Back Android menutup #m-sheet-trip-xl');
  w.Capacitor = origCap27;
  // Buka lagi & submit valid -> duplikat nama menjadi Tokyo Autumn (2)
  fire(xlFileEl, 'change');
  await new Promise((r) => setTimeout(r, 30));
  $('m-xl-cur').value = 'JPY';
  $('m-xl-rate').value = '112';
  fire($('m-trip-xl-form'), 'submit');
  const impTrip = Object.values(w.ALL.kas.pr).find((p) => p.name === 'Tokyo Autumn (2)');
  assert(impTrip && impTrip.cur === 'JPY' && impTrip.rate === 112 && impTrip.it.length === 1 && impTrip.bk.length === 1 && impTrip.goal === null, 'Tahap 4e: impor membuat profil identik dengan nama unik (2)');
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'Tahap 4e: setelah impor pindah ke detail perjalanan baru');
  assert.strictEqual(w.MOB_STATE.tripSub, 'ring', 'Tahap 4e: subtab setelah impor berada di Ringkasan');
  assert.strictEqual(w.MOB_STATE.tripId, impTrip.id, 'Tahap 4e: tripId mengarah ke profil baru hasil impor');
  assert($('m-toast-box').textContent.includes('Perjalanan diimpor: 1 kegiatan, 1 pemesanan.'), 'Tahap 4e: toast konfirmasi impor tampil');

  // Paritas xlBuildProfile vs struktur profil desktop (sama bentuk tanpa field ekstra liar)
  const bp = w.xlBuildProfile(parsed27, 'Uji Paritas XL', 'SGD', '12000');
  assert.deepStrictEqual(Object.keys(bp.profile).sort(), ['bk', 'budget', 'ck', 'cur', 'dt', 'end', 'goal', 'id', 'it', 'link', 'lk', 'name', 'note', 'rate', 'saldo', 'start', 'tx'], 'Tahap 4e: xlBuildProfile menghasilkan key profil identik desktop');

  w.XLSX = origXlsx;

  // 28. Tahap 5: A1-A5 (Build ID, Status Share Jujur, Timeout Excel, PDF Beranotasi Tautan) + Blok D1-D5 (Bug Desktop & Paritas)
  const fs5 = require('fs');
  const path5 = require('path');
  const { PDFDocument: PDFDoc5, PDFName: PDFName5, PDFArray: PDFArray5, PDFDict: PDFDict5, PDFString: PDFString5 } = require('pdf-lib');

  // A1: Markup & kelas Tahap 4 hadir di index.html, dist/index.html, android assets
  for (const rel of ['index.html', 'dist/index.html', 'android/app/src/main/assets/public/index.html']) {
    const rawH = fs5.readFileSync(path5.join(__dirname, '..', '..', rel), 'utf8');
    assert(rawH.includes('m-btn-trip-share') && rawH.includes('m-sheet-trip-share') && rawH.includes('m-btn-trip-xl') && rawH.includes('m-btn-trip-tpl'), 'A1: aset ' + rel + ' memuat seluruh tombol/sheet Tahap 4');
  }

  // A2: window.RK_BUILD & tampilan Versi build di Pengaturan APK
  assert(w.RK_BUILD && typeof w.RK_BUILD.id === 'string' && w.RK_BUILD.id.length > 0, 'A2: window.RK_BUILD.id tersedia di bundel');
  w.RK_BUILD.id = '77-abc1234';
  w.renderMobSettings();
  assert($('m-set-build-ver') && $('m-set-build-ver').textContent.includes('Versi build: 77-abc1234'), 'A2: Pengaturan APK menampilkan Versi build = window.RK_BUILD.id');

  // A3: Status Bagikan PDF & Template Excel jujur mengikuti rkDownloadBlob().done
  w.MOB_STATE.tripId = 'p-t3';
  w.MOB_STATE.tripView = 'detail';
  w.renderMobTrip();
  click($('m-btn-trip-share'));
  const origDl28 = w.rkDownloadBlob;
  w.rkDownloadBlob = () => ({ ok: true, method: 'share', done: Promise.resolve({ ok: false, method: 'share', cancelled: true }) });
  click($('m-sheet-trip-share').querySelector('[data-msh="pdf"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert(/dibatalkan/i.test($('m-sh-status').textContent) && !/disiapkan/i.test($('m-sh-status').textContent), 'A3: status share dibatalkan tidak menulis disiapkan');
  w.rkDownloadBlob = () => ({ ok: true, method: 'share', done: Promise.resolve({ ok: false, method: 'share', cancelled: false, error: 'Share rejected' }) });
  click($('m-sheet-trip-share').querySelector('[data-msh="pdf"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert(/Gagal/i.test($('m-sh-status').textContent) && /Salin teks/i.test($('m-sh-status').textContent), 'A3: status share gagal mengarahkan ke Salin teks');
  w.rkDownloadBlob = origDl28;
  w.mobCloseSheet('m-sheet-trip-share');

  // A4: Timeout muat pustaka Excel mereset MOB_XL_BUSY dan menampilkan toast error
  const origTimeout28 = w.MOB_XL_LOAD_TIMEOUT_MS;
  const origLoad28 = w.loadXlsx;
  w.MOB_XL_LOAD_TIMEOUT_MS = 30;
  w.loadXlsx = () => new Promise(() => {}); // hang selamanya
  w.MOB_STATE.tripView = 'list';
  w.renderMobTrip();
  click($('m-btn-trip-tpl'));
  await new Promise((r) => setTimeout(r, 70));
  assert(!w.MOB_XL_BUSY && !$('m-btn-trip-tpl').disabled, 'A4: timeout mereset MOB_XL_BUSY dan tombol Excel kembali aktif');
  assert(/Waktu muat|gagal dimuat/i.test($('m-toast-box').textContent), 'A4: timeout menampilkan pesan error yang jelas');
  w.MOB_XL_LOAD_TIMEOUT_MS = origTimeout28;
  w.loadXlsx = origLoad28;

  // A5.vii: tripPdfData mengisi sel tautan {t, href} untuk x.link dan l.url (baik cost=true/false) + memblokir javascript:
  const tripA5 = {
    id: 'p-a5', name: 'Tokyo PDF Link', start: '2026-12-01', end: '2026-12-02', cur: 'JPY', rate: 110,
    dt: { '2026-12-01': 'Hari Pertama' },
    it: [
      { id: 'i1', day: '2026-12-01', time: '09:00', time2: '10:30', place: 'Haneda', est: 1000, fx: true, link: 'https://haneda-airport.jp/en/transport/very-long-path/' + 'sub/'.repeat(12), note: '' },
      { id: 'i2', day: '2026-12-01', time: '12:00', time2: '', place: 'XSS Trap', est: 0, fx: false, link: 'javascript:alert(1)', note: '' },
    ],
    bk: [{ id: 'b1', title: 'Hotel', amt: 2000000, fx: false, link: 'https://tidakboleh-di-pemesanan.id', paid: false }],
    lk: [{ id: 'l1', title: 'Peta Tokyo', url: 'https://tokyometro.jp/en/' }, { id: 'l2', title: 'Link Buruk', url: 'data:text/html,hi' }],
  };
  for (const withCost of [true, false]) {
    const pdfRepA5 = w.tripPdfData(tripA5, withCost);
    const bytesA5 = w.repPdf(pdfRepA5);
    const docA5 = await PDFDoc5.load(new Uint8Array(bytesA5));
    const annots0 = docA5.getPage(0).node.lookupMaybe(PDFName5.of('Annots'), PDFArray5);
    assert(annots0 && annots0.size() >= 3, 'A5.vii (cost=' + withCost + '): PDF perjalanan memuat >= 3 anotasi tautan (termasuk pecahan baris)');
    const uris = [];
    for (let i = 0; i < annots0.size(); i++) {
      const aDict = annots0.lookup(i, PDFDict5);
      const uVal = aDict.lookup(PDFName5.of('A'), PDFDict5).lookup(PDFName5.of('URI'));
      uris.push(uVal instanceof PDFString5 ? uVal.decodeText() : String(uVal));
    }
    assert(uris.every((u) => u.startsWith('https://')), 'A5.vii: hanya URI https yang menjadi anotasi');
    assert(uris.includes('https://tokyometro.jp/en/') && uris.some((u) => u.includes('haneda-airport.jp')), 'A5.vii: x.link & l.url hadir di anotasi PDF');
    assert(!uris.some((u) => u.includes('tidakboleh-di-pemesanan')), 'A5.vii: pemesanan tidak menambah anotasi tautan');
  }

  // D1: Desktop impor Excel berisi yen (fixture sintetis fx:true, cur:'') memunculkan dialog & menghitung dengan kurs
  const fxFixture = JSON.parse(fs5.readFileSync(path5.join(__dirname, '..', 'fixtures', 'xl-sample-fx.json'), 'utf8'));
  const origXlsx28 = w.XLSX;
  w.XLSX = {
    read: () => ({ SheetNames: fxFixture.SheetNames, Sheets: { Itinerary: 'it' } }),
    utils: { sheet_to_json: () => fxFixture.rowsBySheet.Itinerary },
  };
  const dFix = w.xlParse(w.XLSX.read());
  assert(dFix.fx === true && dFix.cur === '', 'D1 fixture: xlParse menghasilkan fx=true dan cur=""');
  // Sebelum fix: yen dianggap rupiah -> 2500000 + 1200 + 1800 = 2503000; dengan JPY rate=110 -> 2500000 + (1200+1800)*110 = 2830000
  const countTripsBefore = Object.keys(w.ALL.kas.pr).length;
  w.setShellMode('browser');
  w.setMode('trip');
  const xlfDesk = $('xlf');
  const fakeFxFile = new w.File([new Uint8Array([1, 2])], 'Tokyo_Sample_Real.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  Object.defineProperty(xlfDesk, 'files', { configurable: true, get: () => [fakeFxFile] });
  fire(xlfDesk, 'change');
  await new Promise((r) => setTimeout(r, 30));
  const deskXlModal = $('modal-trip-xl');
  assert(deskXlModal && !deskXlModal.hidden && deskXlModal.classList.contains('open'), 'D1: file Excel berisi yen membuka modal #modal-trip-xl di desktop');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, countTripsBefore, 'D1: profil TIDAK dibuat sebelum kode mata uang & kurs valid');
  assert.strictEqual($('br-xl-cur').value, 'JPY', 'D1: default kode mata uang JPY');
  $('br-xl-rate').value = '0';
  fire($('trip-xl-form'), 'submit');
  assert($('br-xl-err').textContent === 'Isi kurs: berapa rupiah untuk 1 JPY.' && !deskXlModal.hidden, 'D1: kurs 0 ditolak dengan pesan error identik APK');
  $('br-xl-rate').value = '110';
  fire($('trip-xl-form'), 'submit');
  const d1Trip = Object.values(w.ALL.kas.pr).find((p) => p.name === 'Tokyo Sample Real');
  assert(d1Trip && d1Trip.cur === 'JPY' && d1Trip.rate === 110, 'D1: profil dibuat setelah kurs valid');
  assert.strictEqual(w.tripPlan(d1Trip).t, 2830000, 'D1: total rencana biaya menghitung yen x 110 (2.830.000, bukan 2.503.000)');

  // D1 tanpa fx tetap impor langsung tanpa membuka dialog
  const noFxFile = new w.File([new Uint8Array([1, 2])], 'Bandung_Lokal.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  w.XLSX.utils.sheet_to_json = () => [['Tanggal', 'Jam', 'Keterangan', 'Biaya'], ['2026-06-01', '09.00', 'Kereta Argo', 250000]];
  Object.defineProperty(xlfDesk, 'files', { configurable: true, get: () => [noFxFile] });
  fire(xlfDesk, 'change');
  await new Promise((r) => setTimeout(r, 30));
  assert(deskXlModal.hidden && Object.values(w.ALL.kas.pr).some((p) => p.name === 'Bandung Lokal'), 'D1: Excel tanpa FX tetap impor langsung di desktop');
  w.XLSX = origXlsx28;

  // D2: goalSavedNow batas sebelum bulan pertama, di tengah, setelah bulan terakhir, dan paritas Desktop = APK
  const gD2 = { t: 12000000, s0: 2000000, from: '2026-07', to: '2026-11', per: 2000000, link: true };
  assert.strictEqual(w.goalSavedNow(gD2, '2026-06-15').got, 2000000, 'D2: sebelum bulan pertama -> s0');
  assert.strictEqual(w.goalSavedNow(gD2, '2026-08-20').got, 6000000, 'D2: bulan ke-2 -> s0 + 2*per');
  assert.strictEqual(w.goalSavedNow(gD2, '2027-02-01').got, 12000000, 'D2: lewat bulan akhir -> cap di target t');
  assert.strictEqual(w.goalSavedNow({ t: 5000000, s0: undefined, per: '', from: '2026-07', to: '2026-10' }, '2026-09-01').got, 0, 'D2: s0/per kosong bebas NaN');
  d1Trip.goal = { t: 10000000, s0: 1000000, from: '2026-09', to: '2026-12', per: 2000000, link: true };
  w.__today = '2026-10-15'; // bulan ke-2 -> 1jt + 2*2jt = 5.000.000
  w.setTrip(d1Trip.id);
  w.BR_STATE.tripSubTab = 'sv';
  w.renderTrip();
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = d1Trip.id;
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'sv';
  w.renderMobTrip();
  assert(/5\.000\.000/.test($('trip-root').textContent) && /5\.000\.000/.test($('m-trip-root').textContent), 'D2: Terkumpul desktop & APK sama-sama menghitung akumulasi bulan berjalan (5.000.000)');
  w.__today = '2026-11-12';

  // D3: Tautan berbahaya javascript:/data:/schemeless tidak jadi <a href> di desktop maupun tripPrintHtml
  d1Trip.lk = [
    { id: 'l-ok', title: 'Link Aman', url: 'https://maps.google.com/?q=shibuya' },
    { id: 'l-js', title: 'Evil JS', url: 'javascript:alert(1)' },
    { id: 'l-dt', title: 'Evil Data', url: 'data:text/html,<script>' },
  ];
  w.setShellMode('browser');
  w.BR_STATE.tripSubTab = 'cat';
  w.renderTrip();
  const deskCatH = $('trip-root').innerHTML;
  assert(deskCatH.includes('href="https://maps.google.com/?q=shibuya"') && !deskCatH.includes('href="javascript:') && !deskCatH.includes('href="data:'), 'D3: desktop Tab Catatan hanya merender <a href> untuk http(s)');
  const printH = w.tripPrintHtml({ name: 'Print Test', start: '2026-12-01', end: '2026-12-01', dt: {}, it: [{ day: '2026-12-01', time: '09:00', time2: '', place: 'P', est: 0, link: 'javascript:evil()' }], bk: [], lk: d1Trip.lk }, true);
  assert(printH.includes('<a href="https://maps.google.com/?q=shibuya">') && !printH.includes('href="javascript:') && !printH.includes('href="data:'), 'D3: tripPrintHtml menolak javascript:/data: dari <a href>');

  // D4: Edit pemesanan di desktop mempertahankan pay, link, paid, rec
  d1Trip.bk = [{ id: 'dbk-1', title: 'Hotel Uji', amt: 3000000, fx: false, a: '2026-12-01', b: '2026-12-03', cat: 'Penginapan', pay: 'ic', link: 'https://hotel.example', paid: true, rec: 'rec-desk' }];
  w.BR_STATE.tripSubTab = 'book';
  w.renderTrip();
  click($('trip-root').querySelector('[data-bk-edit="dbk-1"]'));
  $('bk-title').value = 'Hotel Uji Edit';
  $('bk-amt').value = '3500000';
  fire($('trip-book-form'), 'submit');
  const edDeskBk = d1Trip.bk.find((x) => x.id === 'dbk-1');
  assert(edDeskBk.title === 'Hotel Uji Edit' && edDeskBk.pay === 'ic' && edDeskBk.link === 'https://hotel.example' && edDeskBk.paid === true && edDeskBk.rec === 'rec-desk', 'D4: edit pemesanan di desktop mempertahankan pay, link, paid, rec');

  // D5: Validasi b < a (Pemesanan) & end < start / cur invalid / kurs <= 0 (Profil) di desktop dan APK
  // D5(a) Desktop book b < a ditolak
  const bkBeforeD5 = d1Trip.bk.length;
  $('bk-title').value = 'Flight Mundur';
  $('bk-amt').value = '1000000';
  w.BR_STATE.inlineDates.bkStart = '2026-12-05';
  w.BR_STATE.inlineDates.bkEnd = '2026-12-02';
  fire($('trip-book-form'), 'submit');
  assert.strictEqual(d1Trip.bk.length, bkBeforeD5, 'D5a: desktop menolak pemesanan dengan b < a');
  // D5(b) Desktop profil end < start, cur invalid, rate <= 0 ditolak
  const trBeforeD5 = Object.keys(w.ALL.kas.pr).length;
  click($('br-trip-back-list'));
  click($('br-trip-new'));
  $('kp-name').value = 'Trip Invalid';
  w.BR_STATE.inlineDates.kpStart = '2026-12-10';
  w.BR_STATE.inlineDates.kpEnd = '2026-12-05';
  fire($('trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: desktop menolak profil end < start');
  w.BR_STATE.inlineDates.kpEnd = '2026-12-15';
  $('kp-cur').value = 'JP';
  fire($('trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: desktop menolak kode mata uang bukan 3 huruf');
  $('kp-cur').value = 'JPY';
  $('kp-rate').value = '0';
  fire($('trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: desktop menolak kurs <= 0 saat mata uang diisi');
  click($('kpf-cancel'));

  // D5 APK parity (book b < a & profil end < start / cur invalid / rate <= 0)
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = d1Trip.id;
  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  $('m-bk-title').value = 'Flight Mundur APK';
  $('m-bk-amt').value = '1000000';
  $('m-bk-start').value = '2026-12-05';
  $('m-bk-end').value = '2026-12-02';
  fire($('m-trip-book-form'), 'submit');
  assert.strictEqual(d1Trip.bk.length, bkBeforeD5, 'D5a: APK menolak pemesanan dengan b < a');
  click($('m-btn-trip-new-pill'));
  $('m-kp-name').value = 'Trip Invalid APK';
  $('m-kp-start').value = '2026-12-10';
  $('m-kp-end').value = '2026-12-05';
  fire($('m-trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: APK menolak profil end < start');
  $('m-kp-end').value = '2026-12-15';
  $('m-kp-cur').value = 'JP';
  fire($('m-trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: APK menolak kode mata uang bukan 3 huruf');
  $('m-kp-cur').value = 'JPY';
  $('m-kp-rate').value = '';
  fire($('m-trip-meta-form'), 'submit');
  assert.strictEqual(Object.keys(w.ALL.kas.pr).length, trBeforeD5, 'D5b: APK menolak kurs kosong/<=0 saat mata uang diisi');
  w.mobCloseSheet('m-sheet-trip');

  // 29. Tahap 6 Blok B (B1, B2 callers, B3 desktop PDF = APK PDF & fallback, B4 offline Excel import)
  // B1: Awal aplikasi saat rk-mode='trip' & setiap pindah dari mode/tab lain mendarat di 'list' (0, 1, 2+ profil), tanpa mereset render internal
  const tripSrcB1 = fs5.readFileSync(path5.join(__dirname, '..', '..', 'js', 'ui', 'browser-app.js'), 'utf8');
  const mobSrcB1 = fs5.readFileSync(path5.join(__dirname, '..', '..', 'js', 'ui-mobile', 'mobile-app.js'), 'utf8');
  assert(
    /tripView:\s*'list'/.test(tripSrcB1) && /tripView:\s*'list'/.test(mobSrcB1),
    'B1: BR_STATE.tripView dan MOB_STATE.tripView diinisialisasi ke list',
  );
  // Simulasi boot dengan rk-mode='trip' dan rk-trip ada
  w.localStorage.setItem('rk-mode', 'trip');
  w.localStorage.setItem('rk-trip', d1Trip.id);
  w.setShellMode('browser');
  w.setMode('rencana');
  w.BR_STATE.tripView = 'detail';
  w.setMode('trip');
  assert.strictEqual(w.BR_STATE.tripView, 'list', 'B1 desktop: masuk Mode Perjalanan dari mode lain mengatur tripView = list');
  assert($('trip-root').textContent.includes('Semua Perjalanan'), 'B1 desktop: halaman mendarat menampilkan Semua Perjalanan');
  assert.strictEqual(w.localStorage.getItem('rk-trip'), d1Trip.id, 'B1 desktop: rk-trip tetap tersimpan');

  // Buka detail -> render ulang internal (renderTrip, ganti subtab, switcher profil, renderAll) TIDAK reset ke list
  click($('trip-root').querySelector('[data-trip-open="' + d1Trip.id + '"]'));
  assert.strictEqual(w.BR_STATE.tripView, 'detail', 'B1 desktop: membuka profil masuk ke detail');
  w.renderTrip();
  w.renderAll();
  assert.strictEqual(w.BR_STATE.tripView, 'detail', 'B1 desktop: renderTrip/renderAll saat sudah di Mode Perjalanan tidak mereset ke list');
  click($('trip-root').querySelector('[data-triptab="itin"]'));
  assert.strictEqual(w.BR_STATE.tripView, 'detail', 'B1 desktop: ganti subtab tidak mereset ke list');

  // APK: masuk tab Perjalanan dari tab lain -> list (dengan 1 maupun 2+ profil), tanpa reset pada PTR / switcher / subtab
  w.setShellMode('mobile-app');
  w.switchMobileTab('rincian');
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripId = d1Trip.id;
  w.switchMobileTab('trip');
  assert.strictEqual(w.MOB_STATE.tripView, 'list', 'B1 APK: pindah ke tab Perjalanan dari tab lain selalu mendarat di list');
  assert($('m-trip-root').textContent.includes('Semua Perjalanan'), 'B1 APK: menampilkan Semua Perjalanan');
  const firstCardMob = $('m-trip-root').querySelector('[data-mtrip-sel]');
  click(firstCardMob);
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: ketuk kartu masuk ke detail');
  await w.window.rkMobRefresh();
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: Pull-to-Refresh tidak mereset detail ke list');
  w.renderMobTrip();
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: renderMobTrip ulang tidak mereset detail ke list');
  const subCekMob = $('m-trip-root').querySelector('[data-mtripsub="cek"]');
  if (subCekMob) click(subCekMob);
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: ganti subtab tetap di detail');
  const otherChip = $('m-trip-root').querySelector('#m-trip-prof-strip [data-mtrip-sel]:not(.active)');
  if (otherChip) {
    click(otherChip);
    assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: pindah profil lewat switcher tetap di detail');
  }

  // B1: 0 profil dan 1 profil tetap aman di list
  const savedPrB1 = Object.assign({}, w.ALL.kas.pr);
  const oneId = Object.keys(savedPrB1)[0];
  w.ALL.kas.pr = { [oneId]: savedPrB1[oneId] };
  w.switchMobileTab('kas');
  w.switchMobileTab('trip');
  assert.strictEqual(w.MOB_STATE.tripView, 'list', 'B1 APK: 1 profil tetap mendarat di list');
  w.ALL.kas.pr = {};
  w.switchMobileTab('kas');
  w.switchMobileTab('trip');
  assert.strictEqual(w.MOB_STATE.tripView, 'list', 'B1 APK: 0 profil berada di list empty state');
  w.ALL.kas.pr = savedPrB1;

  // B1: boot dengan rk-mode='trip' pada JSDOM baru tetap mendarat di list
  const { JSDOM: JSDOM_B1 } = require('jsdom');
  const htmlB1 = fs5.readFileSync(path5.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link[^>]*href="https?:[^"]*"[^>]*>/g, '');
  const bootDom = new JSDOM_B1(htmlB1, {
    url: 'https://t.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(bw) {
      bw.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      bw.Element.prototype.scrollIntoView = function () {};
      bw.localStorage.setItem('rk-mode', 'trip');
      bw.localStorage.setItem('rk-trip', d1Trip.id);
    },
  });
  await new Promise((res) => setTimeout(res, 200));
  assert.strictEqual(bootDom.window.mode, 'trip', 'B1 boot: mode awal tetap trip');
  assert.strictEqual(bootDom.window.BR_STATE.tripView, 'list', 'B1 boot: rk-mode=trip tetap mendarat di daftar Semua Perjalanan');
  bootDom.window.close();

  // B3: Desktop Simpan PDF identik byte-per-byte dengan APK, tidak memanggil printHtml kecuali cadangan saat error
  w.setShellMode('browser');
  w.setMode('trip');
  w.setTrip(d1Trip.id);
  w.BR_STATE.tripView = 'detail';
  w.renderTrip();
  const deskShareBtnPdf = doc.querySelector('#modal-trip-share [data-sh="pdf"]');
  assert(deskShareBtnPdf && deskShareBtnPdf.textContent.trim() === 'Simpan PDF', 'B3: tombol desktop berlabel Simpan PDF');

  let printFallbackCalls = 0;
  let capturedDesk = null;
  let capturedMob = null;
  const origPrintHtml = w.printHtml;
  const origDlB3 = w.rkDownloadBlob;
  w.printHtml = () => { printFallbackCalls += 1; };
  w.rkDownloadBlob = (fn, data, mime) => {
    capturedDesk = { fn, bytes: Buffer.from(data), mime };
    return { ok: true, method: 'blob', done: Promise.resolve({ ok: true, method: 'blob' }) };
  };
  click($('br-trip-share'));
  $('sh-inc-cost').checked = true;
  click(deskShareBtnPdf);
  await new Promise((r) => setTimeout(r, 20));
  assert(capturedDesk && capturedDesk.bytes.length > 100 && capturedDesk.mime === 'application/pdf', 'B3: desktop Simpan PDF mengunduh PDF via rkDownloadBlob');
  assert.strictEqual(printFallbackCalls, 0, 'B3: desktop Simpan PDF TIDAK memanggil printHtml pada jalur normal');

  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = d1Trip.id;
  w.MOB_STATE.tripView = 'detail';
  w.renderMobTrip();
  w.rkDownloadBlob = (fn, data, mime) => {
    capturedMob = { fn, bytes: Buffer.from(data), mime };
    return { ok: true, method: 'capacitor-share', done: Promise.resolve({ ok: true, method: 'capacitor-share' }) };
  };
  click($('m-btn-trip-share'));
  $('m-sh-inc-cost').checked = true;
  click($('m-sheet-trip-share').querySelector('[data-msh="pdf"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert(capturedMob && capturedDesk.fn === capturedMob.fn && capturedDesk.bytes.equals(capturedMob.bytes), 'B3: PDF Perjalanan desktop dan APK identik byte-per-byte');
  w.mobCloseSheet('m-sheet-trip-share');

  // B3 fallback: bila repPdf melempar galat, desktop jatuh kembali ke printHtml
  w.setShellMode('browser');
  const origRepPdfB3 = w.repPdf;
  w.repPdf = () => { throw new Error('pdf error'); };
  click($('br-trip-share'));
  click(deskShareBtnPdf);
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(printFallbackCalls, 1, 'B3: cadangan printHtml hanya dipakai bila pembuatan PDF melempar galat');
  w.repPdf = origRepPdfB3;
  w.printHtml = origPrintHtml;
  w.rkDownloadBlob = origDlB3;

  // B2 callers: exportFile (doExport) dan downloadRepPdf memakai done jujur
  w.setShellMode('mobile-app');
  w.rkDownloadBlob = () => ({ ok: true, method: 'capacitor-share', done: Promise.resolve({ ok: false, cancelled: true, method: 'capacitor-share' }) });
  w.downloadRepPdf('m');
  await new Promise((r) => setTimeout(r, 20));
  assert(/dibatalkan/i.test($('m-toast-box').textContent || $('xm').textContent || ''), 'B2 caller: downloadRepPdf melaporkan status dibatalkan bila user cancel');
  w.exportFile('tes.json', '{}', 'application/json');
  await new Promise((r) => setTimeout(r, 20));
  assert(/dibatalkan/i.test($('m-toast-box').textContent || $('xm').textContent || ''), 'B2 caller: exportFile melaporkan status dibatalkan bila user cancel');
  w.rkDownloadBlob = origDlB3;

  // B4 & B1 (impor dari luar tab Perjalanan): pesan offline/sinkron vs online + mendarat di detail
  const onLineDesc = Object.getOwnPropertyDescriptor(w.navigator, 'onLine');
  Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => false });
  const origXlsxB4 = w.XLSX;
  const fxFixB4 = JSON.parse(fs5.readFileSync(path5.join(__dirname, '..', 'fixtures', 'xl-sample-fx.json'), 'utf8'));
  w.XLSX = {
    read: () => ({ SheetNames: fxFixB4.SheetNames, Sheets: { Itinerary: 'it' } }),
    utils: { sheet_to_json: () => fxFixB4.rowsBySheet.Itinerary },
  };
  w.switchMobileTab('rincian');
  const xlFileB4 = $('m-xl-file');
  const fileB4 = new w.File([new Uint8Array([1, 2])], 'Trip_Offline_B4.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(xlFileB4, 'files', { configurable: true, get: () => [fileB4] });
  fire(xlFileB4, 'change');
  await new Promise((r) => setTimeout(r, 30));
  $('m-xl-cur').value = 'JPY';
  $('m-xl-rate').value = '115';
  fire($('m-trip-xl-form'), 'submit');
  assert.strictEqual(w.MOB_STATE.tab, 'trip', 'B1 APK: impor Excel dari luar tab pindah ke trip');
  assert.strictEqual(w.MOB_STATE.tripView, 'detail', 'B1 APK: impor Excel mendarat di detail');
  assert(
    $('m-toast-box').textContent.includes('Tersimpan di perangkat. Akan disinkronkan saat online.'),
    'B4 APK offline: pesan impor menyebut tersimpan di perangkat & akan disinkronkan saat online',
  );

  // B4 Desktop offline impor langsung dari mode rencana
  w.setShellMode('browser');
  w.setMode('rencana');
  w.XLSX.utils.sheet_to_json = () => [['Tanggal', 'Jam', 'Keterangan', 'Biaya'], ['2026-07-01', '09.00', 'Kereta', 100000]];
  const deskFileB4 = new w.File([new Uint8Array([1, 2])], 'Desk_Offline_B4.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty($('xlf'), 'files', { configurable: true, get: () => [deskFileB4] });
  fire($('xlf'), 'change');
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(w.mode, 'trip', 'B1 desktop: impor Excel pindah ke mode trip');
  assert.strictEqual(w.BR_STATE.tripView, 'detail', 'B1 desktop: impor Excel dari luar Mode Perjalanan tetap berakhir di detail');
  assert(
    $('ttm').textContent.includes('Tersimpan di perangkat. Akan disinkronkan saat online.'),
    'B4 desktop offline: pesan impor menyebut tersimpan di perangkat & akan disinkronkan saat online',
  );

  // Kembalikan onLine = true -> pesan TIDAK menempelkan kalimat offline bila tidak ada masalah koneksi
  Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => true });
  w.XLSX = {
    read: () => ({ SheetNames: fxFixB4.SheetNames, Sheets: { Itinerary: 'it' } }),
    utils: { sheet_to_json: () => fxFixB4.rowsBySheet.Itinerary },
  };
  w.setShellMode('mobile-app');
  fire(xlFileB4, 'change');
  await new Promise((r) => setTimeout(r, 30));
  $('m-xl-name').value = 'Trip Online B4';
  $('m-xl-cur').value = 'JPY';
  $('m-xl-rate').value = '115';
  fire($('m-trip-xl-form'), 'submit');
  assert(
    !$('m-toast-box').textContent.includes('Akan disinkronkan saat online'),
    'B4 online: pesan impor standar tidak menyebut offline',
  );
  if (onLineDesc) Object.defineProperty(w.navigator, 'onLine', onLineDesc);
  w.XLSX = origXlsxB4;

  // 30. Tahap 6 Blok A (A3 & A4: Kartu Pembaruan Aplikasi di Pengaturan APK)
  w.setShellMode('mobile-app');
  w.switchMobileTab('settings');
  const updCard = $('m-card-settings-update');
  assert(updCard, 'A4: kartu #m-card-settings-update ada di tab Pengaturan APK');
  // Non-native: tampil pesan hanya Android, tanpa tombol Cek pembaruan / Unduh
  assert(/hanya tersedia di aplikasi Android/i.test(updCard.textContent), 'A4 non-native: menampilkan pesan hanya tersedia di aplikasi Android');
  assert(!$('m-btn-check-update') && !$('m-btn-install-update'), 'A4 non-native: tidak menampilkan tombol Cek/Unduh');

  // Native stubs untuk seluruh pengujian A4
  const origCapA4 = w.Capacitor;
  const origFetchA4 = w.fetch;
  const origOpenExtA4 = w.mobOpenExternalUrl;
  const origBuildA4 = Object.assign({}, w.RK_BUILD);
  let openedApkUrls = [];
  let fetchCalls = [];
  w.Capacitor = { isNativePlatform: () => true, Plugins: { Browser: { async open() {} } } };
  w.mobOpenExternalUrl = (url) => {
    openedApkUrls.push(url);
    return true;
  };
  const mkRelJson = (runNo, sha7, msg, dlUrl) => ({
    tag_name: 'apk-latest',
    prerelease: true,
    body: `run=${runNo}\nsha=${sha7}\nversionCode=${runNo}\nbuiltAt=2026-11-20T03:00:00Z\nsha256=deadbeef\nmsg=${msg}`,
    assets: [{ name: `renkeu-${runNo}.apk`, browser_download_url: dlUrl || `https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/apk-latest/renkeu-${runNo}.apk` }],
  });

  // Helper trigger cek pembaruan & tunggu async selesai
  const runCheckWithFetch = async (fnFetch) => {
    fetchCalls = [];
    w.fetch = (url, opts) => {
      fetchCalls.push({ url, opts });
      return fnFetch(url, opts);
    };
    click($('m-btn-check-update'));
    await new Promise((r) => setTimeout(r, 30));
  };

  // Uji tombol nonaktif selama memeriksa + header GET/Accept/no-store/tanpa Authorization/AbortSignal
  w.RK_BUILD.id = '9-oldsha1';
  w.RK_BUILD.run = '9';
  w.RK_BUILD.sha = 'oldsha1';
  w.RK_BUILD.time = '2026-11-19T10:00:00Z';
  w.renderMobSettings();
  assert(updCard.textContent.includes('Versi terpasang:') && updCard.textContent.includes('9-oldsha1'), 'A4: menampilkan Versi terpasang');
  assert($('m-set-build-ver').textContent.includes('Versi build: 9-oldsha1'), 'A4: baris Versi build Tahap 5 tetap lulus');

  let resolveHold;
  w.fetch = (url, opts) => {
    fetchCalls.push({ url, opts });
    return new Promise((r) => { resolveHold = r; });
  };
  click($('m-btn-check-update'));
  assert.strictEqual($('m-btn-check-update').disabled, true, 'A4: tombol Cek pembaruan nonaktif selama memeriksa');
  resolveHold({ ok: true, status: 200, async json() { return mkRelJson(10, 'newsha2', 'Fix PDF <img src=x onerror=alert(1)>'); } });
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual($('m-btn-check-update').disabled, false, 'A4: tombol kembali aktif setelah selesai memeriksa');
  assert.strictEqual(fetchCalls[0].url, 'https://api.github.com/repos/daffagng4-commits/RencanaKeuangan/releases/tags/apk-latest', 'A4: memanggil endpoint releases/tags/apk-latest');
  assert.strictEqual(fetchCalls[0].opts.method, 'GET', 'A4: metode GET');
  assert.strictEqual(fetchCalls[0].opts.cache, 'no-store', 'A4: cache no-store');
  assert.strictEqual(fetchCalls[0].opts.headers.Accept, 'application/vnd.github+json', 'A4: header Accept vnd.github+json');
  assert(!('Authorization' in fetchCalls[0].opts.headers), 'A4: tanpa header Authorization');
  assert(fetchCalls[0].opts.signal, 'A4: memakai AbortController signal untuk timeout 10 dtk');

  // Numerik 9 < 10 -> pembaruan tersedia + escaping XSS + Terakhir dicek tampil
  assert(/Pembaruan tersedia:\s*build\s*10/i.test(updCard.textContent), 'A4: perbandingan numerik 9 < 10 mengenali build 10 lebih baru');
  assert(!updCard.querySelector('img'), 'A4 XSS: HTML dari catatan rilis di-escape, bukan menjadi elemen DOM');
  assert(updCard.textContent.includes('Terakhir dicek:'), 'A4: menampilkan waktu Terakhir dicek');
  assert($('m-btn-install-update'), 'A4: menampilkan tombol Unduh & pasang');

  // Klik Unduh & pasang membuka browser eksternal + menampilkan petunjuk 3 langkah tanpa menyatakan terpasang
  openedApkUrls = [];
  click($('m-btn-install-update'));
  assert.strictEqual(openedApkUrls.length, 1, 'A4: klik Unduh & pasang memanggil mobOpenExternalUrl tepat 1x (tanpa listener ganda)');
  assert.strictEqual(openedApkUrls[0], 'https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/apk-latest/renkeu-10.apk');
  assert(!/berhasil diperbarui|sudah terpasang/i.test(updCard.textContent), 'A4: tidak pernah menyatakan pemasangan berhasil');
  assert(/pasang dari sumber ini/i.test(updCard.textContent), 'A4: menampilkan petunjuk 3 langkah pemasangan');

  // Render ulang berkali-kali tidak menumpuk listener ganda
  w.renderMobSettings();
  w.renderMobSettings();
  openedApkUrls = [];
  click($('m-btn-install-update'));
  assert.strictEqual(openedApkUrls.length, 1, 'A4: renderMobSettings berulang tidak menggandakan listener');

  // URL aset di luar prefiks diizinkan DITOLAK dan mobOpenExternalUrl tidak dipanggil
  await runCheckWithFetch(async () => ({
    ok: true,
    status: 200,
    async json() { return mkRelJson(11, 'evil11', 'Evil APK', 'https://evil.example.com/renkeu.apk'); },
  }));
  openedApkUrls = [];
  if ($('m-btn-install-update')) click($('m-btn-install-update'));
  assert.strictEqual(openedApkUrls.length, 0, 'A4 security: URL di luar prefiks releases/download ditolak & mobOpenExternalUrl tidak dipanggil');
  assert(/tidak valid|ditolak|sumber/i.test(updCard.textContent), 'A4 security: menampilkan pesan galat untuk URL tidak sah');

  // Build terpasang sama & lebih baru dari rilis -> Sudah versi terbaru
  w.RK_BUILD.id = '10-same';
  w.RK_BUILD.run = '10';
  await runCheckWithFetch(async () => ({ ok: true, status: 200, async json() { return mkRelJson(10, 'newsha2', 'Same build'); } }));
  assert(/Sudah versi terbaru/i.test(updCard.textContent) && !$('m-btn-install-update'), 'A4: run 10 == 10 menampilkan Sudah versi terbaru');

  w.RK_BUILD.id = '15-newer';
  w.RK_BUILD.run = '15';
  await runCheckWithFetch(async () => ({ ok: true, status: 200, async json() { return mkRelJson(10, 'newsha2', 'Older release'); } }));
  assert(/Sudah versi terbaru/i.test(updCard.textContent) && !$('m-btn-install-update'), 'A4: run terpasang 15 > 10 menampilkan Sudah versi terbaru');

  // Build lokal dev tanpa nomor versi -> menampilkan Build lokal & boleh cek
  w.RK_BUILD.id = 'dev';
  w.RK_BUILD.run = '';
  w.RK_BUILD.time = 'dev';
  await runCheckWithFetch(async () => ({ ok: true, status: 200, async json() { return mkRelJson(10, 'newsha2', 'Release for dev'); } }));
  assert(updCard.textContent.includes('Build lokal (tidak ada nomor versi)'), 'A4 dev: menampilkan Build lokal (tidak ada nomor versi)');
  assert(/Pembaruan tersedia:\s*build\s*10/i.test(updCard.textContent), 'A4 dev: tetap boleh cek & menawarkan build rilis');

  // Error states: 403, 429, 404, catatan rilis rusak/kosong, timeout, offline
  await runCheckWithFetch(async () => ({ ok: true, status: 200, async json() { return { body: 'not-valid-notes', assets: [] }; } }));
  assert(/tidak dapat dibaca|rusak/i.test(updCard.textContent), 'A4 error: catatan rilis rusak/kosong ditangani jelas');

  for (const st of [403, 429]) {
    await runCheckWithFetch(async () => ({ ok: false, status: st, async json() { return {}; } }));
    assert(/batas laju|403|429/i.test(updCard.textContent), 'A4 error: HTTP ' + st + ' menyebut batas laju');
  }

  await runCheckWithFetch(async () => ({ ok: false, status: 404, async json() { return {}; } }));
  assert(/404|privat|tidak ditemukan/i.test(updCard.textContent), 'A4 error: HTTP 404 menyebut rilis tidak ada / repo privat');

  await runCheckWithFetch(async () => {
    const ae = new Error('Aborted');
    ae.name = 'AbortError';
    throw ae;
  });
  assert(/waktu|timeout|koneksi/i.test(updCard.textContent), 'A4 error: AbortError timeout menampilkan pesan jelas');

  const onLineDescA4 = Object.getOwnPropertyDescriptor(w.navigator, 'onLine');
  Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => false });
  await runCheckWithFetch(async () => { throw new TypeError('Failed to fetch'); });
  assert(/offline|koneksi|jaringan/i.test(updCard.textContent), 'A4 error: offline/jaringan gagal menampilkan pesan jelas');
  if (onLineDescA4) Object.defineProperty(w.navigator, 'onLine', onLineDescA4);

  // Pemeriksaan otomatis saat aplikasi dibuka (dibatasi 6 jam, gagal diam-diam, titik penanda + 1 toast bila ada update)
  w.localStorage.removeItem('rk-apk-last-check');
  w.RK_BUILD.id = '9-old';
  w.RK_BUILD.run = '9';
  // Gagal diam-diam saat network error
  fetchCalls = [];
  w.fetch = async () => { throw new Error('silent net fail'); };
  $('m-toast-box').innerHTML = '';
  await w.rkAutoCheckApkUpdate(true);
  assert.strictEqual($('m-toast-box').textContent.trim(), '', 'A4 auto-check: gagal diam-diam tanpa toast error');

  // Auto-check kedua dalam < 6 jam TIDAK memanggil fetch ulang (throttle)
  fetchCalls = [];
  w.fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    return { ok: true, status: 200, async json() { return mkRelJson(12, 'sha12', 'New v12'); } };
  };
  await w.rkAutoCheckApkUpdate();
  assert.strictEqual(fetchCalls.length, 0, 'A4 auto-check: dibatasi maksimal 1x per 6 jam');

  // Simulasikan > 6 jam berlalu -> auto-check memanggil fetch, menyalakan titik penanda, dan 1 toast update
  w.localStorage.setItem('rk-apk-last-check', String(Date.now() - 7 * 3600 * 1000));
  $('m-toast-box').innerHTML = '';
  await w.rkAutoCheckApkUpdate();
  assert.strictEqual(fetchCalls.length, 1, 'A4 auto-check: berjalan lagi setelah > 6 jam');
  assert($('m-upd-dot') && $('m-upd-dot').style.display !== 'none', 'A4: titik penanda di entri Pengaturan menyala bila ada pembaruan');
  assert(/build\s*12|pembaruan/i.test($('m-toast-box').textContent), 'A4 auto-check: 1 toast singkat tampil bila ada pembaruan');

  // Kembalikan stub A4
  w.Capacitor = origCapA4;
  w.fetch = origFetchA4;
  w.mobOpenExternalUrl = origOpenExtA4;
  Object.assign(w.RK_BUILD, origBuildA4);

  // 31. Tahap 7 (Khusus APK: unduh in-app + progress bar tanpa remount DOM + SHA-256 + ApkInstaller + cadangan)
  const nodeCrypto31 = require('crypto');
  const sampleApkBytes = Uint8Array.from({ length: 2048 }, (_, i) => (i * 17 + 3) & 255);
  const sampleApkB64 = Buffer.from(sampleApkBytes).toString('base64');
  const sampleApkSha256 = nodeCrypto31.createHash('sha256').update(sampleApkBytes).digest('hex');

  const origCap31 = w.Capacitor;
  const origCrypto31 = w.crypto;
  const origCopyText31 = w.copyText;
  const origOpenExt31 = w.mobOpenExternalUrl;
  const origStallMs31 = w.RK_UPDATE_STALL_MS;
  const origBuild31 = Object.assign({}, w.RK_BUILD);

  let capLog31 = [];
  let progListener31 = null;
  let progRemovedCount31 = 0;
  let appStateListeners31 = [];
  let dlBehavior31 = 'ok';
  let dlPendingResolve31 = null;
  let allowInstall31 = true;
  let copiedUrls31 = [];
  let extOpened31 = [];
  let pluginAvail31 = { Filesystem: true, ApkInstaller: true, Browser: true, App: true };

  w.copyText = async (txt) => {
    copiedUrls31.push(txt);
  };
  w.mobOpenExternalUrl = (u) => {
    extOpened31.push(u);
    return true;
  };
  Object.defineProperty(w, 'crypto', {
    configurable: true,
    value: { subtle: nodeCrypto31.webcrypto.subtle },
  });
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (name) => !!pluginAvail31[name],
    Plugins: {
      Browser: { async open(opts) { capLog31.push(['Browser.open', opts]); } },
      App: {
        addListener(ev, fn) {
          capLog31.push(['App.addListener', ev]);
          if (ev === 'appStateChange') appStateListeners31.push(fn);
          return Promise.resolve({ remove() {} });
        },
      },
      Filesystem: {
        async mkdir(opts) { capLog31.push(['Filesystem.mkdir', opts]); },
        async readdir(opts) {
          capLog31.push(['Filesystem.readdir', opts]);
          return { files: [{ name: 'renkeu-9.apk', type: 'file' }] };
        },
        async deleteFile(opts) { capLog31.push(['Filesystem.deleteFile', opts]); },
        async readFile(opts) {
          capLog31.push(['Filesystem.readFile', opts]);
          return { data: dlBehavior31 === 'bad-hash' ? Buffer.from([1, 2, 3, 4]).toString('base64') : sampleApkB64 };
        },
        addListener(ev, fn) {
          capLog31.push(['Filesystem.addListener', ev]);
          if (ev === 'progress') progListener31 = fn;
          return Promise.resolve({
            remove() {
              progRemovedCount31 += 1;
              capLog31.push(['Filesystem.removeListener']);
            },
          });
        },
        downloadFile(opts) {
          capLog31.push(['Filesystem.downloadFile', opts]);
          if (dlBehavior31 === 'reject') return Promise.reject(new Error('Koneksi terputus'));
          if (dlBehavior31 === 'hang') return new Promise((r) => { dlPendingResolve31 = r; });
          return new Promise((r) => {
            dlPendingResolve31 = () => r({ path: '/cache/' + opts.path });
          });
        },
      },
      ApkInstaller: {
        async canInstall() {
          capLog31.push(['ApkInstaller.canInstall']);
          return { allowed: allowInstall31 };
        },
        async openInstallSettings() {
          capLog31.push(['ApkInstaller.openInstallSettings']);
        },
        async install(opts) {
          capLog31.push(['ApkInstaller.install', opts]);
        },
      },
    },
  };

  w.setShellMode('mobile-app');
  w.switchMobileTab('settings');
  w.RK_BUILD.id = '9-oldsha1';
  w.RK_BUILD.run = '9';
  const rel10 = {
    run: 10,
    sha: 'newsha10',
    versionCode: 10,
    builtAt: '2026-11-20T05:00:00Z',
    sha256: sampleApkSha256,
    msg: 'Tahap 7 In-App Updater',
    assetName: 'renkeu-10.apk',
    url: 'https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/apk-latest/renkeu-10.apk',
  };
  const resetToAvailable31 = () => {
    capLog31 = [];
    copiedUrls31 = [];
    extOpened31 = [];
    progListener31 = null;
    progRemovedCount31 = 0;
    dlBehavior31 = 'ok';
    allowInstall31 = true;
    pluginAvail31 = { Filesystem: true, ApkInstaller: true, Browser: true, App: true };
    w.MOB_UPDATE_STATE.status = 'available';
    w.MOB_UPDATE_STATE.checking = false;
    w.MOB_UPDATE_STATE.phase = 'idle';
    w.MOB_UPDATE_STATE.message = '';
    w.MOB_UPDATE_STATE.info = Object.assign({}, rel10);
    w.MOB_UPDATE_STATE.downloadedPath = '';
    w.MOB_UPDATE_STATE.downloadedRun = 0;
    w.MOB_UPDATE_STATE.unverifiedNote = '';
    w.renderMobUpdateCard();
  };

  // (1) Unduhan sukses dgn event progres, identitas DOM #m-upd-prog-fill TIDAK diganti, ketukan ganda diabaikan, hash cocok -> install dipanggil
  resetToAvailable31();
  const dlProm1 = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  // Ketukan ganda saat downloading diabaikan
  click($('m-card-settings-update'));
  w.rkInstallApkInApp();
  const fillNodeStart = $('m-upd-prog-fill');
  const trackStart = $('m-upd-prog-track');
  assert(fillNodeStart && trackStart, '31.1: progress bar node dirender saat downloading');
  assert.strictEqual(trackStart.getAttribute('role'), 'progressbar', '31.1: role="progressbar" ada');
  assert.ok(trackStart.classList.contains('is-indeterminate'), '31.2: awal tanpa contentLength masuk keadaan tak-tentu (.is-indeterminate)');
  assert.ok(!String($('m-upd-prog-text').textContent).includes('NaN'), '31.2: teks indeterminate bebas NaN%');

  // Kirim event progres 50% -> tunggu >110ms -> kirim 100%, pastikan node #m-upd-prog-fill tetap node yg sama (===)
  assert(progListener31, '31.1: listener progress Filesystem terdaftar');
  progListener31({ url: rel10.url, bytes: 500000, contentLength: 1000000 });
  assert.strictEqual($('m-upd-prog-fill'), fillNodeStart, '31.1: update progres pertama TIDAK mengganti node DOM #m-upd-prog-fill');
  assert.strictEqual($('m-upd-prog-track').getAttribute('aria-valuenow'), '50', '31.1: aria-valuenow=50');
  assert(/50%/.test($('m-upd-prog-text').textContent), '31.1: teks progres memuat 50%');
  await new Promise((r) => setTimeout(r, 120));
  progListener31({ url: rel10.url, bytes: 1000000, contentLength: 1000000 });
  assert.strictEqual($('m-upd-prog-fill'), fillNodeStart, '31.1: update progres lanjutan TIDAK mengganti node DOM #m-upd-prog-fill');
  assert.strictEqual($('m-upd-prog-track').getAttribute('aria-valuenow'), '100', '31.1: aria-valuenow=100');

  dlPendingResolve31();
  await dlProm1;
  const mkdirIdx = capLog31.findIndex((x) => x[0] === 'Filesystem.mkdir');
  const dlCalls31 = capLog31.filter((x) => x[0] === 'Filesystem.downloadFile');
  assert.strictEqual(dlCalls31.length, 1, '31.8: ketukan ganda saat downloading tidak memanggil downloadFile ke-2 kali');
  assert.ok(mkdirIdx >= 0 && mkdirIdx < capLog31.findIndex((x) => x[0] === 'Filesystem.downloadFile'), '31.1: mkdir rk-update dipanggil sebelum downloadFile');
  assert.strictEqual(dlCalls31[0][1].directory, 'CACHE');
  assert.strictEqual(dlCalls31[0][1].path, 'rk-update/renkeu-10.apk');
  assert.strictEqual(dlCalls31[0][1].progress, true);
  assert.strictEqual(dlCalls31[0][1].connectTimeout, 15000);
  assert.strictEqual(dlCalls31[0][1].readTimeout, 30000);
  assert.strictEqual(progRemovedCount31, 1, '31.1: listener progress selalu dihapus (.remove()) setelah selesai');
  const instCall31 = capLog31.find((x) => x[0] === 'ApkInstaller.install');
  assert(instCall31 && instCall31[1].path === 'rk-update/renkeu-10.apk', '31.2: hash cocok memanggil ApkInstaller.install dengan path relatif tepat');
  assert($('m-card-settings-update').textContent.includes('Pemasang Android dibuka. Ketuk Pasang.'), '31.2: status jujur setelah install dipanggil');

  // (3) Hash TIDAK cocok -> berkas dihapus, install TIDAK dipanggil, tombol cadangan tampil
  resetToAvailable31();
  dlBehavior31 = 'bad-hash';
  const badHashProm = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  dlPendingResolve31();
  await badHashProm;
  assert.ok(capLog31.some((x) => x[0] === 'Filesystem.deleteFile' && x[1].path === 'rk-update/renkeu-10.apk'), '31.2: hash tidak cocok menghapus berkas APK');
  assert.ok(!capLog31.some((x) => x[0] === 'ApkInstaller.install'), '31.2: hash tidak cocok TIDAK memanggil ApkInstaller.install');
  assert($('m-btn-open-browser-update') && $('m-btn-copy-update-url'), '31.2: tombol cadangan muncul saat hash gagal');

  // (4) Tanpa sha256 dan tanpa crypto.subtle -> tetap lanjut install dengan keterangan "tidak diverifikasi"
  resetToAvailable31();
  w.MOB_UPDATE_STATE.info.sha256 = '';
  const noShaProm = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  dlPendingResolve31();
  await noShaProm;
  assert.ok(capLog31.some((x) => x[0] === 'ApkInstaller.install'), '31.3: tanpa sha256 tetap melanjutkan install');
  assert(/tidak diverifikasi/i.test($('m-card-settings-update').textContent), '31.3: tanpa sha256 mencantumkan "tidak diverifikasi"');

  resetToAvailable31();
  Object.defineProperty(w, 'crypto', { configurable: true, value: undefined });
  const noSubtleProm = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  dlPendingResolve31();
  await noSubtleProm;
  assert.ok(capLog31.some((x) => x[0] === 'ApkInstaller.install'), '31.3: tanpa crypto.subtle tetap melanjutkan install');
  assert(/tidak diverifikasi/i.test($('m-card-settings-update').textContent), '31.3: tanpa crypto.subtle mencantumkan "tidak diverifikasi"');
  Object.defineProperty(w, 'crypto', { configurable: true, value: { subtle: nodeCrypto31.webcrypto.subtle } });

  // (5) canInstall false -> status "Perlu izin", tidak mengunduh ulang; setelah true -> install dipanggil (baik tombol Pasang & appStateChange)
  resetToAvailable31();
  allowInstall31 = false;
  const permProm = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  dlPendingResolve31();
  await permProm;
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'need-permission', '31.4: phase menjadi need-permission');
  assert(/Perlu izin/i.test($('m-card-settings-update').textContent), '31.4: status menyebut Perlu izin');
  assert($('m-btn-perm-update') && $('m-btn-retry-install-update'), '31.4: tombol pengaturan izin dan Pasang tampil');
  click($('m-btn-perm-update'));
  assert.ok(capLog31.some((x) => x[0] === 'ApkInstaller.openInstallSettings'), '31.4: tombol pengaturan memanggil openInstallSettings');
  allowInstall31 = true;
  if (appStateListeners31.length) {
    appStateListeners31[appStateListeners31.length - 1]({ isActive: true });
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'ready', '31.4: appStateChange kembali aktif mengecek ulang canInstall dan memindahkan phase ke ready');
  }
  const dlCountBeforeRetry = capLog31.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  click($('m-btn-retry-install-update'));
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(capLog31.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlCountBeforeRetry, '31.4: Pasang ulang setelah izin TIDAK mengunduh ulang berkas');
  assert.ok(capLog31.some((x) => x[0] === 'ApkInstaller.install'), '31.4: setelah izin true memanggil ApkInstaller.install');

  // (6) Plugin tidak tersedia -> jalur lama mobOpenExternalUrl + validasi prefiks
  resetToAvailable31();
  pluginAvail31.ApkInstaller = false;
  click($('m-btn-install-update'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(capLog31.filter((x) => x[0] === 'Filesystem.downloadFile').length, 0, '31.5: jika plugin tidak tersedia, tidak memanggil downloadFile');
  assert.deepStrictEqual(extOpened31, [rel10.url], '31.5: fallback ke jalur browser mobOpenExternalUrl(info.url)');

  // (7) Prefiks URL tidak valid ditolak SEBELUM downloadFile
  resetToAvailable31();
  w.MOB_UPDATE_STATE.info.url = 'https://evil.example.com/renkeu-10.apk';
  const badUrlRes = await w.rkInstallApkInApp();
  assert.strictEqual(badUrlRes, false, '31.6: URL di luar prefiks ditolak');
  assert.strictEqual(capLog31.filter((x) => x[0] === 'Filesystem.downloadFile').length, 0, '31.6: downloadFile tidak dipanggil untuk URL tidak valid');

  // (8) Galat downloadFile + Salin tautan + Watchdog macet
  resetToAvailable31();
  dlBehavior31 = 'reject';
  await w.rkInstallApkInApp();
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'error', '31.7: error downloadFile mengubah phase menjadi error');
  assert($('m-btn-open-browser-update') && $('m-btn-copy-update-url'), '31.7: tombol cadangan browser & salin tautan tampil saat galat');
  click($('m-btn-copy-update-url'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepStrictEqual(copiedUrls31, [rel10.url], '31.7: Salin tautan menyalin info.url');
  assert.ok($('m-toast-box').textContent.includes('Tautan disalin. Tempel di Chrome/Brave.'), '31.7: toast konfirmasi salin tautan tampil');

  resetToAvailable31();
  dlBehavior31 = 'hang';
  w.RK_UPDATE_STALL_MS = 40;
  w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 85));
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'stalled', '31.7: watchdog macet mengubah phase ke stalled');
  assert(/Unduhan tersendat/i.test($('m-card-settings-update').textContent), '31.7: status menyebut Unduhan tersendat');
  assert($('m-btn-open-browser-update') && $('m-btn-copy-update-url'), '31.7: cadangan browser & salin tautan tampil saat macet');

  // (9) Navigasi pindah tab di tengah unduhan tidak error + re-render kartu memulihkan keadaan
  resetToAvailable31();
  const navProm = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 20));
  w.switchMobileTab('rincian');
  progListener31({ url: rel10.url, bytes: 250000, contentLength: 1000000 });
  w.switchMobileTab('settings');
  assert.ok($('m-upd-prog-fill') && $('m-upd-prog-track').getAttribute('aria-valuenow') === '25', '31.8: kembali ke Pengaturan memulihkan progress bar 25%');
  dlPendingResolve31();
  await navProm;

  // (10) Non-native tidak berubah
  w.Capacitor = { isNativePlatform: () => false };
  w.renderMobUpdateCard();
  assert.ok(/Pembaruan hanya tersedia di aplikasi Android/.test($('m-card-settings-update').textContent) && !$('m-btn-check-update') && !$('m-btn-install-update'), '31.9: jalur non-native tetap persis sama tanpa tombol');

  // Pulihkan stub Tahap 7
  w.Capacitor = origCap31;
  Object.defineProperty(w, 'crypto', { configurable: true, value: origCrypto31 });
  w.copyText = origCopyText31;
  w.mobOpenExternalUrl = origOpenExt31;
  w.RK_UPDATE_STALL_MS = origStallMs31;
  Object.assign(w.RK_BUILD, origBuild31);

  // 32. Tahap 7.1 (Hotfix kekokohan pembaruan APK in-app: C1, C2, C3, C5)
  const origCap32 = w.Capacitor;
  const origFetch32 = w.fetch;
  const origCrypto32 = w.crypto;
  const origCopyText32 = w.copyText;
  const origOpenExt32 = w.mobOpenExternalUrl;
  const origStallMs32 = w.RK_UPDATE_STALL_MS;
  const origBuild32 = Object.assign({}, w.RK_BUILD);

  const mkRel32 = (runNo, shaHex) => ({
    run: runNo,
    sha: 'sha' + runNo,
    versionCode: runNo,
    builtAt: '2026-11-20T06:00:00Z',
    sha256: shaHex || sampleApkSha256,
    msg: 'Release ' + runNo,
    assetName: 'renkeu-' + runNo + '.apk',
    url: 'https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/apk-latest/renkeu-' + runNo + '.apk',
  });
  const mkApiRel32 = (relObj) => ({
    tag_name: 'apk-latest',
    prerelease: true,
    body: [
      'run=' + relObj.run,
      'sha=' + relObj.sha,
      'versionCode=' + relObj.versionCode,
      'builtAt=' + relObj.builtAt,
      'sha256=' + relObj.sha256,
      'msg=' + relObj.msg,
    ].join('\n'),
    assets: [{ name: relObj.assetName, browser_download_url: relObj.url }],
  });

  const rel10_32 = mkRel32(10, sampleApkSha256);
  const rel11_32 = mkRel32(11, sampleApkSha256);

  let capLog32 = [];
  let fetchCalls32 = [];
  let nextApiRel32 = rel10_32;
  let dlMode32 = 'manual'; // 'manual' | 'instant' | 'reject'
  let dlHandles32 = [];
  let allowInstall32 = true;
  let installRejectMsg32 = '';
  let readdirFiles32 = [];
  let readdirReject32 = false;
  let deleteReject32 = false;

  Object.defineProperty(w, 'crypto', {
    configurable: true,
    value: { subtle: nodeCrypto31.webcrypto.subtle },
  });
  w.copyText = async () => {};
  w.mobOpenExternalUrl = () => true;
  w.fetch = (url, opts) => {
    fetchCalls32.push({ url, opts });
    return Promise.resolve({
      ok: true,
      status: 200,
      async json() { return mkApiRel32(nextApiRel32); },
    });
  };
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
    Plugins: {
      Browser: { async open(opts) { capLog32.push(['Browser.open', opts]); } },
      App: { addListener() { return Promise.resolve({ remove() {} }); } },
      Filesystem: {
        async mkdir(opts) { capLog32.push(['Filesystem.mkdir', opts]); },
        async readdir(opts) {
          capLog32.push(['Filesystem.readdir', opts]);
          if (readdirReject32) throw new Error('readdir gagal');
          return { files: readdirFiles32 };
        },
        async deleteFile(opts) {
          capLog32.push(['Filesystem.deleteFile', opts]);
          if (deleteReject32) throw new Error('deleteFile gagal');
        },
        async readFile(opts) {
          capLog32.push(['Filesystem.readFile', opts]);
          return { data: sampleApkB64 };
        },
        addListener(ev, fn) {
          capLog32.push(['Filesystem.addListener', ev]);
          return Promise.resolve({ remove() {} });
        },
        downloadFile(opts) {
          capLog32.push(['Filesystem.downloadFile', opts]);
          if (dlMode32 === 'reject') return Promise.reject(new Error('Network down'));
          if (dlMode32 === 'instant') return Promise.resolve({ path: '/cache/' + opts.path });
          return new Promise((resolve, reject) => {
            dlHandles32.push({ opts, resolve: () => resolve({ path: '/cache/' + opts.path }), reject });
          });
        },
      },
      ApkInstaller: {
        async canInstall() {
          capLog32.push(['ApkInstaller.canInstall']);
          return { allowed: allowInstall32 };
        },
        async openInstallSettings() {
          capLog32.push(['ApkInstaller.openInstallSettings']);
        },
        async install(opts) {
          capLog32.push(['ApkInstaller.install', opts]);
          if (installRejectMsg32) throw new Error(installRejectMsg32);
        },
      },
    },
  };

  w.setShellMode('mobile-app');
  w.switchMobileTab('settings');

  const resetState32 = () => {
    capLog32 = [];
    fetchCalls32 = [];
    dlHandles32 = [];
    dlMode32 = 'instant';
    allowInstall32 = true;
    installRejectMsg32 = '';
    readdirFiles32 = [];
    readdirReject32 = false;
    deleteReject32 = false;
    nextApiRel32 = rel10_32;
    w.RK_BUILD.id = '9-oldsha1';
    w.RK_BUILD.run = '9';
    w.MOB_UPDATE_STATE.checking = false;
    w.MOB_UPDATE_STATE.status = 'available';
    w.MOB_UPDATE_STATE.phase = 'idle';
    w.MOB_UPDATE_STATE.message = '';
    w.MOB_UPDATE_STATE.info = Object.assign({}, rel10_32);
    w.MOB_UPDATE_STATE.showSteps = false;
    w.MOB_UPDATE_STATE.downloadedPath = '';
    w.MOB_UPDATE_STATE.downloadedRun = 0;
    w.MOB_UPDATE_STATE.unverifiedNote = '';
    w.renderMobUpdateCard();
  };

  // --- C1: Cek pembaruan mempertahankan unduhan yang cocok & melewati fase sibuk ---
  resetState32();
  w.MOB_UPDATE_STATE.phase = 'ready';
  w.MOB_UPDATE_STATE.downloadedPath = 'rk-update/renkeu-10.apk';
  w.MOB_UPDATE_STATE.downloadedRun = 10;
  w.MOB_UPDATE_STATE.message = 'Pemasang Android dibuka. Ketuk Pasang.';
  w.renderMobUpdateCard();
  await w.rkCheckApkUpdate({ silent: false });
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'ready', '32.C1: phase=ready dipertahankan saat run sama');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, 'rk-update/renkeu-10.apk', '32.C1: downloadedPath dipertahankan saat run sama');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedRun, 10, '32.C1: downloadedRun dipertahankan saat run sama');
  assert.strictEqual(w.MOB_UPDATE_STATE.message, 'Pemasang Android dibuka. Ketuk Pasang.', '32.C1: pesan siap pasang bertahan');
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, 0, '32.C1: tidak mengunduh ulang');
  assert.ok($('m-btn-retry-install-update'), '32.C1: tombol Pasang tetap tersedia setelah Cek pembaruan');

  // need-permission juga bertahan saat run sama
  w.MOB_UPDATE_STATE.phase = 'need-permission';
  w.MOB_UPDATE_STATE.message = 'Perlu izin pasang.';
  await w.rkCheckApkUpdate({ silent: false });
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'need-permission', '32.C1: phase=need-permission dipertahankan saat run sama');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, 'rk-update/renkeu-10.apk', '32.C1: downloadedPath bertahan di need-permission');

  // Rilis lebih baru (run 11 > downloadedRun 10) mereset berkas unduhan lama
  nextApiRel32 = rel11_32;
  await w.rkCheckApkUpdate({ silent: false });
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'idle', '32.C1: rilis lebih baru mereset phase ke idle');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, '', '32.C1: rilis lebih baru mengosongkan downloadedPath');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedRun, 0, '32.C1: rilis lebih baru mereset downloadedRun');
  assert.strictEqual(w.MOB_UPDATE_STATE.status, 'available', '32.C1: status menjadi available untuk rilis 11');
  assert.strictEqual(w.MOB_UPDATE_STATE.info.run, 11, '32.C1: info menunjuk rilis 11');

  // Sudah terbaru (latest) ikut mereset unduhan lama
  nextApiRel32 = rel10_32;
  w.RK_BUILD.run = '10';
  w.MOB_UPDATE_STATE.phase = 'ready';
  w.MOB_UPDATE_STATE.downloadedPath = 'rk-update/renkeu-10.apk';
  w.MOB_UPDATE_STATE.downloadedRun = 10;
  await w.rkCheckApkUpdate({ silent: false });
  assert.strictEqual(w.MOB_UPDATE_STATE.status, 'latest', '32.C1: status latest ketika RK_BUILD.run >= release.run');
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'idle', '32.C1: status latest mereset phase ke idle');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, '', '32.C1: status latest mengosongkan downloadedPath');

  // Fase sibuk (downloading / verifying / installing) melewati cek manual, silent, & auto-check tanpa menyentuh fetch/state
  w.RK_BUILD.run = '9';
  for (const busyPh of ['downloading', 'verifying', 'installing']) {
    w.MOB_UPDATE_STATE.phase = busyPh;
    w.MOB_UPDATE_STATE.checking = false;
    w.MOB_UPDATE_STATE.downloadedPath = 'rk-update/renkeu-10.apk';
    w.MOB_UPDATE_STATE.downloadedRun = 10;
    w.MOB_UPDATE_STATE.message = 'status ' + busyPh;
    fetchCalls32 = [];
    w.localStorage.setItem('rk-apk-last-check', String(Date.now() - 8 * 3600 * 1000));
    const rMan = await w.rkCheckApkUpdate({ silent: false });
    const rSil = await w.rkCheckApkUpdate({ silent: true });
    const rAuto = await w.rkAutoCheckApkUpdate(true);
    assert.strictEqual(rMan, null, '32.C1: manual check mengembalikan null saat ' + busyPh);
    assert.strictEqual(rSil, null, '32.C1: silent check mengembalikan null saat ' + busyPh);
    assert.strictEqual(rAuto, null, '32.C1: auto-check mengembalikan null saat ' + busyPh);
    assert.strictEqual(fetchCalls32.length, 0, '32.C1: fetch tidak dipanggil saat ' + busyPh);
    assert.strictEqual(w.MOB_UPDATE_STATE.phase, busyPh, '32.C1: phase tidak berubah saat ' + busyPh);
    assert.strictEqual(w.MOB_UPDATE_STATE.checking, false, '32.C1: checking tetap false saat ' + busyPh);
    assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, 'rk-update/renkeu-10.apk', '32.C1: downloadedPath tetap utuh saat ' + busyPh);
    assert.strictEqual(w.MOB_UPDATE_STATE.message, 'status ' + busyPh, '32.C1: message tidak disentuh saat ' + busyPh);
  }

  // --- C2: Galat pemasang setelah unduhan sukses menawarkan Coba pasang lagi & Unduh ulang ---
  resetState32();
  dlMode32 = 'instant';
  installRejectMsg32 = 'Gagal membuka pemasang APK';
  await w.rkInstallApkInApp();
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'error', '32.C2: phase menjadi error saat install gagal');
  assert.ok(w.MOB_UPDATE_STATE.downloadedPath, '32.C2: downloadedPath tetap terisi setelah install gagal');
  assert.ok($('m-btn-retry-install-update'), '32.C2: tombol #m-btn-retry-install-update muncul saat install gagal');
  assert.strictEqual($('m-btn-retry-install-update').textContent.trim(), 'Coba pasang lagi', '32.C2: label tombol utama Coba pasang lagi');
  assert.ok($('m-btn-install-update'), '32.C2: tombol sekunder #m-btn-install-update muncul');
  assert.strictEqual($('m-btn-install-update').textContent.trim(), 'Unduh ulang', '32.C2: label tombol sekunder Unduh ulang');
  assert.ok($('m-btn-open-browser-update') && $('m-btn-copy-update-url'), '32.C2: tombol cadangan browser & salin tautan tetap ada');

  installRejectMsg32 = '';
  const dlBeforeRetryC2 = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  const instBeforeRetryC2 = capLog32.filter((x) => x[0] === 'ApkInstaller.install').length;
  click($('m-btn-retry-install-update'));
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlBeforeRetryC2, '32.C2: Coba pasang lagi TIDAK memanggil downloadFile');
  assert.strictEqual(capLog32.filter((x) => x[0] === 'ApkInstaller.install').length, instBeforeRetryC2 + 1, '32.C2: Coba pasang lagi memanggil ApkInstaller.install');
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'ready', '32.C2: pemasangan ulang berhasil masuk phase=ready');

  // Pemanggilan rkInstallApkInApp() di fase error dgn downloadedPath ada -> langsung pasang tanpa unduh ulang
  installRejectMsg32 = 'Pemasang ditutup sementara';
  await w.rkLaunchApkInstall();
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'error', '32.C2: masuk phase=error lagi');
  installRejectMsg32 = '';
  const dlBeforeDirectC2 = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  const instBeforeDirectC2 = capLog32.filter((x) => x[0] === 'ApkInstaller.install').length;
  await w.rkInstallApkInApp();
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlBeforeDirectC2, '32.C2: rkInstallApkInApp() dari error+downloadedPath tidak mengunduh ulang');
  assert.strictEqual(capLog32.filter((x) => x[0] === 'ApkInstaller.install').length, instBeforeDirectC2 + 1, '32.C2: rkInstallApkInApp() langsung memanggil install');

  // Klik tombol Unduh ulang (dan opsi { force: true }) -> mengunduh ulang berkas
  installRejectMsg32 = 'Gagal sementara';
  await w.rkLaunchApkInstall();
  installRejectMsg32 = '';
  const dlBeforeForceBtnC2 = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  click($('m-btn-install-update'));
  await new Promise((r) => setTimeout(r, 35));
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlBeforeForceBtnC2 + 1, '32.C2: mengetuk Unduh ulang memanggil downloadFile');

  const dlBeforeForceOptC2 = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  await w.rkInstallApkInApp({ force: true });
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlBeforeForceOptC2 + 1, '32.C2: rkInstallApkInApp({ force: true }) mengunduh ulang');

  // Galat "Berkas APK tidak ditemukan" membersihkan downloadedPath/downloadedRun -> ketukan berikutnya mengunduh ulang
  installRejectMsg32 = 'Berkas APK tidak ditemukan';
  await w.rkLaunchApkInstall();
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'error', '32.C2: galat berkas hilang tetap masuk phase=error');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, '', '32.C2: galat berkas tidak ditemukan mengosongkan downloadedPath');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedRun, 0, '32.C2: galat berkas tidak ditemukan mereset downloadedRun');
  assert.ok(!$('m-btn-retry-install-update'), '32.C2: tombol Coba pasang lagi disembunyikan bila berkas hilang');
  assert.ok($('m-btn-install-update') && /Coba unduh lagi/.test($('m-btn-install-update').textContent), '32.C2: tombol Coba unduh lagi tampil bila berkas hilang');
  installRejectMsg32 = '';
  const dlAfterMissingC2 = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length;
  click($('m-btn-install-update'));
  await new Promise((r) => setTimeout(r, 35));
  assert.strictEqual(capLog32.filter((x) => x[0] === 'Filesystem.downloadFile').length, dlAfterMissingC2 + 1, '32.C2: ketukan setelah berkas hilang mengunduh ulang');

  // --- C3: Nama berkas unik mencegah balapan penulis setelah stalled ---
  resetState32();
  dlMode32 = 'manual';
  w.RK_UPDATE_STALL_MS = 75;
  const dl1Prom = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 15));
  const dl1Calls = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile');
  assert.strictEqual(dl1Calls.length, 1, '32.C3: percobaan 1 memanggil downloadFile');
  const path1 = dl1Calls[0][1].path;
  assert.strictEqual(dlHandles32.length, 1, '32.C3: percobaan 1 menggantung');

  // Tunggu watchdog menandai stalled
  await new Promise((r) => setTimeout(r, 110));
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'stalled', '32.C3: percobaan 1 masuk phase=stalled');

  // Percobaan 2 dimulai saat percobaan 1 belum selesai menulis -> path harus berbeda & lolos pola Java
  const dl2Prom = w.rkInstallApkInApp();
  await new Promise((r) => setTimeout(r, 15));
  const dl2Calls = capLog32.filter((x) => x[0] === 'Filesystem.downloadFile');
  assert.strictEqual(dl2Calls.length, 2, '32.C3: percobaan 2 memanggil downloadFile');
  const path2 = dl2Calls[1][1].path;
  assert.notStrictEqual(path2, path1, '32.C3: percobaan ulang setelah stalled memakai path berbeda');
  for (const p of [path1, path2]) {
    assert.ok(
      !p.startsWith('/') && !p.startsWith('\\') && !p.includes('..') && /^rk-update\/[^/\\]+\.apk$/i.test(p),
      '32.C3: path lolos pola Java ApkInstallerPlugin: ' + p,
    );
  }

  // Selesaikan percobaan 2 -> state & install memakai path2
  dlHandles32[1].resolve();
  await dl2Prom;
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'ready', '32.C3: percobaan 2 masuk ready');
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, path2, '32.C3: downloadedPath memakai path2');
  const instAfterDl2 = capLog32.filter((x) => x[0] === 'ApkInstaller.install');
  assert.strictEqual(instAfterDl2[instAfterDl2.length - 1][1].path, path2, '32.C3: install dipanggil dengan path2');

  // Hasil percobaan 1 selesai belakangan -> diabaikan
  const instCountBeforeLate = instAfterDl2.length;
  dlHandles32[0].resolve();
  await dl1Prom;
  await new Promise((r) => setTimeout(r, 25));
  assert.strictEqual(w.MOB_UPDATE_STATE.downloadedPath, path2, '32.C3: hasil lama tidak menimpa downloadedPath');
  assert.strictEqual(w.MOB_UPDATE_STATE.phase, 'ready', '32.C3: hasil lama tidak mengubah phase');
  assert.strictEqual(capLog32.filter((x) => x[0] === 'ApkInstaller.install').length, instCountBeforeLate, '32.C3: hasil lama tidak memicu install');

  // --- C5: Pembersihan senyap rk-update saat start bila idle, dilewati saat fase aktif ---
  assert.strictEqual(typeof w.rkCleanupApkCacheOnStart, 'function', '32.C5: fungsi rkCleanupApkCacheOnStart tersedia');
  resetState32();
  readdirFiles32 = [{ name: 'renkeu-9.apk' }, { name: 'renkeu-10-3.apk' }, { name: 'readme.txt' }];
  $('m-toast-box').innerHTML = '';
  const cleanOkC5 = await w.rkCleanupApkCacheOnStart();
  assert.strictEqual(cleanOkC5, true, '32.C5: pembersihan saat idle berhasil');
  assert.ok(capLog32.some((x) => x[0] === 'Filesystem.readdir' && x[1].path === 'rk-update' && x[1].directory === 'CACHE'), '32.C5: memindai cache/rk-update');
  assert.ok(capLog32.some((x) => x[0] === 'Filesystem.deleteFile' && x[1].path === 'rk-update/renkeu-9.apk'), '32.C5: menghapus berkas .apk lama #1');
  assert.ok(capLog32.some((x) => x[0] === 'Filesystem.deleteFile' && x[1].path === 'rk-update/renkeu-10-3.apk'), '32.C5: menghapus berkas .apk lama #2');
  assert.ok(!capLog32.some((x) => x[0] === 'Filesystem.deleteFile' && x[1].path === 'rk-update/readme.txt'), '32.C5: hanya menghapus berkas .apk');
  assert.strictEqual($('m-toast-box').textContent.trim(), '', '32.C5: pembersihan senyap tanpa toast');

  // Galat Filesystem tidak melempar error atau memicu toast
  resetState32();
  readdirReject32 = true;
  $('m-toast-box').innerHTML = '';
  const cleanErr1 = await w.rkCleanupApkCacheOnStart();
  assert.strictEqual(cleanErr1, false, '32.C5: readdir gagal kembali false secara senyap');
  assert.strictEqual($('m-toast-box').textContent.trim(), '', '32.C5: readdir gagal tanpa toast');

  resetState32();
  readdirFiles32 = [{ name: 'renkeu-9.apk' }];
  deleteReject32 = true;
  $('m-toast-box').innerHTML = '';
  await w.rkCleanupApkCacheOnStart();
  assert.strictEqual($('m-toast-box').textContent.trim(), '', '32.C5: deleteFile gagal tanpa toast');

  // Dilewati saat fase unduh/verifikasi/pasang aktif atau sudah ada berkas siap pasang
  for (const actPh of ['downloading', 'verifying', 'installing', 'ready', 'need-permission']) {
    resetState32();
    readdirFiles32 = [{ name: 'renkeu-10.apk' }];
    w.MOB_UPDATE_STATE.phase = actPh;
    if (actPh === 'ready' || actPh === 'need-permission') {
      w.MOB_UPDATE_STATE.downloadedPath = 'rk-update/renkeu-10.apk';
    }
    const skipC5 = await w.rkCleanupApkCacheOnStart();
    assert.strictEqual(skipC5, false, '32.C5: pembersihan dilewati saat phase=' + actPh);
    assert.strictEqual(
      capLog32.filter((x) => x[0] === 'Filesystem.readdir' || x[0] === 'Filesystem.deleteFile').length,
      0,
      '32.C5: tidak menyentuh Filesystem saat phase=' + actPh,
    );
  }

  // Pulihkan stub Tahap 7.1
  resetState32();
  w.MOB_UPDATE_STATE.info = null;
  w.MOB_UPDATE_STATE.status = 'idle';
  w.Capacitor = origCap32;
  w.fetch = origFetch32;
  Object.defineProperty(w, 'crypto', { configurable: true, value: origCrypto32 });
  w.copyText = origCopyText32;
  w.mobOpenExternalUrl = origOpenExt32;
  w.RK_UPDATE_STALL_MS = origStallMs32;
  Object.assign(w.RK_BUILD, origBuild32);

  // 33. Tahap 8 (Khusus APK Mode Perjalanan: rincian Rupiah/Asing di Ringkasan, form D2, daftar D4, noRate, !hasFx, .pv)
  const origTripPr33 = {};
  w.ALL.kas.pr['p-t8m-nofx'] = {
    id: 'p-t8m-nofx',
    name: 'Solo Hemat',
    link: false,
    saldo: 0,
    tx: [],
    start: '2026-12-01',
    end: '2026-12-02',
    budget: 2000000,
    cur: '',
    rate: 0,
    dt: {},
    it: [{ id: 'mi-nf', day: '2026-12-01', time: '08:00', time2: '', place: 'Gudeg', est: 100000, fx: false, pay: 'cash', cat: 'Makan', link: '', note: '', done: false }],
    bk: [{ id: 'mb-nf', title: 'Kereta', amt: 500000, fx: false, paid: false, cat: 'Transport', a: '', b: '', pay: 'on', link: '', rec: '' }],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  w.ALL.kas.pr['p-t8m-jpy'] = {
    id: 'p-t8m-jpy',
    name: 'Osaka Tahap 8',
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
      { id: 'mi-j1', day: '2026-12-01', time: '10:00', time2: '', place: 'Nankai Express', est: 2500, fx: true, pay: 'ic', cat: 'Transport', link: '', note: '', done: false },
      { id: 'mi-j2', day: '2026-12-01', time: '13:00', time2: '', place: 'Oleh-oleh Bandara', est: 50000, fx: false, pay: 'cash', cat: 'Belanja', link: '', note: '', done: false },
    ],
    bk: [
      { id: 'mb-j1', title: 'Asuransi', amt: 1000000, fx: false, paid: true, cat: 'Persiapan', a: '2026-12-01', b: '2026-12-03', pay: 'on', link: '', rec: '' },
      { id: 'mb-j2', title: 'Hotel Namba', amt: 10000, fx: true, paid: false, cat: 'Penginapan', a: '2026-12-01', b: '2026-12-03', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };

  w.setShellMode('mobile-app');
  w.switchMobileTab('trip');

  // 33.1 !hasFx tetap identik persis lama
  w.MOB_STATE.tripId = 'p-t8m-nofx';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mHintNoFx = $('m-trip-root').querySelector('.m-tile-s');
  assert.strictEqual(mHintNoFx.textContent, 'Pemesanan Rp 500.000 + Harian Rp 100.000', '33.!hasFx: teks hint APK identik');
  assert.ok(mHintNoFx.classList.contains('pv'), '33.!hasFx: kelas pv tetap ada');

  // 33.2 Core FX + live edit kurs di APK tanpa muat ulang
  w.MOB_STATE.tripId = 'p-t8m-jpy';
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mTile100 = $('m-trip-root').querySelector('.m-tile');
  assert.strictEqual(mTile100.querySelector('.m-tile-v').textContent, 'Rp 2.300.000', '33.A: total APK kurs 100 = Rp 2.300.000');
  const mHint100 = mTile100.querySelector('.m-tile-s').textContent;
  assert.ok(/Rupiah\s+Rp\s*1\.050\.000/.test(mHint100), '33.A: APK memuat Rupiah Rp 1.050.000');
  assert.ok(/Asing\s+Rp\s*1\.250\.000\s*\(≈\s*JPY\s*12\.500\)/.test(mHint100), '33.A: APK memuat Asing Rp 1.250.000 (≈ JPY 12.500)');
  assert.ok(/Pemesanan\s+Rp\s*2\.000\.000\s*\+\s*Harian\s+Rp\s*300\.000/.test(mHint100), '33.A: APK mempertahankan baris lama');
  const mPvTile = [...mTile100.querySelectorAll('.m-tile-s .pv')];
  assert.ok(mPvTile.some((el) => /1\.050\.000/.test(el.textContent)) && mPvTile.some((el) => /JPY\s*12\.500/.test(el.textContent)), '33.A: kelas pv ada pada semua nominal baru di APK');

  // Ubah kurs 100 -> 110 via modal Ubah APK
  click($('m-btn-trip-edit'));
  $('m-kp-rate').value = '110';
  fire($('m-trip-meta-form'), 'submit');
  const mTile110 = $('m-trip-root').querySelector('.m-tile');
  assert.strictEqual(mTile110.querySelector('.m-tile-v').textContent, 'Rp 2.425.000', '33.A: ubah kurs 110 APK -> total Rp 2.425.000');
  assert.ok(/Asing\s+Rp\s*1\.375\.000\s*\(≈\s*JPY\s*12\.500\)/.test(mTile110.textContent), '33.A: ubah kurs 110 APK -> Asing naik & JPY 12.500 tetap');

  // 33.3 Daftar D4 & Form D2 pada APK (kembalikan rate=100)
  w.ALL.kas.pr['p-t8m-jpy'].rate = 100;
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  const mItCards = [...$('m-trip-root').querySelectorAll('.mob-sched-card')];
  assert.strictEqual(mItCards.length, 2, '33.D4 itinerary: 2 kartu kegiatan');
  assert.ok(mItCards[0].textContent.includes('JPY 2.500'), '33.D4 itinerary fx: nominal JPY tampil');
  const mItEq0 = mItCards[0].querySelector('.trip-eq-hint');
  assert.ok(mItEq0 && mItEq0.textContent === '≈ Rp 250.000' && mItEq0.classList.contains('pv'), '33.D4 itinerary fx: hint ≈ Rp 250.000 + .pv');
  assert.strictEqual(mItCards[1].querySelector('.trip-eq-hint'), null, '33.D4 itinerary rupiah: tidak ada hint');

  $('m-it-cur').value = 'fx';
  $('m-it-est').value = '4000';
  fire($('m-it-est'), 'input');
  assert.strictEqual($('m-it-est-eq').textContent, '≈ Rp 400.000', '33.D2 itinerary: ketik angka memperbarui ekuivalen');
  assert.ok($('m-it-est-eq').classList.contains('pv'), '33.D2 itinerary: pratinjau memakai kelas pv');
  $('m-it-cur').value = 'idr';
  fire($('m-it-cur'), 'change');
  assert.strictEqual($('m-it-est-eq').textContent, '', '33.D2 itinerary: pindah ke Rp mengosongkan pratinjau');

  click($('m-trip-root').querySelector('[data-mit-edit="mi-j1"]'));
  assert.strictEqual($('m-it-est-eq').textContent, '≈ Rp 250.000', '33.D2 itinerary mode edit: pratinjau langsung tampil');
  click($('m-it-cancel'));

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  const mBkCards = [...$('m-trip-root').querySelectorAll('.mob-sched-card')];
  assert.strictEqual(mBkCards.length, 2, '33.D4 pemesanan: 2 kartu pemesanan');
  assert.strictEqual(mBkCards[0].querySelector('.trip-eq-hint'), null, '33.D4 pemesanan rupiah: tidak ada hint');
  const mBkEq1 = mBkCards[1].querySelector('.trip-eq-hint');
  assert.ok(mBkCards[1].textContent.includes('JPY 10.000'), '33.D4 pemesanan fx: nominal JPY tampil');
  assert.ok(mBkEq1 && mBkEq1.textContent === '≈ Rp 1.000.000' && mBkEq1.classList.contains('pv'), '33.D4 pemesanan fx: hint ≈ Rp 1.000.000 + .pv');

  $('m-bk-cur').value = 'fx';
  $('m-bk-amt').value = '6000';
  fire($('m-bk-amt'), 'input');
  assert.strictEqual($('m-bk-amt-eq').textContent, '≈ Rp 600.000', '33.D2 pemesanan: ketik angka memperbarui ekuivalen');
  $('m-bk-cur').value = 'idr';
  fire($('m-bk-cur'), 'change');
  assert.strictEqual($('m-bk-amt-eq').textContent, '', '33.D2 pemesanan: pindah ke Rp mengosongkan pratinjau');

  click($('m-trip-root').querySelector('[data-mbk-edit="mb-j2"]'));
  assert.strictEqual($('m-bk-amt-eq').textContent, '≈ Rp 1.000.000', '33.D2 pemesanan mode edit: pratinjau langsung tampil');
  click($('m-bk-cancel'));

  // 33.4 noRate di APK
  w.ALL.kas.pr['p-t8m-jpy'].rate = 0;
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  const mNrHint = $('m-trip-root').querySelector('.m-tile-s').textContent;
  assert.ok(/Asing\s+JPY\s*12\.500\s*·\s*kurs belum diatur/i.test(mNrHint), '33.noRate APK: menyebut kurs belum diatur');
  assert.ok(/Kurs belum diatur:\s*total belum akurat/i.test(mNrHint), '33.noRate APK: peringatan total belum akurat');
  assert.ok(!mNrHint.includes('≈ Rp'), '33.noRate APK: tidak menampilkan ekuivalen Rp');
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  assert.strictEqual($('m-trip-root').querySelectorAll('.trip-eq-hint:not(:empty)').length, 0, '33.noRate APK daftar: tanpa hint ekuivalen');
  $('m-it-cur').value = 'fx';
  fire($('m-it-cur'), 'change');
  assert.strictEqual($('m-it-est-eq').textContent, 'Kurs belum diatur', '33.noRate APK D2: form menampilkan Kurs belum diatur');

  // Bersihkan profil uji Tahap 8
  delete w.ALL.kas.pr['p-t8m-nofx'];
  delete w.ALL.kas.pr['p-t8m-jpy'];
  w.MOB_STATE.tripId = null;

  // 34. Tahap 9 (APK): Kurs terkunci (bk[].rt) untuk pemesanan yang sudah dibayar
  w.ALL.kas.pr['p-t9m-jpy'] = {
    id: 'p-t9m-jpy',
    name: 'Osaka Lock APK',
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
      { id: 'm9-b1', title: 'Hotel Namba', amt: 10000, fx: true, paid: false, cat: 'Hotel', a: '2026-12-01', b: '2026-12-02', pay: 'on', link: '', rec: '' },
      { id: 'm9-b2', title: 'Haruka Express', amt: 10000, fx: true, paid: false, cat: 'Transport', a: '2026-12-02', b: '2026-12-02', pay: 'on', link: '', rec: '' },
    ],
    lk: [],
    ck: [],
    note: '',
    goal: null,
  };
  const p9m = () => w.ALL.kas.pr['p-t9m-jpy'];
  w.setShellMode('mobile-app');
  w.MOB_STATE.tripId = 'p-t9m-jpy';
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();

  // Ketuk lunas pemesanan #1 -> rt=100 + toast APK
  click($('m-trip-root').querySelector('[data-mbk-pay="m9-b1"]'));
  assert.strictEqual(p9m().bk[0].paid, true, '34. APK ketuk lunas mengubah paid=true');
  assert.strictEqual(p9m().bk[0].rt, 100, '34. APK ketuk lunas mengunci rt=100');
  assert.ok($('m-toast-box') && $('m-toast-box').textContent.includes('Kurs terkunci: 1 JPY = Rp 100'), '34. APK toast konfirmasi kurs terkunci tampil');

  // Ubah kurs 100 -> 110 via modal Ubah APK
  click($('m-btn-trip-edit'));
  $('m-kp-rate').value = '110';
  fire($('m-trip-meta-form'), 'submit');
  w.MOB_STATE.tripSub = 'ring';
  w.renderMobTrip();
  assert.strictEqual($('m-trip-root').querySelector('.m-tile-v').textContent, 'Rp 2.100.000', '34. APK total menjadi Rp 2.100.000');

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  const m9Cards = [...$('m-trip-root').querySelectorAll('.mob-sched-card')];
  const m9Hint0 = m9Cards[0].querySelector('.trip-eq-hint');
  assert.ok(m9Hint0 && m9Hint0.textContent === '≈ Rp 1.000.000 · kurs terkunci 100' && m9Hint0.classList.contains('pv'), '34. APK kartu pemesanan menampilkan kurs terkunci + .pv');
  assert.strictEqual(m9Cards[1].querySelector('.trip-eq-hint').textContent, '≈ Rp 1.100.000', '34. APK pemesanan belum lunas ikut kurs 110');

  // Edit di form APK (#m-bk-rt-wrap & #m-bk-rt)
  click($('m-trip-root').querySelector('[data-mbk-edit="m9-b1"]'));
  assert.ok($('m-bk-rt-wrap') && $('m-bk-rt-wrap').style.display !== 'none', '34. APK #m-bk-rt-wrap tampil saat edit lunas asing');
  assert.strictEqual($('m-bk-rt').value, '100', '34. APK #m-bk-rt terisi 100');
  $('m-bk-rt').value = '105';
  fire($('m-bk-rt'), 'input');
  assert.strictEqual($('m-bk-amt-eq').textContent, '≈ Rp 1.050.000 · kurs terkunci 105', '34. APK pratinjau ekuivalen live dari #m-bk-rt');
  fire($('m-trip-book-form'), 'submit');
  assert.strictEqual(p9m().bk[0].rt, 105, '34. APK submit menyimpan rt=105');

  // Kosongkan #m-bk-rt lalu simpan -> kembali ikut kurs perjalanan
  click($('m-trip-root').querySelector('[data-mbk-edit="m9-b1"]'));
  $('m-bk-rt').value = '';
  fire($('m-trip-book-form'), 'submit');
  assert.strictEqual(p9m().bk[0].rt, undefined, '34. APK mengosongkan #m-bk-rt menghapus rt');

  // Batal lunas di APK menghapus rt
  click($('m-trip-root').querySelector('[data-mbk-pay="m9-b1"]'));
  assert.strictEqual(p9m().bk[0].paid, false, '34. APK batal lunas paid=false');
  assert.strictEqual(p9m().bk[0].rt, undefined, '34. APK batal lunas menghapus rt');

  delete w.ALL.kas.pr['p-t9m-jpy'];
  w.MOB_STATE.tripId = null;

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('OK mobile_app_mode');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL mobile_app_mode:', e);
  process.exit(1);
});
