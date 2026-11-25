const assert = require('assert');
const { boot } = require('./ui.js');

function click(el) {
  assert(el, 'elemen klik harus ada');
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, errs } = t;
  const doc = w.document;

  w.__today = '2026-11-25';
  w.switchYear(2026);
  w.sbUser = null;
  w.renderAll();

  const expectedKasIn = ['Gaji', 'Bonus', 'Freelance', 'Usaha', 'Investasi', 'Hadiah', 'Refund', 'Transfer', 'Lainnya'];

  // (a) Daftar final KAS_IN, "Gaji" pertama, "Lainnya" terakhir
  assert.deepStrictEqual(Array.from(w.KAS_IN), expectedKasIn, 'KAS_IN harus sesuai daftar final 9 kategori');
  assert.strictEqual(w.KAS_IN[0], 'Gaji', 'Kategori pertama KAS_IN harus Gaji');
  assert.strictEqual(w.KAS_IN[w.KAS_IN.length - 1], 'Lainnya', 'Kategori terakhir KAS_IN harus Lainnya');

  // (b) Semua kategori di KAS_IN & KAS_OUT punya entri logo di BR_CAT_META & MOB_CAT_META; KAS_IN identik di keduanya
  const allKasCats = Array.from(new Set([].concat(w.KAS_IN, w.KAS_OUT)));
  for (const cat of allKasCats) {
    const bm = w.BR_CAT_META[cat];
    const mm = w.MOB_CAT_META[cat];
    assert(bm && bm.hex && Array.isArray(bm.grad) && bm.grad.length === 2 && bm.svg, `BR_CAT_META harus punya logo lengkap untuk "${cat}"`);
    assert(mm && mm.hex && Array.isArray(mm.grad) && mm.grad.length === 2 && mm.svg, `MOB_CAT_META harus punya logo lengkap untuk "${cat}"`);
  }
  for (const cat of w.KAS_IN) {
    assert.deepStrictEqual(w.MOB_CAT_META[cat], w.BR_CAT_META[cat], `Logo MOB_CAT_META["${cat}"] harus identik dengan BR_CAT_META["${cat}"]`);
  }

  // (c) Desktop: tab Transaksi -> + Pemasukan & - Pengeluaran + filter Riwayat
  w.setShellMode('browser');
  const kasTabBtn = doc.querySelector('#browser-shell [data-tab="kas"]');
  if (kasTabBtn) click(kasTabBtn);

  const btnInDesk = doc.querySelector('#browser-shell [data-kas-type="in"]');
  const btnOutDesk = doc.querySelector('#browser-shell [data-kas-type="out"]');
  assert(btnInDesk && btnOutDesk, 'Tombol tipe transaksi Desktop harus ada');

  click(btnInDesk);
  const deskInPills = Array.from(doc.querySelectorAll('#kas-cat-pills [data-kcat-opt]')).map((b) => b.getAttribute('data-kcat-opt'));
  assert.deepStrictEqual(deskInPills, expectedKasIn, 'Desktop + Pemasukan harus merender seluruh 9 kategori KAS_IN');
  assert.strictEqual(w.BR_STATE.kasCat, 'Gaji', 'Desktop kasCat reset ke Gaji saat pindah ke + Pemasukan');
  assert.strictEqual(doc.querySelectorAll('#kas-cat-pills .cat-logo svg').length, expectedKasIn.length, 'Setiap pill Desktop + Pemasukan harus punya SVG logo');

  // Pilih Bonus lalu pindah ke - Pengeluaran -> reset ke KAS_OUT[0]
  const bonusDesk = doc.querySelector('#kas-cat-pills [data-kcat-opt="Bonus"]');
  click(bonusDesk);
  assert.strictEqual(w.BR_STATE.kasCat, 'Bonus', 'Desktop bisa memilih kategori Bonus');
  click(btnOutDesk);
  const deskOutPills = Array.from(doc.querySelectorAll('#kas-cat-pills [data-kcat-opt]')).map((b) => b.getAttribute('data-kcat-opt'));
  assert.deepStrictEqual(deskOutPills, Array.from(w.KAS_OUT), 'Desktop - Pengeluaran tetap merender KAS_OUT');
  assert.strictEqual(w.BR_STATE.kasCat, w.KAS_OUT[0], 'Desktop kasCat reset ke kategori pertama KAS_OUT saat pindah dari Bonus ke - Pengeluaran');

  // Filter Riwayat Desktop memuat kategori baru KAS_IN
  const fCatOpts = Array.from(doc.querySelectorAll('#kas-filter-cat option')).map((o) => o.value);
  for (const cat of expectedKasIn) {
    assert(fCatOpts.includes(cat), `Filter Riwayat Desktop harus memuat "${cat}"`);
  }

  // (d) APK: mode mobile-app -> tab kas -> + Masuk & - Keluar + reset MOB_STATE.kasCat
  w.setShellMode('mobile-app');
  w.switchMobileTab('kas');

  const btnMobIn = doc.querySelector('#mobile-app-shell [data-mktype="+"]');
  const btnMobOut = doc.querySelector('#mobile-app-shell [data-mktype="-"]');
  assert(btnMobIn && btnMobOut, 'Tombol tipe transaksi APK harus ada');

  // Awal default '-' -> kategori pengeluaran (maks 8 dari allCategories)
  click(btnMobOut);
  const expectedMobOut = Array.from(w.allCategories()).slice(0, 8);
  const mobOutPills = Array.from(doc.querySelectorAll('#m-kas-cat-pills [data-mkcatpick]')).map((b) => b.getAttribute('data-mkcatpick'));
  assert.deepStrictEqual(mobOutPills, expectedMobOut, 'APK - Keluar harus tetap menampilkan kategori pengeluaran (allCategories().slice(0, 8))');

  // Pindah ke '+' -> seluruh 9 kategori KAS_IN tampil (tidak terpotong 8), kasCat reset ke Gaji
  click(btnMobIn);
  const mobInPills = Array.from(doc.querySelectorAll('#m-kas-cat-pills [data-mkcatpick]')).map((b) => b.getAttribute('data-mkcatpick'));
  assert.deepStrictEqual(mobInPills, expectedKasIn, 'APK + Masuk harus menampilkan seluruh 9 kategori KAS_IN tanpa terpotong 8');
  assert.strictEqual(w.MOB_STATE.kasCat, 'Gaji', 'APK MOB_STATE.kasCat harus reset ke Gaji saat pindah ke + Masuk');
  assert.strictEqual(doc.querySelectorAll('#m-kas-cat-pills .cat-logo svg').length, expectedKasIn.length, 'Setiap pill APK + Masuk harus punya SVG logo');

  // Pilih Refund di + Masuk, lalu pindah ke - Keluar -> kasCat harus reset ke expectedMobOut[0] (bukan Refund)
  const refundMob = doc.querySelector('#m-kas-cat-pills [data-mkcatpick="Refund"]');
  click(refundMob);
  assert.strictEqual(w.MOB_STATE.kasCat, 'Refund', 'APK bisa memilih kategori Refund');
  click(btnMobOut);
  assert.strictEqual(w.MOB_STATE.kasCat, expectedMobOut[0], 'APK MOB_STATE.kasCat harus reset ke kategori pengeluaran pertama saat pindah dari + ke -');

  // Filter Riwayat APK juga memuat kategori baru KAS_IN
  const mobFltOpts = Array.from(doc.querySelectorAll('#m-kas-flt-cat option')).map((o) => o.value);
  for (const cat of expectedKasIn) {
    assert(mobFltOpts.includes(cat), `Filter Riwayat APK harus memuat "${cat}"`);
  }

  // (e) Tidak ada error runtime
  assert.strictEqual(errs.length, 0, 'Tidak boleh ada runtime error: ' + errs.join('; '));

  w.close();
  console.log('OK tahap20_kas_in_categories: KAS_IN (9 kategori), parity BR/MOB_CAT_META, Desktop & APK pill rendering + kasCat reset lulus.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
