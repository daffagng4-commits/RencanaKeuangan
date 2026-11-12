/**
 * Kontrol di atas: saldo awal dan bulan saldo.
 */

/** Pasang event listener halaman ini. */
function bindHeader() {
  $('saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  MON.forEach(function (n, i) {
    var op = document.createElement('option');
    op.value = i;
    op.textContent = n;
    $('sm').appendChild(op);
  });
  var oa = document.createElement('option');
  oa.value = 'auto';
  oa.id = 'sm-auto';
  oa.textContent = 'Otomatis';
  $('sm').appendChild(oa);
  smSyncUI();
  $('sm').onchange = function () {
    setStartMonth(this.value === 'auto' ? 'auto' : +this.value);
  };
  $('saldo').onchange = function () {
    S.saldo = parseRp(this.value);
    this.value = S.saldo.toLocaleString('id-ID');
    save();
    renderAll();
  };
  $('saldo').addEventListener('input', function () {
    fmtLive(this);
  });
}
