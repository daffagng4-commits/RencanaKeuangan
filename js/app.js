/**
 * Titik masuk aplikasi. Urutan: muat data -> pasang listener -> render -> sinkron.
 */
function main() {
  loadState();
  // Bulan mulai tahun berjalan mengikuti kalender, kecuali dipilih manual (hanya memori; ikut tersimpan saat save berikutnya).
  autoStartMonth();
  bindDom();
  bindRincian();
  bindJadwal();
  bindItems();
  bindQuickItem();
  bindYears();
  bindHeader();
  bindPrice();
  bindIo();
  bindBackup();
  bindDiag();
  bindReminders();
  bindSkipRange();
  bindUi();
  bindKas();
  bindTrip();
  bindSim();
  bindXl();
  bindPwa();
  bindPrivacy();
  bindTopbarMore();
  bindA11y();
  bindNav();
  bindTip();
  resetForm();
  renderAll();
  save();
  bindSync();
  sbInit();
}
main();
