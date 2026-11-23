/**
 * Mode Perjalanan: lembar terpisah dari Rencana Keuangan. Tiap perjalanan = satu profil kas terpisah (link=false)
 * berisi anggaran, itinerary per hari (jam, tautan, biaya, metode bayar), pemesanan, checklist, tautan, catatan,
 * dan catatan kas masuk/keluar sendiri. Mendukung satu mata uang asing dengan kurs manual.
 */
var mode = (function () {
    try {
      var m0 = localStorage.getItem('rk-mode');
      return m0 === 'trip' || m0 === 'rebalance' || m0 === 'ibkr' ? m0 : 'rencana';
    } catch (e) {
      return 'rencana';
    }
  })(),
  tripAct = (function () {
    try {
      return localStorage.getItem('rk-trip') || '';
    } catch (e) {
      return '';
    }
  })(),
  tripTab = 'ring',
  itEdit = null,
  gEdit = false,
  SIM = [],
  simK = 'out',
  bkEdit = null,
  kpMode = 'new',
  curTab = 'rincian',
  noteTimer = null,
  WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  ICAT = ['Makan', 'Transport', 'Tiket & Tour', 'Belanja', 'Lainnya'],
  BCAT = ['Transport', 'Penginapan', 'Tiket & Tour', 'Persiapan', 'Lainnya'],
  AC_CATS = ['Makan', 'Transport', 'Tiket & Tour', 'Belanja', 'Penginapan', 'Persiapan', 'Lainnya'],
  PAYL = { ic: 'Kartu IC', on: 'Online', cash: 'Cash' },
  CK_STD = ['Paspor / KTP', 'Tiket transportasi', 'Booking penginapan', 'Uang tunai', 'Kartu ATM / kartu kredit', 'Charger dan power bank', 'Obat pribadi', 'Pakaian', 'Perlengkapan mandi', 'Asuransi perjalanan'];

function kid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
function trips() {
  var pr = ALL.kas.pr;
  return Object.keys(pr)
    .filter(function (i) {
      return !pr[i].link;
    })
    .map(function (i) {
      return pr[i];
    });
}
/** Perjalanan yang sedang dibuka (atau null). */
function tp() {
  var P = ALL.kas.pr[tripAct];
  return P && !P.link ? P : null;
}
function remember(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch (e) {}
}
function setMode(m) {
  mode = m;
  remember('rk-mode', m);
  autoTrip();
  renderAll();
}
function setTrip(id) {
  tripAct = id;
  tripTab = tp() && tripActive(tp()) ? 'now' : 'ring';
  gEdit = false;
  itEdit = bkEdit = null;
  kasTf = 'all';
  kasEdit = null;
  remember('rk-trip', id);
  renderAll();
}
function dayNo(a, b) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
}
/** Semua tanggal perjalanan: dari Mulai sampai Selesai ditambah tanggal item itinerary. */
function tripDays(P) {
  var set = {};
  if (P.start && P.end && P.end >= P.start)
    for (var t = Date.parse(P.start + 'T00:00:00Z'), n = 0; t <= Date.parse(P.end + 'T00:00:00Z') && n < 60; t += 864e5, n++) set[isoD(t)] = 1;
  P.it.forEach(function (x) {
    set[x.day] = 1;
  });
  return Object.keys(set).sort();
}
function dayLabel(P, d) {
  return (P.start && d >= P.start ? 'Hari ' + (dayNo(d, P.start) + 1) + ' · ' : '') + WD[new Date(d + 'T00:00:00Z').getUTCDay()] + ', ' + fmtD(d);
}
/** Nilai dalam rupiah: v dalam mata uang asing (fx) dikali kurs. */
function val(P, v, fx) {
  return fx && P.rate ? v * P.rate : v;
}
function fxs(P, n, curOpt) {
  var c = curOpt != null ? String(curOpt) : ((P && P.cur) || '');
  return c + ' ' + Math.round(n).toLocaleString('id-ID');
}
/** Cek apakah item bermata uang asing memiliki kurs khusus (rt) yang valid (> 0 dan <= 1e9). */
function tripHasValidRt(x) {
  return !!(x && x.fx && typeof x.rt === 'number' && Number.isFinite(x.rt) && x.rt > 0 && x.rt <= 1e9);
}
/** Kode mata uang item bermata uang asing (mendukung B2 P.fxs[] atau B1 P.cur); kosong bila bukan item asing / belum ada cur. */
function tripItemCur(P, x) {
  if (!x || !x.fx || !P) return '';
  var main = String(P.cur || '').trim();
  if (x.c && Array.isArray(P.fxs)) {
    var xc = String(x.c).trim().toUpperCase();
    for (var i = 0; i < P.fxs.length; i++) {
      var f = P.fxs[i];
      if (f && String(f.c || '').trim().toUpperCase() === xc) return String(f.c).trim().toUpperCase();
    }
  }
  return main;
}
/** Kurs berjalan profil untuk kode mata uang tertentu (utama P.rate atau tambahan P.fxs[].r). */
function tripCurRate(P, code) {
  if (!P) return 0;
  var mainRaw = String(P.cur || '').trim();
  var reqRaw = code == null ? mainRaw : String(code).trim();
  if (!reqRaw) return 0;
  var cUp = reqRaw.toUpperCase(), mainUp = mainRaw.toUpperCase();
  if (cUp === mainUp) {
    var rm = +P.rate || 0;
    return (Number.isFinite(rm) && rm > 0 && rm <= 1e9) ? rm : 0;
  }
  if (Array.isArray(P.fxs)) {
    for (var i = 0; i < P.fxs.length; i++) {
      var f = P.fxs[i];
      if (f && String(f.c || '').trim().toUpperCase() === cUp) {
        var rx = +f.r || 0;
        return (Number.isFinite(rx) && rx > 0 && rx <= 1e9) ? rx : 0;
      }
    }
  }
  return 0;
}
/** Kurs efektif tunggal untuk item (pemesanan / itinerary): rt khusus bila ada -> kurs mata uang item -> 1 bila Rupiah. */
function tripItemRate(P, x) {
  if (!x || !x.fx) return 1;
  var curCode = tripItemCur(P, x);
  if (!curCode) return 1;
  if (tripHasValidRt(x)) return x.rt;
  return tripCurRate(P, curCode);
}
/** Cek apakah pemesanan asing lunas memiliki kurs terkunci (rt) yang valid. */
function tripBkHasLock(x) {
  return !!(x && x.paid && tripHasValidRt(x));
}
/** Nilai rupiah pemesanan: memakai tripItemRate(P, x). */
function tripBkRp(P, x) {
  if (!x) return 0;
  return (+x.amt || 0) * tripItemRate(P, x);
}
/** Nilai rupiah item itinerary: memakai tripItemRate(P, x). */
function tripItRp(P, x) {
  if (!x) return 0;
  return (+x.est || 0) * tripItemRate(P, x);
}
/** Teks jumlah: "Rp ..." dan, bila asing, "CUR ... ≈ Rp ..." di belakangnya. */
function amtTxt(P, v, fx, lockedRt, isPaidOpt, curOpt) {
  var isObj = v && typeof v === 'object';
  var num = isObj ? (+(v.amt != null ? v.amt : v.est) || 0) : (+v || 0);
  var isFx = isObj ? !!v.fx : !!fx;
  var cCode = isObj ? tripItemCur(P, v) : (curOpt || ((P && String(P.cur || '').trim()) || ''));
  var lk = isObj
    ? (tripHasValidRt(v) ? v.rt : 0)
    : (typeof lockedRt === 'number' && Number.isFinite(lockedRt) && lockedRt > 0 && lockedRt <= 1e9 ? lockedRt : 0);
  var isPaidFlag = isObj ? !!v.paid : (isPaidOpt === undefined ? true : !!isPaidOpt);
  if (isFx && cCode) {
    var effRate = lk || tripCurRate(P, cCode);
    var eqRp = num * effRate;
    var lockTag = lk ? (isPaidFlag ? ' &middot; kurs terkunci ' : ' &middot; kurs ') + lk.toLocaleString('id-ID') : '';
    return fxs(P, num, cCode) + (effRate > 0 ? ' <span class="sub">&asymp; ' + rp(eqRp) + lockTag + '</span>' : '');
  }
  return rp(num);
}
/** Urai input kurs berbasis lokal Indonesia (`1.500`->1500, `16,5`->16.5, `1.234,5`->1234.5, `0.500`->0.5, `1.5.0`->0). */
function tripParseRateLocale(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s || /[^0-9.,]/.test(s)) return 0;
  var hasComma = s.indexOf(',') >= 0;
  var hasDot = s.indexOf('.') >= 0;
  var normStr = '';
  if (hasComma && hasDot) {
    if (s.indexOf(',') !== s.lastIndexOf(',')) return 0;
    var partsCD = s.split(',');
    var intCD = partsCD[0], decCD = partsCD[1];
    if (!decCD || !/^\d+$/.test(decCD)) return 0;
    if (!/^\d{1,3}(\.\d{3})+$/.test(intCD)) return 0;
    normStr = intCD.replace(/\./g, '') + '.' + decCD;
  } else if (hasComma) {
    if (s.indexOf(',') !== s.lastIndexOf(',')) return 0;
    if (!/^\d*,\d+$/.test(s)) return 0;
    normStr = s.replace(',', '.');
  } else if (hasDot) {
    if (/^(?!0+\.)\d{1,3}(\.\d{3})+$/.test(s)) {
      normStr = s.replace(/\./g, '');
    } else if (/^\d*\.\d+$/.test(s)) {
      normStr = s;
    } else {
      return 0;
    }
  } else if (/^\d+$/.test(s)) {
    normStr = s;
  } else {
    return 0;
  }
  var n = parseFloat(normStr);
  return (Number.isFinite(n) && n > 0 && n <= 1e9) ? n : 0;
}
/** Urai teks input kurs menjadi angka positif valid (> 0 dan <= 1e9), atau 0 bila kosong/tidak sah. */
function tripParseRateVal(raw) {
  return tripParseRateLocale(raw);
}
/** Format teks pratinjau "Terbaca" untuk kolom kurs (`Terbaca: 1 NOK = Rp 1.500`), kosong bila tidak sah/kosong. */
function tripFormatRateReadText(rateRaw, curCodeOpt) {
  var val = tripParseRateLocale(rateRaw);
  if (!(val > 0)) return '';
  var cu = String(curCodeOpt == null ? '' : curCodeOpt).trim().toUpperCase();
  var fmt = typeof tripFormatRateIndo === 'function' ? tripFormatRateIndo(val) : String(val);
  return cu ? ('Terbaca: 1 ' + cu + ' = Rp ' + fmt) : ('Terbaca: Rp ' + fmt);
}
/** Sinkronkan elemen DOM pratinjau `.trip-rate-read` di bawah kolom kurs. */
function tripSyncRateReadEl(readEl, rateRaw, curCodeOpt) {
  if (!readEl) return;
  var txt = tripFormatRateReadText(rateRaw, curCodeOpt);
  readEl.textContent = txt;
  readEl.hidden = !txt;
}
/** Balik status lunas pemesanan: pertahankan rt manual, kunci otomatis dgn ra=true, lepas hanya yg ra; kembalikan pesan toast gabungan. */
function tripToggleBkPaid(P, x) {
  if (!x) return '';
  x.paid = !x.paid;
  if (x.paid) {
    if (x.fx) {
      if (tripHasValidRt(x)) {
        var curMan = tripItemCur(P, x) || String((P && P.cur) || '').trim();
        if (x.ra !== true) delete x.ra;
        return curMan
          ? 'Ditandai lunas · Kurs terkunci: 1 ' + curMan + ' = Rp ' + x.rt.toLocaleString('id-ID')
          : 'Ditandai lunas';
      }
      var cur = tripItemCur(P, x) || String((P && P.cur) || '').trim();
      var rate = tripCurRate(P, cur);
      if (cur && rate > 0 && rate <= 1e9) {
        x.rt = rate;
        x.ra = true;
        return 'Ditandai lunas · Kurs terkunci: 1 ' + cur + ' = Rp ' + rate.toLocaleString('id-ID');
      }
    }
    delete x.rt;
    delete x.ra;
    return 'Ditandai lunas';
  }
  if (x.ra) delete x.rt;
  delete x.ra;
  return 'Lunas dibatalkan';
}
/** Gulir layar/kontainer ke form edit dan (di desktop saja) fokus ke kolom pertama tanpa memicu lonjakan scroll. */
function tripScrollToEditForm(formEl, firstInputId, isMobile) {
  if (!formEl) return;
  var beh = (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ? 'auto' : 'smooth';
  var card = formEl.closest ? (formEl.closest('.card') || formEl) : formEl;
  var mm = isMobile && typeof $ === 'function' ? $('m-main') : null;
  if (mm && mm.scrollHeight > mm.clientHeight + 2 && typeof card.getBoundingClientRect === 'function') {
    var cr = card.getBoundingClientRect(), mr = mm.getBoundingClientRect();
    var targetTop = mm.scrollTop + (cr.top - mr.top) - 10;
    if (typeof mm.scrollTo === 'function') {
      try { mm.scrollTo({ top: Math.max(0, targetTop), behavior: beh }); } catch (e) { mm.scrollTop = Math.max(0, targetTop); }
    } else {
      mm.scrollTop = Math.max(0, targetTop);
    }
  } else if (typeof card.scrollIntoView === 'function') {
    try { card.scrollIntoView({ behavior: beh, block: 'center' }); } catch (e) {}
  }
  if (!isMobile && firstInputId && typeof $ === 'function') {
    var firstInp = $(firstInputId);
    if (firstInp && typeof firstInp.focus === 'function') {
      try { firstInp.focus({ preventScroll: true }); } catch (e) { try { firstInp.focus(); } catch (e2) {} }
    }
  }
}
/** Gulir kembali ke baris item yang baru selesai diedit apabila berada di luar area pandang. */
function tripScrollBackToEditedRow(rowEl, isMobile) {
  if (!rowEl || typeof rowEl.getBoundingClientRect !== 'function') return;
  var beh = (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ? 'auto' : 'smooth';
  var r = rowEl.getBoundingClientRect();
  var mm = isMobile && typeof $ === 'function' ? $('m-main') : null;
  var minY = 72, maxY = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight - 24 : 600;
  if (mm && mm.scrollHeight > mm.clientHeight + 2) {
    var mr = mm.getBoundingClientRect();
    minY = mr.top + 8;
    maxY = mr.bottom - 80;
  }
  var isVisible = r.top >= minY && r.bottom <= maxY;
  if (!isVisible && typeof rowEl.scrollIntoView === 'function') {
    try { rowEl.scrollIntoView({ behavior: beh, block: 'nearest' }); } catch (e) {}
  }
}
/** Urai nilai dropdown mata uang item ('idr' | 'fx' | 'fx:KODE') menjadi { fx, c }. */
function tripParseCurSelectVal(P, rawVal) {
  var s = String(rawVal == null ? '' : rawVal).trim();
  if (s === 'fx') return { fx: true, c: '' };
  if (s.indexOf('fx:') === 0) {
    var code = s.slice(3).trim().toUpperCase();
    if (code && P && Array.isArray(P.fxs) && P.fxs.some(function (f) { return f && String(f.c || '').toUpperCase() === code; })) {
      return { fx: true, c: code };
    }
    return { fx: true, c: '' };
  }
  return { fx: false, c: '' };
}
/** Gabungkan hasil edit form item (pemesanan / itinerary) sambil menjaga, mengubah, atau menghapus rt & ra sesuai aturan 10B. */
function tripMergeItemEdit(oldItem, patchItem, rtInputEl, isBooking) {
  var merged = Object.assign({}, oldItem, patchItem);
  if (!merged.fx) {
    delete merged.rt;
    delete merged.ra;
    delete merged.c;
    return merged;
  }
  if (!merged.c) delete merged.c;
  if (rtInputEl) {
    var parsedRt = tripParseRateVal(rtInputEl.value);
    var userEdited = !!(rtInputEl.dataset && rtInputEl.dataset.userEdited === '1');
    if (parsedRt > 0) {
      var sameAuto = !!(!userEdited && isBooking && merged.paid && oldItem && oldItem.ra && oldItem.rt === parsedRt && (oldItem.c || '') === (merged.c || ''));
      merged.rt = parsedRt;
      if (sameAuto) merged.ra = true;
      else delete merged.ra;
    } else {
      delete merged.rt;
      delete merged.ra;
    }
  } else if (!tripHasValidRt(merged)) {
    delete merged.rt;
    delete merged.ra;
  }
  if (!isBooking || !merged.paid) delete merged.ra;
  return merged;
}
/** Wrapper kompatibilitas Tahap 9 untuk hasil edit form pemesanan. */
function tripMergeBkEdit(oldBk, patchBk, rtInputEl) {
  return tripMergeItemEdit(oldBk, patchBk, rtInputEl, true);
}
/** Sinkronkan visibilitas input kurs per item (form Ubah) & pratinjau ekuivalen Rp pada form pemesanan/itinerary. */
function tripSyncItemRateField(P, editItem, amtId, curId, eqId, rtWrapId, rtId, isBooking) {
  var inp = $(amtId), sel = $(curId), eqEl = $(eqId), rtWrap = $(rtWrapId), rtInp = $(rtId);
  var selSpec = sel ? tripParseCurSelectVal(P, sel.value) : { fx: false, c: '' };
  var itemCur = selSpec.fx ? (selSpec.c || ((P && String(P.cur || '').trim()) || '')) : '';
  var isFx = !!(selSpec.fx && itemCur);
  var isEditMode = !!editItem;
  var isPaidEdit = !!(isBooking && editItem && editItem.paid);
  if (rtWrap) {
    rtWrap.style.display = (isEditMode && isFx) ? '' : 'none';
    if (isEditMode && isFx && rtWrap.querySelector) {
      var lblEl = rtWrap.querySelector('label');
      if (lblEl) lblEl.textContent = 'Kurs' + (isPaidEdit ? ' saat dibayar' : '') + ' (Rp per 1 ' + (itemCur || 'asing') + ')';
    }
  }
  if (rtInp) {
    var curRate = isFx ? tripCurRate(P, itemCur) : 0;
    rtInp.placeholder = curRate > 0 ? ('Ikut kurs perjalanan: ' + curRate.toLocaleString('id-ID')) : 'Kosong = ikut kurs perjalanan';
  }
  var rtReadEl = typeof $ === 'function' ? $(rtId + '-read') : (typeof document !== 'undefined' ? document.getElementById(rtId + '-read') : null);
  tripSyncRateReadEl(rtReadEl, (isEditMode && isFx && rtInp) ? rtInp.value : '', itemCur);
  if (!inp || !sel || !eqEl) return;
  var valNum = typeof getRpVal === 'function' ? getRpVal(amtId) : (+String(inp.value || '').replace(/\D/g, '') || 0);
  var lkRt = (isEditMode && isFx && rtInp) ? tripParseRateVal(rtInp.value) : 0;
  var prev = tripFormEqPreview(P, valNum, isFx, lkRt, isPaidEdit, itemCur);
  eqEl.textContent = prev.text;
  eqEl.classList.toggle('is-warn', !!prev.warn);
  eqEl.classList.toggle('pv', !!(prev.text && !prev.warn));
}
/** Wrapper kompatibilitas Tahap 9 untuk form pemesanan. */
function tripSyncBkRateField(P, editBk, amtId, curId, eqId, rtWrapId, rtId) {
  return tripSyncItemRateField(P, editBk, amtId, curId, eqId, rtWrapId, rtId, true);
}
/** Cek apakah saklar beberapa mata uang sedang aktif pada profil perjalanan. */
function tripMultiCurOn(P) {
  return !!(P && Array.isArray(P.fxs));
}
/** Daftar seluruh kode mata uang asing pada profil (utama dulu, lalu tambahan fxs tanpa duplikat). */
function tripAllCurList(P) {
  var list = [], seen = {};
  if (!P) return list;
  var main = String(P.cur || '').trim();
  if (main) {
    seen[main.toUpperCase()] = 1;
    list.push({ c: main, r: tripCurRate(P, main), isMain: true });
  }
  if (Array.isArray(P.fxs)) {
    P.fxs.forEach(function (f) {
      if (!f || !f.c) return;
      var cu = String(f.c).trim().toUpperCase();
      if (!cu || seen[cu]) return;
      seen[cu] = 1;
      var rr = +f.r || 0;
      list.push({ c: cu, r: (Number.isFinite(rr) && rr > 0 && rr <= 1e9) ? rr : 0, isMain: false });
    });
  }
  return list;
}
/** Cek apakah item memakai kode mata uang asing (sebagai mata uang item fx atau mata uang aktual au). */
function tripItemUsesCur(P, x, cUp) {
  if (!x || !cUp) return false;
  if (x.fx && tripItemCur(P, x).toUpperCase() === cUp) return true;
  if (!x.fx && x.ax > 0 && x.au && String(x.au).trim().toUpperCase() === cUp) return true;
  return false;
}
/** Hitung pemakaian kode mata uang tertentu di pemesanan & itinerary. */
function tripCountCurUsage(P, code) {
  var cUp = String(code || '').trim().toUpperCase();
  if (!P || !cUp) return { total: 0, bk: 0, it: 0 };
  var bkCnt = 0, itCnt = 0;
  (P.bk || []).forEach(function (x) {
    if (tripItemUsesCur(P, x, cUp)) bkCnt++;
  });
  (P.it || []).forEach(function (x) {
    if (tripItemUsesCur(P, x, cUp)) itCnt++;
  });
  return { total: bkCnt + itCnt, bk: bkCnt, it: itCnt };
}
/** Hitung total item (pemesanan & itinerary) yang memakai mata uang tambahan mana pun. */
function tripCountAllExtraCurUsage(P) {
  if (!P) return { total: 0, bk: 0, it: 0 };
  var mainUp = String(P.cur || '').trim().toUpperCase();
  var bkCnt = 0, itCnt = 0;
  (P.bk || []).forEach(function (x) {
    var ic = x && x.fx ? tripItemCur(P, x).toUpperCase() : (!x.fx && x && x.ax > 0 && x.au ? String(x.au).trim().toUpperCase() : '');
    if (ic && ic !== mainUp) bkCnt++;
  });
  (P.it || []).forEach(function (x) {
    var ic = x && x.fx ? tripItemCur(P, x).toUpperCase() : (!x.fx && x && x.ax > 0 && x.au ? String(x.au).trim().toUpperCase() : '');
    if (ic && ic !== mainUp) itCnt++;
  });
  return { total: bkCnt + itCnt, bk: bkCnt, it: itCnt };
}
/** Pesan standar penolakan hapus/matikan mata uang yang masih dipakai item. */
function tripFormatCurUsageMsg(u) {
  var o = u || { total: 0, bk: 0, it: 0 };
  return 'Dipakai ' + o.total + ' item (' + o.bk + ' pemesanan, ' + o.it + ' itinerary)';
}
/** HTML <option> pilihan mata uang pada form item (Rp, utama, dan tambahan bila saklar menyala). */
function tripCurSelectOptsHtml(P, editItem) {
  var main = (P && String(P.cur || '').trim()) || '';
  var curSelC = editItem && editItem.fx && editItem.c ? String(editItem.c).trim().toUpperCase() : '';
  var extraMatch = false;
  if (curSelC && P && Array.isArray(P.fxs)) {
    extraMatch = P.fxs.some(function (f) { return f && String(f.c || '').trim().toUpperCase() === curSelC; });
  }
  var html = '<option value="idr"' + (!(editItem && editItem.fx) ? ' selected' : '') + '>Rp</option>';
  if (main) {
    html += '<option value="fx"' + (editItem && editItem.fx && !extraMatch ? ' selected' : '') + '>' + esc(main) + '</option>';
  }
  if (P && Array.isArray(P.fxs)) {
    P.fxs.forEach(function (f) {
      if (!f || !f.c) return;
      var cu = String(f.c).trim().toUpperCase();
      if (!cu) return;
      html += '<option value="fx:' + esc(cu) + '"' + (editItem && editItem.fx && extraMatch && curSelC === cu ? ' selected' : '') + '>' + esc(cu) + '</option>';
    });
  }
  return html;
}
/** Sinkronkan UI editor beberapa mata uang (checkbox, kontainer, daftar baris, tombol tambah). */
function tripRenderFxsEditorUi(chkEl, wrapEl, listEl, addBtnEl, enabled, rows) {
  if (chkEl) chkEl.checked = !!enabled;
  if (wrapEl) wrapEl.style.display = enabled ? 'flex' : 'none';
  if (listEl) listEl.innerHTML = tripRenderFxsRowsHtml(rows);
  if (addBtnEl) addBtnEl.disabled = (rows && rows.length >= 6);
}
/** Tangani perubahan saklar "Gunakan beberapa mata uang"; menolak mematikan bila ada item memakai mata uang tambahan. */
function tripHandleFxsToggleChange(chkEl, wrapEl, listEl, addBtnEl, errEl, trEdit, getDraft, setEnabled, toastFn) {
  if (!chkEl) return;
  if (!chkEl.checked && trEdit) {
    var uAll = tripCountAllExtraCurUsage(trEdit);
    if (uAll.total > 0) {
      var msg = tripFormatCurUsageMsg(uAll);
      chkEl.checked = true;
      setEnabled(true);
      if (errEl) errEl.textContent = msg;
      tripRenderFxsEditorUi(chkEl, wrapEl, listEl, addBtnEl, true, getDraft());
      if (typeof toastFn === 'function') toastFn(msg);
      return;
    }
  }
  setEnabled(!!chkEl.checked);
  if (errEl) errEl.textContent = '';
  tripRenderFxsEditorUi(chkEl, wrapEl, listEl, addBtnEl, !!chkEl.checked, getDraft());
}
/** Tambah baris mata uang tambahan baru (maks 6). */
function tripHandleFxsAddRow(chkEl, wrapEl, listEl, addBtnEl, errEl, enabled, draft, toastFn) {
  if (draft.length >= 6) {
    if (addBtnEl) addBtnEl.disabled = true;
    var msgMax = 'Maksimal 6 mata uang tambahan.';
    if (errEl) errEl.textContent = msgMax;
    if (typeof toastFn === 'function') toastFn(msgMax);
    return;
  }
  draft.push({ c: '', r: 0, origC: '' });
  if (errEl) errEl.textContent = '';
  tripRenderFxsEditorUi(chkEl, wrapEl, listEl, addBtnEl, enabled, draft);
}
/** Hapus baris mata uang tambahan ke-idx; diblokir bila masih dipakai item. */
function tripHandleFxsDelRow(chkEl, wrapEl, listEl, addBtnEl, errEl, enabled, draft, idx, trEdit, toastFn) {
  if (!(idx >= 0 && idx < draft.length)) return;
  var row = draft[idx];
  var codeToCheck = String((row && (row.origC || row.c)) || '').trim().toUpperCase();
  if (trEdit && codeToCheck) {
    var u = tripCountCurUsage(trEdit, codeToCheck);
    if (u.total > 0) {
      var msg = tripFormatCurUsageMsg(u);
      if (errEl) errEl.textContent = msg;
      if (typeof toastFn === 'function') toastFn(msg);
      return;
    }
  }
  draft.splice(idx, 1);
  if (errEl) errEl.textContent = '';
  tripRenderFxsEditorUi(chkEl, wrapEl, listEl, addBtnEl, enabled, draft);
}
/** Sinkronkan daftar baris mata uang tambahan [kode][kurs][hapus] untuk modal Desktop & sheet APK. */
function tripRenderFxsRowsHtml(rows) {
  if (!rows || !rows.length) {
    return '<div style="font-size:0.76rem;color:var(--text-muted);padding:6px 2px">Belum ada mata uang tambahan. Klik &ldquo;+ Tambah mata uang&rdquo; (maks. 6).</div>';
  }
  return rows.map(function (r, idx) {
    var rStr = r.rRaw != null ? String(r.rRaw) : (r.r > 0 ? String(r.r) : '');
    var fxReadTxt = tripFormatRateReadText(rStr, r.c || '');
    return (
      '<div class="trip-fx-edit-row" data-fx-row="' + idx + '">' +
      '<input type="text" class="input mono trip-fx-code-inp" data-fx-code="' + idx + '" maxlength="3" placeholder="NOK" value="' + esc(r.c || '') + '" style="text-transform:uppercase" aria-label="Kode mata uang tambahan ' + (idx + 1) + '" />' +
      '<input type="text" class="input mono trip-fx-rate-inp" data-fx-rate="' + idx + '" data-num-only="dec" inputmode="decimal" placeholder="Kurs Rp (opsional)" value="' + esc(rStr) + '" aria-label="Kurs Rupiah untuk mata uang ' + esc(r.c || String(idx + 1)) + '" />' +
      '<button type="button" class="btn btn-secondary btn-sm trip-fx-del-btn" data-fx-del="' + idx + '" aria-label="Hapus mata uang tambahan">Hapus</button>' +
      '<div class="trip-rate-read pv" data-fx-read="' + idx + '"' + (fxReadTxt ? '' : ' hidden') + '>' + esc(fxReadTxt) + '</div>' +
      '</div>'
    );
  }).join('');
}
/** Validasi baris mata uang tambahan saat simpan modal/sheet Ubah Perjalanan. */
function tripValidateFxsRows(mainCurRaw, rows) {
  var mainCur = String(mainCurRaw || '').trim().toUpperCase();
  var arr = Array.isArray(rows) ? rows : [];
  if (arr.length > 6) return { error: 'Maksimal 6 mata uang tambahan.' };
  if (arr.length > 0 && !mainCur) return { error: 'Isi mata uang utama terlebih dahulu sebelum memakai beberapa mata uang.' };
  var clean = [], seen = {}, renames = [];
  for (var i = 0; i < arr.length; i++) {
    var row = arr[i] || {};
    var code = String(row.c || '').trim().toUpperCase();
    if (!code || !/^[A-Z]{3}$/.test(code)) return { error: 'Kode mata uang tambahan ke-' + (i + 1) + ' harus 3 huruf A-Z.' };
    if (code === 'IDR' || code === 'RP') return { error: code + ' sudah menjadi mata uang dasar.' };
    if (mainCur && code === mainCur) return { error: 'Kode ' + code + ' sudah dipakai sebagai mata uang utama.' };
    if (seen[code]) return { error: 'Kode mata uang ' + code + ' duplikat.' };
    seen[code] = 1;
    var rRaw = row.rRaw != null ? String(row.rRaw).trim() : (row.r > 0 ? String(row.r) : '');
    var rVal = 0;
    if (rRaw) {
      rVal = tripParseRateVal(rRaw);
      if (!(rVal > 0)) return { error: 'Kurs ' + code + ' tidak valid.' };
    }
    if (row.origC && String(row.origC).trim().toUpperCase() !== code) {
      renames.push({ from: String(row.origC).trim().toUpperCase(), to: code });
    }
    clean.push({ c: code, r: rVal });
  }
  return { error: '', fxs: clean, renames: renames };
}
/** Terapkan perubahan kode mata uang (rename) ke item pemesanan & itinerary yang memakai kode lama. */
function tripApplyFxsRenames(P, renames) {
  if (!P || !Array.isArray(renames) || !renames.length) return;
  var mapR = {};
  renames.forEach(function (rn) { if (rn && rn.from && rn.to) mapR[rn.from] = rn.to; });
  (P.bk || []).forEach(function (x) {
    if (x && x.fx && x.c && mapR[String(x.c).toUpperCase()]) x.c = mapR[String(x.c).toUpperCase()];
  });
  (P.it || []).forEach(function (x) {
    if (x && x.fx && x.c && mapR[String(x.c).toUpperCase()]) x.c = mapR[String(x.c).toUpperCase()];
  });
}
/** Rincian pecahan rupiah vs mata uang asing, aturan inklusi persis sama dgn tripPlan() plus by[] per mata uang. */
function tripFxSplit(P) {
  var idrRaw = 0, fxAmt = 0, unlockedNoRate = false;
  var byMap = {}, order = [];
  var addItem = function (x, amtNum, rpVal) {
    var curC = x && x.fx ? tripItemCur(P, x) : '';
    if (x && x.fx && curC) {
      fxAmt += amtNum;
      var missing = amtNum > 0 && !(tripItemRate(P, x) > 0);
      if (missing) unlockedNoRate = true;
      if (!byMap[curC]) {
        byMap[curC] = { c: curC, amt: 0, rawRp: 0, noRate: false };
        order.push(curC);
      }
      byMap[curC].amt += amtNum;
      byMap[curC].rawRp += rpVal;
      if (missing) byMap[curC].noRate = true;
    } else {
      idrRaw += amtNum;
    }
  };
  if (P) {
    (P.bk || []).forEach(function (x) { addItem(x, +x.amt || 0, tripBkRp(P, x)); });
    (P.it || []).forEach(function (x) {
      if (x.pay === 'on' || !x.est) return;
      addItem(x, +x.est || 0, tripItRp(P, x));
    });
  }
  var hasFx = fxAmt > 0;
  var noRate = !!(hasFx && unlockedNoRate);
  var idr = Math.round(idrRaw);
  var fxIdr = 0;
  if (hasFx) {
    var pl = tripPlan(P);
    fxIdr = Math.round(pl.t) - idr;
  }
  var orderedKeys = [];
  if (P) {
    tripAllCurList(P).forEach(function (entry) {
      for (var j = 0; j < order.length; j++) {
        if (order[j].toUpperCase() === String(entry.c || '').toUpperCase() && orderedKeys.indexOf(order[j]) < 0) {
          orderedKeys.push(order[j]);
        }
      }
    });
  }
  order.forEach(function (k) {
    if (orderedKeys.indexOf(k) < 0) orderedKeys.push(k);
  });
  var lastPosIdx = -1;
  for (var i0 = 0; i0 < orderedKeys.length; i0++) {
    if (byMap[orderedKeys[i0]].rawRp > 0) lastPosIdx = i0;
  }
  if (lastPosIdx < 0 && orderedKeys.length > 0) lastPosIdx = orderedKeys.length - 1;
  var sumRoundedOthers = 0;
  for (var i1 = 0; i1 < orderedKeys.length; i1++) {
    if (i1 !== lastPosIdx) sumRoundedOthers += Math.round(byMap[orderedKeys[i1]].rawRp);
  }
  var byList = [];
  for (var i2 = 0; i2 < orderedKeys.length; i2++) {
    var ent = byMap[orderedKeys[i2]];
    var partIdr = i2 === lastPosIdx ? (fxIdr - sumRoundedOthers) : Math.round(ent.rawRp);
    byList.push({ c: ent.c, amt: ent.amt, idr: partIdr, noRate: ent.noRate });
  }
  var res = { hasFx: hasFx, idr: idr, fxIdr: fxIdr, fxAmt: fxAmt, noRate: noRate };
  Object.defineProperty(res, 'by', { value: byList, enumerable: false, writable: true, configurable: true });
  return res;
}
/** Keterangan ekuivalen rupiah kecil bila nominal dalam mata uang asing (kurs terkunci / kurs manual / kurs berjalan). */
function tripEqHint(P, v, fx, lockedRt, isPaidOpt, curOpt) {
  var isObj = v && typeof v === 'object';
  var num = isObj ? (+(v.amt != null ? v.amt : v.est) || 0) : (+v || 0);
  var isFx = isObj ? !!v.fx : !!fx;
  var lk = isObj
    ? (tripHasValidRt(v) ? v.rt : 0)
    : (typeof lockedRt === 'number' && Number.isFinite(lockedRt) && lockedRt > 0 && lockedRt <= 1e9 ? lockedRt : 0);
  var isPaidFlag = isObj ? !!v.paid : (isPaidOpt === undefined ? true : !!isPaidOpt);
  var cCode = isObj ? tripItemCur(P, v) : (curOpt || ((P && String(P.cur || '').trim()) || ''));
  if (!isFx || !P || !cCode || !(num > 0)) return '';
  if (lk > 0) return '≈ ' + rp(num * lk) + (isPaidFlag ? ' · kurs terkunci ' : ' · kurs ') + lk.toLocaleString('id-ID');
  var r = tripCurRate(P, cCode);
  if (!(r > 0)) return '';
  return '≈ ' + rp(num * r);
}
/** Status pratinjau form (teks ekuivalen Rp atau peringatan kurs belum diatur per mata uang). */
function tripFormEqPreview(P, v, isFx, lockedRt, isPaidOpt, curOpt) {
  var cCode = curOpt || ((P && String(P.cur || '').trim()) || '');
  if (!isFx || !P || !cCode) return { text: '', warn: false };
  var lk = typeof lockedRt === 'number' && Number.isFinite(lockedRt) && lockedRt > 0 && lockedRt <= 1e9 ? lockedRt : 0;
  if (lk > 0) return { text: tripEqHint(P, v, true, lk, isPaidOpt, cCode), warn: false };
  if (!(tripCurRate(P, cCode) > 0)) {
    var mainUp = String(P.cur || '').trim().toUpperCase();
    var multiWarn = tripMultiCurOn(P) || (mainUp && cCode.toUpperCase() !== mainUp);
    return { text: multiWarn ? ('Kurs ' + cCode + ' belum diatur') : 'Kurs belum diatur', warn: true };
  }
  return { text: tripEqHint(P, v, true, 0, false, cCode), warn: false };
}
/** Sinkronkan daftar pasangan [idInput, idSelectCur, idEqEl] pada form itinerary/pemesanan. */
function tripSyncEqPairs(P, pairs) {
  pairs.forEach(function (pair) {
    var inp = $(pair[0]), sel = $(pair[1]), eqEl = $(pair[2]);
    if (!inp || !sel || !eqEl) return;
    var valNum = typeof getRpVal === 'function' ? getRpVal(pair[0]) : (+String(inp.value || '').replace(/\D/g, '') || 0);
    var spec = tripParseCurSelectVal(P, sel.value);
    var cCode = spec.fx ? (spec.c || ((P && String(P.cur || '').trim()) || '')) : '';
    var prev = tripFormEqPreview(P, valNum, spec.fx, 0, false, cCode);
    eqEl.textContent = prev.text;
    eqEl.classList.toggle('is-warn', !!prev.warn);
    eqEl.classList.toggle('pv', !!(prev.text && !prev.warn));
  });
}
/** Format nominal Rupiah ringkas untuk ringkasan (mis. Rp 1,5 jt / Rp 450 rb). */
function rpShort(n) {
  var raw = Math.round(+n || 0);
  if (!raw) return 'Rp 0';
  var sign = raw < 0 ? '-' : '';
  var a = Math.abs(raw);
  if (a >= 1e9) {
    var mVal = Math.round(a / 1e8) / 10;
    return sign + 'Rp ' + String(mVal).replace('.', ',') + ' M';
  }
  if (a >= 1e6) {
    var jVal = Math.round(a / 1e5) / 10;
    if (jVal >= 1000) return sign + 'Rp ' + String(Math.round(jVal / 100) / 10).replace('.', ',') + ' M';
    return sign + 'Rp ' + String(jVal).replace('.', ',') + ' jt';
  }
  if (a >= 1e3) {
    var rVal = Math.round(a / 1000);
    if (rVal >= 1000) return sign + 'Rp 1 jt';
    return sign + 'Rp ' + rVal + ' rb';
  }
  return sign + 'Rp ' + a;
}
/** Cek status terbuka disclosure pada UI state (bawaan tertutup). */
function tripIsDisclosureOpen(stateObj, key) {
  return !!(stateObj && stateObj.tripRingDisclosures && stateObj.tripRingDisclosures[key]);
}
/** Komponen lipat bersama (Progressive Disclosure) untuk Ringkasan Perjalanan. */
function tripDisclosureHtml(opts) {
  var o = opts || {};
  var key = String(o.key || '');
  var open = !!o.open;
  var openLbl = String(o.openLabel || 'Rincian');
  var closeLbl = String(o.closeLabel || 'Tutup');
  var ctrlId = String(o.ctrlId || ('trip-disc-' + key.replace(/[^a-zA-Z0-9_-]/g, '_')));
  var btnCls = 'trip-disc-btn' + (o.btnClass ? ' ' + o.btnClass : '');
  var chevSvg = '<svg class="trip-disc-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  var triggerHtml = '<button type="button" class="' + btnCls + '" data-trip-disc="' + esc(key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + esc(ctrlId) + '" data-open-lbl="' + esc(openLbl) + '" data-close-lbl="' + esc(closeLbl) + '">' +
    '<span class="trip-disc-lbl">' + esc(open ? closeLbl : openLbl) + '</span>' + chevSvg + '</button>';
  var bodyHtml = '<div class="trip-disc-body' + (o.bodyClass ? ' ' + o.bodyClass : '') + '" id="' + esc(ctrlId) + '"' + (open ? '' : ' hidden') + '>' + (o.bodyHtml || '') + '</div>';
  return { triggerHtml: triggerHtml, bodyHtml: bodyHtml };
}
/** Handler toggle untuk tombol [data-trip-disc] pada Desktop & APK. */
function tripHandleDisclosureToggle(stateObj, btnEl, scopeRoot) {
  if (!btnEl) return;
  var key = btnEl.getAttribute('data-trip-disc') || '';
  if (!key) return;
  var curOpen = btnEl.getAttribute('aria-expanded') === 'true';
  var nextOpen = !curOpen;
  if (stateObj) {
    stateObj.tripRingDisclosures = stateObj.tripRingDisclosures || {};
    if (nextOpen) stateObj.tripRingDisclosures[key] = true;
    else delete stateObj.tripRingDisclosures[key];
  }
  btnEl.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
  var lblEl = btnEl.querySelector('.trip-disc-lbl');
  if (lblEl) {
    lblEl.textContent = nextOpen ? (btnEl.getAttribute('data-close-lbl') || 'Tutup') : (btnEl.getAttribute('data-open-lbl') || 'Rincian');
  }
  var ctrlId = btnEl.getAttribute('aria-controls');
  var panelEl = ctrlId && scopeRoot && scopeRoot.querySelector ? scopeRoot.querySelector('#' + ctrlId) : null;
  if (!panelEl && ctrlId && typeof document !== 'undefined') panelEl = document.getElementById(ctrlId);
  if (panelEl) {
    panelEl.hidden = !nextOpen;
    if (nextOpen && panelEl.classList) {
      panelEl.classList.remove('is-opening');
      void panelEl.offsetWidth;
      panelEl.classList.add('is-opening');
    }
  }
}
/** Format nominal singkatan untuk kartu Rencana vs Realita (mendukung multi-cur). */
function tripShortFxBrief(P, sp) {
  if (!sp || !sp.hasFx) return '';
  if (!tripMultiCurOn(P) && sp.by.length <= 1) return esc(fxs(P, sp.fxAmt));
  var parts = sp.by.slice(0, 2).map(function (b) { return esc(fxs(P, b.amt, b.c)); });
  if (sp.by.length > 2) parts.push('+' + (sp.by.length - 2));
  return parts.join(' &middot; ');
}
/** HTML hint tile "Total Rencana Biaya": identik dgn teks lama bila !hasFx & saklar mati. */
function tripTotalHintHtml(P, pl, stateObj, isMobile) {
  var p0 = pl || tripPlan(P);
  var sp = tripFxSplit(P);
  if (!sp.hasFx) return 'Pemesanan ' + rp(p0.b) + ' + Harian ' + rp(p0.d);
  var detailHtml = '';
  if (!tripMultiCurOn(P) && sp.by.length <= 1) {
    if (sp.noRate) {
      detailHtml =
        '<span class="trip-fx-line">Rupiah <span class="mono pv">' + rp(sp.idr) + '</span></span>\n' +
        '<span class="trip-fx-line">Asing <span class="mono pv">' + esc(fxs(P, sp.fxAmt)) + '</span> &middot; kurs belum diatur</span>\n' +
        '<span class="trip-fx-warn">Kurs belum diatur: total belum akurat</span>';
    } else {
      detailHtml =
        '<span class="trip-fx-line">Rupiah <span class="mono pv">' + rp(sp.idr) + '</span></span>\n' +
        '<span class="trip-fx-line">Asing <span class="mono pv">' + rp(sp.fxIdr) + '</span> <span class="trip-fx-eq mono pv">(≈ ' + esc(fxs(P, sp.fxAmt)) + ')</span></span>\n' +
        '<span class="trip-fx-sub pv">Pemesanan ' + rp(p0.b) + ' + Harian ' + rp(p0.d) + '</span>';
    }
  } else {
    var fxParts = sp.by.slice(0, 2).map(function (b) { return esc(fxs(P, b.amt, b.c)); });
    if (sp.by.length > 2) fxParts.push('+' + (sp.by.length - 2));
    var warnCors = sp.by.filter(function (b) { return b.noRate; }).map(function (b) { return 'Kurs ' + esc(b.c) + ' belum diatur'; });
    detailHtml =
      '<span class="trip-fx-line">Rupiah <span class="mono pv">' + rp(sp.idr) + '</span></span>\n' +
      '<span class="trip-fx-line">Asing <span class="mono pv">' + rp(sp.fxIdr) + '</span> <span class="trip-fx-eq mono pv">(≈ ' + fxParts.join(' &middot; ') + ')</span></span>' +
      (warnCors.length ? '\n<span class="trip-fx-warn">' + warnCors.join(' &middot; ') + '</span>' : '') +
      '\n<span class="trip-fx-sub pv">Pemesanan ' + rp(p0.b) + ' + Harian ' + rp(p0.d) + '</span>';
  }
  var discKey = 'tot:' + String((P && P.id) || 'trip');
  var isOpen = tripIsDisclosureOpen(stateObj, discKey);
  var ctrlId = (isMobile ? 'm-' : '') + 'trip-tot-det-' + String((P && P.id) || '0').replace(/[^a-zA-Z0-9_-]/g, '_');
  var fxBrief = tripShortFxBrief(P, sp);
  var briefTxt = '';
  if (sp.noRate) {
    briefTxt = (sp.idr > 0 ? rpShort(sp.idr) + ' + ' : '') + fxBrief;
  } else {
    var segs = [];
    if (sp.idr > 0) segs.push(rpShort(sp.idr));
    if (sp.fxIdr > 0) segs.push('Asing ' + rpShort(sp.fxIdr));
    else if (fxBrief) segs.push(fxBrief);
    briefTxt = segs.join(' + ') || rpShort(0);
  }
  var warnPill = sp.noRate ? ' <span class="trip-fx-warn-pill">Kurs belum diatur</span>' : '';
  var disc = tripDisclosureHtml({
    key: discKey,
    ctrlId: ctrlId,
    open: isOpen,
    openLabel: 'Rincian',
    closeLabel: 'Tutup',
    bodyClass: 'trip-tot-det',
    bodyHtml: detailHtml,
  });
  return '<div class="trip-tot-bar"><span class="trip-tot-brief pv">' + briefTxt + '</span>' + warnPill + disc.triggerHtml + '</div>' + disc.bodyHtml;
}
/** Kartu baru "Rincian mata uang" di Ringkasan (Desktop & APK); tampil bila saklar menyala atau >1 mata uang terpakai. */
function tripFxDetailCardHtml(P, isMobile) {
  if (!P) return '';
  var sp = tripFxSplit(P);
  if (!tripMultiCurOn(P) && sp.by.length <= 1) return '';
  var allCors = tripAllCurList(P), seen = {};
  allCors.forEach(function (entry) { seen[String(entry.c || '').toUpperCase()] = entry; });
  sp.by.forEach(function (b) {
    var k = String(b.c || '').toUpperCase();
    if (!seen[k]) {
      var ent = { c: b.c, r: tripCurRate(P, b.c), isMain: k === String(P.cur || '').toUpperCase() };
      seen[k] = ent;
      allCors.push(ent);
    }
  });
  var byByCode = {};
  sp.by.forEach(function (b) { byByCode[String(b.c || '').toUpperCase()] = b; });
  var rowsHtml = allCors.length ? allCors.map(function (curObj) {
    var cu = String(curObj.c || '').toUpperCase();
    var bEnt = byByCode[cu];
    var amt = bEnt ? bEnt.amt : 0;
    var idr = bEnt ? bEnt.idr : 0;
    var rateVal = curObj.r || 0;
    var hasMissing = bEnt ? bEnt.noRate : !(rateVal > 0);
    var badgeCls = isMobile ? ('badge ' + (curObj.isMain ? 'b-ac' : 'b-nt')) : ('badge ' + (curObj.isMain ? 'badge-accent' : 'badge-neutral'));
    var rowCls = isMobile ? 'simple-row m-ring-row trip-fx-detail-row' : 'simple-row trip-fx-detail-row';
    var ratePart = rateVal > 0
      ? '<span class="trip-fx-detail-rate">kurs ' + esc(rateVal.toLocaleString('id-ID')) + '</span>'
      : '<span class="trip-eq-hint is-warn" style="display:inline;margin:0">Kurs ' + esc(curObj.c) + ' belum diatur</span>';
    var rpPart = (bEnt && bEnt.noRate)
      ? '<span class="trip-eq-hint is-warn" style="margin:0">Kurs ' + esc(curObj.c) + ' belum diatur</span>'
      : '<span class="simple-row-amt pv">≈ ' + rp(idr) + '</span>';
    return (
      '<div class="' + rowCls + '" style="cursor:default">' +
      '<div class="trip-fx-detail-left"><span class="' + badgeCls + '">' + esc(curObj.c) + '</span>' +
      '<span class="trip-fx-detail-mid"><strong class="mono pv">' + esc(fxs(P, amt, curObj.c)) + '</strong> &middot; ' + ratePart + '</span></div>' +
      rpPart + '</div>'
    );
  }).join('') : '<div style="padding:10px;color:var(--text-muted);font-size:0.8rem">Belum ada mata uang asing diatur.</div>';
  if (isMobile) {
    return (
      '<div class="card trip-fx-detail-card"><div class="card-hd" style="margin-bottom:8px"><div><h3 class="card-title">Rincian mata uang</h3><p class="msc-sub">Nominal &amp; ekuivalen rupiah per mata uang asing</p></div></div>' +
      '<div class="stack" style="gap:6px">' + rowsHtml + '</div></div>'
    );
  }
  return (
    '<div class="card trip-fx-detail-card"><div class="card-header"><div><h2 class="card-title">Rincian mata uang</h2><p class="card-sub">Nominal &amp; ekuivalen rupiah per mata uang asing</p></div></div>' +
    '<div class="simple-list">' + rowsHtml + '</div></div>'
  );
}
/** Baris kartu "Siapkan Tunai / Kartu" untuk mode satu maupun beberapa mata uang. */
function tripCashRowHtml(P, k, cx, isMobile) {
  if (!cx) return '';
  var byKeys = cx.by ? Object.keys(cx.by) : [];
  var isMulti = (tripMultiCurOn(P) || byKeys.length > 1);
  var eqRp = Math.round(cx.idr + (cx.fxRp != null ? cx.fxRp : (cx.fx && P && P.rate ? cx.fx * P.rate : 0)));
  var nomHtml = '';
  if (isMulti && byKeys.length) {
    var parts = byKeys.map(function (cKey) { return esc(fxs(P, cx.by[cKey], cKey)); });
    if (cx.idr > 0) parts.push(rp(cx.idr));
    nomHtml = parts.join(' &middot; ');
  } else {
    nomHtml = cx.fx && P && P.cur ? esc(P.cur) + ' ' + Math.round(cx.fx).toLocaleString('id-ID') : rp(cx.idr);
  }
  var rpTxt = (cx.fx || byKeys.length) ? (cx.fxRp > 0 ? '≈ ' + rp(eqRp) : (cx.idr ? rp(cx.idr) : '—')) : rp(eqRp);
  if (isMobile) {
    return '<div class="simple-row m-ring-row"><span class="simple-row-name">' + esc(k) + '</span><span class="mono pv m-ring-fx">' + nomHtml + '</span><span class="simple-row-amt pv">' + rpTxt + '</span></div>';
  }
  return '<div class="simple-row" style="cursor:default;"><span class="simple-row-name">' + esc(k) + '</span><span class="mono pv" style="font-size:0.8rem;font-weight:700;">' + nomHtml + '</span><span class="simple-row-amt pv">' + rpTxt + '</span></div>';
}
/** HTML nominal baris daftar (itinerary / pemesanan): tambah ekuivalen kecil hanya untuk item fx. */
function tripItemAmtHtml(P, amt, fx, strongCls, strongStyle, lockedRt, isPaidOpt, curOpt) {
  var isObj = amt && typeof amt === 'object';
  var num = isObj ? (+(amt.amt != null ? amt.amt : amt.est) || 0) : (+amt || 0);
  var isFx = isObj ? !!amt.fx : !!fx;
  var lk = isObj
    ? (tripHasValidRt(amt) ? amt.rt : 0)
    : (typeof lockedRt === 'number' && Number.isFinite(lockedRt) && lockedRt > 0 && lockedRt <= 1e9 ? lockedRt : 0);
  var isPaidFlag = isObj ? !!amt.paid : (isPaidOpt === undefined ? true : !!isPaidOpt);
  var cCode = isObj ? tripItemCur(P, amt) : (curOpt || ((P && String(P.cur || '').trim()) || ''));
  var cls = 'mono pv' + (strongCls ? ' ' + strongCls : '');
  var st = strongStyle ? ' style="' + strongStyle + '"' : '';
  if (!(num > 0)) return '<strong class="' + cls + '"' + st + '></strong>';
  if (isFx && P && cCode) {
    var eq = tripEqHint(P, num, true, lk, isPaidFlag, cCode);
    var stackSt = lk > 0 && strongCls === 'msc-right' ? ' style="max-width:54%;flex-shrink:1"' : '';
    return (
      '<div class="trip-amt-stack"' + stackSt + '><strong class="' + cls + '"' + st + '>' + esc(fxs(P, num, cCode)) + '</strong>' +
      (eq ? '\n<span class="trip-eq-hint mono pv">' + esc(eq) + '</span>' : '') +
      '</div>'
    );
  }
  return '<strong class="' + cls + '"' + st + '>' + rp(num) + '</strong>';
}
function lnk(u) {
  var su = typeof safeHref === 'function' ? safeHref(u) : '';
  if (!su) return '';
  return '<a class="lnk" href="' + esc(su) + '" target="_blank" rel="noopener noreferrer">' + (/maps|goo\.gl/i.test(su) ? 'Peta' : /youtu/i.test(su) ? 'Video' : 'Buka') + ' &#8599;</a>';
}
function pchip(p) {
  return p ? '<span class="chp ' + p + '">' + PAYL[p] + '</span>' : '';
}
function bar(v, mx) {
  var pc = mx ? Math.min(100, (v / mx) * 100) : 0;
  return '<div class="catbar" style="margin:8px 0 4px"><i style="width:' + pc.toFixed(1) + '%;background:' + (v > mx ? 'var(--wr)' : 'var(--ac)') + '"></i></div>';
}
function opts(L, sel, lab) {
  return L.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o;
    return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(Array.isArray(o) ? o[1] : o) + '</option>';
  }).join('');
}
/** Rencana biaya: pemesanan + estimasi harian (item itinerary yang bukan "Online", karena yang online dicatat di Pemesanan). */
function tripPlan(P) {
  var r = { b: 0, d: 0, paid: 0, cash: {} };
  P.bk.forEach(function (x) {
    var v = tripBkRp(P, x);
    r.b += v;
    if (x.paid) r.paid += v;
  });
  P.it.forEach(function (x) {
    if (x.pay === 'on' || !x.est) return;
    var est = +x.est || 0;
    var v = tripItRp(P, x);
    r.d += v;
    var k = (x.pay ? PAYL[x.pay] : 'Lainnya') + ' · ' + (x.cat || 'Lainnya'),
      c = r.cash[k] || (r.cash[k] = { fx: 0, idr: 0, fxRp: 0, noRate: false, by: {} });
    var itemCur = x.fx ? tripItemCur(P, x) : '';
    if (x.fx && itemCur) {
      c.fx += est;
      c.fxRp += v;
      if (est > 0 && !(tripItemRate(P, x) > 0)) c.noRate = true;
      c.by[itemCur] = (c.by[itemCur] || 0) + est;
    } else c.idr += est;
  });
  r.t = r.b + r.d;
  return r;
}

/** Kode mata uang aktual item (3 huruf uppercase bila asing, atau '' bila Rupiah). */
function tripActualCur(P, x) {
  if (!x) return '';
  if (x.fx) return (tripItemCur(P, x) || String((P && P.cur) || '').trim()).toUpperCase();
  if (typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0 && typeof x.au === 'string') {
    var auUp = x.au.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(auUp)) return auUp;
  }
  return '';
}

/** Cek apakah item berhak menampilkan tombol & popup Harga Aktual (P2). */
function tripItemHasActualBtn(x, isBookingOpt) {
  if (!x) return false;
  var isBk = isBookingOpt != null ? !!isBookingOpt : (x.amt != null);
  if (!isBk && x.pay === 'on') return false;
  var base = isBk ? (+x.amt || 0) : (+x.est || 0);
  var hasAx = typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0 && x.ax <= 1e12;
  return base > 0 || hasAx;
}

/** Nilai Rupiah harga aktual di lapangan untuk satu item itinerary/pemesanan; 0 bila belum diisi. */
function tripActualRp(P, x) {
  if (!x || !(typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0 && x.ax <= 1e12)) return 0;
  var actCur = tripActualCur(P, x);
  if (!actCur) return x.ax;
  var hasAk = typeof x.ak === 'number' && Number.isFinite(x.ak) && x.ak > 0 && x.ak <= 1e9;
  var r = hasAk ? x.ak : (x.fx ? tripItemRate(P, x) : tripCurRate(P, actCur));
  return x.ax * (r > 0 ? r : 0);
}

/** Nilai Rupiah rencana untuk satu item (pemesanan pakai tripBkRp, itinerary pakai tripItRp). */
function tripPlannedRp(P, x, isBookingOpt) {
  if (!x) return 0;
  var isBk = isBookingOpt != null ? !!isBookingOpt : (x.amt != null);
  return isBk ? tripBkRp(P, x) : tripItRp(P, x);
}

/**
 * Bandingkan Rencana vs Realita dari field ax/ak pada Pemesanan & Itinerary non-online:
 * efekHarga + efekKurs == round(diff), forecast == tripPlan(P).t + diff, Σ byCur.diff == diff.
 */
function tripVsPlan(P) {
  var out = {
    n: 0,
    m: 0,
    estSum: 0,
    actSum: 0,
    diff: 0,
    efekHarga: 0,
    efekKurs: 0,
    hasFx: false,
    items: [],
    topOver: [],
    topSave: [],
    forecast: 0,
    planTotal: 0,
    budget: 0,
    overBudget: false,
    overBudgetDiff: 0,
    sisaPerkiraan: 0,
    byCur: [],
  };
  if (!P) return out;
  var pl = tripPlan(P);
  out.planTotal = pl.t;
  out.budget = (+P.budget > 0 && Number.isFinite(+P.budget)) ? +P.budget : 0;

  var rawEst = 0, rawAct = 0, rawEfekKurs = 0;
  var byCurRaw = {};

  function inspect(x, isBk) {
    if (!x) return;
    if (!isBk && x.pay === 'on') return;
    var base = isBk ? (+x.amt || 0) : (+x.est || 0);
    var hasAx = typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0 && x.ax <= 1e12;
    if (!(base > 0 || hasAx)) return;
    out.m++;
    if (!hasAx) return;
    out.n++;
    var isFx = !!x.fx;
    var planCur = isFx ? (tripItemCur(P, x) || String(P.cur || '').trim().toUpperCase()) : 'IDR';
    var actCur = tripActualCur(P, x) || 'IDR';
    var hasCurFx = actCur !== 'IDR';
    var sameFxCur = !!(isFx && planCur && planCur !== 'IDR' && actCur === planCur);
    var ratePlan = isFx ? tripItemRate(P, x) : 1;
    var hasAk = hasCurFx && typeof x.ak === 'number' && Number.isFinite(x.ak) && x.ak > 0 && x.ak <= 1e9;
    var rateAct = hasCurFx ? (hasAk ? x.ak : (isFx ? ratePlan : tripCurRate(P, actCur))) : 1;
    var plannedRp = tripPlannedRp(P, x, isBk);
    var actualRp = tripActualRp(P, x);
    var diffI = actualRp - plannedRp;
    var efekKursI = sameFxCur ? (x.ax * (rateAct - ratePlan)) : 0;
    var efekHargaI = sameFxCur ? ((x.ax - base) * ratePlan) : diffI;
    rawEst += plannedRp;
    rawAct += actualRp;
    rawEfekKurs += efekKursI;
    if (hasCurFx) out.hasFx = true;
    var bc = byCurRaw[actCur] || (byCurRaw[actCur] = { c: actCur, estRp: 0, actRp: 0, axSum: 0 });
    bc.estRp += plannedRp;
    bc.actRp += actualRp;
    bc.axSum += x.ax;
    out.items.push({
      id: x.id,
      kind: isBk ? 'bk' : 'it',
      name: isBk ? (x.title || '') : (x.place || ''),
      fx: hasCurFx,
      cur: actCur === 'IDR' ? '' : actCur,
      base: base,
      ax: x.ax,
      ak: hasAk ? x.ak : 0,
      ratePlan: ratePlan,
      rateAct: rateAct,
      estRp: plannedRp,
      actRp: actualRp,
      diff: diffI,
      efekHarga: efekHargaI,
      efekKurs: efekKursI,
    });
  }

  (P.bk || []).forEach(function (x) { inspect(x, true); });
  (P.it || []).forEach(function (x) { inspect(x, false); });

  out.estSum = rawEst;
  out.actSum = rawAct;
  out.diff = rawAct - rawEst;
  out.efekKurs = Math.round(rawEfekKurs);
  out.efekHarga = Math.round(out.diff) - out.efekKurs;
  out.forecast = out.planTotal + out.diff;

  if (out.budget > 0) {
    out.overBudget = out.forecast > out.budget;
    if (out.overBudget) out.overBudgetDiff = out.forecast - out.budget;
    else out.sisaPerkiraan = out.budget - out.forecast;
  }

  out.topOver = out.items
    .filter(function (it) { return it.diff > 0; })
    .sort(function (a, b) { return b.diff - a.diff; })
    .slice(0, 3)
    .map(function (it) { return { id: it.id, kind: it.kind, name: it.name, diff: it.diff }; });

  out.topSave = out.items
    .filter(function (it) { return it.diff < 0; })
    .sort(function (a, b) { return a.diff - b.diff; })
    .slice(0, 3)
    .map(function (it) { return { id: it.id, kind: it.kind, name: it.name, diff: it.diff }; });

  var curOrder = [];
  if (P.cur) {
    var mc = String(P.cur).trim().toUpperCase();
    if (byCurRaw[mc]) curOrder.push(mc);
  }
  if (Array.isArray(P.fxs)) {
    P.fxs.forEach(function (f) {
      var fc = f && f.c ? String(f.c).trim().toUpperCase() : '';
      if (fc && byCurRaw[fc] && curOrder.indexOf(fc) < 0) curOrder.push(fc);
    });
  }
  Object.keys(byCurRaw).forEach(function (k) {
    if (k !== 'IDR' && curOrder.indexOf(k) < 0) curOrder.push(k);
  });
  if (byCurRaw.IDR && curOrder.indexOf('IDR') < 0) curOrder.push('IDR');
  out.byCur = curOrder.map(function (c) {
    var o = byCurRaw[c];
    var eR = Math.round(o.estRp), aR = Math.round(o.actRp);
    return { c: c, estRp: eR, actRp: aR, diff: Math.round(o.actRp - o.estRp), axSum: o.axSum };
  });
  if (out.byCur.length > 0) {
    var targetAllDiff = Math.round(out.diff);
    var prevSum = 0;
    for (var bi = 0; bi < out.byCur.length - 1; bi++) prevSum += out.byCur[bi].diff;
    out.byCur[out.byCur.length - 1].diff = targetAllDiff - prevSum;
  }
  return out;
}

/** Format kurs angka Indonesia ringkas (maks 6 desimal). */
function tripFormatRateIndo(n) {
  var v = +n || 0;
  try {
    return v.toLocaleString('id-ID', { maximumFractionDigits: 6 });
  } catch (e) {
    return String(v);
  }
}

/** Baris ringkas harga aktual pada kartu item (memakai pv & keterangan kata). */
function tripItemActualLineHtml(P, x, isBooking) {
  if (!x || !(typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0 && x.ax <= 1e12)) return '';
  if (!isBooking && x.pay === 'on') return '';
  var actRp = Math.round(tripActualRp(P, x));
  var planRp = Math.round(tripPlannedRp(P, x, isBooking));
  var d = actRp - planRp;
  var diffTxt = d > 0 ? ('lebih mahal ' + rp(d)) : d < 0 ? ('lebih murah ' + rp(Math.abs(d))) : 'sama dg estimasi';
  var diffCls = d > 0 ? 'is-over' : d < 0 ? 'is-save' : 'is-eq';
  var actCur = tripActualCur(P, x);
  var effRate = actCur ? (x.ak > 0 ? x.ak : (x.fx ? tripItemRate(P, x) : tripCurRate(P, actCur))) : 0;
  var kursTxt = (actCur && effRate > 0) ? (' &middot; kurs ' + esc(tripFormatRateIndo(effRate))) : '';
  var actMainHtml = (!x.fx && actCur)
    ? ('Aktual <strong>' + esc(actCur) + ' ' + esc(Math.round(x.ax).toLocaleString('id-ID')) + ' (≈ ' + rp(actRp) + ')</strong>')
    : ('Aktual <strong>' + rp(actRp) + '</strong>');
  return '<div class="trip-item-actual-line pv">' + actMainHtml + ' &middot; <span class="trip-actual-diff ' + diffCls + '">' + esc(diffTxt) + '</span>' + kursTxt + '</div>';
}

/** Tombol umum "Harga Aktual" untuk kartu item (dengan centang bila sudah diisi). */
function tripItemActualBtnHtml(x, attrName, isBookingOpt) {
  if (!tripItemHasActualBtn(x, isBookingOpt)) return '';
  var hasAx = !!(typeof x.ax === 'number' && Number.isFinite(x.ax) && x.ax > 0);
  return '<button type="button" class="btn btn-secondary btn-sm trip-btn-actual' + (hasAx ? ' has-ax' : '') + '" ' +
    attrName + '="' + esc(x.id) + '" aria-label="Catat harga sebenarnya di lapangan" title="Catat harga sebenarnya di lapangan">' +
    (hasAx ? '<span aria-hidden="true">&#10003; </span>' : '') + 'Harga Aktual</button>';
}

/** Label baca-saja estimasi item untuk popup Harga Aktual. */
function tripActualEstLabel(P, x, isBooking) {
  if (!x) return 'Estimasi: Rp 0';
  var base = isBooking ? (+x.amt || 0) : (+x.est || 0);
  var curCode = x.fx ? tripItemCur(P, x) : '';
  var planRp = Math.round(tripPlannedRp(P, x, isBooking));
  if (curCode) {
    return 'Estimasi: ' + curCode + ' ' + Math.round(base).toLocaleString('id-ID') + ' (≈ ' + rp(planRp) + ')';
  }
  return 'Estimasi: ' + rp(planRp);
}

/** Hitung teks pratinjau langsung popup Harga Aktual. */
function tripActualPreviewData(P, x, isBooking, rawAx, rawAk, rawAuOpt) {
  if (!x) return { text: '', detail: '', tone: '' };
  var digits = String(rawAx || '').replace(/\D/g, '').slice(0, 13);
  var axNum = digits ? Number(digits) : 0;
  if (!(axNum > 0 && Number.isFinite(axNum) && axNum <= 1e12)) {
    return { text: '', detail: '', tone: '' };
  }
  var isItemFx = !!(x.fx && tripItemCur(P, x));
  var auCode = !isItemFx && typeof rawAuOpt === 'string' ? rawAuOpt.trim().toUpperCase() : '';
  var actCur = isItemFx ? tripItemCur(P, x) : (/^[A-Z]{3}$/.test(auCode) ? auCode : '');
  var isActFx = !!actCur;
  var ratePlan = isItemFx ? tripItemRate(P, x) : 1;
  var defaultActRate = isItemFx ? ratePlan : (isActFx ? tripCurRate(P, actCur) : 0);
  var parsedAk = isActFx ? tripParseRateLocale(rawAk) : 0;
  var rateAct = isActFx ? (parsedAk > 0 ? parsedAk : defaultActRate) : 1;
  var base = isBooking ? (+x.amt || 0) : (+x.est || 0);
  var estRp = Math.round(tripPlannedRp(P, x, isBooking));
  var actRp = Math.round(axNum * (rateAct > 0 ? rateAct : 0));
  var d = actRp - estRp;
  var diffTxt = d > 0
    ? ('lebih mahal ' + rp(d) + ' dari estimasi')
    : d < 0
      ? ('lebih murah ' + rp(Math.abs(d)) + ' dari estimasi')
      : 'sama dengan estimasi';
  var detailTxt = '';
  if (isItemFx && parsedAk > 0) {
    var eh = Math.round((axNum - base) * ratePlan);
    var ek = Math.round(axNum * (rateAct - ratePlan));
    detailTxt = 'harga ' + tripSignedRp(eh) + ' · kurs ' + tripSignedRp(ek);
  }
  return {
    text: '≈ ' + rp(actRp) + ' · ' + diffTxt,
    detail: detailTxt,
    tone: d > 0 ? 'over' : d < 0 ? 'save' : 'eq',
  };
}

/** Isi opsi mata uang asing pada dropdown popup Harga Aktual dari profil perjalanan. */
function tripPopulateAuSelect(selEl, P, preferredCur) {
  if (!selEl) return;
  var list = tripAllCurList(P);
  var prefUp = String(preferredCur || '').trim().toUpperCase();
  var hasPref = prefUp && list.some(function (f) { return String(f.c || '').toUpperCase() === prefUp; });
  selEl.innerHTML = list.map(function (f, idx) {
    var cu = String(f.c || '').trim().toUpperCase();
    var isSel = hasPref ? (cu === prefUp) : (idx === 0);
    return '<option value="' + esc(cu) + '"' + (isSel ? ' selected' : '') + '>' + esc(cu) + '</option>';
  }).join('');
  if (typeof syncModernSelect === 'function') syncModernSelect(selEl);
}

/** Sinkronkan tampilan & pratinjau langsung popup Harga Aktual (Desktop & APK). */
function tripSyncActualDialogLive(tr, x, isBk, prefix) {
  var g = function (sfx) {
    var id = prefix + '-' + sfx;
    return typeof $ === 'function' ? $(id) : (typeof document !== 'undefined' ? document.getElementById(id) : null);
  };
  if (!tr || !x) return;
  var inputsEl = g('inputs'), axEl = g('ax'), axLbl = g('ax-lbl'), auWrap = g('au-wrap'), auSel = g('au');
  var akWrap = g('ak-wrap'), akEl = g('ak'), akLbl = g('ak-lbl'), akRead = g('ak-read'), akHelp = g('ak-help');
  var fxTogWrap = g('fx-toggle-wrap'), useFxChk = g('use-fx');
  var prevEl = g('prev'), detEl = g('prev-det');
  var formEl = axEl && axEl.form ? axEl.form : null;
  var rootModalEl = axEl && axEl.closest ? axEl.closest('#modal-trip-actual, #m-sheet-actual') : null;
  var isItemFx = !!(x.fx && tripItemCur(tr, x));
  var useFx = isItemFx || !!(fxTogWrap && !fxTogWrap.hidden && useFxChk && useFxChk.checked);
  var mode = isItemFx ? 'fxplan' : (useFx ? 'fx' : 'rp');
  if (rootModalEl) rootModalEl.setAttribute('data-actual-mode', mode);
  if (formEl && formEl._actDraft && !isItemFx && formEl._actDraft.lastMode && formEl._actDraft.lastMode !== mode) {
    var dObj = formEl._actDraft;
    if (dObj.lastMode === 'rp' && mode === 'fx') {
      dObj.rpAx = axEl ? axEl.value : '';
      if (auSel && !auSel.options.length) tripPopulateAuSelect(auSel, tr, dObj.fxAu || '');
      if (axEl) axEl.value = dObj.fxAx || '';
      if (akEl) akEl.value = dObj.fxAk || '';
    } else if (dObj.lastMode === 'fx' && mode === 'rp') {
      dObj.fxAx = axEl ? axEl.value : '';
      dObj.fxAu = auSel ? auSel.value : '';
      dObj.fxAk = akEl ? akEl.value : '';
      if (axEl) axEl.value = dObj.rpAx || '';
    }
    dObj.lastMode = mode;
  } else if (formEl && formEl._actDraft) {
    formEl._actDraft.lastMode = mode;
  }
  if (mode === 'fx' && auSel && !auSel.options.length) {
    tripPopulateAuSelect(auSel, tr, (formEl && formEl._actDraft && formEl._actDraft.fxAu) || '');
  } else if (mode === 'fx' && auSel && auSel.options.length && auSel.selectedIndex < 0) {
    auSel.selectedIndex = 0;
    if (typeof syncModernSelect === 'function') syncModernSelect(auSel);
  }
  if (inputsEl && inputsEl.classList) {
    inputsEl.classList.toggle('is-fx', useFx);
    inputsEl.classList.toggle('has-au', !isItemFx && useFx);
  }
  if (auWrap) auWrap.hidden = mode !== 'fx';
  if (akWrap) akWrap.hidden = !useFx;
  var curCode = isItemFx ? tripItemCur(tr, x) : (useFx && auSel ? String(auSel.value || '').trim().toUpperCase() : '');
  var effRate = isItemFx ? tripItemRate(tr, x) : (curCode ? tripCurRate(tr, curCode) : 0);
  if (axLbl) axLbl.textContent = useFx ? ('Nominal (' + (curCode || 'asing') + ')') : 'Harga di lapangan (Rp)';
  if (akLbl) akLbl.textContent = curCode ? ('Kurs (Rp/' + curCode + ')') : 'Kurs (Rp)';
  if (akEl) akEl.placeholder = effRate > 0 ? tripFormatRateIndo(effRate) : 'Isi kurs';
  if (akHelp) {
    akHelp.hidden = !useFx;
    if (useFx) {
      akHelp.textContent = effRate > 0
        ? ('Kosong = ikut kurs ' + (isItemFx ? 'efektif' : 'perjalanan') + ' (1 ' + (curCode || 'asing') + ' = Rp ' + tripFormatRateIndo(effRate) + ')')
        : ('Kurs ' + (curCode || 'asing') + ' belum diatur. Isi kurs manual terlebih dahulu.');
    } else {
      akHelp.textContent = '';
    }
  }
  if (akRead) tripSyncRateReadEl(akRead, useFx && akEl ? akEl.value : '', curCode);
  var info = tripActualPreviewData(tr, x, isBk, axEl && axEl.value, akEl && akEl.value, (!isItemFx && useFx) ? curCode : '');
  if (prevEl) {
    prevEl.textContent = info.text || '';
    prevEl.className = 'trip-act-prev pv' + (info.tone ? (' is-' + info.tone) : '');
  }
  if (detEl) {
    detEl.textContent = info.detail || '';
    detEl.hidden = !info.detail;
  }
}

/** Inisialisasi kontrol popup Harga Aktual saat dibuka (Desktop & APK). */
function tripSetupActualDialog(tr, x, isBk, prefix, isMobile) {
  var g = function (sfx) {
    var id = prefix + '-' + sfx;
    return typeof $ === 'function' ? $(id) : (typeof document !== 'undefined' ? document.getElementById(id) : null);
  };
  if (!tr || !x) return;
  var itemEl = g('item'), estEl = g('est'), axEl = g('ax'), akEl = g('ak');
  var fxTogWrap = g('fx-toggle-wrap'), useFxChk = g('use-fx'), auSel = g('au'), delBtn = g('del');
  var formEl = axEl && axEl.form ? axEl.form : null;
  if (itemEl) itemEl.textContent = isBk ? (x.title || '') : (x.place || '');
  if (estEl) estEl.textContent = tripActualEstLabel(tr, x, isBk);
  var formattedAx = x.ax > 0 ? (typeof fmtNumOnlyIntStr === 'function' ? fmtNumOnlyIntStr(String(Math.round(x.ax))) : String(Math.round(x.ax))) : '';
  if (axEl) axEl.value = formattedAx;
  tripSetFieldError(prefix + '-ax-err', axEl, '', isMobile);
  tripSetFieldError(prefix + '-ak-err', akEl, '', isMobile);
  var isItemFx = !!(x.fx && tripItemCur(tr, x));
  var curList = tripAllCurList(tr);
  var hasExistingAu = !!(x.ax > 0 && !isItemFx && x.au && curList.some(function (f) { return String(f.c || '').toUpperCase() === String(x.au || '').toUpperCase(); }));
  var initMode = isItemFx ? 'fxplan' : (hasExistingAu ? 'fx' : 'rp');
  if (formEl) {
    formEl._actDraft = {
      lastMode: initMode,
      rpAx: initMode === 'rp' ? formattedAx : '',
      fxAx: initMode === 'fx' ? formattedAx : '',
      fxAu: hasExistingAu ? String(x.au || '').toUpperCase() : '',
      fxAk: initMode === 'fx' && x.ak > 0 ? String(x.ak) : '',
    };
  }
  if (fxTogWrap && useFxChk) {
    if (!isItemFx && curList.length > 0) {
      fxTogWrap.hidden = false;
      useFxChk.checked = hasExistingAu;
      if (hasExistingAu) {
        tripPopulateAuSelect(auSel, tr, x.au || '');
      } else if (auSel) {
        auSel.innerHTML = '';
        if (typeof syncModernSelect === 'function') syncModernSelect(auSel);
      }
    } else {
      fxTogWrap.hidden = true;
      useFxChk.checked = false;
      if (auSel) {
        auSel.innerHTML = '';
        if (typeof syncModernSelect === 'function') syncModernSelect(auSel);
      }
    }
  }
  if (akEl) akEl.value = ((isItemFx || hasExistingAu) && x.ak > 0) ? String(x.ak) : '';
  if (delBtn) delBtn.hidden = !(x.ax > 0);
  tripSyncActualDialogLive(tr, x, isBk, prefix);
}

/** Validasi dan terapkan hasil submit popup Harga Aktual ke item. */
function tripApplyActualSubmit(tr, x, prefix, isMobile) {
  var g = function (sfx) {
    var id = prefix + '-' + sfx;
    return typeof $ === 'function' ? $(id) : (typeof document !== 'undefined' ? document.getElementById(id) : null);
  };
  var axEl = g('ax'), akEl = g('ak'), auEl = g('au');
  var fxTogWrap = g('fx-toggle-wrap'), useFxChk = g('use-fx');
  var rawAx = String(axEl && axEl.value || '').replace(/\D/g, '').slice(0, 13);
  var axVal = rawAx ? Number(rawAx) : 0;
  if (!(axVal > 0 && Number.isFinite(axVal) && axVal <= 1e12)) {
    tripSetFieldError(prefix + '-ax-err', axEl, 'Isi harga aktual lebih besar dari 0.', isMobile);
    if (typeof rkShakeInvalid === 'function') rkShakeInvalid(axEl);
    return { ok: false };
  }
  tripSetFieldError(prefix + '-ax-err', axEl, '', isMobile);
  var isItemFx = !!(x.fx && tripItemCur(tr, x));
  var useFx = isItemFx || !!(fxTogWrap && !fxTogWrap.hidden && useFxChk && useFxChk.checked);
  var auVal = '';
  if (!isItemFx && useFx && auEl) {
    auVal = String(auEl.value || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(auVal)) auVal = '';
  }
  var rawAk = String(akEl && akEl.value || '').trim();
  var akVal = 0;
  if (useFx && rawAk) {
    akVal = tripParseRateLocale(rawAk);
    if (!(akVal > 0 && Number.isFinite(akVal) && akVal <= 1e9)) {
      tripSetFieldError(prefix + '-ak-err', akEl, 'Kurs harus angka lebih besar dari 0.', isMobile);
      if (typeof rkShakeInvalid === 'function') rkShakeInvalid(akEl);
      return { ok: false };
    }
  }
  tripSetFieldError(prefix + '-ak-err', akEl, '', isMobile);
  x.ax = axVal;
  if (!isItemFx && useFx && auVal) x.au = auVal;
  else delete x.au;
  if (useFx && akVal > 0) x.ak = akVal;
  else delete x.ak;
  return { ok: true };
}

/** Konfirmasi hapus harga aktual saat pengguna mengubah mata uang item yang sudah punya ax. */
function tripConfirmCurrencyChangeIfActual(P, oldItem, nextFx, nextC, onProceed) {
  if (!oldItem || !(oldItem.ax > 0)) {
    onProceed(false);
    return;
  }
  var mainCur = (P && P.cur ? String(P.cur).trim().toUpperCase() : '') || 'FX';
  var oldCur = oldItem.fx ? (tripItemCur(P, oldItem) || mainCur).toUpperCase() : 'IDR';
  var newCur = nextFx ? ((nextC ? String(nextC).trim().toUpperCase() : mainCur) || 'FX') : 'IDR';
  if (oldCur === newCur) {
    onProceed(false);
    return;
  }
  if (typeof askConfirm === 'function') {
    askConfirm(
      'Harga aktual akan dihapus karena mata uang berubah. Lanjutkan?',
      function () { onProceed(true); },
      'Ya, lanjutkan',
      'Ubah mata uang'
    );
  } else {
    onProceed(true);
  }
}

/** Render kartu "Rencana vs Realita" (atau keadaan kosong 1 baris) untuk sub-tab Ringkasan. */
function tripRenderVsPlanCardHtml(P, isMobile, stateObj) {
  var vp = tripVsPlan(P);
  if (!vp.m) return '';
  if (!vp.n) {
    return '<div class="trip-vs-empty" id="' + (isMobile ? 'm-' : '') + 'trip-vs-empty">' +
      'Belum ada harga aktual. Buka Itinerary atau Pemesanan lalu ketuk Harga Aktual pada item.</div>';
  }
  var diffR = Math.round(vp.diff);
  var statusCls = diffR > 0 ? 'is-over' : diffR < 0 ? 'is-save' : 'is-eq';
  var statusTxtShort = diffR > 0 ? ('Lebih ' + rpShort(diffR)) : diffR < 0 ? ('Hemat ' + rpShort(Math.abs(diffR))) : 'Sama persis';
  var ratio = vp.m > 0 ? Math.min(1, Math.max(0, vp.n / vp.m)) : 0;

  var fxRowHtml = vp.hasFx
    ? '<div class="trip-vs-fx-row">Efek harga <strong class="mono pv">' + esc(tripSignedRp(vp.efekHarga)) + '</strong> &middot; Efek kurs <strong class="mono pv">' + esc(tripSignedRp(vp.efekKurs)) + '</strong></div>'
    : '';

  var budHtml = '';
  if (vp.budget > 0) {
    budHtml = vp.overBudget
      ? '<span class="trip-vs-bud-badge is-over">Perkiraan melebihi anggaran <strong class="mono pv">' + rp(Math.round(vp.overBudgetDiff)) + '</strong></span>'
      : '<span class="trip-vs-bud-badge is-ok">Sisa anggaran <strong class="mono pv">' + rp(Math.round(vp.sisaPerkiraan)) + '</strong></span>';
  }

  var topListHtml = '';
  if (vp.topOver.length || vp.topSave.length) {
    topListHtml = '<div class="trip-vs-lists">';
    if (vp.topOver.length) {
      topListHtml += '<div class="trip-vs-list-col"><div class="trip-vs-list-hd">Paling meleset</div>' +
        vp.topOver.map(function (it) {
          return '<div class="trip-vs-list-row"><span class="trip-vs-list-name">' + esc(it.name || '-') + '</span><span class="mono pv is-over">+' + rp(Math.round(it.diff)) + '</span></div>';
        }).join('') + '</div>';
    }
    if (vp.topSave.length) {
      topListHtml += '<div class="trip-vs-list-col"><div class="trip-vs-list-hd">Paling hemat</div>' +
        vp.topSave.map(function (it) {
          return '<div class="trip-vs-list-row"><span class="trip-vs-list-name">' + esc(it.name || '-') + '</span><span class="mono pv is-save">-' + rp(Math.round(Math.abs(it.diff))) + '</span></div>';
        }).join('') + '</div>';
    }
    topListHtml += '</div>';
  }

  var fxBuckets = vp.byCur.filter(function (b) { return b.c !== 'IDR'; });
  var curBreakHtml = '';
  if ((tripMultiCurOn(P) || fxBuckets.length > 1) && fxBuckets.length > 0) {
    curBreakHtml = '<div class="trip-vs-cur-list"><div class="trip-vs-list-hd">Rincian per mata uang</div>' +
      fxBuckets.map(function (b) {
        var bdCls = b.diff > 0 ? 'is-over' : b.diff < 0 ? 'is-save' : 'is-eq';
        return '<div class="trip-vs-cur-row"><span class="badge ' + (isMobile ? 'b-nt' : 'badge-neutral') + '">' + esc(b.c) + '</span>' +
          '<span class="trip-vs-cur-nums">Estimasi <strong class="mono pv">' + rp(b.estRp) + '</strong> &rarr; Aktual <strong class="mono pv">' + rp(b.actRp) + '</strong></span>' +
          '<span class="mono pv ' + bdCls + '">' + esc(tripSignedRp(b.diff)) + '</span></div>';
      }).join('') + '</div>';
  }

  var discKeyVs = 'vs:' + String((P && P.id) || 'trip');
  var isOpenVs = tripIsDisclosureOpen(stateObj, discKeyVs);
  var ctrlIdVs = (isMobile ? 'm-' : '') + 'trip-vs-det-' + String((P && P.id) || '0').replace(/[^a-zA-Z0-9_-]/g, '_');
  var fullRowHtml =
    '<div class="trip-vs-full-line pv">Penuh: Estimasi <strong class="mono">' + rp(Math.round(vp.estSum)) + '</strong> &rarr; Aktual <strong class="mono">' + rp(Math.round(vp.actSum)) + '</strong> (<strong class="mono ' + statusCls + '">' + esc(tripSignedRp(diffR)) + '</strong>)</div>';
  var detailInnerHtml =
    fullRowHtml +
    fxRowHtml +
    '<div class="trip-vs-forecast-row">' +
    '<span>Perkiraan total akhir <strong class="mono pv">' + rp(Math.round(vp.forecast)) + '</strong> <span class="trip-vs-vs-plan">vs rencana <span class="mono pv">' + rp(Math.round(vp.planTotal)) + '</span></span></span>' +
    budHtml +
    '</div>' +
    topListHtml +
    curBreakHtml;
  var discVs = tripDisclosureHtml({
    key: discKeyVs,
    ctrlId: ctrlIdVs,
    open: isOpenVs,
    openLabel: 'Rincian',
    closeLabel: 'Tutup',
    bodyClass: 'trip-vs-det',
    bodyHtml: detailInnerHtml,
  });

  return '<div class="card trip-vs-card" id="' + (isMobile ? 'm-' : '') + 'trip-vs-card">' +
    '<div class="' + (isMobile ? 'card-hd' : 'card-header') + ' trip-vs-hd">' +
    '<div><h' + (isMobile ? '3' : '2') + ' class="card-title">Rencana vs Realita</h' + (isMobile ? '3' : '2') + '><p class="' + (isMobile ? 'msc-sub' : 'card-sub') + ' trip-vs-sub">dari ' + vp.n + ' item aktual</p></div>' +
    '<div class="trip-vs-hd-right"><span class="trip-vs-chip ' + statusCls + '"><span class="pv">' + esc(statusTxtShort) + '</span></span>' + discVs.triggerHtml + '</div></div>' +
    '<div class="trip-vs-prog">' +
    '<div class="trip-vs-prog-hd"><span>Terisi ' + vp.n + ' dari ' + vp.m + ' item</span><span class="mono">' + Math.round(ratio * 100) + '%</span></div>' +
    '<div class="trip-vs-prog-track"><div class="trip-vs-prog-fill" style="transform:scaleX(' + ratio.toFixed(4) + ')"></div></div>' +
    '</div>' +
    '<div class="trip-vs-stats is-compact">' +
    '<div class="trip-vs-stat"><span class="trip-vs-stat-k">Estimasi</span><strong class="mono pv trip-vs-stat-v">' + esc(rpShort(vp.estSum)) + '</strong></div>' +
    '<div class="trip-vs-stat"><span class="trip-vs-stat-k">Aktual</span><strong class="mono pv trip-vs-stat-v">' + esc(rpShort(vp.actSum)) + '</strong></div>' +
    '<div class="trip-vs-stat"><span class="trip-vs-stat-k">Selisih</span><strong class="mono pv trip-vs-stat-v ' + statusCls + '">' + esc(tripSignedRpShort(diffR)) + '</strong></div>' +
    '</div>' +
    discVs.bodyHtml +
    '</div>';
}

/** Format nominal rupiah singkat bertanda minus bila negatif (-Rp 1,5 jt). */
function tripSignedRpShort(n) {
  var v = Math.round(+n || 0);
  if (!v) return 'Rp 0';
  return (v < 0 ? '-' : '') + rpShort(Math.abs(v));
}

/** Format nominal rupiah bertanda minus bila negatif (-Rp ... atau Rp ...). */
function tripSignedRp(n) {
  var v = Math.round(+n || 0);
  if (v === 0) v = 0;
  return (v < 0 ? '-' : '') + rp(Math.abs(v));
}

function tripBadge(P) {
  var T = tripToday(P), x = T.L[T.cur >= 0 ? T.cur : T.nxt];
  return '<div class="mb4"><span class="chp on">Sedang berlangsung &middot; Hari ' + (dayNo(todayISO(), P.start) + 1) + '/' + (dayNo(P.end, P.start) + 1) + '</span></div>' +
    (x ? '<div class="sub mb4">' + (T.cur >= 0 ? 'Sekarang' : 'Berikutnya') + ': <b>' + (tmShow(x.time) ? tmShow(x.time) + ' ' : '') + esc(x.place) + '</b></div>' : '');
}
function tripList() {
  var L = trips();
  return (
    '<div class="card"><div class="card-header"><div><h2 style="margin:0 0 2px">Semua Perjalanan</h2><div class="sub">Lembar perencanaan perjalanan terpisah &middot; anggaran, itinerary, pemesanan, checklist, dan target tabungan</div></div>' +
    '<div class="kp m0"><button class="p" data-tnew="1">+ Perjalanan baru</button><button data-xl="1">Impor Excel</button><button class="g" data-xlt="1">Template Excel</button></div></div>' +
    '<div class="trip-cards-grid">' +
    (L.map(function (P) {
      var pl = tripPlan(P);
      return (
        '<div class="metric-tile cp" data-trip="' + P.id + '"><h2 style="margin:0 0 4px">' + esc(P.name) + '</h2>' + (tripActive(P) ? tripBadge(P) : '') + '<div class="sub">' +
        (P.start && P.end ? fmtD(P.start) + ' – ' + fmtD(P.end) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari' : 'Tanggal belum diisi') + '</div>' +
        (P.budget ? bar(pl.t, P.budget) + '<div class="sub">Rencana biaya ' + rp(pl.t) + ' dari anggaran ' + rp(P.budget) + '</div>' : '<div class="sub">Rencana biaya ' + rp(pl.t) + ' · anggaran belum ditentukan</div>') + '</div>'
      );
    }).join('') || '<div class="empty">Belum ada perjalanan. Buat satu untuk mencatat itinerary, pemesanan, checklist, dan rencana biaya.</div>') +
    '</div></div>'
  );
}

function tripRing(P) {
  var pl = tripPlan(P), td = todayISO(), N = 0, no = 0, byDay = {}, bcat = {};
  P.bk.forEach(function (x) {
    var c = x.cat || 'Lainnya';
    bcat[c] = (bcat[c] || 0) + tripBkRp(P, x);
  });
  P.it.forEach(function (x) {
    if (x.pay === 'on' || !x.est) return;
    var v = tripItRp(P, x), c = x.cat || 'Lainnya';
    byDay[x.day] = (byDay[x.day] || 0) + v;
    bcat[c] = (bcat[c] || 0) + v;
  });
  if (P.start && P.end && P.end >= P.start) {
    N = dayNo(P.end, P.start) + 1;
    if (td >= P.start && td <= P.end) no = dayNo(td, P.start) + 1;
  }
  var st = function (l, v, n) {
    return '<div><span>' + l + '</span><b>' + v + '</b>' + (n ? '<span>' + n + '</span>' : '') + '</div>';
  };
  var left = P.budget - pl.t,
    cells = (P.budget ? st('Anggaran', rp(P.budget)) + st(left >= 0 ? 'Sisa anggaran' : 'Melebihi anggaran', rp(Math.abs(left))) : '') + st('Sudah dibayar', rp(pl.paid)) + st('Belum dibayar', rp(pl.b - pl.paid));
  if (no) cells += st('Hari ke', no + ' dari ' + N);
  else if (N && td < P.start) cells += st('Mulai dalam', dayNo(P.start, td) + ' hari');
  if (N) cells += st('Rencana per hari', rp(pl.t / N));
  var ck = Object.keys(pl.cash).sort(),
    dk = Object.keys(byDay).sort(),
    cl = Object.keys(bcat).sort(function (a, b) { return bcat[b] - bcat[a]; }),
    dmax = 0;
  dk.forEach(function (d) { if (byDay[d] > dmax) dmax = byDay[d]; });
  var catRow = function (k, v, mx, c, extra) {
    var pc = mx ? (v / mx) * 100 : 0;
    return '<div class="catrow"><div class="cathd"><span>' + (c ? '<i class="dot" style="background:' + c + '"></i>' : '') + k + '</span><b>' + extra + '</b></div><div class="catbar"><i style="width:' + pc.toFixed(1) + '%;background:' + (c || 'var(--ac)') + '"></i></div></div>';
  };
  return (
    '<div class="hero"><div class="card m0"><div class="sub">Total rencana biaya</div><div class="big">' + rp(pl.t) + '</div><div class="sub">pemesanan ' + rp(pl.b) + ' + estimasi harian ' + rp(pl.d) + '</div>' +
    (P.budget ? bar(pl.t, P.budget) + '<div class="sub">dari anggaran ' + rp(P.budget) + '</div>' : '<div class="sub">Anggaran belum ditentukan (atur lewat tombol Ubah).</div>') +
    (P.cur && P.rate ? '<div class="sub">Kurs 1 ' + esc(P.cur) + ' = ' + rp(P.rate) + '</div>' : '') + '</div><div class="card stats m0">' + cells + '</div></div>' +
    (ck.length
      ? '<div class="card"><h2>Siapkan tunai / kartu</h2>' + ck.map(function (k) {
          var c = pl.cash[k];
          var eqCash = Math.round(c.idr + (c.fxRp || 0));
          return '<div class="it2"><div>' + esc(k) + '</div><div><b>' + (c.fx ? fxs(P, c.fx) + (c.idr ? ' + ' + rp(c.idr) : '') : rp(c.idr)) + '</b>' + (c.fx && c.fxRp > 0 ? ' <span class="sub">&asymp; ' + rp(eqCash) + '</span>' : '') + '</div></div>';
        }).join('') + '</div>'
      : '') +
    (dk.length ? '<div class="card"><h2>Estimasi per hari</h2>' + dk.map(function (d) { return catRow(esc(dayLabel(P, d)), byDay[d], dmax, '', rp(byDay[d])); }).join('') + '</div>' : '') +
    (cl.length ? '<div class="card"><h2>Rencana biaya per kategori</h2>' + cl.map(function (k, i) { return catRow(esc(k), bcat[k], pl.t, catColor(k), rp(bcat[k]) + ' <span class="sub">' + Math.round((bcat[k] / pl.t) * 100) + '%</span>'); }).join('') + '</div>' : '')
  );
}

/** Jam 24 jam: tampil 14.00, disimpan HH:MM. */
function tmShow(v) {
  return v ? String(v).replace(':', '.') : '';
}
/** Baca isian jam (14.00, 14:00, 1400, 9.30). Kosong -> '', salah -> null. */
function tmParse(v) {
  v = String(v || '').trim();
  if (!v) return '';
  var m = /^(\d{1,2})[.:]?(\d{2})$/.exec(v) || /^(\d{1,2})$/.exec(v);
  if (!m) return null;
  var h = +m[1], mi = m[2] ? +m[2] : 0;
  return h > 23 || mi > 59 ? null : pad2(h) + ':' + pad2(mi);
}
/** Pratinjau rupiah saat biaya diisi dalam mata uang asing. */
function fxPrev(a, u) {
  var P = tp(), h = $(a + 'h');
  if (!h || !P || !P.cur || !P.rate) return;
  var v = parseRp($(a).value) || 0;
  h.textContent = $(u).value === 'fx' && v ? '\u2248 ' + rp(val(P, v, true)) + ' (kurs 1 ' + P.cur + ' = ' + rp(P.rate) + ')' : '';
}
/** Kotak biaya: jumlah + pilihan mata uang (Rp / asing). */
function amtField(P, id, uid, v, fx) {
  return (
    '<div class="dflex g6"><input id="' + id + '" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" style="flex:1;min-width:0;font-size:16px;font-weight:600" value="' + (v ? v.toLocaleString('id-ID') : '') + '">' +
    '<select id="' + uid + '" style="width:84px;min-width:0;flex:none;font-weight:600;padding-left:8px;padding-right:4px" aria-label="Mata uang"><option value="idr">Rp</option>' + (P.cur ? '<option value="fx"' + (fx ? ' selected' : '') + '>' + esc(P.cur) + '</option>' : '') + '</select></div>' +
    '<div class="sub mt4" id="' + id + 'h">' + (P.cur ? '' : 'Mata uang asing: atur lewat Ubah.') + '</div>'
  );
}

function tripItin(P) {
  var E = itEdit ? P.it.filter(function (x) { return x.id === itEdit; })[0] : null,
    days = tripDays(P),
    td = todayISO(),
    form =
      '<div class="card"><h2>' + (E ? 'Ubah kegiatan' : 'Tambah kegiatan') + '</h2>' +
      '<div class="fr wr"><div class="fw" style="flex:0 0 140px"><label for="itd">Tanggal</label><input id="itd" type="date" value="' + (E ? E.day : days[0] || td) + '"></div>' +
      '<div style="flex:0 0 68px"><label for="itt">Mulai</label><input id="itt" inputmode="numeric" maxlength="5" placeholder="14.00" value="' + tmShow(E ? E.time : '') + '"></div>' +
      '<div style="flex:0 0 68px"><label for="itt2">Selesai</label><input id="itt2" inputmode="numeric" maxlength="5" placeholder="16.30" value="' + tmShow(E ? E.time2 : '') + '"></div>' +
      '<div class="fw" style="flex:1 1 140px"><label for="itp">Kegiatan</label><input id="itp" maxlength="120" placeholder="mis. Senso-ji Temple" value="' + (E ? esc(E.place) : '') + '"></div></div>' +
      '<div class="fr wr"><div class="fw" style="flex:2 1 0"><label for="ite">Biaya</label>' + amtField(P, 'ite', 'itu', E ? E.est : 0, E && E.fx) + '</div>' +
      '<div style="flex:1.3 1 0"><label for="itm">Pembayaran</label><select id="itm" title="Online: dicatat di Pemesanan">' + opts([['', 'Belum ditentukan'], ['ic', 'Kartu IC'], ['on', 'Online'], ['cash', 'Cash']], E ? E.pay : '') + '</select></div>' +
      '<div class="fx110"><label for="itk">Kategori</label><select id="itk">' + opts(ICAT, E ? E.cat : 'Transport') + '</select></div></div>' +
      '<div class="fr wr"><div class="fw fx110"><label for="itl">Tautan (peta / tiket) (opsional)</label><input id="itl" inputmode="url" placeholder="https://maps.app.goo.gl/..." value="' + (E ? esc(E.link) : '') + '"></div>' +
      '<div class="fw fx110"><label for="itn">Catatan (opsional)</label><input id="itn" maxlength="200" value="' + (E ? esc(E.note) : '') + '"></div></div>' +
      '<div class="err" id="iter"></div><div class="row2"><button class="p" data-its="1">' + (E ? 'Simpan perubahan' : 'Tambah') + '</button>' + (E ? '<button data-itx="1">Batal</button>' : '') + '</div></div>';
  return (
    form +
  (days.map(function (d) {
      var L = P.it.filter(function (x) { return x.day === d; }).sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; }),
        tot = 0, fxm = {},
        stay = P.bk.filter(function (b) { return b.cat === 'Penginapan' && b.a && b.b && d >= b.a && d < b.b; });
      L.forEach(function (x) {
        if (x.pay === 'on' || !x.est) return;
        tot += tripItRp(P, x);
        if (x.fx) {
          var icIt = tripItemCur(P, x) || P.cur || '';
          var lblK = (x.cat || 'Lainnya') + (icIt ? ' (' + icIt + ')' : '');
          fxm[lblK] = { amt: (fxm[lblK] ? fxm[lblK].amt : 0) + x.est, c: icIt };
        }
      });
      return (
        '<div class="card"><div class="dh"><h2>' + esc(dayLabel(P, d)) + '</h2>' + (d === td ? '<span class="chp ic">Hari ini</span>' : '') + '</div>' +
        '<input class="dti" data-dt="' + d + '" maxlength="60" placeholder="Judul hari, mis. Jakarta – Tokyo" value="' + esc(P.dt[d] || '') + '">' +
        (stay.length ? '<div class="sub mb6">&#127976; Menginap: ' + stay.map(function (b) { return esc(b.title); }).join(', ') + '</div>' : '') +
        (tot ? '<div class="sub mb4">Estimasi hari ini <b>' + rp(tot) + '</b>' + (Object.keys(fxm).length ? ' · ' + Object.keys(fxm).map(function (k) { return esc(k.replace(/\s*\([A-Z]+\)$/, '')) + ' ' + esc(fxs(P, fxm[k].amt, fxm[k].c)); }).join(' · ') : '') + '</div>' : '') +
        (L.map(function (x) {
          return (
            '<div class="itm"><div class="tm">' + tmShow(x.time) + (x.time2 ? '<br>' + tmShow(x.time2) : '') + '</div><div><div class="ttl"' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.place) + '</div><div>' +
            (x.cat ? '<span class="chp" style="background:transparent;border:1px solid var(--ln)">' + esc(x.cat) + '</span>' : '') + pchip(x.pay) + lnk(x.link) + '</div>' + (x.note ? '<div class="sub">' + esc(x.note) + '</div>' : '') +
            '<div class="ac"><button class="g" data-itdone="' + x.id + '" aria-label="Tandai selesai">' + (x.done ? '&#9745; Selesai' : '&#9744; Selesai') + '</button>' +
            '<button class="g" data-ited="' + x.id + '">Ubah</button><button class="g d" data-itdel="' + x.id + '">Hapus</button></div></div>' +
            '<div class="co">' + (x.est ? amtTxt(P, x) : '') + '</div></div>'
          );
        }).join('') || '<div class="sub">Belum ada kegiatan.</div>') + '</div>'
      );
    }).join('') || '<div class="card"><div class="empty">Isi tanggal Mulai dan Selesai (tombol Ubah) atau tambah kegiatan bertanggal.</div></div>')
  );
}

function tripBook(P) {
  var E = bkEdit ? P.bk.filter(function (x) { return x.id === bkEdit; })[0] : null, pl = tripPlan(P),
    form =
      '<div class="card"><h2>' + (E ? 'Ubah pemesanan' : 'Tambah pemesanan') + '</h2>' +
      '<div class="fr wrb"><div class="fw" style="flex:2 1 0"><label for="bkt">Nama (tiket, hotel, tour)</label><input id="bkt" maxlength="120" placeholder="mis. Tiket pesawat CGK-HND" value="' + (E ? esc(E.title) : '') + '"></div>' +
      '<div class="fw" style="flex:1.4 1 0"><label for="bke">Jumlah</label>' + amtField(P, 'bke', 'bku', E ? E.amt : 0, E && E.fx) + '</div></div>' +
      '<div class="fr wrb"><div class="fx110"><label for="bka">Mulai / check-in</label><input id="bka" type="date" value="' + (E ? E.a : '') + '"></div>' +
      '<div class="fx110"><label for="bkb">Selesai / check-out</label><input id="bkb" type="date" value="' + (E ? E.b : '') + '"></div>' +
      '<div class="fx110"><label for="bkm">Pembayaran</label><select id="bkm">' + opts([['on', 'Online'], ['cash', 'Cash'], ['ic', 'Kartu IC'], ['', 'Belum ditentukan']], E ? E.pay : 'on') + '</select></div></div>' +
      '<div class="fr"><div class="fw fx110"><label for="bkl">Tautan (opsional)</label><input id="bkl" inputmode="url" placeholder="https://..." value="' + (E ? esc(E.link) : '') + '"></div></div>' +
      '<div class="fr"><div class="fw" style="flex:0 1 280px"><label for="bkc">Kategori</label><select id="bkc">' + opts(BCAT, E ? E.cat : 'Transport') + '</select></div></div>' +
      '<div class="err" id="bker"></div><div class="row2"><button class="p" data-bks="1">' + (E ? 'Simpan perubahan' : 'Tambah') + '</button>' + (E ? '<button data-bkx="1">Batal</button>' : '') + '</div></div>',
    cats = BCAT.concat(P.bk.map(function (x) { return x.cat; })).filter(function (c, i, a) { return a.indexOf(c) === i; });
  return (
    '<div class="card"><h2>Ringkasan pemesanan</h2><div class="stats"><div><span>Total</span><b>' + rp(pl.b) + '</b></div><div><span>Sudah dibayar</span><b>' + rp(pl.paid) + '</b></div><div><span>Belum dibayar</span><b>' + rp(pl.b - pl.paid) + '</b></div></div></div>' +
    form +
    (cats.map(function (c) {
      var L = P.bk.filter(function (x) { return x.cat === c; }), sum = 0;
      if (!L.length) return '';
      L.forEach(function (x) { sum += tripBkRp(P, x); });
      return (
        '<div class="card"><div class="pgrp"><h2 class="m0">' + esc(c) + '</h2><b>' + rp(sum) + '</b></div>' +
        L.map(function (x) {
          return (
            '<div class="itm" style="grid-template-columns:1fr auto"><div><div class="ttl">' + esc(x.title) + '</div><div>' + pchip(x.pay) + (x.a ? '<span class="sub">' + dShort(x.a) + (x.b ? ' – ' + dShort(x.b) : '') + '</span> ' : '') + lnk(x.link) +
            '</div><div class="ac jcfs"><button class="g" data-bkpay="' + x.id + '">' + (x.paid ? '&#9745; Lunas' : '&#9744; Tandai lunas') + '</button><button class="g" data-bked="' + x.id + '">Ubah</button><button class="g d" data-bkdel="' + x.id + '">Hapus</button></div></div>' +
            '<div class="co">' + amtTxt(P, x) + '</div></div>'
          );
        }).join('') + '</div>'
      );
    }).join('') || '<div class="card"><div class="empty">Belum ada pemesanan. Catat tiket pesawat, hotel, dan tour di sini.</div></div>')
  );
}

function tripCek(P) {
  var n = P.ck.filter(function (x) { return x.done; }).length;
  return (
    '<div class="card"><h2>Checklist barang bawaan</h2><div class="sub mb8">' + n + ' dari ' + P.ck.length + ' siap</div>' +
    (P.ck.length ? bar(n, P.ck.length).replace('var(--wr)', 'var(--ac)') : '') +
    '<div class="row2" style="margin:10px 0"><input id="ckn" maxlength="60" placeholder="mis. Topi, Sunscreen"><button class="p" data-cka="1">Tambah</button></div>' +
    (P.ck.map(function (x) {
      return '<div class="it2"><div><button class="g" data-cktog="' + x.id + '">' + (x.done ? '&#9745;' : '&#9744;') + '</button><span' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.text) + '</span></div><div><button class="g d" data-ckdel="' + x.id + '">Hapus</button></div></div>';
    }).join('') || '<div class="sub">Belum ada barang.</div>') +
    (P.ck.length ? '' : '<div class="row2"><button data-ckstd="1">Isi daftar standar</button></div>') + '</div>'
  );
}

function tripCat(P) {
  return (
    '<div class="card"><h2>Tautan berguna</h2><div class="sub mb8">Video panduan, situs tiket, peta, dan lainnya.</div><div class="kf"><div><input id="lkt" maxlength="80" placeholder="Judul, mis. Cara bayar bus pakai IC card"></div><div><input id="lku" inputmode="url" placeholder="https://..."></div></div>' +
    '<div class="err" id="lker"></div><div class="row2 mb8"><button class="p" data-lka="1">Tambah</button></div>' +
    P.lk.map(function (x) { return '<div class="it2"><div>' + esc(x.title) + '</div><div>' + lnk(x.url) + '<button class="g d" data-lkdel="' + x.id + '">Hapus</button></div></div>'; }).join('') + '</div>' +
    '<div class="card"><h2>Catatan penting</h2><div class="sub mb8">Kode booking, alamat, kontak darurat. Tersimpan otomatis.</div><textarea id="tnote" maxlength="2000" placeholder="mis. Hotel: ... Kode booking: ...">' + esc(P.note) + '</textarea></div>'
  );
}

function renderTrip() {
  var el = $('v-trip');
  if (mode !== 'trip') {
    el.innerHTML = '';
    return;
  }
  var P = tp();
  if (!P) {
    el.innerHTML = tripList();
    return;
  }
  if (tripTab === 'now' && !tripActive(P)) tripTab = 'ring';
  var tabs = (tripActive(P) ? [['now', 'Hari ini']] : []).concat([['ring', 'Ringkasan'], ['itin', 'Itinerary'], ['book', 'Pemesanan'], ['cek', 'Checklist'], ['cat', 'Catatan'], ['sv', 'Tabungan']]);
  var allTrips = trips(),
    switcher = allTrips.length > 1
      ? '<div class="yb trip-sw">' + allTrips.map(function (t) { return '<button type="button" class="yp' + (t.id === P.id ? ' on' : '') + '" data-trip="' + esc(t.id) + '">' + esc(t.name) + '</button>'; }).join('') + '</div>'
      : '';
  el.innerHTML =
    '<div class="card trip-head-card"><div class="card-header"><div><div class="kp mb8"><button class="tbk" data-tback="1">&larr; Semua perjalanan</button>' + switcher + '</div><h2 style="margin:0 0 2px">' + esc(P.name) + '</h2><div class="sub">' +
    (P.start && P.end ? fmtD(P.start) + ' – ' + fmtD(P.end) : 'Tanggal belum diisi') + (P.cur && P.rate ? ' · 1 ' + P.cur + ' = ' + rp(P.rate) : '') + '</div></div><div class="kp m0"><button class="g" data-tshare="1">Bagikan</button><button class="g" data-ted="1">Ubah</button><button class="g d" data-tdel="1">Hapus</button></div></div><div class="kt fwrap trip-subtabs">' +
    tabs.map(function (t) { return '<button type="button" class="yp' + (tripTab === t[0] ? ' on' : '') + '" data-tt="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
    (tripTab === 'now' ? tripNow(P) : tripTab === 'itin' ? tripItin(P) : tripTab === 'book' ? tripBook(P) : tripTab === 'cek' ? tripCek(P) : tripTab === 'cat' ? tripCat(P) : tripTab === 'sv' ? goalCard(P, tripPlan(P)) : tripRing(P));
  if (P.cur) {
    fxPrev('ite', 'itu');
    fxPrev('bke', 'bku');
  }
  if ($('gprev')) goalPrev();
}

/* ===== Alat: Rebalance porto & IBKR vs Flip =====
 * Dua halaman mandiri di folder tools/ (tampil lewat iframe, tidak terhubung ke data Rencana Keuangan).
 * Isian keduanya disimpan di perangkat (localStorage 'rk-tool-<nama>') dan, bila sudah masuk, di Supabase
 * tabel rk_tools (satu baris per akun per alat). Bila lokal dan cloud berbeda, yang paling baru dipakai. */
var TOOLS = {
    rebalance: { title: 'Rebalance porto', src: 'tools/rebalance/index.html' },
    ibkr: { title: 'IBKR vs Flip', src: 'tools/ibkr-flip/index.html' },
  },
  toolFrames = {},
  toolReady = {},
  toolPushT = {},
  toolMsg = {};

function toolLocal(name) {
  try {
    var o = JSON.parse(localStorage.getItem('rk-tool-' + name) || 'null');
    return o && typeof o.t === 'number' && o.state ? o : null;
  } catch (e) {
    return null;
  }
}

function toolSaveLocal(name, state, t) {
  try {
    localStorage.setItem('rk-tool-' + name, JSON.stringify({ state: state, t: t }));
  } catch (e) {}
}

function toolStat(name, text, bad) {
  toolMsg[name] = { t: text, bad: bad };
  var el = $('tstat-' + name);
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? 'var(--wr)' : 'var(--mut)';
}

function toolErr(err) {
  var m = (err && err.message) || '';
  if ((err && err.code === '42P01') || /rk_tools/.test(m) && /not exist|schema cache|find the table/i.test(m))
    return 'Tabel rk_tools belum ada di Supabase. Jalankan schema.sql terbaru di SQL Editor. Data tetap tersimpan di perangkat ini.';
  return 'Gagal sinkron: ' + m;
}

function toolTheme() {
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || t === 'bwd' ? 'dark' : t === 'light' || t === 'bw' ? 'light' : '';
}

function toolPost(name, msg) {
  var f = toolFrames[name];
  if (!f || !f.contentWindow) return;
  msg.rkTool = true;
  try {
    f.contentWindow.postMessage(msg, location.origin === 'null' ? '*' : location.origin);
  } catch (e) {}
}

function toolSendLoad(name) {
  var L = toolLocal(name);
  toolPost(name, { type: 'load', state: L ? L.state : null, theme: toolTheme() });
}

function toolMount(name) {
  var box = $('v-' + name);
  if (!box || toolFrames[name]) return;
  var d = TOOLS[name];
  box.innerHTML =
    '<div class="sub" id="tstat-' + name + '" style="margin:0 0 8px"></div>' +
    '<iframe id="tf-' + name + '" title="' + d.title + '" src="' + d.src +
    '" style="width:100%;height:900px;border:0;border-radius:14px;display:block"></iframe>';
  toolFrames[name] = $('tf-' + name);
  var m = toolMsg[name];
  if (m) toolStat(name, m.t, m.bad);
  else if (sbUser) toolStat(name, 'Menyinkronkan...');
  else toolStat(name, 'Data tersimpan di perangkat ini. Masuk untuk sinkron antar perangkat.');
}

function toolSchedPush(name) {
  if (!sb || !sbUser) {
    toolStat(name, 'Tersimpan di perangkat ini. Masuk untuk sinkron ke cloud.');
    return;
  }
  toolStat(name, 'Menyimpan ke cloud...');
  clearTimeout(toolPushT[name]);
  toolPushT[name] = setTimeout(function () {
    toolPush(name);
  }, 1500);
}

function toolPush(name) {
  var L = toolLocal(name);
  if (!L || !sb || !sbUser) return Promise.resolve();
  return sb
    .from('rk_tools')
    .upsert({ user_id: sbUser.id, tool: name, data: L.state, updated_at: new Date(L.t).toISOString() })
    .then(function (r) {
      if (r.error) toolStat(name, toolErr(r.error), 1);
      else toolStat(name, 'Tersinkron ' + clock());
    });
}

/** Setelah masuk: bandingkan lokal vs cloud per alat; yang terbaru menang. */
function toolsPull() {
  if (!sb || !sbUser) return Promise.resolve();
  return sb
    .from('rk_tools')
    .select('tool,data,updated_at')
    .eq('user_id', sbUser.id)
    .then(function (r) {
      if (r.error) {
        Object.keys(TOOLS).forEach(function (n) {
          toolStat(n, toolErr(r.error), 1);
        });
        return;
      }
      var rows = {};
      (r.data || []).forEach(function (x) {
        rows[x.tool] = x;
      });
      Object.keys(TOOLS).forEach(function (n) {
        var L = toolLocal(n),
          R = rows[n],
          rt = R ? Date.parse(R.updated_at) || 0 : 0;
        if (R && R.data && (!L || rt > L.t)) {
          toolSaveLocal(n, R.data, rt);
          if (toolReady[n]) toolSendLoad(n);
          toolStat(n, 'Tersinkron ' + clock() + ' (data cloud dimuat)');
        } else if (L && (!R || L.t > rt)) toolPush(n);
        else toolStat(n, 'Tersinkron ' + clock());
      });
    });
}

window.addEventListener('message', function (e) {
  var m = e.data;
  if (!m || m.rkTool !== true) return;
  var name = Object.keys(toolFrames).filter(function (k) {
    return toolFrames[k].contentWindow === e.source;
  })[0];
  if (!name) return;
  if (m.type === 'ready') {
    toolReady[name] = true;
    toolSendLoad(name);
  } else if (m.type === 'save' && m.state && typeof m.state === 'object') {
    toolSaveLocal(name, m.state, Date.now());
    toolSchedPush(name);
  } else if (m.type === 'height') {
    var hh = Math.min(20000, Math.max(300, Math.ceil(+m.h || 0)));
    if (Math.abs(hh - toolFrames[name].offsetHeight) > 2) toolFrames[name].style.height = hh + 'px';
  }
});

/** Tampilan sesuai mode: Rencana (tab + kontrol tahun), Perjalanan (lembar sendiri), atau alat (Rebalance porto / IBKR vs Flip). */
function modeUi() {
  if (typeof syncNav === 'function') syncNav();
  var T = mode === 'trip',
    X = !!TOOLS[mode],
    O = T || X;
  document.querySelectorAll('#mdbar [data-md]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.md === mode);
  });
  $('v-trip').hidden = !T;
  Object.keys(TOOLS).forEach(function (n) {
    $('v-' + n).hidden = mode !== n;
  });
  if (X) toolMount(mode);
  document.querySelector('.w').style.maxWidth = mode === 'rebalance' ? '1500px' : '';
  document.querySelector('nav').style.display = X ? 'none' : '';
  var pl = document.querySelector('.nav-pill');
  if (pl) pl.style.display = O ? 'none' : '';
  if (O)
    document.querySelectorAll('nav button[data-t]').forEach(function (b) {
      b.setAttribute('aria-selected', 'false');
    });
  var ctl = document.querySelector('.ctl');
  if (ctl) ctl.style.display = O ? 'none' : '';
  $('rem').style.display = O ? 'none' : '';
  if (O) {
    ['rincian', 'jadwal', 'item', 'kas', 'sim'].forEach(function (x) {
      $('v-' + x).hidden = true;
    });
    $('yb').style.display = 'none';
  } else tab(curTab);
}

function kasOpenPm(m) {
  var P = m === 'new' ? null : tp();
  kpMode = m;
  $('kpt').textContent = P ? 'Ubah perjalanan' : 'Perjalanan baru';
  $('kpn').value = P ? P.name : '';
  $('kpa').value = P ? P.start : '';
  $('kpb').value = P ? P.end : '';
  $('kpgm').value = P && P.budget > 0 ? '1' : '0';
  $('kpgw').hidden = $('kpgm').value !== '1';
  $('kpg').value = P && P.budget ? P.budget.toLocaleString('id-ID') : '';
  $('kpu').value = P ? P.cur : '';
  $('kpk').value = P && P.rate ? P.rate : '';
  $('kpe').textContent = '';
  $('kpm').hidden = false;
  $('kpn').focus();
}

function kasSavePm() {
  var n = $('kpn').value.trim().slice(0, 30),
    a = $('kpa').value,
    b = $('kpb').value,
    cu = $('kpu').value.trim().toUpperCase(),
    rt = tripParseRateLocale($('kpk').value),
    useB = $('kpgm').value === '1',
    bg = useB ? parseRp($('kpg').value) || 0 : 0,
    err = function (t) {
      $('kpe').textContent = t;
    };
  if (!n) return err('Nama perjalanan belum diisi.');
  if (a && b && b < a) return err('Tanggal selesai harus sama atau sesudah tanggal mulai.');
  if (useB && !(bg > 0)) return err('Isi jumlah anggaran, atau pilih "Belum menentukan anggaran".');
  if (cu && !/^[A-Z]{3}$/.test(cu)) return err('Mata uang terdiri dari 3 huruf, mis. JPY.');
  if (cu && !(rt > 0)) return err('Isi kurs: berapa rupiah untuk 1 ' + cu + '.');
  var dup = trips().some(function (x) {
    return x.name.toLowerCase() === n.toLowerCase() && !(kpMode === 'edit' && x.id === tripAct);
  });
  if (dup) return err('Nama perjalanan sudah dipakai.');
  var P;
  if (kpMode === 'new') {
    var id = 'p' + Date.now().toString(36);
    P = ALL.kas.pr[id] = { id: id, name: n, saldo: 0, link: false, start: '', end: '', budget: 0, cur: '', rate: 0, dt: {}, tx: [], it: [], bk: [], lk: [], ck: [], note: '' };
    tripAct = id;
    tripTab = 'ring';
    remember('rk-trip', id);
  } else P = tp();
  P.name = n;
  P.start = a;
  P.end = b;
  P.budget = bg;
  P.cur = cu;
  P.rate = cu ? rt : 0;
  save();
  $('kpm').hidden = true;
  renderAll();
  toast(kpMode === 'new' ? 'Perjalanan dibuat.' : 'Perjalanan disimpan.');
}

function itSave() {
  var P = tp(), d = $('itd').value, pl = $('itp').value.trim(), l = $('itl').value.trim(), err = function (t) { $('iter').textContent = t; };
  if (!ISO_RE.test(d)) return err('Pilih tanggal.');
  if (!pl) return err('Isi nama kegiatan.');
  var t1 = tmParse($('itt').value), t2 = tmParse($('itt2').value);
  if (t1 === null || t2 === null) return err('Jam memakai format 24 jam, mis. 14.00 atau 09.30.');
  if (l && !okUrl(l)) return err('Tautan harus diawali http:// atau https://');
  var o = { day: d, time: t1, time2: t2, place: pl.slice(0, 120), cat: $('itk').value, est: parseRp($('ite').value) || 0, fx: !!$('itu') && $('itu').value === 'fx', pay: $('itm').value, link: l, note: $('itn').value.trim().slice(0, 200) };
  if (itEdit)
    P.it = P.it.map(function (x) { return x.id === itEdit ? Object.assign({}, x, o) : x; });
  else P.it.push(Object.assign({ id: kid('i'), done: false, rec: '' }, o));
  itEdit = null;
  save();
  renderTrip();
  toast('Kegiatan disimpan.');
}
function bkSave() {
  var P = tp(), t = $('bkt').value.trim(), l = $('bkl').value.trim(), a = $('bka').value, b = $('bkb').value, err = function (m) { $('bker').textContent = m; };
  if (!t) return err('Isi nama pemesanan.');
  if (l && !okUrl(l)) return err('Tautan harus diawali http:// atau https://');
  if (a && b && b < a) return err('Tanggal selesai harus sama atau sesudah tanggal mulai.');
  var o = { title: t.slice(0, 120), cat: $('bkc').value, amt: parseRp($('bke').value) || 0, fx: !!$('bku') && $('bku').value === 'fx', pay: $('bkm').value, link: l, a: a, b: b };
  if (bkEdit)
    P.bk = P.bk.map(function (x) { return x.id === bkEdit ? tripMergeBkEdit(x, o, null) : x; });
  else P.bk.push(Object.assign({ id: kid('b'), paid: false, rec: '' }, o));
  bkEdit = null;
  save();
  renderTrip();
  toast('Pemesanan disimpan.');
}
/** Tandai pemesanan lunas / belum lunas. */
function bkPay(id) {
  var P = tp(), x = P.bk.filter(function (b) { return b.id === id; })[0];
  if (!x) return;
  var lockMsg = tripToggleBkPaid(P, x);
  save();
  renderTrip();
  if (lockMsg) toast(lockMsg);
}
/* ===== Target tabungan perjalanan ===== */
/** Target tabungan semua perjalanan (dipakai mesin perhitungan Rincian). */
function kasGoals() {
  return Object.keys(ALL.kas.pr)
    .map(function (i) { return ALL.kas.pr[i]; })
    .filter(function (P) { return !P.link && P.goal && P.goal.link !== false; })
    .map(function (P) { return Object.assign({ id: P.id, name: P.name }, P.goal); });
}
/** Daftar bulan 'YYYY-MM' dari a sampai b (inklusif). */
function monthList(a, b) {
  var r = [], y = +a.slice(0, 4), m = +a.slice(5) - 1;
  while (r.length < 60) {
    var k = y + '-' + pad2(m + 1);
    if (k > b) break;
    r.push(k);
    if (++m > 11) { m = 0; y++; }
  }
  return r;
}
function goalMonths(g) {
  return monthList(g.from, g.to);
}
function goalMonthsIn(g, y) {
  return goalMonths(g).filter(function (k) { return +k.slice(0, 4) === y; }).map(function (k) { return +k.slice(5) - 1; });
}
function monthLbl(k) {
  return MON[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
}
function goalSel(id, opts, v) {
  return '<select id="' + id + '">' + opts.map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + monthLbl(k) + '</option>'; }).join('') + '</select>';
}
function goalOpts(P) {
  return monthList(todayISO().slice(0, 7), P.start.slice(0, 7));
}
function goalCard(P, pl) {
  var g = P.goal, lk = !g || g.link !== false;
  if (!P.start) return '<div class="card"><h2>Target tabungan</h2><div class="sub">Isi tanggal mulai perjalanan (tombol Ubah) untuk menghitung tabungan per bulan.</div></div>';
  var opts = goalOpts(P);
  if (g && !gEdit) {
    var cm = todayISO().slice(0, 7), ms = goalMonths(g), el = ms.filter(function (k) { return k <= cm; }).length, got = Math.min(g.t, g.s0 + g.per * el), C = calc(),
      neg = C.rows.filter(function (r) { return r.ak < 0; }), low = C.rows.reduce(function (a, r) { return !a || r.ak < a.ak ? r : a; }, null);
    return (
      '<div class="card"><h2>Target tabungan</h2><div class="sub">Terkumpul <b>' + rp(got) + '</b> dari ' + rp(g.t) + '</div>' + bar(got, g.t) +
      '<div class="sub">Sisihkan <b>' + rp(g.per) + '</b> per bulan &middot; ' + monthLbl(g.from) + ' – ' + monthLbl(g.to) + ' &middot; bulan ke ' + Math.min(el, ms.length) + ' dari ' + ms.length + '</div>' +
      '<div class="sub mt6">' + (lk ? 'Tersambung ke Rencana Keuangan: tabungan ini otomatis dihitung sebagai pengeluaran bulanan di <b>Rincian Bulanan</b>.' : 'Tidak tersambung ke Rencana Keuangan: hanya sebagai pencatat, tidak memengaruhi Rincian Bulanan.') + '</div>' +
      (lk && !goalMonthsIn(g, +S.year).length
        ? '<div class="chp ic mt8">Bulan menabung ada di tahun ' + Object.keys(ms.reduce(function (o, k) { o[k.slice(0, 4)] = 1; return o; }, {})).join(' & ') + '. Ganti Tahun di mode Rencana untuk melihat dampaknya.</div>'
        : '') +
      (lk && low && goalMonthsIn(g, +S.year).length ? '<div class="chp ' + (neg.length ? 'cash' : 'on') + ' mt8">' + (neg.length ? 'Saldo Rencana ' + S.year + ' negatif di ' + neg.map(function (r) { return MON[r.m]; }).join(', ') : 'Saldo Rencana ' + S.year + ' tetap positif (terendah ' + rp(low.ak) + ' di ' + MON[low.m] + ')') + '</div>' : '') +
      '<div class="acts mt8"><button class="g" data-gedit="1">Ubah target</button><button class="g" data-glink="1">' + (lk ? 'Putuskan dari Rencana' : 'Sambungkan ke Rencana') + '</button><button class="g d" data-gdel="1">Hapus target</button></div></div>'
    );
  }
  if (!opts.length) return '<div class="card"><h2>Target tabungan</h2><div class="sub">Perjalanan ini sudah dimulai, jadi tidak ada bulan tersisa untuk menabung.</div></div>';
  var t0 = g ? g.t : Math.ceil(pl.t / 1000) * 1000, last = opts[opts.length - 1], before = opts.length > 1 ? opts[opts.length - 2] : last;
  return (
    '<div class="card"><h2>Target tabungan</h2><div class="sub mb8">Hitung berapa yang perlu disisihkan tiap bulan sebelum berangkat.</div><div class="kf"><div><label for="gt">Target (Rp)</label><input id="gt" type="text" inputmode="numeric" data-num-fmt="rp" value="' + (t0 ? t0.toLocaleString('id-ID') : '') +
    '"></div><div><label for="gs">Sudah terkumpul (Rp)</label><input id="gs" type="text" inputmode="numeric" data-num-fmt="rp" placeholder="0" value="' + (g && g.s0 ? g.s0.toLocaleString('id-ID') : '') + '"></div><div><label for="gf">Mulai menabung</label>' + goalSel('gf', opts, g ? g.from : opts[0]) +
    '</div><div><label for="gz">Terakhir menabung</label>' + goalSel('gz', opts, g ? g.to : before) + '</div><div class="gcall"><label for="gl">Sambungkan ke Rencana Keuangan?</label><select id="gl"><option value="1"' + (lk ? ' selected' : '') + '>Ya, hitung sebagai pengeluaran bulanan di Rincian</option><option value="0"' + (lk ? '' : ' selected') + '>Tidak, hanya pencatat target</option></select></div></div><div class="sub" id="gprev" style="margin:8px 0"></div><div class="err" id="gerr"></div><div class="row2"><button class="p" data-gset="1">Simpan target</button>' + (g ? '<button data-gcancel="1">Batal</button>' : '') + '</div></div>'
  );
}
/** Hitung rencana tabungan perjalanan per bulan; dipakai desktop dan APK. */
function goalCompute(t, s0, from, to, link) {
  var tv = +t > 0 ? +t : 0,
    sv = +s0 > 0 ? +s0 : 0,
    a = String(from || ''),
    b = String(to || ''),
    ok = /^\d{4}-\d{2}$/.test(a) && /^\d{4}-\d{2}$/.test(b),
    n = ok && b >= a ? monthList(a, b).length : 0;
  return {
    link: link !== false,
    t: tv,
    s0: sv,
    from: a,
    to: b,
    n: n,
    per: n && tv > sv ? Math.ceil((tv - sv) / n / 1000) * 1000 : 0,
  };
}
/** Hitung akumulasi dana terkumpul target tabungan sampai bulan refIso ('YYYY-MM-DD' / 'YYYY-MM'); dipakai desktop & APK. */
function goalSavedNow(g, refIso) {
  if (!g || typeof g !== 'object') return { got: 0, el: 0, totalMonths: 0, pct: 0 };
  var t = +g.t > 0 ? +g.t : 0,
    s0 = +g.s0 > 0 ? +g.s0 : 0,
    per = +g.per > 0 ? +g.per : 0,
    cm = String(refIso || (typeof todayISO === 'function' ? todayISO() : '')).slice(0, 7),
    ms = g.from && g.to && /^\d{4}-\d{2}$/.test(g.from) && /^\d{4}-\d{2}$/.test(g.to) && g.to >= g.from ? monthList(g.from, g.to) : [],
    el = cm ? ms.filter(function (k) { return k <= cm; }).length : 0,
    got = Math.min(t, s0 + per * el),
    pct = t > 0 ? Math.min(100, Math.round((got / t) * 100)) : 0;
  return { got: got, el: el, totalMonths: ms.length, pct: pct };
}
/** Validasi rentang tanggal (bila keduanya diisi dan b < a). */
function tripValidateDates(a, b) {
  var sa = String(a || '').trim(), sb = String(b || '').trim();
  if (sa && sb && sb < sa) return { field: 'end', error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' };
  return null;
}
/** Cek apakah profil perjalanan memiliki rentang P.start..P.end lengkap dan valid. */
function tripHasFullRange(P) {
  if (!P) return false;
  var s = String(P.start || '').trim(), e = String(P.end || '').trim();
  return !!(s && e && /^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e) && e >= s);
}
/** Format teks rentang Indonesia untuk pesan galat, mis. "12 Des 2026 - 21 Des 2026". */
function tripRangeTextIndo(P) {
  if (!tripHasFullRange(P)) return '';
  return fmtD(P.start) + ' - ' + fmtD(P.end);
}
/** Validasi tanggal kegiatan itinerary terhadap rentang P.start..P.end bila lengkap. */
function tripValidateItinDate(P, dayIso, oldItem) {
  if (!tripHasFullRange(P)) return null;
  var d = String(dayIso || '').trim();
  if (oldItem && tripIsItemOutOfRange(P, oldItem, false) && d === String(oldItem.day || '').trim()) {
    return null;
  }
  if (!d || d < P.start || d > P.end) {
    return {
      field: 'day',
      error: 'Tanggal kegiatan harus berada dalam rentang perjalanan (' + tripRangeTextIndo(P) + ').',
    };
  }
  return null;
}
/** Validasi tanggal masuk/keluar pemesanan (b < a dan rentang P.start..P.end bila lengkap). */
function tripValidateBookingDates(P, aIso, bIso, oldItem) {
  var a = String(aIso || '').trim(), b = String(bIso || '').trim();
  if (a && b && b < a) {
    return {
      field: 'end',
      badStart: false,
      badEnd: true,
      error: 'Tanggal keluar tidak boleh sebelum tanggal masuk.',
    };
  }
  if (oldItem && tripIsItemOutOfRange(P, oldItem, true) && a === String(oldItem.a || '').trim() && b === String(oldItem.b || '').trim()) {
    return null;
  }
  if (tripHasFullRange(P)) {
    var badStart = !a || a < P.start || a > P.end;
    var badEnd = b ? (b < P.start || b > P.end) : false;
    if (badStart || badEnd) {
      return {
        field: badStart ? 'start' : 'end',
        badStart: badStart,
        badEnd: badEnd,
        error: 'Tanggal masuk dan keluar harus berada dalam rentang perjalanan (' + tripRangeTextIndo(P) + ').',
      };
    }
  }
  return null;
}
/** Cek apakah satu item itinerary atau pemesanan saat ini berada di luar P.start..P.end. */
function tripIsItemOutOfRange(P, item, isBooking) {
  if (!tripHasFullRange(P) || !item) return false;
  if (isBooking) {
    return !!(
      (item.a && (item.a < P.start || item.a > P.end)) ||
      (item.b && (item.b < P.start || item.b > P.end))
    );
  }
  return !!(item.day && (item.day < P.start || item.day > P.end));
}
/** Hitung total item (kegiatan + pemesanan) yang jatuh di luar rentang baru (newStart..newEnd). */
function tripCountItemsOutsideRange(P, newStart, newEnd) {
  if (!P || !newStart || !newEnd || !/^\d{4}-\d{2}-\d{2}$/.test(newStart) || !/^\d{4}-\d{2}-\d{2}$/.test(newEnd) || newEnd < newStart) {
    return 0;
  }
  var count = 0;
  (P.it || []).forEach(function (x) {
    if (x && x.day && (x.day < newStart || x.day > newEnd)) count++;
  });
  (P.bk || []).forEach(function (x) {
    if (x && ((x.a && (x.a < newStart || x.a > newEnd)) || (x.b && (x.b < newStart || x.b > newEnd)))) count++;
  });
  return count;
}
/** Normalisasi dan validasi input tautan (opsional; kosong boleh; auto https:// bila tanpa skema; maks 400 karakter). */
function tripValidateAndNormUrl(rawUrl) {
  var s = String(rawUrl == null ? '' : rawUrl).trim();
  if (!s) return { ok: true, url: '', error: '' };
  if (s.length > 400) {
    return { ok: false, url: s, error: 'Tautan terlalu panjang (maks. 400 karakter).' };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    if (!/^https?:\/\//i.test(s)) {
      return { ok: false, url: s, error: 'Tautan tidak valid. Gunakan alamat web, mis. https://contoh.com' };
    }
  } else {
    if (/^\/\//.test(s)) s = 'https:' + s;
    else s = 'https://' + s;
  }
  if (s.length > 400) {
    return { ok: false, url: s, error: 'Tautan terlalu panjang (maks. 400 karakter).' };
  }
  var passedOkUrl = typeof okUrl === 'function' ? okUrl(s) : /^https?:\/\/[^\s"'<>]+$/i.test(s);
  var hostMatch = s.match(/^https?:\/\/([^/?#:\s]+)(?:[:/?#]|$)/i);
  var host = hostMatch ? hostMatch[1] : '';
  if (!passedOkUrl || !host || host.indexOf('.') < 1 || /^\.|\.$/.test(host) || host.indexOf('..') >= 0) {
    return { ok: false, url: s, error: 'Tautan tidak valid. Gunakan alamat web, mis. https://contoh.com' };
  }
  return { ok: true, url: s, error: '' };
}
/** Tampilkan atau bersihkan pesan galat inline form Perjalanan (+ aria-invalid + fokus Desktop / gulir APK). */
function tripSetFieldError(errId, ctrlEls, msg, isMobile) {
  var errEl = typeof $ === 'function' ? $(errId) : (typeof document !== 'undefined' ? document.getElementById(errId) : null);
  var list = Array.isArray(ctrlEls) ? ctrlEls : (ctrlEls ? [ctrlEls] : []);
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }
  list.forEach(function (el) {
    if (!el || !el.setAttribute) return;
    if (msg) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  });
  if (msg && list[0]) {
    var first = list[0];
    if (isMobile) {
      if (typeof first.scrollIntoView === 'function') {
        var beh = (typeof rkIsReducedMotion === 'function' && rkIsReducedMotion()) ? 'auto' : 'smooth';
        try { first.scrollIntoView({ behavior: beh, block: 'center' }); } catch (e) {}
      }
    } else if (typeof first.focus === 'function') {
      try { first.focus({ preventScroll: false }); } catch (e) { try { first.focus(); } catch (e2) {} }
    }
  }
}
/** Ekstrak nama domain bersih (tanpa www.) dari URL http(s) yang valid. */
function tripExtractDomain(url) {
  var su = typeof safeHref === 'function' ? safeHref(url) : String(url || '').trim();
  if (!su) return '';
  var host = '';
  try {
    if (typeof URL === 'function') host = new URL(su).hostname || '';
  } catch (e) {}
  if (!host) {
    var m = su.match(/^https?:\/\/([^/?#:\s]+)/i);
    host = m ? m[1] : '';
  }
  return host.replace(/^www\./i, '');
}
/** Render chip/baris tautan kartu dengan ikon SVG inline dan domain tanpa www.; APK memicu mobOpenExternalUrl. */
function tripLinkChipHtml(rawUrl, isMobile) {
  var su = typeof safeHref === 'function' ? safeHref(rawUrl) : '';
  var ok = su && (typeof okUrl === 'function' ? okUrl(su) : /^https?:\/\/[^\s"'<>]+$/i.test(su));
  if (!ok) return '';
  var dom = tripExtractDomain(su) || su;
  var ico = '<svg class="trip-card-link-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  if (isMobile) {
    return (
      '<div class="trip-card-link-row">' +
      '<button type="button" class="trip-card-link" data-m-ext-url="' + esc(su) + '" title="' + esc(su) + '">' +
      ico + '<span class="trip-card-link-host">' + esc(dom) + '</span></button></div>'
    );
  }
  return (
    '<div class="trip-card-link-row">' +
    '<a class="trip-card-link" href="' + esc(su) + '" title="' + esc(su) + '" target="_blank" rel="noopener noreferrer">' +
    ico + '<span class="trip-card-link-host">' + esc(dom) + '</span></a></div>'
  );
}
/** Cek apakah hari Itinerary sedang terbuka pada state tampilan sesi (bawaan tertutup). */
function tripIsDayOpen(stateObj, tripId, dayIso) {
  if (!stateObj || !tripId || !dayIso) return false;
  var map = stateObj.tripOpenDays && stateObj.tripOpenDays[tripId];
  return !!(map && map[dayIso] === true);
}
/** Atur status buka/tutup satu hari Itinerary pada state tampilan sesi. */
function tripSetDayOpen(stateObj, tripId, dayIso, isOpen) {
  if (!stateObj || !tripId || !dayIso) return;
  if (!stateObj.tripOpenDays || typeof stateObj.tripOpenDays !== 'object') stateObj.tripOpenDays = {};
  if (!stateObj.tripOpenDays[tripId] || typeof stateObj.tripOpenDays[tripId] !== 'object') {
    stateObj.tripOpenDays[tripId] = {};
  }
  stateObj.tripOpenDays[tripId][dayIso] = !!isOpen;
}
/** Cek apakah seluruh hari perjalanan pada Itinerary sedang terbuka. */
function tripAreAllDaysOpen(stateObj, tripId, days) {
  if (!Array.isArray(days) || !days.length) return false;
  return days.every(function (d) { return tripIsDayOpen(stateObj, tripId, d); });
}
/** Balik seluruh hari antara Buka semua / Tutup semua; mengembalikan status baru (true = semua terbuka). */
function tripToggleAllDays(stateObj, tripId, days) {
  if (!stateObj || !tripId || !Array.isArray(days)) return false;
  var openAll = !tripAreAllDaysOpen(stateObj, tripId, days);
  days.forEach(function (d) { tripSetDayOpen(stateObj, tripId, d, openAll); });
  return openAll;
}
/** Deteksi keterpotongan teks aktual pada kartu Itinerary & Pemesanan lalu tampilkan/sembunyikan tombol Tampilkan. */
function tripRefreshTruncation(rootEl, expandedMap) {
  if (!rootEl || !rootEl.querySelectorAll) return;
  var cards = rootEl.querySelectorAll('[data-it-row], [data-bk-row]');
  Array.prototype.forEach.call(cards, function (card) {
    var id = card.getAttribute('data-it-row') || card.getAttribute('data-bk-row') || '';
    var isBk = card.hasAttribute('data-bk-row');
    var btn = card.querySelector(
      isBk ? '[data-bk-more], [data-mbk-more]' : '[data-it-more], [data-mit-more]'
    );
    if (!btn) return;
    var isExp = !!(expandedMap && id && expandedMap[id]);
    card.classList.toggle('is-expanded', isExp);
    if (isExp) {
      btn.hidden = false;
      btn.textContent = 'Sembunyikan';
      btn.setAttribute('aria-expanded', 'true');
      return;
    }
    var targets = card.querySelectorAll('.trip-trunc-target');
    var cut = false;
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      var sh = el.scrollHeight || 0, ch = el.clientHeight || 0;
      var sw = el.scrollWidth || 0, cw = el.clientWidth || 0;
      if ((ch > 0 && sh > ch + 1) || (cw > 0 && sw > cw + 1) || (ch === 0 && sh > 1) || (cw === 0 && sw > 1)) {
        cut = true;
        break;
      }
    }
    btn.hidden = !cut;
    btn.textContent = 'Tampilkan';
    btn.setAttribute('aria-expanded', 'false');
  });
}
/** Jadwalkan deteksi ulang keterpotongan setelah render, font siap, dan perubahan ukuran layar (debounced). */
function tripScheduleTruncationRefresh(rootEl, getExpandedMap) {
  if (!rootEl) return;
  var run = function () {
    var map = typeof getExpandedMap === 'function' ? getExpandedMap() : getExpandedMap;
    tripRefreshTruncation(rootEl, map || {});
  };
  run();
  if (typeof requestAnimationFrame === 'function') {
    try { requestAnimationFrame(run); } catch (e) {}
  }
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready && !rootEl._rkFontsTruncBound) {
    rootEl._rkFontsTruncBound = true;
    try {
      document.fonts.ready.then(run, function () {});
    } catch (e) {}
  }
  var debounced = function () {
    clearTimeout(rootEl._rkTruncT);
    rootEl._rkTruncT = setTimeout(run, 80);
  };
  if (typeof ResizeObserver === 'function' && !rootEl._rkTruncRo) {
    try {
      var ro = new ResizeObserver(debounced);
      ro.observe(rootEl);
      rootEl._rkTruncRo = ro;
    } catch (e) {}
  } else if (typeof window !== 'undefined' && !rootEl._rkTruncResizeBound) {
    rootEl._rkTruncResizeBound = true;
    window.addEventListener('resize', debounced);
  }
}
/** Ikat tinggi otomatis (maks 4 baris) dan penghitung karakter n/200 pada textarea catatan kegiatan. */
function tripBindNoteAutoGrow(noteEl, cntEl) {
  if (!noteEl) return;
  var maxLen = parseInt(noteEl.getAttribute('maxlength') || '200', 10) || 200;
  var sync = function () {
    var val = String(noteEl.value || '');
    if (cntEl) cntEl.textContent = val.length + '/' + maxLen;
    try {
      noteEl.style.height = 'auto';
      var cs = typeof getComputedStyle === 'function' ? getComputedStyle(noteEl) : null;
      var lh = cs ? parseFloat(cs.lineHeight) : 0;
      if (!lh || isNaN(lh)) lh = 20;
      var pv = cs ? (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) : 18;
      var bw = cs ? (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) : 2;
      var maxH = Math.round(lh * 4 + pv + bw);
      var sh = noteEl.scrollHeight || 0;
      if (sh > 0) {
        noteEl.style.height = Math.min(sh, maxH) + 'px';
        noteEl.style.overflowY = sh > maxH ? 'auto' : 'hidden';
      }
    } catch (e) {}
  };
  sync();
  if (!noteEl._rkAutoGrowBound) {
    noteEl._rkAutoGrowBound = true;
    noteEl.addEventListener('input', sync);
  }
}
/** Buka sub-tab & hari item dari tombol "Lihat" di toast, gulir halus ke kartu, lalu beri 2 denyut sorot (hormati reduced motion). */
function tripFocusItemFromToast(tripId, kind, itemId, isMobile) {
  var prMap = typeof ALL !== 'undefined' && ALL && ALL.kas && ALL.kas.pr ? ALL.kas.pr : null;
  var tr = prMap && tripId ? prMap[tripId] : null;
  var isBk = kind === 'book';
  var arr = tr ? (isBk ? (tr.bk || []) : (tr.it || [])) : [];
  var item = null;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].id === itemId) { item = arr[i]; break; }
  }
  var showMiss = function () {
    if (isMobile && typeof showMobToast === 'function') showMobToast('Kegiatan tidak ditemukan');
    else if (typeof toast === 'function') toast('Kegiatan tidak ditemukan');
  };
  if (!tr || !item) {
    showMiss();
    return false;
  }
  if (isMobile) {
    if (typeof MOB_STATE !== 'undefined' && MOB_STATE) {
      MOB_STATE.tripId = tr.id;
      MOB_STATE.tripView = 'detail';
      MOB_STATE.tripSub = isBk ? 'book' : 'itin';
      if (!isBk && item.day) tripSetDayOpen(MOB_STATE, tr.id, item.day, true);
    }
    if (typeof switchMobileTab === 'function' && typeof MOB_STATE !== 'undefined' && MOB_STATE && MOB_STATE.tab !== 'trip') {
      switchMobileTab('trip');
    } else if (typeof renderMobTrip === 'function') {
      renderMobTrip();
    }
  } else {
    if (typeof setMode === 'function' && typeof mode !== 'undefined' && mode !== 'trip') setMode('trip');
    if (typeof setTrip === 'function' && (typeof tp !== 'function' || !tp() || tp().id !== tr.id)) setTrip(tr.id);
    if (typeof BR_STATE !== 'undefined' && BR_STATE) {
      BR_STATE.tripView = 'detail';
      BR_STATE.tripSubTab = isBk ? 'book' : 'itin';
      if (!isBk && item.day) tripSetDayOpen(BR_STATE, tr.id, item.day, true);
    }
    if (typeof renderTrip === 'function') renderTrip();
  }
  var root = typeof $ === 'function' ? $(isMobile ? 'm-trip-root' : 'trip-root') : null;
  var sel = isBk ? ('[data-bk-row="' + itemId + '"]') : ('[data-it-row="' + itemId + '"]');
  var row = root ? root.querySelector(sel) : null;
  if (!row) {
    showMiss();
    return false;
  }
  var reduced = typeof rkIsReducedMotion === 'function'
    ? rkIsReducedMotion()
    : (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (root) {
    root.querySelectorAll('.rk-row-highlight').forEach(function (el) {
      if (el !== row) {
        el.classList.remove('rk-row-highlight', 'rk-row-highlight-static');
        if (el._rkHlTimer) { clearTimeout(el._rkHlTimer); el._rkHlTimer = null; }
      }
    });
  }
  var mm = isMobile && typeof $ === 'function' ? $('m-main') : null;
  if (mm && mm.scrollHeight > mm.clientHeight + 2 && typeof row.getBoundingClientRect === 'function' && typeof mm.getBoundingClientRect === 'function') {
    var rr = row.getBoundingClientRect(), mr = mm.getBoundingClientRect();
    var targetTop = mm.scrollTop + (rr.top - mr.top) - Math.max(24, (mm.clientHeight - rr.height) / 2);
    if (typeof mm.scrollTo === 'function') {
      try { mm.scrollTo({ top: Math.max(0, targetTop), behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { mm.scrollTop = Math.max(0, targetTop); }
    } else {
      mm.scrollTop = Math.max(0, targetTop);
    }
  } else if (typeof row.scrollIntoView === 'function') {
    try { row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } catch (e) {}
  }
  row.classList.remove('rk-row-highlight', 'rk-row-highlight-static');
  try { void row.offsetWidth; } catch (e) {}
  row.classList.add('rk-row-highlight');
  if (reduced) row.classList.add('rk-row-highlight-static');
  if (row._rkHlTimer) clearTimeout(row._rkHlTimer);
  row._rkHlTimer = setTimeout(function () {
    row.classList.remove('rk-row-highlight', 'rk-row-highlight-static');
    row._rkHlTimer = null;
  }, reduced ? 2000 : 1600);
  return true;
}
/** Validasi minimal profil perjalanan untuk desktop dan APK. */
function tripValidateMetaInput(start, end, curRaw, rateRaw) {
  var dtErr = tripValidateDates(start, end);
  if (dtErr) return dtErr;
  var cu = String(curRaw == null ? '' : curRaw).trim().toUpperCase();
  if (cu && !/^[A-Z]{3}$/.test(cu)) return { field: 'cur', error: 'Mata uang terdiri dari 3 huruf, mis. JPY.' };
  var rt = tripParseRateLocale(rateRaw);
  if (cu && !(rt > 0)) return { field: 'rate', error: 'Isi kurs: berapa rupiah untuk 1 ' + cu + '.' };
  return null;
}
function goalCalc() {
  return goalCompute(
    parseRp($('gt').value) || 0,
    parseRp($('gs').value) || 0,
    $('gf').value,
    $('gz').value,
    !$('gl') || $('gl').value !== '0'
  );
}
function goalPrev() {
  var c = goalCalc();
  $('gprev').innerHTML = !c.n ? 'Bulan terakhir tidak boleh sebelum bulan mulai.' : !c.per ? 'Target sudah tercapai dengan dana yang terkumpul.' : 'Sisihkan <b>' + rp(c.per) + '</b> per bulan &times; ' + c.n + ' bulan (' + monthLbl(c.from) + ' – ' + monthLbl(c.to) + ').';
}
function goalSave() {
  var c = goalCalc();
  if (!(c.t > 0)) { $('gerr').textContent = 'Isi target tabungan.'; return; }
  if (!c.n) { $('gerr').textContent = 'Bulan terakhir tidak boleh sebelum bulan mulai.'; return; }
  if (!c.per) { $('gerr').textContent = 'Dana yang terkumpul sudah mencapai target.'; return; }
  tp().goal = { t: c.t, s0: c.s0, from: c.from, to: c.to, per: c.per, link: c.link };
  gEdit = false;
  save();
  renderAll();
  toast('Target tabungan disimpan. Rincian Bulanan ikut menghitungnya.');
}
function goalDel() {
  askConfirm('Hapus target tabungan perjalanan ini?', function () {
    var sn = snap('Sebelum menghapus target tabungan');
    tp().goal = null;
    save();
    renderAll();
    toast('Target tabungan dihapus.', function () { restoreSnap(sn.t); });
  }, 'Ya, hapus');
}

/* ===== Simulasi "bagaimana jika" ===== */
function simMonths(x) {
  var e = x.rep === 'sekali' ? x.m : x.rep === 'n' ? Math.min(11, x.m + Math.max(1, x.n) - 1) : 11, r = [];
  for (var m = x.m; m <= e; m++) r.push(m);
  return r;
}
/** Hitung Rincian dengan skenario diterapkan sementara; data asli tidak berubah. */
function simCalc(list) {
  var keepS = S, KL = kasLinked(), keepTx = KL ? KL.tx : null, extra = [], C = JSON.parse(JSON.stringify(S)), y = +S.year;
  list.forEach(function (x) {
    if (x.k === 'in' || x.k === 'out') simMonths(x).forEach(function (mm) { extra.push({ d: y + '-' + pad2(mm + 1) + '-01', t: x.k === 'in' ? '+' : '-', amt: x.amt }); });
    else
      C.items.forEach(function (it) {
        if (it.id != x.id) return;
        if (x.k === 'stop') { it.end = isoD(Date.UTC(y, x.m, 0)); it.cnt = 0; }
        else if (x.k === 'cycle' || x.k === 'shift') simPutChg(it, simChg(it, x));
        else it.ch = (it.ch || []).concat([{ from: y + '-' + pad2(x.m + 1) + '-01', to: '', price: x.amt, n: null, unit: null, cut: false }]);
      });
  });
  S = C;
  if (KL) KL.tx = keepTx.concat(extra);
  try { return calc(); } finally { S = keepS; if (KL) KL.tx = keepTx; }
}
/** Tagihan item di tahun aktif yang BELUM lunas dan tidak dilewati: hanya ini yang masuk akal untuk disimulasikan. */
function simOpen(it) {
  if (!it) return [];
  return occ(it, +S.year)
    .map(isoD)
    .filter(function (d) {
      var k = it.id + '|' + d;
      return !S.paid[k] && !S.skip[k];
    });
}
function simOpenItems() {
  return S.items.filter(function (it) {
    return simOpen(it).length;
  });
}
function simOpenMonths(id) {
  var seen = {},
    r = [];
  simOpen(item(id)).forEach(function (d) {
    var m = +d.slice(5, 7) - 1;
    if (!seen[m]) {
      seen[m] = 1;
      r.push(m);
    }
  });
  return r;
}
function simMonthOpts(id) {
  var L = simOpenMonths(id);
  return L.length
    ? L.map(function (m) { return '<option value="' + m + '">' + MON[m] + '</option>'; }).join('')
    : '<option value="">(tidak ada tagihan tersisa)</option>';
}
function simItemDates(id) {
  var L = simOpen(item(id));
  return L.length ? L.map(function (d) { return '<option value="' + d + '">' + fmtD(d) + '</option>'; }).join('') : '<option value="">(tidak ada tagihan tersisa)</option>';
}
/** Isi kotak tanggal baru (geser) dengan tanggal tagihan terpilih + batas sah, dan batas awal tanggal siklus baru. */
function simSyncDates() {
  var f = $('smf'),
    t = $('smt'),
    h = $('smth'),
    d = $('smd');
  if (f && t) {
    var it = item($('smi') && $('smi').value);
    if (it && f.value) {
      var rg = pmShiftRange(it, f.value);
      t.value = f.value;
      if (rg.min) t.min = rg.min; else t.removeAttribute('min');
      if (rg.max) t.max = rg.max; else t.removeAttribute('max');
      if (h) h.textContent = rg.min || rg.max ? 'Tanggal baru boleh ' + (rg.min && rg.max ? 'antara ' + fmtD(rg.min) + ' dan ' + fmtD(rg.max) : rg.min ? 'mulai ' + fmtD(rg.min) : 'sampai ' + fmtD(rg.max)) + '.' : '';
    } else {
      t.value = '';
      if (h) h.textContent = '';
    }
  }
  if (d) {
    var o = simOpen(item($('smi') && $('smi').value));
    if (o.length) d.min = o[0]; else d.removeAttribute('min');
  }
}
function simExtra(firstId) {
  if (simK === 'cycle')
    return '<div><label for="smn2">Bayar tiap</label><input id="smn2" type="number" min="1" value="3"></div><div><label for="smu">Satuan</label><select id="smu"><option value="bulan">bulan</option><option value="tahun">tahun</option><option value="minggu">minggu</option><option value="hari">hari</option></select></div><div class="gcall"><label for="smd">Mulai berlaku dari tanggal</label><input id="smd" type="date"><div class="sub mt4">Siklus baru dimulai di tanggal ini; jadwal lama sesudahnya diganti.</div></div>';
  return '<div class="gcall"><label for="smf">Tagihan yang digeser</label><select id="smf">' + simItemDates(firstId) + '</select><div class="sub mt4">Tagihan ini dan semua sesudahnya mengikuti tanggal baru dengan siklus yang sama.</div></div><div class="gcall"><label for="smt">Ganti jadi tanggal</label><input id="smt" type="date"><div class="sub mt4" id="smth"></div></div>';
}
/** Perubahan jadwal (ch) untuk skenario siklus / geser. */
function simChg(it, x) {
  var eff = priceAt(it, Date.parse(x.from + 'T00:00:00Z')),
    p = eff !== it.price ? eff : null;
  if (x.k === 'cycle') return { from: x.from, to: '', price: p, n: x.n, unit: x.unit, cut: false };
  var sg = segAt(it, x.from),
    old = (it.ch || []).filter(function (q) { return q.anchor === x.from && !q.cut && !q.mv && !q.dates; })[0];
  return { from: old ? old.from : x.from, anchor: x.to, to: old ? old.to || '' : '', price: p, n: (sg && sg.n) || it.n, unit: (sg && sg.unit) || it.unit };
}
/** Tambahkan perubahan jadwal `g` ke `it`: yang bertanda tangan sama diganti (bukan ditumpuk). */
function simPutChg(it, g) {
  it.ch = (it.ch || [])
    .filter(function (q) { return !chSame(it, q, g); })
    .concat([g])
    .sort(cmpFrom);
}
function simName(id) {
  var it = S.items.filter(function (x) { return x.id == id; })[0];
  return it ? it.name : '(item dihapus)';
}
function simDesc(x) {
  var m = MON[x.m];
  if (x.k === 'stop') return 'Hentikan <b>' + esc(simName(x.id)) + '</b> mulai ' + m;
  if (x.k === 'cycle') return 'Ganti siklus <b>' + esc(simName(x.id)) + '</b> jadi tiap ' + x.n + ' ' + x.unit + ' mulai ' + fmtD(x.from);
  if (x.k === 'shift') return 'Geser tagihan <b>' + esc(simName(x.id)) + '</b> dari ' + fmtD(x.from) + ' jadi ' + fmtD(x.to) + ' (bulan berikutnya mengikuti)';
  if (x.k === 'price') return 'Harga <b>' + esc(simName(x.id)) + '</b> jadi ' + rp(x.amt) + ' mulai ' + m;
  return (x.k === 'in' ? 'Pemasukan ' : 'Pengeluaran ') + '<b>' + esc(x.name) + '</b> ' + rp(x.amt) + ' ' + (x.rep === 'sekali' ? 'sekali di ' + m : x.rep === 'n' ? x.n + ' kali mulai ' + m : 'tiap bulan mulai ' + m + ' sampai Des');
}
function simChart(A, B) {
  var n = A.rows.length;
  if (n < 2) return '';
  var all = A.rows.map(function (r) { return r.ak; }).concat(B.rows.map(function (r) { return r.ak; })), mn = Math.min.apply(null, all.concat([0])), mx = Math.max.apply(null, all), r = mx - mn || 1,
    pt = function (rows) { return rows.map(function (q, i) { return ((i * 600) / (n - 1)).toFixed(1) + ',' + (130 - ((q.ak - mn) / r) * 116).toFixed(1); }).join(' '); }, z = (130 - ((0 - mn) / r) * 116).toFixed(1);
  return '<svg class="kch" viewBox="0 0 600 140" preserveAspectRatio="none" role="img" aria-label="Saldo akhir per bulan: asli dan simulasi"><line x1="0" x2="600" y1="' + z + '" y2="' + z + '" style="stroke:var(--ln);stroke-dasharray:4 4"></line><polyline points="' + pt(A.rows) +
    '" style="fill:none;stroke:var(--mut);stroke-width:2;vector-effect:non-scaling-stroke"></polyline><polyline points="' + pt(B.rows) + '" style="fill:none;stroke:var(--ac);stroke-width:3;vector-effect:non-scaling-stroke"></polyline></svg><div class="sub" style="display:flex;gap:14px;flex-wrap:wrap"><span><i class="dot" style="background:var(--mut)"></i> Asli</span><span><i class="dot" style="background:var(--ac)"></i> Simulasi</span><span>' + MON[A.rows[0].m] + ' – ' + MON[A.rows[n - 1].m] + '</span></div>';
}
function renderSim() {
  var el = $('v-sim');
  if (mode === 'trip') { el.innerHTML = ''; return; }
  var mo = MON.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join(''), openIts = simOpenItems(),
    firstId = openIts[0] ? openIts[0].id : '',
    items = openIts.length ? openIts.map(function (it) { return '<option value="' + it.id + '">' + esc(it.name) + '</option>'; }).join('') : '<option value="">(tidak ada item dengan tagihan tersisa)</option>',
    two = simK === 'in' || simK === 'out',
    nb = simK === 'cycle' || simK === 'shift',
    form =
      '<div class="card"><h2>Simulasi &quot;bagaimana jika&quot; &middot; ' + S.year + '</h2><div class="sub mb10">Coba perubahan tanpa mengubah data. Hasilnya langsung terlihat di grafik.</div><div class="kf"><div class="gcall"><label for="smk">Skenario</label><select id="smk">' +
      [['out', 'Tambah pengeluaran / cicilan'], ['in', 'Tambah pemasukan'], ['stop', 'Hentikan item'], ['price', 'Ubah harga item'], ['cycle', 'Ganti seberapa sering bayar'], ['shift', 'Geser tanggal bayar']].map(function (o) { return '<option value="' + o[0] + '"' + (simK === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      (two ? '<div class="gcall"><label for="smn">Nama</label><input id="smn" maxlength="30" placeholder="mis. Cicilan motor"></div>' : '<div class="gcall"><label for="smi">Item</label><select id="smi">' + items + '</select></div>') +
      (nb ? simExtra(firstId) : '<div><label for="sma">' + (simK === 'stop' ? 'Jumlah (tidak dipakai)' : simK === 'price' ? 'Harga baru (Rp)' : 'Jumlah (Rp)') + '</label><input id="sma" type="text" inputmode="numeric" data-num-fmt="rp" data-slider-sync="sma-slider" placeholder="0"' + (simK === 'stop' ? ' disabled' : '') + '><div class="sim-slider-box"><input type="range" class="modern-slider mt6" id="sma-slider" min="0" max="25000000" step="50000" value="0" data-num-target="sma" aria-label="Geser nominal simulasi"' + (simK === 'stop' ? ' disabled' : '') + '><div class="slider-ticks"><span>Rp 0</span><span>Rp 12,5 jt</span><span>Rp 25 jt</span></div></div></div><div><label for="smm">Mulai bulan</label><select id="smm">' + (two ? mo : simMonthOpts(firstId)) + '</select></div>') +
      (two ? '<div><label for="smr">Berapa kali</label><select id="smr"><option value="bulan">Tiap bulan sampai Des</option><option value="sekali">Sekali saja</option><option value="n">Sekian kali</option></select></div><div id="smcw" hidden><label for="smc">Jumlah bulan</label><input id="smc" type="number" min="1" max="12" value="3"></div>' : '') +
      '</div><div class="err" id="smerr"></div><div class="row2"><button class="p" data-smadd="1">Tambah ke simulasi</button></div></div>';
  var out = form;
  setTimeout(simSyncDates, 0);
  if (!SIM.length) {
    el.innerHTML = out + '<div class="card"><div class="empty">Belum ada skenario. Tambahkan satu di atas untuk melihat dampaknya pada saldo.</div></div>';
    return;
  }
  var A = calc(), B = simCalc(SIM), lo = function (C) { return C.rows.reduce(function (a, r) { return !a || r.ak < a.ak ? r : a; }, null); }, la = lo(A), lb = lo(B), d = B.end - A.end,
    negs = function (C) { return C.rows.filter(function (r) { return r.ak < 0; }).map(function (r) { return MON[r.m]; }); }, nb = negs(B);
  out +=
    '<div class="card"><h2>Skenario aktif</h2>' + SIM.map(function (x, i) { return '<div class="it2"><div>' + simDesc(x) + '</div><div><button class="g d" data-smdel="' + i + '" aria-label="Hapus skenario">&#10005;</button></div></div>'; }).join('') +
    '<div class="acts mt8"><button class="p" data-smapply="1">Terapkan ke data</button><button class="g d" data-smclear="1">Buang semua</button></div></div>' +
    '<div class="card"><h2>Dampak</h2><div class="hero m0"><div class="card m0"><div class="sub">Saldo akhir Des ' + S.year + '</div><div class="big' + (B.end < 0 ? ' neg' : '') + '">' + rp(B.end) + '</div><div class="sub">asli ' + rp(A.end) + ' &middot; <b>' + (d >= 0 ? 'naik ' : 'turun ') + rp(Math.abs(d)) + '</b></div></div><div class="card stats m0"><div><span>Saldo terendah asli</span><b>' + (la ? rp(la.ak) : '—') + '</b><span>' + (la ? MON[la.m] : '') +
    '</span></div><div><span>Saldo terendah simulasi</span><b>' + (lb ? rp(lb.ak) : '—') + '</b><span>' + (lb ? MON[lb.m] : '') + '</span></div></div></div>' + '<div class="chp ' + (nb.length ? 'cash' : 'on') + '" style="margin:10px 0 6px">' + (nb.length ? 'Saldo negatif di ' + nb.join(', ') : 'Saldo tetap positif sepanjang tahun') + '</div>' + simChart(A, B) + '</div>' +
    '<div class="card"><h2>Per bulan</h2>' + B.rows.map(function (r, i) { var a = A.rows[i].ak, df = r.ak - a; return '<div class="it2"><div><b>' + MON[r.m] + '</b> <span class="sub">asli ' + rp(a) + '</span></div><div><b' + (r.ak < 0 ? ' style="color:var(--wr)"' : '') + '>' + rp(r.ak) + '</b> <span class="sub">' + (df === 0 ? '' : (df > 0 ? '+' : '&minus;') + rp(Math.abs(df))) + '</span></div></div>'; }).join('') + '</div>';
  el.innerHTML = out;
}
/** Terapkan semua skenario ke data asli (dengan cadangan agar bisa diurungkan). */
function simApply() {
  var sn = snap('Sebelum menerapkan simulasi'), y = +S.year, KL = kasLinked(), n = 0;
  SIM.forEach(function (x) {
    if (x.k === 'out') S.items.push({ id: Date.now() + n++, name: x.name, price: x.amt, n: 1, unit: x.rep === 'sekali' ? 'sekali' : 'bulan', start: y + '-' + pad2(x.m + 1) + '-01', end: x.rep === 'bulan' ? y + '-12-31' : '', cnt: x.rep === 'n' ? x.n : 0, cat: 'Simulasi', ch: [] });
    else if (x.k === 'in') { if (KL && Array.isArray(KL.tx)) simMonths(x).forEach(function (mm) { KL.tx.push({ id: kid('s'), d: y + '-' + pad2(mm + 1) + '-01', t: '+', amt: x.amt, cat: 'Simulasi', note: x.name, pay: '' }); }); }
    else
      S.items.forEach(function (it) {
        if (it.id != x.id) return;
        if (x.k === 'stop') { it.end = isoD(Date.UTC(y, x.m, 0)); it.cnt = 0; }
        else if (x.k === 'cycle' || x.k === 'shift')
          trackSchedule(it, function () {
            if (x.k === 'shift') moveStatusExact(it.id, [[x.from, x.to]], [S.paid, S.skip], [S.real || {}]);
            simPutChg(it, simChg(it, x));
          });
        else (it.ch = it.ch || []).push({ from: y + '-' + pad2(x.m + 1) + '-01', to: '', price: x.amt, n: null, unit: null, cut: false });
      });
  });
  SIM = [];
  save();
  renderAll();
  tab('sim');
  toast('Simulasi diterapkan ke data.', function () { restoreSnap(sn.t); });
}
function simAdd() {
  var x = { k: simK, m: $('smm') ? +$('smm').value : 0 }, err = function (t) { $('smerr').textContent = t; };
  if (simK === 'in' || simK === 'out') {
    x.name = $('smn').value.trim().slice(0, 30);
    x.amt = parseRp($('sma').value) || 0;
    x.rep = $('smr').value;
    x.n = Math.max(1, Math.min(12, parseInt($('smc').value, 10) || 1));
    if (!x.name) return err('Nama skenario belum diisi.');
    if (!(x.amt > 0)) return err('Nominal harus lebih besar dari 0 (mis. 50.000 atau 200k).');
  } else {
    x.id = $('smi').value;
    if (!x.id) return err(S.items.length ? 'Tidak ada item dengan tagihan tersisa tahun ini (semua sudah lunas atau dilewati).' : 'Belum ada item. Tambahkan item dulu di Kelola Item.');
    if ((simK === 'stop' || simK === 'price') && simOpenMonths(x.id).indexOf(x.m) < 0) return err('Pilih bulan yang masih punya tagihan belum lunas.');
    if (simK === 'cycle') {
      x.from = $('smd').value;
      x.n = parseInt($('smn2').value, 10) || 0;
      x.unit = $('smu').value;
      if (!ISO_RE.test(x.from)) return err('Pilih tanggal mulai siklus baru.');
      var o0 = simOpen(item(x.id))[0];
      if (o0 && x.from < o0) return err('Siklus baru tidak bisa dimulai sebelum tagihan pertama yang belum lunas (' + fmtD(o0) + ').');
      if (!(x.n >= 1)) return err('Isi seberapa sering bayar.');
    } else if (simK === 'shift') {
      x.from = $('smf').value;
      x.to = $('smt').value;
      if (!x.from) return err('Pilih tagihan yang mau digeser.');
      if (!ISO_RE.test(x.to)) return err('Isi tanggal baru di "Ganti jadi tanggal".');
      if (x.to === x.from) return err('Tanggal baru sama dengan tanggal tagihan.');
      if (simOpen(item(x.id)).indexOf(x.from) < 0) return err('Pilih tagihan yang belum lunas.');
      var rg = pmShiftRange(item(x.id), x.from);
      if ((rg.min && x.to < rg.min) || (rg.max && x.to > rg.max)) return err(pmRangeMsg(rg));
    }
    if (simK === 'price') {
      x.amt = parseRp($('sma').value) || 0;
      if (!(x.amt > 0)) return err('Isi harga baru.');
    }
  }
  SIM.push(x);
  renderSim();
}
function bindSim() {
  var V = $('v-sim');
  V.onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;
    if (d.smadd) simAdd();
    else if (d.smdel) {
      var sx = SIM[+d.smdel], si = sx && item(sx.id);
      askConfirm('Hapus simulasi <b>' + esc(si ? si.name : 'ini') + '</b>?', function () {
        SIM.splice(+d.smdel, 1);
        renderSim();
      }, 'Ya, hapus');
    }
    else if (d.smclear) askConfirm('Hapus semua simulasi?', function () { SIM = []; renderSim(); }, 'Ya, hapus semua');
    else if (d.smapply) simApply();
  };
  V.onchange = function (e) {
    if (e.target.id === 'smk') { simK = e.target.value; renderSim(); }
    else if (e.target.id === 'smi') {
      if (simK === 'shift') $('smf').innerHTML = simItemDates(e.target.value);
      if ($('smm') && (simK === 'stop' || simK === 'price')) $('smm').innerHTML = simMonthOpts(e.target.value);
      simSyncDates();
    } else if (e.target.id === 'smf') simSyncDates();
    else if (e.target.id === 'smr') $('smcw').hidden = e.target.value !== 'n';
  };
  V.addEventListener('input', function (e) {
    if (e.target.id === 'sma') fmtLive(e.target);
  });
}

/** Perjalanan sedang berlangsung (hari ini ada di antara Mulai dan Selesai)? */
function tripActive(P) {
  var td = todayISO();
  return !!(P.start && P.end && td >= P.start && td <= P.end);
}
function nowHM() {
  var d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function byTime(a, b) {
  return (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0;
}
/** Kegiatan hari ini + penanda "sedang berlangsung" dan "berikutnya" menurut jam sekarang. */
function tripToday(P) {
  var hm = nowHM(), r = { L: P.it.filter(function (x) { return x.day === todayISO(); }).sort(byTime), cur: -1, nxt: -1 };
  r.L.forEach(function (x, i) {
    if (x.done) return;
    if (x.time && x.time2 && x.time <= hm && hm <= x.time2) r.cur = i;
    else if (r.nxt < 0 && (!x.time || x.time > hm)) r.nxt = i;
  });
  return r;
}
function tripNow(P) {
  var td = todayISO(), T = tripToday(P), N = dayNo(P.end, P.start) + 1, no = dayNo(td, P.start) + 1, tm = isoD(Date.parse(td + 'T00:00:00Z') + 864e5),
    B = P.it.filter(function (x) { return x.day === tm; }).sort(byTime), done = T.L.filter(function (x) { return x.done; }).length;
  return (
    '<div class="card"><div class="sub">Hari ' + no + ' dari ' + N + ' &middot; sekarang ' + tmShow(nowHM()) + '</div><h2 style="margin:2px 0 4px">' + esc(P.dt[td] || dayLabel(P, td)) + '</h2><div class="sub">' + esc(dayLabel(P, td)) + (T.L.length ? ' &middot; ' + done + '/' + T.L.length + ' selesai' : '') + '</div></div>' +
    '<div class="card"><h2>Hari ini</h2>' +
    (T.L.map(function (x, i) {
      var mk = i === T.cur ? '<span class="chp on">Sedang berlangsung</span>' : i === T.nxt ? '<span class="chp ic">Berikutnya</span>' : '';
      return (
        '<div class="itm"><div class="tm">' + tmShow(x.time) + (x.time2 ? '<br>' + tmShow(x.time2) + '' : '') + '</div><div><div class="ttl"' + (x.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(x.place) + '</div><div>' + mk +
        (x.cat ? '<span class="chp" style="background:transparent;border:1px solid var(--ln)">' + esc(x.cat) + '</span>' : '') + pchip(x.pay) + lnk(x.link) + '</div>' + (x.note ? '<div class="sub">' + esc(x.note) + '</div>' : '') +
        '<div class="ac jcfs"><button class="g" data-itdone="' + x.id + '">' + (x.done ? '&#9745; Selesai' : '&#9744; Tandai selesai') + '</button></div></div><div class="co">' + (x.est ? amtTxt(P, x.est, x.fx) : '') + '</div></div>'
      );
    }).join('') || '<div class="sub">Belum ada kegiatan untuk hari ini. Tambahkan di tab Itinerary.</div>') + '</div>' +
    (B.length
      ? '<div class="card"><h2>Besok</h2>' + (P.dt[tm] ? '<div class="sub" style="margin:-6px 0 6px">' + esc(P.dt[tm]) + '</div>' : '') +
        B.slice(0, 5).map(function (x) { return '<div class="it2"><div><b>' + (tmShow(x.time) || '–') + '</b> ' + esc(x.place) + '</div><div>' + lnk(x.link) + '</div></div>'; }).join('') + (B.length > 5 ? '<div class="sub">+ ' + (B.length - 5) + ' kegiatan lagi</div>' : '') + '</div>'
      : '')
  );
}
/** Buka otomatis perjalanan yang sedang berlangsung bila hanya ada satu. */
function autoTrip() {
  if (mode !== 'trip' || tp()) return;
  var a = trips().filter(tripActive);
  if (a.length === 1) {
    tripAct = a[0].id;
    tripTab = 'now';
    remember('rk-trip', tripAct);
  }
}
function itFind(id) {
  return tp().it.filter(function (x) { return x.id === id; })[0];
}
function tripDelete(b) {
  var name = tp().name;
  askConfirm('Hapus perjalanan <b>' + esc(name) + '</b> beserta semua item dan catatannya?', function () {
    var sn = snap('Sebelum menghapus perjalanan ' + name);
    delete ALL.kas.pr[tripAct];
    tripAct = '';
    save();
    renderAll();
    toast('Perjalanan dihapus.', function () {
      restoreSnap(sn.t);
    });
  }, 'Ya, hapus perjalanan');
}
/** Hapus satu elemen dari daftar perjalanan (kunci k) setelah konfirmasi, dengan opsi urungkan. */
function tripRemove(k, id, msg) {
  var P = tp(),
    x = P[k].filter(function (o) { return o.id === id; })[0],
    nm = x && (x.title || x.place || x.text || x.url);
  askConfirm('Hapus ' + msg.toLowerCase() + (nm ? ' <b>' + esc(nm) + '</b>' : '') + '?', function () {
    var sn = snap('Sebelum menghapus ' + msg);
    P[k] = P[k].filter(function (o) { return o.id !== id; });
    save();
    renderTrip();
    toast(msg + ' dihapus.', function () { restoreSnap(sn.t); });
  }, 'Ya, hapus');
}

function bindTrip() {
  var V = $('v-trip');
  $('mdbar').onclick = function (e) {
    var b = e.target.closest('[data-md]');
    if (b) setMode(b.dataset.md === mode ? 'rencana' : b.dataset.md);
  };
  V.onclick = function (e) {
    var b = e.target.closest('button,[data-trip]');
    if (!b) return;
    var d = b.dataset, P = tp(), x, v;
    if (d.trip) setTrip(d.trip);
    else if (d.tnew) kasOpenPm('new');
    else if (d.tback) setTrip('');
    else if (d.ted) kasOpenPm('edit');
    else if (d.tdel) tripDelete(b);
    else if (d.tt) {
      tripTab = d.tt;
      itEdit = bkEdit = null;
      gEdit = false;
      renderTrip();
    } else if (d.gedit) {
      gEdit = true;
      renderTrip();
      goalPrev();
    } else if (d.gdel) goalDel();
    else if (d.glink) {
      var G = tp().goal;
      G.link = G.link === false;
      save();
      renderAll();
    } else if (d.gset) goalSave();
    else if (d.gcancel) {
      gEdit = false;
      renderTrip();
    } else if (d.xl) $('xlf').click();
    else if (d.xlt) xlTemplate();
    else if (d.tshare) {
      $('shs').textContent = '';
      $('shm').hidden = false;
    } else if (d.its) itSave();
    else if (d.itx) {
      itEdit = null;
      renderTrip();
    } else if (d.ited) {
      itEdit = d.ited;
      renderTrip();
      $('itp').scrollIntoView({ block: 'center' });
    } else if (d.itdel) tripRemove('it', d.itdel, 'Kegiatan');
    else if (d.itdone) {
      x = itFind(d.itdone);
      x.done = !x.done;
      save();
      renderTrip();
    } else if (d.bks) bkSave();
    else if (d.bkx) {
      bkEdit = null;
      renderTrip();
    } else if (d.bked) {
      bkEdit = d.bked;
      renderTrip();
      $('bkt').scrollIntoView({ block: 'center' });
    } else if (d.bkdel) tripRemove('bk', d.bkdel, 'Pemesanan');
    else if (d.bkpay) bkPay(d.bkpay);
    else if (d.lka) {
      v = $('lku').value.trim();
      if (!$('lkt').value.trim() || !okUrl(v)) {
        $('lker').textContent = 'Isi judul dan tautan yang diawali http:// atau https://';
        return;
      }
      P.lk.push({ id: kid('l'), title: $('lkt').value.trim().slice(0, 80), url: v.slice(0, 400) });
      save();
      renderTrip();
    } else if (d.lkdel) tripRemove('lk', d.lkdel, 'Tautan');
    else if (d.cka) {
      v = $('ckn').value.trim();
      if (v) {
        P.ck.push({ id: kid('c'), text: v.slice(0, 60), done: false });
        save();
        renderTrip();
        $('ckn').focus();
      }
    } else if (d.ckstd) {
      CK_STD.forEach(function (tx) { P.ck.push({ id: kid('c'), text: tx, done: false }); });
      save();
      renderTrip();
    } else if (d.cktog) {
      P.ck.forEach(function (c) { if (c.id === d.cktog) c.done = !c.done; });
      save();
      renderTrip();
    } else if (d.ckdel) {
      var ck = P.ck.filter(function (c) { return c.id === d.ckdel; })[0];
      askConfirm('Hapus <b>' + esc(ck ? ck.text : 'barang ini') + '</b> dari checklist?', function () {
        var sn = snap('Sebelum menghapus checklist');
        P.ck = P.ck.filter(function (c) { return c.id !== d.ckdel; });
        save();
        renderTrip();
        toast('Barang dihapus.', function () { restoreSnap(sn.t); });
      }, 'Ya, hapus');
    }
  };
  V.onchange = function (e) {
    var tid = e.target.id,
      FX = { ite: ['ite', 'itu'], itu: ['ite', 'itu'], bke: ['bke', 'bku'], bku: ['bke', 'bku'] };
    if (tid === 'itt' || tid === 'itt2') {
      var pt = tmParse(e.target.value);
      if (pt !== null) e.target.value = tmShow(pt);
    }
    if (FX[tid]) fxPrev(FX[tid][0], FX[tid][1]);
    if (tid === 'gf' || tid === 'gz') goalPrev();
    if (e.target.dataset.dt) {
      var P = tp(), t = e.target.value.trim().slice(0, 60);
      if (t) P.dt[e.target.dataset.dt] = t;
      else delete P.dt[e.target.dataset.dt];
      save();
    }
  };
  V.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'gt' || id === 'gs') {
      fmtLive(e.target);
      goalPrev();
    }
    if (id === 'ite' || id === 'bke') fmtLive(e.target);
    if (id === 'itt' || id === 'itt2') {
      var tv = e.target.value.replace(/[^\d.:]/g, '');
      if (/^\d{4}$/.test(tv)) tv = tv.slice(0, 2) + '.' + tv.slice(2);
      if (tv !== e.target.value) e.target.value = tv;
    }
    if (id === 'ite' || id === 'bke') fxPrev(id, id === 'ite' ? 'itu' : 'bku');
    if (id === 'tnote') {
      tp().note = e.target.value.slice(0, 2000);
      clearTimeout(noteTimer);
      noteTimer = setTimeout(save, 600);
    }
  });
  V.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'ckn') {
      e.preventDefault();
      V.querySelector('[data-cka]').click();
    }
  });
  $('kpg').addEventListener('input', function () {
    fmtLive(this);
  });
  $('kpgm').onchange = function () {
    $('kpgw').hidden = this.value !== '1';
  };
}

/* ===== Impor Excel ===== */
var XL_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  xlData = null,
  BLN = { januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, nopember: 11, desember: 12, des: 12, january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10, oct: 10, aug: 8, dec: 12, december: 12 };

/** Muat pustaka Excel (SheetJS) hanya saat dibutuhkan. */
function loadXlsx() {
  return new Promise(function (ok, no) {
    if (window.XLSX) return ok(window.XLSX);
    var sc = document.createElement('script');
    sc.src = XL_URL;
    sc.onload = function () { ok(window.XLSX); };
    sc.onerror = function () { no(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(sc);
  });
}
function xlDate(v) {
  if (v instanceof Date && !isNaN(v)) {
    var d = new Date(v.getTime() + 432e5);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  if (typeof v === 'number' && v > 30000 && v < 80000) return isoD(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
  var t = String(v == null ? '' : v).trim(), m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) return m[1] + '-' + m[2] + '-' + m[3];
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t))) return m[3] + '-' + pad2(+m[2]) + '-' + pad2(+m[1]);
  if ((m = /(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/.exec(t)) && BLN[m[2].toLowerCase()]) return m[3] + '-' + pad2(BLN[m[2].toLowerCase()]) + '-' + pad2(+m[1]);
  return '';
}
function xlHM(h, m) {
  h = +h;
  m = +m;
  return h > 23 || m > 59 ? '' : pad2(h) + ':' + pad2(m);
}
/** Baca jam: "20.00-21.50", "14.10-", "5 pagi", "9 malam". */
function xlTime(v) {
  var t = String(v == null ? '' : v).trim().toLowerCase(), m;
  if ((m = /(\d{1,2})[.:](\d{2})\s*(?:[-–—~]|s\/d|sampai)?\s*(?:(\d{1,2})[.:](\d{2}))?/.exec(t))) return { a: xlHM(m[1], m[2]), b: m[3] ? xlHM(m[3], m[4]) : '' };
  if ((m = /^(\d{1,2})\s*(pagi|siang|sore|malam)/.exec(t))) {
    var h = +m[1];
    if (m[2] === 'malam') h = h === 12 ? 0 : h < 12 ? h + 12 : h;
    else if ((m[2] === 'sore' || m[2] === 'siang') && h < 12) h += 12;
    return { a: xlHM(h, 0), b: '' };
  }
  return { a: '', b: '' };
}
function xlNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  var t = String(v == null ? '' : v).toLowerCase();
  if (/jalan|gratis|free/.test(t)) return 0;
  var m = t.replace(/rp|idr|yen|¥|jpy/g, '').replace(/\s/g, '').match(/[\d.,]+/);
  if (!m) return 0;
  t = m[0];
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  var n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}
function xlPay(v) {
  var t = String(v == null ? '' : v).toLowerCase();
  return /suica|icoca|pasmo|\bic\b|kartu ic/.test(t) ? 'ic' : /online|trip\.com|tiket|klook|traveloka|agoda|booking|\bby /.test(t) ? 'on' : /cash|tunai/.test(t) ? 'cash' : '';
}
function xlCat(t) {
  t = t.toLowerCase();
  if (/makan|sarapan|resto|ramen|sushi|cafe|kafe|family ?mart|lawson|7[- ]?eleven|konbini|bento|kuliner|jajan|dinner|lunch/.test(t)) return 'Makan';
  if (/belanja|shopping|uniqlo|don ?quijote|donki|souvenir|oleh-oleh|mall|outlet/.test(t)) return 'Belanja';
  if (/\bke |naik|bus|kereta|train|shinkansen|\bjr\b|subway|metro|bandara|airport|pesawat|station|stasiun|taksi|taxi|haneda|narita|imigrasi|immigration|[a-z]{3}-[a-z]{3}/.test(t)) return 'Transport';
  if (/tiket|tour|museum|admission|kuil|temple|castle|taman|park|observatory|aquarium|tower|masuk/.test(t)) return 'Tiket & Tour';
  return 'Lainnya';
}
function xlBcat(t) {
  t = String(t || '').toLowerCase();
  return /transport|pesawat|bus\b|kereta|shinkansen|\bjr\b/.test(t) ? 'Transport' : /akomodasi|hotel|penginapan|hostel/.test(t) ? 'Penginapan' : /persiapan|perlengkapan|visa|asuransi|internet|pasport|paspor|jaket|heatech|koper|simcard|esim|telkomsel/.test(t) ? 'Persiapan' : /admission|tiket|tour|wisata|gondola|klook/.test(t) ? 'Tiket & Tour' : 'Lainnya';
}
/** Cari baris judul kolom: Tanggal/Jam/Kegiatan (itinerary) atau Nama/Jumlah (pemesanan). */
function xlHeader(rows, name) {
  var A = { dateC: /^(date|tanggal|tgl|hari)$/, timeC: /^(jam|waktu|time)/, textC: /(keterangan|kegiatan|aktivitas|activity|agenda|acara)/, costC: /(biaya|harga|cost|nominal)/, curC: /(mata ?uang|currency)/, payC: /(bayar|metode|payment)/, catC: /(kategori|category)/, linkC: /(link|tautan|url)/, noteC: /(catatan|note)/, nameC: /^(nama|item|pemesanan|booking)/, amtC: /^(jumlah|harga|amount|biaya)/, paidC: /(lunas|status)/ };
  for (var r = 0; r < Math.min(rows.length, 40); r++) {
    var h = { row: r };
    (rows[r] || []).forEach(function (c, i) {
      var t = String(c == null ? '' : c).trim().toLowerCase();
      if (!t) return;
      for (var k in A) if (h[k] == null && A[k].test(t)) { h[k] = i; break; }
    });
    if (h.textC != null && (h.timeC != null || h.dateC != null)) { h.kind = 'it'; return h; }
    if (h.nameC != null && h.amtC != null) { h.kind = 'bk'; return h; }
    var pc = (rows[r] || []).map(function (c) { return String(c == null ? '' : c).trim().toLowerCase(); }).indexOf('pengeluaran');
    if (pc >= 0) return { row: r, kind: 'bk', free: true, nameC: pc, catC: pc - 1, idrC: pc + 1, fxC: pc + 2 };
  }
  return null;
}
function xlItin(rows, h, out) {
  var day = '', n = out.it.length;
  out.curs = out.curs || [];
  for (var r = h.row + 1; r < rows.length; r++) {
    var row = rows[r] || [], dv = h.dateC != null ? xlDate(row[h.dateC]) : '', txt = String(row[h.textC] == null ? '' : row[h.textC]).trim(),
      tm = h.timeC != null ? xlTime(row[h.timeC]) : { a: '', b: '' }, cost = h.costC != null ? row[h.costC] : row[h.textC + 1], dm = /^day\s*\d+\s*[:\-–]?\s*(.*)$/i.exec(txt);
    if (dv) day = dv;
    if (dm && !tm.a && !xlNum(cost)) {
      var nx = '';
      for (var j = r + 1; j < Math.min(rows.length, r + 4) && !nx; j++) nx = h.dateC != null ? xlDate((rows[j] || [])[h.dateC]) : '';
      var tg = nx && nx !== day ? nx : day;
      if (tg && dm[1].trim()) out.dt[tg] = dm[1].trim().replace(/\s+/g, ' ').slice(0, 40);
      continue;
    }
    if (/^total$/i.test(txt) && !tm.a) {
      xlBlock(rows, h, r, out);
      break;
    }
    if (!txt || !day || /^(sub)?total\b/i.test(txt)) continue;
    var urls = txt.match(/https?:\/\/\S+/g) || [], place = txt.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim(), payRaw = h.payC != null ? row[h.payC] : row[h.textC + 2], pay = xlPay(payRaw), amt = xlNum(cost), fx = false, cuCode = '';
    if (h.curC != null) {
      var cu = String(row[h.curC] || '').trim().toUpperCase().slice(0, 3);
      if (cu && !/^(IDR|RP)$/.test(cu)) {
        fx = true;
        cuCode = cu;
        out.cur = out.cur || cu;
        if (/^[A-Z]{3}$/.test(cu) && out.curs.indexOf(cu) < 0) out.curs.push(cu);
      }
    } else if (amt) fx = amt >= 100000 && !/yen|¥|jpy/i.test(String(cost) + String(payRaw)) ? false : pay === 'ic' || pay === 'cash' || /yen|¥|jpy/i.test(String(cost) + String(payRaw)) ? true : pay === 'on' ? false : !!out.hintFx && amt < 100000;
    if (!fx && amt >= 100000 && h.curC == null && (!pay || pay === 'ic')) pay = 'on';
    if (fx && amt) out.fx = true;
    var note = h.noteC != null ? String(row[h.noteC] || '').trim() : '';
    if (place.length > 60) {
      note = (place + (note ? ' · ' + note : '')).slice(0, 120);
      place = place.slice(0, 57) + '…';
    }
    if (!place) place = urls[0] ? 'Lokasi (peta)' : txt.slice(0, 60);
    var ct = h.catC != null ? xlBcat(row[h.catC]) : '';
    var itRow = { id: 'i' + ++n, day: day, time: tm.a, time2: tm.b, place: place, cat: ct === 'Persiapan' || ct === 'Penginapan' || !ct ? (h.catC != null && /makan/i.test(row[h.catC]) ? 'Makan' : xlCat(txt)) : ct, est: Math.round(amt), fx: fx && amt > 0, pay: pay, link: h.linkC != null && /^https?:/.test(row[h.linkC]) ? String(row[h.linkC]).trim() : urls[0] || '', note: note, done: false, rec: '' };
    if (fx && amt > 0 && cuCode) itRow._cu = cuCode;
    out.it.push(itRow);
  }
}
/** Tabel "Pengeluaran" di bawah baris TOTAL pada sheet itinerary -> pemesanan (top-up Suica dilewati: sudah ada di biaya harian). */
function xlBlock(rows, h, from, out) {
  var j = from + 1, blanks = 0, n = out.bk.length;
  while (j < rows.length && !/^pengeluaran/i.test(String((rows[j] || [])[h.textC] || '').trim())) if (j++ > from + 12) return;
  for (j++; j < rows.length && blanks < 4; j++) {
    var row = rows[j] || [], t = String(row[h.textC] == null ? '' : row[h.textC]).trim().replace(/\s+/g, ' ');
    if (!t) { blanks++; continue; }
    blanks = 0;
    if (/^(sub)?total\b/i.test(t) || /^suica|top ?up suica|suica untuk/i.test(t)) continue;
    var amt = xlNum(row[h.textC + 1]), pay = xlPay(row[h.textC + 2]);
    if (amt > 0) out.bk.push({ id: 'b' + ++n, title: t.slice(0, 120), cat: xlBcat(t), amt: Math.round(amt), fx: false, pay: pay || 'on', link: '', a: '', b: '', paid: false, rec: '' });
  }
}
function xlBook(rows, h, out) {
  out.curs = out.curs || [];
  var cat = 'Lainnya', n = out.bk.length, add = function (title, c, amt, fx, pay, paid, link, cuCode) {
    if (amt > 0) {
      var bkRow = { id: 'b' + ++n, title: title.slice(0, 120), cat: c, amt: Math.round(amt), fx: fx, pay: pay, link: link || '', a: '', b: '', paid: !!paid, rec: '' };
      if (fx && cuCode) bkRow._cu = cuCode;
      out.bk.push(bkRow);
    }
    if (fx && amt > 0) out.fx = true;
  };
  for (var r = h.row + 1; r < rows.length; r++) {
    var row = rows[r] || [], title = String(row[h.nameC] == null ? '' : row[h.nameC]).trim();
    if (!title || /^(sub)?total\b/i.test(title)) continue;
    if (h.free) {
      var cv = String(row[h.catC] == null ? '' : row[h.catC]).trim();
      if (cv && cv !== '&') cat = xlBcat(cv);
      add(title, cat, xlNum(row[h.idrC]), false, 'on', false);
    } else {
      var cu = h.curC != null ? String(row[h.curC] || '').trim().toUpperCase().slice(0, 3) : '', fx = !!cu && !/^(IDR|RP)$/.test(cu);
      if (fx) {
        out.cur = out.cur || cu;
        if (/^[A-Z]{3}$/.test(cu) && out.curs.indexOf(cu) < 0) out.curs.push(cu);
      }
      add(title, h.catC != null ? xlBcat(row[h.catC]) : 'Lainnya', xlNum(row[h.amtC]), fx, h.payC != null ? xlPay(row[h.payC]) : '', h.paidC != null && /^(ya|y|lunas|paid|1|true|sudah)/i.test(String(row[h.paidC]).trim()), h.linkC != null && /^https?:/.test(row[h.linkC]) ? String(row[h.linkC]).trim() : '', fx ? cu : '');
    }
  }
}
/** Baca seluruh workbook menjadi data perjalanan. Mengembalikan {it, bk, dt, lk, start, end, cur, fx, curs, extras, error}. */
function xlParse(wb) {
  var out = { it: [], bk: [], dt: {}, lk: [], cur: '', curs: [], extras: [], fx: false, hintFx: false, error: '' }, seen = {};
  wb.SheetNames.forEach(function (nm) {
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' });
    rows.forEach(function (row) { row.forEach(function (c) { if (/yen|suica|¥|jpy/i.test(String(c))) out.hintFx = true; }); });
    var h = xlHeader(rows, nm);
    if (!h) return;
    if (h.kind === 'it') xlItin(rows, h, out);
    else if (!(h.free && out.bk.length)) xlBook(rows, h, out);
    rows.forEach(function (row, ri) {
      row.forEach(function (c, ci) {
        var t = String(c == null ? '' : c), u = /https?:\/\/\S+/.exec(t);
        if (!u || (h.kind === 'it' && ci === h.textC) || /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/.test(u[0]) || seen[u[0]] || out.lk.length >= 8) return;
        seen[u[0]] = 1;
        var ti = t.replace(u[0], '').replace(/[:\s=]+$/, '').replace(/^\s*\d+\.\s*/, '').trim();
        out.lk.push({ id: 'l' + (out.lk.length + 1), title: (ti || u[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0]).slice(0, 60), url: u[0].slice(0, 300) });
      });
    });
  });
  var codes = (out.curs || []).slice();
  out.cur = codes[0] || out.cur || '';
  if (codes.length > 7) {
    out.error = 'Terlalu banyak mata uang asing (maksimal 7 mata uang asing: 1 utama + 6 tambahan; ditemukan ' + codes.length + ').';
  } else if (codes.length >= 2) {
    out.extras = codes.slice(1);
    out.it.forEach(function (x) {
      if (x._cu && x._cu !== out.cur) x.c = x._cu;
      delete x._cu;
    });
    out.bk.forEach(function (x) {
      if (x._cu && x._cu !== out.cur) x.c = x._cu;
      delete x._cu;
    });
  } else {
    out.it.forEach(function (x) { delete x._cu; });
    out.bk.forEach(function (x) { delete x._cu; });
  }
  var ds = out.it.map(function (x) { return x.day; }).sort();
  out.start = ds[0] || '';
  out.end = ds[ds.length - 1] || '';
  return out;
}
/** Ringkasan data Excel hasil xlParse untuk dialog pratinjau impor. */
function xlSummaryText(d) {
  var a = 0, b = 0;
  (d.bk || []).forEach(function (x) { if (x.fx) b += x.amt; else a += x.amt; });
  (d.it || []).forEach(function (x) { if (x.pay === 'on') return; if (x.fx) b += x.est; else a += x.est; });
  var curListTxt = (d.curs && d.curs.length > 1) ? (' Mata uang asing terdeteksi: ' + d.curs.join(', ') + ' (kurs mata uang tambahan dapat diisi lewat tombol Ubah Perjalanan).') : '';
  return d.it.length + ' kegiatan, ' + d.bk.length + ' pemesanan, ' + Object.keys(d.dt || {}).length + ' judul hari' +
    (d.start ? ' · ' + fmtD(d.start) + ' – ' + fmtD(d.end) : '') + '.' +
    ' Perkiraan biaya: ' + rp(a) + (b ? ' + ' + b.toLocaleString('id-ID') + ' dalam mata uang asing' : '') + '.' +
    (d.fx ? ' Isi kode dan kurs mata uang asing utama.' : '') + curListTxt;
}
/** Validasi metadata profil sebelum membuat profil perjalanan dari Excel. */
function xlValidateMeta(d, nama, curRaw, kursRaw) {
  var n = String(nama == null ? '' : nama).trim().slice(0, 30),
    cu = String(curRaw == null ? '' : curRaw).trim().toUpperCase(),
    rt = tripParseRateLocale(kursRaw);
  if (!d) return { error: '' };
  if (d.error) return { error: d.error };
  if (d.curs && d.curs.length > 7) return { error: 'Maksimal 6 mata uang tambahan (total 7 kode asing).' };
  if (!n) return { error: 'Nama perjalanan belum diisi.' };
  if (d.fx && !cu) return { error: 'Ada biaya mata uang asing (mis. yen). Isi kodenya, misalnya JPY.' };
  if (cu && !/^[A-Z]{3}$/.test(cu)) return { error: 'Mata uang terdiri dari 3 huruf, mis. JPY.' };
  if (cu && !(rt > 0)) return { error: 'Isi kurs: berapa rupiah untuk 1 ' + cu + '.' };
  return { error: '', name: n, cur: cu, rate: cu ? rt : 0 };
}
/** Bentuk profil perjalanan unik dari hasil xlParse + metadata. */
function xlBuildProfile(d, nama, cur, kurs) {
  var base = String(nama == null ? '' : nama).trim().slice(0, 30) || 'Perjalanan Impor',
    nm = base, k = 2;
  while (trips().some(function (x) { return x.name.toLowerCase() === nm.toLowerCase(); })) nm = base.slice(0, 26) + ' (' + k++ + ')';
  var id = 'p' + Date.now().toString(36);
  if (ALL && ALL.kas && ALL.kas.pr && ALL.kas.pr[id]) id = kid('p');
  var cu = String(cur == null ? '' : cur).trim().toUpperCase(),
    rt = tripParseRateLocale(kurs);
  var extrasClean = (Array.isArray(d.extras) ? d.extras : []).filter(function (ec) {
    return ec && /^[A-Z]{3}$/.test(ec) && ec !== cu && ec !== 'IDR' && ec !== 'RP';
  }).slice(0, 6);
  var extraSet = {};
  extrasClean.forEach(function (ec) { extraSet[ec] = 1; });
  var re = function (a, p) {
    return (a || []).map(function (x) {
      var o = Object.assign({}, x, { id: kid(p) });
      if (o.c && !extraSet[o.c]) delete o.c;
      return o;
    });
  };
  var prof = {
    id: id, name: nm, saldo: 0, link: false,
    start: d.start, end: d.end, budget: 0,
    cur: cu, rate: cu ? rt : 0,
    dt: d.dt, tx: [],
    it: re(d.it, 'i'), bk: re(d.bk, 'b'), lk: re(d.lk, 'l'),
    ck: [], note: '', goal: null,
  };
  if (extrasClean.length) {
    prof.fxs = extrasClean.map(function (ec) { return { c: ec, r: 0 }; });
  }
  return { id: id, profile: prof };
}
/** Bentuk workbook template Excel standar (dipakai desktop writeFile & APK rkDownloadBlob). */
function xlBuildTemplateWb(X) {
  var wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([
    ['Tanggal', 'Jam', 'Kegiatan', 'Kategori', 'Biaya', 'Mata uang', 'Pembayaran', 'Tautan', 'Catatan'],
    ['', '', 'DAY 1 Jakarta - Tokyo', '', '', '', '', '', 'Baris "DAY n judul" menjadi judul hari'],
    ['2026-01-27', '07.30-09.00', 'Sarapan di konbini', 'Makan', 500, 'JPY', 'Kartu IC', '', ''],
    ['', '10.00-12.00', 'Tokyo Tower', 'Tiket & Tour', 1200, 'JPY', 'Cash', 'https://maps.app.goo.gl/contoh', 'Tanggal kosong = ikut baris di atasnya'],
  ]), 'Itinerary');
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([
    ['Nama', 'Kategori', 'Jumlah', 'Mata uang', 'Pembayaran', 'Lunas', 'Tautan', 'Catatan'],
    ['Tiket pesawat PP', 'Transport', 6500000, 'IDR', 'Online', 'Ya', '', ''],
    ['Hotel 4 malam', 'Penginapan', 1800000, 'IDR', 'Online', 'Belum', '', ''],
  ]), 'Pemesanan');
  return wb;
}
function xlPick(e) {
  var f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  loadXlsx().then(function (X) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = xlParse(X.read(fr.result, { type: 'array', cellDates: true }));
        if (d.error) return toast(d.error);
        if (!d.it.length && !d.bk.length) return toast('Format tidak dikenali. Unduh Template Excel lalu isi sesuai kolomnya.');
        xlData = d;
        $('xls').textContent = xlSummaryText(d);
        $('xln').value = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, 30);
        $('xlu').value = d.cur || (d.fx ? 'JPY' : '');
        $('xlk').value = '';
        $('xle').textContent = '';
        $('xlm').hidden = false;
      } catch (x) {
        toast('File tidak bisa dibaca. Coba simpan ulang sebagai .xlsx.');
      }
    };
    fr.readAsArrayBuffer(f);
  }).catch(function (x) { toast(x.message); });
}
/** Catatan status offline/sinkron saat impor Excel (B4). */
function tripImportOfflineNote() {
  var isOff = typeof navigator !== 'undefined' && navigator.onLine === false;
  var syncErr = (typeof syncBlocked !== 'undefined' && syncBlocked) || (typeof window !== 'undefined' && window._rkLastPullOk === false);
  return (isOff || syncErr) ? ' Tersimpan di perangkat. Akan disinkronkan saat online.' : '';
}

function xlCommit() {
  var d = xlData, v = xlValidateMeta(d, $('xln').value, $('xlu').value, $('xlk').value);
  if (!d) return;
  if (v.error) { $('xle').textContent = v.error; return; }
  var built = xlBuildProfile(d, v.name, v.cur, v.rate);
  ALL.kas.pr[built.id] = built.profile;
  xlData = null;
  $('xlm').hidden = true;
  save();
  setMode('trip');
  setTrip(built.id);
  toast('Perjalanan diimpor: ' + d.it.length + ' kegiatan, ' + d.bk.length + ' pemesanan.' + tripImportOfflineNote());
}
/** Unduh template Excel yang bisa langsung diisi lalu diimpor. */
function xlTemplate() {
  loadXlsx().then(function (X) {
    X.writeFile(xlBuildTemplateWb(X), 'template-itinerary.xlsx');
    toast('Template Excel diunduh');
  }).catch(function (x) { toast(x.message); });
}

/* ===== Pembuat data PDF Itinerary bersama (Desktop & APK, B3) ===== */
function tripHasNonWinAnsi(s) {
  var arr = Array.from(String(s == null ? '' : s));
  for (var i = 0; i < arr.length; i++) {
    var ch = arr[i], c = ch.charCodeAt(0);
    if (c < 32 || (c >= 32 && c < 127) || (c >= 160 && c < 256)) continue;
    if (typeof REP_HI !== 'undefined' && REP_HI.indexOf(ch) >= 0) continue;
    return true;
  }
  return false;
}

function tripPdfHasNonWinAnsi(P) {
  if (!P) return false;
  if (tripHasNonWinAnsi(P.name)) return true;
  var dks = Object.keys(P.dt || {});
  for (var i = 0; i < dks.length; i++) if (tripHasNonWinAnsi(P.dt[dks[i]])) return true;
  if ((P.it || []).some(function (x) { return tripHasNonWinAnsi(x.place) || tripHasNonWinAnsi(x.link) || tripHasNonWinAnsi(x.note); })) return true;
  if ((P.bk || []).some(function (x) { return tripHasNonWinAnsi(x.title); })) return true;
  if ((P.lk || []).some(function (x) { return tripHasNonWinAnsi(x.title) || tripHasNonWinAnsi(x.url); })) return true;
  return false;
}

function tripWrapPdfText(str, maxW, bold) {
  var s = String(str == null ? '' : str).trim();
  if (!s) return [''];
  var measure = function (txt) {
    var enc = typeof repEnc === 'function' ? repEnc(txt) : txt;
    return typeof repWidth === 'function' ? repWidth(enc, !!bold, 9) : enc.length * 5;
  };
  var lines = [];
  s.split(/\r?\n/).forEach(function (para) {
    var words = para.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    var cur = '';
    words.forEach(function (w) {
      var cand = cur ? cur + ' ' + w : w;
      if (measure(cand) <= maxW) {
        cur = cand;
      } else {
        if (cur) { lines.push(cur); cur = ''; }
        if (measure(w) <= maxW) {
          cur = w;
        } else {
          var chars = Array.from(w), chunk = '';
          chars.forEach(function (ch) {
            if (measure(chunk + ch) <= maxW) chunk += ch;
            else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          });
          cur = chunk;
        }
      }
    });
    if (cur) lines.push(cur);
  });
  return lines.length ? lines : [''];
}

function tripSafePdfFilename(name) {
  var slug = String(name || 'perjalanan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'perjalanan';
  return 'itinerary-' + slug + '.pdf';
}

function tripPdfData(P, cost) {
  var W = 595.28, M = 38, innerW = W - 2 * M,
    pl = typeof tripPlan === 'function' ? tripPlan(P) : { b: 0, d: 0, t: 0, paid: 0 },
    amtFn = typeof amtPlain === 'function' ? amtPlain : function (tr0, v, fx) { return fx && tr0.cur ? tr0.cur + ' ' + Math.round(v).toLocaleString('id-ID') : rp(v); },
    tmFn = typeof tmShow === 'function' ? tmShow : function (v) { return v ? String(v).replace(':', '.') : ''; },
    dayFn = typeof dayLabel === 'function' ? dayLabel : function (tr0, d) { return fmtD(d); },
    sortFn = typeof byTime === 'function' ? byTime : function (a, b) { return (a.time || '').localeCompare(b.time || ''); },
    colsIt = cost ? [{ t: 'JAM', w: 18 }, { t: 'KEGIATAN', w: 60 }, { t: 'BIAYA', w: 22, align: 'r' }] : [{ t: 'JAM', w: 20 }, { t: 'KEGIATAN', w: 80 }],
    itMaxW = ((cost ? 60 : 80) * innerW) / 100 - 8,
    tables = [];

  (typeof tripDays === 'function' ? tripDays(P) : []).forEach(function (d) {
    var its = (P.it || []).filter(function (x) { return x.day === d; }).sort(sortFn),
      dayTitle = (P.dt && P.dt[d]) || '';
    if (!its.length && !dayTitle) return;
    var rows = [];
    its.forEach(function (x) {
      var jam = tmFn(x.time) + (x.time2 ? '–' + tmFn(x.time2) : ''),
        biaya = cost && x.est ? amtFn(P, x) : '',
        safeLnk = x.link && typeof safeHref === 'function' ? safeHref(x.link) : '',
        cells = tripWrapPdfText(x.place || '-', itMaxW, false);
      if (x.link) {
        tripWrapPdfText(x.link, itMaxW, false).forEach(function (ln) {
          cells.push(safeLnk ? { t: ln, href: safeLnk } : ln);
        });
      }
      if (x.note) cells = cells.concat(tripWrapPdfText(x.note, itMaxW, false));
      cells.forEach(function (cellVal, idx) {
        rows.push(cost ? [idx === 0 ? jam : '', cellVal, idx === 0 ? biaya : ''] : [idx === 0 ? jam : '', cellVal]);
      });
    });
    if (!rows.length) rows.push(cost ? ['', '(Belum ada kegiatan)', ''] : ['', '(Belum ada kegiatan)']);
    tables.push({ head: dayFn(P, d) + (dayTitle ? ' — ' + dayTitle : ''), cols: colsIt, rows: rows });
  });

  if (P.bk && P.bk.length) {
    var colsBk = cost ? [{ t: 'PEMESANAN', w: 58 }, { t: 'STATUS', w: 18 }, { t: 'BIAYA', w: 24, align: 'r' }] : [{ t: 'PEMESANAN', w: 78 }, { t: 'STATUS', w: 22 }],
      bkMaxW = ((cost ? 58 : 78) * innerW) / 100 - 8,
      bkRows = [];
    P.bk.forEach(function (x) {
      var tLines = tripWrapPdfText(x.title || '-', bkMaxW, false),
        stTxt = x.paid ? 'Lunas' : 'Belum',
        bTxt = cost ? amtFn(P, x) : '';
      tLines.forEach(function (ln, idx) {
        bkRows.push(cost ? [ln, idx === 0 ? stTxt : '', idx === 0 ? bTxt : ''] : [ln, idx === 0 ? stTxt : '']);
      });
    });
    tables.push({ head: 'Pemesanan', cols: colsBk, rows: bkRows });
  }

  if (P.lk && P.lk.length) {
    var lkTitleW = (35 * innerW) / 100 - 8,
      lkUrlW = (65 * innerW) / 100 - 8,
      lkRows = [];
    P.lk.forEach(function (l) {
      var tLines = tripWrapPdfText(l.title || '-', lkTitleW, false),
        uLines = tripWrapPdfText(l.url || '', lkUrlW, false),
        safeLk = l.url && typeof safeHref === 'function' ? safeHref(l.url) : '',
        cnt = Math.max(tLines.length, uLines.length);
      for (var k = 0; k < cnt; k++) {
        var uTxt = uLines[k] || '';
        lkRows.push([tLines[k] || '', (uTxt && safeLk) ? { t: uTxt, href: safeLk } : uTxt]);
      }
    });
    tables.push({ head: 'Tautan penting', cols: [{ t: 'JUDUL', w: 35 }, { t: 'TAUTAN', w: 65 }], rows: lkRows });
  }

  var nDays = P.start && P.end && P.end >= P.start ? dayNo(P.end, P.start) + 1 : 0,
    subParts = [];
  if (P.start && P.end) subParts.push(fmtD(P.start) + ' – ' + fmtD(P.end) + ' · ' + nDays + ' hari');
  else subParts.push('Itinerary Perjalanan');
  if (cost && P.cur && P.rate) subParts.push('Kurs 1 ' + P.cur + ' = ' + rp(P.rate));
  var summary = [['Kegiatan', String((P.it || []).length) + ' jadwal'], ['Pemesanan', String((P.bk || []).length) + ' item']];
  if (cost) {
    summary = summary.concat([['Total Rencana Biaya', rp(pl.t)], ['Sudah Dibayar', rp(pl.paid)]]);
    var spPdf = tripFxSplit(P);
    if (spPdf.hasFx) {
      if (!tripMultiCurOn(P) && spPdf.by.length <= 1) {
        if (!spPdf.noRate) {
          summary = summary.concat([
            ['Rupiah', rp(spPdf.idr)],
            ['Mata uang asing', rp(spPdf.fxIdr) + ' (' + fxs(P, spPdf.fxAmt) + ')'],
          ]);
        }
      } else {
        summary.push(['Rupiah', rp(spPdf.idr)]);
        spPdf.by.forEach(function (b) {
          summary.push([
            'Mata uang asing ' + b.c,
            b.noRate ? (fxs(P, b.amt, b.c) + ' (kurs belum diatur)') : (rp(b.idr) + ' (' + fxs(P, b.amt, b.c) + ')'),
          ]);
        });
      }
    }
    if (typeof tripVsPlan === 'function') {
      var vpPdf = tripVsPlan(P);
      if (vpPdf.n > 0) {
        var diffPdfR = Math.round(vpPdf.diff);
        var diffPdfTxt = diffPdfR === 0
          ? 'Sama (Rp 0)'
          : ((diffPdfR > 0 ? 'Lebih mahal +' : 'Lebih hemat -') + rp(Math.abs(diffPdfR)));
        summary.push(['Rencana vs Realita (' + vpPdf.n + '/' + vpPdf.m + ' item)', 'Estimasi ' + rp(Math.round(vpPdf.estSum))]);
        summary.push(['Harga aktual tercatat', rp(Math.round(vpPdf.actSum))]);
        summary.push(['Selisih harga aktual', diffPdfTxt]);
        if (vpPdf.hasFx) {
          summary.push(['Efek harga / Efek kurs', 'Efek harga ' + tripSignedRp(vpPdf.efekHarga) + ' / Efek kurs ' + tripSignedRp(vpPdf.efekKurs)]);
        }
        summary.push(['Perkiraan total akhir', rp(Math.round(vpPdf.forecast))]);
        if (vpPdf.overBudget) {
          summary.push(['Peringatan Anggaran', 'Melebihi anggaran (' + rp(Math.round(vpPdf.overBudgetDiff)) + ')']);
        }
      }
    }
  }
  return { filename: tripSafePdfFilename(P.name), title: P.name || 'Itinerary Perjalanan', subtitle: subParts.join(' · '), summary: summary, tables: tables };
}

/* ===== Bagikan itinerary ===== */
function amtPlain(P, v, fx, curOpt) {
  if (v && typeof v === 'object') {
    var num = +(v.amt != null ? v.amt : v.est) || 0;
    var cObj = v.fx ? tripItemCur(P, v) : '';
    return cObj ? cObj + ' ' + Math.round(num).toLocaleString('id-ID') : rp(num);
  }
  var c = curOpt || ((P && P.cur) || '');
  return fx && c ? c + ' ' + Math.round(v).toLocaleString('id-ID') : rp(v);
}
/** Teks itinerary siap kirim (format tebal ala WhatsApp). */
function tripText(P, cost) {
  var L = ['*' + P.name + '*'];
  if (P.start && P.end) L.push(fmtD(P.start) + ' – ' + fmtD(P.end) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari');
  L.push('');
  tripDays(P).forEach(function (d) {
    var its = (P.it || []).filter(function (x) { return x.day === d; }).sort(byTime);
    var dtTitle = P.dt && P.dt[d];
    if (!its.length && !dtTitle) return;
    L.push('*' + dayLabel(P, d) + '*' + (dtTitle ? ' — ' + dtTitle : ''));
    its.forEach(function (x) {
      L.push('• ' + (x.time ? tmShow(x.time) + (x.time2 ? '–' + tmShow(x.time2) : '') + ' ' : '') + x.place + (cost && x.est ? ' (' + amtPlain(P, x) + ')' : '') + (x.link ? '\n   ' + x.link : '') + (x.note ? '\n   ' + x.note : ''));
    });
    L.push('');
  });
  if (P.bk && P.bk.length) {
    L.push('*Pemesanan*');
    P.bk.forEach(function (b) { L.push('• ' + b.title + (cost ? ' (' + amtPlain(P, b) + ')' : '') + (b.paid ? ' ✓' : '')); });
    L.push('');
  }
  if (cost) {
    var spTxt = tripFxSplit(P);
    if (spTxt.hasFx) {
      var plTxt = tripPlan(P);
      if (!tripMultiCurOn(P) && spTxt.by.length <= 1) {
        if (!spTxt.noRate) {
          L.push('*Rencana Biaya*');
          L.push('• Total: ' + rp(plTxt.t));
          L.push('• Rupiah: ' + rp(spTxt.idr));
          L.push('• Asing: ' + rp(spTxt.fxIdr) + ' (≈ ' + fxs(P, spTxt.fxAmt) + ')');
          L.push('');
        }
      } else {
        L.push('*Rencana Biaya*');
        L.push('• Total: ' + rp(plTxt.t));
        L.push('• Rupiah: ' + rp(spTxt.idr));
        spTxt.by.forEach(function (b) {
          L.push(
            '• Asing ' + b.c + ': ' +
            (b.noRate ? (fxs(P, b.amt, b.c) + ' (Kurs ' + b.c + ' belum diatur)') : (rp(b.idr) + ' (≈ ' + fxs(P, b.amt, b.c) + ')'))
          );
        });
        L.push('');
      }
    }
    if (typeof tripVsPlan === 'function') {
      var vpTxt = tripVsPlan(P);
      if (vpTxt.n > 0) {
        var diffTxtR = Math.round(vpTxt.diff);
        var diffTxtLbl = diffTxtR === 0
          ? 'Sama (Rp 0)'
          : ((diffTxtR > 0 ? 'Lebih mahal +' : 'Lebih hemat -') + rp(Math.abs(diffTxtR)));
        L.push('*Rencana vs Realita*');
        L.push('• Estimasi (' + vpTxt.n + '/' + vpTxt.m + ' item): ' + rp(Math.round(vpTxt.estSum)));
        L.push('• Harga aktual: ' + rp(Math.round(vpTxt.actSum)));
        L.push('• Selisih: ' + diffTxtLbl);
        if (vpTxt.hasFx) {
          L.push('• Efek harga: ' + tripSignedRp(vpTxt.efekHarga) + ' · Efek kurs: ' + tripSignedRp(vpTxt.efekKurs));
        }
        L.push('• Perkiraan total akhir: ' + rp(Math.round(vpTxt.forecast)));
        L.push('');
      }
    }
  }
  if (P.lk && P.lk.length) {
    L.push('*Tautan penting*');
    P.lk.forEach(function (l) { L.push('• ' + l.title + '\n   ' + l.url); });
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
/** Dokumen HTML siap cetak (untuk disimpan sebagai PDF). */
function tripPrintHtml(P, cost) {
  var css = 'body{font:13px/1.45 system-ui,sans-serif;color:#111;margin:24px}h1{margin:0 0 2px;font-size:22px}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #1f6f5c;padding-bottom:3px}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #ddd;vertical-align:top}td.t{white-space:nowrap;width:96px;font-weight:600}td.c{text-align:right;white-space:nowrap}small{color:#555}a{color:#1f6f5c;word-break:break-all}@media print{h2{break-after:avoid}tr{break-inside:avoid}}',
    b = '<h1>' + esc(P.name) + '</h1>' + (P.start && P.end ? '<small>' + esc(fmtD(P.start) + ' – ' + fmtD(P.end)) + ' · ' + (dayNo(P.end, P.start) + 1) + ' hari</small>' : '');
  tripDays(P).forEach(function (d) {
    var its = P.it.filter(function (x) { return x.day === d; }).sort(byTime);
    if (!its.length && !P.dt[d]) return;
    b += '<h2>' + esc(dayLabel(P, d)) + (P.dt[d] ? ' — ' + esc(P.dt[d]) : '') + '</h2><table>' + its.map(function (x) {
      var sl = x.link && typeof safeHref === 'function' ? safeHref(x.link) : '';
      return '<tr><td class="t">' + esc(tmShow(x.time) + (x.time2 ? '–' + tmShow(x.time2) : '')) + '</td><td>' + esc(x.place) + (sl ? '<br><a href="' + esc(sl) + '">' + esc(x.link) + '</a>' : (x.link ? '<br><small>' + esc(x.link) + '</small>' : '')) + (x.note ? '<br><small>' + esc(x.note) + '</small>' : '') + '</td>' + (cost ? '<td class="c">' + (x.est ? esc(amtPlain(P, x)) : '') + '</td>' : '') + '</tr>';
    }).join('') + '</table>';
  });
  if (P.bk.length) b += '<h2>Pemesanan</h2><table>' + P.bk.map(function (x) { return '<tr><td>' + esc(x.title) + (x.paid ? ' <small>(lunas)</small>' : '') + '</td>' + (cost ? '<td class="c">' + esc(amtPlain(P, x)) + '</td>' : '') + '</tr>'; }).join('') + '</table>';
  if (P.lk.length) b += '<h2>Tautan penting</h2>' + P.lk.map(function (l) { var lu = typeof safeHref === 'function' ? safeHref(l.url) : ''; return '<div>' + esc(l.title) + ': ' + (lu ? '<a href="' + esc(lu) + '">' + esc(l.url) + '</a>' : esc(l.url)) + '</div>'; }).join('');
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(P.name) + '</title><style>' + css + '</style></head><body>' + b + '</body></html>';
}
function printHtml(h) {
  var f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  var d = f.contentWindow.document;
  d.open();
  d.write(h);
  d.close();
  setTimeout(function () {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {}
    setTimeout(function () { f.remove(); }, 3000);
  }, 300);
}
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
  return new Promise(function (ok) {
    var a = document.createElement('textarea');
    a.value = t;
    document.body.appendChild(a);
    a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove();
    ok();
  });
}
function bindXl() {
  $('xlf').onchange = xlPick;
  $('xlok').onclick = xlCommit;
  $('xlc').onclick = function () { $('xlm').hidden = true; };
  $('shx').onclick = function () { $('shm').hidden = true; };
  $('shm').onclick = function (e) {
    var b = e.target.closest('[data-sh]'), P = tp();
    if (!b || !P) return;
    var cost = $('shc').checked, kind = b.dataset.sh;
    if (kind === 'pdf') {
      try {
        if (typeof repPdf === 'function' && typeof rkDownloadBlob === 'function') {
          var repObj = tripPdfData(P, cost);
          var pdfBytes = repPdf(repObj);
          rkDownloadBlob(repObj.filename, pdfBytes, 'application/pdf');
          return;
        }
      } catch (pdfErr) {}
      return printHtml(tripPrintHtml(P, cost));
    }
    var t = tripText(P, cost);
    if (kind === 'wa' && navigator.share) navigator.share({ title: P.name, text: t }).catch(function () {});
    else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    else copyText(t).then(function () { $('shs').textContent = 'Teks disalin. Tinggal tempel di WhatsApp atau catatan.'; });
  };
}

function rkIsIosDevice() {
  try {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    return /iphone|ipad|ipod/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch (e) { return false; }
}

function rkIsStandalonePwa() {
  try {
    return (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) || !!(typeof navigator !== 'undefined' && navigator.standalone === true);
  } catch (e) { return false; }
}

function rkIsIosNeedsA2HS() {
  return rkIsIosDevice() && !rkIsStandalonePwa() && (typeof Notification === 'undefined' || !('Notification' in window) || !Notification);
}

function rkIsNotifReset() {
  try {
    if (typeof window !== 'undefined' && window.__rkNotifReset != null) return !!window.__rkNotifReset;
    if (typeof localStorage !== 'undefined') return localStorage.getItem('rk-notif-reset') === '1';
  } catch (e) {}
  return false;
}

function rkSetNotifReset(reset) {
  var val = !!reset;
  try {
    if (typeof window !== 'undefined') window.__rkNotifReset = val;
    if (typeof localStorage !== 'undefined') {
      if (val) localStorage.setItem('rk-notif-reset', '1');
      else localStorage.removeItem('rk-notif-reset');
      if (val) {
        localStorage.removeItem('rk_last_bill_notif_sig');
        localStorage.removeItem('rk_last_bill_notif_sig_browser');
        localStorage.removeItem('rk_last_bill_notif_sig_mobile-app');
        localStorage.removeItem('last_bill_notif_date');
      }
    }
    if (typeof window !== 'undefined' && val) {
      window.__rkLastNotifSig = '';
      window.__rkLastNotifSig_browser = '';
      window.__rkLastNotifSig_mobile_app = '';
      window['__rkLastNotifSig_mobile-app'] = '';
    }
  } catch (e) {}
  if (typeof MOB_STATE !== 'undefined' && MOB_STATE) {
    MOB_STATE.notifEnabled = !val;
  }
  if (val && typeof document !== 'undefined') {
    var osBanner = $('m-os-notif');
    if (osBanner) osBanner.classList.remove('show');
    if (typeof rkNotify !== 'undefined' && rkNotify.isNative()) {
      rkNotify.syncBillSchedules([], false);
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg && reg.getNotifications) {
          return reg.getNotifications().then(function (list) {
            list.forEach(function (n) { try { n.close(); } catch (e) {} });
          });
        }
      }).catch(function () {});
    }
  }
}

/* Adaptor notifikasi tunggal: native Capacitor LocalNotifications vs Web Notification API. */
var rkNotify = (function () {
  var CHANNEL_ID = 'rk-bill-reminders';
  var SCHED_BASE = 500000;
  var SCHED_SPAN = 400000;
  var nativePerm = 'default';
  var chanReady = false;
  var syncInFlight = null;

  function plugin() {
    if (typeof window === 'undefined' || !window.Capacitor) return null;
    if (typeof window.Capacitor.isNativePlatform === 'function' && !window.Capacitor.isNativePlatform()) return null;
    return (window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  }
  function isNative() { return !!plugin(); }
  function isSupported() {
    if (isNative()) return true;
    return typeof Notification !== 'undefined' && 'Notification' in window && !!Notification;
  }
  function mapNativePerm(res) {
    var d = res && res.display;
    if (d === 'granted') return 'granted';
    if (d === 'denied') return 'denied';
    return 'default';
  }
  function getPermission() {
    if (isNative()) return nativePerm;
    return (typeof Notification !== 'undefined' && 'Notification' in window && Notification) ? Notification.permission : 'unsupported';
  }
  function refreshPermission() {
    var ln = plugin();
    if (!ln || typeof ln.checkPermissions !== 'function') return Promise.resolve(getPermission());
    return Promise.resolve(ln.checkPermissions()).then(function (res) {
      var prev = nativePerm;
      nativePerm = mapNativePerm(res);
      if (nativePerm !== prev) {
        if (typeof syncNotifBtn === 'function') syncNotifBtn();
        if (typeof renderMobSettings === 'function') renderMobSettings();
        if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
      }
      return nativePerm;
    }).catch(function () { return nativePerm; });
  }
  function ensureChannel() {
    var ln = plugin();
    if (!ln || chanReady || typeof ln.createChannel !== 'function') return Promise.resolve();
    chanReady = true;
    return Promise.resolve(ln.createChannel({
      id: CHANNEL_ID,
      name: 'Pengingat Tagihan',
      description: 'Pengingat jatuh tempo tagihan RenKeu',
      importance: 4,
      visibility: 1,
    })).catch(function () {});
  }
  function requestPermission() {
    var ln = plugin();
    if (ln) {
      return ensureChannel().then(function () {
        if (typeof ln.requestPermissions !== 'function') return nativePerm;
        return Promise.resolve(ln.requestPermissions()).then(function (res) {
          nativePerm = mapNativePerm(res);
          return nativePerm;
        });
      }).catch(function () { return nativePerm; });
    }
    if (!isSupported()) return Promise.resolve('unsupported');
    return new Promise(function (resolve) {
      var done = false;
      var fin = function (p) { if (done) return; done = true; resolve(p); };
      try {
        var req = Notification.requestPermission(fin);
        if (req && typeof req.then === 'function') req.then(fin, function () { fin('denied'); });
      } catch (e) { fin('denied'); }
    });
  }
  function hashId(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) | 0;
    return SCHED_BASE + (Math.abs(h) % SCHED_SPAN);
  }
  function show(title, body, tag) {
    var ln = plugin();
    if (ln) {
      var id = hashId(String(tag || ('now|' + title)) + '|now') % 499999 || 101;
      return ensureChannel().then(function () {
        return ln.schedule({
          notifications: [{
            id: id,
            title: title,
            body: body,
            channelId: CHANNEL_ID,
            smallIcon: 'ic_stat_renkeu',
            iconColor: '#0E3F86',
            schedule: { at: new Date(Date.now() + 200) },
          }],
        });
      }).catch(function () {});
    }
    var opt = {
      body: body,
      tag: tag || 'bill-due-' + Date.now(),
      icon: './icon-192.png',
      badge: './icon-192.png',
      renotify: true,
      requireInteraction: true,
      vibrate: [180, 80, 180],
      timestamp: Date.now(),
      data: { url: './?mode=app' },
    };
    var minOpt = { body: body, tag: opt.tag, icon: './icon-192.png', data: opt.data };
    var fallbackNew = function () {
      try { new Notification(title, opt); } catch (e1) {
        try { new Notification(title, minOpt); } catch (e2) {}
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      return navigator.serviceWorker.ready.then(function (reg) {
        if (reg && reg.showNotification) {
          return reg.showNotification(title, opt).catch(function () {
            return reg.showNotification(title, minOpt);
          });
        }
        fallbackNew();
      }).catch(fallbackNew);
    }
    fallbackNew();
    return Promise.resolve();
  }
  function dueTriggerDate(iso, diffDays) {
    var now = new Date();
    if (diffDays > 0) {
      var pts = String(iso || '').split('-');
      if (pts.length === 3) {
        var dt = new Date(+pts[0], +pts[1] - 1, +pts[2], 8, 0, 0, 0);
        if (dt.getTime() > now.getTime() + 5000) return dt;
      }
    }
    if (diffDays === 0) {
      var todayAt8 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
      if (todayAt8.getTime() > now.getTime() + 5000) return todayAt8;
      return new Date(now.getTime() + 8000);
    }
    // Tagihan terlewat belum dibayar: jadwalkan pengingat berikutnya pukul 08:00 esok hari
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0, 0);
  }
  function syncBillSchedules(dueList, enabled) {
    var ln = plugin();
    if (!ln || typeof ln.schedule !== 'function') return Promise.resolve();
    var desired = [];
    var desiredIds = Object.create(null);
    if (enabled && nativePerm === 'granted' && !(typeof rkIsNotifReset === 'function' && rkIsNotifReset())) {
      (dueList || []).slice(0, 24).forEach(function (x) {
        if (!x || !x.it) return;
        var iso = x.iso || x.d || (typeof isoD === 'function' && x.t ? isoD(x.t) : '');
        if (!iso) return;
        var id = hashId(String(x.it.id) + '|' + iso);
        if (desiredIds[id]) return;
        desiredIds[id] = true;
        var diff = typeof x.diff === 'number' ? x.diff : 0;
        var timing = diff < 0 ? ('Terlewat ' + Math.abs(diff) + ' hari') : (diff === 0 ? 'Jatuh tempo hari ini' : (diff + ' hari lagi'));
        desired.push({
          id: id,
          title: 'Pengingat: ' + x.it.name,
          body: (typeof rp === 'function' ? rp(x.price) : String(x.price)) + ' · ' + timing,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_renkeu',
          iconColor: '#0E3F86',
          schedule: { at: dueTriggerDate(iso, diff) },
        });
      });
    }
    var doSync = function () {
      return ensureChannel().then(function () {
        return typeof ln.getPending === 'function' ? Promise.resolve(ln.getPending()) : Promise.resolve({ notifications: [] });
      }).then(function (pendingRes) {
        var pend = (pendingRes && pendingRes.notifications) || [];
        var existingIds = Object.create(null);
        var toCancel = [];
        pend.forEach(function (item) {
          var pid = Number(item && item.id);
          if (pid >= SCHED_BASE && pid < SCHED_BASE + SCHED_SPAN) {
            if (!desiredIds[pid]) toCancel.push({ id: pid });
            else existingIds[pid] = true;
          }
        });
        var pCancel = (toCancel.length && typeof ln.cancel === 'function')
          ? Promise.resolve(ln.cancel({ notifications: toCancel }))
          : Promise.resolve();
        return pCancel.then(function () {
          var toAdd = desired.filter(function (n) { return !existingIds[n.id]; });
          if (!toAdd.length) return;
          return ln.schedule({ notifications: toAdd });
        });
      }).catch(function () {});
    };
    var run = (syncInFlight || Promise.resolve()).then(doSync, doSync);
    syncInFlight = run;
    return run;
  }
  return {
    isNative: isNative,
    isSupported: isSupported,
    getPermission: getPermission,
    refreshPermission: refreshPermission,
    requestPermission: requestPermission,
    show: show,
    syncBillSchedules: syncBillSchedules,
    hashId: hashId,
  };
})();
if (typeof window !== 'undefined') window.rkNotify = rkNotify;

function rkCanOsNotif() {
  return rkNotify.isSupported() && rkNotify.getPermission() === 'granted' && !rkIsNotifReset();
}

/** Kirim notifikasi sistem baik via Capacitor LocalNotifications (native APK) maupun ServiceWorker/Notification API (browser/PWA). */
function triggerSystemNotification(title, body, tag) {
  if (!rkCanOsNotif()) return;
  rkNotify.show(title, body, tag);
}

/** Pengingat tagihan jatuh tempo lokal (Notification API + fallback bar/toast dalam aplikasi). */
function checkDueNotifications(force) {
  if (!ALL || !ALL.data) return;
  var hz = typeof remHz === 'number' && remHz > 0 ? remHz : 3;
  var rem = reminders(hz);
  var today = rem.today;
  var todayMs = Date.parse(today + 'T00:00:00Z');
  var dueList = [];

  (rem.late || []).forEach(function (row) {
    var diffDays = Math.round((row.t - todayMs) / 864e5);
    dueList.push({ it: row.it, d: row.iso, diff: diffDays, price: row.price, late: true });
  });
  (rem.soon || []).forEach(function (row) {
    var diffDays = Math.round((row.t - todayMs) / 864e5);
    dueList.push({ it: row.it, d: row.iso, diff: diffDays, price: row.price, late: false });
  });

  if (rkNotify.isNative()) {
    var schedItems = typeof getMobDueList === 'function' ? getMobDueList() : dueList;
    var schedEnabled = rkCanOsNotif() && (typeof MOB_STATE === 'undefined' || !MOB_STATE || MOB_STATE.notifEnabled !== false);
    rkNotify.syncBillSchedules(schedItems, schedEnabled);
  }

  if (!dueList.length) {
    if (force && rkCanOsNotif()) {
      triggerSystemNotification(
        'Pengingat Tagihan Aktif',
        'Tidak ada tagihan jatuh tempo dalam ' + hz + ' hari ke depan.',
        'bill-check-ok'
      );
    }
    return;
  }

  if (rkIsNotifReset() && !force) return;
  var shellKind = typeof getShellMode === 'function' ? getShellMode() : 'browser';
  if (shellKind === 'mobile-app' && typeof MOB_STATE !== 'undefined' && MOB_STATE && MOB_STATE.notifEnabled === false && !force) {
    return;
  }

  var sigKey = 'rk_last_bill_notif_sig_' + shellKind;
  var sig = today + '|' + dueList.map(function (x) { return x.it.id + ':' + x.d; }).join(',');
  if (!force) {
    try {
      var prevSig = (typeof localStorage !== 'undefined' && (localStorage.getItem(sigKey) || localStorage.getItem('rk_last_bill_notif_sig'))) || (typeof window !== 'undefined' && window['__rkLastNotifSig_' + shellKind]);
      if (prevSig === sig) return;
    } catch (e) {}
  }

  var titles = [];
  dueList.slice(0, 3).forEach(function (item) {
    var timing = item.diff < 0 ? 'TERLEWAT (' + Math.abs(item.diff) + ' hari)' : (item.diff === 0 ? 'HARI INI' : item.diff + ' hari lagi');
    titles.push(item.it.name + ' (' + rp(item.price) + ' - ' + timing + ')');
  });
  var body = titles.join('\n');
  if (dueList.length > 3) body += '\n+' + (dueList.length - 3) + ' tagihan lainnya';

  var canOsNotif = rkCanOsNotif();
  if (canOsNotif) {
    triggerSystemNotification(
      'Pengingat Tagihan Jatuh Tempo (' + dueList.length + ')',
      body,
      'bill-due-' + today
    );
  }

  if (typeof getShellMode === 'function' && getShellMode() === 'mobile-app') {
    if (typeof triggerMobPhoneBarNotif === 'function') triggerMobPhoneBarNotif(false);
  } else if (!canOsNotif && !force && typeof toast === 'function') {
    var urgent = dueList.filter(function (x) { return x.diff <= 0; });
    if (urgent.length) {
      toast('Pengingat: ' + urgent[0].it.name + (urgent.length > 1 ? ' (+' + (urgent.length - 1) + ' lagi)' : '') + ' jatuh tempo ' + (urgent[0].diff === 0 ? 'hari ini' : 'terlewat'));
    }
  }

  try {
    if (typeof window !== 'undefined') window['__rkLastNotifSig_' + shellKind] = sig;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(sigKey, sig);
      localStorage.setItem('last_bill_notif_date', today);
    }
  } catch (e) {}
}

function requestNotifPermission() {
  rkSetNotifReset(false);
  if (rkNotify.isNative()) {
    rkNotify.requestPermission().then(function (perm) {
      if (typeof syncNotifBtn === 'function') syncNotifBtn();
      if (typeof renderMobSettings === 'function') renderMobSettings();
      if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
      if (perm === 'granted') {
        toast('Notifikasi aktif! Mengirim pengingat...');
        checkDueNotifications(true);
      } else {
        toast('Izin notifikasi tidak diberikan. Aktifkan di Pengaturan HP → Aplikasi → RenKeu → Notifikasi.');
      }
    });
    return;
  }
  if (rkIsIosNeedsA2HS()) {
    toast('Di iPhone/iPad (iOS 16.4+), ketuk Bagikan (Share) → "Tambah ke Layar Utama", lalu buka dari ikon aplikasi untuk mengaktifkan notifikasi OS.');
    if (typeof syncNotifBtn === 'function') syncNotifBtn();
    if (typeof renderMobSettings === 'function') renderMobSettings();
    if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
    return;
  }
  if (!rkNotify.isSupported()) {
    toast('Browser ini belum mendukung fitur Notifikasi Web.');
    if (typeof renderMobSettings === 'function') renderMobSettings();
    if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
    return;
  }
  if (rkNotify.getPermission() === 'granted') {
    toast('Notifikasi aktif! Memeriksa pengingat tagihan...');
    if (typeof syncNotifBtn === 'function') syncNotifBtn();
    checkDueNotifications(true);
    if (typeof renderMobSettings === 'function') renderMobSettings();
    if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
    return;
  }
  if (rkNotify.getPermission() === 'denied') {
    toast(
      rkIsIosDevice()
        ? 'Izin notifikasi iOS diblokir. Buka Pengaturan iOS → Pemberitahuan → pilih Rencana Keuangan lalu nyalakan Izinkan.'
        : 'Izin notifikasi diblokir di browser. Buka setelan browser untuk mengizinkan.'
    );
    if (typeof syncNotifBtn === 'function') syncNotifBtn();
    if (typeof renderMobSettings === 'function') renderMobSettings();
    if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
    return;
  }
  rkNotify.requestPermission().then(function (perm) {
    if (typeof syncNotifBtn === 'function') syncNotifBtn();
    if (typeof renderMobSettings === 'function') renderMobSettings();
    if (typeof renderMobNotifPopover === 'function') renderMobNotifPopover();
    if (perm === 'granted') {
      toast('Notifikasi aktif! Memeriksa tagihan...');
      checkDueNotifications(true);
    } else {
      toast('Izin notifikasi tidak diberikan.');
    }
  });
}

/** PWA: daftar service worker (hanya di https/http non-Capacitor), tombol "Pasang aplikasi", dan auto check tagihan. */
function bindPwa() {
  if (rkNotify.isNative()) rkNotify.refreshPermission();
  var inCap = typeof window !== 'undefined' && !!window.Capacitor && (typeof window.Capacitor.isNativePlatform !== 'function' || window.Capacitor.isNativePlatform());
  if (!inCap && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    (window.__rkSwReg || navigator.serviceWorker.register('./sw.js', { scope: './' })).then(function (reg) {
      if (reg && reg.update) reg.update();
    }).catch(function () {});
  }
  var ev = null,
    btn = $('pwa');
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    ev = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', function () {
    btn.hidden = true;
  });
  // Tetap tampil walau browser tak memberi prompt (iOS Safari / Firefox), agar ada petunjuk pasang.
  if ((typeof matchMedia === 'undefined' || !matchMedia('(display-mode: standalone)').matches) && !navigator.standalone) btn.hidden = false;
  btn.onclick = function () {
    if (ev) {
      ev.prompt();
      ev = null;
      btn.hidden = true;
      return;
    }
    toast(
      /iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 'Ketuk ikon Bagikan, lalu "Tambah ke Layar Utama".'
        : 'Buka menu browser, lalu pilih "Instal aplikasi" / "Tambahkan ke layar utama".'
    );
  };
  var notifBtn = $('btn-notif');
  if (notifBtn && !$('notif-popover')) {
    notifBtn.onclick = requestNotifPermission;
  }
  setInterval(function () {
    if (mode === 'trip' && tripTab === 'now' && !document.hidden && tp()) renderTrip();
  }, 60000);
  autoTrip();
  setTimeout(checkDueNotifications, 1200);
}
