/**
 * Mesin jadwal (murni): menghitung tanggal tagihan dari tanggal mulai, siklus, batas berhenti, dan perubahan harga/jadwal (ch).
 */

function at(it, k) {
  var p = it.start.split('-').map(Number),
    n = Math.max(1, +it.n || 1),
    u = it.unit;
  if (u === 'hari') return Date.UTC(p[0], p[1] - 1, p[2] + k * n);
  if (u === 'minggu') return Date.UTC(p[0], p[1] - 1, p[2] + k * n * 7);
  var tm = p[1] - 1 + k * n * (u === 'tahun' ? 12 : 1),
    y = p[0] + Math.floor(tm / 12),
    m = tm % 12,
    dd = Math.min(p[2], new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return Date.UTC(y, m, dd);
}

/** Perubahan (ch) yang berlaku pada tanggal ISO tertentu; yang mulainya paling akhir menang. null = pengaturan awal item. */
function segAt(it, iso) {
  var c = it.ch || [],
    i,
    s;
  for (i = c.length - 1; i >= 0; i--) {
    s = c[i];
    if (s.from <= iso && (!s.to || iso <= s.to)) return s;
  }
  return null;
}

/** Semua tanggal tagihan item (ms UTC) sampai endMs: jadwal awal + siklus baru dari perubahan, dikurangi tagihan yang dihapus (cut), batas jumlah kali (cnt) dan tanggal berhenti (end). */
function series(it, endMs) {
  var out = [],
    k,
    t,
    s;
  for (k = 0; k < 4000; k++) {
    t = at(it, k);
    if (t > endMs) break;
    s = segAt(it, isoD(t));
    if (!s || (!s.n && !s.unit)) out.push(t);
    if (it.unit === 'sekali') break;
  }
  (it.ch || []).forEach(function (g) {
    if (!g.n && !g.unit) return;
    var sub = { start: g.from, n: g.n || it.n, unit: g.unit || it.unit },
      lim = g.to ? Date.parse(g.to + 'T00:00:00Z') : endMs;
    for (k = 0; k < 4000; k++) {
      t = at(sub, k);
      if (t > endMs || t > lim) break;
      if (segAt(it, isoD(t)) === g) out.push(t);
      if (sub.unit === 'sekali') break;
    }
  });
  out.sort(function (a, b) {
    return a - b;
  });
  out = out.filter(function (t, i) {
    return i === 0 || t !== out[i - 1];
  });
  var cut = 0;
  (it.ch || []).forEach(function (g) {
    if (g.cut) {
      var cf = Date.parse(g.from + 'T00:00:00Z');
      if (cf > cut) cut = cf;
    }
  });
  if (cut)
    out = out.filter(function (t) {
      return t >= cut;
    });
  var cn = +it.cnt || 0,
    le = it.end ? Date.parse(it.end + 'T00:00:00Z') : 0;
  if (cn) out = out.slice(0, cn);
  if (le)
    out = out.filter(function (t) {
      return t <= le;
    });
  return out;
}

/** Tanggal tagihan item pada tahun y. */
function occ(it, y) {
  return series(it, Date.UTC(y, 11, 31)).filter(function (t) {
    return new Date(t).getUTCFullYear() === y;
  });
}

/** c tanggal tagihan pertama item (untuk pratinjau form). */
function nextDates(it, c) {
  return series(it, Date.UTC(+it.start.slice(0, 4) + 40, 11, 31)).slice(0, c);
}

/** Teks siklus, mis. "tiap 3 bulan, 12 kali". */
function every(it) {
  return (
    (it.unit === 'sekali' ? 'sekali saja' : 'tiap ' + (it.n > 1 ? it.n + ' ' : '') + it.unit) +
    (it.cnt ? ', ' + it.cnt + ' kali' : it.end ? ', sampai ' + fd(Date.parse(it.end + 'T00:00:00Z')) : '')
  );
}

/** Harga item pada tanggal t (ms), memperhitungkan perubahan harga. */
function priceAt(it, t) {
  var s = segAt(it, isoD(t));
  return s && s.price != null ? s.price : it.price;
}

/** Jumlah harga semua tanggal tagihan o. */
function sumP(it, o) {
  return o.reduce(function (a, t) {
    return a + priceAt(it, t);
  }, 0);
}

/** Tanggal tagihan terakhir bila item punya batas berhenti; null bila berulang tanpa batas. */
function lastOcc(it) {
  if (!it.end && !+it.cnt) return null;
  var s = series(it, Date.UTC(+it.start.slice(0, 4) + 60, 11, 31));
  return s.length ? s[s.length - 1] : null;
}

/** Pembanding pengurutan perubahan berdasarkan tanggal mulai. */
function cmpFrom(a, b) {
  return a.from < b.from ? -1 : a.from > b.from ? 1 : 0;
}
