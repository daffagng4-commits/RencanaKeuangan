/**
 * Kulit halaman: sapaan + satu baris ringkasan di atas grid Rincian.
 * Semua angka diambil dari fungsi yang sudah ada (kasBal, kasRunway, reminders); tidak ada perhitungan baru.
 * Dipanggil renderRincian() setelah markup kartu terpasang, dan oleh refreshToday().
 */

/** Nama pemilik dashboard. Satu-satunya tempat untuk mengubahnya. */
var USER_NAME = 'Daffa';
/** Jam batas sapaan (jam lokal perangkat): 05 pagi, 11 siang, 15 sore, 18 malam. */
var SAPA = [[5, 'malam'], [11, 'pagi'], [15, 'siang'], [18, 'sore'], [24, 'malam']];

/** "pagi|siang|sore|malam" menurut jam lokal perangkat. */
function greetWord(d) {
  var h = (d || new Date()).getHours();
  for (var i = 0; i < SAPA.length; i++) if (h < SAPA[i][0]) return SAPA[i][1];
  return 'malam';
}

/** Tanggal lengkap bahasa Indonesia: "Jumat, 13 November 2026". */
function longDate() {
  return new Date(todayISO() + 'T00:00:00Z').toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Baris ringkasan: bagian yang datanya kosong dilewati, pemisah tidak menumpuk. */
function ringkasLine(c, R) {
  var out = [],
    P = kasLinked(),
    y = S.year,
    title = '';
  if (P) {
    var KB = kasBal(P),
      rw = kasRunway(P, KB.bal);
    if (rw && rw.status === 'deficit') {
      out.push('Saldo sudah minus <b class="pv">' + rp(rw.deficit) + '</b>');
    } else if (rw && rw.status === 'warning') {
      out.push('Kas cukup sampai <b>' + fmtD(rw.date) + '</b> (' + rw.days + ' hari lagi)');
      title = 'Kas cukup sampai ' + fmtD(rw.date) + ' (' + rw.days + ' hari lagi). Setelah itu saldo akan minus ' + rp(rw.deficit) + '.';
    } else if (rw && rw.status === 'safe') {
      out.push('Kas cukup untuk semua tagihan sampai akhir ' + y);
    }
  }
  var rs = reminders(7),
    due = rs.late.length + rs.soon.length;
  if (due) out.push('<b>' + due + '</b> tagihan dalam 7 hari ke depan');
  return { html: out.length ? out.join(' &middot; ') : '', title: title };
}

/** Isi area judul. Dipanggil dari renderRincian (butuh c/R) dan refreshToday (c/R dihitung di sini). */
function renderShell(c, R) {
  var h = $('rk-head');
  if (!h) return;
  if (typeof mode !== 'undefined' && (mode !== 'rencana' || curTab !== 'rincian')) return;
  if (!c) {
    c = calc();
    R = c.rows;
  }
  var s = ringkasLine(c, R),
    sum = '<span class="rk-date">' + longDate() + '</span>' + (s.html ? ' &middot; ' + s.html : '');
  h.innerHTML =
    '<h1 class="rk-h1">Selamat ' + greetWord() + ', ' + esc(USER_NAME) + '</h1>' +
    '<p class="rk-sum"' + (s.title ? ' title="' + esc(s.title) + '"' : '') + '>' + sum + '</p>';
  var ini = $('sb-ini'),
    nm = $('sb-name'),
    wr = USER_NAME.trim();
  if (nm) nm.textContent = wr || 'Pengguna';
  if (ini)
    ini.textContent = (wr || 'P')
      .split(/\s+/)
      .map(function (w, i, a) {
        return i < (a.length > 1 ? 2 : 1) ? w[0] : '';
      })
      .join('')
      .toUpperCase();
}
