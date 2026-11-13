/**
 * Kulit halaman: judul + satu kalimat ringkasan di atas grid Rincian.
 * Semua angka diambil dari fungsi yang sudah ada (kasBal, kasRunway, reminders); tidak ada perhitungan baru.
 * Dipanggil renderRincian() setelah markup kartu terpasang.
 */

/** Satu kalimat ringkasan. Bagian yang datanya kosong dilewati sendiri. */
function ringkasLine(c, R) {
  var out = [],
    P = kasLinked(),
    n = R.length || 1,
    jatah = c.end > 0 ? c.end / n : null,
    t = todayISO(),
    y = S.year;
  if (P) {
    var KB = kasBal(P),
      rw = kasRunway(P, KB.bal);
    if (rw && rw.status === 'deficit') out.push('Saldo sudah minus <b class="pv">' + rp(rw.deficit) + '</b>');
    else if (rw && rw.status === 'warning') out.push('Kas cukup sampai <b>' + fmtD(rw.date) + '</b> (' + rw.days + ' hari lagi)');
    else if (rw && rw.status === 'safe') out.push('Kas cukup untuk semua tagihan sampai akhir ' + y);
  }
  var rs = reminders(7),
    due = rs.late.length + rs.soon.length;
  if (due) out.push('<b>' + due + '</b> tagihan dalam 7 hari ke depan');
  if (jatah != null) out.push('Jatah jajan <b class="pv">' + rp(jatah) + '</b> per bulan');
  else out.push('Sisa saldo akhir Des <b class="pv' + (c.end < 0 ? ' neg' : '') + '">' + rp(c.end) + '</b>');
  return out.length ? out.join(' &middot; ') : '';
}

/** Isi area judul (dipanggil ulang tiap render; hasilnya tetap). */
function renderShell(c, R) {
  if (mode !== 'rencana' || curTab !== 'rincian') return;
  var h = $('rk-head');
  if (!h) return;
  var line = ringkasLine(c, R);
  h.innerHTML =
    '<h1 class="rk-h1">Ringkasan keuangan</h1>' +
    (line ? '<p class="rk-sum">' + line + '</p>' : '');
}
