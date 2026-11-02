// Uji filter dropdown Riwayat transaksi: Semua / + Masuk / - Keluar.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  w.__today = "2026-12-05";
  w.switchYear(2026);
  w.S.items = []; w.S.paid = {}; w.S.skip = {};
  const P = w.kasLinked();
  const tx = (id, d, t_, amt, cat, note) => ({ id, d, t: t_, amt, cat, note });
  P.tx = [
    tx("a1", "2026-12-01", "+", 2500000, "Gaji", "Bulanan"), tx("a2", "2026-11-02", "+", 50000, "Lainnya", "Receh"),
    tx("a3", "2026-11-02", "-", 400000, "Transfer", "DiPinjem Novi"), tx("a4", "2026-11-02", "+", 19000, "Lainnya", "Tambahan"),
    tx("a5", "2026-10-31", "-", 10000, "Transfer", "Beli TKO"), tx("a6", "2026-10-30", "-", 35000, "Transport", "hutang"),
    tx("a7", "2026-10-30", "-", 1600000, "Lainnya", "Hutang Mamah"),
  ];
  w.tab("kas"); w.renderAll(); await tick();
  const rows = () => [...w.document.querySelectorAll("#v-kas .it2")];
  const amounts = () => rows().map((r) => r.querySelector("b").className);

  ok($("ktf") && [...$("ktf").options].map((o) => o.value).join() === "all,+,-", "dropdown ada dengan 3 pilihan: all, +, -");
  ok([...$("ktf").options].map((o) => o.textContent.trim()).join("|") === "Semua|+ Masuk|− Keluar", "label: Semua | + Masuk | − Keluar");
  ok($("ktf").value === "all" && rows().length === 7, "bawaan: Semua (7 transaksi)");

  $("ktf").value = "+"; fire($("ktf"), "change"); await tick();
  ok(rows().length === 3 && amounts().every((c) => c === "kin"), "+ Masuk: hanya 3 transaksi masuk");
  ok($("ktf").value === "+", "pilihan dropdown bertahan setelah daftar digambar ulang");
  ok(/3 dari 7 transaksi/.test($("v-kas").textContent), "keterangan jumlah: '3 dari 7 transaksi'");

  $("ktf").value = "-"; fire($("ktf"), "change"); await tick();
  ok(rows().length === 4 && amounts().every((c) => c === "neg"), "− Keluar: hanya 4 transaksi keluar");

  $("ktf").value = "all"; fire($("ktf"), "change"); await tick();
  ok(rows().length === 7 && !/dari 7 transaksi/.test($("v-kas").textContent), "kembali ke Semua: 7 transaksi, keterangan hilang");

  // filter periode + jenis berjalan bersama
  $("kper").value = "2026-11"; fire($("kper"), "change"); await tick();
  $("ktf").value = "-"; fire($("ktf"), "change"); await tick();
  ok(rows().length === 1 && /400.000/.test(rows()[0].textContent), "periode Nov 2026 + Keluar: hanya 1 transaksi (Rp 400.000)");
  $("ktf").value = "+"; fire($("ktf"), "change"); await tick();
  ok(rows().length === 2, "periode Nov 2026 + Masuk: 2 transaksi");

  // kosong
  P.tx = P.tx.filter((x) => x.t === "+"); w.renderAll(); await tick();
  $("ktf").value = "-"; fire($("ktf"), "change"); await tick();
  ok(/Belum ada transaksi keluar di periode ini/.test($("v-kas").textContent), "tidak ada transaksi keluar: pesan kosong yang sesuai");

  // saldo & ringkasan tidak ikut terfilter
  const head = () => $("v-kas").textContent.split("Riwayat transaksi")[0];
  const before = head();
  $("ktf").value = "all"; fire($("ktf"), "change"); await tick();
  ok(head() === before && before.length > 20, "ringkasan saldo dan grafik di atas daftar tidak terpengaruh filter");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
