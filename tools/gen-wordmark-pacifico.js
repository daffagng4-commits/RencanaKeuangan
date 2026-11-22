#!/usr/bin/env node
/**
 * Skrip sekali jalan untuk mengonversi wordmark "RenKeu" berfont Pacifico Regular
 * menjadi:
 *   - RK_WM_GLYPHS  : 6 path isi per huruf (R, e, n, K, e, u) dengan winding asli font
 *   - RK_WM_STROKES : 6 array kontur { d, len } (kontur luar dulu lalu lubang, diputar ke titik awal kiri-atas, searah jarum jam)
 *   - RK_WM_VIEWBOX : kotak batas ketat gabungan semua glyph
 *
 * Lisensi font: Pacifico (Vernon Adams), SIL Open Font License 1.1.
 * Dependensi (tidak dimasukkan ke package.json): opentype.js@1.3.4 dan @fontsource/pacifico
 * (atau berkas Pacifico-Regular.ttf / pacifico-latin-400-normal.woff).
 *
 * Contoh pemakaian:
 *   NODE_PATH=/path/to/scratch/node_modules node tools/gen-wordmark-pacifico.js
 *   node tools/gen-wordmark-pacifico.js --font /path/to/pacifico-latin-400-normal.woff --out pacifico.json
 */
const fs = require('fs');
const path = require('path');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

const opentype = require('opentype.js');
const fontArg = getArg('--font');
const fontPath = fontArg
  ? path.resolve(fontArg)
  : require.resolve('@fontsource/pacifico/files/pacifico-latin-400-normal.woff');

const TEXT = 'RenKeu';
const FONT_SIZE = 36;
const LETTER_SPACING_PX = 0.5;
const LETTER_SPACING_EM = LETTER_SPACING_PX / FONT_SIZE;
const PAD = 0.5;
const CURVE_SAMPLES = 24;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function fmt2(n) {
  const v = round2(n);
  return Number.isInteger(v) ? String(v) : String(v);
}

function evalSeg(seg, t) {
  const mt = 1 - t;
  if (seg.type === 'L') {
    return {
      x: seg.from.x + (seg.to.x - seg.from.x) * t,
      y: seg.from.y + (seg.to.y - seg.from.y) * t,
    };
  }
  if (seg.type === 'Q') {
    return {
      x: mt * mt * seg.from.x + 2 * mt * t * seg.c1.x + t * t * seg.to.x,
      y: mt * mt * seg.from.y + 2 * mt * t * seg.c1.y + t * t * seg.to.y,
    };
  }
  return {
    x: mt * mt * mt * seg.from.x + 3 * mt * mt * t * seg.c1.x + 3 * mt * t * t * seg.c2.x + t * t * t * seg.to.x,
    y: mt * mt * mt * seg.from.y + 3 * mt * mt * t * seg.c1.y + 3 * mt * t * t * seg.c2.y + t * t * t * seg.to.y,
  };
}

function splitToContours(commands) {
  const contours = [];
  let curSegs = [];
  let start = null;
  let prev = null;

  function flushContour() {
    if (!curSegs.length || !start) { curSegs = []; start = null; prev = null; return; }
    if (Math.hypot(prev.x - start.x, prev.y - start.y) > 1e-3) {
      curSegs.push({ type: 'L', from: prev, to: start });
    }
    contours.push(curSegs);
    curSegs = [];
    start = null;
    prev = null;
  }

  for (const c of commands) {
    if (c.type === 'M') {
      flushContour();
      start = { x: c.x, y: c.y };
      prev = start;
    } else if (c.type === 'L') {
      const to = { x: c.x, y: c.y };
      if (prev && Math.hypot(to.x - prev.x, to.y - prev.y) > 1e-3) {
        curSegs.push({ type: 'L', from: prev, to });
        prev = to;
      }
    } else if (c.type === 'Q') {
      const to = { x: c.x, y: c.y };
      const c1 = { x: c.x1, y: c.y1 };
      if (prev) {
        curSegs.push({ type: 'Q', from: prev, c1, to });
        prev = to;
      }
    } else if (c.type === 'C') {
      const to = { x: c.x, y: c.y };
      const c1 = { x: c.x1, y: c.y1 };
      const c2 = { x: c.x2, y: c.y2 };
      if (prev) {
        curSegs.push({ type: 'C', from: prev, c1, c2, to });
        prev = to;
      }
    } else if (c.type === 'Z') {
      flushContour();
    }
  }
  flushContour();
  return contours;
}

function analyzeContour(segs) {
  const pts = [];
  let len = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    const steps = s.type === 'L' ? 4 : CURVE_SAMPLES;
    let last = s.from;
    for (let k = 1; k <= steps; k++) {
      const pt = evalSeg(s, k / steps);
      len += Math.hypot(pt.x - last.x, pt.y - last.y);
      pts.push(pt);
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
      last = pt;
    }
  }
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area2 += a.x * b.y - b.x * a.y;
  }
  return { len: round2(len), area: area2 / 2, minX, minY, maxX, maxY };
}

function reverseContour(segs) {
  const out = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.type === 'L') out.push({ type: 'L', from: s.to, to: s.from });
    else if (s.type === 'Q') out.push({ type: 'Q', from: s.to, c1: s.c1, to: s.from });
    else out.push({ type: 'C', from: s.to, c1: s.c2, c2: s.c1, to: s.from });
  }
  return out;
}

function rotateContourTopLeft(segs, info) {
  const w = Math.max(1e-3, info.maxX - info.minX);
  const h = Math.max(1e-3, info.maxY - info.minY);
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < segs.length; i++) {
    const p = segs[i].from;
    const score = ((p.x - info.minX) / w) * 0.9 + ((p.y - info.minY) / h) * 1.1;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return segs.slice(bestIdx).concat(segs.slice(0, bestIdx));
}

function contourToPathData(segs) {
  if (!segs.length) return '';
  let d = `M${fmt2(segs[0].from.x)} ${fmt2(segs[0].from.y)}`;
  for (const s of segs) {
    if (s.type === 'L') {
      d += `L${fmt2(s.to.x)} ${fmt2(s.to.y)}`;
    } else if (s.type === 'Q') {
      d += `Q${fmt2(s.c1.x)} ${fmt2(s.c1.y)} ${fmt2(s.to.x)} ${fmt2(s.to.y)}`;
    } else {
      d += `C${fmt2(s.c1.x)} ${fmt2(s.c1.y)} ${fmt2(s.c2.x)} ${fmt2(s.c2.y)} ${fmt2(s.to.x)} ${fmt2(s.to.y)}`;
    }
  }
  return d + 'Z';
}

function main() {
  const buf = fs.readFileSync(fontPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const font = opentype.parse(ab);
  const rawPaths = font.getPaths(TEXT, 0, 0, FONT_SIZE, {
    kerning: true,
    letterSpacing: LETTER_SPACING_EM,
  });

  if (rawPaths.length !== TEXT.length) {
    throw new Error(`Jumlah path (${rawPaths.length}) tidak sama dengan panjang teks (${TEXT.length})`);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rawPaths.forEach((p) => {
    const bb = p.getBoundingBox();
    if (bb.x1 < minX) minX = bb.x1;
    if (bb.y1 < minY) minY = bb.y1;
    if (bb.x2 > maxX) maxX = bb.x2;
    if (bb.y2 > maxY) maxY = bb.y2;
  });

  const shiftX = -minX + PAD;
  const shiftY = -minY + PAD;

  const shiftedPaths = font.getPaths(TEXT, shiftX, shiftY, FONT_SIZE, {
    kerning: true,
    letterSpacing: LETTER_SPACING_EM,
  });

  const glyphs = [];
  const strokes = [];
  const boxes = [];
  let gMaxX = -Infinity, gMaxY = -Infinity;

  for (let i = 0; i < shiftedPaths.length; i++) {
    const p = shiftedPaths[i];
    const d = p.toPathData(2);
    if (!d || /NaN|Infinity/i.test(d)) {
      throw new Error(`Path glyph ${i} (${TEXT[i]}) tidak valid; pastikan opentype.js@1.3.4`);
    }
    const bb = p.getBoundingBox();
    if (bb.x2 > gMaxX) gMaxX = bb.x2;
    if (bb.y2 > gMaxY) gMaxY = bb.y2;
    glyphs.push(d);
    boxes.push({
      ch: TEXT[i],
      x1: round2(bb.x1),
      y1: round2(bb.y1),
      x2: round2(bb.x2),
      y2: round2(bb.y2),
    });

    // Pecah per kontur, urutkan kontur luar (luas terbesar) dulu baru lubang, searah jarum jam, mulai kiri-atas
    const rawContours = splitToContours(p.commands).map((segs) => {
      const info = analyzeContour(segs);
      return { segs, info };
    });
    rawContours.sort((a, b) => Math.abs(b.info.area) - Math.abs(a.info.area));

    const letterStrokes = rawContours.map(({ segs, info }) => {
      // Dalam koordinat SVG y-bawah, area > 0 berarti searah jarum jam (CW)
      const oriented = info.area < 0 ? reverseContour(segs) : segs;
      const rotated = rotateContourTopLeft(oriented, info);
      const sd = contourToPathData(rotated);
      if (!sd || /NaN|Infinity/i.test(sd) || !(info.len > 5)) {
        throw new Error(`Kontur stroke huruf ${TEXT[i]} tidak valid`);
      }
      return {
        d: sd,
        len: info.len,
        start: { x: round2(rotated[0].from.x), y: round2(rotated[0].from.y) },
      };
    });
    strokes.push(letterStrokes);
  }

  const vbW = round2(gMaxX + PAD);
  const vbH = round2(gMaxY + PAD);
  const viewBox = `0 0 ${vbW} ${vbH}`;
  const totalStrokeLen = round2(strokes.flat().reduce((a, s) => a + s.len, 0));

  const result = {
    sourceFont: path.basename(fontPath),
    family: font.names && font.names.fontFamily ? font.names.fontFamily.en : 'Pacifico',
    license: 'Pacifico (Vernon Adams), SIL Open Font License 1.1',
    text: TEXT,
    fontSize: FONT_SIZE,
    letterSpacingPx: LETTER_SPACING_PX,
    viewBox,
    width: vbW,
    height: vbH,
    aspectRatio: round2(vbW / vbH),
    cssWidthAt24_5px: round2((vbW / vbH) * 24.5),
    totalStrokeLen,
    glyphs,
    strokes,
    boxes,
  };

  const outArg = getArg('--out');
  if (process.argv.includes('--json') || outArg) {
    const jsonStr = JSON.stringify(result, null, 2) + '\n';
    if (outArg) fs.writeFileSync(path.resolve(outArg), jsonStr, 'utf8');
    else process.stdout.write(jsonStr);
  } else {
    console.log('/* Pacifico (Vernon Adams), SIL Open Font License 1.1 */');
    console.log(`var RK_WM_VIEWBOX = '${result.viewBox}';`);
    console.log('var RK_WM_GLYPHS = ' + JSON.stringify(result.glyphs, null, 2) + ';');
    console.log(
      'var RK_WM_STROKES = ' +
      JSON.stringify(result.strokes.map((ls) => ls.map((s) => ({ d: s.d, len: s.len }))), null, 2) +
      ';'
    );
    console.log(`// aspectRatio=${result.aspectRatio}, width@24.5px=${result.cssWidthAt24_5px}px, totalStrokeLen=${result.totalStrokeLen}`);
  }
}

main();
