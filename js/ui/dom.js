/**
 * Helper DOM: $, pemformat angka saat mengetik, tab, toast Urungkan.
 */

var $ = function (i) {
  return document.getElementById(i);
};

/** Beri titik ribuan saat mengetik angka (kursor dijaga). */
function fmtLive(el) {
  var v = el.value;
  if (!v || /[^\d.,\s]/.test(v)) return;
  var p = el.selectionStart,
    n = v.slice(0, p).replace(/\D/g, '').length,
    d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, ''),
    f = d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = f;
  var i = 0,
    c = 0;
  while (i < f.length && c < n) {
    if (/\d/.test(f[i])) c++;
    i++;
  }
  try {
    el.setSelectionRange(i, i);
  } catch (e) {}
}

/** Tampilkan tab tertentu (rincian | jadwal | item). */
function tab(t) {
  document.querySelectorAll('nav button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.t === t);
  });
  ['rincian', 'jadwal', 'item'].forEach(function (x) {
    $('v-' + x).hidden = x !== t;
  });
}

/** Tampilkan pesan singkat; bila ada `undo`, muncul tombol Urungkan selama 10 detik. */
function toast(msg, undo) {
  var t = $('tt');
  $('ttm').textContent = msg;
  $('ttu').hidden = !undo;
  t._u = undo || null;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(
    function () {
      t.hidden = true;
    },
    undo ? 10000 : 4000,
  );
}

/** Pasang event listener halaman ini. */
function bindDom() {
  document.querySelectorAll('nav button').forEach(function (b) {
    b.onclick = function () {
      tab(b.dataset.t);
    };
  });
  $('ttu').onclick = function () {
    var t = $('tt');
    if (t._u) {
      var f = t._u;
      t._u = null;
      t.hidden = true;
      f();
    }
  };
}

/** Tulis status simpan di header. */
function setSaveStatus(ok) {
  $('status').textContent = ok
    ? 'Tersimpan otomatis ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : 'Penyimpanan browser tidak tersedia. Gunakan Cadangan agar data aman.';
}
