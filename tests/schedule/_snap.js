/**
 * Snapshot teks per kartu: membandingkan versi index.html yang sedang diuji dengan baseline versi LAMA.
 * Baseline diambil dari git (tanpa stash, tanpa mengubah working tree):
 *   - env BASELINE_REF (default: commit sebelum perubahan layout) dibaca dengan `git show <ref>:index.html`
 *   - env BASELINE_FILE untuk memakai berkas lain sebagai baseline
 * Output: daftar teks per slot (.rk-kas, .rk-flow, ...), per panel (.rk-cat > *), plus baris tabel.
 * Selisih yang diizinkan HANYA: kalimat ringkasan header (#rk-head) dan label sidebar (.sb-*).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const BASE_REF = process.env.BASELINE_REF || 'b0619f2';
const BASE_FILE = process.env.BASELINE_FILE;

function loadHtml(which) {
  if (which === 'new') return fs.readFileSync(process.env.INDEX_PATH || path.join(ROOT, 'index.html'), 'utf8');
  if (BASE_FILE && fs.existsSync(BASE_FILE)) return fs.readFileSync(BASE_FILE, 'utf8');
  const fixture = path.join(ROOT, 'tests', 'schedule', 'fixtures', 'baseline_b0619f2.html');
  if (fs.existsSync(fixture)) return fs.readFileSync(fixture, 'utf8');
  try {
    return execSync('git show ' + BASE_REF + ':index.html', { cwd: ROOT, maxBuffer: 1 << 26 }).toString();
  } catch (e) {
    const fallbackGit = 'C:\\Users\\daffa\\Documents\\GitHub\\RencanaKeuangan';
    if (fs.existsSync(fallbackGit)) {
      return execSync('git -C "' + fallbackGit + '" show ' + BASE_REF + ':index.html', { maxBuffer: 1 << 26 }).toString();
    }
    throw e;
  }
}

const MODE = require('./fixtures/snapshot_data.js');

/** Jalankan satu index.html di jsdom dengan data fixture yang sama dan tanggal acuan tetap. */
function render(html, data) {
  html = html.replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, '');
  const w = new JSDOM(html, {
    url: 'https://t.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(x) {
      x.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      x.Element.prototype.scrollIntoView = function () {};
      x.Element.prototype.getBoundingClientRect = function () { return { width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, x: 0, y: 0 }; };
      Object.defineProperty(x.Element.prototype, "clientWidth", { get: function() { return 600; }, configurable: true });
      Object.defineProperty(x.Element.prototype, "clientHeight", { get: function() { return 250; }, configurable: true });
      if (x.SVGElement && !x.SVGElement.prototype.getBBox) {
        x.SVGElement.prototype.getBBox = function() {
          var txt = this.textContent || "";
          return { x: 0, y: 0, width: txt.length * 7, height: 14 };
        };
      };
    },
  }).window;
  // Tanggal acuan + data sama untuk kedua versi.
  w.__today = '2026-11-12';
  data.seed(w, w);
  if (typeof w.renderAll === 'function') w.renderAll();
  return w;
}

/** Teks ringkas satu elemen: judul/heading, label, nominal, urutan item — tanpa markup. */
function textOf(el) {
  if (!el) return null;
  const norm = (s) => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const out = [];
  el.querySelectorAll('h2, h3, .h2, .card > h2, .sub.fw6, .big, .hm-big, .am b, .jv, li, tr, .it2, .chip').forEach((n) => {
    // Hindari duplikasi: hanya ambil elemen yang tidak berisi elemen pengumpul lain.
    if (n.querySelector('h2, .big, .am b, li, tr, .it2')) return;
    const t = norm(n.textContent);
    if (t) out.push(t);
  });
  const txt = norm(el.textContent);
  return { text: txt, parts: out };
}

function slots(w) {
  const doc = w.document;
  const tab = doc.getElementById('tab-rincian');
  if (tab) {
    return {
      kas: textOf(tab.querySelector('.stack > .card')),
      bills: textOf(doc.getElementById('upcoming-bills-list')),
      mf: textOf(doc.getElementById('bar-month-detail')),
      cat: textOf(doc.getElementById('where-cat-list')),
      top: textOf(doc.getElementById('top5-items-list')),
      where: textOf(doc.getElementById('card-where-money')),
      detail: textOf(doc.getElementById('monthly-flow-tbody')),
      tx: textOf(doc.getElementById('recent-tx-groups')),
      head: (doc.getElementById('rk-head') || {}).textContent || '',
      sidebar: [...doc.querySelectorAll('.nav-btn .nav-label, .nav-section-title')].map((e) => e.textContent.trim()).filter(Boolean),
      footprint: [...tab.querySelectorAll(':scope > .stack > *')].map((e) => e.id || e.className.split(' ')[0]),
    };
  }
  const grid = doc.querySelector('.rk, .splitR') ? findGrid(doc) : null;
  const o = {};
  const map = {
    kas: '.rk-kas',
    flow: '.rk-flow',
    mf: '.rk-mf',
    bills: '.rk-bills',
    cat: '.rk-cat',
    top: '.rk-top',
    detail: '.rk-detail',
    tx: '.rk-tx',
  };
  if (!grid) return { error: 'grid tidak ditemukan' };
  for (const k in map) {
    let n = doc.querySelector(map[k]);
    if (k === 'cat' && n) {
      const kids = [...n.children];
      o[k] = textOf(n);
      o['cat-panel1'] = textOf(kids[0]);
      o['cat-panel2'] = textOf(doc.querySelector('.rk-top'));
    } else {
      o[k] = textOf(n);
    }
  }
  o.head = (doc.getElementById('rk-head') || {}).textContent || '';
  o.sidebar = [...doc.querySelectorAll('.sb-lbl, .sb-head, .nav-lbl')].map((e) => e.textContent.trim()).filter(Boolean);
  o.footprint = [...doc.querySelectorAll('.rk > *')].map((e) => e.className.split(' ')[0]);
  return o;
}

function findGrid(doc) {
  // versi lama tidak punya .rk; grid lama adalah dua div pembungkus (.splitR/.splitH)
  return doc.querySelector('.rk') || doc.querySelector('.splitR') || doc.querySelector('#v-rincian');
}

module.exports = { loadHtml, render, slots, textOf, BASE_REF };

if (require.main === module) {
  const a = slots(render(loadHtml('new'), MODE));
  const b = slots(render(loadHtml('old'), MODE));
  const j = JSON.stringify({ new: a, old: b }, null, 1);
  const out = process.env.SNAP_OUT;
  if (out) fs.writeFileSync(out, j);
  console.log(j.slice(0, 4000));
}
