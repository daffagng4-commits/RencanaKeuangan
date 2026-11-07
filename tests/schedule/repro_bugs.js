const assert = require("assert");
const { loadEngine } = require("./engine.js");
const E = loadEngine();

const END = Date.UTC(2028, 11, 31);
const iso = (t) => E.isoD(t);
const ser = (it) => E.series(it, END).map(iso);

console.log("=== Menguji Bug dari Laporan ===");

// 1. Bug 1: Geser 13 Jan ke 12 Jan, lalu ubah harga mulai 9 Mar
{
  const it = { id: 1, name: "Kuota", price: 100000, start: "2026-10-21", n: 28, unit: "hari", ch: [] };
  // Geser 13 Jan ke 12 Jan (anchor)
  it.ch = [{ from: "2027-01-13", anchor: "2027-01-12", to: "", price: null, n: 28, unit: "hari" }];
  const sBeforePrice = ser(it);
  console.log("Jadwal setelah geser ke 12 Jan:", sBeforePrice.slice(0, 7).join(", "));
  // Ubah harga 60.000 mulai 9 Mar
  it.ch.push({ from: "2027-03-09", price: 60000, to: "", n: null, unit: null });
  const sAfterPrice = ser(it);
  console.log("Jadwal setelah harga diubah di 9 Mar:", sAfterPrice.slice(0, 7).join(", "));
  const bug1Revert = sAfterPrice.includes("2027-03-10");
  console.log("Bug 1 (jadwal kembali ke tanggal awal 10 Mar):", bug1Revert ? "TERBUKTI BUG!" : "Lolos");

  // Varian tanggal terpilih 9 Feb
  const itSelected = { id: 1, name: "Kuota", price: 100000, start: "2026-10-21", n: 28, unit: "hari", ch: [] };
  itSelected.ch = [
    { from: "2027-01-13", anchor: "2027-01-12", to: "", price: null, n: 28, unit: "hari" },
    { from: "2027-02-09", to: "2027-02-09", dates: ["2027-02-09"], price: 60000, n: null, unit: null }
  ];
  const sSel = ser(itSelected);
  console.log("Jadwal varian tanggal terpilih 9 Feb:", sSel.slice(0, 6).join(", "));
  console.log("Bug 1 varian (9 Feb hilang):", !sSel.includes("2027-02-09") ? "TERBUKTI BUG!" : "Lolos");
}

// 2. Bug 9: Batas 12 kali digeser oleh cut
{
  const it = { id: 2, name: "Cicilan", price: 100000, start: "2027-01-01", n: 1, unit: "bulan", cnt: 12, ch: [] };
  // Cut sebelum 1 Jul (6 tagihan Jan-Jun dipotong)
  it.ch = [{ from: "2027-07-01", cut: true, to: "", price: null, n: null, unit: null }];
  const s = ser(it);
  console.log("Jadwal 12 kali dipotong 1 Jul (panjang):", s.length, "Tagihan terakhir:", s[s.length - 1]);
  console.log("Bug 9 (sisa 6 tagihan malah jadi 12 tagihan sampai 2028):", s.length === 12 ? "TERBUKTI BUG!" : "Lolos");
}

// 3. Bug 10: Harga mengikuti tanggal asli (20 Jun dapat harga 25 Jun)
{
  const it = { id: 3, name: "Sewa", price: 100000, start: "2027-01-25", n: 1, unit: "bulan", ch: [] };
  // Tagihan 25 Jun digeser ke 20 Jun (mv)
  it.ch = [
    { from: "2027-06-25", to: "2027-06-25", price: null, n: null, unit: null, cut: false, mv: { "2027-06-25": "2027-06-20" } },
    { from: "2027-06-25", price: 150000, to: "", n: null, unit: null }
  ];
  const p20Jun = E.priceAt(it, Date.parse("2027-06-20T00:00:00Z"));
  console.log("Harga pada 20 Jun (seharusnya 100.000):", p20Jun);
  console.log("Bug 10 (20 Jun terkena harga 25 Jun):", p20Jun === 150000 ? "TERBUKTI BUG!" : "Lolos");
}

// 4. Bug 11: Siklus ekstrem
{
  const it = { id: 4, name: "Crash", price: 100000, start: "2027-01-01", n: 100000000, unit: "hari", ch: [] };
  try {
    const s = ser(it);
    console.log("Siklus ekstrem tidak melempar galat");
  } catch (e) {
    console.log("Bug 11 (ekstrem melempar exception): TERBUKTI BUG!", e.message);
  }
}
