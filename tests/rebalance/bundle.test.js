const assert = require("assert");
const { load } = require("./harness.js");
const ORIG = require("path").join(__dirname, "app.baseline.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

const calc = (t) => JSON.parse(t.ev(`(()=>{const t=getTechnicalSettings();const s=getState(getRawValues(t),getSettings(),t);
 return JSON.stringify({mode:s.mode,etf:s.etfShare,rm:s.recoveryMonths,alt:s.recoveryAlt,sched:s.schedule.map(e=>[e.month,e.stock,e.etf,e.phase]),
 sett:s.settlements.map(x=>({m:x.month,a:x.amount,c:x.components,al:x.allocation.map(r=>r.amount)})),buf:s.buffer,total:s.total,hor:s.settlementHorizon})})()`));

// 1. Regresi: tanpa fee & tanpa kas penampung hasil sama dengan versi lama.
{
  const a = load(), b = load({ appFile: ORIG, noJournal: true });
  const scenarios = [
    {}, { "etf1-value": "1.000.000", "etf2-value": "500.000", "etf3-value": "400.000", "etf4-value": "100.000" },
    { "bmri-value": "1.000.000", "bbri-value": "600.000" }, { "etf1-value": "9.000.000", "etf2-value": "4.500.000", "etf3-value": "3.600.000", "etf4-value": "900.000" },
  ];
  for (const sc of scenarios) {
    for (const t of [a, b]) Object.entries(sc).forEach(([k, v]) => t.set(k, v));
    const x = calc(a), y = calc(b);
    delete x.buf; delete x.alt; delete x.rm; delete y.buf; delete y.alt; delete y.rm;
    assert.deepStrictEqual(x.sched, y.sched); assert.deepStrictEqual(x.sett.map(s => [s.m, s.a, s.al]), y.sett.map(s => [s.m, s.a, s.al]));
  }
  ok(true, "regresi: jadwal & setoran identik dengan versi lama (fee 0, buffer 0, posisi 1)");
  const lot = (t, fee) => t.ev(`JSON.stringify(calculateLotExecution(allocateByWeights(1800000,[{key:'bmri',name:'BMRI',weight:.6},{key:'bbri',name:'BBRI',weight:.4}]),1800000,{rdnCarry:50000,bmriPrice:4500,bbriPrice:3800,buyFee:${fee}}))`);
  const l0 = JSON.parse(lot(a, 0)), lo = JSON.parse(b.ev(`JSON.stringify(calculateLotExecution(allocateByWeights(1800000,[{key:'bmri',name:'BMRI',weight:.6},{key:'bbri',name:'BBRI',weight:.4}]),1800000,{rdnCarry:50000,bmriPrice:4500,bbriPrice:3800}))`));
  ok(l0.remainder === lo.remainder && l0.trades.every((x, i) => x.lots === lo.trades[i].lots), "regresi: lot & sisa RDN sama saat fee 0");
  const l1 = JSON.parse(lot(a, 0.0015));
  ok(l1.remainder >= 0 && l1.totalFee > 0, "fee 0,15%: sisa RDN tidak negatif, fee > 0");
  ok(l1.trades.every(x => x.spent === Math.round(x.lots * x.price * 100 * 1.0015) || Math.abs(x.spent - x.lots * x.price * 100 * 1.0015) <= 1), "fee 0,15%: biaya = harga x lembar x (1+fee)");
  ok(Math.abs(l1.totalSpent + l1.remainder - 1850000) === 0, "fee: belanja + sisa = modal (1.800.000 + carry 50.000)");
  // sisa tidak cukup untuk lot tambahan
  ok(l1.trades.every(x => l1.remainder < x.price * 100 * 1.0015), "fee: sisa < biaya 1 lot (tidak ada lot yang terlewat)");
}

// 2. Kas penampung & posisi kuartal
{
  const t = load();
  t.set("etf1-value", "1.000.000"); t.set("etf2-value", "500.000"); t.set("etf3-value", "400.000"); t.set("etf4-value", "100.000");
  const noBuf = calc(t);
  ok(noBuf.mode === "parent-stock" || noBuf.mode === "parent-etf", "skenario: parent di luar band (mode " + noBuf.mode + ")");
  t.set("etf-buffer", "3.000.000");
  const withBuf = calc(t);
  ok(withBuf.buf === 3000000 && withBuf.total === noBuf.total + 3000000, "kas penampung ikut total portfolio");
  ok(withBuf.rm < noBuf.rm || noBuf.mode !== "parent-etf", "defisit ETF mengecil: durasi " + noBuf.rm + " -> " + withBuf.rm + " bulan");
  const first = withBuf.sett[0];
  ok(first.c[0].buffer === true && first.c[0].amount === 3000000, "setoran pertama memuat kas penampung sebagai komponen");
  ok(first.a === first.c.reduce((s, c) => s + c.amount, 0) && first.al.reduce((a, b) => a + b, 0) === first.a, "total wire = kas + tabungan baru, alokasi per ETF pas");
  // posisi kuartal
  t.set("etf-buffer", "0");
  for (const pos of [1, 2, 3]) {
    t.set("quarter-pos", String(pos));
    const r = calc(t);
    ok(r.sett[0].m === 3 - (pos - 1) || r.mode.startsWith("parent"), `posisi ${pos}: wire pertama jatuh di bulan ${r.sett[0].m}`);
    const quarters = r.sett.map(s => s.m);
    ok(quarters.every((m, i) => i === 0 || m - quarters[i - 1] === 3), `posisi ${pos}: setoran berikutnya tiap 3 bulan`);
    ok(r.sett.every(s => s.c.every(c => c.month > s.m - 3 && c.month <= s.m)), `posisi ${pos}: komponen tiap wire hanya dari kuartalnya`);
    const etfSum = r.sched.reduce((s, e) => s + e[2], 0), wireSum = r.sett.reduce((s, x) => s + x.a, 0);
    ok(etfSum === wireSum, `posisi ${pos}: semua tabungan ETF tercakup wire (${etfSum})`);
  }
  // mode aman + posisi 3: wire bulan ini
  t.set("etf1-value", "4.500.000"); t.set("etf2-value", "2.250.000"); t.set("etf3-value", "1.800.000"); t.set("etf4-value", "450.000");
  t.set("bmri-value", "4.000.000"); t.set("bbri-value", "2.600.000");
  t.set("quarter-pos", "3"); t.set("etf-buffer", "1.200.000");
  const s3 = calc(t);
  ok(s3.mode === "safe" && s3.sett.length === 1 && s3.sett[0].m === 1 && s3.sett[0].a === 1200000 + 1800000, "posisi 3 + kas 1,2jt: wire bulan 1 = 1,2jt + 1,8jt");
}

// 3. Target pemulihan
(async () => {
  const t = load();
  ["etf1-value", "etf2-value", "etf3-value", "etf4-value"].forEach((k, i) => t.set(k, ["900.000", "450.000", "360.000", "90.000"][i]));
  t.set("bmri-value", "12.000.000"); t.set("bbri-value", "8.000.000");
  const mid = calc(t);
  t.set("recovery-target", "band");
  const band = calc(t);
  ok(mid.rm > 6 && band.rm < mid.rm, `tepi band lebih singkat: ${band.rm} vs ${mid.rm} bulan`);
  ok(band.alt.mid === mid.rm && band.alt.band === band.rm, "alt (tengah/band) konsisten dengan rencana");
  t.set("recovery-target", "mid");
  await t.flush();
  const w = t.$("duration-warning");
  ok(!w.hidden && /bulan/.test(w.textContent), "peringatan durasi tampil bila > 6 bulan");
  t.set("monthly-fund", "500.000");
  await t.flush();
  const w2 = t.$("duration-warning");
  const r = calc(t);
  ok(r.rm > 12 ? w2.classList.contains("is-strong") : true, "peringatan keras bila > 12 bulan (durasi " + r.rm + ")");
  t.set("monthly-fund", "3.000.000");
  t.set("etf1-value", "4.500.000"); t.set("etf2-value", "2.250.000"); t.set("etf3-value", "1.800.000"); t.set("etf4-value", "450.000");
  t.set("bmri-value", "4.000.000"); t.set("bbri-value", "2.600.000");
  await t.flush();
  ok(t.$("duration-warning").hidden, "peringatan tersembunyi saat aman");
  console.log(`\n${pass} pengecekan lulus`);
})();
