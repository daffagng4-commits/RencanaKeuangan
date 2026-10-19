/**
 * Titik masuk aplikasi. Urutan: muat data -> pasang listener -> render -> sinkron.
 */
function main() {
  loadState();
  bindDom();
  bindRincian();
  bindJadwal();
  bindItems();
  bindYears();
  bindHeader();
  bindAdjust();
  bindPrice();
  bindIo();
  bindBackup();
  bindDiag();
  bindReminders();
  bindSkipRange();
  resetForm();
  renderAll();
  save();
  bindSync();
  sbInit();
}
main();
