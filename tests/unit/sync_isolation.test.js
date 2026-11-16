/** Tes isolasi akun, state kosong saat logout / akun baru, dan konfigurasi Google OAuth. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadCore } = require('../helpers/core');

function loadSyncEnv(opts = {}) {
  const store = Object.assign({}, opts.initialStorage || {});
  const els = {};
  const ls = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  let oauthOpts = null;
  let pushedPayload = null;
  let remoteRow = opts.remoteRow !== undefined ? opts.remoteRow : null;
  const mockSupabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => ({ data: { session: opts.session || null } }),
          onAuthStateChange() {},
          signInWithOAuth: async (arg) => {
            oauthOpts = arg;
            return { data: { url: 'https://accounts.google.com/o/oauth2/auth' }, error: null };
          },
          signOut: async () => ({ error: null }),
        },
        from(tbl) {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: tbl === 'rk_state' ? remoteRow : null, error: null }),
                  };
                },
              };
            },
            upsert(p) {
              pushedPayload = p;
              return { select: async () => ({ data: [{ rev: p.rev }], error: null }) };
            },
            update(p) {
              pushedPayload = p;
              return {
                eq() { return this; },
                select: async () => ({ data: [{ rev: p.rev }], error: null }),
              };
            },
          };
        },
      };
    },
  };
  const ctx = loadCore({
    URL,
    URLSearchParams,
    SB_URL: 'https://example.supabase.co',
    SB_KEY: 'sb_publishable_test',
    localStorage: ls,
    location: { origin: 'https://user.github.io', pathname: '/RencanaKeuangan/', search: '?mode=app', hash: '', assign() {} },
    document: {
      getElementById(id) {
        if (!els[id]) els[id] = { style: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => null };
        return els[id];
      },
    },
    $(id) {
      if (!els[id]) els[id] = { style: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => null };
      return els[id];
    },
    supabase: mockSupabase,
    window: { supabase: mockSupabase },
    setSaveStatus() {},
    snap() { return { t: Date.now() }; },
    syncUI() {},
    toolsPull() {},
    toast() {},
    getShellMode() { return 'mobile-app'; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'sync.js'), 'utf8'), ctx);
  ctx.sbInit();
  return { ctx, store, getOAuth: () => oauthOpts, getPushed: () => pushedPayload, setRemote: (r) => { remoteRow = r; } };
}

test('saat belum login di mode cloud, loadState tidak menampilkan data localStorage atau seed', () => {
  const adminData = JSON.stringify({
    year: 2026,
    data: { 2026: { year: 2026, saldo: 99000000, items: [{ id: 1, name: 'AdminSecret', price: 500000, n: 1, unit: 'bulan', start: '2026-11-01' }] } },
    kas: { pr: { utama: { id: 'utama', name: 'Utama', link: true, tx: [{ id: 'tx1', d: '2026-11-02', t: '-', amt: 123000, cat: 'Makan', note: 'Rahasia' }] } } },
  });
  const { ctx } = loadSyncEnv({ initialStorage: { 'rencana-keuangan-v1': adminData } });
  ctx.loadState();
  assert.equal(ctx.S.saldo, 0);
  assert.equal(ctx.S.items.length, 0);
  assert.equal(ctx.ALL.kas.pr.utama.tx.length, 0);
});

test('akun Google baru tanpa baris cloud mulai kosong dan tidak mendorong data localStorage/admin', async () => {
  const adminData = JSON.stringify({
    year: 2026,
    data: { 2026: { year: 2026, saldo: 88000000, items: [{ id: 1, name: 'AdminItem', price: 100000, n: 1, unit: 'bulan', start: '2026-11-01' }] } },
  });
  const { ctx, getPushed } = loadSyncEnv({ initialStorage: { 'rencana-keuangan-v1': adminData }, remoteRow: null });
  await new Promise((r) => setTimeout(r, 10));
  ctx.loadState();
  ctx.setUser({ user: { id: 'new-google-uid', email: 'baru@gmail.com' } });
  await new Promise((r) => setTimeout(r, 30));
  const pushed = getPushed();
  assert.ok(pushed, 'membuat baris kosong untuk akun baru di Supabase');
  assert.equal(pushed.user_id, 'new-google-uid');
  assert.equal(pushed.data.data[pushed.data.year].items.length, 0);
  assert.equal(pushed.data.data[pushed.data.year].saldo, 0);
});

test('logout mengosongkan state dan menghapus cache localStorage agar data akun tidak muncul saat logout', async () => {
  const cloudRow = {
    rev: 12345,
    data: {
      year: 2026,
      data: { 2026: { year: 2026, saldo: 7500000, items: [{ id: 5, name: 'WiFi', price: 350000, n: 1, unit: 'bulan', start: '2026-11-05' }] } },
    },
  };
  const { ctx, store } = loadSyncEnv({ remoteRow: cloudRow });
  await new Promise((r) => setTimeout(r, 10));
  ctx.setUser({ user: { id: 'admin-uid', email: 'admin@gmail.com' } });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(ctx.S.items.length, 1);
  assert.ok(store['rencana-keuangan-v1:admin-uid'], 'cache terisolasi disimpan per user_id');

  ctx.setUser(null);
  assert.equal(ctx.S.items.length, 0);
  assert.equal(ctx.S.saldo, 0);
  assert.equal(store['rencana-keuangan-v1:admin-uid'], undefined);
  assert.equal(store['rencana-keuangan-v1'], undefined);
});

test('authGoogle memakai redirectTo kanonik tanpa query ?mode=app dan menyimpan preferensi shell mode', async () => {
  const { ctx, store, getOAuth } = loadSyncEnv();
  await ctx.authGoogle();
  const oauth = getOAuth();
  assert.equal(oauth.provider, 'google');
  assert.equal(oauth.options.redirectTo, 'https://user.github.io/RencanaKeuangan/');
  assert.equal(store['rk-shell-mode'], 'mobile-app');
});

test('error OAuth Signups not allowed menerjemahkan petunjuk Supabase di sbInit', async () => {
  const els = {};
  const mkEl = () => ({ style: {}, classList: { toggle() {} }, querySelector: () => null, textContent: '' });
  const ctx = loadCore({
    URL,
    URLSearchParams,
    SB_URL: 'https://example.supabase.co',
    SB_KEY: 'sb_publishable_test',
    location: {
      origin: 'https://user.github.io',
      pathname: '/RencanaKeuangan/',
      search: '?error=access_denied&error_description=Signups+not+allowed+for+this+instance',
      hash: '',
    },
    history: { replaceState() {} },
    document: { getElementById(id) { return (els[id] = els[id] || mkEl()); } },
    $(id) { return (els[id] = els[id] || mkEl()); },
    supabase: { createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} } }) },
    window: { supabase: {} },
    toast() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'sync.js'), 'utf8'), ctx);
  ctx.sbInit();
  await new Promise((r) => setTimeout(r, 10));
  assert.match(els.lm.textContent, /Allow new users to sign up/);
});
