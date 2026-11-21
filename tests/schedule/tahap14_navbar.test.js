// Verifikasi Tahap 14: Bottom Navbar APK Baru (Putih, Melayang, Hanya Ikon, Takik Melengkung)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function extractBraceBlock(src, startIdx) {
  const openIdx = src.indexOf('{', startIdx);
  if (openIdx < 0) return '';
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return '';
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const doc = w.document;

  w.__today = '2026-11-21';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 10000000;
  w.S.items = [
    { id: 1401, name: 'Internet Fiber', price: 450000, n: 1, unit: 'bulan', start: '2026-11-15', end: '', cnt: 0, cat: 'Tagihan rutin', ch: [] },
  ];
  w.renderAll();

  // 1. Mode APK aktif & struktur DOM bottom navbar baru
  w.setShellMode('mobile-app');
  const mobShell = $('mobile-app-shell').querySelector('.mob-shell');
  assert(mobShell, 'Mode APK terpasang di #mobile-app-shell .mob-shell');
  const bnav = mobShell.querySelector('.mob-bottom-nav');
  assert(bnav, 'Elemen .mob-bottom-nav ter-render');

  // Latar takik SVG & satu titik penanda aktif
  const bgPath = bnav.querySelector('.bn-bg .bn-bg-svg path.bn-bg-path');
  assert(bgPath, 'Latar takik SVG (.bn-bg .bn-bg-svg path.bn-bg-path) ada');
  assert(!bnav.querySelector('#m-bn-pill, .bn-pill'), 'Tidak memakai pil latar #m-bn-pill / .bn-pill');
  const dots = bnav.querySelectorAll('.bn-active-dot');
  assert.strictEqual(dots.length, 1, 'Tepat satu elemen titik penanda .bn-active-dot');
  const dot = $('m-bn-dot');
  assert.strictEqual(dot, dots[0], 'Titik penanda memiliki id #m-bn-dot');

  // Urutan slot interaktif: Rincian, Transaksi, [+], Jadwal, Menu
  const directSlots = [...bnav.children].filter((el) => el.classList.contains('bn-btn') || el.classList.contains('bn-center-slot'));
  assert.strictEqual(directSlots.length, 5, 'Bottom nav memiliki tepat 5 slot (4 tab + 1 slot tengah)');
  assert.strictEqual(directSlots[0].getAttribute('data-mtab'), 'rincian', 'Slot 0 adalah tab Rincian');
  assert.strictEqual(directSlots[1].getAttribute('data-mtab'), 'kas', 'Slot 1 adalah tab Transaksi');
  assert(directSlots[2].classList.contains('bn-center-slot'), 'Slot 2 adalah .bn-center-slot');
  const fabBtn = directSlots[2].querySelector('#m-yr-btn-center.bn-plus-fab');
  assert(fabBtn, 'Tombol "+" #m-yr-btn-center.bn-plus-fab berada di antara tab ke-2 dan ke-3');
  assert.strictEqual(fabBtn.getAttribute('aria-label'), 'Tahun, bulan saldo, dan saldo awal', 'aria-label tombol "+" tetap dipertahankan');
  assert.strictEqual(directSlots[3].getAttribute('data-mtab'), 'jadwal', 'Slot 3 adalah tab Jadwal');
  assert.strictEqual(directSlots[4].id, 'm-btn-more', 'Slot 4 adalah tombol Menu (#m-btn-more)');

  // 4 tab hanya ikon, aria-label, dan aria-current
  const expectedTabs = [
    { el: directSlots[0], label: 'Rincian', hasHomePath: 'M3 10.5 12 3l9 7.5' },
    { el: directSlots[1], label: 'Transaksi', hasHomePath: 'M20 7H5a2 2 0 0 1 0-4h13v4' },
    { el: directSlots[3], label: 'Jadwal', hasHomePath: 'M16 2v4M8 2v4M3 10h18' },
    { el: directSlots[4], label: 'Menu', hasHomePath: null },
  ];
  for (const item of expectedTabs) {
    assert.strictEqual(item.el.tagName, 'BUTTON', 'Tab tetap elemen <button>');
    assert.strictEqual(item.el.getAttribute('aria-label'), item.label, 'Tab memiliki aria-label ' + item.label);
    assert.strictEqual(item.el.textContent.trim(), '', 'Tab ' + item.label + ' tidak menampilkan teks judul visual');
    assert.strictEqual(item.el.querySelectorAll('span:not(.m-upd-dot)').length, 0, 'Tab ' + item.label + ' tidak memiliki <span> judul');
    const svg = item.el.querySelector('svg');
    assert(svg, 'Tab ' + item.label + ' memuat SVG ikon');
    assert.strictEqual(svg.getAttribute('viewBox'), '0 0 24 24', 'Ikon ' + item.label + ' menjaga viewBox 24x24');
    assert.strictEqual(svg.getAttribute('stroke'), 'currentColor', 'Ikon ' + item.label + ' mengikuti currentColor');
    if (item.hasHomePath) {
      assert(svg.innerHTML.includes(item.hasHomePath), 'Ikon ' + item.label + ' memakai SVG asli tanpa digambar ulang');
    } else {
      assert(svg.innerHTML.includes('x1="8" y1="6"') && svg.innerHTML.includes('cx="3.5"'), 'Ikon Menu memakai SVG asli');
    }
  }
  assert.strictEqual(directSlots[0].getAttribute('aria-current'), 'page', 'Tab aktif awal Rincian memiliki aria-current="page"');
  assert(!directSlots[1].hasAttribute('aria-current') && !directSlots[3].hasAttribute('aria-current') && !directSlots[4].hasAttribute('aria-current'), 'Tab nonaktif tidak memiliki aria-current');
  assert.strictEqual(dot.getAttribute('data-active-slot'), '0', 'Penanda #m-bn-dot mulai di slot 0');

  // 2. Fungsi helper path takik SVG
  assert.strictEqual(typeof w.rkBuildNavNotchPath, 'function', 'Helper rkBuildNavNotchPath diekspos');
  const path320 = w.rkBuildNavNotchPath(292, 62);
  const path412 = w.rkBuildNavNotchPath(384, 62);
  assert(typeof path320 === 'string' && path320.startsWith('M ') && path320.endsWith(' Z') && path320 !== path412, 'Path takik SVG berskala terhadap lebar batang');

  // 3. Perilaku tombol "+" membuka #m-sheet-periode
  click(fabBtn);
  assert($('m-sheet-periode').classList.contains('open'), 'Klik "+" membuka #m-sheet-periode');
  click($('m-sheet-periode').querySelector('[data-mclose="m-sheet-periode"]'));
  assert(!$('m-sheet-periode').classList.contains('open'), '#m-sheet-periode dapat ditutup kembali');

  // 4. Perilaku klik tiap tab, perpindahan aria-current & titik penanda, serta tanpa ripple
  const switched = [];
  const origSwitch = w.switchMobileTab;
  w.switchMobileTab = function (id) {
    switched.push(id);
    return origSwitch.apply(this, arguments);
  };

  const kasBtn = directSlots[1];
  const pdEvt = new w.Event('pointerdown', { bubbles: true });
  pdEvt.button = 0;
  kasBtn.dispatchEvent(pdEvt);
  assert(!kasBtn.querySelector('.rk-ripple-clip'), 'Menekan tab .bn-btn tidak memicu elemen .rk-ripple-clip');

  click(kasBtn);
  assert.strictEqual(switched[switched.length - 1], 'kas', 'Klik tab Transaksi memanggil switchMobileTab("kas")');
  assert($('m-tab-kas').classList.contains('active'), 'Panel #m-tab-kas aktif');
  assert.strictEqual(kasBtn.getAttribute('aria-current'), 'page', 'aria-current pindah ke tab Transaksi');
  assert(!directSlots[0].hasAttribute('aria-current'), 'aria-current lepas dari Rincian');
  assert.strictEqual(dot.getAttribute('data-active-slot'), '1', '#m-bn-dot pindah ke slot 1');

  click(directSlots[3]);
  assert.strictEqual(switched[switched.length - 1], 'jadwal', 'Klik tab Jadwal memanggil switchMobileTab("jadwal")');
  assert($('m-tab-jadwal').classList.contains('active'), 'Panel #m-tab-jadwal aktif');
  assert.strictEqual(directSlots[3].getAttribute('aria-current'), 'page', 'aria-current pindah ke tab Jadwal');
  assert.strictEqual(dot.getAttribute('data-active-slot'), '3', '#m-bn-dot pindah ke slot 3');

  click(directSlots[4]);
  assert($('m-sheet-more').classList.contains('open'), 'Klik tombol Menu membuka #m-sheet-more');
  click($('m-sheet-more').querySelector('[data-mgo="settings"]'));
  assert.strictEqual(switched[switched.length - 1], 'settings', 'Memilih Pengaturan di Menu memanggil switchMobileTab("settings")');
  assert.strictEqual(directSlots[4].getAttribute('aria-current'), 'page', 'aria-current pindah ke tombol Menu (#m-btn-more)');
  assert.strictEqual(dot.getAttribute('data-active-slot'), '4', '#m-bn-dot pindah ke slot 4');

  click(directSlots[0]);
  assert.strictEqual(switched[switched.length - 1], 'rincian', 'Klik tab Rincian kembali ke #m-tab-rincian');
  assert.strictEqual(directSlots[0].getAttribute('aria-current'), 'page', 'aria-current kembali ke Rincian');
  assert.strictEqual(dot.getAttribute('data-active-slot'), '0', '#m-bn-dot kembali ke slot 0');
  w.switchMobileTab = origSwitch;

  // 5. Re-tap Rincian tetap gulir ke atas & refresh 1x + PTR exclusion
  const fireTouch = (el, type, clientX, clientY) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX, clientY };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
    return ev;
  };
  const doPtr = (el, dy) => {
    fireTouch(el, 'touchstart', 150, 200);
    fireTouch(el, 'touchmove', 150, 200 + Math.round(dy * 0.4));
    fireTouch(el, 'touchmove', 150, 200 + dy);
    fireTouch(el, 'touchend', 150, 200 + dy);
  };
  let ptrRenderCount = 0;
  const origRenderMobApp = w.renderMobileApp;
  w.renderMobileApp = function () {
    ptrRenderCount += 1;
    return origRenderMobApp.apply(this, arguments);
  };
  w.sbUser = null;
  w._rkPtrReset();
  const beforePtrNav = ptrRenderCount;
  doPtr(bnav, 150);
  doPtr(fabBtn, 150);
  doPtr(directSlots[2], 150);
  assert.strictEqual(ptrRenderCount, beforePtrNav, 'PTR tidak aktif saat disentuh pada .mob-bottom-nav, tombol "+", atau .bn-center-slot');

  let refreshCalls = 0;
  const origRefresh = w.rkMobRefresh;
  w.rkMobRefresh = function () {
    refreshCalls += 1;
    return origRefresh.apply(this, arguments);
  };
  w._rkPtrReset();
  const beforeRetapRincian = ptrRenderCount;
  click(directSlots[0]);
  assert.strictEqual(refreshCalls, 1, 'Re-tap Rincian di posisi aktif memanggil rkMobRefresh tepat 1x');
  assert.strictEqual(ptrRenderCount, beforeRetapRincian + 1, 'Re-tap Rincian tetap menyegarkan tampilan tepat 1x');
  w.rkMobRefresh = origRefresh;
  w.renderMobileApp = origRenderMobApp;

  // 6. Audit statis CSS sumber (mobile.css, tokens.css, desktop.css) & sw.js
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const cssTok = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const cssDesk = fs.readFileSync(path.join(ROOT, 'css/desktop.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

  const navStart = cssMob.indexOf('/* ==========================================================================\n   5-SLOT BOTTOM NAVIGATION BAR');
  const navStartAlt = navStart >= 0 ? navStart : cssMob.indexOf('5-SLOT BOTTOM NAVIGATION BAR');
  const navEnd = cssMob.indexOf('/* Bottom Sheets & Popovers */', navStartAlt);
  assert(navStartAlt >= 0 && navEnd > navStartAlt, 'Blok CSS Bottom Navbar ditemukan di css/mobile.css');
  const navCssBlock = cssMob.slice(navStartAlt, navEnd);

  assert(!/#[0-9a-fA-F]{3,8}\b/.test(navCssBlock), 'Blok bottom navbar di css/mobile.css bebas dari hex literal (harus via token)');
  assert(!/transition[^;]*\b(filter|box-shadow|width|height|left)\b/i.test(navCssBlock), 'Navbar tidak menganimasikan filter, box-shadow, width, height, atau left');
  assert(!/animation[^;]*\b(filter|box-shadow|width|height|left)\b/i.test(navCssBlock), 'Navbar tidak menjalankan keyframe pada filter/box-shadow/width/height/left');

  // Semua :hover pada .bn-btn / .bn-plus-fab harus ada di dalam @media (hover: hover) and (pointer: fine)
  let strippedHoverMedia = navCssBlock;
  for (const m of [...navCssBlock.matchAll(/@media\s*\(\s*hover:\s*hover\s*\)\s*and\s*\(\s*pointer:\s*fine\s*\)\s*\{/g)].reverse()) {
    const blk = extractBraceBlock(navCssBlock, m.index);
    if (blk) strippedHoverMedia = strippedHoverMedia.slice(0, m.index) + strippedHoverMedia.slice(m.index + blk.length);
  }
  const hoverRe = /:hover\b/g;
  assert(!hoverRe.test(strippedHoverMedia), 'Semua :hover di blok navbar dibungkus @media (hover: hover) and (pointer: fine)');

  // Reduced motion di blok navbar / mobile.css & tokens.css
  const rmBlocks = [...navCssBlock.matchAll(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{/g)]
    .map((m) => extractBraceBlock(navCssBlock, m.index))
    .join('\n');
  assert(rmBlocks.includes('.bn-active-dot') && rmBlocks.includes('.bn-btn') && rmBlocks.includes('.bn-plus-fab'), 'css/mobile.css memiliki aturan @media (prefers-reduced-motion: reduce) untuk penanda dan tombol navbar');

  for (const tok of ['--mob-nav-bg', '--mob-nav-icon', '--mob-nav-active', '--mob-nav-border', '--mob-nav-shadow', '--dur-nav-dot', '--ease-nav-jelly']) {
    assert(cssTok.includes(tok), 'css/tokens.css mendefinisikan token ' + tok);
  }
  assert(/--dur-nav-dot:\s*0\.001ms/.test(cssTok), 'css/tokens.css mereduksi --dur-nav-dot pada prefers-reduced-motion');

  // Isolasi Desktop
  for (const sel of ['.mob-bottom-nav', '.bn-bg-svg', '.bn-active-dot', '.bn-plus-fab']) {
    assert(!cssDesk.includes(sel), 'css/desktop.css tidak memuat selector APK ' + sel);
  }
  w.setShellMode('browser');
  assert(!$('browser-shell').querySelector('.mob-bottom-nav, .bn-bg-svg, .bn-active-dot'), '#browser-shell tidak memuat markup bottom navbar APK');

  // Service worker >= v37
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 37, 'sw.js CACHE_NAME dinaikkan ke rk-cache-v37');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 14 Bottom Navbar APK lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap14_navbar:', e);
  process.exit(1);
});
