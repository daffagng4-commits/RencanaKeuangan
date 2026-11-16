/**
 * Browser Mode Fiscal Atelier Controller (berbasis 100% struktur mockup-preview.html).
 * Menghubungkan seluruh antarmuka #browser-shell langsung ke state ALL/S,
 * kalkulasi js/core/*, modal inti (price-modal/skiprange/io/report), dan sinkronisasi Supabase.
 */
'use strict';

var BR_CAT_META = {
  Investasi: {
    hex: '#0D9488',
    grad: ['#10B981', '#0284C7'],
    svg: '<rect x="5" y="13" width="3" height="6" rx="1" fill="#FDE047"/><rect x="10.5" y="9" width="3" height="10" rx="1" fill="#FFFFFF"/><rect x="16" y="5" width="3" height="14" rx="1" fill="#A7F3D0"/><path d="M5 10l5-4 4 3 5-5" fill="none" stroke="#FDE047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'Tagihan rutin': {
    hex: '#2563EB',
    grad: ['#3B82F6', '#4F46E5'],
    svg: '<path d="M13 3L5 14h6l-1 7 9-11h-6l0-7z" fill="#FDE047" stroke="#FFFFFF" stroke-width="1.3" stroke-linejoin="round"/>',
  },
  Kesehatan: {
    hex: '#059669',
    grad: ['#10B981', '#0D9488'],
    svg: '<path d="M12 3.5l7 3v5c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5v-5l7-3z" fill="#FFFFFF" fill-opacity="0.94"/><path d="M12 8v7M8.5 11.5h7" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/>',
  },
  Hiburan: {
    hex: '#9333EA',
    grad: ['#A855F7', '#EC4899'],
    svg: '<rect x="3.5" y="6" width="17" height="12" rx="3" fill="#FFFFFF" fill-opacity="0.92"/><polygon points="10,9.5 16,12.5 10,15.5" fill="#9333EA"/><circle cx="18" cy="7" r="2.3" fill="#FACC15"/>',
  },
  'Makan & Minum': {
    hex: '#EA580C',
    grad: ['#F97316', '#EAB308'],
    svg: '<path d="M4 12h16c0 4.5-3.4 7.5-8 7.5S4 16.5 4 12z" fill="#FFFFFF"/><path d="M8 8.5c0-1.3 1-1.8 1-3M12 8.5c0-1.3 1-1.8 1-3M16 8.5c0-1.3 1-1.8 1-3" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>',
  },
  Makanan: {
    hex: '#EA580C',
    grad: ['#F97316', '#EAB308'],
    svg: '<path d="M4 12h16c0 4.5-3.4 7.5-8 7.5S4 16.5 4 12z" fill="#FFFFFF"/><path d="M8 8.5c0-1.3 1-1.8 1-3M12 8.5c0-1.3 1-1.8 1-3M16 8.5c0-1.3 1-1.8 1-3" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>',
  },
  Transportasi: {
    hex: '#0284C7',
    grad: ['#0EA5E9', '#06B6D4'],
    svg: '<rect x="6" y="4" width="12" height="13" rx="3.5" fill="#FFFFFF"/><rect x="8.5" y="6.5" width="7" height="4.5" rx="1" fill="#0284C7"/><circle cx="9" cy="14" r="1.2" fill="#F59E0B"/><circle cx="15" cy="14" r="1.2" fill="#F59E0B"/><path d="M8 17l-2 3M16 17l2 3" stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"/>',
  },
  Transport: {
    hex: '#0284C7',
    grad: ['#0EA5E9', '#06B6D4'],
    svg: '<rect x="6" y="4" width="12" height="13" rx="3.5" fill="#FFFFFF"/><rect x="8.5" y="6.5" width="7" height="4.5" rx="1" fill="#0284C7"/><circle cx="9" cy="14" r="1.2" fill="#F59E0B"/><circle cx="15" cy="14" r="1.2" fill="#F59E0B"/><path d="M8 17l-2 3M16 17l2 3" stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"/>',
  },
  Belanja: {
    hex: '#D97706',
    grad: ['#F59E0B', '#EA580C'],
    svg: '<path d="M6 8h12l-1 12H7L6 8z" fill="#FFFFFF" fill-opacity="0.95"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>',
  },
  Penginapan: {
    hex: '#4F46E5',
    grad: ['#6366F1', '#3B82F6'],
    svg: '<path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 14h18" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>',
  },
  Gaji: {
    hex: '#16A34A',
    grad: ['#16A34A', '#65A30D'],
    svg: '<rect x="3.5" y="6.5" width="17" height="11" rx="2.5" fill="#ECFDF5"/><circle cx="12" cy="12" r="2.8" fill="#16A34A"/><path d="M17 4.5l2.5-1.5M20 7.5l2 0" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>',
  },
  'Gaji & Pemasukan': {
    hex: '#16A34A',
    grad: ['#16A34A', '#65A30D'],
    svg: '<rect x="3.5" y="6.5" width="17" height="11" rx="2.5" fill="#ECFDF5"/><circle cx="12" cy="12" r="2.8" fill="#16A34A"/><path d="M17 4.5l2.5-1.5M20 7.5l2 0" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>',
  },
  Transfer: {
    hex: '#0D9488',
    grad: ['#14B8A6', '#0284C7'],
    svg: '<path d="M5 9h14M15 5l4 4-4 4M19 15H5M9 11l-4 4 4 4" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  Lainnya: {
    hex: '#64748B',
    grad: ['#64748B', '#475569'],
    svg: '<circle cx="8" cy="12" r="1.8" fill="#FFFFFF"/><circle cx="12" cy="12" r="1.8" fill="#FFFFFF"/><circle cx="16" cy="12" r="1.8" fill="#FFFFFF"/>',
  },
};

var BR_ITEM_SHADES = {
  Investasi: ['#10B981', '#0D9488', '#06B6D4'],
  'Tagihan rutin': ['#3B82F6', '#6366F1', '#0EA5E9', '#1D4ED8'],
  Hiburan: ['#A855F7', '#EC4899'],
  Kesehatan: ['#16A34A', '#22C55E'],
  Makanan: ['#F97316', '#EAB308'],
  'Makan & Minum': ['#F97316', '#EAB308'],
  Transport: ['#0EA5E9', '#2563EB'],
  Transportasi: ['#0EA5E9', '#2563EB'],
  Gaji: ['#16A34A', '#0D9488'],
};

var BR_STATE = {
  cashRange: 'm',
  pinnedCashIdx: null,
  pinnedBarIdx: null,
  bsPeriod: 'y',
  wherePeriod: 'y',
  whereMonth: null,
  whereDir: 'out',
  whereLock: null,
  whereHover: null,
  txFilter: 'all',
  kasType: '-',
  kasCat: 'Makanan',
  kasDate: '',
  kasCalYear: 0,
  kasCalMonth: null,
  kasHistDir: 'all',
  kasDateFrom: '',
  kasDateTo: '',
  kasRangeViewYear: 0,
  kasRangeViewMonth: null,
  kasRangeDraftStart: null,
  kasEditId: null,
  jadwalFilter: 'all',
  pinnedJadwalIds: {},
  itemEditId: null,
  itemCat: 'Tagihan rutin',
  quickTxType: '-',
  tripView: 'detail',
  tripSubTab: 'ring',
  tripEditItId: null,
  tripEditBkId: null,
  tripGoalEdit: false,
  tripModalMode: 'new',
  tripEditId: null,
  inlineDates: { itDay: '', bkStart: '', bkEnd: '', kpStart: '', kpEnd: '', itemDate: '' },
  inlineCalView: {},
  chipCtx: null,
  scenItemId: null,
  scenMonth: null,
  scenType: 'change_price',
};

function brGetCatMeta(cat) {
  if (BR_CAT_META[cat]) return BR_CAT_META[cat];
  var hex = typeof catColor === 'function' ? catColor(cat) : '#2563EB';
  return {
    hex: hex,
    grad: [hex, '#1E293B'],
    svg: '<circle cx="12" cy="12" r="5" fill="#FFFFFF" fill-opacity="0.92"/>',
  };
}

function brCatLogo(cat, size) {
  var sz = size || 30,
    m = brGetCatMeta(cat || 'Tagihan rutin'),
    ic = Math.round(sz * 0.72);
  return (
    '<span class="cat-logo" style="width:' + sz + 'px;height:' + sz + 'px;background:linear-gradient(135deg,' +
    m.grad[0] + ',' + m.grad[1] + ');" title="' + esc(cat || 'Lainnya') + '">' +
    '<svg width="' + ic + '" height="' + ic + '" viewBox="0 0 24 24" aria-hidden="true">' + m.svg + '</svg></span>'
  );
}

function brFmtShort(v) {
  var n = Number(v) || 0,
    a = Math.abs(n),
    s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(a % 1e9 === 0 ? 0 : 1).replace('.', ',') + 'M';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'rb';
  return String(Math.round(n));
}

function brFmtShortIndo(ds) {
  if (!ds || ds.length < 10) return '—';
  return +ds.slice(8, 10) + ' ' + MON[+ds.slice(5, 7) - 1];
}

function brFmtDateLabel(ds) {
  if (!ds || ds.length < 10) return '—';
  return new Date(ds + 'T00:00:00Z').toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function brOpenModal(id) {
  var el = $(id);
  if (!el) return;
  el.hidden = false;
  el.classList.add('open');
  if (id === 'yr-panel' && $('yr-btn')) $('yr-btn').setAttribute('aria-expanded', 'true');
}

function brCloseModal(id) {
  var el = $(id);
  if (!el) return;
  el.classList.remove('open');
  el.hidden = true;
  if (id === 'yr-panel' && $('yr-btn')) $('yr-btn').setAttribute('aria-expanded', 'false');
}

function brCubicPath(coords) {
  if (!coords || coords.length < 2) return '';
  var d = 'M ' + coords[0].x.toFixed(1) + ' ' + coords[0].y.toFixed(1);
  for (var i = 0; i < coords.length - 1; i++) {
    var p0 = coords[i],
      p1 = coords[i + 1],
      cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ' C ' + cx + ' ' + p0.y.toFixed(1) + ', ' + cx + ' ' + p1.y.toFixed(1) + ', ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
  }
  return d;
}

function brEvalCubicSeg(p0, p1, t) {
  var u = 1 - t,
    cx = (p0.x + p1.x) / 2,
    x = u * u * u * p0.x + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * p1.x,
    y = u * u * u * p0.y + 3 * u * u * t * p0.y + 3 * u * t * t * p1.y + t * t * t * p1.y,
    smooth = 3 * t * t - 2 * t * t * t,
    val = p0.val + (p1.val - p0.val) * smooth;
  return { x: x, y: y, val: val };
}

function brPositionTooltip(wrap, tip, targetX, targetY, offsetPx) {
  if (!wrap || !tip) return;
  tip.classList.add('tip-clamped', 'visible');
  var wW = wrap.clientWidth || 600,
    tipW = tip.offsetWidth || 220,
    tipH = tip.offsetHeight || 92,
    left = Math.max(8, Math.min(Math.max(8, wW - tipW - 8), targetX - tipW / 2)),
    top = targetY - tipH - (offsetPx || 14);
  if (top < 6) top = targetY + (offsetPx || 14);
  tip.style.left = left.toFixed(1) + 'px';
  tip.style.top = top.toFixed(1) + 'px';
}

/* ==========================================================================
   MODERN SELECTS (.mselect)
   ========================================================================== */
function brAllCatMosaic(size) {
  var sz = size || 20,
    ic = Math.round(sz * 0.68);
  return (
    '<span class="cat-logo" style="width:' + sz + 'px;height:' + sz +
    'px;border-radius:6px;background:linear-gradient(135deg,#3B82F6,#10B981);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">' +
    '<svg width="' + ic + '" height="' + ic + '" viewBox="0 0 24 24" fill="#fff">' +
    '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" opacity="0.9"/>' +
    '<rect x="3" y="13" width="8" height="8" rx="2" opacity="0.85"/><rect x="13" y="13" width="8" height="8" rx="2" opacity="0.7"/></svg></span>'
  );
}

function brSelectIconHtml(sel, val) {
  if (!sel || sel.dataset.catSelect !== 'true') return '';
  if (val === 'all') return brAllCatMosaic(20);
  return brCatLogo(val, 20);
}

function syncModernSelect(selOrId, forceDisplay) {
  var sel = typeof selOrId === 'string' ? $(selOrId) : selOrId;
  if (!sel || !sel._mselect) return;
  var wrap = sel._mselect;
  if (typeof forceDisplay === 'boolean') wrap.style.display = forceDisplay ? 'inline-flex' : 'none';
  var menu = wrap.querySelector('.mselect-menu'),
    valBox = wrap.querySelector('.mselect-val'),
    opts = [].slice.call(sel.options || []),
    curVal = sel.value || (opts[0] ? opts[0].value : ''),
    curOpt = opts.filter(function (o) { return o.value === curVal; })[0] || opts[0];
  valBox.innerHTML = (curOpt ? brSelectIconHtml(sel, curOpt.value) : '') +
    '<span class="mselect-val-text">' + esc(curOpt ? curOpt.textContent : '') + '</span>';
  menu.innerHTML = opts.map(function (o) {
    var active = o.value === curVal;
    return (
      '<button type="button" class="mselect-opt' + (active ? ' active' : '') + '" role="option" aria-selected="' + active + '" data-val="' + esc(o.value) + '">' +
      '<span class="mselect-opt-main">' + brSelectIconHtml(sel, o.value) + '<span>' + esc(o.textContent) + '</span></span>' +
      '<svg class="mselect-opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>'
    );
  }).join('');
  menu.querySelectorAll('.mselect-opt').forEach(function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      sel.value = btn.dataset.val;
      wrap.classList.remove('open');
      wrap.querySelector('.mselect-trigger').setAttribute('aria-expanded', 'false');
      syncModernSelect(sel);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
  });
}

function enhanceSelect(sel) {
  if (!sel || (sel.closest && !sel.closest('#browser-shell'))) return;
  if (sel.closest && sel.closest('.modal') && !sel.closest('.modal-backdrop')) return;
  if (sel._mselect) { syncModernSelect(sel); return; }
  var wrap = document.createElement('div');
  wrap.className = 'mselect';
  wrap.dataset.selectFor = sel.id || '';
  if (sel.id === 'kas-filter-cat') wrap.style.minWidth = '208px';
  else if (sel.id === 'where-month-select') wrap.style.minWidth = '122px';
  else if (sel.id === 'desk-rmh') wrap.style.minWidth = '96px';
  else wrap.style.width = '100%';
  wrap.innerHTML =
    '<button type="button" class="mselect-trigger" aria-haspopup="listbox" aria-expanded="false">' +
    '<span class="mselect-val"></span>' +
    '<svg class="mselect-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg></button>' +
    '<div class="mselect-menu" role="listbox"></div>';
  sel.style.display = 'none';
  sel.parentNode.insertBefore(wrap, sel.nextSibling);
  sel._mselect = wrap;
  var trig = wrap.querySelector('.mselect-trigger'),
    menu = wrap.querySelector('.mselect-menu');
  function resetMselectMenuStyle(mn) {
    if (!mn) return;
    mn.style.position = '';
    mn.style.top = '';
    mn.style.left = '';
    mn.style.right = '';
    mn.style.width = '';
    mn.style.minWidth = '';
    mn.style.maxWidth = '';
    mn.style.maxHeight = '';
    mn.style.zIndex = '';
  }
  trig.onclick = function (e) {
    e.stopPropagation();
    var willOpen = !wrap.classList.contains('open');
    closeAllPickersAndMenus(willOpen ? wrap : null);
    wrap.classList.toggle('open', willOpen);
    trig.setAttribute('aria-expanded', String(willOpen));
    if (!willOpen) {
      resetMselectMenuStyle(menu);
      return;
    }
    if (typeof window !== 'undefined') {
      var r = wrap.getBoundingClientRect();
      if (wrap.closest('.modal-body') && r.width) {
        var availDown = window.innerHeight - r.bottom - 14;
        var availUp = r.top - 14;
        var openUp = availDown < 170 && availUp > availDown;
        var maxFit = Math.max(140, (window.innerWidth || 360) - 24);
        var menuW = Math.min(maxFit, 260, Math.max(176, Math.round(r.width)));
        var maxH = Math.max(130, Math.min(280, openUp ? availUp : availDown));
        var leftPx = Math.max(12, Math.min(r.left, (window.innerWidth || 360) - menuW - 12));
        menu.style.position = 'fixed';
        menu.style.right = 'auto';
        menu.style.left = leftPx + 'px';
        menu.style.minWidth = '0';
        menu.style.maxWidth = menuW + 'px';
        menu.style.width = menuW + 'px';
        menu.style.maxHeight = maxH + 'px';
        menu.style.zIndex = '260';
        menu.style.top = openUp ? Math.max(12, r.top - maxH - 6) + 'px' : (r.bottom + 6) + 'px';
      } else {
        resetMselectMenuStyle(menu);
        menu.classList.toggle('align-right', r.left + 235 > window.innerWidth - 14);
      }
    }
  };
  sel.addEventListener('change', function () { syncModernSelect(sel); });
  syncModernSelect(sel);
}

function initModernSelects(root) {
  (root || $('browser-shell') || document).querySelectorAll('select').forEach(function (sel) {
    enhanceSelect(sel);
  });
}

function closeAllPickersAndMenus(exceptEl) {
  document.querySelectorAll('#browser-shell .mselect.open').forEach(function (ms) {
    if (ms !== exceptEl) {
      ms.classList.remove('open');
      var tr = ms.querySelector('.mselect-trigger');
      if (tr) tr.setAttribute('aria-expanded', 'false');
      var mn = ms.querySelector('.mselect-menu');
      if (mn) {
        mn.style.position = ''; mn.style.top = ''; mn.style.left = ''; mn.style.right = '';
        mn.style.width = ''; mn.style.minWidth = ''; mn.style.maxWidth = ''; mn.style.maxHeight = ''; mn.style.zIndex = '';
      }
    }
  });
  document.querySelectorAll('#browser-shell .picker-popover.open').forEach(function (pop) {
    if (pop !== exceptEl) {
      pop.classList.remove('open');
      var wrap = pop.closest('.custom-picker-wrap'),
        btn = wrap && wrap.querySelector('button');
      if (btn) btn.classList.remove('open');
    }
  });
}

/* ==========================================================================
   ACCOUNT / SIDEBAR BADGES / SHELL / NOTIFICATIONS
   ========================================================================== */
function brSyncAccountUI() {
  var u = typeof sbUser !== 'undefined' ? sbUser : null;
  var du = typeof rkDisplayUser === 'function'
    ? rkDisplayUser(u)
    : { loggedIn: !!u, name: u ? 'Pengguna' : 'XXX', initial: u ? 'P' : '' };
  if (typeof USER_NAME !== 'undefined') USER_NAME = du.name;
  if ($('sb-ini')) $('sb-ini').textContent = du.initial;
  if ($('sb-name')) $('sb-name').textContent = 'Halo, ' + du.name;
  var sub = $('sb-sub');
  if (sub) {
    if (u) sub.textContent = ($('tsync') && $('tsync').textContent) || '☁ Tersinkron · Cloud aktif';
    else sub.textContent = (typeof sb !== 'undefined' && sb) ? 'Klik untuk masuk Google / email' : 'Mode lokal · tersimpan';
  }
  var acctEl = $('acct'), av = acctEl && acctEl.querySelector('.av-circle');
  if (acctEl) acctEl.classList.toggle('on', !!u);
  if (av) av.classList.toggle('anon', !u);
}

function renderShell(c, R) {
  if (typeof syncSidebarBadges === 'function') syncSidebarBadges(c);
  brSyncAccountUI();
  var h = $('rk-head');
  if (!h) return;
  if (typeof mode !== 'undefined' && mode === 'trip') {
    var curT = tp();
    var sub = curT && BR_STATE.tripView === 'detail'
      ? curT.name + (curT.start && curT.end ? ' · ' + brFmtShortIndo(curT.start) + ' s/d ' + brFmtShortIndo(curT.end) + ' ' + curT.end.slice(0, 4) : ' · tanggal belum diisi')
      : 'Kelola perjalanan, anggaran, itinerary harian, pemesanan, checklist, catatan, dan target tabungan';
    h.innerHTML = '<h1 class="rk-h1">Mode Perjalanan</h1><p class="rk-sum">' + esc(sub) + '</p>';
    return;
  }
  if (typeof curTab !== 'undefined' && curTab === 'kas') {
    h.innerHTML = '<h1 class="rk-h1">Transaksi &amp; Catatan Kas</h1><p class="rk-sum">Pencatatan uang masuk/keluar, utang piutang, dan pencocokan otomatis dengan jadwal tagihan</p>';
    return;
  }
  if (typeof curTab !== 'undefined' && curTab === 'jadwal') {
    h.innerHTML = '<h1 class="rk-h1">Jadwal Tagihan ' + S.year + '</h1><p class="rk-sum">Klik chip tanggal mana saja untuk menandai lunas, lewatkan, atau ubah nominal &amp; skenario</p>';
    return;
  }
  if (typeof curTab !== 'undefined' && curTab === 'item') {
    h.innerHTML = '<h1 class="rk-h1">Kelola Item Berulang</h1><p class="rk-sum">Tambah cepat dengan bahasa alami atau atur siklus, kategori, dan batas akhir pembayaran</p>';
    return;
  }
  if (typeof curTab !== 'undefined' && curTab === 'sim') {
    h.innerHTML = '<h1 class="rk-h1">Simulasi &ldquo;Bagaimana Jika&rdquo;</h1><p class="rk-sum">Uji perubahan skenario keuangan tanpa mengubah data asli hingga Anda menekan Terapkan</p>';
    return;
  }
  if (!c) { c = calc(); R = c.rows; }
  var s = typeof ringkasLine === 'function' ? ringkasLine(c, R) : { html: '', title: '' },
    sum = '<span class="rk-date">' + longDate() + '</span>' + (s.html ? '<span class="rk-dot"> · </span><span>' + s.html + '</span>' : '');
  h.innerHTML =
    '<h1 class="rk-h1">Selamat ' + greetWord() + ', ' + esc(USER_NAME) + '</h1>' +
    '<p class="rk-sum"' + (s.title ? ' title="' + esc(s.title) + '"' : '') + '>' + sum + '</p>';
}

function renderReminders() {
  var el = $('rem');
  if (el) el.hidden = true;
  renderDesktopNotifs();
}

function renderDesktopNotifs() {
  var sel = $('desk-rmh'),
    hz = (sel ? +sel.value : (typeof remHz !== 'undefined' ? remHz : 7)) || 7,
    r = typeof reminders === 'function' ? reminders(hz) : { late: [], soon: [], older: 0 },
    today = todayISO(),
    all = (r.late || []).concat(r.soon || []);
  var dot = $('notif-dot');
  if (dot) {
    dot.textContent = String(all.length);
    dot.style.display = all.length ? 'grid' : 'none';
  }
  var list = $('desk-notif-list');
  if (list) {
    list.innerHTML = all.length ? all.map(function (row) {
      var dStr = isoD(row.t),
        diff = daysBetweenISO(dStr, today),
        lbl = diff === 0 ? '<strong>HARI INI</strong>' : diff < 0 ? '<strong>Terlewat ' + Math.abs(diff) + ' hr</strong>' : diff + ' hari lagi',
        bg = diff <= 0 ? 'var(--crimson-soft)' : 'var(--amber-soft)';
      return (
        '<div style="padding:8px 10px;border-radius:10px;background:' + bg + ';font-size:0.77rem;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div><strong>' + esc(row.it.name) + '</strong> · ' + lbl +
        '<div style="font-size:0.71rem;color:var(--text-muted);">' + fmtD(dStr) + ' · ' + rp(row.price) + '</div></div>' +
        '<div style="display:flex;gap:4px;">' +
        '<button type="button" class="btn btn-emerald btn-sm" data-dnotif-act="paid" data-dy="' + row.year + '" data-dk="' + esc(row.key) + '">Lunas</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-dnotif-act="skip" data-dy="' + row.year + '" data-dk="' + esc(row.key) + '">Lewati</button>' +
        '</div></div>'
      );
    }).join('') : '<div style="font-size:0.78rem;color:var(--text-muted);padding:10px;">Tidak ada tagihan jatuh tempo dalam ' + hz + ' hari ke depan.</div>';
  }
  var lateBtn = $('desk-mark-late-btn');
  if (lateBtn) lateBtn.style.display = (r.late && r.late.length) || r.older ? 'inline-flex' : 'none';
}

/* ==========================================================================
   TAB 1: RINCIAN TRANSAKSI (REAL CASHFLOW, BAR COMPARE, 100% JAR, TABLE, TX)
   ========================================================================== */
function brSanitizeItems() {
  if (typeof S !== 'undefined' && S && Array.isArray(S.items)) {
    S.items = S.items.filter(function (x) { return x && typeof x === 'object' && x.name; });
  }
}

function brBuildCashflowPoints(range) {
  brSanitizeItems();
  var P = kasLinked(),
    today = todayISO(),
    y = +S.year,
    sm = typeof smEff === 'function' ? smEff() : 0,
    balNow = P ? kasBal(P).bal : (+S.saldo || 0),
    F = P ? kasFlow(P) : null;
  var fromD, toD;
  if (range === 'w') {
    fromD = addDaysISO(today, -3);
    toD = addDaysISO(today, 4);
  } else if (range === 'm') {
    var curM = +today.slice(5, 7);
    var dimM = new Date(Date.UTC(y, curM, 0)).getUTCDate();
    fromD = y + '-' + pad2(curM) + '-01';
    toD = y + '-' + pad2(curM) + '-' + pad2(dimM);
  } else {
    fromD = y + '-' + pad2(sm + 1) + '-01';
    toD = y + '-12-31';
  }
  if (fromD > toD) fromD = y + '-01-01';
  if (!F || !F.allDates.length) {
    return [
      { d: fromD, lbl: brFmtShortIndo(fromD), val: balNow, delta: 0, bill: 'Saldo awal', actual: true },
      { d: today, lbl: 'Hari ini', val: balNow, delta: 0, bill: 'Kondisi kas saat ini', actual: true, today: true },
      { d: toD, lbl: brFmtShortIndo(toD), val: balNow, delta: 0, bill: 'Proyeksi akhir', actual: false },
    ];
  }
  // Delta masa depan (> hari ini) yang BELUM masuk ke dalam kasBal(P).bal
  var futNetByDate = {};
  kasRows(P).forEach(function (x) {
    if (x.d <= today) return;
    var xm = +x.d.slice(5, 7) - 1, xy = +x.d.slice(0, 4);
    if (xy === y && xm <= sm) return; // Sudah dihitung oleh kasBal(P)
    futNetByDate[x.d] = (futNetByDate[x.d] || 0) + (x.t === '+' ? x.amt : -x.amt);
  });
  var allYears = (typeof ALL !== 'undefined' && ALL.data) ? Object.keys(ALL.data) : [String(y)];
  allYears.forEach(function (yk) {
    var Y = ALL.data[yk], yy = +yk;
    if (!Y || !Y.items) return;
    Y.items.filter(Boolean).forEach(function (it) {
      occ(it, yy).forEach(function (t) {
        var d = isoD(t), k = it.id + '|' + d;
        if (d <= today || (Y.paid && (Y.paid[k] || Y.skip[k]))) return;
        futNetByDate[d] = (futNetByDate[d] || 0) - priceAt(it, t);
      });
    });
  });

  var runningPast = F.base,
    runningFut = balNow,
    balBeforeFrom = F.base,
    pts = [],
    addedToday = false;
  F.allDates.forEach(function (d) {
    var day = F.byDate[d];
    var ptVal;
    if (d < today) {
      runningPast += day.delta;
      ptVal = runningPast;
    } else if (d === today) {
      runningPast += day.delta;
      ptVal = balNow;
    } else {
      runningFut += (futNetByDate[d] || 0);
      ptVal = runningFut;
    }
    if (d < fromD) { balBeforeFrom = ptVal; return; }
    if (d > toD) return;
    var names = day.items.slice(0, 3).map(function (x) { return x.name; }).join(' + ') + (day.items.length > 3 ? ' (+' + (day.items.length - 3) + ')' : '');
    var isToday = d === today;
    if (isToday) addedToday = true;
    pts.push({
      d: d,
      lbl: isToday ? 'Hari ini' : brFmtShortIndo(d),
      val: ptVal,
      delta: day.delta,
      bill: names || 'Mutasi kas',
      actual: d <= today,
      today: isToday,
    });
  });
  if (!addedToday && fromD <= today && today <= toD) {
    pts.push({ d: today, lbl: 'Hari ini', val: balNow, delta: 0, bill: 'Saldo realtime hari ini', actual: true, today: true });
    pts.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  }
  if (!pts.length) {
    pts.push({ d: today, lbl: 'Hari ini', val: balNow, delta: 0, bill: 'Saldo realtime hari ini', actual: true, today: true });
  }
  if (range === 'w' || range === 'm') {
    if (pts[0].d > fromD && fromD !== today) {
      pts.unshift({ d: fromD, lbl: brFmtShortIndo(fromD), val: balBeforeFrom, delta: 0, bill: range === 'w' ? 'Awal minggu' : 'Awal bulan', actual: fromD <= today });
    }
    var lastPt = pts[pts.length - 1];
    if (lastPt && lastPt.d < toD && toD !== today) {
      pts.push({ d: toD, lbl: brFmtShortIndo(toD), val: lastPt.val, delta: 0, bill: range === 'w' ? 'Akhir minggu' : 'Proyeksi 30 hari', actual: toD <= today });
    }
  }
  if (pts.length === 1) {
    var endC = calc().end;
    pts.push({ d: y + '-12-31', lbl: '31 Des', val: endC, delta: endC - pts[0].val, bill: 'Proyeksi akhir tahun', actual: false });
  }
  if (pts.length > 14) {
    var sampled = [], step = Math.ceil(pts.length / 12);
    for (var i = 0; i < pts.length; i++) {
      if (i === 0 || i === pts.length - 1 || pts[i].today || pts[i].val < 0 || i % step === 0) sampled.push(pts[i]);
    }
    pts = sampled;
  }
  return pts;
}

function brRenderCashflowInto(svg, wrap, tip, range, opts) {
  if (!svg || !wrap) return;
  opts = opts || {};
  var px = opts.prefix || 'cf-';
  var gradId = px + 'dual-grad',
    glowFiltId = px + 'glow-soft',
    hitId = px + 'hit',
    chId = px + 'crosshair',
    chXId = px + 'ch-x',
    chYId = px + 'ch-y',
    chRingId = px + 'ch-ring',
    chDotId = px + 'ch-dot',
    segGlowId = px + 'seg-glow';
  var pts = brBuildCashflowPoints(range || 'y');
  var W = opts.svgW || 1060,
    H = opts.svgH || 250,
    padL = opts.padL || 68,
    padR = 26,
    padT = 22,
    padB = opts.padB || 36,
    fs = opts.fontSize || 11.5,
    dotR = opts.dotR || 4.5;
  var vals = pts.map(function (d) { return d.val; }).concat([0]),
    rawMin = Math.min.apply(null, vals),
    rawMax = Math.max.apply(null, vals),
    span = Math.max(500000, (rawMax - rawMin) * 0.16),
    minV = rawMin - span,
    maxV = rawMax + span,
    xStep = (W - padL - padR) / Math.max(1, pts.length - 1),
    yPos = function (v) { return padT + ((maxV - v) / (maxV - minV || 1)) * (H - padT - padB); },
    zeroY = yPos(0);
  var coords = pts.map(function (d, i) {
    return Object.assign({}, d, { idx: i, x: padL + i * xStep, y: yPos(d.val) });
  });
  var zeroPct = Math.max(0, Math.min(100, ((zeroY - padT) / (H - padT - padB)) * 100));
  var samples = [];
  for (var i = 0; i < coords.length - 1; i++) {
    var p0 = coords[i], p1 = coords[i + 1];
    for (var st = 0; st <= 24; st++) {
      var pt = brEvalCubicSeg(p0, p1, st / 24);
      samples.push({ x: pt.x, y: pt.y, val: pt.val, t: st / 24, p0: p0, p1: p1 });
    }
  }
  var grid = '';
  for (var g = 0; g <= 4; g++) {
    var gv = minV + ((maxV - minV) * g) / 4, gy = yPos(gv);
    grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>';
    grid += '<text x="' + (padL - 10) + '" y="' + (gy + 4) + '" text-anchor="end" fill="var(--text-muted)" font-size="' + fs + '" font-family="var(--font-mono)">' + brFmtShort(Math.round(gv)) + '</text>';
  }
  if (minV < 0 && maxV > 0) {
    grid += '<rect x="' + padL + '" y="' + zeroY + '" width="' + (W - padL - padR) + '" height="' + Math.max(0, H - padB - zeroY) + '" fill="var(--crimson)" opacity="0.08"/>';
    grid += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '" stroke="var(--crimson)" stroke-width="1.5" stroke-dasharray="6 4"/>';
    grid += '<text x="' + (W - padR - 6) + '" y="' + (zeroY - 6) + '" text-anchor="end" fill="var(--crimson)" font-size="' + fs + '" font-weight="700">Batas Defisit (Rp 0)</text>';
  }
  var fullCurve = brCubicPath(coords),
    actualCoords = coords.filter(function (c) { return c.actual; }),
    projCoords = (actualCoords.length ? [actualCoords[actualCoords.length - 1]] : []).concat(coords.filter(function (c) { return !c.actual; })),
    baseLineY = Math.min(zeroY, H - padB),
    areaD = fullCurve + ' L ' + coords[coords.length - 1].x + ' ' + baseLineY + ' L ' + coords[0].x + ' ' + baseLineY + ' Z';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML =
    '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.26"/>' +
    '<stop offset="' + zeroPct.toFixed(1) + '%" stop-color="var(--emerald)" stop-opacity="0.05"/>' +
    '<stop offset="' + zeroPct.toFixed(1) + '%" stop-color="var(--crimson)" stop-opacity="0.22"/>' +
    '<stop offset="100%" stop-color="var(--crimson)" stop-opacity="0.04"/></linearGradient>' +
    '<filter id="' + glowFiltId + '" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    grid +
    '<path d="' + areaD + '" fill="url(#' + gradId + ')"/>' +
    '<path id="' + segGlowId + '" fill="none" stroke="var(--accent)" stroke-width="6.5" stroke-linecap="round" opacity="0.34" style="display:none;pointer-events:none;"/>' +
    (actualCoords.length > 1 ? '<path d="' + brCubicPath(actualCoords) + '" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" filter="url(#' + glowFiltId + ')"/>' : '') +
    (projCoords.length > 1 ? '<path d="' + brCubicPath(projCoords) + '" fill="none" stroke="var(--emerald)" stroke-width="2.8" stroke-dasharray="7 5" stroke-linecap="round"/>' : '') +
    '<g id="' + chId + '" style="display:none;pointer-events:none;">' +
    '<line id="' + chXId + '" y1="' + padT + '" y2="' + (H - padB) + '" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="3 3"/>' +
    '<line id="' + chYId + '" x1="' + padL + '" x2="' + (W - padR) + '" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>' +
    '<circle id="' + chRingId + '" r="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>' +
    '<circle id="' + chDotId + '" r="4.5" fill="var(--accent)" stroke="var(--bg-surface)" stroke-width="2"/></g>' +
    (function () {
      var lblMap = (function () {
        var sh = {}, uX = [];
        function tk(idx) {
          if (idx < 0 || idx >= coords.length || sh[idx]) return;
          var cx = coords[idx].x;
          if (uX.some(function (ux) { return Math.abs(ux - cx) < 72; })) return;
          sh[idx] = true; uX.push(cx);
        }
        coords.forEach(function (cc, idx) { if (cc.today) { sh[idx] = true; uX.push(cc.x); } });
        tk(0);
        tk(coords.length - 1);
        var st = coords.length <= 9 ? 1 : 2;
        for (var j = 1; j < coords.length - 1; j += st) tk(j);
        return sh;
      })();
      return coords.map(function (c, i) {
        var showLbl = !!lblMap[i];
        return '<g>' + ((c.today || c.val < 0) ? '<circle class="pulse-ring" cx="' + c.x + '" cy="' + c.y + '" r="' + (dotR + 3.5) + '" fill="' + (c.val < 0 ? 'var(--crimson)' : 'var(--accent)') + '"/>' : '') +
          '<circle class="cf-node" data-nodeidx="' + c.idx + '" cx="' + c.x + '" cy="' + c.y + '" r="' + (c.val < 0 ? dotR + 1 : dotR) + '" fill="' + (c.val < 0 ? 'var(--crimson)' : c.actual ? 'var(--accent)' : 'var(--emerald)') + '" stroke="var(--bg-surface)" stroke-width="2"/>' +
          (showLbl ? '<text x="' + c.x + '" y="' + (H - 10) + '" text-anchor="middle" fill="' + (c.today ? 'var(--accent-ink)' : 'var(--text-muted)') + '" font-weight="' + (c.today ? '700' : '500') + '" font-size="' + fs + '" font-family="var(--font-mono)">' + esc(c.lbl) + '</text>' : '') +
          '</g>';
      }).join('');
    })() +
    '<rect id="' + hitId + '" x="' + (padL - 8) + '" y="0" width="' + (W - padL - padR + 16) + '" height="' + H + '" fill="transparent"/>';

  var hit = svg.querySelector('#' + hitId),
    ch = svg.querySelector('#' + chId),
    chX = svg.querySelector('#' + chXId),
    chY = svg.querySelector('#' + chYId),
    chRing = svg.querySelector('#' + chRingId),
    chDot = svg.querySelector('#' + chDotId),
    segGlow = svg.querySelector('#' + segGlowId);

  function toWrapXY(svgX, svgY) {
    var sR = svg.getBoundingClientRect(), wR = wrap.getBoundingClientRect();
    return {
      px: sR.width ? (svgX / W) * sR.width + (sR.left - wR.left) : (svgX / W) * 600,
      py: sR.height ? (svgY / H) * sR.height + (sR.top - wR.top) : (svgY / H) * 240,
    };
  }
  function hideHUD() {
    if (segGlow) segGlow.style.display = 'none';
    if (ch) ch.style.display = 'none';
    if (tip) tip.classList.remove('visible');
  }
  function showPointHUD(c) {
    if (!c) return;
    segGlow.style.display = 'none';
    ch.style.display = 'block';
    var tone = c.val < 0 ? 'var(--crimson)' : c.actual ? 'var(--accent)' : 'var(--emerald)';
    chX.setAttribute('x1', c.x); chX.setAttribute('x2', c.x); chX.setAttribute('stroke', tone);
    chY.setAttribute('y1', c.y); chY.setAttribute('y2', c.y); chY.setAttribute('stroke', tone);
    chRing.setAttribute('cx', c.x); chRing.setAttribute('cy', c.y); chRing.setAttribute('stroke', tone);
    chDot.setAttribute('cx', c.x); chDot.setAttribute('cy', c.y); chDot.setAttribute('fill', tone);
    var statusCls = c.val < 0 ? 'badge-crimson' : c.actual ? 'badge-accent' : 'badge-emerald',
      statusLbl = c.val < 0 ? 'Defisit' : c.actual ? 'Saldo Nyata' : 'Proyeksi';
    tip.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;"><strong>' + esc(fmtD(c.d)) + '</strong><span class="badge ' + statusCls + '">' + statusLbl + '</span></div>' +
      '<div class="mono pv" style="font-size:0.96rem;font-weight:800;color:' + (c.val < 0 ? 'var(--crimson)' : 'var(--text-primary)') + ';">' + rp(c.val) + '</div>' +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;">' + esc(c.bill) + '</div>' +
      (c.delta ? '<div class="mono pv" style="font-size:0.71rem;margin-top:2px;color:' + (c.delta >= 0 ? 'var(--emerald)' : 'var(--crimson)') + ';">Mutasi: ' + (c.delta >= 0 ? '+' : '-') + rp(Math.abs(c.delta)) + '</div>' : '');
    var xy = toWrapXY(c.x, c.y);
    brPositionTooltip(wrap, tip, xy.px, xy.py, 16);
  }
  function showLineHUD(s) {
    var isActualSeg = s.p0.actual && s.p1.actual,
      tone = s.val < 0 ? 'var(--crimson)' : isActualSeg ? 'var(--accent)' : 'var(--emerald)';
    segGlow.setAttribute('d', brCubicPath([s.p0, s.p1]));
    segGlow.setAttribute('stroke', tone);
    segGlow.style.display = 'block';
    ch.style.display = 'block';
    chX.setAttribute('x1', s.x); chX.setAttribute('x2', s.x); chX.setAttribute('stroke', tone);
    chY.setAttribute('y1', s.y); chY.setAttribute('y2', s.y); chY.setAttribute('stroke', tone);
    chRing.setAttribute('cx', s.x); chRing.setAttribute('cy', s.y); chRing.setAttribute('stroke', tone);
    chDot.setAttribute('cx', s.x); chDot.setAttribute('cy', s.y); chDot.setAttribute('fill', tone);
    var estVal = Math.round(s.val), segDelta = s.p1.val - s.p0.val;
    tip.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;"><strong>' + esc(s.p0.lbl) + ' → ' + esc(s.p1.lbl) + '</strong><span class="badge ' + (isActualSeg ? 'badge-accent' : 'badge-emerald') + '">Garis · ' + Math.round(s.t * 100) + '%</span></div>' +
      '<div class="mono pv" style="font-size:0.96rem;font-weight:800;color:' + (estVal < 0 ? 'var(--crimson)' : 'var(--text-primary)') + ';">' + rp(estVal) + '</div>' +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;">Menuju: ' + esc(s.p1.bill) + '</div>' +
      '<div class="mono pv" style="font-size:0.71rem;margin-top:2px;color:' + (segDelta >= 0 ? 'var(--emerald)' : 'var(--crimson)') + ';">Tren: ' + (segDelta >= 0 ? '+' : '-') + rp(Math.abs(segDelta)) + '</div>';
    var xy = toWrapXY(s.x, s.y);
    brPositionTooltip(wrap, tip, xy.px, xy.py, 16);
  }
  function inspectAtSvgX(svgX) {
    svgX = Math.max(coords[0].x, Math.min(coords[coords.length - 1].x, svgX));
    var near = coords.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, coords[0]);
    if (Math.abs(near.x - svgX) <= 14 || !samples.length) {
      showPointHUD(near);
      if (typeof opts.onScrub === 'function') opts.onScrub(near.x / W, near);
      return near;
    }
    var ns = samples.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, samples[0]);
    showLineHUD(ns);
    if (typeof opts.onScrub === 'function') opts.onScrub(ns.x / W, ns);
    return ns;
  }
  function inspectFromX(clientX) {
    var r = svg.getBoundingClientRect(),
      w = r.width || 600;
    inspectAtSvgX(((clientX - r.left) / w) * W);
  }
  svg._rkInspectPct = function (pct) {
    var p = Math.max(0, Math.min(1, Number(pct) || 0)),
      x0 = coords[0].x,
      x1 = coords[coords.length - 1].x;
    return inspectAtSvgX(x0 + p * (x1 - x0));
  };
  var getPin = opts.getPin || function () { return BR_STATE.pinnedCashIdx; };
  var setPin = opts.setPin || function (idx, pt) { BR_STATE.pinnedCashIdx = idx; renderCashInspector(pt); };
  if (hit) {
    if (opts.allowScroll) {
      svg.style.touchAction = 'pan-x pan-y';
      hit.style.touchAction = 'pan-x pan-y';
    } else {
      svg.style.touchAction = 'none';
      hit.style.touchAction = 'none';
      hit.addEventListener('pointerdown', function (e) { inspectFromX(e.clientX); });
      hit.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || e.buttons) inspectFromX(e.clientX);
      });
      hit.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches[0]) {
          if (e.cancelable) e.preventDefault();
          inspectFromX(e.touches[0].clientX);
        }
      }, { passive: false });
      hit.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) {
          if (e.cancelable) e.preventDefault();
          inspectFromX(e.touches[0].clientX);
        }
      }, { passive: false });
      hit.addEventListener('touchend', function () {
        var pi = getPin();
        if (pi === null || !coords[pi]) hideHUD();
        else showPointHUD(coords[pi]);
      });
      hit.addEventListener('touchcancel', function () { hideHUD(); });
    }
    hit.onmousemove = function (e) { inspectFromX(e.clientX); };
    hit.onmouseleave = function () {
      var pi = getPin();
      if (segGlow) segGlow.style.display = 'none';
      if (pi === null || !coords[pi]) { ch.style.display = 'none'; tip.classList.remove('visible'); }
      else showPointHUD(coords[pi]);
    };
    hit.onclick = function (e) {
      var r = svg.getBoundingClientRect(),
        svgX = ((e.clientX - r.left) / (r.width || 600)) * W,
        pt = coords.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, coords[0]);
      var nextPin = getPin() === pt.idx ? null : pt.idx;
      setPin(nextPin, nextPin !== null ? coords[nextPin] : null);
      if (nextPin !== null) showPointHUD(pt);
      else hideHUD();
    };
  }
  var curPin = getPin();
  if (curPin !== null && coords[curPin]) {
    showPointHUD(coords[curPin]);
  } else if (!opts.skipInspector) {
    renderCashInspector(null);
  }
}

function renderCashflowChart() {
  brRenderCashflowInto($('svg-cashflow'), $('cashflow-chart-wrap'), $('cashflow-tooltip'), BR_STATE.cashRange, {
    prefix: 'cf-',
    getPin: function () { return BR_STATE.pinnedCashIdx; },
    setPin: function (idx, pt) { BR_STATE.pinnedCashIdx = idx; renderCashInspector(pt); },
  });
}

function renderCashInspector(pt) {
  var box = $('cashflow-inspector');
  if (!box) return;
  if (!pt) { box.classList.remove('open'); box.innerHTML = ''; return; }
  box.classList.add('open');
  box.innerHTML =
    '<div><strong>Inspeksi ' + esc(fmtD(pt.d)) + '</strong> · Saldo: <strong class="mono pv" style="color:' + (pt.val < 0 ? 'var(--crimson)' : 'var(--emerald)') + ';">' + rp(pt.val) + '</strong> · <span style="color:var(--text-secondary);">' + esc(pt.bill) + '</span></div>' +
    '<div style="display:flex;gap:8px;">' +
    (pt.val < 0 ? '<button type="button" class="btn btn-primary btn-sm" id="cf-go-sim">Uji Solusi di Simulasi →</button>' : '') +
    '<button type="button" class="btn btn-secondary btn-sm" id="cf-unpin">Lepas Pin</button></div>';
  var gs = $('cf-go-sim');
  if (gs) gs.onclick = function () { tab('sim'); };
  var un = $('cf-unpin');
  if (un) un.onclick = function () {
    BR_STATE.pinnedCashIdx = null;
    renderCashInspector(null);
    if ($('cashflow-tooltip')) $('cashflow-tooltip').classList.remove('visible');
    if ($('cf-crosshair')) $('cf-crosshair').style.display = 'none';
    if ($('cf-seg-glow')) $('cf-seg-glow').style.display = 'none';
  };
}

function renderBarCompareChart() {
  var svg = $('svg-bar-compare'),
    wrap = $('bar-chart-wrap'),
    tip = $('bar-tooltip'),
    detail = $('bar-month-detail');
  if (!svg || !wrap) return;
  var yc = typeof yearCash === 'function' ? yearCash() : { entries: [] },
    c = calc(),
    sm = smEff(),
    incByM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    outByM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    allBars = [];
  ((yc && yc.entries) || []).forEach(function (e) {
    if (e.cat === 'Penyesuaian saldo') return;
    var mIdx = +String(e.d || '').slice(5, 7) - 1;
    if (mIdx < 0 || mIdx > 11) return;
    if (e.t === '+') incByM[mIdx] += e.amt || 0;
    else outByM[mIdx] += e.amt || 0;
  });
  for (var m = 0; m < 12; m++) {
    var row = c.rows.filter(function (r) { return r.m === m; })[0];
    allBars.push({
      m: MON[m],
      full: FULL_MON[m] + ' ' + S.year,
      inc: incByM[m] || 0,
      exp: outByM[m] || 0,
      mIdx: m,
      note: row ? 'Tagihan ' + rp(row.sp) + (outByM[m] > row.sp ? ' + Kas ' + rp(outByM[m] - row.sp) : '') : (outByM[m] ? 'Kas keluar ' + rp(outByM[m]) : 'Bulan sebelum periode aktif'),
    });
  }
  var bars = BR_STATE.bsPeriod === 'm' ? allBars.slice(sm) : allBars;
  if (!bars.length) bars = allBars;
  var W = 880, H = 250, padL = 56, padR = 20, padT = 26, padB = 34, plotH = H - padT - padB;
  var maxV = Math.max.apply(null, [1000000].concat(bars.map(function (b) { return Math.max(b.inc, b.exp); }))),
    bandW = (W - padL - padR) / bars.length,
    bw = Math.min(24, bandW * 0.34);
  var gridLines = [0, 0.25, 0.5, 0.75, 1].map(function (f) {
    var val = maxV * f, gy = padT + plotH * (1 - f);
    return '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="var(--border-subtle)" stroke-dasharray="3 3"/>' +
      '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end" fill="var(--text-muted)" font-size="10.5" font-family="var(--font-mono)">' + brFmtShort(Math.round(val)) + '</text>';
  }).join('');
  var netPts = bars.map(function (b, i) {
    var cx = padL + bandW * (i + 0.5), net = b.inc - b.exp;
    return { x: cx, y: padT + plotH * (1 - Math.max(0, net) / maxV), net: net };
  });
  svg.innerHTML =
    '<defs><linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#059669"/></linearGradient>' +
    '<linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#1D4ED8"/></linearGradient></defs>' +
    gridLines +
    '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="var(--border-strong)"/>' +
    bars.map(function (b, i) {
      var cx = padL + bandW * (i + 0.5),
        ih = b.inc ? Math.max(3, (b.inc / maxV) * plotH) : 0,
        eh = b.exp ? Math.max(3, (b.exp / maxV) * plotH) : 0,
        iy = padT + plotH - ih,
        ey = padT + plotH - eh,
        pinned = BR_STATE.pinnedBarIdx === i,
        net = b.inc - b.exp,
        topY = Math.min(ih ? iy : H - padB, eh ? ey : H - padB);
      return '<g class="bar-col' + (pinned ? ' is-pinned' : '') + '" data-bidx="' + i + '" style="cursor:pointer;" pointer-events="all">' +
        '<rect class="bar-month-bg" x="' + (cx - bandW * 0.45).toFixed(1) + '" y="6" width="' + (bandW * 0.9).toFixed(1) + '" height="' + (H - padB - 4) + '" rx="9"/>' +
        (ih ? '<rect x="' + (cx - bw - 1.5).toFixed(1) + '" y="' + iy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + ih.toFixed(1) + '" rx="5" fill="url(#gInc)"/>' : '') +
        (eh ? '<rect x="' + (cx + 1.5).toFixed(1) + '" y="' + ey.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + eh.toFixed(1) + '" rx="5" fill="url(#gExp)"/>' : '') +
        ((ih || eh) ? '<text x="' + cx.toFixed(1) + '" y="' + Math.max(15, topY - 6).toFixed(1) + '" text-anchor="middle" fill="' + (net >= 0 ? 'var(--emerald)' : 'var(--crimson)') + '" font-size="9.5" font-family="var(--font-mono)" font-weight="700">' + (net >= 0 ? '+' : '-') + brFmtShort(Math.abs(net)) + '</text>' : '') +
        '<text class="bar-month-lbl" x="' + cx.toFixed(1) + '" y="' + (H - 11) + '" text-anchor="middle" fill="var(--text-secondary)" font-size="11" font-weight="700">' + b.m + '</text></g>';
    }).join('') +
    (netPts.length > 1 ? '<path d="' + brCubicPath(netPts) + '" fill="none" stroke="var(--amber)" stroke-width="2.2" stroke-dasharray="4 3"/>' : '') +
    netPts.map(function (x) { return '<circle cx="' + x.x.toFixed(1) + '" cy="' + x.y.toFixed(1) + '" r="3.6" fill="var(--amber)" stroke="var(--bg-surface)" stroke-width="1.6"/>'; }).join('');

  function defFoot() {
    var totInc = bars.reduce(function (s, r) { return s + r.inc; }, 0),
      totExp = bars.reduce(function (s, r) { return s + r.exp; }, 0),
      diff = totInc - totExp;
    return 'Total ' + bars[0].m + '–' + bars[bars.length - 1].m + ': Masuk <strong class="mono pv" style="color:var(--emerald);">' + rp(totInc) + '</strong> · Keluar <strong class="mono pv">' + rp(totExp) + '</strong> · Selisih bersih <strong class="mono pv" style="color:' + (diff >= 0 ? 'var(--emerald)' : 'var(--crimson)') + ';">' + (diff >= 0 ? '+' : '-') + rp(Math.abs(diff)) + '</strong>';
  }
  svg.querySelectorAll('.bar-col').forEach(function (g) {
    var idx = +g.dataset.bidx, b = bars[idx], net = b.inc - b.exp, rate = b.inc > 0 ? Math.round((net / b.inc) * 100) : 0;
    function show() {
      svg.querySelectorAll('.bar-col.is-hovered').forEach(function (x) { if (x !== g) x.classList.remove('is-hovered'); });
      g.classList.add('is-hovered');
      var cx = padL + bandW * (idx + 0.5), sR = svg.getBoundingClientRect(), wR = wrap.getBoundingClientRect();
      var px = sR.width ? (cx / W) * sR.width + (sR.left - wR.left) : 200,
        py = sR.height ? ((padT + 26) / H) * sR.height + (sR.top - wR.top) : 60;
      tip.innerHTML =
        '<div style="font-weight:700;margin-bottom:4px;">' + esc(b.full) + '</div>' +
        '<div class="mono pv" style="color:var(--emerald);">Masuk: ' + rp(b.inc) + '</div>' +
        '<div class="mono pv" style="color:var(--accent-ink);">Keluar: ' + rp(b.exp) + '</div>' +
        '<div class="mono pv" style="margin-top:3px;font-weight:700;color:' + (net >= 0 ? 'var(--emerald)' : 'var(--crimson)') + ';">Selisih: ' + (net >= 0 ? '+' : '-') + rp(Math.abs(net)) + (b.inc > 0 ? ' (' + rate + '% hemat)' : '') + '</div>';
      brPositionTooltip(wrap, tip, px, py, 10);
    }
    g.onmouseenter = show;
    g.ontouchstart = show;
    g.onmouseleave = function () { g.classList.remove('is-hovered'); tip.classList.remove('visible'); };
    g.onclick = function () {
      BR_STATE.pinnedBarIdx = BR_STATE.pinnedBarIdx === idx ? null : idx;
      renderBarCompareChart();
    };
  });
  if (detail) {
    if (BR_STATE.pinnedBarIdx !== null && bars[BR_STATE.pinnedBarIdx]) {
      var pb = bars[BR_STATE.pinnedBarIdx];
      detail.innerHTML = '<span class="badge badge-accent">' + esc(pb.full) + '</span> ' + esc(pb.note) + ' · Masuk <strong class="mono pv" style="color:var(--emerald);">' + rp(pb.inc) + '</strong> · Keluar <strong class="mono pv">' + rp(pb.exp) + '</strong>';
    } else {
      detail.innerHTML = defFoot();
    }
  }
}

/* ---------- 100% Full Liquid Jar Chart + "Ke Mana Uangnya Pergi" ---------- */
function brGetItemShade(cat, idx) {
  var arr = BR_ITEM_SHADES[cat] || BR_ITEM_SHADES['Tagihan rutin'];
  return arr[idx % arr.length];
}

function renderFullWaterJarSvg(rows, grand) {
  var W = 320, H = 438, xL = 28, xR = 248, yChamberTop = 58, yTop = 82, yBot = 414,
    chamberH = yBot - yChamberTop, chH = yBot - yTop, centerX = Math.round((xL + xR) / 2);
  function waveTopSegs(yBase, amp) {
    var step = (xR - xL) / 4, d = '';
    for (var k = 0; k < 4; k++) {
      var x0 = xL + k * step, x1 = x0 + step, cx = (x0 + x1) / 2, cy = yBase + (k % 2 === 0 ? -amp : amp);
      d += ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ', ' + x1.toFixed(1) + ' ' + yBase.toFixed(1);
    }
    return d;
  }
  function waveBotRevSegs(yBase, amp) {
    if (!amp) return ' L ' + xL + ' ' + yBase.toFixed(1);
    var step = (xR - xL) / 4, d = '';
    for (var k = 3; k >= 0; k--) {
      var x0 = xL + k * step, x1 = x0 + step, cx = (x0 + x1) / 2, cy = yBase + (k % 2 === 0 ? -amp : amp);
      d += ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ', ' + x0.toFixed(1) + ' ' + yBase.toFixed(1);
    }
    return d;
  }
  var catSeen = {}, curY = yBot;
  var rawBands = rows.map(function (r, i) {
    var ci = catSeen[r.cat] || 0; catSeen[r.cat] = ci + 1;
    var color = brGetItemShade(r.cat, ci),
      pct = grand > 0 ? (r.total / grand) * 100 : 0,
      h = i === rows.length - 1 ? Math.max(4, curY - yTop) : Math.max(4.5, (pct / 100) * chH),
      y = curY - h;
    curY = y;
    return Object.assign({}, r, { pct: pct, color: color, y: y, h: h, midY: y + h / 2 });
  });
  var bands = rawBands.map(function (b, i) {
    var prev = i > 0 ? rawBands[i - 1] : null,
      topAmp = i === rawBands.length - 1 ? 9.5 : Math.min(7.2, Math.max(3.2, b.h * 0.42)),
      botY = prev ? prev.y : yBot,
      botAmp = prev ? Math.min(7.2, Math.max(3.2, prev.h * 0.42)) : 0,
      topStart = 'M ' + xL + ' ' + b.y.toFixed(1) + waveTopSegs(b.y, topAmp);
    return Object.assign({}, b, { d: topStart + ' L ' + xR + ' ' + botY.toFixed(1) + waveBotRevSegs(botY, botAmp) + ' Z', crestD: topStart });
  });
  var ticks = [100, 75, 50, 25, 0].map(function (tk) {
    var ty = yBot - (tk / 100) * chH;
    return '<line x1="' + (xR + 3) + '" y1="' + ty + '" x2="' + (xR + 12) + '" y2="' + ty + '" stroke="var(--text-muted)" stroke-width="1.3" opacity="0.8"/><text x="' + (xR + 17) + '" y="' + (ty + 4) + '" text-anchor="start" fill="var(--text-muted)" font-size="11" font-weight="600" font-family="var(--font-mono)">' + tk + '%</text>';
  }).join('');
  function scrollWave(baseY, amp, depth) {
    var wd = 'M ' + (xL - 110) + ' ' + baseY.toFixed(1);
    for (var wx = xL - 110; wx <= xR + 220; wx += 55) wd += ' q 27.5 ' + (-amp).toFixed(1) + ' 55 0 t 55 0';
    return wd + ' L ' + (xR + 220) + ' ' + (baseY + depth).toFixed(1) + ' L ' + (xL - 110) + ' ' + (baseY + depth).toFixed(1) + ' Z';
  }
  var topColor = bands.length ? bands[bands.length - 1].color : '#0F52BA';
  return (
    '<svg id="svg-jar-main" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block;width:100%;max-width:320px;height:auto;margin:0 auto;" aria-label="Jar Chart Pengeluaran">' +
    '<defs><clipPath id="clip_full_jar"><rect x="' + xL + '" y="' + yChamberTop + '" width="' + (xR - xL) + '" height="' + chamberH + '" rx="26"/></clipPath></defs>' +
    '<rect x="' + (centerX - 58) + '" y="4" width="116" height="22" rx="7" fill="var(--border-strong)"/>' +
    '<rect x="' + (centerX - 46) + '" y="24" width="92" height="18" rx="4" fill="var(--bg-subtle)" stroke="var(--border-strong)" stroke-width="1.6"/>' +
    '<path d="M ' + (centerX - 46) + ' ' + (yChamberTop - 16) + ' Q ' + xL + ' ' + (yChamberTop - 8) + ' ' + xL + ' ' + (yChamberTop + 12) + ' L ' + xR + ' ' + (yChamberTop + 12) + ' Q ' + xR + ' ' + (yChamberTop - 8) + ' ' + (centerX + 46) + ' ' + (yChamberTop - 16) + ' Z" fill="var(--bg-subtle)" stroke="var(--border-strong)" stroke-width="1.6"/>' +
    '<rect x="' + xL + '" y="' + yChamberTop + '" width="' + (xR - xL) + '" height="' + chamberH + '" rx="26" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2.4"/>' +
    '<g clip-path="url(#clip_full_jar)">' +
    (bands.length === 0 ? '<rect x="' + xL + '" y="' + yTop + '" width="' + (xR - xL) + '" height="' + chH + '" fill="var(--bg-subtle)" opacity="0.5"/>' : '') +
    (bands.length ? '<path class="jar-wave-anim-slow" d="' + scrollWave(yTop - 4, 9.5, 42) + '" fill="' + topColor + '" opacity="0.34" style="pointer-events:none;"/>' : '') +
    bands.map(function (b) {
      return '<path class="jar-band" data-item="' + esc(b.id) + '" data-cat="' + esc(b.cat) + '" data-pct="' + b.pct.toFixed(1) + '" data-amt="' + b.total + '" data-name="' + esc(b.name) + '" data-midy="' + b.midY.toFixed(1) + '" d="' + b.d + '" fill="' + b.color + '" stroke="rgba(255,255,255,0.48)" stroke-width="0.9"/>' +
        '<path d="' + b.crestD + '" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.5" style="pointer-events:none;"/>';
    }).join('') +
    (bands.length ? '<path class="jar-wave-anim" d="' + scrollWave(yTop + 2, 10, 32) + '" fill="#FFFFFF" opacity="0.28" style="pointer-events:none;"/>' : '') +
    (bands.length ? '<path class="jar-wave-anim-slow" d="' + scrollWave(yBot - chH * 0.42, 8.5, 24) + '" fill="#FFFFFF" opacity="0.14" style="pointer-events:none;"/>' : '') +
    '</g>' +
    '<rect x="' + (xL + 11) + '" y="' + (yChamberTop + 16) + '" width="13" height="' + (chamberH - 32) + '" rx="12" fill="#FFFFFF" opacity="0.26" style="pointer-events:none;"/>' +
    ticks +
    '<polygon id="jar-ptr" points="' + (xL - 12) + ',-6 ' + (xL - 2) + ',0 ' + (xL - 12) + ',6" fill="var(--accent)" style="display:none;pointer-events:none;"/>' +
    '<rect x="' + (centerX - 82) + '" y="205" width="164" height="78" rx="14" fill="var(--bg-hud)" stroke="var(--border-strong)" stroke-width="1.2" style="pointer-events:none;"/>' +
    '<text id="jar-hud-pct" x="' + centerX + '" y="237" text-anchor="middle" fill="var(--text-primary)" font-size="27" font-weight="800" font-family="var(--font-mono)" style="pointer-events:none;">' + (bands.length ? '100%' : '0%') + '</text>' +
    '<text id="jar-hud-sub" x="' + centerX + '" y="256" text-anchor="middle" fill="var(--text-secondary)" font-size="11.5" font-weight="700" style="pointer-events:none;">' + (bands.length ? 'Semua (' + bands.length + ' item)' : 'Kosong') + '</text>' +
    '<text id="jar-hud-amt" x="' + centerX + '" y="272" text-anchor="middle" fill="var(--accent-ink)" font-size="11" font-weight="700" font-family="var(--font-mono)" style="pointer-events:none;">' + esc(rp(grand)) + '</text>' +
    '</svg>'
  );
}

function brGetWhereDataset() {
  var C = typeof yearCash === 'function' ? yearCash() : { entries: [] },
    entriesAll = (C && C.entries) || [],
    p = BR_STATE.wherePeriod,
    dir = BR_STATE.whereDir,
    sel = $('where-month-select'),
    monthIdx = BR_STATE.whereMonth != null ? +BR_STATE.whereMonth : +todayISO().slice(5, 7) - 1;
  if (sel) {
    var ms = '';
    for (var m = smEff(); m < 12; m++) ms += '<option value="' + m + '"' + (m === monthIdx ? ' selected' : '') + '>' + MON[m] + ' ' + S.year + '</option>';
    if (sel.innerHTML !== ms) sel.innerHTML = ms;
    if (monthIdx < smEff()) monthIdx = smEff();
    sel.value = String(monthIdx);
    syncModernSelect(sel, p === 'm');
  }
  var from, to, label;
  if (p === 'm') {
    from = S.year + '-' + pad2(monthIdx + 1) + '-01';
    to = S.year + '-' + pad2(monthIdx + 1) + '-31';
    label = FULL_MON[monthIdx] + ' ' + S.year;
  } else {
    var cp = typeof cashPeriod === 'function' ? cashPeriod(C, p) : { from: S.year + '-01-01', to: S.year + '-12-31' };
    from = cp.from;
    to = cp.to;
    label = p === 'w' ? '7 Hari Terakhir' : 'Sepanjang ' + S.year;
  }
  if (+S.year > +todayISO().slice(0, 4)) label += ' · rencana';
  var tSign = dir === 'in' ? '+' : '-',
    filtered = entriesAll.filter(function (e) { return e.cat !== 'Penyesuaian saldo' && e.t === tSign && e.d >= from && e.d <= to; });
  var itemMap = {};
  filtered.forEach(function (e) {
    var baseRaw = (e.note || '').trim() || e.itemName || e.cat || 'Lainnya';
    var rawName = typeof normalisasiNamaItem === 'function' ? (normalisasiNamaItem(baseRaw, e.cat) || baseRaw) : baseRaw;
    var nm = String(rawName).trim(),
      cat = (e.cat || (e.it && e.it.cat) || 'Tagihan rutin').trim(),
      k = cat + '::' + nm.toLowerCase();
    if (!itemMap[k]) itemMap[k] = { id: k, name: nm, cat: cat, total: 0 };
    itemMap[k].total += e.amt || 0;
  });
  var rows = Object.keys(itemMap).map(function (k) { return itemMap[k]; }).sort(function (a, b) { return b.total - a.total; });
  return { rows: rows, label: label };
}

function brApplyWhereHighlight() {
  var target = BR_STATE.whereHover || BR_STATE.whereLock,
    resetBtn = $('btn-reset-where-cat');
  if (resetBtn) resetBtn.style.display = BR_STATE.whereLock ? 'inline-flex' : 'none';
  var bands = document.querySelectorAll('#svg-jar-main .jar-band'),
    catRows = document.querySelectorAll('#where-cat-list .simple-row'),
    itemRows = document.querySelectorAll('#top5-items-list .simple-row'),
    ptr = $('jar-ptr'), hudPct = $('jar-hud-pct'), hudSub = $('jar-hud-sub'), hudAmt = $('jar-hud-amt'),
    ds = window._brWhereDs || { rows: [], cats: [], grand: 0 }, grand = ds.grand;
  if (!hudPct) return;
  if (!target) {
    bands.forEach(function (b) { b.classList.remove('lit', 'dim'); });
    catRows.forEach(function (r) { r.classList.remove('active', 'dim'); });
    itemRows.forEach(function (r) { r.classList.remove('active', 'dim'); });
    if (ptr) ptr.style.display = 'none';
    hudPct.textContent = ds.rows.length ? '100%' : '0%';
    hudSub.textContent = ds.rows.length ? 'Semua (' + ds.rows.length + ' item)' : 'Kosong';
    hudAmt.textContent = rp(grand);
    return;
  }
  if (target.type === 'cat') {
    var catObj = ds.cats.filter(function (c) { return c.cat === target.val; })[0],
      pct = catObj && grand > 0 ? ((catObj.total / grand) * 100).toFixed(1) + '%' : '0%',
      firstMid = null;
    bands.forEach(function (b) {
      var m = b.dataset.cat === target.val;
      b.classList.toggle('lit', m); b.classList.toggle('dim', !m);
      if (m && firstMid === null) firstMid = +b.dataset.midy;
    });
    catRows.forEach(function (r) { var m = r.dataset.wcat === target.val; r.classList.toggle('active', m); r.classList.toggle('dim', !m); });
    itemRows.forEach(function (r) { var m = r.dataset.wcat === target.val; r.classList.toggle('active', m); r.classList.toggle('dim', !m); });
    if (ptr && firstMid !== null) { ptr.setAttribute('transform', 'translate(0,' + firstMid + ')'); ptr.style.display = 'block'; }
    hudPct.textContent = pct;
    hudSub.textContent = target.val.length > 18 ? target.val.slice(0, 17) + '…' : target.val;
    hudAmt.textContent = rp(catObj ? catObj.total : 0);
  } else {
    var itObj = ds.rows.filter(function (r) { return r.id === target.val; })[0],
      pctI = itObj && grand > 0 ? ((itObj.total / grand) * 100).toFixed(1) + '%' : '0%',
      midY = null;
    bands.forEach(function (b) {
      var m = b.dataset.item === target.val;
      b.classList.toggle('lit', m); b.classList.toggle('dim', !m);
      if (m) midY = +b.dataset.midy;
    });
    catRows.forEach(function (r) { var m = itObj && r.dataset.wcat === itObj.cat; r.classList.toggle('active', !!m); r.classList.toggle('dim', !m); });
    itemRows.forEach(function (r) { var m = r.dataset.witem === target.val; r.classList.toggle('active', m); r.classList.toggle('dim', !m); });
    if (ptr && midY !== null) { ptr.setAttribute('transform', 'translate(0,' + midY + ')'); ptr.style.display = 'block'; }
    var nm = itObj ? itObj.name : '';
    hudPct.textContent = pctI;
    hudSub.textContent = nm.length > 18 ? nm.slice(0, 17) + '…' : nm;
    hudAmt.textContent = rp(itObj ? itObj.total : 0);
  }
}

function renderWhereMoney() {
  var ds = brGetWhereDataset(),
    grand = ds.rows.reduce(function (s, r) { return s + r.total; }, 0),
    catMap = {};
  ds.rows.forEach(function (r) {
    if (!catMap[r.cat]) catMap[r.cat] = { cat: r.cat, total: 0 };
    catMap[r.cat].total += r.total;
  });
  var cats = Object.keys(catMap).map(function (k) { return catMap[k]; }).sort(function (a, b) { return b.total - a.total; });
  window._brWhereDs = { rows: ds.rows, cats: cats, grand: grand };
  if ($('top5-total-badge')) $('top5-total-badge').textContent = rp(grand);
  if ($('where-sub-lbl')) $('where-sub-lbl').textContent = 'Total ' + (BR_STATE.whereDir === 'out' ? 'keluar' : 'masuk') + ' ' + rp(grand) + ' · ' + ds.label;
  var jarStage = $('jar-main-stage');
  if (jarStage) {
    jarStage.innerHTML = renderFullWaterJarSvg(ds.rows, grand);
    jarStage.querySelectorAll('.jar-band').forEach(function (b) {
      b.onmouseenter = function () { BR_STATE.whereHover = { type: 'item', val: b.dataset.item }; brApplyWhereHighlight(); };
      b.onmouseleave = function () { BR_STATE.whereHover = null; brApplyWhereHighlight(); };
      b.onclick = function () {
        BR_STATE.whereLock = (BR_STATE.whereLock && BR_STATE.whereLock.type === 'item' && BR_STATE.whereLock.val === b.dataset.item) ? null : { type: 'item', val: b.dataset.item };
        brApplyWhereHighlight();
      };
    });
  }
  var catEl = $('where-cat-list');
  if (catEl) {
    catEl.innerHTML = cats.length ? cats.map(function (c) {
      var pct = grand > 0 ? (c.total / grand) * 100 : 0, hex = brGetCatMeta(c.cat).hex;
      return '<div class="simple-row" data-wcat="' + esc(c.cat) + '">' + brCatLogo(c.cat, 24) +
        '<span class="simple-row-name">' + esc(c.cat) + '</span>' +
        '<span class="simple-row-bar"><i style="width:' + pct.toFixed(1) + '%;background:' + hex + ';"></i></span>' +
        '<span class="simple-row-pct">' + pct.toFixed(1) + '%</span>' +
        '<span class="simple-row-amt pv">' + rp(c.total) + '</span></div>';
    }).join('') : '<div style="padding:14px;color:var(--text-muted);font-size:0.8rem;">Belum ada kategori pada periode ini.</div>';
    catEl.querySelectorAll('.simple-row').forEach(function (row) {
      row.onmouseenter = function () { BR_STATE.whereHover = { type: 'cat', val: row.dataset.wcat }; brApplyWhereHighlight(); };
      row.onmouseleave = function () { BR_STATE.whereHover = null; brApplyWhereHighlight(); };
      row.onclick = function () {
        BR_STATE.whereLock = (BR_STATE.whereLock && BR_STATE.whereLock.type === 'cat' && BR_STATE.whereLock.val === row.dataset.wcat) ? null : { type: 'cat', val: row.dataset.wcat };
        brApplyWhereHighlight();
      };
    });
  }
  var itemsEl = $('top5-items-list');
  if (itemsEl) {
    var seen = {};
    itemsEl.innerHTML = ds.rows.length ? ds.rows.slice(0, 8).map(function (r, idx) {
      var ci = seen[r.cat] || 0; seen[r.cat] = ci + 1;
      var pct = grand > 0 ? (r.total / grand) * 100 : 0, hex = brGetItemShade(r.cat, ci);
      return '<div class="simple-row" data-witem="' + esc(r.id) + '" data-wcat="' + esc(r.cat) + '">' +
        '<span class="simple-row-rank">' + (idx + 1) + '</span>' + brCatLogo(r.cat, 24) +
        '<span class="simple-row-name" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
        '<span class="simple-row-bar"><i style="width:' + Math.max(3, pct).toFixed(1) + '%;background:' + hex + ';"></i></span>' +
        '<span class="simple-row-pct">' + pct.toFixed(1) + '%</span>' +
        '<span class="simple-row-amt pv">' + rp(r.total) + '</span></div>';
    }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Belum ada data pada periode ini.</div>';
    itemsEl.querySelectorAll('.simple-row').forEach(function (row) {
      row.onmouseenter = function () { BR_STATE.whereHover = { type: 'item', val: row.dataset.witem }; brApplyWhereHighlight(); };
      row.onmouseleave = function () { BR_STATE.whereHover = null; brApplyWhereHighlight(); };
      row.onclick = function () {
        BR_STATE.whereLock = (BR_STATE.whereLock && BR_STATE.whereLock.type === 'item' && BR_STATE.whereLock.val === row.dataset.witem) ? null : { type: 'item', val: row.dataset.witem };
        brApplyWhereHighlight();
      };
    });
  }
  brApplyWhereHighlight();
}

function renderRincianCharts() {
  renderCashflowChart();
  renderBarCompareChart();
  renderWhereMoney();
}

function renderRincian() {
  var c = calc(), P = kasLinked(), KB = P ? kasBal(P) : { bal: +S.saldo || 0 },
    rw = P ? kasRunway(P, KB.bal) : null, today = todayISO(), balNow = P ? KB.bal : (+S.saldo || 0),
    negDate = P && typeof kasFirstNegative === 'function' ? kasFirstNegative(P) : null;
  document.querySelectorAll('#browser-shell .lbl-year').forEach(function (el) { el.textContent = S.year; });
  if ($('rincian-saldo-now')) $('rincian-saldo-now').textContent = rp(balNow);

  if ($('metric-end-lbl')) $('metric-end-lbl').textContent = 'Sisa saldo akhir Des ' + S.year;
  if ($('metric-end-bal')) {
    $('metric-end-bal').textContent = rp(c.end);
    $('metric-end-bal').style.color = c.end < 0 ? 'var(--crimson)' : 'var(--emerald)';
  }
  if ($('metric-end-hint')) {
    $('metric-end-hint').textContent = negDate ? 'Defisit mulai ' + fmtD(negDate.date) : (c.end < 0 ? 'Proyeksi saldo minus' : 'Aman hingga akhir tahun');
  }

  var safeDaily = 0, dailySub = 'Jatah jajan';
  if (rw && rw.status === 'warning' && rw.days > 0) {
    safeDaily = Math.max(0, Math.round(balNow / rw.days));
    dailySub = 's/d ' + fmtD(rw.date);
  } else {
    var yrEnd = S.year + '-12-31', dLeft = Math.max(1, daysBetweenISO(yrEnd, today) + 1);
    safeDaily = Math.max(0, Math.round(Math.max(0, c.end) / dLeft));
    dailySub = 's/d 31 Des ' + S.year;
  }
  if ($('metric-daily-lbl')) $('metric-daily-lbl').textContent = 'Jatah jajan harian (' + dailySub + ')';
  if ($('metric-daily-val')) $('metric-daily-val').textContent = rp(safeDaily) + ' / hr';
  if ($('metric-daily-hint')) $('metric-daily-hint').textContent = 'Atau ' + rp(safeDaily * 30) + ' / bln';

  var actM = Math.max(1, 12 - smEff());
  if ($('metric-avg-bill')) $('metric-avg-bill').textContent = rp(Math.round(c.total / actM)) + ' / bln';
  if ($('metric-total-year')) $('metric-total-year').textContent = rp(c.total);

  var paidCnt = 0, totalCnt = 0, paidAmt = 0, upcoming = [];
  S.items.forEach(function (it) {
    (c.occs[it.id] || occ(it, +S.year)).forEach(function (t) {
      var ds = isoD(t), k = it.id + '|' + ds;
      if (S.skip[k]) return;
      totalCnt++;
      var pr = priceAt(it, t);
      if (S.paid[k]) { paidCnt++; paidAmt += pr; }
      else {
        upcoming.push({ item: it, ds: ds, price: pr, key: k, daysDiff: daysBetweenISO(ds, today), risk: negDate && negDate.date === ds });
      }
    });
  });
  if ($('rincian-bills-ratio')) $('rincian-bills-ratio').textContent = paidCnt + ' / ' + totalCnt + ' tagihan';
  if ($('rincian-paid-sum')) $('rincian-paid-sum').textContent = rp(paidAmt);

  upcoming.sort(function (a, b) { return a.ds < b.ds ? -1 : a.ds > b.ds ? 1 : 0; });
  var upBox = $('upcoming-bills-list');
  if (upBox) {
    upBox.innerHTML = upcoming.length ? upcoming.slice(0, 5).map(function (u) {
      var cntTxt = u.daysDiff < 0 ? 'Terlambat ' + Math.abs(u.daysDiff) + ' hr' : u.daysDiff === 0 ? 'Hari ini' : u.daysDiff + ' hari lagi';
      return (
        '<div class="upcoming-item"><div class="upcoming-left">' + brCatLogo(u.item.cat || 'Tagihan rutin', 34) +
        '<div style="min-width:0;"><div class="upcoming-name">' + esc(u.item.name) + '</div>' +
        '<div class="upcoming-meta"><span>' + fmtD(u.ds) + '</span>' +
        (u.risk ? '<span class="badge badge-crimson">Membuat saldo minus</span>' : '<span class="badge ' + (u.daysDiff <= 0 ? 'badge-crimson' : 'badge-neutral') + '">' + cntTxt + '</span>') +
        '</div></div></div><div class="upcoming-right"><span class="mono pv" style="font-weight:700;font-size:0.86rem;">' + rp(u.price) + '</span>' +
        '<button type="button" class="btn btn-emerald btn-sm" data-br-paid="' + esc(u.key) + '">Lunas</button></div></div>'
      );
    }).join('') : '<div style="padding:18px;text-align:center;color:var(--emerald);font-weight:600;">Semua tagihan sudah lunas!</div>';
  }

  var flowTb = $('monthly-flow-tbody');
  if (flowTb) {
    flowTb.innerHTML = c.rows.map(function (r) {
      var bills = [];
      S.items.forEach(function (it) {
        (c.occs[it.id] || []).forEach(function (t) {
          var dt = new Date(t);
          if (dt.getUTCMonth() === r.m) {
            var ds = isoD(t), k = it.id + '|' + ds;
            bills.push({ day: dt.getUTCDate(), name: it.name, amt: priceAt(it, t), paid: !!S.paid[k], skip: !!S.skip[k], late: !S.paid[k] && !S.skip[k] && ds < today });
          }
        });
      });
      var mPaid = bills.reduce(function (s, b) { return s + (b.paid && !b.skip ? b.amt : 0); }, 0);
      return (
        '<tr class="flow-row-clickable" data-flow-m="' + r.m + '"><td><strong>' + MON[r.m] + ' ' + S.year + '</strong> ▾</td>' +
        '<td class="mono">' + bills.length + ' item</td>' +
        '<td class="mono pv" style="text-align:right;color:var(--emerald);">' + rp(mPaid) + '</td>' +
        '<td class="mono pv" style="text-align:right;font-weight:700;">' + rp(r.sp) + '</td></tr>' +
        '<tr class="flow-drawer" id="flow-drawer-' + r.m + '" style="display:none;"><td colspan="4" style="padding:10px 14px;"><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        (bills.length ? bills.map(function (b) {
          var bCls = b.paid ? 'badge-emerald' : b.skip ? 'badge-neutral' : b.late ? 'badge-crimson' : 'badge-amber';
          return '<span class="badge ' + bCls + '">' + b.day + ' ' + MON[r.m] + ' · ' + esc(b.name) + ' (<span class="pv">' + rp(b.amt) + '</span>)</span>';
        }).join('') : '<span class="sub">Tidak ada tagihan</span>') + '</div></td></tr>'
      );
    }).join('');
  }

  var txGroupsEl = $('recent-tx-groups');
  if (txGroupsEl) {
    var rows = P ? kasRows(P).slice().sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }) : [];
    if (BR_STATE.txFilter !== 'all') rows = rows.filter(function (x) { return x.t === BR_STATE.txFilter; });
    var grpMap = {}, grpOrder = [];
    rows.slice(0, 12).forEach(function (x) {
      if (!grpMap[x.d]) { grpMap[x.d] = []; grpOrder.push(x.d); }
      grpMap[x.d].push(x);
    });
    txGroupsEl.innerHTML = grpOrder.length ? grpOrder.slice(0, 4).map(function (d) {
      var list = grpMap[d], net = list.reduce(function (a, x) { return a + (x.t === '+' ? x.amt : -x.amt); }, 0);
      return '<div class="tx-day-group"><div class="tx-day-head"><span>' + brFmtDateLabel(d) + '</span><span class="mono pv" style="color:' + (net >= 0 ? 'var(--emerald)' : 'var(--crimson)') + ';">' + (net >= 0 ? '+' : '-') + rp(Math.abs(net)) + '</span></div>' +
        list.map(function (x) {
          return '<div class="tx-item"><div style="display:flex;align-items:center;gap:10px;">' + brCatLogo(x.cat || 'Lainnya', 28) +
            '<div><div style="font-weight:600;font-size:0.84rem;">' + esc(x.note || x.cat || 'Transaksi') + '</div><div style="font-size:0.72rem;color:var(--text-muted);">' + esc(x.cat || 'Lainnya') + '</div></div></div>' +
            '<span class="mono pv" style="font-weight:700;color:' + (x.t === '+' ? 'var(--emerald)' : 'var(--text-primary)') + ';">' + (x.t === '+' ? '+' : '-') + rp(x.amt) + '</span></div>';
        }).join('') + '</div>';
    }).join('') : '<div style="padding:18px;text-align:center;color:var(--text-muted);">Belum ada transaksi kas.</div>';
  }

  renderRincianCharts();
}

/* ==========================================================================
   TAB 2: TRANSAKSI / CATATAN KAS (REAL kasLinked() + autoMatchTx() + DEBT)
   ========================================================================== */
function brRenderCatPills(containerId, list, curCat, attr) {
  var el = $(containerId);
  if (!el) return;
  el.innerHTML = list.map(function (cat) {
    return '<button type="button" class="cat-pill-opt' + (curCat === cat ? ' selected' : '') + '" ' + attr + '="' + esc(cat) + '">' + brCatLogo(cat, 22) + '<span>' + esc(cat) + '</span></button>';
  }).join('');
}

function brDrawKasCal() {
  var pop = $('kas-cal-popover');
  if (!pop) return;
  var today = todayISO(), y = BR_STATE.kasCalYear || +today.slice(0, 4), m = BR_STATE.kasCalMonth != null ? BR_STATE.kasCalMonth : +today.slice(5, 7) - 1;
  var cur = BR_STATE.kasDate || today, firstDay = new Date(Date.UTC(y, m, 1)).getUTCDay(), dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), cells = '';
  for (var i = 0; i < firstDay; i++) cells += '<span></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = y + '-' + pad2(m + 1) + '-' + pad2(d);
    cells += '<button type="button" class="cal-day' + (ds === cur ? ' selected' : '') + (ds === today ? ' today' : '') + '" data-kcal-d="' + ds + '">' + d + '</button>';
  }
  pop.innerHTML =
    '<div class="cal-head"><button type="button" class="btn btn-secondary btn-sm" data-kcal-mv="-1">‹</button><strong style="font-size:0.84rem;">' + FULL_MON[m] + ' ' + y + '</strong><button type="button" class="btn btn-secondary btn-sm" data-kcal-mv="1">›</button></div>' +
    '<div class="cal-grid"><span class="cal-dow">Min</span><span class="cal-dow">Sen</span><span class="cal-dow">Sel</span><span class="cal-dow">Rab</span><span class="cal-dow">Kam</span><span class="cal-dow">Jum</span><span class="cal-dow">Sab</span>' + cells + '</div>' +
    '<div class="cal-presets"><button type="button" class="cal-preset-pill" data-kcal-d="' + today + '">Hari Ini</button><button type="button" class="cal-preset-pill" data-kcal-d="' + addDaysISO(today, -1) + '">Kemarin</button><button type="button" class="cal-preset-pill" data-kcal-d="' + today.slice(0, 8) + '01">Awal Bulan</button></div>';
}

function brDrawKasRangeCal() {
  var pop = $('kas-range-popover');
  if (!pop) return;
  var today = todayISO(), y = BR_STATE.kasRangeViewYear || +today.slice(0, 4), m = BR_STATE.kasRangeViewMonth != null ? BR_STATE.kasRangeViewMonth : +today.slice(5, 7) - 1;
  var firstDay = new Date(Date.UTC(y, m, 1)).getUTCDay(), dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  var sStart = BR_STATE.kasRangeDraftStart || BR_STATE.kasDateFrom || '', sEnd = BR_STATE.kasRangeDraftStart || BR_STATE.kasDateTo || '';
  var lo = sStart && sEnd ? (sStart <= sEnd ? sStart : sEnd) : '', hi = sStart && sEnd ? (sStart <= sEnd ? sEnd : sStart) : '', cells = '';
  for (var i = 0; i < firstDay; i++) cells += '<span></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = y + '-' + pad2(m + 1) + '-' + pad2(d), edge = ds === lo || ds === hi, inR = lo && hi && !edge && ds > lo && ds < hi;
    cells += '<button type="button" class="cal-day' + (ds === today ? ' today' : '') + (edge ? ' range-edge' : inR ? ' in-range' : '') + '" data-krng-d="' + ds + '">' + d + '</button>';
  }
  pop.innerHTML =
    '<div class="cal-presets-row"><button type="button" class="cal-preset-pill" data-preset-pop="all">Semua</button><button type="button" class="cal-preset-pill" data-preset-pop="month">Bulan ini</button><button type="button" class="cal-preset-pill" data-preset-pop="7d">7 Hari</button></div>' +
    '<div class="cal-head"><button type="button" class="btn btn-secondary btn-sm" data-krng-mv="-1">‹</button><strong style="font-size:0.84rem;">' + FULL_MON[m] + ' ' + y + '</strong><button type="button" class="btn btn-secondary btn-sm" data-krng-mv="1">›</button></div>' +
    '<div class="cal-grid"><span class="cal-dow">Min</span><span class="cal-dow">Sen</span><span class="cal-dow">Sel</span><span class="cal-dow">Rab</span><span class="cal-dow">Kam</span><span class="cal-dow">Jum</span><span class="cal-dow">Sab</span>' + cells + '</div>' +
    '<div class="cal-range-footer"><span>' + (BR_STATE.kasRangeDraftStart ? 'Mulai <strong>' + brFmtShortIndo(BR_STATE.kasRangeDraftStart) + '</strong> · pilih akhir' : (BR_STATE.kasDateFrom ? brFmtShortIndo(BR_STATE.kasDateFrom) + ' – ' + brFmtShortIndo(BR_STATE.kasDateTo) : 'Semua tanggal')) + '</span><button type="button" class="btn btn-primary btn-sm" data-krng-done="1">Selesai</button></div>';
}

function renderKas() {
  var P = kasLinked();
  if (!P) return;
  var KB = kasBal(P), today = todayISO();
  if (!BR_STATE.kasDate) BR_STATE.kasDate = today;
  if ($('kas-saldo-val')) $('kas-saldo-val').textContent = rp(KB.bal);
  if ($('kas-in-val')) $('kas-in-val').textContent = '+' + rp(KB.A.i);
  if ($('kas-out-val')) $('kas-out-val').textContent = '-' + rp(KB.A.o);
  if ($('kas-date-display')) $('kas-date-display').textContent = fmtD(BR_STATE.kasDate);

  var cats = BR_STATE.kasType === '+' ? KAS_IN : KAS_OUT;
  if (cats.indexOf(BR_STATE.kasCat) < 0) BR_STATE.kasCat = cats[0];
  brRenderCatPills('kas-cat-pills', cats, BR_STATE.kasCat, 'data-kcat-opt');

  var debtSel = $('kas-debt-kind');
  if (debtSel) {
    debtSel.innerHTML = debtKinds(BR_STATE.kasType).map(function (kv) { return '<option value="' + kv[0] + '">' + kv[1] + '</option>'; }).join('');
    syncModernSelect(debtSel);
  }

  var dMap = typeof debtStatusMap === 'function' ? debtStatusMap(P) : {},
    debts = Object.keys(dMap).map(function (k) { return dMap[k]; }).filter(function (x) { return x.sisaU > 0 || x.sisaP > 0; }),
    debtListEl = $('debt-list');
  if (debtListEl) {
    debtListEl.innerHTML = debts.length ? debts.map(function (x) {
      var rows = '';
      if (x.sisaU > 0) {
        var subU = x.bayarU > 0 ? 'Sisa dari ' + rp(x.utang) + ' (tercicil ' + rp(x.bayarU) + ')' : 'Sisa tagihan personal';
        rows += '<div class="upcoming-item"><div style="display:flex;align-items:center;gap:10px;min-width:0;">' + brCatLogo('Tagihan rutin', 30) + '<div style="min-width:0;"><div class="upcoming-name">' + esc(x.name) + ' · <span class="badge badge-crimson">Saya berutang</span></div><div class="upcoming-meta">' + subU + '</div></div></div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><strong class="mono pv">' + rp(x.sisaU) + '</strong><button type="button" class="btn btn-secondary btn-sm" data-debt-cicil="' + esc(x.name) + '" data-dk="bayar-utang" data-damt="' + x.sisaU + '">Cicil</button><button type="button" class="btn btn-emerald btn-sm" data-debt-pay="' + esc(x.name) + '" data-dk="bayar-utang" data-damt="' + x.sisaU + '">Lunas</button></div></div>';
      }
      if (x.sisaP > 0) {
        var subP = x.bayarP > 0 ? 'Sisa dari ' + rp(x.piutang) + ' (tercicil ' + rp(x.bayarP) + ')' : 'Piutang aktif';
        rows += '<div class="upcoming-item"><div style="display:flex;align-items:center;gap:10px;min-width:0;">' + brCatLogo('Gaji', 30) + '<div style="min-width:0;"><div class="upcoming-name">' + esc(x.name) + ' · <span class="badge badge-emerald">Orang berutang</span></div><div class="upcoming-meta">' + subP + '</div></div></div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><strong class="mono pv">' + rp(x.sisaP) + '</strong><button type="button" class="btn btn-secondary btn-sm" data-debt-cicil="' + esc(x.name) + '" data-dk="bayar-piutang" data-damt="' + x.sisaP + '">Cicil</button><button type="button" class="btn btn-emerald btn-sm" data-debt-pay="' + esc(x.name) + '" data-dk="bayar-piutang" data-damt="' + x.sisaP + '">Lunas</button></div></div>';
      }
      return rows;
    }).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);">Tidak ada utang/piutang aktif.</div>';
  }

  var fCatEl = $('kas-filter-cat'), allTx = kasRows(P).slice().sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
  if (fCatEl) {
    var catSet = {};
    KAS_OUT.concat(KAS_IN).concat(allTx.map(function (t) { return t.cat || 'Lainnya'; })).forEach(function (c) { catSet[c] = 1; });
    var curF = fCatEl.value || 'all', optsH = '<option value="all">Semua Kategori</option>' + Object.keys(catSet).map(function (c) { return '<option value="' + esc(c) + '"' + (curF === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    if (fCatEl.innerHTML !== optsH) { fCatEl.innerHTML = optsH; fCatEl.value = curF; syncModernSelect(fCatEl); }
  }
  if ($('kas-range-display') && $('kas-range-days')) {
    if (BR_STATE.kasDateFrom && BR_STATE.kasDateTo) {
      $('kas-range-display').textContent = brFmtShortIndo(BR_STATE.kasDateFrom) + ' – ' + brFmtShortIndo(BR_STATE.kasDateTo) + ' ' + BR_STATE.kasDateTo.slice(0, 4);
      var dd = Math.max(1, daysBetweenISO(BR_STATE.kasDateTo, BR_STATE.kasDateFrom) + 1);
      $('kas-range-days').textContent = dd + ' hr';
    } else {
      $('kas-range-display').textContent = 'Semua tanggal';
      $('kas-range-days').textContent = 'Semua';
    }
  }
  var q = ($('kas-search') && $('kas-search').value || '').trim().toLowerCase(),
    cf = fCatEl ? fCatEl.value : 'all',
    filtered = allTx.filter(function (t) {
      if (BR_STATE.kasHistDir !== 'all' && t.t !== BR_STATE.kasHistDir) return false;
      if (cf !== 'all' && (t.cat || 'Lainnya') !== cf) return false;
      if (BR_STATE.kasDateFrom && t.d < BR_STATE.kasDateFrom) return false;
      if (BR_STATE.kasDateTo && t.d > BR_STATE.kasDateTo) return false;
      if (q && !(t.note || '').toLowerCase().includes(q) && !(t.cat || '').toLowerCase().includes(q)) return false;
      return true;
    });
  var sumF = kasSum(filtered);
  if ($('kas-hist-summary')) {
    $('kas-hist-summary').innerHTML = 'Menampilkan <strong class="mono">' + filtered.length + '</strong> dari ' + allTx.length + ' transaksi · Masuk <strong class="mono pv" style="color:var(--emerald);">+' + rp(sumF.i) + '</strong> · Keluar <strong class="mono pv" style="color:var(--crimson);">-' + rp(sumF.o) + '</strong>';
  }
  var histEl = $('kas-history-list');
  if (histEl) {
    histEl.innerHTML = filtered.length ? filtered.map(function (t) {
      var chip = typeof lkChip === 'function' ? lkChip(t) : '';
      var dBadge = '';
      if (t.debt && !t.debtDone && t.debtKind) {
        var dn = typeof debtNameOf === 'function' ? debtNameOf(t) : (t.debtName || t.note || '');
        var ds = dMap[dn];
        if (ds) {
          var isU = t.debtKind === 'utang' || t.debtKind === 'bayar-utang';
          var sisa = isU ? ds.sisaU : ds.sisaP;
          var isPay = t.debtKind === 'bayar-utang' || t.debtKind === 'bayar-piutang';
          dBadge = sisa > 0
            ? ' <span class="badge ' + (isU ? 'badge-crimson' : 'badge-accent') + ' mono pv">' + (isPay ? 'Cicil · ' : '') + 'Sisa ' + rp(sisa) + '</span>'
            : ' <span class="badge badge-emerald">Lunas ✓</span>';
        }
      }
      return '<div class="upcoming-item"><div style="display:flex;align-items:center;gap:10px;min-width:0;">' + brCatLogo(t.cat || 'Lainnya', 30) +
        '<div style="min-width:0;"><div class="upcoming-name">' + esc(t.note || t.cat || 'Transaksi') + '</div>' +
        '<div class="upcoming-meta">' + brFmtDateLabel(t.d) + ' · <span class="badge badge-neutral">' + esc(t.cat || 'Lainnya') + '</span>' + dBadge + chip + '</div></div></div>' +
        '<div class="upcoming-right"><span class="mono pv" style="font-weight:700;color:' + (t.t === '+' ? 'var(--emerald)' : 'var(--crimson)') + ';">' + (t.t === '+' ? '+' : '-') + rp(t.amt) + '</span>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-kedit="' + esc(t.id) + '">Ubah</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-kdel="' + esc(t.id) + '">Hapus</button></div></div>';
    }).join('') : '<div style="padding:24px;text-align:center;color:var(--text-muted);">Tidak ada transaksi pada filter ini.</div>';
  }
}

/* ==========================================================================
   TAB 3: JADWAL TAGIHAN (REAL calc(), occ(), priceAt(), openPm(), openRange())
   ========================================================================== */
function renderJadwal() {
  brSanitizeItems();
  var c = calc(), today = todayISO(), items = S.items,
    paidAmt = 0, unpaidAmt = 0, paidCnt = 0, unpaidCnt = 0, totalCnt = 0,
    cntUnpaidItems = 0, cntPaidItems = 0;

  var statsById = {};
  items.forEach(function (it) {
    var list = c.occs[it.id] || occ(it, +S.year),
      itPaid = 0, itUnpaid = 0, itTotal = 0, itCnt = 0;
    list.forEach(function (t) {
      var ds = isoD(t), k = it.id + '|' + ds;
      if (S.skip[k]) return;
      var pr = priceAt(it, t);
      totalCnt++; itCnt++; itTotal += pr;
      if (S.paid[k]) { paidAmt += pr; paidCnt++; itPaid++; }
      else { unpaidAmt += pr; unpaidCnt++; itUnpaid++; }
    });
    if (itUnpaid > 0) cntUnpaidItems++;
    if (itCnt > 0 && itUnpaid === 0) cntPaidItems++;
    statsById[it.id] = { total: itTotal, paidCnt: itPaid, billCnt: itCnt, allPaid: itCnt > 0 && itUnpaid === 0, hasUnpaid: itUnpaid > 0 };
  });

  if ($('jad-paid-amt')) $('jad-paid-amt').textContent = rp(paidAmt);
  if ($('jad-paid-cnt')) $('jad-paid-cnt').textContent = paidCnt + ' dari ' + totalCnt + ' tagihan telah dilunasi';
  var grand = paidAmt + unpaidAmt;
  if ($('jad-paid-pct')) $('jad-paid-pct').textContent = (grand ? Math.round((paidAmt / grand) * 100) : 0) + '%';
  if ($('jad-unpaid-amt')) $('jad-unpaid-amt').textContent = rp(unpaidAmt);
  if ($('jad-unpaid-cnt')) $('jad-unpaid-cnt').textContent = unpaidCnt + ' tagihan belum lunas tersisa';
  if ($('jad-unpaid-badge')) $('jad-unpaid-badge').textContent = unpaidCnt + ' jatuh tempo';
  if ($('jf-cnt-all')) $('jf-cnt-all').textContent = String(items.length);
  if ($('jf-cnt-unpaid')) $('jf-cnt-unpaid').textContent = String(cntUnpaidItems);
  if ($('jf-cnt-paid')) $('jf-cnt-paid').textContent = String(cntPaidItems);

  var visible = items.filter(function (it) {
    if (BR_STATE.jadwalFilter === 'all' || BR_STATE.pinnedJadwalIds[it.id]) return true;
    var st = statsById[it.id];
    return BR_STATE.jadwalFilter === 'unpaid' ? st.hasUnpaid : st.allPaid;
  });
  var tbody = $('jadwal-tbody'), tfoot = $('jadwal-tfoot'), empty = $('jadwal-empty-msg');
  if (!tbody || !tfoot) return;
  if (!visible.length) {
    tbody.innerHTML = ''; tfoot.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  var P = kasLinked(), negDate = P && typeof kasFirstNegative === 'function' ? kasFirstNegative(P) : null,
    visM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], visGrand = 0, doneIdx = 0;

  tbody.innerHTML = visible.map(function (it) {
    var st = statsById[it.id], list = c.occs[it.id] || [];
    visGrand += st.total;
    var byM = {};
    list.forEach(function (t) {
      var m = new Date(t).getUTCMonth();
      (byM[m] = byM[m] || []).push(t);
    });
    var hasAnomaly = list.some(function (t) {
      var pr = priceAt(it, t);
      return it.price > 0 && pr > it.price * 1.2;
    });
    var hasNeg = negDate && list.some(function (t) { return isoD(t) === negDate.date; });
    var badges = [];
    if (hasNeg) badges.push('<span class="badge badge-crimson">⚠ Membuat saldo minus</span>');
    if (hasAnomaly) badges.push('<span class="badge badge-amber">▲ Kenaikan harga</span>');
    if (st.allPaid) badges.push('<span class="badge badge-emerald doneTag">✓ Lunas semua</span>');

    var mc = '';
    for (var m = 0; m < 12; m++) {
      var mo = byM[m] || [];
      if (!mo.length) { mc += '<td><span class="muted-zero">0</span></td>'; continue; }
      mc += '<td><div style="display:inline-flex;flex-wrap:wrap;gap:4px;justify-content:center;">' + mo.map(function (t) {
        var ds = isoD(t), k = it.id + '|' + ds, pr = priceAt(it, t), dayNum = new Date(t).getUTCDate(),
          isPaid = !!S.paid[k], isSkip = !!S.skip[k], changed = pr !== it.price, spike = it.price > 0 && pr > it.price * 1.2,
          lateDays = !isPaid && !isSkip && ds < today ? daysBetweenISO(today, ds) : 0,
          ttl = fmtD(ds) + ' · ' + rp(pr) + (isPaid ? ' (Lunas)' : isSkip ? ' (Dilewati)' : lateDays > 0 ? ' · terlewat ' + lateDays + ' hari' : '');
        if (!isSkip) visM[m] += pr;
        var cls = ['dt-chip'];
        if (isSkip) cls.push('skipped');
        else if (isPaid) { cls.push('paid'); if (st.allPaid) cls.push('done-row'); }
        else if (lateDays > 0) { cls.push('late'); if (lateDays > 45) cls.push('old'); }
        else if (spike) cls.push('spike');
        else if (changed) cls.push('changed');
        return '<button type="button" class="' + cls.join(' ') + '" title="' + esc(ttl) + '" data-chip-it="' + esc(it.id) + '" data-chip-iso="' + ds + '" data-chip-pr="' + pr + '"><span>' + (isPaid ? '✓ ' : '') + dayNum + (spike ? ' ↑' : '') + '</span>' + ((changed || spike) ? '<span class="dt-chip-amt pv">' + brFmtShort(pr) + '</span>' : '') + '</button>';
      }).join('') + '</div></td>';
    }
    var subText = (typeof pdesc === 'function' ? pdesc(it) : every(it.unit ? it : { n: it.n || 1, unit: (it.every && it.every.unit) || 'bulan' })) + (it.cat ? ' · ' + it.cat : '');
    var rowStyle = st.allPaid ? ' style="--i:' + (doneIdx++) + ';"' : '';
    var doneIcon = st.allPaid ? '<span class="st ok" aria-label="Lunas semua">✓</span> ' : '';
    return '<tr class="' + (st.allPaid ? 'done' : '') + '" data-r="' + esc(it.id) + '"' + rowStyle + '><td>' +
      '<div class="item-cell-head">' + brCatLogo(it.cat || 'Tagihan rutin', 26) + '<div><div class="item-cell-name">' + doneIcon + esc(it.name) + '</div>' +
      (badges.length ? '<div class="item-tags">' + badges.join('') + '</div>' : '') +
      '<div class="item-sub">' + esc(subText) + '</div>' +
      '<button type="button" class="item-edit-link" data-pm-item="' + esc(it.id) + '">✎ Ubah</button></div></div></td>' +
      '<td><div class="price-main pv">' + rp(it.price) + '</div>' + (it.ch && it.ch.length ? '<div class="price-sub">' + it.ch.length + ' perubahan</div>' : '') + '</td>' +
      mc +
      '<td><div class="price-main pv">' + rp(st.total) + '</div><div class="price-sub mono">' + st.paidCnt + '/' + st.billCnt + ' lunas</div></td></tr>';
  }).join('');

  var fLbl = BR_STATE.jadwalFilter === 'unpaid' ? ' (filter: Belum lunas)' : BR_STATE.jadwalFilter === 'paid' ? ' (filter: Lunas)' : '';
  tfoot.innerHTML = '<tr><td>Total per bulan<span style="font-weight:500;font-size:0.72rem;color:var(--text-muted);">' + fLbl + '</span></td><td></td>' +
    visM.map(function (v) { return '<td class="pv">' + (v ? brFmtShort(v) : '0') + '</td>'; }).join('') +
    '<td class="pv" style="text-align:right;padding-right:14px;">' + rp(visGrand) + '</td></tr>';
}

/* ==========================================================================
   TAB 4: KELOLA ITEM (REAL parseQuickItem() + S.items + carryFromYear())
   ========================================================================== */
var BR_ITEM_CATS = ['Tagihan rutin', 'Investasi', 'Kesehatan', 'Hiburan', 'Makanan', 'Transport', 'Lainnya'];

function brCycleToCore(val) {
  if (val === 'tiap 28 hari') return { n: 28, unit: 'hari' };
  if (val === 'sekali saja') return { n: 1, unit: 'sekali' };
  if (val === 'tiap tahun') return { n: 1, unit: 'tahun' };
  return { n: 1, unit: 'bulan' };
}

function brCoreToCycle(it) {
  if (!it) return 'tiap bulan';
  if (it.unit === 'sekali') return 'sekali saja';
  if (it.unit === 'tahun') return 'tiap tahun';
  if (it.unit === 'hari' && +it.n === 28) return 'tiap 28 hari';
  return 'tiap bulan';
}

function renderList() {
  brSanitizeItems();
  var items = S.items || [];
  if ($('item-count-lbl')) $('item-count-lbl').textContent = String(items.length);
  brRenderCatPills('item-cat-pills', BR_ITEM_CATS, BR_STATE.itemCat, 'data-icat-opt');
  var cpBtn = $('btn-copy-next-yr');
  if (cpBtn) cpBtn.textContent = 'Salin ke ' + (+S.year + 1);
  var listEl = $('manage-items-list');
  if (!listEl) return;
  listEl.innerHTML = items.length ? items.map(function (it) {
    var cat = it.cat || 'Tagihan rutin';
    return '<div class="upcoming-item"><div style="display:flex;align-items:center;gap:10px;min-width:0;">' + brCatLogo(cat, 30) +
      '<div style="min-width:0;"><div class="upcoming-name">' + esc(it.name) + '</div><div class="upcoming-meta">' + esc(every(it.unit ? it : { n: it.n || 1, unit: (it.every && it.every.unit) || 'bulan' })) + ' · Mulai ' + fmtD(it.start) + ' · <span class="badge badge-neutral">' + esc(cat) + '</span></div></div></div>' +
      '<div class="upcoming-right"><strong class="mono pv">' + rp(it.price) + '</strong>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-it-edit="' + esc(it.id) + '">Ubah</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-it-del="' + esc(it.id) + '">Hapus</button></div></div>';
  }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Belum ada item. Tambahkan melalui Tambah Cepat atau formulir di samping.</div>';
}

function brQuickBuildItem(r) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: r.name,
    price: r.price,
    n: r.n || 1,
    unit: r.unit || 'bulan',
    start: r.start,
    end: '',
    cnt: 0,
    cat: BR_STATE.itemCat || 'Tagihan rutin',
    ch: [],
  };
}

function brUpdateQuickParsePreview() {
  var inp = $('qp-input'), box = $('qp-preview-tokens'), errEl = $('qp-err');
  if (!inp || !box) return;
  if (errEl) errEl.textContent = '';
  var txt = (inp.value || '').trim();
  if (!txt) { box.innerHTML = ''; return; }
  var r = parseQuickItem(txt, S.year);
  if (!r || r.error) {
    box.innerHTML = '<span class="badge badge-amber">' + esc((r && r.error) || 'Format belum dikenali') + '</span>';
    return;
  }
  box.innerHTML =
    '<span class="badge badge-accent">Nama: ' + esc(r.name) + '</span>' +
    '<span class="badge badge-emerald mono">Biaya: ' + rp(r.price) + '</span>' +
    '<span class="badge badge-neutral">Siklus: ' + esc(every({ n: r.n || 1, unit: r.unit || 'bulan' })) + '</span>' +
    '<span class="badge badge-neutral mono">Mulai: ' + fmtD(r.start) + '</span>';
}

function brDefaultItemDate() {
  var m = smEff(), dim = new Date(Date.UTC(+S.year, m + 1, 0)).getUTCDate();
  return +S.year + '-' + pad2(m + 1) + '-' + pad2(Math.min(dim, 20));
}

function brSyncItemDateUI(ds) {
  var val = ISO_RE.test(ds) ? ds : brDefaultItemDate();
  BR_STATE.inlineDates.itemDate = val;
  if ($('item-date')) $('item-date').value = val;
  if ($('item-date-lbl')) $('item-date-lbl').textContent = brFmtShortIndo(val) + ' ' + val.slice(0, 4);
}

function resetForm() {
  BR_STATE.itemEditId = null;
  if ($('item-form-title')) $('item-form-title').textContent = 'Form Tambah Item Berulang';
  if ($('item-save-btn')) $('item-save-btn').textContent = 'Simpan Item Baru';
  if ($('item-cancel-btn')) $('item-cancel-btn').hidden = true;
  if ($('item-name')) $('item-name').value = '';
  if ($('item-price')) $('item-price').value = '';
  if ($('item-cycle')) { $('item-cycle').value = 'tiap bulan'; syncModernSelect('item-cycle'); }
  brSyncItemDateUI(brDefaultItemDate());
  if ($('item-form-err')) $('item-form-err').textContent = '';
}

/* ==========================================================================
   TAB 5: SIMULASI (REAL SIM, simCalc(), simApply())
   ========================================================================== */
function renderSim() {
  var A = calc(), activeSim = SIM.filter(function (x) { return !x.off; }),
    B = activeSim.length ? simCalc(activeSim) : A, diff = B.end - A.end;
  if ($('sim-base-end')) {
    $('sim-base-end').textContent = rp(A.end);
    $('sim-base-end').style.color = A.end < 0 ? 'var(--crimson)' : 'var(--text-primary)';
  }
  if ($('sim-end-bal')) {
    $('sim-end-bal').textContent = (B.end >= 0 ? '+' : '') + rp(B.end);
    $('sim-end-bal').style.color = B.end >= 0 ? 'var(--emerald)' : 'var(--crimson)';
  }
  if ($('sim-delta-val')) $('sim-delta-val').textContent = (diff >= 0 ? '+' : '-') + rp(Math.abs(diff));
  if ($('sim-active-cnt')) $('sim-active-cnt').textContent = activeSim.length + ' skenario aktif';
  if ($('sim-status-hint')) $('sim-status-hint').textContent = B.end >= 0 ? 'Aman · Tidak pernah minus!' : 'Masih defisit — uji penghematan tambahan';

  var listEl = $('sim-scenarios-list');
  if (listEl) {
    listEl.innerHTML = SIM.length ? SIM.map(function (x, i) {
      var on = !x.off;
      return '<div class="scenario-chip-card' + (on ? ' active' : '') + '">' +
        '<label style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;">' +
        '<input type="checkbox"' + (on ? ' checked' : '') + ' data-br-smtog="' + i + '"/>' +
        '<span><strong style="font-size:0.84rem;display:block;">' + esc(x.name || simDesc(x)) + '</strong>' +
        '<span style="font-size:0.73rem;color:var(--text-muted);">' + simDesc(x) + '</span></span></label>' +
        '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-br-smdel="' + i + '">Hapus</button></div>';
    }).join('') : '<div style="padding:18px;text-align:center;color:var(--text-muted);">Belum ada skenario. Tambahkan di form samping untuk melihat kurva perbandingannya.</div>';
  }

  // SVG Chart comparing A.rows vs B.rows
  var svg = $('svg-sim-chart'), wrap = $('sim-chart-wrap'), tip = $('sim-tooltip');
  if (!svg || !wrap || !A.rows.length) return;
  var W = 1060, H = 240, padL = 68, padR = 26, padT = 20, padB = 34,
    allV = A.rows.map(function (r) { return r.ak; }).concat(B.rows.map(function (r) { return r.ak; }), [0]),
    minV = Math.min.apply(null, allV) - 450000, maxV = Math.max.apply(null, allV) + 550000,
    xAt = function (i) { return padL + (i * (W - padL - padR)) / Math.max(1, A.rows.length - 1); },
    yAt = function (v) { return padT + ((maxV - v) / (maxV - minV || 1)) * (H - padT - padB); },
    zeroY = yAt(0);
  var cOrig = A.rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.ak), v: r.ak, lbl: MON[r.m], idx: i }; }),
    cSim = B.rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.ak), v: r.ak, lbl: MON[r.m], idx: i }; }),
    savePoly = cSim.map(function (c) { return c.x + ',' + c.y; }).concat(cOrig.slice().reverse().map(function (c) { return c.x + ',' + c.y; })).join(' ');
  svg.innerHTML =
    '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '" stroke="var(--text-muted)" stroke-dasharray="5 4"/>' +
    '<text x="' + (padL - 10) + '" y="' + (zeroY + 4) + '" text-anchor="end" fill="var(--text-muted)" font-size="11.5" font-family="var(--font-mono)">Rp 0</text>' +
    '<polygon points="' + savePoly + '" fill="var(--emerald)" opacity="0.14"/>' +
    '<path d="' + brCubicPath(cOrig) + '" fill="none" stroke="var(--crimson)" stroke-width="2.5" stroke-dasharray="6 4"/>' +
    '<path d="' + brCubicPath(cSim) + '" fill="none" stroke="var(--emerald)" stroke-width="3.2" stroke-linecap="round"/>' +
    '<line id="sim-ch" y1="' + padT + '" y2="' + (H - padB) + '" stroke="var(--emerald)" stroke-width="1.2" stroke-dasharray="3 3" style="display:none;"/>' +
    cSim.map(function (c, i) {
      return '<circle cx="' + c.x + '" cy="' + cOrig[i].y + '" r="3.8" fill="var(--crimson)" stroke="var(--bg-surface)" stroke-width="1.5"/>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="5" fill="var(--emerald)" stroke="var(--bg-surface)" stroke-width="2"/>' +
        '<text x="' + c.x + '" y="' + (H - 10) + '" text-anchor="middle" fill="var(--text-muted)" font-size="11.5" font-family="var(--font-mono)">' + c.lbl + '</text>';
    }).join('') +
    '<rect id="sim-hit" x="' + padL + '" y="0" width="' + (W - padL - padR) + '" height="' + H + '" fill="transparent"/>';

  var hit = svg.getElementById('sim-hit'), ch = svg.getElementById('sim-ch');
  if (hit && ch && tip) {
    hit.onmousemove = function (e) {
      var sR = svg.getBoundingClientRect(), wR = wrap.getBoundingClientRect(),
        svgX = ((e.clientX - sR.left) / (sR.width || 600)) * W,
        pt = cSim.reduce(function (b, c) { return Math.abs(c.x - svgX) < Math.abs(b.x - svgX) ? c : b; }, cSim[0]),
        ov = cOrig[pt.idx].v, df = pt.v - ov,
        px = sR.width ? (pt.x / W) * sR.width + (sR.left - wR.left) : 200,
        py = sR.height ? (pt.y / H) * sR.height + (sR.top - wR.top) : 80;
      ch.style.display = 'block'; ch.setAttribute('x1', pt.x); ch.setAttribute('x2', pt.x);
      tip.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">' + pt.lbl + ' ' + S.year + '</div>' +
        '<div class="mono pv" style="color:var(--crimson);">Asli: ' + rp(ov) + '</div>' +
        '<div class="mono pv" style="color:var(--emerald);">Simulasi: ' + rp(pt.v) + '</div>' +
        '<div class="mono pv" style="margin-top:3px;font-weight:700;color:var(--accent-ink);">Selisih: ' + (df >= 0 ? '+' : '-') + rp(Math.abs(df)) + '</div>';
      brPositionTooltip(wrap, tip, px, py, 14);
    };
    hit.onmouseleave = function () { ch.style.display = 'none'; tip.classList.remove('visible'); };
  }
}

/* ==========================================================================
   TAB 6: MODE PERJALANAN (REAL ALL.kas.pr + tripPlan() + Excel/Share/Goals)
   ========================================================================== */
function brTripCatMapped(c) {
  var m = { Makanan: 'Makan & Minum', Makan: 'Makan & Minum', Transport: 'Transportasi', 'Tiket & Tour': 'Hiburan', Penginapan: 'Tagihan rutin', Belanja: 'Belanja', Persiapan: 'Kesehatan', Lainnya: 'Tagihan rutin' };
  return m[c] || 'Tagihan rutin';
}

function brDrawInlineCal(popId, stateKey, lblId) {
  var pop = $(popId);
  if (!pop) return;
  var today = todayISO(), dsCur = BR_STATE.inlineDates[stateKey] || today,
    v = BR_STATE.inlineCalView[popId] || { y: +dsCur.slice(0, 4), m: +dsCur.slice(5, 7) - 1 };
  BR_STATE.inlineCalView[popId] = v;
  var firstDay = new Date(Date.UTC(v.y, v.m, 1)).getUTCDay(), dim = new Date(Date.UTC(v.y, v.m + 1, 0)).getUTCDate(), cells = '';
  for (var i = 0; i < firstDay; i++) cells += '<span></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = v.y + '-' + pad2(v.m + 1) + '-' + pad2(d);
    var cls = 'cal-day' + (ds === dsCur ? ' selected' : '') + (ds === today ? ' today' : '');
    cells += '<button type="button" class="' + cls + '" data-ical-pick="' + popId + '|' + stateKey + '|' + lblId + '|' + ds + '">' + d + '</button>';
  }
  pop.innerHTML =
    '<div class="cal-head"><button type="button" class="btn btn-secondary btn-sm" data-ical-mv="' + popId + '|' + stateKey + '|' + lblId + '|-1">‹</button><strong style="font-size:0.84rem;">' + FULL_MON[v.m] + ' ' + v.y + '</strong><button type="button" class="btn btn-secondary btn-sm" data-ical-mv="' + popId + '|' + stateKey + '|' + lblId + '|1">›</button></div>' +
    '<div class="cal-grid"><span class="cal-dow">Min</span><span class="cal-dow">Sen</span><span class="cal-dow">Sel</span><span class="cal-dow">Rab</span><span class="cal-dow">Kam</span><span class="cal-dow">Jum</span><span class="cal-dow">Sab</span>' + cells + '</div>' +
    '<div class="cal-presets"><button type="button" class="badge badge-accent" style="cursor:pointer;" data-ical-pick="' + popId + '|' + stateKey + '|' + lblId + '|' + today + '">Hari Ini</button></div>';
}

function tripAmtRp(P, x) {
  return typeof val === 'function' ? val(P, x.amt, x.fx) : (+x.amt || 0);
}
function tripItRp(P, x) {
  return typeof val === 'function' ? val(P, x.est, x.fx) : (+x.est || 0);
}
function tripDayLabel(P, d) {
  return typeof dayLabel === 'function' ? dayLabel(P, d) : fmtD(d);
}

function renderTrip() {
  var root = $('trip-root'), list = trips();
  if (!root) return;
  if ($('nav-badge-trip')) $('nav-badge-trip').textContent = list.length + ' trip';
  if ($('mob-trip-badge')) $('mob-trip-badge').textContent = list.length + ' trip';
  if (typeof mode !== 'undefined' && mode !== 'trip') return;

  var tr = tp() || list[0] || null;
  if (tr && !tp()) tripAct = tr.id;
  if (!tr || BR_STATE.tripView === 'list') {
    root.innerHTML =
      '<div class="card"><div class="card-header"><div><h2 class="card-title">Semua Perjalanan</h2>' +
      '<p class="card-sub">Lembar perencanaan perjalanan terpisah · anggaran, itinerary, pemesanan, checklist, dan target tabungan</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" class="btn btn-primary btn-sm" id="br-trip-new">+ Perjalanan baru</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-xl">Impor Excel</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-tpl">Template Excel</button></div></div>' +
      (list.length ? '<div class="grid-2 trip-cards-grid">' + list.map(function (t) {
        var pl = tripPlan(t), dCnt = t.start && t.end && t.end >= t.start ? daysBetweenISO(t.end, t.start) + 1 : 0,
          pct = t.budget ? Math.min(100, Math.round((pl.t / t.budget) * 100)) : 0, over = t.budget && pl.t > t.budget;
        return '<div class="metric-tile" style="cursor:pointer;gap:8px;" data-trip-open="' + esc(t.id) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;"><div>' +
          '<div style="font-weight:700;font-size:0.98rem;">' + esc(t.name) + '</div>' +
          '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">' + (t.start && t.end ? fmtD(t.start) + ' – ' + fmtD(t.end) + ' · ' + dCnt + ' hari' : 'Tanggal belum diisi') + '</div></div>' +
          '<span class="badge ' + (t.id === tripAct ? 'badge-accent' : 'badge-neutral') + '">' + esc(t.cur || 'IDR') + '</span></div>' +
          (t.budget ? '<div class="rank-track"><div class="rank-fill" style="width:' + pct + '%;background:' + (over ? 'var(--crimson)' : 'var(--accent)') + ';"></div></div>' : '') +
          '<div style="font-size:0.78rem;color:var(--text-secondary);" class="pv">Rencana biaya <strong class="mono">' + rp(pl.t) + '</strong>' + (t.budget ? ' dari anggaran <strong class="mono">' + rp(t.budget) + '</strong>' : ' · anggaran belum ditentukan') + '</div></div>';
      }).join('') + '</div>' : '<div style="padding:28px;text-align:center;color:var(--text-muted);">Belum ada perjalanan. Klik "+ Perjalanan baru" untuk mulai merencanakan.</div>') +
      '</div>';
    return;
  }

  var pl = tripPlan(tr), sub = BR_STATE.tripSubTab,
    subTabs = [['ring', 'Ringkasan'], ['itin', 'Itinerary'], ['book', 'Pemesanan'], ['cek', 'Checklist'], ['cat', 'Catatan'], ['sv', 'Tabungan']];
  var bodyHtml = '';

  if (sub === 'ring') {
    var N = tr.start && tr.end && tr.end >= tr.start ? daysBetweenISO(tr.end, tr.start) + 1 : 0,
      left = tr.budget ? tr.budget - pl.t : 0, pctBud = tr.budget ? Math.min(100, Math.round((pl.t / tr.budget) * 100)) : 0,
      byDay = {}, bcat = {};
    (tr.bk || []).forEach(function (x) { var c = x.cat || 'Lainnya'; bcat[c] = (bcat[c] || 0) + tripAmtRp(tr, x); });
    (tr.it || []).forEach(function (x) {
      if (x.pay === 'on' || !x.est) return;
      var v = tripItRp(tr, x);
      byDay[x.day] = (byDay[x.day] || 0) + v;
      bcat[x.cat || 'Lainnya'] = (bcat[x.cat || 'Lainnya'] || 0) + v;
    });
    var dk = Object.keys(byDay).sort(), dmax = dk.reduce(function (m, d) { return Math.max(m, byDay[d]); }, 0) || 1,
      cl = Object.keys(bcat).sort(function (a, b) { return bcat[b] - bcat[a]; }), ck = Object.keys(pl.cash).sort();
    bodyHtml =
      '<div class="grid-4">' +
      '<div class="metric-tile"><div class="metric-tile-label">Total Rencana Biaya</div><div class="metric-tile-val pv">' + rp(pl.t) + '</div><div class="metric-tile-hint pv">Pemesanan ' + rp(pl.b) + ' + Harian ' + rp(pl.d) + '</div></div>' +
      '<div class="metric-tile"><div class="metric-tile-label">' + (tr.budget ? (left >= 0 ? 'Sisa Anggaran' : 'Melebihi Anggaran') : 'Anggaran') + '</div><div class="metric-tile-val pv" style="color:' + (tr.budget ? (left >= 0 ? 'var(--emerald)' : 'var(--crimson)') : 'var(--text-primary)') + ';">' + (tr.budget ? rp(Math.abs(left)) : 'Belum diatur') + '</div><div class="metric-tile-hint pv">' + (tr.budget ? pctBud + '% dari ' + rp(tr.budget) : 'Atur lewat tombol Ubah') + '</div></div>' +
      '<div class="metric-tile"><div class="metric-tile-label">Sudah Dibayar</div><div class="metric-tile-val pv" style="color:var(--emerald);">' + rp(pl.paid) + '</div><div class="metric-tile-hint pv">Belum dibayar: ' + rp(pl.b - pl.paid) + '</div></div>' +
      '<div class="metric-tile"><div class="metric-tile-label">Rencana per Hari</div><div class="metric-tile-val pv">' + (N ? rp(Math.round(pl.t / N)) : '—') + '</div><div class="metric-tile-hint">' + (N ? N + ' hari' : 'Tanggal belum diisi') + (tr.cur && tr.rate ? ' · 1 ' + esc(tr.cur) + ' = Rp ' + tr.rate.toLocaleString('id-ID') : '') + '</div></div></div>' +
      '<div class="grid-2"><div class="stack"><div class="card"><div class="card-header"><div><h2 class="card-title">Siapkan Tunai / Kartu</h2><p class="card-sub">Akumulasi kebutuhan bayar di tempat</p></div></div><div class="simple-list">' +
      (ck.length ? ck.map(function (k) {
        var cx = pl.cash[k], eqRp = cx.idr + (cx.fx && tr.rate ? Math.round(cx.fx * tr.rate) : 0);
        return '<div class="simple-row" style="cursor:default;"><span class="simple-row-name">' + esc(k) + '</span><span class="mono" style="font-size:0.8rem;font-weight:700;">' + (cx.fx ? esc(tr.cur) + ' ' + Math.round(cx.fx).toLocaleString('id-ID') : rp(cx.idr)) + '</span><span class="simple-row-amt pv">' + (cx.fx && tr.rate ? '≈ ' + rp(eqRp) : rp(eqRp)) + '</span></div>';
      }).join('') : '<div style="padding:14px;color:var(--text-muted);font-size:0.82rem;">Belum ada pengeluaran tunai/kartu harian di Itinerary.</div>') +
      '</div></div><div class="card"><div class="card-header"><div><h2 class="card-title">Estimasi per Hari</h2><p class="card-sub">Pengeluaran non-online dihitung dari jadwal kegiatan</p></div></div><div class="simple-list">' +
      (dk.length ? dk.map(function (d) { return '<div class="simple-row" style="cursor:default;"><span class="simple-row-name">' + esc(tripDayLabel(tr, d)) + '</span><span class="simple-row-bar"><i style="width:' + ((byDay[d] / dmax) * 100).toFixed(1) + '%;background:var(--accent);"></i></span><span class="simple-row-amt pv">' + rp(byDay[d]) + '</span></div>'; }).join('') : '<div style="padding:14px;color:var(--text-muted);font-size:0.82rem;">Belum ada estimasi harian.</div>') +
      '</div></div></div><div class="card"><div class="card-header"><div><h2 class="card-title">Rencana Biaya per Kategori</h2><p class="card-sub">Gabungan pemesanan + pengeluaran harian</p></div><span class="badge badge-neutral mono pv">' + rp(pl.t) + '</span></div><div class="simple-list">' +
      (cl.length ? cl.map(function (k) {
        var pct = pl.t ? (bcat[k] / pl.t) * 100 : 0, mCat = brTripCatMapped(k), hex = brGetCatMeta(mCat).hex;
        return '<div class="simple-row" style="cursor:default;">' + brCatLogo(mCat, 24) + '<span class="simple-row-name">' + esc(k) + '</span><span class="simple-row-bar"><i style="width:' + pct.toFixed(1) + '%;background:' + hex + ';"></i></span><span class="simple-row-pct">' + pct.toFixed(1) + '%</span><span class="simple-row-amt pv">' + rp(bcat[k]) + '</span></div>';
      }).join('') : '<div style="padding:14px;color:var(--text-muted);font-size:0.82rem;">Belum ada data biaya.</div>') +
      '</div></div></div>';
  } else if (sub === 'itin') {
    var EIt = BR_STATE.tripEditItId ? (tr.it || []).filter(function (x) { return x.id === BR_STATE.tripEditItId; })[0] : null,
      days = tripDays(tr);
    BR_STATE.inlineDates.itDay = EIt ? EIt.day : (BR_STATE.inlineDates.itDay || days[0] || tr.start || todayISO());
    bodyHtml =
      '<div class="card"><div class="card-header"><div><h2 class="card-title">' + (EIt ? 'Ubah Kegiatan' : 'Tambah Kegiatan') + '</h2><p class="card-sub">Catat jadwal jam, lokasi, tautan peta, &amp; estimasi biaya</p></div></div>' +
      '<form id="trip-itin-form" class="stack" style="gap:12px;"><div class="grid-3">' +
      '<div class="field"><span class="field-label">Tanggal</span><div class="custom-picker-wrap"><button type="button" class="cal-trigger-btn" style="width:100%;justify-content:space-between;" data-ical-trig="it-day-cal|itDay|it-day-lbl"><span id="it-day-lbl">' + brFmtShortIndo(BR_STATE.inlineDates.itDay) + ' ' + BR_STATE.inlineDates.itDay.slice(0, 4) + '</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></button><div class="picker-popover" id="it-day-cal"></div></div></div>' +
      '<div class="grid-2" style="gap:8px;"><div class="field"><label class="field-label" for="it-t1">Mulai</label><input class="input mono" id="it-t1" placeholder="14.00" value="' + esc(EIt ? (EIt.time || '').replace(':', '.') : '') + '"/></div><div class="field"><label class="field-label" for="it-t2">Selesai</label><input class="input mono" id="it-t2" placeholder="16.30" value="' + esc(EIt ? (EIt.time2 || '').replace(':', '.') : '') + '"/></div></div>' +
      '<div class="field"><label class="field-label" for="it-place">Kegiatan</label><input class="input" id="it-place" placeholder="mis. Senso-ji Temple" value="' + esc(EIt ? EIt.place : '') + '" required/></div></div>' +
      '<div class="grid-3"><div class="field"><label class="field-label" for="it-est">Biaya &amp; Mata Uang</label><div style="display:flex;gap:6px;"><input class="input mono" id="it-est" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" value="' + (EIt && EIt.est ? fmtRpInputStr(String(EIt.est)) : '') + '" style="flex:1;min-width:0;"/><div style="width:94px;flex-shrink:0;"><select class="input" id="it-cur"><option value="idr"' + (!(EIt && EIt.fx) ? ' selected' : '') + '>Rp</option>' + (tr.cur ? '<option value="fx"' + ((EIt && EIt.fx) ? ' selected' : '') + '>' + esc(tr.cur) + '</option>' : '') + '</select></div></div></div>' +
      '<div class="field"><label class="field-label" for="it-pay">Pembayaran</label><select class="input" id="it-pay"><option value=""' + (EIt && !EIt.pay ? ' selected' : '') + '>Belum ditentukan</option><option value="ic"' + (EIt && EIt.pay === 'ic' ? ' selected' : '') + '>Kartu IC</option><option value="on"' + (EIt && EIt.pay === 'on' ? ' selected' : '') + '>Online (Pemesanan)</option><option value="cash"' + (!EIt || EIt.pay === 'cash' ? ' selected' : '') + '>Cash</option></select></div>' +
      '<div class="field"><label class="field-label" for="it-cat">Kategori</label><select class="input" id="it-cat">' + ICAT.map(function (c) { return '<option value="' + esc(c) + '"' + ((EIt ? EIt.cat : 'Transport') === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="grid-2"><div class="field"><label class="field-label" for="it-link">Tautan Peta / Tiket (opsional)</label><input class="input" id="it-link" placeholder="https://..." value="' + esc(EIt ? (EIt.link || '') : '') + '"/></div><div class="field"><label class="field-label" for="it-note">Catatan (opsional)</label><input class="input" id="it-note" placeholder="Catatan singkat" value="' + esc(EIt ? (EIt.note || '') : '') + '"/></div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;">' + (EIt ? '<button type="button" class="btn btn-secondary" data-it-cancel="1">Batal</button>' : '') + '<button type="submit" class="btn btn-primary">' + (EIt ? 'Simpan Perubahan' : 'Tambah Kegiatan') + '</button></div></form></div>' +
      '<div class="stack">' + (days.length ? days.map(function (d) {
        var its = (tr.it || []).filter(function (x) { return x.day === d; }).sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
        var dTot = its.reduce(function (s, x) { return s + (x.pay === 'on' || !x.est ? 0 : tripItRp(tr, x)); }, 0);
        return '<div class="card"><div class="card-header" style="margin-bottom:10px;"><div><h3 class="card-title">' + esc(tripDayLabel(tr, d)) + '</h3></div>' + (dTot ? '<span class="badge badge-accent mono pv">Estimasi: ' + rp(dTot) + '</span>' : '') + '</div>' +
          '<input class="input" style="margin-bottom:10px;" value="' + esc((tr.dt && tr.dt[d]) || '') + '" placeholder="Judul hari, mis. Jakarta – Tokyo" data-dt-day="' + d + '"/>' +
          '<div class="stack" style="gap:8px;">' + (its.length ? its.map(function (x) {
            return '<div class="upcoming-item"><div class="upcoming-left">' + brCatLogo(brTripCatMapped(x.cat), 30) +
              '<div style="min-width:0;"><div class="upcoming-name" style="' + (x.done ? 'text-decoration:line-through;opacity:0.55;' : '') + '">' + (x.time ? '<span class="mono" style="color:var(--accent-ink);margin-right:6px;">' + esc(x.time.replace(':', '.')) + (x.time2 ? '–' + esc(x.time2.replace(':', '.')) : '') + '</span>' : '') + esc(x.place) + '</div>' +
              '<div class="upcoming-meta"><span class="badge badge-neutral">' + esc(x.cat) + '</span>' + (x.pay ? '<span class="badge badge-accent">' + esc(PAYL[x.pay] || x.pay) + '</span>' : '') + (x.note ? '<span>' + esc(x.note) + '</span>' : '') + '</div></div></div>' +
              '<div class="upcoming-right"><strong class="mono pv">' + (x.est ? (x.fx && tr.cur ? esc(tr.cur) + ' ' + Math.round(x.est).toLocaleString('id-ID') : rp(x.est)) : '') + '</strong>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-it-done="' + esc(x.id) + '">' + (x.done ? '✓ Selesai' : 'Tandai') + '</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-trip-it-edit="' + esc(x.id) + '">Ubah</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-trip-it-del="' + esc(x.id) + '">Hapus</button></div></div>';
          }).join('') : '<div style="padding:10px;color:var(--text-muted);font-size:0.82rem;">Belum ada kegiatan hari ini.</div>') + '</div></div>';
      }).join('') : '<div class="card"><div style="text-align:center;padding:24px;color:var(--text-muted);">Atur tanggal mulai/selesai atau tambahkan kegiatan pertama.</div></div>') + '</div>';
  } else if (sub === 'book') {
    var EBk = BR_STATE.tripEditBkId ? (tr.bk || []).filter(function (x) { return x.id === BR_STATE.tripEditBkId; })[0] : null;
    BR_STATE.inlineDates.bkStart = EBk ? (EBk.a || tr.start || todayISO()) : (tr.start || todayISO());
    BR_STATE.inlineDates.bkEnd = EBk ? (EBk.b || tr.end || todayISO()) : (tr.end || todayISO());
    bodyHtml =
      '<div class="grid-3"><div class="metric-tile"><div class="metric-tile-label">Total Pemesanan</div><div class="metric-tile-val pv">' + rp(pl.b) + '</div></div><div class="metric-tile"><div class="metric-tile-label">Sudah Dibayar</div><div class="metric-tile-val pv" style="color:var(--emerald);">' + rp(pl.paid) + '</div></div><div class="metric-tile"><div class="metric-tile-label">Belum Dibayar</div><div class="metric-tile-val pv" style="color:var(--amber);">' + rp(pl.b - pl.paid) + '</div></div></div>' +
      '<div class="card"><div class="card-header"><div><h2 class="card-title">' + (EBk ? 'Ubah Pemesanan' : 'Tambah Pemesanan') + '</h2><p class="card-sub">Tiket pesawat, hotel, kereta, dan tur prabayar</p></div></div>' +
      '<form id="trip-book-form" class="stack" style="gap:12px;"><div class="grid-2"><div class="field"><label class="field-label" for="bk-title">Nama</label><input class="input" id="bk-title" placeholder="mis. Tiket Pesawat ANA PP" value="' + esc(EBk ? EBk.title : '') + '" required/></div>' +
      '<div class="field"><label class="field-label" for="bk-amt">Jumlah</label><div style="display:flex;gap:6px;"><input class="input mono" id="bk-amt" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" value="' + (EBk && EBk.amt ? fmtRpInputStr(String(EBk.amt)) : '') + '" style="flex:1;min-width:0;" required/><div style="width:94px;flex-shrink:0;"><select class="input" id="bk-cur"><option value="idr"' + (!(EBk && EBk.fx) ? ' selected' : '') + '>Rp</option>' + (tr.cur ? '<option value="fx"' + ((EBk && EBk.fx) ? ' selected' : '') + '>' + esc(tr.cur) + '</option>' : '') + '</select></div></div></div></div>' +
      '<div class="grid-3"><div class="field"><span class="field-label">Mulai / Check-in</span><div class="custom-picker-wrap"><button type="button" class="cal-trigger-btn" style="width:100%;justify-content:space-between;" data-ical-trig="bk-start-cal|bkStart|bk-start-lbl"><span id="bk-start-lbl">' + brFmtShortIndo(BR_STATE.inlineDates.bkStart) + ' ' + BR_STATE.inlineDates.bkStart.slice(0, 4) + '</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></button><div class="picker-popover" id="bk-start-cal"></div></div></div>' +
      '<div class="field"><span class="field-label">Selesai / Check-out</span><div class="custom-picker-wrap"><button type="button" class="cal-trigger-btn" style="width:100%;justify-content:space-between;" data-ical-trig="bk-end-cal|bkEnd|bk-end-lbl"><span id="bk-end-lbl">' + brFmtShortIndo(BR_STATE.inlineDates.bkEnd) + ' ' + BR_STATE.inlineDates.bkEnd.slice(0, 4) + '</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></button><div class="picker-popover" id="bk-end-cal"></div></div></div>' +
      '<div class="field"><label class="field-label" for="bk-cat">Kategori</label><select class="input" id="bk-cat">' + BCAT.map(function (c) { return '<option value="' + esc(c) + '"' + ((EBk ? EBk.cat : 'Transport') === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;">' + (EBk ? '<button type="button" class="btn btn-secondary" data-bk-cancel="1">Batal</button>' : '') + '<button type="submit" class="btn btn-primary">' + (EBk ? 'Simpan Perubahan' : 'Tambah Pemesanan') + '</button></div></form></div>' +
      '<div class="card"><div class="stack" style="gap:8px;">' + ((tr.bk || []).length ? tr.bk.map(function (x) {
        return '<div class="upcoming-item"><div class="upcoming-left">' + brCatLogo(brTripCatMapped(x.cat), 30) + '<div><div class="upcoming-name">' + esc(x.title) + '</div><div class="upcoming-meta"><span class="badge badge-neutral">' + esc(x.cat) + '</span>' + (x.a ? '<span class="badge badge-neutral">' + brFmtShortIndo(x.a) + (x.b ? ' – ' + brFmtShortIndo(x.b) : '') + '</span>' : '') + '</div></div></div>' +
          '<div class="upcoming-right"><strong class="mono pv">' + rp(tripAmtRp(tr, x)) + '</strong>' +
          '<button type="button" class="btn ' + (x.paid ? 'btn-emerald' : 'btn-secondary') + ' btn-sm" data-bk-pay="' + esc(x.id) + '">' + (x.paid ? '✓ Lunas' : 'Tandai lunas') + '</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-bk-edit="' + esc(x.id) + '">Ubah</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-bk-del="' + esc(x.id) + '">Hapus</button></div></div>';
      }).join('') : '<div style="padding:18px;text-align:center;color:var(--text-muted);">Belum ada pemesanan.</div>') + '</div></div>';
  } else if (sub === 'cek') {
    var ck = tr.ck || [], doneCnt = ck.filter(function (c) { return c.done; }).length, pct = ck.length ? Math.round((doneCnt / ck.length) * 100) : 0;
    bodyHtml =
      '<div class="card"><div class="card-header"><div><h2 class="card-title">Checklist Barang Bawaan</h2><p class="card-sub">' + doneCnt + ' dari ' + ck.length + ' siap (' + pct + '%)</p></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-ck-std">Isi Daftar Standar</button></div>' +
      '<div class="rank-track" style="margin-bottom:14px;"><div class="rank-fill" style="width:' + pct + '%;background:var(--emerald);"></div></div>' +
      '<form id="trip-ck-form" style="display:flex;gap:8px;margin-bottom:12px;"><input class="input" id="trip-ck-input" maxlength="60" placeholder="mis. Adaptor Universal" style="flex:1;" required/><button type="submit" class="btn btn-primary">Tambah</button></form>' +
      '<div class="stack" style="gap:8px;">' + (ck.length ? ck.map(function (c) {
        return '<div class="upcoming-item"><label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;"><input type="checkbox" ' + (c.done ? 'checked' : '') + ' data-ck-tog="' + esc(c.id) + '"/><span style="' + (c.done ? 'text-decoration:line-through;color:var(--text-muted);' : 'font-weight:600;') + '">' + esc(c.text) + '</span></label>' +
          '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-ck-del="' + esc(c.id) + '">Hapus</button></div>';
      }).join('') : '<div style="padding:18px;text-align:center;color:var(--text-muted);">Belum ada barang. Klik "Isi Daftar Standar" atau tambah manual.</div>') + '</div></div>';
  } else if (sub === 'cat') {
    bodyHtml =
      '<div class="grid-2"><div class="card"><div class="card-header"><div><h2 class="card-title">Tautan Berguna</h2><p class="card-sub">Video panduan, situs tiket, peta</p></div></div>' +
      '<form id="trip-lk-form" class="stack" style="gap:8px;margin-bottom:12px;"><input class="input" id="trip-lk-title" placeholder="Judul tautan" required/><div style="display:flex;gap:8px;"><input class="input" id="trip-lk-url" placeholder="https://..." style="flex:1;" required/><button type="submit" class="btn btn-primary">Tambah</button></div></form>' +
      '<div class="stack" style="gap:8px;">' + ((tr.lk || []).length ? tr.lk.map(function (x) {
        return '<div class="upcoming-item"><a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="font-weight:600;color:var(--accent-ink);">' + esc(x.title) + ' ↗</a><button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" data-lk-del="' + esc(x.id) + '">Hapus</button></div>';
      }).join('') : '<div style="padding:14px;color:var(--text-muted);font-size:0.82rem;">Belum ada tautan.</div>') + '</div></div>' +
      '<div class="card"><div class="card-header"><div><h2 class="card-title">Catatan Penting</h2><p class="card-sub">Kode booking hotel, alamat, kontak darurat (tersimpan otomatis)</p></div></div>' +
      '<textarea class="input" id="trip-note-box" rows="7" style="resize:vertical;line-height:1.55;" placeholder="mis. Hotel: ...">' + esc(tr.note || '') + '</textarea></div></div>';
  } else {
    var g = tr.goal;
    if (g && !BR_STATE.tripGoalEdit) {
      var per = typeof goalPlan === 'function' ? goalPlan(g).per : (g.per || 0),
        got = Math.min(g.t, (g.s0 || 0) + per), pctG = g.t ? Math.min(100, Math.round((got / g.t) * 100)) : 0;
      bodyHtml =
        '<div class="card"><div class="card-header"><div><h2 class="card-title">Target Tabungan</h2><p class="card-sub">Sisihan dana bulanan sebelum berangkat</p></div>' +
        '<span class="badge ' + (g.link ? 'badge-emerald' : 'badge-neutral') + '">' + (g.link ? 'Tersambung ke Rincian' : 'Hanya Pencatat') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;"><span>Terkumpul <strong class="mono pv">' + rp(got) + '</strong> dari <strong class="mono pv">' + rp(g.t) + '</strong></span><strong class="mono" style="color:var(--emerald);">' + pctG + '%</strong></div>' +
        '<div class="rank-track" style="height:9px;margin-bottom:12px;"><div class="rank-fill" style="width:' + pctG + '%;background:var(--emerald);"></div></div>' +
        '<p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:12px;">Sisihkan <strong class="mono pv">' + rp(per) + '</strong> per bulan · ' + esc(g.from) + ' – ' + esc(g.to) + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="btn btn-secondary btn-sm" id="br-tg-edit">Ubah Target</button><button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" id="br-tg-del">Hapus Target</button></div></div>';
    } else {
      var defT = g ? g.t : Math.max(1000000, Math.ceil(pl.t / 1000) * 1000),
        curM = todayISO().slice(0, 7),
        toM = tr.start && tr.start.slice(0, 7) >= curM ? tr.start.slice(0, 7) : S.year + '-12';
      bodyHtml =
        '<div class="card"><div class="card-header"><div><h2 class="card-title">Target Tabungan</h2><p class="card-sub">Hitung dana bulanan sebelum berangkat</p></div></div>' +
        '<form id="trip-goal-form" class="stack" style="gap:12px;"><div class="grid-3">' +
        '<div class="field"><label class="field-label" for="tg-t">Target Total (Rp)</label><input class="input mono" id="tg-t" type="text" inputmode="numeric" data-num-fmt="rp" value="' + fmtRpInputStr(String(defT)) + '" required/></div>' +
        '<div class="field"><label class="field-label" for="tg-s0">Sudah Terkumpul (Rp)</label><input class="input mono" id="tg-s0" type="text" inputmode="numeric" data-num-fmt="rp" value="' + fmtRpInputStr(String(g ? g.s0 || 0 : 0)) + '"/></div>' +
        '<div class="field"><label class="field-label" for="tg-link">Hubungkan ke Rincian?</label><select class="input" id="tg-link"><option value="1"' + (!g || g.link ? ' selected' : '') + '>Ya, hitung di Rincian</option><option value="0"' + (g && !g.link ? ' selected' : '') + '>Tidak, hanya pencatat</option></select></div></div>' +
        '<div class="grid-2"><div class="field"><label class="field-label" for="tg-from">Mulai Bulan</label><input class="input mono" id="tg-from" type="month" value="' + esc(g ? g.from : curM) + '"/></div><div class="field"><label class="field-label" for="tg-to">Target Bulan</label><input class="input mono" id="tg-to" type="month" value="' + esc(g ? g.to : toM) + '"/></div></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;">' + (g ? '<button type="button" class="btn btn-secondary" id="br-tg-cancel">Batal</button>' : '') + '<button type="submit" class="btn btn-primary">Simpan Target</button></div></form></div>';
    }
  }

  root.innerHTML =
    '<div class="card trip-head-card"><div class="card-header" style="margin-bottom:12px;"><div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
    '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-back-list">← Semua Perjalanan</button>' +
    '<div class="yb-group">' + list.map(function (t) { return '<button type="button" class="yp' + (t.id === tr.id ? ' on' : '') + '" data-trip-pick="' + esc(t.id) + '">' + esc(t.name) + '</button>'; }).join('') + '</div></div>' +
    '<h2 class="card-title">' + esc(tr.name) + '</h2>' +
    '<p class="card-sub">' + (tr.start && tr.end ? fmtD(tr.start) + ' – ' + fmtD(tr.end) : 'Tanggal belum diisi') + (tr.cur && tr.rate ? ' · Kurs 1 ' + esc(tr.cur) + ' = Rp ' + tr.rate.toLocaleString('id-ID') : '') + '</p></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-share">Bagikan</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="br-trip-edit">Ubah</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--crimson);" id="br-trip-del">Hapus</button></div></div>' +
    '<div class="seg trip-subtabs" role="group" aria-label="Subtab Perjalanan">' +
    subTabs.map(function (st) { return '<button type="button" class="seg-btn' + (sub === st[0] ? ' active' : '') + '" data-triptab="' + st[0] + '" aria-pressed="' + (sub === st[0]) + '">' + st[1] + '</button>'; }).join('') +
    '</div></div>' + bodyHtml;

  initModernSelects(root);
}

/* ==========================================================================
   OVERRIDES & UNIFIED BINDING
   ========================================================================== */
function applyTripVis() {
  var btnTrip = $('nav-btn-trip');
  if (btnTrip) btnTrip.hidden = false;
}
function tripShow() { applyTripVis(); }
function renderNav() { if (typeof syncSidebarBadges === 'function') syncSidebarBadges(); }
function syncNav() { if (typeof syncSidebarBadges === 'function') syncSidebarBadges(); }
function bindNav() {}
function bindRincian() {}
function bindJadwal() {}
function bindItems() {}
function bindQuickItem() {}
function bindYears() {}
function bindHeader() {}
function bindPrice() {}
function bindIo() {
  try {
    if (typeof claude !== 'undefined' && claude && claude.use) {
      claude.use('downloads').then(function (d) { DL = d; }).catch(function () {});
    }
  } catch (e) {}
}
function bindBackup() {}
function bindDiag() {}
function bindReminders() {}
function bindSkipRange() {}
function bindKas() {}
function bindSim() {}
function bindTrip() {}
function bindXl() {}
function bindQuickKas() {}
function renderAdj() {}

function modeUi() {
  var isTrip = typeof mode !== 'undefined' && mode === 'trip';
  document.querySelectorAll('#browser-shell .tab-panel').forEach(function (el) {
    var active = isTrip ? el.id === 'tab-trip' : el.id === 'tab-' + curTab;
    el.classList.toggle('active', active);
    el.hidden = !active;
  });
  var sbTrip = $('nav-btn-trip');
  if (sbTrip) sbTrip.classList.toggle('active', isTrip);
  document.querySelectorAll('#browser-shell .nav-btn[data-tab]').forEach(function (b) {
    b.classList.toggle('active', !isTrip && b.dataset.tab === curTab);
  });
  var mbMore = $('btn-mobile-more');
  if (mbMore) mbMore.classList.toggle('active', isTrip || curTab === 'sim');
}

function setMode(m) {
  mode = m;
  if (typeof remember === 'function') remember('rk-mode', m);
  if (m === 'trip' && typeof autoTrip === 'function') autoTrip();
  renderAll();
}

function brPopulateYrControls() {
  var yl = $('yl');
  if (yl && !yl.children.length) {
    var htmlY = '';
    for (var y = 2025; y <= 2032; y++) htmlY += '<option value="' + y + '"></option>';
    yl.innerHTML = htmlY;
  }
  var smSel = $('sm');
  if (smSel && !smSel.querySelector('option[value="0"]')) {
    smSel.innerHTML = MON.map(function (mName, idx) {
      return '<option value="' + idx + '">' + mName + '</option>';
    }).join('') + '<option value="auto" id="sm-auto">Otomatis</option>';
  }
  if ($('yr-sum')) $('yr-sum').textContent = S.year + ' · ' + MON[smEff()] + ' · ' + rp(+S.saldo || 0);
  if ($('year')) $('year').value = S.year;
  if ($('saldo')) $('saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  if (typeof smSyncUI === 'function') smSyncUI();
  if ($('sm')) syncModernSelect($('sm'));
}

function brOpenYrPanel() {
  brPopulateYrControls();
  brOpenModal('yr-panel');
}

function brMonthOptsHtml(selMonth) {
  var html = '';
  for (var m = 0; m < 12; m++) {
    html += '<option value="' + m + '"' + (m === selMonth ? ' selected' : '') + '>' + FULL_MON[m] + ' ' + S.year + '</option>';
  }
  return html;
}

function brRenderScenarioFields(scen, it) {
  if (!it) it = item(BR_STATE.scenItemId) || (S.items && S.items[0]);
  var box = $('scen-editor-fields');
  if (!box || !it) return;
  var mDef = BR_STATE.scenMonth != null ? BR_STATE.scenMonth : Math.max(smEff(), Math.min(11, +todayISO().slice(5, 7) - 1));
  if (scen === 'change_price') {
    box.innerHTML =
      '<div class="grid-2"><div class="field"><label class="field-label" for="scen-new-price">Harga Baru (Rp)</label>' +
      '<input class="input mono" id="scen-new-price" type="text" inputmode="numeric" data-num-fmt="rp" value="' + fmtRpInputStr(String(it.price || 0)) + '" /></div>' +
      '<div class="field"><label class="field-label" for="scen-month">Mulai Bulan</label><select class="input" id="scen-month">' + brMonthOptsHtml(mDef) + '</select></div></div>';
  } else if (scen === 'temp_price') {
    box.innerHTML =
      '<div class="grid-3"><div class="field"><label class="field-label" for="scen-new-price">Harga Promo (Rp)</label>' +
      '<input class="input mono" id="scen-new-price" type="text" inputmode="numeric" data-num-fmt="rp" value="' + fmtRpInputStr(String(it.price || 0)) + '" /></div>' +
      '<div class="field"><label class="field-label" for="scen-month">Dari Bulan</label><select class="input" id="scen-month">' + brMonthOptsHtml(mDef) + '</select></div>' +
      '<div class="field"><label class="field-label" for="scen-month-end">Sampai Bulan</label><select class="input" id="scen-month-end">' + brMonthOptsHtml(mDef) + '</select></div></div>';
  } else if (scen === 'cycle') {
    var curCyc = brCoreToCycle(it);
    box.innerHTML =
      '<div class="field"><label class="field-label" for="scen-cycle-val">Siklus Baru</label><select class="input" id="scen-cycle-val">' +
      '<option value="tiap bulan"' + (curCyc === 'tiap bulan' ? ' selected' : '') + '>Tiap 1 bulan</option>' +
      '<option value="tiap 28 hari"' + (curCyc === 'tiap 28 hari' ? ' selected' : '') + '>Tiap 28 hari</option>' +
      '<option value="sekali saja"' + (curCyc === 'sekali saja' ? ' selected' : '') + '>Sekali saja</option>' +
      '<option value="tiap tahun"' + (curCyc === 'tiap tahun' ? ' selected' : '') + '>Tiap 1 tahun</option></select></div>';
  } else if (scen === 'shift') {
    var occM = occ(it, +S.year).filter(function (t) { return new Date(t).getUTCMonth() === mDef; })[0];
    var defD = occM ? new Date(occM).getUTCDate() : Math.min(28, +String(it.start || '').slice(8, 10) || 15);
    box.innerHTML =
      '<div class="grid-2"><div class="field"><label class="field-label" for="scen-shift-day">Geser ke Tanggal (1–31)</label>' +
      '<input class="input mono" id="scen-shift-day" type="number" min="1" max="31" value="' + defD + '" /></div>' +
      '<div class="field"><label class="field-label" for="scen-month">Bulan</label><select class="input" id="scen-month">' + brMonthOptsHtml(mDef) + '</select></div></div>';
  } else if (scen === 'stop') {
    box.innerHTML = '<div class="field"><label class="field-label" for="scen-month">Berhenti bayar mulai</label><select class="input" id="scen-month">' + brMonthOptsHtml(mDef) + '</select></div>';
  } else {
    box.innerHTML = '<div style="font-size:0.82rem; color:var(--text-secondary);">Klik chip tanggal di tabel Jadwal untuk menandai Lunas, Belum, atau Dilewati satu per satu.</div>';
  }
  BR_STATE.scenType = scen;
  box.dataset.activeScen = scen;
  if ($('ms-err')) $('ms-err').textContent = '';
  initModernSelects(box);
}

function brOpenScenarioModal(itemId, iso) {
  var it = item(itemId) || (S.items && S.items[0]);
  if (!it) return toast('Belum ada item.');
  BR_STATE.scenItemId = it.id;
  BR_STATE.scenMonth = iso && iso.length >= 7 ? (+iso.slice(5, 7) - 1) : Math.max(smEff(), Math.min(11, +todayISO().slice(5, 7) - 1));
  if ($('ms-title')) $('ms-title').textContent = 'Ubah Harga / Jadwal — ' + it.name;
  document.querySelectorAll('#scenario-cards-grid .scen-card').forEach(function (c) {
    c.classList.toggle('active', c.dataset.scen === 'change_price');
  });
  brRenderScenarioFields('change_price', it);
  brOpenModal('modal-scenario');
}
function openPm(itemId, iso) { brOpenScenarioModal(itemId, iso); }

function brSaveScenario() {
  var it = item(BR_STATE.scenItemId);
  if (!it) return;
  var scen = BR_STATE.scenType || 'change_price',
    mEl = $('scen-month'), m = mEl ? +mEl.value : smEff(),
    y = +S.year,
    setErr = function (msg) { if ($('ms-err')) $('ms-err').textContent = msg; };
  setErr('');
  if (scen === 'manual') { brCloseModal('modal-scenario'); return; }
  it.ch = it.ch || [];
  if (scen === 'change_price' || scen === 'temp_price') {
    var np = getRpVal('scen-new-price');
    if (!(np > 0)) return setErr('Isi nominal harga baru yang valid.');
    var fromIso = y + '-' + pad2(m + 1) + '-01';
    var toIso = '';
    if (scen === 'temp_price') {
      var mEnd = $('scen-month-end') ? +$('scen-month-end').value : m;
      if (mEnd < m) return setErr('Bulan akhir promo tidak boleh sebelum bulan mulai.');
      toIso = isoD(Date.UTC(y, mEnd + 1, 0));
    }
    it.ch = it.ch.filter(function (c) { return !(c.from === fromIso && c.to === toIso && !c.mv); });
    it.ch.push({ from: fromIso, to: toIso, price: np, n: null, unit: null, cut: false });
  } else if (scen === 'cycle') {
    var cyc = brCycleToCore($('scen-cycle-val') ? $('scen-cycle-val').value : 'tiap bulan');
    it.n = cyc.n;
    it.unit = cyc.unit;
  } else if (scen === 'shift') {
    var targetDay = Math.min(31, Math.max(1, parseInt($('scen-shift-day') && $('scen-shift-day').value, 10) || 15));
    var listOcc = occ(it, y), occInM = listOcc.filter(function (t) { return new Date(t).getUTCMonth() === m; })[0];
    if (!occInM) return setErr('Tidak ada tagihan di bulan ' + FULL_MON[m] + '.');
    var origIso = isoD(occInM);
    var dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var newIso = y + '-' + pad2(m + 1) + '-' + pad2(Math.min(dim, targetDay));
    if (newIso !== origIso) {
      if (typeof moveStatusExact === 'function') moveStatusExact(it.id, [[origIso, newIso]], [S.paid, S.skip], [S.real || {}]);
      var mvObj = {};
      mvObj[origIso] = newIso;
      it.ch.push({ from: origIso, to: newIso, mv: mvObj });
    }
  } else if (scen === 'stop') {
    it.end = isoD(Date.UTC(y, m, 0));
    it.cnt = 0;
  }
  save(); renderAll(); brCloseModal('modal-scenario'); toast('Jadwal ' + it.name + ' diperbarui');
}

function brRenderLgModal() {
  var u = typeof sbUser !== 'undefined' ? sbUser : null,
    loginPane = $('lg-login-pane'),
    acctPane = $('lg-account-pane');
  if (!loginPane || !acctPane) return;
  if ($('lm')) $('lm').textContent = '';
  if (u) {
    loginPane.hidden = true;
    acctPane.hidden = false;
    var du = typeof rkDisplayUser === 'function' ? rkDisplayUser(u) : { name: 'Pengguna', initial: 'P' };
    acctPane.innerHTML =
      '<div class="upcoming-item" style="background:var(--emerald-soft);border-color:var(--emerald-border);">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="av-circle" style="background:linear-gradient(135deg,var(--accent),#0D7A52);color:#fff;border:none;width:42px;height:42px;">' + esc(du.initial || 'U') + '</div>' +
      '<div><div style="font-weight:700;font-size:0.95rem;">' + esc(du.name) + '</div>' +
      '<div style="font-size:0.78rem;color:var(--text-secondary);">' + esc(u.email || 'Tersinkron') + '</div></div></div>' +
      '<span class="badge badge-emerald">☁ Tersinkron</span></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;padding-top:6px;">' +
      '<button type="button" class="btn btn-crimson btn-sm" id="br-btn-signout">Keluar dari Akun</button></div>';
  } else {
    acctPane.hidden = true;
    loginPane.hidden = false;
    if (typeof sb === 'undefined' || !sb) {
      if ($('lm')) $('lm').textContent = 'Mode lokal aktif. Isi SB_URL & SB_KEY di js/config.js untuk sinkronisasi cloud Supabase.';
    }
  }
}

function brOpenTripMetaModal(isEdit) {
  var tr = isEdit ? tp() : null;
  BR_STATE.tripModalMode = tr ? 'edit' : 'new';
  BR_STATE.tripEditId = tr ? tr.id : null;
  if ($('kpt-title')) $('kpt-title').textContent = tr ? 'Ubah Perjalanan' : 'Perjalanan Baru';
  if ($('kp-name')) $('kp-name').value = tr ? tr.name : '';
  BR_STATE.inlineDates.kpStart = (tr && tr.start) || todayISO();
  BR_STATE.inlineDates.kpEnd = (tr && tr.end) || addDaysISO(todayISO(), 4);
  if ($('kp-start-lbl')) $('kp-start-lbl').textContent = brFmtShortIndo(BR_STATE.inlineDates.kpStart) + ' ' + BR_STATE.inlineDates.kpStart.slice(0, 4);
  if ($('kp-end-lbl')) $('kp-end-lbl').textContent = brFmtShortIndo(BR_STATE.inlineDates.kpEnd) + ' ' + BR_STATE.inlineDates.kpEnd.slice(0, 4);
  if ($('kp-use-budget')) { $('kp-use-budget').value = tr && tr.budget ? '1' : '0'; syncModernSelect('kp-use-budget'); }
  if ($('kp-budget-wrap')) $('kp-budget-wrap').style.display = ($('kp-use-budget') && $('kp-use-budget').value === '1') ? 'flex' : 'none';
  if ($('kp-budget')) setRpVal('kp-budget', tr && tr.budget ? tr.budget : '');
  if ($('kp-cur')) $('kp-cur').value = tr ? (tr.cur || '') : '';
  if ($('kp-rate')) $('kp-rate').value = tr && tr.rate ? tr.rate : '';
  brOpenModal('modal-trip-form');
}

function brOpenChipPopover(chipBtn) {
  var pop = $('chip-popover');
  if (!pop || !chipBtn) return;
  var itId = chipBtn.getAttribute('data-chip-it'),
    iso = chipBtn.getAttribute('data-chip-iso'),
    pr = +chipBtn.getAttribute('data-chip-pr') || 0,
    it = item(itId);
  if (!it) return;
  var k = it.id + '|' + iso;
  BR_STATE.chipCtx = { itemId: it.id, iso: iso, key: k };
  if ($('cp-title')) $('cp-title').textContent = it.name + ' · ' + fmtD(iso);
  if ($('cp-sub')) $('cp-sub').textContent = rp(pr) + ' · ' + (S.skip[k] ? 'Dilewati' : S.paid[k] ? 'Sudah dibayar' : 'Belum dibayar');
  var r = chipBtn.getBoundingClientRect();
  if (typeof window !== 'undefined') {
    var popW = 246, popH = 198,
      left = Math.min(Math.max(12, window.innerWidth - popW - 12), Math.max(12, r.left - 40)),
      top = r.bottom + 8 + popH > window.innerHeight ? Math.max(12, r.top - popH - 8) : Math.max(12, r.bottom + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  pop.classList.add('open');
}

function brBindEvents() {
  brSanitizeItems();
  var sh = $('browser-shell');
  if (!sh || sh._brBound) return;
  sh._brBound = true;

  initModernSelects(sh);
  brUpdateQuickParsePreview();
  brRenderLgModal();

  // Populate quick-tx categories
  var qCat = $('qtx-cat');
  if (qCat) {
    qCat.innerHTML = KAS_OUT.concat(KAS_IN).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    syncModernSelect(qCat);
  }

  // Year pills (#yb) & Dialog "+" (#yr-panel)
  brPopulateYrControls();
  if ($('sm')) {
    $('sm').onchange = function () {
      setStartMonth(this.value === 'auto' ? 'auto' : +this.value);
    };
  }
  if ($('saldo')) {
    $('saldo').onchange = function () {
      S.saldo = parseRp(this.value);
      this.value = S.saldo.toLocaleString('id-ID');
      save();
      renderAll();
    };
  }
  if ($('yb')) {
    $('yb').onclick = function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.y) { switchYear(+b.dataset.y); return; }
      if (b.dataset.dy) {
        var yy = S.year;
        askConfirm('Hapus tahun <b>' + yy + '</b> beserta ' + S.items.length + ' item dan status pembayarannya?', delYear, 'Ya, hapus tahun');
      }
    };
  }
  if ($('yr-btn')) {
    $('yr-btn').onclick = function (e) { e.stopPropagation(); brOpenYrPanel(); };
  }
  if ($('yr-close')) {
    $('yr-close').onclick = function () { brCloseModal('yr-panel'); };
  }
  if ($('yr-done')) {
    $('yr-done').onclick = function () {
      var v = parseInt($('year') ? $('year').value : S.year, 10);
      if (!(v >= 1900 && v <= 2200)) return toast('Tahun harus antara 1900 dan 2200');
      var salVal = $('saldo') ? getRpVal('saldo') : (+S.saldo || 0);
      var smVal = $('sm') ? $('sm').value : String(smEff());
      if (v !== +S.year) switchYear(v);
      S.saldo = salVal;
      setStartMonth(smVal === 'auto' ? 'auto' : +smVal);
      brCloseModal('yr-panel');
      toast('Profil tahun ' + S.year + ' disimpan');
    };
  }

  // Backup (#bk, #fi) & Excel Trip Import (#xlf)
  if ($('bk')) {
    $('bk').onclick = function () {
      if (alatMenu) alatMenu.classList.remove('open');
      if ($('xm')) $('xm').textContent = '';
      brOpenModal('modal-backup');
    };
  }
  if ($('fi')) {
    $('fi').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { if (typeof doImport === 'function') doImport(rd.result); };
      rd.onerror = function () { toast('Gagal membaca file.'); };
      rd.readAsText(f);
      this.value = '';
    };
  }
  if ($('xlf')) {
    $('xlf').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f || typeof loadXlsx !== 'function' || typeof xlParse !== 'function') return;
      loadXlsx().then(function (X) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var d = xlParse(X.read(fr.result, { type: 'array', cellDates: true }));
            if (!d.it.length && !d.bk.length) return toast('Format Excel tidak dikenali. Unduh Template Excel terlebih dahulu.');
            var base = (f.name || 'Perjalanan').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 30) || 'Perjalanan Impor';
            var nm = base, k = 2;
            while (trips().some(function (x) { return x.name.toLowerCase() === nm.toLowerCase(); })) nm = base.slice(0, 26) + ' (' + k++ + ')';
            var id = 'p' + Date.now().toString(36), re = function (a, p) { return a.map(function (x) { return Object.assign({}, x, { id: kid(p) }); }); };
            ALL.kas.pr[id] = { id: id, name: nm, saldo: 0, link: false, start: d.start, end: d.end, budget: 0, cur: d.cur || '', rate: d.cur ? 100 : 0, dt: d.dt, tx: [], it: re(d.it, 'i'), bk: re(d.bk, 'b'), lk: re(d.lk, 'l'), ck: [], note: '', goal: null };
            save(); setMode('trip'); setTrip(id); BR_STATE.tripView = 'detail'; renderAll();
            toast('Perjalanan "' + nm + '" diimpor (' + d.it.length + ' kegiatan, ' + d.bk.length + ' pemesanan)');
          } catch (err) { toast('File Excel tidak dapat dibaca.'); }
        };
        fr.readAsArrayBuffer(f);
      }).catch(function (err) { toast((err && err.message) || 'Gagal memuat pembaca Excel.'); });
    };
  }

  // Scenario modal (#modal-scenario)
  document.querySelectorAll('#scenario-cards-grid .scen-card').forEach(function (c) {
    c.addEventListener('click', function () {
      document.querySelectorAll('#scenario-cards-grid .scen-card').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active');
      brRenderScenarioFields(c.dataset.scen);
    });
  });
  if ($('btn-save-scenario')) $('btn-save-scenario').onclick = brSaveScenario;

  // Sidebar collapse & Trip nav & Account shortcut
  if ($('sb-toggle')) {
    $('sb-toggle').onclick = function () {
      var col = document.body.classList.toggle('sidebar-collapsed');
      $('sb-toggle').setAttribute('aria-expanded', String(!col));
    };
  }
  if ($('nav-btn-trip')) {
    $('nav-btn-trip').onclick = function () { setMode(mode === 'trip' ? 'rencana' : 'trip'); };
  }

  // Alat menu popover
  var alatBtn = $('alat-btn'), alatMenu = $('alat-menu');
  if (alatBtn && alatMenu) {
    alatMenu.hidden = false;
    alatBtn.onclick = function (e) {
      e.stopPropagation();
      alatMenu.hidden = false;
      if ($('notif-popover')) $('notif-popover').classList.remove('open');
      if ($('chip-popover')) $('chip-popover').classList.remove('open');
      var open = alatMenu.classList.toggle('open');
      alatBtn.setAttribute('aria-expanded', String(open));
    };
  }
  if ($('btn-notif')) {
    $('btn-notif').onclick = function (e) {
      e.stopPropagation();
      renderDesktopNotifs();
      if ($('notif-popover')) $('notif-popover').classList.toggle('open');
    };
  }
  if ($('desk-rmh')) {
    $('desk-rmh').onchange = function () {
      if (typeof remHz !== 'undefined') remHz = +this.value || 7;
      if (typeof saveRemPrefs === 'function') saveRemPrefs();
      renderDesktopNotifs();
    };
  }
  if ($('desk-push-perm')) {
    $('desk-push-perm').onclick = function () {
      if (typeof requestNotifPermission === 'function') requestNotifPermission();
    };
  }
  if ($('desk-mark-late-btn')) {
    $('desk-mark-late-btn').onclick = function () {
      var r = reminders(typeof remHz !== 'undefined' ? remHz : 7);
      (r.late || []).forEach(function (x) { S.paid[x.key] = 1; delete S.skip[x.key]; });
      save(); renderAll(); toast('Tagihan terlewat ditandai lunas');
    };
  }

  // Mobile sheet
  if ($('btn-mobile-more') && $('mobile-more-sheet')) {
    $('btn-mobile-more').onclick = function () { $('mobile-more-sheet').classList.add('open'); };
    $('mobile-more-sheet').onclick = function (e) { if (e.target.id === 'mobile-more-sheet') e.currentTarget.classList.remove('open'); };
  }
  if ($('btn-open-jadwal')) $('btn-open-jadwal').onclick = function () { tab('jadwal'); };

  // Report modal close sync + Alat triggers
  document.querySelectorAll('#alat-menu [data-rep], #mobile-more-sheet [data-mob-rep]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (alatMenu) alatMenu.classList.remove('open');
      if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open');
      var k = b.dataset.rep || b.dataset.mobRep || 'm';
      if (typeof openRepModal === 'function') openRepModal(k);
    });
  });

  // Delegated click handler inside #browser-shell
  sh.addEventListener('click', function (e) {
    var t = e.target;

    // 1. Segmented buttons in Rincian
    var rng = t.closest('[data-range]');
    if (rng) {
      BR_STATE.cashRange = rng.dataset.range; BR_STATE.pinnedCashIdx = null;
      sh.querySelectorAll('[data-range]').forEach(function (x) { x.classList.toggle('active', x === rng); x.setAttribute('aria-pressed', String(x === rng)); });
      renderCashflowChart(); return;
    }
    var bsp = t.closest('[data-bsperiod]');
    if (bsp) {
      BR_STATE.bsPeriod = bsp.dataset.bsperiod; BR_STATE.pinnedBarIdx = null;
      sh.querySelectorAll('[data-bsperiod]').forEach(function (x) { x.classList.toggle('active', x === bsp); x.setAttribute('aria-pressed', String(x === bsp)); });
      renderBarCompareChart(); return;
    }
    var wp = t.closest('[data-where-period]');
    if (wp) {
      BR_STATE.wherePeriod = wp.dataset.wherePeriod; BR_STATE.whereLock = null; BR_STATE.whereHover = null;
      sh.querySelectorAll('[data-where-period]').forEach(function (x) { x.classList.toggle('active', x === wp); x.setAttribute('aria-pressed', String(x === wp)); });
      renderWhereMoney(); return;
    }
    var wd = t.closest('[data-where-dir]');
    if (wd) {
      BR_STATE.whereDir = wd.dataset.whereDir; BR_STATE.whereLock = null; BR_STATE.whereHover = null;
      sh.querySelectorAll('[data-where-dir]').forEach(function (x) { x.classList.toggle('active', x === wd); x.setAttribute('aria-pressed', String(x === wd)); });
      renderWhereMoney(); return;
    }
    if (t.closest('#btn-reset-where-cat')) {
      BR_STATE.whereLock = null; BR_STATE.whereHover = null; brApplyWhereHighlight(); return;
    }
    var txf = t.closest('[data-txf]');
    if (txf) {
      var v = txf.dataset.txf; BR_STATE.txFilter = v === 'out' ? '-' : v === 'in' ? '+' : 'all';
      sh.querySelectorAll('[data-txf]').forEach(function (x) { x.classList.toggle('active', x === txf); x.setAttribute('aria-pressed', String(x === txf)); });
      renderRincian(); return;
    }
    var brPaid = t.closest('[data-br-paid]');
    if (brPaid) {
      var pk = brPaid.dataset.brPaid;
      S.paid[pk] = 1; delete S.skip[pk]; save(); renderAll(); toast('Tagihan ditandai lunas'); return;
    }
    var flowRow = t.closest('[data-flow-m]');
    if (flowRow) {
      var dr = $('flow-drawer-' + flowRow.dataset.flowM);
      if (dr) dr.style.display = dr.style.display === 'none' ? 'table-row' : 'none';
      return;
    }

    // 2. Notif actions
    var dn = t.closest('[data-dnotif-act]');
    if (dn) {
      var yrKey = dn.dataset.dy, ky = dn.dataset.dk, Y = ALL.data[yrKey] || S;
      if (dn.dataset.dnotifAct === 'paid') { Y.paid[ky] = 1; delete Y.skip[ky]; }
      else { Y.skip[ky] = 1; delete Y.paid[ky]; }
      save(); renderAll(); toast('Status tagihan diperbarui'); return;
    }

    // 3. Jadwal filter & guide & chips
    if (t.closest('#btn-toggle-guide')) {
      var open = $('jadwal-guide').classList.toggle('open');
      t.closest('#btn-toggle-guide').setAttribute('aria-expanded', String(open));
      return;
    }
    var jf = t.closest('[data-jfilter]');
    if (jf) {
      BR_STATE.jadwalFilter = jf.dataset.jfilter; BR_STATE.pinnedJadwalIds = {};
      sh.querySelectorAll('[data-jfilter]').forEach(function (x) { x.classList.toggle('active', x === jf); x.setAttribute('aria-pressed', String(x === jf)); });
      renderJadwal(); return;
    }
    var chipBtn = t.closest('[data-chip-it]');
    if (chipBtn) { e.stopPropagation(); brOpenChipPopover(chipBtn); return; }
    var cpAct = t.closest('[data-cp-act]');
    if (cpAct && BR_STATE.chipCtx) {
      var ctx = BR_STATE.chipCtx, act = cpAct.dataset.cpAct;
      $('chip-popover').classList.remove('open');
      if (act === 'edit') { brOpenScenarioModal(ctx.itemId, ctx.iso); return; }
      var snChip = act === 'skip' ? snap('Sebelum lewati tagihan') : null;
      if (act === 'paid') { S.paid[ctx.key] = 1; delete S.skip[ctx.key]; if (BR_STATE.jadwalFilter === 'unpaid') BR_STATE.pinnedJadwalIds[ctx.itemId] = 1; }
      else if (act === 'unpaid') { delete S.paid[ctx.key]; delete S.skip[ctx.key]; if (BR_STATE.jadwalFilter === 'paid') BR_STATE.pinnedJadwalIds[ctx.itemId] = 1; }
      else if (act === 'skip') {
        S.skip[ctx.key] = 1; delete S.paid[ctx.key];
        if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate([25, 35, 25]); } catch (x) {} }
      }
      save(); renderAll();
      if (act === 'skip' && snChip) {
        var itS = item(ctx.itemId);
        toast('Dilewati: ' + (itS ? itS.name : 'tagihan') + ' · ' + fmtD(ctx.iso), function () { restoreSnap(snChip.t); });
      } else {
        toast('Status jadwal diperbarui');
      }
      return;
    }
    var pmBtn = t.closest('[data-pm-item]');
    if (pmBtn) { brOpenScenarioModal(pmBtn.dataset.pmItem); return; }

    // 4. Kas interactions
    var kt = t.closest('[data-kas-type]');
    if (kt) {
      BR_STATE.kasType = kt.dataset.kasType === 'in' ? '+' : '-';
      sh.querySelectorAll('[data-kas-type]').forEach(function (x) { x.classList.toggle('active', x === kt); x.setAttribute('aria-pressed', String(x === kt)); });
      renderKas(); return;
    }
    var qa = t.closest('.quick-amt');
    if (qa) { setRpVal('kas-amount', getRpVal('kas-amount') + (+qa.dataset.amt || 0)); return; }
    var kc = t.closest('[data-kcat-opt]');
    if (kc) { BR_STATE.kasCat = kc.dataset.kcatOpt; renderKas(); return; }
    if (t.closest('#kas-date-trigger')) {
      e.stopPropagation(); closeAllPickersAndMenus($('kas-cal-popover')); brDrawKasCal(); $('kas-cal-popover').classList.toggle('open'); return;
    }
    var kcalMv = t.closest('[data-kcal-mv]');
    if (kcalMv) {
      e.stopPropagation();
      if (!BR_STATE.kasCalYear) BR_STATE.kasCalYear = +todayISO().slice(0, 4);
      BR_STATE.kasCalMonth = (BR_STATE.kasCalMonth != null ? BR_STATE.kasCalMonth : +todayISO().slice(5, 7) - 1) + (+kcalMv.dataset.kcalMv);
      if (BR_STATE.kasCalMonth < 0) { BR_STATE.kasCalMonth = 11; BR_STATE.kasCalYear--; }
      if (BR_STATE.kasCalMonth > 11) { BR_STATE.kasCalMonth = 0; BR_STATE.kasCalYear++; }
      brDrawKasCal(); return;
    }
    var kcalD = t.closest('[data-kcal-d]');
    if (kcalD) {
      var ds = kcalD.dataset.kcalD;
      BR_STATE.kasDate = ds; BR_STATE.kasCalYear = +ds.slice(0, 4); BR_STATE.kasCalMonth = +ds.slice(5, 7) - 1;
      $('kas-cal-popover').classList.remove('open'); renderKas(); return;
    }
    if (t.closest('#kas-range-trigger')) {
      e.stopPropagation(); closeAllPickersAndMenus($('kas-range-popover'));
      if (!BR_STATE.kasRangeViewYear) BR_STATE.kasRangeViewYear = +todayISO().slice(0, 4);
      if (BR_STATE.kasRangeViewMonth == null) BR_STATE.kasRangeViewMonth = +todayISO().slice(5, 7) - 1;
      brDrawKasRangeCal();
      var openR = $('kas-range-popover').classList.toggle('open'); t.closest('#kas-range-trigger').classList.toggle('open', openR); return;
    }
    var krMv = t.closest('[data-krng-mv]');
    if (krMv) {
      e.stopPropagation();
      if (!BR_STATE.kasRangeViewYear) BR_STATE.kasRangeViewYear = +todayISO().slice(0, 4);
      BR_STATE.kasRangeViewMonth = (BR_STATE.kasRangeViewMonth != null ? BR_STATE.kasRangeViewMonth : +todayISO().slice(5, 7) - 1) + (+krMv.dataset.krngMv);
      if (BR_STATE.kasRangeViewMonth < 0) { BR_STATE.kasRangeViewMonth = 11; BR_STATE.kasRangeViewYear--; }
      if (BR_STATE.kasRangeViewMonth > 11) { BR_STATE.kasRangeViewMonth = 0; BR_STATE.kasRangeViewYear++; }
      brDrawKasRangeCal(); return;
    }
    var krD = t.closest('[data-krng-d]');
    if (krD) {
      e.stopPropagation();
      var d2 = krD.dataset.krngD;
      if (!BR_STATE.kasRangeDraftStart) {
        BR_STATE.kasRangeDraftStart = d2; BR_STATE.kasDateFrom = d2; BR_STATE.kasDateTo = d2;
        renderKas(); brDrawKasRangeCal(); return;
      }
      var a0 = BR_STATE.kasRangeDraftStart;
      BR_STATE.kasDateFrom = a0 <= d2 ? a0 : d2; BR_STATE.kasDateTo = a0 <= d2 ? d2 : a0;
      BR_STATE.kasRangeDraftStart = null;
      $('kas-range-popover').classList.remove('open'); renderKas(); return;
    }
    if (t.closest('[data-krng-done]')) { $('kas-range-popover').classList.remove('open'); return; }
    var prBtn = t.closest('[data-preset], [data-preset-pop]');
    if (prBtn) {
      var pr = prBtn.dataset.preset || prBtn.dataset.presetPop, td = todayISO();
      if (pr === 'all') { BR_STATE.kasDateFrom = ''; BR_STATE.kasDateTo = ''; }
      else if (pr === 'month') { BR_STATE.kasDateFrom = td.slice(0, 8) + '01'; BR_STATE.kasDateTo = td; }
      else if (pr === '7d') { BR_STATE.kasDateFrom = addDaysISO(td, -6); BR_STATE.kasDateTo = td; }
      BR_STATE.kasRangeDraftStart = null;
      sh.querySelectorAll('.kas-range-preset').forEach(function (x) {
        x.classList.toggle('badge-accent', x.dataset.preset === pr);
        x.classList.toggle('badge-neutral', x.dataset.preset !== pr);
      });
      renderKas(); if ($('kas-range-popover').classList.contains('open')) brDrawKasRangeCal(); return;
    }
    var kdBtn = t.closest('[data-kdir]');
    if (kdBtn) {
      var dk = kdBtn.dataset.kdir; BR_STATE.kasHistDir = dk === 'in' ? '+' : dk === 'out' ? '-' : 'all';
      sh.querySelectorAll('[data-kdir]').forEach(function (x) { x.classList.toggle('active', x === kdBtn); x.setAttribute('aria-pressed', String(x === kdBtn)); });
      renderKas(); return;
    }
    if (t.closest('#kas-filter-reset')) {
      BR_STATE.kasDateFrom = ''; BR_STATE.kasDateTo = ''; BR_STATE.kasHistDir = 'all'; BR_STATE.kasRangeDraftStart = null;
      if ($('kas-filter-cat')) { $('kas-filter-cat').value = 'all'; syncModernSelect('kas-filter-cat'); }
      if ($('kas-search')) $('kas-search').value = '';
      sh.querySelectorAll('[data-kdir]').forEach(function (x) { x.classList.toggle('active', x.dataset.kdir === 'all'); });
      sh.querySelectorAll('.kas-range-preset').forEach(function (x) { x.classList.toggle('badge-accent', x.dataset.preset === 'all'); x.classList.toggle('badge-neutral', x.dataset.preset !== 'all'); });
      renderKas(); return;
    }
    var dcBtn = t.closest('[data-debt-cicil]');
    if (dcBtn) {
      var nmC = dcBtn.dataset.debtCicil, dkindC = dcBtn.dataset.dk, damtC = +dcBtn.dataset.damt || 0;
      var kType = dkindC === 'bayar-utang' ? '-' : '+';
      BR_STATE.kasEditId = null;
      BR_STATE.kasType = kType;
      BR_STATE.kasCat = 'Lainnya';
      BR_STATE.kasDate = todayISO();
      sh.querySelectorAll('[data-kas-type]').forEach(function (x) {
        var on = (x.dataset.kasType === 'in') === (kType === '+');
        x.classList.toggle('active', on);
        x.setAttribute('aria-pressed', String(on));
      });
      if ($('kas-is-debt')) $('kas-is-debt').checked = true;
      if ($('kas-debt-opts')) $('kas-debt-opts').hidden = false;
      renderKas();
      if ($('kas-debt-kind')) { $('kas-debt-kind').value = dkindC; syncModernSelect('kas-debt-kind'); }
      if ($('kas-debt-person')) $('kas-debt-person').value = nmC;
      if ($('kas-note')) $('kas-note').value = (dkindC === 'bayar-utang' ? 'Cicil utang ' : 'Cicil piutang ') + nmC;
      setRpVal('kas-amount', '');
      if ($('kas-amount')) {
        $('kas-amount').placeholder = damtC > 0 ? ('Sisa ' + rp(damtC)) : '50.000';
        if ($('kas-amount').scrollIntoView) $('kas-amount').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('kas-amount').focus();
      }
      return;
    }
    var dpBtn = t.closest('[data-debt-pay]');
    if (dpBtn) {
      var P0 = kasLinked(), nm = dpBtn.dataset.debtPay, dkind = dpBtn.dataset.dk, damt = +dpBtn.dataset.damt || 0;
      if (P0 && damt > 0) {
        var dirD = dkind === 'bayar-utang' ? '-' : '+';
        P0.tx.push({ id: kid('k'), d: todayISO(), t: dirD, amt: damt, cat: 'Lainnya', note: 'Pelunasan ' + nm, pay: '', debt: 1, debtKind: dkind, debtName: nm });
        save(); renderAll(); toast('Utang/piutang ' + nm + ' dilunasi');
      }
      return;
    }
    var kEdit = t.closest('[data-kedit]');
    if (kEdit) {
      var P1 = kasLinked(), tx0 = P1 && P1.tx.filter(function (x) { return x.id === kEdit.dataset.kedit; })[0];
      if (tx0) {
        BR_STATE.kasEditId = tx0.id; BR_STATE.kasType = tx0.t; BR_STATE.kasCat = tx0.cat || 'Lainnya'; BR_STATE.kasDate = tx0.d;
        setRpVal('kas-amount', tx0.amt); if ($('kas-note')) $('kas-note').value = tx0.note || '';
        if ($('kas-form-title')) $('kas-form-title').textContent = 'Ubah Transaksi';
        if ($('kas-save-btn')) $('kas-save-btn').textContent = 'Simpan Perubahan';
        if ($('kas-cancel-edit')) $('kas-cancel-edit').hidden = false;
        renderKas(); $('kas-amount').focus();
      }
      return;
    }
    if (t.closest('#kas-cancel-edit')) {
      BR_STATE.kasEditId = null; $('kas-form').reset();
      if ($('kas-form-title')) $('kas-form-title').textContent = 'Catat Transaksi Baru';
      if ($('kas-save-btn')) $('kas-save-btn').textContent = 'Simpan ke Catatan Kas';
      $('kas-cancel-edit').hidden = true; return;
    }
    var kDel = t.closest('[data-kdel]');
    if (kDel) {
      var P2 = kasLinked(), tid = kDel.dataset.kdel;
      askConfirm('Hapus transaksi ini?', function () {
        var sn = snap('Sebelum hapus transaksi');
        if (P2) P2.tx = P2.tx.filter(function (x) { return x.id !== tid; });
        save(); renderAll(); toast('Transaksi dihapus', function () { restoreSnap(sn.t); });
      }, 'Ya, hapus');
      return;
    }

    // 5. Quick tx modal
    if (t.closest('#btn-open-quick-tx')) { brOpenModal('modal-quick-tx'); return; }
    if (t.closest('#qtx-close') || t.closest('#qtx-cancel')) { brCloseModal('modal-quick-tx'); return; }
    var qtBtn = t.closest('[data-qtype]');
    if (qtBtn) {
      BR_STATE.quickTxType = qtBtn.dataset.qtype === 'in' ? '+' : '-';
      sh.querySelectorAll('[data-qtype]').forEach(function (x) { x.classList.toggle('active', x === qtBtn); });
      return;
    }

    var closeM = t.closest('[data-close-modal]');
    if (closeM) { brCloseModal(closeM.dataset.closeModal); return; }
    var bkEx = t.closest('#modal-backup [data-ex], [data-bk-ex]');
    if (bkEx && typeof doExport === 'function') { doExport(bkEx.dataset.ex || bkEx.dataset.bkEx); return; }
    if (t.closest('#btn-bk-imp') && $('fi')) { $('fi').click(); return; }
    var tripSh = t.closest('#modal-trip-share [data-sh]');
    if (tripSh) {
      var Psh = tp();
      if (!Psh) return;
      var incCost = $('sh-inc-cost') ? $('sh-inc-cost').checked : true, sKind = tripSh.dataset.sh;
      if (sKind === 'pdf' && typeof printHtml === 'function') { brCloseModal('modal-trip-share'); printHtml(tripPrintHtml(Psh, incCost)); return; }
      var txtSh = typeof tripText === 'function' ? tripText(Psh, incCost) : Psh.name;
      if (sKind === 'wa') {
        if (navigator.share) navigator.share({ title: Psh.name, text: txtSh }).catch(function () {});
        else window.open('https://wa.me/?text=' + encodeURIComponent(txtSh), '_blank', 'noopener');
        brCloseModal('modal-trip-share');
      } else if (typeof copyText === 'function') {
        copyText(txtSh).then(function () {
          if ($('sh-status')) $('sh-status').textContent = 'Teks disalin. Tinggal tempel di WhatsApp atau catatan.';
          toast('Itinerary disalin');
        });
      }
      return;
    }

    // 6. Items tab
    var qpEx = t.closest('.qp-example');
    if (qpEx && $('qp-input')) { $('qp-input').value = qpEx.dataset.qp; brUpdateQuickParsePreview(); return; }
    if (t.closest('#qp-submit')) {
      var rQp = parseQuickItem($('qp-input') ? $('qp-input').value : '', S.year);
      if (!rQp || rQp.error) { if ($('qp-err')) $('qp-err').textContent = (rQp && rQp.error) || 'Format item cepat belum sesuai.'; return; }
      var newQp = brQuickBuildItem(rQp);
      S.items.push(newQp); save(); $('qp-input').value = ''; brUpdateQuickParsePreview(); renderAll(); toast('"' + newQp.name + '" ditambahkan'); return;
    }
    var icOpt = t.closest('[data-icat-opt]');
    if (icOpt) { BR_STATE.itemCat = icOpt.dataset.icatOpt; brRenderCatPills('item-cat-pills', BR_ITEM_CATS, BR_STATE.itemCat, 'data-icat-opt'); return; }
    if (t.closest('#item-cancel-btn')) { resetForm(); return; }
    var itEditBtn = t.closest('#tab-item [data-it-edit]');
    if (itEditBtn) {
      var it0 = item(itEditBtn.dataset.itEdit);
      if (it0) {
        BR_STATE.itemEditId = it0.id;
        if ($('item-form-title')) $('item-form-title').textContent = 'Ubah Item: ' + it0.name;
        if ($('item-save-btn')) $('item-save-btn').textContent = 'Simpan Perubahan';
        if ($('item-cancel-btn')) $('item-cancel-btn').hidden = false;
        if ($('item-name')) $('item-name').value = it0.name;
        setRpVal('item-price', it0.price);
        if ($('item-cycle')) { $('item-cycle').value = brCoreToCycle(it0); syncModernSelect('item-cycle'); }
        BR_STATE.inlineCalView['item-date-cal'] = null;
        brSyncItemDateUI(it0.start || brDefaultItemDate());
        if (BR_ITEM_CATS.indexOf(it0.cat) >= 0) BR_STATE.itemCat = it0.cat;
        else BR_STATE.itemCat = 'Lainnya';
        brRenderCatPills('item-cat-pills', BR_ITEM_CATS, BR_STATE.itemCat, 'data-icat-opt');
      }
      return;
    }
    var itDelBtn = t.closest('#tab-item [data-it-del]');
    if (itDelBtn) {
      var idDel = itDelBtn.dataset.itDel, itD = item(idDel);
      askConfirm('Hapus item <b>' + esc(itD ? itD.name : '') + '</b>?', function () {
        var sn = snap('Sebelum hapus item');
        S.items = S.items.filter(function (x) { return x.id != idDel; });
        save(); renderAll(); toast('Item dihapus', function () { restoreSnap(sn.t); });
      }, 'Ya, hapus');
      return;
    }
    if (t.closest('#btn-copy-next-yr')) {
      var targetY = +S.year + 1;
      if (!ALL.data[targetY]) ALL.data[targetY] = { year: targetY, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
      var existing = ALL.data[targetY].items, copied = 0;
      S.items.forEach(function (it) {
        if (!existing.some(function (x) { return x.name.toLowerCase() === it.name.toLowerCase(); })) {
          existing.push(JSON.parse(JSON.stringify(Object.assign({}, it, { id: Date.now() + copied++ }))));
        }
      });
      save(); renderAll(); toast(copied ? copied + ' item disalin ke ' + targetY : 'Semua item sudah ada di ' + targetY);
      return;
    }

    // 7. Simulasi tab
    var smDel = t.closest('[data-br-smdel]');
    if (smDel) { SIM.splice(+smDel.dataset.brSmdel, 1); renderSim(); return; }
    if (t.closest('#btn-apply-sim')) {
      SIM = SIM.filter(function (x) { return !x.off; });
      if (!SIM.length) return toast('Tidak ada skenario aktif untuk diterapkan');
      simApply(); return;
    }

    // 8. Trip tab & modals
    if (t.closest('#br-trip-back-list')) { BR_STATE.tripView = 'list'; renderHeaderSummaryIfNeeded(); renderTrip(); return; }
    var tOpen = t.closest('[data-trip-open], [data-trip-pick]');
    if (tOpen) { setTrip(tOpen.dataset.tripOpen || tOpen.dataset.tripPick); BR_STATE.tripView = 'detail'; BR_STATE.tripSubTab = 'ring'; renderAll(); return; }
    var tSub = t.closest('[data-triptab]');
    if (tSub) { BR_STATE.tripSubTab = tSub.dataset.triptab; BR_STATE.tripEditItId = null; BR_STATE.tripEditBkId = null; renderTrip(); return; }
    if (t.closest('#br-trip-new')) { brOpenTripMetaModal(false); return; }
    if (t.closest('#br-trip-edit')) { brOpenTripMetaModal(true); return; }
    if (t.closest('#br-trip-xl') && $('xlf')) { $('xlf').click(); return; }
    if (t.closest('#br-trip-tpl') && typeof xlTemplate === 'function') { xlTemplate(); return; }
    if (t.closest('#br-trip-share')) { if ($('sh-status')) $('sh-status').textContent = ''; brOpenModal('modal-trip-share'); return; }
    if (t.closest('#br-trip-del')) {
      var curTr = tp();
      if (curTr) askConfirm('Hapus perjalanan <b>' + esc(curTr.name) + '</b>?', function () {
        var sn = snap('Sebelum hapus perjalanan');
        delete ALL.kas.pr[curTr.id]; tripAct = ''; BR_STATE.tripView = 'list';
        save(); renderAll(); toast('Perjalanan dihapus', function () { restoreSnap(sn.t); });
      }, 'Ya, hapus');
      return;
    }
    if (t.closest('#kpf-close') || t.closest('#kpf-cancel')) { brCloseModal('modal-trip-form'); return; }
    var icalTrig = t.closest('[data-ical-trig], #kp-start-btn, #kp-end-btn');
    if (icalTrig) {
      e.stopPropagation();
      var spec = icalTrig.id === 'kp-start-btn' ? 'kp-start-cal|kpStart|kp-start-lbl' : icalTrig.id === 'kp-end-btn' ? 'kp-end-cal|kpEnd|kp-end-lbl' : icalTrig.dataset.icalTrig,
        parts = spec.split('|'), popI = $(parts[0]);
      if (popI) { closeAllPickersAndMenus(popI); brDrawInlineCal(parts[0], parts[1], parts[2]); popI.classList.toggle('open'); }
      return;
    }
    var icalMv = t.closest('[data-ical-mv]');
    if (icalMv) {
      e.stopPropagation();
      var p2 = icalMv.dataset.icalMv.split('|'), v2 = BR_STATE.inlineCalView[p2[0]];
      if (v2) { v2.m += (+p2[3]); if (v2.m < 0) { v2.m = 11; v2.y--; } if (v2.m > 11) { v2.m = 0; v2.y++; } brDrawInlineCal(p2[0], p2[1], p2[2]); }
      return;
    }
    var icalPk = t.closest('[data-ical-pick]');
    if (icalPk) {
      e.stopPropagation();
      var p3 = icalPk.dataset.icalPick.split('|');
      BR_STATE.inlineDates[p3[1]] = p3[3];
      BR_STATE.inlineCalView[p3[0]] = { y: +p3[3].slice(0, 4), m: +p3[3].slice(5, 7) - 1 };
      if (p3[1] === 'itemDate' && $('item-date')) $('item-date').value = p3[3];
      if ($(p3[2])) $(p3[2]).textContent = brFmtShortIndo(p3[3]) + ' ' + p3[3].slice(0, 4);
      if ($(p3[0])) $(p3[0]).classList.remove('open');
      return;
    }
    var trAct = tp();
    if (trAct) {
      if (t.closest('[data-it-done]')) { var id1 = t.closest('[data-it-done]').dataset.itDone, x1 = trAct.it.filter(function (x) { return x.id === id1; })[0]; if (x1) { x1.done = !x1.done; save(); renderTrip(); } return; }
      if (t.closest('[data-trip-it-edit]')) {
        BR_STATE.tripEditItId = t.closest('[data-trip-it-edit]').dataset.tripItEdit;
        renderTrip();
        if ($('trip-itin-form') && $('trip-itin-form').scrollIntoView) { try { $('trip-itin-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }
        return;
      }
      if (t.closest('[data-it-cancel]')) { BR_STATE.tripEditItId = null; renderTrip(); return; }
      if (t.closest('[data-trip-it-del]')) { var id2 = t.closest('[data-trip-it-del]').dataset.tripItDel; trAct.it = trAct.it.filter(function (x) { return x.id !== id2; }); if (BR_STATE.tripEditItId === id2) BR_STATE.tripEditItId = null; save(); renderTrip(); return; }
      if (t.closest('[data-bk-pay]')) { var id3 = t.closest('[data-bk-pay]').dataset.bkPay, x3 = trAct.bk.filter(function (x) { return x.id === id3; })[0]; if (x3) { x3.paid = !x3.paid; save(); renderTrip(); } return; }
      if (t.closest('[data-bk-edit]')) { BR_STATE.tripEditBkId = t.closest('[data-bk-edit]').dataset.bkEdit; renderTrip(); return; }
      if (t.closest('[data-bk-cancel]')) { BR_STATE.tripEditBkId = null; renderTrip(); return; }
      if (t.closest('[data-bk-del]')) { var id4 = t.closest('[data-bk-del]').dataset.bkDel; trAct.bk = trAct.bk.filter(function (x) { return x.id !== id4; }); save(); renderTrip(); return; }
      if (t.closest('#br-trip-ck-std')) { CK_STD.forEach(function (txt) { if (!trAct.ck.some(function (x) { return x.text === txt; })) trAct.ck.push({ id: kid('c'), text: txt, done: false }); }); save(); renderTrip(); return; }
      if (t.closest('[data-ck-del]')) { var id5 = t.closest('[data-ck-del]').dataset.ckDel; trAct.ck = trAct.ck.filter(function (x) { return x.id !== id5; }); save(); renderTrip(); return; }
      if (t.closest('[data-lk-del]')) { var id6 = t.closest('[data-lk-del]').dataset.lkDel; trAct.lk = trAct.lk.filter(function (x) { return x.id !== id6; }); save(); renderTrip(); return; }
      if (t.closest('#br-tg-edit')) { BR_STATE.tripGoalEdit = true; renderTrip(); return; }
      if (t.closest('#br-tg-cancel')) { BR_STATE.tripGoalEdit = false; renderTrip(); return; }
      if (t.closest('#br-tg-del')) { trAct.goal = null; BR_STATE.tripGoalEdit = false; save(); renderAll(); return; }
    }

    // 9. Alat & Mobile Sheet Navigation & External Tools
    var goSettings = t.closest('#alat-menu [data-go="settings"], [data-mob-go="settings"]');
    if (goSettings) {
      if (alatMenu) alatMenu.classList.remove('open');
      if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open');
      brOpenYrPanel();
      return;
    }
    var goTrip = t.closest('#alat-menu [data-go="trip"], [data-mob-go="trip"]');
    if (goTrip) {
      if (alatMenu) alatMenu.classList.remove('open');
      if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open');
      setMode('trip'); return;
    }
    var mobSim = t.closest('[data-mob-go="sim"]');
    if (mobSim) { if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open'); setMode('rencana'); tab('sim'); return; }
    var mobBk = t.closest('[data-mob-go="backup"]');
    if (mobBk) { if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open'); if ($('bk')) $('bk').click(); return; }
    var mobThm = t.closest('[data-mob-thm]');
    if (mobThm && $('thm')) { $('thm').click(); return; }
    if (t.closest('#br-btn-signout') && typeof sb !== 'undefined' && sb && sbUser) {
      var doOut = typeof rkSignOut === 'function' ? rkSignOut() : sb.auth.signOut({ scope: 'local' });
      Promise.resolve(doOut).then(function () { brCloseModal('lg'); toast('Keluar dari akun.'); });
      return;
    }
  });

  // Form submissions & live inputs
  sh.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'where-month-select') { BR_STATE.whereMonth = +t.value; BR_STATE.whereLock = null; renderWhereMoney(); }
    else if (t.id === 'kas-is-debt' && $('kas-debt-opts')) $('kas-debt-opts').hidden = !t.checked;
    else if (t.id === 'kas-filter-cat') renderKas();
    else if (t.id === 'item-date' && ISO_RE.test(t.value)) { brSyncItemDateUI(t.value); }
    else if (t.dataset && t.dataset.brSmtog != null) {
      var sIdx = +t.dataset.brSmtog;
      if (SIM[sIdx]) { SIM[sIdx].off = !t.checked; renderSim(); }
    }
    else if (t.id === 'kp-use-budget' && $('kp-budget-wrap')) $('kp-budget-wrap').style.display = t.value === '1' ? 'flex' : 'none';
    else if (t.dataset && t.dataset.ckTog) {
      var trC = tp(), c0 = trC && trC.ck.filter(function (x) { return x.id === t.dataset.ckTog; })[0];
      if (c0) { c0.done = t.checked; save(); renderTrip(); }
    }
  });

  sh.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'kas-search') renderKas();
    else if (t.id === 'qp-input') brUpdateQuickParsePreview();
    else if (t.id === 'trip-note-box' && tp()) {
      tp().note = t.value; clearTimeout(window._brNoteT); window._brNoteT = setTimeout(save, 350);
    } else if (t.dataset && t.dataset.dtDay && tp()) {
      tp().dt[t.dataset.dtDay] = t.value; clearTimeout(window._brDtT); window._brDtT = setTimeout(save, 350);
    }
  });

  sh.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'kas-form') {
      e.preventDefault();
      var P = kasLinked(), amt = getRpVal('kas-amount'), note = ($('kas-note') && $('kas-note').value || '').trim(),
        isDebt = $('kas-is-debt') && $('kas-is-debt').checked, dDate = BR_STATE.kasDate || todayISO();
      if (!P || !(amt > 0)) return;
      var entry = {
        id: BR_STATE.kasEditId || kid('k'),
        d: dDate,
        t: BR_STATE.kasType,
        amt: amt,
        cat: BR_STATE.kasCat,
        note: note || BR_STATE.kasCat,
        pay: '',
      };
      if (isDebt) {
        entry.debt = 1;
        entry.debtKind = $('kas-debt-kind') ? $('kas-debt-kind').value : 'utang';
        entry.debtName = ($('kas-debt-person') && $('kas-debt-person').value.trim()) || entry.note;
      }
      var linkedMatch = null;
      if (BR_STATE.kasEditId) {
        P.tx = P.tx.map(function (x) { return x.id === BR_STATE.kasEditId ? entry : x; });
        BR_STATE.kasEditId = null;
        if ($('kas-cancel-edit')) $('kas-cancel-edit').hidden = true;
      } else {
        P.tx.push(entry);
        linkedMatch = entry.t === '-' && !entry.debt && typeof autoMatchTx === 'function' ? autoMatchTx(entry) : null;
      }
      f.reset();
      if ($('kas-debt-opts')) $('kas-debt-opts').hidden = true;
      setRpVal('kas-amount', '');
      BR_STATE.kasDate = todayISO();
      save(); renderAll();
      if (linkedMatch && typeof toastLinked === 'function') toastLinked(linkedMatch);
      else toast('Transaksi kas tersimpan');
    } else if (f.id === 'quick-tx-form') {
      e.preventDefault();
      var Pq = kasLinked(), amtQ = getRpVal('qtx-amt'), catQ = $('qtx-cat') ? $('qtx-cat').value : 'Lainnya',
        noteQ = ($('qtx-note') && $('qtx-note').value || '').trim(), dQ = todayISO();
      if (!Pq || !(amtQ > 0)) return;
      Pq.tx.push({ id: kid('q'), d: dQ, t: BR_STATE.quickTxType, amt: amtQ, cat: catQ, note: noteQ || catQ, pay: '' });
      f.reset(); brCloseModal('modal-quick-tx'); save(); renderAll(); toast('Transaksi kilat tersimpan');
    } else if (f.id === 'item-form') {
      e.preventDefault();
      if ($('item-form-err')) $('item-form-err').textContent = '';
      var nameI = ($('item-name') && $('item-name').value || '').trim(), priceI = getRpVal('item-price'),
        cycI = brCycleToCore($('item-cycle') ? $('item-cycle').value : 'tiap bulan'),
        dateRaw = $('item-date') ? $('item-date').value : '',
        startI = ISO_RE.test(dateRaw) ? dateRaw : (ISO_RE.test(BR_STATE.inlineDates.itemDate) ? BR_STATE.inlineDates.itemDate : brDefaultItemDate());
      var catI = BR_STATE.itemCat || 'Tagihan rutin';
      var objI = { id: BR_STATE.itemEditId || (Date.now() + Math.floor(Math.random() * 1000)), name: nameI, price: priceI, n: cycI.n, unit: cycI.unit, start: startI, end: '', cnt: 0, cat: catI, ch: [] };
      var errMsg = !nameI ? 'Nama item belum diisi.' : !(priceI > 0) ? 'Nominal harus lebih dari Rp 0.' : !ISO_RE.test(startI) ? 'Tanggal jatuh tempo tidak valid.' : '';
      if (errMsg) { if ($('item-form-err')) $('item-form-err').textContent = errMsg; return; }
      if (BR_STATE.itemEditId) {
        var oldItE = item(BR_STATE.itemEditId), beforeOccE = oldItE ? occ(oldItE, S.year) : [];
        S.items = S.items.map(function (x) {
          if (x.id != BR_STATE.itemEditId) return x;
          var upd = Object.assign({}, x, objI, { end: x.end || '', cnt: x.cnt || 0, ch: x.ch || [] });
          if (typeof remapStatus === 'function') remapStatus(x.id, beforeOccE, occ(upd, S.year), [S.paid, S.skip], [S.real || {}]);
          return upd;
        });
      } else {
        S.items.push(objI);
      }
      save(); resetForm(); renderAll(); toast('Item "' + objI.name + '" disimpan');
    } else if (f.id === 'sim-add-form') {
      e.preventDefault();
      var setSimErr = function (msg) { if ($('sim-err')) $('sim-err').textContent = msg; };
      setSimErr('');
      var dirS = $('sim-new-dir') ? $('sim-new-dir').value : '1',
        titleS = ($('sim-new-title') && $('sim-new-title').value || '').trim(),
        amtS = getRpVal('sim-new-amt');
      if (!titleS) return setSimErr('Isi nama skenario.');
      if (!(amtS > 0)) return setSimErr('Isi nominal yang valid.');
      SIM.push({ k: dirS === '-1' ? 'out' : 'in', name: titleS, amt: amtS, m: smEff(), rep: 'bulanan', n: 1 });
      f.reset(); renderSim(); toast('Skenario ditambahkan');
    } else if (f.id === 'trip-meta-form') {
      e.preventDefault();
      var nmT = ($('kp-name') && $('kp-name').value || '').trim(); if (!nmT) return;
      var budT = ($('kp-use-budget') && $('kp-use-budget').value === '1') ? getRpVal('kp-budget') : 0,
        curT = ($('kp-cur') && $('kp-cur').value || '').trim().toUpperCase(), rateT = parseFloat($('kp-rate') && $('kp-rate').value) || 0,
        stT = BR_STATE.inlineDates.kpStart || '', enT = BR_STATE.inlineDates.kpEnd || '';
      if (BR_STATE.tripModalMode === 'edit' && tp()) {
        Object.assign(tp(), { name: nmT, start: stT, end: enT, budget: budT, cur: curT, rate: curT ? rateT : 0 });
      } else {
        var idNew = kid('p');
        ALL.kas.pr[idNew] = { id: idNew, name: nmT, link: false, saldo: 0, tx: [], start: stT, end: enT, budget: budT, cur: curT, rate: curT ? rateT : 0, dt: {}, it: [], bk: [], lk: [], ck: [], note: '', goal: null };
        tripAct = idNew; BR_STATE.tripView = 'detail'; BR_STATE.tripSubTab = 'ring';
      }
      brCloseModal('modal-trip-form'); save(); renderAll(); toast('Perjalanan disimpan');
    } else if (f.id === 'trip-itin-form' && tp()) {
      e.preventDefault();
      var trI = tp(), objIt = {
        id: BR_STATE.tripEditItId || kid('it'),
        day: BR_STATE.inlineDates.itDay || trI.start || todayISO(),
        time: ($('it-t1') && $('it-t1').value || '').replace('.', ':'),
        time2: ($('it-t2') && $('it-t2').value || '').replace('.', ':'),
        place: ($('it-place') && $('it-place').value || '').trim(),
        est: getRpVal('it-est'),
        fx: $('it-cur') && $('it-cur').value === 'fx',
        pay: $('it-pay') ? $('it-pay').value : 'cash',
        cat: $('it-cat') ? $('it-cat').value : 'Lainnya',
        link: ($('it-link') && $('it-link').value || '').trim(),
        note: ($('it-note') && $('it-note').value || '').trim(),
        done: false,
      };
      if (!objIt.place) return;
      if (BR_STATE.tripEditItId) {
        trI.it = trI.it.map(function (x) { return x.id === BR_STATE.tripEditItId ? Object.assign({}, x, objIt, { done: x.done }) : x; });
        BR_STATE.tripEditItId = null;
      } else trI.it.push(objIt);
      save(); renderTrip();
    } else if (f.id === 'trip-book-form' && tp()) {
      e.preventDefault();
      var trB = tp(), objBk = {
        id: BR_STATE.tripEditBkId || kid('bk'),
        title: ($('bk-title') && $('bk-title').value || '').trim(),
        amt: getRpVal('bk-amt'),
        fx: $('bk-cur') && $('bk-cur').value === 'fx',
        a: BR_STATE.inlineDates.bkStart || '',
        b: BR_STATE.inlineDates.bkEnd || '',
        cat: $('bk-cat') ? $('bk-cat').value : 'Transport',
        pay: 'on', link: '', paid: false,
      };
      if (!objBk.title) return;
      if (BR_STATE.tripEditBkId) {
        trB.bk = trB.bk.map(function (x) { return x.id === BR_STATE.tripEditBkId ? Object.assign({}, x, objBk, { paid: x.paid }) : x; });
        BR_STATE.tripEditBkId = null;
      } else trB.bk.push(objBk);
      save(); renderTrip();
    } else if (f.id === 'trip-ck-form' && tp()) {
      e.preventDefault();
      var txtC = ($('trip-ck-input') && $('trip-ck-input').value || '').trim();
      if (txtC) { tp().ck.push({ id: kid('c'), text: txtC, done: false }); save(); renderTrip(); }
    } else if (f.id === 'trip-lk-form' && tp()) {
      e.preventDefault();
      var tl = ($('trip-lk-title') && $('trip-lk-title').value || '').trim(), ul = ($('trip-lk-url') && $('trip-lk-url').value || '').trim();
      if (tl && ul) { tp().lk.push({ id: kid('l'), title: tl, url: /^https?:\/\//i.test(ul) ? ul : 'https://' + ul }); save(); renderTrip(); }
    } else if (f.id === 'trip-goal-form' && tp()) {
      e.preventDefault();
      var tVal = getRpVal('tg-t'), s0Val = getRpVal('tg-s0'), linkG = !$('tg-link') || $('tg-link').value !== '0',
        fromG = ($('tg-from') && $('tg-from').value) || todayISO().slice(0, 7), toG = ($('tg-to') && $('tg-to').value) || (S.year + '-12');
      if (tVal > 0) {
        tp().goal = { t: tVal, s0: s0Val, from: fromG, to: toG, link: linkG };
        BR_STATE.tripGoalEdit = false; save(); renderAll(); toast('Target tabungan disimpan');
      }
    }
  });

  // Global close popovers & N shortcut
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#notif-popover, #btn-notif') && $('notif-popover')) $('notif-popover').classList.remove('open');
    if (!e.target.closest('#alat-menu, #alat-btn') && alatMenu) { alatMenu.classList.remove('open'); if (alatBtn) alatBtn.setAttribute('aria-expanded', 'false'); }
    if (!e.target.closest('#chip-popover, [data-chip-it]') && $('chip-popover')) $('chip-popover').classList.remove('open');
    if (!e.target.closest('#browser-shell .custom-picker-wrap') && !e.target.closest('#browser-shell .mselect')) closeAllPickersAndMenus(null);
  });

  document.addEventListener('keydown', function (e) {
    if (typeof getShellMode === 'function' && getShellMode() === 'mobile-app') return;
    var tag = ((e.target && e.target.tagName) || '').toLowerCase();
    if (e.key === 'Escape') {
      if ($('chip-popover')) $('chip-popover').classList.remove('open');
      if ($('notif-popover')) $('notif-popover').classList.remove('open');
      if (alatMenu) alatMenu.classList.remove('open');
      if ($('mobile-more-sheet')) $('mobile-more-sheet').classList.remove('open');
      closeAllPickersAndMenus(null);
      ['yr-panel', 'modal-scenario', 'modal-quick-tx', 'modal-backup', 'modal-trip-form', 'modal-trip-share', 'modal-report', 'lg', 'cf'].forEach(brCloseModal);
    } else if (e.key.toLowerCase() === 'n' && !['input', 'textarea', 'select'].includes(tag) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      brOpenModal('modal-quick-tx');
    }
  });
}

function renderHeaderSummaryIfNeeded() {
  if (typeof renderShell === 'function') renderShell();
}

function renderBrowserApp() {
  brBindEvents();
  brPopulateYrControls();
  brSyncAccountUI();
  brRenderLgModal();
  renderDesktopNotifs();
}
