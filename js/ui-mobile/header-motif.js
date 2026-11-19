/* ==========================================================================
   HEADER-MOTIF.JS — Motif SVG Bunga Halus (Mode APK, Statis & Ter-cache)
   ========================================================================== */
(function () {
  var _hmSeq = 0;
  var _hmCache = Object.create(null);

  function q(n) { return Math.round(n * 10) / 10; }

  function pal() {
    return {
      navy: '#9dbcf2',
      blue: '#d3e2ff',
      blue2: '#ffffff',
      gold: '#f0dca4',
      rim: '#e1ecff',
      lw: 0.8,
      fo: 0.4,
      bo: 0.22,
    };
  }

  function flower(p, x, y, R, rot) {
    var pt = function (s) {
      var a = R * s;
      return 'M0 0C' + q(-0.5 * a) + ' ' + q(-0.3 * a) + ' ' + q(-0.62 * a) + ' ' + q(-0.98 * a) + ' 0 ' + q(-a) +
        'C' + q(0.62 * a) + ' ' + q(-0.98 * a) + ' ' + q(0.5 * a) + ' ' + q(-0.3 * a) + ' 0 0Z';
    };
    var h = '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">';
    for (var k = 0; k < 5; k++) {
      h += '<g transform="rotate(' + (k * 72) + ')">' +
        '<path d="' + pt(1) + '" fill="' + p.rim + '" fill-opacity="' + p.fo + '" stroke="' + p.gold + '" stroke-width="' + p.lw + '"/>' +
        '<path d="' + pt(0.8) + '" fill="' + p.navy + '" fill-opacity="' + p.fo + '"/>';
      var v = '';
      [-0.14, 0, 0.14].forEach(function (o) {
        v += 'M0 ' + q(-0.3 * R) + 'Q' + q(o * R * 1.4) + ' ' + q(-0.55 * R) + ' ' + q(o * R * 1.1) + ' ' + q(-0.72 * R);
      });
      h += '<path d="' + v + '" fill="none" stroke="' + p.gold + '" stroke-width="' + q(p.lw * 0.7) + '" stroke-linecap="round"/></g>';
    }
    return h +
      '<circle r="' + q(0.33 * R) + '" fill="' + p.blue + '" fill-opacity="' + p.fo + '" stroke="' + p.gold + '" stroke-width="' + q(p.lw * 1.2) + '"/>' +
      '<circle r="' + q(0.23 * R) + '" fill="' + p.blue2 + '" fill-opacity="' + p.fo + '"/>' +
      '<circle r="' + q(0.1 * R) + '" fill="' + p.navy + '" fill-opacity="' + p.fo + '"/></g>';
  }

  function bez(P, t) {
    var u = 1 - t;
    return [
      u * u * u * P[0] + 3 * u * u * t * P[2] + 3 * u * t * t * P[4] + t * t * t * P[6],
      u * u * u * P[1] + 3 * u * u * t * P[3] + 3 * u * t * t * P[5] + t * t * t * P[7],
    ];
  }

  function branch(p, P, n, L0) {
    var h = '<path d="M' + P[0] + ' ' + P[1] + 'C' + P.slice(2).join(' ') + '" fill="none" stroke="' + p.gold + '" stroke-width="' + q(p.lw * 1.7) + '" stroke-linecap="round"/>';
    for (var i = 1; i <= n; i++) {
      var t = 0.1 + 0.85 * i / n;
      var a = bez(P, t);
      var b = bez(P, t + 0.02);
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var l = Math.hypot(dx, dy) || 1;
      var nx = -dy / l;
      var ny = dx / l;
      var s = i % 2 ? 1 : -1;
      var L = L0 * (1 - 0.35 * i / n);
      var ex = a[0] + (nx * s * 0.8 + dx / l * 0.7) * L;
      var ey = a[1] + (ny * s * 0.8 + dy / l * 0.7) * L;
      h += '<path d="M' + q(a[0]) + ' ' + q(a[1]) + 'Q' + q((a[0] + ex) / 2 + nx * s * L * 0.2) + ' ' + q((a[1] + ey) / 2 + ny * s * L * 0.2) + ' ' + q(ex) + ' ' + q(ey) + '" fill="none" stroke="' + p.gold + '" stroke-width="' + p.lw + '" stroke-linecap="round"/>' +
        '<circle cx="' + q(ex) + '" cy="' + q(ey) + '" r="1.7" fill="' + p.gold + '"/>';
    }
    return h;
  }

  function bud(p, x, y, s, rot) {
    var d = 'M0 0C-16 -4 -20 -26 -6 -40C0 -46 8 -42 12 -34C20 -20 14 -4 0 0Z';
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<path d="M0 0C-4 30 -24 56 -44 82" fill="none" stroke="' + p.gold + '" stroke-width="' + q(p.lw * 1.7) + '" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="' + p.rim + '" fill-opacity="' + p.fo + '" stroke="' + p.gold + '" stroke-width="' + p.lw + '"/>' +
      '<path d="M-1 -3C-11 -6-13 -22-4 -32C2 -36 7 -30 8 -24C12 -14 8 -4-1 -3Z" fill="' + p.navy + '" fill-opacity="' + p.fo + '"/></g>';
  }

  function items(p, H) {
    var h = '';
    var F = H > 200;
    h += branch(p, [-20, F ? 78 : 54, 40, F ? 24 : 16, 110, F ? 44 : 28, 190, -6], 7, 16);
    if (F) {
      h += branch(p, [-10, H - 30, 60, H - 66, 104, H - 20, 172, H - 52], 6, 15) +
        branch(p, [404, H - 44, 344, H - 100, 304, H - 70, 252, H - 124], 6, 14);
    } else {
      h += branch(p, [404, H - 18, 350, H - 54, 310, H - 36, 262, H - 70], 5, 13);
    }
    h += flower(p, 346, F ? 14 : 6, F ? 118 : 88, 12) +
      flower(p, F ? 14 : 6, H + (F ? -4 : 10), F ? 98 : 62, -24);
    if (F) {
      h += flower(p, 214, H - 48, 40, 38) +
        flower(p, 156, 30, 22, 70) +
        flower(p, 262, 122, 19, 12) +
        bud(p, 300, 150, 0.8, 30) +
        bud(p, 96, 196, 0.7, -40);
    } else {
      h += flower(p, 208, H - 20, 24, 38) + bud(p, 170, 20, 0.6, 20);
    }
    return h;
  }

  function defaultZones(W, H) {
    var F = H > 200;
    if (F) {
      return [
        [q(W * 0.19), 26, q(W * 0.16), 17],
        [q(W * 0.83), 26, q(W * 0.16), 17],
        [q(W * 0.21), 62, q(W * 0.22), 14],
      ];
    }
    return [
      [q(W * 0.19), 26, q(W * 0.16), 17],
      [q(W * 0.83), 26, q(W * 0.16), 17],
    ];
  }

  function buildMotifSvg(isFull, customZones) {
    var W = 390;
    var H = isFull ? 280 : 88;
    var zList = (customZones && customZones.length) ? customZones : defaultZones(W, H);
    var cacheKey = (isFull ? 'F' : 'S') + '|' + zList.map(function (z) { return z.join(','); }).join(';');
    if (_hmCache[cacheKey]) return _hmCache[cacheKey];

    _hmSeq += 1;
    var k = 'hm' + _hmSeq;
    var p = pal();
    var zSvg = zList.map(function (e) {
      return '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" fill="#000" fill-opacity=".68" filter="url(#' + k + 'bl)"/>';
    }).join('');

    var svg = '<svg class="hdr-motif" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + k + 'vg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#707070"/>' +
      '<stop offset=".08" stop-color="#fff"/>' +
      '<stop offset=".62" stop-color="#fff"/>' +
      '<stop offset="1" stop-color="#151515"/>' +
      '</linearGradient>' +
      '<filter id="' + k + 'bl" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="12"/></filter>' +
      '<mask id="' + k + 'mk" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '">' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + k + 'vg)"/>' + zSvg +
      '</mask>' +
      '</defs>' +
      '<g mask="url(#' + k + 'mk)"><g class="hm-mg">' + items(p, H) + '</g></g>' +
      '</svg>';

    _hmCache[cacheKey] = svg;
    return svg;
  }

  function measureZones(hdrEl, isFull) {
    if (!hdrEl || typeof hdrEl.getBoundingClientRect !== 'function') return null;
    var hr = hdrEl.getBoundingClientRect();
    if (!hr || hr.width <= 0 || hr.height <= 0) return null;
    var W = 390;
    var H = isFull ? 280 : 88;
    var sx = W / hr.width;
    var sy = H / hr.height;
    var zones = [];
    var selectors = isFull ? ['.mt-wordmark', '.mt-actions', '.hdr-greet'] : ['.mt-wordmark', '.mt-actions'];
    selectors.forEach(function (sel) {
      var el = hdrEl.querySelector(sel);
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      var r = el.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return;
      var cx = q(((r.left - hr.left) + r.width / 2) * sx);
      var cy = q(((r.top - hr.top) + r.height / 2) * sy);
      var rx = q(Math.max(24, (r.width / 2) * sx + 12));
      var ry = q(Math.max(10, (r.height / 2) * sy + 6));
      zones.push([cx, cy, rx, ry]);
    });
    return zones.length ? zones : null;
  }

  function syncHeaderMotif(tabId) {
    var hdr = document.querySelector('#mobile-app-shell .apk-header-block');
    if (!hdr) return;
    var shell = hdr.closest('.mob-shell');
    var activeTab = tabId || (shell && shell.getAttribute('data-mtab-active')) || 'rincian';
    var isFull = activeTab === 'rincian';
    var zones = measureZones(hdr, isFull);
    var nextSvg = buildMotifSvg(isFull, zones);
    var cur = hdr.querySelector('.hdr-motif');
    if (cur && cur.getAttribute('viewBox') === (isFull ? '0 0 390 280' : '0 0 390 88') && !zones) return;
    if (cur) cur.outerHTML = nextSvg;
    else hdr.insertAdjacentHTML('afterbegin', nextSvg);
  }

  window.rkRenderHeaderMotifSvg = buildMotifSvg;
  window.rkSyncHeaderMotif = syncHeaderMotif;
})();
