/**
 * Tes e2e (jsdom): Jendela Ubah harga / jadwal berbasis tujuan (harga, sementara, siklus, geser, manual).
 * Jalankan: node tests/e2e/price-modal.js [path/ke/index.html]   (bawaan: dist/index.html)
 */
const HTML_PATH = process.argv[2] || require('path').join(__dirname, '..', '..', 'dist', 'index.html');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(HTML_PATH,'utf8');
const errs=[];const w=new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,beforeParse(x){x.addEventListener('error',e=>errs.push(e.message));x.Element.prototype.scrollIntoView=()=>{}}}).window;
const d=w.document,$=id=>d.getElementById(id);let pass=0,fail=[];const ok=(c,m)=>c?pass++:fail.push(m);
const set=(id,v)=>{const e=$(id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));e.dispatchEvent(new w.Event('change',{bubbles:true}))};
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));const iso=t=>new Date(t).toISOString().slice(0,10);
w.switchYear(2035);
function add(o){set('f-name',o.name);set('f-price',o.price);set('f-n',o.n||1);set('f-unit',o.unit||'bulan');set('f-start',o.start);click($('save'));return w.S.items[w.S.items.length-1]}
const D=it=>w.occ(it,2035).map(iso).join(' ');
const vis=id=>!$(id).hidden;
const card=sc=>click($('psc').querySelector('button[data-sc="'+sc+'"]'));
// buka: hanya kartu pilihan yang terlihat
let it=add({name:'T9',price:'200k',start:'2035-01-01'});w.openPm(it.id);
ok(!vis('pform')&&!vis('pps'),'awalnya hanya pilihan tujuan (form & tombol simpan tersembunyi)');
// 1 harga
card('harga');ok(vis('pform')&&vis('pps')&&vis('g-price')&&!vis('pcad')&&!vis('pman')&&!vis('g-to')&&!vis('pcw'),'harga: hanya tanggal & harga');
ok($('l-pp').textContent==='Harga baru','label harga baru');
set('pp','200k');click($('pps'));ok(/sama dengan harga sekarang/.test($('pme').textContent)&&(it.ch||[]).length===0,'harga sama ditolak dgn pesan jelas: '+$('pme').textContent);
set('pdt','2035-07-01');set('pp','300k');ok(/Mulai 1 Jul 2035.*Rp 300\.000.*awal Rp 200\.000/.test($('ppv').textContent),'ringkasan bahasa biasa: '+$('ppv').textContent.slice(0,90));
click($('pps'));ok($('pm').hidden&&w.priceAt(it,Date.UTC(2035,6,1))===300000&&w.priceAt(it,Date.UTC(2035,5,1))===200000,'harga naik mulai Jul tersimpan, modal menutup');
// 2 sementara
it=add({name:'T10',price:'100k',start:'2035-01-01'});w.openPm(it.id);card('sementara');
ok(vis('g-to')&&vis('g-price')&&!vis('pcad')&&!vis('pcw'),'sementara: tanggal dari-sampai & harga');
set('pdt','2035-01-01');set('pp','150k');set('pto','');click($('pps'));ok(/sampai/.test($('pme').textContent)&&(it.ch||[]).length===0,'sementara tanpa tanggal sampai ditolak');
set('pto','2035-03-01');ok(/Dari 1 Jan 2035 sampai 1 Mar 2035.*kembali ke harga awal Rp 100\.000/.test($('ppv').textContent),'ringkasan sementara');click($('pps'));
ok([1,2,3,4,12].map(m=>w.priceAt(it,Date.UTC(2035,m-1,1))).join()==='150000,150000,150000,100000,100000','sementara Jan-Mar 150rb lalu normal');
// 3 siklus (tagihan lama tetap) dan 3b (hapus)
it=add({name:'T11',price:'100k',start:'2035-01-01'});w.openPm(it.id);card('siklus');
ok(vis('pcad')&&vis('pcw')&&!vis('pman')&&!vis('g-to'),'siklus: tampil siklus & pilihan tagihan lama');
set('pdt','2035-04-01');set('pn',3);click($('pps'));ok(D(it)==='2035-01-01 2035-02-01 2035-03-01 2035-04-01 2035-07-01 2035-10-01','siklus 3 bln: tagihan lama tetap');
it=add({name:'T12',price:'100k',start:'2035-01-01'});w.openPm(it.id);card('siklus');set('pdt','2035-04-01');set('pn',3);set('pcut','drop');
ok(/Tagihan sebelum tanggal ini dihapus/.test($('ppv').textContent),'ringkasan menyebut penghapusan');click($('pps'));ok(D(it)==='2035-04-01 2035-07-01 2035-10-01','siklus + hapus tagihan lama');
w.openPm(it.id);card('siklus');click($('pps'));ok(/Siklusnya sama/.test($('pme').textContent),'siklus tanpa perubahan ditolak: '+$('pme').textContent);
// 4 geser
it=add({name:'T13',price:'100k',start:'2035-01-01'});w.openPm(it.id);card('geser');
ok(!vis('g-price')&&!vis('pcad')&&vis('pcw'),'geser: hanya tanggal baru');
set('pdt','2035-07-15');ok(/Tagihan sebelum 15 Jul 2035|Sebelum 15 Jul/.test($('ppv').textContent),'pratinjau menjelaskan tagihan sebelumnya');
click($('pps'));ok(D(it)==='2035-01-01 2035-02-01 2035-03-01 2035-04-01 2035-05-01 2035-06-01 2035-07-01 2035-07-15 2035-08-15 2035-09-15 2035-10-15 2035-11-15 2035-12-15','geser tanggal 15 mulai Jul (sama dgn skenario T13)');
// 5 manual + ganti skenario mereset isian
it=add({name:'T14',price:'100k',start:'2035-01-01'});w.openPm(it.id);card('manual');ok(vis('pman')&&vis('pcad')&&vis('g-price'),'manual: semua tampil');
set('pw','until');ok(vis('g-to')&&!vis('pcw'),'manual: sementara menampilkan sampai-tanggal & menyembunyikan hapus-sebelum');
set('pp','999k');card('harga');ok($('pp').value==='100.000'&&$('pw').value==='forever','pindah skenario mengembalikan isian awal');
// item sekali: hanya harga
it=add({name:'T15',price:'75k',unit:'sekali',start:'2035-05-05'});w.openPm(it.id);
ok($('psc').querySelector('[data-sc=siklus]').hidden&&$('psc').querySelector('[data-sc=geser]').hidden&&!$('psc').querySelector('[data-sc=harga]').hidden,'item sekali: pilihan siklus/geser disembunyikan');
card('harga');set('pp','100k');click($('pps'));ok(w.priceAt(it,Date.UTC(2035,4,5))===100000,'harga item sekali bisa diubah');
// daftar perubahan & hapus
w.openPm(w.S.items.find(i=>i.name==='T9').id);ok(/Rp 300\.000/.test($('phl').textContent),'daftar perubahan tampil');
ok(errs.length===0,'tanpa error runtime: '+errs.join('|'));
console.log('UI LULUS',pass,'| GAGAL',fail.length);fail.forEach(f=>console.log(' x',f));
process.exitCode=fail.length?1:0;
