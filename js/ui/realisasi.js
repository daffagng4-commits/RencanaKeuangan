/**
 * Rencana vs realisasi (Rincian Bulanan) dan pencocokan transaksi Catatan Kas dengan tagihan (tab Kas).
 * Logika pencocokan ada di js/core/match.js.
 */

/** Chip "tagihan: X" di baris transaksi yang tertaut ke tagihan. */
function lkChip(x) {
  var k = linkedTxIds()[x.id],
    it = k && item(k.split('|')[0]);
  return it ? '<br><span class="chp on">melunasi: ' + esc(it.name) + ' (' + fmtD(k.split('|')[1]) + ')</span>' : '';
}

/** Toast + urungkan setelah transaksi baru otomatis dicocokkan dengan tagihan. */
function toastLinked(c) {
  toast('"' + c.it.name + '" otomatis ditandai lunas (cocok dengan transaksi ini).', function () {
    unlinkBill(c.key);
    save();
    renderAll();
  });
}

/** Kartu "Cocokkan dengan tagihan" di tab Kas (hanya untuk profil tergabung yang sedang dibuka). */
function matchCardHtml() {
  var P = kasLinked();
  if (!P || kas() !== P) return '';
  var L = suggestMatches(),
    rows = L.map(function (s) {
      var c = s.cand;
      return (
        '<div class="it2"><div><b class="neg">&minus; ' + rp(s.tx.amt) + '</b> <span class="sub">' + fmtD(s.tx.d) +
        (s.tx.cat ? ' &middot; ' + esc(s.tx.cat) : '') + '</span>' +
        (s.tx.note ? '<br><span class="sub">' + esc(s.tx.note) + '</span>' : '') +
        '<br><span class="sub">' + (s.kind === 'paid' ? 'tagihan <b>' + esc(c.it.name) + '</b> (' + fmtD(c.iso) + ') sudah lunas; gabungkan agar tidak terhitung dua kali' : 'cocok dengan <b>' + esc(c.it.name) + '</b> &middot; jatuh tempo ' + fmtD(c.iso) + ', rencana ' + rp(c.plan)) + '</span></div>' +
        '<div><button class="g" data-mok="' + s.tx.id + '|' + c.key + '">' + (s.kind === 'paid' ? 'Gabungkan' : 'Cocokkan') + '</button><button class="g" data-mno="' + s.tx.id + '">Bukan</button></div></div>'
      );
    }).join('');
  return (
    '<div class="card"><h2>Cocokkan dengan tagihan</h2>' +
    (L.length
      ? '<div class="sub mb6""">' + L.length + ' transaksi keluar mirip dengan tagihan di Jadwal Bayar. Dicocokkan = tagihan ditandai lunas dan jumlah realisasinya mengikuti transaksi.</div>' + rows +
        (L.length > 1 ? '<div class="row2 mt8"""><button id="mall">Cocokkan semua (' + L.length + ')</button></div>' : '')
      : '<div class="sub">Tidak ada transaksi keluar yang menunggu dicocokkan dengan tagihan.</div>') +
    '<label class="chk sub"><input type="checkbox" id="mauto"' + (P.auto !== false ? ' checked' : '') + '> Lunaskan otomatis bila transaksi baru sangat cocok dengan satu tagihan</label></div>'
  );
}

/** Terima satu saran 'idTransaksi|kunciTagihan'. */
function kasApplyMatch(spec) {
  var i = spec.indexOf('|'),
    txid = spec.slice(0, i),
    key = spec.slice(i + 1),
    it = item(key.split('|')[0]),
    sn = snap('Sebelum mencocokkan transaksi');
  applyLink(key, txid);
  save();
  renderAll();
  toast((it ? '"' + it.name + '"' : 'Tagihan') + ' ditandai lunas dan ditautkan ke transaksi.', function () {
    restoreSnap(sn.t);
  });
}

/** Terima semua saran sekaligus. */
function kasApplyAll() {
  var L = suggestMatches(),
    sn = snap('Sebelum mencocokkan semua transaksi');
  L.forEach(function (s) {
    applyLink(s.cand.key, s.tx.id);
  });
  save();
  renderAll();
  toast(L.length + ' transaksi dicocokkan dengan tagihan.', function () {
    restoreSnap(sn.t);
  });
}

/** Tolak saran untuk transaksi `txid` (tidak diusulkan lagi). */
function kasDismissMatch(txid) {
  var P = kasLinked();
  if (!P) return;
  P.nm = P.nm || [];
  if (P.nm.indexOf(txid) < 0) P.nm.push(txid);
  save();
  renderKas();
}
function realisasiHtml() {
  var D = realisasiData(),
    head = '<div class="card"><h2>Rencana vs realisasi ' + S.year + '</h2>';
  if (!D.nPaid)
    return (
      head +
      '<div class="empty">Belum ada tagihan yang dilunasi di tahun ini. Tandai lunas di Jadwal Bayar, atau catat pengeluaran di Catatan Kas agar otomatis dicocokkan dengan tagihan.</div>' +
      '<div class="row2 mt8"""><button type="button" data-goto="jadwal">Buka Jadwal Bayar</button><button type="button" data-goto="kas">Buka Catatan Kas</button></div></div>'
    );
  var diff = D.act - D.planPaid,
    cls = function (v) {
      return v < 0 ? ' in' : v > 0 ? ' neg' : '';
    },
    sgn = function (v) {
      return v === 0 ? rp(0) : (v > 0 ? '+' : '&minus;') + rp(Math.abs(v));
    },
    ms = D.months
      .map(function (m, i) {
        return { m: m, i: i };
      })
      .filter(function (x) {
        return x.m.nPaid > 0;
      }),
    top = D.rows
      .filter(function (r) {
        return r.linked && r.act !== r.plan;
      })
      .sort(function (a, b) {
        return Math.abs(b.act - b.plan) - Math.abs(a.act - a.plan);
      })
      .slice(0, 5);
  return (
    head +
    '<div class="sub pv">' + D.nPaid + ' tagihan lunas: rencana <b>' + rp(D.planPaid) + '</b>, realisasi <b>' + rp(D.act) + '</b> &middot; ' +
    (diff === 0 ? 'sesuai rencana' : diff < 0 ? 'lebih hemat ' + rp(-diff) : 'lebih besar ' + rp(diff)) + '</div>' +
    '<div class="sub">' + D.nReal + ' dari ' + D.nPaid + ' tertaut ke transaksi Catatan Kas; sisanya dianggap sesuai rencana.</div>' +
    '<div class="rv-m rv-h"><span>Bulan</span><span>Rencana</span><span>Realisasi</span><span>Selisih</span></div>' +
    ms
      .map(function (x) {
        var d = x.m.act - x.m.planPaid;
        return '<div class="rv-m"><span>' + MON[x.i] + '</span><span class="pv">' + rp(x.m.planPaid) + '</span><span class="pv">' + rp(x.m.act) + '</span><span class="pv' + cls(d) + '">' + sgn(d) + '</span></div>';
      })
      .join('') +
    (top.length
      ? '<h3 class="rv-t">Selisih terbesar</h3>' +
        top
          .map(function (r) {
            var d = r.act - r.plan;
            return '<div class="rv-row"><span>' + esc(r.it.name) + ' <span class="sub">' + fmtD(r.iso) + '</span></span><span class="pv sub">' + rp(r.plan) + ' &rarr; ' + rp(r.act) + '</span><b class="pv' + cls(d) + '">' + sgn(d) + '</b></div>';
          })
          .join('')
      : '') +
    (D.late.n && +S.year === +todayISO().slice(0, 4)
      ? '<div class="err mt10""">' + D.late.n + ' tagihan sudah lewat jatuh tempo dan belum lunas (' + rp(D.late.sum) + ').</div>'
      : '') +
    '</div>'
  );
}
