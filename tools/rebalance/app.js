const CONFIG = Object.freeze({
  parentBand: 0.05,
  stockBand: 0.05,
  etfBand: 0.03,
  stockAssets: [
    { key: "bmri", name: "BMRI", color: "#0e6b5d" },
    { key: "bbri", name: "BBRI", color: "#f36d4a" },
  ],
  etfAssets: [
    { key: "etf1", name: "VOO", color: "#0e6b5d" },
    { key: "etf2", name: "VXUS", color: "#78a65a" },
    { key: "etf3", name: "SMH", color: "#ffc857" },
    { key: "etf4", name: "NVDA", color: "#f36d4a" },
  ],
});

const DEFAULT_SETTINGS = Object.freeze({
  monthlyFund: 3_000_000,
  etfGlobal: 60,
  stockGlobal: 40,
  bmri: 60,
  bbri: 40,
  etf1: 50,
  etf2: 25,
  etf3: 20,
  etf4: 5,
});

const DEFAULT_TECHNICAL = Object.freeze({
  rdnCarry: 0,
  wireFee: 250_000,
  usdRate: 0,
});

const INITIAL_VALUES = Object.freeze({
  bmri: 4_000_000,
  bbri: 2_600_000,
  etf1: 4_500_000,
  etf2: 2_250_000,
  etf3: 1_800_000,
  etf4: 450_000,
});

const rupiahFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const percentNumberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimalPercentFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const EPSILON = 1e-9;

const elements = {
  inputs: {
    bmri: document.querySelector("#bmri-value"),
    bbri: document.querySelector("#bbri-value"),
    etf1: document.querySelector("#etf1-value"),
    etf2: document.querySelector("#etf2-value"),
    etf3: document.querySelector("#etf3-value"),
    etf4: document.querySelector("#etf4-value"),
  },
  targetInputs: {
    etfGlobal: document.querySelector("#target-etf-global"),
    stockGlobal: document.querySelector("#target-stock-global"),
    bmri: document.querySelector("#target-bmri"),
    bbri: document.querySelector("#target-bbri"),
    etf1: document.querySelector("#target-etf1"),
    etf2: document.querySelector("#target-etf2"),
    etf3: document.querySelector("#target-etf3"),
    etf4: document.querySelector("#target-etf4"),
  },
  targetTotals: {
    global: document.querySelector("#global-target-total"),
    stock: document.querySelector("#stock-target-total"),
    etf: document.querySelector("#etf-target-total"),
  },
  monthlyFund: document.querySelector("#monthly-fund"),
  rdnCarry: document.querySelector("#rdn-carry"),
  wireFee: document.querySelector("#wire-fee"),
  usdRate: document.querySelector("#usd-rate"),
  etfCurrency: document.querySelector("#etf-currency"),
  rdnAutoCopy: document.querySelector("#rdn-auto-copy"),
  technicalValidation: document.querySelector("#technical-validation"),
  targetValidation: document.querySelector("#target-validation"),
  metricMonthlyFund: document.querySelector("#metric-monthly-fund"),
  metricGlobalTarget: document.querySelector("#metric-global-target"),
  metricStockTarget: document.querySelector("#metric-stock-target"),
  metricEtfTarget: document.querySelector("#metric-etf-target"),
  liveShares: {
    bmri: document.querySelector("#bmri-live-share"),
    bbri: document.querySelector("#bbri-live-share"),
    etf1: document.querySelector("#etf1-live-share"),
    etf2: document.querySelector("#etf2-live-share"),
    etf3: document.querySelector("#etf3-live-share"),
    etf4: document.querySelector("#etf4-live-share"),
  },
  analyzeButton: document.querySelector("#analyze-button"),
  targetMonth: document.querySelector("#target-month"),
  resetButton: document.querySelector("#reset-button"),
  stockTotalInput: document.querySelector("#stock-total-input"),
  etfTotalInput: document.querySelector("#etf-total-input"),
  stockGlobalShare: document.querySelector("#stock-global-share"),
  etfGlobalShare: document.querySelector("#etf-global-share"),
  totalValue: document.querySelector("#total-value"),
  periodCopy: document.querySelector("#period-copy"),
  statusPanel: document.querySelector("#status-panel"),
  statusBadge: document.querySelector("#status-badge"),
  priorityPill: document.querySelector("#priority-pill"),
  statusTitle: document.querySelector("#status-title"),
  statusDescription: document.querySelector("#status-description"),
  heroEtfPercentage: document.querySelector("#hero-etf-percentage"),
  heroTargetCopy: document.querySelector("#hero-target-copy"),
  chartCenters: {
    global: document.querySelector("#global-chart-center"),
    stock: document.querySelector("#stock-chart-center"),
    etf: document.querySelector("#etf-chart-center"),
  },
  chartTargetCopies: {
    global: document.querySelector("#global-chart-target"),
    stock: document.querySelector("#stock-chart-target"),
    etf: document.querySelector("#etf-chart-target"),
  },
  miniStatuses: {
    global: document.querySelector("#global-mini-status"),
    stock: document.querySelector("#stock-mini-status"),
    etf: document.querySelector("#etf-mini-status"),
  },
  routingTitle: document.querySelector("#routing-title"),
  stockRoutePercent: document.querySelector("#stock-route-percent"),
  stockRouteValue: document.querySelector("#stock-route-value"),
  stockRouteNote: document.querySelector("#stock-route-note"),
  etfRoutePercent: document.querySelector("#etf-route-percent"),
  etfRouteValue: document.querySelector("#etf-route-value"),
  etfRouteNote: document.querySelector("#etf-route-note"),
  healthList: document.querySelector("#health-list"),
  instructionCallout: document.querySelector("#instruction-callout"),
  actionTimeline: document.querySelector("#action-timeline"),
  stockDetailKicker: document.querySelector("#stock-detail-kicker"),
  stockDetailTitle: document.querySelector("#stock-detail-title"),
  stockSplitTotal: document.querySelector("#stock-split-total"),
  stockSplitList: document.querySelector("#stock-split-list"),
  rdnExecutionSummary: document.querySelector("#rdn-execution-summary"),
  rdnRemainderNote: document.querySelector("#rdn-remainder-note"),
  etfDetailKicker: document.querySelector("#etf-detail-kicker"),
  etfDetailTitle: document.querySelector("#etf-detail-title"),
  etfSplitTotal: document.querySelector("#etf-split-total"),
  etfSplitList: document.querySelector("#etf-split-list"),
  wireFeeNote: document.querySelector("#wire-fee-note"),
  settlementKicker: document.querySelector("#settlement-kicker"),
  settlementTitle: document.querySelector("#settlement-title"),
  settlementList: document.querySelector("#settlement-list"),
  executionSteps: document.querySelector("#execution-steps"),
  projectionTitle: document.querySelector("#projection-title"),
  projectedEtfValue: document.querySelector("#projected-etf-value"),
  projectedEtfPercent: document.querySelector("#projected-etf-percent"),
  projectedEtfBar: document.querySelector("#projected-etf-bar"),
  projectedStockValue: document.querySelector("#projected-stock-value"),
  projectedStockPercent: document.querySelector("#projected-stock-percent"),
  projectedStockBar: document.querySelector("#projected-stock-bar"),
  projectionStatus: document.querySelector("#projection-status"),
  healthNote: document.querySelector("#health-note"),
  footerBand: document.querySelector("#footer-band"),
  saveRdnButton: document.querySelector("#save-rdn-button"),
  shortfallStock: document.querySelector("#shortfall-stock"),
  shortfallEtf: document.querySelector("#shortfall-etf"),
  shortfallNote: document.querySelector("#shortfall-note"),
};

const charts = {};
let lastValidSettings = { ...DEFAULT_SETTINGS };
let lastValidTechnical = { ...DEFAULT_TECHNICAL };
const RDN_STORAGE_PREFIX = "aras-portfolio-rdn:";
const MAX_SETTLEMENT_CARDS = 12;
let renderFrame = null;
let lastRemainder = 0;

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function parseCurrency(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

function parseDecimal(value) {
  let text = String(value).trim().replace(/[^\d.,]/g, "");
  if (!text) return 0;
  const hasDot = text.includes(".");
  const hasComma = text.includes(",");
  if (hasDot && hasComma) {
    const decimalAt = Math.max(text.lastIndexOf("."), text.lastIndexOf(","));
    text = `${text.slice(0, decimalAt).replace(/[.,]/g, "")}.${text.slice(decimalAt + 1).replace(/[.,]/g, "")}`;
  } else if (hasComma) {
    text = text.split(",").length > 2 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (hasDot && (text.split(".").length > 2 || /^\d{1,3}\.\d{3}$/.test(text))) {
    text = text.replace(/\./g, "");
  }
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseTarget(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : Number.NaN;
}

function formatCurrency(value) {
  return rupiahFormatter.format(Math.round(value)).replace(/\u00a0/g, " ");
}

function formatInputCurrency(value) {
  return numberFormatter.format(Math.round(value));
}

const usdFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "USD" });
const decimalInputFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function formatUsd(value) {
  return usdFormatter.format(value).replace(/\u00a0/g, " ");
}

function usdSplit(settlement, usdRate) {
  const totalCents = Math.round((settlement.amount / usdRate) * 100);
  const weights = settlement.allocation.map((item) => ({ ...item, weight: settlement.amount > 0 ? item.amount / settlement.amount : 0 }));
  const cents = allocateByWeights(totalCents, weights);
  return { total: totalCents / 100, rows: cents.map((item) => ({ name: item.name, usd: item.amount / 100 })) };
}

function formatCompactCurrency(value) {
  if (value >= 1_000_000) return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`;
  return formatCurrency(value);
}

function formatTargetNumber(value) {
  return percentNumberFormatter.format(value);
}

function formatPercent(value, digits = 2) {
  const formatter = digits === 1 ? oneDecimalPercentFormatter : percentFormatter;
  return `${formatter.format(value * 100)}%`;
}

function formatTargetList(definitions) {
  return definitions.map((item) => `${formatTargetNumber(item.weight * 100)}%`).join(" / ");
}

function nextMonth(period) {
  if (!/^\d{4}-\d{2}$/.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function readStoredRdn(period) {
  try {
    const value = localStorage.getItem(`${RDN_STORAGE_PREFIX}${period}`);
    return value === null ? null : Math.max(0, Number(value) || 0);
  } catch {
    return null;
  }
}

function storeRdn(period, value) {
  if (!period) return;
  try {
    localStorage.setItem(`${RDN_STORAGE_PREFIX}${period}`, String(Math.max(0, Math.round(value))));
  } catch {
    // The calculator still works when storage is blocked by browser policy.
  }
}

function allocateByWeights(total, definitions) {
  const roundedTotal = Math.round(total);
  const exactAmounts = definitions.map((item) => roundedTotal * item.weight);
  const amounts = exactAmounts.map(Math.floor);
  let remaining = roundedTotal - sum(amounts);
  const rankedIndices = definitions
    .map((item, index) => ({ index, fraction: exactAmounts[index] - amounts[index], weight: item.weight }))
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.fraction - a.fraction)
    .map((item) => item.index);
  let cursor = 0;
  while (remaining > 0 && rankedIndices.length) {
    amounts[rankedIndices[cursor % rankedIndices.length]] += 1;
    remaining -= 1;
    cursor += 1;
  }
  return definitions.map((item, index) => ({ ...item, amount: amounts[index] }));
}

function sharesOrWeights(values, definitions) {
  const total = sum(values);
  return total > 0 ? values.map((value) => value / total) : definitions.map((item) => item.weight);
}

function getSettings() {
  const raw = Object.fromEntries(Object.entries(elements.targetInputs).map(([key, input]) => [key, parseTarget(input.value)]));
  raw.monthlyFund = parseCurrency(elements.monthlyFund.value);
  const groupSums = {
    global: raw.etfGlobal + raw.stockGlobal,
    stock: raw.bmri + raw.bbri,
    etf: raw.etf1 + raw.etf2 + raw.etf3 + raw.etf4,
  };
  const validGroups = Object.values(groupSums).every((total) => Number.isFinite(total) && Math.abs(total - 100) <= EPSILON);
  const validFields = Object.values(raw).every(Number.isFinite);
  const valid = validGroups && validFields && raw.monthlyFund > 0;
  if (valid) lastValidSettings = { ...raw };
  const applied = valid ? raw : lastValidSettings;

  return {
    raw,
    groupSums,
    valid,
    monthlyFund: applied.monthlyFund,
    etfGlobalTarget: applied.etfGlobal / 100,
    stockGlobalTarget: applied.stockGlobal / 100,
    stockTargets: CONFIG.stockAssets.map((item) => ({ ...item, weight: applied[item.key] / 100 })),
    etfTargets: CONFIG.etfAssets.map((item) => ({ ...item, weight: applied[item.key] / 100 })),
  };
}

function updateSettingsValidation(settings) {
  Object.entries(elements.targetTotals).forEach(([group, element]) => {
    const total = settings.groupSums[group];
    element.textContent = Number.isFinite(total) ? `Total ${formatTargetNumber(total)}%` : "Input tidak valid";
    element.classList.toggle("valid", Number.isFinite(total) && Math.abs(total - 100) <= EPSILON);
  });
  elements.targetValidation.classList.toggle("valid", settings.valid);
  elements.targetValidation.textContent = settings.valid
    ? "Target dan dana bulanan valid. Semua rekomendasi sudah memakai input manual ini."
    : "Input belum valid. Setiap kelompok target harus 100% dan dana bulanan harus lebih dari Rp0. Kalkulator sementara memakai pengaturan valid terakhir.";
}

function getTechnicalSettings() {
  const raw = {
    rdnCarry: parseCurrency(elements.rdnCarry.value),
    wireFee: parseCurrency(elements.wireFee.value),
    usdRate: parseDecimal(elements.usdRate.value),
  };
  const valid = raw.rdnCarry >= 0 && raw.wireFee >= 0 && (raw.usdRate > 0 || elements.etfCurrency.value !== "usd");
  if (valid) lastValidTechnical = { ...raw };
  return { ...(valid ? raw : lastValidTechnical), valid };
}

function updateTechnicalValidation(technical) {
  elements.technicalValidation.classList.toggle("valid", technical.valid);
  elements.technicalValidation.textContent = technical.valid
    ? "Harga saham, saldo RDN, dan biaya wire sudah aktif dalam Action Plan."
    : "Saldo RDN dan biaya wire tidak boleh negatif, dan kurs USD/IDR wajib diisi bila satuan ETF US$. Kalkulator sementara memakai pengaturan teknis valid terakhir.";
}

let lastEtfUnit = "idr";
const isEtfKey = (key) => key.startsWith("etf");

function parseAssetInput(key, value, unit = elements.etfCurrency.value) {
  return isEtfKey(key) && unit === "usd" ? parseDecimal(value) : parseCurrency(value);
}

function formatAssetInput(key, value, unit = elements.etfCurrency.value) {
  return isEtfKey(key) && unit === "usd" ? decimalInputFormatter.format(value) : formatInputCurrency(value);
}

function syncEtfUnitLabels() {
  const label = elements.etfCurrency.value === "usd" ? "US$" : "Rp";
  CONFIG.etfAssets.forEach(({ key }) => { elements.inputs[key].parentElement.firstElementChild.textContent = label; });
}

// Nilai ETF bersatuan US$ dikonversi ke rupiah (kurs efektif) agar seluruh perhitungan tetap satu mata uang.
function getRawValues(technical) {
  const rate = technical ? technical.usdRate : DEFAULT_TECHNICAL.usdRate;
  return Object.fromEntries(Object.entries(elements.inputs).map(([key, input]) => {
    const value = parseAssetInput(key, input.value);
    return [key, isEtfKey(key) && elements.etfCurrency.value === "usd" ? value * rate : value];
  }));
}

function issueStatus(share, target, band) {
  if (share < target - band - EPSILON) return "low";
  if (share > target + band + EPSILON) return "high";
  return "safe";
}

// Rebalancing hanya dengan dana baru (water-filling): aset di bawah target diisi sampai
// level yang sama (proporsional target) tanpa melewati target; aset overweight dapat Rp0.
function allocateRebalance(values, total, definitions) {
  const budget = Math.round(total);
  if (budget <= 0) return allocateByWeights(0, definitions);
  let set = definitions.map((_, i) => i).filter((i) => definitions[i].weight > 0);
  let level = 0;
  while (set.length) {
    level = (budget + sum(set.map((i) => values[i]))) / sum(set.map((i) => definitions[i].weight));
    const drop = set.filter((i) => values[i] > definitions[i].weight * level + EPSILON);
    if (!drop.length) break;
    set = set.filter((i) => !drop.includes(i));
  }
  if (!set.length) return allocateByWeights(budget, definitions);
  const exact = definitions.map((item, i) => (set.includes(i) ? Math.max(0, item.weight * level - values[i]) : 0));
  const exactTotal = sum(exact);
  if (exactTotal <= EPSILON) return allocateByWeights(budget, definitions);
  const weighted = definitions.map((item, i) => ({ ...item, weight: exact[i] / exactTotal }));
  return allocateByWeights(budget, weighted).map((row, i) => ({ ...definitions[i], amount: row.amount }));
}

function calculateLotExecution(allocation, recommendedBudget, technical) {
  const totalCapital = recommendedBudget + technical.rdnCarry;
  const active = allocation.filter((item) => item.amount > 0);
  if (recommendedBudget <= 0 || active.length === 0) {
    return {
      recommendedBudget,
      openingCarry: technical.rdnCarry,
      totalCapital,
      totalSpent: 0,
      remainder: totalCapital,
      trades: allocation.map((item) => ({ ...item, budget: 0, price: technical[`${item.key}Price`], lotCost: technical[`${item.key}Price`] * 100, lots: 0, shares: 0, spent: 0 })),
    };
  }

  const weights = allocation.map((item) => ({ ...item, weight: item.amount / recommendedBudget }));
  const budgets = allocateByWeights(totalCapital, weights);
  const trades = budgets.map((item) => {
    const price = technical[`${item.key}Price`];
    const lotCost = price * 100;
    const lots = lotCost > 0 ? Math.floor(item.amount / lotCost) : 0;
    const shares = lots * 100;
    const spent = lots * lotCost;
    return { ...item, budget: item.amount, price, lotCost, lots, shares, spent };
  });
  let totalSpent = sum(trades.map((item) => item.spent));
  let remainder = totalCapital - totalSpent;
  const activeTrades = trades.filter((item) => item.weight > 0);
  let safety = 0;
  while (activeTrades.some((item) => item.lotCost <= remainder) && safety < activeTrades.length * 2) {
    const affordable = activeTrades.filter((item) => item.lotCost <= remainder);
    affordable.sort((a, b) => {
      const aGap = (a.budget - a.spent) / Math.max(a.budget, 1);
      const bGap = (b.budget - b.spent) / Math.max(b.budget, 1);
      return bGap - aGap;
    });
    const selected = affordable[0];
    const extraLots = Math.max(1, Math.floor(remainder / selected.lotCost));
    const extraSpent = extraLots * selected.lotCost;
    selected.lots += extraLots;
    selected.shares += extraLots * 100;
    selected.spent += extraSpent;
    totalSpent += extraSpent;
    remainder -= extraSpent;
    safety += 1;
  }
  return {
    recommendedBudget,
    openingCarry: technical.rdnCarry,
    totalCapital,
    totalSpent,
    remainder,
    trades,
  };
}

function settlementIndices(firstIndex, lastIndex) {
  const count = Math.max(0, lastIndex - firstIndex + 1);
  if (count <= MAX_SETTLEMENT_CARDS) return Array.from({ length: count }, (_, index) => firstIndex + index);
  const edgeCount = MAX_SETTLEMENT_CARDS / 2;
  return [
    ...Array.from({ length: edgeCount }, (_, index) => firstIndex + index),
    ...Array.from({ length: edgeCount }, (_, index) => lastIndex - edgeCount + index + 1),
  ];
}

const MAX_RECOVERY_MONTHS = 1200;

function buildParentPlan(direction, fullMonths, remainder, settings, normalStock, normalEtf) {
  const isStock = direction === "parent-stock";
  const fund = settings.monthlyFund;
  const schedule = [];
  for (let month = 1; month <= fullMonths; month += 1) {
    schedule.push({ month, stock: isStock ? fund : 0, etf: isStock ? 0 : fund, phase: "full" });
  }
  const closingAmount = Math.round(remainder);
  let closing = null;
  if (closingAmount > 0) {
    const stock = isStock ? Math.min(fund, normalStock + closingAmount) : Math.max(0, normalStock - closingAmount);
    closing = { month: fullMonths + 1, stock, etf: fund - stock, phase: "closing", gap: closingAmount };
    schedule.push(closing);
  }
  const normalStart = schedule.length + 1;
  const horizon = Math.max(3, Math.ceil(normalStart / 3) * 3);
  for (let month = normalStart; month <= horizon; month += 1) {
    schedule.push({ month, stock: normalStock, etf: normalEtf, phase: "normal" });
  }
  const etfMonths = schedule.filter((entry) => entry.etf > 0);
  const lastIndex = Math.ceil(horizon / 3);
  const firstIndex = etfMonths.length ? Math.ceil(etfMonths[0].month / 3) : lastIndex;
  const allCount = Math.max(0, lastIndex - firstIndex + 1);
  const settlements = settlementIndices(firstIndex, lastIndex).map((quarterIndex) => {
    const endMonth = quarterIndex * 3;
    const components = schedule
      .filter((entry) => entry.month > endMonth - 3 && entry.month <= endMonth && entry.etf > 0)
      .map((entry) => ({ month: entry.month, amount: entry.etf }));
    return { sequence: quarterIndex - firstIndex + 1, month: endMonth, amount: sum(components.map((item) => item.amount)), components };
  });
  return {
    firstMonth: schedule[0],
    schedule,
    closing,
    settlements,
    settlementCount: allCount,
    settlementsOmitted: Math.max(0, allCount - settlements.length),
    normalStartMonth: normalStart,
    settlementHorizon: horizon,
    cycleStock: sum(schedule.map((entry) => entry.stock)),
    cycleEtf: sum(schedule.map((entry) => entry.etf)),
  };
}

function buildChildrenPlan(settings, normalStock, normalEtf) {
  const schedule = [1, 2, 3].map((month) => ({ month, stock: normalStock, etf: normalEtf, phase: "children" }));
  return {
    firstMonth: schedule[0],
    schedule,
    settlements: [{
      month: 3,
      sequence: 1,
      amount: normalEtf * 3,
      components: schedule.map((entry) => ({ month: entry.month, amount: entry.etf })),
    }],
    settlementCount: 1,
    settlementsOmitted: 0,
    normalStartMonth: 1,
    settlementHorizon: 3,
    cycleStock: normalStock * 3,
    cycleEtf: normalEtf * 3,
  };
}

function getState(values, settings, technical) {
  const stockValues = settings.stockTargets.map((item) => values[item.key]);
  const etfValues = settings.etfTargets.map((item) => values[item.key]);
  const stockTotal = sum(stockValues);
  const etfTotal = sum(etfValues);
  const total = stockTotal + etfTotal;
  const etfShare = total > 0 ? etfTotal / total : settings.etfGlobalTarget;
  const stockShare = 1 - etfShare;
  const stockShares = sharesOrWeights(stockValues, settings.stockTargets);
  const etfShares = sharesOrWeights(etfValues, settings.etfTargets);
  const lowerEtfBand = Math.max(0, settings.etfGlobalTarget - CONFIG.parentBand);
  const upperEtfBand = Math.min(1, settings.etfGlobalTarget + CONFIG.parentBand);

  let parentStatus = "safe";
  if (etfShare < lowerEtfBand - EPSILON) parentStatus = "etf-low";
  else if (etfShare > upperEtfBand + EPSILON) parentStatus = "stock-low";

  const stockIssues = settings.stockTargets.map((item, index) => ({ ...item, share: stockShares[index], delta: stockShares[index] - item.weight, status: issueStatus(stockShares[index], item.weight, CONFIG.stockBand) }));
  const etfIssues = settings.etfTargets.map((item, index) => ({ ...item, share: etfShares[index], delta: etfShares[index] - item.weight, status: issueStatus(etfShares[index], item.weight, CONFIG.etfBand) }));
  const stockBroken = stockIssues.some((item) => item.status !== "safe");
  const etfBroken = etfIssues.some((item) => item.status !== "safe");
  const stockDeepest = stockIssues.reduce((lowest, item) => item.delta < lowest.delta ? item : lowest, stockIssues[0]);

  const normalEtf = Math.round(settings.monthlyFund * settings.etfGlobalTarget);
  const normalStock = settings.monthlyFund - normalEtf;
  const targetEtfValue = total * settings.etfGlobalTarget;
  const targetStockValue = total * settings.stockGlobalTarget;
  const etfDeficit = Math.max(0, targetEtfValue - etfTotal);
  const stockDeficit = Math.max(0, targetStockValue - stockTotal);

  const inverseActive = parentStatus === "safe" && etfBroken;

  let mode = "safe";
  if (parentStatus === "etf-low") mode = "parent-etf";
  else if (parentStatus === "stock-low") mode = "parent-stock";
  else if (stockBroken && etfBroken) mode = "double-child";
  else if (stockBroken) mode = "stock-child";
  else if (etfBroken) mode = "etf-child";

  let plan;
  let calculatedFullMonths = 0;
  let fullMonths = 0;
  if (mode === "parent-etf" || mode === "parent-stock") {
    const deficit = mode === "parent-etf" ? etfDeficit : stockDeficit;
    const increment = mode === "parent-etf" ? settings.monthlyFund - normalEtf : settings.monthlyFund - normalStock;
    const rawMonths = increment > 0 ? deficit / increment : 0;
    calculatedFullMonths = Math.min(MAX_RECOVERY_MONTHS, Math.floor(rawMonths));
    fullMonths = calculatedFullMonths;
    const closingGap = rawMonths >= MAX_RECOVERY_MONTHS ? 0 : deficit - calculatedFullMonths * increment;
    plan = buildParentPlan(mode, fullMonths, closingGap, settings, normalStock, normalEtf);
  } else {
    plan = buildChildrenPlan(settings, normalStock, normalEtf);
  }

  const cycleStock = plan.cycleStock;
  const cycleEtf = plan.cycleEtf;
  // Koreksi kekurangan internal: aktif saat parent perlu pemulihan ATAU children keluar band.
  const stockFix = parentStatus !== "safe" || stockBroken;
  const etfShortfallAware = parentStatus !== "safe" || etfBroken;
  const stockAllocation = allocateByWeights(cycleStock, settings.stockTargets);
  const etfAllocation = allocateByWeights(cycleEtf, settings.etfTargets);
  const firstMonth = plan.firstMonth;

  // ETF: alokasi per kuartal, berurutan (setoran berikutnya memakai posisi setelah setoran sebelumnya).
  const quarterAmounts = new Map();
  plan.schedule.forEach((entry) => {
    if (entry.etf > 0) quarterAmounts.set(Math.ceil(entry.month / 3), (quarterAmounts.get(Math.ceil(entry.month / 3)) || 0) + entry.etf);
  });
  let runningEtf = etfValues.slice();
  const quarterAllocation = new Map();
  [...quarterAmounts.keys()].sort((a, b) => a - b).forEach((quarter) => {
    const amount = quarterAmounts.get(quarter);
    const allocation = etfShortfallAware ? allocateRebalance(runningEtf, amount, settings.etfTargets) : allocateByWeights(amount, settings.etfTargets);
    runningEtf = runningEtf.map((value, index) => value + allocation[index].amount);
    quarterAllocation.set(quarter, allocation);
  });
  const etfPlanned = runningEtf.map((value, index) => value - etfValues[index]);
  plan.settlements = plan.settlements.map((settlement) => ({ ...settlement, allocation: quarterAllocation.get(settlement.month / 3) }));

  // Saham: alokasi per bulan yang memang ada belanja saham, berurutan.
  let runningStock = stockValues.slice();
  const stockPlan = [];
  plan.schedule.forEach((entry) => {
    if (entry.stock <= 0) return;
    const allocation = stockFix ? allocateRebalance(runningStock, entry.stock, settings.stockTargets) : allocateByWeights(entry.stock, settings.stockTargets);
    runningStock = runningStock.map((value, index) => value + allocation[index].amount);
    stockPlan.push({ month: entry.month, amount: entry.stock, phase: entry.phase, allocation });
  });
  const stockPlanned = runningStock.map((value, index) => value - stockValues[index]);
  const currentStockAllocation = stockPlan.length && stockPlan[0].month === firstMonth.month ? stockPlan[0].allocation : allocateByWeights(0, settings.stockTargets);

  const afterRows = (targets, values, planned, shares) => {
    const afterTotal = sum(values) + sum(planned);
    return targets.map((item, index) => ({
      name: item.name, share: shares[index], target: item.weight, planned: planned[index],
      after: afterTotal > 0 ? (values[index] + planned[index]) / afterTotal : item.weight,
    }));
  };
  const shortfall = {
    stock: afterRows(settings.stockTargets, stockValues, stockPlanned, stockShares),
    etf: afterRows(settings.etfTargets, etfValues, etfPlanned, etfShares),
  };

  const nextSettlement = plan.settlements[0] || {
    month: 3,
    amount: 0,
    components: [],
    allocation: allocateByWeights(0, settings.etfTargets),
  };
  const projectedStock = stockTotal + cycleStock;
  const projectedEtf = etfTotal + cycleEtf;
  const projectedTotal = projectedStock + projectedEtf;
  const projectedEtfShare = projectedTotal > 0 ? projectedEtf / projectedTotal : settings.etfGlobalTarget;

  return {
    settings,
    technical,
    values,
    stockValues,
    etfValues,
    stockTotal,
    etfTotal,
    total,
    etfShare,
    stockShare,
    stockShares,
    etfShares,
    lowerEtfBand,
    upperEtfBand,
    parentStatus,
    stockIssues,
    etfIssues,
    stockBroken,
    etfBroken,
    inverseActive,
    etfShortfallAware,
    shortfall,
    stockPlan,
    schedule: plan.schedule,
    closingMonth: plan.closing || null,
    stockDeepest,
    normalStock,
    normalEtf,
    targetEtfValue,
    targetStockValue,
    etfDeficit,
    stockDeficit,
    mode,
    calculatedFullMonths,
    fullMonths,
    settlements: plan.settlements,
    settlementCount: plan.settlementCount,
    settlementsOmitted: plan.settlementsOmitted,
    normalStartMonth: plan.normalStartMonth,
    settlementHorizon: plan.settlementHorizon,
    cycleStock,
    cycleEtf,
    stockAllocation,
    etfAllocation,
    currentStockAllocation,
    nextSettlement,
    firstMonth,
    projectedStock,
    projectedEtf,
    projectedEtfShare,
  };
}

function stockAllocationSentence(state, monthly = true) {
  if (state.parentStatus === "safe" && state.stockBroken) {
    const parts = state.currentStockAllocation.filter((item) => item.amount > 0);
    return parts.length === 1
      ? `Beli HANYA ${parts[0].name} sebesar ${formatCurrency(parts[0].amount)}; saham lain Rp 0`
      : `Koreksi ke target: ${parts.map((item) => `${item.name} ${formatCurrency(item.amount)}`).join(" dan ")}`;
  }
  const allocation = allocateByWeights(monthly ? state.normalStock : state.cycleStock, state.settings.stockTargets);
  return allocation.map((item) => `${item.name} ${formatCurrency(item.amount)}`).join(" dan ");
}

function etfAllocationSentence(allocation) {
  return allocation.filter((item) => item.amount > 0).map((item) => `${item.name} ${formatCurrency(item.amount)}`).join(", ");
}

function parentRecoveryContent(state) {
  const isEtf = state.mode === "parent-etf";
  const activeName = isEtf ? "ETF Global" : "Saham Lokal";
  const deficit = isEtf ? state.etfDeficit : state.stockDeficit;
  const lines = [`Parent ${activeName} berada di luar band target manual. Prioritas parent mengalahkan seluruh sinyal children.`];
  if (state.fullMonths > 0) lines.push(`- Bulan ${state.fullMonths > 1 ? `1 s.d. ${state.fullMonths}` : "1"}: alihkan ${formatCurrency(state.settings.monthlyFund)} penuh per bulan ke ${activeName}; parent lain Rp 0.`);
  if (state.closingMonth) {
    const c = state.closingMonth;
    lines.push(`- Bulan ${c.month} (Penutup): Saham ${formatCurrency(c.stock)} dan ETF ${formatCurrency(c.etf)}. Ini menutup sisa defisit ${formatCurrency(c.gap)} tepat di target tanpa melewatinya.`);
  }
  if (state.firstMonth.stock > 0) lines.push(`- Eksekusi riil bulan ini mengikuti lot BEI. ${lotExecutionSentence(state)}`);
  lines.push("- Pembagian ke tiap saham/ETF sudah dikoreksi terhadap kekurangan internalnya (lihat panel Kekurangan vs target).");
  lines.push(`- Bulan ${state.normalStartMonth} dan seterusnya: kembali ke jatah normal Saham ${formatCurrency(state.normalStock)} dan ETF ${formatCurrency(state.normalEtf)} per bulan.`);
  return {
    panelStatus: "global-broken",
    badge: `\u26A0 Parent ${activeName} underweight`,
    priority: state.fullMonths > 0 ? `${state.fullMonths} bulan penuh${state.closingMonth ? " + 1 penutup" : ""}` : "1 bulan penutup",
    title: `Pulihkan parent ${activeName} terlebih dahulu.`,
    description: `Defisit nominal ${formatCurrency(deficit)}. Pemeriksaan kamar saham dan ETF ditunda sampai parent kembali aman.`,
    instruction: lines.join("\n"),
  };
}

function lotExecutionSentence() {
  return "Jumlah lot dihitung di kartu bulanan sesuai harga saham yang Anda isi.";
}

function statusContent(state) {
  if (state.mode === "parent-etf" || state.mode === "parent-stock") return parentRecoveryContent(state);
  const stockMonthly = stockAllocationSentence(state);
  const firstSettlement = state.settlements[0];
  const etfBuy = etfAllocationSentence(firstSettlement.allocation);

  if (state.mode === "stock-child") {
    return {
      panelStatus: "children-broken",
      badge: "Targeted Vacuum saham",
      priority: `${state.stockDeepest.name} paling tertinggal`,
      title: `Kunci jatah saham hanya ke ${state.stockDeepest.name}.`,
      description: "Parent global dan kamar ETF aman. Hanya jalur internal saham yang diubah; jatah ETF tetap ditabung normal.",
      instruction: `POV Cash Flow Bulan Ini:\n- Transfer ${formatCurrency(state.normalStock)} ke RDN sebagai anggaran maksimum. ${stockMonthly}.\n- ${lotExecutionSentence(state)}\n- Saham yang overweight tidak dibeli sampai rasio internal kembali mendekati target. Sisa yang tidak cukup satu lot wajib tetap mengendap di RDN sebagai amunisi bulan depan.\n- Tabung jatah ETF ${formatCurrency(state.normalEtf)} di rekening penampung. Pada akhir bulan ke-3, setor ${formatCurrency(firstSettlement.amount)} ke IBKR menggunakan split target normal.`,
    };
  }

  if (state.mode === "etf-child") {
    return {
      panelStatus: "children-broken",
      badge: "Inverse Allocation ETF",
      priority: "Kamar global assets perlu koreksi",
      title: "Tahan kas ETF, lalu serang ETF yang paling defisit.",
      description: "Parent global dan kamar saham aman. Belanja saham tetap normal, sedangkan setoran IBKR diarahkan hanya ke ETF yang mengalami defisit internal.",
      instruction: `POV Cash Flow 3 Bulan:\n- Bulan ini beli saham normal sebesar ${formatCurrency(state.normalStock)}: ${stockMonthly}. ${lotExecutionSentence(state)}\n- Bulan 1 dan 2: simpan ${formatCurrency(state.normalEtf)}/bulan di rekening penampung lokal; jangan kirim lebih awal ke IBKR.\n- Bulan 3: tambahkan ${formatCurrency(state.normalEtf)}, lalu wire transfer total ${formatCurrency(firstSettlement.amount)} ke IBKR. Coret ETF yang surplus dan gunakan fractional shares untuk membeli hanya ETF defisit: ${etfBuy}.`,
    };
  }

  if (state.mode === "double-child") {
    return {
      panelStatus: "children-broken",
      badge: "\u26A0 Double-children error",
      priority: "Perbaikan agresif serentak",
      title: "Perbaiki dua kamar tanpa mengubah jatah parent.",
      description: "Parent global aman, tetapi internal saham dan ETF sama-sama rusak. Kedua jatah normal bekerja paralel dengan jalur korektif masing-masing.",
      instruction: `POV Cash Flow Operasional:\n- Bulan ini transfer ${formatCurrency(state.normalStock)} ke RDN. ${stockMonthly}. ${lotExecutionSentence(state)} Saham overweight Rp 0; sisa pembulatan lot tetap di RDN.\n- Bulan 1 dan 2: amankan ${formatCurrency(state.normalEtf)}/bulan di rekening penampung lokal tanpa dibelanjakan.\n- Akhir bulan 3: tambahkan ${formatCurrency(state.normalEtf)}, wire transfer total ${formatCurrency(firstSettlement.amount)} ke IBKR, lalu beli hanya ETF yang defisit menggunakan fractional shares: ${etfBuy}. ETF surplus mendapat Rp 0.`,
    };
  }

  return {
    panelStatus: "safe",
    badge: "Semua kamar aman",
    priority: "Belanja rutin",
    title: "Parent dan children sesuai target.",
    description: "Tidak ada jalur yang perlu divakum atau dibalik. Gunakan pembagian target manual secara normal.",
    instruction: `POV Cash Flow Normal:\n- Saham bulan ini ${formatCurrency(state.normalStock)}: ${stockMonthly}. ${lotExecutionSentence(state)}\n- ETF ${formatCurrency(state.normalEtf)}/bulan ditampung. Akhir bulan ke-3, setor ${formatCurrency(firstSettlement.amount)} ke IBKR: ${etfBuy}.`,
  };
}

function getStockStatusText(state) {
  return state.stockBroken ? `${state.stockDeepest.name} paling underweight` : "Aman";
}

function getEtfStatusText(state) {
  if (!state.etfBroken) return "Aman";
  const lows = state.etfIssues.filter((item) => item.status === "low").map((item) => item.name);
  return lows.length ? `${lows.join(", ")} defisit` : "Ada ETF surplus";
}

function renderSettings(state) {
  const settings = state.settings;
  elements.metricMonthlyFund.textContent = formatCompactCurrency(settings.monthlyFund);
  elements.metricGlobalTarget.textContent = `${formatTargetNumber(settings.etfGlobalTarget * 100)} / ${formatTargetNumber(settings.stockGlobalTarget * 100)}`;
  elements.metricStockTarget.textContent = settings.stockTargets.map((item) => formatTargetNumber(item.weight * 100)).join(" / ");
  elements.metricEtfTarget.textContent = settings.etfTargets.map((item) => formatTargetNumber(item.weight * 100)).join("/");
  elements.heroTargetCopy.textContent = `Target ETF ${formatPercent(settings.etfGlobalTarget, 1)} · zona ${formatPercent(state.lowerEtfBand, 1)}-${formatPercent(state.upperEtfBand, 1)}`;
  // Increment pemulihan: ETF = dana - jatah ETF normal (= jatah saham normal); saham sebaliknya.
  elements.healthNote.textContent = `Rumus durasi aktif: defisit ETF dibagi ${formatCurrency(state.normalStock)}; defisit saham dibagi ${formatCurrency(state.normalEtf)}. Bulan penuh dibulatkan ke bawah; sisa defisit ditutup di satu bulan penutup agar berhenti tepat di target.`;
  elements.footerBand.textContent = `ETF <${formatPercent(state.lowerEtfBand, 0).replace(",00","")} · aman ${formatPercent(state.lowerEtfBand, 0).replace(",00","")}-${formatPercent(state.upperEtfBand, 0).replace(",00","")} · ETF >${formatPercent(state.upperEtfBand, 0).replace(",00","")}`;
  elements.chartTargetCopies.global.textContent = `Target ETF ${formatPercent(settings.etfGlobalTarget, 1)} · band ±5 poin`;
  elements.chartTargetCopies.stock.textContent = `${settings.stockTargets[0].name} ${formatPercent(settings.stockTargets[0].weight, 1)} · ${settings.stockTargets[1].name} ${formatPercent(settings.stockTargets[1].weight, 1)} · band ±5`;
  elements.chartTargetCopies.etf.textContent = `${formatTargetList(settings.etfTargets)} · band ±3 poin`;
}

function renderInputSummary(state) {
  elements.stockTotalInput.textContent = formatCurrency(state.stockTotal);
  elements.etfTotalInput.textContent = formatCurrency(state.etfTotal);
  elements.totalValue.textContent = formatCurrency(state.total);
  elements.stockGlobalShare.textContent = `${formatPercent(state.stockShare)} portfolio`;
  elements.etfGlobalShare.textContent = state.technical.usdRate > 0 ? `${formatPercent(state.etfShare)} portfolio · ≈ ${formatUsd(state.etfTotal / state.technical.usdRate)}` : `${formatPercent(state.etfShare)} portfolio`;
  state.settings.stockTargets.forEach((item, index) => { elements.liveShares[item.key].textContent = formatPercent(state.stockShares[index]); });
  state.settings.etfTargets.forEach((item, index) => { elements.liveShares[item.key].textContent = formatPercent(state.etfShares[index]); });
}

function renderStatus(state, content) {
  elements.statusPanel.dataset.status = content.panelStatus;
  elements.statusBadge.textContent = content.badge;
  elements.priorityPill.textContent = content.priority;
  elements.statusTitle.textContent = content.title;
  elements.statusDescription.textContent = content.description;
  elements.heroEtfPercentage.textContent = formatPercent(state.etfShare);
}

function setMiniStatus(element, text, safe) {
  element.textContent = text;
  element.classList.toggle("safe", safe);
}

function renderCharts(state) {
  if (charts.global) {
    charts.global.data.datasets[0].data = [state.etfTotal, state.stockTotal];
    charts.stock.data.datasets[0].data = state.stockValues;
    charts.etf.data.datasets[0].data = state.etfValues;
    Object.values(charts).forEach((chart) => chart.update("none"));
  }
  elements.chartCenters.global.textContent = formatPercent(state.etfShare, 1);
  elements.chartCenters.stock.textContent = formatPercent(state.stockShares[0], 1);
  elements.chartCenters.etf.textContent = formatPercent(state.etfShares[0], 1);
  setMiniStatus(elements.miniStatuses.global, state.parentStatus === "safe" ? "Parent aman" : state.parentStatus === "etf-low" ? "ETF parent underweight" : "Saham parent underweight", state.parentStatus === "safe");
  setMiniStatus(elements.miniStatuses.stock, getStockStatusText(state), !state.stockBroken);
  setMiniStatus(elements.miniStatuses.etf, getEtfStatusText(state), !state.etfBroken);
}

function renderRoutes(state) {
  elements.routingTitle.textContent = state.parentStatus === "safe" ? "Jatah Parent Tetap" : "Prioritas Parent";
  elements.stockRoutePercent.textContent = formatPercent(state.firstMonth.stock / state.settings.monthlyFund, 1);
  elements.stockRouteValue.textContent = formatCurrency(state.firstMonth.stock);
  elements.etfRoutePercent.textContent = formatPercent(state.firstMonth.etf / state.settings.monthlyFund, 1);
  elements.etfRouteValue.textContent = formatCurrency(state.firstMonth.etf);
  elements.stockRouteNote.textContent = state.parentStatus === "safe" && state.stockBroken ? `Targeted Vacuum → ${state.stockDeepest.name}` : "Jatah parent sesuai target";
  elements.etfRouteNote.textContent = state.inverseActive ? "Ditampung untuk Inverse Allocation" : "Ditampung sesuai target";
}

function healthRow(level, name, actual, target, status, safe) {
  return `<div class="health-row"><div><span>${level}</span><strong>${name}</strong></div><div class="health-reading"><p>${actual} <small>${target}</small></p><em class="${safe ? "safe" : ""}">${status}</em></div></div>`;
}

function renderHealth(state) {
  const modeLabels = {
    safe: "AMAN",
    "stock-child": "KOREKSI SAHAM",
    "etf-child": "KOREKSI GLOBAL ASSETS",
    "double-child": "KOREKSI SERENTAK",
    "parent-etf": "RECOVERY PARENT ETF",
    "parent-stock": "RECOVERY PARENT SAHAM",
  };
  elements.healthList.innerHTML = [
    healthRow("L1", "Global Parent", `ETF ${formatPercent(state.etfShare)}`, `/ target ${formatPercent(state.settings.etfGlobalTarget, 1)}`, state.parentStatus === "safe" ? "Aman" : state.parentStatus === "etf-low" ? "ETF underweight" : "Saham underweight", state.parentStatus === "safe"),
    healthRow("L2A", "Kamar Saham", state.stockShares.map((share) => formatPercent(share, 1)).join(" / "), `/ target ${formatTargetList(state.settings.stockTargets)}`, getStockStatusText(state), !state.stockBroken),
    healthRow("L2B", "Kamar Global Assets", state.etfShares.map((share) => formatPercent(share, 1)).join(" / "), `/ target ${formatTargetList(state.settings.etfTargets)}`, getEtfStatusText(state), !state.etfBroken),
    healthRow("ACT", "Mode Operasional", modeLabels[state.mode], "", state.parentStatus !== "safe" ? "Parent diprioritaskan" : "Cash flow children aktif", state.mode === "safe"),
  ].join("");
}

const PHASE_TEXT = { full: "Full", closing: "Penutup", normal: "Normal", children: "Koreksi" };
const TIMELINE_VISIBLE_MONTHS = 6;

function phaseBadge(state, entry) {
  if (entry.phase === "full") return `Full ${state.mode === "parent-etf" ? "ETF" : "Saham"}`;
  if (entry.phase === "normal" && state.parentStatus === "safe" && (state.stockBroken || state.etfBroken)) return "Koreksi";
  return PHASE_TEXT[entry.phase] || "Normal";
}

// Harga saham per bulan (manual). Bulan berikutnya mewarisi harga terakhir yang diisi.
const stockPrices = { bmri: {}, bbri: {} };

function resolveStockPrice(key, month) {
  for (let m = month; m >= 1; m -= 1) {
    if (stockPrices[key][m] > 0) return { price: stockPrices[key][m], from: m };
  }
  return null;
}

function clearMonthlyInputs() {
  Object.keys(settlementRates).forEach((key) => delete settlementRates[key]);
  Object.values(stockPrices).forEach((prices) => Object.keys(prices).forEach((month) => delete prices[month]));
}

function monthlyLotPlans(state, entries) {
  let carry = state.technical.rdnCarry;
  return entries.map((entry) => {
    const planned = state.stockPlan.find((item) => item.month === entry.month);
    const allocation = planned ? planned.allocation : allocateByWeights(0, state.settings.stockTargets);
    const activeKeys = allocation.filter((item) => item.amount > 0).map((item) => item.key);
    const prices = {};
    const missing = [];
    Object.keys(stockPrices).forEach((key) => {
      const resolved = resolveStockPrice(key, entry.month);
      prices[`${key}Price`] = resolved ? resolved.price : 1;
      if (!resolved && activeKeys.includes(key)) missing.push(key);
    });
    let execution;
    if (entry.stock > 0 && missing.length) {
      // Harga belum diisi: tampilkan alokasi rupiah, asumsikan belum ada pembelian.
      execution = {
        pending: true, missing, openingCarry: carry, remainder: carry + entry.stock,
        trades: allocation.map((item) => ({ ...item, budget: item.amount, lots: null, spent: 0 })),
      };
    } else {
      execution = { ...calculateLotExecution(allocation, entry.stock, { ...state.technical, ...prices, rdnCarry: carry }), pending: false };
    }
    carry = execution.remainder;
    return execution;
  });
}

function priceBoxes(keys, month) {
  if (!keys.length) return "";
  const boxes = keys.map((key) => {
    const own = stockPrices[key][month] > 0 ? formatInputCurrency(stockPrices[key][month]) : "";
    const inherited = resolveStockPrice(key, month - 1);
    const placeholder = inherited ? formatInputCurrency(inherited.price) : "isi harga";
    return `<label>${key.toUpperCase()} / lembar <input class="stock-price-input" data-ticker="${key}" data-month="${month}" type="text" inputmode="numeric" autocomplete="off" placeholder="${placeholder}" value="${own}"></label>`;
  });
  return `<span class="wire-rate price-row">${boxes.join("")}</span>`;
}

// Kurs hari kirim per setoran IBKR (manual). Kosong = pakai kurs saat ini (estimasi).
const settlementRates = {};

function actionCard(state, entry, execution) {
  const fee = state.technical.wireFee;
  const now = entry.month === state.firstMonth.month;
  const items = [];
  if (entry.stock > 0) {
    const carry = execution.openingCarry > 0 ? ` + saldo RDN ${formatCurrency(execution.openingCarry)}` : "";
    const active = execution.trades.filter((trade) => trade.budget > 0);
    const boxes = priceBoxes(active.map((trade) => trade.key), entry.month);
    const alloc = active.map((trade) => `${trade.name} ${formatCurrency(trade.budget)}`).join(" · ");
    if (execution.pending) {
      items.push(`<li><b>Saham</b>Transfer ${formatCurrency(entry.stock)}${carry} ke RDN. Alokasi: ${alloc}. <em>Isi harga saham di bawah untuk menghitung jumlah lot.</em>${boxes}</li>`);
    } else if (now) {
      const buys = execution.trades.filter((trade) => trade.lots > 0).map((trade) => `${trade.name} ${trade.lots} lot (${formatCurrency(trade.spent)})`).join(" · ") || "belum cukup untuk 1 lot";
      items.push(`<li><b>Saham</b>Transfer ${formatCurrency(entry.stock)}${carry} ke RDN. Beli ${buys}. Sisa ${formatCurrency(execution.remainder)} mengendap di RDN.${boxes}</li>`);
    } else {
      const approx = active.map((trade) => `${trade.name} ${trade.lots} lot`).join(", ");
      items.push(`<li><b>Saham</b>Transfer ${formatCurrency(entry.stock)}${carry} ke RDN. Alokasi: ${alloc} (perkiraan ${approx}). Jumlah lot dihitung ulang dengan harga hari itu; sisa mengendap di RDN.${boxes}</li>`);
    }
  } else {
    const idle = execution.remainder > 0 ? ` Saldo RDN ${formatCurrency(execution.remainder)} tetap mengendap.` : "";
    items.push(`<li class="muted"><b>Saham</b>Tidak ada belanja bulan ini.${idle}</li>`);
  }
  const settlement = state.settlements.find((item) => item.month === entry.month);
  if (entry.etf > 0) items.push(`<li><b>ETF</b>Tabung ${formatCurrency(entry.etf)} di rekening penampung${settlement ? "" : "; belum dikirim ke IBKR."}</li>`);
  else items.push(`<li class="muted"><b>ETF</b>Tidak ada tabungan ETF bulan ini.</li>`);
  if (settlement) {
    const manual = settlementRates[settlement.month] > 0;
    const rate = manual ? settlementRates[settlement.month] : state.technical.usdRate;
    const sources = settlement.components.map((item) => `bulan ${item.month} ${formatCurrency(item.amount)}`).join(", ");
    const reserve = `Siapkan ${formatCurrency(settlement.amount + fee)} termasuk biaya ${formatCurrency(fee)}.`;
    const placeholder = state.technical.usdRate > 0 ? decimalInputFormatter.format(state.technical.usdRate) : "isi manual";
    const rateInput = `<span class="wire-rate"><label>Kurs hari kirim <input class="wire-rate-input" data-month="${settlement.month}" type="text" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" value="${manual ? decimalInputFormatter.format(rate) : ""}"></label></span>`;
    const recheck = "<em>Estimasi: hitung ulang di hari kirim dengan kurs dan harga ETF terbaru.</em>";
    if (rate > 0) {
      const usd = usdSplit(settlement, rate);
      const buys = usd.rows.filter((item) => item.usd > 0).map((item) => `${item.name} ${formatUsd(item.usd)}`).join(" · ");
      const rateNote = manual ? "kurs hari kirim" : "kurs saat ini";
      items.push(`<li class="wire"><b>Setor IBKR</b>Kirim ${formatCurrency(settlement.amount)} (${sources}) ≈ <strong>${formatUsd(usd.total)}</strong> pada ${rateNote} ${formatCurrency(rate)}. ${reserve} Beli di IBKR (USD): ${buys}. ${recheck}${rateInput}</li>`);
    } else {
      const buys = settlement.allocation.filter((item) => item.amount > 0).map((item) => `${item.name} ${formatCurrency(item.amount)}`).join(" · ");
      items.push(`<li class="wire"><b>Setor IBKR</b>Kirim ${formatCurrency(settlement.amount)} (${sources}). ${reserve} Pembagian beli (Rp): ${buys}. ${recheck} Isi kurs untuk melihat nominal USD.${rateInput}</li>`);
    }
  }
  const estimate = now ? "" : '<span class="timeline-badge soft">Estimasi</span>';
  const note = now ? "" : `<p class="timeline-note">Dihitung dengan harga hari ini. Hitung ulang di awal bulan ${entry.month} dengan harga terbaru.</p>`;
  return `<li class="timeline-card${now ? " is-now" : ""}"><div class="timeline-head"><strong>Bulan ${entry.month}${now ? " · sekarang" : ""}</strong><span class="timeline-badges">${estimate}<span class="timeline-badge">${phaseBadge(state, entry)}</span></span></div>${note}<ul>${items.join("")}</ul></li>`;
}

function renderActionPlan(state) {
  elements.instructionCallout.textContent = `Jika semua langkah diikuti, porsi ETF global menjadi ${formatPercent(state.projectedEtfShare, 1)} pada akhir bulan ${state.settlementHorizon} (target ${formatPercent(state.settings.etfGlobalTarget, 1)}). Setelah itu, input ulang nilai pasar terbaru.`;
  const visible = state.schedule.slice(0, TIMELINE_VISIBLE_MONTHS);
  const plans = monthlyLotPlans(state, visible);
  const cards = visible.map((entry, index) => actionCard(state, entry, plans[index]));
  const rest = state.schedule.slice(TIMELINE_VISIBLE_MONTHS);
  if (rest.length) {
    cards.push(`<li class="timeline-card"><div class="timeline-head"><strong>Bulan ${rest[0].month}–${rest[rest.length - 1].month}</strong><span class="timeline-badge">Lanjutan</span></div><ul><li>Lanjutkan pola yang sama. Total saham ${formatCurrency(sum(rest.map((item) => item.stock)))}, total tabungan ETF ${formatCurrency(sum(rest.map((item) => item.etf)))}. Setoran IBKR tetap di akhir tiap kuartal dengan pembagian yang sudah dikoreksi.</li></ul></li>`);
  }
  elements.actionTimeline.innerHTML = cards.join("");
}

function shortfallRows(rows, usdRate) {
  const pts = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
  return rows.map((row) => {
    const gap = (row.share - row.target) * 100;
    const plan = row.planned > 0 ? `+${usdRate ? `${formatUsd(row.planned / usdRate)} (${formatCurrency(row.planned)})` : formatCurrency(row.planned)}` : (usdRate ? "US$ 0" : "Rp 0");
    return `<div class="rdn-execution-row"><span>${row.name} · ${formatPercent(row.share, 1)} dari target ${formatPercent(row.target, 1)} (${pts.format(gap)} poin)</span><strong>${plan} → ${formatPercent(row.after, 1)}</strong></div>`;
  }).join("");
}

function renderShortfall(state) {
  elements.shortfallStock.innerHTML = shortfallRows(state.shortfall.stock);
  elements.shortfallEtf.innerHTML = shortfallRows(state.shortfall.etf, state.technical.usdRate);
  const next = state.stockPlan[0];
  const stockNote = !next
    ? "Tidak ada belanja saham dalam horizon rencana ini."
    : next.month === state.firstMonth.month
      ? `Belanja saham pertama: bulan ini, ${formatCurrency(next.amount)}.`
      : `Belanja saham pertama: bulan ${next.month}, ${formatCurrency(next.amount)} → ${next.allocation.map((item) => `${item.name} ${formatCurrency(item.amount)}`).join(" dan ")}.`;
  const fixNote = state.etfShortfallAware
    ? "Dana ETF dibagi menurut kekurangan tiap ETF terhadap targetnya, bukan persentase target mentah."
    : "Semua kamar dalam band, dana dibagi sesuai target normal.";
  elements.shortfallNote.textContent = `${stockNote} ${fixNote} Kolom kanan: dana rencana dan porsi akhir setelah rencana.`;
}

function renderProjection(state) {
  const projectedStockShare = 1 - state.projectedEtfShare;
  elements.projectionTitle.textContent = `Proyeksi akhir bulan ke-${state.settlementHorizon}`;
  elements.projectedEtfValue.textContent = formatCurrency(state.projectedEtf);
  elements.projectedEtfPercent.textContent = formatPercent(state.projectedEtfShare);
  elements.projectedEtfBar.style.width = `${state.projectedEtfShare * 100}%`;
  elements.projectedStockValue.textContent = formatCurrency(state.projectedStock);
  elements.projectedStockPercent.textContent = formatPercent(projectedStockShare);
  elements.projectedStockBar.style.width = `${projectedStockShare * 100}%`;
  const safe = state.projectedEtfShare >= state.lowerEtfBand - EPSILON && state.projectedEtfShare <= state.upperEtfBand + EPSILON;
  elements.projectionStatus.textContent = safe ? "Parent tetap/masuk aman" : "Parent mendekati target";
  elements.projectionStatus.classList.toggle("projection-warning", !safe);
}

function render() {
  const settings = getSettings();
  const technical = getTechnicalSettings();
  updateSettingsValidation(settings);
  updateTechnicalValidation(technical);
  const state = getState(getRawValues(technical), settings, technical);
  const content = statusContent(state);
  renderSettings(state);
  renderInputSummary(state);
  renderStatus(state, content);
  renderCharts(state);
  renderRoutes(state);
  renderHealth(state);
  renderActionPlan(state);
  renderShortfall(state);
  renderProjection(state);
  const targetPeriod = nextMonth(elements.targetMonth.value);
  const firstLot = monthlyLotPlans(state, [state.firstMonth])[0];
  lastRemainder = firstLot.pending ? null : firstLot.remainder;
  elements.saveRdnButton.disabled = !targetPeriod || lastRemainder === null;
  elements.rdnAutoCopy.textContent = !targetPeriod
    ? "Pilih periode simulasi untuk menyimpan sisa RDN."
    : lastRemainder === null
      ? "Isi harga saham di kartu Bulan 1 agar sisa RDN bulan ini bisa dihitung."
      : `Sisa bulan ini ${formatCurrency(lastRemainder)}. Klik "Simpan sisa" setelah Anda benar-benar mengeksekusi order, agar jadi saldo awal periode ${targetPeriod}.`;
  if (window.rkChanged) window.rkChanged();
}

function scheduleRender() {
  if (renderFrame !== null) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null;
    render();
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "72%",
    borderWidth: 0,
    animation: { duration: 450 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#14231f",
        padding: 12,
        titleFont: { family: "Manrope", weight: "700" },
        bodyFont: { family: "DM Mono" },
        callbacks: {
          label(context) {
            const total = sum(context.dataset.data);
            return ` ${context.label}: ${formatPercent(total > 0 ? context.raw / total : 0)}`;
          },
        },
      },
    },
  };
}

function makeChart(id, labels, data, colors) {
  return new Chart(document.querySelector(id), { type: "doughnut", data: { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 3 }] }, options: chartOptions() });
}

function initializeCharts() {
  if (typeof Chart === "undefined") return;
  charts.global = makeChart("#global-chart", ["ETF Global", "Saham Lokal"], [9_000_000, 6_600_000], ["#0e6b5d", "#f36d4a"]);
  charts.stock = makeChart("#stock-chart", CONFIG.stockAssets.map((item) => item.name), CONFIG.stockAssets.map((item) => INITIAL_VALUES[item.key]), CONFIG.stockAssets.map((item) => item.color));
  charts.etf = makeChart("#etf-chart", CONFIG.etfAssets.map((item) => item.name), CONFIG.etfAssets.map((item) => INITIAL_VALUES[item.key]), CONFIG.etfAssets.map((item) => item.color));
}

function restoreInitialValues() {
  Object.entries(elements.inputs).forEach(([key, input]) => { input.value = formatInputCurrency(INITIAL_VALUES[key]); });
  render();
}

function resetSettings() {
  clearMonthlyInputs();
  elements.monthlyFund.value = formatInputCurrency(DEFAULT_SETTINGS.monthlyFund);
  Object.entries(elements.targetInputs).forEach(([key, input]) => { input.value = DEFAULT_SETTINGS[key]; });
  elements.rdnCarry.value = formatInputCurrency(DEFAULT_TECHNICAL.rdnCarry);
  elements.wireFee.value = formatInputCurrency(DEFAULT_TECHNICAL.wireFee);
  elements.usdRate.value = "";
  elements.etfCurrency.value = "idr";
  lastEtfUnit = "idr";
  syncEtfUnitLabels();
}

function loadRdnForPeriod() {
  const stored = readStoredRdn(elements.targetMonth.value);
  elements.rdnCarry.value = formatInputCurrency(stored ?? 0);
}

function updatePeriodCopy() {
  if (!elements.targetMonth.value) {
    elements.periodCopy.textContent = "Snapshot aktif";
    return;
  }
  const [year, month] = elements.targetMonth.value.split("-").map(Number);
  const period = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  elements.periodCopy.textContent = `Snapshot ${period}`;
}

elements.analyzeButton.addEventListener("click", render);
elements.saveRdnButton.addEventListener("click", () => {
  const targetPeriod = nextMonth(elements.targetMonth.value);
  if (!targetPeriod || lastRemainder === null) return;
  storeRdn(targetPeriod, lastRemainder);
  elements.rdnAutoCopy.textContent = `Tersimpan: ${formatCurrency(lastRemainder)} akan jadi saldo awal periode ${targetPeriod}.`;
});
Object.entries(elements.inputs).forEach(([key, input]) => {
  input.addEventListener("input", scheduleRender);
  input.addEventListener("focus", () => { input.value = String(parseAssetInput(key, input.value) || "").replace(".", ","); });
  input.addEventListener("blur", () => { input.value = formatAssetInput(key, parseAssetInput(key, input.value)); scheduleRender(); });
});
elements.actionTimeline.addEventListener("change", (event) => {
  const priceInput = event.target.closest(".stock-price-input");
  if (priceInput) {
    const price = parseCurrency(priceInput.value);
    if (price > 0) stockPrices[priceInput.dataset.ticker][priceInput.dataset.month] = price;
    else delete stockPrices[priceInput.dataset.ticker][priceInput.dataset.month];
    render();
    return;
  }
  const input = event.target.closest(".wire-rate-input");
  if (!input) return;
  const rate = parseDecimal(input.value);
  if (rate > 0) settlementRates[input.dataset.month] = rate;
  else delete settlementRates[input.dataset.month];
  render();
});
elements.usdRate.addEventListener("input", scheduleRender);
elements.usdRate.addEventListener("focus", () => { elements.usdRate.value = String(parseDecimal(elements.usdRate.value) || "").replace(".", ","); });
elements.usdRate.addEventListener("blur", () => { const rate = parseDecimal(elements.usdRate.value); elements.usdRate.value = rate > 0 ? decimalInputFormatter.format(rate) : ""; scheduleRender(); });
elements.etfCurrency.addEventListener("change", () => {
  const rate = parseDecimal(elements.usdRate.value);
  const next = elements.etfCurrency.value;
  if (next === "usd" && rate <= 0) {
    elements.etfCurrency.value = "idr";
    elements.usdRate.focus();
    return;
  }
  CONFIG.etfAssets.forEach(({ key }) => {
    const input = elements.inputs[key];
    const idr = lastEtfUnit === "usd" ? parseDecimal(input.value) * rate : parseCurrency(input.value);
    input.value = next === "usd" ? decimalInputFormatter.format(idr / rate) : formatInputCurrency(idr);
  });
  lastEtfUnit = next;
  syncEtfUnitLabels();
  render();
});
elements.monthlyFund.addEventListener("input", scheduleRender);
elements.monthlyFund.addEventListener("focus", () => { elements.monthlyFund.value = String(parseCurrency(elements.monthlyFund.value) || ""); });
elements.monthlyFund.addEventListener("blur", () => { elements.monthlyFund.value = formatInputCurrency(parseCurrency(elements.monthlyFund.value)); scheduleRender(); });
Object.values(elements.targetInputs).forEach((input) => {
  input.addEventListener("input", scheduleRender);
  input.addEventListener("blur", () => {
    const value = parseTarget(input.value);
    if (Number.isFinite(value)) input.value = String(value);
    scheduleRender();
  });
});
[elements.rdnCarry, elements.wireFee].forEach((input) => {
  input.addEventListener("input", scheduleRender);
  input.addEventListener("focus", () => { input.value = String(parseCurrency(input.value) || ""); });
  input.addEventListener("blur", () => { input.value = formatInputCurrency(parseCurrency(input.value)); scheduleRender(); });
});
elements.targetMonth.addEventListener("change", () => {
  clearMonthlyInputs();
  updatePeriodCopy();
  loadRdnForPeriod();
  render();
});
elements.resetButton.addEventListener("click", () => {
  resetSettings();
  elements.targetMonth.value = "2027-06";
  storeRdn(elements.targetMonth.value, 0);
  updatePeriodCopy();
  restoreInitialValues();
});

syncEtfUnitLabels();
initializeCharts();
updatePeriodCopy();
loadRdnForPeriod();
render();


// ===== Kait penyimpanan untuk Rencana Keuangan (lihat ../bridge.js) =====
function rkGetState() {
  const fields = {};
  document.querySelectorAll("input[id], select[id]").forEach((el) => {
    fields[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  const rdn = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RDN_STORAGE_PREFIX)) rdn[key] = localStorage.getItem(key);
    }
  } catch (error) { /* abaikan */ }
  return { v: 1, fields, stockPrices, settlementRates, lastEtfUnit, rdn };
}

function rkSetState(state) {
  if (!state || typeof state !== "object") return;
  const fields = state.fields || {};
  if (typeof fields["etf-currency"] === "string") {
    elements.etfCurrency.value = fields["etf-currency"];
    lastEtfUnit = elements.etfCurrency.value;
  }
  Object.entries(fields).forEach(([id, value]) => {
    if (id === "etf-currency") return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!value;
    else if (typeof value === "string") el.value = value;
  });
  Object.keys(stockPrices).forEach((ticker) => {
    Object.keys(stockPrices[ticker]).forEach((month) => delete stockPrices[ticker][month]);
    Object.assign(stockPrices[ticker], (state.stockPrices || {})[ticker] || {});
  });
  Object.keys(settlementRates).forEach((key) => delete settlementRates[key]);
  Object.assign(settlementRates, state.settlementRates || {});
  try {
    Object.entries(state.rdn || {}).forEach(([key, value]) => {
      if (key.startsWith(RDN_STORAGE_PREFIX)) localStorage.setItem(key, String(value));
    });
  } catch (error) { /* abaikan */ }
  syncEtfUnitLabels();
  updatePeriodCopy();
  render();
}
