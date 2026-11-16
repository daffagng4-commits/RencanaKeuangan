// Kartu saldo: jatah jajan per bulan (bukan "Aman dipakai hari ini"), sensor privasi, pie + kategori, dan label aksesibilitas.
const assert=require('assert');
const {boot}=require('./ui.js');
(async()=>{
 const t=boot(); await t.ready(); const {w,$,click,errs}=t;
 const hero=()=>$('tab-rincian').querySelector('.stack > .card');
 const txt=()=>hero().textContent.replace(/\s+/g,' ');
 w.__today='2026-11-08';
 w.switchYear(2026);
 w.S.adj=[]; w.S.startMonth=10; w.S.saldo=5000000;
 w.S.items=[
  {id:'a',name:'Listrik',price:200000,n:1,unit:'sekali',start:'2026-11-20',cat:'Listrik',ch:[]},
  {id:'b',name:'Internet, Rumah',price:300000,n:1,unit:'sekali',start:'2026-11-30',cat:'Internet',ch:[]},
  {id:'c',name:'Telat',price:100000,n:1,unit:'sekali',start:'2026-11-02',ch:[]},
  {id:'d',name:'Lunas',price:50000,n:1,unit:'sekali',start:'2026-11-25',ch:[]}];
 w.S.paid={'d|2026-11-25':1}; w.S.skip={};
 const P=w.kasLinked(); P.tx=[{id:'g',d:'2026-11-01',t:'+',amt:1000000,cat:'Gaji',note:''}];
 w.renderAll();
 console.log('--- Kasus 1 (tahun berjalan, bulan saldo = Nov) ---'); console.log(txt());
 assert(/Jatah jajan harian/.test(txt()),'label jatah jajan harian ada');
 assert(!/Aman dipakai hari ini/.test(txt()),'tanpa "Aman dipakai hari ini"');
 assert(/Kondisi Kas Realtime/.test(txt())&&/Sisa saldo akhir Des 2026/.test(txt()),'dua saldo ada');
 assert(hero().querySelector('.grid-4 .metric-tile'),'statistik dalam grid 4 kolom');
 assert(hero().querySelector('#rincian-saldo-now.hero-amount'),'saldo realtime dibesarkan');
 assert(hero().querySelector('#metric-end-bal'),'sisa saldo akhir di kartu saldo');
 assert($('tab-rincian').querySelector('#svg-jar-main .jar-band'),'100% Jar berisi pita item');
 assert($('tab-rincian').querySelector('#where-cat-list .simple-row'),'daftar kategori ada');
 assert($('tab-rincian').querySelectorAll('#card-where-money [data-where-dir]').length===2,'toggle masuk/keluar kategori');
 const dots=[...$('tab-rincian').querySelectorAll('#where-cat-list .simple-row-bar i')].map(x=>x.style.background);
 assert(dots.length>1,'warna tiap kategori terisi');
 assert($('tab-rincian').querySelectorAll('#card-where-money [data-where-period]').length===3,'tab periode kategori');
 console.log('--- Kasus 2 (saldo kurang) ---'); P.tx=[]; w.S.saldo=400000; w.renderAll(); console.log(txt());
 assert(/Defisit|minus/i.test(txt()) && /crimson/.test($('metric-end-bal').getAttribute('style')||''),'merah & saldo minus');
 assert(/s\/d 30 Nov 2026/.test($('metric-daily-lbl').textContent),'batas jatah harian menunjuk ke tanggal sebelum defisit');
 console.log('--- Kasus 3 (tahun lain) ---'); w.S.saldo=5000000; w.S.startMonth=0; w.switchYear(2027); w.renderAll(); console.log(txt().slice(0,200));
 assert(/Jatah jajan harian/.test(txt())&&/Kondisi Kas Realtime/.test(txt()),'tetap jatah + saldo realtime');
 w.switchYear(2026); w.S.startMonth=10; w.S.saldo=5000000;
 P.tx=[{id:'g2',d:'2026-11-01',t:'+',amt:1000000,cat:'Gaji',note:''}];
 w.renderAll();
 click($('btn-privacy'));
 const cs=el=>w.getComputedStyle(el).filter;
 const stat=hero().querySelector('#metric-end-bal.pv');
 const hmBal=$('rincian-saldo-now');
 const catVal=$('tab-rincian').querySelector('#where-cat-list .simple-row-amt.pv');
 const rincianTable=$('monthly-flow-tbody').querySelector('td.pv');
 assert(stat&&hmBal&&catVal&&rincianTable,'semua elemen privasi .pv ada');
 assert(/blur/.test(cs(hero().querySelector('#metric-daily-val'))),'jatah disensor');
 assert(/blur/.test(cs(stat)),'statistik disensor');
 assert(/blur/.test(cs(hmBal)),'saldo realtime disensor');
 assert(/blur/.test(cs(catVal)),'pengeluaran kategori disensor');
 assert(/blur/.test(cs(rincianTable)),'rincian arus kas disensor');
 click($('btn-privacy'));
 // tab periode menyinkronkan jar dan daftar kategori
 const where=$('card-where-money');
 const subBefore=$('where-sub-lbl').textContent;
 click(where.querySelector('[data-where-period="w"]'));
 const subAfter=$('where-sub-lbl').textContent;
 assert(subAfter!==subBefore,'tab 7 hari mengubah data kategori');
 click(where.querySelector('[data-where-period="y"]'));
 click(where.querySelector('[data-where-dir="in"]'));
 assert.strictEqual(where.querySelector('[data-where-dir="in"]').getAttribute('aria-pressed'),'true','toggle pemasukan aktif');
 assert(/Gaji/.test($('where-cat-list').textContent),'kategori pemasukan muncul di daftar');
 assert(/%/.test($('where-cat-list').querySelector('.simple-row-pct').textContent),'persen kategori terisi');
 click(where.querySelector('[data-where-dir="out"]'));
 // akun bulat hanya di sidebar (#acct-m dihapus sesuai revisi)
 assert($('acct') && $('sb-ini') && !$('acct-m'),'tombol akun bulat tersedia di sidebar tanpa tombol D di topbar');
 assert(!$('lgb'),'tombol Masuk lama dihapus');
 assert(!w.document.querySelector('header.topbar #bk'),'impor/ekspor tidak di topbar');
 assert(/2026 · Nov · Rp 5\.000\.000/.test($('yr-sum').textContent),'ringkasan tahun/bulan/saldo di modal');
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
 const m=w.document.querySelectorAll('.modal, .modal-backdrop'); const ok=[...m].every(x=>x.getAttribute('role')==='dialog'&&x.getAttribute('aria-labelledby'));
 assert(ok,'semua modal ber-role dialog dan aria-labelledby');
 assert.strictEqual(errs.length,0,'tidak ada galat JavaScript: '+errs.slice(0,2));
 console.log('Semua pengecekan saldo_hero lulus');
 process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1)});
