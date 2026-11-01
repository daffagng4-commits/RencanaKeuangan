// Uji tampilan merah: tagihan terlewat (lupa) dan dilewati, plus umpan balik saat menekan "Lewati".
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));
  w.__today = "2028-06-20";
  w.switchYear(2028);
  w.S.items = [{ id: 21, name: "Internet", price: 300000, start: "2028-01-05", n: 1, unit: "bulan", ch: [] }];
  w.S.paid = { "21|2028-02-05": 1 };
  w.S.skip = { "21|2028-03-05": 1 };
  w.renderAll(); w.tab("jadwal"); await tick();
  const chip = (d) => w.document.querySelector(`.pd[data-pk="21|${d}"]`);

  ok(chip("2028-01-05").classList.contains("late") && chip("2028-01-05").classList.contains("old"), "lupa & sudah lama (> 45 hari): merah (late old)");
  ok(chip("2028-06-05").classList.contains("late") && !chip("2028-06-05").classList.contains("old"), "lupa & baru (15 hari): merah menyala berdenyut (late)");
  ok(chip("2028-05-05").classList.contains("late"), "terlewat 46 hari: tetap merah");
  ok(!chip("2028-07-05").classList.contains("late"), "tanggal yang belum lewat tidak merah");
  ok(chip("2028-02-05").classList.contains("on") && !chip("2028-02-05").classList.contains("late"), "yang sudah dibayar tidak merah");
  ok(chip("2028-03-05").classList.contains("skp"), "yang dilewati bertanda skp");
  ok(/terlewat 15 hari/.test(chip("2028-06-05").title), "tooltip menyebut berapa hari terlewat: " + chip("2028-06-05").title.split(" - ").pop());

  const css = [...w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  const rule = (sel) => (css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{[^}]*\\}")) || [""])[0];
  ok(/color:\s*var\(--wr\)/.test(rule(".pd.skp")) && /line-through/.test(rule(".pd.skp")), "gaya: dilewati = merah (--wr) dan dicoret");
  ok(/color:\s*var\(--wr\)/.test(rule(".pd.late")) && /border-color:\s*var\(--wr\)/.test(rule(".pd.late")), "gaya: terlewat = merah (teks dan garis tepi)");
  ok(/animation:\s*skipfx/.test(css) && /prefers-reduced-motion/.test(css), "efek getar merah ada dan dimatikan oleh 'kurangi animasi'");

  // alur: klik tagihan lupa -> menu -> Lewati
  const before = JSON.stringify(w.S.skip);
  click(chip("2028-06-05")); await tick();
  const menu = $("cm");
  ok(!menu.hidden && menu.querySelector('button[data-st="skip"]'), "klik chip membuka menu status");
  let vib = null; w.navigator.vibrate = (p) => { vib = p; return true; };
  click(menu.querySelector('button[data-st="skip"]')); await tick();
  ok(w.S.skip["21|2028-06-05"] === 1, "memilih Lewati: status tersimpan");
  const c2 = chip("2028-06-05");
  ok(c2.classList.contains("skp") && c2.classList.contains("fx-skip"), "chip berubah jadi 'dilewati' dengan efek getar merah (fx-skip)");
  ok(vib && vib.length === 3, "getaran haptic dipicu (pola 25-35-25 ms)");
  ok(!$("tt").hidden && /Dilewati: Internet/.test($("ttm").textContent) && !$("ttu").hidden, "toast 'Dilewati: Internet · ...' muncul dengan tombol Urungkan");
  await new Promise((r) => setTimeout(r, 1000));
  w.renderAll(); await tick();
  ok(!chip("2028-06-05").classList.contains("fx-skip"), "efek getar hilang sendiri (tidak berulang saat tampil ulang)");

  // urungkan
  click($("ttu")); await tick();
  ok(JSON.stringify(w.S.skip) === before && chip("2028-06-05").classList.contains("late"), "Urungkan: kembali ke status terlewat (merah) seperti semula");

  // memilih status lain tidak memicu efek lewati
  click(chip("2028-06-05")); await tick();
  click($("cm").querySelector('button[data-st="paid"]')); await tick();
  ok(chip("2028-06-05").classList.contains("on") && !chip("2028-06-05").classList.contains("fx-skip"), "ditandai dibayar: tidak merah dan tanpa efek getar");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
