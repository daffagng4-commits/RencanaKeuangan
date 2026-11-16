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
  // Uji dropdown #sm di dalam #yr-panel memakai position:fixed agar tidak terpotong scroll modal
  const smWrap = $("sm")._mselect;
  assert(smWrap, "#sm memakai custom .mselect");
  smWrap.getBoundingClientRect = () => ({ left: 200, top: 180, bottom: 220, width: 150 });
  smWrap.querySelector(".mselect-trigger").click();
  assert.strictEqual(smWrap.querySelector(".mselect-menu").style.position, "fixed", "dropdown di modal memakai position:fixed agar tidak kepotong kotak");
  w.closeAllPickersAndMenus(null);
  $("yr-done").click();

  // ============================
  // 5. Uji Utang & Piutang: tombol Lunas & Cicil auto-direct ke + Pemasukan & update sisa nominal
  // ============================
  w.tab("kas");
  P.tx.push({ id: "p_daffa", d: "2028-02-01", t: "-", amt: 300000, cat: "Makanan", note: "daffa", debt: 1, debtKind: "piutang", debtName: "daffa" });
  w.renderAll();
  await tick();
  const debtBox = $("debt-list");
  assert(debtBox.querySelector("[data-debt-pay='daffa']").textContent.trim() === "Lunas", "tombol pelunasan berlabel Lunas");
  const cicilBtn = debtBox.querySelector("[data-debt-cicil='daffa']");
  assert(cicilBtn && cicilBtn.textContent.trim() === "Cicil", "tombol Cicil tersedia di Utang & Piutang Aktif");
  cicilBtn.click();
  assert.strictEqual(w.BR_STATE.kasType, "+", "klik Cicil piutang otomatis mengarahkan form ke + Pemasukan");
  assert.strictEqual($("kas-is-debt").checked, true, "checkbox Utang/Piutang otomatis tercentang");
  assert.strictEqual($("kas-debt-kind").value, "bayar-piutang", "jenis otomatis bayar-piutang");
  assert.strictEqual($("kas-debt-person").value, "daffa", "nama orang otomatis daffa");
  $("kas-amount").value = "100000";
  fire($("kas-amount"), "input");
  $("kas-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await tick();
  assert($("debt-list").textContent.includes("200.000"), "nominal sisa di Utang & Piutang Aktif otomatis menjadi Rp 200.000");
  assert($("kas-history-list").textContent.includes("Sisa Rp 200.000"), "keterangan sisa di Riwayat Transaksi otomatis terupdate Sisa Rp 200.000");

  console.log("\nSemua assertion saldo realtime dan catatan kas berhasil!");
  process.exit(0);
})().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
