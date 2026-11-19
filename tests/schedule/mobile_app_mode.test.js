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
  // 21e. Sentuhan dimulai di grafik, slider horizontal, atau gerakan horizontal: tidak aktif
  w._rkPtrReset();
  doPtr($('m-cf-wrap'), 0, 160);
  doPtr($('m-kpi-slider'), 0, 160);
  doPtr($('m-tab-rincian'), 80, 12);
  assert.strictEqual(ptrPullCount, 1, 'tarik dari grafik, slider horizontal, atau arah horizontal tidak memicu Pull-to-Refresh');
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

  w.sb = origSb21;
  w.sbUser = origSbUser21;
  w.pull = origPull21;

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('OK mobile_app_mode');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL mobile_app_mode:', e);
  process.exit(1);
});
