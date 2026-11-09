/**
 * Grafik garis saldo bulanan: 12 titik, crosshair + tooltip saat kursor/fokus di area grafik.
 * o = {id, title, sub, aria, pts:[{m, v, tip}], foot}
 */
function saldoWave(o) {
  var P = o.pts || [];
  if (P.length < 2) return '';
  var W = 720,
    H = 238,
    padL = 44,
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
  var X = function (i) { return padL + (plotW * i) / (P.length - 1); },
    Y = function (v) { return padT + ((hi - v) / (hi - lo)) * plotH; },
    ax = function (v) { return (v < 0 ? '−' : '') + shortP(Math.abs(v)); },
    zero = Y(0),
    line = 'M' + P.map(function (p, i) { return X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' L'),
    area = line + ' L' + X(P.length - 1).toFixed(1) + ' ' + (padT + plotH) + ' L' + padL + ' ' + (padT + plotH) + ' Z',
    slot = plotW / (P.length - 1),
    gid = 'lcg-' + (o.id || 'x');
  var groups = P.map(function (p, i) {
    var x = X(i),
      left = i ? x - slot / 2 : padL,
      right = i < P.length - 1 ? x + slot / 2 : W - padR;
    return (
      '<g class="lc-p"><rect class="lc-hit" x="' + left.toFixed(1) + '" y="' + padT + '" width="' + Math.max(1, right - left).toFixed(1) + '" height="' + plotH + '" fill="transparent" tabindex="0" data-tip="' + esc(p.tip) + '"></rect>' +
      '<line class="lc-v" x1="' + x.toFixed(1) + '" y1="' + padT + '" x2="' + x.toFixed(1) + '" y2="' + (padT + plotH) + '"></line>' +
      '<circle class="lc-d' + (p.v < 0 ? ' neg' : '') + '" cx="' + x.toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="4.5" data-tip="' + esc(p.tip) + '"></circle></g>'
    );
  }).join('');
  var labels = P.map(function (p, i) {
    var a = i === 0 ? 'start' : i === P.length - 1 ? 'end' : 'middle';
    return '<text x="' + X(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + a + '" font-size="8.8" fill="var(--mut)">' + MON[p.m] + '</text>';
  }).join('');
  var yv = [mx, 0, mn],
    seen = {},
    grid = yv.map(function (v) {
      var y = Y(v).toFixed(1);
      if (seen[y]) return '';
      seen[y] = 1;
      return '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--ln)" stroke-width="1" opacity=".55"></line>' +
        '<text x="' + (padL - 6) + '" y="' + (+y + 3) + '" text-anchor="end" font-size="8.6" fill="var(--mut)">' + ax(v) + '</text>';
    }).join('');
  return (
    '<div class="card"><div class="dflex jcsb aic fwrap g8 mb6"><h2 style="margin:0">' + o.title + '</h2>' +
    (o.sub ? '<span class="sub fs12">' + o.sub + '</span>' : '') + '</div>' +
    '<svg class="lc kch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || o.title) + '">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".18"></stop><stop offset="1" stop-color="var(--ac)" stop-opacity="0"></stop></linearGradient></defs>' +
    grid +
    '<path d="' + area + '" fill="url(#' + gid + ')"></path>' +
    '<path d="' + line + '" fill="none" stroke="var(--ac)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>' +
    '<line x1="' + padL + '" y1="' + zero.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + zero.toFixed(1) + '" stroke="var(--ln)" stroke-width="1" stroke-dasharray="3 3" opacity=".8"></line>' +
    groups + labels + '</svg>' +
    (o.foot ? '<div class="sub lc-foot">' + o.foot + '</div>' : '') + '</div>'
  );
}
