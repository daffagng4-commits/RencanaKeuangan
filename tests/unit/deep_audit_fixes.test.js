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

test('rkDownloadBlob & downloadRepPdf mengunduh aman tanpa window.open, membersihkan Blob URL, dan punya fallback Android WebView', async () => {
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

  // B2: Native WebView tanpa plugin Filesystem/Share dan tanpa navigator.share TIDAK boleh dianggap berhasil via data-url
  const wvCtx = loadShellModeCtx({
    ua: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36',
    document: {
      body,
      getElementById() { return null; },
      createElement() {
        return { href: '', download: '', rel: '', style: {}, click() {}, remove() {} };
      },
    },
  });
  wvCtx.Blob = c.Blob;
  wvCtx.URL = c.URL;
  wvCtx.$ = () => null;
  wvCtx.toast = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'io.js'), 'utf8'), wvCtx, { filename: 'io.js' });
  const resNoPlugin = wvCtx.rkDownloadBlob('laporan.pdf', new Uint8Array([1, 2]), 'application/pdf');
  const doneNoPlugin = await resNoPlugin.done;
  assert.equal(resNoPlugin.ok, false);
  assert.notEqual(resNoPlugin.method, 'data-url');
  assert.equal(doneNoPlugin.ok, false);
  assert.match(doneNoPlugin.error || '', /Salin teks|coba lagi/i);
});

test('B2: rkDownloadBlob native memakai Capacitor Filesystem (Directory.Cache + rk-export + cleanup <=5) & Share, base64 chunked akurat', async () => {
  function setupNativeCap({ readdirRes, failWrite, failShare, failCleanup } = {}) {
    const calls = [];
    const deleted = [];
    const written = {};
    const c = loadShellModeCtx({
      windowExtra: {
        Capacitor: {
          isNativePlatform: () => true,
          isPluginAvailable: (n) => n === 'Filesystem' || n === 'Share',
          Plugins: {
            Filesystem: {
              async writeFile(opts) {
                calls.push(['writeFile', opts]);
                if (failWrite) throw new Error(failWrite);
                written[opts.path] = opts;
                return { uri: 'file:///data/user/0/id.renkeu.app/cache/' + opts.path };
              },
              async readdir(opts) {
                calls.push(['readdir', opts]);
                if (failCleanup) throw new Error('readdir gagal');
                return readdirRes || { files: [] };
              },
              async deleteFile(opts) {
                calls.push(['deleteFile', opts]);
                if (failCleanup) throw new Error('delete gagal');
                deleted.push(opts.path);
                return {};
              },
              async getUri(opts) {
                calls.push(['getUri', opts]);
                return { uri: 'file:///data/user/0/id.renkeu.app/cache/' + opts.path };
              },
            },
            Share: {
              async share(opts) {
                calls.push(['share', opts]);
                if (failShare) throw (failShare instanceof Error ? failShare : new Error(failShare));
                return { activityType: 'com.google.android.apps.docs' };
              },
            },
          },
        },
      },
      document: { body: { appendChild() {}, removeChild() {} }, getElementById: () => null, createElement: () => ({ style: {}, click() {}, remove() {} }) },
    });
    c.Blob = class MockBlob {
      constructor(parts, opts) {
        this.parts = parts;
        this.type = opts && opts.type;
        this._bytes = Buffer.concat(
          (parts || []).map((p) => (p instanceof Uint8Array ? Buffer.from(p) : Buffer.from(String(p), 'utf8'))),
        );
      }
      async arrayBuffer() {
        return this._bytes.buffer.slice(this._bytes.byteOffset, this._bytes.byteOffset + this._bytes.byteLength);
      }
    };
    c.File = class { constructor(parts, name, opts) { this.parts = parts; this.name = name; this.type = opts && opts.type; } };
    c.$ = () => null;
    c.toast = () => {};
    c.btoa = (s) => Buffer.from(s, 'latin1').toString('base64');
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'io.js'), 'utf8'), c, { filename: 'io.js' });
    return { c, calls, deleted, written };
  }

  // 1. Sukses dengan payload besar (220 KB) -> chunked base64 byte-exact, urutan writeFile -> readdir/delete -> getUri -> Share.share, nama aman
  const bigBytes = new Uint8Array(220 * 1024);
  for (let i = 0; i < bigBytes.length; i++) bigBytes[i] = (i * 31 + 7) & 255;
  const okEnv = setupNativeCap({
    readdirRes: {
      files: [1, 2, 3, 4, 5, 6, 7].map((idx) => ({
        name: `old-${idx}.pdf`,
        type: 'file',
        mtime: idx * 1000,
      })),
    },
  });
  const dlBig = okEnv.c.rkDownloadBlob('../itinerary:bali 日本?.pdf', bigBytes, 'application/pdf');
  const resBig = await dlBig.done;
  assert.equal(resBig.ok, true);
  const wCall = okEnv.calls.find((x) => x[0] === 'writeFile');
  const gCall = okEnv.calls.find((x) => x[0] === 'getUri');
  const sCall = okEnv.calls.find((x) => x[0] === 'share');
  assert.ok(wCall && gCall && sCall, 'writeFile, getUri, dan Share.share harus terpanggil');
  assert.equal(wCall[1].directory, 'CACHE');
  assert.equal(wCall[1].recursive, true);
  assert.equal(wCall[1].encoding, undefined, 'binary base64 tidak boleh mengirim encoding UTF8');
  assert.match(wCall[1].path, /^rk-export\/[a-zA-Z0-9._-]+\.pdf$/, 'path berada di subfolder rk-export/ dengan nama aman');
  assert.ok(!wCall[1].path.includes('..'), 'path traversal dibersihkan');
  const roundTrip = Buffer.from(wCall[1].data, 'base64');
  assert.equal(roundTrip.length, bigBytes.length, 'ukuran byte base64 identik');
  assert.ok(roundTrip.equals(Buffer.from(bigBytes)), 'isi base64 identik byte-per-byte tanpa overflow');
  assert.equal(gCall[1].directory, 'CACHE');
  assert.equal(gCall[1].path, wCall[1].path);
  assert.deepEqual(Array.from(sCall[1].files), ['file:///data/user/0/id.renkeu.app/cache/' + wCall[1].path]);
  assert.ok(okEnv.calls.findIndex((x) => x[0] === 'writeFile') < okEnv.calls.findIndex((x) => x[0] === 'getUri'));
  assert.ok(okEnv.calls.findIndex((x) => x[0] === 'getUri') < okEnv.calls.findIndex((x) => x[0] === 'share'));
  assert.equal(okEnv.deleted.length, 2, 'cleanup menyisakan maks 5 file (hapus 2 tertua dari 7)');
  assert.ok(okEnv.deleted.includes('rk-export/old-1.pdf') && okEnv.deleted.includes('rk-export/old-2.pdf'));

  // 2. Cleanup error TIDAK menggagalkan ekspor
  const cleanErrEnv = setupNativeCap({ failCleanup: true });
  const resCleanErr = await cleanErrEnv.c.rkDownloadBlob('template.xlsx', new Uint8Array([80, 75, 3, 4]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').done;
  assert.equal(resCleanErr.ok, true, 'gagal membersihkan cache tidak menggagalkan ekspor');

  // 3. Pembatalan pengguna ("Share canceled" dari @capacitor/share)
  const cancelEnv = setupNativeCap({ failShare: 'Share canceled' });
  const resCancel = await cancelEnv.c.rkDownloadBlob('a.pdf', new Uint8Array([37, 80]), 'application/pdf').done;
  assert.equal(resCancel.ok, false);
  assert.equal(resCancel.cancelled, true, '"Share canceled" dikenali sebagai pembatalan pengguna');

  // 4. Galat tulis file
  const errEnv = setupNativeCap({ failWrite: 'Disk full' });
  const resErr = await errEnv.c.rkDownloadBlob('a.pdf', new Uint8Array([37, 80]), 'application/pdf').done;
  assert.equal(resErr.ok, false);
  assert.equal(resErr.cancelled, false);
  assert.match(resErr.error || '', /Disk full/);
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

test('A3: rkDownloadBlob mengekspos done Promise jujur (share ok/cancelled/error) tanpa memutus pemanggil lama', async () => {
  const mkNative = (shareFn) => {
    const c = loadShellModeCtx({
      ua: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36',
      document: { body: { appendChild() {}, removeChild() {} }, getElementById: () => null, createElement: () => ({ style: {}, click() {}, remove() {} }) },
    });
    c.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } };
    c.File = class { constructor(parts, name, opts) { this.parts = parts; this.name = name; this.type = opts && opts.type; } };
    c.FileReader = class {};
    c.navigator.canShare = () => true;
    c.navigator.share = shareFn;
    c.$ = () => null;
    c.toast = () => {};
    c.btoa = (s) => Buffer.from(s, 'latin1').toString('base64');
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'io.js'), 'utf8'), c, { filename: 'io.js' });
    return c;
  };
  const cOk = mkNative(() => Promise.resolve());
  const rOk = cOk.rkDownloadBlob('a.pdf', new Uint8Array([37, 80]), 'application/pdf');
  assert.equal(rOk.method, 'share');
  assert.equal((await rOk.done).ok, true);

  const cAbort = mkNative(() => { const e = new Error('cancelled'); e.name = 'AbortError'; return Promise.reject(e); });
  const dAbort = await cAbort.rkDownloadBlob('a.pdf', new Uint8Array([37, 80]), 'application/pdf').done;
  assert.equal(dAbort.ok, false);
  assert.equal(dAbort.cancelled, true);

  const cErr = mkNative(() => Promise.reject(new Error('not supported')));
  const dErr = await cErr.rkDownloadBlob('a.pdf', new Uint8Array([37, 80]), 'application/pdf').done;
  assert.equal(dErr.ok, false);
  assert.equal(dErr.cancelled, false);
  assert.match(dErr.error, /not supported/);
});
