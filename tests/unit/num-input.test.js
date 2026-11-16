/** Tes unit helper input nominal auto-format (js/ui/num-input.js) & router shell (js/ui/shell-mode.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadCore } = require('../helpers/core');

function loadUiHelpers(opts) {
  const options = opts || {};
  const attrs = { body: {}, html: {} };
  const els = Object.assign({}, options.els || {});
  const listeners = {};
  const doc = {
    body: {
      setAttribute(k, v) {
        attrs.body[k] = String(v);
      },
      getAttribute(k) {
        return k in attrs.body ? attrs.body[k] : null;
      },
    },
    documentElement: {
      setAttribute(k, v) {
        attrs.html[k] = String(v);
      },
      getAttribute(k) {
        return k in attrs.html ? attrs.html[k] : null;
      },
    },
    getElementById(id) {
      return els[id] || null;
    },
    addEventListener(ev, fn) {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
  };
  const win = {
    matchMedia(q) {
      return { matches: !!(options.standalone && /standalone/.test(q)) };
    },
  };
  const c = loadCore({
    document: doc,
    window: win,
    location: { search: options.search || '' },
    navigator: { standalone: !!options.iosStandalone },
    $(id) {
      return doc.getElementById(id);
    },
  });
  c._attrs = attrs;
  c._els = els;
  c._listeners = listeners;
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'num-input.js'), 'utf8'),
    c,
    { filename: 'num-input.js' },
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'shell-mode.js'), 'utf8'),
    c,
    { filename: 'shell-mode.js' },
  );
  return c;
}

test('fmtRpInputStr memformat pemisah ribuan real-time tanpa merusak shorthand saat mengetik', () => {
  const c = loadUiHelpers();
  assert.equal(c.fmtRpInputStr('1000000'), '1.000.000');
  assert.equal(c.fmtRpInputStr('25500000'), '25.500.000');
  assert.equal(c.fmtRpInputStr('00050000'), '50.000');
  assert.equal(c.fmtRpInputStr('0'), '0');
  assert.equal(c.fmtRpInputStr('250k'), '250k');
  assert.equal(c.fmtRpInputStr(''), '');
});

test('fmtRpBlurStr mengonversi shorthand (k, jt) menjadi format ribuan titik saat blur', () => {
  const c = loadUiHelpers();
  assert.equal(c.fmtRpBlurStr('250k'), '250.000');
  assert.equal(c.fmtRpBlurStr('1,5jt'), '1.500.000');
  assert.equal(c.fmtRpBlurStr('1000000'), '1.000.000');
});

test('fmtLive menjaga posisi kursor saat menyisipkan angka di tengah nominal berformat', () => {
  const c = loadUiHelpers();
  let sel = [0, 0];
  const mockInput = {
    value: '1.2000.000',
    selectionStart: 3, // tepat setelah "1.2"
    setSelectionRange(a, b) {
      sel = [a, b];
    },
  };
  c.fmtLive(mockInput);
  assert.equal(mockInput.value, '12.000.000');
  assert.deepEqual(sel, [2, 2]); // kursor tepat setelah "12"
});

test('getRpVal & setRpVal melakukan round-trip nilai murni untuk js/core & Supabase + sinkron slider', () => {
  const styleMap = {};
  const sliderEl = {
    min: '0',
    max: '10000000',
    value: '0',
    style: {
      setProperty(k, v) {
        styleMap[k] = v;
      },
    },
  };
  const numInputEl = {
    tagName: 'INPUT',
    id: 'm-sim-price',
    value: '',
    dataset: { sliderSync: 'm-sim-slider' },
    getAttribute() {
      return 'rp';
    },
    setSelectionRange() {},
  };
  const c = loadUiHelpers({ els: { 'm-sim-price': numInputEl, 'm-sim-slider': sliderEl } });

  c.setRpVal('m-sim-price', 1000000);
  assert.equal(numInputEl.value, '1.000.000');
  assert.equal(c.getRpVal('m-sim-price'), 1000000);
  assert.equal(typeof c.getRpVal('m-sim-price'), 'number');
  assert.equal(sliderEl.value, '1000000');
  assert.equal(styleMap['--val-pct'], '10%');

  // Simulasikan input langsung terformat menjadi nilai murni
  numInputEl.value = '2500000';
  c.fmtLive(numInputEl);
  assert.equal(numInputEl.value, '2.500.000');
  assert.equal(c.getRpVal(numInputEl), 2500000);
  assert.equal(c.parseRp(numInputEl.value), 2500000);
  assert.equal(sliderEl.value, '2500000');
  assert.equal(styleMap['--val-pct'], '25%');
});

test('detectShellMode & setShellMode mendeteksi ?mode=app, ?mode=browser, PWA standalone, dan menyimpan ke localStorage', () => {
  const c1 = loadUiHelpers({ search: '?mode=app' });
  assert.equal(c1.detectShellMode(), 'mobile-app');
  assert.equal(c1.detectShellMode('?mode=browser'), 'browser');

  const c2 = loadUiHelpers({ standalone: true });
  assert.equal(c2.detectShellMode(''), 'mobile-app');

  const c3 = loadUiHelpers();
  assert.equal(c3.detectShellMode(''), 'browser');
  c3.setShellMode('mobile-app', true);
  assert.equal(c3._attrs.body['data-shell'], 'mobile-app');
  assert.equal(c3._attrs.html['data-shell'], 'mobile-app');
  assert.equal(c3.localStorage.getItem('rk-shell-mode'), 'mobile-app');
  assert.equal(c3.detectShellMode(''), 'mobile-app');

  c3.toggleShellMode();
  assert.equal(c3.getShellMode(), 'browser');
  assert.equal(c3.localStorage.getItem('rk-shell-mode'), 'browser');
});

test('PWA standalone config: manifest.webmanifest, sw.js, index.dev.html, dan dist/ memenuhi syarat Chrome Android', () => {
  const root = path.join(__dirname, '..', '..');
  const mf = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(mf.display, 'standalone');
  assert.equal(mf.start_url, './?mode=app');
  assert.equal(mf.scope, './');
  assert(Array.isArray(mf.icons) && mf.icons.length >= 2);
  const pngIcons = mf.icons.filter((ic) => ic.type === 'image/png' && ic.src.startsWith('./'));
  assert(pngIcons.some((ic) => ic.sizes === '192x192'), 'wajib ada ikon PNG 192x192');
  assert(pngIcons.some((ic) => ic.sizes === '512x512'), 'wajib ada ikon PNG 512x512');
  for (const ic of mf.icons) {
    const rel = ic.src.replace(/^\.\//, '');
    assert(fs.existsSync(path.join(root, rel)), 'ikon root ada: ' + rel);
    assert(fs.existsSync(path.join(root, 'dist', rel)), 'ikon dist/ ada: ' + rel);
  }
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert(sw.includes("addEventListener('fetch'") || sw.includes('addEventListener("fetch"'), 'sw.js wajib punya listener fetch');
  const devHtml = fs.readFileSync(path.join(root, 'index.dev.html'), 'utf8');
  assert(devHtml.includes("register('./sw.js', { scope: './' })"), 'index.dev.html mendaftarkan ./sw.js dengan scope ./');
  assert(devHtml.includes('href="./manifest.webmanifest"'), 'index.dev.html memuat manifest relatif');
});
