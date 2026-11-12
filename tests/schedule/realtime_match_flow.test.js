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
      const saldoCard = [...w.document.querySelectorAll('.card')].find(c => /Saldo Realtime/.test(c.textContent));
      assert(saldoCard, 'Saldo Realtime tampil untuk ' + today);
      const bal = +(saldoCard.querySelector('.hm-big').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
      const chartCard = [...w.document.querySelectorAll('.card')].find(c => /Arus saldo/.test(c.textContent));
      const tipBal = +(chartCard.querySelector('.lc-big').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
      assert.strictEqual(bal, tipBal, `saldo realtime (${bal}) != titik grafik (${tipBal}) pada ${today}`);
    }

    // --- transaksi masa depan di bulan saldo: kasBal memfilter per bulan, Arus saldo Minggu memfilter per tanggal ---
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 1_000_000;
    w.S.items = [it('M1', 120000, '2026-11-10')];
    w.S.paid = { 'M1|2026-11-10': 1 };
    w.S.skip = {};
    w.kasLinked().tx = [
      // transaksi manual bertanggal masa depan di bulan yang sama (Nov)
      { id: 'fut', d: '2026-11-20', t: '-', amt: 300000, cat: 'A', note: 'rencana', ro: 'manual' },
    ];
    w.flowPeriod = 'w';
    w.renderAll();
    const saldoCard2 = [...w.document.querySelectorAll('.card')].find(c => /Saldo Realtime/.test(c.textContent));
    const bal2 = +(saldoCard2.querySelector('.hm-big').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
    const chartCard2 = [...w.document.querySelectorAll('.card')].find(c => /Arus saldo/.test(c.textContent));
    const tipBal2 = +(chartCard2.querySelector('.lc-big').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, ''));
    assert.notStrictEqual(bal2, tipBal2, `realtime (${bal2}) dan titik grafik (${tipBal2}) harus berbeda saat ada transaksi masa depan di luar periode Minggu`);
    // realtime lebih kecil karena sudah memotong transaksi masa depan (filter per bulan).
    assert(bal2 < tipBal2, `realtime (${bal2}) harus lebih kecil dari titik grafik (${tipBal2})`);
    // Petunjuk Saldo realtime: muncul bila ada transaksi setelah hari ini di bulan saldo; saldo tidak berubah.
    assert(/transaksi bertanggal setelah hari ini/.test(saldoCard2.textContent), 'petunjuk transaksi masa depan muncul');
    assert.strictEqual(+(saldoCard2.querySelector('.hm-big').textContent.match(/Rp\s*([\d\.]+)/)[1].replace(/\./g, '')), bal2, 'angka saldo tetap setelah hint');
    console.log('OK realtime_match_flow');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
