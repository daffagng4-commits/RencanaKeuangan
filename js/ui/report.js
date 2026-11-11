/**
 * Unduh laporan (hari/minggu/bulan/tahun) sebagai PDF A4, sama persis dengan PDF bot Telegram.
 * Kembar web: data = bot/report.mjs, tata letak = bot/pdf.mjs. Ubah satu, ubah yang lain.
 */
'use strict';

var REP_TGL = function (iso) { return +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); };

/** Transaksi kas & tagihan dalam rentang (inklusif); status tagihan Lunas/Dilewati/Belum. */
function repCollect(from, to) {
  var P = kasLinked(),
    tx = [],
    bil = [];
  if (P)
    kasRows(P).forEach(function (x) {
      if (x.d >= from && x.d <= to) tx.push({ d: x.d, cat: x.cat || '-', note: x.note || '', t: x.t, amt: x.amt });
    });
  for (var y = +from.slice(0, 4); y <= +to.slice(0, 4); y++)
    S.items.forEach(function (it) {
      occ(it, y).forEach(function (t) {
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

function repBil(bil) {
  return rp(bil.reduce(function (s, b) { return s + b.amt; }, 0));
}

function repTables(tx, bil) {
  var net = tx.reduce(function (s, x) { return s + (x.t === '+' ? x.amt : -x.amt); }, 0);
  return [
    {
      head: 'TRANSAKSI KAS',
      cols: [{ t: 'TANGGAL', w: 16 }, { t: 'KETERANGAN', w: 38 }, { t: 'KATEGORI', w: 18 }, { t: 'NOMINAL', w: 28, align: 'r', bold: true }],
      rows: tx.length
        ? tx.map(function (x) { return [REP_TGL(x.d), x.note || x.cat, x.cat, (x.t === '+' ? '+ ' : '- ') + rp(x.amt)]; })
        : [['-', 'tidak ada transaksi', '-', '-']],
      // Sama dengan bot: tanda + nilai bertanda, jadi "- Rp -2.969.500".
      total: tx.length ? ['Total', (net >= 0 ? '+ ' : '- ') + rp(net)] : null,
    },
    {
      head: 'TAGIHAN',
      cols: [{ t: 'TANGGAL', w: 16 }, { t: 'ITEM', w: 40 }, { t: 'STATUS', w: 16 }, { t: 'NOMINAL', w: 28, align: 'r', bold: true }],
      rows: bil.length ? bil.map(function (b) { return [REP_TGL(b.d), b.name, b.st, rp(b.amt)]; }) : [['-', 'tidak ada tagihan', '-', '-']],
      total: bil.length ? ['Total tagihan', repBil(bil)] : null,
    },
  ];
}

/** Isi laporan periode p (d/w/m/y) untuk tahun aktif: {filename, title, subtitle, summary, tables}. */
function repData(p) {
  var today = todayISO(),
    y = +S.year,
    c = calc(),
    C;
  if (p === 'd') {
    C = repCollect(today, today);
    return {
      filename: 'laporan-harian-' + today + '.pdf',
      title: 'Laporan Harian',
      subtitle: REP_TGL(today) + ' | ' + y,
      summary: repSum(C.tx).concat([['Tagihan jatuh tempo', repBil(C.bil)]]),
      tables: repTables(C.tx, C.bil),
    };
  }
  if (p === 'w') {
    var to = y === +today.slice(0, 4) ? today : y + today.slice(4),
      from = addDaysISO(to, -6);
    C = repCollect(from, to);
    return {
      filename: 'laporan-mingguan-' + to + '.pdf',
      title: 'Laporan Mingguan',
      subtitle: REP_TGL(from) + ' - ' + REP_TGL(to) + ' | ' + y,
      summary: repSum(C.tx).concat([['Tagihan 7 hari', repBil(C.bil)]]),
      tables: repTables(C.tx, C.bil),
    };
  }
  if (p === 'm') {
    var mi = +today.slice(5, 7) - 1,
      row = c.rows.filter(function (r) { return r.m === mi; })[0];
    C = repCollect(y + '-' + pad2(mi + 1) + '-01', isoD(Date.UTC(y, mi + 1, 0)));
    return {
      filename: 'laporan-bulanan-' + y + '-' + pad2(mi + 1) + '.pdf',
      title: 'Laporan Bulanan',
      subtitle: FULL_MON[mi] + ' ' + y,
      summary: repSum(C.tx).concat([['Tagihan bulan', repBil(C.bil)], ['Saldo akhir bulan', row ? rp(row.ak) : '-']]),
      tables: repTables(C.tx, C.bil),
    };
  }
  C = repCollect(y + '-01-01', y + '-12-31');
  return {
    filename: 'laporan-tahunan-' + y + '.pdf',
    title: 'Laporan Tahunan',
    subtitle: y + ' | ' + S.items.length + ' item aktif',
    summary: repSum(C.tx).concat([['Total tagihan', rp(c.total)]]),
    tables: [{
      head: 'PER BULAN',
      cols: [{ t: 'BULAN', w: 20 }, { t: 'MASUK', w: 20, align: 'r' }, { t: 'KELUAR', w: 20, align: 'r' }, { t: 'TAGIHAN', w: 20, align: 'r' }, { t: 'SALDO AKHIR', w: 20, align: 'r', bold: true }],
      rows: c.rows.map(function (r) {
        var mk = y + '-' + pad2(r.m + 1),
          si = 0,
          so = 0;
        C.tx.forEach(function (x) { if (x.d.slice(0, 7) === mk) { if (x.t === '+') si += x.amt; else so += x.amt; } });
        return [FULL_MON[r.m], si ? rp(si) : '-', so ? rp(so) : '-', rp(r.sp), rp(r.ak)];
      }),
      total: ['Sisa akhir Des ' + y, rp(c.end)],
    }],
  };
}

// Lebar glyph AFM Helvetica / Helvetica-Bold (per 1000 em), byte WinAnsi 32..255; diambil dari pdf-lib.
var REP_W = [
  '278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,500,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500',
  '278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,556,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556',
].map(function (s) { return s.split(',').map(Number); });
// Karakter Unicode untuk byte WinAnsi 0x80..0x9F (\0 = slot kosong).
var REP_HI = '\u20ac\0\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\0\u017d\0\0\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\0\u017e\u0178';

/** Teks -> string byte WinAnsi; di luar WinAnsi (emoji, aksara lain) jadi '?'. */
function repEnc(s) {
  return Array.from(String(s == null ? '' : s), function (ch) {
    var c = ch.charCodeAt(0);
    if (c < 32) return ' ';
    if (c < 127 || (c >= 160 && c < 256)) return ch;
    var i = REP_HI.indexOf(ch);
    return i >= 0 ? String.fromCharCode(128 + i) : '?';
  }).join('');
}

function repWidth(b, bold, size) {
  var w = 0;
  for (var i = 0; i < b.length; i++) w += REP_W[bold ? 1 : 0][b.charCodeAt(i) - 32] || 0;
  return (w * size) / 1000;
}

/** Laporan -> byte PDF A4 dengan font standar Helvetica (tanpa pustaka; ukuran & posisi = bot/pdf.mjs). */
function repPdf(rep) {
  var M = 38, W = 595.28, H = 841.89,
    INK = '0.11 0.13 0.16', MUT = '0.42 0.45 0.5', LINE = '0.85 0.87 0.9', HEADBG = '0.95 0.96 0.97',
    pages = [], ops, y;
  var f = function (n) { return +n.toFixed(2); };
  var put = function (s, x, py, size, bold, color, right) {
    var b = repEnc(s);
    ops.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + (color || INK) + ' rg ' + f(right ? x - repWidth(b, bold, size) : x) + ' ' + f(py) + ' Td (' + b.replace(/[\\()]/g, '\\$&') + ') Tj ET');
  };
  var hline = function (py, th, color) { ops.push((color || LINE) + ' RG ' + th + ' w ' + M + ' ' + f(py) + ' m ' + f(W - M) + ' ' + f(py) + ' l S'); };
  var page = function () { ops = []; pages.push(ops); y = H - M; };
  var cont = function () { page(); put(rep.title, M, y - 12, 11, true, MUT); y -= 26; };
  var fit = function (cell, bold, w) {
    var s = repEnc(cell);
    if (repWidth(s, bold, 9) <= w - 6) return s;
    while (s.length > 1 && repWidth(s + '..', bold, 9) > w - 6) s = s.slice(0, -1);
    return s + '..';
  };

  page();
  put(rep.title, M, y - 20, 19, true);
  put(rep.subtitle, M, y - 36, 9.5, false, MUT);
  y -= 48;
  hline(y, 1, INK);
  y -= 18;
  var colW = (W - 2 * M) / 2;
  rep.summary.forEach(function (r, i) {
    var cx = M + (i % 2) * colW, cy = y - Math.floor(i / 2) * 16;
    put(r[0], cx, cy - 9, 9, false, MUT);
    put(r[1], cx + colW - 10, cy - 9, 10.5, true, INK, true);
  });
  y -= Math.ceil(rep.summary.length / 2) * 16 + 8;

  rep.tables.forEach(function (t) {
    if (y - 60 < M + 30) cont();
    put(t.head, M, y - 10, 10.5, true);
    y -= 20;
    var ws = t.cols.map(function (c) { return (c.w * (W - 2 * M)) / 100; }), xs = [], acc = M;
    ws.forEach(function (w) { xs.push(acc); acc += w; });
    var cx = function (i) { return t.cols[i].align === 'r' ? xs[i] + ws[i] - 3 : xs[i] + 3; };
    var head = function () {
      ops.push(HEADBG + ' rg ' + M + ' ' + f(y - 14) + ' ' + f(W - 2 * M) + ' 16 re f');
      t.cols.forEach(function (c, i) { put(c.t, cx(i), y - 10, 8.5, true, MUT, c.align === 'r'); });
      y -= 18;
    };
    head();
    t.rows.forEach(function (r) {
      if (y - 16 < M + 30) { hline(y + 4, 0.5); cont(); head(); }
      t.cols.forEach(function (c, i) { put(fit(r[i], c.bold, ws[i]), cx(i), y - 9, 9, c.bold, INK, c.align === 'r'); });
      y -= 15;
      hline(y + 4, 0.4);
    });
    if (t.total) {
      put(t.total[0], M + 3, y - 11, 9.5, true);
      put(t.total[1], W - M - 3, y - 11, 9.5, true, INK, true);
      y -= 20;
    }
    y -= 10;
  });

  var foot = 'Rencana Keuangan - dibuat otomatis ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  pages.forEach(function (o, i) {
    ops = o;
    put(foot, M, M - 8, 7.5, false, MUT);
    put(i + 1 + '/' + pages.length, W - M, M - 8, 7.5, false, MUT, true);
  });

  var font = function (n) { return '<< /Type /Font /Subtype /Type1 /BaseFont /' + n + ' /Encoding /WinAnsiEncoding >>'; },
    objs = ['<< /Type /Catalog /Pages 2 0 R >>', '', font('Helvetica'), font('Helvetica-Bold')],
    kids = [];
  pages.forEach(function (o) {
    var c = o.join('\n');
    objs.push('<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream');
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + objs.length + ' 0 R >>');
    kids.push(objs.length + ' 0 R');
  });
  objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
  // Semua karakter < 256, jadi panjang string = jumlah byte (offset xref valid).
  var out = '%PDF-1.4\n', at = [];
  objs.forEach(function (o, i) { at.push(out.length); out += i + 1 + ' 0 obj\n' + o + '\nendobj\n'; });
  var xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' +
    at.map(function (n) { return String(n).padStart(10, '0') + ' 00000 n \n'; }).join('') +
    'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Uint8Array.from(out, function (ch) { return ch.charCodeAt(0); });
}

/** Klik tombol laporan (menu Alat / lembar Lainnya): rakit PDF lalu unduh. */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rep]');
  if (!b) return;
  e.stopPropagation();
  var sh = document.getElementById('botsheet'),
    am = document.getElementById('alat-menu');
  if (sh) sh.hidden = true;
  if (am) am.hidden = true;
  try {
    var D = repData(b.dataset.rep),
      a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([repPdf(D)], { type: 'application/pdf' }));
    a.download = D.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    setX('Laporan diunduh: ' + D.filename, 1);
  } catch (err) {
    setX('Unduh laporan gagal: ' + (err && err.message || err), 0);
  }
});
