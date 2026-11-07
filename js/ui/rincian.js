/**
 * Tab Rincian Bulanan: ringkasan saldo, grafik per bulan, grafik per kategori, tabel arus kas.
 */

var openRows = {};
var CAT_COLORS = ['#3aa17e', '#5b8fd9', '#e08a5c', '#9c7fd0', '#d1b04a', '#8a99a3'];

/** "+ Rp 1.000" atau "− Rp 1.000". */
function signed(v) {
  return (v > 0 ? '+ ' : '− ') + rp(Math.abs(v));
}

/** Kartu saldo akhir + statistik. */
function heroHtml(c, R) {
  var y = S.year,
    mn = R.reduce(function (a, b) {
      return b.sp < a.sp ? b : a;
    }),
    hv = R.reduce(function (a, b) {
      return b.sp > a.sp ? b : a;
    }),
    days = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, +S.startMonth || 0, 1)) / 864e5,
    pos = Math.max(0, c.end);
  var note =
    c.end < 0
      ? '<div class="err">Saldo habis sebelum akhir tahun. Kurangi item atau tambah saldo awal.</div>'
      : '<div class="sub">dari saldo awal ' +
        rp(S.saldo) +
        (c.adjIn
          ? ' ' + (c.adjIn > 0 ? '+' : '−') + ' ' + rp(Math.abs(c.adjIn)) + ' penyesuaian = ' + rp(c.open)
          : '') +
        ' di awal ' +
        MON[+S.startMonth || 0] +
        (c.adjLate
          ? ' (' + (c.adjLate > 0 ? '+' : '−') + rp(Math.abs(c.adjLate)) + ' penyesuaian di bulan berikutnya)'
          : '') +
        '</div>';
  var stat = function (label, value, sub) {
    return (
      '<div><span>' +
      label +
      '</span><b>' +
      value +
      '</b>' +
      (sub ? '<span>' + sub + '</span>' : '') +
      '</div>'
    );
  };
  return (
    '<div class="hero"><div class="card" style="margin:0"><div class="sub">Sisa saldo akhir Des ' +
    y +
    '</div><div class="big' +
    (c.end < 0 ? ' neg' : '') +
    '">' +
    rp(c.end) +
    '</div>' +
    note +
    '</div>' +
    '<div class="card stats" style="margin:0">' +
    stat('Total pengeluaran', rp(c.total)) +
    stat('Rata-rata per bulan', rp(c.total / R.length)) +
    stat('Bulan terberat', rp(hv.sp), MON[hv.m]) +
    stat('Bulan teringan', rp(mn.sp), MON[mn.m]) +
    stat('Jatah jajan per bulan', rp(pos / R.length)) +
    stat('Jatah jajan per hari', rp(pos / days)) +
    '</div></div>'
  );
}

/** Grafik batang pengeluaran per bulan. */
function barsHtml(R) {
  var mx = Math.max.apply(
    null,
    R.map(function (r) {
      return r.sp;
    }).concat([1]),
  );
  return (
    '<div class="card"><h2>Pengeluaran per bulan</h2><div class="bars">' +
    R.map(function (r) {
      return (
        '<div title="' +
        rp(r.sp) +
        '"><i style="height:' +
        Math.round((r.sp / mx) * 85) +
        '%"></i>' +
        MON[r.m] +
        '</div>'
      );
    }).join('') +
    '</div></div>'
  );
}

/** Porsi pengeluaran per kategori (tahun aktif). */
function categoryHtml(c) {
  var keys = Object.keys(c.byCat),
    total = c.total;
  var anyCat = keys.some(function (k) {
    return k;
  });
  if (!total) return '';
  if (!anyCat) {
    return '<div class="card"><h2>Pengeluaran per kategori</h2><div class="sub">Belum ada kategori. Isi kolom <b>Kategori</b> saat menambah atau mengubah item di tab Kelola Item untuk melihat porsi pengeluaran.</div></div>';
  }
  var list = keys
    .map(function (k) {
      return { name: k || 'Tanpa kategori', v: c.byCat[k], none: !k };
    })
    .sort(function (a, b) {
      return b.v - a.v;
    });
  var i = 0;
  return (
    '<div class="card"><h2>Pengeluaran per kategori</h2>' +
    list
      .map(function (e) {
        var pct = (e.v / total) * 100,
          color = e.none ? '#8a99a3' : CAT_COLORS[i++ % CAT_COLORS.length];
        return (
          '<div class="catrow"><div class="cathd"><span><i class="dot" style="background:' +
          color +
          '"></i>' +
          esc(e.name) +
          '</span><b>' +
          rp(e.v) +
          ' <span class="sub">' +
          (pct < 1 ? '<1' : Math.round(pct)) +
          '%</span></b></div><div class="catbar"><i style="width:' +
          pct.toFixed(1) +
          '%;background:' +
          color +
          '"></i></div></div>'
        );
      })
      .join('') +
    '</div>'
  );
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
        return g.n || g.unit;
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
          up = q.p != null;
        return (
          '<span class="chip' +
          (up ? ' chg' : '') +
          '">' +
          esc(q.n) +
          (q.c > 1 ? ' ×' + q.c : '') +
          (up ? ' ' + q.u + ' ' + shortP(q.p) : '') +
          '</span>'
        );
      })
      .join('') +
    r.sk
      .map(function (e) {
        return '<span class="chip sk">' + esc(e.it.name) + '</span>';
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
    .map(function (e) {
      var price = priceAt(e.it, e.t);
      return (
        '<tr class="det"><td>' +
        (S.paid[e.it.id + '|' + isoD(e.t)] ? '✓ ' : '') +
        fd(e.t, { day: 'numeric', month: 'short' }) +
        '</td><td class="l" colspan="2">' +
        esc(e.it.name) +
        '</td><td colspan="2" class="l">' +
        rp(price) +
        (price !== e.it.price ? ' <span class="sub">(harga awal ' + rp(e.it.price) + ')</span>' : '') +
        '</td></tr>'
      );
    })
    .join('');
  return paid + skRows(r) || '<tr class="det"><td colspan="5">Tidak ada pembayaran.</td></tr>';
}

/** Render tab Rincian Bulanan. */
function renderRincian() {
  var c = calc(),
    y = S.year,
    R = c.rows;
  var rows = R.map(function (r) {
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
      '<td class="l c-c">' +
      monthChips(r) +
      '</td></tr>' +
      (openRows[r.m] ? detailRows(r) : '')
    );
  }).join('');
  var table =
    '<div class="card"><h2>Rincian arus kas ' +
    y +
    '</h2><div class="sub" style="margin-bottom:8px">Klik baris untuk melihat tanggal dan rincian tiap pembayaran. ' +
    'Label biru (▲ naik, ▼ turun) = harga berbeda dari harga awal.</div><div class="tw"><table><thead><tr><th>Bulan</th><th>Saldo awal</th><th>Pengeluaran</th><th>Saldo akhir</th><th class="l">Item berkala</th></tr></thead><tbody>' +
    rows +
    '<tr class="tot"><td>Total</td><td></td><td data-l="Pengeluaran">' +
    rp(c.total) +
    '</td><td data-l="Saldo akhir">' +
    rp(c.end) +
    '</td><td></td></tr></tbody></table></div></div>';
  $('v-rincian').innerHTML = heroHtml(c, R) + barsHtml(R) + categoryHtml(c) + table;
}

/** Baris "dilewati" pada rincian sebuah bulan. */
function skRows(r) {
  return (r.sk || [])
    .slice()
    .sort(function (a, b) {
      return a.t - b.t;
    })
    .map(function (e) {
      return (
        '<tr class="det"><td>' +
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
  $('v-rincian').onclick = function (e) {
    var r = e.target.closest('tr.row');
    if (r) {
      openRows[r.dataset.m] = !openRows[r.dataset.m];
      renderRincian();
    }
  };
}
