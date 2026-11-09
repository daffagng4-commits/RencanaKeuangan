/**
 * Operasi pada item (tagihan): pencarian, salinan, perbandingan, kategori,
 * serta menjaga status lunas/lewati saat jadwal bergeser.
 */

/** Cari item (di tahun aktif) berdasarkan id. */
function item(id) {
  return S.items.filter(function (x) {
    return x.id == id;
  })[0];
}

/** Dua item dianggap sama (dipakai untuk mencegah duplikat saat impor/bawa jadwal). */
function sameItem(a, b) {
  return (
    a.name === b.name &&
    a.price === b.price &&
    a.n === b.n &&
    a.unit === b.unit &&
    a.start === b.start &&
    (a.end || '') === (b.end || '') &&
    (+a.cnt || 0) === (+b.cnt || 0)
  );
}

/** Salinan item dengan id baru (termasuk riwayat perubahan harga/jadwal dan kategori). */
function cloneItem(it, id) {
  return {
    id: id,
    name: it.name,
    price: it.price,
    n: it.n,
    unit: it.unit,
    start: it.start,
    end: it.end || '',
    cnt: +it.cnt || 0,
    pokok: +it.pokok || 0,
    cat: it.cat || '',
    ch: (it.ch || []).map(function (q) {
      var c = { from: q.from, to: q.to || '', price: q.price, n: q.n, unit: q.unit, cut: !!q.cut };
      if (q.dates) c.dates = q.dates.slice();
      if (q.anchor) c.anchor = q.anchor;
      if (q.mv) c.mv = Object.assign({}, q.mv);
      return c;
    }),
  };
}

var DEFAULT_CATEGORIES = [
  'Langganan',
  'Tagihan rutin',
  'Kesehatan',
  'Investasi',
  'Transport',
  'Hiburan',
  'Pendidikan',
  'Lainnya',
];

/** Kategori yang dihitung sebagai investasi (uang pindah ke aset, bukan biaya hidup): mengandung kata kunci ini. */
var INVEST_RE = /invest|dca|saham|reksa|etf|sbn|obligasi|emas|kripto|crypto/i;
function isInvestCat(cat) {
  return INVEST_RE.test(String(cat || ''));
}

/** Daftar kategori untuk saran: bawaan + yang sudah dipakai di semua tahun. */
function allCategories() {
  var seen = {},
    out = [];
  DEFAULT_CATEGORIES.concat(
    Object.keys(ALL.data).reduce(function (acc, k) {
      return acc.concat(
        ALL.data[k].items.map(function (it) {
          return it.cat;
        }),
      );
    }, []),
  ).forEach(function (c) {
    if (c && !seen[c]) {
      seen[c] = 1;
      out.push(c);
    }
  });
  return out;
}

/**
 * Pindahkan status lunas/lewati ke tanggal baru terdekat (maks. 20 hari) saat tanggal tagihan
 * bergeser. Hanya status yang tanggal lamanya HILANG dari jadwal yang dipindah.
 * @param before,after daftar tanggal (ms) tagihan item sebelum/sesudah perubahan
 * @param maps [S.paid, S.skip] @param follow peta pengikut, mis. [S.real]
 * @returns jumlah status yang dipindah
 */
function remapStatus(itemId, before, after, maps, follow) {
  var beforeSet = {},
    afterSet = {},
    used = {},
    moves = [],
    moved = 0,
    prefix = String(itemId) + '|';
  before.forEach(function (t) {
    beforeSet[isoD(t)] = 1;
  });
  after.forEach(function (t) {
    afterSet[isoD(t)] = 1;
  });
  var pool = after.map(isoD).filter(function (d) {
    return !beforeSet[d];
  });
  var hasStatus = function (d) {
    return maps.some(function (m) {
      return m[prefix + d];
    });
  };
  maps.forEach(function (map) {
    Object.keys(map)
      .filter(function (k) {
        return k.indexOf(prefix) === 0;
      })
      .map(function (k) {
        return k.slice(prefix.length);
      })
      .filter(function (d) {
        return beforeSet[d] && !afterSet[d];
      })
      .sort()
      .forEach(function (d) {
        // Pilih tanggal baru terdekat (maks. 20 hari); bila seri, utamakan bulan kalender yang sama.
        var t0 = Date.parse(d + 'T00:00:00Z'),
          best = null,
          bestScore = Infinity;
        pool.forEach(function (c) {
          if (used[c] || hasStatus(c)) return;
          var diff = Math.abs(Date.parse(c + 'T00:00:00Z') - t0);
          if (diff > 20 * 864e5) return;
          var score = (c.slice(0, 7) === d.slice(0, 7) ? 0 : 1e13) + diff;
          if (score < bestScore) {
            bestScore = score;
            best = c;
          }
        });
        if (best) {
          used[best] = 1;
          map[prefix + best] = map[prefix + d];
          delete map[prefix + d];
          moves.push([d, best]);
          moved++;
        }
      });
  });
  // peta pengikut (mis. S.real): ikut pindah bersama status yang dipindah, tanpa memengaruhi hitungan
  (follow || []).forEach(function (m) {
    moves.forEach(function (p) {
      if (m[prefix + p[0]] != null && m[prefix + p[1]] == null) {
        m[prefix + p[1]] = m[prefix + p[0]];
        delete m[prefix + p[0]];
      }
    });
  });
  return moved;
}

/**
 * Pindahkan status lunas/lewati secara PERSIS dari tanggal lama ke tanggal baru (dipakai saat menggeser tagihan,
 * karena kedua tanggalnya diketahui; remapStatus hanya menebak tanggal terdekat maks. 20 hari).
 * @param pairs [[tanggalLama, tanggalBaru], ...] @param maps [S.paid, S.skip] @returns jumlah status yang dipindah
 */
function moveStatusExact(itemId, pairs, maps, follow) {
  var prefix = String(itemId) + '|',
    moved = 0;
  pairs.forEach(function (p) {
    if (!p || !p[0] || !p[1] || p[0] === p[1]) return;
    var has = maps.some(function (m) {
      return m[prefix + p[1]];
    });
    if (has) return;
    maps.forEach(function (m) {
      if (m[prefix + p[0]]) {
        m[prefix + p[1]] = m[prefix + p[0]];
        delete m[prefix + p[0]];
        moved++;
      }
    });
    (follow || []).forEach(function (m) {
      if (m[prefix + p[0]] != null) {
        m[prefix + p[1]] = m[prefix + p[0]];
        delete m[prefix + p[0]];
      }
    });
  });
  return moved;
}

/** Jalankan `mutate()` yang mengubah jadwal item `it` (tahun aktif) sambil menjaga status lunas/lewati. */
function trackSchedule(it, mutate) {
  var before = occ(it, S.year);
  mutate();
  return remapStatus(it.id, before, occ(it, S.year), [S.paid, S.skip], [S.real || {}]);
}

/**
 * Bawa penyesuaian saldo BERULANG dari tahun `src` ke tahun aktif (S): mulai di kemunculan pertama
 * pada tahun aktif, sisa jumlah kali dikurangi yang sudah lewat. Penyesuaian sekali tidak dibawa.
 * @returns jumlah yang dibawa
 */
function carryAdjustments(src) {
  var target = S.year * 12,
    n = 0;
  (src.adj || []).forEach(function (a, i) {
    if (!a.rep) return;
    var a0 = src.year * 12 + a.m,
      k0 = Math.max(0, Math.ceil((target - a0) / a.rep.n));
    if (a.rep.cnt && k0 >= a.rep.cnt) return;
    var m2 = a0 + k0 * a.rep.n - target;
    if (m2 > 11) return;
    var copy = {
      id: Date.now() + i,
      t: a.t,
      amt: a.amt,
      note: a.note,
      m: m2,
      rep: { n: a.rep.n, cnt: a.rep.cnt ? a.rep.cnt - k0 : 0 },
      at: isoD(Date.now()),
    };
    var dup = S.adj.some(function (x) {
      return (
        x.t === copy.t &&
        x.amt === copy.amt &&
        x.note === copy.note &&
        x.m === copy.m &&
        x.rep &&
        x.rep.n === copy.rep.n
      );
    });
    if (!dup) {
      S.adj.push(copy);
      n++;
    }
  });
  return n;
}
