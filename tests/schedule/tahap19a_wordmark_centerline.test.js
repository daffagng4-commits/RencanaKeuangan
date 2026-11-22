const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { boot } = require('./ui.js');

const ROOT = path.resolve(__dirname, '../..');

function approx(actual, expected, tol = 1e-3, msg = '') {
  assert(
    Math.abs(actual - expected) <= tol,
    `${msg} (actual=${actual}, expected=${expected}, tol=${tol})`
  );
}

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, errs } = t;
  const doc = w.document;

  w.__today = '2026-11-22';
  w.switchYear(2026);
  w.S.startMonth = 10;
  w.S.saldo = 12000000;
  w.S.items = [
    { id: 1911, name: 'Internet Rumah', price: 375000, n: 1, unit: 'bulan', start: '2026-11-10', end: '', cnt: 0, cat: 'Utilitas', ch: [] },
  ];
  w.S.paid = {};
  w.S.skip = {};
  w.sbUser = null;
  w.renderAll();
  w.setShellMode('mobile-app');

  const shellRoot = $('mobile-app-shell');
  const wm = shellRoot.querySelector('svg.mt-wordmark');
  assert(wm, 'svg.mt-wordmark tersedia');

  // 1. Struktur 9 jalur sumbu tengah (centerline terbuka, bukan outline tertutup Z di tepi huruf)
  assert(Array.isArray(w.RK_WM_STROKES) && w.RK_WM_STROKES.length === 6, 'RK_WM_STROKES memiliki 6 entri huruf');
  assert.deepStrictEqual(
    [...w.RK_WM_STROKES].map((ls) => ls.length),
    [2, 1, 1, 3, 1, 1],
    'Jumlah guratan tulisan tangan per huruf: R:2, e:1, n:1, K:3, e:1, u:1 (total 9)'
  );
  let totalLen = 0;
  const flat = [];
  for (let li = 0; li < 6; li++) {
    for (const seg of w.RK_WM_STROKES[li]) {
      assert.strictEqual(seg.li, li, `Segmen huruf ${li} menyimpan indeks huruf li=${li}`);
      assert(!/Z\s*$/i.test(seg.d), `Jalur centerline huruf ${li} terbuka (bukan outline tepi tertutup Z)`);
      assert(seg.len > 15 && seg.len < 120, `Panjang guratan centerline huruf ${li} wajar (${seg.len})`);
      totalLen += seg.len;
      flat.push(seg);
    }
  }
  assert(totalLen > 360 && totalLen < 520, `Total panjang centerline (~425) jauh lebih ringkas daripada keliling outline (~835): ${totalLen.toFixed(2)}`);

  // 2. Klip siluet glyph per huruf (6 <clipPath> dari RK_WM_GLYPHS, bukan rect Tahap 18)
  assert(!wm.querySelector('.mt-wm-clip-rect, filter, feGaussianBlur, text'), 'Bebas rect klip Tahap 18, filter blur, dan <text>');
  const glyphClips = [...wm.querySelectorAll('defs clipPath.mt-wm-glyph-clip')];
  assert.strictEqual(glyphClips.length, 6, 'Tepat 6 <clipPath class="mt-wm-glyph-clip"> (1 per huruf Pacifico)');
  const clipIds = glyphClips.map((cp, idx) => {
    const id = cp.getAttribute('id');
    assert(id && id.startsWith('rk-wm-g-'), `clipPath ${idx} punya ID berawalan rk-wm-g-`);
    const pathEl = cp.querySelector('path');
    assert(pathEl && pathEl.getAttribute('d') === w.RK_WM_GLYPHS[idx], `clipPath ${idx} memakai siluet exact RK_WM_GLYPHS[${idx}]`);
    return id;
  });
  assert.strictEqual(new Set(clipIds).size, 6, 'Semua 6 ID clipPath siluet unik');

  // 3. Grup .mt-wm-drawn-grp membungkus 9 .mt-wm-drawn agar tidak ada bercak alpha ganda di persimpangan
  const drawnGrp = wm.querySelector('g.mt-wm-strokes g.mt-wm-drawn-grp');
  assert(drawnGrp, 'Grup g.mt-wm-drawn-grp tersedia untuk mengisi tubuh huruf secara seragam');
  const drawnPaths = [...drawnGrp.querySelectorAll('path.mt-wm-drawn')];
  assert.strictEqual(drawnPaths.length, 9, 'Tepat 9 path .mt-wm-drawn di dalam .mt-wm-drawn-grp');
  drawnPaths.forEach((p, idx) => {
    const li = flat[idx].li;
    assert.strictEqual(p.getAttribute('clip-path'), `url(#${clipIds[li]})`, `drawn ${idx} diklip ketat ke siluet huruf ${li}`);
    assert.strictEqual(p.getAttribute('pathLength'), '1', `drawn ${idx} memakai pathLength="1"`);
  });

  // 4. Lapisan aktif kepala/ekor dalam diklip ke huruf aktif saat progres bergerak
  const headEl = wm.querySelector('path.mt-wm-head');
  const tail1El = wm.querySelector('path.mt-wm-tail-1');
  const tail2El = wm.querySelector('path.mt-wm-tail-2');
  const haloOutEl = wm.querySelector('path.mt-wm-halo-outer');
  assert(headEl && tail1El && tail2El && haloOutEl, 'Lapisan kepala, ekor dalam, dan halo luar tersedia');
  assert.strictEqual(haloOutEl.getAttribute('clip-path'), null, 'Halo luar lembut tidak terpotong klip agar pendar kepala terasa');

  // Uji render pada beberapa P lewat tarikan jari
  const panel = $('m-tab-rincian');
  const fireTouch = (el, type, x, y) => {
    const ev = new w.Event(type, { bubbles: true, cancelable: true });
    const pt = { clientX: x, clientY: y };
    ev.touches = type === 'touchend' || type === 'touchcancel' ? [] : [pt];
    ev.changedTouches = [pt];
    el.dispatchEvent(ev);
  };
  w._rkPtrReset();
  fireTouch(panel, 'touchstart', 160, 100);
  for (const cp of [{ pullY: 13, p: 0.25 }, { pullY: 26, p: 0.50 }, { pullY: 39, p: 0.75 }]) {
    fireTouch(panel, 'touchmove', 160, 100 + cp.pullY * 2);
    const st = w.rkWmStrokeState(cp.p, flat);
    const actSeg = flat[st.activeIdx];
    const expectedClip = `url(#${clipIds[actSeg.li]})`;
    assert.strictEqual(headEl.getAttribute('d'), actSeg.d, `pullY=${cp.pullY}: kepala memakai jalur centerline segmen aktif ${st.activeIdx}`);
    assert.strictEqual(headEl.getAttribute('clip-path'), expectedClip, `pullY=${cp.pullY}: kepala diklip ketat ke siluet huruf ${actSeg.li}`);
    assert.strictEqual(tail1El.getAttribute('clip-path'), expectedClip, `pullY=${cp.pullY}: ekor-1 diklip ketat ke siluet huruf ${actSeg.li}`);
    assert.strictEqual(tail2El.getAttribute('clip-path'), expectedClip, `pullY=${cp.pullY}: ekor-2 diklip ketat ke siluet huruf ${actSeg.li}`);
  }
  fireTouch(panel, 'touchcancel', 160, 178);
  assert.strictEqual(shellRoot.getAttribute('data-wm-mode'), null, 'touchcancel kembali idle');

  // 5. Render ulang tidak menggandakan clipPath atau grup
  w.renderMobileApp();
  w.switchMobileTab('kas');
  w.renderMobileApp();
  w.switchMobileTab('rincian');
  assert.strictEqual(shellRoot.querySelectorAll('clipPath.mt-wm-glyph-clip').length, 6, 'Render ulang tidak menggandakan clipPath siluet');
  assert.strictEqual(shellRoot.querySelectorAll('path.mt-wm-drawn').length, 9, 'Render ulang tidak menggandakan .mt-wm-drawn');

  // 6. Audit CSS & sw.js >= v43
  const cssMob = fs.readFileSync(path.join(ROOT, 'css/mobile.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert(/\.mt-wm-drawn-grp\s*\{[^}]*opacity:\s*0\.7\d/i.test(cssMob), 'CSS: .mt-wm-drawn-grp menyatukan opacity tubuh tertulis agar bebas bercak alpha ganda');
  assert(/\.mt-wm-drawn\s*\{[^}]*stroke-width:\s*6\.8\b/i.test(cssMob), 'CSS: .mt-wm-drawn memakai stroke-width: 6.8 untuk mengisi penuh tubuh huruf Pacifico');
  assert(/\.mt-wm-head\s*\{[^}]*stroke-width:\s*6\.8\b/i.test(cssMob), 'CSS: .mt-wm-head mengisi penuh ketebalan tubuh huruf (6.8)');
  const swMatch = swSrc.match(/CACHE_NAME\s*=\s*['"]rk-cache-v(\d+)['"]/);
  assert(swMatch && Number(swMatch[1]) >= 43, 'sw.js CACHE_NAME dinaikkan ke >= rk-cache-v43');

  assert.strictEqual(errs.length, 0, 'Tidak ada runtime error jsdom: ' + errs.join('; '));
  console.log('OK: Semua asersi Tahap 19a (Centerline di Dalam Huruf + Klip Siluet Pacifico) lulus.');
  process.exit(0);
})().catch((e) => {
  console.error('GAGAL tahap19a_wordmark_centerline:', e);
  process.exit(1);
});
