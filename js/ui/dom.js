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

/** Geser pil penanda tab (rail sidebar) ke tombol aktif; lebar rail saja. */
function navPill() {
  var nav = document.querySelector('header nav'),
    pill = nav && nav.querySelector('.nav-pill'),
    b = nav && nav.querySelector('button[aria-selected="true"]');
  if (!pill || !b || !nav.clientWidth) return;
  pill.style.clipPath =
    'inset(' + b.offsetTop + 'px ' + (nav.clientWidth - b.offsetLeft - b.offsetWidth) + 'px ' +
    (nav.clientHeight - b.offsetTop - b.offsetHeight) + 'px ' + b.offsetLeft + 'px round 16px)';
}

/** Tampilkan tab tertentu (rincian | jadwal | item). */
function tab(t) {
  curTab = t;
  if (t === 'sim') renderSim();
  document.querySelectorAll('nav button[data-t]').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.t === t);
  });
  ['rincian', 'jadwal', 'item', 'kas', 'sim'].forEach(function (x) {
    $('v-' + x).hidden = x !== t;
  });
  var sec = $('v-' + t);
  if (sec) {
    sec.classList.remove('page-in');
    void sec.offsetWidth;
    sec.classList.add('page-in');
  }
  navPill();
  $('yb').style.display = '';
  if (typeof rkHeadSync === 'function') rkHeadSync();
  if (typeof syncNav === 'function') syncNav();
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

/** Dialog konfirmasi. `onYes` dipanggil hanya bila pengguna menekan tombol aksi. */
function askConfirm(msg, onYes, yesLabel, title) {
  var old = document.querySelector('.cfm');
  if (old) old.remove();
  var m = document.createElement('div');
  m.className = 'modal cfm';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.innerHTML =
    '<div class="card"><h2>' + (title || 'Konfirmasi hapus') + '</h2><div class="sub mb10">' + msg + '</div>' +
    '<div class="row2"><button type="button" class="d" data-cf-y>' + (yesLabel || 'Ya, hapus') + '</button>' +
    '<button type="button" class="c" data-cf-n>Batal</button></div></div>';
  document.body.appendChild(m);
  m.onclick = function (e) {
    if (e.target === m || e.target.closest('[data-cf-n]')) m.remove();
    else if (e.target.closest('[data-cf-y]')) {
      m.remove();
      onYes();
    }
  };
  m.querySelector('[data-cf-n]').focus();
}

/** Pasang event listener halaman ini. */
function bindDom() {
  document.querySelectorAll('nav button[data-t]').forEach(function (b) {
    b.onclick = function () {
      if (typeof navGo === 'function') navGo(b.dataset.t);
      else tab(b.dataset.t);
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
