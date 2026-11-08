// Menggabungkan index.html + css + semua js menjadi SATU file: dist/index.html
// Pakai:  node build.js
const fs = require('fs'), path = require('path');
const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</style>');
const files = [];
html = html.replace(/<script src="(js\/[^"]+)"><\/script>\n?/g, (_, f) => { files.push(f); return ''; });
const js = files.map(f => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
html = html.replace(/<\/body>\s*<\/html>\s*$/, (js.trim() ? '<script>\n' + js + '\n</script>\n' : '') + '</body>\n</html>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);

// Salin file pendukung (manifest, service worker, ikon, tools) ke dist/
['manifest.webmanifest', 'sw.js', 'apple-touch-icon.png'].forEach(f => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(root, 'dist', f));
});
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(root, 'tools'), path.join(root, 'dist/tools'));

console.log('dist/index.html dibuat (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' file js) beserta file pendukung');
