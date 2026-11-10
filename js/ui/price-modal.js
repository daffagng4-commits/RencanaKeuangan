/**
 * Jendela Ubah harga / jadwal (berbasis tujuan) dengan pemilih tanggal:
 *  - chip tanggal dari jadwal item (tahun aktif) + tanggal kustom;
 *  - mode harga / sementara boleh memilih BANYAK tanggal; siklus / geser / manual memilih satu.
 * Hasilnya disimpan sebagai "perubahan" (ch) pada item; lihat core/schedule.js.
 */

var pmId = null,
  pmInit = null,
  pmScen = null;
/** Tanggal terpilih (ISO, terurut). pmAuto = pilihan berasal dari isian awal/ketikan (diganti bila mengetik tanggal lain). */
var pmDates = [],
  pmAuto = true,
  phmTouched = false;

var PH = {
  harga:
    'Pilih tanggal dari jadwal atau ketik tanggal kustom. Satu tanggal: harga baru berlaku dari tanggal itu dan seterusnya. Beberapa tanggal: harga baru hanya untuk tagihan yang dipilih (bisa diubah di "Berlaku").',
  sementara:
    'Satu tanggal + tanggal "sampai", atau pilih beberapa tanggal tagihan: semua tagihan di antaranya, atau hanya yang dipilih. Sesudahnya kembali ke harga awal.',
  siklus:
    "Pilih satu tanggal dari jadwal atau ketik tanggal kustom. Pembayaran pertama dengan siklus baru jatuh di tanggal itu. Pilih apakah tagihan lama sebelum tanggal itu dibiarkan atau dihapus.",
  geser:
    'Pilih apakah hanya satu bulan, bulan ini dan sesudahnya, atau beberapa bulan pilihan sendiri. Lalu ketuk tagihannya dan isi tanggal barunya.',
  henti:
    'Pilih tanggal tagihan TERAKHIR yang masih dibayar. Semua tagihan sesudahnya dihapus dari jadwal (riwayat harga dan perubahan tidak ikut terhapus).',
  manual:
    "Atur semua pilihan sendiri. Lihat pratinjau di bawah sebelum menyimpan.",
};

var LB = {
  harga: ["Tanggal tagihan", "Harga baru"],
  sementara: ["Tanggal tagihan", "Harga selama periode itu"],
  siklus: ["Mulai dari tanggal", "Harga (biarkan jika tidak berubah)"],
  geser: ["Tagihan yang digeser", "Harga per bayar"],
  henti: ["Tagihan terakhir yang masih dibayar", ""],
  manual: ["Berlaku mulai tanggal", "Harga per bayar"],
};

/** Pesan di jendela ubah harga (ok = hijau, selain itu merah). */
function pmMsg(t, ok) {
  var e = $("pme"),
    pv = $("ppv");
  // Galat yang sama sudah tampil di pratinjau: cukup tandai pratinjau (merah), jangan tampilkan dua kali.
  if (!ok && t && pv && pv.textContent === t) {
    pv.classList.add("bad");
    e.textContent = "";
    return;
  }
  e.textContent = t;
  e.style.color = ok ? "var(--in)" : "var(--wr)";
}

/** Nilai isian harga/siklus saat ini. */
function pmCur() {
  var it = item(pmId),
    cadVis = pmScen === "siklus" || pmScen === "manual";
  return {
    P: parseRp($("pp").value),
    n: cadVis
      ? Math.max(1, parseInt($("pn").value, 10) || 1)
      : (it ? it.n : 1),
    u: cadVis ? $("pu").value : (it ? it.unit : "bulan"),
  };
}

/** Tanggal pendek: "1 Mar". */
function dShort(d) {
  return fd(Date.parse(d + "T00:00:00Z"), { day: "numeric", month: "short" });
}

/** Daftar tanggal singkat dengan batas (… bila banyak). */
function dList(dates, max) {
  max = max || 6;
  return (
    dates.slice(0, max).map(dShort).join(", ") +
    (dates.length > max ? ", … (+" + (dates.length - max) + ")" : "")
  );
}

/** Tanda unik sebuah perubahan (untuk mengganti perubahan yang sama). */
function chSig(c) {
  return c.from + "|" + c.to + "|" + (c.dates ? c.dates.join(",") : "");
}

/** Deskripsi satu perubahan untuk daftar riwayat. */
function descCh(it, c) {
  var p = [];
  if (c.mv) {
    var ks = Object.keys(c.mv).sort();
    return (
      '<b>' +
      ks
        .slice(0, 3)
        .map(function (k) {
          return dShort(k) + ' &rarr; ' + dShort(c.mv[k]);
        })
        .join(', ') +
      (ks.length > 3 ? ', &hellip; (+' + (ks.length - 3) + ')' : '') +
      '</b><br><span class="sub">Hanya ' +
      (ks.length > 1 ? ks.length + ' tagihan ini' : 'tagihan ini') +
      ' yang digeser</span>'
    );
  }
  if (c.price != null) p.push(rp(c.price));
  if (c.n || c.unit)
    p.push("tiap " + (c.n || it.n) + " " + (c.unit || it.unit));
  if (c.anchor)
    return (
      "<b>" +
      fmtD(c.from) +
      " &rarr; digeser ke " +
      fmtD(c.anchor) +
      '</b><br><span class="sub">' +
      (p.join(" &middot; ") || "Siklus tetap") +
      " (tagihan sebelumnya tidak berubah)</span>"
    );
  if (c.dates)
    return (
      "<b>" +
      dList(c.dates.map(function (d) { return curDate(it, d); }), 4) +
      " " +
      curDate(it, c.dates[0]).slice(0, 4) +
      '</b><br><span class="sub">' +
      (p.join(" &middot; ") || "Kembali ke pengaturan awal") +
      " (hanya tanggal ini)</span>"
    );
  return (
    "<b>" +
    fmtD(c.from) +
    (c.to ? " &ndash; " + fmtD(c.to) : " &rarr; seterusnya") +
    '</b><br><span class="sub">' +
    (p.join(" &middot; ") || "Kembali ke pengaturan awal") +
    (c.to ? " (lalu kembali ke awal)" : "") +
    (c.cut ? " &middot; tagihan sebelumnya dihapus" : "") +
    "</span>"
  );
}

/** Isi info awal dan daftar perubahan yang sudah ada. */
function renderPm() {
  var it = item(pmId);
  if (!it) return;
  $("pmi").textContent =
    "Pengaturan awal: " +
    rp(it.price) +
    " · " +
    every(it) +
    " · mulai " +
    fmtD(it.start) +
    ".";
  $("phl").innerHTML =
    (it.ch || [])
      .map(function (c, i) {
        return (
          '<div class="it2"><div>' +
          descCh(it, c) +
          '</div><button class="g d" data-pdel="' +
          i +
          '">Hapus</button></div>'
        );
      })
      .join("") || '<div class="sub">Belum ada perubahan.</div>';
}

/* ---------- pemilih tanggal ---------- */

/** Mode yang boleh memilih banyak tanggal. */
function pmMulti() {
  return pmScen === "harga" || pmScen === "sementara" || (pmScen === "geser" && $("pgm").value === "pilih");
}

/** Daftar tanggal tagihan item pada tahun aktif (ISO, unik, terurut). */
function pmScheduleDates(it) {
  var seen = {};
  return occ(it, S.year)
    .map(isoD)
    .filter(function (d) {
      return !seen[d] && (seen[d] = 1);
    });
}

/** Gambar chip tanggal jadwal + daftar tanggal terpilih. */
function renderPicker() {
  var it = item(pmId);
  if (!it) return;
  var sel = {};
  pmDates.forEach(function (d) {
    sel[d] = 1;
  });
  var sched = pmScheduleDates(it);
  $("pdc").innerHTML =
    sched
      .map(function (d) {
        var k = it.id + "|" + d;
        return (
          '<button type="button" class="dc' +
          (sel[d] ? " on" : "") +
          (S.skip[k] ? " sk" : "") +
          '" data-d="' +
          d +
          '" aria-pressed="' +
          (sel[d] ? "true" : "false") +
          '">' +
          (S.paid[k] ? "✓ " : "") +
          dShort(d) +
          "</button>"
        );
      })
      .join("") ||
    '<div class="sub">Tidak ada tagihan di tahun ini. Pakai tanggal kustom.</div>';
  $("pds").innerHTML =
    pmMulti() && pmDates.length
      ? pmDates
          .map(function (d) {
            return (
              '<span class="tag">' +
              fmtD(d) +
              (sched.indexOf(d) >= 0 ? "" : " (kustom)") +
              '<button type="button" data-rm="' +
              d +
              '" aria-label="Hapus tanggal">&times;</button></span>'
            );
          })
          .join("")
      : "";
}

/** Atur tampilan isian yang bergantung pada tanggal terpilih. */
function pmLayout() {
  var sc = pmScen,
    n = pmDates.length,
    until = $("pw").value === "until";
  $("g-to").hidden = !(
    (sc === "sementara" && n < 2) ||
    (sc === "manual" && until)
  );
  $("phmw").hidden = sc !== "harga";
  $("prgw").hidden = !(sc === "sementara" && n >= 2);
  var gp = sc === "geser" && $("pgm").value === "pilih";
  $("pgw").hidden = sc !== "geser";
  $("pgdw").hidden = !gp;
  $("pdcus").hidden = gp;
  $("pda").hidden = !pmMulti() || sc === "geser";
  $("lgs").hidden = sc !== "geser" || gp;
  if (sc === "harga" && !phmTouched)
    $("phm").value = n > 1 ? "terpilih" : "seterusnya";
  $("pdh").textContent = gp
    ? "Ketuk semua tagihan yang mau digeser, lalu isi tanggal barunya (angka 1-31)."
    : pmMulti()
    ? 'Ketuk tanggal untuk memilih (boleh lebih dari satu). Tanggal kustom: pilih di kotak lalu tekan "+ Tambah".'
    : sc === "geser"
      ? "Ketuk tagihan yang mau digeser, lalu isi tanggal barunya."
      : "Ketuk satu tanggal, atau pilih tanggal kustom di kotak.";
  renderPicker();
}

/**
 * Ganti tanggal terpilih. auto=true: pilihan dianggap "isian tunggal" yang boleh diganti dengan mengetik tanggal lain.
 * Kotak tanggal (#pdt) ikut diisi bila tepat satu tanggal dan auto.
 */
function setDates(list, auto, keepInput) {
  var seen = {};
  pmDates = list
    .filter(function (d) {
      return ISO_RE.test(d) && !seen[d] && (seen[d] = 1);
    })
    .sort();
  pmAuto = !!auto;
  if (!keepInput)
    $("pdt").value = auto && pmDates.length === 1 ? pmDates[0] : "";
  var it = item(pmId);
  if (it && pmDates[0] && !phmTouched && (pmScen === "harga" || pmScen === "sementara" || pmScen === "siklus")) {
    var eff = priceAt(it, Date.parse(pmDates[0] + "T00:00:00Z"));
    $("pp").value = eff.toLocaleString("id-ID");
  }
  pmLayout();
  pmPrev();
}

/** Batasi kotak tanggal (min/max) dan beri petunjuk rentang saat menggeser satu tagihan; hapus batas di mode lain. */
function pmDateRange() {
  var el = $("pdt"),
    it = item(pmId),
    from = pmDates[0];
  if (pmScen === "geser" && !pmMulti() && it && from) {
    var rg = pmShiftRange(it, from);
    if (rg.min) el.min = rg.min;
    else el.removeAttribute("min");
    if (rg.max) el.max = rg.max;
    else el.removeAttribute("max");
    $("pdh").textContent =
      "Ketuk tagihan yang mau digeser, lalu ubah tanggal barunya." +
      (rg.min || rg.max ? " Tanggal baru boleh " + (rg.min && rg.max ? "antara " + fmtD(rg.min) + " dan " + fmtD(rg.max) : rg.min ? "mulai " + fmtD(rg.min) : "sampai " + fmtD(rg.max)) + "." : "");
  } else {
    el.removeAttribute("min");
    el.removeAttribute("max");
  }
}

/** Susun perubahan (mode selain geser). @returns {c, cs, it} atau {err} */
function pmDraftNormal() {
  var it = item(pmId);
  if (!it) return { err: "Item tidak ditemukan." };
  var cu = pmCur(),
    P = cu.P,
    n = cu.n,
    u = cu.u;
  var dates = pmDates.length
    ? pmDates.slice()
    : ISO_RE.test($("pdt").value)
      ? [$("pdt").value]
      : [];
  if (!dates.length)
    return {
      err: pmMulti()
        ? "Pilih minimal satu tanggal."
        : "Pilih tanggal mulai berlaku.",
    };
  if (P <= 0) return { err: "Isi harga. Contoh: 300k atau 300.000." };
  var first = dates[0],
    last = dates[dates.length - 1],
    multi = dates.length > 1;
  var specific =
    (pmScen === "harga" && $("phm").value === "terpilih") ||
    (pmScen === "sementara" && multi && !$("prg").checked);
  var range = pmScen === "sementara" && multi && $("prg").checked;
  var un = $("pw").value === "until";
  var to = range ? last : un && !specific ? $("pto").value : "";
  if (!specific && !range && un && (!to || to < first))
    return { err: 'Isi tanggal "sampai" (sama atau sesudah tanggal mulai).' };
  var rs = !specific && $("pa").value === "restart",
    drop =
      !specific && $("pw").value === "forever" && $("pcut").value === "drop";
  var effPrice = priceAt(it, Date.parse(first + "T00:00:00Z"));
  if (
    (pmScen === "harga" || pmScen === "sementara") &&
    P === effPrice &&
    !rs &&
    !drop
  )
    return { err: noopMsg() };
  var curSeg = schedSegAt(it, first);
  if (
    pmScen === "siklus" &&
    n === (curSeg && curSeg.n ? curSeg.n : it.n) &&
    u === (curSeg && curSeg.unit ? curSeg.unit : it.unit) &&
    P === effPrice &&
    !rs &&
    !drop
  )
    return { err: noopMsg() };
  var price;
  if (pmScen === "siklus") {
    price = P !== effPrice ? P : null;
  } else {
    price = P !== it.price ? P : null;
  }
  var c;
  if (specific) {
    var hit = dates.filter(function (d) {
      return occ(it, +d.slice(0, 4)).some(function (t) {
        return isoD(t) === d;
      });
    });
    if (!hit.length)
      return {
        err: "Tidak ada tagihan pada tanggal yang dipilih. Pilih dari daftar tanggal tagihan.",
      };
    // Disimpan dengan tanggal ASLI tagihan (tagihan yang sudah digeser tetap ketemu saat mencari harganya).
    var odates = dates
      .map(function (d) {
        return origDate(it, d);
      })
      .sort();
    c = {
      from: odates[0],
      to: odates[odates.length - 1],
      dates: odates,
      price: price,
      n: null,
      unit: null,
    };
    return { c: c, cs: [c], it: it };
  }
  c = { from: first, to: to, price: price, n: null, unit: null };
  if (rs || n !== it.n || u !== it.unit) {
    c.n = n;
    c.unit = u;
  }
  if (drop) c.cut = true;
  return { c: c, cs: [c], it: it };
}

/**
 * Mode geser: tagihan terpilih (pmDates[0]) dipindah ke tanggal baru (#pdt). Tagihan sebelumnya tidak berubah;
 * tagihan itu dan sesudahnya mengikuti tanggal baru dengan siklus (dan harga) yang berlaku pada tagihan itu.
 */
/** Tagihan sebelum & sesudah `from` pada jadwal SEKARANG, termasuk tahun sebelum/sesudahnya (jadwal tahun aktif saja tidak cukup). */
function pmNeighbors(it, from) {
  var y = +from.slice(0, 4),
    seen = {},
    all = [];
  [y - 1, y, y + 1].forEach(function (yy) {
    occ(it, yy).forEach(function (t) {
      var d = isoD(t);
      if (!seen[d]) {
        seen[d] = 1;
        all.push(d);
      }
    });
  });
  all.sort();
  var i = all.indexOf(from);
  return { prev: i > 0 ? all[i - 1] : null, next: i >= 0 && i < all.length - 1 ? all[i + 1] : null };
}

/** Rentang tanggal baru yang sah untuk menggeser `from`: sesudah tagihan sebelumnya dan sebelum tagihan berikutnya. */
function pmShiftRange(it, from) {
  var nb = pmNeighbors(it, from),
    min = nb.prev ? addDaysISO(nb.prev, 1) : null,
    max = nb.next ? addDaysISO(nb.next, -1) : null;
  if (it.unit !== "sekali" && it.start && (!min || it.start > min)) min = it.start;
  if (it.end && (!max || it.end < max)) max = it.end;
  var cut = (it.ch || [])
    .filter(function (q) {
      return q.cut;
    })
    .map(function (q) {
      return q.from;
    })
    .sort()
    .pop();
  if (cut && (!min || cut > min)) min = cut;
  return { min: min, max: max, prev: nb.prev, next: nb.next };
}

function pmRangeMsg(r) {
  return r.min && r.max
    ? "Tanggal baru harus di antara " + fmtD(r.min) + " dan " + fmtD(r.max) + " (di antara tagihan " + fmtD(r.prev) + " dan " + fmtD(r.next) + ")."
    : r.min
      ? "Tanggal baru harus sesudah tagihan sebelumnya (" + fmtD(r.prev) + ")."
      : "Tanggal baru harus sebelum tagihan berikutnya (" + fmtD(r.next) + ").";
}

function pmDraftShift(it) {
  var from = pmDates[0],
    to = $("pdt").value;
  if (!from) return { err: "Pilih tagihan yang mau digeser." };
  var allSched = occ(it, S.year).map(isoD);
  if (allSched.length && allSched.indexOf(from) < 0) {
    return { err: "Tanggal asal (" + fmtD(from) + ") bukan tanggal tagihan." };
  }
  if ($("pgm").value === "pilih") return pmDraftMulti(it);
  if (!ISO_RE.test(to))
    return { err: 'Isi tanggal baru di "Ganti jadi tanggal".' };
  if (to === from)
    return {
      err: "Tanggal baru sama dengan tanggal tagihan. Pilih tanggal yang berbeda.",
    };
  var rg = pmShiftRange(it, from);
  if ((rg.min && to < rg.min) || (rg.max && to > rg.max)) return { err: pmRangeMsg(rg) };
  if ($("pgm").value === "satu") {
    var ko = origDate(it, from),
      c1 = { from: ko, to: ko, price: null, n: null, unit: null, cut: false, mv: {} };
    c1.mv[ko] = to;
    return { c: c1, cs: [c1], it: it };
  }
  var sg = schedSegAt(it, from),
    eff = priceAt(it, Date.parse(from + "T00:00:00Z")),
    origFrom = origDate(it, from),
    old = (it.ch || []).filter(function (q) {
      return q.anchor === from && !q.cut && !q.mv && !q.dates;
    })[0],
    effFrom = old ? old.from : (origFrom < from ? origFrom : from),
    hasCut = (it.ch || []).some(function (q) {
      return (q.from === from || q.from === origFrom) && q.cut;
    }),
    c = {
      from: effFrom,
      anchor: to,
      to: old ? old.to || "" : "",
      price: eff !== it.price ? eff : null,
      n: (sg && sg.n) || it.n,
      unit: (sg && sg.unit) || it.unit,
      cut: !!((old && old.cut) || hasCut),
    };
  return { c: c, cs: [c], it: it, disp: from };
}

/** Mode geser "pilih sendiri": tiap tagihan terpilih dipindah ke tanggal (1-31) yang sama di bulannya masing-masing. */
function pmDraftMulti(it) {
  var day = parseInt($("pgd").value, 10);
  if (!(day >= 1 && day <= 31)) return { err: "Isi tanggal baru (angka 1-31)." };
  var sched = pmScheduleDates(it),
    mv = {},
    nw = {};
  pmDates.forEach(function (d) {
    var p = d.split("-"),
      dim = new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate(),
      nd = p[0] + "-" + p[1] + "-" + pad2(Math.min(day, dim));
    if (nd !== d) {
      mv[origDate(it, d)] = nd;
      nw[d] = nd;
    }
  });
  var ks = Object.keys(mv).sort();
  if (!ks.length) return { err: "Tanggal barunya sama dengan tanggal tagihan. Pilih tanggal yang berbeda." };
  var cnt = {};
  Object.keys(nw).forEach(function (d) {
    cnt[nw[d]] = (cnt[nw[d]] || 0) + 1;
  });
  var dup = Object.keys(cnt).filter(function (d) {
    return cnt[d] > 1;
  });
  if (dup.length) return { err: "Dua tagihan akan pindah ke tanggal yang sama (" + fmtD(dup[0]) + "). Pilih tanggal lain." };
  var bad = Object.keys(nw).filter(function (d) {
    return sched.indexOf(nw[d]) >= 0 && !nw[nw[d]];
  });
  if (bad.length) return { err: "Tanggal baru bentrok dengan tagihan lain (" + fmtD(nw[bad[0]]) + ")." };
  var c = { from: ks[0], to: ks[ks.length - 1], price: null, n: null, unit: null, cut: false, mv: mv };
  return { c: c, cs: [c], it: it };
}

/** Susun perubahan dari isian + validasi. @returns {c, cs, it} atau {err} */
function pmDraft() {
  var it = item(pmId);
  if (!it) return { err: "Item tidak ditemukan." };
  if (pmScen === "henti") return pmDraftStop(it);
  return pmScen === "geser" ? pmDraftShift(it) : pmDraftNormal();
}

/** Mode berhenti bayar: item berhenti setelah tanggal terpilih (tagihan sesudahnya hilang). @returns {stop, it, cs} atau {err} */
function pmDraftStop(it) {
  var iso = pmDates[0];
  if (it.unit === "sekali") return { err: "Item sekali bayar tidak punya jadwal berulang untuk dihentikan." };
  if (!iso || !ISO_RE.test(iso)) return { err: "Pilih tanggal tagihan terakhir yang masih dibayar." };
  if (it.start && iso < it.start) return { err: "Tanggal itu sebelum item mulai (" + fmtD(it.start) + ")." };
  var far = Date.UTC(+iso.slice(0, 4) + 8, 11, 31),
    tmp = Object.assign({}, it, { end: iso, cnt: 0 });
  if (series(it, far).length === series(tmp, far).length)
    return { err: "Tidak ada tagihan yang berubah: jadwal item ini memang sudah berakhir sebelum tanggal itu." };
  return { stop: iso, it: it, cs: [] };
}

/** Pratinjau berhenti bayar: tagihan terakhir dan yang dihapus (tahun aktif). */
function pmPrevStop(d, p) {
  var it = d.it,
    tmp = Object.assign({}, it, { end: d.stop, cnt: 0 }),
    far = Date.UTC(+d.stop.slice(0, 4) + 8, 11, 31),
    stopMs = Date.parse(d.stop + "T00:00:00Z"),
    kept = series(tmp, far),
    all = series(it, far).filter(function (t) {
      return t > stopMs;
    }),
    gone = all.filter(function (t) {
      return new Date(t).getUTCFullYear() === +S.year;
    }),
    sum = gone.reduce(function (a, t) {
      return a + priceAt(it, t);
    }, 0),
    last = kept.length ? kept[kept.length - 1] : null;
  p.className = "prev";
  p.innerHTML =
    "<b>" + pmSumStop(d) + "</b><br>" +
    (last ? "Tagihan terakhir: " + fd(last) + " (" + rp(priceAt(tmp, last)) + ")." : "Tidak ada tagihan sampai tanggal itu.") +
    "<br>" +
    (gone.length ? "Tahun " + S.year + ": " + gone.length + " tagihan dihapus dari jadwal, total " + rp(sum) + "." : "Tahun " + S.year + ": tidak ada tagihan yang terhapus.") +
    (all.length > gone.length ? " Tahun lain: " + (all.length - gone.length) + " tagihan ikut dihapus." : "");
}

/** Kalimat ringkasan berhenti bayar. */
function pmSumStop(d) {
  return 'Berhenti bayar "' + d.it.name + '" setelah ' + fmtD(d.stop) + ". Tagihan sesudahnya dihapus dari jadwal.";
}

/** Pratinjau tagihan sesudah perubahan. */
function pmPrev() {
  var d = pmDraft(),
    p = $("ppv"),
    it0 = item(pmId),
    cu = pmCur();
  if (it0 && it0.unit !== "sekali")
    $("pah").textContent =
      cu.n !== it0.n || cu.u !== it0.unit
        ? "Siklus berbeda dari awal: pembayaran pertama siklus baru jatuh di tanggal mulai berlaku."
        : $("pa").value === "restart"
          ? "Pembayaran pertama jatuh di tanggal mulai berlaku, lalu mengikuti siklus."
          : 'Tanggal bayar mengikuti jadwal sekarang. Pilih "Mulai ulang" jika ingin menggeser tanggalnya.';
  if (d.err) {
    p.className = "sub";
    p.textContent = d.err;
    pmDateRange();
    return;
  }
  pmDateRange();
  if (d.stop) return pmPrevStop(d, p);
  var tmp = Object.assign({}, d.it, {
    ch: (d.it.ch || [])
      .filter(function (q) {
        return !chSame(d.it, q, d.c);
      })
      .concat([d.c])
      .sort(cmpFrom),
  });
  if (d.c.dates) {
    var years = {},
      shown = d.c.dates.map(function (x) {
        return curDate(tmp, x);
      });
    shown.forEach(function (x) {
      years[x.slice(0, 4)] = 1;
    });
    var all = Object.keys(years).reduce(function (a, y) {
      return a.concat(occ(tmp, +y));
    }, []);
    var hit = all.filter(function (t) {
      return shown.indexOf(isoD(t)) >= 0;
    });
    var miss = shown.filter(function (x) {
      return !hit.some(function (t) {
        return isoD(t) === x;
      });
    });
    p.className = "prev";
    p.innerHTML =
      "<b>" +
      pmSum(d) +
      "</b><br>Tagihan yang berubah: " +
      hit
        .map(function (t) {
          return fd(t) + " (" + rp(priceAt(tmp, t)) + ")";
        })
        .join(", ") +
      (miss.length ? "<br>Tanpa tagihan (diabaikan): " + dList(miss) : "");
    return;
  }
  var f = Date.parse(segStart(d.c) + "T00:00:00Z"),
    end = Date.UTC(+d.c.from.slice(0, 4) + 8, 11, 31),
    l = series(tmp, end)
      .filter(function (t) {
        return t >= f;
      })
      .slice(0, 6);
  var tmp2 = Object.assign({}, tmp, {
      ch: tmp.ch.map(function (g) {
        return g === d.c ? Object.assign({}, g, { cut: false }) : g;
      }),
    }),
    bf = series(tmp2, end)
      .filter(function (t) {
        return t < f;
      })
      .slice(-3);
  p.className = "prev";
  p.innerHTML =
    "<b>" +
    pmSum(d) +
    "</b><br>" +
    (l.length
      ? "Tagihan sesudah perubahan: " +
        l
          .map(function (t) {
            return fd(t) + " (" + rp(priceAt(tmp, t)) + ")";
          })
          .join(", ") +
        (l.length >= 6 ? " &hellip;" : "")
      : "Tidak ada tagihan pada rentang ini.") +
    (bf.length
      ? "<br>Sebelum " +
        fd(f) +
        ": " +
        bf
          .map(function (t) {
            return fd(t);
          })
          .join(", ") +
        (d.c.cut ? " (dihapus)" : " (tidak berubah)")
      : "");
}

/** Pesan saat tidak ada yang berubah (sesuai tujuan terpilih). */
function noopMsg() {
  return pmScen === "harga" || pmScen === "sementara"
    ? "Harga yang diisi sama dengan harga sekarang. Isi harga yang berbeda."
    : pmScen === "siklus"
      ? "Siklusnya sama dengan sekarang. Ubah angka atau satuannya."
      : 'Belum ada yang diubah. Ubah harga atau siklus, atau pilih "Mulai ulang jadwal" / hapus tagihan sebelumnya.';
}

/** Kalimat ringkasan perubahan dalam bahasa biasa. */
function pmSum(d) {
  var c = d.c,
    it = d.it,
    P = c.price != null ? c.price : it.price;
  if (c.mv) {
    var ks = Object.keys(c.mv).sort();
    return ks.length === 1
      ? 'Hanya tagihan ' + fmtD(ks[0]) + ' yang digeser ke ' + fmtD(c.mv[ks[0]]) + '. Tagihan lain tidak berubah.'
      : ks.length + ' tagihan digeser (' + ks.map(function (k) { return dShort(k) + ' → ' + dShort(c.mv[k]); }).join(', ') + '). Tagihan lain tidak berubah.';
  }
  if (c.dates)
    return (
      "Hanya " +
      c.dates.length +
      " tanggal terpilih (" +
      dList(c.dates, 5) +
      "): harga jadi " +
      rp(P) +
      ", tagihan lain tetap " +
      rp(it.price) +
      "."
    );
  var f = fmtD(c.from);
  if (c.anchor)
    return (
      "Tagihan " +
      f +
      " digeser ke " +
      fmtD(c.anchor) +
      (it.unit === "sekali"
        ? ". Tagihan sebelum " + f + " tidak berubah."
        : ", lalu mengikuti siklus tiap " +
          (c.n || it.n) +
          " " +
          (c.unit || it.unit) +
          ". Tagihan sebelum " +
          f +
          " tidak berubah.")
    );
  if (c.to)
    return (
      "Dari " +
      f +
      " sampai " +
      fmtD(c.to) +
      ", harga jadi " +
      rp(P) +
      ", setelah itu kembali ke harga awal " +
      rp(it.price) +
      "."
    );
  var s = "Mulai " + f + ": ";
  if (c.n || c.unit)
    s += "bayar tiap " + (c.n || it.n) + " " + (c.unit || it.unit) + ", ";
  s +=
    "harga " + rp(P) + (P !== it.price ? " (awal " + rp(it.price) + ")" : "");
  if (c.cut) s += ". Tagihan sebelum tanggal ini dihapus";
  return s + ".";
}

/** Isi awal form dengan nilai yang berlaku pada tagihan berikutnya. */
function pmPrefill(it) {
  var occs = occ(it, S.year),
    nx = occs.filter(function (t) {
      return !S.paid[it.id + "|" + isoD(t)] && !S.skip[it.id + "|" + isoD(t)];
    })[0],
    iso = isoD(nx != null ? nx : (occs.length ? occs[0] : Date.now())),
    sg = priceSeg(it, iso);
  $("pdt").value = iso;
  $("pto").value = "";
  $("pp").value = (sg && sg.price != null ? sg.price : it.price).toLocaleString(
    "id-ID",
  );
  $("pn").value = (sg && sg.n) || it.n;
  $("pu").value = (sg && sg.unit) || (it.unit === "sekali" ? "bulan" : it.unit);
  $("pw").value = "forever";
  $("pa").value = "keep";
  $("pcut").value = "keep";
  $("phm").value = "seterusnya";
  $("prg").checked = true;
  phmTouched = false;
  pmDates = [iso];
  pmAuto = true;
  pmInit = pmCur();
}

/** Pilih tujuan (harga | sementara | siklus | geser | manual) dan tampilkan isian yang relevan. */
function pmSc(sc) {
  var it = item(pmId);
  if (!it) return;
  pmScen = sc;
  if (sc === "geser") {
    $("pgm").value = "semua";
    $("pgd").value = "";
  }
  pmPrefill(it);
  if (sc === "sementara") $("pw").value = "until";
  if (sc === "geser") $("pdt").value = pmDates[0] || "";
  var until = $("pw").value === "until";
  $("pform").hidden = !sc;
  $("pps").hidden = !sc;
  $("pbk2").hidden = !sc;
  $("psc").classList.toggle("picked", !!sc);
  $("g-price").hidden = sc === "geser" || sc === "henti";
  $("ppc").hidden = !(sc === "harga" || sc === "sementara");
  $("pcad").hidden = !(sc === "siklus" || sc === "manual");
  $("pcw").hidden = !(sc === "siklus" || (sc === "manual" && !until));
  $("pman").hidden = sc !== "manual";
  if (sc) {
    $("l-pdt").textContent = LB[sc][0];
    $("l-pp").textContent = LB[sc][1];
    $("phint").textContent = PH[sc];
  }
  Array.prototype.forEach.call(
    document.querySelectorAll("#psc button"),
    function (b) {
      b.classList.toggle("on", b.dataset.sc === sc);
    },
  );
  pmMsg("");
  pmLayout();
  if (sc) pmPrev();
}

/** Kembali ke daftar pilihan "Apa yang mau diubah?". */
function pmBack() {
  pmScen = null;
  $("psc").classList.remove("picked");
  $("pbk2").hidden = true;
  $("pform").hidden = true;
  $("pps").hidden = true;
  Array.prototype.forEach.call(
    document.querySelectorAll("#psc button"),
    function (b) {
      b.classList.remove("on");
    },
  );
  pmMsg("");
  var cd = $("pm").querySelector(".card");
  if (cd) cd.scrollTop = 0;
}

/** Buka jendela ubah harga/jadwal untuk sebuah item. */
function openPm(id) {
  var it = item(id);
  if (!it) return;
  pmId = it.id;
  $("pmt").textContent = "Ubah harga / jadwal: " + it.name;
  Array.prototype.forEach.call(
    document.querySelectorAll("#psc button"),
    function (b) {
      b.hidden = false;
    },
  );
  var hb = $("psc").querySelector('button[data-sc="henti"]');
  if (hb) hb.hidden = it.unit === "sekali";
  pmPrefill(it);
  pmBack();
  renderPm();
  $("pm").hidden = false;
}

/** Simpan perubahan; status lunas/lewati ikut pindah bila tanggal tagihan bergeser. */
function savePm() {
  var d = pmDraft();
  if (d.err) return pmMsg(d.err);
  if (d.stop) return savePmStop(d);
  var it = d.it,
    pairs = [];
  // Mode geser: tanggal lama -> baru diketahui persis, jadi status lunas/lewati dipindah langsung (bukan ditebak).
  if (pmScen === "geser")
    d.cs.forEach(function (c) {
      if (c.anchor) pairs.push([d.disp || c.from, c.anchor]);
      else if (c.mv)
        pmDates.forEach(function (cur) {
          var k = origDate(it, cur);
          if (c.mv[k]) pairs.push([cur, c.mv[k]]);
        });
    });
  trackSchedule(it, function () {
    moveStatusExact(it.id, pairs, [S.paid, S.skip], [S.real || {}]);
    d.cs.forEach(function (c) {
      if (c.anchor) {
        var origFrom = origDate(it, d.disp || c.from);
        var dispDate = d.disp || c.from;
        (it.ch || []).forEach(function (q) {
          if (q.mv) {
            Object.keys(q.mv).forEach(function (k) {
              if (k >= origFrom || q.mv[k] >= dispDate || k >= c.from) delete q.mv[k];
            });
          }
        });
      } else if (c.mv) {
        Object.keys(c.mv).forEach(function (k) {
          (it.ch || []).forEach(function (q) {
            if (q.mv && q.mv[k]) delete q.mv[k];
          });
        });
      }
    });
    it.ch = (it.ch || []).filter(function (q) {
      return !q.mv || Object.keys(q.mv).length > 0;
    });
    d.cs.forEach(function (c) {
      (it.ch || []).forEach(function (q) {
        if (chSame(it, c, q)) {
          if (q.cut && !c.cut && pmScen !== "siklus" && pmScen !== "manual") c.cut = true;
          if ((pmScen === "harga" || pmScen === "sementara") && !c.mv && !c.dates) {
            if (q.anchor && !c.anchor) c.anchor = q.anchor;
            if (q.n && !c.n) c.n = q.n;
            if (q.unit && !c.unit) c.unit = q.unit;
          }
        }
      });
    });
    it.ch = (it.ch || []).filter(function (q) {
      return !d.cs.some(function (c) {
        return chSame(it, c, q);
      });
    });
    d.cs.forEach(function (c) {
      // Siklus baru pada tanggal yang sama menggantikan geseran lama; jika tidak,
      // segmen "sekali" lama terus menutupi jadwal berulang yang baru.
      if (c.n || c.unit) {
        it.ch = (it.ch || []).filter(function (q) {
          return !(q.anchor && q.anchor === c.from && !q.mv && !q.dates);
        });
      }
      it.ch.push(c);
    });
    it.ch.sort(cmpFrom);
  });
  save();
  $("pm").hidden = true;
  renderAll();
  toast('Perubahan untuk "' + it.name + '" disimpan.');
  var r = document.querySelector('#v-jadwal tr[data-r="' + it.id + '"]');
  if (r) {
    r.classList.add("flash");
    r.scrollIntoView({ block: "center" });
    setTimeout(function () {
      r.classList.remove("flash");
    }, 2600);
  }
}

/** Simpan "berhenti bayar": isi tanggal berhenti item (bisa diurungkan lewat toast). */
function savePmStop(d) {
  var it = d.it,
    sn = snap("Sebelum berhenti bayar");
  it.end = d.stop;
  it.cnt = 0;
  save();
  $("pm").hidden = true;
  renderAll();
  toast('"' + it.name + '" berhenti setelah ' + fmtD(d.stop) + ".", function () {
    restoreSnap(sn.t);
  });
}

/** Pasang event listener halaman ini. */
function bindPrice() {
  // Chip kenaikan/penurunan cepat: dihitung dari harga yang berlaku di tanggal terpilih, dibulatkan (ratusan/ribuan).
  $("ppc").onclick = function (e) {
    var b = e.target.closest("button[data-pct]"),
      it = item(pmId);
    if (!b || !it) return;
    var base = priceAt(it, Date.parse((pmDates[0] || isoD(Date.now())) + "T00:00:00Z")),
      step = base >= 50000 ? 1000 : 100,
      v = Math.max(0, Math.round((base * (1 + +b.dataset.pct / 100)) / step) * step);
    $("pp").value = v.toLocaleString("id-ID");
    pmPrev();
  };
  $("psc").onclick = function (e) {
    var b = e.target.closest("button[data-sc]");
    if (b) pmSc(b.dataset.sc);
  };
  $("pgm").onchange = function () {
    var keep = this.value === "pilih" ? pmDates : pmDates.slice(0, 1);
    if (this.value !== "pilih" && keep[0]) $("pdt").value = keep[0];
    setDates(keep, false, true);
  };
  $("pgd").oninput = pmPrev;
  ["pp", "pn", "pu", "pto", "pa", "pcut"].forEach(function (i) {
    $(i).oninput = pmPrev;
    $(i).onchange = pmPrev;
  });
  // Mengetik tanggal kustom: mengganti pilihan tunggal otomatis; bila sudah memilih banyak tanggal, tunggu "+ Tambah".
  $("pdt").oninput = $("pdt").onchange = function () {
    if (pmScen === "geser") return pmPrev();
    if (!pmAuto) return;
    setDates(ISO_RE.test(this.value) ? [this.value] : [], true, true);
  };
  $("pda").onclick = function () {
    var v = $("pdt").value;
    if (!ISO_RE.test(v))
      return pmMsg("Pilih tanggal kustom di kotak dulu, lalu tekan + Tambah.");
    pmMsg("");
    setDates(
      pmAuto && pmDates.length === 1 && pmDates[0] === v
        ? [v]
        : pmDates.concat([v]),
      false,
    );
    $("pdt").value = "";
  };
  $("pdc").onclick = function (e) {
    var b = e.target.closest("button[data-d]");
    if (!b) return;
    var d = b.dataset.d;
    if (pmScen === "geser" && !pmMulti()) {
      $("pdt").value = d;
      return setDates([d], false, true);
    }
    if (!pmMulti()) return setDates([d], true);
    setDates(
      pmDates.indexOf(d) >= 0
        ? pmDates.filter(function (x) {
            return x !== d;
          })
        : pmDates.concat([d]),
      false,
    );
  };
  $("pds").onclick = function (e) {
    var b = e.target.closest("button[data-rm]");
    if (!b) return;
    setDates(
      pmDates.filter(function (x) {
        return x !== b.dataset.rm;
      }),
      false,
    );
  };
  $("phm").onchange = function () {
    phmTouched = true;
    pmPrev();
  };
  $("prg").onchange = pmPrev;
  $("pw").onchange = function () {
    $("pcw").hidden = this.value === "until";
    pmLayout();
    pmPrev();
  };
  $("pp").addEventListener("input", function () {
    fmtLive(this);
  });
  $("pcl").onclick = function () {
    $("pm").hidden = true;
  };
  $("pps").onclick = savePm;
  $("pbk2").onclick = pmBack;
  $("phl").onclick = function (e) {
    var b = e.target.closest("button[data-pdel]");
    if (!b) return;
    askConfirm("Hapus perubahan harga ini dari jadwal?", function () {
      var it = item(pmId);
      var sn = snap("Sebelum hapus perubahan harga");
      trackSchedule(it, function () {
        it.ch.splice(+b.dataset.pdel, 1);
      });
      save();
      renderAll();
      renderPm();
      pmPrev();
      toast("Perubahan dihapus.", function () {
        restoreSnap(sn.t);
      });
    }, "Ya, hapus");
  };
}
