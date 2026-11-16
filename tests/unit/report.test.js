/** Tes laporan PDF web (js/ui/report.js): isi laporan + struktur PDF (offset xref harus tepat). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
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
