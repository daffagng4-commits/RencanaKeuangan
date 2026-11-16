// Uji daftar rincian bulan: baris lunas / terlewat / dilewati / mendatang punya penanda berbeda yang lembut.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  w.__today = "2028-11-12";
  w.switchYear(2028);
  const mk = (id, name, day, price) => ({ id, name, price, start: `2028-11-${day}`, n: 1, unit: "bulan", ch: [] });
  w.S.items = [mk(1, "Saham Lokal 40%", "05", 300000), mk(2, "JKT48", "05", 350000), mk(3, "Warp", "07", 15000), mk(4, "BPJS", "10", 150000),
    mk(5, "ETF 60%", "15", 1600000), mk(6, "Kuota", "17", 50000), mk(7, "Torbox", "24", 500000), mk(8, "BTC", "25", 200000), mk(9, "Netflix", "03", 70000)];
  w.S.paid = { "1|2028-11-05": 1, "4|2028-11-10": 1, "5|2028-11-15": 1, "8|2028-11-25": 1 };
  w.S.skip = { "9|2028-11-03": 1 };
  w.renderAll(); w.tab("rincian"); await tick();

  // buka rincian Nov lewat klik baris bulan
  const nov = w.document.querySelector('#monthly-flow-tbody tr[data-flow-m="10"]');
  ok(!!nov, "baris bulan November ada di tabel Rincian Arus Tagihan");
  click(nov); await tick();
  const drawer = $("flow-drawer-10");
  ok(drawer && drawer.style.display !== "none", "drawer November terbuka");
  const rows = [...drawer.querySelectorAll(".badge")];
  ok(rows.length === 9, "9 tagihan muncul untuk November (8 + 1 dilewati)");
  const by = (name) => rows.find((r) => r.textContent.includes(name));
  ok(["Saham Lokal", "BPJS", "ETF 60%", "BTC"].every((n) => by(n).classList.contains("badge-emerald")), "4 tagihan lunas bertanda badge-emerald");
  ok(["JKT48", "Warp"].every((n) => by(n).classList.contains("badge-crimson")), "yang terlewat tapi belum lunas bertanda badge-crimson");
  ok(["Kuota", "Torbox"].every((n) => by(n).classList.contains("badge-amber")), "yang belum jatuh tempo bertanda badge-amber");
  ok(by("Netflix").classList.contains("badge-neutral"), "yang dilewati bertanda badge-neutral");

  const css = [...w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  ok(/\.badge-emerald/.test(css) && /\.badge-crimson/.test(css) && /\.badge-amber/.test(css), "gaya lencana status lunas/terlewat/mendatang ada di CSS");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
