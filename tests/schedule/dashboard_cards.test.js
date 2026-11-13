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

    // === A: daftar tagihan identik dengan sumber, urutan sama ===
    const R = w.reminders(200);
    const src = R.late.concat(R.soon);
    const card = [...w.document.querySelectorAll('.card')].find((c) => /Jadwal tagihan/.test(c.textContent));
    assert(card, 'kartu jadwal ada');
    const rows = [...card.querySelectorAll('.bl')];
    assert.strictEqual(rows.length, Math.min(6, src.length), 'jumlah baris = min(6, sumber)');
    rows.forEach((el, i) => {
      const s = src[i];
      const bd = w.dayBadge(s.iso);
      assert(el.querySelector('.bl-main b').textContent === s.it.name, 'nama baris ' + i);
      assert(el.querySelector('.bl-badge b').textContent === bd.d, 'tanggal baris ' + i);
      assert(el.querySelector('.am b').textContent === w.rp(s.price), 'nominal baris ' + i);
      assert(el.querySelector('.bl-main .sub').textContent.includes(w.fmtCountdown(s.iso, w.__today, s.iso < w.__today)), 'hitung mundur baris ' + i);
    });
    assert(card.querySelector('.bl-badge.bl-now'), 'hari ini/besok pakai aksen');
    assert.strictEqual(card.querySelectorAll('.bl-badge.bl-now').length, 2, 'hari ini + besok');

    // footer = jumlah baris yang tampil
    const foot = card.querySelector('.bl-foot');
    const sum = src.slice(0, rows.length).reduce((x, r) => x + r.price, 0);
    assert(foot.textContent.includes('Total tagihan di atas'));
    assert(foot.querySelector('b').textContent === w.rp(sum), 'total footer = jumlah baris tampil');
    assert(!/Total tagihan/.test(card.querySelector('.sub.mb8').textContent), 'tidak duplikat di subjudul');

    // === B: grup harian ===
    const txCard = [...w.document.querySelectorAll('.card')].find((c) => /Transaksi terakhir/.test(c.textContent));
    assert(txCard, 'kartu transaksi ada');
    const days = [...txCard.querySelectorAll('.tx-day')];
    assert.deepStrictEqual(days.map((d) => d.querySelector('.tx-dh span').textContent), ['Hari ini', 'Kemarin', '10 Nov 2026']);
    assert.strictEqual(days[0].querySelectorAll('.tx-row').length, 2);
    const net = days[0].querySelector('.tx-dh b');
    assert(net.textContent === '+ Rp 90.000', 'total bersih hari ini: ' + net.textContent);
    assert(net.classList.contains('kin'));
    assert(days[1].querySelector('.tx-dh b').textContent === '− Rp 6.000', 'hari minus');
    assert(days[1].querySelector('.tx-dh b').classList.contains('neg'));

    // baris: chip inisial, catatan, kategori, nominal bertanda
    const r0 = days[0].querySelectorAll('.tx-row')[0];
    assert.strictEqual(r0.querySelector('.tx-av').textContent, 'BB');
    assert.strictEqual(r0.querySelector('.tx-note').textContent, 'Belanja bulanan');
    assert.strictEqual(r0.querySelector('.tx-cat').textContent, 'Belanja');
    assert.strictEqual(r0.querySelector('.tx-amt').textContent, '−' + w.rp(34000));
    assert(r0.querySelector('.tx-amt').classList.contains('neg'));
    const r1 = days[0].querySelectorAll('.tx-row')[1];
    assert(r1.querySelector('.tx-amt').textContent.startsWith('+'));
    assert(r1.querySelector('.tx-amt').classList.contains('kin'));
    // tanpa kategori -> fallback netral
    const r2 = days[1].querySelector('.tx-row');
    assert.strictEqual(r2.querySelector('.tx-cat').textContent, 'Tanpa kategori');
    assert.strictEqual(r2.querySelector('.tx-av').textContent, 'TK', 'inisial dari label fallback');
    assert.strictEqual(r2.querySelector('.tx-av').style.color, 'var(--mut)');
    // title untuk ellipsis
    assert.strictEqual(r0.querySelector('.tx-note').getAttribute('title'), 'Belanja bulanan');

    // toggle Keluar: hanya baris keluar, total harian ikut
    w.txDir = '-'; w.renderAll();
    const tx2 = [...w.document.querySelectorAll('.card')].find((c) => /Transaksi terakhir/.test(c.textContent));
    const d2 = [...tx2.querySelectorAll('.tx-day')];
    assert.deepStrictEqual(d2.map((d) => d.querySelector('.tx-dh span').textContent), ['Hari ini', 'Kemarin', '10 Nov 2026']);
    assert.strictEqual(d2[0].querySelectorAll('.tx-row').length, 1);
    assert.strictEqual(d2[0].querySelector('.tx-dh b').textContent, '− Rp 34.000', 'total ikut toggle');
    // toggle Masuk: hari tanpa pemasukan hilang, tidak ada grup kosong
    w.txDir = '+'; w.renderAll();
    const tx3 = [...w.document.querySelectorAll('.card')].find((c) => /Transaksi terakhir/.test(c.textContent));
    const d3 = [...tx3.querySelectorAll('.tx-day')];
    assert.strictEqual(d3.length, 1, 'tanpa grup kosong');
    assert.strictEqual(d3[0].querySelector('.tx-dh b').textContent, '+ Rp 124.000');

    // === invarian: angka lain tidak berubah ===
    w.txDir = 'all'; w.renderAll();
    assert.strictEqual(w.kasBal(w.kasLinked()).bal, 1472000 - 34000 + 124000 - 6000 - 90000, 'saldo realtime tidak berubah oleh tampilan');
    assert.strictEqual(t.errs.length, 0, 'tanpa galat render: ' + t.errs.join('|'));

    // nol transaksi -> tanpa grup
    P.tx = []; w.renderAll();
    assert.strictEqual(w.document.querySelectorAll('.tx-day').length, 0);
    assert(/Belum ada transaksi/.test($('v-rincian').textContent));
  } finally { if (t.errs.length) console.log(t.errs.join('\n')); }
  console.log('OK dashboard_cards');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
