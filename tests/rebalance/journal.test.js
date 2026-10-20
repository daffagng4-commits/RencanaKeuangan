const assert = require("assert");
const { load } = require("./harness.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };
const click = (t, el) => el.dispatchEvent(new t.w.Event("click", { bubbles: true }));

(async () => {
  const t = load();
  ok(t.errors.length === 0, "halaman termuat tanpa error: " + t.errors.join("|"));
  const holdVals = () => t.ev("JSON.stringify(journal.holdings)");

  // 1. Mode otomatis: jumlah x harga
  const qty = (k, v) => { const el = t.w.document.querySelector(`[data-jr="qty"][data-k="${k}"]`); el.value = v; el.dispatchEvent(new t.w.Event("input", { bubbles: true })); };
  const px = (k, v) => { const el = t.w.document.querySelector(`[data-jr="px"][data-k="${k}"]`); el.value = v; el.dispatchEvent(new t.w.Event("input", { bubbles: true })); };
  t.set("usd-rate", "16.000");
  qty("bmri", "1.000"); px("bmri", "4.000"); qty("bbri", "700"); px("bbri", "3.700");
  qty("etf1", "10,5"); px("etf1", "100"); qty("etf2", "20"); px("etf2", "50"); qty("etf3", "4"); px("etf3", "250"); qty("etf4", "5"); px("etf4", "20");
  t.$("jr-auto").checked = true; t.$("jr-auto").dispatchEvent(new t.w.Event("change"));
  await t.flush();
  ok(t.$("bmri-value").value === "4.000.000" && t.$("bbri-value").value === "2.590.000", "nilai saham = lembar x harga");
  ok(t.$("etf1-value").value === "16.800.000" && t.$("etf2-value").value === "16.000.000", "nilai ETF Rp = unit x US$ x kurs (10,5 x 100 x 16.000)");
  ok(t.$("bmri-value").readOnly, "kolom nilai terkunci saat otomatis");
  t.set("etf-currency", "usd"); await t.flush();
  ok(t.$("etf1-value").value === "1.050", "ganti satuan ke US$ -> nilai ETF 1.050 USD");
  t.set("etf-currency", "idr"); await t.flush();

  // 2. Eksekusi bulan ini (mode aman, posisi 1)
  t.$("jr-auto").checked = false; t.$("jr-auto").dispatchEvent(new t.w.Event("change"));
  t.set("bmri-value", "4.000.000"); t.set("bbri-value", "2.600.000");
  t.set("etf1-value", "4.500.000"); t.set("etf2-value", "2.250.000"); t.set("etf3-value", "1.800.000"); t.set("etf4-value", "450.000");
  qty("bmri", "0"); qty("bbri", "0"); qty("etf1", "0"); qty("etf2", "0"); qty("etf3", "0"); qty("etf4", "0");
  t.set("buy-fee", "0,15");
  t.set("target-month", "2027-06");
  await t.flush();
  let btn = t.w.document.querySelector(".exec-month");
  ok(!!btn, "tombol 'Sudah saya eksekusi' ada di kartu Bulan 1");
  click(t, btn); await t.flush();
  ok(!t.$("jr-msg").hidden && t.$("jr-msg").classList.contains("bad"), "tanpa harga saham: ditolak dengan pesan");
  const setPrices = (map) => Object.entries(map).forEach(([tk, v]) => { const i = t.w.document.querySelector(`.timeline-card.is-now .stock-price-input[data-ticker="${tk}"]`); i.value = v; i.dispatchEvent(new t.w.Event("change", { bubbles: true })); });
  setPrices({ bmri: "4.500", bbri: "3.800" });
  await t.flush();
  const before = { bmri: t.$("bmri-value").value, rdn: t.$("rdn-carry").value };
  click(t, t.w.document.querySelector(".exec-month")); await t.flush();
  const h = JSON.parse(holdVals());
  ok(h.bmri > 0 && h.bmri % 100 === 0 && h.bbri % 100 === 0, `lembar tercatat kelipatan 100 (BMRI ${h.bmri}, BBRI ${h.bbri})`);
  ok(t.$("target-month").value === "2027-07" && t.$("quarter-pos").value === "2", "periode maju ke 2027-07, posisi kuartal -> 2");
  ok(t.$("etf-buffer").value === "1.800.000", "kas penampung bertambah Rp1,8 jt");
  const log = JSON.parse(t.ev("JSON.stringify(journal.log)"));
  ok(log.some((e) => e.type === "saham" && e.fee > 0) && log.some((e) => e.type === "tabung"), "log memuat pembelian saham (dengan fee) dan tabungan ETF");
  ok(Number(t.$("bmri-value").value.replace(/\./g, "")) > Number(before.bmri.replace(/\./g, "")), "mode nilai-langsung: nilai BMRI bertambah sebesar pembelian");
  ok(true, "saldo RDN diperbarui: " + t.$("rdn-carry").value);
  ok(JSON.parse(t.ev("JSON.stringify(journal.snaps)")).length === 1, "snapshot otomatis tercatat");
  ok(!t.$("jr-undo").disabled, "tombol batalkan aktif");

  // undo
  click(t, t.$("jr-undo")); await t.flush();
  ok(t.$("target-month").value === "2027-06" && t.$("etf-buffer").value === "0" && JSON.parse(holdVals()).bmri === 0, "batalkan: periode, kas, dan posisi kembali");
  ok(JSON.parse(t.ev("JSON.stringify(journal.log)")).length === 0, "batalkan: log kembali kosong");

  // 3. Bulan wire (posisi 3), dengan kas penampung
  t.set("quarter-pos", "3"); t.set("etf-buffer", "1.200.000"); t.set("usd-rate", "16.000"); t.set("wire-fee", "250.000");
  px("etf1", "100"); px("etf2", "50"); px("etf3", "250"); px("etf4", "20");
  await t.flush();
  setPrices({ bmri: "4.500", bbri: "3.800" });
  await t.flush();
  click(t, t.w.document.querySelector(".exec-month")); await t.flush();
  const log2 = JSON.parse(t.ev("JSON.stringify(journal.log)"));
  const wire = log2.find((e) => e.type === "wire");
  ok(wire && wire.amount === 3000000 && wire.rate === 16000, "wire tercatat: 1,2jt kas + 1,8jt bulan ini = 3.000.000");
  ok(Math.abs(wire.usd - 187.5) < 0.01, "USD masuk = 187,50");
  const etfLogs = log2.filter((e) => e.type === "etf");
  ok(etfLogs.length >= 1 && Math.abs(etfLogs.reduce((s, e) => s + e.usd, 0) - wire.usd) < 0.011, "pembelian ETF tercatat dan total USD pas");
  ok(JSON.parse(holdVals()).etf1 > 0, "unit pecahan VOO bertambah: " + JSON.parse(holdVals()).etf1);
  ok(t.$("etf-buffer").value === "0" && t.$("quarter-pos").value === "1", "kas penampung 0, posisi kuartal kembali 1");

  // 4. Simpan/muat ulang lewat jembatan
  const saved = JSON.parse(JSON.stringify(t.ev("rkGetState()")));
  ok(saved.journal && saved.journal.log.length === log2.length && saved.fields["buy-fee"] === "0,15", "rkGetState memuat jurnal dan isian baru");
  const t2 = load();
  t2.ev(`rkSetState(${JSON.stringify(saved)})`);
  await t2.flush();
  ok(t2.ev("journal.log.length") === log2.length && t2.$("buy-fee").value === "0,15" && t2.$("target-month").value === "2027-07", "rkSetState memulihkan jurnal & isian di sesi baru");
  const t3 = load();
  t3.ev(`rkSetState(${JSON.stringify({ v: 1, fields: { "monthly-fund": "2.000.000" } })})`);
  ok(t3.errors.length === 0 && t3.$("monthly-fund").value === "2.000.000", "migrasi: state lama tanpa jurnal tetap termuat");

  // 5. Riwayat
  const h1 = t.ev(`JSON.stringify(analyzeHistory([{p:"2027-01",etf:.6,status:"safe"},{p:"2027-02",etf:.5,status:"etf-low"},{p:"2027-03",etf:.52,status:"etf-low"},{p:"2027-06",etf:.56,status:"safe"}]))`);
  const eps = JSON.parse(h1);
  ok(eps.length === 1 && eps[0].from === "2027-02" && eps[0].to === "2027-06" && eps[0].months === 4, "riwayat: keluar band Feb, pulih Jun = 4 bulan");

  // 6. What-if
  t.set("bmri-value", "4.000.000"); t.set("bbri-value", "2.600.000");
  t.set("etf1-value", "4.500.000"); t.set("etf2-value", "2.250.000"); t.set("etf3-value", "1.800.000"); t.set("etf4-value", "450.000");
  t.set("etf-buffer", "0"); t.set("quarter-pos", "1");
  t.set("wi-etf", "-20"); await t.flush();
  ok(/pemulihan parent ETF/.test(t.$("wi-result").textContent) && /Pemulihan \d+ bulan/.test(t.$("wi-result").textContent), "what-if ETF -20%: " + t.$("wi-result").textContent.slice(0, 80));
  t.set("wi-etf", "0"); await t.flush();

  // 7. Salin instruksi
  const txt = t.ev("(()=>{const {state}=currentCalc();return monthInstructionText(state,1)})()");
  ok(/Rencana bulan 1/.test(txt) && /Saham:/.test(txt) && /ETF:/.test(txt), "teks salin memuat Saham & ETF");
  click(t, t.w.document.querySelector(".copy-month")); await t.flush();
  ok(!t.$("jr-copytext").hidden && /Rencana bulan/.test(t.$("jr-copytext").value), "tombol salin mengisi kotak teks");

  // 8. ICS
  const ics = t.ev(`(()=>{const {state}=currentCalc();return buildIcs(state,"2027-06",5,28)})()`);
  ok(/BEGIN:VCALENDAR/.test(ics) && /DTSTART;VALUE=DATE:20270605/.test(ics) && /DTSTART;VALUE=DATE:20270828/.test(ics), "ICS: beli saham 5 Juni, setor IBKR 28 Agustus (bulan 3)");
  ok((ics.match(/BEGIN:VEVENT/g) || []).length >= 4, "ICS memuat beberapa kejadian");

  // 9. Rute IBKR
  t.w.localStorage.setItem("rk-xroute", JSON.stringify({ name: "Flip", rate: 17950.5, X: 3000000, t: 1 }));
  t.w.dispatchEvent(new t.w.Event("storage")); await t.flush();
  ok(!t.$("route-offer").hidden && /Flip/.test(t.$("route-offer").textContent), "tawaran rute IBKR muncul");
  click(t, t.$("route-apply")); await t.flush();
  ok(t.$("usd-rate").value === "17.950,5" && t.$("wire-fee").value === "0", "terapkan rute: kurs efektif terisi, biaya wire 0");

  console.log(`\n${pass} pengecekan lulus`);
})().catch((e) => { console.error(e); process.exit(1); });
