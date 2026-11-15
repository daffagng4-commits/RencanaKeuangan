const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function debugNav() {
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

  await page.evaluate(() => {
    console.log('=== INITIAL LOAD ===');
    const kas = document.querySelector('.rk-kas');
    const bills = document.querySelector('.rk-bills');
    const cf = document.querySelector('.cond-flow');
    const lcw = document.querySelector('.cond-flow .lc-wrap');
    const svg = document.querySelector('.rk-kas svg.lc');
    console.log('kas height:', kas.offsetHeight, 'bills height:', bills.offsetHeight);
    console.log('cond-flow height:', cf.offsetHeight, 'lc-wrap height:', lcw.offsetHeight, 'svg height:', svg.clientHeight, 'viewBox:', svg.getAttribute('viewBox'));

    console.log('=== SWITCHING TO TAB KAS ===');
    tab('kas');
    console.log('in tab kas, v-rincian hidden:', document.getElementById('v-rincian').hidden);

    console.log('=== SWITCHING BACK TO RINCIAN ===');
    tab('rincian');
    console.log('after tab rincian immediately:');
    console.log('kas height:', kas.offsetHeight, 'bills height:', bills.offsetHeight);
    console.log('cond-flow height:', cf.offsetHeight, 'lc-wrap height:', lcw.offsetHeight, 'svg height:', svg.clientHeight, 'viewBox:', svg.getAttribute('viewBox'));
  });

  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    console.log('=== AFTER 400ms DELAY ===');
    const kas = document.querySelector('.rk-kas');
    const bills = document.querySelector('.rk-bills');
    const cf = document.querySelector('.cond-flow');
    const lcw = document.querySelector('.cond-flow .lc-wrap');
    const svg = document.querySelector('.rk-kas svg.lc');
    console.log('kas height:', kas.offsetHeight, 'bills height:', bills.offsetHeight);
    console.log('cond-flow height:', cf.offsetHeight, 'lc-wrap height:', lcw.offsetHeight, 'svg height:', svg.clientHeight, 'viewBox:', svg.getAttribute('viewBox'));
  });

  await browser.close();
}

debugNav().catch(console.error);
