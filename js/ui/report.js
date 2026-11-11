/**
 * Unduh laporan (hari/minggu/bulan/tahun ini) sebagai file HTML siap cetak.
 * Isi & susunan mengikuti laporan bot Telegram (bot/report.mjs): judul, subjudul, ringkasan, tabel TRANSAKSI KAS & TAGIHAN.
 */
'use strict';

var REP_TGL = function (iso) { return +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); };

/** Rentang tanggal untuk periode p: d=hari ini, w=7 hari terakhir, m=bulan ini, y=tahun berjalan. */
function repRange(p) {
  var today = todayISO(),
    y = +today.slice(0, 4);
  if (p === 'd') return { from: today, to: today };
  if (p === 'w') return { from: addDaysISO(today, -6), to: today };
  if (p === 'm') return { from: today.slice(0, 7) + '-01', to: isoD(new Date(Date.UTC(y, +today.slice(5, 7), 0))) };
  return { from: y + '-01-01', to: y + '-12-31' };
}

/** Transaksi kas & tagihan dalam rentang (inklusif); status tagihan Lunas/Dilewati/Belum. */
function repCollect(from, to) {
  var P = kasLinked(),
    tx = [],
    bil = [];
  if (P)
    kasRows(P).forEach(function (x) {
      if (x.d >= from && x.d <= to) tx.push({ d: x.d, cat: x.cat || '-', note: x.note || '', t: x.t, amt: x.amt });
    });
  S.items.forEach(function (it) {
    occ(it, +from.slice(0, 4)).forEach(function (t) {
      var ds = isoD(t);
      if (ds < from || ds > to) return;
      var k = it.id + '|' + ds;
      bil.push({ d: ds, name: it.name, cat: it.cat || '-', amt: priceAt(it, t), st: S.paid[k] ? 'Lunas' : S.skip[k] ? 'Dilewati' : 'Belum' });
    });
  });
  var byD = function (a, b) { return a.d < b.d ? -1 : 1; };
  return { tx: tx.sort(byD), bil: bil.sort(byD) };
}

function repSum(tx) {
  var i = 0, o = 0;
  tx.forEach(function (x) { if (x.t === '+') i += x.amt; else o += x.amt; });
  return [['Masuk', rp(i)], ['Keluar', rp(o)], ['Selisih', rp(i - o)]];
}

/** Satu tabel gaya bot: head, kolom {t, align, bold}, baris, total. */
function repTable(t) {
  var n = t.cols.length,
    cl = function (c) { return c.align === 'r' ? ' class="n"' : ''; },
    h = ['<h2>' + t.head + '</h2><table><tr>' + t.cols.map(function (c) { return '<th' + cl(c) + '>' + c.t + '</th>'; }).join('') + '</tr>'];
  t.rows.forEach(function (r) {
    h.push('<tr>' + t.cols.map(function (c, k) {
      var v = r[k] == null ? '' : r[k];
      return '<td' + cl(c) + '>' + (c.bold ? '<b>' + v + '</b>' : v) + '</td>';
    }).join('') + '</tr>');
  });
  if (t.total) h.push('<tr><td colspan="' + Math.max(1, n - 1) + '"><b>' + t.total[0] + '</b></td><td class="n"><b>' + t.total[1] + '</b></td></tr>');
  h.push('</table>');
  return h.join('');
}

function repTables(tx, bil) {
  var net = tx.reduce(function (s, x) { return s + (x.t === '+' ? x.amt : -x.amt); }, 0);
  return [
    {
      head: 'TRANSAKSI KAS',
      cols: [{ t: 'TANGGAL' }, { t: 'KETERANGAN' }, { t: 'KATEGORI' }, { t: 'NOMINAL', align: 'r', bold: true }],
      rows: tx.length
        ? tx.map(function (x) { return [REP_TGL(x.d), x.note || x.cat, x.cat, (x.t === '+' ? '+ ' : '- ') + rp(x.amt)]; })
        : [['-', 'tidak ada transaksi', '-', '-']],
      total: tx.length ? ['Total', (net >= 0 ? '+ ' : '- ') + rp(Math.abs(net))] : null,
    },
    {
      head: 'TAGIHAN',
      cols: [{ t: 'TANGGAL' }, { t: 'ITEM' }, { t: 'STATUS' }, { t: 'NOMINAL', align: 'r', bold: true }],
      rows: bil.length
        ? bil.map(function (b) { return [REP_TGL(b.d), b.name, b.st, rp(b.amt)]; })
        : [['-', 'tidak ada tagihan', '-', '-']],
      total: bil.length ? ['Total tagihan', rp(bil.reduce(function (s, b) { return s + b.amt; }, 0))] : null,
    },
  ];
}

/** Isi laporan untuk periode p: {title, subtitle, summary, tables}. */
function repData(p) {
  var R = repRange(p),
    y = +R.from.slice(0, 4),
    c = calc(),
    C;
  if (p === 'm') {
    var mi = +R.from.slice(5, 7) - 1,
      row = c.rows.filter(function (r) { return r.m === mi; })[0];
    C = repCollect(R.from, R.to);
    return {
      title: 'Laporan Bulanan',
      subtitle: FULL_MON[mi] + ' ' + y,
      summary: repSum(C.tx).concat([
        ['Tagihan bulan', rp(C.bil.reduce(function (s, b) { return s + b.amt; }, 0))],
        ['Saldo akhir bulan', row ? rp(row.ak) : '-'],
      ]),
      tables: repTables(C.tx, C.bil),
    };
  }
  if (p === 'y') {
    C = repCollect(R.from, R.to);
    return {
      title: 'Laporan Tahunan',
      subtitle: y + ' | ' + S.items.length + ' item aktif',
      summary: repSum(C.tx).concat([['Total tagihan', rp(c.total)]]),
      tables: [{
        head: 'PER BULAN',
        cols: [{ t: 'BULAN' }, { t: 'MASUK', align: 'r' }, { t: 'KELUAR', align: 'r' }, { t: 'TAGIHAN', align: 'r' }, { t: 'SALDO AKHIR', align: 'r', bold: true }],
        rows: c.rows.map(function (r) {
          var mk = y + '-' + String(r.m + 1).padStart(2, '0'),
            t = C.tx.filter(function (x) { return x.d.slice(0, 7) === mk; }),
            si = 0,
            so = 0;
          t.forEach(function (x) { if (x.t === '+') si += x.amt; else so += x.amt; });
          return [FULL_MON[r.m], si ? rp(si) : '-', so ? rp(so) : '-', rp(r.sp), rp(r.ak)];
        }),
        total: ['Sisa akhir Des ' + y, rp(c.end)],
      }],
    };
  }
  C = repCollect(R.from, R.to);
  return {
    title: p === 'd' ? 'Laporan Harian' : 'Laporan Mingguan',
    subtitle: p === 'd' ? REP_TGL(R.from) + ' | ' + y : REP_TGL(R.from) + ' - ' + REP_TGL(R.to) + ' | ' + y,
    summary: repSum(C.tx).concat([[p === 'd' ? 'Tagihan jatuh tempo' : 'Tagihan 7 hari', rp(C.bil.reduce(function (s, b) { return s + b.amt; }, 0))]]),
    tables: repTables(C.tx, C.bil),
  };
}

/** HTML lengkap laporan (siap cetak / simpan PDF). */
function laporanHtml(p) {
  var D = repData(p);
  return [
    '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + D.title + '</title><style>',
    'body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#111}',
    'h1{font-size:20px;margin:0 0 2px}h2{font-size:12px;letter-spacing:.06em;margin:22px 0 6px;color:#444}',
    '.sub{color:#666;font-size:13px;margin-bottom:14px}',
    'table{border-collapse:collapse;width:100%;margin:0 0 8px;font-size:13px}',
    'td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f2f2f2;font-size:11px;letter-spacing:.04em}',
    'td.n,th.n{text-align:right}',
    '.sum{display:flex;flex-wrap:wrap;gap:6px 26px;font-size:13px;margin:0 0 6px}',
    '.sum i{font-style:normal;color:#666;margin-right:6px}',
    '@media print{button{display:none}}',
    '</style></head><body>',
    '<h1>' + D.title + '</h1><div class="sub">' + D.subtitle + '</div>',
    '<div class="sum">' + D.summary.map(function (s) { return '<span><i>' + s[0] + '</i><b>' + s[1] + '</b></span>'; }).join('') + '</div>',
    D.tables.map(repTable).join(''),
    '<button onclick="print()">Cetak / simpan PDF</button>',
    '</body></html>',
  ].join('');
}

/** Klik tombol laporan (menu Alat / lembar Lainnya): rakit HTML lalu unduh. */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rep]');
  if (!b) return;
  e.stopPropagation();
  var p = b.dataset.rep,
    d = new Date(),
    pad = function (n) { return (n < 10 ? '0' : '') + n; },
    kind = { d: 'harian', w: 'mingguan', m: 'bulanan', y: 'tahunan' }[p] || p,
    name = 'laporan-' + kind + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.html',
    sh = document.getElementById('botsheet'),
    am = document.getElementById('alat-menu');
  if (sh) sh.hidden = true;
  if (am) am.hidden = true;
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
