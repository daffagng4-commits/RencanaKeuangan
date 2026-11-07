// Menggabungkan index.html + css + semua js menjadi SATU file: dist/index.html
// Pakai:  node build.js
const fs = require('fs'), path = require('path');
const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</style>');
const files = [];
html = html.replace(/<script src="(js\/[^"]+)"><\/script>\n?/g, (_, f) => { files.push(f); return ''; });
const js = files.map(f => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
if (files.length > 0) {
  const lastBody = html.lastIndexOf('</body>');
  html = lastBody !== -1 ? html.slice(0, lastBody) + '<script>\n' + js + '\n</script>\n' + html.slice(lastBody) : html + '<script>\n' + js + '\n</script>';
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html dibuat (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' file js)');
