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

test('B3: tripPdfData berada di modul bersama, label tombol desktop "Simpan PDF", dan struktur PDF multi-halaman/xref/URI/operator teks valid', async () => {
  const idxDev = fs.readFileSync(path.join(__dirname, '..', '..', 'index.dev.html'), 'utf8');
  const shPdfBtn = idxDev.match(/<button[^>]*data-sh="pdf"[^>]*>([^<]+)<\/button>/);
  assert.ok(shPdfBtn, 'tombol data-sh="pdf" ada di index.dev.html');
  assert.equal(shPdfBtn[1].trim(), 'Simpan PDF', 'label tombol PDF desktop adalah "Simpan PDF"');

  const c = loadCore({
    window: { addEventListener() {} },
    document: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
    ALL: { kas: { pr: {} }, year: 2026, data: { 2026: { year: 2026, saldo: 0, startMonth: 0, items: [], paid: {}, skip: {}, adj: [] } } },
  });
  c.S = c.ALL.data[2026];
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'trip.js'), 'utf8') +
      '\n' +
      fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'report.js'), 'utf8'),
    c,
    { filename: 'trip+report.js' },
  );
  assert.equal(typeof c.tripPdfData, 'function', 'tripPdfData tersedia di modul bersama sebelum browser-app/mobile-app');

  const manyIt = [];
  for (let i = 0; i < 62; i++) {
    manyIt.push({
      id: 'it-' + i,
      day: i < 31 ? '2026-12-01' : '2026-12-02',
      time: '09:00',
      time2: '10:00',
      place: 'Museum ' + i + ' (Sayap Utara)',
      est: 1500,
      fx: true,
      pay: 'cash',
      cat: 'Tiket & Tour',
      link: i === 2 ? 'https://example.com/jalan (1)\\日本語?x=1' : (i === 5 ? 'javascript:alert(9)' : (i === 55 ? 'https://page2.tokyo.jp/spot' : '')),
      note: i === 2 ? 'Catatan khusus' : '',
    });
  }
  const bigTrip = {
    id: 'p-b3',
    name: 'Tokyo Winter (2026)',
    start: '2026-12-01',
    end: '2026-12-02',
    cur: 'JPY',
    rate: 110,
    budget: 20000000,
    dt: { '2026-12-01': 'Hari Pertama' },
    it: manyIt,
    bk: [{ id: 'b1', title: 'Hotel Shinjuku', amt: 5000000, fx: false, paid: true, cat: 'Penginapan' }],
    lk: [
      { id: 'l1', title: 'Peta Resmi', url: 'https://www.tokyometro.jp/en/index.html' },
      { id: 'l2', title: 'Tautan Buruk', url: 'data:text/html,xss' },
    ],
    ck: [],
    note: '',
    goal: null,
  };
  const rep = c.tripPdfData(bigTrip, true);
  const bytes = c.repPdf(rep);
  // Verifikasi byte-per-byte < 256, xref tepat, dan %%EOF
  for (let i = 0; i < bytes.length; i++) {
    assert.ok(bytes[i] >= 0 && bytes[i] <= 255);
  }
  const raw = Buffer.from(bytes).toString('latin1');
  assert.ok(raw.endsWith('%%EOF\n') || raw.endsWith('%%EOF'), 'PDF diakhiri %%EOF');
  const xrefPos = +raw.match(/startxref\n(\d+)/)[1];
  assert.ok(raw.startsWith('xref', xrefPos), 'startxref mengarah tepat ke tabel xref');
  const offs = [...raw.slice(xrefPos).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
  offs.forEach((o, i) => assert.ok(raw.startsWith(i + 1 + ' 0 obj', o), 'objek ' + (i + 1) + ' tepat pada offset xref'));

  // Verifikasi operator teks selectable (BT ... Tj, bukan gambar XObject)
  assert.match(raw, /BT[\s\S]*\/F1\s+[\d.]+\s+Tf[\s\S]*Tj[\s\S]*ET/, 'teks dirender sebagai operator teks WinAnsi, bukan raster/gambar');
  assert.doesNotMatch(raw, /\/Subtype\s*\/Image/, 'tidak memakai gambar raster untuk isi PDF');

  // Verifikasi pdf-lib load & anotasi per halaman
  const doc = await PDFDocument.load(new Uint8Array(bytes));
  assert.ok(doc.getPageCount() >= 2, 'tabel panjang terbagi ke beberapa halaman');
  const uris = [];
  for (let p = 0; p < doc.getPageCount(); p++) {
    for (const a of extractPageAnnots(doc, p)) {
      assert.equal(a.subtype, '/Link');
      assert.ok(/^[\x20-\x7e]+$/.test(a.uri), 'URI anotasi ASCII murni: ' + a.uri);
      uris.push(a.uri);
    }
  }
  assert.ok(uris.some((u) => u.includes('example.com/jalan%20(1)')), 'URI berkarakter khusus ter-encode dan tetap ada');
  assert.ok(uris.includes('https://page2.tokyo.jp/spot'), 'anotasi halaman lanjutan dipertahankan');
  assert.ok(uris.includes('https://www.tokyometro.jp/en/index.html'), 'tautan penting menjadi anotasi');
  assert.ok(!uris.some((u) => /javascript:|data:/i.test(u)), 'URL berbahaya ditolak');
});
