/** Tema: satu tombol di topbar (dekat Privasi/Notifikasi) bergantian kelima tema. Diingat di perangkat. */
var THEME_NAME = { auto: 'Otomatis', light: 'Terang', dark: 'Gelap', bw: 'Hitam-putih', bwd: 'Hitam-putih gelap' },
  THEME_CYCLE = ['auto', 'light', 'dark', 'bw', 'bwd'],
  THEME_ICON = {
    auto: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    light: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    bw: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    bwd: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'
  };

/** Tema yang sedang aktif. */
function themeCur() {
  var t = document.documentElement.getAttribute('data-theme');
  return THEME_NAME[t] ? t : 'auto';
}

/** Terapkan dan simpan tema, lalu perbarui tombol dan menu. Bila didukung, ganti tema lewat
 *  View Transition: lingkaran membesar dari tombol yang diketuk (cara Covry), 0,45 dtk. */
function setTheme(n) {
  var de = document.documentElement,
    apply = function () {
      if (n === 'auto') de.removeAttribute('data-theme');
      else de.setAttribute('data-theme', n);
      try {
        localStorage.setItem('rk-theme', n);
      } catch (x) {}
      themeShow();
    };
  if (!document.startViewTransition || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches))
    return apply();
  var b = de.querySelector('#thm'),
    r = b ? b.getBoundingClientRect() : null,
    x = r && r.width ? r.left + r.width / 2 : innerWidth - 40,
    y = r && r.height ? r.top + r.height / 2 : 36;
  de.style.setProperty('--vtx', x + 'px');
  de.style.setProperty('--vty', y + 'px');
  de.style.setProperty('--vtr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
  document.startViewTransition(apply);
}

/** Sinkronkan tombol tema dan pilihan tema di menu dengan tema aktif. */
function themeShow() {
  var btn = $('thm'),
    cur = themeCur(),
    label = 'Tema: ' + THEME_NAME[cur],
    txtEl = $('thm-txt'),
    ic = btn.querySelector('svg');
  if (txtEl) txtEl.textContent = label;
  else btn.textContent = label;
  if (ic) ic.innerHTML = THEME_ICON[cur];
  btn.title = label + ' (ketuk untuk ganti)';
  btn.setAttribute('aria-label', btn.title);
  Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (b) {
    var on = b.dataset.themeSet === cur;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function bindUi() {
  $('thm').onclick = function () {
    // dari Hitam-putih (indeks -1) kembali ke Otomatis
    setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(themeCur()) + 1) % THEME_CYCLE.length]);
  };
  themeShow();
  gdApply();
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-gd]');
    if (!g) return;
    try {
      localStorage.setItem('rk-gd-' + g.dataset.gd, g.nextElementSibling.hidden ? '1' : '0');
    } catch (x) {}
    gdApply(g.parentNode);
  });
}

/** Panduan terbuka? Bila belum pernah dipilih: tampil di layar lebar, tersembunyi di HP. */
function gdOpen(k) {
  var v = null;
  try {
    v = localStorage.getItem('rk-gd-' + k);
  } catch (e) {}
  return v ? v === '1' : (typeof matchMedia !== 'undefined' ? !matchMedia('(max-width:640px)').matches : true);
}
function gdApply(root) {
  (root || document).querySelectorAll('[data-gd]').forEach(function (b) {
    var o = gdOpen(b.dataset.gd);
    b.nextElementSibling.hidden = !o;
    b.setAttribute('aria-expanded', o);
    b.textContent = o ? 'ⓘ Sembunyikan panduan  ▲' : 'ⓘ Tampilkan panduan  ▼';
  });
}
