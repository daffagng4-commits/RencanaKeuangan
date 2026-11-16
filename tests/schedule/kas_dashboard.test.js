// Uji Saldo Utama Realtime pada Dashboard (Rincian Bulanan) & Catatan Kas
const assert = require("assert");
const { boot } = require("./ui.js");

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, fire } = t;
  const tick = () => new Promise((r) => setTimeout(r, 30));

  w.switchYear(2028);
  w.S.startMonth = 0; // Januari
  w.S.saldo = 5000000;
  w.S.items = [{ id: "item1", name: "Tagihan Listrik", price: 200000, start: "2028-01-01", every: { n: 1, unit: "m" } }];
  w.S.paid = {};
  w.S.skip = {};

  const P = w.kasLinked();
  assert(P, "Profil terhubung (Utama) harus ada");
  P.tx = [
    { id: "tx1", d: "2028-01-01", t: "-", amt: 500000, cat: "Pengeluaran", note: "Belanja" },
    { id: "tx2", d: "2028-01-01", t: "+", amt: 50000, cat: "Pemasukan", note: "Bonus" },
  ];

  // ============================
  // 1. Uji pada Tab Rincian (Dashboard Utama)
  // ============================
  w.tab("rincian");
  w.renderAll();
  await tick();

  let saldoRincian = $("rincian-saldo-now").textContent;
  console.log("Rincian Saldo (Belum Lunas):", saldoRincian);

  assert(saldoRincian.includes("4.550.000"), "Rincian: Saldo harus Rp 4.550.000 saat tagihan belum lunas");
  const rincianText = $("tab-rincian").textContent;
  assert(rincianText.includes("Realtime"), "Rincian: Harus ada keterangan Realtime");
  assert($("metric-daily-lbl").textContent.includes("Des"), "Rincian: Jatah jajan tahun 2028 aktif");

  // ============================
  // 2. Sekarang tandai tagihan 1 Jan 2028 sebagai LUNAS
  // ============================
  w.S.paid["item1|2028-01-01"] = 1;
  w.renderAll();
  await tick();

  saldoRincian = $("rincian-saldo-now").textContent;
  console.log("\nRincian Saldo (Sudah Lunas):", saldoRincian);

  // Saldo harus 5.000.000 - 500.000 + 50.000 - 200.000 = 4.350.000
  assert(saldoRincian.includes("4.350.000"), "Rincian: Saldo harus Rp 4.350.000 saat tagihan lunas");

  // ============================
  // 3. Uji pada Tab Catatan Kas (verifikasi baris transaksi)
  // ============================
  w.tab("kas");
  w.renderAll();
  await tick();

  const kasText = $("tab-kas").textContent;
  assert(kasText.includes("Belanja"), "Kas: Harus ada riwayat Belanja (-500rb)");
  assert(kasText.includes("Bonus"), "Kas: Harus ada riwayat Bonus (+50rb)");
  assert(kasText.includes("Tagihan Listrik"), "Kas: Harus ada riwayat Tagihan Listrik lunas");

  // ============================
  // 4. Uji ganti bulan saldo (misal Februari)
  // ============================
  w.S.startMonth = 1; // Februari
  w.renderAll();
  await tick();
  assert.strictEqual($("rincian-saldo-now").textContent, "Rp 4.350.000", "Rincian: Saldo tetap konsisten setelah ganti startMonth");
  $('yr-btn').click();
  assert($("yr-sum").textContent.includes("Feb"), "Ringkasan tahun/bulan memuat Feb saat startMonth = 1");

  console.log("\nSemua assertion saldo realtime dan catatan kas berhasil!");
  process.exit(0);
})().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
