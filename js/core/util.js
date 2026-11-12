/**
 * Helper murni: format uang/tanggal, escape HTML. Tidak menyentuh DOM maupun state.
 */

var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var FULL_MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

var ITEM_NAME_ALIASES = [
  { pattern: /^etf\s+60%$/i, name: 'ETF 60%' },
  { pattern: /^saham\s+lokal\s+40%$/i, name: 'Saham Lokal 40%' },
  { pattern: /^btc$/i, name: 'BTC' }
];

/** Keterangan pembayaran saja; tanda kurung bermakna dan catatan bebas tetap utuh. */
function normalisasiNamaItem(namaMentah) {
  var name = String(namaMentah || '').trim().replace(/\s+/g, ' ');
  name = name.replace(/\(\s*(?:lunas|cicil(?:an)?|dari total\b[^()]*)\s*\)/gi, ' ').trim();
  var tail = /\s+(?:lunas|cicil(?:an)?|jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)$/i;
  while (tail.test(name)) name = name.replace(tail, '').trim();
  name = name.replace(/\s+/g, ' ');
  for (var i = 0; i < ITEM_NAME_ALIASES.length; i++) {
    if (ITEM_NAME_ALIASES[i].pattern.test(name)) return ITEM_NAME_ALIASES[i].name;
  }
  return name || String(namaMentah || '').trim();
}

/** Escape HTML. */
function esc(t) {
  return String(t).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/** Format rupiah: "Rp 1.250.000". */
function rp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Baca input uang: "200k", "1,5jt", "200.000" -> angka. */
function parseRp(s) {
  s = String(s).toLowerCase().replace(/rp|\s/g, '');
  var m = 1;
  if (/(m|miliar|milyar)$/.test(s)) m = 1e9;
  else if (/(jt|juta)$/.test(s)) m = 1e6;
  else if (/(rb|ribu|k)$/.test(s)) m = 1e3;
  s = s.replace(/(m|miliar|milyar|jt|juta|rb|ribu|k)$/, '');
  var v = m > 1 ? parseFloat(s.replace(',', '.')) : parseInt(s.replace(/[.,]/g, ''), 10);
  return isNaN(v) ? 0 : Math.round(v * m);
}

/** Format tanggal (ms UTC) ke bahasa Indonesia. */
function fd(t, o) {
  return new Date(t).toLocaleDateString(
    'id-ID',
    Object.assign({ timeZone: 'UTC' }, o || { day: 'numeric', month: 'short', year: 'numeric' }),
  );
}

/** ms -> "YYYY-MM-DD" (UTC). */
function isoD(t) {
  return new Date(t).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> tanggal terformat. */
function fmtD(d) {
  return fd(Date.parse(d + 'T00:00:00Z'));
}

/** Harga singkat: 720rb, 1,5jt. */
function shortP(p) {
  return p >= 1e6
    ? (p / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + 'jt'
    : p >= 1000
      ? Math.round(p / 1000) + 'rb'
      : String(p);
}

/** Dua digit (01, 02, ...). */
function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Geser tanggal ISO 'YYYY-MM-DD' sebanyak n hari (boleh negatif). */
function addDaysISO(iso, n) {
  return isoD(Date.parse(iso + 'T00:00:00Z') + n * 864e5);
}
