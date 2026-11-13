/**
 * Orkestrasi render: perbarui semua tampilan dari state.
 */

function renderAll() {
  S.paid = S.paid || {};
  S.skip = S.skip || {};
  S.adj = S.adj || [];
  // v-rincian akan digambar ulang; keluarkan topbar dulu agar kontrolnya tidak ikut terhapus.
  var topbar = document.querySelector('.topbar'), slot = $('topbar-slot');
  if (topbar && slot && topbar.parentNode !== slot) slot.appendChild(topbar);
  renderYears();
  renderReminders();
  renderAdj();
  renderRincian();
  rkHeadSync();
  renderJadwal();
  renderList();
  renderTrip();
  renderKas();
  modeUi();
}

/** Letakkan topbar di header Rincian hanya saat tab itu aktif; tab lain tetap memakai slot asalnya. */
function rkHeadSync() {
  var head = $('rk-head'),
    slot = $('topbar-slot'),
    topbar = document.querySelector('.topbar'),
    onRincian = mode === 'rencana' && curTab === 'rincian';
  if (!topbar) return;
  var target = onRincian && head ? head : slot;
  if (target && topbar.parentNode !== target) target.appendChild(topbar);
  if (!onRincian || !head) return;
  var sub = $('rk-sub');
  if (!sub) return;
  var parts = [],
    P = typeof kasLinked === 'function' ? kasLinked() : null;
  if (P) {
    var rw = kasRunway(P);
    if (rw && rw.status === 'deficit') parts.push('Saldo kas sudah minus');
    else if (rw && rw.date) parts.push('Kas cukup sampai ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi)');
    else if (rw && rw.status === 'safe') parts.push('Kas aman sampai akhir tahun');
  }
  var bills = document.querySelectorAll('#v-rincian .bl').length;
  if (bills) parts.push(bills + ' tagihan belum lunas');
  sub.innerHTML = parts
    .map(function (p) {
      return p.replace(/(Rp[\s\d.,]+|−\s*Rp[\s\d.,]+)/g, '<span class="pv">$1</span>');
    })
    .join(' &middot; ');
}

/** Migrasi penanda manual lama (localStorage rk-sm-manual) untuk tahun kalender saja.
 *  Nilai tersimpan menang; penanda hanya dipindahkan bila tersimpan != bulan kalender.
 *  Data lama yang sudah sama dengan kalender dianggap auto (kunci lokal dihapus). */
function migSmManual() {
  var o;
  try { o = JSON.parse(localStorage.getItem('rk-sm-manual') || '{}') || {}; } catch (e) { o = {}; }
  var t = todayISO(), cy = +t.slice(0, 4), cm = +t.slice(5, 7) - 1;
  var Y = ALL.data[cy], mig = !!(o[cy] && Y && Y.smManual !== true && +Y.startMonth !== cm);
  if (mig) Y.smManual = true;
  if (Object.keys(o).length) { try { localStorage.removeItem('rk-sm-manual'); } catch (e) {} }
}

/** Satu pintu penyimpanan perubahan Bulan saldo. v = angka 0..11 atau 'auto'. */
function setStartMonth(v) {
  var t = todayISO(), cur = +S.year === +t.slice(0, 4);
  if (v === 'auto') {
    if (!cur) return;
    delete S.smManual;
  } else {
    v = Math.min(11, Math.max(0, +v || 0));
    if (cur && v !== smEff()) S.smManual = true;
    S.startMonth = v;
  }
  openRows = {};
  save();
  smSyncUI();
  renderAll();
}

/** Sinkronkan tampilan dropdown #sm dengan keadaan efektif. */
function smSyncUI() {
  var sm = $('sm');
  if (!sm) return;
  var t = todayISO(), cur = +S.year === +t.slice(0, 4);
  var oa = $('sm-auto');
  if (oa) { oa.textContent = 'Otomatis (' + MON[+t.slice(5, 7) - 1] + ')'; oa.disabled = !cur; }
  sm.value = cur && S.smManual !== true ? 'auto' : String(Math.min(11, Math.max(0, +S.startMonth || 0)));
  smAutoMark();
}

/** Penanda #sm: auto = border putus-putus, manual = border aksen. */
function smAutoMark() {
  var sm = $('sm');
  if (!sm) return;
  var t = todayISO(), cur = +S.year === +t.slice(0, 4);
  var man = cur && S.smManual === true;
  sm.setAttribute('data-auto', cur ? (man ? 'manual' : 'auto') : '');
  sm.title = !cur ? 'Bulan saldo tersimpan untuk profil tahun ini' : man ? 'Dipilih manual; pilih "Otomatis" untuk mengikuti kalender lagi' : 'Mengikuti bulan kalender; pilih bulan tertentu untuk menetapkan manual';
}

/** Tanggal berganti / tab aktif lagi: hitung ulang bulan saldo efektif tanpa menulis data. */
function refreshToday() {
  smSyncUI();
  renderAll();
}

/** Segarkan semua kontrol dan tampilan dari state (setelah ganti tahun, muat data, dsb). */
function syncUI() {
  $('saldo').value = (+S.saldo || 0).toLocaleString('id-ID');
  $('year').value = S.year;
  smSyncUI();
  openRows = {};
  renderAll();
  resetForm();
}
