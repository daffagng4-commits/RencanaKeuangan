/**
 * Baca/tulis CSV (murni).
 */

function csvEsc(v) {
  v = String(v);
  return /[;",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** Ubah baris (array 2D) menjadi teks CSV berpemisah titik koma + BOM UTF-8 (rapi di Excel Indonesia). */
function toCSV(rows) {
  return (
    '\uFEFF' +
    rows
      .map(function (r) {
        return r.map(csvEsc).join(';');
      })
      .join('\r\n')
  );
}

/** Baca teks CSV (deteksi pemisah ; , atau tab; mendukung tanda kutip) menjadi array 2D. */
function parseCSV(t) {
  var fl = t.split(/\r?\n/)[0],
    sc = (fl.match(/;/g) || []).length,
    cc = (fl.match(/,/g) || []).length,
    dl = sc > 0 && sc >= cc ? ';' : fl.indexOf('\t') >= 0 ? '\t' : ',',
    rows = [],
    row = [],
    f = '',
    q = false,
    i,
    ch;
  for (i = 0; i < t.length; i++) {
    ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === dl) {
      row.push(f);
      f = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else f += ch;
  }
  if (f !== '' || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(function (r) {
    return r.some(function (x) {
      return x.trim();
    });
  });
}

/** Ubah "YYYY-MM-DD" atau "DD/MM/YYYY" menjadi "YYYY-MM-DD"; string kosong bila tidak valid. */
function normDate(s) {
  s = String(s || '').trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),
    y,
    mo,
    d;
  if (m) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
  } else {
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!m) return '';
    d = +m[1];
    mo = +m[2];
    y = +m[3];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
}

/** Ubah baris CSV menjadi item. Kolom: Nama; Harga; Tiap; Satuan; Mulai; Sampai; Jumlah kali; Kategori. @returns {ok, bad} */
function csvItems(rows) {
  var ok = [],
    bad = 0,
    U = { hari: 1, minggu: 1, bulan: 1, tahun: 1, sekali: 1 };
  rows.forEach(function (r, i) {
    if (i === 0 && !/\d/.test(r[1] || '')) return;
    var nm = (r[0] || '').trim(),
      pr = parseRp(r[1] || ''),
      n = Math.max(1, parseInt(r[2], 10) || 1),
      u = (r[3] || 'bulan').trim().toLowerCase(),
      d = normDate(r[4]);
    if (!nm || pr <= 0 || !U[u] || !d) {
      bad++;
      return;
    }
    ok.push({
      name: nm,
      price: pr,
      n: n,
      unit: u,
      start: d,
      end: normDate(r[5]),
      cnt: Math.max(0, parseInt(r[6], 10) || 0),
      cat: String(r[7] || '')
        .trim()
        .slice(0, 30),
    });
  });
  return { ok: ok, bad: bad };
}
