/**
 * Tab Jadwal Bayar: tabel item x bulan, chip tanggal berstatus, menu status, ringkasan.
 * Status chip: normal | lunas (✓) | dilewati (dicoret) | terlambat (merah) | harga berbeda (biru putus-putus).
 */

var LEGEND_HTML =
  '<div class="lgd">' +
  '<span><button class="pd" type="button" tabindex="-1" disabled>10</button>Harga sama dengan harga awal</span>' +
  '<span><button class="pd chg" type="button" tabindex="-1" disabled>1<span class="cp">720rb</span></button>Harga beda dari harga awal (angka kecil = harga berlaku)</span>' +
  '<span><button class="pd chg" type="button" tabindex="-1" disabled>1<span class="cp an">720rb &uarr;</span></button>Lonjakan &ge;20% dari harga awal (tanda &uarr; merah, nominal tetap terlihat)</span>' +
  '<span><button class="pd on" type="button" tabindex="-1" disabled>&#10003; 10</button>Sudah dibayar</span>' +
  '<span><button class="pd late" type="button" tabindex="-1" disabled>10</button>Terlewat: sudah lewat tanggal tapi belum ditandai dibayar atau dilewati (merah)</span>' +
  '<span><button class="pd skp" type="button" tabindex="-1" disabled>10</button>Dilewati: sengaja tidak dibayar, tidak dihitung (merah dicoret)</span>' +
  '<span><b class="cmut">0</b>Tidak ada tagihan bulan itu</span></div>';

/** Kotak panduan yang bisa disembunyikan / ditampilkan (pilihan diingat per kotak). */
function gdBox(key, html) {
  return '<div class="gdb"><button type="button" class="g gdt" data-gd="' + key + '"></button><div class="gdc">' + html + '</div></div>';
}

/** Tagihan yang baru saja dilewati (untuk efek getar merah sesaat). */
var FX = { k: '' };

/** Filter aktif untuk tabel jadwal: 'all' | 'open' | 'done'. */
var JADWAL_FILTER = 'all';

/** ID item yang sedang dipin tampil saat filter aktif (mencegah baris melompat saat ditandai lunas). */
var JADWAL_PINNED_IDS = null;
var LAST_JADWAL_YEAR = null;

/** Cek status item terhadap tagihan aktif. */
function getItemFilterStatus(it, c) {
  var o = c.occs[it.id] || [],
    active = o.filter(function (t) {
      return !S.skip[it.id + '|' + isoD(t)];
    });
  var paidCount = active.filter(function (t) {
    return S.paid[it.id + '|' + isoD(t)];
  }).length;
  var isDone = active.length > 0 && paidCount === active.length;
  var hasUnpaid = active.some(function (t) {
    return !S.paid[it.id + '|' + isoD(t)];
  });
  return {
    hasNoOccs: active.length === 0,
    hasUnpaid: hasUnpaid,
    isDone: isDone,
    paidCount: paidCount,
    activeCount: active.length,
    active: active,
    occs: o
  };
}

/** Chip satu tanggal tagihan (tombol yang membuka menu status). */
function chipHtml(it, t, today) {
  var d = isoD(t),
    key = it.id + '|' + d,
    paid = S.paid[key],
    skipped = S.skip[key],
    price = priceAt(it, t),
    changed = !skipped && price !== it.price,
    now = today || todayISO(),
    late = !paid && !skipped && d < now,
    old = late && !isLateISO(d, now),
    days = late ? Math.round((Date.parse(now + 'T00:00:00Z') - Date.parse(d + 'T00:00:00Z')) / 864e5) : 0;
  var diffPct = it.price ? Math.round(((price - it.price) / it.price) * 100) : 0,
    anom = !skipped && diffPct >= 20;
  var cls = 'pd' + (skipped ? ' skp' : paid ? ' on' : late ? ' late' + (old ? ' old' : '') : '') + (anom ? ' wr' : changed ? ' chg' : '') + (FX.k === key ? ' fx-skip' : '');
  var state = skipped
    ? ' (dilewati)'
    : paid
      ? ' (sudah dibayar)'
      : late
        ? ' (terlewat ' + days + ' hari)'
        : ' (belum dibayar)';
  if (anom) state += ' [Lonjakan +' + diffPct + '%]';
  return (
    '<button type="button" class="' +
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
    (changed ? '<span class="cp pv' + (anom ? ' an' : '') + '"' + (anom ? ' title="Lonjakan +' + diffPct + '% dari harga awal"' : '') + '>' + shortP(price) + (anom ? ' &uarr;' : '') + '</span>' : '') +
    '</button>'
  );
}

/** Satu baris tabel: nama item, harga, 12 kolom bulan, total. */
function jadwalRow(it, c, today, firstNegDate) {
  var st = getItemFilterStatus(it, c),
    o = st.occs,
    active = st.active,
    paidCount = st.paidCount,
    isDone = st.isDone;

  var byMonth = [[], [], [], [], [], [], [], [], [], [], [], []];
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

  var hasNeg = firstNegDate && o.some(function (t) { return isoD(t) === firstNegDate && !S.skip[it.id + '|' + isoD(t)]; });

  var maxPrice = 0;
  o.forEach(function (t) {
    var p = priceAt(it, t);
    if (p > maxPrice) maxPrice = p;
  });
  var diffPct = it.price ? Math.round(((maxPrice - it.price) / it.price) * 100) : 0;
  var hasSpike = diffPct >= 20;

  var badges = [];
  if (hasNeg) {
    badges.push('<span class="chip wr">⚠ Membuat saldo minus</span>');
  }
  if (hasSpike) {
    badges.push('<span class="chip wr">▲ +' + diffPct + '% anomali</span>');
  }
  if (isDone) {
    badges.push('<span class="doneTag">Lunas semua</span>');
  }
  var badgesHtml = badges.length ? '<div class="tags">' + badges.join(' ') + '</div>' : '';

  return (
    '<tr data-r="' +
    it.id +
    '"' +
    (isDone ? ' class="done" style="--i:' + S.items.indexOf(it) + '"' : '') +
    '><td>' +
    (isDone ? '<span class="st ok" role="img" aria-label="Lunas semua">✓</span> ' : '') +
    '<b>' +
    esc(it.name) +
    '</b>' +
    '<div class="sub">' +
    every(it) +
    (it.cat ? ' · ' + esc(it.cat) : '') +
    '</div>' +
    badgesHtml +
    chSub(it) +
    '<button type="button" class="g" data-pm="' +
    it.id +
    '">&#9998; <span class="lbd">Ubah harga / jadwal</span><span class="lbm">Ubah</span></button></td>' +
    '<td>' +
    pcell(it, o) +
    '</td>' +
    cells +
    '<td><b class="pv">' +
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

/** Kartu ringkasan: sudah dibayar / belum dibayar / dilewati (TETAP GLOBAL). */
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
    '<div class="card stats"><div><span>Sudah dibayar</span><b class="pv">' +
    rp(paid) +
    '</b><span>' +
    nPaid +
    ' dari ' +
    nAll +
    ' tagihan</span></div>' +
    '<div><span>Belum dibayar</span><b class="pv">' +
    rp(total - paid) +
    '</b><span>' +
    (nAll - nPaid) +
    ' tagihan</span></div>' +
    (nSkip ? '<div><span>Dilewati</span><b class="pv">' + nSkip + ' tagihan</b><span>tidak dihitung</span></div>' : '') +
    '</div>'
  );
}

/** Hitung daftar baris & total tabel jadwal sesuai filter aktif (mempertahankan item ter-pin). */
function jadwalComputed(c, today, firstNeg) {
  var y = S.year;
  if (LAST_JADWAL_YEAR !== y) {
    LAST_JADWAL_YEAR = y;
    JADWAL_PINNED_IDS = null;
  }

  var countAll = S.items.length,
    countOpen = 0,
    countDone = 0,
    matchingIds = [];

  S.items.forEach(function (it) {
    var st = getItemFilterStatus(it, c);
    if (st.hasUnpaid) countOpen++;
    if (st.isDone) countDone++;

    if (JADWAL_FILTER === 'all') {
      matchingIds.push(it.id);
    } else if (JADWAL_FILTER === 'open') {
      if (st.hasUnpaid) matchingIds.push(it.id);
    } else if (JADWAL_FILTER === 'done') {
      if (st.isDone) matchingIds.push(it.id);
    }
  });

  var itemsToDisplay;
  if (JADWAL_FILTER === 'all') {
    JADWAL_PINNED_IDS = null;
    itemsToDisplay = S.items;
  } else {
    if (JADWAL_PINNED_IDS === null) {
      JADWAL_PINNED_IDS = matchingIds;
    }
    itemsToDisplay = S.items.filter(function (it) {
      return JADWAL_PINNED_IDS.indexOf(it.id) >= 0;
    });
  }

  var rows =
    itemsToDisplay
      .map(function (it) {
        return jadwalRow(it, c, today, firstNeg && firstNeg.date);
      })
      .join('') ||
    '<tr><td colspan="15" class="empty">Tidak ada item pada filter ini.</td></tr>';

  // Total per bulan mengikuti baris yang tampil
  var displayedMonthTotals = MON.map(function (_, m) {
    var sumM = 0;
    itemsToDisplay.forEach(function (it) {
      (c.occs[it.id] || []).forEach(function (t) {
        if (new Date(t).getUTCMonth() === m && !S.skip[it.id + '|' + isoD(t)]) {
          sumM += priceAt(it, t);
        }
      });
    });
    return '<td><span class="pv">' + (sumM ? (sumM / 1000).toLocaleString('id-ID') + 'rb' : '0') + '</span></td>';
  }).join('');

  var displayedTotal = 0;
  itemsToDisplay.forEach(function (it) {
    var active = (c.occs[it.id] || []).filter(function (t) { return !S.skip[it.id + '|' + isoD(t)]; });
    displayedTotal += sumP(it, active);
  });

  var filterLabel = JADWAL_FILTER === 'open' ? 'Belum lunas' : JADWAL_FILTER === 'done' ? 'Lunas' : '';
  var filterNote = filterLabel ? '<div class="sub">(filter: ' + filterLabel + ')</div>' : '';

  var foot =
    '<tr class="tot"><td>Total per bulan' +
    filterNote +
    '</td><td></td>' +
    displayedMonthTotals +
    '<td><b class="pv">' +
    rp(displayedTotal) +
    '</b></td></tr>';

  return {
    countAll: countAll,
    countOpen: countOpen,
    countDone: countDone,
    rows: rows,
    foot: foot
  };
}

/** Perbarui filter & isi tabel di dalam #jadwal-card tanpa memutasi elemen di luar kartu. */
function updateJadwalFilterView() {
  var card = $('jadwal-card');
  if (!card) {
    renderJadwal();
    return;
  }
  var c = calc(),
    today = todayISO(),
    firstNeg = typeof kasFirstNegative === 'function' ? kasFirstNegative() : null,
    d = jadwalComputed(c, today, firstNeg),
    labels = {
      all: 'Semua ' + d.countAll,
      open: 'Belum lunas ' + d.countOpen,
      done: 'Lunas ' + d.countDone
    };
  card.querySelectorAll('.jadwal-flt button[data-f]').forEach(function (b) {
    var k = b.dataset.f;
    if (labels[k] != null) b.textContent = labels[k];
    var on = k === JADWAL_FILTER;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  var tb = card.querySelector('tbody');
  if (tb) tb.innerHTML = d.rows + d.foot;
}

/** Render tab Jadwal Bayar. */
function renderJadwal() {
  var c = calc(),
    today = todayISO(),
    y = S.year,
    firstNeg = typeof kasFirstNegative === 'function' ? kasFirstNegative() : null,
    d = jadwalComputed(c, today, firstNeg);

  var filterSeg =
    '<div class="cat-tabs jadwal-flt" role="group" aria-label="Filter status tagihan">' +
    '<button type="button" class="cat-tab' + (JADWAL_FILTER === 'all' ? ' on' : '') + '" data-f="all" aria-pressed="' + (JADWAL_FILTER === 'all') + '">Semua ' + d.countAll + '</button>' +
    '<button type="button" class="cat-tab' + (JADWAL_FILTER === 'open' ? ' on' : '') + '" data-f="open" aria-pressed="' + (JADWAL_FILTER === 'open') + '">Belum lunas ' + d.countOpen + '</button>' +
    '<button type="button" class="cat-tab' + (JADWAL_FILTER === 'done' ? ' on' : '') + '" data-f="done" aria-pressed="' + (JADWAL_FILTER === 'done') + '">Lunas ' + d.countDone + '</button>' +
    '</div>';

  var head =
    '<div class="card" id="jadwal-card">' +
    '<div class="jadwal-hdr">' +
    '<div><h2>Jadwal pembayaran ' + y + '</h2>' +
    (smEff() ? '<div class="sub mb8">Bulan sebelum ' + MON[smEff()] + ' tidak dihitung.</div>' : '') +
    '</div>' +
    filterSeg +
    '</div>' +
    gdBox(
      'jadwal',
      '<div class="sub mb8">Klik tanggal untuk memilih: sudah dibayar, dilewati (tidak bayar), atau belum dibayar. ' +
        'Pakai "Ubah harga / jadwal" untuk mengubah harga atau siklus mulai tanggal tertentu.</div>' +
        LEGEND_HTML
    ) +
    '<div class="tw"><table><thead><tr><th>Item</th><th>Biaya</th>' +
    MON.map(function (m) {
      return '<th>' + m + '</th>';
    }).join('') +
    '<th>Total</th></tr></thead><tbody>';

  $('v-jadwal').innerHTML = jadwalSummary(c) + head + d.rows + d.foot + '</tbody></table></div></div>';
  gdApply($('v-jadwal'));
}

/** Baris kecil di bawah nama item: ringkasan perubahan siklus. */
function chSub(it) {
  var L = (it.ch || [])
    .filter(function (g) {
      return g.n || g.unit || g.cut || g.mv;
    })
    .map(function (g) {
      if (g.mv) return '&#8627; ' + Object.keys(g.mv).length + ' tagihan digeser ke tanggal lain';
      return (
        '&#8627; ' +
        (g.anchor ? 'tagihan ' + fmtD(g.from) + ' digeser ke ' + fmtD(g.anchor) : 'mulai ' + fmtD(g.from)) +
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
  return '<span class="pv">' + rp(p0) + '</span>' + (s.length ? '<div class="sub">' + s.join('<br>') + '</div>' : '');
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
  var curPrice = priceAt(it, Date.parse(p[1] + 'T00:00:00Z'));
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
    rp(curPrice) +
    '</span></div>' +
    btn('paid', '&#10003; Sudah dibayar') +
    btn('skip', '&#10140; Lewati (tidak bayar)') +
    btn('none', 'Belum dibayar') +
    '<button data-st="range">Ubah beberapa tagihan&hellip;</button>';
  m.dataset.k = k;
  m.hidden = false;
  var r = b.getBoundingClientRect(),
    mw = m.offsetWidth || 230,
    mh = m.offsetHeight || 250;
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
    var sn = st === 'skip' ? snap('Sebelum melewati tagihan') : null;
    delete S.paid[k];
    delete S.skip[k];
    if (st === 'paid') S.paid[k] = 1;
    if (st === 'skip') {
      S.skip[k] = 1;
      FX.k = k;
      try {
        if (navigator.vibrate) navigator.vibrate([25, 35, 25]);
      } catch (er) {}
      setTimeout(function () {
        FX.k = '';
      }, 900);
    }
    save();
    renderAll();
    if (st === 'skip') {
      var it0 = item(k.split('|')[0]);
      toast('Dilewati: ' + (it0 ? it0.name : '') + ' · ' + fmtD(k.split('|')[1]), function () {
        restoreSnap(sn.t);
      });
    }
  };
  document.addEventListener('click', function (e) {
    var m = $('cm');
    if (!m.hidden && !m.contains(e.target) && !e.target.closest('button[data-pk]') && !e.target.closest('tr.det[data-pk]')) cmClose();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cmClose();
  });
  addEventListener('scroll', cmClose, true);
  addEventListener('resize', cmClose);
  $('v-jadwal').onclick = function (e) {
    var fltBtn = e.target.closest('button[data-f]');
    if (fltBtn) {
      var f = fltBtn.dataset.f;
      if (f) {
        JADWAL_FILTER = f;
        JADWAL_PINNED_IDS = null;
        updateJadwalFilterView();
      }
      return;
    }
    var m = e.target.closest('button[data-pm]');
    if (m) {
      openPm(m.dataset.pm);
      return;
    }
    var b = e.target.closest('button[data-pk]');
    if (b) openCm(b);
  };
  $('v-jadwal').addEventListener('keydown', function (e) {
    var fltBtn = e.target.closest && e.target.closest('.jadwal-flt button[data-f]');
    if (!fltBtn) return;
    var btns = Array.prototype.slice.call(fltBtn.parentNode.querySelectorAll('button[data-f]'));
    var idx = btns.indexOf(fltBtn);
    if (idx < 0) return;
    var next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % btns.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + btns.length) % btns.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = btns.length - 1;
    if (next >= 0) {
      e.preventDefault();
      btns[next].focus();
      btns[next].click();
    }
  });
}
