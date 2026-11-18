/** Tema: bergantian antara Terang dan Gelap saja. Diingat di perangkat. */
var THEME_NAME = { light: 'Terang', dark: 'Gelap' },
  THEME_CYCLE = ['light', 'dark'],
  THEME_ICON = {
    light: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  };

/** Tema yang sedang aktif (hanya light atau dark). */
function themeCur() {
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || t === 'bwd' ? 'dark' : 'light';
}

/** Terapkan dan simpan tema (hanya Terang / Gelap), lalu perbarui tombol dan menu. */
function setTheme(n) {
  var norm = n === 'dark' || n === 'bwd' ? 'dark' : 'light';
  var de = document.documentElement,
    privActive = !!(document.body && (document.body.classList.contains('privacy-mode') || document.body.classList.contains('privacy-on'))),
    apply = function () {
      if (privActive && document.body) {
        document.body.classList.add('privacy-mode', 'privacy-on');
      }
      de.setAttribute('data-theme', norm);
      try {
        localStorage.setItem('rk-theme', norm);
      } catch (x) {}
      themeShow();
      if (typeof renderMobMetaMenus === 'function') renderMobMetaMenus();
    };
  if (privActive && typeof rkCancelAllCountUps === 'function') rkCancelAllCountUps();
  var reduced = (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ||
    (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduced) return apply();
  if (!document.startViewTransition) {
    de.classList.add('rk-theme-fallback');
    apply();
    clearTimeout(window._rkThmFbT);
    window._rkThmFbT = setTimeout(function () {
      de.classList.remove('rk-theme-fallback');
    }, 340);
    return;
  }
  var isApk = (typeof getShellMode === 'function' ? getShellMode() === 'mobile-app' : (document.body && document.body.getAttribute('data-shell') === 'mobile-app'));
  de.classList.remove('rk-vt-desktop', 'rk-vt-apk');
  if (isApk) {
    de.classList.add('rk-vt-apk');
  } else {
    var b = de.querySelector('#thm'),
      r = b ? b.getBoundingClientRect() : null;
    if (!r || !r.width) {
      var ab = de.querySelector('#alat-btn');
      r = ab ? ab.getBoundingClientRect() : r;
    }
    var x = r && r.width ? r.left + r.width / 2 : innerWidth - 40,
      y = r && r.height ? r.top + r.height / 2 : 36;
    de.style.setProperty('--vtx', x + 'px');
    de.style.setProperty('--vty', y + 'px');
    de.style.setProperty('--vtr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    de.classList.add('rk-vt-desktop');
  }
  var cleanVt = function () { de.classList.remove('rk-vt-desktop', 'rk-vt-apk'); };
  clearTimeout(window._rkVtT);
  window._rkVtT = setTimeout(cleanVt, isApk ? 420 : 580);
  var vt = document.startViewTransition(apply);
  if (vt && vt.finished && typeof vt.finished.then === 'function') {
    vt.finished.then(cleanVt, cleanVt);
  }
}

/** Sinkronkan tombol tema dan pilihan tema di menu dengan tema aktif. */
function themeShow() {
  var btn = $('thm'),
    cur = themeCur(),
    label = 'Tema: ' + THEME_NAME[cur],
    txtEl = $('thm-txt'),
    mobEl = $('mob-thm-lbl'),
    morph = $('thm-morph') || (btn && btn.querySelector('.rk-morph-icon')),
    ic = btn && !morph ? btn.querySelector('svg') : null;
  if (txtEl) txtEl.textContent = THEME_NAME[cur];
  else if (btn) btn.textContent = label;
  if (mobEl) mobEl.textContent = THEME_NAME[cur];
  if (morph) morph.classList.toggle('is-morphed', cur === 'dark');
  else if (ic) ic.innerHTML = THEME_ICON[cur];
  if (btn) {
    btn.title = label + ' (ketuk untuk ganti)';
    btn.setAttribute('aria-label', btn.title);
  }
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
