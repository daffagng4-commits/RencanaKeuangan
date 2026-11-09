// Tahap 2: statistik investasi, agenda 30 hari, navigasi (menu Alat + bilah bawah), form "Berhenti bayar" dan chip persen.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, errs } = t;
  const txt = (el) => el.textContent.replace(/\s+/g, ' ');
  const key = (k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const it = (o) => Object.assign({ id: 'x', name: 'T', price: 1000, n: 1, unit: 'sekali', start: '2026-11-20', ch: [], cat: '', end: '', cnt: 0 }, o);

  // ---------- 1. Investasi + Agenda ----------
  w.__today = '2026-11-08';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 5000000;
  w.S.items = [
    it({ id: 'a', name: 'Listrik', price: 200000, start: '2026-11-20' }),
    it({ id: 'b', name: 'DCA Saham', price: 600000, start: '2026-11-30', cat: 'Investasi' }),
    it({ id: 'c', name: 'Telat', price: 100000, start: '2026-11-02' }),
    it({ id: 'e', name: 'Cicilan', price: 1000000, start: '2026-12-05' }),
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.kasLinked().tx = [{ id: 'g1', d: '2026-12-01', t: '+', amt: 8000000, cat: 'Gaji', note: 'Gaji Des' }];
  w.renderAll();
  const hero = txt($('v-rincian').querySelector('.hero'));
  assert(!/Investasi \(aset\)/.test(hero), 'statistik investasi dihapus: ' + hero);
  assert(!/Di luar investasi/.test(hero), 'pengeluaran di luar investasi dihapus');
  assert(!$('v-rincian').querySelector('a.lnk[href*="rebalance"]'), 'tautan Rebalance dihapus');
  assert($('v-rincian').querySelector('svg[aria-label^="Grafik arus saldo"]'), 'satu grafik arus saldo tampil');
  assert(!$('v-rincian').querySelector('.agenda'), 'kartu agenda dihapus');

  // ---------- 2. Navigasi ----------
  const alatBtn = $('alat-btn'), alatMenu = $('alat-menu');
  assert(alatMenu.hidden && alatBtn.getAttribute('aria-expanded') === 'false', 'menu Alat tertutup awalnya');
  click(alatBtn);
  assert(!alatMenu.hidden && alatBtn.getAttribute('aria-expanded') === 'true', 'menu Alat terbuka');
  assert.strictEqual(alatMenu.querySelectorAll('a[href^="tools/"]').length, 2, 'dua alat di menu');
  key('Escape');
  assert(alatMenu.hidden, 'Escape menutup menu Alat');
  click(alatBtn);
  w.document.body.click();
  assert(alatMenu.hidden, 'klik di luar menutup menu Alat');

  w.setTripVisible(true); // Perjalanan tersembunyi bila belum ada data perjalanan; di sini diaktifkan agar ikut diuji
  const bar = $('botnav'), btn = (k) => bar.querySelector('button[data-k="' + k + '"]');
  assert.strictEqual(bar.querySelectorAll('button').length, 5, 'lima tujuan di bilah bawah');
  assert(btn('rincian').classList.contains('on'), 'Rincian aktif awalnya');
  click(btn('kas'));
  assert.strictEqual(w.curTab, 'kas');
  assert(!$('v-kas').hidden && btn('kas').classList.contains('on') && !btn('rincian').classList.contains('on'), 'tab Kas aktif');
  click(btn('trip'));
  assert.strictEqual(w.mode, 'trip');
  assert(!$('v-trip').hidden && btn('trip').classList.contains('on'), 'mode Perjalanan aktif');
  click(btn('jadwal'));
  assert.strictEqual(w.mode, 'rencana', 'kembali ke mode Rencana');
  assert(w.curTab === 'jadwal' && !$('v-jadwal').hidden && $('v-trip').hidden && btn('jadwal').classList.contains('on'), 'tab Jadwal aktif');
  const sheet = $('botsheet');
  assert(sheet.hidden, 'lembar Lainnya tertutup');
  click(btn('more'));
  assert(!sheet.hidden && btn('more').getAttribute('aria-expanded') === 'true', 'lembar Lainnya terbuka');
  click(sheet.querySelector('[data-go="sim"]'));
  assert(sheet.hidden && w.curTab === 'sim' && btn('more').classList.contains('on'), 'Simulasi dari Lainnya; Lainnya menyala');
  click(btn('more'));
  click(sheet.querySelector('[data-go="backup"]'));
  assert(!$('m').hidden, 'Impor / Ekspor membuka dialog cadangan');
  $('m').hidden = true;
  click(btn('rincian'));

  // ---------- 3. Form ubah harga: Harga sementara, Berhenti bayar, chip persen ----------
  w.S.items = [
    it({ id: 'm', name: 'Langganan', price: 100000, unit: 'bulan', start: '2026-01-01' }),
    it({ id: 's', name: 'Sekali', price: 50000, unit: 'sekali', start: '2026-03-01' }),
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();
  w.openPm('m');
  const sc = (k) => $('psc').querySelector('button[data-sc="' + k + '"]');
  assert(sc('sementara') && sc('henti'), 'tombol Harga sementara dan Berhenti bayar ada');
  assert(!sc('henti').hidden, 'Berhenti bayar tersedia untuk item berulang');
  click(sc('harga'));
  assert(!$('ppc').hidden, 'chip persen tampil di Harga berubah');
  click($('ppc').querySelector('[data-pct="10"]'));
  assert.strictEqual(w.parseRp($('pp').value), 110000, 'naik 10% dari 100.000');
  click($('ppc').querySelector('[data-pct="-10"]'));
  assert.strictEqual(w.parseRp($('pp').value), 90000, 'turun 10%');
  click($('pbk2'));
  click(sc('siklus'));
  assert($('ppc').hidden, 'chip persen tersembunyi di Siklus');
  click($('pbk2'));
  click(sc('henti'));
  assert($('g-price').hidden && $('ppc').hidden, 'tanpa kolom harga di Berhenti bayar');
  click($('pdc').querySelector('button[data-d="2026-06-01"]'));
  const pv = txt($('ppv'));
  assert(/Tagihan terakhir: 1 Jun 2026/.test(pv), pv);
  assert(/6 tagihan dihapus dari jadwal, total Rp 600\.000/.test(pv), pv);
  click($('pps'));
  const m = w.S.items.find((x) => x.id === 'm');
  assert.strictEqual(m.end, '2026-06-01');
  assert.strictEqual(+m.cnt || 0, 0);
  assert.strictEqual(w.occ(m, 2026).length, 6, 'tinggal 6 tagihan di 2026');
  assert($('pm').hidden, 'modal tertutup setelah simpan');
  assert(/berhenti setelah/.test($('ttm').textContent), 'toast: ' + $('ttm').textContent);
  click($('ttu'));
  const m2 = w.S.items.find((x) => x.id === 'm');
  assert(!m2.end && w.occ(m2, 2026).length === 12, 'urungkan memulihkan jadwal');

  // validasi: tanggal setelah jadwal berakhir -> tolak
  w.openPm('m');
  click(sc('henti'));
  click($('pdc').querySelector('button[data-d="2026-12-01"]'));
  const pv2 = txt($('ppv'));
  assert(/Tahun 2026: tidak ada tagihan yang terhapus\. Tahun lain: \d+ tagihan ikut dihapus\./.test(pv2), 'berhenti di Desember: tahun depan ikut terhapus: ' + pv2);
  $('pm').hidden = true;

  // item sekali bayar: Berhenti bayar disembunyikan
  w.openPm('s');
  assert(sc('henti').hidden, 'Berhenti bayar disembunyikan untuk sekali bayar');
  $('pm').hidden = true;

  assert.strictEqual(errs.length, 0, 'tidak ada galat JavaScript: ' + errs.slice(0, 2));
  console.log('Semua pengecekan tahap2 lulus');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
