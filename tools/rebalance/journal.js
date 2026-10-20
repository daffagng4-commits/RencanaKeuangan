/* Jurnal eksekusi, posisi (lembar/unit), riwayat band, simulasi, salin instruksi, pengingat, dan rute IBKR.
 * Dimuat setelah app.js dan memakai fungsi/konstanta globalnya. Datanya ikut tersimpan lewat rkGetState()
 * (kunci `journal`), jadi tidak perlu tabel atau constraint baru di Supabase. */
const journal = { holdings: {}, px: {}, log: [], snaps: [], undo: null };
const JR_ASSETS = [...CONFIG.stockAssets, ...CONFIG.etfAssets];
const ROUTE_KEY = "rk-xroute";
let histChart = null;

function jrReset() {
  journal.holdings = {};
  journal.px = {};
  JR_ASSETS.forEach(({ key }) => { journal.holdings[key] = 0; journal.px[key] = 0; });
  journal.log = [];
  journal.snaps = [];
  journal.undo = null;
}
jrReset();

const jr = (id) => document.getElementById(id);
const round2 = (value) => Math.round(value * 100) / 100;
const round4 = (value) => Math.round(value * 10000) / 10000;
const isUsdUnit = () => elements.etfCurrency.value === "usd";

function jrMsg(text, bad) {
  const box = jr("jr-msg");
  box.textContent = text;
  box.classList.toggle("bad", !!bad);
  box.hidden = !text;
}

function currentCalc() {
  const technical = getTechnicalSettings();
  const settings = getSettings();
  const state = getState(getRawValues(technical), settings, technical);
  return { technical, settings, state };
}

// ---------- Posisi: jumlah x harga -> nilai ----------
function holdingValue(key) {
  const qty = journal.holdings[key] || 0;
  const px = journal.px[key] || 0;
  if (!isEtfKey(key)) return qty * px;
  const usd = qty * px;
  return isUsdUnit() ? usd : usd * parseDecimal(elements.usdRate.value);
}

function formatQty(key, qty) {
  return isEtfKey(key) ? String(round4(qty)).replace(".", ",") : formatInputCurrency(qty);
}

function formatPx(key, px) {
  return px > 0 ? (isEtfKey(key) ? decimalInputFormatter.format(px) : formatInputCurrency(px)) : "";
}

function renderHoldingRows() {
  jr("jr-holdings").innerHTML = JR_ASSETS.map(({ key, name }) => {
    const etf = isEtfKey(key);
    return `<tr><td><b>${name}</b><small> ${etf ? "unit" : "lembar"}</small></td>`
      + `<td><input data-jr="qty" data-k="${key}" type="text" inputmode="decimal" autocomplete="off" value="${journal.holdings[key] ? formatQty(key, journal.holdings[key]) : ""}" placeholder="0"></td>`
      + `<td><input data-jr="px" data-k="${key}" type="text" inputmode="decimal" autocomplete="off" value="${formatPx(key, journal.px[key])}" placeholder="${etf ? "US$" : "Rp"}"></td>`
      + `<td data-jr="val" data-k="${key}">-</td></tr>`;
  }).join("");
}

function updateHoldingValues() {
  JR_ASSETS.forEach(({ key }) => {
    const cell = document.querySelector(`[data-jr="val"][data-k="${key}"]`);
    if (!cell) return;
    const value = holdingValue(key);
    const needRate = isEtfKey(key) && !isUsdUnit() && !(parseDecimal(elements.usdRate.value) > 0) && (journal.holdings[key] || 0) > 0;
    cell.textContent = needRate ? "isi kurs" : isEtfKey(key) && isUsdUnit() ? formatUsd(value) : formatCurrency(value);
  });
}

function syncAuto() {
  const on = jr("jr-auto").checked;
  Object.values(elements.inputs).forEach((input) => { input.readOnly = on; });
  if (!on) return;
  JR_ASSETS.forEach(({ key }) => {
    const value = holdingValue(key);
    elements.inputs[key].value = formatAssetInput(key, isEtfKey(key) && isUsdUnit() ? round2(value) : Math.round(value));
  });
  scheduleRender();
}

// ---------- Eksekusi bulan ini ----------
function shiftMonthly() {
  [...Object.values(stockPrices), settlementRates].forEach((bucket) => {
    const old = { ...bucket };
    Object.keys(bucket).forEach((key) => delete bucket[key]);
    Object.entries(old).forEach(([month, value]) => { if (Number(month) - 1 >= 1) bucket[Number(month) - 1] = value; });
  });
}

function bumpValueInput(key, delta) {
  if (jr("jr-auto").checked) return;
  const input = elements.inputs[key];
  const next = parseAssetInput(key, input.value) + delta;
  input.value = formatAssetInput(key, isEtfKey(key) && isUsdUnit() ? round2(next) : Math.round(next));
}

function recordSnapshot(state, period) {
  const snap = { p: period || "", etf: state.etfShare, stock: state.stockShare, total: Math.round(state.total), status: state.parentStatus, lo: state.lowerEtfBand, hi: state.upperEtfBand, tg: state.settings.etfGlobalTarget };
  const existing = snap.p ? journal.snaps.findIndex((item) => item.p === snap.p) : -1;
  if (existing >= 0) journal.snaps[existing] = snap;
  else journal.snaps.push(snap);
  journal.snaps.sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));
}

function executeMonth() {
  const { technical, state } = currentCalc();
  const entry = state.firstMonth;
  const exec = monthlyLotPlans(state, [entry])[0];
  if (entry.stock > 0 && exec.pending) return jrMsg("Isi harga saham di kartu Bulan 1 dulu agar lot dan sisa RDN bisa dicatat.", true);
  const settlement = state.settlements.find((item) => item.month === entry.month);
  let rate = 0;
  let usd = null;
  if (settlement) {
    rate = settlementRates[settlement.month] > 0 ? settlementRates[settlement.month] : technical.usdRate;
    if (!(rate > 0)) return jrMsg("Bulan ini ada setoran IBKR: isi kurs hari kirim (atau kurs USD/IDR efektif) dulu.", true);
    usd = usdSplit(settlement, rate);
  }

  const before = rkGetState();
  before.journal.undo = null;
  const date = new Date().toISOString().slice(0, 10);
  const period = elements.targetMonth.value || "";
  const auto = jr("jr-auto").checked;
  const notes = [];
  recordSnapshot(state, period);

  exec.trades.filter((trade) => trade.lots > 0).forEach((trade) => {
    journal.holdings[trade.key] = (journal.holdings[trade.key] || 0) + trade.shares;
    if (trade.price > 0) journal.px[trade.key] = trade.price;
    journal.log.push({ date, period, type: "saham", ticker: trade.name, qty: trade.shares, price: trade.price, fee: trade.fee, amount: trade.spent });
    bumpValueInput(trade.key, trade.shares * trade.price);
    notes.push(`${trade.name} ${trade.lots} lot`);
  });
  elements.rdnCarry.value = formatInputCurrency(exec.remainder);

  let buffer = technical.etfBuffer;
  let unitsMissing = false;
  if (settlement) {
    journal.log.push({ date, period, type: "wire", amount: settlement.amount, usd: usd.total, rate, fee: technical.wireFee });
    usd.rows.filter((row) => row.usd > 0).forEach((row) => {
      const key = CONFIG.etfAssets.find((asset) => asset.name === row.name).key;
      const px = journal.px[key] || 0;
      const units = px > 0 ? round4(row.usd / px) : 0;
      if (!(px > 0)) unitsMissing = true;
      journal.holdings[key] = round4((journal.holdings[key] || 0) + units);
      journal.log.push({ date, period, type: "etf", ticker: row.name, qty: units, price: px, usd: row.usd, rate });
      bumpValueInput(key, isUsdUnit() ? row.usd : row.usd * rate);
    });
    buffer = 0;
    notes.push(`setor IBKR ${formatCurrency(settlement.amount)}`);
  } else if (entry.etf > 0) {
    buffer += entry.etf;
    journal.log.push({ date, period, type: "tabung", amount: entry.etf });
    notes.push(`tabung ETF ${formatCurrency(entry.etf)}`);
  }
  elements.etfBuffer.value = formatInputCurrency(buffer);

  elements.quarterPos.value = String(technical.quarterPos === 3 ? 1 : technical.quarterPos + 1);
  const next = nextMonth(elements.targetMonth.value);
  if (next) {
    elements.targetMonth.value = next;
    updatePeriodCopy();
    storeRdn(next, exec.remainder);
  }
  shiftMonthly();
  journal.undo = before;
  renderHoldingRows();
  syncAuto();
  render();
  jrMsg(`Tercatat: ${notes.join(", ") || "tidak ada transaksi"}. Sisa RDN ${formatCurrency(exec.remainder)}, kas penampung ${formatCurrency(buffer)}. Sekarang rencana dimulai dari bulan berikutnya.${unitsMissing ? " Isi harga ETF (US$) di tabel Posisi agar jumlah unit yang dibeli tercatat." : ""}`);
}

function undoExecution() {
  if (!journal.undo) return;
  const snapshot = journal.undo;
  rkSetState(snapshot);
  jrMsg("Eksekusi terakhir dibatalkan.");
}

// ---------- Salin instruksi ----------
function monthInstructionText(state, month) {
  const entry = state.schedule.find((item) => item.month === month);
  if (!entry) return "";
  const [exec] = monthlyLotPlans(state, [entry]);
  const fee = state.technical.wireFee;
  const lines = [`Rencana bulan ${month}${month === state.firstMonth.month ? " (sekarang)" : " (estimasi, hitung ulang)"}`];
  if (entry.stock > 0) {
    const active = exec.trades.filter((trade) => trade.budget > 0);
    const carry = exec.openingCarry > 0 ? ` + saldo RDN ${formatCurrency(exec.openingCarry)}` : "";
    if (exec.pending) lines.push(`- Saham: transfer ${formatCurrency(entry.stock)}${carry} ke RDN. Alokasi: ${active.map((t) => `${t.name} ${formatCurrency(t.budget)}`).join(", ")}. (Harga belum diisi.)`);
    else {
      const buys = exec.trades.filter((t) => t.lots > 0).map((t) => `${t.name} ${t.lots} lot`).join(", ") || "belum cukup 1 lot";
      lines.push(`- Saham: transfer ${formatCurrency(entry.stock)}${carry} ke RDN. Beli ${buys}. Sisa RDN ${formatCurrency(exec.remainder)}.`);
    }
  } else lines.push("- Saham: tidak ada belanja.");
  const settlement = state.settlements.find((item) => item.month === month);
  if (entry.etf > 0) lines.push(`- ETF: tabung ${formatCurrency(entry.etf)} di rekening penampung.`);
  if (settlement) {
    const manual = settlementRates[settlement.month] > 0;
    const rate = manual ? settlementRates[settlement.month] : state.technical.usdRate;
    if (rate > 0) {
      const usd = usdSplit(settlement, rate);
      lines.push(`- Setor IBKR: kirim ${formatCurrency(settlement.amount)} (siapkan ${formatCurrency(settlement.amount + fee)} termasuk biaya ${formatCurrency(fee)}) ≈ ${formatUsd(usd.total)} pada kurs ${formatCurrency(rate)}. Beli: ${usd.rows.filter((r) => r.usd > 0).map((r) => `${r.name} ${formatUsd(r.usd)}`).join(", ")}.`);
    } else {
      lines.push(`- Setor IBKR: kirim ${formatCurrency(settlement.amount)} (siapkan ${formatCurrency(settlement.amount + fee)} termasuk biaya ${formatCurrency(fee)}). Beli (Rp): ${settlement.allocation.filter((r) => r.amount > 0).map((r) => `${r.name} ${formatCurrency(r.amount)}`).join(", ")}.`);
    }
  }
  if (month !== state.firstMonth.month) lines.push("Catatan: estimasi, hitung ulang dengan harga dan kurs hari itu.");
  return lines.join("\n");
}

function copyText(text) {
  const area = jr("jr-copytext");
  area.value = text;
  area.hidden = false;
  area.focus();
  area.select();
  let done = false;
  try { done = document.execCommand && document.execCommand("copy"); } catch (error) { done = false; }
  if (!done && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
  jrMsg(done ? "Instruksi disalin. Tempel ke WhatsApp atau catatan." : "Teks sudah dipilih di kotak di bawah; salin manual bila belum masuk clipboard.");
}

// ---------- Riwayat ----------
function analyzeHistory(snaps) {
  const episodes = [];
  let open = null;
  snaps.forEach((snap) => {
    if (snap.status !== "safe" && !open) open = { from: snap, to: null };
    else if (snap.status === "safe" && open) { open.to = snap; episodes.push(open); open = null; }
  });
  if (open) episodes.push(open);
  const monthsBetween = (a, b) => {
    const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number);
    return (yb - ya) * 12 + (mb - ma);
  };
  return episodes.map((ep) => ({
    from: ep.from.p, fromShare: ep.from.etf, to: ep.to ? ep.to.p : null,
    months: ep.to && ep.from.p && ep.to.p ? monthsBetween(ep.from.p, ep.to.p) : null,
    side: ep.from.status === "etf-low" ? "ETF kurang" : "ETF berlebih",
  }));
}

function renderHistory() {
  const snaps = journal.snaps;
  const labels = snaps.map((item) => item.p || "-");
  if (histChart) {
    histChart.data.labels = labels;
    histChart.data.datasets[0].data = snaps.map((item) => +(item.etf * 100).toFixed(2));
    histChart.data.datasets[1].data = snaps.map((item) => +(item.lo * 100).toFixed(2));
    histChart.data.datasets[2].data = snaps.map((item) => +(item.hi * 100).toFixed(2));
    histChart.data.datasets[3].data = snaps.map((item) => +(item.tg * 100).toFixed(2));
    histChart.update("none");
  }
  const eps = analyzeHistory(snaps);
  const text = !snaps.length
    ? "Belum ada snapshot. Snapshot tercatat otomatis setiap kali Anda menekan \u201cSudah saya eksekusi\u201d, atau manual lewat tombol di bawah."
    : (eps.length
      ? eps.map((ep) => `${ep.side}: keluar band ${ep.from} (ETF ${formatPercent(ep.fromShare, 1)}) \u2192 ${ep.to ? `pulih ${ep.to}${ep.months != null ? `, ${ep.months} bulan` : ""}` : "belum pulih"}.`).join(" ")
      : `${snaps.length} snapshot, semuanya di dalam band.`);
  jr("hist-text").textContent = text;
}

// ---------- Simulasi "bagaimana kalau" ----------
const WI_MODES = { safe: "semua aman", "stock-child": "koreksi saham", "etf-child": "koreksi ETF", "double-child": "koreksi serentak", "parent-etf": "pemulihan parent ETF", "parent-stock": "pemulihan parent saham" };

function parsePctInput(id) {
  const value = Number.parseFloat(String(jr(id).value).replace(",", "."));
  return Number.isFinite(value) ? Math.max(-100, Math.min(1000, value)) : 0;
}

function whatIf(technical, settings, etfPct, stockPct) {
  const raw = getRawValues(technical);
  const scaled = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value * (1 + (isEtfKey(key) ? etfPct : stockPct) / 100)]));
  return getState(scaled, settings, technical);
}

function renderWhatIf() {
  const etfPct = parsePctInput("wi-etf");
  const stockPct = parsePctInput("wi-stock");
  const box = jr("wi-result");
  if (etfPct === 0 && stockPct === 0) {
    box.textContent = "Isi persentase (mis. -20 untuk ETF) untuk melihat status band dan rencana yang akan dihasilkan. Kas penampung tidak ikut bergerak.";
    return;
  }
  const { technical, settings } = currentCalc();
  const sim = whatIf(technical, settings, etfPct, stockPct);
  const dur = sim.recoveryMonths > 0 ? ` Pemulihan ${sim.recoveryMonths} bulan.` : "";
  box.textContent = `Porsi ETF menjadi ${formatPercent(sim.etfShare, 1)} (zona ${formatTargetNumber(sim.lowerEtfBand * 100)}-${formatTargetNumber(sim.upperEtfBand * 100)}%): ${WI_MODES[sim.mode]}.${dur} Bulan pertama: saham ${formatCurrency(sim.firstMonth.stock)}, tabungan ETF ${formatCurrency(sim.firstMonth.etf)}.`;
}

// ---------- Pengingat .ics ----------
const pad2 = (n) => String(n).padStart(2, "0");
const icsEscape = (text) => String(text).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

function buildIcs(state, period, stockDay, wireDay) {
  const [year, month] = period.split("-").map(Number);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rencana Keuangan//Rebalance//ID", "CALSCALE:GREGORIAN"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const add = (offset, day, title, desc) => {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const d = Math.min(day, last);
    const start = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d));
    const end = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d + 1));
    const fmt = (date) => `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
    lines.push("BEGIN:VEVENT", `UID:rk-${fmt(start)}-${title.replace(/\W+/g, "").slice(0, 12)}@rencanakeuangan`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fmt(start)}`, `DTEND;VALUE=DATE:${fmt(end)}`, `SUMMARY:${icsEscape(title)}`, `DESCRIPTION:${icsEscape(desc)}`,
      "BEGIN:VALARM", "TRIGGER:PT9H", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`, "END:VALARM", "END:VEVENT");
  };
  state.schedule.slice(0, 12).forEach((entry) => {
    if (stockDay && entry.stock > 0) add(entry.month - 1, stockDay, `Beli saham ${formatCurrency(entry.stock)}`, `Bulan ${entry.month} rencana rebalance. Hitung ulang dengan harga hari itu.`);
    const settlement = state.settlements.find((item) => item.month === entry.month);
    if (wireDay && settlement) add(entry.month - 1, wireDay, `Setor IBKR ${formatCurrency(settlement.amount)}`, `Siapkan juga biaya wire ${formatCurrency(state.technical.wireFee)}. Hitung ulang dengan kurs hari kirim.`);
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadIcs() {
  const period = elements.targetMonth.value;
  const stockDay = Math.min(31, Math.max(0, Number.parseInt(jr("rm-stock-day").value, 10) || 0));
  const wireDay = Math.min(31, Math.max(0, Number.parseInt(jr("rm-wire-day").value, 10) || 0));
  if (!/^\d{4}-\d{2}$/.test(period)) return jrMsg("Pilih periode simulasi dulu.", true);
  if (!stockDay && !wireDay) return jrMsg("Isi minimal satu tanggal (1-31) untuk pengingat.", true);
  const { state } = currentCalc();
  const ics = buildIcs(state, period, stockDay, wireDay);
  try {
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pengingat-rebalance.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    jrMsg("Berkas pengingat diunduh. Impor ke aplikasi kalender Anda.");
  } catch (error) {
    jrMsg("Peramban tidak mengizinkan unduhan dari halaman ini.", true);
  }
}

// ---------- Rute dari IBKR vs Flip ----------
function readRoute() {
  try {
    const route = JSON.parse(localStorage.getItem(ROUTE_KEY) || "null");
    return route && route.rate > 0 ? route : null;
  } catch (error) { return null; }
}

function renderRouteOffer() {
  const box = jr("route-offer");
  const route = readRoute();
  if (!route) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `Hasil IBKR vs Flip: rute termurah <b></b>, kurs efektif Rp ${decimalInputFormatter.format(route.rate)} per US$ (nominal ${formatCurrency(route.X)}, semua fee sudah termasuk). <br><button type="button" id="route-apply">Terapkan kurs &amp; biaya wire Rp0</button>`;
  box.querySelector("b").textContent = route.name;
}

function applyRoute() {
  const route = readRoute();
  if (!route) return;
  elements.usdRate.value = decimalInputFormatter.format(route.rate);
  elements.wireFee.value = formatInputCurrency(0);
  scheduleRender();
  syncAuto();
  jrMsg(`Kurs efektif ${decimalInputFormatter.format(route.rate)} dan biaya wire Rp0 diterapkan (fee rute ${route.name} sudah termasuk di kurs).`);
}

// ---------- Kait ke app.js ----------
extras.get = () => JSON.parse(JSON.stringify(journal));
extras.set = (data) => {
  jrReset();
  if (data && typeof data === "object") {
    JR_ASSETS.forEach(({ key }) => {
      journal.holdings[key] = Number((data.holdings || {})[key]) || 0;
      journal.px[key] = Number((data.px || {})[key]) || 0;
    });
    journal.log = Array.isArray(data.log) ? data.log.slice(-500) : [];
    journal.snaps = Array.isArray(data.snaps) ? data.snaps : [];
    journal.undo = data.undo && typeof data.undo === "object" ? data.undo : null;
  }
  renderHoldingRows();
  syncAuto();
};
extras.reset = () => {
  jr("jr-auto").checked = false;
  syncAuto();
};
extras.render = () => {
  updateHoldingValues();
  renderWhatIf();
  renderHistory();
  renderRouteOffer();
  jr("jr-undo").disabled = !journal.undo;
  const labels = { saham: (e) => `${e.date} beli ${e.ticker} ${formatInputCurrency(e.qty)} lembar @ ${formatCurrency(e.price)} (fee ${formatCurrency(e.fee || 0)})`, wire: (e) => `${e.date} setor IBKR ${formatCurrency(e.amount)} ≈ ${formatUsd(e.usd)} (kurs ${formatCurrency(e.rate)}, biaya ${formatCurrency(e.fee)})`, etf: (e) => `${e.date} beli ${e.ticker} ${formatQty("etf1", e.qty)} unit (${formatUsd(e.usd)})`, tabung: (e) => `${e.date} tabung ETF ${formatCurrency(e.amount)} di penampung` };
  jr("jr-log").innerHTML = journal.log.slice(-30).reverse().map((entry) => `<li>${(labels[entry.type] || (() => ""))(entry)}</li>`).join("") || "<li>Belum ada transaksi tercatat.</li>";
};

// ---------- Pasang event ----------
jr("jr-holdings").addEventListener("input", (event) => {
  const input = event.target.closest("[data-jr]");
  if (!input) return;
  const key = input.dataset.k;
  const value = parseDecimal(input.value);
  if (input.dataset.jr === "qty") journal.holdings[key] = value;
  else journal.px[key] = value;
  updateHoldingValues();
  syncAuto();
  if (window.rkChanged) window.rkChanged();
});
jr("jr-auto").addEventListener("change", () => { syncAuto(); if (window.rkChanged) window.rkChanged(); });
elements.usdRate.addEventListener("input", () => { updateHoldingValues(); syncAuto(); });
elements.etfCurrency.addEventListener("change", () => { updateHoldingValues(); syncAuto(); });
["wi-etf", "wi-stock"].forEach((id) => jr(id).addEventListener("input", renderWhatIf));
jr("jr-undo").addEventListener("click", undoExecution);
jr("jr-snap").addEventListener("click", () => {
  const { state } = currentCalc();
  recordSnapshot(state, elements.targetMonth.value);
  render();
  jrMsg("Snapshot periode ini tercatat.");
});
jr("jr-snap-del").addEventListener("click", () => { journal.snaps.pop(); render(); });
jr("rm-ics").addEventListener("click", downloadIcs);
elements.actionTimeline.addEventListener("click", (event) => {
  const copy = event.target.closest(".copy-month");
  if (copy) { const { state } = currentCalc(); copyText(monthInstructionText(state, Number(copy.dataset.month))); return; }
  if (event.target.closest(".exec-month")) executeMonth();
});
jr("route-offer").addEventListener("click", (event) => { if (event.target.closest("#route-apply")) applyRoute(); });
window.addEventListener("storage", renderRouteOffer);
window.addEventListener("focus", renderRouteOffer);

if (typeof Chart !== "undefined") {
  const line = (label, color, dash) => ({ label, data: [], borderColor: color, backgroundColor: color, borderWidth: dash ? 1 : 2.5, borderDash: dash ? [5, 4] : [], pointRadius: dash ? 0 : 3, tension: 0.2 });
  histChart = new Chart(jr("hist-chart"), {
    type: "line",
    data: { labels: [], datasets: [line("ETF aktual (%)", "#0e6b5d"), line("Batas bawah", "#f36d4a", true), line("Batas atas", "#f36d4a", true), line("Target", "#78a65a", true)] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 12, font: { size: 10 } } } }, scales: { y: { ticks: { callback: (v) => `${v}%` } } } },
  });
}

renderHoldingRows();
renderRouteOffer();
render();
