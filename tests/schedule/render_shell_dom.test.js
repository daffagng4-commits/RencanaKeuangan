// renderShell harus benar-benar tampil di DOM: shell (judul+ringkasan), header/nav, dan grid
// Rincian berisi kartu yang benar — bukan sekadar lolos build.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot();
  await t.ready();
  const { w, $ } = t;
  const doc = w.document;
  try {
    // 1. Shell: judul + satu kalimat ringkasan, terisi (bukan kosong).
    const head = $('rk-head');
    assert(head, '#rk-head ada di DOM');
    const h1 = head.querySelector('h1.rk-h1');
    assert(h1 && h1.textContent.trim() === 'Ringkasan keuangan', '#rk-head memuat judul "Ringkasan keuangan"');
    const sum = head.querySelector('p.rk-sum');
    assert(sum && sum.textContent.trim().length > 10, 'ringkasan terisi teks');
    assert(/&middot;|·/.test(sum.innerHTML), 'ringkasan memakai pemisah &middot;');

    // 2. Pembungkus layout + sidebar + header.
    const app = doc.querySelector('.app');
    assert(app, '.app (pembungkus grid) ada');
    const header = app.querySelector(':scope > header');
    assert(header, '<header> adalah anak langsung .app (kolom 1 grid)');
    const nav = header.querySelector('nav[role="tablist"]');
    assert(nav, 'nav[role=tablist] ada di dalam header');
    assert(nav.querySelector('#sb-toggle'), '#sb-toggle ada di nav');
    assert(app.querySelector(':scope > .w'), '.w (kolom 2 grid) adalah anak langsung .app');

    // 3. Grid Rincian berisi slot yang benar, tiap slot berisi kartu nyata.
    const grid = $('v-rincian').querySelector('.rk');
    const kids = [...grid.children].map((e) => e.className.split(' ')[0]);
    assert.deepStrictEqual(kids, ['rk-kas', 'rk-flow', 'rk-mf', 'rk-bills', 'rk-cat', 'rk-detail', 'rk-tx'], 'grid berisi 7 slot berurutan');
    const needText = { 'rk-kas': '.hm-big', 'rk-flow': 'svg', 'rk-mf': 'svg', 'rk-bills': '.card', 'rk-cat': '.card', 'rk-detail': '.card', 'rk-tx': '.card' };
    for (const [cls, sel] of Object.entries(needText)) {
      const slot = grid.querySelector('.' + cls);
      assert(slot, '.' + cls + ' terpasang');
      assert(slot.querySelector(sel), '.' + cls + ' berisi ' + sel);
      assert(slot.textContent.replace(/\s+/g, '').length > 20, '.' + cls + ' berisi teks (bukan kosong)');
    }

    // 4. Kartu kategori: dua panel (donut + item terbesar).
    const cat = grid.querySelector('.rk-cat');
    assert.strictEqual(cat.querySelectorAll(':scope > .card').length, 2, '.rk-cat berisi 2 panel');

    console.log('OK render_shell_dom');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
