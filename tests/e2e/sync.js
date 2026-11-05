/**
 * Tes e2e (jsdom): Sinkron Supabase dengan server tiruan: dialog konflik dan semua pilihannya, Urungkan, penundaan.
 * Jalankan: node tests/e2e/sync.js [path/ke/index.html]   (bawaan: dist/index.html)
 */
const HTML_PATH = process.argv[2] || require('path').join(__dirname, '..', '..', 'dist', 'index.html');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(HTML_PATH,'utf8');
let pass=0,fail=[];const ok=(c,m)=>c?pass++:fail.push(m);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function boot(remote,local,sync){
  const srv={row:remote?{data:remote,rev:remote.rev}:null,upserts:0};let cb=null;const errs=[];
  const client={auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange:f=>{cb=f},signOut:()=>{cb('SIGNED_OUT',null);return Promise.resolve({})}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:()=>Promise.resolve({data:srv.row?{data:srv.row.data,rev:srv.row.rev}:null,error:null})})}),
      upsert:r=>{srv.upserts++;srv.row={data:JSON.parse(JSON.stringify(r.data)),rev:r.rev};return Promise.resolve({error:null})}})};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,beforeParse(w){
    w.addEventListener('error',e=>errs.push(e.message));w.Element.prototype.scrollIntoView=()=>{};
    if(local)w.localStorage.setItem('rencana-keuangan-v1',JSON.stringify(local));
    if(sync!=null)w.localStorage.setItem('rk-sync',JSON.stringify({u:'u1',rev:sync}));
    w.supabase={createClient:()=>client}}});
  const w=dom.window;return {w,srv,errs,$:id=>w.document.getElementById(id),login:()=>cb('SIGNED_IN',{user:{id:'u1',email:'a@b.c'}}),click:e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))};
}
// bahan data
const base=boot();const seedAll=JSON.parse(JSON.stringify(base.w.ALL));
const mkAll=(saldo,rev,extra)=>{const a=JSON.parse(JSON.stringify(seedAll));a.data[2027].saldo=saldo;a.rev=rev;if(extra)a.data[2027].items.push({id:900,name:extra,price:1000,n:1,unit:'bulan',start:'2027-01-01',end:'',cnt:0,ch:[]});return a};
const cf=(t,c)=>t.click(t.$('cf').querySelector('button[data-cf="'+c+'"]'));
(async()=>{
 // a. cloud kosong -> unggah lokal
 let t=boot(null,mkAll(111,5000));await sleep(20);t.login();await sleep(60);
 ok(t.srv.upserts===1&&t.srv.row.data.data[2027].saldo===111,'cloud kosong: data lokal naik');
 // b. lokal murni (data contoh) + cloud berisi -> pakai cloud diam-diam
 t=boot(mkAll(777,9000,'Cloud'),null);await sleep(20);t.login();await sleep(60);
 ok(t.$('cf').hidden&&t.w.S.saldo===777&&t.srv.upserts===0,'perangkat baru (data contoh): cloud dimuat tanpa dialog');
 ok(t.w.snapList().length>=1,'cadangan otomatis dibuat sebelum memuat cloud');
 // c. sudah sinkron, hanya cloud berubah -> muat diam-diam
 t=boot(mkAll(800,9500,'Baru'),mkAll(500,9000),9000);await sleep(20);t.login();await sleep(60);
 ok(t.$('cf').hidden&&t.w.S.saldo===800,'hanya cloud berubah: dimuat tanpa dialog');
 // d. sudah sinkron, hanya lokal berubah -> dorong ke cloud
 t=boot(mkAll(500,9000),mkAll(650,9800),9000);await sleep(20);t.login();await sleep(60);
 ok(t.$('cf').hidden&&t.srv.upserts===1&&t.srv.row.data.data[2027].saldo===650,'hanya lokal berubah: cloud diperbarui');
 // e. kedua sisi berubah -> dialog
 const L=()=>mkAll(650,9800,'Lokal'),R=()=>mkAll(900,9900,'Cloud');
 t=boot(R(),L(),9000);await sleep(20);t.login();await sleep(60);
 ok(!t.$('cf').hidden&&/lebih baru/.test(t.$('cf-r').textContent)&&t.srv.upserts===0,'kedua sisi berubah: dialog muncul, cloud tidak ditimpa');
 // e1. pilih cloud
 cf(t,'remote');await sleep(20);ok(t.$('cf').hidden&&t.w.S.saldo===900&&!t.w.S.items.some(i=>i.name==='Lokal'),'pilih cloud: data cloud dipakai');
 ok(t.w.snapList().some(s=>/Sebelum memakai data cloud/.test(s.l)),'data lokal dicadangkan');
 t.click(t.$('ttu'));await sleep(20);ok(t.w.S.saldo===650&&t.w.S.items.some(i=>i.name==='Lokal'),'Urungkan mengembalikan data perangkat');
 // e2. pilih lokal
 t=boot(R(),L(),9000);await sleep(20);t.login();await sleep(60);cf(t,'local');await sleep(60);
 ok(t.srv.row.data.data[2027].saldo===650,'pilih perangkat ini: cloud ditimpa');
 ok(t.w.snapList().some(s=>/Data cloud sebelum ditimpa/.test(s.l)),'data cloud lama dicadangkan');
 t.click(t.$('ttu'));await sleep(1500);ok(t.w.S.saldo===900&&t.srv.row.data.data[2027].saldo===900,'Urungkan mengembalikan data cloud (lokal & cloud)');
 // e3. gabung
 t=boot(R(),L(),9000);await sleep(20);t.login();await sleep(60);cf(t,'merge');await sleep(60);
 const names=t.w.S.items.map(i=>i.name);ok(names.includes('Lokal')&&names.includes('Cloud'),'gabung: item kedua sisi ada');
 ok(t.srv.row.data.data[2027].items.some(i=>i.name==='Cloud')&&t.srv.row.data.data[2027].items.some(i=>i.name==='Lokal'),'hasil gabungan terkirim ke cloud');
 // e4. nanti saja -> tidak boleh mengirim apa pun sampai dipilih
 t=boot(R(),L(),9000);await sleep(20);t.login();await sleep(60);cf(t,'later');
 ok(t.$('cf').hidden&&/Selesaikan sekarang/.test(t.$('sbs').textContent),'nanti saja: ada tautan Selesaikan sekarang');
 t.w.S.saldo=1;t.w.save();await sleep(1500);ok(t.srv.upserts===0&&t.srv.row.data.data[2027].saldo===900,'saat ditunda, perubahan lokal TIDAK menimpa cloud');
 t.click(t.$('sbs').querySelector('#sbr'));await sleep(60);ok(!t.$('cf').hidden,'klik Selesaikan sekarang -> dialog muncul lagi');
 // f. data lama tanpa rev (non-murni) vs cloud berbeda -> dialog, bukan menimpa
 const legacy=mkAll(321,0,'Lama');delete legacy.rev;
 t=boot(R(),legacy,null);await sleep(20);t.login();await sleep(60);ok(!t.$('cf').hidden,'data lama tanpa penanda versi vs cloud berbeda: dialog muncul');
 // g. data sama persis -> tanpa dialog
 const same=mkAll(900,9900,'Cloud');t=boot(R(),same,null);await sleep(20);t.login();await sleep(60);ok(t.$('cf').hidden&&t.srv.upserts===0,'data sama: tidak ada dialog dan tidak menulis');
 // h. keluar mereset penundaan
 t=boot(R(),L(),9000);await sleep(20);t.login();await sleep(60);cf(t,'later');t.w.document.getElementById('lgb').click();await sleep(20);ok(t.w.syncBlocked===false,'keluar mereset status ditunda');
 // i. perubahan biasa tetap terkirim (debounce) setelah sinkron
 t=boot(null,mkAll(111,5000));await sleep(20);t.login();await sleep(60);const u0=t.srv.upserts;t.w.S.saldo=222;t.w.save();await sleep(1500);ok(t.srv.upserts===u0+1&&t.srv.row.data.data[2027].saldo===222,'edit biasa terkirim otomatis');
 // j. hapus tahun + urungkan tersinkron
 t.w.switchYear(2040);t.w.S.saldo=5;t.w.save();await sleep(1500);t.w.delYear();await sleep(1500);ok(!t.srv.row.data.data[2040],'hapus tahun ikut tersinkron');
 t.click(t.$('ttu'));await sleep(1500);ok(!!t.srv.row.data.data[2040],'Urungkan hapus tahun juga memulihkan di cloud');
 ok(t.errs.length===0,'tanpa error runtime: '+t.errs.join('|'));
 console.log('SINKRON-2 LULUS',pass,'| GAGAL',fail.length);fail.forEach(f=>console.log(' x',f));
process.exitCode=fail.length?1:0;
})();
