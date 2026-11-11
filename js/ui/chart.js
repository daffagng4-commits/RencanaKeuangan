/** Kurva Catmull-Rom jadi bezier kubik: garis mulus tanpa sudut, dibatasi area plot. */
function smoothPath(pts, yLo, yHi) {
  var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1),
    cl = function (v) { return Math.min(yHi, Math.max(yLo, v)); };
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += 'C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' + cl(p1.y + (p2.y - p0.y) / 6).toFixed(1) + ',' +
      (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' + cl(p2.y - (p3.y - p1.y) / 6).toFixed(1) + ',' +
      p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
  }
  return d;
}

/**
 * Grafik garis saldo per tanggal: sumbu x memakai tanggal asli, crosshair + tooltip
 * saat kursor/fokus di area grafik.
 * o = {id, title, sub, aria, pts:[{d, v, tip}], foot}
 */
function saldoLine(o) {
  var P = (o.pts || []).slice();
  if (P.length < 2) return '';
  var W = 720,
    H = 238,
    padL = 56,
    padR = 14,
    padT = 18,
    padB = 32,
    plotW = W - padL - padR,
    plotH = H - padT - padB,
    vs = P.map(function (p) { return p.v; }),
    mn = Math.min.apply(null, vs),
    mx = Math.max.apply(null, vs),
    lo = Math.min(0, mn),
    hi = Math.max(0, mx);
  if (hi === lo) hi = lo + 1;
  var pad = (hi - lo) * 0.14 || 1;
  lo -= pad;
  hi += pad;
  var t0 = Date.parse(P[0].d + 'T00:00:00Z'),
    t1 = Date.parse(P[P.length - 1].d + 'T00:00:00Z');
  if (!(t1 > t0)) t1 = t0 + 864e5;
  var X = function (d) { return padL + (plotW * (Date.parse(d + 'T00:00:00Z') - t0)) / (t1 - t0); },
    Y = function (v) { return padT + ((hi - v) / (hi - lo)) * plotH; },
    ax = function (v) { return (v < 0 ? '−' : '') + shortP(Math.abs(v)); },
    zero = Y(0),
    xy = P.map(function (p) { return { x: X(p.d), y: Y(p.v) }; }),
    line = smoothPath(xy, padT, padT + plotH),
    area = line + ' L' + xy[xy.length - 1].x.toFixed(1) + ' ' + (padT + plotH) + ' L' + padL + ' ' + (padT + plotH) + ' Z',
    gid = 'lcg-' + (o.id || 'x');
  var groups = P.map(function (p, i) {
    var x = X(p.d),
      left = i ? (X(P[i - 1].d) + x) / 2 : padL,
      right = i < P.length - 1 ? (x + X(P[i + 1].d)) / 2 : W - padR;
    return (
      '<g class="lc-p"><rect class="lc-hit" x="' + left.toFixed(1) + '" y="' + padT + '" width="' + Math.max(1, right - left).toFixed(1) + '" height="' + plotH + '" fill="transparent" tabindex="0" data-tip="' + esc(p.tip) + '"></rect>' +
      '<line class="lc-v" x1="' + x.toFixed(1) + '" y1="' + padT + '" x2="' + x.toFixed(1) + '" y2="' + (padT + plotH) + '"></line>' +
      '<circle class="lc-halo" cx="' + x.toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="11"></circle>' +
      '<circle class="lc-d' + (p.v < 0 ? ' neg' : '') + '" cx="' + x.toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="4.5" data-tip="' + esc(p.tip) + '"></circle></g>'
    );
  }).join('');
  var multiYear = P[0].d.slice(0, 4) !== P[P.length - 1].d.slice(0, 4),
    dlabel = function (d) {
      var z = new Date(d + 'T00:00:00Z');
      return z.getUTCDate() + ' ' + MON[z.getUTCMonth()] + (multiYear ? ' ' + d.slice(2, 4) : '');
    },
    li = [0, Math.round((P.length - 1) * 0.25), Math.round((P.length - 1) * 0.5), Math.round((P.length - 1) * 0.75), P.length - 1],
    seenL = {},
    labels = li.map(function (i) {
      if (seenL[i]) return '';
      seenL[i] = 1;
      var a = i === 0 ? 'start' : i === P.length - 1 ? 'end' : 'middle';
      return '<text x="' + X(P[i].d).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + a + '" font-size="10" fill="var(--mut)">' + dlabel(P[i].d) + '</text>';
    }).join('');
  var yv = [mx, mn],
    seen = {},
    grid = yv.map(function (v) {
      var y = Y(v).toFixed(1);
      if (seen[y]) return '';
      seen[y] = 1;
      return '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--ln)" stroke-width="1" opacity=".55"></line>' +
        '<text x="' + (padL - 6) + '" y="' + (+y + 3) + '" text-anchor="end" font-size="10" fill="var(--mut)">' + ax(v) + '</text>';
    }).join('');
  var last = P[P.length - 1].v,
    first = P[0].v,
    chg = first ? ((last - first) / Math.abs(first)) * 100 : 0,
    stat =
      '<div class="lc-stat"><b class="pv">' + rp(last) + '</b><span class="chp chg' +
      (chg < 0 ? ' neg' : '') +
      '" data-tip="Perubahan saldo selama periode">' +
      (chg < 0 ? '&#9660; ' : '&#9650; ') +
      Math.abs(chg).toFixed(1).replace('.', ',') +
      '%</span></div>';
  return (
    '<div class="card"><div class="dflex jcsb aic fwrap g8 mb6"><h2 style="margin:0">' + o.title + '</h2>' +
    (o.sub ? '<span class="sub fs12">' + o.sub + '</span>' : '') +
    stat +
    (o.tabs ? '<div class="cat-tabs" role="tablist">' + o.tabs + '</div>' : '') +
    '</div>' +
    '<svg class="lc kch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || o.title) + '">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".22"></stop><stop offset=".65" stop-color="var(--ac)" stop-opacity=".06"></stop><stop offset="1" stop-color="var(--ac)" stop-opacity="0"></stop></linearGradient></defs>' +
    grid +
    '<path d="' + area + '" fill="url(#' + gid + ')"></path>' +
    '<path d="' + line + '" class="lc-line" pathLength="1" fill="none" stroke="var(--ac)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>' +
    '<line x1="' + padL + '" y1="' + zero.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + zero.toFixed(1) + '" stroke="var(--ln)" stroke-width="1" stroke-dasharray="3 3" opacity=".8"></line>' +
    groups + labels + '</svg>' +
    (o.foot ? '<div class="sub lc-foot">' + o.foot + '</div>' : '') + '</div>'
  );
}

/* Geser jari di grafik (mobile): titik terdekat mengikuti jari + tooltip, seperti grafik saham. */
(function () {
  var active = null,
    last = null;

  function clear(closeTip) {
    if (active) active.classList.remove('active');
    active = last = null;
    if (closeTip && typeof tipHide === 'function') tipHide();
  }
  function nearest(svg, clientX) {
    var r = svg.getBoundingClientRect(),
      x = r.width ? ((clientX - r.left) / r.width) * 720 : 0,
      best = null,
      dist = 1e9;
    svg.querySelectorAll('.lc-p').forEach(function (g) {
      var dot = g.querySelector('.lc-d');
      if (!dot) return;
      var d = Math.abs(parseFloat(dot.getAttribute('cx')) - x);
      if (d < dist) { dist = d; best = g; }
    });
    return best;
  }
  function setActive(g, x, y) {
    if (!g) return;
    if (active !== g) {
      if (active) active.classList.remove('active');
      active = g;
      g.classList.add('active');
    }
    last = { x: x, y: y };
    if (typeof tipShow === 'function') tipShow(g.querySelector('.lc-hit'), x, y);
  }
  function chartOf(e) {
    return e.target && e.target.closest ? e.target.closest('svg.lc') : null;
  }

  document.addEventListener('pointerdown', function (e) {
    var svg = chartOf(e);
    if (!svg) { clear(true); return; }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setActive(nearest(svg, e.clientX), e.clientX, e.clientY);
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  document.addEventListener('pointermove', function (e) {
    var svg = chartOf(e);
    if (!svg) {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') clear(true);
      return;
    }
    if (e.pointerType === 'touch' || e.pointerType === 'pen' || e.buttons) {
      setActive(nearest(svg, e.clientX), e.clientX, e.clientY);
    }
  });
  document.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'mouse') { clear(true); return; }
    if (!active || !last) return;
    var g = active,
      hit = g.querySelector('.lc-hit');
    /* klik setelah geser bisa menutup tooltip; tampilkan lagi setelah klik selesai */
    setTimeout(function () {
      if (active === g && typeof tipShow === 'function') tipShow(hit, last.x, last.y);
    }, 0);
  });
  document.addEventListener('pointercancel', function () { clear(true); });
  window.addEventListener('scroll', function () { clear(false); }, true);
})();

/* Donut: sorot irisan + legenda, angka pusat ikut irisan yang disorot; klik legenda menyembunyikan irisan. */
(function () {
  function pieOf(el) {
    var p = el.closest ? el.closest('.pie') : null;
    if (p) return p;
    var w = el.closest('.insight-pie');
    return w ? w.querySelector('.pie') : null;
  }
  function show(pie, k) {
    if (!pie) return;
    var c0 = pie.querySelector('.pie-c');
    if (c0 && pie._def == null) pie._def = c0.innerHTML;
    var wrap = pie.closest('.insight-pie'),
      sl = k ? pie.querySelector('.pie-slice[data-k="' + k + '"]') : null;
    pie.querySelectorAll('.pie-slice').forEach(function (s) { s.classList.toggle('on', s === sl); });
    if (wrap) wrap.querySelectorAll('.pie-k').forEach(function (b) { b.classList.toggle('on', !!k && b.dataset.k === k); });
    if (c0) c0.innerHTML = sl ? '<b>' + sl.dataset.pct + '%</b><small>' + (k === 'in' ? 'masuk' : 'keluar') + '</small>' : pie._def;
  }
  function pick(e) {
    var t = e.target.closest ? e.target.closest('.pie-slice, .pie-k') : null;
    return t ? { pie: pieOf(t), k: t.dataset.k } : null;
  }
  document.addEventListener('pointerover', function (e) { var x = pick(e); if (x) show(x.pie, x.k); });
  document.addEventListener('pointerout', function (e) { var x = pick(e); if (x) show(x.pie, null); });
  document.addEventListener('focusin', function (e) { var x = pick(e); if (x) show(x.pie, x.k); });
  document.addEventListener('focusout', function (e) {
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.insight-pie')) return;
    document.querySelectorAll('.pie').forEach(function (p) { show(p, null); });
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.pie-k') : null;
    if (!b) return;
    var pie = pieOf(b), off = b.classList.toggle('off');
    if (pie) pie.querySelectorAll('.pie-slice[data-k="' + b.dataset.k + '"]').forEach(function (s) { s.classList.toggle('off', off); });
  });
})();
