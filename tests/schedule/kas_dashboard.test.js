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

  let heroRincian = $("v-rincian").querySelector(".hero").textContent;
  console.log("Rincian Hero (Belum Lunas):\n", heroRincian);

  assert(heroRincian.includes("4.550.000"), "Rincian: Saldo harus Rp 4.550.000 saat tagihan belum lunas");
  assert(heroRincian.includes("Realtime"), "Rincian: Harus ada keterangan Realtime");
  assert(heroRincian.includes("Januari"), "Rincian: Harus ada keterangan bulan Januari");
  assert(/masuk Rp 50\.000/.test(heroRincian), "Rincian: Masuk harus Rp 50.000");
  assert(/keluar Rp 500\.000/.test(heroRincian), "Rincian: Keluar harus Rp 500.000");

  // ============================
  // 2. Sekarang tandai tagihan 1 Jan 2028 sebagai LUNAS
  // ============================
  w.S.paid["item1|2028-01-01"] = 1;
  w.renderAll();
  await tick();

  heroRincian = $("v-rincian").querySelector(".hero").textContent;
  console.log("\nRincian Hero (Sudah Lunas):\n", heroRincian);

  // Saldo harus 5.000.000 - 500.000 + 50.000 - 200.000 = 4.350.000
  assert(heroRincian.includes("4.350.000"), "Rincian: Saldo harus Rp 4.350.000 saat tagihan lunas");
  assert(/keluar Rp 700\.000/.test(heroRincian), "Rincian: Keluar harus Rp 700.000 setelah tagihan 200rb lunas");

  // ============================
  // 3. Uji pada Tab Catatan Kas (verifikasi baris transaksi)
  // ============================
  w.tab("kas");
  w.renderAll();
  await tick();

  const kasText = $("v-kas").textContent;
  assert(kasText.includes("Belanja"), "Kas: Harus ada riwayat Belanja (-500rb)");
  assert(kasText.includes("Bonus"), "Kas: Harus ada riwayat Bonus (+50rb)");
  assert(kasText.includes("Tagihan Listrik"), "Kas: Harus ada riwayat Tagihan Listrik lunas");

  // ============================
  // 4. Uji ganti bulan saldo (misal Februari)
  // ============================
  w.S.startMonth = 1; // Februari
  w.renderAll();
  await tick();
  heroRincian = $("v-rincian").querySelector(".hero").textContent;
  assert(heroRincian.includes("Februari"), "Rincian: Keterangan bulan harus Februari saat startMonth = 1");

  console.log("\nSemua assertion saldo realtime dan catatan kas berhasil!");
  process.exit(0);
})().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
