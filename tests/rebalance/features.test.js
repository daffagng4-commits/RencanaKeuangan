const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const { load } = require("./harness.js");
const ORIG = path.join(__dirname, "app.baseline.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };
const num = (t) => Number(String(t).replace(/\./g, ""));

const calc = (t) => JSON.parse(t.ev(`(()=>{const t=getTechnicalSettings();const s=getState(getRawValues(t),getSettings(),t);
 return JSON.stringify({mode:s.mode,full:s.fullMonths,sched:s.schedule.map(e=>[e.month,e.stock,e.etf,e.phase]),
 sett:s.settlements.map(x=>({m:x.month,a:x.amount,al:x.allocation.map(r=>r.amount)}))})})()`));

(async () => {
  // ---- 0. Regresi: tanpa override & tanpa fee, hasil sama dengan r18
  {
    const a = load(), b = load({ appFile: ORIG });
    const mk = (m) => Object.fromEntries(Object.entries({ bmri: 1, bbri: 1, etf1: 1, etf2: 1, etf3: 1, etf4: 1 }).map(([k]) => [`${k}-value`, m[k] ?? null]).filter(([, v]) => v !== null));
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const scenarios = [
      {}, { etf1: 900000, etf2: 450000, etf3: 360000, etf4: 90000 }, { bmri: 12e6, bbri: 8e6, etf1: 900000, etf2: 450000, etf3: 360000, etf4: 90000 },
      { etf1: 9e6, etf2: 4.5e6, etf3: 3.6e6, etf4: 9e5 }, { etf1: 4.5e6, etf2: 2.25e6, etf3: 1.8e6, etf4: 4.5e5, bmri: 9e5, bbri: 6e5 },
      { etf1: 123456, etf2: 654321, etf3: 99999, etf4: 777, bmri: 7654321, bbri: 3333333 },
    ];
    for (const sc of scenarios) {
      Object.entries(mk(sc)).forEach(([id, v]) => { a.set(id, fmt(v)); b.set(id, fmt(v)); });
      const x = calc(a), y = calc(b);
      assert.deepStrictEqual(x, y, "skenario berbeda: " + JSON.stringify(sc));
    }
    ok(true, `regresi: jadwal & setoran identik dengan r18 pada ${scenarios.length} skenario (termasuk pemulihan panjang)`);
    ok(a.errors.length === 0, "halaman termuat tanpa error");
  }

  // ---- 1. Fee broker Stockbit
  {
    const t = load();
    const lot = (fee) => JSON.parse(t.ev(`JSON.stringify(calculateLotExecution(allocateByWeights(1800000,[{key:'bmri',name:'BMRI',weight:.6},{key:'bbri',name:'BBRI',weight:.4}]),1800000,{rdnCarry:50000,bmriPrice:4500,bbriPrice:3800,stockFee:${fee}}))`));
    const l0 = lot(0), l1 = lot(0.0015);
    ok(l1.totalFee > 0 && l1.remainder >= 0, "fee Stockbit 0,15%: fee > 0, sisa RDN tidak negatif");
    ok(l1.totalSpent + l1.remainder === 1850000, "belanja + sisa = modal (1.800.000 + sisa 50.000)");
    ok(l1.trades.every((x) => l1.remainder < x.price * 100 * 1.0015 + 1), "tidak ada lot yang terlewat");
    ok(l0.totalFee === 0, "fee kosong = tanpa fee");
    t.set("target-month", "2027-06"); t.set("stock-fee", "0,15");
    for (const [tk, v] of [["bmri", "4.500"], ["bbri", "3.800"]]) { const i = t.w.document.querySelector(`.timeline-card.is-now .stock-price-input[data-ticker="${tk}"]`); i.value = v; i.dispatchEvent(new t.w.Event("change", { bubbles: true })); }
    await t.flush();
    ok(/fee broker Stockbit Rp/.test(t.$("action-timeline").textContent), "kartu bulan ini menampilkan fee Stockbit");
  }

  // ---- 2. Fee broker IBKR
  {
    const t = load();
    const sp = (fee) => JSON.parse(t.ev(`JSON.stringify(usdSplit({amount:3000000,allocation:[{name:'VOO',amount:1500000},{name:'VXUS',amount:750000},{name:'SMH',amount:600000},{name:'NVDA',amount:150000}]},16000,${fee}))`));
    const s0 = sp(0), s1 = sp(0.005);
    ok(s0.total === 187.5 && s0.fee === 0 && Math.abs(s0.rows.reduce((a, r) => a + r.usd, 0) - 187.5) < 1e-9, "tanpa fee IBKR: seluruh US$187,50 dibelikan");
    ok(Math.abs(s1.invest - 186.57) < 0.011 && Math.abs(s1.fee - (187.5 - 186.57)) < 0.011, "fee IBKR 0,5%: dibelikan US$186,57, fee ≈ US$0,93");
    ok(Math.abs(s1.rows.reduce((a, r) => a + r.usd, 0) - s1.invest) < 1e-9, "pembagian per ETF pas dengan nilai yang dibelikan");
    t.set("usd-rate", "16.000"); t.set("ibkr-fee", "0,5");
    await t.flush();
    ok(/Fee broker IBKR ≈ US\$/.test(t.$("action-timeline").textContent), "kartu setoran menampilkan fee IBKR");
  }

  // ---- 3. Setoran per bulan (ceklist)
  {
    const t = load();
    await t.flush();
    const card = (m) => t.w.document.querySelectorAll("#action-timeline .timeline-card")[m - 1];
    const chk = (m) => card(m).querySelector(".fund-check");
    ok(chk(1) && !chk(1).checked && /sama dengan Dana baru per bulan/.test(card(1).textContent), "default: tidak dicentang, setoran = Dana baru per bulan");
    const base = calc(t);
    chk(2).checked = true; chk(2).dispatchEvent(new t.w.Event("change", { bubbles: true })); await t.flush();
    ok(!!card(2).querySelector(".fund-input"), "dicentang: kotak nominal manual muncul");
    ok(/Belum diisi/.test(card(2).textContent) && JSON.stringify(calc(t)) === JSON.stringify(base), "dicentang tapi kosong: rencana tidak berubah");
    const inp = card(2).querySelector(".fund-input");
    inp.value = "5.000.000"; inp.dispatchEvent(new t.w.Event("change", { bubbles: true })); await t.flush();
    const c1 = calc(t);
    const m2 = c1.sched.find((e) => e[0] === 2);
    ok(m2[1] + m2[2] === 5000000, "bulan 2 memakai setoran manual Rp5.000.000 (saham+ETF)");
    const m1 = c1.sched.find((e) => e[0] === 1), m3 = c1.sched.find((e) => e[0] === 3);
    ok(m1[1] + m1[2] === 3000000 && m3[1] + m3[2] === 3000000, "bulan lain tetap Rp3.000.000");
    ok(m2[2] === 3000000 && m2[1] === 2000000, "mode aman: setoran manual dibagi 60% ETF / 40% saham sesuai target");
    ok(c1.sett[0].a === m1[2] + m2[2] + m3[2], "setoran IBKR kuartal = jumlah tabungan ETF tiga bulan (1,8 + 3,0 + 1,8 jt)");
    chk(2).checked = false; chk(2).dispatchEvent(new t.w.Event("change", { bubbles: true })); await t.flush();
    ok(JSON.stringify(calc(t)) === JSON.stringify(base), "ceklist dimatikan: kembali sama dengan Dana baru per bulan");

    // pemulihan parent dengan setoran manual lebih besar -> lebih singkat
    ["etf1", "etf2", "etf3", "etf4"].forEach((k, i) => t.set(`${k}-value`, ["900.000", "450.000", "360.000", "90.000"][i]));
    t.set("bmri-value", "12.000.000"); t.set("bbri-value", "8.000.000"); await t.flush();
    const slow = calc(t);
    ok(slow.mode === "parent-etf" && slow.full >= 6, `pemulihan ETF dasar: ${slow.full} bulan penuh`);
    for (const m of [1, 2]) { const c = chk(m); c.checked = true; c.dispatchEvent(new t.w.Event("change", { bubbles: true })); await t.flush(); const i = card(m).querySelector(".fund-input"); i.value = "10.000.000"; i.dispatchEvent(new t.w.Event("change", { bubbles: true })); await t.flush(); }
    const fast = calc(t);
    ok(fast.full < slow.full, `setoran manual lebih besar mempersingkat: ${slow.full} -> ${fast.full} bulan penuh`);
    ok(fast.sched[0][2] === 10000000 && fast.sched[1][2] === 10000000, "bulan 1 dan 2 seluruhnya ke ETF sebesar setoran manual");
    // total ETF yang ditabung tertutup oleh setoran IBKR
    const etfSum = fast.sched.reduce((s, e) => s + e[2], 0), wireSum = fast.sett.reduce((s, x) => s + x.a, 0);
    ok(etfSum === wireSum, "total tabungan ETF = total setoran IBKR");

    // simpan/muat lewat jembatan
    const saved = JSON.parse(JSON.stringify(t.ev("rkGetState()")));
    ok(saved.fundOverrides["1"].amount === 10000000, "rkGetState menyimpan setoran per bulan");
    const t2 = load(); t2.ev(`rkSetState(${JSON.stringify(saved)})`); await t2.flush();
    ok(JSON.stringify(calc(t2)) === JSON.stringify(fast), "rkSetState memulihkan rencana yang sama di sesi baru");
    t2.ev("resetSettings()"); ok(Object.keys(t2.ev("fundOverrides")).length === 0, "reset mengosongkan setoran manual");
  }

  // ---- 4. Tautan IBKR vs Flip -> Rebalance
  {
    const t = load();
    t.set("usd-rate", "16.000"); t.set("wire-fee", "250.000"); await t.flush();
    t.w.localStorage.setItem("rk-xroute", JSON.stringify({ on: true, name: "Flip", rate: 17950.5, pct: 0.0165, X: 3000000, t: 1 }));
    t.w.dispatchEvent(new t.w.Event("focus")); await t.flush();
    ok(t.$("usd-rate").value === "17.950,5" && t.$("wire-fee").value === "0", "terhubung: kurs efektif terisi dan biaya wire 0");
    ok(t.$("usd-rate").readOnly && t.$("wire-fee").readOnly && !t.$("route-link").hidden, "terhubung: kolom terkunci dan status tampil");
    await t.flush();
    const txt = t.$("action-timeline").textContent;
    ok(/Biaya rute Flip/.test(txt) && /kurs efektif rute termurah/.test(txt) && !/biaya wire Rp/.test(txt), "kartu setoran memakai rute termurah & menampilkan biaya rute");
    t.w.localStorage.removeItem("rk-xroute"); t.w.dispatchEvent(new t.w.Event("focus")); await t.flush();
    ok(t.$("usd-rate").value === "16.000" && t.$("wire-fee").value === "250.000" && !t.$("usd-rate").readOnly, "putus tautan: isian manual dipulihkan dan terbuka");
    // dibuka saat sudah terhubung
    const t3 = load({ storage: { "rk-xroute": JSON.stringify({ on: true, name: "USDC via AVAXC", rate: 18036.64, pct: 0.0101, X: 3000000, t: 1 }) } });
    t3.ev("syncRouteLink()"); await t3.flush();
    ok(t3.$("usd-rate").readOnly && /AVAXC/.test(t3.$("route-link").textContent), "dibuka saat sudah terhubung: langsung memakai rute");
  }

  // ---- 5. Sisi IBKR vs Flip: ceklist menerbitkan / mencabut rute
  {
    let h = fs.readFileSync(path.join(__dirname, "..", "..", "tools", "ibkr-flip", "index.html"), "utf8").replace('<script src="../bridge.js"></script>', "");
    h = h.replace(/<link[^>]*href="https?:[^"]*"[^>]*>/g, "");
    const w = new JSDOM(h, { url: "http://localhost/tools/ibkr-flip/index.html", runScripts: "dangerously" }).window;
    const $ = (id) => w.document.getElementById(id);
    ok(!$("linkOn").checked && w.localStorage.getItem("rk-xroute") === null, "ceklist mati: tidak ada rute dipublikasikan");
    $("linkOn").checked = true; $("linkOn").dispatchEvent(new w.Event("change", { bubbles: true }));
    const r = JSON.parse(w.localStorage.getItem("rk-xroute"));
    ok(r.on && r.rate > 0 && r.name && r.pct > 0, "ceklist hidup: rute termurah dipublikasikan (" + r.name + ", kurs " + r.rate.toFixed(2) + ")");
    const winner = w.document.querySelector(".row.win .nm").textContent;
    ok(r.name === winner, "rute yang terhubung = kartu bertanda Termurah (" + winner + ")");
    $("amt").value = "10.000.000"; $("amt").dispatchEvent(new w.Event("input", { bubbles: true }));
    ok(JSON.parse(w.localStorage.getItem("rk-xroute")).X === 10000000, "mengubah nominal memperbarui rute yang terhubung");
    $("linkOn").checked = false; $("linkOn").dispatchEvent(new w.Event("change", { bubbles: true }));
    ok(w.localStorage.getItem("rk-xroute") === null, "ceklist dimatikan: rute dicabut");
  }
  console.log(`\n${pass} pengecekan lulus`);
})().catch((e) => { console.error(e); process.exit(1); });
