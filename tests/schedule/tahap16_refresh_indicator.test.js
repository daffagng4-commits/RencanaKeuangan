const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

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
    { id: 1601, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1602, name: 'Listrik', price: 450000, n: 1, unit: 'bulan', start: '2026-11-20', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [
    { id: 'tx-16-1', d: '2026-11-05', dir: '+', amt: 5000000, cat: 'Gaji', note: 'Gaji' },
  ];
  w.sbUser = null;
  w.renderAll();

  // A1: sakelar "Getaran sentuh" pulih dari localStorage['rk-haptics'] saat render & mount ulang
  w.localStorage.setItem('rk-haptics', '0');
  w.setShellMode('browser');
  w.setShellMode('mobile-app');
  assert.strictEqual($('m-set-haptic-enabled').checked, false, 'A1: rk-haptics=0 membuat #m-set-haptic-enabled tidak tercentang saat mount awal');
  w.switchMobileTab('settings');
  assert.strictEqual($('m-set-haptic-enabled').checked, false, 'A1: rk-haptics=0 tetap tidak tercentang setelah render Pengaturan');
  w.localStorage.setItem('rk-haptics', '1');
  w.renderMobileApp();
  assert.strictEqual($('m-set-haptic-enabled').checked, true, 'A1: rk-haptics=1 memulihkan #m-set-haptic-enabled menjadi tercentang');
  w.localStorage.removeItem('rk-haptics');
  w.renderMobileApp();
  assert.strictEqual($('m-set-haptic-enabled').checked, true, 'A1: kunci rk-haptics kosong memulihkan bawaan tercentang');

  // A2: nilai kembali rkHaptic(kind) akurat hanya true bila panggilan nyata terjadi
  let impactCalls = 0;
  let vibPluginCalls = 0;
  let navVibCalls = 0;
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics',
    Plugins: {
      Haptics: {
        impact: () => { impactCalls += 1; return Promise.resolve(); },
        vibrate: () => { vibPluginCalls += 1; return Promise.resolve(); },
      },
    },
  };
  Object.defineProperty(w.navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: () => { navVibCalls += 1; return true; },
  });

  const origNow = w.Date.now;
  let fakeNow = Date.now() + 200000;
  w.Date.now = () => fakeNow;

  assert.strictEqual(w.rkHaptic('arm'), true, 'A2: rkHaptic("arm") dengan plugin mengembalikan true');
  assert.strictEqual(w.rkHaptic('refresh'), true, 'A2: rkHaptic("refresh") dengan plugin mengembalikan true');
  assert.strictEqual(w.rkHaptic('edge'), true, 'A2: rkHaptic("edge") dengan plugin mengembalikan true');
  assert.strictEqual(w.rkHaptic('tick'), true, 'A2: rkHaptic("tick") pertama mengembalikan true');
  assert.strictEqual(w.rkHaptic('tick'), false, 'A2: rkHaptic("tick") dalam jendela throttle mengembalikan false');
  fakeNow += 50;
  assert.strictEqual(w.rkHaptic('unknown_kind'), false, 'A2: jenis tidak dikenal mengembalikan false');
  assert.strictEqual(navVibCalls, 0, 'A2: jenis tidak dikenal tidak memicu navigator.vibrate');

  // Plugin ada tetapi metode tidak tersedia -> false (tidak menipu jadi true)
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics',
    Plugins: { Haptics: {} },
  };
  assert.strictEqual(w.rkHaptic('arm'), false, 'A2: plugin tanpa metode impact mengembalikan false');
  assert.strictEqual(w.rkHaptic('tick'), false, 'A2: plugin tanpa metode vibrate/impact mengembalikan false');

  // Fallback navigator.vibrate -> true untuk jenis sah, false untuk jenis tak dikenal
  w.Capacitor = null;
  assert.strictEqual(w.rkHaptic('refresh'), true, 'A2: fallback navigator.vibrate mengembalikan true');
  assert.strictEqual(navVibCalls, 1, 'A2: fallback navigator.vibrate terpanggil 1x');
  assert.strictEqual(w.rkHaptic('tidak-ada'), false, 'A2: jenis tak dikenal di jalur fallback mengembalikan false');
  assert.strictEqual(navVibCalls, 1, 'A2: jenis tak dikenal tidak memanggil navigator.vibrate');

  // Tanpa plugin dan tanpa navigator.vibrate -> false
  const savedNavVib = w.navigator.vibrate;
  Object.defineProperty(w.navigator, 'vibrate', { configurable: true, writable: true, value: undefined });
  assert.strictEqual(w.rkHaptic('refresh'), false, 'A2: tanpa plugin dan tanpa navigator.vibrate mengembalikan false');

  // Sakelar mati -> false
  Object.defineProperty(w.navigator, 'vibrate', { configurable: true, writable: true, value: savedNavVib });
  w.localStorage.setItem('rk-haptics', '0');
  assert.strictEqual(w.rkHaptic('refresh'), false, 'A2: sakelar mati mengembalikan false');
  w.localStorage.setItem('rk-haptics', '1');

  // Mode Browser -> false
  w.setShellMode('browser');
  assert.strictEqual(w.rkHaptic('refresh'), false, 'A2: Browser Mode mengembalikan false');
  w.setShellMode('mobile-app');

  // Pulihkan spy Capacitor normal
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics',
    Plugins: {
      Haptics: {
        impact: () => { impactCalls += 1; return Promise.resolve(); },
        vibrate: () => { vibPluginCalls += 1; return Promise.resolve(); },
      },
    },
  };

  // Struktur DOM & SVG wordmark 6 huruf (tanpa .m-ptr-spin maupun elemen shimmer lama)
  const shellRoot = $('mobile-app-shell');
  assert.strictEqual(typeof w.rkSetRefreshIndicator, 'function', 'B1: window.rkSetRefreshIndicator tersedia');
  assert(!doc.querySelector('.m-ptr-spin'), 'B3: elemen spinner .m-ptr-spin sudah dihapus dari DOM');
  assert($('m-ptr-ind') && $('m-ptr-ind').querySelector('.m-ptr-ico'), 'B3: panah penanda tarik .m-ptr-ico tetap dipertahankan');
  const wm = shellRoot.querySelector('svg.mt-wordmark');
  assert(wm, 'B2: svg.mt-wordmark tersedia di header');
  assert.strictEqual(wm.getAttribute('role'), 'img', 'B2: wordmark mempertahankan role="img"');
  assert.strictEqual(wm.getAttribute('aria-label'), 'RenKeu', 'B2: wordmark mempertahankan aria-label="RenKeu"');
  const wmLetters = [...wm.querySelectorAll('g.mt-wm-letter')];
  assert.strictEqual(wmLetters.length, 6, 'B2: wordmark memuat 6 grup huruf berurutan (Pacifico Tahap 18)');
  assert(wmLetters.every((g) => g.getAttribute('aria-hidden') === 'true'), 'B2: semua grup huruf dekoratif memiliki aria-hidden="true"');

  // Render ulang berulang tidak menggandakan grup huruf atau ID
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(wm.querySelectorAll('g.mt-wm-letter').length, 6, 'B2: tepat 6 grup huruf setelah render ulang');
  assert($('m-refresh-status') && $('m-refresh-status').getAttribute('role') === 'status', 'B5: wilayah role="status" untuk pembaca layar tersedia');

  // Helpers sentuh & jam tiruan scheduler tunggal untuk menguji lintasan & pengaman maksimum 20 detik
  const fireTouch = (el, type, clientX, clientY) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX, clientY };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
    return ev;
  };
  const realClick = (el) => {
    el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  // Pantau transisi data-refreshing (nyala/mati) memakai MutationObserver pada #mobile-app-shell.
  const scheduledTimers = [];
  const origClock = w._rkWmClock;
  const origSetTimeout = w.setTimeout;
  const origClearTimeout = w.clearTimeout;
  let timerSeq = 1;
  const pushJob = (fn, ms) => {
    const id = timerSeq++;
    const entry = { id, fn, due: fakeNow + (Number(ms) || 0), cleared: false };
    scheduledTimers.push(entry);
    return id;
  };
  const cancelJob = (id) => {
    const found = scheduledTimers.find((x) => x.id === id);
    if (found) found.cleared = true;
  };
  w.setTimeout = pushJob;
  w.clearTimeout = cancelJob;
  w._rkWmClock = {
    now: () => fakeNow,
    raf: (fn) => pushJob(fn, 16),
    cancelRaf: cancelJob,
    setTimeout: pushJob,
    clearTimeout: cancelJob,
  };
  const advanceTime = (ms) => {
    const target = fakeNow + ms;
    while (true) {
      const next = scheduledTimers
        .filter((x) => !x.cleared && x.due <= target)
        .sort((a, b) => a.due - b.due)[0];
      if (!next) break;
      next.cleared = true;
      fakeNow = next.due;
      next.fn(fakeNow);
    }
    fakeNow = target;
  };
  const flushMicrotasks = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };

  const stateChanges = [];
  const obs = new w.MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-refreshing') {
        stateChanges.push(m.oldValue === '1' ? 'off' : 'on');
      }
    }
  });
  obs.observe(shellRoot, { attributes: true, attributeOldValue: true, attributeFilter: ['data-refreshing'] });

  // PTR kecil / batal -> indikator tidak menyala
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  stateChanges.length = 0;
  fireTouch($('m-tab-rincian'), 'touchstart', 160, 120);
  fireTouch($('m-tab-rincian'), 'touchmove', 160, 180);
  fireTouch($('m-tab-rincian'), 'touchend', 160, 180);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'PTR kecil tidak menyalakan indikator refresh');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), null, 'PTR kecil tidak menyetel aria-busy');
  advanceTime(300);

  // PTR melewati ambang -> menyala selama satu lintasan penuh + finale (~2660ms) lalu berhenti otomatis
  w._rkPtrReset();
  stateChanges.length = 0;
  fireTouch($('m-tab-rincian'), 'touchstart', 160, 120);
  fireTouch($('m-tab-rincian'), 'touchmove', 160, 250);
  fireTouch($('m-tab-rincian'), 'touchend', 160, 250);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'PTR dilepas menyalakan data-refreshing="1"');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), 'true', 'Saat refreshing, #m-main memiliki aria-busy="true"');
  assert.strictEqual($('m-refresh-status').textContent, 'Menyegarkan data', 'Pengumuman pembaca layar tampil saat mulai refresh');
  advanceTime(1500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Mode lokal: indikator tetap aktif selama lintasan menulis berlangsung');
  advanceTime(1300);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Mode lokal: indikator mati setelah lintasan + finale selesai');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), null, 'Setelah selesai, aria-busy dilepas');

  // Re-tap 10x beruntun pada tiap tab (Rincian, Transaksi, Jadwal): tepat 1x nyala & 1x mati per rangkaian
  const bnav = shellRoot.querySelector('.mob-bottom-nav');
  for (const tid of ['rincian', 'kas', 'jadwal']) {
    w.switchMobileTab(tid);
    $('m-main').scrollTop = 0;
    w.scrollY = 0;
    w._rkPtrReset();
    await flushMicrotasks();
    stateChanges.length = 0;
    const btn = bnav.querySelector(`[data-mtab="${tid}"]`);
    for (let k = 0; k < 10; k++) {
      realClick(btn);
      advanceTime(25);
    }
    await flushMicrotasks();
    assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', `Re-tap ${tid} 10x: indikator aktif`);
    advanceTime(2600);
    await flushMicrotasks();
    assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, `Re-tap ${tid} 10x: indikator berhenti setelah lintasan + finale`);
    assert.deepStrictEqual(stateChanges, ['on', 'off'], `Re-tap ${tid} 10x: hanya 1 transisi nyala dan 1 transisi mati (bukan kedip 10x)`);
  }

  // Jalur akhir cloud: sukses, reject, pengaman 20 detik, pindah tab di tengah refresh, pengguna sama (A1), logout, _rkPtrReset, unmountMobileShell
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origPull = w.pull;
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t16-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  // 1) pull() sukses lambat + syncMobileCloudUI pengguna sama (A1) -> tetap aktif sampai selesai & sampai lintasan + finale usai
  let resPull = null;
  w.pull = () => new Promise((r) => { resPull = () => { w._rkLastPullOk = true; r(); }; });
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Cloud pull lambat: indikator aktif');
  w.syncMobileCloudUI();
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'A1: syncMobileCloudUI pengguna sama tidak menghentikan indikator');
  advanceTime(1500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Cloud pull lambat: tetap aktif selama pull belum selesai');
  resPull();
  await flushMicrotasks();
  advanceTime(1350);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Cloud pull lambat: berhenti setelah lintasan + finale selesai');

  // 2) pull() reject -> langsung berhenti bersih tanpa finale kuning
  let rejPull = null;
  w.pull = () => new Promise((_, rej) => { rejPull = () => rej(new Error('network down')); });
  w._rkPtrReset();
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Cloud reject: indikator aktif');
  rejPull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Cloud reject: indikator langsung berhenti bersih');

  // 3) pull() tidak pernah selesai -> berhenti oleh pengaman 20 detik
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Timeout 20s: indikator aktif');
  advanceTime(19500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Timeout 20s: belum berhenti pada 19,5 detik');
  advanceTime(600);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Timeout 20s: berhenti otomatis pada batas pengaman 20 detik');

  // 4) pindah tab di tengah refresh -> refresh tetap selesai lalu indikator berhenti
  let resTabPull = null;
  w.pull = () => new Promise((r) => { resTabPull = () => { w._rkLastPullOk = true; r(); }; });
  w._rkPtrReset();
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Pindah tab: aktif saat mulai');
  w.switchMobileTab('jadwal');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Pindah tab: tetap aktif sampai pull selesai');
  advanceTime(900);
  resTabPull();
  await flushMicrotasks();
  advanceTime(1950);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Pindah tab: berhenti setelah pull selesai dan lintasan usai');

  // 5) logout / ganti pengguna -> indikator berhenti
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  realClick(bnav.querySelector('[data-mtab="jadwal"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Logout: aktif sebelum keluar');
  w.sbUser = null;
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Logout: indikator berhenti saat pengguna keluar');

  // 6) _rkPtrReset() & unmountMobileShell() -> indikator berhenti & timer dibersihkan
  w.sbUser = { id: 'u-t16-b', email: 'b@example.com' };
  w.syncMobileCloudUI();
  realClick(bnav.querySelector('[data-mtab="jadwal"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', '_rkPtrReset: aktif sebelum reset');
  w._rkPtrReset();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkPtrReset menghentikan indikator');
  realClick(bnav.querySelector('[data-mtab="jadwal"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'unmountMobileShell: aktif sebelum unmount');
  w.unmountMobileShell();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'unmountMobileShell menghentikan indikator dan membersihkan atribut');

  // Pulihkan mock
  obs.disconnect();
  w._rkWmClock = origClock;
  w.setTimeout = origSetTimeout;
  w.clearTimeout = origClearTimeout;
  w.Date.now = origNow;
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;

  // Audit statis CSS, token, isolasi Desktop, dan sw.js >= v41
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  assert(!cssMob.includes('.m-ptr-spin'), 'CSS: aturan .m-ptr-spin sudah dihapus dari css/mobile.css');
  assert(!cssMob.includes('rkPtrSpin'), 'CSS: keyframes rkPtrSpin sudah dihapus dari css/mobile.css');
  assert(cssTok.includes('--wm-dead') && cssTok.includes('--wm-lit') && cssTok.includes('--wm-flash') && cssTok.includes('--dur-wm-reset'), 'Token wordmark Tahap 18 ada di css/tokens.css');
  assert(/--dur-wm-fade:\s*0\.001ms/.test(cssTok) && /--dur-wm-reset:\s*0\.001ms/.test(cssTok), 'Token durasi wordmark direduksi ke 0.001ms pada prefers-reduced-motion');
  assert(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*\.mt-wm-flash[\s\S]*opacity:\s*0/i.test(cssMob), 'CSS: prefers-reduced-motion mematikan cahaya/kilat wordmark saat refresh');

  assert(!cssDesk.includes('rkWmSweep') && !cssDesk.includes('mt-wm-') && !cssDesk.includes('data-refreshing'), 'Isolasi Desktop: css/desktop.css bebas aturan wordmark APK');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 41, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v41');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 16 (A1, A2, Indikator Wordmark, PTR/Re-tap) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap16_refresh_indicator:', e);
  process.exit(1);
});
