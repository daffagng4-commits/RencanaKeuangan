const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function approx(actual, expected, tol = 1e-3, msg = '') {
  assert(
    Math.abs(actual - expected) <= tol,
    `${msg} (actual=${actual}, expected=${expected}, tol=${tol})`
  );
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
    { id: 1801, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1802, name: 'Listrik', price: 450000, n: 1, unit: 'bulan', start: '2026-11-20', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [
    { id: 'tx-18-1', d: '2026-11-05', dir: '+', amt: 5000000, cat: 'Gaji', note: 'Gaji' },
  ];
  w.sbUser = null;
  w.renderAll();
  w.setShellMode('mobile-app');

  const shellRoot = $('mobile-app-shell');

  // 1. Fungsi murni rkWmStrokeState(P, segs) (diperbarui setara ke kontrak stroke Tahap 19)
  assert.strictEqual(typeof w.rkWmStrokeState, 'function', 'window.rkWmStrokeState tersedia');
  const flatSegs = [];
  for (let li = 0; li < w.RK_WM_STROKES.length; li++) {
    for (let ci = 0; ci < w.RK_WM_STROKES[li].length; ci++) flatSegs.push(w.RK_WM_STROKES[li][ci]);
  }
  assert.strictEqual(flatSegs.length, 9, 'Total 9 kontur stroke Pacifico');
  assert([...w.rkWmStrokeState(0, flatSegs).fracs].every((v) => v === 0), 'rkWmStrokeState(0) semua 0');
  assert([...w.rkWmStrokeState(1, flatSegs).fracs].every((v) => v === 1), 'rkWmStrokeState(1) semua 1');
  assert([...w.rkWmStrokeState(-0.4, flatSegs).fracs].every((v) => v === 0), 'rkWmStrokeState menjepit P < 0 ke 0');
  assert([...w.rkWmStrokeState(1.8, flatSegs).fracs].every((v) => v === 1), 'rkWmStrokeState menjepit P > 1 ke 1');

  let prevFracs = [...w.rkWmStrokeState(0, flatSegs).fracs];
  let prevLenSum = 0;
  for (let k = 1; k <= 120; k++) {
    const p = k / 120;
    const cur = [...w.rkWmStrokeState(p, flatSegs).fracs];
    for (let i = 0; i < flatSegs.length; i++) {
      assert(cur[i] >= prevFracs[i] - 1e-12, `rkWmStrokeState monoton naik pada kontur ${i} di p=${p}`);
    }
    const lenSum = cur.reduce((a, f, idx) => a + f * flatSegs[idx].len, 0);
    assert(lenSum > prevLenSum + 1e-4, `rkWmStrokeState tanpa plateau di p=${p} (turunan positif)`);
    prevFracs = cur;
    prevLenSum = lenSum;
  }

  // 2. Struktur font Pacifico, kontur stroke, aksesibilitas, keunikan ID, tanpa font web
  assert(Array.isArray(w.RK_WM_GLYPHS) && w.RK_WM_GLYPHS.length === 6, 'RK_WM_GLYPHS berisi 6 path glyph (R,e,n,K,e,u)');
  assert(Array.isArray(w.RK_WM_STROKES) && w.RK_WM_STROKES.length === 6, 'RK_WM_STROKES berisi 6 entri huruf');
  assert.strictEqual(typeof w.RK_WM_VIEWBOX, 'string', 'RK_WM_VIEWBOX berupa string');
  for (let i = 0; i < 6; i++) {
    const d = w.RK_WM_GLYPHS[i];
    assert(typeof d === 'string' && d.length > 40 && !/NaN|Infinity/i.test(d), `glyph ${i} valid dan non-kosong`);
  }
  const vbParts = w.RK_WM_VIEWBOX.split(/\s+/).map(Number);
  assert.strictEqual(vbParts.length, 4, 'RK_WM_VIEWBOX punya 4 angka');

  const wm = shellRoot.querySelector('svg.mt-wordmark');
  assert(wm, 'svg.mt-wordmark tersedia');
  assert.strictEqual(wm.getAttribute('role'), 'img', 'wordmark role="img"');
  assert.strictEqual(wm.getAttribute('aria-label'), 'RenKeu', 'wordmark aria-label="RenKeu"');
  assert.strictEqual(wm.getAttribute('viewBox'), w.RK_WM_VIEWBOX, 'viewBox SVG sama dengan RK_WM_VIEWBOX');
  assert(!wm.querySelector('text, .mt-wm-clip-rect, filter, feGaussianBlur'), 'wordmark bebas <text>, rect klip lama, dan filter blur');

  const letterGroups = [...wm.querySelectorAll('g.mt-wm-letter')];
  assert.strictEqual(letterGroups.length, 6, 'tepat 6 grup huruf g.mt-wm-letter');
  letterGroups.forEach((g, idx) => {
    assert.strictEqual(g.getAttribute('data-wm-idx'), String(idx), `grup huruf ${idx} berurutan`);
    assert.strictEqual(g.getAttribute('aria-hidden'), 'true', `grup huruf ${idx} aria-hidden="true"`);
    assert(g.querySelector('path.mt-wm-white') && g.querySelector('path.mt-wm-dead') && g.querySelector('path.mt-wm-flash'), `grup huruf ${idx} punya 3 lapisan isi`);
  });
  assert.strictEqual(wm.querySelectorAll('g.mt-wm-strokes path.mt-wm-drawn').length, 9, 'tepat 9 path .mt-wm-drawn');
  assert(!doc.querySelector('.m-ptr-spin, .mt-wm-beam, .mt-wm-shimmer-clip, #rk-wm-clip, #rk-wm-grad'), 'elemen sisa Tahap 16 & spinner PTR sudah hilang');

  // Render ulang berulang tidak menggandakan grup huruf / kontur stroke dan ID tetap unik
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-strokes path.mt-wm-drawn').length, 9, 'tepat 9 path .mt-wm-drawn setelah render ulang');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter').length, 6, 'tepat 6 grup huruf setelah render ulang');
  assert.strictEqual(doc.querySelectorAll('#m-refresh-status').length, 1, '#m-refresh-status tetap unik');

  // 3. Abstraksi jam tiruan & scheduler tunggal
  let fakeNow = 100000;
  let rafSeq = 1;
  let toSeq = 1;
  const rafQueue = [];
  const toQueue = [];
  const origClock = w._rkWmClock;
  const origDateNow = w.Date.now;

  w.Date.now = () => fakeNow;
  w._rkWmClock = {
    now: () => fakeNow,
    raf: (fn) => {
      const id = rafSeq++;
      rafQueue.push({ id, fn, due: fakeNow + 16, cleared: false });
      return id;
    },
    cancelRaf: (id) => {
      const item = rafQueue.find((x) => x.id === id);
      if (item) item.cleared = true;
    },
    setTimeout: (fn, ms) => {
      const id = toSeq++;
      toQueue.push({ id, fn, due: fakeNow + (Number(ms) || 0), cleared: false });
      return id;
    },
    clearTimeout: (id) => {
      const item = toQueue.find((x) => x.id === id);
      if (item) item.cleared = true;
    },
  };

  const activeRafCount = () => rafQueue.filter((x) => !x.cleared).length;
  const activeTimeoutCount = () => toQueue.filter((x) => !x.cleared).length;
  const activeTotalCount = () => activeRafCount() + activeTimeoutCount();

  const advance = (ms) => {
    const target = fakeNow + ms;
    while (true) {
      let next = null;
      for (const q of [rafQueue, toQueue]) {
        for (const item of q) {
          if (!item.cleared && item.due <= target) {
            if (!next || item.due < next.due) next = item;
          }
        }
      }
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

  // Pantau transisi data-refreshing dan data-wm-finale lewat MutationObserver
  const refEvents = [];
  const finaleEvents = [];
  const obs = new w.MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-refreshing') {
        const wasOn = m.oldValue === '1';
        const nowOn = !wasOn;
        refEvents.push(nowOn ? 'on' : 'off');
      } else if (m.attributeName === 'data-wm-finale') {
        const wasOn = m.oldValue === '1';
        finaleEvents.push(!wasOn ? 'start' : 'end');
      }
    }
  });
  obs.observe(shellRoot, { attributes: true, attributeOldValue: true, attributeFilter: ['data-refreshing', 'data-wm-finale'] });

  const getDrawnFracs = () => [...shellRoot.querySelectorAll('svg.mt-wordmark path.mt-wm-drawn')].map((p) => (p.style.opacity === '0' ? 0 : 1 - Number(p.style.strokeDashoffset || '1')));

  // 4. Keadaan idle & render garis kontur lewat helper drag
  w._rkPtrReset();
  assert.strictEqual(activeTotalCount(), 0, 'Saat idle tidak ada rAF/timer berjalan');
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Idle: data-wm-mode null');

  // 5. Tarikan jari (drag, dua arah, zona mati 4px, batal return, commit, touchcancel, overlay, excluded)
  const panel = $('m-tab-rincian');
  let hapticLog = [];
  const origCap = w.Capacitor;
  w.localStorage.setItem('rk-haptics', '1');
  w.Capacitor = {
    isNativePlatform: () => true,
    isPluginAvailable: (n) => n === 'Haptics',
    Plugins: {
      Haptics: {
        impact: (o) => { hapticLog.push(o && o.style ? o.style : 'IMPACT'); return Promise.resolve(); },
        vibrate: () => { hapticLog.push('VIB'); return Promise.resolve(); },
      },
    },
  };

  // 5a. Zona mati 4px (pullY = 3 -> dy = 6): tetap idle
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 106);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Zona mati 4px: belum masuk mode drag');
  assert.strictEqual(w._rkWmState().p, 0, 'Zona mati 4px: P tetap 0');
  fireTouch(panel, 'touchend', 160, 106);

  // 5b. Tarik bertahap 0, 13, 26, 39, 52, 90 px (dy = pullY * 2)
  hapticLog = [];
  fireTouch(panel, 'touchstart', 160, 100);
  const checkpoints = [
    { pullY: 13, p: 0.25 },
    { pullY: 26, p: 0.50 },
    { pullY: 39, p: 0.75 },
    { pullY: 52, p: 1.00 },
    { pullY: 90, p: 1.00 },
  ];
  for (const cp of checkpoints) {
    fireTouch(panel, 'touchmove', 160, 100 + cp.pullY * 2);
    assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'drag', `pullY=${cp.pullY}: mode drag aktif`);
    assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, `pullY=${cp.pullY}: data-refreshing tidak aktif saat sekadar menarik`);
    assert.strictEqual($('m-main').getAttribute('aria-busy'), null, `pullY=${cp.pullY}: aria-busy tidak aktif saat sekadar menarik`);
    approx(w._rkWmState().p, cp.p, 1e-3, `pullY=${cp.pullY} -> P=${cp.p}`);
    const expectedFracs = [...w.rkWmStrokeState(cp.p, flatSegs).fracs];
    const actualFracs = getDrawnFracs();
    for (let i = 0; i < flatSegs.length; i++) {
      approx(actualFracs[i], expectedFracs[i], 1e-3, `pullY=${cp.pullY} kontur ${i} stroke frac`);
    }
  }
  // Mundur ke 26 px -> P sama persis dengan saat maju ke 26 px (0.50), tanpa histeresis
  fireTouch(panel, 'touchmove', 160, 100 + 26 * 2);
  approx(w._rkWmState().p, 0.50, 1e-3, 'Mundur ke pullY=26 menghasilkan P=0.50 identik');
  const revFracs = getDrawnFracs();
  const expHalfFracs = [...w.rkWmStrokeState(0.5, flatSegs).fracs];
  expHalfFracs.forEach((exp, i) => approx(revFracs[i], exp, 1e-3, `Mundur ke 26px kontur ${i} stroke frac`));

  // Lepas di bawah ambang (pullY=26 < 52): masuk mode return, kembali mulus ke 0, lalu idle tanpa refresh
  hapticLog = [];
  fireTouch(panel, 'touchend', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'return', 'Lepas di bawah ambang masuk mode return');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Lepas di bawah ambang tidak menyalakan data-refreshing');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), null, 'Lepas di bawah ambang tidak menyalakan aria-busy');
  assert.strictEqual(hapticLog.length, 0, 'Lepas di bawah ambang tidak memicu haptic refresh');
  advance(80);
  const midP = w._rkWmState().p;
  assert(midP < 0.5 && midP >= 0, `Mode return menurunkan P secara bertahap (midP=${midP})`);
  advance(260);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Setelah return selesai kembali ke idle');
  assert.strictEqual(w._rkWmState().p, 0, 'Setelah return selesai P = 0');
  assert.strictEqual(activeTotalCount(), 0, 'Setelah return selesai loop berhenti total');

  // 5c. touchcancel -> batal langsung tanpa refresh
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 30 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'drag', 'Sebelum touchcancel masuk drag');
  fireTouch(panel, 'touchcancel', 160, 100 + 30 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'touchcancel langsung membersihkan mode drag ke idle');
  assert.strictEqual(activeTotalCount(), 0, 'touchcancel tidak menyisakan loop');

  // 5d. Target dikecualikan (.mob-bottom-nav) & overlay terbuka -> tanpa efek tarik
  const bnav = shellRoot.querySelector('.mob-bottom-nav');
  fireTouch(bnav, 'touchstart', 160, 650);
  fireTouch(bnav, 'touchmove', 160, 750);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Target dikecualikan tidak memicu efek tarik wordmark');
  fireTouch(bnav, 'touchend', 160, 750);

  const pop = $('m-acct-popover');
  pop.classList.add('open');
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 220);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Overlay terbuka tidak memicu efek tarik wordmark');
  fireTouch(panel, 'touchend', 160, 220);
  pop.classList.remove('open');

  // 6. Refresh lokal cepat via PTR (dilepas di atas ambang -> arm 1x, refresh 1x, abu-abu -> P 0..1 kontinu -> finale 1x -> idle)
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  hapticLog = [];
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 60 * 2);
  assert.strictEqual(hapticLog.length, 1, 'Melewati ambang memicu haptic arm 1x');
  fireTouch(panel, 'touchend', 160, 100 + 60 * 2);
  assert.strictEqual(hapticLog.length, 2, 'Melepas di atas ambang memicu haptic refresh 1x (total 2 dengan arm)');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Refresh dimulai: data-refreshing="1"');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), 'true', 'Refresh dimulai: aria-busy="true"');
  assert.strictEqual($('m-refresh-status').textContent, 'Menyegarkan data', 'Pengumuman screen reader aktif');

  // Fase reset/fade-in ke abu-abu (~160ms), lalu lintasan kontinu 0 -> 1 dalam RK_WM_PASS_MS (2000ms)
  const passMs = w.RK_WM_PASS_MS;
  assert(passMs >= 1600 && passMs <= 2400, `RK_WM_PASS_MS dalam kisaran nyaman (${passMs})`);
  advance(180);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'Masuk fase run setelah fade-in abu-abu');
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Belum ada finale saat mulai lintasan');

  let prevRunP = w._rkWmState().p;
  for (const frac of [0.25, 0.5, 0.75]) {
    advance(passMs * 0.25);
    const curP = w._rkWmState().p;
    assert(curP > prevRunP, `P terus naik kontinu pada ${(frac * 100).toFixed(0)}% (prev=${prevRunP}, cur=${curP})`);
    assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, `Tidak ada finale sebelum P=1 (di ${(frac * 100).toFixed(0)}%)`);
    prevRunP = curP;
  }

  // Selesaikan lintasan -> masuk finale
  advance(passMs * 0.25 + 32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'Setelah P=1, masuk fase finale kuning');
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'in', 'Awal finale: flash in');
  advance(140);
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'out', 'Kilat kuning memudar ke putih (out)');
  advance(420);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Setelah finale selesai, kembali idle');
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'data-wm-finale dilepas');
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'data-wm-mode dilepas');
  assert.strictEqual(activeTotalCount(), 0, 'Semua loop & timer bersih saat idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'PTR lokal: tepat 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'PTR lokal: tepat 1x finale');

  // 7. Tarikan saat refresh berjalan tidak mengganggu lintasan berjalan
  w._rkPtrReset();
  fakeNow += 2000; // lewati cooldown PTR
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(180 + passMs * 0.4);
  const pBeforeMidDrag = w._rkWmState().p;
  assert(pBeforeMidDrag > 0.3 && pBeforeMidDrag < 0.6, 'Sedang di tengah lintasan run');
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'Tarikan saat refresh berjalan tidak memindah mode ke drag');
  approx(w._rkWmState().p, pBeforeMidDrag, 0.05, 'Tarikan saat refresh berjalan tidak mengubah P lintasan');
  fireTouch(panel, 'touchend', 160, 100 + 26 * 2);
  advance(passMs + 700);
  await flushMicrotasks();

  // 8. 10x re-tap di tiap tab: satu lintasan tanpa restart, 1x on/off, 1x finale
  for (const tid of ['rincian', 'kas', 'jadwal']) {
    w.switchMobileTab(tid);
    $('m-main').scrollTop = 0;
    w.scrollY = 0;
    w._rkPtrReset();
    await flushMicrotasks();
    refEvents.length = 0;
    finaleEvents.length = 0;
    const btn = bnav.querySelector(`[data-mtab="${tid}"]`);
    realClick(btn);
    advance(180 + 400);
    const pMid = w._rkWmState().p;
    assert(pMid > 0.15, `Re-tap ${tid}: lintasan sudah berjalan (p=${pMid})`);
    for (let k = 0; k < 9; k++) {
      realClick(btn);
      advance(20);
    }
    assert(w._rkWmState().p >= pMid, `Re-tap ${tid} 10x: P tidak me-restart kembali ke 0`);
    advance(passMs + 700);
    await flushMicrotasks();
    assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, `Re-tap ${tid} 10x: selesai kembali idle`);
    assert.deepStrictEqual(refEvents, ['on', 'off'], `Re-tap ${tid} 10x: 1x on dan 1x off`);
    assert.deepStrictEqual(finaleEvents, ['start', 'end'], `Re-tap ${tid} 10x: finale 1x`);
  }

  // 9. Ketukan saat finale -> menghentikan finale dan memulai siklus baru dari abu-abu (P = 0)
  w.switchMobileTab('rincian');
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(180 + passMs + 50);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'Berada di tengah finale');
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Ketukan saat finale langsung menghentikan finale');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Siklus baru langsung aktif');
  assert.strictEqual(w._rkWmState().p, 0, 'Siklus baru mulai dari P = 0');
  advance(180 + passMs + 600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Siklus baru selesai bersih');

  // 10. Cloud pull lambat (loop lintasan) + A1 same-user syncMobileCloudUI
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origPull = w.pull;
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t18-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  let resolvePull = null;
  w.pull = () => new Promise((r) => { resolvePull = () => { w._rkLastPullOk = true; r(); }; });
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Cloud lambat: aktif');
  // A1: panggil ulang syncMobileCloudUI untuk user sama saat pull() pending -> TIDAK boleh mematikan indikator
  w.syncMobileCloudUI();
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'A1: syncMobileCloudUI user sama tidak menghentikan indikator');

  // Lewati lintasan 1 penuh + jeda reset -> mulai lintasan 2 tanpa finale
  advance(180 + passMs + 32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Pull masih berjalan: tidak finale di akhir lintasan 1');
  advance(260);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'Masuk lintasan 2 saat pull belum selesai');
  assert(w._rkWmState().p < 0.3, `Lintasan 2 mengulang dari awal (p=${w._rkWmState().p})`);

  // Selesaikan pull di tengah lintasan 2 -> lanjut sampai P=1 lalu finale
  resolvePull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Pull selesai di tengah lintasan 2: finale menunggu P=1');
  advance(passMs + 650);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Cloud lambat selesai kembali idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'Cloud lambat: 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'Cloud lambat: tepat 1x finale');

  // 11. Jalur non-sukses (reject, _rkLastPullOk=false, 20 detik, logout, _rkPtrReset, unmountMobileShell): TANPA kuning
  // 11a. pull() reject
  let rejPull = null;
  w.pull = () => new Promise((_, rej) => { rejPull = () => rej(new Error('offline')); });
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(400);
  rejPull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'pull() reject: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'pull() reject: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, 'pull() reject: semua loop/timer bersih');

  // 11b. _rkLastPullOk === false
  w.pull = () => { w._rkLastPullOk = false; w._rkLastPullErr = 'timeout'; return Promise.resolve(); };
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkLastPullOk=false: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, '_rkLastPullOk=false: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, '_rkLastPullOk=false: loop/timer bersih');

  // 11c. Pengaman 20 detik
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(19500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Timeout 20s: masih aktif pada 19,5 detik');
  advance(600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Timeout 20s: berhenti otomatis');
  assert.strictEqual(finaleEvents.length, 0, 'Timeout 20s: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, 'Timeout 20s: loop/timer bersih');

  // 11d. Logout / ganti pengguna
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(400);
  w.sbUser = null;
  w.syncMobileCloudUI();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Logout: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'Logout: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, 'Logout: loop/timer bersih');

  // 11e. _rkPtrReset()
  w.sbUser = { id: 'u-t18-b', email: 'b@example.com' };
  w.syncMobileCloudUI();
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(500);
  w._rkPtrReset();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkPtrReset: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, '_rkPtrReset: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, '_rkPtrReset: loop/timer bersih');

  // 12. Reduced motion: refresh abu-abu statis (tanpa lintasan & tanpa kuning), tarik jari tetap mengikuti jari
  w.sbUser = null;
  w.syncMobileCloudUI();
  const origMatchMedia = w.matchMedia;
  w.matchMedia = (q) => ({ matches: String(q).includes('prefers-reduced-motion'), media: q, addListener() {}, removeListener() {} });

  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Reduced motion: abu-abu aktif');
  assert.strictEqual(activeRafCount(), 0, 'Reduced motion: tidak menjalankan loop rAF lintasan waktu');
  advance(500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Reduced motion: bertahan minimal 850ms');
  assert.strictEqual(w._rkWmState().p, 0, 'Reduced motion: P tetap 0 selama refresh');
  advance(400);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Reduced motion: langsung putih setelah 850ms');
  assert.strictEqual(finaleEvents.length, 0, 'Reduced motion: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, 'Reduced motion: semua timer bersih');

  // Tarik jari di reduced motion tetap mengikuti jari; lepas di bawah ambang langsung ke idle tanpa animasi return
  fakeNow += 2000;
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'drag', 'Reduced motion: tarik jari tetap mengaktifkan mode drag');
  approx(w._rkWmState().p, 0.5, 1e-3, 'Reduced motion: P tetap mengikuti jari (0.5)');
  fireTouch(panel, 'touchend', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Reduced motion: lepas di bawah ambang langsung ke idle tanpa animasi return');
  assert.strictEqual(activeTotalCount(), 0, 'Reduced motion: nol loop setelah lepas');
  w.matchMedia = origMatchMedia;

  // 11f. unmountMobileShell()
  w.sbUser = { id: 'u-t18-c', email: 'c@example.com' };
  w.syncMobileCloudUI();
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(400);
  w.unmountMobileShell();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'unmountMobileShell: berhenti bersih');
  assert.strictEqual(finaleEvents.length, 0, 'unmountMobileShell: tanpa kilat kuning');
  assert.strictEqual(activeTotalCount(), 0, 'unmountMobileShell: loop/timer bersih');

  // Pulihkan mock
  obs.disconnect();
  w._rkWmClock = origClock;
  w.Date.now = origDateNow;
  w.Capacitor = origCap;
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;

  // 13. Audit statis sumber, CSS, token, bebas font web, isolasi Desktop, sw.js >= v41
  const mobJs = fs.readFileSync(path.join(ROOT, 'js/ui-mobile/mobile-app.js'), 'utf8');
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const idxDev = fs.readFileSync(path.join(ROOT, 'index.dev.html'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  const idxBuilt = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(mobJs.includes('Pacifico (Vernon Adams), SIL Open Font License 1.1'), 'Atribusi SIL OFL 1.1 Pacifico ada di mobile-app.js');
  for (const [name, src] of [['mobile-app.js', mobJs], ['mobile.css', cssMob], ['tokens.css', cssTok], ['index.dev.html', idxDev], ['index.html', idxBuilt]]) {
    assert(!src.includes('fonts.googleapis.com'), `${name} bebas Google Fonts runtime`);
    assert(!/@font-face[\s\S]{0,160}Pacifico/i.test(src), `${name} bebas @font-face Pacifico untuk wordmark`);
  }
  assert(!/@font-face/i.test(cssMob) && !/@font-face/i.test(mobJs), 'mobile.css dan mobile-app.js bebas @font-face');
  assert(!cssMob.includes('.mt-wm-beam') && !cssMob.includes('rkWmSweep') && !cssMob.includes('.m-ptr-spin') && !cssMob.includes('data-wm-step'), 'CSS bebas sisa Tahap 16/17 dan spinner PTR');
  const wmStart = cssMob.indexOf('body[data-shell="mobile-app"] #mobile-app-shell .mt-wordmark');
  const wmEnd = cssMob.indexOf('body[data-shell="mobile-app"] #mobile-app-shell .mt-actions', wmStart);
  assert(wmStart >= 0 && wmEnd > wmStart, 'Blok CSS wordmark ditemukan');
  const wmCssBlock = cssMob.slice(wmStart, wmEnd);
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(wmCssBlock), 'Blok CSS wordmark di css/mobile.css bebas hex literal');
  assert(!/transition\s*:[^;]*\b(fill|filter|width|height|left|stop-color)\b/i.test(wmCssBlock), 'Wordmark hanya mentransisikan opacity/transform');
  assert(!/animation\s*:[^;]*infinite/i.test(wmCssBlock), 'Wordmark bebas animasi CSS infinite saat idle');

  for (const tok of ['--wm-dead', '--wm-lit', '--wm-flash', '--dur-wm-fade', '--dur-wm-reset', '--dur-wm-flash-in', '--dur-wm-flash-out']) {
    assert(cssTok.includes(tok), `Token ${tok} tersedia di css/tokens.css`);
  }
  assert(/--dur-wm-fade:\s*0\.001ms/.test(cssTok) && /--dur-wm-reset:\s*0\.001ms/.test(cssTok) && /--dur-wm-flash-in:\s*0\.001ms/.test(cssTok), 'Token durasi wordmark direduksi ke 0.001ms pada prefers-reduced-motion');
  assert(!cssTok.includes('--dur-wm-lit-in') && !cssTok.includes('--dur-wm-lit-out'), 'Token langkah huruf Tahap 17 yang usang sudah dibersihkan');

  assert(!cssDesk.includes('mt-wm-') && !cssDesk.includes('data-wm-') && !cssDesk.includes('rkWm'), 'Isolasi Desktop: css/desktop.css bebas aturan wordmark APK');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 42, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v42');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 18 (diperbarui ke kontrak stroke Tahap 19 + Progres PTR + A1) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap18_wordmark_write:', e);
  process.exit(1);
});
