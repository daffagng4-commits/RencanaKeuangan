// Uji harga "hanya tanggal ini" pada tagihan yang tanggalnya sudah digeser (kasus pengguna: 5 Des 2026 = Rp 570.000).
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire, click } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const price = (it, d) => w.priceAt(it, Date.parse(d + "T00:00:00Z"));
  const save = () => click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));

  // data pengguna: harga awal 1,1 jt; tagihan 1 Nov & 1 Des digeser ke 5 Nov & 5 Des
  const base = () => ({
    id: 31, name: "Saham Lokal 40%", price: 1100000, start: "2026-11-01", n: 1, unit: "bulan",
    ch: [
      { from: "2026-11-01", to: "2026-11-01", dates: ["2026-11-01"], price: 300000, n: null, unit: null, cut: false },
      { from: "2026-11-01", to: "2026-12-01", price: null, n: null, unit: null, cut: false, mv: { "2026-11-01": "2026-11-05", "2026-12-01": "2026-12-05" } },
      { from: "2026-12-01", to: "2026-12-01", dates: ["2026-12-01"], price: 1300000, n: null, unit: null, cut: false },
      { from: "2026-12-01", to: "", price: null, n: null, unit: null, cut: false },
    ],
  });
  const legacy5 = { from: "2026-12-05", to: "2026-12-05", dates: ["2026-12-05"], price: 570000, n: null, unit: null, cut: false };

  // ---- 1. Data lama (sudah tersimpan seperti di screenshot): harga 5 Des harus terbaca 570.000
  const it0 = base(); it0.ch.push(legacy5);
  ok(price(it0, "2026-12-05") === 570000, "data lama (570.000 tersimpan dengan tanggal 5 Des): harga 5 Des terbaca Rp 570.000, bukan 1,1 jt");
  ok(price(it0, "2026-11-05") === 300000, "harga 5 Nov (asli 1 Nov) tetap Rp 300.000");
  const noFix = base();
  ok(price(noFix, "2026-12-05") === 1100000, "tanpa perubahan 5 Des: kembali ke harga awal 1,1 jt (karena 'seterusnya' dari 1 Des)");

  // ---- 2. Simpan baru lewat jendela: tersimpan dengan tanggal ASLI
  w.switchYear(2026);
  w.S.items = [base()]; w.S.paid = {}; w.S.skip = {}; w.renderAll(); w.openPm(31);
  click($("psc").querySelector('button[data-sc="harga"]'));
  $("phm").value = "terpilih"; fire($("phm"), "change"); await tick();
  w.pmDates.length = 0;
  click($("pdc").querySelector('button[data-d="2026-12-05"]')); await tick();
  ok(JSON.stringify(w.pmDates) === '["2026-12-05"]', "tanggal tagihan yang tampil (5 Des) terpilih di jendela");
  $("pp").value = "570.000"; fire($("pp"), "input"); await tick();
  ok(/Tagihan yang berubah: 5 Des/.test($("ppv").textContent.replace(/\s+/g, " ")) && /570\.000/.test($("ppv").textContent), "pratinjau menyebut 5 Des (Rp 570.000), bukan 'tanpa tagihan'");
  save(); await tick();
  const it1 = w.S.items[0];
  const g = it1.ch.find((c) => c.dates && c.price === 570000);
  ok(g && g.dates.join() === "2026-12-01", "tersimpan dengan tanggal asli 1 Des (bukan 5 Des)");
  ok(price(it1, "2026-12-05") === 570000, "harga tagihan 5 Des sekarang Rp 570.000");
  ok(!it1.ch.some((c) => c.dates && c.dates.join() === "2026-12-01" && c.price === 1300000), "perubahan lama 1 Des (1,3 jt) untuk tagihan yang sama digantikan");

  // daftar perubahan menampilkan tanggal yang tampil (5 Des)
  w.openPm(31); await tick();
  ok(/5 Des 2026/.test($("pml") ? $("pml").textContent : w.document.getElementById("pm").textContent) && /570\.000/.test(w.document.getElementById("pm").textContent), "daftar 'Perubahan yang sudah ada' menampilkan 5 Des 2026 Rp 570.000");

  // ---- 3. Ubah lagi (800.000): menggantikan, tidak menumpuk, dan menang
  click($("psc").querySelector('button[data-sc="harga"]'));
  $("phm").value = "terpilih"; fire($("phm"), "change"); await tick();
  w.pmDates.length = 0; click($("pdc").querySelector('button[data-d="2026-12-05"]')); await tick();
  $("pp").value = "800.000"; fire($("pp"), "input"); await tick();
  save(); await tick();
  const it2 = w.S.items[0];
  ok(price(it2, "2026-12-05") === 800000 && it2.ch.filter((c) => c.dates && c.dates.join() === "2026-12-01").length === 1, "ubah lagi jadi 800.000: berlaku dan perubahan lama diganti (hanya satu)");

  // ---- 4. Data lama + ubah lagi: perubahan lama (tanggal tampil) ikut digantikan
  w.S.items = [(() => { const x = base(); x.ch.push(JSON.parse(JSON.stringify(legacy5))); return x; })()]; w.renderAll(); w.openPm(31);
  click($("psc").querySelector('button[data-sc="harga"]'));
  $("phm").value = "terpilih"; fire($("phm"), "change"); await tick();
  w.pmDates.length = 0; click($("pdc").querySelector('button[data-d="2026-12-05"]')); await tick();
  $("pp").value = "900.000"; fire($("pp"), "input"); await tick();
  save(); await tick();
  const it3 = w.S.items[0];
  ok(price(it3, "2026-12-05") === 900000 && !it3.ch.some((c) => c.price === 570000), "data lama (570.000) lalu diubah ke 900.000: yang lama hilang, yang baru berlaku");

  // ---- 5. Tagihan yang tidak digeser tidak terpengaruh
  const plain = { id: 32, name: "Lain", price: 100000, start: "2026-11-10", n: 1, unit: "bulan", ch: [{ from: "2026-12-10", to: "2026-12-10", dates: ["2026-12-10"], price: 250000, n: null, unit: null, cut: false }] };
  ok(price(plain, "2026-12-10") === 250000 && price(plain, "2026-11-10") === 100000 && price(plain, "2027-01-10") === 100000, "tagihan yang tidak digeser: harga per tanggal tetap benar");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
