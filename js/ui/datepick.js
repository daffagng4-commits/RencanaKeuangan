/**
 * Kalender popover untuk semua input[type=date]: grid bulan, pindah bulan, tombol "Hari ini",
 * menempel di kolom input dan membalik ke atas bila ruang bawah tidak cukup.
 * Nilai tetap ditulis sebagai ISO "YYYY-MM-DD" lewat event input/change, jadi kode lama tidak berubah.
 */
(function () {
  var pop = document.createElement('div'),
    cur = null,
    vy = 0,
    vm = 0;

  pop.className = 'dp';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Pilih tanggal');
  document.body.appendChild(pop);

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }
  function isoOf(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }
  function dim(y, m) {
    return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  }
  function today() {
    return typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10);
  }

  function render() {
    var sel = cur && /^\d{4}-\d{2}-\d{2}$/.test(cur.value) ? cur.value : '',
      min = cur ? cur.getAttribute('min') : null,
      max = cur ? cur.getAttribute('max') : null,
      lead = (new Date(Date.UTC(vy, vm, 1)).getUTCDay() + 6) % 7,
      n = dim(vy, vm),
      d,
      h =
        '<div class="dp-h"><button type="button" data-mv="-1" aria-label="Bulan sebelum">&#8249;</button><b>' +
        MON[vm] +
        ' ' +
        vy +
        '</b><button type="button" data-mv="1" aria-label="Bulan berikut">&#8250;</button></div><div class="dp-g">';
    ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].forEach(function (w) {
      h += '<span class="dp-w">' + w + '</span>';
    });
    for (d = 0; d < lead; d++) h += '<span></span>';
    for (d = 1; d <= n; d++) {
      var v = isoOf(vy, vm, d),
        off = (min && v < min) || (max && v > max);
      h +=
        '<button type="button" class="dp-d' +
        (v === sel ? ' on' : '') +
        (v === today() ? ' td' : '') +
        '" data-d="' +
        v +
        '"' +
        (off ? ' disabled' : '') +
        ' aria-pressed="' +
        (v === sel) +
        '">' +
        d +
        '</button>';
    }
    h += '</div><div class="dp-f"><button type="button" data-d="' + today() + '">Hari ini</button></div>';
    pop.innerHTML = h;
  }

  function place() {
    if (!cur) return;
    var r = cur.getBoundingClientRect(),
      w = pop.offsetWidth,
      h = pop.offsetHeight,
      vw = document.documentElement.clientWidth,
      vh = document.documentElement.clientHeight,
      left = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8)),
      top = r.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 6);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function open(inp) {
    if (inp.disabled || inp.readOnly) return;
    cur = inp;
    var v = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : today();
    vy = +v.slice(0, 4);
    vm = +v.slice(5, 7) - 1;
    render();
    pop.hidden = false;
    place();
  }

  function close() {
    cur = null;
    pop.hidden = true;
  }

  function pick(v) {
    var inp = cur;
    close();
    if (!inp) return;
    if (inp.value !== v) {
      inp.value = v;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
    inp.focus({ preventScroll: true });
  }

  /* Tangkap sebelum input native membuka pemilihnya sendiri. */
  document.addEventListener(
    'pointerdown',
    function (e) {
      var t = e.target,
        inp = t.closest ? t.closest('input[type="date"]') : null;
      if (inp) {
        e.preventDefault();
        if (inp === cur && !pop.hidden) close();
        else open(inp);
        return;
      }
      if (!pop.hidden && !t.closest('.dp')) close();
    },
    true
  );
  document.addEventListener(
    'click',
    function (e) {
      if (e.target.closest && e.target.closest('input[type="date"]')) e.preventDefault();
    },
    true
  );
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mv) {
      vm += +b.dataset.mv;
      if (vm < 0) { vm = 11; vy--; }
      if (vm > 11) { vm = 0; vy++; }
      render();
      place();
      return;
    }
    if (b.dataset.d) pick(b.dataset.d);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) {
      var inp = cur;
      close();
      if (inp) inp.focus({ preventScroll: true });
      return;
    }
    var t = e.target,
      inp = t.closest ? t.closest('input[type="date"]') : null;
    if (inp && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      open(inp);
    }
  });
  window.addEventListener('resize', close);
  window.addEventListener('scroll', function () { if (!pop.hidden) close(); }, true);
})();
