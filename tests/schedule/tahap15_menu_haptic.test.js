const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function extractBraceBlock(src, startIdx) {
  const open = src.indexOf('{', startIdx);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return '';
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire, errs } = t;
  const doc = w.document;

  w.__today = '2026-11-22';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 12000000;
  w.S.items = [
    { id: 1501, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1502, name: 'Listrik', price: 450000, n: 1, unit: 'bulan', start: '2026-11-20', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1503, name: 'Air PDAM', price: 150000, n: 1, unit: 'bulan', start: '2026-11-28', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [
    { id: 'tx-15-1', d: '2026-11-05', dir: '+', amt: 5000000, cat: 'Gaji', note: 'Gaji awal' },
    { id: 'tx-15-2', d: '2026-11-12', dir: '-', amt: 250000, cat: 'Makan', note: 'Belanja' },
  ];
  w.renderAll();
  w.setShellMode('mobile-app');

  const hapticLog = [];
  const vibLog = [];
  const makeHapticsSpy = (opts = {}) => ({
    impact: (arg) => {
      hapticLog.push({ api: 'impact', arg });
      if (opts.throwSync) throw new Error('impact sync fail');
      if (opts.reject) return Promise.reject(new Error('impact async fail'));
      return Promise.resolve();
    },
    selectionChanged: () => {
      hapticLog.push({ api: 'selectionChanged' });
      if (opts.throwSync) throw new Error('sel sync fail');
      if (opts.reject) return Promise.reject(new Error('sel async fail'));
      return Promise.resolve();
    },
    selectionStart: () => {
      hapticLog.push({ api: 'selectionStart' });
      return Promise.resolve();
    },
    selectionEnd: () => {
      hapticLog.push({ api: 'selectionEnd' });
      return Promise.resolve();
    },
    vibrate: (arg) => {
      hapticLog.push({ api: 'vibrate', arg });
      return Promise.resolve();
    },
  });

  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics' || n === 'StatusBar' || n === 'App',
    Plugins: {
      Haptics: makeHapticsSpy(),
      StatusBar: { setOverlaysWebView: () => Promise.resolve(), setStyle: () => Promise.resolve(), setBackgroundColor: () => Promise.resolve() },
    },
  };
  Object.defineProperty(w.navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: (pat) => { vibLog.push(pat); return true; },
  });

  const clearLogs = () => { hapticLog.length = 0; vibLog.length = 0; };

  const realClick = (el) => {
    el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  const fireTouch = (el, type, clientX, clientY) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX, clientY };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
    return ev;
  };

  // Pastikan jsdom offsetWidth/offsetHeight non-zero untuk sheet agar cabang animasi close & drag teruji nyata
  const moreBd = $('m-sheet-more');
  const moreSheet = moreBd.querySelector('.modal-sheet');
  Object.defineProperty(moreBd, 'offsetWidth', { configurable: true, get: () => 360 });
  Object.defineProperty(moreSheet, 'offsetHeight', { configurable: true, get: () => 360 });

  const assertMenuOpen = (label) => {
    assert.strictEqual(moreBd.hidden, false, `${label}: #m-sheet-more.hidden harus false`);
    assert(moreBd.classList.contains('open'), `${label}: #m-sheet-more harus punya kelas .open`);
    assert(!moreBd.classList.contains('is-closing'), `${label}: #m-sheet-more tidak boleh .is-closing saat dibuka`);
    assert.notStrictEqual(w.getComputedStyle(moreBd).display, 'none', `${label}: #m-sheet-more tidak boleh display:none`);
  };

  // Bug tombol Menu: 6 skenario penutupan, minimal 5 putaran tiap skenario.
  const menuBtn = $('m-btn-more');

  // 1a. Menu -> Tutup tombol -> Menu lagi (5x)
  for (let i = 1; i <= 5; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1a putaran ${i}`);
    realClick(moreBd.querySelector('[data-mclose="m-sheet-more"]'));
    assert(!moreBd.classList.contains('open'), `1a putaran ${i}: sheet tertutup setelah klik Tutup`);
  }

  // 1b. Menu -> Klik scrim (mousedown + click) -> Menu lagi (5x)
  for (let i = 1; i <= 5; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1b scrim putaran ${i}`);
    realClick(moreBd);
    assert(!moreBd.classList.contains('open'), `1b scrim putaran ${i}: sheet tertutup setelah klik scrim`);
    assert.strictEqual(moreBd.hidden, false, `1b scrim putaran ${i}: klik scrim APK tidak boleh menyetel hidden=true`);
  }

  // 1c. Menu -> Drag-to-dismiss -> Menu lagi langsung (tanpa tunggu 250ms, 5x)
  const handle = moreBd.querySelector('.ms-handle');
  for (let i = 1; i <= 5; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1c drag putaran ${i} (buka)`);
    fireTouch(handle, 'touchstart', 180, 300);
    fireTouch(handle, 'touchmove', 180, 320);
    fireTouch(handle, 'touchmove', 180, 520);
    fireTouch(handle, 'touchend', 180, 520);
    assert(!moreBd.classList.contains('open'), `1c drag putaran ${i}: kelas .open langsung dilepas saat dismiss`);
  }
  // Re-open segera lalu tunggu >260ms: timer lama tidak boleh menutup sheet baru
  realClick(menuBtn);
  assertMenuOpen('1c drag re-open segera');
  await new Promise((r) => setTimeout(r, 270));
  assertMenuOpen('1c drag re-open tetap terbuka setelah 270ms');
  realClick(moreBd.querySelector('[data-mclose="m-sheet-more"]'));

  // 1d. Menu -> rkHandleAndroidBack() -> Menu lagi (5x)
  for (let i = 1; i <= 5; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1d back putaran ${i}`);
    const handled = w.rkHandleAndroidBack();
    assert.strictEqual(handled, 'sheet', `1d back putaran ${i}: rkHandleAndroidBack menutup sheet`);
    assert(!moreBd.classList.contains('open'), `1d back putaran ${i}: sheet tertutup`);
  }

  // 1e. Menu -> pilih item (Pengaturan / Simulasi / Perjalanan) -> Menu lagi (5x)
  const goTargets = ['settings', 'sim', 'trip', 'settings', 'sim'];
  for (let i = 0; i < goTargets.length; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1e item ${goTargets[i]} putaran ${i + 1}`);
    const itemBtn = moreBd.querySelector(`[data-mgo="${goTargets[i]}"]`);
    assert(itemBtn, `Item [data-mgo="${goTargets[i]}"] ada di #m-sheet-more`);
    realClick(itemBtn);
    assert(!moreBd.classList.contains('open'), `1e putaran ${i + 1}: sheet tertutup setelah pilih ${goTargets[i]}`);
    assert(menuBtn.classList.contains('active') && menuBtn.getAttribute('aria-current') === 'page', `1e putaran ${i + 1}: tombol Menu aktif untuk tab ${goTargets[i]}`);
  }
  // Pastikan dari tab settings/sim/trip, Menu bisa dibuka lagi
  realClick(menuBtn);
  assertMenuOpen('1e buka ulang dari tab sekunder');
  realClick(moreBd.querySelector('[data-mclose="m-sheet-more"]'));

  // 1f. Menu -> pilih Tema Tampilan -> Menu lagi (5x)
  for (let i = 1; i <= 5; i++) {
    realClick(menuBtn);
    assertMenuOpen(`1f tema putaran ${i}`);
    realClick($('m-menu-theme'));
    assert(!moreBd.classList.contains('open'), `1f tema putaran ${i}: memilih Tema Tampilan menutup #m-sheet-more agar tidak menutupi tombol Menu`);
  }

  // 1g. Cek tombol lain yang berbagi pola >= 5 putaran (#m-acct-btn, #m-btn-notif, #m-yr-btn-center, #m-top-yr-pill)
  for (let i = 1; i <= 5; i++) {
    realClick($('m-acct-btn'));
    assert($('m-acct-popover').classList.contains('open'), `1g #m-acct-btn buka putaran ${i}`);
    realClick($('m-acct-btn'));
    assert(!$('m-acct-popover').classList.contains('open'), `1g #m-acct-btn tutup putaran ${i}`);

    realClick($('m-btn-notif'));
    assert($('m-notif-popover').classList.contains('open'), `1g #m-btn-notif buka putaran ${i}`);
    realClick($('m-btn-notif'));
    assert(!$('m-notif-popover').classList.contains('open'), `1g #m-btn-notif tutup putaran ${i}`);

    realClick($('m-yr-btn-center'));
    assert($('m-sheet-periode').classList.contains('open') && !$('m-sheet-periode').hidden, `1g #m-yr-btn-center buka putaran ${i}`);
    realClick($('m-sheet-periode'));
    assert(!$('m-sheet-periode').classList.contains('open') && !$('m-sheet-periode').hidden, `1g #m-yr-btn-center tutup scrim putaran ${i}`);

    realClick($('m-acct-btn'));
    assert($('m-acct-popover').classList.contains('open'), `1g popover akun sebelum #m-top-yr-pill putaran ${i}`);
    realClick($('m-top-yr-pill'));
    assert($('m-sheet-periode').classList.contains('open') && !$('m-sheet-periode').hidden, `1g #m-top-yr-pill buka #m-sheet-periode putaran ${i}`);
    realClick($('m-sheet-periode').querySelector('[data-mclose="m-sheet-periode"]'));
    assert(!$('m-sheet-periode').classList.contains('open'), `1g #m-top-yr-pill tutup putaran ${i}`);
  }

  // Label aksesibilitas tombol Menu mengikuti status titik pembaruan.
  assert.strictEqual(typeof w.rkSyncUpdateDots, 'function', 'A2: window.rkSyncUpdateDots diekspos');
  w.MOB_UPDATE_STATE.status = 'idle';
  w.rkSyncUpdateDots();
  assert.strictEqual(menuBtn.getAttribute('aria-label'), 'Menu', 'A2: tanpa pembaruan, aria-label #m-btn-more adalah "Menu"');
  w.MOB_UPDATE_STATE.status = 'available';
  w.rkSyncUpdateDots();
  assert.strictEqual(menuBtn.getAttribute('aria-label'), 'Menu, ada pembaruan aplikasi', 'A2: saat titik pembaruan tampil, aria-label #m-btn-more menyebut pembaruan');
  w.MOB_UPDATE_STATE.status = 'idle';
  w.rkSyncUpdateDots();
  assert.strictEqual(menuBtn.getAttribute('aria-label'), 'Menu', 'A2: saat titik pembaruan disembunyikan kembali, aria-label kembali ke "Menu"');

  // Helper rkHaptic dan sakelar matikan getaran di Pengaturan.
  assert.strictEqual(typeof w.rkHaptic, 'function', 'C2: window.rkHaptic tersedia');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  // Prioritas Capacitor plugin
  clearLogs();
  w.rkHaptic('arm');
  w.rkHaptic('refresh');
  w.rkHaptic('edge');
  assert.strictEqual(hapticLog.length, 3, 'C2: rkHaptic memanggil Capacitor.Plugins.Haptics untuk arm/refresh/edge');
  assert.strictEqual(vibLog.length, 0, 'C2: saat Capacitor.Plugins.Haptics ada, navigator.vibrate tidak dipanggil');

  // Fallback navigator.vibrate saat plugin tidak ada
  const savedCap = w.Capacitor;
  w.Capacitor = null;
  clearLogs();
  w.rkHaptic('arm');
  w.rkHaptic('refresh');
  assert.strictEqual(vibLog.length, 2, 'C2: fallback navigator.vibrate terpanggil saat Capacitor tidak tersedia');

  // Tanpa Capacitor dan tanpa navigator.vibrate -> no-op tanpa error
  const savedVib = w.navigator.vibrate;
  Object.defineProperty(w.navigator, 'vibrate', { configurable: true, writable: true, value: undefined });
  assert.doesNotThrow(() => {
    w.rkHaptic('arm');
    w.rkHaptic('refresh');
    w.rkHaptic('tick');
    w.rkHaptic('edge');
  }, 'C2: tanpa Capacitor dan navigator.vibrate, rkHaptic no-op tanpa error');

  // Plugin melempar sinkron atau reject async -> tidak merambat
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
    Plugins: { Haptics: makeHapticsSpy({ throwSync: true }) },
  };
  assert.doesNotThrow(() => w.rkHaptic('refresh'), 'C2: error sinkron plugin tidak merambat');
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
    Plugins: { Haptics: makeHapticsSpy({ reject: true }) },
  };
  assert.doesNotThrow(() => w.rkHaptic('refresh'), 'C2: promise reject plugin ditangkap tanpa unhandledRejection');
  await new Promise((r) => setTimeout(r, 15));

  // Restore spy normal
  w.Capacitor = savedCap;
  Object.defineProperty(w.navigator, 'vibrate', { configurable: true, writable: true, value: savedVib });

  // Mode Browser -> 0 panggilan
  w.setShellMode('browser');
  clearLogs();
  w.rkHaptic('arm');
  w.rkHaptic('refresh');
  w.rkHaptic('tick');
  w.rkHaptic('edge');
  assert.strictEqual(hapticLog.length, 0, 'C2: rkHaptic no-op di Browser Mode');
  w.setShellMode('mobile-app');

  // Kill-switch Pengaturan (#m-set-haptic-enabled, localStorage['rk-haptics'])
  const hapToggle = $('m-set-haptic-enabled');
  assert(hapToggle, 'C5: sakelar #m-set-haptic-enabled tersedia di Pengaturan');
  assert.strictEqual(hapToggle.checked, true, 'C5: sakelar Getaran sentuh bawaan aktif');
  hapToggle.checked = false;
  fire(hapToggle, 'change');
  assert.strictEqual(w.localStorage.getItem('rk-haptics'), '0', 'C5: mematikan sakelar menyimpan rk-haptics=0 di localStorage');
  clearLogs();
  w.rkHaptic('refresh');
  w.rkHaptic('arm');
  w.rkHaptic('tick');
  w.rkHaptic('edge');
  assert.strictEqual(hapticLog.length, 0, 'C5: saat sakelar mati, rkHaptic no-op');
  hapToggle.checked = true;
  fire(hapToggle, 'change');
  assert.strictEqual(w.localStorage.getItem('rk-haptics'), '1', 'C5: menyalakan sakelar kembali menyimpan rk-haptics=1');

  // Pull-to-Refresh: haptic arm saat melewati ambang dan refresh saat dilepas.
  w.sbUser = null;
  w.switchMobileTab('rincian');
  $('m-main').scrollTop = 0;
  w.scrollY = 0;
  w._rkPtrReset();
  clearLogs();

  // Tarikan melewati ambang (PULL_TRIG=52 -> dy >= 104): arm 1x saat melewati ambang, tidak berulang di move lanjutan; balik di bawah ambang lalu lewat lagi -> arm lagi; lepas -> refresh 1x
  const rincianPanel = $('m-tab-rincian');
  fireTouch(rincianPanel, 'touchstart', 160, 120);
  fireTouch(rincianPanel, 'touchmove', 160, 180); // pullY=30 (<52)
  assert.strictEqual(hapticLog.length, 0, 'PTR: sebelum ambang belum ada haptic');
  fireTouch(rincianPanel, 'touchmove', 160, 240); // pullY=60 (>=52) -> arm #1
  assert.strictEqual(hapticLog.length, 1, 'PTR: melewati ambang memicu arm tepat 1x');
  fireTouch(rincianPanel, 'touchmove', 160, 270); // pullY=75 (masih >=52) -> tidak ulang
  assert.strictEqual(hapticLog.length, 1, 'PTR: tetap di atas ambang tidak mengulang arm');
  fireTouch(rincianPanel, 'touchmove', 160, 190); // pullY=35 (turun di bawah ambang)
  fireTouch(rincianPanel, 'touchmove', 160, 250); // pullY=65 (lewat lagi) -> arm #2
  assert.strictEqual(hapticLog.length, 2, 'PTR: tarik turun lalu melewati ambang lagi memicu arm lagi');
  fireTouch(rincianPanel, 'touchend', 160, 250); // lepas -> refresh 1x
  assert.strictEqual(hapticLog.length, 3, 'PTR: lepas di atas ambang memicu refresh 1x');

  // Tarikan kecil (< ambang) -> 0 haptic
  w._rkPtrReset();
  clearLogs();
  fireTouch(rincianPanel, 'touchstart', 160, 120);
  fireTouch(rincianPanel, 'touchmove', 160, 180);
  fireTouch(rincianPanel, 'touchend', 160, 180);
  assert.strictEqual(hapticLog.length, 0, 'PTR: tarikan dibatalkan / di bawah ambang = 0 haptic');

  // Target dikecualikan (.mob-bottom-nav, sheet terbuka, slider) -> 0 haptic
  w._rkPtrReset();
  clearLogs();
  const bnav = doc.querySelector('#mobile-app-shell .mob-bottom-nav');
  fireTouch(bnav, 'touchstart', 160, 680);
  fireTouch(bnav, 'touchmove', 160, 820);
  fireTouch(bnav, 'touchend', 160, 820);
  const liveMoreBd = $('m-sheet-more');
  liveMoreBd.classList.add('open');
  fireTouch(rincianPanel, 'touchstart', 160, 120);
  fireTouch(rincianPanel, 'touchmove', 160, 260);
  fireTouch(rincianPanel, 'touchend', 160, 260);
  liveMoreBd.classList.remove('open');
  w.switchMobileTab('kas');
  fireTouch($('m-kas-slider'), 'touchstart', 160, 300);
  fireTouch($('m-kas-slider'), 'touchmove', 160, 440);
  fireTouch($('m-kas-slider'), 'touchend', 160, 440);
  assert.strictEqual(hapticLog.length, 0, 'PTR: target dikecualikan (navbar, sheet terbuka, slider) = 0 haptic');

  // Re-tap tab aktif tanpa batas (10x tiap tab) sambil menjaga isian form.
  const origRefresh = w.rkMobRefresh;
  let refreshCount = 0;
  w.rkMobRefresh = function () {
    refreshCount += 1;
    return origRefresh.apply(this, arguments);
  };

  // Uji pindah ke tab belum aktif = 0 haptic & 0 refresh
  w.switchMobileTab('rincian');
  clearLogs();
  refreshCount = 0;
  realClick(bnav.querySelector('[data-mtab="kas"]'));
  assert.strictEqual(w.MOB_STATE.tab, 'kas', 'Ketuk tab belum aktif berpindah ke kas');
  assert.strictEqual(refreshCount, 0, 'Pindah ke tab belum aktif tidak memanggil rkMobRefresh');
  assert.strictEqual(hapticLog.length, 0, 'Pindah ke tab belum aktif tidak memicu haptic');

  // Siapkan isian form belum disimpan pada Transaksi (kas) dan Jadwal (jadwal)
  $('m-kas-amt').value = '125.000';
  $('m-kas-note').value = 'Kopi belum disimpan';
  $('m-item-name').value = 'Langganan Cloud';
  $('m-item-price').value = '199.000';

  for (const tid of ['rincian', 'kas', 'jadwal']) {
    w.switchMobileTab(tid);
    $('m-main').scrollTop = 0;
    w.scrollY = 0;
    w._rkPtrReset();
    clearLogs();
    refreshCount = 0;
    const btn = bnav.querySelector(`[data-mtab="${tid}"]`);
    for (let k = 0; k < 10; k++) {
      realClick(btn);
    }
    assert.strictEqual(refreshCount, 10, `Re-tap ${tid} 10x tanpa jeda memanggil rkMobRefresh tepat 10x`);
    assert.strictEqual(hapticLog.length, 10, `Re-tap ${tid} 10x tanpa jeda memicu haptic refresh tepat 10x`);
  }

  // Pastikan isian form tidak terhapus oleh 10x re-tap
  assert.strictEqual($('m-kas-amt').value, '125.000', 'Re-tap kas tidak menghapus #m-kas-amt');
  assert.strictEqual($('m-kas-note').value, 'Kopi belum disimpan', 'Re-tap kas tidak menghapus #m-kas-note');
  assert.strictEqual($('m-item-name').value, 'Langganan Cloud', 'Re-tap jadwal tidak menghapus #m-item-name');
  assert.strictEqual($('m-item-price').value, '199.000', 'Re-tap jadwal tidak menghapus #m-item-price');

  // Uji penggabungan (coalescing) saat pull() cloud async sedang berjalan: tidak membuang ketukan & tidak balapan
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origPull = w.pull;
  let cloudPulls = 0;
  let activePulls = 0;
  let maxConcurrentPulls = 0;
  const resolvers = [];
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t15' };
  w.pull = () => {
    cloudPulls += 1;
    activePulls += 1;
    if (activePulls > maxConcurrentPulls) maxConcurrentPulls = activePulls;
    return new Promise((res) => resolvers.push(() => { activePulls -= 1; w._rkLastPullOk = true; res(); }));
  };
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  clearLogs();
  refreshCount = 0;
  const rinBtn = bnav.querySelector('[data-mtab="rincian"]');
  for (let k = 0; k < 5; k++) realClick(rinBtn);
  assert.strictEqual(refreshCount, 5, 'Coalesce cloud: 5 ketukan memanggil rkMobRefresh 5x');
  assert.strictEqual(hapticLog.length, 5, 'Coalesce cloud: 5 ketukan memicu haptic 5x');
  assert.strictEqual(cloudPulls, 1, 'Coalesce cloud: hanya 1 pull() aktif bersamaan');
  assert.strictEqual(maxConcurrentPulls, 1, 'Coalesce cloud: tidak ada balapan pull() paralel');
  resolvers.shift()();
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(cloudPulls, 2, 'Coalesce cloud: ketukan saat in-flight menjalankan 1 refresh lanjutan setelah selesai');
  if (resolvers.length) resolvers.shift()();
  await new Promise((r) => setTimeout(r, 20));
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;
  w.rkMobRefresh = origRefresh;

  // Haptic scrub titik pada grafik Proyeksi Arus Kas (#m-cf-hit).
  w.switchMobileTab('rincian');
  w.renderMobileApp();
  const cfSvg = $('m-svg-cashflow');
  const cfHit = $('m-cf-hit');
  assert(cfSvg && cfHit, 'Grafik arus kas #m-svg-cashflow dan #m-cf-hit tersedia');
  cfSvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 340, height: 185, right: 340, bottom: 185 });
  const cfWrap = $('m-cf-wrap');
  if (cfWrap) cfWrap.getBoundingClientRect = () => ({ left: 0, top: 0, width: 340, height: 185, right: 340, bottom: 185 });

  // Ambil koordinat titik unik (deduplikasi lingkaran halo Hari Ini dengan cx sama)
  const seenX = new Set();
  const pts = [...cfSvg.querySelectorAll('circle[cx]')]
    .filter((c) => c.id !== 'm-cf-cd')
    .map((c) => ({ x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')) }))
    .filter((p) => {
      const k = Math.round(p.x * 10);
      if (seenX.has(k)) return false;
      seenX.add(k);
      return true;
    })
    .sort((a, b) => a.x - b.x);
  assert(pts.length >= 2, 'Grafik arus kas memiliki >= 2 titik data unik untuk diuji scrub');

  const origDateNow = w.Date.now;
  let fakeNow = Date.now() + 100000;
  w.Date.now = () => fakeNow;

  clearLogs();
  // Sentuh titik pertama -> 1x tick
  fireTouch(cfHit, 'touchstart', pts[0].x, pts[0].y);
  assert.strictEqual(hapticLog.length, 1, 'Grafik: sentuh titik pertama memicu 1x tick');
  // Geser kecil di titik yang sama -> 0 tick baru
  fakeNow += 60;
  fireTouch(cfHit, 'touchmove', pts[0].x + 1, pts[0].y);
  assert.strictEqual(hapticLog.length, 1, 'Grafik: tetap di titik yang sama tidak memicu tick lagi');
  // Geser ke titik kedua (lock horizontal >8px) -> 1x tick
  fakeNow += 60;
  fireTouch(cfHit, 'touchmove', pts[1].x, pts[0].y);
  assert.strictEqual(hapticLog.length, 2, 'Grafik: berpindah ke indeks titik baru memicu tick');
  // Gerakan di titik kedua yang sama -> 0 tick baru
  fakeNow += 60;
  fireTouch(cfHit, 'touchmove', pts[1].x + 0.5, pts[0].y);
  assert.strictEqual(hapticLog.length, 2, 'Grafik: diam di titik kedua tidak memicu tick lagi');
  // Jika ada titik ketiga, geser ke sana -> +1 tick
  if (pts.length >= 3) {
    fakeNow += 60;
    fireTouch(cfHit, 'touchmove', pts[2].x, pts[0].y);
    assert.strictEqual(hapticLog.length, 3, 'Grafik: pindah ke titik ketiga memicu tick');
  }
  const beforeLift = hapticLog.length;
  fakeNow += 60;
  fireTouch(cfHit, 'touchend', pts[pts.length - 1].x, pts[0].y);
  assert.strictEqual(hapticLog.length, beforeLift, 'Grafik: mengangkat jari (touchend) tidak memicu haptic');

  // Modal zoom (#m-cf-zoom-scrub) tidak memicu haptic
  clearLogs();
  const zScrub = $('m-cf-zoom-scrub');
  if (zScrub) {
    zScrub.value = '50';
    fire(zScrub, 'input');
    assert.strictEqual(hapticLog.length, 0, 'Modal zoom #m-cf-zoom-scrub tidak memicu haptic');
  }

  // Haptic slider opt-in hanya pada #m-kas-slider dan #m-item-price-slider.
  const optInSliders = [...doc.querySelectorAll('#mobile-app-shell [data-haptic="slider"]')].map((el) => el.id).sort();
  assert.deepStrictEqual(optInSliders, ['m-item-price-slider', 'm-kas-slider'], 'data-haptic="slider" hanya terpasang pada #m-kas-slider dan #m-item-price-slider');

  const testOptInSlider = (sliderId, inputId, minVal, step1, step2, maxVal) => {
    const sl = $(sliderId);
    const inp = $(inputId);
    assert(sl && inp, `Slider ${sliderId} dan input ${inputId} tersedia`);

    // 7a. Mengetik di kolom angka -> 0 haptic
    clearLogs();
    sl.value = String(step1);
    inp.value = String(step2);
    fire(inp, 'input');
    assert.strictEqual(hapticLog.length, 0, `${sliderId}: mengetik di ${inputId} tidak memicu haptic`);

    // 7b. Pengaturan nilai oleh kode (setRpVal) -> 0 haptic
    clearLogs();
    w.setRpVal(inputId, step1);
    assert.strictEqual(hapticLog.length, 0, `${sliderId}: setRpVal programatis tidak memicu haptic`);

    // 7c. Geseran pengguna (touchstart -> input -> touchend)
    sl.value = String(step1);
    clearLogs();
    fakeNow += 100;
    fireTouch(sl, 'touchstart', 50, 10);
    // Nilai tidak berubah -> 0 haptic
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 0, `${sliderId}: nilai tidak berubah = 0 haptic`);

    // Pindah langkah baru -> tick #1
    sl.value = String(step2);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 1, `${sliderId}: pindah langkah baru memicu 1x tick`);

    // Rate-limit tick: geser lagi hanya 10ms kemudian -> ditahan (tidak berdengung)
    fakeNow += 10;
    sl.value = String(step2 + 25000);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 1, `${sliderId}: rate-limit 40ms menahan tick dalam 10ms`);

    // Setelah >= 45ms -> tick lolos lagi
    fakeNow += 45;
    sl.value = String(step2 + 50000);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 2, `${sliderId}: tick lolos setelah jeda >= 40ms`);

    // Mencapai batas max (meski baru 5ms dari tick!) -> edge TIDAK dibatasi throttle
    fakeNow += 5;
    sl.value = String(maxVal);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 3, `${sliderId}: mencapai max memicu edge tanpa terhambat throttle tick`);
    // Tetap di max -> 0 haptic
    fakeNow += 60;
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 3, `${sliderId}: tetap di max tidak mengulang edge`);

    // Turun lalu menyentuh min -> edge 1x
    fakeNow += 60;
    sl.value = String(step2);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 4, `${sliderId}: turun dari max memicu tick`);
    fakeNow += 5;
    sl.value = String(minVal);
    fire(sl, 'input');
    assert.strictEqual(hapticLog.length, 5, `${sliderId}: mencapai min memicu edge`);

    fireTouch(sl, 'touchend', 10, 10);
  };

  testOptInSlider('m-kas-slider', 'm-kas-amt', 0, 100000, 125000, 5000000);
  testOptInSlider('m-item-price-slider', 'm-item-price', 25000, 375000, 400000, 5000000);

  // Slider lain (#m-sim-slider, #m-cfg-saldo-slider) tidak memicu haptic saat digeser
  for (const otherId of ['m-sim-slider', 'm-cfg-saldo-slider']) {
    const osl = $(otherId);
    if (!osl) continue;
    clearLogs();
    fakeNow += 100;
    fireTouch(osl, 'touchstart', 50, 10);
    osl.value = String(Number(osl.value || 0) + Number(osl.step || 50000));
    fire(osl, 'input');
    fireTouch(osl, 'touchend', 80, 10);
    assert.strictEqual(hapticLog.length, 0, `Slider non-opt-in ${otherId} tidak memicu haptic`);
  }

  w.Date.now = origDateNow;

  // Audit statis whitelist color navbar, tokens.css, desktop.css, sw.js, dan manifest.
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const manifestXml = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');

  // A3: Blok CSS navbar hanya menganimasikan properti compositor (transform, opacity) + pengecualian sadar color pada ikon 24px
  const navStart = cssMob.indexOf('5-SLOT BOTTOM NAVIGATION BAR');
  const navEnd = cssMob.indexOf('/* Bottom Sheets & Popovers */', navStart);
  assert(navStart >= 0 && navEnd > navStart, 'Blok CSS navbar ditemukan');
  const navCssBlock = cssMob.slice(navStart, navEnd);
  const NAVBAR_TRANSITION_WHITELIST = new Set(['transform', 'opacity', 'color', 'none']);
  for (const m of navCssBlock.matchAll(/transition\s*:\s*([^;]+);/gi)) {
    const parts = m[1].split(',');
    for (const part of parts) {
      const prop = part.trim().split(/\s+/)[0].toLowerCase();
      assert(
        NAVBAR_TRANSITION_WHITELIST.has(prop),
        `A3: properti transisi navbar "${prop}" harus termasuk whitelist (${[...NAVBAR_TRANSITION_WHITELIST].join(', ')})`
      );
    }
  }

  // View transition APK tidak boleh menyerap pointer-events
  assert(/html\.rk-vt-apk::view-transition\s*\{[^}]*pointer-events:\s*none/s.test(cssTok), 'css/tokens.css menyetel pointer-events: none pada html.rk-vt-apk::view-transition');

  // Isolasi Desktop
  assert(!cssDesk.includes('rk-haptic') && !cssDesk.includes('data-haptic'), 'css/desktop.css tidak tercemar aturan haptic APK');

  // Service worker >= v38
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 38, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v38');

  // Izin VIBRATE di AndroidManifest.xml (untuk jalur cadangan navigator.vibrate + konsistensi native)
  assert(manifestXml.includes('android.permission.VIBRATE'), 'AndroidManifest.xml memuat izin android.permission.VIBRATE');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 15 (Menu, Haptic, Re-tap, A1-A3) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap15_menu_haptic:', e);
  process.exit(1);
});
