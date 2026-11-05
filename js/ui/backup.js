/**
 * Jendela Impor/Ekspor: cadangan otomatis, pulihkan contoh.
 */

function renderSnaps() {
  var L = snapList();
  $('sl').innerHTML =
    L.map(function (s) {
      return (
        '<div class="it2"><div><b>' +
        esc(s.l) +
        '</b><br><span class="sub">' +
        new Date(s.t).toLocaleString('id-ID') +
        ' &middot; ' +
        Math.max(1, Math.round(s.d.length / 1024)) +
        ' KB</span></div><button class="g" data-sr="' +
        s.t +
        '">Pulihkan</button></div>'
      );
    }).join('') ||
    '<div class="sub">Belum ada. Cadangan dibuat otomatis sebelum hapus, impor, atau memuat data cloud.</div>';
}

/** Pasang event listener halaman ini. */
function bindBackup() {
  $('bk').onclick = function () {
    ALL.data[S.year] = S;
    ALL.year = S.year;
    $('ta').value = JSON.stringify(ALL, null, 1);
    $('xm').textContent = '';
    $('dgr').innerHTML = '';
    renderSnaps();
    $('merr').textContent = '';
    $('m').hidden = false;
  };
  $('cl').onclick = function () {
    $('m').hidden = true;
  };
  $('cp').onclick = function () {
    $('ta').select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {}
    $('merr').textContent = ok ? 'Tersalin.' : 'Teks sudah terpilih. Salin dengan Ctrl+C.';
  };
  $('rs').onclick = function () {
    if (this.dataset.arm) {
      var sn = snap('Sebelum pulihkan contoh');
      ALL = norm(null);
      S = ALL.data[ALL.year];
      $('sm').value = 0;
      save();
      $('saldo').value = S.saldo.toLocaleString('id-ID');
      $('year').value = S.year;
      renderAll();
      resetForm();
      $('m').hidden = true;
      this.dataset.arm = '';
      this.textContent = 'Pulihkan contoh';
      toast('Data contoh dipulihkan.', function () {
        restoreSnap(sn.t);
      });
    } else {
      this.dataset.arm = 1;
      this.textContent = 'Yakin? Semua tahun hilang';
    }
  };
  $('sl').onclick = function (e) {
    var b = e.target.closest('button[data-sr]');
    if (!b) return;
    var back = restoreSnap(+b.dataset.sr);
    if (back) {
      toast('Data dipulihkan.', function () {
        restoreSnap(back.t);
      });
      renderSnaps();
      setX('Data dipulihkan dari cadangan otomatis.', 1);
    }
  };
}
