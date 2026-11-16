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
    assert(h1 && /^Selamat (pagi|siang|sore|malam), XXX$/.test(h1.textContent.trim()), '#rk-head memuat sapaan default XXX saat belum login: ' + (h1 && h1.textContent));
    assert.strictEqual($('sb-name').textContent.trim(), 'Halo, XXX', '#sb-name menampilkan Halo, XXX saat belum login');
    assert.strictEqual($('sb-ini').textContent.trim(), '', 'lingkaran avatar kosong (tanpa huruf) saat belum login');
    assert($('acct').querySelector('.av-circle').classList.contains('anon'), 'lingkaran avatar abu-abu (.anon) saat belum login');
    w.acctUI({ email: 'davinagng@gmail.com', user_metadata: { full_name: 'Davina Pratama' } });
    assert.strictEqual($('sb-ini').textContent.trim(), 'D', 'lingkaran avatar menampilkan D saat login Google Davina Pratama');
    assert.strictEqual($('sb-name').textContent.trim(), 'Halo, Davina', '#sb-name menampilkan nama depan Halo, Davina');
    assert(/^Selamat (pagi|siang|sore|malam), Davina$/.test(head.querySelector('h1.rk-h1').textContent.trim()), 'hero menampilkan Selamat ..., Davina');
    assert(!$('acct').querySelector('.av-circle').classList.contains('anon'), 'class .anon dihapus saat sudah login');
    w.acctUI(null);
    const sum = head.querySelector('p.rk-sum');
    assert(sum && sum.textContent.trim().length > 10, 'ringkasan terisi teks');
    assert(sum.querySelector('.rk-date'), 'ringkasan diawali tanggal');
    assert(/&middot;|·/.test(sum.innerHTML), 'ringkasan memakai pemisah &middot;');

    // 2. Pembungkus layout + sidebar + main-shell.
    const app = doc.querySelector('#browser-shell.app-shell.app');
    assert(app, '#browser-shell.app-shell.app (pembungkus grid) ada');
    const aside = app.querySelector(':scope > aside.sidebar');
    assert(aside, '<aside class="sidebar"> adalah anak langsung .app');
    const nav = aside.querySelector('#rk-nav[role="tablist"]');
    assert(nav, '#rk-nav[role=tablist] ada di dalam aside.sidebar');
    assert(aside.querySelector('#sb-toggle'), '#sb-toggle ada di sidebar');
    assert(aside.querySelector('#sb-name'), '#sb-name (nama sidebar) terisi');
    const mainShell = app.querySelector(':scope > .main-shell');
    assert(mainShell, '.main-shell (kolom utama) adalah anak langsung .app');
    assert(mainShell.querySelector('header.topbar'), 'header.topbar ada di dalam .main-shell');

    // 3. Isi Tab Rincian Fiscal Atelier: hero saldo+grafik arus kas, tagihan mendatang, bar compare, 100% Jar, rincian bulanan, transaksi terakhir.
    const root = $('tab-rincian');
    assert(root && !root.hidden, '#tab-rincian ada dan aktif');
    const needSel = {
      '#rincian-saldo-now': '.hero-amount',
      '#svg-cashflow': 'path',
      '#upcoming-bills-list': '.upcoming-item, div',
      '#svg-bar-compare': 'rect, line',
      '#jar-main-stage': '#svg-jar-main',
      '#where-cat-list': '.simple-row, div',
      '#top5-items-list': '.simple-row, div',
      '#monthly-flow-tbody': 'tr[data-flow-m]',
      '#recent-tx-groups': 'div',
    };
    for (const [id, inner] of Object.entries(needSel)) {
      const el = root.querySelector(id);
      assert(el, id + ' terpasang');
      assert(el.querySelector(inner) || el.textContent.trim().length > 0, id + ' terisi konten nyata');
    }

    // 4. Kartu gabungan "Ke mana uangnya pergi" memuat 100% Jar kiri + panel kategori & item terbesar di kanan.
    const where = $('card-where-money');
    assert(where, '#card-where-money terpasang');
    assert(where.querySelector('#jar-main-stage #svg-jar-main'), 'memuat 100% Full Jar SVG');
    assert(where.querySelector('#where-cat-list'), 'memuat panel kategori #where-cat-list');
    assert(where.querySelector('#top5-items-list'), 'memuat panel item terbesar #top5-items-list');

    console.log('OK render_shell_dom');
    process.exit(0);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
