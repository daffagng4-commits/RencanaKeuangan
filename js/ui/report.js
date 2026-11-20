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

function repPdfUri(u) {
  var out = '';
  Array.from(String(u || '').trim()).forEach(function (ch) {
    var c = ch.charCodeAt(0);
    if (c <= 0x20 || c >= 0x7f) out += encodeURIComponent(ch);
    else if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch;
    else out += ch;
  });
  return out;
}

/** Laporan -> byte PDF A4 dengan font standar Helvetica (tanpa pustaka; ukuran & posisi = bot/pdf.mjs). */
function repPdf(rep) {
  var M = 38, W = 595.28, H = 841.89,
    INK = '0.11 0.13 0.16', MUT = '0.42 0.45 0.5', LINE = '0.85 0.87 0.9', HEADBG = '0.95 0.96 0.97', LINK_INK = '0.07 0.35 0.68',
    pages = [], annotsPerPage = [], ops, curAnnots, y;
  var f = function (n) { return +n.toFixed(2); };
  var put = function (s, x, py, size, bold, color, right) {
    var b = repEnc(s);
    ops.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + (color || INK) + ' rg ' + f(right ? x - repWidth(b, bold, size) : x) + ' ' + f(py) + ' Td (' + b.replace(/[\\()]/g, '\\$&') + ') Tj ET');
  };
  var hline = function (py, th, color) { ops.push((color || LINE) + ' RG ' + th + ' w ' + M + ' ' + f(py) + ' m ' + f(W - M) + ' ' + f(py) + ' l S'); };
  var page = function () { ops = []; curAnnots = []; pages.push(ops); annotsPerPage.push(curAnnots); y = H - M; };
  var cont = function () { page(); put(rep.title, M, y - 12, 11, true, MUT); y -= 26; };
  var fit = function (cell, bold, w) {
    var s = String(cell == null ? '' : cell);
    if (repWidth(repEnc(s), bold, 9) <= w - 6) return s;
    var chars = Array.from(s);
    while (chars.length > 1 && repWidth(repEnc(chars.join('') + '..'), bold, 9) > w - 6) chars.pop();
    return chars.join('') + '..';
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
      t.cols.forEach(function (c, i) {
        var rawCell = r[i], isObj = rawCell && typeof rawCell === 'object',
          txt = isObj ? rawCell.t : rawCell,
          rawHref = isObj ? rawCell.href : '',
          uri = rawHref ? (typeof safeHref === 'function' ? safeHref(rawHref) : (/^https?:\/\/[^/\s"'<>]+/i.test(String(rawHref).trim()) && !/[\u0000-\u001f\u007f"'<>]/.test(String(rawHref).trim()) ? String(rawHref).trim() : '')) : '';
        if (uri) {
          var fitted = fit(txt, c.bold, ws[i]),
            lCol = rawCell.color || LINK_INK,
            tw = repWidth(repEnc(fitted), c.bold, 9),
            ax = cx(i),
            x1 = c.align === 'r' ? ax - tw : ax,
            x2 = c.align === 'r' ? ax : ax + tw;
          put(fitted, ax, y - 9, 9, c.bold, lCol, c.align === 'r');
          if (tw > 0) {
            ops.push(lCol + ' RG 0.5 w ' + f(x1) + ' ' + f(y - 10.5) + ' m ' + f(x2) + ' ' + f(y - 10.5) + ' l S');
            curAnnots.push({ rect: [x1, y - 11.5, Math.max(x2, x1 + 6), y], uri: repPdfUri(uri) });
          }
        } else {
          put(fit(txt, c.bold, ws[i]), cx(i), y - 9, 9, c.bold, (isObj && rawCell.color) || INK, c.align === 'r');
        }
      });
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
  pages.forEach(function (o, i) {
    var c = o.join('\n'), pa = annotsPerPage[i], annotRefs = [];
    objs.push('<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream');
    var cObjIdx = objs.length;
    if (pa && pa.length) {
      pa.forEach(function (a) {
        objs.push('<< /Type /Annot /Subtype /Link /Rect [' + a.rect.map(f).join(' ') + '] /Border [0 0 0] /A << /S /URI /URI (' + a.uri + ') >> >>');
        annotRefs.push(objs.length + ' 0 R');
      });
    }
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cObjIdx + ' 0 R' + (annotRefs.length ? ' /Annots [' + annotRefs.join(' ') + ']' : '') + ' >>');
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

var curRepKind = 'm';
var repTableExpanded = {};
var REP_HEAD_LABEL = {
  'TRANSAKSI KAS': 'Transaksi Kas',
  'TAGIHAN': 'Tagihan & Cicilan',
  'PER BULAN': 'Ringkasan per Bulan',
};

function repPrettyHead(h) {
  return REP_HEAD_LABEL[h] || h;
}

/** Render isi modal pratinjau laporan (#modal-report) berdasarkan jenis (d/w/m/y). */
function renderRepModal(kind) {
  if (kind) curRepKind = kind;
  var D = repData(curRepKind);
  if (typeof document === 'undefined' || !document.getElementById) return D;
  var t = document.getElementById('rep-m-title'),
    sub = document.getElementById('rep-m-sub'),
    body = document.getElementById('desk-report-body') || document.getElementById('rep-m-body');
  if (t) t.textContent = D.title;
  if (sub) sub.textContent = D.subtitle;
  document.querySelectorAll('#modal-report [data-drep], #rep-m-tabs [data-rep-tab]').forEach(function (b) {
    var k = b.getAttribute('data-drep') || b.getAttribute('data-rep-tab');
    var on = k === curRepKind;
    b.classList.toggle('active', on);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (body) {
    var kpis = '<div class="rep-kpis">' + D.summary.map(function (r) {
      return '<div class="rep-kpi"><div class="rep-kpi-l">' + esc(r[0]) + '</div><div class="rep-kpi-v pv">' + esc(r[1]) + '</div></div>';
    }).join('') + '</div>';
    var tbls = D.tables.map(function (tbl) {
      var expKey = curRepKind + ':' + tbl.head;
      var expanded = !!repTableExpanded[expKey];
      var visRows = tbl.rows.length > 5 && !expanded ? tbl.rows.slice(0, 5) : tbl.rows;
      var rowsHtml = visRows.map(function (row) {
        return '<div class="upcoming-item" style="padding:8px 10px;"><div><div class="upcoming-name" style="font-size:0.82rem;">' + esc(row[1] || row[0]) + '</div>' +
          '<div class="upcoming-meta">' + esc(row[0]) + ' · ' + esc(row[2]) + '</div></div>' +
          '<strong class="mono pv" style="font-size:0.82rem;">' + esc(row[3]) + '</strong></div>';
      }).join('');
      var togBtn = tbl.rows.length > 5
        ? '<button type="button" class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px;" data-drep-tog="' + esc(expKey) + '">' +
          (expanded ? 'Ringkas (tampilkan 5)' : 'Tampilkan semua (' + tbl.rows.length + ')') + '</button>'
        : '';
      return '<div><div style="font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:6px;display:flex;justify-content:space-between;"><span>' + esc(repPrettyHead(tbl.head)) + '</span>' +
        (tbl.total ? '<span class="mono pv">' + esc(tbl.total[1]) + '</span>' : '') + '</div><div class="stack" style="gap:6px;">' + rowsHtml + '</div>' + togBtn + '</div>';
    }).join('');
    body.innerHTML = kpis + tbls;
  }
  return D;
}

/** Buka modal pratinjau laporan (#modal-report) pada jenis periode tertentu. */
function openRepModal(kind) {
  var D = renderRepModal(kind || 'm');
  if (typeof document !== 'undefined' && document.getElementById) {
    if (typeof brOpenModal === 'function' && document.getElementById('modal-report')) {
      brOpenModal('modal-report');
      return D;
    }
    var m = document.getElementById('modal-report') || document.getElementById('rep-m');
    if (m) {
      m.hidden = false;
      if (m.classList) m.classList.add('open');
    }
  }
  return D;
}

/** Unduh PDF laporan dari repData(kind). */
function downloadRepPdf(kind) {
  try {
    var D = repData(kind || curRepKind);
    if (typeof rkDownloadBlob === 'function') {
      var dlR = rkDownloadBlob(D.filename, repPdf(D), 'application/pdf');
      var isNat = typeof isNativeShellEnv === 'function' && isNativeShellEnv();
      if (!isNat && (!dlR || dlR.ok !== false) && typeof setX === 'function') {
        setX('Laporan diunduh: ' + D.filename, 1);
      }
      Promise.resolve((dlR && dlR.done) ? dlR.done : dlR).then(function (res) {
        if (typeof setX !== 'function') return;
        if (res && res.ok !== false) {
          if (isNat || res.method !== 'blob') setX('Laporan PDF siap dibagikan: ' + D.filename, 1);
        } else if (res && res.cancelled) {
          setX('Pengiriman laporan PDF dibatalkan.', 0);
        } else {
          var errS = (res && res.error) ? ' (' + res.error + ')' : '';
          setX('Gagal mengirim laporan PDF' + errS + '. Coba lagi.', 0);
        }
      });
    } else {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([repPdf(D)], { type: 'application/pdf' }));
      a.download = D.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      if (typeof setX === 'function') setX('Laporan diunduh: ' + D.filename, 1);
    }
  } catch (err) {
    if (typeof setX === 'function') setX('Unduh laporan gagal: ' + (err && err.message || err), 0);
  }
}

/** Klik tombol laporan, tab pratinjau laporan, dan tombol unduh PDF. */
document.addEventListener('click', function (e) {
  if (!e || !e.target || !e.target.closest) return;
  var dtog = e.target.closest('[data-drep-tog]');
  if (dtog) {
    var dk = dtog.getAttribute('data-drep-tog');
    repTableExpanded[dk] = !repTableExpanded[dk];
    renderRepModal(curRepKind);
    return;
  }
  var tabBtn = e.target.closest('[data-drep], [data-rep-tab]');
  if (tabBtn) {
    renderRepModal(tabBtn.getAttribute('data-drep') || tabBtn.getAttribute('data-rep-tab'));
    if (typeof rkSyncSegPills === 'function' && tabBtn.closest('.seg')) rkSyncSegPills(tabBtn.closest('.seg'), true);
    return;
  }
  if (e.target.closest('#rep-m-cl')) {
    if (typeof brCloseModal === 'function' && document.getElementById('modal-report')) {
      brCloseModal('modal-report');
      return;
    }
    var rm = document.getElementById('modal-report') || document.getElementById('rep-m');
    if (rm) {
      if (rm.classList) rm.classList.remove('open');
      rm.hidden = true;
    }
    return;
  }
  if (e.target.closest('#rep-m-dl')) {
    downloadRepPdf(curRepKind);
    return;
  }
  var b = e.target.closest('[data-rep], [data-mob-rep]');
  if (!b) return;
  e.stopPropagation();
  var am = document.getElementById('alat-menu'), ms = document.getElementById('mobile-more-sheet');
  if (am) am.classList.remove('open');
  if (ms) ms.classList.remove('open');
  openRepModal(b.dataset.rep || b.dataset.mobRep || 'm');
});
