// Susun data laporan (harian/mingguan/bulanan/tahunan) dari state yang sama dengan web.
import { bind } from './router.mjs';
import { calc, occ, priceAt, isoD, rp, MON, FULL_MON, kasLinked, kasRows, todayISO, state } from './core.mjs';

const KINDS = {
  laporanhariini: 'harian', laporanharian: 'harian', hariini: 'harian',
  laporanmingguan: 'mingguan', minggu: 'mingguan',
  laporanbulanan: 'bulanan', bulan: 'bulanan',
  laporantahun: 'tahun', laporan: 'tahun', tahun: 'tahun',
};

export function reportKind(text) {
  const m = String(text || '').trim().match(/^[@/]?([a-zA-Z]+)/);
  return m ? KINDS[m[1].toLowerCase()] || null : null;
}

export function reportArg(text) {
  const m = String(text || '').trim().match(/^[@/]?[a-zA-Z]+/);
  return m ? text.trim().slice(m[0].length).trim() : '';
}

const D = (iso) => new Date(iso + 'T00:00:00Z');
const addD = (iso, n) => isoD(D(iso).getTime() + n * 864e5);
const tglID = (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4);

function monthFromArg(arg) {
  const key = String(arg || '').toLowerCase().trim();
  if (!key) return new Date().getUTCMonth();
  const names = FULL_MON.map((x) => x.toLowerCase());
  const i = names.findIndex((x) => x.indexOf(key) === 0);
  if (i >= 0) return i;
  if (/^\d{1,2}$/.test(key) && +key >= 1 && +key <= 12) return +key - 1;
  return -1;
}

/** Kumpulkan transaksi kas & tagihan dalam rentang tanggal (inklusif). */
function collect(from, to) {
  const S = state().s, P = kasLinked(), tx = [], bil = [];
  if (P) kasRows(P).forEach((x) => {
    if (x.d >= from && x.d <= to) tx.push({ d: x.d, cat: x.cat || '-', note: x.note || '', t: x.t, amt: x.amt });
  });
  const y0 = +from.slice(0, 4), y1 = +to.slice(0, 4);
  for (let y = y0; y <= y1; y++) {
    S.items.forEach((it) => occ(it, y).forEach((t) => {
      const ds = isoD(t);
      if (ds < from || ds > to) return;
      const k = it.id + '|' + ds;
      bil.push({ d: ds, name: it.name, cat: it.cat || '-', amt: priceAt(it, t), st: S.paid[k] ? 'Lunas' : S.skip[k] ? 'Dilewati' : 'Belum' });
    }));
  }
  tx.sort((a, b) => (a.d < b.d ? -1 : 1));
  bil.sort((a, b) => (a.d < b.d ? -1 : 1));
  return { tx: tx, bil: bil };
}

function tablesFor(tx, bil) {
  return [
    {
      head: 'TRANSAKSI KAS',
      cols: [{ t: 'TANGGAL', w: 16 }, { t: 'KETERANGAN', w: 38 }, { t: 'KATEGORI', w: 18 }, { t: 'NOMINAL', w: 28, align: 'r', bold: true }],
      rows: tx.length ? tx.map((x) => [tglID(x.d), (x.note || x.cat) + (x.note && x.cat !== '-' ? '' : ''), x.cat, (x.t === '+' ? '+ ' : '- ') + rp(x.amt)])
        : [['-', 'tidak ada transaksi', '-', '-']],
      total: tx.length ? ['Total', (tx.reduce((s, x) => s + (x.t === '+' ? x.amt : -x.amt), 0) >= 0 ? '+ ' : '- ') + rp(tx.reduce((s, x) => s + (x.t === '+' ? x.amt : -x.amt), 0))] : null,
    },
    {
      head: 'TAGIHAN',
      cols: [{ t: 'TANGGAL', w: 16 }, { t: 'ITEM', w: 40 }, { t: 'STATUS', w: 16 }, { t: 'NOMINAL', w: 28, align: 'r', bold: true }],
      rows: bil.length ? bil.map((b) => [tglID(b.d), b.name, b.st, rp(b.amt)]) : [['-', 'tidak ada tagihan', '-', '-']],
      total: bil.length ? ['Total tagihan', rp(bil.reduce((s, b) => s + b.amt, 0))] : null,
    },
  ];
}

function sums(tx) {
  let i = 0, o = 0;
  tx.forEach((x) => { if (x.t === '+') i += x.amt; else o += x.amt; });
  return { i: i, o: o, n: i - o };
}

export function build(kind, arg, all) {
  const S = bind(all), c = calc(), y = +S.year, today = todayISO();
  const sum = (tx) => { const s = sums(tx); return [['Masuk', rp(s.i)], ['Keluar', rp(s.o)], ['Selisih', rp(s.n)]]; };

  if (kind === 'harian') {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : today;
    const { tx, bil } = collect(day, day);
    return {
      filename: 'laporan-harian-' + day + '.pdf',
      title: 'Laporan Harian',
      subtitle: tglID(day) + ' | ' + y,
      summary: sum(tx).concat([['Tagihan jatuh tempo', rp(bil.reduce((s, b) => s + b.amt, 0))]]),
      tables: tablesFor(tx, bil),
    };
  }

  if (kind === 'mingguan') {
    const to = today, from = addD(today, -6);
    const { tx, bil } = collect(from, to);
    return {
      filename: 'laporan-mingguan-' + to + '.pdf',
      title: 'Laporan Mingguan',
      subtitle: tglID(from) + ' - ' + tglID(to) + ' | ' + y,
      summary: sum(tx).concat([['Tagihan 7 hari', rp(bil.reduce((s, b) => s + b.amt, 0))]]),
      tables: tablesFor(tx, bil),
    };
  }

  if (kind === 'bulanan') {
    const mi = monthFromArg(arg);
    if (mi < 0) return { error: 'Bulan tidak dikenal. Contoh: @laporanbulanan nov atau @laporanbulanan 11.' };
    const first = y + '-' + String(mi + 1).padStart(2, '0') + '-01';
    const last = isoD(Date.UTC(y, mi + 1, 0));
    const { tx, bil } = collect(first, last);
    const row = c.rows.find((r) => r.m === mi);
    return {
      filename: 'laporan-bulanan-' + y + '-' + String(mi + 1).padStart(2, '0') + '.pdf',
      title: 'Laporan Bulanan',
      subtitle: FULL_MON[mi] + ' ' + y,
      summary: sum(tx).concat([
        ['Tagihan bulan', rp(bil.reduce((s, b) => s + b.amt, 0))],
        ['Saldo akhir bulan', row ? rp(row.ak) : '-'],
      ]),
      tables: tablesFor(tx, bil),
    };
  }

  // tahunan: tabel per bulan + rincian 12 bulan
  const txYear = collect(y + '-01-01', y + '-12-31').tx;
  const rows = c.rows.map((r) => {
    const mi = r.m, mkey = y + '-' + String(mi + 1).padStart(2, '0');
    const t = txYear.filter((x) => x.d.slice(0, 7) === mkey), s = sums(t);
    return [FULL_MON[mi], s.i ? rp(s.i) : '-', s.o ? rp(s.o) : '-', rp(r.sp), rp(r.ak)];
  });
  const tot = sums(txYear);
  return {
    filename: 'laporan-tahunan-' + y + '.pdf',
    title: 'Laporan Tahunan',
    subtitle: String(y) + ' | ' + S.items.length + ' item aktif',
    summary: [['Masuk', rp(tot.i)], ['Keluar', rp(tot.o)], ['Selisih', rp(tot.n)], ['Total tagihan', rp(c.total)]],
    tables: [{
      head: 'PER BULAN',
      cols: [{ t: 'BULAN', w: 20 }, { t: 'MASUK', w: 20, align: 'r' }, { t: 'KELUAR', w: 20, align: 'r' }, { t: 'TAGIHAN', w: 20, align: 'r' }, { t: 'SALDO AKHIR', w: 20, align: 'r', bold: true }],
      rows: rows,
      total: ['Sisa akhir Des ' + y, rp(c.end)],
    }],
  };
}
