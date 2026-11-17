/** Tes regresi untuk perbaikan Deep Audit: native APK shell detection, SVG NaN-free sim, privacy standalone, safe export/PDF tanpa window.open, serta core calc kosong/normal/defisit. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadCore, newYear, item } = require('../helpers/core');

const ROOT = path.join(__dirname, '..', '..');

function loadShellModeCtx(opts) {
  const o = opts || {};
  const win = Object.assign(
    {
      matchMedia(q) {
        return { matches: !!(o.standalone && /standalone/.test(q)) };
      },
    },
    o.windowExtra || {},
  );
  const c = loadCore({
    window: win,
    location: Object.assign({ search: o.search || '', protocol: o.protocol || 'https:', origin: 'https://example.com', pathname: '/app/' }, o.locationExtra || {}),
    navigator: Object.assign({ standalone: !!o.iosStandalone, userAgent: o.ua || 'Mozilla/5.0' }, o.navigatorExtra || {}),
    document: o.document || { body: null, documentElement: null },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'shell-mode.js'), 'utf8'), c, { filename: 'shell-mode.js' });
  return c;
}

test('detectShellMode otomatis mendeteksi Capacitor, Cordova, ReactNative, dan Android WebView (; wv) sebagai mobile-app', () => {
  const cap = loadShellModeCtx({ windowExtra: { Capacitor: { isNativePlatform: () => true } } });
  assert.equal(cap.isNativeShellEnv(), true);
  assert.equal(cap.detectShellMode(''), 'mobile-app');
  assert.equal(cap.detectShellMode('?mode=browser'), 'browser');

  const wv = loadShellModeCtx({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/124.0 Mobile Safari/537.36' });
  assert.equal(wv.isNativeShellEnv(), true);
  assert.equal(wv.detectShellMode(''), 'mobile-app');

  const capProto = loadShellModeCtx({ protocol: 'capacitor:' });
  assert.equal(capProto.isNativeShellEnv(), true);
  assert.equal(capProto.detectShellMode(''), 'mobile-app');

  const desk = loadShellModeCtx({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' });
  assert.equal(desk.isNativeShellEnv(), false);
  assert.equal(desk.detectShellMode(''), 'browser');
});

test('rkDownloadBlob & downloadRepPdf mengunduh aman tanpa window.open, membersihkan Blob URL, dan punya fallback Android WebView', () => {
  const clicked = [];
  const revoked = [];
  let openedPopup = false;
  const body = { appendChild() {}, removeChild() {} };
  const c = loadShellModeCtx({
    windowExtra: {
      open() {
        openedPopup = true;
      },
    },
    document: {
      body,
      getElementById() {
        return null;
      },
      createElement() {
        return {
          href: '',
          download: '',
          rel: '',
          style: {},
          click() {
            clicked.push({ href: this.href, download: this.download });
          },
          remove() {},
        };
      },
    },
  });
  c.Blob = class MockBlob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts && opts.type;
    }
  };
  c.URL = {
    createObjectURL() {
      return 'blob:mock-1';
    },
    revokeObjectURL(u) {
      revoked.push(u);
    },
  };
  c.setTimeout = (fn) => {
    fn();
    return 1;
  };
  c.$ = () => null;
  c.toast = () => {};

  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'io.js'), 'utf8'), c, { filename: 'io.js' });
  c.exportFile('cadangan.json', '{"ok":true}', 'application/json');
  assert.equal(openedPopup, false);
  assert.equal(clicked.length, 1);
  assert.equal(clicked[0].download, 'cadangan.json');
  assert.equal(revoked[0], 'blob:mock-1');

  // Native WebView fallback via FileReader Data-URI
  const wvClicks = [];
  const wvCtx = loadShellModeCtx({
    ua: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36',
    document: {
      body,
      getElementById() { return null; },
      createElement() {
        return {
          href: '', download: '', rel: '', style: {},
          click() { wvClicks.push({ href: this.href, download: this.download }); },
          remove() {},
        };
      },
    },
  });
  wvCtx.Blob = c.Blob;
  wvCtx.URL = c.URL;
  wvCtx.FileReader = class MockFR {
    readAsDataURL() {
      this.result = 'data:application/pdf;base64,JVBERi0=';
      if (this.onload) this.onload();
    }
  };
  wvCtx.$ = () => null;
  wvCtx.toast = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'io.js'), 'utf8'), wvCtx, { filename: 'io.js' });
  const res = wvCtx.rkDownloadBlob('laporan.pdf', new Uint8Array([1, 2]), 'application/pdf');
  assert.equal(res.method, 'data-url');
  assert.equal(wvClicks.length, 1);
  assert.equal(wvClicks[0].download, 'laporan.pdf');
  assert.ok(wvClicks[0].href.startsWith('data:application/pdf;base64,'));
});

test('renderMobSim tidak membayangi variabel padding pB sehingga SVG bebas NaN pada kondisi kosong maupun defisit', () => {
  const mobSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui-mobile', 'mobile-app.js'), 'utf8');
  assert.ok(!mobSrc.includes('var pA = pathFn(ptsA), pB = pathFn(ptsB)'), 'variabel path tidak boleh membayangi pB');
  assert.ok(mobSrc.includes('pathA') && mobSrc.includes('pathB'), 'renderMobSim memakai pathA/pathB');

  const svgNode = {
    innerHTML: '',
    attrs: {},
    style: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
  };
  const c = loadCore({
    SIM: [],
    simCalc: () => ({ rows: [], end: 0 }),
    simDesc: () => '',
    mobPaintAllSliders() {},
    $(id) { return id === 'm-svg-sim-chart' ? svgNode : null; },
  });
  newYear(c, 2026, { saldo: 0, startMonth: 10 });
  vm.runInContext(
    'function mobFmtShort(v){return String(Math.round(v||0));}\n' + mobSrc.slice(mobSrc.indexOf('function renderMobSim()'), mobSrc.indexOf('function mobTrips()')),
    c,
    { filename: 'renderMobSim.js' },
  );

  // Kondisi kosong (0)
  c.renderMobSim();
  assert.ok(svgNode.innerHTML.includes('<line '), 'garis nol tetap ter-render');
  assert.equal(svgNode.innerHTML.includes('NaN'), false, 'kondisi kosong bebas NaN');

  // Kondisi defisit (< 0)
  c.S.saldo = 100000;
  c.S.items = [item({ id: 9, price: 2000000, start: '2026-12-10' })];
  const r = c.calc();
  assert.ok(r.end < 0 && Number.isFinite(r.end));
  c.renderMobSim();
  assert.equal(svgNode.innerHTML.includes('NaN'), false, 'kondisi defisit bebas NaN');
});

test('calc & reminders aman dan konsisten pada kondisi kosong (0), normal, dan defisit (< 0)', () => {
  const c = loadCore({ window: { __today: '2026-11-17' } });
  newYear(c, 2026, { saldo: 0, startMonth: 10 });
  const rEmpty = c.calc();
  assert.equal(rEmpty.total, 0);
  assert.equal(rEmpty.end, 0);
  assert.equal(Number.isNaN(rEmpty.end), false);

  c.S.saldo = 500000;
  c.S.items = [item({ id: 1, price: 300000, start: '2026-06-01', cat: 'Hiburan' })];
  const rDeficit = c.calc();
  assert.equal(rDeficit.total, 2 * 300000);
  assert.equal(rDeficit.end, 500000 - 600000);
  assert.ok(rDeficit.end < 0);

  // Profil tahun penuh (2027): 12 bulan normal + saldo positif
  const Y27 = newYear(c, 2027, { saldo: 5000000, startMonth: 0 });
  Y27.items = [item({ id: 2, price: 100000, start: '2027-01-10', cat: 'Tagihan rutin' })];
  const r27 = c.calc();
  assert.equal(r27.total, 1200000);
  assert.equal(r27.end, 3800000);

  const rem = c.reminders(7);
  assert.ok(Array.isArray(rem.late) && Array.isArray(rem.soon));
});

test('sync.js mengizinkan origin capacitor:/ionic: untuk OAuth redirect Android/iOS', () => {
  const syncSrc = fs.readFileSync(path.join(ROOT, 'js', 'sync.js'), 'utf8');
  assert.ok(syncSrc.includes('capacitor|ionic'), 'authGoogle mendukung skema origin Capacitor/Ionic');
});
