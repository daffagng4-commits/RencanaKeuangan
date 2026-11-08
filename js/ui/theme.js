/** Tombol tema: tiap diketuk berganti Otomatis > Terang > Gelap > Hitam-putih > Hitam-putih gelap. Diingat di perangkat. */
function bindUi() {
  var de = document.documentElement,
    T = ['auto', 'light', 'dark', 'bw', 'bwd'],
    N = { auto: 'Otomatis', light: 'Terang', dark: 'Gelap', bw: 'Hitam-putih', bwd: 'Hitam-putih gelap' },
    btn = $('thm');
  function cur() {
    var t = de.getAttribute('data-theme');
    return T.indexOf(t) > 0 ? t : 'auto';
  }
  var IC = {
    auto: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    light: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    bw: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    bwd: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'
  };
  function show() {
    var label = 'Tema: ' + N[cur()],
      txtEl = $('thm-txt'),
      ic = btn.querySelector('svg');
    if (txtEl) txtEl.textContent = label;
    else btn.textContent = label;
    if (ic) ic.innerHTML = IC[cur()];
    btn.title = label + ' (ketuk untuk ganti)';
    btn.setAttribute('aria-label', btn.title);
  }
  btn.onclick = function () {
    var n = T[(T.indexOf(cur()) + 1) % T.length];
    if (n === 'auto') de.removeAttribute('data-theme');
    else de.setAttribute('data-theme', n);
    try {
      localStorage.setItem('rk-theme', n);
    } catch (x) {}
    show();
  };
  show();
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
