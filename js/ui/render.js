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
  renderTrip();
  renderKas();
  modeUi();
}

/** Pilihan manual "Bulan mulai" per tahun: preferensi perangkat (localStorage), tidak ikut sinkron. */
function smManual(set) {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('rk-sm-manual') || '{}') || {}; } catch (e) {}
  if (set) {
    o[S.year] = 1;
    try { localStorage.setItem('rk-sm-manual', JSON.stringify(o)); } catch (e) {}
  }
  return !!o[S.year];
}

/** Tahun berjalan + belum dipilih manual: Bulan mulai = bulan kalender. true bila berubah. */
function autoStartMonth() {
  var t = todayISO(), m = +t.slice(5, 7) - 1;
  if (+S.year !== +t.slice(0, 4) || smManual() || +S.startMonth === m) return false;
  S.startMonth = m;
  return true;
}

/** Penanda #sm: "auto" (mengikuti kalender) atau "manual" (pilihan sendiri). */
function smAutoMark() {
  var sm = $('sm');
  if (!sm) return;
  var cur = +S.year === +todayISO().slice(0, 4);
  var man = smManual();
  sm.setAttribute('data-auto', cur && !man ? 'auto' : man ? 'manual' : '');
  sm.title = cur && !man ? 'Mengikuti bulan kalender; pilih bulan lain untuk menetapkan manual' : man ? 'Dipilih manual' : '';
}

/** Tanggal berganti / tab aktif lagi: Bulan mulai ikut kalender (bila belum manual), lalu render ulang. */
function refreshToday() {
  if (autoStartMonth()) $('sm').value = S.startMonth;
  smAutoMark();
  renderAll();
}

/** Segarkan semua kontrol dan tampilan dari state (setelah ganti tahun, muat data, dsb). */
function syncUI() {
  $('saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  $('year').value = S.year;
  $('sm').value = S.startMonth;
  smAutoMark();
  openRows = {};
  renderAll();
  resetForm();
}
