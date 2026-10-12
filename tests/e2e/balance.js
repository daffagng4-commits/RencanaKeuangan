/**
 * Tes e2e (jsdom): Tambah / kurangi saldo (digabung ke saldo awal atau mulai bulan tertentu), riwayat, impor/ekspor.
 * Jalankan: node tests/e2e/balance.js [path/ke/index.html]   (bawaan: dist/index.html)
 */
const HTML_PATH = process.argv[2] || require('path').join(__dirname, '..', '..', 'dist', 'index.html');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(HTML_PATH,'utf8');
const errs=[];const mk=(pre)=>new JSDOM(html,{runScripts:'dangerously',url:'https://t.test/',pretendToBeVisual:true,beforeParse(x){x.addEventListener('error',e=>errs.push(e.message));x.Element.prototype.scrollIntoView=()=>{};if(pre)x.localStorage.setItem('rencana-keuangan-v1',JSON.stringify(pre))}}).window;
const w=mk();const d=w.document,$=id=>d.getElementById(id);let pass=0,fail=[];const ok=(c,m)=>c?pass++:fail.push(m);
const set=(id,v)=>{const e=$(id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));e.dispatchEvent(new w.Event('change',{bubbles:true}))};
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const rp=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
w.switchYear(2035);set('saldo','10.000.000');
const base=w.calc();ok(base.open===10000000&&base.end===10000000-base.total,'tanpa penyesuaian: saldo seperti biasa');
ok($('adjs').textContent==='','tanpa penyesuaian: ringkasan kosong');
const add=(t,amt,note,mon)=>{click($('adjb'));ok(!$('am').hidden,'modal terbuka');click($('atp').querySelector('button[data-t="'+t+'"]'));set('aa',amt);if(note)set('an',note);if(mon!=null){set('aw','month');set('amo',mon)}click($('aps'))};
// 1 tambah, gabung ke saldo awal
click($('adjb'));ok($('ami').textContent.includes('Rp 10.000.000'),'modal menampilkan saldo awal sekarang');
click($('atp').querySelector('button[data-t="+"]'));set('aa','2000000');ok(/Saldo awal jadi Rp 12\.000\.000/.test($('apv').textContent),'pratinjau: saldo awal jadi 12 jt: '+$('apv').textContent);
set('an','Gaji');click($('aps'));ok($('am').hidden,'modal menutup setelah simpan');
let c=w.calc();ok(c.open===12000000&&c.end===12000000-c.total&&c.rows[0].aw===12000000,'saldo awal efektif 12 jt, saldo akhir ikut naik');
ok(/\+\s*Rp 2\.000\.000 penyesuaian = Rp 12\.000\.000/.test($('adjs').textContent),'ringkasan di bawah kolom saldo awal: '+$('adjs').textContent);
ok($('v-rincian').innerHTML.includes('dari saldo awal Rp 10.000.000 + Rp 2.000.000 penyesuaian = Rp 12.000.000'),'kartu Rincian menjelaskan gabungan');
ok(w.S.saldo===10000000,'angka saldo awal yang diketik tidak berubah (penyesuaian terpisah)');
// 2 kurangi
add('-','500k','Koreksi');c=w.calc();ok(c.open===11500000,'kurangi 500k -> 11,5 jt: '+c.open);
click($('adjb'));ok(/− Rp 500\.000/.test($('ahl').textContent)&&/Koreksi/.test($('ahl').textContent),'riwayat menampilkan pengurangan + catatan');click($('acl'));
// 3 mulai bulan tertentu (Jul): tidak masuk saldo awal, masuk saldo awal bulan Jul
const sp=w.calc().rows;add('+','1.000.000','Bonus',6);c=w.calc();
ok(c.open===11500000&&c.adjLate===1000000,'penyesuaian Jul tidak mengubah saldo awal tahun');
ok(c.rows[6].ad===1000000&&c.rows[6].aw===c.rows[5].ak+1000000,'saldo awal Jul = saldo akhir Jun + 1 jt');
ok(c.end===11500000+1000000-c.total,'saldo akhir Des memperhitungkan semua penyesuaian');
ok($('v-rincian').innerHTML.includes('1.000.000 penyesuaian'),'baris Jul menandai penyesuaian');
// 4 bulan saldo di tengah: penyesuaian sebelum/sama dgn bulan saldo digabung ke saldo awal
set('sm',7);c=w.calc();ok(c.open===11500000+1000000&&c.adjLate===0,'bulan saldo Agu: penyesuaian Jul ikut digabung ke saldo awal: open='+c.open);set('sm',0);
// 5 hapus
click($('adjb'));const nBefore=w.S.adj.length;click(d.querySelector('#ahl button[data-adel]'));click($('acl'));ok(w.S.adj.length===nBefore-1,'hapus penyesuaian dari riwayat'); // hapus yang terbaru (Bonus)
c=w.calc();ok(c.adjLate===0&&c.open===11500000,'hapus Bonus -> kembali');
// 6 validasi
click($('adjb'));set('aa','0');click($('aps'));ok(/valid/.test($('aer').textContent)&&w.S.adj.length===2,'jumlah 0 ditolak');
// 7 minus besar: saldo negatif tetap dihitung & muncul peringatan
click($('acl'));add('-','50.000.000','Besar');ok(w.calc().end<0&&/Saldo habis/.test($('v-rincian').innerHTML),'saldo negatif memunculkan peringatan');
// 8 tiap tahun terpisah
w.switchYear(2036);ok(w.S.adj.length===0&&w.calc().open===0,'tahun lain tidak ikut menerima penyesuaian');
w.switchYear(2035);
// 9 bawa saldo ke tahun berikutnya memperhitungkan penyesuaian
w.S.items.push({id:77,name:'X',price:1000,n:1,unit:'bulan',start:'2035-01-01',end:'',cnt:0,ch:[]});w.renderAll();const end35=w.calc().end;w.switchYear(2036);set('cy','2035');$('cs').checked=true;click($('cyb'));ok(w.S.saldo===end35,'saldo akhir (termasuk penyesuaian) terbawa ke 2036');
w.switchYear(2035);
// 10 ekspor rincian bulanan memuat kolom Penyesuaian
let csv='';w.exportFile=(n,dd)=>{csv=dd};w.doExport('bulan');ok(/Penyesuaian/.test(csv.split('\n')[0]),'CSV rincian bulanan punya kolom Penyesuaian');
// 11 cadangan: replace & merge
const snap=JSON.stringify(w.ALL);const w2=mk();w2.document.getElementById('im').value='replace';w2.doImport(snap);ok(w2.S.adj.length===w.S.adj.length,'impor timpa membawa penyesuaian');
const w3=mk();w3.document.getElementById('im').value='merge';w3.doImport(snap);const n3=w3.ALL.data[2035].adj.length;w3.doImport(snap);ok(n3===w.S.adj.length&&w3.ALL.data[2035].adj.length===n3,'impor gabung tidak menggandakan penyesuaian');
// 12 data lama tanpa adj dimuat aman
const legacy={saldo:5000000,year:2027,items:[{id:1,name:'A',price:100,n:1,unit:'bulan',start:'2027-01-01'}]};const w4=mk(legacy);ok(Array.isArray(w4.S.adj)&&w4.calc().open===5000000,'data lama tanpa penyesuaian aman');
// 13 data adj rusak dibersihkan
const bad={year:2027,data:{2027:{saldo:1000,items:[],adj:[{t:'x',amt:5},{t:'+',amt:-3},{t:'+',amt:200,m:99},null]}}};const w5=mk(bad);ok(w5.S.adj.length===1&&w5.S.adj[0].m===11&&w5.calc().open===1000,'entri rusak dibuang, bulan di-clamp (open tetap 1000 karena m=11 > bulan saldo): open='+w5.calc().open+' adj='+w5.S.adj.length);
ok(errs.length===0,'tanpa error runtime: '+errs.join('|'));
console.log('SALDO LULUS',pass,'| GAGAL',fail.length);fail.forEach(f=>console.log(' x',f));
process.exitCode=fail.length?1:0;
