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
  const cur = () => de.getAttribute('data-theme') || 'auto';

  // tombol: Otomatis > Terang > Gelap > Otomatis
  const seq = [cur()];
  for (let i = 0; i < 3; i++) {
    click($('thm'));
    seq.push(cur());
  }
  assert.deepStrictEqual(seq, ['auto', 'light', 'dark', 'auto'], seq.join(' > '));
  assert.strictEqual(w.localStorage.getItem('rk-theme'), 'auto');
  click($('thm'));
  assert.strictEqual(w.localStorage.getItem('rk-theme'), 'light');
  assert(/Terang/.test($('thm').title));

  // hitam-putih dari menu Alat
  const alat = $('alat-menu'), item = (v) => w.document.querySelector('#alat-menu [data-theme-set="' + v + '"]');
  assert(item('bw') && item('bwd'), 'dua pilihan tema lanjutan ada di menu Alat');
  click($('alat-btn'));
  click(item('bw'));
  assert.strictEqual(cur(), 'bw');
  assert(alat.hidden, 'menu menutup setelah memilih');
  assert(/Hitam-putih/.test($('thm').title) && !/gelap/i.test($('thm').title));
  assert(item('bw').classList.contains('on') && item('bw').getAttribute('aria-checked') === 'true');
  assert(!item('bwd').classList.contains('on'));
  click($('alat-btn'));
  click(item('bw'));
  assert.strictEqual(cur(), 'auto', 'memilih lagi = kembali ke Otomatis');

  // dari hitam-putih, tombol topbar kembali ke Otomatis
  click($('alat-btn'));
  click(item('bwd'));
  assert.strictEqual(cur(), 'bwd');
  click($('thm'));
  assert.strictEqual(cur(), 'auto');

  // lembar Lainnya (HP)
  click($('botnav').querySelector('[data-k="more"]'));
  const sh = $('botsheet');
  assert(!sh.hidden);
  click(sh.querySelector('[data-theme-set="bwd"]'));
  assert.strictEqual(cur(), 'bwd');
  assert(sh.hidden, 'lembar menutup');
  click(sh.querySelector('[data-theme-set="bwd"]') || $('thm'));
  w.setTheme('auto');
  assert.strictEqual(cur(), 'auto');

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
