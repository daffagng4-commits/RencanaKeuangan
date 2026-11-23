/** Tes regresi Audit Putaran 2 (BUG-12 s.d. BUG-19) + migrasi skema v1/v2 -> v3 + zona waktu WIB. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadCore, newYear, item } = require('../helpers/core');

const ROOT = path.join(__dirname, '..', '..');

function loadNumInput() {
  const c = loadCore({
    document: { addEventListener() {}, getElementById() { return null; } },
    window: {},
    $() { return null; },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ui', 'num-input.js'), 'utf8'), c, { filename: 'num-input.js' });
  return c;
}

function loadTripHelpers() {
  const c = loadCore({
    document: { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
    window: { addEventListener() {} },
    $() { return null; },
    renderAll() {},
    tab() {},
    toast() {},
    syncUI() {},
    setSaveStatus() {},
  });
  vm.runInContext(
    'var SIM=[]; function save(){} function kid(p){return p+"1";}' +
      fs.readFileSync(path.join(ROOT, 'js', 'ui', 'trip.js'), 'utf8'),
    c,
    { filename: 'trip.js' },
  );
  return c;
}

test('BUG-12: num-input fmtRpBlurStr & fmtRpInputStr tidak menggembungkan desimal 100x dan mendukung shorthand negatif', () => {
  const c = loadNumInput();
  assert.equal(c.fmtRpBlurStr('1.500.000,00'), '1.500.000');
  assert.equal(c.fmtRpBlurStr('1,500,000.00'), '1.500.000');
  assert.equal(c.fmtRpBlurStr('Rp 1,5jt'), '1.500.000');
  assert.equal(c.fmtRpBlurStr('-500rb'), '-500.000');
  assert.equal(c.fmtRpInputStr('1.500.000,00'), '1.500.000');
  assert.equal(c.fmtRpInputStr('1,500,000.00'), '1.500.000');
  assert.equal(c.fmtRpInputStr('-500000'), '-500.000');
});

test('BUG-13: xlNum mengurai format desimal Excel (1.500.000,00 & 1,500,000.00) dan menolak NaN/Infinity', () => {
  const c = loadTripHelpers();
  assert.equal(c.xlNum('1.500.000,00'), 1500000);
  assert.equal(c.xlNum('1,500,000.00'), 1500000);
  assert.equal(c.xlNum('1 500 000'), 1500000);
  assert.equal(c.xlNum('Rp 250.000,50'), 250000.5);
  assert.equal(c.xlNum(NaN), 0);
  assert.equal(c.xlNum(Infinity), 0);
});

test('BUG-14: parseRp menolak tanda negatif di tengah ("50-000") dan notasi ilmiah liar ("1e308")', () => {
  const c = loadCore();
  assert.equal(c.parseRp('50-000'), 0);
  assert.equal(c.parseRp('1e308'), 0);
  assert.equal(c.parseRp('1 500 000'), 1500000);
  assert.equal(c.parseRp('-500rb'), -500000);
  assert.equal(c.parseRp('  200.000  '), 200000);
});

test('BUG-15: simApply tidak crash saat kasLinked() bernilai null', () => {
  const c = loadTripHelpers();
  newYear(c, 2026, { saldo: 5000000, startMonth: 0, items: [] });
  c.ALL.kas = { cur: '', pr: {} };
  c.SIM = [{ k: 'in', name: 'Bonus', amt: 100000, m: 5, rep: 'sekali', n: 1 }];
  assert.doesNotThrow(() => c.simApply());
});

test('BUG-16: sync.js pull() tidak masuk loop pull<->push tak berujung saat konflik offline (lr > rr > ls)', async () => {
  const store = {};
  const els = {};
  const ls = {
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  let pullCount = 0;
  let pushCount = 0;
  let cloudRev = 200;
  const remoteData = {
    sv: 3, year: 2026, rev: 200,
    data: { 2026: { year: 2026, saldo: 1000000, startMonth: 0, items: [], paid: {}, skip: {}, real: {}, adj: [] } },
    kas: { cur: 'utama', pr: { utama: { id: 'utama', name: 'Utama', saldo: 0, link: true, tx: [] } } },
  };
  const mockSupabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'u1@example.com' } } } }),
          onAuthStateChange() {},
          signInWithPassword: async () => { throw new Error('network down'); },
          signOut: async () => ({ error: null }),
        },
        from() {
          return {
            select() {
              pullCount++;
              if (pullCount > 5) throw new Error('INFINITE PULL LOOP');
              return { eq() { return { maybeSingle: async () => ({ data: { data: remoteData, rev: cloudRev }, error: null }) }; } };
            },
            update(p) {
              pushCount++;
              let eqRev = null;
              const chain = {
                eq(col, val) { if (col === 'rev') eqRev = val; return chain; },
                select: async () => {
                  if (eqRev === cloudRev) {
                    cloudRev = p.rev;
                    return { data: [{ rev: p.rev }], error: null };
                  }
                  return { data: [], error: null };
                },
              };
              return chain;
            },
            upsert(p) {
              pushCount++;
              cloudRev = p.rev;
              return { select: async () => ({ data: [{ rev: p.rev }], error: null }) };
            },
          };
        },
      };
    },
  };
  const ctx = loadCore({
    URL, URLSearchParams,
    SB_URL: 'https://example.supabase.co',
    SB_KEY: 'sb_publishable_test',
    localStorage: ls,
    location: { origin: 'https://example.com', pathname: '/', search: '', hash: '', assign() {} },
    document: { getElementById(id) { if (!els[id]) els[id] = { style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => null }; return els[id]; } },
    $(id) { return ctx.document.getElementById(id); },
    supabase: mockSupabase,
    window: { supabase: mockSupabase },
    setSaveStatus() {},
    syncUI() {},
    toast() {},
    renderAll() {},
    refreshToday() {},
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'sync.js'), 'utf8'), ctx, { filename: 'sync.js' });
  ctx.sbInit();
  // Set state: previously synced at rev=100, local edited at rev=300, cloud is at rev=200
  ctx.sbUser = { id: 'u1', email: 'u1@example.com' };
  ctx.ALL = ctx.norm({
    sv: 3, year: 2026, rev: 300,
    data: { 2026: { year: 2026, saldo: 9999999, startMonth: 0, items: [], paid: {}, skip: {}, real: {}, adj: [] } },
    kas: { cur: 'utama', pr: { utama: { id: 'utama', name: 'Utama', saldo: 0, link: true, tx: [] } } },
  });
  ctx.S = ctx.ALL.data[2026];
  ctx.setSync(100);
  await ctx.pull();
  assert.ok(pullCount <= 2, 'pull tidak boleh loop tak berujung (pullCount=' + pullCount + ')');
  assert.equal(cloudRev, 300, 'perubahan lokal terbaru (rev=300) berhasil disimpan ke cloud');
});

test('BUG-17: rkWriteCache tidak melempar exception saat localStorage penuh (QuotaExceededError)', () => {
  const c = loadCore({
    localStorage: {
      getItem() { return null; },
      setItem() { throw new Error('QuotaExceededError'); },
      removeItem() {},
    },
  });
  newYear(c, 2026, { saldo: 100000 });
  assert.doesNotThrow(() => c.rkWriteCache(c.ALL));
});

test('BUG-18: datepick.js fallback tday() memakai tanggal lokal (bukan UTC toISOString)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'ui', 'datepick.js'), 'utf8');
  const line = src.split(/\r?\n/).find((l) => l.includes('function tday('));
  assert.ok(line, 'function tday ditemukan');
  assert.ok(!line.includes('toISOString'), 'fallback tday() tidak boleh memakai UTC toISOString(): ' + line);
});

test('BUG-19: repCollect memakai nominal realisasi (rtx.amt) untuk tagihan yang tertaut Catatan Kas (S.real)', () => {
  const c = loadCore({ document: { addEventListener() {} } });
  vm.runInContext(
    'function kasRows(p){return p.tx;}' + fs.readFileSync(path.join(ROOT, 'js', 'ui', 'report.js'), 'utf8'),
    c,
    { filename: 'report.js' },
  );
  newYear(c, 2026, {
    items: [item({ id: 'l', name: 'Listrik', price: 200000, unit: 'sekali', start: '2026-06-05', cat: 'Tagihan' })],
    paid: { 'l|2026-06-05': true },
    real: { 'l|2026-06-05': { tx: 'tx1' } },
  });
  c.ALL.kas = { pr: { a: { link: true, tx: [{ id: 'tx1', d: '2026-06-06', t: '-', amt: 205000, cat: 'Tagihan', note: 'Listrik PLN' }] } } };
  const col = c.repCollect('2026-06-01', '2026-06-30');
  assert.equal(col.bil.length, 1);
  assert.equal(col.bil[0].amt, 205000);
});

test('Migrasi skema: localStorage kosong, rusak, v1, dan v2 aman dimigrasikan ke v3', () => {
  const cEmpty = loadCore();
  assert.equal(cEmpty.norm(null).sv, 3);
  const v1 = cEmpty.norm({ sv: 1, year: 2025, data: { 2025: { saldo: 5000000, items: [{ id: 1, name: 'Kos', price: 1000000, n: 1, unit: 'bulan', start: '2025-01-01' }], paid: { '1|2025-01-01': true } } } });
  assert.equal(v1.sv, 3);
  assert.equal(v1.data[2025].saldo, 5000000);
  assert.ok(v1.kas && v1.kas.pr && Object.keys(v1.kas.pr).length >= 1);
  const v2 = cEmpty.norm({ sv: 2, year: 2026, data: { 2026: { saldo: 2000000, items: [], paid: {}, skip: {}, real: {}, adj: [] } }, kas: { cur: 'k1', pr: { k1: { id: 'k1', name: 'Utama', link: true, tx: [{ id: 't1', d: '2026-01-05', t: '-', amt: 15000, cat: 'Makan', note: 'kopi' }] } } } });
  assert.equal(v2.sv, 3);
  assert.equal(v2.kas.pr.k1.tx.length, 1);
  assert.equal(v2.kas.pr.k1.tx[0].amt, 15000);
});
