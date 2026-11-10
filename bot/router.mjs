// Router perintah bot — fungsi murni: (teks, state ALL) -> { text, changed }.
// Angka dihitung oleh modul aplikasi (core.mjs), bukan rumus baru.
import {
  setS, state, calc, occ, priceAt, isoD, rp, MON, FULL_MON, parseQuickItem,
  kasLinked, kasBase, kasRows, kasSum, todayISO, mNorm, esc,
} from './core.mjs';

const HELP = [
  '🤖 Rencana Keuangan — perintah',
  '',
  '@keterangan — daftar ini',
  '@saldo — saldo realtime & sisa akhir tahun',
  '@jatah — jatah jajan per bulan',
  '@tagihan — jatuh tempo 7 hari & yang telat',
  '@rekap [bulan] — ringkas satu bulan (mis. @rekap nov)',
  '@cari <kata> — cari item',
  '@debug — sidik state yang dipakai bot (bandingkan dengan web)',
  '',
  '@beli <teks> — Tambah Cepat (format sama dengan tab Kelola Item)',
  '   contoh: @beli Netflix 186k tiap tgl 15',
  '           @beli Gym 300k tiap 2 minggu mulai 2027-02-05',
  '@lunas <nama> [tgl] — tandai tagihan lunas',
  '@hapus <nama|id> — hapus item',
  '',
  'Laporan PDF:',
  '@laporanharian [tgl] — laporan hari ini (atau 2027-11-05)',
  '@laporanmingguan — 7 hari terakhir',
  '@laporanbulanan [bln] — sebulan (mis. @laporanbulanan nov)',
  '@laporantahun — rekap 12 bulan',
].join('\n');

const d = (iso) => new Date(iso + 'T00:00:00Z');
let CUR = null;
const dayDiff = (a, b) => Math.round((d(a) - d(b)) / 864e5);
const tgl = (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4);

/** Siapkan state tahun aktif; isi field yang mungkin kosong. */
export function bind(all) {
  if (!all || typeof all !== 'object') throw new Error('state kosong');
  all.data = all.data || {};
  all.year = +all.year || +Object.keys(all.data).sort().pop() || new Date().getFullYear();
  const s = (all.data[all.year] = all.data[all.year] || {});
  s.year = +all.year;
  s.saldo = +s.saldo || 0;
  s.startMonth = +s.startMonth || 0;
  s.items = s.items || [];
  s.paid = s.paid || {};
  s.skip = s.skip || {};
  s.adj = s.adj || [];
  s.real = s.real || {};
  all.kas = all.kas || { pr: {} };
  all.kas.pr = all.kas.pr || {};
  setS(all, s);
  CUR = all;
  return s;
}

// Samakan dengan kartu Rincian: hanya transaksi s.d. bulan saldo (S.startMonth), bukan seluruh tahun.
function kasBal() {
  const S = state().s, P = kasLinked(), sm = +S.startMonth || 0;
  if (!P) return null;
  const rows = kasRows(P).filter((x) => +x.d.slice(5, 7) - 1 <= sm);
  return { bal: kasBase(P) + kasSum(rows).i - kasSum(rows).o, A: kasSum(rows), mName: FULL_MON[sm] };
}

function saldoText() {
  const S = state().s, c = calc(), KB = kasBal();
  const out = [];
  if (KB) {
    out.push('💰 Saldo realtime ' + KB.mName + ': ' + rp(KB.bal));
    out.push('📥 Masuk ' + rp(KB.A.i) + ' · 📤 Keluar ' + rp(KB.A.o) + ' (' + KB.A.n + ' transaksi)');
  } else {
    out.push('💰 Saldo awal ' + S.year + ': ' + rp(S.saldo));
  }
  out.push('📉 Sisa akhir Des ' + S.year + ': ' + rp(c.end));
  out.push('🧾 Total tagihan ' + S.year + ': ' + rp(c.total));
  return out.join('\n');
}

function debugText() {
  const S = state().s, c = calc(), P = kasLinked();
  const rows = P ? kasRows(P) : [];
  return [
    '🔎 Sidik state',
    'year=' + S.year + ' | startMonth=' + (+S.startMonth || 0) + ' | rev=' + ((CUR && CUR.rev) || '-'),
    'saldo awal=' + rp(S.saldo) + ' | item=' + (S.items || []).length + ' | paid=' + Object.keys(S.paid || {}).length,
    'end=' + rp(c.end) + ' | total=' + rp(c.total),
    'kas profil=' + (P ? P.name : '-') + ' | transaksi=' + rows.length + ' | profil=' + Object.keys(((CUR && CUR.kas) || {}).pr || {}).length,
  ].join('\n');
}

function jatahText() {
  const S = state().s, c = calc(), n = Math.max(1, 12 - (+S.startMonth || 0));
  return '🧁 Jatah jajan per bulan: ' + (c.end > 0 ? rp(c.end / n) : '—') + '\n' +
    '(sisa ' + rp(c.end) + ' dibagi ' + n + ' bulan)';
}

function tagihanText() {
  const S = state().s, today = todayISO(), yt = +today.slice(0, 4), soon = [], late = [], seen = {};
  S.items.forEach((it) => {
    [yt, yt + 1].forEach((y) => occ(it, y).forEach((t) => {
      const ds = isoD(t), k = it.id + '|' + ds;
      if (seen[k] || S.paid[k] || S.skip[k]) return;
      seen[k] = 1;
      const dd = dayDiff(ds, today), row = { ds: ds, name: it.name, amt: priceAt(it, t), dd: dd };
      if (dd < 0) late.push(row);
      else if (dd <= 7) soon.push(row);
    }));
  });
  late.sort((a, b) => (a.ds < b.ds ? -1 : 1));
  soon.sort((a, b) => (a.ds < b.ds ? -1 : 1));
  if (!late.length && !soon.length) return '✅ Tidak ada tagihan telat atau jatuh tempo 7 hari ke depan.';
  const line = (r) => '• ' + tgl(r.ds) + ' — ' + r.name + ' ' + rp(r.amt) +
    (r.dd < 0 ? ' (telat ' + -r.dd + ' hari)' : r.dd === 0 ? ' (hari ini)' : ' (' + r.dd + ' hari lagi)');
  const out = [];
  if (late.length) out.push('⚠️ Telat (' + late.length + '):', ...late.map(line), '');
  if (soon.length) out.push('📅 7 hari ke depan (' + soon.length + '):', ...soon.map(line));
  return out.join('\n').trim();
}

function beliText(arg) {
  const S = state().s;
  if (!arg) return '⚠️ Format: @beli Netflix 186k tiap tgl 15';
  const r = parseQuickItem(arg, +S.year);
  if (r.error) return '⚠️ ' + r.error;
  const it = { id: Date.now(), name: r.name, price: r.price, n: r.n, unit: r.unit, start: r.start, stop: 'none', cnt: 0, end: '', cat: '', ch: [] };
  S.items.push(it);
  return '✅ Ditambah: ' + esc(it.name) + ' — ' + rp(it.price) +
    ' tiap ' + (it.n > 1 ? it.n + ' ' : '') + it.unit + ', mulai ' + tgl(it.start) +
    '\n(id ' + it.id + ')';
}

function findItems(q) {
  const nq = mNorm(q || '');
  if (!nq) return [];
  return state().s.items.filter((it) => mNorm(it.name).indexOf(nq) >= 0 || String(it.id) === q.trim());
}

function lunasText(arg) {
  const S = state().s, y = +S.year, today = todayISO();
  const parts = arg.split(/\s+/);
  const dateArg = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
  const nameQ = parts.filter((p) => p !== dateArg).join(' ');
  const hits = findItems(nameQ);
  if (!hits.length) return '⚠️ Item "' + nameQ + '" tidak ketemu. Coba @cari <kata>.';
  if (hits.length > 1) return '⚠️ Ada ' + hits.length + ' item mirip:\n' + hits.map((x) => '• ' + x.name + ' (id ' + x.id + ')').join('\n') + '\nTulis nama lebih spesifik atau pakai id.';
  const it = hits[0];
  let cand = occ(it, y).filter((t) => !S.paid[isoD(t)] && !S.skip[isoD(t)]).map(isoD);
  if (dateArg) {
    if (cand.indexOf(dateArg) < 0) return '⚠️ Tanggal ' + dateArg + ' bukan tagihan ' + it.name + ' yang belum lunas.';
    cand = [dateArg];
  } else {
    cand = cand.filter((x) => x >= today);
    if (!cand.length) return '⚠️ Tidak ada tagihan ' + it.name + ' yang belum lunas.';
  }
  const ds = cand.sort()[0];
  S.paid[it.id + '|' + ds] = 1;
  return '✅ Lunas: ' + it.name + ' — ' + tgl(ds) + ' ' + rp(priceAt(it, d(ds).getTime()));
}

function hapusText(arg) {
  const S = state().s, hits = findItems(arg);
  if (!hits.length) return '⚠️ Item "' + arg + '" tidak ketemu.';
  if (hits.length > 1) return '⚠️ Ada ' + hits.length + ' item mirip:\n' + hits.map((x) => '• ' + x.name + ' (id ' + x.id + ')').join('\n') + '\nPakai id.';
  const it = hits[0];
  S.items = S.items.filter((x) => x.id !== it.id);
  Object.keys(S.paid).forEach((k) => { if (k.indexOf(it.id + '|') === 0) delete S.paid[k]; });
  Object.keys(S.skip).forEach((k) => { if (k.indexOf(it.id + '|') === 0) delete S.skip[k]; });
  return '🗑️ Dihapus: ' + it.name;
}

function cariText(arg) {
  const hits = findItems(arg);
  if (!hits.length) return '⚠️ Tidak ada item yang cocok dengan "' + arg + '".';
  return '🔎 ' + hits.length + ' item:\n' + hits.slice(0, 20).map((it) =>
    '• ' + it.name + ' — ' + rp(it.price) + ' tiap ' + (it.n > 1 ? it.n + ' ' : '') + it.unit + ' (id ' + it.id + ')').join('\n');
}

function rekapText(arg) {
  const S = state().s, c = calc(), y = +S.year;
  const key = (arg || '').toLowerCase().trim();
  let mi = null;
  if (!key) mi = Math.min(11, Math.max(0, new Date().getUTCMonth()));
  else {
    const names = FULL_MON.map((x) => x.toLowerCase());
    const i = names.findIndex((x) => x.indexOf(key) === 0 || MON[names.indexOf(x)].toLowerCase() === key);
    if (i >= 0) mi = i;
    else if (/^\d{1,2}$/.test(key)) mi = Math.min(11, Math.max(0, +key - 1));
    else return '⚠️ Bulan tidak dikenal. Contoh: @rekap nov atau @rekap 11.';
  }
  const row = c.rows.find((r) => r.m === mi);
  const P = kasLinked();
  let masuk = 0, keluar = 0;
  if (P) kasRows(P).forEach((x) => {
    if (x.d.slice(0, 7) !== y + '-' + String(mi + 1).padStart(2, '0')) return;
    if (x.t === '+') masuk += x.amt; else keluar += x.amt;
  });
  const out = ['📊 Rekap ' + FULL_MON[mi] + ' ' + y];
  if (P) out.push('📥 Masuk ' + rp(masuk));
  const jadwal = row ? row.sp : 0;
  out.push('💸 Keluar ' + rp(jadwal + keluar) + ' (jadwal ' + rp(jadwal) + ' + kas ' + rp(keluar) + ')');
  if (row) out.push('📈 Saldo akhir bulan ' + rp(row.ak));
  else out.push('ℹ️ Bulan ini di luar rentang tahun aktif (mulai ' + FULL_MON[+S.startMonth || 0] + ').');
  return out.join('\n');
}

/** Balas satu pesan. Mengembalikan teks balasan; `changed` = state perlu disimpan. */
export function reply(raw, all) {
  bind(all);
  const text = String(raw || '').trim();
  const head = text.match(/^[@/]?([a-zA-Z]+)/);
  const cmd = head ? head[1].toLowerCase() : '';
  const arg = head ? text.slice(head[0].length).trim() : text;
  const mut = (fn) => ({ text: fn(), changed: true });

  switch (cmd) {
    case 'keterangan': case 'help': case 'bantuan': case 'start': case 'menu':
      return { text: HELP, changed: false };
    case 'saldo': case 'saldoku':
      return { text: saldoText(), changed: false };
    case 'jatah': case 'jajan':
      return { text: jatahText(), changed: false };
    case 'debug': case 'sidik':
      return { text: debugText(), changed: false };
    case 'tagihan': case 'tempo': case 'jatuh':
      return { text: tagihanText(), changed: false };
    case 'beli': case 'tambah': case 'tambahcepat':
      return mut(() => beliText(arg));
    case 'lunas': case 'bayar':
      return arg ? mut(() => lunasText(arg)) : { text: '⚠️ Format: @lunas Netflix atau @lunas Netflix 2027-11-15', changed: false };
    case 'hapus':
      return arg ? mut(() => hapusText(arg)) : { text: '⚠️ Format: @hapus Netflix', changed: false };
    case 'cari':
      return { text: cariText(arg), changed: false };
    case 'rekap':
      return { text: rekapText(arg), changed: false };
    default:
      return { text: '❓ Perintah tidak dikenal: ' + (cmd || text) + '\nKirim @keterangan untuk daftar perintah.', changed: false };
  }
}
