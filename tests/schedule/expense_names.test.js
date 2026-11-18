const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot(); await t.ready(); const { w } = t;
  try {
    assert.strictEqual(typeof w.normalisasiNamaItem, 'function', 'normalisasi tersedia');
    for (const [raw, name] of [
      ['ETF 60% (Dari total 2.75jt) (lunas)', 'ETF 60%'],
      ['Saham Lokal 40% (Dari total 2.75jt)', 'Saham Lokal 40%'],
      ['BTC (lunas)', 'BTC'], ['btc cicil des', 'BTC'],
      ['UNTUK DESEMBER, beli 2lot bbri 2660 x 2', 'Saham Lokal 40%'],
      ['Buku (edisi kedua)', 'Buku (edisi kedua)'], ['  Internet   rumah lunas ', 'Internet rumah']
    ]) assert.strictEqual(w.normalisasiNamaItem(raw), name, raw);
    w.switchYear(2026); w.S.items=[]; w.S.startMonth=10;
    w.kasLinked().tx = [
      {id:'a', d:'2026-11-01',t:'-',amt:4900000,cat:'Investasi',note:'ETF 60% (Dari total 2.75jt)'},
      {id:'b', d:'2026-12-01',t:'-',amt:1600000,cat:'Investasi',note:'ETF 60% (Dari total 2.75jt) (lunas)'},
      {id:'c', d:'2026-11-01',t:'-',amt:1961500,cat:'Investasi',note:'BTC (lunas)'},
      {id:'d', d:'2026-12-01',t:'-',amt:2935000,cat:'Investasi',note:'btc cicil des'}
    ];
    w.renderAll();
    const list = w.document.getElementById('top5-items-list');
    assert.strictEqual(list.querySelectorAll('.simple-row').length, 2);
    assert(list.querySelector('.simple-row-amt').textContent.includes('Rp 6.500.000'));
    assert.strictEqual(w.cashPeriod(w.yearCash(), 'y').out, 11396500);
    w.S.startMonth = 0; w.S.smManual = true; w.__today = '2026-06-15';
    w.kasLinked().tx = Array.from({ length: 12 }, (_, i) => ({ id: 'm' + i, d: '2026-' + String(i + 1).padStart(2, '0') + '-01', t: '-', amt: 100, cat: 'Tagihan', note: 'Internet' }));
    w.renderAll();
    assert.strictEqual(w.document.querySelectorAll('#card-where-money [data-where-period]').length, 3, 'Minggu/Bulan/Tahun');
    w.document.querySelector('#card-where-money [data-where-period="m"]').click();
    const select = w.document.getElementById('where-month-select');
    assert(select, 'pemilih bulan'); assert.strictEqual(select.options.length, 12);
    assert.strictEqual(select.value, '5', 'bulan berjalan (Juni = idx 5) dipilih');
    select.value = '11'; select.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert(w.document.getElementById('top5-total-badge').textContent.includes('Rp 100'));
    w.S.items = [
      { id: 'one', name: 'BTC', price: 100, n: 1, unit: 'sekali', start: '2026-12-20', cat: 'Investasi', ch: [] },
      { id: 'two', name: 'BTC', price: 200, n: 1, unit: 'sekali', start: '2026-12-20', cat: 'Investasi', ch: [] }
    ];
    w.S.real = { 'one|2026-12-20': { tx: 'linked' } }; w.S.paid = { 'one|2026-12-20': true };
    w.kasLinked().tx = [
      { id: 'linked', d: '2026-12-20', t: '-', amt: 100, cat: 'Investasi', note: 'Pembayaran bebas' },
      { id: 'free', d: '2026-12-01', t: '-', amt: 300, cat: 'Investasi', note: 'btc cicil des' }
    ];
    w.document.querySelector('#card-where-money [data-where-period="y"]').click();
    w.renderAll();
    assert.strictEqual(w.yearCash().entries.find(e => e.note === 'Pembayaran bebas').itemId, 'one');
    const identityRows = w.document.querySelectorAll('#top5-items-list .simple-row');
    assert.strictEqual(identityRows.length, 2, 'trigger menggabung BTC lintas identitas; nama mentah bebas tetap fallback');
    assert.strictEqual(w.cashPeriod(w.yearCash(), 'y').out, 600, 'tautan tidak dihitung ganda');
    assert.strictEqual(t.errs.length, 0);
    console.log('OK expense_names + 12 months + linked identities');
  } finally { w.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
