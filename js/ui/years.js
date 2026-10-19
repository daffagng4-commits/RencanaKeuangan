/**
 * Data per tahun: tombol tahun, pindah tahun, hapus tahun.
 */

function renderYears() {
  var ks = Object.keys(ALL.data)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    });
  $('yb').innerHTML =
    '<span class="sub">Data tahun:</span>' +
    ks
      .map(function (k) {
        return (
          '<button class="yp' +
          (k === S.year ? ' on' : '') +
          '" data-y="' +
          k +
          '" aria-pressed="' +
          (k === S.year) +
          '">' +
          k +
          '</button>'
        );
      })
      .join('') +
    '<button class="g d" data-dy="1" title="Hapus semua data tahun ini">Hapus tahun ' +
    S.year +
    '</button><span class="sub">Tiap tahun punya item, saldo, dan status bayar sendiri. Ketik tahun baru di kolom Tahun.</span>';
}

/** Pindah ke tahun v (dibuat kosong bila belum ada). */
function switchYear(v) {
  save();
  var n = ALL.data[v];
  if (!n) n = ALL.data[v] = { year: v, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  S = n;
  ALL.year = v;
  save();
  syncUI();
}

/** Hapus data tahun aktif (setelah konfirmasi dua kali); pindah ke tahun terdekat. Bisa diurungkan. */
function delYear() {
  var sn = snap('Sebelum menghapus tahun ' + S.year),
    y = S.year,
    ks = Object.keys(ALL.data)
      .map(Number)
      .filter(function (k) {
        return k !== y;
      })
      .sort(function (a, b) {
        return a - b;
      }),
    n;
  delete ALL.data[y];
  if (ks.length) {
    n = ks
      .filter(function (k) {
        return k < y;
      })
      .pop();
    if (n == null) n = ks[0];
  } else {
    n = new Date().getFullYear();
    ALL.data[n] = { year: n, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  }
  S = ALL.data[n];
  ALL.year = n;
  save();
  syncUI();
  $('status').textContent = 'Tahun ' + y + ' dihapus.';
  toast('Tahun ' + y + ' dihapus.', function () {
    restoreSnap(sn.t);
  });
}

/** Pasang event listener halaman ini. */
function bindYears() {
  for (var y = 2026; y <= 2032; y++) {
    var o = document.createElement('option');
    o.value = o.textContent = y;
    $('yl').appendChild(o);
  }
  $('year').value = S.year;
  $('year').onchange = function () {
    var v = parseInt(this.value, 10);
    if (!(v >= 1900 && v <= 2200)) {
      this.value = S.year;
      return;
    }
    switchYear(v);
  };
  $('yb').onclick = function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.y) {
      switchYear(+b.dataset.y);
      return;
    }
    if (b.dataset.dy) {
      if (b.dataset.arm) {
        delYear();
      } else {
        var yy = S.year;
        b.dataset.arm = 1;
        b.textContent = 'Yakin hapus ' + yy + ' (' + S.items.length + ' item)?';
        setTimeout(function () {
          if (b.isConnected) {
            b.dataset.arm = '';
            b.textContent = 'Hapus tahun ' + yy;
          }
        }, 3000);
      }
    }
  };
}
