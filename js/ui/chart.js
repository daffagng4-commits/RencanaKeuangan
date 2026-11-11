/**
 * Grafik arus saldo (area chart interaktif) + donut pemasukan/pengeluaran.
 * Geometri butuh lebar kartu, jadi markah dipasang dulu lalu chartMount(root) menggambarnya.
 * Nilai sumbu/tooltip memakai data asli; kurva hanya dihaluskan (Catmull-Rom, 96 titik).
 */

var LCQ = [],
  DNQ = [],
  LC_LIVE = [];

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

/** Kartu arus saldo. o = {id, title, sub, aria, pts:[{d,v,tip}], foot, tabs} */
function saldoLine(o) {
  var P = (o.pts || []).slice();
  if (P.length < 2) return '';
  var i = LCQ.push({ pts: P, sub: o.sub || '' }) - 1,
    gid = 'lcg-' + (o.id || i);
  return (
    '<div class="card lc-card"><div class="lc-head"><div class="lc-hl"><div class="dflex aic fwrap g8"><h2 class="m0">' +
    o.title +
    '</h2>' +
    (o.sub ? '<span class="sub fs12">' + o.sub + '</span>' : '') +
    '</div><p class="lc-big"></p><div class="lc-delta"><b class="lc-pct"></b><span class="lc-sub2"></span></div></div>' +
    (o.tabs ? '<div class="cat-tabs" role="tablist">' + o.tabs + '</div>' : '') +
    '</div><div class="lc-wrap"><svg class="lc" data-lci="' +
    i +
    '" tabindex="0" role="slider" aria-label="' +
    esc(o.aria || o.title) +
    '">' +
    '<defs><linearGradient id="' +
    gid +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".32"></stop><stop offset="1" stop-color="var(--ac)" stop-opacity="0"></stop></linearGradient></defs>' +
    '<g class="lc-grid"></g><path class="lc-fill" fill="url(#' +
    gid +
    ')"></path><path class="lc-line" fill="none"></path><g class="lc-xl"></g>' +
    '<g class="lc-cur" style="display:none"><line class="lc-cl"></line><circle class="lc-cd" r="5"></circle></g></svg>' +
    '<div class="lc-tip"><span></span><strong></strong></div></div>' +
    (o.foot ? '<div class="sub lc-foot">' + o.foot + '</div>' : '') +
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
}

/** Area chart: kurva halus, crosshair + tooltip, nilai besar ikut kursor, keyboard. */
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
    fill = svg.querySelector('.lc-fill'),
    line = svg.querySelector('.lc-line'),
    pts = cfg.pts,
    n = pts.length,
    N = 160,
    PL = 8,
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
    y.forEach(function (val, i) {
      d += (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(val).toFixed(1);
    });
    line.setAttribute('d', d);
    fill.setAttribute('d', d + 'L' + xAt(N - 1).toFixed(1) + ' ' + (PT + ih) + 'L' + PL + ' ' + (PT + ih) + 'Z');
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
        '" stroke="var(--ln)"></line><text x="' +
        PL +
        '" y="' +
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
      pct = y[0] ? ((val - y[0]) / Math.abs(y[0])) * 100 : 0,
      tw;
    big.textContent = rp(Math.round(val));
    pctEl.textContent = (pct < 0 ? '▼ ' : '▲ ') + Math.abs(pct).toFixed(1).replace('.', ',') + '%';
    pctEl.classList.toggle('neg', pct < 0);
    subEl.textContent = hover == null ? '' : dlabel(pts[nearest(hover)].d);
    svg.setAttribute('aria-valuemin', 0);
    svg.setAttribute('aria-valuemax', N - 1);
    svg.setAttribute('aria-valuenow', idx);
    svg.setAttribute('aria-valuetext', dlabel(pts[nearest(idx)].d) + ': ' + rp(Math.round(val)));

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
    tip.firstElementChild.textContent = dlabel(pts[nearest(hover)].d);
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
