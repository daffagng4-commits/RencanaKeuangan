/**
 * Helper Input Nominal Auto-Format (Pemisah Ribuan Titik Real-Time).
 * Menampilkan format titik ribuan (mis. 1.000.000) saat user mengetik,
 * sambil tetap menjaga nilai murni (1000000) untuk js/core/ dan Supabase via parseRp() / getRpVal().
 */

var NUM_INPUT_IDS = {
  saldo: 1,
  'f-price': 1,
  qka: 1,
  ka: 1,
  kpg: 1,
  pp: 1,
  ite: 1,
  bke: 1,
  gt: 1,
  gs: 1,
  sma: 1,
  'kas-amount': 1,
  'item-price': 1,
  'sim-new-amt': 1,
  'qtx-amt': 1,
  'kp-budget': 1,
  'it-est': 1,
  'bk-amt': 1,
  'tg-t': 1,
  'tg-s0': 1,
  'm-cfg-saldo': 1,
  'm-sim-price': 1,
  'm-kas-amt': 1,
  'm-it-est': 1,
  'm-bk-amt': 1,
  'm-np-budget': 1,
  'm-item-price': 1,
};

/** Resolve elemen DOM dari ID string atau node langsung. */
function resolveNumEl(elOrId) {
  if (!elOrId) return null;
  if (typeof elOrId === 'string') {
    if (typeof $ === 'function') return $(elOrId);
    return typeof document !== 'undefined' ? document.getElementById(elOrId) : null;
  }
  return elOrId;
}

/** Format string digit menjadi pemisah ribuan titik ('1000000' -> '1.000.000'); biarkan shorthand saat mengetik ('250k'). */
function fmtRpInputStr(raw) {
  if (raw == null) return '';
  var s = String(raw);
  if (!s || /[^\d.,\s]/.test(s)) return s;
  var d = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Format nilai saat input kehilangan fokus (blur): konversi shorthand ('250k', '1,5jt') ke '250.000', '1.500.000'. */
function fmtRpBlurStr(raw) {
  if (raw == null) return '';
  var s = String(raw).trim();
  if (!s) return '';
  if (/[^\d.,\s]/.test(s) && typeof parseRp === 'function') {
    var n = parseRp(s);
    if (!isNaN(n) && n > 0) return fmtRpInputStr(String(Math.round(n)));
    if (n === 0 && s === '0') return '0';
  }
  return fmtRpInputStr(s);
}

/** Perbarui CSS custom property --val-pct (dan --pct) untuk modern range slider. */
function syncModernSlider(sliderEl) {
  if (!sliderEl) return;
  var min = parseFloat(sliderEl.min || 0);
  var max = parseFloat(sliderEl.max || 100);
  var val = parseFloat(sliderEl.value || 0);
  var pct = max > min ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;
  if (sliderEl.style && typeof sliderEl.style.setProperty === 'function') {
    sliderEl.style.setProperty('--val-pct', pct + '%');
    sliderEl.style.setProperty('--pct', pct + '%');
  }
}

/** Sinkronkan slider pasangan (jika input memiliki data-slider-sync). */
function syncPairedSlider(el) {
  if (!el || !el.dataset || !el.dataset.sliderSync) return;
  var sliderEl = resolveNumEl(el.dataset.sliderSync);
  if (!sliderEl) return;
  var v = getRpVal(el);
  var min = parseFloat(sliderEl.min || 0);
  var max = parseFloat(sliderEl.max || 100);
  sliderEl.value = String(Math.max(min, Math.min(max, v)));
  syncModernSlider(sliderEl);
}

/** Beri titik ribuan saat mengetik angka dengan tetap menjaga posisi kursor. */
function fmtLive(el) {
  if (!el) return;
  var v = el.value;
  if (!v || /[^\d.,\s]/.test(v)) {
    syncPairedSlider(el);
    return;
  }
  var p = typeof el.selectionStart === 'number' ? el.selectionStart : v.length;
  var n = v.slice(0, p).replace(/\D/g, '').length;
  var f = fmtRpInputStr(v);
  el.value = f;
  var i = 0,
    c = 0;
  while (i < f.length && c < n) {
    if (/\d/.test(f[i])) c++;
    i++;
  }
  try {
    if (typeof el.setSelectionRange === 'function') el.setSelectionRange(i, i);
  } catch (e) {}
  syncPairedSlider(el);
}

/** Ambil nilai angka murni (Number, mis. 1000000) dari input terformat ('1.000.000'). */
function getRpVal(elOrId) {
  var el = resolveNumEl(elOrId);
  if (!el) return 0;
  var n = typeof parseRp === 'function' ? parseRp(el.value) : parseInt(String(el.value || '').replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/** Isi input dengan angka murni yang langsung diformat titik ribuan dan sinkron ke slider pasangan. */
function setRpVal(elOrId, val) {
  var el = resolveNumEl(elOrId);
  if (!el) return;
  if (val === '' || val == null || isNaN(+val)) {
    el.value = '';
  } else if (+val === 0) {
    el.value = '0';
  } else {
    el.value = fmtRpInputStr(String(Math.round(+val)));
  }
  syncPairedSlider(el);
}

/** Periksa mode opt-in angka murni (`"int"` | `"dec"`) pada elemen input. */
function getNumOnlyMode(el) {
  if (!el || el.tagName !== 'INPUT' || !el.getAttribute) return '';
  var m = el.getAttribute('data-num-only');
  return m === 'int' || m === 'dec' ? m : '';
}

/** Sanitasi string menjadi maksimal 13 digit murni lalu format pemisah ribuan titik (`'12abc'` -> `'12'`). */
function fmtNumOnlyIntStr(raw) {
  if (raw == null) return '';
  var d = String(raw).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Sanitasi string kurs menjadi digit, titik ribuan (boleh berkali-kali), dan maksimal SATU koma desimal. */
function sanitizeNumOnlyDecStr(raw) {
  if (raw == null) return '';
  var s = String(raw),
    out = '',
    hasComma = false,
    digits = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch >= '0' && ch <= '9') {
      if (digits < 15) {
        out += ch;
        digits++;
      }
    } else if (ch === '.') {
      out += ch;
    } else if (ch === ',' && !hasComma) {
      hasComma = true;
      out += ch;
    }
  }
  return out;
}

/** Format nilai kurs ke bentuk kanonik tanpa pemisah ribuan saat blur (1500, 105,5). */
function fmtRateCanonicalStr(val) {
  if (!(typeof val === 'number' && Number.isFinite(val) && val > 0 && val <= 1e9)) return '';
  if (val >= 1e-6) return String(val).replace('.', ',');
  return val.toFixed(6).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

/** Terapkan sanitasi integer murni real-time dengan menjaga posisi kursor. */
function fmtLiveNumOnlyInt(el) {
  if (!el) return;
  var v = String(el.value || '');
  var p = typeof el.selectionStart === 'number' ? el.selectionStart : v.length;
  var n = v.slice(0, p).replace(/\D/g, '').length;
  var f = fmtNumOnlyIntStr(v);
  el.value = f;
  var i = 0,
    c = 0;
  while (i < f.length && c < n) {
    if (/\d/.test(f[i])) c++;
    i++;
  }
  try {
    if (typeof el.setSelectionRange === 'function') el.setSelectionRange(i, i);
  } catch (e) {}
  syncPairedSlider(el);
}

/** Terapkan sanitasi desimal murni real-time dengan menjaga posisi kursor. */
function fmtLiveNumOnlyDec(el) {
  if (!el) return;
  var v = String(el.value || '');
  var p = typeof el.selectionStart === 'number' ? el.selectionStart : v.length;
  var beforeSanLen = sanitizeNumOnlyDecStr(v.slice(0, p)).length;
  var f = sanitizeNumOnlyDecStr(v);
  el.value = f;
  var pos = Math.min(f.length, beforeSanLen);
  try {
    if (typeof el.setSelectionRange === 'function') el.setSelectionRange(pos, pos);
  } catch (e) {}
}

/** Periksa apakah elemen termasuk input nominal yang harus diformat otomatis. */
function isNumInput(el) {
  if (!el || el.tagName !== 'INPUT') return false;
  if (getNumOnlyMode(el)) return false;
  if (el.getAttribute && el.getAttribute('data-num-fmt') === 'rp') return true;
  return !!(el.id && NUM_INPUT_IDS[el.id]);
}

/** Pasang event delegation global untuk seluruh input nominal dan .modern-slider di kedua mode. */
function bindNumInputs() {
  if (typeof document === 'undefined' || document._rkNumBound) return;
  document._rkNumBound = true;
  document.addEventListener('beforeinput', function (e) {
    var t = e.target;
    var mode = getNumOnlyMode(t);
    if (!mode) return;
    if (e.data == null || e.data === '') return;
    if (e.inputType && e.inputType.indexOf('insert') !== 0) return;
    var d = String(e.data);
    if (mode === 'int') {
      if (!/\d/.test(d)) e.preventDefault();
    } else if (mode === 'dec') {
      if (!/[\d.,]/.test(d)) {
        e.preventDefault();
        return;
      }
      if (d.indexOf(',') >= 0) {
        var v = String(t.value || '');
        var s = typeof t.selectionStart === 'number' ? t.selectionStart : v.length;
        var en = typeof t.selectionEnd === 'number' ? t.selectionEnd : s;
        var rest = v.slice(0, s) + v.slice(en);
        if (rest.indexOf(',') >= 0) e.preventDefault();
      }
    }
  });
  function handlePasteOrDropNumOnly(e) {
    var t = e.target;
    var mode = getNumOnlyMode(t);
    if (!mode) return;
    var dt = e.type === 'paste' ? e.clipboardData : e.dataTransfer;
    if (!dt || typeof dt.getData !== 'function') return;
    var txt = dt.getData('text/plain') || dt.getData('text') || '';
    e.preventDefault();
    var v = String(t.value || '');
    var s = typeof t.selectionStart === 'number' ? t.selectionStart : v.length;
    var en = typeof t.selectionEnd === 'number' ? t.selectionEnd : s;
    var combined = v.slice(0, s) + txt + v.slice(en);
    if (mode === 'int') {
      t.value = fmtNumOnlyIntStr(combined);
      syncPairedSlider(t);
    } else {
      t.value = sanitizeNumOnlyDecStr(combined);
    }
    try {
      if (typeof Event === 'function') t.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {}
  }
  document.addEventListener('paste', handlePasteOrDropNumOnly);
  document.addEventListener('drop', handlePasteOrDropNumOnly);
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t) return;
    var numOnly = getNumOnlyMode(t);
    if (numOnly === 'int') {
      fmtLiveNumOnlyInt(t);
    } else if (numOnly === 'dec') {
      fmtLiveNumOnlyDec(t);
    } else if (isNumInput(t)) {
      fmtLive(t);
    } else if (t.classList && t.classList.contains('modern-slider')) {
      syncModernSlider(t);
      if (t.dataset && t.dataset.numTarget) {
        setRpVal(t.dataset.numTarget, t.value);
      }
    }
  });
  document.addEventListener(
    'blur',
    function (e) {
      var t = e.target;
      var numOnly = getNumOnlyMode(t);
      if (numOnly === 'int') {
        fmtLiveNumOnlyInt(t);
        return;
      }
      if (numOnly === 'dec') {
        fmtLiveNumOnlyDec(t);
        if (t.value && typeof tripParseRateLocale === 'function') {
          var parsedDec = tripParseRateLocale(t.value);
          if (parsedDec > 0) {
            var canonDec = fmtRateCanonicalStr(parsedDec);
            if (canonDec) t.value = canonDec;
          }
        }
        return;
      }
      if (!isNumInput(t) || !t.value) return;
      if (/[^\d.,\s]/.test(t.value)) {
        t.value = fmtRpBlurStr(t.value);
        syncPairedSlider(t);
      }
    },
    true,
  );
}
