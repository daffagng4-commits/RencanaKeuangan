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
    // 1. Shell: sapaan + ringkasan (tanggal · status kas · tagihan) terisi.
    const head = $('rk-head');
    assert(head, '#rk-head ada di DOM');
    const h1 = head.querySelector('h1.rk-h1');
    assert(h1 && /^Selamat (pagi|siang|sore|malam), Daffa$/.test(h1.textContent.trim()), '#rk-head memuat sapaan: ' + (h1 && h1.textContent));
    const sum = head.querySelector('p.rk-sum');
    assert(sum && sum.textContent.trim().length > 10, 'ringkasan terisi teks');
    assert(sum.querySelector('.rk-date'), 'ringkasan diawali tanggal');
    assert(/&middot;|·/.test(sum.innerHTML), 'ringkasan memakai pemisah &middot;');

    // 2. Pembungkus layout + sidebar + header.
    const app = doc.querySelector('.app');
    assert(app, '.app (pembungkus grid) ada');
    const header = app.querySelector(':scope > header');
    assert(header, '<header> adalah anak langsung .app (kolom 1 grid)');
    const nav = header.querySelector('nav[role="tablist"]');
    assert(nav, 'nav[role=tablist] ada di dalam header');
    assert(nav.querySelector('#sb-toggle'), '#sb-toggle ada di nav');
    assert(nav.querySelector('#sb-name'), '#sb-name (nama sidebar) terisi');
    assert(app.querySelector(':scope > .w'), '.w (kolom 2 grid) adalah anak langsung .app');

    // 3. Grid Rincian: 7 slot sesuai tata letak 3 baris, tiap slot berisi kartu nyata.
    const grid = $('v-rincian').querySelector('.rk');
    const kids = [...grid.children].map((e) => e.className.split(' ')[0]);
    assert.deepStrictEqual(kids, ['rk-kas', 'rk-bills', 'rk-mf', 'rk-cat', 'rk-top', 'rk-detail', 'rk-tx'], 'grid berisi 7 slot berurutan');
    const needText = { 'rk-kas': '.hm-big', 'rk-bills': '.card', 'rk-mf': 'svg', 'rk-cat': '.card', 'rk-top': '.card', 'rk-detail': '.card', 'rk-tx': '.card' };
    for (const [cls, sel] of Object.entries(needText)) {
      const slot = grid.querySelector('.' + cls);
      assert(slot, '.' + cls + ' terpasang');
      assert(slot.querySelector(sel), '.' + cls + ' berisi ' + sel);
      assert(slot.textContent.replace(/\s+/g, '').length > 20, '.' + cls + ' berisi teks (bukan kosong)');
    }
    // Kondisi kas: grafik arus saldo bersarang di dalam kartu, bukan slot bersaudara.
    assert(grid.querySelector('.rk-kas .rk-flow svg.lc'), 'grafik arus saldo di dalam kartu Kondisi kas');
    assert(!grid.querySelector(':scope > .rk-flow'), 'tidak ada slot .rk-flow di tingkat grid');

    // 4. Kartu kategori & item terbesar kini dua slot terpisah.
    assert.strictEqual(grid.querySelectorAll('.rk-cat > .card').length, 1, '.rk-cat berisi 1 kartu kategori');
    assert.strictEqual(grid.querySelectorAll('.rk-top > .card').length, 1, '.rk-top berisi 1 kartu item terbesar');

    console.log('OK render_shell_dom');
    process.exit(0);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
