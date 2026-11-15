const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e/navigasi';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runTask1Post() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  const viewports = [1280, 1920, 2560, 3840];
  const years = ['2026', '2027'];
  const tabs = ['kas', 'jadwal', 'item', 'sim'];

  const results = [];
  let allPass = true;

  for (const vp of viewports) {
    for (const yr of years) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp, height: 1200 });

      await page.evaluateOnNewDocument((r) => {
        localStorage.setItem('rencana-keuangan-v1', r);
      }, rawData);

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

      // Test each tab with 1 cycle
      for (const t of tabs) {
        await page.evaluate((tabName) => tab(tabName), t);
        await new Promise(r => setTimeout(r, 150));

        await page.evaluate(() => tab('rincian'));
        await new Promise(r => setTimeout(r, 200));

        const after = await getMeasurements();
        const diffKas = Math.abs(after.kas - initial.kas);
        const diffSvg = Math.abs(after.kasSvg - initial.kasSvg);
        const diffBills = Math.abs(after.bills - initial.bills);
        const pass = diffKas <= 0.5 && diffSvg <= 0.5 && diffBills <= 0.5;
        if (!pass) allPass = false;

        const ssPath = path.join(OUT_DIR, `post-${vp}-${yr}-after-${t}.png`);
        await page.screenshot({ path: ssPath, fullPage: false });

        results.push({
          type: 'single-tab',
          viewport: vp,
          year: yr,
          tab: t,
          initKas: initial.kas,
          afterKas: after.kas,
          diffKas: Number(diffKas.toFixed(4)),
          initSvg: initial.kasSvg,
          afterSvg: after.kasSvg,
          diffSvg: Number(diffSvg.toFixed(4)),
          initBills: initial.bills,
          afterBills: after.bills,
          initVB: initial.kasViewBox,
          afterVB: after.kasViewBox,
          screenshot: ssPath,
          status: pass ? 'LULUS' : 'GAGAL'
        });
      }

      // 5 consecutive cycles test
      for (let cycle = 1; cycle <= 5; cycle++) {
        for (const t of tabs) {
          await page.evaluate((tabName) => tab(tabName), t);
          await new Promise(r => setTimeout(r, 50));
        }
        await page.evaluate(() => tab('rincian'));
        await new Promise(r => setTimeout(r, 150));
      }

      const after5 = await getMeasurements();
      const diff5Kas = Math.abs(after5.kas - initial.kas);
      const diff5Svg = Math.abs(after5.kasSvg - initial.kasSvg);
      const pass5 = diff5Kas <= 0.5 && diff5Svg <= 0.5;
      if (!pass5) allPass = false;

      const ssPath5 = path.join(OUT_DIR, `post-${vp}-${yr}-after-5-cycles.png`);
      await page.screenshot({ path: ssPath5, fullPage: false });

      results.push({
        type: '5-cycles-consecutive',
        viewport: vp,
        year: yr,
        tab: 'all (5x)',
        initKas: initial.kas,
        afterKas: after5.kas,
        diffKas: Number(diff5Kas.toFixed(4)),
        initSvg: initial.kasSvg,
        afterSvg: after5.kasSvg,
        diffSvg: Number(diff5Svg.toFixed(4)),
        initBills: initial.bills,
        afterBills: after5.bills,
        initVB: initial.kasViewBox,
        afterVB: after5.kasViewBox,
        screenshot: ssPath5,
        status: pass5 ? 'LULUS' : 'GAGAL'
      });

      // Invariant tests: switchYear back and forth, privacy toggle, theme toggle, resize
      // 1. Year switch toggle
      await page.evaluate(() => {
        const alt = S.year === 2026 ? 2027 : 2026;
        switchYear(alt);
        switchYear(alt === 2026 ? 2027 : 2026);
      });
      await new Promise(r => setTimeout(r, 300));
      const afterYr = await getMeasurements();
      const passYr = Math.abs(afterYr.kas - initial.kas) <= 0.5;

      // 2. Privacy toggle
      await page.evaluate(() => {
        const btn = document.getElementById('btn-privacy');
        if (btn) { btn.click(); btn.click(); }
      });
      await new Promise(r => setTimeout(r, 100));
      const afterPv = await getMeasurements();
      const passPv = Math.abs(afterPv.kas - initial.kas) <= 0.5;

      // 3. Theme switch
      await page.evaluate(() => {
        setTheme('dark');
        setTheme('light');
      });
      await new Promise(r => setTimeout(r, 100));
      const afterThm = await getMeasurements();
      const passThm = Math.abs(afterThm.kas - initial.kas) <= 0.5;

      results.push({
        type: 'invariants',
        viewport: vp,
        year: yr,
        tab: 'yr/pv/thm',
        initKas: initial.kas,
        afterKas: afterThm.kas,
        diffKas: Number(Math.abs(afterThm.kas - initial.kas).toFixed(4)),
        initSvg: initial.kasSvg,
        afterSvg: afterThm.kasSvg,
        diffSvg: Number(Math.abs(afterThm.kasSvg - initial.kasSvg).toFixed(4)),
        status: (passYr && passPv && passThm) ? 'LULUS' : 'GAGAL'
      });

      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync('C:/Users/daffa/Documents/verif-fase-e/navigasi/post-fix-report.json', JSON.stringify(results, null, 2));
  console.log(`Task 1 Post-Fix Verification: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.table(results.filter(r => r.type !== 'invariants').map(r => ({
    vp: r.viewport,
    yr: r.year,
    tab: r.tab,
    initKas: r.initKas,
    afterKas: r.afterKas,
    diffKas: r.diffKas,
    initSvg: r.initSvg,
    afterSvg: r.afterSvg,
    diffSvg: r.diffSvg,
    status: r.status
  })));
}

runTask1Post().catch(console.error);
