// Kartu "Jadwal tagihan" dan "Transaksi terakhir": helper murni + invarian daftar/total.
const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot(); await t.ready();
  const { w, $ } = t;
  try {
    // === helper murni ===
    assert.deepStrictEqual({ ...w.dayBadge('2026-11-17') }, { d: '17', wd: 'Sel' });
    assert.deepStrictEqual({ ...w.dayBadge('2026-11-15') }, { d: '15', wd: 'Min' });
    assert.strictEqual(w.dayBadge('2026-12-05').wd, 'Sab');

    assert.strictEqual(w.txInitials('Belanja bulanan', 'Belanja'), 'BB');
    assert.strictEqual(w.txInitials('kopi', 'Belanja'), 'K');
    assert.strictEqual(w.txInitials('', 'Gaji'), 'G');
    assert.strictEqual(w.txInitials('', ''), '?');
    assert.strictEqual(w.txInitials('  ', 'Investasi'), 'I');
    assert.strictEqual(w.txInitials('🍜 Makan', 'Belanja'), 'M', 'emoji dilewati, huruf diambil');
    assert.strictEqual(w.txInitials('東京 trip', 'X'), '東T', 'huruf non-Latin tetap dipakai');
    assert.strictEqual(w.txInitials('東京', 'X'), '東', 'satu kata non-Latin');
    assert.strictEqual(w.txInitials('a'.repeat(80), 'X'), 'A', 'nama panjang tidak memecah inisial');

    assert.strictEqual(w.dayGroupLabel('2026-11-13', '2026-11-13'), 'Hari ini');
    assert.strictEqual(w.dayGroupLabel('2026-11-12', '2026-11-13'), 'Kemarin');
    assert.strictEqual(w.dayGroupLabel('2026-11-10', '2026-11-13'), '10 Nov 2026');
    assert.strictEqual(w.dayGroupLabel('2026-12-31', '2027-01-01'), 'Kemarin', 'lintas tahun');
    assert.strictEqual(w.dayGroupLabel('2026-10-31', '2026-11-01'), 'Kemarin', 'lintas bulan');

    assert.strictEqual(w.netSigned([{ t: '+', amt: 124000 }, { t: '-', amt: 34000 }]), 90000);
    assert.strictEqual(w.netSigned([{ t: '-', amt: 34000 }, { t: '-', amt: 6000 }]), -40000);
    assert.strictEqual(w.netSigned([]), 0);

    // === data fixture ===
    w.__today = '2026-11-13';
    w.switchYear(2026);
    w.S.smManual = true; w.S.startMonth = 10;
    w.S.saldo = 1472000; w.S.adj = []; w.S.paid = {}; w.S.skip = {};
    w.S.items = [
      { id: 'k1', name: 'Kuota', price: 50000, start: '2026-11-13', n: 1, unit: 'sekali', cat: 'Tagihan', ch: [] },
      { id: 't1', name: 'Torbox', price: 500000, start: '2026-11-14', n: 1, unit: 'sekali', cat: 'Tagihan', ch: [] },
      { id: 's1', name: 'Saham', price: 570000, start: '2026-11-20', n: 1, unit: 'sekali', cat: 'Investasi', ch: [] },
      { id: 'b1', name: 'BTC', price: 250000, start: '2026-11-20', n: 1, unit: 'sekali', cat: 'Investasi', ch: [] },
      { id: 'w1', name: 'Warp', price: 15000, start: '2026-12-07', n: 1, unit: 'sekali', cat: 'Tagihan', ch: [] },
      { id: 'p1', name: 'BPJS', price: 150000, start: '2026-12-10', n: 1, unit: 'sekali', cat: 'Tagihan', ch: [] },
      { id: 'v1', name: 'Vidio', price: 200000, start: '2026-12-12', n: 1, unit: 'sekali', cat: 'Tagihan', ch: [] }
    ];
    const P = w.kasLinked();
    P.tx = [
      { id: 'a', d: '2026-11-13', t: '-', amt: 34000, cat: 'Belanja', note: 'Belanja bulanan' },
      { id: 'b', d: '2026-11-13', t: '+', amt: 124000, cat: 'Gaji', note: 'Gaji' },
      { id: 'c', d: '2026-11-12', t: '-', amt: 6000, cat: '', note: '' },
      { id: 'd', d: '2026-11-10', t: '-', amt: 90000, cat: 'Transport', note: 'Bensin' }
    ];
    w.txDir = 'all';
    w.renderAll();

    // === A: daftar tagihan identik dengan sumber, urutan sama (5 teratas) ===
    const R = w.reminders(200);
    const src = R.late.concat(R.soon);
    const upList = w.document.getElementById('upcoming-bills-list');
    assert(upList, 'daftar tagihan terdekat ada');
    const rows = [...upList.querySelectorAll('.upcoming-item')];
    assert.strictEqual(rows.length, Math.min(5, src.length), 'jumlah baris = min(5, sumber)');
    rows.forEach((el, i) => {
      const s = src[i];
      assert(el.querySelector('.upcoming-name').textContent === s.it.name, 'nama baris ' + i);
      assert(el.querySelector('.upcoming-right span').textContent === w.rp(s.price), 'nominal baris ' + i);
    });

    // === B: grup harian transaksi terakhir ===
    const txGroups = w.document.getElementById('recent-tx-groups');
    assert(txGroups, 'kartu transaksi ada');
    const days = [...txGroups.querySelectorAll('.tx-day-group')];
    assert.deepStrictEqual(days.map((d) => d.querySelector('.tx-day-head span').textContent), ['Jumat, 13 Nov 2026', 'Kamis, 12 Nov 2026', 'Selasa, 10 Nov 2026']);
    assert.strictEqual(days[0].querySelectorAll('.tx-item').length, 2);
    const net = days[0].querySelector('.tx-day-head span:last-child');
    assert.strictEqual(net.textContent, '+Rp 90.000', 'total bersih hari ini: ' + net.textContent);
    assert.strictEqual(days[1].querySelector('.tx-day-head span:last-child').textContent, '-Rp 6.000', 'hari minus');

    // baris transaksi
    const r0 = days[0].querySelectorAll('.tx-item')[0];
    assert(r0.textContent.includes('Belanja bulanan') && r0.textContent.includes('Belanja'));
    assert(r0.textContent.includes('-' + w.rp(34000)));
    const r1 = days[0].querySelectorAll('.tx-item')[1];
    assert(r1.textContent.includes('+' + w.rp(124000)));

    // toggle Keluar: hanya baris keluar, total harian ikut
    w.document.querySelector('#tab-rincian [data-txf="out"]').click();
    const d2 = [...w.document.getElementById('recent-tx-groups').querySelectorAll('.tx-day-group')];
    assert.deepStrictEqual(d2.map((d) => d.querySelector('.tx-day-head span').textContent), ['Jumat, 13 Nov 2026', 'Kamis, 12 Nov 2026', 'Selasa, 10 Nov 2026']);
    assert.strictEqual(d2[0].querySelectorAll('.tx-item').length, 1);
    assert.strictEqual(d2[0].querySelector('.tx-day-head span:last-child').textContent, '-Rp 34.000', 'total ikut toggle');
    // toggle Masuk: hari tanpa pemasukan hilang, tidak ada grup kosong
    w.document.querySelector('#tab-rincian [data-txf="in"]').click();
    const d3 = [...w.document.getElementById('recent-tx-groups').querySelectorAll('.tx-day-group')];
    assert.strictEqual(d3.length, 1, 'tanpa grup kosong');
    assert.strictEqual(d3[0].querySelector('.tx-day-head span:last-child').textContent, '+Rp 124.000');

    // === invarian: angka lain tidak berubah ===
    w.document.querySelector('#tab-rincian [data-txf="all"]').click();
    assert.strictEqual(w.kasBal(w.kasLinked()).bal, 1472000 - 34000 + 124000 - 6000 - 90000, 'saldo realtime tidak berubah oleh tampilan');
    assert.strictEqual(t.errs.length, 0, 'tanpa galat render: ' + t.errs.join('|'));

    // nol transaksi -> tanpa grup
    P.tx = []; w.renderAll();
    assert.strictEqual(w.document.querySelectorAll('.tx-day-group').length, 0);
    assert(/Belum ada transaksi/.test(w.document.getElementById('recent-tx-groups').textContent));
  } finally { if (t.errs.length) console.log(t.errs.join('\n')); }
  console.log('OK dashboard_cards');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
