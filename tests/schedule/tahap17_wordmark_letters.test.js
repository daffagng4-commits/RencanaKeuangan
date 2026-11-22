const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $ , errs } = t;
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

  // Struktur 6 grup huruf berurutan dan invarian path
  assert(Array.isArray(w.RK_WORDMARK_LETTERS) && w.RK_WORDMARK_LETTERS.length === 6, 'RK_WORDMARK_LETTERS berisi tepat 6 path huruf (R,e,n,K,e,u)');
  assert.strictEqual(w.RK_WORDMARK_LETTERS.join(''), w.RK_WORDMARK_PATH, 'Invarian: RK_WORDMARK_LETTERS.join("") === RK_WORDMARK_PATH');
  assert.deepStrictEqual(
    [...w.RK_WORDMARK_LETTERS].map((p) => (p.match(/M/g) || []).length),
    [2, 1, 1, 1, 1, 1],
    'Jumlah perintah M per huruf konsisten (R punya lubang dalam, huruf lain 1 subpath)'
  );
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

  // Sisa Tahap 16 dan spinner PTR sudah dihapus dari DOM
  assert(!doc.querySelector('.m-ptr-spin, .mt-wm-beam, .mt-wm-shimmer-clip, #rk-wm-clip, #rk-wm-grad'), 'elemen Tahap 16 dan spinner PTR tidak ada di DOM');

  // Render ulang berulang tidak menggandakan grup huruf atau ID
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter').length, 6, 'render ulang tidak menggandakan grup huruf');
  assert.strictEqual(doc.querySelectorAll('#m-refresh-status').length, 1, 'id #m-refresh-status tetap unik');

  // Jam tiruan dan timer tiruan untuk memverifikasi urutan langkah, loop, finale, dan jalur non-sukses
  const origNow = w.Date.now;
  const origSetTimeout = w.setTimeout;
  const origClearTimeout = w.clearTimeout;
  let fakeNow = Date.now() + 500000;
  w.Date.now = () => fakeNow;
  const timers = [];
  let tSeq = 1;
  w.setTimeout = (fn, ms) => {
    const id = tSeq++;
    timers.push({ id, fn, due: fakeNow + (Number(ms) || 0), cleared: false });
    return id;
  };
  w.clearTimeout = (id) => {
    const found = timers.find((x) => x.id === id);
    if (found) found.cleared = true;
  };
  const activeTimersCount = () => timers.filter((x) => !x.cleared).length;
  const advanceTime = (ms) => {
    const target = fakeNow + ms;
    while (true) {
      const next = timers
        .filter((x) => !x.cleared && x.due <= target)
        .sort((a, b) => a.due - b.due)[0];
      if (!next) break;
      next.cleared = true;
      fakeNow = next.due;
      next.fn();
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

  const bnav = shellRoot.querySelector('.mob-bottom-nav');
  const rinBtn = bnav.querySelector('[data-mtab="rincian"]');

  // Pantau perubahan data-refreshing dan data-wm-finale lewat MutationObserver
  const refTransitions = [];
  const finaleEvents = [];
  const obs = new w.MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-refreshing') {
        const wasOn = m.oldValue === '1';
        const isOn = !wasOn;
        refTransitions.push(isOn ? 'on' : 'off');
      } else if (m.attributeName === 'data-wm-finale') {
        const wasStart = m.oldValue === '1';
        finaleEvents.push(wasStart ? 'end' : 'start');
      }
    }
  });
  obs.observe(shellRoot, { attributes: true, attributeOldValue: true, attributeFilter: ['data-refreshing', 'data-wm-finale'] });

  // Urutan cahaya R -> e -> n -> K -> e -> u pada refresh lokal cepat, lalu finale kuning hanya setelah u
  w._rkPtrReset();
  timers.length = 0;
  refTransitions.length = 0;
  finaleEvents.length = 0;
  fireTouch($('m-tab-rincian'), 'touchstart', 160, 120);
  fireTouch($('m-tab-rincian'), 'touchmove', 160, 250);
  fireTouch($('m-tab-rincian'), 'touchend', 160, 250);

  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'PTR menyalakan data-refreshing="1"');
  assert.strictEqual($('m-main').getAttribute('aria-busy'), 'true', '#m-main berstatus aria-busy="true"');
  assert.strictEqual($('m-refresh-status').textContent, 'Menyegarkan data', 'status pembaca layar tampil');

  const stepMs = w.RK_WM_STEP_MS || 300;
  for (let s = 0; s < 6; s++) {
    assert.strictEqual(shellRoot.getAttribute('data-wm-step'), String(s), `langkah ${s} menyalakan huruf ke-${s}`);
    assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, `belum ada finale pada langkah ${s}`);
    const litEls = [...shellRoot.querySelectorAll('g.mt-wm-letter.is-lit')];
    assert.strictEqual(litEls.length, 1, `tepat satu huruf .is-lit pada langkah ${s}`);
    assert.strictEqual(litEls[0].getAttribute('data-wm-idx'), String(s), `huruf .is-lit sesuai indeks ${s}`);
    advanceTime(stepMs);
  }
  await flushMicrotasks();

  // Tepat setelah langkah 5 (u) selesai -> masuk finale kuning
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'setelah u selesai, masuk fase finale kuning');
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'in', 'awal finale menaikkan kilat kuning (in)');
  advanceTime(130);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'finale tetap aktif saat memudar ke putih');
  assert.strictEqual(shellRoot.getAttribute('data-wm-flash'), 'out', 'kilat kuning memudar ke putih penuh (out)');
  advanceTime(420);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'setelah finale selesai kembali idle');
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'atribut data-wm-finale dilepas');
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), null, 'atribut data-wm-step dilepas');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter.is-lit').length, 0, 'tidak ada huruf .is-lit saat idle');
  assert.deepStrictEqual(refTransitions, ['on', 'off'], 'satu siklus PTR menghasilkan tepat 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'finale muncul tepat 1x lalu dilepas');

  // Refresh lambat (pull cloud ditahan): cahaya mengulang dari R, finale baru setelah pull selesai & sampai u
  const origSb = w.sb;
  const origSbUser = w.sbUser;
  const origPull = w.pull;
  w.sb = { from: () => ({}) };
  w.sbUser = { id: 'u-t17-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  let resSlow = null;
  w.pull = () => new Promise((r) => { resSlow = () => { w._rkLastPullOk = true; r(); }; });
  w._rkPtrReset();
  refTransitions.length = 0;
  finaleEvents.length = 0;
  realClick(rinBtn);

  // A1: panggil syncMobileCloudUI berulang untuk pengguna yang sama saat pull ditahan -> indikator tetap aktif
  for (let k = 0; k < 4; k++) w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'A1: syncMobileCloudUI pada pengguna sama tidak mematikan indikator');

  // Lewati satu lintasan penuh 6 huruf sementara pull masih tertahan -> harus loop ke R (tanpa finale)
  advanceTime(stepMs * 6);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'pull masih berjalan: belum finale setelah u pertama');
  advanceTime(200);
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), '0', 'pull masih berjalan: cahaya mengulang kembali ke huruf R (0)');

  // Selesaikan pull di tengah lintasan ke-2 (di langkah 1) -> tunggu sampai u lalu finale
  advanceTime(stepMs);
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), '1', 'lintasan ke-2 di huruf e (1)');
  resSlow();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'pull selesai di langkah 1: finale menunggu sampai u');
  advanceTime(stepMs * 5);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'setelah u lintasan ke-2, finale kuning berjalan');
  advanceTime(560);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'cloud lambat selesai dan kembali idle');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], 'cloud lambat memainkan finale tepat 1x');

  // 10x re-tap tanpa jeda: cahaya tidak restart, data-refreshing 1x on & 1x off, finale 1x
  w.sbUser = null;
  w.syncMobileCloudUI();
  w._rkPtrReset();
  refTransitions.length = 0;
  finaleEvents.length = 0;
  realClick(rinBtn);
  advanceTime(stepMs); // pindah ke langkah 1 (e)
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), '1', 'sebelum ketukan ke-2 berada di langkah 1');
  for (let k = 0; k < 9; k++) {
    realClick(rinBtn);
    advanceTime(15);
  }
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), '1', '10x re-tap tidak me-restart cahaya kembali ke R');
  advanceTime(stepMs * 5 + 600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '10x re-tap berhenti ke idle');
  assert.deepStrictEqual(refTransitions, ['on', 'off'], '10x re-tap hanya 1x on dan 1x off');
  assert.deepStrictEqual(finaleEvents, ['start', 'end'], '10x re-tap hanya 1x finale');

  // Ketukan baru saat finale berlangsung: finale berhenti dan siklus baru mulai dari abu-abu + R
  w._rkPtrReset();
  finaleEvents.length = 0;
  realClick(rinBtn);
  advanceTime(stepMs * 6);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), '1', 'berada di tengah finale');
  realClick(rinBtn);
  assert.strictEqual(shellRoot.getAttribute('data-wm-finale'), null, 'ketukan saat finale langsung menghentikan finale');
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'siklus baru langsung aktif');
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), '0', 'siklus baru mulai dari huruf R (0)');
  advanceTime(stepMs * 6 + 600);
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'siklus lanjutan selesai ke idle');

  // Jalur non-sukses (reject, timeout 20 dtk, logout, _rkPtrReset, unmountMobileShell): tanpa finale kuning
  w.sbUser = { id: 'u-t17-a', email: 'a@example.com' };
  w.syncMobileCloudUI();

  // a) pull() reject
  let rejPull = null;
  w.pull = () => new Promise((_, rej) => { rejPull = () => rej(new Error('offline')); });
  w._rkPtrReset();
  finaleEvents.length = 0;
  realClick(rinBtn);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'reject: aktif saat mulai');
  rejPull();
  await flushMicrotasks();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'reject: langsung kembali idle');
  assert.strictEqual(finaleEvents.length, 0, 'reject: tidak memainkan finale kuning');

  // b) pull() tidak pernah selesai -> pengaman 20 detik tanpa kuning
  w.pull = () => new Promise(() => {});
  w._rkPtrReset();
  finaleEvents.length = 0;
  realClick(rinBtn);
  advanceTime(19500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'timeout 20s: masih aktif pada 19,5 detik');
  advanceTime(600);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'timeout 20s: berhenti otomatis');
  assert.strictEqual(finaleEvents.length, 0, 'timeout 20s: tanpa finale kuning');

  // c) logout -> berhenti tanpa kuning
  w._rkPtrReset();
  finaleEvents.length = 0;
  realClick(rinBtn);
  w.sbUser = null;
  w.syncMobileCloudUI();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'logout: berhenti tanpa menunggu');
  assert.strictEqual(finaleEvents.length, 0, 'logout: tanpa finale kuning');

  // d) _rkPtrReset() -> berhenti tanpa kuning dan tanpa timer tersisa
  w.sbUser = { id: 'u-t17-b', email: 'b@example.com' };
  w.syncMobileCloudUI();
  timers.length = 0;
  finaleEvents.length = 0;
  realClick(rinBtn);
  w._rkPtrReset();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, '_rkPtrReset: berhenti');
  assert.strictEqual(finaleEvents.length, 0, '_rkPtrReset: tanpa finale kuning');

  // e) Reduced motion: tidak ada langkah/finale, abu-abu statis 850ms lalu putih seketika
  const origRed = w.rkIsReducedMotion;
  w.rkIsReducedMotion = () => true;
  w.sbUser = null;
  w.syncMobileCloudUI();
  w._rkPtrReset();
  finaleEvents.length = 0;
  realClick(rinBtn);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'reduced-motion: data-refreshing aktif');
  assert.strictEqual(shellRoot.getAttribute('data-wm-step'), null, 'reduced-motion: tidak menjalankan langkah huruf');
  assert.strictEqual(shellRoot.querySelectorAll('g.mt-wm-letter.is-lit').length, 0, 'reduced-motion: tidak ada huruf menyala');
  advanceTime(400);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), '1', 'reduced-motion: masih abu-abu statis sebelum 850ms');
  advanceTime(500);
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'reduced-motion: kembali putih setelah 850ms');
  assert.strictEqual(finaleEvents.length, 0, 'reduced-motion: tidak memainkan finale kuning');
  w.rkIsReducedMotion = origRed;

  // f) unmountMobileShell: berhenti tanpa kuning
  w.sbUser = { id: 'u-t17-c', email: 'c@example.com' };
  w.syncMobileCloudUI();
  w.pull = () => new Promise(() => {});
  finaleEvents.length = 0;
  realClick(rinBtn);
  w.unmountMobileShell();
  assert.strictEqual(shellRoot.getAttribute('data-refreshing'), null, 'unmountMobileShell: berhenti');
  assert.strictEqual(finaleEvents.length, 0, 'unmountMobileShell: tanpa finale kuning');

  // Pulihkan mock
  obs.disconnect();
  w.setTimeout = origSetTimeout;
  w.clearTimeout = origClearTimeout;
  w.Date.now = origNow;
  w.sb = origSb;
  w.sbUser = origSbUser;
  w.pull = origPull;

  // Audit statis CSS, token, Desktop, dan sw.js >= v40
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
  assert(!/transition\s*:[^;]*\b(fill|filter|width|left|stop-color)\b/i.test(wmCssBlock), 'Wordmark hanya mentransisikan opacity/transform');
  assert(!/animation\s*:[^;]*infinite/i.test(wmCssBlock), 'Wordmark tidak menjalankan animasi CSS infinite saat idle');

  for (const tok of ['--wm-dead', '--wm-lit', '--wm-flash', '--dur-wm-fade', '--dur-wm-lit-in', '--dur-wm-lit-out', '--dur-wm-flash-in', '--dur-wm-flash-out']) {
    assert(cssTok.includes(tok), `Token ${tok} tersedia di css/tokens.css`);
  }
  assert(/--dur-wm-lit-in:\s*0\.001ms/.test(cssTok) && /--dur-wm-flash-in:\s*0\.001ms/.test(cssTok), 'Token durasi wordmark direduksi ke 0.001ms pada prefers-reduced-motion');
  assert(!cssTok.includes('--dur-wm-sweep') && !cssTok.includes('--ease-wm-sweep'), 'Token usang Tahap 16 (--dur-wm-sweep, --ease-wm-sweep) sudah dihapus');

  assert(!cssDesk.includes('mt-wm-') && !cssDesk.includes('data-wm-'), 'Isolasi Desktop: css/desktop.css bebas aturan wordmark APK');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 40, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v40');
  assert.strictEqual(w.RK_SCHEMA_VER, 3, 'RK_SCHEMA_VER tetap 3');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 17 (Wordmark Huruf-per-Huruf + Kilat Kuning + A1) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap17_wordmark_letters:', e);
  process.exit(1);
});
