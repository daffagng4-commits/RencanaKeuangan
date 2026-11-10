/**
 * Tab Rincian Bulanan: ringkasan saldo, grafik per bulan, grafik per kategori, tabel arus kas.
 */

var openRows = {};
var catPeriod = 'y';
var catDir = '-';

/** Legenda chip di kolom "Item berkala" (dipakai juga oleh panduan yang bisa disembunyikan). */
var RINCIAN_LEGEND =
  '<div class="lgd">' +
  '<span><span class="chip">Listrik ×2</span>Siklus khusus / lebih dari sekali</span>' +
  '<span><span class="chip chg">Listrik ▲ 720rb</span>Harga beda dari harga awal (▲ naik, ▼ turun)</span>' +
  '<span><span class="chip wr">Listrik ▲ 720rb (lonjakan)</span>Lonjakan ≥20% dari harga awal</span>' +
  '<span><span class="chip sk">Gym</span>Dilewati bulan ini</span>' +
  '</div>';

/** Warna kategori: hue golden-angle dari urutan kategori (bukan nominal), fallback hash nama untuk kategori tak terdaftar. */
function catColor(name) {
  if (!name || name === 'Tanpa kategori') return '#8a99a3';
  if (isInvestCat(name)) return '#6366f1';
  var key = name.trim().toLowerCase(),
    cats = allCategories(),
    i = -1;
  for (var k = 0; k < cats.length; k++) {
    if (cats[k].trim().toLowerCase() === key) {
      i = k;
      break;
    }
  }
  var hue;
  if (i >= 0) hue = Math.round((i * 137.508 + 18) % 360);
  else {
    var hash = 0;
    for (var j = 0; j < key.length; j++) hash = (hash * 31 + key.charCodeAt(j)) >>> 0;
    hue = hash % 360;
  }
  return 'hsl(' + hue + ' 62% 56%)';
}

/** "+ Rp 1.000" atau "− Rp 1.000". */
function signed(v) {
  return (v > 0 ? '+ ' : '− ') + rp(Math.abs(v));
}

/** Pemasukan/pengeluaran tahun aktif: jadwal bayar (termasuk yang belum lunas) + catatan kas. */
function yearCash() {
  var y = +S.year,
    sm = +S.startMonth || 0,
    P = kasLinked(),
    o = { inc: 0, out: 0, byCat: {}, byMonth: [], entries: [] };
  for (var i = 0; i < 12; i++) o.byMonth[i] = 0;
  function add(d, t, amt, cat, note) {
    if (+d.slice(0, 4) !== y) return;
    var m = +d.slice(5, 7) - 1;
    if (m < sm) return;
    var e = { d: d, t: t, amt: amt, cat: cat || '', note: note || '' };
    o.entries.push(e);
    if (t === '+') o.inc += amt;
    else {
      o.out += amt;
      o.byCat[e.cat] = (o.byCat[e.cat] || 0) + amt;
      o.byMonth[m] += amt;
    }
  }
  if (P)
    kasRows(P).forEach(function (x) {
      add(x.d, x.t, x.amt, x.cat, x.note);
    });
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.skip[k]) return;
      if (P && S.paid[k] && realTx(k)) return;
      add(d, '-', priceAt(it, t), it.cat || 'Tagihan', it.name);
    });
  });
  return o;
}

/** Irisan transaksi masuk/keluar untuk tab 7 hari / bulan / tahun. */
function cashPeriod(C, p) {
  var y = +S.year,
    sm = +S.startMonth || 0,
    today = todayISO(),
    dates = C.entries
      .map(function (e) {
        return e.d;
      })
      .sort(),
    anchor = y === +today.slice(0, 4) ? today : dates.length ? dates[dates.length - 1] : y + '-12-31',
    from,
    to;
  if (p === 'w') {
    from = addDaysISO(anchor, -6);
    to = anchor;
  } else if (p === 'm') {
    from = anchor.slice(0, 7) + '-01';
    to = isoD(Date.UTC(y, +anchor.slice(5, 7), 0));
  } else {
    from = y + '-' + pad2(sm + 1) + '-01';
    to = y + '-12-31';
  }
  var byCat = {},
    incByCat = {},
    inc = 0,
    out = 0,
    n = 0,
    nin = 0;
  C.entries.forEach(function (e) {
    if (e.d < from || e.d > to) return;
    if (e.t === '+') {
      inc += e.amt;
      nin++;
      incByCat[e.cat] = (incByCat[e.cat] || 0) + e.amt;
      return;
    }
    out += e.amt;
    n++;
    byCat[e.cat] = (byCat[e.cat] || 0) + e.amt;
  });
  var days = Math.max(1, Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 864e5) + 1);
  return { from: from, to: to, inc: inc, out: out, total: out, n: n, nin: nin, byCat: byCat, incByCat: incByCat, avg: out / days };
}

/** Tombol periode yang mengendalikan pie dan bar kategori sekaligus. */
function cashPeriodTabs() {
  return [
    ['w', '7 hari'],
    ['m', 'Bulan'],
    ['y', 'Tahun']
  ]
    .map(function (t) {
      return (
        '<button type="button" class="cat-tab' +
        (catPeriod === t[0] ? ' on' : '') +
        '" data-catp="' +
        t[0] +
        '" aria-pressed="' +
        (catPeriod === t[0] ? 'true' : 'false') +
        '">' +
        t[1] +
        '</button>'
      );
    })
    .join('');
}

/** Satu kartu: pie pemasukan/pengeluaran + bar per kategori, disatukan periode. */
function insightCard(C) {
  var p = cashPeriod(C, catPeriod),
    total = p.inc + p.out,
    tabs = cashPeriodTabs();
  var head =
    '<div class="insight-head"><div class="insight-title"><div class="dflex aic fwrap g8"><h2 class="m0">Pemasukan vs pengeluaran</h2><span class="sub fs12">Jadwal + kas</span></div>' +
    '<div class="sub">' +
    fmtD(p.from) +
    ' – ' +
    fmtD(p.to) +
    '</div></div><div class="cat-tabs" role="tablist">' +
    tabs +
    '</div></div>';
  if (!total)
    return (
      '<div class="card insight">' +
      head +
      '<div class="empty">Belum ada pemasukan atau pengeluaran pada periode ini.</div></div>'
    );
  var ip = (p.inc / total) * 100,
    CC = 238.761,
    li = (CC * ip) / 100,
    lo = CC - li;
  var center = p.inc ? Math.round(ip) + '%<small>masuk</small>' : '100%<small>keluar</small>';
  var tipIn = esc('Masuk: ' + rp(p.inc) + ' (' + (p.inc ? Math.round(ip) : 0) + '%)'),
    tipOut = esc('Keluar: ' + rp(p.out) + ' (' + Math.round(p.inc ? 100 - ip : 100) + '%)'),
    tipAll = esc('Masuk: ' + rp(p.inc) + ' · Keluar: ' + rp(p.out));
  var pie =
    '<div class="insight-pie"><div class="pie" tabindex="0" data-tip="' +
    tipAll +
    '"><svg viewBox="0 0 100 100" role="img" aria-label="Pemasukan vs pengeluaran">' +
    '<circle class="pie-slice" cx="50" cy="50" r="38" transform="rotate(-90 50 50)" stroke="#3aa17e" stroke-dasharray="' +
    li +
    ' ' +
    CC +
    '" stroke-dashoffset="0" tabindex="0" data-tip="' + tipIn + '"/>' +
    '<circle class="pie-slice" cx="50" cy="50" r="38" transform="rotate(-90 50 50)" stroke="#d9627f" stroke-dasharray="' +
    lo +
    ' ' +
    CC +
    '" stroke-dashoffset="' +
    -li +
    '" stroke-width="16" tabindex="0" data-tip="' + tipOut + '"/></svg><span>' +
    center +
    '</span></div>' +
    '<div class="pie-lg"><span><i style="background:#3aa17e"></i>Masuk <b class="pv">' +
    rp(p.inc) +
    '</b></span><span><i style="background:#d9627f"></i>Keluar <b class="pv">' +
    rp(p.out) +
    '</b></span></div></div>';
  var income = catDir === '+',
    src = income ? p.incByCat : p.byCat,
    sum = income ? p.inc : p.out,
    cnt = income ? p.nin : p.n;
  var list = Object.keys(src)
    .map(function (k) {
      return { name: k || 'Tanpa kategori', v: src[k], none: !k };
    })
    .sort(function (a, b) {
      return b.v - a.v;
    });
  list.forEach(function (e) {
    e.color = catColor(e.none ? '' : e.name);
  });
  var bars = list
    .map(function (e) {
      var pct = sum ? (e.v / sum) * 100 : 0;
      return (
        '<div class="catrow" tabindex="0" data-tip="' +
        esc(e.name + ': ' + rp(e.v) + ' (' + (pct < 1 ? '<1' : Math.round(pct)) + '% dari total)') +
        '"><div class="cathd"><span><i class="dot" style="background:' +
        e.color +
        '"></i>' +
        esc(e.name) +
        (isInvestCat(e.name) ? ' <span class="chp">aset</span>' : '') +
        '</span><b class="pv">' +
        rp(e.v) +
        ' <span class="sub">' +
        (pct < 1 ? '<1' : Math.round(pct)) +
        '%</span></b></div><div class="catbar"><i style="width:' +
        pct.toFixed(1) +
        '%;background:' +
        e.color +
        '"></i></div></div>'
      );
    })
    .join('');
  var cat =
    '<div class="insight-cat"><div class="dflex jcsb aic fwrap g8"><h3 class="insight-h3">' +
    (income ? 'Pemasukan' : 'Pengeluaran') +
    ' per kategori</h3><div class="dflex aic g8 fwrap"><span class="sub">Total <b class="pv">' +
    rp(sum) +
    '</b></span><div class="cat-tabs cat-dirs" role="tablist">' +
    '<button type="button" class="cat-tab' +
    (income ? '' : ' on') +
    '" data-catd="-" aria-pressed="' +
    (income ? 'false' : 'true') +
    '">Keluar</button>' +
    '<button type="button" class="cat-tab' +
    (income ? ' on' : '') +
    '" data-catd="+" aria-pressed="' +
    (income ? 'true' : 'false') +
    '">Masuk</button></div></div></div>' +
    (sum
      ? '<div class="cat-list">' + bars + '</div>'
      : '<div class="empty mt8">Belum ada ' + (income ? 'pemasukan' : 'pengeluaran') + ' pada periode ini.</div>') +
    '<div class="sub mt12">' +
    (income ? '' : p.out ? 'Rata-rata <b class="pv">' + rp(p.avg) + '</b> per hari · ' : '') +
    cnt +
    ' transaksi</div></div>';
  return (
    '<div class="card insight">' + head + '<div class="insight-body">' + pie + '<div class="insight-div" aria-hidden="true"></div>' + cat + '</div></div>'
  );
}

/** Kartu saldo + statistik. */
function heroHtml(c, R, lead, txCount, C) {
  C = C || yearCash();
  var n = R.length || 1,
    jatah = c.end > 0 ? c.end / n : null,
    hv = R[0] || { m: 0 },
    mn = R[0] || { m: 0 };
  R.forEach(function (r) {
    if (C.byMonth[r.m] > C.byMonth[hv.m]) hv = r;
    if (C.byMonth[r.m] < C.byMonth[mn.m]) mn = r;
  });
  var note =
    c.end < 0
      ? '<div class="err">Saldo habis sebelum akhir tahun. Kurangi item atau tambah saldo awal.</div>'
      : '';
  var stat = function (label, value, sub, cls, blur) {
    return (
      '<div><span>' +
      label +
      '</span><b class="' +
      (blur === false ? '' : 'pv ') +
      (cls || '') +
      '">' +
      value +
      '</b>' +
      (sub ? '<span' + (cls ? ' class="' + cls + '"' : '') + '>' + sub + '</span>' : '') +
      '</div>'
    );
  };
  var jatahHtml =
    '<div class="jatah"><div class="sub fw6">Jatah jajan per bulan</div><div class="big jv' +
    (c.end < 0 ? ' neg' : '') +
    '">' +
    (jatah == null ? '—' : rp(jatah)) +
    '</div>' +
    note +
    '</div>';
  var plain =
    '<div class="card m0"><div class="sub">Sisa saldo akhir Des ' +
    S.year +
    '</div><div class="big' +
    (c.end < 0 ? ' neg' : '') +
    '">' +
    rp(c.end) +
    '</div>' +
    note +
    '</div>';
  return (
    '<div class="hero">' +
    (lead ? lead() : plain) +
    '<div class="card stats m0">' +
    stat('Bulan terberat', rp(C.byMonth[hv.m]), MON[hv.m]) +
    stat('Rata-rata per bulan', rp(C.out / n)) +
    stat('Bulan teringan', rp(C.byMonth[mn.m]), MON[mn.m]) +
    (txCount != null ? stat('Transaksi kas', String(txCount), 'catatan kas', '', false) : '') +
    jatahHtml +
    '</div></div>'
  );
}

/** Grafik arus saldo: perubahan saldo dari tanggal paling awal sampai paling akhir di catatan kas / jadwal bayar. */
function flowChart(R) {
  var P = kasLinked();
  if (!P) return '';
  var base = kasBase(P),
    ev = [];
  kasRows(P).forEach(function (x) {
    ev.push({ d: x.d, delta: x.t === '+' ? x.amt : -x.amt, label: x.note || x.cat || 'Transaksi' });
  });
  var y = +S.year;
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.paid[k] || S.skip[k]) return; // yang lunas sudah ada di kasRows
      ev.push({ d: d, delta: -priceAt(it, t), label: it.name });
    });
  });
  if (!ev.length) return '';
  ev.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  var start = ev[0].d,
    end = ev[ev.length - 1].d,
    by = {};
  ev.forEach(function (e) {
    (by[e.d] = by[e.d] || []).push(e);
  });
  var dd = function (d) {
      var z = new Date(d + 'T00:00:00Z');
      return z.getUTCDate() + ' ' + MON[z.getUTCMonth()];
    },
    pts = [],
    bal = base;
  for (var t = Date.parse(start + 'T00:00:00Z'), last = Date.parse(end + 'T00:00:00Z'); t <= last; t += 864e5) {
    var d = isoD(t),
      day = by[d] || [];
    day.forEach(function (e) { bal += e.delta; });
    var what = day.map(function (e) {
      return (e.delta > 0 ? '+ ' : '− ') + rp(Math.abs(e.delta)) + ' ' + e.label;
    }).join(' · ');
    pts.push({
      d: d,
      v: bal,
      tip: dd(d) + ' · ' + (what ? what + ' · ' : '') + 'saldo ' + rp(bal)
    });
  }
  if (pts.length < 2) return '';
  var low = pts.reduce(function (a, b) { return b.v < a.v ? b : a; });
  return saldoLine({
    id: 'rincian',
    title: 'Arus saldo ' + S.year,
    sub: 'Perubahan saldo · ' + dd(start) + ' – ' + dd(end),
    aria: 'Grafik arus saldo ' + S.year,
    pts: pts,
    foot: 'Terendah <b class="pv' + (low.v < 0 ? ' neg' : '') + '">' + rp(low.v) + '</b> (' + dd(low.d) + ') · saldo terakhir <b class="pv">' + rp(pts[pts.length - 1].v) + '</b>'
  });
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
        anom = diffPct >= 20 ? '<span class="anom" title="Lonjakan tagihan +' + diffPct + '% dari harga awal">▲ +' + diffPct + '%</span>' : '';
      return (
        '<tr class="det' +
        (isPaid ? ' paid' : isLate ? ' late' : '') +
        '" style="--i:' +
        i +
        '"><td><span class="st ' +
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
        '</td></tr>'
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
      A = kasSum(asc);
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

/** Status kas dalam satu kalimat: kapan mulai minus dan apa yang harus dilakukan. */
function kasStatusHtml(P, bal) {
  var rw = kasRunway(P, bal);
  if (!rw) return '';
  if (rw.status === 'deficit') {
    return '<div class="runway-box runway-deficit">&#9888; Saldo sudah minus <b class="pv">' + rp(rw.deficit) + '</b>. Tambah saldo awal atau kurangi tagihan.</div>';
  }
  if (rw.status === 'warning') {
    return '<div class="runway-box runway-warning">&#9203; Kas cukup sampai ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi). Setelah itu saldo akan minus <b class="pv">' + rp(rw.deficit) + '</b>.</div>';
  }
  if (rw.status === 'ok') {
    return '<div class="runway-box runway-safe">&#10003; Tidak ada tagihan besar dalam 30 hari ke depan.</div>';
  }
  return '<div class="runway-box runway-safe">&#10003; Kas cukup untuk semua tagihan sampai akhir tahun.</div>';
}

/** Saldo Realtime profil tergabung (dipakai kartu saldo dan agenda): saldo awal + masuk - keluar sampai bulan saldo. */
function kasBal(P) {
  var sm = +S.startMonth || 0,
    asc = kasRows(P).filter(function (x) {
      return +x.d.slice(5, 7) - 1 <= sm;
    }),
    A = kasSum(asc);
  return { sm: sm, mName: typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm], A: A, bal: kasBase(P) + A.i - A.o };
}

/** Satu kartu saldo di Rincian Bulanan: saldo realtime, sisa akhir tahun, dan jatah jajan di kartu statistik. */
function saldoHero(c, R) {
  var P = kasLinked(),
    C = yearCash();
  if (!P) return heroHtml(c, R, null, null, C);
  var KB = kasBal(P),
    mName = KB.mName,
    A = KB.A,
    bal = KB.bal,
    chip = '<span class="chip on" style="margin:0;font-size:11px;font-weight:700">' + esc(P.name) + '</span>';
  return heroHtml(
    c,
    R,
    function () {
      var st = kasStatusHtml(P, bal);
      if (st.indexOf('runway-safe') >= 0) st = '';
      return (
        '<div class="card hm m0"><div class="dflex jcsb aic g8">' +
        '<div class="sub fw6">Saldo Realtime &middot; ' + mName + '</div>' +
        chip +
        '</div>' +
        '<div class="hm-big pv' +
        (bal < 0 ? ' neg' : '') +
        '">' +
        rp(bal) +
        '</div>' +
        '<div class="hm-bal one"><div><span>Sisa saldo akhir Des ' +
        S.year +
        '</span><b class="pv' +
        (c.end < 0 ? ' neg' : '') +
        '">' +
        rp(c.end) +
        '</b></div></div>' +
        st +
        '</div>'
      );
    },
    A.n,
    C
  );
}

/** Kartu ajakan saat tahun ini belum punya item. */
function emptyItemsHtml() {
  return (
    '<div class="card"><h2>Mulai dari item pertama</h2><div class="empty">Belum ada item untuk tahun ' + S.year +
    '. Item adalah tagihan atau pengeluaran berulang, mis. listrik, langganan, cicilan, atau DCA.</div>' +
    '<div class="row2 mt8"""><button type="button" class="p" data-goto="item">Tambah item</button></div></div>'
  );
}

/** Render tab Rincian Bulanan. */
function renderRincian() {
  var c = calc(),
    y = S.year,
    R = c.rows,
    C = yearCash(),
    fc = flowChart(R);
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
    '</h2>' +
    gdBox(
      'rincian',
      '<div class="sub mb8">Klik baris bulan untuk melihat tanggal dan rincian tiap pembayaran.</div>' + RINCIAN_LEGEND
    ) +
    '<div class="tw"><table><thead><tr><th>Bulan</th><th>Saldo awal</th><th>Pengeluaran</th><th>Saldo akhir</th><th class="l">Item berkala</th></tr></thead><tbody>' +
    rows +
    '<tr class="tot"><td>Total</td><td></td><td data-l="Pengeluaran">' +
    rp(c.total) +
    '</td><td data-l="Saldo akhir">' +
    rp(c.end) +
    '</td><td></td></tr></tbody></table></div></div>';
  $('v-rincian').innerHTML =
    (S.items.length ? '' : emptyItemsHtml()) +
    saldoHero(c, R) +
    fc +
    insightCard(C) +
    table;
  gdApply($('v-rincian'));
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
    var cp = e.target.closest('[data-catp]');
    if (cp) {
      catPeriod = cp.dataset.catp;
      renderRincian();
      return;
    }
    var cd = e.target.closest('[data-catd]');
    if (cd) {
      catDir = cd.dataset.catd;
      renderRincian();
      return;
    }
    var r = e.target.closest('tr.row');
    if (r) {
      openRows[r.dataset.m] = !openRows[r.dataset.m];
      renderRincian();
    }
  };
}
