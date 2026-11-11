/**
 * Navigasi tambahan:
 *  - menu "Alat" (desktop) menggantikan dua tautan alat di topbar;
 *  - bilah menu bawah + lembar "Lainnya" untuk layar HP (<= 720px; di layar lebih lebar disembunyikan lewat CSS).
 * Memakai tab() dan setMode() yang sudah ada; syncNav() dipanggil dari tab() dan modeUi().
 */
var BOT_BASE = [
  { k: 'rincian', t: 'Rincian', i: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
  { k: 'kas', t: 'Kas', i: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.2"/>' },
  { k: 'jadwal', t: 'Jadwal', i: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
];
var BOT_TRIP = { k: 'trip', t: 'Perjalanan', i: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>' };
var BOT_ITEM = { k: 'item', t: 'Item', i: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
  BOT_MORE = { k: 'more', t: 'Lainnya', i: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>' };
/** Pindah ke tujuan bilah bawah: tab Rencana, atau mode Perjalanan. */
function navGo(k) {
  if (k === 'trip') {
    if (mode !== 'trip') setMode('trip');
    return;
  }
  if (mode !== 'rencana') setMode('rencana');
  tab(k);
}

/** Perjalanan tampil? Pilihan eksplisit (rk-trip-vis) menang; bila belum pernah dipilih: tampil hanya jika sudah ada data perjalanan. */
function tripOn() {
  var v = null;
  try {
    v = localStorage.getItem('rk-trip-vis');
  } catch (e) {}
  if (v === '1') return true;
  if (v === '0') return false;
  return Object.keys(ALL.kas.pr).some(function (id) {
    return !ALL.kas.pr[id].link;
  });
}

/** Item bilah bawah: Rincian/Kas/Jadwal + Kelola Item + Lainnya. */
function botItems() {
  return BOT_BASE.concat([BOT_ITEM, BOT_MORE]);
}

/** Isi lembar "Lainnya" menyesuaikan apa yang ada di bilah bawah. */
function sheetHtml() {
  var ext =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  return (
    '<div class="bs-h">Rencana</div>' +
    '<button type="button" role="menuitem" data-go="sim">Simulasi</button>' +
    '<button type="button" role="menuitem" data-go="trip">Perjalanan</button>' +
    '<div class="bs-h">Laporan</div>' +
    '<button type="button" role="menuitem" data-rep="d">Hari ini</button>' +
    '<button type="button" role="menuitem" data-rep="w">Minggu ini</button>' +
    '<button type="button" role="menuitem" data-rep="m">Bulan ini</button>' +
    '<button type="button" role="menuitem" data-rep="y">Tahun ini</button>' +
    '<div class="bs-h">Alat</div>' +
    '<button type="button" role="menuitem" data-thm>Tema: ' + THEME_NAME[themeCur()] + '</button>' +
    '<button type="button" role="menuitem" data-pwa hidden>Pasang aplikasi</button>' +
    '<a role="menuitem" href="tools/rebalance/index.html" target="_blank" rel="noopener"><span>Rebalance porto</span>' + ext + '</a>' +
    '<a role="menuitem" href="tools/ibkr-flip/index.html" target="_blank" rel="noopener"><span>IBKR vs Flip</span>' + ext + '</a>' +
    '<div class="bs-h">Data</div>' +
    '<button type="button" role="menuitem" data-go="backup">Impor / Ekspor</button>'
  );
}

/** Bangun ulang bilah bawah dan lembar Lainnya. */
function renderBotNav() {
  var bar = document.getElementById('botnav'),
    sh = document.getElementById('botsheet');
  if (!bar || !sh) return;
  bar.innerHTML = botItems()
    .map(function (x) {
      return (
        '<button type="button" data-k="' + x.k + '"' + (x.k === 'more' ? ' aria-haspopup="true" aria-expanded="false"' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + x.i + '</svg>' +
        '<span>' + x.t + '</span></button>'
      );
    })
    .join('');
  sh.innerHTML = sheetHtml();
  var pw = sh.querySelector('[data-pwa]'),
    pb = $('pwa');
  if (pw && pb) pw.hidden = pb.hidden;
  syncNav();
  tripShow();
  if (typeof themeShow === 'function') themeShow();
}

/** Sorot tujuan yang sedang aktif di bilah bawah. */
function syncNav() {
  var bar = document.getElementById('botnav');
  if (!bar) return;
  var cur = mode === 'trip' || curTab === 'sim' ? 'more' : curTab;
  Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
    var on = b.dataset.k === cur;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

/** Tanda centang pada pilihan "Tampilkan Perjalanan" di menu. */
function tripShow() {
  var on = tripOn();
  Array.prototype.forEach.call(document.querySelectorAll('[data-trip-toggle]'), function (b) {
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

/** Terapkan tampil/sembunyi Perjalanan di tombol mode, bilah bawah, dan menu. rerender = gambar ulang bila sedang di mode Perjalanan. */
function applyTripVis(rerender) {
  var on = tripOn();
  Array.prototype.forEach.call(document.querySelectorAll('[data-md="trip"]'), function (b) {
    b.hidden = !on;
  });
  if (!on && mode === 'trip') {
    mode = 'rencana';
    remember('rk-mode', 'rencana');
    if (rerender) renderAll();
  }
  renderBotNav();
}

/** Pilihan pengguna: tampilkan atau sembunyikan Perjalanan (data tidak dihapus). */
function setTripVisible(on) {
  try {
    localStorage.setItem('rk-trip-vis', on ? '1' : '0');
  } catch (e) {}
  applyTripVis(true);
}

/** Pasang menu Alat, bilah bawah, dan lembar Lainnya. */
function bindNav() {
  var ab = document.getElementById('alat-btn'),
    am = document.getElementById('alat-menu');
  function alat(open) {
    if (!ab || !am) return;
    am.hidden = !open;
    ab.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (ab && am) {
    ab.onclick = function (e) {
      e.stopPropagation();
      alat(am.hidden);
    };
    am.onclick = function (e) {
      if (e.target.closest('#thm')) return; // tema berganti tanpa menutup menu
      var g = e.target.closest('[data-go]');
      alat(false);
      if (g) navGo(g.dataset.go);
    };
  }

  var bar = document.createElement('div');
  bar.id = 'botnav';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'Menu utama');
  var sh = document.createElement('div');
  sh.id = 'botsheet';
  sh.hidden = true;
  sh.setAttribute('role', 'menu');
  document.body.appendChild(sh);
  document.body.appendChild(bar);

  function sheet(open) {
    sh.hidden = !open;
    var mb = bar.querySelector('[data-k="more"]');
    if (mb) mb.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  bar.onclick = function (e) {
    var b = e.target.closest('button[data-k]');
    if (!b) return;
    if (b.dataset.k === 'more') return sheet(sh.hidden);
    sheet(false);
    navGo(b.dataset.k);
  };
  sh.onclick = function (e) {
    var th = e.target.closest('[data-thm]');
    if (th) {
      setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(themeCur()) + 1) % THEME_CYCLE.length]);
      th.textContent = 'Tema: ' + THEME_NAME[themeCur()];
      return;
    }
    var pw = e.target.closest('[data-pwa]');
    if (pw) {
      sheet(false);
      var pb = $('pwa');
      if (pb) pb.click();
      return;
    }
    var b = e.target.closest('[data-go]');
    if (b) {
      sheet(false);
      if (b.dataset.go === 'backup') document.getElementById('bk').click();
      else navGo(b.dataset.go);
    } else if (e.target.closest('a') || e.target.closest('[data-theme-set]')) sheet(false);
  };
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) navGo(g.dataset.goto);
    var ts = e.target.closest('[data-theme-set]');
    if (ts) setTheme(themeCur() === ts.dataset.themeSet ? 'auto' : ts.dataset.themeSet);
    if (!e.target.closest('#alat')) alat(false);
    if (!sh.hidden && !e.target.closest('#botsheet') && !e.target.closest('#botnav')) sheet(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    alat(false);
    sheet(false);
  });
  applyTripVis(false);
  addEventListener('resize', function () {
    if (typeof navPill === 'function') navPill();
  });
}
