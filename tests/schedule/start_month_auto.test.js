// Bulan mulai: auto ikut kalender (tahun berjalan), manual menang, ganti hari/tab memicu render ulang tanpa menulis data.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    w.localStorage.removeItem('rk-sm-manual');
    // Tahun berjalan, tanpa penanda manual: efektif mengikuti kalender; data tersimpan tidak dirubah.
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 0;
    assert.strictEqual(w.smEff(), 10, 'tahun berjalan: auto = Nov');
    assert.strictEqual(+w.S.startMonth, 0, 'data tersimpan tetap 0, tidak dimutasi');
    assert.strictEqual(w.$('sm').value, 'auto');

    // Pergantian hari tidak menulis data.
    w.__today = '2026-12-01';
    w.refreshToday();
    assert.strictEqual(w.smEff(), 11, 'auto ikut Des');
    assert.strictEqual(+w.S.startMonth, 0, 'refreshToday tidak menulis startMonth');
    assert.strictEqual(w.$('sm').value, 'auto');

    // Tahun lampau (relatif terhadap today): nilai tersimpan dipakai apa adanya.
    w.__today = '2027-01-01';
    w.refreshToday();
    assert.strictEqual(+w.S.year, 2026, 'tahun aktif tidak berpindah otomatis');
    assert.strictEqual(w.smEff(), 0, 'tahun lampau: bulan saldo tidak diubah (pakai tersimpan)');
    assert.strictEqual(w.$('sm').value, '0');

    // Tahun depan: nilai tersimpan dipakai apa adanya.
    w.__today = '2026-12-05';
    w.switchYear(2028);
    w.S.startMonth = 3;
    assert.strictEqual(w.smEff(), 3, 'tahun depan: tidak diubah');
    assert.strictEqual(w.S.smManual, undefined, 'tahun depan tidak ditandai manual');

    // Manual: pilih bulan berbeda dari efektif di tahun berjalan -> penanda tersinkron + nilai tersimpan.
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 0; // sisa auto lama
    delete w.S.smManual;
    w.$('sm').value = '4';
    w.$('sm').onchange.call(w.$('sm'));
    assert.strictEqual(w.S.smManual, true);
    assert.strictEqual(+w.S.startMonth, 4);
    assert.strictEqual(w.$('sm').value, '4');
    assert.strictEqual(w.$('sm').getAttribute('data-auto'), 'manual');

    // Manual tidak ditimpa saat kalender berganti.
    w.__today = '2026-12-01';
    w.refreshToday();
    assert.strictEqual(w.smEff(), 4, 'manual tidak ditimpa');

    // Kembali ke otomatis menghapus penanda.
    w.$('sm').value = 'auto';
    w.$('sm').onchange.call(w.$('sm'));
    assert.strictEqual(w.S.smManual, undefined);
    assert.strictEqual(w.smEff(), 11);
    assert.strictEqual(w.$('sm').value, 'auto');

    console.log('OK start_month_auto');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
