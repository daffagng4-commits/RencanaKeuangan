/**
 * Tab Kelola Item: form tambah/ubah (termasuk kategori, batas berhenti), daftar item,
 * dan "Bawa jadwal tagihan dari tahun lain".
 */

var editId = null;

/** Isi daftar saran kategori. */
function renderCategoryOptions() {
  $('catlist').innerHTML = allCategories()
    .map(function (c) {
      return '<option value="' + esc(c) + '">';
    })
    .join('');
}

/** Bagian "Bawa jadwal tagihan dari tahun lain" (hanya muncul bila ada tahun lain berisi item). */
function carryHtml() {
  var years = Object.keys(ALL.data).filter(function (k) {
    return +k !== S.year && ALL.data[k].items.length;
  });
  if (!years.length) return '';
  var prev = years
    .map(Number)
    .filter(function (k) {
      return k < S.year;
    })
    .sort(function (a, b) {
      return a - b;
    })
    .pop();
  return (
    '<div class="h3" style="width:100%;margin:6px 0 0">Bawa jadwal tagihan dari tahun lain</div><select id="cy" style="width:auto">' +
    years
      .map(function (k) {
        return '<option' + (+k === prev ? ' selected' : '') + '>' + k + '</option>';
      })
      .join('') +
    '</select><button id="cyb">Bawa ke ' +
    S.year +
    '</button>' +
    '<label style="display:flex;gap:8px;align-items:center;margin:0;width:100%;font-weight:500"><input type="checkbox" id="cs" style="width:auto;min-height:0">Jadikan saldo akhir tahun itu sebagai saldo awal ' +
    S.year +
    '</label>' +
    '<div class="sub" style="width:100%">Item sekali bayar atau yang sudah selesai (lewat tanggal/jumlah berhenti) tidak ikut dibawa. Perubahan harga ikut terbawa. Status lunas tidak dibawa.</div>'
  );
}

/** Satu baris item di daftar Kelola Item. */
function itemRow(it, c) {
  var o = c.occs[it.id].filter(function (t) {
    return !S.skip[it.id + '|' + isoD(t)];
  });
  return (
    '<div class="it"><div><b>' +
    esc(it.name) +
    '</b>' +
    (it.cat ? ' <span class="chip">' + esc(it.cat) + '</span>' : '') +
    '<small>' +
    pdesc(it) +
    ' · ' +
    every(it) +
    '</small>' +
    chSub(it) +
    '</div>' +
    '<div class="cell"><small>Mulai</small>' +
    fd(Date.parse(it.start + 'T00:00:00Z')) +
    '</div>' +
    '<div class="cell"><small>Total ' +
    S.year +
    '</small><b>' +
    rp(sumP(it, o)) +
    '</b><small>' +
    o.length +
    '× bayar</small></div>' +
    '<div><button class="g" data-ed="' +
    it.id +
    '">Ubah</button><button class="g d" data-del="' +
    it.id +
    '">Hapus</button></div></div>'
  );
}

/** Render daftar item + bagian bawa-jadwal + saran kategori. */
function renderList() {
  var c = calc();
  $('ly').textContent = S.year;
  $('cprow').innerHTML = carryHtml();
  $('list').innerHTML =
    S.items
      .map(function (it) {
        return itemRow(it, c);
      })
      .join('') || '<div class="empty">Belum ada item. Isi formulir di atas untuk menambah.</div>';
  renderCategoryOptions();
}

/** Baca isian form menjadi objek item. */
function fItem() {
  var st = $('f-stop').value;
  return {
    name: $('f-name').value.trim(),
    price: parseRp($('f-price').value),
    n: Math.max(1, parseInt($('f-n').value, 10) || 1),
    unit: $('f-unit').value,
    start: $('f-start').value,
    end: st === 'date' ? $('f-end').value : '',
    cnt: st === 'cnt' ? Math.max(0, parseInt($('f-cnt').value, 10) || 0) : 0,
    cat: $('f-cat').value.trim().slice(0, 30),
  };
}

/** Pratinjau jadwal di bawah form. */
function preview() {
  var f = fItem(),
    p = $('prev');
  $('f-n').disabled = f.unit === 'sekali';
  if (!f.start) {
    p.textContent = 'Isi tanggal mulai untuk melihat jadwal pembayaran.';
    return;
  }
  var d = nextDates(f, f.unit === 'sekali' ? 1 : 5);
  var tail = f.unit === 'sekali' ? '' : d.length >= 5 && !(+f.cnt && +f.cnt <= 5) ? ' …' : '';
  p.textContent =
    'Jadwal bayar: ' +
    d
      .map(function (t) {
        return fd(t);
      })
      .join(' → ') +
    tail +
    (+f.cnt
      ? ' (total ' + f.cnt + ' kali, lalu berhenti)'
      : f.end
        ? ' (berhenti setelah ' + fd(Date.parse(f.end + 'T00:00:00Z')) + ')'
        : '');
}

/** Kosongkan form item. */
function resetForm() {
  editId = null;
  $('ft').textContent = 'Tambah item untuk tahun ' + S.year;
  $('f-name').value = '';
  $('f-price').value = '';
  $('f-n').value = 1;
  $('f-unit').value = 'bulan';
  $('f-start').value = S.year + '-01-01';
  $('f-stop').value = 'none';
  $('f-end').value = '';
  $('f-cnt').value = '';
  $('f-cat').value = '';
  stopUI();
  $('cancel').hidden = true;
  $('err').textContent = '';
  preview();
}

/** Tampilkan isian batas berhenti sesuai pilihan. */
function stopUI() {
  var v = $('f-stop').value;
  $('w-end').hidden = v !== 'date';
  $('w-cnt').hidden = v !== 'cnt';
}

/** Harga item + jumlah perubahan, untuk daftar. */
function pdesc(it) {
  var n = (it.ch || []).length;
  return rp(it.price) + (n ? ' (' + n + ' perubahan)' : '');
}

/** Pesan kesalahan validasi form, atau '' bila valid. */
function validateItem(f) {
  if (!f.name) return 'Nama item belum diisi.';
  if (f.price <= 0) return 'Harga belum valid. Contoh: 200k, 200rb, atau 200.000.';
  if (!ISO_RE.test(f.start)) return 'Tanggal mulai belum dipilih.';
  if ($('f-stop').value === 'date' && (!f.end || f.end < f.start))
    return 'Tanggal berhenti harus sama atau sesudah tanggal mulai.';
  if ($('f-stop').value === 'cnt' && f.cnt < 1) return 'Isi jumlah kali bayar (minimal 1).';
  return '';
}

/** Simpan item baru atau perubahan item; status lunas/lewati ikut pindah bila tanggal tagihan bergeser. */
function saveItem() {
  var f = fItem(),
    msg = validateItem(f);
  if (msg) {
    $('err').textContent = msg;
    return;
  }
  if (editId) {
    var old = item(editId),
      before = occ(old, S.year);
    var updated = Object.assign({ id: editId, ch: old.ch || [] }, f);
    S.items = S.items.map(function (x) {
      return x.id === editId ? updated : x;
    });
    remapStatus(editId, before, occ(updated, S.year), [S.paid, S.skip]);
  } else {
    S.items.push(Object.assign({ id: Date.now(), ch: [] }, f));
  }
  save();
  renderAll();
  resetForm();
  $('status').textContent += ' · item disimpan';
}

/** Isi form dengan item yang akan diubah. */
function editItem(it) {
  editId = it.id;
  $('ft').textContent = 'Ubah item';
  $('f-name').value = it.name;
  $('f-price').value = it.price.toLocaleString('id-ID');
  $('f-n').value = it.n;
  $('f-unit').value = it.unit;
  $('f-start').value = it.start;
  $('f-stop').value = it.cnt ? 'cnt' : it.end ? 'date' : 'none';
  $('f-end').value = it.end || '';
  $('f-cnt').value = it.cnt || '';
  $('f-cat').value = it.cat || '';
  stopUI();
  $('cancel').hidden = false;
  preview();
  $('f-name').scrollIntoView({ block: 'center' });
  $('f-name').focus();
}

/** Hapus item (tekan dua kali) beserta status lunas/lewatinya. Bisa diurungkan. */
function deleteItem(b) {
  if (!b.dataset.arm) {
    b.dataset.arm = 1;
    b.textContent = 'Yakin hapus?';
    setTimeout(function () {
      b.dataset.arm = '';
      b.textContent = 'Hapus';
    }, 2500);
    return;
  }
  var sn = snap('Sebelum menghapus item');
  S.items = S.items.filter(function (x) {
    return x.id != b.dataset.del;
  });
  [S.paid, S.skip].forEach(function (map) {
    Object.keys(map).forEach(function (k) {
      if (k.split('|')[0] == b.dataset.del) delete map[k];
    });
  });
  save();
  renderAll();
  toast('Item dihapus.', function () {
    restoreSnap(sn.t);
  });
}

/** Bawa item (dan opsional saldo akhir + pemasukan berulang) dari tahun lain ke tahun aktif. */
function carryFromYear() {
  var sy = +$('cy').value,
    src = ALL.data[sy];
  if (!src) return;
  var sn = snap('Sebelum membawa jadwal'),
    y = S.year,
    from = Date.UTC(y, 0, 1),
    add = 0,
    skip = 0;
  src.items.forEach(function (it, i) {
    var last = lastOcc(it);
    if (it.unit === 'sekali' || (last !== null && last < from)) {
      skip++;
      return;
    }
    var copy = cloneItem(it, Date.now() + i);
    if (
      S.items.some(function (x) {
        return sameItem(x, copy);
      })
    )
      return;
    S.items.push(copy);
    add++;
  });
  var nAdj = carryAdjustments(src);
  var msg =
    'Dibawa ' +
    add +
    ' item dari ' +
    sy +
    (skip ? ' (' + skip + ' dilewati: sekali bayar/sudah selesai)' : '') +
    (nAdj ? ' + ' + nAdj + ' pemasukan berulang' : '') +
    '.';
  if ($('cs').checked) {
    var keep = S;
    S = src;
    var end = calc().end;
    S = keep;
    S.saldo = end;
    $('saldo').value = S.saldo.toLocaleString('id-ID');
    msg += ' Saldo awal ' + y + ' = ' + rp(S.saldo) + '.';
  }
  save();
  renderAll();
  $('status').textContent = msg;
  toast(msg, function () {
    restoreSnap(sn.t);
  });
}

/** Pasang event listener halaman ini. */
function bindItems() {
  ['f-name', 'f-price', 'f-n', 'f-unit', 'f-start'].forEach(function (i) {
    $(i).oninput = preview;
    $(i).onchange = preview;
  });
  $('save').onclick = saveItem;
  $('cancel').onclick = resetForm;
  $('list').onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ed) editItem(item(b.dataset.ed));
    if (b.dataset.del) deleteItem(b);
  };
  $('f-price').addEventListener('input', function () {
    fmtLive(this);
  });
  $('f-price').addEventListener('blur', function () {
    var n = parseRp(this.value);
    if (n) {
      this.value = n.toLocaleString('id-ID');
      preview();
    }
  });
  $('f-stop').onchange = function () {
    stopUI();
    preview();
  };
  ['f-end', 'f-cnt'].forEach(function (i) {
    $(i).oninput = preview;
    $(i).onchange = preview;
  });
  $('cprow').onclick = function (e) {
    if (e.target.id === 'cyb') carryFromYear();
  };
}

/** Parser Natural Language untuk input kilat item keuangan (nama, nominal, siklus, tanggal) - Fitur 2. */
function parseQuickItem(str, yr) {
  if (!str || !str.trim()) return { error: 'Masukkan nama dan nominal tagihan/item.' };
  var s = str.trim();
  var today = new Date();
  var yDefault = yr || (typeof S !== 'undefined' && S.year) || today.getFullYear();
  var start = '';
  var rem = s;

  // 1. Ekstrak tanggal spesifik jika ada
  // a. DD-MM-YYYY atau DD/MM/YYYY (mis. 07-11-2026 atau 7/11/2026)
  var dmyMatch = rem.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (dmyMatch) {
    var d = parseInt(dmyMatch[1], 10);
    var m = parseInt(dmyMatch[2], 10);
    var y = parseInt(dmyMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      start = y + '-' + pad2(m) + '-' + pad2(d);
      rem = rem.replace(dmyMatch[0], ' ');
    }
  }

  // b. ISO YYYY-MM-DD atau YYYY/MM/DD
  if (!start) {
    var isoMatch = rem.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      var iy = parseInt(isoMatch[1], 10);
      var im = parseInt(isoMatch[2], 10);
      var id = parseInt(isoMatch[3], 10);
      if (id >= 1 && id <= 31 && im >= 1 && im <= 12) {
        start = iy + '-' + pad2(im) + '-' + pad2(id);
        rem = rem.replace(isoMatch[0], ' ');
      }
    }
  }

  // c. Format tanggal teks nama bulan: "07/7 november 2026", "7 november 2026", "tgl 15 des 2026", dsb.
  var MONTH_MAP = {
    jan: '01', januari: '01', feb: '02', februari: '02', mar: '03', maret: '03',
    apr: '04', april: '04', mei: '05', jun: '06', juni: '06', jul: '07', juli: '07',
    agu: '08', agt: '08', agustus: '08', sep: '09', september: '09', okt: '10',
    oktober: '10', nov: '11', november: '11', des: '12', desember: '12',
  };
  if (!start) {
    var namedRegex = /(?:(?:tgl|tanggal)\.?\s*)?\b(?:\d{1,2}\/)?(\d{1,2})\s+(jan|januari|feb|februari|mar|maret|apr|april|mei|jun|juni|jul|juli|agu|agt|agustus|sep|september|okt|oktober|nov|november|des|desember)(?:\s+(\d{4}))?\b/i;
    var namedMatch = rem.match(namedRegex);
    if (namedMatch) {
      var nd = parseInt(namedMatch[1], 10);
      var nmStr = MONTH_MAP[namedMatch[2].toLowerCase()];
      var ny = namedMatch[3] ? parseInt(namedMatch[3], 10) : yDefault;
      if (nd >= 1 && nd <= 31 && nmStr) {
        start = ny + '-' + nmStr + '-' + pad2(nd);
        rem = rem.replace(namedMatch[0], ' ');
      }
    }
  }

  // 2. Ekstrak siklus LEBIH DULU sebelum harga
  var unit = 'bulan', n = 1;
  var targetDay = null;

  var tiapTglMatch = rem.match(/\btiap\s+(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i);
  if (tiapTglMatch) {
    targetDay = parseInt(tiapTglMatch[1], 10);
    unit = 'bulan';
    n = 1;
    rem = rem.replace(tiapTglMatch[0], ' ');
  } else if (/\bsekali\b/i.test(rem)) {
    unit = 'sekali';
    n = 1;
    rem = rem.replace(/\bsekali\b/gi, ' ');
  } else {
    var cadMatch = rem.match(/\btiap\s+(\d+)?\s*(hari|minggu|bulan|thn|tahun)\b/i);
    if (cadMatch) {
      n = cadMatch[1] ? parseInt(cadMatch[1], 10) : 1;
      var u = cadMatch[2].toLowerCase();
      unit = (u === 'thn' || u === 'tahun') ? 'tahun' : u;
      rem = rem.replace(cadMatch[0], ' ');
    } else {
      var cadUnitMatch = rem.match(/\b(bulanan|mingguan|harian|tahunan)\b/i);
      if (cadUnitMatch) {
        var cu = cadUnitMatch[1].toLowerCase();
        if (cu === 'bulanan') unit = 'bulan';
        else if (cu === 'mingguan') unit = 'minggu';
        else if (cu === 'harian') unit = 'hari';
        else if (cu === 'tahunan') unit = 'tahun';
        rem = rem.replace(cadUnitMatch[0], ' ');
      }
    }
  }

  // d. Tanggal saja tanpa bulan: misal "tgl 15"
  if (!start && !targetDay) {
    var dayOnlyMatch = rem.match(/\b(?:tgl|tanggal)\.?\s*(\d{1,2})\b/i);
    if (dayOnlyMatch) {
      targetDay = parseInt(dayOnlyMatch[1], 10);
      rem = rem.replace(dayOnlyMatch[0], ' ');
    }
  }

  if (targetDay !== null) {
    if (targetDay < 1) targetDay = 1;
    if (targetDay > 31) targetDay = 31;
    var curY = today.getFullYear();
    var curM = today.getMonth() + 1;
    var curD = today.getDate();
    if (curD <= targetDay) {
      start = curY + '-' + pad2(curM) + '-' + pad2(targetDay);
    } else {
      var nextM = curM + 1;
      var nextY = curY;
      if (nextM > 12) { nextM = 1; nextY++; }
      start = nextY + '-' + pad2(nextM) + '-' + pad2(targetDay);
    }
  }

  if (!start) {
    start = yDefault + '-01-01';
  }

  // 3. Ekstrak harga: prioritaskan angka yang punya sufiks uang (k/rb/jt/m/miliar/milyar) atau separator titik ribuan
  var candidates = [];
  var pRegex = /\b(\d+(?:[\.,]\d+)?\s*(?:k|rb|ribu|jt|juta|m|miliar|milyar)|\d{1,3}(?:\.\d{3})+|\d+)\b/gi;
  var pm;
  while ((pm = pRegex.exec(rem)) !== null) {
    var val = parseRp(pm[0]);
    var hasSuffix = /(?:k|rb|ribu|jt|juta|m|miliar|milyar)$/i.test(pm[0]) || /\d{1,3}\.\d{3}/.test(pm[0]);
    candidates.push({ raw: pm[0], val: val, hasSuffix: hasSuffix, index: pm.index });
  }

  if (!candidates.length) return { error: 'Nominal tidak ditemukan (mis. 200k, 1.5jt, atau 350.000).' };

  candidates.sort(function(a, b) {
    if (a.hasSuffix && !b.hasSuffix) return -1;
    if (!a.hasSuffix && b.hasSuffix) return 1;
    return b.val - a.val;
  });

  var chosen = candidates[0];
  if (!chosen.val || chosen.val <= 0) return { error: 'Nominal tidak valid.' };
  var price = chosen.val;

  rem = rem.slice(0, chosen.index) + ' ' + rem.slice(chosen.index + chosen.raw.length);

  // 4. Bersihkan nama (HANYA buang kata kontrol pembantu awal/akhir)
  var name = rem
    .replace(/\b(?:tiap|mulai|dari|pada)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();

  if (!name) return { error: 'Nama item tidak boleh kosong.' };

  return {
    name: name,
    price: price,
    n: n,
    unit: unit,
    start: start,
  };
}

/** Form tambah item kilat satu baris dengan NLP parser (Fitur 2). */
function bindQuickItem() {
  var input = $('q-input');
  var btn = $('q-btn');
  var err = $('q-err');
  if (!input || !btn) return;

  function doQuickAdd() {
    var raw = input.value.trim();
    if (!raw) return;
    err.textContent = '';
    var res = parseQuickItem(raw, S.year);
    if (res.error) {
      err.textContent = res.error;
      return;
    }
    var newItem = Object.assign({
      id: Date.now(),
      name: res.name,
      price: res.price,
      n: res.n,
      unit: res.unit,
      start: res.start,
      stop: 'none',
      cnt: 0,
      end: '',
      cat: '',
      ch: [],
    });
    S.items.push(newItem);
    save();
    input.value = '';
    renderAll();
    toast('Item "' + esc(newItem.name) + '" (' + rp(newItem.price) + ') berhasil ditambahkan!');
  }

  btn.onclick = doQuickAdd;
  input.onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doQuickAdd();
    }
  };

}
