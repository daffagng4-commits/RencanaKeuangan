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
  assert($('m-cf-strip').querySelector('.cf-strip-lbl'), 'strip keterangan memakai kelas ellipsis satu baris');
  click($('m-btn-expand-cf'));
  assert($('m-sheet-cf-zoom').classList.contains('open') && $('m-svg-cf-zoom').querySelector('.cf-node'), 'tombol Perbesar membuka popup grafik mode desktop');
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

  assert.strictEqual(errs.length, 0, 'tidak ada error runtime JS: ' + errs.join(' | '));
  console.log('OK mobile_app_mode');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL mobile_app_mode:', e);
  process.exit(1);
});
