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
 * @returns {{rows, occs, byCat, total, end, open, adjIn, adjLate}}
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
    spend = [];
  for (var m = 0; m < 12; m++) {
    events.push([]);
    skipped.push([]);
    spend.push(0);
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
    total: spend.reduce(function (a, b) {
      return a + b;
    }, 0),
    end: bal,
    open: open,
    adjIn: adjIn,
    adjLate: adjLate,
  };
}
