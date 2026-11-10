// Uji bot: angka harus sama dengan modul aplikasi (core.mjs), bukan angka baru.
import test from 'node:test';
import assert from 'node:assert';
import { reply } from '../bot/router.mjs';
import { fixture } from '../bot/dev.mjs';
import { calc, state, rp, kasLinked, kasBase, kasRows, kasSum, isoD, occ, priceAt } from '../bot/core.mjs';

test('@saldo memakai angka calc() aplikasi', () => {
  const all = fixture();
  const r = reply('@saldo', all);
  const c = calc(), P = kasLinked();
  const rows = kasRows(P).filter((x) => +x.d.slice(5, 7) - 1 <= (+state().s.startMonth || 0));
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

test('@rekap menjumlahkan bulan yang diminta', () => {
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
