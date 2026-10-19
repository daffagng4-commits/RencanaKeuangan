/**
 * Tes e2e (jsdom): Pengingat tagihan, pemasukan berulang, ubah beberapa tagihan, kategori, status lunas ikut pindah.
 * Jalankan: node tests/e2e/features.js [path/ke/index.html]   (bawaan: dist/index.html)
 */
const HTML_PATH = process.argv[2] || require('path').join(__dirname, '..', '..', 'dist', 'index.html');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(HTML_PATH,'utf8');
const errs=[];
const mk=(pre)=>new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,beforeParse(x){x.addEventListener('error',e=>errs.push(e.message));x.Element.prototype.scrollIntoView=()=>{};if(pre)x.localStorage.setItem('rencana-keuangan-v1',JSON.stringify(pre))}}).window;
let pass=0,fail=[];const ok=(c,m)=>c?pass++:fail.push(m);
const w=mk();const d=w.document,$=id=>d.getElementById(id);
const set=(id,v)=>{const e=$(id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));e.dispatchEvent(new w.Event('change',{bubbles:true}))};
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));const iso=t=>new Date(t).toISOString().slice(0,10);
const add=o=>{set('f-name',o.name);set('f-price',o.price);set('f-n',o.n||1);set('f-unit',o.unit||'bulan');set('f-start',o.start);if(o.cat!=null)set('f-cat',o.cat);click($('save'));return w.S.items[w.S.items.length-1]};
w.switchYear(2035);delete w.ALL.data[2027];set('saldo','10.000.000');
// ================= 1. PENGINGAT =================
w.__today='2035-06-10';
const T1=add({name:'T1',price:'200k',start:'2035-01-01'});
w.renderAll();
let r=w.reminders(7);
ok(r.late.map(x=>x.iso).join()==='2035-05-01,2035-06-01'&&r.older===4,'terlambat dalam jendela 45 hari = 1 Mei & 1 Jun; 4 lebih lama: '+r.late.map(x=>x.iso)+' older='+r.older);
ok(r.soon.length===0,'tidak ada yang jatuh tempo 7 hari ke depan');
ok(!$('rem').hidden&&/2 terlambat/.test($('rem').textContent.replace(/\u00a0/g,' '))&&/4 tagihan lama belum ditandai/.test($('rem').textContent.replace(/\u00a0/g,' ')),'banner: 2 terlambat + 4 tagihan lama (dipisah): '+$('rem').textContent);
ok(d.querySelector('button[data-pk="'+T1.id+'|2035-06-01"]').className.includes('late')&&!d.querySelector('button[data-pk="'+T1.id+'|2035-04-01"]').className.includes('late'),'chip Jun terlambat (merah), chip Apr (lebih lama dari jendela) tidak');
ok(/terlambat/.test(d.querySelector('button[data-pk="'+T1.id+'|2035-06-01"]').title),'tooltip chip menyebut terlambat');
click($('rem'));ok(!$('rm').hidden&&/Terlambat/.test($('rml').textContent)&&/lebih lama dari 45 hari/.test($('rml').textContent),'jendela pengingat terbuka dgn bagian Terlambat + catatan lebih lama');
// lunas satu
click($('rml').querySelector('button[data-ra="paid"]'));ok(w.S.paid[T1.id+'|2035-05-01']===1&&w.reminders(7).late.length===1,'Lunas dari pengingat mengubah status & daftar');
click($('rml').querySelector('button[data-ra="skip"]'));ok(w.S.skip[T1.id+'|2035-06-01']===1&&w.reminders(7).late.length===0,'Lewati dari pengingat');
// horizon
set('rmh','30');ok(w.reminders(30).soon.map(x=>x.iso).join()==='2035-07-01'&&JSON.parse(w.localStorage.getItem('rk-ui')).hz===30,'horizon 30 hari: 1 Jul muncul; pilihan tersimpan');
ok(/1 dalam 30 hari/.test($('rem').textContent.replace(/\s+/g,' ')),'banner mengikuti horizon: '+$('rem').textContent);
set('rmh','7');
// massal + urungkan
const beforePaid=JSON.stringify(w.S.paid);
const bulk=$('rmb');ok(!bulk.hidden,'tombol massal tampil (masih ada yang lebih lama)');click(bulk);ok(w.S.paid[T1.id+'|2035-01-01']!==1,'klik pertama hanya meminta konfirmasi');click(bulk);
ok([1,2,3,4].every(m=>w.S.paid[T1.id+'|2035-0'+m+'-01']===1)&&!w.S.paid[T1.id+'|2035-07-01']&&w.reminders(7).late.length===0&&w.reminders(7).older===0,'massal: semua yang sudah lewat jadi lunas, yang akan datang tidak');
click($('ttu'));ok(JSON.stringify(w.S.paid)===beforePaid,'Urungkan mengembalikan status semula');
// banner hilang bila bersih
w.markPastPaid();w.renderAll();ok($('rem').hidden,'banner tersembunyi bila tidak ada yang perlu perhatian');
click($('rmc'));
// lintas tahun
w.__today='2035-01-05';w.switchYear(2034);const T0=add({name:'Lama',price:'50k',start:'2034-12-20'});w.switchYear(2035);w.renderAll();
r=w.reminders(7);ok(r.late.some(x=>x.year===2034&&x.iso==='2034-12-20'),'tagihan tahun lalu yang belum ditandai ikut muncul (lintas tahun)');
click($('rem'));click($('rml').querySelector('button[data-ra="paid"][data-ry="2034"]'));ok(w.ALL.data[2034].paid[T0.id+'|2034-12-20']===1,'status diubah di data TAHUN yang benar (2034)');click($('rmc'));
// bulan saldo menyaring
w.__today='2035-06-10';
// ================= 2. PEMASUKAN BERULANG =================
w.S.adj=[];w.S.skip={};w.S.paid={};w.S.items=[];w.S.startMonth=0;w.S.saldo=0;
const A=(o)=>Object.assign({id:Math.random(),t:'+',amt:1000,note:'',m:null,rep:null,at:''},o);
w.S.adj=[A({m:1,rep:{n:1,cnt:0}})];let c=w.calc();
ok(c.rows[0].ad===0&&c.rows.slice(1).every(x=>x.ad===1000)&&c.adjLate===11000&&c.adjIn===0,'tiap bulan mulai Feb: Feb-Des +1000 (11x)');
w.S.adj=[A({m:0,rep:{n:3,cnt:0}})];c=w.calc();ok(c.adjIn===1000&&c.rows[3].ad===1000&&c.rows[6].ad===1000&&c.rows[9].ad===1000&&c.rows[1].ad===0,'tiap 3 bulan mulai Jan: Jan digabung ke saldo awal, lalu Apr/Jul/Okt');
w.S.adj=[A({m:2,rep:{n:1,cnt:4}})];c=w.calc();ok(c.adjLate+c.adjIn===4000&&[2,3,4,5].every(m=>c.rows[m].ad===1000)&&c.rows[6].ad===0,'berhenti setelah 4 kali: Mar-Jun saja');
w.S.adj=[A({t:'-',m:0,rep:{n:1,cnt:0}})];c=w.calc();ok(c.end===-12000,'pengurangan berulang 12x');
// via UI
w.S.adj=[];click($('adjb'));ok($('aw').disabled===false&&$('arw').hidden,'jendela dibuka: berulang mati secara bawaan');
set('aa','5.000.000');set('ar','1');ok($('aw').disabled&&$('aw').value==='month'&&!$('arw').hidden,'memilih Ulangi: mulai-bulan wajib & isian "berhenti" muncul');
set('amo','2');ok(/12|10/.test($('apv').textContent)&&/tiap bulan mulai Mar/.test($('apv').textContent),'pratinjau berulang: '+$('apv').textContent.replace(/\s+/g,' '));
set('an','Gaji');click($('aps'));const g=w.S.adj[0];ok(g&&g.rep&&g.rep.n===1&&g.m===2&&g.amt===5000000,'tersimpan sebagai berulang tiap bulan mulai Mar');
click($('adjb'));ok(/tiap bulan mulai Mar/.test($('ahl').textContent),'riwayat menampilkan jadwal berulang');click($('acl'));
c=w.calc();ok(c.adjLate+c.adjIn===50000000,'10 bulan x 5 jt (Mar-Des) = 50 jt');
// bawa ke tahun berikutnya
w.S.adj=[A({id:1,m:2,rep:{n:1,cnt:20},amt:700}),A({id:2,m:2,rep:{n:1,cnt:8},amt:800}),A({id:3,m:2,rep:{n:12,cnt:0},amt:900}),A({id:4,m:4,amt:55})];
w.S.items=[{id:77,name:'X',price:1,n:1,unit:'bulan',start:'2035-01-01',end:'',cnt:0,cat:'',ch:[]}];w.save();
w.switchYear(2036);set('cy','2035');click($('cyb'));
const m36=w.S.adj.map(a=>a.amt+':'+a.m+':'+a.rep.cnt+':'+a.rep.n).join(' | ');
ok(w.S.adj.length===2&&w.S.adj.some(a=>a.amt===700&&a.m===0&&a.rep.cnt===10)&&w.S.adj.some(a=>a.amt===900&&a.m===2&&a.rep.n===12),'bawa: sisa jumlah kali dihitung (20-10=10), tahunan tetap Mar; yg sudah habis (8x) & sekali tidak dibawa: '+m36);
const nA=w.S.adj.length;w.S.items=[];click($('cyb'));ok(w.S.adj.length===nA,'bawa dua kali tidak menggandakan penyesuaian berulang');
w.switchYear(2035);
// sanitasi
const nn=w.norm({year:2035,data:{2035:{saldo:0,items:[],adj:[{t:'+',amt:5,m:1,rep:{n:0}},{t:'+',amt:5,rep:{n:2}},{t:'+',amt:5,m:3,rep:{n:2,cnt:'x'}}]}}});
ok(nn.data[2035].adj[0].rep===null&&nn.data[2035].adj[1].rep===null&&nn.data[2035].adj[2].rep.n===2&&nn.data[2035].adj[2].rep.cnt===0,'norm membuang pengulangan tak valid');
// ================= 3. UBAH BEBERAPA TAGIHAN =================
w.S.adj=[];w.S.items=[];w.S.paid={};w.S.skip={};
const M=add({name:'M',price:'100k',start:'2035-01-01'});w.renderAll();
const chip=k=>d.querySelector('button[data-pk="'+M.id+'|'+k+'"]');
click(chip('2035-08-01'));ok(!$('cm').hidden&&/Ubah beberapa tagihan/.test($('cm').textContent),'menu chip punya "Ubah beberapa tagihan"');
click($('cm').querySelector('button[data-st="range"]'));ok(!$('sk').hidden&&$('skf').value==='2035-08-01'&&$('skto').value==='2035-08-01','modal terbuka dgn tanggal chip');
set('skto','2035-10-01');ok(/3 tagihan: 1 Agu, 1 Sep, 1 Okt/.test($('skp').textContent)&&/Rp 300\.000/.test($('skp').textContent),'pratinjau: '+$('skp').textContent);
click($('sks'));ok(['08','09','10'].every(m=>w.S.skip[M.id+'|2035-'+m+'-01']===1)&&$('sk').hidden,'Agu-Okt dilewati sekaligus');
ok(w.calc().rows[7].sp===0&&w.calc().rows[10].sp===100000,'pengeluaran Agu-Okt 0, Nov tetap');
click($('ttu'));ok(Object.keys(w.S.skip).length===0,'Urungkan mengembalikan');
// lunas rentang, lalu belum
click(chip('2035-02-01'));click($('cm').querySelector('button[data-st="range"]'));set('skto','2035-04-01');set('ska','paid');click($('sks'));
ok(['02','03','04'].every(m=>w.S.paid[M.id+'|2035-'+m+'-01']===1),'rentang ditandai lunas');
click(chip('2035-02-01'));click($('cm').querySelector('button[data-st="range"]'));set('skto','2035-03-01');set('ska','none');click($('sks'));ok(!w.S.paid[M.id+'|2035-02-01']&&!w.S.paid[M.id+'|2035-03-01']&&w.S.paid[M.id+'|2035-04-01']===1,'rentang dikembalikan ke belum dibayar (sebagian)');
// lewati menimpa lunas
click(chip('2035-04-01'));click($('cm').querySelector('button[data-st="range"]'));set('ska','skip');click($('sks'));ok(w.S.skip[M.id+'|2035-04-01']===1&&!w.S.paid[M.id+'|2035-04-01'],'lewati menggantikan lunas (satu status per tagihan)');
// validasi
click(chip('2035-06-01'));click($('cm').querySelector('button[data-st="range"]'));set('skto','2035-05-01');click($('sks'));ok(/Isi rentang/.test($('ske').textContent)&&!$('sk').hidden,'sampai < dari ditolak');
set('skf','2036-01-01');set('skto','2036-02-01');click($('sks'));ok(/Tidak ada tagihan/.test($('ske').textContent),'rentang tanpa tagihan ditolak');click($('skc'));
// ================= 4. KATEGORI =================
w.S.items=[];w.S.paid={};w.S.skip={};
click($('rmc'));
const C1=add({name:'Netflix',price:'100k',start:'2035-01-01',cat:'Langganan'});
const C2=add({name:'Saham',price:'300k',start:'2035-01-01',cat:'Investasi'});
const C3=add({name:'Lain',price:'100k',start:'2035-01-01'});
c=w.calc();ok(c.byCat['Langganan']===1200000&&c.byCat['Investasi']===3600000&&c.byCat['']===1200000&&Object.values(c.byCat).reduce((a,b)=>a+b,0)===c.total,'total per kategori cocok dgn total pengeluaran');
const rc=$('v-rincian').innerHTML;ok(/Pengeluaran per kategori/.test(rc)&&/Investasi/.test(rc)&&/Tanpa kategori/.test(rc)&&/60%/.test(rc),'grafik kategori tampil (Investasi 60%)');
ok(rc.indexOf('Investasi')<rc.indexOf('Langganan'),'diurutkan dari terbesar');
const opts=[...$('catlist').options].map(o=>o.value);ok(opts.includes('Langganan')&&opts.includes('Investasi')&&opts.includes('Kesehatan'),'saran kategori: bawaan + yang dipakai');
add({name:'K',price:'10k',start:'2035-01-01',cat:'Hobi Baru'});ok([...$('catlist').options].some(o=>o.value==='Hobi Baru'),'kategori baru ikut menjadi saran');
click(d.querySelector('button[data-ed="'+C3.id+'"]'));ok($('f-cat').value==='','form ubah memuat kategori');set('f-cat','Kesehatan');click($('save'));ok(w.S.items.find(i=>i.id===C3.id).cat==='Kesehatan','kategori diubah lewat form ubah');
ok(/Kesehatan/.test($('list').textContent),'kategori tampil di daftar item');
w.S.skip[C2.id+'|2035-01-01']=1;ok(w.calc().byCat['Investasi']===3300000,'tagihan dilewati tidak masuk kategori');w.S.skip={};
let csv='';w.exportFile=(n,dd)=>{csv=dd};w.doExport('items');ok(/Kategori/.test(csv.split('\n')[0])&&/Netflix;100000;1;bulan;2035-01-01;;;Langganan/.test(csv),'CSV item punya kolom Kategori');
w.S.items=[];set('im','merge');w.doImport('Nama;Harga;Tiap;Satuan;Mulai;Sampai;Jumlah kali;Kategori\nSpotify;60000;1;bulan;2035-01-01;;;Langganan\nTanpa;1000;1;bulan;2035-01-01;;;\n');
ok(w.S.items.find(i=>i.name==='Spotify').cat==='Langganan'&&w.S.items.find(i=>i.name==='Tanpa').cat==='','impor CSV membawa kategori');
// bawa jadwal membawa kategori
w.save();w.switchYear(2037);w.S.items=[];set('cy','2035');click($('cyb'));ok(w.S.items.find(i=>i.name==='Spotify')&&w.S.items.find(i=>i.name==='Spotify').cat==='Langganan','bawa jadwal membawa kategori');w.switchYear(2035);
// belum ada kategori -> petunjuk
w.S.items=[];add({name:'Z',price:'5k',start:'2035-01-01'});ok(/Belum ada kategori/.test($('v-rincian').textContent),'tanpa kategori: kartu petunjuk (bukan grafik kosong)');
// data lama tanpa cat aman + seed berkategori
const old={saldo:1,year:2027,items:[{id:1,name:'A',price:100,n:1,unit:'bulan',start:'2027-01-01'}]};const w2=mk(old);ok(w2.S.items[0].cat==='','data lama tanpa kategori aman');
const w3=mk();ok(w3.S.items.find(i=>i.name==='BPJS').cat==='Kesehatan','data contoh punya kategori');
// ================= 5. STATUS IKUT PINDAH =================
w.S.items=[];w.S.paid={};w.S.skip={};w.S.adj=[];
const R1=add({name:'R1',price:'100k',start:'2035-01-01'});
w.S.paid[R1.id+'|2035-03-01']=1;w.S.skip[R1.id+'|2035-04-01']=1;w.S.paid[R1.id+'|2035-01-01']=1;
click(d.querySelector('button[data-ed="'+R1.id+'"]'));set('f-start','2035-01-15');click($('save'));
ok(w.S.paid[R1.id+'|2035-03-15']===1&&w.S.skip[R1.id+'|2035-04-15']===1&&w.S.paid[R1.id+'|2035-01-15']===1,'ubah tanggal mulai (1 -> 15): status lunas/lewati ikut pindah');
ok(!w.S.paid[R1.id+'|2035-03-01']&&!w.S.skip[R1.id+'|2035-04-01'],'kunci tanggal lama dibersihkan');
// geser lewat modal
const R2=add({name:'R2',price:'100k',start:'2035-01-01'});w.S.paid[R2.id+'|2035-04-01']=1;w.S.paid[R2.id+'|2035-02-01']=1;
w.openPm(R2.id);click($('psc').querySelector('button[data-sc="geser"]'));set('pdt','2035-03-20');click($('pps'));
ok(w.S.paid[R2.id+'|2035-02-01']===1&&w.S.paid[R2.id+'|2035-04-20']===1&&!w.S.paid[R2.id+'|2035-04-01'],'geser dari 20 Mar: Feb tetap lunas, 1 Apr -> 20 Apr');
w.openPm(R2.id);click(d.querySelector('#phl button[data-pdel="0"]'));ok(w.S.paid[R2.id+'|2035-04-01']===1&&!w.S.paid[R2.id+'|2035-04-20'],'hapus perubahan: status kembali ke tanggal asli');click($('pcl'));
// jarak > 20 hari tidak dipindah; tidak ada tabrakan
const unit=w.remapStatus(1,[Date.UTC(2035,0,1)],[Date.UTC(2035,1,25)],[{ '1|2035-01-01':1 }]);ok(unit===0,'jarak > 20 hari: status tidak dipindah');
const mp={'5|2035-01-01':1,'5|2035-02-01':1};const mv=w.remapStatus(5,[Date.UTC(2035,0,1),Date.UTC(2035,1,1)],[Date.UTC(2035,0,10)],[mp]);ok(mv===1&&mp['5|2035-01-10']===1&&!mp['5|2035-01-01']&&mp['5|2035-02-01']===1,'dua status berebut satu tanggal baru: hanya yang sebulan yang pindah, tanpa tabrakan');
// ================= 6. UMUM =================
ok(errs.length===0,'tanpa error runtime: '+errs.join('|'));
console.log('FITUR LULUS',pass,'| GAGAL',fail.length);fail.forEach(f=>console.log(' x',f));
process.exitCode=fail.length?1:0;
