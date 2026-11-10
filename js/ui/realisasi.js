/**
 * Rencana vs realisasi (Rincian Bulanan) dan pencocokan transaksi Catatan Kas dengan tagihan (tab Kas).
 * Logika pencocokan ada di js/core/match.js.
 */

/** Chip "tagihan: X" di baris transaksi yang tertaut ke tagihan. */
function lkChip(x) {
  var k = linkedTxIds()[x.id],
    it = k && item(k.split('|')[0]);
  return it ? '<span class="chp on">melunasi: ' + esc(it.name) + ' (' + fmtD(k.split('|')[1]) + ')</span>' : '';
}

/** Toast + urungkan setelah transaksi baru otomatis dicocokkan dengan tagihan. */
function toastLinked(c) {
  toast('"' + c.it.name + '" otomatis ditandai lunas (cocok dengan transaksi ini).', function () {
    unlinkBill(c.key);
    save();
    renderAll();
  });
}


function realisasiHtml() {
  var D = realisasiData(),
    head = '<div class="card"><h2>Rencana vs realisasi ' + S.year + '</h2>';
  if (!D.nPaid)
    return (
      head +
      '<div class="empty">Belum ada tagihan yang dilunasi di tahun ini. Tandai lunas di Jadwal Bayar, atau catat pengeluaran di Catatan Kas agar otomatis dicocokkan dengan tagihan.</div>' +
      '<div class="row2 mt8"""><button type="button" data-goto="jadwal">Buka Jadwal Bayar</button><button type="button" data-goto="kas">Buka Catatan Kas</button></div></div>'
    );
  var diff = D.act - D.planPaid,
    cls = function (v) {
      return v < 0 ? ' in' : v > 0 ? ' neg' : '';
    },
    sgn = function (v) {
      return v === 0 ? rp(0) : (v > 0 ? '+' : '&minus;') + rp(Math.abs(v));
    },
    ms = D.months
      .map(function (m, i) {
        return { m: m, i: i };
      })
      .filter(function (x) {
        return x.m.nPaid > 0;
      }),
    top = D.rows
      .filter(function (r) {
        return r.linked && r.act !== r.plan;
      })
      .sort(function (a, b) {
        return Math.abs(b.act - b.plan) - Math.abs(a.act - a.plan);
      })
      .slice(0, 5);
  return (
    head +
    '<div class="sub pv">' + D.nPaid + ' tagihan lunas: rencana <b>' + rp(D.planPaid) + '</b>, realisasi <b>' + rp(D.act) + '</b> &middot; ' +
    (diff === 0 ? 'sesuai rencana' : diff < 0 ? 'lebih hemat ' + rp(-diff) : 'lebih besar ' + rp(diff)) + '</div>' +
    '<div class="sub">' + D.nReal + ' dari ' + D.nPaid + ' tertaut ke transaksi Catatan Kas; sisanya dianggap sesuai rencana.</div>' +
    '<div class="rv-m rv-h"><span>Bulan</span><span>Rencana</span><span>Realisasi</span><span>Selisih</span></div>' +
    ms
      .map(function (x) {
        var d = x.m.act - x.m.planPaid;
        return '<div class="rv-m"><span>' + MON[x.i] + '</span><span class="pv">' + rp(x.m.planPaid) + '</span><span class="pv">' + rp(x.m.act) + '</span><span class="pv' + cls(d) + '">' + sgn(d) + '</span></div>';
      })
      .join('') +
    (top.length
      ? '<h3 class="rv-t">Selisih terbesar</h3>' +
        top
          .map(function (r) {
            var d = r.act - r.plan;
            return '<div class="rv-row"><span>' + esc(r.it.name) + ' <span class="sub">' + fmtD(r.iso) + '</span></span><span class="pv sub">' + rp(r.plan) + ' &rarr; ' + rp(r.act) + '</span><b class="pv' + cls(d) + '">' + sgn(d) + '</b></div>';
          })
          .join('')
      : '') +
    (D.late.n && +S.year === +todayISO().slice(0, 4)
      ? '<div class="err mt10""">' + D.late.n + ' tagihan sudah lewat jatuh tempo dan belum lunas (' + rp(D.late.sum) + ').</div>'
      : '') +
    '</div>'
  );
}
