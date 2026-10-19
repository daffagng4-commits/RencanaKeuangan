const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function model() {
  const src = fs.readFileSync('tools/rebalance/app.js', 'utf8');
  const cut = src.indexOf('function stockAllocationSentence');
  const context = {
    document: { querySelector: () => ({ value: '', classList: { toggle() {} } }) },
    Intl, Math, Number, Object, Array, Map, Set, String, RegExp,
  };
  vm.createContext(context);
  vm.runInContext(`${src.slice(0, cut)}; globalThis.api={quarterFor,isQuarterEnd,calculateLotExecution,getState,buildChildrenPlan,parseCurrency,parseSignedDecimal,formatCurrentActionPlan,generateRemindersIcs,recordExecution};`, context);
  return context.api;
}

const settings = {
  monthlyFund: 3_000_000, etfGlobalTarget: .6, stockGlobalTarget: .4,
  stockTargets: [{ key: 'bmri', name: 'BMRI', weight: .6 }, { key: 'bbri', name: 'BBRI', weight: .4 }],
  etfTargets: ['etf1','etf2','etf3','etf4'].map((key, i) => ({ key, name: key, weight: [.5,.25,.2,.05][i] })),
};

test('quarter offset: quarter month 2 wires in plan month 2', () => {
  const { quarterFor, isQuarterEnd } = model();
  assert.equal(quarterFor(1, 2), 1);
  assert.equal(quarterFor(2, 2), 1);
  assert.equal(isQuarterEnd(1, 2), false);
  assert.equal(isQuarterEnd(2, 2), true);
});

test('pending ETF cash changes parent share, not ETF child shares', () => {
  const { getState } = model();
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 4_000_000, etf2: 2_000_000, etf3: 1_600_000, etf4: 400_000 };
  const state = getState(values, settings, { rdnCarry: 0, wireFee: 0, usdRate: 15_000, etfCashPending: 2_000_000, quarterMonth: 2, recoveryTarget: 'middle', buyFeeRate: 0 });
  assert.equal(state.etfShare, .625);
  assert.deepEqual(Array.from(state.etfShares), [.5,.25,.2,.05]);
  assert.equal(state.settlements[0].month, 2);
  assert.equal(state.settlements[0].openingCash, 2_000_000);
});

test('stock fee limits lots using fee-inclusive debit', () => {
  const { calculateLotExecution } = model();
  const output = calculateLotExecution([{ key: 'bmri', name: 'BMRI', amount: 1_000_000 }], 1_000_000, { rdnCarry: 0, bmriPrice: 10_000, buyFeeRate: .002 });
  assert.equal(output.trades[0].lots, 0);
  assert.equal(output.totalFee, 0);
});

test('band recovery stops at band edge before middle target', () => {
  const { getState } = model();
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 2_000_000, etf2: 1_000_000, etf3: 800_000, etf4: 200_000 };
  const bandState = getState(values, settings, { rdnCarry: 0, wireFee: 0, usdRate: 15_000, etfCashPending: 0, quarterMonth: 1, recoveryTarget: 'band', buyFeeRate: 0 });
  const middleState = getState(values, settings, { rdnCarry: 0, wireFee: 0, usdRate: 15_000, etfCashPending: 0, quarterMonth: 1, recoveryTarget: 'middle', buyFeeRate: 0 });
  assert.ok(Math.abs(bandState.recoveryTargetShare - .55) < 1e-9);
  assert.ok(Math.abs(middleState.recoveryTargetShare - .60) < 1e-9);
  assert.equal(bandState.etfDeficit, 1_500_000);
  assert.equal(middleState.etfDeficit, 2_000_000);
  assert.equal(bandState.closingMonth.gap, 300_000);
  assert.equal(middleState.closingMonth.gap, 800_000);
});

test('parseCurrency preserves decimal values', () => {
  const { parseCurrency } = model();
  assert.equal(parseCurrency('1000000.50'), 1_000_000.5);
  assert.equal(parseCurrency('1.000.000,50'), 1_000_000.5);
});

test('pending ETF cash is added only once to the first settlement', () => {
  const { getState } = model();
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 4_000_000, etf2: 2_000_000, etf3: 1_600_000, etf4: 400_000 };
  const state = getState(values, settings, { rdnCarry: 0, wireFee: 0, usdRate: 15_000, etfCashPending: 2_000_000, quarterMonth: 2, recoveryTarget: 'middle', buyFeeRate: 0 });
  assert.equal(state.settlements[0].openingCash, 2_000_000);
  assert.ok(state.settlements.slice(1).every((settlement) => settlement.openingCash === 0));
});

test('unreachable parent recovery is flagged instead of inventing a zero-month recovery', () => {
  const { getState } = model();
  const zeroEtfSettings = { ...settings, etfGlobalTarget: 0, stockGlobalTarget: 1 };
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 4_000_000, etf2: 2_000_000, etf3: 1_600_000, etf4: 400_000 };
  const state = getState(values, zeroEtfSettings, { rdnCarry: 0, wireFee: 0, usdRate: 15_000, etfCashPending: 0, quarterMonth: 1, recoveryTarget: 'middle', buyFeeRate: 0 });
  assert.equal(state.recoveryUnreachable, true);
});

test('scenario parser retains negative market changes', () => {
  const { parseSignedDecimal } = model();
  assert.equal(parseSignedDecimal('-20'), -20);
});

test('formatCurrentActionPlan produces clean readable checklist text', () => {
  const { formatCurrentActionPlan, getState } = model();
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 4_000_000, etf2: 2_000_000, etf3: 1_600_000, etf4: 400_000 };
  const state = getState(values, settings, { rdnCarry: 0, wireFee: 250_000, usdRate: 15_000, etfCashPending: 0, quarterMonth: 1, recoveryTarget: 'middle', buyFeeRate: 0.0015, bmriPrice: 5000, bbriPrice: 4000 });
  const text = formatCurrentActionPlan(state);
  assert.ok(text.includes('Instruksi Rebalance'));
  assert.ok(text.includes('Rp 3.000.000'));
});

test('generateRemindersIcs generates valid iCalendar format with events', () => {
  const { generateRemindersIcs, getState } = model();
  const values = { bmri: 4_000_000, bbri: 2_000_000, etf1: 4_000_000, etf2: 2_000_000, etf3: 1_600_000, etf4: 400_000 };
  const state = getState(values, settings, { rdnCarry: 0, wireFee: 250_000, usdRate: 15_000, etfCashPending: 0, quarterMonth: 1, recoveryTarget: 'middle', buyFeeRate: 0.0015 });
  const ics = generateRemindersIcs(state);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('recordExecution updates journal holdings, cash, and logs transaction', () => {
  const { recordExecution } = model();
  const journal = {
    v: 1,
    holdings: { bmri: 1000, bbri: 500, etf1: 10, etf2: 5, etf3: 2, etf4: 1 },
    prices: { bmri: 5000, bbri: 4000, etf1: 400, etf2: 60, etf3: 200, etf4: 120 },
    cash: { rdn: 50_000, etfPending: 1_000_000 },
    transactions: [],
    snapshots: [],
  };
  const execution = {
    trades: [{ key: 'bmri', name: 'BMRI', lots: 2, shares: 200, price: 5000, spent: 1_001_500, fee: 1500 }],
    remainder: 48_500,
  };
  const updated = recordExecution(journal, 1, execution, { etfAmount: 2_000_000, isSettlement: false });
  assert.equal(updated.holdings.bmri, 1200);
  assert.equal(updated.cash.rdn, 48_500);
  assert.equal(updated.cash.etfPending, 3_000_000);
  assert.equal(updated.transactions.length, 2); // 1 stock, 1 etf pending
  assert.equal(updated.snapshots.length, 1);
});
