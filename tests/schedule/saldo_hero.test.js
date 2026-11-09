// Kartu saldo: jatah jajan per bulan (bukan "Aman dipakai hari ini"), sensor privasi, pie + kategori, dan label aksesibilitas.
const assert=require('assert');
const {boot}=require('./ui.js');
(async()=>{
 const t=boot(); await t.ready(); const {w,$,click,errs}=t;
 const hero=()=>$('v-rincian').querySelector('.hero');
 const txt=()=>hero().textContent.replace(/\s+/g,' ');
 w.__today='2026-11-08';
 w.switchYear(2026);
 w.S.adj=[]; w.S.startMonth=10; w.S.saldo=5000000;
 w.S.items=[
  {id:'a',name:'Listrik',price:200000,n:1,unit:'sekali',start:'2026-11-20',ch:[]},
  {id:'b',name:'Internet, Rumah',price:300000,n:1,unit:'sekali',start:'2026-11-30',ch:[]},
  {id:'c',name:'Telat',price:100000,n:1,unit:'sekali',start:'2026-11-02',ch:[]},
  {id:'d',name:'Lunas',price:50000,n:1,unit:'sekali',start:'2026-11-25',ch:[]}];
 w.S.paid={'d|2026-11-25':1}; w.S.skip={};
 const P=w.kasLinked(); P.tx=[{id:'g',d:'2026-11-01',t:'+',amt:1000000,cat:'Gaji',note:''}];
 w.renderAll();
 console.log('--- Kasus 1 (tahun berjalan, bulan saldo = Nov) ---'); console.log(txt());
 assert(/Jatah jajan per bulan/.test(txt()),'label jatah per bulan');
 assert(!/Aman dipakai hari ini/.test(txt()),'tanpa "Aman dipakai hari ini"');
 assert(!/Hanya menghitung sisa November/.test(txt()),'tanpa hint sisa bulan');
 assert(!/\/ hari/.test(txt()),'tanpa nominal per hari');
 assert(/Saldo Realtime/.test(txt())&&/Sisa saldo akhir Des 2026/.test(txt()),'dua saldo ada');
 assert(/Total pemasukan/.test(txt()),'total pemasukan ada');
 assert(!/Total pengeluaran/.test(txt()),'total pengeluaran dihapus');
 assert(hero().querySelectorAll('.hm').length===1,'satu kartu gabungan');
 assert($('v-rincian').querySelector('.flow-pie .pie'),'pie di samping arus saldo');
 assert($('v-rincian').querySelector('.cat-tabs'),'tab periode kategori');
 console.log('--- Kasus 2 (saldo kurang) ---'); P.tx=[]; w.S.saldo=400000; w.renderAll(); console.log(txt());
 assert(/kurang|Saldo habis/.test(txt())&&hero().querySelector('.big.neg'),'merah & saldo minus');
 assert(/—/.test(hero().querySelector('.big').textContent),'jatah kosong saat saldo akhir minus');
 console.log('--- Kasus 3 (tahun lain) ---'); w.S.saldo=5000000; w.S.startMonth=0; w.switchYear(2027); w.renderAll(); console.log(txt().slice(0,200));
 assert(/Jatah jajan per bulan/.test(txt())&&/Saldo Realtime/.test(txt()),'tetap jatah + saldo realtime');
 w.switchYear(2026); w.S.startMonth=10; w.S.saldo=5000000; w.renderAll();
 click($('btn-privacy'));
 const cs=el=>w.getComputedStyle(el).filter;
 const stat=hero().querySelector('.stats b.pv');
 const catVal=$('v-rincian').querySelector('.catrow b');
 const catPie=$('v-rincian').querySelector('.cat-pie .pv');
 console.log('privasi aktif -> .big:',cs(hero().querySelector('.big')),'| stat:',cs(stat),'| kategori:',cs(catVal),'| pusat donat:',cs(catPie));
 assert(/blur/.test(cs(hero().querySelector('.big'))),'jatah disensor');
 assert(/blur/.test(cs(stat)),'statistik disensor');
 assert(/blur/.test(cs(catVal)),'pengeluaran kategori disensor');
 assert(/blur/.test(cs(catPie)),'pusat donat disensor');
 click($('btn-privacy'));
 // akun bulat
 assert($('acct') && $('acct-ini').textContent==='?','tombol akun bulat default ?');
 assert(!$('lgb'),'tombol Masuk lama dihapus');
 assert(!w.document.querySelector('header #bk'),'impor/ekspor tidak di header');
 assert(/2026 · Nov · Rp 5\.000\.000/.test($('yr-sum').textContent),'ringkasan tahun/bulan/saldo di satu tombol');
 click($('yr-btn'));
 assert(!$('yr-panel').hidden && $('yr-btn').getAttribute('aria-expanded')==='true','panel kontrol terbuka');
 click($('yr-done'));
 assert($('yr-panel').hidden && $('yr-btn').getAttribute('aria-expanded')==='false','panel kontrol tertutup');
 // ICS
 let ics=''; w.exportFile=(n,c)=>{ics=c;};
 w.document.querySelector('[data-ex="ics"]').click();
 const ev=(ics.match(/BEGIN:VEVENT/g)||[]).length, al=(ics.match(/BEGIN:VALARM/g)||[]).length;
 console.log('--- ICS --- events',ev,'alarms',al,'| koma di nama di-escape:',/Internet\\, Rumah/.test(ics),'| baris pertama:',ics.split('\r\n')[0]);
 assert(ev>=3 && al===2*(ev-1),'2 alarm per tagihan belum lunas, 0 untuk yang lunas');
 assert(!/\n(?!\r)/.test(ics.replace(/\r\n/g,'')),'CRLF murni');
 const m=w.document.querySelectorAll('.modal'); const ok=[...m].every(x=>x.getAttribute('role')==='dialog'&&x.getAttribute('aria-labelledby'));
 console.log('modal dengan role+label:',m.length,ok);
 console.log('aria-label topbar:',['acct','btn-privacy','btn-notif','thm'].map(i=>$(i).getAttribute('aria-label')).join(' | '));
 assert(ok);
 assert.strictEqual(errs.length,0,'tidak ada galat JavaScript: '+errs.slice(0,2));
 console.log('Semua pengecekan saldo_hero lulus');
 process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1)});
