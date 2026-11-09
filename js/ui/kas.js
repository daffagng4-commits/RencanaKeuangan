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
  kasTf = 'all', // filter Riwayat transaksi: all | + (masuk) | - (keluar)
  kasFrom = '',
  kasTo = '',
  kasCat = 'all',
  kasDebt = false,
  kasDebtKind = '',
  kasDebtName = '',
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
/** Jumlah masuk (i), keluar (o), dan banyaknya transaksi (n). */
function kasSum(tx) {
  var r = { i: 0, o: 0, n: 0 };
  tx.forEach(function (x) {
    r.n++;
    if (x.t === '+') r.i += x.amt;
    else r.o += x.amt;
  });
  return r;
}
/** Satu kartu: pie pemasukan vs pengeluaran + rincian kategori di sebelahnya. */
function kasPie(R, catHtml) {
  var t = R.i + R.o;
  if (!t) return '';
  var ip = Math.round((R.i / t) * 100),
    op = 100 - ip,
    C = 238.761,
    li = (ip / 100) * C,
    lo = C - li;
  return (
    '<div class="card kas-dash">' +
    '<h2>Pemasukan vs pengeluaran</h2>' +
    '<div class="kas-split' + (catHtml ? '' : ' solo') + '">' +
    '<div class="kas-pie"><div class="pie-wrap"><div class="pie"><svg viewBox="0 0 100 100" role="img" aria-label="Pemasukan ' + ip + '%, pengeluaran ' + op + '%">' +
    '<circle class="pie-slice in" cx="50" cy="50" r="38" stroke="#3aa17e" stroke-dasharray="' + li + ' ' + C + '" transform="rotate(-90 50 50)"><title>Pemasukan ' + ip + '% &middot; ' + rp(R.i) + '</title></circle>' +
    '<circle class="pie-slice out" cx="50" cy="50" r="38" stroke="#d9627f" stroke-dasharray="' + lo + ' ' + C + '" stroke-dashoffset="' + -li + '" transform="rotate(-90 50 50)"><title>Pengeluaran ' + op + '% &middot; ' + rp(R.o) + '</title></circle>' +
    '</svg><span>' + ip + '%</span></div>' +
    '<div class="pie-lg"><span><i style="background:#3aa17e"></i>Pemasukan <b>' + ip + '%</b> &middot; ' + rp(R.i) + '</span>' +
    '<span><i style="background:#d9627f"></i>Pengeluaran <b>' + op + '%</b> &middot; ' + rp(R.o) + '</span></div></div></div>' +
    (catHtml || '') +
    '</div></div>'
  );
}

/** Jenis transaksi utang/piutang sesuai arah kas. */
function debtKinds(t) {
  return t === '-'
    ? [['piutang', 'Piutang baru (saya pinjamkan)'], ['bayar-utang', 'Bayar utang saya']]
    : [['utang', 'Utang baru (saya pinjam)'], ['bayar-piutang', 'Terima bayar piutang']];
}

/** Nama utang/piutang yang dipakai untuk mengelompokkan sisa. */
function debtNameOf(x) {
  return (x.debtName || x.note || x.cat || 'Tanpa nama').trim().slice(0, 40) || 'Tanpa nama';
}

/** Ringkasan utang/piutang dari transaksi kas yang dicentang. */
function debtData(P) {
  var g = {};
  (P.tx || []).forEach(function (x) {
    if (!x.debt || x.debtDone) return;
    var n = debtNameOf(x),
      y = x.d.slice(0, 4),
      o = g[n] || (g[n] = { name: n, utang: 0, piutang: 0, bayarU: 0, bayarP: 0, fromU: '', fromP: '' });
    if (x.debtKind === 'utang') {
      o.utang += x.amt;
      if (!o.fromU || y < o.fromU) o.fromU = y;
    } else if (x.debtKind === 'piutang') {
      o.piutang += x.amt;
      if (!o.fromP || y < o.fromP) o.fromP = y;
    } else if (x.debtKind === 'bayar-utang') o.bayarU += x.amt;
    else if (x.debtKind === 'bayar-piutang') o.bayarP += x.amt;
  });
  return Object.keys(g)
    .map(function (k) {
      var x = g[k];
      x.sisaU = Math.max(0, x.utang - x.bayarU);
      x.sisaP = Math.max(0, x.piutang - x.bayarP);
      return x;
    })
    .filter(function (x) { return x.sisaU > 0 || x.sisaP > 0; });
}

/** Tombol X untuk menyembunyikan satu arah utang/piutang dari kartu. */
function debtXBtn(name, dir) {
  var j = dir === 'u' ? 'utang' : 'piutang';
  return '<button class="g debt-x" data-debt-x="' + esc(name) + '" data-debt-dir="' + dir + '" title="Hilangkan dari daftar" aria-label="Hilangkan ' + j + ' ' + esc(name) + '">&times;</button>';
}

/** Kartu utang/piutang: sisa per nama + tombol bayar yang mengisi form. */
function debtHtml(P) {
  var D = debtData(P);
  if (!D.length) return '';
  var tu = D.reduce(function (a, b) { return a + b.sisaU; }, 0),
    tp = D.reduce(function (a, b) { return a + b.sisaP; }, 0);
  return (
    '<div class="card debt"><h2>Utang &amp; piutang</h2>' +
    '<div class="debt-sum"><div><span>Saya berutang</span><b class="neg">' + rp(tu) + '</b></div><div><span>Orang berutang</span><b class="kin">' + rp(tp) + '</b></div></div>' +
    D.map(function (x) {
      var rows = '';
      if (x.sisaU > 0)
        rows += '<div class="debt-row"><div><b>' + esc(x.name) + '</b><span class="sub">Saya berutang' + (x.fromU ? ' &middot; sejak ' + x.fromU : '') + '</span></div><div><b class="neg">' + rp(x.sisaU) + '</b> <button class="g" data-debt-pay="utang" data-name="' + esc(x.name) + '" data-amt="' + x.sisaU + '">Bayar</button>' + debtXBtn(x.name, 'u') + '</div></div>';
      if (x.sisaP > 0)
        rows += '<div class="debt-row"><div><b>' + esc(x.name) + '</b><span class="sub">Orang berutang' + (x.fromP ? ' &middot; sejak ' + x.fromP : '') + '</span></div><div><b class="kin">' + rp(x.sisaP) + '</b> <button class="g" data-debt-pay="piutang" data-name="' + esc(x.name) + '" data-amt="' + x.sisaP + '">Bayar</button>' + debtXBtn(x.name, 'p') + '</div></div>';
      return rows;
    }).join('') +
    '<div class="sub mt6">Centang <b>Transaksi utang/piutang</b> di form untuk mencatat utang baru. Pembayaran bisa dicicil berkali-kali; sisa di atas otomatis berkurang. Untuk beberapa utang ke orang yang sama, pakai nama berbeda (mis. <b>Budi motor</b>, <b>Budi kos</b>) agar sisanya terpisah.</div></div>'
  );
}

/** Isi form dengan transaksi pembayaran utang/piutang. */
function openDebtForm(name, kind, amt) {
  kasEdit = null;
  kasT = kind === 'utang' ? '-' : '+';
  kasDebt = true;
  kasDebtKind = kind === 'utang' ? 'bayar-utang' : 'bayar-piutang';
  kasDebtName = name;
  renderKas();
  var a = $('ka');
  if (a) {
    a.value = (+amt || 0).toLocaleString('id-ID');
    a.focus();
  }
}


/** Hilangkan satu arah utang/piutang dari kartu tanpa menghapus riwayat kas. */
function hideDebt(name, dir) {
  askConfirm(
    'Hilangkan <b>' + esc(name) + '</b> dari kartu utang/piutang? Transaksi kas tetap tersimpan.',
    function () {
      var P = kas(),
        sn = snap('Sebelum menghilangkan utang');
      P.tx.forEach(function (x) {
        if (!x.debt || debtNameOf(x) !== name) return;
        if (dir === 'u' && (x.debtKind === 'utang' || x.debtKind === 'bayar-utang')) x.debtDone = true;
        if (dir === 'p' && (x.debtKind === 'piutang' || x.debtKind === 'bayar-piutang')) x.debtDone = true;
      });
      save();
      renderAll();
      toast('Utang/piutang dihilangkan dari kartu.', function () {
        restoreSnap(sn.t);
      });
    },
    'Ya, hilangkan'
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
    mName = typeof FULL_MON !== 'undefined' ? FULL_MON[sm] : MON[sm],
    A = kasSum(asc),
    bal = kasBase(P) + A.i - A.o;
  var minD = asc.length ? asc[0].d : todayISO(),
    maxD = asc.length ? asc[asc.length - 1].d : todayISO(),
    catList = [];
  asc.forEach(function (x) {
    var c = x.cat || '';
    if (catList.indexOf(c) < 0) catList.push(c);
  });
  catList.sort();
  var from = kasFrom || minD,
    to = kasTo || maxD;
  if (from < minD || from > maxD) from = minD;
  if (to < minD || to > maxD) to = maxD;
  if (from > to) from = to;
  if (kasCat !== 'all' && kasCat !== '__none' && catList.indexOf(kasCat) < 0) kasCat = 'all';
  var R = kasSum(asc),
    baseL = asc.filter(function (x) {
      return x.d >= from && x.d <= to && (kasCat === 'all' || (x.cat || '') === (kasCat === '__none' ? '' : kasCat));
    }),
    L = baseL.reverse(),
    E = kasEdit
      ? asc.filter(function (x) {
          return x.id === kasEdit;
        })[0]
      : null;
  if (E) kasT = E.t;
  var stat = function (l, v, s) {
    return '<div><span>' + l + '</span><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>';
  };
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
    '</div></div>';
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
  var debtOn = E ? !!E.debt : kasDebt,
    kinds = debtKinds(kasT),
    dKind = E ? E.debtKind : kasDebtKind,
    dName = E ? E.debtName || E.note || '' : kasDebtName;
  if (!kinds.some(function (k) { return k[0] === dKind; })) dKind = kinds[0][0];
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
    '"></div></div>' +
    '<div class="full kdebt"><label class="ck"><input type="checkbox" id="kdebt"' + (debtOn ? ' checked' : '') + '> Transaksi utang/piutang</label>' +
    '<div id="kdbox"' + (debtOn ? '' : ' hidden') + '><div class="kf mt8"><div><label for="kdn">Nama orang / utang</label><input id="kdn" maxlength="40" value="' + esc(dName) + '"></div><div><label for="kdk">Jenis</label><select id="kdk">' +
    kinds.map(function (k) {
      return '<option value="' + k[0] + '"' + (k[0] === dKind ? ' selected' : '') + '>' + k[1] + '</option>';
    }).join('') +
    '</select></div></div><div class="sub mt4" id="kdh">' + (kasT === '-' ? '&minus; Keluar: piutang baru (uang dipinjamkan) atau bayar utang.' : '+ Masuk: utang baru (uang dipinjam) atau terima bayar piutang.') + '</div></div></div>' +
    '<div class="err" id="ke"></div><div class="row2"><button class="p" id="ks">' +
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
      '<div class="kas-cat"><div class="kas-cat-h">Pengeluaran per kategori</div>' +
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
    emptyMsg = kasTf === '+' ? 'Belum ada transaksi masuk di periode ini.' : kasTf === '-' ? 'Belum ada transaksi keluar di periode ini.' : 'Belum ada transaksi di periode ini.',
    filt = kasTf !== 'all' || kasCat !== 'all' || from !== minD || to !== maxD,
    catOpts = '<option value="all">Semua kategori</option>' + catList.map(function (c) {
      return '<option value="' + (c ? esc(c) : '__none') + '"' + ((c ? c : '__none') === kasCat ? ' selected' : '') + '>' + (c ? esc(c) : 'Tanpa kategori') + '</option>';
    }).join(''),
    lastD = '',
    rowsH = LF.slice(0, 200).map(function (x) {
      var sep = x.d !== lastD ? '<div class="daysep"><span>' + fmtD(x.d) + '</span></div>' : '';
      lastD = x.d;
      return sep + '<div class="it2 kit"><div><b class="' +
        (x.t === '-' ? 'neg' : 'kin') +
        '">' +
        (x.t === '-' ? '&minus; ' : '+ ') +
        rp(x.amt) +
        '</b>' +
        (x.cat ? ' <span class="sub">' + esc(x.cat) + '</span>' : '') +
        (x.note ? '<br><span class="sub">' + esc(x.note) + '</span>' : '') +
        lkChip(x) +
        '</div><div>' +
        (x.ro
          ? '<span class="sub">dari ' + (x.ro === 'tabungan' ? 'Target tabungan' : 'Jadwal Bayar') + '</span>'
          : '<button class="g" data-ked="' + x.id + '">Ubah</button><button class="g d" data-kdel="' + x.id + '">Hapus</button>') +
        '</div></div>';
    }).join('');
  var lst =
    '<div class="card"><div class="row2" style="margin:0 0 8px;align-items:center;justify-content:space-between"><h2 class="m0">Riwayat transaksi</h2>' +
    '<select class="wauto" id="ktf" aria-label="Filter jenis transaksi"><option value="all"' + (kasTf === 'all' ? ' selected' : '') + '>Semua</option><option value="+"' + (kasTf === '+' ? ' selected' : '') + '>+ Masuk</option><option value="-" ' + (kasTf === '-' ? ' selected' : '') + '>&minus; Keluar</option></select></div>' +
    '<div class="kflt"><div><label for="kfrom">Dari</label><input type="date" id="kfrom" min="' + minD + '" max="' + maxD + '" value="' + from + '"></div>' +
    '<div><label for="kto">Sampai</label><input type="date" id="kto" min="' + minD + '" max="' + maxD + '" value="' + to + '"></div>' +
    '<div><label for="kcat">Kategori</label><select id="kcat">' + catOpts + '</select></div>' +
    '<button type="button" class="g kreset" id="krst" title="Kembalikan rentang tanggal ke default">Reset</button></div>' +
    (filt ? '<div class="sub mb6">' + LF.length + ' dari ' + asc.length + ' transaksi</div>' : '') +
    (rowsH || '<div class="empty">' + emptyMsg + '</div>' + (!asc.length ? '<div class="row2 mt8"><button type="button" class="p" data-kfocus="1">Catat transaksi pertama</button></div>' : '')) +
    (LF.length > 200 ? '<div class="sub">+ ' + (LF.length - 200) + ' lainnya. Pilih rentang yang lebih sempit.</div>' : '') +
    '</div>';
  el.innerHTML =
    form + kasPie(R, catH) + debtHtml(P) + lst;
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
  var debtOn = $('kdebt') && $('kdebt').checked,
    debtName = $('kdn') ? $('kdn').value.trim().slice(0, 40) : '';
  if (debtOn && !debtName) return kasErr('Isi nama orang / utang untuk transaksi utang/piutang.');
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
  if (debtOn) {
    o.debt = true;
    o.debtName = debtName;
    o.debtKind = $('kdk').value;
  }
  kasDebt = false;
  kasDebtKind = '';
  kasDebtName = '';
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

/** Ganti pilihan jenis utang/piutang saat arah kas berubah. */
function syncDebtKinds() {
  var s = $('kdk');
  if (!s) return;
  var cur = s.value,
    ks = debtKinds(kasT);
  s.innerHTML = ks.map(function (k) {
    return '<option value="' + k[0] + '">' + k[1] + '</option>';
  }).join('');
  s.value = ks.some(function (k) { return k[0] === cur; }) ? cur : ks[0][0];
  var h = $('kdh');
  if (h) h.innerHTML = kasT === '-' ? '&minus; Keluar: piutang baru (uang dipinjamkan) atau bayar utang.' : '+ Masuk: utang baru (uang dipinjam) atau terima bayar piutang.';
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
      syncDebtKinds();
    } else if (b.id === 'ks') kasSave();
    else if (b.id === 'krst') {
      kasFrom = '';
      kasTo = '';
      renderKas();
    } else if (b.id === 'kx') {
      kasEdit = null;
      kasDebt = false;
      kasDebtKind = '';
      kasDebtName = '';
      renderKas();
    } else if (d.ked) {
      kasEdit = d.ked;
      renderKas();
      $('ka').scrollIntoView({ block: 'center' });
    } else if (d.kdel) kasDelTx(d.kdel);
    else if (d.debtX) hideDebt(d.debtX, d.debtDir);
    else if (d.debtPay) openDebtForm(d.name, d.debtPay, d.amt);
    else if (d.kfocus) {
      $('ka').scrollIntoView({ block: 'center' });
      $('ka').focus();
    }
  };
  $('v-kas').onchange = function (e) {
    if (e.target.id === 'ktf') {
      kasTf = e.target.value === '+' || e.target.value === '-' ? e.target.value : 'all';
      renderKas();
    } else if (e.target.id === 'kfrom') {
      kasFrom = e.target.value;
      renderKas();
    } else if (e.target.id === 'kto') {
      kasTo = e.target.value;
      renderKas();
    } else if (e.target.id === 'kcat') {
      kasCat = e.target.value;
      renderKas();
    } else if (e.target.id === 'kdebt') {
      $('kdbox').hidden = !e.target.checked;
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
