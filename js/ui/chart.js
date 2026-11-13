/**
 * Grafik arus saldo (area chart interaktif) + donut pemasukan/pengeluaran.
 * Geometri butuh lebar kartu, jadi markah dipasang dulu lalu chartMount(root) menggambarnya.
 * Nilai sumbu/tooltip memakai data asli; kurva hanya dihaluskan (Catmull-Rom, 96 titik).
 */

var LCQ = [],
  DNQ = [],
  BSQ = [],
  LC_LIVE = [];

/** Rentang tanggal tiap grafik arus saldo, dipakai chip kartu Kondisi kas. */
var kasChipBnd = {};
/** Reset antrean grafik; rentang chip ikut dikosongkan. */
function chartReset() {
  LCQ = [];
  DNQ = [];
  BSQ = [];
  kasChipBnd = {};
}

/** Haluskan deret nilai ke N titik (ujung tetap sama dengan data asli). */
function crResample(v, N, lo, hi) {
  var n = v.length,
    out = [],
    k,
    x,
    i,
    f,
    p0,
    p1,
    p2,
    p3;
  if (n < 2) return v.slice();
  for (k = 0; k < N; k++) {
    x = (k / (N - 1)) * (n - 1);
    i = Math.min(n - 2, Math.floor(x));
    f = x - i;
    p0 = v[Math.max(0, i - 1)];
    p1 = v[i];
    p2 = v[i + 1];
    p3 = v[Math.min(n - 1, i + 2)];
    out.push(
      Math.min(
        hi,
        Math.max(
          lo,
          0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
        )
      )
    );
  }
  return out;
}

/** Langkah sumbu Y yang enak dibaca (1/2/5 × 10^n). */
function niceStep(r) {
  var p = Math.pow(10, Math.floor(Math.log(r) / Math.LN10)),
    m = r / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Kartu arus saldo. o = {id, title, sub, aria, pts:[{d,v,tip}], foot, tabs, marks:{today, habis}} */
function saldoLine(o) {
  var P = (o.pts || []).slice();
  if (P.length < 2) return '';
  var i = LCQ.push({ pts: P, sub: o.sub || '', marks: o.marks || null, bnd: o.bnd || '' }) - 1,
    gid = 'lcg-' + (o.id || i),
    head = o.bare
      ? '<div class="sub lc-cap">' + esc(o.title) + (o.sub ? ' &middot; ' + o.sub : '') + '</div>'
      : '<div class="lc-head"><div class="lc-hl"><div class="dflex aic fwrap g8"><h2 class="m0">' +
        o.title +
        '</h2>' +
        (o.sub ? '<span class="sub fs12">' + o.sub + '</span>' : '') +
        '</div><p class="lc-big"></p><div class="lc-delta"><b class="lc-pct"></b><span class="lc-sub2"></span></div></div>' +
        (o.tabs ? '<div class="cat-tabs" role="tablist">' + o.tabs + '</div>' : '') +
        '</div>';
  return (
    '<div class="card lc-card">' + head + '<div class="lc-wrap"><svg class="lc" data-lci="' +
    i +
    '" tabindex="0" role="slider" aria-label="' +
    esc(o.aria || o.title) +
    '">' +
    '<defs><linearGradient id="' +
    gid +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".32"></stop><stop offset="1" stop-color="var(--ac)" stop-opacity="0"></stop></linearGradient></defs>' +
    '<g class="lc-grid"></g><path class="lc-fill" fill="url(#' +
    gid +
    ')"></path><path class="lc-fill lc-fill-p" fill="url(#' +
    gid +
    ')"></path><path class="lc-line" fill="none"></path><path class="lc-line lc-line-p" fill="none"></path><g class="lc-mark"></g><g class="lc-xl"></g>' +
    '<g class="lc-cur" style="display:none"><line class="lc-cl"></line><circle class="lc-cd" r="5"></circle></g></svg>' +
    '<div class="lc-tip"><span></span><strong></strong></div></div>' +
    '<div class="lc-lgrow">' +
    (o.marks ? '<div class="lc-lg"><span class="s"><i class="sw"></i>Nyata</span><span class="p"><i class="sw"></i>Proyeksi</span></div>' : '') +
    (o.foot ? '<div class="sub lc-foot">' + o.foot + '</div>' : '') +
    '</div>' +
    '</div>'
  );
}

/** Donut masuk/keluar: legenda bisa menyembunyikan irisan tanpa ring runtuh. */
function donutHtml(o) {
  var i = DNQ.push(o) - 1;
  return (
    '<div class="dn" data-dni="' +
    i +
    '"><div class="dn-ring"><svg role="img" aria-label="' +
    esc(o.aria || '') +
    '"></svg><div class="dn-c"><small></small><strong class="pv"></strong><em></em></div></div><ul class="dn-lg"></ul></div>'
  );
}

/** Pasang semua grafik di dalam root (setelah innerHTML terpasang). */
function chartMount(root) {
  LC_LIVE = [];
  root.querySelectorAll('svg.lc[data-lci]').forEach(function (svg) {
    var cfg = LCQ[+svg.dataset.lci];
    if (cfg) LC_LIVE.push(areaInit(svg, cfg));
  });
  root.querySelectorAll('.dn[data-dni]').forEach(function (host) {
    var cfg = DNQ[+host.dataset.dni];
    if (cfg) donutInit(host, cfg);
  });
  root.querySelectorAll('.bs[data-bsi]').forEach(function (host) {
    var cfg = BSQ[+host.dataset.bsi];
    if (cfg) barStackInit(host, cfg);
  });
}

/** Rupiah ringkas satu desimal: 4,6jt, 720rb. */
function rpS(v) {
  return v >= 1e6 ? (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt' : v >= 1000 ? Math.round(v / 1000) + 'rb' : String(Math.round(v));
}

/** Stacked bar per bulan: pemasukan (bawah) + pengeluaran (atas), selisih di atas batang. o = {aria, rows:[{m, full, inc, out}]} */
function barStackHtml(o) {
  var i = BSQ.push(o) - 1;
  return (
    '<div class="bs" data-bsi="' +
    i +
    '"><div class="bs-chart"><svg role="group" aria-label="' +
    esc(o.aria) +
    '"></svg><div class="bs-tip" aria-hidden="true"></div></div>' +
    '<div class="bs-lg"><span style="--c:var(--bs-in)">Pemasukan</span><span style="--c:var(--bs-out)">Pengeluaran</span></div></div>'
  );
}

function barStackInit(host, cfg) {
  var box = host.querySelector('.bs-chart'),
    svg = box.querySelector('svg'),
    tip = box.querySelector('.bs-tip'),
    rows = cfg.rows,
    n = rows.length,
    small = n > 6,
    first = true,
    PT = 24,
    PB = 24,
    GAP = 2,
    tops = [];
  function el(tag, a, p) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in a) e.setAttribute(k, a[k]);
    p.appendChild(e);
    return e;
  }
  function sd(v, full) {
    return (v < 0 ? '-' : '+') + (full ? rp(Math.abs(v)) : (small ? '' : 'Rp ') + rpS(Math.abs(v)));
  }
  function line(c, label, val) {
    return '<i style="--c:' + c + '">' + label + '<span class="pv">' + val + '</span></i>';
  }
  function show(i) {
    var r = rows[i],
      d = r.inc - r.out;
    tip.innerHTML =
      '<b>' +
      r.full +
      '</b>' +
      line('var(--bs-in)', 'Pemasukan', rp(r.inc)) +
      line('var(--bs-out)', 'Pengeluaran', rp(r.out)) +
      line(d < 0 ? 'var(--wr)' : 'var(--in)', 'Selisih', sd(d, true));
    tip.classList.add('on');
    var W = box.clientWidth,
      cx = (W / n) * (i + 0.5),
      tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(W - tw, cx - tw / 2)) + 'px';
    tip.style.top = Math.max(0, tops[i] - tip.offsetHeight - 22) + 'px';
  }
  function hide() {
    tip.classList.remove('on');
  }
  function draw() {
    var W = box.clientWidth || 480,
      H = box.clientHeight || 250,
      ih = H - PT - PB,
      max = Math.max.apply(null, rows.map(function (r) { return r.inc + r.out; })) || 1,
      top = niceStep(max / 4) * 4,
      band = W / n,
      bw = Math.min(band * 0.6, 64),
      y = function (v) { return PT + ih - (v / top) * ih; };
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', (first ? 'bs-in' : '') + (small ? ' bs-sm' : ''));
    for (var k = 0; k <= 4; k++) el('line', { class: 'bs-grid', x1: 0, x2: W, y1: y((top / 4) * k), y2: y((top / 4) * k) }, svg);
    rows.forEach(function (r, i) {
      var cx = band * i + band / 2,
        x = cx - bw / 2,
        tot = r.inc + r.out,
        d = r.inc - r.out,
        g = el('g', { class: 'bs-col' }, svg),
        anim = 'animation-delay:' + i * 50 + 'ms';
      el('rect', { class: 'bs-cur', x: cx - band / 2 + 2, y: 2, width: Math.max(0, band - 4), height: H - PB - 2, rx: 6 }, g);
      el('text', { class: 'bs-tick', x: cx, y: H - 6 }, svg).textContent = r.m;
      tops[i] = y(tot);
      if (!tot) return;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'img');
      g.setAttribute('aria-label', r.full + ': pemasukan ' + rp(r.inc) + ', pengeluaran ' + rp(r.out) + ', selisih ' + (d < 0 ? 'minus ' : 'plus ') + rp(Math.abs(d)));
      if (r.inc) el('rect', { class: 'bs-seg i', x: x, y: y(r.inc), width: bw, height: PT + ih - y(r.inc), rx: 4, style: anim }, g);
      if (r.out) el('rect', { class: 'bs-seg o', x: x, y: y(tot), width: bw, height: Math.max(0, y(r.inc) - y(tot) - (r.inc ? GAP : 0)), rx: 4, style: anim }, g);
      var label = el('text', { class: 'bs-d pv' + (d < 0 ? ' neg' : d > 0 ? ' pos' : ''), x: cx, y: y(tot) - 7, style: anim }, g);
      label.textContent = sd(d);
      if (label.getComputedTextLength && label.getComputedTextLength() > band - 2) {
        label.setAttribute('textLength', Math.max(1, band - 2));
        label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
      g.addEventListener('pointerenter', function () { show(i); });
      g.addEventListener('pointerleave', hide);
      g.addEventListener('focus', function () { show(i); });
      g.addEventListener('blur', hide);
      g.addEventListener('keydown', function (e) {
        var cols = [].slice.call(svg.querySelectorAll('.bs-col[tabindex]')),
          j = cols.indexOf(g),
          to = { ArrowRight: j + 1, ArrowLeft: j - 1, Home: 0, End: cols.length - 1 }[e.key];
        if (e.key === 'Escape') return hide();
        if (to === undefined) return;
        e.preventDefault();
        cols[(to + cols.length) % cols.length].focus();
      });
    });
    first = false;
  }
  draw();
  var w0 = box.clientWidth,
    h0 = box.clientHeight;
  if (window.ResizeObserver)
    new ResizeObserver(function () {
      if (box.clientWidth === w0 && box.clientHeight === h0) return;
      w0 = box.clientWidth;
      h0 = box.clientHeight;
      hide();
      draw();
    }).observe(box);
}

/** Area chart: kurva halus, crosshair + tooltip, nilai besar ikut kursor, keyboard.
    Pada kartu gabungan (tanpa kepala) big/pctEl/subEl tidak ada: nilai tetap ke tooltip. */
function areaInit(svg, cfg) {
  var card = svg.closest('.lc-card'),
    big = card.querySelector('.lc-big'),
    pctEl = card.querySelector('.lc-pct'),
    subEl = card.querySelector('.lc-sub2'),
    tip = card.querySelector('.lc-tip'),
    cur = svg.querySelector('.lc-cur'),
    curLine = svg.querySelector('.lc-cl'),
    curDot = svg.querySelector('.lc-cd'),
    grid = svg.querySelector('.lc-grid'),
    xl = svg.querySelector('.lc-xl'),
    markG = svg.querySelector('.lc-mark'),
    fill = svg.querySelector('.lc-fill'),
    fillP = svg.querySelector('.lc-fill-p'),
    line = svg.querySelector('.lc-line'),
    lineP = svg.querySelector('.lc-line-p'),
    pts = cfg.pts,
    n = pts.length,
    N = 160,
    PL = 34,
    PR = 8,
    PT = 16,
    PB = 26,
    vs = pts.map(function (p) {
      return p.v;
    }),
    lo0 = Math.min.apply(null, vs),
    hi0 = Math.max.apply(null, vs),
    pad = (hi0 - lo0) * 0.15 || Math.max(1, Math.abs(hi0) * 0.05),
    d0 = lo0 - pad,
    d1 = hi0 + pad,
    y = crResample(vs, N, lo0, hi0),
    multiYear = pts[0].d.slice(0, 4) !== pts[n - 1].d.slice(0, 4),
    hover = null,
    W = 0,
    H = 0;

  function nearest(i) {
    return Math.round((i / (N - 1)) * (n - 1));
  }
  function dlabel(d) {
    var z = new Date(d + 'T00:00:00Z');
    return z.getUTCDate() + ' ' + MON[z.getUTCMonth()] + (multiYear ? ' ' + d.slice(2, 4) : '');
  }

  function draw() {
    W = Math.max(220, Math.round(svg.clientWidth || card.clientWidth || 600));
    H = Math.round(svg.clientHeight || 250);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var iw = W - PL - PR,
      ih = H - PT - PB,
      xAt = function (i) {
        return PL + (i / (N - 1)) * iw;
      },
      yAt = function (v) {
        return PT + (1 - (v - d0) / (d1 - d0)) * ih;
      },
      d = '',
      g = '',
      k,
      v,
      yy,
      lx;
    var firstProj = n;
    if (cfg.marks && cfg.marks.today) {
      for (var ti = 0; ti < n; ti++) {
        if (pts[ti].d > cfg.marks.today) { firstProj = ti; break; }
      }
    }
    var lastSolid = firstProj - 1,
      xb = n > 1 ? (lastSolid / (n - 1)) * (N - 1) : 0,
      solidEnd = Math.max(0, Math.ceil(xb)),
      projStart = Math.max(0, Math.floor(xb)),
      hasSolid = firstProj > 0,
      hasProj = firstProj < n;
    var lgEl = svg.closest('.lc-card');
    if (lgEl) {
      var lgS = lgEl.querySelector('.lc-lg .s'), lgP = lgEl.querySelector('.lc-lg .p');
      if (lgS) lgS.hidden = !hasSolid;
      if (lgP) lgP.hidden = !hasProj;
    }
    function pathFor(arr, offset) {
      var p = '';
      arr.forEach(function (val, i) {
        p += (i ? 'L' : 'M') + xAt(offset + i).toFixed(1) + ' ' + yAt(val).toFixed(1);
      });
      return p;
    }
    if (hasSolid) {
      var ds = pathFor(y.slice(0, solidEnd + 1), 0);
      line.setAttribute('d', ds);
      fill.setAttribute('d', ds + 'L' + xAt(solidEnd).toFixed(1) + ' ' + (PT + ih) + 'L' + xAt(0).toFixed(1) + ' ' + (PT + ih) + 'Z');
    } else {
      line.setAttribute('d', '');
      fill.setAttribute('d', '');
    }
    if (hasProj) {
      var dp = pathFor(y.slice(projStart), projStart);
      lineP.setAttribute('d', dp);
      fillP.setAttribute('d', dp + 'L' + xAt(N - 1).toFixed(1) + ' ' + (PT + ih) + 'L' + xAt(projStart).toFixed(1) + ' ' + (PT + ih) + 'Z');
    } else {
      lineP.setAttribute('d', '');
      fillP.setAttribute('d', '');
    }
    var mk = '';
    if (cfg.marks && cfg.marks.today) {
      var tIdx = -1;
      for (ti = 0; ti < n; ti++) if (pts[ti].d === cfg.marks.today) { tIdx = ti; break; }
      if (tIdx >= 0) {
        var tx = xAt((tIdx / (n - 1)) * (N - 1));
        mk += '<line x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="' + PT + '" y2="' + (PT + ih) + '"></line><text x="' + tx.toFixed(1) + '" y="' + (PT + 10) + '" text-anchor="middle">Hari ini</text>';
      }
    }
    if (cfg.marks && cfg.marks.habis) {
      var hIdx = -1;
      for (ti = 0; ti < n; ti++) if (pts[ti].d === cfg.marks.habis) { hIdx = ti; break; }
      if (hIdx >= 0) {
        var hx = xAt((hIdx / (n - 1)) * (N - 1)),
          hy = yAt(y[Math.round((hIdx / (n - 1)) * (N - 1))]);
        mk += '<circle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="5"></circle><text class="lc-mk-label" x="' + hx.toFixed(1) + '" y="' + Math.max(PT + 24, hy - 10) + '" text-anchor="middle">⚠ Saldo habis</text>';
      }
    }
    if (markG) markG.innerHTML = mk;
    var step = niceStep((d1 - d0) / 4);
    for (v = Math.ceil(d0 / step) * step; v <= d1; v += step) {
      yy = yAt(v);
      g +=
        '<line x1="' +
        PL +
        '" x2="' +
        (W - PR) +
        '" y1="' +
        yy.toFixed(1) +
        '" y2="' +
        yy.toFixed(1) +
        '" stroke="var(--ln)"></line><text x="4" y="' +
        (yy - 5).toFixed(1) +
        '">' +
        shortP(v) +
        '</text>';
    }
    grid.innerHTML = g;
    lx = '';
    [0, 1 / 3, 2 / 3, 1].forEach(function (t, i) {
      lx +=
        '<text x="' +
        (PL + t * iw).toFixed(1) +
        '" y="' +
        (H - 6) +
        '" text-anchor="' +
        (i === 0 ? 'start' : i === 3 ? 'end' : 'middle') +
        '">' +
        dlabel(pts[nearest(Math.round(t * (N - 1)))].d) +
        '</text>';
    });
    xl.innerHTML = lx;

    var idx = hover == null ? N - 1 : hover,
      val = y[idx],
      // Persen chip memakai titik TERAKHIR (bukan titik hover): angka besar & chip di
      // kartu gabungan tidak boleh berubah saat kursor bergerak (§8b).
      pct = y[0] ? ((y[N - 1] - y[0]) / Math.abs(y[0])) * 100 : 0,
      tw;
    if (big) big.textContent = rp(Math.round(val));
    if (pctEl) {
      pctEl.textContent = (pct < 0 ? '▼ ' : '▲ ') + Math.abs(pct).toFixed(1).replace('.', ',') + '%';
      pctEl.classList.toggle('neg', pct < 0);
    }
    if (subEl) subEl.textContent = hover == null ? '' : dlabel(pts[nearest(hover)].d);
    // Kartu Kondisi kas memakai persen yang sama (rumus & rentang grafik Arus saldo).
    var cc = $('cond-chip'),
      cr = $('cond-range');
    if (cc && cfg.bnd && cr) {
      var bd = kasChipBnd[cfg.bnd];
      cc.hidden = false;
      cc.textContent = (pct < 0 ? '▼ ' : '▲ ') + Math.abs(pct).toFixed(1).replace('.', ',') + '%';
      cc.classList.toggle('neg', pct < 0);
      cr.textContent = bd ? ' · ' + dlabel(bd.from) + ' – ' + dlabel(bd.to) : '';
    }
    svg.setAttribute('aria-valuemin', 0);
    svg.setAttribute('aria-valuemax', N - 1);
    svg.setAttribute('aria-valuenow', idx);
    svg.setAttribute('aria-valuetext', dlabel(pts[nearest(idx)].d) + ': ' + rp(Math.round(val)) + (cfg.marks && cfg.marks.today && pts[nearest(idx)].d > cfg.marks.today ? ' (Proyeksi)' : ''));

    if (hover == null) {
      cur.style.display = 'none';
      tip.style.opacity = 0;
      return;
    }
    var cx = xAt(hover),
      cy = yAt(val);
    cur.style.display = '';
    curLine.setAttribute('x1', cx);
    curLine.setAttribute('x2', cx);
    curLine.setAttribute('y1', PT);
    curLine.setAttribute('y2', PT + ih);
    curDot.setAttribute('cx', cx);
    curDot.setAttribute('cy', cy);
    tip.firstElementChild.textContent = dlabel(pts[nearest(hover)].d) + (cfg.marks && cfg.marks.today && pts[nearest(hover)].d > cfg.marks.today ? ' · Proyeksi' : '');
    tip.lastElementChild.textContent = rp(Math.round(val));
    tip.style.opacity = 1;
    tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(W - tw, cx - tw / 2)) + 'px';
    tip.style.top = Math.max(0, cy - 62) + 'px';
  }

  function idxAt(cx) {
    var r = svg.getBoundingClientRect();
    return Math.max(0, Math.min(N - 1, Math.round(((cx - r.left - PL) / (r.width - PL - PR)) * (N - 1))));
  }

  svg.addEventListener('pointermove', function (e) {
    hover = idxAt(e.clientX);
    draw();
  });
  svg.addEventListener('pointerdown', function (e) {
    hover = idxAt(e.clientX);
    draw();
  });
  svg.addEventListener('pointerleave', function () {
    hover = null;
    draw();
  });
  svg.addEventListener('blur', function () {
    hover = null;
    draw();
  });
  svg.addEventListener('keydown', function (e) {
    var s = e.shiftKey ? 10 : 1,
      h = hover == null ? N - 1 : hover;
    if (e.key === 'ArrowLeft') h -= s;
    else if (e.key === 'ArrowRight') h += s;
    else if (e.key === 'Home') h = 0;
    else if (e.key === 'End') h = N - 1;
    else if (e.key === 'Escape') {
      hover = null;
      draw();
      return;
    } else return;
    e.preventDefault();
    hover = Math.max(0, Math.min(N - 1, h));
    draw();
  });

  if (window.ResizeObserver)
    new ResizeObserver(function () {
      draw();
    }).observe(svg);
  draw();
  return draw;
}

/** Donut: sembunyikan irisan, sorot saat hover, angka tengah ikut berubah. */
function donutInit(host, cfg) {
  var DATA = cfg.data,
    SIZE = 180,
    TH = 18,
    GAP = 0.012,
    R = (SIZE - TH) / 2,
    C = SIZE / 2,
    svg = host.querySelector('svg'),
    center = host.querySelector('.dn-c'),
    legend = host.querySelector('.dn-lg'),
    reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches,
    hidden = {},
    hov = -1,
    st = [],
    shown = 0,
    raf = 0,
    ease = function (p) {
      return 1 - Math.pow(1 - p, 3);
    },
    ring = 'M' + C + ' ' + (C - R) + 'A' + R + ' ' + R + ' 0 1 1 ' + C + ' ' + (C + R) + 'A' + R + ' ' + R + ' 0 1 1 ' + C + ' ' + (C - R),
    slices;

  svg.setAttribute('viewBox', '-6 -6 ' + (SIZE + 12) + ' ' + (SIZE + 12));
  svg.innerHTML =
    '<path class="dn-track" fill="none" stroke-width="' +
    TH +
    '" d="' +
    ring +
    '"></path>' +
    DATA.map(function (d, i) {
      return (
        '<path class="dn-slice" data-i="' +
        i +
        '" fill="none" stroke-width="' +
        TH +
        '" pathLength="1" d="' +
        ring +
        '" style="stroke:' +
        d.color +
        '"></path>'
      );
    }).join('');
  slices = [].slice.call(svg.querySelectorAll('.dn-slice'));
  st = DATA.map(function () {
    return { s: 0, l: 0 };
  });
  legend.innerHTML = DATA.map(function (d, i) {
    return (
      '<li><button type="button" data-i="' +
      i +
      '" aria-pressed="true"><i style="background:' +
      d.color +
      '"></i><span class="n">' +
      esc(d.label) +
      '</span><span class="v pv">' +
      rp(d.value) +
      '</span><span class="p"></span></button></li>'
    );
  }).join('');

  function visTotal() {
    return DATA.reduce(function (a, d, i) {
      return a + (hidden[i] ? 0 : d.value);
    }, 0);
  }
  function targets() {
    var acc = 0,
      vt = visTotal() || 1;
    return DATA.map(function (d, i) {
      var l = hidden[i] ? 0 : d.value / vt,
        o = { s: acc, l: l };
      acc += l;
      return o;
    });
  }
  function paint() {
    slices.forEach(function (el, i) {
      var o = st[i],
        len = Math.max(0, o.l - GAP);
      el.setAttribute('stroke-dasharray', len + ' 2');
      el.setAttribute('stroke-dashoffset', -(o.s + (o.l > 0 ? GAP / 2 : 0)));
    });
    var c = center.children,
      vt = visTotal(),
      on = hov >= 0;
    c[0].textContent = on ? DATA[hov].label : 'Total';
    c[1].textContent = on ? rp(DATA[hov].value) : rp(shown || vt);
    c[2].textContent = on ? (hidden[hov] ? 'disembunyikan' : Math.round((DATA[hov].value / (vt || 1)) * 100) + '% dari total') : '';
  }
  function labels() {
    var vt = visTotal() || 1;
    [].forEach.call(legend.children, function (li, i) {
      var b = li.firstChild,
        off = !!hidden[i];
      b.setAttribute('aria-pressed', !off);
      li.querySelector('.p').textContent = off ? '–' : Math.round((DATA[i].value / vt) * 100) + '%';
    });
    svg.setAttribute(
      'aria-label',
      'Donut: ' +
        DATA.filter(function (d, i) {
          return !hidden[i];
        })
          .map(function (d) {
            return d.label + ' ' + rp(d.value);
          })
          .join(', ')
    );
  }
  function animate() {
    cancelAnimationFrame(raf);
    var from = st.map(function (o) {
        return { s: o.s, l: o.l };
      }),
      ft = shown,
      to = targets(),
      tt = visTotal(),
      t0 = performance.now(),
      D = reduce ? 0 : 700,
      step = function (now) {
        var p = D ? Math.min(1, (now - t0) / D) : 1,
          e = ease(p);
        st.forEach(function (o, i) {
          o.s = from[i].s + (to[i].s - from[i].s) * e;
          o.l = from[i].l + (to[i].l - from[i].l) * e;
        });
        shown = ft + (tt - ft) * e;
        paint();
        if (p < 1) raf = requestAnimationFrame(step);
      };
    raf = requestAnimationFrame(step);
  }
  function setHover(i) {
    if (hov === i) return;
    hov = i;
    host.classList.toggle('dim', i >= 0);
    slices.forEach(function (s, k) {
      s.classList.toggle('on', k === i);
    });
    [].forEach.call(legend.children, function (li, k) {
      li.firstChild.classList.toggle('on', k === i);
    });
    paint();
  }

  legend.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var i = +b.dataset.i,
      vis = DATA.filter(function (d, k) {
        return !hidden[k];
      }).length;
    if (hidden[i]) delete hidden[i];
    else if (vis > 1) hidden[i] = 1;
    else return;
    setHover(-1);
    labels();
    animate();
  });
  legend.addEventListener('pointerover', function (e) {
    var b = e.target.closest('button');
    if (b) setHover(+b.dataset.i);
  });
  legend.addEventListener('pointerleave', function () {
    setHover(-1);
  });
  legend.addEventListener('focusin', function (e) {
    var b = e.target.closest('button');
    if (b) setHover(+b.dataset.i);
  });
  legend.addEventListener('focusout', function () {
    setHover(-1);
  });
  svg.addEventListener('pointerover', function (e) {
    var s = e.target.closest('.dn-slice');
    if (s && !hidden[+s.dataset.i]) setHover(+s.dataset.i);
  });
  svg.addEventListener('pointerleave', function () {
    setHover(-1);
  });

  labels();
  animate();
}

window.addEventListener('resize', function () {
  LC_LIVE.forEach(function (f) {
    f();
  });
});
