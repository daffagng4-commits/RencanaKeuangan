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
