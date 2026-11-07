const assert = require("assert");
const { boot } = require("./ui");

(async () => {
  console.log("=== Menguji Modal Ubah Harga / Jadwal untuk Item 'Sekali Saja' ===");
  const { w, $, click, fire } = boot();

  const itemSekali = {
    id: 888,
    name: "Tiket Konser",
    price: 500000,
    start: "2026-11-20",
    unit: "sekali",
    n: 1,
    ch: []
  };
  w.S.items.push(itemSekali);

  // 1. Buka modal openPm untuk item sekali saja
  w.openPm(888);
  assert.strictEqual($("pm").hidden, false, "Modal #pm harus terbuka");

  // Periksa semua tombol opsi di #psc
  const buttons = Array.from(w.document.querySelectorAll("#psc button"));
  const btnMap = {};
  buttons.forEach(b => {
    btnMap[b.dataset.sc] = b.hidden;
  });

  console.log("Status hidden tombol #psc:", btnMap);

  assert.strictEqual(btnMap["harga"], false, "Tombol 'Harga berubah' harus terlihat");
  assert.strictEqual(btnMap["siklus"], false, "Tombol 'Ganti seberapa sering bayar' harus terlihat");
  assert.strictEqual(btnMap["geser"], false, "Tombol 'Geser tanggal bayar' harus terlihat");
  assert.strictEqual(btnMap["manual"], false, "Tombol 'Atur manual' harus terlihat");
  console.log("OK: Keempat tombol opsi muncul untuk item sekali saja.");

  // 2. Uji 'Geser tanggal bayar' (geser ke tanggal lebih lambat)
  click(w.document.querySelector('#psc button[data-sc="geser"]'));
  assert.strictEqual($("pform").hidden, false, "Form harus muncul");
  assert.strictEqual($("g-price").hidden, true, "Isian harga harus tersembunyi saat geser");

  // Geser dari 2026-11-20 ke 2026-12-05
  $("pdt").value = "2026-12-05";
  fire($("pdt"), "input");
  click($("pps")); // Simpan

  let dates = w.occ(itemSekali, 2026).map(w.isoD);
  console.log("Tanggal setelah geser ke 2026-12-05:", dates);
  assert.strictEqual(dates[0], "2026-12-05", "Tanggal harus bergeser ke 2026-12-05");
  assert.strictEqual(dates.length, 1);

  // 3. Uji 'Geser tanggal bayar' ke tanggal lebih awal (misal 2026-11-10)
  w.openPm(888);
  click(w.document.querySelector('#psc button[data-sc="geser"]'));
  $("pdt").value = "2026-11-10";
  fire($("pdt"), "input");
  click($("pps")); // Simpan

  dates = w.occ(itemSekali, 2026).map(w.isoD);
  console.log("Tanggal setelah geser lebih awal ke 2026-11-10:", dates);
  assert.strictEqual(dates[0], "2026-11-10", "Tanggal harus bisa digeser lebih awal");
  assert.strictEqual(dates.length, 1);

  // 4. Uji 'Ganti seberapa sering bayar' (dari sekali menjadi tiap 1 bulan)
  w.openPm(888);
  click(w.document.querySelector('#psc button[data-sc="siklus"]'));
  assert.strictEqual($("pcad").hidden, false, "Isian seberapa sering bayar (#pcad) harus terlihat");

  $("pn").value = "1";
  $("pu").value = "bulan";
  fire($("pn"), "input");
  fire($("pu"), "change");
  click($("pps")); // Simpan

  let dates2026 = w.occ(itemSekali, 2026).map(w.isoD);
  console.log("Tanggal 2026 setelah ubah jadi tiap 1 bulan:", dates2026);
  assert.strictEqual(dates2026.length >= 2, true, "Harus menghasilkan jadwal berulang tiap bulan");

  console.log("\nSemua pengujian opsi item 'sekali saja' BERHASIL!");

  process.exit(0);
})();
