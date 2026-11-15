const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const raw = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  await page.evaluateOnNewDocument((r) => {
    localStorage.setItem('rencana-keuangan-v1', r);
  }, raw);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  
  // Click on 'Masuk' button in Transaksi terakhir
  await page.click('.rk-tx button[data-txd="+"]');
  await new Promise(r => setTimeout(r, 300));
  
  const txEl = await page.$('.rk-tx');
  if (txEl) {
    await txEl.screenshot({ path: 'C:/Users/daffa/Documents/verif-fase-e/tx-masuk-card.png' });
  }
  await page.screenshot({ path: 'C:/Users/daffa/Documents/verif-fase-e/viewport-1920-tx-masuk.png', fullPage: false });
  console.log('Screenshots saved: tx-masuk-card.png, viewport-1920-tx-masuk.png');
  await browser.close();
})();
