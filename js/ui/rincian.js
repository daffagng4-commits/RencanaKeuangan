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
function heroHtml(c, R, lead) {
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
      : '<div class="sub pv">dari saldo awal ' +
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
  var plain =
    '<div class="card" style="margin:0"><div class="sub">Sisa saldo akhir Des ' +
    y +
    '</div><div class="big' +
    (c.end < 0 ? ' neg' : '') +
    '">' +
    rp(c.end) +
    '</div>' +
    note +
    '</div>';
  return (
    '<div class="hero">' +
    (lead ? lead(note) : plain) +
    '<div class="card stats" style="margin:0">' +
    stat('Total pengeluaran', rp(c.total)) +
    stat('Rata-rata per bulan', rp(c.total / R.length)) +
    stat('Bulan terberat', rp(hv.sp), MON[hv.m]) +
    stat('Bulan teringan', rp(mn.sp), MON[mn.m]) +
    stat('Jatah jajan per bulan', rp(pos / R.length)) +
    (lead ? '' : stat('Jatah jajan per hari', rp(pos / days))) +
    '</div></div>'
  );
}

/** Grafik kurva tren proyeksi saldo akhir 12 bulan (SVG native tanpa library). */
function sparklineHtml(R) {
  if (!R || !R.length) return '';
  var vals = R.map(function (r) {
    return r.ak;
  });
  var minVal = Math.min.apply(null, vals);
  var maxVal = Math.max.apply(null, vals);
  var span = maxVal - minVal;
  var padY = span * 0.15 || 500000;
  var lo = Math.min(0, minVal - padY);
  var hi = Math.max(0, maxVal + padY);
  if (hi <= lo) hi = lo + 1000000;

  var W = 600,
    H = 130;
  var padL = 32,
    padR = 24,
    padT = 16,
    padB = 26;
  var plotW = W - padL - padR,
    plotH = H - padT - padB;

  var pts = R.map(function (r, i) {
    var x = padL + (i / (R.length - 1 || 1)) * plotW;
    var normY = (r.ak - lo) / (hi - lo);
    var y = padT + (1 - normY) * plotH;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: r };
  });

  var dPath = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (var i = 1; i < pts.length; i++) {
    dPath += ' L ' + pts[i].x + ' ' + pts[i].y;
  }

  var baseY = padT + (1 - (0 - lo) / (hi - lo)) * plotH;
  baseY = Math.max(padT, Math.min(H - padB, baseY));

  var areaPath =
    dPath +
    ' L ' +
    pts[pts.length - 1].x +
    ' ' +
    (H - padB) +
    ' L ' +
    pts[0].x +
    ' ' +
    (H - padB) +
    ' Z';

  var zeroLine = '';
  if (lo < 0 && hi > 0) {
    zeroLine =
      '<line x1="' +
      padL +
      '" y1="' +
      baseY +
      '" x2="' +
      (W - padR) +
      '" y2="' +
      baseY +
      '" stroke="var(--wr)" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>' +
      '<text x="' +
      (padL - 4) +
      '" y="' +
      (baseY + 3) +
      '" text-anchor="end" font-size="9" fill="var(--wr)">Rp 0</text>';
  }

  var monthLabels = pts
    .map(function (p) {
      return (
        '<text x="' +
        p.x +
        '" y="' +
        (H - 8) +
        '" text-anchor="middle" font-size="9.5" fill="var(--mut)">' +
        MON[p.r.m] +
        '</text>'
      );
    })
    .join('');

  var dots = pts
    .map(function (p) {
      var isNeg = p.r.ak < 0;
      var col = isNeg ? 'var(--wr)' : 'var(--in)';
      return (
        '<circle cx="' +
        p.x +
        '" cy="' +
        p.y +
        '" r="3.5" fill="' +
        col +
        '" stroke="var(--sf)" stroke-width="1.5">' +
        '<title>' +
        MON[p.r.m] +
        ': Saldo akhir ' +
        rp(p.r.ak) +
        ' (Pengeluaran ' +
        rp(p.r.sp) +
        ')</title></circle>'
      );
    })
    .join('');

  var minPoint = pts.reduce(function (prev, cur) {
    return cur.r.ak < prev.r.ak ? cur : prev;
  }, pts[0]);
  var alertMsg =
    minPoint.r.ak < 0
      ? '<span style="color:var(--wr);font-weight:600">Perhatian: Potensi defisit di ' +
        MON[minPoint.r.m] +
        ' (' +
        rp(minPoint.r.ak) +
        ')</span>'
      : '<span style="color:var(--in);font-weight:600">Arus kas sehat (Saldo terendah ' +
        rp(minPoint.r.ak) +
        ' di ' +
        MON[minPoint.r.m] +
        ')</span>';

  return (
    '<div id="sparkline-kas" class="card" style="padding-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
    '<h2>Proyeksi Saldo 12 Bulan</h2>' +
    '<div class="sub" style="font-size:12px">' +
    alertMsg +
    '</div>' +
    '</div>' +
    '<div style="width:100%;overflow-x:auto">' +
    '<svg viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" style="width:100%;min-width:480px;height:auto;display:block">' +
    '<defs>' +
    '<linearGradient id="spk-grad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--ac)" stop-opacity="0.25"/>' +
    '<stop offset="100%" stop-color="var(--ac)" stop-opacity="0.0"/>' +
    '</linearGradient>' +
    '</defs>' +
    zeroLine +
    '<path d="' +
    areaPath +
    '" fill="url(#spk-grad)"/>' +
    '<path d="' +
    dPath +
    '" fill="none" stroke="var(--ac)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    dots +
    monthLabels +
    '</svg>' +
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
        return g.n || g.unit || g.mv;
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
          up = q.p != null,
          itObj = item(k),
          isAnom = up && itObj && itObj.price > 0 && Math.round(((q.p - itObj.price) / itObj.price) * 100) >= 20;
        return (
          '<span class="chip' +
          (isAnom ? ' wr' : up ? ' chg' : '') +
          '">' +
          esc(q.n) +
          (q.c > 1 ? ' ×' + q.c : '') +
          (up ? ' ' + q.u + ' ' + shortP(q.p) : '') +
          (isAnom ? ' (lonjakan)' : '') +
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
    .map(function (e, i) {
      var price = priceAt(e.it, e.t),
        isPaid = !!S.paid[e.it.id + '|' + isoD(e.t)],
        isLate = !isPaid && isoD(e.t) < todayISO(),
        diffPct = e.it.price ? Math.round(((price - e.it.price) / e.it.price) * 100) : 0,
        anom = diffPct >= 20 ? ' <span class="chip wr" title="Lonjakan tagihan +' + diffPct + '% dari harga awal">▲ +' + diffPct + '% anomali</span>' : '';
      var pk = e.it.id + '|' + isoD(e.t);
      return (
        '<tr class="det' +
        (isPaid ? ' paid' : isLate ? ' late' : '') +
        '" data-pk="' +
        pk +
        '" style="--i:' +
        i +
        ';cursor:pointer" title="Klik untuk ubah nominal atau status tagihan"><td><span class="st ' +
        (isPaid ? 'ok' : isLate ? 'bad' : 'wait') +
        '" role="img" aria-label="' +
        (isPaid ? 'Lunas' : isLate ? 'Terlewat' : 'Belum dibayar') +
        '">' +
        (isPaid ? '✓' : isLate ? '!' : '') +
        '</span>' +
        fd(e.t, { day: 'numeric', month: 'short' }) +
        '</td><td class="l" colspan="2">' +
        esc(e.it.name) +
        anom +
        '</td><td colspan="2" class="l">' +
        rp(price) +
        (price !== e.it.price ? ' <span class="sub">(harga awal ' + rp(e.it.price) + ')</span>' : '') +
        ' <span style="font-size:11px;color:var(--mut);margin-left:4px">&#9998;</span></td></tr>'
      );
    })
    .join('');
  return paid + skRows(r) || '<tr class="det"><td colspan="5">Tidak ada pembayaran.</td></tr>';
}

/** Proyeksi runway kas: memperkirakan berapa hari saldo bertahan menghadapi tagihan belum lunas ke depan. */
function kasRunway(P, bal) {
  if (!P) P = kasLinked() || (typeof kas === 'function' ? kas() : null);
  if (!P) return null;
  if (bal == null) {
    var sm = +S.startMonth || 0,
      asc = kasRows(P).filter(function (x) {
        return +x.d.slice(5, 7) - 1 <= sm;
      }),
      A = kasSum(asc, 'all');
    bal = kasBase(P) + A.i - A.o;
  }
  var today = todayISO();
  if (bal <= 0) {
    return { days: 0, date: today, deficit: Math.abs(bal), status: 'deficit' };
  }
  var bills = [];
  var allYears = (typeof ALL !== 'undefined' && ALL.data) ? Object.keys(ALL.data) : [];
  if (!allYears.length && typeof S !== 'undefined' && S.year) allYears = [String(S.year)];
  allYears.forEach(function (yk) {
    var Y = ALL.data[yk], y = +yk;
    if (!Y || !Y.items) return;
    Y.items.forEach(function (it) {
      occ(it, y).forEach(function (t) {
        var d = isoD(t);
        if (d < today) return;
        var k = it.id + '|' + d;
        if (Y.paid && (Y.paid[k] || Y.skip[k])) return;
        bills.push({ d: d, t: t, price: priceAt(it, t), name: it.name });
      });
    });
  });
  bills.sort(function (a, b) {
    return a.t - b.t;
  });

  var curr = bal;
  for (var i = 0; i < bills.length; i++) {
    curr -= bills[i].price;
    if (curr < 0) {
      var dDiff = Math.max(0, Math.round((bills[i].t - Date.parse(today + 'T00:00:00Z')) / 864e5));
      return {
        days: dDiff,
        date: bills[i].d,
        deficit: Math.abs(curr),
        bill: bills[i],
        status: dDiff <= 30 ? 'warning' : 'ok'
      };
    }
  }
  return { days: 999, date: null, deficit: 0, status: 'safe' };
}

function kasRunwayHtml(P, bal) {
  var rw = kasRunway(P, bal);
  if (!rw) return '';
  if (rw.status === 'deficit') {
    return '<div class="runway-box runway-deficit">&#9888; Saldo defisit <span class="pv">' + rp(rw.deficit) + '</span> &mdash; segera lakukan penyesuaian kas</div>';
  }
  if (rw.status === 'warning') {
    return '<div class="runway-box runway-warning">&#9203; Kas diproyeksikan habis pada ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi &middot; defisit <span class="pv">' + rp(rw.deficit) + '</span>)</div>';
  }
  if (rw.status === 'ok') {
    return '<div class="runway-box runway-safe">&#10003; Kas aman hingga ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi sebelum tagihan ' + esc(rw.bill ? rw.bill.name : '') + ')</div>';
  }
  return '<div class="runway-box runway-safe">&#10003; Proyeksi kas aman untuk seluruh jadwal pengeluaran tahun ini</div>';
}

/** Perkiraan uang aman dipakai per hari sampai akhir bulan ini (hanya bila tahun aktif = tahun berjalan). */
function amanHariIni(bal, sm) {
  var today = todayISO(),
    y = +today.slice(0, 4);
  if (+S.year !== y) return null;
  var mo = +today.slice(5, 7),
    left = new Date(Date.UTC(y, mo, 0)).getUTCDate() - +today.slice(8, 10) + 1,
    rem = reminders(left - 1),
    due = 0,
    n = 0;
  rem.late.concat(rem.soon).forEach(function (r) {
    due += r.price;
    n++;
  });
  var free = bal - due;
  return { left: left, due: due, n: n, free: free, perDay: free > 0 ? Math.floor(free / left) : 0, sameMonth: sm === mo - 1 };
}

/** Satu kartu saldo di Rincian Bulanan: "Aman dipakai hari ini" (bila bisa), Saldo Realtime, dan Sisa saldo akhir. */
function saldoHero(c, R) {
  var P = kasLinked();
  if (!P) return heroHtml(c, R);
  var sm = +S.startMonth || 0,
    mName = typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm],
    asc = kasRows(P).filter(function (x) {
      return +x.d.slice(5, 7) - 1 <= sm;
    }),
    A = kasSum(asc, 'all'),
    bal = kasBase(P) + A.i - A.o,
    sf = amanHariIni(bal, sm),
    chip = '<span class="chip on" style="margin:0;font-size:11px;font-weight:700">' + esc(P.name) + '</span>',
    audit =
      (P.link ? 'saldo awal Rencana ' : 'saldo awal ') + rp(kasBase(P)) + ' + masuk ' + rp(A.i) + ' &minus; keluar ' + rp(A.o) +
      ' &middot; selisih ' + (A.i === A.o ? rp(0) : signed(A.i - A.o)) + ' &middot; ' + A.n + ' transaksi',
    label, big, neg, sub, hint = '';
  if (sf) {
    label = 'Aman dipakai hari ini';
    neg = sf.free <= 0;
    big = neg ? '&minus;' + rp(Math.abs(sf.free)) + '<small>kurang</small>' : rp(sf.perDay) + '<small>/ hari</small>';
    sub = neg
      ? 'Saldo ' + rp(bal) + ' belum cukup untuk ' + sf.n + ' tagihan sampai akhir bulan (' + rp(sf.due) + ')'
      : 'Sisa ' + rp(sf.free) + ' setelah ' + sf.n + ' tagihan sampai akhir bulan (' + rp(sf.due) + ') &middot; ' + sf.left + ' hari lagi';
    if (!sf.sameMonth)
      hint = '<span class="hm-hint">Bulan saldo (' + mName + ') bukan bulan ini &mdash; ubah &ldquo;Bulan saldo&rdquo; agar angka ini akurat.</span>';
  } else {
    label = 'Saldo Realtime &middot; ' + mName;
    neg = bal < 0;
    big = rp(bal);
    sub = audit;
  }
  return heroHtml(c, R, function (note) {
    return (
      '<div class="card hm" style="margin:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
      '<div class="sub" style="font-weight:600">' + label + '</div>' + chip + '</div>' +
      '<div class="big' + (neg ? ' neg' : '') + '" style="margin:6px 0 4px">' + big + '</div>' +
      '<div class="sub pv">' + sub + '</div>' + hint +
      '<div class="hm-bal">' +
      (sf ? '<div><span>Saldo Realtime &middot; ' + mName + '</span><b class="pv' + (bal < 0 ? ' neg' : '') + '">' + rp(bal) + '</b></div>' : '') +
      '<div><span>Sisa saldo akhir Des ' + S.year + '</span><b class="pv' + (c.end < 0 ? ' neg' : '') + '">' + rp(c.end) + '</b></div></div>' +
      (sf ? '<div class="sub pv" style="margin-top:8px;font-size:12px">' + audit + '</div>' : '') +
      note + kasRunwayHtml(P, bal) + '</div>'
    );
  });
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
  $('v-rincian').innerHTML = saldoHero(c, R) + sparklineHtml(R) + barsHtml(R) + categoryHtml(c) + table;
}

/** Baris "dilewati" pada rincian sebuah bulan. */
function skRows(r) {
  return (r.sk || [])
    .slice()
    .sort(function (a, b) {
      return a.t - b.t;
    })
    .map(function (e, i) {
      return (
        '<tr class="det skp" style="--i:' +
        (i + 40) +
        '"><td><span class="st skp" role="img" aria-label="Dilewati">–</span>' +
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
    var det = e.target.closest('tr.det[data-pk]');
    if (det) {
      e.stopPropagation();
      openCm(det);
      return;
    }
    var r = e.target.closest('tr.row');
    if (r) {
      openRows[r.dataset.m] = !openRows[r.dataset.m];
      renderRincian();
    }
  };
}
