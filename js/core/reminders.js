/**
 * Pengingat tagihan (murni): tagihan terlambat dan yang jatuh tempo dalam beberapa hari ke depan,
 * dihitung dari SEMUA tahun yang tersimpan. Tagihan yang sudah lunas/dilewati tidak muncul.
 */

/** Tagihan lewat tanggal lebih lama dari ini tidak ditampilkan satu per satu (hanya dihitung). */
var LATE_DAYS = 45;

/** Tanggal lokal hari ini 'YYYY-MM-DD'. `window.__today` boleh diisi untuk keperluan tes. */
function todayISO() {
  if (typeof window !== 'undefined' && window.__today) return window.__today;
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** Apakah tanggal ISO `d` termasuk "terlambat" (sudah lewat, masih dalam jendela LATE_DAYS). */
function isLateISO(d, today) {
  today = today || todayISO();
  return d < today && d >= addDaysISO(today, -LATE_DAYS);
}

/**
 * @param {number} horizon jumlah hari ke depan yang dianggap "akan datang"
 * @returns {{today, late:Array, soon:Array, older:number, olderSum:number}}
 *   baris: {year, it, t, iso, key, price}
 */
function reminders(horizon) {
  var today = todayISO(),
    soonEnd = addDaysISO(today, horizon),
    lateStart = addDaysISO(today, -LATE_DAYS);
  var res = { today: today, late: [], soon: [], older: 0, olderSum: 0 };
  Object.keys(ALL.data).forEach(function (yk) {
    var Y = ALL.data[yk],
      y = +yk,
      from = Date.UTC(y, +Y.startMonth || 0, 1);
    Y.items.forEach(function (it) {
      occ(it, y).forEach(function (t) {
        if (t < from) return;
        var d = isoD(t),
          key = it.id + '|' + d;
        if (Y.paid[key] || Y.skip[key]) return;
        var row = { year: y, it: it, t: t, iso: d, key: key, price: priceAt(it, t) };
        if (d < today) {
          if (d >= lateStart) res.late.push(row);
          else {
            res.older++;
            res.olderSum += row.price;
          }
        } else if (d <= soonEnd) res.soon.push(row);
      });
    });
  });
  var byDate = function (a, b) {
    return a.t - b.t;
  };
  res.late.sort(byDate);
  res.soon.sort(byDate);
  return res;
}

/** Ubah status satu tagihan di tahun `year`: 'paid' | 'skip' | 'none'. */
function setStatus(year, key, st) {
  var Y = ALL.data[year];
  delete Y.paid[key];
  delete Y.skip[key];
  if (st === 'paid') Y.paid[key] = 1;
  if (st === 'skip') Y.skip[key] = 1;
}

/** Tandai lunas semua tagihan yang sudah lewat tanggal (semua tahun). @returns jumlah yang diubah */
function markPastPaid() {
  var today = todayISO(),
    n = 0;
  Object.keys(ALL.data).forEach(function (yk) {
    var Y = ALL.data[yk],
      y = +yk,
      from = Date.UTC(y, +Y.startMonth || 0, 1);
    Y.items.forEach(function (it) {
      occ(it, y).forEach(function (t) {
        var d = isoD(t),
          key = it.id + '|' + d;
        if (t < from || d >= today || Y.paid[key] || Y.skip[key]) return;
        Y.paid[key] = 1;
        n++;
      });
    });
  });
  return n;
}
