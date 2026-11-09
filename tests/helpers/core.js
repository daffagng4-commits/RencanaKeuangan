/**
 * Memuat modul inti (js/core/*.js) ke sandbox `vm` tanpa DOM, supaya logikanya bisa diuji sebagai unit.
 * Semua fungsi/variabel global modul tersedia sebagai properti objek yang dikembalikan.
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function memStorage() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
  };
}

function loadCore(extra) {
  const ctx = vm.createContext(
    Object.assign(
      { console, Date, Math, JSON, Object, Array, String, Number, RegExp, parseInt, parseFloat, isNaN, localStorage: memStorage(),
        setTimeout, clearTimeout, syncUI() {}, setSaveStatus() {}, schedPush() {} },
      extra,
    ),
  );
  ['util', 'schedule', 'state', 'items', 'calc', 'csv', 'reminders', 'match'].forEach((f) =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'core', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }),
  );
  // calc() memanggil fungsi Catatan Kas yang hidup di js/ui/ (butuh DOM). Di sini dipakai cerminan minimalnya;
  // kasLinked sama persis dengan js/ui/kas.js, sedangkan target tabungan (kasGoals) sengaja kosong di tes unit.
  vm.runInContext(
    'function kasLinked(){var pr=(ALL&&ALL.kas&&ALL.kas.pr)||{};for(var id in pr)if(pr[id].link)return pr[id];return null;}' +
      'function kasGoals(){return [];}function goalMonthsIn(){return [];}',
    ctx,
    { filename: 'kas-stub.js' },
  );
  return ctx;
}

/** Data tahun kosong siap pakai untuk tes. */
function newYear(ctx, year, props) {
  const Y = Object.assign({ year, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] }, props);
  ctx.ALL = { year, rev: 0, data: { [year]: Y } };
  ctx.S = Y;
  return Y;
}

const item = (o) => Object.assign({ id: 1, name: 'T', price: 1000, n: 1, unit: 'bulan', start: '2035-01-01', end: '', cnt: 0, cat: '', ch: [] }, o);

module.exports = { loadCore, newYear, item };
