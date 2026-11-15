const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e/navigasi';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runPreTest() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  const viewports = [1280, 1920, 2560, 3840];
  const years = ['2026', '2027'];
  const tabs = ['kas', 'jadwal', 'item', 'sim'];

  const report = [];

  for (const vp of viewports) {
    for (const yr of years) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp, height: 1200 });

      await page.evaluateOnNewDocument((r) => {
        localStorage.setItem('rencana-keuangan-v1', r);
      }, rawData);

      const logs = [];
      page.on('console', msg => {
        const txt = msg.text();
        if (txt.includes('[CHART_LOG]')) logs.push(txt);
      });

      await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));

      if (yr !== '2026') {
        await page.evaluate((y) => {
          if (typeof switchYear === 'function') switchYear(+y);
        }, yr);
        await new Promise(r => setTimeout(r, 300));
      }

      const getMeasurements = async () => {
        return await page.evaluate(() => {
          const getH = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.getBoundingClientRect().height : null;
          };
          const svg = document.querySelector('.rk-kas svg.lc');
          return {
            kas: getH('.rk-kas'),
            bills: getH('.rk-bills'),
            mf: getH('.rk-mf'),
            where: getH('.rk-where'),
            top: getH('.rk-top'),
            tx: getH('.rk-tx'),
            kasSvg: svg ? svg.getBoundingClientRect().height : null,
            kasViewBox: svg ? svg.getAttribute('viewBox') : null,
            mfSvg: getH('.rk-mf .bs-chart svg'),
            donutRing: getH('.rk-where .dn-ring')
          };
        });
      };

      const initial = await getMeasurements();

      // Test each tab
      for (const t of tabs) {
        await page.evaluate((tabName) => tab(tabName), t);
        await new Promise(r => setTimeout(r, 200));

        await page.evaluate(() => tab('rincian'));
        await new Promise(r => setTimeout(r, 300));

        const after = await getMeasurements();

        // Take a screenshot of the first tab test for each vp/yr
        if (t === 'kas') {
          const ssPath = path.join(OUT_DIR, `pre-${vp}-${yr}-after-kas.png`);
          await page.screenshot({ path: ssPath, fullPage: false });
        }

        report.push({
          viewport: vp,
          year: yr,
          tabTested: t,
          initialKas: initial.kas,
          afterKas: after.kas,
          diffKas: Number((after.kas - initial.kas).toFixed(2)),
          initialKasSvg: initial.kasSvg,
          afterKasSvg: after.kasSvg,
          diffKasSvg: Number((after.kasSvg - initial.kasSvg).toFixed(2)),
          initialBills: initial.bills,
          afterBills: after.bills,
          diffBills: Number((after.bills - initial.bills).toFixed(2)),
          initialViewBox: initial.kasViewBox,
          afterViewBox: after.kasViewBox,
          status: Math.abs(after.kas - initial.kas) <= 0.5 ? 'PASS' : 'FAIL (INFLATED)'
        });
      }

      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync('C:/Users/daffa/Documents/verif-fase-e/navigasi/pre-fix-report.json', JSON.stringify(report, null, 2));
  console.log('Pre-fix test finished. Report saved.');
  console.table(report.map(r => ({
    vp: r.viewport,
    yr: r.year,
    tab: r.tabTested,
    initKas: r.initialKas,
    afterKas: r.afterKas,
    diffKas: r.diffKas,
    initSvg: r.initialKasSvg,
    afterSvg: r.afterKasSvg,
    diffSvg: r.diffKasSvg,
    initVB: r.initialViewBox,
    afterVB: r.afterViewBox,
    status: r.status
  })));
}

runPreTest().catch(console.error);
