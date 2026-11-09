/** Kartu "Cicilan & utang" di Rincian Bulanan (logika di js/core/cicilan.js). Tersembunyi bila tidak ada cicilan yang masih berjalan. */

/** Label "per ..." untuk jadwal item. */
function perLabel(it) {
  var U = { hari: 'hari', minggu: 'minggu', bulan: 'bulan', tahun: 'tahun' };
  return it.n === 1 ? U[it.unit] : it.n + ' ' + U[it.unit];
}

function cicilanHtml() {
  var L = cicilanData().filter(function (x) {
    return x.remN > 0;
  });
  if (!L.length) return '';
  var sisa = L.reduce(function (a, x) {
      return a + x.remSum;
    }, 0),
    akhir = L[L.length - 1].last,
    nx = L[0],
    ym = function (t) {
      return fd(t, { month: 'long', year: 'numeric' });
    };
  return (
    '<div class="card cicilan"><h2>Cicilan &amp; utang</h2>' +
    '<div class="sub">Sisa kewajiban <b class="pv">' + rp(sisa) + '</b> &middot; ' + L.length + ' cicilan berjalan, semua selesai <b>' + ym(akhir) + '</b></div>' +
    '<div class="sub mt4""">Berikutnya selesai: <b>' + esc(nx.it.name) + '</b> (' + ym(nx.last) + ') &mdash; setelah itu pengeluaran turun <b class="pv">' + rp(priceAt(nx.it, nx.last)) + '</b> per ' + perLabel(nx.it) + '.</div>' +
    L.map(function (x) {
      var pc = Math.round((x.paidN / x.n) * 100);
      return (
        '<div class="cc"><div class="cc-h"><b>' + esc(x.it.name) + '</b><span class="sub pv">' + rp(priceAt(x.it, x.next)) + ' / ' + perLabel(x.it) + '</span><span class="chp">sisa ' + x.remN + ' dari ' + x.n + '</span></div>' +
        '<div class="cc-bar" role="img" aria-label="' + pc + '% terbayar"><i style="width:' + pc + '%"></i></div>' +
        '<div class="sub"><span class="pv">Sisa ' + rp(x.remSum) + '</span> &middot; lunas ' + ym(x.last) + (x.assumed ? ' &middot; ' + x.assumed + ' pembayaran sebelum pencatatan dianggap lunas' : '') + '</div>' +
        (x.pokok > 0
          ? '<div class="sub pv">Pokok ' + rp(x.pokok) + ' &middot; total bayar ' + rp(x.total) + (x.bunga ? ' &middot; bunga/biaya <b>' + rp(x.bunga) + '</b> (' + Math.round((x.bunga / x.pokok) * 100) + '% dari pokok)' : '') + '</div>'
          : '') +
        '</div>'
      );
    }).join('') +
    '</div>'
  );
}
