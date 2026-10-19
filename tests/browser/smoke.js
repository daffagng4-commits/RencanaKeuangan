/**
 * Tes browser sungguhan (opsional): memeriksa tampilan HP (lebar 390 px) mode terang & gelap di semua tab dan
 * jendela, tidak ada error halaman, dan unduhan file benar-benar menghasilkan file. Menyimpan tangkapan layar
 * ke tests/browser/out/.
 *
 * Pakai:  npm i -D puppeteer   lalu   npm run test:browser
 * (Atau pakai puppeteer-core + env CHROME_PATH=/path/ke/chrome, CHROME_ARGS='["--no-sandbox"]'.)
 */
const path = require('path');
const fs = require('fs');
let puppeteer;
try { puppeteer = require('puppeteer'); } catch (e) {
  try { puppeteer = require('puppeteer-core'); } catch (e2) { console.error('Pasang dulu: npm i -D puppeteer'); process.exit(1); }
}
const FILE = 'file://' + path.join(__dirname, '..', '..', 'dist', 'index.html');
const OUT = path.join(__dirname, 'out');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'dl'), { recursive: true });
  const opts = { args: JSON.parse(process.env.CHROME_ARGS || '["--no-sandbox"]'), headless: process.env.CHROME_HEADLESS || true };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  const browser = await puppeteer.launch(opts);

  for (const scheme of ['light', 'dark']) {
    const p = await browser.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.evaluateOnNewDocument(() => { window.__today = '2027-03-10'; });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(FILE, { waitUntil: 'load' });
    await sleep(300);
    const width = async (name) => {
      const w = await p.evaluate(() => ({ iw: innerWidth, sw: document.documentElement.scrollWidth }));
      check(w.iw === 390 && w.sw <= 390, `${scheme} ${name}: halaman melebar (innerWidth=${w.iw}, scrollWidth=${w.sw})`);
    };
    const inView = async (sel, name) => {
      const r = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right }; }, sel);
      check(r && r.l >= 0 && r.r <= 391, `${scheme} ${name}: jendela keluar layar`);
    };
    const shot = async (n) => p.screenshot({ path: path.join(OUT, `${scheme}-${n}.png`) });

    for (const tab of ['rincian', 'jadwal', 'item']) {
      await p.evaluate((t) => document.querySelector('nav button[data-t=' + t + ']').click(), tab);
      await sleep(150);
      await width('tab ' + tab);
      await shot('tab-' + tab);
    }
    const modals = [
      ['Impor/Ekspor', () => document.getElementById('bk').click(), '#m .card'],
      ['Tambah saldo', () => document.getElementById('adjb').click(), '#am .card'],
      ['Ubah harga', () => window.openPm(window.S.items[0].id), '#pm .card'],
      ['Pengingat', () => document.getElementById('rem').click(), '#rm .card'],
    ];
    for (const [name, open, sel] of modals) {
      await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => (m.hidden = true)));
      await p.evaluate(open);
      await sleep(150);
      await width('jendela ' + name);
      await inView(sel, 'jendela ' + name);
      await shot('modal-' + name.replace(/\W+/g, '-'));
    }
    check(errs.length === 0, `${scheme}: error halaman: ${errs.join(' | ')}`);
    await p.close();
  }

  const q = await browser.newPage();
  const cdp = await q.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.join(OUT, 'dl') });
  await q.goto(FILE, { waitUntil: 'load' });
  await q.evaluate(() => document.getElementById('bk').click());
  for (const k of ['json', 'items', 'hist', 'bulan']) {
    await q.evaluate((x) => document.querySelector('#exb button[data-ex=' + x + ']').click(), k);
    await sleep(400);
  }
  const files = fs.readdirSync(path.join(OUT, 'dl'));
  check(files.length >= 4, 'unduhan: hanya ' + files.length + ' file terunduh (' + files.join(', ') + ')');
  await browser.close();

  console.log(fails.length ? 'GAGAL:\n - ' + fails.join('\n - ') : 'Tes browser lulus (tampilan HP terang/gelap, jendela, unduhan: ' + fs.readdirSync(path.join(OUT, 'dl')).join(', ') + ').');
  process.exit(fails.length ? 1 : 0);
})();
