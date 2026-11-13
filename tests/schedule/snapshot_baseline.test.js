/**
 * Regresi tata letak: teks per kartu versi BARU harus identik dengan baseline versi LAMA
 * (index.html dari commit sebelum perubahan layout), untuk data dan tanggal yang sama.
 *
 * Baseline diambil dari git — TIDAK memakai `git stash`, jadi perubahan yang belum di-commit aman.
 *   BASELINE_REF=<ref>   (default: b0619f2 = commit sebelum tata letak 12 kolom)
 *   BASELINE_FILE=<path> untuk memakai berkas lain (mis. tangkapan versi lama)
 * Selisih yang diizinkan HANYA: kalimat ringkasan header #rk-head dan label sidebar .sb-*.
 */
const assert = require('assert');
const { loadHtml, render, slots, BASE_REF } = require('./_snap.js');
const DATA = require('./fixtures/snapshot_data.js');

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Bekas slot pada versi lama: .hero/.split* — dipetakan ke nama slot yang sama. */
/** Versi lama: urutan DOM .splitH#1 = [saldo, jadwal], #2 = [grafik, pemasukan/pengeluaran], #3 = kategori. */
function oldSlots(w) {
  const doc = w.document;
  const g = [...doc.querySelectorAll('#v-rincian .splitH')];
  const row = (i) => (g[i] ? [...g[i].children] : []);
  const r0 = row(0),
    r1 = row(1);
  const rk = doc.querySelector('#v-rincian .splitR');
  const c = (n) => (n ? clean(n.textContent) : null);
  return {
    kas: c(r0[0]),
    bills: c(r0[1]),
    flow: c(r1[0]),
    mf: c(r1[1]),
    cat1: c(r0[2] ? null : row(2)[0]),
    cat2: c(row(2)[1]),
    detail: c(rk ? rk.children[0] : doc.querySelector('#v-rincian .card table') ? doc.querySelector('#v-rincian .card table').closest('.card') : null),
    tx: c(rk ? rk.children[1] : null),
  };
}

(async () => {
  const htmlNew = loadHtml('new');
  const htmlOld = loadHtml('old');
  const wNew = render(htmlNew, DATA);
  const wOld = render(htmlOld, DATA);
  const a = slots(wNew);
  const b = oldSlots(wOld);
  try {
    // Struktur baru: 7 slot bersaudara, dua panel kategori terpisah.
    assert.strictEqual(a.footprint.length, 7, 'grid berisi 7 slot');
    assert(a['cat-panel1'] && a['cat-panel2'], 'dua panel kategori terpisah');

    // Teks per kartu harus identik dengan versi lama (abaikan urutan bagian dalam kartu).
    const sortWords = (s) => (s || '').split(' ').filter(Boolean).sort().join(' ');
    for (const k of ['kas', 'flow', 'mf', 'bills', 'detail', 'tx']) {
      if (b[k] == null) continue; // versi lama tidak punya selektor ini → tidak dibandingkan
      assert.strictEqual(sortWords(a[k] && a[k].text), sortWords(b[k]), 'isi kartu "' + k + '" identik dengan versi lama');
    }

    // Panel kategori dibandingkan terpisah, bukan sebagai satu kartu gabungan.
    assert(a['cat-panel1'] && a['cat-panel2'], 'panel kategori ada di versi baru');
    const oldCat = [wOld.document.querySelector('#v-rincian .insight'), wOld.document.querySelector('#v-rincian .slot-card')];
    oldCat.forEach((n, i) => {
      if (!n) return;
      const newPanel = (wNew.document.querySelectorAll('.rk-cat > *')[i] || {}).textContent;
      assert.strictEqual(sortWords(newPanel), sortWords(n.textContent), 'panel kategori ' + (i + 1) + ' identik');
    });

    // Teks wajib identik persis (label total di kartu pengeluaran memakai "· total Rp ...").
    const per = (a.mf && a.mf.text) || '';
    const perOld = (b.mf || '').match(/· total keluar Rp [\d.,]+/g) || [];
    const perNew = per.match(/· total keluar Rp [\d.,]+/g) || [];
    assert.deepStrictEqual(perNew, perOld, 'label total kartu arus bulanan identik dengan versi lama');
    assert(perNew.length > 0, 'label periode memakai "· total ... Rp"');
    const exp = (a['cat-panel2'] && a['cat-panel2'].text) || '';
    assert(/· total Rp [\d.,]+/.test(exp), 'panel item terbesar memakai "· total Rp ..."');
    assert(!/— total/.test(per + exp), 'tidak ada "— total"');

    // Satu-satunya tambahan yang diizinkan: ringkasan header.
    const head = clean(a.head);
    assert(head.length > 0, 'ringkasan header #rk-head terisi');
    assert(head.includes('Kas cukup') || head.includes('Kas habis') || head.includes('Saldo'), 'ringkasan header berupa kalimat status');

    console.log('OK snapshot_baseline (baseline ' + BASE_REF + ')');
    process.exit(0);
  } catch (e) {
    console.error('GAGAL snapshot_baseline\n' + e.message);
    if (/identik/.test(e.message)) {
      const k = e.message.includes('"') ? e.message.split('"')[1] : null;
      if (k) console.error('BARU :', a[k] && a[k].text, '\nLAMA :', b[k]);
    }
    process.exit(1);
  }
})();
