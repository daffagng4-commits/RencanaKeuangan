const fs = require('fs');
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const raw = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument((r) => {
    localStorage.setItem('rencana-keuangan-v1', r);
  }, raw);

  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', {
    waitUntil: 'networkidle0'
  });
  await new Promise((r) => setTimeout(r, 800));

  // Click Masuk tab
  await page.evaluate(() => {
    const btn = document.querySelector('.rk-tx [data-txd="+"]');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const txCard = await page.$('.rk-tx');
  if (txCard) {
    await txCard.screenshot({ path: 'C:/Users/daffa/Documents/verif-fase-d/tx-masuk-card.png' });
    console.log('Saved C:/Users/daffa/Documents/verif-fase-d/tx-masuk-card.png');
  }

  const txContent = await page.evaluate(() => {
    const el = document.querySelector('.rk-tx');
    return el ? el.innerText : 'NOT FOUND';
  });
  console.log('TX Card Text Content:\n', txContent);

  await browser.close();
})().catch(console.error);
