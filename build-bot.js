// Rakit bot/core.mjs dari modul aplikasi (tanpa duplikasi rumus).
// Hanya fungsi murni yang diambil; file UI di-ekstrak per nama fungsi.
const fs = require('fs');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r/g, '');

// Ambil satu fungsi top-level utuh (dari "function NAMA(" sampai "}" di kolom 0).
function pick(file, names) {
  const lines = read(file).split('\n');
  const out = [];
  for (const n of names) {
    const i = lines.findIndex((l) => l.startsWith('function ' + n + '(') || l.startsWith('async function ' + n + '('));
    if (i < 0) throw new Error('build-bot: fungsi ' + n + ' tidak ada di ' + file);
    let j = i;
    while (j < lines.length && lines[j] !== '}') j++;
    if (j >= lines.length) throw new Error('build-bot: penutup fungsi ' + n + ' tidak ketemu di ' + file);
    out.push('/* ' + file + ' */\n' + lines.slice(i, j + 1).join('\n'));
  }
  return out.join('\n\n');
}

const parts = [
  '// DIGENERASI oleh build-bot.js — jangan disunting manual.\n// Isi: util, schedule, calc, items, match + fungsi murni dari file UI.',
  read('js/core/util.js'),
  read('js/core/schedule.js'),
  read('js/core/calc.js'),
  read('js/core/items.js'),
  read('js/core/match.js'),
  pick('js/core/state.js', ['smEffYear', 'smEff']),
  pick('js/core/reminders.js', ['todayISO']),
  pick('js/ui/items.js', ['parseQuickItem']),
  pick('js/ui/kas.js', ['kasLinked', 'kasBase', 'kasDerived', 'kasRows', 'kasSum']),
  pick('js/ui/trip.js', ['kasGoals', 'monthList', 'goalMonths', 'goalMonthsIn']),
  // Shim: state disuntik dari Supabase, bukan localStorage/DOM.
  `/* Shim bot */
var ALL = null, S = null;
function setS(all, s) { ALL = all; S = s; }
function state() { return { all: ALL, s: S }; }
export { setS, state, MON, FULL_MON, esc, rp, parseRp, fd, isoD, fmtD, shortP, pad2, addDaysISO,
  at, series, occ, nextDates, every, priceAt, priceSeg, sumP, lastOcc,
  calc, incomeYear, adjMonths, parseQuickItem, kasLinked, kasBase, kasRows, kasSum, kasDerived,
  kasGoals, goalMonths, goalMonthsIn, monthList, todayISO, isInvestCat, INVEST_RE, mNorm, realTx,
  smEffYear, smEff };`,
];

fs.mkdirSync('bot', { recursive: true });
const out = parts.join('\n\n');
fs.writeFileSync('bot/core.mjs', out);
console.log('bot/core.mjs dibuat (' + Math.round(out.length / 1024) + ' KB)');
