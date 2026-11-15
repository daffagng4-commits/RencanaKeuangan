const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function traceDraw() {
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

  // Instrument ResizeObserver and draw in browser
  await page.evaluate(() => {
    const svg = document.querySelector('.rk-kas svg.lc');
    const origDraw = window.LC_LIVE && window.LC_LIVE[0];
    console.log('LC_LIVE count:', window.LC_LIVE ? window.LC_LIVE.length : 0);

    // Let's inspect ResizeObserver on svg
    console.log('Attaching mutation observer and resize observer logging...');
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log('RO event on target:', entry.target.tagName, entry.target.className,
          'contentRect:', entry.contentRect.width, 'x', entry.contentRect.height,
          'svg clientHeight:', svg.clientHeight,
          'lc-wrap clientHeight:', svg.parentElement.clientHeight,
          'cond-flow clientHeight:', svg.parentElement.parentElement.clientHeight,
          'rk-kas clientHeight:', document.querySelector('.rk-kas').clientHeight,
          'rk-bills clientHeight:', document.querySelector('.rk-bills').clientHeight
        );
      }
    });
    ro.observe(svg);
    ro.observe(svg.parentElement);
    ro.observe(document.querySelector('.rk-kas'));
  });

  console.log('=== SWITCHING TAB TO KAS ===');
  await page.evaluate(() => tab('kas'));
  await new Promise(r => setTimeout(r, 200));

  console.log('=== SWITCHING TAB TO RINCIAN ===');
  await page.evaluate(() => tab('rincian'));
  await new Promise(r => setTimeout(r, 300));

  await browser.close();
}

traceDraw().catch(console.error);
