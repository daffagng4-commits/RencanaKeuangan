/**
 * Jendela "Ubah beberapa tagihan": ubah status (lewati / lunas / belum) semua tagihan
 * satu item dalam rentang tanggal sekaligus. Dibuka dari menu chip di Jadwal Bayar.
 */

var rgItem = null;

/** Tanggal tagihan item it (tahun aktif) di dalam rentang ISO [from, to]. */
function rangeOcc(it, from, to) {
  return occ(it, S.year).filter(function (t) {
    var d = isoD(t);
    return d >= from && d <= to;
  });
}

/** Pratinjau tagihan yang terkena perubahan. */
function renderRangePreview() {
  var it = item(rgItem),
    from = $('skf').value,
    to = $('skto').value,
    p = $('skp');
  $('ske').textContent = '';
  if (!it || !from || !to || to < from) {
    p.className = 'sub';
    p.textContent = 'Pilih rentang tanggal.';
    return;
  }
  var list = rangeOcc(it, from, to);
  p.className = list.length ? 'prev' : 'sub';
  p.textContent = list.length
    ? list.length +
      ' tagihan: ' +
      list
        .slice(0, 8)
        .map(function (t) {
          return fd(t, { day: 'numeric', month: 'short' });
        })
        .join(', ') +
      (list.length > 8 ? ' …' : '') +
      ' (total ' +
      rp(sumP(it, list)) +
      ')'
    : 'Tidak ada tagihan di rentang ini.';
}

/** Buka jendela ubah beberapa tagihan untuk item dan tanggal awal. */
function openRange(itemId, iso) {
  var it = item(itemId);
  if (!it) return;
  rgItem = it.id;
  $('skt').textContent = 'Ubah beberapa tagihan: ' + it.name;
  $('skf').value = iso;
  $('skto').value = iso;
  $('ska').value = 'skip';
  renderRangePreview();
  $('sk').hidden = false;
}

/** Terapkan status ke semua tagihan dalam rentang (bisa diurungkan). */
function applyRange() {
  var it = item(rgItem),
    from = $('skf').value,
    to = $('skto').value;
  if (!it || !from || !to || to < from) {
    $('ske').textContent = 'Isi rentang tanggal dengan benar (sampai tidak boleh lebih awal dari dari).';
    return;
  }
  var list = rangeOcc(it, from, to);
  if (!list.length) {
    $('ske').textContent = 'Tidak ada tagihan di rentang ini.';
    return;
  }
  var st = $('ska').value,
    sn = snap('Sebelum mengubah status beberapa tagihan');
  list.forEach(function (t) {
    var k = it.id + '|' + isoD(t);
    delete S.paid[k];
    delete S.skip[k];
    if (st === 'paid') S.paid[k] = 1;
    if (st === 'skip') S.skip[k] = 1;
  });
  save();
  $('sk').hidden = true;
  renderAll();
  var label = st === 'skip' ? 'dilewati' : st === 'paid' ? 'ditandai lunas' : 'dikembalikan ke belum dibayar';
  toast(list.length + ' tagihan ' + label + '.', function () {
    restoreSnap(sn.t);
  });
}

/** Pasang event listener jendela ini. */
function bindSkipRange() {
  ['skf', 'skto'].forEach(function (id) {
    $(id).oninput = renderRangePreview;
    $(id).onchange = renderRangePreview;
  });
  $('sks').onclick = applyRange;
  $('skc').onclick = function () {
    $('sk').hidden = true;
  };
}
