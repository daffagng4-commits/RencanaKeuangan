/**
 * Titik masuk aplikasi. Urutan: muat data -> pasang listener -> render -> sinkron.
 */
function main() {
  loadState();
  // Pindahkan penanda manual lokal lama ke data tersinkron (sekali); tersimpan oleh save() di akhir main().
  migSmManual();
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
