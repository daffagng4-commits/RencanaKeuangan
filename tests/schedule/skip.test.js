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
  w.S.startMonth = 0; w.S.smManual = true; // pin Januari supaya chip Jan-Jun tampil
  w.S.items = [{ id: 21, name: "Internet", price: 300000, start: "2028-01-05", n: 1, unit: "bulan", ch: [] }];
  w.S.paid = { "21|2028-02-05": 1 };
  w.S.skip = { "21|2028-03-05": 1 };
  w.renderAll(); w.tab("jadwal"); await tick();
  const chip = (d) => w.document.querySelector(`#tab-jadwal .dt-chip[data-chip-it="21"][data-chip-iso="${d}"]`);

  ok(chip("2028-01-05").classList.contains("late") && chip("2028-01-05").classList.contains("old"), "lupa & sudah lama (> 45 hari): merah (late old)");
  ok(chip("2028-06-05").classList.contains("late") && !chip("2028-06-05").classList.contains("old"), "lupa & baru (15 hari): merah (late)");
  ok(chip("2028-05-05").classList.contains("late"), "terlewat 46 hari: tetap merah");
  ok(!chip("2028-07-05").classList.contains("late"), "tanggal yang belum lewat tidak merah");
  ok(chip("2028-02-05").classList.contains("paid") && !chip("2028-02-05").classList.contains("late"), "yang sudah dibayar tidak merah");
  ok(chip("2028-03-05").classList.contains("skipped"), "yang dilewati bertanda skipped");
  ok(/terlewat 15 hari/.test(chip("2028-06-05").title), "tooltip menyebut berapa hari terlewat: " + chip("2028-06-05").title.split(" - ").pop());

  const css = [...w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  ok(/\.dt-chip\.skipped\s*\{[^}]*line-through/.test(css), "gaya: dilewati dicoret (line-through)");
  ok(/\.dt-chip\.late\s*\{[^}]*var\(--crimson\)/.test(css), "gaya: terlewat = merah (--crimson)");

  // alur: klik tagihan lupa -> popover -> Lewati
  const before = JSON.stringify(w.S.skip);
  click(chip("2028-06-05")); await tick();
  const menu = $("chip-popover");
  ok(menu.classList.contains("open") && menu.querySelector('button[data-cp-act="skip"]'), "klik chip membuka menu status #chip-popover");
  let vib = null; w.navigator.vibrate = (p) => { vib = p; return true; };
  click(menu.querySelector('button[data-cp-act="skip"]')); await tick();
  ok(w.S.skip["21|2028-06-05"] === 1, "memilih Lewati: status tersimpan");
  const c2 = chip("2028-06-05");
  ok(c2.classList.contains("skipped"), "chip berubah jadi 'skipped'");
  ok(vib && vib.length === 3, "getaran haptic dipicu (pola 25-35-25 ms)");
  ok(!$("tt").hidden && /Dilewati: Internet/.test($("ttm").textContent) && !$("ttu").hidden, "toast 'Dilewati: Internet · ...' muncul dengan tombol Urungkan");

  // urungkan
  click($("ttu")); await tick();
  ok(JSON.stringify(w.S.skip) === before && chip("2028-06-05").classList.contains("late"), "Urungkan: kembali ke status terlewat (merah) seperti semula");

  // memilih status lain
  click(chip("2028-06-05")); await tick();
  click($("chip-popover").querySelector('button[data-cp-act="paid"]')); await tick();
  ok(chip("2028-06-05").classList.contains("paid"), "ditandai dibayar: tidak merah");

  ok(t.errs.length === 0, "tidak ada galat JavaScript: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
