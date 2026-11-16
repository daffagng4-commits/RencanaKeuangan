/**
 * Kulit halaman: sapaan + satu baris ringkasan di atas grid Rincian.
 * Semua angka diambil dari fungsi yang sudah ada (kasBal, kasRunway, reminders); tidak ada perhitungan baru.
 * Dipanggil renderRincian() setelah markup kartu terpasang, dan oleh refreshToday().
 */

/** Nama pemilik dashboard. Diisi 'XXX' saat belum login atau nama akun saat masuk. */
var USER_NAME = 'XXX';

/** Data tampilan akun aktif dari sesi Supabase (kondisi belum login -> XXX & lingkaran abu-abu kosong). */
function rkDisplayUser(u) {
  var user = arguments.length ? u : (typeof sbUser !== 'undefined' ? sbUser : null);
  if (!user) return { loggedIn: false, name: 'XXX', initial: '', sub: '' };
  var em = String(user.email || '').trim();
  var meta = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '';
  var raw = em ? em.split('@')[0].split('+')[0].replace(/[._-]+/g, ' ').trim() : String(meta).trim();
  if (!raw) raw = String(meta).trim() || 'Pengguna';
  var nice = raw.charAt(0).toUpperCase() + raw.slice(1);
  var m = nice.match(/[\p{L}\p{N}]/u);
  return { loggedIn: true, name: nice, initial: m ? m[0].toUpperCase() : 'U', sub: em };
}
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

/** Ambil inisial nama profil: kosong saat belum login, huruf pertama kapital saat sudah masuk. */
function userInitial(name) {
  if (name == null) return rkDisplayUser().initial;
  var s = String(name).trim();
  if (!s || s === 'XXX') return '';
  var m = s.match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : (s[0] ? s[0].toUpperCase() : '');
}

/** Perbarui badge jumlah di navigasi sidebar Browser Mode. */
function syncSidebarBadges(c) {
  if (typeof S === 'undefined' || !S) return;
  if (!c && typeof calc === 'function') c = calc();
  var bk = $('nav-badge-kas'),
    bj = $('nav-badge-jadwal'),
    bi = $('nav-badge-item'),
    bs = $('nav-badge-sim'),
    bt = $('nav-badge-trip'),
    btnTrip = $('nav-btn-trip');
  if (bk) {
    var PK = typeof kasLinked === 'function' ? kasLinked() : null,
      debts = PK && typeof debtData === 'function' ? debtData(PK) : [];
    bk.textContent = debts.length ? debts.length + ' utang' : (PK ? kasRows(PK).length + ' tx' : '');
    bk.className = 'nav-badge ' + (debts.length ? 'warn' : 'ok');
    bk.hidden = !bk.textContent;
  }
  if (bj && c && c.occs) {
    var openCnt = 0;
    S.items.forEach(function (it) {
      var list = c.occs[it.id] || [];
      if (list.some(function (t) {
        var k = it.id + '|' + isoD(t);
        return !S.skip[k] && !S.paid[k];
      })) openCnt++;
    });
    bj.textContent = openCnt ? openCnt + ' belum' : 'Lunas';
    bj.className = 'nav-badge ' + (openCnt ? 'warn' : 'ok');
  }
  if (bi) bi.textContent = String(S.items.length);
  if (bs) bs.textContent = (typeof SIM !== 'undefined' && SIM ? SIM.length : 0) + ' aktif';
  var trList = typeof trips === 'function' ? trips() : [];
  if (bt) bt.textContent = trList.length + ' trip';
  if (btnTrip) {
    btnTrip.hidden = false;
    btnTrip.classList.toggle('on', typeof mode !== 'undefined' && mode === 'trip');
  }
}

/** Isi area judul. Dipanggil dari renderRincian (butuh c/R) dan refreshToday (c/R dihitung di sini). */
function renderShell(c, R) {
  syncSidebarBadges(c);
  var h = $('rk-head');
  if (!h) return;
  if (typeof mode !== 'undefined' && (mode !== 'rencana' || curTab !== 'rincian')) return;
  if (!c) {
    c = calc();
    R = c.rows;
  }
  var du = rkDisplayUser();
  USER_NAME = du.name;
  var s = ringkasLine(c, R),
    sum = '<span class="rk-date">' + longDate() + '</span>' + (s.html ? ' &middot; ' + s.html : '');
  h.innerHTML =
    '<h1 class="rk-h1">Selamat ' + greetWord() + ', ' + esc(du.name) + '</h1>' +
    '<p class="rk-sum"' + (s.title ? ' title="' + esc(s.title) + '"' : '') + '>' + sum + '</p>';
  var ini = $('sb-ini'),
    nm = $('sb-name'),
    acctBtn = $('acct'),
    av = acctBtn && acctBtn.querySelector('.av-circle');
  if (nm) nm.textContent = 'Halo, ' + du.name;
  if (ini) ini.textContent = du.initial;
  if (av) av.classList.toggle('anon', !du.loggedIn);
  var ariaLabel = du.loggedIn ? 'Profil ' + du.name : 'Masuk ke akun';
  if (acctBtn) {
    acctBtn.classList.toggle('on', du.loggedIn);
    acctBtn.title = ariaLabel;
    acctBtn.setAttribute('aria-label', ariaLabel);
  }
}
