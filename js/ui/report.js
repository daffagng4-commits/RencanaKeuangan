/** Unduh laporan (hari/minggu/bulan/tahun ini) sebagai file HTML siap cetak. */
'use strict';

/** Rentang tanggal untuk periode p: d=hari ini, w=7 hari terakhir, m=bulan ini, y=tahun berjalan. */
function repRange(p) {
  var today = todayISO(),
    y = +today.slice(0, 4);
  if (p === 'd') return { from: today, to: today };
  if (p === 'w') return { from: addDaysISO(today, -6), to: today };
  if (p === 'm') return { from: today.slice(0, 7) + '-01', to: isoD(new Date(Date.UTC(y, +today.slice(5, 7), 0))) };
  return { from: y + '-01-01', to: y + '-12-31' };
}

/** Tagihan jatuh tempo dalam rentang [from, to] (yang belum lunas/diskip). */
function repTagihan(from, to) {
  var out = [];
  S.items.forEach(function (it) {
    occ(it, +from.slice(0, 4)).forEach(function (t) {
      var d = isoD(t);
      if (d < from || d > to || d.slice(0, 4) !== from.slice(0, 4)) return;
      if (S.paid[it.id + '|' + d] || S.skip[it.id + '|' + d]) return;
      out.push({ d: d, name: it.name, price: priceAt(it, t) });
    });
  });
  return out.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
}

/** Susun HTML laporan: ringkasan, transaksi semua profil, tagihan jatuh tempo. */
function laporanHtml(p) {
  var R = repRange(p),
    tx = [],
    tin = 0,
    tout = 0;
  Object.keys(ALL.kas.pr).forEach(function (id) {
    var P = ALL.kas.pr[id];
    P.tx.forEach(function (x) {
      if (x.d < R.from || x.d > R.to) return;
      if (x.t === '+') tin += x.amt;
      else tout += x.amt;
      tx.push({ d: x.d, p: P.name, note: x.note || x.cat || 'Transaksi', t: x.t, amt: x.amt });
    });
  });
  tx.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
  var tg = repTagihan(R.from, R.to),
    tsum = tg.reduce(function (a, b) { return a + b.price; }, 0),
    row = function (c) { return '<tr>' + c.map(function (x) { return x.slice(0, 4) === '<td ' ? x : '<td>' + x + '</td>'; }).join('') + '</tr>'; },
    dId = { d: 'hari-ini', w: 'minggu-ini', m: 'bulan-ini', y: 'tahun-ini' }[p] || p,
    L = [
      '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan ' + dId + '</title>',
      '<style>body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 2px}',
      'table{border-collapse:collapse;width:100%;margin:10px 0 22px;font-size:13px}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}',
      'th{background:#f2f2f2}td.n,th.n{text-align:right}h2{font-size:15px;margin:18px 0 4px}.mut{color:#666;font-size:13px}@media print{button{display:none}}</style></head><body>',
      '<h1>Laporan ' + R.from.slice(0, 4) + '</h1>',
      '<div class="mut">Periode ' + fmtD(R.from) + ' – ' + fmtD(R.to) + ' · dibuat ' + fmtD(todayISO()) + '</div>',
      '<h2>Ringkasan</h2><table>',
      row(['Total masuk', '<td class="n">' + rp(tin) + '</td>']),
      row(['Total keluar', '<td class="n">' + rp(tout) + '</td>']),
      row(['Selisih (masuk − keluar)', '<td class="n">' + rp(tin - tout) + '</td>']),
      row(['Saldo realtime' + (kasLinked() ? ' · ' + esc(kasLinked().name) : ''), '<td class="n">' + (kasLinked() ? rp(kasBal(kasLinked()).bal) : '—') + '</td>']),
      '</table>',
      '<h2>Transaksi (' + tx.length + ')</h2>',
      tx.length
        ? '<table><tr><th>Tanggal</th><th>Profil</th><th>Keterangan</th><th class="n">Masuk</th><th class="n">Keluar</th></tr>' +
          tx.map(function (x) {
            return row([fmtD(x.d), esc(x.p), esc(x.note), '<td class="n">' + (x.t === '+' ? rp(x.amt) : '') + '</td>', '<td class="n">' + (x.t === '+' ? '' : rp(x.amt)) + '</td>']);
          }).join('') + '</table>'
        : '<p class="mut">Tidak ada transaksi pada periode ini.</p>',
      '<h2>Tagihan jatuh tempo (' + tg.length + ')</h2>',
      tg.length
        ? '<table><tr><th>Tanggal</th><th>Tagihan</th><th class="n">Nominal</th></tr>' +
          tg.map(function (x) { return row([fmtD(x.d), esc(x.name), '<td class="n">' + rp(x.price) + '</td>']); }).join('') +
          row(['<b>Total</b>', '', '<td class="n"><b>' + rp(tsum) + '</b></td>']) + '</table>'
        : '<p class="mut">Tidak ada tagihan jatuh tempo pada periode ini.</p>',
      '<button onclick="print()">Cetak / simpan PDF</button>',
      '</body></html>'
    ];
  return L.join('');
}

/** Klik tombol laporan di menu Alat: rakit HTML lalu unduh. */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rep]');
  if (!b) return;
  e.stopPropagation();
  var p = b.dataset.rep,
    d = new Date(),
    pad = function (n) { return (n < 10 ? '0' : '') + n; },
    name = 'laporan-' + { d: 'hari', w: 'minggu', m: 'bulan', y: 'tahun' }[p] + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.html';
  try {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([laporanHtml(p)], { type: 'text/html;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    setX('Laporan diunduh: ' + name, 1);
  } catch (err) {
    setX('Unduh laporan gagal: ' + (err && err.message || err), 0);
  }
});

