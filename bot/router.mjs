// Router perintah bot — fungsi murni: (teks, state ALL) -> { text, changed }.
// Angka dihitung oleh modul aplikasi (core.mjs), bukan rumus baru.
import {
  setS, state, calc, occ, priceAt, isoD, rp, MON, FULL_MON, parseQuickItem,
  kasLinked, kasBase, kasRows, kasSum, todayISO, mNorm, esc, parseRp,
} from './core.mjs';

const HELP = [
  '🤖 Rencana Keuangan — perintah',
  '',
  '📊 Lihat:',
  '@saldo — saldo realtime, bulan ini, sisa akhir tahun',
  '@jatah — jatah jajan per bulan',
  '@tagihan — jatuh tempo 7 hari & yang telat',
  '@jadwal [bln] — semua tagihan satu bulan',
  '@rekap [bln] [thn] — ringkas satu bulan (mis. @rekap nov 2027)',
  '@kas [n] — transaksi kas terakhir',
  '@cari <kata> — cari item',
  '@debug — sidik state yang dipakai bot',
  '',
  '💸 Catat kas:',
  '@masuk 500k gaji — uang masuk',
  '@keluar 25k kopi — uang keluar',
  '',
  '💳 Utang & piutang:',
  '@utang Budi motor 500k — saya berutang',
  '@piutang Ani 200k — orang berutang',
  '@bayarutang Budi motor 300k — bayar (boleh dicicil)',
  '@bayarpiutang Ani — terima pembayaran penuh',
  '@utangku — sisa utang & piutang',
  '',
  '📅 Item:',
  '@beli <teks> — Tambah Cepat (format sama dengan tab Kelola Item)',
  '   contoh: @beli Netflix 186k tiap tgl 15',
  '           @beli Gym 300k tiap 2 minggu mulai 2027-02-05',
  '@lunas <nama> [tgl] — tandai tagihan lunas',
  '@hapus <nama|id> — hapus item',
  '@tahun — daftar tahun & yang aktif',
  '@pakai 2027 — ganti tahun aktif',
  '',
  '📄 Laporan PDF:',
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

// Angka satu bulan persis seperti kartu "Pemasukan vs pengeluaran" (jadwal + kas).
function monthKas(mi) {
  const S = state().s, P = kasLinked(), y = +S.year;
  let masuk = 0, keluar = 0;
  if (P) kasRows(P).forEach((x) => {
    if (x.d.slice(0, 7) !== y + '-' + String(mi + 1).padStart(2, '0')) return;
    if (x.t === '+') masuk += x.amt; else keluar += x.amt;
  });
  const row = calc().rows.find((r) => r.m === mi);
  return { masuk, keluar, jadwal: row ? row.sp : 0, ak: row ? row.ak : null };
}

function saldoText() {
  const S = state().s, c = calc(), KB = kasBal(), sm = +S.startMonth || 0, M = monthKas(sm);
  const out = [];
  if (KB) out.push('💰 Saldo realtime ' + KB.mName + ': ' + rp(KB.bal));
  else out.push('💰 Saldo awal ' + S.year + ': ' + rp(S.saldo));
  out.push('📊 ' + KB.mName + ': masuk ' + rp(M.masuk) + ' · keluar ' + rp(M.jadwal + M.keluar) +
    ' (jadwal ' + rp(M.jadwal) + ' + kas ' + rp(M.keluar) + ')');
  out.push('📉 Sisa akhir Des ' + S.year + ': ' + rp(c.end));
  out.push('🧾 Rencana tagihan ' + S.year + ': ' + rp(c.total));
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

const ALIAS_MON = { nopember: 'november', pebruari: 'februari', okt: 'oktober', des: 'desember' };

function monthArg(key) {
  key = String(key || '').toLowerCase().trim();
  if (!key) return Math.min(11, Math.max(0, new Date().getUTCMonth()));
  if (ALIAS_MON[key]) key = ALIAS_MON[key];
  const names = FULL_MON.map((x) => x.toLowerCase()), short = MON.map((x) => x.toLowerCase());
  let i = names.indexOf(key);
  if (i < 0) i = names.findIndex((x) => x.indexOf(key) === 0 && key.length >= 3);
  if (i < 0) i = short.indexOf(key);
  if (i >= 0) return i;
  if (/^\d{1,2}$/.test(key)) return Math.min(11, Math.max(0, +key - 1));
  return null;
}

// @rekap [bln] [thn] — tahun lain dihitung sementara tanpa mengubah tahun aktif.
function rekapText(arg) {
  const parts = String(arg || '').trim().split(/\s+/).filter(Boolean);
  let y = null;
  const words = [];
  parts.forEach((p) => { if (!y && /^\d{4}$/.test(p)) y = +p; else words.push(p); });
  const mi = monthArg(words.join(' '));
  if (mi === null) return '⚠️ Bulan tidak dikenal. Contoh: @rekap nov atau @rekap nov 2027';
  const S0 = state().s;
  if (y && y !== +S0.year) {
    const target = CUR && CUR.data && CUR.data[y];
    if (!target) return '⚠️ Tahun ' + y + ' belum ada. Lihat @tahun';
    setS(CUR, target);
    try { return rekapBody(mi, y); } finally { setS(CUR, S0); }
  }
  return rekapBody(mi, +S0.year);
}

function rekapBody(mi, y) {
  const S = state().s, c = calc(), row = c.rows.find((r) => r.m === mi), M = monthKas(mi), P = kasLinked();
  const out = ['📊 Rekap ' + FULL_MON[mi] + ' ' + y];
  if (P) out.push('📥 Masuk ' + rp(M.masuk));
  out.push('💸 Keluar ' + rp(M.jadwal + M.keluar) + ' (jadwal ' + rp(M.jadwal) + ' + kas ' + rp(M.keluar) + ')');
  if (row) out.push('📈 Saldo akhir bulan ' + rp(row.ak));
  else out.push('ℹ️ Bulan ini di luar rentang tahun aktif (mulai ' + FULL_MON[+S.startMonth || 0] + ').');
  return out.join('\n');
}

/* ---------- Catatan kas, jadwal, utang, tahun ---------- */

// Transaksi baru pada profil kas terpilih; bentuknya sama dengan form web.
function newTx(o) {
  const P = kasLinked();
  if (!P) return { err: '⚠️ Belum ada profil Catatan Kas.' };
  P.tx = P.tx || [];
  P.tx.push(Object.assign({
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    d: todayISO(), cat: '', note: '',
  }, o));
  const KB = kasBal(), ty = todayISO().slice(0, 4), ay = String(state().s.year);
  return { ok: '✅ ' + (o.t === '+' ? 'Masuk' : 'Keluar') + ' ' + rp(o.amt) +
    (o.note ? ' · ' + o.note : '') + '\n💰 Saldo realtime ' + (KB ? rp(KB.bal) : '-') +
    (ty !== ay ? '\nℹ️ Tanggal ' + tgl(todayISO()) + ' masuk tahun ' + ty + ', bukan tahun aktif ' + ay +
      '. Ganti dengan @pakai ' + ty + ' bila ingin dihitung.' : '') };
}

// "Budi motor 500k" -> { name:'Budi motor', amt:500000, note:'' }
function splitAmtName(arg) {
  const parts = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const i = parts.findIndex((p) => parseRp(p) > 0);
  if (i < 0) return null;
  return {
    amt: parseRp(parts[i]),
    name: parts.slice(0, i).join(' ').trim(),
    note: parts.slice(i + 1).join(' ').trim(),
  };
}

function kasInOut(arg, t) {
  const p = splitAmtName(arg);
  if (!p) return '⚠️ Format: @' + (t === '+' ? 'masuk' : 'keluar') + ' 500k gaji';
  const note = (p.name + ' ' + p.note).trim().slice(0, 80);
  const r = newTx({ t, amt: p.amt, note });
  return r.err || r.ok;
}

function kasText(arg) {
  const P = kasLinked();
  if (!P) return '⚠️ Belum ada profil Catatan Kas.';
  const n = Math.min(30, Math.max(1, parseInt(arg, 10) || 10));
  const tx = kasRows(P).slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)).slice(0, n);
  if (!tx.length) return 'Belum ada transaksi kas.';
  return ['🧾 ' + tx.length + ' transaksi terakhir',
    ...tx.map((x) => (x.t === '+' ? '📥 ' : '📤 ') + rp(x.amt) + ' · ' + tgl(x.d) + (x.note ? ' · ' + x.note : ''))].join('\n');
}

function jadwalText(arg) {
  const S = state().s, y = +S.year, mi = monthArg(arg);
  if (mi === null) return '⚠️ Bulan tidak dikenal. Contoh: @jadwal nov';
  const rows = [];
  let total = 0, unpaid = 0;
  S.items.forEach((it) => occ(it, y).forEach((t) => {
    const ds = isoD(t);
    if (+ds.slice(5, 7) - 1 !== mi) return;
    const k = it.id + '|' + ds, amt = priceAt(it, t);
    const done = !!S.paid[k], skip = !!S.skip[k];
    total += amt;
    if (!done && !skip) unpaid += amt;
    rows.push({ d: ds, name: it.name, amt, done, skip });
  }));
  if (!rows.length) return '📭 Tidak ada tagihan terjadwal di ' + FULL_MON[mi] + ' ' + y + '.';
  rows.sort((a, b) => (a.d < b.d ? -1 : 1));
  return ['🗓️ Jadwal ' + FULL_MON[mi] + ' ' + y + ' (' + rows.length + ' tagihan)',
    ...rows.map((r) => (r.done ? '✅ ' : r.skip ? '⏭️ ' : '• ') + +r.d.slice(8, 10) + ' ' + r.name + ' — ' + rp(r.amt)),
    'Total ' + rp(total) + ' · belum lunas ' + rp(unpaid)].join('\n');
}

// Sisa utang/piutang per nama — logika sama dengan kartu "Utang & piutang" di web.
function debtRows() {
  const P = kasLinked(), g = {};
  ((P && P.tx) || []).forEach((x) => {
    if (!x.debt || x.debtDone) return;
    const n = (x.debtName || x.note || x.cat || 'Tanpa nama').trim().slice(0, 40) || 'Tanpa nama';
    const o = g[n] || (g[n] = { name: n, u: 0, p: 0, bu: 0, bp: 0 });
    if (x.debtKind === 'utang') o.u += x.amt;
    else if (x.debtKind === 'piutang') o.p += x.amt;
    else if (x.debtKind === 'bayar-utang') o.bu += x.amt;
    else if (x.debtKind === 'bayar-piutang') o.bp += x.amt;
  });
  return Object.keys(g)
    .map((k) => { const o = g[k]; o.su = Math.max(0, o.u - o.bu); o.sp = Math.max(0, o.p - o.bp); return o; })
    .filter((o) => o.su > 0 || o.sp > 0);
}

function utangText() {
  const D = debtRows();
  if (!D.length) return '✅ Tidak ada utang atau piutang tercatat.';
  const su = D.reduce((a, b) => a + b.su, 0), sp = D.reduce((a, b) => a + b.sp, 0);
  const out = ['💳 Saya berutang: ' + rp(su), '🤝 Orang berutang: ' + rp(sp)];
  D.forEach((x) => {
    if (x.su) out.push('• ' + x.name + ' — saya berutang ' + rp(x.su));
    if (x.sp) out.push('• ' + x.name + ' — orang berutang ' + rp(x.sp));
  });
  out.push('Bayar: @bayarutang <nama> [jumlah]');
  return out.join('\n');
}

function utangNew(arg, kind) {
  const p = splitAmtName(arg);
  if (!p || !p.name) return '⚠️ Format: @' + (kind === 'utang' ? 'utang' : 'piutang') + ' Budi motor 500k';
  const r = newTx({ t: kind === 'utang' ? '+' : '-', amt: p.amt, note: p.note || p.name, debt: true, debtName: p.name, debtKind: kind });
  return r.err || r.ok;
}

function utangPay(arg, kind) {
  const parts = String(arg || '').trim().split(/\s+/).filter(Boolean);
  let amt = 0;
  if (parts.length > 1 && parseRp(parts[parts.length - 1]) > 0) amt = parseRp(parts.pop());
  const name = parts.join(' ').trim();
  if (!name) return '⚠️ Format: @' + (kind === 'bayar-utang' ? 'bayarutang' : 'bayarpiutang') + ' Budi motor 300k';
  const D = debtRows(), n = name.toLowerCase();
  const hit = D.find((x) => x.name.toLowerCase() === n) || D.find((x) => x.name.toLowerCase().indexOf(n) >= 0);
  if (!hit) return '⚠️ Tidak ada utang/piutang "' + name + '". Lihat @utangku';
  const sisa = kind === 'bayar-utang' ? hit.su : hit.sp;
  if (sisa <= 0) return '✅ ' + hit.name + ' sudah lunas.';
  const use = amt > 0 ? Math.min(amt, sisa) : sisa;
  const r = newTx({ t: kind === 'bayar-utang' ? '-' : '+', amt: use, note: hit.name, debt: true, debtName: hit.name, debtKind: kind });
  return r.err || (r.ok + '\nSisa ' + hit.name + ': ' + rp(sisa - use));
}

function tahunList() {
  const all = CUR || {};
  return Object.keys(all.data || {}).map(Number).sort();
}

function tahunText() {
  const all = CUR || {}, ys = tahunList();
  const rows = ys.map((y) => {
    const d = all.data[y] || {};
    return (y === +all.year ? '▶️ ' : '• ') + y + ' — ' + (d.items || []).length + ' item, saldo awal ' + rp(+d.saldo || 0);
  });
  return ['📅 Tahun di data bot (sumber: Supabase):', ...(rows.length ? rows : ['(kosong)']),
    '', 'Aktif: ' + all.year,
    'Ganti: @pakai ' + (ys.filter((y) => y !== +all.year)[0] || ys[0] || '2027'),
    'Bulan lain: @rekap november 2026'].join('\n');
}

function pakaiText(arg) {
  const y = +String(arg || '').trim(), ys = tahunList();
  if (!y || !CUR || !CUR.data || !CUR.data[y]) {
    return '⚠️ Tahun "' + (arg || '') + '" tidak ada di data bot.\nTersedia: ' + (ys.join(', ') || '-') +
      '\nKalau di web tahun itu ada, berarti web belum menyimpannya ke Supabase: buka web, pastikan sinkronisasi aktif, simpan sekali, lalu coba lagi.';
  }
  CUR.year = y;
  bind(CUR);
  return '✅ Tahun aktif: ' + y + '\n\n' + saldoText();
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
    case 'jadwal': case 'jadwalbayar': case 'agenda':
      return { text: jadwalText(arg), changed: false };
    case 'kas': case 'riwayat': case 'catatan':
      return { text: kasText(arg), changed: false };
    case 'masuk': case 'masukin': case 'in': case 'terima':
      return mut(() => kasInOut(arg, '+'));
    case 'keluar': case 'out': case 'belanja':
      return mut(() => kasInOut(arg, '-'));
    case 'utang': case 'hutang':
      return arg ? mut(() => utangNew(arg, 'utang')) : { text: utangText(), changed: false };
    case 'utangku': case 'hutangku': case 'piutangku':
      return { text: utangText(), changed: false };
    case 'piutang':
      return arg ? mut(() => utangNew(arg, 'piutang')) : { text: utangText(), changed: false };
    case 'bayarutang': case 'bayarhutang':
      return arg ? mut(() => utangPay(arg, 'bayar-utang')) : { text: '⚠️ Format: @bayarutang Budi motor 300k', changed: false };
    case 'bayarpiutang':
      return arg ? mut(() => utangPay(arg, 'bayar-piutang')) : { text: '⚠️ Format: @bayarpiutang Ani 200k', changed: false };
    case 'tahun': case 'daftartahun':
      return { text: tahunText(), changed: false };
    case 'pakai': case 'gantitahun': case 'tahunaktif':
      return mut(() => pakaiText(arg));
    default:
      return { text: '❓ Perintah tidak dikenal: ' + (cmd || text) + '\nKirim @keterangan untuk daftar perintah.', changed: false };
  }
}
