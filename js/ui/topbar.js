/**
 * Aksi topbar (Mode Privasi, status Notifikasi) dan perbaikan aksesibilitas dasar (dialog).
 */

/** Mode Privasi: kaburkan nominal (terpadu untuk Desktop & APK). */
function rkApplyPrivacyMode(on) {
  var next = !!on;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('privacy-mode', next);
    document.body.classList.toggle('privacy-on', next);
  }
  var EYE = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    EYE_OFF = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  var btn = typeof document !== 'undefined' ? document.getElementById('btn-privacy') : null;
  if (btn) {
    btn.classList.toggle('on', next);
    btn.setAttribute('aria-pressed', next ? 'true' : 'false');
    btn.title = next ? 'Mode Privasi: AKTIF (ketuk untuk menampilkan nominal)' : 'Mode Privasi: mati (ketuk untuk mengaburkan nominal)';
    btn.setAttribute('aria-label', btn.title);
    var morph = btn.querySelector('.rk-morph-icon');
    if (morph) {
      morph.classList.toggle('is-morphed', next);
    } else {
      var ic = btn.querySelector('svg');
      if (ic) ic.innerHTML = next ? EYE_OFF : EYE;
    }
  }
  if (next && typeof rkCancelAllCountUps === 'function') rkCancelAllCountUps();
  if (typeof syncMobileCloudUI === 'function') syncMobileCloudUI();
  try { localStorage.setItem('rk-privacy', next ? '1' : '0'); } catch (e) {}
  return next;
}

/** Ayun lonceng notifikasi (#16 / #16.1). */
function rkTriggerBell(btn) {
  if (!btn || (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion())) return;
  btn.classList.remove('rk-bell-ringing');
  void btn.offsetWidth;
  btn.classList.add('rk-bell-ringing');
  clearTimeout(btn._rkBellT);
  var done = function () { btn.classList.remove('rk-bell-ringing'); };
  btn.addEventListener('animationend', done, { once: true });
  btn._rkBellT = setTimeout(done, 540);
}

/** Pop spring badge notifikasi (#16 / #16.1). */
function rkTriggerBadgePop(dotEl) {
  if (!dotEl || (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion())) return;
  dotEl.classList.remove('rk-badge-pop');
  void dotEl.offsetWidth;
  dotEl.classList.add('rk-badge-pop');
  clearTimeout(dotEl._rkPopT);
  var done = function () { dotEl.classList.remove('rk-badge-pop'); };
  dotEl.addEventListener('animationend', done, { once: true });
  dotEl._rkPopT = setTimeout(done, 280);
}

function bindPrivacy() {
  var btn = document.getElementById('btn-privacy');
  var on = false;
  try { on = localStorage.getItem('rk-privacy') === '1'; } catch (e) {}
  rkApplyPrivacyMode(on);
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = !!(document.body && document.body.classList.contains('privacy-mode'));
      rkApplyPrivacyMode(!cur);
    });
  }
  syncNotifBtn();
}

/** Sinkronkan keadaan aktif tombol notifikasi dengan status buka/tutup popover (Desktop & APK). */
function rkSyncNotifOpenUI() {
  if (typeof document === 'undefined') return;
  var dPop = document.getElementById('notif-popover'),
    dBtn = document.getElementById('btn-notif'),
    dOpen = !!(dPop && dPop.classList.contains('open'));
  if (dBtn) {
    dBtn.classList.toggle('on', dOpen);
    dBtn.classList.toggle('active', dOpen);
    dBtn.setAttribute('aria-expanded', dOpen ? 'true' : 'false');
  }
  var mPop = document.getElementById('m-notif-popover'),
    mBtn = document.getElementById('m-btn-notif'),
    mOpen = !!(mPop && mPop.classList.contains('open'));
  if (mBtn) {
    mBtn.classList.toggle('on', mOpen);
    mBtn.classList.toggle('active', mOpen);
    mBtn.setAttribute('aria-expanded', mOpen ? 'true' : 'false');
  }
}

/** Label & aksesibilitas tombol notifikasi (keadaan aktif .on mengikuti status popover). */
function syncNotifBtn() {
  var hasN = typeof Notification !== 'undefined' && 'Notification' in window && !!Notification;
  var p = hasN ? Notification.permission : 'default';
  var isOn = p === 'granted' && !(typeof rkIsNotifReset === 'function' && rkIsNotifReset());
  var b = document.getElementById('btn-notif');
  if (b && hasN) {
    b.title = isOn ? 'Pengingat tagihan aktif (ketuk untuk periksa sekarang)'
      : p === 'denied' ? 'Notifikasi diblokir di browser — ubah di setelan situs'
      : 'Aktifkan pengingat notifikasi tagihan';
    b.setAttribute('aria-label', b.title);
  }
  rkSyncNotifOpenUI();
  var dp = document.getElementById('desk-push-perm');
  if (dp && hasN) {
    dp.textContent = isOn ? '✓ Notif OS Aktif' : p === 'denied' ? 'Notif OS Diblokir' : 'Aktifkan Notif OS';
    dp.classList.toggle('btn-emerald', isOn);
    dp.classList.toggle('btn-secondary', !isOn);
  }
}

/** Beri nama pada setiap dialog (dari judul h2-nya) supaya terbaca oleh pembaca layar. */
function bindA11y() {
  var n = 0;
  document.querySelectorAll('.modal').forEach(function (m) {
    var h2 = m.querySelector('h2');
    if (!h2) return;
    if (!h2.id) h2.id = 'mh-' + (m.id || ++n);
    m.setAttribute('aria-labelledby', h2.id);
  });
}

/** Kapsul topbar: chevron sembunyikan tombol Privasi/Notifikasi/Tema, sisakan Akun + "+". Pilihan diingat. */
function bindTopbarMore() {
  var box = document.querySelector('.topbar-actions'),
    b = document.getElementById('tb-more');
  if (!box || !b) return;
  function set(min) {
    box.classList.toggle('min', min);
    b.setAttribute('aria-expanded', min ? 'false' : 'true');
    var t = min ? 'Tampilkan tombol lain' : 'Sembunyikan tombol lain';
    b.title = t;
    b.setAttribute('aria-label', t);
    try { localStorage.setItem('rk-tb-min', min ? '1' : '0'); } catch (e) {}
  }
  var v = null;
  try { v = localStorage.getItem('rk-tb-min'); } catch (e) {}
  set(v ? v === '1' : window.innerWidth < 700);
  b.onclick = function () { set(!box.classList.contains('min')); };
}
