/**
 * Komponen pilihan buatan sendiri (tanpa library, tanpa build):
 *  - pkCal    : kalender satu tanggal untuk SEMUA <input type=date>
 *  - upSelect : dropdown modern untuk SEMUA <select>
 *  - pkRange  : popover rentang tanggal (preset + kalender 1–2 bulan) untuk filter Riwayat
 *  - pkMulti  : dropdown kategori (cari, centang, jumlah) untuk filter Riwayat
 * Elemen asli tetap di DOM dan nilainya tetap sama (ISO / value opsi), jadi kode
 * lama, validasi, dan tes tidak perlu tahu ada lapisan ini.
 */
(function () {
  var W = 'S S R K J S M'.split(' '),
    open = null,
    rAF = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function dim(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  function tday() { return typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10); }
  function mon(y, m) { return (typeof FULL_MON !== 'undefined' ? FULL_MON[m] : MON[m]) + ' ' + y; }
  function lbl(d) { return typeof fmtD === 'function' ? fmtD(d) : d; }
  function shift(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); }

  function place(el, a) {
    var r = a.getBoundingClientRect(),
      w = el.offsetWidth,
      h = el.offsetHeight,
      left = Math.min(Math.max(8, r.left), innerWidth - w - 8),
      top = r.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  }
  function close() {
    if (!open) return;
    open.a.setAttribute('aria-expanded', 'false');
    open.el.remove();
    open = null;
  }
  function pop(a, cls, html) {
    close();
    var el = document.createElement('div');
    el.className = 'pk ' + cls;
    el.setAttribute('role', 'dialog');
    el.innerHTML = html;
    document.body.appendChild(el);
    place(el, a);
    a.setAttribute('aria-expanded', 'true');
    open = { el: el, a: a };
    return el;
  }

  document.addEventListener('pointerdown', function (e) {
    if (open && !open.el.contains(e.target) && !open.a.contains(e.target)) close();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!open || e.key !== 'Escape') return;
    var a = open.a;
    close();
    a.focus();
  });
  addEventListener('resize', close);
  addEventListener('scroll', close, { passive: true });

  function head(y, m) {
    return '<div class="pk-h"><button type="button" data-mv="-1" aria-label="Bulan sebelumnya">&#8249;</button>' +
      '<b>' + mon(y, m) + '</b><button type="button" data-mv="1" aria-label="Bulan berikutnya">&#8250;</button></div>';
  }
  function wdays() {
    return '<div class="pk-w">' + W.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>';
  }
  function grid(y, m, from, to, min, max) {
    var lead = new Date(Date.UTC(y, m, 1)).getUTCDay(),
      n = dim(y, m),
      t = tday(),
      h = '',
      d,
      v,
      off;
    for (d = 0; d < lead; d++) h += '<span></span>';
    for (d = 1; d <= n; d++) {
      v = isoOf(y, m, d);
      off = (min && v < min) || (max && v > max);
      h += '<button type="button" data-d="' + v + '" class="pk-d' +
        (v === from || v === to ? ' on' : '') +
        (v !== from && v !== to && from !== to && v > from && v < to ? ' in' : '') +
        (v === t ? ' td' : '') + (off ? ' off' : '') + '"' + (off ? ' disabled' : '') + '>' + d + '</button>';
    }
    return h;
  }

  /* ---------- kalender satu tanggal ---------- */
  function calOpen(inp, sync) {
    var v = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : tday(),
      min = inp.getAttribute('min'),
      max = inp.getAttribute('max'),
      y = +v.slice(0, 4),
      m = +v.slice(5, 7) - 1;

    function set(d) {
      inp.value = d; // setter di upDate ikut menyegarkan label tombol
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      if (sync) sync();
    }
    function draw() {
      var el = pop(inp, 'pk-cal',
        head(y, m) + wdays() + '<div class="pk-g">' + grid(y, m, inp.value, '', min, max) + '</div>' +
        '<div class="pk-f"><button type="button" class="pk-l" data-t="1">Hari ini</button></div>');
      el.onclick = function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.mv) {
          m += +b.dataset.mv;
          if (m < 0) { m = 11; y--; }
          if (m > 11) { m = 0; y++; }
          return draw();
        }
        if (b.dataset.t) return set(tday());
        if (b.dataset.d) set(b.dataset.d);
      };
    }
    draw();
  }

  /* ---------- upgrade semua input tanggal ---------- */
  var IC =
    '<svg class="pk-ic" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="2.1" y="3.1" width="11.8" height="10.8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.1 6.4h11.8M5.5 1.7v2.5M10.5 1.7v2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function field(el, cls) {
    var wrap = document.createElement('div');
    wrap.className = 'pk-field ' + cls + (el.classList.contains('wauto') ? ' pk-auto' : '');
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    var hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'pk-hit';
    hit.tabIndex = -1;
    hit.setAttribute('aria-haspopup', cls === 'pk-sel' ? 'listbox' : 'dialog');
    wrap.appendChild(hit);
    return { w: wrap, hit: hit };
  }

  var inVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function upDate(inp) {
    if (inp.__pk) return;
    inp.__pk = 1;
    var f = field(inp, 'pk-date');
    inp.classList.add('pk-native');
    inp.tabIndex = -1;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pk-in';
    b.setAttribute('aria-haspopup', 'dialog');
    f.w.insertBefore(b, f.hit);
    f.hit.remove();
    function sync() {
      var v = inp.value;
      b.innerHTML = '<span' + (v ? '' : ' class="pk-ph"') + '>' + (v ? lbl(v) : 'Pilih tanggal') + '</span>' + IC;
      b.setAttribute('aria-label', 'Tanggal: ' + (v ? lbl(v) : 'belum dipilih'));
    }
    Object.defineProperty(inp, 'value', {
      configurable: true,
      get: function () { return inVal.get.call(inp); },
      set: function (x) { inVal.set.call(inp, x); sync(); }
    });
    b.onclick = function () { calOpen(inp, sync); };
    sync();
  }

  /* ---------- upgrade semua select ---------- */
  function upSelect(sel) {
    if (sel.__pk) return;
    sel.__pk = 1;
    var f = field(sel, 'pk-sel');
    f.w.insertAdjacentHTML('beforeend', '<i class="pk-cv"></i>');
    f.hit.onclick = function () {
      var el = pop(f.w, 'pk-list', [].map.call(sel.options, function (o) {
        return '<button type="button" data-v="' + esc(o.value) + '"' + (o.value === sel.value ? ' class="on"' : '') + '>' + esc(o.textContent) + '</button>';
      }).join(''));
      el.onclick = function (e) {
        var x = e.target.closest('button');
        if (!x) return;
        sel.value = x.dataset.v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      };
    };
  }

  /* ---------- popover rentang tanggal ---------- */
  var PRESETS = [
    ['Hari ini', function (t) { return [t, t]; }],
    ['7 hari terakhir', function (t) { return [shift(t, -6), t]; }],
    ['30 hari terakhir', function (t) { return [shift(t, -29), t]; }],
    ['Bulan ini', function (t) { return [t.slice(0, 8) + '01', t]; }],
    ['Bulan lalu', function (t) {
      var e = shift(t.slice(0, 8) + '01', -1);
      return [e.slice(0, 8) + '01', e];
    }]
  ];
  function presetRange(name) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i][0] === name) return PRESETS[i][1](tday());
    return [tday(), tday()];
  }

  function pkRange(btn, o) {
    var min = o.min || '',
      max = o.max || '',
      ds = o.from || max,
      de = o.to || max,
      y = +ds.slice(0, 4),
      m = +ds.slice(5, 7) - 1,
      two = innerWidth >= 760;

    function draw() {
      var m2 = m + 1,
        y2 = y;
      if (m2 > 11) { m2 = 0; y2++; }
      var el = pop(btn, 'pk-rng',
        '<div class="pk-ps">' + PRESETS.map(function (p) {
          var r = presetRange(p[0]);
          var off = (min && r[1] < min) || (max && r[0] > max);
          return '<button type="button" data-p="' + p[0] + '"' + (off ? ' disabled' : '') + (r[0] === ds && r[1] === de ? ' class="on"' : '') + '>' + p[0] + '</button>';
        }).join('') + '</div>' +
        '<div class="pk-cals"><div class="pk-h"><button type="button" data-mv="-1" aria-label="Bulan sebelumnya">&#8249;</button><button type="button" data-mv="1" aria-label="Bulan berikutnya">&#8250;</button></div>' +
        '<div class="pk-cg"><div><div class="pk-mlb">' + mon(y, m) + '</div>' + wdays() + '<div class="pk-g">' + grid(y, m, ds, de, min, max) + '</div></div>' +
        (two ? '<div><div class="pk-mlb">' + mon(y2, m2) + '</div>' + wdays() + '<div class="pk-g">' + grid(y2, m2, ds, de, min, max) + '</div></div>' : '') +
        '</div></div>' +
        '<div class="pk-f"><span class="pk-sum">' + (ds === de ? lbl(ds) : lbl(ds) + ' &ndash; ' + lbl(de)) + '</span>' +
        '<button type="button" class="pk-l" data-x="1">Batal</button>' +
        '<button type="button" class="pk-p" data-ok="1">Terapkan</button></div>');
      el.onclick = function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.mv) {
          m += +b.dataset.mv;
          if (m < 0) { m = 11; y--; }
          if (m > 11) { m = 0; y++; }
          return draw();
        }
        if (b.dataset.p) {
          var r = presetRange(b.dataset.p);
          if ((min && r[1] < min) || (max && r[0] > max)) return draw(); // preset di luar rentang data
          ds = r[0] < min ? min : r[0] > max ? max : r[0];
          de = r[1] < ds ? ds : r[1] > max ? max : r[1];
          y = +ds.slice(0, 4);
          m = +ds.slice(5, 7) - 1;
          return draw();
        }
        if (b.dataset.x) return close();
        if (b.dataset.ok) {
          close();
          return o.on({ from: ds, to: de });
        }
        if (b.dataset.d) {
          var d = b.dataset.d;
          if (ds !== de) { ds = d; de = d; }
          else if (d < de) ds = d;
          else de = d;
          if (de < ds) { var t = ds; ds = de; de = t; }
          return draw();
        }
      };
    }
    draw();
  }

  /* ---------- dropdown banyak pilihan ---------- */
  function pkMulti(btn, o) {
    var items = o.items || [],
      sel = (o.sel || []).slice(),
      q = '';

    function rows() {
      var h = '';
      items.forEach(function (it) {
        if (q && it.t.toLowerCase().indexOf(q) < 0) return;
        h += '<button type="button" data-m="' + esc(it.v) + '"' + (sel.indexOf(it.v) >= 0 ? ' class="on"' : '') + '>' +
          '<i class="pk-cb" aria-hidden="true"></i><span class="pk-n">' + esc(it.t) + '</span><b>' + it.n + '</b></button>';
      });
      return h || '<div class="pk-empty">Tidak ada kategori cocok.</div>';
    }
    function draw() {
      var el = pop(btn, 'pk-multi',
        '<div class="pk-sh"><input class="pk-q" type="search" placeholder="Cari kategori" autocomplete="off" aria-label="Cari kategori"><button type="button" class="pk-l" data-a="1">Semua</button></div>' +
        '<div class="pk-lst">' + rows() + '</div>' +
        '<div class="pk-f"><span class="pk-sum">' + (sel.length ? sel.length + ' kategori dipilih' : 'Semua kategori') + '</span>' +
        '<button type="button" class="pk-l" data-x="1">Batal</button>' +
        '<button type="button" class="pk-p" data-ok="1">Terapkan</button></div>');
      var qi = el.querySelector('.pk-q');
      qi.value = q;
      qi.oninput = function () {
        q = qi.value.trim().toLowerCase();
        el.querySelector('.pk-lst').innerHTML = rows();
      };
      el.onclick = function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.a) { sel = []; return draw(); }
        if (b.dataset.x) return close();
        if (b.dataset.ok) { close(); return o.on(sel); }
        var v = b.dataset.m || '',
          i = sel.indexOf(v);
        if (i < 0) sel.push(v);
        else sel.splice(i, 1);
        draw();
      };
    }
    draw();
  }

  /* ---------- pasang ke seluruh halaman ---------- */
  function up(root) {
    [].forEach.call((root || document).querySelectorAll('input[type="date"]'), upDate);
    [].forEach.call((root || document).querySelectorAll('select'), upSelect);
  }
  window.upPickers = up;
  window.pkRange = pkRange;
  window.pkMulti = pkMulti;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { up(document); });
  else up(document);
  if (window.MutationObserver) {
    var tick = 0;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++)
        for (var j = 0; j < list[i].addedNodes.length; j++)
          if (list[i].addedNodes[j].nodeType === 1) {
            if (!tick) tick = rAF(function () { tick = 0; up(document); });
            return;
          }
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
