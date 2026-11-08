/**
 * Pemeriksaan cepat yang menangkap kelas error "satu salah ketik mematikan seluruh aplikasi":
 *  1. setiap file js/ dan tools/ dikompilasi (tanpa dijalankan) -> error sintaks langsung ketahuan;
 *  2. setiap <script> inline di index.html dan dist/index.html dikompilasi (yang benar-benar dimuat browser);
 *  3. index.html harus sama dengan hasil build dari sumber (index.dev.html + css/ + js/).
 * Dipanggil oleh `npm run check` dan CI. Keluar dengan kode 1 bila ada masalah.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
let bad = 0, n = 0;

function compile(code, name) {
  n++;
  try {
    new vm.Script(code, { filename: name });
  } catch (e) {
    bad++;
    const line = (String(e.stack).match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':(\\d+)')) || [])[1];
    console.error('SINTAKS GAGAL  ' + name + (line ? ' baris ' + line : '') + ': ' + e.message);
  }
}
function walk(dir, ext, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, ext, out); }
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

walk(path.join(root, 'js'), '.js', []).forEach((f) => compile(fs.readFileSync(f, 'utf8'), path.relative(root, f)));
walk(path.join(root, 'tools'), '.js', []).forEach((f) => compile(fs.readFileSync(f, 'utf8'), path.relative(root, f)));

const pages = ['index.html', 'dist/index.html'].concat(
  walk(path.join(root, 'tools'), '.html', []).map((f) => path.relative(root, f)),
);
pages.forEach((rel) => {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) return;
  const html = fs.readFileSync(f, 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m, i = 0;
  while ((m = re.exec(html))) {
    if (/\bsrc=/.test(m[1]) || (/\btype=/.test(m[1]) && !/javascript|module/.test(m[1]))) continue;
    if (!m[2].trim()) continue;
    compile(m[2], rel + '#script' + ++i);
  }
});

// Kesegaran bundel
const { build } = require(path.join(root, 'build.js'));
const cur = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
const norm = (s) => s.replace(/\r\n/g, '\n');
if (norm(cur) !== norm(build().html)) {
  bad++;
  console.error('BUNDEL USANG   index.html tidak sama dengan hasil build. Jalankan "npm run build" dan commit hasilnya.');
}

console.log(bad ? '\n' + bad + ' masalah ditemukan.' : 'OK: ' + n + ' skrip dikompilasi tanpa error sintaks; index.html sinkron dengan sumber.');
process.exit(bad ? 1 : 0);
