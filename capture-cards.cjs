const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';
const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-d';

const CARDS = [
  { name: 'kondisi-kas', sel: '.rk-kas' },
  { name: 'jadwal-tagihan', sel: '.rk-bills' },
  { name: 'pemasukan-pengeluaran', sel: '.rk-mf' },
  { name: 'pengeluaran-kategori', sel: '.rk-cat' },
  { name: 'item-terbesar', sel: '.rk-top' },
  { name: 'rincian-arus', sel: '.rk-detail' },
  { name: 'transaksi-terakhir', sel: '.rk-tx' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(APP_URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  for (const profile of [2026, 2027]) {
    await page.evaluate(y => {
      if (window.switchYear) window.switchYear(y);
    }, profile);
    await new Promise(r => setTimeout(r, 400));

    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => {
        document.documentElement.setAttribute('data-theme', t);
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await new Promise(r => setTimeout(r, 200));

      for (const card of CARDS) {
        const el = await page.$(card.sel);
        if (el) {
          const filename = `1920-${theme}-${profile}-${card.name}.png`;
          await el.screenshot({ path: path.join(OUT_DIR, filename) });
        }
      }
    }
  }

  await browser.close();
  console.log('Card screenshots saved.');
}

run().catch(console.error);
