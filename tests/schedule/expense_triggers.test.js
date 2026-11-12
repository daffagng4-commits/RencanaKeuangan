const assert=require('assert');
const {boot}=require('./ui.js');
(async()=>{const t=boot();await t.ready();const {w}=t;try{
  assert.strictEqual(w.normalisasiNamaItem('saham lokal. UNTUK DESEMBER, beli 2lot bbri 2660 x 2'),'Saham Lokal 40%');
  for(const raw of ['xetf','etfx','éetf','etf_foo','Hutang Mamah','Mamah Shopee','Top up saldo emoney','Beli Godzilla','beli token ai']) assert.strictEqual(w.normalisasiNamaItem(raw),raw);
  assert.strictEqual(w.normalisasiNamaItem('  beli   ETF! '),'ETF 60%');
  assert.strictEqual(w.normalisasiNamaItem('BTC dan bbri'),'Saham Lokal 40%');
  const names=['ETF','Saham Lokal 40%','saham lokal. UNTUK DESEMBER, beli 2lot bbri 2660 x 2','BTC','Torbox','BPJS (lunas)','BPJS','Warp (lunas)','Warp','Kuota','Vidio','JKT48'];
  const amounts=[4900000,1170000,530000,1000000,500000,200000,100000,20000,10000,200000,100000,266500];
  const entries=names.map((note,i)=>({note,amt:amounts[i],t:'-',cat:i===6?'Kesehatan':'Tagihan',d:i===0?'2026-11-01':'2026-12-01'}));
  // Fixture sintetis, bukan pembacaan data pribadi.
  entries.push({note:'Item besar',amt:1961500,t:'-',cat:'Tagihan',d:'2026-11-02'},
    {note:'Item besar lunas',amt:438500,t:'-',cat:'Tagihan',d:'2026-12-02'});
  w.switchYear(2026);w.expenseMonth='all';
  const original=JSON.stringify(entries),C={entries};
  const el=w.document.createElement('div');el.innerHTML=w.topExpensesCard(C);
  const saham=[...el.querySelectorAll('.expense-row')].find(r=>r.querySelector('.expense-name').textContent==='Saham Lokal 40%');
  assert(saham.getAttribute('aria-label').includes('Rp 1.700.000'));
  const rest=el.querySelector('.rest .expense-detail').textContent;
  assert(rest.includes('BPJS'));assert(rest.includes('Warp'));assert(!rest.includes('(lunas)'));
  assert.strictEqual(JSON.stringify(entries),original);
  const audit=w.groupExpenseItems(entries);
  assert.strictEqual(audit.rows.reduce((s,r)=>s+r.v,0),11396500);
  assert.strictEqual(audit.rows.reduce((s,r)=>s+(r.byMonth[11]||0),0),6861500);
  assert.strictEqual(audit.rows.reduce((s,r)=>s+(r.byMonth[12]||0),0),4535000);
  assert.strictEqual(audit.rows.find(r=>r.name==='BPJS').v,300000);
  assert.strictEqual(audit.rows.find(r=>r.name==='Warp').v,30000);
  assert(rest.includes('BPJS '+w.rp(300000)));
  assert(rest.includes('Warp '+w.rp(30000)));
  assert.strictEqual(audit.conflicts.length,0);
  assert.deepStrictEqual(Array.from(audit.unmatched),['Item besar','Item besar lunas']);
  assert(audit.multipleCategories.some(r=>r.name==='BPJS'));
  assert.strictEqual(w.groupExpenseItems([{note:'BTC dan bbri',amt:1,cat:'A',d:'2026-11-01'}]).conflicts.length,1);
  console.log('OK expense triggers, rest canonical, totals, audit, immutable');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
