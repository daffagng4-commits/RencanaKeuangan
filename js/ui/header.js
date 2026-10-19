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
  $('sm').value = +S.startMonth || 0;
  $('sm').onchange = function () {
    S.startMonth = +this.value;
    openRows = {};
    save();
    renderAll();
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
