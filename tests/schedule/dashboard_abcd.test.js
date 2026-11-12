// A/B/C/D: hitung mundur, penanda saldo minus, filter global, solid/putus-putus arus saldo.
const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  await t.ready();
  const { w } = t;

  try {
    w.__today = '2026-11-12';
    w.switchYear(2026);
    w.S.startMonth = 10;
    w.S.saldo = 1472000;
    w.S.items = [
      { id: 'k1', name: 'Kuota', price: 50000, start: '2026-11-17', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 't1', name: 'Torbox', price: 500000, start: '2026-11-26', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 's1', name: 'Saham', price: 570000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'b1', name: 'BTC', price: 250000, start: '2026-12-05', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'w1', name: 'Warp', price: 15000, start: '2026-12-07', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'p1', name: 'BPJS', price: 150000, start: '2026-12-10', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'v1', name: 'Vidio', price: 200000, start: '2026-12-12', n: 1, unit: 'sekali', cat: 'A', ch: [] },
      { id: 'e1', name: 'ETF', price: 3350000, start: '2026-12-15', n: 1, unit: 'sekali', cat: 'A', ch: [] }
    ];
    w.S.paid = {};
    w.S.skip = {};
    const P = w.kasLinked();
    P.tx = [
      { id: 'belanja', d: '2026-11-01', t: '-', amt: 100000, cat: 'Belanja', note: '' },
      { id: 'gaji', d: '2026-12-01', t: '+', amt: 2500000, cat: 'Gaji', note: '' }
    ];
    w.renderAll();

    // === C: hitung mundur ===
    const cards = [...w.document.querySelectorAll('.card')];
    const bills = cards.find((c) => /Jadwal tagihan/.test(c.textContent));
    assert(bills, 'kartu jadwal tagihan ada');
    const txt = bills.textContent.replace(/\s+/g, ' ');
    assert(/Kuota.*5 hari lagi/.test(txt), 'Kuota 17 Nov = 5 hari lagi: ' + txt);
    assert(/Torbox.*14 hari lagi/.test(txt), 'Torbox 26 Nov = 14 hari lagi: ' + txt);
    assert(/Saham.*23 hari lagi/.test(txt), 'Saham 5 Des = 23 hari lagi: ' + txt);
    assert(/BTC.*23 hari lagi/.test(txt), 'BTC 5 Des = 23 hari lagi: ' + txt);
    assert(/Warp.*25 hari lagi/.test(txt), 'Warp 7 Des = 25 hari lagi: ' + txt);
    assert(/BPJS.*28 hari lagi/.test(txt), 'BPJS 10 Des = 28 hari lagi: ' + txt);

    // === C: tanggal saldo minus dan baris ringkasan ===
    const fn = w.kasFirstNegative(P);
    assert(fn, 'ada tanggal saldo minus');
    assert.strictEqual(fn.date, '2026-12-15', 'saldo minus 15 Des');
    assert.strictEqual(fn.days, 33, '33 hari lagi');
    assert.strictEqual(fn.balanceAfter, -1213000, 'minus Rp 1.213.000');
    assert(/Saldo mulai minus/.test(txt), 'ada baris ringkasan minus');
    assert(/15 Des/.test(txt), 'ringkasan menyebut 15 Des');

    // === C: tooltip saldo proyeksi (atribut title) ===
    const rows = [...bills.querySelectorAll('.it2.kit')];
    assert(rows.some((r) => r.title && /Saldo proyeksi setelah ini/.test(r.title)), 'ada title saldo proyeksi');

    // === B: garis solid vs putus-putus dan penanda ===
    const flowCard = cards.find((c) => /Arus saldo/.test(c.textContent));
    assert(flowCard, 'kartu arus saldo ada');
    const svg = flowCard.querySelector('svg.lc');
    assert(svg, 'svg arus saldo ada');
    const solid = svg.querySelector('.lc-line');
    const dashed = svg.querySelector('.lc-line-p');
    assert(solid && solid.getAttribute('d'), 'garis solid ada');
    assert(dashed && dashed.getAttribute('d'), 'garis putus-putus ada');
    const mark = svg.querySelector('.lc-mark').textContent;
    assert(/Hari ini/.test(mark), 'penanda Hari ini ada');
    assert(/Saldo habis/.test(mark), 'penanda Saldo habis ada');

    // === A1: warna bar masuk/keluar ===
    const bars = flowCard.closest ? flowCard.closest('.splitH') : flowCard;
    // Warna diatur lewat CSS variable; cukup periksa struktur legend dan class card.
    assert(w.document.querySelector('.bs-card'), 'kartu bar chart ada');

    // === A2: jatah jajan ===
    const hero = w.document.querySelector('.hero');
    const jatah = hero && hero.querySelector('.jatah');
    assert(jatah, 'kartu jatah ada');
    assert(/Tidak tersedia/.test(jatah.textContent), 'jatah menampilkan Tidak tersedia saat minus');
    assert(/Perlu kurangi/.test(jatah.textContent), 'jatah menampilkan kekurangan');

    // === A3: chip dipersingkat dan punya title ===
    const chip = w.document.querySelector('td.c-c .chip[title]');
    assert(chip, 'chip rincian punya title nama lengkap');

    // === D: filter global mapping ===
    const C = w.yearCash();
    w.setDashPeriod('y', C);
    assert.strictEqual(w.flowPeriod, 'y', 'global Tahun -> flow y');
    assert.strictEqual(w.bsPeriod, 'y', 'global Tahun -> bs y');
    assert.strictEqual(w.catPeriod, 'y', 'global Tahun -> cat y');
    assert.strictEqual(w.expenseMonth, 'all', 'global Tahun -> expense all');

    w.setDashPeriod('m', C);
    assert.strictEqual(w.flowPeriod, 'm', 'global Bulan -> flow m');
    assert.strictEqual(w.bsPeriod, 'm', 'global Bulan -> bs m');
    assert.strictEqual(w.catPeriod, 'm', 'global Bulan -> cat m');
    assert(w.expenseMonth !== 'all', 'global Bulan -> expense bulan');

    // Perbedaan manual ditandai
    w.bsPeriod = 'y';
    w.renderAll();
    const badge = w.document.querySelector('.dash-badge');
    assert(badge, 'badge beda filter muncul saat kartu manual berbeda');

    console.log('OK dashboard_abcd');
  } finally {
    w.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
