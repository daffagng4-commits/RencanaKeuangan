// Uji efek "lunas semua" pada baris item di tabel Jadwal pembayaran.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, click } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  w.__today = "2028-11-12";
  w.switchYear(2028);
  const bulanan = (id, name) => ({ id, name, price: 100000, start: "2028-09-05", n: 1, unit: "bulan", ch: [] });
  const sekali = (id, name, d) => ({ id, name, price: 50000, start: d, n: 1, unit: "sekali", ch: [] });
  w.S.startMonth = 8; w.S.smManual = true; // bulan sebelum Sep tidak dihitung (pin manual supaya tetap 8)
  w.S.items = [bulanan(1, "Semua lunas"), bulanan(2, "Sebagian"), bulanan(3, "Semua dilewati"), sekali(4, "Sekali lunas", "2028-10-10"), sekali(5, "Sekali belum", "2028-12-10"), bulanan(6, "Lunas+dilewati")];
  const paidAll = (id) => [9, 10, 11, 12].forEach((m) => { w.S.paid[`${id}|2028-${String(m).padStart(2, "0")}-05`] = 1; });
  w.S.paid = {}; w.S.skip = {};
  paidAll(1);
  w.S.paid["2|2028-09-05"] = 1; w.S.paid["2|2028-10-05"] = 1;
  [9, 10, 11, 12].forEach((m) => { w.S.skip[`3|2028-${String(m).padStart(2, "0")}-05`] = 1; });
  w.S.paid["4|2028-10-10"] = 1;
  w.S.paid["6|2028-09-05"] = 1; w.S.paid["6|2028-10-05"] = 1; w.S.paid["6|2028-11-05"] = 1; w.S.skip["6|2028-12-05"] = 1;
  w.renderAll(); w.tab("jadwal"); await tick();
  const row = (id) => w.document.querySelector(`#tab-jadwal tr[data-r="${id}"]`);
  const done = (id) => row(id).classList.contains("done");

  ok(done(1), "semua tagihan lunas (Sep-Des): baris bertanda 'done'");
  ok(!done(2), "sebagian lunas: tidak ada efek");
  ok(!done(3), "semua dilewati (tidak ada yang lunas): tidak diberi efek 'lunas'");
  ok(done(4), "item sekali saja yang sudah lunas: ada efek");
  ok(!done(5), "item sekali saja yang belum lunas: tidak ada efek");
  ok(done(6), "lunas semua + sisanya dilewati (tidak ada tagihan tersisa): ada efek");
  ok(row(1).querySelector(".st.ok") && row(1).querySelector(".st.ok").getAttribute("aria-label") === "Lunas semua", "ikon centang berlabel 'Lunas semua' di samping nama");
  ok(/Lunas semua/.test(row(1).querySelector(".doneTag").textContent) && !row(2).querySelector(".doneTag"), "tag 'Lunas semua' hanya pada baris yang selesai");
  ok(/4\/4 lunas/.test(row(1).textContent) && /2\/4 lunas/.test(row(2).textContent), "keterangan jumlah lunas tetap benar (4/4 vs 2/4)");
  const idx = [...w.document.querySelectorAll("#tab-jadwal tr.done")].map((r) => r.style.getPropertyValue("--i"));
  ok(new Set(idx).size === idx.length && idx.length === 3, "tiap baris selesai punya indeks sendiri (efek muncul berurutan): " + idx.join(","));

  // dinamis: tandai tagihan terakhir 'Sebagian' lunas -> baris jadi selesai; batalkan -> kembali biasa
  w.S.paid["2|2028-11-05"] = 1; w.S.paid["2|2028-12-05"] = 1; w.renderAll(); await tick();
  ok(done(2), "setelah tagihan terakhir ditandai lunas: efek muncul");
  delete w.S.paid["2|2028-12-05"]; w.renderAll(); await tick();
  ok(!done(2), "bila ada tagihan yang belum lunas lagi: efek hilang");

  const css = [...w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  ok(/sched-table tr\.done td/.test(css) && /var\(--emerald-soft\)/.test(css), "gaya baris lunas di jadwal memakai latar hijau lembut");
  ok(/\.st\s*\{/.test(css) && /\.st\.ok/.test(css), "ikon status .st.ok tersedia di CSS");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
