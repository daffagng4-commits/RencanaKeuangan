#!/usr/bin/env node
/**
 * Skrip sekali jalan untuk mengonversi wordmark "RenKeu" berfont Pacifico Regular
 * menjadi path SVG per huruf (R, e, n, K, e, u), kotak batas tiap huruf, dan viewBox ketat.
 *
 * Lisensi font: Pacifico (Vernon Adams), SIL Open Font License 1.1.
 * Dependensi (tidak dimasukkan ke package.json): opentype.js@1.3.4 dan @fontsource/pacifico
 * (atau berkas Pacifico-Regular.ttf / pacifico-latin-400-normal.woff).
 *
 * Contoh pemakaian:
 *   NODE_PATH=/path/to/scratch/node_modules node tools/gen-wordmark-pacifico.js
 *   node tools/gen-wordmark-pacifico.js --font /path/to/pacifico-latin-400-normal.woff --json
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
const CLIP_PAD_X = 0.35;
const CLIP_PAD_Y = 0.25;

function round2(n) {
  return Math.round(n * 100) / 100;
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

  // Hitung kotak batas gabungan untuk menggeser koordinat mulai dekat (PAD, PAD)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const rawBoxes = rawPaths.map((p) => {
    const bb = p.getBoundingBox();
    if (bb.x1 < minX) minX = bb.x1;
    if (bb.y1 < minY) minY = bb.y1;
    if (bb.x2 > maxX) maxX = bb.x2;
    if (bb.y2 > maxY) maxY = bb.y2;
    return bb;
  });

  const shiftX = -minX + PAD;
  const shiftY = -minY + PAD;

  // Bangun ulang path dengan pergeseran bersih agar viewBox mulai dari 0 0
  const shiftedPaths = font.getPaths(TEXT, shiftX, shiftY, FONT_SIZE, {
    kerning: true,
    letterSpacing: LETTER_SPACING_EM,
  });

  const glyphs = [];
  const boxes = [];
  let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;

  for (let i = 0; i < shiftedPaths.length; i++) {
    const p = shiftedPaths[i];
    const d = p.toPathData(2);
    if (!d || /NaN|Infinity/i.test(d)) {
      throw new Error(`Path glyph ${i} (${TEXT[i]}) tidak valid (mengandung NaN/kosong); pastikan opentype.js@1.3.4`);
    }
    const bb = p.getBoundingBox();
    if (bb.x1 < gMinX) gMinX = bb.x1;
    if (bb.y1 < gMinY) gMinY = bb.y1;
    if (bb.x2 > gMaxX) gMaxX = bb.x2;
    if (bb.y2 > gMaxY) gMaxY = bb.y2;
    glyphs.push(d);
    boxes.push({
      ch: TEXT[i],
      x: round2(bb.x1 - CLIP_PAD_X),
      y: round2(bb.y1 - CLIP_PAD_Y),
      w: round2((bb.x2 - bb.x1) + CLIP_PAD_X * 2),
      h: round2((bb.y2 - bb.y1) + CLIP_PAD_Y * 2),
      raw: {
        x1: round2(bb.x1),
        y1: round2(bb.y1),
        x2: round2(bb.x2),
        y2: round2(bb.y2),
      },
    });
  }

  const vbX = 0;
  const vbY = 0;
  const vbW = round2(gMaxX + PAD);
  const vbH = round2(gMaxY + PAD);
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

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
    cssWidthAt22_5px: round2((vbW / vbH) * 22.5),
    glyphs,
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
      'var RK_WM_BOXES = ' +
      JSON.stringify(result.boxes.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })), null, 2) +
      ';'
    );
    console.log(`// aspectRatio=${result.aspectRatio}, width@22.5px=${result.cssWidthAt22_5px}px`);
  }
}

main();
