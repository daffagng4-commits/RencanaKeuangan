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
    s.adj = (Array.isArray(s.adj) ? s.adj : [])
      .filter(function (a) {
        return a && +a.amt > 0 && (a.t === '+' || a.t === '-');
      })
      .map(normAdj);
  });
  return a;
}

/** Bersihkan daftar perubahan harga/jadwal (ch) item; format lama pc diubah menjadi ch. */
function chNorm(x) {
  var D = /^\d{4}-\d{2}-\d{2}$/,
    U = ['hari', 'minggu', 'bulan', 'tahun'],
    out = [];
  (Array.isArray(x.ch) ? x.ch : []).forEach(function (q) {
    if (!q || !D.test(q.from)) return;
    out.push({
      from: q.from,
      to: D.test(q.to) && q.to >= q.from ? q.to : '',
      price: +q.price > 0 ? +q.price : null,
      n: q.n ? Math.max(1, parseInt(q.n, 10) || 1) : null,
      unit: U.indexOf(q.unit) >= 0 ? q.unit : null,
      cut: !!q.cut,
    });
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
    var dj = JSON.stringify(ALL.data);
    if (dj !== lastData) {
      lastData = dj;
      ALL.rev = Date.now();
      schedPush();
    }
    localStorage.setItem(KEY, JSON.stringify(ALL));
    setSaveStatus(true);
  } catch (e) {
    setSaveStatus(false);
  }
}

/** Daftar cadangan otomatis (maks. 5) dari localStorage. */
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
    (src.adj || []).forEach(function (a) {
      if (
        !dst.adj.some(function (x) {
          return x.t === a.t && x.amt === a.amt && x.m === a.m && x.note === a.note;
        })
      )
        dst.adj.push(a);
    });
  });
  return { items: cnt, years: yrs };
}

/** Muat state dari localStorage (atau data contoh bila kosong/rusak). */
function loadState() {
  var raw = null;
  try {
    var r = localStorage.getItem(KEY);
    raw = r ? JSON.parse(r) : null;
  } catch (e) {
    raw = null;
  }
  ALL = norm(raw);
  S = ALL.data[ALL.year];
  lastData = JSON.stringify(ALL.data);
}
