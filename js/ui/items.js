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
    '<div class="sub" style="width:100%">Item sekali bayar atau yang sudah selesai (lewat tanggal/jumlah berhenti) tidak ikut dibawa. Perubahan harga dan pemasukan berulang ikut terbawa. Status lunas tidak dibawa.</div>'
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
