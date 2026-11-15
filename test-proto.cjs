const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function testPrototypeFix() {
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

  for (const vp of [1280, 1920, 2560, 3840]) {
    await page.setViewport({ width: vp, height: 1200 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    // Inject the proposed CSS and JS changes into the page to test
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .cond-flow .lc-wrap {
          position: relative !important;
          flex: 1 1 auto !important;
          min-height: 190px !important;
          width: 100% !important;
          overflow: visible !important;
        }
        .cond-flow .lc-wrap svg.lc {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        .rk-mf .bs-chart {
          position: relative !important;
          flex: 1 1 auto !important;
          min-height: 180px !important;
          height: auto !important;
        }
        .rk-mf .bs-chart svg {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
      `;
      document.head.appendChild(style);
      chartMount(document.getElementById('v-rincian'));
    });

    await new Promise(r => setTimeout(r, 300));

    const initial = await page.evaluate(() => {
      const getH = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().height : null;
      };
      return {
        kas: getH('.rk-kas'),
        bills: getH('.rk-bills'),
        svg: getH('.rk-kas svg.lc'),
        viewBox: document.querySelector('.rk-kas svg.lc').getAttribute('viewBox'),
        lcw: getH('.cond-flow .lc-wrap')
      };
    });

    // Switch to kas tab
    await page.evaluate(() => tab('kas'));
    await new Promise(r => setTimeout(r, 200));

    // Switch back to rincian
    await page.evaluate(() => tab('rincian'));
    await new Promise(r => setTimeout(r, 300));

    const after = await page.evaluate(() => {
      const getH = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().height : null;
      };
      return {
        kas: getH('.rk-kas'),
        bills: getH('.rk-bills'),
        svg: getH('.rk-kas svg.lc'),
        viewBox: document.querySelector('.rk-kas svg.lc').getAttribute('viewBox'),
        lcw: getH('.cond-flow .lc-wrap')
      };
    });
    console.log(`VP ${vp}: diffKas: ${after.kas - initial.kas}, diffSvg: ${after.svg - initial.svg}, initialKas: ${initial.kas}, afterKas: ${after.kas}`);
  }

  await browser.close();
}

testPrototypeFix().catch(console.error);
