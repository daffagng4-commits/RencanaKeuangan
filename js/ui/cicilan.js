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
    utang = L.filter(function (x) { return x.pokok > 0; }).length,
    akhir = L[L.length - 1].last,
    nx = L[0],
    ym = function (t) {
      return fd(t, { month: 'long', year: 'numeric' });
    };
  return (
    '<div class="card cicilan"><h2>Utang &amp; cicilan</h2>' +
    '<div class="sub">Sisa <b class="pv">' + rp(sisa) + '</b> dari ' + L.length + ' item yang belum lunas' + (utang ? ' (' + utang + ' utang, ' + (L.length - utang) + ' langganan berjangka)' : '') + '. Semua selesai paling lambat <b>' + ym(akhir) + '</b>.</div>' +
    '<div class="sub mt4">Berikutnya lunas: <b>' + esc(nx.it.name) + '</b> pada ' + ym(nx.last) + '. Setelah itu tagihan ini berhenti.</div>' +
    '<div class="sub mt4">Utang = item yang diisi <b>pokok pinjaman</b> di Kelola Item. Item tanpa pokok dihitung sebagai langganan berjangka.</div>' +
    L.map(function (x) {
      var pc = Math.round((x.paidN / x.n) * 100);
      return (
        '<div class="cc"><div class="cc-h"><b>' + esc(x.it.name) + '</b><span class="chp">' + (x.pokok > 0 ? 'utang' : 'berjangka') + '</span><span class="sub pv">' + rp(priceAt(x.it, x.next)) + ' / ' + perLabel(x.it) + '</span></div>' +
        '<div class="cc-bar" role="img" aria-label="' + pc + '% terbayar"><i style="width:' + pc + '%"></i></div>' +
        '<div class="sub"><b class="pv">Sisa ' + rp(x.remSum) + '</b> · ' + x.paidN + ' dari ' + x.n + ' sudah dibayar · lunas ' + ym(x.last) + (x.assumed ? ' · ' + x.assumed + ' cicilan lama dianggap lunas' : '') + '</div>' +
        (x.pokok > 0
          ? '<div class="sub pv">Pinjaman ' + rp(x.pokok) + ' · total bayar ' + rp(x.total) + (x.bunga ? ' · biaya tambahan <b>' + rp(x.bunga) + '</b> (' + Math.round((x.bunga / x.pokok) * 100) + '% dari pinjaman)' : '') + '</div>'
          : '') +
        '</div>'
      );
    }).join('') +
    '<div class="row2 mt8"><button type="button" data-goto="item">Atur pokok / batas bayar di Kelola Item</button></div>' +
    '</div>'
  );
}
