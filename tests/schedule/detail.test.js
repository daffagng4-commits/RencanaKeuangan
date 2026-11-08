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
  const nov = w.document.querySelector('#v-rincian tr.row[data-m="10"]');
  click(nov); await tick();
  const rows = [...w.document.querySelectorAll("#v-rincian tr.det")];
  ok(rows.length === 9, "9 baris rincian muncul untuk November (8 + 1 dilewati)");
  const by = (name) => rows.find((r) => r.textContent.includes(name));
  const cls = (name) => by(name).className.replace("det", "").trim();
  ok(["Saham Lokal", "BPJS", "ETF 60%", "BTC"].every((n) => cls(n) === "paid"), "4 tagihan lunas bertanda 'paid'");
  ok(["JKT48", "Warp"].every((n) => cls(n) === "late"), "yang sudah lewat tanggal tapi belum lunas (JKT48, Warp) bertanda 'late'");
  ok(["Kuota", "Torbox"].every((n) => cls(n) === ""), "yang belum jatuh tempo (Kuota, Torbox) netral tanpa efek");
  ok(cls("Netflix") === "skp", "yang dilewati bertanda 'skp'");

  const ico = (name) => by(name).querySelector(".st");
  ok(ico("BPJS").textContent === "✓" && ico("BPJS").classList.contains("ok") && ico("BPJS").getAttribute("aria-label") === "Lunas", "ikon lunas: centang terisi, berlabel 'Lunas'");
  ok(ico("Warp").textContent === "!" && ico("Warp").getAttribute("aria-label") === "Terlewat", "ikon terlewat: tanda seru, berlabel 'Terlewat'");
  ok(ico("Kuota").textContent === "" && ico("Kuota").getAttribute("aria-label") === "Belum dibayar", "ikon belum dibayar: lingkaran kosong");
  ok(ico("Netflix").textContent === "–" && ico("Netflix").classList.contains("skp"), "ikon dilewati: tanda strip, lingkaran putus-putus");
  ok(new Set(rows.map((r) => r.style.getPropertyValue("--i"))).size === rows.length, "tiap baris punya indeks sendiri untuk efek muncul berurutan");
  ok(rows.every((r) => r.querySelector(".st")), "setiap baris punya ikon status: kolom tanggal tetap sejajar");

  const css = [...w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  const rule = (sel) => (css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{[^}]*\\}")) || [""])[0];
  ok(/var\(--ins\)/.test(rule(".det.paid td")) && /inset 3px 0 0 var\(--in\)/.test(rule(".det.paid td:first-child")), "gaya lunas: latar hijau lembut (--ins) + garis tepi kiri hijau (--in)");
  ok(/var\(--wrs\)/.test(rule(".det.late td")) && /inset 3px 0 0 var\(--wr\)/.test(rule(".det.late td:first-child")), "gaya terlewat: latar merah lembut (--wrs) + garis tepi kiri merah");
  ok(!/\.det\.late td\.l\s*\{/.test(css), "nama dan harga baris terlewat tidak diwarnai merah penuh (hanya tanggal) agar tidak melelahkan mata");
  ok(/@keyframes stpop/.test(css) && /@keyframes detin/.test(css) && /prefers-reduced-motion[\s\S]{0,200}\.det/.test(css), "animasi muncul berurutan + centang membal sekali; dimatikan oleh 'kurangi animasi'");
  ok(!/infinite/.test(rule(".det")) && !/infinite/.test(rule(".det.paid .st.ok")), "efek baris rincian tidak berulang terus-menerus (tidak berkedip)");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
