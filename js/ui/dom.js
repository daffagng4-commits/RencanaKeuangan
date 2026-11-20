/**
 * Helper DOM: $, tab, toast Urungkan.
 * Helper pemformat angka (fmtLive) berada di js/ui/num-input.js.
 */

var $ = function (i) {
  var el = document.getElementById(i);
  if (!el && i === 'm-fab-add') return document.getElementById('m-yr-btn-center');
  return el;
};

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

/** Tampilkan tab tertentu (rincian | kas | jadwal | item | sim | rebalance | ibkr). */
function tab(t) {
  var prev = typeof curTab !== 'undefined' ? curTab : '';
  curTab = t;
  if (typeof JADWAL_PINNED_IDS !== 'undefined' && prev !== t) {
    JADWAL_PINNED_IDS = null;
  }
  document.querySelectorAll('#browser-shell .nav-btn[data-tab], #browser-shell nav button[data-t]').forEach(function (b) {
    var bt = b.dataset.tab || b.dataset.t;
    var on = bt === t && (typeof mode === 'undefined' || mode === 'rencana');
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('#browser-shell .mob-nav-btn[data-tab]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === t && (typeof mode === 'undefined' || mode === 'rencana'));
  });
  var mbMore = $('btn-mobile-more');
  if (mbMore) mbMore.classList.toggle('active', t === 'sim' || (typeof mode !== 'undefined' && mode === 'trip'));
  ['rincian', 'kas', 'jadwal', 'item', 'sim', 'trip'].forEach(function (x) {
    var sec = $('tab-' + x) || $('v-' + x);
    if (sec) {
      var isAct = x === t && (typeof mode === 'undefined' || mode === 'rencana');
      sec.classList.toggle('active', isAct);
      sec.hidden = !isAct;
    }
  });
  ['rebalance', 'ibkr'].forEach(function (x) {
    var sec = $('v-' + x);
    if (sec) {
      var isAct = x === t;
      sec.classList.toggle('active', isAct);
      sec.hidden = !isAct;
      if (isAct) {
        var ifr = sec.querySelector('iframe[data-src]');
        if (ifr && !ifr.getAttribute('src')) ifr.setAttribute('src', ifr.getAttribute('data-src'));
      }
    }
  });
  if (t === 'sim' && typeof renderSim === 'function') renderSim();
  if (t === 'rincian' && typeof renderRincianCharts === 'function') renderRincianCharts();
  if (typeof renderShell === 'function') renderShell();
  navPill();
  if ($('yb')) $('yb').style.display = '';
  if (typeof syncNav === 'function') syncNav();
  if (typeof rkSyncSegPills === 'function') rkSyncSegPills($('browser-shell'), false);
  if (prev !== t && typeof rkScheduleEntrance === 'function') rkScheduleEntrance('browser', t);
}

/** Tampilkan pesan singkat; bila ada `undo`, muncul tombol Urungkan selama 10 detik. */
function toast(msg, undo) {
  if (typeof getShellMode === 'function' && getShellMode() === 'mobile-app' && typeof showMobToast === 'function') {
    showMobToast(msg, undo);
  }
  var tb = $('toast-box');
  if (tb) tb.classList.remove('show');
  var t = $('tt');
  if (!t || !$('ttm') || !$('ttu')) return;
  $('ttm').textContent = msg;
  $('ttu').hidden = !undo;
  t._u = undo || null;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(
    function () {
      t.hidden = true;
    },
    undo ? 10000 : 2000,
  );
}

/** Dialog konfirmasi terpadu (#13 Desktop & APK). `onYes` dipanggil hanya bila pengguna menekan tombol aksi. */
function askConfirm(msg, onYes, yesLabel, title) {
  var old = document.querySelector('.cfm');
  if (old) {
    if (old._closeT) clearTimeout(old._closeT);
    if (old._escFn) document.removeEventListener('keydown', old._escFn);
    old.remove();
  }
  var m = document.createElement('div');
  m.className = 'modal cfm';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.innerHTML =
    '<div class="card"><h2>' + (title || 'Konfirmasi hapus') + '</h2><div class="sub mb10">' + msg + '</div>' +
    '<div class="row2"><button type="button" class="c" data-cf-n>Batal</button>' +
    '<button type="button" class="d" data-cf-y>' + (yesLabel || 'Ya, hapus') + '</button></div></div>';
  document.body.appendChild(m);
  var closed = false;
  var escFn = function (e) {
    if (e.key === 'Escape') closeConfirm(false);
  };
  m._escFn = escFn;
  document.addEventListener('keydown', escFn);

  function closeConfirm(confirmed) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', escFn);
    var reduced = typeof rkIsReducedMotion === 'function' && rkIsReducedMotion();
    var isMob = typeof getShellMode === 'function' && getShellMode() === 'mobile-app';
    var closeMs = isMob ? 140 : 150;
    if (!reduced && m.offsetWidth > 0) {
      m.classList.remove('open');
      m.classList.add('is-closing');
      m.setAttribute('aria-hidden', 'true');
      m._closeT = setTimeout(function () {
        if (m.parentNode) m.remove();
      }, closeMs);
    } else {
      m.remove();
    }
    if (confirmed && typeof onYes === 'function') onYes();
  }

  m.onclick = function (e) {
    if (e.target === m || e.target.closest('[data-cf-n]')) closeConfirm(false);
    else if (e.target.closest('[data-cf-y]')) closeConfirm(true);
  };

  var reducedInit = typeof rkIsReducedMotion === 'function' && rkIsReducedMotion();
  if (!reducedInit && m.offsetWidth > 0 && typeof requestAnimationFrame === 'function') {
    void m.offsetWidth;
    requestAnimationFrame(function () {
      if (!closed) m.classList.add('open');
    });
  } else {
    m.classList.add('open');
  }
  var cancelBtn = m.querySelector('[data-cf-n]');
  if (cancelBtn) cancelBtn.focus();
}

/** Pasang event listener halaman ini. */
function bindDom() {
  document.querySelectorAll('#browser-shell .nav-btn[data-tab], #browser-shell .mob-nav-btn[data-tab], nav button[data-t]').forEach(function (b) {
    b.onclick = function () {
      var target = b.dataset.tab || b.dataset.t;
      if (typeof navGo === 'function') navGo(target);
      else tab(target);
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
  function closeBackdropEl(el) {
    if (!el) return;
    if (typeof brCloseModal === 'function' && el.id) {
      brCloseModal(el.id);
      return;
    }
    el.classList.remove('open');
    if (el.id === 'lg' || el.id === 'cf' || el.classList.contains('modal')) el.hidden = true;
  }
  document.addEventListener('click', function (e) {
    if (
      _mDown === e.target &&
      e.target &&
      e.target.classList &&
      (e.target.classList.contains('modal') || e.target.classList.contains('modal-backdrop'))
    ) {
      var c = e.target.querySelector('#lgc, #yr-close, #qtx-close, #kpf-close, #rep-m-cl, [data-cf="later"], [data-close-modal]');
      if (c) c.click();
      else closeBackdropEl(e.target);
    }
    _mDown = null;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var om = document.querySelector('#browser-shell .modal-backdrop.open, .modal:not([hidden]), #lg:not([hidden]), #cf:not([hidden])');
      if (om) {
        var c = om.querySelector('#lgc, #yr-close, #qtx-close, #kpf-close, #rep-m-cl, [data-cf="later"], [data-close-modal]');
        if (c) c.click();
        else closeBackdropEl(om);
      }
    }
  });
  if (typeof bindQuickKas === 'function') bindQuickKas();
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
