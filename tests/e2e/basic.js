/**
 * Tes e2e (jsdom): Alur dasar: data contoh vs Excel, tambah/ubah/hapus item, ubah harga/jadwal, lunas & lewati, tahun, impor/ekspor, bulan saldo.
 * Jalankan: node tests/e2e/basic.js [path/ke/index.html]   (bawaan: dist/index.html)
 */
const HTML_PATH = process.argv[2] || require('path').join(__dirname, '..', '..', 'dist', 'index.html');
const {JSDOM}=require('jsdom');const fs=require('fs');
const file=HTML_PATH;
const html=fs.readFileSync(file,'utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,
  beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{}}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id);
let pass=0,fail=[];
function ok(c,m){if(c)pass++;else fail.push(m)}
function set(id,v){const e=$(id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));e.dispatchEvent(new w.Event('change',{bubbles:true}))}
function click(el){el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))}
const iso=t=>new Date(t).toISOString().slice(0,10);
const D=(it,y)=>w.occ(it,y).map(iso);
const spend=()=>w.calc().rows.map(r=>r.sp);

// 1. data awal vs Excel
ok(w.S.items.length===12,'seed 12 item');
ok(spend().join()==='2300000,1415000,2075000,1865000,1550000,1965000,2000000,1415000,2075000,1865000,2300000,1615000','total per bulan sama dg Excel: '+spend().join());
ok($('v-rincian').innerHTML.includes('Rincian arus kas 2027'),'rincian render');

// 2. item baru lewat form
function addItem(o){set('f-name',o.name);set('f-price',o.price);set('f-n',o.n||1);set('f-unit',o.unit||'bulan');set('f-start',o.start);
  set('f-stop',o.stop||'none');if(o.end)set('f-end',o.end);if(o.cnt)set('f-cnt',o.cnt);click($('save'))}
const n0=w.S.items.length;
addItem({name:'Video',price:'200k',n:1,unit:'bulan',start:'2027-01-01'});
let v=w.S.items[w.S.items.length-1];
ok(w.S.items.length===n0+1&&v.price===200000,'item baru tersimpan, harga 200k: '+$('err').textContent);
ok(D(v,2027).length===12&&D(v,2027)[1]==='2027-02-01','video bulanan, Feb=1 Feb');
addItem({name:'Cicilan',price:'1.000.000',n:1,unit:'bulan',start:'2027-01-31',stop:'cnt',cnt:4});
let c=w.S.items[w.S.items.length-1];
ok(D(c,2027).join()==='2027-01-31,2027-02-28,2027-03-31,2027-04-30','cicilan 4x, 31 Jan->28 Feb: '+D(c,2027));
addItem({name:'Sampai',price:'50k',n:2,unit:'minggu',start:'2027-01-04',stop:'date',end:'2027-02-01'});
let s=w.S.items[w.S.items.length-1];
ok(D(s,2027).join()==='2027-01-04,2027-01-18,2027-02-01','tiap 2 minggu sampai 1 Feb: '+D(s,2027));
addItem({name:'Sekali',price:'75k',unit:'sekali',start:'2027-05-05'});
let k=w.S.items[w.S.items.length-1];
ok(D(k,2027).join()==='2027-05-05'&&D(k,2028).length===0,'sekali saja');
addItem({name:'',price:'10k',start:'2027-01-01'});ok($('err').textContent.length>0,'validasi nama kosong');
addItem({name:'X',price:'0',start:'2027-01-01'});ok($('err').textContent.length>0,'validasi harga 0');
addItem({name:'Y',price:'10k',start:'2027-03-01',stop:'date',end:'2027-01-01'});ok($('err').textContent.length>0,'validasi tanggal berhenti < mulai');
ok(w.S.items.length===n0+4,'item invalid tidak tersimpan');

// 3. ubah harga / jadwal lewat modal
function pm(id,o){w.openPm(id);set('pdt',o.from);set('pp',o.price);if(o.n)set('pn',o.n);if(o.u)set('pu',o.u);
  set('pw',o.to?'until':'forever');if(o.to)set('pto',o.to);set('pa',o.pa||'keep');set('pcut',o.cut?'drop':'keep');click($('pps'));return $('pme').textContent}
const iptv=w.S.items.find(i=>i.name==='Strong IPTV');
const before=D(iptv,2027).join();
pm(v.id,{from:'2027-04-01',price:'300k'});
ok(D(v,2027).length===12&&w.priceAt(v,Date.UTC(2027,2,1))===200000&&w.priceAt(v,Date.UTC(2027,3,1))===300000,'harga baru mulai 1 Apr, Mar tetap 200k');
ok($('v-jadwal').innerHTML.includes('pd chg'),'jadwal menandai tagihan harga berbeda');
ok(spend()[3]-spend()[2]===100000+ (spend()[3]-spend()[2]-100000),'(placeholder)');
pm(v.id,{from:'2027-07-01',price:'200k',n:3,u:'bulan'});
ok(D(v,2027).join()==='2027-01-01,2027-02-01,2027-03-01,2027-04-01,2027-05-01,2027-06-01,2027-07-01,2027-10-01','siklus 3 bln dari Jul: '+D(v,2027));
w.openPm(v.id);click($('pps'));let msg=$('pme').textContent;ok(/Belum ada yang diubah/.test(msg),'tanpa perubahan apa pun tidak disimpan: '+msg);
// hanya geser tanggal (tanpa ubah harga/siklus)
msg=pm(c.id,{from:'2027-03-15',price:'1.000.000',pa:'restart'});
ok(msg===''||!/Belum/.test(msg),'geser tanggal saja bisa disimpan: '+msg);
ok(D(c,2027).join()==='2027-01-31,2027-02-28,2027-03-15,2027-04-15','cicilan geser ke tgl 15 mulai Mar, total tetap 4x: '+D(c,2027));
// sementara
pm(s.id,{from:'2027-01-18',price:'80k',to:'2027-01-31'});
ok(w.priceAt(s,Date.UTC(2027,0,18))===80000&&w.priceAt(s,Date.UTC(2027,1,1))===50000,'harga sementara 18-31 Jan lalu kembali');
// skenario Strong IPTV pengguna
iptv.price=337000;iptv.unit='tahun';iptv.n=1;iptv.start='2027-01-01';iptv.ch=[];
pm(iptv.id,{from:'2027-03-16',price:'337.000',n:6,u:'bulan'});
ok(D(iptv,2027).join()==='2027-01-01,2027-03-16,2027-09-16','IPTV tanpa hapus: '+D(iptv,2027));
pm(iptv.id,{from:'2027-03-16',price:'337.000',n:6,u:'bulan',cut:true});
ok(D(iptv,2027).join()==='2027-03-16,2027-09-16'&&iptv.ch.length===1,'IPTV dengan hapus sebelumnya: '+D(iptv,2027)+' ch='+iptv.ch.length);
ok($('v-jadwal').innerHTML.includes('mulai 16 Mar 2027: tiap 6 bulan'),'label jadwal efektif tampil');
// item sekali: ubah harga
pm(k.id,{from:'2027-05-05',price:'100k'});ok(w.priceAt(k,Date.UTC(2027,4,5))===100000,'harga item sekali');

// 4. lunas / lewati lewat popover
const key=v.id+'|2027-01-01';
const act=(k,st)=>{click(d.querySelector('button[data-pk="'+k+'"]'));ok(!$('cm').hidden,'popover terbuka');click($('cm').querySelector('button[data-st="'+st+'"]'))};
act(key,'paid');ok(w.S.paid[key]===1&&$('v-jadwal').innerHTML.includes('✓'),'tandai lunas');ok($('cm').hidden,'popover menutup setelah memilih');
act(key,'none');ok(!w.S.paid[key],'kembali ke belum dibayar');
act(key,'paid');
// skenario pengguna: bayar bln1, lewati bln2, bayar 3-7, lewati 8, bayar lagi
const base0=spend().slice();
const k2=v.id+'|2027-02-01',k8=v.id+'|2027-10-01';
act(k2,'skip');act(k8,'skip');
ok(w.S.skip[k2]===1&&w.S.skip[k8]===1,'bulan 2 dan 8 dilewati');
const after=spend();ok(base0[1]-after[1]===w.priceAt(v,Date.UTC(2027,1,1))&&base0[9]-after[9]===w.priceAt(v,Date.UTC(2027,9,1)),'pengeluaran Feb & Agu berkurang sebesar tagihan yang dilewati');
ok(after[0]===base0[0]&&after[2]===base0[2]&&after[8]===base0[8]&&after[7]===base0[7],'bulan lain tidak berubah');
ok(d.querySelector('button[data-pk="'+k2+'"]').className.includes('skp'),'chip dilewati bergaya coret');
ok($('v-jadwal').innerHTML.includes('Dilewati')&&/2 dilewati/.test($('v-jadwal').innerHTML),'ringkasan & total menyebut jumlah dilewati');
w.openRows||0;click(d.querySelector('#v-rincian tr.row[data-m="1"]'));ok($('v-rincian').innerHTML.includes('dilewati (tidak dibayar)'),'rincian menampilkan baris dilewati');
act(k2,'paid');ok(!w.S.skip[k2]&&w.S.paid[k2]===1&&spend()[1]===base0[1],'lewati -> lunas: skip hilang & tagihan dihitung lagi');
act(k2,'skip');ok(!w.S.paid[k2]&&w.S.skip[k2]===1,'lunas -> lewati: lunas hilang (tidak bisa dua-duanya)');
w.doExport('hist');ok(true,'ekspor riwayat tidak error');
// ekspor riwayat memuat status Dilewati dengan jumlah 0
let csv='';const origSave=w.exportFile;w.exportFile=(n,dd)=>{csv=dd};w.doExport('hist');w.exportFile=origSave;
ok(/Dilewati/.test(csv)&&new RegExp(';0;Dilewati').test(csv),'CSV riwayat: status Dilewati dengan jumlah 0');
// 5. edit item dasar mempertahankan perubahan harga
click(d.querySelector('button[data-ed="'+v.id+'"]'));set('f-price','210k');click($('save'));
let v2=w.S.items.find(i=>i.id===v.id);ok(v2.price===210000&&v2.ch.length===2,'edit item tidak menghapus perubahan harga: ch='+v2.ch.length);

// 6. tahun
const saldo27=w.calc().end;
w.switchYear(2028);ok(w.S.year===2028&&w.S.items.length===0,'tahun baru kosong');
set('cy','2027');$('cs').checked=true;click($('cyb'));
ok(w.S.items.length>0&&w.S.saldo===saldo27,'bawa jadwal + saldo akhir: items='+w.S.items.length+' saldo '+w.S.saldo+' vs '+saldo27);
ok(!w.S.items.some(i=>i.name==='Sekali'),'item sekali bayar tidak dibawa');
ok(!w.S.items.some(i=>i.name==='Sampai'),'item yang sudah selesai tidak dibawa');
const cic=w.S.items.find(i=>i.name==='Cicilan');ok(!cic,'cicilan 4x yang sudah selesai tidak dibawa');
const v28=w.S.items.find(i=>i.name==='Video');ok(v28&&D(v28,2028).length>0&&v28.ch.length===2,'video ikut dibawa lengkap dg perubahan harga/jadwal');
const nI=w.S.items.length;click($('cyb'));ok(w.S.items.length===nI,'bawa dua kali tidak duplikat');
// hapus tahun
w.switchYear(2027);const yb=d.querySelector('#yb button[data-dy]');click(yb);click(d.querySelector('#yb button[data-dy]'));
ok(!w.ALL.data[2027]&&w.S.year===2028,'hapus tahun 2027 -> pindah ke 2028: '+w.S.year);
w.switchYear(2029);click(d.querySelector('#yb button[data-dy]'));click(d.querySelector('#yb button[data-dy]'));
ok(!w.ALL.data[2029]&&w.S.year===2028,'hapus tahun kosong');
click(d.querySelector('#yb button[data-dy]'));click(d.querySelector('#yb button[data-dy]'));
ok(Object.keys(w.ALL.data).length===1&&w.S.year===new Date().getFullYear(),'hapus tahun terakhir -> tahun kosong baru: '+w.S.year);

// 7. impor/ekspor
w.ALL=w.norm(null);w.S=w.ALL.data[w.ALL.year];w.syncUI();
const json=JSON.stringify(w.ALL);
w.switchYear(2027);const bk=JSON.stringify(w.ALL);
w.S.items.push({id:999,name:'Tambah',price:5000,n:1,unit:'bulan',start:'2027-01-01',end:'',cnt:0,ch:[{from:'2027-06-01',to:'',price:9000,n:null,unit:null}]});
const full=JSON.stringify(w.ALL);
set('im','merge');w.doImport(full);ok(w.S.items.filter(i=>i.name==='Tambah').length===1,'impor gabung tidak duplikat');
set('im','replace');w.doImport(full);ok(w.S.items.find(i=>i.name==='Tambah').ch.length===1,'impor timpa mempertahankan perubahan harga');
set('im','merge');w.doImport('Nama;Harga;Tiap;Satuan;Mulai;Sampai;Jumlah kali\nPulsa;100000;1;bulan;01/02/2027;;3\nRusak;abc;1;bulan;2027-01-01;;');
const pul=w.S.items.find(i=>i.name==='Pulsa');ok(pul&&pul.cnt===3&&pul.start==='2027-02-01','impor CSV item (tanggal dd/mm/yyyy, jumlah kali)');
w.doImport('bukan data');ok(/tidak dikenali/.test($('xm').textContent),'impor file salah ditolak');
const before2=JSON.stringify(w.ALL.data);w.doImport('{"x":1}');ok(JSON.stringify(w.ALL.data)===before2,'JSON asing tidak mengubah data');

// 8. bulan saldo
set('sm',3);ok(w.calc().rows.length===9&&w.calc().rows[0].m===3,'bulan saldo April: 9 baris');set('sm',0);

// 9. localStorage tersimpan & muat ulang
const stored=JSON.parse(w.localStorage.getItem('rencana-keuangan-v1'));ok(stored&&stored.data,'tersimpan di localStorage');

// 10. tidak ada error runtime
ok(errs.length===0,'error runtime: '+errs.join(' | '));


// ===== uji tambahan =====
w.switchYear(2030);

w.switchYear(2030);
function mk(o){return Object.assign({id:Math.random(),name:'T',price:1000,n:1,unit:'bulan',start:'2030-01-01',end:'',cnt:0,ch:[]},o)}
// A. sementara di dalam perubahan seterusnya (tumpang tindih)
let A=mk({price:100,ch:[{from:'2030-01-01',to:'',price:200,n:null,unit:null},{from:'2030-03-01',to:'2030-04-30',price:300,n:null,unit:null}]});
ok([1,2,3,4,5,6].map(m=>w.priceAt(A,Date.UTC(2030,m-1,1))).join()==='200,200,300,300,200,200','tumpang tindih: sementara lalu kembali ke perubahan seterusnya');
// B. perubahan pada tanggal yang bukan tanggal bayar
let B=mk({ch:[{from:'2030-02-10',to:'',price:555,n:null,unit:null}]});
ok(w.priceAt(B,Date.UTC(2030,1,1))===1000&&w.priceAt(B,Date.UTC(2030,2,1))===555,'harga berlaku mulai 10 Feb: tagihan 1 Feb tetap, 1 Mar baru');
// C. item harian + harga berubah
let C=mk({unit:'hari',n:28,start:'2029-10-21',price:50,ch:[{from:'2030-06-01',to:'',price:70,n:null,unit:null}]});
ok(w.occ(C,2030).every(t=>w.priceAt(C,t)===(iso(t)>='2030-06-01'?70:50)),'item per 28 hari: harga berubah per tanggal');
// D. ganti tahunan lalu bulanan lagi (rantai perubahan)
let Dd=mk({ch:[{from:'2030-03-01',to:'',price:null,n:1,unit:'tahun',cut:false},{from:'2030-09-01',to:'',price:null,n:1,unit:'bulan'}]});
ok(D(Dd,2030).join()==='2030-01-01,2030-02-01,2030-03-01,2030-09-01,2030-10-01,2030-11-01,2030-12-01','rantai: bulanan -> tahunan (Mar) -> bulanan (Sep): '+D(Dd,2030));
// E. cut + cnt
let E=mk({cnt:3,ch:[{from:'2030-03-01',to:'',price:null,n:null,unit:null,cut:true}]});
ok(D(E,2030).join()==='2030-03-01,2030-04-01,2030-05-01','cut + jumlah kali: hitung dari tanggal cut');
// F. berhenti + perubahan siklus
let F=mk({end:'2030-08-31',ch:[{from:'2030-05-01',to:'',price:null,n:2,unit:'bulan'}]});
ok(D(F,2030).join()==='2030-01-01,2030-02-01,2030-03-01,2030-04-01,2030-05-01,2030-07-01','berhenti 31 Agu + tiap 2 bln dari Mei: '+D(F,2030));
// G. tahun jauh ke depan tetap benar
ok(w.occ(mk({}),2040).length===12,'tahun 2040 tetap 12 tagihan');
// H. hapus item membersihkan lunas
w.S.items=[];w.S.paid={};addItem({name:'Hapus',price:'10k',start:'2030-01-01'});const h=w.S.items[0];
act(h.id+'|2030-01-01','paid');ok(Object.keys(w.S.paid).length===1,'lunas tersimpan');act(h.id+'|2030-02-01','skip');ok(Object.keys(w.S.skip).length===1,'lewati tersimpan');
click(d.querySelector('button[data-del="'+h.id+'"]'));click(d.querySelector('button[data-del="'+h.id+'"]'));
ok(w.S.items.length===0&&Object.keys(w.S.paid).length===0&&Object.keys(w.S.skip).length===0,'hapus item membersihkan status lunas & dilewati');
// I. hapus satu perubahan dari daftar
addItem({name:'Chg',price:'10k',start:'2030-01-01'});const g=w.S.items[0];
pm(g.id,{from:'2030-03-01',price:'20k'});ok(g.ch.length===1,'perubahan tersimpan');
w.openPm(g.id);click(d.querySelector('#phl button[data-pdel="0"]'));ok(g.ch.length===0&&w.priceAt(g,Date.UTC(2030,4,1))===10000,'hapus perubahan -> kembali harga awal');
// J. validasi modal
w.openPm(g.id);set('pp','0');click($('pps'));ok($('pme').textContent.length>0&&g.ch.length===0,'harga 0 ditolak di modal');
w.openPm(g.id);set('pp','20k');set('pw','until');set('pto','');click($('pps'));ok(/sampai/.test($('pme').textContent)&&g.ch.length===0,'sementara tanpa tanggal sampai ditolak');
set('pto','2030-01-01');set('pdt','2030-05-01');click($('pps'));ok(g.ch.length===0,'tanggal sampai < mulai ditolak');
// K. migrasi data format lama (pc) + tanpa ch
const legacy={saldo:1000000,year:2027,startMonth:2,items:[{id:1,name:'Lama',price:100,n:1,unit:'bulan',start:'2027-01-01',pc:[{d:'2027-06-01',p:150}]},{id:2,name:'Rusak',price:'x'}]};
const dom2=new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',beforeParse(x){x.localStorage.setItem('rencana-keuangan-v1',JSON.stringify(legacy))}});
const w2=dom2.window;const L=w2.S.items[0];
ok(w2.S.year===2027&&L.ch&&L.ch[0].price===150&&!('pc' in L),'migrasi pc -> ch');
ok(w2.priceAt(L,Date.UTC(2027,6,1))===150&&w2.priceAt(L,Date.UTC(2027,4,1))===100,'harga hasil migrasi benar');
ok(w2.S.startMonth===2&&w2.calc().rows.length===10,'bulan saldo lama tetap');
// L. data korup di localStorage -> kembali ke contoh, tidak crash
const dom3=new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',beforeParse(x){x.localStorage.setItem('rencana-keuangan-v1','{rusak')}});
ok(dom3.window.S.items.length===12,'localStorage rusak -> pakai data contoh');
// M. tidak ada error baru
ok(errs.length===0,'error runtime (tambahan): '+errs.join(' | '));

// skip ikut impor (instance baru)
const mkw=()=>new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,beforeParse(x){x.Element.prototype.scrollIntoView=()=>{}}}).window;
const WA=mkw(),a0=WA.S.items[0],kk=a0.id+'|'+iso(WA.occ(a0,2027)[1]);WA.S.skip[kk]=1;WA.save();const snap=JSON.stringify(WA.ALL);
const WB=mkw();WB.document.getElementById('im').value='merge';WB.doImport(snap);ok(WB.S.skip[kk]===1,'impor gabung membawa status dilewati');
const WC=mkw();WC.document.getElementById('im').value='replace';WC.doImport(snap);ok(WC.S.skip[kk]===1,'impor timpa membawa status dilewati');
// data lama tanpa field skip tidak membuat error
const oldj=JSON.parse(snap);Object.values(oldj.data).forEach(y=>delete y.skip);
const WD=mkw();WD.document.getElementById('im').value='replace';WD.doImport(JSON.stringify(oldj));ok(WD.S.skip&&Object.keys(WD.S.skip).length===0&&WD.calc().rows.length===12,'data tanpa field skip dimuat aman');

console.log('LULUS',pass,'| GAGAL',fail.length);fail.forEach(f=>console.log(' x',f));
process.exitCode=fail.length?1:0;
