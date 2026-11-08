/**
 * Mesin jadwal (murni): menghitung tanggal tagihan dari tanggal mulai, siklus, batas berhenti, dan perubahan harga/jadwal (ch).
 */

function at(it, k) {
  var p = it.start.split('-').map(Number),
    n = Math.min(1000, Math.max(1, +it.n || 1)),
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

/** Tanggal mulai efektif sebuah perubahan: bila tagihan digeser ke tanggal yang LEBIH AWAL (anchor < from), tanggal barunya ikut dihitung sebagai bagian perubahan itu. */
function segStart(s) {
  return s.anchor && s.anchor < s.from ? s.anchor : s.from;
}

function segAt(it, iso) {
  var c = it.ch || [],
    i,
    s;
  for (i = c.length - 1; i >= 0; i--) {
    s = c[i];
    if (s.mv) continue;
    if (s.dates) {
      if (s.dates.indexOf(iso) >= 0) return s;
    } else if (segStart(s) <= iso && (!s.to || iso <= s.to)) return s;
  }
  return null;
}

/** Segmen jadwal aktif untuk tanggal tertentu (khusus siklus / frekuensi). */
function schedSegAt(it, iso) {
  var c = it.ch || [],
    i,
    s;
  for (i = c.length - 1; i >= 0; i--) {
    s = c[i];
    if (s.mv || s.dates) continue;
    if (!s.n && !s.unit) continue;
    if (segStart(s) <= iso && (!s.to || iso <= s.to)) return s;
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
    s = schedSegAt(it, isoD(t));
    if (!s) out.push(t);
    if (it.unit === 'sekali') break;
  }
  (it.ch || []).forEach(function (g) {
    if (!g.n && !g.unit) return;
    var sub = { start: g.anchor || g.from, n: g.n || it.n, unit: g.unit || it.unit },
      lim = g.to ? Date.parse(g.to + 'T00:00:00Z') : endMs;
    for (k = 0; k < 4000; k++) {
      t = at(sub, k);
      if (t > endMs || t > lim) break;
      if (schedSegAt(it, isoD(t)) === g) out.push(t);
      if (sub.unit === 'sekali') break;
    }
  });
  out.sort(function (a, b) {
    return a - b;
  });
  out = out.filter(function (t, i) {
    return i === 0 || t !== out[i - 1];
  });
  var mvs = {},
    add = [];
  (it.ch || []).forEach(function (g) {
    if (g.mv)
      Object.keys(g.mv).forEach(function (k) {
        mvs[k] = g.mv[k];
      });
  });
  if (Object.keys(mvs).length) {
    out = out.filter(function (t) {
      var d = isoD(t);
      if (!mvs[d]) return true;
      add.push(Date.parse(mvs[d] + 'T00:00:00Z'));
      return false;
    });
    out = out.concat(add).sort(function (a, b) {
      return a - b;
    });
    out = out.filter(function (t, i) {
      return i === 0 || t !== out[i - 1];
    });
  }
  var cn = +it.cnt || 0,
    le = it.end ? Date.parse(it.end + 'T00:00:00Z') : 0;
  if (cn) out = out.slice(0, cn);
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

/** Tanggal asli sebuah tagihan yang sudah digeser satu per satu (mv); bila tidak digeser, tanggalnya sendiri. */
function origDate(it, iso) {
  var c = it.ch || [],
    i,
    k;
  for (i = c.length - 1; i >= 0; i--)
    if (c[i].mv) for (k in c[i].mv) if (c[i].mv[k] === iso) return k;
  return iso;
}

/** Kebalikan origDate: tanggal tagihan SAAT INI untuk tanggal ASLI `iso` (bila tagihan itu sudah digeser). */
function curDate(it, iso) {
  var c = it.ch || [],
    i;
  for (i = c.length - 1; i >= 0; i--) if (c[i].mv && c[i].mv[iso]) return c[i].mv[iso];
  return iso;
}

/**
 * Perubahan yang berlaku untuk tagihan yang tampil pada tanggal `iso`. Perubahan "hanya tanggal ini" disimpan dengan tanggal
 * ASLI tagihan; data lama bisa tersimpan dengan tanggal yang tampil (setelah digeser), jadi keduanya dicocokkan.
 * Yang terakhir di daftar (terbaru) menang.
 */
function priceSeg(it, iso) {
  var o = origDate(it, iso),
    c = it.ch || [],
    i,
    s;
  for (i = c.length - 1; i >= 0; i--) {
    s = c[i];
    if (s.mv) continue;
    if ((s.n || s.unit || s.anchor) && s.price == null) continue;
    if (s.dates) {
      if (s.dates.indexOf(o) >= 0 || s.dates.indexOf(iso) >= 0) return s;
    } else if (segStart(s) <= iso && (!s.to || iso <= s.to)) return s;
  }
  return null;
}

/** Dua perubahan dianggap sama (yang baru menggantikan yang lama): tanda tangan sama, atau sama-sama "hanya tanggal ini" untuk tagihan yang sama. */
function chSame(it, a, b) {
  if (chSig(a) === chSig(b)) return true;
  if (a.dates && b.dates) {
    var norm = function (g) {
      return g.dates
        .map(function (d) {
          return origDate(it, d);
        })
        .sort()
        .join(',');
    };
    return norm(a) === norm(b);
  }
  return false;
}

/** Harga item pada tanggal t (ms), memperhitungkan perubahan harga. */
function priceAt(it, t) {
  var s = priceSeg(it, isoD(t));
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
