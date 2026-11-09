/**
 * Tab Rincian Bulanan: ringkasan saldo, grafik per bulan, grafik per kategori, tabel arus kas.
 */

var openRows = {};

/** Legenda chip di kolom "Item berkala" (dipakai juga oleh panduan yang bisa disembunyikan). */
var RINCIAN_LEGEND =
  '<div class="lgd">' +
  '<span><span class="chip">Listrik ×2</span>Siklus khusus / lebih dari sekali</span>' +
  '<span><span class="chip chg">Listrik ▲ 720rb</span>Harga beda dari harga awal (▲ naik, ▼ turun)</span>' +
  '<span><span class="chip wr">Listrik ▲ 720rb (lonjakan)</span>Lonjakan ≥20% dari harga awal</span>' +
  '<span><span class="chip sk">Gym</span>Dilewati bulan ini</span>' +
  '</div>';
var CAT_PALETTE = ['#3aa17e', '#5b8fd9', '#e08a5c', '#9c7fd0', '#d1b04a', '#4fb3bf', '#d9627f', '#7e9b3f', '#b57a52', '#6c7ae0'];

/** Warna kategori yang STABIL: bergantung pada nama (tanpa beda huruf besar/kecil), bukan urutan nilai. Investasi selalu indigo, tanpa kategori abu-abu. */
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
  if (i < 0) {
    i = 0;
    for (var j = 0; j < key.length; j++) i = (i * 31 + key.charCodeAt(j)) >>> 0;
  }
  return CAT_PALETTE[i % CAT_PALETTE.length];
}

/** "+ Rp 1.000" atau "− Rp 1.000". */
function signed(v) {
  return (v > 0 ? '+ ' : '− ') + rp(Math.abs(v));
}

/** Kartu saldo akhir + statistik. */
function heroHtml(c, R, lead, txCount) {
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
  var stat = function (label, value, sub, cls) {
    return (
      '<div><span>' +
      label +
      '</span><b' +
      (cls ? ' class="' + cls + '"' : '') +
      '>' +
      value +
      '</b>' +
      (sub ? '<span' + (cls ? ' class="' + cls + '"' : '') + '>' + sub + '</span>' : '') +
      '</div>'
    );
  };
  var plain =
    '<div class="card m0"><div class="sub">Sisa saldo akhir Des ' +
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
    '<div class="card stats m0">' +
    stat('Total pengeluaran', rp(c.total)) +
    stat('Rata-rata per bulan', rp(c.total / R.length)) +
    stat('Bulan terberat', rp(hv.sp), MON[hv.m]) +
    stat('Bulan teringan', rp(mn.sp), MON[mn.m]) +
    stat('Jatah jajan per bulan', pos ? rp(pos / R.length) : '—', c.end < 0 ? 'saldo akhir tahun minus' : '') +
    (txCount != null ? stat('Transaksi kas', String(txCount), 'sampai ' + MON[+S.startMonth || 0]) : '') +
    (lead ? '' : stat('Jatah jajan per hari', rp(pos / days))) +
    '</div></div>'
  );
}

/** Grafik arus saldo tahun aktif: saldo akhir tiap bulan, titik aktif saat disorot. */
function flowChart(R) {
  if (!R || !R.length) return '';
  var by = {},
    base = +S.saldo || R[0].aw || 0;
  R.forEach(function (r) { by[r.m] = r; });
  var pts = [];
  for (var m = 0; m < 12; m++) {
    var r = by[m];
    if (r) {
      pts.push({
        m: r.m,
        v: r.ak,
        tip: MON[r.m] + ' · awal ' + rp(r.aw) + ' · keluar ' + rp(r.sp) + ' · saldo ' + rp(r.ak)
      });
    } else {
      pts.push({ m: m, v: base, tip: MON[m] + ' · sebelum pencatatan · saldo ' + rp(base) });
    }
  }
  var low = R.reduce(function (a, b) { return b.ak < a.ak ? b : a; });
  return saldoWave({
    id: 'rincian',
    title: 'Arus saldo ' + S.year,
    sub: 'Saldo akhir bulan · sorot titik untuk detail',
    aria: 'Grafik arus saldo ' + S.year,
    pts: pts,
    foot: 'Terendah <b class="' + (low.ak < 0 ? 'neg' : '') + '">' + rp(low.ak) + '</b> (' + MON[low.m] + ') · akhir tahun <b>' + rp(R[R.length - 1].ak) + '</b>'
  });
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
    return '<div class="card"><h2>Pengeluaran per kategori</h2><div class="sub">Belum ada kategori. Isi kolom <b>Kategori</b> saat menambah atau mengubah item di tab Kelola Item untuk melihat porsi pengeluaran.</div><div class="row2 mt8"""><button type="button" data-goto="item">Buka Kelola Item</button></div></div>';
  }
  var list = keys
    .map(function (k) {
      return { name: k || 'Tanpa kategori', v: c.byCat[k], none: !k };
    })
    .sort(function (a, b) {
      return b.v - a.v;
    });
  return (
    '<div class="card"><h2>Pengeluaran per kategori</h2>' +
    list
      .map(function (e) {
        var pct = (e.v / total) * 100,
          color = catColor(e.none ? '' : e.name);
        return (
          '<div class="catrow" tabindex="0" data-tip="' + esc(e.name + ': ' + rp(e.v) + ' (' + Math.round(pct) + '% dari total)') + '"><div class="cathd"><span><i class="dot" style="background:' +
          color +
          '"></i>' +
          esc(e.name) +
          (isInvestCat(e.name) ? ' <span class="chp">aset</span>' : '') +
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

/** Status kas dalam satu kalimat: kapan mulai minus dan apa yang harus dilakukan. */
function kasStatusHtml(P, bal) {
  var rw = kasRunway(P, bal);
  if (!rw) return '';
  if (rw.status === 'deficit') {
    return '<div class="runway-box runway-deficit">&#9888; Saldo sudah minus ' + rp(rw.deficit) + '. Tambah saldo awal atau kurangi tagihan.</div>';
  }
  if (rw.status === 'warning') {
    return '<div class="runway-box runway-warning">&#9203; Kas cukup sampai ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi). Setelah itu saldo akan minus ' + rp(rw.deficit) + '.</div>';
  }
  if (rw.status === 'ok') {
    return '<div class="runway-box runway-safe">&#10003; Tidak ada tagihan besar dalam 30 hari ke depan.</div>';
  }
  return '<div class="runway-box runway-safe">&#10003; Kas cukup untuk semua tagihan sampai akhir tahun.</div>';
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
    inv = 0,
    n = 0;
  rem.late.concat(rem.soon).forEach(function (r) {
    due += r.price;
    if (isInvestCat(r.it.cat)) inv += r.price;
    n++;
  });
  var free = bal - due;
  return { left: left, due: due, inv: inv, n: n, free: free, perDay: free > 0 ? Math.floor(free / left) : 0, sameMonth: sm === mo - 1 };
}

/** Saldo Realtime profil tergabung (dipakai kartu saldo dan agenda): saldo awal + masuk - keluar sampai bulan saldo. */
function kasBal(P) {
  var sm = +S.startMonth || 0,
    asc = kasRows(P).filter(function (x) {
      return +x.d.slice(5, 7) - 1 <= sm;
    }),
    A = kasSum(asc, 'all');
  return { sm: sm, mName: typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm], A: A, bal: kasBase(P) + A.i - A.o };
}

/** Satu kartu saldo di Rincian Bulanan: "Aman dipakai hari ini" (bila bisa), Saldo Realtime, dan Sisa saldo akhir. */
function saldoHero(c, R) {
  var P = kasLinked();
  if (!P) return heroHtml(c, R);
  var KB = kasBal(P),
    sm = KB.sm,
    mName = KB.mName,
    A = KB.A,
    bal = KB.bal,
    sf = amanHariIni(bal, sm),
    chip = '<span class="chip on" style="margin:0;font-size:11px;font-weight:700">' + esc(P.name) + '</span>',
    label, big, neg, sub, hint = '';
  if (sf) {
    label = 'Aman dipakai hari ini';
    neg = sf.free <= 0;
    big = neg ? '&minus;' + rp(Math.abs(sf.free)) + '<small>kurang</small>' : rp(sf.perDay) + '<small>/ hari</small>';
    sub = neg
      ? 'Saldo ' + rp(bal) + ' belum cukup untuk ' + sf.n + ' tagihan sampai akhir bulan (butuh ' + rp(sf.due) + (sf.inv ? ', termasuk investasi ' + rp(sf.inv) : '') + ').'
      : 'Bebas dipakai ' + rp(sf.free) + ' selama ' + sf.left + ' hari ke depan, setelah ' + sf.n + ' tagihan bulan ini (' + rp(sf.due) + (sf.inv ? ', termasuk investasi ' + rp(sf.inv) : '') + ') dibayar.';
    if (!sf.sameMonth)
      hint = '<span class="hm-hint">Bulan saldo (' + mName + ') bukan bulan ini &mdash; ubah &ldquo;Bulan saldo&rdquo; agar angka ini akurat.</span>';
    if (!neg)
      hint += '<div class="sub mt4">Hanya menghitung sisa ' + mName + '; tagihan bulan berikutnya belum dikurangi.</div>';
  } else {
    label = 'Saldo Realtime &middot; ' + mName;
    neg = bal < 0;
    big = rp(bal);
    sub = 'Saldo kas tercatat sampai ' + mName + '.';
  }
  return heroHtml(c, R, function () {
    return (
      '<div class="card hm m0"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
      '<div class="sub fw6">' + label + '</div>' + chip + '</div>' +
      '<div class="big' + (neg ? ' neg' : '') + '" style="margin:6px 0 4px">' + big + '</div>' +
      '<div class="sub pv">' + sub + '</div>' + hint +
      '<div class="hm-bal">' +
      (sf ? '<div><span>Saldo Realtime &middot; ' + mName + '</span><b class="pv' + (bal < 0 ? ' neg' : '') + '">' + rp(bal) + '</b></div>' : '') +
      '<div><span>Sisa saldo akhir Des ' + S.year + '</span><b class="pv' + (c.end < 0 ? ' neg' : '') + '">' + rp(c.end) + '</b></div></div>' +
      kasStatusHtml(P, bal) + '</div>'
    );
  }, A.n);
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
  $('v-rincian').innerHTML = (S.items.length ? '' : emptyItemsHtml()) + saldoHero(c, R) + flowChart(R) + categoryHtml(c) + cicilanHtml() + table;
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
    var r = e.target.closest('tr.row');
    if (r) {
      openRows[r.dataset.m] = !openRows[r.dataset.m];
      renderRincian();
    }
  };
}
