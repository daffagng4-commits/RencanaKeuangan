/**
 * Helper DOM: $, pemformat angka saat mengetik, tab, toast Urungkan.
 */

var $ = function (i) {
  return document.getElementById(i);
};

/** Beri titik ribuan saat mengetik angka (kursor dijaga). */
function fmtLive(el) {
  var v = el.value;
  if (!v || /[^\d.,\s]/.test(v)) return;
  var p = el.selectionStart,
    n = v.slice(0, p).replace(/\D/g, '').length,
    d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, ''),
    f = d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = f;
  var i = 0,
    c = 0;
  while (i < f.length && c < n) {
    if (/\d/.test(f[i])) c++;
    i++;
  }
  try {
    el.setSelectionRange(i, i);
  } catch (e) {}
}

/** Tampilkan tab tertentu (rincian | jadwal | item). */
function tab(t) {
  curTab = t;
  if (t === 'sim') renderSim();
  document.querySelectorAll('nav button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.t === t);
  });
  ['rincian', 'jadwal', 'item', 'kas', 'sim'].forEach(function (x) {
    $('v-' + x).hidden = x !== t;
  });
  $('yb').style.display = '';
}

/** Tampilkan pesan singkat; bila ada `undo`, muncul tombol Urungkan selama 10 detik. */
function toast(msg, undo) {
  var t = $('tt');
  $('ttm').textContent = msg;
  $('ttu').hidden = !undo;
  t._u = undo || null;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(
    function () {
      t.hidden = true;
    },
    undo ? 10000 : 4000,
  );
}

/** Pasang event listener halaman ini. */
function bindDom() {
  document.querySelectorAll('nav button').forEach(function (b) {
    b.onclick = function () {
      tab(b.dataset.t);
    };
  });
  $('ttu').onclick = function () {
    var t = $('tt');
    if (t._u) {
      var f = t._u;
      t._u = null;
      t.hidden = true;
      f();
    }
  };
  var _mDown = null;
  document.addEventListener('mousedown', function (e) {
    _mDown = e.target;
  });
  document.addEventListener('click', function (e) {
    if (
      _mDown === e.target &&
      e.target &&
      e.target.classList &&
      e.target.classList.contains('modal')
    ) {
      var c = e.target.querySelector(
        'button.c, #pcl, #cl, #rmc, #kpc, #shx, #lgc, #skc, #xlc, [data-cf="later"]'
      );
      if (c) c.click();
      else e.target.hidden = true;
    }
    _mDown = null;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var om = document.querySelector('.modal:not([hidden])');
      if (om) {
        var c = om.querySelector(
          'button.c, #pcl, #cl, #rmc, #kpc, #shx, #lgc, #skc, #xlc, #qkc, [data-cf="later"]'
        );
        if (c) c.click();
        else om.hidden = true;
      }
    }
  });
  bindQuickKas();
}

/** Tulis status simpan di header. */
function setSaveStatus(ok) {
  var s = $('status'), vi = $('ver-info');
  if (ok) {
    if (s) { s.style.display = 'none'; s.textContent = ''; }
    if (vi) vi.title = 'Tersimpan otomatis ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } else {
    if (s) {
      s.style.display = 'block';
      s.style.color = 'var(--wr)';
      s.textContent = 'Penyimpanan browser tidak tersedia. Gunakan Cadangan agar data aman.';
    }
  }
}
