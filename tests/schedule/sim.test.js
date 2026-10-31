// Uji tab Simulasi: pilihan mengikuti tagihan yang belum lunas, dan simulasi tidak mengubah perhitungan utama.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire, click } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const mk = (o) => Object.assign({ price: 100000, ch: [] }, o);
  const load = async (items, paid) => {
    w.switchYear(2028);
    w.SIM = []; w.S.items = items; w.S.paid = paid || {}; w.S.skip = {};
    w.renderAll(); w.tab("sim"); await tick();
  };
  const kind = async (k) => { $("smk").value = k; fire($("smk"), "change"); await tick(); };
  const opts = (id) => [...$(id).options].map((o) => o.textContent);

  const kuartalan = mk({ id: 11, name: "Asuransi", start: "2028-01-15", n: 3, unit: "bulan", price: 500000 });
  const bulanan = mk({ id: 12, name: "Internet", start: "2028-01-05", n: 1, unit: "bulan" });

  // ---- 1. Item tiap 3 bulan: hanya bulan yang punya tagihan, bukan Jan-Des
  await load([kuartalan, bulanan]);
  await kind("stop");
  $("smi").value = "11"; fire($("smi"), "change"); await tick();
  ok(opts("smm").join() === "Jan,Apr,Jul,Okt" || opts("smm").length === 4, "item tiap 3 bulan: opsi bulan hanya yang punya tagihan: " + opts("smm").join(","));
  $("smi").value = "12"; fire($("smi"), "change"); await tick();
  ok(opts("smm").length === 12, "item bulanan: 12 bulan");

  // ---- 2. Tagihan yang sudah lunas tidak ditawarkan
  await load([kuartalan, bulanan], { "11|2028-01-15": 1, "11|2028-04-15": 1 });
  await kind("stop");
  $("smi").value = "11"; fire($("smi"), "change"); await tick();
  ok(opts("smm").length === 2, "Jan dan Apr sudah lunas: hanya Jul dan Okt yang tersisa (" + opts("smm").join(",") + ")");
  await kind("price");
  $("smi").value = "11"; fire($("smi"), "change"); await tick();
  ok(opts("smm").length === 2, "skenario ubah harga: opsi bulan sama (hanya yang belum lunas)");

  // item bulanan lunas sampai Nov: hanya Des
  const paidNov = {}; for (let m = 1; m <= 11; m++) paidNov[`12|2028-${String(m).padStart(2, "0")}-05`] = 1;
  await load([bulanan], paidNov);
  await kind("stop");
  ok(opts("smm").join() === "Des", "item lunas sampai Nov: opsi bulan hanya Des");

  // item yang semua tagihannya lunas tidak muncul di daftar item
  const all = {}; for (let m = 1; m <= 12; m++) all[`12|2028-${String(m).padStart(2, "0")}-05`] = 1;
  await load([bulanan, kuartalan], all);
  await kind("stop");
  ok(opts("smi").join() === "Asuransi", "item yang seluruh tagihannya lunas tidak ditawarkan");
  await load([bulanan], all);
  await kind("stop");
  ok(/tidak ada item/.test(opts("smi").join()), "bila tidak ada tagihan tersisa: pesan 'tidak ada item...'");
  click(w.document.querySelector("[data-smadd]"));
  ok(/Tidak ada item dengan tagihan tersisa/.test($("smerr").textContent), "tambah skenario tanpa item layak: ditolak dengan pesan jelas");

  // ---- 3. Geser: hanya tagihan belum lunas; kotak tanggal terisi + rentang sah
  await load([kuartalan], { "11|2028-01-15": 1 });
  await kind("shift");
  ok(opts("smf").length === 3 && !opts("smf").some((x) => /15 Jan/.test(x)), "geser: tagihan lunas (15 Jan) tidak ada di pilihan");
  $("smf").value = "2028-04-15"; fire($("smf"), "change"); await tick();
  ok($("smt").value === "2028-04-15" && $("smt").min === "2028-01-16" && $("smt").max === "2028-07-14", "kotak tanggal terisi tanggal tagihan, dibatasi antara tagihan sebelumnya dan berikutnya");
  $("smt").value = "2028-08-01"; click(w.document.querySelector("[data-smadd]"));
  ok(/antara 16 Jan 2028 dan 14 Jul 2028/.test($("smerr").textContent), "geser melompati tagihan berikutnya: ditolak, pesan menyebut rentang");
  $("smt").value = "2028-04-20"; click(w.document.querySelector("[data-smadd]")); await tick();
  ok(w.SIM.length === 1 && w.SIM[0].k === "shift", "geser dalam rentang: skenario tertambah");

  // ---- 4. Siklus: tidak boleh dimulai sebelum tagihan belum lunas pertama
  await load([kuartalan], { "11|2028-01-15": 1, "11|2028-04-15": 1 });
  await kind("cycle");
  ok($("smd").min === "2028-07-15", "tanggal mulai siklus baru dibatasi mulai tagihan belum lunas pertama (15 Jul)");
  $("smn2").value = "2"; $("smd").value = "2028-03-01"; click(w.document.querySelector("[data-smadd]"));
  ok(/tidak bisa dimulai sebelum/.test($("smerr").textContent), "siklus dimulai sebelum tagihan terbuka pertama: ditolak");

  // ---- 5. Simulasi TIDAK menyentuh perhitungan utama (sinkron, bukan terhubung)
  await load([kuartalan, bulanan]);
  const snapS = JSON.stringify(w.S), snapCalc = JSON.stringify(w.calc());
  await kind("stop"); $("smi").value = "12"; fire($("smi"), "change"); await tick();
  $("smm").value = "5"; click(w.document.querySelector("[data-smadd]")); await tick();
  await kind("price"); $("smi").value = "11"; fire($("smi"), "change"); await tick();
  $("sma").value = "900.000"; fire($("sma"), "input"); click(w.document.querySelector("[data-smadd]")); await tick();
  await kind("out"); $("smn").value = "Cicilan"; $("sma").value = "250.000"; click(w.document.querySelector("[data-smadd]")); await tick();
  if (w.SIM.length !== 3) console.log("DEBUG SIM", JSON.stringify(w.SIM), "err:", $("smerr") && $("smerr").textContent);
  ok(w.SIM.length === 3, "tiga skenario tertambah (hentikan, harga, pengeluaran baru)");
  ok(JSON.stringify(w.S) === snapS, "data item/status utama sama persis sesudah menambah skenario");
  ok(JSON.stringify(w.calc()) === snapCalc, "perhitungan utama (saldo asli) tidak berubah oleh skenario");
  const sim = w.simCalc(w.SIM);
  ok(sim.end !== JSON.parse(snapCalc).end, "hasil simulasi berbeda dari perhitungan utama (skenario bekerja)");
  ok(JSON.stringify(w.S) === snapS && JSON.stringify(w.calc()) === snapCalc, "menghitung simulasi pun tidak mengubah data utama");
  w.SIM = []; w.renderSim();
  ok(JSON.stringify(w.calc()) === snapCalc, "membuang skenario: perhitungan utama tetap sama");

  // ---- 6. Geser ulang tagihan yang sudah digeser di Jadwal bayar: simulasi tetap berlaku
  const sudahGeser = mk({ id: 13, name: "Kuota", start: "2028-01-01", n: 13, unit: "hari", ch: [{ from: "2028-01-14", anchor: "2028-01-10", to: "", price: null, n: 13, unit: "hari" }] });
  await load([sudahGeser]);
  const asli = w.series(w.S.items[0], Date.UTC(2028, 11, 31)).map((x) => new Date(x).toISOString().slice(0, 10));
  ok(asli[1] === "2028-01-10", "data: tagihan ke-2 sudah digeser ke 10 Jan");
  await kind("shift");
  $("smf").value = "2028-01-10"; fire($("smf"), "change"); await tick();
  $("smt").value = "2028-01-12"; click(w.document.querySelector("[data-smadd]")); await tick();
  const it2 = JSON.parse(JSON.stringify(w.S.items[0]));
  w.S.items = [it2]; // simCalc memakai salinan sendiri; periksa hasil jadwal pada salinan setelah skenario
  const C = JSON.parse(JSON.stringify(w.S)); C.items[0].ch = [];
  w.simPutChg(it2, w.simChg(it2, w.SIM[0]));
  const sesudah = w.series(it2, Date.UTC(2028, 11, 31)).map((x) => new Date(x).toISOString().slice(0, 10));
  ok(sesudah.includes("2028-01-12") && !sesudah.includes("2028-01-10") && sesudah[2] === "2028-01-25", "geser ulang di simulasi: 10 Jan -> 12 Jan berlaku, berikutnya 25 Jan");


  // ---- 7. "Terapkan ke data" = satu-satunya jalan simulasi mengubah data; hasilnya sama dengan yang disimulasikan
  {
    const it = mk({ id: 14, name: "Langganan", start: "2028-01-20", n: 1, unit: "bulan" });
    await load([it], { "14|2028-01-20": 1 });
    await kind("shift");
    $("smf").value = "2028-03-20"; fire($("smf"), "change"); await tick();
    $("smt").value = "2028-03-25"; click(w.document.querySelector("[data-smadd]")); await tick();
    const simmed = w.simCalc(w.SIM).end;
    w.simApply(); await tick();
    const dates = w.series(w.S.items[0], Date.UTC(2028, 11, 31)).map((x) => new Date(x).toISOString().slice(0, 10));
    ok(dates.includes("2028-03-25") && !dates.includes("2028-03-20") && w.S.paid["14|2028-01-20"] === 1, "diterapkan: 20 Mar jadi 25 Mar, status lunas Jan tetap");
    ok(w.calc().end === simmed, "saldo akhir setelah diterapkan sama dengan hasil simulasi sebelumnya");
    ok(w.SIM.length === 0, "daftar skenario dikosongkan setelah diterapkan");
  }
  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
