const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function testSingle() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');

  await page.evaluateOnNewDocument((r) => {
    localStorage.setItem('rencana-keuangan-v1', r);
  }, rawData);

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const h0 = await page.evaluate(() => {
    return {
      kas: document.querySelector('.rk-kas').getBoundingClientRect().height,
      bills: document.querySelector('.rk-bills').getBoundingClientRect().height,
      svg: document.querySelector('.rk-kas svg.lc').getBoundingClientRect().height,
      viewBox: document.querySelector('.rk-kas svg.lc').getAttribute('viewBox'),
      lcw: document.querySelector('.cond-flow .lc-wrap').getBoundingClientRect().height,
    };
  });
  console.log('INITIAL:', h0);

  // Switch to kas
  await page.evaluate(() => tab('kas'));
  await new Promise(r => setTimeout(r, 200));

  // Switch back to rincian
  await page.evaluate(() => tab('rincian'));
  await new Promise(r => setTimeout(r, 300));

  const h1 = await page.evaluate(() => {
    return {
      kas: document.querySelector('.rk-kas').getBoundingClientRect().height,
      bills: document.querySelector('.rk-bills').getBoundingClientRect().height,
      svg: document.querySelector('.rk-kas svg.lc').getBoundingClientRect().height,
      viewBox: document.querySelector('.rk-kas svg.lc').getAttribute('viewBox'),
      lcw: document.querySelector('.cond-flow .lc-wrap').getBoundingClientRect().height,
    };
  });
  console.log('AFTER TAB KAS -> RINCIAN:', h1);

  await browser.close();
}

testSingle().catch(console.error);
