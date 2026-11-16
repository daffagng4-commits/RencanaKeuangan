// Uji filter dropdown Riwayat transaksi: Semua / + Masuk / - Keluar.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire, click } = t;
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
  const rows = () => [...w.document.querySelectorAll("#kas-history-list .upcoming-item")];
  const dirBtn = (d) => w.document.querySelector(`#tab-kas [data-kdir="${d}"]`);
  const amounts = () => rows().map((r) => r.querySelector('.upcoming-right span').textContent.trim().startsWith('+') ? 'kin' : 'neg');

  ok(dirBtn("all") && dirBtn("in") && dirBtn("out"), "3 tombol arah filter ada: Semua, Masuk, Keluar");
  ok(dirBtn("all").classList.contains("active") && rows().length === 7, "bawaan: Semua (7 transaksi)");

  click(dirBtn("in")); await tick();
  ok(rows().length === 3 && amounts().every((c) => c === "kin"), "+ Masuk: hanya 3 transaksi masuk");
  ok(dirBtn("in").classList.contains("active"), "tombol Masuk tetap aktif");
  ok(/3 dari 7 transaksi/.test($("kas-hist-summary").textContent), "keterangan jumlah: '3 dari 7 transaksi'");

  click(dirBtn("out")); await tick();
  ok(rows().length === 4 && amounts().every((c) => c === "neg"), "− Keluar: hanya 4 transaksi keluar");

  click(dirBtn("all")); await tick();
  ok(rows().length === 7 && /7 dari 7 transaksi/.test($("kas-hist-summary").textContent), "kembali ke Semua: 7 dari 7 transaksi");

  // filter rentang tanggal (1-30 Nov) lalu kategori Transfer
  click($("kas-range-trigger")); await tick();
  click(w.document.querySelector('#kas-range-popover [data-krng-mv="-1"]')); await tick();
  click(w.document.querySelector('#kas-range-popover [data-krng-d="2026-11-01"]')); await tick();
  click(w.document.querySelector('#kas-range-popover [data-krng-d="2026-11-30"]')); await tick();
  click(w.document.querySelector('#kas-range-popover [data-krng-done="1"]')); await tick();
  ok(rows().length === 3, "rentang 1-30 Nov: 3 transaksi");
  ok(/1 Nov.*30 Nov/.test($("kas-range-display").textContent), "label rentang ikut berubah: " + $("kas-range-display").textContent);

  $("kas-filter-cat").value = "Transfer"; fire($("kas-filter-cat"), "change"); await tick();
  ok(rows().length === 1, "kategori Transfer di Nov: 1 transaksi");
  click($("kas-filter-reset")); await tick();
  ok(rows().length === 7 && $("kas-filter-cat").value === "all", "Reset mengembalikan filter dan semua transaksi tampil");

  // kosong
  P.tx = P.tx.filter((x) => x.t === "+"); w.renderAll(); await tick();
  click(dirBtn("out")); await tick();
  ok(/Tidak ada transaksi/.test($("kas-history-list").textContent), "tidak ada transaksi keluar: pesan kosong yang sesuai");

  // saldo & ringkasan atas tidak ikut terfilter
  const before = $("kas-saldo-val").textContent;
  click(dirBtn("all")); await tick();
  ok($("kas-saldo-val").textContent === before && before.length > 2, "saldo kas di atas daftar tidak terpengaruh filter");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
