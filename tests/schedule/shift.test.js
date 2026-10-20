// Uji mesin jadwal untuk "geser tanggal bayar" pada semua jenis siklus dan arah geser.
const assert = require("assert");
const { loadEngine } = require("./engine.js");
const E = loadEngine();
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; };
const END = Date.UTC(2029, 11, 31);
const iso = (t) => E.isoD(t);
const ser = (it) => E.series(it, END).map(iso);
const addDays = (d, n) => E.addDaysISO(d, n);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- 1. Kasus pengguna: Kuota tiap 28 hari, 18 Nov digeser ke 17 Nov
{
  const it = { id: 1, name: "Kuota", price: 100000, start: "2026-10-21", n: 28, unit: "hari", ch: [] };
  it.ch = [{ from: "2026-11-18", anchor: "2026-11-17", to: "", price: null, n: 28, unit: "hari" }];
  const s = ser(it).slice(0, 5);
  ok(s.join() === "2026-10-21,2026-11-17,2026-12-15,2027-01-12,2027-02-09", "kasus pengguna: 21 Okt, 17 Nov, 15 Des, 12 Jan, 9 Feb");
  const nov = E.occ(it, 2026).filter((t) => new Date(t).getUTCMonth() === 10).map(iso);
  ok(nov.length === 1 && nov[0] === "2026-11-17", "kolom Nov menampilkan 1 tagihan (17 Nov), tidak 0");
  console.log("ok - kasus pengguna (kolom Nov = 17 Nov)");
}

// ---- 2. Matriks: semua satuan x arah geser x mode
const items = [
  { n: 28, unit: "hari", start: "2026-10-21" }, { n: 7, unit: "hari", start: "2026-01-03" }, { n: 2, unit: "minggu", start: "2026-02-10" },
  { n: 1, unit: "bulan", start: "2026-01-31" }, { n: 1, unit: "bulan", start: "2026-01-15" }, { n: 3, unit: "bulan", start: "2026-02-28" },
  { n: 1, unit: "tahun", start: "2024-02-29" }, { n: 1, unit: "tahun", start: "2026-06-10" },
].map((x, i) => ({ id: i + 1, name: "T" + i, price: 100000, ch: [], ...x }));

let cases = 0;
for (const base of items) {
  const before = ser(base);
  for (const idx of [1, 2, 3]) {
    if (idx + 1 >= before.length) continue;
    const from = before[idx], prev = before[idx - 1], next = before[idx + 1];
    const gapPrev = (Date.parse(from) - Date.parse(prev)) / 864e5, gapNext = (Date.parse(next) - Date.parse(from)) / 864e5;
    const deltas = [];
    for (const d of [1, 2, 5, Math.floor(gapPrev / 2), gapPrev - 1]) if (d >= 1 && d < gapPrev) deltas.push(-d);
    for (const d of [1, 2, 5, Math.floor(gapNext / 2), gapNext - 1]) if (d >= 1 && d < gapNext) deltas.push(d);
    for (const delta of [...new Set(deltas)]) {
      const to = addDays(from, delta);
      // --- mode "bulan ini dan sesudahnya" (anchor)
      const it = clone(base);
      it.ch = [{ from, anchor: to, to: "", price: null, n: base.n, unit: base.unit }];
      const after = ser(it);
      const tag = `${base.n} ${base.unit} mulai ${base.start}, tagihan ke-${idx + 1} ${from} -> ${to}`;
      ok(after.slice(0, idx).join() === before.slice(0, idx).join(), "sebelum tanggal digeser tidak berubah: " + tag);
      ok(after[idx] === to, "tagihan yang digeser ada di tanggal baru: " + tag);
      ok(new Set(after).size === after.length && after.join() === [...after].sort().join(), "urut & tanpa duplikat: " + tag);
      ok(Math.abs(after.length - before.length) <= 1, "jumlah tagihan tidak berkurang: " + tag + ` (${before.length} -> ${after.length})`);
      const sub = { start: to, n: base.n, unit: base.unit };
      ok(after.slice(idx, idx + 6).join() === Array.from({ length: Math.min(6, after.length - idx) }, (_, k) => iso(E.at(sub, k))).join(), "tagihan sesudahnya mengikuti siklus dari tanggal baru: " + tag);
      // --- harga: perubahan harga berlaku mulai tagihan itu -> ikut ke tanggal baru
      const it2 = clone(base);
      it2.ch = [{ from, anchor: to, to: "", price: 120000, n: base.n, unit: base.unit }];
      ok(E.priceAt(it2, Date.parse(to)) === 120000, "harga baru berlaku di tanggal baru: " + tag);
      ok(E.priceAt(it2, Date.parse(prev)) === 100000, "harga tagihan sebelumnya tetap: " + tag);
      // --- status lunas/lewati ikut pindah
      const paid = { [`${base.id}|${from}`]: 1 };
      E.moveStatusExact(base.id, [[from, to]], [paid, {}]);
      E.remapStatus(base.id, before.map((d) => Date.parse(d)), after.map((d) => Date.parse(d)), [paid, {}]);
      ok(paid[`${base.id}|${to}`] === 1 && Object.keys(paid).length === 1, "status lunas pindah ke tanggal baru (persis, berapa pun jaraknya): " + tag);
      // --- mode "hanya satu bulan" (mv)
      const it3 = clone(base);
      it3.ch = [{ from, to: from, price: null, n: null, unit: null, cut: false, mv: { [from]: to } }];
      const one = ser(it3);
      ok(one.length === before.length && one[idx] === to && one.filter((d, i) => i !== idx).join() === before.filter((d, i) => i !== idx).join(), "mode satu bulan: hanya satu tanggal berpindah: " + tag);
      cases++;
    }
  }
}
console.log(`ok - matriks geser: ${cases} kasus (8 siklus x arah maju/mundur x 3 posisi), semua pengecekan lulus`);
console.log(`\n${pass} pengecekan lulus`);
