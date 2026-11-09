/**
 * Tab Catatan Kas: pencatatan uang masuk/keluar per profil (mis. "Utama", "Liburan Bali"),
 * dengan dashboard sendiri. Terpisah dari Rencana Keuangan; ikut cadangan dan sinkron.
 */
var kasAct = (function () {
    try {
      return localStorage.getItem('rk-kas') || '';
    } catch (e) {
      return '';
    }
  })(),
  kasPer = 'all',
  kasTf = 'all', // filter Riwayat transaksi: all | + (masuk) | - (keluar)
  kasEdit = null,
  kasT = '-',
  kpMode = 'new';
var KAS_IN = ['Gaji', 'Transfer', 'Lainnya'],
  KAS_OUT = ['Makanan', 'Transport', 'Belanja', 'Hiburan', 'Penginapan', 'Lainnya'];

/** Profil yang sedang dipakai: perjalanan terpilih (mode Perjalanan) atau profil Rencana. */
function kas() {
  return kasLinked();
}
/** Tempat Catatan Kas digambar. */
function kasEl() {
  return $('v-kas');
}
function kasIn(x, per) {
  return per === 'all' || x.d.slice(0, 7) === per;
}
/** Jumlah masuk (i), keluar (o), dan banyaknya transaksi (n) pada periode. */
function kasSum(tx, per) {
  var r = { i: 0, o: 0, n: 0 };
  tx.forEach(function (x) {
    if (!kasIn(x, per)) return;
    r.n++;
    if (x.t === '+') r.i += x.amt;
    else r.o += x.amt;
  });
  return r;
}
function kasPrevMonth(per) {
  var p = per.split('-').map(Number),
    m = p[1] - 2;
  return p[0] + Math.floor(m / 12) + '-' + pad2(((m % 12) + 12) % 12 + 1);
}

/** Grafik saldo per tanggal: sumbu waktu asli, garis nol, label bulan, dan ringkasan awal→akhir. */
function kasChart(asc) {
  var bal = kasBase(kas()),
    pts = [];
  asc.forEach(function (x) {
    bal += x.t === '+' ? x.amt : -x.amt;
    if (!kasIn(x, kasPer)) return;
    var q = pts[pts.length - 1];
    if (q && q.d === x.d) q.b = bal;
    else pts.push({ d: x.d, b: bal });
  });
  if (pts.length < 2) return '';
  var bs = pts.map(function (p) { return p.b; }),
    mn = Math.min.apply(null, bs),
    mx = Math.max.apply(null, bs),
    r = mx - mn || 1,
    t0 = Date.parse(pts[0].d),
    t1 = Date.parse(pts[pts.length - 1].d),
    span = t1 - t0 || 1,
    x = function (d) { return ((Date.parse(d) - t0) / span) * 600; },
    y = function (v) { return 122 - ((v - mn) / r) * 108; },
    d = 'M' + pts.map(function (p) { return x(p.d).toFixed(1) + ' ' + y(p.b).toFixed(1); }).join(' L'),
    zero = mn < 0 && mx > 0 ? '<line x1="0" y1="' + y(0).toFixed(1) + '" x2="600" y2="' + y(0).toFixed(1) + '" style="stroke:var(--ln);stroke-dasharray:3 3;vector-effect:non-scaling-stroke"></line>' : '',
    hit = pts.map(function (p, i) {
      var xa = i ? (x(pts[i - 1].d) + x(p.d)) / 2 : 0,
        xb = i < pts.length - 1 ? (x(p.d) + x(pts[i + 1].d)) / 2 : 600;
      return '<rect x="' + xa.toFixed(1) + '" y="0" width="' + Math.max(1, xb - xa).toFixed(1) + '" height="130" fill="transparent" tabindex="0" data-tip="' + esc(dShort(p.d) + ' · saldo ' + rp(p.b)) + '"></rect>';
    }).join(''),
    m0 = new Date(t0), m1 = new Date(t1),
    months = (m1.getFullYear() - m0.getFullYear()) * 12 + m1.getMonth() - m0.getMonth() + 1,
    step = Math.ceil(months / 7),
    ticks = [];
  for (var i = 0; i < months; i += step) {
    var md = new Date(m0.getFullYear(), m0.getMonth() + i, 1),
      left = ((md - t0) / span) * 100;
    if (left >= 0 && left <= 100)
      ticks.push('<span style="left:' + left.toFixed(2) + '%">' + MON[md.getMonth()] + (md.getMonth() === 0 || i === 0 ? ' ’' + String(md.getFullYear()).slice(2) : '') + '</span>');
  }
  var naik = pts[pts.length - 1].b - pts[0].b;
  return (
    '<div class="card"><h2>Saldo dari waktu ke waktu</h2><svg class="kch" viewBox="0 0 600 130" preserveAspectRatio="none" role="img" aria-label="Grafik saldo">' +
    zero + '<path d="' + d + ' L600 130 L0 130Z" style="fill:var(--acs)"></path><path d="' + d + '" style="fill:none;stroke:var(--ac);stroke-width:2.5;vector-effect:non-scaling-stroke"></path>' + hit +
    '</svg><div class="kch-x">' + ticks.join('') + '</div>' +
    '<div class="sub dflex jcsb g8 fwrap mt8"><span>' + dShort(pts[0].d) + ': <b>' + rp(pts[0].b) + '</b></span>' +
    '<span>' + dShort(pts[pts.length - 1].d) + ': <b>' + rp(pts[pts.length - 1].b) + '</b> (' + (naik >= 0 ? '+' : '−') + rp(Math.abs(naik)) + ')</span>' +
    '<span>terendah ' + rp(mn) + ' · tertinggi ' + rp(mx) + '</span></div></div>'
  );
}

/** Profil yang tergabung dengan Rencana (selalu tepat satu). */
function kasLinked() {
  var pr = ALL.kas.pr;
  for (var id in pr) if (pr[id].link) return pr[id];
  return null;
}
/** Saldo awal profil: untuk profil tergabung memakai Saldo awal Rencana (satu angka yang sama). */
function kasBase(P) {
  return P.link ? +S.saldo || 0 : P.saldo;
}
/** Baris turunan (hanya baca) untuk profil tergabung: tagihan yang sudah lunas dan penyesuaian saldo tahun aktif. */
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
/** Semua baris yang tampil untuk profil P. */
function kasRows(P) {
  if (!P.link) return P.tx.slice();
  return P.tx
    .filter(function (x) {
      return +x.d.slice(0, 4) === +S.year;
    })
    .concat(kasDerived());
}
/** Render seluruh tab Catatan Kas. */
function renderKas() {
  var el = kasEl();
  if (!el) return;
  var P = kas(),
    K = ALL.kas,
    asc = kasRows(P).sort(function (a, b) {
      return a.d < b.d ? -1 : a.d > b.d ? 1 : 0;
    }),
    sm = +S.startMonth || 0,
    mName = kasPer !== 'all' ? (typeof FULL_MON !== 'undefined' ? FULL_MON[+kasPer.split('-')[1] - 1] : MON[+kasPer.split('-')[1] - 1]) : (typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm]),
    A = kasSum(asc, 'all'),
    bal = kasBase(P) + A.i - A.o,
    mo = {};
  asc.forEach(function (x) {
    mo[x.d.slice(0, 7)] = 1;
  });
  mo[todayISO().slice(0, 7)] = 1;
  var ms = Object.keys(mo).sort().reverse();
  if (kasPer !== 'all' && !mo[kasPer]) kasPer = 'all';
  var R = kasSum(asc, kasPer),
    L = asc
      .filter(function (x) {
        return kasIn(x, kasPer);
      })
      .reverse(),
    E = kasEdit
      ? asc.filter(function (x) {
          return x.id === kasEdit;
        })[0]
      : null;
  if (E) kasT = E.t;
  var stat = function (l, v, s) {
    return '<div><span>' + l + '</span><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>';
  };
  var prev = '';
  if (kasPer !== 'all') {
    var pv = kasSum(asc, kasPrevMonth(kasPer));
    if (pv.o) prev = stat('Keluar bulan sebelumnya', rp(pv.o), (R.o >= pv.o ? 'naik ' : 'turun ') + rp(Math.abs(R.o - pv.o)));
  }
  var hero =
    '<div class="hero"><div class="card m0"""><div class="sub">Saldo &quot;' +
    esc(P.name) +
    '&quot; Realtime &middot; ' +
    mName +
    '</div><div class="big' +
    (bal < 0 ? ' neg' : '') +
    '">' +
    rp(bal) +
    '</div><div class="sub pv">' +
    (P.link ? 'saldo awal Rencana ' : 'saldo awal ') +
    rp(kasBase(P)) +
    ' + masuk ' +
    rp(A.i) +
    ' &minus; keluar ' +
    rp(A.o) +
    '</div>' +
    kasStatusHtml(P, bal) +
    '</div><div class="card stats m0""">' +
    stat('Masuk', rp(R.i)) +
    stat('Keluar', rp(R.o)) +
    stat('Selisih', R.i === R.o ? rp(0) : signed(R.i - R.o)) +
    stat('Transaksi', R.n) +
    prev +
    '</div></div>';
  var per =
    '<div class="row2" style="margin:0 0 12px;align-items:center"><label class="m0" for="kper"">Periode</label><select class="wauto" id="kper""><option value="all">Semua waktu</option>' +
    ms
      .map(function (m) {
        var p = m.split('-');
        return '<option value="' + m + '"' + (m === kasPer ? ' selected' : '') + '>' + MON[p[1] - 1] + ' ' + p[0] + '</option>';
      })
      .join('') +
    '</select></div>';
  var cats = KAS_IN.concat(KAS_OUT),
    seen = {};
  P.tx.forEach(function (x) {
    if (x.cat) cats.push(x.cat);
  });
  var dl = cats
    .filter(function (c) {
      return !seen[c] && (seen[c] = 1);
    })
    .map(function (c) {
      return '<option value="' + esc(c) + '">';
    })
    .join('');
  var form =
    '<div class="card"><h2>' +
    (E ? 'Ubah transaksi' : 'Catat transaksi') +
    '</h2><div class="kt mb12"""><button type="button" class="yp' +
    (kasT === '+' ? ' on' : '') +
    '" data-kt="+">+ Masuk</button><button type="button" class="yp' +
    (kasT === '-' ? ' on' : '') +
    '" data-kt="-">&minus; Keluar</button></div><div class="kf"><div><label for="ka">Jumlah</label><div class="dflex g6""><input id="ka" inputmode="numeric" placeholder="50k atau 50.000" value="' +
    (E ? E.amt.toLocaleString('id-ID') : '') +
    '">' +
    (mode === 'trip' && P.cur && P.rate ? '<select class="wauto" id="kcu""><option value="idr">Rp</option><option value="fx">' + P.cur + '</option></select>' : '') +
    '</div></div><div><label for="kd">Tanggal</label><input id="kd" type="date" value="' +
    (E ? E.d : todayISO()) +
    '"></div><div><label for="kc">Kategori</label><input id="kc" list="kcl" maxlength="30" value="' +
    (E ? esc(E.cat) : '') +
    '"><datalist id="kcl">' +
    dl +
    '</datalist></div><div><label for="kn">Catatan</label><input id="kn" maxlength="80" value="' +
    (E ? esc(E.note) : '') +
    '"></div></div><div class="err" id="ke"></div><div class="row2"><button class="p" id="ks">' +
    (E ? 'Simpan perubahan' : 'Simpan') +
    '</button>' +
    (E ? '<button id="kx">Batal</button>' : '') +
    '</div></div>';
  var bc = {};
  L.forEach(function (x) {
    if (x.t === '-') {
      var k = x.cat || 'Tanpa kategori';
      bc[k] = (bc[k] || 0) + x.amt;
    }
  });
  var cl = Object.keys(bc).sort(function (a, b) {
      return bc[b] - bc[a];
    }),
    catH = '';
  if (cl.length)
    catH =
      '<div class="card"><h2>Pengeluaran per kategori</h2>' +
      cl
        .map(function (k, i) {
          var pc = (bc[k] / R.o) * 100,
            c = catColor(k);
          return (
            '<div class="catrow" tabindex="0" data-tip="' + esc(k + ': ' + rp(bc[k]) + ' (' + (pc < 1 ? '<1' : Math.round(pc)) + '% dari total)') + '"><div class="cathd"><span><i class="dot" style="background:' +
            c +
            '"></i>' +
            esc(k) +
            '</span><b>' +
            rp(bc[k]) +
            ' <span class="sub">' +
            (pc < 1 ? '<1' : Math.round(pc)) +
            '%</span></b></div><div class="catbar"><i style="width:' +
            pc.toFixed(1) +
            '%;background:' +
            c +
            '"></i></div></div>'
          );
        })
        .join('') +
      '</div>';
  var LF = kasTf === 'all' ? L : L.filter(function (x) { return x.t === kasTf; }),
    nIn = L.filter(function (x) { return x.t === '+'; }).length,
    emptyMsg = kasTf === '+' ? 'Belum ada transaksi masuk di periode ini.' : kasTf === '-' ? 'Belum ada transaksi keluar di periode ini.' : 'Belum ada transaksi di periode ini.';
  var lst =
    '<div class="card"><div class="row2" style="margin:0 0 8px;align-items:center;justify-content:space-between"><h2 class="m0"">Riwayat transaksi</h2>' +
    '<select class="wauto" id="ktf" aria-label="Filter jenis transaksi""><option value="all"' + (kasTf === 'all' ? ' selected' : '') + '>Semua</option><option value="+"' + (kasTf === '+' ? ' selected' : '') + '>+ Masuk</option><option value="-"' + (kasTf === '-' ? ' selected' : '') + '>&minus; Keluar</option></select></div>' +
    (kasTf !== 'all' ? '<div class="sub mb6""">' + LF.length + ' dari ' + L.length + ' transaksi · ' + (kasTf === '+' ? 'hanya yang masuk' : 'hanya yang keluar') + '</div>' : '') +
    (LF.slice(0, 200)
      .map(function (x) {
        return (
          '<div class="it2"><div><b class="' +
          (x.t === '-' ? 'neg' : 'kin') +
          '">' +
          (x.t === '-' ? '&minus; ' : '+ ') +
          rp(x.amt) +
          '</b> <span class="sub">' +
          fmtD(x.d) +
          (x.cat ? ' &middot; ' + esc(x.cat) : '') +
          '</span>' +
          (x.note ? '<br><span class="sub">' + esc(x.note) + '</span>' : '') +
          lkChip(x) +
          '</div><div>' +
          (x.ro
            ? '<span class="sub">dari ' + (x.ro === 'tabungan' ? 'Target tabungan' : 'Jadwal Bayar') + '</span>'
            : '<button class="g" data-ked="' + x.id + '">Ubah</button><button class="g d" data-kdel="' + x.id + '">Hapus</button>') +
          '</div></div>'
        );
      })
      .join('') || '<div class="empty">' + emptyMsg + '</div>' + (!L.length ? '<div class="row2 mt8"""><button type="button" class="p" data-kfocus="1">Catat transaksi pertama</button></div>' : '')) +
    (LF.length > 200 ? '<div class="sub">+ ' + (LF.length - 200) + ' lainnya. Pilih periode yang lebih sempit.</div>' : '') +
    '</div>';
  el.innerHTML =
    per + matchCardHtml() + form + kasChart(asc) + catH + lst;
}

function kasErr(t) {
  $('ke').textContent = t;
}

/** Simpan transaksi baru atau perubahan transaksi. */
function kasSave() {
  var a = parseRp($('ka').value),
    d = $('kd').value;
  if (a <= 0) return kasErr('Isi jumlah yang valid. Contoh: 50k atau 50.000.');
  if (!ISO_RE.test(d)) return kasErr('Pilih tanggal transaksi.');
  if (kas().link && +d.slice(0, 4) !== +S.year)
    return kasErr('Profil ini tergabung dengan Rencana tahun ' + S.year + '. Pilih tanggal di tahun itu, atau ganti Tahun di atas.');
  var fxn = '';
  if ($('kcu') && $('kcu').value === 'fx' && kas().rate) {
    fxn = kas().cur + ' ' + a.toLocaleString('id-ID') + ' \u00b7 ';
    a = Math.round(a * kas().rate);
  }
  var P = kas(),
    o = {
      id: kasEdit || 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      d: d,
      t: kasT,
      amt: a,
      cat: $('kc').value.trim().slice(0, 30),
      note: (fxn + $('kn').value.trim()).slice(0, 80),
    };
  if (kasEdit)
    P.tx = P.tx.map(function (x) {
      return x.id === kasEdit ? o : x;
    });
  else P.tx.push(o);
  var am = !kasEdit && o.t === '-' && kasLinked() === P ? autoMatchTx(o) : null,
    wasEdit = !!kasEdit;
  kasEdit = null;
  save();
  renderAll();
  $('status').textContent += ' · transaksi disimpan';
  if (am) toastLinked(am);
  else toast(wasEdit ? 'Transaksi berhasil diubah.' : 'Transaksi berhasil disimpan.');
}

function kasDelTx(id) {
  var P0 = kas(),
    tx = P0.tx.find(function (x) {
      return x.id === id;
    });
  askConfirm(
    'Hapus transaksi ' + (tx ? '<b>' + (tx.t === '+' ? '+' : '&minus;') + ' ' + rp(tx.amt) + '</b> tanggal ' + fmtD(tx.d) : 'ini') + '?',
    function () {
      var sn = snap('Sebelum menghapus transaksi'),
        P = kas();
      P.tx = P.tx.filter(function (x) {
        return x.id !== id;
      });
      if (kasEdit === id) kasEdit = null;
      save();
      renderAll();
      toast('Transaksi dihapus.', function () {
        restoreSnap(sn.t);
      });
    },
    'Ya, hapus transaksi'
  );
}

var qkT = '-';
function openQuickKas() {
  var P = kasLinked() || kas();
  if (!P) return;
  qkT = '-';
  if ($('qk-out')) $('qk-out').classList.add('on');
  if ($('qk-in')) $('qk-in').classList.remove('on');
  if ($('qka')) $('qka').value = '';
  if ($('qkc')) $('qkc').value = '';
  if ($('qkn')) $('qkn').value = '';
  if ($('qkd')) $('qkd').value = todayISO();
  if ($('qke')) $('qke').textContent = '';
  if ($('qkm')) $('qkm').hidden = false;
  setTimeout(function () {
    if ($('qka')) $('qka').focus();
  }, 60);
}
function closeQuickKas() {
  if ($('qkm')) $('qkm').hidden = true;
}
function saveQuickKas() {
  var a = parseRp($('qka').value);
  if (!a || a <= 0) {
    $('qke').textContent = 'Isi jumlah yang valid. Contoh: 50k atau 50.000.';
    return;
  }
  var d = $('qkd').value;
  if (!ISO_RE.test(d)) {
    $('qke').textContent = 'Pilih tanggal transaksi.';
    return;
  }
  var c = ($('qkc').value || '').trim().slice(0, 30);
  var n = ($('qkn').value || '').trim().slice(0, 80);
  var P = kasLinked() || kas();
  if (!P) return;
  var o = {
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    d: d,
    t: qkT,
    amt: a,
    cat: c,
    note: n,
  };
  P.tx.push(o);
  var am = o.t === '-' && P === kasLinked() ? autoMatchTx(o) : null;
  save();
  closeQuickKas();
  renderAll();
  if (am) toastLinked(am);
  else toast('Transaksi kilat dicatat: ' + (qkT === '+' ? '+ ' : '- ') + rp(a));
}
function bindQuickKas() {
  var qo = $('qk-out'), qi = $('qk-in'), qs = $('qks'), qc = $('qk-cl');
  if (qo) qo.onclick = function () { qkT = '-'; qo.classList.add('on'); qi.classList.remove('on'); };
  if (qi) qi.onclick = function () { qkT = '+'; qi.classList.add('on'); qo.classList.remove('on'); };
  if (qs) qs.onclick = saveQuickKas;
  if (qc) qc.onclick = closeQuickKas;
  ['qka', 'qkc', 'qkn'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveQuickKas(); }
    });
  });
}

/** Pasang event listener tab ini. */
function bindKas() {
  $('v-kas').onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;
    if (d.kt) {
      kasT = d.kt;
      Array.prototype.forEach.call(b.parentNode.children, function (x) {
        x.classList.toggle('on', x === b);
      });
    } else if (b.id === 'ks') kasSave();
    else if (b.id === 'kx') {
      kasEdit = null;
      renderKas();
    } else if (d.ked) {
      kasEdit = d.ked;
      renderKas();
      $('ka').scrollIntoView({ block: 'center' });
    } else if (d.kdel) kasDelTx(d.kdel);
    else if (d.kfocus) {
      $('ka').scrollIntoView({ block: 'center' });
      $('ka').focus();
    } else if (d.mok) kasApplyMatch(d.mok);
    else if (d.mno) kasDismissMatch(d.mno);
    else if (b.id === 'mall') kasApplyAll();
  };
  $('v-kas').onchange = function (e) {
    if (e.target.id === 'mauto') {
      var LP = kasLinked();
      if (LP) {
        LP.auto = !!e.target.checked;
        save();
        renderKas();
      }
    } else if (e.target.id === 'kper') {
      kasPer = e.target.value;
      renderKas();
    } else if (e.target.id === 'ktf') {
      kasTf = e.target.value === '+' || e.target.value === '-' ? e.target.value : 'all';
      renderKas();
    }
  };
  $('v-kas').addEventListener('input', function (e) {
    if (e.target.id === 'ka') fmtLive(e.target);
  });
  $('kpsv').onclick = kasSavePm;
  $('kpc').onclick = function () {
    $('kpm').hidden = true;
  };
}
