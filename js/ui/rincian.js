/**
 * Tab Rincian Bulanan: ringkasan saldo, grafik per bulan, grafik per kategori, tabel arus kas.
 */

var openRows = {};
var catPeriod = 'y';
var bsPeriod = 'm';
var expenseMonth = 'y';
var expenseLastMonth = '';
var expenseYear = '';
const EXPENSE_TOP_N = 5;
var flowPeriod = 'y';
var catDir = '-';
var txDir = '-';


function chipName(name) {
  return (name || '').replace(/\s*\([^)]*\)/g, '').trim() || name;
}

/** Selisih hari antara dua ISO (a - b). */
function daysBetweenISO(a, b) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
}

/**
 * Jangkar periode Minggu/Bulan: satu aturan untuk semua kartu.
 * Tahun berjalan = hari ini; tahun depan (simulasi) = hari-bulan yang sama di tahun itu;
 * tahun lalu = tanggal data terakhir `last` (atau 31 Des).
 */
function periodAnchor(y, last) {
  var t = todayISO(),
    ty = +t.slice(0, 4);
  y = +y;
  if (y === ty) return t;
  if (y < ty) return last || y + '-12-31';
  var m = +t.slice(5, 7),
    dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return y + '-' + pad2(m) + '-' + pad2(Math.min(+t.slice(8, 10), dim));
}

/** Label profil tahun depan (simulasi). */
function simTag(y) {
  return +y > +todayISO().slice(0, 4) ? ' · rencana' : '';
}

/** Teks hitung mundur / keterlambatan tagihan. */
function fmtCountdown(iso, today, isLate) {
  if (isLate) {
    var late = daysBetweenISO(today, iso);
    return 'Terlambat ' + late + ' hari';
  }
  var d = daysBetweenISO(iso, today);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  if (d > 30) return '';
  return d + ' hari lagi';
}

/** Aliran kas harian per tanggal (mencakup semua tahun). Nilai identik dengan mesin kasRunway. */
function kasFlow(P) {
  if (!P) P = kasLinked() || (typeof kas === 'function' ? kas() : null);
  if (!P) return null;
  var today = todayISO(),
    base = kasBase(P),
    ev = [];
  kasRows(P).forEach(function (x) {
    ev.push({ d: x.d, delta: x.t === '+' ? x.amt : -x.amt, key: x.id, name: x.note || x.cat || 'Transaksi', t: x.t });
  });
  var allYears = (typeof ALL !== 'undefined' && ALL.data) ? Object.keys(ALL.data) : [];
  if (!allYears.length && typeof S !== 'undefined' && S.year) allYears = [String(S.year)];
  allYears.forEach(function (yk) {
    var Y = ALL.data[yk], y = +yk;
    if (!Y || !Y.items) return;
    Y.items.forEach(function (it) {
      occ(it, y).forEach(function (t) {
        var d = isoD(t),
          k = it.id + '|' + d;
        if (Y.paid && (Y.paid[k] || Y.skip[k])) return;
        ev.push({ d: d, delta: -priceAt(it, t), key: k, name: it.name, t: '-' });
      });
    });
  });
  if (!ev.length) return { today: today, base: base, pre: 0, byDate: {}, dates: [], allDates: [] };
  var byDate = {}, seen = {};
  ev.forEach(function (e) {
    if (!seen[e.d]) {
      seen[e.d] = 1;
      byDate[e.d] = { delta: 0, items: [] };
    }
    byDate[e.d].delta += e.delta;
    byDate[e.d].items.push({ key: e.key, name: e.name, delta: e.delta, t: e.t });
  });
  var pre = 0;
  Object.keys(byDate).forEach(function (d) {
    if (d <= today) pre += byDate[d].delta;
  });
  var dates = Object.keys(byDate).filter(function (d) { return d > today; }).sort();
  return { today: today, base: base, pre: pre, byDate: byDate, dates: dates, allDates: Object.keys(byDate).sort() };
}

/** Proyeksi runway kas (wrapper di atas kasFlow; hasil tetap sama). */
function kasRunway(P, bal) {
  var F = kasFlow(P);
  if (!F) return null;
  var curr = F.base + F.pre;
  if (curr <= 0) return { days: 0, date: F.today, deficit: Math.abs(curr), status: 'deficit' };
  if (!F.dates.length) return { days: 999, date: null, deficit: 0, status: 'safe' };
  for (var i = 0; i < F.dates.length; i++) {
    var d = F.dates[i];
    curr += F.byDate[d].delta;
    if (curr < 0) {
      var dDiff = Math.max(0, Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(F.today + 'T00:00:00Z')) / 864e5));
      return { days: dDiff, date: d, deficit: Math.abs(curr), status: dDiff <= 90 ? 'warning' : 'ok' };
    }
  }
  return { days: 999, date: null, deficit: 0, status: 'safe' };
}

/** Tanggal dan tagihan pertama yang membuat saldo proyeksi negatif. */
function kasFirstNegative(P) {
  var F = kasFlow(P);
  if (!F) return null;
  var curr = F.base + F.pre;
  if (curr < 0) return { date: F.today, days: 0, items: [], balanceAfter: curr };
  for (var i = 0; i < F.dates.length; i++) {
    var d = F.dates[i];
    curr += F.byDate[d].delta;
    if (curr < 0) {
      var days = Math.max(0, Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(F.today + 'T00:00:00Z')) / 864e5));
      return { date: d, days: days, items: F.byDate[d].items.filter(function (x) { return x.delta < 0; }), balanceAfter: curr };
    }
  }
  return null;
}

/** Legenda chip di kolom "Item berkala" (dipakai juga oleh panduan yang bisa disembunyikan). */
var RINCIAN_LEGEND =
  '<div class="lgd">' +
  '<span><span class="chip">Listrik ×2</span>Siklus khusus / lebih dari sekali</span>' +
  '<span><span class="chip chg">Listrik ▲ 720rb</span>Harga beda dari harga awal (▲ naik, ▼ turun)</span>' +
  '<span><span class="chip wr">Listrik ▲ 720rb (lonjakan)</span>Lonjakan ≥20% dari harga awal</span>' +
  '<span><span class="chip sk">Gym</span>Dilewati bulan ini</span>' +
  '</div>';

/** Palet warna kategori: pemetaan eksplisit dengan kontras tinggi (CIE76 DeltaE >= 20). */
var CAT_COLORS = {
  'investasi': '#5b7fe8',
  'tagihan rutin': '#3fa57a',
  'tagihan': '#3fa57a',
  'hiburan': '#c0516f',
  'kesehatan': '#a050c8',
  'lainnya': '#7b8794',
  'transfer': '#e0953f',
  'gaji': '#3b9e6b'
};
var RESERVE_PALETTE = ['#2fa4b8', '#8a9a3a', '#6c4fc0', '#d46a4a'];

function catColor(name) {
  if (!name || name === 'Tanpa kategori') return 'var(--mut)';
  if (isInvestCat(name)) return 'var(--bl)';
  var key = name.trim().toLowerCase();
  if (CAT_COLORS[key]) return CAT_COLORS[key];
  var hash = 0;
  for (var j = 0; j < key.length; j++) hash = (hash * 31 + key.charCodeAt(j)) >>> 0;
  return RESERVE_PALETTE[hash % RESERVE_PALETTE.length];
}

/** "+ Rp 1.000" atau "− Rp 1.000". */
function signed(v) {
  return (v > 0 ? '+ ' : '− ') + rp(Math.abs(v));
}

/** Pemasukan/pengeluaran tahun aktif: jadwal bayar (termasuk yang belum lunas) + catatan kas. */
function yearCash() {
  var y = +S.year,
    sm = smEff(),
    P = kasLinked(),
    o = { inc: 0, out: 0, byCat: {}, byMonth: [], entries: [] };
  for (var i = 0; i < 12; i++) o.byMonth[i] = 0;
  function add(d, t, amt, cat, note, item) {
    if (+d.slice(0, 4) !== y) return;
    var m = +d.slice(5, 7) - 1;
    if (m < sm) return;
    var e = { d: d, t: t, amt: amt, cat: cat || '', note: note || '' };
    if (item) { e.itemId = item.id; e.itemName = item.name; }
    o.entries.push(e);
    if (t === '+') o.inc += amt;
    else {
      o.out += amt;
      o.byCat[e.cat] = (o.byCat[e.cat] || 0) + amt;
      o.byMonth[m] += amt;
    }
  }
  var covered = new Set(); // kunci kemunculan tagihan yang sudah diwakili baris kas
  if (P)
    kasRows(P).forEach(function (x) {
      var item = S.items.find(function (it) {
        if (x.ro === 'tagihan' && x.id === 'b' + it.id + '|' + x.d) return true;
        return Object.keys(S.real || {}).some(function (k) {
          return k.slice(0, k.lastIndexOf('|')) === String(it.id) && S.paid[k] && S.real[k] && S.real[k].tx === x.id;
        });
      });
      if (item) covered.add(item.id + '|' + x.d);
      add(x.d, x.t, x.amt, x.cat, x.note, item);
    });
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.skip[k]) return;
      if (P && S.paid[k] && (covered.has(k) || realTx(k))) return;
      add(d, '-', priceAt(it, t), it.cat || 'Tagihan', it.name, it);
    });
  });
  return o;
}

/** Irisan transaksi masuk/keluar untuk tab 7 hari / bulan / tahun. */
function cashPeriod(C, p) {
  var y = +S.year,
    sm = smEff(),
    today = todayISO(),
    dates = C.entries
      .map(function (e) {
        return e.d;
      })
      .sort(),
    anchor = periodAnchor(y, dates.length ? dates[dates.length - 1] : ''),
    from,
    to;
  if (p === 'w') {
    from = addDaysISO(anchor, -6);
    to = anchor;
  } else if (p === 'm') {
    from = anchor.slice(0, 7) + '-01';
    to = isoD(Date.UTC(y, +anchor.slice(5, 7), 0));
  } else {
    from = y + '-' + pad2(sm + 1) + '-01';
    to = y + '-12-31';
  }
  var byCat = {},
    incByCat = {},
    inc = 0,
    out = 0,
    n = 0,
    nin = 0;
  C.entries.forEach(function (e) {
    if (e.d < from || e.d > to) return;
    if (e.t === '+') {
      inc += e.amt;
      nin++;
      incByCat[e.cat] = (incByCat[e.cat] || 0) + e.amt;
      return;
    }
    out += e.amt;
    n++;
    byCat[e.cat] = (byCat[e.cat] || 0) + e.amt;
  });
  var days = Math.max(1, Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 864e5) + 1);
  return { from: from, to: to, inc: inc, out: out, total: out, n: n, nin: nin, byCat: byCat, incByCat: incByCat, avg: out / days };
}

/** Tombol periode Minggu / bulan / tahun; attr = nama data-atribut pemicunya. */
function periodTabs(attr, cur) {
  return [['w', 'Minggu'], ['m', 'Bulan'], ['y', 'Tahun']]
    .map(function (t) {
      return (
        '<button type="button" class="cat-tab' +
        (cur === t[0] ? ' on' : '') +
        '" data-' +
        attr +
        '="' +
        t[0] +
        '" aria-pressed="' +
        (cur === t[0] ? 'true' : 'false') +
        '">' +
        t[1] +
        '</button>'
      );
    })
    .join('');
}

/** Kartu stacked bar pemasukan vs pengeluaran per bulan. Penyesuaian saldo tidak dihitung. */
function monthFlowCard(C) {
  var y = +S.year,
    M = MON.map(function (m, i) {
      return { m: m, full: FULL_MON[i] + ' ' + y, inc: 0, out: 0 };
    });
  C.entries.forEach(function (e) {
    if (+e.d.slice(0, 4) !== y || /Penyesuaian/.test(e.cat)) return;
    M[+e.d.slice(5, 7) - 1][e.t === '+' ? 'inc' : 'out'] += e.amt;
  });
  var rows =
      bsPeriod === 'y'
        ? M
        : M.filter(function (r) {
            return r.inc || r.out;
          }),
    inc = 0,
    out = 0;
  rows.forEach(function (r) {
    inc += r.inc;
    out += r.out;
  });
  var d = inc - out,
    tabs = [['m', 'Bulan'], ['y', 'Tahun']]
      .map(function (t) {
        var on = bsPeriod === t[0];
        return '<button type="button" class="cat-tab' + (on ? ' on' : '') + '" data-bsp="' + t[0] + '" aria-pressed="' + on + '">' + t[1] + '</button>';
      })
      .join(''),
    head =
      '<div class="insight-head"><div class="insight-title"><h2 class="m0">Pemasukan vs pengeluaran per bulan</h2><div class="sub">' +
      (rows.length ? rows[0].m + (rows.length > 1 ? ' – ' + rows[rows.length - 1].m : '') + ' ' + y : y) +
      '</div></div><div class="cat-tabs" role="tablist">' +
      tabs +
      '</div></div>';
  if (!inc && !out) return '<div class="card bs-card">' + head + '<div class="empty">Belum ada pemasukan atau pengeluaran tahun ini.</div></div>';
  var trend = d < 0 ? 'M3 7l6 6 4-4 8 8M15 17h6v-6' : 'M3 17l6-6 4 4 8-8M15 7h6v6';
  return (
    '<div class="card bs-card">' +
    head +
    barStackHtml({ aria: 'Grafik pemasukan vs pengeluaran per bulan ' + y, rows: rows }) +
    '<div class="bs-foot"><b class="' +
    (d < 0 ? 'neg' : 'pos') +
    '">' +
    (d < 0 ? 'Defisit' : 'Surplus') +
    ' <span class="pv">Rp ' +
    rpS(Math.abs(d)) +
    '</span> selama periode ini <svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    trend +
    '"/></svg></b><div class="sub">Total masuk <span class="pv kin">' +
    rp(inc) +
    '</span> · total keluar <span class="pv neg">' +
    rp(out) +
    '</span></div></div></div>'
  );
}

function groupExpenseItems(entries) {
  var groups = new Map(), conflicts = new Map(), unmatched = new Set();
  entries.forEach(function (e) {
    var raw = (e.note || '').trim() || e.cat || 'Tanpa nama', matches = itemTriggerMatches(raw),
      name = normalisasiNamaItem(raw), key = name.toLocaleLowerCase('id-ID'), r = groups.get(key);
    if (matches.length > 1) conflicts.set(raw, matches.map(function (m) { return m.nama; }));
    if (!matches.length) unmatched.add(raw);
    if (!r) { r = { name: name, cats: new Map(), byMonth: {}, raw: new Set(), v: 0 }; groups.set(key, r); }
    r.raw.add(raw);
    r.v += e.amt;
    r.cats.set(e.cat || '', (r.cats.get(e.cat || '') || 0) + 1);
    var month = +e.d.slice(5, 7);
    r.byMonth[month] = (r.byMonth[month] || 0) + e.amt;
  });
  var rows = Array.from(groups.values()).sort(function (a, b) { return b.v - a.v || a.name.localeCompare(b.name, 'id'); });
  rows.forEach(function (r) {
    r.cat = Array.from(r.cats.keys()).sort(function (a, b) { return r.cats.get(b) - r.cats.get(a); })[0];
  });
  return { rows: rows, unmatched: Array.from(unmatched), conflicts: Array.from(conflicts),
    multipleCategories: rows.filter(function (r) { return r.cats.size > 1; }) };
}

var EXPENSE_PALETTE = [
  '#5b7fe8',
  '#3fa57a',
  '#e0953f',
  '#a050c8',
  '#c0516f',
  '#2fa4b8',
  '#8a9a3a',
  '#6c4fc0',
  '#d46a4a',
  '#7b8794'
];
function itemExpenseColor(i) {
  return EXPENSE_PALETTE[i % EXPENSE_PALETTE.length];
}

var CAT_ICONS = {
  'Investasi': 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  'Tagihan rutin': 'M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1zM9 8h6M9 12h6',
  'Tagihan': 'M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1zM9 8h6M9 12h6',
  'Hiburan': 'M9 18V5l11-2v13M6 21a3 3 0 100-6 3 3 0 000 6zM17 19a3 3 0 100-6 3 3 0 000 6z',
  'Kesehatan': 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z',
  'Lainnya': 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  'Transfer': 'M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4',
  'Gaji': 'M3 7h17a1 1 0 011 1v10a1 1 0 01-1 1H5a2 2 0 01-2-2zM3 7V5a1 1 0 011-1h13M16 13h2'
};
function catIconSvg(name) {
  return CAT_ICONS[name] || 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';
}

function topExpensesCard(C, noAnim) {
  var entries = C.entries.filter(function (e) { return e.t === '-' && !/Penyesuaian/i.test(e.cat); }),
    months = Array.from(new Set(entries.map(function (e) { return +e.d.slice(5, 7); }))).sort(function (a, b) { return a - b; });
  var anchor = periodAnchor(S.year, entries.reduce(function (a, e) { return e.d > a ? e.d : a; }, ''));
  if (expenseYear !== String(S.year)) { expenseLastMonth = ''; expenseYear = String(S.year); }
  if (months.indexOf(+expenseLastMonth) < 0) {
    var current = +anchor.slice(5, 7);
    expenseLastMonth = String(months.indexOf(current) >= 0 ? current : months[months.length - 1] || '');
  }
  var mode = ['w', 'm', 'y'].indexOf(expenseMonth) >= 0 ? expenseMonth : 'y';
  if (mode === 'm' && !expenseLastMonth) mode = 'y';
  expenseMonth = mode;
  var weekFrom = addDaysISO(anchor, -6),
    filtered = entries.filter(function (e) {
      if (mode === 'w') return e.d >= weekFrom && e.d <= anchor;
      if (mode === 'm') return +e.d.slice(5, 7) === +expenseLastMonth;
      return true;
    }),
    selected = Array.from(new Set(filtered.map(function (e) { return +e.d.slice(5, 7); }))).sort(function (a, b) { return a - b; }),
    all = groupExpenseItems(filtered).rows.map(function (r) {
      r.v = selected.reduce(function (sum, m) { return sum + (r.byMonth[m] || 0); }, 0);
      return r;
    }).filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v || a.name.localeCompare(b.name, 'id'); }),
    tt = all.reduce(function (sum, r) { return sum + r.v; }, 0),
    top = all.slice(0, 10),
    tp = top.reduce(function (sum, r) { return sum + r.v; }, 0),
    topPct = tt > 0 ? Math.round(tp / tt * 100) : 0,
    maxVal = top.length ? top[0].v : 1;

  var periodStr = (mode === 'w' ? fmtDateRange(weekFrom, anchor) :
    (selected.length ? fmtMonthRange(selected[0] - 1, selected[selected.length - 1] - 1, S.year) : S.year)) + simTag(S.year);

  var tabs = [['w', 'Minggu'], ['m', 'Bulan'], ['y', 'Tahun']].map(function (m) {
    var on = mode === m[0];
    return '<button type="button" class="cat-tab' + (on ? ' on' : '') + '" data-expm="' + m[0] + '" aria-label="' + m[1] + ' pengeluaran" aria-pressed="' + on + '"' + (!months.length && m[0] === 'm' ? ' disabled' : '') + '>' + m[1] + '</button>';
  }).join('');

  var picker = mode === 'm' ? '<select data-expmonth aria-label="Bulan pengeluaran">' + months.map(function (m) {
    return '<option value="' + m + '"' + (+expenseLastMonth === m ? ' selected' : '') + '>' + MON[m - 1] + ' ' + S.year + '</option>';
  }).join('') + '</select>' : '';

  if (!tt) {
    return (
      '<div class="expense-card card slot-card" aria-labelledby="rk-exp-h">' +
      '<div class="where-ph"><h3 id="rk-exp-h">Item terbesar</h3><div class="cat-tabs expense-tabs" role="group" aria-label="Periode pengeluaran">' + tabs + '</div></div>' +
      '<div class="where-sum"><div><span class="where-big big pv expense-total">Rp 0</span><span class="where-cap cap">keluar \u00b7 ' + periodStr + '</span></div></div>' +
      '<div class="where-main"><div class="where-empty">Belum ada pengeluaran</div></div>' +
      '<div class="where-foot" id="where-items-foot">Belum ada pengeluaran</div>' +
      '</div>'
    );
  }

  var itemsRows = top.map(function (x, i) {
    var col = itemExpenseColor(i),
      pct = tt > 0 ? Math.round(x.v / tt * 100) : 0,
      barW = Math.min(100, Math.round(x.v / maxVal * 100)),
      catName = x.cat || 'Tanpa kategori';
    return '<li class="expense-row" tabindex="0" aria-label="' + esc(x.name + ', ' + rp(x.v) + ', ' + pct + ' persen dari total') + '">' +
      '<span class="ti where-ti" style="color:' + col + ';background:color-mix(in srgb,' + col + ' 16%,transparent)">' + (i + 1) + '</span>' +
      '<div class="nm where-nm"><b class="expense-name" title="' + esc(catName) + '"><i class="expense-dot" aria-hidden="true" style="display:none;background:' + col + '"></i>' + esc(x.name) + '</b><small>' + esc(catName) + '</small></div>' +
      '<span class="mb where-mb"><i class="expense-fill" style="width:' + barW + '%;background:' + col + (noAnim ? ';animation:none' : '') + '"></i></span>' +
      '<span class="pcn">' + pct + '%</span>' +
      '<b class="am where-am pv expense-amount">' + rp(x.v) + '</b>' +
      '<div class="expense-detail sr-only" style="display:none">' + selected.map(function (m) { return MON[m - 1] + ' ' + rp(x.byMonth[m] || 0); }).join(' · ') + '<br>' + esc(Array.from(x.raw || []).join(' · ')) + '</div>' +
      '</li>';
  }).join('');

  var footHtml = top.length
    ? esc(top[0].name) + ' paling besar: <b class="pv">' + rp(top[0].v) + '</b> (' + (tt > 0 ? Math.round(top[0].v / tt * 100) : 0) + '% dari total)'
    : 'Belum ada pengeluaran';

  return (
    '<div class="expense-card card slot-card" aria-labelledby="rk-exp-h">' +
    '<div class="where-ph"><h3 id="rk-exp-h">Item terbesar</h3><div class="dflex aic g8"><div class="cat-tabs expense-tabs" role="group" aria-label="Periode pengeluaran">' + tabs + '</div>' + (picker ? '<div class="expense-picker-wrap">' + picker + '</div>' : '') + '</div></div>' +
    '<div class="where-sum"><div><span class="where-big big pv expense-total">' + rp(tt) + '</span><span class="where-cap cap sub">keluar \u00b7 ' + periodStr +
    '<span class="sr-only" style="display:none"> \u00b7 total ' + rp(tt) + (mode === 'w' ? ' \u00b7 ' + fmtD(weekFrom) + ' \u2013 ' + fmtD(anchor) : '') + '</span>' +
    '</span></div></div>' +
    '<div class="where-main">' +
    '<ul class="where-items expense-list items" id="where-items-list">' + itemsRows + '</ul>' +
    '</div>' +
    '<div class="where-foot" id="where-items-foot">' + footHtml + '</div>' +
    '</div>'
  );
}

/** Tombol periode yang mengendalikan bar kategori. */
function cashPeriodTabs() {
  return periodTabs('catp', catPeriod);
}

/** Satu kartu: bar per kategori + item terbesar, disatukan periode. */
function insightCard(C) {
  var p = cashPeriod(C, catPeriod),
    income = catDir === '+',
    src = income ? p.incByCat : p.byCat,
    total = income ? p.inc : p.out,
    rangeStr = fmtDateRange(p.from, p.to) + simTag(S.year),
    tabs = cashPeriodTabs(),
    dirTabs = '<div class="cat-tabs cat-dirs" role="tablist">' +
      '<button type="button" class="cat-tab' + (income ? '' : ' on') + '" data-catd="-" aria-pressed="' + (!income) + '">Keluar</button>' +
      '<button type="button" class="cat-tab' + (income ? ' on' : '') + '" data-catd="+" aria-pressed="' + income + '">Masuk</button>' +
      '</div>';

  var list = Object.keys(src)
    .map(function (k) { return { name: k || 'Tanpa kategori', v: src[k] }; })
    .filter(function (x) { return x.v > 0; })
    .sort(function (a, b) { return b.v - a.v; });

  var c = list.slice(0, 6);
  var t = total || c.reduce(function (s, x) { return s + x.v; }, 0);
  var mx = c.length ? c[0].v : 1;

  var barSegments = c.map(function (x) {
    var col = catColor(x.name);
    return '<i data-k="' + esc(x.name) + '" style="flex:' + x.v + ';background:' + col + '" title="' + esc(x.name + ': ' + rp(x.v)) + '"></i>';
  }).join('');

  var catRows = c.length ? c.map(function (x) {
    var col = catColor(x.name),
      svg = catIconSvg(x.name),
      pct = t > 0 ? Math.round(x.v / t * 100) : 0,
      barW = Math.min(100, Math.round(x.v / mx * 100));
    return '<li data-k="' + esc(x.name) + '">' +
      '<span class="where-ti" style="color:' + col + ';background:color-mix(in srgb,' + col + ' 16%,transparent)">' +
      '<svg viewBox="0 0 24 24"><path d="' + svg + '"/></svg></span>' +
      '<div class="where-nm"><b>' + esc(x.name) + '</b><small>' + pct + '% dari total</small></div>' +
      '<span class="where-mb"><i style="width:' + barW + '%;background:' + col + '"></i></span>' +
      '<b class="where-am am pv">' + rp(x.v) + '</b>' +
      '</li>';
  }).join('') : '<li class="where-empty">Belum ada data pada periode ini.</li>';

  return (
    '<div class="insight card slot-card" aria-labelledby="rk-cat-h">' +
    '<div class="where-ph"><h3 id="rk-cat-h">Per kategori</h3><div class="cat-tabs" role="tablist">' + tabs + '</div></div>' +
    '<div class="where-sum"><div><span class="where-big big pv">' + rp(t) + '</span><span class="where-cap cap">' + (income ? 'masuk' : 'keluar') + ' \u00b7 ' + rangeStr + '</span></div>' + dirTabs + '</div>' +
    '<div class="where-main">' +
    '<div class="where-bar" id="where-cat-bar">' + barSegments + '</div>' +
    '<ul class="where-cats" id="where-cats-list">' + catRows + '</ul>' +
    '</div>' +
    '<div class="where-foot" id="where-cat-foot">' + c.length + ' kategori \u00b7 total <b class="pv">' + rp(t) + '</b></div>' +
    '</div>'
  );
}

/** Kartu saldo + statistik. */
function heroHtml(c, R, lead, txCount, C, rw) {
  C = C || yearCash();
  var n = R.length || 1,
    jatah = c.end > 0 ? c.end / n : null,
    hv = R[0] || { m: 0 },
    mn = R[0] || { m: 0 };
  R.forEach(function (r) {
    if (C.byMonth[r.m] > C.byMonth[hv.m]) hv = r;
    if (C.byMonth[r.m] < C.byMonth[mn.m]) mn = r;
  });
  var stat = function (label, value, sub, cls, blur) {
    return (
      '<div><span>' +
      label +
      '</span><b class="' +
      (blur === false ? '' : 'pv ') +
      (cls || '') +
      '">' +
      value +
      '</b>' +
      (sub ? '<span' + (cls ? ' class="' + cls + '"' : '') + '>' + sub + '</span>' : '') +
      '</div>'
    );
  };
  var jatahHtml;
  if (c.end > 0) {
    jatahHtml =
      '<div class="jatah"><div class="sub fw6">Jatah jajan per bulan</div><div class="big jv pv">' +
      rp(jatah) +
      '</div><div class="sub">Sisa <span class="pv">Rp ' + rpS(c.end) + '</span> sampai Des ' + S.year + '</div></div>';
  } else {
    jatahHtml =
      '<div class="jatah"><div class="sub fw6">Jatah jajan per bulan</div><div class="big jv neg">Tidak tersedia</div></div>';
  }
  var plain =
    '<div class="card m0"><div class="sub">Sisa saldo akhir Des ' +
    S.year +
    '</div><div class="big' +
    (c.end < 0 ? ' neg' : '') +
    '">' +
    rp(c.end) +
    '</div></div>';
  return (
    '<div class="hero">' +
    (lead ? lead() : plain) +
    (lead ? '<div class="hm-stats">' : '<div class="card stats m0">') +
    stat('Bulan terberat', rp(C.byMonth[hv.m]), MON[hv.m]) +
    stat('Rata-rata per bulan', rp(C.out / n)) +
    stat('Bulan teringan', rp(C.byMonth[mn.m]), MON[mn.m]) +
    (txCount != null ? stat('Transaksi kas', String(txCount), 'catatan kas', '', false) : '') +
    jatahHtml +
    '</div></div></div>'
  );
}

/** Grafik arus saldo: perubahan saldo dari tanggal paling awal sampai paling akhir di catatan kas / jadwal bayar. */
function flowChart(R) {
  var P = kasLinked();
  if (!P) return '';
  var base = kasBase(P),
    today = todayISO(),
    ev = [];
  kasRows(P).forEach(function (x) {
    var d = x.d;
    // Tagihan lunas yang jatuh tempo di masa depan dianggap keluar paling lambat hari ini
    // supaya grafik hari ini sama dengan saldo realtime. Bila kelak ada x.paidAt,
    // ganti baris di bawah: d = x.paidAt || (d > today ? today : d).
    if (x.ro === 'tagihan' && d > today) d = today;
    ev.push({ d: d, delta: x.t === '+' ? x.amt : -x.amt, label: x.note || x.cat || 'Transaksi' });
  });
  var y = +S.year;
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.paid[k] || S.skip[k]) return; // yang lunas sudah ada di kasRows
      ev.push({ d: d, delta: -priceAt(it, t), label: it.name });
    });
  });
  if (!ev.length) return '';
  ev.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  var start = ev[0].d,
    end = ev[ev.length - 1].d;
  // Rentang mengikuti tab periode (Minggu / Bulan / Tahun); jangkar = hari ini atau data terakhir.
  var anchor = periodAnchor(y, end),
    from,
    to;
  if (flowPeriod === 'w') {
    from = addDaysISO(anchor, -6);
    to = anchor;
  } else if (flowPeriod === 'm') {
    from = anchor.slice(0, 7) + '-01';
    to = isoD(Date.UTC(y, +anchor.slice(5, 7), 0));
  } else {
    from = y + '-01-01';
    to = y + '-12-31';
  }
  var a0 = start < from ? from : start,
    a1 = end > to ? to : end,
    pre = 0,
    by = {};
  ev.forEach(function (e) {
    if (e.d < a0) pre += e.delta;
  });
  ev.forEach(function (e) {
    (by[e.d] = by[e.d] || []).push(e);
  });
  var dd = function (d) {
      var z = new Date(d + 'T00:00:00Z');
      return z.getUTCDate() + ' ' + MON[z.getUTCMonth()];
    },
    pts = [],
    bal = base + pre;
  for (var t = Date.parse(a0 + 'T00:00:00Z'), last = Date.parse(a1 + 'T00:00:00Z'); t <= last; t += 864e5) {
    var d = isoD(t),
      day = by[d] || [];
    day.forEach(function (e) { bal += e.delta; });
    var what = day.map(function (e) {
      return (e.delta > 0 ? '+ ' : '− ') + rp(Math.abs(e.delta)) + ' ' + e.label;
    }).join(' · ');
    pts.push({
      d: d,
      v: bal,
      tip: dd(d) + ' · ' + (what ? what + ' · ' : '') + 'saldo ' + rp(bal)
    });
  }
  if (pts.length < 2) return '';
  var low = pts.reduce(function (a, b) { return b.v < a.v ? b : a; });
  var marks = null;
  var rw = kasRunway(P);
  if (rw) marks = { today: today, habis: rw.date };
  var bnd = 'rincian:' + y + '-' + a0 + '-' + a1;
  kasChipBnd[bnd] = { from: a0, to: a1 };
  return saldoLine({
    id: 'rincian',
    bare: true,
    bnd: bnd,
    title: 'Arus saldo ' + S.year,
    sub: 'Perubahan saldo · ' + dd(a0) + ' – ' + dd(a1) + simTag(y),
    aria: 'Grafik arus saldo ' + S.year,
    pts: pts,
    marks: marks,
    foot: 'Terendah <b class="pv' + (low.v < 0 ? ' neg' : '') + '">' + rp(low.v) + '</b> (' + dd(low.d) + ')'
  });
}

/** Chip di kolom "Item berkala": item non-bulanan, siklus diubah, atau harga berbeda; plus yang dilewati. */
function monthChips(r) {
  var chips = {};
  r.ev.forEach(function (e) {
    var it = e.it,
      pc = priceAt(it, e.t),
      changed = pc !== it.price;
    var cadence =
      it.unit !== 'bulan' ||
      it.n !== 1 ||
      (it.ch || []).some(function (g) {
        return g.n || g.unit || g.mv;
      });
    if (!cadence && !changed) return;
    var q = (chips[it.id] = chips[it.id] || { n: it.name, c: 0, p: null, u: '' });
    q.c++;
    if (changed) {
      q.p = pc;
      q.u = pc > it.price ? '&#9650;' : '&#9660;';
    }
  });
  return (
    Object.keys(chips)
      .map(function (k) {
        var q = chips[k],
          up = q.p != null,
          itObj = item(k),
          isAnom = up && itObj && itObj.price > 0 && Math.round(((q.p - itObj.price) / itObj.price) * 100) >= 20;
        return (
          '<span class="chip' +
          (isAnom ? ' wr' : up ? ' chg' : '') +
          '" title="' + esc(q.n) + '">' +
          esc(chipName(q.n)) +
          (q.c > 1 ? ' ×' + q.c : '') +
          (up ? ' ' + q.u + ' ' + shortP(q.p) : '') +
          (isAnom ? ' (lonjakan)' : '') +
          '</span>'
        );
      })
      .join('') +
    r.sk
      .map(function (e) {
        return '<span class="chip sk" title="' + esc(e.it.name) + '">' + esc(chipName(e.it.name)) + '</span>';
      })
      .join('')
  );
}

/** Baris rincian (tanggal, item, harga) saat sebuah bulan dibuka. */
function detailRows(r) {
  var byDate = function (a, b) {
    return a.t - b.t;
  };
  var paid = r.ev
    .slice()
    .sort(byDate)
    .map(function (e, i) {
      var price = priceAt(e.it, e.t),
        isPaid = !!S.paid[e.it.id + '|' + isoD(e.t)],
        isLate = !isPaid && isoD(e.t) < todayISO(),
        diffPct = e.it.price ? Math.round(((price - e.it.price) / e.it.price) * 100) : 0,
        anom = diffPct >= 20 ? '<span class="anom" title="Lonjakan tagihan +' + diffPct + '% dari harga awal">▲ +' + diffPct + '%</span>' : '';
      return (
        '<tr class="det' +
        (isPaid ? ' paid' : isLate ? ' late' : '') +
        '" style="--i:' +
        i +
        '"><td><span class="st ' +
        (isPaid ? 'ok' : isLate ? 'bad' : 'wait') +
        '" role="img" aria-label="' +
        (isPaid ? 'Lunas' : isLate ? 'Terlewat' : 'Belum dibayar') +
        '">' +
        (isPaid ? '✓' : isLate ? '!' : '') +
        '</span>' +
        fd(e.t, { day: 'numeric', month: 'short' }) +
        '</td><td class="l" colspan="2">' +
        esc(e.it.name) +
        anom +
        '</td><td colspan="2" class="l">' +
        rp(price) +
        (price !== e.it.price ? ' <span class="sub">(harga awal ' + rp(e.it.price) + ')</span>' : '') +
        '</td></tr>'
      );
    })
    .join('');
  return paid + skRows(r) || '<tr class="det"><td colspan="5">Tidak ada pembayaran.</td></tr>';
}

/** Status kas dalam satu kalimat: kapan mulai minus dan apa yang harus dilakukan. */
function kasStatusHtml(P, bal) {
  var rw = kasRunway(P, bal);
  if (!rw) return '';
  if (rw.status === 'deficit') {
    return '<div class="runway-box runway-deficit">&#9888; Saldo sudah minus <b class="pv">' + rp(rw.deficit) + '</b>. Tambah saldo awal atau kurangi tagihan.</div>';
  }
  if (rw.status === 'warning') {
    return '<div class="runway-box runway-warning">&#9203; Kas cukup sampai <b class="pv">' + fmtD(rw.date) + '</b> (' + rw.days + ' hari lagi). <span class="rw2">Setelah itu saldo akan minus <b class="pv">' + rp(rw.deficit) + '</b>.</span></div>';
  }
  if (rw.status === 'ok') {
    return '<div class="runway-box runway-safe">&#10003; Tidak ada tagihan besar dalam 30 hari ke depan.</div>';
  }
  return '<div class="runway-box runway-safe">&#10003; Kas cukup untuk semua tagihan sampai akhir tahun.</div>';
}

/** Kartu "Kondisi kas": saldo realtime (angka besar) + grafik arus saldo + 4 tile. */
function kondisiCard(c, R) {
  var P = kasLinked(),
    C = yearCash(),
    n = R.length || 1,
    jatah = c.end > 0 ? c.end / n : null,
    hv,
    mn;
  R.forEach(function (r) {
    if (!hv || C.byMonth[r.m] > C.byMonth[hv.m]) hv = r;
    if (!mn || C.byMonth[r.m] < C.byMonth[mn.m]) mn = r;
  });
  hv = hv || { m: 0 };
  mn = mn || { m: 0 };
  var head =
    '<div class="cond-head dflex jcsb aic fwrap g12"><div class="cond-title"><h2 class="m0" id="rk-cond-h">Kondisi kas</h2>' +
    '<div class="sub" id="cond-lbl">' +
    (P ? 'Saldo Realtime &middot; ' + esc(P.name) + ' &middot; Arus saldo' : 'Belum ada data kas') +
    '</div></div>' +
    '<div class="cat-tabs cond-tabs" role="tablist">' + periodTabs('flowp', flowPeriod) + '</div></div>';
  var big = '';
  if (P) {
    var KB = kasBal(P);
    big =
      '<div class="cond-num dflex aic fwrap g12 mt8"><b class="cond-big hm-big pv' +
      (KB.bal < 0 ? ' neg' : '') +
      '">' +
      rp(KB.bal) +
      '</b><span class="cond-chip-row"><b class="cond-chip" id="cond-chip" hidden></b>' +
      '<span class="sub" id="cond-range"></span></span></div>';
  }
  var fc = flowChart(R);
  var tiles =
    '<div class="cond-tiles hm-stats">' +
    '<div class="cond-tile hm-bal one"><span>Sisa saldo akhir ' + MON[11] + ' ' + S.year + '</span><b class="pv' + (c.end < 0 ? ' neg' : '') + '">' + rp(c.end) + '</b></div>' +
    '<div class="cond-tile jatah"><span>Jatah jajan per bulan</span>' +
    (jatah != null
      ? '<b class="big pv">' + rp(jatah) + '</b><i class="sub">sisa <span class="pv">Rp ' + rpS(c.end) + '</span> / ' + n + ' bulan</i>'
      : '<b class="big neg">Tidak tersedia</b><i class="sub">sisa saldo akhir tidak cukup</i>') +
    '</div>' +
    '<div class="cond-tile"><span>Rata-rata per bulan</span><b class="pv">' + rp(C.out / n) + '</b>' +
    '<i class="sub"><span class="sub-hi">Terberat ' + MON[hv.m] + ' <span class="pv">' + rp(C.byMonth[hv.m]) + '</span></span> <span class="sub-lo">&middot; Teringan ' + MON[mn.m] + ' <span class="pv">' + rp(C.byMonth[mn.m]) + '</span></span></i></div>' +
    '<div class="cond-tile"><span>Transaksi kas</span><b>' + (P ? kasBal(P).A.n : 0) + '</b><i class="sub">catatan kas</i></div>' +
    '</div>';
  return (
    '<section class="card cond hm hero lc-card" aria-labelledby="rk-cond-h">' +
    head +
    big +
    (fc ? '<div class="cond-flow rk-flow">' + fc + '</div>' : '') +
    tiles +
    '</section>'
  );
}

/** Subjudul kartu Kondisi kas: label saldo realtime + bulan saldo (logika smEff yang sudah ada). */
function kondisiMeta() {
  var P = kasLinked(),
    lbl = $('cond-lbl');
  if (!P || !lbl) return;
  var y = S.year,
    sm = smEff(),
    rw = kasRunway(P, kasBal(P).bal),
    bnd = null;
  for (var k in kasChipBnd) {
    if (k.indexOf('rincian:' + y) === 0) { bnd = kasChipBnd[k]; break; }
  }
  var dd = function (d) {
    var z = new Date(d + 'T00:00:00Z');
    return z.getUTCDate() + ' ' + MON[z.getUTCMonth()];
  };
  var rangeTxt = bnd ? ' &middot; Arus saldo ' + dd(bnd.from) + ' – ' + dd(bnd.to) : '';
  var utamaBadge = P && P.name === 'Utama' ? ' <span class="chip on" style="margin:0 0 0 6px;font-size:12px;font-weight:700">Utama</span>' : (P ? ' &middot; ' + esc(P.name) : '');
  lbl.innerHTML =
    'Saldo Realtime &middot; ' + (typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm]) + utamaBadge + rangeTxt + simTag(y) +
    '';
}

/** Saldo Realtime profil tergabung (dipakai kartu saldo dan agenda): saldo awal + masuk - keluar sampai bulan saldo. */
function kasBal(P) {
  var sm = smEff(),
    asc = kasRows(P).filter(function (x) {
      return +x.d.slice(5, 7) - 1 <= sm;
    }),
    A = kasSum(asc);
  return { sm: sm, mName: typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm], A: A, bal: kasBase(P) + A.i - A.o };
}

/** Satu kartu saldo di Rincian Bulanan: saldo realtime, sisa akhir tahun, dan jatah jajan di kartu statistik. */
function saldoHero(c, R) {
  var P = kasLinked(),
    C = yearCash();
  if (!P) return heroHtml(c, R, null, null, C);
  var KB = kasBal(P),
    mName = KB.mName,
    A = KB.A,
    bal = KB.bal,
    chip = '<span class="chip on" style="margin:0;font-size:12px;font-weight:700">' + esc(P.name) + '</span>';
  return heroHtml(
    c,
    R,
    function () {
      var st = kasStatusHtml(P, bal);
      if (st.indexOf('runway-safe') >= 0) st = '';
      return (
        '<div class="card hm m0">' +
        '<div class="dflex jcsb aic g8">' +
        '<div class="sub fw6">Saldo Realtime &middot; ' + mName + '</div>' +
        chip +
        '</div>' +
        '<div class="hm-big pv' +
        (bal < 0 ? ' neg' : '') +
        '">' +
        rp(bal) +
        '</div>' +
        '<div class="hm-bal one"><div><span>Sisa saldo akhir Des ' +
        S.year +
        '</span><b class="pv' +
        (c.end < 0 ? ' neg' : '') +
        '">' +
        rp(c.end) +
        '</b></div></div>' +
        '<div class="hm-alert">' + st + '</div>'
      );
    },
    A.n,
    C,
    kasRunway(P, bal)
  );
}

/** Kartu ajakan saat tahun ini belum punya item. */
function emptyItemsHtml() {
  return (
    '<div class="card"><h2>Mulai dari item pertama</h2><div class="empty">Belum ada item untuk tahun ' + S.year +
    '. Item adalah tagihan atau pengeluaran berulang, mis. listrik, langganan, cicilan, atau DCA.</div>' +
    '<div class="row2 mt8"><button type="button" class="p" data-goto="item">Tambah item</button></div></div>'
  );
}

var currentBillsRowCount = 6;

/** Kartu "Jadwal tagihan": tagihan belum lunas 3 bulan ke depan; bila ketiganya sudah lunas,
 *  jendela bergeser 3 bulan lagi (rolling) sampai ada tagihan tersisa. Tautan implisit ke tab Jadwal. */
function billsCard() {
  var t = todayISO(),
    y0 = +t.slice(0, 4),
    m0 = +t.slice(5, 7) - 1,
    now = Date.UTC(y0, m0, +t.slice(8, 10)),
    R = null,
    s = 0,
    win = 0;
  for (; s < 4; s++) {
    var end = Date.UTC(y0, m0 + 3 * (s + 1), 1) - 864e5,
      h = Math.round((end - now) / 864e5);
    R = reminders(h);
    if (R.soon.length) { win = s; break; }
  }
  var list = R.late.concat(R.soon),
    sum = list.reduce(function (x, r) {
      return x + r.price;
    }, 0),
    iA = m0 + 3 * win,
    iB = iA + 2,
    span = MON[iA % 12] + ' ' + (y0 + Math.floor(iA / 12)) + ' – ' + MON[iB % 12] + ' ' + (y0 + Math.floor(iB / 12)),
    flow = kasFlow(),
    firstNeg = kasFirstNegative(),
    dateBalances = {};
  if (flow) {
    var running = flow.base + flow.pre;
    flow.allDates.forEach(function (d) {
      running += flow.byDate[d].delta;
      dateBalances[d] = running;
    });
  }
  var N = (typeof window !== 'undefined' && window.innerWidth >= 1280) ? 8 : 6;
  currentBillsRowCount = N;
  var shown = list.slice(0, N);
  var body = shown
    .map(function (r) {
      var iso = isoD(r.t),
        isLate = iso < t,
        cd = fmtCountdown(iso, t, isLate),
        cls = '',
        title = '',
        bd = dayBadge(iso),
        diffDays = Math.round((Date.UTC(+iso.slice(0,4), +iso.slice(5,7)-1, +iso.slice(8,10)) - Date.UTC(+t.slice(0,4), +t.slice(5,7)-1, +t.slice(8,10))) / 864e5),
        tone = isLate ? ' bl-late' : (diffDays === 0 || diffDays === 1) ? ' bl-now bl-urgent' : diffDays <= 3 ? ' bl-urgent' : diffDays <= 7 ? ' bl-soon' : '',
        blTooltip = isLate ? ' title="' + esc('Terlambat ' + Math.abs(diffDays) + ' hari') + '"' : diffDays === 0 ? ' title="Jatuh tempo hari ini"' : diffDays <= 7 ? ' title="' + esc('Jatuh tempo dalam ' + diffDays + ' hari') + '"' : '';
      var isMinusFirst = !!(firstNeg && iso === firstNeg.date);
      if (isMinusFirst) cls = ' minus-first';
      else if (firstNeg && iso > firstNeg.date) cls = ' minus-after';
      if (dateBalances[iso] != null) title = ' title="Saldo proyeksi setelah ini: ' + rp(dateBalances[iso]) + '"';
      return (
        '<div class="it2 kit bl' + cls + '"' + title + '>' +
        '<span class="bl-badge' + tone + '"' + blTooltip + '><b>' + bd.d + '</b><span>' +
        (isLate ? 'Lewat' : bd.wd) +
        '</span></span>' +
        '<div class="bl-main"><b class="fw6">' +
        esc(r.it.name) +
        '</b><span class="sub">' +
        (r.it.cat ? esc(r.it.cat) + ' \u00b7 ' : '') +
        fd(r.t, { day: 'numeric', month: 'short' }) +
        (cd ? ' \u00b7 ' + cd : '') +
        (isMinusFirst ? ' \u00b7 <span class="bl-tag-minus">Saldo habis</span>' : '') +
        '</span></div><div class="am"><b class="pv">' +
        rp(r.price) +
        '</b></div></div>'
      );
    })
    .join('');
  var total = shown.reduce(function (x, r) {
    return x + r.price;
  }, 0);
  var summary = shown.length
    ? '<div class="bl-foot"><span>Total tagihan di atas</span><b class="pv">' + rp(total) + '</b></div>'
    : '';
  return (
    '<div class="card"><div class="dflex jcsb aic fwrap g8"><h2 class="m0">Jadwal tagihan</h2>' +
    '<button type="button" class="lk" data-goto="jadwal">Semua tagihan' +
    LK_ARROW +
    '</button></div><div class="sub mb8">' + shown.length + ' tagihan ke depan</div><div class="bl-wrap">' +
    (body ? '<div class="bl-list">' + body + '</div>' : '<div class="empty">Belum ada tagihan terjadwal.</div>') +
    summary +
    '</div></div>'
  );
}

/** Render-ulang hanya kartu Jadwal tagihan. */
function rerenderBills() {
  var el = document.querySelector('.rk-bills');
  if (!el) { renderRincian(); return; }
  el.innerHTML = billsCard();
}

/** Panah kecil untuk tautan implisit. */
var LK_ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

var txMaxRows = 8;

/** Kartu "Transaksi terakhir": 7 hari terakhir dari Riwayat transaksi, dengan pintasan ke tab Transaksi. */
function recentTxCard() {
  var P = kasLinked();
  if (!P) return '';
  var all = txDir === 'all',
    inn = txDir === '+',
    today = todayISO(),
    cut = addDaysISO(today, -6),
    allRows = kasRows(P).sort(function (a, b) {
      return a.d < b.d ? 1 : a.d > b.d ? -1 : 0;
    }),
    inWindowAll = allRows.filter(function (x) {
      return x.d >= cut && x.d <= today;
    }),
    fallback = !inWindowAll.length,
    pool = fallback ? allRows : inWindowAll,
    filteredRows = pool.filter(function (x) {
      return all || x.t === txDir;
    }),
    limit = Math.max(6, Math.min(10, txMaxRows || 8));

  var allGroups = [],
    gmap = {};
  filteredRows.forEach(function (x) {
    if (!gmap[x.d]) {
      gmap[x.d] = { d: x.d, rows: [] };
      allGroups.push(gmap[x.d]);
    }
    gmap[x.d].rows.push(x);
  });

  var renderedGroups = [],
    renderedRowCount = 0;
  for (var gi = 0; gi < allGroups.length; gi++) {
    var grp = allGroups[gi];
    if (renderedGroups.length === 0) {
      renderedGroups.push(grp);
      renderedRowCount += grp.rows.length;
    } else if (renderedRowCount + grp.rows.length <= limit) {
      renderedGroups.push(grp);
      renderedRowCount += grp.rows.length;
    } else {
      break;
    }
  }
  var remCount = filteredRows.length - renderedRowCount;

  var body = renderedGroups
    .map(function (g) {
      var outSum = 0,
        inSum = 0;
      g.rows.forEach(function (x) {
        if (x.t === '-') outSum += (x.amt || 0);
        else if (x.t === '+') inSum += (x.amt || 0);
      });
      var net = inSum - outSum;

      var pillHtml = '';
      if (all) {
        var netB = '<b class="tx-net pv' + (net < 0 ? ' neg' : net > 0 ? ' kin' : '') + '" style="display:none" aria-hidden="true">' + signed(net) + '</b>';
        if (outSum > 0 && inSum > 0) {
          pillHtml = netB + '<span class="tx-pills"><b class="tx-pill pv neg">' + signed(-outSum) + '</b><b class="tx-pill pv kin">' + signed(inSum) + '</b></span>';
        } else if (outSum > 0) {
          pillHtml = '<span class="tx-pills"><b class="tx-pill pv neg">' + signed(-outSum) + '</b></span>';
        } else if (inSum > 0) {
          pillHtml = '<span class="tx-pills"><b class="tx-pill pv kin">' + signed(inSum) + '</b></span>';
        } else {
          pillHtml = '<span class="tx-pills"><b class="tx-pill pv">Rp 0</b></span>';
        }
      } else if (inn) {
        pillHtml = '<span class="tx-pills"><b class="tx-pill pv kin">' + signed(inSum) + '</b></span>';
      } else {
        pillHtml = '<span class="tx-pills"><b class="tx-pill pv neg">' + signed(-outSum) + '</b></span>';
      }

      return (
        '<li class="tx-day"><div class="tx-dh"><span>' +
        esc(dayGroupLabel(g.d, today)) +
        '</span>' +
        pillHtml +
        '</div><ul class="tx-list">' +
        g.rows
          .map(function (x) {
            var cat = x.cat || 'Tanpa kategori',
              col = catColor(x.cat || ''),
              ini = txInitials(x.note, cat);
            return (
              '<li class="it2 kit tx-row"><span class="tx-av" aria-hidden="true" style="color:' +
              col +
              ';background:color-mix(in srgb, ' +
              col +
              ' 14%, transparent)">' +
              esc(ini) +
              '</span><div class="tx-main"><b class="tx-note" title="' +
              esc(x.note || cat) +
              '">' +
              esc(x.note || cat) +
              '</b><span class="sub tx-cat"><i class="tx-dot" aria-hidden="true" style="background:' +
              col +
              '"></i>' +
              esc(cat) +
              '</span></div><b class="pv tx-amt ' +
              (x.t === '-' ? 'neg' : 'kin') +
              '">' +
              (x.t === '-' ? '\u2212' : '+') +
              rp(x.amt) +
              '</b></li>'
            );
          })
          .join('') +
        '</ul></li>'
      );
    })
    .join('');

  var footHtml = '<div class="tx-foot sub">' +
    (remCount > 0
      ? '+' + remCount + ' transaksi lagi di ' + (fallback ? 'catatan ini' : '7 hari ini') + ' \u00b7 <button type="button" class="lk" data-hist="1">Lihat semua</button>'
      : '<button type="button" class="lk" data-hist="1">Lihat semua transaksi' + LK_ARROW + '</button>') +
    '</div>';

  var styleAttr = (_txLockedH && typeof window !== 'undefined' && window.innerWidth >= 1280) ? ' style="min-height:' + _txLockedH + 'px"' : '';

  return (
    '<div class="card tx-card"' + styleAttr + '><div class="dflex jcsb aic g8"><h2 class="m0">Transaksi terakhir</h2>' +
    '<div class="cat-tabs cat-dirs" role="tablist">' +
    '<button type="button" class="cat-tab' +
    (txDir === '-' ? ' on' : '') +
    '" data-txd="-" aria-pressed="' +
    (txDir === '-' ? 'true' : 'false') +
    '">Keluar</button>' +
    '<button type="button" class="cat-tab' +
    (inn ? ' on' : '') +
    '" data-txd="+" aria-pressed="' +
    (inn ? 'true' : 'false') +
    '">Masuk</button>' +
    '<button type="button" class="cat-tab' +
    (all ? ' on' : '') +
    '" data-txd="all" aria-pressed="' +
    (all ? 'true' : 'false') +
    '">Semua</button></div></div>' +
    '<div class="dflex jcsb aic g8 mt6"><span class="sub">' +
    (all ? 'Masuk &amp; keluar' : inn ? 'Uang masuk' : 'Uang keluar') +
    (fallback ? ' 7 catatan terakhir' : ' 7 hari terakhir') +
    '</span></div><div class="tx-wrap mt8">' +
    (body ? '<ul class="tx-days">' + body + '</ul>' : '<div class="empty">Belum ada transaksi ' + (all ? '' : inn ? 'masuk ' : 'keluar ') + (fallback ? 'terbaru.' : 'dalam 7 hari terakhir.') + '</div>') +
    '</div>' +
    footHtml +
    '</div>'
  );
}

/** Sinkronisasi penguncian tinggi kartu Transaksi terakhir untuk mencegah lonjakan antar filter. */
var _txLockedH = 0;
function syncTxLockedHeight() {
  if (typeof window === 'undefined' || window.innerWidth < 1280) {
    _txLockedH = 0;
    return;
  }
  var el = document.querySelector('.rk-tx');
  if (!el) return;
  var parentW = el.getBoundingClientRect().width;
  if (!parentW) return;

  var rkWrap = document.createElement('div');
  rkWrap.className = 'rk';
  rkWrap.style.visibility = 'hidden';
  rkWrap.style.position = 'absolute';
  rkWrap.style.top = '-9999px';
  rkWrap.style.left = '0';

  var dummy = document.createElement('div');
  dummy.className = 'rk-tx s4';
  dummy.style.width = parentW + 'px';
  rkWrap.appendChild(dummy);

  var savedDir = txDir;
  var maxH = 0;
  ['all', '-', '+'].forEach(function (d) {
    txDir = d;
    _txLockedH = 0;
    dummy.innerHTML = recentTxCard();
    document.body.appendChild(rkWrap);
    var card = dummy.querySelector('.tx-card');
    var h = card ? card.getBoundingClientRect().height : 0;
    if (h > maxH) maxH = h;
    document.body.removeChild(rkWrap);
  });
  txDir = savedDir;
  _txLockedH = maxH;
}

/** Kartu gabungan "Ke mana uangnya pergi" (Baris 2, 8 kolom): berisi dua sub-panel sejajar. */
function whereMoneyCard(C) {
  return (
    '<section class="card rk-where-card" aria-labelledby="rk-where-h">' +
    '<div class="where-head dflex aic">' +
    '<div class="where-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20V10M12 20V4M18 20v-7"/></svg></div>' +
    '<div class="where-title"><h2 class="m0" id="rk-where-h">Ke mana uangnya pergi</h2>' +
    '<p class="sub m0" id="where-lbl">Distribusi kategori dan pengeluaran terbesar</p></div></div>' +
    '<div class="where-grid where-panels">' +
    '<div class="where-panel where-left rk-cat">' + insightCard(C) + '</div>' +
    '<div class="where-panel where-right rk-top">' + topExpensesCard(C) + '</div>' +
    '</div>' +
    '</section>'
  );
}

/** Render tab Rincian Bulanan. */
function renderRincian() {
  chartReset();
  var c = calc(),
    y = S.year,
    R = c.rows,
    C = yearCash();
  // Jendela 3 bulan ke depan; bila ketiganya sudah lunas, bergeser 3 bulan lagi (rolling).
  var t = todayISO(),
    a = y === +t.slice(0, 4) ? +t.slice(5, 7) - 1 : 0,
    un = function (m) {
      var n = 0;
      S.items.forEach(function (it) {
        occ(it, y).forEach(function (x) {
          var d = isoD(x);
          if (+d.slice(5, 7) - 1 === m && !S.paid[it.id + '|' + d] && !S.skip[it.id + '|' + d]) n++;
        });
      });
      return n;
    };
  for (var k = 0; k < 4 && !(un(a) || un(a + 1) || un(a + 2)); k++) a += 3;
  a = Math.max(smEff(), Math.min(a, 9));
  var off = a - smEff(),
    W = R.slice(off, off + 3),
    wT = W.reduce(function (x, r) {
      return x + r.sp;
    }, 0),
    wE = W.length ? W[W.length - 1].ak : 0;
  var rows = W.map(function (r) {
    return (
      '<tr class="row" data-m="' +
      r.m +
      '"><td class="c-m"><b>' +
      MON[r.m] +
      ' ' +
      y +
      '</b></td>' +
      '<td class="c-a" data-l="Saldo awal">' +
      rp(r.aw) +
      (r.ad ? '<div class="sub">' + signed(r.ad) + ' penyesuaian</div>' : '') +
      '</td>' +
      '<td class="c-s" data-l="Pengeluaran">' +
      rp(r.sp) +
      '</td>' +
      '<td class="c-e ' +
      (r.ak < 0 ? 'neg' : '') +
      '" data-l="Saldo akhir">' +
      rp(r.ak) +
      '</td>' +
      '<td class="l c-c"><div class="c-chips">' +
      monthChips(r) +
      '</div></td></tr>' +
      (openRows[r.m] ? detailRows(r) : '')
    );
  }).join('');
  var table =
    '<div class="card"><div class="dflex jcsb aic fwrap g8"><h2 class="m0">Rincian arus tagihan ' +
    y +
    '</h2><button type="button" class="lk" data-goto="jadwal">Semua tagihan' +
    LK_ARROW +
    '</button></div><div class="sub mb8">' +
    (W.length
      ? W.length + ' bulan ke depan · ' + MON[W[0].m] + ' – ' + MON[W[W.length - 1].m] + ' ' + y
      : '') +
    '</div>' +
    '<div class="sub mb8">Saldo awal = saldo setelah kas bulan itu.</div>' +
    gdBox(
      'rincian',
      '<div class="sub mb8">Klik baris bulan untuk melihat tanggal dan rincian tiap pembayaran.</div>' + RINCIAN_LEGEND
    ) +
    '<div class="tw"><table><thead><tr><th>Bulan</th><th>Saldo awal</th><th>Pengeluaran</th><th>Saldo akhir</th><th class="l">Item berkala</th></tr></thead><tbody>' +
    rows +
    '<tr class="tot"><td>Total</td><td></td><td data-l="Pengeluaran">' +
    rp(wT) +
    '</td><td data-l="Saldo akhir">' +
    rp(wE) +
    '</td><td></td></tr></tbody></table></div></div>';
  var tx = recentTxCard();
  // Tata letak (grid 12 kolom, diatur CSS .rk): baris 1 kondisi kas + jadwal tagihan,
  // baris 2 pemasukan/pengeluaran + ke mana uangnya pergi (2 panel), baris 3 rincian + transaksi.
  $('v-rincian').innerHTML =
    '<div class="rk-head" id="rk-head"></div>' +
    (S.items.length ? '' : emptyItemsHtml()) +
    '<div class="rk">' +
    '<div class="rk-kas s8">' + kondisiCard(c, R) + '</div>' +
    '<div class="rk-bills s4">' + billsCard() + '</div>' +
    '<div class="rk-mf s4">' + monthFlowCard(C) + '</div>' +
    '<div class="rk-where s8">' + whereMoneyCard(C) + '</div>' +
    '<div class="rk-detail s8">' + table + '</div>' +
    '<div class="rk-tx s4">' + (tx || '') + '</div>' +
    '</div>';
  renderShell(c, R);
  kondisiMeta();
  chartMount($('v-rincian'));
  gdApply($('v-rincian'));
  syncTxLockedHeight();
  if (_txLockedH) {
    var txCardEl = document.querySelector('.rk-tx .tx-card');
    if (txCardEl) txCardEl.style.minHeight = _txLockedH + 'px';
  }
}

/** Render-ulang hanya kartu Kondisi kas tanpa menyentuh kartu lain. */
function rerenderKas() {
  var el = document.querySelector('.rk-kas');
  if (!el) { renderRincian(); return; }
  var c = calc(), R = c.rows;
  el.innerHTML = kondisiCard(c, R);
  kondisiMeta();
  chartMount(el);
}

/** Render-ulang hanya kartu Pemasukan vs Pengeluaran. */
function rerenderMf() {
  var el = document.querySelector('.rk-mf');
  if (!el) { renderRincian(); return; }
  el.innerHTML = monthFlowCard(yearCash());
  chartMount(el);
}

/** Render-ulang hanya kartu Pengeluaran per kategori. */
function rerenderCat() {
  var el = document.querySelector('.rk-cat');
  if (!el) { renderRincian(); return; }
  el.innerHTML = insightCard(yearCash());
  var whereSub = document.getElementById('where-lbl');
  if (whereSub) {
    whereSub.textContent = 'Distribusi kategori dan pengeluaran terbesar';
  }
  chartMount(el);
}

/** Render-ulang hanya kartu Item pengeluaran terbesar (tanpa animasi bar). */
function rerenderTop() {
  var el = document.querySelector('.rk-top');
  if (!el) { renderRincian(); return; }
  el.innerHTML = topExpensesCard(yearCash(), true);
}

/** Render-ulang hanya kartu Transaksi terakhir. */
function rerenderTx() {
  var el = document.querySelector('.rk-tx');
  if (!el) { renderRincian(); return; }
  if (!_txLockedH && typeof window !== 'undefined' && window.innerWidth >= 1280) {
    syncTxLockedHeight();
  }
  el.innerHTML = recentTxCard() || '';
  if (_txLockedH && typeof window !== 'undefined' && window.innerWidth >= 1280) {
    var card = el.querySelector('.tx-card');
    if (card) {
      card.style.minHeight = _txLockedH + 'px';
    }
  }
}

/** Render-ulang hanya kartu Rincian arus tagihan (tabel baris + gdApply). */
function rerenderDetail() {
  var el = document.querySelector('.rk-detail');
  if (!el) { renderRincian(); return; }
  var c = calc(), y = S.year, R = c.rows;
  var t = todayISO(),
    a = y === +t.slice(0, 4) ? +t.slice(5, 7) - 1 : 0,
    un = function (m) {
      var n = 0;
      S.items.forEach(function (it) {
        occ(it, y).forEach(function (x) {
          var d = isoD(x);
          if (+d.slice(5, 7) - 1 === m && !S.paid[it.id + '|' + d] && !S.skip[it.id + '|' + d]) n++;
        });
      });
      return n;
    };
  for (var k = 0; k < 4 && !(un(a) || un(a + 1) || un(a + 2)); k++) a += 3;
  a = Math.max(smEff(), Math.min(a, 9));
  var off = a - smEff(),
    W = R.slice(off, off + 3),
    wT = W.reduce(function (x, r) { return x + r.sp; }, 0),
    wE = W.length ? W[W.length - 1].ak : 0;
  var rows = W.map(function (r) {
    return (
      '<tr class="row" data-m="' + r.m + '"><td class="c-m"><b>' + MON[r.m] + ' ' + y + '</b></td>' +
      '<td class="c-a" data-l="Saldo awal">' + rp(r.aw) + (r.ad ? '<div class="sub">' + signed(r.ad) + ' penyesuaian</div>' : '') + '</td>' +
      '<td class="c-s" data-l="Pengeluaran">' + rp(r.sp) + '</td>' +
      '<td class="c-e ' + (r.ak < 0 ? 'neg' : '') + '" data-l="Saldo akhir">' + rp(r.ak) + '</td>' +
      '<td class="l c-c"><div class="c-chips">' + monthChips(r) + '</div></td></tr>' +
      (openRows[r.m] ? detailRows(r) : '')
    );
  }).join('');
  var table =
    '<div class="card"><div class="dflex jcsb aic fwrap g8"><h2 class="m0">Rincian arus tagihan ' + y +
    '</h2><button type="button" class="lk" data-goto="jadwal">Semua tagihan' + LK_ARROW + '</button></div>' +
    '<div class="sub mb8">' + (W.length ? W.length + ' bulan ke depan · ' + MON[W[0].m] + ' – ' + MON[W[W.length - 1].m] + ' ' + y : '') + '</div>' +
    '<div class="sub mb8">Saldo awal = saldo setelah kas bulan itu.</div>' +
    gdBox('rincian', '<div class="sub mb8">Klik baris bulan untuk melihat tanggal dan rincian tiap pembayaran.</div>' + RINCIAN_LEGEND) +
    '<div class="tw"><table><thead><tr><th>Bulan</th><th>Saldo awal</th><th>Pengeluaran</th><th>Saldo akhir</th><th class="l">Item berkala</th></tr></thead><tbody>' +
    rows +
    '<tr class="tot"><td>Total</td><td></td><td data-l="Pengeluaran">' + rp(wT) + '</td><td data-l="Saldo akhir">' + rp(wE) + '</td><td></td></tr></tbody></table></div></div>';
  el.innerHTML = table;
  gdApply(el);
}

/** Baris "dilewati" pada rincian sebuah bulan. */
function skRows(r) {
  return (r.sk || [])
    .slice()
    .sort(function (a, b) {
      return a.t - b.t;
    })
    .map(function (e, i) {
      return (
        '<tr class="det skp" style="--i:' +
        (i + 40) +
        '"><td><span class="st skp" role="img" aria-label="Dilewati">–</span>' +
        fd(e.t, { day: 'numeric', month: 'short' }) +
        '</td><td class="l" colspan="2"><s>' +
        esc(e.it.name) +
        '</s></td><td colspan="2" class="l"><span class="sub">dilewati (tidak dibayar)</span></td></tr>'
      );
    })
    .join('');
}

/** Pasang event listener halaman ini. */
function bindRincian() {
  $('v-rincian').onchange = function (e) {
    if (e.target.matches('[data-expmonth]')) {
      expenseLastMonth = e.target.value;
      expenseMonth = 'm';
      rerenderTop();
      var sel = $('v-rincian').querySelector('[data-expmonth]');
      if (sel) sel.focus();
      return;
    }
  };
  $('v-rincian').onclick = function (e) {
    var expm = e.target.closest('[data-expm]');
    if (expm) {
      expenseMonth = expm.dataset.expm;
      if (expenseMonth === 'm' && !expenseLastMonth) expenseMonth = 'y';
      rerenderTop();
      var active = $('v-rincian').querySelector('[data-expm="' + expenseMonth + '"]');
      if (active) active.focus();
      return;
    }
    var cp = e.target.closest('[data-catp]');
    if (cp) {
      catPeriod = cp.dataset.catp;
      rerenderCat();
      return;
    }
    var bsb = e.target.closest('[data-bsp]');
    if (bsb) {
      bsPeriod = bsb.dataset.bsp;
      rerenderMf();
      return;
    }
    var fpb = e.target.closest('[data-flowp]');
    if (fpb) {
      flowPeriod = fpb.dataset.flowp;
      rerenderKas();
      return;
    }
    var cd = e.target.closest('[data-catd]');
    if (cd) {
      catDir = cd.dataset.catd;
      rerenderCat();
      return;
    }
    var td = e.target.closest('[data-txd]');
    if (td) {
      txDir = td.dataset.txd;
      rerenderTx();
      return;
    }
    var hs = e.target.closest('[data-hist]');
    if (hs) {
      tab('kas');
      var hc = document.getElementById('kas-hist');
      if (hc) setTimeout(function () { hc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
      return;
    }
    var r = e.target.closest('tr.row');
    if (r) {
      openRows[r.dataset.m] = !openRows[r.dataset.m];
      rerenderDetail();
    }
  };
  $('v-rincian').addEventListener('mouseover', function (e) {
    var bar = $('v-rincian').querySelector('#where-cat-bar');
    var cats = $('v-rincian').querySelector('#where-cats-list');
    if (!bar || !cats) return;
    var target = e.target.closest('#where-cat-bar i, #where-cats-list li[data-k]');
    if (target && target.dataset.k) {
      var k = target.dataset.k;
      bar.querySelectorAll('i').forEach(function (el) { el.classList.toggle('dim', el.dataset.k !== k); });
      cats.querySelectorAll('li[data-k]').forEach(function (el) { el.classList.toggle('dim', el.dataset.k !== k); });
    }
  });
  $('v-rincian').addEventListener('mouseout', function (e) {
    var bar = $('v-rincian').querySelector('#where-cat-bar');
    var cats = $('v-rincian').querySelector('#where-cats-list');
    if (!bar || !cats) return;
    var target = e.target.closest('#where-cat-bar i, #where-cats-list li[data-k]');
    if (target) {
      bar.querySelectorAll('i').forEach(function (el) { el.classList.remove('dim'); });
      cats.querySelectorAll('li[data-k]').forEach(function (el) { el.classList.remove('dim'); });
    }
  });
  window.addEventListener('resize', function () {
    _txLockedH = 0;
    syncTxLockedHeight();
    var txCardEl = document.querySelector('.rk-tx .tx-card');
    if (txCardEl && _txLockedH) txCardEl.style.minHeight = _txLockedH + 'px';
  });
}
