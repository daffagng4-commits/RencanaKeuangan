const assert = require('assert');
const { boot } = require('./ui.js');
(async () => {
  const t = boot(); await t.ready();
  const { w, $, click } = t;
  try {
    w.switchYear(2026); w.S.startMonth = 10; w.S.items = []; w.S.adj = []; w.S.paid = {}; w.S.skip = {};
    w.kasLinked().tx = [
      { id:'a', d:'2026-11-01', t:'-', amt:2900000, cat:'Investasi', note:'ETF' },
      { id:'b', d:'2026-12-01', t:'-', amt:2000000, cat:'Investasi', note:'ETF' },
      ...[1500000,1000000,500000,400000,300000,261500].map((amt,i)=>({id:'n'+i,d:'2026-11-02',t:'-',amt,cat:'Tagihan',note:'Item '+i})),
      { id:'d', d:'2026-12-02', t:'-', amt:2535000, cat:'Investasi', note:'Saham' },
      { id:'adj', d:'2026-12-02', t:'-', amt:2500000, cat:'Penyesuaian saldo', note:'Koreksi' }
    ];
    w.renderAll();
    let card = $('card-where-money');
    assert(card, 'kartu Ke Mana Uangnya Pergi terpasang');
    assert($('top5-total-badge').textContent.includes('Rp 11.396.500'));
    assert.strictEqual($('top5-items-list').querySelectorAll('.simple-row').length, 8, 'tampilkan hingga 8 item teratas');
    assert.strictEqual($('top5-items-list').querySelector('.simple-row-name').textContent, 'ETF 60%');
    assert.strictEqual($('top5-items-list').querySelector('.simple-row-amt').textContent.trim(), 'Rp 4.900.000');
    assert($('top5-items-list').querySelector('.simple-row-bar i').style.width.length > 0);
    click(card.querySelector('[data-where-period="m"]'));
    let month = $('where-month-select');
    month.value = '10'; month.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert($('top5-total-badge').textContent.includes('Rp 6.861.500'), 'Nov total: ' + $('top5-total-badge').textContent);
    month.value = '11'; month.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert($('top5-total-badge').textContent.includes('Rp 4.535.000'), 'Des total: ' + $('top5-total-badge').textContent);
    w.kasLinked().tx = w.kasLinked().tx.filter(x => x.id !== 'adj');
    assert.strictEqual(w.cashPeriod(w.yearCash(), 'y').out, 11396500, 'total sama: Nov + Des');
    w.S.items = [{ id: 'bill', name: ' etf ', price: 100000, n: 1, unit: 'sekali', start: '2026-12-20', cat: 'Investasi', ch: [] }];
    click(card.querySelector('[data-where-period="y"]'));
    w.renderAll();
    assert($('top5-items-list').querySelector('.simple-row-amt').textContent.includes('Rp 5.000.000'), 'jadwal dan kas nama sama digabung tanpa membedakan kapital');
    assert.strictEqual(t.errs.length, 0, 'tanpa galat render');
    w.S.items = []; w.kasLinked().tx = []; w.renderAll();
    assert($('top5-items-list').textContent.includes('Belum ada data pada periode ini'));
    assert(card.textContent.includes('Porsi per Kategori'));
    console.log('OK top_expenses (fixture totals, grouping, periods, empty, category heading)');
  } finally { w.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
