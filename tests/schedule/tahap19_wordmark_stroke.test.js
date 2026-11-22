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

// Ekstrak seluruh aturan CSS di cssSrc yang selector-nya memuat "mt-wm" atau "data-wm-", termasuk di dalam @media
function extractWordmarkCssRules(cssSrc) {
  const clean = cssSrc.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  function scanBlock(limit, mediaCtx) {
    while (i < limit) {
      while (i < limit && /\s/.test(clean[i])) i++;
      if (i >= limit) break;
      if (clean[i] === '}') { i++; return; }
      const braceIdx = clean.indexOf('{', i);
      if (braceIdx < 0 || braceIdx >= limit) break;
      const header = clean.slice(i, braceIdx).trim();
      i = braceIdx + 1;
      if (header.startsWith('@media') || header.startsWith('@supports')) {
        scanBlock(limit, header);
      } else {
        let depth = 1;
        const bodyStart = i;
        while (i < limit && depth > 0) {
          if (clean[i] === '{') depth++;
          else if (clean[i] === '}') depth--;
          i++;
        }
        const body = clean.slice(bodyStart, i - 1).trim();
        if (/mt-wm|data-wm-|\.mt-wordmark/.test(header)) {
          rules.push({ selector: header, body, media: mediaCtx });
        }
      }
    }
  }
  scanBlock(clean.length, null);
  return rules;
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
    { id: 1901, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1902, name: 'Listrik', price: 450000, n: 1, unit: 'bulan', start: '2026-11-20', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [
    { id: 'tx-19-1', d: '2026-11-05', dir: '+', amt: 5000000, cat: 'Gaji', note: 'Gaji' },
  ];
  w.sbUser = null;
  w.renderAll();
  w.setShellMode('mobile-app');

  const shellRoot = $('mobile-app-shell');

  // 1. Fungsi murni rkWmStrokeState(P, segs)
  assert.strictEqual(typeof w.rkWmStrokeState, 'function', 'window.rkWmStrokeState tersedia');
  assert.strictEqual(typeof w.rkWmFill, 'undefined', 'rkWmFill lama sudah dihapus');

  const mockSegs = [
    { len: 100 },
    { len: 50 },
    { len: 50 },
    { len: 200 },
  ];
  const st0 = w.rkWmStrokeState(0, mockSegs);
  assert.deepStrictEqual([...st0.fracs], [0, 0, 0, 0], 'P=0: semua kontur 0');
  assert.strictEqual(st0.activeIdx, -1, 'P=0: tidak ada kontur aktif');

  const st1 = w.rkWmStrokeState(1, mockSegs);
  assert.deepStrictEqual([...st1.fracs], [1, 1, 1, 1], 'P=1: semua kontur 1');
  assert.strictEqual(st1.activeIdx, -1, 'P=1: tidak ada kontur aktif parsial');

  const stMid = w.rkWmStrokeState(0.3125, mockSegs); // 125 / 400 -> seg0=1, seg1=0.5, seg2=0, seg3=0
  assert.deepStrictEqual([...stMid.fracs], [1, 0.5, 0, 0], 'P=0.3125: seg0 penuh, seg1 setengah, sisanya 0');
  assert.strictEqual(stMid.activeIdx, 1, 'P=0.3125: activeIdx = 1');

  // Monoton, tanpa plateau, tepat 1 kontur parsial (kecuali tepat di batas), total panjang akurat, simetris
  let prevTotal = 0;
  let prevFracs = [0, 0, 0, 0];
  for (let k = 1; k <= 199; k++) {
    const p = k / 200;
    const st = w.rkWmStrokeState(p, mockSegs);
    const fracs = [...st.fracs];
    const partials = fracs.filter((f) => f > 1e-9 && f < 1 - 1e-9).length;
    assert(partials <= 1, `p=${p}: maksimal 1 kontur parsial (partials=${partials})`);
    let sawZero = false;
    for (let i = 0; i < fracs.length; i++) {
      assert(fracs[i] >= prevFracs[i] - 1e-12, `p=${p}: kontur ${i} monoton naik`);
      if (fracs[i] === 0) sawZero = true;
      else if (sawZero) assert.fail(`p=${p}: kontur ${i} > 0 sesudah kontur 0`);
    }
    const drawn = fracs.reduce((acc, f, idx) => acc + f * mockSegs[idx].len, 0);
    approx(drawn, p * 400, 1e-4, `p=${p}: total panjang tergambar === P * totalLen`);
    assert(drawn > prevTotal + 1e-4, `p=${p}: tanpa plateau (turunan positif)`);
    const stAgain = w.rkWmStrokeState(p, mockSegs);
    assert.deepStrictEqual([...stAgain.fracs], fracs, `p=${p}: simetris tanpa histeresis`);
    prevTotal = drawn;
    prevFracs = fracs;
  }

  // 2. Struktur data RK_WM_STROKES, RK_WM_GLYPHS, DOM, aksesibilitas, tanpa sisa Tahap 18/filter/font web
  assert(Array.isArray(w.RK_WM_GLYPHS) && w.RK_WM_GLYPHS.length === 6, 'RK_WM_GLYPHS berisi 6 glyph (R,e,n,K,e,u)');
  assert(Array.isArray(w.RK_WM_STROKES) && w.RK_WM_STROKES.length === 6, 'RK_WM_STROKES berisi 6 entri huruf');
  assert.strictEqual(typeof w.RK_WM_BOXES, 'undefined', 'RK_WM_BOXES lama sudah dihapus');
  let totalContours = 0;
  for (let li = 0; li < 6; li++) {
    const letterSegs = w.RK_WM_STROKES[li];
    assert(Array.isArray(letterSegs) && letterSegs.length >= 1, `Huruf ${li} punya >= 1 kontur stroke`);
    for (const seg of letterSegs) {
      assert(typeof seg.d === 'string' && seg.d.length > 10 && !/NaN|Infinity/i.test(seg.d), `Kontur huruf ${li} punya d valid`);
      assert(typeof seg.len === 'number' && seg.len > 5 && Number.isFinite(seg.len), `Kontur huruf ${li} punya len positif`);
      totalContours++;
    }
  }
  assert.strictEqual(totalContours, 9, 'Total 9 jalur guratan Pacifico (R:2, e:1, n:1, K:3, e:1, u:1)');

  const wm = shellRoot.querySelector('svg.mt-wordmark');
  assert(wm, 'svg.mt-wordmark tersedia');
  assert.strictEqual(wm.getAttribute('role'), 'img', 'wordmark role="img"');
  assert.strictEqual(wm.getAttribute('aria-label'), 'RenKeu', 'wordmark aria-label="RenKeu"');
  assert.strictEqual(wm.getAttribute('viewBox'), w.RK_WM_VIEWBOX, 'viewBox SVG sesuai RK_WM_VIEWBOX');
  assert(!wm.querySelector('.mt-wm-clip-rect, filter, feGaussianBlur, text'), 'wordmark bebas rect klip Tahap 18, filter blur, dan <text>');
  assert.strictEqual(wm.querySelectorAll('defs clipPath.mt-wm-glyph-clip').length, 6, 'tepat 6 clipPath siluet huruf untuk membatasi garis di dalam tubuh huruf');
  assert(!doc.querySelector('.m-ptr-spin, .mt-wm-beam, .mt-wm-shimmer-clip, #rk-wm-clip, #rk-wm-grad'), 'elemen sisa Tahap 16/17/18 sudah dihapus');

  const letterGroups = [...wm.querySelectorAll('g.mt-wm-letter')];
  assert.strictEqual(letterGroups.length, 6, 'tepat 6 grup huruf g.mt-wm-letter');
  letterGroups.forEach((g, idx) => {
    assert.strictEqual(g.getAttribute('aria-hidden'), 'true', `g.mt-wm-letter ${idx} aria-hidden="true"`);
    assert(g.querySelector('path.mt-wm-white') && g.querySelector('path.mt-wm-dead') && g.querySelector('path.mt-wm-flash'), `g.mt-wm-letter ${idx} punya lapisan isi white/dead/flash`);
  });

  const strokeLayer = wm.querySelector('g.mt-wm-strokes');
  assert(strokeLayer && strokeLayer.getAttribute('aria-hidden') === 'true', 'grup g.mt-wm-strokes dekoratif aria-hidden="true"');
  const drawnPaths = [...strokeLayer.querySelectorAll('path.mt-wm-drawn')];
  assert.strictEqual(drawnPaths.length, 9, 'tepat 9 path .mt-wm-drawn (satu per kontur)');
  drawnPaths.forEach((p, idx) => {
    assert.strictEqual(p.getAttribute('pathLength'), '1', `path.mt-wm-drawn ${idx} memakai pathLength="1"`);
  });
  const trailPaths = [...strokeLayer.querySelectorAll('path.mt-wm-trail')];
  assert(trailPaths.length >= 4 && trailPaths.length <= 6, `lapisan aktif kepala/ekor/halo berjumlah 4..6 (${trailPaths.length})`);
  trailPaths.forEach((p, idx) => {
    assert.strictEqual(p.getAttribute('pathLength'), '1', `path.mt-wm-trail ${idx} memakai pathLength="1"`);
  });

  // Render ulang berulang tidak menggandakan grup huruf / kontur / ID
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter').length, 6, 'render ulang tidak menggandakan grup huruf');
  assert.strictEqual(shellRoot.querySelectorAll('path.mt-wm-drawn').length, 9, 'render ulang tidak menggandakan path .mt-wm-drawn');
  assert.strictEqual(doc.querySelectorAll('#m-refresh-status').length, 1, '#m-refresh-status tetap unik');

  // 3. Abstraksi jam tiruan & scheduler tunggal
  let fakeNow = 200000;
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

  const refEvents = [];
  const finaleEvents = [];
  const obs = new w.MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-refreshing') refEvents.push(m.oldValue === '1' ? 'off' : 'on');
      else if (m.attributeName === 'data-wm-finale') finaleEvents.push(m.oldValue === '1' ? 'end' : 'start');
    }
  });
  obs.observe(shellRoot, { attributes: true, attributeOldValue: true, attributeFilter: ['data-refreshing', 'data-wm-finale'] });

  // 4. Keadaan Idle: semua lapisan garis tersembunyi & dash direset
  w._rkPtrReset();
  assert.strictEqual(activeTotalCount(), 0, 'Idle: tidak ada rAF/timer berjalan');
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Idle: data-wm-mode null');
  drawnPaths.forEach((p, idx) => {
    assert.strictEqual(p.style.opacity, '0', `Idle: drawn ${idx} opacity 0`);
    assert.strictEqual(p.style.strokeDasharray, '0 2', `Idle: drawn ${idx} dash direset`);
  });
  trailPaths.forEach((p, idx) => {
    assert.strictEqual(p.style.opacity, '0', `Idle: trail ${idx} opacity 0`);
  });

  // 5. Render stroke + drag dua arah, zona mati, batal, commit, touchcancel, overlay, excluded
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

  // Zona mati 4px (pullY = 3 -> dy = 6)
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 106);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Zona mati 4px: tetap idle');
  assert.strictEqual(w._rkWmState().p, 0, 'Zona mati 4px: P tetap 0');
  fireTouch(panel, 'touchend', 160, 106);

  // Tarik bertahap 13, 26, 39, 52, 90 px -> cek stroke-dashoffset/dasharray & trail pada kontur aktif
  const flatSegs = [];
  for (let li = 0; li < w.RK_WM_STROKES.length; li++) {
    for (let ci = 0; ci < w.RK_WM_STROKES[li].length; ci++) flatSegs.push(w.RK_WM_STROKES[li][ci]);
  }
  fireTouch(panel, 'touchstart', 160, 100);
  for (const cp of [
    { pullY: 13, p: 0.25 },
    { pullY: 26, p: 0.50 },
    { pullY: 39, p: 0.75 },
    { pullY: 52, p: 1.00 },
    { pullY: 90, p: 1.00 },
  ]) {
    fireTouch(panel, 'touchmove', 160, 100 + cp.pullY * 2);
    assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'drag', `pullY=${cp.pullY}: mode drag`);
    assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, `pullY=${cp.pullY}: belum refreshing`);
    assert.strictEqual($('m-main').getAttribute('aria-busy'), null, `pullY=${cp.pullY}: belum aria-busy`);
    approx(w._rkWmState().p, cp.p, 1e-3, `pullY=${cp.pullY}: P=${cp.p}`);
    const expected = w.rkWmStrokeState(cp.p, flatSegs);
    for (let i = 0; i < flatSegs.length; i++) {
      const f = expected.fracs[i];
      if (f <= 0.0005) {
        assert.strictEqual(drawnPaths[i].style.opacity, '0', `pullY=${cp.pullY} seg ${i}: belum tersentuh tersembunyi`);
      } else {
        assert.strictEqual(drawnPaths[i].style.strokeDasharray, '1 2', `pullY=${cp.pullY} seg ${i}: dasharray="1 2"`);
        approx(Number(drawnPaths[i].style.strokeDashoffset), 1 - f, 1e-3, `pullY=${cp.pullY} seg ${i}: dashoffset=1-f`);
      }
    }
    if (expected.activeIdx >= 0) {
      const headEl = strokeLayer.querySelector('path.mt-wm-head');
      assert.strictEqual(headEl.getAttribute('d'), flatSegs[expected.activeIdx].d, `pullY=${cp.pullY}: kepala/ekor aktif pada kontur ${expected.activeIdx}`);
      assert.notStrictEqual(headEl.style.opacity, '0', `pullY=${cp.pullY}: kepala menyala`);
    }
  }

  // Mundur ke 26px -> keadaan garis identik dengan maju ke 26px
  fireTouch(panel, 'touchmove', 160, 100 + 26 * 2);
  approx(w._rkWmState().p, 0.50, 1e-3, 'Mundur ke pullY=26: P=0.50 identik');
  const expHalf = w.rkWmStrokeState(0.5, flatSegs);
  for (let i = 0; i < flatSegs.length; i++) {
    if (expHalf.fracs[i] <= 0.0005) assert.strictEqual(drawnPaths[i].style.opacity, '0', `Mundur 26px seg ${i} tersembunyi`);
    else approx(Number(drawnPaths[i].style.strokeDashoffset), 1 - expHalf.fracs[i], 1e-3, `Mundur 26px seg ${i} dashoffset identik`);
  }

  // Lepas di bawah ambang (pullY=26) -> mode return, kembali ke 0 & idle tanpa refresh/haptic
  hapticLog = [];
  fireTouch(panel, 'touchend', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'return', 'Lepas di bawah ambang masuk return');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Lepas di bawah ambang tidak menyalakan refresh');
  assert.strictEqual(hapticLog.length, 0, 'Lepas di bawah ambang tanpa haptic');
  advance(300);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Return selesai kembali idle');
  assert.strictEqual(w._rkWmState().p, 0, 'Return selesai P=0');
  assert.strictEqual(activeTotalCount(), 0, 'Return selesai loop berhenti');

  // touchcancel, excluded target, overlay terbuka -> tanpa efek
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 30 * 2);
  fireTouch(panel, 'touchcancel', 160, 100 + 30 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'touchcancel langsung ke idle');

  const bnav = shellRoot.querySelector('.mob-bottom-nav');
  fireTouch(bnav, 'touchstart', 160, 650);
  fireTouch(bnav, 'touchmove', 160, 750);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Target dikecualikan tidak memicu drag');
  fireTouch(bnav, 'touchend', 160, 750);

  const pop = $('m-acct-popover');
  pop.classList.add('open');
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 220);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Overlay terbuka tidak memicu drag');
  fireTouch(panel, 'touchend', 160, 220);
  pop.classList.remove('open');

  // 6. Commit PTR -> haptic arm 1x + refresh 1x, abu-abu -> lintasan kontinu -> finale 1x -> idle
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  hapticLog = [];
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 60 * 2);
  assert.strictEqual(hapticLog.length, 1, 'Melewati ambang memicu haptic arm 1x');
  fireTouch(panel, 'touchend', 160, 100 + 60 * 2);
  assert.strictEqual(hapticLog.length, 2, 'Lepas di atas ambang memicu haptic refresh 1x');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Refresh aktif');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), 'true', 'aria-busy aktif saat refresh');
  assert.strictEqual($('m-refresh-status').textContent, 'Menyegarkan data', 'status screen reader aktif');

  const passMs = w.RK_WM_PASS_MS;
  assert(passMs >= 2000 && passMs <= 2400, `RK_WM_PASS_MS dalam 2000..2400ms (${passMs})`);
  advance(180);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'Masuk fase run kontinu');
  let prevP = w._rkWmState().p;
  for (let s = 1; s <= 3; s++) {
    advance(passMs * 0.25);
    assert(w._rkWmState().p > prevP, `Lintasan kontinu terus naik pada langkah ${s}`);
    assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, `Belum finale sebelum P=1 (langkah ${s})`);
    prevP = w._rkWmState().p;
  }
  advance(passMs * 0.25 + 32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'Masuk finale kuning setelah P=1');
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'in', 'Awal finale: flash in');
  advance(140);
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'out', 'Kilat kuning memudar ke putih');
  advance(420);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Kembali idle');
  assert.strictEqual(activeTotalCount(), 0, 'Semua loop/timer bersih saat idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'PTR lokal: 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'PTR lokal: 1x finale');

  // 7. 10x re-tap di tiap tab + ketukan saat finale
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
    for (let k = 0; k < 9; k++) { realClick(btn); advance(20); }
    assert(w._rkWmState().p >= pMid, `Re-tap ${tid} 10x tidak mereset lintasan`);
    advance(passMs + 700);
    await flushMicrotasks();
    assert.deepStrictEqual(refEvents, ['on', 'off'], `Re-tap ${tid} 10x: 1x on/off`);
    assert.deepStrictEqual(finaleEvents, ['start', 'end'], `Re-tap ${tid} 10x: 1x finale`);
  }

  w.switchMobileTab('rincian');
  w._rkPtrReset();
  await flushMicrotasks();
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(180 + passMs + 48);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'Di tengah finale');
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Ketukan saat finale membatalkan finale');
  assert.strictEqual(w._rkWmState().p, 0, 'Siklus baru mulai dari P=0');
  advance(180 + passMs + 650);
  await flushMicrotasks();

  // 8. Cloud lambat (loop) + A1 user sama + jalur non-sukses (tanpa kuning)
  const origSb = w.sb, origSbUser = w.sbUser, origPull = w.pull;
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t19-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  let resolvePull = null;
  w.pull = () => new Promise((r) => { resolvePull = () => { w._rkLastPullOk = true; r(); }; });
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  w.syncMobileCloudUI();
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'A1: syncMobileCloudUI user sama tidak menghentikan indikator');
  advance(180 + passMs + 32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'Cloud lambat: belum finale di lintasan 1');
  advance(260);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'Cloud lambat: loop lintasan 2');
  resolvePull();
  await flushMicrotasks();
  advance(passMs + 650);
  await flushMicrotasks();
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'Cloud lambat: 1x on/off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'Cloud lambat: 1x finale');

  // Non-sukses: reject, 20s timeout, logout, _rkPtrReset, unmountMobileShell
  let rejPull = null;
  w.pull = () => new Promise((_, rej) => { rejPull = () => rej(new Error('offline')); });
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(400);
  rejPull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'reject: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'reject: tanpa kuning');
  assert.strictEqual(activeTotalCount(), 0, 'reject: timer bersih');

  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(20100);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '20s timeout: berhenti');
  assert.strictEqual(finaleEvents.length, 0, '20s timeout: tanpa kuning');

  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(350);
  w.sbUser = null;
  w.syncMobileCloudUI();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'logout: berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'logout: tanpa kuning');

  // 9. Reduced motion: abu-abu statis minimal 850ms tanpa lintasan/kuning, drag tetap menggambar garis mengikuti jari
  const origMM = w.matchMedia;
  w.matchMedia = (q) => ({ matches: String(q).includes('prefers-reduced-motion'), media: q, addListener() {}, removeListener() {} });
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Reduced motion: abu-abu aktif');
  assert.strictEqual(activeRafCount(), 0, 'Reduced motion: nol loop rAF saat refresh');
  advance(500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'Reduced motion: minimal 850ms');
  advance(400);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'Reduced motion: putih setelah 850ms');
  assert.strictEqual(finaleEvents.length, 0, 'Reduced motion: tanpa kuning');

  fakeNow += 2000;
  fireTouch(panel, 'touchstart', 160, 100);
  fireTouch(panel, 'touchmove', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'drag', 'Reduced motion: drag tetap menggambar mengikuti jari');
  approx(w._rkWmState().p, 0.5, 1e-3, 'Reduced motion: drag P=0.5');
  fireTouch(panel, 'touchend', 160, 100 + 26 * 2);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'Reduced motion: lepas langsung idle');
  w.matchMedia = origMM;

  // unmountMobileShell
  w.sbUser = { id: 'u-t19-b', email: 'b@example.com' };
  w.syncMobileCloudUI();
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  advance(400);
  w.unmountMobileShell();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'unmountMobileShell: berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'unmountMobileShell: tanpa kuning');
  assert.strictEqual(activeTotalCount(), 0, 'unmountMobileShell: loop/timer bersih');

  obs.disconnect();
  w._rkWmClock = origClock;
  w.Date.now = origDateNow;
  w.Capacitor = origCap;
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;

  // 10. Audit CSS Menyeluruh (A1), Ukuran (Butir 1), A3 dist/tools, Desktop, sw.js >= v42
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const mobJs = fs.readFileSync(path.join(ROOT, 'js/ui-mobile/mobile-app.js'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  const wmRules = extractWordmarkCssRules(cssMob);
  assert(wmRules.length >= 10, `A1: mengekstrak seluruh aturan CSS wordmark (${wmRules.length} aturan)`);

  // Daftar putih eksplisit pengecualian sadar Aturan 3 (4.3): properti stroke hanya pada elemen garis wordmark
  const STROKE_PROPS = new Set(['stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity']);
  const FILL_SAFE_PROPS = new Set(['display', 'height', 'width', 'flex-shrink', 'overflow', 'fill', 'opacity', 'transition', 'transform', 'transform-box', 'transform-origin', 'pointer-events', 'vector-effect']);

  let sawWordmarkOverflowVisible = false;
  let sawWordmarkHeightVar = false;

  for (const r of wmRules) {
    assert(!/#[0-9a-fA-F]{3,8}\b/.test(r.body), `A1: aturan "${r.selector}" bebas hex literal`);
    assert(!/\b(filter|backdrop-filter|box-shadow|drop-shadow)\b/i.test(r.body), `A1: aturan "${r.selector}" bebas filter/blur/box-shadow`);
    assert(!/animation\s*:[^;]*infinite/i.test(r.body), `A1: aturan "${r.selector}" bebas animation infinite`);
    assert(!/transition\s*:[^;]*\b(fill|filter|width|height|left|top|stroke-width)\b/i.test(r.body), `A1: aturan "${r.selector}" hanya mentransisikan opacity/transform`);

    const isStrokeSelector = /\.mt-wm-(strokes|drawn|trail|head|tail|halo)/.test(r.selector);
    const decls = r.body.split(';').map((s) => s.trim()).filter(Boolean);
    for (const decl of decls) {
      const colon = decl.indexOf(':');
      if (colon < 0) continue;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const val = decl.slice(colon + 1).trim().toLowerCase();
      if (STROKE_PROPS.has(prop)) {
        assert(isStrokeSelector, `A1: properti stroke "${prop}" hanya boleh di elemen garis wordmark, bukan "${r.selector}"`);
      } else {
        assert(FILL_SAFE_PROPS.has(prop), `A1: properti "${prop}" pada "${r.selector}" di luar daftar putih aman`);
      }
      if (/\.mt-wordmark\b/.test(r.selector) && !r.media) {
        if (prop === 'overflow' && val === 'visible') sawWordmarkOverflowVisible = true;
        if (prop === 'height' && val.includes('--wm-h')) sawWordmarkHeightVar = true;
      }
    }
  }
  assert(sawWordmarkOverflowVisible, 'CSS: svg.mt-wordmark memakai overflow: visible');
  assert(sawWordmarkHeightVar, 'CSS: svg.mt-wordmark memakai height: var(--wm-h)');
  assert(!cssMob.includes('.mt-wm-clip-rect') && !cssMob.includes('.mt-wm-lit') && !cssMob.includes('data-wm-step'), 'CSS bebas sisa .mt-wm-clip-rect/.mt-wm-lit/data-wm-step');

  // Token ukuran +2 poin & warna trail/glow
  assert(/--wm-h:\s*24\.5px/.test(cssTok), 'Token --wm-h: 24.5px (+2 poin) ada di css/tokens.css');
  for (const tok of ['--wm-dead', '--wm-lit', '--wm-flash', '--wm-trail', '--wm-glow', '--wm-glow-soft', '--dur-wm-fade', '--dur-wm-reset', '--dur-wm-flash-in', '--dur-wm-flash-out']) {
    assert(cssTok.includes(tok), `Token ${tok} ada di css/tokens.css`);
  }
  assert(!cssDesk.includes('mt-wm-') && !cssDesk.includes('data-wm-') && !cssDesk.includes('rkWm'), 'Isolasi Desktop: css/desktop.css bersih');
  assert(!mobJs.includes('fonts.googleapis.com') && !cssMob.includes('fonts.googleapis.com'), 'Bebas Google Fonts runtime');
  assert(mobJs.includes('Pacifico (Vernon Adams), SIL Open Font License 1.1'), 'Atribusi SIL OFL 1.1 tetap terjaga');

  // A3: gen-wordmark-pacifico.js tidak ikut ke dist/tools/
  assert(!fs.existsSync(path.join(ROOT, 'dist/tools/gen-wordmark-pacifico.js')), 'A3: gen-wordmark-pacifico.js tidak disalin ke dist/tools/');

  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 42, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v42');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 19 (+2pt, SVG Stroke + Glowing Trail, A1-A4) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap19_wordmark_stroke:', e);
  process.exit(1);
});
