/**
 * Mode Aplikasi HP (PWA / Standalone): UI mandiri di #mobile-app-shell
 * yang merujuk pada mockup-mobile.html dan terhubung penuh ke js/core/* & Supabase (js/sync.js).
 */
'use strict';

var MOB_STATE = {
  tab: 'rincian',
  frame: null,
  cashRange: 'm',
  zoomRange: 'm',
  zoomWide: false,
  zoomTouch: 'scrub',
  zoomPin: null,
  cashExpand: false,
  wherePeriod: 'y',
  whereDir: '-',
  whereStyle: 'jar',
  whereMonth: null,
  whereLock: null,
  bsPeriod: 'y',
  txDir: 'all',
  kasSub: 'all',
  kasType: '-',
  kasCat: 'Makanan',
  kasFilterCat: 'all',
  kasFilterDir: 'all',
  kasSearch: '',
  jadwalSub: 'list',
  jadwalMonth: 'all',
  jadwalFilter: 'all',
  chipCtx: null,
  scenItemId: null,
  scenMode: 'change_price',
  scenMonth: null,
  dismissedNotifs: null,
  itemSub: 'all',
  itemCat: 'Tagihan rutin',
  itemEditId: null,
  tripView: 'list',
  tripId: '',
  tripSub: 'ring',
  tripEditIt: null,
  tripEditBk: null,
  tripGoalEdit: false,
  tripModalMode: 'new',
  notifEnabled: true,
  notifHorizon: null,
  notifToday: true,
  notifSoon: true,
  notifLate: true,
  repKind: 'm',
  repExpanded: {},
};

var MOB_BANNER_DUE = null;
var mobToastTimer = null;
var mobNotifTimer = null;
var MOB_CAL_VIEW = {};

var RK_UPDATE_REPO = 'daffagng4-commits/RencanaKeuangan';
var RK_UPDATE_DL_PREFIX = 'https://github.com/' + RK_UPDATE_REPO + '/releases/download/';
var RK_UPDATE_CHECK_LS = 'rk-apk-last-check';
var RK_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
var RK_UPDATE_TIMEOUT_MS = 10000;
var RK_UPDATE_DIR = 'rk-update';
var RK_UPDATE_STALL_MS = 30000;
var RK_UPDATE_HASH_MAX_BYTES = 35 * 1024 * 1024;
var _rkUpdStallTimer = null;
var _rkUpdLastPaintAt = 0;
var _rkUpdRunSeq = 0;
var _rkUpdInFlightPaths = {};
var MOB_UPDATE_STATE = {
  checking: false,
  status: 'idle',
  phase: 'idle',
  message: '',
  info: null,
  checkedAt: 0,
  showSteps: false,
  progressBytes: 0,
  progressTotal: 0,
  progressPct: 0,
  indeterminate: false,
  downloadedPath: '',
  downloadedRun: 0,
  unverifiedNote: '',
};

function mobFmtCalLbl(ds) {
  if (!ds || !ISO_RE.test(ds)) return 'Pilih tanggal';
  return +ds.slice(8, 10) + ' ' + MON[+ds.slice(5, 7) - 1] + ' ' + ds.slice(0, 4);
}

function mobDateFieldHtml(id, val, rightAlign) {
  var v = ISO_RE.test(val || '') ? val : '';
  return (
    '<div class="picker-wrap">' +
    '<input type="hidden" id="' + esc(id) + '" value="' + esc(v) + '" />' +
    '<button type="button" class="cal-trigger" id="' + esc(id) + '-trig" data-mcal-trig="' + esc(id) + '">' +
    '<span id="' + esc(id) + '-lbl">' + esc(v ? mobFmtCalLbl(v) : 'Pilih tanggal') + '</span>' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' +
    '</button>' +
    '<div class="picker-popover' + (rightAlign ? ' align-right' : '') + '" id="' + esc(id) + '-cal"></div>' +
    '</div>'
  );
}

function mobSetDateVal(id, ds) {
  var inp = $(id), lbl = $(id + '-lbl');
  if (inp) inp.value = ds || '';
  if (lbl) lbl.textContent = ds ? mobFmtCalLbl(ds) : 'Pilih tanggal';
  if (ds && ISO_RE.test(ds)) MOB_CAL_VIEW[id] = { y: +ds.slice(0, 4), m: +ds.slice(5, 7) - 1 };
}

function mobDrawCal(id) {
  var pop = $(id + '-cal'), inp = $(id);
  if (!pop || !inp) return;
  var today = todayISO(), cur = ISO_RE.test(inp.value) ? inp.value : today;
  var v = MOB_CAL_VIEW[id] || { y: +cur.slice(0, 4), m: +cur.slice(5, 7) - 1 };
  MOB_CAL_VIEW[id] = v;
  var first = new Date(Date.UTC(v.y, v.m, 1)).getUTCDay(),
    dim = new Date(Date.UTC(v.y, v.m + 1, 0)).getUTCDate(),
    cells = '';
  for (var i = 0; i < first; i++) cells += '<span></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = v.y + '-' + pad2(v.m + 1) + '-' + pad2(d);
    var cls = 'cal-day' + (ds === cur ? ' selected' : '') + (ds === today ? ' today' : '');
    cells += '<button type="button" class="' + cls + '" data-mcal-pick="' + esc(id) + '|' + ds + '">' + d + '</button>';
  }
  pop.innerHTML =
    '<div class="cal-head"><button type="button" class="btn btn-secondary btn-sm" data-mcal-mv="' + esc(id) + '|-1">‹</button>' +
    '<strong style="font-size:0.80rem">' + esc(FULL_MON[v.m] + ' ' + v.y) + '</strong>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-mcal-mv="' + esc(id) + '|1">›</button></div>' +
    '<div class="cal-grid"><span class="cal-dow">Min</span><span class="cal-dow">Sen</span><span class="cal-dow">Sel</span><span class="cal-dow">Rab</span><span class="cal-dow">Kam</span><span class="cal-dow">Jum</span><span class="cal-dow">Sab</span>' + cells + '</div>' +
    '<div style="display:flex;justify-content:flex-start;margin-top:8px;padding-top:6px;border-top:1px solid var(--border-subtle)"><button type="button" class="badge b-ac" data-mcal-pick="' + esc(id) + '|' + today + '">Hari Ini</button></div>';
}

var MOB_CAT_META = {
  Langganan: { hex: '#4F46E5', grad: ['#6366F1', '#4338CA'], svg: '<path d="M17 2l4 4-4 4" fill="none" stroke="#FEF08A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v1a4 4 0 0 1-4 4H3" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
  Pendidikan: { hex: '#0891B2', grad: ['#06B6D4', '#0284C7'], svg: '<path d="M2 10l10-5 10 5-10 5-10-5z" fill="#FFFFFF"/><path d="M6 12.5v4.5c0 1.8 2.7 3 6 3s6-1.2 6-3v-4.5" fill="none" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>' },
  Investasi: { hex: '#0D9488', grad: ['#10B981', '#0284C7'], svg: '<rect x="5" y="13" width="3" height="6" rx="1" fill="#FDE047"/><rect x="10.5" y="9" width="3" height="10" rx="1" fill="#FFFFFF"/><rect x="16" y="5" width="3" height="14" rx="1" fill="#A7F3D0"/><path d="M5 10l5-4 4 3 5-5" fill="none" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>' },
  'Tagihan rutin': { hex: '#2563EB', grad: ['#3B82F6', '#4F46E5'], svg: '<path d="M13 3L5 14h6l-1 7 9-11h-6l0-7z" fill="#FDE047" stroke="#FFFFFF" stroke-width="1.3" stroke-linejoin="round"/>' },
  Tagihan: { hex: '#2563EB', grad: ['#3B82F6', '#4F46E5'], svg: '<path d="M13 3L5 14h6l-1 7 9-11h-6l0-7z" fill="#FDE047" stroke="#FFFFFF" stroke-width="1.3" stroke-linejoin="round"/>' },
  Kesehatan: { hex: '#059669', grad: ['#10B981', '#0D9488'], svg: '<path d="M12 3.5l7 3v5c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5v-5l7-3z" fill="#FFFFFF" fill-opacity="0.94"/><path d="M12 8v7M8.5 11.5h7" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/>' },
  Hiburan: { hex: '#9333EA', grad: ['#A855F7', '#EC4899'], svg: '<rect x="3.5" y="6" width="17" height="12" rx="3" fill="#FFFFFF" fill-opacity="0.92"/><polygon points="10,9.5 16,12.5 10,15.5" fill="#9333EA"/><circle cx="18" cy="7" r="2.3" fill="#FACC15"/>' },
  Makanan: { hex: '#EA580C', grad: ['#F97316', '#EAB308'], svg: '<path d="M4 12h16c0 4.5-3.4 7.5-8 7.5S4 16.5 4 12z" fill="#FFFFFF"/><path d="M8 8.5c0-1.3 1-1.8 1-3M12 8.5c0-1.3 1-1.8 1-3M16 8.5c0-1.3 1-1.8 1-3" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>' },
  'Makan & Minum': { hex: '#EA580C', grad: ['#F97316', '#EAB308'], svg: '<path d="M4 12h16c0 4.5-3.4 7.5-8 7.5S4 16.5 4 12z" fill="#FFFFFF"/><path d="M8 8.5c0-1.3 1-1.8 1-3M12 8.5c0-1.3 1-1.8 1-3M16 8.5c0-1.3 1-1.8 1-3" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>' },
  Transport: { hex: '#0284C7', grad: ['#0EA5E9', '#2563EB'], svg: '<rect x="6" y="4" width="12" height="12" rx="3" fill="#FFFFFF"/><rect x="8.5" y="6.5" width="7" height="4" rx="1" fill="#0284C7"/><circle cx="9.5" cy="13.5" r="1.2" fill="#0284C7"/><circle cx="14.5" cy="13.5" r="1.2" fill="#0284C7"/>' },
  Transportasi: { hex: '#0284C7', grad: ['#0EA5E9', '#2563EB'], svg: '<rect x="6" y="4" width="12" height="12" rx="3" fill="#FFFFFF"/><rect x="8.5" y="6.5" width="7" height="4" rx="1" fill="#0284C7"/><circle cx="9.5" cy="13.5" r="1.2" fill="#0284C7"/><circle cx="14.5" cy="13.5" r="1.2" fill="#0284C7"/>' },
  Belanja: { hex: '#D97706', grad: ['#F59E0B', '#D97706'], svg: '<path d="M6 8h12l-1 11H7L6 8z" fill="#FFFFFF" fill-opacity="0.94"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>' },
  Gaji: { hex: '#16A34A', grad: ['#22C55E', '#15803D'], svg: '<rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="#FFFFFF"/><circle cx="12" cy="12" r="3" fill="#16A34A"/><circle cx="17.5" cy="9" r="1.2" fill="#FACC15"/>' },
  'Gaji & Pemasukan': { hex: '#16A34A', grad: ['#22C55E', '#15803D'], svg: '<rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="#FFFFFF"/><circle cx="12" cy="12" r="3" fill="#16A34A"/><circle cx="17.5" cy="9" r="1.2" fill="#FACC15"/>' },
  Pemasukan: { hex: '#16A34A', grad: ['#22C55E', '#15803D'], svg: '<rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="#FFFFFF"/><circle cx="12" cy="12" r="3" fill="#16A34A"/><circle cx="17.5" cy="9" r="1.2" fill="#FACC15"/>' },
  'Tabungan perjalanan': { hex: '#0284C7', grad: ['#38BDF8', '#0284C7'], svg: '<path d="M12 3l8 6-8 12L4 9l8-6z" fill="#FFFFFF" fill-opacity="0.92"/><circle cx="12" cy="10" r="2.2" fill="#0284C7"/>' },
  Lainnya: { hex: '#64748B', grad: ['#64748B', '#475569'], svg: '<circle cx="8" cy="12" r="2" fill="#FFFFFF"/><circle cx="12" cy="12" r="2" fill="#FEF08A"/><circle cx="16" cy="12" r="2" fill="#FFFFFF"/>' },
};

function mobFmtShort(n) {
  var v = Number(n) || 0,
    a = Math.abs(v),
    s = v < 0 ? '-' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(a % 1e9 === 0 ? 0 : 1).replace('.', ',') + 'M';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'rb';
  return String(Math.round(v));
}

function mobGetCatMeta(cat) {
  if (MOB_CAT_META[cat]) return MOB_CAT_META[cat];
  var hex = typeof catColor === 'function' ? catColor(cat) : '#2563EB';
  return { hex: hex, grad: [hex, '#1E293B'], svg: '<circle cx="12" cy="12" r="5" fill="#FFFFFF" fill-opacity="0.92"/>' };
}

function mobCatLogo(cat, size) {
  var sz = size || 26,
    m = mobGetCatMeta(cat || 'Tagihan rutin'),
    c0 = m.grad ? m.grad[0] : m.hex,
    c1 = m.grad ? m.grad[1] : m.hex,
    ico = Math.round(sz * 0.64);
  return (
    '<span class="cat-logo" style="width:' + sz + 'px;height:' + sz + 'px;background:linear-gradient(135deg,' +
    c0 + ',' + c1 + ');" title="' + esc(cat || 'Lainnya') + '">' +
    '<svg width="' + ico + '" height="' + ico + '" viewBox="0 0 24 24" aria-hidden="true">' + m.svg + '</svg></span>'
  );
}

function mobTripCatMapped(c) {
  var m = { Makanan: 'Makan & Minum', Makan: 'Makan & Minum', Transport: 'Transportasi', 'Tiket & Tour': 'Hiburan', Penginapan: 'Tagihan rutin', Belanja: 'Belanja', Persiapan: 'Kesehatan', Lainnya: 'Tagihan rutin' };
  return m[c] || 'Tagihan rutin';
}

function mobFmtShortCal(ds) {
  if (!ds || ds.length < 10) return '—';
  return +ds.slice(8, 10) + ' ' + MON[+ds.slice(5, 7) - 1];
}

function mobPreserveScroll(fn) {
  var mm = $('m-main');
  var sy = typeof window !== 'undefined' ? (window.scrollY || (document.documentElement && document.documentElement.scrollTop) || 0) : 0;
  var mTop = mm ? mm.scrollTop : 0;
  fn();
  if (mm && mTop) mm.scrollTop = mTop;
  if (sy > 0 && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    try { window.scrollTo(0, sy); } catch (e) {}
  }
}

function mobOpenExternalUrl(rawUrl) {
  var u = typeof safeHref === 'function' ? safeHref(rawUrl) : '';
  if (!u) {
    showMobToast('Tautan tidak valid');
    return false;
  }
  var br = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (rkIsCapacitorNative() && br && typeof br.open === 'function') {
    Promise.resolve(br.open({ url: u })).catch(function () {
      try { window.open(u, '_blank', 'noopener,noreferrer'); } catch (e) {}
    });
    return true;
  }
  try {
    window.open(u, '_blank', 'noopener,noreferrer');
  } catch (e) {}
  return true;
}

var MOB_WA_URL_MAX = 1800;
var MOB_XL_LOAD_TIMEOUT_MS = 15000;
var MOB_XL_DATA = null;
var MOB_XL_BUSY = false;

function mobLoadXlsxWithTimeout() {
  if (typeof loadXlsx !== 'function') return Promise.reject(new Error('Pustaka Excel tidak tersedia.'));
  var ms = (typeof MOB_XL_LOAD_TIMEOUT_MS === 'number' && MOB_XL_LOAD_TIMEOUT_MS > 0) ? MOB_XL_LOAD_TIMEOUT_MS : 15000;
  var tid;
  var tout = new Promise(function (_, reject) {
    tid = setTimeout(function () {
      reject(new Error('Waktu muat pustaka Excel habis (' + Math.round(ms / 1000) + ' dtk). Periksa koneksi internet.'));
    }, ms);
  });
  return Promise.race([Promise.resolve(loadXlsx()), tout]).then(
    function (X) { clearTimeout(tid); return X; },
    function (err) { clearTimeout(tid); throw err; }
  );
}

function mobHasNonWinAnsi(s) {
  return typeof tripHasNonWinAnsi === 'function' ? tripHasNonWinAnsi(s) : false;
}

function mobTripHasNonWinAnsi(P) {
  return typeof tripPdfHasNonWinAnsi === 'function' ? tripPdfHasNonWinAnsi(P) : false;
}

function mobWrapPdfText(str, maxW, bold) {
  return typeof tripWrapPdfText === 'function' ? tripWrapPdfText(str, maxW, bold) : [String(str == null ? '' : str).trim() || ''];
}

function mobSafePdfFilename(name) {
  return typeof tripSafePdfFilename === 'function' ? tripSafePdfFilename(name) : 'itinerary-perjalanan.pdf';
}

function mobSetXlBusy(busy) {
  MOB_XL_BUSY = !!busy;
  if ($('m-btn-trip-xl')) $('m-btn-trip-xl').disabled = MOB_XL_BUSY;
  if ($('m-btn-trip-tpl')) $('m-btn-trip-tpl').disabled = MOB_XL_BUSY;
}

function mobItemShade(cat, idx) {
  var base = mobGetCatMeta(cat).hex || '#2563EB';
  if (!idx) return base;
  var opac = Math.max(0.45, 0.92 - idx * 0.14);
  return base + Math.round(opac * 255).toString(16).padStart(2, '0');
}

function mobPaintSlider(el) {
  if (!el) return;
  var min = Number(el.min || 0), max = Number(el.max || 100), val = Number(el.value || 0);
  var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  el.style.setProperty('--pct', Math.max(0, Math.min(100, pct)).toFixed(1) + '%');
}

function mobPaintAllSliders(scope) {
  (scope || $('mobile-app-shell') || document).querySelectorAll('.modern-slider').forEach(mobPaintSlider);
}

function initMobDragSliders(scope) {
  var root = scope || $('mobile-app-shell');
  if (!root) return;
  root.querySelectorAll('.pill-slider, .card-slider').forEach(function (el) {
    if (el.dataset.dragInit === '1') return;
    el.dataset.dragInit = '1';
    var isDown = false, startX = 0, scrollStart = 0, moved = 0;
    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      isDown = true; moved = 0; startX = e.clientX; scrollStart = el.scrollLeft;
    });
    window.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = Math.abs(dx); el.classList.add('is-dragging'); }
      el.scrollLeft = scrollStart - dx;
    });
    window.addEventListener('mouseup', function () {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
      if (moved > 5) {
        var sup = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', sup, { capture: true, once: true });
        setTimeout(function () { el.removeEventListener('click', sup, { capture: true }); }, 60);
      }
      moved = 0;
    });
    el.addEventListener('wheel', function (e) {
      if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  });
  var kpi = $('m-kpi-slider');
  if (kpi && kpi.dataset.dotsInit !== '1') {
    kpi.dataset.dotsInit = '1';
    kpi.addEventListener('scroll', function () {
      var mx = Math.max(1, kpi.scrollWidth - kpi.clientWidth);
      var idx = Math.min(2, Math.round((kpi.scrollLeft / mx) * 2));
      document.querySelectorAll('#m-rincian-kpi-dots .slider-dot').forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    });
  }
}

function showMobToast(msg, undo) {
  var box = $('m-toast-box');
  if (box) {
    box.classList.remove('has-undo');
    if (typeof undo === 'function') {
      box.innerHTML = '<span>' + esc(msg) + '</span><button type="button" class="m-toast-undo">Urungkan</button>';
      box.classList.add('has-undo');
      var uBtn = box.querySelector('.m-toast-undo');
      if (uBtn) {
        uBtn.onclick = function () {
          clearTimeout(mobToastTimer);
          box.classList.remove('show', 'has-undo');
          undo();
        };
      }
    } else {
      box.textContent = msg;
    }
    box.classList.add('show');
    clearTimeout(mobToastTimer);
    mobToastTimer = setTimeout(function () {
      box.classList.remove('show', 'has-undo');
    }, typeof undo === 'function' ? 8000 : 2400);
  } else if (typeof toast === 'function') {
    toast(msg, undo);
  }
}

function mobOpenSheet(id) {
  var el = $(id);
  if (!el) return;
  clearTimeout(el._mCloseT);
  el.classList.remove('is-closing', 'is-dragging');
  var sh = el.querySelector('.modal-sheet');
  if (sh) { sh.style.transform = ''; sh.style.transition = ''; }
  el.style.opacity = '';
  el.style.transition = '';
  if (el.offsetWidth > 0) void el.offsetWidth;
  el.classList.add('open');
  if (typeof rkSyncSegPills === 'function') rkSyncSegPills(el, false);
}

function mobCloseSheet(id) {
  var el = $(id);
  if (!el) return;
  if (id === 'm-sheet-trip-xl') MOB_XL_DATA = null;
  var red = typeof rkIsReducedMotion === 'function' && rkIsReducedMotion();
  var wasOpen = el.classList.contains('open') && el.offsetWidth > 0 && !red;
  el.classList.remove('open', 'is-dragging');
  var sh = el.querySelector('.modal-sheet');
  if (wasOpen) {
    el.classList.add('is-closing');
    if (sh) { sh.style.transform = ''; sh.style.transition = ''; }
    el.style.opacity = '';
    el.style.transition = '';
    clearTimeout(el._mCloseT);
    el._mCloseT = setTimeout(function () { el.classList.remove('is-closing'); }, 250);
  } else {
    el.classList.remove('is-closing');
    if (sh) { sh.style.transform = ''; sh.style.transition = ''; }
    el.style.opacity = '';
    el.style.transition = '';
  }
}

function mobDefaultFrame() {
  if (MOB_STATE.frame) return MOB_STATE.frame;
  var standalone = false;
  try {
    standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone === true) ||
      window.innerWidth <= 520;
  } catch (e) {}
  return standalone ? 'full' : '360';
}

function setMobPhoneFrame(mode) {
  MOB_STATE.frame = mode;
  if (document.body) document.body.setAttribute('data-phone-frame', mode);
  document.querySelectorAll('#m-phone-preview-bar [data-mpframe]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mpframe') === mode);
  });
}

function unmountMobileShell() {
  if (typeof window !== 'undefined' && typeof window._rkPtrReset === 'function') window._rkPtrReset();
  var root = $('mobile-app-shell');
  if (root) root.innerHTML = '';
  if (document.body) document.body.removeAttribute('data-phone-frame');
}

function syncMobileCloudUI() {
  if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return;
  var u = typeof sbUser !== 'undefined' ? sbUser : null;
  var du = typeof rkDisplayUser === 'function'
    ? rkDisplayUser(u)
    : { loggedIn: !!u, name: u ? 'Pengguna' : 'XXX', initial: u ? 'P' : '' };
  if (typeof USER_NAME !== 'undefined') USER_NAME = du.name;
  var av = $('m-acct-btn') && $('m-acct-btn').querySelector('.av-circle');
  if (av) av.classList.toggle('anon', !du.loggedIn);
  var popAv = $('m-menu-acct') && $('m-menu-acct').querySelector('.ap-av');
  if (popAv) popAv.classList.toggle('anon', !du.loggedIn);
  if ($('m-acct-ini')) $('m-acct-ini').textContent = du.initial;
  if ($('m-pop-acct-ini')) $('m-pop-acct-ini').textContent = du.initial;
  if ($('m-user-name')) $('m-user-name').innerHTML = 'Halo, <b>' + esc(du.name) + '</b>';
  if ($('m-pop-user-name')) $('m-pop-user-name').textContent = 'Halo, ' + du.name;
  var lbl = $('m-sync-lbl'), setSt = $('m-set-acct-status');
  var statusTxt = '● Mode Lokal', statusCol = 'var(--text-muted)';
  if (typeof sb !== 'undefined' && sb) {
    if (u) {
      statusTxt = '● Sinkron Cloud (' + (u.email || du.name) + ')';
      statusCol = 'var(--emerald)';
    } else {
      statusTxt = '○ Belum Masuk Cloud';
      statusCol = 'var(--amber)';
    }
  }
  if (lbl) {
    lbl.textContent = u ? '● Sinkron Cloud' : (typeof sb !== 'undefined' && sb ? '○ Belum Masuk' : '● Mode Lokal');
    lbl.style.color = statusCol;
  }
  if (setSt) {
    setSt.textContent = statusTxt;
    setSt.style.color = statusCol;
  }
  if ($('m-set-open-acct')) $('m-set-open-acct').textContent = u ? 'Kelola' : 'Masuk';
  var priv = document.body && document.body.classList.contains('privacy-mode');
  if (document.body) document.body.classList.toggle('privacy-on', !!priv);
  var pbtn = $('m-btn-privacy');
  if (pbtn) {
    pbtn.classList.toggle('on', !!priv);
    pbtn.setAttribute('aria-pressed', priv ? 'true' : 'false');
    pbtn.title = priv ? 'Mode Privasi: AKTIF (ketuk untuk tampilkan)' : 'Kaburkan Nominal';
    var morph = pbtn.querySelector('.rk-morph-icon');
    if (morph) {
      morph.classList.toggle('is-morphed', !!priv);
    } else {
      var pic = pbtn.querySelector('svg');
      if (pic) {
        pic.innerHTML = priv
          ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
          : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      }
    }
  }
}

var RK_WORDMARK_PATH = 'M1.93 22L1.93 3.52L9.8 3.52Q11.34 3.52 12.6 3.76Q13.86 4 14.83 4.46Q15.79 4.92 16.46 5.58Q17.14 6.24 17.47 7.09Q17.81 7.94 17.81 8.98Q17.81 9.96 17.5 10.74Q17.19 11.53 16.56 12.12Q15.93 12.7 14.98 13.07Q14.03 13.43 12.77 13.6L12.77 14.02Q14.36 14.19 15.25 14.73Q16.13 15.28 16.6 16.18Q17.08 17.07 17.44 18.33L18.51 22L13.5 22L12.68 18.61Q12.43 17.49 12 16.88Q11.56 16.26 10.89 16.02Q10.22 15.78 9.21 15.78L6.44 15.78L6.44 22ZM6.44 12.45L9.49 12.45Q11.2 12.45 12.15 11.78Q13.1 11.11 13.1 9.68Q13.1 8.28 12.24 7.61Q11.37 6.94 9.6 6.94L6.44 6.94ZM27.19 22.39Q25.34 22.39 23.88 21.9Q22.43 21.41 21.41 20.46Q20.38 19.51 19.85 18.11Q19.32 16.71 19.32 14.89Q19.32 13.12 19.84 11.64Q20.36 10.16 21.32 9.08Q22.29 8 23.7 7.41Q25.12 6.82 26.88 6.82Q28.67 6.82 30.03 7.4Q31.39 7.97 32.27 9.09Q33.15 10.21 33.57 11.82Q33.99 13.43 33.85 15.5L22.29 15.59L22.29 13.24L31.28 13.15L29.68 14.24Q29.88 12.84 29.51 11.96Q29.15 11.08 28.45 10.67Q27.75 10.27 26.94 10.27Q25.96 10.27 25.21 10.8Q24.47 11.33 24.05 12.34Q23.63 13.35 23.63 14.8Q23.63 17.1 24.63 18.14Q25.62 19.17 27.16 19.17Q27.92 19.17 28.42 18.96Q28.92 18.75 29.25 18.43Q29.57 18.11 29.75 17.72Q29.93 17.32 30.04 16.96L33.96 17.8Q33.74 18.84 33.25 19.68Q32.76 20.52 31.93 21.13Q31.11 21.75 29.95 22.07Q28.78 22.39 27.19 22.39ZM35.76 22L35.76 13.1L35.76 7.22L39.4 7.22L39.45 11.56L40.01 11.56Q40.38 9.99 41.05 8.92Q41.72 7.86 42.76 7.34Q43.79 6.82 45.19 6.82Q47.8 6.82 49.15 8.64Q50.51 10.46 50.51 14.44L50.51 22L45.98 22L45.98 14.94Q45.98 12.65 45.32 11.6Q44.66 10.55 43.37 10.55Q42.31 10.55 41.62 11.19Q40.94 11.84 40.6 12.9Q40.26 13.96 40.26 15.28L40.26 22ZM53.12 22L53.12 3.52L57.62 3.52L57.62 11.61Q59 11 60.17 10.07Q61.35 9.15 62.26 8.06Q63.17 6.96 63.77 5.8Q64.37 4.64 64.65 3.52L69.86 3.52Q69.52 4.81 68.77 6.14Q68.01 7.47 66.95 8.69Q65.88 9.9 64.67 10.86Q63.45 11.81 62.19 12.37L62.19 12.79Q63.48 12.79 64.47 13.07Q65.46 13.35 66.23 13.94Q67 14.52 67.58 15.41Q68.15 16.29 68.57 17.52L70.17 22L65.04 22L64.01 18.33Q63.67 17.1 63.11 16.39Q62.55 15.67 61.63 15.35Q60.7 15.03 59.25 15.03L57.62 15.03L57.62 22ZM78.62 22.39Q76.78 22.39 75.32 21.9Q73.86 21.41 72.84 20.46Q71.82 19.51 71.29 18.11Q70.76 16.71 70.76 14.89Q70.76 13.12 71.27 11.64Q71.79 10.16 72.76 9.08Q73.72 8 75.14 7.41Q76.55 6.82 78.32 6.82Q80.11 6.82 81.47 7.4Q82.82 7.97 83.71 9.09Q84.59 10.21 85.01 11.82Q85.43 13.43 85.29 15.5L73.72 15.59L73.72 13.24L82.71 13.15L81.12 14.24Q81.31 12.84 80.95 11.96Q80.58 11.08 79.88 10.67Q79.18 10.27 78.37 10.27Q77.39 10.27 76.65 10.8Q75.91 11.33 75.49 12.34Q75.07 13.35 75.07 14.8Q75.07 17.1 76.06 18.14Q77.06 19.17 78.6 19.17Q79.35 19.17 79.86 18.96Q80.36 18.75 80.68 18.43Q81 18.11 81.19 17.72Q81.37 17.32 81.48 16.96L85.4 17.8Q85.18 18.84 84.69 19.68Q84.2 20.52 83.37 21.13Q82.54 21.75 81.38 22.07Q80.22 22.39 78.62 22.39ZM92.26 22.39Q89.63 22.39 88.3 20.61Q86.97 18.84 86.97 15.2L86.97 7.22L91.5 7.22L91.5 14.61Q91.5 16.68 92.12 17.7Q92.74 18.72 94 18.72Q94.75 18.72 95.3 18.35Q95.84 17.97 96.22 17.28Q96.6 16.6 96.78 15.7Q96.96 14.8 96.96 13.74L96.96 7.22L101.47 7.22L101.47 16.01L101.47 22L97.89 22L97.8 17.44L97.24 17.44Q96.82 19.17 96.19 20.28Q95.56 21.38 94.61 21.89Q93.66 22.39 92.26 22.39Z';

function mobOsNotifHtml() {
  return (
    '<div class="phone-os-notif" id="m-os-notif" role="alert" aria-live="polite">' +
    '<div class="pon-top"><span class="pon-app"><span class="pon-ico rk-brand-tile" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#rk-brand-symbol"/></svg></span>Rencana Keuangan</span>' +
    '<div style="display:flex;align-items:center;gap:6px"><span class="pon-time">Baru saja</span>' +
    '<button type="button" id="m-pon-close" style="color:#94A3B8;font-size:0.78rem;padding:0 3px" aria-label="Tutup notifikasi">✕</button></div></div>' +
    '<div class="pon-title" id="m-pon-title">Pengingat Tagihan Jatuh Tempo</div>' +
    '<div class="pon-body" id="m-pon-body"></div>' +
    '<div class="pon-actions">' +
    '<button type="button" class="pon-btn primary" id="m-pon-paid">✓ Tandai Lunas</button>' +
    '<button type="button" class="pon-btn" id="m-pon-set">Atur Notif</button>' +
    '</div></div>'
  );
}

function mobShellTemplate() {
  return (
    '<div class="phone-preview-bar" id="m-phone-preview-bar" role="toolbar" aria-label="Ukuran Pratinjau HP">' +
    '<span class="pp-lbl">📱 Aplikasi HP</span>' +
    '<button type="button" class="pp-btn" data-mpframe="360">Ringkas 360px</button>' +
    '<button type="button" class="pp-btn" data-mpframe="390">Standar 390px</button>' +
    '<button type="button" class="pp-btn" data-mpframe="full">Layar Penuh</button>' +
    '<span class="pp-div"></span>' +
    '<button type="button" class="pp-btn" id="m-bar-notif-btn">🔔 Notif HP</button>' +
    '<button type="button" class="pp-btn" id="m-bar-theme-btn">🌙 Tema</button>' +
    '<button type="button" class="pp-btn" data-shell-switch="browser">🌐 Browser</button>' +
    '</div>' +
    '<div class="phone-stage"><div class="phone-device-frame">' +
    '<div class="phone-hw-btn vol-up" aria-hidden="true"></div>' +
    '<div class="phone-hw-btn vol-dn" aria-hidden="true"></div>' +
    '<div class="phone-hw-btn pwr" aria-hidden="true"></div>' +
    '<div class="mob-shell" data-mtab-active="' + esc(MOB_STATE.tab || 'rincian') + '">' +
    mobOsNotifHtml() +
    '<div class="apk-header-block">' +
    (typeof rkRenderHeaderMotifSvg === 'function' ? rkRenderHeaderMotifSvg((MOB_STATE.tab || 'rincian') === 'rincian') : '') +
    '<div class="hdr-inner">' +
    '<div class="phone-status-bar" aria-hidden="true"><span>09:41</span><div class="phone-island"><span class="phone-island-cam"></span></div><div class="phone-sys-icons"><span>5G</span><span>94%</span></div></div>' +
    '<header class="mob-topbar">' +
    '<svg class="mt-wordmark" viewBox="1.9 2.5 101 21" fill="none" role="img" aria-label="RenKeu"><path d="' + RK_WORDMARK_PATH + '" fill="#FFFFFF"/></svg>' +
    '<div class="mt-actions">' +
    '<button type="button" class="av-btn" id="m-acct-btn" aria-label="Akun, Tahun &amp; Pengaturan" aria-expanded="false" aria-haspopup="true" title="Akun, Tahun &amp; Pengaturan">' +
    '<div class="av-circle anon"><span id="m-acct-ini"></span><span class="av-dot" aria-hidden="true"></span></div>' +
    '</button>' +
    '<button type="button" class="ico-btn" id="m-btn-privacy" aria-label="Mode Privasi" aria-pressed="false" title="Kaburkan Nominal"><span class="rk-morph-icon" id="m-priv-morph" aria-hidden="true"><svg class="rk-ico-a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg class="rk-ico-b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span></button>' +
    '<button type="button" class="ico-btn" id="m-btn-notif" aria-label="Notifikasi" aria-expanded="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="notif-dot" id="m-notif-dot" style="display:none"></span></button>' +
    '</div></header>' +
    '<p class="hdr-greet" id="m-user-name">Halo, <b>XXX</b></p>' +
    '</div>' +
    '<div class="apk-hero-well">' +
    '<div class="wallet-hero"><div class="rk-sync-hint"><span class="rk-sync-hint-dot" aria-hidden="true"></span>Menyinkronkan data cloud…</div><div class="wallet-top"><div><div class="wallet-kicker">Saldo Realtime &middot; <span id="m-hero-lbl">2026</span></div>' +
    '<div class="rk-skel-wrap"><div class="wallet-bal pv" id="m-rincian-saldo">Rp 0</div></div></div></div>' +
    '<div class="wallet-io-grid">' +
    '<div class="wallet-io-box"><div class="wallet-io-hd"><span class="wallet-io-ico in" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></span><span class="wallet-io-lbl">Pemasukan</span></div><div class="rk-skel-wrap"><div class="wallet-io-val mono pv" id="m-hero-inc">Rp 0</div></div><div class="wallet-io-sub">Total setahun</div></div>' +
    '<div class="wallet-io-box"><div class="wallet-io-hd"><span class="wallet-io-ico out" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg></span><span class="wallet-io-lbl">Pengeluaran</span></div><div class="rk-skel-wrap"><div class="wallet-io-val mono pv" id="m-hero-out">Rp 0</div></div><div class="wallet-io-sub">Total setahun</div></div>' +
    '</div></div></div>' +
    '</div>' +
    '<div class="acct-popover" id="m-acct-popover" role="dialog" aria-label="Menu Akun &amp; Pengaturan">' +
    '<button type="button" class="ap-head" id="m-menu-acct">' +
    '<div class="av-circle ap-av anon"><span id="m-pop-acct-ini"></span></div>' +
    '<div class="ap-meta"><div class="ap-name" id="m-pop-user-name">Halo, XXX</div><div class="ap-sync" id="m-sync-lbl">● Mode Lokal</div></div>' +
    '<span class="ap-chev" aria-hidden="true">&rsaquo;</span>' +
    '</button>' +
    '<div class="ap-sec">' +
    '<div class="ap-hd-row"><div class="ap-lbl">Tahun Aktif</div><button type="button" class="ap-more-yr" id="m-top-yr-pill" title="Ubah Tahun &amp; Saldo Awal"><span id="m-top-yr-txt">2026</span><span aria-hidden="true">&#9662;</span></button></div>' +
    '<div class="ap-years" id="m-acct-yr-pills"></div>' +
    '</div>' +
    '<button type="button" class="ap-item" id="m-acct-go-settings" data-mgo="settings">' +
    '<span class="ap-item-lbl"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Pengaturan &amp; Alat</span>' +
    '<span class="ap-chev" aria-hidden="true">&rsaquo;</span>' +
    '</button>' +
    '</div>' +
    '<div class="m-ptr-ind" id="m-ptr-ind" aria-hidden="true">' +
    '<svg class="m-ptr-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>' +
    '<span class="m-ptr-spin"></span>' +
    '</div>' +
    '<main class="mob-main" id="m-main">' +
    // TAB 1: RINCIAN
    '<section class="tab-panel active" id="m-tab-rincian"><div class="stack">' +
    '<div class="card"><div class="card-hd" style="margin-bottom:8px"><h2 class="card-title">Proyeksi Arus Kas</h2>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-btn-expand-cf">⤢ Perbesar</button></div>' +
    '<div class="seg cf-range-seg" role="group" aria-label="Rentang Grafik">' +
    '<button type="button" class="seg-btn" data-mrange="w">Minggu</button>' +
    '<button type="button" class="seg-btn active" data-mrange="m">Bulan</button>' +
    '<button type="button" class="seg-btn" data-mrange="y">Tahun</button>' +
    '</div>' +
    '<div class="chart-stage" id="m-cf-wrap"><svg id="m-svg-cashflow" viewBox="0 0 340 210" style="width:100%;height:auto;display:block;touch-action:none"></svg><div class="hud-tooltip" id="m-cf-tooltip"></div></div></div>' +
    '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:0 2px"><span style="font-size:0.74rem;font-weight:800;color:var(--text-secondary)">Ringkasan Cepat</span><span style="font-size:0.68rem;font-weight:700;color:var(--accent-ink)">Geser &harr;</span></div>' +
    '<div class="card-slider" id="m-kpi-slider">' +
    '<div class="m-tile"><div class="m-tile-k">Akhir Des</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-metric-end">Rp 0</div></div><div class="m-tile-s" id="m-metric-end-sub">-</div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Jatah / Bulan</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-metric-jatah">-</div></div><div class="m-tile-s" id="m-metric-jatah-sub">-</div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Beban / Bulan</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-metric-avg">Rp 0</div></div><div class="m-tile-s" id="m-metric-tot">Total Rp 0</div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Pelunasan</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-metric-paid">0 / 0</div></div><div class="m-tile-s" id="m-metric-paid-sub">Rp 0</div></div>' +
    '</div><div class="slider-dots" id="m-rincian-kpi-dots"><span class="slider-dot active"></span><span class="slider-dot"></span><span class="slider-dot"></span></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Tagihan Terdekat</h2><button type="button" class="btn btn-secondary btn-sm" data-mnav="jadwal">Semua &rarr;</button></div>' +
    '<div class="stack" style="gap:7px" id="m-upcoming-bills"></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Ke Mana Uangnya Pergi</h2>' +
    '<div class="seg"><button type="button" class="seg-btn active" data-mwstyle="jar">Jar 3D</button><button type="button" class="seg-btn" data-mwstyle="bar">Bar</button></div></div>' +
    '<div class="where-filter-row">' +
    '<div class="seg"><button type="button" class="seg-btn" data-mwperiod="w">Minggu</button><button type="button" class="seg-btn" data-mwperiod="m">Bulan</button><button type="button" class="seg-btn active" data-mwperiod="y">Tahun</button></div>' +
    '<div class="seg"><button type="button" class="seg-btn active" data-mwdir="-">Keluar</button><button type="button" class="seg-btn" data-mwdir="+">Masuk</button></div></div>' +
    '<div class="jar-showcase-grid"><div id="m-jar-stage"></div></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:0.75rem;font-weight:800;color:var(--text-secondary)">Kategori</span>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-btn-reset-where" style="display:none">Reset</button></div>' +
    '<div class="bento-2" id="m-where-cats" style="margin-bottom:10px"></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:0.75rem;font-weight:800;color:var(--text-secondary)">Rincian Item</span><span class="badge b-nt mono pv" id="m-where-tot">Rp 0</span></div>' +
    '<div class="stack" style="gap:5px" id="m-where-items"></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Pemasukan vs Pengeluaran</h2>' +
    '<div class="seg"><button type="button" class="seg-btn active" data-mbsp="y">Jan&ndash;Des</button><button type="button" class="seg-btn" data-mbsp="m">Aktif</button></div></div>' +
    '<div class="chart-stage" id="m-bar-wrap"><svg id="m-svg-bar" viewBox="0 0 340 190" style="width:100%;height:auto;display:block"></svg><div class="hud-tooltip" id="m-bar-tooltip"></div></div>' +
    '<div id="m-bar-detail" style="font-size:0.72rem;color:var(--text-secondary);margin-top:6px"></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Transaksi Terakhir</h2>' +
    '<div class="seg"><button type="button" class="seg-btn active" data-mtxf="all">Semua</button><button type="button" class="seg-btn" data-mtxf="-">Keluar</button><button type="button" class="seg-btn" data-mtxf="+">Masuk</button></div></div>' +
    '<div class="stack" style="gap:7px" id="m-recent-tx"></div></div>' +
    '</div></section>' +
    // TAB 2: KAS
    '<section class="tab-panel" id="m-tab-kas"><div class="stack">' +
    '<div class="bento-3"><div class="m-tile"><div class="m-tile-k">Saldo Kas</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-kas-saldo" style="color:var(--accent-ink)">Rp 0</div></div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Masuk</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-kas-in" style="color:var(--emerald)">0</div></div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Keluar</div><div class="rk-skel-wrap"><div class="m-tile-v pv" id="m-kas-out" style="color:var(--crimson)">0</div></div></div></div>' +
    '<div class="pill-slider" id="m-kas-subnav"><button type="button" class="p-chip active" data-ksub="all">Semua</button><button type="button" class="p-chip" data-ksub="form">+ Catat</button><button type="button" class="p-chip" data-ksub="hist">Riwayat</button><button type="button" class="p-chip" data-ksub="debt">Utang</button></div>' +
    '<div class="card" id="m-kas-card-form"><div class="card-hd"><h2 class="card-title">Catat Transaksi</h2></div>' +
    '<form id="m-kas-form" class="stack" style="gap:10px" novalidate>' +
    '<div class="seg" style="width:100%"><button type="button" class="seg-btn active" data-mktype="-" style="flex:1">&minus; Keluar</button><button type="button" class="seg-btn" data-mktype="+" style="flex:1">+ Masuk</button></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-kas-amt">Nominal (Rp)</label><input class="input mono" id="m-kas-amt" type="text" inputmode="numeric" data-num-fmt="rp" data-slider-sync="m-kas-slider" placeholder="50.000" required /></div>' +
    '<div class="field"><span class="field-label">Tanggal</span>' + mobDateFieldHtml('m-kas-date', '', true) + '</div></div>' +
    '<div class="slider-wrap"><div class="slider-hd"><span style="font-weight:700">Atur Cepat Nominal</span><span class="slider-val-pill pv" id="m-kas-amt-readout">Rp 0</span></div>' +
    '<input type="range" class="modern-slider" id="m-kas-slider" min="0" max="5000000" step="25000" value="0" data-num-target="m-kas-amt" /></div>' +
    '<div class="pill-slider"><button type="button" class="p-chip m-qamt" data-amt="25000">+25rb</button><button type="button" class="p-chip m-qamt" data-amt="50000">+50rb</button><button type="button" class="p-chip m-qamt" data-amt="100000">+100rb</button><button type="button" class="p-chip m-qamt" data-amt="500000">+500rb</button><button type="button" class="p-chip m-qamt" data-amt="1000000">+1jt</button></div>' +
    '<div class="field"><span class="field-label">Kategori</span><div class="bento-2" id="m-kas-cat-pills"></div></div>' +
    '<div class="field"><label class="field-label" for="m-kas-note">Catatan</label><input class="input" id="m-kas-note" maxlength="80" placeholder="Contoh: Makan siang" required /></div>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:0.78rem;color:var(--text-secondary)"><input type="checkbox" id="m-kas-debt" /> Utang / Piutang</label>' +
    '<div class="bento-2" id="m-kas-debt-box" style="display:none"><div class="field"><label class="field-label" for="m-kas-debt-name">Nama Orang / Utang</label><input class="input" id="m-kas-debt-name" maxlength="40" placeholder="mis. Budi" /></div>' +
    '<div class="field"><label class="field-label" for="m-kas-debt-kind">Jenis</label><select class="input" id="m-kas-debt-kind"><option value="piutang">Piutang</option><option value="utang">Utang</option></select></div></div>' +
    '<button type="submit" class="btn btn-primary" style="width:100%">Simpan Transaksi</button></form></div>' +
    '<div class="card" id="m-kas-card-debt"><div class="card-hd"><h2 class="card-title">Utang &amp; Piutang</h2></div><div class="stack" style="gap:8px" id="m-debt-list"></div></div>' +
    '<div class="card" id="m-kas-card-hist"><div class="card-hd"><h2 class="card-title">Riwayat Transaksi</h2><button type="button" class="btn btn-secondary btn-sm" id="m-kas-flt-reset">Reset</button></div>' +
    '<div class="stack" style="gap:8px;margin-bottom:10px"><div class="m-kas-flt-row">' +
    '<div class="mselect" id="m-kas-cat-ms"><select class="input" id="m-kas-flt-cat" style="display:none"><option value="all">Semua Kategori</option></select>' +
    '<button type="button" class="mselect-trigger" id="m-kas-cat-trig" aria-haspopup="listbox" aria-expanded="false"><span class="mselect-val" id="m-kas-cat-val">Semua Kategori</span><svg class="mselect-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></button>' +
    '<div class="mselect-menu" id="m-kas-cat-menu" role="listbox"></div></div>' +
    '<div class="seg" style="width:100%"><button type="button" class="seg-btn active" data-mkfdir="all" style="flex:1">Semua</button><button type="button" class="seg-btn" data-mkfdir="+" style="flex:1">+</button><button type="button" class="seg-btn" data-mkfdir="-" style="flex:1">&minus;</button></div></div>' +
    '<input class="input" id="m-kas-search" type="search" placeholder="Cari transaksi..." /></div>' +
    '<div class="stack" style="gap:7px" id="m-kas-hist-list"></div></div>' +
    '</div></section>' +
    // TAB 3: JADWAL & KELOLA ITEM TERPADU
    '<section class="tab-panel" id="m-tab-jadwal"><div class="stack">' +
    '<div class="pill-slider" id="m-jadwal-subnav">' +
    '<button type="button" class="p-chip active" data-mjsub="list">Jadwal Tagihan</button>' +
    '<button type="button" class="p-chip" data-mjsub="add">+ Tambah Item</button>' +
    '<button type="button" class="p-chip" data-mjsub="manage">Daftar Item (<span id="m-item-cnt">0</span>)</button></div>' +
    '<div id="m-jad-pane-list" class="stack">' +
    '<div class="bento-2"><div class="m-tile"><div class="m-tile-k">Sudah Dibayar</div><div class="m-tile-v pv" id="m-jad-paid-amt" style="color:var(--emerald)">Rp 0</div><div class="m-tile-s" id="m-jad-paid-cnt">0/0 lunas</div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Belum Dibayar</div><div class="m-tile-v pv" id="m-jad-unpaid-amt" style="color:var(--amber)">Rp 0</div><div class="m-tile-s" id="m-jad-unpaid-cnt">0 sisa</div></div></div>' +
    '<div class="pill-slider" id="m-jadwal-months"></div>' +
    '<div class="seg" style="width:100%" role="group" aria-label="Filter status item">' +
    '<button type="button" class="seg-btn active" data-mjfilter="all" style="flex:1">Semua <span id="m-jf-all">0</span></button>' +
    '<button type="button" class="seg-btn" data-mjfilter="unpaid" style="flex:1">Belum <span id="m-jf-unpaid">0</span></button>' +
    '<button type="button" class="seg-btn" data-mjfilter="paid" style="flex:1">Lunas <span id="m-jf-paid">0</span></button></div>' +
    '<div class="stack" style="gap:8px" id="m-jadwal-list"></div>' +
    '<div class="card" id="m-jadwal-tfoot" style="background:var(--bg-subtle)"></div></div>' +
    '<div id="m-jad-pane-add" class="stack sec-hidden">' +
    '<div class="card" style="background:linear-gradient(135deg, var(--accent-soft), var(--emerald-soft))"><div class="card-hd"><h2 class="card-title">⚡ Tambah Cepat</h2></div>' +
    '<div class="pill-slider" style="margin-bottom:8px"><button type="button" class="p-chip m-qp-ex" data-qp="Netflix 186k tiap tgl 15">Netflix 186k tgl 15</button><button type="button" class="p-chip m-qp-ex" data-qp="Listrik 450k tiap tgl 20">Listrik 450k tgl 20</button><button type="button" class="p-chip m-qp-ex" data-qp="Gym 300k tiap 2 minggu">Gym 300k/2mg</button></div>' +
    '<div style="display:flex;gap:6px"><input class="input" id="m-qp-input" placeholder="Netflix 186k tiap tgl 15" style="flex:1" /><button type="button" class="btn btn-primary" id="m-qp-submit">＋</button></div>' +
    '<div id="m-qp-prev" style="font-size:0.72rem;margin-top:7px;color:var(--text-secondary)"></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title" id="m-item-form-title">Tambah Item Berulang</h2>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-item-cancel" hidden>Batal</button></div>' +
    '<form id="m-item-form" class="stack" style="gap:10px" novalidate>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-item-name">Nama Item</label><input class="input" id="m-item-name" placeholder="WiFi Biznet" /></div>' +
    '<div class="field"><label class="field-label" for="m-item-price">Nominal (Rp)</label><input class="input mono" id="m-item-price" type="text" inputmode="numeric" data-num-fmt="rp" data-slider-sync="m-item-price-slider" placeholder="375.000" /></div></div>' +
    '<div class="slider-wrap"><div class="slider-hd"><span style="font-weight:700">Atur Cepat Harga</span><span class="slider-val-pill pv" id="m-item-price-ro">Rp 0</span></div>' +
    '<input type="range" class="modern-slider" id="m-item-price-slider" min="25000" max="5000000" step="25000" value="375000" data-num-target="m-item-price" /></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-item-unit">Siklus</label><select class="input" id="m-item-unit"><option value="bulan">Tiap 1 bulan</option><option value="28hari">Tiap 28 hari</option><option value="minggu">Tiap minggu</option><option value="hari">Tiap hari</option><option value="tahun">Tiap 1 tahun</option><option value="sekali">Sekali saja</option></select></div>' +
    '<div class="field"><span class="field-label">Tanggal</span>' + mobDateFieldHtml('m-item-start', '', true) + '</div></div>' +
    '<div class="bento-2" id="m-item-cat-pills"></div><button type="submit" class="btn btn-primary" id="m-item-save-btn">Simpan Item</button></form></div>' +
    '</div>' +
    '<div id="m-jad-pane-manage" class="stack sec-hidden">' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Daftar Item Aktif</h2><button type="button" class="btn btn-secondary btn-sm" id="m-btn-copy-next">Salin Tahun +1</button></div><div class="stack" style="gap:7px" id="m-manage-items"></div></div>' +
    '</div>' +
    '</div></section>' +
    // TAB 5: SIMULASI
    '<section class="tab-panel" id="m-tab-sim"><div class="stack">' +
    '<div class="bento-3"><div class="m-tile"><div class="m-tile-k">Asli Des</div><div class="m-tile-v pv" id="m-sim-base">Rp 0</div></div>' +
    '<div class="m-tile" style="background:var(--emerald-soft);border-color:var(--emerald-border)"><div class="m-tile-k" style="color:var(--emerald)">Simulasi</div><div class="m-tile-v pv" id="m-sim-end">Rp 0</div></div>' +
    '<div class="m-tile"><div class="m-tile-k">Selisih</div><div class="m-tile-v pv" id="m-sim-delta" style="color:var(--accent-ink)">Rp 0</div></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Kurva Simulasi</h2><div style="display:flex;gap:5px"><button type="button" class="btn btn-secondary btn-sm" id="m-btn-clear-sim">Reset</button><button type="button" class="btn btn-emerald btn-sm" id="m-btn-apply-sim">Terapkan</button></div></div>' +
    '<div class="chart-stage"><svg id="m-svg-sim-chart" viewBox="0 0 340 190" style="width:100%;height:auto;display:block"></svg></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Skenario Aktif</h2></div><div class="stack" style="gap:7px" id="m-sim-list"></div></div>' +
    '<div class="card"><div class="card-hd"><h2 class="card-title">Tambah Skenario</h2></div>' +
    '<form id="m-sim-form" class="stack" style="gap:10px" novalidate>' +
    '<select class="input" id="m-sim-kind"><option value="out">− Pengeluaran / Cicilan Baru</option><option value="in">+ Pemasukan / Hemat</option></select>' +
    '<input class="input" id="m-sim-title" maxlength="30" placeholder="mis. Cicilan motor / Bonus" required />' +
    '<div class="field"><label class="field-label" for="m-sim-price">Nominal per Bulan (Rp)</label><input class="input mono" id="m-sim-price" type="text" inputmode="numeric" data-num-fmt="rp" data-slider-sync="m-sim-slider" placeholder="500.000" required /></div>' +
    '<div class="slider-wrap"><div class="slider-hd"><span style="font-weight:700">Geser Nominal</span><span class="slider-val-pill pv" id="m-sim-readout">Rp 500.000</span></div>' +
    '<input type="range" class="modern-slider" id="m-sim-slider" min="50000" max="10000000" step="50000" value="500000" data-num-target="m-sim-price" /></div>' +
    '<button type="submit" class="btn btn-primary">Tambahkan ke Simulasi</button></form></div>' +
    '</div></section>' +
    // TAB 6: PERJALANAN
    '<section class="tab-panel" id="m-tab-trip"><div class="stack" id="m-trip-root"></div></section>' +
    // TAB 7: PENGATURAN
    '<section class="tab-panel" id="m-tab-settings"><div class="stack">' +
    '<div class="card" id="m-card-settings-acct"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Akun &amp; Sinkron Cloud</h2><div style="font-size:0.71rem;color:var(--text-muted)" id="m-set-acct-status">● Mode Lokal</div></div><button type="button" class="btn btn-primary btn-sm" id="m-set-open-acct">Kelola</button></div></div>' +
    '<div class="card" id="m-card-settings-notif"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Pengaturan Notifikasi</h2><div style="font-size:0.71rem;color:var(--text-muted)">Pengingat otomatis tagihan jatuh tempo</div></div><span class="badge b-em" id="m-notif-perm-badge">Aktif</span></div>' +
    '<div class="stack" style="gap:8px">' +
    '<button type="button" class="btn m-notif-activate-btn" id="m-btn-notif-activate">🔔 Pencet, untuk aktifkan notifikasi</button>' +
    '<div id="m-notif-ios-hint" style="display:none;font-size:0.71rem;line-height:1.38;color:var(--text-secondary);padding:7px 9px;border-radius:9px;background:var(--bg-subtle)"></div>' +
    '<label class="switch-row"><span><strong>Pengingat Bar HP</strong></span><input type="checkbox" id="m-set-notif-enabled" checked /></label>' +
    '<div class="field"><label class="field-label" for="m-set-rmh">Tampilkan yang jatuh tempo dalam</label><select class="input" id="m-set-rmh"><option value="3">3 hari ke depan (H-3)</option><option value="7" selected>7 hari ke depan (H-7)</option><option value="14">14 hari ke depan</option><option value="30">30 hari ke depan</option></select></div>' +
    '<label class="switch-row"><span>Saat tepat jatuh tempo (Hari-H)</span><input type="checkbox" id="m-set-notif-today" checked /></label>' +
    '<label class="switch-row"><span>Mendekati jatuh tempo (sesuai horizon)</span><input type="checkbox" id="m-set-notif-soon" checked /></label>' +
    '<label class="switch-row"><span>Tagihan terlewat belum dibayar</span><input type="checkbox" id="m-set-notif-late" checked /></label>' +
    '<button type="button" class="btn btn-primary" id="m-btn-test-notif">🔔 Tes Notif Bar HP &amp; Izin Browser</button></div></div>' +
    '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Pengingat Tagihan</h2><div style="font-size:0.71rem;color:var(--text-muted)">Hari ini &amp; mendekati tempo</div></div><span class="badge b-am mono" id="m-rem-cnt-badge">0 item</span></div>' +
    '<div class="stack" style="gap:7px" id="m-settings-rem-list"></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-btn-mark-late" style="width:100%;margin-top:9px;display:none">✓ Tandai semua yang lewat sebagai lunas</button></div>' +
    '<div class="card" id="m-card-settings-backup"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Cadangan &amp; Ekspor Data</h2><div style="font-size:0.71rem;color:var(--text-muted)">Simpan salinan data ke perangkat</div></div></div>' +
    '<div class="bento-2" style="gap:8px">' +
    '<button type="button" class="list-row" style="justify-content:space-between;padding:9px 10px" data-mexp="json"><span>Cadangan</span><span class="badge b-ac">.JSON</span></button>' +
    '<button type="button" class="list-row" style="justify-content:space-between;padding:9px 10px" data-mexp="items"><span>Item Aktif</span><span class="badge b-em">.CSV</span></button>' +
    '<button type="button" class="list-row" style="justify-content:space-between;padding:9px 10px" data-mexp="bulan"><span>Bulanan</span><span class="badge b-em">.CSV</span></button>' +
    '<button type="button" class="list-row" style="justify-content:space-between;padding:9px 10px" data-mexp="ics"><span>Kalender</span><span class="badge b-nt">.ICS</span></button>' +
    '</div></div>' +
    '<div class="card" id="m-card-report"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Laporan Keuangan (PDF)</h2><div style="font-size:0.71rem;color:var(--text-muted)" id="m-rep-sub">Ringkasan kas &amp; tagihan</div></div>' +
    '<button type="button" class="btn btn-primary btn-sm" id="m-btn-dl-report">⬇ PDF</button></div>' +
    '<div class="pill-slider" id="m-rep-period-slider" style="margin-bottom:10px">' +
    '<button type="button" class="p-chip" data-mrep="d">Hari ini</button><button type="button" class="p-chip" data-mrep="w">Minggu ini</button><button type="button" class="p-chip active" data-mrep="m">Bulan ini</button><button type="button" class="p-chip" data-mrep="y">Tahun ini</button></div>' +
    '<div id="m-report-preview" class="stack" style="gap:10px"></div></div>' +
    '<div class="card" id="m-card-settings-update"><div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Pembaruan Aplikasi</h2><div style="font-size:0.71rem;color:var(--text-muted)">Rilis APK Android via GitHub Releases</div></div></div><div class="m-upd-status">Pembaruan hanya tersedia di aplikasi Android</div></div>' +
    '<div class="m-set-build-ver" id="m-set-build-ver">Versi build: ' + esc((typeof window !== 'undefined' && window.RK_BUILD && window.RK_BUILD.id) ? window.RK_BUILD.id : 'dev') + '</div>' +
    '</div></section>' +
    '</main>' +
    '<button type="button" class="rk-btt-btn" id="m-btt-btn" aria-label="Kembali ke atas" title="Kembali ke atas">↑ Atas</button>' +
    // 5-SLOT BOTTOM NAV WITH GOLD "+" FAB
    '<nav class="mob-bottom-nav" aria-label="Navigasi Aplikasi">' +
    '<button type="button" class="bn-btn active" data-mtab="rincian"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/></svg><span>Rincian</span></button>' +
    '<button type="button" class="bn-btn" data-mtab="kas"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/></svg><span>Transaksi</span></button>' +
    '<div class="bn-center-slot"><button type="button" class="bn-plus-fab" id="m-yr-btn-center" aria-label="Tahun, bulan saldo, dan saldo awal" title="Tahun, bulan saldo, dan saldo awal"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
    '<button type="button" class="bn-btn" data-mtab="jadwal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span>Jadwal</span></button>' +
    '<button type="button" class="bn-btn" id="m-btn-more"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg><span>Menu</span><span class="m-upd-dot" id="m-more-upd-dot" style="display:none" aria-hidden="true"></span></button>' +
    '</nav>' +
    '<div class="phone-home-indicator" aria-hidden="true"></div>' +
    // SHEETS & POPOVERS (tidak memakai kelas .modal agar tidak bercampur dengan modal Browser Mode)
    '<div class="modal-backdrop" id="m-sheet-more"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><strong style="font-size:0.92rem">Menu &amp; Fitur Lain</strong><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-more">Tutup</button></div>' +
    '<div class="ms-body">' +
    '<button type="button" class="list-row" data-mgo="settings"><span><span class="m-upd-dot" id="m-upd-dot" style="display:none" aria-hidden="true"></span><strong>Pengaturan</strong> &middot; Notifikasi, akun, cadangan</span><span class="badge b-am" id="m-menu-cnt-rem">0 tempo</span></button>' +
    '<button type="button" class="list-row" data-mgo="sim"><span><strong>Simulasi</strong> &middot; Uji skenario saldo</span><span class="badge b-em" id="m-menu-cnt-sim">0 aktif</span></button>' +
    '<button type="button" class="list-row" data-mgo="trip"><span><strong>Perjalanan</strong> &middot; <span id="m-menu-trip-lbl">Kelola trip</span></span><span class="badge b-nt" id="m-menu-cnt-trip">0 trip</span></button>' +
    '<button type="button" class="list-row" id="m-menu-theme"><span><strong>Tema Tampilan</strong></span><span class="badge b-nt" id="m-menu-thm-lbl">Terang</span></button>' +
    '</div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-cf-zoom"><div class="modal-sheet cf-zoom-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><div><strong class="card-title">Kondisi Kas Realtime</strong><div style="font-size:0.72rem;color:var(--text-muted)" class="mono pv" id="m-cf-zoom-sub">Geser grafik ke kanan/kiri · ketuk titik untuk pin</div></div>' +
    '<div style="display:flex;gap:5px;flex-shrink:0"><button type="button" class="btn btn-secondary btn-sm" id="m-cf-zoom-wide">🔍 Perlebar</button><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-cf-zoom">✕ Tutup</button></div></div>' +
    '<div class="ms-body" style="gap:8px;padding:12px 12px 16px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">' +
    '<div class="seg" role="group" aria-label="Rentang Grafik Zoom">' +
    '<button type="button" class="seg-btn" data-mzoom-range="w">Minggu</button>' +
    '<button type="button" class="seg-btn active" data-mzoom-range="m">Bulan</button>' +
    '<button type="button" class="seg-btn" data-mzoom-range="y">Tahun</button></div>' +
    '<div class="seg" id="m-cf-zoom-touch-seg" style="display:none" role="group" aria-label="Mode Sentuh">' +
    '<button type="button" class="seg-btn active" data-mzmode="scrub">👆 Garis</button>' +
    '<button type="button" class="seg-btn" data-mzmode="pan">✋ Geser</button></div>' +
    '<div class="cf-legend-bar" style="margin-bottom:0">' +
    '<span class="cf-legend-item"><span class="cf-legend-dot" style="background:var(--accent)"></span>Saldo Hari Ini</span>' +
    '<span class="cf-legend-item"><span class="cf-legend-dot" style="background:var(--emerald)"></span>Masa Depan</span>' +
    '<span class="cf-legend-item"><span class="cf-legend-dot" style="background:var(--crimson)"></span>&lt; Rp 0</span></div></div>' +
    '<div class="cf-zoom-stage" id="m-cf-zoom-stage"><div class="cf-zoom-scroll" id="m-cf-zoom-wrap"><svg id="m-svg-cf-zoom" viewBox="0 0 600 320"></svg></div><div class="hud-tooltip" id="m-cf-zoom-tip"></div></div>' +
    '<div class="slider-wrap" style="margin-top:2px"><div class="slider-hd"><span style="font-size:0.71rem;color:var(--text-muted);font-weight:700">Geser garis grafik</span><span style="font-size:0.69rem;color:var(--accent-ink);font-weight:700" id="m-cf-zoom-scrub-lbl">Sentuh grafik atau geser &harr;</span></div>' +
    '<input type="range" class="modern-slider" id="m-cf-zoom-scrub" min="0" max="100" step="1" value="50" /></div>' +
    '<div id="m-cf-zoom-insp" style="display:none;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:10px;background:var(--bg-subtle);font-size:0.74rem"></div>' +
    '</div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-periode"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><div><strong class="card-title">Tahun, bulan saldo, saldo awal</strong><div style="font-size:0.72rem;color:var(--text-muted)" class="mono pv" id="m-cfg-sum">-</div></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-periode">✕</button></div>' +
    '<div class="ms-body"><div class="field"><span class="field-label">Pilih / Kelola Tahun</span><div style="display:flex;gap:6px;flex-wrap:wrap" id="m-yr-pills"></div></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-cfg-year">Tahun</label><input class="input mono" id="m-cfg-year" type="number" min="1900" max="2200" /></div>' +
    '<div class="field"><label class="field-label" for="m-cfg-sm">Bulan saldo</label><select class="input" id="m-cfg-sm"></select></div></div>' +
    '<div class="field"><label class="field-label" for="m-cfg-saldo">Saldo awal (Rp)</label><input class="input mono" id="m-cfg-saldo" type="text" inputmode="numeric" data-num-fmt="rp" data-slider-sync="m-cfg-saldo-slider" placeholder="25.000.000" /></div>' +
    '<div class="slider-wrap"><div class="slider-hd"><span style="font-weight:700">Atur Cepat Saldo</span><span class="slider-val-pill pv" id="m-cfg-saldo-ro">Rp 0</span></div>' +
    '<input type="range" class="modern-slider" id="m-cfg-saldo-slider" min="0" max="50000000" step="100000" value="0" data-num-target="m-cfg-saldo" /></div></div>' +
    '<div class="ms-foot"><button type="button" class="btn btn-crimson btn-sm" id="m-cfg-del" style="margin-right:auto">Hapus Tahun</button>' +
    '<button type="button" class="btn btn-secondary" data-mclose="m-sheet-periode">Tutup</button><button type="button" class="btn btn-primary" id="m-cfg-save">Simpan</button></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-chip"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><div><strong id="m-cp-title">Tagihan</strong><div style="font-size:0.73rem;color:var(--text-muted)" id="m-cp-sub">Rp 0</div></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-chip">✕</button></div>' +
    '<div class="ms-body"><button type="button" class="list-row" data-cp-act="paid" style="color:var(--emerald);font-weight:700">✓ Tandai sudah dibayar</button>' +
    '<button type="button" class="list-row" data-cp-act="unpaid">○ Tandai belum dibayar</button>' +
    '<button type="button" class="list-row" data-cp-act="skip" style="color:var(--text-muted)">⊘ Lewati tagihan ini</button>' +
    '<button type="button" class="list-row" data-cp-act="edit" style="color:var(--accent-ink);font-weight:700">✎ Ubah harga / geser jadwal...</button></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-scenario"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><div><strong class="card-title" id="m-ms-title">Ubah Harga / Jadwal</strong><div style="font-size:0.70rem;color:var(--text-muted)">Pilih penyesuaian tanpa merusak catatan lama</div></div><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-scenario">✕</button></div>' +
    '<div class="ms-body" style="gap:11px"><div class="m-scen-grid" id="m-scen-tabs">' +
    '<button type="button" class="m-scen-card active" data-mscen="change_price"><strong>Harga berubah</strong><span>Mulai bulan tertentu</span></button>' +
    '<button type="button" class="m-scen-card" data-mscen="temp_price"><strong>Harga sementara</strong><span>Promo rentang bulan</span></button>' +
    '<button type="button" class="m-scen-card" data-mscen="cycle"><strong>Ganti siklus</strong><span>Bulanan / 28 hari / tahun</span></button>' +
    '<button type="button" class="m-scen-card" data-mscen="shift"><strong>Geser tanggal</strong><span>Undur / majukan tanggal</span></button>' +
    '<button type="button" class="m-scen-card full-span" data-mscen="stop"><strong>Berhenti bayar</strong><span>Setop mulai bulan tertentu</span></button></div>' +
    '<div id="m-scen-fields" class="stack" style="gap:10px"></div><div id="m-ms-err" style="color:var(--crimson);font-size:0.74rem;font-weight:600"></div></div>' +
    '<div class="ms-foot"><button type="button" class="btn btn-secondary" data-mclose="m-sheet-scenario">Batal</button><button type="button" class="btn btn-primary" id="m-btn-save-scen">Simpan</button></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-trip"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><strong class="card-title" id="m-kpt-title">Perjalanan Baru</strong><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-trip">✕</button></div>' +
    '<form id="m-trip-meta-form" style="display:flex;flex-direction:column;min-height:0;flex:1" novalidate><div class="ms-body">' +
    '<div class="field"><label class="field-label" for="m-kp-name">Nama perjalanan</label><input class="input" id="m-kp-name" maxlength="30" placeholder="mis. Tokyo - Osaka 9D8N" required /></div>' +
    '<div class="bento-2"><div class="field"><span class="field-label">Mulai</span>' + mobDateFieldHtml('m-kp-start', '', false) + '</div>' +
    '<div class="field"><span class="field-label">Selesai</span>' + mobDateFieldHtml('m-kp-end', '', true) + '</div></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-kp-use-budget">Anggaran</label><select class="input" id="m-kp-use-budget"><option value="0">Belum ditentukan</option><option value="1" selected>Tetapkan anggaran</option></select></div>' +
    '<div class="field" id="m-kp-budget-wrap"><label class="field-label" for="m-kp-budget">Anggaran (Rp)</label><input class="input mono" id="m-kp-budget" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="10.000.000" /></div></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-kp-cur">Mata uang asing</label><input class="input" id="m-kp-cur" maxlength="3" placeholder="JPY" style="text-transform:uppercase" /></div>' +
    '<div class="field"><label class="field-label" for="m-kp-rate">Kurs (Rp / 1 unit)</label><input class="input mono" id="m-kp-rate" type="number" step="0.01" placeholder="108.5" /></div></div></div>' +
    '<div class="ms-foot"><button type="button" class="btn btn-secondary" data-mclose="m-sheet-trip">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div></form></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-backup"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><strong class="card-title">Cadangan &amp; Ekspor</strong><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-backup">✕</button></div>' +
    '<div class="ms-body"><button type="button" class="list-row" data-mexp="json"><span>Cadangan Lengkap</span><span class="badge b-ac">.JSON</span></button>' +
    '<button type="button" class="list-row" data-mexp="items"><span>Item Tahun Ini</span><span class="badge b-em">.CSV</span></button>' +
    '<button type="button" class="list-row" data-mexp="bulan"><span>Rincian Bulanan</span><span class="badge b-em">.CSV</span></button>' +
    '<button type="button" class="list-row" data-mexp="ics"><span>Kalender Pengingat</span><span class="badge b-nt">.ICS</span></button></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-acct"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><div style="display:flex;align-items:center;gap:10px"><span class="rk-brand-tile" style="width:32px;height:32px" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#rk-brand-symbol"/></svg></span><strong class="card-title">Akun &amp; Sinkron Cloud</strong></div><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-acct">✕</button></div>' +
    '<div class="ms-body" id="m-acct-body"></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-trip-share"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><strong class="card-title">Bagikan Itinerary</strong><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-trip-share" aria-label="Tutup">✕</button></div>' +
    '<div class="ms-body">' +
    '<label class="m-sh-check"><input type="checkbox" id="m-sh-inc-cost" checked /><span>Sertakan rincian biaya</span></label>' +
    '<div class="stack" style="gap:8px">' +
    '<button type="button" class="btn btn-primary" data-msh="wa">Kirim teks (WhatsApp)</button>' +
    '<button type="button" class="btn btn-secondary" data-msh="copy">Salin teks</button>' +
    '<button type="button" class="btn btn-secondary" data-msh="pdf">Simpan / bagikan PDF</button></div>' +
    '<div class="m-sh-status" id="m-sh-status" role="status" aria-live="polite"></div></div>' +
    '<div class="ms-foot"><button type="button" class="btn btn-secondary" data-mclose="m-sheet-trip-share">Tutup</button></div></div></div>' +
    '<div class="modal-backdrop" id="m-sheet-trip-xl"><div class="modal-sheet"><div class="ms-handle"></div>' +
    '<div class="ms-head"><strong class="card-title">Impor dari Excel</strong><button type="button" class="btn btn-secondary btn-sm" data-mclose="m-sheet-trip-xl" aria-label="Tutup">✕</button></div>' +
    '<form id="m-trip-xl-form" style="display:flex;flex-direction:column;min-height:0;flex:1" novalidate><div class="ms-body">' +
    '<div class="m-xl-summary pv" id="m-xl-summary"></div>' +
    '<div class="field"><label class="field-label" for="m-xl-name">Nama perjalanan</label><input class="input" id="m-xl-name" maxlength="30" placeholder="mis. Tokyo - Osaka" required /></div>' +
    '<div class="bento-2"><div class="field"><label class="field-label" for="m-xl-cur">Mata uang</label><input class="input" id="m-xl-cur" maxlength="3" placeholder="JPY" style="text-transform:uppercase" /></div>' +
    '<div class="field"><label class="field-label" for="m-xl-rate">Kurs (Rp / 1 unit)</label><input class="input mono" id="m-xl-rate" type="number" step="0.01" placeholder="110" /></div></div>' +
    '<div class="m-xl-err" id="m-xl-err" role="alert"></div></div>' +
    '<div class="ms-foot"><button type="button" class="btn btn-secondary" data-mclose="m-sheet-trip-xl">Batal</button><button type="submit" class="btn btn-primary" id="m-xl-submit">Impor</button></div></form></div></div>' +
    '<input type="file" id="m-xl-file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" hidden />' +
    '<div class="notif-popover" id="m-notif-popover"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:800;font-size:0.82rem">Pengingat Jatuh Tempo</span>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-pop-to-set">Atur Notif &rarr;</button></div><div id="m-pop-os-cta"></div><div class="stack" style="gap:7px" id="m-notif-pop-list"></div>' +
    '<button type="button" class="btn btn-primary btn-sm" style="width:100%;margin-top:8px" id="m-pop-preview">🔔 Preview Notif di Bar HP</button></div>' +
    '<div class="toast-box" id="m-toast-box" role="status" aria-live="polite"></div>' +
    '</div></div></div>'
  );
}

function rkSyncMobScrollUi() {
  var mm = $('m-main');
  var sy = (mm ? mm.scrollTop : 0) || (typeof window !== 'undefined' ? (window.scrollY || 0) : 0);
  var tb = document.querySelector('#mobile-app-shell .mob-topbar');
  if (tb) tb.classList.toggle('is-scrolled', sy > 8);
  var hb = document.querySelector('#mobile-app-shell .apk-header-block');
  if (hb) hb.classList.toggle('is-scrolled', sy > 8);
  var btt = $('m-btt-btn');
  if (btt) btt.classList.toggle('is-visible', sy > 280);
}

function rkInitCapacitorStatusBar() {
  if (typeof window === 'undefined' || !window.Capacitor) return;
  if (typeof window.Capacitor.isNativePlatform === 'function' && !window.Capacitor.isNativePlatform()) return;
  if (window._rkCapSbInit) return;
  window._rkCapSbInit = true;
  try {
    var sb = window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar;
    if (sb) {
      if (typeof sb.setOverlaysWebView === 'function') sb.setOverlaysWebView({ overlay: true }).catch(function () {});
      if (typeof sb.setStyle === 'function') sb.setStyle({ style: 'DARK' }).catch(function () {});
      if (typeof sb.setBackgroundColor === 'function') sb.setBackgroundColor({ color: '#00000000' }).catch(function () {});
    }
    if (typeof document !== 'undefined' && document.body && typeof getComputedStyle === 'function') {
      var probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top, 0px);pointer-events:none;visibility:hidden;';
      document.body.appendChild(probe);
      var sat = parseFloat(getComputedStyle(probe).height) || 0;
      probe.remove();
      if (sat <= 0) {
        if (sb && typeof sb.getInfo === 'function') {
          sb.getInfo().then(function (info) {
            var h = info && Number(info.height);
            document.documentElement.style.setProperty('--rk-safe-top', (h > 0 ? h : 28) + 'px');
            if (typeof rkSyncHeaderMotif === 'function') rkSyncHeaderMotif();
          }).catch(function () {
            document.documentElement.style.setProperty('--rk-safe-top', '28px');
          });
        } else {
          document.documentElement.style.setProperty('--rk-safe-top', '28px');
        }
      }
    }
  } catch (e) {}
}

var _rkLastBackAt = 0;

function rkIsCapacitorNative() {
  if (typeof window === 'undefined' || !window.Capacitor) return false;
  if (typeof window.Capacitor.isNativePlatform === 'function') {
    return !!window.Capacitor.isNativePlatform();
  }
  return true;
}

function rkHandleAndroidBack() {
  if (!rkIsCapacitorNative()) return false;
  if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return false;

  // 1. Tutup popover / dropdown yang terbuka (Akun, notifikasi, kalender/dropdown)
  var ap = $('m-acct-popover');
  if (ap && ap.classList.contains('open')) {
    ap.classList.remove('open');
    if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
    return 'popover-acct';
  }
  var np = $('m-notif-popover');
  if (np && np.classList.contains('open')) {
    np.classList.remove('open');
    if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
    return 'popover-notif';
  }
  var dd = document.querySelector('#mobile-app-shell .mcal-pop.open, #mobile-app-shell .open[id$="-cal"], #mobile-app-shell .cat-drop.open');
  if (dd) {
    dd.classList.remove('open');
    return 'dropdown';
  }

  // 2. Tutup dialog konfirmasi / modal yang terbuka
  var dlg = document.querySelector('#cf:not([hidden]), #lg:not([hidden]), .modal:not([hidden])');
  if (dlg) {
    var closeBtn = dlg.querySelector('#lgc, #yr-close, #qtx-close, #kpf-close, #rep-m-cl, [data-cf="later"], [data-close-modal]');
    if (closeBtn) closeBtn.click();
    if (!dlg.hidden) {
      if (typeof brCloseModal === 'function' && dlg.id) brCloseModal(dlg.id);
      else {
        dlg.classList.remove('open');
        dlg.hidden = true;
      }
    }
    return 'modal';
  }

  // 3. Tutup bottom sheet yang terbuka (pakai mobCloseSheet agar animasi Fase 2 & reduced-motion terjaga)
  var sheet = document.querySelector('#mobile-app-shell .modal-backdrop.open');
  if (sheet && sheet.id) {
    mobCloseSheet(sheet.id);
    return 'sheet';
  }

  // 4. Jika di tab selain Rincian: kembali ke tab Rincian
  if ((MOB_STATE.tab || 'rincian') !== 'rincian') {
    switchMobileTab('rincian');
    return 'tab-rincian';
  }

  // 5. Di Rincian tanpa overlay: tekan dua kali dalam 2 detik untuk keluar
  var now = Date.now();
  if (now - _rkLastBackAt < 2000) {
    _rkLastBackAt = 0;
    var appPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (appPlugin && typeof appPlugin.exitApp === 'function') appPlugin.exitApp();
    return 'exit';
  }
  _rkLastBackAt = now;
  showMobToast('Tekan lagi untuk keluar');
  return 'toast-exit';
}

function rkInitCapacitorBackButton() {
  if (!rkIsCapacitorNative()) return;
  if (window._rkCapBackBound) return;
  var appPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!appPlugin || typeof appPlugin.addListener !== 'function') return;
  window._rkCapBackBound = true;
  appPlugin.addListener('backButton', function () {
    rkHandleAndroidBack();
  });
}

if (typeof window !== 'undefined') {
  window.rkHandleAndroidBack = rkHandleAndroidBack;
  window.rkInitCapacitorBackButton = rkInitCapacitorBackButton;
}

function ensureMobileShell() {
  var root = $('mobile-app-shell');
  if (!root) return null;
  if (!root.querySelector('.mob-shell')) {
    root.innerHTML = mobShellTemplate();
    setMobPhoneFrame(mobDefaultFrame());
    rkInitCapacitorStatusBar();
    rkInitCapacitorBackButton();
    bindMobileShellEvents(root);
    if (rkIsCapacitorNative() && !window._rkUpdAutoScheduled) {
      window._rkUpdAutoScheduled = true;
      setTimeout(function () {
        if (typeof rkCleanupApkCacheOnStart === 'function') rkCleanupApkCacheOnStart();
        if (typeof rkAutoCheckApkUpdate === 'function') rkAutoCheckApkUpdate(false);
      }, 1500);
    }
    var mm = $('m-main');
    if (mm && !mm._mobScrollBound) {
      mm._mobScrollBound = true;
      mm.addEventListener('scroll', rkSyncMobScrollUi, { passive: true });
    }
    rkSyncMobScrollUi();
    if (typeof window !== 'undefined' && !window._rkMobResizeMotifBound) {
      window._rkMobResizeMotifBound = true;
      window.addEventListener('resize', function () {
        if (typeof rkSyncHeaderMotif === 'function') rkSyncHeaderMotif();
      }, { passive: true });
    }
  }
  var ms = root.querySelector('.mob-shell');
  if (ms) ms.setAttribute('data-mtab-active', MOB_STATE.tab || 'rincian');
  if (typeof rkSyncHeaderMotif === 'function') rkSyncHeaderMotif(MOB_STATE.tab || 'rincian');
  return root;
}

function switchMobileTab(tabId) {
  if (tabId === 'item') {
    tabId = 'jadwal';
    MOB_STATE.jadwalSub = 'add';
  }
  var prevMobTab = MOB_STATE.tab;
  MOB_STATE.tab = tabId;
  if (tabId === 'trip' && prevMobTab !== 'trip') {
    MOB_STATE.tripView = 'list';
    MOB_STATE.tripEditIt = null;
    MOB_STATE.tripEditBk = null;
    MOB_STATE.tripGoalEdit = false;
  }
  var ms = document.querySelector('#mobile-app-shell .mob-shell');
  if (ms) ms.setAttribute('data-mtab-active', tabId);
  if (typeof rkSyncHeaderMotif === 'function') rkSyncHeaderMotif(tabId);
  if ($('m-acct-popover') && $('m-acct-popover').classList.contains('open')) {
    $('m-acct-popover').classList.remove('open');
    if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
  }
  document.querySelectorAll('#mobile-app-shell .tab-panel').forEach(function (el) {
    el.classList.toggle('active', el.id === 'm-tab-' + tabId);
  });
  document.querySelectorAll('#mobile-app-shell .mob-bottom-nav [data-mtab]').forEach(function (b) {
    var on = b.getAttribute('data-mtab') === tabId;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  var mb = $('m-btn-more');
  if (mb) {
    var moreOn = ['sim', 'trip', 'settings'].indexOf(tabId) >= 0;
    mb.classList.toggle('active', moreOn);
    if (moreOn) mb.setAttribute('aria-current', 'page');
    else mb.removeAttribute('aria-current');
  }
  var mm = $('m-main');
  if (mm) mm.scrollTop = 0;
  rkSyncMobScrollUi();
  renderMobileTab(tabId);
  initMobDragSliders();
  mobPaintAllSliders();
  if (typeof rkEnhanceCheckboxes === 'function') rkEnhanceCheckboxes($('mobile-app-shell'));
  if (typeof rkSyncSegPills === 'function') rkSyncSegPills($('mobile-app-shell'), false);
  if (prevMobTab !== tabId && typeof rkScheduleEntrance === 'function') rkScheduleEntrance('mobile-app', tabId);
}

function renderMobileTab(tabId) {
  if (tabId === 'rincian') renderMobRincian();
  else if (tabId === 'kas') renderMobKas();
  else if (tabId === 'jadwal') renderMobJadwal();
  else if (tabId === 'sim') renderMobSim();
  else if (tabId === 'trip') renderMobTrip();
  else if (tabId === 'settings') renderMobSettings();
}

function renderMobRincian() {
  var c = calc(),
    y = +S.year,
    R = c.rows,
    P = kasLinked(),
    KB = P ? kasBal(P) : { bal: S.saldo, A: { n: 0 } },
    rw = P ? kasRunway(P, KB.bal) : null,
    C = yearCash();

  if ($('m-hero-lbl')) $('m-hero-lbl').textContent = y + ' · ' + FULL_MON[smEff()];
  if ($('m-rincian-saldo')) {
    $('m-rincian-saldo').textContent = rp(KB.bal);
    $('m-rincian-saldo').style.color = KB.bal < 0 ? '#C93B3B' : '#0F172A';
  }
  if ($('m-hero-inc')) $('m-hero-inc').textContent = rp(C.inc || 0);
  if ($('m-hero-out')) $('m-hero-out').textContent = rp(C.out || 0);

  // Ringkasan KPI Slider
  var endEl = $('m-metric-end'),
    nMon = R.length || 1,
    jatah = c.end > 0 ? c.end / nMon : null;
  if (endEl) {
    endEl.textContent = rp(c.end);
    endEl.style.color = c.end < 0 ? 'var(--crimson)' : 'var(--emerald)';
  }
  if ($('m-metric-end-sub')) $('m-metric-end-sub').textContent = rw && rw.date ? 'Titik rendah ' + fmtD(rw.date) : 'Akhir Des ' + y;
  if ($('m-metric-jatah')) {
    $('m-metric-jatah').textContent = jatah != null ? mobFmtShort(jatah) + '/bln' : 'Habis';
    $('m-metric-jatah').style.color = jatah != null ? 'var(--emerald)' : 'var(--crimson)';
  }
  if ($('m-metric-jatah-sub')) $('m-metric-jatah-sub').textContent = jatah != null ? 'Untuk ' + nMon + ' bulan' : 'Saldo minus';
  if ($('m-metric-avg')) $('m-metric-avg').textContent = mobFmtShort(C.out / nMon);
  if ($('m-metric-tot')) $('m-metric-tot').textContent = 'Total ' + mobFmtShort(C.out);

  var paidCnt = 0,
    totCnt = 0,
    paidSum = 0;
  S.items.forEach(function (it) {
    occ(it, y).forEach(function (t) {
      var d = isoD(t),
        k = it.id + '|' + d;
      if (S.skip[k]) return;
      totCnt++;
      if (S.paid[k]) {
        paidCnt++;
        paidSum += priceAt(it, t);
      }
    });
  });
  if ($('m-metric-paid')) $('m-metric-paid').textContent = paidCnt + ' / ' + totCnt;
  if ($('m-metric-paid-sub')) $('m-metric-paid-sub').textContent = rp(paidSum);

  renderMobCashflowSvg(P, KB.bal);
  renderMobUpcoming();
  renderMobWhere(C);
  renderMobBarSvg(C);
  renderMobRecentTx(P);
}

function mobPosTip(wrap, tip, targetX, targetY, off) {
  if (!wrap || !tip) return;
  tip.classList.add('visible');
  var wW = wrap.clientWidth || 320,
    tipW = tip.offsetWidth || 180,
    tipH = tip.offsetHeight || 72,
    left = Math.max(4, Math.min(Math.max(4, wW - tipW - 4), targetX - tipW / 2)),
    top = targetY - tipH - (off || 12);
  if (top < 4) top = targetY + (off || 12);
  tip.style.left = left.toFixed(1) + 'px';
  tip.style.top = top.toFixed(1) + 'px';
}

function renderMobCashflowSvg(P, curBal) {
  var svg = $('m-svg-cashflow'),
    wrap = $('m-cf-wrap'),
    tip = $('m-cf-tooltip');
  if (!svg) return;
  if (typeof brSanitizeItems === 'function') brSanitizeItems();
  var pts = typeof brBuildCashflowPoints === 'function'
    ? brBuildCashflowPoints(MOB_STATE.cashRange)
    : [{ d: S.year + '-01-01', lbl: 'Awal', val: S.saldo, delta: 0, bill: 'Saldo awal', actual: true }, { d: S.year + '-12-31', lbl: '31 Des', val: calc().end, delta: 0, bill: 'Akhir tahun', actual: false }];

  var W = 340,
    H = 210,
    pL = 40,
    pR = 0,
    pT = 14,
    pB = 26;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.touchAction = 'none';
  var vals = pts.map(function (p) { return p.val; }).concat([0]),
    rawMin = Math.min.apply(null, vals),
    rawMax = Math.max.apply(null, vals),
    span = Math.max(400000, (rawMax - rawMin) * 0.16),
    minV = rawMin - span,
    maxV = rawMax + span;
  if (maxV === minV) maxV = minV + 100000;
  var yPos = function (v) { return pT + ((maxV - v) / (maxV - minV)) * (H - pT - pB); },
    xStep = (W - pL - pR) / Math.max(1, pts.length - 1),
    coords = pts.map(function (p, i) { return Object.assign({}, p, { idx: i, x: pL + i * xStep, y: yPos(p.val) }); }),
    samples = [];
  if (typeof brEvalCubicSeg === 'function') {
    for (var i = 0; i < coords.length - 1; i++) {
      for (var s = 0; s <= 20; s++) {
        samples.push(Object.assign(brEvalCubicSeg(coords[i], coords[i + 1], s / 20), { t: s / 20, p0: coords[i], p1: coords[i + 1] }));
      }
    }
  }
  var pathFn = typeof brCubicPath === 'function' ? brCubicPath : function (cs) { return cs.map(function (c, ix) { return (ix ? ' L ' : 'M ') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(''); };
  var zY = yPos(0),
    grid = '';
  for (var gi = 0; gi <= 4; gi++) {
    var gv = minV + ((maxV - minV) * gi) / 4, gy = yPos(gv);
    grid += '<line x1="' + pL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pR) + '" y2="' + gy.toFixed(1) + '" stroke="var(--border-subtle)" stroke-dasharray="3 3"/>' +
      '<text x="' + (pL - 5) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">' + mobFmtShort(Math.round(gv)) + '</text>';
  }
  if (minV < 0 && maxV > 0) {
    grid += '<rect x="' + pL + '" y="' + zY.toFixed(1) + '" width="' + (W - pL - pR) + '" height="' + Math.max(0, H - pB - zY).toFixed(1) + '" fill="var(--crimson)" opacity="0.10"/>' +
      '<line x1="' + pL + '" y1="' + zY.toFixed(1) + '" x2="' + (W - pR) + '" y2="' + zY.toFixed(1) + '" stroke="var(--crimson)" stroke-width="1.3" stroke-dasharray="4 3"/>';
  }
  var actualC = coords.filter(function (c) { return c.actual; }),
    futC = coords.filter(function (c) { return !c.actual; }),
    projC = (actualC.length ? [actualC[actualC.length - 1]] : []).concat(futC);
  var zeroPct = Math.max(0, Math.min(100, ((zY - pT) / Math.max(1, H - pT - pB)) * 100));
  var lblPosMob = function (x) { return Math.max(pL, Math.min(W - 22, x)); };
  var xShow = {}, xUsed = [];
  function markXLbl(idx) {
    if (idx < 0 || idx >= coords.length || xShow[idx]) return;
    var cx = lblPosMob(coords[idx].x);
    if (xUsed.some(function (ux) { return Math.abs(ux - cx) < 48; })) return;
    xShow[idx] = true;
    xUsed.push(cx);
  }
  coords.forEach(function (c, ix) { if (c.today) { xShow[ix] = true; xUsed.push(lblPosMob(c.x)); } });
  markXLbl(0);
  markXLbl(coords.length - 1);
  markXLbl(Math.floor((coords.length - 1) / 2));
  var mHitX = Math.max(0, pL - 8),
    mHitW = Math.min(W - mHitX, W - pL - pR + 16),
    mTodayCoord = coords.filter(function (c) { return c.today; })[0] || null,
    mTodayLine = mTodayCoord
      ? '<line class="cf-today-line rk-anim-today-line" x1="' + mTodayCoord.x.toFixed(1) + '" y1="' + pT + '" x2="' + mTodayCoord.x.toFixed(1) + '" y2="' + (H - pB) + '" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.5" pointer-events="none"/>'
      : '';
  svg.innerHTML =
    '<defs><linearGradient id="mDual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/><stop offset="' + zeroPct.toFixed(1) + '%" stop-color="var(--crimson)" stop-opacity="0.22"/></linearGradient></defs>' +
    grid +
    '<path class="rk-anim-fill-right" d="' + pathFn(coords) + ' L ' + coords[coords.length - 1].x.toFixed(1) + ' ' + Math.min(zY, H - pB).toFixed(1) + ' L ' + coords[0].x.toFixed(1) + ' ' + Math.min(zY, H - pB).toFixed(1) + ' Z" fill="url(#mDual)"/>' +
    mTodayLine +
    '<path id="m-cf-seg-glow" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="0.34" style="display:none;pointer-events:none"/>' +
    (actualC.length >= 2 ? '<path class="rk-anim-line" d="' + pathFn(actualC) + '" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round"/>' : '') +
    (projC.length >= 2 ? '<path d="' + pathFn(projC) + '" fill="none" stroke="var(--emerald)" stroke-width="2.8" stroke-dasharray="5 4" stroke-linecap="round"/>' : '') +
    '<g id="m-cf-ch" style="display:none;pointer-events:none"><line id="m-cf-cx" y1="' + pT + '" y2="' + (H - pB) + '" stroke="var(--accent)" stroke-width="1.3" stroke-dasharray="3 3"/><circle id="m-cf-cd" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/></g>' +
    coords.map(function (c, ix) {
      var showLbl = !!xShow[ix];
      var nodeX = c.today ? c.x : Math.min(W - 5.5, c.x);
      var lx = lblPosMob(c.x);
      var fillC = c.val < 0 ? 'var(--crimson)' : c.actual ? 'var(--accent)' : 'var(--emerald)';
      return '<circle class="cf-node' + (c.today ? ' is-today' : '') + '" cx="' + nodeX.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="' + (c.val < 0 || c.today ? 4.8 : 3.5) + '" fill="' + fillC + '" stroke="var(--bg-surface)" stroke-width="1.6"/>' +
        (showLbl ? '<text x="' + lx.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" fill="' + (c.today ? 'var(--accent-ink)' : 'var(--text-muted)') + '" font-size="8.8" font-weight="700" font-family="var(--font-mono)">' + esc(c.lbl) + '</text>' : '');
    }).join('') +
    '<rect id="m-cf-hit" x="' + mHitX + '" y="0" width="' + mHitW + '" height="' + H + '" fill="transparent" style="touch-action:none;cursor:ew-resize"/>';

  var hit = svg.querySelector('#m-cf-hit'),
    ch = svg.querySelector('#m-cf-ch'),
    cxEl = svg.querySelector('#m-cf-cx'),
    cdEl = svg.querySelector('#m-cf-cd'),
    glow = svg.querySelector('#m-cf-seg-glow');

  function inspectX(clientX) {
    if (!hit || !coords.length) return;
    var sR = svg.getBoundingClientRect(),
      wR = wrap ? wrap.getBoundingClientRect() : sR,
      sW = sR.width || 320,
      svgX = Math.max(coords[0].x, Math.min(coords[coords.length - 1].x, ((clientX - sR.left) / sW) * W)),
      nearN = coords.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, coords[0]),
      isPt = Math.abs(nearN.x - svgX) <= 12 || !samples.length,
      tPt = isPt ? nearN : samples.reduce(function (b, s) { return Math.abs(s.x - svgX) < Math.abs(b.x - svgX) ? s : b; }, samples[0]);
    if (ch) ch.style.display = 'block';
    if (cxEl) { cxEl.setAttribute('x1', tPt.x); cxEl.setAttribute('x2', tPt.x); }
    if (cdEl) { cdEl.setAttribute('cx', tPt.x); cdEl.setAttribute('cy', tPt.y); }
    if (glow) {
      glow.style.display = isPt ? 'none' : 'block';
      if (!isPt) glow.setAttribute('d', pathFn([tPt.p0, tPt.p1]));
    }
    var dispVal = Math.round(isPt ? nearN.val : tPt.val);
    if (tip && wrap) {
      tip.innerHTML = isPt
        ? '<strong>' + esc(nearN.lbl) + ' &middot; ' + esc(fmtD(nearN.d)) + '</strong><div class="mono pv" style="font-size:0.86rem;font-weight:800;color:' + (nearN.val < 0 ? 'var(--crimson)' : 'var(--text-primary)') + '">' + rp(nearN.val) + '</div><div style="color:var(--text-muted);font-size:0.68rem">' + esc(nearN.bill) + '</div>'
        : '<strong>' + esc(tPt.p0.lbl) + ' &rarr; ' + esc(tPt.p1.lbl) + '</strong><div class="mono pv" style="font-size:0.86rem;font-weight:800">' + rp(dispVal) + '</div><div style="color:var(--text-muted);font-size:0.68rem">Menuju ' + esc(tPt.p1.bill) + '</div>';
      mobPosTip(wrap, tip, (tPt.x / W) * sW + (sR.left - wR.left), (tPt.y / H) * (sR.height || H) + (sR.top - wR.top), 12);
    }
  }
  function hideMobCfHUD() {
    if (ch) ch.style.display = 'none';
    if (glow) glow.style.display = 'none';
    if (tip) tip.classList.remove('visible');
  }
  if (hit) {
    svg.style.touchAction = 'pan-y';
    hit.style.touchAction = 'pan-y';
    var mTState = { near: false, locked: null, sx: 0, sy: 0 };
    var isMobNearLine = function (cx, cy) {
      if (!coords.length) return false;
      var sR = svg.getBoundingClientRect(),
        sW = sR.width || W,
        sH = sR.height || H,
        svgX = Math.max(coords[0].x, Math.min(coords[coords.length - 1].x, ((cx - sR.left) / sW) * W)),
        svgY = ((cy - sR.top) / sH) * H,
        nearN = coords.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, coords[0]),
        tPt = Math.abs(nearN.x - svgX) <= 12 || !samples.length
          ? nearN
          : samples.reduce(function (b, s) { return Math.abs(s.x - svgX) < Math.abs(b.x - svgX) ? s : b; }, samples[0]);
      return Math.abs(svgY - tPt.y) * (sH / H) <= 24;
    };
    hit.addEventListener('mousemove', function (e) { inspectX(e.clientX); });
    hit.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') inspectX(e.clientX); });
    hit.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && e.buttons) inspectX(e.clientX); });
    hit.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      var t0 = e.touches[0];
      mTState.sx = t0.clientX;
      mTState.sy = t0.clientY;
      mTState.locked = null;
      mTState.near = isMobNearLine(t0.clientX, t0.clientY);
      if (mTState.near) inspectX(t0.clientX);
    }, { passive: true });
    hit.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches[0]) return;
      var t0 = e.touches[0];
      if (typeof t0.clientY !== 'number') {
        if (e.cancelable) e.preventDefault();
        inspectX(t0.clientX);
        return;
      }
      if (!mTState.near) return;
      var dx = Math.abs(t0.clientX - mTState.sx),
        dy = Math.abs(t0.clientY - mTState.sy);
      if (mTState.locked === null) {
        if (dx < 8 && dy < 8) return;
        if (dy > dx) { mTState.locked = 'v'; mTState.near = false; hideMobCfHUD(); return; }
        mTState.locked = 'h';
      }
      if (mTState.locked === 'h') {
        if (e.cancelable) e.preventDefault();
        inspectX(t0.clientX);
      }
    }, { passive: false });
    hit.addEventListener('touchend', function () { mTState.near = false; mTState.locked = null; hideMobCfHUD(); });
    hit.addEventListener('touchcancel', function () { mTState.near = false; mTState.locked = null; hideMobCfHUD(); });
    hit.addEventListener('pointerup', function (e) { if (e.pointerType === 'mouse') hideMobCfHUD(); });
    hit.addEventListener('mouseleave', hideMobCfHUD);
  }
}

function renderMobZoomInspector(pt) {
  var box = $('m-cf-zoom-insp');
  if (!box) return;
  if (!pt) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'flex';
  box.innerHTML =
    '<div><strong>' + esc(fmtD(pt.d)) + '</strong> &middot; <strong class="mono pv" style="color:' + (pt.val < 0 ? 'var(--crimson)' : 'var(--emerald)') + '">' + rp(pt.val) + '</strong> &middot; <span style="color:var(--text-secondary)">' + esc(pt.bill) + '</span></div>' +
    '<div style="display:flex;gap:6px">' +
    (pt.val < 0 ? '<button type="button" class="btn btn-primary btn-sm" id="m-cf-zoom-go-sim">Uji Simulasi</button>' : '') +
    '<button type="button" class="btn btn-secondary btn-sm" id="m-cf-zoom-unpin">Lepas Pin</button></div>';
}

function renderMobCashflowZoom() {
  var svg = $('m-svg-cf-zoom'),
    stage = $('m-cf-zoom-stage') || $('m-cf-zoom-wrap'),
    tip = $('m-cf-zoom-tip');
  if (!svg || !stage) return;
  var P = kasLinked(),
    bal = P ? kasBal(P).bal : (+S.saldo || 0),
    wide = !!MOB_STATE.zoomWide,
    allowPan = wide && MOB_STATE.zoomTouch === 'pan';
  if ($('m-cf-zoom-sub')) $('m-cf-zoom-sub').textContent = 'Tahun ' + S.year + ' · Saldo saat ini ' + rp(bal);
  svg.classList.toggle('is-zoom-wide', wide);
  if ($('m-cf-zoom-wide')) {
    $('m-cf-zoom-wide').textContent = wide ? '🔍 Normal' : '🔍 Perlebar';
    $('m-cf-zoom-wide').classList.toggle('active', wide);
  }
  if ($('m-cf-zoom-touch-seg')) $('m-cf-zoom-touch-seg').style.display = wide ? 'inline-flex' : 'none';
  document.querySelectorAll('#m-cf-zoom-touch-seg [data-mzmode]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mzmode') === MOB_STATE.zoomTouch);
  });
  document.querySelectorAll('#m-sheet-cf-zoom [data-mzoom-range]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mzoom-range') === MOB_STATE.zoomRange);
  });
  if ($('m-cf-zoom-scrub')) mobPaintSlider($('m-cf-zoom-scrub'));
  if (typeof brRenderCashflowInto === 'function') {
    brRenderCashflowInto(svg, stage, tip, MOB_STATE.zoomRange, {
      prefix: 'mz-',
      allowScroll: allowPan,
      svgW: wide ? 920 : 600,
      svgH: wide ? 340 : 320,
      padL: wide ? 68 : 56,
      padR: 0,
      fontSize: wide ? 13 : 13.5,
      dotR: 5.5,
      skipInspector: true,
      getPin: function () { return MOB_STATE.zoomPin; },
      setPin: function (idx, pt) { MOB_STATE.zoomPin = idx; renderMobZoomInspector(pt); },
      onScrub: function (ratio, pt) {
        var sc = $('m-cf-zoom-scrub');
        if (sc) {
          sc.value = String(Math.round(Math.max(0, Math.min(1, ratio)) * 100));
          mobPaintSlider(sc);
        }
        if ($('m-cf-zoom-scrub-lbl') && pt) {
          var lbl = pt.d ? fmtD(pt.d) : (pt.p0 ? pt.p0.lbl + ' → ' + pt.p1.lbl : '');
          $('m-cf-zoom-scrub-lbl').textContent = lbl + ' · ' + rp(Math.round(pt.val || 0));
        }
      },
    });
    if (MOB_STATE.zoomPin === null) renderMobZoomInspector(null);
  }
}

function renderMobUpcoming() {
  var box = $('m-upcoming-bills');
  if (!box) return;
  var r = reminders(60),
    list = r.late.concat(r.soon).slice(0, 4);
  if (!list.length) {
    box.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:8px">Semua tagihan terdekat lunas ✓</div>';
    return;
  }
  box.innerHTML = list.map(function (x) {
    var iso = isoD(x.t);
    return (
      '<div class="list-row"><div style="display:flex;align-items:center;gap:9px;min-width:0">' +
      mobCatLogo(x.it.cat || 'Tagihan', 28) +
      '<div style="min-width:0"><div style="font-size:0.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.it.name) + '</div>' +
      '<div style="font-size:0.69rem;color:var(--text-muted)">' + fmtD(iso) + '</div></div></div>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><strong class="mono pv" style="font-size:0.79rem">' + mobFmtShort(x.price) + '</strong>' +
      '<button type="button" class="btn btn-emerald btn-sm" data-mquickpaid="' + esc(x.it.id) + '|' + iso + '">Lunas</button></div></div>'
    );
  }).join('');
}

function renderMobWhere(C) {
  var p = cashPeriod(C, MOB_STATE.wherePeriod),
    income = MOB_STATE.whereDir === '+',
    src = income ? p.incByCat : p.byCat,
    total = income ? p.inc : p.out,
    cats = Object.keys(src).map(function (k) { return { name: k || 'Tanpa kategori', v: src[k] }; }).filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; }),
    grand = total || cats.reduce(function (s, x) { return s + x.v; }, 0);

  if ($('m-where-tot')) $('m-where-tot').textContent = rp(grand);

  var stage = $('m-jar-stage'),
    catsEl = $('m-where-cats'),
    itemsEl = $('m-where-items');
  if (stage) {
    var isBar = MOB_STATE.whereStyle === 'bar' || MOB_STATE.whereStyle === 'ring';
    stage.classList.toggle('is-segbar', isBar);
    if (isBar) {
      var segs = cats.map(function (c, idx) {
        var frac = grand ? (c.v / grand) * 100 : 0, col = mobGetCatMeta(c.name).hex;
        var act = !MOB_STATE.whereLock || MOB_STATE.whereLock === c.name;
        return '<button type="button" class="jar-band m-segbar-item ' + (MOB_STATE.whereLock ? (act ? 'lit' : 'dim') : '') + '" data-mkcat="' + esc(c.name) + '" data-pct="' + frac.toFixed(1) + '" aria-label="' + esc(c.name + ' ' + Math.round(frac) + '%') + '" style="flex:' + Math.max(0.5, frac).toFixed(3) + ' 1 0%;min-width:6px;background:' + col + ';--rk-seg-idx:' + idx + '"></button>';
      }).join('');
      stage.innerHTML = '<div class="m-where-segbar-wrap" id="m-where-segbar"><div class="m-where-segbar-meta"><span class="mono">' + (cats.length ? '100%' : '0%') + ' &middot; ' + cats.length + ' kat</span></div><div class="m-where-segbar">' + (segs || '<div class="m-segbar-empty"></div>') + '</div></div>';
    } else {
      var jarBands = cats.map(function (c) {
        var pct = grand ? (c.v / grand) * 100 : 0;
        var act = !MOB_STATE.whereLock || MOB_STATE.whereLock === c.name;
        return {
          mkcat: c.name,
          cat: c.name,
          pct: pct,
          total: c.v,
          color: mobGetCatMeta(c.name).hex,
          cls: MOB_STATE.whereLock ? (act ? 'lit' : 'dim') : '',
        };
      });
      stage.innerHTML = typeof rkBuildWaterJarSvg === 'function'
        ? rkBuildWaterJarSvg({
            svgId: 'm-svg-jar',
            clipId: 'clip-m-jar',
            gradPrefix: 'm',
            style: 'width:100%;height:auto;display:block',
            bands: jarBands,
            showHud: false,
          })
        : '';
    }
  }
  if ($('m-btn-reset-where')) $('m-btn-reset-where').style.display = MOB_STATE.whereLock ? 'inline-flex' : 'none';
  if (catsEl) {
    var justW = MOB_STATE._justCatId === 'm-where-cats' ? MOB_STATE._justCatVal : null;
    if (MOB_STATE._justCatId === 'm-where-cats') { MOB_STATE._justCatId = null; MOB_STATE._justCatVal = null; }
    catsEl.innerHTML = cats.slice(0, 6).map(function (c) {
      var pct = grand ? Math.round((c.v / grand) * 100) : 0;
      var isAct = MOB_STATE.whereLock === c.name;
      var justCls = isAct && justW === c.name ? ' just-selected' : '';
      return '<button type="button" class="cat-bento-card' + (isAct ? ' active' : '') + justCls + '" data-mkcat="' + esc(c.name) + '"><span class="cat-bento-pct">' + pct + '%</span>' + mobCatLogo(c.name, 22) + '<div style="font-size:0.73rem;font-weight:700;margin-top:2px">' + esc(c.name) + '</div><div class="mono pv" style="font-size:0.76rem;font-weight:800">' + rp(c.v) + '</div></button>';
    }).join('');
  }
  if (itemsEl) {
    var filtEntries = C.entries.filter(function (e) {
      return e.t === (income ? '+' : '-') && !/Penyesuaian/i.test(e.cat) && (!MOB_STATE.whereLock || (e.cat || 'Tanpa kategori') === MOB_STATE.whereLock);
    });
    var topRows = groupExpenseItems(filtEntries).rows.slice(0, 5);
    itemsEl.innerHTML = topRows.length
      ? topRows.map(function (r) {
          var rCat = r.cat || 'Tanpa kategori';
          var isAct = MOB_STATE.whereLock === rCat;
          return '<button type="button" class="list-row' + (isAct ? ' active' : '') + '" data-mkcat="' + esc(rCat) + '" style="width:100%;text-align:left"><span style="display:flex;align-items:center;gap:8px;min-width:0">' + mobCatLogo(rCat, 20) + '<span style="font-size:0.78rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.name) + '</span></span><strong class="mono pv" style="font-size:0.78rem">' + rp(r.v) + '</strong></button>';
        }).join('')
      : '<div style="font-size:0.75rem;color:var(--text-muted)">Belum ada rincian.</div>';
  }
}

function renderMobBarSvg(C) {
  var svg = $('m-svg-bar'),
    wrap = $('m-bar-wrap'),
    tip = $('m-bar-tooltip'),
    det = $('m-bar-detail');
  if (!svg) return;
  var y = +S.year,
    M = MON.map(function (m) { return { m: m, inc: 0, out: 0 }; });
  C.entries.forEach(function (e) {
    if (+e.d.slice(0, 4) !== y || /Penyesuaian/.test(e.cat)) return;
    M[+e.d.slice(5, 7) - 1][e.t === '+' ? 'inc' : 'out'] += e.amt;
  });
  var bars = MOB_STATE.bsPeriod === 'y' ? M : M.filter(function (r) { return r.inc || r.out; });
  if (!bars.length) bars = M.slice(0, 6);
  var W = 340, H = 185, pL = 34, pR = 6, pT = 12, pB = 22, pH = H - pT - pB;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  var maxV = Math.max(1000000, Math.max.apply(null, bars.map(function (b) { return Math.max(b.inc, b.out); }))),
    bandW = (W - pL - pR) / bars.length,
    bw = Math.min(16, bandW * 0.36);
  var netPtsM = bars.map(function (b, i) {
    var cx = pL + bandW * (i + 0.5), net = b.inc - b.out;
    return { x: cx, y: pT + pH * (1 - Math.max(0, net) / maxV), net: net };
  });
  var netPathM = netPtsM.length > 1
    ? (typeof brCubicPath === 'function' ? brCubicPath(netPtsM) : 'M ' + netPtsM.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L '))
    : '';
  svg.innerHTML = bars.map(function (b, i) {
    var cx = pL + bandW * (i + 0.5),
      ih = b.inc ? Math.max(3, (b.inc / maxV) * pH) : 2,
      eh = b.out ? Math.max(3, (b.out / maxV) * pH) : 2;
    return '<g class="bar-col" data-mbidx="' + i + '" style="cursor:pointer;--rk-bar-idx:' + i + '">' +
      '<rect class="bar-month-bg" x="' + (pL + bandW * i + 2).toFixed(1) + '" y="' + pT + '" width="' + Math.max(4, bandW - 4).toFixed(1) + '" height="' + (pH + 2) + '" rx="6"/>' +
      '<rect class="rk-bar-rect" x="' + (cx - bw - 1).toFixed(1) + '" y="' + (pT + pH - ih).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + ih.toFixed(1) + '" rx="3" fill="var(--emerald)"/>' +
      '<rect class="rk-bar-rect" x="' + (cx + 1).toFixed(1) + '" y="' + (pT + pH - eh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + eh.toFixed(1) + '" rx="3" fill="var(--accent)"/>' +
      '<text class="bar-month-lbl" x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-weight="700">' + b.m[0] + '</text></g>';
  }).join('') +
  (netPathM ? '<path class="rk-anim-line rk-bar-net-line" d="' + netPathM + '" fill="none" stroke="var(--amber)" stroke-width="1.9" stroke-dasharray="3 2.5"/>' : '') +
  netPtsM.map(function (x) { return '<circle class="rk-bar-net-dot" cx="' + x.x.toFixed(1) + '" cy="' + x.y.toFixed(1) + '" r="2.6" fill="var(--amber)" stroke="var(--bg-surface)" stroke-width="1.2"/>'; }).join('');
  svg.querySelectorAll('.bar-col').forEach(function (g) {
    var ix = +g.getAttribute('data-mbidx'), d = bars[ix];
    function showBar() {
      svg.querySelectorAll('.bar-col').forEach(function (x) { x.classList.toggle('is-hovered', x === g); });
      if (tip && wrap && d) {
        var net = d.inc - d.out;
        tip.innerHTML = '<strong>' + esc(d.m) + ' ' + y + '</strong><div>Masuk: <span class="mono pv" style="color:var(--emerald)">' + mobFmtShort(d.inc) + '</span></div><div>Keluar: <span class="mono pv" style="color:var(--accent-ink)">' + mobFmtShort(d.out) + '</span></div><div style="font-size:0.7rem;color:' + (net >= 0 ? 'var(--emerald)' : 'var(--crimson)') + '">Selisih: ' + (net >= 0 ? '+' : '') + mobFmtShort(net) + '</div>';
        var bx = (pL + bandW * (ix + 0.5)) / W * (wrap.clientWidth || 320);
        mobPosTip(wrap, tip, bx, pT + 20, 8);
      }
    }
    g.addEventListener('mouseenter', showBar);
    g.addEventListener('click', showBar);
  });
  svg.onmouseleave = function () {
    svg.querySelectorAll('.bar-col').forEach(function (x) { x.classList.remove('is-hovered'); });
    if (tip) tip.classList.remove('visible');
  };
  if (det) det.innerHTML = 'Masuk <strong class="mono pv" style="color:var(--emerald)">' + rp(C.inc) + '</strong> &middot; Keluar <strong class="mono pv">' + rp(C.out) + '</strong>';
}

function renderMobRecentTx(P) {
  var box = $('m-recent-tx');
  if (!box) return;
  if (!P) { box.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted)">Belum ada profil kas.</div>'; return; }
  var list = kasRows(P).slice().sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }).filter(function (x) {
    return MOB_STATE.txDir === 'all' || x.t === MOB_STATE.txDir;
  }).slice(0, 5);
  box.innerHTML = list.length
    ? list.map(function (x) {
        return '<div class="list-row"><div style="display:flex;align-items:center;gap:8px;min-width:0">' + mobCatLogo(x.cat || 'Lainnya', 24) + '<div style="min-width:0"><div style="font-size:0.80rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.note || x.cat || 'Transaksi') + '</div><div style="font-size:0.68rem;color:var(--text-muted)">' + fmtD(x.d) + '</div></div></div>' +
          '<span class="mono pv" style="font-size:0.80rem;font-weight:800;color:' + (x.t === '+' ? 'var(--emerald)' : 'var(--text-primary)') + '">' + (x.t === '+' ? '+' : '-') + mobFmtShort(x.amt) + '</span></div>';
      }).join('')
    : '<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:8px">Belum ada transaksi kas.</div>';
}

function mobCatFilterIconHtml(cat) {
  if (!cat || cat === 'all') {
    return '<span class="cat-logo" style="width:18px;height:18px;border-radius:5px;background:var(--bg-subtle);color:var(--text-secondary);box-shadow:none"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>';
  }
  return mobCatLogo(cat, 18);
}

function mobSyncCatSelect() {
  var sel = $('m-kas-flt-cat'),
    valBox = $('m-kas-cat-val'),
    menu = $('m-kas-cat-menu');
  if (!sel || !valBox || !menu) return;
  var curV = sel.value || 'all',
    opts = Array.from(sel.options || []),
    curOpt = opts.find(function (o) { return o.value === curV; }) || opts[0];
  valBox.innerHTML = mobCatFilterIconHtml(curV) + '<span>' + esc(curOpt ? curOpt.textContent : 'Semua Kategori') + '</span>';
  menu.innerHTML = opts.map(function (o) {
    var active = o.value === curV;
    return (
      '<button type="button" class="mselect-opt' + (active ? ' active' : '') + '" role="option" aria-selected="' + active + '" data-mcatval="' + esc(o.value) + '">' +
      '<span class="mselect-opt-main">' + mobCatFilterIconHtml(o.value) + '<span>' + esc(o.textContent) + '</span></span>' +
      '<svg class="mselect-opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>'
    );
  }).join('');
}

function renderMobKas() {
  var P = kasLinked();
  if (!P) return;
  var KB = kasBal(P);
  if ($('m-kas-saldo')) $('m-kas-saldo').textContent = rp(KB.bal);
  if ($('m-kas-in')) $('m-kas-in').textContent = '+' + mobFmtShort(KB.A.i);
  if ($('m-kas-out')) $('m-kas-out').textContent = '-' + mobFmtShort(KB.A.o);
  if ($('m-kas-date') && !$('m-kas-date').value) mobSetDateVal('m-kas-date', todayISO());

  var cats = allCategories();
  if ($('m-kas-cat-pills')) {
    var justK = MOB_STATE._justCatId === 'm-kas-cat-pills' ? MOB_STATE._justCatVal : null;
    if (MOB_STATE._justCatId === 'm-kas-cat-pills') { MOB_STATE._justCatId = null; MOB_STATE._justCatVal = null; }
    $('m-kas-cat-pills').innerHTML = cats.slice(0, 8).map(function (c) {
      var isAct = MOB_STATE.kasCat === c;
      return '<button type="button" class="list-row ' + (isAct ? 'active' : '') + (isAct && justK === c ? ' just-selected' : '') + '" style="padding:7px 9px" data-mkcatpick="' + esc(c) + '"><span style="display:flex;align-items:center;gap:7px;font-size:0.74rem;font-weight:700;min-width:0">' + mobCatLogo(c, 20) + '<span>' + esc(c) + '</span></span><svg class="cat-check-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></button>';
    }).join('');
  }
  var fltCat = $('m-kas-flt-cat');
  if (fltCat) {
    var prevV = fltCat.value || 'all';
    fltCat.innerHTML = '<option value="all">Semua Kategori</option>' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    fltCat.value = Array.from(fltCat.options).some(function (o) { return o.value === prevV; }) ? prevV : 'all';
    mobSyncCatSelect();
  }

  var mDebtSel = $('m-kas-debt-kind');
  if (mDebtSel && typeof debtKinds === 'function') {
    var prevDK = mDebtSel.value;
    var kOpts = debtKinds(MOB_STATE.kasType);
    mDebtSel.innerHTML = kOpts.map(function (kv) { return '<option value="' + esc(kv[0]) + '">' + esc(kv[1]) + '</option>'; }).join('');
    if (kOpts.some(function (kv) { return kv[0] === prevDK; })) mDebtSel.value = prevDK;
  }

  var debtEl = $('m-debt-list');
  var dMap = typeof debtStatusMap === 'function' ? debtStatusMap(P) : {};
  if (debtEl) {
    var D = Object.keys(dMap).map(function (k) { return dMap[k]; }).filter(function (x) { return x.sisaU > 0 || x.sisaP > 0; });
    debtEl.innerHTML = D.length
      ? D.map(function (x) {
          var out = '';
          if (x.sisaU > 0) {
            var subU = x.bayarU > 0 ? 'Sisa dari ' + rp(x.utang) : 'Saya berutang';
            out += '<div class="list-row"><div style="min-width:0"><div style="font-size:0.80rem;font-weight:700">' + esc(x.name) + ' <span class="badge b-cr">utang</span></div><div style="font-size:0.68rem;color:var(--text-muted)">' + subU + '</div></div>' +
              '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><strong class="mono pv" style="font-size:0.79rem">' + mobFmtShort(x.sisaU) + '</strong>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-mdebt-cicil="' + esc(x.name) + '" data-mkind="utang" data-mamt="' + x.sisaU + '">Cicil</button>' +
              '<button type="button" class="btn btn-emerald btn-sm" data-mdebt-pay="' + esc(x.name) + '" data-mkind="utang" data-mamt="' + x.sisaU + '">Lunas</button></div></div>';
          }
          if (x.sisaP > 0) {
            var subP = x.bayarP > 0 ? 'Sisa dari ' + rp(x.piutang) : 'Orang berutang';
            out += '<div class="list-row"><div style="min-width:0"><div style="font-size:0.80rem;font-weight:700">' + esc(x.name) + ' <span class="badge b-em">piutang</span></div><div style="font-size:0.68rem;color:var(--text-muted)">' + subP + '</div></div>' +
              '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><strong class="mono pv" style="font-size:0.79rem">' + mobFmtShort(x.sisaP) + '</strong>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-mdebt-cicil="' + esc(x.name) + '" data-mkind="piutang" data-mamt="' + x.sisaP + '">Cicil</button>' +
              '<button type="button" class="btn btn-emerald btn-sm" data-mdebt-pay="' + esc(x.name) + '" data-mkind="piutang" data-mamt="' + x.sisaP + '">Lunas</button></div></div>';
          }
          return out;
        }).join('')
      : '<div style="font-size:0.77rem;color:var(--text-muted);text-align:center;padding:6px">Tidak ada utang aktif</div>';
  }

  var histEl = $('m-kas-hist-list');
  if (histEl) {
    var q = ($('m-kas-search') && $('m-kas-search').value || '').toLowerCase(),
      cf = fltCat ? fltCat.value : 'all';
    var rows = kasRows(P).slice().sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }).filter(function (x) {
      if (MOB_STATE.kasFilterDir !== 'all' && x.t !== MOB_STATE.kasFilterDir) return false;
      if (cf !== 'all' && (x.cat || '') !== cf) return false;
      if (q && ((x.note || '') + ' ' + (x.cat || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).slice(0, 30);
    histEl.innerHTML = rows.length
      ? rows.map(function (x) {
          var db = '';
          if (x.debt && !x.debtDone && x.debtKind) {
            var dn = typeof debtNameOf === 'function' ? debtNameOf(x) : (x.debtName || x.note || '');
            var ds = dMap[dn];
            if (ds) {
              var isU = x.debtKind === 'utang' || x.debtKind === 'bayar-utang';
              var sisa = isU ? ds.sisaU : ds.sisaP;
              var isPay = x.debtKind === 'bayar-utang' || x.debtKind === 'bayar-piutang';
              db = sisa > 0
                ? ' &middot; <span style="color:' + (isU ? 'var(--crimson)' : 'var(--accent-ink)') + ';font-weight:700">' + (isPay ? 'Cicil · ' : '') + 'Sisa ' + rp(sisa) + '</span>'
                : ' &middot; <span style="color:var(--emerald);font-weight:700">Lunas ✓</span>';
            }
          }
          return '<div class="list-row"><div style="display:flex;align-items:center;gap:8px;min-width:0">' + mobCatLogo(x.cat || 'Lainnya', 24) + '<div style="min-width:0"><div style="font-size:0.80rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.note || x.cat || 'Transaksi') + '</div><div style="font-size:0.68rem;color:var(--text-muted)">' + fmtD(x.d) + (x.cat ? ' &middot; ' + esc(x.cat) : '') + db + '</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:5px"><span class="mono pv" style="font-size:0.80rem;font-weight:800;color:' + (x.t === '+' ? 'var(--emerald)' : 'var(--crimson)') + '">' + (x.t === '+' ? '+' : '-') + rp(x.amt) + '</span>' +
            (x.ro ? '' : '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mdeltx="' + esc(x.id) + '">✕</button>') + '</div></div>';
        }).join('')
      : '<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:8px">Tidak ada transaksi cocok.</div>';
  }
}

function renderMobJadwal() {
  if (typeof brSanitizeItems === 'function') brSanitizeItems();
  var sub = MOB_STATE.jadwalSub || 'list';
  document.querySelectorAll('#m-jadwal-subnav [data-mjsub]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mjsub') === sub);
  });
  if ($('m-jad-pane-list')) $('m-jad-pane-list').classList.toggle('sec-hidden', sub !== 'list');
  if ($('m-jad-pane-add')) $('m-jad-pane-add').classList.toggle('sec-hidden', sub !== 'add');
  if ($('m-jad-pane-manage')) $('m-jad-pane-manage').classList.toggle('sec-hidden', sub !== 'manage');
  renderMobItems();
  var c = calc(),
    y = +S.year,
    mTotals = Array(12).fill(0),
    paidAmt = 0, unpaidAmt = 0, paidCnt = 0, unpaidCnt = 0;

  var itemCardsData = S.items.map(function (it) {
    var occs = (c.occs[it.id] || occ(it, y)).map(function (t) {
      var iso = isoD(t),
        k = it.id + '|' + iso,
        m = +iso.slice(5, 7) - 1,
        amt = priceAt(it, t),
        isPaid = !!S.paid[k],
        isSkip = !!S.skip[k];
      if (!isSkip) {
        mTotals[m] += amt;
        if (isPaid) { paidAmt += amt; paidCnt++; } else { unpaidAmt += amt; unpaidCnt++; }
      }
      return { iso: iso, m: m, day: +iso.slice(8, 10), amt: amt, paid: isPaid, skip: isSkip, chg: amt !== it.price };
    });
    var actBills = occs.filter(function (b) { return !b.skip; }),
      itPaid = actBills.filter(function (b) { return b.paid; }).length,
      itUnpaid = actBills.length - itPaid;
    return { it: it, occs: occs, total: actBills.reduce(function (s, b) { return s + b.amt; }, 0), paidCnt: itPaid, billCnt: actBills.length, allPaid: actBills.length > 0 && itUnpaid === 0, hasUnpaid: itUnpaid > 0 };
  });

  if ($('m-jad-paid-amt')) $('m-jad-paid-amt').textContent = rp(paidAmt);
  if ($('m-jad-paid-cnt')) $('m-jad-paid-cnt').textContent = paidCnt + ' / ' + (paidCnt + unpaidCnt) + ' lunas';
  if ($('m-jad-unpaid-amt')) $('m-jad-unpaid-amt').textContent = rp(unpaidAmt);
  if ($('m-jad-unpaid-cnt')) $('m-jad-unpaid-cnt').textContent = unpaidCnt + ' tagihan sisa';
  if ($('m-jf-all')) $('m-jf-all').textContent = S.items.length;
  if ($('m-jf-unpaid')) $('m-jf-unpaid').textContent = itemCardsData.filter(function (x) { return x.hasUnpaid; }).length;
  if ($('m-jf-paid')) $('m-jf-paid').textContent = itemCardsData.filter(function (x) { return x.allPaid; }).length;

  var mSlider = $('m-jadwal-months');
  if (mSlider) {
    mSlider.innerHTML = '<button type="button" class="p-chip ' + (MOB_STATE.jadwalMonth === 'all' ? 'active' : '') + '" data-mjmonth="all">Semua</button>' +
      MON.map(function (mn, i) {
        var amt = mTotals[i];
        return '<button type="button" class="p-chip ' + (String(MOB_STATE.jadwalMonth) === String(i) ? 'active' : '') + '" data-mjmonth="' + i + '">' + mn + (amt ? ' · ' + mobFmtShort(amt) : '') + '</button>';
      }).join('');
  }

  var vis = itemCardsData.filter(function (d) {
    if (MOB_STATE.jadwalMonth !== 'all' && !d.occs.some(function (b) { return b.m === Number(MOB_STATE.jadwalMonth); })) return false;
    if (MOB_STATE.jadwalFilter === 'unpaid') return d.hasUnpaid;
    if (MOB_STATE.jadwalFilter === 'paid') return d.allPaid;
    return true;
  });

  var listEl = $('m-jadwal-list'),
    footEl = $('m-jadwal-tfoot');
  if (!listEl) return;
  if (!vis.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.82rem">Tidak ada tagihan pada filter ini.</div>';
    if (footEl) footEl.innerHTML = '';
    return;
  }
  var visGrand = 0;
  listEl.innerHTML = vis.map(function (d) {
    visGrand += d.total;
    var pills = d.occs.filter(function (b) { return MOB_STATE.jadwalMonth === 'all' || b.m === Number(MOB_STATE.jadwalMonth); }).map(function (b) {
      var cls = ['bill-pill-btn'];
      if (b.skip) cls.push('skipped');
      else if (b.paid) cls.push('paid');
      else if (b.chg) cls.push('changed');
      return '<button type="button" class="' + cls.join(' ') + '" data-mchip="' + esc(d.it.id) + '|' + b.iso + '"><span>' + MON[b.m] + ' ' + (b.paid ? '✓' : '') + b.day + '</span><span class="pv">' + mobFmtShort(b.amt) + '</span></button>';
    }).join('');
    var flashM = window._rkPaidFlashItem && String(window._rkPaidFlashItem) === String(d.it.id) ? ' is-paid-flash' : '';
    return (
      '<div class="mob-sched-card ' + (d.allPaid ? 'done' : '') + flashM + '" data-rit="' + esc(d.it.id) + '"><div class="msc-top"><div class="msc-left">' +
      mobCatLogo(d.it.cat || 'Tagihan', 30) +
      '<div><div class="msc-name">' + esc(d.it.name) + '</div><div class="msc-sub">' + esc(every(d.it)) + ' &middot; <span class="pv">' + mobFmtShort(d.it.price) + '</span></div></div></div>' +
      '<div class="msc-right"><div class="msc-total pv">' + rp(d.total) + '</div><div style="font-size:0.68rem;color:var(--text-muted)">' + d.paidCnt + '/' + d.billCnt + ' lunas &middot; ' +
      '<button type="button" style="color:var(--accent-ink);font-weight:700" data-medit-it="' + esc(d.it.id) + '">Ubah</button></div></div></div>' +
      '<div class="msc-chips">' + pills + '</div></div>'
    );
  }).join('');
  if (footEl) footEl.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.81rem"><strong>Total Ditampilkan</strong><strong class="mono pv" style="font-size:0.94rem">' + rp(visGrand) + '</strong></div>';
}

function mobDefaultItemStart() {
  var m = smEff(), dim = new Date(Date.UTC(+S.year, m + 1, 0)).getUTCDate();
  return +S.year + '-' + pad2(m + 1) + '-' + pad2(Math.min(dim, 20));
}

function resetMobItemForm() {
  MOB_STATE.itemEditId = null;
  if ($('m-item-form-title')) $('m-item-form-title').textContent = 'Tambah Item Berulang';
  if ($('m-item-save-btn')) $('m-item-save-btn').textContent = 'Simpan Item';
  if ($('m-item-cancel')) $('m-item-cancel').hidden = true;
  if ($('m-item-name')) $('m-item-name').value = '';
  if ($('m-item-price')) $('m-item-price').value = '';
  if ($('m-item-price-slider')) { $('m-item-price-slider').value = '375000'; mobPaintSlider($('m-item-price-slider')); }
  if ($('m-item-price-ro')) $('m-item-price-ro').textContent = 'Rp 0';
  if ($('m-item-unit')) $('m-item-unit').value = 'bulan';
  mobSetDateVal('m-item-start', mobDefaultItemStart());
}

function renderMobItems() {
  if (typeof brSanitizeItems === 'function') brSanitizeItems();
  if ($('m-item-start') && !$('m-item-start').value) mobSetDateVal('m-item-start', mobDefaultItemStart());
  if ($('m-item-cnt')) $('m-item-cnt').textContent = S.items.length;
  if ($('m-btn-copy-next')) $('m-btn-copy-next').textContent = 'Salin ke ' + (+S.year + 1);
  if ($('m-item-cat-pills')) {
    var justI = MOB_STATE._justCatId === 'm-item-cat-pills' ? MOB_STATE._justCatVal : null;
    if (MOB_STATE._justCatId === 'm-item-cat-pills') { MOB_STATE._justCatId = null; MOB_STATE._justCatVal = null; }
    $('m-item-cat-pills').innerHTML = ['Tagihan rutin', 'Investasi', 'Hiburan', 'Kesehatan', 'Belanja', 'Lainnya'].map(function (c) {
      var isAct = MOB_STATE.itemCat === c;
      return '<button type="button" class="list-row ' + (isAct ? 'active' : '') + (isAct && justI === c ? ' just-selected' : '') + '" style="padding:7px 9px" data-mitcat="' + esc(c) + '"><span style="display:flex;align-items:center;gap:7px;font-size:0.74rem;font-weight:700;min-width:0">' + mobCatLogo(c, 20) + '<span>' + esc(c) + '</span></span><svg class="cat-check-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></button>';
    }).join('');
  }
  var list = $('m-manage-items');
  if (list) {
    list.innerHTML = S.items.length
      ? S.items.map(function (it) {
          return '<div class="list-row"><div style="display:flex;align-items:center;gap:9px;min-width:0">' + mobCatLogo(it.cat || 'Tagihan rutin', 26) + '<div style="min-width:0"><div style="font-size:0.82rem;font-weight:700">' + esc(it.name) + '</div><div style="font-size:0.69rem;color:var(--text-muted)">' + esc(every(it)) + ' &middot; Mulai ' + fmtD(it.start) + '</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><strong class="mono pv" style="font-size:0.78rem">' + mobFmtShort(it.price) + '</strong>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-medit-form-it="' + esc(it.id) + '">Ubah</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mdel-it="' + esc(it.id) + '">Hapus</button></div></div>';
        }).join('')
      : '<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:8px">Belum ada item di tahun ' + S.year + '.</div>';
  }
  mobPaintAllSliders();
}

function renderMobSim() {
  var A = calc(),
    activeSim = SIM.filter(function (x) { return !x.off; }),
    B = activeSim.length ? simCalc(activeSim) : A,
    d = B.end - A.end;
  if ($('m-sim-base')) $('m-sim-base').textContent = mobFmtShort(A.end);
  if ($('m-sim-end')) {
    $('m-sim-end').textContent = mobFmtShort(B.end);
    $('m-sim-end').style.color = B.end < 0 ? 'var(--crimson)' : 'var(--emerald)';
  }
  if ($('m-sim-delta')) {
    $('m-sim-delta').textContent = (d >= 0 ? '+' : '') + mobFmtShort(d);
    $('m-sim-delta').style.color = d >= 0 ? 'var(--emerald)' : 'var(--crimson)';
  }
  var list = $('m-sim-list');
  if (list) {
    list.innerHTML = SIM.length
      ? SIM.map(function (x, i) {
          return '<div class="list-row"><label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer"><input type="checkbox" ' + (!x.off ? 'checked' : '') + ' data-msimtog="' + i + '"/><span style="font-size:0.78rem;font-weight:600;' + (x.off ? 'opacity:0.5;text-decoration:line-through;' : '') + '">' + simDesc(x) + '</span></label><button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-msimdel="' + i + '">✕</button></div>';
        }).join('')
      : '<div style="font-size:0.77rem;color:var(--text-muted);text-align:center;padding:8px">Belum ada skenario simulasi.</div>';
  }
  var svg = $('m-svg-sim-chart');
  if (svg && A.rows.length) {
    var W = 340, H = 185, pL = 38, pR = 12, pT = 14, pB = 22, n = A.rows.length;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.touchAction = 'pan-y';
    var vals = A.rows.map(function (r) { return +r.ak || 0; }).concat(B.rows.map(function (r) { return +r.ak || 0; }), [0]);
    var minV = Math.min.apply(null, vals) - 200000, maxV = Math.max.apply(null, vals) + 200000;
    if (!isFinite(minV) || !isFinite(maxV)) { minV = -200000; maxV = 200000; }
    if (maxV === minV) maxV = minV + 100000;
    var xAt = function (i) { return pL + (i * (W - pL - pR)) / Math.max(1, n - 1); };
    var yAt = function (v) {
      var val = isFinite(+v) ? +v : 0;
      return pT + ((maxV - val) / (maxV - minV)) * (H - pT - pB);
    };
    var ptsA = A.rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.ak) }; }),
      ptsB = B.rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.ak) }; }),
      pathFn = typeof brCubicPath === 'function' ? brCubicPath : function (cs) { return cs.map(function (c, ix) { return (ix ? ' L ' : 'M ') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(''); };
    var pathA = pathFn(ptsA), pathB = pathFn(ptsB);
    var revA = ptsA.slice().reverse().map(function (c) { return ' L ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join('');
    var zeroY = yAt(0);
    svg.innerHTML =
      '<line x1="' + pL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W - pR) + '" y2="' + zeroY.toFixed(1) + '" stroke="var(--crimson)" stroke-dasharray="3 3"/>' +
      (B.end >= A.end ? '<path class="rk-anim-fill-right" d="' + pathB + revA + ' Z" fill="var(--emerald)" opacity="0.16"/>' : '') +
      '<path d="' + pathA + '" fill="none" stroke="var(--crimson)" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<path class="rk-anim-line" d="' + pathB + '" fill="none" stroke="var(--emerald)" stroke-width="2.8" stroke-linecap="round"/>' +
      A.rows.map(function (r, i) { return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-family="var(--font-mono)">' + MON[r.m][0] + '</text>'; }).join('');
  }
  mobPaintAllSliders();
}

function mobTrips() {
  return Object.keys(ALL.kas.pr).map(function (k) { return ALL.kas.pr[k]; }).filter(function (P) { return !P.link; });
}

function mobActiveTrip() {
  var list = mobTrips();
  if (!list.length) return null;
  return list.find(function (p) { return p.id === MOB_STATE.tripId; }) || list[0];
}

function mobSyncTripEqPrev() {
  if (typeof tripSyncEqPairs === 'function') {
    tripSyncEqPairs(mobActiveTrip(), [['m-it-est', 'm-it-cur', 'm-it-est-eq'], ['m-bk-amt', 'm-bk-cur', 'm-bk-amt-eq']]);
  }
}

function syncMobTripBudgetWrap() {
  var sel = $('m-kp-use-budget'), wrap = $('m-kp-budget-wrap');
  if (sel && wrap) wrap.style.display = sel.value === '1' ? 'flex' : 'none';
}

function renderMobTripListCard(t, activeId) {
  var pl = tripPlan(t),
    dCnt = t.start && t.end && t.end >= t.start ? daysBetweenISO(t.end, t.start) + 1 : 0,
    pct = t.budget ? Math.min(100, Math.round((pl.t / t.budget) * 100)) : 0,
    over = t.budget && pl.t > t.budget;
  return '<button type="button" class="mob-sched-card" style="text-align:left;width:100%" data-mtrip-sel="' + esc(t.id) + '">' +
    '<div class="msc-top"><div><div class="msc-name">' + esc(t.name) + '</div>' +
    '<div class="msc-sub">' + (t.start && t.end ? fmtD(t.start) + ' – ' + fmtD(t.end) + (dCnt ? ' &middot; ' + dCnt + ' hari' : '') : 'Tanggal belum diisi') + '</div></div>' +
    '<span class="badge ' + (t.id === activeId ? 'b-ac' : 'b-nt') + '">' + esc(t.cur || 'IDR') + '</span></div>' +
    (t.budget ? '<div class="rank-track"><div class="rank-fill" style="width:' + pct + '%;background:' + (over ? 'var(--crimson)' : 'var(--accent)') + '"></div></div>' : '') +
    '<div style="font-size:0.74rem;color:var(--text-secondary)">Rencana biaya <strong class="mono pv">' + rp(pl.t) + '</strong>' +
    (t.budget ? ' dari anggaran <strong class="mono pv">' + rp(t.budget) + '</strong>' : ' &middot; anggaran belum ditentukan') + '</div></button>';
}

function renderMobTripItinCard(tr, x) {
  var timeHtml = x.time
    ? '<span class="mono" style="color:var(--accent-ink);margin-right:5px">' + esc(x.time.replace(':', '.')) + (x.time2 ? '–' + esc(x.time2.replace(':', '.')) : '') + '</span>'
    : '';
  var payTxt = x.pay ? ((typeof PAYL !== 'undefined' && PAYL[x.pay]) || x.pay) : '';
  var amtBlock = typeof tripItemAmtHtml === 'function'
    ? tripItemAmtHtml(tr, x.est, x.fx, 'msc-right', 'font-size:0.84rem')
    : '<strong class="mono pv msc-right" style="font-size:0.84rem">' + (x.est ? (x.fx && tr.cur ? esc(tr.cur) + ' ' + Math.round(x.est).toLocaleString('id-ID') : rp(x.est)) : '') + '</strong>';
  return '<div class="mob-sched-card ' + (x.done ? 'done' : '') + '" style="padding:10px">' +
    '<div class="msc-top"><div class="msc-left" style="flex:1">' + mobCatLogo(mobTripCatMapped(x.cat || 'Transport'), 30) +
    '<div style="min-width:0;flex:1">' +
    '<div style="font-weight:800;font-size:0.84rem;' + (x.done ? 'text-decoration:line-through;opacity:0.55;' : '') + '">' + timeHtml + esc(x.place) + '</div>' +
    '<div class="msc-badges" style="margin-top:4px"><span class="badge b-nt">' + esc(x.cat || 'Transport') + '</span>' +
    (payTxt ? '<span class="badge b-ac">' + esc(payTxt) + '</span>' : '') + '</div>' +
    (x.note ? '<div class="msc-sub" style="margin-top:4px">' + esc(x.note) + '</div>' : '') +
    '</div></div>' + amtBlock + '</div>' +
    '<div style="display:flex;gap:6px;justify-content:flex-end">' +
    '<button type="button" class="btn btn-secondary btn-sm" data-mit-toggle="' + esc(x.id) + '">' + (x.done ? '✓ Selesai' : 'Tandai') + '</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-mit-edit="' + esc(x.id) + '">Ubah</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mit-del="' + esc(x.id) + '">Hapus</button>' +
    '</div></div>';
}

function renderMobTripItin(tr) {
  var days = tripDays(tr),
    EIt = MOB_STATE.tripEditIt ? (tr.it || []).find(function (x) { return x.id === MOB_STATE.tripEditIt; }) : null,
    defDay = (EIt && EIt.day) || days[0] || tr.start || todayISO(),
    defPay = EIt ? (EIt.pay || '') : 'cash',
    itRpFn = typeof tripItRp === 'function' ? tripItRp : function (P, x) { return typeof val === 'function' ? val(P, x.est, x.fx) : (+x.est || 0); },
    dayLblFn = typeof dayLabel === 'function' ? dayLabel : function (P, d) { return fmtD(d); };
  var formHtml =
    '<div class="card"><div class="card-hd"><h3 class="card-title">' + (EIt ? 'Ubah Kegiatan' : 'Tambah Kegiatan') + '</h3>' +
    (EIt ? '<button type="button" class="btn btn-secondary btn-sm" id="m-it-cancel">Batal</button>' : '') + '</div>' +
    '<form id="m-trip-itin-form" class="stack" style="gap:9px" novalidate>' +
    '<div class="field"><span class="field-label">Tanggal</span>' + mobDateFieldHtml('m-it-day', defDay, false) + '</div>' +
    '<div class="bento-2">' +
    '<div class="field"><label class="field-label" for="m-it-time">Mulai</label><input class="input mono" id="m-it-time" inputmode="numeric" maxlength="5" placeholder="14.00" value="' + esc(EIt && EIt.time ? EIt.time.replace(':', '.') : '') + '" /></div>' +
    '<div class="field"><label class="field-label" for="m-it-time2">Selesai</label><input class="input mono" id="m-it-time2" inputmode="numeric" maxlength="5" placeholder="16.30" value="' + esc(EIt && EIt.time2 ? EIt.time2.replace(':', '.') : '') + '" /></div></div>' +
    '<div class="field"><label class="field-label" for="m-it-place">Kegiatan</label><input class="input" id="m-it-place" maxlength="120" placeholder="mis. Senso-ji Temple" value="' + esc(EIt ? EIt.place : '') + '" required /></div>' +
    '<div class="field"><label class="field-label" for="m-it-est">Biaya &amp; Mata Uang</label>' +
    '<div style="display:flex;gap:6px"><input class="input mono" id="m-it-est" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" value="' + (EIt && EIt.est ? (+EIt.est).toLocaleString('id-ID') : '') + '" style="flex:1;min-width:0" />' +
    '<select class="input" id="m-it-cur" aria-label="Mata uang" style="width:88px;flex-shrink:0"><option value="idr"' + (!(EIt && EIt.fx) ? ' selected' : '') + '>Rp</option>' +
    (tr.cur ? '<option value="fx"' + (EIt && EIt.fx ? ' selected' : '') + '>' + esc(tr.cur) + '</option>' : '') +
    '</select></div><div class="trip-eq-hint mono" id="m-it-est-eq"></div></div>' +
    '<div class="bento-2">' +
    '<div class="field"><label class="field-label" for="m-it-pay">Pembayaran</label><select class="input" id="m-it-pay">' +
    '<option value=""' + (defPay === '' ? ' selected' : '') + '>Belum ditentukan</option>' +
    '<option value="ic"' + (defPay === 'ic' ? ' selected' : '') + '>Kartu IC</option>' +
    '<option value="on"' + (defPay === 'on' ? ' selected' : '') + '>Online (Pemesanan)</option>' +
    '<option value="cash"' + (defPay === 'cash' ? ' selected' : '') + '>Cash</option>' +
    '</select></div>' +
    '<div class="field"><label class="field-label" for="m-it-cat">Kategori</label><select class="input" id="m-it-cat">' +
    ICAT.map(function (c) { return '<option value="' + esc(c) + '"' + ((EIt ? EIt.cat : 'Transport') === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
    '</select></div></div>' +
    '<div class="field"><label class="field-label" for="m-it-link">Tautan Peta / Tiket (opsional)</label><input class="input" id="m-it-link" inputmode="url" placeholder="https://..." value="' + esc(EIt ? (EIt.link || '') : '') + '" /></div>' +
    '<div class="field"><label class="field-label" for="m-it-note">Catatan (opsional)</label><input class="input" id="m-it-note" maxlength="200" placeholder="Catatan singkat" value="' + esc(EIt ? (EIt.note || '') : '') + '" /></div>' +
    '<button type="submit" class="btn btn-primary">' + (EIt ? 'Simpan Perubahan' : 'Tambah Kegiatan') + '</button></form></div>';
  var listHtml = days.length
    ? days.map(function (d) {
        var its = (tr.it || []).filter(function (x) { return x.day === d; }).sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
        var dTot = its.reduce(function (s, x) { return s + (x.pay === 'on' || !x.est ? 0 : itRpFn(tr, x)); }, 0);
        return '<div class="card m-itin-day-card" data-mday="' + esc(d) + '">' +
          '<div class="card-hd" style="margin-bottom:8px"><h3 class="card-title">' + esc(dayLblFn(tr, d)) + '</h3>' +
          (dTot ? '<span class="badge b-ac mono pv">Estimasi: ' + rp(dTot) + '</span>' : '') + '</div>' +
          '<input class="input" maxlength="60" style="margin-bottom:9px" placeholder="Judul hari, mis. Jakarta – Tokyo" value="' + esc((tr.dt && tr.dt[d]) || '') + '" data-mdt-day="' + esc(d) + '" />' +
          '<div class="stack" style="gap:7px">' +
          (its.length ? its.map(function (x) { return renderMobTripItinCard(tr, x); }).join('') : '<div style="padding:8px 0;color:var(--text-muted);font-size:0.78rem">Belum ada kegiatan hari ini.</div>') +
          '</div></div>';
      }).join('')
    : '<div class="card" style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:18px">Atur tanggal mulai/selesai atau tambahkan kegiatan pertama.</div>';
  return formHtml + '<div class="stack" style="gap:9px">' + listHtml + '</div>';
}

function renderMobTrip() {
  var root = $('m-trip-root');
  if (!root) return;
  var list = mobTrips(),
    tr = mobActiveTrip();
  if (tr) MOB_STATE.tripId = tr.id;

  if (!tr || MOB_STATE.tripView === 'list') {
    root.innerHTML =
      '<div class="card"><div class="m-trip-list-hd"><div><h2 class="card-title">Semua Perjalanan</h2><div style="font-size:0.71rem;color:var(--text-muted)">' + list.length + ' profil perjalanan</div></div>' +
      '<div class="m-trip-list-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="m-btn-trip-new">+ Perjalanan baru</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="m-btn-trip-xl"' + (MOB_XL_BUSY ? ' disabled' : '') + '>Impor Excel</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="m-btn-trip-tpl"' + (MOB_XL_BUSY ? ' disabled' : '') + '>Template Excel</button></div></div>' +
      '<div class="stack" style="gap:9px">' +
      (list.length
        ? list.map(function (t) { return renderMobTripListCard(t, tr ? tr.id : ''); }).join('')
        : '<div style="text-align:center;font-size:0.80rem;color:var(--text-muted);padding:16px">Belum ada rencana perjalanan. Klik + Perjalanan baru.</div>') +
      '</div></div>';
    return;
  }

  var pl = tripPlan(tr),
    subTabs = [['ring', 'Ringkasan'], ['itin', 'Itinerary'], ['book', 'Pemesanan'], ['cek', 'Checklist'], ['cat', 'Catatan'], ['sv', 'Tabungan']],
    body = '';

  var itRpFn = typeof tripItRp === 'function' ? tripItRp : function (P, x) { return typeof val === 'function' ? val(P, x.est, x.fx) : (+x.est || 0); },
    bkRpFn = typeof tripAmtRp === 'function' ? tripAmtRp : function (P, x) { return typeof val === 'function' ? val(P, x.amt, x.fx) : (+x.amt || 0); },
    dayLblFn = typeof dayLabel === 'function' ? dayLabel : function (P, d) { return fmtD(d); };
  if (MOB_STATE.tripSub === 'ring') {
    var N = tr.start && tr.end && tr.end >= tr.start ? dayNo(tr.end, tr.start) + 1 : 0,
      leftB = tr.budget ? tr.budget - pl.t : 0,
      pctB = tr.budget ? Math.min(100, Math.round((pl.t / tr.budget) * 100)) : 0,
      byDay = {}, bcat = {};
    (tr.bk || []).forEach(function (x) {
      var c = x.cat || 'Lainnya';
      bcat[c] = (bcat[c] || 0) + bkRpFn(tr, x);
    });
    (tr.it || []).forEach(function (x) {
      if (x.pay === 'on' || !x.est) return;
      var v = itRpFn(tr, x);
      byDay[x.day] = (byDay[x.day] || 0) + v;
      bcat[x.cat || 'Lainnya'] = (bcat[x.cat || 'Lainnya'] || 0) + v;
    });
    var dk = Object.keys(byDay).sort(),
      dmax = dk.reduce(function (m, d) { return Math.max(m, byDay[d]); }, 0) || 1,
      cl = Object.keys(bcat).sort(function (a, b) { return bcat[b] - bcat[a]; }),
      ck = Object.keys(pl.cash).sort(),
      spM = typeof tripFxSplit === 'function' ? tripFxSplit(tr) : { hasFx: false };
    body =
      '<div class="bento-2 m-trip-kpis">' +
      '<div class="m-tile"><div class="m-tile-k">Total Rencana Biaya</div><div class="m-tile-v pv">' + rp(pl.t) + '</div><div class="m-tile-s' + (spM.hasFx ? ' has-fx-split' : ' pv') + '">' + (typeof tripTotalHintHtml === 'function' ? tripTotalHintHtml(tr, pl) : ('Pemesanan ' + rp(pl.b) + ' + Harian ' + rp(pl.d))) + '</div></div>' +
      '<div class="m-tile"><div class="m-tile-k">' + (tr.budget ? (leftB >= 0 ? 'Sisa Anggaran' : 'Melebihi Anggaran') : 'Anggaran') + '</div><div class="m-tile-v pv" style="color:' + (tr.budget ? (leftB >= 0 ? 'var(--emerald)' : 'var(--crimson)') : 'var(--text-primary)') + '">' + (tr.budget ? rp(Math.abs(leftB)) : 'Belum diatur') + '</div><div class="m-tile-s pv">' + (tr.budget ? pctB + '% dari ' + rp(tr.budget) : 'Atur lewat tombol Ubah') + '</div></div>' +
      '<div class="m-tile"><div class="m-tile-k">Sudah Dibayar</div><div class="m-tile-v pv" style="color:var(--emerald)">' + rp(pl.paid) + '</div><div class="m-tile-s pv">Belum dibayar: ' + rp(pl.b - pl.paid) + '</div></div>' +
      '<div class="m-tile"><div class="m-tile-k">Rencana per Hari</div><div class="m-tile-v pv">' + (N ? rp(Math.round(pl.t / N)) : '—') + '</div><div class="m-tile-s">' + (N ? N + ' hari' : 'Tanggal belum diisi') + (tr.cur && tr.rate ? ' · 1 ' + esc(tr.cur) + ' = Rp ' + tr.rate.toLocaleString('id-ID') : '') + '</div></div></div>' +
      '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Siapkan Tunai / Kartu</h3><p class="msc-sub">Akumulasi kebutuhan bayar di tempat</p></div></div><div class="stack" style="gap:6px">' +
      (ck.length ? ck.map(function (k) {
        var cx = pl.cash[k], eqRp = cx.idr + (cx.fx && tr.rate ? Math.round(cx.fx * tr.rate) : 0);
        return '<div class="simple-row m-ring-row"><span class="simple-row-name">' + esc(k) + '</span><span class="mono pv m-ring-fx">' + (cx.fx && tr.cur ? esc(tr.cur) + ' ' + Math.round(cx.fx).toLocaleString('id-ID') : rp(cx.fx || cx.idr)) + '</span><span class="simple-row-amt pv">' + (cx.fx ? (tr.rate ? '≈ ' + rp(eqRp) : (cx.idr ? rp(cx.idr) : '—')) : rp(eqRp)) + '</span></div>';
      }).join('') : '<div style="padding:10px 4px;color:var(--text-muted);font-size:0.78rem">Belum ada pengeluaran tunai/kartu harian di Itinerary.</div>') +
      '</div></div>' +
      '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Estimasi per Hari</h3><p class="msc-sub">Pengeluaran non-online dihitung dari jadwal kegiatan</p></div></div><div class="stack" style="gap:6px">' +
      (dk.length ? dk.map(function (d) {
        return '<div class="simple-row m-ring-row"><span class="simple-row-name">' + esc(dayLblFn(tr, d)) + '</span><span class="simple-row-bar"><i style="width:' + ((byDay[d] / dmax) * 100).toFixed(1) + '%;background:var(--accent)"></i></span><span class="simple-row-amt pv">' + rp(byDay[d]) + '</span></div>';
      }).join('') : '<div style="padding:10px 4px;color:var(--text-muted);font-size:0.78rem">Belum ada estimasi harian.</div>') +
      '</div></div>' +
      '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Rencana Biaya per Kategori</h3><p class="msc-sub">Gabungan pemesanan + pengeluaran harian</p></div><span class="badge b-nt mono pv">' + rp(pl.t) + '</span></div><div class="stack" style="gap:6px">' +
      (cl.length ? cl.map(function (k) {
        var pct = pl.t ? (bcat[k] / pl.t) * 100 : 0, mCat = mobTripCatMapped(k), hex = mobGetCatMeta(mCat).hex;
        return '<div class="simple-row m-ring-row">' + mobCatLogo(mCat, 24) + '<span class="simple-row-name">' + esc(k) + '</span><span class="simple-row-bar"><i style="width:' + pct.toFixed(1) + '%;background:' + hex + '"></i></span><span class="simple-row-pct">' + pct.toFixed(1) + '%</span><span class="simple-row-amt pv">' + rp(bcat[k]) + '</span></div>';
      }).join('') : '<div style="padding:10px 4px;color:var(--text-muted);font-size:0.78rem">Belum ada data biaya.</div>') +
      '</div></div>';
  } else if (MOB_STATE.tripSub === 'itin') {
    body = renderMobTripItin(tr);
  } else if (MOB_STATE.tripSub === 'book') {
    var EBk = MOB_STATE.tripEditBk ? (tr.bk || []).find(function (x) { return x.id === MOB_STATE.tripEditBk; }) : null,
      defBkStart = EBk ? (EBk.a || tr.start || todayISO()) : (tr.start || todayISO()),
      defBkEnd = EBk ? (EBk.b || tr.end || todayISO()) : (tr.end || todayISO());
    body =
      '<div class="bento-3">' +
      '<div class="m-tile"><div class="m-tile-k">Total Pemesanan</div><div class="m-tile-v pv">' + rp(pl.b) + '</div></div>' +
      '<div class="m-tile"><div class="m-tile-k">Sudah Dibayar</div><div class="m-tile-v pv" style="color:var(--emerald)">' + rp(pl.paid) + '</div></div>' +
      '<div class="m-tile"><div class="m-tile-k">Belum Dibayar</div><div class="m-tile-v pv" style="color:var(--amber)">' + rp(pl.b - pl.paid) + '</div></div></div>' +
      '<div class="card"><div class="card-hd"><div><h3 class="card-title">' + (EBk ? 'Ubah Pemesanan' : 'Tambah Pemesanan') + '</h3><p class="msc-sub">Tiket pesawat, hotel, kereta, dan tur prabayar</p></div></div>' +
      '<form id="m-trip-book-form" class="stack" style="gap:9px" novalidate>' +
      '<div class="field"><label class="field-label" for="m-bk-title">Nama</label><input class="input" id="m-bk-title" maxlength="120" placeholder="mis. Tiket Pesawat ANA PP" value="' + esc(EBk ? EBk.title : '') + '" required /></div>' +
      '<div class="field"><label class="field-label" for="m-bk-amt">Jumlah</label><div style="display:flex;gap:6px"><input class="input mono" id="m-bk-amt" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" value="' + (EBk && EBk.amt ? (+EBk.amt).toLocaleString('id-ID') : '') + '" style="flex:1;min-width:0" required />' +
      '<select class="input" id="m-bk-cur" aria-label="Mata uang" style="width:88px;flex-shrink:0"><option value="idr"' + (!(EBk && EBk.fx) ? ' selected' : '') + '>Rp</option>' +
      (tr.cur ? '<option value="fx"' + (EBk && EBk.fx ? ' selected' : '') + '>' + esc(tr.cur) + '</option>' : '') +
      '</select></div><div class="trip-eq-hint mono" id="m-bk-amt-eq"></div></div>' +
      '<div class="bento-2">' +
      '<div class="field"><span class="field-label">Mulai / Check-in</span>' + mobDateFieldHtml('m-bk-start', defBkStart, false) + '</div>' +
      '<div class="field"><span class="field-label">Selesai / Check-out</span>' + mobDateFieldHtml('m-bk-end', defBkEnd, true) + '</div></div>' +
      '<div class="field"><label class="field-label" for="m-bk-cat">Kategori</label><select class="input" id="m-bk-cat">' + BCAT.map(function (c) { return '<option value="' + esc(c) + '"' + ((EBk ? EBk.cat : 'Transport') === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px">' + (EBk ? '<button type="button" class="btn btn-secondary" id="m-bk-cancel">Batal</button>' : '') + '<button type="submit" class="btn btn-primary">' + (EBk ? 'Simpan Perubahan' : 'Tambah Pemesanan') + '</button></div></form></div>' +
      '<div class="stack" style="gap:7px">' +
      ((tr.bk || []).map(function (x) {
        var bkAmtHtml = typeof tripItemAmtHtml === 'function'
          ? tripItemAmtHtml(tr, x.amt, x.fx, 'msc-right', 'font-size:0.84rem')
          : '<strong class="mono pv msc-right" style="font-size:0.84rem">' + rp(bkRpFn(tr, x)) + '</strong>';
        return '<div class="mob-sched-card ' + (x.paid ? 'done' : '') + '" style="padding:10px"><div class="msc-top"><div class="msc-left" style="flex:1">' + mobCatLogo(mobTripCatMapped(x.cat || 'Transport'), 30) +
          '<div style="min-width:0;flex:1"><div style="font-weight:800;font-size:0.84rem">' + esc(x.title) + '</div><div class="msc-badges" style="margin-top:4px"><span class="badge b-nt">' + esc(x.cat || 'Transport') + '</span>' +
          (x.a ? '<span class="badge b-nt">' + esc(mobFmtShortCal(x.a) + (x.b ? ' – ' + mobFmtShortCal(x.b) : '')) + '</span>' : '') +
          '</div></div></div>' + bkAmtHtml + '</div>' +
          '<div style="display:flex;gap:6px;justify-content:flex-end"><button type="button" class="btn ' + (x.paid ? 'btn-emerald' : 'btn-secondary') + ' btn-sm" data-mbk-pay="' + esc(x.id) + '">' + (x.paid ? '✓ Lunas' : 'Tandai lunas') + '</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-mbk-edit="' + esc(x.id) + '">Ubah</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mbk-del="' + esc(x.id) + '">Hapus</button></div></div>';
      }).join('') || '<div class="card" style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:16px">Belum ada pemesanan.</div>') + '</div>';
  } else if (MOB_STATE.tripSub === 'cek') {
    var ck = tr.ck || [], doneCnt = ck.filter(function (c) { return c.done; }).length, pctCk = ck.length ? Math.round((doneCnt / ck.length) * 100) : 0;
    body =
      '<div class="card"><div class="card-hd"><div><h3 class="card-title">Checklist Barang Bawaan</h3><p class="msc-sub">' + doneCnt + ' dari ' + ck.length + ' siap (' + pctCk + '%)</p></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="m-trip-ck-std">Isi Daftar Standar</button></div>' +
      '<div class="rank-track" style="margin-bottom:12px"><div class="rank-fill" style="width:' + pctCk + '%;background:var(--emerald)"></div></div>' +
      '<form id="m-trip-ck-form" style="display:flex;gap:6px;margin-bottom:10px" novalidate><input class="input" id="m-ck-inp" maxlength="60" placeholder="mis. Adaptor Universal" style="flex:1;min-width:0" required /><button type="submit" class="btn btn-primary">Tambah</button></form>' +
      '<div class="stack" style="gap:7px">' +
      (ck.length ? ck.map(function (c) {
        return '<div class="list-row"><label class="m-ck-label"><input type="checkbox" data-mck-tog="' + esc(c.id) + '"' + (c.done ? ' checked' : '') + '><span style="' + (c.done ? 'text-decoration:line-through;color:var(--text-muted)' : 'font-weight:700') + '">' + esc(c.text || c.t || '') + '</span></label>' +
          '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mck-del="' + esc(c.id) + '">Hapus</button></div>';
      }).join('') : '<div style="padding:14px 4px;text-align:center;color:var(--text-muted);font-size:0.78rem">Belum ada barang. Klik "Isi Daftar Standar" atau tambah manual.</div>') + '</div></div>';
  } else if (MOB_STATE.tripSub === 'cat') {
    var lk = tr.lk || [];
    body =
      '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Tautan Berguna</h3><p class="msc-sub">Video panduan, situs tiket, peta</p></div></div>' +
      '<form id="m-trip-lk-form" class="stack" style="gap:8px;margin-bottom:10px" novalidate>' +
      '<input class="input" id="m-lk-title" maxlength="80" placeholder="Judul tautan" required />' +
      '<div style="display:flex;gap:6px"><input class="input" id="m-lk-url" inputmode="url" maxlength="400" placeholder="https://..." style="flex:1;min-width:0" required /><button type="submit" class="btn btn-primary">Tambah</button></div></form>' +
      '<div class="stack" style="gap:7px">' +
      (lk.length ? lk.map(function (x) {
        var safeU = x.url && (typeof safeHref === 'function' ? safeHref(x.url) : '');
        var linkEl = safeU
          ? '<a href="' + esc(safeU) + '" target="_blank" rel="noopener noreferrer" data-m-ext-url="' + esc(safeU) + '" class="m-ext-link">' + esc(x.title || x.url) + ' ↗</a>'
          : '<span class="m-ext-link m-ext-link-invalid">' + esc(x.title || 'Tautan tidak valid') + '</span>';
        return '<div class="list-row">' + linkEl +
          '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);flex-shrink:0" data-mlk-del="' + esc(x.id) + '">Hapus</button></div>';
      }).join('') : '<div style="padding:10px 4px;color:var(--text-muted);font-size:0.78rem">Belum ada tautan.</div>') +
      '</div></div>' +
      '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Catatan Penting</h3><p class="msc-sub">Kode booking hotel, alamat, kontak darurat (tersimpan otomatis)</p></div><span class="badge b-em">Tersimpan</span></div>' +
      '<textarea class="input" id="m-trip-note" rows="5" placeholder="mis. Hotel: ...">' + esc(tr.note || '') + '</textarea></div>';
  } else {
    var g = tr.goal, defT = g ? g.t : Math.max(1000000, Math.ceil(pl.t / 1000) * 1000), curM = todayISO().slice(0, 7), toM = tr.start && tr.start.slice(0, 7) >= curM ? tr.start.slice(0, 7) : (S.year + '-12');
    if (g && !MOB_STATE.tripGoalEdit) {
      var perG = typeof goalPlan === 'function' ? goalPlan(g).per : (g.per || 0),
        gsG = typeof goalSavedNow === 'function'
          ? goalSavedNow({ t: g.t, s0: g.s0, from: g.from, to: g.to, per: perG }, todayISO())
          : { got: Math.min(g.t, (g.s0 || 0) + perG), pct: g.t ? Math.min(100, Math.round((Math.min(g.t, (g.s0 || 0) + perG) / g.t) * 100)) : 0 },
        gotG = gsG.got, pctG = gsG.pct;
      body =
        '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Target Tabungan</h3><p class="msc-sub">Sisihan dana bulanan sebelum berangkat</p></div>' +
        '<span class="badge ' + (g.link ? 'b-em' : 'b-nt') + '">' + (g.link ? 'Tersambung ke Rincian' : 'Hanya Pencatat') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;font-size:0.82rem"><span>Terkumpul <strong class="mono pv">' + rp(gotG) + '</strong> dari <strong class="mono pv">' + rp(g.t) + '</strong></span><strong class="mono" style="color:var(--emerald)">' + pctG + '%</strong></div>' +
        '<div class="rank-track" style="height:8px;margin-bottom:10px"><div class="rank-fill" style="width:' + pctG + '%;background:var(--emerald)"></div></div>' +
        '<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px">Sisihkan <strong class="mono pv">' + rp(perG) + '</strong> per bulan &middot; <span style="white-space:nowrap">' + esc(g.from) + ' – ' + esc(g.to) + '</span></p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-secondary btn-sm" id="m-tg-edit">Ubah Target</button><button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" id="m-tg-del">Hapus Target</button></div></div>';
    } else {
      body =
        '<div class="card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Target Tabungan</h3><p class="msc-sub">Hitung dana bulanan sebelum berangkat</p></div></div>' +
        '<form id="m-trip-goal-form" class="stack" style="gap:9px" novalidate>' +
        '<div class="field"><label class="field-label" for="m-tg-t">Target Total (Rp)</label><input class="input mono" id="m-tg-t" type="text" inputmode="numeric" data-num-fmt="rp" value="' + (defT || 0).toLocaleString('id-ID') + '" required /></div>' +
        '<div class="bento-2">' +
        '<div class="field"><label class="field-label" for="m-tg-s0">Sudah Terkumpul (Rp)</label><input class="input mono" id="m-tg-s0" type="text" inputmode="numeric" data-num-fmt="rp" value="' + (g ? (g.s0 || 0) : 0).toLocaleString('id-ID') + '" /></div>' +
        '<div class="field"><label class="field-label" for="m-tg-link">Hubungkan ke Rincian?</label><select class="input" id="m-tg-link"><option value="1"' + (!g || g.link ? ' selected' : '') + '>Ya, hitung di Rincian</option><option value="0"' + (g && !g.link ? ' selected' : '') + '>Tidak, hanya pencatat</option></select></div></div>' +
        '<div class="bento-2"><div class="field"><label class="field-label" for="m-tg-from">Mulai Bulan</label><input class="input mono" id="m-tg-from" type="month" value="' + esc(g ? g.from : curM) + '" /></div>' +
        '<div class="field"><label class="field-label" for="m-tg-to">Target Bulan</label><input class="input mono" id="m-tg-to" type="month" value="' + esc(g ? g.to : toM) + '" /></div></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px">' + (g ? '<button type="button" class="btn btn-secondary" id="m-tg-cancel">Batal</button>' : '') + '<button type="submit" class="btn btn-primary">Simpan Target</button></div></form></div>';
    }
  }

  root.innerHTML =
    '<div class="card"><div class="pill-slider" id="m-trip-prof-strip" style="margin-bottom:10px">' +
    '<button type="button" class="p-chip" data-mtrip-list="1">&larr; Semua (' + list.length + ')</button>' +
    list.map(function (t) { return '<button type="button" class="p-chip ' + (t.id === tr.id ? 'active' : '') + '" data-mtrip-sel="' + esc(t.id) + '">' + esc(t.name) + '</button>'; }).join('') +
    '<button type="button" class="p-chip" id="m-btn-trip-new-pill" style="border-style:dashed;color:var(--accent-ink)">＋ Perjalanan Baru</button></div>' +
    '<div class="m-trip-det-hd"><div class="m-trip-title-wrap"><strong style="font-size:0.96rem">' + esc(tr.name) + '</strong>' +
    '<div style="font-size:0.71rem;color:var(--text-muted)">' + (tr.start && tr.end ? fmtD(tr.start) + ' – ' + fmtD(tr.end) : 'Tanggal belum diisi') +
    (tr.cur && tr.rate ? ' &middot; Kurs 1 ' + esc(tr.cur) + ' = <span class="mono pv">Rp ' + (+tr.rate).toLocaleString('id-ID') + '</span>' : '') + '</div></div>' +
    '<div class="m-trip-hd-actions"><button type="button" class="btn btn-secondary btn-sm" id="m-btn-trip-share">Bagikan</button><button type="button" class="btn btn-secondary btn-sm" id="m-btn-trip-edit">Ubah</button><button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson)" data-mtrip-del="' + esc(tr.id) + '">Hapus</button></div></div>' +
    '<div class="pill-slider">' + subTabs.map(function (st) { return '<button type="button" class="p-chip ' + (MOB_STATE.tripSub === st[0] ? 'active' : '') + '" data-mtripsub="' + st[0] + '">' + st[1] + '</button>'; }).join('') + '</div></div>' + body;
  mobSyncTripEqPrev();
}

function getMobDueList() {
  var hz = MOB_STATE.notifHorizon != null ? MOB_STATE.notifHorizon : (typeof remHz !== 'undefined' ? remHz : 7),
    r = reminders(hz),
    today = todayISO(),
    out = [];
  if (MOB_STATE.notifLate) r.late.forEach(function (x) { out.push(Object.assign({ kind: 'late', diff: daysBetweenISO(isoD(x.t), today) }, x)); });
  if (MOB_STATE.notifToday || MOB_STATE.notifSoon) {
    r.soon.forEach(function (x) {
      var df = daysBetweenISO(isoD(x.t), today);
      if ((df === 0 && MOB_STATE.notifToday) || (df > 0 && MOB_STATE.notifSoon)) out.push(Object.assign({ kind: df === 0 ? 'today' : 'soon', diff: df }, x));
    });
  }
  return out;
}

function mobGetDismissedNotifs() {
  var td = todayISO();
  if (!MOB_STATE.dismissedNotifs || MOB_STATE.dismissedNotifs.date !== td) {
    var saved = null;
    try {
      if (typeof localStorage !== 'undefined') saved = JSON.parse(localStorage.getItem('rk-mob-dismissed-notifs') || 'null');
    } catch (e) {}
    MOB_STATE.dismissedNotifs = saved && saved.date === td && Array.isArray(saved.keys) ? saved : { date: td, keys: [] };
  }
  return MOB_STATE.dismissedNotifs.keys;
}

function mobDismissNotifKey(key) {
  if (!key) return;
  var keys = mobGetDismissedNotifs();
  if (keys.indexOf(key) < 0) keys.push(key);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('rk-mob-dismissed-notifs', JSON.stringify(MOB_STATE.dismissedNotifs));
  } catch (e) {}
  syncMobNotifDot();
}

function getMobVisibleDueList() {
  var dis = mobGetDismissedNotifs();
  return getMobDueList().filter(function (x) { return dis.indexOf(x.key) < 0; });
}

function syncMobNotifDot() {
  var vis = getMobVisibleDueList(),
    dot = $('m-notif-dot'),
    cnt = vis.length;
  if (dot) {
    dot.style.display = cnt ? 'block' : 'none';
    if (cnt > 0 && MOB_STATE._prevNotifCnt !== cnt && typeof rkTriggerBadgePop === 'function') {
      rkTriggerBadgePop(dot);
    }
    MOB_STATE._prevNotifCnt = cnt;
  }
}

function isMobNotifOsActive() {
  if (typeof rkCanOsNotif === 'function') return rkCanOsNotif();
  var isReset = typeof rkIsNotifReset === 'function' && rkIsNotifReset();
  return !isReset && typeof Notification !== 'undefined' && 'Notification' in window && !!Notification && Notification.permission === 'granted';
}

function renderMobNotifPopover() {
  var cta = $('m-pop-os-cta'),
    pl = $('m-notif-pop-list');
  if (cta) {
    cta.innerHTML = !isMobNotifOsActive()
      ? '<button type="button" class="btn m-notif-enable-btn" id="m-pop-enable-os">🔔 Pencet, untuk aktifkan notifikasi</button>'
      : '';
  }
  if (pl) {
    var due = getMobVisibleDueList().slice(0, 6);
    pl.innerHTML = due.length
      ? '<div style="font-size:0.66rem;color:var(--text-muted);text-align:right;margin-bottom:2px">Geser kanan untuk hapus &rarr;</div>' +
        due.map(function (x) {
          var iso = isoD(x.t);
          return '<div class="m-notif-swipe-row" data-mnotif-key="' + esc(x.key) + '"><div><strong>' + esc(x.it.name) + '</strong> &middot; ' + fmtD(iso) + '</div><button type="button" class="btn btn-emerald btn-sm" data-mquickpaid="' + esc(x.it.id) + '|' + iso + '">Lunas</button></div>';
        }).join('')
      : '<div style="font-size:0.75rem;color:var(--text-muted)">Tidak ada tagihan jatuh tempo.</div>';
  }
  syncMobNotifDot();
}

function ensureMobOsNotifEl() {
  var bn = $('m-os-notif');
  if (bn) return bn;
  var shell = document.querySelector('#mobile-app-shell .mob-shell');
  if (!shell || typeof document === 'undefined') return null;
  var wrap = document.createElement('div');
  wrap.innerHTML = mobOsNotifHtml();
  bn = wrap.firstElementChild;
  if (!bn) return null;
  shell.insertBefore(bn, shell.firstChild);
  if (bn.offsetWidth > 0) void bn.offsetWidth;
  return bn;
}

function dismissMobOsNotif(swipeDir) {
  clearTimeout(mobNotifTimer);
  mobNotifTimer = null;
  var bn = $('m-os-notif');
  if (!bn) return;
  clearTimeout(bn._ponDismissT);
  if (!swipeDir) {
    bn.classList.remove('show', 'is-swiping', 'is-snapping', 'is-dismissing');
    bn.style.removeProperty('--pon-dx');
    bn.style.opacity = '';
    return;
  }
  var reduced = typeof rkIsReducedMotion === 'function' && rkIsReducedMotion();
  if (reduced) {
    if (bn.parentNode) bn.parentNode.removeChild(bn);
    return;
  }
  var w = bn.offsetWidth || 320;
  bn.classList.remove('is-swiping', 'is-snapping');
  bn.classList.add('is-dismissing');
  bn.style.setProperty('--pon-dx', ((swipeDir > 0 ? 1 : -1) * (w + 48)) + 'px');
  bn.style.opacity = '0';
  var removed = false;
  var finishRemove = function () {
    if (removed) return;
    removed = true;
    clearTimeout(bn._ponDismissT);
    if (bn.parentNode) bn.parentNode.removeChild(bn);
  };
  bn.addEventListener('transitionend', finishRemove, { once: true });
  bn._ponDismissT = setTimeout(finishRemove, 220);
}

function triggerMobPhoneBarNotif(force) {
  if ((!MOB_STATE.notifEnabled || (typeof rkIsNotifReset === 'function' && rkIsNotifReset())) && !force) return;
  var due = getMobVisibleDueList(),
    bn = ensureMobOsNotifEl();
  if (!bn) return;
  if (!due.length) {
    if (!force) return;
    if ($('m-pon-title')) $('m-pon-title').textContent = 'Pengingat Tagihan Aktif';
    if ($('m-pon-body')) $('m-pon-body').textContent = 'Tidak ada tagihan jatuh tempo dalam ' + (MOB_STATE.notifHorizon || 7) + ' hari ke depan.';
    MOB_BANNER_DUE = null;
  } else {
    if ($('m-pon-title')) $('m-pon-title').textContent = 'Pengingat Tagihan Jatuh Tempo (' + due.length + ')';
    var lines = due.slice(0, 3).map(function (x) {
      var tm = x.diff < 0 ? 'TERLEWAT (' + Math.abs(x.diff) + ' hr)' : x.diff === 0 ? 'HARI INI' : x.diff + ' hari lagi';
      return x.it.name + ' (' + rp(x.price) + ' · ' + tm + ')';
    });
    if ($('m-pon-body')) $('m-pon-body').textContent = lines.join('\n');
    MOB_BANNER_DUE = due[0];
  }
  clearTimeout(bn._ponDismissT);
  bn.classList.remove('is-swiping', 'is-snapping', 'is-dismissing');
  bn.style.removeProperty('--pon-dx');
  bn.style.opacity = '';
  bn.classList.add('show');
  clearTimeout(mobNotifTimer);
  mobNotifTimer = setTimeout(function () {
    if ($('m-os-notif')) $('m-os-notif').classList.remove('show');
    mobNotifTimer = null;
  }, 7500);
  if (force && due.length && typeof triggerSystemNotification === 'function' && isMobNotifOsActive()) {
    var osTtl = $('m-pon-title') ? $('m-pon-title').textContent : 'Pengingat Tagihan Jatuh Tempo';
    var osBody = $('m-pon-body') ? $('m-pon-body').textContent : '';
    triggerSystemNotification(osTtl, osBody, 'bill-due-' + todayISO());
  }
}

function rkParseReleaseNotes(body) {
  var lines = String(body || '').split(/\r?\n/), out = {};
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i].trim();
    if (!ln) continue;
    var eq = ln.indexOf('=');
    if (eq <= 0) continue;
    var k = ln.slice(0, eq).trim();
    var v = ln.slice(eq + 1).trim();
    out[k] = v;
  }
  var runNum = parseInt(out.run, 10);
  if (!Number.isFinite(runNum) || runNum <= 0) return null;
  var vcNum = parseInt(out.versionCode, 10);
  return {
    run: runNum,
    sha: out.sha || '',
    versionCode: Number.isFinite(vcNum) && vcNum > 0 ? vcNum : runNum,
    builtAt: out.builtAt || '',
    sha256: out.sha256 || '',
    msg: out.msg || '',
  };
}

function rkFormatApkTime(val) {
  if (!val || val === 'dev') return '';
  try {
    var d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(val);
  }
}

function rkInstalledBuildMeta() {
  var b = (typeof window !== 'undefined' && window.RK_BUILD) ? window.RK_BUILD : null;
  var id = (b && b.id) ? String(b.id) : 'dev';
  var runNum = (b && b.run) ? parseInt(b.run, 10) : NaN;
  if (!Number.isFinite(runNum) || runNum <= 0) runNum = 0;
  var time = (b && b.time && b.time !== 'dev') ? String(b.time) : '';
  return { id: id, run: runNum, sha: (b && b.sha) ? String(b.sha) : '', time: time, isDev: !id || id === 'dev' || !runNum };
}

function rkSyncUpdateDots() {
  var show = MOB_UPDATE_STATE.status === 'available' && rkIsCapacitorNative();
  if ($('m-upd-dot')) $('m-upd-dot').style.display = show ? 'inline-block' : 'none';
  if ($('m-more-upd-dot')) $('m-more-upd-dot').style.display = show ? 'inline-block' : 'none';
}

function rkCapPlugin(name) {
  if (!rkIsCapacitorNative()) return null;
  var cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (!cap || !cap.Plugins || !cap.Plugins[name]) return null;
  if (typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable(name)) return null;
  return cap.Plugins[name];
}

function rkHasInAppApkPlugins() {
  var fsP = rkCapPlugin('Filesystem');
  var apkP = rkCapPlugin('ApkInstaller');
  return !!(
    fsP && typeof fsP.downloadFile === 'function' && typeof fsP.mkdir === 'function' &&
    apkP && typeof apkP.canInstall === 'function' && typeof apkP.install === 'function' && typeof apkP.openInstallSettings === 'function'
  );
}

function rkFmtMb(bytes) {
  var mb = (Number(bytes) || 0) / 1048576;
  return mb.toFixed(1).replace('.', ',') + ' MB';
}

function rkFormatProgText() {
  var ph = MOB_UPDATE_STATE.phase;
  if (ph === 'verifying') return 'Memverifikasi integritas SHA-256...';
  if (ph === 'stalled') return 'Unduhan tersendat (tidak ada progres)';
  var b = Number(MOB_UPDATE_STATE.progressBytes) || 0;
  var tot = Number(MOB_UPDATE_STATE.progressTotal) || 0;
  if (MOB_UPDATE_STATE.indeterminate || !(tot > 0)) {
    return b > 0 ? 'Mengunduh · ' + rkFmtMb(b) : 'Menghubungkan & mengunduh...';
  }
  var pct = Math.max(0, Math.min(100, Math.round((b / tot) * 100)));
  return pct + '% · ' + rkFmtMb(b) + ' / ' + rkFmtMb(tot);
}

function rkUpdateProgressDom(force) {
  var now = Date.now();
  if (!force && now - _rkUpdLastPaintAt < 100) return;
  _rkUpdLastPaintAt = now;
  var track = $('m-upd-prog-track'), fill = $('m-upd-prog-fill'), txt = $('m-upd-prog-text');
  if (!track || !fill || !txt) return;
  var b = Number(MOB_UPDATE_STATE.progressBytes) || 0;
  var tot = Number(MOB_UPDATE_STATE.progressTotal) || 0;
  if (MOB_UPDATE_STATE.indeterminate || !(tot > 0)) {
    track.classList.add('is-indeterminate');
    track.removeAttribute('aria-valuenow');
    fill.style.removeProperty('--p');
  } else {
    var pct = Math.max(0, Math.min(100, Math.round((b / tot) * 100)));
    MOB_UPDATE_STATE.progressPct = pct;
    track.classList.remove('is-indeterminate');
    track.setAttribute('aria-valuenow', String(pct));
    fill.style.setProperty('--p', (pct / 100).toFixed(4));
  }
  txt.textContent = rkFormatProgText();
}

function rkBase64ToBytes(b64) {
  var clean = String(b64 || '').replace(/\s+/g, '');
  if (!clean) return new Uint8Array(0);
  var outChunks = [], totalLen = 0, CHUNK = 65536; // kelipatan 4 karakter base64
  for (var i = 0; i < clean.length; i += CHUNK) {
    var bin = atob(clean.slice(i, i + CHUNK));
    var buf = new Uint8Array(bin.length);
    for (var j = 0; j < bin.length; j++) buf[j] = bin.charCodeAt(j);
    outChunks.push(buf);
    totalLen += buf.length;
  }
  var merged = new Uint8Array(totalLen), off = 0;
  for (var k = 0; k < outChunks.length; k++) {
    merged.set(outChunks[k], off);
    off += outChunks[k].length;
  }
  return merged;
}

function rkVerifyApkSha256(fsPlugin, relPath, expectedHex, knownBytes) {
  var exp = String(expectedHex || '').trim().toLowerCase();
  if (!exp) {
    return Promise.resolve({ ok: true, verified: false, note: 'Integritas berkas tidak diverifikasi (SHA-256 tidak tersedia).' });
  }
  var cObj = typeof crypto !== 'undefined' ? crypto : (typeof window !== 'undefined' ? window.crypto : null);
  if (!cObj || !cObj.subtle || typeof cObj.subtle.digest !== 'function') {
    return Promise.resolve({ ok: true, verified: false, note: 'Integritas berkas tidak diverifikasi (WebCrypto tidak tersedia).' });
  }
  if (Number(knownBytes) > RK_UPDATE_HASH_MAX_BYTES) {
    return Promise.resolve({ ok: true, verified: false, note: 'Integritas berkas tidak diverifikasi (ukuran melebihi batas verifikasi).' });
  }
  if (!fsPlugin || typeof fsPlugin.readFile !== 'function') {
    return Promise.resolve({ ok: true, verified: false, note: 'Integritas berkas tidak diverifikasi.' });
  }
  return Promise.resolve(fsPlugin.readFile({ path: relPath, directory: 'CACHE' })).then(function (res) {
    var bytes = rkBase64ToBytes(res && res.data);
    return Promise.resolve(cObj.subtle.digest('SHA-256', bytes)).then(function (ab) {
      var u8 = new Uint8Array(ab), hex = '';
      for (var i = 0; i < u8.length; i++) hex += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
      if (hex !== exp) {
        if (typeof fsPlugin.deleteFile === 'function') {
          Promise.resolve(fsPlugin.deleteFile({ path: relPath, directory: 'CACHE' })).catch(function () {});
        }
        return { ok: false, mismatch: true };
      }
      return { ok: true, verified: true, note: '' };
    });
  }).catch(function () {
    return { ok: true, verified: false, note: 'Integritas berkas tidak diverifikasi.' };
  });
}

function rkCleanupApkCache(fsPlugin) {
  if (!fsPlugin) return Promise.resolve();
  var cleanOld = typeof fsPlugin.readdir === 'function' && typeof fsPlugin.deleteFile === 'function'
    ? Promise.resolve(fsPlugin.readdir({ path: RK_UPDATE_DIR, directory: 'CACHE' })).then(function (res) {
        var files = res && Array.isArray(res.files) ? res.files : [];
        return Promise.all(files.map(function (entry) {
          var nm = entry && typeof entry === 'object' ? (entry.name || '') : String(entry || '');
          if (!nm) return Promise.resolve();
          return Promise.resolve(fsPlugin.deleteFile({ path: RK_UPDATE_DIR + '/' + nm, directory: 'CACHE' })).catch(function () {});
        }));
      }).catch(function () {})
    : Promise.resolve();
  return cleanOld.then(function () {
    return Promise.resolve(fsPlugin.mkdir({ path: RK_UPDATE_DIR, directory: 'CACHE', recursive: true })).catch(function () {});
  });
}

function rkCleanupApkCacheOnStart() {
  if (!rkIsCapacitorNative()) return Promise.resolve(false);
  var isBusyOrReady = function () {
    var ph = MOB_UPDATE_STATE.phase;
    return ph === 'downloading' || ph === 'verifying' || ph === 'installing' ||
      ph === 'ready' || ph === 'need-permission' || !!MOB_UPDATE_STATE.downloadedPath;
  };
  if (isBusyOrReady()) return Promise.resolve(false);
  var fsP = rkCapPlugin('Filesystem');
  if (!fsP || typeof fsP.readdir !== 'function' || typeof fsP.deleteFile !== 'function') {
    return Promise.resolve(false);
  }
  try {
    return Promise.resolve(fsP.readdir({ path: RK_UPDATE_DIR, directory: 'CACHE' })).then(function (res) {
      if (isBusyOrReady()) return false;
      var files = res && Array.isArray(res.files) ? res.files : [];
      return Promise.all(files.map(function (entry) {
        var nm = entry && typeof entry === 'object' ? (entry.name || '') : String(entry || '');
        if (!nm || !/\.apk$/i.test(nm)) return Promise.resolve();
        return Promise.resolve(fsP.deleteFile({ path: RK_UPDATE_DIR + '/' + nm, directory: 'CACHE' })).catch(function () {});
      })).then(function () {
        return true;
      });
    }).catch(function () {
      return false;
    });
  } catch (e) {
    return Promise.resolve(false);
  }
}

function rkBindUpdAppStateResume() {
  if (typeof window !== 'undefined' && window._rkUpdAppStateBound) return;
  var appP = rkCapPlugin('App');
  if (!appP || typeof appP.addListener !== 'function') return;
  if (typeof window !== 'undefined') window._rkUpdAppStateBound = true;
  Promise.resolve(appP.addListener('appStateChange', function (state) {
    if (!(state && state.isActive)) return;
    if (MOB_UPDATE_STATE.phase !== 'need-permission' || !MOB_UPDATE_STATE.downloadedPath) return;
    var apkP = rkCapPlugin('ApkInstaller');
    if (!apkP || typeof apkP.canInstall !== 'function') return;
    Promise.resolve(apkP.canInstall()).then(function (res) {
      if (res && res.allowed) {
        MOB_UPDATE_STATE.phase = 'ready';
        MOB_UPDATE_STATE.message = 'Izin pemasangan aktif. Ketuk Pasang untuk membuka pemasang Android.';
        renderMobUpdateCard();
      }
    }).catch(function () {});
  })).catch(function () {});
}

function renderMobUpdateCard() {
  var card = $('m-card-settings-update');
  if (!card) return;
  var isNat = rkIsCapacitorNative();
  var meta = rkInstalledBuildMeta();
  var verText = meta.isDev
    ? 'Build lokal (tidak ada nomor versi)'
    : meta.id + (meta.time ? ' (' + rkFormatApkTime(meta.time) + ')' : '');
  var lastText = MOB_UPDATE_STATE.checkedAt > 0
    ? rkFormatApkTime(new Date(MOB_UPDATE_STATE.checkedAt).toISOString())
    : '';

  if (!isNat) {
    card.innerHTML =
      '<div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Pembaruan Aplikasi</h2><div style="font-size:0.71rem;color:var(--text-muted)">Rilis APK Android via GitHub Releases</div></div></div>' +
      '<div class="m-upd-meta"><div>Versi terpasang: <strong class="mono">' + esc(verText) + '</strong></div></div>' +
      '<div class="m-upd-status" style="margin-top:8px">Pembaruan hanya tersedia di aplikasi Android</div>';
    rkSyncUpdateDots();
    return;
  }

  var st = MOB_UPDATE_STATE.status;
  var ph = MOB_UPDATE_STATE.phase || 'idle';
  var info = MOB_UPDATE_STATE.info;
  var busy = !!(MOB_UPDATE_STATE.checking || ph === 'downloading' || ph === 'verifying' || ph === 'installing');
  var statusHtml = '';
  if (MOB_UPDATE_STATE.checking) {
    statusHtml = '<div class="m-upd-status">Memeriksa pembaruan terbaru...</div>';
  } else if (ph === 'downloading') {
    statusHtml = '<div class="m-upd-status is-avail">Mengunduh berkas APK di dalam aplikasi...</div>';
  } else if (ph === 'verifying') {
    statusHtml = '<div class="m-upd-status is-avail">Memverifikasi integritas berkas APK...</div>';
  } else if (ph === 'installing') {
    statusHtml = '<div class="m-upd-status is-avail">Membuka pemasang sistem Android...</div>';
  } else if (ph === 'stalled' || ph === 'error' || ph === 'need-permission') {
    statusHtml = '<div class="m-upd-status is-err">' + esc(MOB_UPDATE_STATE.message || 'Terjadi gangguan pembaruan.') + '</div>';
  } else if (ph === 'ready') {
    statusHtml = '<div class="m-upd-status is-avail">' + esc(MOB_UPDATE_STATE.message || 'Pemasang Android dibuka. Ketuk Pasang.') + '</div>';
  } else if (st === 'latest') {
    statusHtml = '<div class="m-upd-status">Sudah versi terbaru.</div>';
  } else if (st === 'available' && info) {
    var dtPart = info.builtAt ? rkFormatApkTime(info.builtAt) : '';
    var detailParts = ['build ' + info.run + (info.sha ? ' (' + info.sha + ')' : '')];
    if (dtPart) detailParts.push(dtPart);
    if (info.msg) detailParts.push(info.msg);
    statusHtml = '<div class="m-upd-status is-avail">Pembaruan tersedia: ' + esc(detailParts.join(' · ')) + '</div>';
  } else if (st === 'error' && MOB_UPDATE_STATE.message) {
    statusHtml = '<div class="m-upd-status is-err">' + esc(MOB_UPDATE_STATE.message) + '</div>';
  }

  var showProg = ph === 'downloading' || ph === 'verifying' || ph === 'stalled';
  var isIndet = ph === 'downloading' && (MOB_UPDATE_STATE.indeterminate || !(MOB_UPDATE_STATE.progressTotal > 0));
  var pctVal = Math.max(0, Math.min(100, Number(MOB_UPDATE_STATE.progressPct) || 0));
  var progHtml = showProg
    ? '<div class="m-upd-prog-wrap" id="m-upd-prog-wrap">' +
      '<div class="m-upd-prog-track' + (isIndet ? ' is-indeterminate' : '') + '" id="m-upd-prog-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"' +
      (isIndet ? '' : ' aria-valuenow="' + pctVal + '"') + '>' +
      '<div class="m-upd-prog-fill" id="m-upd-prog-fill" style="--p:' + (isIndet ? 0 : (pctVal / 100).toFixed(4)) + '"></div></div>' +
      '<div class="m-upd-prog-text" id="m-upd-prog-text">' + esc(rkFormatProgText()) + '</div>' +
      '</div>'
    : '';

  var stepsHtml = MOB_UPDATE_STATE.showSteps
    ? '<ol class="m-upd-steps">' +
      '<li>Ketuk berkas APK yang terunduh di notifikasi atau folder Unduhan.</li>' +
      '<li>Izinkan "pasang dari sumber ini" satu kali bila diminta Android.</li>' +
      '<li>Ketuk Pasang untuk memperbarui aplikasi.</li>' +
      '</ol>'
    : '';

  var hasValidUrl = !!(info && info.url && String(info.url).indexOf(RK_UPDATE_DL_PREFIX) === 0);
  var canInstallIdle = st === 'available' && ph === 'idle' && info && info.url;
  var btnsHtml = '<button type="button" class="btn btn-primary btn-sm m-upd-btn" id="m-btn-check-update"' + (busy ? ' disabled' : '') + '>' +
    (MOB_UPDATE_STATE.checking ? 'Memeriksa...' : 'Cek pembaruan') + '</button>';

  if (ph === 'need-permission') {
    btnsHtml += '<button type="button" class="btn btn-primary btn-sm m-upd-btn" id="m-btn-perm-update">Buka pengaturan izin</button>';
    btnsHtml += '<button type="button" class="btn btn-emerald btn-sm m-upd-btn" id="m-btn-retry-install-update">Pasang</button>';
    if (hasValidUrl) {
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-open-browser-update">Buka lewat browser</button>';
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-copy-update-url">Salin tautan</button>';
    }
  } else if (ph === 'ready') {
    if (MOB_UPDATE_STATE.downloadedPath) {
      btnsHtml += '<button type="button" class="btn btn-emerald btn-sm m-upd-btn" id="m-btn-retry-install-update">Pasang</button>';
    }
    if (hasValidUrl) {
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-copy-update-url">Salin tautan</button>';
    }
  } else if (ph === 'error' && MOB_UPDATE_STATE.downloadedPath) {
    btnsHtml += '<button type="button" class="btn btn-emerald btn-sm m-upd-btn" id="m-btn-retry-install-update">Coba pasang lagi</button>';
    if (info && info.url) {
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-install-update" data-force-dl="1">Unduh ulang</button>';
      if (hasValidUrl) {
        btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-open-browser-update">Buka lewat browser</button>';
        btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-copy-update-url">Salin tautan</button>';
      }
    }
  } else if ((ph === 'stalled' || ph === 'error') && info && info.url) {
    btnsHtml += '<button type="button" class="btn btn-emerald btn-sm m-upd-btn" id="m-btn-install-update">Coba unduh lagi</button>';
    if (hasValidUrl) {
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-open-browser-update">Buka lewat browser</button>';
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-copy-update-url">Salin tautan</button>';
    }
  } else if (canInstallIdle) {
    btnsHtml += '<button type="button" class="btn btn-emerald btn-sm m-upd-btn" id="m-btn-install-update">Unduh &amp; pasang</button>';
    if (hasValidUrl) {
      btnsHtml += '<button type="button" class="btn btn-secondary btn-sm m-upd-btn" id="m-btn-copy-update-url">Salin tautan</button>';
    }
  }

  card.innerHTML =
    '<div class="card-hd" style="margin-bottom:8px"><div><h2 class="card-title">Pembaruan Aplikasi</h2><div style="font-size:0.71rem;color:var(--text-muted)">Rilis APK Android via GitHub Releases</div></div>' +
    (st === 'available' ? '<span class="badge b-am">Tersedia</span>' : (st === 'latest' ? '<span class="badge b-em">Terbaru</span>' : '')) + '</div>' +
    '<div class="stack" style="gap:8px">' +
    '<div class="m-upd-meta">' +
    '<div>Versi terpasang: <strong class="mono">' + esc(verText) + '</strong></div>' +
    (lastText ? '<div>Terakhir dicek: <strong>' + esc(lastText) + '</strong></div>' : '') +
    '</div>' +
    statusHtml +
    progHtml +
    '<div class="m-upd-actions">' + btnsHtml + '</div>' +
    stepsHtml +
    '</div>';
  rkSyncUpdateDots();
}

function rkResetApkDownloadState() {
  MOB_UPDATE_STATE.phase = 'idle';
  MOB_UPDATE_STATE.downloadedPath = '';
  MOB_UPDATE_STATE.downloadedRun = 0;
  MOB_UPDATE_STATE.unverifiedNote = '';
  MOB_UPDATE_STATE.showSteps = false;
  MOB_UPDATE_STATE.progressBytes = 0;
  MOB_UPDATE_STATE.progressTotal = 0;
  MOB_UPDATE_STATE.progressPct = 0;
  MOB_UPDATE_STATE.indeterminate = false;
}

function rkCheckApkUpdate(opts) {
  var silent = !!(opts && opts.silent);
  var curPhase = MOB_UPDATE_STATE.phase;
  if (!rkIsCapacitorNative() || MOB_UPDATE_STATE.checking ||
      curPhase === 'downloading' || curPhase === 'verifying' || curPhase === 'installing') {
    return Promise.resolve(null);
  }
  if (typeof fetch !== 'function') {
    if (!silent) {
      MOB_UPDATE_STATE.status = 'error';
      if (!MOB_UPDATE_STATE.downloadedPath) rkResetApkDownloadState();
      MOB_UPDATE_STATE.message = 'Klien jaringan tidak tersedia.';
      renderMobUpdateCard();
    }
    return Promise.resolve(null);
  }
  MOB_UPDATE_STATE.checking = true;
  if (!silent) {
    renderMobUpdateCard();
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(RK_UPDATE_CHECK_LS, String(Date.now()));
  } catch (e) {}

  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var tid = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, RK_UPDATE_TIMEOUT_MS) : null;
  var fetchOpts = {
    method: 'GET',
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  };
  if (ctrl && ctrl.signal) fetchOpts.signal = ctrl.signal;

  return Promise.resolve(
    fetch('https://api.github.com/repos/' + RK_UPDATE_REPO + '/releases/tags/apk-latest', fetchOpts)
  ).then(function (resp) {
    if (tid) clearTimeout(tid);
    if (!resp) throw new Error('network');
    if (resp.status === 403 || resp.status === 429) {
      var rl = new Error('rate-limit');
      rl.rkCode = resp.status;
      throw rl;
    }
    if (resp.status === 404) {
      var nf = new Error('not-found');
      nf.rkCode = 404;
      throw nf;
    }
    if (!resp.ok) {
      var he = new Error('http-' + resp.status);
      he.rkCode = resp.status;
      throw he;
    }
    return resp.json();
  }).then(function (rel) {
    MOB_UPDATE_STATE.checking = false;
    var activePh = MOB_UPDATE_STATE.phase;
    if (activePh === 'downloading' || activePh === 'verifying' || activePh === 'installing') {
      return null;
    }
    MOB_UPDATE_STATE.checkedAt = Date.now();
    var parsed = rel && rkParseReleaseNotes(rel.body);
    var assets = rel && Array.isArray(rel.assets) ? rel.assets : [];
    var apkAsset = assets.filter(function (a) { return a && /\.apk$/i.test(String(a.name || '')); })[0] || null;
    if (!parsed || !apkAsset || !apkAsset.browser_download_url) {
      rkResetApkDownloadState();
      MOB_UPDATE_STATE.status = 'error';
      MOB_UPDATE_STATE.info = null;
      MOB_UPDATE_STATE.message = 'Data pembaruan tidak dapat dibaca atau tidak lengkap.';
      renderMobUpdateCard();
      return null;
    }
    var dlUrl = String(apkAsset.browser_download_url);
    if (dlUrl.indexOf(RK_UPDATE_DL_PREFIX) !== 0) {
      rkResetApkDownloadState();
      MOB_UPDATE_STATE.status = 'error';
      MOB_UPDATE_STATE.info = null;
      MOB_UPDATE_STATE.message = 'Sumber tautan unduhan tidak valid / ditolak.';
      renderMobUpdateCard();
      return null;
    }
    var meta = rkInstalledBuildMeta();
    var hasUpdate = !meta.run || parsed.run > meta.run;
    MOB_UPDATE_STATE.info = Object.assign({ url: dlUrl, assetName: apkAsset.name }, parsed);
    if (hasUpdate) {
      var keepDownloaded = !!(MOB_UPDATE_STATE.downloadedPath && MOB_UPDATE_STATE.downloadedRun === parsed.run);
      MOB_UPDATE_STATE.status = 'available';
      if (!keepDownloaded) {
        rkResetApkDownloadState();
        MOB_UPDATE_STATE.message = '';
      }
      renderMobUpdateCard();
      if (silent && !keepDownloaded && typeof showMobToast === 'function') {
        showMobToast('Pembaruan APK tersedia: build ' + parsed.run);
      }
    } else {
      MOB_UPDATE_STATE.status = 'latest';
      rkResetApkDownloadState();
      MOB_UPDATE_STATE.message = '';
      renderMobUpdateCard();
    }
    return MOB_UPDATE_STATE.info;
  }).catch(function (err) {
    if (tid) clearTimeout(tid);
    MOB_UPDATE_STATE.checking = false;
    var errPh = MOB_UPDATE_STATE.phase;
    if (errPh === 'downloading' || errPh === 'verifying' || errPh === 'installing') {
      return null;
    }
    MOB_UPDATE_STATE.checkedAt = Date.now();
    if (!silent) {
      if (!MOB_UPDATE_STATE.downloadedPath) rkResetApkDownloadState();
      MOB_UPDATE_STATE.status = 'error';
      MOB_UPDATE_STATE.info = null;
      if (err && (err.rkCode === 403 || err.rkCode === 429)) {
        MOB_UPDATE_STATE.message = 'Batas laju GitHub API tercapai (' + err.rkCode + '). Coba lagi nanti.';
      } else if (err && err.rkCode === 404) {
        MOB_UPDATE_STATE.message = 'Rilis tidak ditemukan atau repositori bersifat privat (404).';
      } else if (err && err.name === 'AbortError') {
        MOB_UPDATE_STATE.message = 'Waktu koneksi habis (timeout). Periksa internet lalu coba lagi.';
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        MOB_UPDATE_STATE.message = 'Perangkat sedang offline. Periksa koneksi internet.';
      } else if (err && /^rate-limit|not-found|http-/.test(String(err.message || ''))) {
        MOB_UPDATE_STATE.message = 'Gagal memeriksa pembaruan (kode ' + (err.rkCode || 'API') + ').';
      } else {
        MOB_UPDATE_STATE.message = 'Gagal memeriksa pembaruan: gangguan jaringan atau respons tidak terbaca.';
      }
      renderMobUpdateCard();
    } else {
      rkSyncUpdateDots();
    }
    return null;
  });
}

function rkAutoCheckApkUpdate(forceBypassIdle) {
  if (!rkIsCapacitorNative()) return Promise.resolve(null);
  if (!forceBypassIdle && typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(null);
  var last = 0;
  try {
    if (typeof localStorage !== 'undefined') last = parseInt(localStorage.getItem(RK_UPDATE_CHECK_LS) || '0', 10) || 0;
  } catch (e) { last = 0; }
  if (last > 0 && (Date.now() - last) < RK_UPDATE_INTERVAL_MS) return Promise.resolve(null);
  return rkCheckApkUpdate({ silent: true });
}

function rkOpenApkDownload() {
  var info = MOB_UPDATE_STATE.info;
  var url = info && info.url ? String(info.url) : '';
  if (!url || url.indexOf(RK_UPDATE_DL_PREFIX) !== 0) {
    MOB_UPDATE_STATE.status = 'error';
    MOB_UPDATE_STATE.phase = 'error';
    MOB_UPDATE_STATE.message = 'Sumber tautan unduhan tidak valid / ditolak.';
    renderMobUpdateCard();
    return false;
  }
  MOB_UPDATE_STATE.showSteps = true;
  renderMobUpdateCard();
  mobOpenExternalUrl(url);
  return true;
}

function rkCopyApkUpdateUrl() {
  var info = MOB_UPDATE_STATE.info;
  var url = info && info.url ? String(info.url) : '';
  if (!url || url.indexOf(RK_UPDATE_DL_PREFIX) !== 0) {
    MOB_UPDATE_STATE.status = 'error';
    MOB_UPDATE_STATE.phase = 'error';
    MOB_UPDATE_STATE.message = 'Sumber tautan unduhan tidak valid / ditolak.';
    renderMobUpdateCard();
    return Promise.resolve(false);
  }
  if (typeof copyText === 'function') {
    return Promise.resolve(copyText(url)).then(function () {
      if (typeof showMobToast === 'function') showMobToast('Tautan disalin. Tempel di Chrome/Brave.');
      return true;
    }).catch(function () {
      if (typeof showMobToast === 'function') showMobToast('Gagal menyalin tautan.');
      return false;
    });
  }
  return Promise.resolve(false);
}

function rkLaunchApkInstall() {
  if (MOB_UPDATE_STATE.phase === 'installing' || !MOB_UPDATE_STATE.downloadedPath) return Promise.resolve(false);
  var apkP = rkCapPlugin('ApkInstaller');
  if (!apkP || typeof apkP.canInstall !== 'function' || typeof apkP.install !== 'function') {
    return Promise.resolve(rkOpenApkDownload());
  }
  return Promise.resolve(apkP.canInstall()).then(function (res) {
    if (!(res && res.allowed)) {
      MOB_UPDATE_STATE.phase = 'need-permission';
      MOB_UPDATE_STATE.message = 'Perlu izin "Pasang aplikasi tidak dikenal" untuk RenKeu. Buka pengaturan izin, aktifkan, lalu kembali dan ketuk Pasang.';
      rkBindUpdAppStateResume();
      renderMobUpdateCard();
      return false;
    }
    MOB_UPDATE_STATE.phase = 'installing';
    renderMobUpdateCard();
    return Promise.resolve(apkP.install({ path: MOB_UPDATE_STATE.downloadedPath })).then(function () {
      MOB_UPDATE_STATE.phase = 'ready';
      MOB_UPDATE_STATE.message = 'Pemasang Android dibuka. Ketuk Pasang.' + (MOB_UPDATE_STATE.unverifiedNote ? ' ' + MOB_UPDATE_STATE.unverifiedNote : '');
      renderMobUpdateCard();
      return true;
    });
  }).catch(function (err) {
    var errMsg = (err && err.message) ? String(err.message) : '';
    var isMissing = /berkas\s+apk\s+tidak\s+ditemukan|tidak\s+ditemukan|not\s+found|enoent/i.test(errMsg);
    if (isMissing) {
      MOB_UPDATE_STATE.downloadedPath = '';
      MOB_UPDATE_STATE.downloadedRun = 0;
    }
    MOB_UPDATE_STATE.phase = 'error';
    MOB_UPDATE_STATE.message = isMissing
      ? 'Berkas APK tidak ditemukan di cache. Ketuk Coba unduh lagi, buka lewat browser, atau salin tautan.'
      : ('Gagal membuka pemasang Android' + (errMsg ? ' (' + errMsg + ')' : '') + '. Coba pasang lagi, unduh ulang, buka lewat browser, atau salin tautan.');
    renderMobUpdateCard();
    return false;
  });
}

function rkInstallApkInApp(opts) {
  var force = !!(opts && opts.force);
  var ph = MOB_UPDATE_STATE.phase;
  if (ph === 'downloading' || ph === 'verifying' || ph === 'installing') return Promise.resolve(false);
  var info = MOB_UPDATE_STATE.info;
  var url = info && info.url ? String(info.url) : '';
  if (!url || url.indexOf(RK_UPDATE_DL_PREFIX) !== 0) {
    MOB_UPDATE_STATE.status = 'error';
    MOB_UPDATE_STATE.phase = 'error';
    MOB_UPDATE_STATE.message = 'Sumber tautan unduhan tidak valid / ditolak.';
    renderMobUpdateCard();
    return Promise.resolve(false);
  }
  if (!rkHasInAppApkPlugins()) {
    return Promise.resolve(rkOpenApkDownload());
  }
  if (!force && MOB_UPDATE_STATE.downloadedPath && MOB_UPDATE_STATE.downloadedRun === info.run &&
      (ph === 'need-permission' || ph === 'ready' || ph === 'error')) {
    return rkLaunchApkInstall();
  }

  var fsP = rkCapPlugin('Filesystem');
  var runNum = parseInt(info.run, 10) || Date.now();
  var seq = ++_rkUpdRunSeq;
  var useSeqSuffix = Object.keys(_rkUpdInFlightPaths).length > 0 || ph === 'stalled';
  var relPath = useSeqSuffix
    ? (RK_UPDATE_DIR + '/renkeu-' + runNum + '-' + seq + '.apk')
    : (RK_UPDATE_DIR + '/renkeu-' + runNum + '.apk');
  _rkUpdInFlightPaths[relPath] = (_rkUpdInFlightPaths[relPath] || 0) + 1;
  var pathReleased = false;
  var releaseInFlightPath = function () {
    if (pathReleased) return;
    pathReleased = true;
    if (_rkUpdInFlightPaths[relPath] > 1) _rkUpdInFlightPaths[relPath] -= 1;
    else delete _rkUpdInFlightPaths[relPath];
  };
  var progHandle = null;
  var stallMs = (typeof window !== 'undefined' && typeof window.RK_UPDATE_STALL_MS === 'number' && window.RK_UPDATE_STALL_MS > 0)
    ? window.RK_UPDATE_STALL_MS
    : RK_UPDATE_STALL_MS;

  var clearWatchdog = function () {
    clearTimeout(_rkUpdStallTimer);
    _rkUpdStallTimer = null;
  };
  var removeProgListener = function () {
    if (!progHandle) return;
    var h = progHandle;
    progHandle = null;
    try { if (typeof h.remove === 'function') h.remove(); } catch (e) {}
  };
  var armWatchdog = function () {
    clearWatchdog();
    _rkUpdStallTimer = setTimeout(function () {
      if (seq !== _rkUpdRunSeq || MOB_UPDATE_STATE.phase !== 'downloading') return;
      _rkUpdRunSeq += 1;
      removeProgListener();
      MOB_UPDATE_STATE.phase = 'stalled';
      MOB_UPDATE_STATE.message = 'Unduhan tersendat (tidak ada progres). Gunakan "Buka lewat browser" atau "Salin tautan", lalu tempel di Brave/Chrome.';
      renderMobUpdateCard();
    }, stallMs);
  };

  _rkUpdLastPaintAt = 0;
  MOB_UPDATE_STATE.phase = 'downloading';
  MOB_UPDATE_STATE.progressBytes = 0;
  MOB_UPDATE_STATE.progressTotal = 0;
  MOB_UPDATE_STATE.progressPct = 0;
  MOB_UPDATE_STATE.indeterminate = true;
  MOB_UPDATE_STATE.message = '';
  MOB_UPDATE_STATE.unverifiedNote = '';
  MOB_UPDATE_STATE.showSteps = false;
  MOB_UPDATE_STATE.downloadedPath = '';
  MOB_UPDATE_STATE.downloadedRun = 0;
  renderMobUpdateCard();
  armWatchdog();

  var attachProg = typeof fsP.addListener === 'function'
    ? Promise.resolve(fsP.addListener('progress', function (ev) {
        if (seq !== _rkUpdRunSeq || MOB_UPDATE_STATE.phase !== 'downloading') return;
        if (ev && ev.url && ev.url !== url) return;
        armWatchdog();
        var b = Number(ev && ev.bytes) || 0;
        var tot = Number(ev && ev.contentLength) || 0;
        MOB_UPDATE_STATE.progressBytes = b;
        MOB_UPDATE_STATE.progressTotal = tot;
        MOB_UPDATE_STATE.indeterminate = !(tot > 0);
        rkUpdateProgressDom(false);
      })).then(function (h) {
        if (seq !== _rkUpdRunSeq) {
          try { if (h && typeof h.remove === 'function') h.remove(); } catch (e) {}
        } else {
          progHandle = h;
        }
      }).catch(function () {})
    : Promise.resolve();

  return attachProg.then(function () {
    return rkCleanupApkCache(fsP).then(function () {
      return fsP.downloadFile({
        url: url,
        path: relPath,
        directory: 'CACHE',
        progress: true,
        connectTimeout: 15000,
        readTimeout: 30000,
      });
    });
  }).then(function () {
    releaseInFlightPath();
    clearWatchdog();
    removeProgListener();
    if (seq !== _rkUpdRunSeq) return false;
    MOB_UPDATE_STATE.indeterminate = false;
    if (MOB_UPDATE_STATE.progressTotal > 0) {
      MOB_UPDATE_STATE.progressBytes = MOB_UPDATE_STATE.progressTotal;
      MOB_UPDATE_STATE.progressPct = 100;
    }
    rkUpdateProgressDom(true);
    MOB_UPDATE_STATE.phase = 'verifying';
    MOB_UPDATE_STATE.message = 'Memverifikasi integritas berkas APK...';
    renderMobUpdateCard();
    return rkVerifyApkSha256(fsP, relPath, info.sha256, MOB_UPDATE_STATE.progressBytes).then(function (vRes) {
      if (seq !== _rkUpdRunSeq) return false;
      if (!vRes || !vRes.ok) {
        MOB_UPDATE_STATE.phase = 'error';
        MOB_UPDATE_STATE.downloadedPath = '';
        MOB_UPDATE_STATE.message = 'Verifikasi SHA-256 berkas gagal (unduhan rusak atau terpotong). Coba unduh lagi, buka lewat browser, atau salin tautan.';
        renderMobUpdateCard();
        return false;
      }
      MOB_UPDATE_STATE.downloadedPath = relPath;
      MOB_UPDATE_STATE.downloadedRun = info.run;
      MOB_UPDATE_STATE.unverifiedNote = vRes.verified ? '' : (vRes.note || 'Integritas berkas tidak diverifikasi.');
      return rkLaunchApkInstall();
    });
  }).catch(function (err) {
    releaseInFlightPath();
    clearWatchdog();
    removeProgListener();
    if (seq !== _rkUpdRunSeq) return false;
    MOB_UPDATE_STATE.phase = 'error';
    MOB_UPDATE_STATE.downloadedPath = '';
    MOB_UPDATE_STATE.message = 'Unduhan gagal' + ((err && err.message) ? ' (' + err.message + ')' : '') + '. Coba unduh lagi, buka lewat browser, atau salin tautan.';
    renderMobUpdateCard();
    return false;
  });
}

if (typeof window !== 'undefined') {
  window.rkAutoCheckApkUpdate = rkAutoCheckApkUpdate;
  window.rkCheckApkUpdate = rkCheckApkUpdate;
  window.rkParseReleaseNotes = rkParseReleaseNotes;
  window.rkInstallApkInApp = rkInstallApkInApp;
  window.rkLaunchApkInstall = rkLaunchApkInstall;
  window.rkCopyApkUpdateUrl = rkCopyApkUpdateUrl;
  window.rkVerifyApkSha256 = rkVerifyApkSha256;
  window.rkCleanupApkCacheOnStart = rkCleanupApkCacheOnStart;
}

function renderMobSettings() {
  if (typeof rkIsNotifReset === 'function' && rkIsNotifReset()) MOB_STATE.notifEnabled = false;
  var due = getMobDueList(),
    osActive = isMobNotifOsActive(),
    osPerm = (typeof rkNotify !== 'undefined' && rkNotify.getPermission) ? rkNotify.getPermission() : (typeof Notification !== 'undefined' && 'Notification' in window && Notification ? Notification.permission : 'unsupported'),
    needsA2HS = typeof rkIsIosNeedsA2HS === 'function' && rkIsIosNeedsA2HS();
  if (typeof rkNotify !== 'undefined' && rkNotify.isNative()) {
    rkNotify.syncBillSchedules(due, !!MOB_STATE.notifEnabled && osActive);
  }
  syncMobNotifDot();
  if ($('m-set-notif-enabled')) $('m-set-notif-enabled').checked = !!MOB_STATE.notifEnabled;
  if ($('m-rem-cnt-badge')) $('m-rem-cnt-badge').textContent = due.length + ' item';
  if ($('m-menu-cnt-rem')) $('m-menu-cnt-rem').textContent = due.length + ' tempo';
  var actBtn = $('m-btn-notif-activate');
  if (actBtn) {
    actBtn.classList.toggle('is-active', osActive);
    actBtn.textContent = osActive
      ? '✅ Notifikasi, sudah aktif. klik untuk reset notif'
      : '🔔 Pencet, untuk aktifkan notifikasi';
  }
  var iosHint = $('m-notif-ios-hint');
  if (iosHint) {
    if (needsA2HS) {
      iosHint.style.display = 'block';
      iosHint.textContent = 'iOS / iPhone (16.4+): ketuk Bagikan (ikon kotak panah atas) → pilih "Tambah ke Layar Utama", buka dari ikon aplikasi, lalu pencet tombol di atas agar notifikasi OS & Lock Screen aktif.';
    } else if (osPerm === 'denied') {
      iosHint.style.display = 'block';
      iosHint.textContent = (typeof rkIsIosDevice === 'function' && rkIsIosDevice())
        ? 'Izin notifikasi iOS diblokir. Buka Pengaturan iOS → Pemberitahuan → pilih Rencana Keuangan → nyalakan Izinkan Pemberitahuan.'
        : 'Izin notifikasi diblokir di browser. Buka Setelan Situs / Info Aplikasi lalu pilih Izinkan Notifikasi.';
    } else {
      iosHint.style.display = 'none';
      iosHint.textContent = '';
    }
  }
  var permB = $('m-notif-perm-badge');
  if (permB) {
    if (!MOB_STATE.notifEnabled && !osActive) { permB.textContent = 'Nonaktif'; permB.className = 'badge b-nt'; }
    else if (osActive) { permB.textContent = 'OS & Bar Aktif'; permB.className = 'badge b-em'; }
    else if (osPerm === 'denied') { permB.textContent = 'OS Diblokir'; permB.className = 'badge b-cr'; }
    else { permB.textContent = 'Bar HP Aktif'; permB.className = 'badge b-am'; }
  }
  if ($('m-set-rmh')) $('m-set-rmh').value = String(MOB_STATE.notifHorizon != null ? MOB_STATE.notifHorizon : (typeof remHz !== 'undefined' ? remHz : 7));
  var remBox = $('m-settings-rem-list');
  if (remBox) {
    remBox.innerHTML = due.length
      ? due.slice(0, 12).map(function (x) {
          var iso = isoD(x.t), tag = x.diff < 0 ? '<span class="badge b-cr">Terlewat ' + Math.abs(x.diff) + ' hr</span>' : x.diff === 0 ? '<span class="badge b-am">Hari Ini!</span>' : '<span class="badge b-ac">' + x.diff + ' hari lagi</span>';
          return '<div class="list-row"><div style="min-width:0"><div style="font-size:0.80rem;font-weight:700">' + esc(x.it.name) + '</div><div style="font-size:0.69rem;color:var(--text-muted)">' + fmtD(iso) + ' &middot; <strong class="pv">' + rp(x.price) + '</strong></div><div style="margin-top:3px">' + tag + '</div></div>' +
            '<div style="display:flex;gap:5px"><button type="button" class="btn btn-emerald btn-sm" data-mquickpaid="' + esc(x.it.id) + '|' + iso + '">✓ Lunas</button></div></div>';
        }).join('')
      : '<div style="font-size:0.78rem;color:var(--text-muted);text-align:center;padding:8px">Semua tagihan terdekat aman!</div>';
  }
  if ($('m-btn-mark-late')) $('m-btn-mark-late').style.display = due.some(function (x) { return x.diff < 0; }) ? 'block' : 'none';
  if ($('m-set-build-ver')) $('m-set-build-ver').textContent = 'Versi build: ' + ((typeof window !== 'undefined' && window.RK_BUILD && window.RK_BUILD.id) ? window.RK_BUILD.id : 'dev');
  renderMobUpdateCard();
  renderMobReportPreview(MOB_STATE.repKind);
}

function mobRepHeadLabel(h) {
  if (h === 'TRANSAKSI KAS') return 'Transaksi Kas';
  if (h === 'TAGIHAN') return 'Tagihan & Cicilan';
  if (h === 'PER BULAN') return 'Ringkasan per Bulan';
  return h;
}

function mobRepColLabel(t) {
  return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
}

function renderMobReportPreview(kind) {
  MOB_STATE.repKind = kind || MOB_STATE.repKind || 'm';
  var D = repData(MOB_STATE.repKind),
    box = $('m-report-preview'),
    sub = $('m-rep-sub');
  if (sub) sub.textContent = D.title + ' · ' + D.subtitle;
  document.querySelectorAll('#m-rep-period-slider [data-mrep]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mrep') === MOB_STATE.repKind);
  });
  if (!box) return;
  box.innerHTML =
    '<div class="bento-2">' + D.summary.map(function (r) {
      return '<div class="m-tile"><div class="m-tile-k">' + esc(r[0]) + '</div><div class="m-tile-v pv" style="font-size:0.86rem">' + esc(r[1]) + '</div></div>';
    }).join('') + '</div>' +
    D.tables.slice(0, 2).map(function (tbl) {
      var expKey = MOB_STATE.repKind + ':' + tbl.head;
      var expanded = !!(MOB_STATE.repExpanded && MOB_STATE.repExpanded[expKey]);
      var visRows = tbl.rows.length > 5 && !expanded ? tbl.rows.slice(0, 5) : tbl.rows;
      var togBtn = tbl.rows.length > 5
        ? '<button type="button" class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px" data-mrep-tog="' + esc(expKey) + '">' +
          (expanded ? 'Ringkas (tampilkan 5)' : 'Tampilkan semua (' + tbl.rows.length + ')') + '</button>'
        : '';
      return '<div><div style="font-size:0.75rem;font-weight:800;color:var(--text-primary);margin-bottom:5px;display:flex;justify-content:space-between;align-items:center"><span>' + esc(mobRepHeadLabel(tbl.head)) + '</span>' +
        (tbl.total ? '<span class="mono pv" style="font-size:0.73rem;color:var(--accent-ink)">' + esc(tbl.total[1]) + '</span>' : '') + '</div>' +
        '<table class="rep-table"><thead><tr>' + tbl.cols.map(function (c) { return '<th' + (c.align === 'r' ? ' class="r"' : '') + '>' + esc(mobRepColLabel(c.t)) + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + visRows.map(function (row) {
          return '<tr>' + tbl.cols.map(function (c, i) { return '<td' + (c.align === 'r' ? ' class="r pv"' : '') + '>' + esc(row[i]) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>' + togBtn + '</div>';
    }).join('');
}

function renderMobMetaMenus() {
  if ($('m-top-yr-txt')) $('m-top-yr-txt').textContent = S.year;
  var aYr = $('m-acct-yr-pills');
  if (aYr && typeof ALL === 'object' && ALL && ALL.data) {
    var yrs = Object.keys(ALL.data).map(Number).filter(Boolean).sort(function (a, b) { return a - b; });
    aYr.innerHTML = yrs.map(function (y) {
      return '<button type="button" class="ap-yr-btn' + (y === +S.year ? ' active' : '') + '" data-myrpick="' + y + '">' + y + '</button>';
    }).join('');
  }
  if ($('m-menu-cnt-item')) $('m-menu-cnt-item').textContent = S.items.length + ' item';
  if ($('m-menu-cnt-sim')) $('m-menu-cnt-sim').textContent = (typeof SIM !== 'undefined' ? SIM.length : 0) + ' aktif';
  var trs = mobTrips();
  if ($('m-menu-cnt-trip')) $('m-menu-cnt-trip').textContent = trs.length + ' trip';
  if ($('m-menu-trip-lbl')) $('m-menu-trip-lbl').textContent = trs[0] ? trs[0].name : 'Buat perjalanan';
  if ($('m-menu-thm-lbl') && typeof THEME_NAME === 'object' && typeof themeCur === 'function') {
    $('m-menu-thm-lbl').textContent = THEME_NAME[themeCur()] || 'Terang';
  }
}

function renderMobileApp() {
  if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return;
  if (!ensureMobileShell()) return;
  if (typeof brSanitizeItems === 'function') brSanitizeItems();
  syncMobileCloudUI();
  renderMobMetaMenus();
  renderMobSettings();
  renderMobileTab(MOB_STATE.tab);
  initMobDragSliders();
  mobPaintAllSliders();
  if (typeof rkEnhanceCheckboxes === 'function') rkEnhanceCheckboxes($('mobile-app-shell'));
  if (typeof rkSyncSegPills === 'function') rkSyncSegPills($('mobile-app-shell'), false);
}

function mobMonthOptsHtml(selMonth) {
  var html = '';
  for (var m = 0; m < 12; m++) {
    html += '<option value="' + m + '"' + (m === selMonth ? ' selected' : '') + '>' + FULL_MON[m] + ' ' + S.year + '</option>';
  }
  return html;
}

function renderMobScenFields(scen, it) {
  if (!it) it = item(MOB_STATE.scenItemId);
  var box = $('m-scen-fields');
  if (!box || !it) return;
  if ($('m-ms-err')) $('m-ms-err').textContent = '';
  MOB_STATE.scenMode = scen || 'change_price';
  document.querySelectorAll('#m-scen-tabs [data-mscen]').forEach(function (x) {
    x.classList.toggle('active', x.getAttribute('data-mscen') === MOB_STATE.scenMode);
  });
  var mDef = MOB_STATE.scenMonth != null ? MOB_STATE.scenMonth : Math.max(smEff(), Math.min(11, +todayISO().slice(5, 7) - 1));
  if (MOB_STATE.scenMode === 'change_price') {
    box.innerHTML =
      '<div class="bento-2"><div class="field"><label class="field-label" for="m-sc-price">Harga Baru (Rp)</label><input class="input mono" id="m-sc-price" type="text" inputmode="numeric" data-num-fmt="rp" /></div>' +
      '<div class="field"><label class="field-label" for="m-sc-month">Mulai Bulan</label><select class="input" id="m-sc-month">' + mobMonthOptsHtml(mDef) + '</select></div></div>';
    setRpVal('m-sc-price', priceAt(it, Date.UTC(+S.year, mDef, 15)));
  } else if (MOB_STATE.scenMode === 'temp_price') {
    box.innerHTML =
      '<div class="field"><label class="field-label" for="m-sc-price">Harga Promo (Rp)</label><input class="input mono" id="m-sc-price" type="text" inputmode="numeric" data-num-fmt="rp" /></div>' +
      '<div class="bento-2"><div class="field"><label class="field-label" for="m-sc-month">Dari Bulan</label><select class="input" id="m-sc-month">' + mobMonthOptsHtml(mDef) + '</select></div>' +
      '<div class="field"><label class="field-label" for="m-sc-month-end">Sampai Bulan</label><select class="input" id="m-sc-month-end">' + mobMonthOptsHtml(mDef) + '</select></div></div>';
    setRpVal('m-sc-price', priceAt(it, Date.UTC(+S.year, mDef, 15)));
  } else if (MOB_STATE.scenMode === 'cycle') {
    var curCyc = typeof brCoreToCycle === 'function' ? brCoreToCycle(it) : 'tiap bulan';
    box.innerHTML =
      '<div class="field"><label class="field-label" for="m-sc-cycle">Siklus Baru</label><select class="input" id="m-sc-cycle">' +
      '<option value="tiap bulan"' + (curCyc === 'tiap bulan' ? ' selected' : '') + '>Tiap 1 bulan</option>' +
      '<option value="tiap 28 hari"' + (curCyc === 'tiap 28 hari' ? ' selected' : '') + '>Tiap 28 hari</option>' +
      '<option value="sekali saja"' + (curCyc === 'sekali saja' ? ' selected' : '') + '>Sekali saja</option>' +
      '<option value="tiap tahun"' + (curCyc === 'tiap tahun' ? ' selected' : '') + '>Tiap 1 tahun</option></select></div>';
  } else if (MOB_STATE.scenMode === 'shift') {
    var occM = occ(it, +S.year).filter(function (t) { return new Date(t).getUTCMonth() === mDef; })[0];
    var defD = occM ? new Date(occM).getUTCDate() : Math.min(28, +String(it.start || '').slice(8, 10) || 15);
    box.innerHTML =
      '<div class="bento-2"><div class="field"><label class="field-label" for="m-sc-shift-day">Geser ke Tanggal (1–31)</label><input class="input mono" id="m-sc-shift-day" type="number" min="1" max="31" value="' + defD + '" /></div>' +
      '<div class="field"><label class="field-label" for="m-sc-month">Bulan</label><select class="input" id="m-sc-month">' + mobMonthOptsHtml(mDef) + '</select></div></div>';
  } else {
    box.innerHTML = '<div class="field"><label class="field-label" for="m-sc-month">Berhenti bayar mulai</label><select class="input" id="m-sc-month">' + mobMonthOptsHtml(mDef) + '</select></div>';
  }
}

function openMobScenarioSheet(it, iso) {
  if (!it) return;
  MOB_STATE.scenItemId = it.id;
  MOB_STATE.scenMonth = iso && iso.length >= 7 ? (+iso.slice(5, 7) - 1) : Math.max(smEff(), Math.min(11, +todayISO().slice(5, 7) - 1));
  if ($('m-ms-title')) $('m-ms-title').textContent = 'Ubah Harga / Jadwal — ' + it.name;
  renderMobScenFields('change_price', it);
  mobOpenSheet('m-sheet-scenario');
}

function openMobPeriodeSheet() {
  var ks = Object.keys(ALL.data).map(Number).sort(function (a, b) { return a - b; });
  if ($('m-yr-pills')) {
    $('m-yr-pills').innerHTML = ks.map(function (y) {
      return '<button type="button" class="p-chip ' + (y === S.year ? 'active' : '') + '" data-myrpick="' + y + '">' + y + '</button>';
    }).join('');
  }
  if ($('m-cfg-year')) $('m-cfg-year').value = String(S.year);
  var smSel = $('m-cfg-sm');
  if (smSel) {
    var t = todayISO(), curY = +S.year === +t.slice(0, 4);
    smSel.innerHTML = MON.map(function (n, i) { return '<option value="' + i + '">' + n + '</option>'; }).join('') +
      '<option value="auto"' + (curY ? '' : ' disabled') + '>Otomatis (' + MON[+t.slice(5, 7) - 1] + ')</option>';
    smSel.value = curY && S.smManual !== true ? 'auto' : String(smEff());
  }
  if (typeof setRpVal === 'function') setRpVal('m-cfg-saldo', S.saldo);
  else if ($('m-cfg-saldo')) $('m-cfg-saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  if ($('m-cfg-saldo-slider')) { $('m-cfg-saldo-slider').value = String(Math.min(50000000, +S.saldo || 0)); mobPaintSlider($('m-cfg-saldo-slider')); }
  if ($('m-cfg-saldo-ro')) $('m-cfg-saldo-ro').textContent = rp(S.saldo);
  if ($('m-cfg-sum')) $('m-cfg-sum').textContent = S.year + ' · ' + MON[smEff()] + ' · ' + rp(S.saldo);
  mobOpenSheet('m-sheet-periode');
}

function mobGoogleBtnHtml(id) {
  return (
    '<button type="button" class="btn btn-secondary" id="' + id + '" style="width:100%;justify-content:center;gap:9px;font-weight:700">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"/><path fill="#4285F4" d="M21.1 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.5-2.2 3.2l3.4 2.6c2-1.8 2.4-4.6 2.4-8.1z"/><path fill="#FBBC05" d="M6.3 14.3a5.8 5.8 0 0 1 0-4.6L3 7.1a9.5 9.5 0 0 0 0 9.8l3.3-2.6z"/><path fill="#34A853" d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3.4-2.6c-.9.6-2 .9-3 .9-2.3 0-4.3-1.5-5-3.6L3.6 16.4c1.6 3.1 4.8 5.1 8.4 5.1z"/></svg>' +
    '<span>Masuk dengan Google (Gmail)</span></button>'
  );
}

function openMobAcctSheet() {
  var body = $('m-acct-body');
  if (!body) return;
  if (typeof sb === 'undefined' || !sb) {
    body.innerHTML = mobGoogleBtnHtml('m-lg-google') + '<div class="sub" style="margin-top:4px">Sinkron Supabase belum aktif di js/config.js. Semua data tersimpan otomatis secara lokal.</div>';
  } else if (typeof sbUser !== 'undefined' && sbUser) {
    var du = typeof rkDisplayUser === 'function' ? rkDisplayUser(sbUser) : { name: 'Pengguna' };
    body.innerHTML =
      '<div class="m-tile"><div class="m-tile-k">Masuk Sebagai</div><div style="font-weight:700;font-size:0.88rem">' + esc(du.name) + '</div><div style="font-size:0.74rem;color:var(--text-muted)">' + esc(sbUser.email || '') + '</div></div>' +
      '<button type="button" class="btn btn-primary" id="m-acct-sync-now">⟳ Sinkronkan Sekarang</button>' +
      '<button type="button" class="btn btn-crimson" id="m-acct-logout">Keluar dari Akun</button>';
  } else {
    body.innerHTML =
      mobGoogleBtnHtml('m-lg-google') +
      '<div style="display:flex;align-items:center;gap:8px;font-size:0.71rem;color:var(--text-muted)"><span style="flex:1;height:1px;background:var(--border-subtle)"></span><span>atau email Supabase</span><span style="flex:1;height:1px;background:var(--border-subtle)"></span></div>' +
      '<div class="field"><label class="field-label" for="m-lg-email">Email</label><input class="input" id="m-lg-email" type="email" autocomplete="email" /></div>' +
      '<div class="field"><label class="field-label" for="m-lg-pass">Password</label><input class="input" id="m-lg-pass" type="password" autocomplete="current-password" /></div>' +
      '<div style="color:var(--crimson);font-size:0.76rem" id="m-lg-err"></div>' +
      '<button type="button" class="btn btn-primary" id="m-lg-in">Masuk untuk Sinkron</button>';
  }
  mobOpenSheet('m-sheet-acct');
}

function bindMobileShellEvents(root) {
  function dismissMobCfOverlay() {
    if ($('m-cf-tooltip')) $('m-cf-tooltip').classList.remove('visible');
    if ($('m-cf-ch')) $('m-cf-ch').style.display = 'none';
    if ($('m-cf-seg-glow')) $('m-cf-seg-glow').style.display = 'none';
  }
  var nList = $('m-notif-pop-list');
  if (nList && !nList.dataset.swipeBound) {
    nList.dataset.swipeBound = '1';
    var swRow = null, swX0 = 0, swDx = 0;
    var swStart = function (x, target) {
      if (!target || target.closest('[data-mquickpaid]')) { swRow = null; return; }
      swRow = target.closest('.m-notif-swipe-row');
      if (!swRow) return;
      swX0 = x; swDx = 0;
      swRow.classList.add('is-swiping');
    };
    var swMove = function (x) {
      if (!swRow) return;
      swDx = Math.max(0, x - swX0);
      swRow.style.transform = 'translateX(' + swDx + 'px)';
      swRow.style.opacity = String(Math.max(0.25, 1 - swDx / 120));
    };
    var swEnd = function () {
      if (!swRow) return;
      var row = swRow; swRow = null;
      row.classList.remove('is-swiping');
      if (swDx >= 65) {
        var nk = row.getAttribute('data-mnotif-key');
        row.style.transform = 'translateX(110%)';
        row.style.opacity = '0';
        mobDismissNotifKey(nk);
        renderMobNotifPopover();
      } else {
        row.style.transform = '';
        row.style.opacity = '';
      }
      swDx = 0;
    };
    nList.addEventListener('touchstart', function (e) { if (e.touches && e.touches[0]) swStart(e.touches[0].clientX, e.target); }, { passive: true });
    nList.addEventListener('touchmove', function (e) { if (e.touches && e.touches[0]) swMove(e.touches[0].clientX); }, { passive: true });
    nList.addEventListener('touchend', swEnd);
    nList.addEventListener('touchcancel', swEnd);
    nList.addEventListener('mousedown', function (e) { if (e.button === 0) swStart(e.clientX, e.target); });
    nList.addEventListener('mousemove', function (e) { if (swRow) swMove(e.clientX); });
    nList.addEventListener('mouseup', swEnd);
  }
  if (root._mobEventsBound) return;
  root._mobEventsBound = true;
  if (typeof window !== 'undefined' && !window._rkMobWinScrollBound) {
    window._rkMobWinScrollBound = true;
    window.addEventListener('scroll', rkSyncMobScrollUi, { passive: true });
  }

  /* Swipe-to-dismiss untuk #m-os-notif (delegated pada root agar aman saat DOM dibuat ulang) */
  (function bindMobOsNotifSwipe() {
    var swipe = null;
    var suppressClick = false;
    function getCard(target) {
      return target && target.closest ? target.closest('#m-os-notif') : null;
    }
    function startSwipe(card, x, y, target) {
      if (!card || !card.classList.contains('show')) return;
      swipe = {
        card: card,
        startX: x,
        startY: y,
        lastX: x,
        lastT: Date.now(),
        vx: 0,
        dx: 0,
        locked: null,
        width: card.offsetWidth || (typeof window !== 'undefined' && window.innerWidth ? Math.min(window.innerWidth - 20, 440) : 340),
        startedOnBtn: !!(target && target.closest && target.closest('button'))
      };
      card.classList.remove('is-snapping', 'is-dismissing');
    }
    function moveSwipe(x, y, ev) {
      if (!swipe) return;
      var dx = x - swipe.startX;
      var dy = y - swipe.startY;
      if (!swipe.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          swipe = null;
          return;
        }
        swipe.locked = 'x';
        swipe.card.classList.add('is-swiping');
      }
      if (swipe.locked !== 'x') return;
      if (ev && ev.cancelable) ev.preventDefault();
      var now = Date.now();
      var dt = Math.max(1, now - swipe.lastT);
      swipe.vx = (x - swipe.lastX) / dt;
      swipe.lastX = x;
      swipe.lastT = now;
      swipe.dx = dx;
      var ratio = Math.min(1, Math.abs(dx) / Math.max(1, swipe.width));
      swipe.card.style.setProperty('--pon-dx', dx.toFixed(1) + 'px');
      swipe.card.style.opacity = String(Math.max(0.15, 1 - ratio * 0.85));
    }
    function endSwipe(cancelled) {
      if (!swipe) return;
      var cur = swipe;
      swipe = null;
      var card = cur.card;
      card.classList.remove('is-swiping');
      if (cur.locked !== 'x') return;
      if (cur.startedOnBtn) {
        suppressClick = true;
        setTimeout(function() { suppressClick = false; }, 120);
      }
      var absDx = Math.abs(cur.dx);
      var stale = (Date.now() - cur.lastT) > 80;
      var absVx = stale ? 0 : Math.abs(cur.vx);
      if (!cancelled && (absDx > cur.width * 0.35 || (absDx > 16 && absVx > 0.5))) {
        dismissMobOsNotif(cur.dx >= 0 ? 1 : -1);
      } else {
        card.classList.add('is-snapping');
        card.style.setProperty('--pon-dx', '0px');
        card.style.opacity = '';
        setTimeout(function() {
          if (card && card.isConnected) card.classList.remove('is-snapping');
        }, 290);
      }
    }
    root.addEventListener('click', function(e) {
      if (!suppressClick) return;
      if (!e.target.closest('#m-os-notif')) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    root.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      var card = getCard(e.target);
      if (!card) return;
      startSwipe(card, e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });
    root.addEventListener('touchmove', function(e) {
      if (!swipe || !e.touches || !e.touches.length) return;
      moveSwipe(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });
    root.addEventListener('touchend', function() { endSwipe(false); });
    root.addEventListener('touchcancel', function() { endSwipe(true); });
    root.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      var card = getCard(e.target);
      if (!card) return;
      startSwipe(card, e.clientX, e.clientY, e.target);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', function(e) {
        if (!swipe) return;
        moveSwipe(e.clientX, e.clientY, e);
      });
      window.addEventListener('mouseup', function() {
        if (!swipe) return;
        endSwipe(false);
      });
    }
  })();
  (function bindMobPullToRefresh() {
    var PULL_MAX = 90;
    var PULL_TRIG = 52;
    var LOCK_PX = 8;
    var TOP_TOLERANCE_PX = 1;
    var ptr = null;
    var refreshing = false;
    var cooldownUntil = 0;
    var exitTimer = null;
    var pendingScrollTimer = null;
    var pendingScrollListener = null;

    function getScrollY() {
      var mm = $('m-main');
      var mTop = mm ? mm.scrollTop : 0;
      var wTop = (typeof window !== 'undefined' ? (window.scrollY || 0) : 0) ||
        (typeof document !== 'undefined' && document.documentElement ? document.documentElement.scrollTop : 0) ||
        (typeof document !== 'undefined' && document.body ? document.body.scrollTop : 0);
      return Math.max(mTop || 0, wTop || 0);
    }

    function hasOpenOverlay() {
      return !!document.querySelector('#m-acct-popover.open, #m-notif-popover.open, #mobile-app-shell .modal-backdrop.open, #cf:not([hidden]), #lg:not([hidden]), .modal:not([hidden]), #mobile-app-shell .mcal-pop.open, #mobile-app-shell .picker-popover.open, #mobile-app-shell .mselect.open');
    }

    function isExcludedTarget(t) {
      if (!t || !t.closest) return true;
      if (!t.closest('.mob-shell')) return true;
      return !!t.closest('.mob-bottom-nav, input, textarea, select, [contenteditable], .modal-backdrop.open, .modal:not([hidden]), .acct-popover.open, .notif-popover.open, .phone-os-notif.show, .mcal-pop.open, .picker-popover.open, .mselect.open .mselect-menu, .ms-body');
    }

    function setPtrVars(ind, yPx, op, rotDeg, sc) {
      if (!ind) return;
      ind.style.setProperty('--ptr-y', yPx.toFixed(1) + 'px');
      ind.style.setProperty('--ptr-op', String(op));
      ind.style.setProperty('--ptr-rot', rotDeg.toFixed(0) + 'deg');
      ind.style.setProperty('--ptr-sc', String(sc));
    }

    function positionUnderHeader(ind) {
      var hdr = document.querySelector('#mobile-app-shell .apk-header-block');
      var topPx = hdr && hdr.offsetHeight ? hdr.offsetHeight : (MOB_STATE.tab === 'rincian' ? 276 : 54);
      if (ind) ind.style.setProperty('--ptr-top', topPx + 'px');
    }

    function resetVisual(cls) {
      var ind = $('m-ptr-ind');
      clearTimeout(exitTimer);
      if (!ind) return;
      ind.classList.remove('is-refreshing', 'is-snapping', 'is-exiting');
      if (cls) ind.classList.add(cls);
      setPtrVars(ind, -48, 0, 0, 0.8);
      if (cls) {
        exitTimer = setTimeout(function () {
          if (ind && ind.isConnected) ind.classList.remove(cls);
        }, cls === 'is-exiting' ? 210 : 290);
      }
    }

    function cancelPendingScrollRefresh() {
      if (pendingScrollTimer) { clearTimeout(pendingScrollTimer); pendingScrollTimer = null; }
      if (pendingScrollListener) {
        var mm = $('m-main');
        if (mm) mm.removeEventListener('scroll', pendingScrollListener);
        if (typeof window !== 'undefined') window.removeEventListener('scroll', pendingScrollListener);
        pendingScrollListener = null;
      }
    }

    function canStartRefresh() {
      if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return false;
      if (refreshing || pendingScrollTimer || Date.now() < cooldownUntil) return false;
      if (hasOpenOverlay()) return false;
      return true;
    }

    function detachActiveMove() {
      root.removeEventListener('touchmove', onActiveMove, { passive: false });
      root.removeEventListener('touchend', onActiveEnd);
      root.removeEventListener('touchcancel', onActiveCancel);
    }

    function clearGesture() {
      ptr = null;
      detachActiveMove();
    }

    function finishRefresh(msg) {
      cancelPendingScrollRefresh();
      clearGesture();
      refreshing = false;
      cooldownUntil = Date.now() + 1000;
      resetVisual('is-exiting');
      if (msg) showMobToast(msg);
    }

    function runRefresh() {
      refreshing = true;
      var ind = $('m-ptr-ind');
      clearTimeout(exitTimer);
      if (ind) {
        positionUnderHeader(ind);
        ind.classList.remove('is-snapping', 'is-exiting');
        ind.classList.add('is-refreshing');
        setPtrVars(ind, 12, 1, 180, 1);
      }
      var hasCloud = typeof sb !== 'undefined' && sb && typeof sbUser !== 'undefined' && sbUser && typeof pull === 'function';
      var isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (hasCloud && isOffline) {
        if (typeof renderMobileApp === 'function') renderMobileApp();
        finishRefresh('Offline — menampilkan data lokal');
        return;
      }
      if (hasCloud) {
        var beforeSig = typeof dsig === 'function' ? dsig() : '';
        Promise.resolve(pull()).then(function () {
          if (typeof window !== 'undefined' && window._rkLastPullOk === false) {
            finishRefresh('Gagal sinkron: ' + (window._rkLastPullErr || 'koneksi'));
            return;
          }
          if (typeof renderMobileApp === 'function') renderMobileApp();
          var afterSig = typeof dsig === 'function' ? dsig() : '';
          if (afterSig !== beforeSig && typeof renderMobCharts === 'function') renderMobCharts();
          finishRefresh('Data tersinkron');
        }).catch(function () {
          finishRefresh('Gagal sinkron — cek koneksi');
        });
        return;
      }
      if (typeof renderMobileApp === 'function') renderMobileApp();
      finishRefresh('Data diperbarui');
    }

    function onActiveMove(e) {
      if (!ptr || !e.touches || !e.touches.length) {
        clearGesture();
        return;
      }
      if ((typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') || getScrollY() > TOP_TOLERANCE_PX) {
        if (ptr.locked) resetVisual('is-snapping');
        clearGesture();
        return;
      }
      var dx = e.touches[0].clientX - ptr.startX;
      var dy = e.touches[0].clientY - ptr.startY;
      if (!ptr.locked) {
        if (Math.hypot(dx, dy) < LOCK_PX) return;
        if (dy <= 0 || Math.abs(dx) >= dy) {
          clearGesture();
          return;
        }
        ptr.locked = true;
        var ind0 = $('m-ptr-ind');
        if (ind0) {
          positionUnderHeader(ind0);
          ind0.classList.remove('is-snapping', 'is-exiting', 'is-refreshing');
        }
      }
      // preventDefault hanya dipanggil saat gestur sudah terkunci sebagai tarikan bawah dari posisi scroll 0
      if (e.cancelable) e.preventDefault();
      var pullY = Math.min(PULL_MAX, Math.max(0, dy * 0.5));
      ptr.pullY = pullY;
      var ratio = Math.min(1, pullY / PULL_TRIG);
      setPtrVars($('m-ptr-ind'), pullY - 46, Math.min(1, ratio * 1.15), ratio * 180, 0.8 + ratio * 0.2);
    }

    function endPtr(cancelled) {
      if (!ptr) {
        detachActiveMove();
        return;
      }
      var cur = ptr;
      clearGesture();
      if (!cur.locked) return;
      if (!cancelled && cur.pullY >= PULL_TRIG) {
        runRefresh();
      } else {
        resetVisual('is-snapping');
      }
    }

    function onActiveEnd() { endPtr(false); }
    function onActiveCancel() { endPtr(true); }

    window.rkMobRefresh = function () {
      if (!canStartRefresh()) return false;
      var sy = getScrollY();
      if (sy <= TOP_TOLERANCE_PX) {
        runRefresh();
        return true;
      }
      var red = typeof rkIsReducedMotion === 'function' && rkIsReducedMotion();
      var mm = $('m-main');
      if (red) {
        if (mm) mm.scrollTop = 0;
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
        runRefresh();
        return true;
      }
      refreshing = true;
      var started = false;
      var proceed = function () {
        if (started) return;
        started = true;
        cancelPendingScrollRefresh();
        if (MOB_STATE.tab !== 'rincian') { refreshing = false; return; }
        runRefresh();
      };
      if (mm && mm.scrollTop > TOP_TOLERANCE_PX) {
        if (typeof mm.scrollTo === 'function') mm.scrollTo({ top: 0, behavior: 'smooth' });
        else mm.scrollTop = 0;
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      pendingScrollListener = function () {
        if (getScrollY() <= TOP_TOLERANCE_PX) proceed();
      };
      if (mm) mm.addEventListener('scroll', pendingScrollListener, { passive: true });
      if (typeof window !== 'undefined') window.addEventListener('scroll', pendingScrollListener, { passive: true });
      pendingScrollTimer = setTimeout(proceed, getScrollY() <= TOP_TOLERANCE_PX ? 60 : 340);
      return true;
    };

    window._rkPtrReset = function () {
      cancelPendingScrollRefresh();
      clearGesture();
      refreshing = false;
      cooldownUntil = 0;
      resetVisual('');
    };

    root.addEventListener('touchstart', function (e) {
      clearGesture();
      if (!canStartRefresh()) return;
      if (!e.touches || e.touches.length !== 1) return;
      if (getScrollY() > TOP_TOLERANCE_PX) return;
      if (isExcludedTarget(e.target)) return;
      ptr = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        pullY: 0,
        locked: false,
      };
      root.addEventListener('touchmove', onActiveMove, { passive: false });
      root.addEventListener('touchend', onActiveEnd, { passive: true });
      root.addEventListener('touchcancel', onActiveCancel, { passive: true });
    }, { passive: true });
  })();
  if (typeof document !== 'undefined' && !document._rkMobDocNotifBound) {
    document._rkMobDocNotifBound = true;
    document.addEventListener('click', function (e) {
      if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return;
      var mp = $('m-notif-popover');
      if (mp && mp.classList.contains('open') && !e.target.closest('#m-notif-popover') && !e.target.closest('#m-btn-notif')) {
        mp.classList.remove('open');
        if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      }
      var ap = $('m-acct-popover');
      if (ap && ap.classList.contains('open') && !e.target.closest('#m-acct-popover') && !e.target.closest('#m-acct-btn')) {
        ap.classList.remove('open');
        if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (typeof getShellMode === 'function' && getShellMode() !== 'mobile-app') return;
      var mp = $('m-notif-popover');
      if (mp && mp.classList.contains('open')) {
        mp.classList.remove('open');
        if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      }
      var ap = $('m-acct-popover');
      if (ap && ap.classList.contains('open')) {
        ap.classList.remove('open');
        if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
      }
    });
  }
  root.addEventListener('pointerdown', function (e) {
    if (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) return;
    if (e.button && e.button !== 0) return;
    var host = e.target && e.target.closest ? e.target.closest('.btn, .list-row, .cat-bento-card, .p-chip, .m-scen-card, .bn-btn') : null;
    if (!host || host.disabled || host.classList.contains('ico-btn') || host.classList.contains('av-btn') || host.classList.contains('seg-btn')) return;
    host.classList.add('rk-ripple-host');
    var rect = typeof host.getBoundingClientRect === 'function' ? host.getBoundingClientRect() : { left: 0, top: 0, width: 64, height: 44 };
    var w = rect.width || 64, h = rect.height || 44;
    var x = typeof e.clientX === 'number' && rect.width ? (e.clientX - rect.left) : w / 2;
    var y = typeof e.clientY === 'number' && rect.height ? (e.clientY - rect.top) : h / 2;
    var size = Math.max(w, h) * 2.2;
    var clip = document.createElement('span');
    clip.className = 'rk-ripple-clip';
    var wave = document.createElement('span');
    wave.className = 'rk-ripple';
    wave.style.width = size + 'px';
    wave.style.height = size + 'px';
    wave.style.left = x + 'px';
    wave.style.top = y + 'px';
    clip.appendChild(wave);
    host.appendChild(clip);
    var cleanRipple = function () { if (clip.parentNode) clip.parentNode.removeChild(clip); };
    wave.addEventListener('animationend', cleanRipple, { once: true });
    setTimeout(cleanRipple, 500);
  }, { passive: true });
  root.addEventListener('touchstart', function (e) {
    if (!e.target.closest('#m-cf-wrap')) dismissMobCfOverlay();
  }, { passive: true });
  // Bottom Sheet Drag-to-Dismiss (#6)
  if (!root._sheetDragBound) {
    root._sheetDragBound = true;
    var shDrag = null;
    root.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      var sheet = e.target.closest('.modal-backdrop.open .modal-sheet');
      if (!sheet) return;
      if (e.target.closest('input, textarea, select, svg, .chart-stage')) return;
      var bdEl = sheet.closest('.modal-backdrop');
      var bodyEl = sheet.querySelector('.ms-body');
      var fromHandle = !!e.target.closest('.ms-handle, .ms-head');
      if (!fromHandle && bodyEl && bodyEl.scrollTop > 0) return;
      shDrag = {
        bd: bdEl,
        sheet: sheet,
        body: bodyEl,
        fromHandle: fromHandle,
        sx: e.touches[0].clientX,
        sy: e.touches[0].clientY,
        t0: Date.now(),
        dy: 0,
        locked: null,
      };
    }, { passive: true });
    root.addEventListener('touchmove', function (e) {
      if (!shDrag || !e.touches || !e.touches[0]) return;
      var t0 = e.touches[0],
        dx = t0.clientX - shDrag.sx,
        dy = t0.clientY - shDrag.sy;
      if (shDrag.locked === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || (!shDrag.fromHandle && shDrag.body && shDrag.body.scrollTop > 0)) {
          shDrag = null;
          return;
        }
        shDrag.locked = 'v';
        shDrag.bd.classList.add('is-dragging');
      }
      if (shDrag.locked === 'v') {
        if (e.cancelable) e.preventDefault();
        shDrag.dy = Math.max(0, dy);
        var h = shDrag.sheet.offsetHeight || 400;
        shDrag.sheet.style.transform = 'translateY(' + shDrag.dy.toFixed(1) + 'px)';
        shDrag.bd.style.opacity = String(Math.max(0.15, 1 - shDrag.dy / (h * 1.15)));
      }
    }, { passive: false });
    var finishSheetDrag = function () {
      if (!shDrag) return;
      var st = shDrag;
      shDrag = null;
      if (st.locked !== 'v') return;
      st.bd.classList.remove('is-dragging');
      var h = st.sheet.offsetHeight || 400;
      var dt = Math.max(1, Date.now() - st.t0);
      var vy = st.dy / dt;
      if (st.dy > h * 0.3 || (st.dy > 24 && vy > 0.55)) {
        st.sheet.style.transition = 'transform var(--dur-sheet-close) var(--ease-in)';
        st.bd.style.transition = 'opacity var(--dur-sheet-close) var(--ease-in)';
        st.sheet.style.transform = 'translateY(100%)';
        st.bd.style.opacity = '0';
        setTimeout(function () {
          st.bd.classList.remove('open', 'is-closing');
          st.sheet.style.transform = '';
          st.sheet.style.transition = '';
          st.bd.style.opacity = '';
          st.bd.style.transition = '';
        }, 250);
      } else {
        st.sheet.style.transition = 'transform var(--dur-sheet-snap) var(--ease-spring)';
        st.bd.style.transition = 'opacity var(--dur-sheet-snap) var(--ease-out)';
        st.sheet.style.transform = 'translateY(0)';
        st.bd.style.opacity = '';
        setTimeout(function () {
          st.sheet.style.transform = '';
          st.sheet.style.transition = '';
          st.bd.style.transition = '';
        }, 310);
      }
    };
    root.addEventListener('touchend', finishSheetDrag);
    root.addEventListener('touchcancel', finishSheetDrag);
  }
  root.addEventListener('click', function (e) {
    if (!e.target.closest('#m-cf-wrap')) dismissMobCfOverlay();
    if (!e.target.closest('#m-notif-popover') && !e.target.closest('#m-btn-notif')) {
      if ($('m-notif-popover')) {
        $('m-notif-popover').classList.remove('open');
        if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      }
    }
    if (!e.target.closest('#m-acct-popover') && !e.target.closest('#m-acct-btn')) {
      if ($('m-acct-popover') && $('m-acct-popover').classList.contains('open')) {
        $('m-acct-popover').classList.remove('open');
        if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
      }
    }
    if (!e.target.closest('.picker-wrap')) {
      root.querySelectorAll('.picker-popover.open').forEach(function (p) { p.classList.remove('open'); });
    }
    if (!e.target.closest('.mselect')) {
      root.querySelectorAll('.mselect.open').forEach(function (ms) {
        ms.classList.remove('open');
        var tr = ms.querySelector('.mselect-trigger');
        if (tr) tr.setAttribute('aria-expanded', 'false');
      });
    }
    var mcatTrig = e.target.closest('#m-kas-cat-trig');
    if (mcatTrig) {
      e.stopPropagation();
      var msWrap = $('m-kas-cat-ms');
      if (msWrap) {
        var willOpen = !msWrap.classList.contains('open');
        msWrap.classList.toggle('open', willOpen);
        mcatTrig.setAttribute('aria-expanded', String(willOpen));
      }
      return;
    }
    var mcatOpt = e.target.closest('[data-mcatval]');
    if (mcatOpt) {
      var fltSel = $('m-kas-flt-cat'), msWrap2 = $('m-kas-cat-ms'), tr2 = $('m-kas-cat-trig');
      if (fltSel) fltSel.value = mcatOpt.getAttribute('data-mcatval') || 'all';
      if (msWrap2) msWrap2.classList.remove('open');
      if (tr2) tr2.setAttribute('aria-expanded', 'false');
      renderMobKas();
      return;
    }
    var mcalT = e.target.closest('[data-mcal-trig]');
    if (mcalT) {
      e.stopPropagation();
      var cid = mcalT.getAttribute('data-mcal-trig'), popC = $(cid + '-cal');
      root.querySelectorAll('.picker-popover.open').forEach(function (p) { if (p !== popC) p.classList.remove('open'); });
      if (popC) { mobDrawCal(cid); popC.classList.toggle('open'); }
      return;
    }
    var mcalMv = e.target.closest('[data-mcal-mv]');
    if (mcalMv) {
      e.stopPropagation();
      var ps = mcalMv.getAttribute('data-mcal-mv').split('|'), idM = ps[0], cv = MOB_CAL_VIEW[idM];
      if (cv) {
        cv.m += +ps[1];
        if (cv.m < 0) { cv.m = 11; cv.y--; }
        if (cv.m > 11) { cv.m = 0; cv.y++; }
        mobDrawCal(idM);
      }
      return;
    }
    var mcalPk = e.target.closest('[data-mcal-pick]');
    if (mcalPk) {
      e.stopPropagation();
      var p2 = mcalPk.getAttribute('data-mcal-pick').split('|');
      mobSetDateVal(p2[0], p2[1]);
      if ($(p2[0] + '-cal')) $(p2[0] + '-cal').classList.remove('open');
      return;
    }
    var bd = e.target.classList && e.target.classList.contains('modal-backdrop') ? e.target : null;
    if (bd) { mobCloseSheet(bd.id); return; }
    var cls = e.target.closest('[data-mclose]');
    if (cls) { mobCloseSheet(cls.getAttribute('data-mclose')); return; }

    var pf = e.target.closest('[data-mpframe]');
    if (pf) { setMobPhoneFrame(pf.getAttribute('data-mpframe')); return; }
    if (e.target.closest('#m-bar-theme-btn') || e.target.closest('#m-menu-theme')) {
      if ($('thm')) $('thm').click();
      renderMobMetaMenus();
      return;
    }
    if (e.target.closest('#m-btn-notif-activate')) {
      if (isMobNotifOsActive()) {
        if (typeof rkSetNotifReset === 'function') rkSetNotifReset(true);
        MOB_STATE.notifEnabled = false;
        if (typeof syncNotifBtn === 'function') syncNotifBtn();
        renderMobSettings();
        renderMobNotifPopover();
        showMobToast('Izin notifikasi direset.');
      } else {
        if (typeof rkSetNotifReset === 'function') rkSetNotifReset(false);
        MOB_STATE.notifEnabled = true;
        if (typeof requestNotifPermission === 'function') requestNotifPermission();
        else { renderMobSettings(); renderMobNotifPopover(); }
      }
      return;
    }
    if (e.target.closest('#m-bar-notif-btn') || e.target.closest('#m-btn-test-notif') || e.target.closest('#m-pop-preview')) {
      triggerMobPhoneBarNotif(true);
      if (e.target.closest('#m-btn-test-notif') && typeof requestNotifPermission === 'function') requestNotifPermission();
      return;
    }
    if (e.target.closest('#m-pon-close')) { dismissMobOsNotif(0); return; }
    if (e.target.closest('#m-pon-set') || e.target.closest('#m-pop-to-set') || e.target.closest('#m-pop-enable-os')) {
      var toNotifCard = !!e.target.closest('#m-pop-enable-os');
      dismissMobOsNotif(0);
      if ($('m-notif-popover')) {
        $('m-notif-popover').classList.remove('open');
        if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      }
      switchMobileTab('settings');
      if (toNotifCard && $('m-card-settings-notif') && $('m-card-settings-notif').scrollIntoView) {
        $('m-card-settings-notif').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (e.target.closest('#m-pon-paid')) {
      if (MOB_BANNER_DUE) {
        var yrKey = MOB_BANNER_DUE.year;
        if (ALL.data[yrKey]) {
          ALL.data[yrKey].paid[MOB_BANNER_DUE.key] = 1;
          delete ALL.data[yrKey].skip[MOB_BANNER_DUE.key];
          save();
          syncUI();
          showMobToast(MOB_BANNER_DUE.it.name + ' lunas');
        }
      }
      dismissMobOsNotif(0);
      return;
    }

    if (e.target.closest('#m-btn-privacy')) {
      var nextPriv = !(document.body && document.body.classList.contains('privacy-mode'));
      if (typeof rkApplyPrivacyMode === 'function') {
        rkApplyPrivacyMode(nextPriv);
      } else if (document.body) {
        document.body.classList.toggle('privacy-mode', nextPriv);
        document.body.classList.toggle('privacy-on', nextPriv);
        if (nextPriv && typeof rkCancelAllCountUps === 'function') rkCancelAllCountUps();
        try { localStorage.setItem('rk-privacy', nextPriv ? '1' : '0'); } catch (err) {}
        syncMobileCloudUI();
      }
      return;
    }
    if (e.target.closest('#m-btt-btn')) {
      var mmB = $('m-main'), beh = (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ? 'auto' : 'smooth';
      if (mmB && typeof mmB.scrollTo === 'function') mmB.scrollTo({ top: 0, behavior: beh });
      else if (mmB) mmB.scrollTop = 0;
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: beh });
      return;
    }
    if (e.target.closest('#m-btn-notif')) {
      if ($('m-acct-popover')) $('m-acct-popover').classList.remove('open');
      if (typeof rkTriggerBell === 'function') rkTriggerBell(e.target.closest('#m-btn-notif'));
      renderMobNotifPopover();
      var pop = $('m-notif-popover');
      if (pop) pop.classList.toggle('open');
      if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      return;
    }

    if (e.target.closest('#m-acct-btn')) {
      renderMobMetaMenus();
      if ($('m-notif-popover')) $('m-notif-popover').classList.remove('open');
      var aPop = $('m-acct-popover');
      if (aPop) aPop.classList.toggle('open');
      if (typeof rkSyncNotifOpenUI === 'function') rkSyncNotifOpenUI();
      return;
    }
    if (e.target.closest('#m-menu-acct') || e.target.closest('#m-set-open-acct')) {
      if ($('m-acct-popover')) {
        $('m-acct-popover').classList.remove('open');
        if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
      }
      mobCloseSheet('m-sheet-more');
      openMobAcctSheet();
      return;
    }
    if (e.target.closest('#m-lg-google')) { if (typeof authGoogle === 'function') authGoogle(); else showMobToast('Sinkron Google belum aktif'); return; }
    if (e.target.closest('#m-acct-sync-now')) { if (typeof pull === 'function') pull(); mobCloseSheet('m-sheet-acct'); return; }
    if (e.target.closest('#m-acct-logout')) {
      var outBtn = e.target.closest('#m-acct-logout');
      if (outBtn) { outBtn.disabled = true; outBtn.textContent = 'Keluar...'; }
      var doOut = typeof rkSignOut === 'function'
        ? rkSignOut()
        : (typeof sb !== 'undefined' && sb && sb.auth ? Promise.resolve(sb.auth.signOut({ scope: 'local' })).catch(function () {}) : Promise.resolve());
      Promise.resolve(doOut).then(function () {
        mobCloseSheet('m-sheet-acct');
        showMobToast('Keluar dari akun.');
      });
      return;
    }
    if (e.target.closest('#m-lg-in')) {
      var em = ($('m-lg-email') && $('m-lg-email').value || '').trim(), pw = $('m-lg-pass') && $('m-lg-pass').value || '';
      if (!em || pw.length < 6) {
        if ($('m-lg-err')) $('m-lg-err').textContent = 'Isi email dan password (min 6 karakter).';
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid(!em ? $('m-lg-email') : $('m-lg-pass'));
        return;
      }
      sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) {
        if (r.error) { if ($('m-lg-err')) $('m-lg-err').textContent = r.error.message; return; }
        mobCloseSheet('m-sheet-acct');
      });
      return;
    }

    if (e.target.closest('#m-top-yr-pill') || e.target.closest('#m-yr-btn-center') || e.target.closest('#m-fab-add')) {
      if ($('m-acct-popover')) {
        $('m-acct-popover').classList.remove('open');
        if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
      }
      openMobPeriodeSheet();
      return;
    }
    if (e.target.closest('#m-btn-more')) { renderMobMetaMenus(); mobOpenSheet('m-sheet-more'); return; }
    if (e.target.closest('#m-menu-backup')) { mobCloseSheet('m-sheet-more'); mobOpenSheet('m-sheet-backup'); return; }
    var expBtn = e.target.closest('[data-mexp]');
    if (expBtn) { doExport(expBtn.getAttribute('data-mexp')); mobCloseSheet('m-sheet-backup'); return; }

    var mjs = e.target.closest('[data-mjsub]');
    if (mjs) {
      MOB_STATE.jadwalSub = mjs.getAttribute('data-mjsub') || 'list';
      renderMobJadwal();
      initMobDragSliders();
      mobPaintAllSliders();
      return;
    }
    var mrptog = e.target.closest('[data-mrep-tog]');
    if (mrptog) {
      var rk = mrptog.getAttribute('data-mrep-tog');
      MOB_STATE.repExpanded[rk] = !MOB_STATE.repExpanded[rk];
      renderMobReportPreview(MOB_STATE.repKind);
      return;
    }

    var navBtn = e.target.closest('[data-mtab], [data-mnav], [data-mgo]');
    if (navBtn) {
      var mtabId = navBtn.getAttribute('data-mtab');
      var tid = mtabId || navBtn.getAttribute('data-mnav') || navBtn.getAttribute('data-mgo');
      if (mtabId === 'rincian' && MOB_STATE.tab === 'rincian' && typeof window.rkMobRefresh === 'function') {
        window.rkMobRefresh();
        return;
      }
      mobCloseSheet('m-sheet-more');
      switchMobileTab(tid);
      return;
    }
    var orep = e.target.closest('[data-mopen-rep]');
    if (orep) {
      MOB_STATE.repKind = orep.getAttribute('data-mopen-rep');
      mobCloseSheet('m-sheet-more');
      switchMobileTab('settings');
      return;
    }
    var mrep = e.target.closest('[data-mrep]');
    if (mrep) { renderMobReportPreview(mrep.getAttribute('data-mrep')); return; }
    if (e.target.closest('#m-btn-dl-report')) { downloadRepPdf(MOB_STATE.repKind); return; }
    if (e.target.closest('#m-btn-check-update')) { rkCheckApkUpdate({ silent: false }); return; }
    var instUpdBtn = e.target.closest('#m-btn-install-update');
    if (instUpdBtn) {
      rkInstallApkInApp(instUpdBtn.getAttribute('data-force-dl') === '1' ? { force: true } : undefined);
      return;
    }
    if (e.target.closest('#m-btn-open-browser-update')) { rkOpenApkDownload(); return; }
    if (e.target.closest('#m-btn-copy-update-url')) { rkCopyApkUpdateUrl(); return; }
    if (e.target.closest('#m-btn-perm-update')) {
      var apkPerm = rkCapPlugin('ApkInstaller');
      if (apkPerm && typeof apkPerm.openInstallSettings === 'function') {
        rkBindUpdAppStateResume();
        Promise.resolve(apkPerm.openInstallSettings()).catch(function () {});
      }
      return;
    }
    if (e.target.closest('#m-btn-retry-install-update')) { rkLaunchApkInstall(); return; }

    var mrng = e.target.closest('[data-mrange]');
    if (mrng) {
      MOB_STATE.cashRange = mrng.getAttribute('data-mrange');
      root.querySelectorAll('[data-mrange]').forEach(function (x) { x.classList.toggle('active', x === mrng); });
      if (typeof rkSyncSegPills === 'function' && mrng.closest('.seg')) rkSyncSegPills(mrng.closest('.seg'), true);
      renderMobRincian();
      if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-cf-wrap'));
      return;
    }
    if (e.target.closest('#m-btn-expand-cf')) {
      MOB_STATE.zoomRange = MOB_STATE.cashRange || 'm';
      MOB_STATE.zoomPin = null;
      mobOpenSheet('m-sheet-cf-zoom');
      renderMobCashflowZoom();
      return;
    }
    var mzr = e.target.closest('[data-mzoom-range]');
    if (mzr) {
      MOB_STATE.zoomRange = mzr.getAttribute('data-mzoom-range');
      MOB_STATE.zoomPin = null;
      renderMobCashflowZoom();
      if (typeof rkSyncSegPills === 'function' && mzr.closest('.seg')) rkSyncSegPills(mzr.closest('.seg'), true);
      if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-cf-zoom-stage'));
      return;
    }
    if (e.target.closest('#m-cf-zoom-wide')) {
      MOB_STATE.zoomWide = !MOB_STATE.zoomWide;
      renderMobCashflowZoom();
      if (typeof rkSyncSegPills === 'function') rkSyncSegPills($('m-sheet-cf-zoom'), false);
      return;
    }
    var mzm = e.target.closest('[data-mzmode]');
    if (mzm) {
      MOB_STATE.zoomTouch = mzm.getAttribute('data-mzmode') === 'pan' ? 'pan' : 'scrub';
      renderMobCashflowZoom();
      if (typeof rkSyncSegPills === 'function' && mzm.closest('.seg')) rkSyncSegPills(mzm.closest('.seg'), true);
      return;
    }
    if (e.target.closest('#m-cf-zoom-unpin')) {
      MOB_STATE.zoomPin = null;
      renderMobCashflowZoom();
      return;
    }
    if (e.target.closest('#m-cf-zoom-go-sim')) {
      mobCloseSheet('m-sheet-cf-zoom');
      switchMobileTab('sim');
      return;
    }
    var mws = e.target.closest('[data-mwstyle]');
    if (mws) { MOB_STATE.whereStyle = mws.getAttribute('data-mwstyle'); root.querySelectorAll('[data-mwstyle]').forEach(function (x) { x.classList.toggle('active', x === mws); }); if (typeof rkSyncSegPills === 'function' && mws.closest('.seg')) rkSyncSegPills(mws.closest('.seg'), true); renderMobWhere(yearCash()); if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-jar-stage')); return; }
    var mwp = e.target.closest('[data-mwperiod]');
    if (mwp) { MOB_STATE.wherePeriod = mwp.getAttribute('data-mwperiod'); MOB_STATE.whereLock = null; root.querySelectorAll('[data-mwperiod]').forEach(function (x) { x.classList.toggle('active', x === mwp); }); if (typeof rkSyncSegPills === 'function' && mwp.closest('.seg')) rkSyncSegPills(mwp.closest('.seg'), true); renderMobWhere(yearCash()); if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-jar-stage')); return; }
    var mwd = e.target.closest('[data-mwdir]');
    if (mwd) { MOB_STATE.whereDir = mwd.getAttribute('data-mwdir'); MOB_STATE.whereLock = null; root.querySelectorAll('[data-mwdir]').forEach(function (x) { x.classList.toggle('active', x === mwd); }); if (typeof rkSyncSegPills === 'function' && mwd.closest('.seg')) rkSyncSegPills(mwd.closest('.seg'), true); renderMobWhere(yearCash()); if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-jar-stage')); return; }
    var mkc = e.target.closest('[data-mkcat]');
    if (mkc) {
      var k = mkc.getAttribute('data-mkcat');
      MOB_STATE.whereLock = MOB_STATE.whereLock === k ? null : k;
      if (MOB_STATE.whereLock) { MOB_STATE._justCatId = 'm-where-cats'; MOB_STATE._justCatVal = MOB_STATE.whereLock; }
      renderMobWhere(yearCash());
      return;
    }
    if (e.target.closest('#m-btn-reset-where')) { MOB_STATE.whereLock = null; renderMobWhere(yearCash()); return; }
    var mbsp = e.target.closest('[data-mbsp]');
    if (mbsp) { MOB_STATE.bsPeriod = mbsp.getAttribute('data-mbsp'); root.querySelectorAll('[data-mbsp]').forEach(function (x) { x.classList.toggle('active', x === mbsp); }); if (typeof rkSyncSegPills === 'function' && mbsp.closest('.seg')) rkSyncSegPills(mbsp.closest('.seg'), true); renderMobBarSvg(yearCash()); if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-bar-wrap')); return; }
    var mtxf = e.target.closest('[data-mtxf]');
    if (mtxf) { MOB_STATE.txDir = mtxf.getAttribute('data-mtxf'); root.querySelectorAll('[data-mtxf]').forEach(function (x) { x.classList.toggle('active', x === mtxf); }); if (typeof rkSyncSegPills === 'function' && mtxf.closest('.seg')) rkSyncSegPills(mtxf.closest('.seg'), true); renderMobRecentTx(kasLinked()); return; }

    var qp = e.target.closest('[data-mquickpaid]');
    if (qp) {
      var parts = qp.getAttribute('data-mquickpaid').split('|'), ky = parts[0] + '|' + parts[1];
      S.paid[ky] = 1;
      delete S.skip[ky];
      if (typeof rkMarkPaidFlash === 'function') rkMarkPaidFlash(parts[0]);
      save();
      syncUI();
      showMobToast('Tagihan ditandai lunas');
      return;
    }

    // Period & Year sheet / account popover handlers
    var yp = e.target.closest('[data-myrpick]');
    if (yp) {
      var fromAcctPop = !!yp.closest('#m-acct-popover');
      switchYear(+yp.getAttribute('data-myrpick'));
      if (fromAcctPop) {
        if ($('m-acct-popover')) {
          $('m-acct-popover').classList.remove('open');
          if (typeof rkSyncAcctOpenUI === 'function') rkSyncAcctOpenUI();
        }
        showMobToast('Tahun diganti ke ' + S.year);
      } else {
        openMobPeriodeSheet();
      }
      if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-tab-rincian'));
      return;
    }
    if (e.target.closest('#m-cfg-save')) {
      var ny = parseInt($('m-cfg-year') ? $('m-cfg-year').value : S.year, 10);
      if (!(ny >= 1900 && ny <= 2200)) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-cfg-year'));
        showMobToast('Tahun harus antara 1900 dan 2200');
        return;
      }
      if (ny !== S.year) switchYear(ny);
      var nsm = $('m-cfg-sm') ? $('m-cfg-sm').value : 'auto';
      setStartMonth(nsm === 'auto' ? 'auto' : +nsm);
      S.saldo = getRpVal('m-cfg-saldo');
      save();
      syncUI();
      if (typeof rkAnimateChartOnly === 'function') rkAnimateChartOnly($('m-tab-rincian'));
      mobCloseSheet('m-sheet-periode');
      showMobToast('Pengaturan periode disimpan');
      return;
    }
    if (e.target.closest('#m-cfg-del')) {
      var yy = S.year;
      askConfirm(
        'Hapus tahun <b>' + yy + '</b> beserta ' + (S.items || []).length + ' item dan status pembayarannya?',
        function () {
          mobCloseSheet('m-sheet-periode');
          delYear();
        },
        'Ya, hapus tahun'
      );
      return;
    }

    // Kas handlers
    var ks = e.target.closest('[data-ksub]');
    if (ks) {
      var sub = ks.getAttribute('data-ksub');
      root.querySelectorAll('[data-ksub]').forEach(function (x) { x.classList.toggle('active', x === ks); });
      if ($('m-kas-card-form')) $('m-kas-card-form').classList.toggle('sec-hidden', sub !== 'all' && sub !== 'form');
      if ($('m-kas-card-debt')) $('m-kas-card-debt').classList.toggle('sec-hidden', sub !== 'all' && sub !== 'debt');
      if ($('m-kas-card-hist')) $('m-kas-card-hist').classList.toggle('sec-hidden', sub !== 'all' && sub !== 'hist');
      return;
    }
    var mkt = e.target.closest('[data-mktype]');
    if (mkt) { MOB_STATE.kasType = mkt.getAttribute('data-mktype'); root.querySelectorAll('[data-mktype]').forEach(function (x) { x.classList.toggle('active', x === mkt); }); if (typeof rkSyncSegPills === 'function' && mkt.closest('.seg')) rkSyncSegPills(mkt.closest('.seg'), true); renderMobKas(); return; }
    var mq = e.target.closest('.m-qamt');
    if (mq) { setRpVal('m-kas-amt', getRpVal('m-kas-amt') + Number(mq.getAttribute('data-amt'))); if ($('m-kas-amt-readout')) $('m-kas-amt-readout').textContent = rp(getRpVal('m-kas-amt')); return; }
    var mkcp = e.target.closest('[data-mkcatpick]');
    if (mkcp) { MOB_STATE.kasCat = mkcp.getAttribute('data-mkcatpick'); MOB_STATE._justCatId = 'm-kas-cat-pills'; MOB_STATE._justCatVal = MOB_STATE.kasCat; renderMobKas(); return; }
    var mkfd = e.target.closest('[data-mkfdir]');
    if (mkfd) { MOB_STATE.kasFilterDir = mkfd.getAttribute('data-mkfdir'); root.querySelectorAll('[data-mkfdir]').forEach(function (x) { x.classList.toggle('active', x === mkfd); }); if (typeof rkSyncSegPills === 'function' && mkfd.closest('.seg')) rkSyncSegPills(mkfd.closest('.seg'), true); renderMobKas(); return; }
    if (e.target.closest('#m-kas-flt-reset')) {
      MOB_STATE.kasFilterDir = 'all';
      if ($('m-kas-flt-cat')) $('m-kas-flt-cat').value = 'all';
      if ($('m-kas-search')) $('m-kas-search').value = '';
      root.querySelectorAll('[data-mkfdir]').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-mkfdir') === 'all'); });
      var mkAll = root.querySelector('[data-mkfdir="all"]');
      if (typeof rkSyncSegPills === 'function' && mkAll && mkAll.closest('.seg')) rkSyncSegPills(mkAll.closest('.seg'), true);
      renderMobKas();
      return;
    }
    var mdtx = e.target.closest('[data-mdeltx]');
    if (mdtx) { kasDelTx(mdtx.getAttribute('data-mdeltx')); return; }
    var mdc = e.target.closest('[data-mdebt-cicil]');
    if (mdc) {
      var kindC = mdc.getAttribute('data-mkind'), nmC = mdc.getAttribute('data-mdebt-cicil'), amtC = +mdc.getAttribute('data-mamt') || 0;
      MOB_STATE.kasType = kindC === 'utang' ? '-' : '+';
      root.querySelectorAll('[data-mktype]').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-mktype') === MOB_STATE.kasType); });
      var mktAct = root.querySelector('[data-mktype].active');
      if (typeof rkSyncSegPills === 'function' && mktAct && mktAct.closest('.seg')) rkSyncSegPills(mktAct.closest('.seg'), true);
      if ($('m-kas-card-form')) $('m-kas-card-form').classList.remove('sec-hidden');
      if ($('m-kas-debt')) $('m-kas-debt').checked = true;
      if ($('m-kas-debt-box')) $('m-kas-debt-box').style.display = 'grid';
      renderMobKas();
      if ($('m-kas-debt-kind')) $('m-kas-debt-kind').value = kindC === 'utang' ? 'bayar-utang' : 'bayar-piutang';
      if ($('m-kas-debt-name')) $('m-kas-debt-name').value = nmC;
      if ($('m-kas-note')) $('m-kas-note').value = (kindC === 'utang' ? 'Cicil utang ' : 'Cicil piutang ') + nmC;
      if ($('m-kas-amt')) {
        $('m-kas-amt').value = '';
        $('m-kas-amt').placeholder = amtC > 0 ? ('Sisa ' + rp(amtC)) : '50.000';
        if ($('m-kas-amt-readout')) $('m-kas-amt-readout').textContent = 'Rp 0';
        if ($('m-kas-card-form') && $('m-kas-card-form').scrollIntoView) $('m-kas-card-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('m-kas-amt').focus();
      }
      return;
    }
    var mdp = e.target.closest('[data-mdebt-pay]');
    if (mdp) {
      var P0 = kasLinked(), kind = mdp.getAttribute('data-mkind'), nm = mdp.getAttribute('data-mdebt-pay'), amt = +mdp.getAttribute('data-mamt');
      P0.tx.push({ id: 't' + Date.now().toString(36), d: todayISO(), t: kind === 'utang' ? '-' : '+', amt: amt, cat: kind === 'utang' ? 'Bayar Utang' : 'Terima Piutang', note: 'Pelunasan ' + nm, debt: true, debtName: nm, debtKind: kind === 'utang' ? 'bayar-utang' : 'bayar-piutang' });
      save();
      syncUI();
      showMobToast('Pembayaran dicatat');
      return;
    }

    // Jadwal handlers
    var mjm = e.target.closest('[data-mjmonth]');
    if (mjm) { MOB_STATE.jadwalMonth = mjm.getAttribute('data-mjmonth'); renderMobJadwal(); return; }
    var mjf = e.target.closest('[data-mjfilter]');
    if (mjf) { MOB_STATE.jadwalFilter = mjf.getAttribute('data-mjfilter'); root.querySelectorAll('[data-mjfilter]').forEach(function (x) { x.classList.toggle('active', x === mjf); }); if (typeof rkSyncSegPills === 'function' && mjf.closest('.seg')) rkSyncSegPills(mjf.closest('.seg'), true); renderMobJadwal(); return; }
    var ch = e.target.closest('[data-mchip]');
    if (ch) {
      var ps = ch.getAttribute('data-mchip').split('|'), id = ps[0], iso = ps[1], it = S.items.find(function (x) { return String(x.id) === id; });
      if (!it) return;
      var ky = id + '|' + iso;
      MOB_STATE.chipCtx = { id: it.id, iso: iso };
      if ($('m-cp-title')) $('m-cp-title').textContent = it.name + ' · ' + fmtD(iso);
      if ($('m-cp-sub')) $('m-cp-sub').textContent = rp(priceAt(it, Date.parse(iso + 'T00:00:00Z'))) + ' · ' + (S.skip[ky] ? 'Dilewati' : S.paid[ky] ? 'Lunas' : 'Belum dibayar');
      mobOpenSheet('m-sheet-chip');
      return;
    }
    var cpAct = e.target.closest('[data-cp-act]');
    if (cpAct && MOB_STATE.chipCtx) {
      var act = cpAct.getAttribute('data-cp-act'), cx = MOB_STATE.chipCtx, ky2 = cx.id + '|' + cx.iso;
      mobCloseSheet('m-sheet-chip');
      if (act === 'edit') {
        openMobScenarioSheet(item(cx.id), cx.iso);
        return;
      }
      if (act === 'paid') { S.paid[ky2] = 1; delete S.skip[ky2]; if (typeof rkMarkPaidFlash === 'function') rkMarkPaidFlash(cx.id); }
      else if (act === 'unpaid') { delete S.paid[ky2]; delete S.skip[ky2]; }
      else if (act === 'skip') { S.skip[ky2] = 1; delete S.paid[ky2]; }
      save();
      syncUI();
      showMobToast('Status tagihan diperbarui');
      return;
    }
    var med = e.target.closest('[data-medit-it]');
    if (med) {
      var iid = med.getAttribute('data-medit-it'), itE = item(iid);
      if (!itE) return;
      MOB_STATE.chipCtx = { id: itE.id, iso: itE.start || (S.year + '-' + pad2(smEff() + 1) + '-01') };
      openMobScenarioSheet(itE, MOB_STATE.chipCtx.iso);
      return;
    }
    var mscTab = e.target.closest('[data-mscen]');
    if (mscTab) {
      renderMobScenFields(mscTab.getAttribute('data-mscen'), item(MOB_STATE.scenItemId));
      return;
    }
    if (e.target.closest('#m-btn-save-scen')) {
      var itU = item(MOB_STATE.scenItemId);
      if (itU) {
        var scen = MOB_STATE.scenMode || 'change_price',
          mEl = $('m-sc-month'),
          m = mEl ? +mEl.value : smEff(),
          y = +S.year,
          setMErr = function (msg) { if ($('m-ms-err')) $('m-ms-err').textContent = msg; };
        setMErr('');
        itU.ch = itU.ch || [];
        if (scen === 'change_price' || scen === 'temp_price') {
          var np = getRpVal('m-sc-price');
          if (!(np > 0)) {
            setMErr('Isi nominal harga baru yang valid.');
            if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-sc-price'));
            return;
          }
          var fromIso = y + '-' + pad2(m + 1) + '-01', toIso = '';
          if (scen === 'temp_price') {
            var mEnd = $('m-sc-month-end') ? +$('m-sc-month-end').value : m;
            if (mEnd < m) {
              setMErr('Bulan akhir promo tidak boleh sebelum bulan mulai.');
              if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-sc-month-end'));
              return;
            }
            toIso = isoD(Date.UTC(y, mEnd + 1, 0));
          }
          itU.ch = itU.ch.filter(function (c) { return !(c.from === fromIso && c.to === toIso && !c.mv); });
          itU.ch.push({ from: fromIso, to: toIso, price: np, n: null, unit: null, cut: false });
        } else if (scen === 'cycle') {
          var cVal = $('m-sc-cycle') ? $('m-sc-cycle').value : 'tiap bulan';
          var cyc = typeof brCycleToCore === 'function' ? brCycleToCore(cVal) : { n: 1, unit: 'bulan' };
          itU.n = cyc.n;
          itU.unit = cyc.unit;
        } else if (scen === 'shift') {
          var targetDay = Math.min(31, Math.max(1, parseInt($('m-sc-shift-day') && $('m-sc-shift-day').value, 10) || 15));
          var listOcc = occ(itU, y), occInM = listOcc.filter(function (t) { return new Date(t).getUTCMonth() === m; })[0];
          if (!occInM) { setMErr('Tidak ada tagihan di bulan ' + FULL_MON[m] + '.'); return; }
          var origIso = isoD(occInM);
          var dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          var newIso = y + '-' + pad2(m + 1) + '-' + pad2(Math.min(dim, targetDay));
          if (newIso !== origIso) {
            if (typeof moveStatusExact === 'function') moveStatusExact(itU.id, [[origIso, newIso]], [S.paid, S.skip], [S.real || {}]);
            var mvObj = {};
            mvObj[origIso] = newIso;
            itU.ch.push({ from: origIso, to: newIso, mv: mvObj });
          }
        } else if (scen === 'stop') {
          itU.end = isoD(Date.UTC(y, m, 0));
          itU.cnt = 0;
        }
        save();
        syncUI();
        showMobToast('Jadwal ' + itU.name + ' diperbarui');
      }
      mobCloseSheet('m-sheet-scenario');
      return;
    }

    // Items handlers
    var qpx = e.target.closest('.m-qp-ex');
    if (qpx && $('m-qp-input')) { $('m-qp-input').value = qpx.getAttribute('data-qp'); $('m-qp-input').dispatchEvent(new Event('input', { bubbles: true })); return; }
    if (e.target.closest('#m-qp-submit')) {
      var res = parseQuickItem($('m-qp-input') ? $('m-qp-input').value : '', S.year);
      if (!res || res.error) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-qp-input'));
        showMobToast(res && res.error ? res.error : 'Format belum sesuai');
        return;
      }
      S.items.push({ id: Date.now() + Math.floor(Math.random() * 1000), name: res.name, price: res.price, n: res.n || 1, unit: res.unit || 'bulan', start: res.start, end: '', cnt: 0, cat: MOB_STATE.itemCat || 'Tagihan rutin', ch: [] });
      if ($('m-qp-input')) $('m-qp-input').value = '';
      if ($('m-qp-prev')) $('m-qp-prev').innerHTML = '';
      save();
      syncUI();
      showMobToast(res.name + ' ditambahkan');
      return;
    }
    var mitc = e.target.closest('[data-mitcat]');
    if (mitc) { MOB_STATE.itemCat = mitc.getAttribute('data-mitcat'); MOB_STATE._justCatId = 'm-item-cat-pills'; MOB_STATE._justCatVal = MOB_STATE.itemCat; renderMobItems(); return; }
    if (e.target.closest('#m-item-cancel')) { resetMobItemForm(); return; }
    var mef = e.target.closest('[data-medit-form-it]');
    if (mef) {
      var itEdit0 = item(mef.getAttribute('data-medit-form-it'));
      if (itEdit0) {
        MOB_STATE.itemEditId = itEdit0.id;
        if ($('m-item-form-title')) $('m-item-form-title').textContent = 'Ubah: ' + itEdit0.name;
        if ($('m-item-save-btn')) $('m-item-save-btn').textContent = 'Simpan Perubahan';
        if ($('m-item-cancel')) $('m-item-cancel').hidden = false;
        if ($('m-item-name')) $('m-item-name').value = itEdit0.name;
        if (typeof setRpVal === 'function') setRpVal('m-item-price', itEdit0.price);
        else if ($('m-item-price')) $('m-item-price').value = (+itEdit0.price || 0).toLocaleString('id-ID');
        if ($('m-item-price-ro')) $('m-item-price-ro').textContent = rp(itEdit0.price);
        if ($('m-item-price-slider')) { $('m-item-price-slider').value = String(Math.min(5000000, +itEdit0.price || 0)); mobPaintSlider($('m-item-price-slider')); }
        if ($('m-item-unit')) $('m-item-unit').value = itEdit0.unit === 'hari' && +itEdit0.n === 28 ? '28hari' : (itEdit0.unit || 'bulan');
        mobSetDateVal('m-item-start', itEdit0.start || mobDefaultItemStart());
        MOB_STATE.itemCat = itEdit0.cat || 'Tagihan rutin';
        MOB_STATE.jadwalSub = 'add';
        renderMobJadwal();
        initMobDragSliders();
        mobPaintAllSliders();
      }
      return;
    }
    if (e.target.closest('#m-btn-copy-next')) {
      var ty = +S.year + 1;
      if (!ALL.data[ty]) ALL.data[ty] = { year: ty, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
      var ex = ALL.data[ty].items, cp = 0;
      (S.items || []).filter(Boolean).forEach(function (it) {
        if (!ex.some(function (x) { return x && x.name.toLowerCase() === it.name.toLowerCase(); })) {
          ex.push(JSON.parse(JSON.stringify(Object.assign({}, it, { id: Date.now() + cp++ }))));
        }
      });
      save(); syncUI();
      showMobToast(cp ? cp + ' item disalin ke ' + ty : 'Semua item sudah ada di ' + ty);
      return;
    }
    var mdit = e.target.closest('[data-mdel-it]');
    if (mdit) {
      var did = mdit.getAttribute('data-mdel-it');
      var itDel = (S.items || []).find(function (x) { return x && String(x.id) === did; });
      askConfirm(
        'Hapus item <b>' + esc(itDel ? itDel.name : 'ini') + '</b>?',
        function () {
          var rowEl = mdit.closest('.list-row, .upcoming-item');
          var doDelIt = function () {
            var sn = snap('Sebelum hapus item');
            S.items = (S.items || []).filter(function (x) { return x && String(x.id) !== did; });
            save();
            syncUI();
            toast('Item dihapus', function () { restoreSnap(sn.t); });
          };
          if (typeof rkAnimateRowExit === 'function') rkAnimateRowExit(rowEl, doDelIt);
          else doDelIt();
        },
        'Ya, hapus'
      );
      return;
    }

    // Sim handlers
    var msd = e.target.closest('[data-msimdel]');
    if (msd) { SIM.splice(+msd.getAttribute('data-msimdel'), 1); renderMobSim(); return; }
    if (e.target.closest('#m-btn-clear-sim')) { SIM = []; renderMobSim(); return; }
    if (e.target.closest('#m-btn-apply-sim')) { simApply(); showMobToast('Simulasi diterapkan'); return; }

    // Trip handlers
    if (e.target.closest('#m-btn-trip-new') || e.target.closest('#m-btn-trip-new-pill')) {
      MOB_STATE.tripModalMode = 'new';
      if ($('m-kpt-title')) $('m-kpt-title').textContent = 'Perjalanan Baru';
      if ($('m-kp-name')) $('m-kp-name').value = '';
      mobSetDateVal('m-kp-start', todayISO());
      mobSetDateVal('m-kp-end', addDaysISO(todayISO(), 4));
      if ($('m-kp-use-budget')) $('m-kp-use-budget').value = '1';
      setRpVal('m-kp-budget', 10000000);
      if ($('m-kp-cur')) $('m-kp-cur').value = '';
      if ($('m-kp-rate')) $('m-kp-rate').value = '';
      syncMobTripBudgetWrap();
      mobOpenSheet('m-sheet-trip');
      return;
    }
    if (e.target.closest('#m-btn-trip-share')) {
      if ($('m-sh-inc-cost')) $('m-sh-inc-cost').checked = true;
      if ($('m-sh-status')) $('m-sh-status').textContent = '';
      mobOpenSheet('m-sheet-trip-share');
      return;
    }
    var mShAct = e.target.closest('#m-sheet-trip-share [data-msh]');
    if (mShAct) {
      var trSh = mobActiveTrip();
      if (!trSh) return;
      var incCostM = $('m-sh-inc-cost') ? !!$('m-sh-inc-cost').checked : true,
        sKindM = mShAct.getAttribute('data-msh'),
        setShSt = function (msg) { if ($('m-sh-status')) $('m-sh-status').textContent = msg; };
      if (sKindM === 'pdf') {
        if (typeof tripPdfData !== 'function' || typeof repPdf !== 'function' || typeof rkDownloadBlob !== 'function') {
          setShSt('Pembuat PDF tidak tersedia.');
          return;
        }
        var repT = tripPdfData(trSh, incCostM),
          bytesT = repPdf(repT),
          dlResT = rkDownloadBlob(repT.filename, bytesT, 'application/pdf'),
          nonLatinT = mobTripHasNonWinAnsi(trSh),
          nonLatinNote = nonLatinT ? ' Catatan: karakter non-Latin tampil \'?\' di PDF; gunakan Kirim/Salin teks untuk teks lengkap.' : '';
        setShSt('Membuka dialog berbagi / menyimpan PDF (' + repT.filename + ')...');
        Promise.resolve((dlResT && dlResT.done) ? dlResT.done : dlResT).then(function (resD) {
          var okD = (!dlResT || dlResT.ok !== false) && (!resD || resD.ok !== false);
          var mD = (resD && resD.method) || (dlResT && dlResT.method) || '';
          if (okD) {
            setShSt('PDF siap dibagikan / disimpan (' + repT.filename + (mD ? ' · ' + mD : '') + ').' + nonLatinNote);
          } else if (resD && resD.cancelled) {
            setShSt('Pengiriman PDF dibatalkan.' + nonLatinNote);
          } else {
            var errS = (resD && resD.error) ? ' (' + resD.error + ')' : '';
            setShSt('Gagal mengirim PDF' + errS + '. Gunakan "Salin teks" atau coba lagi.' + nonLatinNote);
          }
        });
        return;
      }
      var txtShM = typeof tripText === 'function' ? tripText(trSh, incCostM) : trSh.name;
      if (sKindM === 'wa') {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          Promise.resolve(navigator.share({ title: trSh.name, text: txtShM }))
            .then(function () { setShSt('Dialog berbagi dibuka.'); })
            .catch(function (err) {
              if (!err || err.name !== 'AbortError') setShSt('Berbagi gagal. Gunakan "Salin teks" lalu tempel di WhatsApp.');
            });
          return;
        }
        var waUrl = 'https://wa.me/?text=' + encodeURIComponent(txtShM);
        if (waUrl.length > MOB_WA_URL_MAX) {
          setShSt('Teks terlalu panjang untuk tautan WhatsApp (' + waUrl.length + ' karakter). Gunakan "Salin teks" lalu tempel di WhatsApp.');
          return;
        }
        mobOpenExternalUrl(waUrl);
        setShSt('Membuka WhatsApp...');
      } else if (typeof copyText === 'function') {
        copyText(txtShM).then(function () {
          setShSt('Teks disalin. Tinggal tempel di WhatsApp atau catatan.');
          showMobToast('Itinerary disalin');
        });
      }
      return;
    }
    if (e.target.closest('#m-btn-trip-xl')) {
      if (!MOB_XL_BUSY && $('m-xl-file')) $('m-xl-file').click();
      return;
    }
    if (e.target.closest('#m-btn-trip-tpl')) {
      if (MOB_XL_BUSY || typeof loadXlsx !== 'function') return;
      mobSetXlBusy(true);
      mobLoadXlsxWithTimeout().then(function (X) {
        var wb = typeof xlBuildTemplateWb === 'function' ? xlBuildTemplateWb(X) : null;
        if (!wb || typeof X.write !== 'function') throw new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet.');
        var arr = X.write(wb, { bookType: 'xlsx', type: 'array' });
        var bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
        var dlTplRes = typeof rkDownloadBlob === 'function'
          ? rkDownloadBlob('template-itinerary.xlsx', bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          : { ok: false, method: 'none' };
        mobSetXlBusy(false);
        return Promise.resolve((dlTplRes && dlTplRes.done) ? dlTplRes.done : dlTplRes).then(function (resT) {
          var okT = (!dlTplRes || dlTplRes.ok !== false) && (!resT || resT.ok !== false);
          if (!okT) {
            showMobToast(resT && resT.cancelled ? 'Pengiriman template dibatalkan.' : 'Gagal mengirim template Excel. Coba lagi.');
          } else {
            showMobToast('Template Excel siap dibagikan/disimpan (' + ((resT && resT.method) || (dlTplRes && dlTplRes.method) || 'blob') + ').');
          }
        });
      }).catch(function (err) {
        mobSetXlBusy(false);
        showMobToast((err && err.message) || 'Pustaka Excel gagal dimuat. Periksa koneksi internet.');
      });
      return;
    }
    if (e.target.closest('#m-btn-trip-edit')) {
      var trE = mobActiveTrip();
      if (!trE) return;
      MOB_STATE.tripModalMode = 'edit';
      if ($('m-kpt-title')) $('m-kpt-title').textContent = 'Ubah Perjalanan';
      if ($('m-kp-name')) $('m-kp-name').value = trE.name || '';
      mobSetDateVal('m-kp-start', trE.start || todayISO());
      mobSetDateVal('m-kp-end', trE.end || addDaysISO(todayISO(), 4));
      if ($('m-kp-use-budget')) $('m-kp-use-budget').value = trE.budget ? '1' : '0';
      setRpVal('m-kp-budget', trE.budget || 0);
      if ($('m-kp-cur')) $('m-kp-cur').value = trE.cur || '';
      if ($('m-kp-rate')) $('m-kp-rate').value = trE.rate || '';
      syncMobTripBudgetWrap();
      mobOpenSheet('m-sheet-trip');
      return;
    }
    var mitE = e.target.closest('[data-mit-edit]');
    if (mitE) {
      MOB_STATE.tripEditIt = mitE.getAttribute('data-mit-edit');
      renderMobTrip();
      var itFormEl = $('m-trip-itin-form');
      if (itFormEl && typeof itFormEl.scrollIntoView === 'function') {
        try { itFormEl.scrollIntoView({ block: 'center', behavior: (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ? 'auto' : 'smooth' }); } catch (err) {}
      }
      return;
    }
    if (e.target.closest('#m-it-cancel')) { MOB_STATE.tripEditIt = null; renderMobTrip(); return; }
    var mbkE = e.target.closest('[data-mbk-edit]');
    if (mbkE) { MOB_STATE.tripEditBk = mbkE.getAttribute('data-mbk-edit'); renderMobTrip(); return; }
    if (e.target.closest('#m-bk-cancel')) { MOB_STATE.tripEditBk = null; renderMobTrip(); return; }
    var tlist = e.target.closest('[data-mtrip-list]');
    if (tlist) { MOB_STATE.tripView = 'list'; renderMobTrip(); return; }
    var tsel = e.target.closest('[data-mtrip-sel]');
    if (tsel) { MOB_STATE.tripId = tsel.getAttribute('data-mtrip-sel'); MOB_STATE.tripView = 'detail'; MOB_STATE.tripSub = 'ring'; renderMobTrip(); initMobDragSliders(); return; }
    var tsub = e.target.closest('[data-mtripsub]');
    if (tsub) {
      MOB_STATE.tripSub = tsub.getAttribute('data-mtripsub');
      MOB_STATE.tripEditIt = null;
      MOB_STATE.tripEditBk = null;
      MOB_STATE.tripGoalEdit = false;
      renderMobTrip();
      initMobDragSliders();
      return;
    }
    var tdel = e.target.closest('[data-mtrip-del]');
    if (tdel) {
      var trId = tdel.getAttribute('data-mtrip-del');
      var trObj = ALL.kas && ALL.kas.pr ? ALL.kas.pr[trId] : null;
      askConfirm(
        'Hapus perjalanan <b>' + esc(trObj ? trObj.name : 'ini') + '</b>?',
        function () {
          var sn = snap('Sebelum hapus perjalanan');
          if (ALL.kas && ALL.kas.pr) delete ALL.kas.pr[trId];
          if (MOB_STATE.tripId === trId) MOB_STATE.tripId = '';
          MOB_STATE.tripView = 'list';
          save();
          syncUI();
          toast('Perjalanan dihapus', function () { restoreSnap(sn.t); });
        },
        'Ya, hapus'
      );
      return;
    }
    function mobTripConfirmDel(confirmMsg, snapLabel, fnMutate, toastMsg) {
      askConfirm(confirmMsg, function () {
        var sn = snap(snapLabel);
        fnMutate();
        save();
        mobPreserveScroll(function () { syncUI(); });
        toast(toastMsg, function () { mobPreserveScroll(function () { restoreSnap(sn.t); }); });
      }, 'Ya, hapus');
    }
    var itt = e.target.closest('[data-mit-toggle]');
    if (itt) { var t0 = mobActiveTrip(), it0 = t0 && t0.it.find(function (x) { return x.id === itt.getAttribute('data-mit-toggle'); }); if (it0) { it0.done = !it0.done; save(); syncUI(); } return; }
    var itd = e.target.closest('[data-mit-del]');
    if (itd) {
      var t1 = mobActiveTrip(), idIt = itd.getAttribute('data-mit-del'), xIt = t1 && t1.it.find(function (x) { return x.id === idIt; });
      if (t1 && xIt) {
        mobTripConfirmDel(
          'Hapus kegiatan <b>' + esc(xIt.place || 'ini') + '</b>?',
          'Sebelum menghapus kegiatan perjalanan',
          function () {
            t1.it = t1.it.filter(function (x) { return x.id !== idIt; });
            if (MOB_STATE.tripEditIt === idIt) MOB_STATE.tripEditIt = null;
          },
          'Kegiatan dihapus.'
        );
      }
      return;
    }
    var bkp = e.target.closest('[data-mbk-pay]');
    if (bkp) { var t2 = mobActiveTrip(), bk0 = t2 && t2.bk.find(function (x) { return x.id === bkp.getAttribute('data-mbk-pay'); }); if (bk0) { bk0.paid = !bk0.paid; save(); syncUI(); } return; }
    var bkd = e.target.closest('[data-mbk-del]');
    if (bkd) {
      var t3 = mobActiveTrip(), idBk = bkd.getAttribute('data-mbk-del'), xBk = t3 && t3.bk.find(function (x) { return x.id === idBk; });
      if (t3 && xBk) {
        mobTripConfirmDel(
          'Hapus pemesanan <b>' + esc(xBk.title || 'ini') + '</b>?',
          'Sebelum menghapus pemesanan perjalanan',
          function () {
            t3.bk = t3.bk.filter(function (x) { return x.id !== idBk; });
            if (MOB_STATE.tripEditBk === idBk) MOB_STATE.tripEditBk = null;
          },
          'Pemesanan dihapus.'
        );
      }
      return;
    }
    if (e.target.closest('#m-trip-ck-std')) {
      var trStd = mobActiveTrip();
      if (trStd && typeof CK_STD !== 'undefined') {
        CK_STD.forEach(function (txs) { if (!trStd.ck.some(function (x) { return (x.text || x.t) === txs; })) trStd.ck.push({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), text: txs, done: false }); });
        save(); syncUI(); showMobToast('Daftar standar ditambahkan');
      }
      return;
    }
    if (e.target.closest('#m-tg-edit')) { MOB_STATE.tripGoalEdit = true; renderMobTrip(); return; }
    if (e.target.closest('#m-tg-cancel')) { MOB_STATE.tripGoalEdit = false; renderMobTrip(); return; }
    var extL = e.target.closest('[data-m-ext-url]');
    if (extL) {
      e.preventDefault();
      mobOpenExternalUrl(extL.getAttribute('data-m-ext-url'));
      return;
    }
    var lkd = e.target.closest('[data-mlk-del]');
    if (lkd) {
      var t5 = mobActiveTrip(), idLk = lkd.getAttribute('data-mlk-del'), xLk = t5 && (t5.lk || []).find(function (x) { return x.id === idLk; });
      if (t5 && xLk) {
        mobTripConfirmDel(
          'Hapus tautan <b>' + esc(xLk.title || xLk.url || 'ini') + '</b>?',
          'Sebelum menghapus tautan perjalanan',
          function () { t5.lk = (t5.lk || []).filter(function (x) { return x.id !== idLk; }); },
          'Tautan dihapus.'
        );
      }
      return;
    }
    if (e.target.closest('#m-tg-del')) {
      var tgT = mobActiveTrip();
      if (tgT && tgT.goal) {
        mobTripConfirmDel(
          'Hapus target tabungan perjalanan ini?',
          'Sebelum menghapus target tabungan',
          function () {
            tgT.goal = null;
            MOB_STATE.tripGoalEdit = false;
          },
          'Target tabungan dihapus.'
        );
      }
      return;
    }
    var ckd = e.target.closest('[data-mck-del]');
    if (ckd) {
      var t4 = mobActiveTrip(), idCk = ckd.getAttribute('data-mck-del'), xCk = t4 && t4.ck.find(function (x) { return x.id === idCk; });
      if (t4 && xCk) {
        mobTripConfirmDel(
          'Hapus <b>' + esc(xCk.text || xCk.t || 'barang ini') + '</b> dari checklist?',
          'Sebelum menghapus checklist perjalanan',
          function () {
            t4.ck = t4.ck.filter(function (x) { return x.id !== idCk; });
          },
          'Barang dihapus.'
        );
      }
      return;
    }
    if (e.target.closest('#m-btn-mark-late')) {
      reminders(MOB_STATE.notifHorizon || 7).late.forEach(function (x) { S.paid[x.key] = 1; delete S.skip[x.key]; });
      save();
      syncUI();
      showMobToast('Tagihan terlambat ditandai lunas');
    }
  });

  root.addEventListener('input', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.classList && t.classList.contains('modern-slider')) mobPaintSlider(t);
    if (t.id === 'm-cf-zoom-scrub') {
      var zSvg = $('m-svg-cf-zoom'), zWrap = $('m-cf-zoom-wrap'), pct = (+t.value || 0) / 100;
      if (zSvg && typeof zSvg._rkInspectPct === 'function') zSvg._rkInspectPct(pct);
      if (zWrap && zWrap.scrollWidth > zWrap.clientWidth) {
        zWrap.scrollLeft = Math.round(pct * (zWrap.scrollWidth - zWrap.clientWidth));
      }
    } else if (t.id === 'm-cfg-saldo' || t.id === 'm-cfg-saldo-slider') {
      if ($('m-cfg-saldo-ro')) $('m-cfg-saldo-ro').textContent = rp(getRpVal('m-cfg-saldo'));
      if ($('m-cfg-saldo-slider')) mobPaintSlider($('m-cfg-saldo-slider'));
    } else if (t.id === 'm-kas-amt' || t.id === 'm-kas-slider') {
      if ($('m-kas-amt-readout')) $('m-kas-amt-readout').textContent = rp(getRpVal('m-kas-amt'));
      if ($('m-kas-slider')) mobPaintSlider($('m-kas-slider'));
    } else if (t.id === 'm-item-price' || t.id === 'm-item-price-slider') {
      if ($('m-item-price-ro')) $('m-item-price-ro').textContent = rp(getRpVal('m-item-price'));
      if ($('m-item-price-slider')) mobPaintSlider($('m-item-price-slider'));
    } else if (t.id === 'm-sim-price' || t.id === 'm-sim-slider') {
      if ($('m-sim-readout')) $('m-sim-readout').textContent = rp(getRpVal('m-sim-price'));
      if ($('m-sim-slider')) mobPaintSlider($('m-sim-slider'));
    } else if (t.id === 'm-kas-search') {
      renderMobKas();
    } else if (t.id === 'm-qp-input') {
      var res = parseQuickItem(t.value, S.year);
      if ($('m-qp-prev')) {
        $('m-qp-prev').innerHTML = !t.value.trim() ? '' : (res && !res.error
          ? '<span class="badge b-ac">' + esc(res.name) + '</span> <span class="badge b-em mono">' + rp(res.price) + '</span> <span class="badge b-nt">' + esc(every({ n: res.n || 1, unit: res.unit || 'bulan' })) + '</span> <span class="badge b-nt mono">' + fmtD(res.start) + '</span>'
          : '<span class="badge b-am">' + esc((res && res.error) || 'Format belum dikenali') + '</span>');
      }
    } else if (t.id === 'm-trip-note') {
      var tr = mobActiveTrip();
      if (tr) { tr.note = t.value; save(); }
    } else if (t.id === 'm-it-est' || t.id === 'm-bk-amt') {
      mobSyncTripEqPrev();
    }
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === 'm-kas-debt' && $('m-kas-debt-box')) {
      $('m-kas-debt-box').style.display = t.checked ? 'grid' : 'none';
    } else if (t.id === 'm-kas-flt-cat') {
      renderMobKas();
    } else if (t.id === 'm-it-cur' || t.id === 'm-bk-cur') {
      mobSyncTripEqPrev();
    } else if (t.dataset && t.dataset.msimtog != null) {
      var ix = +t.dataset.msimtog;
      if (SIM[ix]) { SIM[ix].off = !t.checked; renderMobSim(); }
    } else if (t.id === 'm-set-rmh') {
      MOB_STATE.notifHorizon = +t.value || 7;
      if (typeof remHz !== 'undefined') { remHz = MOB_STATE.notifHorizon; if (typeof saveRemPrefs === 'function') saveRemPrefs(); }
      renderMobSettings();
    } else if (t.id === 'm-set-notif-enabled' || t.id === 'm-set-notif-today' || t.id === 'm-set-notif-soon' || t.id === 'm-set-notif-late') {
      MOB_STATE.notifEnabled = !$('m-set-notif-enabled') || $('m-set-notif-enabled').checked;
      MOB_STATE.notifToday = !$('m-set-notif-today') || $('m-set-notif-today').checked;
      MOB_STATE.notifSoon = !$('m-set-notif-soon') || $('m-set-notif-soon').checked;
      MOB_STATE.notifLate = !$('m-set-notif-late') || $('m-set-notif-late').checked;
      if (t.id === 'm-set-notif-enabled') {
        if (typeof rkSetNotifReset === 'function') rkSetNotifReset(!MOB_STATE.notifEnabled);
        var curPerm = (typeof rkNotify !== 'undefined' && rkNotify.getPermission) ? rkNotify.getPermission() : (typeof Notification !== 'undefined' && Notification ? Notification.permission : 'unsupported');
        if (MOB_STATE.notifEnabled && curPerm === 'default' && typeof requestNotifPermission === 'function') {
          requestNotifPermission();
        }
      }
      renderMobSettings();
      renderMobNotifPopover();
    } else if (t.hasAttribute && t.hasAttribute('data-mck-tog')) {
      var trc = mobActiveTrip(), c0 = trc && trc.ck.find(function (x) { return x.id === t.getAttribute('data-mck-tog'); });
      if (c0) { c0.done = t.checked; save(); mobPreserveScroll(function () { syncUI(); }); }
    } else if (t.id === 'm-xl-file') {
      var fXl = t.files && t.files[0];
      try { t.value = ''; } catch (err) {}
      if (!fXl || MOB_XL_BUSY || typeof loadXlsx !== 'function' || typeof xlParse !== 'function') return;
      mobSetXlBusy(true);
      mobLoadXlsxWithTimeout().then(function (X) {
        var fr = new FileReader();
        fr.onload = function () {
          mobSetXlBusy(false);
          try {
            var dXl = xlParse(X.read(fr.result, { type: 'array', cellDates: true }));
            if (!dXl.it.length && !dXl.bk.length) {
              showMobToast('Format tidak dikenali. Unduh Template Excel lalu isi sesuai kolomnya.');
              return;
            }
            MOB_XL_DATA = dXl;
            if ($('m-xl-summary')) $('m-xl-summary').textContent = typeof xlSummaryText === 'function' ? xlSummaryText(dXl) : (dXl.it.length + ' kegiatan, ' + dXl.bk.length + ' pemesanan.');
            if ($('m-xl-name')) $('m-xl-name').value = (fXl.name || 'Perjalanan').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 30);
            if ($('m-xl-cur')) $('m-xl-cur').value = dXl.cur || (dXl.fx ? 'JPY' : '');
            if ($('m-xl-rate')) $('m-xl-rate').value = '';
            if ($('m-xl-err')) $('m-xl-err').textContent = '';
            mobOpenSheet('m-sheet-trip-xl');
          } catch (err) {
            MOB_XL_DATA = null;
            showMobToast('File tidak bisa dibaca. Coba simpan ulang sebagai .xlsx.');
          }
        };
        fr.onerror = function () {
          mobSetXlBusy(false);
          MOB_XL_DATA = null;
          showMobToast('File tidak dapat dibaca.');
        };
        fr.readAsArrayBuffer(fXl);
      }).catch(function (err) {
        mobSetXlBusy(false);
        MOB_XL_DATA = null;
        showMobToast((err && err.message) || 'Pustaka Excel gagal dimuat. Periksa koneksi internet.');
      });
    } else if (t.id === 'm-kp-use-budget') {
      syncMobTripBudgetWrap();
    } else if (t.dataset && t.dataset.mdtDay != null) {
      var trDt = mobActiveTrip(), dKey = t.dataset.mdtDay;
      if (trDt && ISO_RE.test(dKey)) {
        if (!trDt.dt || typeof trDt.dt !== 'object') trDt.dt = {};
        var dtVal = String(t.value || '').trim().slice(0, 60);
        if (dtVal) trDt.dt[dKey] = dtVal;
        else delete trDt.dt[dKey];
        save();
      }
    }
  });

  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f) return;
    if (f.id === 'm-kas-form') {
      var P = kasLinked(),
        amt = getRpVal('m-kas-amt'),
        d = $('m-kas-date') && $('m-kas-date').value || todayISO(),
        note = $('m-kas-note') && $('m-kas-note').value.trim().slice(0, 80) || '';
      if (!(amt > 0)) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-kas-amt'));
        showMobToast('Isi nominal yang valid');
        return;
      }
      var o = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), d: d, t: MOB_STATE.kasType, amt: amt, cat: MOB_STATE.kasCat, note: note };
      if ($('m-kas-debt') && $('m-kas-debt').checked && $('m-kas-debt-name') && $('m-kas-debt-name').value.trim()) {
        o.debt = true;
        o.debtName = $('m-kas-debt-name').value.trim().slice(0, 40);
        o.debtKind = $('m-kas-debt-kind') ? $('m-kas-debt-kind').value : (MOB_STATE.kasType === '-' ? 'piutang' : 'utang');
      }
      P.tx.push(o);
      if (o.t === '-' && typeof autoMatchTx === 'function') autoMatchTx(o);
      f.reset();
      mobSetDateVal('m-kas-date', todayISO());
      if ($('m-kas-amt-readout')) $('m-kas-amt-readout').textContent = 'Rp 0';
      if ($('m-kas-debt-box')) $('m-kas-debt-box').style.display = 'none';
      save();
      syncUI();
      showMobToast('Transaksi disimpan');
    } else if (f.id === 'm-item-form') {
      var nm = ($('m-item-name') && $('m-item-name').value || '').trim(),
        pr = getRpVal('m-item-price'),
        rawU = $('m-item-unit') ? $('m-item-unit').value : 'bulan',
        nVal = rawU === '28hari' ? 28 : 1,
        un = rawU === '28hari' ? 'hari' : rawU,
        st = $('m-item-start') && ISO_RE.test($('m-item-start').value) ? $('m-item-start').value : mobDefaultItemStart();
      if (!nm || !(pr > 0)) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid(!nm ? $('m-item-name') : $('m-item-price'));
        showMobToast('Lengkapi nama & nominal');
        return;
      }
      if (MOB_STATE.itemEditId) {
        var oldIt = item(MOB_STATE.itemEditId), bfOcc = oldIt ? occ(oldIt, S.year) : [];
        S.items = S.items.map(function (x) {
          if (x.id != MOB_STATE.itemEditId) return x;
          var upd = Object.assign({}, x, { name: nm, price: pr, n: nVal, unit: un, start: st, cat: MOB_STATE.itemCat || 'Tagihan rutin' });
          if (typeof remapStatus === 'function') remapStatus(x.id, bfOcc, occ(upd, S.year), [S.paid, S.skip], [S.real || {}]);
          return upd;
        });
      } else {
        S.items.push({ id: Date.now() + Math.floor(Math.random() * 1000), name: nm, price: pr, n: nVal, unit: un, start: st, end: '', cnt: 0, cat: MOB_STATE.itemCat || 'Tagihan rutin', ch: [] });
      }
      resetMobItemForm();
      save();
      syncUI();
      showMobToast(nm + ' tersimpan');
    } else if (f.id === 'm-sim-form') {
      var sk = $('m-sim-kind').value, sn = $('m-sim-title').value.trim(), sa = getRpVal('m-sim-price');
      if (!sn || !(sa > 0)) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid(!sn ? $('m-sim-title') : $('m-sim-price'));
        return;
      }
      SIM.push({ k: sk, name: sn.slice(0, 30), amt: sa, m: smEff(), rep: 'bulan', n: 12 });
      f.reset();
      renderMobSim();
      showMobToast('Skenario ditambahkan');
    } else if (f.id === 'm-trip-meta-form') {
      var tnm = $('m-kp-name').value.trim().slice(0, 30);
      if (!tnm) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-kp-name'));
        return;
      }
      var useB = $('m-kp-use-budget') && $('m-kp-use-budget').value === '1',
        cur = ($('m-kp-cur') && $('m-kp-cur').value.trim().toUpperCase()) || '',
        rtRaw = $('m-kp-rate') && $('m-kp-rate').value,
        rt = parseFloat(String(rtRaw || '').replace(',', '.')) || 0,
        stD = $('m-kp-start').value || '', enD = $('m-kp-end').value || '', budV = useB ? getRpVal('m-kp-budget') : 0;
      var metaErrM = typeof tripValidateMetaInput === 'function' ? tripValidateMetaInput(stD, enD, cur, rtRaw) : null;
      if (metaErrM) {
        if (typeof rkShakeInvalid === 'function') {
          var badM = metaErrM.field === 'end' ? ($('m-kp-end-trig') || $('m-kp-name')) : metaErrM.field === 'cur' ? $('m-kp-cur') : $('m-kp-rate');
          rkShakeInvalid(badM);
        }
        showMobToast(metaErrM.error);
        return;
      }
      if (MOB_STATE.tripModalMode === 'edit' && mobActiveTrip()) {
        Object.assign(mobActiveTrip(), { name: tnm, start: stD, end: enD, budget: budV, cur: cur, rate: cur ? rt : 0 });
      } else {
        var pid = 'p' + Date.now().toString(36);
        ALL.kas.pr[pid] = {
          id: pid, name: tnm, saldo: 0, link: false,
          start: stD, end: enD, budget: budV, cur: cur, rate: cur ? rt : 0,
          dt: {}, tx: [], it: [], bk: [], lk: [], ck: [], note: '', goal: null,
        };
        MOB_STATE.tripId = pid;
        MOB_STATE.tripView = 'detail';
        MOB_STATE.tripSub = 'ring';
      }
      mobCloseSheet('m-sheet-trip');
      save();
      syncUI();
      showMobToast(MOB_STATE.tripModalMode === 'edit' ? 'Perjalanan diperbarui' : 'Perjalanan baru dibuat');
    } else if (f.id === 'm-trip-itin-form') {
      var trI = mobActiveTrip(), pl = ($('m-it-place') && $('m-it-place').value || '').trim();
      if (!trI || !pl) { if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-it-place')); return; }
      var rawTm = ($('m-it-time') && $('m-it-time').value || '').trim(),
        rawTm2 = ($('m-it-time2') && $('m-it-time2').value || '').trim(),
        parsedTm = typeof tmParse === 'function' ? tmParse(rawTm) : rawTm.replace('.', ':'),
        parsedTm2 = typeof tmParse === 'function' ? tmParse(rawTm2) : rawTm2.replace('.', ':');
      if (parsedTm === null || parsedTm2 === null) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid(parsedTm === null ? $('m-it-time') : $('m-it-time2'));
        showMobToast('Jam memakai format 24 jam, mis. 14.00 atau 09.30.');
        return;
      }
      var rawLink = ($('m-it-link') && $('m-it-link').value || '').trim();
      var validUrl = !rawLink || (typeof okUrl === 'function' ? okUrl(rawLink) : /^https?:\/\/[^\s"'<>]+$/i.test(rawLink));
      if (!validUrl) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-it-link'));
        showMobToast('Tautan harus diawali http:// atau https://');
        return;
      }
      var rawPay = $('m-it-pay') ? $('m-it-pay').value : 'cash';
      var patchItM = {
        day: ($('m-it-day') && $('m-it-day').value) || trI.start || todayISO(),
        time: parsedTm,
        time2: parsedTm2,
        place: pl.slice(0, 120),
        cat: $('m-it-cat') ? $('m-it-cat').value : 'Transport',
        est: getRpVal('m-it-est'),
        fx: !!(trI.cur && $('m-it-cur') && $('m-it-cur').value === 'fx'),
        pay: /^(ic|on|cash)$/.test(rawPay) ? rawPay : '',
        link: rawLink.slice(0, 400),
        note: ($('m-it-note') && $('m-it-note').value || '').trim().slice(0, 200),
      };
      if (MOB_STATE.tripEditIt) {
        trI.it = trI.it.map(function (x) { return x.id === MOB_STATE.tripEditIt ? Object.assign({}, x, patchItM) : x; });
        MOB_STATE.tripEditIt = null;
      } else {
        trI.it.push(Object.assign({
          id: typeof kid === 'function' ? kid('i') : ('i' + Date.now().toString(36)),
          done: false, rec: '',
        }, patchItM));
      }
      save();
      syncUI();
      showMobToast('Kegiatan disimpan');
    } else if (f.id === 'm-trip-book-form') {
      var trB = mobActiveTrip(), bt = ($('m-bk-title') && $('m-bk-title').value || '').trim(), bAmt = getRpVal('m-bk-amt');
      if (!trB || !bt) { if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-bk-title')); return; }
      if (!(bAmt > 0)) { if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-bk-amt')); return; }
      var patchBkM = {
        title: bt.slice(0, 120),
        cat: $('m-bk-cat') ? $('m-bk-cat').value : 'Transport',
        amt: bAmt,
        fx: !!(trB.cur && $('m-bk-cur') && $('m-bk-cur').value === 'fx'),
        a: ($('m-bk-start') && $('m-bk-start').value) || '',
        b: ($('m-bk-end') && $('m-bk-end').value) || '',
      };
      var bkDtErrM = typeof tripValidateDates === 'function' ? tripValidateDates(patchBkM.a, patchBkM.b) : null;
      if (bkDtErrM) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-bk-end-trig') || $('m-bk-title'));
        showMobToast(bkDtErrM.error);
        return;
      }
      if (MOB_STATE.tripEditBk) {
        trB.bk = trB.bk.map(function (x) { return x.id === MOB_STATE.tripEditBk ? Object.assign({}, x, patchBkM) : x; });
        MOB_STATE.tripEditBk = null;
      } else {
        trB.bk.push(Object.assign({
          id: typeof kid === 'function' ? kid('b') : ('b' + Date.now().toString(36)),
          pay: 'on', link: '', paid: false, rec: '',
        }, patchBkM));
      }
      save();
      syncUI();
      showMobToast('Pemesanan disimpan');
    } else if (f.id === 'm-trip-ck-form') {
      var trC = mobActiveTrip(), txt = ($('m-ck-inp') && $('m-ck-inp').value || '').trim();
      if (!trC || !txt) { if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-ck-inp')); return; }
      trC.ck.push({ id: typeof kid === 'function' ? kid('c') : ('c' + Date.now().toString(36)), text: txt.slice(0, 60), done: false });
      f.reset();
      save();
      mobPreserveScroll(function () { syncUI(); });
      showMobToast('Checklist ditambahkan');
    } else if (f.id === 'm-trip-lk-form') {
      var trL = mobActiveTrip(),
        tl = ($('m-lk-title') && $('m-lk-title').value || '').trim(),
        ul = ($('m-lk-url') && $('m-lk-url').value || '').trim();
      if (!trL || !tl || !ul) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid(!tl ? $('m-lk-title') : $('m-lk-url'));
        return;
      }
      var normU = /^https?:\/\//i.test(ul) ? ul : 'https://' + ul;
      var validU = typeof okUrl === 'function' ? okUrl(normU) : /^https?:\/\/[^\s"'<>]+$/i.test(normU);
      if (!validU) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-lk-url'));
        showMobToast('Tautan tidak valid');
        return;
      }
      if (!Array.isArray(trL.lk)) trL.lk = [];
      trL.lk.push({ id: typeof kid === 'function' ? kid('l') : ('l' + Date.now().toString(36)), title: tl.slice(0, 80), url: normU.slice(0, 400) });
      f.reset();
      save();
      syncUI();
      showMobToast('Tautan ditambahkan');
    } else if (f.id === 'm-trip-goal-form') {
      var trG = mobActiveTrip();
      if (!trG) return;
      var tv = getRpVal('m-tg-t'),
        s0Val = getRpVal('m-tg-s0'),
        linkVal = !$('m-tg-link') || $('m-tg-link').value !== '0',
        fromVal = ($('m-tg-from') && $('m-tg-from').value) || todayISO().slice(0, 7),
        toVal = ($('m-tg-to') && $('m-tg-to').value) || (S.year + '-12'),
        gc = typeof goalCompute === 'function'
          ? goalCompute(tv, s0Val, fromVal, toVal, linkVal)
          : (function () {
              var okM = /^\d{4}-\d{2}$/.test(fromVal) && /^\d{4}-\d{2}$/.test(toVal) && toVal >= fromVal;
              var nM = okM && typeof monthList === 'function' ? monthList(fromVal, toVal).length : 0;
              return { link: linkVal, t: tv, s0: s0Val, from: fromVal, to: toVal, n: nM, per: nM && tv > s0Val ? Math.ceil((tv - s0Val) / nM / 1000) * 1000 : 0 };
            })();
      if (!(gc.t > 0)) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-tg-t'));
        showMobToast('Isi target tabungan.');
        return;
      }
      if (!gc.n) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-tg-to'));
        showMobToast('Bulan terakhir tidak boleh sebelum bulan mulai.');
        return;
      }
      if (!gc.per) {
        if (typeof rkShakeInvalid === 'function') rkShakeInvalid($('m-tg-t'));
        showMobToast('Dana yang terkumpul sudah mencapai target.');
        return;
      }
      trG.goal = { t: gc.t, s0: gc.s0, from: gc.from, to: gc.to, per: gc.per, link: gc.link };
      MOB_STATE.tripGoalEdit = false;
      save(); syncUI(); showMobToast('Target tabungan disimpan');
    } else if (f.id === 'm-trip-xl-form') {
      if (!MOB_XL_DATA || typeof xlValidateMeta !== 'function' || typeof xlBuildProfile !== 'function') return;
      var valXl = xlValidateMeta(MOB_XL_DATA, $('m-xl-name') && $('m-xl-name').value, $('m-xl-cur') && $('m-xl-cur').value, $('m-xl-rate') && $('m-xl-rate').value);
      if (valXl.error) {
        if ($('m-xl-err')) $('m-xl-err').textContent = valXl.error;
        if (typeof rkShakeInvalid === 'function') {
          var badEl = !$('m-xl-name').value.trim() ? $('m-xl-name') : (/kurs/i.test(valXl.error) ? $('m-xl-rate') : $('m-xl-cur'));
          rkShakeInvalid(badEl);
        }
        return;
      }
      var dXlOk = MOB_XL_DATA,
        builtXl = xlBuildProfile(dXlOk, valXl.name, valXl.cur, valXl.rate);
      MOB_XL_DATA = null;
      ALL.kas.pr[builtXl.id] = builtXl.profile;
      mobCloseSheet('m-sheet-trip-xl');
      save();
      if (MOB_STATE.tab !== 'trip') switchMobileTab('trip');
      MOB_STATE.tripId = builtXl.id;
      MOB_STATE.tripView = 'detail';
      MOB_STATE.tripSub = 'ring';
      MOB_STATE.tripEditIt = null;
      MOB_STATE.tripEditBk = null;
      MOB_STATE.tripGoalEdit = false;
      syncUI();
      showMobToast('Perjalanan diimpor: ' + dXlOk.it.length + ' kegiatan, ' + dXlOk.bk.length + ' pemesanan.' + (typeof tripImportOfflineNote === 'function' ? tripImportOfflineNote() : ''));
    }
  });
}
