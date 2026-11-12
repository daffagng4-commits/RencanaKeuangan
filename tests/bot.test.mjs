// Uji bot: angka harus sama dengan modul aplikasi (core.mjs), bukan angka baru.
import test from 'node:test';
import assert from 'node:assert';
import { reply } from '../bot/router.mjs';
import { fixture } from '../bot/dev.mjs';
import { calc, state, rp, kasLinked, kasBase, kasRows, kasSum, isoD, occ, priceAt, smEff } from '../bot/core.mjs';

test('@saldo memakai angka calc() aplikasi', () => {
  const all = fixture();
  const r = reply('@saldo', all);
  const c = calc(), P = kasLinked();
  const rows = kasRows(P).filter((x) => +x.d.slice(5, 7) - 1 <= smEff());
  const sum = kasSum(rows);
  assert.ok(r.text.includes(rp(c.end)), 'sisa akhir tahun: ' + r.text);
  assert.ok(r.text.includes(rp(kasBase(P) + sum.i - sum.o)), 'saldo realtime: ' + r.text);
  assert.equal(r.changed, false);
});

test('@jatah = sisa akhir / jumlah bulan tersisa', () => {
  const all = fixture();
  const r = reply('@jatah', all);
  assert.ok(r.text.includes(rp(calc().end / 12)), r.text);
});

test('@tagihan menyebut tagihan yang belum lunas dalam 7 hari', () => {
  const all = fixture();
  const S = all.data[2027], today = new Date();
  const ds = isoD(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 2));
  S.items.push({ id: 99, name: 'Uji Tempo', price: 100000, n: 1, unit: 'bulan', start: ds, stop: 'none', cnt: 0, end: '', cat: '', ch: [] });
  const r = reply('@tagihan', all);
  assert.ok(r.text.includes('Uji Tempo'), r.text);
  assert.ok(r.text.includes(rp(100000)), r.text);
});

test('@beli menambah item dengan parser Tambah Cepat yang sama', () => {
  const all = fixture();
  const before = all.data[2027].items.length;
  const r = reply('@beli Netflix 186k tiap tgl 15', all);
  assert.equal(r.changed, true);
  const it = all.data[2027].items[before];
  assert.equal(it.name, 'Netflix');
  assert.equal(it.price, 186000);
  assert.equal(it.unit, 'bulan');
  assert.equal(+it.start.slice(8, 10), 15);
  assert.ok(r.text.includes('Netflix'));
});

test('@lunas menandai paid untuk tagihan terdekat', () => {
  const all = fixture();
  const S = all.data[2027];
  const r = reply('@lunas BPJS', all);
  assert.equal(r.changed, true);
  const key = Object.keys(S.paid)[0];
  assert.ok(key && key.indexOf('2|') === 0, 'paid: ' + key);
  assert.ok(r.text.includes('BPJS'), r.text);
});

test('@hapus membuang item beserta status paid/skip-nya', () => {
  const all = fixture();
  const S = all.data[2027];
  S.paid['2|2027-01-01'] = 1;
  const r = reply('@hapus BPJS', all);
  assert.equal(r.changed, true);
  assert.equal(S.items.filter((x) => x.name === 'BPJS').length, 0);
  assert.equal(Object.keys(S.paid).filter((k) => k.indexOf('2|') === 0).length, 0);
});

test('@keterangan memuat semua perintah utama', () => {
  const r = reply('@keterangan', fixture());
  for (const cmd of ['@saldo', '@jatah', '@tagihan', '@beli', '@lunas', '@hapus', '@cari', '@rekap']) {
    assert.ok(r.text.includes(cmd), cmd + ' hilang dari panduan');
  }
});

test('perintah tak dikenal tidak mengubah data', () => {
  const all = fixture();
  reply('@saldo', all); // normalisasi bind() sekali
  const snap = JSON.stringify({ data: all.data, kas: all.kas });
  const r = reply('@ngawur', all);
  assert.equal(r.changed, false);
  assert.ok(r.text.includes('@keterangan'));
  assert.equal(JSON.stringify({ data: all.data, kas: all.kas }), snap);
});

test('@rekap feb menjumlahkan bulan yang diminta', () => {
  const all = fixture();
  const r = reply('@rekap feb', all);
  assert.ok(r.text.includes('Februari'), r.text);
  assert.ok(r.text.includes(rp(400000)), 'keluar Februari: ' + r.text);
});

test('laporan PDF: semua jenis ter-render, teks di dalam margin', async () => {
  const { build } = await import('../bot/report.mjs');
  const { toPdf } = await import('../bot/pdf.mjs');
  for (const kind of ['harian', 'mingguan', 'bulanan', 'tahun']) {
    const rep = build(kind, kind === 'bulanan' ? 'nov' : '', fixture());
    assert.ok(!rep.error, kind + ': ' + rep.error);
    const bytes = await toPdf(rep); // toPdf melempar bila teks keluar margin / bertumpuk
    const head = Buffer.from(bytes.slice(0, 5)).toString('latin1');
    assert.equal(head, '%PDF-', kind + ' bukan PDF');
    assert.ok(bytes.length > 1200, kind + ' terlalu kecil: ' + bytes.length);
  }
  const bad = build('bulanan', 'zzz', fixture());
  assert.ok(bad.error, 'bulan tak dikenal harus error');
});

test('@masuk/@keluar menambah transaksi kas dengan bentuk sama seperti web', () => {
  const all = fixture();
  const before = (all.kas.pr.p1.tx || []).length;
  const r1 = reply('@masuk 500k gaji', all);
  assert.equal(r1.changed, true, r1.text);
  const tx = all.kas.pr.p1.tx[all.kas.pr.p1.tx.length - 1];
  assert.equal(tx.t, '+');
  assert.equal(tx.amt, 500000);
  assert.equal(tx.note, 'gaji');
  assert.match(tx.d, /^\d{4}-\d{2}-\d{2}$/);
  const r2 = reply('@keluar 25k kopi', all);
  assert.equal(r2.changed, true);
  assert.equal(all.kas.pr.p1.tx.length, before + 2);
  assert.equal(all.kas.pr.p1.tx[all.kas.pr.p1.tx.length - 1].t, '-');
});

test('@utang + @bayarutang mengurangi sisa seperti kartu web', () => {
  const all = fixture();
  reply('@utang Budi motor 500k', all);
  let t = reply('@utangku', all).text;
  assert.ok(t.includes('Budi motor') && t.includes(rp(500000)), t);
  reply('@bayarutang Budi 200k', all);
  t = reply('@utangku', all).text;
  assert.ok(t.includes(rp(300000)), 'sisa harus 300.000: ' + t);
  assert.ok(!t.includes(rp(500000)), 'utang awal tidak boleh tampil lagi: ' + t);
});

test('@jadwal menyebut tagihan bulan itu dan status lunas', () => {
  const all = fixture();
  const t1 = reply('@jadwal jan', all).text;
  assert.ok(t1.includes('BPJS') && t1.includes(rp(150000)), t1);
  assert.ok(t1.includes('Total'), t1);
  reply('@lunas BPJS', all);
  const t2 = reply('@jadwal jan', all).text;
  assert.ok(t2.includes('✅ 1 BPJS'), t2);
  assert.ok(t2.includes('belum lunas ' + rp(620000)), t2);
});

test('@rekap mendukung tahun lain tanpa mengubah tahun aktif', () => {
  const all = fixture();
  all.data['2026'] = { year: 2026, saldo: 1000000, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  const r = reply('@rekap jan 2026', all);
  assert.ok(r.text.includes('Januari 2026'), r.text);
  assert.equal(+all.year, 2027, 'tahun aktif tidak boleh berubah');
});

test('@pakai mengganti tahun aktif, @tahun mendaftar', () => {
  const all = fixture();
  all.data['2026'] = { year: 2026, saldo: 1000000, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] };
  const r = reply('@pakai 2026', all);
  assert.equal(r.changed, true, r.text);
  assert.equal(+all.year, 2026);
  const t = reply('@tahun', all).text;
  assert.ok(t.includes('2026') && t.includes('2027') && t.includes('Aktif: 2026'), t);
  assert.ok(reply('@pakai 1999', all).text.includes('tidak ada'));
});

test('nama bulan lengkap & alias diterima', () => {
  const all = fixture();
  for (const q of ['@rekap november', '@rekap November 2027', '@rekap nopember', '@rekap 11', '@jadwal november'])
    assert.ok(/(November|Jadwal November)/.test(reply(q, all).text), q + ' -> ' + reply(q, all).text);
  assert.ok(reply('@rekap januari', all).text.includes('Januari'));
});

test('laporan bisa meminta tahun lain tanpa mengubah tahun aktif', async () => {
  const { build } = await import('../bot/report.mjs');
  const { toPdf } = await import('../bot/pdf.mjs');
  const all = fixture();
  all.data['2026'] = { year: 2026, saldo: 5000000, startMonth: 0, items: [{ id: 'x1', name: 'Kos', price: 1000000, n: 1, unit: 'bulan', start: '2026-01-01', cat: 'Tempat tinggal' }], paid: {}, skip: {}, adj: [] };
  const rep = build('tahun', '2026', all);
  assert.ok(!rep.error, rep.error);
  assert.ok(rep.subtitle.includes('2026') && !rep.subtitle.includes('2027'), rep.subtitle);
  assert.equal(+all.year, 2027, 'tahun aktif tidak boleh berubah');
  assert.ok((await toPdf(rep)).length > 1200);
  const nov = build('bulanan', 'november 2026', all);
  assert.ok(!nov.error && nov.subtitle === 'November 2026', nov.subtitle || nov.error);
  assert.ok(build('tahun', '2019', all).error, 'tahun tanpa data harus error');
});

test('worker: webhook menyimpan state dan membalas chat', async () => {
  const { default: worker } = await import('../bot/worker.mjs');
  const orig = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, opt) => {
    url = String(url);
    calls.push({ url, method: (opt && opt.method) || 'GET', body: opt && opt.body });
    if (url.includes('/rest/v1/rk_state') && (!opt || opt.method !== 'PATCH'))
      return new Response(JSON.stringify([{ user_id: 'u1', rev: 10, data: fixture() }]), { status: 200 });
    if (opt && opt.method === 'PATCH') return new Response(JSON.stringify([{ user_id: 'u1' }]), { status: 200 });
    return new Response('{"ok":true}', { status: 200 });
  };
  try {
    const env = { SB_URL: 'https://x.supabase.co', SB_KEY: 'k', TG_TOKEN: 't', MY_TG: '555' };
    const post = (chat, text) => worker.fetch(new Request('https://bot/tg', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: { chat: { id: chat }, text } }),
    }), env);

    assert.equal((await post(555, '@beli Netflix 186k tiap tgl 15')).status, 200);
    assert.ok(calls.some((c) => c.method === 'PATCH'), 'state harus disimpan');
    const tg = calls.filter((c) => c.url.includes('api.telegram.org'));
    assert.equal(tg.length, 1, 'satu balasan Telegram');
    assert.ok(tg[0].url.includes('/sendMessage'));

    calls.length = 0;
    await post(999, '@saldo');
    assert.ok(String(calls.find((c) => c.url.includes('api.telegram.org')).body).includes('privat'), 'chat asing ditolak');
  } finally {
    globalThis.fetch = orig;
  }
});
