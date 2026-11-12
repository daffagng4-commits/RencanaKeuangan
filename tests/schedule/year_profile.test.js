// Perilaku dashboard untuk profil tahun != kalender (lampau, depan, simulasi).
const assert = require('assert');
const { boot } = require('./ui.js');
const it = (id, price, start) => ({ id, name: id, price, start, n: 1, unit: 'sekali', cat: 'A', ch: [] });

function findCard(doc, re) {
  return [...doc.querySelectorAll('.card')].find((c) => re.test(c.textContent));
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

    w.flowPeriod = 'w';
    w.expenseMonth = 'w';
    w.renderAll();
    let card = findCard(w.document, /Arus saldo/);
    assert(card, 'kartu Arus saldo 2026 ada');
    let sub = card.querySelector('.sub')?.textContent || '';
    assert(/6 Nov.*12 Nov/.test(sub), 'Arus saldo Minggu 2026: ' + sub);
    assert(!/· rencana/.test(sub), 'Arus saldo 2026 bukan rencana');

    // Item pengeluaran terbesar Minggu
    card = findCard(w.document, /Item pengeluaran terbesar/);
    sub = card.querySelector('.sub')?.textContent || '';
    assert(/6 Nov 2026 – 12 Nov 2026/.test(sub), 'Top expenses Minggu 2026: ' + sub);

    // --- tahun depan (simulasi) 2027 ---
    w.switchYear(2027);
    w.S.startMonth = 10;
    w.S.saldo = 1000000;
    w.S.items = [it('X', 120000, '2027-11-13'), it('Y', 50000, '2027-11-10'), it('Z', 30000, '2027-11-01')];
    w.S.paid = {};
    w.kasLinked().tx = [];

    w.flowPeriod = 'w';
    w.expenseMonth = 'w';
    w.renderAll();
    card = findCard(w.document, /Arus saldo/);
    assert(card, 'kartu Arus saldo 2027 ada');
    sub = card.querySelector('.sub')?.textContent || '';
    assert(/6 Nov.*12 Nov/.test(sub), 'Arus saldo Minggu 2027 simulasi: ' + sub);
    assert(/· rencana/.test(sub), 'Arus saldo 2027 harus · rencana');

    card = findCard(w.document, /Pengeluaran \& pemasukan per kategori/);
    assert(/· rencana/.test(card.textContent), 'Kategori 2027 harus · rencana');

    card = findCard(w.document, /Item pengeluaran terbesar/);
    sub = card.querySelector('.sub')?.textContent || '';
    assert(/6 Nov 2027 – 12 Nov 2027/.test(sub), 'Top expenses Minggu 2027 simulasi: ' + sub);
    assert(/· rencana/.test(sub), 'Top expenses 2027 harus · rencana');

    // --- tahun lampau 2025 ---
    w.__today = '2026-11-12';
    w.switchYear(2025);
    w.S.startMonth = 0;
    w.S.saldo = 2000000;
    w.S.items = [it('X', 120000, '2025-08-13'), it('Y', 50000, '2025-08-10'), it('Z', 30000, '2025-08-05')];
    w.S.paid = {};
    w.kasLinked().tx = [];

    w.flowPeriod = 'w';
    w.expenseMonth = 'w';
    w.renderAll();
    card = findCard(w.document, /Arus saldo/);
    assert(card, 'kartu Arus saldo 2025 ada');
    sub = card.querySelector('.sub')?.textContent || '';
    assert(/7 Agu.*13 Agu/.test(sub), 'Arus saldo Minggu 2025 lampau: ' + sub);
    assert(!/· rencana/.test(card.textContent), 'Tahun lampau bukan rencana');

    // --- pergantian 31 Des -> 1 Jan, tahun berjalan 2027 ---
    w.__today = '2027-01-01';
    w.switchYear(2027);
    w.S.startMonth = 0;
    w.S.saldo = 1000000;
    w.S.items = [it('A', 100000, '2026-12-31'), it('B', 50000, '2027-01-01')];
    w.S.paid = {};
    w.kasLinked().tx = [];
    w.expenseMonth = 'w';
    w.renderAll();
    card = findCard(w.document, /Item pengeluaran terbesar/);
    sub = card.querySelector('.sub')?.textContent || '';
    assert(/26 Des 2026 – 1 Jan 2027/.test(sub), 'Top expenses Minggu awal Jan 2027: ' + sub);

    console.log('OK year_profile');
  } finally {
    w.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
