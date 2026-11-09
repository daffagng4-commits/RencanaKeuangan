/**
 * Tooltip ringan untuk grafik dan batang: elemen ber-atribut data-tip menampilkan teksnya saat disorot (mouse),
 * difokus (keyboard), atau diketuk (layar sentuh). Saat Mode Privasi aktif, nominal rupiah pada tooltip disamarkan.
 */
function bindTip() {
  var tip = document.createElement('div'),
    cur = null;
  tip.id = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);

  function hide() {
    tip.hidden = true;
    cur = null;
  }
  function show(el) {
    var txt = el.getAttribute('data-tip') || '';
    if (document.body.classList.contains('privacy-mode')) txt = txt.replace(/Rp\s?[-\u2212]?[\d.]+/g, 'Rp \u2022\u2022\u2022\u2022');
    tip.textContent = txt;
    tip.hidden = false;
    var r = el.getBoundingClientRect(),
      w = tip.offsetWidth,
      h = tip.offsetHeight,
      left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, (window.innerWidth || 600) - w - 8)),
      top = r.top - h - 8;
    if (top < 8) top = r.bottom + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    cur = el;
  }
  function target(e) {
    return e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  }
  document.addEventListener('pointerover', function (e) {
    var el = target(e);
    if (el && e.pointerType !== 'touch') show(el);
  });
  document.addEventListener('pointerout', function (e) {
    var el = target(e);
    if (el && el === cur && e.pointerType !== 'touch') hide();
  });
  document.addEventListener('focusin', function (e) {
    var el = target(e);
    if (el) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', function (e) {
    var el = target(e);
    if (el && !(cur === el && !tip.hidden)) show(el);
    else hide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener('scroll', hide, true);
}
