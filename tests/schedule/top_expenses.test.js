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
    let card = $('v-rincian').querySelector('.expense-card');
    assert(card, 'placeholder diganti kartu item pengeluaran');
    assert(card.querySelector('.expense-total').textContent.includes('Rp 11.396.500'));
    assert.strictEqual(card.querySelectorAll('.expense-row:not(.rest)').length,5);
    assert.strictEqual(card.querySelector('.expense-name').textContent,'ETF');
    assert(card.querySelector('.expense-row').getAttribute('aria-label').includes('Rp 4.900.000'));
    assert(card.querySelector('.expense-detail').textContent.includes('Nov Rp 2.900.000 · Des Rp 2.000.000'));
    assert.strictEqual(card.querySelector('.expense-fill').style.background,w.catColor('Investasi'));
    assert.strictEqual(card.querySelector('.expense-fill').style.width,'100%');
    assert(card.querySelector('.rest'), 'sisa di luar lima teratas');
    click(card.querySelector('[data-expm="month"]'));
    let month = $('v-rincian').querySelector('[data-expmonth]');
    month.value='11'; month.dispatchEvent(new w.Event('change',{bubbles:true}));
    card = $('v-rincian').querySelector('.expense-card');
    assert(card.querySelector('.expense-total').textContent.includes('Rp 6.861.500'));
    month = card.querySelector('[data-expmonth]');
    month.value='12'; month.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert($('v-rincian').querySelector('.expense-total').textContent.includes('Rp 4.535.000'));
    w.kasLinked().tx = w.kasLinked().tx.filter(x=>x.id !== 'adj');
    assert.strictEqual(w.cashPeriod(w.yearCash(),'y').out,11396500,'total donut sama: Nov + Des');
    w.S.items = [{id:'bill',name:' etf ',price:100000,n:1,unit:'sekali',start:'2026-12-20',cat:'Investasi',ch:[]}];
    w.expenseMonth = 'all'; w.renderAll();
    assert($('v-rincian').querySelector('.expense-row').getAttribute('aria-label').includes('Rp 5.000.000'),'jadwal dan kas nama sama digabung tanpa membedakan kapital');
    assert.strictEqual(t.errs.length,0,'tanpa galat render');
    w.S.items = []; w.kasLinked().tx = []; w.renderAll();
    assert($('v-rincian').querySelector('.expense-card').textContent.includes('Belum ada pengeluaran'));
    assert.strictEqual($('v-rincian').querySelector('.insight h2').textContent,'Pengeluaran & pemasukan per kategori');
    assert(!$('v-rincian').querySelector('.insight-h3'));
    console.log('OK top_expenses (fixture totals, grouping, periods, empty, category heading)');
  } finally { w.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
