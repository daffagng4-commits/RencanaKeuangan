/**
 * Aksi topbar (Mode Privasi, status Notifikasi) dan perbaikan aksesibilitas dasar (dialog).
 */

/** Mode Privasi: kaburkan nominal. Tombol menyala bila aktif; pilihan diingat di perangkat. */
function bindPrivacy() {
  var btn = document.getElementById('btn-privacy');
  if (!btn) return;
  var EYE = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    EYE_OFF = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  function apply(on) {
    document.body.classList.toggle('privacy-mode', on);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Mode Privasi: AKTIF (ketuk untuk menampilkan nominal)' : 'Mode Privasi: mati (ketuk untuk mengaburkan nominal)';
    btn.setAttribute('aria-label', btn.title);
    var ic = btn.querySelector('svg');
    if (ic) ic.innerHTML = on ? EYE_OFF : EYE;
  }
  var on = false;
  try { on = localStorage.getItem('rk-privacy') === '1'; } catch (e) {}
  apply(on);
  btn.addEventListener('click', function () {
    on = !on;
    apply(on);
    try { localStorage.setItem('rk-privacy', on ? '1' : '0'); } catch (e) {}
  });
  syncNotifBtn();
}

/** Tombol notifikasi menyala bila izin sudah diberikan. */
function syncNotifBtn() {
  var b = document.getElementById('btn-notif');
  if (!b || !('Notification' in window)) return;
  var p = Notification.permission;
  b.classList.toggle('on', p === 'granted');
  b.title = p === 'granted' ? 'Pengingat tagihan aktif (ketuk untuk periksa sekarang)'
    : p === 'denied' ? 'Notifikasi diblokir di browser — ubah di setelan situs'
    : 'Aktifkan pengingat notifikasi tagihan';
  b.setAttribute('aria-label', b.title);
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
