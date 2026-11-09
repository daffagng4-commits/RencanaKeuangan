/**
 * State aplikasi: data per tahun (ALL/S), normalisasi data, simpan ke localStorage, cadangan otomatis, gabung data.
 */

var KEY = 'rencana-keuangan-v1';

/** ALL = {year, rev, data:{[tahun]:{saldo,startMonth,items,paid,skip,adj}}}; S = data tahun aktif. */

var S,
  ALL,
  lastData = '';

/** Data contoh (disalin dari Excel Rincian_Keuangan_2027_v2). Dipakai saat pertama kali dibuka. */
function seed() {
  function s(id, name, price, n, unit, start, cat) {
    return { id: id, name: name, price: price, n: n, unit: unit, start: start, cat: cat || '' };
  }
  return {
    saldo: 25000000,
    year: 2027,
    items: [
      s(1, 'Vidio', 200000, 3, 'bulan', '2027-03-01', 'Langganan'),
      s(2, 'TorBox', 450000, 1, 'tahun', '2027-11-01', 'Langganan'),
      s(3, 'Warp', 15000, 1, 'bulan', '2027-01-01', 'Langganan'),
      s(4, 'BPJS', 150000, 1, 'bulan', '2027-01-01', 'Kesehatan'),
      s(5, 'Strong IPTV', 325000, 6, 'bulan', '2027-03-01', 'Langganan'),
      s(6, 'Kuota', 50000, 28, 'hari', '2026-10-21', 'Tagihan rutin'),
      s(7, 'Saham', 620000, 1, 'bulan', '2027-01-01', 'Investasi'),
      s(8, 'Facial', 160000, 1, 'bulan', '2027-01-01', 'Kesehatan'),
      s(9, 'BTC', 420000, 1, 'bulan', '2027-01-01', 'Investasi'),
      s(10, 'Vitamin D3 + K2', 135000, 2, 'bulan', '2027-01-01', 'Kesehatan'),
      s(11, 'Magnesium Glycinate', 300000, 5, 'bulan', '2027-01-01', 'Kesehatan'),
      s(12, 'Blackmores Omega', 450000, 3, 'bulan', '2027-01-01', 'Kesehatan'),
    ],
  };
}

var UNITS = ['hari', 'minggu', 'bulan', 'tahun', 'sekali'];
var ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bersihkan satu item dari data mentah (impor/cloud/lama) menjadi bentuk yang valid. */
function normItem(x, i, year) {
  x = x || {};
  return {
    id: x.id || Date.now() + i,
    name: String(x.name || 'Item'),
    price: +x.price || 0,
    n: Math.max(1, +x.n || 1),
    unit: UNITS.indexOf(x.unit) >= 0 ? x.unit : 'bulan',
    start: ISO_RE.test(x.start) ? x.start : year + '-01-01',
    end: ISO_RE.test(x.end) ? x.end : '',
    cnt: Math.max(0, +x.cnt || 0),
    pokok: Math.max(0, +x.pokok || 0),
    cat: String(x.cat || '').slice(0, 30),
    ch: chNorm(x),
  };
}

/** Bersihkan satu penyesuaian saldo (rep = pengulangan opsional, hanya valid bila bulan mulai ada). */
function normAdj(a, i) {
  var m = a.m === null || a.m === undefined || a.m === '' ? null : Math.min(11, Math.max(0, +a.m || 0));
  var rep = null;
  if (a.rep && +a.rep.n > 0 && m !== null) {
    rep = { n: Math.max(1, parseInt(a.rep.n, 10) || 1), cnt: Math.max(0, parseInt(a.rep.cnt, 10) || 0) };
  }
  return {
    id: a.id || Date.now() + i,
    t: a.t,
    amt: +a.amt,
    note: String(a.note || '').slice(0, 60),
    m: m,
    rep: rep,
    at: String(a.at || ''),
  };
}

/**
 * Normalisasi seluruh data ke bentuk {year, data:{[tahun]:{...}}}. Menerima format baru, format lama
 * (satu tahun) atau null (-> data contoh). Mengubah objek masukan.
 */
function norm(a) {
  var y, d;
  if (a && a.data && typeof a.data === 'object') {
    y = +a.year || 2027;
    if (!a.data[y]) a.data[y] = { saldo: 0, items: [] };
  } else if (a && Array.isArray(a.items)) {
    y = +a.year || 2027;
    d = {};
    d[y] = a;
    a = { year: y, data: d };
  } else {
    var s0 = seed();
    y = s0.year;
    d = {};
    d[y] = s0;
    a = { year: y, data: d };
  }
  a.year = y;
  Object.keys(a.data).forEach(function (k) {
    var s = a.data[k];
    s.year = +k;
    s.saldo = +s.saldo || 0;
    s.startMonth = Math.min(11, Math.max(0, +s.startMonth || 0));
    s.items = (Array.isArray(s.items) ? s.items : []).map(function (x, i) {
      return normItem(x, i, s.year);
    });
    s.paid = s.paid && typeof s.paid === 'object' ? s.paid : {};
    s.skip = s.skip && typeof s.skip === 'object' ? s.skip : {};
    // S.real: tagihan -> transaksi kas yang melunasinya ({kunciTagihan: {tx: idTransaksi}}), lihat core/match.js
    s.real = (function (r) {
      var o = {};
      if (r && typeof r === 'object')
        Object.keys(r).forEach(function (k) {
          if (/^[^|]+\|\d{4}-\d{2}-\d{2}$/.test(k) && r[k] && r[k].tx) o[k] = { tx: String(r[k].tx).slice(0, 40) };
        });
      return o;
    })(s.real);
    s.adj = (Array.isArray(s.adj) ? s.adj : [])
      .filter(function (a) {
        return a && +a.amt > 0 && (a.t === '+' || a.t === '-');
      })
      .map(normAdj);
  });
  a.kas = normKas(a.kas);
  // Penyesuaian saldo lama dipindah menjadi catatan kas profil tergabung (id tetap, jadi aman digabung/sinkron).
  var KLm = null;
  Object.keys(a.kas.pr).forEach(function (id) {
    if (a.kas.pr[id].link) KLm = a.kas.pr[id];
  });
  Object.keys(a.data).forEach(function (yk) {
    var Y = a.data[yk];
    (Y.adj || []).forEach(function (ad) {
      adjMonths(ad).forEach(function (mm) {
        var d =
          mm == null && /^\d{4}-\d{2}-\d{2}/.test(ad.at || '') && +ad.at.slice(0, 4) === +yk
            ? ad.at.slice(0, 10)
            : yk + '-' + pad2((mm == null ? 0 : mm) + 1) + '-01';
        var id = 'adj' + ad.id + '-' + d;
        if (
          !KLm.tx.some(function (x) {
            return x.id === id;
          })
        )
          KLm.tx.push({ id: id, d: d, t: ad.t, amt: ad.amt, cat: 'Penyesuaian saldo', note: ad.note || '' });
      });
    });
    Y.adj = [];
  });
  return a;
}

/** URL http(s) yang aman dipakai sebagai tautan. */
function okUrl(u) {
  return /^https?:\/\/[^\s"'<>]+$/i.test(u || '');
}

/** Catatan Kas: {pr:{[id]:{id,name,saldo,tx:[{id,d,t,amt,cat,note}]}}}. Selalu ada minimal satu profil. */
function normKas(k) {
  var pr = {};
  if (k && k.pr && typeof k.pr === 'object')
    Object.keys(k.pr).forEach(function (id) {
      var p = k.pr[id] || {};
      pr[id] = {
        id: id,
        name: String(p.name || 'Profil').slice(0, 30),
        saldo: +p.saldo || 0,
        link: !!p.link,
        start: ISO_RE.test(p.start) ? p.start : '',
        end: ISO_RE.test(p.end) ? p.end : '',
        budget: +p.budget > 0 ? +p.budget : 0,
        cur: /^[A-Za-z]{3}$/.test(p.cur || '') ? String(p.cur).toUpperCase() : '',
        rate: +p.rate > 0 ? +p.rate : 0,
        dt: (function () {
          var o = {};
          if (p.dt && typeof p.dt === 'object')
            Object.keys(p.dt).forEach(function (k) {
              if (ISO_RE.test(k) && p.dt[k]) o[k] = String(p.dt[k]).slice(0, 60);
            });
          return o;
        })(),
        it: (Array.isArray(p.it) ? p.it : [])
          .filter(function (x) {
            return x && ISO_RE.test(x.day) && x.place;
          })
          .map(function (x, i) {
            return {
              id: String(x.id || 'i' + i),
              day: x.day,
              time: /^\d{2}:\d{2}$/.test(x.time) ? x.time : '',
              time2: /^\d{2}:\d{2}$/.test(x.time2) ? x.time2 : '',
              place: String(x.place).slice(0, 120),
              cat: String(x.cat || '').slice(0, 20),
              est: +x.est > 0 ? +x.est : 0,
              fx: !!x.fx,
              pay: /^(ic|on|cash)$/.test(x.pay) ? x.pay : '',
              link: okUrl(x.link) ? String(x.link).slice(0, 400) : '',
              note: String(x.note || '').slice(0, 200),
              done: !!x.done,
              rec: String(x.rec || ''),
            };
          }),
        bk: (Array.isArray(p.bk) ? p.bk : [])
          .filter(function (x) {
            return x && x.title;
          })
          .map(function (x, i) {
            return {
              id: String(x.id || 'b' + i),
              title: String(x.title).slice(0, 120),
              cat: String(x.cat || 'Lainnya').slice(0, 20),
              amt: +x.amt > 0 ? +x.amt : 0,
              fx: !!x.fx,
              pay: /^(ic|on|cash)$/.test(x.pay) ? x.pay : '',
              link: okUrl(x.link) ? String(x.link).slice(0, 400) : '',
              a: ISO_RE.test(x.a) ? x.a : '',
              b: ISO_RE.test(x.b) ? x.b : '',
              paid: !!x.paid,
              rec: String(x.rec || ''),
            };
          }),
        lk: (Array.isArray(p.lk) ? p.lk : [])
          .filter(function (x) {
            return x && x.title && okUrl(x.url);
          })
          .map(function (x, i) {
            return { id: String(x.id || 'l' + i), title: String(x.title).slice(0, 80), url: String(x.url).slice(0, 400) };
          }),
        ck: (Array.isArray(p.ck) ? p.ck : [])
          .filter(function (x) {
            return x && x.text;
          })
          .map(function (x, i) {
            return { id: String(x.id || 'c' + i), text: String(x.text).slice(0, 60), done: !!x.done };
          }),
        note: String(p.note || '').slice(0, 2000),
        goal: (function (g) {
          if (!g || typeof g !== 'object' || !(+g.per > 0) || !/^\d{4}-\d{2}$/.test(g.from) || !/^\d{4}-\d{2}$/.test(g.to) || g.to < g.from) return null;
          return { t: +g.t > 0 ? +g.t : 0, s0: +g.s0 > 0 ? +g.s0 : 0, from: g.from, to: g.to, per: +g.per, link: g.link !== false };
        })(p.goal),
        auto: p.auto !== false,
        nm: (Array.isArray(p.nm) ? p.nm : []).map(String).slice(0, 300),
        tx: (Array.isArray(p.tx) ? p.tx : [])
          .filter(function (x) {
            return x && +x.amt > 0 && (x.t === '+' || x.t === '-') && ISO_RE.test(x.d);
          })
          .map(function (x, i) {
            return { id: String(x.id || 't' + i), d: x.d, t: x.t, amt: +x.amt, cat: String(x.cat || '').slice(0, 30), note: String(x.note || '').slice(0, 80), debt: x.debt === true, debtName: String(x.debtName || '').slice(0, 40), debtKind: /^(piutang|bayar-utang|utang|bayar-piutang)$/.test(x.debtKind) ? x.debtKind : '', debtDone: x.debtDone === true };
          }),
      };
    });
  if (!Object.keys(pr).length) pr.utama = { id: 'utama', name: 'Utama', saldo: 0, tx: [], link: true };
  var ids = Object.keys(pr),
    lk = null;
  ids.forEach(function (id) {
    if (pr[id].link) {
      if (lk) pr[id].link = false;
      else lk = id;
    }
  });
  if (!lk) pr[pr.utama ? 'utama' : ids[0]].link = true;
  return { pr: pr };
}

/** Tanda tangan data (tahun + Catatan Kas) untuk mendeteksi perubahan yang perlu disinkronkan. */
function dsig() {
  return JSON.stringify(ALL.data) + JSON.stringify(ALL.kas ? ALL.kas.pr : null);
}

/** Bersihkan daftar perubahan harga/jadwal (ch) item; format lama pc diubah menjadi ch. */

function chNorm(x) {
  var D = /^\d{4}-\d{2}-\d{2}$/,
    U = ['hari', 'minggu', 'bulan', 'tahun'],
    out = [];
  (Array.isArray(x.ch) ? x.ch : []).forEach(function (q) {
    if (!q || !D.test(q.from)) return;
    var seg = {
      from: q.from,
      to: D.test(q.to) && q.to >= q.from ? q.to : '',
      price: +q.price > 0 ? +q.price : null,
      n: q.n ? Math.min(1000, Math.max(1, parseInt(q.n, 10) || 1)) : null,
      unit: U.indexOf(q.unit) >= 0 ? q.unit : null,
      cut: !!q.cut,
    };
    // Perubahan untuk tanggal tertentu saja (bukan rentang): hanya harga, tanpa siklus.
    var dates = Array.isArray(q.dates)
      ? q.dates
          .filter(function (d, i, a) {
            return D.test(d) && a.indexOf(d) === i;
          })
          .sort()
      : [];
    // Geser tanggal: siklus baru mulai dari tanggal "anchor" (mis. tagihan 5 Jul dipindah ke 10 Agu).
    if (D.test(q.anchor) && (seg.n || seg.unit)) seg.anchor = q.anchor;
    if (dates.length) {
      delete seg.anchor;
      seg.dates = dates;
      seg.from = dates[0];
      seg.to = dates[dates.length - 1];
      seg.n = null;
      seg.unit = null;
      seg.cut = false;
    }
    // Geser per tagihan: {tanggal asli: tanggal baru}; tidak mengubah harga/siklus.
    var mv = {};
    if (q.mv && typeof q.mv === 'object')
      Object.keys(q.mv).forEach(function (k) {
        if (D.test(k) && D.test(q.mv[k]) && k !== q.mv[k]) mv[k] = q.mv[k];
      });
    var mk = Object.keys(mv).sort();
    if (mk.length) seg = { from: mk[0], to: mk[mk.length - 1], price: null, n: null, unit: null, cut: false, mv: mv };
    out.push(seg);
  });
  (Array.isArray(x.pc) ? x.pc : []).forEach(function (q) {
    if (q && D.test(q.d) && +q.p > 0) out.push({ from: q.d, to: '', price: +q.p, n: null, unit: null });
  });
  return out.sort(cmpFrom);
}

/** Simpan state ke localStorage. Menaikkan rev + menjadwalkan push hanya jika data benar-benar berubah. */
function save() {
  try {
    ALL.data[S.year] = S;
    ALL.year = S.year;
    var dj = dsig();
    if (dj !== lastData) {
      lastData = dj;
      ALL.rev = Date.now();
      schedPush();
    }
    localStorage.setItem(KEY, JSON.stringify(ALL));
    setSaveStatus(true);
  } catch (e) {
    try {
      localStorage.removeItem('rk-undo');
      localStorage.setItem(KEY, JSON.stringify(ALL));
      setSaveStatus(true);
      return;
    } catch (e2) {}
    setSaveStatus(false);
  }
}

/** Daftar cadangan otomatis (maks. 3) dari localStorage. */
function snapList() {
  try {
    return JSON.parse(localStorage.getItem('rk-undo') || '[]');
  } catch (e) {
    return [];
  }
}

/** Simpan cadangan otomatis berisi teks data `d` dengan label `label`. @returns entri cadangan */
function snapRaw(label, d) {
  var L = snapList();
  L.unshift({ t: Math.max(Date.now(), ((L[0] && L[0].t) || 0) + 1), l: label, d: d });
  L = L.slice(0, 5);
  try {
    localStorage.setItem('rk-undo', JSON.stringify(L));
  } catch (e) {
    try {
      L = L.slice(0, 2);
      localStorage.setItem('rk-undo', JSON.stringify(L));
    } catch (e2) {}
  }
  return L[0];
}

/** Cadangkan state saat ini sebelum tindakan yang merusak. */
function snap(label) {
  ALL.data[S.year] = S;
  ALL.year = S.year;
  return snapRaw(label, JSON.stringify(ALL));
}

/** Pulihkan cadangan berdasar id waktu (t). Cadangan baru dibuat dulu agar pemulihan pun bisa diurungkan. */
function restoreSnap(t) {
  var s = snapList().filter(function (x) {
    return x.t === t;
  })[0];
  if (!s) return null;
  var back = snap('Sebelum memulihkan');
  ALL = norm(JSON.parse(s.d));
  S = ALL.data[ALL.year];
  lastData = '';
  save();
  syncUI();
  return back;
}

/** Gabungkan data masukan ke state: tahun/item baru ditambah, duplikat dilewati, status lunas/lewati dan penyesuaian ikut. @returns {items, years} */
function mergeAll(inc) {
  var n = norm(inc),
    cnt = 0,
    yrs = 0;
  Object.keys(n.data).forEach(function (k) {
    var src = n.data[k],
      dst = ALL.data[k];
    if (!dst) {
      ALL.data[k] = src;
      yrs++;
      cnt += src.items.length;
      return;
    }
    var map = {};
    src.items.forEach(function (it, i) {
      var ex = dst.items.filter(function (x) {
        return sameItem(x, it);
      })[0];
      if (ex) {
        map[it.id] = ex.id;
        return;
      }
      var id = Date.now() + i + Math.floor(Math.random() * 1e4);
      map[it.id] = id;
      dst.items.push(cloneItem(it, id));
      cnt++;
    });
    Object.keys(src.paid).forEach(function (pk) {
      var p = pk.split('|'),
        m = map[p[0]];
      if (m != null) dst.paid[m + '|' + p[1]] = 1;
    });
    Object.keys(src.skip || {}).forEach(function (pk) {
      var p = pk.split('|'),
        m = map[p[0]];
      if (m != null) dst.skip[m + '|' + p[1]] = 1;
    });
    Object.keys(src.real || {}).forEach(function (pk) {
      var p = pk.split('|'),
        m = map[p[0]];
      if (m != null && src.real[pk] && src.real[pk].tx) dst.real[m + '|' + p[1]] = { tx: src.real[pk].tx };
    });
    (src.adj || []).forEach(function (a) {
      if (
        !dst.adj.some(function (x) {
          return x.t === a.t && x.amt === a.amt && x.m === a.m && x.note === a.note;
        })
      )
        dst.adj.push(a);
    });
  });
  Object.keys(n.kas.pr).forEach(function (id) {
    var sp = n.kas.pr[id],
      dp = ALL.kas.pr[id];
    if (!dp) {
      sp.link = false;
      ALL.kas.pr[id] = sp;
      return;
    }
    Object.keys(sp.dt || {}).forEach(function (k) {
      if (!dp.dt[k]) dp.dt[k] = sp.dt[k];
    });
    ['it', 'ck', 'bk', 'lk'].forEach(function (k) {
      (sp[k] || []).forEach(function (x) {
        if (
          !dp[k].some(function (y) {
            return y.id === x.id;
          })
        )
          dp[k].push(x);
      });
    });
    sp.tx.forEach(function (x) {
      if (
        !dp.tx.some(function (y) {
          return y.id === x.id;
        })
      )
        dp.tx.push(x);
    });
  });
  return { items: cnt, years: yrs };
}

/** Muat state dari localStorage (atau data contoh bila kosong/rusak). */
function loadState() {
  var raw = null;
  var r = null;
  try {
    r = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    raw = r ? JSON.parse(r) : null;
  } catch (e) {
    if (r) {
      try {
        localStorage.setItem(KEY + '_corrupt_backup_' + Date.now(), r);
      } catch (err) {}
      console.error('Data localStorage rusak, dicadangkan ke backup sebelum dipulihkan:', e);
    }
    raw = null;
  }
  ALL = norm(raw);
  S = ALL.data[ALL.year];
  lastData = dsig();
}
