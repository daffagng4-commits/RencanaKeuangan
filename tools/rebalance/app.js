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
  etfCashPending: 0,
  quarterMonth: 1,
  buyFeeRate: 0,
  recoveryTarget: "middle",
});
const JOURNAL_VERSION = 1;

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
  portfolioMode: document.querySelector("#portfolio-mode"),
  holdingsPane: document.querySelector("#holdings-pane"),
  holdingPrices: document.querySelector("#holding-prices"),
  executionJournal: document.querySelector("#execution-journal"),
  rdnCarry: document.querySelector("#rdn-carry"),
  wireFee: document.querySelector("#wire-fee"),
  etfCashPending: document.querySelector("#etf-cash-pending"),
  quarterMonth: document.querySelector("#quarter-month"),
  stockBuyFee: document.querySelector("#stock-buy-fee"),
  recoveryTarget: document.querySelector("#recovery-target"),
  usdRate: document.querySelector("#usd-rate"),
  etfCurrency: document.querySelector("#etf-currency"),
  scenarioEtf: document.querySelector("#scenario-etf-change"),
  scenarioStock: document.querySelector("#scenario-stock-change"),
  scenarioReset: document.querySelector("#scenario-reset"),
  scenarioStatus: document.querySelector("#scenario-status"),
  historyWrap: document.querySelector("#history-chart-wrap"),
  historyEmpty: document.querySelector("#history-chart-empty"),
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
  copyCurrentAction: document.querySelector("#copy-current-action"),
  downloadReminders: document.querySelector("#download-reminders"),
  historyChart: document.querySelector("#history-chart"),
  historyChartWrap: document.querySelector("#history-chart-wrap"),
  historyChartEmpty: document.querySelector("#history-chart-empty"),
  ibkrBridgeNotice: document.querySelector("#ibkr-bridge-notice"),
  ibkrBridgeText: document.querySelector("#ibkr-bridge-text"),
  applyIbkrRouteBtn: document.querySelector("#apply-ibkr-route-btn"),
};

const charts = {};
let lastValidSettings = { ...DEFAULT_SETTINGS };
let lastValidTechnical = { ...DEFAULT_TECHNICAL };
const RDN_STORAGE_PREFIX = "aras-portfolio-rdn:";
const MAX_SETTLEMENT_CARDS = 12;
let renderFrame = null;
let lastRemainder = 0;
let journalState = {
  v: JOURNAL_VERSION, holdings: Object.fromEntries([...CONFIG.stockAssets, ...CONFIG.etfAssets].map(({ key }) => [key, 0])),
  prices: {}, cash: { rdn: 0, etfPending: 0 }, transactions: [], snapshots: [], completed: {},
};

function quarterFor(month, quarterMonth) { return Math.floor((Number(quarterMonth) + month - 2) / 3) + 1; }
function isQuarterEnd(month, quarterMonth) { return (Number(quarterMonth) + month - 1) % 3 === 0; }
function periodFor(month) {
  const value = elements.targetMonth.value;
  if (!/^\d{4}-\d{2}$/.test(value)) return `bulan-${month}`;
  const [year, mon] = value.split("-").map(Number);
  const date = new Date(year, mon - 1 + month - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function decimalText(value) { return Number.isFinite(value) ? String(value).replace(".", ",") : ""; }

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function parseCurrency(value) {
  return parseDecimal(value);
}

function parseNumber(value, signed = false) {
  let text = String(value).trim().replace(signed ? /[^\d.,-]/g : /[^\d.,]/g, "");
  if (!text || text === "-") return 0;
  const negative = signed && text.startsWith("-");
  text = text.replace(/-/g, "");
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
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function parseDecimal(value) { return Math.max(0, parseNumber(value)); }
function parseSignedDecimal(value) { return parseNumber(value, true); }

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
  const journal = elements.portfolioMode.value === "holdings";
  const raw = {
    rdnCarry: journal ? journalState.cash.rdn : parseCurrency(elements.rdnCarry.value),
    wireFee: parseCurrency(elements.wireFee.value),
    usdRate: parseDecimal(elements.usdRate.value),
    etfCashPending: journal ? journalState.cash.etfPending : parseCurrency(elements.etfCashPending.value),
    quarterMonth: Number(elements.quarterMonth.value),
    buyFeeRate: parseDecimal(elements.stockBuyFee.value) / 100,
    recoveryTarget: elements.recoveryTarget.value === "band" ? "band" : "middle",
  };
  const valid = raw.rdnCarry >= 0 && raw.wireFee >= 0 && raw.etfCashPending >= 0 && raw.quarterMonth >= 1 && raw.quarterMonth <= 3 && raw.buyFeeRate >= 0 && raw.buyFeeRate <= 1 && (raw.usdRate > 0 || elements.etfCurrency.value !== "usd");
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

function getPortfolioValues(technical) {
  const direct = getRawValues(technical);
  const values = elements.portfolioMode.value === "holdings"
    ? Object.fromEntries(Object.keys(elements.inputs).map((key) => {
      const price = parseDecimal(journalState.prices[key]);
      const quantity = Number(journalState.holdings[key]) || 0;
      const raw = quantity * price;
      return [key, isEtfKey(key) && elements.etfCurrency.value === "usd" ? raw * technical.usdRate : raw];
    }))
    : direct;
  const etfShift = Math.max(0, 1 + parseSignedDecimal(elements.scenarioEtf.value) / 100);
  const stockShift = Math.max(0, 1 + parseSignedDecimal(elements.scenarioStock.value) / 100);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value * (isEtfKey(key) ? etfShift : stockShift)]));
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
  const feeRate = technical.buyFeeRate || 0;
  const active = allocation.filter((item) => item.amount > 0);
  const emptyTrade = (item) => ({ ...item, budget: 0, price: technical[`${item.key}Price`], grossLotCost: (technical[`${item.key}Price`] || 0) * 100, lotCost: (technical[`${item.key}Price`] || 0) * 100 * (1 + feeRate), lots: 0, shares: 0, grossSpent: 0, fee: 0, spent: 0 });
  if (recommendedBudget <= 0 || active.length === 0) return { recommendedBudget, openingCarry: technical.rdnCarry, totalCapital, totalSpent: 0, totalFee: 0, remainder: totalCapital, trades: allocation.map(emptyTrade) };
  const weights = allocation.map((item) => ({ ...item, weight: item.amount / recommendedBudget }));
  const budgets = allocateByWeights(totalCapital, weights);
  const trades = budgets.map((item) => {
    const price = technical[`${item.key}Price`];
    const grossLotCost = price * 100;
    const lotCost = grossLotCost * (1 + feeRate);
    const lots = lotCost > 0 ? Math.floor(item.amount / lotCost) : 0;
    const shares = lots * 100;
    const grossSpent = lots * grossLotCost;
    const spent = lots * lotCost;
    return { ...item, budget: item.amount, price, grossLotCost, lotCost, lots, shares, grossSpent, fee: spent - grossSpent, spent };
  });
  let totalSpent = sum(trades.map((item) => item.spent));
  let remainder = totalCapital - totalSpent;
  const activeTrades = trades.filter((item) => item.weight > 0);
  let safety = 0;
  while (activeTrades.some((item) => item.lotCost <= remainder + EPSILON) && safety < activeTrades.length * 2) {
    const affordable = activeTrades.filter((item) => item.lotCost <= remainder + EPSILON);
    affordable.sort((a, b) => ((b.budget - b.spent) / Math.max(b.budget, 1)) - ((a.budget - a.spent) / Math.max(a.budget, 1)));
    const selected = affordable[0];
    const extraLots = Math.max(1, Math.floor(remainder / selected.lotCost));
    selected.lots += extraLots; selected.shares += extraLots * 100;
    selected.grossSpent += extraLots * selected.grossLotCost;
    selected.spent += extraLots * selected.lotCost;
    selected.fee = selected.spent - selected.grossSpent;
    totalSpent += extraLots * selected.lotCost; remainder -= extraLots * selected.lotCost; safety += 1;
  }
  return { recommendedBudget, openingCarry: technical.rdnCarry, totalCapital, totalSpent, totalFee: sum(trades.map((item) => item.fee)), remainder: Math.max(0, remainder), trades };
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

function buildSettlements(schedule, technical) {
  const grouped = new Map();
  schedule.forEach((entry) => {
    if (entry.etf <= 0) return;
    const quarter = quarterFor(entry.month, technical.quarterMonth);
    if (!grouped.has(quarter)) grouped.set(quarter, []);
    grouped.get(quarter).push({ month: entry.month, amount: entry.etf });
  });
  const all = [...grouped.entries()].map(([quarter, components], index) => {
    const month = components[components.length - 1].month;
    const openingCash = index === 0 ? technical.etfCashPending : 0;
    const freshAmount = sum(components.map((item) => item.amount));
    return { quarter, sequence: index + 1, month, amount: openingCash + freshAmount, openingCash, freshAmount, components };
  });
  const visible = settlementIndices(0, all.length - 1).map((index) => all[index]);
  return { settlements: visible, settlementCount: all.length, settlementsOmitted: Math.max(0, all.length - visible.length) };
}

function buildParentPlan(direction, fullMonths, remainder, settings, normalStock, normalEtf, technical) {
  const isStock = direction === "parent-stock";
  const fund = settings.monthlyFund;
  const schedule = [];
  for (let month = 1; month <= fullMonths; month += 1) schedule.push({ month, stock: isStock ? fund : 0, etf: isStock ? 0 : fund, phase: "full" });
  const closingAmount = Math.round(remainder);
  let closing = null;
  if (closingAmount > 0) {
    const stock = isStock ? Math.min(fund, normalStock + closingAmount) : Math.max(0, normalStock - closingAmount);
    closing = { month: fullMonths + 1, stock, etf: fund - stock, phase: "closing", gap: closingAmount };
    schedule.push(closing);
  }
  const normalStart = schedule.length + 1;
  let horizon = Math.max(normalStart, 1);
  while (!isQuarterEnd(horizon, technical.quarterMonth)) horizon += 1;
  for (let month = normalStart; month <= horizon; month += 1) schedule.push({ month, stock: normalStock, etf: normalEtf, phase: "normal" });
  const settlements = buildSettlements(schedule, technical);
  return { firstMonth: schedule[0], schedule, closing, ...settlements, normalStartMonth: normalStart, settlementHorizon: horizon, cycleStock: sum(schedule.map((entry) => entry.stock)), cycleEtf: sum(schedule.map((entry) => entry.etf)) };
}

function buildChildrenPlan(settings, normalStock, normalEtf, technical) {
  const schedule = [];
  let month = 1;
  do { schedule.push({ month, stock: normalStock, etf: normalEtf, phase: "children" }); month += 1; } while (!isQuarterEnd(month - 1, technical.quarterMonth));
  const settlements = buildSettlements(schedule, technical);
  return { firstMonth: schedule[0], schedule, ...settlements, normalStartMonth: 1, settlementHorizon: schedule.length, cycleStock: normalStock * schedule.length, cycleEtf: normalEtf * schedule.length };
}

function getState(values, settings, technical) {
  const stockValues = settings.stockTargets.map((item) => values[item.key]);
  const etfValues = settings.etfTargets.map((item) => values[item.key]);
  const stockTotal = sum(stockValues);
  const etfMarketTotal = sum(etfValues);
  const etfTotal = etfMarketTotal + technical.etfCashPending;
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
  const recoveryTargetShare = technical.recoveryTarget === "band"
    ? (parentStatus === "etf-low" ? lowerEtfBand : parentStatus === "stock-low" ? upperEtfBand : settings.etfGlobalTarget)
    : settings.etfGlobalTarget;
  const targetEtfValue = Math.round(total * recoveryTargetShare);
  const targetStockValue = Math.round(total * (1 - recoveryTargetShare));
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
  let recoveryUnreachable = false;
  if (mode === "parent-etf" || mode === "parent-stock") {
    const deficit = mode === "parent-etf" ? etfDeficit : stockDeficit;
    const increment = mode === "parent-etf" ? normalStock : normalEtf;
    const rawMonths = increment > 0 ? deficit / increment : Infinity;
    recoveryUnreachable = !Number.isFinite(rawMonths);
    calculatedFullMonths = recoveryUnreachable ? 0 : Math.min(MAX_RECOVERY_MONTHS, Math.floor(rawMonths));
    fullMonths = calculatedFullMonths;
    const closingGap = !recoveryUnreachable && rawMonths < MAX_RECOVERY_MONTHS ? deficit - calculatedFullMonths * increment : 0;
    plan = buildParentPlan(mode, fullMonths, closingGap, settings, normalStock, normalEtf, technical);
  } else {
    plan = buildChildrenPlan(settings, normalStock, normalEtf, technical);
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
    if (entry.etf <= 0) return;
    const quarter = quarterFor(entry.month, technical.quarterMonth);
    quarterAmounts.set(quarter, (quarterAmounts.get(quarter) || 0) + entry.etf);
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
  plan.settlements = plan.settlements.map((settlement) => ({ ...settlement, allocation: quarterAllocation.get(settlement.quarter) || allocateByWeights(0, settings.etfTargets) }));

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
  const projectionSchedule = mode === "parent-etf" || mode === "parent-stock"
    ? plan.schedule.filter((entry) => entry.month < plan.normalStartMonth)
    : plan.schedule;
  const projectedStock = stockTotal + sum(projectionSchedule.map((entry) => entry.stock));
  const projectedEtf = etfTotal + sum(projectionSchedule.map((entry) => entry.etf));
  const projectedTotal = projectedStock + projectedEtf;
  const projectedEtfShare = projectedTotal > 0 ? projectedEtf / projectedTotal : settings.etfGlobalTarget;

  return {
    settings,
    technical,
    values,
    stockValues,
    etfValues,
    stockTotal,
    etfMarketTotal,
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
    recoveryTargetShare,
    recoveryUnreachable,
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

function formatCurrentActionPlan(state) {
  const lines = [];
  lines.push(`📋 Instruksi Rebalance - ${state.firstMonth ? `Bulan ${state.firstMonth.month}` : "Bulan 1"}`);
  lines.push(`• Total Dana: ${formatCurrency(state.settings.monthlyFund)}`);
  lines.push(`• Status: ${state.modeTitle || state.mode}`);
  
  if (state.firstMonth && state.firstMonth.stock > 0) {
    lines.push(`\n[Saham Lokal - Alokasi ${formatCurrency(state.firstMonth.stock)}]`);
    if (state.currentStockAllocation) {
      state.currentStockAllocation.filter((t) => t.amount > 0).forEach((t) => {
        lines.push(`- ${t.name}: ${formatCurrency(t.amount)}`);
      });
    }
  } else {
    lines.push(`\n[Saham Lokal]`);
    lines.push(`- Ditunda / Rp 0 bulan ini`);
  }

  if (state.firstMonth && state.firstMonth.etf > 0) {
    const isWire = state.settlements && state.settlements.some((s) => s.month === state.firstMonth.month);
    lines.push(`\n[ETF Global - ${isWire ? "Setor IBKR" : "Tabung Kas Penampung"}]`);
    lines.push(`- Nominal: ${formatCurrency(state.firstMonth.etf)}`);
    if (isWire) {
      const settlement = state.settlements.find((s) => s.month === state.firstMonth.month);
      if (settlement && state.technical.usdRate > 0) {
        const usd = usdSplit(settlement, state.technical.usdRate);
        lines.push(`- Estimasi USD: ${formatUsd(usd.total)} (Kurs ${formatCurrency(state.technical.usdRate)})`);
        usd.rows.filter((r) => r.usd > 0).forEach((r) => {
          lines.push(`  * ${r.name}: ${formatUsd(r.usd)}`);
        });
      }
    }
  } else {
    lines.push(`\n[ETF Global]`);
    lines.push(`- Ditunda / Rp 0 bulan ini`);
  }

  if (state.calculatedFullMonths > 0) {
    lines.push(`\nℹ️ Durasi pemulihan: ${state.calculatedFullMonths} bulan penuh`);
  }
  return lines.join("\n");
}

function generateRemindersIcs(state) {
  const now = new Date();
  const formatIcsDate = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const stamp = formatIcsDate(now);
  const events = [];
  const year = now.getFullYear();
  const month = now.getMonth();

  for (let i = 0; i < Math.min(6, state.schedule.length); i++) {
    const planMonth = state.schedule[i];
    const eventDate = new Date(year, month + i, 25, 9, 0, 0);
    const startStr = formatIcsDate(eventDate);
    const endStr = formatIcsDate(new Date(year, month + i, 25, 10, 0, 0));
    const summary = `Rebalance Bulan ${planMonth.month}: Saham ${formatCurrency(planMonth.stock)}, ETF ${formatCurrency(planMonth.etf)}`;
    const description = `Jadwal eksekusi dana rebalance bulanan: Saham ${formatCurrency(planMonth.stock)} dan Kas ETF ${formatCurrency(planMonth.etf)}.`;

    events.push([
      "BEGIN:VEVENT",
      `UID:rebalance-m${planMonth.month}-${stamp}@rencanakeuangan`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT"
    ].join("\n"));
  }

  if (state.settlements) {
    state.settlements.forEach((s) => {
      const wireDate = new Date(year, month + s.month - 1, 28, 10, 0, 0);
      const startStr = formatIcsDate(wireDate);
      const endStr = formatIcsDate(new Date(year, month + s.month - 1, 11, 0, 0));
      events.push([
        "BEGIN:VEVENT",
        `UID:rebalance-wire-m${s.month}-${stamp}@rencanakeuangan`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:Setor Wire IBKR Bulan ${s.month} (${formatCurrency(s.amount)})`,
        `DESCRIPTION:Lakukan wire transfer ke rekening IBKR sebesar ${formatCurrency(s.amount)} plus biaya transfer.`,
        "END:VEVENT"
      ].join("\n"));
    });
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RencanaKeuangan//Rebalance//ID",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR"
  ].join("\n");
}

function recordExecution(journal, month, execution, options = {}) {
  const updated = {
    ...journal,
    holdings: { ...(journal.holdings || {}) },
    cash: { ...(journal.cash || { rdn: 0, etfPending: 0 }) },
    transactions: [...(journal.transactions || [])],
    snapshots: [...(journal.snapshots || [])],
  };

  const today = new Date().toISOString().slice(0, 10);

  if (execution && Array.isArray(execution.trades)) {
    execution.trades.forEach((trade) => {
      if (trade.lots > 0) {
        updated.holdings[trade.key] = (Number(updated.holdings[trade.key]) || 0) + trade.shares;
        updated.transactions.push({
          id: Date.now() + Math.random(),
          date: today,
          month,
          type: "saham",
          ticker: trade.key.toUpperCase(),
          name: trade.name,
          lots: trade.lots,
          shares: trade.shares,
          price: trade.price,
          total: trade.spent,
          fee: trade.fee || 0,
        });
      }
    });
    if (typeof execution.remainder === "number") {
      updated.cash.rdn = execution.remainder;
    }
  }

  if (options.isSettlement) {
    if (Array.isArray(options.settlementTrades)) {
      options.settlementTrades.forEach((st) => {
        if (st.units > 0) {
          updated.holdings[st.key] = (Number(updated.holdings[st.key]) || 0) + st.units;
          updated.transactions.push({
            id: Date.now() + Math.random(),
            date: today,
            month,
            type: "etf-wire",
            ticker: st.key.toUpperCase(),
            name: st.name,
            units: st.units,
            usd: st.usd,
            price: st.price,
          });
        }
      });
    }
    updated.cash.etfPending = 0;
  } else if (options.etfAmount > 0) {
    updated.cash.etfPending = (Number(updated.cash.etfPending) || 0) + options.etfAmount;
    updated.transactions.push({
      id: Date.now() + Math.random(),
      date: today,
      month,
      type: "etf-pending",
      name: "Kas ETF Penampung",
      amount: options.etfAmount,
    });
  }

  if (options.snapshot) {
    updated.snapshots.push({
      date: today,
      month,
      ...options.snapshot,
    });
  } else {
    updated.snapshots.push({
      date: today,
      month,
      rdn: updated.cash.rdn,
      etfPending: updated.cash.etfPending,
    });
  }

  return updated;
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
  let desc = content.description;
  if (state.calculatedFullMonths > 12) {
    desc += `<div class="mt-2.5 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs text-amber-200">⚠️ <b>Peringatan:</b> Estimasi durasi pemulihan <b>${state.calculatedFullMonths} bulan</b> (> 12 bulan). Pertimbangkan menaikkan dana bulanan, memperlebar target band, atau rebalance sebagian dengan menjual aset overweight.</div>`;
  } else if (state.calculatedFullMonths > 6) {
    desc += `<div class="mt-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-2 text-xs text-emerald-200">ℹ️ Estimasi durasi pemulihan <b>${state.calculatedFullMonths} bulan penuh</b>. Durasi normal untuk akumulasi bertahap dana baru tanpa jual.</div>`;
  }
  elements.statusDescription.innerHTML = desc;
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
    Object.values(charts).forEach((chart) => {
      if (chart !== charts.history) chart.update("none");
    });
  }
  elements.chartCenters.global.textContent = formatPercent(state.etfShare, 1);
  elements.chartCenters.stock.textContent = formatPercent(state.stockShares[0], 1);
  elements.chartCenters.etf.textContent = formatPercent(state.etfShares[0], 1);
  setMiniStatus(elements.miniStatuses.global, state.parentStatus === "safe" ? "Parent aman" : state.parentStatus === "etf-low" ? "ETF parent underweight" : "Saham parent underweight", state.parentStatus === "safe");
  setMiniStatus(elements.miniStatuses.stock, getStockStatusText(state), !state.stockBroken);
  setMiniStatus(elements.miniStatuses.etf, getEtfStatusText(state), !state.etfBroken);

  if (elements.historyChart) {
    const snapshots = journalState.snapshots || [];
    if (snapshots.length > 0) {
      if (elements.historyChartWrap) elements.historyChartWrap.hidden = false;
      if (elements.historyChartEmpty) elements.historyChartEmpty.hidden = true;
      const labels = snapshots.map((s, idx) => s.date || `S-${idx + 1}`);
      const etfShares = snapshots.map((s) => (s.etfShare != null ? Math.round(s.etfShare * 1000) / 10 : null));
      const targetLine = snapshots.map(() => state.settings.etfTarget);
      const upperLine = snapshots.map(() => state.upperEtfBand * 100);
      const lowerLine = snapshots.map(() => state.lowerEtfBand * 100);

      if (charts.history) {
        charts.history.data.labels = labels;
        charts.history.data.datasets[0].data = etfShares;
        charts.history.data.datasets[1].data = upperLine;
        charts.history.data.datasets[2].data = targetLine;
        charts.history.data.datasets[3].data = lowerLine;
        charts.history.update();
      } else if (typeof Chart !== "undefined") {
        charts.history = new Chart(elements.historyChart, {
          type: "line",
          data: {
            labels,
            datasets: [
              { label: "Porsi ETF Aktual (%)", data: etfShares, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.2, fill: false, borderWidth: 2, pointRadius: 4 },
              { label: "Batas Atas (Band)", data: upperLine, borderColor: "rgba(243,109,74,0.5)", borderDash: [4, 4], pointRadius: 0, fill: false, borderWidth: 1.5 },
              { label: "Target", data: targetLine, borderColor: "rgba(255,255,255,0.4)", borderDash: [2, 2], pointRadius: 0, fill: false, borderWidth: 1 },
              { label: "Batas Bawah (Band)", data: lowerLine, borderColor: "rgba(243,109,74,0.5)", borderDash: [4, 4], pointRadius: 0, fill: false, borderWidth: 1.5 },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: Math.max(0, Math.min(...etfShares.filter(Boolean), state.lowerEtfBand * 100) - 5),
                max: Math.min(100, Math.max(...etfShares.filter(Boolean), state.upperEtfBand * 100) + 5),
                grid: { color: "rgba(255,255,255,0.06)" },
                ticks: { color: "#94a3b8", callback: (v) => v + "%" },
              },
              x: {
                grid: { color: "rgba(255,255,255,0.06)" },
                ticks: { color: "#94a3b8" },
              },
            },
            plugins: {
              legend: { labels: { color: "#cbd5e1", font: { size: 10 } } },
            },
          },
        });
      }
    } else {
      if (elements.historyChartWrap) elements.historyChartWrap.hidden = true;
      if (elements.historyChartEmpty) elements.historyChartEmpty.hidden = false;
    }
  }
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
  const executeBtn = now
    ? `<div class="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3">
         <button type="button" class="btn-execute-month rounded-xl border border-lime/40 bg-lime/15 px-3 py-1.5 text-xs font-bold text-lime transition hover:bg-lime/25" data-month="${entry.month}">✓ Tandai sudah dieksekusi</button>
         <span class="text-[10px] text-white/45">Catat saldo & unit ke jurnal</span>
       </div>`
    : "";
  return `<li class="timeline-card${now ? " is-now" : ""}"><div class="timeline-head"><strong>Bulan ${entry.month}${now ? " · sekarang" : ""}</strong><span class="timeline-badges">${estimate}<span class="timeline-badge">${phaseBadge(state, entry)}</span></span></div>${note}<ul>${items.join("")}</ul>${executeBtn}</li>`;
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
  const state = getState(getPortfolioValues(technical), settings, technical);
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
  renderHoldingsUI();
  renderExecutionJournalUI();
  checkIbkrRouteAvailability();
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

let holdingsRendered = false;

function syncHoldingsToDirectInputs(technical) {
  const usdRate = technical.usdRate > 0 ? technical.usdRate : 16000;
  const isUsd = elements.etfCurrency.value === "usd";

  CONFIG.stockAssets.forEach(({ key }) => {
    const qty = Number(journalState.holdings[key]) || 0;
    const price = Number(journalState.prices[key]) || 0;
    const totalIdr = qty * price;
    if (totalIdr > 0 || qty > 0) {
      elements.inputs[key].value = formatInputCurrency(totalIdr);
    }
  });

  CONFIG.etfAssets.forEach(({ key }) => {
    const qty = Number(journalState.holdings[key]) || 0;
    const price = Number(journalState.prices[key]) || 0;
    const totalUsd = qty * price;
    if (totalUsd > 0 || qty > 0) {
      elements.inputs[key].value = isUsd ? decimalInputFormatter.format(totalUsd) : formatInputCurrency(totalUsd * usdRate);
    }
  });

  elements.rdnCarry.value = formatInputCurrency(journalState.cash.rdn || 0);
  elements.etfCashPending.value = formatInputCurrency(journalState.cash.etfPending || 0);
}

function renderHoldingsUI() {
  if (!elements.holdingPrices) return;
  const technical = getTechnicalSettings();
  const usdRate = technical.usdRate > 0 ? technical.usdRate : 16000;

  if (!holdingsRendered || elements.holdingPrices.children.length === 0) {
    const stockRows = CONFIG.stockAssets.map(({ key, name }) => {
      const qty = journalState.holdings[key] || 0;
      const price = journalState.prices[key] || "";
      return `
        <div class="grid grid-cols-12 gap-2 items-center text-xs py-1.5 border-b border-white/5">
          <div class="col-span-3 font-semibold text-white/90">${name} <span class="text-[10px] text-white/40">(Saham)</span></div>
          <div class="col-span-3">
            <input type="number" step="100" min="0" placeholder="0" class="holding-qty-input w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-white text-right font-mono" data-key="${key}" value="${qty || ''}">
          </div>
          <div class="col-span-3">
            <input type="text" placeholder="Rp/lembar" class="holding-price-input w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-white text-right font-mono" data-key="${key}" value="${price ? formatInputCurrency(price) : ''}">
          </div>
          <div class="col-span-3 text-right font-mono text-white/70 holding-subtotal" data-key="${key}">Rp 0</div>
        </div>
      `;
    }).join("");

    const etfRows = CONFIG.etfAssets.map(({ key, name }) => {
      const qty = journalState.holdings[key] || 0;
      const price = journalState.prices[key] || "";
      return `
        <div class="grid grid-cols-12 gap-2 items-center text-xs py-1.5 border-b border-white/5">
          <div class="col-span-3 font-semibold text-white/90">${name} <span class="text-[10px] text-white/40">(ETF)</span></div>
          <div class="col-span-3">
            <input type="number" step="0.0001" min="0" placeholder="0" class="holding-qty-input w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-white text-right font-mono" data-key="${key}" value="${qty || ''}">
          </div>
          <div class="col-span-3">
            <input type="text" placeholder="USD/unit" class="holding-price-input w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-white text-right font-mono" data-key="${key}" value="${price ? String(price) : ''}">
          </div>
          <div class="col-span-3 text-right font-mono text-white/70 holding-subtotal" data-key="${key}">US$ 0</div>
        </div>
      `;
    }).join("");

    elements.holdingPrices.innerHTML = `
      <div class="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-white/40 pb-1 border-b border-white/10">
        <div class="col-span-3">Aset</div>
        <div class="col-span-3 text-right">Lembar / Unit</div>
        <div class="col-span-3 text-right">Harga Pasar</div>
        <div class="col-span-3 text-right">Subtotal</div>
      </div>
      ${stockRows}
      ${etfRows}
      <div class="grid grid-cols-12 gap-2 items-center text-xs pt-2">
        <div class="col-span-6 font-semibold text-white/75">Saldo Kas RDN (Mengendap)</div>
        <div class="col-span-6 text-right font-mono text-white/90" id="holding-cash-rdn">${formatCurrency(journalState.cash.rdn || 0)}</div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center text-xs pb-1">
        <div class="col-span-6 font-semibold text-white/75">Kas ETF Penampung</div>
        <div class="col-span-6 text-right font-mono text-white/90" id="holding-cash-etf">${formatCurrency(journalState.cash.etfPending || 0)}</div>
      </div>
    `;
    holdingsRendered = true;
  }

  CONFIG.stockAssets.forEach(({ key }) => {
    const qty = Number(journalState.holdings[key]) || 0;
    const price = Number(journalState.prices[key]) || 0;
    const subtotalEl = elements.holdingPrices.querySelector(`.holding-subtotal[data-key="${key}"]`);
    if (subtotalEl) subtotalEl.textContent = formatCurrency(qty * price);
  });

  CONFIG.etfAssets.forEach(({ key }) => {
    const qty = Number(journalState.holdings[key]) || 0;
    const price = Number(journalState.prices[key]) || 0;
    const subtotalUsd = qty * price;
    const subtotalEl = elements.holdingPrices.querySelector(`.holding-subtotal[data-key="${key}"]`);
    if (subtotalEl) {
      subtotalEl.innerHTML = `${formatUsd(subtotalUsd)} <span class="text-[9px] block text-white/40">${formatCurrency(subtotalUsd * usdRate)}</span>`;
    }
  });

  const cashRdnEl = document.getElementById("holding-cash-rdn");
  if (cashRdnEl) cashRdnEl.textContent = formatCurrency(journalState.cash.rdn || 0);
  const cashEtfEl = document.getElementById("holding-cash-etf");
  if (cashEtfEl) cashEtfEl.textContent = formatCurrency(journalState.cash.etfPending || 0);

  if (!elements.holdingPrices.contains(document.activeElement)) {
    elements.holdingPrices.querySelectorAll(".holding-qty-input").forEach((inp) => {
      const val = journalState.holdings[inp.dataset.key];
      inp.value = val || "";
    });
    elements.holdingPrices.querySelectorAll(".holding-price-input").forEach((inp) => {
      const val = journalState.prices[inp.dataset.key];
      inp.value = val ? (isEtfKey(inp.dataset.key) ? String(val) : formatInputCurrency(val)) : "";
    });
  }
}

function renderExecutionJournalUI() {
  if (!elements.executionJournal) return;
  const txs = journalState.transactions || [];
  if (txs.length === 0) {
    elements.executionJournal.innerHTML = '<div class="text-xs text-white/40 italic py-2">Belum ada catatan transaksi eksekusi. Klik "✓ Tandai sudah dieksekusi" pada kartu Bulan 1 untuk mencatat.</div>';
    return;
  }
  const rows = [...txs].reverse().map((tx) => {
    let detail = "";
    if (tx.type === "saham") {
      detail = `Beli ${tx.lots} lot (${tx.shares} lbr) @ ${formatCurrency(tx.price)} · Total ${formatCurrency(tx.total)}`;
    } else if (tx.type === "etf-wire") {
      detail = `Setor IBKR: ${tx.name || "ETF"} · $${tx.usd ? tx.usd.toFixed(2) : ""}`;
    } else if (tx.type === "etf-pending") {
      detail = `Menabung kas penampung ETF: ${formatCurrency(tx.amount)}`;
    } else {
      detail = tx.name || tx.ticker || "";
    }
    return `
      <div class="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
        <div>
          <div class="font-bold text-white/90">${tx.date} · ${tx.name || tx.ticker}</div>
          <div class="text-[11px] text-white/60">${detail}</div>
        </div>
        <button type="button" class="btn-delete-tx text-red-400 hover:text-red-300 text-xs px-2 py-1 font-semibold" data-id="${tx.id}">Hapus</button>
      </div>
    `;
  });
  elements.executionJournal.innerHTML = rows.join("");
}

function checkIbkrRouteAvailability() {
  if (!elements.ibkrBridgeNotice) return;
  let stored = null;
  try {
    const raw = localStorage.getItem("rk-ibkr-best-route");
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}

  if (stored && stored.rate > 0) {
    elements.ibkrBridgeNotice.hidden = false;
    elements.ibkrBridgeText.textContent = `Rute terbaik: ${stored.name} — Kurs Rp ${stored.rate.toLocaleString("id-ID")}, Biaya Rp ${stored.wireFee.toLocaleString("id-ID")}.`;
  } else {
    elements.ibkrBridgeNotice.hidden = true;
  }
}

function updateScenarioStatus() {
  if (!elements.scenarioStatus) return;
  const etfChg = parseNumber(elements.scenarioEtf ? elements.scenarioEtf.value : 0, true);
  const stockChg = parseNumber(elements.scenarioStock ? elements.scenarioStock.value : 0, true);
  if (etfChg === 0 && stockChg === 0) {
    elements.scenarioStatus.textContent = "";
  } else {
    elements.scenarioStatus.textContent = `Simulasi aktif: ETF ${etfChg > 0 ? "+" : ""}${etfChg}%, Saham ${stockChg > 0 ? "+" : ""}${stockChg}%. Nilai portofolio disesuaikan.`;
  }
}

function onExecuteMonthClick(event) {
  const btn = event.target.closest(".btn-execute-month");
  if (!btn) return;
  const month = Number(btn.dataset.month) || 1;
  const settings = getSettings();
  const technical = getTechnicalSettings();
  const state = getState(getPortfolioValues(technical), settings, technical);
  const firstLot = monthlyLotPlans(state, [state.firstMonth])[0];
  const isSettlement = Boolean(state.settlements && state.settlements.some((s) => s.month === month));

  let settlementTrades = [];
  if (isSettlement) {
    const settlement = state.settlements.find((s) => s.month === month);
    const rate = technical.usdRate > 0 ? technical.usdRate : 1;
    if (settlement) {
      const split = usdSplit(settlement, rate);
      settlementTrades = split.rows.map((row) => {
        const price = journalState.prices[row.key] > 0 ? journalState.prices[row.key] : 1;
        const units = row.usd > 0 ? row.usd / price : 0;
        return { key: row.key, name: row.name, units, usd: row.usd, price };
      });
    }
  }

  journalState = recordExecution(journalState, month, firstLot, {
    etfAmount: state.firstMonth ? state.firstMonth.etf : 0,
    isSettlement,
    settlementTrades,
    snapshot: {
      etfShare: state.etfShare,
      stockShare: state.stockShare,
      total: state.total,
    },
  });

  elements.rdnCarry.value = formatInputCurrency(journalState.cash.rdn);
  elements.etfCashPending.value = formatInputCurrency(journalState.cash.etfPending);

  if (elements.portfolioMode.value === "holdings") {
    syncHoldingsToDirectInputs(technical);
  }

  render();
  btn.textContent = "✓ Tercatat!";
  setTimeout(() => { if (btn) btn.textContent = "✓ Tandai sudah dieksekusi"; }, 2000);
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
elements.actionTimeline.addEventListener("click", onExecuteMonthClick);

if (elements.portfolioMode) {
  elements.portfolioMode.addEventListener("change", () => {
    const isHoldings = elements.portfolioMode.value === "holdings";
    if (elements.holdingsPane) elements.holdingsPane.hidden = !isHoldings;
    if (isHoldings) {
      const technical = getTechnicalSettings();
      syncHoldingsToDirectInputs(technical);
    }
    scheduleRender();
  });
}

if (elements.holdingPrices) {
  elements.holdingPrices.addEventListener("input", (event) => {
    const qtyInput = event.target.closest(".holding-qty-input");
    if (qtyInput) {
      const key = qtyInput.dataset.key;
      journalState.holdings[key] = parseFloat(qtyInput.value) || 0;
      if (elements.portfolioMode.value === "holdings") {
        syncHoldingsToDirectInputs(getTechnicalSettings());
      }
      scheduleRender();
      return;
    }
    const priceInput = event.target.closest(".holding-price-input");
    if (priceInput) {
      const key = priceInput.dataset.key;
      journalState.prices[key] = isEtfKey(key) ? parseDecimal(priceInput.value) : parseCurrency(priceInput.value);
      if (elements.portfolioMode.value === "holdings") {
        syncHoldingsToDirectInputs(getTechnicalSettings());
      }
      scheduleRender();
      return;
    }
  });
}

if (elements.executionJournal) {
  elements.executionJournal.addEventListener("click", (event) => {
    const delBtn = event.target.closest(".btn-delete-tx");
    if (!delBtn) return;
    const id = Number(delBtn.dataset.id);
    journalState.transactions = (journalState.transactions || []).filter((tx) => tx.id !== id);
    renderExecutionJournalUI();
    if (window.rkChanged) window.rkChanged();
  });
}

if (elements.copyCurrentAction) {
  elements.copyCurrentAction.addEventListener("click", async () => {
    const settings = getSettings();
    const technical = getTechnicalSettings();
    const state = getState(getPortfolioValues(technical), settings, technical);
    const text = formatCurrentActionPlan(state);
    try {
      await navigator.clipboard.writeText(text);
      const orig = elements.copyCurrentAction.textContent;
      elements.copyCurrentAction.textContent = "✓ Tersalin!";
      setTimeout(() => { if (elements.copyCurrentAction) elements.copyCurrentAction.textContent = orig; }, 2000);
    } catch (e) {
      alert("Gagal menyalin otomatis:\n\n" + text);
    }
  });
}

if (elements.downloadReminders) {
  elements.downloadReminders.addEventListener("click", () => {
    const settings = getSettings();
    const technical = getTechnicalSettings();
    const state = getState(getPortfolioValues(technical), settings, technical);
    const ics = generateRemindersIcs(state);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rebalance-pengingat.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

if (elements.scenarioEtf) {
  elements.scenarioEtf.addEventListener("input", () => {
    updateScenarioStatus();
    scheduleRender();
  });
}
if (elements.scenarioStock) {
  elements.scenarioStock.addEventListener("input", () => {
    updateScenarioStatus();
    scheduleRender();
  });
}
if (elements.scenarioReset) {
  elements.scenarioReset.addEventListener("click", () => {
    if (elements.scenarioEtf) elements.scenarioEtf.value = "0";
    if (elements.scenarioStock) elements.scenarioStock.value = "0";
    if (elements.scenarioStatus) elements.scenarioStatus.textContent = "";
    scheduleRender();
  });
}

if (elements.applyIbkrRouteBtn) {
  elements.applyIbkrRouteBtn.addEventListener("click", () => {
    try {
      const raw = localStorage.getItem("rk-ibkr-best-route");
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored.rate > 0) elements.usdRate.value = decimalInputFormatter.format(stored.rate);
        if (stored.wireFee >= 0) elements.wireFee.value = formatInputCurrency(stored.wireFee);
        elements.ibkrBridgeNotice.hidden = true;
        scheduleRender();
      }
    } catch (e) {}
  });
}

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "rk-ibkr-best-route") {
    checkIbkrRouteAvailability();
  }
});

[elements.etfCashPending, elements.stockBuyFee].filter(Boolean).forEach((input) => {
  input.addEventListener("input", scheduleRender);
  input.addEventListener("blur", scheduleRender);
});

[elements.quarterMonth, elements.recoveryTarget].filter(Boolean).forEach((select) => {
  select.addEventListener("change", scheduleRender);
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
