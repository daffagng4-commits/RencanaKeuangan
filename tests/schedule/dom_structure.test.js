const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  try {
    await t.ready();
    const doc = t.w.document;

    // Invarian 1: .w harus membungkus seluruh konten utama (.topbar, #rk-head, #v-rincian, dsb)
    // Jangan sampai .w ditutup prematur setelah .topbar sehingga views terlempar ke .app
    const wEl = doc.querySelector('.app > .w');
    assert(wEl, '.w harus ada sebagai anak langsung .app');

    const rkHead = doc.querySelector('#rk-head');
    assert(rkHead, '#rk-head harus ada');
    assert.strictEqual(
      rkHead.parentElement,
      wEl,
      'Akar Masalah Regresi: #rk-head HARUS anak langsung .w, BUKAN .app (mencegah grid row offset raksasa)'
    );

    const vRincian = doc.querySelector('#v-rincian');
    assert(vRincian, '#v-rincian harus ada');
    assert.strictEqual(
      vRincian.parentElement,
      wEl,
      'Akar Masalah Regresi: #v-rincian HARUS anak langsung .w, BUKAN .app'
    );

    // Invarian 2: #yr-pop (Tahun, bulan saldo, dan saldo awal) berada di .topbar-actions
    const yrPop = doc.getElementById('yr-pop');
    assert(yrPop, '#yr-pop harus ada');
    const topbarActions = doc.querySelector('.topbar-actions');
    assert(topbarActions, '.topbar-actions harus ada');
    assert.strictEqual(
      yrPop.parentElement,
      topbarActions,
      '#yr-pop HARUS berada di dalam .topbar-actions, bukan di sidebar .sb-mid'
    );

    // Invarian 3: Panel #yr-panel bisa dibuka dan ditutup dengan tombol #yr-btn
    const yrBtn = doc.getElementById('yr-btn');
    const yrPanel = doc.getElementById('yr-panel');
    assert(yrBtn, '#yr-btn harus ada');
    assert(yrPanel, '#yr-panel harus ada');
    assert.strictEqual(yrPanel.hidden, true, 'awalnya #yr-panel tertutup');

    yrBtn.click();
    assert.strictEqual(yrPanel.hidden, false, 'klik #yr-btn harus membuka #yr-panel');

    const yrDone = doc.getElementById('yr-done');
    assert(yrDone, '#yr-done harus ada');
    yrDone.click();
    assert.strictEqual(yrPanel.hidden, true, 'klik #yr-done harus menutup #yr-panel dan menyimpan');

    console.log('OK dom_structure');
    process.exit(0);
  } finally {
    if (t.errs.length) console.log(t.errs.join('\n'));
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
