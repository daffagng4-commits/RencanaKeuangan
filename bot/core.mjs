// DIGENERASI oleh build-bot.js — jangan disunting manual.
// Isi: util, schedule, calc, items, match + fungsi murni dari file UI.

/**
 * Helper murni: format uang/tanggal, escape HTML. Tidak menyentuh DOM maupun state.
 */

var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var FULL_MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Urutan = prioritas. Hindari kata umum seperti beli, top up, atau bulan.
var ITEM_NAME_TRIGGERS = [
  { nama: 'Saham Lokal 40%', kata: ['saham lokal', 'bbri'] },
  { nama: 'ETF 60%', kata: ['etf'] },
  { nama: 'BTC', kata: ['btc'] },
  { nama: 'BPJS', kata: ['bpjs'] },
  { nama: 'Warp', kata: ['warp'] },
  { nama: 'Torbox', kata: ['torbox'] },
  { nama: 'Kuota', kata: ['kuota'] },
  { nama: 'Vidio', kata: ['vidio'] },
  { nama: 'JKT48', kata: ['jkt48'] },
  { nama: 'Hutang', kata: ['hutang', 'mamah'] }
];

function itemTriggerMatches(raw) {
  var text = String(raw || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
  return ITEM_NAME_TRIGGERS.filter(function (rule) {
    return rule.kata.some(function (word) {
      var key = word.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
      if (!key) return false;
      var at = text.indexOf(key);
      while (at >= 0) {
        var before = Array.from(text.slice(0, at)).pop() || '', after = Array.from(text.slice(at + key.length))[0] || '';
        if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) return true;
        at = text.indexOf(key, at + 1);
      }
      return false;
    });
  });
}

/** Keterangan pembayaran saja; tanda kurung bermakna dan catatan bebas tetap utuh. */
function normalisasiNamaItem(namaMentah) {
  var matches = itemTriggerMatches(namaMentah);
  if (matches.length) return matches[0].nama;
  var name = String(namaMentah || '').trim().replace(/\s+/g, ' ');
  name = name.replace(/\(\s*(?:lunas|cicil(?:an)?|dari total\b[^()]*)\s*\)/gi, ' ').trim();
  var tail = /\s+(?:lunas|cicil(?:an)?|jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)$/i;
  while (tail.test(name)) name = name.replace(tail, '').trim();
  name = name.replace(/\s+/g, ' ');
  return name || String(namaMentah || '').trim();
}

/** Escape HTML. */
function esc(t) {
  return String(t).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/** Format rupiah: "Rp 1.250.000". */
function rp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Baca input uang: "200k", "1,5jt", "200.000" -> angka. */
function parseRp(s) {
  s = String(s).toLowerCase().replace(/rp|\s/g, '');
  var m = 1;
  if (/(m|miliar|milyar)$/.test(s)) m = 1e9;
  else if (/(jt|juta)$/.test(s)) m = 1e6;
  else if (/(rb|ribu|k)$/.test(s)) m = 1e3;
  s = s.replace(/(m|miliar|milyar|jt|juta|rb|ribu|k)$/, '');
  var v = m > 1 ? parseFloat(s.replace(',', '.')) : parseInt(s.replace(/[.,]/g, ''), 10);
  return isNaN(v) ? 0 : Math.round(v * m);
}

/** Format tanggal (ms UTC) ke bahasa Indonesia. */
function fd(t, o) {
  return new Date(t).toLocaleDateString(
    'id-ID',
    Object.assign({ timeZone: 'UTC' }, o || { day: 'numeric', month: 'short', year: 'numeric' }),
  );
}

/** ms -> "YYYY-MM-DD" (UTC). */
function isoD(t) {
  return new Date(t).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> tanggal terformat. */
function fmtD(d) {
  return fd(Date.parse(d + 'T00:00:00Z'));
}

/** Harga singkat: 720rb, 1,5jt. */
function shortP(p) {
  return p >= 1e6
    ? (p / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + 'jt'
    : p >= 1000
      ? Math.round(p / 1000) + 'rb'
      : String(p);
}

/** Dua digit (01, 02, ...). */
function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Geser tanggal ISO 'YYYY-MM-DD' sebanyak n hari (boleh negatif). */
function addDaysISO(iso, n) {
  return isoD(Date.parse(iso + 'T00:00:00Z') + n * 864e5);
}


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


/**
 * Perhitungan arus kas tahun aktif (S): pengeluaran per bulan, penyesuaian saldo
 * (tunggal & berulang), saldo akhir, dan total per kategori. Murni: hanya membaca S.
 */

/**
 * Bulan (0-11) pada tahun aktif tempat penyesuaian `a` berlaku.
 * `null` berarti "gabung ke saldo awal". Penyesuaian berulang menghasilkan beberapa bulan.
 */
function adjMonths(a) {
  if (!a.rep) return [a.m == null ? null : a.m];
  var out = [];
  for (var k = 0, m = a.m; m <= 11 && (!a.rep.cnt || k < a.rep.cnt); k++, m = a.m + k * a.rep.n) out.push(m);
  return out;
}

/**
 * @returns {{rows, occs, byCat, invest, investM, total, end, open, adjIn, adjLate}}
 *  rows[]: {m, aw (saldo awal bulan), ad (penyesuaian), sp (pengeluaran), ak (saldo akhir), ev, sk}
 *  occs: tanggal tagihan per item (termasuk yang dilewati) | byCat: pengeluaran per kategori
 *  open: saldo awal efektif | end: saldo akhir Desember
 */
function calc() {
  var y = +S.year,
    sm = smEff(),
    from = Date.UTC(y, sm, 1);
  var occs = {},
    byCat = {},
    events = [],
    skipped = [],
    spend = [],
    investM = [],
    invest = 0;
  for (var m = 0; m < 12; m++) {
    events.push([]);
    skipped.push([]);
    spend.push(0);
    investM.push(0);
  }
  S.items.forEach(function (it) {
    var list = occ(it, y).filter(function (t) {
      return t >= from;
    });
    occs[it.id] = list;
    list.forEach(function (t) {
      var mm = new Date(t).getUTCMonth();
      if (S.skip[it.id + '|' + isoD(t)]) {
        skipped[mm].push({ it: it, t: t });
        return;
      }
      var price = priceAt(it, t),
        cat = it.cat || '';
      events[mm].push({ it: it, t: t });
      spend[mm] += price;
      byCat[cat] = (byCat[cat] || 0) + price;
      if (isInvestCat(cat)) {
        invest += price;
        investM[mm] += price;
      }
    });
  });

  var adjIn = 0,
    adjLate = 0,
    adjM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  (S.adj || []).forEach(function (a) {
    var v = a.t === '-' ? -a.amt : a.amt;
    adjMonths(a).forEach(function (mm) {
      if (mm == null || mm <= sm) adjIn += v;
      else {
        adjLate += v;
        adjM[mm] += v;
      }
    });
  });

  var KL = kasLinked();
  if (KL)
    KL.tx.forEach(function (x) {
      if (+x.d.slice(0, 4) !== y) return;
      var mm = +x.d.slice(5, 7) - 1,
        v = x.t === '-' ? -x.amt : x.amt;
      if (mm <= sm) adjIn += v;
      else {
        adjLate += v;
        adjM[mm] += v;
      }
    });

  kasGoals().forEach(function (g) {
    goalMonthsIn(g, y).forEach(function (mm) {
      if (mm <= sm) adjIn -= g.per;
      else {
        adjLate -= g.per;
        adjM[mm] -= g.per;
      }
    });
  });

  var bal = (+S.saldo || 0) + adjIn,
    open = bal,
    rows = [];
  for (var k = sm; k < 12; k++) {
    var ad = adjM[k];
    rows.push({ m: k, aw: bal + ad, ad: ad, sp: spend[k], ak: bal + ad - spend[k], ev: events[k], sk: skipped[k] });
    bal += ad - spend[k];
  }
  return {
    rows: rows,
    occs: occs,
    byCat: byCat,
    invest: invest,
    investM: investM,
    total: spend.reduce(function (a, b) {
      return a + b;
    }, 0),
    end: bal,
    open: open,
    adjIn: adjIn,
    adjLate: adjLate,
  };
}

/** Pemasukan tercatat: baris '+' di Catatan Kas profil tergabung pada tahun aktif, mulai bulan saldo (untuk rasio investasi). */
function incomeYear() {
  var KL = kasLinked(),
    y = +S.year,
    sm = smEff(),
    sum = 0;
  if (KL)
    KL.tx.forEach(function (x) {
      if (x.t === '+' && +x.d.slice(0, 4) === y && +x.d.slice(5, 7) - 1 >= sm) sum += x.amt;
    });
  return sum;
}


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


/**
 * Pencocokan Catatan Kas dengan tagihan (Rencana vs realisasi).
 *
 * Satu transaksi keluar ('-') di profil kas tergabung dapat "ditautkan" ke satu tagihan: S.real[kunciTagihan] = {tx: idTransaksi}.
 * Tagihan yang tertaut otomatis lunas, dan transaksi itulah yang dihitung di kas (baris turunan "(lunas)" milik tagihan itu
 * dilewati) sehingga uangnya tidak terhitung dua kali, dan jumlah serta tanggal realisasi mengikuti transaksi.
 * kunciTagihan = idItem + '|' + 'YYYY-MM-DD'.
 */
var MATCH_DAYS = 10,
  MATCH_STOP = { bayar: 1, tagihan: 1, lunas: 1, bulan: 1, biaya: 1, iuran: 1, transfer: 1, pembayaran: 1, untuk: 1, dari: 1, yang: 1 };

/** Teks dinormalisasi: huruf kecil, tanpa tanda baca. */
function mNorm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kata penting (>= 3 huruf, bukan kata umum) dari sebuah teks. */
function mTokens(s) {
  return mNorm(s)
    .split(' ')
    .filter(function (w) {
      return w.length >= 3 && !MATCH_STOP[w];
    });
}

/** Kemiripan nama tagihan dengan catatan+kategori transaksi: 1 (nama utuh ada), 0.8 (semua kata), 0.6 (sebagian kata), 0. */
function nameScore(tx, it) {
  var a = mNorm((tx.note || '') + ' ' + (tx.cat || '')),
    n = mNorm(it.name);
  if (!a || !n) return 0;
  if (a.indexOf(n) >= 0) return 1;
  var ta = mTokens(a),
    tn = mTokens(n);
  if (!tn.length) return 0;
  var hit = tn.filter(function (w) {
    return ta.indexOf(w) >= 0;
  }).length;
  return !hit ? 0 : hit === tn.length ? 0.8 : 0.6;
}

/** {idTransaksi: kunciTagihan} untuk transaksi yang sedang tertaut ke tagihan yang lunas. */
function linkedTxIds() {
  var out = {};
  Object.keys(S.real || {}).forEach(function (k) {
    var r = S.real[k];
    if (r && r.tx && S.paid[k]) out[r.tx] = k;
  });
  return out;
}

/** Transaksi kas yang tertaut ke tagihan `key` (bila tagihan lunas dan transaksinya masih ada), selain itu null. */
function realTx(key) {
  var r = S.real && S.real[key],
    P = kasLinked();
  if (!r || !r.tx || !S.paid[key] || !P) return null;
  return (
    P.tx.filter(function (x) {
      return x.id === r.tx;
    })[0] || null
  );
}

/** Tagihan yang mungkin cocok dengan transaksi `tx` (tahun aktif, mulai bulan saldo), urut dari yang paling cocok. */
function matchCandidates(tx, includePaid) {
  var y = +S.year,
    from = Date.UTC(y, smEff(), 1),
    t0 = Date.parse(tx.d + 'T00:00:00Z'),
    out = [];
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      if (t < from) return;
      var iso = isoD(t),
        key = it.id + '|' + iso,
        days = Math.round((t0 - t) / 864e5);
      if (Math.abs(days) > MATCH_DAYS || (S.skip && S.skip[key])) return;
      var paid = !!S.paid[key];
      if (paid && (!includePaid || realTx(key))) return;
      var plan = priceAt(it, t),
        rel = plan ? Math.abs(tx.amt - plan) / plan : 1,
        ns = nameScore(tx, it),
        conf =
          ns >= 0.6 && rel <= 0.1 && Math.abs(days) <= 7
            ? 'high'
            : (ns >= 0.6 && rel <= 0.35) || (rel <= 0.02 && Math.abs(days) <= 5)
              ? 'mid'
              : '';
      if (!conf) return;
      out.push({
        it: it,
        t: t,
        key: key,
        iso: iso,
        plan: plan,
        paid: paid,
        rel: rel,
        days: days,
        conf: conf,
        score: ns * 0.6 + (1 - Math.min(1, rel)) * 0.3 + (1 - Math.abs(days) / MATCH_DAYS) * 0.1,
      });
    });
  });
  return out.sort(function (a, b) {
    return b.score - a.score;
  });
}

/**
 * Saran pencocokan untuk profil tergabung: tiap transaksi keluar yang belum tertaut dipasangkan dengan satu tagihan
 * (tanpa berbagi tagihan). kind 'unpaid' = tagihan belum lunas; 'paid' = tagihan SUDAH ditandai lunas (hanya yang yakin),
 * artinya uangnya kini terhitung dua kali (baris lunas + transaksi).
 */
function suggestMatches() {
  var P = kasLinked();
  if (!P) return [];
  var linked = linkedTxIds(),
    dis = {},
    all = [];
  (P.nm || []).forEach(function (id) {
    dis[id] = 1;
  });
  P.tx.forEach(function (tx) {
    if (tx.t !== '-' || +tx.d.slice(0, 4) !== +S.year || linked[tx.id] || dis[tx.id]) return;
    matchCandidates(tx, true).forEach(function (c) {
      if (c.paid && c.conf !== 'high') return;
      all.push({ tx: tx, cand: c, kind: c.paid ? 'paid' : 'unpaid' });
    });
  });
  all.sort(function (a, b) {
    return b.cand.score - a.cand.score;
  });
  var usedTx = {},
    usedKey = {},
    out = [];
  all.forEach(function (p) {
    if (usedTx[p.tx.id] || usedKey[p.cand.key]) return;
    usedTx[p.tx.id] = 1;
    usedKey[p.cand.key] = 1;
    out.push(p);
  });
  return out.sort(function (a, b) {
    return a.tx.d < b.tx.d ? -1 : a.tx.d > b.tx.d ? 1 : 0;
  });
}

/** Tautkan transaksi `txid` ke tagihan `key`: tagihan jadi lunas (tidak dilewati). */
function applyLink(key, txid) {
  S.real = S.real || {};
  S.paid[key] = 1;
  if (S.skip) delete S.skip[key];
  S.real[key] = { tx: txid };
}

/** Lepas tautan (dan status lunas) tagihan `key`. */
function unlinkBill(key) {
  delete S.paid[key];
  if (S.real) delete S.real[key];
}

/** Pencocokan otomatis saat transaksi baru dicatat: hanya bila tepat SATU tagihan yang sangat cocok. @returns kandidat atau null */
function autoMatchTx(tx) {
  var P = kasLinked();
  if (!P || P.auto === false || tx.t !== '-' || +tx.d.slice(0, 4) !== +S.year) return null;
  var c = matchCandidates(tx, false).filter(function (x) {
    return x.conf === 'high';
  });
  if (c.length !== 1) return null;
  applyLink(c[0].key, tx.id);
  return c[0];
}

/**
 * Rencana vs realisasi tahun aktif (mulai bulan saldo), tagihan yang tidak dilewati.
 * Realisasi = jumlah transaksi tertaut; tagihan lunas tanpa transaksi tertaut dianggap sesuai rencana.
 * @returns {{months:Array, rows:Array, planPaid:number, act:number, nPaid:number, nReal:number, late:{n:number,sum:number}}}
 */
function realisasiData() {
  var y = +S.year,
    from = Date.UTC(y, smEff(), 1),
    today = Date.parse(todayISO() + 'T00:00:00Z'),
    months = [],
    rows = [],
    late = { n: 0, sum: 0 },
    tot = { planPaid: 0, act: 0, nPaid: 0, nReal: 0 };
  for (var m = 0; m < 12; m++) months.push({ plan: 0, planPaid: 0, act: 0, n: 0, nPaid: 0, nReal: 0 });
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      if (t < from) return;
      var iso = isoD(t),
        key = it.id + '|' + iso;
      if (S.skip && S.skip[key]) return;
      var plan = priceAt(it, t),
        mo = months[new Date(t).getUTCMonth()],
        paid = !!S.paid[key];
      mo.plan += plan;
      mo.n++;
      if (!paid) {
        if (t < today) {
          late.n++;
          late.sum += plan;
        }
        return;
      }
      var tx = realTx(key),
        act = tx ? tx.amt : plan;
      mo.planPaid += plan;
      mo.act += act;
      mo.nPaid++;
      tot.planPaid += plan;
      tot.act += act;
      tot.nPaid++;
      if (tx) {
        mo.nReal++;
        tot.nReal++;
      }
      rows.push({ it: it, t: t, iso: iso, key: key, plan: plan, act: act, linked: !!tx, tx: tx });
    });
  });
  return { months: months, rows: rows, planPaid: tot.planPaid, act: tot.act, nPaid: tot.nPaid, nReal: tot.nReal, late: late };
}


/* js/core/state.js */
function smEffYear(y, Y) {
  Y = Y || ALL.data[y] || {};
  var t = todayISO();
  if (+y === +t.slice(0, 4) && Y.smManual !== true) return +t.slice(5, 7) - 1;
  return Math.min(11, Math.max(0, +Y.startMonth || 0));
}

/* js/core/state.js */
function smEff() {
  return smEffYear(S.year, S);
}

/* js/core/reminders.js */
function todayISO() {
  if (typeof window !== 'undefined' && window.__today) return window.__today;
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/* js/ui/items.js */
function parseQuickItem(str, yr) {
  if (!str || !str.trim()) return { error: 'Masukkan nama dan nominal tagihan/item.' };
  var s = str.trim();
  var today = new Date();
  var yDefault = yr || (typeof S !== 'undefined' && S.year) || today.getFullYear();
  var start = '';
  var rem = s;

  // 1. Ekstrak tanggal spesifik jika ada
  // a. DD-MM-YYYY atau DD/MM/YYYY (mis. 07-11-2026 atau 7/11/2026)
  var dmyMatch = rem.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (dmyMatch) {
    var d = parseInt(dmyMatch[1], 10);
    var m = parseInt(dmyMatch[2], 10);
    var y = parseInt(dmyMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      start = y + '-' + pad2(m) + '-' + pad2(d);
      rem = rem.replace(dmyMatch[0], ' ');
    }
  }

  // b. ISO YYYY-MM-DD atau YYYY/MM/DD
  if (!start) {
    var isoMatch = rem.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      var iy = parseInt(isoMatch[1], 10);
      var im = parseInt(isoMatch[2], 10);
      var id = parseInt(isoMatch[3], 10);
      if (id >= 1 && id <= 31 && im >= 1 && im <= 12) {
        start = iy + '-' + pad2(im) + '-' + pad2(id);
        rem = rem.replace(isoMatch[0], ' ');
      }
    }
  }

  // c. Format tanggal teks nama bulan: "07/7 november 2026", "7 november 2026", "tgl 15 des 2026", dsb.
  var MONTH_MAP = {
    jan: '01', januari: '01', feb: '02', februari: '02', mar: '03', maret: '03',
    apr: '04', april: '04', mei: '05', jun: '06', juni: '06', jul: '07', juli: '07',
    agu: '08', agt: '08', agustus: '08', sep: '09', september: '09', okt: '10',
    oktober: '10', nov: '11', november: '11', des: '12', desember: '12',
  };
  if (!start) {
    var namedRegex = /(?:(?:tgl|tanggal)\.?\s*)?\b(?:\d{1,2}\/)?(\d{1,2})\s+(jan|januari|feb|februari|mar|maret|apr|april|mei|jun|juni|jul|juli|agu|agt|agustus|sep|september|okt|oktober|nov|november|des|desember)(?:\s+(\d{4}))?\b/i;
    var namedMatch = rem.match(namedRegex);
    if (namedMatch) {
      var nd = parseInt(namedMatch[1], 10);
      var nmStr = MONTH_MAP[namedMatch[2].toLowerCase()];
      var ny = namedMatch[3] ? parseInt(namedMatch[3], 10) : yDefault;
      if (nd >= 1 && nd <= 31 && nmStr) {
        start = ny + '-' + nmStr + '-' + pad2(nd);
        rem = rem.replace(namedMatch[0], ' ');
      }
    }
  }

  // 2. Ekstrak siklus LEBIH DULU sebelum harga
  var unit = 'bulan', n = 1;
  var targetDay = null;

  var tiapTglMatch = rem.match(/\btiap\s+(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i);
  if (tiapTglMatch) {
    targetDay = parseInt(tiapTglMatch[1], 10);
    unit = 'bulan';
    n = 1;
    rem = rem.replace(tiapTglMatch[0], ' ');
  } else if (/\bsekali\b/i.test(rem)) {
    unit = 'sekali';
    n = 1;
    rem = rem.replace(/\bsekali\b/gi, ' ');
  } else {
    var cadMatch = rem.match(/\btiap\s+(\d+)?\s*(hari|minggu|bulan|thn|tahun)\b/i);
    if (cadMatch) {
      n = cadMatch[1] ? parseInt(cadMatch[1], 10) : 1;
      var u = cadMatch[2].toLowerCase();
      unit = (u === 'thn' || u === 'tahun') ? 'tahun' : u;
      rem = rem.replace(cadMatch[0], ' ');
    } else {
      var cadUnitMatch = rem.match(/\b(bulanan|mingguan|harian|tahunan)\b/i);
      if (cadUnitMatch) {
        var cu = cadUnitMatch[1].toLowerCase();
        if (cu === 'bulanan') unit = 'bulan';
        else if (cu === 'mingguan') unit = 'minggu';
        else if (cu === 'harian') unit = 'hari';
        else if (cu === 'tahunan') unit = 'tahun';
        rem = rem.replace(cadUnitMatch[0], ' ');
      }
    }
  }

  // d. Tanggal saja tanpa bulan: misal "tgl 15"
  if (!start && !targetDay) {
    var dayOnlyMatch = rem.match(/\b(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i);
    if (dayOnlyMatch) {
      targetDay = parseInt(dayOnlyMatch[1], 10);
      rem = rem.replace(dayOnlyMatch[0], ' ');
    }
  }

  if (targetDay !== null) {
    if (targetDay < 1) targetDay = 1;
    if (targetDay > 31) targetDay = 31;
    var curY = today.getFullYear();
    var curM = today.getMonth() + 1;
    var curD = today.getDate();
    if (curD <= targetDay) {
      start = curY + '-' + pad2(curM) + '-' + pad2(targetDay);
    } else {
      var nextM = curM + 1;
      var nextY = curY;
      if (nextM > 12) { nextM = 1; nextY++; }
      start = nextY + '-' + pad2(nextM) + '-' + pad2(targetDay);
    }
  }

  if (!start) {
    start = yDefault + '-01-01';
  }

  // 3. Ekstrak harga: prioritaskan angka yang punya sufiks uang (k/rb/jt/m/miliar/milyar) atau separator titik ribuan
  var candidates = [];
  var pRegex = /\b(\d+(?:[\.,]\d+)?\s*(?:k|rb|ribu|jt|juta|m|miliar|milyar)|\d{1,3}(?:\.\d{3})+|\d+)\b/gi;
  var pm;
  while ((pm = pRegex.exec(rem)) !== null) {
    var val = parseRp(pm[0]);
    var hasSuffix = /(?:k|rb|ribu|jt|juta|m|miliar|milyar)$/i.test(pm[0]) || /\d{1,3}\.\d{3}/.test(pm[0]);
    candidates.push({ raw: pm[0], val: val, hasSuffix: hasSuffix, index: pm.index });
  }

  if (!candidates.length) return { error: 'Nominal tidak ditemukan (mis. 200k, 1.5jt, atau 350.000).' };

  candidates.sort(function(a, b) {
    if (a.hasSuffix && !b.hasSuffix) return -1;
    if (!a.hasSuffix && b.hasSuffix) return 1;
    return b.val - a.val;
  });

  var chosen = candidates[0];
  if (!chosen.val || chosen.val <= 0) return { error: 'Nominal tidak valid.' };
  var price = chosen.val;

  rem = rem.slice(0, chosen.index) + ' ' + rem.slice(chosen.index + chosen.raw.length);

  // 4. Bersihkan nama (HANYA buang kata kontrol pembantu awal/akhir)
  var name = rem
    .replace(/\b(?:tiap|mulai|dari|pada)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();

  if (!name) return { error: 'Nama item tidak boleh kosong.' };

  return {
    name: name,
    price: price,
    n: n,
    unit: unit,
    start: start,
  };
}

/* js/ui/kas.js */
function kasLinked() {
  var pr = ALL.kas.pr;
  for (var id in pr) if (pr[id].link) return pr[id];
  return null;
}

/* js/ui/kas.js */
function kasBase(P) {
  return P.link ? +S.saldo || 0 : P.saldo;
}

/* js/ui/kas.js */
function kasDerived() {
  var y = +S.year,
    out = [];
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.paid[k] && !S.skip[k] && !realTx(k))
        out.push({ id: 'b' + k, d: d, t: '-', amt: priceAt(it, t), cat: it.cat || 'Tagihan', note: it.name + ' (lunas)', ro: 'tagihan' });
    });
  });
  kasGoals().forEach(function (g) {
    goalMonths(g).forEach(function (k) {
      if (+k.slice(0, 4) === y) out.push({ id: 'g' + g.id + k, d: k + '-01', t: '-', amt: g.per, cat: 'Tabungan perjalanan', note: g.name, ro: 'tabungan' });
    });
  });
  return out;
}

/* js/ui/kas.js */
function kasRows(P) {
  if (!P.link) return P.tx.slice();
  return P.tx
    .filter(function (x) {
      return +x.d.slice(0, 4) === +S.year;
    })
    .concat(kasDerived());
}

/* js/ui/kas.js */
function kasSum(tx) {
  var r = { i: 0, o: 0, n: 0 };
  tx.forEach(function (x) {
    r.n++;
    if (x.t === '+') r.i += x.amt;
    else r.o += x.amt;
  });
  return r;
}

/* js/ui/trip.js */
function kasGoals() {
  return Object.keys(ALL.kas.pr)
    .map(function (i) { return ALL.kas.pr[i]; })
    .filter(function (P) { return !P.link && P.goal && P.goal.link !== false; })
    .map(function (P) { return Object.assign({ id: P.id, name: P.name }, P.goal); });
}

/* js/ui/trip.js */
function monthList(a, b) {
  var r = [], y = +a.slice(0, 4), m = +a.slice(5) - 1;
  while (r.length < 60) {
    var k = y + '-' + pad2(m + 1);
    if (k > b) break;
    r.push(k);
    if (++m > 11) { m = 0; y++; }
  }
  return r;
}

/* js/ui/trip.js */
function goalMonths(g) {
  return monthList(g.from, g.to);
}

/* js/ui/trip.js */
function goalMonthsIn(g, y) {
  return goalMonths(g).filter(function (k) { return +k.slice(0, 4) === y; }).map(function (k) { return +k.slice(5) - 1; });
}

/* Shim bot */
var ALL = null, S = null;
function setS(all, s) { ALL = all; S = s; }
function state() { return { all: ALL, s: S }; }
export { setS, state, MON, FULL_MON, esc, rp, parseRp, fd, isoD, fmtD, shortP, pad2, addDaysISO,
  at, series, occ, nextDates, every, priceAt, priceSeg, sumP, lastOcc,
  calc, incomeYear, adjMonths, parseQuickItem, kasLinked, kasBase, kasRows, kasSum, kasDerived,
  kasGoals, goalMonths, goalMonthsIn, monthList, todayISO, isInvestCat, INVEST_RE, mNorm, realTx,
  smEffYear, smEff };