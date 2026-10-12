/**
 * Tab Jadwal Bayar: tabel item x bulan, chip tanggal berstatus, menu status, ringkasan.
 * Status chip: normal | lunas (✓) | dilewati (dicoret) | terlambat (merah) | harga berbeda (biru putus-putus).
 */

var LEGEND_HTML =
  '<div class="lgd">' +
  '<span><button class="pd" type="button" tabindex="-1" disabled>10</button>Harga sama dengan harga awal</span>' +
  '<span><button class="pd chg" type="button" tabindex="-1" disabled>1<span class="cp">720rb</span></button>Harga beda dari harga awal (angka kecil = harga berlaku)</span>' +
  '<span><button class="pd on" type="button" tabindex="-1" disabled>&#10003; 10</button>Sudah dibayar</span>' +
  '<span><button class="pd late" type="button" tabindex="-1" disabled>10</button>Terlambat (lewat tanggal, belum ditandai)</span>' +
  '<span><button class="pd skp" type="button" tabindex="-1" disabled>10</button>Dilewati (tidak dibayar, tidak dihitung)</span>' +
  '<span><b style="color:var(--mut)">0</b>Tidak ada tagihan bulan itu</span></div>';

/** Chip satu tanggal tagihan (tombol yang membuka menu status). */
function chipHtml(it, t, today) {
  var d = isoD(t),
    key = it.id + '|' + d,
    paid = S.paid[key],
    skipped = S.skip[key],
    price = priceAt(it, t),
    changed = !skipped && price !== it.price,
    late = !paid && !skipped && isLateISO(d, today);
  var cls = 'pd' + (skipped ? ' skp' : paid ? ' on' : late ? ' late' : '') + (changed ? ' chg' : '');
  var state = skipped
    ? ' (dilewati)'
    : paid
      ? ' (sudah dibayar)'
      : late
        ? ' (terlambat)'
        : ' (belum dibayar)';
  return (
    '<button class="' +
    cls +
    '" data-pk="' +
    key +
    '" title="' +
    fd(t) +
    ' - ' +
    rp(price) +
    state +
    '" aria-pressed="' +
    (paid ? 'true' : 'false') +
    '">' +
    (skipped ? '' : paid ? '✓ ' : '') +
    new Date(t).getUTCDate() +
    (changed ? '<span class="cp">' + shortP(price) + '</span>' : '') +
    '</button>'
  );
}

/** Satu baris tabel: nama item, harga, 12 kolom bulan, total. */
function jadwalRow(it, c, today) {
  var o = c.occs[it.id],
    active = o.filter(function (t) {
      return !S.skip[it.id + '|' + isoD(t)];
    }),
    byMonth = [[], [], [], [], [], [], [], [], [], [], [], []];
  o.forEach(function (t) {
    byMonth[new Date(t).getUTCMonth()].push(t);
  });
  var cells = byMonth
    .map(function (list) {
      return list.length
        ? '<td class="cell">' +
            list
              .map(function (t) {
                return chipHtml(it, t, today);
              })
              .join('') +
            '</td>'
        : '<td class="z">0</td>';
    })
    .join('');
  var paidCount = active.filter(function (t) {
    return S.paid[it.id + '|' + isoD(t)];
  }).length;
  return (
    '<tr data-r="' +
    it.id +
    '"><td><b>' +
    esc(it.name) +
    '</b><div class="sub">' +
    every(it) +
    (it.cat ? ' · ' + esc(it.cat) : '') +
    '</div>' +
    chSub(it) +
    '<button class="g" data-pm="' +
    it.id +
    '">&#9998; <span class="lbd">Ubah harga / jadwal</span><span class="lbm">Ubah</span></button></td>' +
    '<td>' +
    pcell(it, o) +
    '</td>' +
    cells +
    '<td><b>' +
    rp(sumP(it, active)) +
    '</b><div class="sub">' +
    paidCount +
    '/' +
    active.length +
    ' lunas' +
    (o.length > active.length ? ' · ' + (o.length - active.length) + ' dilewati' : '') +
    '</div></td></tr>'
  );
}

/** Kartu ringkasan: sudah dibayar / belum dibayar / dilewati. */
function jadwalSummary(c) {
  var total = 0,
    paid = 0,
    nPaid = 0,
    nAll = 0,
    nSkip = 0;
  S.items.forEach(function (it) {
    (c.occs[it.id] || []).forEach(function (t) {
      var key = it.id + '|' + isoD(t);
      if (S.skip[key]) {
        nSkip++;
        return;
      }
      var price = priceAt(it, t);
      total += price;
      nAll++;
      if (S.paid[key]) {
        paid += price;
        nPaid++;
      }
    });
  });
  return (
    '<div class="card stats"><div><span>Sudah dibayar</span><b>' +
    rp(paid) +
    '</b><span>' +
    nPaid +
    ' dari ' +
    nAll +
    ' tagihan</span></div>' +
    '<div><span>Belum dibayar</span><b>' +
    rp(total - paid) +
    '</b><span>' +
    (nAll - nPaid) +
    ' tagihan</span></div>' +
    (nSkip ? '<div><span>Dilewati</span><b>' + nSkip + ' tagihan</b><span>tidak dihitung</span></div>' : '') +
    '</div>'
  );
}

/** Render tab Jadwal Bayar. */
function renderJadwal() {
  var c = calc(),
    today = todayISO(),
    y = S.year;
  var head =
    '<div class="card"><h2>Jadwal pembayaran ' +
    y +
    '</h2><div class="sub" style="margin-bottom:8px">' +
    'Klik tanggal untuk memilih: sudah dibayar, dilewati (tidak bayar), atau belum dibayar. ' +
    'Pakai "Ubah harga / jadwal" untuk mengubah harga atau siklus mulai tanggal tertentu.' +
    (S.startMonth ? ' Bulan sebelum ' + MON[S.startMonth] + ' tidak dihitung.' : '') +
    '</div>' +
    LEGEND_HTML +
    '<div class="tw"><table><thead><tr><th>Item</th><th>Biaya</th>' +
    MON.map(function (m) {
      return '<th>' + m + '</th>';
    }).join('') +
    '<th>Total</th></tr></thead><tbody>';
  var rows =
    S.items
      .map(function (it) {
        return jadwalRow(it, c, today);
      })
      .join('') ||
    '<tr><td colspan="15" class="empty">Belum ada item. Tambahkan di tab Kelola Item.</td></tr>';
  var monthTotals = MON.map(function (_, m) {
    var r = c.rows.filter(function (x) {
      return x.m === m;
    })[0];
    return '<td>' + (r ? (r.sp / 1000).toLocaleString('id-ID') + 'rb' : '0') + '</td>';
  }).join('');
  var foot =
    '<tr class="tot"><td>Total per bulan</td><td></td>' +
    monthTotals +
    '<td>' +
    rp(c.total) +
    '</td></tr></tbody></table></div></div>';
  $('v-jadwal').innerHTML = jadwalSummary(c) + head + rows + foot;
}

/** Baris kecil di bawah nama item: ringkasan perubahan siklus. */
function chSub(it) {
  var L = (it.ch || [])
    .filter(function (g) {
      return g.n || g.unit || g.cut;
    })
    .map(function (g) {
      return (
        '&#8627; mulai ' +
        fmtD(g.from) +
        (g.to ? ' s/d ' + fmtD(g.to) : '') +
        (g.n || g.unit ? ': tiap ' + (g.n || it.n) + ' ' + (g.unit || it.unit) : '') +
        (g.cut ? ' (tagihan sebelumnya dihapus)' : '')
      );
    });
  return (
    L.slice(-2)
      .map(function (x) {
        return '<div class="sub">' + x + '</div>';
      })
      .join('') + (L.length > 2 ? '<div class="sub">+' + (L.length - 2) + ' perubahan lain</div>' : '')
  );
}

/** Sel kolom Biaya: harga yang berlaku tahun ini + keterangan perubahan. */
function pcell(it, o) {
  o = o || [];
  var n = (it.ch || []).length,
    p0 = o.length ? priceAt(it, o[0]) : it.price,
    pl = o.length ? priceAt(it, o[o.length - 1]) : p0,
    s = [];
  if (pl !== p0) {
    var f = o.filter(function (t) {
      return priceAt(it, t) !== p0;
    })[0];
    s.push('&rarr; ' + rp(pl) + ' mulai ' + fd(f, { day: 'numeric', month: 'short' }));
  }
  if (p0 !== it.price) s.push('harga awal ' + rp(it.price));
  if (n) s.push(n + ' perubahan');
  return rp(p0) + (s.length ? '<div class="sub">' + s.join('<br>') + '</div>' : '');
}

/** Tutup menu status chip. */
function cmClose() {
  $('cm').hidden = true;
}

/** Menu status di dekat chip yang diklik. */
function openCm(b) {
  var k = b.dataset.pk,
    p = k.split('|'),
    it = item(p[0]);
  if (!it) return;
  var st = S.skip[k] ? 'skip' : S.paid[k] ? 'paid' : 'none',
    m = $('cm');
  var btn = function (s, label) {
    return '<button data-st="' + s + '"' + (st === s ? ' class="on"' : '') + '>' + label + '</button>';
  };
  m.innerHTML =
    '<div class="cmh"><b>' +
    esc(it.name) +
    '</b><br><span class="sub">' +
    fmtD(p[1]) +
    ' &middot; ' +
    rp(priceAt(it, Date.parse(p[1] + 'T00:00:00Z'))) +
    '</span></div>' +
    btn('paid', '&#10003; Sudah dibayar') +
    btn('skip', '&#10140; Lewati (tidak bayar)') +
    btn('none', 'Belum dibayar') +
    '<button data-st="range">Ubah beberapa tagihan&hellip;</button>';
  m.dataset.k = k;
  m.hidden = false;
  var r = b.getBoundingClientRect(),
    mw = m.offsetWidth || 220,
    mh = m.offsetHeight || 210;
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - mw - 8)) + 'px';
  m.style.top = (r.bottom + mh + 10 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
}

/** Pasang event listener halaman ini. */
function bindJadwal() {
  $('cm').onclick = function (e) {
    var b = e.target.closest('button[data-st]');
    if (!b) return;
    var k = this.dataset.k,
      st = b.dataset.st;
    cmClose();
    if (st === 'range') {
      var p = k.split('|');
      openRange(p[0], p[1]);
      return;
    }
    delete S.paid[k];
    delete S.skip[k];
    if (st === 'paid') S.paid[k] = 1;
    if (st === 'skip') S.skip[k] = 1;
    save();
    renderAll();
  };
  document.addEventListener('click', function (e) {
    var m = $('cm');
    if (!m.hidden && !m.contains(e.target) && !e.target.closest('button[data-pk]')) cmClose();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cmClose();
  });
  addEventListener('scroll', cmClose, true);
  addEventListener('resize', cmClose);
  $('v-jadwal').onclick = function (e) {
    var m = e.target.closest('button[data-pm]');
    if (m) {
      openPm(m.dataset.pm);
      return;
    }
    var b = e.target.closest('button[data-pk]');
    if (b) openCm(b);
  };
}
