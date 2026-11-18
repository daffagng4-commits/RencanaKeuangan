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
  assert($('m-sheet-acct').classList.contains('open') && $('m-lg-google'), 'sheet akun Mode APK memiliki tombol Masuk dengan Google (Gmail)');
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
  assert($('m-sheet-acct').classList.contains('open'), 'sheet Akun terbuka dari avatar Mode APK');
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
  assert(!$('m-bn-pill') && !remountShell.querySelector('.mob-bottom-nav .bn-pill') && mKasNavBtn.classList.contains('active'), 'bottom nav APK kembali bersih tanpa #m-bn-pill, hanya tab .active berwarna emas');
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

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('OK mobile_app_mode');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL mobile_app_mode:', e);
  process.exit(1);
});
