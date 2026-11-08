// Tahap 1: kartu saldo gabungan ("Aman dipakai hari ini"), sensor Mode Privasi, alarm .ics, dan label aksesibilitas.
const assert=require('assert');
const {boot}=require('./ui.js');
(async()=>{
 const t=boot(); await t.ready(); const {w,$,click,errs}=t;
 const hero=()=>$('v-rincian').querySelector('.hero');
 const txt=()=>hero().textContent.replace(/\s+/g,' ');
 w.__today='2026-11-08';
 w.switchYear(2026);
 w.S.startMonth=10; w.S.saldo=5000000;
 w.S.items=[
  {id:'a',name:'Listrik',price:200000,n:1,unit:'sekali',start:'2026-11-20',ch:[]},
  {id:'b',name:'Internet, Rumah',price:300000,n:1,unit:'sekali',start:'2026-11-30',ch:[]},
  {id:'c',name:'Telat',price:100000,n:1,unit:'sekali',start:'2026-11-02',ch:[]},
  {id:'d',name:'Lunas',price:50000,n:1,unit:'sekali',start:'2026-11-25',ch:[]}];
 w.S.paid={'d|2026-11-25':1}; w.S.skip={};
 const P=w.kasLinked(); P.tx=[];
 w.renderAll();
 console.log('--- Kasus 1 (tahun berjalan, bulan saldo = Nov) ---'); console.log(txt());
 const sf=w.amanHariIni(w.kasBase(P)+0-50000,10);   // lunas 50rb sudah mengurangi saldo realtime
 assert(/Aman dipakai hari ini/.test(txt()),'label aman');
 assert(/Saldo Realtime/.test(txt())&&/Sisa saldo akhir Des 2026/.test(txt()),'dua saldo ada');
 assert(/tagihan sampai akhir bulan \(Rp 600\.000\)/.test(txt()),'tagihan s/d akhir bulan = 600rb (telat+2 tagihan)');
 assert(/23 hari lagi/.test(txt()),'23 hari');
 assert(/\/ hari/.test(txt()),'per hari');
 assert(!/bukan bulan ini/.test(txt()),'tanpa hint');
 assert(!/Jatah jajan per hari/.test(txt()),'stat jatah/hari disembunyikan');
 assert(hero().querySelectorAll('.hm').length===1,'satu kartu gabungan');
 console.log('--- Kasus 2 (saldo kurang) ---'); w.S.saldo=400000; w.renderAll(); console.log(txt());
 assert(/kurang/.test(txt())&&hero().querySelector('.big.neg'),'merah & kurang');
 console.log('--- Kasus 3 (bulan saldo != bulan ini) ---'); w.S.saldo=5000000; w.S.startMonth=0; w.renderAll();
 assert(/bukan bulan ini/.test(txt()),'hint'); console.log(txt().slice(0,260));
 console.log('--- Kasus 4 (tahun lain) ---'); w.S.startMonth=10; w.switchYear(2027); w.renderAll(); console.log(txt().slice(0,200));
 assert(!/Aman dipakai/.test(txt())&&/Realtime/.test(txt()),'tanpa aman, tetap saldo realtime');
 // privasi mencakup kartu baru
 w.switchYear(2026); w.S.startMonth=10; w.S.saldo=5000000; w.renderAll();
 click($('btn-privacy'));
 const cs=el=>w.getComputedStyle(el).filter;
 console.log('privasi aktif -> .big blur:',cs(hero().querySelector('.big')),'| .hm-bal b:',cs(hero().querySelector('.hm-bal b')),'| sub:',cs(hero().querySelector('.sub.pv')));
 assert(/blur/.test(cs(hero().querySelector('.big')))&&/blur/.test(cs(hero().querySelector('.hm-bal b'))),'blur aktif');
 click($('btn-privacy'));
 // ICS
 let ics=''; w.exportFile=(n,c)=>{ics=c;};
 w.document.querySelector('[data-ex="ics"]').click();
 const ev=(ics.match(/BEGIN:VEVENT/g)||[]).length, al=(ics.match(/BEGIN:VALARM/g)||[]).length;
 console.log('--- ICS --- events',ev,'alarms',al,'| koma di nama di-escape:',/Internet\\, Rumah/.test(ics),'| baris pertama:',ics.split('\r\n')[0]);
 assert(ev>=3 && al===2*(ev-1),'2 alarm per tagihan belum lunas, 0 untuk yang lunas');
 assert(!/\n(?!\r)/.test(ics.replace(/\r\n/g,'')),'CRLF murni');
 // a11y
 const m=w.document.querySelectorAll('.modal'); const ok=[...m].every(x=>x.getAttribute('role')==='dialog'&&x.getAttribute('aria-labelledby'));
 console.log('modal dengan role+label:',m.length,ok);
 console.log('aria-label topbar:',['btn-privacy','btn-notif','pwa','thm'].map(i=>$(i).getAttribute('aria-label')).join(' | '));
 assert(ok);
 assert.strictEqual(errs.length,0,'tidak ada galat JavaScript: '+errs.slice(0,2));
 console.log('Semua pengecekan saldo_hero lulus');
 process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1)});
