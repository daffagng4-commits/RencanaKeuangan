const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function testNavBug() {
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

  const viewports = [1280, 1920, 2560, 3840];
  const years = ['2026', '2027'];
  const tabs = ['kas', 'jadwal', 'item', 'sim'];

  const results = [];

  for (const vp of viewports) {
    await page.setViewport({ width: vp, height: 1200 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    for (const yr of years) {
      // Select year
      await page.evaluate((y) => {
        if (typeof setYear === 'function') setYear(y);
      }, yr);
      await new Promise(r => setTimeout(r, 300));

      // Measure initial state
      const initial = await page.evaluate(() => {
        const getH = (sel) => {
          const el = document.querySelector(sel);
          return el ? el.getBoundingClientRect().height : null;
        };
        return {
          kas: getH('.rk-kas'),
          bills: getH('.rk-bills'),
          mf: getH('.rk-mf'),
          where: getH('.rk-where'),
          top: getH('.rk-top'),
          tx: getH('.rk-tx'),
          kasChartSvg: getH('.rk-kas svg.lc'),
          mfSvg: getH('.rk-mf .bs-chart svg'),
          donutRing: getH('.rk-where .dn-ring')
        };
      });

      // Switch to each tab and back to rincian
      for (const t of tabs) {
        await page.evaluate((tabName) => {
          tab(tabName);
        }, t);
        await new Promise(r => setTimeout(r, 200));

        await page.evaluate(() => {
          tab('rincian');
        }, null);
        await new Promise(r => setTimeout(r, 300));

        const after = await page.evaluate(() => {
          const getH = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.getBoundingClientRect().height : null;
          };
          return {
            kas: getH('.rk-kas'),
            bills: getH('.rk-bills'),
            mf: getH('.rk-mf'),
            where: getH('.rk-where'),
            top: getH('.rk-top'),
            tx: getH('.rk-tx'),
            kasChartSvg: getH('.rk-kas svg.lc'),
            mfSvg: getH('.rk-mf .bs-chart svg'),
            donutRing: getH('.rk-where .dn-ring')
          };
        });

        results.push({
          viewport: vp,
          year: yr,
          tabTested: t,
          initial,
          after,
          kasDiff: after.kas - initial.kas,
          billsDiff: after.bills - initial.bills,
          kasChartDiff: after.kasChartSvg - initial.kasChartSvg
        });
      }
    }
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

testNavBug().catch(console.error);
