/**
 * Perhitungan arus kas tahun aktif (S): pengeluaran per bulan, penyesuaian saldo
 * (tunggal & berulang), saldo akhir, dan total per kategori. Murni: hanya membaca S.
 */

/**
 * Bulan (0-11) pada tahun aktif tempat penyesuaian `a` berlaku.
 * `null` berarti "gabung ke saldo awal". Penyesuaian berulang menghasilkan beberapa bulan.
 */
function adjMonths(a) {
  if (!a.rep) return [a.m == null ? null : a.m];
  var out = [];
  for (var k = 0, m = a.m; m <= 11 && (!a.rep.cnt || k < a.rep.cnt); k++, m = a.m + k * a.rep.n) out.push(m);
  return out;
}

/**
 * @returns {{rows, occs, byCat, invest, investM, total, end, open, adjIn, adjLate}}
 *  rows[]: {m, aw (saldo awal bulan), ad (penyesuaian), sp (pengeluaran), ak (saldo akhir), ev, sk}
 *  occs: tanggal tagihan per item (termasuk yang dilewati) | byCat: pengeluaran per kategori
 *  open: saldo awal efektif | end: saldo akhir Desember
 */
function calc() {
  var y = +S.year,
    sm = +S.startMonth || 0,
    from = Date.UTC(y, sm, 1);
  var occs = {},
    byCat = {},
    events = [],
    skipped = [],
    spend = [],
    investM = [],
    invest = 0;
  for (var m = 0; m < 12; m++) {
    events.push([]);
    skipped.push([]);
    spend.push(0);
    investM.push(0);
  }
  S.items.forEach(function (it) {
    var list = occ(it, y).filter(function (t) {
      return t >= from;
    });
    occs[it.id] = list;
    list.forEach(function (t) {
      var mm = new Date(t).getUTCMonth();
      if (S.skip[it.id + '|' + isoD(t)]) {
        skipped[mm].push({ it: it, t: t });
        return;
      }
      var price = priceAt(it, t),
        cat = it.cat || '';
      events[mm].push({ it: it, t: t });
      spend[mm] += price;
      byCat[cat] = (byCat[cat] || 0) + price;
      if (isInvestCat(cat)) {
        invest += price;
        investM[mm] += price;
      }
    });
  });

  var adjIn = 0,
    adjLate = 0,
    adjM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  (S.adj || []).forEach(function (a) {
    var v = a.t === '-' ? -a.amt : a.amt;
    adjMonths(a).forEach(function (mm) {
      if (mm == null || mm <= sm) adjIn += v;
      else {
        adjLate += v;
        adjM[mm] += v;
      }
    });
  });

  var KL = kasLinked();
  if (KL)
    KL.tx.forEach(function (x) {
      if (+x.d.slice(0, 4) !== y) return;
      var mm = +x.d.slice(5, 7) - 1,
        v = x.t === '-' ? -x.amt : x.amt;
      if (mm <= sm) adjIn += v;
      else {
        adjLate += v;
        adjM[mm] += v;
      }
    });

  kasGoals().forEach(function (g) {
    goalMonthsIn(g, y).forEach(function (mm) {
      if (mm <= sm) adjIn -= g.per;
      else {
        adjLate -= g.per;
        adjM[mm] -= g.per;
      }
    });
  });

  var bal = (+S.saldo || 0) + adjIn,
    open = bal,
    rows = [];
  for (var k = sm; k < 12; k++) {
    var ad = adjM[k];
    rows.push({ m: k, aw: bal + ad, ad: ad, sp: spend[k], ak: bal + ad - spend[k], ev: events[k], sk: skipped[k] });
    bal += ad - spend[k];
  }
  return {
    rows: rows,
    occs: occs,
    byCat: byCat,
    invest: invest,
    investM: investM,
    total: spend.reduce(function (a, b) {
      return a + b;
    }, 0),
    end: bal,
    open: open,
    adjIn: adjIn,
    adjLate: adjLate,
  };
}

/** Pemasukan tercatat: baris '+' di Catatan Kas profil tergabung pada tahun aktif, mulai bulan saldo (untuk rasio investasi). */
function incomeYear() {
  var KL = kasLinked(),
    y = +S.year,
    sm = +S.startMonth || 0,
    sum = 0;
  if (KL)
    KL.tx.forEach(function (x) {
      if (x.t === '+' && +x.d.slice(0, 4) === y && +x.d.slice(5, 7) - 1 >= sm) sum += x.amt;
    });
  return sum;
}
