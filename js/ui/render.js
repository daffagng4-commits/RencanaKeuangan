/**
 * Orkestrasi render: perbarui semua tampilan dari state.
 */

function renderAll() {
  S.paid = S.paid || {};
  S.skip = S.skip || {};
  S.adj = S.adj || [];
  renderYears();
  renderReminders();
  renderAdj();
  renderRincian();
  renderJadwal();
  renderList();
}

/** Segarkan semua kontrol dan tampilan dari state (setelah ganti tahun, muat data, dsb). */
function syncUI() {
  $('saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  $('year').value = S.year;
  $('sm').value = S.startMonth;
  openRows = {};
  renderAll();
  resetForm();
}
