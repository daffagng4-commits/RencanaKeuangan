// Render laporan ke PDF A4 (gaya lembar bursa: judul, ringkasan, tabel rapi).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const M = 38; // margin
const INK = rgb(0.11, 0.13, 0.16), MUT = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.87, 0.9), HEADBG = rgb(0.95, 0.96, 0.97);
const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');

/** report = { title, subtitle, summary:[[label,nilai]], tables:[{head, cols:[{t,w,align}]}], rows } */
export async function toPdf(rep) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89;
  let page = doc.addPage([W, H]), y = H - M;

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
    page.drawText(rep.title, { x: M, y: y - 12, size: 11, font: bold, color: MUT });
    y -= 26;
  };
  const need = (h) => { if (y - h < M + 30) newPage(); };
  // pdf-lib tidak punya textAnchor: hitung lebar teks untuk rata kanan.
  const boxes = [];
  const put = (str, x, py, o) => {
    const f = (o && o.font) || font, size = (o && o.size) || 9, s = String(str);
    const w = f.widthOfTextAtSize(s, size), right = o && (o.align === 'end' || o.align === 'r'),
      x0 = right ? x - w : x;
    page.drawText(s, { x: x0, y: py, size, font: f, color: (o && o.color) || INK });
    boxes.push({ x0: x0, x1: x0 + w, y: py, s: s });
  };
  // Pangkas teks agar muat kolom (berbasis lebar glyph, bukan perkiraan karakter).
  const fit = (cell, c, w) => {
    const f = c.bold ? bold : font, size = c.size || 9;
    let s = String(cell == null ? '' : cell);
    if (f.widthOfTextAtSize(s, size) <= w - 6) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + '..', size) > w - 6) s = s.slice(0, -1);
    return s + '..';
  };

  page.drawText(rep.title, { x: M, y: y - 20, size: 19, font: bold, color: INK });
  page.drawText(rep.subtitle, { x: M, y: y - 36, size: 9.5, font, color: MUT });
  y -= 48;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: INK });
  y -= 18;

  // Ringkasan: dua kolom label/nilai
  if (rep.summary && rep.summary.length) {
    const colW = (W - 2 * M) / 2;
    rep.summary.forEach((row, i) => {
      const cx = M + (i % 2) * colW, cy = y - Math.floor(i / 2) * 16;
      page.drawText(row[0], { x: cx, y: cy - 9, size: 9, font, color: MUT });
      put(row[1], cx + colW - 10, cy - 9, { size: 10.5, font: bold, color: INK, align: 'end' });
    });
    y -= Math.ceil(rep.summary.length / 2) * 16 + 8;
  }

  for (const t of rep.tables) {
    if (!t.rows.length) continue;
    need(60);
    page.drawText(t.head, { x: M, y: y - 10, size: 10.5, font: bold, color: INK });
    y -= 20;
    const widths = t.cols.map((c) => c.w * (W - 2 * M) / 100);
    const xs = []; let acc = M;
    widths.forEach((w) => { xs.push(acc); acc += w; });

    const headRow = () => {
      page.drawRectangle({ x: M, y: y - 14, width: W - 2 * M, height: 16, color: HEADBG });
      t.cols.forEach((c, i) => put(c.t, c.align === 'r' ? xs[i] + widths[i] - 3 : xs[i] + 3, y - 10,
        { size: 8.5, font: bold, color: MUT, align: c.align }));
      y -= 18;
    };
    headRow();

    for (const r of t.rows) {
      if (y - 16 < M + 30) { page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.5, color: LINE }); newPage(); headRow(); }
      t.cols.forEach((c, i) => {
        const txt = fit(r[i], c, widths[i]);
        put(txt, c.align === 'r' ? xs[i] + widths[i] - 3 : xs[i] + 3, y - 9,
          { size: c.size || 9, font: c.bold ? bold : font, color: INK, align: c.align });
      });
      y -= 15;
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.4, color: LINE });
    }
    if (t.total) {
      page.drawText(t.total[0], { x: M + 3, y: y - 11, size: 9.5, font: bold, color: INK });
      put(t.total[1], W - M - 3, y - 11, { size: 9.5, font: bold, color: INK, align: 'end' });
      y -= 20;
    }
    y -= 10;
  }

  const foot = 'Rencana Keuangan - dibuat otomatis ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  doc.getPages().forEach((p, i) => {
    p.drawText(foot, { x: M, y: M - 8, size: 7.5, font, color: MUT });
    const num = String(i + 1) + '/' + doc.getPageCount();
    p.drawText(num, { x: W - M - font.widthOfTextAtSize(num, 7.5), y: M - 8, size: 7.5, font, color: MUT });
  });

  // Jaga-jaga: teks tidak boleh keluar margin atau bertumpuk dalam satu baris.
  const bad = boxes.filter((b) => b.x0 < M - 1 || b.x1 > W - M + 1);
  if (bad.length) throw new Error('pdf: teks keluar margin -> ' + JSON.stringify(bad.slice(0, 3)));
  const byY = {};
  boxes.forEach((b) => { (byY[b.y] = byY[b.y] || []).push(b); });
  Object.keys(byY).forEach((k) => {
    const row = byY[k].sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < row.length; i++)
      if (row[i].x0 < row[i - 1].x1) throw new Error('pdf: teks bertumpuk "' + row[i - 1].s + '" / "' + row[i].s + '"');
  });

  return doc.save();
}

export { rp };
