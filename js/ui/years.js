/**
 * Data per tahun: tombol tahun, pindah tahun, hapus tahun.
 */

function renderYears() {
  var ks = Object.keys(ALL.data)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    });
  var sum = $('yr-sum');
  if (sum) sum.textContent = S.year + ' · ' + MON[smEff()] + ' · ' + rp(+S.saldo || 0);
  $('yb').innerHTML =
    ks
      .map(function (k) {
        return (
          '<button class="yp' +
          (k === S.year ? ' on' : '') +
          '" data-y="' +
          k +
          '" aria-pressed="' +
          (k === S.year) +
          '">' +
          k +
          '</button>'
        );
      })
      .join('') +
    '<button class="g d" data-dy="1" title="Hapus semua data tahun ' +
    S.year +
    '">Hapus</button>';
}

/** Pindah ke tahun v (dibuat kosong bila belum ada). */
function switchYear(v) {
  save();
  var n = ALL.data[v];
  if (!n) n = ALL.data[v] = { year: v, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  S = n;
  ALL.year = v;
  save();
  syncUI();
}

/** Hapus data tahun aktif (setelah konfirmasi dua kali); pindah ke tahun terdekat. Bisa diurungkan. */
function delYear() {
  var sn = snap('Sebelum menghapus tahun ' + S.year),
    y = S.year,
    ks = Object.keys(ALL.data)
      .map(Number)
      .filter(function (k) {
        return k !== y;
      })
      .sort(function (a, b) {
        return a - b;
      }),
    n;
  delete ALL.data[y];
  if (ks.length) {
    n = ks
      .filter(function (k) {
        return k < y;
      })
      .pop();
    if (n == null) n = ks[0];
  } else {
    n = new Date().getFullYear();
    ALL.data[n] = { year: n, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  }
  S = ALL.data[n];
  ALL.year = n;
  save();
  syncUI();
  $('status').textContent = 'Tahun ' + y + ' dihapus.';
  toast('Tahun ' + y + ' dihapus.', function () {
    restoreSnap(sn.t);
  });
}

/** Pasang event listener halaman ini. */
function bindYears() {
  for (var y = 2026; y <= 2032; y++) {
    var o = document.createElement('option');
    o.value = o.textContent = y;
    $('yl').appendChild(o);
  }
  $('year').value = S.year;
  $('year').onchange = function () {
    var v = parseInt(this.value, 10);
    if (!(v >= 1900 && v <= 2200)) {
      this.value = S.year;
      return;
    }
    switchYear(v);
  };
  $('yb').onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.y) {
      switchYear(+b.dataset.y);
      return;
    }
    if (b.dataset.dy) {
      var yy = S.year;
      askConfirm('Hapus tahun <b>' + yy + '</b> beserta ' + S.items.length + ' item dan status pembayarannya?', delYear, 'Ya, hapus tahun');
    }
  };
  var pop = $('yr-pop'),
    btn = $('yr-btn'),
    panel = $('yr-panel');
  function setOpen(v) {
    if (!panel || !btn) return;
    panel.hidden = !v;
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) setTimeout(function () { $('year').focus(); }, 0);
  }
  if (btn && panel) {
    btn.onclick = function (e) {
      e.stopPropagation();
      setOpen(panel.hidden);
    };
    var done = $('yr-done');
    if (done) done.onclick = function () {
      save();
      setOpen(false);
      btn.focus();
    };
    var close = $('yr-close');
    if (close) close.onclick = function () {
      setOpen(false);
      btn.focus();
    };
    panel.onclick = function (e) {
      if (e.target === panel) setOpen(false);
    };
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !pop.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        btn.focus();
      }
    });
  }
}
