// Menggabungkan index.dev.html + css + semua js menjadi SATU file: index.html (disalin juga ke dist/).
//
//   node build.js            tulis index.html + dist/
//   node build.js --check    gagal (kode 1) bila index.html yang ada tidak sama dengan hasil build
//
// SUMBER KEBENARAN: index.dev.html (markup + daftar <script>), css/style.css, dan js/**.
// index.html adalah HASIL build; jangan diedit langsung.
const fs = require('fs'), path = require('path');
const root = __dirname;

function build() {
  let html = fs.readFileSync(path.join(root, 'index.dev.html'), 'utf8');
  // Catatan: pakai fungsi (bukan string) sebagai pengganti, supaya "$&", "$'" dsb. di dalam kode JS tidak ditafsirkan.
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => {
    // url(fonts/xx.woff2) di CSS disematkan sebagai data URI, supaya index.html tetap SATU file dan jalan offline
    const css = fs.readFileSync(path.join(root, f), 'utf8').trim().replace(/url\((fonts\/[^)]+\.woff2)\)/g, (_m, u) =>
      'url(data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'css', u)).toString('base64') + ')');
    return '<style>\n' + css + '\n</style>';
  });
  const files = [];
  html = html.replace(/<script src="(js\/[^"]+)"><\/script>\r?\n?/g, (_, f) => { files.push(f); return ''; });
  const js = files
    .map((f) => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(root, f), 'utf8').trim())
    .join('\n\n');
  html = html.replace(/<\/body>\s*<\/html>\s*$/, () => (js ? '<script>\n' + js + '\n</script>\n' : '') + '</body>\n</html>\n');
  return { html, files };
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function main() {
  const { html, files } = build();
  const idx = path.join(root, 'index.html');
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(idx) ? fs.readFileSync(idx, 'utf8') : '';
    const norm = (s) => s.replace(/\r\n/g, '\n');
    if (norm(cur) !== norm(html)) {
      console.error('GAGAL: index.html tidak sinkron dengan index.dev.html + css/ + js/.');
      console.error('       Jalankan "npm run build" lalu commit index.html (dan dist/) yang baru.');
      process.exit(1);
    }
    console.log('OK: index.html sinkron dengan sumber (' + files.length + ' file js).');
    return;
  }
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(idx, html);
  fs.writeFileSync(path.join(root, 'dist/index.html'), html);
  // Salin file pendukung (manifest, service worker, ikon, tools) ke dist/
  ['manifest.webmanifest', 'sw.js', 'apple-touch-icon.png'].forEach((f) => {
    const p = path.join(root, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(root, 'dist', f));
  });
  copyDir(path.join(root, 'tools'), path.join(root, 'dist/tools'));
  console.log('index.html + dist/index.html dibuat (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' file js) beserta file pendukung');
}

module.exports = { build };
if (require.main === module) main();
