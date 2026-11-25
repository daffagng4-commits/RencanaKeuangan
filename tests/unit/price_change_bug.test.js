/** Tes regresi bug Ubah Harga / Jadwal (Desktop & APK): 450k -> 500k -> tampil 500k -> ubah 440k -> terbaca 440k. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, newYear, item } = require('../helpers/core');
const { boot } = require('../schedule/ui.js');

test('Core: applyPriceChange menimpa perubahan harga mulai bulan >= fromIso dan cmpFrom menempatkan promo setelah permanen', () => {
  const c = loadCore();
  const it = item({ id: 1, name: 'TorBox', price: 450000, unit: 'bulan', start: '2026-01-01', ch: [] });
  assert.equal(typeof c.applyPriceChange, 'function', 'applyPriceChange harus tersedia di schedule.js');

  // 1. Naikkan ke 500k mulai Nov 2026
  c.applyPriceChange(it, '2026-11-01', '', 500000);
  assert.equal(c.priceAt(it, Date.UTC(2026, 10, 15)), 500000);
  assert.equal(c.priceAt(it, Date.UTC(2026, 11, 15)), 500000);

  // 2. Turunkan ke 440k mulai Jan 2026 (atau Okt 2026): harus menimpa 500k Nov, tetap 440k sesudah norm()
  c.applyPriceChange(it, '2026-01-01', '', 440000);
  const normalized = c.normItem(it, 0, 2026);
  assert.equal(c.priceAt(normalized, Date.UTC(2026, 10, 15)), 440000, 'Nov harus terbaca 440k, bukan 500k');
  assert.equal(c.priceAt(normalized, Date.UTC(2026, 11, 15)), 440000, 'Des harus terbaca 440k, bukan 500k');

  // 3. Promo di bulan yang sama dengan change_price harus menang di bulan promo, lalu kembali ke permanen
  c.applyPriceChange(normalized, '2026-11-01', '', 500000);
  c.applyPriceChange(normalized, '2026-11-01', '2026-11-30', 400000);
  const norm2 = c.normItem(normalized, 0, 2026);
  assert.equal(c.priceAt(norm2, Date.UTC(2026, 10, 15)), 400000, 'Nov promo 400k menang atas permanen 500k');
  assert.equal(c.priceAt(norm2, Date.UTC(2026, 11, 15)), 500000, 'Des kembali ke permanen 500k');
});

test('UI Desktop & APK: 450k -> 500k -> buka ulang tampil 500k -> ganti 440k -> terbaca 440k', async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire } = t;
  try {
    w.__today = '2026-11-10';
    w.switchYear(2026);
    w.S.startMonth = 10; // Nov
    w.S.items = [{ id: 77, name: 'TorBox', price: 450000, n: 1, unit: 'bulan', start: '2026-01-01', end: '', cnt: 0, cat: 'Langganan', ch: [] }];
    w.S.paid = {};
    w.S.skip = {};
    w.renderAll();

    // --- DESKTOP ---
    w.openPm(77); // buka tanpa iso -> default Nov 2026
    $('scen-new-price').value = '500000';
    fire($('scen-new-price'), 'input');
    click($('btn-save-scenario'));
    assert.equal(w.priceAt(w.S.items[0], Date.UTC(2026, 10, 15)), 500000, 'Desktop: harga Nov tersimpan 500k');

    // Buka ulang modal Desktop -> harus menampilkan 500.000 (bukan 450.000!)
    w.openPm(77);
    assert.equal($('scen-new-price').value, '500.000', 'Desktop: modal ubah harga harus menampilkan harga efektif 500.000, bukan harga lama 450.000');

    // Ganti jadi 440k mulai Okt 2026 (lebih awal dari Nov) -> setelah norm(), Nov & Des harus terbaca 440k
    $('scen-month').value = '9'; // Okt
    $('scen-new-price').value = '440000';
    fire($('scen-new-price'), 'input');
    click($('btn-save-scenario'));
    w.ALL = w.norm(w.ALL);
    w.S = w.ALL.data[2026];
    assert.equal(w.priceAt(w.S.items[0], Date.UTC(2026, 10, 15)), 440000, 'Desktop: Nov harus terbaca 440k setelah diturunkan');
    assert.equal(w.priceAt(w.S.items[0], Date.UTC(2026, 11, 15)), 440000, 'Desktop: Des harus terbaca 440k setelah diturunkan');

    // --- APK ---
    w.setShellMode('mobile-app', true);
    w.S.items = [{ id: 78, name: 'TorBox APK', price: 450000, n: 1, unit: 'bulan', start: '2026-01-01', end: '', cnt: 0, cat: 'Langganan', ch: [{ from: '2026-11-01', to: '', price: 500000, n: null, unit: null, cut: false }] }];
    w.renderAll();

    // Klik tombol [data-medit-it] pada item di APK (sebelumnya mengirim itE.start = 2026-01-01!)
    w.switchMobileTab('jadwal');
    const jSub = w.document.querySelector('[data-mjtab="items"], [data-msub="items"]');
    if (jSub) click(jSub);
    const mpmBtn = w.document.querySelector('[data-medit-it="78"]');
    assert.ok(mpmBtn, 'tombol ubah harga/jadwal item di APK ditemukan');
    click(mpmBtn);
    assert.equal($('m-sc-month').value, '10', 'APK: bulan default harus bulan aktif (Nov=10), bukan Jan=0 dari it.start');
    assert.equal($('m-sc-price').value, '500.000', 'APK: input harga harus menampilkan 500.000, bukan 450.000');

    // Ubah ke 440k di APK -> simpan -> setelah norm(), Nov & Des harus terbaca 440k
    $('m-sc-month').value = '0'; // bahkan jika user pilih Jan
    $('m-sc-price').value = '440000';
    fire($('m-sc-price'), 'input');
    click($('m-btn-save-scen'));
    w.ALL = w.norm(w.ALL);
    w.S = w.ALL.data[2026];
    assert.equal(w.priceAt(w.S.items[0], Date.UTC(2026, 10, 15)), 440000, 'APK: Nov harus terbaca 440k, bukan tetap 500k');
    assert.equal(w.priceAt(w.S.items[0], Date.UTC(2026, 11, 15)), 440000, 'APK: Des harus terbaca 440k, bukan tetap 500k');
  } finally {
    w.close();
  }
});
