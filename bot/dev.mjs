// Uji lokal tanpa Telegram & tanpa Supabase: node bot/dev.mjs [perintah...]
import { reply } from './router.mjs';
import { build } from './report.mjs';
import { toPdf } from './pdf.mjs';
import fs from 'node:fs';
import os from 'node:os';

export function fixture() {
  const it = (id, name, price, n, unit, start, cat) => ({ id, name, price, n, unit, start, stop: 'none', cnt: 0, end: '', cat: cat || '', ch: [] });
  return {
    year: 2027,
    rev: 1,
    data: {
      2027: {
        saldo: 25000000,
        startMonth: 0,
        items: [
          it(1, 'Vidio', 200000, 3, 'bulan', '2027-03-01', 'Langganan'),
          it(2, 'BPJS', 150000, 1, 'bulan', '2027-01-01', 'Kesehatan'),
          it(3, 'Saham', 620000, 1, 'bulan', '2027-01-01', 'Investasi'),
          it(4, 'TorBox', 450000, 1, 'tahun', '2027-11-01', 'Langganan'),
        ],
        paid: {},
        skip: {},
        adj: [],
        real: {},
      },
    },
    kas: {
      pr: {
        p1: {
          id: 'p1',
          name: 'Rencana',
          link: true,
          saldo: 0,
          start: '2027-01-01',
          tx: [
            { id: 't1', d: '2027-01-05', t: '+', amt: 9000000, cat: 'Gaji', note: 'gaji' },
            { id: 't2', d: '2027-01-07', t: '-', amt: 250000, cat: 'Makanan', note: 'belanja' },
            { id: 't3', d: '2027-02-03', t: '-', amt: 400000, cat: 'Transport', note: 'bensin' },
          ],
        },
      },
    },
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/bot/dev.mjs') && process.argv[2] === '--pdf') {
  const rep = build(process.argv[3] || 'bulanan', process.argv.slice(4).join(' '), fixture());
  if (rep.error) console.log('⚠️ ' + rep.error);
  else {
    const bytes = await toPdf(rep);
    const out = (process.env.TMPDIR || os.tmpdir()).replace(/[\\/]$/, '') + '/' + rep.filename;
    fs.writeFileSync(out, bytes);
    console.log('PDF: ' + out + ' (' + Math.round(bytes.length / 1024) + ' KB)');
  }
} else if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/bot/dev.mjs') && process.argv[2]) {
  const all = fixture();
  for (const cmd of process.argv.slice(2)) {
    const r = reply(cmd, all);
    console.log('\n> ' + cmd + (r.changed ? '   [state berubah]' : ''));
    console.log(r.text);
  }
}
