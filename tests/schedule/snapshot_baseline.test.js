/**
 * Regresi tata letak: angka & teks per kartu versi BARU harus identik dengan baseline versi LAMA
 * (index.html dari commit sebelum perubahan layout), untuk data dan tanggal yang sama.
 *
 * Baseline diambil dari git — TIDAK memakai `git stash`, jadi perubahan yang belum di-commit aman.
 *   BASELINE_REF=<ref>   (default: b0619f2 = commit sebelum tata letak 12 kolom)
 *   BASELINE_FILE=<path> untuk memakai berkas lain
 * Pengecualian yang diizinkan (brief §10.1): sapaan/ringkasan header, struktur kartu gabungan
 * "Kondisi kas" (judul + chip + tile), label sidebar, dan penempatan kartu.
 */
const assert = require('assert');
const { loadHtml, render, slots, BASE_REF } = require('./_snap.js');
const DATA = require('./fixtures/snapshot_data.js');

const clean = (s) => (s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
/** Nominal rupiah dari sebuah elemen. */
const money = (s) => clean(s).match(/Rp [\d.]+/g) || [];

/** Slot versi lama: .splitH[0]=[saldo, jadwal], [1]=[grafik, arus bulanan], [2]=[kategori, item terbesar], .splitR=[rincian, transaksi]. */
function oldSlots(w) {
  const doc = w.document;
  const g = [...doc.querySelectorAll('#v-rincian .splitH')];
  const row = (i) => (g[i] ? [...g[i].children] : []);
  const rk = doc.querySelector('#v-rincian .splitR');
  const t = (n) => clean(n && n.textContent);
  return {
    kas: t(row(0)[0]),
    bills: t(row(0)[1]),
    flow: t(row(1)[0]),
    mf: t(row(1)[1]),
    cat: t(row(2)[0]),
    top: t(row(2)[1]),
    detail: t(rk && rk.children[0]),
    tx: t(rk && rk.children[1]),
  };
}

(async () => {
  const wNew = render(loadHtml('new'), DATA);
  const wOld = render(loadHtml('old'), DATA);
  const a = slots(wNew);
  const b = oldSlots(wOld);
  const ok = (k) => ({ new: a[k] && a[k].text, old: b[k] });
  try {
    // Struktur bari: 7 slot bersaudara sesuai target tata letak.
    assert.deepStrictEqual(a.footprint, ['rk-kas', 'rk-bills', 'rk-mf', 'rk-cat', 'rk-top', 'rk-detail', 'rk-tx'], 'grid berisi 7 slot berurutan');

    // 1. Kartu yang hanya DIPINDAH: nominal & teks harus identik dengan versi lama.
    for (const k of ['bills', 'mf', 'cat', 'top', 'detail', 'tx']) {
      if (!b[k]) continue;
      assert.deepStrictEqual(money(a[k] && a[k].text), money(b[k]), 'nominal kartu "' + k + '" identik dengan versi lama');
    }

    // 2. Kondisi kas = gabungan kartu Saldo realtime + Arus saldo lama.
    const kasNew = money(a.kas && a.kas.text);
    const kasOld = money(b.kas).concat(money(b.flow));
    const uniq = (x) => [...new Set(x)];
    assert.deepStrictEqual(new Set(kasNew), new Set(kasOld), 'Kondisi kas memuat semua nominal kartu saldo + arus saldo lama');
    const low = (b.flow || '').match(/Terendah[\s\S]*?\)/);
    assert(low && clean(a.kas.text).includes(clean(low[0])), 'teks "Terendah ..." ikut ke Kondisi kas');
    assert(/Nyata/.test(a.kas.text) && /Proyeksi/.test(a.kas.text), 'legenda Nyata/Proyeksi di Kondisi kas');
    assert(/Jatah jajan per bulan/.test(a.kas.text), 'tile jatah jajan ada');
    assert(/Sisa saldo akhir/.test(a.kas.text), 'tile sisa saldo akhir ada');
    assert(/Rata-rata per bulan/.test(a.kas.text), 'tile rata-rata per bulan ada');
    assert(/Transaksi kas/.test(a.kas.text), 'tile transaksi kas ada');
    // Chip persen: rumus lama (dari kartu arus saldo), bukan angka baru.
    const pctOld = (b.flow || '').match(/\d{1,3},\d%/);
    const pctNew = clean(a.kas.text).match(/\d{1,3},\d%/);
    assert(pctOld ? (pctNew && pctNew[0] === pctOld[0]) : !pctNew, 'chip persen = nilai persen kartu arus saldo lama');

    // 3. Label total & pemisah "·" tidak berubah.
    assert(/· total keluar Rp [\d.,]+/.test(a.mf.text), 'label periode kartu arus bulanan memakai "· total keluar Rp ..."');
    assert(/· total Rp [\d.,]+/.test(a.top.text), 'panel item terbesar memakai "· total Rp ..."');
    assert(!/— total/.test(a.mf.text + a.top.text), 'tidak ada "— total"');

    // Satu-satunya tambahan yang diizinkan: ringkasan header.
    const head = clean(a.head);
    assert(head.length > 0, 'ringkasan header #rk-head terisi');
    assert(head.includes('Kas cukup') || head.includes('Kas habis') || head.includes('Saldo'), 'ringkasan header berupa kalimat status');

    console.log('OK snapshot_baseline (baseline ' + BASE_REF + ')');
    process.exit(0);
  } catch (e) {
    console.error('GAGAL snapshot_baseline\n' + e.message);
    for (const k of ['kas', 'flow', 'bills', 'mf', 'cat', 'top', 'detail', 'tx']) console.error(k, '| NEW:', (a[k] && a[k].text || '').slice(0, 200), '| OLD:', (b[k] || '').slice(0, 200));
    process.exit(1);
  }
})();
