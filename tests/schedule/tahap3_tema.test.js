// Tahap 3 (item 13): tema 3 mode di tombol + hitam-putih lewat menu; font disematkan (tanpa Google Fonts).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const de = w.document.documentElement;
  const cur = () => de.getAttribute('data-theme') || 'light';

  // tombol: Terang > Gelap > Terang (hanya 2 tema)
  const seq = [cur()];
  for (let i = 0; i < 2; i++) {
    click($('thm'));
    seq.push(cur());
  }
  assert.deepStrictEqual(seq, ['light', 'dark', 'light'], seq.join(' > '));
  assert.strictEqual(w.localStorage.getItem('rk-theme'), 'light');
  assert(/Terang/.test($('thm').title));
  click($('thm'));
  assert.strictEqual(w.localStorage.getItem('rk-theme'), 'dark');
  assert(/Gelap/.test($('thm').title));
  click($('thm'));
  assert.strictEqual(cur(), 'light', 'setelah Gelap kembali ke Terang');

  // tema tidak lagi di menu Alat; semua tema lewat tombol
  assert(!w.document.querySelector('#alat-menu [data-theme-set]'), 'pilihan tema tidak duplikat di menu Alat');

  // lembar Lainnya (HP Browser): tema tidak duplikat dengan [data-theme-set]
  click($('btn-mobile-more'));
  const sh = $('mobile-more-sheet');
  assert(sh.classList.contains('open'));
  assert(!sh.querySelector('[data-theme-set]'), 'pilihan tema tidak memakai [data-theme-set] di lembar Lainnya');
  w.setTheme('light');
  assert.strictEqual(cur(), 'light');

  // font disematkan, tanpa Google Fonts
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  assert(!/fonts\.googleapis|fonts\.gstatic/.test(html), 'tidak ada permintaan ke Google Fonts');
  assert(/@font-face\s*\{[^}]*data:font\/woff2;base64,/.test(html), 'font woff2 disematkan sebagai data URI');
  assert(fs.existsSync(path.join(__dirname, '..', '..', 'css', 'fonts', 'OFL.txt')), 'lisensi font disertakan');

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap3_tema lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
