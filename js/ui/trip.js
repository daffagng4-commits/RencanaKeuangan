/**
 * Mode Perjalanan: lembar terpisah dari Rencana Keuangan. Tiap perjalanan = satu profil kas terpisah (link=false)
 * berisi anggaran, itinerary per hari (jam, tautan, biaya, metode bayar), pemesanan, checklist, tautan, catatan,
 * dan catatan kas masuk/keluar sendiri. Mendukung satu mata uang asing dengan kurs manual.
 */
var mode = (function () {
    try {
      var m0 = localStorage.getItem('rk-mode');
      return m0 === 'trip' || m0 === 'rebalance' || m0 === 'ibkr' ? m0 : 'rencana';
    } catch (e) {
      return 'rencana';
    }
  })(),
  tripAct = (function () {
    try {
      return localStorage.getItem('rk-trip') || '';
    } catch (e) {
      return '';
    }
  })(),
  tripTab = 'ring',
  itEdit = null,
  gEdit = false,
  SIM = [],
  simK = 'out',
  bkEdit = null,
  kpMode = 'new',
  curTab = 'rincian',
  noteTimer = null,
  WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  ICAT = ['Makan', 'Transport', 'Tiket & Tour', 'Belanja', 'Lainnya'],
  BCAT = ['Transport', 'Penginapan', 'Tiket & Tour', 'Persiapan', 'Lainnya'],
  PAYL = { ic: 'Kartu IC', on: 'Online', cash: 'Cash' },
  CK_STD = ['Paspor / KTP', 'Tiket transportasi', 'Booking penginapan', 'Uang tunai', 'Kartu ATM / kartu kredit', 'Charger dan power bank', 'Obat pribadi', 'Pakaian', 'Perlengkapan mandi', 'Asuransi perjalanan'];

function kid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
function trips() {
  var pr = ALL.kas.pr;
  return Object.keys(pr)
    .filter(function (i) {
      return !pr[i].link;
    })
    .map(function (i) {
      return pr[i];
    });
}
/** Perjalanan yang sedang dibuka (atau null). */
function tp() {
  var P = ALL.kas.pr[tripAct];
  return P && !P.link ? P : null;
}
function remember(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch (e) {}
}
function setMode(m) {
  mode = m;
  remember('rk-mode', m);
  autoTrip();
  renderAll();
}
function setTrip(id) {
  tripAct = id;
  tripTab = tp() && tripActive(tp()) ? 'now' : 'ring';
  gEdit = false;
  itEdit = bkEdit = null;
  kasPer = 'all';
  kasTf = 'all';
  kasEdit = null;
  remember('rk-trip', id);
  renderAll();
}
function dayNo(a, b) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
}
/** Semua tanggal perjalanan: dari Mulai sampai Selesai ditambah tanggal item itinerary. */
function tripDays(P) {
  var set = {};
  if (P.start && P.end && P.end >= P.start)
    for (var t = Date.parse(P.start + 'T00:00:00Z'), n = 0; t <= Date.parse(P.end + 'T00:00:00Z') && n < 60; t += 864e5, n++) set[isoD(t)] = 1;
  P.it.forEach(function (x) {
    set[x.day] = 1;
  });
  return Object.keys(set).sort();
}
function dayLabel(P, d) {
  return (P.start && d >= P.start ? 'Hari ' + (dayNo(d, P.start) + 1) + ' · ' : '') + WD[new Date(d + 'T00:00:00Z').getUTCDay()] + ', ' + fmtD(d);
}
/** Nilai dalam rupiah: v dalam mata uang asing (fx) dikali kurs. */
function val(P, v, fx) {
  return fx && P.rate ? v * P.rate : v;
}
function fxs(P, n) {
  return P.cur + ' ' + Math.round(n).toLocaleString('id-ID');
}
/** Teks jumlah: "Rp ..." dan, bila asing, "JPY ... " di belakangnya. */
function amtTxt(P, v, fx) {
  return fx && P.cur ? fxs(P, v) + (P.rate ? ' <span class="sub">&asymp; ' + rp(val(P, v, fx)) + '</span>' : '') : rp(v);
}
function lnk(u) {
  if (!okUrl(u)) return '';
  return '<a class="lnk" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + (/maps|goo\.gl/i.test(u) ? 'Peta' : /youtu/i.test(u) ? 'Video' : 'Buka') + ' &#8599;</a>';
}
function pchip(p) {
  return p ? '<span class="chp ' + p + '">' + PAYL[p] + '</span>' : '';
}
function bar(v, mx) {
  var pc = mx ? Math.min(100, (v / mx) * 100) : 0;
  return '<div class="catbar" style="margin:8px 0 4px"><i style="width:' + pc.toFixed(1) + '%;background:' + (v > mx ? 'var(--wr)' : 'var(--ac)') + '"></i></div>';
}
function opts(L, sel, lab) {
  return L.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o;
    return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(Array.isArray(o) ? o[1] : o) + '</option>';
  }).join('');
}
/** Rencana biaya: pemesanan + estimasi harian (item itinerary yang bukan "Online", karena yang online dicatat di Pemesanan). */
function tripPlan(P) {
  var r = { b: 0, d: 0, paid: 0, cash: {} };
  P.bk.forEach(function (x) {
    var v = val(P, x.amt, x.fx);
    r.b += v;
    if (x.paid) r.paid += v;
  });
  P.it.forEach(function (x) {
    if (x.pay === 'on' || !x.est) return;
    r.d += val(P, x.est, x.fx);
    var k = (x.pay ? PAYL[x.pay] : 'Lainnya') + ' · ' + (x.cat || 'Lainnya'),
      c = r.cash[k] || (r.cash[k] = { fx: 0, idr: 0 });
    if (x.fx) c.fx += x.est;
    else c.idr += x.est;
  });
  r.t = r.b + r.d;
  return r;
}

function tripBadge(P) {
  var T = tripToday(P), x = T.L[T.cur >= 0 ? T.cur : T.nxt];
  return '<div style="margin-bottom:4px"><span class="chp on">Sedang berlangsung &middot; Hari ' + (dayNo(todayISO(), P.start) + 1) + '/' + (dayNo(P.end, P.start) + 1) + '</span></div>' +
    (x ? '<div class="sub" style="margin-bottom:4px">' + (T.cur >= 0 ? 'Sekarang' : 'Berikutnya') + ': <b>' + (tmShow(x.time) ? tmShow(x.time) + ' ' : '') + esc(x.place) + '</b></div>' : '');
}
function tripList() {
  var L = trips();
  return (
    '<div class="kp"><button class="p" data-tnew="1">+ Perjalanan baru</button><button data-xl="1">Impor Excel</button><button class="g" data-xlt="1">Template Excel</button></div>' +
    (L.map(function (P) {
      var pl = tripPlan(P);
      return (
        '<div class="card" data-trip="' + P.id + '" style="cursor:pointer"><h2>' + esc(P.name) + '</h2>' + (tripActive(P) ? tripBadge(P) : '') + '<div class="sub">' +
        (P.start && P.end ? fmtD(P.start) + ' – ' + fmtD(P.end) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari' : 'Tanggal belum diisi') + '</div>' +
        (P.budget ? bar(pl.t, P.budget) + '<div class="sub">Rencana biaya ' + rp(pl.t) + ' dari anggaran ' + rp(P.budget) + '</div>' : '<div class="sub">Rencana biaya ' + rp(pl.t) + ' · anggaran belum ditentukan</div>') + '</div>'
      );
    }).join('') || '<div class="card"><div class="empty">Belum ada perjalanan. Buat satu untuk mencatat itinerary, pemesanan, checklist, dan rencana biaya.</div></div>')
  );
}

function tripRing(P) {
  var pl = tripPlan(P), td = todayISO(), N = 0, no = 0, byDay = {}, bcat = {};
  P.bk.forEach(function (x) {
    var c = x.cat || 'Lainnya';
    bcat[c] = (bcat[c] || 0) + val(P, x.amt, x.fx);
  });
  P.it.forEach(function (x) {
    if (x.pay === 'on' || !x.est) return;
    var v = val(P, x.est, x.fx), c = x.cat || 'Lainnya';
    byDay[x.day] = (byDay[x.day] || 0) + v;
    bcat[c] = (bcat[c] || 0) + v;
  });
  if (P.start && P.end && P.end >= P.start) {
    N = dayNo(P.end, P.start) + 1;
    if (td >= P.start && td <= P.end) no = dayNo(td, P.start) + 1;
  }
  var st = function (l, v, n) {
    return '<div><span>' + l + '</span><b>' + v + '</b>' + (n ? '<span>' + n + '</span>' : '') + '</div>';
  };
  var left = P.budget - pl.t,
    cells = (P.budget ? st('Anggaran', rp(P.budget)) + st(left >= 0 ? 'Sisa anggaran' : 'Melebihi anggaran', rp(Math.abs(left))) : '') + st('Sudah dibayar', rp(pl.paid), 'pemesanan') + st('Belum dibayar', rp(pl.b - pl.paid), 'pemesanan');
  if (no) cells += st('Hari ke', no + ' dari ' + N);
  else if (N && td < P.start) cells += st('Mulai dalam', dayNo(P.start, td) + ' hari');
  if (N) cells += st('Rencana per hari', rp(pl.t / N));
  var ck = Object.keys(pl.cash).sort(),
    dk = Object.keys(byDay).sort(),
    cl = Object.keys(bcat).sort(function (a, b) { return bcat[b] - bcat[a]; }),
    dmax = 0;
  dk.forEach(function (d) { if (byDay[d] > dmax) dmax = byDay[d]; });
  var catRow = function (k, v, mx, c, extra) {
    var pc = mx ? (v / mx) * 100 : 0;
    return '<div class="catrow"><div class="cathd"><span>' + (c ? '<i class="dot" style="background:' + c + '"></i>' : '') + k + '</span><b>' + extra + '</b></div><div class="catbar"><i style="width:' + pc.toFixed(1) + '%;background:' + (c || 'var(--ac)') + '"></i></div></div>';
  };
  return (
    '<div class="hero"><div class="card" style="margin:0"><div class="sub">Total rencana biaya</div><div class="big">' + rp(pl.t) + '</div><div class="sub">pemesanan ' + rp(pl.b) + ' + estimasi harian ' + rp(pl.d) + '</div>' +
    (P.budget ? bar(pl.t, P.budget) + '<div class="sub">dari anggaran ' + rp(P.budget) + '</div>' : '<div class="sub">Anggaran belum ditentukan (atur lewat tombol Ubah).</div>') +
    (P.cur && P.rate ? '<div class="sub">Kurs 1 ' + esc(P.cur) + ' = ' + rp(P.rate) + '</div>' : '') + '</div><div class="card stats" style="margin:0">' + cells + '</div></div>' +
    (ck.length
      ? '<div class="card"><h2>Siapkan tunai / kartu</h2>' + ck.map(function (k) {
          var c = pl.cash[k];
          return '<div class="it2"><div>' + esc(k) + '</div><div><b>' + (c.fx ? fxs(P, c.fx) + (c.idr ? ' + ' + rp(c.idr) : '') : rp(c.idr)) + '</b>' + (c.fx && P.rate ? ' <span class="sub">&asymp; ' + rp(c.idr + c.fx * P.rate) + '</span>' : '') + '</div></div>';
        }).join('') + '</div>'
      : '') +
    (dk.length ? '<div class="card"><h2>Estimasi per hari</h2>' + dk.map(function (d) { return catRow(esc(dayLabel(P, d)), byDay[d], dmax, '', rp(byDay[d])); }).join('') + '</div>' : '') +
    (cl.length ? '<div class="card"><h2>Rencana biaya per kategori</h2>' + cl.map(function (k, i) { return catRow(esc(k), bcat[k], pl.t, CAT_COLORS[i % CAT_COLORS.length], rp(bcat[k]) + ' <span class="sub">' + Math.round((bcat[k] / pl.t) * 100) + '%</span>'); }).join('') + '</div>' : '')
  );
}

/** Jam 24 jam: tampil 14.00, disimpan HH:MM. */
function tmShow(v) {
  return v ? String(v).replace(':', '.') : '';
}
/** Baca isian jam (14.00, 14:00, 1400, 9.30). Kosong -> '', salah -> null. */
function tmParse(v) {
  v = String(v || '').trim();
  if (!v) return '';
  var m = /^(\d{1,2})[.:]?(\d{2})$/.exec(v) || /^(\d{1,2})$/.exec(v);
  if (!m) return null;
  var h = +m[1], mi = m[2] ? +m[2] : 0;
  return h > 23 || mi > 59 ? null : pad2(h) + ':' + pad2(mi);
}
/** Pratinjau rupiah saat biaya diisi dalam mata uang asing. */
function fxPrev(a, u) {
  var P = tp(), h = $(a + 'h');
  if (!h || !P || !P.cur || !P.rate) return;
  var v = parseRp($(a).value) || 0;
  h.textContent = $(u).value === 'fx' && v ? '\u2248 ' + rp(val(P, v, true)) + ' (kurs 1 ' + P.cur + ' = ' + rp(P.rate) + ')' : '';
}
/** Kotak biaya: jumlah + pilihan mata uang (Rp / asing). */
function amtField(P, id, uid, v, fx) {
  return (
    '<div style="display:flex;gap:6px"><input id="' + id + '" inputmode="numeric" placeholder="0" style="flex:1;min-width:0;font-size:16px;font-weight:600" value="' + (v ? v.toLocaleString('id-ID') : '') + '">' +
    '<select id="' + uid + '" style="width:84px;min-width:0;flex:none;font-weight:600;padding-left:8px;padding-right:4px" aria-label="Mata uang"><option value="idr">Rp</option>' + (P.cur ? '<option value="fx"' + (fx ? ' selected' : '') + '>' + esc(P.cur) + '</option>' : '') + '</select></div>' +
    '<div class="sub" id="' + id + 'h" style="margin-top:4px">' + (P.cur ? '' : 'Mata uang asing: atur lewat Ubah.') + '</div>'
  );
}

function tripItin(P) {
  var E = itEdit ? P.it.filter(function (x) { return x.id === itEdit; })[0] : null,
    days = tripDays(P),
    td = todayISO(),
    form =
      '<div class="card"><h2>' + (E ? 'Ubah kegiatan' : 'Tambah kegiatan') + '</h2>' +
      '<div class="fr wr"><div class="fw" style="flex:0 0 140px"><label for="itd">Tanggal</label><input id="itd" type="date" value="' + (E ? E.day : days[0] || td) + '"></div>' +
      '<div style="flex:0 0 68px"><label for="itt">Mulai</label><input id="itt" inputmode="numeric" maxlength="5" placeholder="14.00" value="' + tmShow(E ? E.time : '') + '"></div>' +
      '<div style="flex:0 0 68px"><label for="itt2">Selesai</label><input id="itt2" inputmode="numeric" maxlength="5" placeholder="16.30" value="' + tmShow(E ? E.time2 : '') + '"></div>' +
      '<div class="fw" style="flex:1 1 140px"><label for="itp">Kegiatan</label><input id="itp" maxlength="120" placeholder="mis. Senso-ji Temple" value="' + (E ? esc(E.place) : '') + '"></div></div>' +
      '<div class="fr wr"><div class="fw" style="flex:2 1 0"><label for="ite">Biaya</label>' + amtField(P, 'ite', 'itu', E ? E.est : 0, E && E.fx) + '</div>' +
      '<div style="flex:1.3 1 0"><label for="itm">Pembayaran</label><select id="itm" title="Online: dicatat di Pemesanan">' + opts([['', 'Belum ditentukan'], ['ic', 'Kartu IC'], ['on', 'Online'], ['cash', 'Cash']], E ? E.pay : '') + '</select></div>' +
      '<div style="flex:1 1 0"><label for="itk">Kategori</label><select id="itk">' + opts(ICAT, E ? E.cat : 'Transport') + '</select></div></div>' +
      '<div class="fr wr"><div class="fw" style="flex:1 1 0"><label for="itl">Tautan (peta / tiket) (opsional)</label><input id="itl" inputmode="url" placeholder="https://maps.app.goo.gl/..." value="' + (E ? esc(E.link) : '') + '"></div>' +
      '<div class="fw" style="flex:1 1 0"><label for="itn">Catatan (opsional)</label><input id="itn" maxlength="200" value="' + (E ? esc(E.note) : '') + '"></div></div>' +
      '<div class="err" id="iter"></div><div class="row2"><button class="p" data-its="1">' + (E ? 'Simpan perubahan' : 'Tambah') + '</button>' + (E ? '<button data-itx="1">Batal</button>' : '') + '</div></div>';
  return (
    form +
    (days.map(function (d) {
      var L = P.it.filter(function (x) { return x.day === d; }).sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; }),
        tot = 0, fxm = {},
        stay = P.bk.filter(function (b) { return b.cat === 'Penginapan' && b.a && b.b && d >= b.a && d < b.b; });
      L.forEach(function (x) {
        if (x.pay === 'on' || !x.est) return;
        tot += val(P, x.est, x.fx);
        if (x.fx) fxm[x.cat || 'Lainnya'] = (fxm[x.cat || 'Lainnya'] || 0) + x.est;
      });
      return (
        '<div class="card"><div class="dh"><h2>' + esc(dayLabel(P, d)) + '</h2>' + (d === td ? '<span class="chp ic">Hari ini</span>' : '') + '</div>' +
        '<input class="dti" data-dt="' + d + '" maxlength="60" placeholder="Judul hari, mis. Jakarta – Tokyo" value="' + esc(P.dt[d] || '') + '">' +
        (stay.length ? '<div class="sub" style="margin-bottom:6px">&#127976; Menginap: ' + stay.map(function (b) { return esc(b.title); }).join(', ') + '</div>' : '') +
        (tot ? '<div class="sub" style="margin-bottom:4px">Estimasi hari ini <b>' + rp(tot) + '</b>' + (Object.keys(fxm).length ? ' · ' + Object.keys(fxm).map(function (k) { return k + ' ' + fxs(P, fxm[k]); }).join(' · ') : '') + '</div>' : '') +
        (L.map(function (x) {
          return (
            '<div class="itm"><div class="tm">' + tmShow(x.time) + (x.time2 ? '<br>' + tmShow(x.time2) : '') + '</div><div><div class="ttl"' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.place) + '</div><div>' +
            (x.cat ? '<span class="chp" style="background:transparent;border:1px solid var(--ln)">' + esc(x.cat) + '</span>' : '') + pchip(x.pay) + lnk(x.link) + '</div>' + (x.note ? '<div class="sub">' + esc(x.note) + '</div>' : '') +
            '<div class="ac"><button class="g" data-itdone="' + x.id + '" aria-label="Tandai selesai">' + (x.done ? '&#9745; Selesai' : '&#9744; Selesai') + '</button>' +
            '<button class="g" data-ited="' + x.id + '">Ubah</button><button class="g d" data-itdel="' + x.id + '">Hapus</button></div></div>' +
            '<div class="co">' + (x.est ? amtTxt(P, x.est, x.fx) : '') + '</div></div>'
          );
        }).join('') || '<div class="sub">Belum ada kegiatan.</div>') + '</div>'
      );
    }).join('') || '<div class="card"><div class="empty">Isi tanggal Mulai dan Selesai (tombol Ubah) atau tambah kegiatan bertanggal.</div></div>')
  );
}

function tripBook(P) {
  var E = bkEdit ? P.bk.filter(function (x) { return x.id === bkEdit; })[0] : null, pl = tripPlan(P),
    form =
      '<div class="card"><h2>' + (E ? 'Ubah pemesanan' : 'Tambah pemesanan') + '</h2>' +
      '<div class="fr wrb"><div class="fw" style="flex:2 1 0"><label for="bkt">Nama (tiket, hotel, tour)</label><input id="bkt" maxlength="120" placeholder="mis. Tiket pesawat CGK-HND" value="' + (E ? esc(E.title) : '') + '"></div>' +
      '<div class="fw" style="flex:1.4 1 0"><label for="bke">Jumlah</label>' + amtField(P, 'bke', 'bku', E ? E.amt : 0, E && E.fx) + '</div></div>' +
      '<div class="fr wrb"><div style="flex:1 1 0"><label for="bka">Mulai / check-in</label><input id="bka" type="date" value="' + (E ? E.a : '') + '"></div>' +
      '<div style="flex:1 1 0"><label for="bkb">Selesai / check-out</label><input id="bkb" type="date" value="' + (E ? E.b : '') + '"></div>' +
      '<div style="flex:1 1 0"><label for="bkm">Pembayaran</label><select id="bkm">' + opts([['on', 'Online'], ['cash', 'Cash'], ['ic', 'Kartu IC'], ['', 'Belum ditentukan']], E ? E.pay : 'on') + '</select></div></div>' +
      '<div class="fr"><div class="fw" style="flex:1 1 0"><label for="bkl">Tautan (opsional)</label><input id="bkl" inputmode="url" placeholder="https://..." value="' + (E ? esc(E.link) : '') + '"></div></div>' +
      '<div class="fr"><div class="fw" style="flex:0 1 280px"><label for="bkc">Kategori</label><select id="bkc">' + opts(BCAT, E ? E.cat : 'Transport') + '</select></div></div>' +
      '<div class="err" id="bker"></div><div class="row2"><button class="p" data-bks="1">' + (E ? 'Simpan perubahan' : 'Tambah') + '</button>' + (E ? '<button data-bkx="1">Batal</button>' : '') + '</div></div>',
    cats = BCAT.concat(P.bk.map(function (x) { return x.cat; })).filter(function (c, i, a) { return a.indexOf(c) === i; });
  return (
    '<div class="card"><h2>Ringkasan pemesanan</h2><div class="stats"><div><span>Total</span><b>' + rp(pl.b) + '</b></div><div><span>Sudah dibayar</span><b>' + rp(pl.paid) + '</b></div><div><span>Belum dibayar</span><b>' + rp(pl.b - pl.paid) + '</b></div></div></div>' +
    form +
    (cats.map(function (c) {
      var L = P.bk.filter(function (x) { return x.cat === c; }), sum = 0;
      if (!L.length) return '';
      L.forEach(function (x) { sum += val(P, x.amt, x.fx); });
      return (
        '<div class="card"><div class="pgrp"><h2 style="margin:0">' + esc(c) + '</h2><b>' + rp(sum) + '</b></div>' +
        L.map(function (x) {
          return (
            '<div class="itm" style="grid-template-columns:1fr auto"><div><div class="ttl">' + esc(x.title) + '</div><div>' + pchip(x.pay) + (x.a ? '<span class="sub">' + dShort(x.a) + (x.b ? ' – ' + dShort(x.b) : '') + '</span> ' : '') + lnk(x.link) +
            '</div><div class="ac" style="justify-content:flex-start"><button class="g" data-bkpay="' + x.id + '">' + (x.paid ? '&#9745; Lunas' : '&#9744; Tandai lunas') + '</button><button class="g" data-bked="' + x.id + '">Ubah</button><button class="g d" data-bkdel="' + x.id + '">Hapus</button></div></div>' +
            '<div class="co">' + amtTxt(P, x.amt, x.fx) + '</div></div>'
          );
        }).join('') + '</div>'
      );
    }).join('') || '<div class="card"><div class="empty">Belum ada pemesanan. Catat tiket pesawat, hotel, dan tour di sini.</div></div>')
  );
}

function tripCek(P) {
  var n = P.ck.filter(function (x) { return x.done; }).length;
  return (
    '<div class="card"><h2>Checklist barang bawaan</h2><div class="sub" style="margin-bottom:8px">' + n + ' dari ' + P.ck.length + ' siap</div>' +
    (P.ck.length ? bar(n, P.ck.length).replace('var(--wr)', 'var(--ac)') : '') +
    '<div class="row2" style="margin:10px 0"><input id="ckn" maxlength="60" placeholder="mis. Topi, Sunscreen"><button class="p" data-cka="1">Tambah</button></div>' +
    (P.ck.map(function (x) {
      return '<div class="it2"><div><button class="g" data-cktog="' + x.id + '">' + (x.done ? '&#9745;' : '&#9744;') + '</button><span' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.text) + '</span></div><div><button class="g d" data-ckdel="' + x.id + '">Hapus</button></div></div>';
    }).join('') || '<div class="sub">Belum ada barang.</div>') +
    (P.ck.length ? '' : '<div class="row2"><button data-ckstd="1">Isi daftar standar</button></div>') + '</div>'
  );
}

function tripCat(P) {
  return (
    '<div class="card"><h2>Tautan berguna</h2><div class="sub" style="margin-bottom:8px">Video panduan, situs tiket, peta, dan lainnya.</div><div class="kf"><div><input id="lkt" maxlength="80" placeholder="Judul, mis. Cara bayar bus pakai IC card"></div><div><input id="lku" inputmode="url" placeholder="https://..."></div></div>' +
    '<div class="err" id="lker"></div><div class="row2" style="margin-bottom:8px"><button class="p" data-lka="1">Tambah</button></div>' +
    P.lk.map(function (x) { return '<div class="it2"><div>' + esc(x.title) + '</div><div>' + lnk(x.url) + '<button class="g d" data-lkdel="' + x.id + '">Hapus</button></div></div>'; }).join('') + '</div>' +
    '<div class="card"><h2>Catatan penting</h2><div class="sub" style="margin-bottom:8px">Kode booking, alamat, kontak darurat. Tersimpan otomatis.</div><textarea id="tnote" maxlength="2000" placeholder="mis. Hotel: ... Kode booking: ...">' + esc(P.note) + '</textarea></div>'
  );
}

function renderTrip() {
  var el = $('v-trip');
  if (mode !== 'trip') {
    el.innerHTML = '';
    return;
  }
  var P = tp();
  if (!P) {
    el.innerHTML = tripList();
    return;
  }
  if (tripTab === 'now' && !tripActive(P)) tripTab = 'ring';
  var tabs = (tripActive(P) ? [['now', 'Hari ini']] : []).concat([['ring', 'Ringkasan'], ['itin', 'Itinerary'], ['book', 'Pemesanan'], ['cek', 'Checklist'], ['cat', 'Catatan'], ['sv', 'Tabungan']]);
  el.innerHTML =
    '<div class="kp"><button class="tbk" data-tback="1">&larr; Semua perjalanan</button><button class="g" data-tshare="1">Bagikan</button><button class="g" data-ted="1">Ubah</button><button class="g d" data-tdel="1">Hapus</button></div><h2 style="margin:0 0 2px">' + esc(P.name) + '</h2><div class="sub" style="margin-bottom:12px">' +
    (P.start && P.end ? fmtD(P.start) + ' – ' + fmtD(P.end) : 'Tanggal belum diisi') + (P.cur && P.rate ? ' · 1 ' + P.cur + ' = ' + rp(P.rate) : '') + '</div><div class="kt" style="flex-wrap:wrap;margin-bottom:14px">' +
    tabs.map(function (t) { return '<button type="button" class="yp' + (tripTab === t[0] ? ' on' : '') + '" data-tt="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    (tripTab === 'now' ? tripNow(P) : tripTab === 'itin' ? tripItin(P) : tripTab === 'book' ? tripBook(P) : tripTab === 'cek' ? tripCek(P) : tripTab === 'cat' ? tripCat(P) : tripTab === 'sv' ? goalCard(P, tripPlan(P)) : tripRing(P));
  if (P.cur) {
    fxPrev('ite', 'itu');
    fxPrev('bke', 'bku');
  }
  if ($('gprev')) goalPrev();
}

/* ===== Alat: Rebalance porto & IBKR vs Flip =====
 * Dua halaman mandiri di folder tools/ (tampil lewat iframe, tidak terhubung ke data Rencana Keuangan).
 * Isian keduanya disimpan di perangkat (localStorage 'rk-tool-<nama>') dan, bila sudah masuk, di Supabase
 * tabel rk_tools (satu baris per akun per alat). Bila lokal dan cloud berbeda, yang paling baru dipakai. */
var TOOLS = {
    rebalance: { title: 'Rebalance porto', src: 'tools/rebalance/index.html' },
    ibkr: { title: 'IBKR vs Flip', src: 'tools/ibkr-flip/index.html' },
  },
  toolFrames = {},
  toolReady = {},
  toolPushT = {},
  toolMsg = {};

function toolLocal(name) {
  try {
    var o = JSON.parse(localStorage.getItem('rk-tool-' + name) || 'null');
    return o && typeof o.t === 'number' && o.state ? o : null;
  } catch (e) {
    return null;
  }
}

function toolSaveLocal(name, state, t) {
  try {
    localStorage.setItem('rk-tool-' + name, JSON.stringify({ state: state, t: t }));
  } catch (e) {}
}

function toolStat(name, text, bad) {
  toolMsg[name] = { t: text, bad: bad };
  var el = $('tstat-' + name);
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? 'var(--wr)' : 'var(--mut)';
}

function toolErr(err) {
  var m = (err && err.message) || '';
  if ((err && err.code === '42P01') || /rk_tools/.test(m) && /not exist|schema cache|find the table/i.test(m))
    return 'Tabel rk_tools belum ada di Supabase. Jalankan schema.sql terbaru di SQL Editor. Data tetap tersimpan di perangkat ini.';
  return 'Gagal sinkron: ' + m;
}

function toolTheme() {
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || t === 'bwd' ? 'dark' : t === 'light' || t === 'bw' ? 'light' : '';
}

function toolPost(name, msg) {
  var f = toolFrames[name];
  if (!f || !f.contentWindow) return;
  msg.rkTool = true;
  try {
    f.contentWindow.postMessage(msg, location.origin === 'null' ? '*' : location.origin);
  } catch (e) {}
}

function toolSendLoad(name) {
  var L = toolLocal(name);
  toolPost(name, { type: 'load', state: L ? L.state : null, theme: toolTheme() });
}

function toolMount(name) {
  var box = $('v-' + name);
  if (!box || toolFrames[name]) return;
  var d = TOOLS[name];
  box.innerHTML =
    '<div class="sub" id="tstat-' + name + '" style="margin:0 0 8px"></div>' +
    '<iframe id="tf-' + name + '" title="' + d.title + '" src="' + d.src +
    '" style="width:100%;height:900px;border:0;border-radius:14px;display:block"></iframe>';
  toolFrames[name] = $('tf-' + name);
  var m = toolMsg[name];
  if (m) toolStat(name, m.t, m.bad);
  else if (sbUser) toolStat(name, 'Menyinkronkan...');
  else toolStat(name, 'Data tersimpan di perangkat ini. Masuk untuk sinkron antar perangkat.');
}

function toolSchedPush(name) {
  if (!sb || !sbUser) {
    toolStat(name, 'Tersimpan di perangkat ini. Masuk untuk sinkron ke cloud.');
    return;
  }
  toolStat(name, 'Menyimpan ke cloud...');
  clearTimeout(toolPushT[name]);
  toolPushT[name] = setTimeout(function () {
    toolPush(name);
  }, 1500);
}

function toolPush(name) {
  var L = toolLocal(name);
  if (!L || !sb || !sbUser) return Promise.resolve();
  return sb
    .from('rk_tools')
    .upsert({ user_id: sbUser.id, tool: name, data: L.state, updated_at: new Date(L.t).toISOString() })
    .then(function (r) {
      if (r.error) toolStat(name, toolErr(r.error), 1);
      else toolStat(name, 'Tersinkron ' + clock());
    });
}

/** Setelah masuk: bandingkan lokal vs cloud per alat; yang terbaru menang. */
function toolsPull() {
  if (!sb || !sbUser) return Promise.resolve();
  return sb
    .from('rk_tools')
    .select('tool,data,updated_at')
    .eq('user_id', sbUser.id)
    .then(function (r) {
      if (r.error) {
        Object.keys(TOOLS).forEach(function (n) {
          toolStat(n, toolErr(r.error), 1);
        });
        return;
      }
      var rows = {};
      (r.data || []).forEach(function (x) {
        rows[x.tool] = x;
      });
      Object.keys(TOOLS).forEach(function (n) {
        var L = toolLocal(n),
          R = rows[n],
          rt = R ? Date.parse(R.updated_at) || 0 : 0;
        if (R && R.data && (!L || rt > L.t)) {
          toolSaveLocal(n, R.data, rt);
          if (toolReady[n]) toolSendLoad(n);
          toolStat(n, 'Tersinkron ' + clock() + ' (data cloud dimuat)');
        } else if (L && (!R || L.t > rt)) toolPush(n);
        else toolStat(n, 'Tersinkron ' + clock());
      });
    });
}

window.addEventListener('message', function (e) {
  var m = e.data;
  if (!m || m.rkTool !== true) return;
  var name = Object.keys(toolFrames).filter(function (k) {
    return toolFrames[k].contentWindow === e.source;
  })[0];
  if (!name) return;
  if (m.type === 'ready') {
    toolReady[name] = true;
    toolSendLoad(name);
  } else if (m.type === 'save' && m.state && typeof m.state === 'object') {
    toolSaveLocal(name, m.state, Date.now());
    toolSchedPush(name);
  } else if (m.type === 'height') {
    var hh = Math.min(20000, Math.max(300, Math.ceil(+m.h || 0)));
    if (Math.abs(hh - toolFrames[name].offsetHeight) > 2) toolFrames[name].style.height = hh + 'px';
  }
});

/** Tampilan sesuai mode: Rencana (tab + kontrol tahun), Perjalanan (lembar sendiri), atau alat (Rebalance porto / IBKR vs Flip). */
function modeUi() {
  var T = mode === 'trip',
    X = !!TOOLS[mode],
    O = T || X;
  document.querySelectorAll('#mdbar [data-md]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.md === mode);
  });
  $('v-trip').hidden = !T;
  Object.keys(TOOLS).forEach(function (n) {
    $('v-' + n).hidden = mode !== n;
  });
  if (X) toolMount(mode);
  document.querySelector('.w').style.maxWidth = mode === 'rebalance' ? '1500px' : '';
  document.querySelector('nav').style.display = O ? 'none' : '';
  ['year', 'sm', 'saldo'].forEach(function (id) {
    $(id).parentNode.style.display = O ? 'none' : '';
  });
  $('rem').style.display = O ? 'none' : '';
  document.querySelector('h1').textContent = T ? 'Perjalanan' : X ? TOOLS[mode].title : 'Rencana Keuangan';
  if (O) {
    ['rincian', 'jadwal', 'item', 'kas', 'sim'].forEach(function (x) {
      $('v-' + x).hidden = true;
    });
    $('yb').style.display = 'none';
  } else tab(curTab);
}

function kasOpenPm(m) {
  var P = m === 'new' ? null : tp();
  kpMode = m;
  $('kpt').textContent = P ? 'Ubah perjalanan' : 'Perjalanan baru';
  $('kpn').value = P ? P.name : '';
  $('kpa').value = P ? P.start : '';
  $('kpb').value = P ? P.end : '';
  $('kpgm').value = P && P.budget > 0 ? '1' : '0';
  $('kpgw').hidden = $('kpgm').value !== '1';
  $('kpg').value = P && P.budget ? P.budget.toLocaleString('id-ID') : '';
  $('kpu').value = P ? P.cur : '';
  $('kpk').value = P && P.rate ? P.rate : '';
  $('kpe').textContent = '';
  $('kpm').hidden = false;
  $('kpn').focus();
}

function kasSavePm() {
  var n = $('kpn').value.trim().slice(0, 30),
    a = $('kpa').value,
    b = $('kpb').value,
    cu = $('kpu').value.trim().toUpperCase(),
    rt = parseFloat($('kpk').value) || 0,
    useB = $('kpgm').value === '1',
    bg = useB ? parseRp($('kpg').value) || 0 : 0,
    err = function (t) {
      $('kpe').textContent = t;
    };
  if (!n) return err('Nama perjalanan belum diisi.');
  if (a && b && b < a) return err('Tanggal selesai harus sama atau sesudah tanggal mulai.');
  if (useB && !(bg > 0)) return err('Isi jumlah anggaran, atau pilih "Belum menentukan anggaran".');
  if (cu && !/^[A-Z]{3}$/.test(cu)) return err('Mata uang terdiri dari 3 huruf, mis. JPY.');
  if (cu && !(rt > 0)) return err('Isi kurs: berapa rupiah untuk 1 ' + cu + '.');
  var dup = trips().some(function (x) {
    return x.name.toLowerCase() === n.toLowerCase() && !(kpMode === 'edit' && x.id === tripAct);
  });
  if (dup) return err('Nama perjalanan sudah dipakai.');
  var P;
  if (kpMode === 'new') {
    var id = 'p' + Date.now().toString(36);
    P = ALL.kas.pr[id] = { id: id, name: n, saldo: 0, link: false, start: '', end: '', budget: 0, cur: '', rate: 0, dt: {}, tx: [], it: [], bk: [], lk: [], ck: [], note: '' };
    tripAct = id;
    tripTab = 'ring';
    remember('rk-trip', id);
  } else P = tp();
  P.name = n;
  P.start = a;
  P.end = b;
  P.budget = bg;
  P.cur = cu;
  P.rate = cu ? rt : 0;
  save();
  $('kpm').hidden = true;
  renderAll();
}

function itSave() {
  var P = tp(), d = $('itd').value, pl = $('itp').value.trim(), l = $('itl').value.trim(), err = function (t) { $('iter').textContent = t; };
  if (!ISO_RE.test(d)) return err('Pilih tanggal.');
  if (!pl) return err('Isi nama kegiatan.');
  var t1 = tmParse($('itt').value), t2 = tmParse($('itt2').value);
  if (t1 === null || t2 === null) return err('Jam memakai format 24 jam, mis. 14.00 atau 09.30.');
  if (l && !okUrl(l)) return err('Tautan harus diawali http:// atau https://');
  var o = { day: d, time: t1, time2: t2, place: pl.slice(0, 120), cat: $('itk').value, est: parseRp($('ite').value) || 0, fx: !!$('itu') && $('itu').value === 'fx', pay: $('itm').value, link: l, note: $('itn').value.trim().slice(0, 200) };
  if (itEdit)
    P.it = P.it.map(function (x) { return x.id === itEdit ? Object.assign({}, x, o) : x; });
  else P.it.push(Object.assign({ id: kid('i'), done: false, rec: '' }, o));
  itEdit = null;
  save();
  renderTrip();
}
function bkSave() {
  var P = tp(), t = $('bkt').value.trim(), l = $('bkl').value.trim(), a = $('bka').value, b = $('bkb').value, err = function (m) { $('bker').textContent = m; };
  if (!t) return err('Isi nama pemesanan.');
  if (l && !okUrl(l)) return err('Tautan harus diawali http:// atau https://');
  if (a && b && b < a) return err('Tanggal selesai harus sama atau sesudah tanggal mulai.');
  var o = { title: t.slice(0, 120), cat: $('bkc').value, amt: parseRp($('bke').value) || 0, fx: !!$('bku') && $('bku').value === 'fx', pay: $('bkm').value, link: l, a: a, b: b };
  if (bkEdit)
    P.bk = P.bk.map(function (x) { return x.id === bkEdit ? Object.assign({}, x, o) : x; });
  else P.bk.push(Object.assign({ id: kid('b'), paid: false, rec: '' }, o));
  bkEdit = null;
  save();
  renderTrip();
}
/** Tandai pemesanan lunas / belum lunas. */
function bkPay(id) {
  var x = tp().bk.filter(function (b) { return b.id === id; })[0];
  x.paid = !x.paid;
  save();
  renderTrip();
}
/* ===== Target tabungan perjalanan ===== */
/** Target tabungan semua perjalanan (dipakai mesin perhitungan Rincian). */
function kasGoals() {
  return Object.keys(ALL.kas.pr)
    .map(function (i) { return ALL.kas.pr[i]; })
    .filter(function (P) { return !P.link && P.goal && P.goal.link !== false; })
    .map(function (P) { return Object.assign({ id: P.id, name: P.name }, P.goal); });
}
/** Daftar bulan 'YYYY-MM' dari a sampai b (inklusif). */
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
function goalMonths(g) {
  return monthList(g.from, g.to);
}
function goalMonthsIn(g, y) {
  return goalMonths(g).filter(function (k) { return +k.slice(0, 4) === y; }).map(function (k) { return +k.slice(5) - 1; });
}
function monthLbl(k) {
  return MON[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
}
function goalSel(id, opts, v) {
  return '<select id="' + id + '">' + opts.map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + monthLbl(k) + '</option>'; }).join('') + '</select>';
}
function goalOpts(P) {
  return monthList(todayISO().slice(0, 7), P.start.slice(0, 7));
}
function goalCard(P, pl) {
  var g = P.goal, lk = !g || g.link !== false;
  if (!P.start) return '<div class="card"><h2>Target tabungan</h2><div class="sub">Isi tanggal mulai perjalanan (tombol Ubah) untuk menghitung tabungan per bulan.</div></div>';
  var opts = goalOpts(P);
  if (g && !gEdit) {
    var cm = todayISO().slice(0, 7), ms = goalMonths(g), el = ms.filter(function (k) { return k <= cm; }).length, got = Math.min(g.t, g.s0 + g.per * el), C = calc(),
      neg = C.rows.filter(function (r) { return r.ak < 0; }), low = C.rows.reduce(function (a, r) { return !a || r.ak < a.ak ? r : a; }, null);
    return (
      '<div class="card"><h2>Target tabungan</h2><div class="sub">Terkumpul <b>' + rp(got) + '</b> dari ' + rp(g.t) + '</div>' + bar(got, g.t) +
      '<div class="sub">Sisihkan <b>' + rp(g.per) + '</b> per bulan &middot; ' + monthLbl(g.from) + ' – ' + monthLbl(g.to) + ' &middot; bulan ke ' + Math.min(el, ms.length) + ' dari ' + ms.length + '</div>' +
      '<div class="sub" style="margin-top:6px">' + (lk ? 'Tersambung ke Rencana Keuangan: tabungan ini otomatis dihitung sebagai pengeluaran bulanan di <b>Rincian Bulanan</b>.' : 'Tidak tersambung ke Rencana Keuangan: hanya sebagai pencatat, tidak memengaruhi Rincian Bulanan.') + '</div>' +
      (lk && !goalMonthsIn(g, +S.year).length
        ? '<div style="margin-top:8px" class="chp ic">Bulan menabung ada di tahun ' + Object.keys(ms.reduce(function (o, k) { o[k.slice(0, 4)] = 1; return o; }, {})).join(' & ') + '. Ganti Tahun di mode Rencana untuk melihat dampaknya.</div>'
        : '') +
      (lk && low && goalMonthsIn(g, +S.year).length ? '<div style="margin-top:8px" class="chp ' + (neg.length ? 'cash' : 'on') + '">' + (neg.length ? 'Saldo Rencana ' + S.year + ' negatif di ' + neg.map(function (r) { return MON[r.m]; }).join(', ') : 'Saldo Rencana ' + S.year + ' tetap positif (terendah ' + rp(low.ak) + ' di ' + MON[low.m] + ')') + '</div>' : '') +
      '<div class="acts" style="margin-top:8px"><button class="g" data-gedit="1">Ubah target</button><button class="g" data-glink="1">' + (lk ? 'Putuskan dari Rencana' : 'Sambungkan ke Rencana') + '</button><button class="g d" data-gdel="1">Hapus target</button></div></div>'
    );
  }
  if (!opts.length) return '<div class="card"><h2>Target tabungan</h2><div class="sub">Perjalanan ini sudah dimulai, jadi tidak ada bulan tersisa untuk menabung.</div></div>';
  var t0 = g ? g.t : Math.ceil(pl.t / 1000) * 1000, last = opts[opts.length - 1], before = opts.length > 1 ? opts[opts.length - 2] : last;
  return (
    '<div class="card"><h2>Target tabungan</h2><div class="sub" style="margin-bottom:8px">Hitung berapa yang perlu disisihkan tiap bulan sebelum berangkat.</div><div class="kf"><div><label for="gt">Target (Rp)</label><input id="gt" inputmode="numeric" value="' + (t0 ? t0.toLocaleString('id-ID') : '') +
    '"></div><div><label for="gs">Sudah terkumpul (Rp)</label><input id="gs" inputmode="numeric" placeholder="0" value="' + (g && g.s0 ? g.s0.toLocaleString('id-ID') : '') + '"></div><div><label for="gf">Mulai menabung</label>' + goalSel('gf', opts, g ? g.from : opts[0]) +
    '</div><div><label for="gz">Terakhir menabung</label>' + goalSel('gz', opts, g ? g.to : before) + '</div><div style="grid-column:1/-1"><label for="gl">Sambungkan ke Rencana Keuangan?</label><select id="gl"><option value="1"' + (lk ? ' selected' : '') + '>Ya, hitung sebagai pengeluaran bulanan di Rincian</option><option value="0"' + (lk ? '' : ' selected') + '>Tidak, hanya pencatat target</option></select></div></div><div class="sub" id="gprev" style="margin:8px 0"></div><div class="err" id="gerr"></div><div class="row2"><button class="p" data-gset="1">Simpan target</button>' + (g ? '<button data-gcancel="1">Batal</button>' : '') + '</div></div>'
  );
}
function goalCalc() {
  var t = parseRp($('gt').value) || 0, s0 = parseRp($('gs').value) || 0, a = $('gf').value, b = $('gz').value, n = a && b && b >= a ? monthList(a, b).length : 0;
  return { link: !$('gl') || $('gl').value !== '0', t: t, s0: s0, from: a, to: b, n: n, per: n && t > s0 ? Math.ceil((t - s0) / n / 1000) * 1000 : 0 };
}
function goalPrev() {
  var c = goalCalc();
  $('gprev').innerHTML = !c.n ? 'Bulan terakhir tidak boleh sebelum bulan mulai.' : !c.per ? 'Target sudah tercapai dengan dana yang terkumpul.' : 'Sisihkan <b>' + rp(c.per) + '</b> per bulan &times; ' + c.n + ' bulan (' + monthLbl(c.from) + ' – ' + monthLbl(c.to) + ').';
}
function goalSave() {
  var c = goalCalc();
  if (!(c.t > 0)) { $('gerr').textContent = 'Isi target tabungan.'; return; }
  if (!c.n) { $('gerr').textContent = 'Bulan terakhir tidak boleh sebelum bulan mulai.'; return; }
  if (!c.per) { $('gerr').textContent = 'Dana yang terkumpul sudah mencapai target.'; return; }
  tp().goal = { t: c.t, s0: c.s0, from: c.from, to: c.to, per: c.per, link: c.link };
  gEdit = false;
  save();
  renderAll();
  toast('Target tabungan disimpan. Rincian Bulanan ikut menghitungnya.');
}
function goalDel() {
  var sn = snap('Sebelum menghapus target tabungan');
  tp().goal = null;
  save();
  renderAll();
  toast('Target tabungan dihapus.', function () { restoreSnap(sn.t); });
}

/* ===== Simulasi "bagaimana jika" ===== */
function simMonths(x) {
  var e = x.rep === 'sekali' ? x.m : x.rep === 'n' ? Math.min(11, x.m + Math.max(1, x.n) - 1) : 11, r = [];
  for (var m = x.m; m <= e; m++) r.push(m);
  return r;
}
/** Hitung Rincian dengan skenario diterapkan sementara; data asli tidak berubah. */
function simCalc(list) {
  var keepS = S, KL = kasLinked(), keepTx = KL.tx, extra = [], C = JSON.parse(JSON.stringify(S)), y = +S.year;
  list.forEach(function (x) {
    if (x.k === 'in' || x.k === 'out') simMonths(x).forEach(function (mm) { extra.push({ d: y + '-' + pad2(mm + 1) + '-01', t: x.k === 'in' ? '+' : '-', amt: x.amt }); });
    else
      C.items.forEach(function (it) {
        if (it.id != x.id) return;
        if (x.k === 'stop') { it.end = isoD(Date.UTC(y, x.m, 0)); it.cnt = 0; }
        else if (x.k === 'cycle' || x.k === 'shift') simPutChg(it, simChg(it, x));
        else it.ch = (it.ch || []).concat([{ from: y + '-' + pad2(x.m + 1) + '-01', to: '', price: x.amt, n: null, unit: null, cut: false }]);
      });
  });
  S = C;
  KL.tx = keepTx.concat(extra);
  try { return calc(); } finally { S = keepS; KL.tx = keepTx; }
}
/** Tagihan item di tahun aktif yang BELUM lunas dan tidak dilewati: hanya ini yang masuk akal untuk disimulasikan. */
function simOpen(it) {
  if (!it) return [];
  return occ(it, +S.year)
    .map(isoD)
    .filter(function (d) {
      var k = it.id + '|' + d;
      return !S.paid[k] && !S.skip[k];
    });
}
function simOpenItems() {
  return S.items.filter(function (it) {
    return simOpen(it).length;
  });
}
function simOpenMonths(id) {
  var seen = {},
    r = [];
  simOpen(item(id)).forEach(function (d) {
    var m = +d.slice(5, 7) - 1;
    if (!seen[m]) {
      seen[m] = 1;
      r.push(m);
    }
  });
  return r;
}
function simMonthOpts(id) {
  var L = simOpenMonths(id);
  return L.length
    ? L.map(function (m) { return '<option value="' + m + '">' + MON[m] + '</option>'; }).join('')
    : '<option value="">(tidak ada tagihan tersisa)</option>';
}
function simItemDates(id) {
  var L = simOpen(item(id));
  return L.length ? L.map(function (d) { return '<option value="' + d + '">' + fmtD(d) + '</option>'; }).join('') : '<option value="">(tidak ada tagihan tersisa)</option>';
}
/** Isi kotak tanggal baru (geser) dengan tanggal tagihan terpilih + batas sah, dan batas awal tanggal siklus baru. */
function simSyncDates() {
  var f = $('smf'),
    t = $('smt'),
    h = $('smth'),
    d = $('smd');
  if (f && t) {
    var it = item($('smi') && $('smi').value);
    if (it && f.value) {
      var rg = pmShiftRange(it, f.value);
      t.value = f.value;
      if (rg.min) t.min = rg.min; else t.removeAttribute('min');
      if (rg.max) t.max = rg.max; else t.removeAttribute('max');
      if (h) h.textContent = rg.min || rg.max ? 'Tanggal baru boleh ' + (rg.min && rg.max ? 'antara ' + fmtD(rg.min) + ' dan ' + fmtD(rg.max) : rg.min ? 'mulai ' + fmtD(rg.min) : 'sampai ' + fmtD(rg.max)) + '.' : '';
    } else {
      t.value = '';
      if (h) h.textContent = '';
    }
  }
  if (d) {
    var o = simOpen(item($('smi') && $('smi').value));
    if (o.length) d.min = o[0]; else d.removeAttribute('min');
  }
}
function simExtra(firstId) {
  if (simK === 'cycle')
    return '<div><label for="smn2">Bayar tiap</label><input id="smn2" type="number" min="1" value="3"></div><div><label for="smu">Satuan</label><select id="smu"><option value="bulan">bulan</option><option value="tahun">tahun</option><option value="minggu">minggu</option><option value="hari">hari</option></select></div><div style="grid-column:1/-1"><label for="smd">Mulai berlaku dari tanggal</label><input id="smd" type="date"><div class="sub" style="margin-top:4px">Siklus baru dimulai di tanggal ini; jadwal lama sesudahnya diganti.</div></div>';
  return '<div style="grid-column:1/-1"><label for="smf">Tagihan yang digeser</label><select id="smf">' + simItemDates(firstId) + '</select><div class="sub" style="margin-top:4px">Tagihan ini dan semua sesudahnya mengikuti tanggal baru dengan siklus yang sama.</div></div><div style="grid-column:1/-1"><label for="smt">Ganti jadi tanggal</label><input id="smt" type="date"><div class="sub" id="smth" style="margin-top:4px"></div></div>';
}
/** Perubahan jadwal (ch) untuk skenario siklus / geser. */
function simChg(it, x) {
  var eff = priceAt(it, Date.parse(x.from + 'T00:00:00Z')),
    p = eff !== it.price ? eff : null;
  if (x.k === 'cycle') return { from: x.from, to: '', price: p, n: x.n, unit: x.unit, cut: false };
  var sg = segAt(it, x.from),
    old = (it.ch || []).filter(function (q) { return q.anchor === x.from && !q.cut && !q.mv && !q.dates; })[0];
  return { from: old ? old.from : x.from, anchor: x.to, to: old ? old.to || '' : '', price: p, n: (sg && sg.n) || it.n, unit: (sg && sg.unit) || it.unit };
}
/** Tambahkan perubahan jadwal `g` ke `it`: yang bertanda tangan sama diganti (bukan ditumpuk). */
function simPutChg(it, g) {
  it.ch = (it.ch || [])
    .filter(function (q) { return !chSame(it, q, g); })
    .concat([g])
    .sort(cmpFrom);
}
function simName(id) {
  var it = S.items.filter(function (x) { return x.id == id; })[0];
  return it ? it.name : '(item dihapus)';
}
function simDesc(x) {
  var m = MON[x.m];
  if (x.k === 'stop') return 'Hentikan <b>' + esc(simName(x.id)) + '</b> mulai ' + m;
  if (x.k === 'cycle') return 'Ganti siklus <b>' + esc(simName(x.id)) + '</b> jadi tiap ' + x.n + ' ' + x.unit + ' mulai ' + fmtD(x.from);
  if (x.k === 'shift') return 'Geser tagihan <b>' + esc(simName(x.id)) + '</b> dari ' + fmtD(x.from) + ' jadi ' + fmtD(x.to) + ' (bulan berikutnya mengikuti)';
  if (x.k === 'price') return 'Harga <b>' + esc(simName(x.id)) + '</b> jadi ' + rp(x.amt) + ' mulai ' + m;
  return (x.k === 'in' ? 'Pemasukan ' : 'Pengeluaran ') + '<b>' + esc(x.name) + '</b> ' + rp(x.amt) + ' ' + (x.rep === 'sekali' ? 'sekali di ' + m : x.rep === 'n' ? x.n + ' kali mulai ' + m : 'tiap bulan mulai ' + m + ' sampai Des');
}
function simChart(A, B) {
  var n = A.rows.length;
  if (n < 2) return '';
  var all = A.rows.map(function (r) { return r.ak; }).concat(B.rows.map(function (r) { return r.ak; })), mn = Math.min.apply(null, all.concat([0])), mx = Math.max.apply(null, all), r = mx - mn || 1,
    pt = function (rows) { return rows.map(function (q, i) { return ((i * 600) / (n - 1)).toFixed(1) + ',' + (130 - ((q.ak - mn) / r) * 116).toFixed(1); }).join(' '); }, z = (130 - ((0 - mn) / r) * 116).toFixed(1);
  return '<svg class="kch" viewBox="0 0 600 140" preserveAspectRatio="none" role="img" aria-label="Saldo akhir per bulan: asli dan simulasi"><line x1="0" x2="600" y1="' + z + '" y2="' + z + '" style="stroke:var(--ln);stroke-dasharray:4 4"></line><polyline points="' + pt(A.rows) +
    '" style="fill:none;stroke:var(--mut);stroke-width:2;vector-effect:non-scaling-stroke"></polyline><polyline points="' + pt(B.rows) + '" style="fill:none;stroke:var(--ac);stroke-width:3;vector-effect:non-scaling-stroke"></polyline></svg><div class="sub" style="display:flex;gap:14px;flex-wrap:wrap"><span><i class="dot" style="background:var(--mut)"></i> Asli</span><span><i class="dot" style="background:var(--ac)"></i> Simulasi</span><span>' + MON[A.rows[0].m] + ' – ' + MON[A.rows[n - 1].m] + '</span></div>';
}
function renderSim() {
  var el = $('v-sim');
  if (mode === 'trip') { el.innerHTML = ''; return; }
  var mo = MON.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join(''), openIts = simOpenItems(),
    firstId = openIts[0] ? openIts[0].id : '',
    items = openIts.length ? openIts.map(function (it) { return '<option value="' + it.id + '">' + esc(it.name) + '</option>'; }).join('') : '<option value="">(tidak ada item dengan tagihan tersisa)</option>',
    two = simK === 'in' || simK === 'out',
    nb = simK === 'cycle' || simK === 'shift',
    form =
      '<div class="card"><h2>Simulasi &quot;bagaimana jika&quot; &middot; ' + S.year + '</h2><div class="sub" style="margin-bottom:10px">Coba perubahan tanpa mengubah data. Hasilnya langsung terlihat di grafik.</div><div class="kf"><div style="grid-column:1/-1"><label for="smk">Skenario</label><select id="smk">' +
      [['out', 'Tambah pengeluaran / cicilan'], ['in', 'Tambah pemasukan'], ['stop', 'Hentikan item'], ['price', 'Ubah harga item'], ['cycle', 'Ganti seberapa sering bayar'], ['shift', 'Geser tanggal bayar']].map(function (o) { return '<option value="' + o[0] + '"' + (simK === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      (two ? '<div style="grid-column:1/-1"><label for="smn">Nama</label><input id="smn" maxlength="30" placeholder="mis. Cicilan motor"></div>' : '<div style="grid-column:1/-1"><label for="smi">Item</label><select id="smi">' + items + '</select></div>') +
      (nb ? simExtra(firstId) : '<div><label for="sma">' + (simK === 'stop' ? 'Jumlah (tidak dipakai)' : simK === 'price' ? 'Harga baru (Rp)' : 'Jumlah (Rp)') + '</label><input id="sma" inputmode="numeric" placeholder="0"' + (simK === 'stop' ? ' disabled' : '') + '></div><div><label for="smm">Mulai bulan</label><select id="smm">' + (two ? mo : simMonthOpts(firstId)) + '</select></div>') +
      (two ? '<div><label for="smr">Berapa kali</label><select id="smr"><option value="bulan">Tiap bulan sampai Des</option><option value="sekali">Sekali saja</option><option value="n">Sekian kali</option></select></div><div id="smcw" hidden><label for="smc">Jumlah bulan</label><input id="smc" type="number" min="1" max="12" value="3"></div>' : '') +
      '</div><div class="err" id="smerr"></div><div class="row2"><button class="p" data-smadd="1">Tambah ke simulasi</button></div></div>';
  var out = form;
  setTimeout(simSyncDates, 0);
  if (!SIM.length) {
    el.innerHTML = out + '<div class="card"><div class="empty">Belum ada skenario. Tambahkan satu di atas untuk melihat dampaknya pada saldo.</div></div>';
    return;
  }
  var A = calc(), B = simCalc(SIM), lo = function (C) { return C.rows.reduce(function (a, r) { return !a || r.ak < a.ak ? r : a; }, null); }, la = lo(A), lb = lo(B), d = B.end - A.end,
    negs = function (C) { return C.rows.filter(function (r) { return r.ak < 0; }).map(function (r) { return MON[r.m]; }); }, nb = negs(B);
  out +=
    '<div class="card"><h2>Skenario aktif</h2>' + SIM.map(function (x, i) { return '<div class="it2"><div>' + simDesc(x) + '</div><div><button class="g d" data-smdel="' + i + '" aria-label="Hapus skenario">&#10005;</button></div></div>'; }).join('') +
    '<div class="acts" style="margin-top:8px"><button class="p" data-smapply="1">Terapkan ke data</button><button class="g d" data-smclear="1">Buang semua</button></div></div>' +
    '<div class="card"><h2>Dampak</h2><div class="hero" style="margin:0"><div class="card" style="margin:0"><div class="sub">Saldo akhir Des ' + S.year + '</div><div class="big' + (B.end < 0 ? ' neg' : '') + '">' + rp(B.end) + '</div><div class="sub">asli ' + rp(A.end) + ' &middot; <b>' + (d >= 0 ? 'naik ' : 'turun ') + rp(Math.abs(d)) + '</b></div></div><div class="card stats" style="margin:0"><div><span>Saldo terendah asli</span><b>' + rp(la.ak) + '</b><span>' + MON[la.m] +
    '</span></div><div><span>Saldo terendah simulasi</span><b>' + rp(lb.ak) + '</b><span>' + MON[lb.m] + '</span></div></div></div>' + '<div class="chp ' + (nb.length ? 'cash' : 'on') + '" style="margin:10px 0 6px">' + (nb.length ? 'Saldo negatif di ' + nb.join(', ') : 'Saldo tetap positif sepanjang tahun') + '</div>' + simChart(A, B) + '</div>' +
    '<div class="card"><h2>Per bulan</h2>' + B.rows.map(function (r, i) { var a = A.rows[i].ak, df = r.ak - a; return '<div class="it2"><div><b>' + MON[r.m] + '</b> <span class="sub">asli ' + rp(a) + '</span></div><div><b' + (r.ak < 0 ? ' style="color:var(--wr)"' : '') + '>' + rp(r.ak) + '</b> <span class="sub">' + (df === 0 ? '' : (df > 0 ? '+' : '&minus;') + rp(Math.abs(df))) + '</span></div></div>'; }).join('') + '</div>';
  el.innerHTML = out;
}
/** Terapkan semua skenario ke data asli (dengan cadangan agar bisa diurungkan). */
function simApply() {
  var sn = snap('Sebelum menerapkan simulasi'), y = +S.year, KL = kasLinked(), n = 0;
  SIM.forEach(function (x) {
    if (x.k === 'out') S.items.push({ id: Date.now() + n++, name: x.name, price: x.amt, n: 1, unit: x.rep === 'sekali' ? 'sekali' : 'bulan', start: y + '-' + pad2(x.m + 1) + '-01', end: x.rep === 'bulan' ? y + '-12-31' : '', cnt: x.rep === 'n' ? x.n : 0, cat: 'Simulasi', ch: [] });
    else if (x.k === 'in') simMonths(x).forEach(function (mm) { KL.tx.push({ id: kid('s'), d: y + '-' + pad2(mm + 1) + '-01', t: '+', amt: x.amt, cat: 'Simulasi', note: x.name, pay: '' }); });
    else
      S.items.forEach(function (it) {
        if (it.id != x.id) return;
        if (x.k === 'stop') { it.end = isoD(Date.UTC(y, x.m, 0)); it.cnt = 0; }
        else if (x.k === 'cycle' || x.k === 'shift')
          trackSchedule(it, function () {
            if (x.k === 'shift') moveStatusExact(it.id, [[x.from, x.to]], [S.paid, S.skip]);
            simPutChg(it, simChg(it, x));
          });
        else (it.ch = it.ch || []).push({ from: y + '-' + pad2(x.m + 1) + '-01', to: '', price: x.amt, n: null, unit: null, cut: false });
      });
  });
  SIM = [];
  save();
  renderAll();
  tab('sim');
  toast('Simulasi diterapkan ke data.', function () { restoreSnap(sn.t); });
}
function simAdd() {
  var x = { k: simK, m: $('smm') ? +$('smm').value : 0 }, err = function (t) { $('smerr').textContent = t; };
  if (simK === 'in' || simK === 'out') {
    x.name = $('smn').value.trim().slice(0, 30);
    x.amt = parseRp($('sma').value) || 0;
    x.rep = $('smr').value;
    x.n = Math.max(1, Math.min(12, parseInt($('smc').value, 10) || 1));
    if (!x.name) return err('Isi nama.');
    if (!(x.amt > 0)) return err('Isi jumlah yang valid.');
  } else {
    x.id = $('smi').value;
    if (!x.id) return err(S.items.length ? 'Tidak ada item dengan tagihan tersisa tahun ini (semua sudah lunas atau dilewati).' : 'Belum ada item. Tambahkan item dulu di Kelola Item.');
    if ((simK === 'stop' || simK === 'price') && simOpenMonths(x.id).indexOf(x.m) < 0) return err('Pilih bulan yang masih punya tagihan belum lunas.');
    if (simK === 'cycle') {
      x.from = $('smd').value;
      x.n = parseInt($('smn2').value, 10) || 0;
      x.unit = $('smu').value;
      if (!ISO_RE.test(x.from)) return err('Pilih tanggal mulai siklus baru.');
      var o0 = simOpen(item(x.id))[0];
      if (o0 && x.from < o0) return err('Siklus baru tidak bisa dimulai sebelum tagihan pertama yang belum lunas (' + fmtD(o0) + ').');
      if (!(x.n >= 1)) return err('Isi seberapa sering bayar.');
    } else if (simK === 'shift') {
      x.from = $('smf').value;
      x.to = $('smt').value;
      if (!x.from) return err('Pilih tagihan yang mau digeser.');
      if (!ISO_RE.test(x.to)) return err('Isi tanggal baru di "Ganti jadi tanggal".');
      if (x.to === x.from) return err('Tanggal baru sama dengan tanggal tagihan.');
      if (simOpen(item(x.id)).indexOf(x.from) < 0) return err('Pilih tagihan yang belum lunas.');
      var rg = pmShiftRange(item(x.id), x.from);
      if ((rg.min && x.to < rg.min) || (rg.max && x.to > rg.max)) return err(pmRangeMsg(rg));
    }
    if (simK === 'price') {
      x.amt = parseRp($('sma').value) || 0;
      if (!(x.amt > 0)) return err('Isi harga baru.');
    }
  }
  SIM.push(x);
  renderSim();
}
function bindSim() {
  var V = $('v-sim');
  V.onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;
    if (d.smadd) simAdd();
    else if (d.smdel) { SIM.splice(+d.smdel, 1); renderSim(); }
    else if (d.smclear) { SIM = []; renderSim(); }
    else if (d.smapply) simApply();
  };
  V.onchange = function (e) {
    if (e.target.id === 'smk') { simK = e.target.value; renderSim(); }
    else if (e.target.id === 'smi') {
      if (simK === 'shift') $('smf').innerHTML = simItemDates(e.target.value);
      if ($('smm') && (simK === 'stop' || simK === 'price')) $('smm').innerHTML = simMonthOpts(e.target.value);
      simSyncDates();
    } else if (e.target.id === 'smf') simSyncDates();
    else if (e.target.id === 'smr') $('smcw').hidden = e.target.value !== 'n';
  };
  V.addEventListener('input', function (e) {
    if (e.target.id === 'sma') fmtLive(e.target);
  });
}

/** Perjalanan sedang berlangsung (hari ini ada di antara Mulai dan Selesai)? */
function tripActive(P) {
  var td = todayISO();
  return !!(P.start && P.end && td >= P.start && td <= P.end);
}
function nowHM() {
  var d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function byTime(a, b) {
  return (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0;
}
/** Kegiatan hari ini + penanda "sedang berlangsung" dan "berikutnya" menurut jam sekarang. */
function tripToday(P) {
  var hm = nowHM(), r = { L: P.it.filter(function (x) { return x.day === todayISO(); }).sort(byTime), cur: -1, nxt: -1 };
  r.L.forEach(function (x, i) {
    if (x.done) return;
    if (x.time && x.time2 && x.time <= hm && hm <= x.time2) r.cur = i;
    else if (r.nxt < 0 && (!x.time || x.time > hm)) r.nxt = i;
  });
  return r;
}
function tripNow(P) {
  var td = todayISO(), T = tripToday(P), N = dayNo(P.end, P.start) + 1, no = dayNo(td, P.start) + 1, tm = isoD(Date.parse(td + 'T00:00:00Z') + 864e5),
    B = P.it.filter(function (x) { return x.day === tm; }).sort(byTime), done = T.L.filter(function (x) { return x.done; }).length;
  return (
    '<div class="card"><div class="sub">Hari ' + no + ' dari ' + N + ' &middot; sekarang ' + tmShow(nowHM()) + '</div><h2 style="margin:2px 0 4px">' + esc(P.dt[td] || dayLabel(P, td)) + '</h2><div class="sub">' + esc(dayLabel(P, td)) + (T.L.length ? ' &middot; ' + done + '/' + T.L.length + ' selesai' : '') + '</div></div>' +
    '<div class="card"><h2>Hari ini</h2>' +
    (T.L.map(function (x, i) {
      var mk = i === T.cur ? '<span class="chp on">Sedang berlangsung</span>' : i === T.nxt ? '<span class="chp ic">Berikutnya</span>' : '';
      return (
        '<div class="itm"><div class="tm">' + tmShow(x.time) + (x.time2 ? '<br>' + tmShow(x.time2) + '' : '') + '</div><div><div class="ttl"' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.place) + '</div><div>' + mk +
        (x.cat ? '<span class="chp" style="background:transparent;border:1px solid var(--ln)">' + esc(x.cat) + '</span>' : '') + pchip(x.pay) + lnk(x.link) + '</div>' + (x.note ? '<div class="sub">' + esc(x.note) + '</div>' : '') +
        '<div class="ac" style="justify-content:flex-start"><button class="g" data-itdone="' + x.id + '">' + (x.done ? '&#9745; Selesai' : '&#9744; Tandai selesai') + '</button></div></div><div class="co">' + (x.est ? amtTxt(P, x.est, x.fx) : '') + '</div></div>'
      );
    }).join('') || '<div class="sub">Belum ada kegiatan untuk hari ini. Tambahkan di tab Itinerary.</div>') + '</div>' +
    (B.length
      ? '<div class="card"><h2>Besok</h2>' + (P.dt[tm] ? '<div class="sub" style="margin:-6px 0 6px">' + esc(P.dt[tm]) + '</div>' : '') +
        B.slice(0, 5).map(function (x) { return '<div class="it2"><div><b>' + (tmShow(x.time) || '–') + '</b> ' + esc(x.place) + '</div><div>' + lnk(x.link) + '</div></div>'; }).join('') + (B.length > 5 ? '<div class="sub">+ ' + (B.length - 5) + ' kegiatan lagi</div>' : '') + '</div>'
      : '')
  );
}
/** Buka otomatis perjalanan yang sedang berlangsung bila hanya ada satu. */
function autoTrip() {
  if (mode !== 'trip' || tp()) return;
  var a = trips().filter(tripActive);
  if (a.length === 1) {
    tripAct = a[0].id;
    tripTab = 'now';
    remember('rk-trip', tripAct);
  }
}
function itFind(id) {
  return tp().it.filter(function (x) { return x.id === id; })[0];
}
function tripDelete(b) {
  if (!b.dataset.arm) {
    b.dataset.arm = 1;
    b.textContent = 'Yakin hapus?';
    setTimeout(function () {
      if (b.isConnected) {
        b.dataset.arm = '';
        b.textContent = 'Hapus';
      }
    }, 3000);
    return;
  }
  var sn = snap('Sebelum menghapus perjalanan ' + tp().name);
  delete ALL.kas.pr[tripAct];
  tripAct = '';
  save();
  renderAll();
  toast('Perjalanan dihapus.', function () {
    restoreSnap(sn.t);
  });
}
/** Hapus satu elemen dari daftar perjalanan (kunci k) dengan opsi urungkan. */
function tripRemove(k, id, msg) {
  var P = tp(), sn = snap('Sebelum menghapus ' + msg);
  P[k] = P[k].filter(function (x) { return x.id !== id; });
  save();
  renderTrip();
  toast(msg + ' dihapus.', function () { restoreSnap(sn.t); });
}

function bindTrip() {
  var V = $('v-trip');
  $('mdbar').onclick = function (e) {
    var b = e.target.closest('[data-md]');
    if (b) setMode(b.dataset.md);
  };
  V.onclick = function (e) {
    var b = e.target.closest('button,[data-trip]');
    if (!b) return;
    var d = b.dataset, P = tp(), x, v;
    if (d.trip) setTrip(d.trip);
    else if (d.tnew) kasOpenPm('new');
    else if (d.tback) setTrip('');
    else if (d.ted) kasOpenPm('edit');
    else if (d.tdel) tripDelete(b);
    else if (d.tt) {
      tripTab = d.tt;
      itEdit = bkEdit = null;
      gEdit = false;
      renderTrip();
    } else if (d.gedit) {
      gEdit = true;
      renderTrip();
      goalPrev();
    } else if (d.gdel) goalDel();
    else if (d.glink) {
      var G = tp().goal;
      G.link = G.link === false;
      save();
      renderAll();
    } else if (d.gset) goalSave();
    else if (d.gcancel) {
      gEdit = false;
      renderTrip();
    } else if (d.xl) $('xlf').click();
    else if (d.xlt) xlTemplate();
    else if (d.tshare) {
      $('shs').textContent = '';
      $('shm').hidden = false;
    } else if (d.its) itSave();
    else if (d.itx) {
      itEdit = null;
      renderTrip();
    } else if (d.ited) {
      itEdit = d.ited;
      renderTrip();
      $('itp').scrollIntoView({ block: 'center' });
    } else if (d.itdel) tripRemove('it', d.itdel, 'Kegiatan');
    else if (d.itdone) {
      x = itFind(d.itdone);
      x.done = !x.done;
      save();
      renderTrip();
    } else if (d.bks) bkSave();
    else if (d.bkx) {
      bkEdit = null;
      renderTrip();
    } else if (d.bked) {
      bkEdit = d.bked;
      renderTrip();
      $('bkt').scrollIntoView({ block: 'center' });
    } else if (d.bkdel) tripRemove('bk', d.bkdel, 'Pemesanan');
    else if (d.bkpay) bkPay(d.bkpay);
    else if (d.lka) {
      v = $('lku').value.trim();
      if (!$('lkt').value.trim() || !okUrl(v)) {
        $('lker').textContent = 'Isi judul dan tautan yang diawali http:// atau https://';
        return;
      }
      P.lk.push({ id: kid('l'), title: $('lkt').value.trim().slice(0, 80), url: v.slice(0, 400) });
      save();
      renderTrip();
    } else if (d.lkdel) tripRemove('lk', d.lkdel, 'Tautan');
    else if (d.cka) {
      v = $('ckn').value.trim();
      if (v) {
        P.ck.push({ id: kid('c'), text: v.slice(0, 60), done: false });
        save();
        renderTrip();
        $('ckn').focus();
      }
    } else if (d.ckstd) {
      CK_STD.forEach(function (tx) { P.ck.push({ id: kid('c'), text: tx, done: false }); });
      save();
      renderTrip();
    } else if (d.cktog) {
      P.ck.forEach(function (c) { if (c.id === d.cktog) c.done = !c.done; });
      save();
      renderTrip();
    } else if (d.ckdel) P.ck = P.ck.filter(function (c) { return c.id !== d.ckdel; }), save(), renderTrip();
  };
  V.onchange = function (e) {
    var tid = e.target.id,
      FX = { ite: ['ite', 'itu'], itu: ['ite', 'itu'], bke: ['bke', 'bku'], bku: ['bke', 'bku'] };
    if (tid === 'itt' || tid === 'itt2') {
      var pt = tmParse(e.target.value);
      if (pt !== null) e.target.value = tmShow(pt);
    }
    if (FX[tid]) fxPrev(FX[tid][0], FX[tid][1]);
    if (tid === 'gf' || tid === 'gz') goalPrev();
    if (e.target.dataset.dt) {
      var P = tp(), t = e.target.value.trim().slice(0, 60);
      if (t) P.dt[e.target.dataset.dt] = t;
      else delete P.dt[e.target.dataset.dt];
      save();
    }
  };
  V.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'gt' || id === 'gs') {
      fmtLive(e.target);
      goalPrev();
    }
    if (id === 'ite' || id === 'bke') fmtLive(e.target);
    if (id === 'itt' || id === 'itt2') {
      var tv = e.target.value.replace(/[^\d.:]/g, '');
      if (/^\d{4}$/.test(tv)) tv = tv.slice(0, 2) + '.' + tv.slice(2);
      if (tv !== e.target.value) e.target.value = tv;
    }
    if (id === 'ite' || id === 'bke') fxPrev(id, id === 'ite' ? 'itu' : 'bku');
    if (id === 'tnote') {
      tp().note = e.target.value.slice(0, 2000);
      clearTimeout(noteTimer);
      noteTimer = setTimeout(save, 600);
    }
  });
  V.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'ckn') {
      e.preventDefault();
      V.querySelector('[data-cka]').click();
    }
  });
  $('kpg').addEventListener('input', function () {
    fmtLive(this);
  });
  $('kpgm').onchange = function () {
    $('kpgw').hidden = this.value !== '1';
  };
}

/* ===== Impor Excel ===== */
var XL_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  xlData = null,
  BLN = { januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, nopember: 11, desember: 12, des: 12, january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10, oct: 10, aug: 8, dec: 12, december: 12 };

/** Muat pustaka Excel (SheetJS) hanya saat dibutuhkan. */
function loadXlsx() {
  return new Promise(function (ok, no) {
    if (window.XLSX) return ok(window.XLSX);
    var sc = document.createElement('script');
    sc.src = XL_URL;
    sc.onload = function () { ok(window.XLSX); };
    sc.onerror = function () { no(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(sc);
  });
}
function xlDate(v) {
  if (v instanceof Date && !isNaN(v)) {
    var d = new Date(v.getTime() + 432e5);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  if (typeof v === 'number' && v > 30000 && v < 80000) return isoD(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
  var t = String(v == null ? '' : v).trim(), m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) return m[1] + '-' + m[2] + '-' + m[3];
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t))) return m[3] + '-' + pad2(+m[2]) + '-' + pad2(+m[1]);
  if ((m = /(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/.exec(t)) && BLN[m[2].toLowerCase()]) return m[3] + '-' + pad2(BLN[m[2].toLowerCase()]) + '-' + pad2(+m[1]);
  return '';
}
function xlHM(h, m) {
  h = +h;
  m = +m;
  return h > 23 || m > 59 ? '' : pad2(h) + ':' + pad2(m);
}
/** Baca jam: "20.00-21.50", "14.10-", "5 pagi", "9 malam". */
function xlTime(v) {
  var t = String(v == null ? '' : v).trim().toLowerCase(), m;
  if ((m = /(\d{1,2})[.:](\d{2})\s*(?:[-–—~]|s\/d|sampai)?\s*(?:(\d{1,2})[.:](\d{2}))?/.exec(t))) return { a: xlHM(m[1], m[2]), b: m[3] ? xlHM(m[3], m[4]) : '' };
  if ((m = /^(\d{1,2})\s*(pagi|siang|sore|malam)/.exec(t))) {
    var h = +m[1];
    if (m[2] === 'malam') h = h === 12 ? 0 : h < 12 ? h + 12 : h;
    else if ((m[2] === 'sore' || m[2] === 'siang') && h < 12) h += 12;
    return { a: xlHM(h, 0), b: '' };
  }
  return { a: '', b: '' };
}
function xlNum(v) {
  if (typeof v === 'number') return v;
  var t = String(v == null ? '' : v).toLowerCase();
  if (/jalan|gratis|free/.test(t)) return 0;
  var m = t.replace(/rp|idr|yen|¥|jpy/g, '').replace(/\s/g, '').match(/[\d.,]+/);
  if (!m) return 0;
  t = m[0];
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  return parseFloat(t) || 0;
}
function xlPay(v) {
  var t = String(v == null ? '' : v).toLowerCase();
  return /suica|icoca|pasmo|\bic\b|kartu ic/.test(t) ? 'ic' : /online|trip\.com|tiket|klook|traveloka|agoda|booking|\bby /.test(t) ? 'on' : /cash|tunai/.test(t) ? 'cash' : '';
}
function xlCat(t) {
  t = t.toLowerCase();
  if (/makan|sarapan|resto|ramen|sushi|cafe|kafe|family ?mart|lawson|7[- ]?eleven|konbini|bento|kuliner|jajan|dinner|lunch/.test(t)) return 'Makan';
  if (/belanja|shopping|uniqlo|don ?quijote|donki|souvenir|oleh-oleh|mall|outlet/.test(t)) return 'Belanja';
  if (/\bke |naik|bus|kereta|train|shinkansen|\bjr\b|subway|metro|bandara|airport|pesawat|station|stasiun|taksi|taxi|haneda|narita|imigrasi|immigration|[a-z]{3}-[a-z]{3}/.test(t)) return 'Transport';
  if (/tiket|tour|museum|admission|kuil|temple|castle|taman|park|observatory|aquarium|tower|masuk/.test(t)) return 'Tiket & Tour';
  return 'Lainnya';
}
function xlBcat(t) {
  t = String(t || '').toLowerCase();
  return /transport|pesawat|bus\b|kereta|shinkansen|\bjr\b/.test(t) ? 'Transport' : /akomodasi|hotel|penginapan|hostel/.test(t) ? 'Penginapan' : /persiapan|perlengkapan|visa|asuransi|internet|pasport|paspor|jaket|heatech|koper|simcard|esim|telkomsel/.test(t) ? 'Persiapan' : /admission|tiket|tour|wisata|gondola|klook/.test(t) ? 'Tiket & Tour' : 'Lainnya';
}
/** Cari baris judul kolom: Tanggal/Jam/Kegiatan (itinerary) atau Nama/Jumlah (pemesanan). */
function xlHeader(rows, name) {
  var A = { dateC: /^(date|tanggal|tgl|hari)$/, timeC: /^(jam|waktu|time)/, textC: /(keterangan|kegiatan|aktivitas|activity|agenda|acara)/, costC: /(biaya|harga|cost|nominal)/, curC: /(mata ?uang|currency)/, payC: /(bayar|metode|payment)/, catC: /(kategori|category)/, linkC: /(link|tautan|url)/, noteC: /(catatan|note)/, nameC: /^(nama|item|pemesanan|booking)/, amtC: /^(jumlah|harga|amount|biaya)/, paidC: /(lunas|status)/ };
  for (var r = 0; r < Math.min(rows.length, 40); r++) {
    var h = { row: r };
    (rows[r] || []).forEach(function (c, i) {
      var t = String(c == null ? '' : c).trim().toLowerCase();
      if (!t) return;
      for (var k in A) if (h[k] == null && A[k].test(t)) { h[k] = i; break; }
    });
    if (h.textC != null && (h.timeC != null || h.dateC != null)) { h.kind = 'it'; return h; }
    if (h.nameC != null && h.amtC != null) { h.kind = 'bk'; return h; }
    var pc = (rows[r] || []).map(function (c) { return String(c == null ? '' : c).trim().toLowerCase(); }).indexOf('pengeluaran');
    if (pc >= 0) return { row: r, kind: 'bk', free: true, nameC: pc, catC: pc - 1, idrC: pc + 1, fxC: pc + 2 };
  }
  return null;
}
function xlItin(rows, h, out) {
  var day = '', n = out.it.length;
  for (var r = h.row + 1; r < rows.length; r++) {
    var row = rows[r] || [], dv = h.dateC != null ? xlDate(row[h.dateC]) : '', txt = String(row[h.textC] == null ? '' : row[h.textC]).trim(),
      tm = h.timeC != null ? xlTime(row[h.timeC]) : { a: '', b: '' }, cost = h.costC != null ? row[h.costC] : row[h.textC + 1], dm = /^day\s*\d+\s*[:\-–]?\s*(.*)$/i.exec(txt);
    if (dv) day = dv;
    if (dm && !tm.a && !xlNum(cost)) {
      var nx = '';
      for (var j = r + 1; j < Math.min(rows.length, r + 4) && !nx; j++) nx = h.dateC != null ? xlDate((rows[j] || [])[h.dateC]) : '';
      var tg = nx && nx !== day ? nx : day;
      if (tg && dm[1].trim()) out.dt[tg] = dm[1].trim().replace(/\s+/g, ' ').slice(0, 40);
      continue;
    }
    if (/^total$/i.test(txt) && !tm.a) {
      xlBlock(rows, h, r, out);
      break;
    }
    if (!txt || !day || /^(sub)?total\b/i.test(txt)) continue;
    var urls = txt.match(/https?:\/\/\S+/g) || [], place = txt.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim(), payRaw = h.payC != null ? row[h.payC] : row[h.textC + 2], pay = xlPay(payRaw), amt = xlNum(cost), fx = false;
    if (h.curC != null) {
      var cu = String(row[h.curC] || '').trim().toUpperCase();
      if (cu && !/^(IDR|RP)$/.test(cu)) { fx = true; out.cur = out.cur || cu.slice(0, 3); }
    } else if (amt) fx = amt >= 100000 && !/yen|¥|jpy/i.test(String(cost) + String(payRaw)) ? false : pay === 'ic' || pay === 'cash' || /yen|¥|jpy/i.test(String(cost) + String(payRaw)) ? true : pay === 'on' ? false : !!out.hintFx && amt < 100000;
    if (!fx && amt >= 100000 && h.curC == null && (!pay || pay === 'ic')) pay = 'on';
    if (fx && amt) out.fx = true;
    var note = h.noteC != null ? String(row[h.noteC] || '').trim() : '';
    if (place.length > 60) {
      note = (place + (note ? ' · ' + note : '')).slice(0, 120);
      place = place.slice(0, 57) + '…';
    }
    if (!place) place = urls[0] ? 'Lokasi (peta)' : txt.slice(0, 60);
    var ct = h.catC != null ? xlBcat(row[h.catC]) : '';
    out.it.push({ id: 'i' + ++n, day: day, time: tm.a, time2: tm.b, place: place, cat: ct === 'Persiapan' || ct === 'Penginapan' || !ct ? (h.catC != null && /makan/i.test(row[h.catC]) ? 'Makan' : xlCat(txt)) : ct, est: Math.round(amt), fx: fx && amt > 0, pay: pay, link: h.linkC != null && /^https?:/.test(row[h.linkC]) ? String(row[h.linkC]).trim() : urls[0] || '', note: note, done: false, rec: '' });
  }
}
/** Tabel "Pengeluaran" di bawah baris TOTAL pada sheet itinerary -> pemesanan (top-up Suica dilewati: sudah ada di biaya harian). */
function xlBlock(rows, h, from, out) {
  var j = from + 1, blanks = 0, n = out.bk.length;
  while (j < rows.length && !/^pengeluaran/i.test(String((rows[j] || [])[h.textC] || '').trim())) if (j++ > from + 12) return;
  for (j++; j < rows.length && blanks < 4; j++) {
    var row = rows[j] || [], t = String(row[h.textC] == null ? '' : row[h.textC]).trim().replace(/\s+/g, ' ');
    if (!t) { blanks++; continue; }
    blanks = 0;
    if (/^(sub)?total\b/i.test(t) || /^suica|top ?up suica|suica untuk/i.test(t)) continue;
    var amt = xlNum(row[h.textC + 1]), pay = xlPay(row[h.textC + 2]);
    if (amt > 0) out.bk.push({ id: 'b' + ++n, title: t.slice(0, 120), cat: xlBcat(t), amt: Math.round(amt), fx: false, pay: pay || 'on', link: '', a: '', b: '', paid: false, rec: '' });
  }
}
function xlBook(rows, h, out) {
  var cat = 'Lainnya', n = out.bk.length, add = function (title, c, amt, fx, pay, paid, link) {
    if (amt > 0) out.bk.push({ id: 'b' + ++n, title: title.slice(0, 120), cat: c, amt: Math.round(amt), fx: fx, pay: pay, link: link || '', a: '', b: '', paid: !!paid, rec: '' });
    if (fx && amt > 0) out.fx = true;
  };
  for (var r = h.row + 1; r < rows.length; r++) {
    var row = rows[r] || [], title = String(row[h.nameC] == null ? '' : row[h.nameC]).trim();
    if (!title || /^(sub)?total\b/i.test(title)) continue;
    if (h.free) {
      var cv = String(row[h.catC] == null ? '' : row[h.catC]).trim();
      if (cv && cv !== '&') cat = xlBcat(cv);
      add(title, cat, xlNum(row[h.idrC]), false, 'on', false);
    } else {
      var cu = h.curC != null ? String(row[h.curC] || '').trim().toUpperCase() : '', fx = !!cu && !/^(IDR|RP)$/.test(cu);
      if (fx) out.cur = out.cur || cu.slice(0, 3);
      add(title, h.catC != null ? xlBcat(row[h.catC]) : 'Lainnya', xlNum(row[h.amtC]), fx, h.payC != null ? xlPay(row[h.payC]) : '', h.paidC != null && /^(ya|y|lunas|paid|1|true|sudah)/i.test(String(row[h.paidC]).trim()), h.linkC != null && /^https?:/.test(row[h.linkC]) ? String(row[h.linkC]).trim() : '');
    }
  }
}
/** Baca seluruh workbook menjadi data perjalanan. Mengembalikan {it, bk, dt, lk, start, end, cur, fx}. */
function xlParse(wb) {
  var out = { it: [], bk: [], dt: {}, lk: [], cur: '', fx: false, hintFx: false }, used = {}, seen = {};
  wb.SheetNames.forEach(function (nm) {
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' });
    rows.forEach(function (row) { row.forEach(function (c) { if (/yen|suica|¥|jpy/i.test(String(c))) out.hintFx = true; }); });
    var h = xlHeader(rows, nm);
    if (!h) return;
    if (h.kind === 'it') xlItin(rows, h, out);
    else if (!(h.free && out.bk.length)) xlBook(rows, h, out);
    rows.forEach(function (row, ri) {
      row.forEach(function (c, ci) {
        var t = String(c == null ? '' : c), u = /https?:\/\/\S+/.exec(t);
        if (!u || (h.kind === 'it' && ci === h.textC) || /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/.test(u[0]) || seen[u[0]] || out.lk.length >= 8) return;
        seen[u[0]] = 1;
        var ti = t.replace(u[0], '').replace(/[:\s=]+$/, '').replace(/^\s*\d+\.\s*/, '').trim();
        out.lk.push({ id: 'l' + (out.lk.length + 1), title: (ti || u[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0]).slice(0, 60), url: u[0].slice(0, 300) });
      });
    });
  });
  var ds = out.it.map(function (x) { return x.day; }).sort();
  out.start = ds[0] || '';
  out.end = ds[ds.length - 1] || '';
  return out;
}
function xlPick(e) {
  var f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  loadXlsx().then(function (X) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = xlParse(X.read(fr.result, { type: 'array', cellDates: true }));
        if (!d.it.length && !d.bk.length) return toast('Format tidak dikenali. Unduh Template Excel lalu isi sesuai kolomnya.');
        xlData = d;
        $('xls').textContent = d.it.length + ' kegiatan, ' + d.bk.length + ' pemesanan, ' + Object.keys(d.dt).length + ' judul hari' + (d.start ? ' · ' + fmtD(d.start) + ' – ' + fmtD(d.end) : '') + '.' + (function () {
          var a = 0, b = 0;
          d.bk.forEach(function (x) { if (x.fx) b += x.amt; else a += x.amt; });
          d.it.forEach(function (x) { if (x.pay === 'on') return; if (x.fx) b += x.est; else a += x.est; });
          return ' Perkiraan biaya: ' + rp(a) + (b ? ' + ' + b.toLocaleString('id-ID') + ' dalam mata uang asing' : '') + '.' + (d.fx ? ' Isi kode dan kurs mata uang asing.' : '');
        })();
        $('xln').value = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, 30);
        $('xlu').value = d.cur || (d.fx ? 'JPY' : '');
        $('xlk').value = '';
        $('xle').textContent = '';
        $('xlm').hidden = false;
      } catch (x) {
        toast('File tidak bisa dibaca. Coba simpan ulang sebagai .xlsx.');
      }
    };
    fr.readAsArrayBuffer(f);
  }).catch(function (x) { toast(x.message); });
}
function xlCommit() {
  var d = xlData, n = $('xln').value.trim().slice(0, 30), cu = $('xlu').value.trim().toUpperCase(), rt = parseFloat(String($('xlk').value).replace(',', '.')) || 0, er = function (t) { $('xle').textContent = t; };
  if (!d) return;
  if (!n) return er('Nama perjalanan belum diisi.');
  if (d.fx && !cu) return er('Ada biaya mata uang asing (mis. yen). Isi kodenya, misalnya JPY.');
  if (cu && !/^[A-Z]{3}$/.test(cu)) return er('Mata uang terdiri dari 3 huruf, mis. JPY.');
  if (cu && !(rt > 0)) return er('Isi kurs: berapa rupiah untuk 1 ' + cu + '.');
  var nm = n, k = 2;
  while (trips().some(function (x) { return x.name.toLowerCase() === nm.toLowerCase(); })) nm = n.slice(0, 26) + ' (' + k++ + ')';
  var id = 'p' + Date.now().toString(36), re = function (a, p) { return a.map(function (x) { return Object.assign({}, x, { id: kid(p) }); }); };
  ALL.kas.pr[id] = { id: id, name: nm, saldo: 0, link: false, start: d.start, end: d.end, budget: 0, cur: cu, rate: cu ? rt : 0, dt: d.dt, tx: [], it: re(d.it, 'i'), bk: re(d.bk, 'b'), lk: re(d.lk, 'l'), ck: [], note: '', goal: null };
  xlData = null;
  $('xlm').hidden = true;
  save();
  setMode('trip');
  setTrip(id);
  toast('Perjalanan diimpor: ' + d.it.length + ' kegiatan, ' + d.bk.length + ' pemesanan.');
}
/** Unduh template Excel yang bisa langsung diisi lalu diimpor. */
function xlTemplate() {
  loadXlsx().then(function (X) {
    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([
      ['Tanggal', 'Jam', 'Kegiatan', 'Kategori', 'Biaya', 'Mata uang', 'Pembayaran', 'Tautan', 'Catatan'],
      ['', '', 'DAY 1 Jakarta - Tokyo', '', '', '', '', '', 'Baris "DAY n judul" menjadi judul hari'],
      ['2026-01-27', '07.30-09.00', 'Sarapan di konbini', 'Makan', 500, 'JPY', 'Kartu IC', '', ''],
      ['', '10.00-12.00', 'Tokyo Tower', 'Tiket & Tour', 1200, 'JPY', 'Cash', 'https://maps.app.goo.gl/contoh', 'Tanggal kosong = ikut baris di atasnya'],
    ]), 'Itinerary');
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([
      ['Nama', 'Kategori', 'Jumlah', 'Mata uang', 'Pembayaran', 'Lunas', 'Tautan', 'Catatan'],
      ['Tiket pesawat PP', 'Transport', 6500000, 'IDR', 'Online', 'Ya', '', ''],
      ['Hotel 4 malam', 'Penginapan', 1800000, 'IDR', 'Online', 'Belum', '', ''],
    ]), 'Pemesanan');
    X.writeFile(wb, 'template-itinerary.xlsx');
  }).catch(function (x) { toast(x.message); });
}

/* ===== Bagikan itinerary ===== */
function amtPlain(P, v, fx) {
  return fx && P.cur ? P.cur + ' ' + Math.round(v).toLocaleString('id-ID') : rp(v);
}
/** Teks itinerary siap kirim (format tebal ala WhatsApp). */
function tripText(P, cost) {
  var L = ['*' + P.name + '*'];
  if (P.start && P.end) L.push(fmtD(P.start) + ' – ' + fmtD(P.end) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari');
  L.push('');
  tripDays(P).forEach(function (d) {
    var its = P.it.filter(function (x) { return x.day === d; }).sort(byTime);
    if (!its.length && !P.dt[d]) return;
    L.push('*' + dayLabel(P, d) + '*' + (P.dt[d] ? ' — ' + P.dt[d] : ''));
    its.forEach(function (x) {
      L.push('• ' + (x.time ? tmShow(x.time) + (x.time2 ? '–' + tmShow(x.time2) : '') + ' ' : '') + x.place + (cost && x.est ? ' (' + amtPlain(P, x.est, x.fx) + ')' : '') + (x.link ? '\n   ' + x.link : '') + (x.note ? '\n   ' + x.note : ''));
    });
    L.push('');
  });
  if (P.bk.length) {
    L.push('*Pemesanan*');
    P.bk.forEach(function (b) { L.push('• ' + b.title + (cost ? ' (' + amtPlain(P, b.amt, b.fx) + ')' : '') + (b.paid ? ' ✓' : '')); });
    L.push('');
  }
  if (P.lk.length) {
    L.push('*Tautan penting*');
    P.lk.forEach(function (l) { L.push('• ' + l.title + '\n   ' + l.url); });
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
/** Dokumen HTML siap cetak (untuk disimpan sebagai PDF). */
function tripPrintHtml(P, cost) {
  var css = 'body{font:13px/1.45 system-ui,sans-serif;color:#111;margin:24px}h1{margin:0 0 2px;font-size:22px}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #1f6f5c;padding-bottom:3px}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #ddd;vertical-align:top}td.t{white-space:nowrap;width:96px;font-weight:600}td.c{text-align:right;white-space:nowrap}small{color:#555}a{color:#1f6f5c;word-break:break-all}@media print{h2{break-after:avoid}tr{break-inside:avoid}}',
    b = '<h1>' + esc(P.name) + '</h1>' + (P.start && P.end ? '<small>' + esc(fmtD(P.start) + ' – ' + fmtD(P.end)) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari</small>' : '');
  tripDays(P).forEach(function (d) {
    var its = P.it.filter(function (x) { return x.day === d; }).sort(byTime);
    if (!its.length && !P.dt[d]) return;
    b += '<h2>' + esc(dayLabel(P, d)) + (P.dt[d] ? ' — ' + esc(P.dt[d]) : '') + '</h2><table>' + its.map(function (x) {
      return '<tr><td class="t">' + esc(tmShow(x.time) + (x.time2 ? '–' + tmShow(x.time2) : '')) + '</td><td>' + esc(x.place) + (x.link ? '<br><a href="' + esc(x.link) + '">' + esc(x.link) + '</a>' : '') + (x.note ? '<br><small>' + esc(x.note) + '</small>' : '') + '</td>' + (cost ? '<td class="c">' + (x.est ? esc(amtPlain(P, x.est, x.fx)) : '') + '</td>' : '') + '</tr>';
    }).join('') + '</table>';
  });
  if (P.bk.length) b += '<h2>Pemesanan</h2><table>' + P.bk.map(function (x) { return '<tr><td>' + esc(x.title) + (x.paid ? ' <small>(lunas)</small>' : '') + '</td>' + (cost ? '<td class="c">' + esc(amtPlain(P, x.amt, x.fx)) + '</td>' : '') + '</tr>'; }).join('') + '</table>';
  if (P.lk.length) b += '<h2>Tautan penting</h2>' + P.lk.map(function (l) { return '<div>' + esc(l.title) + ': <a href="' + esc(l.url) + '">' + esc(l.url) + '</a></div>'; }).join('');
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(P.name) + '</title><style>' + css + '</style></head><body>' + b + '</body></html>';
}
function printHtml(h) {
  var f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  var d = f.contentWindow.document;
  d.open();
  d.write(h);
  d.close();
  setTimeout(function () {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {}
    setTimeout(function () { f.remove(); }, 3000);
  }, 300);
}
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
  return new Promise(function (ok) {
    var a = document.createElement('textarea');
    a.value = t;
    document.body.appendChild(a);
    a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove();
    ok();
  });
}
function bindXl() {
  $('xlf').onchange = xlPick;
  $('xlok').onclick = xlCommit;
  $('xlc').onclick = function () { $('xlm').hidden = true; };
  $('shx').onclick = function () { $('shm').hidden = true; };
  $('shm').onclick = function (e) {
    var b = e.target.closest('[data-sh]'), P = tp();
    if (!b || !P) return;
    var cost = $('shc').checked, kind = b.dataset.sh;
    if (kind === 'pdf') return printHtml(tripPrintHtml(P, cost));
    var t = tripText(P, cost);
    if (kind === 'wa' && navigator.share) navigator.share({ title: P.name, text: t }).catch(function () {});
    else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    else copyText(t).then(function () { $('shs').textContent = 'Teks disalin. Tinggal tempel di WhatsApp atau catatan.'; });
  };
}

/** Kirim notifikasi sistem baik via ServiceWorkerRegistration maupun Notification API browser. */
function triggerSystemNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  var opt = {
    body: body,
    tag: tag || 'bill-due-' + Date.now(),
    renotify: true,
  };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (reg) {
      if (reg && reg.showNotification) {
        reg.showNotification(title, opt);
      } else {
        try { new Notification(title, opt); } catch (e) {}
      }
    }).catch(function () {
      try { new Notification(title, opt); } catch (e) {}
    });
  } else {
    try { new Notification(title, opt); } catch (e) {}
  }
}

/** Pengingat tagihan jatuh tempo lokal (Notification API - konsisten dengan reminders lintas tahun). */
function checkDueNotifications(force) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!ALL || !ALL.data) return;
  var rem = reminders(3);
  var today = rem.today;
  var todayMs = Date.parse(today + 'T00:00:00Z');
  var dueList = [];

  (rem.late || []).forEach(function (row) {
    var diffDays = Math.round((row.t - todayMs) / 864e5);
    dueList.push({ it: row.it, d: row.iso, diff: diffDays, price: row.price, late: true });
  });
  (rem.soon || []).forEach(function (row) {
    var diffDays = Math.round((row.t - todayMs) / 864e5);
    dueList.push({ it: row.it, d: row.iso, diff: diffDays, price: row.price, late: false });
  });

  if (!dueList.length) {
    if (force) {
      triggerSystemNotification(
        'Pengingat Tagihan Aktif',
        'Tidak ada tagihan jatuh tempo dalam 3 hari ke depan.',
        'bill-check-ok'
      );
    }
    return;
  }

  if (!force) {
    try {
      var lastNotif = typeof localStorage !== 'undefined' && localStorage.getItem('last_bill_notif_date');
      if (lastNotif === today) return;
    } catch (e) {}
  }

  var titles = [];
  dueList.slice(0, 3).forEach(function (item) {
    var timing = item.diff < 0 ? 'TERLEWAT (' + Math.abs(item.diff) + ' hari)' : (item.diff === 0 ? 'HARI INI' : item.diff + ' hari lagi');
    titles.push(item.it.name + ' (' + rp(item.price) + ' - ' + timing + ')');
  });
  var body = titles.join('\n');
  if (dueList.length > 3) body += '\n+' + (dueList.length - 3) + ' tagihan lainnya';

  triggerSystemNotification(
    'Pengingat Tagihan Jatuh Tempo (' + dueList.length + ')',
    body,
    'bill-due-' + today
  );
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_bill_notif_date', today);
    }
  } catch (e) {}
}

function requestNotifPermission() {
  if (!('Notification' in window)) {
    toast('Browser ini belum mendukung fitur Notifikasi Web.');
    return;
  }
  if (Notification.permission === 'granted') {
    toast('Memeriksa pengingat tagihan...');
    checkDueNotifications(true);
    return;
  }
  if (Notification.permission === 'denied') {
    toast('Izin notifikasi diblokir di browser. Buka setelan browser untuk mengizinkan.');
    return;
  }
  Notification.requestPermission().then(function (perm) {
    syncNotifBtn();
    if (perm === 'granted') {
      toast('Notifikasi aktif! Memeriksa tagihan...');
      checkDueNotifications(true);
    } else {
      toast('Izin notifikasi tidak diberikan.');
    }
  });
}

/** PWA: daftar service worker (hanya di https/http), tombol "Pasang aplikasi", dan auto check tagihan. */
function bindPwa() {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg && reg.update) reg.update();
    }).catch(function () {});
  }
  var ev = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    ev = e;
    $('pwa').hidden = false;
  });
  window.addEventListener('appinstalled', function () {
    $('pwa').hidden = true;
  });
  $('pwa').onclick = function () {
    if (!ev) return;
    ev.prompt();
    ev = null;
    $('pwa').hidden = true;
  };
  var notifBtn = $('btn-notif');
  if (notifBtn) {
    notifBtn.onclick = requestNotifPermission;
  }
  setInterval(function () {
    if (mode === 'trip' && tripTab === 'now' && !document.hidden && tp()) renderTrip();
  }, 60000);
  autoTrip();
  setTimeout(checkDueNotifications, 1200);
}
