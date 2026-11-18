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
  assert(sw.includes('requireInteraction: true') && sw.includes("icon: './icon-192.png'"), 'sw.js menyetel notifikasi persisten dengan ikon');
  const tripSrc = fs.readFileSync(path.join(root, 'js', 'ui', 'trip.js'), 'utf8');
  assert(tripSrc.includes('requireInteraction: true') && tripSrc.includes("badge: './icon-192.png'"), 'triggerSystemNotification menyetel requireInteraction & badge agar bertahan di Laci Notifikasi/Lock Screen');
});

test('Brand RenKeu & aset logo: manifest, favicon, maskable, adaptif, kurva SVG murni tanpa Google Fonts', () => {
  const root = path.join(__dirname, '..', '..');
  const mf = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(mf.name, 'Rencana Keuangan');
  assert.equal(mf.short_name, 'RenKeu');
  assert.equal(mf.theme_color, '#0E3F86');
  assert.equal(mf.background_color, '#EEF1F5');
  assert(mf.icons.some((ic) => ic.sizes === '192x192' && ic.purpose === 'any'), 'wajib ada ikon 192x192 purpose any');
  assert(mf.icons.some((ic) => ic.sizes === '512x512' && ic.purpose === 'any'), 'wajib ada ikon 512x512 purpose any');
  assert(mf.icons.some((ic) => ic.sizes === '512x512' && ic.purpose === 'maskable'), 'wajib ada ikon 512x512 purpose maskable');

  const brandFiles = [
    'favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png',
    'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
    'icon-adaptive-fg-512.png', 'icon-adaptive-bg-512.png',
    'logo-lockup-light.svg', 'logo-lockup-dark.svg',
  ];
  for (const rel of brandFiles) {
    assert(fs.existsSync(path.join(root, rel)), 'aset root ada: ' + rel);
    assert(fs.existsSync(path.join(root, 'dist', rel)), 'aset dist/ ada: ' + rel);
  }

  for (const svgFile of ['favicon.svg', 'logo-lockup-light.svg', 'logo-lockup-dark.svg']) {
    const svgSrc = fs.readFileSync(path.join(root, svgFile), 'utf8');
    assert(svgSrc.includes('<path '), svgFile + ' memakai path kurva SVG');
    assert(!/<text[\s>]/i.test(svgSrc), svgFile + ' tidak boleh mengandung elemen <text>');
    assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(svgSrc), svgFile + ' bebas permintaan Google Fonts');
  }

  for (const htmlRel of ['index.dev.html', 'index.html', path.join('dist', 'index.html')]) {
    const html = fs.readFileSync(path.join(root, htmlRel), 'utf8');
    assert(html.includes('<title>Rencana Keuangan</title>'), htmlRel + ' punya <title> Rencana Keuangan');
    assert(html.includes('name="apple-mobile-web-app-title" content="RenKeu"'), htmlRel + ' apple-mobile-web-app-title = RenKeu');
    assert(html.includes('name="application-name" content="RenKeu"'), htmlRel + ' application-name = RenKeu');
    assert(html.includes('property="og:title" content="Rencana Keuangan"'), htmlRel + ' og:title = Rencana Keuangan');
    assert(!html.includes('content="Rencana"'), htmlRel + ' tidak boleh menyisakan short_name lama Rencana');
    assert(html.includes('./favicon.svg?v=3') && html.includes('./favicon-16.png?v=3') && html.includes('./favicon-32.png?v=3'), htmlRel + ' memuat tautan favicon cache-busted ?v=3');
    assert(html.includes('id="rk-meta-theme"'), htmlRel + ' memuat meta #rk-meta-theme');
    assert(html.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), htmlRel + ' menyetel status bar iOS black-translucent');
    assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html), htmlRel + ' bebas permintaan Google Fonts');
    const symMatch = html.match(/<symbol id="rk-brand-symbol"[\s\S]*?<\/symbol>/i);
    assert(symMatch && !/<text[\s>]/i.test(symMatch[0]), htmlRel + ' simbol inline murni path tanpa <text>');
    const wmMatch = html.match(/<span class="sb-brand-wordmark"[\s\S]*?<\/span>/i);
    assert(wmMatch && wmMatch[0].includes('<path ') && !/<text[\s>]/i.test(wmMatch[0]), htmlRel + ' wordmark sidebar murni path tanpa <text>');
  }

  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert(!sw.includes("rk-cache-v14") && !sw.includes("rk-cache-v15"), 'sw.js harus menaikkan versi CACHE_NAME dari v15');
  assert(sw.includes('./favicon.svg') && sw.includes('./icon-maskable-512.png'), 'sw.js melakukan precache aset logo baru');
});
