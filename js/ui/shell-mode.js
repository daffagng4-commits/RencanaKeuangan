/**
 * Router Mode Tampilan (Browser Mode vs Mode Aplikasi HP / PWA).
 * Kedua mode berbagi state `ALL`, `S`, logika `js/core/*`, dan sinkronisasi Supabase yang sama.
 */

var SHELL_KEY = 'rk-shell-mode';

/** Deteksi mode tampilan awal: URL (?mode=app|browser) -> localStorage -> PWA standalone -> default 'browser'. */
function detectShellMode(searchStr) {
  var q =
    searchStr != null
      ? String(searchStr)
      : typeof location !== 'undefined' && location.search
        ? location.search
        : '';
  if (q) {
    var m = q.match(/[?&]mode=([^&#]+)/i);
    if (m && m[1]) {
      var val;
      try {
        val = decodeURIComponent(m[1]).toLowerCase();
      } catch (e) {
        val = String(m[1]).toLowerCase();
      }
      if (val === 'app' || val === 'mobile' || val === 'mobile-app') return 'mobile-app';
      if (val === 'browser' || val === 'desktop') return 'browser';
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      var saved = localStorage.getItem(SHELL_KEY);
      if (saved === 'mobile-app' || saved === 'browser') return saved;
    }
  } catch (e) {}
  try {
    if (
      (typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone === true)
    ) {
      return 'mobile-app';
    }
  } catch (e) {}
  return 'browser';
}

/** Ambil mode shell yang aktif saat ini ('browser' | 'mobile-app'). */
function getShellMode() {
  if (typeof document !== 'undefined' && document.body) {
    var cur = document.body.getAttribute('data-shell');
    if (cur === 'mobile-app' || cur === 'browser') return cur;
  }
  return detectShellMode();
}

/** Perbarui label/atribut tombol pemindah mode bila tersedia di DOM. */
function syncShellSwitchUI(m) {
  if (typeof document === 'undefined') return;
  var btn = typeof $ === 'function' ? $('alat-shell-mode') : document.getElementById('alat-shell-mode');
  if (!btn) return;
  var isApp = m === 'mobile-app';
  btn.setAttribute('data-shell-switch', isApp ? 'browser' : 'mobile-app');
  var span = btn.querySelector('span');
  if (span) span.textContent = isApp ? 'Mode Browser' : 'Mode Aplikasi HP';
}

/** Terapkan mode shell ('browser' | 'mobile-app'), opsional simpan preferensi, dan render ulang bila state siap. */
function setShellMode(mode, persist) {
  var m = mode === 'mobile-app' || mode === 'app' || mode === 'mobile' ? 'mobile-app' : 'browser';
  if (typeof document !== 'undefined') {
    if (document.body) document.body.setAttribute('data-shell', m);
    if (document.documentElement) document.documentElement.setAttribute('data-shell', m);
  }
  if (persist !== false) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(SHELL_KEY, m);
    } catch (e) {}
  }
  syncShellSwitchUI(m);
  if (m === 'browser' && typeof unmountMobileShell === 'function') {
    unmountMobileShell();
  }
  if (typeof renderAll === 'function' && typeof S !== 'undefined' && S) {
    renderAll();
  }
  return m;
}

/** Tukar langsung antara 'browser' dan 'mobile-app'. */
function toggleShellMode() {
  return setShellMode(getShellMode() === 'mobile-app' ? 'browser' : 'mobile-app', true);
}

/** Pasang mode awal serta listener delegasi untuk tombol `[data-shell-switch]`. */
function bindShellMode() {
  setShellMode(detectShellMode(), false);
  if (typeof document === 'undefined' || document._rkShellBound) return;
  document._rkShellBound = true;
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-shell-switch]') : null;
    if (!btn) return;
    var target = btn.getAttribute('data-shell-switch');
    if (target === 'toggle') toggleShellMode();
    else setShellMode(target, true);
    var am = typeof $ === 'function' ? $('alat-menu') : document.getElementById('alat-menu');
    if (am) am.hidden = true;
    var ab = typeof $ === 'function' ? $('alat-btn') : document.getElementById('alat-btn');
    if (ab) ab.setAttribute('aria-expanded', 'false');
  });
}
