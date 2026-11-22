const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function fireTouch(target, type, clientX, clientY) {
  const w = target.ownerDocument.defaultView;
  const ev = new w.Event(type, { bubbles: true, cancelable: true });
  const pt = { clientX, clientY, pageX: clientX, pageY: clientY };
  Object.defineProperty(ev, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [pt] });
  Object.defineProperty(ev, 'changedTouches', { value: [pt] });
  target.dispatchEvent(ev);
  return ev;
}

function click(el) {
  assert(el, 'elemen klik harus ada');
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function fire(el, type) {
  assert(el, 'elemen event harus ada');
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true }));
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, errs } = t;
  const doc = w.document;

  w.__today = '2026-11-22';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 12000000;
  w.S.items = [
    { id: 1921, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1922, name: 'Listrik', price: 500000, n: 1, unit: 'bulan', start: '2026-11-15', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1923, name: 'Cicilan', price: 1500000, n: 1, unit: 'bulan', start: '2026-11-25', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.sbUser = null;
  w.renderAll();
  w.setShellMode('mobile-app');

  const shellRoot = $('mobile-app-shell');
  const mobShell = shellRoot.querySelector('.mob-shell');
  const mobCss = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  // === 1. Kecepatan animasi line drawing wordmark dicepetin dikit ===
  assert.strictEqual(w.RK_WM_PASS_MS, 1750, `1. RK_WM_PASS_MS dipercepat ke 1750ms (aktual=${w.RK_WM_PASS_MS})`);

  // === 2. PTR khusus tab Rincian: lingkaran muter hilang, bar atas ikut ketarik & sinkron turun-naik ===
  assert(
    /\.mob-shell\[data-mtab-active="rincian"\]\s+\.m-ptr-ind\s*\{[^}]*display:\s*none/s.test(mobCss),
    '2. CSS menyembunyikan .m-ptr-ind khusus di tab rincian'
  );
  assert(
    mobCss.includes('--ptr-hdr-y') && mobCss.includes('data-ptr-pull="1"') && mobCss.includes('is-ptr-snapping'),
    '2. CSS menyediakan mekanisme tarik bar atas --ptr-hdr-y & snap-back di rincian'
  );

  w.switchMobileTab('rincian');
  $('m-main').scrollTop = 0;
  w._rkPtrReset();
  const ptrInd = $('m-ptr-ind');
  const rincianPanel = $('m-tab-rincian');

  // Tarik turun di Rincian -> bar atas ikut turun, #m-ptr-ind tidak dianimasikan
  fireTouch(rincianPanel, 'touchstart', 160, 120);
  fireTouch(rincianPanel, 'touchmove', 160, 120 + 80); // pullY = 40
  assert.strictEqual(mobShell.getAttribute('data-ptr-pull'), '1', '2. Tarik di Rincian menyetel data-ptr-pull="1"');
  const yDown1 = parseFloat(mobShell.style.getPropertyValue('--ptr-hdr-y') || '0');
  assert(yDown1 > 20, `2. Tarik turun di Rincian menggeser --ptr-hdr-y ke bawah (${yDown1}px)`);
  assert.strictEqual(ptrInd.style.getPropertyValue('--ptr-op') || '0', '0', '2. Di Rincian #m-ptr-ind tidak dimunculkan saat tarik');

  // Dorong balik jari ke atas sebelum dilepas -> bar atas naik sinkron mengikuti jari
  fireTouch(rincianPanel, 'touchmove', 160, 120 + 30); // pullY = 15
  const yBack1 = parseFloat(mobShell.style.getPropertyValue('--ptr-hdr-y') || '0');
  assert(yBack1 > 0 && yBack1 < yDown1, `2. Dorong jari ke atas menurunkan --ptr-hdr-y sinkron (${yBack1} < ${yDown1})`);

  // Dorong balik melewati titik awal (dy <= 0) -> bar atas kembali ke 0px tanpa loncat
  fireTouch(rincianPanel, 'touchmove', 160, 110); // dy = -10 -> pullY = 0
  const yZero = parseFloat(mobShell.style.getPropertyValue('--ptr-hdr-y') || '0');
  assert.strictEqual(yZero, 0, '2. Dorong balik melewati startY membawa --ptr-hdr-y ke 0px');

  // Lepas tanpa capai ambang -> tidak refresh, snap kembali bersih
  fireTouch(rincianPanel, 'touchend', 160, 110);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '2. Lepas setelah tarik balik ke atas tidak memicu refresh');
  assert.strictEqual(mobShell.getAttribute('data-ptr-pull'), null, '2. data-ptr-pull dilepas setelah touchend');

  // Tarik di tab selain Rincian (kas) -> #m-ptr-ind tetap aktif, bar atas tidak memakai data-ptr-pull
  w.switchMobileTab('kas');
  $('m-main').scrollTop = 0;
  w._rkPtrReset();
  fireTouch($('m-tab-kas'), 'touchstart', 160, 120);
  fireTouch($('m-tab-kas'), 'touchmove', 160, 120 + 80);
  assert(parseFloat(ptrInd.style.getPropertyValue('--ptr-op') || '0') > 0, '2. Di tab Kas #m-ptr-ind tetap tampil saat tarik');
  assert.strictEqual(mobShell.getAttribute('data-ptr-pull'), null, '2. Di tab Kas bar atas tidak memakai data-ptr-pull');
  fireTouch($('m-tab-kas'), 'touchend', 160, 120 + 80);

  // === 3. Seragamkan 5 kalender Mode Perjalanan dengan Mode Keuangan (.picker-popover melayang) ===
  w.ALL.kas.pr['p-t19b'] = {
    id: 'p-t19b',
    name: 'Trip Tokyo 19b',
    cur: 'JPY',
    rate: 105,
    start: '2026-11-10',
    end: '2026-11-25',
    it: [],
    bk: [],
    ck: [],
    lk: [],
    note: '',
    goal: null,
  };
  w.switchMobileTab('trip');
  w.MOB_STATE.tripId = 'p-t19b';
  w.MOB_STATE.tripView = 'list';
  w.renderMobTrip();
  click($('m-btn-trip-new'));
  assert.strictEqual($('m-kp-start').hasAttribute('data-pk-sheet'), false, '3. m-kp-start memakai popover seragam (bukan bottom sheet)');
  assert.strictEqual($('m-kp-end').hasAttribute('data-pk-sheet'), false, '3. m-kp-end memakai popover seragam (bukan bottom sheet)');
  w.MOB_CAL_VIEW['m-kp-start'] = { y: 2026, m: 10 };
  click($('m-kp-start-trig'));
  const kpStartPop = $('m-kp-start-cal');
  assert(kpStartPop && kpStartPop.classList.contains('picker-popover') && kpStartPop.classList.contains('open'), '3. m-kp-start membuka .picker-popover.open sama seperti Mode Keuangan');
  const calSheetBd = $('m-cal-sheet-backdrop');
  assert(!calSheetBd || !calSheetBd.classList.contains('open'), '3. m-kp-start tidak membuka #m-cal-sheet-backdrop');
  click(kpStartPop.querySelector('[data-mcal-pick="m-kp-start|2026-11-15"]'));
  assert.strictEqual($('m-kp-start').value, '2026-11-15', '3. Memilih tanggal pada popover m-kp-start memperbarui nilai');
  assert.strictEqual(kpStartPop.classList.contains('open'), false, '3. Popover m-kp-start menutup setelah memilih tanggal');

  // m-kp-end tetap membatasi tanggal sebelum Mulai & Android Back menutup popover sebelum menutup sheet trip
  w.MOB_CAL_VIEW['m-kp-end'] = { y: 2026, m: 10 };
  click($('m-kp-end-trig'));
  const kpEndPop = $('m-kp-end-cal');
  assert(kpEndPop && kpEndPop.classList.contains('open'), '3. m-kp-end membuka .picker-popover.open');
  assert.strictEqual(kpEndPop.querySelector('[data-mcal-pick="m-kp-end|2026-11-12"]').disabled, true, '3. m-kp-end tetap menonaktifkan tanggal sebelum Mulai');
  const origCap3 = w.Capacitor;
  w.Capacitor = { isNativePlatform: () => true };
  const backRes1 = w.rkHandleAndroidBack();
  assert(backRes1, '3. Android Back menangani popover kalender terbuka');
  assert.strictEqual(kpEndPop.classList.contains('open'), false, '3. Android Back menutup popover kalender terlebih dulu');
  assert.strictEqual($('m-sheet-trip').classList.contains('open'), true, '3. #m-sheet-trip tetap terbuka setelah Back pertama');
  w.rkHandleAndroidBack();
  assert.strictEqual($('m-sheet-trip').classList.contains('open'), false, '3. Back kedua menutup #m-sheet-trip');
  w.Capacitor = origCap3;

  // Itinerary & Pemesanan memakai .picker-popover.open yang seragam + tetap enforce rentang perjalanan
  w.MOB_STATE.tripView = 'detail';
  w.MOB_STATE.tripSub = 'itin';
  w.renderMobTrip();
  assert.strictEqual($('m-it-day').hasAttribute('data-pk-sheet'), false, '3. m-it-day memakai popover seragam');
  click($('m-it-day-trig'));
  const itPop = $('m-it-day-cal');
  assert(itPop && itPop.classList.contains('open'), '3. m-it-day membuka .picker-popover.open');
  assert.strictEqual(itPop.querySelector('[data-mcal-pick="m-it-day|2026-11-05"]').disabled, true, '3. m-it-day tetap menonaktifkan tanggal luar rentang trip');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(itPop.classList.contains('open'), false, '3. Esc menutup popover kalender Mode Perjalanan');

  w.MOB_STATE.tripSub = 'book';
  w.renderMobTrip();
  assert.strictEqual($('m-bk-start').hasAttribute('data-pk-sheet'), false, '3. m-bk-start memakai popover seragam');
  assert.strictEqual($('m-bk-end').hasAttribute('data-pk-sheet'), false, '3. m-bk-end memakai popover seragam');
  click($('m-bk-start-trig'));
  assert($('m-bk-start-cal') && $('m-bk-start-cal').classList.contains('open'), '3. m-bk-start membuka .picker-popover.open');
  click($('m-bk-end-trig'));
  assert.strictEqual($('m-bk-start-cal').classList.contains('open'), false, '3. Membuka m-bk-end menutup popover m-bk-start');
  assert($('m-bk-end-cal') && $('m-bk-end-cal').classList.contains('open'), '3. m-bk-end membuka .picker-popover.open');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  delete w.ALL.kas.pr['p-t19b'];
  w.MOB_STATE.tripId = null;

  // === 4. Card Proyeksi Arus Kas: hapus Perbesar -> ganti Perlebar + haptic feedback ===
  w.switchMobileTab('rincian');
  const expandBtn = $('m-btn-expand-cf');
  assert(expandBtn, '4. Tombol #m-btn-expand-cf tersedia di card Proyeksi Arus Kas');
  assert(/Perlebar/i.test(expandBtn.textContent) && !/Perbesar/i.test(expandBtn.textContent), `4. Label tombol diganti Perlebar (aktual="${expandBtn.textContent.trim()}")`);
  assert.strictEqual($('m-cf-zoom-wide'), null, '4. Tombol toggle #m-cf-zoom-wide di dalam sheet sudah dihapus');

  click(expandBtn);
  assert($('m-sheet-cf-zoom').classList.contains('open'), '4. Klik Perlebar membuka sheet grafik lebar');
  const zoomSvg = $('m-svg-cf-zoom');
  assert(zoomSvg.classList.contains('is-zoom-wide'), '4. Sheet langsung terbuka dalam mode lebar (is-zoom-wide)');
  assert.strictEqual(zoomSvg.getAttribute('viewBox'), '0 0 920 340', '4. ViewBox grafik langsung mode lebar 920x340');
  assert.strictEqual($('m-cf-zoom-touch-seg').style.display, 'inline-flex', '4. Mode sentuh Garis/Geser langsung tampil');

  // Haptic pada grafik zoom (touch & slider)
  let hLog = [];
  const origCap4 = w.Capacitor;
  let fakeNow = 10000;
  const origDateNow = w.Date.now;
  w.Date.now = () => fakeNow;
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics',
    Plugins: {
      Haptics: {
        impact: (o) => { hLog.push('impact:' + (o && o.style)); return Promise.resolve(); },
        vibrate: (o) => { hLog.push('vibrate:' + (o && o.duration)); return Promise.resolve(); },
      },
    },
  };
  w.rkSetHapticsEnabled(true);

  const zHit = zoomSvg.querySelector('#mz-hit');
  assert(zHit, '4. Hit target #mz-hit tersedia pada grafik Perlebar');
  zoomSvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 920, height: 340, right: 920, bottom: 340 });
  const zNodes = [...zoomSvg.querySelectorAll('.cf-node')].map((c) => ({ x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')) }));
  assert(zNodes.length >= 2, '4. Grafik Perlebar memiliki minimal 2 titik');

  // Hover mouse pasif tidak memicu haptic
  hLog = [];
  zHit.dispatchEvent(new w.MouseEvent('mousemove', { clientX: zNodes[0].x, clientY: zNodes[0].y, bubbles: true }));
  assert.strictEqual(hLog.length, 0, '4. Hover mouse pasif di grafik Perlebar tidak memicu haptic');

  // Sentuh & geser antar titik memicu tick haptic
  fakeNow += 100;
  fireTouch(zHit, 'touchstart', zNodes[0].x, zNodes[0].y);
  assert.strictEqual(hLog.length, 1, '4. Menyentuh titik pertama grafik Perlebar memicu haptic tick');
  fakeNow += 100;
  fireTouch(zHit, 'touchmove', zNodes[1].x, zNodes[0].y);
  assert.strictEqual(hLog.length, 2, '4. Menggeser ke titik berikutnya di grafik Perlebar memicu haptic tick');
  fireTouch(zHit, 'touchend', zNodes[1].x, zNodes[0].y);

  // Slider #m-cf-zoom-scrub memakai data-haptic="slider" & bergetar saat digeser
  const zScrub = $('m-cf-zoom-scrub');
  assert.strictEqual(zScrub.getAttribute('data-haptic'), 'slider', '4. #m-cf-zoom-scrub memiliki data-haptic="slider"');
  hLog = [];
  zScrub.value = '30';
  fireTouch(zScrub, 'touchstart', 50, 10);
  fakeNow += 100;
  zScrub.value = '60';
  fire(zScrub, 'input');
  assert.strictEqual(hLog.length, 1, '4. Menggeser #m-cf-zoom-scrub memicu haptic tick');
  fakeNow += 100;
  zScrub.value = '100';
  fire(zScrub, 'input');
  assert(hLog.length === 2 && hLog[1].startsWith('impact:'), '4. Ujung #m-cf-zoom-scrub memicu haptic edge');
  fireTouch(zScrub, 'touchend', 100, 10);

  w.mobCloseSheet('m-sheet-cf-zoom', true);
  w.Date.now = origDateNow;
  w.Capacitor = origCap4;

  // === 5. Pop up Force Update (Cold Start Only, Lock UI + Auto Download, Force Close on Tidak) ===
  const origCap5 = w.Capacitor;
  const origFetch5 = w.fetch;
  const origBuild5 = Object.assign({}, w.RK_BUILD);
  let exitCalled = 0;
  let dlCalled = 0;

  const mkRel = (run, sha, msg) => ({
    tag_name: 'apk-latest',
    body: `run=${run}\nsha=${sha}\nversionCode=${run}\nbuiltAt=2026-11-22T12:00:00Z\nsha256=\nmsg=${msg}`,
    assets: [{ name: 'renkeu-debug.apk', browser_download_url: 'https://github.com/daffagng4-commits/RencanaKeuangan/releases/download/apk-latest/renkeu-debug.apk' }],
  });

  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => ['App', 'Filesystem', 'ApkInstaller'].includes(n),
    Plugins: {
      App: {
        exitApp: () => { exitCalled += 1; },
        addListener: () => Promise.resolve({ remove: () => {} }),
      },
      Filesystem: {
        mkdir: () => Promise.resolve(),
        readdir: () => Promise.resolve({ files: [] }),
        deleteFile: () => Promise.resolve(),
        addListener: () => Promise.resolve({ remove: () => {} }),
        downloadFile: () => { dlCalled += 1; return new Promise(() => {}); }, // stays downloading
      },
      ApkInstaller: {
        canInstall: () => Promise.resolve({ allowed: true }),
        install: () => Promise.resolve(),
        openInstallSettings: () => Promise.resolve(),
      },
    },
  };
  w.RK_BUILD.id = '20-old';
  w.RK_BUILD.run = '20';
  w.RK_BUILD.sha = 'abc1234';
  w.fetch = async () => ({ ok: true, status: 200, async json() { return mkRel(21, 'def5678', 'Rilis 19b'); } });

  // 5b. Kondisi (b): APK sudah terbuka -> cek update manual / auto biasa TIDAK memunculkan popup force update
  w._rkForceUpdateReset();
  w.localStorage.setItem('rk-apk-last-check', String(Date.now())); // baru saja dicek (< 6 jam)
  await w.rkCheckApkUpdate({ silent: true });
  const fupdBd = $('m-force-upd-backdrop');
  assert(fupdBd, '5. Elemen #m-force-upd-backdrop tersedia di DOM APK');
  assert.strictEqual(fupdBd.classList.contains('open'), false, '5b. Cek update saat APK sudah terbuka tidak memunculkan popup force update');

  // 5a. Kondisi (a): Cold start baru dengan build hijau -> bypass jeda 6 jam & muncul popup di tengah layar
  w._rkForceUpdateReset();
  await w.rkCheckForceUpdateOnColdStart();
  assert.strictEqual(fupdBd.classList.contains('open'), true, '5a. Cold start dengan build baru memunculkan popup force update');
  assert($('m-fupd-dialog').textContent.includes('20') && $('m-fupd-dialog').textContent.includes('21'), '5a. Popup menampilkan info build terpasang dan build terbaru');

  // Popup tidak bisa ditutup klik backdrop, Esc, maupun Android Back
  click(fupdBd);
  assert.strictEqual(fupdBd.classList.contains('open'), true, '5. Klik backdrop tidak menutup popup force update');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(fupdBd.classList.contains('open'), true, '5. Tombol Esc tidak menutup popup force update');
  assert.strictEqual(w.rkHandleAndroidBack(), 'force-update-blocked', '5. Tombol Back Android diblokir saat popup force update terbuka');
  assert.strictEqual(fupdBd.classList.contains('open'), true, '5. Popup tetap terbuka setelah tombol Back');

  // Tombol Tidak -> force close APK via App.exitApp()
  exitCalled = 0;
  click($('m-fupd-no'));
  assert.strictEqual(exitCalled, 1, '5. Tombol Tidak memanggil Capacitor.Plugins.App.exitApp()');

  // Cold start lagi -> klik Update -> arahkan ke card Pengaturan, kunci seluruh UI lain, dan mulai unduh otomatis
  w._rkForceUpdateReset();
  w.switchMobileTab('rincian');
  dlCalled = 0;
  await w.rkCheckForceUpdateOnColdStart();
  assert.strictEqual(fupdBd.classList.contains('open'), true, '5. Popup terbuka kembali pada cold start baru');
  click($('m-fupd-yes'));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(fupdBd.classList.contains('open'), false, '5. Popup menutup setelah klik Update');
  assert.strictEqual(w.MOB_STATE.tab, 'settings', '5. Klik Update mengarahkan ke tab Pengaturan');
  assert.strictEqual(doc.body.getAttribute('data-force-update-lock'), '1', '5. Mode kunci UI data-force-update-lock="1" aktif');
  assert.strictEqual(dlCalled, 1, '5. Klik Update langsung memulai Unduh & Pasang otomatis');

  // Uji kunci total: pindah tab ditolak, PTR ditolak, Android Back ditolak, klik tombol navbar ditolak
  w.switchMobileTab('rincian');
  assert.strictEqual(w.MOB_STATE.tab, 'settings', '5. Pindah tab diblokir selama mode kunci pembaruan');
  click(shellRoot.querySelector('.bn-btn[data-mtab="kas"]'));
  assert.strictEqual(w.MOB_STATE.tab, 'settings', '5. Klik tombol bottom navbar diblokir selama mode kunci pembaruan');
  assert.strictEqual(w.rkHandleAndroidBack(), 'force-update-locked', '5. Tombol Back Android diblokir selama mode kunci pembaruan');
  assert.strictEqual(w.rkMobRefresh(), false, '5. Pull-to-refresh/refresh diblokir selama mode kunci pembaruan');

  // CSS lock guard
  assert(mobCss.includes('data-force-update-lock="1"'), '5. CSS memuat aturan kunci UI data-force-update-lock="1"');
  assert(mobCss.includes('.m-fupd-backdrop') && mobCss.includes('.m-fupd-dialog'), '5. CSS memuat gaya centered dialog force update');

  // Dev build tidak memicu popup force update
  w._rkForceUpdateReset();
  w.RK_BUILD.id = 'dev';
  w.RK_BUILD.run = '0';
  await w.rkCheckForceUpdateOnColdStart();
  assert.strictEqual(fupdBd.classList.contains('open'), false, '5. Build dev lokal tidak memunculkan popup force update');

  // Kembalikan state & cek sw.js >= v44
  w._rkForceUpdateReset();
  w.Capacitor = origCap5;
  w.fetch = origFetch5;
  Object.assign(w.RK_BUILD, origBuild5);

  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 44, `sw.js CACHE_NAME >= rk-cache-v44 (aktual: ${swMatch && swMatch[0]})`);

  assert.strictEqual(errs.length, 0, 'Nol galat JS runtime: ' + errs.join(' | '));
  console.log('OK tahap19b_apk_refinements');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap19b_apk_refinements:', e);
  process.exit(1);
});
