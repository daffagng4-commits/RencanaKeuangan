const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function parseScaleY(str) {
  const m = String(str || '').match(/scaleY\(\s*([0-9.eE+-]+)\s*\)/);
  return m ? Number(m[1]) : NaN;
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
    { id: 1701, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
    { id: 1702, name: 'Listrik', price: 450000, n: 1, unit: 'bulan', start: '2026-11-20', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [
    { id: 'tx-17-1', d: '2026-11-05', dir: '+', amt: 5000000, cat: 'Gaji', note: 'Gaji' },
  ];
  w.sbUser = null;
  w.renderAll();
  w.setShellMode('mobile-app');

  const shellRoot = $('mobile-app-shell');
  const wm = shellRoot.querySelector('svg.mt-wordmark');

  // Struktur 6 glyph Pacifico berurutan dan invarian path (diperbarui setara ke kontrak Tahap 18)
  assert(Array.isArray(w.RK_WM_GLYPHS) && w.RK_WM_GLYPHS.length === 6, 'RK_WM_GLYPHS berisi tepat 6 path huruf (R,e,n,K,e,u)');
  assert.strictEqual(w.RK_WM_GLYPHS.join(''), w.RK_WORDMARK_PATH, 'Invarian: RK_WM_GLYPHS.join("") === RK_WORDMARK_PATH');
  assert(Array.isArray(w.RK_WM_BOXES) && w.RK_WM_BOXES.length === 6, 'RK_WM_BOXES berisi tepat 6 kotak batas huruf');
  assert(wm, 'svg.mt-wordmark tersedia');
  assert.strictEqual(wm.getAttribute('role'), 'img', 'wordmark mempertahankan role="img"');
  assert.strictEqual(wm.getAttribute('aria-label'), 'RenKeu', 'wordmark mempertahankan aria-label="RenKeu"');
  const letterGroups = [...wm.querySelectorAll('g.mt-wm-letter')];
  assert.strictEqual(letterGroups.length, 6, 'svg.mt-wordmark memiliki tepat 6 grup huruf g.mt-wm-letter');
  letterGroups.forEach((g, idx) => {
    assert.strictEqual(g.getAttribute('data-wm-idx'), String(idx), `grup huruf ${idx} berurutan`);
    assert.strictEqual(g.getAttribute('aria-hidden'), 'true', `grup huruf ${idx} dekoratif aria-hidden="true"`);
    assert(g.querySelector('.mt-wm-white') && g.querySelector('.mt-wm-dead') && g.querySelector('.mt-wm-lit') && g.querySelector('.mt-wm-flash'), `grup huruf ${idx} memuat 4 lapisan warna`);
  });

  // Sisa Tahap 16/17 lama dan spinner PTR sudah dihapus dari DOM
  assert(!doc.querySelector('.m-ptr-spin, .mt-wm-beam, .mt-wm-shimmer-clip, #rk-wm-clip, #rk-wm-grad'), 'elemen shimmer lama dan spinner PTR tidak ada di DOM');

  // Render ulang berulang tidak menggandakan grup huruf atau ID
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter').length, 6, 'render ulang tidak menggandakan grup huruf');
  assert.strictEqual(doc.querySelectorAll('#m-refresh-status').length, 1, 'id #m-refresh-status tetap unik');

  // Jam tiruan scheduler tunggal untuk memverifikasi lintasan kontinu, loop, finale, dan jalur non-sukses
  const origNow = w.Date.now;
  const origClock = w._rkWmClock;
  let fakeNow = Date.now() + 500000;
  w.Date.now = () => fakeNow;
  const jobs = [];
  let jSeq = 1;
  const pushJob = (fn, ms) => {
    const id = jSeq++;
    jobs.push({ id, fn, due: fakeNow + (Number(ms) || 0), cleared: false });
    return id;
  };
  const cancelJob = (id) => {
    const found = jobs.find((x) => x.id === id);
    if (found) found.cleared = true;
  };
  w._rkWmClock = {
    now: () => fakeNow,
    raf: (fn) => pushJob(fn, 16),
    cancelRaf: cancelJob,
    setTimeout: pushJob,
    clearTimeout: cancelJob,
  };
  const activeJobsCount = () => jobs.filter((x) => !x.cleared).length;
  const advanceTime = (ms) => {
    const target = fakeNow + ms;
    while (true) {
      const next = jobs
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
  const getClipScales = () => [...shellRoot.querySelectorAll('svg.mt-wordmark rect.mt-wm-clip-rect')].map((r) => parseScaleY(r.style.transform));

  // Pantau perubahan data-refreshing dan data-wm-finale lewat MutationObserver
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
        const nowOn = !wasOn;
        finaleEvents.push(nowOn ? 'start' : 'end');
      }
    }
  });
  obs.observe(shellRoot, { attributes: true, attributeOldValue: true, attributeFilter: ['data-refreshing', 'data-wm-finale'] });

  // 1. Refresh lokal via PTR: abu-abu -> lintasan kontinu R..u -> finale kuning (in -> out) -> idle putih
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  fireTouch($('m-tab-rincian'), 'touchstart', 160, 120);
  fireTouch($('m-tab-rincian'), 'touchmove', 160, 250);
  fireTouch($('m-tab-rincian'), 'touchend', 160, 250);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'PTR lokal mengaktifkan data-refreshing="1"');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), 'true', 'aria-busy="true" aktif saat refresh');
  assert.strictEqual($('m-refresh-status').textContent, 'Menyegarkan data', 'status screen reader aktif');

  const passMs = w.RK_WM_PASS_MS;
  advanceTime(176);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'masuk fase run kontinu');
  for (let i = 0; i < 6; i++) {
    advanceTime(passMs / 6);
    const scales = getClipScales();
    assert(scales[i] > 0.85, `huruf ke-${i} terisi pada lintasan kontinu (scale=${scales[i]})`);
    for (let j = 0; j < i; j++) {
      assert(scales[j] >= 0.99, `huruf sebelumnya ${j} tetap penuh kumulatif (scale=${scales[j]})`);
    }
  }
  advanceTime(32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'setelah P=1 selesai, masuk fase finale kuning');
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'in', 'awal finale menaikkan kilat kuning (in)');
  advanceTime(140);
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'out', 'kilat kuning memudar ke putih penuh (out)');
  advanceTime(420);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'setelah finale selesai kembali idle putih');
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'atribut data-wm-finale dilepas');
  assert.strictEqual(activeJobsCount(), 0, 'tidak ada rAF/timer tersisa saat idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'PTR lokal: tepat 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'PTR lokal: finale berjalan tepat 1x');

  // 2. Cloud pull lambat: lintasan berulang sampai pull() selesai, baru finale setelah P=1
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origPull = w.pull;
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t17-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  let resolvePull = null;
  w.pull = () => new Promise((r) => { resolvePull = () => { w._rkLastPullOk = true; r(); }; });
  const bnav = shellRoot.querySelector('.mob-bottom-nav');
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  realClick(bnav.querySelector('[data-mtab="rincian"]'));
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'cloud lambat: aktif');
  // A1: panggil ulang syncMobileCloudUI untuk user sama saat pull() pending -> TIDAK boleh mematikan indikator
  w.syncMobileCloudUI();
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'A1: syncMobileCloudUI pengguna sama tidak mematikan indikator');

  advanceTime(176 + passMs + 32);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'pull masih berjalan: belum finale di akhir lintasan 1');
  advanceTime(250);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), 'run', 'pull masih berjalan: mengulang lintasan 2');
  resolvePull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'pull selesai di tengah lintasan 2: finale menunggu P=1');
  advanceTime(passMs + 650);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'cloud lambat selesai kembali idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], 'cloud lambat: 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'cloud lambat: tepat 1x finale');

  // 3. Re-tap 10x cepat tidak me-restart lintasan & finale hanya 1x
  w.sbUser = null;
  w.syncMobileCloudUI();
  w._rkPtrReset();
  await flushMicrotasks();
  refEvents.length = 0;
  finaleEvents.length = 0;
  const rincianBtn = bnav.querySelector('[data-mtab="rincian"]');
  realClick(rincianBtn);
  advanceTime(176 + 500);
  const pBefore = w._rkWmState().p;
  for (let k = 0; k < 9; k++) {
    realClick(rincianBtn);
    advanceTime(20);
  }
  assert(w._rkWmState().p >= pBefore, '10x re-tap tidak me-restart progres kembali ke awal');
  advanceTime(passMs + 700);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '10x re-tap selesai kembali idle');
  assert.deepStrictEqual(refEvents, ['on', 'off'], '10x re-tap: 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], '10x re-tap: tepat 1x finale');

  // 4. Ketukan di tengah finale: finale dibatalkan, siklus baru mulai dari abu-abu (P=0)
  w._rkPtrReset();
  await flushMicrotasks();
  realClick(rincianBtn);
  advanceTime(176 + passMs + 48);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'berada di tengah finale');
  realClick(rincianBtn);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'ketukan saat finale langsung menghentikan finale');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'siklus baru langsung aktif');
  assert.strictEqual(w._rkWmState().p, 0, 'siklus baru mulai dari P=0');
  advanceTime(176 + passMs + 600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'siklus baru selesai bersih');

  // 5. Jalur non-sukses TIDAK boleh memainkan kilat kuning
  w.sbUser = { id: 'u-t17-b', email: 'b@example.com' };
  w.syncMobileCloudUI();

  // 5a. pull() reject
  let rejPull = null;
  w.pull = () => new Promise((_, rej) => { rejPull = () => rej(new Error('offline')); });
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  advanceTime(400);
  rejPull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'pull() reject: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'pull() reject: tanpa finale kuning');
  assert.strictEqual(activeJobsCount(), 0, 'pull() reject: semua loop/timer bersih');

  // 5b. _rkLastPullOk === false
  w.pull = () => { w._rkLastPullOk = false; w._rkLastPullErr = 'timeout'; return Promise.resolve(); };
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkLastPullOk=false: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, '_rkLastPullOk=false: tanpa finale kuning');

  // 5c. Timeout pengaman 20 detik
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  advanceTime(19500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'timeout 20s: masih aktif pada 19,5 detik');
  advanceTime(600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'timeout 20s: berhenti otomatis');
  assert.strictEqual(finaleEvents.length, 0, 'timeout 20s: tanpa finale kuning');
  assert.strictEqual(activeJobsCount(), 0, 'timeout 20s: semua loop/timer bersih');

  // 5d. Logout / ganti pengguna
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  advanceTime(350);
  w.sbUser = null;
  w.syncMobileCloudUI();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'logout: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'logout: tanpa finale kuning');

  // 5e. _rkPtrReset()
  w.sbUser = { id: 'u-t17-c', email: 'c@example.com' };
  w.syncMobileCloudUI();
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  advanceTime(400);
  w._rkPtrReset();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkPtrReset: langsung berhenti');
  assert.strictEqual(finaleEvents.length, 0, '_rkPtrReset: tanpa finale kuning');
  assert.strictEqual(activeJobsCount(), 0, '_rkPtrReset: semua loop/timer bersih');

  // 6. prefers-reduced-motion: abu-abu statis minimal 850ms lalu langsung putih, tanpa lintasan waktu dan tanpa kuning
  w.sbUser = null;
  w.syncMobileCloudUI();
  const origMatchMedia = w.matchMedia;
  w.matchMedia = (q) => ({ matches: String(q).includes('prefers-reduced-motion'), media: q, addListener() {}, removeListener() {} });
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'reduced-motion: abu-abu aktif');
  assert.strictEqual(w._rkWmState().p, 0, 'reduced-motion: P tetap 0');
  advanceTime(500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'reduced-motion: tetap aktif sebelum 850ms');
  advanceTime(400);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'reduced-motion: kembali putih setelah >= 850ms');
  assert.strictEqual(finaleEvents.length, 0, 'reduced-motion: tanpa finale kuning');
  assert.strictEqual(activeJobsCount(), 0, 'reduced-motion: semua timer bersih');
  w.matchMedia = origMatchMedia;

  // 5f. unmountMobileShell()
  w.sbUser = { id: 'u-t17-d', email: 'd@example.com' };
  w.syncMobileCloudUI();
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  await flushMicrotasks();
  finaleEvents.length = 0;
  realClick(rincianBtn);
  advanceTime(400);
  w.unmountMobileShell();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'unmountMobileShell: berhenti bersih');
  assert.strictEqual(finaleEvents.length, 0, 'unmountMobileShell: tanpa finale kuning');

  // Pulihkan mock
  obs.disconnect();
  w._rkWmClock = origClock;
  w.Date.now = origNow;
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;

  // Audit statis CSS, token, Desktop, dan sw.js >= v41
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  assert(!cssMob.includes('.mt-wm-beam') && !cssMob.includes('rkWmSweep') && !cssMob.includes('.m-ptr-spin'), 'CSS: sisa Tahap 16 (.mt-wm-beam, rkWmSweep) dan spinner PTR sudah dihapus');
  const wmStart = cssMob.indexOf('body[data-shell="mobile-app"] #mobile-app-shell .mt-wordmark');
  const wmEnd = cssMob.indexOf('body[data-shell="mobile-app"] #mobile-app-shell .mt-actions', wmStart);
  assert(wmStart >= 0 && wmEnd > wmStart, 'Blok CSS wordmark ditemukan');
  const wmCssBlock = cssMob.slice(wmStart, wmEnd);
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(wmCssBlock), 'Blok CSS wordmark di css/mobile.css bebas hex literal (harus via token)');
  assert(!/transition\s*:[^;]*\b(fill|filter|width|height|left|stop-color)\b/i.test(wmCssBlock), 'Wordmark hanya mentransisikan opacity/transform');
  assert(!/animation\s*:[^;]*infinite/i.test(wmCssBlock), 'Wordmark tidak menjalankan animasi CSS infinite saat idle');

  for (const tok of ['--wm-dead', '--wm-lit', '--wm-flash', '--dur-wm-fade', '--dur-wm-reset', '--dur-wm-flash-in', '--dur-wm-flash-out']) {
    assert(cssTok.includes(tok), `Token ${tok} tersedia di css/tokens.css`);
  }
  assert(/--dur-wm-reset:\s*0\.001ms/.test(cssTok) && /--dur-wm-flash-in:\s*0\.001ms/.test(cssTok), 'Token durasi wordmark direduksi ke 0.001ms pada prefers-reduced-motion');
  assert(!cssTok.includes('--dur-wm-sweep') && !cssTok.includes('--ease-wm-sweep'), 'Token usang Tahap 16 (--dur-wm-sweep, --ease-wm-sweep) sudah dihapus');

  assert(!cssDesk.includes('mt-wm-') && !cssDesk.includes('data-wm-'), 'Isolasi Desktop: css/desktop.css bebas aturan wordmark APK');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 41, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v41');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 17 (diperbarui ke kontrak kontinu Tahap 18 + Kilat Kuning + A1) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap17_wordmark_letters:', e);
  process.exit(1);
});
