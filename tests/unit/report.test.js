/** Tes laporan PDF web (js/ui/report.js): isi laporan + struktur PDF (offset xref harus tepat). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } = require('pdf-lib');
const { loadCore, newYear, item } = require('../helpers/core');

function load() {
  const c = loadCore({ document: { addEventListener() {} } });
  vm.runInContext(
    'function kasRows(p){return p.tx;}' + fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'report.js'), 'utf8'),
    c,
  );
  return c;
}

test('laporan bulanan: ringkasan, tabel kas & tagihan, PDF valid', () => {
  const c = load();
  const y = +c.todayISO().slice(0, 4), mk = c.todayISO().slice(0, 7);
  newYear(c, y, { items: [item({ name: 'Listrik (PLN)', price: 250000, start: mk + '-05' })], paid: { [`1|${mk}-05`]: 1 } });
  c.ALL.kas = { pr: { a: { link: true, tx: [{ d: mk + '-02', t: '+', amt: 1000000, cat: 'Gaji', note: '' }, { d: mk + '-03', t: '-', amt: 50000, cat: 'Makan', note: 'Kopi' }] } } };

  const r = c.repData('m');
  assert.equal(r.title, 'Laporan Bulanan');
  assert.deepEqual(Array.from(r.summary.slice(0, 3), (x) => x[1]), ['Rp 1.000.000', 'Rp 50.000', 'Rp 950.000']);
  assert.equal(r.tables[0].rows[1][1], 'Kopi');
  assert.equal(r.tables[0].total[1], '+ Rp 950.000');
  assert.deepEqual(Array.from(r.tables[1].rows[0]).slice(1), ['Listrik (PLN)', 'Lunas', 'Rp 250.000']);

  const pdf = Buffer.from(c.repPdf(r)).toString('latin1');
  assert.match(pdf, /\(Listrik \\\(PLN\\\)\) Tj/);
  const xref = +pdf.match(/startxref\n(\d+)/)[1];
  assert.ok(pdf.startsWith('xref', xref));
  const offs = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
  offs.forEach((o, i) => assert.ok(pdf.startsWith(i + 1 + ' 0 obj', o), 'obj ' + (i + 1)));
});

test('repEnc: karakter di luar WinAnsi jadi ?, kurung & em dash aman', () => {
  const c = load();
  assert.equal(c.repEnc('a\u2014b \u{1F600}'), 'a\x97b ?');
});

test('renderRepModal & openRepModal mengisi KPI dan tabel untuk d/w/m/y', () => {
  const c = loadCore({
    document: {
      _els: {
        'rep-m': { hidden: true },
        'rep-m-title': { textContent: '' },
        'rep-m-sub': { textContent: '' },
        'rep-m-body': { innerHTML: '' },
      },
      addEventListener() {},
      getElementById(id) { return this._els[id] || null; },
      querySelectorAll() { return []; },
    },
  });
  vm.runInContext(
    'function kasRows(p){return p.tx;}' + fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'report.js'), 'utf8'),
    c,
  );
  const y = +c.todayISO().slice(0, 4);
  newYear(c, y, { items: [item({ name: 'Wifi', price: 300000, start: c.todayISO() })] });
  c.ALL.kas = { pr: { a: { link: true, tx: [{ d: c.todayISO(), t: '+', amt: 500000, cat: 'Bonus', note: 'Bonus' }] } } };

  const D = c.openRepModal('d');
  assert.equal(D.title, 'Laporan Harian');
  assert.equal(c.document._els['rep-m'].hidden, false);
  assert.equal(c.document._els['rep-m-title'].textContent, 'Laporan Harian');
  assert.match(c.document._els['rep-m-body'].innerHTML, /Rp 500\.000/);

  ['w', 'm', 'y'].forEach((k) => {
    const res = c.renderRepModal(k);
    assert.ok(res && res.summary.length >= 4 && res.tables.length >= 1);
  });
});

test('A5.i + D3: safeHref menolak skema berbahaya & repPdf laporan tanpa href identik byte-per-byte dgn implementasi lama', () => {
  const c = load();
  assert.equal(c.safeHref('https://maps.google.com/?q=tokyo'), 'https://maps.google.com/?q=tokyo');
  assert.equal(c.safeHref('http://example.com/jalan (1)'), 'http://example.com/jalan (1)');
  assert.equal(c.safeHref('javascript:alert(1)'), '');
  assert.equal(c.safeHref('data:text/html,<script>'), '');
  assert.equal(c.safeHref('tokyometro.jp/en'), '');

  const RealDate = Date;
  c.Date = class extends RealDate {
    constructor(...a) { super(a.length ? a[0] : '2026-11-20T00:00:00.000Z'); }
  };
  const y = +c.todayISO().slice(0, 4), mk = c.todayISO().slice(0, 7);
  newYear(c, y, {
    items: [item({ name: 'Listrik (PLN) & PDAM', price: 250000, start: mk + '-05' }), item({ name: 'Internet', price: 400000, start: mk + '-12' })],
    paid: { [`1|${mk}-05`]: 1 },
  });
  c.ALL.kas = {
    pr: {
      a: {
        link: true,
        tx: [
          { d: mk + '-02', t: '+', amt: 2000000, cat: 'Gaji', note: 'Gaji \u2014 utama' },
          { d: mk + '-03', t: '-', amt: 50000, cat: 'Makan', note: 'Kopi (cafe)' },
        ],
      },
    },
  };
  const expected = {
    d: '329265b1ba8a1511f7d377a17a8bcffeed2f5b4514876a3f6c184faac64686a8',
    w: '9c966b4688c286890d5f8d969eb239449525d343dd7be1ed67229f02c2d3634f',
    m: 'f24a639b14014347b4a7366752f26a82aa66dbc39c6fb77e3c43428b9059bcde',
    y: '00a98f0b835b16de108ac1817a0bce5671b2e0063153efc037b1d05bdd09ada7',
  };
  for (const k of ['d', 'w', 'm', 'y']) {
    const hash = crypto.createHash('sha256').update(Buffer.from(c.repPdf(c.repData(k)))).digest('hex');
    assert.equal(hash, expected[k], 'hash repPdf(' + k + ') harus identik byte-per-byte');
  }
});

function extractPageAnnots(pdfDoc, pageIndex) {
  const page = pdfDoc.getPage(pageIndex);
  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (!annots) return [];
  const out = [];
  for (let i = 0; i < annots.size(); i++) {
    const dict = annots.lookup(i, PDFDict);
    const rectArr = dict.lookupMaybe(PDFName.of('Rect'), PDFArray);
    const rect = [];
    if (rectArr) for (let j = 0; j < rectArr.size(); j++) rect.push(rectArr.get(j).asNumber());
    const action = dict.lookupMaybe(PDFName.of('A'), PDFDict);
    const uriObj = action && action.lookup(PDFName.of('URI'));
    out.push({
      subtype: dict.lookup(PDFName.of('Subtype'))?.toString(),
      rect,
      uri: uriObj instanceof PDFString ? uriObj.decodeText() : String(uriObj || ''),
    });
  }
  return out;
}

test('A5.ii-vi: repPdf menulis anotasi Link/URI valid per baris, multi-halaman, karakter khusus, dan memblokir URI berbahaya', async () => {
  const c = load();
  const specialUri = 'https://example.com/jalan raya (1)\\tes 日本?a=1&b=2';
  const longUri = 'https://maps.google.com/very-long-route/' + 'segment/'.repeat(12);
  const longRows = [
    ['08.00', { t: 'Buka Peta Aman', href: 'https://maps.google.com/?q=tokyo' }],
    ['09.00', { t: 'Tautan Dipotong: ' + 'panjangsekali '.repeat(10), href: 'https://example.com/full-uri-kept' }],
    ['10.00', { t: 'https://maps.google.com/baris-satu', href: longUri }],
    ['', { t: 'lanjutan-baris-dua', href: longUri }],
    ['11.00', { t: 'URI Karakter Khusus', href: specialUri }],
    ['12.00', { t: 'Blokir JS', href: 'javascript:alert(1)' }],
    ['13.00', { t: 'Blokir Data', href: 'data:text/html,<h1>x</h1>' }],
    ['14.00', { t: 'Tanpa Skema', href: 'example.com/no-scheme' }],
  ];
  for (let k = 0; k < 52; k++) {
    longRows.push(['15.00', k === 51 ? { t: 'Link Halaman Dua', href: 'https://page2.example.com/ok' } : 'Baris biasa #' + k]);
  }
  const rep = {
    title: 'Uji Anotasi PDF',
    subtitle: 'Verifikasi pdf-lib',
    summary: [['Total', 'Rp 0']],
    tables: [{ head: 'JADWAL', cols: [{ t: 'JAM', w: 18 }, { t: 'KEGIATAN', w: 82 }], rows: longRows }],
  };
  const bytes = c.repPdf(rep);
  const doc = await PDFDocument.load(new Uint8Array(bytes));
  assert.equal(doc.getPageCount(), 2, 'tabel panjang terbagi 2 halaman');
  const p1Annots = extractPageAnnots(doc, 0);
  const p2Annots = extractPageAnnots(doc, 1);
  assert.equal(p1Annots.length, 5, 'halaman 1 hanya punya 5 anotasi aman (3 berbahaya diabaikan)');
  assert.equal(p2Annots.length, 1, 'halaman 2 punya 1 anotasi lanjutan');
  assert.equal(p1Annots[0].subtype, '/Link');
  assert.equal(p1Annots[0].uri, 'https://maps.google.com/?q=tokyo');
  assert.equal(p1Annots[1].uri, 'https://example.com/full-uri-kept', 'teks terpotong .. tetap membawa URI penuh');
  assert.equal(p1Annots[2].uri, longUri);
  assert.equal(p1Annots[3].uri, longUri);
  assert.ok(p1Annots[2].rect[1] > p1Annots[3].rect[1], 'baris 1 berada di atas baris 2 dalam koordinat PDF');
  assert.equal(p1Annots[4].uri, 'https://example.com/jalan%20raya%20(1)\\tes%20%E6%97%A5%E6%9C%AC?a=1&b=2');
  assert.equal(p2Annots[0].uri, 'https://page2.example.com/ok');
  for (const a of [...p1Annots, ...p2Annots]) {
    assert.ok(a.rect[0] >= 38 && a.rect[2] <= 595.28 - 38, 'x1/x2 di dalam margin');
    assert.ok(a.rect[1] >= 38 && a.rect[3] <= 841.89 - 38, 'y1/y2 di dalam margin');
    assert.ok(a.rect[2] > a.rect[0] && a.rect[3] > a.rect[1], 'rect punya luas positif');
  }
});
