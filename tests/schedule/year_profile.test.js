// Perilaku dashboard untuk profil tahun != kalender (lampau, depan, simulasi).
const assert = require('assert');
const { boot } = require('./ui.js');
const it = (id, price, start) => ({ id, name: id, price, start, n: 1, unit: 'sekali', cat: 'A', ch: [] });

function findCard(doc, re) {
  const all = [...doc.querySelectorAll('.card')].filter((c) => re.test(c.textContent));
  return all.find((c) => !all.some((o) => o !== c && c.contains(o))) || all[0];
}

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;
  try {
    w.__today = '2026-11-12';

    // --- tahun berjalan 2026 ---
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 1000000;
    w.S.items = [it('X', 120000, '2026-11-13'), it('Y', 50000, '2026-11-10'), it('Z', 30000, '2026-11-01')];
    w.S.paid = {};
    w.S.skip = {};
    w.kasLinked().tx = [];

    w.document.querySelector('#tab-rincian [data-range="w"]').click();
    w.document.querySelector('#card-where-money [data-where-period="w"]').click();
    w.renderAll();
    const cfText = w.document.getElementById('svg-cashflow').textContent;
    assert(cfText && /Nov/i.test(cfText), 'Grafik Arus Saldo Minggu 2026 ter-render: ' + cfText);

    // Ke Mana Uangnya Pergi Minggu
    let sub = w.brGetWhereDataset().label || '';
    assert(/7 Hari Terakhir/.test(sub), 'Top expenses Minggu 2026: ' + sub);
    assert(!/· rencana/.test(sub), 'Tahun berjalan bukan · rencana');

    // --- tahun depan (simulasi) 2027 ---
    w.switchYear(2027);
    w.S.startMonth = 10;
    w.S.saldo = 1000000;
    w.S.items = [it('X', 120000, '2027-11-13'), it('Y', 50000, '2027-11-10'), it('Z', 30000, '2027-11-01')];
    w.S.paid = {};
    w.kasLinked().tx = [];

    w.document.querySelector('#tab-rincian [data-range="w"]').click();
    w.document.querySelector('#card-where-money [data-where-period="w"]').click();
    w.renderAll();
    sub = w.brGetWhereDataset().label || '';
    assert(/7 Hari Terakhir · rencana/.test(sub), '2027 harus · rencana: ' + sub);

    // --- tahun lampau 2025 ---
    w.__today = '2026-11-12';
    w.switchYear(2025);
    w.S.startMonth = 0;
    w.S.saldo = 2000000;
    w.S.items = [it('X', 120000, '2025-08-13'), it('Y', 50000, '2025-08-10'), it('Z', 30000, '2025-08-05')];
    w.S.paid = {};
    w.kasLinked().tx = [];

    w.document.querySelector('#tab-rincian [data-range="w"]').click();
    w.document.querySelector('#card-where-money [data-where-period="w"]').click();
    w.renderAll();
    sub = w.brGetWhereDataset().label || '';
    assert(!/· rencana/.test(sub), 'Tahun lampau 2025 bukan rencana: ' + sub);

    // --- pergantian 31 Des -> 1 Jan, tahun berjalan 2027 ---
    w.__today = '2027-01-01';
    w.switchYear(2027);
    w.S.startMonth = 0;
    w.S.saldo = 1000000;
    w.S.items = [it('A', 100000, '2026-12-31'), it('B', 50000, '2027-01-01')];
    w.S.paid = {};
    w.kasLinked().tx = [];
    w.document.querySelector('#card-where-money [data-where-period="w"]').click();
    w.renderAll();
    const cpW = w.cashPeriod(w.yearCash(), 'w');
    assert.strictEqual(cpW.from, '2026-12-26', 'Awal minggu Jan 2027 mencakup 26 Des 2026');
    assert.strictEqual(cpW.to, '2027-01-01', 'Akhir minggu Jan 2027 = 1 Jan 2027');

    console.log('OK year_profile');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
