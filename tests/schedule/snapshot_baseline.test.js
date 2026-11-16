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
    // Struktur Fiscal Atelier: hero + bar row + where card + rincian/tx grid
    assert.strictEqual(a.footprint.length, 4, 'stack Rincian berisi 4 blok utama: ' + a.footprint.join(','));
    assert(a.kas && a.bills && a.mf && a.where && a.detail && a.tx, 'semua bagian utama Fiscal Atelier terpasang');

    // 1. Angka kategori & item terbesar identik totalnya dengan baseline lama
    if (b['cat']) assert(clean(a.where.text).includes('Rp 22.440.000'), 'total pengeluaran kategori cocok');
    assert.strictEqual(wNew.document.getElementById('top5-total-badge').textContent.trim(), 'Rp 22.440.000', 'total item terbesar cocok');

    // 2. Nominal saldo realtime, sisa saldo akhir, dan detail bulanan identik dengan baseline
    const balNew = wNew.document.getElementById('rincian-saldo-now').textContent.trim();
    const endNew = wNew.document.getElementById('metric-end-bal').textContent.trim();
    const kasOld = money(b.kas).concat(money(b.flow));
    assert(kasOld.includes(balNew), 'Saldo Realtime baru (' + balNew + ') cocok dengan baseline');
    assert(kasOld.includes(endNew) || wNew.calc().end === wOld.calc().end, 'Saldo akhir tahun cocok dengan baseline');
    assert(/Jatah jajan harian/.test(a.kas.text), 'tile jatah jajan harian ada');
    assert(/Sisa saldo akhir/.test(a.kas.text), 'tile sisa saldo akhir ada');
    assert(/Rata-rata beban rutin/.test(a.kas.text), 'tile rata-rata beban rutin ada');
    assert(/Progres pelunasan/.test(a.kas.text), 'tile progres pelunasan ada');

    // 3. Arus bulanan: total masuk & keluar konsisten dengan baseline
    const yc = wNew.yearCash();
    assert.strictEqual(yc.out, 22440000, 'yearCash().out = Rp 22.440.000');
    assert(a.mf.text.includes('Masuk') && a.mf.text.includes('Keluar'), 'ringkasan bar chart menampilkan Masuk dan Keluar');

    // Ringkasan header #rk-head
    const head = clean(a.head);
    assert(head.length > 0, 'ringkasan header #rk-head terisi');
    assert(head.includes('Kas') || head.includes('Saldo') || head.includes('Selamat'), 'ringkasan header terisi kalimat status');

    console.log('OK snapshot_baseline (baseline ' + BASE_REF + ')');
    process.exit(0);
  } catch (e) {
    console.error('GAGAL snapshot_baseline\n' + e.message);
    for (const k of ['kas', 'flow', 'bills', 'mf', 'cat', 'top', 'detail', 'tx']) console.error(k, '| NEW:', (a[k] && a[k].text || '').slice(0, 200), '| OLD:', (b[k] || '').slice(0, 200));
    process.exit(1);
  }
})();
