// Saldo realtime harus sama dengan titik "hari ini" di grafik Arus saldo
// pada fixture tanpa transaksi bertanggal masa depan di bulan saldo.
const assert = require('assert');
const { boot } = require('./ui.js');
const it = (id, price, start) => ({ id, name: id, price, start, n: 1, unit: 'sekali', cat: 'A', ch: [] });

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    // Fixture: item lunas murni (tidak memasukkan transaksi kas ganda; tagihan lunas muncul lewat kasDerived).
    const mkProfile = (today) => {
      w.__today = today;
      w.switchYear(2026);
      w.S.startMonth = 10;
            w.S.saldo = 1_000_000;
      w.S.items = [
        it('M1', 120000, '2026-11-10'),
        it('M2', 50000, '2026-11-05'),
      ];
      w.S.paid = { 'M1|2026-11-10': 1, 'M2|2026-11-05': 1 };
      w.S.skip = {};
      // Hanya masukkan transaksi kas yang bukan tagihan (tagihan lunas dihitung otomatis).
      w.kasLinked().tx = [
        { id: 'in', d: '2026-11-01', t: '+', amt: 200000, cat: 'Masuk', note: 'coba', ro: 'manual' },
      ];
    };

    const cases = ['2026-11-12', '2026-11-15', '2026-12-01', '2026-12-15', '2027-01-01'];
    for (const today of cases) {
      mkProfile(today);
      w.renderAll();
      const saldoEl = w.document.getElementById('rincian-saldo-now');
      assert(saldoEl, 'Saldo Realtime tampil untuk ' + today);
      const bal = +(saldoEl.textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
      const pts = w.brBuildCashflowPoints('y');
      const todayPt = pts.find(p => p.today || p.d === today) || pts.slice(-1)[0];
      assert(todayPt, 'titik grafik ada untuk ' + today);
      assert.strictEqual(bal, todayPt.val, `saldo realtime (${bal}) != titik hari ini (${todayPt.val}) pada ${today}`);
    }

    // --- transaksi masa depan di bulan saldo: kasBal memfilter per bulan, grafik menyorot transaksi masa depan ---
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 1_000_000;
    w.S.items = [it('M1', 120000, '2026-11-10')];
    w.S.paid = { 'M1|2026-11-10': 1 };
    w.S.skip = {};
    w.kasLinked().tx = [
      // transaksi manual bertanggal bulan berikutnya (Des)
      { id: 'fut', d: '2026-12-05', t: '-', amt: 300000, cat: 'A', note: 'rencana', ro: 'manual' },
    ];
    w.renderAll();
    const bal2 = +(w.document.getElementById('rincian-saldo-now').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
    const ptsM = w.brBuildCashflowPoints('m');
    const todayM = ptsM.find(p => p.today);
    const endM = ptsM.slice(-1)[0].val;
    assert.strictEqual(bal2, todayM.val, `saldo realtime (${bal2}) cocok dengan titik hari ini (${todayM.val})`);
    assert(endM < bal2, `titik masa depan grafik (${endM}) turun setelah transaksi Des terhadap realtime Nov (${bal2})`);
    console.log('OK realtime_match_flow');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
