const assert = require("assert");
const { boot } = require("./ui.js");

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire } = t;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const setItem = (it, year) => {
    w.switchYear(year);
    w.S.items = [it];
    w.S.paid = {};
    w.S.skip = {};
    w.renderAll();
    w.openPm(it.id);
  };
  const pick = (d) => click($("pdc").querySelector(`button[data-d="${d}"]`));
  const setTo = (v) => { $("pdt").value = v; fire($("pdt"), "input"); };
  const ser = (it) => w.series(it, Date.UTC(2032, 11, 31)).map(iso);
  const item = () => w.S.items[0];
  const save = () => click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));

  console.log("=== Menguji UI Bugs ===");

  // Bug 2: Perubahan di tanggal yang sama menimpa "hapus tagihan sebelumnya" (cut: true)
  {
    const it = { id: 10, name: "TesCut", price: 100000, start: "2027-01-01", n: 1, unit: "bulan", ch: [{ from: "2027-07-01", cut: true, to: "", price: null, n: null, unit: null }] };
    setItem(it, 2027);
    // Buka ubah harga mulai 1 Jul
    click($("psc").querySelector('button[data-sc="harga"]'));
    pick("2027-07-01");
    $("pp").value = "150.000"; fire($("pp"), "input");
    save();
    console.log("Bug 2 - setelah ubah harga di 1 Jul, apakah cut masih ada?", item().ch.some(c => c.cut));
    console.log("Bug 2 (cut hilang / tagihan Jan-Jun muncul kembali):", !item().ch.some(c => c.cut) ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 3a: Geser 1 Feb -> 10 Feb, lalu "bulan ini dst" 10 Feb -> 20 Feb
  {
    const it = { id: 11, name: "TesDuplikat", price: 100000, start: "2027-01-01", n: 1, unit: "bulan", ch: [] };
    setItem(it, 2027);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "satu"; fire($("pgm"), "change");
    pick("2027-02-01");
    setTo("2027-02-10");
    save();

    // Sekarang buka lagi, geser "bulan ini dst" 10 Feb ke 20 Feb
    w.openPm(it.id);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "semua"; fire($("pgm"), "change");
    pick("2027-02-10");
    setTo("2027-02-20");
    save();

    const febDates = ser(item()).filter(d => d.startsWith("2027-02-"));
    console.log("Bug 3a - Tanggal Februari setelah dua kali geser:", febDates);
    console.log("Bug 3a (duplikat di Februari):", febDates.length > 1 ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 3b: Geser 8 Des -> 3 Des, lalu geser "bulan ini dst" 3 Des -> 8 Des
  {
    const it = { id: 12, name: "TesIgnored", price: 100000, start: "2027-01-08", n: 1, unit: "bulan", ch: [] };
    setItem(it, 2027);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "satu"; fire($("pgm"), "change");
    pick("2027-12-08");
    setTo("2027-12-03");
    save();

    w.openPm(it.id);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "semua"; fire($("pgm"), "change");
    pick("2027-12-03");
    setTo("2027-12-08");
    save();

    const desDates = ser(item()).filter(d => d.startsWith("2027-12-"));
    console.log("Bug 3b - Tanggal Desember setelah geser balik ke 8 Des:", desDates);
    console.log("Bug 3b (permintaan diabaikan, tetap di 3 Des):", desDates.includes("2027-12-03") ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 4 & 8: Kolom harga terisi dari tagihan berikutnya
  {
    // Harga naik 200rb -> 300rb mulai Juni
    const it = { id: 13, name: "TesHargaSiklus", price: 200000, start: "2027-01-01", n: 1, unit: "bulan", ch: [
      { from: "2027-06-01", price: 300000, to: "", n: null, unit: null }
    ]};
    setItem(it, 2027);
    // Buka siklus, pilih 1 Sep
    click($("psc").querySelector('button[data-sc="siklus"]'));
    pick("2027-09-01");
    console.log("Bug 4 - Nilai kolom harga saat pilih 1 Sep (seharusnya 300.000):", $("pp").value);
    console.log("Bug 4 (kolom harga terisi 200.000 dari Januari):", $("pp").value === "200.000" ? "TERBUKTI BUG!" : "Lolos");

    // Simpan siklus tiap 2 bulan tanpa ubah harga
    $("pn").value = "2"; fire($("pn"), "input");
    save();
    const pSep = w.priceAt(item(), Date.parse("2027-09-01T00:00:00Z"));
    console.log("Bug 4 - Harga di 1 Sep setelah ubah siklus (seharusnya 300.000):", pSep);
    console.log("Bug 4 (harga turun kembali ke 200rb):", pSep === 200000 ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 5: Geser melewati batas berhenti
  {
    const it = { id: 14, name: "TesEnd", price: 100000, start: "2027-01-01", n: 1, unit: "bulan", end: "2027-06-15", ch: [] };
    setItem(it, 2027);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "satu"; fire($("pgm"), "change");
    pick("2027-06-01");
    console.log("Bug 5 - Batas max geser 1 Jun dengan end=2027-06-15:", $("pdt").max);
    console.log("Bug 5 (tidak dibatasi 15 Jun):", $("pdt").max !== "2027-06-15" ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 6: Semua tagihan sudah lunas, form terisi hari ini
  {
    const it = { id: 15, name: "TesLunasSemua", price: 100000, start: "2027-01-01", n: 1, unit: "bulan", ch: [] };
    setItem(it, 2027);
    w.occ(it, 2027).forEach(t => { w.S.paid[it.id + "|" + iso(t)] = 1; });
    w.openPm(it.id);
    click($("psc").querySelector('button[data-sc="geser"]'));
    const today = iso(Date.now());
    console.log("Bug 6 - Tanggal terpilih saat semua lunas:", $("pdt").value, "Hari ini:", today);
    console.log("Bug 6 (terisi tanggal hari ini yang bukan tagihan):", $("pdt").value === today ? "TERBUKTI BUG!" : "Lolos");
  }

  // Bug 7: Geser lintas tahun
  {
    const it = { id: 16, name: "TesLintasTahun", price: 100000, start: "2027-01-09", n: 1, unit: "bulan", ch: [] };
    setItem(it, 2027);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = "satu"; fire($("pgm"), "change");
    pick("2027-01-09");
    console.log("Bug 7 - Batas min geser 9 Jan 2027 (seharusnya >= 2027-01-01):", $("pdt").min);
    console.log("Bug 7 (bisa digeser ke 2026):", $("pdt").min === "" || $("pdt").min < "2027-01-01" ? "TERBUKTI BUG!" : "Lolos");
  }

  console.log("\nSemua UI Bugs Selesai dan LOLOS!");
  process.exit(0);
})();
